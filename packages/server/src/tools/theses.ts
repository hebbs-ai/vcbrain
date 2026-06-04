// SPDX-License-Identifier: MIT
//
// Thesis tools (proposal View 3 — the differentiator). The fund configures
// its thesis once; the fit agent scores every lead against the ACTIVE one.
// Dispatched at /api/tools/vcbrain.theses.<verb>.

import { z } from "@boringos/module-sdk";
import type { Tool, ToolContext, ToolResult } from "@boringos/module-sdk";
import { and, eq, sql } from "drizzle-orm";
import { theses } from "../schema/theses.js";
import { startups } from "../schema/startups.js";
import { DEFAULT_THESIS_WEIGHTS } from "@boringos-vcbrain/shared";
import { emitVc, type VcDeps } from "./deps.js";

const constraintSchema = z.object({
  id: z.string(),
  label: z.string(),
  rule: z.string().optional(),
  enabled: z.boolean().default(true),
});

const configSchema = z.object({
  mustHaves: z.array(constraintSchema).default([]),
  dealBreakers: z.array(constraintSchema).default([]),
  weights: z
    .object({ team: z.number(), market: z.number(), product: z.number() })
    .default(DEFAULT_THESIS_WEIGHTS),
});

export function createThesisTools(deps: VcDeps): Tool[] {
  const list: Tool = {
    name: "theses.list",
    description: "List the tenant's theses. The active one (if any) has isActive=true.",
    inputs: z.object({}),
    async handler(_input: unknown, ctx: ToolContext): Promise<ToolResult> {
      const rows = await deps.db
        .select()
        .from(theses)
        .where(eq(theses.tenantId, ctx.tenantId))
        .orderBy(sql`is_active DESC, updated_at DESC`);
      return { ok: true, result: { data: rows, total: rows.length } };
    },
  };

  const create: Tool = {
    name: "theses.create",
    description:
      "Create a thesis (must-haves, deal-breakers, weighted dimensions). Pass activate:true to make it the active thesis immediately.",
    inputs: z.object({
      name: z.string().min(1),
      config: configSchema.optional(),
      ownerId: z.string().uuid().optional(),
      activate: z.boolean().optional(),
    }),
    async handler(
      input: { name: string; config?: z.infer<typeof configSchema>; ownerId?: string; activate?: boolean },
      ctx: ToolContext,
    ): Promise<ToolResult> {
      const config = input.config ?? { mustHaves: [], dealBreakers: [], weights: DEFAULT_THESIS_WEIGHTS };
      if (input.activate) {
        await deps.db
          .update(theses)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(theses.tenantId, ctx.tenantId), eq(theses.isActive, true)));
      }
      const [created] = await deps.db
        .insert(theses)
        .values({
          tenantId: ctx.tenantId,
          name: input.name,
          config,
          isActive: input.activate ?? false,
          ownerId: input.ownerId ?? null,
        })
        .returning();
      emitVc(deps, "thesis.changed", ctx.tenantId, { thesisId: created.id, action: "created" });
      return { ok: true, result: { data: created } };
    },
  };

  const update: Tool = {
    name: "theses.update",
    description: "Update a thesis's name or config. Use theses.activate to change which one is active.",
    inputs: z.object({
      id: z.string().uuid(),
      name: z.string().optional(),
      config: configSchema.optional(),
    }),
    async handler(
      input: { id: string; name?: string; config?: z.infer<typeof configSchema> },
      ctx: ToolContext,
    ): Promise<ToolResult> {
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) patch.name = input.name;
      if (input.config !== undefined) patch.config = input.config;
      const [updated] = await deps.db
        .update(theses)
        .set(patch)
        .where(and(eq(theses.id, input.id), eq(theses.tenantId, ctx.tenantId)))
        .returning();
      if (!updated) {
        return { ok: false, error: { code: "not_found", message: "Thesis not found", retryable: false } };
      }
      emitVc(deps, "thesis.changed", ctx.tenantId, { thesisId: updated.id, action: "updated" });
      return { ok: true, result: { data: updated } };
    },
  };

  const activate: Tool = {
    name: "theses.activate",
    description:
      "Make a thesis the active one for the tenant. Unsets the previously active thesis (at most one active at a time).",
    inputs: z.object({ id: z.string().uuid() }),
    async handler(input: { id: string }, ctx: ToolContext): Promise<ToolResult> {
      const [target] = await deps.db
        .select()
        .from(theses)
        .where(and(eq(theses.id, input.id), eq(theses.tenantId, ctx.tenantId)))
        .limit(1);
      if (!target) {
        return { ok: false, error: { code: "not_found", message: "Thesis not found", retryable: false } };
      }
      await deps.db
        .update(theses)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(theses.tenantId, ctx.tenantId), eq(theses.isActive, true)));
      const [updated] = await deps.db
        .update(theses)
        .set({ isActive: true, updatedAt: new Date() })
        .where(and(eq(theses.id, input.id), eq(theses.tenantId, ctx.tenantId)))
        .returning();
      emitVc(deps, "thesis.changed", ctx.tenantId, { thesisId: input.id, action: "activated" });
      return { ok: true, result: { data: updated } };
    },
  };

  // Back-testing (View 3): replay a thesis against recent submissions to
  // preview what it would flag. Phase 1 returns the population + the
  // existing fit-score distribution; the vc-thesis-fit agent (Phase 4)
  // can be invoked to re-score under the candidate thesis for a true replay.
  const backtest: Tool = {
    name: "theses.backtest",
    description:
      "Replay a thesis against the last N days of startup submissions (default 60). Returns the population, the current fit-score distribution, and how many leads already carry a score. A full re-score under the candidate thesis is done by waking vc-thesis-fit.",
    inputs: z.object({
      id: z.string().uuid().optional(),
      days: z.number().int().positive().max(365).optional(),
    }),
    async handler(input: { id?: string; days?: number }, ctx: ToolContext): Promise<ToolResult> {
      const days = input.days ?? 60;
      const rows = (await deps.db.execute(sql`
        SELECT id, name, domain, stage, fit_score, created_at
        FROM vc__startups
        WHERE tenant_id = ${ctx.tenantId}
          AND created_at >= now() - (${days} || ' days')::interval
        ORDER BY created_at DESC
      `)) as unknown as Array<{ id: string; name: string; fit_score: number | null }>;
      const scored = rows.filter((r) => r.fit_score != null);
      const buckets = { strong: 0, medium: 0, weak: 0 };
      for (const r of scored) {
        const s = r.fit_score as number;
        if (s >= 70) buckets.strong++;
        else if (s >= 40) buckets.medium++;
        else buckets.weak++;
      }
      return {
        ok: true,
        result: {
          windowDays: days,
          total: rows.length,
          scored: scored.length,
          unscored: rows.length - scored.length,
          distribution: buckets,
          population: rows,
        },
      };
    },
  };

  return [list, create, update, activate, backtest];
}

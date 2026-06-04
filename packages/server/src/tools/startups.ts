// SPDX-License-Identifier: GPL-3.0-or-later
//
// Startup tools — the central entity. Dispatched at
// /api/tools/vcbrain.startups.<verb>. `upsert` is the single intake
// funnel (proposal View 1): all four channels converge here so dedup,
// enrichment and pipeline placement happen exactly once.

import { z } from "@boringos/module-sdk";
import type { Tool, ToolContext, ToolResult } from "@boringos/module-sdk";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { startups } from "../schema/startups.js";
import { theses } from "../schema/theses.js";
import { SOURCE_CHANNELS } from "@boringos-vcbrain/shared";
import { emitVc, type VcDeps } from "./deps.js";
import { resolveCompanyDomain } from "../util/domain.js";
import { deepMerge } from "../util/merge.js";

const sourceChannelEnum = z.enum(SOURCE_CHANNELS);

export interface UpsertStartupInput {
  name: string;
  domain?: string;
  website?: string;
  oneLiner?: string;
  senderEmail?: string;
  sourceChannel?: (typeof SOURCE_CHANNELS)[number];
  sourceDetail?: string;
  ownerPartnerId?: string;
}

/**
 * The single intake funnel shared by `startups.upsert` and `inbox.ingest`.
 * Dedupes by resolved company domain: maps onto an existing row (filling
 * gaps only) or creates a new Sourced lead and emits entity.created.
 */
export async function upsertStartup(
  deps: VcDeps,
  tenantId: string,
  input: UpsertStartupInput,
): Promise<{ data: unknown; startupId: string; created: boolean }> {
  const domain = resolveCompanyDomain({
    website: input.website,
    domain: input.domain,
    senderEmail: input.senderEmail,
  });

  if (domain) {
    const existing = await deps.db
      .select()
      .from(startups)
      .where(
        and(
          eq(startups.tenantId, tenantId),
          sql`lower(${startups.domain}) = ${domain.toLowerCase()}`,
        ),
      )
      .limit(1);
    if (existing[0]) {
      const row = existing[0];
      const [updated] = await deps.db
        .update(startups)
        .set({
          oneLiner: row.oneLiner ?? input.oneLiner ?? null,
          sourceDetail: input.sourceDetail ?? row.sourceDetail ?? null,
          ownerPartnerId: row.ownerPartnerId ?? input.ownerPartnerId ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(startups.id, row.id), eq(startups.tenantId, tenantId)))
        .returning();
      emitVc(deps, "entity.updated", tenantId, {
        entityType: "vcbrain_startup",
        entityId: row.id,
        source: `upsert:${input.sourceChannel ?? "manual"}`,
      });
      return { data: updated, startupId: row.id, created: false };
    }
  }

  const [created] = await deps.db
    .insert(startups)
    .values({
      tenantId,
      name: input.name,
      domain: domain ?? null,
      oneLiner: input.oneLiner ?? null,
      sourceChannel: input.sourceChannel ?? "manual",
      sourceDetail: input.sourceDetail ?? null,
      ownerPartnerId: input.ownerPartnerId ?? null,
    })
    .returning();

  emitVc(deps, "entity.created", tenantId, {
    entityType: "vcbrain_startup",
    entityId: created.id,
    source: `upsert:${input.sourceChannel ?? "manual"}`,
  });
  return { data: created, startupId: created.id, created: true };
}

export function createStartupTools(deps: VcDeps): Tool[] {
  const upsert: Tool = {
    name: "startups.upsert",
    description:
      "Idempotent intake for a startup lead from any channel (email, form, copilot, scout). Dedupes by company domain: if a startup with the same domain already exists it is updated (mapped) and `created:false` is returned; otherwise a new lead is created in the Sourced stage and `created:true` is returned. Creating a new lead emits entity.created, which wakes vc-research to build the dossier.",
    inputs: z.object({
      name: z.string().min(1),
      domain: z.string().optional(),
      website: z.string().optional(),
      oneLiner: z.string().optional(),
      /** Sender/founder email — used only to derive a company domain when no website/domain is given. */
      senderEmail: z.string().optional(),
      sourceChannel: sourceChannelEnum.optional(),
      sourceDetail: z.string().optional(),
      ownerPartnerId: z.string().uuid().optional(),
    }),
    async handler(input: UpsertStartupInput, ctx: ToolContext): Promise<ToolResult> {
      const res = await upsertStartup(deps, ctx.tenantId, input);
      return { ok: true, result: res };
    },
  };

  const list: Tool = {
    name: "startups.list",
    description:
      "List startups for the tenant. Filter by stage, search name/domain/one-liner, and order by fit score or recency.",
    inputs: z.object({
      search: z.string().optional(),
      stage: z.string().optional(),
      orderBy: z.enum(["fit_score", "created_at", "updated_at"]).optional(),
      limit: z.number().int().positive().max(500).optional(),
      offset: z.number().int().nonnegative().optional(),
    }),
    async handler(
      input: { search?: string; stage?: string; orderBy?: string; limit?: number; offset?: number },
      ctx: ToolContext,
    ): Promise<ToolResult> {
      const conds = [eq(startups.tenantId, ctx.tenantId)];
      if (input.stage) conds.push(eq(startups.stage, input.stage));
      if (input.search) {
        conds.push(
          or(
            ilike(startups.name, `%${input.search}%`),
            ilike(startups.domain, `%${input.search}%`),
            ilike(startups.oneLiner, `%${input.search}%`),
          )!,
        );
      }
      const where = and(...conds);
      const order =
        input.orderBy === "fit_score"
          ? sql`fit_score DESC NULLS LAST`
          : input.orderBy === "created_at"
            ? sql`created_at DESC`
            : sql`updated_at DESC`;
      const [rows, totalRow] = await Promise.all([
        deps.db
          .select()
          .from(startups)
          .where(where)
          .orderBy(order)
          .limit(input.limit ?? 50)
          .offset(input.offset ?? 0),
        deps.db.select({ n: sql<number>`count(*)::int` }).from(startups).where(where),
      ]);
      return {
        ok: true,
        result: { data: rows, total: totalRow[0]?.n ?? rows.length, limit: input.limit ?? 50, offset: input.offset ?? 0 },
      };
    },
  };

  const get: Tool = {
    name: "startups.get",
    description: "Fetch one startup (with its living dossier) by id.",
    inputs: z.object({ id: z.string().uuid() }),
    async handler(input: { id: string }, ctx: ToolContext): Promise<ToolResult> {
      const row = await deps.db
        .select()
        .from(startups)
        .where(and(eq(startups.id, input.id), eq(startups.tenantId, ctx.tenantId)))
        .limit(1);
      if (!row.length) {
        return { ok: false, error: { code: "not_found", message: "Startup not found", retryable: false } };
      }
      return { ok: true, result: { data: row[0] } };
    },
  };

  const update: Tool = {
    name: "startups.update",
    description:
      "Update a startup. Pass only the fields to change. vc-research stamps `dossier`; vc-thesis-fit stamps `fitScore` + `thesisSnapshot`; stage changes drive the pipeline.",
    inputs: z.object({
      id: z.string().uuid(),
      name: z.string().optional(),
      domain: z.string().nullable().optional(),
      oneLiner: z.string().nullable().optional(),
      stage: z.string().optional(),
      fitScore: z.number().int().min(0).max(100).nullable().optional(),
      ownerPartnerId: z.string().uuid().nullable().optional(),
      dossier: z.record(z.unknown()).optional(),
      thesisSnapshot: z.record(z.unknown()).optional(),
    }),
    async handler(
      input: {
        id: string;
        name?: string;
        domain?: string | null;
        oneLiner?: string | null;
        stage?: string;
        fitScore?: number | null;
        ownerPartnerId?: string | null;
        dossier?: Record<string, unknown>;
        thesisSnapshot?: Record<string, unknown>;
      },
      ctx: ToolContext,
    ): Promise<ToolResult> {
      const { id, ...patch } = input;
      const [old] = await deps.db
        .select()
        .from(startups)
        .where(and(eq(startups.id, id), eq(startups.tenantId, ctx.tenantId)))
        .limit(1);
      if (!old) {
        return { ok: false, error: { code: "not_found", message: "Startup not found", retryable: false } };
      }

      const [updated] = await deps.db
        .update(startups)
        .set({ ...(patch as Record<string, unknown>), updatedAt: new Date() })
        .where(and(eq(startups.id, id), eq(startups.tenantId, ctx.tenantId)))
        .returning();

      const stageChanged = input.stage && input.stage !== old.stage;
      emitVc(deps, "entity.updated", ctx.tenantId, {
        entityType: "vcbrain_startup",
        entityId: id,
        ...(stageChanged ? { stage: input.stage, prevStage: old.stage } : {}),
      });
      if (stageChanged) {
        emitVc(deps, "startup.stage_changed", ctx.tenantId, {
          entityType: "vcbrain_startup",
          entityId: id,
          stage: input.stage,
          prevStage: old.stage,
        });
      }

      return { ok: true, result: { data: updated } };
    },
  };

  // Living dossier: vc-research deep-merges new findings into the existing
  // brief on each pass instead of replacing it. Bumps version + enrichedAt.
  const patchDossier: Tool = {
    name: "startups.patch_dossier",
    description:
      "Merge a partial dossier into a startup's living brief (deep merge: nested objects merge, arrays/scalars replace). Use this from vc-research after scanning a deck or refreshing enrichment — it preserves earlier findings and bumps the dossier version. Pass the full dossier only via startups.update.",
    inputs: z.object({
      id: z.string().uuid(),
      patch: z.record(z.unknown()),
    }),
    async handler(input: { id: string; patch: Record<string, unknown> }, ctx: ToolContext): Promise<ToolResult> {
      const [row] = await deps.db
        .select()
        .from(startups)
        .where(and(eq(startups.id, input.id), eq(startups.tenantId, ctx.tenantId)))
        .limit(1);
      if (!row) {
        return { ok: false, error: { code: "not_found", message: "Startup not found", retryable: false } };
      }
      const base = (row.dossier as Record<string, unknown> | null) ?? {};
      const prevVersion = typeof base.version === "number" ? base.version : 0;
      const merged = deepMerge(base, input.patch);
      merged.version = prevVersion + 1;
      merged.enrichedAt = new Date().toISOString();

      const [updated] = await deps.db
        .update(startups)
        .set({ dossier: merged as never, updatedAt: new Date() })
        .where(and(eq(startups.id, input.id), eq(startups.tenantId, ctx.tenantId)))
        .returning();
      emitVc(deps, "dossier.updated", ctx.tenantId, {
        entityType: "vcbrain_startup",
        entityId: input.id,
        version: merged.version,
      });
      return { ok: true, result: { data: updated, version: merged.version } };
    },
  };

  // Thesis-fit scoring (View 3). vc-thesis-fit calls this once it has judged
  // a dossier against the active thesis. Atomically: sets fitScore, snapshots
  // the active thesis (for reproducibility), and mirrors the verdict into
  // dossier.fit so the UI renders it on the card.
  const score: Tool = {
    name: "startups.score",
    description:
      "Record a thesis-fit verdict for a startup: a 0–100 score, 3 fits, 3 risks, optional per-dimension subscores, failed must-haves / matched deal-breakers, and a suggested lead partner. Snapshots the active thesis onto the startup so the score is reproducible, and writes the verdict into dossier.fit. Called by vc-thesis-fit.",
    inputs: z.object({
      id: z.string().uuid(),
      score: z.number().int().min(0).max(100),
      fits: z.array(z.string()).max(10),
      risks: z.array(z.string()).max(10),
      dimensionScores: z.object({ team: z.number().optional(), market: z.number().optional(), product: z.number().optional() }).optional(),
      failedMustHaves: z.array(z.string()).optional(),
      matchedDealBreakers: z.array(z.string()).optional(),
      suggestedLeadPartner: z.string().optional(),
      conviction: z.enum(["high", "medium", "low", "pass"]).optional(),
      comps: z.array(z.object({ company: z.string(), outcome: z.string().optional(), relevance: z.string().optional() })).optional(),
      returnScenarios: z.array(z.object({ scenario: z.string(), multiple: z.string().optional(), rationale: z.string().optional() })).optional(),
      ownershipTarget: z.string().optional(),
    }),
    async handler(
      input: {
        id: string;
        score: number;
        fits: string[];
        risks: string[];
        dimensionScores?: Record<string, number>;
        failedMustHaves?: string[];
        matchedDealBreakers?: string[];
        suggestedLeadPartner?: string;
        conviction?: "high" | "medium" | "low" | "pass";
        comps?: { company: string; outcome?: string; relevance?: string }[];
        returnScenarios?: { scenario: string; multiple?: string; rationale?: string }[];
        ownershipTarget?: string;
      },
      ctx: ToolContext,
    ): Promise<ToolResult> {
      const [row] = await deps.db
        .select()
        .from(startups)
        .where(and(eq(startups.id, input.id), eq(startups.tenantId, ctx.tenantId)))
        .limit(1);
      if (!row) {
        return { ok: false, error: { code: "not_found", message: "Startup not found", retryable: false } };
      }
      // Snapshot the active thesis config (if any).
      const [active] = await deps.db
        .select()
        .from(theses)
        .where(and(eq(theses.tenantId, ctx.tenantId), eq(theses.isActive, true)))
        .limit(1);

      const fit = {
        score: input.score,
        fits: input.fits,
        risks: input.risks,
        dimensionScores: input.dimensionScores,
        failedMustHaves: input.failedMustHaves ?? [],
        matchedDealBreakers: input.matchedDealBreakers ?? [],
        suggestedLeadPartner: input.suggestedLeadPartner,
        conviction: input.conviction,
        comps: input.comps,
        returnScenarios: input.returnScenarios,
        ownershipTarget: input.ownershipTarget,
        scoredAt: new Date().toISOString(),
      };
      const base = (row.dossier as Record<string, unknown> | null) ?? {};
      const dossier = deepMerge(base, { fit });

      const [updated] = await deps.db
        .update(startups)
        .set({
          fitScore: input.score,
          thesisSnapshot: (active?.config ?? null) as never,
          dossier: dossier as never,
          updatedAt: new Date(),
        })
        .where(and(eq(startups.id, input.id), eq(startups.tenantId, ctx.tenantId)))
        .returning();
      emitVc(deps, "startup.scored", ctx.tenantId, {
        entityType: "vcbrain_startup",
        entityId: input.id,
        score: input.score,
      });
      return { ok: true, result: { data: updated, score: input.score } };
    },
  };

  return [upsert, list, get, update, patchDossier, score];
}

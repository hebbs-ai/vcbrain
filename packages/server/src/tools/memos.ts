// SPDX-License-Identifier: MIT
//
// IC memo tools. vc-memo-writer drafts a cited memo when a startup
// reaches the IC stage; the partner edits and publishes.
// Dispatched at /api/tools/vcbrain.memos.<verb>.

import { z } from "@boringos/module-sdk";
import type { Tool, ToolContext, ToolResult } from "@boringos/module-sdk";
import { and, desc, eq } from "drizzle-orm";
import { memos } from "../schema/memos.js";
import { startups } from "../schema/startups.js";
import { emitVc, type VcDeps } from "./deps.js";

const citedSource = z.object({ label: z.string(), ref: z.string() });

export function createMemoTools(deps: VcDeps): Tool[] {
  const draft: Tool = {
    name: "memos.draft",
    description:
      "Create or replace the IC memo draft for a startup. If a non-published memo already exists for the startup it is updated in place; otherwise a new draft is created. Used by vc-memo-writer.",
    inputs: z.object({
      startupId: z.string().uuid(),
      draftMd: z.string(),
      citedSources: z.array(citedSource).optional(),
    }),
    async handler(
      input: { startupId: string; draftMd: string; citedSources?: { label: string; ref: string }[] },
      ctx: ToolContext,
    ): Promise<ToolResult> {
      const [startup] = await deps.db
        .select()
        .from(startups)
        .where(and(eq(startups.id, input.startupId), eq(startups.tenantId, ctx.tenantId)))
        .limit(1);
      if (!startup) {
        return { ok: false, error: { code: "not_found", message: "Startup not found", retryable: false } };
      }
      const [existing] = await deps.db
        .select()
        .from(memos)
        .where(
          and(
            eq(memos.tenantId, ctx.tenantId),
            eq(memos.startupId, input.startupId),
            eq(memos.status, "draft"),
          ),
        )
        .orderBy(desc(memos.updatedAt))
        .limit(1);

      const citedSources = input.citedSources ?? [];
      if (existing) {
        const [updated] = await deps.db
          .update(memos)
          .set({ draftMd: input.draftMd, citedSources, updatedAt: new Date() })
          .where(and(eq(memos.id, existing.id), eq(memos.tenantId, ctx.tenantId)))
          .returning();
        return { ok: true, result: { data: updated, created: false } };
      }
      const [created] = await deps.db
        .insert(memos)
        .values({ tenantId: ctx.tenantId, startupId: input.startupId, draftMd: input.draftMd, citedSources, status: "draft" })
        .returning();
      emitVc(deps, "memo.drafted", ctx.tenantId, { memoId: created.id, startupId: input.startupId });
      return { ok: true, result: { data: created, created: true } };
    },
  };

  const publish: Tool = {
    name: "memos.publish",
    description: "Mark a memo as published (IC-ready). Optionally record the editing user.",
    inputs: z.object({ id: z.string().uuid(), editedBy: z.string().uuid().optional() }),
    async handler(input: { id: string; editedBy?: string }, ctx: ToolContext): Promise<ToolResult> {
      const [updated] = await deps.db
        .update(memos)
        .set({ status: "published", editedBy: input.editedBy ?? null, updatedAt: new Date() })
        .where(and(eq(memos.id, input.id), eq(memos.tenantId, ctx.tenantId)))
        .returning();
      if (!updated) {
        return { ok: false, error: { code: "not_found", message: "Memo not found", retryable: false } };
      }
      emitVc(deps, "memo.published", ctx.tenantId, { memoId: updated.id, startupId: updated.startupId });
      return { ok: true, result: { data: updated } };
    },
  };

  const list: Tool = {
    name: "memos.list",
    description: "List memos, optionally filtered by startup.",
    inputs: z.object({ startupId: z.string().uuid().optional() }),
    async handler(input: { startupId?: string }, ctx: ToolContext): Promise<ToolResult> {
      const conds = [eq(memos.tenantId, ctx.tenantId)];
      if (input.startupId) conds.push(eq(memos.startupId, input.startupId));
      const rows = await deps.db.select().from(memos).where(and(...conds)).orderBy(desc(memos.updatedAt));
      return { ok: true, result: { data: rows, total: rows.length } };
    },
  };

  const get: Tool = {
    name: "memos.get",
    description: "Fetch one memo by id.",
    inputs: z.object({ id: z.string().uuid() }),
    async handler(input: { id: string }, ctx: ToolContext): Promise<ToolResult> {
      const [row] = await deps.db
        .select()
        .from(memos)
        .where(and(eq(memos.id, input.id), eq(memos.tenantId, ctx.tenantId)))
        .limit(1);
      if (!row) {
        return { ok: false, error: { code: "not_found", message: "Memo not found", retryable: false } };
      }
      return { ok: true, result: { data: row } };
    },
  };

  return [draft, publish, list, get];
}

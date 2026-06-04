// SPDX-License-Identifier: MIT
//
// Portfolio monitoring tools. vc-portfolio-monitor records signals
// (news, hiring, runway, KPI moves) on invested companies; the UI surfaces
// alerts. Dispatched at /api/tools/vcbrain.portfolio.<verb>.

import { z } from "@boringos/module-sdk";
import type { Tool, ToolContext, ToolResult } from "@boringos/module-sdk";
import { and, desc, eq } from "drizzle-orm";
import { portfolioSignals } from "../schema/portfolio.js";
import { startups } from "../schema/startups.js";
import { PORTFOLIO_SIGNAL_SEVERITIES } from "@boringos-vcbrain/shared";
import { emitVc, type VcDeps } from "./deps.js";

export function createPortfolioTools(deps: VcDeps): Tool[] {
  const record: Tool = {
    name: "portfolio.record_signal",
    description:
      "Record a portfolio signal on an invested startup (e.g. news, hiring, runway, KPI change). severity drives whether the partner sees an alert.",
    inputs: z.object({
      startupId: z.string().uuid(),
      signalType: z.string().min(1),
      payload: z.record(z.unknown()).optional(),
      severity: z.enum(PORTFOLIO_SIGNAL_SEVERITIES).optional(),
    }),
    async handler(
      input: {
        startupId: string;
        signalType: string;
        payload?: Record<string, unknown>;
        severity?: (typeof PORTFOLIO_SIGNAL_SEVERITIES)[number];
      },
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
      const [created] = await deps.db
        .insert(portfolioSignals)
        .values({
          tenantId: ctx.tenantId,
          startupId: input.startupId,
          signalType: input.signalType,
          payload: input.payload ?? {},
          severity: input.severity ?? "info",
        })
        .returning();
      emitVc(deps, "portfolio.signal", ctx.tenantId, {
        startupId: input.startupId,
        signalType: input.signalType,
        severity: created.severity,
      });
      return { ok: true, result: { data: created } };
    },
  };

  const listSignals: Tool = {
    name: "portfolio.list_signals",
    description: "List portfolio signals, optionally filtered by startup and minimum severity.",
    inputs: z.object({
      startupId: z.string().uuid().optional(),
      limit: z.number().int().positive().max(500).optional(),
    }),
    async handler(input: { startupId?: string; limit?: number }, ctx: ToolContext): Promise<ToolResult> {
      const conds = [eq(portfolioSignals.tenantId, ctx.tenantId)];
      if (input.startupId) conds.push(eq(portfolioSignals.startupId, input.startupId));
      const rows = await deps.db
        .select()
        .from(portfolioSignals)
        .where(and(...conds))
        .orderBy(desc(portfolioSignals.createdAt))
        .limit(input.limit ?? 100);
      return { ok: true, result: { data: rows, total: rows.length } };
    },
  };

  return [record, listSignals];
}

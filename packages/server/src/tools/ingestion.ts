// SPDX-License-Identifier: MIT
//
// Ingestion overview — the "fund knowledge" view (proposal: the 0→1 step
// before any agent runs). Read-only aggregate over the module's own tables:
// the active thesis (the fund's brain), the intake-channel counts, the
// ingested decks/documents, and the most recent ingested items.
// Dispatched at /api/tools/vcbrain.ingestion.status.

import { z } from "@boringos/module-sdk";
import type { Tool, ToolContext, ToolResult } from "@boringos/module-sdk";
import { sql } from "drizzle-orm";
import type { VcDeps } from "./deps.js";

export function createIngestionTools(deps: VcDeps): Tool[] {
  const status: Tool = {
    name: "ingestion.status",
    description:
      "Fund-knowledge ingestion overview: the active thesis, intake-channel counts, ingested decks/documents, and the most recently ingested items. Read-only; powers the Ingestion screen.",
    inputs: z.object({}),
    async handler(_input: unknown, ctx: ToolContext): Promise<ToolResult> {
      const t = ctx.tenantId;

      const channels = (await deps.db.execute(sql`
        SELECT source_channel AS channel, count(*)::int AS n, max(created_at) AS last_at
        FROM vc__startups WHERE tenant_id = ${t}
        GROUP BY source_channel`)) as unknown as Array<{ channel: string; n: number; last_at: string | null }>;

      const fileRows = (await deps.db.execute(sql`
        SELECT count(*)::int AS files,
               count(*) FILTER (WHERE parsed_at IS NOT NULL)::int AS parsed,
               max(created_at) AS last_at
        FROM vc__startup_files WHERE tenant_id = ${t}`)) as unknown as Array<{
        files: number;
        parsed: number;
        last_at: string | null;
      }>;
      const files = fileRows[0] ?? { files: 0, parsed: 0, last_at: null };

      const thesisRows = (await deps.db.execute(sql`
        SELECT name, config FROM vc__theses WHERE tenant_id = ${t} AND is_active = true LIMIT 1`)) as unknown as Array<{
        name: string;
        config: unknown;
      }>;
      const thesis = thesisRows[0] ?? null;

      const recent = (await deps.db.execute(sql`
        SELECT name, source_channel AS channel, created_at AS at
        FROM vc__startups WHERE tenant_id = ${t}
        ORDER BY created_at DESC LIMIT 8`)) as unknown as Array<{ name: string; channel: string; at: string }>;

      return {
        ok: true,
        result: {
          thesis: thesis ? { name: thesis.name, config: thesis.config } : null,
          channels: channels.map((r) => ({ channel: r.channel, count: r.n, lastAt: r.last_at })),
          documents: { files: files.files, parsed: files.parsed, lastAt: files.last_at },
          recent: recent.map((r) => ({ name: r.name, channel: r.channel, at: r.at })),
        },
      };
    },
  };

  return [status];
}

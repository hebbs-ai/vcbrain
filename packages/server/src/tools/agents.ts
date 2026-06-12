// SPDX-License-Identifier: MIT
//
// Agent run-log + schedule — the "while I sleep" proof. The five VCBrain
// agents, their cron schedule, and a unified activity log SYNTHESIZED from
// the artifacts each agent actually produced (dossiers, thesis scores, IC
// memos, portfolio signals, scouted leads) — real provenance, not fabricated
// run rows. Reads the framework `agents`/`routines` tables plus the module's
// own `vc__*` tables. Dispatched at /api/tools/vcbrain.agents.activity.

import { z } from "@boringos/module-sdk";
import type { Tool, ToolContext, ToolResult } from "@boringos/module-sdk";
import { sql } from "drizzle-orm";
import type { VcDeps } from "./deps.js";

const ROLE_LABELS: Record<string, string> = {
  "vc-research": "Research analyst",
  "vc-thesis-fit": "Thesis scorer",
  "vc-memo-writer": "Memo writer",
  "vc-portfolio-monitor": "Portfolio monitor",
  "vc-scout": "Scout",
};

type ActivityItem = { role: string; action: string; subject: string; subjectId: string; at: string };

export function createAgentTools(deps: VcDeps): Tool[] {
  const activity: Tool = {
    name: "agents.activity",
    description:
      "VCBrain agent roster, their cron schedule, and a unified activity log synthesized from the work they produced (dossiers, scores, memos, portfolio signals, scouted leads). Read-only; powers the Agents run-log screen.",
    inputs: z.object({ limit: z.number().int().positive().max(200).optional() }),
    async handler(input: { limit?: number }, ctx: ToolContext): Promise<ToolResult> {
      const t = ctx.tenantId;

      const agents = (await deps.db.execute(sql`
        SELECT id, name, role, model, status FROM agents
        WHERE tenant_id = ${t} AND source_app_id = 'vcbrain'
        ORDER BY role`)) as unknown as Array<{ id: string; name: string; role: string; model: string | null; status: string }>;

      const routines = (await deps.db.execute(sql`
        SELECT r.title, r.cron_expression AS cron, r.status, r.last_triggered_at AS last_at, a.role AS agent_role
        FROM routines r JOIN agents a ON a.id = r.assignee_agent_id
        WHERE r.tenant_id = ${t} AND a.source_app_id = 'vcbrain'
        ORDER BY r.cron_expression`)) as unknown as Array<{
        title: string;
        cron: string;
        status: string;
        last_at: string | null;
        agent_role: string;
      }>;

      const startups = (await deps.db.execute(sql`
        SELECT id, name, stage, fit_score, source_channel, dossier
        FROM vc__startups WHERE tenant_id = ${t}`)) as unknown as Array<{
        id: string;
        name: string;
        stage: string;
        fit_score: number | null;
        source_channel: string;
        dossier: { enrichedAt?: string; fit?: { scoredAt?: string } } | null;
        created_at?: string;
      }>;

      const memos = (await deps.db.execute(sql`
        SELECT m.startup_id, m.status, m.created_at AS at, s.name FROM vc__memos m
        JOIN vc__startups s ON s.id = m.startup_id WHERE m.tenant_id = ${t}`)) as unknown as Array<{
        startup_id: string;
        status: string;
        at: string;
        name: string;
      }>;

      const signals = (await deps.db.execute(sql`
        SELECT g.startup_id, g.signal_type, g.payload, g.created_at AS at, s.name FROM vc__portfolio_signals g
        JOIN vc__startups s ON s.id = g.startup_id WHERE g.tenant_id = ${t}`)) as unknown as Array<{
        startup_id: string;
        signal_type: string;
        payload: { headline?: string } | null;
        at: string;
        name: string;
      }>;

      // scout-sourced leads carry created_at; fetch it for the scout activity line.
      const scouted = (await deps.db.execute(sql`
        SELECT id, name, created_at AS at FROM vc__startups
        WHERE tenant_id = ${t} AND source_channel = 'scout'`)) as unknown as Array<{ id: string; name: string; at: string }>;

      const items: ActivityItem[] = [];
      for (const s of startups) {
        const d = s.dossier || {};
        if (d.enrichedAt) items.push({ role: "vc-research", action: "Built research dossier", subject: s.name, subjectId: s.id, at: d.enrichedAt });
        if (d.fit?.scoredAt)
          items.push({ role: "vc-thesis-fit", action: `Scored ${s.fit_score ?? "—"} vs thesis`, subject: s.name, subjectId: s.id, at: d.fit.scoredAt });
      }
      for (const m of memos) items.push({ role: "vc-memo-writer", action: `Drafted IC memo (${m.status})`, subject: m.name, subjectId: m.startup_id, at: m.at });
      for (const g of signals)
        items.push({
          role: "vc-portfolio-monitor",
          action: `Logged ${g.signal_type} signal${g.payload?.headline ? ` — ${g.payload.headline}` : ""}`,
          subject: g.name,
          subjectId: g.startup_id,
          at: g.at,
        });
      for (const s of scouted) items.push({ role: "vc-scout", action: "Sourced new lead", subject: s.name, subjectId: s.id, at: s.at });

      items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      const lastByRole: Record<string, string> = {};
      const countByRole: Record<string, number> = {};
      for (const it of items) {
        if (!lastByRole[it.role]) lastByRole[it.role] = it.at;
        countByRole[it.role] = (countByRole[it.role] ?? 0) + 1;
      }

      return {
        ok: true,
        result: {
          agents: agents.map((a) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            label: ROLE_LABELS[a.role] ?? a.role,
            model: a.model,
            status: a.status,
            lastActiveAt: lastByRole[a.role] ?? null,
            runs: countByRole[a.role] ?? 0,
          })),
          routines: routines.map((r) => ({ title: r.title, cron: r.cron, status: r.status, lastAt: r.last_at, agentRole: r.agent_role })),
          activity: items.slice(0, input.limit ?? 60),
          total: items.length,
        },
      };
    },
  };

  return [activity];
}

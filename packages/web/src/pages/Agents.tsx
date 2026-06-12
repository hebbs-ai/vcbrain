// SPDX-License-Identifier: MIT
//
// Agents — the run-log + schedule ("the punchline is the boring part: none of
// this waited for me"). The five agents, their cron schedule, and a unified
// activity feed synthesized from what they actually produced overnight.
// Read-only over vcbrain.agents.activity.

import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useAgentActivity } from "../lib/hooks.js";
import type { AgentRow, RoutineRow } from "../lib/hooks.js";
import { Card, Badge, H, Empty, c, pageStyle } from "../lib/ui.js";

const ROLE_DOT: Record<string, string> = {
  "vc-research": "#3b82f6",
  "vc-thesis-fit": "#8b5cf6",
  "vc-memo-writer": "#16a34a",
  "vc-portfolio-monitor": "#d97706",
  "vc-scout": "#0ea5e9",
};

function rel(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Humanize the cron expressions the module seeds (daily at HH:MM). */
function cronHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length >= 5) {
    const [min, hour, dom, mon, dow] = parts;
    if (dom === "*" && mon === "*" && dow === "*" && /^\d+$/.test(min) && /^\d+$/.test(hour)) {
      const h = Number(hour);
      const ampm = h < 12 ? "AM" : "PM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `Daily at ${h12}:${min.padStart(2, "0")} ${ampm} UTC`;
    }
  }
  return cron;
}

export function AgentsPage() {
  const { data, isLoading } = useAgentActivity();

  if (isLoading) return <Empty>Loading…</Empty>;
  const agents = data?.agents ?? [];
  const routines = data?.routines ?? [];
  const activity = data?.activity ?? [];
  const lastRun = activity[0]?.at;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <H>Agents</H>
          <span style={{ fontSize: 12, color: c.muted }}>Last activity {rel(lastRun)}</span>
        </div>
        <div style={{ fontSize: 13, color: c.muted, marginTop: -6, marginBottom: 16 }}>
          Catch, research, score, memo, monitor — five agents, running on a schedule and on every new deal. None of it
          waits for you.
        </div>

        {/* Schedule */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Schedule</div>
        <Card style={{ marginBottom: 8 }}>
          {routines.length === 0 ? (
            <Empty>No cron routines.</Empty>
          ) : (
            routines.map((r: RoutineRow, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < routines.length - 1 ? `1px solid ${c.border}` : "none" }}>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Dot color={ROLE_DOT[r.agentRole] ?? c.muted} />
                  <span style={{ fontSize: 13 }}>{r.title}</span>
                </span>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: c.text }}>{cronHuman(r.cron)}</span>
                  <Badge>{r.status}</Badge>
                </span>
              </div>
            ))
          )}
        </Card>
        <div style={{ fontSize: 11, color: c.muted, marginBottom: 16 }}>
          Research, thesis-fit and memo-writer are event-driven — they wake on a new deal or a stage change, not a clock.
        </div>

        {/* Roster */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>The team</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10, marginBottom: 16 }}>
          {agents.map((a: AgentRow) => (
            <div key={a.id} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Dot color={ROLE_DOT[a.role] ?? c.muted} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</span>
                </span>
                <span style={{ fontSize: 10, color: c.muted }}>{a.status}</span>
              </div>
              <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{a.label}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
                <span style={{ fontSize: 11, color: c.muted }}>{a.runs} run{a.runs === 1 ? "" : "s"}</span>
                <span style={{ fontSize: 11, color: c.muted }}>active {rel(a.lastActiveAt)}</span>
              </div>
              {a.model && <div style={{ marginTop: 8 }}><Badge>{a.model}</Badge></div>}
            </div>
          ))}
        </div>

        {/* Run log */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Activity log</div>
        <Card>
          {activity.length === 0 ? (
            <Empty>No agent activity yet.</Empty>
          ) : (
            activity.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: i < activity.length - 1 ? `1px solid ${c.border}` : "none" }}>
                <Dot color={ROLE_DOT[it.role] ?? c.muted} />
                <span style={{ fontSize: 12, color: c.muted, width: 64, flex: "0 0 64px" }}>{timeOf(it.at)}</span>
                <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
                  {it.action}{" — "}
                  <Link to={`/vcbrain/startups/${it.subjectId}`} style={{ color: c.text, fontWeight: 600, textDecoration: "none" }}>
                    {it.subject}
                  </Link>
                </span>
                <span style={{ fontSize: 11, color: c.muted, flex: "0 0 auto" }}>{rel(it.at)}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }): ReactNode {
  return <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flex: "0 0 8px", display: "inline-block" }} />;
}

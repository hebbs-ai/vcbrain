// SPDX-License-Identifier: MIT
//
// Home dashboard widgets. The shell renders the widget element raw (no title
// chrome), so each widget draws its own card header + description + empty state.

import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useStartups } from "../lib/hooks.js";
import { ScorePill, c } from "../lib/ui.js";

function WidgetShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: 14, height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{title}</div>
        <div style={{ fontSize: 10, color: c.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>VCBrain</div>
      </div>
      <div style={{ fontSize: 11, color: c.muted, marginTop: 2, marginBottom: 10 }}>{subtitle}</div>
      {children}
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, color: c.muted, padding: "8px 0" }}>{children}</div>;
}

export function ScoredPipelineWidget() {
  const { data, isLoading } = useStartups({ orderBy: "fit_score", limit: 6 });
  const items = (data?.data ?? []).filter((s) => s.fitScore != null);
  return (
    <WidgetShell title="Scored pipeline" subtitle="Top startups by thesis-fit score">
      {isLoading ? (
        <EmptyNote>Loading…</EmptyNote>
      ) : items.length === 0 ? (
        <EmptyNote>No scored startups yet — they appear once vc-thesis-fit scores a dossier.</EmptyNote>
      ) : (
        items.map((s, i) => (
          <Row key={s.id} id={s.id}>
            <span style={{ display: "flex", gap: 8, minWidth: 0 }}>
              <span style={{ color: c.muted, width: 16 }}>{i + 1}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
              <span style={{ color: c.muted, fontSize: 11 }}>{s.stage}</span>
            </span>
            <ScorePill score={s.fitScore} />
          </Row>
        ))
      )}
    </WidgetShell>
  );
}

export function FreshBriefsWidget() {
  const { data, isLoading } = useStartups({ orderBy: "updated_at", limit: 6 });
  const items = data?.data ?? [];
  return (
    <WidgetShell title="Fresh briefs" subtitle="Recently updated dossiers">
      {isLoading ? (
        <EmptyNote>Loading…</EmptyNote>
      ) : items.length === 0 ? (
        <EmptyNote>No startups yet — they land here from email, the form, copilot, or the scout.</EmptyNote>
      ) : (
        items.map((s) => (
          <Row key={s.id} id={s.id}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
            <span style={{ color: c.muted, fontSize: 11 }}>{s.stage}</span>
          </Row>
        ))
      )}
    </WidgetShell>
  );
}

function Row({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Link
      to={`/vcbrain/startups/${id}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        fontSize: 13,
        color: c.text,
        textDecoration: "none",
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      {children}
    </Link>
  );
}

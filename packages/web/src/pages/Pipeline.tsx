// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pipeline — kanban by stage with the fit score on every card (proposal View 2).

import { Link } from "react-router-dom";
import { DEFAULT_VC_STAGES } from "@boringos-vcbrain/shared";
import type { Startup } from "@boringos-vcbrain/shared";
import { useStartups, useUpdateStartup } from "../lib/hooks.js";
import { Card, ScorePill, Badge, H, Empty, c, pageStyle } from "../lib/ui.js";

const STAGES = DEFAULT_VC_STAGES.map((s) => s.name);

export function PipelinePage() {
  const { data, isLoading } = useStartups({ limit: 500, orderBy: "fit_score" });
  const update = useUpdateStartup();
  const startups = data?.data ?? [];

  const byStage = (stage: string) => startups.filter((s) => s.stage === stage);

  return (
    <div style={pageStyle}>
      <H>Pipeline</H>
      {isLoading ? (
        <Empty>Loading…</Empty>
      ) : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
          {STAGES.map((stage) => {
            const items = byStage(stage);
            return (
              <div key={stage} style={{ minWidth: 250, flex: "0 0 250px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{stage}</span>
                  <Badge>{items.length}</Badge>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((s) => (
                    <StartupCard key={s.id} s={s} onMove={(stage) => update.mutate({ id: s.id, stage })} />
                  ))}
                  {items.length === 0 && <div style={{ color: c.muted, fontSize: 12, padding: 8 }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StartupCard({ s, onMove }: { s: Startup; onMove: (stage: string) => void }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Link to={`/vcbrain/startups/${s.id}`} style={{ color: c.text, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
          {s.name}
        </Link>
        <ScorePill score={s.fitScore} />
      </div>
      {s.domain && <div style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{s.domain}</div>}
      {s.oneLiner && (
        <div style={{ color: c.muted, fontSize: 12, marginTop: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {s.oneLiner}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
        <Badge>{s.sourceChannel}</Badge>
        <select
          value={s.stage}
          onChange={(e) => onMove(e.target.value)}
          style={{ fontSize: 11, background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 6, padding: "2px 4px" }}
        >
          {STAGES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}

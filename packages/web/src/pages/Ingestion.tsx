// SPDX-License-Identifier: MIT
//
// Ingestion / Fund Knowledge — "the step everyone skips" (proposal: the 0→1).
// Before any agent runs, the fund's knowledge is loaded: the thesis (every
// agent reads it first), the inbound deal channels, and ingested decks/docs.
// Read-only aggregate over vcbrain.ingestion.status.

import { Link } from "react-router-dom";
import { THESIS_DIMENSIONS } from "@boringos-vcbrain/shared";
import { useIngestionStatus } from "../lib/hooks.js";
import { Card, Badge, H, Empty, c, pageStyle } from "../lib/ui.js";

const CHANNEL_TILES: { key: string; label: string; sub: string }[] = [
  { key: "email", label: "Founder inbox", sub: "Inbound pitch emails" },
  { key: "form", label: "Public form", sub: "Self-serve submissions" },
  { key: "scout", label: "Scout feed", sub: "YC / PH / GitHub trending" },
  { key: "copilot", label: "Copilot", sub: "“track this company”" },
  { key: "manual", label: "Added manually", sub: "Partner-entered" },
];

function rel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function IngestionPage() {
  const { data, isLoading } = useIngestionStatus();

  if (isLoading) return <Empty>Loading…</Empty>;
  const channels = data?.channels ?? [];
  const byChannel = (k: string) => channels.find((x) => x.channel === k);
  const cfg = data?.thesis?.config;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 880 }}>
        <H>Fund knowledge</H>
        <div style={{ fontSize: 13, color: c.muted, marginTop: -6, marginBottom: 16 }}>
          The first thing we load — before a single agent runs. Every agent reads the thesis first; an agent with no
          memory of your fund is just a chatbot with extra steps.
        </div>

        {/* Thesis hero — the fund's brain */}
        <Card style={{ marginBottom: 16, borderColor: c.accent }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              Investment thesis{data?.thesis?.name ? ` — ${data.thesis.name}` : ""}
            </div>
            <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>● Loaded</span>
          </div>
          <div style={{ fontSize: 12, color: c.muted, marginTop: 2, marginBottom: 12 }}>
            The fund's north star, configured once. Read by every agent before it scores a deal.
          </div>
          {cfg && (
            <>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
                {THESIS_DIMENSIONS.map((dim) => (
                  <div key={dim} style={{ flex: "1 1 180px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ textTransform: "capitalize" }}>{dim}</span>
                      <span style={{ color: c.muted }}>{cfg.weights?.[dim] ?? 0}</span>
                    </div>
                    <div style={{ height: 6, background: c.border, borderRadius: 999, marginTop: 4 }}>
                      <div style={{ width: `${cfg.weights?.[dim] ?? 0}%`, height: 6, background: c.accent, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(cfg.mustHaves ?? []).filter((m) => m.enabled).map((m) => (
                  <span key={m.id} style={chip("#16a34a")}>✓ {m.label}</span>
                ))}
                {(cfg.dealBreakers ?? []).filter((m) => m.enabled).map((m) => (
                  <span key={m.id} style={chip("#dc2626")}>✕ {m.label}</span>
                ))}
              </div>
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <Link to="/vcbrain/thesis" style={{ color: c.accent, fontSize: 12, textDecoration: "none" }}>
              Open Thesis Studio →
            </Link>
          </div>
        </Card>

        {/* Knowledge sources */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Knowledge sources</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
          <SourceTile label="Decks & documents" sub="Pitch decks ingested to drive" value={`${data?.documents.files ?? 0}`} unit="files" status={(data?.documents.files ?? 0) > 0 ? "Connected" : "Idle"} last={data?.documents.lastAt} />
          {CHANNEL_TILES.map((tl) => {
            const ch = byChannel(tl.key);
            return (
              <SourceTile
                key={tl.key}
                label={tl.label}
                sub={tl.sub}
                value={`${ch?.count ?? 0}`}
                unit="deals"
                status={ch && ch.count > 0 ? "Connected" : "Idle"}
                last={ch?.lastAt}
              />
            );
          })}
          <SourceTile label="Slack history" sub="Workspace context (connector)" value="" unit="" status="Available" last={null} muted />
        </div>

        {/* Recently ingested */}
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Recently ingested</div>
        <Card>
          {(data?.recent ?? []).length === 0 ? (
            <Empty>Nothing ingested yet — deals land here from email, the form, copilot or the scout.</Empty>
          ) : (
            (data?.recent ?? []).map((r, i) => (
              <div
                key={i}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < (data?.recent.length ?? 0) - 1 ? `1px solid ${c.border}` : "none", fontSize: 13 }}
              >
                <span>{r.name}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge>{r.channel}</Badge>
                  <span style={{ color: c.muted, fontSize: 11 }}>{rel(r.at)}</span>
                </span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function SourceTile({
  label,
  sub,
  value,
  unit,
  status,
  last,
  muted,
}: {
  label: string;
  sub: string;
  value: string;
  unit: string;
  status: string;
  last: string | null | undefined;
  muted?: boolean;
}) {
  const statusColor = status === "Connected" ? "#16a34a" : status === "Available" ? c.muted : c.muted;
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12, opacity: muted ? 0.7 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 10, color: statusColor }}>● {status}</span>
      </div>
      <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</div>
      {value !== "" && (
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 600 }}>{value}</span>
          <span style={{ fontSize: 11, color: c.muted, marginLeft: 4 }}>{unit}</span>
          {last && <span style={{ fontSize: 10, color: c.muted, float: "right", marginTop: 8 }}>{rel(last)}</span>}
        </div>
      )}
    </div>
  );
}

function chip(color: string): React.CSSProperties {
  return { fontSize: 11, color, border: `1px solid ${color}`, borderRadius: 6, padding: "1px 7px", opacity: 0.9 };
}

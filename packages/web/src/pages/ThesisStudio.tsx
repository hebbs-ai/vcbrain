// SPDX-License-Identifier: MIT
//
// Thesis Studio (proposal View 3) — define the fund's north star: hard
// must-haves / deal-breakers, weighted dimensions, and a back-test preview.

import { useEffect, useState } from "react";
import { THESIS_DIMENSIONS, DEFAULT_THESIS_WEIGHTS } from "@boringos-vcbrain/shared";
import type { Thesis, ThesisConfig, ThesisConstraint, ThesisDimension } from "@boringos-vcbrain/shared";
import { useTheses, useUpdateThesis, useActivateThesis, useBacktest } from "../lib/hooks.js";
import { Card, Badge, H, Empty, c, pageStyle } from "../lib/ui.js";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `c-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function ThesisStudioPage() {
  const { data, isLoading } = useTheses();
  const update = useUpdateThesis();
  const activate = useActivateThesis();
  const backtest = useBacktest();

  const theses = data?.data ?? [];
  const active = theses.find((t) => t.isActive) ?? theses[0];

  const [cfg, setCfg] = useState<ThesisConfig | null>(null);
  const [name, setName] = useState("");
  useEffect(() => {
    if (active) {
      setCfg(structuredCloneSafe(active.config));
      setName(active.name);
    }
  }, [active?.id]);

  if (isLoading) return <Empty>Loading…</Empty>;
  if (!active || !cfg) return <Empty>No thesis yet.</Empty>;

  const setWeight = (dim: ThesisDimension, v: number) =>
    setCfg({ ...cfg, weights: { ...cfg.weights, [dim]: v } });
  const weightSum = THESIS_DIMENSIONS.reduce((n, d) => n + (cfg.weights[d] ?? 0), 0);

  const save = () => update.mutate({ id: active.id, name, config: cfg });

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <H>Thesis Studio</H>
        <div style={{ display: "flex", gap: 8 }}>
          {theses.length > 1 && (
            <select
              value={active.id}
              onChange={(e) => activate.mutate({ id: e.target.value })}
              style={selectStyle}
            >
              {theses.map((t: Thesis) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isActive ? "(active)" : ""}
                </option>
              ))}
            </select>
          )}
          <button onClick={save} disabled={update.isPending} style={primaryBtn}>
            {update.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, fontSize: 16, fontWeight: 600 }} />
        <div style={{ marginTop: 4 }}>
          <Badge>{active.isActive ? "active" : "inactive"}</Badge>
        </div>
      </Card>

      {/* Weights */}
      <Card style={{ marginBottom: 14 }}>
        <H>Importance weights</H>
        {THESIS_DIMENSIONS.map((dim) => (
          <div key={dim} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ width: 70, textTransform: "capitalize", fontSize: 13 }}>{dim}</span>
            <input type="range" min={0} max={100} value={cfg.weights[dim] ?? 0} onChange={(e) => setWeight(dim, Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ width: 36, textAlign: "right", fontSize: 13 }}>{cfg.weights[dim] ?? 0}</span>
          </div>
        ))}
        <div style={{ fontSize: 12, color: weightSum === 100 ? c.muted : "#d97706" }}>
          Sum: {weightSum}{weightSum !== 100 ? " (aim for 100)" : ""}
          {"  ·  "}
          <button onClick={() => setCfg({ ...cfg, weights: { ...DEFAULT_THESIS_WEIGHTS } })} style={linkBtn}>
            reset
          </button>
        </div>
      </Card>

      <ConstraintList
        title="Must-haves"
        hint="A startup failing any of these is flagged."
        items={cfg.mustHaves}
        onChange={(mustHaves) => setCfg({ ...cfg, mustHaves })}
      />
      <ConstraintList
        title="Deal-breakers"
        hint="A startup matching any of these is scored down."
        items={cfg.dealBreakers}
        onChange={(dealBreakers) => setCfg({ ...cfg, dealBreakers })}
      />

      {/* Back-test */}
      <Card style={{ marginTop: 14 }}>
        <H>Back-test</H>
        <button onClick={() => backtest.mutate({ id: active.id, days: 60 })} style={primaryBtn} disabled={backtest.isPending}>
          {backtest.isPending ? "Running…" : "Replay last 60 days"}
        </button>
        {backtest.data && (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            {backtest.data.total} submissions · {backtest.data.scored} scored —{" "}
            <span style={{ color: "#16a34a" }}>{backtest.data.distribution.strong} strong</span>,{" "}
            <span style={{ color: "#d97706" }}>{backtest.data.distribution.medium} medium</span>,{" "}
            <span style={{ color: "#dc2626" }}>{backtest.data.distribution.weak} weak</span>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

function ConstraintList({
  title,
  hint,
  items,
  onChange,
}: {
  title: string;
  hint: string;
  items: ThesisConstraint[];
  onChange: (items: ThesisConstraint[]) => void;
}) {
  const set = (i: number, patch: Partial<ThesisConstraint>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const add = () => onChange([...items, { id: newId(), label: "", enabled: true }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <H>{title}</H>
        <button onClick={add} style={linkBtn}>
          + add
        </button>
      </div>
      <div style={{ fontSize: 12, color: c.muted, marginBottom: 8 }}>{hint}</div>
      {items.length === 0 && <Empty>None yet.</Empty>}
      {items.map((it, i) => (
        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <input type="checkbox" checked={it.enabled} onChange={(e) => set(i, { enabled: e.target.checked })} />
          <input value={it.label} placeholder="e.g. >$1M ARR" onChange={(e) => set(i, { label: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => remove(i)} style={linkBtn}>
            ✕
          </button>
        </div>
      ))}
    </Card>
  );
}

function structuredCloneSafe(v: ThesisConfig): ThesisConfig {
  return JSON.parse(JSON.stringify(v)) as ThesisConfig;
}

const inputStyle: React.CSSProperties = {
  background: c.bg,
  color: c.text,
  border: `1px solid ${c.border}`,
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 13,
  width: "100%",
};
const selectStyle: React.CSSProperties = { ...inputStyle, width: "auto" };
const primaryBtn: React.CSSProperties = {
  background: c.accent,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 14px",
  fontSize: 13,
  cursor: "pointer",
};
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: c.accent, cursor: "pointer", fontSize: 12 };

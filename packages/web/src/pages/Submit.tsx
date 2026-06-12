// SPDX-License-Identifier: MIT
//
// Submit a deal — the public intake form (proposal View 1, one of the four
// doors). A founder fills this in; it funnels through the same
// startups.upsert intake path as email / scout / copilot, lands as a Sourced
// lead with sourceChannel="form", and wakes vc-research.

import { useState } from "react";
import { useUpsertStartup } from "../lib/hooks.js";
import { Card, H, c, pageStyle } from "../lib/ui.js";

export function SubmitPage() {
  const upsert = useUpsertStartup();
  const [f, setF] = useState({ name: "", website: "", oneLiner: "", senderEmail: "", sourceDetail: "" });
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const canSubmit = f.name.trim().length > 0 && !upsert.isPending;

  const submit = () => {
    upsert.mutate(
      { ...f, sourceChannel: "form" },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 560 }}>
        <H>Submit a deal</H>
        <div style={{ fontSize: 13, color: c.muted, marginTop: -6, marginBottom: 16 }}>
          Tell us about the company. It enters the pipeline as a new lead — an agent researches it overnight and scores it
          against the fund's thesis.
        </div>

        {done ? (
          <Card style={{ borderColor: "#16a34a" }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#16a34a" }}>✓ Submitted</div>
            <div style={{ fontSize: 13, color: c.muted, marginTop: 6 }}>
              Thanks — <strong style={{ color: c.text }}>{f.name}</strong> is in the pipeline. The research agent will
              build a dossier and the partner team will review.
            </div>
            <button
              onClick={() => {
                setF({ name: "", website: "", oneLiner: "", senderEmail: "", sourceDetail: "" });
                setDone(false);
              }}
              style={linkBtn}
            >
              Submit another
            </button>
          </Card>
        ) : (
          <Card>
            <Field label="Company name *">
              <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Inc" style={inputStyle} />
            </Field>
            <Field label="Website">
              <input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="acme.com" style={inputStyle} />
            </Field>
            <Field label="One-liner">
              <input value={f.oneLiner} onChange={(e) => set("oneLiner", e.target.value)} placeholder="What you do, in a sentence" style={inputStyle} />
            </Field>
            <Field label="Your email">
              <input value={f.senderEmail} onChange={(e) => set("senderEmail", e.target.value)} placeholder="founder@acme.com" style={inputStyle} />
            </Field>
            <Field label="Anything else">
              <textarea value={f.sourceDetail} onChange={(e) => set("sourceDetail", e.target.value)} placeholder="Traction, round, why now…" style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} />
            </Field>
            {upsert.isError && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 8 }}>Something went wrong — try again.</div>}
            <button onClick={submit} disabled={!canSubmit} style={{ ...primaryBtn, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "default" }}>
              {upsert.isPending ? "Submitting…" : "Submit deal"}
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: c.bg,
  color: c.text,
  border: `1px solid ${c.border}`,
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};
const primaryBtn: React.CSSProperties = {
  background: c.accent,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: 13,
};
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: c.accent, cursor: "pointer", fontSize: 12, marginTop: 10, padding: 0 };

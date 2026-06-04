// SPDX-License-Identifier: GPL-3.0-or-later
//
// Small theme-aware UI atoms. Colors reference the shell's --bos-* contract
// so the module follows the user's Light/Dark choice with no rebuild.

import type { CSSProperties, ReactNode } from "react";

export const c = {
  bg: "var(--bos-bg)",
  surface: "var(--bos-surface, var(--bos-bg))",
  text: "var(--bos-text)",
  muted: "var(--bos-muted)",
  border: "var(--bos-border)",
  accent: "var(--bos-accent)",
};

// The shell mounts plugin pages directly into a `flex flex-col overflow-hidden`
// <main> with no scroll wrapper (built-in screens get one; plugins don't). So
// every page root must be its own scroll container: fill the flex column,
// allow it to shrink below content height, and scroll the overflow.
export const pageStyle: CSSProperties = {
  flex: "1 1 auto",
  minHeight: 0,
  height: "100%",
  overflowY: "auto",
  boxSizing: "border-box",
  padding: 20,
  color: c.text,
};

export function Card({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        padding: 14,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 15, color: c.text, marginTop: 2 }}>{value ?? "—"}</div>
    </div>
  );
}

/** Fit-score pill, colored by band: ≥70 strong, ≥40 medium, else weak. */
export function ScorePill({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return <span style={{ ...pill, color: c.muted, borderColor: c.border }}>—</span>;
  }
  const band = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";
  return <span style={{ ...pill, color: band, borderColor: band }}>{score}</span>;
}

const pill: CSSProperties = {
  display: "inline-block",
  minWidth: 26,
  textAlign: "center",
  fontSize: 12,
  fontWeight: 600,
  padding: "1px 7px",
  borderRadius: 999,
  border: "1px solid",
};

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        color: c.muted,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        padding: "1px 6px",
      }}
    >
      {children}
    </span>
  );
}

export function H({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 18, fontWeight: 600, color: c.text, margin: "0 0 12px" }}>{children}</h2>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div style={{ color: c.muted, fontSize: 13, padding: 16 }}>{children}</div>;
}

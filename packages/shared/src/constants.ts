// SPDX-License-Identifier: GPL-3.0-or-later
//
// VCBrain shared constants — pipeline stages, source channels, thesis
// defaults. Imported by both the server (seed + tools) and the web UI.

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 200;

/**
 * The venture pipeline (proposal View 2): Sourced → Screening →
 * Diligence → IC → Closed → Portfolio, plus a terminal Passed lane.
 * `type` drives terminal-stage logic the same way CRM's open/won/lost does:
 *   - `open`     — still being evaluated
 *   - `invested` — money in; "won" equivalent
 *   - `passed`   — declined; "lost" equivalent
 */
export const VC_STAGE_TYPES = ["open", "invested", "passed"] as const;
export type VcStageType = (typeof VC_STAGE_TYPES)[number];

export const DEFAULT_VC_STAGES = [
  { name: "Sourced", sortOrder: 0, type: "open" as const },
  { name: "Screening", sortOrder: 1, type: "open" as const },
  { name: "Diligence", sortOrder: 2, type: "open" as const },
  { name: "IC", sortOrder: 3, type: "open" as const },
  { name: "Closed", sortOrder: 4, type: "invested" as const },
  { name: "Portfolio", sortOrder: 5, type: "invested" as const },
  { name: "Passed", sortOrder: 6, type: "passed" as const },
] as const;

export type VcStageName = (typeof DEFAULT_VC_STAGES)[number]["name"];

/** Where a startup lead entered the system (proposal View 1). */
export const SOURCE_CHANNELS = [
  "email",
  "form",
  "copilot",
  "scout",
  "manual",
] as const;
export type SourceChannel = (typeof SOURCE_CHANNELS)[number];

/**
 * Free email providers. A founder's `name@gmail.com` tells us nothing
 * about the company domain, so dedup keys off the pitched company domain
 * and these are never treated as a company domain.
 */
export const CONSUMER_EMAIL_DOMAINS = new Set<string>([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "live.com",
  "msn.com",
]);

/** The three weighted scoring dimensions of the thesis engine (View 3). */
export const THESIS_DIMENSIONS = ["team", "market", "product"] as const;
export type ThesisDimension = (typeof THESIS_DIMENSIONS)[number];

/** A fresh fund starts with even weights and no hard constraints. */
export const DEFAULT_THESIS_WEIGHTS: Record<ThesisDimension, number> = {
  team: 34,
  market: 33,
  product: 33,
};

export const PORTFOLIO_SIGNAL_SEVERITIES = [
  "info",
  "watch",
  "alert",
] as const;
export type PortfolioSignalSeverity =
  (typeof PORTFOLIO_SIGNAL_SEVERITIES)[number];

export const MEMO_STATUSES = ["draft", "in_review", "published"] as const;
export type MemoStatus = (typeof MEMO_STATUSES)[number];

// SPDX-License-Identifier: GPL-3.0-or-later
//
// VCBrain shared DTOs. The server returns these shapes from tools/routes;
// the web UI consumes them. Kept deliberately structural (no Drizzle types)
// so the web package never imports the server.

import type {
  SourceChannel,
  ThesisDimension,
  PortfolioSignalSeverity,
  MemoStatus,
  VcStageType,
} from "./constants.js";

// ─────────────────────────────────────────────────────────────────────
// Startup (the central entity)
// ─────────────────────────────────────────────────────────────────────

export interface Startup {
  id: string;
  tenantId: string;
  name: string;
  domain: string | null;
  /** One-liner pitch, when known. */
  oneLiner: string | null;
  sourceChannel: SourceChannel;
  /** Free-text describing where the lead came from (e.g. "fwd: intro from X"). */
  sourceDetail: string | null;
  stage: string;
  /** 0–100, or null until vc-thesis-fit has scored it. */
  fitScore: number | null;
  /** The living brief (see StartupDossier). */
  dossier: StartupDossier | null;
  /** The thesis config that produced `fitScore`, snapshotted for reproducibility. */
  thesisSnapshot: ThesisConfig | null;
  ownerPartnerId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Dossier building blocks ────────────────────────────────────────────

/** Reliability of a claim. verified > public > database > inferred. */
export type Confidence = "verified" | "public" | "database" | "inferred";

/** A labelled value with provenance — the unit of a sourced fact. */
export interface SourcedValue {
  label: string;
  value: string;
  /** Source id (see dossier.sources) or short note. */
  source?: string;
  confidence?: Confidence;
  note?: string;
}

/** A headline metric card (ARR, growth, runway, …). */
export interface Metric {
  label: string;
  value: string;
  unit?: string;
  subtitle?: string;
  /** Direction for the UI arrow. */
  trend?: "up" | "down" | "flat";
}

export interface Tag {
  label: string;
  accent?: boolean;
}

/** A dated external signal (news, hire, launch, momentum). */
export interface Signal {
  type: string; // news / hiring / launch / funding / traffic / sentiment
  date?: string;
  headline: string;
  detail?: string;
  source?: string;
  sentiment?: "positive" | "neutral" | "negative";
}

/** An actionable, partner-facing alert — specific to THIS deal. */
export interface Alert {
  hook: string;
  detail: string;
  severity?: "info" | "watch" | "flag";
}

export interface Source {
  id: string;
  title: string;
  url?: string;
  tier: "verified" | "public" | "database" | "inferred";
  contribution?: string;
}

export interface TimelineEntry {
  date?: string;
  title: string;
  body?: string;
  sources?: string[];
}

/**
 * The living dossier — analyst-grade. Every field optional; vc-research fills
 * what the evidence supports and refreshes over time. The bar is "what a
 * world-class VC analyst would compile from the deck + deep web research":
 * company, product, market, competition, traction (with unit economics), the
 * team (founder deep-dive), the round + cap table, thesis fit, a diligence
 * plan, live signals, and warm-intro paths — every claim sourced.
 */
export interface StartupDossier {
  version: number;
  enrichedAt: string;
  /** Model that produced this pass (for the "Hebbs.ai with {model}" line). */
  model?: string;
  sourceCount?: number;
  /** 0–100 self-assessed dossier completeness. */
  completeness?: number;

  /** Presentation header — the at-a-glance card. */
  header?: {
    monogram?: string;
    /** The analyst's one-line positioning (not the company's tagline). */
    positioning?: string;
    /** The company's own one-liner. */
    tagline?: string;
    founded?: string;
    hq?: string;
    stage?: string; // pre-seed / seed / A …
    category?: string;
    tags?: Tag[];
    quickStats?: {
      website?: string;
      location?: string;
      employees?: string;
      fundingStage?: string;
      raising?: string;
      askValuation?: string;
    };
  };

  /** Headline metric cards. */
  metrics?: Metric[];

  /** Executive summary — the analyst's take. */
  snapshot?: {
    /** Why this could (or couldn't) return the fund. */
    thesis?: string;
    whatTheyDo?: string;
    whyNow?: string;
    recommendation?: string;
    conviction?: "high" | "medium" | "low" | "pass";
  };

  product?: {
    summary?: string;
    problem?: string;
    solution?: string;
    howItWorks?: string;
    features?: string[];
    differentiators?: string[];
    moat?: string;
    ip?: { type: string; status?: string; detail?: string }[];
    techStack?: string[];
    integrations?: string[];
    roadmap?: string[];
    maturity?: string;
    demoUrl?: string;
  };

  market?: {
    summary?: string;
    tam?: string;
    sam?: string;
    som?: string;
    growthRate?: string;
    timing?: string;
    whyNow?: string;
    tailwinds?: string[];
    headwinds?: string[];
    regulatory?: string;
    segments?: string[];
    icp?: string;
    geographies?: string[];
  };

  competition?: {
    positioning?: string;
    moatVsCompetition?: string;
    direct?: { name: string; note?: string; funding?: string; vsThem?: string }[];
    indirect?: string[];
    substitutes?: string[];
    barriersToEntry?: string[];
  };

  traction?: {
    summary?: string;
    revenue?: { arr?: string; mrr?: string; gmv?: string };
    growth?: { mom?: string; yoy?: string };
    customers?: { count?: string; notable?: string[]; pipeline?: string; concentration?: string };
    retention?: { grossChurn?: string; nrr?: string; logoChurn?: string };
    engagement?: { dau?: string; mau?: string; wau?: string; nps?: string };
    unitEconomics?: {
      cac?: string;
      ltv?: string;
      ltvCacRatio?: string;
      paybackMonths?: string;
      grossMargin?: string;
      burnMultiple?: string;
      magicNumber?: string;
    };
    burn?: { monthly?: string; runwayMonths?: string };
    milestones?: { date?: string; event: string }[];
  };

  team?: {
    summary?: string;
    size?: string;
    founderMarketFit?: string;
    hiringVelocity?: string;
    culture?: string;
    gaps?: string[];
    founders?: FounderProfile[];
    keyHires?: { name: string; role?: string; background?: string }[];
    advisors?: { name: string; note?: string }[];
    board?: { name: string; affiliation?: string }[];
  };

  round?: {
    raising?: string;
    instrument?: string; // SAFE / priced / note
    valuation?: string;
    roundStage?: string;
    useOfFunds?: string;
    runwayPostRaise?: string;
    targetClose?: string;
    leadStatus?: string;
    minCheck?: string;
    allocationAvailable?: string;
    totalRaised?: string;
    dilution?: string;
    ownership?: string;
    capTableNotes?: string;
    existingInvestors?: string[];
    notableAngels?: string[];
    priorRounds?: { date?: string; stage?: string; amount?: string; valuation?: string; leadInvestors?: string[] }[];
  };

  /** vc-thesis-fit output, mirrored into the dossier for the UI. */
  fit?: ThesisFit;

  /** The diligence plan — what to verify before investing. */
  diligence?: {
    redFlags?: { severity?: "low" | "medium" | "high"; item: string; detail?: string }[];
    openQuestions?: string[];
    keyRisks?: { category: string; risk: string; mitigation?: string }[];
    checklist?: { area: string; status?: "todo" | "in_progress" | "done"; note?: string }[];
    referencesToCheck?: string[];
  };

  /** Live external signals (news, hiring, launches, traffic, sentiment). */
  signals?: Signal[];

  /** Digital footprint + growth proxies (web traffic, GitHub, app rank, socials). */
  digital?: { platform: string; handle?: string; url?: string; metric?: string; note?: string }[];

  /** Warm-intro paths + the fund's relationship to the deal. */
  network?: {
    warmIntroPaths?: string[];
    mutualConnections?: string[];
    referredBy?: string;
    relationshipToFund?: string;
    priorInteractions?: string[];
    partnerNotes?: string;
  };

  recognition?: { year?: string; title: string; description?: string; source?: string }[];

  /** Actionable, partner-facing alerts. */
  alerts?: Alert[];

  /** Company journey / key events. */
  timeline?: TimelineEntry[];

  /** Every source the dossier draws on. */
  sources?: Source[];
}

/** Founder deep-dive — the CRM contact dossier, applied to each founder. */
export interface FounderProfile {
  name: string;
  role?: string;
  monogram?: string;
  /** Analyst's one-line read on the person. */
  positioning?: string;
  email?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  location?: string;
  background?: string;
  education?: string[];
  priorCompanies?: { name: string; role?: string; outcome?: string }[];
  priorExits?: string[];
  domainExpertise?: string;
  founderMarketFit?: string;
  yearsExperience?: string;
  notable?: string[];
  reputation?: string;
  quotes?: { text: string; source?: string }[];
  redFlags?: string[];
}

// ─────────────────────────────────────────────────────────────────────
// Thesis engine (View 3)
// ─────────────────────────────────────────────────────────────────────

export interface ThesisConfig {
  /** Hard must-haves — a lead failing any is flagged. */
  mustHaves: ThesisConstraint[];
  /** Deal-breakers — a lead matching any is auto-flagged out. */
  dealBreakers: ThesisConstraint[];
  /** Importance weights per dimension; should sum ~100. */
  weights: Record<ThesisDimension, number>;
}

export interface ThesisConstraint {
  id: string;
  label: string;
  /** Optional machine-checkable hint (e.g. "arr_min:1000000"); free-text otherwise. */
  rule?: string;
  enabled: boolean;
}

export interface Thesis {
  id: string;
  tenantId: string;
  name: string;
  config: ThesisConfig;
  isActive: boolean;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The fit agent's verdict on one startup against the active thesis. */
export interface ThesisFit {
  score: number; // 0–100
  /** 3 specific fits in thesis language. */
  fits: string[];
  /** 3 specific risks. */
  risks: string[];
  /** Per-dimension subscores (0–100). */
  dimensionScores?: Partial<Record<ThesisDimension, number>>;
  /** Hard constraints that failed / deal-breakers that matched. */
  failedMustHaves?: string[];
  matchedDealBreakers?: string[];
  suggestedLeadPartner?: string;
  /** Conviction independent of the numeric score. */
  conviction?: "high" | "medium" | "low" | "pass";
  /** Comparable companies/deals that anchor the read. */
  comps?: { company: string; outcome?: string; relevance?: string }[];
  /** Return scenarios the partner can sanity-check. */
  returnScenarios?: { scenario: string; multiple?: string; rationale?: string }[];
  ownershipTarget?: string;
  scoredAt: string;
}

// ─────────────────────────────────────────────────────────────────────
// Memos + portfolio + files
// ─────────────────────────────────────────────────────────────────────

export interface Memo {
  id: string;
  tenantId: string;
  startupId: string;
  draftMd: string;
  citedSources: { label: string; ref: string }[];
  status: MemoStatus;
  editedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSignal {
  id: string;
  tenantId: string;
  startupId: string;
  signalType: string; // news / hiring / runway / kpi / churn …
  payload: Record<string, unknown>;
  severity: PortfolioSignalSeverity;
  createdAt: string;
}

export interface StartupFile {
  id: string;
  tenantId: string;
  startupId: string;
  drivePath: string;
  filename: string;
  kind: "deck" | "doc" | "other";
  mimeType: string | null;
  sourceMessageId: string | null;
  parsedAt: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────
// List envelope (matches the server's tool return shape)
// ─────────────────────────────────────────────────────────────────────

export interface ListResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export type { SourceChannel, VcStageType, MemoStatus, PortfolioSignalSeverity };

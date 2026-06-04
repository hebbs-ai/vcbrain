// SPDX-License-Identifier: MIT
//
// Demo seed — wipes the tenant's VCBrain data and loads 4 real, recent
// YC-era AI companies as fully worked examples that exercise every agent and
// every stage end-to-end. Company descriptions reflect public positioning;
// financial figures are analyst ESTIMATES for the demo (tagged `inferred`).
//
//   cd packages/server && VCBRAIN_TEST_DB=postgres://boringos:boringos@127.0.0.1:5436/boringos node scripts/seed-demo.mjs

import { randomUUID } from "node:crypto";
import postgres from "postgres";

const URL = process.env.VCBRAIN_TEST_DB || "postgres://boringos:boringos@127.0.0.1:5436/boringos";
const TENANT = process.env.VCBRAIN_TENANT || "397cac55-19f3-44ad-9d34-16e1b5ea19bd";
const sql = postgres(URL, { max: 2 });

const THESIS = {
  mustHaves: [
    { id: "moat", label: "Defensible technical moat or data advantage", enabled: true },
    { id: "fmf", label: "Strong founder-market fit", enabled: true },
  ],
  dealBreakers: [{ id: "nomoat", label: "Pure GPT wrapper, no defensibility", enabled: true }],
  weights: { team: 40, market: 30, product: 30 },
};

const SRC_NOTE = { id: "SRC-EST", title: "Analyst estimates (demo)", tier: "inferred", contribution: "Private financials are illustrative analyst estimates" };

// ── The four companies ─────────────────────────────────────────────────

const firecrawl = {
  name: "Firecrawl",
  domain: "firecrawl.dev",
  oneLiner: "Turn any website into clean, LLM-ready data with one API",
  source: "email",
  stage: "IC",
  fitScore: 87,
  dossier: {
    version: 4, enrichedAt: new Date().toISOString(), model: "claude-sonnet-4-6", sourceCount: 9, completeness: 84,
    header: {
      monogram: "FC", positioning: "The web-data layer for the AI stack — fastest path from URL to LLM-ready data",
      tagline: "Turn websites into LLM-ready markdown", founded: "2024", hq: "San Francisco / remote", stage: "Seed", category: "AI infra / web data",
      tags: [{ label: "Open source", accent: true }, { label: "Ex-Mendable (YC W23)" }, { label: "Top-tier GitHub traction" }, { label: "Dev-led growth" }],
      quickStats: { website: "firecrawl.dev", location: "San Francisco", employees: "~12", fundingStage: "Seed", raising: "$6M", askValuation: "$45M cap" },
    },
    metrics: [
      { label: "ARR", value: "$2.1M", subtitle: "est., self-serve led", trend: "up" },
      { label: "Growth", value: "30%", unit: "MoM", trend: "up" },
      { label: "GitHub", value: "30k+", unit: "stars", trend: "up" },
      { label: "Net retention", value: "140%", subtitle: "usage-based" },
      { label: "Gross margin", value: "68%", subtitle: "infra-heavy" },
      { label: "Runway", value: "16", unit: "mo" },
    ],
    snapshot: {
      thesis: "Every AI app needs clean web data, and Firecrawl has become the default open-source primitive for it with explosive dev adoption. If they convert OSS love into usage-based revenue the way the best infra companies do, this is a category-defining seed with a credible ex-Mendable team. The risk is commoditization and margin.",
      whatTheyDo: "An API + open-source toolkit that crawls, scrapes and converts websites into clean markdown / structured JSON for LLMs and agents, handling JS rendering, proxies and anti-bot.",
      whyNow: "RAG and agents have made web data ingestion a universal need in 2024-2025; the incumbents (scraping vendors) are not AI-native.",
      recommendation: "Lead or co-lead the seed. Verify revenue mix (self-serve vs a few large contracts) and infra-margin trajectory before IC.",
      conviction: "high",
    },
    product: {
      summary: "Scrape / crawl / extract endpoints + SDKs that return LLM-ready data; open-core with a hosted API.",
      problem: "Web data is messy (JS, anti-bot, boilerplate); every AI team rebuilds brittle scrapers.",
      solution: "One API that returns clean markdown/JSON at scale, with crawling, extraction schemas and change tracking.",
      moat: "OSS distribution + mindshare as the default primitive, plus an infra/reliability moat (proxy + render orchestration) that is hard to match on quality and cost.",
      differentiators: ["LLM-ready output out of the box", "Open-source community + integrations", "Schema-based extraction", "Handles JS/anti-bot at scale"],
      techStack: ["TypeScript", "Rust workers", "headless browser farm", "proxy orchestration"],
      integrations: ["LangChain", "LlamaIndex", "Dify", "n8n"],
      maturity: "GA, large free + paid base",
    },
    market: {
      summary: "Web-data-for-AI is a fast-emerging slice of the data-infra market.", tam: "$8B (web data + ETL for AI)", sam: "$1.5B", growthRate: "40%+ CAGR",
      whyNow: "RAG/agents made web ingestion universal; AI-native tooling is replacing legacy scraping vendors.",
      icp: "AI product teams + agent builders, seed to Series C",
      tailwinds: ["RAG/agent adoption", "Open-source-led developer buying"], headwinds: ["Scraping legality/ToS gray areas", "Commoditization pressure on price"],
      regulatory: "Scraping is legally contested (hiQ/LinkedIn); a real diligence item.",
    },
    competition: {
      positioning: "The AI-native, open-source default vs legacy scraping APIs and DIY.",
      moatVsCompetition: "Community + LLM-ready quality + cost. Stickiness from integrations and extraction schemas.",
      direct: [{ name: "Apify", funding: "profitable / bootstrapped-ish", vsThem: "Marketplace breadth but not AI-native output" }, { name: "Bright Data / Zyte", funding: "large incumbents", vsThem: "Enterprise scale but legacy DX, not LLM-first" }],
      substitutes: ["DIY Playwright scrapers", "Search/SERP APIs"], barriersToEntry: ["Proxy + render infra at quality", "OSS community", "Integration footprint"],
    },
    traction: {
      summary: "Standout open-source traction converting to usage revenue.",
      revenue: { arr: "$2.1M (est.)", mrr: "$175k (est.)" }, growth: { mom: "30% (est.)" },
      customers: { count: "thousands of free, hundreds paid (est.)", notable: ["Several well-known AI startups (self-serve)"], concentration: "Low — self-serve led (verify)" },
      retention: { nrr: "140% (est.)" }, engagement: { nps: "—" },
      unitEconomics: { cac: "$0–low (PLG)", ltv: "high (usage)", ltvCacRatio: "strong (PLG)", grossMargin: "68% (est.)", burnMultiple: "~1.2x (est.)" },
      burn: { monthly: "$160k (est.)", runwayMonths: "16 (est.)" },
      milestones: [{ date: "2024", event: "Firecrawl launched out of Mendable" }, { date: "2024-H2", event: "Crossed 20k GitHub stars" }],
    },
    team: {
      summary: "Ex-Mendable (YC W23) team that already shipped a developer-loved AI product.", size: "~12", founderMarketFit: "Built RAG data tooling at Mendable; lived the web-data pain firsthand.", hiringVelocity: "Hiring infra + DevRel",
      founders: [
        { name: "Caleb Peffer", role: "CEO", positioning: "Repeat AI-dev-tools founder (Mendable, YC W23)", background: "Founder/CEO of Mendable; pivoted into Firecrawl as the breakout product.", domainExpertise: "AI dev tools, RAG, web data", founderMarketFit: "Strong — built the adjacent product and the community", linkedin: "https://linkedin.com/in/calebpeffer", notable: ["Grew a top open-source AI-data project"], redFlags: [] },
      ],
      gaps: ["Enterprise GTM still early"],
    },
    round: {
      raising: "$6M", instrument: "Priced seed (est.)", valuation: "$45M cap (est.)", roundStage: "Seed", useOfFunds: "Infra scale, enterprise tier, DevRel, anti-bot R&D",
      runwayPostRaise: "24mo", leadStatus: "Competitive — strong inbound (est.)", totalRaised: "Pre-seed + OSS sponsorships (est.)",
      existingInvestors: ["YC (via Mendable W23)"], notableAngels: ["AI-infra operators (est.)"],
      priorRounds: [{ date: "2023", stage: "YC W23 (Mendable)", amount: "~$500k", leadInvestors: ["Y Combinator"] }],
    },
    fit: {
      score: 87, dimensionScores: { team: 88, market: 85, product: 88 },
      fits: ["Default open-source primitive — real distribution moat", "Repeat ex-Mendable team with proven dev-tools instincts", "Usage-based revenue with high NRR"],
      risks: ["Commoditization / price pressure", "Scraping legal/ToS exposure", "Infra gross margin needs to improve"],
      failedMustHaves: [], matchedDealBreakers: [], conviction: "high",
      comps: [{ company: "Apify", outcome: "profitable scale-up", relevance: "scraping infra" }, { company: "Algolia", outcome: "late-stage", relevance: "dev-led infra to enterprise" }],
      returnScenarios: [{ scenario: "Bull", multiple: "30x+", rationale: "Becomes the web-data standard for AI" }, { scenario: "Base", multiple: "5x", rationale: "Healthy usage-based infra business" }, { scenario: "Bear", multiple: "0.5x", rationale: "Commoditized; margins compress" }],
      suggestedLeadPartner: "Alex (infra)", ownershipTarget: "10-12%", scoredAt: new Date().toISOString(),
    },
    diligence: {
      redFlags: [{ severity: "medium", item: "Scraping legality", detail: "ToS/anti-bot exposure; needs counsel review" }, { severity: "low", item: "Infra margin", detail: "68% est. — confirm trajectory" }],
      keyRisks: [{ category: "legal", risk: "Scraping/ToS litigation", mitigation: "Compliance posture + customer indemnity terms" }, { category: "market", risk: "Commoditization", mitigation: "Move up-stack to extraction + enterprise" }],
      openQuestions: ["Self-serve vs large-contract revenue mix?", "Gross-margin path at scale?", "Enterprise pipeline?"],
      checklist: [{ area: "Revenue mix + recognition", status: "todo" }, { area: "Legal review of scraping posture", status: "todo" }, { area: "Infra cost model", status: "todo" }],
      referencesToCheck: ["2 paying AI-startup customers", "Mendable-era investor"],
    },
    signals: [
      { type: "traffic", date: "2025", headline: "GitHub stars compounding (20k → 30k)", sentiment: "positive", source: "SRC-GH" },
      { type: "launch", date: "2025", headline: "Shipped structured extraction + change tracking", sentiment: "positive" },
    ],
    digital: [{ platform: "GitHub", handle: "mendableai/firecrawl", metric: "30k+ stars", note: "top AI-data repo" }, { platform: "X", handle: "firecrawl_dev", metric: "active", note: "strong DevRel" }],
    network: { warmIntroPaths: ["Shared YC network (Mendable W23)"], referredBy: "Inbound founder email", relationshipToFund: "First contact" },
    alerts: [
      { hook: "Move fast — competitive round", detail: "Strong inbound; if we want allocation, get to a partner meeting this week.", severity: "watch" },
      { hook: "Legal diligence is the swing factor", detail: "Scraping posture must clear counsel before IC — pre-brief legal now.", severity: "flag" },
    ],
    sources: [
      { id: "SRC-GH", title: "GitHub — mendableai/firecrawl", url: "https://github.com/mendableai/firecrawl", tier: "public", contribution: "Traction, product scope" },
      { id: "SRC-SITE", title: "firecrawl.dev", tier: "public", contribution: "Product, pricing" },
      { id: "SRC-YC", title: "YC — Mendable (W23)", tier: "database", contribution: "Team pedigree" },
      SRC_NOTE,
    ],
  },
  memo: { status: "draft", md: icMemo("Firecrawl", "the open-source web-data layer for AI", "$2.1M ARR (est.) growing ~30% MoM with 30k+ GitHub stars", "Scraping legality and infra margin", "Lead the $6M seed at ~$45M; strong distribution moat and repeat team.") },
};

const helicone = {
  name: "Helicone",
  domain: "helicone.ai",
  oneLiner: "Open-source observability and gateway for LLM apps",
  source: "form",
  stage: "IC",
  fitScore: 79,
  dossier: {
    version: 3, enrichedAt: new Date().toISOString(), model: "claude-sonnet-4-6", sourceCount: 8, completeness: 80,
    header: {
      monogram: "HL", positioning: "The Datadog for LLM apps — observability + gateway in one open-source layer",
      tagline: "Monitor, debug and optimize your LLM app", founded: "2023", hq: "San Francisco", stage: "Seed", category: "AI infra / observability",
      tags: [{ label: "YC W23", accent: true }, { label: "Open source" }, { label: "1-line integration" }, { label: "Dev-led" }],
      quickStats: { website: "helicone.ai", location: "San Francisco", employees: "~10", fundingStage: "Seed", raising: "$5M", askValuation: "$35M cap" },
    },
    metrics: [
      { label: "ARR", value: "$1.2M", subtitle: "est.", trend: "up" }, { label: "Growth", value: "20%", unit: "MoM", trend: "up" },
      { label: "Requests logged", value: "2B+", subtitle: "cumulative (est.)", trend: "up" }, { label: "Net retention", value: "125%", subtitle: "est." },
      { label: "GitHub", value: "3k+", unit: "stars" }, { label: "Runway", value: "15", unit: "mo" },
    ],
    snapshot: {
      thesis: "As LLM apps go to production, observability becomes non-negotiable, and Helicone's one-line proxy + open-source distribution is a credible wedge into an LLMOps platform. The question is defensibility versus a crowded field (LangSmith, Langfuse) and the model providers' own dashboards.",
      whatTheyDo: "An open-source proxy/gateway + dashboard that logs, traces, caches and rate-limits LLM calls, with cost and latency analytics.",
      whyNow: "Production LLM usage in 2024-2025 created an LLMOps gap; teams need cost/latency/quality visibility.",
      recommendation: "Advance to a partner call. Pressure-test differentiation vs Langfuse/LangSmith and the path from logging to platform.",
      conviction: "medium",
    },
    product: {
      summary: "Gateway + observability for LLM apps; integrate by changing the base URL.",
      problem: "Teams are blind to LLM cost, latency, errors and prompt quality in production.",
      solution: "Drop-in proxy that captures every call + a dashboard for analytics, caching, and rate limits.",
      moat: "Lowest-friction integration + open source; gateway position lets it expand into caching, routing and evals.",
      differentiators: ["1-line integration via proxy", "Open source / self-host", "Gateway features (cache, rate-limit, routing)"],
      techStack: ["TypeScript", "Cloudflare Workers", "ClickHouse"],
      integrations: ["OpenAI", "Anthropic", "LangChain", "LiteLLM"],
      maturity: "GA",
    },
    market: {
      summary: "LLMOps/observability is a hot but contested category.", tam: "$5B (AI observability/LLMOps)", sam: "$1B", growthRate: "high",
      whyNow: "Production LLM apps need cost/quality visibility.", icp: "AI engineering teams shipping to production",
      tailwinds: ["LLM apps to production", "Cost pressure on inference"], headwinds: ["Crowded category", "Providers ship native dashboards"],
    },
    competition: {
      positioning: "Gateway-first + open source vs SDK-first observability.",
      direct: [{ name: "Langfuse", funding: "seed/Series A", vsThem: "OSS tracing leader; Helicone wins on gateway/proxy simplicity" }, { name: "LangSmith (LangChain)", funding: "well-funded", vsThem: "Tied to LangChain; Helicone is framework-agnostic" }],
      substitutes: ["Provider dashboards", "Homegrown logging"], barriersToEntry: ["Gateway position", "OSS community", "Data scale"],
    },
    traction: {
      summary: "Solid PLG traction; needs to prove expansion to platform.",
      revenue: { arr: "$1.2M (est.)" }, growth: { mom: "20% (est.)" },
      customers: { count: "hundreds paid (est.)", concentration: "Low (self-serve)" }, retention: { nrr: "125% (est.)" },
      unitEconomics: { grossMargin: "70% (est.)", burnMultiple: "~1.5x (est.)" }, burn: { monthly: "$130k (est.)", runwayMonths: "15 (est.)" },
      milestones: [{ date: "2023", event: "YC W23" }, { date: "2024", event: "Crossed 1B logged requests" }],
    },
    team: {
      summary: "Technical YC W23 team with strong DX instincts.", size: "~10", founderMarketFit: "Built internal LLM tooling; felt the observability gap.",
      founders: [
        { name: "Justin Torre", role: "CEO", positioning: "Infra/observability builder", background: "Ex-large-tech eng; co-founded Helicone in YC W23.", domainExpertise: "observability, infra", founderMarketFit: "Strong", linkedin: "https://linkedin.com/in/justintorre", redFlags: [] },
        { name: "Cole Gottdank", role: "CTO", background: "Eng co-founder, gateway/infra.", domainExpertise: "distributed systems" },
      ],
      gaps: ["Enterprise security/compliance for regulated buyers"],
    },
    round: {
      raising: "$5M", instrument: "Priced seed (est.)", valuation: "$35M cap (est.)", useOfFunds: "Platform (evals, routing), enterprise, GTM",
      runwayPostRaise: "20mo", leadStatus: "Seeking lead", existingInvestors: ["YC"], priorRounds: [{ date: "2023", stage: "YC W23 + pre-seed", amount: "~$1M", leadInvestors: ["Y Combinator"] }],
    },
    fit: {
      score: 79, dimensionScores: { team: 82, market: 78, product: 80 },
      fits: ["Lowest-friction integration → strong wedge", "Open-source distribution + gateway position", "Framework-agnostic (not tied to LangChain)"],
      risks: ["Crowded observability category", "Providers may bundle native", "Logging-to-platform leap unproven"],
      failedMustHaves: [], matchedDealBreakers: [], conviction: "medium",
      comps: [{ company: "Datadog", outcome: "public", relevance: "observability platform arc" }, { company: "Langfuse", outcome: "growing", relevance: "direct OSS comp" }],
      returnScenarios: [{ scenario: "Bull", multiple: "15x", rationale: "Becomes the LLMOps platform" }, { scenario: "Base", multiple: "3x", rationale: "Solid niche observability tool" }, { scenario: "Bear", multiple: "0x", rationale: "Out-competed / commoditized" }],
      suggestedLeadPartner: "Alex (infra)", ownershipTarget: "8-10%", scoredAt: new Date().toISOString(),
    },
    diligence: {
      redFlags: [{ severity: "medium", item: "Crowded category", detail: "Langfuse/LangSmith well-funded" }],
      keyRisks: [{ category: "market", risk: "Category crowding + provider bundling", mitigation: "Gateway lock-in + multi-provider routing" }, { category: "product", risk: "Logging→platform leap", mitigation: "Ship evals + routing fast" }],
      openQuestions: ["Differentiation vs Langfuse in 18 months?", "Net dollar retention durability?", "Enterprise readiness?"],
      checklist: [{ area: "Competitive win/loss", status: "todo" }, { area: "NRR cohorts", status: "todo" }],
      referencesToCheck: ["2 paying customers", "YC partner"],
    },
    signals: [{ type: "launch", date: "2025", headline: "Shipped LLM gateway routing + caching", sentiment: "positive" }],
    digital: [{ platform: "GitHub", handle: "Helicone/helicone", metric: "3k+ stars", note: "steady" }],
    network: { referredBy: "Public form submission", relationshipToFund: "First contact" },
    alerts: [{ hook: "Differentiation is the crux", detail: "Lead the partner meeting on why Helicone wins vs Langfuse/LangSmith over 3 years.", severity: "watch" }],
    sources: [
      { id: "SRC-SITE", title: "helicone.ai", tier: "public", contribution: "Product" },
      { id: "SRC-GH", title: "GitHub — Helicone", url: "https://github.com/Helicone/helicone", tier: "public", contribution: "Traction" },
      { id: "SRC-YC", title: "YC — Helicone (W23)", tier: "database", contribution: "Team, batch" },
      SRC_NOTE,
    ],
  },
  memo: { status: "draft", md: icMemo("Helicone", "open-source observability + gateway for LLM apps (YC W23)", "$1.2M ARR (est.), 20% MoM, 2B+ requests logged", "A crowded category vs Langfuse/LangSmith", "Advance with conviction medium; differentiation diligence required before a term sheet.") },
};

const onyx = {
  name: "Onyx",
  domain: "onyx.app",
  oneLiner: "Open-source Gen-AI search and chat over your company's knowledge",
  source: "email",
  stage: "Portfolio",
  fitScore: 74,
  dossier: {
    version: 5, enrichedAt: new Date().toISOString(), model: "claude-sonnet-4-6", sourceCount: 9, completeness: 86,
    header: {
      monogram: "ON", positioning: "Open-source enterprise AI search — own the knowledge layer, self-hostable",
      tagline: "AI chat over all your company's docs", founded: "2023", hq: "San Francisco", stage: "Seed (invested)", category: "Enterprise AI / search",
      tags: [{ label: "YC W24", accent: true }, { label: "Open source" }, { label: "40+ connectors" }, { label: "Self-host" }],
      quickStats: { website: "onyx.app", location: "San Francisco", employees: "~15", fundingStage: "Seed (closed)", raising: "Closed", askValuation: "$60M post" },
    },
    metrics: [
      { label: "ARR", value: "$1.8M", subtitle: "est.", trend: "up" }, { label: "Growth", value: "18%", unit: "MoM", trend: "up" },
      { label: "GitHub", value: "11k+", unit: "stars", trend: "up" }, { label: "Connectors", value: "40+" },
      { label: "Net retention", value: "120%", subtitle: "est." }, { label: "Our stake", value: "9%", subtitle: "seed" },
    ],
    snapshot: {
      thesis: "Enterprise knowledge search is a durable need and Onyx's open-source, self-hostable approach wins the security-sensitive buyers that SaaS-only tools cannot. Now in our portfolio; the watch items are enterprise GTM and competition from Glean down-market.",
      whatTheyDo: "Open-source Gen-AI search/assistant that connects to 40+ sources (Slack, Drive, Confluence, etc.) and answers questions over company knowledge, self-hosted or cloud.",
      whyNow: "Every enterprise wants ChatGPT over its own data, but security/self-hosting blocks SaaS-only vendors.",
      recommendation: "Held (portfolio). Support enterprise GTM hire; monitor Glean's down-market push.",
      conviction: "high",
    },
    product: {
      summary: "Connectors + retrieval + chat assistant; open-source core, enterprise cloud/self-host.",
      problem: "Company knowledge is siloed across tools; finding answers is slow.",
      solution: "Unified Gen-AI search/assistant over 40+ connectors with permissions awareness.",
      moat: "Open source + self-host trust + connector breadth + permission-aware retrieval.",
      differentiators: ["Self-hostable (security buyers)", "40+ connectors", "Permission-aware", "Open source community"],
      techStack: ["Python", "FastAPI", "Vespa/Postgres", "React"], integrations: ["Slack", "Google Drive", "Confluence", "Jira", "Notion"], maturity: "GA, enterprise deployments",
    },
    market: {
      summary: "Enterprise AI search is large and contested (Glean leads SaaS).", tam: "$10B (enterprise search + knowledge)", sam: "$2B", growthRate: "high",
      whyNow: "Gen-AI made knowledge search finally work; security blocks SaaS-only.", icp: "Mid-market + security-sensitive enterprises",
      tailwinds: ["Enterprise Gen-AI budgets", "Self-host/security demand"], headwinds: ["Glean's funding + brand", "Microsoft Copilot bundling"],
    },
    competition: {
      positioning: "Open-source + self-host vs SaaS-only (Glean) and Copilot bundling.",
      direct: [{ name: "Glean", funding: "$200M+ / unicorn", vsThem: "Brand + enterprise GTM; Onyx wins on self-host + price + OSS" }, { name: "Microsoft Copilot", funding: "infinite", vsThem: "Bundled but M365-locked; Onyx is heterogeneous + self-host" }],
      substitutes: ["DIY RAG", "Vendor-native search"], barriersToEntry: ["Connector breadth", "Permission model", "OSS trust"],
    },
    traction: {
      summary: "Healthy OSS-led enterprise pipeline.",
      revenue: { arr: "$1.8M (est.)" }, growth: { mom: "18% (est.)" },
      customers: { count: "dozens of paid (est.)", notable: ["Mid-market + a few security-sensitive enterprises"], concentration: "Moderate — a few large self-host deals (watch)" },
      retention: { nrr: "120% (est.)" }, unitEconomics: { grossMargin: "75% (est.)", burnMultiple: "~1.6x (est.)" }, burn: { monthly: "$200k (est.)", runwayMonths: "20 (est.)" },
      milestones: [{ date: "2024", event: "YC W24 (as Danswer)" }, { date: "2024", event: "Rebrand to Onyx" }, { date: "2025", event: "Crossed 10k GitHub stars" }],
    },
    team: {
      summary: "Strong technical YC W24 founders with enterprise focus.", size: "~15", founderMarketFit: "Built internal search tools; deep retrieval expertise.",
      founders: [
        { name: "Chris Weaver", role: "Co-founder", positioning: "Enterprise search / retrieval", background: "Co-founded Danswer/Onyx (YC W24).", domainExpertise: "retrieval, enterprise", founderMarketFit: "Strong", linkedin: "https://linkedin.com/in/chrisweaver", redFlags: [] },
        { name: "Yuhong Sun", role: "Co-founder", background: "Eng co-founder, retrieval/infra.", domainExpertise: "search infra" },
      ],
      keyHires: [{ name: "(open)", role: "Head of Enterprise Sales", background: "TBD — key hire" }], gaps: ["Enterprise sales leadership"],
    },
    round: {
      raising: "Closed", instrument: "Priced seed", valuation: "$60M post (our entry)", useOfFunds: "Enterprise GTM, connectors, security certs",
      runwayPostRaise: "20mo", leadStatus: "Closed (we participated)", totalRaised: "~$10M (est.)", existingInvestors: ["YC", "(our fund)", "infra angels"],
      priorRounds: [{ date: "2024", stage: "YC W24 + seed", amount: "~$10M", leadInvestors: ["Y Combinator", "(our fund)"] }],
    },
    fit: {
      score: 74, dimensionScores: { team: 80, market: 76, product: 78 },
      fits: ["Open-source + self-host wins security buyers Glean can't", "40+ connectors = real switching cost", "Permission-aware retrieval is enterprise-grade"],
      risks: ["Glean brand + funding", "Microsoft Copilot bundling", "Enterprise GTM unproven"],
      failedMustHaves: [], matchedDealBreakers: [], conviction: "high",
      comps: [{ company: "Glean", outcome: "unicorn", relevance: "direct category, SaaS" }, { company: "Elastic", outcome: "public", relevance: "OSS → enterprise search" }],
      returnScenarios: [{ scenario: "Bull", multiple: "20x", rationale: "OSS leader in enterprise AI search" }, { scenario: "Base", multiple: "4x", rationale: "Solid mid-market vendor" }, { scenario: "Bear", multiple: "0.5x", rationale: "Squeezed by Glean + Copilot" }],
      suggestedLeadPartner: "Priya (enterprise)", ownershipTarget: "held 9%", scoredAt: new Date().toISOString(),
    },
    diligence: {
      redFlags: [{ severity: "medium", item: "Enterprise GTM gap", detail: "No sales leader yet" }],
      keyRisks: [{ category: "competitive", risk: "Glean down-market + Copilot", mitigation: "Self-host + OSS + price" }, { category: "execution", risk: "Enterprise motion", mitigation: "Hire VP Sales (board priority)" }],
      openQuestions: ["Enterprise sales hire timeline?", "Self-host deal economics?"],
      checklist: [{ area: "Quarterly board review", status: "in_progress" }, { area: "VP Sales search", status: "in_progress" }],
      referencesToCheck: ["2 enterprise customers"],
    },
    signals: [
      { type: "hiring", date: "2026-05", headline: "Opened VP of Enterprise Sales role", detail: "Addresses the key GTM gap", sentiment: "positive" },
      { type: "launch", date: "2026-04", headline: "Shipped SOC 2 Type II", detail: "Unblocks enterprise deals", sentiment: "positive" },
      { type: "news", date: "2026-03", headline: "Glean announced down-market tier", detail: "Competitive pressure to monitor", sentiment: "negative" },
    ],
    digital: [{ platform: "GitHub", handle: "onyx-dot-app/onyx", metric: "11k+ stars", note: "strong" }],
    network: { referredBy: "Inbound (now portfolio)", relationshipToFund: "Portfolio company (seed)", partnerNotes: "Board seat held by Priya; quarterly reviews." },
    recognition: [{ year: "2024", title: "YC W24", source: "SRC-YC" }],
    alerts: [
      { hook: "Watch Glean down-market", detail: "Glean's new tier targets Onyx's mid-market base — get a competitive read from 2 customers.", severity: "watch" },
      { hook: "Back the VP Sales hire", detail: "Enterprise GTM is the single biggest value lever; offer the network.", severity: "info" },
    ],
    timeline: [{ date: "2024", title: "YC W24 (Danswer)", sources: ["SRC-YC"] }, { date: "2024", title: "Rebrand to Onyx + our seed investment" }, { date: "2026", title: "SOC 2 + VP Sales search" }],
    sources: [
      { id: "SRC-SITE", title: "onyx.app", tier: "public", contribution: "Product, connectors" },
      { id: "SRC-GH", title: "GitHub — onyx-dot-app/onyx", url: "https://github.com/onyx-dot-app/onyx", tier: "public", contribution: "Traction" },
      { id: "SRC-YC", title: "YC — Danswer/Onyx (W24)", tier: "database", contribution: "Team, batch" },
      SRC_NOTE,
    ],
  },
  memo: { status: "published", md: icMemo("Onyx", "open-source enterprise AI search (YC W24)", "$1.8M ARR (est.), 18% MoM, 11k+ GitHub stars, 40+ connectors", "Glean's brand/funding and enterprise GTM execution", "INVESTED at seed (~9% ownership). Thesis: self-host + OSS wins security-sensitive enterprise.") },
  portfolioSignals: [
    { type: "hiring", severity: "watch", payload: { headline: "Opened VP Enterprise Sales", summary: "Key GTM gap being addressed", url: "https://onyx.app/careers" } },
    { type: "compliance", severity: "info", payload: { headline: "SOC 2 Type II achieved", summary: "Unblocks enterprise procurement" } },
    { type: "competition", severity: "alert", payload: { headline: "Glean launched down-market tier", summary: "Direct pressure on Onyx mid-market base — monitor churn" } },
  ],
};

const reworkd = {
  name: "Reworkd",
  domain: "reworkd.ai",
  oneLiner: "AI agents that extract structured data from any website at scale",
  source: "scout",
  stage: "IC",
  fitScore: 64,
  dossier: {
    version: 2, enrichedAt: new Date().toISOString(), model: "claude-sonnet-4-6", sourceCount: 7, completeness: 72,
    header: {
      monogram: "RW", positioning: "Self-healing web-extraction agents — AgentGPT team going after structured data at scale",
      tagline: "AI agents for web data extraction", founded: "2023", hq: "San Francisco", stage: "Seed", category: "AI / data extraction",
      tags: [{ label: "YC S23", accent: true }, { label: "Ex-AgentGPT (180k+ stars)" }, { label: "Scout-sourced" }],
      quickStats: { website: "reworkd.ai", location: "San Francisco", employees: "~8", fundingStage: "Seed", raising: "$4M", askValuation: "$30M cap" },
    },
    metrics: [
      { label: "ARR", value: "$0.6M", subtitle: "est., early", trend: "up" }, { label: "Growth", value: "15%", unit: "MoM", trend: "up" },
      { label: "AgentGPT", value: "180k+", unit: "stars", subtitle: "prior project" }, { label: "Runway", value: "13", unit: "mo" },
      { label: "Gross margin", value: "55%", subtitle: "agent-compute heavy" },
    ],
    snapshot: {
      thesis: "The AgentGPT team has elite distribution instincts and a real wedge in self-healing extraction, but the structured-web-data space overlaps Firecrawl and the moat-vs-LLM-commoditization question is live. Early revenue; the bet is on the team and a sharper ICP.",
      whatTheyDo: "AI agents that generate and self-heal web scrapers to extract structured data at scale, sold as an API/platform to data teams.",
      whyNow: "LLMs make scraper generation cheap; the pain is maintenance/scale, which agents can automate.",
      recommendation: "Diligence the wedge vs Firecrawl and ICP focus; conviction medium. A team-driven bet.",
      conviction: "medium",
    },
    product: {
      summary: "Agentic extraction: point at sites, get maintained structured feeds.",
      problem: "Scrapers break constantly; maintaining extraction at scale is painful.",
      solution: "Agents that write and self-repair extractors, returning structured data with monitoring.",
      moat: "Self-healing reliability + the team's distribution; thin today.",
      differentiators: ["Self-healing extractors", "Agentic generation", "AgentGPT brand/community"],
      techStack: ["TypeScript", "Python", "headless browsers"], maturity: "Early GA",
    },
    market: {
      summary: "Structured web-data extraction overlaps the web-data infra space.", tam: "$6B (web data/ETL)", sam: "$1B", growthRate: "high",
      whyNow: "Agents can automate scraper maintenance.", icp: "Data teams needing maintained structured feeds (still narrowing)",
      tailwinds: ["Agent tooling maturity"], headwinds: ["Overlaps Firecrawl/Apify", "Scraping legality", "Differentiation unclear"],
    },
    competition: {
      positioning: "Agentic/self-healing vs API-first scraping (Firecrawl) and marketplaces (Apify).",
      direct: [{ name: "Firecrawl", funding: "seed", vsThem: "Firecrawl owns LLM-ready scraping mindshare; Reworkd bets on structured extraction + self-healing" }, { name: "Apify", vsThem: "Marketplace breadth" }],
      substitutes: ["DIY", "Firecrawl extract"], barriersToEntry: ["Reliability at scale", "Brand/community"],
    },
    traction: {
      summary: "Early revenue; strong prior-project distribution but unproven conversion.",
      revenue: { arr: "$0.6M (est.)" }, growth: { mom: "15% (est.)" },
      customers: { count: "early paid (est.)", concentration: "High — few early contracts (risk)" },
      unitEconomics: { grossMargin: "55% (est.)", burnMultiple: "~2.0x (est.)" }, burn: { monthly: "$120k (est.)", runwayMonths: "13 (est.)" },
      milestones: [{ date: "2023", event: "AgentGPT viral (180k+ stars)" }, { date: "2023", event: "YC S23" }, { date: "2024", event: "Pivot to structured extraction" }],
    },
    team: {
      summary: "Elite distribution instincts (AgentGPT) seeking a durable commercial wedge.", size: "~8", founderMarketFit: "Built one of the most-starred agent projects ever; deep agent expertise.",
      founders: [
        { name: "Asim Shrestha", role: "CEO", positioning: "Built AgentGPT (180k+ stars)", background: "Co-founder of Reworkd / AgentGPT (YC S23).", domainExpertise: "AI agents, distribution", founderMarketFit: "Strong on agents; commercial focus maturing", linkedin: "https://linkedin.com/in/asim-shrestha", notable: ["AgentGPT — one of the most-starred AI repos"], redFlags: ["Wedge/ICP still narrowing"] },
      ],
      gaps: ["Sharper ICP", "Enterprise reliability proof"],
    },
    round: {
      raising: "$4M", instrument: "SAFE (est.)", valuation: "$30M cap (est.)", useOfFunds: "Reliability, ICP focus, GTM",
      runwayPostRaise: "20mo", leadStatus: "Open", existingInvestors: ["YC", "AI angels"], priorRounds: [{ date: "2023", stage: "YC S23 + pre-seed", amount: "~$1.3M", leadInvestors: ["Y Combinator"] }],
    },
    fit: {
      score: 64, dimensionScores: { team: 82, market: 60, product: 58 },
      fits: ["Exceptional team with proven viral distribution", "Self-healing extraction is a real pain point", "Deep agent expertise"],
      risks: ["Overlaps Firecrawl's mindshare", "Thin moat / commoditization", "ICP still unfocused; high customer concentration"],
      failedMustHaves: [], matchedDealBreakers: [], conviction: "medium",
      comps: [{ company: "Firecrawl", outcome: "rising", relevance: "adjacent/competing wedge" }, { company: "Diffbot", outcome: "profitable", relevance: "structured web data" }],
      returnScenarios: [{ scenario: "Bull", multiple: "12x", rationale: "Team finds a durable wedge + brand converts" }, { scenario: "Base", multiple: "2x", rationale: "Acqui-hire by a data/infra player" }, { scenario: "Bear", multiple: "0x", rationale: "Out-competed by Firecrawl" }],
      suggestedLeadPartner: "Alex (infra)", ownershipTarget: "8%", scoredAt: new Date().toISOString(),
    },
    diligence: {
      redFlags: [{ severity: "high", item: "Differentiation vs Firecrawl", detail: "Overlapping space; wedge must be crisp" }, { severity: "medium", item: "Customer concentration", detail: "Few early contracts" }],
      keyRisks: [{ category: "market", risk: "Firecrawl overlap + commoditization", mitigation: "Own structured/self-healing niche" }, { category: "product", risk: "Reliability at scale", mitigation: "Prove SLAs with reference customers" }],
      openQuestions: ["What is the defensible wedge vs Firecrawl?", "ICP and repeatable use case?", "Reliability metrics?"],
      checklist: [{ area: "Competitive teardown vs Firecrawl", status: "todo" }, { area: "Customer reference calls", status: "todo" }, { area: "Reliability/SLA proof", status: "todo" }],
      referencesToCheck: ["2 early customers", "YC partner"],
    },
    signals: [{ type: "sentiment", date: "2025", headline: "AgentGPT community still large but engagement cooling", sentiment: "neutral" }],
    digital: [{ platform: "GitHub", handle: "reworkd/AgentGPT", metric: "180k+ stars", note: "prior project; halo effect" }],
    network: { warmIntroPaths: ["Scout-sourced via GitHub trending"], referredBy: "vc-scout (GitHub trending)", relationshipToFund: "First contact (scouted)" },
    alerts: [
      { hook: "Team is the bet, wedge is the risk", detail: "Underwrite the founders; make the Firecrawl-differentiation answer the gating question.", severity: "watch" },
      { hook: "Scout-sourced — move deliberately", detail: "Cold inbound from scout; do the competitive teardown before investing partner time.", severity: "info" },
    ],
    sources: [
      { id: "SRC-SITE", title: "reworkd.ai", tier: "public", contribution: "Product" },
      { id: "SRC-GH", title: "GitHub — reworkd/AgentGPT", url: "https://github.com/reworkd/AgentGPT", tier: "public", contribution: "Distribution/brand" },
      { id: "SRC-YC", title: "YC — Reworkd (S23)", tier: "database", contribution: "Team, batch" },
      SRC_NOTE,
    ],
  },
  memo: { status: "draft", md: icMemo("Reworkd", "agentic web-data extraction from the AgentGPT team (YC S23)", "$0.6M ARR (est.), early; AgentGPT had 180k+ stars", "Differentiation vs Firecrawl and a still-unfocused ICP", "Team-driven bet, conviction medium — gate on the competitive wedge.") },
};

function icMemo(name, what, traction, biggestRisk, rec) {
  return `# IC Memo — ${name}

## Summary
${name} is ${what}. **Traction:** ${traction}. This memo is drafted by vc-memo-writer from the living dossier and thesis-fit verdict; figures marked (est.) are analyst estimates pending diligence.

## Team
See the founder deep-dive in the dossier. Founder-market fit is the core of the early-stage case.

## Market & why now
Covered in the dossier (TAM/SAM, tailwinds/headwinds). The "why now" is AI adoption pulling this category into every stack.

## Product & moat
Differentiators and defensibility are detailed in the dossier; the moat thesis is the swing factor for the multiple.

## Traction
${traction} [Pitch deck + dossier].

## The round
Terms and cap table in the dossier's "round" section.

## Thesis fit
See the scored fits/risks and dimension subscores. Conviction and return scenarios are in the dossier's "fit" block.

## Risks / diligence
**Biggest risk:** ${biggestRisk}. Full red-flag list, key risks by category, and the diligence checklist are in the dossier's "diligence" plan.

## Recommendation
${rec}
`;
}

// ── Run ─────────────────────────────────────────────────────────────────

const STARTUPS = [firecrawl, helicone, onyx, reworkd];

async function main() {
  console.log("▸ wiping existing VCBrain data for tenant", TENANT);
  for (const t of ["vc__startup_files", "vc__portfolio_signals", "vc__memos", "vc__startups"]) {
    await sql.unsafe(`DELETE FROM ${t} WHERE tenant_id = $1`, [TENANT]);
  }

  for (const c of STARTUPS) {
    const id = randomUUID();
    await sql`
      INSERT INTO vc__startups (id, tenant_id, name, domain, one_liner, source_channel, stage, fit_score, dossier, thesis_snapshot, created_at, updated_at)
      VALUES (${id}, ${TENANT}, ${c.name}, ${c.domain}, ${c.oneLiner}, ${c.source}, ${c.stage}, ${c.fitScore},
              ${sql.json(c.dossier)}, ${sql.json(THESIS)}, now(), now())
    `;
    if (c.memo) {
      await sql`
        INSERT INTO vc__memos (id, tenant_id, startup_id, draft_md, cited_sources, status, created_at, updated_at)
        VALUES (${randomUUID()}, ${TENANT}, ${id}, ${c.memo.md}, ${sql.json([{ label: "Living dossier", ref: "dossier" }])}, ${c.memo.status}, now(), now())
      `;
    }
    for (const s of c.portfolioSignals ?? []) {
      await sql`
        INSERT INTO vc__portfolio_signals (id, tenant_id, startup_id, signal_type, payload, severity, created_at)
        VALUES (${randomUUID()}, ${TENANT}, ${id}, ${s.type}, ${sql.json(s.payload)}, ${s.severity}, now())
      `;
    }
    console.log(`  ✓ ${c.name} — ${c.stage} · fit ${c.fitScore} · memo ${c.memo?.status}${c.portfolioSignals ? ` · ${c.portfolioSignals.length} signals` : ""}`);
  }

  const upd = await sql`
    UPDATE agents SET model = 'claude-sonnet-4-6'
    WHERE tenant_id = ${TENANT} AND source_app_id = 'vcbrain'
  `;
  console.log(`▸ set ${upd.count} VCBrain agents to claude-sonnet-4-6`);

  const rows = await sql`SELECT stage, count(*)::int AS n FROM vc__startups WHERE tenant_id = ${TENANT} GROUP BY stage ORDER BY stage`;
  console.log("▸ pipeline:", rows.map((r) => `${r.stage}:${r.n}`).join("  "));
  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

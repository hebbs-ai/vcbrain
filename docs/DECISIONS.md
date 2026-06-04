# VCBrain — Decision Log

Running log of build decisions. Newest at the bottom of each phase.

## Pre-build (locked with user)

- **D1 — Standalone module.** Own `vc__*` tables, mirrors `../boringos-crm` monorepo (`packages/{server,web,shared}`). No dependency on the CRM module.
- **D2 — Full proposal scope** (issue #30), delivered in phases 0–7.
- **D3 — Thesis = config + scoring.** Thesis Studio config AND the `vc-thesis-fit` scoring agent.
- **D4 — Attachments:** upstream `getAttachment`/`listAttachments` into framework `@boringos/connector-google` (the canonical deliverable). **But** the module fetches attachment bytes via the already-published `fetchWithAuth` helper + a small local parts-walker, so it builds against published types today and does not block on a connector-google npm release. Switch to the typed method once connector-google publishes.
- **D5 — Dossier shape:** CRM's company + contact dossier structure (founder deep-dive) PLUS VC-specific fields (thesis fit, traction, round). Per user edit to PLAN.md.
- **D6 — PPTX decks:** scan PDFs natively (agent Read tool). Implement PPTX conversion only if the agent CLI can already handle it; otherwise skip conversion and note unsupported. Per user edit to PLAN.md.

## Phase 0 — Scaffold + framework helper ✅

- Monorepo scaffolded (`packages/{server,shared}`; web deferred to Phase 6), pinned to published `@boringos/*` (agent 0.3.1, module-sdk 0.13.0, connector-google 0.2.12, core 0.4.0, db 0.2.0). `pnpm install` clean (only connector-google peer warnings — benign).
- **D7 — module.json `ui` block deferred to Phase 6.** `pack-hebbsmod` requires `ui.sourcePath` to exist; the web package isn't built yet. Removed `ui` from module.json (re-added Phase 6). Manifest test relaxed accordingly.
- **Live-test path proven:** `<framework>/node_modules/.bin/pack-hebbsmod --pkg packages/server` → upload to `:3030/api/admin/modules/upload` (no auth in dev) → install with `x-tenant-id` header. Host API is `:3030`, shell `:5174`, embedded PG `postgres://boringos:boringos@127.0.0.1:5436/boringos`. Tenant ids live in `tenants` table.

## Phase 1 — Schema + core CRUD tools ✅

- 5 `vc__*` tables (startups, theses, memos, portfolio_signals, startup_files) with dedup indexes: `startups(tenant,lower(domain))` unique-partial, `theses(tenant) WHERE is_active` unique-partial, `startup_files(tenant,startup,msg,filename)` unique-partial.
- **D8 — VC pipeline stages are a `stage` text column + shared constant**, not a separate pipelines/stages table like CRM. A fund runs one canonical venture pipeline; the kanban reads `DEFAULT_VC_STAGES`. Simpler, no pipeline CRUD.
- Tools: `startups.{upsert,list,get,update}`, `theses.{list,create,update,activate,backtest}`, `memos.{draft,publish,list,get}`, `portfolio.{record_signal,list_signals}` (15 total). `upsert` is the single intake funnel; dedup by resolved company domain (consumer-mail senders never become a company domain).
- **Tested:** 12 tests green — pure domain-util + manifest, plus DB-backed integration (dedup, stage-change event, one-active-thesis, memo in-place update, portfolio signal) against the live embedded PG. Module installs live: tables + active starter thesis confirmed.

## Phase 2 — Email intake + attachments→drive ✅

- **D4 delivered upstream:** added `getAttachment(messageId, attachmentId)` + `listAttachments(message)` + `MessagePart`/`GmailAttachment` types to framework `@boringos/connector-google` (bumped 0.2.12→0.2.13), with 2 new unit tests (28 connector tests green). The module, pinned to published 0.2.12, fetches bytes via the published `fetchWithAuth` + a local parts-walker (`google-client.ts`) — builds today, switch to typed methods after a connector-google publish.
- Tools: `inbox.ingest` (reads a framework `inbox_items` row by id, or explicit fields → dedup'd `upsertStartup`), `files.ingest` (Gmail attachments OR injected base64 → drive `vcbrain/startups/<id>/<file>` → `vc__startup_files`, ON CONFLICT DO NOTHING), `files.list`. Extracted shared `upsertStartup` so intake funnels through one path.
- **D9 — drive write is server-side (GAP B):** `files.ingest` runs in the tool (host injects `DriveManager` via `factoryDeps.drive`); agents never write drive directly. PDF classified as a deck (a PDF emailed to a VC ≈ a deck).
- Lifecycle seeds the **"Ingest startup leads from inbox"** workflow (`inbox.item_created` → `vcbrain.inbox.ingest`), with scrub-then-seed idempotency + uninstall cleanup.
- **D10 — per-phase version bump + force redeploy.** Host rejects duplicate module ids in-process; `scripts/redeploy.sh` uninstalls, force-uploads (`?force=true` → `unregisterModule`), reinstalls. Bumped to 0.2.0.
- **Tested:** 19 unit/integration tests green (email-util + DB-backed inbox.ingest dedup + files.ingest drive-write/dedup/soft-skip). Live: 18 tools registered, ingest workflow active, 5 tables + thesis.

## Phase 3 — Living dossier + deck scan ✅

- **D11 — agent role = `AgentSeed.persona`.** A module seeds an agent with `persona: "vc-research"`, which becomes the agent's `role`; the shipped `SKILL.md` (`roles: [vc-research]`) supplies behavior. No framework persona bundle needed (CRM proves this). Verified the framework personas dir does NOT contain CRM's roles.
- **D12 — deck reading mechanism.** Decks live in drive at `drivePath`. `files.get` returns text content for `.txt/.md/...`; for PDF/PPTX the SKILL directs the agent to the framework `drive.read` tool or its native file-Read on `drivePath` (Claude Code reads PDFs natively). PPTX only if the CLI supports it, else flagged `unsupported` (D6). Agent-runtime behavior — wiring/tools are unit-tested; live PDF parse validated at agent runtime.
- **D13 — living dossier via `startups.patch_dossier`** (deep-merge, version++ , enrichedAt). Re-runs accrete findings instead of replacing. `files.mark_parsed` prevents re-scanning.
- vc-research seeded as an agent + `Enrich new startup` workflow (`entity.created`/`vcbrain_startup` → `framework.tasks.create` auto-wakes the assignee). FK-safe uninstall cascade added.
- **Tested:** 23 tests (merge unit + DB-backed dossier merge/version + files.get/mark_parsed). Live: 21 tools, 1 skill, agent `VC Research`, 2 workflows.

## Phase 4 — Thesis engine (scoring) ✅

- `startups.score` tool: atomic write of fitScore + **thesis snapshot** (the active thesis config, for reproducible scores even after the thesis changes) + `dossier.fit` (verdict mirrored for the UI card). Emits `startup.scored`.
- **D14 — research→screening→scoring chain.** vc-research advances Sourced→Screening after writing the dossier; the `Score startup on screening` workflow (`startup.stage_changed` guard `stage==Screening`) wakes vc-thesis-fit. Event-driven, no polling.
- vc-thesis-fit SKILL scores against the **active** thesis only (must-haves/deal-breakers/weights), 3 fits + 3 risks in thesis language.
- **Tested:** 24 tests (DB-backed score → fitScore + snapshot + dossier.fit + earlier-dossier preserved). Live: 22 tools, 2 skills, agents `VC Research` + `VC Thesis Fit`, 3 workflows.

## Phase 5 — Pipeline automation + remaining channels ✅

- Three more agents: `vc-memo-writer` (IC-stage → cited memo via `memos.draft`), `vc-portfolio-monitor` (daily cron → `portfolio.record_signal` on Closed/Portfolio cos), `vc-scout` (daily cron → thesis-relevant `startups.upsert`). All 5 agents now seeded.
- Workflow `Draft IC memo` (`startup.stage_changed` guard `stage==IC`). Two cron routines (Portfolio 6am, Scout 8am). `scrubRoutines` added for idempotent reinstall.
- **D15 — public form via module webhook.** `webhooks: [{ event: "inbound" }]` mounts at `/api/webhooks/vcbrain/inbound`. Tenant + auth come from a signed per-fund token (`base64url(tenantId).hmac`, `signFormToken`/`verifyFormToken`, HMAC-SHA256, timing-safe) — no session needed; the fund embeds the token in its widget. Resolves tenant from the token, not `ctx`.
- All 4 intake channels now converge on `upsertStartup`: email ✓, form ✓(live), copilot (tool), scout (agent).
- **Tested:** 27 tests (token sign/verify + DB-backed form upsert/dedup). **Live:** 5 agents, 4 workflows, 2 routines, 5 skills; real `POST /api/webhooks/vcbrain/inbound?t=…` created a `source=form` startup on the host.

## Phase 6 — UI (PluginUI) ✅

- **D16 — UI reads data via `useTool`, no custom routes.** `/api/tools/vcbrain.*` accepts a **session bearer** (not just agent JWT), resolving tenant from the session. So the `@boringos/ui` `useTool`/`useToolMutation` hooks call the same tools the agents use — a pure `.hebbsmod` needs no `app.route`. Re-typed the hook results (published `useTool` types loosely).
- `packages/web` — Vite lib build → `dist/index.mjs` (24 KB) + `index.css`, React/Router/QueryClient/@boringos/ui external. Theme-aware via the `--bos-*` contract (inline styles).
- Pages: **Pipeline** (kanban by `DEFAULT_VC_STAGES`, fit-score pill, stage move), **Dossier** (CRM-style founder + company deep-dive + fit/risk narrative + files + memos + signals — per user's D5 edit), **Thesis Studio** (weight sliders, must-have/deal-breaker editor, back-test). Two dashboard widgets (scored pipeline, fresh briefs). Detail route `hidden: true`.
- **D17 — no `frontend-design` skill.** Built functional, theme-matched components inside the shell chrome directly; the heavy 21-step design pipeline would derail the build loop and the shell owns the chrome.
- **Verified live:** `module.json` `ui` restored; `.hebbsmod` packs `ui: copied 2 files`; shell serves `/modules/vcbrain/ui/index.mjs` (200, correct externals) + `index.css`; bundle exports the `vcbrainUI` PluginUI (navItems `/vcbrain/pipeline`+`/vcbrain/thesis`, dashboardWidgets); installed for tenant; demo data seeded (Nimbus 81 / Quanta 74 / Loopline) so the screens render.

## Phase 7 — Package + install ✅

- Clean monorepo: `pnpm -r typecheck` + `pnpm -r build` green; **27 tests pass** (DB-backed against the live embedded PG). Framework `connector-google` change: **28 tests pass**.
- Final `.hebbsmod`: `vcbrain@0.6.0`, 41.6 KB, sha256 `65babc9e…`, `ui: copied 2 files`.
- **D18 — signing deferred to production.** Dev host runs `HEBBS_DEV_MODULES=true` (unsigned accepted). For prod: `npx sign-hebbsmod --pkg dist/vcbrain-0.6.0.hebbsmod --key $KEY --publisher-id hebbs` after trusting the publisher key. Not required on this host.
- **End-to-end host smoke (tenant Hebbs):** module v0.6.0, 22 tools, 5 skills, 5 agents (research/thesis-fit/memo-writer/portfolio-monitor/scout), 4 workflows, 2 cron routines, 5 `vc__` tables, UI bundle 200. Live webhook intake proven in Phase 5.

## Post-build fixes

- **D19 — plugin pages must own their scroll (0.6.1).** The shell mounts plugin `navItem` elements directly into its `flex flex-col overflow-hidden` `<main>` with no scroll wrapper (built-in screens get `_shared.tsx`'s `flex-1 overflow-auto`; plugins don't). Tall pages (Dossier) were clipped. Fix: shared `pageStyle` (`flex:1 1 auto; min-height:0; overflow-y:auto`) on every page root.
- **D20 — redeploy is non-destructive by default.** `uninstall` runs `Migration.down()` and DROPS the `vc__` tables — it was wiping tenant data on every dev redeploy. `scripts/redeploy.sh` now force-uploads + idempotent-installs only (data preserved); `--fresh` opts into the destructive path.

## Dossier v2 — analyst-grade depth (0.7.0)

- **D21 — the dossier is the product; made it decision-grade.** Old schema was ~6 thin blocks. New `StartupDossier` matches/exceeds CRM's contact+company depth, tuned for VC: `header` (monogram/positioning/tagline/tags/quickStats), `metrics[]` cards, `snapshot` (thesis/why-now/recommendation/conviction), `product` (moat/IP/stack/integrations), `market` (TAM/SAM/SOM/why-now/tailwinds-headwinds/regulatory), `competition` (direct w/ funding + barriers), `traction` (revenue/growth/retention/engagement + full **unit economics** + burn/runway/milestones), `team` (deep `FounderProfile` per founder — prior companies w/ outcomes, founder-market-fit, reputation, quotes, red flags + key hires/gaps), `round` (instrument/valuation/use-of-funds/prior rounds/cap-table/investors), `fit` (now + conviction/comps/return-scenarios/ownership), `diligence` (red flags w/ severity, key risks by category w/ mitigation, open questions, checklist, references), `signals[]`, `digital[]`, `network` (warm-intro paths), `recognition[]`, `timeline[]`, tiered `sources[]`. Every fact carries a `source` + `confidence` tier.
- **vc-research rewritten as a world-class analyst:** deck cover-to-cover → systematic web research section-by-section (Crunchbase/LinkedIn/GitHub/news/reviews), triangulate + reconcile conflicts, sanity-check founder numbers (bottoms-up TAM, ARR quality, concentration), and **form a view** (snapshot thesis + conviction + diligence plan). Do-or-die quality rules: source everything, never fabricate, no padding, deal-specific alerts.
- **vc-thesis-fit + `startups.score`** extended with conviction, comps, return scenarios, ownership target.
- **Dossier UI fully rebuilt** (24→48 KB): header card + metric tiles + snapshot, thesis-fit with dimension bars/comps/scenarios, founder deep-dive cards, two-column product/market/competition/traction(+unit-economics)/round, diligence plan, signals/digital/network/recognition/timeline, tiered source list.
- **Tested:** 27 tests green; build clean. Live: bundle serves all new sections; demo `Nimbus` dossier seeded to full depth (7 sources) to showcase.

## Demo data + agent model + widgets (0.8.0)

- **D22 — VCBrain agents default to Sonnet.** `agents.model` set to `claude-sonnet-4-6` for all 5 VCBrain agents (live + persisted via `setAgentModels` in lifecycle onInstall, since `AgentSeed` has no model field). Framework `email-lens`/triage agents untouched. Overridable per-agent in the UI.
- **D23 — dashboard widgets render their own chrome.** The shell renders widget elements raw (it only uses `title` for the loading skeleton, never shows it). Rebuilt both widgets with a `WidgetShell` (title + one-line description + card + good empty states).
- **D24 — demo seed (`scripts/seed-demo.mjs`).** Wipes the tenant's VCBrain data and loads 4 real recent YC-era AI companies as fully worked examples covering every agent + stage: **Firecrawl** (IC, 87, memo), **Helicone** (IC, 79, memo), **Onyx** (Portfolio/invested, 74, published memo, 3 portfolio signals), **Reworkd** (scout-sourced, IC, 64, memo). Company descriptions reflect public positioning; **financials are analyst estimates tagged `inferred`** for the demo. Exercises vc-research (dossiers), vc-thesis-fit (scores + conviction/comps/scenarios), vc-memo-writer (4 IC memos), vc-portfolio-monitor (Onyx signals), vc-scout (Reworkd source channel). Re-runnable.

## Build complete ✅ (2026-06-03)

All 8 phases (0–7) delivered and tested. Full proposal #30 implemented: 4 intake channels → research → thesis-aware scoring → IC memo → portfolio watch, with the Thesis Studio + Pipeline + Dossier UI. One framework deliverable upstreamed (`connector-google` attachment helpers). Redeploy loop: `scripts/redeploy.sh`.

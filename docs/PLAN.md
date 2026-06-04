# boringos-vcbrain-module — Build Plan

> **VCBrain** — an end-to-end venture-capital operating layer, built as a standalone
> BoringOS module (own `vc__*` tables) installed into a running host via the
> `.hebbsmod` pipeline. Mirrors `../boringos-crm` patterns; consumes published
> `@boringos/*` packages. Source proposal: hebbs-ai/boringos#30.

**Status:** ✅ **Built & tested** (all phases 0–7, 2026-06-03). Decision log + per-phase results in [`DECISIONS.md`](DECISIONS.md). Module runs live on the local host as `vcbrain@0.6.0`.

## Decisions (locked 2026-06-03)

- **Scope:** full proposal (#30) — all 5 agents, 4 intake channels, thesis engine, memo writer, portfolio monitor, back-testing.
- **Thesis:** config **and** automated scoring (`vc-thesis-fit`) in scope — the differentiator.
- **Attachments:** the Gmail attachment-download helper is **upstreamed into `@boringos/connector-google`** (framework PR), not a module-local hack. v1 couples to that framework release.
- **Architecture:** standalone module, own `vc__*` schema, copies CRM code patterns (no dependency on the CRM module).

---

## The product (from #30)

A lean team VC partner runs a fund of dozens of startups if the OS: (1) catches every  
signal from every channel, (2) researches each lead against the fund's **actual**  
**thesis**, (3) drafts the IC memo to edit-and-decide, (4) watches the portfolio
without manual check-ins.

**Three views:** (1) unified intake (4 channels → one `startups.upsert`),
(2) automated pipeline (Sourced → Screening → DD → IC → Closed → Portfolio, one
trigger + one agent per phase), (3) thesis engine (Thesis Studio config → fit agent
scores 0–100 with fit/risk narrative + suggested lead partner → scored pipeline cards).

---

## What we reuse vs. build

### Reuse from framework / CRM patterns (do NOT rebuild)

- Auth, tasks, agents, runtimes, workflows, inbox, memory, entity refs, realtime,
activity log, search, budgets, copilot — all framework-provided.
- **Email → lead** = CRM's 3-phase flow (`lead-ingestion.ts`, `inbox-resolve.ts`):
prefilter automated mail → resolve/dedup → ICP/thesis classify → materialize,
emit `entity.created`. Dedup keyed on **company domain** (founder email is often
gmail.com → derive domain from the pitch, not just the sender).
- **Living dossier** = CRM enrichment pattern: agent stamps a structured blob via
`startups.update({ dossier_json })`; re-run on each new email/deck = "living."

### Net-new (the two real gaps + the VC domain)

- **GAP A — Gmail attachment bytes.** `connector-google` exposes `payload.parts`
but no download. → **Framework PR**: add `getAttachment(messageId, attachmentId)`
  - a `listAttachments(message)` helper to the Gmail service. (Phase 0.)
- **GAP B — Drive write.** `DriveManager.write()` is server-side only (no
agent-callable tool). → Module does **attachment→drive server-side** in the ingest
path, stores the drive ref on the row, then wakes `vc-research` to read the file.
- VC domain: `vc__*` schema, tools, 5 agents, Thesis Studio UI, pipeline UI.

### Open implementation question

- **Deck format:** PDF decks are read natively by the Claude Code agent (Read tool).
**PPTX needs a conversion step** — implement if claude code or cli has capability otherwise skip the conversion.

---

## Schema — `vc__*` (one migration, per-tenant)

- `vc__startups` — id, tenantId, name, domain, source_channel, stage, fit_score,
dossier_json, thesis_snapshot_json, owner_partner_id, created/updated_at.
- `vc__theses` — id, tenantId, name, must_haves_json, deal_breakers_json,
weights_json, is_active, owner_id.
- `vc__memos` — id, startup_id, draft_md, cited_sources_json, status, edited_by.
- `vc__portfolio_signals` — id, startup_id, signal_type, payload_json, severity, created_at.
- `vc__startup_files` — id, startup_id, drive_path, kind (deck/doc), source_message_id,
parsed_at. (Tracks attachments stored in drive + parse state.)

## Tools — `vcbrain.<group>.<verb>`

- **startups:** `upsert`, `list`, `get`, `update`
- **theses:** `list`, `create`, `update`, `activate`, `backtest`
- **memos:** `draft`, `publish`
- **portfolio:** `record_signal`, `list_signals`
- **intake (server-side):** `inbox.ingest` / `inbox.sync` (mirror CRM), `files.ingest`
(fetch Gmail attachment → drive → `vc__startup_files`)

## Agents (persona + SKILL.md each)

- `vc-research` — one-shot dossier builder on new lead; reads deck from drive, extracts brief.
- `vc-thesis-fit` — pulls active thesis, emits 0–100 score + 3 fits / 3 risks + suggested lead partner; snapshots thesis.
- `vc-memo-writer` — cited IC memo, triggered on stage → IC.
- `vc-portfolio-monitor` — cron-woken; LinkedIn / news / Crunchbase / GitHub signals for portfolio cos.
- `vc-scout` — cron-woken; YC batches / ProductHunt / GitHub trending → cold inbound leads.

## Intake channels (4 → one `startups.upsert`)

1. **Inbound email** — Gmail forward-sync → framework inbox → `triage` (VC skill) → `inbox.ingest` → upsert + `files.ingest` for attachments.
2. **Public form** — `POST /api/vcbrain/inbound`, signed per-fund token → partner task + founder ack email.
3. **Copilot** — partner calls `startups.upsert` in chat → tracking subscription / digest.
4. **Scout** — cron routine wakes `vc-scout`.

## UI — `PluginUI` bundle (packages/web)

- **Thesis Studio** `/vcbrain/thesis` — must-have/deal-breaker toggles, weight sliders, back-test panel.
- **Pipeline** `/vcbrain/pipeline` — kanban by stage, fit score on each card.
- **Dossier** `/vcbrain/startups/:id` — living brief + founders deep dive like in CRM dossier + fit/risk narrative + memo/reject actions. Basically company+contact dossier of boringos-crm + VC related stuff. 
- **Dashboard widgets** — scored pipeline, fresh-brief feed. Theme contract (`--bos-*`) honored.

## Workflows / routines (lifecycle.onInstall seeds)

- Inbound triage → ingest workflow.
- Dossier enrichment on `entity.created`.
- Thesis-fit scoring on dossier-ready / stage change.
- Memo draft on stage → IC.
- Dossier refresh cron (living dossier).
- Portfolio monitor cron; Scout cron.
- Seed: default pipeline stages, a starter (empty) thesis, the 5 agents, the routines.

---

## Phases

- **Phase 0 — Scaffold + framework PR.** Monorepo (`packages/{server,web,shared}`),
`module.json`, tsconfig from CRM, MIT SPDX headers; empty module installs into a host
(build + install test green). **Parallel:** upstream `connector-google` `getAttachment`/`listAttachments` PR (GAP A).
- **Phase 1 — Schema + core CRUD tools.** `vc__*` migration; `startups.*` + `theses.*`
tools; copilot can `upsert`. Dispatcher tests.
- **Phase 2 — Email intake + attachments→drive.** Gmail forward-sync; ingest path
(dedup by domain, map to existing startup if found); `files.ingest` fetches attachment
bytes (new helper) → drive `vcbrain/startups/<id>/decks/<file>` → `vc__startup_files`; wakes `vc-research`.
- **Phase 3 — Living dossier + deck scan.** `vc-research` SKILL.md reads deck from drive,
extracts structured brief → `startups.update(dossier_json)`; refresh routine. (Resolve PDF-vs-PPTX.)
- **Phase 4 — Thesis engine.** Thesis storage + `vc-thesis-fit` scoring agent; `thesis_snapshot`
on score; `theses.backtest` over last 60 days of submissions.
- **Phase 5 — Pipeline automation + remaining channels.** `vc-memo-writer` (stage → IC),
`vc-portfolio-monitor` cron, `vc-scout` cron, public-form webhook.
- **Phase 6 — UI.** `PluginUI`: Thesis Studio, Pipeline kanban, Dossier page, dashboard widgets, theme contract.
- **Phase 7 — Package + install.** `pack-hebbsmod`, sign, upload, per-tenant install, end-to-end smoke.

---

## Reference: module conventions (from `../boringos-crm`)

- **Monorepo:** `packages/server` (factory + tools + skills + migrations + lifecycle),
`packages/web` (`PluginUI` via `src/ui.ts`, Vite lib build, `index.mjs` stable name),
`packages/shared` (DTOs/constants).
- **Entry:** `packages/server/src/module.ts` exports `ModuleFactory` (`createVcbrainModule`),
registered via `app.module(...)`; casts `deps.db` to `PostgresJsDatabase`.
- `**module.json`** trimmed to pack-time fields (`id`, `version`, `entry`, `ui`,
`publisher`, `license`, `minFrameworkVersion`); everything else lives in the factory.
- **Schema prefix** `vc__`*; Drizzle migrations applied per-tenant on install.
- **Tools** Zod-typed, `{ ok, result }` / `{ ok:false, error }`, dispatched at `/api/tools/vcbrain.<name>`.
- **Skills** literal `SKILL.md` under `src/skills/`, copied to `dist/skills` in `postbuild`, referenced by path from the factory.
- **License** MIT (open source — fork/self-host/commercial); SPDX header per file.
- **Deps** `@boringos/{agent,module-sdk,core,db,shared}` + `connector-google` + `drizzle-orm` + `hono`.


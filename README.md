# VCBrain — the open-source AI analyst for venture capital

**Catch every deal. Research it against *your* thesis. Draft the IC memo. Watch the portfolio. Self-hosted, agent-native, MIT-licensed.**

VCBrain is an open-source AI deal team you run yourself. It catches startup
leads from every channel, turns each one into an **analyst-grade dossier**,
scores it against **your fund's actual thesis**, drafts the **IC memo**, and
keeps watch on your portfolio — so a lean team can run the dealflow of a much
bigger one without anything slipping through.

Built as a module on the [BoringOS](https://github.com/hebbs-ai/boringos)
agent framework. Your dealflow and data stay on **your** infrastructure.

> **Want this dialed in for your fund — your thesis, your sources, a managed
> deployment?** Talk to us at **[hebbs.ai](https://hebbs.ai)**.

---

## Why VCs run VCBrain

- **Nothing drops.** Inbound email, an embeddable submission form, your copilot
  chat, and an automated scout all funnel into one deduped pipeline.
- **Thesis-aware, not generic.** Most tools score startups on vanity signals.
  VCBrain scores against the thesis *you* configure — hard must-haves,
  deal-breakers, weighted dimensions — and shows its work.
- **Analyst-grade dossiers.** Reads the pitch deck, researches the founders,
  market, competition, traction (with unit economics) and the cap table, then
  writes a sourced brief with a diligence plan — every claim cited.
- **Open source + self-hostable.** No black box, no data leaving your stack.
  MIT-licensed: fork it, extend it, run it commercially.
- **Agent-native.** Real autonomous agents do the work on a schedule and on
  every new lead — not a chatbot you have to babysit.

## How it works

```
  Email   Public form   Copilot   Scout
     \________\___________/_______/
                  │  (deduped intake — one record per company)
                  ▼
          vc-research  ──►  living dossier (deck + deep web research)
                  │
                  ▼
        vc-thesis-fit  ──►  0–100 score vs your thesis, fits / risks / conviction
                  │
                  ▼
        vc-memo-writer ──►  cited IC memo, ready to edit & decide
                  │
                  ▼
  vc-portfolio-monitor  ──►  daily signals on invested companies
        vc-scout        ──►  daily thesis-fit cold leads (YC, Product Hunt, GitHub)
```

### The five agents

| Agent | What it does | Trigger |
|---|---|---|
| **vc-research** | Builds the living dossier — deck + web research, founders, market, competition, traction, cap table, diligence plan | New lead (any channel) |
| **vc-thesis-fit** | Scores 0–100 against your active thesis; fits, risks, conviction, comps, return scenarios | Lead reaches Screening |
| **vc-memo-writer** | Drafts a cited IC memo from the dossier + score | Lead reaches IC |
| **vc-portfolio-monitor** | Records news / hiring / runway / KPI signals on invested companies | Daily cron |
| **vc-scout** | Surfaces thesis-fit cold leads from public sources | Daily cron |

### The interface

- **Pipeline** — kanban by stage, fit score on every card.
- **Dossier** — the analyst brief: founder deep-dives, unit economics,
  competition, a diligence plan, live signals, the IC memo, and every source.
- **Thesis Studio** — define must-haves, deal-breakers and dimension weights;
  back-test against recent submissions.

## Install

VCBrain is a BoringOS module — install it into a running BoringOS host (no
separate server to operate).

```bash
pnpm install
pnpm build          # builds server + web (the PluginUI bundle)
pnpm test:run       # 27 tests
```

Then pack and upload the `.hebbsmod` to your host's **Apps** screen, or via the
admin API. See [`docs/PLAN.md`](docs/PLAN.md) for architecture and
[`docs/DECISIONS.md`](docs/DECISIONS.md) for the full build log.

Requires `@boringos/connector-google >= 0.2.13` on the host for Gmail
attachment download (pitch decks).

## Repo layout

```
packages/server   # the module: tools, 5 agents (SKILL.md), schema, lifecycle, webhook
packages/web      # PluginUI: Pipeline, Dossier, Thesis Studio, dashboard widgets
packages/shared   # shared DTOs + constants
docs/             # PLAN.md (architecture) + DECISIONS.md (build log)
```

## License

**MIT** — see [`LICENSE`](./LICENSE). Free to use, fork, self-host, and build on
commercially.

---

Built by **[Hebbs](https://hebbs.ai)**. We build agentic operating layers for
high-leverage teams. **Running a fund and want this tailored to your thesis and
sources? → [hebbs.ai](https://hebbs.ai)**

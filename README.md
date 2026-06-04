# BoringOS VCBrain

An end-to-end venture-capital operating layer for the
[BoringOS framework](https://github.com/hebbs-ai/boringos). **Shell-hosted** —
installed into a running BoringOS host via the framework's `.hebbsmod` install
pipeline rather than booted as a standalone HTTP server.

Catches startup leads from every channel (email, public form, copilot, scout
signals), researches each against the fund's actual thesis, drafts IC memos, and
monitors the portfolio post-investment. Source proposal: hebbs-ai/boringos#30.

**Open source** under [`GPL-3.0-or-later`](./LICENSE.md) — same license as the
framework + CRM.

## What lives here

- `packages/server` — the module: `createVcbrainModule` factory (tools, skills,
  schema, agents, workflows, lifecycle). No standalone HTTP entry.
- `packages/web` — the React `PluginUI` surface (Thesis Studio, Pipeline, Dossier).
- `packages/shared` — DTOs + constants shared between server and web.
- `docs/` — `PLAN.md` (build plan) + `DECISIONS.md` (decision log).

## Building

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test:run
```

## License

[`GPL-3.0-or-later`](./LICENSE.md). Every source file carries
`// SPDX-License-Identifier: GPL-3.0-or-later`.

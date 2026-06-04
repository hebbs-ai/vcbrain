// SPDX-License-Identifier: MIT
//
// `vcbrain` Module — entry point. Exports `createVcbrainModule`, a
// ModuleFactory the host registers via `app.module(createVcbrainModule)`.
//
// Standalone VC module: owns its own schema (`vc__*` tables), exposes
// tools at `/api/tools/vcbrain.<group>.<verb>`, ships SKILL.md files for
// the VC-specialised agents, and seeds defaults on install.
//
// `defaultInstall: false` — tenants opt in via the install API.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Module, ModuleFactory } from "@boringos/module-sdk";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { vcbrainMigrations } from "./migrations.js";
import { createVcbrainTools } from "./tools/index.js";
import { createVcbrainLifecycle } from "./lifecycle.js";
import { createVcbrainWebhooks } from "./webhooks.js";
import type { VcDeps, VcEventBus, GetConnectorToken, VcDrive } from "./tools/deps.js";

const __moduleDir = dirname(fileURLToPath(import.meta.url));

export const createVcbrainModule: ModuleFactory = (factoryDeps) => {
  const db = factoryDeps.db as PostgresJsDatabase;

  const getEventBus = (): VcEventBus | null =>
    (factoryDeps.eventBus as VcEventBus | undefined) ?? null;

  const getConnectorToken: GetConnectorToken =
    factoryDeps.getConnectorToken ?? (async () => null);

  const getDrive = (): VcDrive | null =>
    (factoryDeps.drive as VcDrive | undefined) ?? null;

  const deps: VcDeps = { db, getEventBus, getConnectorToken, getDrive };

  const module: Module = {
    id: "vcbrain",
    name: "VCBrain",
    version: "0.8.2",
    description:
      "The open-source AI analyst for VCs. Catches startup leads from every channel, researches each into an analyst-grade dossier, scores it against your fund's thesis, drafts the IC memo, and watches your portfolio — self-hosted and agent-native. Ships 5 specialised agents (research, thesis-fit, memo, scout, portfolio). Tailor it to your fund at hebbs.ai.",
    kind: "module",
    defaultInstall: false,
    provides: ["vcbrain-source", "vcbrain-actions"],
    dependsOn: [
      { capability: "email-send", optional: true },
      { capability: "file-storage", optional: true },
    ],
    schema: vcbrainMigrations,
    tools: createVcbrainTools(deps),
    skills: [
      "./skills/vc-research/SKILL.md",
      "./skills/vc-thesis-fit/SKILL.md",
      "./skills/vc-memo-writer/SKILL.md",
      "./skills/vc-portfolio-monitor/SKILL.md",
      "./skills/vc-scout/SKILL.md",
    ],
    webhooks: createVcbrainWebhooks(deps),
    lifecycle: createVcbrainLifecycle(factoryDeps),
    __moduleDir,
  };

  return module;
};

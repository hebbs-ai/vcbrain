// SPDX-License-Identifier: MIT
//
// VCBrain Module lifecycle hooks.
//
// `onInstall(ctx)` runs AFTER `Module.schema` migrations create the vc__*
// tables. It seeds the per-tenant defaults that make a fresh install usable:
//   - a starter (active) thesis
//   - the specialised agents (grows per phase; Phase 3 = vc-research)
//   - the workflows that route work to them
//
// `onUninstall(ctx)` removes the seeded agents/workflows/routines. Schema
// rollback is handled by the install-manager via Migration.down().

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { AgentSeed, ModuleFactoryDeps, ModuleLifecycle } from "@boringos/module-sdk";
import { Lifecycle } from "@boringos/module-sdk";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DEFAULT_THESIS_WEIGHTS } from "@boringos-vcbrain/shared";

// Default model for VCBrain agents — Sonnet. These are deep-reasoning research
// roles; Sonnet balances quality and cost. Overridable per-agent in the UI.
const VC_AGENT_MODEL = "claude-sonnet-4-6";

// Seeded agent roles — also the delete-list for scrub/uninstall.
const VC_AGENT_ROLES = [
  "vc-research",
  "vc-thesis-fit",
  "vc-memo-writer",
  "vc-portfolio-monitor",
  "vc-scout",
] as const;

// Seeded workflow names — also the delete-list for scrub/uninstall.
const VC_WORKFLOW_NAMES = [
  "Ingest startup leads from inbox",
  "Enrich new startup",
  "Score startup on screening",
  "Draft IC memo",
];

export function createVcbrainLifecycle(factoryDeps: ModuleFactoryDeps): ModuleLifecycle {
  const db = factoryDeps.db as PostgresJsDatabase;

  return {
    async onInstall(ctx) {
      await scrubWorkflows(db, ctx.tenantId);
      await scrubRoutines(db, ctx.tenantId);
      await seedStarterThesis(db, ctx.tenantId);

      // Lifecycle.seed handles root-agent lookup + FK-safe inserts and is
      // idempotent via __seed_meta; behaviour comes from the role-gated
      // SKILL.md, so instructions stay empty.
      await Lifecycle.seed(ctx, { agents: buildAgentSeeds() });

      const agents = await fetchSeededAgentIds(db, ctx.tenantId);
      await setAgentModels(db, ctx.tenantId);
      await seedWorkflows(db, ctx.tenantId, agents);
      await seedRoutines(db, ctx.tenantId, agents);
    },

    async onUninstall(ctx) {
      await scrubWorkflows(db, ctx.tenantId);
      await scrubAgents(db, ctx.tenantId);
      // vc__* tables are dropped by Migration.down().
    },
  };
}

// ── Thesis ─────────────────────────────────────────────────────────────

async function seedStarterThesis(db: PostgresJsDatabase, tenantId: string) {
  const existing = (await db.execute(sql`
    SELECT id FROM vc__theses WHERE tenant_id = ${tenantId} LIMIT 1
  `)) as unknown as Array<{ id: string }>;
  if (existing[0]) return;
  const config = JSON.stringify({ mustHaves: [], dealBreakers: [], weights: DEFAULT_THESIS_WEIGHTS });
  await db.execute(sql`
    INSERT INTO vc__theses (id, tenant_id, name, config, is_active, created_at, updated_at)
    VALUES (${randomUUID()}, ${tenantId}, 'Default thesis', ${config}::jsonb, true, now(), now())
  `);
}

// ── Agents ─────────────────────────────────────────────────────────────

function buildAgentSeeds(): AgentSeed[] {
  return [
    // persona === the agent's `role`; each SKILL.md gates on its role.
    { name: "VC Research", persona: "vc-research", instructions: "" },
    { name: "VC Thesis Fit", persona: "vc-thesis-fit", instructions: "" },
    { name: "VC Memo Writer", persona: "vc-memo-writer", instructions: "" },
    { name: "VC Portfolio Monitor", persona: "vc-portfolio-monitor", instructions: "" },
    { name: "VC Scout", persona: "vc-scout", instructions: "" },
  ];
}

// Set every seeded VCBrain agent to the default model (Sonnet). AgentSeed has
// no model field, so we stamp it after Lifecycle.seed. Idempotent.
async function setAgentModels(db: PostgresJsDatabase, tenantId: string) {
  const rolesIn = sql.join(VC_AGENT_ROLES.map((r) => sql`${r}`), sql`, `);
  await db.execute(sql`
    UPDATE agents SET model = ${VC_AGENT_MODEL}
    WHERE tenant_id = ${tenantId} AND source_app_id = 'vcbrain' AND role IN (${rolesIn})
  `);
}

interface SeededAgents {
  vcResearchId: string;
  vcThesisFitId: string;
  vcMemoWriterId: string;
  vcPortfolioMonitorId: string;
  vcScoutId: string;
}

async function fetchSeededAgentIds(db: PostgresJsDatabase, tenantId: string): Promise<SeededAgents> {
  const rows = (await db.execute(sql`
    SELECT id, role FROM agents
    WHERE tenant_id = ${tenantId} AND source = 'app' AND source_app_id = 'vcbrain'
  `)) as unknown as Array<{ id: string; role: string }>;
  const byRole = new Map(rows.map((r) => [r.role, r.id]));
  const need = (role: string) => {
    const id = byRole.get(role);
    if (!id) throw new Error(`[vcbrain.onInstall] expected agent role "${role}" missing after Lifecycle.seed`);
    return id;
  };
  return {
    vcResearchId: need("vc-research"),
    vcThesisFitId: need("vc-thesis-fit"),
    vcMemoWriterId: need("vc-memo-writer"),
    vcPortfolioMonitorId: need("vc-portfolio-monitor"),
    vcScoutId: need("vc-scout"),
  };
}

// ── Workflows ──────────────────────────────────────────────────────────

async function seedWorkflows(db: PostgresJsDatabase, tenantId: string, agents: SeededAgents) {
  // Inbound email → deduped startup lead + attachments into drive.
  await insertWorkflow(
    db,
    tenantId,
    "Ingest startup leads from inbox",
    [
      { id: "trigger", name: "trigger", kind: "trigger", type: "trigger", config: { eventType: "inbox.item_created" } },
      {
        id: "ingest",
        name: "ingest",
        kind: "tool",
        type: "tool",
        tool: "vcbrain.inbox.ingest",
        inputs: { itemId: "{{trigger.itemId}}" },
        config: {},
      },
    ],
    [{ id: "e1", sourceBlockId: "trigger", targetBlockId: "ingest", sourceHandle: null, sortOrder: 0 }],
  );

  // New startup → wake vc-research to build the living dossier. The framework
  // tasks.create tool auto-wakes the assignee, so create-task + wake collapse.
  await insertWorkflow(
    db,
    tenantId,
    "Enrich new startup",
    [
      { id: "trigger", name: "trigger", kind: "trigger", type: "trigger", config: { eventType: "entity.created" } },
      {
        id: "guard",
        name: "guard",
        kind: "condition",
        type: "condition",
        config: { field: "{{trigger.entityType}}", operator: "equals", value: "vcbrain_startup" },
      },
      {
        id: "task",
        name: "task",
        kind: "tool",
        type: "tool",
        tool: "framework.tasks.create",
        inputs: {
          title: "Research startup {{trigger.entityId}}",
          description:
            "Research and enrich startup: {{trigger.entityId}}\nScan any pitch deck in drive and write the living dossier, then mark this task done.",
          originKind: "vcbrain.startup.created",
          originId: "{{trigger.entityId}}",
          assigneeAgentId: agents.vcResearchId,
        },
        config: {},
      },
    ],
    [
      { id: "e1", sourceBlockId: "trigger", targetBlockId: "guard", sourceHandle: null, sortOrder: 0 },
      { id: "e2", sourceBlockId: "guard", targetBlockId: "task", sourceHandle: "true", sortOrder: 0 },
    ],
  );

  // Startup advanced to Screening → wake vc-thesis-fit to score it against the
  // active thesis. vc-research moves the stage after writing the dossier.
  await insertWorkflow(
    db,
    tenantId,
    "Score startup on screening",
    [
      { id: "trigger", name: "trigger", kind: "trigger", type: "trigger", config: { eventType: "startup.stage_changed" } },
      {
        id: "guard",
        name: "guard",
        kind: "condition",
        type: "condition",
        config: { field: "{{trigger.stage}}", operator: "equals", value: "Screening" },
      },
      {
        id: "task",
        name: "task",
        kind: "tool",
        type: "tool",
        tool: "framework.tasks.create",
        inputs: {
          title: "Score startup {{trigger.entityId}}",
          description:
            "Score startup against thesis: {{trigger.entityId}}\nJudge the dossier against the active thesis and record a 0–100 fit score, then mark this task done.",
          originKind: "vcbrain.startup.screening",
          originId: "{{trigger.entityId}}",
          assigneeAgentId: agents.vcThesisFitId,
        },
        config: {},
      },
    ],
    [
      { id: "e1", sourceBlockId: "trigger", targetBlockId: "guard", sourceHandle: null, sortOrder: 0 },
      { id: "e2", sourceBlockId: "guard", targetBlockId: "task", sourceHandle: "true", sortOrder: 0 },
    ],
  );

  // Startup advanced to IC → wake vc-memo-writer to draft the IC memo.
  await insertWorkflow(
    db,
    tenantId,
    "Draft IC memo",
    [
      { id: "trigger", name: "trigger", kind: "trigger", type: "trigger", config: { eventType: "startup.stage_changed" } },
      {
        id: "guard",
        name: "guard",
        kind: "condition",
        type: "condition",
        config: { field: "{{trigger.stage}}", operator: "equals", value: "IC" },
      },
      {
        id: "task",
        name: "task",
        kind: "tool",
        type: "tool",
        tool: "framework.tasks.create",
        inputs: {
          title: "Draft IC memo for {{trigger.entityId}}",
          description:
            "Draft IC memo for startup: {{trigger.entityId}}\nWrite a cited IC memo from the dossier + thesis-fit verdict, then mark this task done.",
          originKind: "vcbrain.startup.ic",
          originId: "{{trigger.entityId}}",
          assigneeAgentId: agents.vcMemoWriterId,
        },
        config: {},
      },
    ],
    [
      { id: "e1", sourceBlockId: "trigger", targetBlockId: "guard", sourceHandle: null, sortOrder: 0 },
      { id: "e2", sourceBlockId: "guard", targetBlockId: "task", sourceHandle: "true", sortOrder: 0 },
    ],
  );
}

// ── Routines (cron) ────────────────────────────────────────────────────

async function seedRoutines(db: PostgresJsDatabase, tenantId: string, agents: SeededAgents) {
  // Daily portfolio sweep + daily scout run. Agent-targeted routines auto-wake
  // the assignee on each tick.
  await db.execute(sql`
    INSERT INTO routines (id, tenant_id, title, assignee_agent_id, cron_expression, status, created_at, updated_at)
    VALUES (${randomUUID()}, ${tenantId}, 'Portfolio Monitor (daily)', ${agents.vcPortfolioMonitorId},
      '0 6 * * *', 'active', now(), now())
  `);
  await db.execute(sql`
    INSERT INTO routines (id, tenant_id, title, assignee_agent_id, cron_expression, status, created_at, updated_at)
    VALUES (${randomUUID()}, ${tenantId}, 'Scout (daily)', ${agents.vcScoutId},
      '0 8 * * *', 'active', now(), now())
  `);
}

async function insertWorkflow(
  db: PostgresJsDatabase,
  tenantId: string,
  name: string,
  blocks: Array<Record<string, unknown>>,
  edges: Array<Record<string, unknown>>,
) {
  await db.execute(sql`
    INSERT INTO workflows (id, tenant_id, name, type, status, blocks, edges, created_at, updated_at)
    VALUES (${randomUUID()}, ${tenantId}, ${name}, 'system', 'active',
      ${JSON.stringify(blocks)}::jsonb, ${JSON.stringify(edges)}::jsonb, now(), now())
  `);
}

// ── Idempotency scrub + uninstall cascade ──────────────────────────────

async function scrubWorkflows(db: PostgresJsDatabase, tenantId: string) {
  const namesIn = sql.join(VC_WORKFLOW_NAMES.map((n) => sql`${n}`), sql`, `);
  await db.execute(sql`
    DELETE FROM workflow_runs
    WHERE workflow_id IN (SELECT id FROM workflows WHERE tenant_id = ${tenantId} AND name IN (${namesIn}))
  `);
  await db.execute(sql`DELETE FROM workflows WHERE tenant_id = ${tenantId} AND name IN (${namesIn})`);
}

// Remove cron routines assigned to vcbrain agents (idempotent reinstall —
// agents survive Lifecycle.seed but their routines would otherwise duplicate).
async function scrubRoutines(db: PostgresJsDatabase, tenantId: string) {
  const rolesIn = sql.join(VC_AGENT_ROLES.map((r) => sql`${r}`), sql`, `);
  await db.execute(sql`
    DELETE FROM routines
    WHERE tenant_id = ${tenantId}
      AND assignee_agent_id IN (SELECT id FROM agents WHERE tenant_id = ${tenantId} AND role IN (${rolesIn}))
  `);
}

// FK-safe agent removal (mirrors the CRM cascade): cost_events → agent_runs
// → agent_wakeup_requests → null out task refs → agents.
async function scrubAgents(db: PostgresJsDatabase, tenantId: string) {
  const rolesIn = sql.join(VC_AGENT_ROLES.map((r) => sql`${r}`), sql`, `);
  const agentIds = sql`SELECT id FROM agents WHERE tenant_id = ${tenantId} AND role IN (${rolesIn})`;
  await db.execute(sql`
    DELETE FROM routines WHERE tenant_id = ${tenantId} AND assignee_agent_id IN (${agentIds})
  `);
  await db.execute(sql`
    DELETE FROM cost_events WHERE run_id IN (SELECT id FROM agent_runs WHERE agent_id IN (${agentIds}))
  `);
  await db.execute(sql`DELETE FROM agent_runs WHERE agent_id IN (${agentIds})`);
  await db.execute(sql`DELETE FROM agent_wakeup_requests WHERE agent_id IN (${agentIds})`);
  await db.execute(sql`UPDATE tasks SET assignee_agent_id = NULL WHERE assignee_agent_id IN (${agentIds})`);
  await db.execute(sql`UPDATE tasks SET created_by_agent_id = NULL WHERE created_by_agent_id IN (${agentIds})`);
  await db.execute(sql`DELETE FROM agents WHERE tenant_id = ${tenantId} AND role IN (${rolesIn})`);
}

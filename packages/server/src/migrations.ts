// SPDX-License-Identifier: MIT
//
// Migration[] for the install pipeline. Each migration's `up()` runs
// CREATE TABLE + indexes; `down()` drops them. Idempotent at the
// install-manager level via the `module_migrations` tracking table.
//
// Keep in lockstep with packages/server/src/schema/*.ts — the Drizzle
// pgTable definitions are the typed query layer; this file is the DDL
// the framework actually executes.

import type { Migration } from "@boringos/module-sdk";

const init: Migration = {
  id: "001-init",
  async up(db) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vc__startups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        domain text,
        one_liner text,
        source_channel text NOT NULL DEFAULT 'manual',
        source_detail text,
        stage text NOT NULL DEFAULT 'Sourced',
        fit_score integer,
        dossier jsonb,
        thesis_snapshot jsonb,
        owner_partner_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__startups_tenant_idx ON vc__startups(tenant_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__startups_domain_idx ON vc__startups(tenant_id, domain);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__startups_stage_idx ON vc__startups(tenant_id, stage);`);
    // Dedup: one startup per (tenant, domain). Partial so NULL domains repeat.
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS vc__startups_tenant_domain_uniq
        ON vc__startups(tenant_id, lower(domain))
        WHERE domain IS NOT NULL;
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS vc__theses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        config jsonb NOT NULL DEFAULT '{}'::jsonb,
        is_active boolean NOT NULL DEFAULT false,
        owner_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__theses_tenant_idx ON vc__theses(tenant_id);`);
    // At most one active thesis per tenant.
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS vc__theses_tenant_active_uniq
        ON vc__theses(tenant_id)
        WHERE is_active = true;
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS vc__memos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        startup_id uuid NOT NULL,
        draft_md text NOT NULL DEFAULT '',
        cited_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
        status text NOT NULL DEFAULT 'draft',
        edited_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__memos_tenant_idx ON vc__memos(tenant_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__memos_startup_idx ON vc__memos(tenant_id, startup_id);`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS vc__portfolio_signals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        startup_id uuid NOT NULL,
        signal_type text NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        severity text NOT NULL DEFAULT 'info',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__portfolio_signals_tenant_idx ON vc__portfolio_signals(tenant_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__portfolio_signals_startup_idx ON vc__portfolio_signals(tenant_id, startup_id);`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS vc__startup_files (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        startup_id uuid NOT NULL,
        drive_path text NOT NULL,
        filename text NOT NULL,
        kind text NOT NULL DEFAULT 'other',
        mime_type text,
        source_message_id text,
        parsed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__startup_files_tenant_idx ON vc__startup_files(tenant_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__startup_files_startup_idx ON vc__startup_files(tenant_id, startup_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS vc__startup_files_msg_idx ON vc__startup_files(tenant_id, source_message_id);`);
    // Same attachment landing twice (re-sync) shouldn't duplicate a file row.
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS vc__startup_files_dedupe_uniq
        ON vc__startup_files(tenant_id, startup_id, source_message_id, filename)
        WHERE source_message_id IS NOT NULL;
    `);
  },
  async down(db) {
    await db.execute(`DROP TABLE IF EXISTS vc__startup_files CASCADE;`);
    await db.execute(`DROP TABLE IF EXISTS vc__portfolio_signals CASCADE;`);
    await db.execute(`DROP TABLE IF EXISTS vc__memos CASCADE;`);
    await db.execute(`DROP TABLE IF EXISTS vc__theses CASCADE;`);
    await db.execute(`DROP TABLE IF EXISTS vc__startups CASCADE;`);
  },
};

export const vcbrainMigrations: Migration[] = [init];

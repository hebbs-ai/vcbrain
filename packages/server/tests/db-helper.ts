// SPDX-License-Identifier: GPL-3.0-or-later
//
// Shared harness for DB-backed integration tests. Connects to a Postgres
// pointed at by VCBRAIN_TEST_DB (the dev host's embedded PG works:
// postgres://boringos:boringos@127.0.0.1:5436/boringos). Tests that import
// this are skipped when the env var is absent, so `pnpm test:run` stays
// green on machines without a running host.

import { createHash } from "node:crypto";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { VcDeps, VcEventBus } from "../src/tools/deps.js";

export const TEST_DB_URL = process.env.VCBRAIN_TEST_DB;
export const hasDb = Boolean(TEST_DB_URL);

export interface Harness {
  db: PostgresJsDatabase;
  deps: VcDeps;
  events: { type: string; data: Record<string, unknown> }[];
  /** In-memory drive — path → bytes written by tools under test. */
  drive: Map<string, Uint8Array>;
  close: () => Promise<void>;
}

export function connect(): Harness {
  const sql = postgres(TEST_DB_URL!, { max: 2 });
  const db = drizzle(sql);
  const events: { type: string; data: Record<string, unknown> }[] = [];
  const bus: VcEventBus = {
    emit(e) {
      events.push({ type: e.type, data: e.data });
    },
  };
  const drive = new Map<string, Uint8Array>();
  const deps: VcDeps = {
    db,
    getEventBus: () => bus,
    getConnectorToken: async () => null,
    getDrive: () => ({
      async write(path, content) {
        drive.set(path, typeof content === "string" ? new TextEncoder().encode(content) : content);
        return { path };
      },
      async read(path) {
        return drive.get(path) ?? null;
      },
      async list(prefix) {
        return [...drive.keys()].filter((k) => k.startsWith(prefix));
      },
    }),
  };
  return { db, deps, events, drive, close: () => sql.end({ timeout: 5 }) };
}

/** A throwaway, collision-free tenant id derived from the seed (no Math.random). */
export function testTenant(seed: string): string {
  // md5 → 32 hex, formatted as a v4-shaped uuid. Distinct seeds → distinct ids,
  // so parallel test files never share (and clobber) a tenant.
  const hex = createHash("md5").update(`vcbrain-test-${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function ctx(tenantId: string) {
  return { tenantId, agentId: "test-agent", runId: "test-run", invokedBy: "agent" as const };
}

export async function cleanup(db: PostgresJsDatabase, tenantId: string) {
  for (const t of [
    "vc__startup_files",
    "vc__portfolio_signals",
    "vc__memos",
    "vc__startups",
    "vc__theses",
  ]) {
    await db.execute(`DELETE FROM ${t} WHERE tenant_id = '${tenantId}'`);
  }
}

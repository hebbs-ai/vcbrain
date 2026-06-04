// SPDX-License-Identifier: GPL-3.0-or-later
//
// Shared dependencies threaded into every VCBrain tool factory. Built
// once in module.ts from the `ModuleFactoryDeps` the framework injects,
// then handed to each tool factory as a closure capture. Mirrors the
// CRM module's deps pattern.

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ConnectorTokenHandle } from "@boringos/module-sdk";

/** Lazy event-bus reference — read at call time, not capture time. */
export interface VcEventBus {
  emit(event: {
    connectorKind: string;
    type: string;
    tenantId: string;
    data: Record<string, unknown>;
    timestamp: Date;
  }): Promise<void> | void;
}

/**
 * Connector-token accessor injected by the host. Returns `null` if no
 * account is connected/bound, or if the host did not inject the accessor
 * (older host / test harness without an AuthManager).
 */
export type GetConnectorToken = (
  provider: string,
  callerModuleId: string,
  opts?: { accountId?: string },
) => Promise<ConnectorTokenHandle | null>;

/**
 * Minimal drive surface the module needs — the host injects a richer
 * `DriveManager`, but we only call write/read/list, so we depend on a
 * structural subset to avoid a hard `@boringos/drive` dependency.
 */
export interface VcDrive {
  write(path: string, content: string | Uint8Array): Promise<unknown>;
  read(path: string): Promise<unknown>;
  list(prefix: string): Promise<unknown>;
}

export interface VcDeps {
  db: PostgresJsDatabase;
  /** Read at call time — undefined-safe. */
  getEventBus: () => VcEventBus | null;
  /** Returns `null` when no Google account is connected for the tenant. */
  getConnectorToken: GetConnectorToken;
  /** Server-side drive access (GAP B — agents can't write drive directly). */
  getDrive: () => VcDrive | null;
}

export function emitVc(
  deps: VcDeps,
  type: string,
  tenantId: string,
  data: Record<string, unknown>,
): void {
  const bus = deps.getEventBus();
  if (!bus) return;
  // Fire-and-forget — emitters shouldn't block on subscriber failures.
  void Promise.resolve(
    bus.emit({
      connectorKind: "vcbrain",
      type,
      tenantId,
      data,
      timestamp: new Date(),
    }),
  ).catch(() => {});
}

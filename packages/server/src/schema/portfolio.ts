// SPDX-License-Identifier: GPL-3.0-or-later
import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const portfolioSignals = pgTable(
  "vc__portfolio_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    startupId: uuid("startup_id").notNull(),
    signalType: text("signal_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    severity: text("severity").notNull().default("info"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("vc__portfolio_signals_tenant_idx").on(t.tenantId),
    startupIdx: index("vc__portfolio_signals_startup_idx").on(t.tenantId, t.startupId),
  }),
);

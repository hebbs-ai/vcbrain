// SPDX-License-Identifier: GPL-3.0-or-later
import { pgTable, uuid, text, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import type { ThesisConfig } from "@boringos-vcbrain/shared";

export const theses = pgTable(
  "vc__theses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").$type<ThesisConfig>().notNull(),
    isActive: boolean("is_active").notNull().default(false),
    ownerId: uuid("owner_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("vc__theses_tenant_idx").on(t.tenantId),
  }),
);

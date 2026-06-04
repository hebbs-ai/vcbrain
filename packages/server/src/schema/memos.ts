// SPDX-License-Identifier: MIT
import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const memos = pgTable(
  "vc__memos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    startupId: uuid("startup_id").notNull(),
    draftMd: text("draft_md").notNull().default(""),
    citedSources: jsonb("cited_sources")
      .$type<{ label: string; ref: string }[]>()
      .notNull()
      .default([]),
    status: text("status").notNull().default("draft"),
    editedBy: uuid("edited_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("vc__memos_tenant_idx").on(t.tenantId),
    startupIdx: index("vc__memos_startup_idx").on(t.tenantId, t.startupId),
  }),
);

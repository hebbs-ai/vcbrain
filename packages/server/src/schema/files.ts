// SPDX-License-Identifier: MIT
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const startupFiles = pgTable(
  "vc__startup_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    startupId: uuid("startup_id").notNull(),
    drivePath: text("drive_path").notNull(),
    filename: text("filename").notNull(),
    kind: text("kind").notNull().default("other"),
    mimeType: text("mime_type"),
    sourceMessageId: text("source_message_id"),
    parsedAt: timestamp("parsed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("vc__startup_files_tenant_idx").on(t.tenantId),
    startupIdx: index("vc__startup_files_startup_idx").on(t.tenantId, t.startupId),
    msgIdx: index("vc__startup_files_msg_idx").on(t.tenantId, t.sourceMessageId),
  }),
);

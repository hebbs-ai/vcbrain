// SPDX-License-Identifier: MIT
import { pgTable, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import type { StartupDossier, ThesisConfig } from "@boringos-vcbrain/shared";

export const startups = pgTable(
  "vc__startups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    name: text("name").notNull(),
    domain: text("domain"),
    oneLiner: text("one_liner"),
    sourceChannel: text("source_channel").notNull().default("manual"),
    sourceDetail: text("source_detail"),
    stage: text("stage").notNull().default("Sourced"),
    fitScore: integer("fit_score"),
    dossier: jsonb("dossier").$type<StartupDossier | null>(),
    thesisSnapshot: jsonb("thesis_snapshot").$type<ThesisConfig | null>(),
    ownerPartnerId: uuid("owner_partner_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("vc__startups_tenant_idx").on(t.tenantId),
    domainIdx: index("vc__startups_domain_idx").on(t.tenantId, t.domain),
    stageIdx: index("vc__startups_stage_idx").on(t.tenantId, t.stage),
  }),
);

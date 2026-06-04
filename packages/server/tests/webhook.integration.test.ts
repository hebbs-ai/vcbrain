// SPDX-License-Identifier: GPL-3.0-or-later
//
// Phase 5 — public-form webhook. DB-backed; needs VCBRAIN_TEST_DB.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { WebhookRequest, TenantContext } from "@boringos/module-sdk";
import { createVcbrainWebhooks, signFormToken } from "../src/webhooks.js";
import { connect, cleanup, testTenant, hasDb, type Harness } from "./db-helper.js";

const d = hasDb ? describe : describe.skip;

function req(token: string, body: unknown): WebhookRequest {
  return { method: "POST", headers: {}, query: { t: token }, body: JSON.stringify(body) };
}

d("Phase 5 — public-form webhook (DB-backed)", () => {
  let h: Harness;
  const tenant = testTenant("phase5");
  const secret = process.env.VCBRAIN_FORM_SECRET || "vcbrain-dev-form-secret";

  beforeAll(async () => {
    h = connect();
    await cleanup(h.db, tenant);
  });
  afterAll(async () => {
    if (h) {
      await cleanup(h.db, tenant);
      await h.close();
    }
  });

  it("verified submission creates a deduped lead for the token's tenant", async () => {
    const [hook] = createVcbrainWebhooks(h.deps);
    const token = signFormToken(tenant, secret);

    // verify gate
    expect(await hook.verify(req(token, {}))).toBe(true);
    expect(await hook.verify(req("bad.token", {}))).toBe(false);

    await hook.handler(
      req(token, { company: "Nimbus", website: "nimbus.dev", founderEmail: "founder@nimbus.dev", oneLiner: "edge fns" }),
      { tenantId: tenant } as TenantContext,
    );

    const rows = (await h.db.execute(
      `SELECT name, domain, source_channel FROM vc__startups WHERE tenant_id = '${tenant}'`,
    )) as unknown as Array<{ name: string; domain: string; source_channel: string }>;
    expect(rows.length).toBe(1);
    expect(rows[0]!.domain).toBe("nimbus.dev");
    expect(rows[0]!.source_channel).toBe("form");

    // Re-submission with the same domain dedupes (still one row).
    await hook.handler(req(token, { company: "Nimbus Inc", website: "https://nimbus.dev" }), { tenantId: tenant } as TenantContext);
    const after = (await h.db.execute(`SELECT count(*)::int AS n FROM vc__startups WHERE tenant_id = '${tenant}'`)) as unknown as Array<{ n: number }>;
    expect(after[0]!.n).toBe(1);
  });
});

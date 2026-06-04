// SPDX-License-Identifier: MIT
//
// DB-backed integration tests for the Phase 1 tools. Run against the dev
// host's embedded Postgres:
//   VCBRAIN_TEST_DB=postgres://boringos:boringos@127.0.0.1:5436/boringos pnpm test:run
// Skipped automatically when VCBRAIN_TEST_DB is unset.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Tool, ToolContext } from "@boringos/module-sdk";
import { createStartupTools } from "../src/tools/startups.js";
import { createThesisTools } from "../src/tools/theses.js";
import { createMemoTools } from "../src/tools/memos.js";
import { createPortfolioTools } from "../src/tools/portfolio.js";
import { connect, cleanup, ctx, testTenant, hasDb, type Harness } from "./db-helper.js";

const d = hasDb ? describe : describe.skip;

function byName(tools: Tool[], name: string): Tool {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not found`);
  return t;
}
const call = (t: Tool, input: unknown, c: ReturnType<typeof ctx>) =>
  t.handler(input as never, c as unknown as ToolContext);

d("Phase 1 tools (DB-backed)", () => {
  let h: Harness;
  const tenant = testTenant("phase1");

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

  it("startups.upsert creates, then dedupes by domain", async () => {
    const tools = createStartupTools(h.deps);
    const upsert = byName(tools, "startups.upsert");

    const r1 = (await call(upsert, { name: "Acme AI", website: "https://acme.ai", oneLiner: "ops agents" }, ctx(tenant))) as any;
    expect(r1.ok).toBe(true);
    expect(r1.result.created).toBe(true);
    const id = r1.result.startupId;

    // Same domain via a different spelling + a free-mail sender → maps onto the same row.
    const r2 = (await call(upsert, { name: "Acme dup", domain: "ACME.ai", senderEmail: "ceo@gmail.com", sourceChannel: "email" }, ctx(tenant))) as any;
    expect(r2.ok).toBe(true);
    expect(r2.result.created).toBe(false);
    expect(r2.result.startupId).toBe(id);

    const rows = (await h.db.execute(
      `SELECT count(*)::int AS n FROM vc__startups WHERE tenant_id = '${tenant}'`,
    )) as unknown as Array<{ n: number }>;
    expect(rows[0]!.n).toBe(1);

    // create event fired once.
    expect(h.events.filter((e) => e.type === "entity.created").length).toBe(1);
  });

  it("startups.update emits stage_changed on stage move", async () => {
    const tools = createStartupTools(h.deps);
    const [list, update] = [byName(tools, "startups.list"), byName(tools, "startups.update")];
    const listed = (await call(list, {}, ctx(tenant))) as any;
    const id = listed.result.data[0].id;

    h.events.length = 0;
    const r = (await call(update, { id, stage: "Screening" }, ctx(tenant))) as any;
    expect(r.ok).toBe(true);
    expect(r.result.data.stage).toBe("Screening");
    expect(h.events.some((e) => e.type === "startup.stage_changed")).toBe(true);
  });

  it("theses.create + activate enforces one active", async () => {
    const tools = createThesisTools(h.deps);
    const [create, activate, list] = [
      byName(tools, "theses.create"),
      byName(tools, "theses.activate"),
      byName(tools, "theses.list"),
    ];
    const a = (await call(create, { name: "Deep tech", activate: true }, ctx(tenant))) as any;
    const b = (await call(create, { name: "Consumer", activate: false }, ctx(tenant))) as any;
    expect(a.ok && b.ok).toBe(true);

    await call(activate, { id: b.result.data.id }, ctx(tenant));
    const listed = (await call(list, {}, ctx(tenant))) as any;
    const active = listed.result.data.filter((t: any) => t.isActive);
    expect(active.length).toBe(1);
    expect(active[0].id).toBe(b.result.data.id);
  });

  it("memos.draft updates in place; portfolio.record_signal writes", async () => {
    const startupTools = createStartupTools(h.deps);
    const id = ((await call(byName(startupTools, "startups.list"), {}, ctx(tenant))) as any).result.data[0].id;

    const memoTools = createMemoTools(h.deps);
    const draft = byName(memoTools, "memos.draft");
    const m1 = (await call(draft, { startupId: id, draftMd: "# v1" }, ctx(tenant))) as any;
    const m2 = (await call(draft, { startupId: id, draftMd: "# v2" }, ctx(tenant))) as any;
    expect(m1.result.created).toBe(true);
    expect(m2.result.created).toBe(false);
    expect(m2.result.data.id).toBe(m1.result.data.id);
    expect(m2.result.data.draftMd).toBe("# v2");

    const portfolioTools = createPortfolioTools(h.deps);
    const sig = (await call(byName(portfolioTools, "portfolio.record_signal"), { startupId: id, signalType: "news", severity: "watch" }, ctx(tenant))) as any;
    expect(sig.ok).toBe(true);
    expect(sig.result.data.severity).toBe("watch");
  });
});

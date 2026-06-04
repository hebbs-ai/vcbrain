// SPDX-License-Identifier: MIT
//
// Phase 4 — thesis-fit scoring. DB-backed; needs VCBRAIN_TEST_DB.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Tool, ToolContext } from "@boringos/module-sdk";
import { createStartupTools } from "../src/tools/startups.js";
import { createThesisTools } from "../src/tools/theses.js";
import { connect, cleanup, ctx, testTenant, hasDb, type Harness } from "./db-helper.js";

const d = hasDb ? describe : describe.skip;
function byName(tools: Tool[], name: string): Tool {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not found`);
  return t;
}
const call = (t: Tool, input: unknown, c: ReturnType<typeof ctx>) =>
  t.handler(input as never, c as unknown as ToolContext);

d("Phase 4 — scoring (DB-backed)", () => {
  let h: Harness;
  const tenant = testTenant("phase4");

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

  it("startups.score sets fitScore, snapshots active thesis, writes dossier.fit", async () => {
    const startupTools = createStartupTools(h.deps);
    const thesisTools = createThesisTools(h.deps);

    // Active thesis with deep-tech must-have + custom weights.
    await call(
      byName(thesisTools, "theses.create"),
      {
        name: "Deep tech seed",
        activate: true,
        config: {
          mustHaves: [{ id: "ip", label: "Defensible IP", enabled: true }],
          dealBreakers: [],
          weights: { team: 50, market: 30, product: 20 },
        },
      },
      ctx(tenant),
    );

    const id = ((await call(byName(startupTools, "startups.upsert"), { name: "Quanta", website: "quanta.dev" }, ctx(tenant))) as any).result.startupId;
    // Pre-seed some dossier content the scorer would merge with.
    await call(byName(startupTools, "startups.patch_dossier"), { id, patch: { product: { problem: "x" } } }, ctx(tenant));

    const scored = (await call(
      byName(startupTools, "startups.score"),
      {
        id,
        score: 78,
        fits: ["Matches 'Defensible IP' — 2 patents", "Strong team", "Big market"],
        risks: ["Pre-revenue", "Crowded", "Single founder"],
        dimensionScores: { team: 85, market: 75, product: 70 },
        suggestedLeadPartner: "Alex",
      },
      ctx(tenant),
    )) as any;
    expect(scored.ok).toBe(true);

    const got = (await call(byName(startupTools, "startups.get"), { id }, ctx(tenant))) as any;
    const row = got.result.data;
    expect(row.fitScore).toBe(78);
    // Active thesis snapshotted onto the startup.
    expect(row.thesisSnapshot.weights).toEqual({ team: 50, market: 30, product: 20 });
    expect(row.thesisSnapshot.mustHaves[0].label).toBe("Defensible IP");
    // Verdict mirrored into the living dossier (and earlier product block preserved).
    expect(row.dossier.fit.score).toBe(78);
    expect(row.dossier.fit.suggestedLeadPartner).toBe("Alex");
    expect(row.dossier.product.problem).toBe("x");
    expect(h.events.some((e) => e.type === "startup.scored")).toBe(true);
  });
});

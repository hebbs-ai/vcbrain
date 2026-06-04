// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { deepMerge } from "../src/util/merge.js";

describe("deepMerge (living dossier)", () => {
  it("merges nested objects and lets patch scalars/arrays win", () => {
    const base = {
      header: { legalName: "Acme", hq: "SF" },
      founders: [{ name: "Jane" }],
      product: { problem: "old" },
    };
    const patch = {
      header: { hq: "NYC", stage: "seed" },
      founders: [{ name: "Jane" }, { name: "Bo" }],
      product: { solution: "new" },
    };
    const out = deepMerge(base, patch);
    expect(out.header).toEqual({ legalName: "Acme", hq: "NYC", stage: "seed" });
    expect(out.founders).toEqual([{ name: "Jane" }, { name: "Bo" }]); // array replaced
    expect(out.product).toEqual({ problem: "old", solution: "new" }); // object merged
  });

  it("ignores undefined patch values and does not mutate base", () => {
    const base = { a: 1, nested: { x: 1 } };
    const out = deepMerge(base, { a: undefined, nested: { y: 2 } });
    expect(out.a).toBe(1);
    expect(out.nested).toEqual({ x: 1, y: 2 });
    expect(base.nested).toEqual({ x: 1 }); // base untouched
  });
});

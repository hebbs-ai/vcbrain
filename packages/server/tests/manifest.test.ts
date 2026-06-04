// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createVcbrainModule } from "../src/module.js";

const moduleJsonPath = join(import.meta.dirname, "..", "module.json");

function build() {
  return createVcbrainModule({
    db: null as unknown,
  } as Parameters<typeof createVcbrainModule>[0]);
}

describe("vcbrain module.json", () => {
  it("static manifest carries only pack-time fields", async () => {
    const json = JSON.parse(await readFile(moduleJsonPath, "utf8")) as Record<string, unknown>;
    expect(json.id).toBe("vcbrain");
    expect(json.version).toBe("0.8.1");
    expect(json.entry).toBeDefined();
    expect(json.ui).toBeDefined();
    expect(json.publisher).toBeDefined();
    expect(json.license).toBeDefined();
    expect(json.minFrameworkVersion).toBeDefined();
    // Factory-owned fields must NOT be in the static manifest.
    expect(json.name).toBeUndefined();
    expect(json.description).toBeUndefined();
    expect(json.kind).toBeUndefined();
  });
});

describe("vcbrain factory", () => {
  it("exposes the canonical manifest fields", () => {
    const mod = build();
    expect(mod.id).toBe("vcbrain");
    expect(mod.version).toBe("0.8.1");
    expect(mod.name).toBe("VCBrain");
    expect(mod.kind).toBe("module");
    expect(mod.provides).toEqual(["vcbrain-source", "vcbrain-actions"]);
    expect(mod.schema?.length).toBeGreaterThan(0);
  });

  it("registers the Phase 1 core tools", () => {
    const names = new Set((build().tools ?? []).map((t) => t.name));
    for (const t of [
      "startups.upsert",
      "startups.list",
      "startups.get",
      "startups.update",
      "theses.list",
      "theses.create",
      "theses.update",
      "theses.activate",
      "theses.backtest",
      "memos.draft",
      "memos.publish",
      "portfolio.record_signal",
      "portfolio.list_signals",
    ]) {
      expect(names.has(t), `missing tool ${t}`).toBe(true);
    }
  });

  it("every tool has a description and a Zod input schema", () => {
    for (const tool of build().tools ?? []) {
      expect(tool.description, `${tool.name} description`).toBeTruthy();
      expect(typeof (tool.inputs as { safeParse?: unknown })?.safeParse).toBe("function");
    }
  });
});

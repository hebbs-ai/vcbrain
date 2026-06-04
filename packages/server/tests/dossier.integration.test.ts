// SPDX-License-Identifier: GPL-3.0-or-later
//
// Phase 3 — living dossier + file parse tracking. DB-backed; needs VCBRAIN_TEST_DB.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Tool, ToolContext } from "@boringos/module-sdk";
import { createStartupTools } from "../src/tools/startups.js";
import { createInboxTools } from "../src/tools/inbox.js";
import { connect, cleanup, ctx, testTenant, hasDb, type Harness } from "./db-helper.js";

const d = hasDb ? describe : describe.skip;
function byName(tools: Tool[], name: string): Tool {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not found`);
  return t;
}
const call = (t: Tool, input: unknown, c: ReturnType<typeof ctx>) =>
  t.handler(input as never, c as unknown as ToolContext);

d("Phase 3 — living dossier (DB-backed)", () => {
  let h: Harness;
  const tenant = testTenant("phase3");
  let startupId = "";

  beforeAll(async () => {
    h = connect();
    await cleanup(h.db, tenant);
    const upsert = byName(createStartupTools(h.deps), "startups.upsert");
    startupId = ((await call(upsert, { name: "Acme", website: "acme.ai" }, ctx(tenant))) as any).result.startupId;
  });
  afterAll(async () => {
    if (h) {
      await cleanup(h.db, tenant);
      await h.close();
    }
  });

  it("patch_dossier merges across passes and bumps version", async () => {
    const patch = byName(createStartupTools(h.deps), "startups.patch_dossier");

    const r1 = (await call(patch, { id: startupId, patch: { header: { legalName: "Acme AI" }, product: { problem: "ops toil" } } }, ctx(tenant))) as any;
    expect(r1.result.version).toBe(1);

    const r2 = (await call(patch, { id: startupId, patch: { header: { hq: "SF" }, traction: { arr: "$1.2M" } } }, ctx(tenant))) as any;
    expect(r2.result.version).toBe(2);

    const dossier = r2.result.data.dossier;
    expect(dossier.header).toEqual({ legalName: "Acme AI", hq: "SF" }); // merged, not replaced
    expect(dossier.product.problem).toBe("ops toil"); // earlier pass preserved
    expect(dossier.traction.arr).toBe("$1.2M");
    expect(typeof dossier.enrichedAt).toBe("string");
  });

  it("files.get returns text content; mark_parsed stamps parsedAt", async () => {
    const inbox = createInboxTools(h.deps);
    const filesIngest = byName(inbox, "files.ingest");
    const getFile = byName(inbox, "files.get");
    const markParsed = byName(inbox, "files.mark_parsed");
    const listFiles = byName(inbox, "files.list");

    const note = Buffer.from("traction: 1200 paying teams", "utf8").toString("base64");
    await call(filesIngest, { startupId, messageId: "m9", attachments: [{ filename: "notes.txt", mimeType: "text/plain", contentBase64: note }] }, ctx(tenant));
    const fileId = ((await call(listFiles, { startupId }, ctx(tenant))) as any).result.data[0].id;

    const got = (await call(getFile, { id: fileId }, ctx(tenant))) as any;
    expect(got.result.textContent).toContain("1200 paying teams");
    expect(got.result.drivePath).toContain(`vcbrain/startups/${startupId}/`);

    const marked = (await call(markParsed, { startupId }, ctx(tenant))) as any;
    expect(marked.result.updated).toBeGreaterThanOrEqual(1);
    const after = (await call(listFiles, { startupId }, ctx(tenant))) as any;
    expect(after.result.data[0].parsedAt).not.toBeNull();
  });
});

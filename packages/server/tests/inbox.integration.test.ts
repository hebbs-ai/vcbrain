// SPDX-License-Identifier: GPL-3.0-or-later
//
// Phase 2 — email intake + attachments→drive. DB-backed; needs VCBRAIN_TEST_DB.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Tool, ToolContext } from "@boringos/module-sdk";
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

d("Phase 2 — inbox + files (DB-backed)", () => {
  let h: Harness;
  const tenant = testTenant("phase2");

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

  it("inbox.ingest creates a deduped startup from explicit email fields", async () => {
    const tools = createInboxTools(h.deps);
    const ingest = byName(tools, "inbox.ingest");

    const r1 = (await call(ingest, { fromEmail: "jane@acme.ai", fromName: "Jane", subject: "Acme — seed round" }, ctx(tenant))) as any;
    expect(r1.ok).toBe(true);
    expect(r1.result.created).toBe(true);
    const id = r1.result.startupId;

    // A second email from the same company domain maps onto the same startup.
    const r2 = (await call(ingest, { fromEmail: "ops@acme.ai", subject: "follow up" }, ctx(tenant))) as any;
    expect(r2.result.created).toBe(false);
    expect(r2.result.startupId).toBe(id);

    const rows = (await h.db.execute(
      `SELECT name, domain FROM vc__startups WHERE tenant_id = '${tenant}'`,
    )) as unknown as Array<{ name: string; domain: string }>;
    expect(rows.length).toBe(1);
    expect(rows[0]!.domain).toBe("acme.ai");
    expect(rows[0]!.name).toBe("Acme");
  });

  it("files.ingest writes attachments to drive and dedupes re-sync", async () => {
    const startupTools = createInboxTools(h.deps); // inbox tools include files.*
    const filesIngest = byName(startupTools, "files.ingest");
    const filesList = byName(startupTools, "files.list");

    const id = (
      (await h.db.execute(`SELECT id FROM vc__startups WHERE tenant_id = '${tenant}' LIMIT 1`)) as unknown as Array<{ id: string }>
    )[0]!.id;

    const deckBytes = Buffer.from("%PDF-1.7 acme deck", "utf8").toString("base64");
    const r1 = (await call(
      filesIngest,
      { startupId: id, messageId: "msg-1", attachments: [{ filename: "Acme Pitch.pdf", mimeType: "application/pdf", contentBase64: deckBytes }] },
      ctx(tenant),
    )) as any;
    expect(r1.result.ingested).toBe(1);
    expect(r1.result.files[0].kind).toBe("deck");

    // Bytes landed in drive at the expected path.
    const drivePath = `vcbrain/startups/${id}/Acme_Pitch.pdf`;
    expect(h.drive.has(drivePath)).toBe(true);
    expect(new TextDecoder().decode(h.drive.get(drivePath)!)).toContain("acme deck");

    // Re-sync of the same message+filename does not duplicate.
    const r2 = (await call(
      filesIngest,
      { startupId: id, messageId: "msg-1", attachments: [{ filename: "Acme Pitch.pdf", mimeType: "application/pdf", contentBase64: deckBytes }] },
      ctx(tenant),
    )) as any;
    expect(r2.result.ingested).toBe(0);

    const listed = (await call(filesList, { startupId: id }, ctx(tenant))) as any;
    expect(listed.result.total).toBe(1);
  });

  it("files.ingest soft-skips when no source is provided", async () => {
    const filesIngest = byName(createInboxTools(h.deps), "files.ingest");
    const id = (
      (await h.db.execute(`SELECT id FROM vc__startups WHERE tenant_id = '${tenant}' LIMIT 1`)) as unknown as Array<{ id: string }>
    )[0]!.id;
    const r = (await call(filesIngest, { startupId: id }, ctx(tenant))) as any;
    expect(r.result.ingested).toBe(0);
    expect(r.result.skipped).toBe("no_source");
  });
});

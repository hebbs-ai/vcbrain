// SPDX-License-Identifier: GPL-3.0-or-later
//
// Email-intake tools (proposal View 1, email channel). `inbox.ingest`
// turns an inbound email (a framework inbox item, or explicit fields)
// into a deduped startup lead; `files.ingest` downloads the email's
// attachments into drive and records them for vc-research to scan.
// Dispatched at /api/tools/vcbrain.inbox.<verb> and vcbrain.files.<verb>.

import { z } from "@boringos/module-sdk";
import type { Tool, ToolContext, ToolResult } from "@boringos/module-sdk";
import { and, eq, sql } from "drizzle-orm";
import { startupFiles } from "../schema/files.js";
import { emitVc, type VcDeps } from "./deps.js";
import { upsertStartup } from "./startups.js";
import { resolveCompanyDomain, domainFromEmail } from "../util/domain.js";
import { parseSender, companyNameFromDomain, classifyFile, sanitizeFilename } from "../util/email.js";
import { resolveGmail, listAttachments, fetchAttachmentBytes } from "../google-client.js";

interface InboxRow {
  id: string;
  source: string | null;
  source_id: string | null;
  subject: string | null;
  body: string | null;
  from: string | null;
}

export interface ProvidedAttachment {
  filename: string;
  mimeType?: string;
  /** base64-encoded bytes. Lets the form/webhook channel and tests inject files directly. */
  contentBase64: string;
}

/**
 * Fetch a message's attachments (from Gmail, or accept provided bytes),
 * write each into drive under vcbrain/startups/<id>/, and record a
 * vc__startup_files row. Returns how many landed. Soft-skips when there's
 * no drive or no Gmail connection.
 */
export async function ingestFiles(
  deps: VcDeps,
  tenantId: string,
  input: { startupId: string; messageId?: string | null; attachments?: ProvidedAttachment[] },
): Promise<{ ingested: number; skipped?: string; files: { filename: string; drivePath: string; kind: string }[] }> {
  const drive = deps.getDrive();
  if (!drive) return { ingested: 0, skipped: "no_drive", files: [] };

  // Gather (filename, mimeType, bytes) tuples either from explicit input or Gmail.
  let items: { filename: string; mimeType: string; bytes: Buffer }[] = [];
  if (input.attachments?.length) {
    items = input.attachments.map((a) => ({
      filename: a.filename,
      mimeType: a.mimeType ?? "application/octet-stream",
      bytes: Buffer.from(a.contentBase64, "base64"),
    }));
  } else if (input.messageId) {
    const gmail = await resolveGmail(deps);
    if (!gmail) return { ingested: 0, skipped: "no_gmail", files: [] };
    const message = await gmail.client.getMessage(input.messageId);
    const metas = listAttachments(message);
    for (const m of metas) {
      const bytes = await fetchAttachmentBytes(gmail.getToken, input.messageId, m.attachmentId);
      items.push({ filename: m.filename, mimeType: m.mimeType, bytes });
    }
  } else {
    return { ingested: 0, skipped: "no_source", files: [] };
  }

  const written: { filename: string; drivePath: string; kind: string }[] = [];
  for (const it of items) {
    const kind = classifyFile(it.filename, it.mimeType);
    const drivePath = `vcbrain/startups/${input.startupId}/${sanitizeFilename(it.filename)}`;
    await drive.write(drivePath, it.bytes);
    // Dedup on (tenant, startup, message, filename) — re-sync shouldn't duplicate.
    const inserted = (await deps.db.execute(sql`
      INSERT INTO vc__startup_files
        (tenant_id, startup_id, drive_path, filename, kind, mime_type, source_message_id, created_at)
      VALUES (${tenantId}, ${input.startupId}, ${drivePath}, ${it.filename}, ${kind}, ${it.mimeType},
              ${input.messageId ?? null}, now())
      ON CONFLICT DO NOTHING
      RETURNING id
    `)) as unknown as Array<{ id: string }>;
    if (inserted.length) written.push({ filename: it.filename, drivePath, kind });
  }

  if (written.length) {
    emitVc(deps, "startup.files_ingested", tenantId, {
      entityType: "vcbrain_startup",
      entityId: input.startupId,
      count: written.length,
      hasDeck: written.some((w) => w.kind === "deck"),
    });
  }
  return { ingested: written.length, files: written };
}

export function createInboxTools(deps: VcDeps): Tool[] {
  const ingest: Tool = {
    name: "inbox.ingest",
    description:
      "Turn an inbound email into a deduped startup lead. Pass either a framework inbox `itemId` (the tool reads the item) or explicit email fields. Derives the company domain, upserts the startup, and pulls any attachments into drive. Wakes vc-research on a new lead.",
    inputs: z.object({
      itemId: z.string().uuid().optional(),
      fromEmail: z.string().optional(),
      fromName: z.string().optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      companyName: z.string().optional(),
      website: z.string().optional(),
      sourceMessageId: z.string().optional(),
      sourceChannel: z.enum(["email", "form"]).optional(),
      sourceDetail: z.string().optional(),
    }),
    async handler(
      input: {
        itemId?: string;
        fromEmail?: string;
        fromName?: string;
        subject?: string;
        body?: string;
        companyName?: string;
        website?: string;
        sourceMessageId?: string;
        sourceChannel?: "email" | "form";
        sourceDetail?: string;
      },
      ctx: ToolContext,
    ): Promise<ToolResult> {
      let fromRaw = input.fromEmail ? `${input.fromName ?? ""} <${input.fromEmail}>` : input.fromName ?? null;
      let subject = input.subject ?? null;
      let messageId = input.sourceMessageId ?? null;
      let source = input.sourceChannel ?? "email";

      if (input.itemId) {
        const rows = (await deps.db.execute(sql`
          SELECT id, source, source_id, subject, body, "from"
          FROM inbox_items
          WHERE id = ${input.itemId} AND tenant_id = ${ctx.tenantId}
          LIMIT 1
        `)) as unknown as InboxRow[];
        const row = rows[0];
        if (!row) {
          return { ok: false, error: { code: "not_found", message: "Inbox item not found", retryable: false } };
        }
        fromRaw = row.from ?? fromRaw;
        subject = row.subject ?? subject;
        if (row.source === "gmail" || row.source === "google") messageId = row.source_id ?? messageId;
      }

      const { name: senderName, email: senderEmail } = parseSender(fromRaw);
      const domain = resolveCompanyDomain({ website: input.website, senderEmail });
      const name =
        input.companyName?.trim() ||
        companyNameFromDomain(domain) ||
        senderName ||
        domainFromEmail(senderEmail) ||
        senderEmail ||
        "Unknown startup";
      const oneLiner = subject ?? undefined;

      const res = await upsertStartup(deps, ctx.tenantId, {
        name,
        domain: domain ?? undefined,
        website: input.website,
        senderEmail: senderEmail ?? undefined,
        oneLiner,
        sourceChannel: source,
        sourceDetail: input.sourceDetail ?? (input.itemId ? `inbox-item:${input.itemId}` : undefined),
      });

      let files = { ingested: 0, skipped: undefined as string | undefined };
      if (messageId) {
        const r = await ingestFiles(deps, ctx.tenantId, { startupId: res.startupId, messageId });
        files = { ingested: r.ingested, skipped: r.skipped };
      }

      return { ok: true, result: { ...res, attachments: files } };
    },
  };

  const filesIngest: Tool = {
    name: "files.ingest",
    description:
      "Download a startup's email attachments into drive and record them for scanning. Provide a Gmail `messageId` to pull from the connected inbox, or pass `attachments` (base64) directly (form/webhook channel). Returns how many files landed; soft-skips when no drive or Gmail connection is available.",
    inputs: z.object({
      startupId: z.string().uuid(),
      messageId: z.string().optional(),
      attachments: z
        .array(z.object({ filename: z.string(), mimeType: z.string().optional(), contentBase64: z.string() }))
        .optional(),
    }),
    async handler(
      input: { startupId: string; messageId?: string; attachments?: ProvidedAttachment[] },
      ctx: ToolContext,
    ): Promise<ToolResult> {
      const r = await ingestFiles(deps, ctx.tenantId, {
        startupId: input.startupId,
        messageId: input.messageId ?? null,
        attachments: input.attachments,
      });
      return { ok: true, result: r };
    },
  };

  const listFiles: Tool = {
    name: "files.list",
    description: "List the files recorded for a startup (decks/docs in drive).",
    inputs: z.object({ startupId: z.string().uuid() }),
    async handler(input: { startupId: string }, ctx: ToolContext): Promise<ToolResult> {
      const rows = await deps.db
        .select()
        .from(startupFiles)
        .where(and(eq(startupFiles.tenantId, ctx.tenantId), eq(startupFiles.startupId, input.startupId)));
      return { ok: true, result: { data: rows, total: rows.length } };
    },
  };

  const getFile: Tool = {
    name: "files.get",
    description:
      "Fetch a recorded file's metadata + drivePath. For text files, returns `textContent`. For binary decks (PDF/PPTX), text extraction is not done here — read the deck with the framework `drive.read` tool, or your native file Read tool, at the returned `drivePath`.",
    inputs: z.object({ id: z.string().uuid() }),
    async handler(input: { id: string }, ctx: ToolContext): Promise<ToolResult> {
      const [row] = await deps.db
        .select()
        .from(startupFiles)
        .where(and(eq(startupFiles.id, input.id), eq(startupFiles.tenantId, ctx.tenantId)))
        .limit(1);
      if (!row) {
        return { ok: false, error: { code: "not_found", message: "File not found", retryable: false } };
      }
      let textContent: string | null = null;
      const isText = row.kind === "doc" && /\.(txt|md|csv|html?|json)$/i.test(row.filename);
      const drive = deps.getDrive();
      if (isText && drive) {
        try {
          const raw = await drive.read(row.drivePath);
          textContent =
            typeof raw === "string"
              ? raw
              : raw instanceof Uint8Array
                ? new TextDecoder().decode(raw)
                : null;
          if (textContent && textContent.length > 200_000) textContent = textContent.slice(0, 200_000);
        } catch {
          textContent = null;
        }
      }
      return { ok: true, result: { data: row, drivePath: row.drivePath, textContent } };
    },
  };

  const markParsed: Tool = {
    name: "files.mark_parsed",
    description:
      "Stamp a file (or every file of a startup) as parsed once vc-research has folded its contents into the dossier. Prevents re-scanning the same deck.",
    inputs: z.object({ id: z.string().uuid().optional(), startupId: z.string().uuid().optional() }),
    async handler(input: { id?: string; startupId?: string }, ctx: ToolContext): Promise<ToolResult> {
      if (!input.id && !input.startupId) {
        return { ok: false, error: { code: "invalid_input", message: "Pass id or startupId", retryable: false } };
      }
      const conds = [eq(startupFiles.tenantId, ctx.tenantId)];
      if (input.id) conds.push(eq(startupFiles.id, input.id));
      if (input.startupId) conds.push(eq(startupFiles.startupId, input.startupId));
      const updated = await deps.db
        .update(startupFiles)
        .set({ parsedAt: new Date() })
        .where(and(...conds))
        .returning();
      return { ok: true, result: { updated: updated.length } };
    },
  };

  return [ingest, filesIngest, listFiles, getFile, markParsed];
}

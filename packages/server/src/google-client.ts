// SPDX-License-Identifier: GPL-3.0-or-later
//
// Resolves a Gmail client for the tenant's "google" connector binding and
// pulls email attachments. The framework's connector-google ≥0.2.13 ships
// typed `getAttachment`/`listAttachments` helpers (added in this work), but
// the module pins the published 0.2.12, so we fetch attachment bytes via
// the already-published `fetchWithAuth` helper plus a local parts-walker.
// Switch to the typed client methods once the module bumps to ≥0.2.13.

import { GmailClient, fetchWithAuth, type GmailMessage } from "@boringos/connector-google";
import type { VcDeps } from "./tools/deps.js";

const MODULE_ID = "vcbrain";
const PROVIDER = "google";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailAttachmentMeta {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface MimePart {
  mimeType?: string;
  filename?: string;
  body?: { attachmentId?: string; size?: number };
  parts?: MimePart[];
}

/** Resolve a GmailClient + a raw token getter, or null if no account is connected. */
export async function resolveGmail(
  deps: VcDeps,
): Promise<{ client: GmailClient; getToken: () => Promise<string> } | null> {
  const handle = await deps.getConnectorToken(PROVIDER, MODULE_ID);
  if (!handle) return null;
  const getToken = () => handle.getToken();
  return { client: new GmailClient(getToken), getToken };
}

/** Walk the MIME tree and list attachment parts (filename + attachmentId). */
export function listAttachments(message: GmailMessage): GmailAttachmentMeta[] {
  const out: GmailAttachmentMeta[] = [];
  const walk = (parts?: MimePart[]): void => {
    for (const p of parts ?? []) {
      if (p.filename && p.body?.attachmentId) {
        out.push({
          attachmentId: p.body.attachmentId,
          filename: p.filename,
          mimeType: p.mimeType ?? "application/octet-stream",
          size: p.body.size ?? 0,
        });
      }
      if (p.parts) walk(p.parts);
    }
  };
  walk((message.payload?.parts as MimePart[] | undefined) ?? undefined);
  return out;
}

/** Download one attachment's bytes (Gmail returns base64url). */
export async function fetchAttachmentBytes(
  getToken: () => Promise<string>,
  messageId: string,
  attachmentId: string,
): Promise<Buffer> {
  const url = `${GMAIL_API}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`;
  const res = await fetchWithAuth(getToken, fetch, url, { method: "GET" });
  if (!res.ok) throw new Error(`Gmail getAttachment failed: ${res.status}`);
  const body = (await res.json()) as { data?: string; size?: number };
  return Buffer.from(body.data ?? "", "base64url");
}

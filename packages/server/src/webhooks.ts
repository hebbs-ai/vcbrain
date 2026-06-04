// SPDX-License-Identifier: GPL-3.0-or-later
//
// Public-form intake (proposal View 1, form channel). A fund embeds a widget
// that POSTs to /api/webhooks/vcbrain/inbound?t=<token>. The token is a signed,
// per-fund credential that both authenticates the request and carries the
// tenant id (no session needed). Verified leads upsert exactly like email
// intake, so dedup + enrichment happen once.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Webhook, WebhookRequest } from "@boringos/module-sdk";
import { upsertStartup } from "./tools/startups.js";
import { ingestFiles, type ProvidedAttachment } from "./tools/inbox.js";
import type { VcDeps } from "./tools/deps.js";

function secret(): string {
  return process.env.VCBRAIN_FORM_SECRET || "vcbrain-dev-form-secret";
}

/** Mint a per-fund form token: base64url(tenantId).hmac(tenantId). */
export function signFormToken(tenantId: string, s: string = secret()): string {
  const mac = createHmac("sha256", s).update(tenantId).digest("hex");
  return `${Buffer.from(tenantId).toString("base64url")}.${mac}`;
}

/** Verify a form token and return the tenant id, or null if invalid. */
export function verifyFormToken(token: string | undefined, s: string = secret()): string | null {
  if (!token || !token.includes(".")) return null;
  const [b64, mac] = token.split(".");
  if (!b64 || !mac) return null;
  let tenantId: string;
  try {
    tenantId = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = createHmac("sha256", s).update(tenantId).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return tenantId;
}

function tokenFrom(req: WebhookRequest): string | undefined {
  return req.query.t || req.query.token || req.headers["x-vcbrain-token"];
}

interface FormBody {
  name?: string;
  company?: string;
  website?: string;
  founderEmail?: string;
  email?: string;
  oneLiner?: string;
  message?: string;
  attachments?: ProvidedAttachment[];
}

export function createVcbrainWebhooks(deps: VcDeps): Webhook[] {
  const inbound: Webhook = {
    event: "inbound",
    description:
      "Public startup-submission form. POST JSON { name, website, founderEmail, oneLiner } with a signed per-fund token (?t=...). Creates a deduped lead in the Sourced stage.",
    async verify(request) {
      return verifyFormToken(tokenFrom(request)) !== null;
    },
    async handler(request) {
      const tenantId = verifyFormToken(tokenFrom(request));
      if (!tenantId) return; // verify already gates this; belt-and-suspenders
      let body: FormBody = {};
      try {
        body = JSON.parse(request.body || "{}") as FormBody;
      } catch {
        return;
      }
      const name = (body.name || body.company || "").trim();
      const senderEmail = body.founderEmail || body.email;
      if (!name && !body.website && !senderEmail) return; // nothing to create

      const res = await upsertStartup(deps, tenantId, {
        name: name || "Untitled submission",
        website: body.website,
        senderEmail: senderEmail ?? undefined,
        oneLiner: body.oneLiner || body.message || undefined,
        sourceChannel: "form",
        sourceDetail: "public form",
      });
      if (body.attachments?.length) {
        await ingestFiles(deps, tenantId, { startupId: res.startupId, attachments: body.attachments });
      }
    },
  };
  return [inbound];
}

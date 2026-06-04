// SPDX-License-Identifier: GPL-3.0-or-later
//
// Domain helpers for startup dedup. A founder's free-mail address tells
// us nothing about the company, so we derive the company domain from the
// pitch/website and treat consumer domains as "no company domain".

import { CONSUMER_EMAIL_DOMAINS } from "@boringos-vcbrain/shared";

/** Lowercase host portion of a URL or bare domain; null if unparseable. */
export function normalizeDomain(input?: string | null): string | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.split("/")[0]!.split("?")[0]!.split("#")[0]!;
  // Strip a leading "@" (someone passed "@acme.com").
  s = s.replace(/^@/, "");
  if (!s.includes(".")) return null;
  return s;
}

/** Domain portion of an email address, lowercased; null if not an email. */
export function domainFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const at = email.trim().toLowerCase().split("@");
  if (at.length !== 2 || !at[1]) return null;
  return at[1].includes(".") ? at[1] : null;
}

export function isConsumerDomain(domain?: string | null): boolean {
  if (!domain) return false;
  return CONSUMER_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/**
 * Best-effort company domain from a mix of signals. Prefers an explicit
 * website/domain; falls back to the sender's email domain only when it is
 * NOT a consumer provider.
 */
export function resolveCompanyDomain(opts: {
  website?: string | null;
  domain?: string | null;
  senderEmail?: string | null;
}): string | null {
  const explicit = normalizeDomain(opts.domain) ?? normalizeDomain(opts.website);
  if (explicit && !isConsumerDomain(explicit)) return explicit;
  const fromEmail = domainFromEmail(opts.senderEmail);
  if (fromEmail && !isConsumerDomain(fromEmail)) return fromEmail;
  return explicit ?? null;
}

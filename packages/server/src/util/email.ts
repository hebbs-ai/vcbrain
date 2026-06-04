// SPDX-License-Identifier: MIT
//
// Email/attachment parsing helpers for the intake path.

/** Parse "Display Name <addr@host>" (or a bare address) into name + email. */
export function parseSender(raw?: string | null): { name: string | null; email: string | null } {
  if (!raw) return { name: null, email: null };
  const s = raw.trim();
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) {
    const name = m[1]?.trim() || null;
    const email = m[2]?.trim().toLowerCase() || null;
    return { name, email };
  }
  if (s.includes("@")) return { name: null, email: s.toLowerCase() };
  return { name: s, email: null };
}

/** "acme.ai" → "Acme"; best-effort company label from a domain. */
export function companyNameFromDomain(domain?: string | null): string | null {
  if (!domain) return null;
  const label = domain.split(".")[0];
  if (!label) return null;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const DECK_EXTS = new Set(["pdf", "ppt", "pptx", "key", "keynote"]);
const DOC_EXTS = new Set(["doc", "docx", "pages", "txt", "md", "rtf"]);

/** Classify an attachment for the dossier: pitch deck vs. supporting doc. */
export function classifyFile(filename: string, mimeType?: string | null): "deck" | "doc" | "other" {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (DECK_EXTS.has(ext)) return "deck";
  if (DOC_EXTS.has(ext)) return "doc";
  const mt = (mimeType ?? "").toLowerCase();
  if (mt.includes("presentation")) return "deck";
  if (mt === "application/pdf") return "deck"; // a PDF emailed to a VC is almost always a deck
  if (mt.includes("word") || mt.startsWith("text/")) return "doc";
  return "other";
}

/** Filesystem-safe filename for the drive path. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 180) || "file";
}

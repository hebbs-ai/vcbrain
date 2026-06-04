// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { parseSender, companyNameFromDomain, classifyFile, sanitizeFilename } from "../src/util/email.js";

describe("email/attachment helpers", () => {
  it("parses sender display names and bare addresses", () => {
    expect(parseSender("Jane Founder <jane@acme.ai>")).toEqual({ name: "Jane Founder", email: "jane@acme.ai" });
    expect(parseSender('"Acme, Inc." <hi@acme.ai>')).toEqual({ name: "Acme, Inc.", email: "hi@acme.ai" });
    expect(parseSender("solo@acme.ai")).toEqual({ name: null, email: "solo@acme.ai" });
    expect(parseSender(null)).toEqual({ name: null, email: null });
  });

  it("derives a company label from a domain", () => {
    expect(companyNameFromDomain("acme.ai")).toBe("Acme");
    expect(companyNameFromDomain(null)).toBeNull();
  });

  it("classifies decks vs docs", () => {
    expect(classifyFile("Pitch.pdf")).toBe("deck");
    expect(classifyFile("deck.pptx")).toBe("deck");
    expect(classifyFile("notes.docx")).toBe("doc");
    expect(classifyFile("logo.png", "image/png")).toBe("other");
    expect(classifyFile("x", "application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("deck");
  });

  it("sanitizes filenames for drive paths", () => {
    expect(sanitizeFilename("Acme Pitch (v2).pdf")).toBe("Acme_Pitch_v2_.pdf");
    expect(sanitizeFilename("../../etc/passwd")).toBe(".._.._etc_passwd");
  });
});

// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  domainFromEmail,
  isConsumerDomain,
  resolveCompanyDomain,
} from "../src/util/domain.js";

describe("domain helpers", () => {
  it("normalizes URLs and bare domains", () => {
    expect(normalizeDomain("https://www.Acme.com/about?x=1")).toBe("acme.com");
    expect(normalizeDomain("acme.io")).toBe("acme.io");
    expect(normalizeDomain("@acme.dev")).toBe("acme.dev");
    expect(normalizeDomain("not-a-domain")).toBeNull();
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain(null)).toBeNull();
  });

  it("extracts the email domain", () => {
    expect(domainFromEmail("Jane@Acme.com")).toBe("acme.com");
    expect(domainFromEmail("bad")).toBeNull();
    expect(domainFromEmail(null)).toBeNull();
  });

  it("flags consumer providers", () => {
    expect(isConsumerDomain("gmail.com")).toBe(true);
    expect(isConsumerDomain("acme.com")).toBe(false);
  });

  it("prefers explicit company domain over a free-mail sender", () => {
    expect(
      resolveCompanyDomain({ website: "https://acme.com", senderEmail: "founder@gmail.com" }),
    ).toBe("acme.com");
    // No website → fall back to a non-consumer sender domain.
    expect(resolveCompanyDomain({ senderEmail: "ceo@acme.co" })).toBe("acme.co");
    // Only a free-mail sender → no reliable company domain.
    expect(resolveCompanyDomain({ senderEmail: "ceo@gmail.com" })).toBeNull();
  });
});

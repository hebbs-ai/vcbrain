// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { signFormToken, verifyFormToken } from "../src/webhooks.js";

describe("public-form token", () => {
  const secret = "test-secret";
  const tenant = "11111111-2222-4333-8444-555555555555";

  it("round-trips a signed token to the tenant id", () => {
    const token = signFormToken(tenant, secret);
    expect(verifyFormToken(token, secret)).toBe(tenant);
  });

  it("rejects a tampered or wrong-secret token", () => {
    const token = signFormToken(tenant, secret);
    expect(verifyFormToken(token, "other-secret")).toBeNull();
    expect(verifyFormToken(token.slice(0, -2) + "00", secret)).toBeNull();
    expect(verifyFormToken("garbage", secret)).toBeNull();
    expect(verifyFormToken(undefined, secret)).toBeNull();
  });
});

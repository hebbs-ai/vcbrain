// SPDX-License-Identifier: MIT
//
// @boringos-vcbrain/server — public surface for the VCBrain module.
//
//   import { createVcbrainModule } from "@boringos-vcbrain/server";
//   app.module(createVcbrainModule);
//
// `defaultInstall: false` — tenants opt in via the install API. On
// install: schema migrations run, then `lifecycle.onInstall` seeds the
// starter thesis (and, in later phases, agents/workflows/routines).

export { createVcbrainModule } from "./module.js";

// Re-export Drizzle schema for hosts that want to query vc__ tables.
export * from "./schema/index.js";

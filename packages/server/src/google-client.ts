// SPDX-License-Identifier: MIT
//
// Resolves a Gmail client for the tenant's "google" connector binding.
// connector-google >=0.2.13 ships typed `getAttachment` / `listAttachments`
// on GmailClient (added by this project), so the module uses those directly —
// no local parts-walker or raw fetch needed.

import { GmailClient } from "@boringos/connector-google";
import type { VcDeps } from "./tools/deps.js";

const MODULE_ID = "vcbrain";
const PROVIDER = "google";

/** Resolve a GmailClient for the tenant, or null if no account is connected. */
export async function resolveGmail(deps: VcDeps): Promise<{ client: GmailClient } | null> {
  const handle = await deps.getConnectorToken(PROVIDER, MODULE_ID);
  if (!handle) return null;
  return { client: new GmailClient(() => handle.getToken()) };
}

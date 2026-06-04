// SPDX-License-Identifier: MIT
//
// Aggregates every VCBrain tool factory into the array passed to
// `Module.tools`. Dispatch URL pattern: /api/tools/vcbrain.<group>.<verb>

import type { Tool } from "@boringos/module-sdk";
import { createStartupTools } from "./startups.js";
import { createThesisTools } from "./theses.js";
import { createMemoTools } from "./memos.js";
import { createPortfolioTools } from "./portfolio.js";
import { createInboxTools } from "./inbox.js";
import type { VcDeps } from "./deps.js";

export function createVcbrainTools(deps: VcDeps): Tool[] {
  return [
    ...createStartupTools(deps),
    ...createThesisTools(deps),
    ...createMemoTools(deps),
    ...createPortfolioTools(deps),
    ...createInboxTools(deps),
  ];
}

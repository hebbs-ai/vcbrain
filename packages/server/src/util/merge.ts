// SPDX-License-Identifier: GPL-3.0-or-later
//
// Deep-merge for the living dossier: re-running vc-research merges new
// findings into the existing brief rather than replacing it. Plain objects
// merge recursively; arrays and scalars from the patch win (last writer).

type Json = Record<string, unknown>;

function isPlainObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function deepMerge(base: Json, patch: Json): Json {
  const out: Json = { ...base };
  for (const [k, pv] of Object.entries(patch)) {
    if (pv === undefined) continue;
    const bv = out[k];
    if (isPlainObject(bv) && isPlainObject(pv)) {
      out[k] = deepMerge(bv, pv);
    } else {
      out[k] = pv;
    }
  }
  return out;
}

/**
 * Sealed-pack registry (SERVER-ONLY).
 *
 * Sealed pack content (solution.md, the phase-2 payload, buggy_output, debrief rubric)
 * compiles into per-pack modules `lib/scenarios/sealed/<pack-id>.server.ts`, each
 * exporting `sealed: SealedPackContent`. This registry is the ONLY loader for them and
 * is imported ONLY by the phase-2 release endpoint and the debrief path — never by any
 * client-reachable module (enforced by the sealing import-graph test).
 *
 * There is no `server-only` package in this repo (the convention is `.server.ts` +
 * Admin SDK); this runtime guard is the equivalent seal — importing sealed content in
 * the browser throws immediately instead of silently bundling the answer.
 */

import type { SealedPackContent } from "@/lib/bugfix/packs/types"

if (typeof window !== "undefined") {
  throw new Error("Sealed pack content must never load in the browser.")
}

/**
 * packId -> lazy loader. Add a line here when a pack is compiled (generate-pack.md
 * Step 4). Kept as dynamic imports so a sealed module is only ever pulled into the
 * server bundle when its pack is actually played.
 */
const SEALED_PACK_LOADERS: Record<string, () => Promise<{ sealed: SealedPackContent }>> = {
  // Populated by generate-pack.md Step 4, e.g.
  //   "pack-id": () => import("./pack-id.server"),
}

export function hasSealedPack(packId: string): boolean {
  return Object.prototype.hasOwnProperty.call(SEALED_PACK_LOADERS, packId)
}

export async function loadSealedPack(packId: string): Promise<SealedPackContent | null> {
  const loader = SEALED_PACK_LOADERS[packId]
  if (!loader) return null
  const mod = await loader()
  return mod.sealed
}

export function sealedPackIds(): string[] {
  return Object.keys(SEALED_PACK_LOADERS)
}

/**
 * Pure phase-2 release decision (PLAN.md Sprint 1 item 5). Kept separate from the
 * route so the state gate is unit-testable: the sealed spec/fixture patch is released
 * ONLY once the machine has entered PHASE2.
 */

import { phase2Unlocked, type PackProgress } from "./machine"
import type { PackPhase2, SealedPackContent } from "./types"

export interface Phase2Release {
  released: boolean
  reason: string
  payload?: PackPhase2
}

export function buildPhase2Release(
  progress: PackProgress | null,
  sealed: SealedPackContent | null
): Phase2Release {
  if (!progress || !phase2Unlocked(progress)) {
    return { released: false, reason: "Session has not reached PHASE2." }
  }
  if (!sealed) {
    return { released: false, reason: "No sealed content is registered for this pack." }
  }
  return { released: true, reason: "PHASE2 reached.", payload: sealed.phase2 }
}

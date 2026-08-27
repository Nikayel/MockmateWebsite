"use client"

/**
 * useGateReveal — the submit screen's staged-reveal clock (UX-SPEC.md §8:
 * "Gates settle in order and are revealed in order, never all at once, never
 * out of order").
 *
 * The real `/attempts/complete` call returns all four `GateResult`s in one
 * synchronous response (there is no per-gate streaming endpoint), so "gates
 * settle in order" is a client-side choreography of an already-fully-known
 * result, not four separate network events. This is still honest per
 * UX-SPEC.md §1.5 ("scoring is determinate and never completes before the
 * result lands"): the full result has already landed before this hook reveals
 * anything, so `revealedCount / 4` never overstates real progress and the
 * final reveal is never a guess.
 *
 * `null` means "no result yet" (the network call is still in flight) —
 * revealedCount stays 0 and nothing is dim-vs-revealed yet; the caller shows
 * its own "queued" state for that case. Passing a non-null result starts the
 * reveal from 0 automatically. `prefers-reduced-motion` collapses the whole
 * sequence to one instant reveal (UX-SPEC.md §14).
 */

import { useEffect, useRef, useState } from "react"
import type { GateResult } from "@/lib/sprint-labs/types"

const GATE_COUNT = 4
const STEP_MS = 650

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

export interface GateRevealState {
  /** 0..4. Also the current Sparra `progress` fraction, over 4. */
  revealedCount: number
  /** True once `revealedCount === 4` for a non-null result. */
  settled: boolean
}

export function useGateReveal(gateResults: GateResult[] | null): GateRevealState {
  const [revealedCount, setRevealedCount] = useState(0)
  // Tracks the specific result reference this hook is currently revealing, so a fresh result
  // (a genuinely new attempt) restarts the count from 0 rather than being ignored as "already running".
  const revealingRef = useRef<GateResult[] | null>(null)

  useEffect(() => {
    if (!gateResults) {
      revealingRef.current = null
      setRevealedCount(0)
      return
    }
    if (revealingRef.current === gateResults) return
    revealingRef.current = gateResults
    setRevealedCount(0)

    if (prefersReducedMotion()) {
      setRevealedCount(GATE_COUNT)
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    for (let step = 1; step <= GATE_COUNT; step++) {
      timers.push(
        setTimeout(() => {
          setRevealedCount(step)
        }, step * STEP_MS)
      )
    }
    return () => {
      timers.forEach(clearTimeout)
    }
  }, [gateResults])

  return { revealedCount, settled: gateResults !== null && revealedCount === GATE_COUNT }
}

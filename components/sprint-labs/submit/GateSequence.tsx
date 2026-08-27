"use client"

/**
 * GateSequence — the four-gate staged reveal (UX-SPEC.md §8). Owns the ONE
 * Sparra on the submit route (§1.5: "two Sparras on one screen is a brand
 * violation") and the staged-reveal clock (`useGateReveal`).
 *
 * `gateResults` is `null` while the attempt is still being opened/completed
 * (queued: all four gates dim, Sparra `thinking`, headline "Waiting for a
 * runner."); once non-null the reveal runs to completion on an already-known
 * result (see `useGateReveal`'s header) and Sparra flips to a one-shot
 * `pass`/`fail` exactly once, driven by `escapedDefects.length` — never by a
 * per-gate pass count, so a ticket that escapes nothing but has an errored
 * aggregate gate still reads as a pass (an infrastructure gap is explicitly
 * "not counted against you", UX-SPEC.md §8 States).
 */

import { useEffect, useRef } from "react"
import { Sparra } from "@/components/brand/Sparra"
import type { GateResult } from "@/lib/sprint-labs/types"
import { GateCard } from "./GateCard"
import { useGateReveal } from "./useGateReveal"
import { buildGateCards, buildHeadline, GATE_ORDER } from "./gate-view-model"

export interface GateSequenceProps {
  ticketKey: string
  /** `null` while the open+complete call is still in flight. */
  gateResults: GateResult[] | null
  escapedDefects: string[]
  /** Fires exactly once, the moment the reveal finishes. */
  onSettled?: () => void
}

export function GateSequence({
  ticketKey,
  gateResults,
  escapedDefects,
  onSettled,
}: GateSequenceProps) {
  const { revealedCount, settled } = useGateReveal(gateResults)
  const cards = buildGateCards(gateResults ?? [], revealedCount)
  const headline = settled ? buildHeadline(ticketKey, escapedDefects) : null

  const firedForRef = useRef<GateResult[] | null>(null)
  useEffect(() => {
    if (settled && gateResults && firedForRef.current !== gateResults) {
      firedForRef.current = gateResults
      onSettled?.()
    }
  }, [settled, gateResults, onSettled])

  const sparraState = !gateResults
    ? "thinking"
    : !settled
      ? "scoring"
      : escapedDefects.length === 0
        ? "pass"
        : "fail"

  const captionText = !gateResults
    ? "Waiting for a runner."
    : !settled
      ? `Running the gates on ${ticketKey}`
      : (headline?.text ?? "")

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <Sparra
          state={sparraState}
          progress={gateResults && !settled ? revealedCount / GATE_ORDER.length : undefined}
          label={captionText}
        />
        <p className="text-center text-sm text-[var(--wb-text-secondary)]">{captionText}</p>
      </div>

      <div aria-live="polite" className="flex w-full flex-col gap-3">
        {cards.map((card, index) => (
          <GateCard
            key={card.id}
            index={index}
            card={card}
            isRunning={!!gateResults && !settled && index === revealedCount}
          />
        ))}
      </div>
    </div>
  )
}

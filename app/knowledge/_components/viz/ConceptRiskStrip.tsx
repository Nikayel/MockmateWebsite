"use client"

import {
  MEMORY_STRENGTH_BANDS,
  displayRetention,
  memoryBandFor,
} from "@/lib/spaced-repetition/memory-bands"
import { memoryColorClass } from "@/lib/ui/memory-colors"
import { cn } from "@/lib/utils"

/**
 * A concept's cards spread across the recall axis, replacing the single mean bar.
 *
 * The mean is the wrong lead statistic. A concept averaging 75% with cards at 96% and
 * 54% is not "75% healthy" — it has a hole in it, and a single bar hides precisely
 * that. The dots show the distribution; the caret keeps the mean available.
 *
 * The dots are buttons, so the strip is a control rather than decoration: the weakest
 * card is both the leftmost mark and one keyboard stop away.
 */

/** Below this the model calls a card at risk — derived, never re-hardcoded. */
const AT_RISK_BELOW = MEMORY_STRENGTH_BANDS.find((b) => b.urgency === "ok")!.floor

export interface RiskStripCard {
  problem_id: string
  title: string
  retrievability: number | null
}

interface ConceptRiskStripProps {
  cards: RiskStripCard[]
  /** The concept's mean retrievability, or null when nothing has been reviewed. */
  mean: number | null
  onSelectCard?: (problemId: string) => void
  className?: string
}

/** Vertical offsets (px) cycled through a run of coincident dots. */
const CLUSTER_LANES = [0, -4, 4]
/** Dots closer than this (in retrievability points) count as one cluster. */
const CLUSTER_EPSILON = 3

export function ConceptRiskStrip({ cards, mean, onSelectCard, className }: ConceptRiskStripProps) {
  const scored = cards.filter(
    (c): c is RiskStripCard & { retrievability: number } => c.retrievability !== null
  )
  if (scored.length === 0) return null

  const sorted = [...scored].sort((a, b) => a.retrievability - b.retrievability)
  const weakest = sorted[0]

  // Lane assignment for clusters. The old nudge only compared each dot to its
  // predecessor, so the 3rd of three coincident dots landed back on the 2nd; a
  // run-length cycle keeps every member of a cluster on its own lane.
  let run = 0
  const lanes = sorted.map((card, i) => {
    run =
      i > 0 && card.retrievability - sorted[i - 1].retrievability < CLUSTER_EPSILON ? run + 1 : 0
    return CLUSTER_LANES[run % CLUSTER_LANES.length]
  })

  return (
    <div className={cn("w-full", className)}>
      {/*
        Two layers on purpose. The track (rounded, clipped) is an underlay; the dots
        live in the outer, unclipped box. With everything in one overflow-hidden
        container, a dot at 0% or 100% was sliced in half by its own -translate-x-1/2.
      */}
      <div
        className="relative h-6"
        role="group"
        aria-label={`${scored.length} problem${scored.length === 1 ? "" : "s"} by recall estimate${
          mean !== null ? `, mean about ${Math.round(mean)} percent` : ""
        }`}
      >
        {/* ring-inset gives the 0-100 axis a visible extent: the bare bg-muted/60
            track measured 1.05:1 — the axis the dots' position depends on did not
            exist in light mode. */}
        <div
          className="bg-muted/60 ring-border absolute inset-x-0 inset-y-1 overflow-hidden rounded ring-1 ring-inset"
          aria-hidden="true"
        >
          {/* The at-risk zone, so a dot's position carries a verdict and not just a value. */}
          <div
            className="absolute inset-y-0 left-0 bg-rose-500/10 dark:bg-rose-400/15"
            style={{ width: `${AT_RISK_BELOW}%` }}
          />
          {/* A hard boundary line: the tint alone measured 1.15:1, so where the
              at-risk zone ENDS — the strip's one verdict — was invisible. */}
          <div
            className="absolute inset-y-0 w-px bg-rose-600 dark:bg-rose-400"
            style={{ left: `${AT_RISK_BELOW}%` }}
          />
          {mean !== null && (
            <div
              className="bg-foreground/60 absolute inset-y-0 w-0.5"
              style={{ left: `min(${mean}%, calc(100% - 2px))` }}
              title={`Mean ${Math.round(mean)}%`}
            />
          )}
        </div>

        {sorted.map((card, i) => {
          const { urgency, label } = memoryBandFor(card.retrievability)
          return (
            <button
              key={card.problem_id}
              type="button"
              onClick={() => onSelectCard?.(card.problem_id)}
              title={`${card.title}: ~${displayRetention(card.retrievability)}%, ${label}`}
              aria-label={`${card.title}, about ${displayRetention(
                card.retrievability
              )} percent, ${label}`}
              // The button is the 24px hit target (WCAG 2.5.8); the span inside is the
              // 10px mark. Cluster lanes move the mark, never the hit area. The clamp
              // keeps an extreme value's mark on the track instead of past its end.
              className="absolute flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full"
              style={{ left: `clamp(12px, ${card.retrievability}%, calc(100% - 12px))`, top: 0 }}
            >
              <span
                aria-hidden="true"
                // The background ring is the 2px surface gap that keeps clustered
                // marks reading as separate dots instead of one blob.
                className={cn(
                  "ring-background block h-2.5 w-2.5 rounded-full ring-2 motion-safe:transition-transform motion-safe:hover:scale-125",
                  memoryColorClass(urgency, "bar")
                )}
                style={{ transform: `translateY(${lanes[i]}px)` }}
              />
            </button>
          )
        })}
      </div>

      <p className="text-muted-foreground mt-1 text-xs">
        {/*
          Replaces the "Forgetting soonest: X" sentence: the same fact, but as a
          position on the axis with the name attached rather than a second line of
          prose repeating what the marks already show. With one reviewed card,
          "weakest" is a comparison with no comparanda — say what is true instead.
        */}
        {sorted.length > 1 ? (
          <>
            Weakest: {weakest.title} (~{displayRetention(weakest.retrievability)}%)
          </>
        ) : (
          <>Only 1 reviewed problem so far.</>
        )}
      </p>
    </div>
  )
}

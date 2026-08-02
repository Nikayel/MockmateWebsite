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

/**
 * Vertical offsets (px) cycled through a run of coincident dots. Five lanes, not
 * three: with three, the 4th member of a cluster landed exactly on the 1st —
 * invisible, and its hit target fully occluded. All lanes keep the 10px mark inside
 * the 24px box (12±8 centers span 3-21px).
 */
const MAX_LANE_OFFSET = 8
/** Dots closer than this (in retrievability points) count as one cluster. */
const CLUSTER_EPSILON = 3

/**
 * Vertical offset per dot, given retrievabilities in ASCENDING order.
 *
 * Each cluster's members spread EVENLY across the available height rather than
 * cycling a fixed lane list. Any fixed list has a capacity and fails past it: the
 * first version compared each dot only against its predecessor and collided at 3,
 * the five-lane cycle that replaced it collided at 6 — a modulo always drops the
 * (n+1)th dot exactly onto the 1st. Distributing by run length means no two dots in
 * a cluster ever share an offset, at any size.
 *
 * It cannot manufacture space: past roughly five dots inside three percentage
 * points, 10px marks visually overlap however they are placed. They stay
 * individually addressable — each is its own button with its own accessible name —
 * and crucially none is ever EXACTLY occluded by another.
 *
 * Exported for testing; no-two-share-an-offset is the property worth pinning.
 */
export function clusterLanes(sortedValues: number[]): number[] {
  const lanes = new Array<number>(sortedValues.length).fill(0)
  let start = 0
  const flush = (end: number) => {
    const length = end - start
    if (length > 1) {
      for (let i = 0; i < length; i++) {
        lanes[start + i] = -MAX_LANE_OFFSET + (2 * MAX_LANE_OFFSET * i) / (length - 1)
      }
    }
    start = end
  }
  for (let i = 1; i < sortedValues.length; i++) {
    if (sortedValues[i] - sortedValues[i - 1] >= CLUSTER_EPSILON) flush(i)
  }
  flush(sortedValues.length)
  return lanes
}

export function ConceptRiskStrip({ cards, mean, onSelectCard, className }: ConceptRiskStripProps) {
  const scored = cards.filter(
    (c): c is RiskStripCard & { retrievability: number } => c.retrievability !== null
  )
  if (scored.length === 0) return null

  const sorted = [...scored].sort((a, b) => a.retrievability - b.retrievability)
  const weakest = sorted[0]

  const lanes = clusterLanes(sorted.map((c) => c.retrievability))

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
        {/* The dark overrides are not optional: dark --muted is the SAME hex as
            --card (#232220), so bg-muted/60 composites to 1.00:1 and ring-border to
            1.31:1 — the identical "axis does not exist" failure this ring was added
            to fix for light mode. foreground/10 + foreground/40 clears 3:1. */}
        <div
          className="bg-muted/60 ring-border dark:bg-foreground/10 dark:ring-foreground/40 absolute inset-x-0 inset-y-1 overflow-hidden rounded ring-1 ring-inset"
          aria-hidden="true"
        >
          {/* The at-risk zone, so a dot's position carries a verdict and not just a value. */}
          <div
            className="absolute inset-y-0 left-0 bg-rose-500/10 dark:bg-rose-400/25"
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

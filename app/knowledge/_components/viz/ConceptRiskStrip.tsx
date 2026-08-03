"use client"

import {
  MEMORY_STRENGTH_BANDS,
  displayRetention,
  memoryBandFor,
} from "@/lib/spaced-repetition/memory-bands"
import { MIN_REVIEWS_FOR_VERDICT_HUE, memoryColorClass } from "@/lib/ui/memory-colors"
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
  /** Drives VSUP suppression, exactly as the row below the strip does it. */
  review_count: number | null
}

interface ConceptRiskStripProps {
  cards: RiskStripCard[]
  /** The concept's mean retrievability, or null when nothing has been reviewed. */
  mean: number | null
  onSelectCard?: (problemId: string) => void
  className?: string
}

/**
 * Maximum vertical amplitude, in px, that `clusterLanes` spreads a run across —
 * ±8 from the 24px button's 12px centre line.
 *
 * NOT a lane list: the cycled-list versions this replaced are described in
 * `clusterLanes` below, along with why every one of them had a capacity.
 *
 * The offset moves the 24px BUTTON, not just the mark inside it — otherwise every
 * dot in a cluster shares one hit box and a click lands on whichever painted last.
 * The group box is therefore 40px (24 + 2x8) so the targets stay contained, while
 * the visible track keeps its 16px height via inset-y-3: mark centres land at
 * 12..28px, exactly the track band, so nothing about the mark's appearance changes.
 */
const MAX_LANE_OFFSET = 8
/** Dots closer than this (in retrievability points) count as one cluster. */
const CLUSTER_EPSILON = 3
/** Hit-target height for a dot with no neighbours (WCAG 2.5.8). */
const FULL_TARGET = 24
/** The strip box; MAX_LANE_OFFSET either side of a FULL_TARGET-tall centre band. */
const STRIP_HEIGHT = FULL_TARGET + 2 * MAX_LANE_OFFSET

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
export interface DotLane {
  /** Vertical offset of the mark from the strip's centre line, in px. */
  lane: number
  /**
   * Height of this dot's hit band, in px — the spacing to its neighbours in the
   * run, so bands TILE instead of overlapping. A lone dot gets the full target.
   */
  step: number
}

export function clusterLanes(sortedValues: number[]): DotLane[] {
  const out: DotLane[] = sortedValues.map(() => ({ lane: 0, step: FULL_TARGET }))
  let start = 0
  const flush = (end: number) => {
    const length = end - start
    if (length > 1) {
      const step = (2 * MAX_LANE_OFFSET) / (length - 1)
      for (let i = 0; i < length; i++) {
        out[start + i] = { lane: -MAX_LANE_OFFSET + step * i, step }
      }
    }
    start = end
  }
  for (let i = 1; i < sortedValues.length; i++) {
    if (sortedValues[i] - sortedValues[i - 1] >= CLUSTER_EPSILON) flush(i)
  }
  flush(sortedValues.length)
  return out
}

/** Half the widest a hit region may be, in px — keeps a lone dot at a 24px target. */
const HIT_HALF_WIDTH = 12

export interface HitRegion {
  /** CSS `left` for this dot's exclusive region. */
  left: string
  /** CSS `right` for this dot's exclusive region. */
  right: string
}

/**
 * One exclusive horizontal region per dot, given values in ASCENDING order.
 *
 * A 1-D Voronoi partition: each dot owns the space nearer to it than to either
 * neighbour, capped at HIT_HALF_WIDTH px so clicking bare track does nothing.
 *
 * This is what finally ends a bug three fixes failed to close. Vertical lane
 * tiling separates a CLUSTER (dots within CLUSTER_EPSILON), but dots just OUTSIDE
 * that threshold share one vertical band and their fixed-width boxes still overlap
 * horizontally on a narrow strip — at ~264px a gap of 3 to 4.5 points put a mark's
 * centre inside its neighbour's box, and the later-painted (stronger) card took the
 * click. Regions derived from the data cannot overlap at any width, so the mark you
 * aim at always resolves to its own card.
 */
export function hitRegions(sortedValues: number[]): HitRegion[] {
  return sortedValues.map((v, i) => {
    const lo = i === 0 ? 0 : (sortedValues[i - 1] + v) / 2
    const hi = i === sortedValues.length - 1 ? 100 : (v + sortedValues[i + 1]) / 2
    return {
      left: `max(${lo}%, calc(${v}% - ${HIT_HALF_WIDTH}px))`,
      right: `calc(100% - min(${hi}%, calc(${v}% + ${HIT_HALF_WIDTH}px)))`,
    }
  })
}

export function ConceptRiskStrip({ cards, mean, onSelectCard, className }: ConceptRiskStripProps) {
  const scored = cards.filter(
    (c): c is RiskStripCard & { retrievability: number } => c.retrievability !== null
  )
  if (scored.length === 0) return null

  const sorted = [...scored].sort((a, b) => a.retrievability - b.retrievability)
  const weakest = sorted[0]

  const values = sorted.map((c) => c.retrievability)
  const lanes = clusterLanes(values)
  const regions = hitRegions(values)

  return (
    <div className={cn("w-full", className)}>
      {/*
        Two layers on purpose. The track (rounded, clipped) is an underlay; the dots
        live in the outer, unclipped box. With everything in one overflow-hidden
        container, a dot at 0% or 100% was sliced in half by its own -translate-x-1/2.
      */}
      <div
        // STRIP_HEIGHT (40px), not 24: the hit bands carry the cluster lane
        // themselves (±8px), so the box needs 24 + 16 for them to stay contained.
        // The visible track keeps its 16px height via inset-y-3, so nothing about
        // the mark's appearance changes — only the transparent targets around it.
        className="relative"
        style={{ height: STRIP_HEIGHT }}
        role="group"
        aria-label={`${scored.length} problem${scored.length === 1 ? "" : "s"} by recall estimate${
          mean !== null ? `, mean about ${Math.round(mean)} percent` : ""
        }`}
      >
        {/* ring-muted-foreground, matching the ink BeliefBar uses for its own track,
            so the two marks that claim to share one 0-100 grammar draw their extents
            alike. ring-border was 1.29:1 on the white card — the light half of this
            fix was left undone when the dark override landed.
            ring-inset gives the 0-100 axis a visible extent: the bare bg-muted/60
            track measured 1.05:1 — the axis the dots' position depends on did not
            exist in light mode. */}
        {/* The dark overrides are not optional: dark --muted is the SAME hex as
            --card (#232220), so bg-muted/60 composites to 1.00:1 and ring-border to
            1.31:1 — the identical "axis does not exist" failure this ring was added
            to fix for light mode. foreground/10 + foreground/40 clears 3:1. */}
        <div
          className="bg-muted/60 ring-muted-foreground dark:bg-foreground/10 dark:ring-foreground/40 absolute inset-x-0 inset-y-3 overflow-hidden rounded ring-1 ring-inset"
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
              // w-px at /45, not w-0.5 at /60: the mean was the HEAVIEST mark in the
              // strip — 2px of near-black, twice the width of the rose band boundary
              // that carries the actual verdict — for the aggregate this component's
              // own doc calls "the wrong lead statistic".
              className="bg-foreground/45 absolute inset-y-0 w-px"
              style={{ left: `min(${mean}%, calc(100% - 2px))` }}
              title={`Mean ${Math.round(mean)}%`}
            />
          )}
        </div>

        {/*
          MARKS — purely visual, pointer-events-none. Kept out of the buttons so a
          mark's position never has to double as a hit target: that coupling is what
          made three earlier fixes fail, because a mark could always end up inside a
          neighbour's box.
        */}
        {sorted.map((card, i) => {
          const { urgency } = memoryBandFor(card.retrievability)
          return (
            <span
              key={`mark-${card.problem_id}`}
              aria-hidden="true"
              // The background ring is the 2px surface gap that keeps clustered
              // marks reading as separate dots instead of one blob.
              className={cn(
                "ring-background pointer-events-none absolute block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",
                // Suppressed on thin evidence, like every other mark. The dots were
                // the last `bar` consumer outside the rule, so a 1-review card drew
                // a full-commitment rose dot here and an orange belief bar in its
                // own row — two verdict hues for one estimate, on the mark the page
                // draws FIRST, before anything is expanded.
                memoryColorClass(urgency, "bar", {
                  suppressed: (card.review_count ?? 0) < MIN_REVIEWS_FOR_VERDICT_HUE,
                })
              )}
              style={{
                left: `clamp(${HIT_HALF_WIDTH}px, ${card.retrievability}%, calc(100% - ${HIT_HALF_WIDTH}px))`,
                top: STRIP_HEIGHT / 2 + lanes[i].lane,
              }}
            />
          )
        })}

        {/*
          HIT REGIONS — one exclusive slice per dot, full strip height. Because the
          slices come from the data (see hitRegions) they cannot overlap at any
          viewport width, so the dot you aim at is always the card that opens.
        */}
        {sorted.map((card, i) => {
          const { label } = memoryBandFor(card.retrievability)
          return (
            <button
              key={card.problem_id}
              type="button"
              onClick={() => onSelectCard?.(card.problem_id)}
              title={`${card.title}: ~${displayRetention(card.retrievability)}%, ${label}`}
              aria-label={`${card.title}, about ${displayRetention(
                card.retrievability
              )} percent, ${label}`}
              className="absolute inset-y-0 rounded"
              style={{ left: regions[i].left, right: regions[i].right }}
            />
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
            {mean !== null ? ` · Mean ~${displayRetention(mean)}%` : ""}
          </>
        ) : (
          <>Only 1 reviewed problem so far.</>
        )}
      </p>
    </div>
  )
}

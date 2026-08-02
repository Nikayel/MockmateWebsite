"use client"

import { memoryBandFor } from "@/lib/spaced-repetition/memory-bands"
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

/** Below this the model calls a card at risk — the "ok" band floor. */
const AT_RISK_BELOW = 70

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

export function ConceptRiskStrip({ cards, mean, onSelectCard, className }: ConceptRiskStripProps) {
  const scored = cards.filter(
    (c): c is RiskStripCard & { retrievability: number } => c.retrievability !== null
  )
  if (scored.length === 0) return null

  const sorted = [...scored].sort((a, b) => a.retrievability - b.retrievability)
  const weakest = sorted[0]

  return (
    <div className={cn("w-full", className)}>
      <div className="bg-muted/60 relative h-6 overflow-hidden rounded">
        {/* The at-risk zone, so a dot's position carries a verdict and not just a value. */}
        <div
          className="absolute inset-y-0 left-0 bg-rose-500/10 dark:bg-rose-400/10"
          style={{ width: `${AT_RISK_BELOW}%` }}
          aria-hidden="true"
        />

        {mean !== null && (
          <div
            className="bg-foreground/40 absolute inset-y-0 w-px"
            style={{ left: `${mean}%` }}
            aria-hidden="true"
            title={`Mean ${Math.round(mean)}%`}
          />
        )}

        {sorted.map((card, i) => {
          const { urgency, label } = memoryBandFor(card.retrievability)
          // Nudge coincident dots apart so a cluster does not read as one card.
          const collides = i > 0 && Math.abs(card.retrievability - sorted[i - 1].retrievability) < 3
          return (
            <button
              key={card.problem_id}
              type="button"
              onClick={() => onSelectCard?.(card.problem_id)}
              // Stops the concept accordion's own toggle from firing underneath.
              onKeyDown={(e) => e.stopPropagation()}
              title={`${card.title}: ~${Math.round(card.retrievability / 5) * 5}%, ${label}`}
              aria-label={`${card.title}, about ${
                Math.round(card.retrievability / 5) * 5
              } percent, ${label}`}
              className={cn(
                "focus-visible:ring-accent/50 absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-offset-1 transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:outline-none",
                memoryColorClass(urgency, "bar")
              )}
              style={{
                left: `${card.retrievability}%`,
                top: collides ? "35%" : "50%",
                marginTop: "-5px",
              }}
            />
          )
        })}
      </div>

      <p className="text-muted-foreground mt-1 text-xs">
        {/*
          Replaces the "Forgetting soonest: X" sentence: the same fact, but as a
          position on the axis with the name attached rather than a second line of
          prose repeating what the marks already show.
        */}
        Weakest: {weakest.title} (~{Math.round(weakest.retrievability / 5) * 5}%)
      </p>
    </div>
  )
}

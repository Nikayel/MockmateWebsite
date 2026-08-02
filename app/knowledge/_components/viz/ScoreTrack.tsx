"use client"

import { SCORING } from "@/lib/constants"
import { cn } from "@/lib/utils"

/**
 * Score history as a small column chart, replacing `scores.join(" → ")`.
 *
 * Bars, deliberately not a line: `scores_history` carries no timestamps, so a line
 * would assert even spacing between reviews, which is false. Height is the score,
 * fill splits on the passing bar, and the most recent column is outlined so "where am
 * I now" survives at 20px tall.
 *
 * The numbers are not lost — the full list stays in the aria-label, which is the only
 * place the arrow chain was ever actually readable anyway.
 */

const BAR_WIDTH = 4
const BAR_GAP = 2
const CHART_HEIGHT = 20
/** Keeps a score of 0 visible as a stub rather than vanishing into the baseline. */
const MIN_BAR_HEIGHT = 1.5

interface ScoreTrackProps {
  /** Oldest to newest, matching how scores_history is appended. */
  scores: number[]
  passingScore?: number
  className?: string
}

function describeTrend(scores: number[]): string {
  if (scores.length < 2) return ""
  // Compare the last score against the mean of what came before: robust to one
  // outlier in a short history, which a first-vs-last comparison is not.
  const prior = scores.slice(0, -1)
  const priorMean = prior.reduce((sum, s) => sum + s, 0) / prior.length
  const delta = scores[scores.length - 1] - priorMean
  if (delta >= 8) return " Trend improving."
  if (delta <= -8) return " Trend slipping."
  return " Trend steady."
}

export function ScoreTrack({
  scores,
  passingScore = SCORING.RETAINED_SCORE_THRESHOLD,
  className,
}: ScoreTrackProps) {
  if (scores.length === 0) return null

  const width = scores.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP
  const lastIndex = scores.length - 1

  const label =
    `${scores.length} review${scores.length === 1 ? "" : "s"}, oldest to newest: ` +
    `${scores.join(", ")}.${describeTrend(scores)}`

  return (
    <svg
      viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
      width={width}
      height={CHART_HEIGHT}
      role="img"
      aria-label={label}
      className={cn("shrink-0 overflow-visible", className)}
    >
      {scores.map((score, i) => {
        const clamped = Math.min(100, Math.max(0, score))
        const barHeight = Math.max(MIN_BAR_HEIGHT, (clamped / 100) * CHART_HEIGHT)
        const passed = score >= passingScore
        return (
          <rect
            key={i}
            x={i * (BAR_WIDTH + BAR_GAP)}
            y={CHART_HEIGHT - barHeight}
            width={BAR_WIDTH}
            height={barHeight}
            rx={1}
            className={cn(
              passed
                ? "fill-emerald-500/70 dark:fill-emerald-400/70"
                : "fill-rose-500/70 dark:fill-rose-400/70",
              i === lastIndex && "stroke-foreground/40"
            )}
            strokeWidth={i === lastIndex ? 0.6 : 0}
          >
            <title>{`Review ${i + 1}: ${score}`}</title>
          </rect>
        )
      })}
    </svg>
  )
}

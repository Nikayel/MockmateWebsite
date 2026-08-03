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

/**
 * Exported for testing: this sentence is the entire chart for a screen reader, so it
 * has to be right, and it must not call a flat history "improving".
 */
export function describeTrend(scores: number[]): string {
  if (scores.length < 2) return ""
  // Against the MEDIAN of everything prior, not the mean. A low first attempt is the
  // norm on these cards, and it drags a mean down far enough that a flat history
  // reads as "improving" — a systematic flattering bias, on the one page that exists
  // to not flatter. The median shrugs the outlier off.
  const prior = [...scores.slice(0, -1)].sort((a, b) => a - b)
  const mid = Math.floor(prior.length / 2)
  const priorMedian = prior.length % 2 === 0 ? (prior[mid - 1] + prior[mid]) / 2 : prior[mid]
  const delta = scores[scores.length - 1] - priorMedian
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

  // No counts in the label. The visible span beside this chart already reads
  // "25 reviews · last 10 shown", so stating the window here too — as the
  // truncation fix briefly did — made a screen reader hear the same two numbers
  // twice in adjacent nodes. This label carries only what the chart itself draws;
  // CardBeliefRow owns both the count and the disclosure that it is a window.
  const label = `Scores oldest to newest: ${scores.join(", ")}.${describeTrend(scores)}`

  return (
    <svg
      viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
      width={width}
      height={CHART_HEIGHT}
      role="img"
      aria-label={label}
      className={cn("shrink-0 overflow-visible", className)}
    >
      {/*
        The retained-score line, drawn. Without it, whether a bar cleared the bar was
        carried by hue alone (emerald vs rose) — meaningless to red-green colorblind
        readers and thin for everyone. With the line, pass/fail is position (bar top
        vs line) and the hue becomes the redundant channel it should be.
      */}
      <line
        x1={0}
        y1={CHART_HEIGHT - (passingScore / 100) * CHART_HEIGHT}
        x2={width}
        y2={CHART_HEIGHT - (passingScore / 100) * CHART_HEIGHT}
        strokeWidth={0.75}
        strokeDasharray="1.5 1.5"
        // Full ink: /60 measured ~2.4:1 in light mode on the line that carries the
        // pass/fail verdict.
        className="stroke-muted-foreground"
      />
      {scores.map((score, i) => {
        const clamped = Math.min(100, Math.max(0, score))
        const barHeight = Math.max(MIN_BAR_HEIGHT, (clamped / 100) * CHART_HEIGHT)
        const passed = score >= passingScore
        return (
          <g key={i}>
            <title>{`Review ${i + 1}: ${score}${passed ? "" : " (below the retained bar)"}`}</title>
            <rect
              x={i * (BAR_WIDTH + BAR_GAP)}
              y={CHART_HEIGHT - barHeight}
              width={BAR_WIDTH}
              height={barHeight}
              rx={1}
              // Opaque per-theme fills: the /70 alphas measured 1.87:1 and 2.77:1
              // on the light card — the score history was nearly invisible.
              className={
                passed
                  ? "fill-emerald-600 dark:fill-emerald-500"
                  : "fill-rose-600 dark:fill-rose-500"
              }
            />
            {/* The newest review gets an under-tick: the old 0.6-unit ghost outline
                measured ~1.5-2:1 against its own fill. A foreground tick under the
                baseline is theme-proof, and overflow-visible already permits it. */}
            {i === lastIndex && (
              <rect
                x={i * (BAR_WIDTH + BAR_GAP)}
                y={CHART_HEIGHT + 1.5}
                width={BAR_WIDTH}
                height={1}
                className="fill-foreground"
              />
            )}
            {/* Full-column hit area: the hover/tooltip target is the 6px column, not
                the 4px mark, per the hit-target-bigger-than-the-mark rule. */}
            <rect
              x={i * (BAR_WIDTH + BAR_GAP)}
              y={0}
              width={BAR_WIDTH + BAR_GAP}
              height={CHART_HEIGHT}
              fill="transparent"
            />
          </g>
        )
      })}
    </svg>
  )
}

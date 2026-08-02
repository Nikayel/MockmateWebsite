"use client"

import { memoryColorClass } from "@/lib/ui/memory-colors"
import type { MemoryUrgency } from "@/lib/spaced-repetition/memory-bands"
import { cn } from "@/lib/utils"

/**
 * The model's mechanism, drawn: recall decaying against days since the last review.
 *
 * This is the difference between "the system says 69%" and "here is the curve it is
 * reading, here is where you are on it, and here is when it crosses the line." The
 * data was already being computed and thrown away.
 *
 * Dumb renderer by design — the points arrive pre-sampled from the server, because
 * the curve is FSRS scheduling logic and must not be reimplemented here.
 */

const VIEW_W = 100
const VIEW_H = 40
/** Recall at or above which the model still calls memory "solid" (SOLID_RECALL_THRESHOLD). */
const SOLID_RECALL_PCT = 90

interface CurvePoint {
  /** Days since the last review. */
  t: number
  /** Recall probability 0-100 at that point. */
  r: number
}

interface ForgettingCurveProps {
  points: CurvePoint[]
  /** Where "now" sits on the t axis. */
  elapsedDays: number
  /** days_until_forgetting: when recall crosses the solid line. 0 means already past. */
  crossingDays?: number | null
  urgency?: MemoryUrgency | null
  /** `spark` is the inline row size; `full` adds the axis labels and the threshold. */
  variant?: "spark" | "full"
  className?: string
}

export function ForgettingCurve({
  points,
  elapsedDays,
  crossingDays,
  urgency,
  variant = "spark",
  className,
}: ForgettingCurveProps) {
  if (points.length < 2) return null

  const maxT = points[points.length - 1].t
  if (maxT <= 0) return null

  const x = (t: number) => (t / maxT) * VIEW_W
  const y = (r: number) => VIEW_H - (Math.min(100, Math.max(0, r)) / 100) * VIEW_H

  const nowX = x(Math.min(elapsedDays, maxT))
  const solidY = y(SOLID_RECALL_PCT)

  // Split at "now": what already happened is drawn muted and dashed, what is still
  // ahead is the forecast. Same curve, but the page should not present a projection
  // and a history in the same ink.
  const past = points.filter((p) => p.t <= elapsedDays)
  const future = points.filter((p) => p.t >= elapsedDays)
  const toPath = (pts: CurvePoint[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t).toFixed(2)} ${y(p.r).toFixed(2)}`).join(" ")

  const full = variant === "full"
  const crossingLabel =
    crossingDays === null || crossingDays === undefined
      ? null
      : crossingDays <= 0
        ? "already below solid recall"
        : `drops below solid in ~${Math.round(crossingDays)}d`

  const label =
    `Forgetting curve: recall decays from the last review. ` +
    (crossingLabel ? `Currently ${crossingLabel}.` : "")

  return (
    <figure className={cn("m-0", className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
        className={cn("w-full", full ? "h-24" : "h-8", memoryColorClass(urgency, "ink"))}
      >
        {/* The bar the model judges "solid" against. Without it the curve has no verdict. */}
        <line
          x1={0}
          y1={solidY}
          x2={VIEW_W}
          y2={solidY}
          strokeWidth={0.5}
          strokeDasharray="2 2"
          className="stroke-muted-foreground/50"
          vectorEffect="non-scaling-stroke"
        />

        {past.length >= 2 && (
          <path
            d={toPath(past)}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="3 2"
            className="stroke-muted-foreground/60"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {future.length >= 2 && (
          <path
            d={toPath(future)}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Where the learner actually is. */}
        <line
          x1={nowX}
          y1={0}
          x2={nowX}
          y2={VIEW_H}
          strokeWidth={0.5}
          className="stroke-foreground/30"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={nowX}
          cy={y(points.find((p) => p.t >= elapsedDays)?.r ?? 0)}
          r={2}
          fill="currentColor"
        />
      </svg>

      {full && crossingLabel && (
        <figcaption className="text-muted-foreground mt-1 text-xs">
          Dashed line is solid recall ({SOLID_RECALL_PCT}%). This card {crossingLabel}.
        </figcaption>
      )}
    </figure>
  )
}

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
  /**
   * VSUP-lite, threaded from the row. Without it this was the ONLY `ink` consumer
   * that never suppressed, so a thin-evidence card rendered a muted belief bar
   * directly above a fully-committed coloured curve — two verdict hues for one
   * estimate, 30px apart, in the panel that exists to show the model's reasoning.
   */
  suppressed?: boolean
  /** `spark` is the inline row size; `full` adds the axis labels and the threshold. */
  variant?: "spark" | "full"
  className?: string
}

export function ForgettingCurve({
  points,
  elapsedDays,
  crossingDays,
  urgency,
  suppressed,
  variant = "spark",
  className,
}: ForgettingCurveProps) {
  if (points.length < 2) return null

  const maxT = points[points.length - 1].t
  if (maxT <= 0) return null

  const x = (t: number) => (t / maxT) * VIEW_W

  /*
    A DATA-DRIVEN y floor, not a fixed 0-100.
    The sampled window runs to 1.6x the solid-recall crossing, and FSRS puts a
    healthy card's whole curve in r=[100, 85.3] — 14.7 points. Mapped onto 0-100 in
    a 96px frame that is 14px of travel crammed into the top 15%, so the past path,
    the forecast, the threshold line and the now-dot all overlapped in one band and
    the mechanism visual read as three parallel horizontal rules under a caption
    asserting decay. Flat is its own overclaim, in the opposite direction.

    The floor always sits below the threshold, so the crossing the caption talks
    about is always in frame — and the caption states the floor, because a zoomed
    axis nobody mentions is the oldest way to oversell a slope, and this page does
    not get to do that.
  */
  const rFloor = Math.max(0, Math.min(SOLID_RECALL_PCT - 5, ...points.map((p) => p.r)) - 4)
  const rSpan = 100 - rFloor
  const y = (r: number) => VIEW_H - ((Math.min(100, Math.max(rFloor, r)) - rFloor) / rSpan) * VIEW_H

  const nowX = x(Math.min(elapsedDays, maxT))
  const solidY = y(SOLID_RECALL_PCT)

  // Split at "now": what already happened is drawn muted and dashed, what is still
  // ahead is the forecast. Same curve, but the page should not present a projection
  // and a history in the same ink.
  const past = points.filter((p) => p.t <= elapsedDays)
  const future = points.filter((p) => p.t >= elapsedDays)
  // elapsedDays is fractional wall-clock and the curve has 16 samples, so unless it
  // lands exactly on one, the segment between the flanking samples belonged to
  // NEITHER path — a visible hole directly under the now-line, the very point the
  // demo narrates. Re-attaching the last past sample also rescues the case where
  // only one sample remains ahead, which otherwise dropped the whole forecast tail.
  const lastPast = past[past.length - 1]
  const futurePath = lastPast && future[0] !== lastPast ? [lastPast, ...future] : future
  const toPath = (pts: CurvePoint[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t).toFixed(2)} ${y(p.r).toFixed(2)}`).join(" ")

  const full = variant === "full"
  const crossingLabel =
    crossingDays === null || crossingDays === undefined
      ? null
      : crossingDays <= 0
        ? "already below solid recall"
        : `drops below solid in ~${Math.round(crossingDays)}d`

  // In the full variant the figcaption carries the verdict, so the svg label stays
  // bare — otherwise a screen reader hears the crossing sentence twice in a row.
  const label =
    `Forgetting curve: recall decays from the last review.` +
    (crossingLabel && !full ? ` Currently ${crossingLabel}.` : "")

  // Where the learner is right now, INTERPOLATED between the flanking samples —
  // taking the next sample's value floated the dot off the curve at now's x, which
  // is the one place the two must coincide. Still falls back to the last sample when
  // elapsed has outrun the sampled window (a tab left open for days): "at or below
  // the window's edge" is the honest claim there, where the old `?? 0` asserted
  // certain failure with no data behind it.
  const after = points.find((p) => p.t >= elapsedDays)
  const before = [...points].reverse().find((p) => p.t <= elapsedDays)
  const nowR =
    before && after && after.t !== before.t
      ? before.r + ((after.r - before.r) * (elapsedDays - before.t)) / (after.t - before.t)
      : (after ?? points[points.length - 1]).r

  return (
    <figure className={cn("m-0", memoryColorClass(urgency, "ink", { suppressed }), className)}>
      {/* The now-dot anchors to this wrapper, not the figure: with a figcaption
          below, a figure-relative top percentage would land under the chart. */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={label}
          preserveAspectRatio="none"
          className={cn("w-full", full ? "h-24" : "h-8")}
        >
          {/*
            The bar the model judges "solid" against. Without it the curve has no
            verdict. Solid muted-foreground ink on all three reference marks: the
            alpha steps measured 1.9-2.4:1 in light mode — meaning-bearing lines,
            gone on a projector. The three stay distinguishable by geometry, not
            weight: horizontal dashed, curved dashed, vertical solid.
          */}
          <line
            x1={0}
            y1={solidY}
            x2={VIEW_W}
            y2={solidY}
            strokeWidth={0.5}
            strokeDasharray="2 2"
            className="stroke-muted-foreground"
            vectorEffect="non-scaling-stroke"
          />

          {past.length >= 2 && (
            <path
              d={toPath(past)}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="3 2"
              className="stroke-muted-foreground"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {futurePath.length >= 2 && (
            <path
              d={toPath(futurePath)}
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
            className="stroke-muted-foreground"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/*
          An HTML dot, not an SVG circle: preserveAspectRatio="none" stretches the
          100x40 viewBox ~9x horizontally in the full variant, and vectorEffect
          rescues strokes but not shapes — the old <circle r={2}> rendered as a
          ~34x10px ellipse, the most visible mark in the panel looking broken.
        */}
        <span
          aria-hidden="true"
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
          style={{ left: `${nowX}%`, top: `${(y(nowR) / VIEW_H) * 100}%` }}
        />
      </div>

      {full && (
        <figcaption className="text-muted-foreground mt-1 text-xs">
          Dashed line is solid recall ({SOLID_RECALL_PCT}%)
          {crossingLabel ? `. This card ${crossingLabel}` : ""}. Vertical axis starts at{" "}
          {Math.round(rFloor)}%.
        </figcaption>
      )}
    </figure>
  )
}

"use client"

import { MEMORY_STRENGTH_BANDS, displayRetention } from "@/lib/spaced-repetition/memory-bands"
import { cn } from "@/lib/utils"
import { featherFor } from "./RecallDial"

/**
 * The per-row recall estimate as a left-anchored linear bar on the same 0-100 axis
 * grammar as the concept risk strip above it.
 *
 * This replaced the per-row radial dial deliberately: rows sit in a divide-y column —
 * the canonical down-a-column comparison — and angle in a fresh rotational frame per
 * row carries roughly twice the judgment error of aligned position (Cleveland &
 * McGill). At r=15 a 10-point difference was ~7px of bent arc; here it is 11px of
 * aligned length, readable at projector distance. The radial survives only as a
 * recognition badge in the summary tiles.
 *
 * Uncertainty is a TWO-SIDED feather centered on the value — "about here, give or
 * take" — reusing featherFor verbatim so the more-evidence-never-fuzzier contract
 * (and its test) keeps holding. Quantile dotplots and HOPs were evaluated and
 * rejected: FSRS yields a point estimate, not a posterior, and fabricating quantiles
 * to draw would overclaim — the one thing this page must never do.
 */

const BAR_W = 112
const BAR_H = 12
const TRACK_Y = 4
const TRACK_H = 4

/** Opacity ramp across each half of the feather, solid center first. */
const FEATHER_STEPS = [0.75, 0.55, 0.35, 0.18]

const clampX = (n: number) => Math.min(BAR_W, Math.max(0, n))

interface BeliefBarProps {
  /** 0-100 recall probability, or null when the model has no belief about this card. */
  value: number | null
  /** Drives the feather width. Fewer reviews, wider "give or take". */
  reviewCount?: number | null
  /**
   * Overrides the generated aria-label. Pass the card's belief sentence so screen
   * reader users get the full explanation the sighted layout no longer repeats.
   */
  ariaLabel?: string
  className?: string
}

export function BeliefBar({ value, reviewCount, ariaLabel, className }: BeliefBarProps) {
  const describedAs =
    ariaLabel ??
    (value === null
      ? "No recall estimate yet: this card has not been reviewed."
      : `Estimated ${displayRetention(value)}% chance of recall, from ${reviewCount ?? 0} review${
          reviewCount === 1 ? "" : "s"
        }.`)

  const p = value === null ? 0 : (Math.min(100, Math.max(0, value)) / 100) * BAR_W
  const featherWidth = featherFor(reviewCount) * BAR_W
  const fadeStart = p - featherWidth / 2

  return (
    <svg
      viewBox={`0 0 ${BAR_W} ${BAR_H}`}
      role="img"
      aria-label={describedAs}
      className={cn("w-28 shrink-0", className)}
    >
      {/* The track. A dashed outline with no fill is the "no belief yet" state —
          unknown and zero are different claims, and both must be visible. */}
      <rect
        x={0.5}
        y={TRACK_Y}
        width={BAR_W - 1}
        height={TRACK_H}
        rx={2}
        strokeWidth={1}
        // stroke-muted-foreground on both branches: stroke-border measured 1.12:1
        // light / 1.3:1 dark, so the 0-100 denominator this whole mark is read
        // against did not render — a 55% bar was a stub floating in space.
        className={
          value === null ? "stroke-muted-foreground" : "fill-muted stroke-muted-foreground"
        }
        fill={value === null ? "none" : undefined}
        strokeDasharray={value === null ? "2 3" : undefined}
      />

      {value !== null && (
        <>
          <rect
            x={0}
            y={TRACK_Y}
            width={Math.max(2, fadeStart)}
            height={TRACK_H}
            rx={2}
            fill="currentColor"
          />
          {FEATHER_STEPS.map((opacity, i) => {
            const chunk = featherWidth / FEATHER_STEPS.length
            const x = clampX(fadeStart + chunk * i)
            const width = clampX(fadeStart + chunk * (i + 1)) - x
            if (width <= 0) return null
            return (
              <rect
                key={opacity}
                x={x}
                y={TRACK_Y}
                width={width}
                height={TRACK_H}
                fill="currentColor"
                fillOpacity={opacity}
              />
            )
          })}
        </>
      )}

      {/* Band boundaries as quiet axis ticks, so "where the bands change" is the
          same visual fact here as on the risk strip above. */}
      {MEMORY_STRENGTH_BANDS.filter((b) => b.floor > 0).map((b) => (
        <line
          key={b.floor}
          x1={(b.floor / 100) * BAR_W}
          x2={(b.floor / 100) * BAR_W}
          y1={1}
          y2={BAR_H - 1}
          strokeWidth={1}
          // Same reference-mark ink the score track and forgetting curve already
          // use; stroke-border left the band boundaries invisible in both themes.
          className="stroke-muted-foreground"
        />
      ))}
    </svg>
  )
}

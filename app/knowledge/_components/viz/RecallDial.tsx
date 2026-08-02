"use client"

import { memoryColorClass } from "@/lib/ui/memory-colors"
import type { MemoryUrgency } from "@/lib/spaced-repetition/memory-bands"
import { cn } from "@/lib/utils"

/**
 * The model's recall estimate, drawn so it cannot be mistaken for a measurement.
 *
 * Sweep encodes the probability and hue encodes urgency, which a bare "69%" did
 * neither of. The part that matters is the third channel: the arc's leading end
 * dissolves, and it dissolves WIDER the fewer reviews the estimate rests on. A card
 * with two reviews is visibly a guess; a card with ten is visibly not. A crisp bar
 * claims a precision an FSRS estimate over a handful of data points does not have,
 * and on an open learner model that overclaim is the whole thing we are trying to
 * avoid.
 *
 * Pure SVG, no animation library: the mark is static, so there is nothing to gate on
 * prefers-reduced-motion.
 */

/** A 270 degree gauge on r=15 about (20,20), opening at the bottom. */
const ARC_PATH = "M 9.393 30.607 A 15 15 0 1 1 30.607 30.607"

const SIZE_CLASS = {
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-16 w-16",
} as const

const LABEL_CLASS = {
  sm: "text-[9px]",
  md: "text-[11px]",
  lg: "text-base",
} as const

/**
 * How much of the arc's end is feathered, as a fraction of the full sweep. Wider
 * means less evidence. Tuned so the difference between 2 reviews and 8 is obvious at
 * the 40px size without the feather swallowing a short arc.
 *
 * Exported for testing: "more evidence never looks fuzzier" is the encoding's
 * contract, and it is far cheaper to assert here than by measuring rendered SVG.
 */
export function featherFor(reviewCount: number | null | undefined): number {
  const n = reviewCount ?? 0
  if (n <= 1) return 0.11
  if (n <= 2) return 0.085
  if (n <= 4) return 0.055
  if (n <= 7) return 0.03
  return 0.012
}

/** Opacity ramp across the feathered tail, solid end first. */
const FEATHER_STEPS = [0.75, 0.55, 0.35, 0.18]

interface RecallDialProps {
  /** 0-100 recall probability, or null when the model has no belief about this card. */
  value: number | null
  /** Drives the feather width. Fewer reviews, fuzzier end. */
  reviewCount?: number | null
  urgency?: MemoryUrgency | null
  /** VSUP-lite: mute the verdict hue while the evidence is thin (see memory-colors). */
  suppressed?: boolean
  size?: keyof typeof SIZE_CLASS
  /** Print the rounded value in the middle. Off for dense rows that label separately. */
  showLabel?: boolean
  /**
   * Overrides the generated aria-label. Pass the card's belief sentence so screen
   * reader users get the full explanation the sighted layout drops.
   */
  ariaLabel?: string
  className?: string
}

export function RecallDial({
  value,
  reviewCount,
  urgency,
  suppressed,
  size = "md",
  showLabel = true,
  ariaLabel,
  className,
}: RecallDialProps) {
  // Round to the nearest 5 and prefix a tilde. Printing "69%" off a handful of
  // reviews asserts a resolution the estimate does not carry.
  const rounded = value === null ? null : Math.round(value / 5) * 5
  const label = rounded === null ? "--" : `~${rounded}%`

  const fraction = value === null ? 0 : Math.min(1, Math.max(0, value / 100))
  // Never let the feather eat more than half the swept arc: at very low values the
  // whole sweep otherwise became fog, and a dial that renders as nothing is not
  // "uncertain", it is invisible. Half fog on a short arc still reads as a guess.
  const feather = Math.min(featherFor(reviewCount), fraction * 0.5)
  const solidEnd = fraction - feather

  const describedAs =
    ariaLabel ??
    (value === null
      ? "No recall estimate yet: this card has not been reviewed."
      : `Estimated ${rounded}% chance of recall, from ${reviewCount ?? 0} review${
          reviewCount === 1 ? "" : "s"
        }.`)

  return (
    <div
      className={cn(
        "relative shrink-0",
        SIZE_CLASS[size],
        memoryColorClass(urgency, "ink", { suppressed }),
        className
      )}
    >
      <svg viewBox="0 0 40 40" role="img" aria-label={describedAs} className="h-full w-full">
        <path
          d={ARC_PATH}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          // stroke-muted measured 1.07:1 against the card — which made the dashed
          // "no belief" ring, a SEMANTIC state, effectively invisible. The empty
          // ring wears legible ink; the ordinary track stays quiet but present.
          className={value === null ? "stroke-muted-foreground" : "stroke-border"}
          // A card with no belief gets a dashed empty ring rather than a 0% ring:
          // "unknown" and "you will certainly fail" are not the same claim.
          strokeDasharray={value === null ? "2 3" : undefined}
        />

        {value !== null && solidEnd > 0 && (
          <path
            d={ARC_PATH}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${solidEnd} 1`}
          />
        )}

        {value !== null &&
          feather > 0 &&
          FEATHER_STEPS.map((opacity, i) => {
            const chunk = feather / FEATHER_STEPS.length
            const start = Math.max(0, solidEnd) + chunk * i
            return (
              <path
                key={opacity}
                d={ARC_PATH}
                pathLength={1}
                fill="none"
                stroke="currentColor"
                strokeOpacity={opacity}
                strokeWidth={4}
                // Butt caps inside the tail so the chunks abut instead of overlapping
                // into a solid blob; the last chunk is faint enough not to look cut.
                strokeLinecap="butt"
                strokeDasharray={`${chunk} 1`}
                strokeDashoffset={-start}
              />
            )
          })}
      </svg>

      {showLabel && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center tabular-nums",
            // A bold foreground "--" read as a broken value; the null label is
            // muted and unemphasized, like the unknown it reports.
            value === null ? "text-muted-foreground font-normal" : "text-foreground font-medium",
            LABEL_CLASS[size]
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}

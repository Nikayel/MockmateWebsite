/**
 * Centralized memory-urgency → color mapping (single source of truth).
 *
 * /knowledge rendered the same retention twice with two different scales: the card
 * chip banded at 90/70/50 via getMemoryStrength, the concept bar at 80/60/40 inline.
 * A value of 85 therefore drew a green bar above an amber chip. Urgency now comes
 * from `memoryBandFor` and the colour comes from here, so the two cannot disagree.
 *
 * Colours follow the same severity ramp as lib/ui/difficulty-colors.ts:
 * emerald (safe) → amber (ok) → orange (warning) → rose (urgent).
 *
 * Light mode uses the -700 text shades. The -400 shades used on dark render at
 * roughly 1.8:1 on a light background, far below the AA 4.5:1 bar for text this
 * small.
 *
 * IMPORTANT: Tailwind's JIT compiler only sees class names that appear as literal
 * strings in source. Every class below is spelled out in full — never build these
 * via string interpolation, or the styles will be purged from the production build.
 */
import type { MemoryUrgency } from "@/lib/spaced-repetition/memory-bands"

/**
 * Shape of the memory indicator at the call site:
 * - `chip` pill with border + fill + text, for the per-card retention badge
 * - `bar`  solid fill for a progress/meter track
 * - `ink`  text colour only, picked up by SVG marks via `currentColor`
 */
export type MemoryColorVariant = "chip" | "bar" | "ink"

// Full-opacity fallbacks: the ghosted versions measured 1.74:1 (bar) and 2.05:1
// (ink) in light mode — invisible exactly where a legible "unknown" is the honest
// claim. The neutral hue already says "no verdict"; fading it only adds a violation.
const FALLBACK: Record<MemoryColorVariant, string> = {
  chip: "border-border bg-muted text-muted-foreground",
  bar: "bg-muted-foreground",
  ink: "text-muted-foreground",
}

const TABLE: Record<MemoryColorVariant, Record<MemoryUrgency, string>> = {
  chip: {
    safe: "border-emerald-600/20 bg-emerald-100 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
    ok: "border-amber-600/20 bg-amber-100 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400",
    warning:
      "border-orange-600/20 bg-orange-100 text-orange-700 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-400",
    urgent:
      "border-rose-600/20 bg-rose-100 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-400",
  },
  // -600 light / -500 dark. The -500 light fills failed WCAG 1.4.11 as UI-component
  // marks (amber-500 measured 1.96:1 on the strip track) and the -400 dark fills at
  // ~9.5:1 were the brightest objects on the page, blooming in dark screenshots.
  //
  // NOTE (validator-measured): amber-vs-orange is never distinguishable by hue alone
  // (deutan ΔE ~6-7, normal-vision ΔE ~10 — under every re-step tried). Position or
  // a word must always co-encode the band; never let hue carry it unaccompanied.
  bar: {
    safe: "bg-emerald-600 dark:bg-emerald-500",
    ok: "bg-amber-600 dark:bg-amber-500",
    warning: "bg-orange-600 dark:bg-orange-500",
    urgent: "bg-rose-600 dark:bg-rose-500",
  },
  // -600 rather than -700 in light mode: these drive SVG strokes, which are graphics
  // and answer to the 3:1 non-text contrast bar, not the 4.5:1 text one.
  //
  // Dark steps to -500 for the same anti-bloom reason as `bar` above, and more so:
  // ink is consumed via currentColor as the FILL of the belief bar, the dial arc and
  // the forecast path — far larger saturated areas than the 10px dots that motivated
  // that decision, and a card was rendering a rose-500 dot above a rose-400 bar. All
  // -500s clear 3:1 on #232220 (rose 4.33, orange 5.67, emerald 6.27, amber 7.40).
  // Safe to step because `ink` never styles prose — only the three SVG marks.
  ink: {
    safe: "text-emerald-600 dark:text-emerald-500",
    ok: "text-amber-600 dark:text-amber-500",
    warning: "text-orange-600 dark:text-orange-500",
    urgent: "text-rose-600 dark:text-rose-500",
  },
}

/**
 * Below this many reviews, a mark's hue stops asserting a verdict (VSUP-lite, after
 * Correll/Moritz/Heer's value-suppressing uncertainty palettes): one review at 52%
 * must not shout the same warning ink as twelve reviews there. The feather already
 * encodes thin evidence, but hue shouts louder than a fade. Positive verdicts mute
 * entirely; trouble stays visible but drops to one cautious hue — under-alerting on
 * thin evidence would be its own kind of overclaim.
 */
export const MIN_REVIEWS_FOR_VERDICT_HUE = 3

const SUPPRESSED_INK: Record<MemoryUrgency, string> = {
  safe: "text-muted-foreground",
  ok: "text-muted-foreground",
  warning: "text-orange-600 dark:text-orange-500",
  urgent: "text-orange-600 dark:text-orange-500",
}

function isMemoryUrgency(value: string): value is MemoryUrgency {
  return value === "safe" || value === "ok" || value === "warning" || value === "urgent"
}

/**
 * Returns the Tailwind classes for a memory urgency in the requested shape.
 * Unknown / missing values fall back to a neutral treatment — used for cards the
 * model has no belief about, which must not be coloured as if it did.
 */
export function memoryColorClass(
  urgency: string | null | undefined,
  variant: MemoryColorVariant = "chip",
  opts?: { suppressed?: boolean }
): string {
  if (!urgency || !isMemoryUrgency(urgency)) return FALLBACK[variant]
  if (opts?.suppressed && variant === "ink") return SUPPRESSED_INK[urgency]
  return TABLE[variant][urgency]
}

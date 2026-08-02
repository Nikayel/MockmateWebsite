/**
 * Centralized difficulty → color mapping (single source of truth).
 *
 * Previously the easy/medium/hard color logic was duplicated inline across 11+
 * files using three divergent, partly off-palette schemes (green/yellow/red,
 * emerald/amber/rose, emerald/amber/red). This collapses them onto one
 * on-palette severity ramp — easy = emerald (success), medium = amber
 * (warning), hard = red (error) — with gray for unknown values.
 *
 * IMPORTANT: Tailwind's JIT compiler only sees class names that appear as
 * literal strings in source. Every class below is spelled out in full — never
 * build these via string interpolation (e.g. `bg-${hue}-500`), or the styles
 * will be purged from the production build.
 */
import type { DifficultyLevel } from "@/lib/scenarios/types"

/**
 * Shape of the difficulty indicator at the call site:
 * - `badge`        dark-surface pill: border + translucent fill + colored text
 * - `softBadge`    lighter dark-surface pill (10% fill, lighter text)
 * - `text`         text color only (e.g. a score number or inline label)
 * - `dot`          solid color fill for a small circular indicator
 * - `badgeOnLight` light-mode-aware pill for surfaces that support light mode
 * - `textOnLight`  light-mode-aware text color (the `text` variant is dark-only)
 */
export type DifficultyColorVariant =
  | "badge"
  | "softBadge"
  | "text"
  | "dot"
  | "badgeOnLight"
  | "textOnLight"

const FALLBACK: Record<DifficultyColorVariant, string> = {
  badge: "border-gray-500/30 bg-gray-500/20 text-gray-400",
  softBadge: "border-gray-500/20 bg-gray-500/10 text-gray-300",
  text: "text-gray-400",
  dot: "bg-gray-500",
  badgeOnLight: "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400",
  textOnLight: "text-gray-600 dark:text-gray-400",
}

const TABLE: Record<DifficultyColorVariant, Record<DifficultyLevel, string>> = {
  badge: {
    easy: "border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
    medium: "border-amber-500/30 bg-amber-500/20 text-amber-400",
    hard: "border-red-500/30 bg-red-500/20 text-red-400",
  },
  softBadge: {
    easy: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    medium: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    hard: "border-red-500/20 bg-red-500/10 text-red-300",
  },
  text: {
    easy: "text-emerald-400",
    medium: "text-amber-400",
    hard: "text-red-400",
  },
  dot: {
    easy: "bg-emerald-500",
    medium: "bg-amber-500",
    hard: "bg-red-500",
  },
  badgeOnLight: {
    easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  // The `text` variant above is dark-surface-only: those -400 shades render at
  // 1.7-2.8:1 on a white card, far under AA for the small labels that use them.
  // Any surface that supports light mode wants these instead.
  textOnLight: {
    easy: "text-emerald-700 dark:text-emerald-400",
    medium: "text-amber-700 dark:text-amber-400",
    hard: "text-red-700 dark:text-red-400",
  },
}

function isDifficultyLevel(value: string): value is DifficultyLevel {
  return value === "easy" || value === "medium" || value === "hard"
}

/**
 * Returns the Tailwind classes for a difficulty value in the requested shape.
 * Unknown / missing values fall back to a neutral gray treatment.
 */
export function difficultyColorClass(
  difficulty: string | null | undefined,
  variant: DifficultyColorVariant = "badge"
): string {
  if (!difficulty || !isDifficultyLevel(difficulty)) return FALLBACK[variant]
  return TABLE[variant][difficulty]
}

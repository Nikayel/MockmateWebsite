/**
 * Labels and formatting for the admin session list.
 *
 * Kept out of the page so the parts with real rules (what a timestamp reads as,
 * what counts as a status the admin can act on) are pure functions a test can
 * pin down, and the page is left composing UI.
 */

import type { SessionListStatus } from "./session-query"

/** How each status renders. Dark admin palette, clay `#c4703f` accent. */
export const SESSION_STATUS_DISPLAY: Record<
  SessionListStatus,
  { label: string; className: string }
> = {
  all: { label: "All", className: "border-gray-600/30 bg-gray-600/20 text-gray-300" },
  completed: {
    label: "Completed",
    className: "border-green-600/30 bg-green-600/20 text-green-400",
  },
  scoring: {
    label: "Scoring",
    className: "border-yellow-600/30 bg-yellow-600/20 text-yellow-400",
  },
  failed: { label: "Scoring failed", className: "border-red-600/30 bg-red-600/20 text-red-400" },
  in_progress: {
    label: "In progress",
    className: "border-[#c4703f]/40 bg-[#c4703f]/20 text-[#e0a077]",
  },
  abandoned: { label: "Abandoned", className: "border-gray-600/30 bg-gray-700/40 text-gray-400" },
}

/** Status filter choices, in the order the dropdown offers them. */
export const SESSION_STATUS_OPTIONS: { value: SessionListStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "scoring", label: "Scoring" },
  { value: "failed", label: "Scoring failed" },
  { value: "in_progress", label: "In progress" },
  { value: "abandoned", label: "Abandoned" },
]

/**
 * The scenario kinds sessions are actually written with: DSA problems, bug
 * hunts, system design rounds, and the Case Lab build type.
 */
export const SESSION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All types" },
  { value: "dsa", label: "DSA" },
  { value: "bugfix", label: "Bug fix" },
  { value: "system-design", label: "System design" },
  { value: "add-functionality", label: "Add functionality" },
]

/** Title case for a scenario kind the option list does not know about. */
export function sessionTypeLabel(value: string): string {
  const known = SESSION_TYPE_OPTIONS.find((option) => option.value === value)
  if (known) return known.label
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * A timestamp an admin can act on: how long ago, at a glance.
 *
 * The absolute instant is what you quote in a bug report, the relative one is
 * what tells you whether a session is worth looking at, so the table shows the
 * relative form and keeps the absolute one in the title attribute.
 */
export function relativeTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Never"
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return "Unknown"

  const elapsedMs = now.getTime() - then.getTime()
  // A clock skew of a few seconds should not read as "in the future".
  if (elapsedMs < -60_000) return "In the future"

  const seconds = Math.max(0, Math.round(elapsedMs / 1000))
  if (seconds < 60) return "Just now"

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`

  return `${Math.round(months / 12)}y ago`
}

/** Full local instant, for the tooltip and the drill-in. */
export function absoluteTime(iso: string | null): string {
  if (!iso) return "Not recorded"
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return "Unknown"
  return value.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Minutes as something readable; an open round has no duration to show. */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "Still open"
  if (minutes < 1) return "Under a minute"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

/** A score, or an explicit absence. Zero is a real score and must not read as blank. */
export function formatScore(score: number | null): string {
  return score === null ? "Not scored" : `${Math.round(score)}%`
}

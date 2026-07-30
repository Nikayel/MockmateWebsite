/**
 * Calendar-day arithmetic for interview countdowns.
 *
 * Five call sites hand-rolled `Math.ceil((target - now) / 86400000)` and split two
 * ways that produced different answers:
 *
 *   - Reference point: four measured from `new Date()` (the current instant) while
 *     InterviewDatePicker measured from a midnight-normalized `today`. Whenever the
 *     stored interviewDate carries a time component, the instant-based form returns
 *     a different number depending on the hour the page is rendered.
 *   - Clamping: two needed the raw negative value to detect an expired roadmap
 *     (`isExpired = days < 0`), one clamped at 0 for display, one clamped at 1.
 *
 * Normalizing both endpoints to local midnight makes the result a stable count of
 * calendar days that does not drift through the day. Clamping stays at the call
 * site, because "expired" and "display" want genuinely different answers.
 */

export type CalendarDateInput = string | number | Date

const MS_PER_DAY = 86_400_000

/** Local midnight for the given instant, or null if it is unparseable. */
function startOfLocalDay(value: CalendarDateInput): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Whole calendar days from `from` to `target`, both taken at local midnight.
 *
 * Today is 0, tomorrow is 1, yesterday is -1. Returns null when either input is
 * unparseable so callers can distinguish "no date" from "due today" instead of
 * silently rendering NaN.
 *
 * Uses round rather than ceil because both endpoints are already midnight-aligned:
 * the quotient is a whole number except across a DST boundary, where the day is 23
 * or 25 hours and round recovers the intended count.
 */
export function calendarDaysUntil(
  target: CalendarDateInput,
  from: CalendarDateInput = new Date()
): number | null {
  const targetDay = startOfLocalDay(target)
  const fromDay = startOfLocalDay(from)
  if (targetDay === null || fromDay === null) return null
  return Math.round((targetDay.getTime() - fromDay.getTime()) / MS_PER_DAY)
}

/**
 * Days remaining for display: never negative, and null stays null. Use this where
 * a past date should read as "0 days left" rather than a negative countdown.
 */
export function calendarDaysRemaining(
  target: CalendarDateInput,
  from: CalendarDateInput = new Date()
): number | null {
  const days = calendarDaysUntil(target, from)
  return days === null ? null : Math.max(0, days)
}

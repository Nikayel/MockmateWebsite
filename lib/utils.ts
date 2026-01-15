import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Date comparison utilities for timezone-safe comparisons.
 *
 * The issue: Dates stored in the database as UTC midnight (e.g., "2026-01-09T00:00:00.000Z")
 * shift to the previous day when converted to local time in negative UTC offset timezones.
 * For example, UTC midnight Jan 9 becomes 4pm Jan 8 in PST.
 *
 * Solution: Use UTC methods to extract the "intended" date from stored dates,
 * and compare with the user's local date.
 */

/**
 * Extracts the "intended" date components from a stored date.
 *
 * Roadmap dates represent calendar days (e.g., "Jan 14") and should be compared
 * as calendar days regardless of timezone. New roadmaps store dates at UTC midnight,
 * but legacy roadmaps may have stored dates at local noon.
 *
 * This function detects the storage format and extracts the intended date:
 * - UTC midnight (00:00:00 UTC) -> use UTC components (new format)
 * - Other times -> use local components (legacy format, stored at local noon)
 */
export function getStoredDateComponents(date: Date): {
  year: number
  month: number
  day: number
} {
  // Check if this is UTC midnight (new format)
  const isUTCMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0

  if (isUTCMidnight) {
    // New format: date was stored as UTC midnight, use UTC components
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      day: date.getUTCDate(),
    }
  } else {
    // Legacy format: date was stored at local noon, use local components
    // This preserves the original intended date for existing roadmaps
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
    }
  }
}

/**
 * @deprecated Use getStoredDateComponents instead for roadmap dates.
 * This function assumes UTC midnight storage which may not be true for legacy data.
 */
export function getUTCDateComponents(date: Date): {
  year: number
  month: number
  day: number
} {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  }
}

/**
 * Extracts date components from the current local date.
 */
export function getLocalDateComponents(date: Date = new Date()): {
  year: number
  month: number
  day: number
} {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  }
}

/**
 * Compares a stored date with today's local date.
 * Returns true if the stored date represents the same calendar day as today.
 *
 * @param storedDate - Date object from roadmap (may be UTC midnight or local noon)
 * @param localDate - Optional local date to compare against (defaults to now)
 */
export function isStoredDateToday(storedDate: Date, localDate: Date = new Date()): boolean {
  const stored = getStoredDateComponents(storedDate)
  const local = getLocalDateComponents(localDate)
  return stored.year === local.year && stored.month === local.month && stored.day === local.day
}

/**
 * Compares a stored date with a local date.
 * Returns:
 *  - negative if stored date is before local date
 *  - 0 if same day
 *  - positive if stored date is after local date
 *
 * @param storedDate - Date object from roadmap (may be UTC midnight or local noon)
 * @param localDate - Optional local date to compare against (defaults to now)
 */
export function compareStoredDateWithLocal(storedDate: Date, localDate: Date = new Date()): number {
  const stored = getStoredDateComponents(storedDate)
  const local = getLocalDateComponents(localDate)

  // Create comparable timestamps (using UTC to avoid timezone shifts)
  const storedTimestamp = Date.UTC(stored.year, stored.month, stored.day)
  const localTimestamp = Date.UTC(local.year, local.month, local.day)

  return storedTimestamp - localTimestamp
}

/**
 * Checks if a stored UTC date is in the past relative to local today.
 */
export function isStoredDatePast(storedDate: Date, localDate: Date = new Date()): boolean {
  return compareStoredDateWithLocal(storedDate, localDate) < 0
}

/**
 * Checks if a stored UTC date is in the future relative to local today.
 */
export function isStoredDateFuture(storedDate: Date, localDate: Date = new Date()): boolean {
  return compareStoredDateWithLocal(storedDate, localDate) > 0
}

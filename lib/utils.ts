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
 * Extracts date components from a date that was stored as UTC midnight.
 * This returns the "intended" date regardless of the user's timezone.
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
 * Compares a stored UTC date with today's local date.
 * Returns true if the stored date represents the same calendar day as today.
 *
 * @param storedDate - Date object created from a UTC midnight timestamp
 * @param localDate - Optional local date to compare against (defaults to now)
 */
export function isStoredDateToday(storedDate: Date, localDate: Date = new Date()): boolean {
  const stored = getUTCDateComponents(storedDate)
  const local = getLocalDateComponents(localDate)
  return stored.year === local.year && stored.month === local.month && stored.day === local.day
}

/**
 * Compares a stored UTC date with a local date.
 * Returns:
 *  - negative if stored date is before local date
 *  - 0 if same day
 *  - positive if stored date is after local date
 *
 * @param storedDate - Date object created from a UTC midnight timestamp
 * @param localDate - Optional local date to compare against (defaults to now)
 */
export function compareStoredDateWithLocal(storedDate: Date, localDate: Date = new Date()): number {
  const stored = getUTCDateComponents(storedDate)
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

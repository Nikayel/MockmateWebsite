/**
 * Timezone utilities for email notifications
 *
 * Ensures emails are only sent during reasonable hours in the user's local timezone
 */

// Default timezone if user hasn't set one
export const DEFAULT_TIMEZONE = "America/Los_Angeles"

// Reasonable hours for sending emails (9 AM - 9 PM local time)
export const REASONABLE_HOURS = {
  start: 9, // 9 AM
  end: 21, // 9 PM
}

/**
 * Get the current hour in a specific timezone
 */
export function getCurrentHourInTimezone(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    })
    return parseInt(formatter.format(new Date()), 10)
  } catch (error) {
    // Invalid timezone - fall back to UTC
    console.warn(`[Timezone] Invalid timezone "${timezone}", falling back to UTC`)
    return new Date().getUTCHours()
  }
}

/**
 * Check if it's a reasonable hour to send emails in the user's timezone
 *
 * @param timezone - User's IANA timezone (e.g., "America/New_York")
 * @param startHour - Start of reasonable hours (default 9 AM)
 * @param endHour - End of reasonable hours (default 9 PM)
 * @returns Object with isReasonable boolean and current local hour
 */
export function isReasonableHourForUser(
  timezone: string | undefined | null,
  startHour: number = REASONABLE_HOURS.start,
  endHour: number = REASONABLE_HOURS.end
): { isReasonable: boolean; localHour: number; timezone: string } {
  const userTimezone = timezone || DEFAULT_TIMEZONE
  const localHour = getCurrentHourInTimezone(userTimezone)

  const isReasonable = localHour >= startHour && localHour < endHour

  return {
    isReasonable,
    localHour,
    timezone: userTimezone,
  }
}

/**
 * Check if current time is within user's quiet hours
 *
 * @param timezone - User's timezone
 * @param quietHours - Quiet hours config { start: number, end: number }
 * @returns true if currently in quiet hours (should NOT send)
 */
export function isInQuietHours(
  timezone: string | undefined | null,
  quietHours: { start: number; end: number } | undefined | null
): boolean {
  if (!quietHours) return false

  const userTimezone = timezone || DEFAULT_TIMEZONE
  const localHour = getCurrentHourInTimezone(userTimezone)

  const { start, end } = quietHours

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (start > end) {
    return localHour >= start || localHour < end
  }

  return localHour >= start && localHour < end
}

/**
 * Get a human-readable description of when an email will be sent
 * Used for logging/debugging
 */
export function getTimezoneDebugInfo(timezone: string | undefined | null): string {
  const userTimezone = timezone || DEFAULT_TIMEZONE
  const localHour = getCurrentHourInTimezone(userTimezone)
  const { isReasonable } = isReasonableHourForUser(userTimezone)

  return `${userTimezone}: ${localHour}:00 local time (${isReasonable ? "OK to send" : "outside reasonable hours"})`
}

/**
 * Validate if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Get today's date string (YYYY-MM-DD) in a specific timezone
 *
 * This is critical for streak calculations - ensures we compare calendar dates
 * in the user's timezone, not UTC.
 *
 * Example: A user in PST practicing at 11 PM local time:
 * - UTC would show next day's date
 * - This function correctly returns the local date
 */
export function getTodayInTimezone(timezone: string | undefined | null): string {
  const userTimezone = timezone || DEFAULT_TIMEZONE
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return formatter.format(new Date())
  } catch {
    // Fallback to UTC if timezone is invalid
    return new Date().toISOString().split("T")[0]
  }
}

/**
 * Convert an ISO timestamp to a date string (YYYY-MM-DD) in a specific timezone
 *
 * Use this to convert stored timestamps (which are in UTC/ISO format) to the
 * user's local calendar date for comparison.
 */
export function getDateInTimezone(
  isoTimestamp: string,
  timezone: string | undefined | null
): string {
  const userTimezone = timezone || DEFAULT_TIMEZONE
  try {
    const date = new Date(isoTimestamp)
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return formatter.format(date)
  } catch {
    // Fallback to UTC date portion
    return isoTimestamp.split("T")[0]
  }
}

/**
 * Check if a given ISO timestamp is "today" in the user's timezone
 *
 * This properly handles the case where it's still "today" in the user's
 * timezone even if UTC has moved to the next day.
 */
export function isToday(
  isoTimestamp: string | undefined | null,
  timezone: string | undefined | null
): boolean {
  if (!isoTimestamp) return false

  const today = getTodayInTimezone(timezone)
  const timestampDate = getDateInTimezone(isoTimestamp, timezone)

  return today === timestampDate
}

/**
 * Calculate the difference in calendar days between two dates in a specific timezone
 *
 * Returns:
 * - 0 if same calendar day
 * - 1 if consecutive days (yesterday to today)
 * - >1 if more than 1 day apart
 *
 * This is the correct way to calculate streak continuity.
 */
export function getDaysDifference(
  earlierTimestamp: string,
  laterTimestamp: string | Date,
  timezone: string | undefined | null
): number {
  const userTimezone = timezone || DEFAULT_TIMEZONE

  const earlier =
    typeof earlierTimestamp === "string" ? new Date(earlierTimestamp) : earlierTimestamp
  const later = typeof laterTimestamp === "string" ? new Date(laterTimestamp) : laterTimestamp

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    const earlierDate = formatter.format(earlier)
    const laterDate = formatter.format(later)

    // Parse the YYYY-MM-DD strings and calculate difference
    const earlierMs = new Date(earlierDate + "T00:00:00Z").getTime()
    const laterMs = new Date(laterDate + "T00:00:00Z").getTime()

    return Math.round((laterMs - earlierMs) / (1000 * 60 * 60 * 24))
  } catch {
    // Fallback to UTC-based calculation
    const earlierDateUtc = new Date(earlier.toISOString().split("T")[0] + "T00:00:00Z").getTime()
    const laterDateUtc = new Date(
      (later instanceof Date ? later.toISOString() : later).split("T")[0] + "T00:00:00Z"
    ).getTime()
    return Math.round((laterDateUtc - earlierDateUtc) / (1000 * 60 * 60 * 24))
  }
}

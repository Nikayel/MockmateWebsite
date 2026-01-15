/**
 * Timezone utilities for email notifications
 *
 * Ensures emails are only sent during reasonable hours in the user's local timezone
 */

// Default timezone if user hasn't set one
export const DEFAULT_TIMEZONE = "America/Los_Angeles"

// Reasonable hours for sending emails (9 AM - 9 PM local time)
export const REASONABLE_HOURS = {
  start: 9,  // 9 AM
  end: 21,   // 9 PM
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

/**
 * Guest Session Management
 *
 * Allows users to try one free interview session without signing up.
 * Handles:
 * - Generating and storing temporary guest IDs
 * - Tracking free trial usage
 * - Session data persistence in localStorage
 * - Migration of guest session data to authenticated user
 */

// Storage keys
const GUEST_ID_KEY = 'mockmate_guest_id'
const FREE_TRIAL_USED_KEY = 'mockmate_free_trial_used'
const GUEST_SESSION_KEY = 'mockmate_guest_session'
const GUEST_SESSION_DATA_KEY = 'mockmate_guest_session_data'

// Cookie names (for server-side detection)
const GUEST_ID_COOKIE = 'mockmate_guest_id'
const FREE_TRIAL_COOKIE = 'mockmate_free_trial'

/**
 * Generate a UUID v4 for guest identification
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Set a cookie with the given name and value
 */
function setCookie(name: string, value: string, days: number = 2): void {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

/**
 * Delete a cookie by name
 */
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

// ============================================================================
// GUEST ID MANAGEMENT
// ============================================================================

/**
 * Get or create a guest ID
 * Persists in localStorage and cookie for cross-tab/session consistency
 */
export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') {
    return `guest-${generateUUID()}`
  }

  // Check localStorage first
  let guestId = localStorage.getItem(GUEST_ID_KEY)

  // Check cookie as backup
  if (!guestId) {
    guestId = getCookie(GUEST_ID_COOKIE)
  }

  // Generate new ID if none exists
  if (!guestId) {
    guestId = `guest-${generateUUID()}`
    localStorage.setItem(GUEST_ID_KEY, guestId)
    setCookie(GUEST_ID_COOKIE, guestId, 2) // 2 days expiry
  } else {
    // Sync between localStorage and cookie
    localStorage.setItem(GUEST_ID_KEY, guestId)
    setCookie(GUEST_ID_COOKIE, guestId, 2)
  }

  return guestId
}

/**
 * Get the current guest ID (without creating one)
 */
export function getGuestId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(GUEST_ID_KEY) || getCookie(GUEST_ID_COOKIE)
}

/**
 * Check if a user ID is a guest ID
 */
export function isGuestId(userId: string | null | undefined): boolean {
  if (!userId) return false
  return userId.startsWith('guest-')
}

// ============================================================================
// FREE TRIAL MANAGEMENT
// ============================================================================

/**
 * Check if user has already used their free trial
 */
export function hasFreeTrialBeenUsed(): boolean {
  if (typeof window === 'undefined') return false

  // Check localStorage
  const localUsed = localStorage.getItem(FREE_TRIAL_USED_KEY) === 'true'

  // Check cookie as backup
  const cookieUsed = getCookie(FREE_TRIAL_COOKIE) === 'used'

  return localUsed || cookieUsed
}

/**
 * Mark the free trial as used
 */
export function markFreeTrialUsed(): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(FREE_TRIAL_USED_KEY, 'true')
  setCookie(FREE_TRIAL_COOKIE, 'used', 30) // Longer expiry to prevent abuse
}

/**
 * Check if user can start a free trial session
 */
export function canStartFreeTrial(): boolean {
  return !hasFreeTrialBeenUsed()
}

// ============================================================================
// GUEST SESSION DATA MANAGEMENT
// ============================================================================

export interface GuestSessionData {
  sessionId: string
  scenarioId: string
  scenarioTitle: string
  startedAt: string
  code?: string
  language?: string
  elapsedTime?: number
  chatMessages?: Array<{ type: string; message: string }>
  interviewerMessages?: Array<{ type: string; message: string }>
  testResults?: Array<any>
  feedback?: {
    score: number
    summary: string
    feedbackData: any
  }
}

/**
 * Save guest session data to localStorage
 */
export function saveGuestSessionData(data: Partial<GuestSessionData>): void {
  if (typeof window === 'undefined') return

  const existing = getGuestSessionData()
  const updated = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem(GUEST_SESSION_DATA_KEY, JSON.stringify(updated))
}

/**
 * Get guest session data from localStorage
 */
export function getGuestSessionData(): GuestSessionData | null {
  if (typeof window === 'undefined') return null

  const data = localStorage.getItem(GUEST_SESSION_DATA_KEY)
  if (!data) return null

  try {
    return JSON.parse(data) as GuestSessionData
  } catch {
    return null
  }
}

/**
 * Clear guest session data
 */
export function clearGuestSessionData(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(GUEST_SESSION_DATA_KEY)
}

/**
 * Check if there's an active guest session
 */
export function hasActiveGuestSession(): boolean {
  const data = getGuestSessionData()
  if (!data) return false

  // Session is active if it was started within the last 24 hours and not completed
  const startedAt = new Date(data.startedAt)
  const now = new Date()
  const hoursSinceStart = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60)

  return hoursSinceStart < 24 && !data.feedback
}

// ============================================================================
// SESSION MIGRATION
// ============================================================================

/**
 * Get guest session data for migration to authenticated user
 * Returns data and clears it from local storage
 */
export function extractGuestSessionForMigration(): GuestSessionData | null {
  const data = getGuestSessionData()
  if (!data) return null

  // Keep the data in localStorage until migration is confirmed
  return data
}

/**
 * Confirm guest session migration completed
 * Clears all guest data from local storage
 */
export function confirmGuestSessionMigration(): void {
  if (typeof window === 'undefined') return

  // Clear all guest-related data
  localStorage.removeItem(GUEST_ID_KEY)
  localStorage.removeItem(GUEST_SESSION_DATA_KEY)
  // Keep FREE_TRIAL_USED_KEY to prevent re-abuse

  deleteCookie(GUEST_ID_COOKIE)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get guest authentication headers for API calls
 */
export function getGuestAuthHeaders(): Record<string, string> {
  const guestId = getGuestId()
  if (!guestId) return {}

  return {
    'X-Guest-Id': guestId,
  }
}

/**
 * Check if the current user is in guest mode (has guest ID but no auth)
 */
export function isInGuestMode(): boolean {
  const guestId = getGuestId()
  return !!guestId && canStartFreeTrial()
}

/**
 * Reset all guest data (for testing purposes)
 */
export function resetGuestData(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(GUEST_ID_KEY)
  localStorage.removeItem(FREE_TRIAL_USED_KEY)
  localStorage.removeItem(GUEST_SESSION_KEY)
  localStorage.removeItem(GUEST_SESSION_DATA_KEY)

  deleteCookie(GUEST_ID_COOKIE)
  deleteCookie(FREE_TRIAL_COOKIE)
}

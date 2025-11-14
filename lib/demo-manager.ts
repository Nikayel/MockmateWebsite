/**
 * Demo Management Utility
 * Handles demo trial limitations using cookies and local storage
 */

import { cookies } from "next/headers"

const DEMO_COOKIE_NAME = "mockmate_demo_used"
const DEMO_STORAGE_KEY = "mockmate_demo_timestamp"
const DEMO_EXPIRY_DAYS = 365 // Demo restriction lasts for 1 year

export interface DemoStatus {
  canAccessDemo: boolean
  demoUsedAt?: string
  remainingDemos: number
}

/**
 * Client-side: Check if user has already used their demo
 */
export function checkDemoAccess(): DemoStatus {
  if (typeof window === "undefined") {
    return { canAccessDemo: true, remainingDemos: 1 }
  }

  // Check both cookie and localStorage for redundancy
  const cookieUsed = document.cookie.includes(DEMO_COOKIE_NAME)
  const storageTimestamp = localStorage.getItem(DEMO_STORAGE_KEY)

  if (cookieUsed || storageTimestamp) {
    return {
      canAccessDemo: false,
      demoUsedAt: storageTimestamp || new Date().toISOString(),
      remainingDemos: 0,
    }
  }

  return {
    canAccessDemo: true,
    remainingDemos: 1,
  }
}

/**
 * Client-side: Mark demo as used
 */
export function markDemoAsUsed(): void {
  if (typeof window === "undefined") return

  const timestamp = new Date().toISOString()

  // Set cookie
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + DEMO_EXPIRY_DAYS)
  document.cookie = `${DEMO_COOKIE_NAME}=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`

  // Set localStorage as backup
  localStorage.setItem(DEMO_STORAGE_KEY, timestamp)

  // Also set session storage for immediate checks
  sessionStorage.setItem("demo_in_progress", "true")
}

/**
 * Client-side: Get user context for AI personalization
 */
export function getUserContext() {
  if (typeof window === "undefined") {
    return {
      email: "guest@demo.com",
      subscription_tier: "demo",
      sessions_used: 0,
      previous_topics: [],
      skill_level: "Intermediate",
    }
  }

  // Try to get user info from localStorage or session
  const userEmail = localStorage.getItem("user_email") || sessionStorage.getItem("user_email") || "guest@demo.com"

  const skillLevel =
    localStorage.getItem("user_skill_level") || sessionStorage.getItem("user_skill_level") || "Intermediate"

  const demoStatus = checkDemoAccess()
  const sessionsUsed = demoStatus.canAccessDemo ? 0 : 1

  return {
    email: userEmail,
    subscription_tier: "demo",
    sessions_used: sessionsUsed,
    previous_topics: ["Two Sum"],
    skill_level: skillLevel,
  }
}

/**
 * Client-side: Save user preferences for context
 */
export function saveUserPreferences(email?: string, skillLevel?: string): void {
  if (typeof window === "undefined") return

  if (email) {
    localStorage.setItem("user_email", email)
    sessionStorage.setItem("user_email", email)
  }

  if (skillLevel) {
    localStorage.setItem("user_skill_level", skillLevel)
    sessionStorage.setItem("user_skill_level", skillLevel)
  }
}

/**
 * Client-side: Clear demo restriction (for testing purposes only)
 */
export function clearDemoRestriction(): void {
  if (typeof window === "undefined") return

  // Clear cookie
  document.cookie = `${DEMO_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`

  // Clear storage
  localStorage.removeItem(DEMO_STORAGE_KEY)
  sessionStorage.removeItem("demo_in_progress")
}

/**
 * Format timestamp for display
 */
export function formatDemoUsedDate(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "Unknown date"
  }
}

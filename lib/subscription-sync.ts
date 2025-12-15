/**
 * Subscription Sync Utility
 *
 * Centralized utility for syncing subscription status from Stripe.
 * Used across multiple pages to ensure subscription data is up-to-date.
 */

import { User as FirebaseUser } from "firebase/auth"
import { getUserProfile } from "./firestore-helpers"
import { Profile } from "./types"

export interface SyncResult {
  success: boolean
  profile: Profile | null
  error?: string
}

/**
 * Sync subscription status from Stripe for a user.
 *
 * @param firebaseUser - The Firebase user object
 * @returns Promise<SyncResult> - The sync result with updated profile
 */
export async function syncSubscription(firebaseUser: FirebaseUser): Promise<SyncResult> {
  try {
    const idToken = await firebaseUser.getIdToken()

    const response = await fetch("/api/sync-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ userId: firebaseUser.uid }),
    })

    if (!response.ok) {
      return {
        success: false,
        profile: null,
        error: `Sync failed with status ${response.status}`
      }
    }

    const data = await response.json()

    if (data.success && data.profile) {
      // Reload profile after sync to get the latest data
      const updatedProfile = await getUserProfile(firebaseUser.uid)
      return {
        success: true,
        profile: updatedProfile
      }
    }

    return {
      success: false,
      profile: null,
      error: data.error || "Sync completed but no profile returned"
    }
  } catch {
    return {
      success: false,
      profile: null,
      error: "Network error during sync"
    }
  }
}

/**
 * Check if a user needs subscription sync.
 * Returns true if user has Stripe IDs but is on free tier.
 */
export function needsSubscriptionSync(profile: Profile | null): boolean {
  if (!profile) return false

  const hasStripeIds = !!(profile.stripe_subscription_id || profile.stripe_customer_id)
  const isFree = profile.subscription_tier === "free"

  return hasStripeIds && isFree
}

/**
 * Sync subscription with retries for webhook race conditions.
 * Useful after successful Stripe checkout.
 *
 * @param firebaseUser - The Firebase user object
 * @param maxAttempts - Maximum number of sync attempts (default: 5)
 * @param delayMs - Delay between attempts in ms (default: 1500)
 * @returns Promise<SyncResult>
 */
export async function syncSubscriptionWithRetry(
  firebaseUser: FirebaseUser,
  maxAttempts: number = 5,
  delayMs: number = 1500
): Promise<SyncResult> {
  let lastResult: SyncResult = {
    success: false,
    profile: null,
    error: "No attempts made"
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const idToken = await firebaseUser.getIdToken(true) // Force refresh token

      const response = await fetch("/api/sync-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ userId: firebaseUser.uid }),
      })

      if (response.ok) {
        const data = await response.json()

        // Check if user is now Pro
        if (data.profile?.subscription_tier === "pro") {
          const updatedProfile = await getUserProfile(firebaseUser.uid)
          return {
            success: true,
            profile: updatedProfile
          }
        }
      }

      // Not yet synced, wait and retry
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    } catch {
      // Continue to next attempt
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  // All attempts exhausted
  lastResult.error = "Could not confirm Pro status after retries"
  return lastResult
}

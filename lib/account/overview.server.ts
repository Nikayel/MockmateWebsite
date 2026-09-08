import "server-only"

import { adminDb } from "@/lib/firebase-admin"
import { getUserQuota } from "@/lib/quota-enforcement"
import { syncSubscriptionFromStripe } from "@/lib/stripe-helpers"
import type { Profile } from "@/lib/types"
import type { AccountOverviewResponse } from "./overview"
import { logger } from "@/lib/logger"

function needsSubscriptionReconciliation(profile: Profile): boolean {
  return (
    profile.subscription_tier === "free" &&
    Boolean(profile.stripe_customer_id || profile.stripe_subscription_id)
  )
}

/**
 * Builds the subscription and quota snapshot shown in signed-in account surfaces.
 *
 * Stripe remains the payment authority, but Firestore is the entitlement record.
 * A Free profile that already has a Stripe link is reconciled before its quota is
 * resolved so the two values cannot describe different billing states.
 */
export async function getAccountOverview(userId: string): Promise<AccountOverviewResponse> {
  try {
    const profileSnapshot = await adminDb.collection("profiles").doc(userId).get()
    if (!profileSnapshot.exists) {
      return {
        status: "missing_profile",
        message: "We couldn't find your account profile. Please try again shortly.",
      }
    }

    let profile = profileSnapshot.data() as Profile
    if (needsSubscriptionReconciliation(profile)) {
      const reconciledProfile = await syncSubscriptionFromStripe(userId)
      if (reconciledProfile) profile = reconciledProfile
    }

    const quota = await getUserQuota(userId, profile)
    if (!quota) {
      logger.error("Account overview quota lookup failed", { userId })
      return {
        status: "unavailable",
        message: "We couldn't load your current session allowance. Please try again.",
      }
    }

    return {
      status: "ready",
      overview: {
        profile,
        usage: {
          used: quota.sessionsUsed,
          limit: quota.sessionsLimit,
          allowed: quota.sessionsUsed < quota.sessionsLimit || quota.freeOpensRemaining > 0,
          periodEnd: quota.periodEnd,
          freeOpensRemaining: quota.freeOpensRemaining,
        },
      },
    }
  } catch (error) {
    logger.error("Account overview lookup failed", { userId, error })
    return {
      status: "unavailable",
      message: "We couldn't load your account details. Please try again.",
    }
  }
}

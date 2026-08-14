/**
 * Quota maintenance for the one-time yearly Pro plan.
 *
 * Yearly Pro is a single payment with no Stripe subscription behind it, so the
 * webhook events that maintain monthly subscribers' quotas never fire for these
 * users. The email-notifications cron calls these instead:
 * - resetYearlySubscriberQuota: gives an active yearly subscriber their monthly
 *   session allowance each billing month of the year.
 * - updateQuotaToFree: clamps the quota down when the year ends and the account
 *   is downgraded.
 *
 * Both moved verbatim from app/api/cron/subscription-expiry/route.ts when that
 * route was deprecated (2026-08-14, email flow consolidation).
 */

import { adminDb } from "@/lib/firebase-admin"
import { PRICING_CONFIG } from "@/lib/config"
import { calculateBillingPeriod } from "@/lib/firestore-helpers"

/** Clamp a downgraded user's current-period quota to the free plan's limit. */
export async function updateQuotaToFree(
  userId: string,
  profileData: { created_at?: string; subscription_type?: string }
): Promise<void> {
  const now = new Date()

  const { periodStart, periodEnd } = calculateBillingPeriod({
    subscriptionTier: "free",
    subscriptionType: profileData.subscription_type,
    signupDate: profileData.created_at,
    referenceDate: now,
  })

  const quotaSnapshot = await adminDb
    .collection("profile_quota")
    .where("user_id", "==", userId)
    .get()

  const currentQuotaDoc = quotaSnapshot.docs.find((doc) => {
    const data = doc.data()
    const quotaStart = new Date(data.period_start)
    return quotaStart >= periodStart && quotaStart <= periodEnd
  })

  const freeLimit = PRICING_CONFIG.free.sessionsPerMonth

  if (currentQuotaDoc) {
    const currentData = currentQuotaDoc.data()
    await currentQuotaDoc.ref.update({
      sessions_limit: freeLimit,
      sessions_used: Math.min(currentData.sessions_used as number, freeLimit),
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
}

/**
 * Ensure an active yearly subscriber has a correct quota doc for the current
 * billing month, creating one (usage 0) when the month rolled over.
 * Returns true when anything was created or corrected.
 */
export async function resetYearlySubscriberQuota(
  userId: string,
  profileData: { created_at?: string }
): Promise<boolean> {
  const now = new Date()

  const { periodStart, periodEnd } = calculateBillingPeriod({
    subscriptionTier: "pro",
    subscriptionType: "yearly",
    signupDate: profileData.created_at,
    referenceDate: now,
  })

  const quotaSnapshot = await adminDb
    .collection("profile_quota")
    .where("user_id", "==", userId)
    .get()

  const proLimit = PRICING_CONFIG.pro.sessionsPerMonth

  // Find quota for current billing period
  const currentQuotaDoc = quotaSnapshot.docs.find((doc) => {
    const data = doc.data()
    const quotaStart = new Date(data.period_start)
    return quotaStart >= periodStart && quotaStart <= periodEnd
  })

  if (currentQuotaDoc) {
    // Quota already exists for this period - just ensure limit and dates are correct
    const currentData = currentQuotaDoc.data()
    const needsUpdate =
      currentData.sessions_limit !== proLimit || currentData.period_end !== periodEnd.toISOString()

    if (needsUpdate) {
      await currentQuotaDoc.ref.update({
        sessions_limit: proLimit,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      return true
    }
    return false // Already correct for this period
  }

  // Create new quota for this period (resets usage to 0)
  await adminDb.collection("profile_quota").add({
    user_id: userId,
    sessions_used: 0,
    sessions_limit: proLimit,
    free_opens_remaining: 0,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  })

  return true // New quota created = reset happened
}

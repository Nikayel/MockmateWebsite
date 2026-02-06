/**
 * Subscription Expiry Cron Job
 *
 * Runs daily to:
 * 1. Check yearly plans that have expired and downgrade to free
 * 2. Send reminder emails 7 days and 1 day before expiry
 * 3. Reset monthly quotas for yearly subscribers
 *
 * Schedule: Daily at 9 AM UTC
 * Crontab: 0 9 * * *
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { PRICING_CONFIG } from "@/lib/config"
import { calculateBillingPeriod } from "@/lib/firestore-helpers"
import { logger } from "@/lib/logger"

// Create a child logger for subscription expiry cron
const cronLogger = logger.child({ service: "cron-subscription-expiry" })

const CRON_SECRET = process.env.CRON_SECRET

// Update quota when downgrading
async function updateQuotaToFree(
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

// Reset quota for yearly subscriber (new month)
async function resetYearlySubscriberQuota(
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

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization")
    if (!CRON_SECRET) {
      cronLogger.error("CRON_SECRET not configured")
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)

    const results = {
      expired: { processed: 0, downgraded: 0, failed: 0 },
      reminders: { sent7Day: 0, sent1Day: 0, failed: 0 },
      quotaResets: { processed: 0, reset: 0, failed: 0 },
    }

    // 1. Find and downgrade expired yearly subscriptions
    cronLogger.info("Checking for expired yearly subscriptions")

    const expiredQuery = await adminDb
      .collection("profiles")
      .where("subscription_type", "==", "yearly")
      .where("subscription_tier", "==", "pro")
      .where("subscription_current_period_end", "<=", now.toISOString())
      .limit(100)
      .get()

    for (const doc of expiredQuery.docs) {
      results.expired.processed++
      const userId = doc.id
      const profile = doc.data()

      try {
        // Downgrade to free
        await adminDb.collection("profiles").doc(userId).update({
          subscription_tier: "free",
          subscription_status: "expired",
          subscription_expired_at: now.toISOString(),
          updated_at: now.toISOString(),
        })

        // Update quota
        await updateQuotaToFree(userId, {
          created_at: profile.created_at as string | undefined,
          subscription_type: profile.subscription_type as string | undefined,
        })

        results.expired.downgraded++
        cronLogger.info("Downgraded user - yearly plan expired", { userId })

        // Send expiration email (non-blocking)
        if (profile.email) {
          try {
            const { sendSubscriptionCancellationEmail } = await import("@/lib/email")
            await sendSubscriptionCancellationEmail(profile.email, {
              userName: profile.full_name || "",
              userEmail: profile.email,
              isImmediate: true,
              accessUntil: now.toISOString(),
            })
          } catch (emailError) {
            cronLogger.error("Failed to send expiry email", { userId, error: emailError })
          }
        }
      } catch (error) {
        results.expired.failed++
        cronLogger.error("Failed to downgrade user", { userId, error })
      }
    }

    // 2. Send 7-day expiry reminders
    cronLogger.info("Checking for 7-day expiry reminders")

    const sevenDayQuery = await adminDb
      .collection("profiles")
      .where("subscription_type", "==", "yearly")
      .where("subscription_tier", "==", "pro")
      .where("subscription_current_period_end", "<=", sevenDaysFromNow.toISOString())
      .where("subscription_current_period_end", ">", now.toISOString())
      .limit(100)
      .get()

    for (const doc of sevenDayQuery.docs) {
      const userId = doc.id
      const profile = doc.data()

      // Skip if already sent 7-day reminder
      if (profile.yearly_expiry_reminder_7day_sent) continue

      // Check if expiry is actually within 7-8 days (not closer)
      const expiryDate = new Date(profile.subscription_current_period_end)
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntilExpiry <= 7 && daysUntilExpiry > 1 && profile.email) {
        try {
          const { sendTrialEndingEmail } = await import("@/lib/email")
          // Reusing trial ending email template with modified messaging
          await sendTrialEndingEmail(profile.email, {
            userName: profile.full_name || "",
            userEmail: profile.email,
            trialEndDate: profile.subscription_current_period_end,
          })

          // Mark reminder as sent
          await adminDb.collection("profiles").doc(userId).update({
            yearly_expiry_reminder_7day_sent: true,
            updated_at: now.toISOString(),
          })

          results.reminders.sent7Day++
          cronLogger.info("Sent 7-day reminder", { userId })
        } catch (error) {
          results.reminders.failed++
          cronLogger.error("Failed to send 7-day reminder", { userId, error })
        }
      }
    }

    // 3. Send 1-day expiry reminders
    cronLogger.info("Checking for 1-day expiry reminders")

    const oneDayQuery = await adminDb
      .collection("profiles")
      .where("subscription_type", "==", "yearly")
      .where("subscription_tier", "==", "pro")
      .where("subscription_current_period_end", "<=", oneDayFromNow.toISOString())
      .where("subscription_current_period_end", ">", now.toISOString())
      .limit(100)
      .get()

    for (const doc of oneDayQuery.docs) {
      const userId = doc.id
      const profile = doc.data()

      // Skip if already sent 1-day reminder
      if (profile.yearly_expiry_reminder_1day_sent) continue

      if (profile.email) {
        try {
          const { sendTrialEndingEmail } = await import("@/lib/email")
          await sendTrialEndingEmail(profile.email, {
            userName: profile.full_name || "",
            userEmail: profile.email,
            trialEndDate: profile.subscription_current_period_end,
          })

          await adminDb.collection("profiles").doc(userId).update({
            yearly_expiry_reminder_1day_sent: true,
            updated_at: now.toISOString(),
          })

          results.reminders.sent1Day++
          cronLogger.info("Sent 1-day reminder", { userId })
        } catch (error) {
          results.reminders.failed++
          cronLogger.error("Failed to send 1-day reminder", { userId, error })
        }
      }
    }

    // 4. Reset monthly quotas for active yearly subscribers
    // This ensures yearly plan users get their 35 sessions reset each month
    cronLogger.info("Checking yearly subscribers for monthly quota reset")

    const activeYearlyQuery = await adminDb
      .collection("profiles")
      .where("subscription_type", "==", "yearly")
      .where("subscription_tier", "==", "pro")
      .where("subscription_current_period_end", ">", now.toISOString())
      .limit(500) // Process up to 500 yearly subscribers per run
      .get()

    for (const doc of activeYearlyQuery.docs) {
      results.quotaResets.processed++
      const userId = doc.id
      const yearlyProfile = doc.data()

      try {
        const wasReset = await resetYearlySubscriberQuota(userId, {
          created_at: yearlyProfile.created_at as string | undefined,
        })
        if (wasReset) {
          results.quotaResets.reset++
          cronLogger.info("Reset monthly quota for yearly subscriber", { userId })

          // Update last_quota_reset on profile
          await adminDb.collection("profiles").doc(userId).update({
            last_quota_reset: now.toISOString(),
            updated_at: now.toISOString(),
          })
        }
      } catch (error) {
        results.quotaResets.failed++
        cronLogger.error("Failed to reset quota", { userId, error })
      }
    }

    cronLogger.info("Subscription expiry check completed", { results })

    return NextResponse.json({
      success: true,
      message: "Subscription expiry check completed",
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    cronLogger.error("Fatal error in subscription expiry cron", { error })
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}

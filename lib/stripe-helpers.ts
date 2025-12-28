/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains subscription management logic and is not part of the MIT license.
 * All rights reserved.
 *
 * Stripe helper functions for subscription management
 * Uses Firebase Admin SDK for server-side writes (bypasses security rules)
 */

import Stripe from "stripe"
import { adminDb } from "./firebase-admin"
import { Profile } from "./types"
import { PRICING_CONFIG } from "./config"
import { logger } from "./logger"

// Create a child logger for subscription operations
const subscriptionLogger = logger.child({ service: "stripe-helpers" })

// Initialize Stripe only if secret key is available
let stripe: Stripe | null = null
try {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (secretKey) {
    stripe = new Stripe(secretKey, {
      apiVersion: "2025-10-29.clover",
    })
  }
} catch (error) {
  subscriptionLogger.error("Failed to initialize Stripe", { error })
}

/**
 * Update user quota for subscription tier using Admin SDK
 */
async function updateQuotaForSubscriptionTierAdmin(userId: string, subscriptionTier: "free" | "pro" | "enterprise"): Promise<void> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const sessionsLimit = subscriptionTier === "pro"
    ? PRICING_CONFIG.pro.sessionsPerMonth
    : PRICING_CONFIG.free.sessionsPerMonth

  // Query for existing quota
  const quotaSnapshot = await adminDb.collection("profile_quota")
    .where("user_id", "==", userId)
    .get()

  // Find current period quota
  const currentQuotaDoc = quotaSnapshot.docs.find(doc => {
    const data = doc.data()
    const quotaStart = new Date(data.period_start)
    return quotaStart >= periodStart && quotaStart <= periodEnd
  })

  if (currentQuotaDoc) {
    // Update existing quota
    await currentQuotaDoc.ref.update({
      sessions_limit: sessionsLimit,
      updated_at: new Date().toISOString(),
    })
    subscriptionLogger.info("Updated quota", { userId, sessionsLimit })
  } else {
    // Create new quota
    await adminDb.collection("profile_quota").add({
      user_id: userId,
      sessions_used: 0,
      sessions_limit: sessionsLimit,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    subscriptionLogger.info("Created quota", { userId, sessionsLimit })
  }
}

/**
 * Sync user subscription status from Stripe
 * Checks Stripe subscription and updates Firestore profile accordingly
 * Uses Firebase Admin SDK to bypass security rules for server-side operations
 *
 * IMPORTANT: This function now searches for subscriptions by:
 * 1. Existing stripe_subscription_id in profile
 * 2. Existing stripe_customer_id in profile
 * 3. User's email address (for new subscribers who haven't been linked yet)
 */
export async function syncSubscriptionFromStripe(userId: string): Promise<Profile | null> {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      subscriptionLogger.warn("Stripe not initialized - cannot sync subscription")
      const profileRef = adminDb.collection("profiles").doc(userId)
      const profileSnap = await profileRef.get()
      return profileSnap.exists ? (profileSnap.data() as Profile) : null
    }

    // Get user profile using Admin SDK
    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()

    if (!profileSnap.exists) {
      subscriptionLogger.error("Profile not found", { userId })
      return null
    }

    const profile = profileSnap.data() as Profile
    const stripeSubscriptionId = profile.stripe_subscription_id as string | undefined
    let stripeCustomerId = profile.stripe_customer_id as string | undefined
    const userEmail = profile.email
    const subscriptionType = profile.subscription_type as string | undefined

    subscriptionLogger.info("Syncing subscription", {
      userId,
      hasSubscriptionId: !!stripeSubscriptionId,
      hasCustomerId: !!stripeCustomerId,
      subscriptionType,
    })

    // SPECIAL HANDLING FOR YEARLY PLANS
    // Yearly plans are one-time payments, NOT Stripe subscriptions
    // We should NOT try to find a Stripe subscription for them
    if (subscriptionType === "yearly") {
      subscriptionLogger.info("Yearly plan detected - checking validity", { userId })

      const periodEnd = profile.subscription_current_period_end
      if (periodEnd) {
        const periodEndDate = new Date(periodEnd)
        const now = new Date()

        if (now > periodEndDate) {
          // Yearly plan has expired - downgrade to free
          await profileRef.set({
            subscription_tier: "free",
            subscription_status: "expired",
            updated_at: new Date().toISOString(),
          }, { merge: true })

          await updateQuotaForSubscriptionTierAdmin(userId, "free")

          subscriptionLogger.info("Yearly plan expired - downgraded to Free", {
            userId,
            expiredAt: periodEndDate.toISOString(),
          })
        } else {
          // Yearly plan is still valid
          subscriptionLogger.info("Yearly plan still active", {
            userId,
            expiresAt: periodEndDate.toISOString(),
          })

          // Try to ensure customer ID exists for billing portal access
          if (!stripeCustomerId && userEmail) {
            try {
              const customers = await stripe.customers.list({
                email: userEmail,
                limit: 1,
              })

              if (customers.data.length > 0) {
                stripeCustomerId = customers.data[0].id
                await profileRef.set({
                  stripe_customer_id: stripeCustomerId,
                  updated_at: new Date().toISOString(),
                }, { merge: true })
                subscriptionLogger.info("Found and linked customer ID for yearly plan", { userId, customerId: stripeCustomerId })
              }
            } catch (error) {
              subscriptionLogger.warn("Failed to find customer for yearly plan", { userId, error })
            }
          }
        }
      } else {
        // No period end date - check if Pro, if so treat as issue
        if (profile.subscription_tier === "pro") {
          subscriptionLogger.warn("Yearly plan missing period end date", { userId })
        }
      }

      // Return updated profile
      const updatedProfileSnap = await profileRef.get()
      return updatedProfileSnap.exists ? (updatedProfileSnap.data() as Profile) : null
    }

    // MONTHLY PLANS - Search for Stripe subscription
    let subscription: Stripe.Subscription | null = null
    let customerId: string | null = stripeCustomerId || null

    // Step 1: Try to get subscription by existing subscription ID
    if (stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        customerId = subscription.customer as string
        subscriptionLogger.info("Found subscription by ID", { subscriptionId: stripeSubscriptionId })
      } catch (error) {
        subscriptionLogger.error("Error retrieving subscription", { subscriptionId: stripeSubscriptionId, error })
      }
    }

    // Step 2: If no subscription found, try to find via existing customer ID
    if (!subscription && stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "all",
          limit: 1,
        })

        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0]
          subscriptionLogger.info("Found subscription via customer ID", { customerId: stripeCustomerId })
        }
      } catch (error) {
        subscriptionLogger.error("Error listing subscriptions for customer", { customerId: stripeCustomerId, error })
      }
    }

    // Step 3: If STILL no subscription found, search by user's email
    // This is critical for NEW subscribers who just completed checkout
    if (!subscription && userEmail) {
      subscriptionLogger.info("Searching for Stripe customer by email", { email: userEmail })
      try {
        // Search for customers with this email
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 10, // Get multiple in case of duplicates
        })

        subscriptionLogger.info("Found customers", { email: userEmail, count: customers.data.length })

        // Check each customer for an active subscription
        for (const customer of customers.data) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: "active",
            limit: 1,
          })

          if (subscriptions.data.length > 0) {
            subscription = subscriptions.data[0]
            customerId = customer.id
            subscriptionLogger.info("Found active subscription", { customerId: customer.id })
            break
          }

          // Also check for trialing subscriptions
          const trialingSubscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: "trialing",
            limit: 1,
          })

          if (trialingSubscriptions.data.length > 0) {
            subscription = trialingSubscriptions.data[0]
            customerId = customer.id
            subscriptionLogger.info("Found trialing subscription", { customerId: customer.id })
            break
          }
        }
      } catch (error) {
        subscriptionLogger.error("Error searching customers by email", { email: userEmail, error })
      }
    }

    // Now process the subscription (or lack thereof)
    if (subscription) {
      subscriptionLogger.info("Processing subscription", {
        subscriptionId: subscription.id,
        status: subscription.status,
      })

      // Check if subscription is active
      if (subscription.status === "active" || subscription.status === "trialing") {
        // Extract subscription dates
        const subscriptionStartDate = subscription.created
          ? new Date(subscription.created * 1000).toISOString()
          : undefined
        const periodEnd = subscription.items?.data?.[0]?.current_period_end
        const currentPeriodEnd = periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : undefined

        // Update profile with subscription info
        await profileRef.set({
          subscription_tier: "pro",
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          subscription_start_date: subscriptionStartDate,
          subscription_current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        }, { merge: true })

        // Update quota to Pro limit
        await updateQuotaForSubscriptionTierAdmin(userId, "pro")

        logger.payment("Synced user to Pro", { userId, subscriptionId: subscription.id })
      } else {
        // Subscription is canceled, past_due, etc. - downgrade to free
        await profileRef.set({
          subscription_tier: "free",
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }, { merge: true })

        // Update quota to free limit
        await updateQuotaForSubscriptionTierAdmin(userId, "free")

        subscriptionLogger.info("Synced user to Free", { userId, status: subscription.status })
      }
    } else {
      subscriptionLogger.info("No subscription found", { userId })

      // Check if user has a yearly plan (one-time payment) that may have expired
      if (profile.subscription_tier === "pro" && profile.subscription_type === "yearly") {
        const periodEnd = profile.subscription_current_period_end
        if (periodEnd) {
          const periodEndDate = new Date(periodEnd)
          const now = new Date()

          if (now > periodEndDate) {
            // Yearly plan has expired - downgrade to free
            await profileRef.set({
              subscription_tier: "free",
              subscription_status: "expired",
              updated_at: new Date().toISOString(),
            }, { merge: true })

            await updateQuotaForSubscriptionTierAdmin(userId, "free")

            subscriptionLogger.info("Yearly plan expired - downgraded to Free", {
              userId,
              expiredAt: periodEndDate.toISOString(),
            })
          } else {
            // Yearly plan is still active
            subscriptionLogger.info("Yearly plan still active", {
              userId,
              expiresAt: periodEndDate.toISOString(),
            })
          }
        } else {
          // No period end date - treat as expired
          await profileRef.set({
            subscription_tier: "free",
            subscription_status: "expired",
            updated_at: new Date().toISOString(),
          }, { merge: true })

          await updateQuotaForSubscriptionTierAdmin(userId, "free")

          subscriptionLogger.warn("Yearly plan missing period end - downgraded to Free", { userId })
        }
      } else if (profile.subscription_tier === "pro") {
        // Pro user with no subscription and not yearly - downgrade
        await profileRef.set({
          subscription_tier: "free",
          subscription_status: "none",
          updated_at: new Date().toISOString(),
        }, { merge: true })

        await updateQuotaForSubscriptionTierAdmin(userId, "free")

        subscriptionLogger.info("No active subscription - downgraded to Free", { userId })
      }
    }

    // Return updated profile
    const updatedProfileSnap = await profileRef.get()
    return updatedProfileSnap.exists ? (updatedProfileSnap.data() as Profile) : null
  } catch (error) {
    subscriptionLogger.error("Error syncing subscription", { userId, error })
    throw error
  }
}

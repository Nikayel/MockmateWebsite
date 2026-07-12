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
import { getSessionsLimitForTier } from "./pricing"
import { calculateBillingPeriod } from "./firestore-helpers"
import { logger } from "./logger"

// Create a child logger for subscription operations
const subscriptionLogger = logger.child({ service: "stripe-helpers" })

// Initialize Stripe only if secret key is available
let stripe: Stripe | null = null
try {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (secretKey) {
    stripe = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover" as any,
    })
  }
} catch (error) {
  subscriptionLogger.error("Failed to initialize Stripe", { error })
}

/**
 * Update user quota for subscription tier using Admin SDK.
 *
 * Canonical quota writer shared by the Stripe webhook, subscription sync, and promo-code flows.
 *
 * @param options.resetUsage - If true, reset sessions_used to 0 (for new billing periods or tier
 *   changes). The reset is idempotent per billing period via last_reset_period_start, so a RETRIED
 *   invoice.paid webhook cannot re-zero a user's sessions mid-period and hand them unpaid usage.
 * @param options.profileData - User profile data for correct billing-period calculation.
 */
export async function updateQuotaForSubscriptionTierAdmin(
  userId: string,
  subscriptionTier: "free" | "pro" | "enterprise",
  options?: {
    resetUsage?: boolean
    profileData?: {
      created_at?: string
      subscription_type?: string
      subscription_current_period_end?: string
    }
  }
): Promise<void> {
  const resetUsage = options?.resetUsage ?? false
  const profileData = options?.profileData

  const now = new Date()

  const { periodStart, periodEnd } = calculateBillingPeriod({
    subscriptionTier,
    subscriptionType: profileData?.subscription_type,
    signupDate: profileData?.created_at,
    stripeCurrentPeriodEnd: profileData?.subscription_current_period_end,
    referenceDate: now,
  })

  const sessionsLimit = getSessionsLimitForTier(subscriptionTier)

  // Query for existing quota. PERF-S10: bound to the 12 most-recent periods (mirrors getUserQuota in
  // lib/quota-enforcement.ts) so this scan does not grow unbounded as monthly quota docs accrue. The
  // current-period doc is always the newest, so it stays within this window and the find() below still
  // resolves it. Relies on the (user_id ==, period_start desc) composite index getUserQuota already uses.
  const quotaSnapshot = await adminDb
    .collection("profile_quota")
    .where("user_id", "==", userId)
    .orderBy("period_start", "desc")
    .limit(12)
    .get()

  // Find current period quota by checking if stored period_start falls within calculated period
  const currentQuotaDoc = quotaSnapshot.docs.find((doc) => {
    const data = doc.data()
    const quotaStart = new Date(data.period_start)
    return quotaStart >= periodStart && quotaStart <= periodEnd
  })

  if (currentQuotaDoc) {
    const currentData = currentQuotaDoc.data()
    const updateData: Record<string, unknown> = {
      sessions_limit: sessionsLimit,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Reset usage if explicitly requested (new billing period) or if downgrading and usage exceeds new limit
    if (resetUsage) {
      // Idempotency guard: zero usage at most ONCE per billing period, so a RETRIED invoice.paid
      // webhook cannot re-zero a user's sessions mid-period and hand them unpaid usage. (hardening)
      if (currentData.last_reset_period_start === periodStart.toISOString()) {
        subscriptionLogger.info("Usage already reset for this period — skipping duplicate reset", {
          userId,
          periodStart: periodStart.toISOString(),
        })
      } else {
        updateData.sessions_used = 0
        updateData.free_opens_remaining = 0
        updateData.last_reset_period_start = periodStart.toISOString()
        subscriptionLogger.info("Resetting usage for new billing period", { userId, sessionsLimit })
      }
    } else if ((currentData.sessions_used as number) > sessionsLimit) {
      // If user has used more than new limit (e.g., downgrade from pro to free), cap it
      updateData.sessions_used = sessionsLimit
      subscriptionLogger.info("Capping sessions_used due to downgrade", {
        userId,
        sessionsLimit,
        previousUsed: currentData.sessions_used,
      })
    }

    await currentQuotaDoc.ref.update(updateData)
  } else {
    // Create new quota for this period. Stamp last_reset_period_start so a retried webhook that then
    // finds this doc skips the usage reset (the period already starts at 0 here). (hardening)
    await adminDb.collection("profile_quota").add({
      user_id: userId,
      sessions_used: 0,
      sessions_limit: sessionsLimit,
      free_opens_remaining: 0,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      last_reset_period_start: periodStart.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
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
          await profileRef.set(
            {
              subscription_tier: "free",
              subscription_status: "expired",
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          )

          await updateQuotaForSubscriptionTierAdmin(userId, "free", {
            profileData: {
              created_at: profile.created_at,
              subscription_type: profile.subscription_type,
            },
          })

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
                limit: 10,
              })

              // First, look for a customer with matching userId in metadata
              const matchingCustomer = customers.data.find((c) => c.metadata?.userId === userId)

              if (matchingCustomer) {
                stripeCustomerId = matchingCustomer.id
                await profileRef.set(
                  {
                    stripe_customer_id: stripeCustomerId,
                    updated_at: new Date().toISOString(),
                  },
                  { merge: true }
                )
                subscriptionLogger.info("Found customer with matching userId for yearly plan", {
                  userId,
                  customerId: stripeCustomerId,
                })
              } else if (customers.data.length === 1) {
                // Single customer with this email - safe to link
                stripeCustomerId = customers.data[0].id
                await profileRef.set(
                  {
                    stripe_customer_id: stripeCustomerId,
                    updated_at: new Date().toISOString(),
                  },
                  { merge: true }
                )
                subscriptionLogger.info("Found single customer by email for yearly plan", {
                  userId,
                  customerId: stripeCustomerId,
                })
              } else if (customers.data.length > 1) {
                // Multiple customers - don't auto-link to avoid conflicts
                subscriptionLogger.warn(
                  "Multiple customers with email, none match userId - skipping auto-link",
                  {
                    userId,
                    email: userEmail,
                    customerCount: customers.data.length,
                  }
                )
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
    // EDGE-2: track whether any Stripe lookup below failed (timeout/429/etc.).
    // A transient error leaves `subscription` null, which previously looked
    // identical to "genuinely no subscription" and auto-downgraded an active Pro
    // user. We only downgrade when every lookup completed successfully.
    let apiErrorOccurred = false

    // Step 1: Try to get subscription by existing subscription ID
    if (stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        customerId = subscription.customer as string
        subscriptionLogger.info("Found subscription by ID", {
          subscriptionId: stripeSubscriptionId,
        })
      } catch (error) {
        apiErrorOccurred = true
        subscriptionLogger.error("Error retrieving subscription", {
          subscriptionId: stripeSubscriptionId,
          error,
        })
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
          subscriptionLogger.info("Found subscription via customer ID", {
            customerId: stripeCustomerId,
          })
        }
      } catch (error) {
        apiErrorOccurred = true
        subscriptionLogger.error("Error listing subscriptions for customer", {
          customerId: stripeCustomerId,
          error,
        })
      }
    }

    // Step 3: If STILL no subscription found, search by user's email
    // This is critical for NEW subscribers who just completed checkout
    // IMPORTANT: Prioritize customers with matching userId metadata to avoid conflicts
    if (!subscription && userEmail) {
      subscriptionLogger.info("Searching for Stripe customer by email", { email: userEmail })
      try {
        // Search for customers with this email
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 10, // Get multiple in case of duplicates
        })

        subscriptionLogger.info("Found customers", {
          email: userEmail,
          count: customers.data.length,
        })

        // First pass: Only check customers with matching userId metadata (safest)
        const matchingCustomers = customers.data.filter((c) => c.metadata?.userId === userId)
        const otherCustomers = customers.data.filter((c) => c.metadata?.userId !== userId)

        // Check matching customers first
        for (const customer of matchingCustomers) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: "active",
            limit: 1,
          })

          if (subscriptions.data.length > 0) {
            subscription = subscriptions.data[0]
            customerId = customer.id
            subscriptionLogger.info("Found active subscription with matching userId", {
              customerId: customer.id,
            })
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
            subscriptionLogger.info("Found trialing subscription with matching userId", {
              customerId: customer.id,
            })
            break
          }
        }

        // Only check other customers if no matching userId found AND there's only one customer
        // This prevents accidentally linking to wrong user's subscription
        if (!subscription && matchingCustomers.length === 0 && otherCustomers.length === 1) {
          const customer = otherCustomers[0]
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: "active",
            limit: 1,
          })

          if (subscriptions.data.length > 0) {
            subscription = subscriptions.data[0]
            customerId = customer.id
            subscriptionLogger.info("Found active subscription (single customer by email)", {
              customerId: customer.id,
            })
          } else {
            const trialingSubscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              status: "trialing",
              limit: 1,
            })

            if (trialingSubscriptions.data.length > 0) {
              subscription = trialingSubscriptions.data[0]
              customerId = customer.id
              subscriptionLogger.info("Found trialing subscription (single customer by email)", {
                customerId: customer.id,
              })
            }
          }
        } else if (!subscription && otherCustomers.length > 1) {
          // Multiple customers with same email but none match userId - don't auto-link
          subscriptionLogger.warn(
            "Multiple customers with email, none match userId - skipping auto-link",
            {
              userId,
              email: userEmail,
              customerCount: otherCustomers.length,
            }
          )
        }
      } catch (error) {
        apiErrorOccurred = true
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
        const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined

        // Update profile with subscription info
        await profileRef.set(
          {
            subscription_tier: "pro",
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            subscription_start_date: subscriptionStartDate,
            subscription_current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        )

        // Update quota to Pro limit
        await updateQuotaForSubscriptionTierAdmin(userId, "pro", {
          profileData: {
            created_at: profile.created_at,
            subscription_type: profile.subscription_type ?? "monthly",
            subscription_current_period_end: currentPeriodEnd,
          },
        })

        logger.payment("Synced user to Pro", { userId, subscriptionId: subscription.id })
      } else {
        // Subscription is canceled, past_due, etc. - downgrade to free
        await profileRef.set(
          {
            subscription_tier: "free",
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        )

        // Update quota to free limit
        await updateQuotaForSubscriptionTierAdmin(userId, "free", {
          profileData: {
            created_at: profile.created_at,
            subscription_type: profile.subscription_type,
          },
        })

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
            await profileRef.set(
              {
                subscription_tier: "free",
                subscription_status: "expired",
                updated_at: new Date().toISOString(),
              },
              { merge: true }
            )

            await updateQuotaForSubscriptionTierAdmin(userId, "free", {
              profileData: {
                created_at: profile.created_at,
                subscription_type: profile.subscription_type,
              },
            })

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
          await profileRef.set(
            {
              subscription_tier: "free",
              subscription_status: "expired",
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          )

          await updateQuotaForSubscriptionTierAdmin(userId, "free", {
            profileData: {
              created_at: profile.created_at,
              subscription_type: profile.subscription_type,
            },
          })

          subscriptionLogger.warn("Yearly plan missing period end - downgraded to Free", { userId })
        }
      } else if (profile.subscription_tier === "pro" && apiErrorOccurred) {
        // EDGE-2: a Stripe lookup failed, so "no subscription found" is
        // unreliable. Do NOT downgrade — leave the profile unchanged so a
        // transient network blip can't lock an active Pro user out mid-period.
        // The next sync (page load / cron reconcile) retries.
        subscriptionLogger.warn(
          "Stripe lookup failed during sync - skipping downgrade to protect an active Pro user",
          { userId }
        )
      } else if (profile.subscription_tier === "pro") {
        // Pro user with no subscription and not yearly - downgrade
        await profileRef.set(
          {
            subscription_tier: "free",
            subscription_status: "none",
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        )

        await updateQuotaForSubscriptionTierAdmin(userId, "free", {
          profileData: {
            created_at: profile.created_at,
            subscription_type: profile.subscription_type,
          },
        })

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

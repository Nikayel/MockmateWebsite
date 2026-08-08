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
 * YEARLY UPGRADE RECOVERY
 * =======================
 * Yearly is the DEFAULT plan on /upgrade, and /api/create-checkout buys it with `mode: "payment"` —
 * a one-time charge, so no Stripe subscription object is ever created. That broke every safety net
 * behind the webhook:
 *
 *   - syncSubscriptionFromStripe's yearly branch is gated on `subscription_type === "yearly"`, a
 *     field ONLY the webhook writes. Before the webhook lands, a yearly buyer takes the monthly path,
 *     which looks for a subscription that does not exist and grants nothing.
 *   - The subscription-reconcile cron required `stripe_subscription_id != null`, which yearly never
 *     writes.
 *
 * A yearly buyer whose webhook failed was therefore charged, left on Free, and had no self-service
 * route back. The functions below recover them from the CHECKOUT SESSION, which is the only durable
 * Stripe record a one-time purchase leaves behind.
 */

/**
 * How old a checkout session may be and still be redeemed for access.
 *
 * This is the replay guard. Without it a user could re-submit last year's session id the day their
 * term expired and mint another free year. Recovery is a minutes-to-days concern (the client retries
 * on the success page, the reconcile cron sweeps daily), so 30 days is generous for the legitimate
 * case while sitting nowhere near the 365-day term boundary.
 */
export const YEARLY_RECOVERY_MAX_SESSION_AGE_MS = 30 * 24 * 60 * 60 * 1000

/** How many of a customer's recent checkout sessions the reconcile scan inspects. */
const YEARLY_RECOVERY_SESSION_SCAN_LIMIT = 20

export type YearlyRecoveryOutcome =
  | { status: "granted"; periodEnd: string }
  | { status: "already_active" }
  | { status: "not_eligible"; reason: string }

function notEligible(reason: string): YearlyRecoveryOutcome {
  return { status: "not_eligible", reason }
}

/** A 100% promo code produces `no_payment_required`, which is just as valid as `paid`. */
function isCheckoutSessionPaid(session: Stripe.Checkout.Session): boolean {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required"
}

/**
 * Grant a year of Pro from a paid yearly checkout session.
 *
 * SECURITY: every caller funnels through here, and the ownership/payment checks live here rather
 * than at the call sites, so no caller can accidentally skip them. The session must be a paid
 * one-time yearly purchase whose `metadata.userId` (or `client_reference_id`) equals the userId the
 * caller already verified.
 *
 * Idempotent: an already-granted session, or a profile already carrying an unexpired yearly term, is
 * reported as `already_active` and nothing is written. The term is measured from the session's
 * creation, not from now, so a late recovery cannot stretch the year the customer paid for.
 */
async function grantYearlyProFromSession(
  userId: string,
  session: Stripe.Checkout.Session
): Promise<YearlyRecoveryOutcome> {
  if (session.mode !== "payment") return notEligible("session is not a one-time payment")
  if (!isCheckoutSessionPaid(session)) {
    return notEligible(`session payment_status is "${session.payment_status}"`)
  }
  if (session.metadata?.planType !== "yearly") return notEligible("session is not a yearly plan")

  const sessionUserId = session.metadata?.userId || session.client_reference_id
  if (!sessionUserId || sessionUserId !== userId) {
    return notEligible("session belongs to a different user")
  }

  const purchasedAt = new Date(session.created * 1000)
  if (Date.now() - purchasedAt.getTime() > YEARLY_RECOVERY_MAX_SESSION_AGE_MS) {
    return notEligible("session is too old to redeem")
  }

  const profileRef = adminDb.collection("profiles").doc(userId)
  const profileSnap = await profileRef.get()
  if (!profileSnap.exists) return notEligible("profile not found")

  const profile = profileSnap.data() as Profile
  // `yearly_grant_session_id` is not on the Profile interface (it is written by this module and the
  // webhook purely as a redemption receipt), so read it off the raw document.
  const grantedSessionId = profileSnap.get("yearly_grant_session_id") as string | undefined
  if (grantedSessionId === session.id) return { status: "already_active" }

  const existingPeriodEnd = profile.subscription_current_period_end
  const hasUnexpiredTerm = existingPeriodEnd ? new Date(existingPeriodEnd) > new Date() : false
  if (profile.subscription_tier === "pro" && hasUnexpiredTerm) {
    return { status: "already_active" }
  }

  const periodEnd = new Date(purchasedAt)
  periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  const periodEndIso = periodEnd.toISOString()

  await profileRef.set(
    {
      subscription_tier: "pro",
      subscription_platform: session.metadata?.platform || "website",
      subscription_status: "active",
      subscription_type: "yearly",
      subscription_start_date: purchasedAt.toISOString(),
      subscription_current_period_end: periodEndIso,
      last_quota_reset: new Date().toISOString(),
      yearly_grant_session_id: session.id,
      ...(session.customer ? { stripe_customer_id: session.customer as string } : {}),
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  )

  await updateQuotaForSubscriptionTierAdmin(userId, "pro", {
    resetUsage: true,
    profileData: {
      created_at: profile.created_at,
      subscription_type: "yearly",
    },
  })

  logger.payment("Recovered a yearly purchase the webhook never granted", {
    userId,
    sessionId: session.id,
    periodEnd: periodEndIso,
  })

  return { status: "granted", periodEnd: periodEndIso }
}

/**
 * Redeem a checkout session id the caller holds (the /upgrade success URL carries it) for Pro access.
 * Used by /api/sync-subscription so a yearly buyer whose webhook failed can fix themselves on the
 * spot instead of being charged and left on Free.
 */
export async function recoverYearlyProFromSessionId(
  userId: string,
  sessionId: string
): Promise<YearlyRecoveryOutcome> {
  if (!stripe) return notEligible("Stripe is not configured")

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (error) {
    subscriptionLogger.warn("Could not retrieve checkout session for yearly recovery", {
      userId,
      sessionId,
      error,
    })
    return notEligible("checkout session could not be retrieved")
  }

  return grantYearlyProFromSession(userId, session)
}

/**
 * Find and redeem a recent paid yearly checkout session belonging to this user, without being told a
 * session id. Used by the reconcile cron, which only knows the user is on Free and has a Stripe
 * customer id.
 *
 * Deliberately never downgrades: a non-free profile returns immediately, so this job can only ever
 * restore access.
 */
export async function recoverYearlyProFromRecentCheckout(
  userId: string
): Promise<YearlyRecoveryOutcome> {
  if (!stripe) return notEligible("Stripe is not configured")

  const profileSnap = await adminDb.collection("profiles").doc(userId).get()
  if (!profileSnap.exists) return notEligible("profile not found")

  const profile = profileSnap.data() as Profile
  if (profile.subscription_tier !== "free") return { status: "already_active" }

  const customerId = profile.stripe_customer_id
  if (!customerId) return notEligible("profile has no Stripe customer id")

  let sessions: Stripe.ApiList<Stripe.Checkout.Session>
  try {
    sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: YEARLY_RECOVERY_SESSION_SCAN_LIMIT,
    })
  } catch (error) {
    subscriptionLogger.warn("Could not list checkout sessions for yearly recovery", {
      userId,
      customerId,
      error,
    })
    return notEligible("checkout sessions could not be listed")
  }

  // Newest first (Stripe returns sessions in reverse-chronological order).
  for (const session of sessions.data) {
    if (session.mode !== "payment" || session.metadata?.planType !== "yearly") continue
    if (!isCheckoutSessionPaid(session)) continue

    const outcome = await grantYearlyProFromSession(userId, session)
    if (outcome.status !== "not_eligible") return outcome
  }

  return notEligible("no redeemable yearly checkout session found")
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

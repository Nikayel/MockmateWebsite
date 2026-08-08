/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment webhook handling logic and is not part of the MIT license.
 * All rights reserved.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { updateQuotaForSubscriptionTierAdmin } from "@/lib/stripe-helpers"
import {
  sendPaymentFailedEmail,
  sendSubscriptionConfirmationEmail,
  sendSubscriptionCancellationEmail,
  sendTrialEndingEmail,
} from "@/lib/email"
import { logger } from "@/lib/logger"
import { WEBHOOK } from "@/lib/constants"
import { trackEventServer } from "@/lib/analytics-server"
import {
  markReferralConverted,
  voidReferralRewards,
  voidReferrerConversionRewards,
} from "@/lib/referrals"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required")
}

// SECURITY: Strict webhook secret selection
// In production, ONLY use STRIPE_WEBHOOK_SECRET — never fall back to a dev secret.
// STRIPE_WEBHOOK_SECRET_LOCAL is only used when NODE_ENV is exactly "development".
const isDevelopment = process.env.NODE_ENV === "development"
const webhookSecret = isDevelopment
  ? process.env.STRIPE_WEBHOOK_SECRET_LOCAL || process.env.STRIPE_WEBHOOK_SECRET
  : process.env.STRIPE_WEBHOOK_SECRET

if (!webhookSecret) {
  throw new Error(
    isDevelopment
      ? "STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_LOCAL is required in development"
      : "STRIPE_WEBHOOK_SECRET environment variable is required in production"
  )
}

// SECURITY: In production, ensure we're not accidentally using a local/test secret
if (!isDevelopment && process.env.STRIPE_WEBHOOK_SECRET_LOCAL) {
  logger.warn(
    "STRIPE_WEBHOOK_SECRET_LOCAL is set in a non-development environment — it will be ignored. " +
      "Remove it from production environment variables."
  )
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover" as any,
})

// Create a child logger for payment events
const paymentLogger = logger.child({ service: "stripe-webhook" })

/**
 * Hard cap on failed charge attempts before a subscription is marked past_due (which revokes Pro),
 * used as a backstop when Stripe keeps scheduling retries. Stripe's default smart-retry schedule
 * makes at most 4 attempts, so this only fires on a non-default/never-ending retry configuration.
 */
const MAX_DUNNING_ATTEMPTS = 4

/**
 * Record payment to payment_history collection
 */
async function recordPaymentHistory(
  userId: string,
  data: {
    type: "subscription" | "one_time"
    amount: number
    currency: string
    status: "succeeded" | "failed" | "refunded"
    stripe_payment_intent_id?: string
    stripe_invoice_id?: string
    stripe_subscription_id?: string
    stripe_checkout_session_id?: string
    description?: string
    period_start?: string
    period_end?: string
  }
): Promise<void> {
  try {
    // Idempotent doc id from the payment's UNIQUE natural key + status, so a webhook RETRY upserts the
    // same row instead of creating a duplicate (which would inflate admin revenue stats). The
    // subscription id is intentionally NOT used as a key (it repeats across monthly invoices). A
    // subscription-mode checkout carries neither an invoice nor a payment-intent id, so we key it on the
    // checkout session id, which is stable across Stripe retries; we fall back to an auto id only when
    // none of these unique ids is present, preserving prior behavior. (hardening, EDGE-13)
    const naturalKey =
      data.stripe_invoice_id || data.stripe_payment_intent_id || data.stripe_checkout_session_id
    const paymentRef = naturalKey
      ? adminDb
          .collection("payment_history")
          .doc(`${naturalKey}_${data.status}`.replace(/[^a-zA-Z0-9_-]/g, "_"))
      : adminDb.collection("payment_history").doc()
    await paymentRef.set({
      id: paymentRef.id,
      user_id: userId,
      ...data,
      created_at: new Date().toISOString(),
    })
    logger.payment("Payment recorded", {
      userId,
      type: data.type,
      amount: data.amount / 100,
      currency: data.currency,
      status: data.status,
    })
  } catch (error) {
    paymentLogger.error("Failed to record payment history", { userId, error })
    // Don't throw - payment recording is not critical
  }
}

/**
 * Dead-letter a failed webhook event so it is durable + VISIBLE. Handler failures used to be invisible
 * (no non-2xx, no record); now they land in `webhook_failures` for admin inspection / replay, and the
 * error is logged at error level to drive alerting. Best-effort: never throws. (hardening)
 */
async function recordWebhookFailure(
  event: Stripe.Event,
  stage: string,
  error: unknown
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  paymentLogger.error("WEBHOOK_FAILURE — event dead-lettered for reconciliation", {
    eventId: event.id,
    eventType: event.type,
    stage,
    error: message,
  })
  try {
    await adminDb
      .collection("webhook_failures")
      .doc(event.id)
      .set(
        {
          event_id: event.id,
          event_type: event.type,
          stage,
          error: message,
          created: event.created,
          failed_at: new Date().toISOString(),
          raw_event: JSON.parse(JSON.stringify(event)),
        },
        { merge: true }
      )
  } catch (dlqError) {
    paymentLogger.error("Failed to write webhook_failures record", {
      eventId: event.id,
      error: dlqError,
    })
  }
}

/**
 * Release the idempotency marker so Stripe's automatic retry RE-RUNS a failed event, instead of the
 * pre-written marker making the retry skip and silently dropping the entitlement update. Safe to pair
 * with retries because the entitlement mutations are idempotent (fixed-value tier writes, keyed
 * payment_history, guarded quota reset). Best-effort: never throws. (hardening)
 */
async function releaseIdempotencyMarker(eventKey: string): Promise<void> {
  try {
    await adminDb.collection("webhook_events").doc(eventKey).delete()
  } catch (releaseError) {
    paymentLogger.error("Failed to release idempotency marker", { eventKey, error: releaseError })
  }
}

/**
 * A `processing` claim older than this is assumed dead and may be taken over by a retry.
 *
 * This function is capped at 30s (vercel.json `app/api/**` maxDuration), so a LIVE invocation can
 * never hold a claim for two minutes. Anything older was killed mid-flight (timeout, OOM, deploy) and
 * its work may be half-done, so Stripe's retry must be allowed to re-run it.
 */
const IDEMPOTENCY_STALE_CLAIM_MS = 2 * 60 * 1000

/**
 * Claim the right to process this event, or report it as a duplicate.
 *
 * WHY A CLAIM AND NOT A PLAIN MARKER: the previous version wrote the marker BEFORE handling and only
 * removed it inside explicit catches. A hard kill (this function's 30s cap, hit by the synchronous
 * Brevo sends below) left the marker behind with no catch running, so Stripe's retry saw "already
 * processed" and skipped — the customer was charged and never upgraded, with no 500 and no
 * dead-letter row to notice it by.
 *
 * DESIGN CHOICE — `create()` a `processing` claim, complete it after the handler, and treat a STALE
 * processing claim as replayable. The alternative (write the marker only on success) was rejected: it
 * leaves the whole handler window unguarded, so two genuinely concurrent deliveries of the same event
 * would both run it end to end. Here `create()` fails on the second writer, so concurrent duplicates
 * still collide, while a dead claim self-heals on the next retry.
 */
async function claimIdempotencyMarker(
  eventKey: string,
  event: Stripe.Event
): Promise<"claimed" | "duplicate"> {
  const markerRef = adminDb.collection("webhook_events").doc(eventKey)
  const now = Date.now()
  const claim = {
    event_id: event.id,
    idempotency_key: event.request?.idempotency_key || null,
    event_type: event.type,
    status: "processing" as const,
    claimed_at: new Date(now).toISOString(),
    created: event.created,
    // TTL for cleanup
    expires_at: new Date(now + WEBHOOK.IDEMPOTENCY_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  }

  try {
    // create() fails if the doc exists, so this is an atomic claim against concurrent deliveries.
    await markerRef.create(claim)
    return "claimed"
  } catch {
    // Doc already exists (or create() raced). Decide from its state.
    const existing = (await markerRef.get()).data()

    // Markers written before this change carry no `status`; they only ever existed post-handling
    // under the old scheme, so treat them as completed.
    if (!existing || existing.status !== "processing") {
      return "duplicate"
    }

    const claimedAt = Date.parse(existing.claimed_at ?? "")
    const isStale = !Number.isFinite(claimedAt) || now - claimedAt > IDEMPOTENCY_STALE_CLAIM_MS
    if (!isStale) {
      return "duplicate"
    }

    paymentLogger.warn("Taking over a stale webhook claim — previous attempt died mid-flight", {
      eventKey,
      eventType: event.type,
      claimedAt: existing.claimed_at,
    })
    await markerRef.set(
      { ...claim, takeover_count: (existing.takeover_count ?? 0) + 1 },
      { merge: true }
    )
    return "claimed"
  }
}

/**
 * Close the claim so later deliveries of this event are skipped. Best-effort: never throws. If this
 * write is lost the claim simply goes stale and a retry re-runs the (idempotent) handler.
 */
async function completeIdempotencyMarker(eventKey: string): Promise<void> {
  try {
    await adminDb
      .collection("webhook_events")
      .doc(eventKey)
      .set({ status: "completed", processed_at: new Date().toISOString() }, { merge: true })
  } catch (completeError) {
    paymentLogger.error("Failed to complete idempotency marker", { eventKey, error: completeError })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    paymentLogger.error("Webhook request missing signature header")
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret!)
  } catch (err) {
    // Enhanced logging to help debug signature mismatches
    paymentLogger.error("Webhook signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
      signaturePrefix: signature.substring(0, 20) + "...",
      secretPrefix: webhookSecret ? webhookSecret.substring(0, 10) + "..." : "NOT_SET",
      bodyLength: body.length,
      isDevelopment,
      hint: "Check that STRIPE_WEBHOOK_SECRET matches the webhook endpoint in Stripe Dashboard",
    })
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // SECURITY: Replay attack protection - reject events older than configured threshold
  // Stripe events have a 'created' timestamp (Unix seconds)
  const eventAge = Date.now() / 1000 - event.created

  if (eventAge > WEBHOOK.MAX_EVENT_AGE_SECONDS) {
    paymentLogger.warn("Webhook event too old, possible replay attack", {
      eventId: event.id,
      eventType: event.type,
      eventCreated: event.created,
      eventAgeSeconds: Math.round(eventAge),
      maxAgeSeconds: WEBHOOK.MAX_EVENT_AGE_SECONDS,
    })
    return NextResponse.json({ error: "Event too old" }, { status: 400 })
  }

  // Check for idempotency - prevent processing the same event twice
  // Use event.id + idempotency_key if available for more robust deduplication
  const idempotencyKey = event.request?.idempotency_key
  const eventKey = idempotencyKey ? `${event.id}_${idempotencyKey}` : event.id

  try {
    const claim = await claimIdempotencyMarker(eventKey, event)

    if (claim === "duplicate") {
      paymentLogger.info("Event already processed, skipping", {
        eventId: event.id,
        eventType: event.type,
      })
      return NextResponse.json({ received: true, skipped: true })
    }
  } catch (idempotencyError) {
    paymentLogger.error("Error checking event idempotency", {
      eventId: event.id,
      error: idempotencyError,
    })
    // Continue processing - idempotency bookkeeping is not critical, and processing an event twice is
    // safe here (the entitlement mutations are idempotent) while dropping one is not.
  }

  paymentLogger.info("Processing webhook event", { eventId: event.id, eventType: event.type })

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    logger.payment("Processing checkout.session.completed", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      mode: session.mode,
      customerId: session.customer,
      subscriptionId: session.subscription,
      clientReferenceId: session.client_reference_id,
    })

    // Process if payment was successful OR no payment required (100% discount coupon)
    // When a 100% discount coupon is applied, payment_status is "no_payment_required" not "paid"
    const paymentSuccessful =
      session.payment_status === "paid" || session.payment_status === "no_payment_required"

    // Handle subscription mode (monthly plans)
    if (paymentSuccessful && session.mode === "subscription") {
      // Upgrade user to Pro
      const userId = session.metadata?.userId || session.client_reference_id

      if (userId) {
        paymentLogger.info("Processing subscription upgrade", { userId })
        try {
          const profileRef = adminDb.collection("profiles").doc(userId)

          // Fetch subscription details to get dates (outside transaction for Stripe API call)
          let subscriptionStartDate: string | undefined
          let currentPeriodEnd: string | undefined

          if (session.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string
              )
              subscriptionStartDate = subscription.created
                ? new Date(subscription.created * 1000).toISOString()
                : undefined
              const periodEnd = subscription.items?.data?.[0]?.current_period_end
              currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined
              paymentLogger.info("Retrieved subscription details", {
                subscriptionId: subscription.id,
                status: subscription.status,
              })
            } catch (subError) {
              paymentLogger.error("Error fetching subscription details", { error: subError })
              // Continue without dates if fetch fails
            }
          }

          // SECURITY FIX: Use Firestore transaction to prevent race conditions
          // This ensures atomic read-modify-write for profile updates
          const profile = await adminDb.runTransaction(async (transaction) => {
            const profileSnap = await transaction.get(profileRef)

            // Prepare update data
            const updateData: Record<string, unknown> = {
              subscription_tier: "pro",
              subscription_platform: session.metadata?.platform || "website",
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_status: "active",
              updated_at: new Date().toISOString(),
            }

            if (subscriptionStartDate) {
              updateData.subscription_start_date = subscriptionStartDate
            }
            if (currentPeriodEnd) {
              updateData.subscription_current_period_end = currentPeriodEnd
            }

            if (profileSnap.exists) {
              // Document exists - update to preserve other fields
              transaction.update(profileRef, updateData as Record<string, any>)
              paymentLogger.info("Updated existing profile for subscription (transactional)", {
                userId,
              })
              return profileSnap.data() as Record<string, unknown> | undefined
            } else {
              // Document doesn't exist - create with subscription data
              const newProfileData = {
                id: userId,
                email: session.customer_email || "",
                ...updateData,
                created_at: new Date().toISOString(),
              }
              transaction.set(profileRef, newProfileData)
              paymentLogger.warn(
                "Profile did not exist - created with subscription data (transactional)",
                {
                  userId,
                  email: session.customer_email || "MISSING",
                }
              )
              return newProfileData as Record<string, unknown>
            }
          })

          // PERF-S10: the profile transaction above has COMMITTED, so the user is already Pro. The
          // remaining side effects are independent of one another — each reads only the transaction's
          // `profile` result, `session`, or values computed before this point, and none reads another's
          // writes — so run them concurrently instead of serially (the serial path had blocked the ACK
          // behind a synchronous email). Ordering rule preserved: the transaction fully committed BEFORE
          // any quota work begins.
          const userEmail = (profile?.email as string) || session.customer_email
          const [quotaResult] = await Promise.allSettled([
            // Update quota to reflect Pro subscription (35 sessions) - reset usage for new subscription
            updateQuotaForSubscriptionTierAdmin(userId, "pro", {
              resetUsage: true,
              profileData: {
                created_at: profile?.created_at as string | undefined,
                subscription_type: "monthly",
                subscription_current_period_end: currentPeriodEnd,
              },
            }),
            // Record payment in history (keyed on session.id, so a Stripe retry upserts the same row)
            recordPaymentHistory(userId, {
              type: "subscription",
              amount: session.amount_total || 0,
              currency: session.currency || "usd",
              status: "succeeded",
              stripe_subscription_id: session.subscription as string,
              stripe_checkout_session_id: session.id,
              description: "Pro subscription (monthly)",
              period_start: subscriptionStartDate,
              period_end: currentPeriodEnd,
            }),
            // Mark referral as converted (free month credit for the referrer) - non-critical, never fatal
            markReferralConverted(userId).catch((referralError) => {
              paymentLogger.error("Failed to process referral conversion", {
                userId,
                error: referralError,
              })
            }),
            // Track purchase for analytics and attribution - non-critical, never fatal
            trackEventServer("purchase", {
              userId,
              plan: "pro_monthly",
              amount: (session.amount_total || 0) / 100,
              currency: session.currency || "usd",
              promoCode: session.metadata?.promoCode || null,
              source: session.metadata?.source || "direct",
              subscriptionId: session.subscription,
              customerId: session.customer,
            }).catch((analyticsError) => {
              paymentLogger.error("Failed to track purchase analytics", {
                userId,
                error: analyticsError,
              })
            }),
            // Send subscription confirmation email - non-critical, never fatal
            userEmail
              ? sendSubscriptionConfirmationEmail(userEmail, {
                  userName: (profile?.full_name as string) || "",
                  userEmail,
                  planName: "Pro (Monthly)",
                  amount: (session.amount_total || 0) / 100,
                  currency: session.currency?.toUpperCase() || "USD",
                  nextBillingDate: currentPeriodEnd,
                }).catch((emailError) => {
                  paymentLogger.error("Failed to send subscription confirmation email", {
                    userId,
                    error: emailError,
                  })
                })
              : Promise.resolve(),
          ])

          logger.payment("User upgraded to Pro", {
            userId,
            subscriptionId: session.subscription,
            customerId: session.customer,
          })

          // The quota reset is the only entitlement-critical side effect here. The profile is already
          // Pro (transaction committed), but if the reset rejected the user would hit their stale limit,
          // so dead-letter it for the reconciliation cron. Keep the 200 (matches this file's
          // dead-letter convention); the reset is idempotent per period via last_reset_period_start.
          if (quotaResult.status === "rejected") {
            await recordWebhookFailure(
              event,
              "checkout.session.completed:subscription:quota",
              quotaResult.reason
            )
          }
        } catch (error) {
          paymentLogger.error("Error updating user profile", { userId, error })
          await recordWebhookFailure(event, "checkout.session.completed:subscription", error)
          await releaseIdempotencyMarker(eventKey)
          return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
        }
      } else {
        paymentLogger.warn("checkout.session.completed missing userId", {
          sessionId: session.id,
          metadata: session.metadata,
          clientReferenceId: session.client_reference_id,
        })
        // EDGE-17: a PAID subscription checkout with no userId can never be upgraded from the event
        // alone, so dead-letter it for admin reconciliation instead of ACKing it into the void. Keep
        // the 200 (falls through to the final response): the full session is captured in
        // webhook_failures and a Stripe retry would not add the missing userId.
        await recordWebhookFailure(
          event,
          "checkout.session.completed:no-user",
          new Error(
            `Paid subscription checkout is missing userId (session ${session.id}); cannot upgrade`
          )
        )
      }
    }

    // Handle payment mode (yearly one-time plans)
    if (paymentSuccessful && session.mode === "payment") {
      const userId = session.metadata?.userId || session.client_reference_id
      const planType = session.metadata?.planType

      if (userId && planType === "yearly") {
        paymentLogger.info("Processing yearly one-time payment", { userId })
        try {
          const profileRef = adminDb.collection("profiles").doc(userId)
          const profileSnap = await profileRef.get()

          // Get existing profile data or prepare to create new
          const profile = profileSnap.exists ? profileSnap.data() : null

          if (!profileSnap.exists) {
            // Profile doesn't exist - create it with subscription data
            // This handles edge cases where profile creation failed but payment succeeded
            paymentLogger.warn("Profile does not exist for yearly plan - will create", {
              userId,
              email: session.customer_email,
            })
          }

          // Calculate subscription end date (1 year from now)
          const now = new Date()
          const oneYearFromNow = new Date(now)
          oneYearFromNow.setFullYear(now.getFullYear() + 1)

          // For one-time payments, ensure we have a customer ID
          // Priority: 1. existing profile customer, 2. session customer, 3. payment intent, 4. search/create
          let customerId = profile?.stripe_customer_id as string | undefined

          // Verify existing customer ID is still valid in Stripe
          if (customerId) {
            try {
              await stripe.customers.retrieve(customerId)
              paymentLogger.info("Using existing valid customer from profile", { customerId })
            } catch {
              paymentLogger.warn("Existing customer ID invalid, will find/create new", {
                invalidId: customerId,
              })
              customerId = undefined
            }
          }

          // If no valid profile customer, try session customer
          if (!customerId) {
            customerId = session.customer as string | undefined
            if (customerId) {
              paymentLogger.info("Using customer from session", { customerId })
            }
          }

          // If no customer in session, try to get it from payment intent
          if (!customerId && session.payment_intent) {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(
                session.payment_intent as string
              )
              customerId = paymentIntent.customer as string | undefined
              if (customerId) {
                paymentLogger.info("Retrieved customer ID from payment intent", { customerId })
              }
            } catch (piError) {
              paymentLogger.warn("Failed to retrieve customer from payment intent", {
                error: piError,
              })
            }
          }

          // If still no customer, try to find by email (with userId verification) or create new
          if (!customerId && (profile?.email || session.customer_email)) {
            const userEmail = profile?.email || session.customer_email
            try {
              // Search for existing customer by email that belongs to THIS user
              const existingCustomers = await stripe.customers.list({
                email: userEmail,
                limit: 10, // Check multiple in case of duplicates
              })

              // Find a customer that matches this userId in metadata
              const matchingCustomer = existingCustomers.data.find(
                (c) => c.metadata?.userId === userId
              )

              if (matchingCustomer) {
                customerId = matchingCustomer.id
                paymentLogger.info("Found existing customer by email with matching userId", {
                  customerId,
                  email: userEmail,
                })
              } else if (existingCustomers.data.length === 0) {
                // No customers with this email - safe to create new one
                const newCustomer = await stripe.customers.create({
                  email: userEmail,
                  metadata: {
                    userId: userId,
                    plan: "yearly",
                    source: "checkout_recovery",
                  },
                })
                customerId = newCustomer.id
                paymentLogger.info("Created new customer for yearly plan", {
                  customerId,
                  email: userEmail,
                })
              } else {
                // Customers exist but none match this userId - create new to avoid conflict
                paymentLogger.warn(
                  "Found customers with email but none match userId - creating new",
                  {
                    email: userEmail,
                    userId,
                    existingCustomerCount: existingCustomers.data.length,
                  }
                )
                const newCustomer = await stripe.customers.create({
                  email: userEmail,
                  metadata: {
                    userId: userId,
                    plan: "yearly",
                    source: "checkout_new_user",
                  },
                })
                customerId = newCustomer.id
                paymentLogger.info("Created separate customer to avoid email conflict", {
                  customerId,
                  email: userEmail,
                })
              }
            } catch (customerError) {
              paymentLogger.error("Failed to find/create customer by email", {
                error: customerError,
                email: userEmail,
              })
            }
          }

          // Update profile with Pro access for 1 year
          const updateData: Record<string, unknown> = {
            subscription_tier: "pro",
            subscription_platform: session.metadata?.platform || "website",
            subscription_status: "active",
            subscription_start_date: now.toISOString(),
            subscription_current_period_end: oneYearFromNow.toISOString(),
            subscription_type: "yearly",
            last_quota_reset: now.toISOString(), // Track when quota was last reset for monthly resets
            updated_at: new Date().toISOString(),
          }

          if (customerId) {
            updateData.stripe_customer_id = customerId
          } else {
            paymentLogger.error(
              "Yearly plan: CRITICAL - No customer ID found after all recovery attempts",
              {
                userId,
                sessionId: session.id,
                hasPaymentIntent: !!session.payment_intent,
                email: profile?.email || session.customer_email,
              }
            )
          }

          // Use set with merge to handle both update and create cases
          // This ensures profile is created if it doesn't exist
          if (!profileSnap.exists) {
            // Add required fields for new profile
            updateData.id = userId
            updateData.email = session.customer_email || ""
            updateData.created_at = new Date().toISOString()
          }
          await profileRef.set(updateData, { merge: true })
          paymentLogger.info(
            profileSnap.exists
              ? "Updated profile for yearly plan"
              : "Created profile for yearly plan",
            {
              userId,
              expiresAt: oneYearFromNow.toISOString(),
            }
          )

          // Update quota to Pro limit - reset usage for new subscription
          await updateQuotaForSubscriptionTierAdmin(userId, "pro", {
            resetUsage: true,
            profileData: {
              created_at: (profile?.created_at as string | undefined) ?? new Date().toISOString(),
              subscription_type: "yearly",
            },
          })

          // Record payment in history
          await recordPaymentHistory(userId, {
            type: "one_time",
            amount: session.amount_total || 0,
            currency: session.currency || "usd",
            status: "succeeded",
            description: "Pro subscription (yearly)",
            period_start: now.toISOString(),
            period_end: oneYearFromNow.toISOString(),
          })

          logger.payment("User upgraded to Pro (yearly)", {
            userId,
            customerId: session.customer,
          })

          // Mark referral as converted (if user was referred)
          // This triggers the free month credit for the referrer
          try {
            await markReferralConverted(userId)
          } catch (referralError) {
            paymentLogger.error("Failed to process referral conversion", {
              userId,
              error: referralError,
            })
            // Don't fail the webhook - referral processing is non-critical
          }

          // Track purchase for analytics and attribution
          await trackEventServer("purchase", {
            userId,
            plan: "pro_yearly",
            amount: (session.amount_total || 0) / 100,
            currency: session.currency || "usd",
            promoCode: session.metadata?.promoCode || null,
            source: session.metadata?.source || "direct",
            customerId: session.customer,
          })

          // Send subscription confirmation email
          const userEmail = profile?.email || session.customer_email
          if (userEmail) {
            try {
              await sendSubscriptionConfirmationEmail(userEmail, {
                userName: profile?.full_name || "",
                userEmail,
                planName: "Pro (Yearly)",
                amount: (session.amount_total || 0) / 100,
                currency: session.currency?.toUpperCase() || "USD",
                nextBillingDate: oneYearFromNow.toISOString(),
              })
            } catch (emailError) {
              paymentLogger.error("Failed to send subscription confirmation email", {
                userId,
                error: emailError,
              })
            }
          }
        } catch (error) {
          paymentLogger.error("Error updating user profile for yearly plan", { userId, error })
          await recordWebhookFailure(event, "checkout.session.completed:yearly", error)
          await releaseIdempotencyMarker(eventKey)
          return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
        }
      } else {
        paymentLogger.info("Skipping payment mode - not yearly plan", { planType, userId })
      }
    }

    if (!paymentSuccessful || (session.mode !== "subscription" && session.mode !== "payment")) {
      paymentLogger.info("Skipping checkout.session.completed", {
        paymentStatus: session.payment_status,
        mode: session.mode,
      })
    }
  }

  // Handle failed payments - notify users and update subscription status
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice

    logger.payment("Payment failed", { invoiceId: invoice.id, customerId: invoice.customer })

    try {
      const customerId = invoice.customer as string
      if (customerId) {
        const profilesQuery = await adminDb
          .collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .limit(1)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const userId = profileDoc.id
          const profileRef = adminDb.collection("profiles").doc(userId)

          // `past_due` is a HARD LOCKOUT downstream: lib/quota-enforcement.ts lists it in
          // INACTIVE_SUBSCRIPTION_STATUSES, so writing it strips Pro access immediately. Setting it on
          // the FIRST decline punished a paying customer for an expired card while Stripe was still
          // happily retrying, and Stripe's dunning runs for days. So we only lock once Stripe itself
          // reports the retry sequence is over.
          //
          // THRESHOLD: `next_payment_attempt == null` is Stripe's own "I will not try again" signal —
          // it is set while smart retries remain and cleared when dunning is exhausted. The
          // `attempt_count` cap is a backstop for a misconfigured retry schedule that never gives up,
          // so an unpayable subscription cannot keep Pro access forever.
          const attemptCount = invoice.attempt_count ?? 0
          const retriesExhausted =
            !invoice.next_payment_attempt || attemptCount >= MAX_DUNNING_ATTEMPTS

          const failureUpdate: Record<string, unknown> = {
            payment_failed_at: new Date().toISOString(),
            payment_failure_reason: invoice.last_finalization_error?.message || "Payment declined",
            payment_attempt_count: attemptCount,
            updated_at: new Date().toISOString(),
          }
          if (retriesExhausted) {
            failureUpdate.subscription_status = "past_due"
          }

          await profileRef.set(failureUpdate, { merge: true })

          if (retriesExhausted) {
            paymentLogger.warn("Subscription marked as past_due — Stripe dunning exhausted", {
              userId,
              attemptCount,
            })
          } else {
            paymentLogger.info("Payment failed but Stripe will retry — Pro access preserved", {
              userId,
              attemptCount,
              nextPaymentAttempt: invoice.next_payment_attempt,
            })
          }

          // Send payment failure email notification on EVERY failure. The customer needs to fix their
          // card during the retry window; that is the whole point of not locking them out yet.
          const profile = profileDoc.data()
          if (profile?.email) {
            try {
              await sendPaymentFailedEmail(profile.email, {
                userName: profile.full_name || "",
                userEmail: profile.email,
                failureReason: invoice.last_finalization_error?.message || "Payment declined",
              })
              paymentLogger.info("Payment failure email sent", { userId, email: profile.email })
            } catch (emailError) {
              paymentLogger.error("Failed to send payment failure email", {
                userId,
                error: emailError,
              })
            }
          }
        }
      }
    } catch (error) {
      // EDGE-8: dead-letter so a failed past_due update is durable + retryable
      // (banner + dunning email depend on it). Keep 200 (consistent with the
      // dispute/uncollectible siblings) so Stripe doesn't hammer-retry.
      paymentLogger.error("Error handling payment failure", { error })
      await recordWebhookFailure(event, "invoice.payment_failed", error)
    }
  }

  // Handle 3D Secure / payment action required
  if (event.type === "invoice.payment_action_required") {
    const invoice = event.data.object as Stripe.Invoice

    logger.payment("Payment action required (3D Secure)", {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    })

    try {
      const customerId = invoice.customer as string
      if (customerId) {
        const profilesQuery = await adminDb
          .collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .limit(1)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const userId = profileDoc.id
          const profile = profileDoc.data()

          // Update subscription status to indicate action required
          await adminDb.collection("profiles").doc(userId).set(
            {
              subscription_status: "requires_action",
              payment_action_url: invoice.hosted_invoice_url,
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          )

          paymentLogger.info("User requires payment action", { userId })
        }
      }
    } catch (error) {
      paymentLogger.error("Error handling payment action required", { error })
    }
  }

  // Handle charge failures (declined cards, etc.)
  if (event.type === "charge.failed") {
    const charge = event.data.object as Stripe.Charge

    logger.payment("Charge failed", {
      chargeId: charge.id,
      failureCode: charge.failure_code,
      failureMessage: charge.failure_message,
    })

    try {
      const customerId = charge.customer as string
      if (customerId) {
        const profilesQuery = await adminDb
          .collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .limit(1)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const userId = profileDoc.id
          const profileRef = adminDb.collection("profiles").doc(userId)

          await profileRef.set(
            {
              last_charge_failure: {
                charge_id: charge.id,
                failure_code: charge.failure_code,
                failure_message: charge.failure_message,
                occurred_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          )

          paymentLogger.warn("Recorded charge failure", {
            userId,
            failureMessage: charge.failure_message,
          })
        }
      }
    } catch (error) {
      paymentLogger.error("Error handling charge failure", { error })
    }
  }

  // Handle refunds
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge

    logger.payment("Charge refunded", {
      chargeId: charge.id,
      amountRefunded: charge.amount_refunded,
      refundStatus: charge.refunded ? "full" : "partial",
    })

    try {
      const customerId = charge.customer as string
      if (customerId) {
        const profilesQuery = await adminDb
          .collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .limit(1)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const userId = profileDoc.id

          // Record refund in payment history
          await recordPaymentHistory(userId, {
            type: "subscription",
            amount: -(charge.amount_refunded || 0),
            currency: charge.currency || "usd",
            status: "refunded",
            stripe_payment_intent_id: charge.payment_intent as string,
            description: charge.refunded ? "Full refund" : "Partial refund",
          })

          // REFERRAL CLAWBACK: Void pending referral rewards
          // Two scenarios:
          // 1. User was referred - void rewards their referrer would get (voidReferralRewards)
          // 2. User referred others - void their pending conversion rewards (voidReferrerConversionRewards)
          try {
            const refundReason = `Refund processed: ${charge.refunded ? "full" : "partial"} refund`

            // Void rewards where this user is the referred user (their referrer loses rewards)
            await voidReferralRewards(userId, refundReason)

            // Void conversion rewards where this user is the referrer
            // This handles case where a Pro user who referred others refunds their subscription
            await voidReferrerConversionRewards(userId, refundReason)

            paymentLogger.info("Voided referral rewards due to refund", { userId })
          } catch (clawbackError) {
            paymentLogger.error("Failed to void referral rewards", { userId, error: clawbackError })
            // Don't fail the webhook - clawback is non-critical
          }

          // If fully refunded, downgrade user
          if (charge.refunded) {
            await adminDb.collection("profiles").doc(userId).set(
              {
                subscription_tier: "free",
                subscription_status: "refunded",
                updated_at: new Date().toISOString(),
              },
              { merge: true }
            )

            const refundProfile = profileDoc.data()
            await updateQuotaForSubscriptionTierAdmin(userId, "free", {
              resetUsage: false,
              profileData: {
                created_at: refundProfile?.created_at,
                subscription_type: refundProfile?.subscription_type,
              },
            })
            paymentLogger.info("User downgraded due to full refund", { userId })
          }
        }
      }
    } catch (error) {
      // EDGE-7: dead-letter so a failed refund downgrade is durable + retryable
      // (otherwise a fully-refunded user keeps Pro forever). Keep 200.
      paymentLogger.error("Error handling refund", { error })
      await recordWebhookFailure(event, "charge.refunded", error)
    }
  }

  // Handle successful payment - subscription renewal or recovery
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice

    logger.payment("Invoice paid", {
      invoiceId: invoice.id,
      billingReason: invoice.billing_reason,
      amountPaid: invoice.amount_paid,
    })

    try {
      const customerId = invoice.customer as string
      if (customerId) {
        const profilesQuery = await adminDb
          .collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .limit(1)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const profile = profileDoc.data()
          const userId = profileDoc.id
          const profileRef = adminDb.collection("profiles").doc(userId)

          // Record payment in history
          const invoiceSubscription = invoice.parent?.subscription_details?.subscription
          const subscriptionId =
            typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id
          await recordPaymentHistory(userId, {
            type: "subscription",
            amount: invoice.amount_paid || 0,
            currency: invoice.currency || "usd",
            status: "succeeded",
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            description:
              invoice.billing_reason === "subscription_cycle"
                ? "Monthly subscription renewal"
                : invoice.billing_reason === "subscription_create"
                  ? "Initial subscription payment"
                  : `Subscription payment (${invoice.billing_reason})`,
            period_start: invoice.period_start
              ? new Date(invoice.period_start * 1000).toISOString()
              : undefined,
            period_end: invoice.period_end
              ? new Date(invoice.period_end * 1000).toISOString()
              : undefined,
          })

          // Handle subscription cycle - new billing period = reset usage
          if (invoice.billing_reason === "subscription_cycle") {
            paymentLogger.info("New billing period - resetting usage", { userId })

            // Update profile with new period end date
            await profileRef.set(
              {
                subscription_status: "active",
                subscription_current_period_end: invoice.period_end
                  ? new Date(invoice.period_end * 1000).toISOString()
                  : undefined,
                updated_at: new Date().toISOString(),
              },
              { merge: true }
            )

            // Reset usage for new billing period
            const newPeriodEnd = invoice.period_end
              ? new Date(invoice.period_end * 1000).toISOString()
              : undefined
            await updateQuotaForSubscriptionTierAdmin(userId, "pro", {
              resetUsage: true,
              profileData: {
                created_at: profile?.created_at,
                subscription_type: profile?.subscription_type ?? "monthly",
                subscription_current_period_end: newPeriodEnd,
              },
            })

            logger.payment("Subscription renewed", { userId })
          }
          // Handle recovery from a failed payment. `payment_failed_at` is also checked because a
          // decline inside Stripe's retry window now records the failure WITHOUT setting past_due
          // (see invoice.payment_failed); without this the dunning flags would never be cleared.
          else if (profile?.subscription_status === "past_due" || profile?.payment_failed_at) {
            await profileRef.set(
              {
                subscription_status: "active",
                subscription_tier: "pro",
                payment_failed_at: null,
                payment_failure_reason: null,
                payment_attempt_count: null,
                payment_recovered_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { merge: true }
            )

            // Restore Pro quota (don't reset usage - they're catching up)
            await updateQuotaForSubscriptionTierAdmin(userId, "pro", {
              resetUsage: false,
              profileData: {
                created_at: profile?.created_at,
                subscription_type: profile?.subscription_type ?? "monthly",
                subscription_current_period_end: profile?.subscription_current_period_end,
              },
            })

            logger.payment("Subscription recovered", { userId })
          }
        }
      }
    } catch (error) {
      // EDGE-3: dead-letter so a failed renewal quota-reset is durable + retryable
      // (otherwise a paying user hits "limit reached" on day 1 of a paid month).
      // Keep 200; the reset is idempotent per period via last_reset_period_start.
      paymentLogger.error("Error handling invoice.paid", { error })
      await recordWebhookFailure(event, "invoice.paid", error)
    }
  }

  // Handle subscription paused
  if (event.type === "customer.subscription.paused") {
    const subscription = event.data.object as Stripe.Subscription

    logger.payment("Subscription paused", { subscriptionId: subscription.id })

    try {
      const profilesQuery = await adminDb
        .collection("profiles")
        .where("stripe_subscription_id", "==", subscription.id)
        .limit(1)
        .get()

      if (!profilesQuery.empty) {
        const profileDoc = profilesQuery.docs[0]
        const userId = profileDoc.id

        await adminDb.collection("profiles").doc(userId).set(
          {
            subscription_status: "paused",
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        )

        // Keep Pro tier but note the pause
        paymentLogger.info("Subscription paused for user", { userId })
      }
    } catch (error) {
      paymentLogger.error("Error handling subscription pause", { error })
    }
  }

  // Handle trial ending soon (3 days before)
  if (event.type === "customer.subscription.trial_will_end") {
    const subscription = event.data.object as Stripe.Subscription

    logger.payment("Trial ending soon", {
      subscriptionId: subscription.id,
      trialEnd: subscription.trial_end,
    })

    try {
      const profilesQuery = await adminDb
        .collection("profiles")
        .where("stripe_subscription_id", "==", subscription.id)
        .limit(1)
        .get()

      if (!profilesQuery.empty) {
        const profileDoc = profilesQuery.docs[0]
        const userId = profileDoc.id
        const profile = profileDoc.data()

        if (profile?.email) {
          try {
            const trialEndDate = subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : undefined
            await sendTrialEndingEmail(profile.email, {
              userName: profile.full_name || "",
              userEmail: profile.email,
              trialEndDate,
            })
            paymentLogger.info("Trial ending email sent", { userId })
          } catch (emailError) {
            paymentLogger.error("Failed to send trial ending email", { userId, error: emailError })
          }
        }
      }
    } catch (error) {
      paymentLogger.error("Error handling trial will end", { error })
    }
  }

  // Handle subscription updates/cancellations with GRACE PERIOD support
  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
  ) {
    const subscription = event.data.object as Stripe.Subscription

    try {
      const profilesQuery = await adminDb
        .collection("profiles")
        .where("stripe_subscription_id", "==", subscription.id)
        .limit(1)
        .get()

      if (!profilesQuery.empty) {
        const profileDoc = profilesQuery.docs[0]
        const profile = profileDoc.data()
        const userId = profileDoc.id
        const profileRef = adminDb.collection("profiles").doc(userId)

        const periodEnd = subscription.items?.data?.[0]?.current_period_end
        const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined

        // GRACE PERIOD: Check if subscription is set to cancel at period end
        // User keeps Pro access until current_period_end
        if (subscription.cancel_at_period_end && subscription.status === "active") {
          // User canceled but should keep access until period end
          await profileRef.set(
            {
              subscription_tier: "pro", // Keep Pro access!
              subscription_status: "cancel_at_period_end",
              subscription_cancel_at: currentPeriodEnd,
              subscription_current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          )

          logger.payment("Subscription scheduled for cancellation (grace period)", {
            userId,
            cancelAt: currentPeriodEnd,
          })

          // Send cancellation confirmation email
          if (profile?.email) {
            try {
              await sendSubscriptionCancellationEmail(profile.email, {
                userName: profile.full_name || "",
                userEmail: profile.email,
                accessUntil: currentPeriodEnd,
                isImmediate: false,
              })
            } catch (emailError) {
              paymentLogger.error("Failed to send cancellation email", {
                userId,
                error: emailError,
              })
            }
          }
        }
        // IMMEDIATE CANCELLATION: Subscription is actually deleted or canceled/unpaid
        else if (
          event.type === "customer.subscription.deleted" ||
          subscription.status === "canceled" ||
          subscription.status === "unpaid"
        ) {
          // Actually downgrade to free tier
          await profileRef.set(
            {
              subscription_tier: "free",
              subscription_status: subscription.status,
              subscription_current_period_end: currentPeriodEnd,
              subscription_cancel_at: null,
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          )

          await updateQuotaForSubscriptionTierAdmin(userId, "free", {
            resetUsage: false,
            profileData: {
              created_at: profile?.created_at,
              subscription_type: profile?.subscription_type,
            },
          })

          logger.payment("User downgraded to Free", {
            userId,
            reason: subscription.status,
          })

          // Send immediate cancellation email
          if (profile?.email && event.type === "customer.subscription.deleted") {
            try {
              await sendSubscriptionCancellationEmail(profile.email, {
                userName: profile.full_name || "",
                userEmail: profile.email,
                accessUntil: new Date().toISOString(),
                isImmediate: true,
              })
            } catch (emailError) {
              paymentLogger.error("Failed to send cancellation email", {
                userId,
                error: emailError,
              })
            }
          }
        }
        // ACTIVE: Subscription is active (not canceling)
        else if (subscription.status === "active") {
          // Update subscription details (e.g., period end date)
          await profileRef.set(
            {
              subscription_tier: "pro",
              subscription_status: subscription.status,
              subscription_current_period_end: currentPeriodEnd,
              subscription_cancel_at: null, // Clear any pending cancellation
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          )

          paymentLogger.info("Subscription updated", { userId, status: subscription.status })
        }
      } else {
        paymentLogger.warn("No user found with subscription ID", {
          subscriptionId: subscription.id,
        })
      }
    } catch (error) {
      paymentLogger.error("Error handling subscription update/deletion", { error })
      await recordWebhookFailure(event, "customer.subscription.updated/deleted", error)
      await releaseIdempotencyMarker(eventKey)
      return NextResponse.json({ error: "Failed to process subscription event" }, { status: 500 })
    }
  }

  // Handle customer deletion in Stripe
  if (event.type === "customer.deleted") {
    const customer = event.data.object as Stripe.Customer

    logger.payment("Customer deleted in Stripe", { customerId: customer.id })

    try {
      // Find all profiles with this customer ID
      const profilesQuery = await adminDb
        .collection("profiles")
        .where("stripe_customer_id", "==", customer.id)
        .get()

      if (!profilesQuery.empty) {
        for (const profileDoc of profilesQuery.docs) {
          const userId = profileDoc.id
          const profile = profileDoc.data()

          // Clear customer ID but keep subscription info if subscription still exists
          // This handles the case where customer is deleted but subscription might still be active
          const updateData: Record<string, unknown> = {
            stripe_customer_id: null,
            updated_at: new Date().toISOString(),
          }

          // If subscription ID exists, verify it's still valid
          if (profile?.stripe_subscription_id) {
            try {
              const subscription = await stripe.subscriptions.retrieve(
                profile.stripe_subscription_id
              )
              // Subscription still exists - keep it
              paymentLogger.info("Customer deleted but subscription still exists", {
                userId,
                subscriptionId: subscription.id,
              })
            } catch (subError) {
              // Subscription doesn't exist - clear it too
              updateData.stripe_subscription_id = null
              updateData.subscription_tier = "free"
              updateData.subscription_status = "deleted"
              paymentLogger.warn("Customer and subscription deleted", { userId })
            }
          } else {
            // No subscription ID - downgrade to free
            updateData.subscription_tier = "free"
            updateData.subscription_status = "deleted"
          }

          await adminDb.collection("profiles").doc(userId).set(updateData, { merge: true })
          paymentLogger.info("Cleared customer ID from profile", { userId })
        }
      }
    } catch (error) {
      paymentLogger.error("Error handling customer deletion", { error })
    }
  }

  // Handle charge disputes (chargebacks) - downgrade user and record
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute

    logger.payment("Charge dispute created (chargeback)", {
      disputeId: dispute.id,
      chargeId: dispute.charge,
      amount: dispute.amount,
      reason: dispute.reason,
    })

    try {
      // Get the charge to find the customer
      const charge =
        typeof dispute.charge === "string"
          ? await stripe.charges.retrieve(dispute.charge)
          : dispute.charge

      const customerId = typeof charge === "object" ? (charge.customer as string) : null
      if (customerId) {
        const profilesQuery = await adminDb
          .collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .limit(1)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const userId = profileDoc.id

          // Downgrade to free tier on dispute
          await adminDb.collection("profiles").doc(userId).set(
            {
              subscription_tier: "free",
              subscription_status: "disputed",
              dispute_id: dispute.id,
              dispute_reason: dispute.reason,
              dispute_created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          )

          const profile = profileDoc.data()
          await updateQuotaForSubscriptionTierAdmin(userId, "free", {
            resetUsage: false,
            profileData: {
              created_at: profile?.created_at,
              subscription_type: profile?.subscription_type,
            },
          })

          // Void referral rewards (same as refund)
          try {
            await voidReferralRewards(userId, `Dispute/chargeback: ${dispute.reason}`)
            await voidReferrerConversionRewards(userId, `Dispute/chargeback: ${dispute.reason}`)
          } catch (clawbackError) {
            paymentLogger.error("Failed to void referral rewards on dispute", {
              userId,
              error: clawbackError,
            })
          }

          paymentLogger.warn("User downgraded due to chargeback dispute", {
            userId,
            disputeId: dispute.id,
            reason: dispute.reason,
          })
        }
      }
    } catch (error) {
      paymentLogger.error("Error handling charge dispute", { error })
      // Entitlement-affecting (downgrade to free): dead-letter so a dropped downgrade is visible and
      // recoverable by the reconciliation cron, rather than silently swallowed. (hardening)
      await recordWebhookFailure(event, "charge.dispute.created", error)
    }
  }

  // Handle invoices marked as uncollectible - downgrade user
  if (event.type === "invoice.marked_uncollectible") {
    const invoice = event.data.object as Stripe.Invoice

    logger.payment("Invoice marked uncollectible", {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amountDue: invoice.amount_due,
    })

    try {
      const customerId = invoice.customer as string
      if (customerId) {
        const profilesQuery = await adminDb
          .collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .limit(1)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const userId = profileDoc.id

          await adminDb.collection("profiles").doc(userId).set(
            {
              subscription_tier: "free",
              subscription_status: "uncollectible",
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          )

          const profile = profileDoc.data()
          await updateQuotaForSubscriptionTierAdmin(userId, "free", {
            resetUsage: false,
            profileData: {
              created_at: profile?.created_at,
              subscription_type: profile?.subscription_type,
            },
          })

          paymentLogger.warn("User downgraded due to uncollectible invoice", { userId })
        }
      }
    } catch (error) {
      paymentLogger.error("Error handling uncollectible invoice", { error })
      // Entitlement-affecting (downgrade to free): dead-letter so a dropped downgrade is visible and
      // recoverable by the reconciliation cron, rather than silently swallowed. (hardening)
      await recordWebhookFailure(event, "invoice.marked_uncollectible", error)
    }
  }

  // Handle subscription created (for subscriptions created via API, not checkout)
  // Note: checkout.session.completed already handles most subscription creations
  if (event.type === "customer.subscription.created") {
    const subscription = event.data.object as Stripe.Subscription

    logger.payment("Subscription created", {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    })

    // This is mainly for logging - checkout.session.completed handles the actual profile update
    // But we can use this to catch subscriptions created outside of checkout flow
    try {
      const customerId = subscription.customer as string
      if (customerId) {
        const profilesQuery = await adminDb
          .collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .limit(1)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const userId = profileDoc.id
          const profile = profileDoc.data()

          // Only update if profile doesn't already have this subscription
          // This prevents overwriting data from checkout.session.completed
          if (profile?.stripe_subscription_id !== subscription.id) {
            paymentLogger.info("Subscription created outside checkout flow", {
              userId,
              subscriptionId: subscription.id,
            })
            // Could sync subscription here, but checkout.session.completed should handle it
            // Leaving this as informational for now
          }
        }
      }
    } catch (error) {
      paymentLogger.error("Error handling subscription created", { error })
    }
  }

  // Only now is the event genuinely handled. Closing the claim here (rather than before handling) is
  // what makes a killed invocation replayable instead of permanently deduplicated.
  await completeIdempotencyMarker(eventKey)

  return NextResponse.json({ received: true })
}

/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment webhook handling logic and is not part of the MIT license.
 * All rights reserved.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { PRICING_CONFIG } from "@/lib/config"
import {
  sendPaymentFailedEmail,
  sendSubscriptionConfirmationEmail,
  sendSubscriptionCancellationEmail,
  sendTrialEndingEmail,
} from "@/lib/email"
import { logger } from "@/lib/logger"
import { trackEventServer } from "@/lib/analytics-server"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required")
}

// Support both production webhook secret and local Stripe CLI secret
// For local testing: use STRIPE_WEBHOOK_SECRET_LOCAL (from `stripe listen`)
// For production: use STRIPE_WEBHOOK_SECRET (from Stripe Dashboard)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LOCAL || process.env.STRIPE_WEBHOOK_SECRET

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_LOCAL environment variable is required")
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
})

// Create a child logger for payment events
const paymentLogger = logger.child({ service: "stripe-webhook" })

/**
 * Update user quota for subscription tier using Admin SDK
 * @param resetUsage - If true, reset sessions_used to 0 (for new billing periods or tier changes)
 */
async function updateQuotaForSubscriptionTierAdmin(
  userId: string,
  subscriptionTier: "free" | "pro" | "enterprise",
  resetUsage: boolean = false
): Promise<void> {
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
    const currentData = currentQuotaDoc.data()
    const updateData: Record<string, unknown> = {
      sessions_limit: sessionsLimit,
      updated_at: new Date().toISOString(),
    }

    // Reset usage if explicitly requested (new billing period) or if downgrading and usage exceeds new limit
    if (resetUsage) {
      updateData.sessions_used = 0
      updateData.free_opens_remaining = 0
      paymentLogger.info("Resetting usage for new billing period", { userId, sessionsLimit })
    } else if ((currentData.sessions_used as number) > sessionsLimit) {
      // If user has used more than new limit (e.g., downgrade from pro to free), cap it
      // This ensures display shows correct "X/Y" where X <= Y
      updateData.sessions_used = sessionsLimit
      paymentLogger.info("Capping sessions_used due to downgrade", { userId, sessionsLimit, previousUsed: currentData.sessions_used })
    }

    await currentQuotaDoc.ref.update(updateData)
  } else {
    // Create new quota for this period
    await adminDb.collection("profile_quota").add({
      user_id: userId,
      sessions_used: 0,
      sessions_limit: sessionsLimit,
      free_opens_remaining: 0,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
}

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
    description?: string
    period_start?: string
    period_end?: string
  }
): Promise<void> {
  try {
    const paymentRef = adminDb.collection("payment_history").doc()
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

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret!)
  } catch (err) {
    paymentLogger.error("Webhook signature verification failed", { error: err })
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Check for idempotency - prevent processing the same event twice
  // Use event.id + idempotency_key if available for more robust deduplication
  const idempotencyKey = event.request?.idempotency_key
  const eventKey = idempotencyKey ? `${event.id}_${idempotencyKey}` : event.id

  try {
    const processedEventRef = adminDb.collection("webhook_events").doc(eventKey)
    const processedEventSnap = await processedEventRef.get()

    if (processedEventSnap.exists) {
      paymentLogger.info("Event already processed, skipping", { eventId: event.id, eventType: event.type })
      return NextResponse.json({ received: true, skipped: true })
    }

    // Mark event as being processed (with TTL for cleanup)
    await processedEventRef.set({
      event_id: event.id,
      idempotency_key: idempotencyKey || null,
      event_type: event.type,
      processed_at: new Date().toISOString(),
      created: event.created,
      // TTL: 30 days for cleanup
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (idempotencyError) {
    paymentLogger.error("Error checking event idempotency", { eventId: event.id, error: idempotencyError })
    // Continue processing - idempotency check is not critical
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
    const paymentSuccessful = session.payment_status === "paid" || session.payment_status === "no_payment_required"

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
              currentPeriodEnd = periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : undefined
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
              paymentLogger.info("Updated existing profile for subscription (transactional)", { userId })
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
              paymentLogger.warn("Profile did not exist - created with subscription data (transactional)", {
                userId,
                email: session.customer_email || "MISSING",
              })
              return newProfileData as Record<string, unknown>
            }
          })

          // Update quota to reflect Pro subscription (35 sessions) - reset usage for new subscription
          await updateQuotaForSubscriptionTierAdmin(userId, "pro", true)

          // Record payment in history
          await recordPaymentHistory(userId, {
            type: "subscription",
            amount: session.amount_total || 0,
            currency: session.currency || "usd",
            status: "succeeded",
            stripe_subscription_id: session.subscription as string,
            description: "Pro subscription (monthly)",
            period_start: subscriptionStartDate,
            period_end: currentPeriodEnd,
          })

          logger.payment("User upgraded to Pro", {
            userId,
            subscriptionId: session.subscription,
            customerId: session.customer,
          })

          // Track purchase for analytics and attribution
          await trackEventServer("purchase", {
            userId,
            plan: "pro_monthly",
            amount: (session.amount_total || 0) / 100,
            currency: session.currency || "usd",
            promoCode: session.metadata?.promoCode || null,
            source: session.metadata?.source || "direct",
            subscriptionId: session.subscription,
            customerId: session.customer,
          })

          // Send subscription confirmation email
          const userEmail = (profile?.email as string) || session.customer_email
          if (userEmail) {
            try {
              await sendSubscriptionConfirmationEmail(userEmail, {
                userName: (profile?.full_name as string) || "",
                userEmail,
                planName: "Pro (Monthly)",
                amount: (session.amount_total || 0) / 100,
                currency: session.currency?.toUpperCase() || "USD",
                nextBillingDate: currentPeriodEnd,
              })
            } catch (emailError) {
              paymentLogger.error("Failed to send subscription confirmation email", { userId, error: emailError })
            }
          }

          // Verify the update worked
          const verifySnap = await profileRef.get()
          if (verifySnap.exists) {
            const verifyData = verifySnap.data()
            if (verifyData?.subscription_tier !== "pro") {
              paymentLogger.error("Profile update verification failed", {
                userId,
                expectedTier: "pro",
                actualTier: verifyData?.subscription_tier,
              })
            }
          }
        } catch (error) {
          paymentLogger.error("Error updating user profile", { userId, error })
          return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
        }
      } else {
        paymentLogger.warn("checkout.session.completed missing userId", {
          sessionId: session.id,
          metadata: session.metadata,
          clientReferenceId: session.client_reference_id,
        })
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

          if (!profileSnap.exists) {
            paymentLogger.error("Profile does not exist for yearly plan", { userId })
            return NextResponse.json({ error: "Profile not found" }, { status: 404 })
          }

          const profile = profileSnap.data()

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
              paymentLogger.warn("Existing customer ID invalid, will find/create new", { invalidId: customerId })
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
              const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)
              customerId = paymentIntent.customer as string | undefined
              if (customerId) {
                paymentLogger.info("Retrieved customer ID from payment intent", { customerId })
              }
            } catch (piError) {
              paymentLogger.warn("Failed to retrieve customer from payment intent", { error: piError })
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
                c => c.metadata?.userId === userId
              )

              if (matchingCustomer) {
                customerId = matchingCustomer.id
                paymentLogger.info("Found existing customer by email with matching userId", { customerId, email: userEmail })
              } else if (existingCustomers.data.length === 0) {
                // No customers with this email - safe to create new one
                const newCustomer = await stripe.customers.create({
                  email: userEmail,
                  metadata: {
                    userId: userId,
                    plan: "yearly",
                    source: "checkout_recovery",
                  }
                })
                customerId = newCustomer.id
                paymentLogger.info("Created new customer for yearly plan", { customerId, email: userEmail })
              } else {
                // Customers exist but none match this userId - create new to avoid conflict
                paymentLogger.warn("Found customers with email but none match userId - creating new", {
                  email: userEmail,
                  userId,
                  existingCustomerCount: existingCustomers.data.length
                })
                const newCustomer = await stripe.customers.create({
                  email: userEmail,
                  metadata: {
                    userId: userId,
                    plan: "yearly",
                    source: "checkout_new_user",
                  }
                })
                customerId = newCustomer.id
                paymentLogger.info("Created separate customer to avoid email conflict", { customerId, email: userEmail })
              }
            } catch (customerError) {
              paymentLogger.error("Failed to find/create customer by email", { error: customerError, email: userEmail })
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
            paymentLogger.error("Yearly plan: CRITICAL - No customer ID found after all recovery attempts", {
              userId,
              sessionId: session.id,
              hasPaymentIntent: !!session.payment_intent,
              email: profile?.email || session.customer_email
            })
          }

          await profileRef.update(updateData)
          paymentLogger.info("Updated profile for yearly plan", {
            userId,
            expiresAt: oneYearFromNow.toISOString(),
          })

          // Update quota to Pro limit - reset usage for new subscription
          await updateQuotaForSubscriptionTierAdmin(userId, "pro", true)

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
              paymentLogger.error("Failed to send subscription confirmation email", { userId, error: emailError })
            }
          }
        } catch (error) {
          paymentLogger.error("Error updating user profile for yearly plan", { userId, error })
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
        const profilesQuery = await adminDb.collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const userId = profileDoc.id
          const profileRef = adminDb.collection("profiles").doc(userId)

          // Update subscription status to indicate payment issue
          await profileRef.set({
            subscription_status: "past_due",
            payment_failed_at: new Date().toISOString(),
            payment_failure_reason: invoice.last_finalization_error?.message || "Payment declined",
            updated_at: new Date().toISOString(),
          }, { merge: true })

          paymentLogger.warn("Subscription marked as past_due", { userId })

          // Send payment failure email notification
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
              paymentLogger.error("Failed to send payment failure email", { userId, error: emailError })
            }
          }
        }
      }
    } catch (error) {
      paymentLogger.error("Error handling payment failure", { error })
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
        const profilesQuery = await adminDb.collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const userId = profileDoc.id
          const profile = profileDoc.data()

          // Update subscription status to indicate action required
          await adminDb.collection("profiles").doc(userId).set({
            subscription_status: "requires_action",
            payment_action_url: invoice.hosted_invoice_url,
            updated_at: new Date().toISOString(),
          }, { merge: true })

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
        const profilesQuery = await adminDb.collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const userId = profileDoc.id
          const profileRef = adminDb.collection("profiles").doc(userId)

          await profileRef.set({
            last_charge_failure: {
              charge_id: charge.id,
              failure_code: charge.failure_code,
              failure_message: charge.failure_message,
              occurred_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          }, { merge: true })

          paymentLogger.warn("Recorded charge failure", { userId, failureMessage: charge.failure_message })
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
        const profilesQuery = await adminDb.collection("profiles")
          .where("stripe_customer_id", "==", customerId)
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

          // If fully refunded, downgrade user
          if (charge.refunded) {
            await adminDb.collection("profiles").doc(userId).set({
              subscription_tier: "free",
              subscription_status: "refunded",
              updated_at: new Date().toISOString(),
            }, { merge: true })

            await updateQuotaForSubscriptionTierAdmin(userId, "free")
            paymentLogger.info("User downgraded due to full refund", { userId })
          }
        }
      }
    } catch (error) {
      paymentLogger.error("Error handling refund", { error })
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
        const profilesQuery = await adminDb.collection("profiles")
          .where("stripe_customer_id", "==", customerId)
          .get()

        if (!profilesQuery.empty) {
          const profileDoc = profilesQuery.docs[0]
          const profile = profileDoc.data()
          const userId = profileDoc.id
          const profileRef = adminDb.collection("profiles").doc(userId)

          // Record payment in history
          const invoiceSubscription = invoice.parent?.subscription_details?.subscription
          const subscriptionId = typeof invoiceSubscription === 'string'
            ? invoiceSubscription
            : invoiceSubscription?.id
          await recordPaymentHistory(userId, {
            type: "subscription",
            amount: invoice.amount_paid || 0,
            currency: invoice.currency || "usd",
            status: "succeeded",
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            description: invoice.billing_reason === "subscription_cycle"
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
            await profileRef.set({
              subscription_status: "active",
              subscription_current_period_end: invoice.period_end
                ? new Date(invoice.period_end * 1000).toISOString()
                : undefined,
              updated_at: new Date().toISOString(),
            }, { merge: true })

            // Reset usage for new billing period
            await updateQuotaForSubscriptionTierAdmin(userId, "pro", true)

            logger.payment("Subscription renewed", { userId })
          }
          // Handle recovery from past_due
          else if (profile?.subscription_status === "past_due") {
            await profileRef.set({
              subscription_status: "active",
              subscription_tier: "pro",
              payment_failed_at: null,
              payment_failure_reason: null,
              payment_recovered_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { merge: true })

            // Restore Pro quota (don't reset usage - they're catching up)
            await updateQuotaForSubscriptionTierAdmin(userId, "pro", false)

            logger.payment("Subscription recovered", { userId })
          }
        }
      }
    } catch (error) {
      paymentLogger.error("Error handling invoice.paid", { error })
    }
  }

  // Handle subscription paused
  if (event.type === "customer.subscription.paused") {
    const subscription = event.data.object as Stripe.Subscription

    logger.payment("Subscription paused", { subscriptionId: subscription.id })

    try {
      const profilesQuery = await adminDb.collection("profiles")
        .where("stripe_subscription_id", "==", subscription.id)
        .get()

      if (!profilesQuery.empty) {
        const profileDoc = profilesQuery.docs[0]
        const userId = profileDoc.id

        await adminDb.collection("profiles").doc(userId).set({
          subscription_status: "paused",
          updated_at: new Date().toISOString(),
        }, { merge: true })

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
      const profilesQuery = await adminDb.collection("profiles")
        .where("stripe_subscription_id", "==", subscription.id)
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
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription

    try {
      const profilesQuery = await adminDb.collection("profiles")
        .where("stripe_subscription_id", "==", subscription.id)
        .get()

      if (!profilesQuery.empty) {
        const profileDoc = profilesQuery.docs[0]
        const profile = profileDoc.data()
        const userId = profileDoc.id
        const profileRef = adminDb.collection("profiles").doc(userId)

        const periodEnd = subscription.items?.data?.[0]?.current_period_end
        const currentPeriodEnd = periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : undefined

        // GRACE PERIOD: Check if subscription is set to cancel at period end
        // User keeps Pro access until current_period_end
        if (subscription.cancel_at_period_end && subscription.status === "active") {
          // User canceled but should keep access until period end
          await profileRef.set({
            subscription_tier: "pro", // Keep Pro access!
            subscription_status: "cancel_at_period_end",
            subscription_cancel_at: currentPeriodEnd,
            subscription_current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          }, { merge: true })

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
              paymentLogger.error("Failed to send cancellation email", { userId, error: emailError })
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
          await profileRef.set({
            subscription_tier: "free",
            subscription_status: subscription.status,
            subscription_current_period_end: currentPeriodEnd,
            subscription_cancel_at: null,
            updated_at: new Date().toISOString(),
          }, { merge: true })

          await updateQuotaForSubscriptionTierAdmin(userId, "free")

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
              paymentLogger.error("Failed to send cancellation email", { userId, error: emailError })
            }
          }
        }
        // ACTIVE: Subscription is active (not canceling)
        else if (subscription.status === "active") {
          // Update subscription details (e.g., period end date)
          await profileRef.set({
            subscription_tier: "pro",
            subscription_status: subscription.status,
            subscription_current_period_end: currentPeriodEnd,
            subscription_cancel_at: null, // Clear any pending cancellation
            updated_at: new Date().toISOString(),
          }, { merge: true })

          paymentLogger.info("Subscription updated", { userId, status: subscription.status })
        }
      } else {
        paymentLogger.warn("No user found with subscription ID", { subscriptionId: subscription.id })
      }
    } catch (error) {
      paymentLogger.error("Error handling subscription update/deletion", { error })
      return NextResponse.json({ error: "Failed to process subscription event" }, { status: 500 })
    }
  }

  // Handle customer deletion in Stripe
  if (event.type === "customer.deleted") {
    const customer = event.data.object as Stripe.Customer

    logger.payment("Customer deleted in Stripe", { customerId: customer.id })

    try {
      // Find all profiles with this customer ID
      const profilesQuery = await adminDb.collection("profiles")
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
              const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
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
        const profilesQuery = await adminDb.collection("profiles")
          .where("stripe_customer_id", "==", customerId)
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

  return NextResponse.json({ received: true })
}

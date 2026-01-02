/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment processing logic and is not part of the MIT license.
 * All rights reserved.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { PRICING_CONFIG } from "@/lib/config"
import { getUserIdFromRequest } from "@/lib/auth-server"
import { logger } from "@/lib/logger"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required")
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover" as any,
})

/**
 * SECURITY: Price ID whitelist validation
 * All allowed price IDs must be explicitly configured here.
 * This prevents attackers from using manipulated env vars to get free access.
 */
function getValidatedPriceId(platform: string, planType: string): string | null {
  // Build expected price ID key
  const priceKey = platform === "vscode"
    ? (planType === "yearly" ? "STRIPE_PRICE_ID_VSCODE_YEARLY" : "STRIPE_PRICE_ID_VSCODE")
    : (planType === "yearly" ? "STRIPE_PRICE_ID_WEBSITE_YEARLY" : "STRIPE_PRICE_ID_WEBSITE")

  const priceId = process.env[priceKey]

  // Validate price ID format (Stripe price IDs start with 'price_')
  if (!priceId || !priceId.startsWith('price_')) {
    logger.error("Invalid or missing price ID", { priceKey, priceId: priceId ? "[REDACTED]" : "missing" })
    return null
  }

  return priceId
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication - userId must come from verified token
    const authenticatedUserId = await getUserIdFromRequest(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { platform, planType } = await request.json()

    // Use the authenticated userId, not from request body
    const userId = authenticatedUserId

    if (!planType || (planType !== 'monthly' && planType !== 'yearly')) {
      return NextResponse.json({ error: "Plan type must be 'monthly' or 'yearly'" }, { status: 400 })
    }

    // Validate that user has an email before creating checkout
    let profileSnap
    try {
      profileSnap = await adminDb.collection("profiles").doc(userId).get()

      if (!profileSnap.exists) {
        return NextResponse.json({ error: "User profile not found" }, { status: 404 })
      }

      const profile = profileSnap.data()
      if (!profile || !profile.email || profile.email.trim() === "") {
        return NextResponse.json({
          error: "Email address is required for subscription. Please update your profile with a valid email address."
        }, { status: 400 })
      }

      // SECURITY FIX: Check for existing active subscription to prevent duplicate charges
      const isActiveSubscription = profile.subscription_tier === "pro" &&
        (profile.subscription_status === "active" || profile.subscription_status === "trialing")

      // Also check if subscription hasn't expired (for yearly plans)
      const subscriptionEndDate = profile.subscription_current_period_end
        ? new Date(profile.subscription_current_period_end)
        : null
      const isNotExpired = subscriptionEndDate ? subscriptionEndDate > new Date() : true

      if (isActiveSubscription && isNotExpired) {
        logger.warn("User attempted to create duplicate subscription", {
          userId,
          currentTier: profile.subscription_tier,
          currentStatus: profile.subscription_status,
          expiresAt: profile.subscription_current_period_end
        })
        return NextResponse.json({
          error: "You already have an active Pro subscription.",
          message: "To modify your subscription, please use the Customer Portal in your account settings.",
          code: "DUPLICATE_SUBSCRIPTION"
        }, { status: 400 })
      }
    } catch (profileError) {
      logger.error("Error fetching user profile", { error: profileError })
      return NextResponse.json({ error: "Failed to validate user profile" }, { status: 500 })
    }

    // SECURITY FIX: Use validated price ID with format checking
    const priceId = getValidatedPriceId(platform || "website", planType)

    if (!priceId) {
      // Don't expose configuration details in error message
      return NextResponse.json({
        error: "Unable to process subscription. Please try again or contact support."
      }, { status: 500 })
    }

    const profile = profileSnap.data()
    const userEmail = profile?.email

    // Find or create a Stripe customer with userId in metadata
    // This prevents conflicts when multiple users share the same email
    let stripeCustomerId: string | undefined

    // Check if user already has a customer ID
    if (profile?.stripe_customer_id) {
      try {
        await stripe.customers.retrieve(profile.stripe_customer_id)
        stripeCustomerId = profile.stripe_customer_id
        logger.info("Using existing customer for checkout", { userId, customerId: stripeCustomerId })
      } catch {
        // Customer doesn't exist in Stripe - clear the invalid ID from Firebase
        logger.warn("Existing customer ID invalid, clearing from profile", { userId, invalidId: profile.stripe_customer_id })
        try {
          await adminDb.collection("profiles").doc(userId).update({
            stripe_customer_id: null,
            updated_at: new Date().toISOString()
          })
        } catch (clearError) {
          logger.error("Failed to clear invalid customer ID", { error: clearError })
        }
      }
    }

    // If no existing customer, look for one with matching userId metadata
    if (!stripeCustomerId && userEmail) {
      try {
        const existingCustomers = await stripe.customers.list({
          email: userEmail,
          limit: 10,
        })

        const matchingCustomer = existingCustomers.data.find(c => c.metadata?.userId === userId)
        if (matchingCustomer) {
          stripeCustomerId = matchingCustomer.id
          // Update profile with the found customer ID
          await adminDb.collection("profiles").doc(userId).update({
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString()
          })
          logger.info("Found existing customer with matching userId", { userId, customerId: stripeCustomerId })
        }
      } catch (searchError) {
        logger.warn("Error searching for existing customer", { error: searchError })
      }
    }

    // If still no customer, create one with userId metadata
    if (!stripeCustomerId && userEmail) {
      try {
        const newCustomer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            userId: userId,
            source: "checkout_creation",
          }
        })
        stripeCustomerId = newCustomer.id
        // Update profile with new customer ID
        await adminDb.collection("profiles").doc(userId).update({
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString()
        })
        logger.info("Created new customer for checkout", { userId, customerId: stripeCustomerId })
      } catch (createError) {
        logger.error("Error creating customer", { error: createError })
        // Continue without customer - Stripe will create one during checkout
      }
    }

    // Create checkout session
    // Yearly plans use one-time payment, monthly uses subscription
    const isSubscription = planType === 'monthly'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isSubscription ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/upgrade?canceled=true`,
      client_reference_id: userId,
      metadata: {
        userId,
        platform: platform || "website",
        planType: planType,
      },
      // Enable promotion code input in Stripe Checkout UI
      allow_promotion_codes: true,
      // Enable automatic tax calculation based on customer location
      // Requires Stripe Tax to be enabled in your Stripe Dashboard
      automatic_tax: {
        enabled: true,
      },
    }

    // payment_method_collection only works with subscriptions, not one-time payments
    // This allows $0 subscriptions (100% discount) to proceed without payment method
    if (isSubscription) {
      sessionParams.payment_method_collection = 'if_required'
    }

    // Attach pre-created customer if we have one
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId
      // customer_update only works when customer is set
      // This saves the billing address to the customer for future tax calculation
      sessionParams.customer_update = {
        address: 'auto',
      }
    } else if (userEmail) {
      // Fallback: Let Stripe create customer but pre-fill email
      // Note: customer_update not available without existing customer
      sessionParams.customer_email = userEmail
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    logger.error("Stripe checkout error", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    )
  }
}


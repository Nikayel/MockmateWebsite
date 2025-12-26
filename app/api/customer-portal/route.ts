/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment processing logic and is not part of the MIT license.
 * All rights reserved.
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth-server"
import { adminDb } from "@/lib/firebase-admin"
import { Profile } from "@/lib/types"
import Stripe from "stripe"
import { logger } from "@/lib/logger"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-10-29.clover",
})

// Mark route as dynamic to avoid build-time issues with server-only packages
export const dynamic = 'force-dynamic'

/**
 * API endpoint to create a Stripe Customer Portal session
 * Allows users to manage their subscription, update payment methods, and cancel
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from Firebase ID token in Authorization header
    const userId = await getUserIdFromRequest(request)

    if (!userId) {
      logger.warn("Customer portal: Unauthorized - no valid user ID", {
        hasAuthHeader: !!request.headers.get("authorization")
      })

      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication failed. Please sign in again."
        },
        { status: 401 }
      )
    }

    // Get user profile to find Stripe customer ID
    // Use Admin SDK to bypass security rules (we've already verified the user is authenticated)
    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()

    if (!profileSnap.exists) {
      logger.error("Customer portal: Profile not found", { userId })
      return NextResponse.json(
        {
          error: "Profile not found",
          message: "User profile does not exist. Please contact support."
        },
        { status: 404 }
      )
    }

    const profile = profileSnap.data() as Profile
    let stripeCustomerId = profile.stripe_customer_id

    // If customer ID is missing but we have a subscription ID, try to get it from Stripe
    if (!stripeCustomerId && profile.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
        stripeCustomerId = subscription.customer as string

        // Update profile with customer ID for future use
        if (stripeCustomerId) {
          await profileRef.update({
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString()
          })
        }
      } catch (stripeError) {
        logger.error("Customer portal: Failed to retrieve subscription from Stripe", { error: stripeError })
      }
    }

    if (!stripeCustomerId) {
      logger.warn("Customer portal: No Stripe customer ID for user", {
        userId,
        subscriptionTier: profile.subscription_tier,
        hasSubscriptionId: !!profile.stripe_subscription_id
      })

      // If user is Pro but missing customer ID, suggest syncing
      if (profile.subscription_tier === "pro") {
        return NextResponse.json(
          {
            error: "Subscription data incomplete",
            message: "Your subscription information is incomplete. Please use 'Sync Subscription Status' button to update your account."
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          error: "No active subscription found",
          message: "You don't have an active subscription to manage."
        },
        { status: 400 }
      )
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/profile`,
    })

    return NextResponse.json({
      success: true,
      url: session.url,
    })
  } catch (error) {
    logger.error("Customer portal error", { error })

    // Check for Stripe-specific errors
    if (error instanceof Error && error.message.includes("No such customer")) {
      return NextResponse.json(
        {
          error: "Stripe customer not found",
          message: "Your subscription information could not be found. Please contact support."
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create portal session",
        message: "An error occurred while opening the subscription portal. Please try again or contact support."
      },
      { status: 500 }
    )
  }
}


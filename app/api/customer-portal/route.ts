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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
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
      console.error("❌ Customer portal: Unauthorized - no valid user ID")
      console.error("Auth header:", request.headers.get("authorization") ? "Present" : "Missing")

      // Check if token was provided but verification failed
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        console.error("Token was provided but verification failed")
        console.error("This could indicate:")
        console.error("  1. Firebase Admin SDK not properly initialized")
        console.error("  2. Token expired or invalid")
        console.error("  3. Service account credentials missing or incorrect")
      }

      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication failed. Please sign in again."
        },
        { status: 401 }
      )
    }

    console.log("✅ Customer portal: Authenticated user:", userId)

    // Get user profile to find Stripe customer ID
    // Use Admin SDK to bypass security rules (we've already verified the user is authenticated)
    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()

    if (!profileSnap.exists) {
      console.error("❌ Customer portal: Profile not found for user:", userId)
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
      console.log("⚠️ Customer portal: No customer ID, but subscription ID found. Looking up from Stripe...")
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
        stripeCustomerId = subscription.customer as string

        // Update profile with customer ID for future use
        if (stripeCustomerId) {
          await profileRef.update({
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString()
          })
          console.log("✅ Customer portal: Retrieved and saved customer ID from subscription")
        }
      } catch (stripeError: any) {
        console.error("❌ Customer portal: Failed to retrieve subscription from Stripe:", stripeError)
        // Continue to check if we have customer ID from profile
      }
    }

    if (!stripeCustomerId) {
      console.warn("⚠️ Customer portal: No Stripe customer ID for user:", userId)
      console.warn("   Profile subscription_tier:", profile.subscription_tier)
      console.warn("   Profile stripe_subscription_id:", profile.stripe_subscription_id)
      console.warn("   Profile stripe_customer_id:", profile.stripe_customer_id)

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

    console.log("✅ Customer portal: Creating session for Stripe customer:", stripeCustomerId)

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/profile`,
    })

    console.log("✅ Customer portal: Session created successfully")

    return NextResponse.json({
      success: true,
      url: session.url,
    })
  } catch (error) {
    console.error("❌ Customer portal error:", error)

    // Provide more detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)

      // Check for Stripe-specific errors
      if (error.message.includes("No such customer")) {
        return NextResponse.json(
          {
            error: "Stripe customer not found",
            message: "Your subscription information could not be found. Please contact support."
          },
          { status: 404 }
        )
      }
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


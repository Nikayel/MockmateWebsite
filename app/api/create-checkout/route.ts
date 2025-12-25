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

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required")
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia", // Use latest Stripe API version
})

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
      if (!profile.email || profile.email.trim() === "") {
        return NextResponse.json({
          error: "Email address is required for subscription. Please update your profile with a valid email address."
        }, { status: 400 })
      }
    } catch (profileError) {
      console.error("Error fetching user profile:", profileError)
      return NextResponse.json({ error: "Failed to validate user profile" }, { status: 500 })
    }

    // Determine price based on platform and plan type
    let priceId: string | undefined
    if (planType === 'yearly') {
      priceId = platform === "vscode"
        ? process.env.STRIPE_PRICE_ID_VSCODE_YEARLY
        : process.env.STRIPE_PRICE_ID_WEBSITE_YEARLY
    } else {
      priceId = platform === "vscode"
        ? process.env.STRIPE_PRICE_ID_VSCODE
        : process.env.STRIPE_PRICE_ID_WEBSITE
    }

    if (!priceId) {
      return NextResponse.json({ 
        error: `Price ID not configured for ${planType} plan. Please set STRIPE_PRICE_ID_WEBSITE${planType === 'yearly' ? '_YEARLY' : ''} environment variable.` 
      }, { status: 500 })
    }

    // Create checkout session
    // Yearly plans use one-time payment, monthly uses subscription
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: planType === 'yearly' ? "payment" : "subscription",
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
      // Default to 'if_required' - will skip payment method if total is $0
      payment_method_collection: 'if_required',
      // Enable automatic tax calculation based on customer location
      // Requires Stripe Tax to be enabled in your Stripe Dashboard
      automatic_tax: {
        enabled: true,
      },
    }


    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    )
  }
}


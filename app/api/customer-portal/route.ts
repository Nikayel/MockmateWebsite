/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment processing logic and is not part of the MIT license.
 * All rights reserved.
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth-server"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to find Stripe customer ID
    const profileRef = doc(db, "profiles", userId)
    const profileSnap = await getDoc(profileRef)
    
    if (!profileSnap.exists()) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const profile = profileSnap.data() as Profile
    const stripeCustomerId = profile.stripe_customer_id

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription found" },
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
    console.error("Customer portal error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create portal session" },
      { status: 500 }
    )
  }
}


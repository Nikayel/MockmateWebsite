/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment processing logic and is not part of the MIT license.
 * All rights reserved.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia", // Use latest Stripe API version
})

export async function POST(request: NextRequest) {
  try {
    const { userId, platform, promoCode } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Validate that user has an email before creating checkout
    try {
      const profileSnap = await adminDb.collection("profiles").doc(userId).get()

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

    // Determine price based on platform
    const priceId = platform === "vscode" 
      ? process.env.STRIPE_PRICE_ID_VSCODE 
      : process.env.STRIPE_PRICE_ID_WEBSITE

    if (!priceId) {
      return NextResponse.json({ error: "Price ID not configured" }, { status: 500 })
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
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
      },
      // Enable promotion code input in Stripe Checkout UI
      allow_promotion_codes: true,
    }

    // Pre-apply promo code if provided (look up promotion code to get coupon ID)
    if (promoCode) {
      try {
        // List promotion codes to find the one matching our code
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode.toUpperCase().trim(),
          limit: 1,
        })

        console.log(`Looking for promotion code: ${promoCode.toUpperCase().trim()}`)
        console.log(`Found ${promotionCodes.data.length} promotion codes`)

        if (promotionCodes.data.length > 0) {
          const promotionCodeObj = promotionCodes.data[0]
          console.log(`Promotion code status: active=${promotionCodeObj.active}, coupon=${promotionCodeObj.coupon.id}`)
          
          if (promotionCodeObj.active) {
            // Check if promotion code has restrictions that might prevent it from being applied
            const restrictions = promotionCodeObj.restrictions
            if (restrictions) {
              // Check if code applies to this product/price
              const appliesToProduct = !restrictions.first_time_transaction && 
                                       (!restrictions.minimum_amount || restrictions.minimum_amount <= 2500) // $25.00 in cents
              
              if (appliesToProduct) {
                sessionParams.discounts = [
                  {
                    coupon: promotionCodeObj.coupon.id,
                  },
                ]
                console.log(`Pre-applied promotion code: ${promoCode.toUpperCase().trim()}`)
              } else {
                console.warn(`Promotion code ${promoCode} has restrictions that prevent pre-application`)
                // Still allow checkout - user can try entering in Stripe UI
              }
            } else {
              // No restrictions, safe to apply
              sessionParams.discounts = [
                {
                  coupon: promotionCodeObj.coupon.id,
                },
              ]
              console.log(`Pre-applied promotion code: ${promoCode.toUpperCase().trim()}`)
            }
          } else {
            console.warn(`Promotion code ${promoCode} exists but is not active`)
            // Return error so user knows code is invalid
            return NextResponse.json({ 
              error: `Promotion code "${promoCode.toUpperCase().trim()}" is not active or has expired` 
            }, { status: 400 })
          }
        } else {
          // Promotion code not found - return error
          console.warn(`Promotion code ${promoCode} not found in Stripe`)
          return NextResponse.json({ 
            error: `Invalid promotion code: "${promoCode.toUpperCase().trim()}". Please enter a valid code or leave empty to enter code in Stripe Checkout.` 
          }, { status: 400 })
        }
      } catch (promoError: any) {
        console.error("Error looking up promotion code:", promoError)
        console.error("Error details:", promoError.message)
        // Return error so user knows there was a problem
        return NextResponse.json({ 
          error: `Failed to validate promotion code: ${promoError.message || "Unknown error"}` 
        }, { status: 500 })
      }
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


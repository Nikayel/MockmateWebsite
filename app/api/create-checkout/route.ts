/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment processing logic and is not part of the MIT license.
 * All rights reserved.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"
import { PRICING_CONFIG } from "@/lib/config"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required")
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
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
      // Default to 'if_required' - will skip payment method if total is $0
      payment_method_collection: 'if_required',
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
            // Retrieve coupon details to check if it's 100% off
            const coupon = await stripe.coupons.retrieve(promotionCodeObj.coupon.id)
            const is100PercentOff = coupon.percent_off === 100 ||
              (coupon.amount_off && coupon.amount_off >= 2500) // $25.00 in cents (or more)

            console.log(`Coupon discount: ${coupon.percent_off ? `${coupon.percent_off}%` : `$${(coupon.amount_off || 0) / 100}`}`)
            console.log(`Is 100% off: ${is100PercentOff}`)

            // For 100% off coupons, create subscription directly (bypasses Checkout payment requirement)
            if (is100PercentOff) {
              console.log(`🎁 100% discount detected - creating subscription directly via API`)

              try {
                // Get or create customer
                let customerId: string
                const profile = profileSnap.data()

                if (profile?.stripe_customer_id) {
                  customerId = profile.stripe_customer_id
                } else {
                  // Create customer
                  const customer = await stripe.customers.create({
                    email: profile.email,
                    metadata: {
                      userId,
                      platform: platform || "website",
                    },
                  })
                  customerId = customer.id

                  // Save customer ID to profile
                  await adminDb.collection("profiles").doc(userId).update({
                    stripe_customer_id: customerId,
                    updated_at: new Date().toISOString(),
                  })
                }

                // Create subscription directly with coupon (no payment method required)
                const subscription = await stripe.subscriptions.create({
                  customer: customerId,
                  items: [{ price: priceId }],
                  coupon: promotionCodeObj.coupon.id,
                  payment_settings: {
                    payment_method_types: [],
                    save_default_payment_method: 'off',
                  },
                  metadata: {
                    userId,
                    platform: platform || "website",
                    promoCode: promoCode.toUpperCase().trim(),
                  },
                })

                console.log(`✅ Subscription created directly: ${subscription.id}`)

                // Update profile immediately
                const subscriptionStartDate = subscription.created
                  ? new Date(subscription.created * 1000).toISOString()
                  : undefined
                const currentPeriodEnd = subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000).toISOString()
                  : undefined

                await adminDb.collection("profiles").doc(userId).update({
                  subscription_tier: "pro",
                  subscription_status: subscription.status,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscription.id,
                  subscription_start_date: subscriptionStartDate,
                  subscription_current_period_end: currentPeriodEnd,
                  subscription_platform: platform || "website",
                  updated_at: new Date().toISOString(),
                })

                // Update quota to Pro limit
                const now = new Date()
                const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
                const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
                const sessionsLimit = PRICING_CONFIG.pro.sessionsPerMonth

                // Query for existing quota
                const quotaSnapshot = await adminDb.collection("profile_quota")
                  .where("user_id", "==", userId)
                  .get()

                // Find current period quota
                let currentQuotaDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null
                quotaSnapshot.docs.forEach(doc => {
                  const data = doc.data()
                  const quotaStart = new Date(data.period_start)
                  if (quotaStart >= periodStart && quotaStart <= periodEnd) {
                    currentQuotaDoc = doc
                  }
                })

                if (currentQuotaDoc) {
                  // Update existing quota
                  await currentQuotaDoc.ref.update({
                    sessions_limit: sessionsLimit,
                    updated_at: new Date().toISOString(),
                  })
                } else {
                  // Create new quota
                  await adminDb.collection("profile_quota").add({
                    user_id: userId,
                    sessions_used: 0,
                    sessions_limit: sessionsLimit,
                    period_start: periodStart.toISOString(),
                    period_end: periodEnd.toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                }

                // Return success URL directly (no checkout needed)
                return NextResponse.json({
                  sessionId: null,
                  url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/upgrade?success=true&direct_subscription=true`,
                  directSubscription: true,
                  subscriptionId: subscription.id,
                })
              } catch (directSubError: any) {
                console.error("❌ Error creating direct subscription:", directSubError)
                // Fall back to Checkout if direct creation fails
                console.log("Falling back to Checkout session...")
              }
            }

            // For non-100% off or if direct creation failed, use Checkout
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


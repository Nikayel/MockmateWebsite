import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia", // Use latest Stripe API version
})

export async function POST(request: NextRequest) {
  try {
    const { userId, platform, promoCode } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
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
          code: promoCode.toUpperCase(),
          limit: 1,
        })

        console.log(`Looking for promotion code: ${promoCode.toUpperCase()}`)
        console.log(`Found ${promotionCodes.data.length} promotion codes`)

        if (promotionCodes.data.length > 0) {
          const promotionCodeObj = promotionCodes.data[0]
          console.log(`Promotion code status: active=${promotionCodeObj.active}, coupon=${promotionCodeObj.coupon.id}`)
          
          if (promotionCodeObj.active) {
            sessionParams.discounts = [
              {
                coupon: promotionCodeObj.coupon.id,
              },
            ]
            console.log(`Pre-applied promotion code: ${promoCode.toUpperCase()}`)
          } else {
            console.warn(`Promotion code ${promoCode} exists but is not active`)
          }
        } else {
          // If promotion code not found, still allow checkout but Stripe will handle validation
          console.warn(`Promotion code ${promoCode} not found in Stripe. Make sure:`)
          console.warn(`1. Code is created in ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE' : 'TEST'} mode`)
          console.warn(`2. Code is exactly: ${promoCode.toUpperCase()}`)
          console.warn(`3. Code is active and not expired`)
        }
      } catch (promoError: any) {
        console.error("Error looking up promotion code:", promoError)
        console.error("Error details:", promoError.message)
        // Continue without pre-applying - user can enter code in Stripe UI
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


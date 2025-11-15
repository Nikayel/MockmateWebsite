/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains promotion code debugging utilities and is not part of the MIT license.
 * All rights reserved.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
})

// Debug endpoint to check promotion codes
// Access at: /api/debug-promo-code?code=FREE25 or ?id=promo_xxxxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const promoId = searchParams.get("id")

    const mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "LIVE" : "TEST"
    
    // List all promotion codes
    const allPromoCodes = await stripe.promotionCodes.list({ limit: 100 })
    
    let specificCode: Stripe.PromotionCode[] = []
    
    // Look up by ID if provided
    if (promoId) {
      try {
        const promo = await stripe.promotionCodes.retrieve(promoId)
        specificCode = [promo]
      } catch (err) {
        console.error("Error retrieving promotion code by ID:", err)
      }
    }
    
    // Or look up by code string
    if (code) {
      const found = await stripe.promotionCodes.list({
        code: code.toUpperCase(),
        limit: 1,
      })
      specificCode = found.data
    }

    return NextResponse.json({
      mode,
      searchingFor: code.toUpperCase(),
      totalPromoCodes: allPromoCodes.data.length,
      allPromoCodes: allPromoCodes.data.map(pc => ({
        code: pc.code,
        active: pc.active,
        couponId: pc.coupon.id,
        couponName: pc.coupon.name,
        expiresAt: pc.expires_at,
        maxRedemptions: pc.max_redemptions,
        timesRedeemed: pc.times_redeemed,
      })),
      foundCode: specificCode.length > 0 ? {
        id: specificCode[0].id,
        code: specificCode[0].code,
        active: specificCode[0].active,
        couponId: specificCode[0].coupon.id,
        couponName: specificCode[0].coupon.name,
        couponPercentOff: specificCode[0].coupon.percent_off,
        couponAmountOff: specificCode[0].coupon.amount_off,
        expiresAt: specificCode[0].expires_at,
        maxRedemptions: specificCode[0].max_redemptions,
        timesRedeemed: specificCode[0].times_redeemed,
        restrictions: specificCode[0].restrictions,
      } : null,
      instructions: [
        `You are using ${mode} mode keys`,
        `Make sure your promotion code is created in ${mode} mode in Stripe Dashboard`,
        `Go to: Products → Coupons → Find your coupon → Promotion codes tab → Create promotion code`,
        code ? `Set code to exactly: ${code.toUpperCase()}` : `Use the code STRING (not ID) when entering in Stripe Checkout`,
        `Make sure it's Active and not expired`,
        `The code STRING is what users enter (e.g., "FREE25"), not the ID (promo_xxxxx)`,
      ],
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to check promotion codes",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}


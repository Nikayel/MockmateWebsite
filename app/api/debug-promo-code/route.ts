import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
})

// Debug endpoint to check promotion codes
// Access at: /api/debug-promo-code?code=FREE25
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code") || "FREE25"

    const mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "LIVE" : "TEST"
    
    // List all promotion codes
    const allPromoCodes = await stripe.promotionCodes.list({ limit: 100 })
    
    // Find specific code
    const specificCode = await stripe.promotionCodes.list({
      code: code.toUpperCase(),
      limit: 1,
    })

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
      foundCode: specificCode.data.length > 0 ? {
        code: specificCode.data[0].code,
        active: specificCode.data[0].active,
        couponId: specificCode.data[0].coupon.id,
        couponName: specificCode.data[0].coupon.name,
        couponPercentOff: specificCode.data[0].coupon.percent_off,
        couponAmountOff: specificCode.data[0].coupon.amount_off,
        expiresAt: specificCode.data[0].expires_at,
        maxRedemptions: specificCode.data[0].max_redemptions,
        timesRedeemed: specificCode.data[0].times_redeemed,
      } : null,
      instructions: [
        `You are using ${mode} mode keys`,
        `Make sure your promotion code is created in ${mode} mode in Stripe Dashboard`,
        `Go to: Products → Coupons → Find your coupon → Promotion codes tab → Create promotion code`,
        `Set code to exactly: ${code.toUpperCase()}`,
        `Make sure it's Active and not expired`,
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


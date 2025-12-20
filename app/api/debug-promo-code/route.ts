/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains promotion code debugging utilities and is not part of the MIT license.
 * All rights reserved.
 *
 * ADMIN ONLY - Protected endpoint for debugging promo codes
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getUserIdFromRequest } from "@/lib/auth-server"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
})

// Admin user IDs - add your admin user IDs here
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || []

async function isAdmin(userId: string): Promise<boolean> {
  // Check hardcoded list first
  if (ADMIN_USER_IDS.includes(userId)) return true

  // Check Firestore for admin role
  try {
    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()
    if (profileSnap.exists) {
      const profile = profileSnap.data()
      return profile?.role === "admin" || profile?.is_admin === true
    }
  } catch {
    // Ignore errors
  }

  return false
}

// Debug endpoint to check promotion codes - ADMIN ONLY
// Access at: /api/debug-promo-code?code=FREE25 or ?id=promo_xxxxx
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Require admin role
    const admin = await isAdmin(userId)
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

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
      searchingFor: code?.toUpperCase() || promoId || "all",
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

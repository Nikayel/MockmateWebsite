import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { getUserIdFromRequest } from "@/lib/auth-server"
import { PRICING_CONFIG } from "@/lib/config"

// Promo codes stored server-side (not in git)
// These are only visible in the server-side API route, not in client code
const PROMO_CODES: Record<string, { discount: number; type: "percentage" | "free" }> = {
  "FREE25": { discount: 100, type: "free" }, // Free Pro plan
  // Add more promo codes here as needed
  // Format: "CODE": { discount: number, type: "free" | "percentage" }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 })
    }

    const normalizedCode = code.toUpperCase()

    // Check if promo code exists
    const promoCode = PROMO_CODES[normalizedCode]

    if (!promoCode) {
      return NextResponse.json({
        valid: false,
        error: "Invalid promo code"
      }, { status: 200 })
    }

    // Check if user already used this code using Admin SDK
    const promoUsageRef = adminDb.collection("promo_code_usage").doc(`${userId}_${normalizedCode}`)
    const promoUsageSnap = await promoUsageRef.get()

    if (promoUsageSnap.exists) {
      return NextResponse.json({
        valid: false,
        error: "This promo code has already been used"
      }, { status: 200 })
    }

    // Apply promo code using Admin SDK - actually upgrade the user
    if (promoCode.type === "free") {
      const now = new Date()
      const oneYearFromNow = new Date(now)
      oneYearFromNow.setFullYear(now.getFullYear() + 1)

      // Update profile to Pro using Admin SDK (bypasses security rules)
      const profileRef = adminDb.collection("profiles").doc(userId)
      const profileSnap = await profileRef.get()

      if (!profileSnap.exists) {
        return NextResponse.json({
          valid: false,
          error: "User profile not found"
        }, { status: 404 })
      }

      // Use a transaction to atomically update profile and record usage
      await adminDb.runTransaction(async (transaction) => {
        // Update profile to Pro
        transaction.update(profileRef, {
          subscription_tier: "pro",
          subscription_status: "active",
          subscription_type: "promo",
          subscription_start_date: now.toISOString(),
          subscription_current_period_end: oneYearFromNow.toISOString(),
          promo_code_used: normalizedCode,
          updated_at: now.toISOString(),
        })

        // Record promo code usage (prevents reuse)
        transaction.set(promoUsageRef, {
          user_id: userId,
          code: normalizedCode,
          applied_at: now.toISOString(),
          discount_type: promoCode.type,
          discount_amount: promoCode.discount,
        })
      })

      // Update quota to Pro limits
      const quotaQuery = await adminDb.collection("profile_quota")
        .where("user_id", "==", userId)
        .get()

      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      if (!quotaQuery.empty) {
        // Update existing quota
        const quotaDoc = quotaQuery.docs[0]
        await quotaDoc.ref.update({
          sessions_limit: PRICING_CONFIG.pro.sessionsPerMonth,
          updated_at: now.toISOString(),
        })
      } else {
        // Create new quota
        await adminDb.collection("profile_quota").add({
          user_id: userId,
          sessions_used: 0,
          sessions_limit: PRICING_CONFIG.pro.sessionsPerMonth,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
      }

      return NextResponse.json({
        valid: true,
        message: "Promo code applied! You've been upgraded to Pro for 1 year.",
        discount_type: promoCode.type,
        expires_at: oneYearFromNow.toISOString(),
      })
    }

    // For percentage discounts, return the discount info for checkout
    return NextResponse.json({
      valid: true,
      message: `Promo code valid! ${promoCode.discount}% discount will be applied.`,
      discount_type: promoCode.type,
      discount_percentage: promoCode.discount,
    })
  } catch (error) {
    console.error("Promo code error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process promo code" },
      { status: 500 }
    )
  }
}

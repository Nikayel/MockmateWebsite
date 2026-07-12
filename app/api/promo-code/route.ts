import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { getUserIdFromRequest } from "@/lib/auth-server"
import { updateQuotaForSubscriptionTierAdmin } from "@/lib/stripe-helpers"
import { promoCodeRateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { csrfProtection } from "@/lib/csrf"

// Promo codes stored server-side (not in git)
// These are only visible in the server-side API route, not in client code
const PROMO_CODES: Record<string, { discount: number; type: "percentage" | "free" }> = {
  FREE25: { discount: 100, type: "free" }, // Free Pro plan
  // Add more promo codes here as needed
  // Format: "CODE": { discount: number, type: "free" | "percentage" }
}

export async function POST(request: NextRequest) {
  // SECURITY: CSRF protection for state-changing operation
  const csrfResult = csrfProtection(request)
  if (csrfResult) {
    return csrfResult
  }

  // Apply rate limiting to prevent brute-force attacks on promo codes
  const rateLimitResponse = await promoCodeRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

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
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid promo code",
        },
        { status: 200 }
      )
    }

    // Apply promo code using Admin SDK - actually upgrade the user
    if (promoCode.type === "free") {
      const now = new Date()
      const oneYearFromNow = new Date(now)
      oneYearFromNow.setFullYear(now.getFullYear() + 1)

      const profileRef = adminDb.collection("profiles").doc(userId)
      const promoUsageRef = adminDb
        .collection("promo_code_usage")
        .doc(`${userId}_${normalizedCode}`)

      // Captured from the profile inside the transaction so the shared quota writer can
      // compute the anniversary billing period after the transaction commits.
      let profileCreatedAt: string | undefined

      // Use a transaction to atomically check usage, update profile, and record usage
      // This prevents race conditions where two requests could both pass the check
      try {
        await adminDb.runTransaction(async (transaction) => {
          // Read operations must come before writes in Firestore transactions
          const [profileSnap, promoUsageSnap] = await Promise.all([
            transaction.get(profileRef),
            transaction.get(promoUsageRef),
          ])

          // Check if promo code was already used (inside transaction for atomicity)
          if (promoUsageSnap.exists) {
            throw new Error("PROMO_ALREADY_USED")
          }

          // Check if profile exists
          if (!profileSnap.exists) {
            throw new Error("PROFILE_NOT_FOUND")
          }

          profileCreatedAt = (profileSnap.data() as { created_at?: string } | undefined)?.created_at

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
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "PROMO_ALREADY_USED") {
            return NextResponse.json(
              {
                valid: false,
                error: "This promo code has already been used",
              },
              { status: 200 }
            )
          }
          if (error.message === "PROFILE_NOT_FOUND") {
            return NextResponse.json(
              {
                valid: false,
                error: "User profile not found",
              },
              { status: 404 }
            )
          }
        }
        throw error // Re-throw other errors
      }

      // Update quota to Pro limits using the shared canonical quota writer. This gives us
      // anniversary-based billing (from created_at), current-period doc selection, and the
      // once-per-period idempotency guard, replacing the old calendar-month + "first matching
      // doc" logic. getSessionsLimitForTier("pro") lands sessions_limit at the Pro limit.
      // We intentionally do NOT pass subscription_current_period_end: for this 1-year Pro grant
      // it is a year out, so using it as a monthly boundary would push the quota window a year
      // ahead. created_at drives the correct monthly anniversary window instead.
      await updateQuotaForSubscriptionTierAdmin(userId, "pro", {
        resetUsage: true,
        profileData: {
          created_at: profileCreatedAt,
          subscription_type: "promo",
        },
      })

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
    logger.error("Promo code error:", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process promo code" },
      { status: 500 }
    )
  }
}

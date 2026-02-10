/**
 * GET /api/user/subscription-status
 *
 * Get the authenticated user's subscription tier.
 * Lightweight endpoint for quick subscription checks.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { apiRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimit(request)
    if (rateLimitResult) return rateLimitResult

    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { tier: "free", error: "Not authenticated" },
        { status: 200 } // Return 200 with free tier for unauthenticated users
      )
    }

    const userId = authResult.userId

    // Get user profile from Firestore
    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileDoc = await profileRef.get()

    if (!profileDoc.exists) {
      return NextResponse.json({ tier: "free" })
    }

    const profile = profileDoc.data()

    return NextResponse.json({
      tier: profile?.subscription_tier || "free",
      status: profile?.subscription_status || null,
    })
  } catch (error) {
    logger.error("Error getting subscription status", { error })
    return NextResponse.json({ tier: "free" })
  }
}

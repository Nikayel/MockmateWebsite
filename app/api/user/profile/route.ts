/**
 * GET /api/user/profile
 *
 * Get the authenticated user's profile including subscription tier.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { apiRateLimit } from "@/lib/rate-limit"
import type { Profile } from "@/lib/types"

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimit(request)
    if (rateLimitResult) return rateLimitResult

    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: authResult.error },
        { status: 401 }
      )
    }

    const userId = authResult.userId

    // Get user profile from Firestore
    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileDoc = await profileRef.get()

    if (!profileDoc.exists) {
      return NextResponse.json(
        { error: "Not Found", message: "Profile not found" },
        { status: 404 }
      )
    }

    const profile = profileDoc.data() as Profile

    // Return profile data (exclude sensitive fields if needed)
    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      subscription_tier: profile.subscription_tier || "free",
      subscription_status: profile.subscription_status,
      subscription_type: profile.subscription_type,
      subscription_start_date: profile.subscription_start_date,
      subscription_current_period_end: profile.subscription_current_period_end,
      role: profile.role,
      goal: profile.goal,
      onboarding_completed: profile.onboarding_completed,
      tour_completed: profile.tour_completed,
      created_at: profile.created_at,
    })
  } catch (error) {
    logger.error("Error getting user profile", { error })
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to load profile" },
      { status: 500 }
    )
  }
}

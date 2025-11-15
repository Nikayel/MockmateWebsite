import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth-server"
import { syncSubscriptionFromStripe } from "@/lib/stripe-helpers"

/**
 * API endpoint to manually sync subscription status from Stripe
 * Useful for debugging or forcing a sync
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from Firebase ID token in Authorization header
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const targetUserId = body.userId || userId

    // Only allow users to sync their own subscription
    if (targetUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updatedProfile = await syncSubscriptionFromStripe(targetUserId)

    if (!updatedProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      profile: {
        subscription_tier: updatedProfile.subscription_tier,
        subscription_status: updatedProfile.subscription_status,
        stripe_subscription_id: updatedProfile.stripe_subscription_id,
        stripe_customer_id: updatedProfile.stripe_customer_id,
        subscription_start_date: updatedProfile.subscription_start_date,
        subscription_current_period_end: updatedProfile.subscription_current_period_end,
      },
    })
  } catch (error) {
    console.error("Sync subscription error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync subscription" },
      { status: 500 }
    )
  }
}


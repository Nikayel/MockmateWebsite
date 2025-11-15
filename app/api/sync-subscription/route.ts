import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { syncSubscriptionFromStripe } from "@/lib/stripe-helpers"

/**
 * API endpoint to manually sync subscription status from Stripe
 * Useful for debugging or forcing a sync
 */
export async function POST(request: NextRequest) {
  try {
    const firebaseUser = await getCurrentUser()
    
    if (!firebaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await request.json()
    const targetUserId = userId || firebaseUser.uid

    // Only allow users to sync their own subscription
    if (targetUserId !== firebaseUser.uid) {
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


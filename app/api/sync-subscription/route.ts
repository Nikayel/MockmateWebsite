import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { recoverYearlyProFromSessionId, syncSubscriptionFromStripe } from "@/lib/stripe-helpers"
import { logger } from "@/lib/logger"

// Mark route as dynamic to avoid build-time issues with server-only packages
export const dynamic = "force-dynamic"

/**
 * API endpoint to manually sync subscription status from Stripe
 * Useful for debugging or forcing a sync
 *
 * The /upgrade success page calls this in a retry loop after Stripe redirects the customer back, so
 * it is the front line when a webhook is slow or fails. It accepts the `session_id` Stripe puts in
 * that redirect URL, because a YEARLY purchase is a one-time payment with no Stripe subscription
 * object: syncSubscriptionFromStripe alone can never recover one (see the yearly-recovery block in
 * lib/stripe-helpers.ts). With the session id, the buyer fixes themselves in seconds instead of
 * being charged and stranded on Free.
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from Firebase ID token in Authorization header
    const { userId } = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const targetUserId = body.userId || userId

    // Only allow users to sync their own subscription
    if (targetUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // A checkout session id is untrusted input: it only decides WHICH session to look up. The grant
    // itself re-verifies against Stripe that the session was paid and that it belongs to this
    // verified uid, so a stolen or guessed id cannot buy anyone else access.
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined
    let yearlyRecovery: string | undefined
    if (sessionId) {
      const outcome = await recoverYearlyProFromSessionId(targetUserId, sessionId)
      yearlyRecovery = outcome.status
      if (outcome.status === "not_eligible") {
        // Expected for monthly checkouts and for sessions the webhook already handled; the regular
        // sync below is still the right answer, so this is not an error.
        logger.info("Yearly checkout recovery skipped", {
          userId: targetUserId,
          reason: outcome.reason,
        })
      }
    }

    const updatedProfile = await syncSubscriptionFromStripe(targetUserId)

    if (!updatedProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      yearlyRecovery,
      profile: {
        subscription_tier: updatedProfile.subscription_tier,
        subscription_status: updatedProfile.subscription_status,
        subscription_type: updatedProfile.subscription_type,
        stripe_subscription_id: updatedProfile.stripe_subscription_id,
        stripe_customer_id: updatedProfile.stripe_customer_id,
        subscription_start_date: updatedProfile.subscription_start_date,
        subscription_current_period_end: updatedProfile.subscription_current_period_end,
      },
    })
  } catch (error) {
    logger.error("Sync subscription error", { error })
    return NextResponse.json({ error: "Failed to sync subscription" }, { status: 500 })
  }
}

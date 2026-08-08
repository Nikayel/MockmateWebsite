/**
 * Admin Referral Rewards API
 *
 * Endpoints for the referral reward ledger.
 *
 * The POST handler records that a reward was redeemed OUT OF BAND. It does not
 * pay anyone and it does not grant an entitlement, because this platform has no
 * payout integration and no subscription-granting path. See the long note on
 * `recordRewardRedemption()` for why pretending otherwise was the bug.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getPendingRewards,
  recordRewardRedemption,
  checkRewardEligibility,
  normalizeRedemptionReference,
  MAX_REDEMPTION_REFERENCE_LENGTH,
} from "@/lib/referrals"
import { requirePermission, errorResponse, unauthorizedResponse } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"

const MAX_NOTES_LENGTH = 1000

/**
 * GET /api/admin/referrals/rewards
 *
 * Get pending rewards for admin to process
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.VIEW_ANALYTICS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  try {
    const rewards = await getPendingRewards()

    return NextResponse.json({
      success: true,
      data: rewards,
    })
  } catch (error) {
    console.error("[Admin Rewards API] Error:", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to fetch rewards", 500)
  }
}

interface ParsedRedemptionBody {
  rewardId: string
  reference: string
  notes?: string
  skipEligibilityCheck: boolean
}

type ParseResult = { ok: true; value: ParsedRedemptionBody } | { ok: false; message: string }

/**
 * Validate the request at the trust boundary. `reference` is required: without
 * it the record reconciles against nothing and the endpoint is back to being
 * pure self-attestation.
 */
function parseRedemptionBody(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Request body must be a JSON object" }
  }

  const { rewardId, reference, notes, skipEligibilityCheck } = body as Record<string, unknown>

  if (typeof rewardId !== "string" || !rewardId.trim()) {
    return { ok: false, message: "rewardId is required" }
  }

  const normalizedReference = normalizeRedemptionReference(reference)
  if (!normalizedReference) {
    return {
      ok: false,
      message: `reference is required (max ${MAX_REDEMPTION_REFERENCE_LENGTH} characters). Record the PayPal transaction id, Stripe credit note, or support thread that proves the redemption happened.`,
    }
  }

  if (notes !== undefined && typeof notes !== "string") {
    return { ok: false, message: "notes must be a string" }
  }
  if (typeof notes === "string" && notes.length > MAX_NOTES_LENGTH) {
    return { ok: false, message: `notes must be at most ${MAX_NOTES_LENGTH} characters` }
  }

  if (skipEligibilityCheck !== undefined && typeof skipEligibilityCheck !== "boolean") {
    return { ok: false, message: "skipEligibilityCheck must be a boolean" }
  }

  return {
    ok: true,
    value: {
      rewardId: rewardId.trim(),
      reference: normalizedReference,
      notes: typeof notes === "string" ? notes : undefined,
      skipEligibilityCheck: skipEligibilityCheck === true,
    },
  }
}

/**
 * POST /api/admin/referrals/rewards
 *
 * Record an out-of-band redemption against a pending reward.
 *
 * Body:
 * - rewardId: string
 * - reference: string (required) - how the redemption can be reconciled
 * - notes?: string
 * - skipEligibilityCheck?: boolean (admin override, recorded on the reward)
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.MANAGE_USERS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return errorResponse("Request body must be valid JSON", 400)
    }

    const parsed = parseRedemptionBody(rawBody)
    if (!parsed.ok) {
      return errorResponse(parsed.message, 400)
    }

    const { rewardId, reference, notes, skipEligibilityCheck } = parsed.value

    // Check eligibility before recording (unless admin explicitly overrides).
    if (!skipEligibilityCheck) {
      const eligibility = await checkRewardEligibility(rewardId)
      if (!eligibility.eligible) {
        return errorResponse(
          `Reward not eligible: ${eligibility.reason}. Use skipEligibilityCheck to override.`,
          400
        )
      }
    }

    const result = await recordRewardRedemption({
      rewardId,
      adminUserId: authResult.context!.userId,
      reference,
      notes,
      eligibilityOverridden: skipEligibilityCheck,
    })

    if (!result.ok) {
      // A missing reward is a 404; a refused transition is the caller's
      // problem; a failed write is ours.
      const status = result.code === "not_found" ? 404 : result.code === "write_failed" ? 500 : 409
      return errorResponse(result.message, status)
    }

    return NextResponse.json({
      success: true,
      message:
        "Redemption recorded. This is a bookkeeping record only. The reward still needs to be delivered manually.",
      data: { reward: result.after },
    })
  } catch (error) {
    console.error("[Admin Rewards API] Error recording redemption:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to record redemption",
      500
    )
  }
}

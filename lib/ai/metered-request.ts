import type { NextRequest } from "next/server"
import { enforceQuota } from "@/lib/quota-enforcement"
import { SYSTEM_USER_ID } from "@/lib/usage/services"
import type { RateLimitTier } from "@/lib/pricing"
import { enforceAiFeedbackRateLimit, enforceChatRateLimit } from "@/lib/rate-limiting"

export type MeteredAiPolicy = "chat" | "feedback"

export type MeteredAiRequest =
  | { response: Response }
  | { response: null; userId: string; tier: RateLimitTier }

/**
 * Shared cost-metering preamble for the paid-LLM routes (chat, labs chat, labs feedback,
 * generate-feedback). Runs the three layers in order and returns either an early `response` to
 * send, or the resolved userId and tier:
 *
 *   1. quota + auth (requireAuth) — 401 / quota response for signed-out or over-limit callers;
 *   2. one user-level request-rate charge for the submitted action;
 * Provider calls own token, budget and concurrency accounting because one submitted action may
 * legitimately make several model calls. That separation keeps this request bucket at one charge.
 *
 * Raw-IP abuse belongs at the outer Cloudflare edge. Keeping it out of this helper prevents a
 * shared campus NAT from silently reducing Pro's user-level allowance.
 */
export async function enforceMeteredAiRequest(
  request: NextRequest,
  opts: { policy: MeteredAiPolicy }
): Promise<MeteredAiRequest> {
  const quotaResult = await enforceQuota(request, { requireAuth: true })
  if (!quotaResult.allowed && quotaResult.response) {
    return { response: quotaResult.response }
  }

  const tier = (quotaResult.tier || "free") as RateLimitTier
  // Currently unreachable (every caller sets requireAuth, which 401s before
  // this line), but if a future route reuses this helper without auth, spend
  // lands under the reserved system identity the ledger already understands
  // rather than a second invented one.
  const userId = quotaResult.userId || SYSTEM_USER_ID

  if (userId !== SYSTEM_USER_ID) {
    const requestRateResponse =
      opts.policy === "chat"
        ? await enforceChatRateLimit(userId, tier)
        : await enforceAiFeedbackRateLimit(userId)
    if (requestRateResponse) {
      return { response: requestRateResponse }
    }
  }

  return { response: null, userId, tier }
}

import type { NextRequest } from "next/server"
import { enforceQuota } from "@/lib/quota-enforcement"
import { SYSTEM_USER_ID } from "@/lib/usage/services"
import {
  checkRateLimit,
  startRequestTracking,
  buildRateLimitResponse,
  type RateLimitTier,
} from "@/lib/rate-limiter"

type IpRateLimiter = (request: NextRequest) => Promise<Response | null>

export type MeteredAiRequest =
  | { response: Response }
  | { response: null; userId: string; tier: RateLimitTier; trackingStarted: boolean }

/**
 * Shared cost-metering preamble for the paid-LLM routes (chat, labs chat, labs feedback,
 * generate-feedback). Runs the three layers in order and returns either an early `response` to
 * send, or the resolved userId/tier plus whether concurrent-request tracking was started (the
 * caller is responsible for ending it):
 *
 *   1. IP-based rate limit (raw abuse) — 429 before any auth work;
 *   2. quota + auth (requireAuth) — 401 / quota response for signed-out or over-limit callers;
 *   3. per-user tier rate limit + concurrent-request tracking (skipped for the anonymous fallback).
 *
 * One owner so the four routes cannot drift on the order or shape of these checks. `estimatedTokens`
 * and `ipLimiter` are the only per-route differences.
 */
export async function enforceMeteredAiRequest(
  request: NextRequest,
  opts: { estimatedTokens: number; ipLimiter: IpRateLimiter }
): Promise<MeteredAiRequest> {
  const rateLimitResponse = await opts.ipLimiter(request)
  if (rateLimitResponse) {
    return { response: rateLimitResponse }
  }

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
  let trackingStarted = false

  if (userId !== SYSTEM_USER_ID) {
    const tierRateCheck = await checkRateLimit(userId, tier, opts.estimatedTokens)
    if (!tierRateCheck.allowed) {
      return { response: buildRateLimitResponse(tierRateCheck) }
    }
    await startRequestTracking(userId, opts.estimatedTokens)
    trackingStarted = true
  }

  return { response: null, userId, tier, trackingStarted }
}

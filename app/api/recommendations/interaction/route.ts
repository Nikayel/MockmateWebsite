import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { enforceRateLimitPolicy } from "@/lib/rate-limiting"
import { recommendationInteractionSchema } from "@/lib/agents/recommendations/decision-contract"
import { recordRecommendationInteraction } from "@/lib/agents/recommendations/decision-interactions.server"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" }
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers })
  const limited = await enforceRateLimitPolicy("api", `recommendation-interaction:${auth.userId}`)
  if (limited) return limited
  const parsed = recommendationInteractionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid interaction" }, { status: 400, headers })
  try {
    const found = await recordRecommendationInteraction(auth.userId, parsed.data)
    return NextResponse.json({ success: found }, { status: found ? 200 : 404, headers })
  } catch (error) {
    logger.warn("[Recommendations] Interaction could not be saved", { error })
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers })
  }
}

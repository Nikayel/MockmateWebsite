import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { isGlobalCeilingExceeded } from "@/lib/global-spend-guard"
import { logger } from "@/lib/logger"
import {
  handleGetHints,
  handleGetLearningPath,
  handleGetNextProblems,
  handleGetRecommendations,
  handleGetSimilarProblems,
  handleGetSimilarSolutions,
  handleRecordFeedback,
  handleStoreOnboarding,
  handleStoreSolution,
} from "@/lib/rag/actions"
import { rateLimit } from "@/lib/rate-limit"

/**
 * Legacy RAG API endpoint.
 *
 * Keeps the existing action-based /api/rag contract for current callers while
 * delegating business logic to lib/rag/actions.
 */

const ragRateLimit = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 30,
  prefix: "rl:rag",
})

const ragStorageRateLimit = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 50,
  prefix: "rl:rag-store",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    const isStorageAction = ["store-solution", "store-onboarding"].includes(action)
    const rateLimitResponse = await (isStorageAction ? ragStorageRateLimit : ragRateLimit)(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const authRequiredActions = [
      "store-solution",
      "store-onboarding",
      "get-similar-solutions",
      "get-recommendations",
      "get-next-problems",
      "get-learning-path",
      "record-feedback",
      // Both generate paid work for anonymous callers: get-hints runs an LLM
      // (generateContextualHints) and get-similar-problems runs a vector search that
      // embeds the query. Cost-bearing RAG actions require sign-in like the rest.
      "get-hints",
      "get-similar-problems",
    ]

    if (authRequiredActions.includes(action)) {
      const { userId: verifiedUserId } = await verifyAuth(request)
      if (!verifiedUserId) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
      params.userId = verifiedUserId

      // The $250/day global ceiling lived only inside checkQuota, which this
      // route never calls. Every action in authRequiredActions is on that list
      // precisely because it generates paid work (an LLM call or an embedded
      // vector search), so those are exactly the ones a spend emergency must be
      // able to stop. A rate limit bounds one caller's pace; the ceiling bounds
      // everyone's total, and they are not substitutes.
      if (await isGlobalCeilingExceeded()) {
        return NextResponse.json(
          {
            error: "AI features are temporarily paused",
            message:
              "We have hit today's platform-wide AI spend limit. This will be available again shortly.",
            code: "GLOBAL_CEILING_EXCEEDED",
          },
          { status: 503 }
        )
      }
    }

    switch (action) {
      case "get-hints":
        return handleGetHints(params)

      case "get-similar-problems":
        return handleGetSimilarProblems(params)

      case "get-similar-solutions":
        return handleGetSimilarSolutions(params)

      case "get-recommendations":
        return handleGetRecommendations(params)

      case "store-solution":
        return handleStoreSolution(params)

      case "get-learning-path":
        return handleGetLearningPath(params)

      case "get-next-problems":
        return handleGetNextProblems(params)

      case "store-onboarding":
        return handleStoreOnboarding(params)

      case "record-feedback":
        return handleRecordFeedback(params)

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    logger.error("[RAG API] Request failed", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RAG operation failed" },
      { status: 500 }
    )
  }
}

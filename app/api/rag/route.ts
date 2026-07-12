import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
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
    ]

    if (authRequiredActions.includes(action)) {
      const { userId: verifiedUserId } = await verifyAuth(request)
      if (!verifiedUserId) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
      params.userId = verifiedUserId
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

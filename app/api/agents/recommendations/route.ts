import { NextRequest, NextResponse } from "next/server"
import {
  generateRecommendations,
  getNextProblemRecommendation,
  type RecommendationRequest,
  type CatalogProblem,
} from "@/lib/agents/recommendation-agent"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"

/**
 * Recommendation Agent API
 *
 * Endpoints for AI-powered problem recommendations:
 * - POST: Generate personalized problem recommendations
 *
 * Actions:
 * - recommend: Get personalized problem recommendations
 * - get-next: Get next problem after completing current one
 */

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const authenticatedUserId = authResult.userId

    const body = await request.json()
    const { action, ...params } = body

    // Override userId from request body with authenticated userId for security
    params.userId = authenticatedUserId

    switch (action) {
      case "recommend":
        return handleRecommend(params)
      case "get-next":
        return handleGetNext(params)
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    logger.error("[Recommendation Agent API] Error:", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recommendation failed" },
      { status: 500 }
    )
  }
}

/**
 * Get personalized problem recommendations
 */
async function handleRecommend(params: {
  userId: string
  catalog: CatalogProblem[]
  targetCompany?: string
  targetPatterns?: string[]
  preferredDifficulty?: string
  sessionGoal?: string
  availableTimeMinutes?: number
  excludeProblemIds?: string[]
  limit?: number
}) {
  const {
    userId,
    catalog,
    targetCompany,
    targetPatterns,
    preferredDifficulty,
    sessionGoal,
    availableTimeMinutes,
    excludeProblemIds,
    limit = 10,
  } = params

  // Validate required fields
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  if (!catalog || !Array.isArray(catalog) || catalog.length === 0) {
    return NextResponse.json(
      { error: "catalog array is required and must not be empty" },
      { status: 400 }
    )
  }

  // Build request
  const request: RecommendationRequest = {
    userId,
    targetCompany: targetCompany as string | undefined,
    targetPatterns: targetPatterns as DSAPattern[] | undefined,
    preferredDifficulty: preferredDifficulty as "easy" | "medium" | "hard" | "adaptive" | undefined,
    sessionGoal: sessionGoal as "practice" | "learn-new" | "review" | "challenge" | undefined,
    availableTimeMinutes,
    excludeProblemIds,
    limit,
  }

  // Generate recommendations
  const response = await generateRecommendations(request, catalog)

  return NextResponse.json({
    recommendations: response.recommendations,
    userProfile: response.userProfile,
    sessionPlan: response.sessionPlan,
    metadata: response.metadata,
  })
}

/**
 * Get next problem recommendation after completing current
 */
async function handleGetNext(params: {
  userId: string
  currentProblemId: string
  currentPattern: string
  wasSuccessful: boolean
  catalog: CatalogProblem[]
}) {
  const { userId, currentProblemId, currentPattern, wasSuccessful, catalog } = params

  // Validate required fields
  if (!userId || !currentProblemId || !currentPattern) {
    return NextResponse.json(
      { error: "userId, currentProblemId, and currentPattern are required" },
      { status: 400 }
    )
  }

  if (!catalog || !Array.isArray(catalog) || catalog.length === 0) {
    return NextResponse.json(
      { error: "catalog array is required and must not be empty" },
      { status: 400 }
    )
  }

  const recommendation = await getNextProblemRecommendation(
    userId,
    currentProblemId,
    currentPattern as DSAPattern,
    wasSuccessful,
    catalog
  )

  if (!recommendation) {
    return NextResponse.json({
      recommendation: null,
      message: "No more recommendations available",
    })
  }

  return NextResponse.json({
    recommendation,
    message: wasSuccessful
      ? "Great job! Here's your next challenge."
      : "Keep practicing! Here's a similar problem to reinforce your skills.",
  })
}

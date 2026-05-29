import { NextRequest, NextResponse } from "next/server"
import { getNextProblemRecommendation, type CatalogProblem } from "@/lib/agents/recommendations"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { currentProblemId, currentPattern, wasSuccessful, catalog } = body as {
      currentProblemId?: string
      currentPattern?: string
      wasSuccessful?: boolean
      catalog?: CatalogProblem[]
    }

    if (!currentProblemId || !currentPattern || typeof wasSuccessful !== "boolean") {
      return NextResponse.json(
        { error: "currentProblemId, currentPattern, and wasSuccessful are required" },
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
      authResult.userId,
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
  } catch (error) {
    logger.error("[Next Recommendation API] Error:", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recommendation failed" },
      { status: 500 }
    )
  }
}

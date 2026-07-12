import { NextRequest, NextResponse } from "next/server"
import {
  vectorizeAllProblems,
  getVectorizationStatus,
  vectorizeSingleProblem,
} from "@/lib/rag/problem-vectorization"
import { getScenarioById } from "@/lib/scenarios/index"
import type { DSAScenario } from "@/lib/scenarios/types"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"

/**
 * Problem Vectorization API
 *
 * Endpoints for vectorizing DSA problems and company questions.
 *
 * SECURITY: POST requires admin authentication via ADMIN_USER_IDS
 *
 * GET: Check vectorization status (public - read-only)
 * POST: Trigger vectorization (ADMIN ONLY - requires Firebase login + admin user ID)
 *   - action: 'vectorize-all' | 'vectorize-single' | 'status'
 */

// Admin user IDs from environment (same pattern as seed-vectors)
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",").filter(Boolean) || []

/**
 * Check if user is admin
 * SECURITY: Only trust hardcoded admin list from environment variables
 */
function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId)
}

export async function GET() {
  try {
    const status = await getVectorizationStatus()

    return NextResponse.json({
      status: "ok",
      vectorization: status,
      message: status.hasProblems
        ? `Found ${status.problemCount} vectorized problems, ${status.companyCount} company entries, ${status.patternCount} pattern knowledge entries`
        : "No problems vectorized yet. POST to this endpoint to start vectorization.",
    })
  } catch (error) {
    logger.error("[Vectorize Problems API] Status check error", { error })
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require Firebase authentication
    const { userId } = await verifyAuth(request)
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      )
    }

    // Require admin role
    if (!isAdmin(userId)) {
      return NextResponse.json(
        { error: "Admin access required. Your user ID is not in ADMIN_USER_IDS." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action = "vectorize-all", scenarioId } = body

    switch (action) {
      case "status":
        const status = await getVectorizationStatus()
        return NextResponse.json({ status })

      case "vectorize-single":
        if (!scenarioId) {
          return NextResponse.json(
            { error: "scenarioId is required for vectorize-single" },
            { status: 400 }
          )
        }
        return handleVectorizeSingle(scenarioId)

      case "vectorize-all":
      default:
        return handleVectorizeAll()
    }
  } catch (error) {
    logger.error("[Vectorize Problems API] Error", { error })
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

/**
 * Vectorize all problems
 */
async function handleVectorizeAll(): Promise<NextResponse> {
  logger.info("[Vectorize Problems] Starting full vectorization")

  const result = await vectorizeAllProblems((stage, current, total, item) => {
    logger.info("[Vectorize Problems] Progress", { stage, current, total, item })
  })

  logger.info("[Vectorize Problems] Completed", { result })

  return NextResponse.json({
    success: true,
    result: {
      totalProblems: result.totalProblems,
      totalCompanies: result.totalCompanies,
      totalPatternKnowledge: result.totalPatternKnowledge,
      vectorizedProblems: result.vectorizedProblems,
      vectorizedCompanies: result.vectorizedCompanies,
      vectorizedPatternKnowledge: result.vectorizedPatternKnowledge,
      errorCount: result.errors.length,
      durationMs: result.durationMs,
      durationSeconds: Math.round(result.durationMs / 1000),
    },
    errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined,
    message: `Vectorized ${result.vectorizedProblems} problems, ${result.vectorizedCompanies} company entries, and ${result.vectorizedPatternKnowledge} pattern knowledge entries in ${Math.round(result.durationMs / 1000)}s`,
  })
}

/**
 * Vectorize a single problem
 */
async function handleVectorizeSingle(scenarioId: string): Promise<NextResponse> {
  logger.info("[Vectorize Problems] Vectorizing single problem", { scenarioId })

  const scenario = await getScenarioById(scenarioId)

  if (!scenario) {
    return NextResponse.json({ error: `Scenario not found: ${scenarioId}` }, { status: 404 })
  }

  if (scenario.type !== "dsa") {
    return NextResponse.json(
      { error: "Only DSA scenarios can be vectorized with this endpoint" },
      { status: 400 }
    )
  }

  await vectorizeSingleProblem(scenario as DSAScenario)

  return NextResponse.json({
    success: true,
    scenarioId,
    title: scenario.title,
    message: `Successfully vectorized: ${scenario.title}`,
  })
}

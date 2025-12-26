import { NextRequest, NextResponse } from 'next/server'
import {
  vectorizeAllProblems,
  getVectorizationStatus,
  vectorizeSingleProblem,
  type VectorizationResult,
} from '@/lib/rag/problem-vectorization'
import { getScenarioById } from '@/lib/scenarios/index'
import type { DSAScenario } from '@/lib/scenarios/types'
import { getUserIdFromRequest } from '@/lib/auth-server'

// Admin user IDs - add your admin user IDs here
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",").filter(Boolean) || []

async function isAdmin(userId: string): Promise<boolean> {
  // SECURITY: Only trust hardcoded admin list from environment variables
  // Never read admin status from user-writable Firestore fields
  return ADMIN_USER_IDS.includes(userId)
}

/**
 * Problem Vectorization API
 *
 * Endpoints for vectorizing DSA problems and company questions.
 *
 * GET: Check vectorization status (public)
 * POST: Trigger vectorization (ADMIN ONLY)
 *   - action: 'vectorize-all' | 'vectorize-single' | 'status'
 */

/**
 * Validate admin API key
 */
function validateAdminAuth(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey) {
    console.warn('[Vectorize API] ADMIN_API_KEY not configured')
    return false
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false

  // Support both "Bearer <key>" and just "<key>"
  const providedKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  return providedKey === adminKey
}

export async function GET() {
  try {
    const status = await getVectorizationStatus()

    return NextResponse.json({
      status: 'ok',
      vectorization: status,
      message: status.hasProblems
        ? `Found ${status.problemCount} vectorized problems, ${status.companyCount} company entries, ${status.patternCount} pattern knowledge entries`
        : 'No problems vectorized yet. POST to this endpoint to start vectorization.',
    })
  } catch (error) {
    console.error('[Vectorize Problems API] Status check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Require admin authentication for write operations
  if (!validateAdminAuth(request)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Valid ADMIN_API_KEY required. Use Authorization header: "Bearer <your-key>"'
      },
      { status: 401 }
    )
  }

  try {
    // Check for API key first (for scripts/automation)
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
    const VECTORIZE_API_KEY = process.env.VECTORIZE_API_KEY

    let isAuthorized = false

    if (VECTORIZE_API_KEY && apiKey === VECTORIZE_API_KEY) {
      // API key authentication
      isAuthorized = true
    } else {
      // Firebase auth + admin check
      const userId = await getUserIdFromRequest(request)
      if (userId && isAdmin(userId)) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Authentication required. Provide Firebase ID token or API key via x-api-key header." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action = 'vectorize-all', scenarioId } = body

    switch (action) {
      case 'status':
        const status = await getVectorizationStatus()
        return NextResponse.json({ status })

      case 'vectorize-single':
        if (!scenarioId) {
          return NextResponse.json(
            { error: 'scenarioId is required for vectorize-single' },
            { status: 400 }
          )
        }
        return handleVectorizeSingle(scenarioId)

      case 'vectorize-all':
      default:
        return handleVectorizeAll()
    }
  } catch (error) {
    console.error('[Vectorize Problems API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Vectorization failed' },
      { status: 500 }
    )
  }
}

/**
 * Vectorize all problems
 */
async function handleVectorizeAll(): Promise<NextResponse> {
  console.log('[Vectorize Problems] Starting full vectorization...')

  const result = await vectorizeAllProblems((stage, current, total, item) => {
    console.log(`[Vectorize Problems] ${stage}: ${current}/${total} - ${item}`)
  })

  console.log('[Vectorize Problems] Completed:', result)

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
  console.log(`[Vectorize Problems] Vectorizing single problem: ${scenarioId}`)

  const scenario = await getScenarioById(scenarioId)

  if (!scenario) {
    return NextResponse.json(
      { error: `Scenario not found: ${scenarioId}` },
      { status: 404 }
    )
  }

  if (scenario.type !== 'dsa') {
    return NextResponse.json(
      { error: 'Only DSA scenarios can be vectorized with this endpoint' },
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

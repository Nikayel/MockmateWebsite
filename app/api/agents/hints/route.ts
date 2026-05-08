import { NextRequest, NextResponse } from "next/server"
import {
  generateHints,
  getNextHint,
  type HintGenerationRequest,
  type StruggleMetrics,
  type GeneratedHint,
  type HintTrigger,
} from "@/lib/agents/hints"
import type {
  BaseHintRequestPayload,
  GenerateHintsPayload,
  GetNextHintPayload,
  HintApiRequestBody,
  HintTestResults,
} from "@/lib/agents/hints/contracts"
import { rateLimit } from "@/lib/rate-limit"
import { validateProblemText, validateUserCode, withTimeout, TimeoutError } from "@/lib/rag/utils"
import { embedAndStoreHint, getSimilarHintsFromRAG } from "@/lib/rag"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"

// Rate limit: 15 requests per minute for hint generation (AI-intensive)
const hintRateLimit = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 15,
  prefix: "rl:hints",
})

/**
 * Hint Agent API
 *
 * Endpoints for AI-powered hint generation:
 * - POST: Generate personalized hints based on current state
 *
 * Actions:
 * - generate: Generate all hints for current problem state
 * - get-next: Get the next unrevealed hint
 */

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const authenticatedUserId = authResult.userId

    // Apply rate limiting
    const rateLimitResponse = await hintRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = (await request.json()) as HintApiRequestBody

    switch (body.action) {
      case "generate": {
        const params: GenerateHintsPayload = { ...body, userId: authenticatedUserId }
        return handleGenerateHints(params)
      }
      case "get-next": {
        const params: GetNextHintPayload = { ...body, userId: authenticatedUserId }
        return handleGetNextHint(params)
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${(body as { action?: string }).action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error("[Hint Agent API] Error:", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Hint generation failed" },
      { status: 500 }
    )
  }
}

function buildStruggleMetrics(
  struggleMetrics: Partial<StruggleMetrics> | undefined,
  hintsRevealedFallback = 0
): StruggleMetrics {
  return {
    timeSpentMinutes: struggleMetrics?.timeSpentMinutes ?? 0,
    codeChanges: struggleMetrics?.codeChanges ?? 0,
    testsRun: struggleMetrics?.testsRun ?? 0,
    testsFailed: struggleMetrics?.testsFailed ?? 0,
    hintsRevealed: struggleMetrics?.hintsRevealed ?? hintsRevealedFallback,
    lastCodeChangeMinutesAgo: struggleMetrics?.lastCodeChangeMinutesAgo ?? 0,
    errorCount: struggleMetrics?.errorCount ?? 0,
  }
}

function mapRagHintToGeneratedHint(
  ragHint: {
    id: string
    level?: number
    category?: string
    problemTitle: string
    content: string
    similarity: number
    pattern?: string
  },
  fallbackLevel: 1 | 2 | 3 | 4
): GeneratedHint {
  return {
    id: `rag_${ragHint.id}`,
    level: (ragHint.level || fallbackLevel) as 1 | 2 | 3 | 4,
    category: (ragHint.category || "approach") as GeneratedHint["category"],
    title: `Insight from ${ragHint.problemTitle}`,
    content: ragHint.content,
    isBlurred: true,
    source: "rag",
    relevanceScore: ragHint.similarity,
    metadata: {
      pattern: ragHint.pattern as DSAPattern,
      relatedConcepts: [],
    },
  }
}

function buildHintRequest(
  params: BaseHintRequestPayload,
  fullMetrics: StruggleMetrics
): HintGenerationRequest {
  return {
    userId: params.userId,
    problemId: params.problemId,
    problemTitle: params.problemTitle,
    problemText: params.problemText,
    problemPattern: params.problemPattern as DSAPattern | undefined,
    difficulty: (params.difficulty ?? "medium") as "easy" | "medium" | "hard",
    userCode: params.userCode ?? "",
    language: params.language ?? "javascript",
    struggleMetrics: fullMetrics,
    testResults: params.testResults as HintTestResults | undefined,
    optimalComplexity: params.optimalComplexity,
    constraints: params.constraints,
  }
}

/**
 * Generate personalized hints
 */
async function handleGenerateHints(params: GenerateHintsPayload) {
  const {
    userId,
    problemId,
    problemTitle,
    problemText,
    problemPattern,
    difficulty = "medium",
    userCode = "",
    language = "javascript",
    struggleMetrics = {},
    testResults,
    existingHints,
    trigger = "initial",
    optimalComplexity,
    constraints,
  } = params

  // Validate required fields
  if (!userId || !problemId) {
    return NextResponse.json({ error: "userId and problemId are required" }, { status: 400 })
  }

  // Validate and sanitize problem text
  const problemValidation = validateProblemText(problemText)
  if (!problemValidation.valid) {
    return NextResponse.json({ error: problemValidation.error }, { status: 400 })
  }

  // Validate user code if provided
  const codeValidation = validateUserCode(userCode)
  if (!codeValidation.valid) {
    return NextResponse.json({ error: codeValidation.error }, { status: 400 })
  }

  const fullMetrics = buildStruggleMetrics(struggleMetrics)

  // Build request with sanitized inputs
  const request: HintGenerationRequest = {
    ...buildHintRequest(
      {
        ...params,
        userCode: codeValidation.sanitized!,
        problemText: problemValidation.sanitized!,
      },
      fullMetrics
    ),
    problemText: problemValidation.sanitized!,
    userCode: codeValidation.sanitized!,
    existingHints,
    trigger,
  }

  try {
    // First, try to retrieve similar hints from RAG (fast path)
    let ragHints: GeneratedHint[] = []
    try {
      const similarHints = await getSimilarHintsFromRAG(
        problemValidation.sanitized!,
        codeValidation.sanitized!,
        {
          problemId,
          pattern: problemPattern,
          limit: 3,
          minSimilarity: 0.5, // Higher threshold for quality
        }
      )

      // Convert RAG hints to GeneratedHint format
      ragHints = similarHints.map((h) => mapRagHintToGeneratedHint(h, 2))

      logger.info("[Hints API] Retrieved hints from RAG", { count: ragHints.length, problemId })
    } catch (ragError) {
      // Non-blocking - continue without RAG hints
      logger.warn("[Hints API] RAG hint retrieval failed:", { error: ragError })
    }

    // Generate new hints with timeout (45 seconds for AI-intensive operation)
    const response = await withTimeout(generateHints(request), 45000, "Hint generation")

    // Generated hints are based on the candidate's current code. RAG hints stay supplementary.
    const allHints = [...response.hints, ...ragHints]

    // Deduplicate by content similarity (simple check)
    const seenContent = new Set<string>()
    const uniqueHints = allHints.filter((hint) => {
      const contentKey = hint.content.substring(0, 50).toLowerCase()
      if (seenContent.has(contentKey)) return false
      seenContent.add(contentKey)
      return true
    })

    // Store generated hints in RAG for future retrieval (non-blocking)
    storeHintsInRAG(
      response.hints.filter((h) => h.source === "ai" || h.source === "pattern-knowledge"),
      problemId,
      problemTitle,
      problemPattern,
      difficulty,
      userId
    ).catch((err) => logger.error("[Hints API] Failed to store hints in RAG:", { error: err }))

    return NextResponse.json({
      hints: uniqueHints,
      struggleLevel: response.struggleLevel,
      recommendedRevealLevel: response.recommendedRevealLevel,
      personalizationApplied: response.personalizationApplied,
      ragHintsCount: ragHints.length,
      metadata: {
        ...response.metadata,
        ragContextUsed: ragHints.length > 0,
      },
    })
  } catch (error) {
    if (error instanceof TimeoutError) {
      return NextResponse.json(
        { error: "Hint generation timed out. Please try again." },
        { status: 504 }
      )
    }
    throw error
  }
}

/**
 * Store generated hints in RAG vector DB for future retrieval
 */
async function storeHintsInRAG(
  hints: GeneratedHint[],
  problemId: string,
  problemTitle: string,
  problemPattern: string | undefined,
  difficulty: string,
  userId: string
): Promise<void> {
  // Only store AI-generated and pattern-knowledge hints (not RAG or user-history)
  const hintsToStore = hints.filter((h) => h.source === "ai" || h.source === "pattern-knowledge")

  if (hintsToStore.length === 0) return

  logger.info("[Hints API] Storing hints in RAG", { count: hintsToStore.length, problemId })

  for (const hint of hintsToStore) {
    try {
      await embedAndStoreHint(problemId, hint.content, hint.level, {
        problemTitle,
        problemType: difficulty === "hard" ? "dsa-hard" : "dsa",
        pattern: problemPattern || hint.metadata?.pattern,
        category: hint.category,
        tags: hint.metadata?.relatedConcepts || [],
        userId,
      })
    } catch (err) {
      // Log but don't fail - storing hints is non-critical
      logger.warn("[Hints API] Failed to store hint:", { hintId: hint.id, error: err })
    }
  }
}

/**
 * Get the next unrevealed hint
 */
async function handleGetNextHint(params: GetNextHintPayload) {
  const {
    userId,
    problemId,
    problemTitle,
    problemText,
    problemPattern,
    difficulty = "medium",
    userCode = "",
    language = "javascript",
    struggleMetrics = {},
    testResults,
    previousHintIds = [],
  } = params

  // Validate required fields
  if (!userId || !problemId || !problemText) {
    return NextResponse.json(
      { error: "userId, problemId, and problemText are required" },
      { status: 400 }
    )
  }

  const fullMetrics = buildStruggleMetrics(struggleMetrics, previousHintIds.length)

  // First, try to get a relevant hint from RAG if we haven't shown many hints yet
  if (previousHintIds.length < 2) {
    try {
      const ragHints = await getSimilarHintsFromRAG(problemText, userCode, {
        problemId,
        pattern: problemPattern,
        hintLevel: (previousHintIds.length + 1) as 1 | 2 | 3 | 4,
        limit: 1,
        minSimilarity: 0.6, // Higher threshold for single hint
      })

      if (ragHints.length > 0) {
        const ragHint = ragHints[0]
        // Check if this hint wasn't already shown
        if (!previousHintIds.includes(`rag_${ragHint.id}`)) {
          const hint = mapRagHintToGeneratedHint(
            ragHint,
            (previousHintIds.length + 1) as 1 | 2 | 3 | 4
          )

          return NextResponse.json({
            hint,
            message: "Retrieved similar hint from knowledge base",
            source: "rag",
          })
        }
      }
    } catch (ragError) {
      logger.warn("[Hints API] RAG retrieval failed for get-next:", { error: ragError })
    }
  }

  // Fall back to generating a new hint
  const request: HintGenerationRequest = buildHintRequest(
    {
      userId,
      problemId,
      problemTitle,
      problemText,
      problemPattern: problemPattern as DSAPattern | undefined,
      difficulty: difficulty as "easy" | "medium" | "hard",
      userCode,
      language,
      testResults,
    },
    fullMetrics
  )

  const hint = await getNextHint(request, previousHintIds)

  if (!hint) {
    return NextResponse.json({
      hint: null,
      message: "No more hints available",
    })
  }

  // Store the new hint in RAG for future use (non-blocking)
  if (hint.source === "ai" || hint.source === "pattern-knowledge") {
    embedAndStoreHint(problemId, hint.content, hint.level, {
      problemTitle,
      problemType: difficulty === "hard" ? "dsa-hard" : "dsa",
      pattern: problemPattern || hint.metadata?.pattern,
      category: hint.category,
      tags: hint.metadata?.relatedConcepts || [],
      userId,
    }).catch((err) => logger.warn("[Hints API] Failed to store hint:", { error: err }))
  }

  return NextResponse.json({
    hint,
    message: "Hint generated successfully",
    source: hint.source,
  })
}

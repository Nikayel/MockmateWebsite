/**
 * Comprehensive RAG API v2
 *
 * Unified API for all RAG operations including:
 * - Knowledge retrieval
 * - Context building
 * - User performance analysis
 * - Personalized recommendations
 * - Embedding operations
 * - Knowledge base management
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { isGlobalCeilingExceeded } from "@/lib/global-spend-guard"
import { verifyAdminAccess } from "@/lib/admin/middleware"
import {
  getAdvancedRetriever,
  type AdvancedRetrievalOptions,
} from "@/lib/rag/retrieval/advanced-retrieval"
import { getContextBuilder } from "@/lib/rag/context-builder"
import { getUserPerformanceRAG } from "@/lib/rag/user-performance-rag"
import { getEnhancedProfileService } from "@/lib/rag/enhanced-user-profile"
import { getSmartRecommendationService } from "@/lib/rag/smart-recommendations"
import { getMisconceptionTracker, analyzeCode } from "@/lib/rag/misconception-detection"
import { getHybridProvider } from "@/lib/rag/embeddings/hybrid-provider"
import {
  seedKnowledgeBase,
  isKnowledgeBaseSeeded,
  type KnowledgeCategory,
} from "@/lib/rag/knowledge-base/seeder"
import {
  getPatternKnowledge,
  patternKnowledgeToDocument,
} from "@/lib/rag/knowledge-base/dsa-knowledge"
import {
  getCompanyInterviewKnowledge,
  companyKnowledgeToDocument,
} from "@/lib/rag/knowledge-base/company-knowledge"
import { rateLimit } from "@/lib/rate-limit"
import { withTimeout, validateRAGQuery, TimeoutError } from "@/lib/rag/utils"
import {
  RAGV2ActionSchema,
  validateRequest,
  validationErrorResponse,
} from "@/lib/validations/api-schemas"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { CompanyId } from "@/lib/data/company-questions/types"

// Rate limit: 30 requests per minute for RAG v2 operations
const ragV2RateLimit = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 30,
  prefix: "rl:rag-v2",
})

// Stricter limit for embedding generation (expensive operation)
const embeddingRateLimit = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 20,
  prefix: "rl:rag-embedding",
})

/**
 * POST /api/rag/v2 - Execute RAG operations
 *
 * Body: { action: string, ...params }
 *
 * Actions:
 *   - retrieve: Advanced retrieval with filtering and reranking
 *   - build-context: Build AI context for various use cases
 *   - get-pattern-knowledge: Get knowledge for DSA patterns
 *   - get-company-knowledge: Get company interview knowledge
 *   - get-user-performance: Get user performance profile
 *   - get-recommendations: Get personalized recommendations
 *   - get-enhanced-profile: Get comprehensive user profile (cognitive, behavioral, knowledge graph)
 *   - get-smart-recommendations: Get recommendations with rich explanations and symbols
 *   - get-skill-insights: Get dashboard-ready skill insights
 *   - analyze-code: Analyze code for misconceptions and errors
 *   - generate-embedding: Generate embedding for text
 *   - seed-knowledge-base: Seed the knowledge base (admin)
 *   - health: Check RAG system health
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = validateRequest(RAGV2ActionSchema, body)
    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }

    const { action } = validation.data
    const userId = authResult.userId

    // Apply rate limiting based on action
    const isEmbeddingAction = action === "generate-embedding"
    const rateLimitResponse = await (isEmbeddingAction ? embeddingRateLimit : ragV2RateLimit)(
      request
    )
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // The $250/day global ceiling lived only inside checkQuota, which this route
    // never calls. generate-embedding in particular bills per call, so a runaway
    // client could spend all day here with the kill switch reading near zero. A
    // rate limit bounds one caller's pace; the ceiling bounds everyone's total.
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

    switch (action) {
      case "retrieve":
        return handleRetrieve(validation.data)

      case "build-context":
        return handleBuildContext(validation.data, userId)

      case "get-pattern-knowledge":
        return handleGetPatternKnowledge(validation.data)

      case "get-company-knowledge":
        return handleGetCompanyKnowledge(validation.data)

      case "get-user-performance":
        return handleGetUserPerformance(userId)

      case "get-recommendations":
        return handleGetRecommendations(userId)

      case "get-enhanced-profile":
        return handleGetEnhancedProfile(userId)

      case "get-smart-recommendations":
        return handleGetSmartRecommendations(userId, validation.data)

      case "get-skill-insights":
        return handleGetSkillInsights(userId)

      case "analyze-code":
        return handleAnalyzeCode(userId, validation.data)

      case "generate-embedding":
        return handleGenerateEmbedding(validation.data)

      case "seed-knowledge-base": {
        const adminCheck = await verifyAdminAccess(request)
        if (!adminCheck.authorized) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        return handleSeedKnowledgeBase(validation.data)
      }

      case "health":
        return handleHealthCheck()

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error("[RAG API v2] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RAG operation failed" },
      { status: 500 }
    )
  }
}

/**
 * Handle advanced retrieval
 */
async function handleRetrieve(params: {
  query: string
  limit?: number
  minSimilarity?: number
  types?: string[]
  patterns?: DSAPattern[]
  companies?: CompanyId[]
  difficulty?: string[]
  enableQueryExpansion?: boolean
  enableReranking?: boolean
}) {
  const { query } = params

  // Validate query input
  const validation = validateRAGQuery(query)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const sanitizedQuery = validation.sanitized!
  const retriever = getAdvancedRetriever()
  const startTime = Date.now()

  const options: AdvancedRetrievalOptions = {
    query: sanitizedQuery,
    limit: Math.min(params.limit || 10, 50), // Cap at 50 results
    minSimilarity: params.minSimilarity || 0.3,
    types: params.types as AdvancedRetrievalOptions["types"],
    patterns: params.patterns,
    companies: params.companies,
    difficulty: params.difficulty as ("easy" | "medium" | "hard")[],
    enableQueryExpansion: params.enableQueryExpansion ?? true,
    enableReranking: params.enableReranking ?? true,
  }

  try {
    // Wrap retrieval in timeout (30 seconds max)
    const { results, analytics } = await withTimeout(
      retriever.retrieve(options),
      30000,
      "RAG retrieval"
    )

    return NextResponse.json({
      results,
      analytics: {
        ...analytics,
        totalTimeMs: Date.now() - startTime,
      },
    })
  } catch (error) {
    if (error instanceof TimeoutError) {
      return NextResponse.json(
        { error: "Request timed out. Please try a simpler query." },
        { status: 504 }
      )
    }
    throw error
  }
}

/**
 * Handle context building
 */
async function handleBuildContext(
  params: {
    contextType: "roadmap" | "hint" | "interview-prep" | "feedback" | "query"
    // Roadmap context params
    targetCompany?: CompanyId
    experienceLevel?: string
    daysRemaining?: number
    patternFamiliarity?: { pattern: DSAPattern; level: string }[]
    hoursPerDay?: number
    // Problem context params
    problemText?: string
    problemPattern?: DSAPattern
    userCode?: string
    // Interview prep params
    patterns?: DSAPattern[]
    difficulty?: string
    // Feedback params
    testResults?: { passed: number; total: number }
    // Query params
    query?: string
  },
  userId: string
) {
  const { contextType } = params

  if (!contextType) {
    return NextResponse.json({ error: "Context type is required" }, { status: 400 })
  }

  const contextBuilder = getContextBuilder()
  let context

  switch (contextType) {
    case "roadmap":
      if (!params.targetCompany) {
        return NextResponse.json(
          { error: "Target company is required for roadmap context" },
          { status: 400 }
        )
      }
      context = await contextBuilder.buildRoadmapContext({
        targetCompany: params.targetCompany,
        experienceLevel: (params.experienceLevel || "intermediate") as
          | "intern"
          | "beginner"
          | "intermediate"
          | "advanced",
        daysRemaining: params.daysRemaining || 30,
        patternFamiliarity: params.patternFamiliarity || [],
        hoursPerDay: params.hoursPerDay || 2,
        userId,
      })
      break

    case "hint":
      if (!params.problemText) {
        return NextResponse.json(
          { error: "Problem text is required for hint context" },
          { status: 400 }
        )
      }
      context = await contextBuilder.buildHintContext({
        problemText: params.problemText,
        problemPattern: params.problemPattern,
        userCode: params.userCode,
        userId,
      })
      break

    case "interview-prep":
      if (!params.targetCompany || !params.patterns) {
        return NextResponse.json(
          { error: "Target company and patterns are required for interview prep context" },
          { status: 400 }
        )
      }
      context = await contextBuilder.buildInterviewPrepContext({
        company: params.targetCompany,
        patterns: params.patterns,
        difficulty: (params.difficulty || "mixed") as "easy" | "medium" | "hard" | "mixed",
        userId,
      })
      break

    case "feedback":
      if (!params.problemText || !params.userCode || !params.testResults) {
        return NextResponse.json(
          { error: "Problem text, user code, and test results are required for feedback context" },
          { status: 400 }
        )
      }
      context = await contextBuilder.buildFeedbackContext({
        problemText: params.problemText,
        userCode: params.userCode,
        testResults: params.testResults,
        pattern: params.problemPattern,
        difficulty: params.difficulty as "easy" | "medium" | "hard",
      })
      break

    case "query":
      if (!params.query) {
        return NextResponse.json({ error: "Query is required for query context" }, { status: 400 })
      }
      context = await contextBuilder.buildQueryContext(params.query, {
        patterns: params.patterns,
        companies: params.targetCompany ? [params.targetCompany] : undefined,
      })
      break

    default:
      return NextResponse.json({ error: `Unknown context type: ${contextType}` }, { status: 400 })
  }

  return NextResponse.json({ context })
}

/**
 * Handle get pattern knowledge
 */
async function handleGetPatternKnowledge(params: {
  pattern?: DSAPattern
  patterns?: DSAPattern[]
  format?: "full" | "document" | "summary"
}) {
  const { pattern, patterns: patternList, format = "full" } = params

  if (!pattern && !patternList) {
    return NextResponse.json({ error: "Pattern or patterns array is required" }, { status: 400 })
  }

  const patternsToFetch = patternList || (pattern ? [pattern] : [])
  const results = []

  for (const p of patternsToFetch) {
    const knowledge = getPatternKnowledge(p)
    if (knowledge) {
      if (format === "document") {
        results.push({
          pattern: p,
          document: patternKnowledgeToDocument(knowledge),
        })
      } else if (format === "summary") {
        results.push({
          pattern: p,
          displayName: knowledge.displayName,
          description: knowledge.description,
          whenToUse: knowledge.whenToUse,
          timeComplexity: knowledge.timeComplexity.typical,
          spaceComplexity: knowledge.spaceComplexity.typical,
        })
      } else {
        results.push({
          pattern: p,
          knowledge,
        })
      }
    }
  }

  return NextResponse.json({
    results,
    found: results.length,
    requested: patternsToFetch.length,
  })
}

/**
 * Handle get company knowledge
 */
async function handleGetCompanyKnowledge(params: {
  company?: CompanyId
  companies?: CompanyId[]
  format?: "full" | "document" | "summary"
}) {
  const { company, companies: companyList, format = "full" } = params

  if (!company && !companyList) {
    return NextResponse.json({ error: "Company or companies array is required" }, { status: 400 })
  }

  const companiesToFetch = companyList || (company ? [company] : [])
  const results = []

  for (const c of companiesToFetch) {
    const knowledge = getCompanyInterviewKnowledge(c)
    if (knowledge) {
      if (format === "document") {
        results.push({
          company: c,
          document: companyKnowledgeToDocument(knowledge),
        })
      } else if (format === "summary") {
        results.push({
          company: c,
          companyName: knowledge.companyName,
          interviewStyle: knowledge.interviewStyle.description,
          pace: knowledge.interviewStyle.pace,
          topPatterns: knowledge.topPatterns.slice(0, 5).map((p) => p.pattern),
        })
      } else {
        results.push({
          company: c,
          knowledge,
        })
      }
    }
  }

  return NextResponse.json({
    results,
    found: results.length,
    requested: companiesToFetch.length,
  })
}

/**
 * Handle get user performance
 */
async function handleGetUserPerformance(userId: string) {
  const performanceRAG = getUserPerformanceRAG()
  const profile = await performanceRAG.getPerformanceProfile(userId)

  return NextResponse.json({ profile })
}

/**
 * Handle get recommendations
 */
async function handleGetRecommendations(userId: string) {
  const performanceRAG = getUserPerformanceRAG()
  const recommendations = await performanceRAG.getRecommendations(userId)
  const profile = await performanceRAG.getPerformanceProfile(userId)

  return NextResponse.json({
    recommendations,
    basedOn: {
      totalSessions: profile.totalSessions,
      averageScore: profile.averageScore,
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
    },
  })
}

/**
 * Handle generate embedding
 */
async function handleGenerateEmbedding(params: { text?: string; texts?: string[] }) {
  const { text, texts } = params

  if (!text && !texts) {
    return NextResponse.json({ error: "Text or texts array is required" }, { status: 400 })
  }

  const provider = getHybridProvider()
  const startTime = Date.now()

  if (texts) {
    const embeddings = await provider.generateEmbeddings(texts)
    return NextResponse.json({
      embeddings,
      count: embeddings.length,
      dimensions: embeddings[0]?.length || 0,
      timeMs: Date.now() - startTime,
      provider: provider.getActiveProvider(),
    })
  } else {
    const embedding = await provider.generateEmbedding(text!)
    return NextResponse.json({
      embedding,
      dimensions: embedding.length,
      timeMs: Date.now() - startTime,
      provider: provider.getActiveProvider(),
    })
  }
}

/**
 * Handle seed knowledge base (admin only)
 */
async function handleSeedKnowledgeBase(params: {
  force?: boolean
  categories?: KnowledgeCategory[]
}) {
  const progress = await seedKnowledgeBase({
    force: params.force || false,
    categories: params.categories,
  })

  return NextResponse.json({
    progress,
    message:
      progress.status === "completed"
        ? `Successfully seeded ${progress.successfulDocuments} documents`
        : progress.status === "failed"
          ? "Seeding failed"
          : "Already seeded (use force=true to re-seed)",
  })
}

/**
 * Handle health check
 */
async function handleHealthCheck() {
  const startTime = Date.now()

  try {
    // Check embedding provider
    const embeddingProvider = getHybridProvider()
    const healthStatus = await embeddingProvider.healthCheck()

    // Check if knowledge base is seeded
    const kbSeeded = await isKnowledgeBaseSeeded()

    // Get embedding metrics
    const metrics = embeddingProvider.getMetrics()

    return NextResponse.json({
      status: "healthy",
      components: {
        embeddingProvider: {
          healthy: healthStatus.healthy,
          mode: healthStatus.mode,
          openaiAvailable: healthStatus.openaiAvailable,
          tfidfAvailable: healthStatus.tfidfAvailable,
        },
        knowledgeBase: {
          seeded: kbSeeded,
        },
        metrics: {
          totalEmbeddings: metrics.total,
          byProvider: metrics.byProvider,
          avgLatencyMs: Math.round(metrics.avgLatencyMs),
          cacheHitRate: Math.round(metrics.cacheHitRate * 100) + "%",
        },
      },
      responseTimeMs: Date.now() - startTime,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        responseTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}

/**
 * Handle get enhanced profile
 */
async function handleGetEnhancedProfile(userId: string) {
  const profileService = getEnhancedProfileService()
  const profile = await profileService.getEnhancedProfile(userId)

  return NextResponse.json({
    profile,
    summary: {
      level:
        profile.interviewReadiness.overall >= 70
          ? "advanced"
          : profile.interviewReadiness.overall >= 40
            ? "intermediate"
            : "beginner",
      interviewReadiness: profile.interviewReadiness.overall,
      topStrengths: profile.interviewReadiness.strongestAreas.slice(0, 3),
      criticalGaps: profile.interviewReadiness.criticalGaps.slice(0, 3),
      activeInsights: profile.insights.filter((i) => i.priority === "high").length,
      learningStyle: profile.cognitive.learningStyle.primary,
      trend: profile.temporal.growth.accelerating
        ? "accelerating"
        : profile.temporal.growth.currentVelocity > 0
          ? "improving"
          : "stable",
    },
  })
}

function getScenarioPattern(scenario: unknown): DSAPattern {
  if (scenario && typeof scenario === "object" && "pattern" in scenario) {
    const pattern = (scenario as { pattern?: unknown }).pattern
    if (typeof pattern === "string") return pattern as DSAPattern
  }

  return "arrays-hashing"
}

/**
 * Handle get smart recommendations with rich explanations
 */
async function handleGetSmartRecommendations(
  userId: string,
  params: {
    targetCompany?: CompanyId
    availableMinutes?: number
    sessionGoal?: "warmup" | "practice" | "challenge" | "review" | "interview-prep"
    excludeIds?: string[]
    limit?: number
    problems?: Array<{
      id: string
      title: string
      pattern: DSAPattern
      difficulty: "easy" | "medium" | "hard"
      company?: CompanyId
      frequency?: number
    }>
  }
) {
  const recommendationService = getSmartRecommendationService()

  // Auto-fetch problems from scenarios if not provided
  let problems = params.problems
  if (!problems || problems.length === 0) {
    try {
      const { getScenariosByType } = await import("@/lib/scenarios/index")
      const dsaScenarios = await getScenariosByType("dsa")

      problems = dsaScenarios.map((scenario) => ({
        id: scenario.id,
        title: scenario.title,
        pattern: getScenarioPattern(scenario),
        difficulty: scenario.difficulty as "easy" | "medium" | "hard",
        company: scenario.companies[0]?.toLowerCase() as CompanyId | undefined,
        frequency: 1, // Default frequency
      }))
    } catch (error) {
      console.error("[RAG API] Failed to auto-fetch scenarios:", error)
      return NextResponse.json({ error: "Failed to fetch problem pool" }, { status: 500 })
    }
  }

  if (problems.length === 0) {
    return NextResponse.json(
      { error: "No problems available for recommendations" },
      { status: 400 }
    )
  }

  const response = await recommendationService.getRecommendations(
    {
      userId,
      targetCompany: params.targetCompany,
      availableMinutes: params.availableMinutes,
      sessionGoal: params.sessionGoal,
      excludeIds: params.excludeIds,
      limit: params.limit,
    },
    problems
  )

  return NextResponse.json(response)
}

/**
 * Handle get skill insights for dashboard
 */
async function handleGetSkillInsights(userId: string) {
  const profileService = getEnhancedProfileService()
  const profile = await profileService.getEnhancedProfile(userId)
  const misconceptionTracker = getMisconceptionTracker()
  const misconceptions = await misconceptionTracker.getActiveMisconceptions(userId)

  // Build dashboard-ready insights
  const skillInsights = {
    // Overall stats
    overview: {
      interviewReadiness: profile.interviewReadiness.overall,
      totalConcepts: profile.knowledgeGraph.concepts.length,
      masteredConcepts: profile.knowledgeGraph.concepts.filter((c) => c.predictedMastery >= 70)
        .length,
      learningConcepts: profile.knowledgeGraph.concepts.filter(
        (c) => c.predictedMastery >= 40 && c.predictedMastery < 70
      ).length,
      needsWorkConcepts: profile.knowledgeGraph.concepts.filter((c) => c.predictedMastery < 40)
        .length,
    },

    // Cognitive insights
    cognitive: {
      learningStyle: profile.cognitive.learningStyle,
      problemSolvingApproach: profile.cognitive.problemSolvingApproach.style,
      patternRecognitionSpeed: profile.cognitive.patternRecognition.speed,
      complexityTolerance: profile.cognitive.workingMemory.complexityTolerance,
    },

    // Behavioral insights
    behavioral: {
      motivationType: profile.behavioral.motivation.type,
      consistency: profile.behavioral.motivation.consistency,
      averageSessionMinutes: Math.round(profile.behavioral.engagement.averageSessionLength),
      sessionsPerWeek: profile.behavioral.engagement.sessionsPerWeek.toFixed(1),
      fatigueLevel: profile.behavioral.fatigue.currentLevel,
      recommendedBreak: profile.behavioral.fatigue.recommendedBreak,
    },

    // Pattern mastery (for radar chart)
    patternMastery: profile.knowledgeGraph.concepts
      .reduce(
        (acc, c) => {
          if (!acc.find((x) => x.pattern === c.parentPattern)) {
            const patternConcepts = profile.knowledgeGraph.concepts.filter(
              (x) => x.parentPattern === c.parentPattern
            )
            const avgMastery =
              patternConcepts.reduce((sum, x) => sum + x.predictedMastery, 0) /
              patternConcepts.length
            acc.push({
              pattern: c.parentPattern,
              mastery: Math.round(avgMastery),
              practiceCount: patternConcepts.reduce((sum, x) => sum + x.practiceCount, 0),
            })
          }
          return acc
        },
        [] as { pattern: DSAPattern; mastery: number; practiceCount: number }[]
      )
      .sort((a, b) => b.mastery - a.mastery),

    // Skills needing review
    skillDecay: profile.temporal.skillDecay
      .filter((sd) => sd.urgency !== "none")
      .map((sd) => ({
        pattern: sd.pattern,
        daysSincePractice: sd.daysSincePractice,
        decayPercent: Math.round(sd.estimatedDecay),
        urgency: sd.urgency,
      })),

    // Active misconceptions
    misconceptions: misconceptions.map((m) => ({
      id: m.id,
      pattern: m.pattern,
      type: m.misconceptionType,
      description: m.description,
      frequency: m.frequency,
      suggestedFix: m.suggestedFix,
    })),

    // Knowledge gaps
    gaps: profile.knowledgeGraph.gaps.map((g) => ({
      pattern: g.pattern,
      missingPrereqs: g.missingPrerequisites.map((p) => p.concept),
      impact: g.impact,
    })),

    // Growth trajectory
    growth: {
      velocity: profile.temporal.growth.currentVelocity,
      accelerating: profile.temporal.growth.accelerating,
      projectedLevel: profile.temporal.growth.projectedLevel,
      projectedDaysToGoal: profile.temporal.growth.projectedTimeToGoal,
    },

    // Retention stats
    retention: profile.temporal.retention,

    // Active insights (actionable items)
    insights: profile.insights.map((i) => ({
      id: i.id,
      type: i.type,
      icon: i.icon,
      title: i.title,
      description: i.description,
      action: i.action,
      priority: i.priority,
    })),

    // Interview readiness breakdown
    interviewReadiness: {
      overall: profile.interviewReadiness.overall,
      strongestAreas: profile.interviewReadiness.strongestAreas,
      criticalGaps: profile.interviewReadiness.criticalGaps,
      estimatedPrepDays: profile.interviewReadiness.estimatedPrepDays,
    },
  }

  return NextResponse.json(skillInsights)
}

/**
 * Handle code analysis for misconceptions
 */
async function handleAnalyzeCode(
  userId: string,
  params: {
    code: string
    pattern: DSAPattern
    testResults?: {
      passed: number
      total: number
      failingTests?: string[]
    }
  }
) {
  const { code, pattern, testResults } = params

  if (!code || !pattern) {
    return NextResponse.json({ error: "Code and pattern are required" }, { status: 400 })
  }

  // Analyze code for misconceptions
  const analysis = analyzeCode(code, pattern, testResults)

  // Track misconceptions
  const tracker = getMisconceptionTracker()
  for (const misconception of analysis.misconceptions) {
    await tracker.trackMisconception(userId, misconception)
  }

  // Check for resolutions if tests passed
  let resolvedMisconceptions: string[] = []
  if (testResults && testResults.passed === testResults.total) {
    resolvedMisconceptions = await tracker.checkForResolution(userId, pattern, testResults)
  }

  return NextResponse.json({
    analysis,
    tracked: analysis.misconceptions.length,
    resolved: resolvedMisconceptions.length,
    summary: {
      hasMisconceptions: analysis.misconceptions.length > 0,
      hasQualityIssues: analysis.codeQualityIssues.length > 0,
      hasPatternMisuse: analysis.patternMisuse.length > 0,
      overallConfidence: analysis.overallConfidence,
    },
  })
}

/**
 * GET /api/rag/v2 - Quick health check
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return handleHealthCheck()
}

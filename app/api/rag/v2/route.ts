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

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-helpers'
import { getAdvancedRetriever, type AdvancedRetrievalOptions } from '@/lib/rag/retrieval/advanced-retrieval'
import { getContextBuilder } from '@/lib/rag/context-builder'
import { getUserPerformanceRAG } from '@/lib/rag/user-performance-rag'
import { getHybridProvider } from '@/lib/rag/embeddings/hybrid-provider'
import { seedKnowledgeBase, isKnowledgeBaseSeeded, getKnowledgeBaseSeeder } from '@/lib/rag/knowledge-base/seeder'
import { getPatternKnowledge, patternKnowledgeToDocument } from '@/lib/rag/knowledge-base/dsa-knowledge'
import { getCompanyInterviewKnowledge, companyKnowledgeToDocument } from '@/lib/rag/knowledge-base/company-knowledge'
import { rateLimit } from '@/lib/rate-limit'
import { withTimeout, validateRAGQuery, TimeoutError } from '@/lib/rag/utils'
import type { DSAPattern } from '@/lib/types/dsa-patterns'
import type { CompanyId } from '@/lib/data/company-questions/types'

// Rate limit: 30 requests per minute for RAG v2 operations
const ragV2RateLimit = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 30,
  prefix: 'rl:rag-v2'
})

// Stricter limit for embedding generation (expensive operation)
const embeddingRateLimit = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 20,
  prefix: 'rl:rag-embedding'
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
 *   - generate-embedding: Generate embedding for text
 *   - seed-knowledge-base: Seed the knowledge base (admin)
 *   - health: Check RAG system health
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    // Apply rate limiting based on action
    const isEmbeddingAction = action === 'generate-embedding'
    const rateLimitResponse = await (isEmbeddingAction ? embeddingRateLimit : ragV2RateLimit)(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Actions that require authentication
    const authRequired = [
      'get-user-performance',
      'get-recommendations',
      'build-context',
      'seed-knowledge-base',
    ]

    let userId: string | undefined

    if (authRequired.includes(action)) {
      const authResult = await verifyAuth(request)
      if (!authResult.authenticated || !authResult.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = authResult.userId
    }

    switch (action) {
      case 'retrieve':
        return handleRetrieve(params)

      case 'build-context':
        return handleBuildContext(params, userId!)

      case 'get-pattern-knowledge':
        return handleGetPatternKnowledge(params)

      case 'get-company-knowledge':
        return handleGetCompanyKnowledge(params)

      case 'get-user-performance':
        return handleGetUserPerformance(userId!)

      case 'get-recommendations':
        return handleGetRecommendations(userId!)

      case 'generate-embedding':
        return handleGenerateEmbedding(params)

      case 'seed-knowledge-base':
        return handleSeedKnowledgeBase(params, userId!)

      case 'health':
        return handleHealthCheck()

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[RAG API v2] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'RAG operation failed' },
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
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    )
  }

  const sanitizedQuery = validation.sanitized!
  const retriever = getAdvancedRetriever()
  const startTime = Date.now()

  const options: AdvancedRetrievalOptions = {
    query: sanitizedQuery,
    limit: Math.min(params.limit || 10, 50), // Cap at 50 results
    minSimilarity: params.minSimilarity || 0.3,
    types: params.types as AdvancedRetrievalOptions['types'],
    patterns: params.patterns,
    companies: params.companies,
    difficulty: params.difficulty as ('easy' | 'medium' | 'hard')[],
    enableQueryExpansion: params.enableQueryExpansion ?? true,
    enableReranking: params.enableReranking ?? true,
  }

  try {
    // Wrap retrieval in timeout (30 seconds max)
    const { results, analytics } = await withTimeout(
      retriever.retrieve(options),
      30000,
      'RAG retrieval'
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
        { error: 'Request timed out. Please try a simpler query.' },
        { status: 504 }
      )
    }
    throw error
  }
}

/**
 * Handle context building
 */
async function handleBuildContext(params: {
  contextType: 'roadmap' | 'hint' | 'interview-prep' | 'feedback' | 'query'
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
}, userId: string) {
  const { contextType } = params

  if (!contextType) {
    return NextResponse.json(
      { error: 'Context type is required' },
      { status: 400 }
    )
  }

  const contextBuilder = getContextBuilder()
  let context

  switch (contextType) {
    case 'roadmap':
      if (!params.targetCompany) {
        return NextResponse.json(
          { error: 'Target company is required for roadmap context' },
          { status: 400 }
        )
      }
      context = await contextBuilder.buildRoadmapContext({
        targetCompany: params.targetCompany,
        experienceLevel: (params.experienceLevel || 'intermediate') as 'intern' | 'beginner' | 'intermediate' | 'advanced',
        daysRemaining: params.daysRemaining || 30,
        patternFamiliarity: params.patternFamiliarity || [],
        hoursPerDay: params.hoursPerDay || 2,
        userId,
      })
      break

    case 'hint':
      if (!params.problemText) {
        return NextResponse.json(
          { error: 'Problem text is required for hint context' },
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

    case 'interview-prep':
      if (!params.targetCompany || !params.patterns) {
        return NextResponse.json(
          { error: 'Target company and patterns are required for interview prep context' },
          { status: 400 }
        )
      }
      context = await contextBuilder.buildInterviewPrepContext({
        company: params.targetCompany,
        patterns: params.patterns,
        difficulty: (params.difficulty || 'mixed') as 'easy' | 'medium' | 'hard' | 'mixed',
        userId,
      })
      break

    case 'feedback':
      if (!params.problemText || !params.userCode || !params.testResults) {
        return NextResponse.json(
          { error: 'Problem text, user code, and test results are required for feedback context' },
          { status: 400 }
        )
      }
      context = await contextBuilder.buildFeedbackContext({
        problemText: params.problemText,
        userCode: params.userCode,
        testResults: params.testResults,
        pattern: params.problemPattern,
        difficulty: params.difficulty as 'easy' | 'medium' | 'hard',
      })
      break

    case 'query':
      if (!params.query) {
        return NextResponse.json(
          { error: 'Query is required for query context' },
          { status: 400 }
        )
      }
      context = await contextBuilder.buildQueryContext(params.query, {
        patterns: params.patterns,
        companies: params.targetCompany ? [params.targetCompany] : undefined,
      })
      break

    default:
      return NextResponse.json(
        { error: `Unknown context type: ${contextType}` },
        { status: 400 }
      )
  }

  return NextResponse.json({ context })
}

/**
 * Handle get pattern knowledge
 */
async function handleGetPatternKnowledge(params: {
  pattern?: DSAPattern
  patterns?: DSAPattern[]
  format?: 'full' | 'document' | 'summary'
}) {
  const { pattern, patterns: patternList, format = 'full' } = params

  if (!pattern && !patternList) {
    return NextResponse.json(
      { error: 'Pattern or patterns array is required' },
      { status: 400 }
    )
  }

  const patternsToFetch = patternList || (pattern ? [pattern] : [])
  const results = []

  for (const p of patternsToFetch) {
    const knowledge = getPatternKnowledge(p)
    if (knowledge) {
      if (format === 'document') {
        results.push({
          pattern: p,
          document: patternKnowledgeToDocument(knowledge),
        })
      } else if (format === 'summary') {
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
  format?: 'full' | 'document' | 'summary'
}) {
  const { company, companies: companyList, format = 'full' } = params

  if (!company && !companyList) {
    return NextResponse.json(
      { error: 'Company or companies array is required' },
      { status: 400 }
    )
  }

  const companiesToFetch = companyList || (company ? [company] : [])
  const results = []

  for (const c of companiesToFetch) {
    const knowledge = getCompanyInterviewKnowledge(c)
    if (knowledge) {
      if (format === 'document') {
        results.push({
          company: c,
          document: companyKnowledgeToDocument(knowledge),
        })
      } else if (format === 'summary') {
        results.push({
          company: c,
          companyName: knowledge.companyName,
          interviewStyle: knowledge.interviewStyle.description,
          pace: knowledge.interviewStyle.pace,
          topPatterns: knowledge.topPatterns.slice(0, 5).map(p => p.pattern),
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
async function handleGenerateEmbedding(params: {
  text?: string
  texts?: string[]
}) {
  const { text, texts } = params

  if (!text && !texts) {
    return NextResponse.json(
      { error: 'Text or texts array is required' },
      { status: 400 }
    )
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
  categories?: ('dsa-patterns' | 'company-knowledge' | 'interview-tips')[]
}, userId: string) {
  // In production, you'd want to check if user is admin
  console.log(`[RAG API] Knowledge base seeding requested by user: ${userId}`)

  const progress = await seedKnowledgeBase({
    force: params.force || false,
    categories: params.categories,
  })

  return NextResponse.json({
    progress,
    message: progress.status === 'completed'
      ? `Successfully seeded ${progress.successfulDocuments} documents`
      : progress.status === 'failed'
        ? 'Seeding failed'
        : 'Already seeded (use force=true to re-seed)',
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
      status: 'healthy',
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
          cacheHitRate: Math.round(metrics.cacheHitRate * 100) + '%',
        },
      },
      responseTimeMs: Date.now() - startTime,
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTimeMs: Date.now() - startTime,
    }, { status: 500 })
  }
}

/**
 * GET /api/rag/v2 - Quick health check
 */
export async function GET() {
  return handleHealthCheck()
}

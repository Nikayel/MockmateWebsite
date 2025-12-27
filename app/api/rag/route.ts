import { NextRequest, NextResponse } from "next/server"
import {
  generateTextEmbedding,
  getSimilarProblems,
  getRelevantHints,
  getSimilarSolutions,
  embedAndStoreSolution,
  embedAndStoreOnboarding,
  getRecommendedNextProblems,
  getRecommendedScenarios,
  getUserPerformanceProfile,
  findSimilarSessions,
  vectorizeSessionMetrics,
} from "@/lib/rag"
import { buildHintContext } from "@/lib/rag/context-builder"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import { advancedRetrieve } from "@/lib/rag/retrieval/advanced-retrieval"
import { rateLimit } from "@/lib/rate-limit"
import { withTimeout, validateProblemText, validateUserCode, TimeoutError } from "@/lib/rag/utils"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

/**
 * RAG API Endpoint
 *
 * Supports multiple RAG operations:
 * - GET hints: Get contextual hints for current problem
 * - GET similar: Find similar problems the user has solved
 * - GET recommendations: Get recommended next problems
 * - POST solution: Store a solution for future retrieval
 */

// Rate limit: 30 requests per minute for RAG operations
const ragRateLimit = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 30,
  prefix: 'rl:rag'
})

// Higher limit for storing operations (less compute intensive)
const ragStorageRateLimit = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 50,
  prefix: 'rl:rag-store'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    // Apply appropriate rate limit based on action
    const isStorageAction = ['store-solution', 'store-onboarding'].includes(action)
    const rateLimitResponse = await (isStorageAction ? ragStorageRateLimit : ragRateLimit)(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    switch (action) {
      case 'get-hints':
        return handleGetHints(params)

      case 'get-similar-problems':
        return handleGetSimilarProblems(params)

      case 'get-similar-solutions':
        return handleGetSimilarSolutions(params)

      case 'get-recommendations':
        return handleGetRecommendations(params)

      case 'store-solution':
        return handleStoreSolution(params)

      case 'get-learning-path':
        return handleGetLearningPath(params)

      case 'get-next-problems':
        return handleGetNextProblems(params)

      case 'store-onboarding':
        return handleStoreOnboarding(params)

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("RAG API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RAG operation failed" },
      { status: 500 }
    )
  }
}

/**
 * Get contextual hints based on problem and user's current code
 * Enhanced with RAG v2 context builder and advanced retrieval
 */
async function handleGetHints(params: {
  problemText: string
  problemTitle: string
  userCode?: string
  difficulty?: string
  problemType?: string
  problemPattern?: string
  userId?: string
  limit?: number
}) {
  const { problemText, problemTitle, userCode = '', difficulty, problemType, problemPattern, userId, limit = 3 } = params

  if (!problemText) {
    return NextResponse.json({ error: "problemText is required" }, { status: 400 })
  }

  // Generate hints based on problem analysis (basic rule-based hints)
  const basicHints = await generateContextualHints(
    problemText,
    problemTitle,
    userCode,
    difficulty || 'medium',
    problemType || 'dsa'
  )

  // Also try to get hints from stored embeddings (legacy)
  const storedHints = await getRelevantHints(problemText, userCode, { limit })

  // NEW: Use RAG v2 context builder for enhanced hints
  let ragEnhancedHints: { level: number; hint: string; source: string }[] = []
  let patternInsights: { pattern: string; keyTechniques: string[]; commonMistakes: string[] } | null = null

  try {
    // Get pattern-specific knowledge if pattern is known
    if (problemPattern) {
      const patternKnowledge = getPatternKnowledge(problemPattern as DSAPattern)
      if (patternKnowledge) {
        patternInsights = {
          pattern: patternKnowledge.displayName,
          keyTechniques: patternKnowledge.keyInsights,
          commonMistakes: patternKnowledge.commonMistakes.slice(0, 3),
        }

        // Add pattern-specific hints
        ragEnhancedHints.push({
          level: 1,
          hint: `This is a ${patternKnowledge.displayName} problem. ${patternKnowledge.whenToUse[0]}`,
          source: 'pattern-knowledge',
        })

        if (patternKnowledge.keyInsights.length > 0) {
          ragEnhancedHints.push({
            level: 2,
            hint: patternKnowledge.keyInsights[0],
            source: 'pattern-knowledge',
          })
        }
      }
    }

    // Build full hint context from RAG
    const hintContext = await buildHintContext({
      problemText,
      problemPattern: problemPattern as DSAPattern,
      userCode,
      userId,
    })

    // Extract relevant hints from retrieved documents
    if (hintContext.retrievedDocs.length > 0) {
      const topDocs = hintContext.retrievedDocs.slice(0, 2)
      for (const doc of topDocs) {
        if (doc.text && doc.text.length > 20) {
          ragEnhancedHints.push({
            level: 3,
            hint: doc.text.substring(0, 300) + (doc.text.length > 300 ? '...' : ''),
            source: 'rag-retrieval',
          })
        }
      }
    }
  } catch (error) {
    console.error('[RAG API] Enhanced hints error:', error)
    // Continue with basic hints if RAG fails
  }

  return NextResponse.json({
    contextualHints: basicHints,
    relatedHints: storedHints.map(h => ({
      text: h.text,
      similarity: h.similarity,
      level: h.metadata?.tags?.find((t: string) => t.startsWith('level-'))?.replace('level-', '') || '1',
    })),
    ragEnhancedHints,
    patternInsights,
    metadata: {
      ragEnabled: true,
      totalHints: basicHints.length + storedHints.length + ragEnhancedHints.length,
    },
  })
}

/**
 * Generate contextual hints based on problem analysis
 */
function generateContextualHints(
  problemText: string,
  problemTitle: string,
  userCode: string,
  difficulty: string,
  problemType: string
): { level: number; hint: string }[] {
  const hints: { level: number; hint: string }[] = []
  const textLower = problemText.toLowerCase()
  const codeLower = userCode.toLowerCase()

  // System design specific hints
  if (problemType === 'system-design') {
    // Level 1: Requirements gathering
    if (!textLower.includes('requirement') && !codeLower.includes('requirement')) {
      hints.push({
        level: 1,
        hint: "Start by clarifying requirements. Ask about scale (users, requests per second), functional requirements, and non-functional requirements (latency, availability).",
      })
    }
    
    // Level 2: Architecture components
    if (!codeLower.includes('component') && !codeLower.includes('service') && !codeLower.includes('api')) {
      hints.push({
        level: 2,
        hint: "Think about the major components: API layer, application servers, databases, caches, message queues. How do they communicate?",
      })
    }
    
    // Level 3: Scalability
    if (!codeLower.includes('scale') && !codeLower.includes('shard') && !codeLower.includes('load balancer')) {
      hints.push({
        level: 3,
        hint: "Consider scalability: How would you handle 10x traffic? Think about horizontal scaling, load balancing, database sharding, and caching strategies.",
      })
    }
    
    // Ensure at least one system design hint
    if (hints.length === 0) {
      hints.push({
        level: 1,
        hint: "For system design, start with requirements clarification, then high-level architecture, then deep dive into specific components.",
      })
    }
    
    return hints
  }

  // Level 1: Gentle nudges based on problem type
  if (textLower.includes('two sum') || textLower.includes('pair') || textLower.includes('sum')) {
    hints.push({
      level: 1,
      hint: "Think about what data structure would let you look up values quickly. What's the complement you're looking for?",
    })
  }

  if (textLower.includes('palindrome')) {
    hints.push({
      level: 1,
      hint: "Consider comparing characters from the outside in. What makes a palindrome special?",
    })
  }

  if (textLower.includes('linked list')) {
    hints.push({
      level: 1,
      hint: "Think about what pointers you need. Would a slow/fast pointer approach help here?",
    })
  }

  if (textLower.includes('binary search') || textLower.includes('sorted')) {
    hints.push({
      level: 1,
      hint: "When data is sorted, you can eliminate half the search space at each step.",
    })
  }

  if (textLower.includes('subarray') || textLower.includes('window')) {
    hints.push({
      level: 1,
      hint: "Consider the sliding window technique. What expands and contracts the window?",
    })
  }

  // Level 2: Pattern-based hints based on user's code
  if (userCode.length > 50) {
    if (codeLower.includes('for') && codeLower.includes('for')) {
      hints.push({
        level: 2,
        hint: "You have nested loops. Could a hash map reduce one of these iterations from O(n) to O(1)?",
      })
    }

    if (!codeLower.includes('if') && !codeLower.includes('return')) {
      hints.push({
        level: 2,
        hint: "Consider edge cases. What happens with empty input? Null values? Single elements?",
      })
    }

    if (codeLower.includes('array') && !codeLower.includes('map') && !codeLower.includes('set')) {
      hints.push({
        level: 2,
        hint: "Arrays are great, but sometimes a Map or Set can improve lookup performance.",
      })
    }
  }

  // Level 3: More direct hints for when stuck
  if (difficulty === 'hard' || difficulty === 'medium') {
    if (textLower.includes('optimal') || textLower.includes('efficient')) {
      hints.push({
        level: 3,
        hint: `For ${problemType} problems like this, the optimal solution often uses ${textLower.includes('sum') ? 'a hash map for O(1) lookups' :
            textLower.includes('sort') ? 'sorting first, then two pointers' :
              textLower.includes('path') ? 'dynamic programming or BFS' :
                'a combination of the right data structure and algorithm'
          }.`,
      })
    }
  }

  // Ensure we have at least one hint
  if (hints.length === 0) {
    hints.push({
      level: 1,
      hint: "Start by breaking down the problem. What's the input? What's the expected output? What are the constraints?",
    })
  }

  return hints
}

/**
 * Find similar problems the user might have seen before
 */
async function handleGetSimilarProblems(params: {
  problemText: string
  problemId?: string
  difficulty?: string
  limit?: number
}) {
  const { problemText, problemId, difficulty, limit = 5 } = params

  if (!problemText) {
    return NextResponse.json({ error: "problemText is required" }, { status: 400 })
  }

  const similar = await getSimilarProblems(problemText, {
    limit,
    excludeProblemId: problemId,
    difficulty,
  })

  return NextResponse.json({
    similarProblems: similar.map(p => ({
      text: p.text.substring(0, 200) + '...', // Truncate for preview
      similarity: Math.round(p.similarity * 100),
      metadata: p.metadata,
    })),
  })
}

/**
 * Find similar solutions from user's history
 */
async function handleGetSimilarSolutions(params: {
  userId: string
  problemText: string
  limit?: number
  problemType?: string // Filter by problem type
}) {
  const { userId, problemText, limit = 5, problemType } = params

  if (!userId || !problemText) {
    return NextResponse.json(
      { error: "userId and problemText are required" },
      { status: 400 }
    )
  }

  const similar = await getSimilarSolutions(problemText, userId, { limit, problemType })

  return NextResponse.json({
    similarSolutions: similar.map(s => ({
      code: s.text,
      similarity: Math.round(s.similarity * 100),
      metadata: s.metadata,
    })),
    message: similar.length > 0
      ? `Found ${similar.length} similar ${problemType === 'system-design' ? 'design' : 'problem'}${similar.length > 1 ? 's' : ''} you've worked on before!`
      : `No similar past ${problemType === 'system-design' ? 'designs' : 'solutions'} found. This is a new type of problem for you!`,
  })
}

/**
 * Get recommended next problems based on user profile
 */
async function handleGetRecommendations(params: {
  userId: string
  availableScenarios: Array<{ id: string; type: string; difficulty: string; title: string }>
}) {
  const { userId, availableScenarios } = params

  if (!userId || !availableScenarios) {
    return NextResponse.json(
      { error: "userId and availableScenarios are required" },
      { status: 400 }
    )
  }

  // Get user's performance profile
  const profile = await getUserPerformanceProfile(userId)

  // Get recommendations
  const recommendations = await getRecommendedScenarios(userId, availableScenarios)

  return NextResponse.json({
    recommendations: recommendations.map(r => ({
      ...r,
      scenario: availableScenarios.find(s => s.id === r.id),
    })),
    profile: profile ? {
      totalSessions: profile.totalSessions,
      averageScore: Math.round(profile.averageScore),
      strengthAreas: profile.strengthAreas,
      weaknessAreas: profile.weaknessAreas,
      recentTrend: profile.recentTrend,
    } : null,
  })
}

/**
 * Store a solution for future retrieval
 */
async function handleStoreSolution(params: {
  userId: string
  problemId: string
  problemTitle: string
  solutionCode: string
  language: string
  passed: boolean
  score: number
  problemType?: string // 'dsa' | 'bugfix' | 'system-design' | etc.
}) {
  const { userId, problemId, problemTitle, solutionCode, language, passed, score, problemType } = params

  if (!userId || !problemId || !solutionCode) {
    return NextResponse.json(
      { error: "userId, problemId, and solutionCode are required" },
      { status: 400 }
    )
  }

  // For system design, solutionCode might be empty (chat-only submission)
  // Still store it if there's any content or if it's explicitly a system design problem
  const isSystemDesign = problemType === 'system-design'
  if (!isSystemDesign && !solutionCode.trim()) {
    return NextResponse.json(
      { error: "solutionCode cannot be empty for non-system-design problems" },
      { status: 400 }
    )
  }

  const embeddingId = await embedAndStoreSolution(userId, problemId, solutionCode, {
    problemTitle,
    language: isSystemDesign ? 'notes' : language, // System design uses notes, not code
    passed,
    score,
    problemType,
  })

  return NextResponse.json({
    success: true,
    embeddingId,
    message: isSystemDesign 
      ? "Design notes stored for future reference"
      : "Solution stored for future reference",
  })
}

/**
 * Get personalized learning path based on user's history
 */
async function handleGetLearningPath(params: {
  userId: string
  targetSkills?: string[]
}) {
  const { userId, targetSkills = [] } = params

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const profile = await getUserPerformanceProfile(userId)

  if (!profile) {
    return NextResponse.json({
      learningPath: [
        {
          step: 1,
          focus: "Start with fundamentals",
          recommendation: "Begin with easy array and string problems to build confidence",
          estimatedProblems: 5,
        },
        {
          step: 2,
          focus: "Learn data structures",
          recommendation: "Practice with hash maps, sets, and linked lists",
          estimatedProblems: 10,
        },
        {
          step: 3,
          focus: "Algorithm patterns",
          recommendation: "Focus on two-pointer and sliding window techniques",
          estimatedProblems: 10,
        },
      ],
      message: "Welcome! Here's a recommended path to get started.",
    })
  }

  const learningPath = []
  let step = 1

  // Address weaknesses first
  for (const weakness of profile.weaknessAreas.slice(0, 2)) {
    learningPath.push({
      step: step++,
      focus: `Improve ${weakness}`,
      recommendation: `Practice ${weakness} problems at easy-medium difficulty to build skills`,
      estimatedProblems: 5,
      currentScore: profile.scoresByType[weakness]?.slice(-1)[0] || 0,
    })
  }

  // Build on strengths if improving
  if (profile.recentTrend === 'improving') {
    for (const strength of profile.strengthAreas.slice(0, 1)) {
      learningPath.push({
        step: step++,
        focus: `Challenge yourself in ${strength}`,
        recommendation: `You're doing well! Try harder ${strength} problems to push further`,
        estimatedProblems: 3,
        currentScore: profile.scoresByType[strength]?.slice(-1)[0] || 0,
      })
    }
  }

  // Target skills if provided
  for (const skill of targetSkills.slice(0, 2)) {
    if (!profile.strengthAreas.includes(skill) && !profile.weaknessAreas.includes(skill)) {
      learningPath.push({
        step: step++,
        focus: `Learn ${skill}`,
        recommendation: `New skill! Start with easy ${skill} problems to learn the patterns`,
        estimatedProblems: 5,
      })
    }
  }

  return NextResponse.json({
    learningPath,
    profile: {
      totalSessions: profile.totalSessions,
      averageScore: Math.round(profile.averageScore),
      recentTrend: profile.recentTrend,
    },
    message: profile.recentTrend === 'improving'
      ? "Great progress! Keep up the momentum."
      : profile.recentTrend === 'declining'
        ? "Let's get back on track with some fundamentals."
        : "Steady progress. Time to push to the next level!",
  })
}

async function handleGetNextProblems(params: {
  userId: string
  currentProblemText: string
  currentProblemId?: string
}) {
  const { userId, currentProblemText, currentProblemId } = params

  if (!userId || !currentProblemText) {
    return NextResponse.json(
      { error: "userId and currentProblemText are required" },
      { status: 400 }
    )
  }

  const recommendations = await getRecommendedNextProblems(
    userId,
    currentProblemText,
    currentProblemId
  )

  return NextResponse.json({
    recommendations: recommendations.map(problem => ({
      problemId: problem.metadata?.problemId,
      title: problem.metadata?.title || 'Unknown Problem',
      text: problem.text.substring(0, 200) + '...',
      similarity: Math.round(problem.similarity * 100),
      difficulty: problem.metadata?.difficulty || 'medium',
      type: problem.metadata?.type || 'dsa',
    })),
    message: recommendations.length > 0
      ? `Found ${recommendations.length} similar problems you haven't solved yet!`
      : "No similar unsolved problems found. Try something new!",
  })
}

/**
 * Store onboarding data as an embedding
 */
async function handleStoreOnboarding(params: {
  userId: string
  role: string
  goal: string
}) {
  const { userId, role, goal } = params

  if (!userId || !role || !goal) {
    return NextResponse.json(
      { error: "userId, role, and goal are required" },
      { status: 400 }
    )
  }

  const embeddingId = await embedAndStoreOnboarding(userId, role, goal)

  return NextResponse.json({
    success: true,
    embeddingId,
    message: "Onboarding data stored for personalized recommendations",
  })
}

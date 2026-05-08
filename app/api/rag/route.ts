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
import {
  getDebuggingKnowledge,
  type BugCategory,
} from "@/lib/rag/knowledge-base/debugging-knowledge"
import { advancedRetrieve } from "@/lib/rag/retrieval/advanced-retrieval"
import { rateLimit } from "@/lib/rate-limit"
import { withTimeout, validateProblemText, validateUserCode, TimeoutError } from "@/lib/rag/utils"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { getUserIdFromRequest } from "@/lib/auth-server"
import { logger } from "@/lib/logger"

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
  prefix: "rl:rag",
})

// Higher limit for storing operations (less compute intensive)
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

    // Apply appropriate rate limit based on action
    const isStorageAction = ["store-solution", "store-onboarding"].includes(action)
    const rateLimitResponse = await (isStorageAction ? ragStorageRateLimit : ragRateLimit)(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // SECURITY: Actions that require authentication
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
      const verifiedUserId = await getUserIdFromRequest(request)
      if (!verifiedUserId) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
      // Override client-provided userId with verified one to prevent spoofing
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

/**
 * Get contextual hints based on problem and user's current code
 * Enhanced with RAG v2 context builder and advanced retrieval
 * Supports DSA, system-design, and bugfix problem types
 */
async function handleGetHints(params: {
  problemText: string
  problemTitle: string
  userCode?: string
  difficulty?: string
  problemType?: string
  problemPattern?: string
  bugCategory?: string // Bug category for bugfix problems (e.g., 'off-by-one', 'null-pointer')
  userId?: string
  limit?: number
}) {
  const {
    problemText,
    problemTitle,
    userCode = "",
    difficulty,
    problemType,
    problemPattern,
    bugCategory,
    userId,
    limit = 3,
  } = params

  if (!problemText) {
    return NextResponse.json({ error: "problemText is required" }, { status: 400 })
  }

  // Generate hints based on problem analysis (basic rule-based hints)
  const basicHints = generateContextualHints(
    problemText,
    problemTitle,
    userCode,
    difficulty || "medium",
    problemType || "dsa",
    bugCategory
  )

  // Also try to get hints from stored embeddings (legacy)
  const storedHints = await getRelevantHints(problemText, userCode, { limit })

  // NEW: Use RAG v2 context builder for enhanced hints
  const ragEnhancedHints: { level: number; hint: string; source: string }[] = []
  let patternInsights: {
    pattern: string
    keyTechniques: string[]
    commonMistakes: string[]
  } | null = null
  let debuggingInsights: { bugType: string; commonCauses: string[]; redFlags: string[] } | null =
    null

  try {
    // Get debugging-specific knowledge if this is a bugfix problem
    if (problemType === "bugfix" && bugCategory) {
      const debugKnowledge = getDebuggingKnowledge(bugCategory as BugCategory)
      if (debugKnowledge) {
        debuggingInsights = {
          bugType: debugKnowledge.displayName,
          commonCauses: debugKnowledge.commonCauses.slice(0, 3),
          redFlags: debugKnowledge.redFlags.slice(0, 3),
        }

        // Add debugging-specific hints from knowledge base
        ragEnhancedHints.push({
          level: 1,
          hint: `This appears to be a ${debugKnowledge.displayName} bug. ${debugKnowledge.description}`,
          source: "debugging-knowledge",
        })

        if (debugKnowledge.debuggingApproach.length > 0) {
          ragEnhancedHints.push({
            level: 2,
            hint: `Debugging approach: ${debugKnowledge.debuggingApproach[0]}`,
            source: "debugging-knowledge",
          })
        }

        if (debugKnowledge.redFlags.length > 0) {
          ragEnhancedHints.push({
            level: 2,
            hint: `Watch for red flags: ${debugKnowledge.redFlags.slice(0, 2).join("; ")}`,
            source: "debugging-knowledge",
          })
        }

        if (debugKnowledge.fixStrategies.length > 0) {
          ragEnhancedHints.push({
            level: 3,
            hint: `Fix strategy: ${debugKnowledge.fixStrategies[0]}`,
            source: "debugging-knowledge",
          })
        }
      }
    }

    // Get pattern-specific knowledge if pattern is known (for DSA problems)
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
          source: "pattern-knowledge",
        })

        if (patternKnowledge.keyInsights.length > 0) {
          ragEnhancedHints.push({
            level: 2,
            hint: patternKnowledge.keyInsights[0],
            source: "pattern-knowledge",
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
            hint: doc.text.substring(0, 300) + (doc.text.length > 300 ? "..." : ""),
            source: "rag-retrieval",
          })
        }
      }
    }
  } catch (error) {
    logger.warn("[RAG API] Enhanced hints failed; falling back to basic hints", { error })
    // Continue with basic hints if RAG fails
  }

  return NextResponse.json({
    contextualHints: basicHints,
    relatedHints: storedHints.map((h) => ({
      text: h.text,
      similarity: h.similarity,
      level:
        h.metadata?.tags?.find((t: string) => t.startsWith("level-"))?.replace("level-", "") || "1",
    })),
    ragEnhancedHints,
    patternInsights,
    debuggingInsights, // Debugging knowledge for bugfix problems
    metadata: {
      ragEnabled: true,
      problemType: problemType || "dsa",
      totalHints: basicHints.length + storedHints.length + ragEnhancedHints.length,
    },
  })
}

/**
 * Generate contextual hints based on problem analysis
 * Supports DSA, system-design, and bugfix problem types
 */
function generateContextualHints(
  problemText: string,
  problemTitle: string,
  userCode: string,
  difficulty: string,
  problemType: string,
  bugCategory?: string
): { level: number; hint: string }[] {
  const hints: { level: number; hint: string }[] = []
  const textLower = problemText.toLowerCase()
  const codeLower = userCode.toLowerCase()

  // Bugfix specific hints
  if (problemType === "bugfix") {
    // Level 1: General debugging approach
    hints.push({
      level: 1,
      hint: "Start by understanding what the code is supposed to do. Read the expected behavior carefully and compare it with the actual output.",
    })

    // Pattern-based hints for common bug types
    if (
      textLower.includes("off-by-one") ||
      textLower.includes("boundary") ||
      textLower.includes("index")
    ) {
      hints.push({
        level: 2,
        hint: "Check array/loop boundaries carefully. Are you starting at 0 or 1? Is the condition < or <=? Off-by-one errors often hide in loop conditions and array indices.",
      })
    }

    if (
      textLower.includes("null") ||
      textLower.includes("undefined") ||
      textLower.includes("reference")
    ) {
      hints.push({
        level: 2,
        hint: "Look for places where variables might be null or undefined. Check function return values and object property access. Add defensive null checks where needed.",
      })
    }

    if (
      textLower.includes("type") ||
      textLower.includes("coercion") ||
      textLower.includes("conversion")
    ) {
      hints.push({
        level: 2,
        hint: "Watch for type coercion issues. Are you comparing with == instead of ===? Is a string being treated as a number? Check implicit type conversions.",
      })
    }

    if (
      textLower.includes("async") ||
      textLower.includes("promise") ||
      textLower.includes("callback")
    ) {
      hints.push({
        level: 2,
        hint: "Async bugs are tricky. Check if you're missing await keywords, handling promise rejections, or dealing with race conditions.",
      })
    }

    if (
      textLower.includes("loop") ||
      textLower.includes("infinite") ||
      textLower.includes("recursion")
    ) {
      hints.push({
        level: 2,
        hint: "Check your loop termination conditions and recursive base cases. Make sure variables are being updated correctly inside loops.",
      })
    }

    // Level 3: More direct debugging hints based on user code analysis
    if (userCode.length > 50) {
      if (
        codeLower.includes("for") &&
        !codeLower.includes("break") &&
        !codeLower.includes("return")
      ) {
        hints.push({
          level: 3,
          hint: "Your loop doesn't have an early exit. Check if it might run longer than expected or miss a termination condition.",
        })
      }

      if (codeLower.includes("array") || codeLower.includes("[")) {
        hints.push({
          level: 3,
          hint: "When working with arrays, verify: 1) Index is within bounds, 2) Empty array is handled, 3) Single element case works, 4) Loop bounds are correct.",
        })
      }
    }

    // Ensure at least one bugfix hint
    if (hints.length === 1) {
      hints.push({
        level: 2,
        hint: "Try adding console.log statements to trace variable values. Compare what you expect vs what actually happens at each step.",
      })
    }

    return hints
  }

  // System design specific hints
  if (problemType === "system-design") {
    // Level 1: Requirements gathering
    if (!textLower.includes("requirement") && !codeLower.includes("requirement")) {
      hints.push({
        level: 1,
        hint: "Start by clarifying requirements. Ask about scale (users, requests per second), functional requirements, and non-functional requirements (latency, availability).",
      })
    }

    // Level 2: Architecture components
    if (
      !codeLower.includes("component") &&
      !codeLower.includes("service") &&
      !codeLower.includes("api")
    ) {
      hints.push({
        level: 2,
        hint: "Think about the major components: API layer, application servers, databases, caches, message queues. How do they communicate?",
      })
    }

    // Level 3: Scalability
    if (
      !codeLower.includes("scale") &&
      !codeLower.includes("shard") &&
      !codeLower.includes("load balancer")
    ) {
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
  if (textLower.includes("two sum") || textLower.includes("pair") || textLower.includes("sum")) {
    hints.push({
      level: 1,
      hint: "Think about what data structure would let you look up values quickly. What's the complement you're looking for?",
    })
  }

  if (textLower.includes("palindrome")) {
    hints.push({
      level: 1,
      hint: "Consider comparing characters from the outside in. What makes a palindrome special?",
    })
  }

  if (textLower.includes("linked list")) {
    hints.push({
      level: 1,
      hint: "Think about what pointers you need. Would a slow/fast pointer approach help here?",
    })
  }

  if (textLower.includes("binary search") || textLower.includes("sorted")) {
    hints.push({
      level: 1,
      hint: "When data is sorted, you can eliminate half the search space at each step.",
    })
  }

  if (textLower.includes("subarray") || textLower.includes("window")) {
    hints.push({
      level: 1,
      hint: "Consider the sliding window technique. What expands and contracts the window?",
    })
  }

  // Level 2: Pattern-based hints based on user's code
  if (userCode.length > 50) {
    if (codeLower.includes("for") && codeLower.includes("for")) {
      hints.push({
        level: 2,
        hint: "You have nested loops. Could a hash map reduce one of these iterations from O(n) to O(1)?",
      })
    }

    if (!codeLower.includes("if") && !codeLower.includes("return")) {
      hints.push({
        level: 2,
        hint: "Consider edge cases. What happens with empty input? Null values? Single elements?",
      })
    }

    if (codeLower.includes("array") && !codeLower.includes("map") && !codeLower.includes("set")) {
      hints.push({
        level: 2,
        hint: "Arrays are great, but sometimes a Map or Set can improve lookup performance.",
      })
    }
  }

  // Level 3: More direct hints for when stuck
  if (difficulty === "hard" || difficulty === "medium") {
    if (textLower.includes("optimal") || textLower.includes("efficient")) {
      hints.push({
        level: 3,
        hint: `For ${problemType} problems like this, the optimal solution often uses ${
          textLower.includes("sum")
            ? "a hash map for O(1) lookups"
            : textLower.includes("sort")
              ? "sorting first, then two pointers"
              : textLower.includes("path")
                ? "dynamic programming or BFS"
                : "a combination of the right data structure and algorithm"
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
    similarProblems: similar.map((p) => ({
      text: p.text.substring(0, 200) + "...", // Truncate for preview
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
    return NextResponse.json({ error: "userId and problemText are required" }, { status: 400 })
  }

  const similar = await getSimilarSolutions(problemText, userId, { limit, problemType })

  return NextResponse.json({
    similarSolutions: similar.map((s) => ({
      code: s.text,
      similarity: Math.round(s.similarity * 100),
      // SECURITY: Only expose safe metadata fields, exclude userId and internal data
      metadata: {
        problemId: s.metadata?.problemId,
        problemTitle: s.metadata?.problemTitle,
        language: s.metadata?.language,
        passed: s.metadata?.passed,
        score: s.metadata?.score,
        problemType: s.metadata?.problemType,
        tags: s.metadata?.tags,
      },
    })),
    message:
      similar.length > 0
        ? `Found ${similar.length} similar ${problemType === "system-design" ? "design" : "problem"}${similar.length > 1 ? "s" : ""} you've worked on before!`
        : `No similar past ${problemType === "system-design" ? "designs" : "solutions"} found. This is a new type of problem for you!`,
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
    recommendations: recommendations.map((r) => ({
      ...r,
      scenario: availableScenarios.find((s) => s.id === r.id),
    })),
    profile: profile
      ? {
          totalSessions: profile.totalSessions,
          averageScore: Math.round(profile.averageScore),
          strengthAreas: profile.strengthAreas,
          weaknessAreas: profile.weaknessAreas,
          recentTrend: profile.recentTrend,
        }
      : null,
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
  const { userId, problemId, problemTitle, solutionCode, language, passed, score, problemType } =
    params

  if (!userId || !problemId || !solutionCode) {
    return NextResponse.json(
      { error: "userId, problemId, and solutionCode are required" },
      { status: 400 }
    )
  }

  // For system design, solutionCode might be empty (chat-only submission)
  // Still store it if there's any content or if it's explicitly a system design problem
  const isSystemDesign = problemType === "system-design"
  if (!isSystemDesign && !solutionCode.trim()) {
    return NextResponse.json(
      { error: "solutionCode cannot be empty for non-system-design problems" },
      { status: 400 }
    )
  }

  const embeddingId = await embedAndStoreSolution(userId, problemId, solutionCode, {
    problemTitle,
    language: isSystemDesign ? "notes" : language, // System design uses notes, not code
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
async function handleGetLearningPath(params: { userId: string; targetSkills?: string[] }) {
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
  if (profile.recentTrend === "improving") {
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
    message:
      profile.recentTrend === "improving"
        ? "Great progress! Keep up the momentum."
        : profile.recentTrend === "declining"
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
    recommendations: recommendations.map((problem) => ({
      problemId: problem.metadata?.problemId,
      title: problem.metadata?.title || "Unknown Problem",
      text: problem.text.substring(0, 200) + "...",
      similarity: Math.round(problem.similarity * 100),
      difficulty: problem.metadata?.difficulty || "medium",
      type: problem.metadata?.type || "dsa",
    })),
    message:
      recommendations.length > 0
        ? `Found ${recommendations.length} similar problems you haven't solved yet!`
        : "No similar unsolved problems found. Try something new!",
  })
}

/**
 * Store onboarding data as an embedding
 */
async function handleStoreOnboarding(params: { userId: string; role: string; goal: string }) {
  const { userId, role, goal } = params

  if (!userId || !role || !goal) {
    return NextResponse.json({ error: "userId, role, and goal are required" }, { status: 400 })
  }

  const embeddingId = await embedAndStoreOnboarding(userId, role, goal)

  return NextResponse.json({
    success: true,
    embeddingId,
    message: "Onboarding data stored for personalized recommendations",
  })
}

/**
 * Record feedback for a hint
 * Used to improve RAG quality over time through user feedback loop
 */
async function handleRecordFeedback(params: {
  hintId: string
  feedbackType: "helpful" | "unhelpful"
  userId?: string
  sessionId?: string
  problemId?: string
  hintText?: string
  source?: string
}) {
  const { hintId, feedbackType, userId, sessionId, problemId, hintText, source } = params

  if (!hintId || !feedbackType) {
    return NextResponse.json({ error: "hintId and feedbackType are required" }, { status: 400 })
  }

  // Log feedback for analytics (in production, this would go to a database)
  logger.info("[RAG Feedback]", {
    hintId,
    feedbackType,
    userId: userId || "anonymous",
    sessionId,
    problemId,
    source: source || "unknown",
    timestamp: new Date().toISOString(),
  })

  // TODO: In production, store feedback in database for:
  // 1. Tracking hint quality metrics
  // 2. Adjusting retrieval weights based on feedback patterns
  // 3. Identifying low-quality hints for improvement
  // 4. A/B testing hint generation strategies

  return NextResponse.json({
    success: true,
    message: `Feedback recorded: ${feedbackType}`,
  })
}

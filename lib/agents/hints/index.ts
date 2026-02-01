/**
 * Hint Generation Module
 *
 * LLM-first hint generation with fallback to pattern-based templates.
 * Generates progressive, contextual hints based on user's code and problem.
 */

import { getContextBuilder } from "@/lib/rag/context-builder"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import { getUserPerformanceRAG } from "@/lib/rag/user-performance-rag"

import { calculateStruggleLevel, getRecommendedRevealLevel } from "./struggle-calculator"
import { generateHintId } from "./code-analyzer"
import { generateLLMHint } from "./llm-generator"
import { generatePatternHints, generateGenericHint } from "./pattern-hints"
import type {
  HintGenerationRequest,
  HintGenerationResponse,
  GeneratedHint,
  HintLevel,
} from "./types"

// Re-export types for consumers
export * from "./types"
export { calculateStruggleLevel, getRecommendedRevealLevel } from "./struggle-calculator"

/**
 * Main hint generation function
 * LLM-first with fallback to pattern templates
 */
export async function generateHints(
  request: HintGenerationRequest
): Promise<HintGenerationResponse> {
  const startTime = Date.now()
  const hints: GeneratedHint[] = []

  let ragContextUsed = false
  let userHistoryUsed = false
  let patternKnowledgeUsed = false
  let llmUsed = false

  // Calculate struggle level
  const struggleLevel = calculateStruggleLevel(request.struggleMetrics)
  const recommendedRevealLevel = getRecommendedRevealLevel(
    struggleLevel,
    request.struggleMetrics.hintsRevealed
  )

  // Determine hint category based on trigger
  const category = request.trigger === "test_failed" ? "debugging" : "approach"

  // 1. PRIMARY: Generate LLM-powered hints for multiple levels
  // Generate hints up to the recommended level (e.g., if level 3, generate 1, 2, 3)
  const levelsToGenerate: HintLevel[] = []
  for (let i = 1; i <= Math.min(recommendedRevealLevel + 1, 4); i++) {
    levelsToGenerate.push(i as HintLevel)
  }

  // Generate hints for each level (in parallel for speed)
  try {
    const llmHintPromises = levelsToGenerate.map((level) =>
      generateLLMHint({
        problemTitle: request.problemTitle,
        problemText: request.problemText,
        problemPattern: request.problemPattern,
        difficulty: request.difficulty,
        userCode: request.userCode,
        language: request.language,
        level,
        category: level <= 2 ? "conceptual" : category, // Lower levels are more conceptual
        trigger: request.trigger || "manual",
        struggleLevel,
        userId: request.userId,
        existingHints: request.existingHints,
        testFailures: request.testResults?.failingTests,
        optimalComplexity: request.optimalComplexity,
        constraints: request.constraints,
      }).catch((err) => {
        console.error(`[HintAgent] LLM hint level ${level} failed:`, err)
        return null
      })
    )

    const llmHints = await Promise.all(llmHintPromises)
    const validLLMHints = llmHints.filter((h): h is GeneratedHint => h !== null)

    if (validLLMHints.length > 0) {
      hints.push(...validLLMHints)
      llmUsed = true
    }
  } catch (error) {
    console.error("[HintAgent] LLM hint generation failed:", error)
  }

  // 2. FALLBACK: Generate pattern-based hints if LLM failed or for additional hints
  if (request.problemPattern) {
    const patternHints = generatePatternHints(request.problemPattern, recommendedRevealLevel)

    // If LLM succeeded, only add non-duplicate pattern hints
    if (llmUsed) {
      const llmTitles = hints.map((h) => h.title.toLowerCase())
      const uniquePatternHints = patternHints.filter(
        (h) =>
          !llmTitles.some(
            (t) => h.title.toLowerCase().includes(t) || t.includes(h.title.toLowerCase())
          )
      )
      hints.push(...uniquePatternHints.slice(0, 2)) // Add up to 2 supplementary hints
    } else {
      // LLM failed, use all pattern hints
      hints.push(...patternHints)
    }
    patternKnowledgeUsed = patternHints.length > 0
  }

  // 3. If still no hints, add generic hint
  if (hints.length === 0) {
    hints.push(generateGenericHint(recommendedRevealLevel))
  }

  // 4. RAG-enhanced hints (supplementary)
  try {
    const contextBuilder = getContextBuilder()
    const hintContext = await contextBuilder.buildHintContext({
      problemText: request.problemText,
      problemPattern: request.problemPattern,
      userCode: request.userCode,
      userId: request.userId,
    })

    if (hintContext.retrievedDocs.length > 0) {
      ragContextUsed = true

      // Add 1 RAG hint if relevant
      const topDoc = hintContext.retrievedDocs[0]
      if (topDoc.text && topDoc.text.length > 50 && (topDoc.finalScore || 0) > 0.7) {
        hints.push({
          id: generateHintId(),
          level: 3,
          category: "approach",
          title: "Related Insight",
          content: topDoc.text.substring(0, 300) + (topDoc.text.length > 300 ? "..." : ""),
          isBlurred: true,
          source: "rag",
          relevanceScore: topDoc.finalScore || 0.6,
          metadata: {
            relatedConcepts: topDoc.metadata?.tags as string[],
          },
        })
      }
    }
  } catch (error) {
    console.error("[HintAgent] RAG context error:", error)
  }

  // 5. User history personalization (supplementary)
  try {
    const performanceRAG = getUserPerformanceRAG()
    const profile = await performanceRAG.getPerformanceProfile(request.userId)

    if (profile && profile.totalSessions > 0) {
      userHistoryUsed = true

      // Check if this pattern is a weakness
      const patternProf = profile.patternProficiency.find(
        (p) => p.pattern === request.problemPattern
      )

      if (patternProf && patternProf.proficiencyLevel === "novice") {
        hints.push({
          id: generateHintId(),
          level: 1,
          category: "conceptual",
          title: "Personalized Tip",
          content: `Based on your history, ${request.problemPattern} problems are newer to you. Focus on understanding the core pattern before optimizing.`,
          isBlurred: true,
          source: "user-history",
          relevanceScore: 0.8,
          metadata: {
            pattern: request.problemPattern,
          },
        })
      }

      // Leverage related strengths
      if (profile.strengths.length > 0 && request.problemPattern) {
        const problemPattern = request.problemPattern
        const relatedStrength = profile.strengths.find((s) => {
          const knowledge = getPatternKnowledge(s)
          return knowledge?.relatedPatterns?.includes(problemPattern)
        })

        if (relatedStrength) {
          hints.push({
            id: generateHintId(),
            level: 2,
            category: "approach",
            title: "Build on Your Strengths",
            content: `You're strong at ${relatedStrength}. This problem uses similar concepts - think about how you'd apply those techniques here.`,
            isBlurred: true,
            source: "user-history",
            relevanceScore: 0.75,
          })
        }
      }
    }
  } catch (error) {
    console.error("[HintAgent] User history error:", error)
  }

  // 6. Test failure specific hints
  if (request.testResults && request.testResults.total > 0) {
    const passRate = request.testResults.passed / request.testResults.total

    if (passRate < 0.5 && recommendedRevealLevel >= 2) {
      hints.push({
        id: generateHintId(),
        level: 2,
        category: "debugging",
        title: "Test Analysis",
        content: `You're passing ${request.testResults.passed}/${request.testResults.total} tests. Focus on understanding what the failing cases have in common - are they edge cases, large inputs, or special values?`,
        isBlurred: true,
        source: "ai",
        relevanceScore: 0.85,
      })
    }

    if (request.testResults.failingTests && request.testResults.failingTests.length > 0) {
      hints.push({
        id: generateHintId(),
        level: 3,
        category: "debugging",
        title: "Failing Test Hint",
        content: `Look at the failing test: ${request.testResults.failingTests[0]}. Trace through your code with this input - where does the actual output diverge from expected?`,
        isBlurred: true,
        source: "ai",
        relevanceScore: 0.8,
      })
    }
  }

  // Sort hints by level then relevance
  hints.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return b.relevanceScore - a.relevanceScore
  })

  // Filter to unique hints and limit count
  const uniqueHints = hints
    .filter((hint, index, self) => index === self.findIndex((h) => h.title === hint.title))
    .slice(0, 8)

  return {
    hints: uniqueHints,
    struggleLevel,
    recommendedRevealLevel,
    personalizationApplied: userHistoryUsed,
    metadata: {
      generationTimeMs: Date.now() - startTime,
      ragContextUsed,
      userHistoryUsed,
      patternKnowledgeUsed,
    },
  }
}

/**
 * Get a single progressive hint (for "give me a hint" requests)
 */
export async function getNextHint(
  request: HintGenerationRequest,
  previousHintIds: string[]
): Promise<GeneratedHint | null> {
  const response = await generateHints(request)

  // Find the next unrevealed hint
  const nextHint = response.hints.find((h) => !previousHintIds.includes(h.id))

  if (!nextHint) {
    // All hints revealed, generate a more direct one
    return {
      id: generateHintId(),
      level: 4,
      category: "implementation",
      title: "Additional Guidance",
      content:
        "You've seen all available hints. Try reviewing them again, or consider breaking the problem into smaller subproblems. What's the simplest version of this problem you could solve?",
      isBlurred: true,
      source: "ai",
      relevanceScore: 0.5,
    }
  }

  return nextHint
}

/**
 * Singleton HintAgent class for backward compatibility
 */
class HintAgent {
  async generate(request: HintGenerationRequest): Promise<HintGenerationResponse> {
    return generateHints(request)
  }

  async getNext(
    request: HintGenerationRequest,
    previousHintIds: string[]
  ): Promise<GeneratedHint | null> {
    return getNextHint(request, previousHintIds)
  }
}

let hintAgentInstance: HintAgent | null = null

export function getHintAgent(): HintAgent {
  if (!hintAgentInstance) {
    hintAgentInstance = new HintAgent()
  }
  return hintAgentInstance
}

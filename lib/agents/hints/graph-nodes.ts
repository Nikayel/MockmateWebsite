//All the imports
import { getContextBuilder } from "@/lib/rag/context-builder"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import { getUserPerformanceRAG } from "@/lib/rag/user-performance-rag"
import { calculateStruggleLevel, getRecommendedRevealLevel } from "./struggle-calculator"
import { generateHintId } from "./code-analyzer"
import { generateLLMHint } from "./llm-generator"
import { generateGenericHint, generatePatternHints } from "./pattern-hints"
import type { GeneratedHint, HintLevel } from "./types"
import type { HintGraphStateType } from "./graph-state"

//Will prolly create its own .ts file inside graph-nodes directory
export async function prepareState(state: HintGraphStateType) {
  const struggleLevel = calculateStruggleLevel(state.request.struggleMetrics)

  const recommendedRevealLevel = getRecommendedRevealLevel(
    struggleLevel,
    state.request.struggleMetrics.hintsRevealed
  )

  return {
    struggleLevel,
    recommendedRevealLevel,
  }
}

export async function generateLlmHints(state: HintGraphStateType) {
  const { request, recommendedRevealLevel, struggleLevel } = state
  const category = request.trigger === "test_failed" ? "debugging" : "approach"

  const levelsToGenerate: HintLevel[] = []

  for (let level = 1; level <= Math.min(recommendedRevealLevel + 1, 4); level++) {
    levelsToGenerate.push(level as HintLevel)
  }

  const hints = await Promise.all(
    levelsToGenerate.map((level) =>
      generateLLMHint({
        problemTitle: request.problemTitle,
        problemText: request.problemText,
        problemPattern: request.problemPattern,
        difficulty: request.difficulty,
        userCode: request.userCode,
        language: request.language,
        level,
        category: level <= 2 ? "conceptual" : category,
        trigger: request.trigger || "manual",
        struggleLevel,
        userId: request.userId,
        existingHints: request.existingHints,
        testFailures: request.testResults?.failingTests,
        optimalComplexity: request.optimalComplexity,
        constraints: request.constraints,
      }).catch(() => null)
    )
  )

  const validHints = hints.filter((hint): hint is GeneratedHint => hint !== null)

  return {
    hints: validHints,
    llmUsed: validHints.length > 0,
  }
}
export async function addPatternHints(state: HintGraphStateType) {
  const { request, recommendedRevealLevel, llmUsed, hints } = state

  if (!request.problemPattern) {
    return {}
  }

  const patternHints = generatePatternHints(request.problemPattern, recommendedRevealLevel)

  if (patternHints.length === 0) {
    return {}
  }

  if (!llmUsed) {
    return {
      hints: patternHints,
      patternKnowledgeUsed: true,
    }
  }

  const existingTitles = hints.map((hint) => hint.title.toLowerCase())

  const uniquePatternHints = patternHints.filter((hint) => {
    const title = hint.title.toLowerCase()

    return !existingTitles.some(
      (existingTitle) => title.includes(existingTitle) || existingTitle.includes(title)
    )
  })

  return {
    hints: uniquePatternHints.slice(0, 2),
    patternKnowledgeUsed: true,
  }
}
//Very generic I may have an error display instead
export async function ensureAtLeastOneHint(state: HintGraphStateType) {
  if (state.hints.length > 0) {
    return {}
  }

  return {
    hints: [generateGenericHint(state.recommendedRevealLevel)],
  }
}

export async function addRagHint(state: HintGraphStateType) {
  const { request } = state

  try {
    const contextBuilder = getContextBuilder()

    const hintContext = await contextBuilder.buildHintContext({
      problemText: request.problemText,
      problemPattern: request.problemPattern,
      userCode: request.userCode,
      userId: request.userId,
    })

    const topDoc = hintContext.retrievedDocs[0]

    if (!topDoc?.text || topDoc.text.length <= 50 || (topDoc.finalScore || 0) <= 0.7) {
      return {}
    }

    const hint: GeneratedHint = {
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
    }

    return {
      hints: [hint],
      ragContextUsed: true,
    }
  } catch {
    return {}
  }
}

export async function addUserHistoryHints(state: HintGraphStateType) {
  const { request } = state

  try {
    const performanceRAG = getUserPerformanceRAG()
    const profile = await performanceRAG.getPerformanceProfile(request.userId)

    if (!profile || profile.totalSessions === 0) {
      return {}
    }

    const hints: GeneratedHint[] = []

    const patternProf = profile.patternProficiency.find(
      (item) => item.pattern === request.problemPattern
    )

    if (patternProf?.proficiencyLevel === "novice") {
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

    if (profile.strengths.length > 0 && request.problemPattern) {
      const relatedStrength = profile.strengths.find((strength) => {
        const knowledge = getPatternKnowledge(strength)
        return knowledge?.relatedPatterns?.includes(request.problemPattern!)
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

    return {
      hints,
      userHistoryUsed: hints.length > 0,
    }
  } catch {
    return {}
  }
}
export async function addTestFailureHints(state: HintGraphStateType) {
  const { request, recommendedRevealLevel } = state

  if (!request.testResults || request.testResults.total === 0) {
    return {}
  }

  const hints: GeneratedHint[] = []
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

  if (request.testResults.failingTests?.length) {
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

  return { hints }
}
export async function finalizeHints(state: HintGraphStateType) {
  const finalizedHints = [...state.hints]
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return b.relevanceScore - a.relevanceScore
    })
    .filter((hint, index, allHints) => {
      return index === allHints.findIndex((otherHint) => otherHint.title === hint.title)
    })
    .slice(0, 8)

  return { finalizedHints }
}

/**
 * Hint Agent
 *
 * AI-powered hint generation system that provides personalized,
 * progressive hints based on user's code state and struggle level.
 *
 * Features:
 * - Personalized hints based on user history and current code
 * - Progressive difficulty: hints get more obvious as user struggles
 * - Multiple hint levels (nudge, guide, reveal)
 * - RAG-enhanced context for relevant hints
 */

import { getContextBuilder } from '@/lib/rag/context-builder'
import { getPatternKnowledge } from '@/lib/rag/knowledge-base/dsa-knowledge'
import { getUserPerformanceRAG } from '@/lib/rag/user-performance-rag'
import { advancedRetrieve } from '@/lib/rag/retrieval/advanced-retrieval'
import type { DSAPattern } from '@/lib/types/dsa-patterns'

/**
 * Hint difficulty levels
 * Level 1 (Nudge): Subtle, conceptual hints
 * Level 2 (Guide): More specific direction
 * Level 3 (Explain): Detailed explanation
 * Level 4 (Reveal): Near-solution hint
 */
export type HintLevel = 1 | 2 | 3 | 4

/**
 * Hint category for UI grouping
 */
export type HintCategory = 'conceptual' | 'approach' | 'implementation' | 'optimization' | 'debugging'

/**
 * Single generated hint
 */
export interface GeneratedHint {
  id: string
  level: HintLevel
  category: HintCategory
  title: string
  content: string
  isBlurred: boolean
  source: 'ai' | 'rag' | 'pattern-knowledge' | 'user-history'
  relevanceScore: number
  metadata?: {
    pattern?: DSAPattern
    relatedConcepts?: string[]
    codeSnippet?: string
  }
}

/**
 * User struggle metrics for adaptive hints
 */
export interface StruggleMetrics {
  timeSpentMinutes: number
  codeChanges: number
  testsRun: number
  testsFailed: number
  hintsRevealed: number
  lastCodeChangeMinutesAgo: number
  errorCount: number
}

/**
 * Hint generation request
 */
export interface HintGenerationRequest {
  userId: string
  problemId: string
  problemTitle: string
  problemText: string
  problemPattern?: DSAPattern
  difficulty: 'easy' | 'medium' | 'hard'
  userCode: string
  language: string
  struggleMetrics: StruggleMetrics
  existingHints?: string[]
  testResults?: {
    passed: number
    total: number
    failingTests?: string[]
  }
}

/**
 * Hint generation response
 */
export interface HintGenerationResponse {
  hints: GeneratedHint[]
  struggleLevel: 'none' | 'mild' | 'moderate' | 'high'
  recommendedRevealLevel: HintLevel
  personalizationApplied: boolean
  metadata: {
    generationTimeMs: number
    ragContextUsed: boolean
    userHistoryUsed: boolean
    patternKnowledgeUsed: boolean
  }
}

/**
 * Calculate user's struggle level based on metrics
 */
function calculateStruggleLevel(metrics: StruggleMetrics): 'none' | 'mild' | 'moderate' | 'high' {
  let score = 0

  // Time factor (more time = more struggle)
  if (metrics.timeSpentMinutes > 30) score += 3
  else if (metrics.timeSpentMinutes > 20) score += 2
  else if (metrics.timeSpentMinutes > 10) score += 1

  // Failed tests factor
  if (metrics.testsFailed > 0) {
    const failRate = metrics.testsFailed / Math.max(metrics.testsRun, 1)
    if (failRate > 0.8) score += 3
    else if (failRate > 0.5) score += 2
    else if (failRate > 0.2) score += 1
  }

  // Inactivity factor (no code changes = stuck)
  if (metrics.lastCodeChangeMinutesAgo > 5) score += 2
  else if (metrics.lastCodeChangeMinutesAgo > 3) score += 1

  // Error count factor
  if (metrics.errorCount > 5) score += 2
  else if (metrics.errorCount > 2) score += 1

  // Many code changes but no progress = struggling
  if (metrics.codeChanges > 20 && metrics.testsFailed > 0) score += 1

  // Map score to struggle level
  if (score >= 7) return 'high'
  if (score >= 4) return 'moderate'
  if (score >= 2) return 'mild'
  return 'none'
}

/**
 * Get recommended hint reveal level based on struggle
 */
function getRecommendedRevealLevel(struggleLevel: string, hintsRevealed: number): HintLevel {
  switch (struggleLevel) {
    case 'high':
      return Math.min(3 + Math.floor(hintsRevealed / 2), 4) as HintLevel
    case 'moderate':
      return Math.min(2 + Math.floor(hintsRevealed / 3), 3) as HintLevel
    case 'mild':
      return Math.min(1 + Math.floor(hintsRevealed / 4), 2) as HintLevel
    default:
      return 1
  }
}

/**
 * Generate unique hint ID
 */
function generateHintId(): string {
  return `hint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Analyze code to understand where user is stuck
 */
function analyzeCodeState(code: string, language: string): {
  hasFunction: boolean
  hasLoops: boolean
  hasDataStructure: boolean
  hasEdgeCases: boolean
  approximateProgress: number
} {
  const codeLower = code.toLowerCase()

  const hasFunction = /function|def |const \w+ = |let \w+ = \(|=>/.test(code)
  const hasLoops = /for|while|\.forEach|\.map|\.reduce/.test(code)
  const hasDataStructure = /Map|Set|{|{}|\[\]|new Array|new Map|new Set|dict|set\(|list/.test(code)
  const hasEdgeCases = /if.*null|if.*undefined|if.*\.length.*0|if.*empty|if.*!/.test(codeLower)

  let progress = 0
  if (hasFunction) progress += 20
  if (hasLoops) progress += 25
  if (hasDataStructure) progress += 25
  if (hasEdgeCases) progress += 15
  if (code.length > 200) progress += 15

  return {
    hasFunction,
    hasLoops,
    hasDataStructure,
    hasEdgeCases,
    approximateProgress: Math.min(progress, 100),
  }
}

/**
 * Generate hints based on pattern knowledge
 */
function generatePatternHints(
  pattern: DSAPattern,
  codeState: ReturnType<typeof analyzeCodeState>,
  level: HintLevel
): GeneratedHint[] {
  const knowledge = getPatternKnowledge(pattern)
  if (!knowledge) return []

  const hints: GeneratedHint[] = []

  // Level 1: Conceptual hints
  if (level >= 1) {
    hints.push({
      id: generateHintId(),
      level: 1,
      category: 'conceptual',
      title: 'Pattern Recognition',
      content: `This is a ${knowledge.displayName} problem. ${knowledge.whenToUse[0]}`,
      isBlurred: true,
      source: 'pattern-knowledge',
      relevanceScore: 0.9,
      metadata: {
        pattern,
        relatedConcepts: knowledge.relatedPatterns,
      },
    })
  }

  // Level 2: Approach hints
  if (level >= 2) {
    hints.push({
      id: generateHintId(),
      level: 2,
      category: 'approach',
      title: 'Key Insight',
      content: knowledge.keyInsights[0],
      isBlurred: true,
      source: 'pattern-knowledge',
      relevanceScore: 0.85,
      metadata: { pattern },
    })

    if (!codeState.hasDataStructure) {
      hints.push({
        id: generateHintId(),
        level: 2,
        category: 'implementation',
        title: 'Data Structure Suggestion',
        content: `Consider using a ${pattern.includes('hash') ? 'hash map for O(1) lookups' :
          pattern.includes('tree') ? 'tree traversal approach' :
          pattern.includes('graph') ? 'graph representation (adjacency list)' :
          'suitable data structure for this pattern'}`,
        isBlurred: true,
        source: 'pattern-knowledge',
        relevanceScore: 0.8,
        metadata: { pattern },
      })
    }
  }

  // Level 3: Detailed explanation
  if (level >= 3) {
    hints.push({
      id: generateHintId(),
      level: 3,
      category: 'implementation',
      title: 'Implementation Guide',
      content: knowledge.keyInsights.slice(0, 2).join(' ') +
        ` The typical time complexity is ${knowledge.timeComplexity.typical}.`,
      isBlurred: true,
      source: 'pattern-knowledge',
      relevanceScore: 0.75,
      metadata: {
        pattern,
        codeSnippet: knowledge.codeTemplate?.split('\n').slice(0, 5).join('\n'),
      },
    })

    // Common mistakes hint
    hints.push({
      id: generateHintId(),
      level: 3,
      category: 'debugging',
      title: 'Common Pitfalls',
      content: `Watch out for: ${knowledge.commonMistakes.slice(0, 2).join(', ')}`,
      isBlurred: true,
      source: 'pattern-knowledge',
      relevanceScore: 0.7,
      metadata: { pattern },
    })
  }

  // Level 4: Near-solution hints
  if (level >= 4) {
    hints.push({
      id: generateHintId(),
      level: 4,
      category: 'implementation',
      title: 'Solution Approach',
      content: `Here's the general approach: ${knowledge.codeTemplate?.split('\n').slice(0, 8).join('\n')}`,
      isBlurred: true,
      source: 'pattern-knowledge',
      relevanceScore: 0.65,
      metadata: {
        pattern,
        codeSnippet: knowledge.codeTemplate,
      },
    })
  }

  return hints
}

/**
 * Generate code-specific hints based on current state
 */
function generateCodeStateHints(
  codeState: ReturnType<typeof analyzeCodeState>,
  problemText: string,
  level: HintLevel
): GeneratedHint[] {
  const hints: GeneratedHint[] = []
  const problemLower = problemText.toLowerCase()

  // Progress-based hints
  if (codeState.approximateProgress < 30) {
    hints.push({
      id: generateHintId(),
      level: 1,
      category: 'approach',
      title: 'Getting Started',
      content: 'Start by defining your function signature and identifying the input/output. What data structure would best represent your intermediate results?',
      isBlurred: true,
      source: 'ai',
      relevanceScore: 0.9,
    })
  }

  if (!codeState.hasEdgeCases && level >= 2) {
    hints.push({
      id: generateHintId(),
      level: 2,
      category: 'debugging',
      title: 'Edge Cases',
      content: 'Consider edge cases: empty input, single element, null values, or extreme values. These often trip up solutions.',
      isBlurred: true,
      source: 'ai',
      relevanceScore: 0.75,
    })
  }

  // Problem-specific hints
  if (problemLower.includes('two sum') || problemLower.includes('pair')) {
    if (!codeState.hasDataStructure && level >= 2) {
      hints.push({
        id: generateHintId(),
        level: 2,
        category: 'implementation',
        title: 'Optimization Hint',
        content: 'Instead of checking every pair (O(n²)), think about what you\'re looking for at each element. Could you store something that helps you find the answer in O(1)?',
        isBlurred: true,
        source: 'ai',
        relevanceScore: 0.85,
      })
    }
  }

  if (problemLower.includes('palindrome')) {
    hints.push({
      id: generateHintId(),
      level: 1,
      category: 'conceptual',
      title: 'Palindrome Property',
      content: 'A palindrome reads the same forwards and backwards. How could you verify this efficiently?',
      isBlurred: true,
      source: 'ai',
      relevanceScore: 0.85,
    })
  }

  if (problemLower.includes('sorted') || problemLower.includes('binary search')) {
    hints.push({
      id: generateHintId(),
      level: 1,
      category: 'conceptual',
      title: 'Sorted Array Advantage',
      content: 'When an array is sorted, you can eliminate half the search space at each step. What algorithm exploits this property?',
      isBlurred: true,
      source: 'ai',
      relevanceScore: 0.85,
    })
  }

  return hints
}

/**
 * Main hint generation function
 */
export async function generateHints(request: HintGenerationRequest): Promise<HintGenerationResponse> {
  const startTime = Date.now()
  const hints: GeneratedHint[] = []

  let ragContextUsed = false
  let userHistoryUsed = false
  let patternKnowledgeUsed = false

  // Calculate struggle level
  const struggleLevel = calculateStruggleLevel(request.struggleMetrics)
  const recommendedRevealLevel = getRecommendedRevealLevel(
    struggleLevel,
    request.struggleMetrics.hintsRevealed
  )

  // Analyze current code state
  const codeState = analyzeCodeState(request.userCode, request.language)

  // 1. Generate pattern-based hints if pattern is known
  if (request.problemPattern) {
    const patternHints = generatePatternHints(
      request.problemPattern,
      codeState,
      recommendedRevealLevel
    )
    hints.push(...patternHints)
    patternKnowledgeUsed = patternHints.length > 0
  }

  // 2. Generate code-state hints
  const codeHints = generateCodeStateHints(
    codeState,
    request.problemText,
    recommendedRevealLevel
  )
  hints.push(...codeHints)

  // 3. Try to get RAG-enhanced hints
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

      // Add hints from retrieved documents
      for (const doc of hintContext.retrievedDocs.slice(0, 2)) {
        if (doc.text && doc.text.length > 50) {
          hints.push({
            id: generateHintId(),
            level: 3,
            category: 'approach',
            title: 'Related Insight',
            content: doc.text.substring(0, 300) + (doc.text.length > 300 ? '...' : ''),
            isBlurred: true,
            source: 'rag',
            relevanceScore: doc.finalScore || 0.6,
            metadata: {
              relatedConcepts: doc.metadata?.tags as string[],
            },
          })
        }
      }
    }
  } catch (error) {
    console.error('[HintAgent] RAG context error:', error)
  }

  // 4. Try to get user history hints for personalization
  try {
    const performanceRAG = getUserPerformanceRAG()
    const profile = await performanceRAG.getPerformanceProfile(request.userId)

    if (profile && profile.totalSessions > 0) {
      userHistoryUsed = true

      // Check if this pattern is a weakness
      const patternProf = profile.patternProficiency.find(
        p => p.pattern === request.problemPattern
      )

      if (patternProf && patternProf.proficiencyLevel === 'novice') {
        hints.push({
          id: generateHintId(),
          level: 1,
          category: 'conceptual',
          title: 'Personalized Tip',
          content: `Based on your history, ${request.problemPattern} problems are newer to you. Focus on understanding the core pattern before optimizing.`,
          isBlurred: true,
          source: 'user-history',
          relevanceScore: 0.8,
          metadata: {
            pattern: request.problemPattern,
          },
        })
      }

      // If user has strong related patterns, leverage that
      if (profile.strengths.length > 0 && request.problemPattern) {
        const problemPattern = request.problemPattern
        const relatedStrength = profile.strengths.find(s => {
          const knowledge = getPatternKnowledge(s)
          return knowledge?.relatedPatterns?.includes(problemPattern)
        })

        if (relatedStrength) {
          hints.push({
            id: generateHintId(),
            level: 2,
            category: 'approach',
            title: 'Build on Your Strengths',
            content: `You're strong at ${relatedStrength}. This problem uses similar concepts - think about how you'd apply those techniques here.`,
            isBlurred: true,
            source: 'user-history',
            relevanceScore: 0.75,
          })
        }
      }
    }
  } catch (error) {
    console.error('[HintAgent] User history error:', error)
  }

  // 5. Add test-failure specific hints
  if (request.testResults && request.testResults.total > 0) {
    const passRate = request.testResults.passed / request.testResults.total

    if (passRate < 0.5 && recommendedRevealLevel >= 2) {
      hints.push({
        id: generateHintId(),
        level: 2,
        category: 'debugging',
        title: 'Test Analysis',
        content: `You're passing ${request.testResults.passed}/${request.testResults.total} tests. Focus on understanding what the failing cases have in common - are they edge cases, large inputs, or special values?`,
        isBlurred: true,
        source: 'ai',
        relevanceScore: 0.85,
      })
    }

    if (request.testResults.failingTests && request.testResults.failingTests.length > 0) {
      hints.push({
        id: generateHintId(),
        level: 3,
        category: 'debugging',
        title: 'Failing Test Hint',
        content: `Look at the failing test: ${request.testResults.failingTests[0]}. Trace through your code with this input - where does the actual output diverge from expected?`,
        isBlurred: true,
        source: 'ai',
        relevanceScore: 0.8,
      })
    }
  }

  // Sort hints by relevance and level
  hints.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return b.relevanceScore - a.relevanceScore
  })

  // Filter to unique hints and limit count
  const uniqueHints = hints.filter((hint, index, self) =>
    index === self.findIndex(h => h.title === hint.title)
  ).slice(0, 8)

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
  const nextHint = response.hints.find(h => !previousHintIds.includes(h.id))

  if (!nextHint) {
    // All hints revealed, generate a more direct one
    return {
      id: generateHintId(),
      level: 4,
      category: 'implementation',
      title: 'Additional Guidance',
      content: 'You\'ve seen all available hints. Try reviewing them again, or consider breaking the problem into smaller subproblems. What\'s the simplest version of this problem you could solve?',
      isBlurred: true,
      source: 'ai',
      relevanceScore: 0.5,
    }
  }

  return nextHint
}

/**
 * Singleton instance of hint agent
 */
class HintAgent {
  async generate(request: HintGenerationRequest): Promise<HintGenerationResponse> {
    return generateHints(request)
  }

  async getNext(request: HintGenerationRequest, previousHintIds: string[]): Promise<GeneratedHint | null> {
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

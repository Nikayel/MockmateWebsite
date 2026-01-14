/**
 * Question Frequency RAG
 *
 * Retrieves company-specific question frequency data to prioritize
 * the most commonly asked questions in interview roadmaps.
 *
 * Features:
 * - Company-specific "must know" question retrieval
 * - Frequency-based question ranking
 * - Pattern importance by company
 * - Daily pre-computation for cost efficiency
 */

import type { DSAPattern } from '@/lib/types/dsa-patterns'
import type { CompanyId } from '@/lib/data/company-questions/types'
import { getCompanyById } from '@/lib/data/company-questions'
import { getAdvancedRetriever } from './retrieval/advanced-retrieval'
import { getCompanyInterviewKnowledge } from './knowledge-base/company-knowledge'
import { getPatternKnowledge } from './knowledge-base/dsa-knowledge'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Frequently asked question data for a company
 */
export interface FrequentQuestion {
  scenarioId: string
  title: string
  pattern: DSAPattern
  difficulty: 'easy' | 'medium' | 'hard'
  frequencyScore: number // 1-100
  isMustkKnow: boolean
  companySpecificTips: string[]
  lastAsked?: string // When this was last reported asked
}

/**
 * Company question frequency profile
 */
export interface CompanyQuestionProfile {
  companyId: CompanyId
  companyName: string
  topQuestions: FrequentQuestion[]
  topPatterns: Array<{
    pattern: DSAPattern
    frequency: number
    recentTrend: 'increasing' | 'stable' | 'decreasing'
  }>
  interviewInsights: string[]
  lastUpdated: Date
}

/**
 * Options for question frequency retrieval
 */
export interface QuestionFrequencyOptions {
  companyId: CompanyId
  experienceLevel?: 'intern' | 'beginner' | 'intermediate' | 'advanced'
  limit?: number
  includePatternBreakdown?: boolean
}

// ============================================================================
// CACHING
// ============================================================================

// Cache for company question profiles (24 hour TTL - refresh daily)
const companyProfileCache = new Map<string, { profile: CompanyQuestionProfile; timestamp: number }>()
const COMPANY_PROFILE_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Get cache key for company profile
 */
function getCompanyProfileCacheKey(companyId: CompanyId, experienceLevel?: string): string {
  return `${companyId}:${experienceLevel || 'all'}`
}

// ============================================================================
// QUESTION FREQUENCY DATA
// ============================================================================

/**
 * Known "must know" questions by company
 * This data is compiled from interview reports and community feedback
 */
const MUST_KNOW_QUESTIONS: Record<CompanyId, Array<{
  title: string
  pattern: DSAPattern
  difficulty: 'easy' | 'medium' | 'hard'
  tips: string[]
}>> = {
  google: [
    { title: 'Two Sum', pattern: 'arrays-hashing', difficulty: 'easy', tips: ['HashMap for O(n)', 'Handle duplicates carefully'] },
    { title: 'LRU Cache', pattern: 'linked-list', difficulty: 'medium', tips: ['Use HashMap + Doubly Linked List', 'O(1) for both get and put'] },
    { title: 'Word Break', pattern: 'dp-1d', difficulty: 'medium', tips: ['DP with word set lookup', 'Memoization is key'] },
    { title: 'Merge Intervals', pattern: 'intervals', difficulty: 'medium', tips: ['Sort by start time first', 'Track current end'] },
    { title: 'Number of Islands', pattern: 'graphs', difficulty: 'medium', tips: ['BFS or DFS both work', 'Mark visited in place'] },
    { title: 'Serialize/Deserialize Binary Tree', pattern: 'trees', difficulty: 'hard', tips: ['Preorder with null markers', 'Use delimiter'] },
  ],
  meta: [
    { title: 'Two Sum', pattern: 'arrays-hashing', difficulty: 'easy', tips: ['Standard HashMap approach', 'One-pass solution'] },
    { title: 'Valid Palindrome', pattern: 'two-pointers', difficulty: 'easy', tips: ['Skip non-alphanumeric', 'Case insensitive'] },
    { title: 'Binary Tree Right Side View', pattern: 'trees', difficulty: 'medium', tips: ['BFS level by level', 'Take rightmost at each level'] },
    { title: 'Clone Graph', pattern: 'graphs', difficulty: 'medium', tips: ['Use HashMap for visited', 'DFS or BFS'] },
    { title: 'Random Pick with Weight', pattern: 'binary-search', difficulty: 'medium', tips: ['Prefix sum + binary search', 'Handle edge cases'] },
    { title: 'Minimum Remove Valid Parentheses', pattern: 'stack', difficulty: 'medium', tips: ['Track indices to remove', 'Two-pass or stack solution'] },
  ],
  amazon: [
    { title: 'Two Sum', pattern: 'arrays-hashing', difficulty: 'easy', tips: ['HashMap approach', 'Consider sorted array variant'] },
    { title: 'Meeting Rooms II', pattern: 'heap', difficulty: 'medium', tips: ['Min heap for end times', 'Sort by start first'] },
    { title: 'Number of Islands', pattern: 'graphs', difficulty: 'medium', tips: ['DFS/BFS with marking', 'Count connected components'] },
    { title: 'Word Search', pattern: 'backtracking', difficulty: 'medium', tips: ['Backtracking with visited', 'Optimize with early termination'] },
    { title: 'LRU Cache', pattern: 'linked-list', difficulty: 'medium', tips: ['OrderedDict or custom implementation', 'O(1) operations'] },
    { title: 'K Closest Points', pattern: 'heap', difficulty: 'medium', tips: ['Max heap of size k', 'Or quickselect'] },
  ],
  microsoft: [
    { title: 'Two Sum', pattern: 'arrays-hashing', difficulty: 'easy', tips: ['HashMap solution', 'Handle edge cases'] },
    { title: 'Add Two Numbers', pattern: 'linked-list', difficulty: 'medium', tips: ['Handle carry carefully', 'Different length lists'] },
    { title: 'Spiral Matrix', pattern: 'matrix', difficulty: 'medium', tips: ['Track boundaries', 'Shrink after each direction'] },
    { title: 'Word Ladder', pattern: 'graphs', difficulty: 'hard', tips: ['BFS shortest path', 'Bidirectional BFS for optimization'] },
    { title: 'LCA of Binary Tree', pattern: 'trees', difficulty: 'medium', tips: ['Recursion with path check', 'Handle not found'] },
  ],
  apple: [
    { title: 'Two Sum', pattern: 'arrays-hashing', difficulty: 'easy', tips: ['Classic HashMap', 'One pass solution'] },
    { title: 'Reverse Linked List', pattern: 'linked-list', difficulty: 'easy', tips: ['Iterative or recursive', 'Watch pointer updates'] },
    { title: '3Sum', pattern: 'two-pointers', difficulty: 'medium', tips: ['Sort + two pointers', 'Skip duplicates'] },
    { title: 'Valid Sudoku', pattern: 'arrays-hashing', difficulty: 'medium', tips: ['Track rows, cols, boxes', 'Use sets'] },
    { title: 'Design Hit Counter', pattern: 'arrays-hashing', difficulty: 'medium', tips: ['Circular array or queue', 'Handle time window'] },
  ],
  netflix: [
    { title: 'LRU Cache', pattern: 'linked-list', difficulty: 'medium', tips: ['Critical for caching systems', 'Doubly linked list + map'] },
    { title: 'Merge K Sorted Lists', pattern: 'heap', difficulty: 'hard', tips: ['Min heap approach', 'Divide and conquer also works'] },
    { title: 'Design Search Autocomplete', pattern: 'trie', difficulty: 'hard', tips: ['Trie with frequency', 'Precompute top results'] },
    { title: 'Sliding Window Maximum', pattern: 'monotonic-queue', difficulty: 'hard', tips: ['Monotonic deque', 'Track indices'] },
  ],
  uber: [
    { title: 'Two Sum', pattern: 'arrays-hashing', difficulty: 'easy', tips: ['HashMap approach', 'Consider variations'] },
    { title: 'Longest Substring Without Repeat', pattern: 'sliding-window', difficulty: 'medium', tips: ['Sliding window + set', 'Track start position'] },
    { title: 'Word Search II', pattern: 'trie', difficulty: 'hard', tips: ['Trie + backtracking', 'Prune branches'] },
    { title: 'Alien Dictionary', pattern: 'topological-sort', difficulty: 'hard', tips: ['Build graph from order', 'Topological sort'] },
  ],
  airbnb: [
    { title: 'Two Sum', pattern: 'arrays-hashing', difficulty: 'easy', tips: ['HashMap for O(n)', 'Handle duplicates'] },
    { title: 'Meeting Rooms', pattern: 'intervals', difficulty: 'easy', tips: ['Sort and check overlap', 'Edge cases'] },
    { title: 'Regular Expression Matching', pattern: 'dp-2d', difficulty: 'hard', tips: ['2D DP', 'Handle * carefully'] },
    { title: 'Pour Water', pattern: 'arrays-hashing', difficulty: 'medium', tips: ['Simulate water flow', 'Handle ties'] },
  ],
  linkedin: [
    { title: 'Two Sum', pattern: 'arrays-hashing', difficulty: 'easy', tips: ['Standard HashMap', 'One pass'] },
    { title: 'Nested List Weight Sum', pattern: 'dfs', difficulty: 'medium', tips: ['DFS with depth tracking', 'Handle both variants'] },
    { title: 'All O`one Data Structure', pattern: 'linked-list', difficulty: 'hard', tips: ['Doubly linked list + maps', 'O(1) all operations'] },
    { title: 'Max Stack', pattern: 'stack', difficulty: 'hard', tips: ['Two stacks or treemap', 'Track max efficiently'] },
  ],
  stripe: [
    { title: 'Two Sum', pattern: 'arrays-hashing', difficulty: 'easy', tips: ['HashMap approach', 'Consider sorted input'] },
    { title: 'Rate Limiter', pattern: 'sliding-window', difficulty: 'medium', tips: ['Token bucket or sliding window', 'Handle edge cases'] },
    { title: 'Distribute Coins in Binary Tree', pattern: 'trees', difficulty: 'medium', tips: ['Post-order DFS', 'Track excess'] },
  ],
  generic: [
    { title: 'Two Sum', pattern: 'arrays-hashing', difficulty: 'easy', tips: ['HashMap for O(n)', 'Foundation problem'] },
    { title: 'Reverse Linked List', pattern: 'linked-list', difficulty: 'easy', tips: ['Iterative or recursive', 'Classic problem'] },
    { title: 'Binary Search', pattern: 'binary-search', difficulty: 'easy', tips: ['Watch boundaries', 'Off-by-one errors'] },
    { title: 'Valid Parentheses', pattern: 'stack', difficulty: 'easy', tips: ['Stack for matching', 'Handle all bracket types'] },
    { title: 'Merge Two Sorted Lists', pattern: 'linked-list', difficulty: 'easy', tips: ['Two pointers', 'Handle remaining'] },
  ],
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get company-specific frequently asked questions
 * Combines static data with RAG retrieval for comprehensive results
 */
export async function getCompanyFrequentQuestions(
  options: QuestionFrequencyOptions
): Promise<CompanyQuestionProfile> {
  const { companyId, experienceLevel, limit = 20, includePatternBreakdown = true } = options

  // Check cache first
  const cacheKey = getCompanyProfileCacheKey(companyId, experienceLevel)
  const cached = companyProfileCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < COMPANY_PROFILE_CACHE_TTL) {
    return cached.profile
  }

  // Get company data
  const companyData = getCompanyById(companyId)
  const companyKnowledge = getCompanyInterviewKnowledge(companyId)
  const companyName = companyKnowledge?.companyName || companyId

  // Build frequent questions list
  const topQuestions: FrequentQuestion[] = []
  const mustKnowQuestions = MUST_KNOW_QUESTIONS[companyId] || MUST_KNOW_QUESTIONS.generic

  // Add must-know questions first
  for (const q of mustKnowQuestions) {
    // Skip hard questions for interns/beginners
    if ((experienceLevel === 'intern' || experienceLevel === 'beginner') && q.difficulty === 'hard') {
      continue
    }

    topQuestions.push({
      scenarioId: `dsa-${q.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
      title: q.title,
      pattern: q.pattern,
      difficulty: q.difficulty,
      frequencyScore: 95, // Must-know = very high frequency
      isMustkKnow: true,
      companySpecificTips: q.tips,
    })
  }

  // Try to retrieve additional questions from RAG
  try {
    const retriever = getAdvancedRetriever()
    const { results } = await retriever.retrieve({
      query: `${companyId} frequently asked interview questions ${experienceLevel || ''}`,
      limit: 5,
      types: ['knowledge'],
      companies: [companyId],
      minSimilarity: 0.3,
    })

    // Extract any additional questions from retrieved docs
    for (const doc of results) {
      const questionMatch = doc.text.match(/(?:common|frequent|popular)\s+(?:question|problem)[:\s]+([^.]+)/i)
      if (questionMatch) {
        const title = questionMatch[1].trim()
        if (!topQuestions.find(q => q.title.toLowerCase() === title.toLowerCase())) {
          topQuestions.push({
            scenarioId: `dsa-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
            title,
            pattern: 'arrays-hashing', // Default pattern
            difficulty: 'medium',
            frequencyScore: 70,
            isMustkKnow: false,
            companySpecificTips: [],
          })
        }
      }
    }
  } catch (error) {
    console.warn('[QuestionFrequencyRAG] RAG retrieval failed:', error)
  }

  // Build top patterns list
  const topPatterns: CompanyQuestionProfile['topPatterns'] = []
  if (companyData?.topPatterns) {
    for (const p of companyData.topPatterns.slice(0, 10)) {
      topPatterns.push({
        pattern: p.pattern,
        frequency: p.frequency,
        recentTrend: 'stable', // Default to stable
      })
    }
  }

  // Build interview insights
  const interviewInsights: string[] = []
  if (companyKnowledge) {
    interviewInsights.push(`Interview style: ${companyKnowledge.interviewStyle.description}`)
    interviewInsights.push(`Pace: ${companyKnowledge.interviewStyle.pace}`)
    interviewInsights.push(...companyKnowledge.cultureTips.slice(0, 2))
  }

  const profile: CompanyQuestionProfile = {
    companyId,
    companyName,
    topQuestions: topQuestions.slice(0, limit),
    topPatterns,
    interviewInsights,
    lastUpdated: new Date(),
  }

  // Cache the result
  companyProfileCache.set(cacheKey, { profile, timestamp: Date.now() })

  return profile
}

/**
 * Get prioritized questions for a roadmap based on company frequency data
 */
export async function getPrioritizedQuestionsForCompany(
  companyId: CompanyId,
  availableScenarioIds: string[],
  options: {
    experienceLevel?: 'intern' | 'beginner' | 'intermediate' | 'advanced'
    limit?: number
  } = {}
): Promise<Array<{ scenarioId: string; priorityBoost: number; reason: string }>> {
  const { experienceLevel, limit = 20 } = options

  const profile = await getCompanyFrequentQuestions({
    companyId,
    experienceLevel,
    limit: 50,
  })

  const prioritizedQuestions: Array<{ scenarioId: string; priorityBoost: number; reason: string }> = []

  for (const q of profile.topQuestions) {
    // Check if this question is in the available scenarios
    const matchingScenario = availableScenarioIds.find(
      id => id.toLowerCase().includes(q.title.toLowerCase().replace(/\s+/g, '-'))
        || q.scenarioId === id
    )

    if (matchingScenario) {
      let priorityBoost = q.frequencyScore / 100 // 0-1 boost
      let reason = `Frequently asked at ${profile.companyName}`

      if (q.isMustkKnow) {
        priorityBoost += 0.3 // Extra boost for must-know
        reason = `Must-know question for ${profile.companyName} interviews`
      }

      prioritizedQuestions.push({
        scenarioId: matchingScenario,
        priorityBoost: Math.min(priorityBoost, 1.5), // Cap at 1.5
        reason,
      })
    }
  }

  // Sort by priority boost
  return prioritizedQuestions.sort((a, b) => b.priorityBoost - a.priorityBoost).slice(0, limit)
}

/**
 * Get company-specific tips for a particular question
 */
export function getCompanyQuestionTips(
  companyId: CompanyId,
  questionTitle: string
): string[] {
  const mustKnow = MUST_KNOW_QUESTIONS[companyId] || []
  const question = mustKnow.find(
    q => q.title.toLowerCase() === questionTitle.toLowerCase()
  )

  if (question) {
    return question.tips
  }

  // Fallback: check generic
  const genericQuestion = MUST_KNOW_QUESTIONS.generic.find(
    q => q.title.toLowerCase() === questionTitle.toLowerCase()
  )

  return genericQuestion?.tips || []
}

/**
 * Format company question profile for display
 */
export function formatCompanyProfileForDisplay(profile: CompanyQuestionProfile): string {
  const parts: string[] = []

  parts.push(`## ${profile.companyName} Interview Question Profile`)
  parts.push('')

  if (profile.topQuestions.length > 0) {
    parts.push('### Must-Know Questions')
    for (const q of profile.topQuestions.filter(q => q.isMustkKnow).slice(0, 5)) {
      parts.push(`- **${q.title}** (${q.pattern}, ${q.difficulty})`)
      if (q.companySpecificTips.length > 0) {
        parts.push(`  - Tip: ${q.companySpecificTips[0]}`)
      }
    }
    parts.push('')
  }

  if (profile.topPatterns.length > 0) {
    parts.push('### Top Patterns by Frequency')
    for (const p of profile.topPatterns.slice(0, 5)) {
      const patternKnowledge = getPatternKnowledge(p.pattern)
      const displayName = patternKnowledge?.displayName || p.pattern
      parts.push(`- ${displayName}: ${p.frequency}/10 frequency`)
    }
    parts.push('')
  }

  if (profile.interviewInsights.length > 0) {
    parts.push('### Interview Insights')
    for (const insight of profile.interviewInsights) {
      parts.push(`- ${insight}`)
    }
  }

  return parts.join('\n')
}

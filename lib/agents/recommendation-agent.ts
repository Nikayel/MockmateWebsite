/**
 * Recommendation Agent
 *
 * AI-powered problem recommendation system that scores and suggests
 * next problems based on user's performance, learning goals, and history.
 *
 * Features:
 * - Personalized recommendations based on user profile
 * - Adaptive difficulty progression
 * - Pattern-aware suggestions for skill building
 * - Spaced repetition for weak areas
 */

import { getUserPerformanceRAG, type UserPerformanceProfile, type PatternProficiency } from '@/lib/rag/user-performance-rag'
import { getPatternKnowledge, getRelatedPatterns } from '@/lib/rag/knowledge-base/dsa-knowledge'
import { advancedRetrieve } from '@/lib/rag/retrieval/advanced-retrieval'
import type { DSAPattern } from '@/lib/types/dsa-patterns'

/**
 * Recommendation priority
 */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'

/**
 * Recommendation reason
 */
export type RecommendationReason =
  | 'weakness-practice'
  | 'strength-challenge'
  | 'new-pattern'
  | 'spaced-repetition'
  | 'difficulty-progression'
  | 'similar-to-solved'
  | 'interview-prep'
  | 'daily-goal'

/**
 * Problem score breakdown
 */
export interface ProblemScore {
  overall: number          // 0-100
  relevance: number        // How relevant to user's goals
  difficulty: number       // Appropriate difficulty level
  freshness: number        // Not recently practiced
  patternValue: number     // Value for pattern learning
  progression: number      // Fits in learning progression
}

/**
 * Recommended problem
 */
export interface RecommendedProblem {
  id: string
  title: string
  pattern: DSAPattern
  difficulty: 'easy' | 'medium' | 'hard'
  score: ProblemScore
  priority: RecommendationPriority
  reason: RecommendationReason
  reasonText: string
  estimatedTimeMinutes: number
  prerequisites: DSAPattern[]
  userReadiness: number    // 0-100, how ready user is for this problem
  metadata?: {
    tags?: string[]
    company?: string
    frequency?: number
  }
}

/**
 * Recommendation request
 */
export interface RecommendationRequest {
  userId: string
  targetCompany?: string
  targetPatterns?: DSAPattern[]
  preferredDifficulty?: 'easy' | 'medium' | 'hard' | 'adaptive'
  sessionGoal?: 'practice' | 'learn-new' | 'review' | 'challenge'
  availableTimeMinutes?: number
  excludeProblemIds?: string[]
  limit?: number
}

/**
 * Available problem in catalog
 */
export interface CatalogProblem {
  id: string
  title: string
  pattern: DSAPattern
  difficulty: 'easy' | 'medium' | 'hard'
  description?: string
  estimatedTimeMinutes?: number
  tags?: string[]
  company?: string
  frequency?: number
}

/**
 * Recommendation response
 */
export interface RecommendationResponse {
  recommendations: RecommendedProblem[]
  userProfile: {
    level: 'beginner' | 'intermediate' | 'advanced'
    strengths: DSAPattern[]
    weaknesses: DSAPattern[]
    recentTrend: 'improving' | 'stable' | 'declining'
  }
  sessionPlan?: {
    warmup?: RecommendedProblem
    main: RecommendedProblem[]
    challenge?: RecommendedProblem
    estimatedTotalMinutes: number
  }
  metadata: {
    generationTimeMs: number
    totalProblemsScored: number
    personalizationLevel: 'full' | 'partial' | 'none'
  }
}

/**
 * Estimate time for a problem based on difficulty and pattern
 */
function estimateProblemTime(difficulty: string, pattern: DSAPattern): number {
  const baseTime = {
    easy: 15,
    medium: 30,
    hard: 45,
  }[difficulty] || 30

  // Adjust based on pattern complexity
  const complexPatterns = ['dp-2d', 'backtracking', 'graphs', 'trie']
  if (complexPatterns.includes(pattern)) {
    return baseTime * 1.3
  }

  return baseTime
}

/**
 * Determine user level from profile
 */
function getUserLevel(profile: UserPerformanceProfile): 'beginner' | 'intermediate' | 'advanced' {
  if (profile.totalSessions < 10 || profile.averageScore < 50) {
    return 'beginner'
  }
  if (profile.totalSessions < 50 || profile.averageScore < 70) {
    return 'intermediate'
  }
  return 'advanced'
}

/**
 * Calculate appropriate difficulty for user
 */
function getAdaptiveDifficulty(
  profile: UserPerformanceProfile,
  pattern: DSAPattern
): 'easy' | 'medium' | 'hard' {
  const patternProf = profile.patternProficiency.find(p => p.pattern === pattern)

  if (!patternProf || patternProf.proficiencyLevel === 'novice') {
    return 'easy'
  }

  if (patternProf.proficiencyLevel === 'learning' || patternProf.proficiencyLevel === 'practicing') {
    // If improving, push slightly
    if (patternProf.improvementTrend === 'improving') {
      return 'medium'
    }
    return 'easy'
  }

  if (patternProf.proficiencyLevel === 'proficient') {
    return 'medium'
  }

  // Expert level
  return profile.difficultyPerformance.hard.avgScore > 70 ? 'hard' : 'medium'
}

/**
 * Score a problem for a user
 */
function scoreProblem(
  problem: CatalogProblem,
  profile: UserPerformanceProfile,
  request: RecommendationRequest
): ProblemScore {
  let relevance = 50
  let difficulty = 50
  let freshness = 100
  let patternValue = 50
  let progression = 50

  // Relevance scoring
  if (request.targetPatterns?.includes(problem.pattern)) {
    relevance += 30
  }
  if (request.targetCompany && problem.company === request.targetCompany) {
    relevance += 20
  }
  if (problem.frequency && problem.frequency > 50) {
    relevance += 10
  }

  // Difficulty scoring
  const adaptiveDifficulty = getAdaptiveDifficulty(profile, problem.pattern)
  if (request.preferredDifficulty === 'adaptive') {
    difficulty = problem.difficulty === adaptiveDifficulty ? 100 : 60
  } else if (request.preferredDifficulty === problem.difficulty) {
    difficulty = 100
  } else {
    const diffMap = { easy: 0, medium: 1, hard: 2 }
    const diff = Math.abs(diffMap[problem.difficulty] - diffMap[request.preferredDifficulty || 'medium'])
    difficulty = 100 - diff * 30
  }

  // Pattern value scoring
  const patternProf = profile.patternProficiency.find(p => p.pattern === problem.pattern)
  if (!patternProf) {
    // New pattern - high value for learning
    patternValue = request.sessionGoal === 'learn-new' ? 90 : 60
  } else if (patternProf.proficiencyLevel === 'novice' || patternProf.proficiencyLevel === 'learning') {
    // Weak area - high value for practice
    patternValue = request.sessionGoal === 'practice' ? 90 : 70
  } else if (patternProf.improvementTrend === 'declining') {
    // Declining - needs review
    patternValue = request.sessionGoal === 'review' ? 95 : 75
  } else if (patternProf.proficiencyLevel === 'expert') {
    // Already strong - lower value unless challenging
    patternValue = request.sessionGoal === 'challenge' ? 60 : 30
  }

  // Freshness scoring (check last practiced)
  if (patternProf?.lastPracticed) {
    const daysSince = (Date.now() - patternProf.lastPracticed.getTime()) / (24 * 60 * 60 * 1000)
    if (daysSince < 1) freshness = 30
    else if (daysSince < 3) freshness = 60
    else if (daysSince < 7) freshness = 80
    else freshness = 100
  }

  // Progression scoring
  const knowledge = getPatternKnowledge(problem.pattern)
  if (knowledge) {
    const prereqsMet = knowledge.prerequisites.every(prereq =>
      profile.patternProficiency.some(
        p => p.pattern === prereq && ['practicing', 'proficient', 'expert'].includes(p.proficiencyLevel)
      )
    )
    progression = prereqsMet ? 80 : 40
  }

  const overall = Math.round(
    relevance * 0.25 +
    difficulty * 0.2 +
    freshness * 0.15 +
    patternValue * 0.25 +
    progression * 0.15
  )

  return {
    overall,
    relevance,
    difficulty,
    freshness,
    patternValue,
    progression,
  }
}

/**
 * Determine recommendation priority
 */
function getPriority(score: ProblemScore, reason: RecommendationReason): RecommendationPriority {
  if (reason === 'weakness-practice' && score.overall > 70) return 'critical'
  if (reason === 'spaced-repetition' && score.freshness > 90) return 'high'
  if (score.overall > 80) return 'high'
  if (score.overall > 60) return 'medium'
  return 'low'
}

/**
 * Generate reason text
 */
function getReasonText(
  reason: RecommendationReason,
  problem: CatalogProblem,
  profile: UserPerformanceProfile
): string {
  const patternProf = profile.patternProficiency.find(p => p.pattern === problem.pattern)

  switch (reason) {
    case 'weakness-practice':
      return `Your ${problem.pattern} skills need work. This ${problem.difficulty} problem is a good practice opportunity.`
    case 'strength-challenge':
      return `You're strong at ${problem.pattern}! Challenge yourself with this harder problem.`
    case 'new-pattern':
      return `You haven't practiced ${problem.pattern} yet. This is a good introduction.`
    case 'spaced-repetition':
      return `It's been a while since you practiced ${problem.pattern}. Time for a refresher!`
    case 'difficulty-progression':
      return `Based on your recent progress, you're ready for this ${problem.difficulty} challenge.`
    case 'similar-to-solved':
      return `This is similar to problems you've solved before. Apply your knowledge!`
    case 'interview-prep':
      return `Frequently asked in interviews${problem.company ? ` at ${problem.company}` : ''}. Great for preparation.`
    case 'daily-goal':
      return `Perfect for your daily practice goal. Estimated ${estimateProblemTime(problem.difficulty, problem.pattern)} minutes.`
    default:
      return `Recommended based on your learning profile.`
  }
}

/**
 * Determine recommendation reason
 */
function determineReason(
  problem: CatalogProblem,
  profile: UserPerformanceProfile,
  request: RecommendationRequest
): RecommendationReason {
  const patternProf = profile.patternProficiency.find(p => p.pattern === problem.pattern)

  // Check for new pattern
  if (!patternProf) {
    return 'new-pattern'
  }

  // Check for weakness practice
  if (profile.weaknesses.includes(problem.pattern)) {
    return 'weakness-practice'
  }

  // Check for spaced repetition need
  if (patternProf.lastPracticed) {
    const daysSince = (Date.now() - patternProf.lastPracticed.getTime()) / (24 * 60 * 60 * 1000)
    if (daysSince > 7 && patternProf.proficiencyLevel !== 'expert') {
      return 'spaced-repetition'
    }
  }

  // Check for strength challenge
  if (profile.strengths.includes(problem.pattern) && problem.difficulty === 'hard') {
    return 'strength-challenge'
  }

  // Interview prep for company problems
  if (problem.company && request.targetCompany === problem.company) {
    return 'interview-prep'
  }

  // Default based on session goal
  switch (request.sessionGoal) {
    case 'challenge':
      return 'difficulty-progression'
    case 'review':
      return 'spaced-repetition'
    case 'learn-new':
      return 'new-pattern'
    default:
      return 'daily-goal'
  }
}

/**
 * Calculate user readiness for a problem
 */
function calculateReadiness(
  problem: CatalogProblem,
  profile: UserPerformanceProfile
): number {
  const knowledge = getPatternKnowledge(problem.pattern)
  if (!knowledge) return 50

  // Check prerequisites
  let prereqScore = 100
  for (const prereq of knowledge.prerequisites) {
    const prof = profile.patternProficiency.find(p => p.pattern === prereq)
    if (!prof || prof.proficiencyLevel === 'novice') {
      prereqScore -= 30
    } else if (prof.proficiencyLevel === 'learning') {
      prereqScore -= 15
    }
  }

  // Check pattern proficiency
  const patternProf = profile.patternProficiency.find(p => p.pattern === problem.pattern)
  let patternScore = 50
  if (patternProf) {
    switch (patternProf.proficiencyLevel) {
      case 'novice': patternScore = 30; break
      case 'learning': patternScore = 50; break
      case 'practicing': patternScore = 70; break
      case 'proficient': patternScore = 85; break
      case 'expert': patternScore = 100; break
    }
  }

  // Adjust for difficulty
  let difficultyModifier = 0
  if (problem.difficulty === 'hard' && patternScore < 70) difficultyModifier = -20
  if (problem.difficulty === 'easy' && patternScore > 80) difficultyModifier = 10

  return Math.max(0, Math.min(100, Math.round(
    prereqScore * 0.4 + patternScore * 0.6 + difficultyModifier
  )))
}

/**
 * Main recommendation function
 */
export async function generateRecommendations(
  request: RecommendationRequest,
  catalog: CatalogProblem[]
): Promise<RecommendationResponse> {
  const startTime = Date.now()
  let personalizationLevel: 'full' | 'partial' | 'none' = 'none'

  // Get user profile
  const performanceRAG = getUserPerformanceRAG()
  let profile: UserPerformanceProfile

  try {
    profile = await performanceRAG.getPerformanceProfile(request.userId)
    personalizationLevel = profile.totalSessions > 5 ? 'full' : 'partial'
  } catch (error) {
    console.error('[RecommendationAgent] Error getting profile:', error)
    // Create default profile for new users
    profile = {
      userId: request.userId,
      lastUpdated: new Date(),
      totalSessions: 0,
      completedSessions: 0,
      averageScore: 0,
      totalPracticeHours: 0,
      patternProficiency: [],
      difficultyPerformance: {
        easy: { attempted: 0, avgScore: 0 },
        medium: { attempted: 0, avgScore: 0 },
        hard: { attempted: 0, avgScore: 0 },
      },
      recentTrend: 'stable',
      weeklyProgress: [0, 0, 0, 0],
      strengths: [],
      weaknesses: [],
      focusAreas: [],
      preferredSessionLength: 45,
      bestPerformanceTime: 'any',
      learningPace: 'moderate',
    }
  }

  // Filter excluded problems
  let eligibleProblems = catalog.filter(
    p => !request.excludeProblemIds?.includes(p.id)
  )

  // Filter by available time if specified
  if (request.availableTimeMinutes) {
    eligibleProblems = eligibleProblems.filter(
      p => estimateProblemTime(p.difficulty, p.pattern) <= request.availableTimeMinutes!
    )
  }

  // Score all problems
  const scoredProblems = eligibleProblems.map(problem => {
    const score = scoreProblem(problem, profile, request)
    const reason = determineReason(problem, profile, request)

    return {
      ...problem,
      score,
      reason,
      priority: getPriority(score, reason),
      reasonText: getReasonText(reason, problem, profile),
      estimatedTimeMinutes: estimateProblemTime(problem.difficulty, problem.pattern),
      prerequisites: getPatternKnowledge(problem.pattern)?.prerequisites || [],
      userReadiness: calculateReadiness(problem, profile),
    } as RecommendedProblem
  })

  // Sort by overall score
  scoredProblems.sort((a, b) => b.score.overall - a.score.overall)

  // Apply limit
  const recommendations = scoredProblems.slice(0, request.limit || 10)

  // Create session plan if enough problems
  let sessionPlan: RecommendationResponse['sessionPlan'] | undefined
  if (recommendations.length >= 3) {
    const easyWarmup = recommendations.find(p => p.difficulty === 'easy')
    const mainProblems = recommendations.filter(p =>
      p.difficulty !== 'easy' || !easyWarmup || p.id !== easyWarmup.id
    ).slice(0, 3)
    const hardChallenge = recommendations.find(
      p => p.difficulty === 'hard' && !mainProblems.includes(p)
    )

    sessionPlan = {
      warmup: easyWarmup,
      main: mainProblems,
      challenge: hardChallenge,
      estimatedTotalMinutes:
        (easyWarmup?.estimatedTimeMinutes || 0) +
        mainProblems.reduce((sum, p) => sum + p.estimatedTimeMinutes, 0) +
        (hardChallenge?.estimatedTimeMinutes || 0),
    }
  }

  return {
    recommendations,
    userProfile: {
      level: getUserLevel(profile),
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
      recentTrend: profile.recentTrend,
    },
    sessionPlan,
    metadata: {
      generationTimeMs: Date.now() - startTime,
      totalProblemsScored: eligibleProblems.length,
      personalizationLevel,
    },
  }
}

/**
 * Get quick recommendation for "next problem"
 */
export async function getNextProblemRecommendation(
  userId: string,
  currentProblemId: string,
  currentPattern: DSAPattern,
  wasSuccessful: boolean,
  catalog: CatalogProblem[]
): Promise<RecommendedProblem | null> {
  const response = await generateRecommendations(
    {
      userId,
      excludeProblemIds: [currentProblemId],
      targetPatterns: wasSuccessful
        ? getRelatedPatterns(currentPattern).map(k => k.pattern) // Try related patterns
        : [currentPattern], // Stay on same pattern
      preferredDifficulty: 'adaptive',
      sessionGoal: wasSuccessful ? 'challenge' : 'practice',
      limit: 3,
    },
    catalog
  )

  return response.recommendations[0] || null
}

/**
 * Recommendation Agent class
 */
class RecommendationAgent {
  async recommend(
    request: RecommendationRequest,
    catalog: CatalogProblem[]
  ): Promise<RecommendationResponse> {
    return generateRecommendations(request, catalog)
  }

  async getNext(
    userId: string,
    currentProblemId: string,
    currentPattern: DSAPattern,
    wasSuccessful: boolean,
    catalog: CatalogProblem[]
  ): Promise<RecommendedProblem | null> {
    return getNextProblemRecommendation(
      userId,
      currentProblemId,
      currentPattern,
      wasSuccessful,
      catalog
    )
  }
}

let recommendationAgentInstance: RecommendationAgent | null = null

export function getRecommendationAgent(): RecommendationAgent {
  if (!recommendationAgentInstance) {
    recommendationAgentInstance = new RecommendationAgent()
  }
  return recommendationAgentInstance
}

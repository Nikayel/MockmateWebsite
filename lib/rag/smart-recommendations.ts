/**
 * Smart Recommendations Engine
 *
 * Enhanced recommendation system with rich explanations, visual symbols,
 * and intelligent reasoning that users can understand and trust.
 *
 * Features:
 * - Visual symbols for recommendation types
 * - Rich "why" explanations
 * - Personalized reasoning based on user profile
 * - Interview readiness alignment
 * - Confidence indicators
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { CompanyId } from "@/lib/data/company-questions/types"
import {
  getEnhancedProfileService,
  type EnhancedUserProfile,
  type UserInsight,
} from "./enhanced-user-profile"
import { getMisconceptionTracker } from "./misconception-detection"
import { getUserPerformanceRAG } from "./user-performance-rag"
import { getPatternKnowledge } from "./knowledge-base/dsa-knowledge"

// ============================================================================
// TYPES
// ============================================================================

/**
 * Recommendation symbol with visual indicator
 */
export interface RecommendationSymbol {
  icon: string // Emoji icon
  label: string // Short label
  color: string // Tailwind color class
  priority: number // For sorting (lower = higher priority)
}

/**
 * Rich explanation for why a problem is recommended
 */
export interface RecommendationExplanation {
  headline: string // One-line summary
  reasoning: string[] // Bullet points of reasoning
  evidence: ExplanationEvidence[] // Data-backed evidence
  confidence: number // 0-100 confidence in recommendation
  alternativeAction?: string // What to do if they don't want this
}

export interface ExplanationEvidence {
  type: "performance" | "timing" | "pattern" | "interview" | "misconception" | "decay"
  icon: string
  text: string
  value?: number | string
}

/**
 * Smart recommendation with full context
 */
export interface SmartRecommendation {
  // Core info
  id: string
  problemId: string
  title: string
  pattern: DSAPattern
  difficulty: "easy" | "medium" | "hard"

  // Visual elements
  symbol: RecommendationSymbol
  tags: RecommendationTag[]

  // Rich explanation
  explanation: RecommendationExplanation

  // Scoring
  score: number // 0-100 overall score
  userReadiness: number // 0-100 how ready user is
  interviewRelevance: number // 0-100 how relevant to interviews

  // Time estimates
  estimatedMinutes: number
  optimalTimeOfDay?: string

  // Metadata
  companyFrequency?: { company: CompanyId; frequency: number }[]
  relatedProblems?: string[]
  prerequisitesMet: boolean
  lastAttempted?: Date
}

export interface RecommendationTag {
  text: string
  color: string
  icon?: string
}

/**
 * Recommendation request with context
 */
export interface SmartRecommendationRequest {
  userId: string
  targetCompany?: CompanyId
  availableMinutes?: number
  sessionGoal?: "warmup" | "practice" | "challenge" | "review" | "interview-prep"
  excludeIds?: string[]
  limit?: number
}

/**
 * Full recommendation response
 */
export interface SmartRecommendationResponse {
  recommendations: SmartRecommendation[]
  sessionInsights: SessionInsight[]
  userSummary: UserSummary
  meta: {
    generatedAt: Date
    personalizationLevel: "full" | "partial" | "basic"
    confidenceLevel: "high" | "medium" | "low"
  }
}

export interface SessionInsight {
  icon: string
  title: string
  description: string
  actionable: boolean
  action?: string
}

export interface UserSummary {
  level: "beginner" | "intermediate" | "advanced"
  interviewReadiness: number
  strengths: { pattern: DSAPattern; score: number }[]
  focusAreas: { pattern: DSAPattern; reason: string }[]
  streak: number
  trend: "improving" | "stable" | "declining"
}

// ============================================================================
// SYMBOL DEFINITIONS
// ============================================================================

export const RECOMMENDATION_SYMBOLS: Record<string, RecommendationSymbol> = {
  // Priority symbols
  "critical-weakness": {
    icon: "🔴",
    label: "Critical Gap",
    color: "text-red-600 bg-red-50 border-red-200",
    priority: 1,
  },
  "skill-decay": {
    icon: "📉",
    label: "Skill Fading",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    priority: 2,
  },
  misconception: {
    icon: "⚠️",
    label: "Fix Mistake",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    priority: 3,
  },
  "interview-hot": {
    icon: "🔥",
    label: "Interview Hot",
    color: "text-red-500 bg-red-50 border-red-200",
    priority: 4,
  },
  "weakness-practice": {
    icon: "🎯",
    label: "Focus Area",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    priority: 5,
  },
  "spaced-review": {
    icon: "🔄",
    label: "Review Time",
    color: "text-purple-600 bg-purple-50 border-purple-200",
    priority: 6,
  },
  "strength-challenge": {
    icon: "💪",
    label: "Challenge",
    color: "text-green-600 bg-green-50 border-green-200",
    priority: 7,
  },
  "new-pattern": {
    icon: "✨",
    label: "New Pattern",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    priority: 8,
  },
  warmup: {
    icon: "☀️",
    label: "Warmup",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    priority: 9,
  },
  "daily-practice": {
    icon: "📚",
    label: "Daily Practice",
    color: "text-gray-600 bg-gray-50 border-gray-200",
    priority: 10,
  },
}

// ============================================================================
// EXPLANATION GENERATORS
// ============================================================================

/**
 * Generate rich explanation for a recommendation
 */
function generateExplanation(
  recommendationType: string,
  pattern: DSAPattern,
  profile: EnhancedUserProfile,
  problemData: Partial<SmartRecommendation>
): RecommendationExplanation {
  const evidence: ExplanationEvidence[] = []
  const reasoning: string[] = []
  let headline = ""
  let confidence = 70

  // Get pattern proficiency
  const patternProf = profile.knowledgeGraph.concepts.find((c) => c.parentPattern === pattern)
  const misconceptionData = profile.knowledgeGraph.misconceptions.find((m) => m.pattern === pattern)
  const decayData = profile.temporal.skillDecay.find((sd) => sd.pattern === pattern)

  switch (recommendationType) {
    case "critical-weakness":
      headline = `Critical gap in ${formatPattern(pattern)} needs immediate attention`
      reasoning.push(
        `Your ${formatPattern(pattern)} proficiency is below interview threshold`,
        `This pattern appears frequently in technical interviews`,
        `Strengthening this now will significantly boost your readiness`
      )
      if (patternProf) {
        evidence.push({
          type: "performance",
          icon: "📊",
          text: "Current mastery level",
          value: `${Math.round(patternProf.predictedMastery)}%`,
        })
      }
      confidence = 90
      break

    case "skill-decay":
      headline = `Your ${formatPattern(pattern)} skills are fading - time to refresh`
      reasoning.push(
        `It's been ${decayData?.daysSincePractice || "many"} days since you practiced this`,
        `Skills decay without regular practice`,
        `A quick review will restore your proficiency`
      )
      if (decayData) {
        evidence.push({
          type: "decay",
          icon: "📅",
          text: "Days since practice",
          value: decayData.daysSincePractice,
        })
        evidence.push({
          type: "decay",
          icon: "📉",
          text: "Estimated skill decay",
          value: `${Math.round(decayData.estimatedDecay)}%`,
        })
      }
      confidence = 85
      break

    case "misconception":
      headline = `Address your common mistake with ${formatPattern(pattern)}`
      reasoning.push(
        `You've made ${misconceptionData?.misconceptionType || "errors"} mistakes in this area`,
        `Fixing this misconception will prevent future errors`,
        `Targeted practice is more effective than general practice`
      )
      if (misconceptionData) {
        evidence.push({
          type: "misconception",
          icon: "⚠️",
          text: "Error type",
          value: formatMisconceptionType(misconceptionData.misconceptionType),
        })
        evidence.push({
          type: "misconception",
          icon: "🔢",
          text: "Times occurred",
          value: misconceptionData.frequency,
        })
      }
      confidence = 88
      break

    case "interview-hot":
      headline = `Frequently asked in interviews - master this pattern`
      reasoning.push(
        `This problem type appears often in real interviews`,
        `Companies like FAANG frequently ask similar questions`,
        `Mastering this will directly improve your interview performance`
      )
      evidence.push({
        type: "interview",
        icon: "🏢",
        text: "Interview frequency",
        value: "High",
      })
      confidence = 82
      break

    case "weakness-practice":
      headline = `Build your ${formatPattern(pattern)} foundation`
      reasoning.push(
        `This is one of your identified focus areas`,
        `Consistent practice will move you from learning to proficient`,
        `Start with easier problems to build confidence`
      )
      if (patternProf) {
        evidence.push({
          type: "performance",
          icon: "📊",
          text: "Current level",
          value: patternProf.masteryLevel < 40 ? "Learning" : "Practicing",
        })
      }
      confidence = 80
      break

    case "spaced-review":
      headline = `Perfect timing for ${formatPattern(pattern)} review`
      reasoning.push(
        `Spaced repetition shows this is optimal review time`,
        `Reviewing now maximizes long-term retention`,
        `This is based on your personal retention patterns`
      )
      const reviewData = profile.temporal.reviewSchedule.find((r) => r.pattern === pattern)
      if (reviewData) {
        evidence.push({
          type: "timing",
          icon: "⏰",
          text: "Optimal review window",
          value: "Now",
        })
      }
      confidence = 78
      break

    case "strength-challenge":
      headline = `You're ready to level up in ${formatPattern(pattern)}`
      reasoning.push(
        `You've mastered the basics of this pattern`,
        `Challenging yourself builds advanced problem-solving skills`,
        `This will prepare you for harder interview questions`
      )
      if (patternProf) {
        evidence.push({
          type: "performance",
          icon: "⭐",
          text: "Your proficiency",
          value: `${Math.round(patternProf.masteryLevel)}% (Strong)`,
        })
      }
      confidence = 75
      break

    case "new-pattern":
      headline = `Learn a new pattern: ${formatPattern(pattern)}`
      reasoning.push(
        `Expanding your pattern knowledge increases versatility`,
        `This pattern complements your existing skills`,
        `Starting with an easy problem makes learning smoother`
      )
      evidence.push({
        type: "pattern",
        icon: "🆕",
        text: "New to your repertoire",
        value: "First time",
      })
      confidence = 72
      break

    case "warmup":
      headline = `Quick warmup to get you in the zone`
      reasoning.push(
        `Starting with an easier problem builds momentum`,
        `Warmups improve performance on harder problems`,
        `Based on your best performance time patterns`
      )
      evidence.push({
        type: "timing",
        icon: "☀️",
        text: "Session type",
        value: "Warmup",
      })
      confidence = 70
      break

    default:
      headline = `Continue building your ${formatPattern(pattern)} skills`
      reasoning.push(
        `Regular practice builds lasting expertise`,
        `This aligns with your learning goals`
      )
      confidence = 65
  }

  // Add interview relevance if applicable
  if (
    profile.interviewReadiness.overall < 70 &&
    problemData.interviewRelevance &&
    problemData.interviewRelevance > 70
  ) {
    evidence.push({
      type: "interview",
      icon: "🎯",
      text: "Interview relevance",
      value: `${problemData.interviewRelevance}%`,
    })
  }

  // Add readiness indicator
  if (problemData.userReadiness !== undefined) {
    evidence.push({
      type: "performance",
      icon: problemData.userReadiness > 70 ? "✅" : problemData.userReadiness > 40 ? "🔶" : "🔸",
      text: "Your readiness",
      value: `${problemData.userReadiness}%`,
    })
  }

  return {
    headline,
    reasoning,
    evidence,
    confidence,
    alternativeAction: getAlternativeAction(recommendationType),
  }
}

function formatPattern(pattern: DSAPattern): string {
  const names: Record<string, string> = {
    "arrays-hashing": "Arrays & Hashing",
    "two-pointers": "Two Pointers",
    "sliding-window": "Sliding Window",
    stack: "Stack",
    "binary-search": "Binary Search",
    "linked-list": "Linked List",
    trees: "Trees",
    heap: "Heap/Priority Queue",
    backtracking: "Backtracking",
    graphs: "Graphs",
    "dp-1d": "1D Dynamic Programming",
    "dp-2d": "2D Dynamic Programming",
    greedy: "Greedy",
    intervals: "Intervals",
    "bit-manipulation": "Bit Manipulation",
    trie: "Trie",
    "union-find": "Union Find",
  }
  return names[pattern] || pattern
}

function formatMisconceptionType(type: string): string {
  const names: Record<string, string> = {
    "off-by-one": "Off-by-one errors",
    "wrong-data-structure": "Data structure choice",
    "incorrect-complexity": "Time complexity",
    "missing-edge-case": "Edge case handling",
    "wrong-algorithm": "Algorithm selection",
    "logic-error": "Logic errors",
    "boundary-confusion": "Boundary conditions",
  }
  return names[type] || type
}

function getAlternativeAction(type: string): string {
  const alternatives: Record<string, string> = {
    "critical-weakness": "Skip for now and try a review problem instead",
    "skill-decay": "Skip if you remember this well - try something new",
    misconception: "Skip if you feel confident about this concept now",
    "strength-challenge": "Try an easier problem if you want to warm up first",
    "new-pattern": "Review fundamentals first if this feels too new",
  }
  return alternatives[type] || "Skip and see other recommendations"
}

// ============================================================================
// RECOMMENDATION LOGIC
// ============================================================================

/**
 * Determine recommendation type based on user profile and problem
 */
function determineRecommendationType(
  pattern: DSAPattern,
  difficulty: "easy" | "medium" | "hard",
  profile: EnhancedUserProfile,
  request: SmartRecommendationRequest
): string {
  // Check for critical weakness
  const concept = profile.knowledgeGraph.concepts.find((c) => c.parentPattern === pattern)
  if (concept && concept.predictedMastery < 30) {
    return "critical-weakness"
  }

  // Check for skill decay
  const decay = profile.temporal.skillDecay.find((sd) => sd.pattern === pattern)
  if (decay && decay.urgency === "high") {
    return "skill-decay"
  }

  // Check for misconception
  const misconception = profile.knowledgeGraph.misconceptions.find(
    (m) => m.pattern === pattern && m.status === "active"
  )
  if (misconception && misconception.frequency > 1) {
    return "misconception"
  }

  // Check for scheduled review
  const review = profile.temporal.reviewSchedule.find((r) => r.pattern === pattern)
  if (review && review.priority === "critical") {
    return "spaced-review"
  }

  // Check for weakness
  const isWeakness = profile.interviewReadiness.criticalGaps.includes(pattern)
  if (isWeakness) {
    return "weakness-practice"
  }

  // Check for strength challenge
  const isStrength = profile.interviewReadiness.strongestAreas.includes(pattern)
  if (isStrength && difficulty === "hard") {
    return "strength-challenge"
  }

  // Check for new pattern
  if (!concept || concept.practiceCount === 0) {
    return "new-pattern"
  }

  // Warmup for session start
  if (request.sessionGoal === "warmup" && difficulty === "easy") {
    return "warmup"
  }

  // Interview prep
  if (request.sessionGoal === "interview-prep" || request.targetCompany) {
    return "interview-hot"
  }

  return "daily-practice"
}

/**
 * Generate tags for a recommendation
 */
function generateTags(
  pattern: DSAPattern,
  difficulty: "easy" | "medium" | "hard",
  profile: EnhancedUserProfile,
  type: string
): RecommendationTag[] {
  const tags: RecommendationTag[] = []

  // Difficulty tag
  const difficultyColors = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
  }
  tags.push({
    text: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
    color: difficultyColors[difficulty],
  })

  // Pattern tag
  tags.push({
    text: formatPattern(pattern),
    color: "bg-blue-100 text-blue-700",
  })

  // Special tags based on type
  if (type === "interview-hot") {
    tags.push({
      text: "Interview Favorite",
      color: "bg-red-100 text-red-700",
      icon: "🔥",
    })
  }

  if (type === "critical-weakness") {
    tags.push({
      text: "Priority",
      color: "bg-purple-100 text-purple-700",
      icon: "⚡",
    })
  }

  // Prerequisite warning
  const knowledge = getPatternKnowledge(pattern)
  if (knowledge?.prerequisites) {
    const prereqsMet = knowledge.prerequisites.every((prereq) =>
      profile.knowledgeGraph.concepts.some(
        (c) => c.parentPattern === prereq && c.predictedMastery > 50
      )
    )
    if (!prereqsMet) {
      tags.push({
        text: "Has Prerequisites",
        color: "bg-orange-100 text-orange-700",
        icon: "📋",
      })
    }
  }

  return tags
}

/**
 * Calculate user readiness for a problem
 */
function calculateReadiness(
  pattern: DSAPattern,
  difficulty: "easy" | "medium" | "hard",
  profile: EnhancedUserProfile
): number {
  let readiness = 50

  // Base on pattern mastery
  const concept = profile.knowledgeGraph.concepts.find((c) => c.parentPattern === pattern)
  if (concept) {
    readiness = concept.predictedMastery
  }

  // Adjust for difficulty
  const difficultyModifiers = { easy: 20, medium: 0, hard: -20 }
  readiness += difficultyModifiers[difficulty]

  // Adjust for prerequisites
  const knowledge = getPatternKnowledge(pattern)
  if (knowledge?.prerequisites) {
    for (const prereq of knowledge.prerequisites) {
      const prereqConcept = profile.knowledgeGraph.concepts.find((c) => c.parentPattern === prereq)
      if (!prereqConcept || prereqConcept.predictedMastery < 50) {
        readiness -= 15
      }
    }
  }

  // Boost for recent practice
  const decay = profile.temporal.skillDecay.find((sd) => sd.pattern === pattern)
  if (decay && decay.daysSincePractice < 3) {
    readiness += 10
  }

  return Math.max(0, Math.min(100, readiness))
}

/**
 * Estimate time for a problem
 */
function estimateTime(
  pattern: DSAPattern,
  difficulty: "easy" | "medium" | "hard",
  profile: EnhancedUserProfile
): number {
  const baseTimes = { easy: 15, medium: 30, hard: 45 }
  let time = baseTimes[difficulty]

  // Adjust based on pattern familiarity
  const concept = profile.knowledgeGraph.concepts.find((c) => c.parentPattern === pattern)
  if (concept) {
    if (concept.predictedMastery > 70) {
      time *= 0.8 // Faster if familiar
    } else if (concept.predictedMastery < 40) {
      time *= 1.3 // Slower if unfamiliar
    }
  }

  // Adjust for learning pace
  if (profile.cognitive.patternRecognition.speed === "fast") {
    time *= 0.85
  } else if (profile.cognitive.patternRecognition.speed === "slow") {
    time *= 1.15
  }

  return Math.round(time)
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class SmartRecommendationService {
  private profileService = getEnhancedProfileService()
  private misconceptionTracker = getMisconceptionTracker()

  /**
   * Generate smart recommendations with full explanations
   */
  async getRecommendations(
    request: SmartRecommendationRequest,
    availableProblems: Array<{
      id: string
      title: string
      pattern: DSAPattern
      difficulty: "easy" | "medium" | "hard"
      company?: CompanyId
      frequency?: number
    }>
  ): Promise<SmartRecommendationResponse> {
    const startTime = Date.now()

    // Get enhanced profile
    const profile = await this.profileService.getEnhancedProfile(request.userId)

    // Filter excluded problems
    let problems = availableProblems.filter((p) => !request.excludeIds?.includes(p.id))

    // Filter by available time
    if (request.availableMinutes) {
      problems = problems.filter(
        (p) => estimateTime(p.pattern, p.difficulty, profile) <= request.availableMinutes!
      )
    }

    // Score and rank problems
    const scoredProblems = problems.map((problem) => {
      const type = determineRecommendationType(
        problem.pattern,
        problem.difficulty,
        profile,
        request
      )
      const symbol = RECOMMENDATION_SYMBOLS[type] || RECOMMENDATION_SYMBOLS["daily-practice"]
      const tags = generateTags(problem.pattern, problem.difficulty, profile, type)
      const userReadiness = calculateReadiness(problem.pattern, problem.difficulty, profile)
      const estimatedMinutes = estimateTime(problem.pattern, problem.difficulty, profile)

      // Calculate interview relevance
      let interviewRelevance = 50
      if (problem.frequency) {
        interviewRelevance = Math.min(100, problem.frequency)
      }
      if (request.targetCompany && problem.company === request.targetCompany) {
        interviewRelevance += 20
      }

      // Calculate overall score
      let score = 50
      score += (100 - symbol.priority) * 3 // Higher priority types score better
      score += userReadiness * 0.3
      score += interviewRelevance * 0.2

      // Boost for matching session goal
      if (request.sessionGoal === "warmup" && problem.difficulty === "easy") score += 20
      if (request.sessionGoal === "challenge" && problem.difficulty === "hard") score += 20
      if (request.sessionGoal === "review" && type === "spaced-review") score += 25

      const explanation = generateExplanation(type, problem.pattern, profile, {
        userReadiness,
        interviewRelevance,
      })

      // Properly validate prerequisites instead of using readiness heuristic
      let prerequisitesMet = true
      const patternKnowledge = getPatternKnowledge(problem.pattern)
      if (patternKnowledge?.prerequisites && patternKnowledge.prerequisites.length > 0) {
        prerequisitesMet = patternKnowledge.prerequisites.every((prereq) =>
          profile.knowledgeGraph.concepts.some(
            (c) => c.parentPattern === prereq && c.predictedMastery >= 50
          )
        )
      }

      return {
        id: `rec-${problem.id}`,
        problemId: problem.id,
        title: problem.title,
        pattern: problem.pattern,
        difficulty: problem.difficulty,
        symbol,
        tags,
        explanation,
        score: Math.min(100, Math.max(0, score)),
        userReadiness,
        interviewRelevance: Math.min(100, interviewRelevance),
        estimatedMinutes,
        optimalTimeOfDay:
          profile.behavioral.motivation.peakMotivationDay === "any"
            ? undefined
            : profile.behavioral.motivation.peakMotivationDay,
        prerequisitesMet,
        companyFrequency: problem.company
          ? [{ company: problem.company, frequency: problem.frequency || 50 }]
          : undefined,
      } as SmartRecommendation
    })

    // Sort by score and symbol priority
    scoredProblems.sort((a, b) => {
      if (a.symbol.priority !== b.symbol.priority) {
        return a.symbol.priority - b.symbol.priority
      }
      return b.score - a.score
    })

    // Take top recommendations
    const recommendations = scoredProblems.slice(0, request.limit || 10)

    // Generate session insights
    const sessionInsights = this.generateSessionInsights(profile, request)

    // Generate user summary
    const userSummary = this.generateUserSummary(profile)

    return {
      recommendations,
      sessionInsights,
      userSummary,
      meta: {
        generatedAt: new Date(),
        personalizationLevel:
          profile.knowledgeGraph.concepts.length > 5
            ? "full"
            : profile.knowledgeGraph.concepts.length > 0
              ? "partial"
              : "basic",
        confidenceLevel:
          profile.knowledgeGraph.concepts.length > 10
            ? "high"
            : profile.knowledgeGraph.concepts.length > 3
              ? "medium"
              : "low",
      },
    }
  }

  /**
   * Generate session-specific insights
   */
  private generateSessionInsights(
    profile: EnhancedUserProfile,
    request: SmartRecommendationRequest
  ): SessionInsight[] {
    const insights: SessionInsight[] = []

    // Fatigue warning
    if (profile.behavioral.fatigue.currentLevel === "high") {
      insights.push({
        icon: "😴",
        title: "Consider a break",
        description: "Your recent performance suggests fatigue. Quality > quantity.",
        actionable: true,
        action: "Take a 1-2 day break",
      })
    }

    // Streak celebration
    if (profile.behavioral.motivation.consistency > 80) {
      insights.push({
        icon: "🔥",
        title: "Great consistency!",
        description: `You're in the top tier for practice consistency. Keep it up!`,
        actionable: false,
      })
    }

    // Interview prep focus
    if (request.targetCompany) {
      const readiness = profile.interviewReadiness.overall
      insights.push({
        icon: readiness > 70 ? "✅" : readiness > 40 ? "📈" : "🎯",
        title: `Interview Readiness: ${readiness}%`,
        description:
          readiness > 70
            ? "You're well-prepared. Focus on edge cases and hard problems."
            : "Focus on your weak patterns to boost readiness.",
        actionable: true,
        action: readiness > 70 ? "Try mock interviews" : "Practice fundamentals",
      })
    }

    // Decay warning
    const urgentDecay = profile.temporal.skillDecay.filter((sd) => sd.urgency === "high")
    if (urgentDecay.length > 0) {
      insights.push({
        icon: "📉",
        title: `${urgentDecay.length} skill${urgentDecay.length > 1 ? "s" : ""} fading`,
        description: `${urgentDecay.map((sd) => formatPattern(sd.pattern)).join(", ")} need review`,
        actionable: true,
        action: "Include a review problem today",
      })
    }

    // Misconception alert
    const activeMisconceptions = profile.knowledgeGraph.misconceptions.filter(
      (m) => m.status === "active"
    )
    if (activeMisconceptions.length > 0) {
      insights.push({
        icon: "⚠️",
        title: "Common mistakes detected",
        description: `You tend to make ${activeMisconceptions[0].misconceptionType} errors. Targeted practice can help.`,
        actionable: true,
        action: "Try a focused exercise",
      })
    }

    // Optimal time suggestion
    if (profile.behavioral.motivation.peakMotivationDay !== "any") {
      const now = new Date()
      const isWeekend = now.getDay() === 0 || now.getDay() === 6
      const isOptimalTime =
        (profile.behavioral.motivation.peakMotivationDay === "weekend") === isWeekend

      if (!isOptimalTime) {
        insights.push({
          icon: "⏰",
          title: "Timing tip",
          description: `You perform best on ${profile.behavioral.motivation.peakMotivationDay}s. Consider a lighter session today.`,
          actionable: false,
        })
      }
    }

    return insights.slice(0, 4) // Limit to 4 insights
  }

  /**
   * Generate user summary for display
   */
  private generateUserSummary(profile: EnhancedUserProfile): UserSummary {
    // Determine level
    const avgMastery =
      profile.knowledgeGraph.concepts.length > 0
        ? profile.knowledgeGraph.concepts.reduce((sum, c) => sum + c.predictedMastery, 0) /
          profile.knowledgeGraph.concepts.length
        : 0

    const level = avgMastery > 70 ? "advanced" : avgMastery > 40 ? "intermediate" : "beginner"

    // Get strengths with scores
    const strengths = profile.interviewReadiness.strongestAreas.slice(0, 3).map((pattern) => {
      const concept = profile.knowledgeGraph.concepts.find((c) => c.parentPattern === pattern)
      return { pattern, score: concept?.predictedMastery || 70 }
    })

    // Get focus areas with reasons
    const focusAreas = profile.knowledgeGraph.gaps.slice(0, 3).map((gap) => ({
      pattern: gap.pattern,
      reason:
        gap.impact === "blocking"
          ? "Blocking progress"
          : gap.impact === "slowing"
            ? "Slowing learning"
            : "Could improve",
    }))

    // Add decay-based focus areas
    const urgentDecay = profile.temporal.skillDecay.filter((sd) => sd.urgency === "high")
    for (const sd of urgentDecay.slice(0, 2)) {
      if (!focusAreas.some((fa) => fa.pattern === sd.pattern)) {
        focusAreas.push({
          pattern: sd.pattern,
          reason: `Not practiced in ${sd.daysSincePractice} days`,
        })
      }
    }

    return {
      level,
      interviewReadiness: profile.interviewReadiness.overall,
      strengths,
      focusAreas: focusAreas.slice(0, 3),
      streak: Math.round(profile.behavioral.motivation.consistency),
      trend: profile.temporal.growth.accelerating
        ? "improving"
        : profile.temporal.growth.currentVelocity < 0
          ? "declining"
          : "stable",
    }
  }
}

// Singleton
let smartRecommendationServiceInstance: SmartRecommendationService | null = null

export function getSmartRecommendationService(): SmartRecommendationService {
  if (!smartRecommendationServiceInstance) {
    smartRecommendationServiceInstance = new SmartRecommendationService()
  }
  return smartRecommendationServiceInstance
}

// Convenience export
export async function getSmartRecommendations(
  request: SmartRecommendationRequest,
  availableProblems: Array<{
    id: string
    title: string
    pattern: DSAPattern
    difficulty: "easy" | "medium" | "hard"
    company?: CompanyId
    frequency?: number
  }>
): Promise<SmartRecommendationResponse> {
  return getSmartRecommendationService().getRecommendations(request, availableProblems)
}

/**
 * Prioritization Algorithm for Company-Specific DSA Roadmaps
 *
 * Takes user assessment data and generates a prioritized, time-aware study plan
 */

import { DSAPattern, PATTERN_ROADMAP, getPatternNode } from "@/lib/types/dsa-patterns"
import {
  CompanyQuestionData,
  UserRoadmapAssessment,
  PrioritizedQuestion,
  DailyPlan,
  PersonalizedRoadmap,
  Milestone,
} from "@/lib/data/company-questions/types"
import { getCompanyById } from "@/lib/data/company-questions"
import { DSAScenario, RoleTag } from "@/lib/scenarios"
import { formatPatternLabel } from "@/lib/pattern-labels"
import {
  PRIORITY_WEIGHTS,
  BASE_TIME_ESTIMATES,
  EXPERIENCE_TIME_MULTIPLIERS,
  MIN_QUESTIONS_PER_PATTERN,
  REVIEW_BUFFER_DAYS,
  INTERN_PRIORITY_PATTERNS,
  KNOWLEDGE_GAP_MULTIPLIERS,
  MILESTONE_COMPLETION_PERCENTAGE,
  DAILY_QUESTION_LIMITS as SHARED_DAILY_LIMITS,
  getAdjustedTimeEstimate as getAdjustedTime,
} from "./constants"

/**
 * Configuration constants for the algorithm
 * Uses shared constants from constants.ts for consistency
 */
const CONFIG = {
  weights: PRIORITY_WEIGHTS,
  timeEstimates: BASE_TIME_ESTIMATES,
  timeMultipliers: EXPERIENCE_TIME_MULTIPLIERS,
  minQuestionsPerPattern: MIN_QUESTIONS_PER_PATTERN,
  maxDailyMinutes: {
    light: 60,
    moderate: 120,
    intense: 180,
  },
  reviewBufferDays: REVIEW_BUFFER_DAYS,
  internPriorityPatterns: INTERN_PRIORITY_PATTERNS,
}

/**
 * Map a user's experience level to the seniority role tag used on questions.
 * Lets role-tagged questions (e.g. Palantir's intern vs senior split) surface
 * for the matching level. Track tags (swe/fdse) need an explicit track input
 * and are not inferred here.
 */
const EXPERIENCE_TO_ROLE: Record<UserRoadmapAssessment["experienceLevel"], RoleTag> = {
  intern: "intern",
  beginner: "new-grad",
  intermediate: "junior",
  advanced: "senior",
}

/**
 * Calculate priority score for a single question
 * Supports intern, beginner, intermediate, and advanced experience levels
 */
export function calculatePriorityScore(
  scenario: DSAScenario,
  assessment: UserRoadmapAssessment,
  companyData: CompanyQuestionData
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  const isIntern = assessment.experienceLevel === "intern"
  const isBeginnerOrIntern = isIntern || assessment.experienceLevel === "beginner"

  // 1. Company frequency score (35%)
  const patternData = companyData.topPatterns.find((p) => p.pattern === scenario.pattern)
  if (patternData) {
    const freqScore = ((patternData.frequency / 100) * patternData.priority) / 10
    score += freqScore * CONFIG.weights.companyFrequency * 100
    if (patternData.frequency >= 80) {
      reasons.push(`Top pattern at ${companyData.name} (${patternData.frequency}% frequency)`)
    }
  }

  // 1b. Intern-specific pattern bonus
  if (isIntern && CONFIG.internPriorityPatterns.includes(scenario.pattern as any)) {
    score += 15 // Bonus for fundamental patterns commonly asked in intern interviews
    if (!patternData || patternData.frequency < 80) {
      reasons.push("Core pattern for internship interviews")
    }
  }

  // 1c. Role-alignment bonus — nudge up questions tagged for the user's target
  // role (e.g. Palantir's intern/new-grad/junior/senior split).
  if (scenario.roles?.length) {
    const targetRole = EXPERIENCE_TO_ROLE[assessment.experienceLevel]
    if (targetRole && scenario.roles.includes(targetRole)) {
      score += 10
      reasons.push(`Commonly asked at the ${targetRole} level`)
    }
  }

  // 2. Must-know question bonus (25%)
  const isMustKnow = companyData.mustKnowQuestions.some((q) => q.scenarioId === scenario.id)
  if (isMustKnow) {
    score += CONFIG.weights.mustKnow * 100
    reasons.push(`Must-know question for ${companyData.name}`)
  }

  // 3. Knowledge gap score (20%)
  const familiarity = assessment.patternFamiliarity.find((p) => p.pattern === scenario.pattern)
  if (familiarity) {
    const gapMultiplier = KNOWLEDGE_GAP_MULTIPLIERS[familiarity.level]
    score += gapMultiplier * CONFIG.weights.knowledgeGap * 100
    if (familiarity.level === "unknown") {
      reasons.push("New pattern to learn")
    }
  }

  // 4. Time efficiency score (15%) - adjusted for experience level
  const daysRemaining = assessment.daysRemaining

  // For interns: prioritize easy and medium, avoid hard problems
  if (isIntern) {
    if (scenario.difficulty === "easy") {
      score += CONFIG.weights.timeEfficiency * 80
      reasons.push("Great for building fundamentals")
    } else if (scenario.difficulty === "medium") {
      score += CONFIG.weights.timeEfficiency * 60
    } else if (scenario.difficulty === "hard") {
      score -= CONFIG.weights.timeEfficiency * 80 // Strongly penalize hard for interns
      reasons.push("Consider after mastering basics")
    }
  } else if (daysRemaining < 7) {
    // Very limited time - prioritize medium difficulty
    if (scenario.difficulty === "medium") {
      score += CONFIG.weights.timeEfficiency * 100
      reasons.push("Best ROI for limited time")
    } else if (scenario.difficulty === "hard") {
      score -= CONFIG.weights.timeEfficiency * 50
    }
  } else if (daysRemaining < 14) {
    // Limited time - slight preference for medium
    if (scenario.difficulty === "medium") {
      score += CONFIG.weights.timeEfficiency * 50
    }
  } else if (daysRemaining >= 30) {
    // Plenty of time - include hard problems (but not for beginners)
    if (scenario.difficulty === "hard" && !isBeginnerOrIntern) {
      score += CONFIG.weights.timeEfficiency * 30
      reasons.push("Time available for challenging problems")
    }
  }

  // 5. Prerequisite check (5%)
  const scenarioPatternNode = PATTERN_ROADMAP.find((node) =>
    node.patterns.includes(scenario.pattern as DSAPattern)
  )

  if (scenarioPatternNode) {
    const prereqsMet = scenarioPatternNode.prerequisites.every((prereqId: string) => {
      const prereqNode = getPatternNode(prereqId)
      return prereqNode?.patterns.every((p: DSAPattern) => {
        const fam = assessment.patternFamiliarity.find((f) => f.pattern === p)
        return fam && (fam.level === "practiced" || fam.level === "confident")
      })
    })

    if (prereqsMet) {
      score += CONFIG.weights.prerequisites * 100
    } else {
      score -= CONFIG.weights.prerequisites * 50
      // More helpful message for interns
      if (isIntern) {
        reasons.push("Learn prerequisite patterns first for better understanding")
      } else {
        reasons.push("Consider learning prerequisites first")
      }
    }
  }

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    reasons,
  }
}

/**
 * Get scenarios relevant to a company
 */
export function getRelevantScenarios(
  scenarios: DSAScenario[],
  companyData: CompanyQuestionData
): DSAScenario[] {
  // Get patterns that the company cares about
  const companyPatterns = new Set(companyData.topPatterns.map((p) => p.pattern))

  // Filter scenarios that match company's patterns or are must-know
  return scenarios.filter((scenario) => {
    // Must-know questions always included
    if (companyData.mustKnowQuestions.some((q) => q.scenarioId === scenario.id)) {
      return true
    }

    // Check if pattern matches
    if (scenario.pattern && companyPatterns.has(scenario.pattern as DSAPattern)) {
      return true
    }

    // Check if company is tagged
    if (scenario.companies?.includes(companyData.name as any)) {
      return true
    }

    return false
  })
}

/**
 * Prioritize questions for a user
 */
export function prioritizeQuestions(
  scenarios: DSAScenario[],
  assessment: UserRoadmapAssessment,
  companyData: CompanyQuestionData
): PrioritizedQuestion[] {
  const relevantScenarios = getRelevantScenarios(scenarios, companyData)
  const experienceLevel = assessment.experienceLevel as
    | "intern"
    | "beginner"
    | "intermediate"
    | "advanced"

  const prioritized: PrioritizedQuestion[] = relevantScenarios.map((scenario) => {
    const { score, reasons } = calculatePriorityScore(scenario, assessment, companyData)
    const isMustKnow = companyData.mustKnowQuestions.some((q) => q.scenarioId === scenario.id)

    // Use experience-adjusted time estimate instead of base time
    const adjustedMinutes = getAdjustedTime(scenario.difficulty, experienceLevel)

    return {
      scenarioId: scenario.id,
      title: scenario.title,
      pattern: scenario.pattern as DSAPattern,
      difficulty: scenario.difficulty,
      priorityScore: score,
      estimatedMinutes: adjustedMinutes,
      reasons,
      isRequired: isMustKnow,
      dependencies: [], // Will be populated based on pattern prerequisites
    }
  })

  // Sort by priority score (highest first)
  return prioritized.sort((a, b) => b.priorityScore - a.priorityScore)
}

/**
 * Get realistic daily question limit based on experience level
 * Quality over quantity - these are achievable targets that lead to mastery
 */
function getDailyQuestionLimit(experienceLevel: string): number {
  return SHARED_DAILY_LIMITS[experienceLevel as keyof typeof SHARED_DAILY_LIMITS] || 4
}

/**
 * Build daily schedule from prioritized questions
 *
 * KEY IMPROVEMENTS:
 * 1. Enforces realistic daily question limits (not just time)
 * 2. Ensures 7-day roadmap is genuinely different from 14-day
 * 3. Prioritizes must-know questions for shorter timeframes
 */
export function buildDailySchedule(
  prioritizedQuestions: PrioritizedQuestion[],
  assessment: UserRoadmapAssessment
): DailyPlan[] {
  const dailyPlans: DailyPlan[] = []
  const availableDays = Math.max(1, assessment.daysRemaining - CONFIG.reviewBufferDays)
  const dailyMinutes = assessment.hoursPerDay * 60
  const maxQuestionsPerDay = getDailyQuestionLimit(assessment.experienceLevel)

  // For very short timeframes, focus only on must-know and high-priority
  const isCrunchMode = assessment.daysRemaining <= 7
  const isFocusedMode = assessment.daysRemaining <= 14

  // Calculate max achievable questions for this timeframe
  const maxAchievableQuestions = availableDays * maxQuestionsPerDay

  // Filter and limit questions based on priority (top N)
  let questionsToSchedule = [...prioritizedQuestions]

  // For crunch mode: be very selective, focus on required questions
  if (isCrunchMode) {
    // Prioritize required/must-know questions
    questionsToSchedule.sort((a, b) => {
      if (a.isRequired && !b.isRequired) return -1
      if (!a.isRequired && b.isRequired) return 1
      return b.priorityScore - a.priorityScore
    })
    // Limit to what's achievable
    questionsToSchedule = questionsToSchedule.slice(0, maxAchievableQuestions)
  } else if (isFocusedMode) {
    // For focused mode: prioritize high-value questions
    questionsToSchedule = questionsToSchedule.slice(
      0,
      Math.min(questionsToSchedule.length, maxAchievableQuestions * 1.1)
    )
  }

  // Group questions by pattern for thematic days
  const questionsByPattern = new Map<DSAPattern, PrioritizedQuestion[]>()
  for (const q of questionsToSchedule) {
    const existing = questionsByPattern.get(q.pattern) || []
    existing.push(q)
    questionsByPattern.set(q.pattern, existing)
  }

  // Get patterns ordered by importance
  const companyData = getCompanyById(assessment.targetCompany)
  const patternOrder = companyData?.topPatterns.map((p) => p.pattern) || []

  // Add any patterns not in company's top list
  for (const pattern of questionsByPattern.keys()) {
    if (!patternOrder.includes(pattern)) {
      patternOrder.push(pattern)
    }
  }

  // For crunch mode, limit to top 3-4 patterns only
  const effectivePatterns = isCrunchMode
    ? patternOrder.slice(0, 4)
    : isFocusedMode
      ? patternOrder.slice(0, 6)
      : patternOrder

  let currentDay = 0
  let remainingQuestions = [...questionsToSchedule]
  const today = new Date()
  // Reset to midnight in local timezone for consistent date comparison
  today.setHours(0, 0, 0, 0)

  // Distribute questions across days
  while (remainingQuestions.length > 0 && currentDay < availableDays) {
    const dayDate = new Date(today)
    dayDate.setDate(dayDate.getDate() + currentDay)

    // Determine focus pattern for today
    const focusPatternIndex = currentDay % effectivePatterns.length
    const focusPattern = effectivePatterns[focusPatternIndex]

    // Get questions for today, prioritizing focus pattern
    const todaysQuestions: PrioritizedQuestion[] = []
    let todaysMinutes = 0

    // First, add questions from focus pattern
    const patternQuestions = remainingQuestions.filter((q) => q.pattern === focusPattern)
    for (const q of patternQuestions) {
      // Check BOTH time limit AND question count limit
      if (todaysQuestions.length >= maxQuestionsPerDay) break
      if (todaysMinutes + q.estimatedMinutes <= dailyMinutes) {
        todaysQuestions.push(q)
        todaysMinutes += q.estimatedMinutes
        remainingQuestions = remainingQuestions.filter((rq) => rq.scenarioId !== q.scenarioId)
      }
    }

    // Then fill with other high-priority questions (respecting limits)
    const otherQuestions = remainingQuestions.filter((q) => q.pattern !== focusPattern)
    for (const q of otherQuestions) {
      // Check BOTH time limit AND question count limit
      if (todaysQuestions.length >= maxQuestionsPerDay) break
      if (todaysMinutes + q.estimatedMinutes <= dailyMinutes) {
        todaysQuestions.push(q)
        todaysMinutes += q.estimatedMinutes
        remainingQuestions = remainingQuestions.filter((rq) => rq.scenarioId !== q.scenarioId)
      }
    }

    // Skip empty days
    if (todaysQuestions.length === 0) {
      currentDay++
      continue
    }

    // Get unique patterns for today
    const todaysPatterns = [...new Set(todaysQuestions.map((q) => q.pattern))]

    dailyPlans.push({
      date: dayDate,
      dayNumber: currentDay + 1,
      targetMinutes: todaysMinutes,
      theme:
        todaysPatterns.length === 1
          ? `${formatPatternLabel(todaysPatterns[0])} Day`
          : `Mixed Practice`,
      focusPatterns: todaysPatterns,
      questions: todaysQuestions.map((q) => ({
        scenarioId: q.scenarioId,
        title: q.title,
        pattern: q.pattern,
        difficulty: q.difficulty,
        estimatedMinutes: q.estimatedMinutes,
        status: "pending" as const,
      })),
    })

    currentDay++
  }

  // Add review days (fewer for shorter timeframes)
  const reviewDays = isCrunchMode ? 1 : isFocusedMode ? 2 : CONFIG.reviewBufferDays
  for (let i = 0; i < reviewDays && currentDay < assessment.daysRemaining; i++) {
    const dayDate = new Date(today)
    dayDate.setDate(dayDate.getDate() + currentDay)

    dailyPlans.push({
      date: dayDate,
      dayNumber: currentDay + 1,
      targetMinutes: dailyMinutes,
      theme:
        i === 0
          ? "Review Day - Weak Areas"
          : i === 1
            ? "Review Day - Must-Know Questions"
            : "Final Review",
      focusPatterns: [],
      questions: [],
      notes:
        i === 0
          ? "Re-attempt questions you struggled with"
          : i === 1
            ? "Review all must-know questions for this company"
            : "Light review - get rest before your interview!",
    })

    currentDay++
  }

  return dailyPlans
}

/**
 * Create milestones for the roadmap
 */
export function createMilestones(
  dailyPlans: DailyPlan[],
  assessment: UserRoadmapAssessment,
  companyData: CompanyQuestionData
): Milestone[] {
  const milestones: Milestone[] = []
  const today = new Date()
  // Reset to midnight in local timezone for consistent date comparison
  today.setHours(0, 0, 0, 0)

  // Get top patterns for this company
  const topPatterns = companyData.topPatterns.slice(0, 5)

  // Create pattern mastery milestones
  for (let i = 0; i < topPatterns.length; i++) {
    const pattern = topPatterns[i]
    const patternQuestions = dailyPlans.flatMap((d) =>
      d.questions.filter((q) => {
        // Find the question's pattern
        const dayQ = dailyPlans
          .flatMap((dp) => dp.questions)
          .find((dq) => dq.scenarioId === q.scenarioId)
        return dayQ !== undefined
      })
    )

    // Find the day when this pattern should be completed
    let completionDay = 0
    let questionsForPattern = 0
    for (const plan of dailyPlans) {
      if (plan.focusPatterns.includes(pattern.pattern)) {
        questionsForPattern += plan.questions.length
        completionDay = plan.dayNumber
      }
    }

    if (questionsForPattern > 0) {
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + completionDay)

      milestones.push({
        id: `pattern-${pattern.pattern}`,
        name: `${formatPatternLabel(pattern.pattern)} Mastery`,
        description: `Complete all ${formatPatternLabel(pattern.pattern)} questions`,
        targetDate,
        requiredScenarios: [],
        bonusScenarios: [],
        isCompleted: false,
      })
    }
  }

  // Add must-know questions milestone
  const mustKnowIds = companyData.mustKnowQuestions.map((q) => q.scenarioId)
  const midPoint = Math.floor(assessment.daysRemaining * MILESTONE_COMPLETION_PERCENTAGE)
  const mustKnowDate = new Date(today)
  mustKnowDate.setDate(mustKnowDate.getDate() + midPoint)

  milestones.push({
    id: "must-know-complete",
    name: `${companyData.name} Must-Know Complete`,
    description: "Complete all must-know questions for this company",
    targetDate: mustKnowDate,
    requiredScenarios: mustKnowIds,
    bonusScenarios: [],
    isCompleted: false,
  })

  // Add final ready milestone
  const finalDate = new Date(today)
  finalDate.setDate(finalDate.getDate() + assessment.daysRemaining - 1)

  milestones.push({
    id: "interview-ready",
    name: "Interview Ready!",
    description: `You're prepared for your ${companyData.name} interview`,
    targetDate: finalDate,
    requiredScenarios: [],
    bonusScenarios: [],
    isCompleted: false,
  })

  return milestones.sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
}

// Note: DAILY_QUESTION_LIMITS imported from ./constants as SHARED_DAILY_LIMITS

/**
 * Generate a complete personalized roadmap
 *
 * IMPORTANT: Question count is based on what actually fits in available days,
 * NOT the total number of relevant questions. This ensures realistic roadmaps.
 */
export function generatePersonalizedRoadmap(
  scenarios: DSAScenario[],
  assessment: UserRoadmapAssessment,
  userId: string
): PersonalizedRoadmap | null {
  const companyData = getCompanyById(assessment.targetCompany)
  if (!companyData) {
    console.error(`Company not found: ${assessment.targetCompany}`)
    return null
  }

  // Step 1: Prioritize questions
  const prioritizedQuestions = prioritizeQuestions(scenarios, assessment, companyData)

  // Step 2: Build daily schedule (this limits questions to what fits)
  const dailyPlans = buildDailySchedule(prioritizedQuestions, assessment)

  // Step 3: Create milestones
  const milestones = createMilestones(dailyPlans, assessment, companyData)

  // CRITICAL FIX: Count ONLY questions that are actually scheduled
  // This ensures we don't show unrealistic counts like "57 problems in 7 days"
  const scheduledQuestionIds = new Set<string>()
  for (const plan of dailyPlans) {
    for (const q of plan.questions) {
      scheduledQuestionIds.add(q.scenarioId)
    }
  }

  // Get only the scheduled questions for accurate stats
  const scheduledQuestions = prioritizedQuestions.filter((q) =>
    scheduledQuestionIds.has(q.scenarioId)
  )

  // Calculate pattern coverage from SCHEDULED questions only
  const patternCoverage = new Map<DSAPattern, { total: number; completed: number }>()
  for (const q of scheduledQuestions) {
    const existing = patternCoverage.get(q.pattern) || { total: 0, completed: 0 }
    existing.total++
    patternCoverage.set(q.pattern, existing)
  }

  // Calculate total hours from SCHEDULED questions only
  const totalMinutes = scheduledQuestions.reduce((sum, q) => sum + q.estimatedMinutes, 0)

  const roadmap: PersonalizedRoadmap = {
    id: `roadmap-${userId}-${Date.now()}`,
    userId,
    targetCompany: assessment.targetCompany,
    companyName: companyData.name,
    interviewDate: assessment.interviewDate,
    createdAt: new Date(),
    updatedAt: new Date(),
    assessment,
    totalQuestions: scheduledQuestionIds.size, // FIXED: Only count scheduled questions
    totalEstimatedHours: Math.round((totalMinutes / 60) * 10) / 10,
    questionsCompleted: 0,
    questionsSkipped: 0,
    actualHoursSpent: 0,
    patternCoverage: Array.from(patternCoverage.entries()).map(([pattern, stats]) => ({
      pattern,
      total: stats.total,
      completed: stats.completed,
      percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    })),
    dailyPlans,
    milestones,
    status: "active",
    isOnTrack: true,
    daysAhead: 0,
  }

  return roadmap
}

/**
 * Recalculate roadmap based on current progress
 */
export function recalculateRoadmap(
  roadmap: PersonalizedRoadmap,
  scenarios: DSAScenario[]
): PersonalizedRoadmap {
  const companyData = getCompanyById(roadmap.targetCompany)
  if (!companyData) return roadmap

  // Calculate days remaining from now
  const now = new Date()
  const interviewDate = new Date(roadmap.interviewDate)
  const daysRemaining = Math.max(
    0,
    Math.ceil((interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )

  // Get incomplete questions
  const completedIds = new Set(
    roadmap.dailyPlans
      .flatMap((d) => d.questions)
      .filter((q) => q.status === "completed")
      .map((q) => q.scenarioId)
  )

  const skippedIds = new Set(
    roadmap.dailyPlans
      .flatMap((d) => d.questions)
      .filter((q) => q.status === "skipped")
      .map((q) => q.scenarioId)
  )

  // Update assessment with remaining time
  const updatedAssessment: UserRoadmapAssessment = {
    ...roadmap.assessment,
    daysRemaining,
  }

  // Re-prioritize remaining questions
  const remainingScenarios = scenarios.filter(
    (s) => !completedIds.has(s.id) && !skippedIds.has(s.id)
  )

  const prioritized = prioritizeQuestions(remainingScenarios, updatedAssessment, companyData)

  // Rebuild schedule for remaining days
  const newDailyPlans = buildDailySchedule(prioritized, updatedAssessment)

  // Calculate progress status
  const expectedProgress = (roadmap.dailyPlans.length - daysRemaining) / roadmap.dailyPlans.length
  const actualProgress = roadmap.questionsCompleted / roadmap.totalQuestions
  const daysAhead = Math.round(
    (actualProgress - expectedProgress) * roadmap.assessment.daysRemaining
  )

  return {
    ...roadmap,
    dailyPlans: newDailyPlans,
    updatedAt: new Date(),
    isOnTrack: daysAhead >= -1,
    daysAhead,
  }
}

/**
 * Get study recommendations based on current progress
 * Provides tailored advice for interns, beginners, and experienced candidates
 */
export function getStudyRecommendations(roadmap: PersonalizedRoadmap): string[] {
  const recommendations: string[] = []
  const isIntern = roadmap.assessment.experienceLevel === "intern"
  const isBeginnerOrIntern = isIntern || roadmap.assessment.experienceLevel === "beginner"
  const daysLeft = roadmap.assessment.daysRemaining

  // Progress-based recommendations
  if (!roadmap.isOnTrack) {
    if (roadmap.daysAhead < -3) {
      if (isIntern) {
        recommendations.push("Focus on easy and medium problems to build confidence quickly.")
        recommendations.push("Prioritize core patterns: arrays, two pointers, and basic trees.")
      } else {
        recommendations.push(
          "You're significantly behind schedule. Consider increasing daily study time."
        )
        recommendations.push("Focus on must-know questions if time is very limited.")
      }
    } else {
      recommendations.push("You're slightly behind. Try to complete one extra question today.")
    }
  }

  // Check pattern coverage
  const weakPatterns = roadmap.patternCoverage
    .filter((p) => p.percentage < 30 && p.total >= 3)
    .map((p) => p.pattern)

  if (weakPatterns.length > 0) {
    if (isIntern) {
      // Filter to show only intern-friendly patterns first
      const internFriendlyWeak = weakPatterns.filter((p) =>
        CONFIG.internPriorityPatterns.includes(p as any)
      )
      if (internFriendlyWeak.length > 0) {
        recommendations.push(
          `Start with fundamentals: ${internFriendlyWeak
            .slice(0, 2)
            .map((p) => formatPatternLabel(p))
            .join(", ")}`
        )
      } else {
        recommendations.push(
          `Focus on improving: ${weakPatterns
            .slice(0, 2)
            .map((p) => formatPatternLabel(p))
            .join(", ")}`
        )
      }
    } else {
      recommendations.push(
        `Focus on improving: ${weakPatterns
          .slice(0, 2)
          .map((p) => formatPatternLabel(p))
          .join(", ")}`
      )
    }
  }

  // Time-based recommendations with intern/experience-level considerations
  if (daysLeft <= 3) {
    if (isIntern) {
      recommendations.push("Review completed problems and get plenty of rest!")
      recommendations.push("Practice explaining your thought process out loud.")
    } else {
      recommendations.push("Final days! Focus on review and rest.")
      recommendations.push("Re-attempt any questions you struggled with.")
    }
  } else if (daysLeft <= 7) {
    if (isIntern) {
      recommendations.push("Focus on problems you can solve confidently.")
      recommendations.push("Practice clear communication - interviewers value this for interns!")
    } else {
      recommendations.push("One week left - prioritize must-know questions.")
      recommendations.push("Skip very hard problems if not comfortable.")
    }
  } else if (isIntern && daysLeft > 14) {
    // Early stage advice for interns
    const masteredPatterns = roadmap.patternCoverage.filter((p) => p.percentage >= 80).length
    if (masteredPatterns < 3) {
      recommendations.push("Master 2-3 core patterns deeply before moving on.")
      recommendations.push("Internship interviews test fundamentals - quality over quantity!")
    }
  }

  // Experience-specific tips
  if (isBeginnerOrIntern && recommendations.length < 2) {
    recommendations.push("Don't rush! Understanding the approach matters more than speed.")
  }

  return recommendations
}

/**
 * Enhanced Roadmap Generator
 *
 * Integrates all the new features:
 * - FSRS spaced repetition
 * - Interleaved practice
 * - Role-based difficulty gates
 * - Edge case handling
 * - Diagnostic quiz results
 */

import { DSAPattern } from "@/lib/types/dsa-patterns"
import {
  CompanyQuestionData,
  UserRoadmapAssessment,
  PrioritizedQuestion,
  DailyPlan,
  PersonalizedRoadmap,
  Milestone,
} from "@/lib/data/company-questions/types"
import { getCompanyById } from "@/lib/data/company-questions"
import { DSAScenario } from "@/lib/scenarios"
import { formatPatternLabel } from "@/lib/pattern-labels"

// Import new modules
import {
  ROLE_CONFIGS,
  ExperienceLevel,
  canAccessHardProblems,
  getPriorityPatterns,
  getDeprioritizedPatterns,
  getAdjustedTimeEstimate,
  INTERN_COMPANY_DATA,
} from "./role-based-config"

import {
  PATTERN_CLUSTERS,
  getPatternCluster,
  arePatternsRelated,
  buildInterleavedSchedule,
  getRecommendedStructure,
  InterleavingConfig,
  DEFAULT_INTERLEAVING_CONFIG,
} from "./interleaving-scheduler"

import {
  createFSRSCard,
  FSRSCard,
  FSRSConfig,
  DEFAULT_FSRS_CONFIG,
} from "../spaced-repetition/fsrs-algorithm"

import {
  checkRoadmapHealth,
  calculateStruggleIndicators,
  applyAdjustments,
  RoadmapAdjustments,
} from "./edge-case-handlers"

import {
  PRIORITY_WEIGHTS,
  REVIEW_BUFFER_DAYS,
  MAX_NEW_PATTERNS_PER_DAY,
  REVIEW_TO_NEW_RATIO,
  DAILY_QUESTION_LIMITS,
  KNOWLEDGE_GAP_MULTIPLIERS,
} from "./constants"

/**
 * Enhanced configuration
 */
export interface EnhancedRoadmapConfig {
  // Spaced repetition config
  fsrs: FSRSConfig

  // Interleaving config
  interleaving: InterleavingConfig

  // Weight factors for priority scoring
  weights: {
    companyRelevance: number
    spacedRepetition: number
    knowledgeGap: number
    timeEfficiency: number
    prerequisites: number
    roleAlignment: number
  }

  // Review buffer days before interview
  reviewBufferDays: number

  // Max new patterns per day (cognitive load)
  maxNewPatternsPerDay: number

  // Review to new ratio
  reviewToNewRatio: number

  // Max questions per day by experience level (realistic limits)
  maxQuestionsPerDay: {
    intern: number
    beginner: number
    intermediate: number
    advanced: number
  }
}

export const DEFAULT_ENHANCED_CONFIG: EnhancedRoadmapConfig = {
  fsrs: DEFAULT_FSRS_CONFIG,
  interleaving: DEFAULT_INTERLEAVING_CONFIG,
  // Use shared priority weights (roleAlignment is enhanced-specific, redistributed from others)
  weights: {
    companyRelevance: PRIORITY_WEIGHTS.companyFrequency - 0.05, // 0.25 (redistributed 0.05 to roleAlignment)
    spacedRepetition: PRIORITY_WEIGHTS.mustKnow, // 0.25
    knowledgeGap: PRIORITY_WEIGHTS.knowledgeGap, // 0.20
    timeEfficiency: PRIORITY_WEIGHTS.timeEfficiency, // 0.15
    prerequisites: PRIORITY_WEIGHTS.prerequisites, // 0.05
    roleAlignment: PRIORITY_WEIGHTS.roleAlignment, // 0.05
  },
  reviewBufferDays: REVIEW_BUFFER_DAYS,
  maxNewPatternsPerDay: MAX_NEW_PATTERNS_PER_DAY,
  reviewToNewRatio: REVIEW_TO_NEW_RATIO,
  // Use shared daily limits from constants
  maxQuestionsPerDay: DAILY_QUESTION_LIMITS,
}

/**
 * Enhanced priority score calculation
 */
export function calculateEnhancedPriorityScore(
  scenario: DSAScenario,
  assessment: UserRoadmapAssessment,
  companyData: CompanyQuestionData,
  fsrsState?: FSRSCard,
  config: EnhancedRoadmapConfig = DEFAULT_ENHANCED_CONFIG
): { score: number; reasons: string[]; blocked: boolean; blockReason?: string } {
  const reasons: string[] = []
  let score = 0
  const experienceLevel = assessment.experienceLevel as ExperienceLevel
  const roleConfig = ROLE_CONFIGS[experienceLevel]

  // ═══════════════════════════════════════════════════════════════
  // ROLE-BASED BLOCKING (Hard gates)
  // ═══════════════════════════════════════════════════════════════

  // Check if hard problem is allowed for this role
  if (scenario.difficulty === "hard") {
    const patternsMastered = assessment.patternFamiliarity.filter(
      (p) => p.level === "confident"
    ).length

    // Simplified check - would need more data in real implementation
    const { allowed, reason } = canAccessHardProblems(
      experienceLevel,
      patternsMastered,
      assessment.problemsSolvedEstimate || 0,
      0.7, // Default medium success rate
      assessment.daysRemaining
    )

    if (!allowed) {
      return {
        score: 0,
        reasons: [reason],
        blocked: true,
        blockReason: reason,
      }
    }
  }

  // Check if pattern should be deprioritized for this role
  const deprioritizedPatterns = getDeprioritizedPatterns(experienceLevel)
  if (deprioritizedPatterns.includes(scenario.pattern as DSAPattern)) {
    // Don't block, but heavily penalize
    score -= 30
    reasons.push(`Advanced pattern for ${experienceLevel} level`)
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPANY RELEVANCE (25%)
  // ═══════════════════════════════════════════════════════════════

  const patternData = companyData.topPatterns.find((p) => p.pattern === scenario.pattern)
  if (patternData) {
    const freqScore = (patternData.frequency / 100) * (patternData.priority / 10)
    score += freqScore * config.weights.companyRelevance * 100
    if (patternData.frequency >= 80) {
      reasons.push(`Top pattern at ${companyData.name} (${patternData.frequency}%)`)
    }
  }

  // Must-know question bonus
  const isMustKnow = companyData.mustKnowQuestions.some((q) => q.scenarioId === scenario.id)
  if (isMustKnow) {
    score += 20 // Significant bonus
    reasons.push(`Must-know for ${companyData.name}`)
  }

  // ═══════════════════════════════════════════════════════════════
  // SPACED REPETITION (25%)
  // ═══════════════════════════════════════════════════════════════

  if (fsrsState && fsrsState.state !== "new") {
    const now = new Date()
    const daysUntilDue = Math.floor(
      (fsrsState.nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilDue <= 0) {
      // Overdue - high priority
      const overdueBonus = Math.min(30, Math.abs(daysUntilDue) * 5)
      score += (25 + overdueBonus) * config.weights.spacedRepetition
      reasons.push(`Due for review (${Math.abs(daysUntilDue)} days overdue)`)
    } else if (daysUntilDue <= 1) {
      // Due today or tomorrow
      score += 20 * config.weights.spacedRepetition
      reasons.push("Due for review today")
    } else {
      // Not due yet - lower priority
      score -= Math.min(20, daysUntilDue * 2)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // KNOWLEDGE GAP (20%)
  // ═══════════════════════════════════════════════════════════════

  const familiarity = assessment.patternFamiliarity.find((p) => p.pattern === scenario.pattern)
  if (familiarity) {
    const gapMultiplier = {
      unknown: 1.0,
      seen: 0.7,
      practiced: 0.4,
      confident: 0.1,
    }[familiarity.level]
    score += gapMultiplier * config.weights.knowledgeGap * 100
    if (familiarity.level === "unknown") {
      reasons.push("New pattern to learn")
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TIME EFFICIENCY (15%)
  // ═══════════════════════════════════════════════════════════════

  const daysRemaining = assessment.daysRemaining

  // Role-specific difficulty preferences
  const difficultyPreference = roleConfig.distribution
  const difficultyBonus = {
    easy: difficultyPreference.easy > 30 ? 10 : 0,
    medium: difficultyPreference.medium > 50 ? 10 : 0,
    hard: difficultyPreference.hard > 30 ? 10 : -10,
  }[scenario.difficulty]
  score += difficultyBonus * config.weights.timeEfficiency

  // Time pressure adjustments
  if (daysRemaining < 7) {
    if (scenario.difficulty === "medium") {
      score += 15 * config.weights.timeEfficiency
      reasons.push("Best ROI for limited time")
    } else if (scenario.difficulty === "hard") {
      score -= 20 * config.weights.timeEfficiency
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ROLE ALIGNMENT (10%)
  // ═══════════════════════════════════════════════════════════════

  const priorityPatterns = getPriorityPatterns(experienceLevel, companyData.id)
  if (priorityPatterns.includes(scenario.pattern as DSAPattern)) {
    score += 15 * config.weights.roleAlignment
    if (experienceLevel === "intern") {
      reasons.push("Core pattern for internships")
    }
  }

  // Intern-specific company data
  if (experienceLevel === "intern" && INTERN_COMPANY_DATA[companyData.id]) {
    const internData = INTERN_COMPANY_DATA[companyData.id]
    if (internData.typicalPatterns.includes(scenario.pattern as DSAPattern)) {
      score += 10
      reasons.push(`Common in ${companyData.name} intern interviews`)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PREREQUISITES (5%)
  // ═══════════════════════════════════════════════════════════════

  // Check if pattern cluster prerequisites are met
  const cluster = getPatternCluster(scenario.pattern as DSAPattern)
  if (cluster) {
    // Simplified prereq check - in production would check dependency graph
    const clusterPatterns = PATTERN_CLUSTERS[cluster] || []
    const knownInCluster = clusterPatterns.filter((p) => {
      const fam = assessment.patternFamiliarity.find((f) => f.pattern === p)
      return fam && (fam.level === "practiced" || fam.level === "confident")
    }).length

    if (knownInCluster > 0) {
      score += config.weights.prerequisites * 100
    } else if (clusterPatterns.indexOf(scenario.pattern as DSAPattern) > 2) {
      // Advanced pattern in cluster without basics
      score -= config.weights.prerequisites * 50
      reasons.push("Learn basics in this area first")
    }
  }

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    reasons,
    blocked: false,
  }
}

/**
 * Enhanced question prioritization
 */
export function prioritizeQuestionsEnhanced(
  scenarios: DSAScenario[],
  assessment: UserRoadmapAssessment,
  companyData: CompanyQuestionData,
  fsrsStates: Map<string, FSRSCard>,
  config: EnhancedRoadmapConfig = DEFAULT_ENHANCED_CONFIG
): PrioritizedQuestion[] {
  const experienceLevel = assessment.experienceLevel as ExperienceLevel
  const roleConfig = ROLE_CONFIGS[experienceLevel]

  // Get relevant scenarios
  const relevantScenarios = scenarios.filter((scenario) => {
    // Must-know always included
    if (companyData.mustKnowQuestions.some((q) => q.scenarioId === scenario.id)) {
      return true
    }

    // Check if pattern is relevant to company
    const companyPatterns = new Set(companyData.topPatterns.map((p) => p.pattern))
    if (scenario.pattern && companyPatterns.has(scenario.pattern as DSAPattern)) {
      return true
    }

    // Check if tagged with company
    if (scenario.companies?.includes(companyData.name as any)) {
      return true
    }

    return false
  })

  // Calculate priority for each
  const prioritized: PrioritizedQuestion[] = []

  for (const scenario of relevantScenarios) {
    const fsrsState = fsrsStates.get(scenario.id)
    const { score, reasons, blocked, blockReason } = calculateEnhancedPriorityScore(
      scenario,
      assessment,
      companyData,
      fsrsState,
      config
    )

    if (blocked) {
      continue // Skip blocked problems
    }

    const isMustKnow = companyData.mustKnowQuestions.some((q) => q.scenarioId === scenario.id)

    // Adjust time estimate for role
    const baseMinutes = {
      easy: 25,
      medium: 40,
      hard: 60,
    }[scenario.difficulty]
    const adjustedMinutes = getAdjustedTimeEstimate(
      baseMinutes,
      scenario.difficulty,
      experienceLevel
    )

    prioritized.push({
      scenarioId: scenario.id,
      title: scenario.title,
      pattern: scenario.pattern as DSAPattern,
      difficulty: scenario.difficulty,
      priorityScore: score,
      estimatedMinutes: adjustedMinutes,
      reasons,
      isRequired: isMustKnow,
      dependencies: [],
    })
  }

  // Sort by priority
  return prioritized.sort((a, b) => b.priorityScore - a.priorityScore)
}

/**
 * Build enhanced daily schedule with interleaving
 */
export function buildEnhancedDailySchedule(
  prioritizedQuestions: PrioritizedQuestion[],
  assessment: UserRoadmapAssessment,
  config: EnhancedRoadmapConfig = DEFAULT_ENHANCED_CONFIG
): DailyPlan[] {
  const dailyPlans: DailyPlan[] = []
  const experienceLevel = assessment.experienceLevel as ExperienceLevel
  const availableDays = assessment.daysRemaining - config.reviewBufferDays
  const dailyMinutes = assessment.hoursPerDay * 60

  // Get max questions per day based on experience level
  const maxQuestionsPerDay = config.maxQuestionsPerDay[experienceLevel] || 4

  // Get recommended structure
  const structure = getRecommendedStructure(dailyMinutes, assessment.daysRemaining, experienceLevel)

  // Group questions by cluster for interleaving
  const byCluster = new Map<string, PrioritizedQuestion[]>()
  for (const q of prioritizedQuestions) {
    const cluster = getPatternCluster(q.pattern) || "other"
    const existing = byCluster.get(cluster) || []
    existing.push(q)
    byCluster.set(cluster, existing)
  }

  // Order clusters by total priority
  const clusterOrder = Array.from(byCluster.entries())
    .map(([cluster, qs]) => ({
      cluster,
      totalPriority: qs.reduce((sum, q) => sum + q.priorityScore, 0),
      avgPriority: qs.reduce((sum, q) => sum + q.priorityScore, 0) / qs.length,
    }))
    .sort((a, b) => b.avgPriority - a.avgPriority)

  let remainingQuestions = [...prioritizedQuestions]
  // Store dates using local time for consistency with user's calendar view
  // The comparison logic in utils.ts (getStoredDateComponents) handles both UTC and local formats
  const today = new Date()
  // Reset to midnight in local timezone
  today.setHours(0, 0, 0, 0)

  for (let day = 0; day < availableDays && remainingQuestions.length > 0; day++) {
    const dayDate = new Date(today)
    dayDate.setDate(dayDate.getDate() + day)

    // Determine focus cluster for today (rotate)
    // Guard against division by zero when clusterOrder is empty
    const focusClusterIndex = clusterOrder.length > 0 ? day % clusterOrder.length : 0
    const focusCluster =
      clusterOrder.length > 0 ? clusterOrder[focusClusterIndex]?.cluster || "other" : "other"

    // Build today's plan
    const todaysQuestions: PrioritizedQuestion[] = []
    let todaysMinutes = 0
    const todaysPatterns = new Set<DSAPattern>()
    let newPatternsToday = 0

    // First, add questions from focus cluster
    const clusterQuestions = remainingQuestions.filter(
      (q) => (getPatternCluster(q.pattern) || "other") === focusCluster
    )

    for (const q of clusterQuestions) {
      // Check max questions per day limit (quality over quantity)
      if (todaysQuestions.length >= maxQuestionsPerDay) {
        break
      }

      // Check cognitive load limit
      const isNewPattern = !todaysPatterns.has(q.pattern)
      if (isNewPattern && newPatternsToday >= config.maxNewPatternsPerDay) {
        continue
      }

      if (todaysMinutes + q.estimatedMinutes <= dailyMinutes) {
        todaysQuestions.push(q)
        todaysMinutes += q.estimatedMinutes
        todaysPatterns.add(q.pattern)
        if (isNewPattern) newPatternsToday++
        remainingQuestions = remainingQuestions.filter((rq) => rq.scenarioId !== q.scenarioId)
      }
    }

    // Fill with other high-priority questions (if under daily limit)
    const otherQuestions = remainingQuestions.filter(
      (q) => (getPatternCluster(q.pattern) || "other") !== focusCluster
    )

    // Track questions deferred due to cognitive load or interleaving preference
    // These will remain in remainingQuestions for the next day
    const deferredForCognitiveLoad: string[] = []

    for (const q of otherQuestions) {
      // Check max questions per day limit
      if (todaysQuestions.length >= maxQuestionsPerDay) {
        break
      }

      const isNewPattern = !todaysPatterns.has(q.pattern)
      if (isNewPattern && newPatternsToday >= config.maxNewPatternsPerDay) {
        // Deferred due to cognitive load - will be scheduled tomorrow
        deferredForCognitiveLoad.push(q.scenarioId)
        continue
      }

      // Prefer related patterns for interleaving
      const hasRelatedPattern = Array.from(todaysPatterns).some((p) =>
        arePatternsRelated(p, q.pattern)
      )

      if (todaysMinutes + q.estimatedMinutes <= dailyMinutes) {
        // Add related patterns with higher priority, but still add unrelated if there's room
        // This ensures questions aren't lost - they're either added now or stay in queue for tomorrow
        if (
          hasRelatedPattern ||
          todaysQuestions.length < 2 ||
          newPatternsToday < config.maxNewPatternsPerDay
        ) {
          todaysQuestions.push(q)
          todaysMinutes += q.estimatedMinutes
          todaysPatterns.add(q.pattern)
          if (isNewPattern) newPatternsToday++
          remainingQuestions = remainingQuestions.filter((rq) => rq.scenarioId !== q.scenarioId)
        }
        // If none of the conditions match, question stays in remainingQuestions for next day
      }
    }

    if (todaysQuestions.length === 0) continue

    // Interleave within related patterns
    const interleaved = interleaveQuestions(todaysQuestions)

    // Generate theme
    const patterns = Array.from(todaysPatterns)
    const theme = generateDayTheme(patterns, focusCluster)

    dailyPlans.push({
      date: dayDate,
      dayNumber: day + 1,
      targetMinutes: todaysMinutes,
      theme,
      focusPatterns: patterns,
      questions: interleaved.map((q) => ({
        scenarioId: q.scenarioId,
        title: q.title,
        pattern: q.pattern,
        difficulty: q.difficulty,
        estimatedMinutes: q.estimatedMinutes,
        status: "pending" as const,
      })),
    })
  }

  // Add review days
  for (let i = 0; i < config.reviewBufferDays; i++) {
    const dayDate = new Date(today)
    dayDate.setDate(dayDate.getDate() + availableDays + i)

    const reviewThemes = [
      "Review Day - Weak Areas",
      "Review Day - Must-Know Questions",
      "Final Review - Light Practice",
    ]

    dailyPlans.push({
      date: dayDate,
      dayNumber: availableDays + i + 1,
      targetMinutes: dailyMinutes * 0.5, // Lighter on review days
      theme: reviewThemes[i] || "Review Day",
      focusPatterns: [],
      questions: [],
      notes:
        i === 0
          ? "Re-attempt problems you struggled with"
          : i === 1
            ? "Review all must-know questions"
            : "Light practice - rest before your interview!",
    })
  }

  return dailyPlans
}

/**
 * Interleave questions within a day (related patterns together)
 */
function interleaveQuestions(questions: PrioritizedQuestion[]): PrioritizedQuestion[] {
  if (questions.length <= 2) return questions

  // Group by pattern
  const byPattern = new Map<DSAPattern, PrioritizedQuestion[]>()
  for (const q of questions) {
    const existing = byPattern.get(q.pattern) || []
    existing.push(q)
    byPattern.set(q.pattern, existing)
  }

  // Interleave round-robin
  const result: PrioritizedQuestion[] = []
  const patterns = Array.from(byPattern.keys())
  const indices = new Map(patterns.map((p) => [p, 0]))

  let iterations = 0
  const maxIterations = questions.length * 2

  while (result.length < questions.length && iterations < maxIterations) {
    iterations++
    for (const pattern of patterns) {
      const qs = byPattern.get(pattern) || []
      const idx = indices.get(pattern) || 0
      if (idx < qs.length) {
        result.push(qs[idx])
        indices.set(pattern, idx + 1)
      }
    }
  }

  return result
}

/**
 * Generate theme name for a day
 */
function generateDayTheme(patterns: DSAPattern[], focusCluster: string): string {
  if (patterns.length === 1) {
    return `${formatPatternLabel(patterns[0])} Focus`
  }

  const clusterNames: Record<string, string> = {
    "array-manipulation": "Array Mastery",
    "linear-structures": "Data Structures",
    "tree-operations": "Tree Practice",
    "graph-algorithms": "Graph Day",
    optimization: "Optimization Techniques",
    "dynamic-programming": "DP Challenge",
    "search-backtrack": "Search Algorithms",
    "string-algorithms": "String Processing",
  }

  return clusterNames[focusCluster] || "Mixed Practice"
}

/**
 * Create milestones for the roadmap
 */
export function createEnhancedMilestones(
  dailyPlans: DailyPlan[],
  assessment: UserRoadmapAssessment,
  companyData: CompanyQuestionData
): Milestone[] {
  const milestones: Milestone[] = []
  const today = new Date()

  // Pattern mastery milestones
  const topPatterns = companyData.topPatterns.slice(0, 5)
  for (const pattern of topPatterns) {
    // Find when this pattern should be completed
    let completionDay = 0
    for (const plan of dailyPlans) {
      if (plan.focusPatterns.includes(pattern.pattern)) {
        completionDay = Math.max(completionDay, plan.dayNumber)
      }
    }

    if (completionDay > 0) {
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + completionDay)

      milestones.push({
        id: `pattern-${pattern.pattern}`,
        name: `${formatPatternLabel(pattern.pattern)} Mastery`,
        description: `Complete all ${formatPatternLabel(pattern.pattern)} problems`,
        targetDate,
        requiredScenarios: [],
        bonusScenarios: [],
        isCompleted: false,
      })
    }
  }

  // Must-know milestone at 60% mark
  const mustKnowIds = companyData.mustKnowQuestions.map((q) => q.scenarioId)
  const midPoint = Math.floor(assessment.daysRemaining * 0.6)
  const mustKnowDate = new Date(today)
  mustKnowDate.setDate(mustKnowDate.getDate() + midPoint)

  milestones.push({
    id: "must-know-complete",
    name: `${companyData.name} Must-Know Complete`,
    description: "Complete all must-know questions",
    targetDate: mustKnowDate,
    requiredScenarios: mustKnowIds,
    bonusScenarios: [],
    isCompleted: false,
  })

  // Final milestone
  const finalDate = new Date(today)
  finalDate.setDate(finalDate.getDate() + assessment.daysRemaining - 1)

  milestones.push({
    id: "interview-ready",
    name: "Interview Ready!",
    description: `You're prepared for ${companyData.name}`,
    targetDate: finalDate,
    requiredScenarios: [],
    bonusScenarios: [],
    isCompleted: false,
  })

  return milestones.sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
}

/**
 * Generate complete enhanced roadmap
 */
export function generateEnhancedRoadmap(
  scenarios: DSAScenario[],
  assessment: UserRoadmapAssessment,
  userId: string,
  fsrsStates: Map<string, FSRSCard> = new Map(),
  config: EnhancedRoadmapConfig = DEFAULT_ENHANCED_CONFIG
): PersonalizedRoadmap | null {
  const companyData = getCompanyById(assessment.targetCompany)
  if (!companyData) {
    console.error(`Company not found: ${assessment.targetCompany}`)
    return null
  }

  // Prioritize questions with enhanced algorithm
  const prioritizedQuestions = prioritizeQuestionsEnhanced(
    scenarios,
    assessment,
    companyData,
    fsrsStates,
    config
  )

  // Build interleaved schedule
  const dailyPlans = buildEnhancedDailySchedule(prioritizedQuestions, assessment, config)

  // Create milestones
  const milestones = createEnhancedMilestones(dailyPlans, assessment, companyData)

  // Count ONLY questions that are actually scheduled in daily plans
  // This ensures we don't show unrealistic counts like "71 problems in 7 days"
  const scheduledQuestionIds = new Set<string>()
  for (const plan of dailyPlans) {
    for (const q of plan.questions) {
      scheduledQuestionIds.add(q.scenarioId)
    }
  }

  // Calculate pattern coverage from scheduled questions only
  const patternCoverage = new Map<DSAPattern, { total: number; completed: number }>()
  for (const q of prioritizedQuestions) {
    if (scheduledQuestionIds.has(q.scenarioId)) {
      const existing = patternCoverage.get(q.pattern) || { total: 0, completed: 0 }
      existing.total++
      patternCoverage.set(q.pattern, existing)
    }
  }

  // Calculate total hours from scheduled questions only
  const scheduledQuestions = prioritizedQuestions.filter((q) =>
    scheduledQuestionIds.has(q.scenarioId)
  )
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
    totalQuestions: scheduledQuestionIds.size, // Only count actually scheduled questions
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
 * Apply health-based adjustments to roadmap
 */
export function adjustRoadmapForHealth(
  roadmap: PersonalizedRoadmap,
  recentScores: number[],
  recentHintsUsed: number[],
  recentStatuses: Array<"completed" | "skipped">,
  lastSessionDate: Date | null
): {
  roadmap: PersonalizedRoadmap
  adjustments: RoadmapAdjustments
  message: string
  suggestions: string[]
} {
  // Calculate struggle indicators
  const indicators = calculateStruggleIndicators(
    roadmap,
    recentScores,
    recentHintsUsed,
    recentStatuses
  )

  // Check health
  const healthCheck = checkRoadmapHealth(roadmap, indicators, lastSessionDate)

  // Get must-know IDs for filtering
  const companyData = getCompanyById(roadmap.targetCompany)
  const mustKnowIds = new Set(companyData?.mustKnowQuestions.map((q) => q.scenarioId) || [])

  // Apply adjustments to current day's plan
  const todayIndex = roadmap.dailyPlans.findIndex((plan) => {
    const planDate = new Date(plan.date)
    const today = new Date()
    planDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return planDate.getTime() === today.getTime()
  })

  if (todayIndex >= 0 && Object.keys(healthCheck.adjustments).length > 0) {
    const adjustedPlan = applyAdjustments(
      roadmap.dailyPlans[todayIndex],
      healthCheck.adjustments,
      mustKnowIds
    )

    const adjustedPlans = [...roadmap.dailyPlans]
    adjustedPlans[todayIndex] = adjustedPlan

    return {
      roadmap: {
        ...roadmap,
        dailyPlans: adjustedPlans,
        updatedAt: new Date(),
      },
      adjustments: healthCheck.adjustments,
      message: healthCheck.message,
      suggestions: healthCheck.suggestions,
    }
  }

  return {
    roadmap,
    adjustments: {},
    message: healthCheck.message,
    suggestions: healthCheck.suggestions,
  }
}

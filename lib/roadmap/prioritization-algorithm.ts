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
  type RoadmapCategory,
  type RoadmapCategoryMix,
} from "@/lib/data/company-questions/types"
import { getCompanyById } from "@/lib/data/company-questions"
import { DSAScenario, RoleTag, type Scenario } from "@/lib/scenarios"
import { formatPatternLabel } from "@/lib/pattern-labels"
import { resolveResearchMix, CATEGORY_LABELS } from "./category-weights"
import {
  prioritizeNonDsaQuestions,
  allocateCategoryCounts,
  countByCategory,
  type NonDsaPrioritizedQuestion,
  type CategoryCounts,
} from "./category-mix"
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
 * for the matching level.
 */
export const EXPERIENCE_TO_ROLE: Record<UserRoadmapAssessment["experienceLevel"], RoleTag> = {
  intern: "intern",
  beginner: "new-grad",
  intermediate: "junior",
  advanced: "senior",
}

/**
 * Compute a role/track alignment bonus for a question given the user's
 * experience level and (optional) target track. Boosts questions tagged for the
 * matching seniority and track (e.g. FDSE), and mildly deprioritizes questions
 * that belong to the *other* track. Shared by the standard and RAG-enhanced
 * prioritizers so both rank consistently. Returns 0 for untagged questions.
 */
export function getRoleTrackAlignment(
  roles: RoleTag[] | undefined,
  assessment: Pick<UserRoadmapAssessment, "experienceLevel" | "targetTrack">
): { bonus: number; reasons: string[] } {
  if (!roles?.length) return { bonus: 0, reasons: [] }

  let bonus = 0
  const reasons: string[] = []

  const targetRole = EXPERIENCE_TO_ROLE[assessment.experienceLevel]
  if (targetRole && roles.includes(targetRole)) {
    bonus += 10
    reasons.push(`Commonly asked at the ${targetRole} level`)
  }

  const track = assessment.targetTrack
  if (track) {
    const hasTrackTag = roles.includes("swe") || roles.includes("fdse")
    if (roles.includes(track)) {
      bonus += 12
      reasons.push(`Matches your ${track.toUpperCase()} track`)
    } else if (hasTrackTag) {
      bonus -= 8
      reasons.push(`Less central to the ${track.toUpperCase()} track`)
    }
  }

  return { bonus, reasons }
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

  // 1c. Role/track alignment bonus — surface questions tagged for the user's
  // target seniority and track (e.g. Palantir FDSE vs core SWE).
  const alignment = getRoleTrackAlignment(scenario.roles, assessment)
  score += alignment.bonus
  reasons.push(...alignment.reasons)

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
      category: "dsa" as const,
      scenarioType: "dsa" as const,
      topic: formatPatternLabel(scenario.pattern as DSAPattern),
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

// ─────────────────────────────────────────────────────────────────────────────
// Category-aware composition (DSA + bugfix + decomposition)
//
// The DSA pipeline above (prioritizeQuestions / buildDailySchedule) is left
// untouched and still handles pure-DSA roadmaps. When a roadmap's mix includes
// non-DSA categories, the helpers below interleave non-DSA nodes with the DSA
// backbone.
// ─────────────────────────────────────────────────────────────────────────────

/** Common shape the mixed scheduler uses to interleave DSA and non-DSA nodes. */
interface ScheduledItem {
  scenarioId: string
  title: string
  difficulty: "easy" | "medium" | "hard"
  estimatedMinutes: number
  category: RoadmapCategory
  scenarioType: "dsa" | "bugfix" | "system-design" | "add-functionality"
  topic: string
  pattern?: DSAPattern
}

function dsaToItem(q: PrioritizedQuestion): ScheduledItem {
  return {
    scenarioId: q.scenarioId,
    title: q.title,
    difficulty: q.difficulty,
    estimatedMinutes: q.estimatedMinutes,
    category: "dsa",
    scenarioType: "dsa",
    topic: q.topic ?? formatPatternLabel(q.pattern),
    pattern: q.pattern,
  }
}

function nonDsaToItem(q: NonDsaPrioritizedQuestion): ScheduledItem {
  return {
    scenarioId: q.scenarioId,
    title: q.title,
    difficulty: q.difficulty,
    estimatedMinutes: q.estimatedMinutes,
    category: q.category,
    scenarioType: q.scenarioType,
    topic: q.topic,
  }
}

/**
 * Stratified interleave: spread each category evenly across the whole sequence
 * (by fractional within-group position) so non-DSA nodes are sprinkled through
 * the DSA-heavy list rather than clustered at the end. Within a category the
 * incoming priority order is preserved.
 */
function interleaveByCategory(groups: ScheduledItem[][]): ScheduledItem[] {
  const tagged = groups
    .filter((group) => group.length > 0)
    .flatMap((group) => group.map((item, i) => ({ item, pos: (i + 0.5) / group.length })))
  return tagged.sort((a, b) => a.pos - b.pos).map((t) => t.item)
}

function itemToNode(item: ScheduledItem): DailyPlan["questions"][number] {
  const node: DailyPlan["questions"][number] = {
    scenarioId: item.scenarioId,
    title: item.title,
    difficulty: item.difficulty,
    estimatedMinutes: item.estimatedMinutes,
    status: "pending",
    category: item.category,
    scenarioType: item.scenarioType,
    topic: item.topic,
  }
  // Only DSA nodes carry a pattern; never write undefined (Firestore rejects it).
  if (item.pattern) node.pattern = item.pattern
  return node
}

function themeForItems(items: ScheduledItem[]): string {
  const categories = new Set(items.map((i) => i.category))
  if (categories.size === 1) {
    const only = [...categories][0]
    if (only === "dsa") {
      const patterns = new Set(items.map((i) => i.pattern).filter(Boolean) as DSAPattern[])
      return patterns.size === 1 ? `${formatPatternLabel([...patterns][0])} Day` : "Mixed Practice"
    }
    return `${CATEGORY_LABELS[only]} Practice`
  }
  return "Mixed Practice"
}

/**
 * Build a daily schedule from an already-limited, interleaved mix of DSA and
 * non-DSA questions. Used when a roadmap includes non-DSA categories; pure-DSA
 * roadmaps use buildDailySchedule (unchanged).
 */
export function buildMixedDailySchedule(
  dsaPicked: PrioritizedQuestion[],
  nonDsaPicked: NonDsaPrioritizedQuestion[],
  assessment: UserRoadmapAssessment
): DailyPlan[] {
  const availableDays = Math.max(1, assessment.daysRemaining - CONFIG.reviewBufferDays)
  const dailyMinutes = assessment.hoursPerDay * 60
  const maxQuestionsPerDay = getDailyQuestionLimit(assessment.experienceLevel)

  const ordered = interleaveByCategory([
    dsaPicked.map(dsaToItem),
    nonDsaPicked.filter((q) => q.category === "bugfix").map(nonDsaToItem),
    nonDsaPicked.filter((q) => q.category === "decomposition").map(nonDsaToItem),
    nonDsaPicked.filter((q) => q.category === "system-design").map(nonDsaToItem),
  ])

  const dailyPlans: DailyPlan[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let currentDay = 0
  let index = 0
  while (index < ordered.length && currentDay < availableDays) {
    const dayItems: ScheduledItem[] = []
    let todaysMinutes = 0

    while (index < ordered.length && dayItems.length < maxQuestionsPerDay) {
      const item = ordered[index]
      // Always allow at least one item per day so a long item cannot stall.
      if (dayItems.length > 0 && todaysMinutes + item.estimatedMinutes > dailyMinutes) break
      dayItems.push(item)
      todaysMinutes += item.estimatedMinutes
      index++
    }

    if (dayItems.length === 0) {
      currentDay++
      continue
    }

    const dayDate = new Date(today)
    dayDate.setDate(dayDate.getDate() + currentDay)

    dailyPlans.push({
      date: dayDate,
      dayNumber: currentDay + 1,
      targetMinutes: todaysMinutes,
      theme: themeForItems(dayItems),
      focusPatterns: [...new Set(dayItems.map((i) => i.pattern).filter(Boolean) as DSAPattern[])],
      focusCategories: [...new Set(dayItems.map((i) => i.category))],
      questions: dayItems.map(itemToNode),
    })
    currentDay++
  }

  // Review days (mirrors buildDailySchedule).
  const isCrunchMode = assessment.daysRemaining <= 7
  const isFocusedMode = assessment.daysRemaining <= 14
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

/** Take the top-N non-DSA questions per category, respecting the allocated counts. */
function pickNonDsaByCategory(
  nonDsa: NonDsaPrioritizedQuestion[],
  targetCounts: CategoryCounts
): NonDsaPrioritizedQuestion[] {
  const picked: NonDsaPrioritizedQuestion[] = []
  const taken: Record<string, number> = {}
  for (const q of nonDsa) {
    const limit = targetCounts[q.category]
    const used = taken[q.category] ?? 0
    if (used < limit) {
      picked.push(q)
      taken[q.category] = used + 1
    }
  }
  return picked
}

/**
 * Compose the daily plans for an assessment: prioritize DSA and non-DSA
 * questions, allocate per-category counts against real inventory, and schedule
 * them. Shared by initial generation and recalculation so composition stays
 * consistent. Falls back to the pure-DSA scheduler when the mix has no non-DSA.
 */
function composePlans(
  scenarios: Scenario[],
  assessment: UserRoadmapAssessment,
  companyData: CompanyQuestionData
): { dailyPlans: DailyPlan[]; mix: RoadmapCategoryMix } {
  const mix: RoadmapCategoryMix = assessment.categoryMix ?? {
    mode: "full",
    weights: resolveResearchMix(
      assessment.experienceLevel,
      assessment.targetTrack,
      assessment.targetCompany
    ),
    source: "research-default",
  }

  const dsaPool = scenarios.filter((s): s is DSAScenario => s.type === "dsa")
  const dsaPrioritized = prioritizeQuestions(dsaPool, assessment, companyData)
  const nonDsaPrioritized = prioritizeNonDsaQuestions(scenarios, assessment, companyData)

  const availableDays = Math.max(1, assessment.daysRemaining - CONFIG.reviewBufferDays)
  const totalSlots = availableDays * getDailyQuestionLimit(assessment.experienceLevel)

  const available: CategoryCounts = {
    ...countByCategory(nonDsaPrioritized),
    dsa: dsaPrioritized.length,
  }
  const { targetCounts } = allocateCategoryCounts(mix.weights, totalSlots, available)

  const nonDsaTotal =
    targetCounts.bugfix + targetCounts.decomposition + targetCounts["system-design"]

  const dailyPlans =
    nonDsaTotal === 0
      ? buildDailySchedule(dsaPrioritized, assessment)
      : buildMixedDailySchedule(
          dsaPrioritized.slice(0, targetCounts.dsa),
          pickNonDsaByCategory(nonDsaPrioritized, targetCounts),
          assessment
        )

  return { dailyPlans, mix }
}

/**
 * Generate a complete personalized roadmap
 *
 * IMPORTANT: Question count is based on what actually fits in available days,
 * NOT the total number of relevant questions. This ensures realistic roadmaps.
 */
export function generatePersonalizedRoadmap(
  scenarios: Scenario[],
  assessment: UserRoadmapAssessment,
  userId: string
): PersonalizedRoadmap | null {
  const companyData = getCompanyById(assessment.targetCompany)
  if (!companyData) {
    console.error(`Company not found: ${assessment.targetCompany}`)
    return null
  }

  const { dailyPlans, mix } = composePlans(scenarios, assessment, companyData)
  const milestones = createMilestones(dailyPlans, assessment, companyData)

  // Count ONLY questions that are actually scheduled (realistic totals).
  const scheduledNodes = dailyPlans.flatMap((plan) => plan.questions)
  const totalMinutes = scheduledNodes.reduce((sum, q) => sum + q.estimatedMinutes, 0)

  // Pattern coverage from scheduled DSA nodes only (non-DSA carry no pattern).
  const patternCoverage = new Map<DSAPattern, { total: number; completed: number }>()
  for (const q of scheduledNodes) {
    if (!q.pattern) continue
    const existing = patternCoverage.get(q.pattern) || { total: 0, completed: 0 }
    existing.total++
    patternCoverage.set(q.pattern, existing)
  }

  // Category coverage from all scheduled nodes.
  const categoryCoverageMap = new Map<RoadmapCategory, { total: number; completed: number }>()
  for (const q of scheduledNodes) {
    const category = (q.category ?? "dsa") as RoadmapCategory
    const existing = categoryCoverageMap.get(category) || { total: 0, completed: 0 }
    existing.total++
    categoryCoverageMap.set(category, existing)
  }

  const roadmap: PersonalizedRoadmap = {
    id: `roadmap-${userId}-${Date.now()}`,
    userId,
    targetCompany: assessment.targetCompany,
    companyName: companyData.name,
    interviewDate: assessment.interviewDate,
    createdAt: new Date(),
    updatedAt: new Date(),
    assessment: { ...assessment, categoryMix: mix },
    totalQuestions: scheduledNodes.length,
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
    categoryCoverage: Array.from(categoryCoverageMap.entries()).map(([category, stats]) => ({
      category,
      total: stats.total,
      completed: stats.completed,
      percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    })),
    categoryMix: mix,
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
  scenarios: Scenario[]
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

  // Update assessment with remaining time (preserving the chosen category mix)
  const updatedAssessment: UserRoadmapAssessment = {
    ...roadmap.assessment,
    daysRemaining,
  }

  // Re-prioritize and re-schedule the remaining questions, keeping the same
  // category composition as the original roadmap.
  const remainingScenarios = scenarios.filter(
    (s) => !completedIds.has(s.id) && !skippedIds.has(s.id)
  )

  const { dailyPlans: newDailyPlans } = composePlans(
    remainingScenarios,
    updatedAssessment,
    companyData
  )

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

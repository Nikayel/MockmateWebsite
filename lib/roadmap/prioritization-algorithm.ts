/**
 * Prioritization Algorithm for Company-Specific DSA Roadmaps
 *
 * Takes user assessment data and generates a prioritized, time-aware study plan
 */

import { DSAPattern, PATTERN_ROADMAP, getPatternNode } from '@/lib/types/dsa-patterns'
import {
  CompanyQuestionData,
  UserRoadmapAssessment,
  PrioritizedQuestion,
  DailyPlan,
  PersonalizedRoadmap,
  Milestone,
  CompanyId,
} from '@/lib/data/company-questions/types'
import { getCompanyById } from '@/lib/data/company-questions'
import { DSAScenario } from '@/lib/scenarios'

/**
 * Configuration constants for the algorithm
 */
const CONFIG = {
  // Weight factors for priority scoring (should sum to 1.0)
  weights: {
    companyFrequency: 0.35,    // How often company asks this pattern
    mustKnow: 0.25,            // Is this a must-know question?
    knowledgeGap: 0.20,        // Does user need to learn this?
    timeEfficiency: 0.15,      // ROI based on time available
    prerequisites: 0.05,       // Are prerequisites met?
  },

  // Time estimates by difficulty (minutes)
  timeEstimates: {
    easy: 25,
    medium: 40,
    hard: 60,
  },

  // Minimum questions per pattern for adequate coverage
  minQuestionsPerPattern: {
    beginner: 5,
    intermediate: 3,
    advanced: 2,
  },

  // Maximum daily study time (minutes)
  maxDailyMinutes: {
    light: 60,
    moderate: 120,
    intense: 180,
  },

  // Days to leave for review before interview
  reviewBufferDays: 3,
}

/**
 * Calculate priority score for a single question
 */
export function calculatePriorityScore(
  scenario: DSAScenario,
  assessment: UserRoadmapAssessment,
  companyData: CompanyQuestionData
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // 1. Company frequency score (35%)
  const patternData = companyData.topPatterns.find(p => p.pattern === scenario.pattern)
  if (patternData) {
    const freqScore = (patternData.frequency / 100) * patternData.priority / 10
    score += freqScore * CONFIG.weights.companyFrequency * 100
    if (patternData.frequency >= 80) {
      reasons.push(`Top pattern at ${companyData.name} (${patternData.frequency}% frequency)`)
    }
  }

  // 2. Must-know question bonus (25%)
  const isMustKnow = companyData.mustKnowQuestions.some(q => q.scenarioId === scenario.id)
  if (isMustKnow) {
    score += CONFIG.weights.mustKnow * 100
    reasons.push(`Must-know question for ${companyData.name}`)
  }

  // 3. Knowledge gap score (20%)
  const familiarity = assessment.patternFamiliarity.find(p => p.pattern === scenario.pattern)
  if (familiarity) {
    const gapMultiplier = {
      unknown: 1.0,
      seen: 0.7,
      practiced: 0.4,
      confident: 0.1,
    }[familiarity.level]
    score += gapMultiplier * CONFIG.weights.knowledgeGap * 100
    if (familiarity.level === 'unknown') {
      reasons.push('New pattern to learn')
    }
  }

  // 4. Time efficiency score (15%)
  const daysRemaining = assessment.daysRemaining
  if (daysRemaining < 7) {
    // Very limited time - prioritize medium difficulty
    if (scenario.difficulty === 'medium') {
      score += CONFIG.weights.timeEfficiency * 100
      reasons.push('Best ROI for limited time')
    } else if (scenario.difficulty === 'hard') {
      score -= CONFIG.weights.timeEfficiency * 50 // Penalize hard problems
    }
  } else if (daysRemaining < 14) {
    // Limited time - slight preference for medium
    if (scenario.difficulty === 'medium') {
      score += CONFIG.weights.timeEfficiency * 50
    }
  } else if (daysRemaining >= 30) {
    // Plenty of time - include hard problems
    if (scenario.difficulty === 'hard' && assessment.experienceLevel !== 'beginner') {
      score += CONFIG.weights.timeEfficiency * 30
      reasons.push('Time available for challenging problems')
    }
  }

  // 5. Prerequisite check (5%)
  // PATTERN_ROADMAP is a flat array of PatternNode, find the one containing this pattern
  const scenarioPatternNode = PATTERN_ROADMAP.find(node =>
    node.patterns.includes(scenario.pattern as DSAPattern)
  )

  if (scenarioPatternNode) {
    const prereqsMet = scenarioPatternNode.prerequisites.every((prereqId: string) => {
      const prereqNode = getPatternNode(prereqId)
      return prereqNode?.patterns.every((p: DSAPattern) => {
        const fam = assessment.patternFamiliarity.find(f => f.pattern === p)
        return fam && (fam.level === 'practiced' || fam.level === 'confident')
      })
    })

    if (prereqsMet) {
      score += CONFIG.weights.prerequisites * 100
    } else {
      score -= CONFIG.weights.prerequisites * 50
      reasons.push('Consider learning prerequisites first')
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
  const companyPatterns = new Set(companyData.topPatterns.map(p => p.pattern))

  // Filter scenarios that match company's patterns or are must-know
  return scenarios.filter(scenario => {
    // Must-know questions always included
    if (companyData.mustKnowQuestions.some(q => q.scenarioId === scenario.id)) {
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

  const prioritized: PrioritizedQuestion[] = relevantScenarios.map(scenario => {
    const { score, reasons } = calculatePriorityScore(scenario, assessment, companyData)
    const isMustKnow = companyData.mustKnowQuestions.some(q => q.scenarioId === scenario.id)

    return {
      scenarioId: scenario.id,
      title: scenario.title,
      pattern: scenario.pattern as DSAPattern,
      difficulty: scenario.difficulty,
      priorityScore: score,
      estimatedMinutes: CONFIG.timeEstimates[scenario.difficulty],
      reasons,
      isRequired: isMustKnow,
      dependencies: [], // Will be populated based on pattern prerequisites
    }
  })

  // Sort by priority score (highest first)
  return prioritized.sort((a, b) => b.priorityScore - a.priorityScore)
}

/**
 * Build daily schedule from prioritized questions
 */
export function buildDailySchedule(
  prioritizedQuestions: PrioritizedQuestion[],
  assessment: UserRoadmapAssessment
): DailyPlan[] {
  const dailyPlans: DailyPlan[] = []
  const availableDays = assessment.daysRemaining - CONFIG.reviewBufferDays
  const dailyMinutes = assessment.hoursPerDay * 60

  // Group questions by pattern for thematic days
  const questionsByPattern = new Map<DSAPattern, PrioritizedQuestion[]>()
  for (const q of prioritizedQuestions) {
    const existing = questionsByPattern.get(q.pattern) || []
    existing.push(q)
    questionsByPattern.set(q.pattern, existing)
  }

  // Get patterns ordered by importance
  const companyData = getCompanyById(assessment.targetCompany)
  const patternOrder = companyData?.topPatterns.map(p => p.pattern) || []

  // Add any patterns not in company's top list
  for (const pattern of questionsByPattern.keys()) {
    if (!patternOrder.includes(pattern)) {
      patternOrder.push(pattern)
    }
  }

  let currentDay = 0
  let remainingQuestions = [...prioritizedQuestions]
  const today = new Date()

  // Distribute questions across days
  while (remainingQuestions.length > 0 && currentDay < availableDays) {
    const dayDate = new Date(today)
    dayDate.setDate(dayDate.getDate() + currentDay)

    // Determine focus pattern for today
    const focusPatternIndex = currentDay % patternOrder.length
    const focusPattern = patternOrder[focusPatternIndex]

    // Get questions for today, prioritizing focus pattern
    const todaysQuestions: PrioritizedQuestion[] = []
    let todaysMinutes = 0

    // First, add questions from focus pattern
    const patternQuestions = remainingQuestions.filter(q => q.pattern === focusPattern)
    for (const q of patternQuestions) {
      if (todaysMinutes + q.estimatedMinutes <= dailyMinutes) {
        todaysQuestions.push(q)
        todaysMinutes += q.estimatedMinutes
        remainingQuestions = remainingQuestions.filter(rq => rq.scenarioId !== q.scenarioId)
      }
    }

    // Then fill with other high-priority questions
    const otherQuestions = remainingQuestions.filter(q => q.pattern !== focusPattern)
    for (const q of otherQuestions) {
      if (todaysMinutes + q.estimatedMinutes <= dailyMinutes) {
        todaysQuestions.push(q)
        todaysMinutes += q.estimatedMinutes
        remainingQuestions = remainingQuestions.filter(rq => rq.scenarioId !== q.scenarioId)
      }
    }

    // Skip empty days
    if (todaysQuestions.length === 0) {
      currentDay++
      continue
    }

    // Get unique patterns for today
    const todaysPatterns = [...new Set(todaysQuestions.map(q => q.pattern))]

    dailyPlans.push({
      date: dayDate,
      dayNumber: currentDay + 1,
      targetMinutes: todaysMinutes,
      theme: todaysPatterns.length === 1
        ? `${formatPatternName(todaysPatterns[0])} Day`
        : `Mixed Practice`,
      focusPatterns: todaysPatterns,
      questions: todaysQuestions.map(q => ({
        scenarioId: q.scenarioId,
        title: q.title,
        pattern: q.pattern,
        difficulty: q.difficulty,
        estimatedMinutes: q.estimatedMinutes,
        status: 'pending' as const,
      })),
    })

    currentDay++
  }

  // Add review days
  for (let i = 0; i < CONFIG.reviewBufferDays && currentDay < assessment.daysRemaining; i++) {
    const dayDate = new Date(today)
    dayDate.setDate(dayDate.getDate() + currentDay)

    dailyPlans.push({
      date: dayDate,
      dayNumber: currentDay + 1,
      targetMinutes: dailyMinutes,
      theme: i === 0 ? 'Review Day - Weak Areas' : i === 1 ? 'Review Day - Must-Know Questions' : 'Final Review',
      focusPatterns: [],
      questions: [],
      notes: i === 0
        ? 'Re-attempt questions you struggled with'
        : i === 1
        ? 'Review all must-know questions for this company'
        : 'Light review - get rest before your interview!',
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

  // Get top patterns for this company
  const topPatterns = companyData.topPatterns.slice(0, 5)

  // Create pattern mastery milestones
  for (let i = 0; i < topPatterns.length; i++) {
    const pattern = topPatterns[i]
    const patternQuestions = dailyPlans.flatMap(d =>
      d.questions.filter(q => {
        // Find the question's pattern
        const dayQ = dailyPlans.flatMap(dp => dp.questions).find(dq => dq.scenarioId === q.scenarioId)
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
        name: `${formatPatternName(pattern.pattern)} Mastery`,
        description: `Complete all ${formatPatternName(pattern.pattern)} questions`,
        targetDate,
        requiredScenarios: [],
        bonusScenarios: [],
        isCompleted: false,
      })
    }
  }

  // Add must-know questions milestone
  const mustKnowIds = companyData.mustKnowQuestions.map(q => q.scenarioId)
  const midPoint = Math.floor(assessment.daysRemaining * 0.6)
  const mustKnowDate = new Date(today)
  mustKnowDate.setDate(mustKnowDate.getDate() + midPoint)

  milestones.push({
    id: 'must-know-complete',
    name: `${companyData.name} Must-Know Complete`,
    description: 'Complete all must-know questions for this company',
    targetDate: mustKnowDate,
    requiredScenarios: mustKnowIds,
    bonusScenarios: [],
    isCompleted: false,
  })

  // Add final ready milestone
  const finalDate = new Date(today)
  finalDate.setDate(finalDate.getDate() + assessment.daysRemaining - 1)

  milestones.push({
    id: 'interview-ready',
    name: 'Interview Ready!',
    description: `You're prepared for your ${companyData.name} interview`,
    targetDate: finalDate,
    requiredScenarios: [],
    bonusScenarios: [],
    isCompleted: false,
  })

  return milestones.sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
}

/**
 * Generate a complete personalized roadmap
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

  // Step 2: Build daily schedule
  const dailyPlans = buildDailySchedule(prioritizedQuestions, assessment)

  // Step 3: Create milestones
  const milestones = createMilestones(dailyPlans, assessment, companyData)

  // Calculate pattern coverage
  const patternCoverage = new Map<DSAPattern, { total: number; completed: number }>()
  for (const q of prioritizedQuestions) {
    const existing = patternCoverage.get(q.pattern) || { total: 0, completed: 0 }
    existing.total++
    patternCoverage.set(q.pattern, existing)
  }

  // Calculate total hours
  const totalMinutes = prioritizedQuestions.reduce((sum, q) => sum + q.estimatedMinutes, 0)

  const roadmap: PersonalizedRoadmap = {
    id: `roadmap-${userId}-${Date.now()}`,
    userId,
    targetCompany: assessment.targetCompany,
    companyName: companyData.name,
    interviewDate: assessment.interviewDate,
    createdAt: new Date(),
    updatedAt: new Date(),
    assessment,
    totalQuestions: prioritizedQuestions.length,
    totalEstimatedHours: Math.round(totalMinutes / 60 * 10) / 10,
    questionsCompleted: 0,
    questionsSkipped: 0,
    actualHoursSpent: 0,
    patternCoverage: Array.from(patternCoverage.entries()).map(([pattern, stats]) => ({
      pattern,
      total: stats.total,
      completed: stats.completed,
      percentage: 0,
    })),
    dailyPlans,
    milestones,
    status: 'active',
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
  const daysRemaining = Math.max(0, Math.ceil((interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // Get incomplete questions
  const completedIds = new Set(
    roadmap.dailyPlans
      .flatMap(d => d.questions)
      .filter(q => q.status === 'completed')
      .map(q => q.scenarioId)
  )

  const skippedIds = new Set(
    roadmap.dailyPlans
      .flatMap(d => d.questions)
      .filter(q => q.status === 'skipped')
      .map(q => q.scenarioId)
  )

  // Update assessment with remaining time
  const updatedAssessment: UserRoadmapAssessment = {
    ...roadmap.assessment,
    daysRemaining,
  }

  // Re-prioritize remaining questions
  const remainingScenarios = scenarios.filter(
    s => !completedIds.has(s.id) && !skippedIds.has(s.id)
  )

  const prioritized = prioritizeQuestions(remainingScenarios, updatedAssessment, companyData)

  // Rebuild schedule for remaining days
  const newDailyPlans = buildDailySchedule(prioritized, updatedAssessment)

  // Calculate progress status
  const expectedProgress = (roadmap.dailyPlans.length - daysRemaining) / roadmap.dailyPlans.length
  const actualProgress = roadmap.questionsCompleted / roadmap.totalQuestions
  const daysAhead = Math.round((actualProgress - expectedProgress) * roadmap.assessment.daysRemaining)

  return {
    ...roadmap,
    dailyPlans: newDailyPlans,
    updatedAt: new Date(),
    isOnTrack: daysAhead >= -1,
    daysAhead,
  }
}

/**
 * Helper: Format pattern name for display
 */
function formatPatternName(pattern: DSAPattern): string {
  return pattern
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get study recommendations based on current progress
 */
export function getStudyRecommendations(roadmap: PersonalizedRoadmap): string[] {
  const recommendations: string[] = []

  if (!roadmap.isOnTrack) {
    if (roadmap.daysAhead < -3) {
      recommendations.push('You\'re significantly behind schedule. Consider increasing daily study time.')
      recommendations.push('Focus on must-know questions if time is very limited.')
    } else {
      recommendations.push('You\'re slightly behind. Try to complete one extra question today.')
    }
  }

  // Check pattern coverage
  const weakPatterns = roadmap.patternCoverage
    .filter(p => p.percentage < 30 && p.total >= 3)
    .map(p => p.pattern)

  if (weakPatterns.length > 0) {
    recommendations.push(`Focus on improving: ${weakPatterns.slice(0, 2).map(p => formatPatternName(p)).join(', ')}`)
  }

  // Time-based recommendations
  const daysLeft = roadmap.assessment.daysRemaining
  if (daysLeft <= 3) {
    recommendations.push('Final days! Focus on review and rest.')
    recommendations.push('Re-attempt any questions you struggled with.')
  } else if (daysLeft <= 7) {
    recommendations.push('One week left - prioritize must-know questions.')
    recommendations.push('Skip very hard problems if not comfortable.')
  }

  return recommendations
}

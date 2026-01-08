/**
 * Personalized Company Guide Generator
 *
 * Uses RAG to retrieve company knowledge and algorithm to personalize
 * the interview guide based on:
 * - User's interview date (time remaining)
 * - User's current knowledge (pattern familiarity)
 * - User's experience level
 * - Company's specific interview style
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type {
  CompanyId,
  UserRoadmapAssessment,
  CompanyQuestionData,
} from "@/lib/data/company-questions/types"
import { getCompanyById } from "@/lib/data/company-questions"
import { getCompanyInterviewKnowledge } from "@/lib/rag/knowledge-base/company-knowledge"
import type { CompanyInterviewKnowledge } from "@/lib/rag/knowledge-base/types"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"

/**
 * Personalized guide output structure
 */
export interface PersonalizedCompanyGuide {
  company: CompanyQuestionData
  companyKnowledge: CompanyInterviewKnowledge | null

  // Time-based strategy
  timeStrategy: {
    phase: "crunch" | "focused" | "comprehensive" | "thorough"
    daysRemaining: number
    weeklyMilestones: string[]
    dailyRecommendation: string
    urgencyLevel: "critical" | "high" | "moderate" | "relaxed"
    warningMessage?: string
  }

  // Personalized priorities based on user's gaps + company patterns
  prioritizedPatterns: {
    pattern: DSAPattern
    companyFrequency: number
    userLevel: "unknown" | "seen" | "practiced" | "confident"
    gapScore: number // Higher = bigger gap to fill
    priority: "critical" | "high" | "medium" | "low"
    reasoning: string
    estimatedHoursToLearn: number
    tips: string[]
  }[]

  // Why we selected specific questions
  questionSelectionRationale: {
    totalQuestions: number
    byDifficulty: { easy: number; medium: number; hard: number }
    byPriority: { critical: number; high: number; medium: number; low: number }
    topReasons: string[]
    companyAlignment: string
  }

  // Personalized interview tips based on user profile
  personalizedTips: {
    category: "preparation" | "during-interview" | "technical" | "behavioral" | "mindset"
    tip: string
    reason: string // Why this tip is relevant to THIS user
    priority: number
  }[]

  // What to focus on this week
  weeklyFocus: {
    weekNumber: number
    theme: string
    patterns: DSAPattern[]
    goals: string[]
    mustKnowQuestions: string[]
  }

  // Company-specific insights
  companyInsights: {
    interviewSignature: string // What makes this company unique
    commonMistakes: string[]
    successFactors: string[]
    hiddenExpectations: string[]
  }

  // Progress-adjusted recommendations
  adaptiveRecommendations: {
    type: "speed-up" | "slow-down" | "pivot" | "maintain" | "review"
    message: string
    actionItems: string[]
  }[]
}

/**
 * Time phase configuration
 */
const TIME_PHASES = {
  crunch: {
    maxDays: 7,
    focus: "Must-know questions and most frequent patterns only",
    dailyHoursMin: 3,
    patternLimit: 5,
  },
  focused: {
    maxDays: 21,
    focus: "High-frequency patterns with targeted practice",
    dailyHoursMin: 2,
    patternLimit: 8,
  },
  comprehensive: {
    maxDays: 45,
    focus: "Full pattern coverage with balanced practice",
    dailyHoursMin: 1.5,
    patternLimit: 12,
  },
  thorough: {
    maxDays: Infinity,
    focus: "Deep mastery with system design and behavioral prep",
    dailyHoursMin: 1,
    patternLimit: 15,
  },
}

/**
 * Experience level configurations
 */
const EXPERIENCE_CONFIG: Record<
  "intern" | "beginner" | "intermediate" | "advanced",
  {
    difficultyFocus: { easy: number; medium: number; hard: number }
    priorityPatterns: string[]
    avoidPatterns: string[]
    timeMultiplier: number
    tipFocus: string
  }
> = {
  intern: {
    difficultyFocus: { easy: 40, medium: 55, hard: 5 },
    priorityPatterns: [
      "arrays-hashing",
      "two-pointers",
      "sliding-window",
      "binary-search",
      "stack",
      "trees",
      "string",
    ],
    avoidPatterns: ["dp-2d", "dp-tree", "advanced-graphs", "segment-tree"],
    timeMultiplier: 1.5,
    tipFocus: "fundamentals",
  },
  beginner: {
    difficultyFocus: { easy: 30, medium: 55, hard: 15 },
    priorityPatterns: [
      "arrays-hashing",
      "two-pointers",
      "binary-search",
      "trees",
      "bfs",
      "dfs",
      "dp-1d",
    ],
    avoidPatterns: ["dp-tree", "segment-tree"],
    timeMultiplier: 1.3,
    tipFocus: "pattern-recognition",
  },
  intermediate: {
    difficultyFocus: { easy: 20, medium: 55, hard: 25 },
    priorityPatterns: [], // All patterns fair game
    avoidPatterns: [],
    timeMultiplier: 1.0,
    tipFocus: "optimization",
  },
  advanced: {
    difficultyFocus: { easy: 10, medium: 50, hard: 40 },
    priorityPatterns: [], // Focus on hard patterns
    avoidPatterns: [],
    timeMultiplier: 0.8,
    tipFocus: "edge-cases",
  },
}

/**
 * Generate a personalized company guide
 */
export function generatePersonalizedGuide(
  assessment: UserRoadmapAssessment,
  selectedQuestionCount?: number
): PersonalizedCompanyGuide | null {
  // Get company data
  const company = getCompanyById(assessment.targetCompany)
  if (!company) return null

  // Get RAG-enhanced company knowledge (convert undefined to null)
  const companyKnowledge = getCompanyInterviewKnowledge(assessment.targetCompany) ?? null

  // Generate time strategy
  const timeStrategy = generateTimeStrategy(assessment)

  // Generate prioritized patterns
  const prioritizedPatterns = generatePrioritizedPatterns(assessment, company, companyKnowledge)

  // Generate question selection rationale
  const questionSelectionRationale = generateQuestionRationale(
    assessment,
    company,
    prioritizedPatterns,
    selectedQuestionCount
  )

  // Generate personalized tips
  const personalizedTips = generatePersonalizedTips(
    assessment,
    company,
    companyKnowledge,
    timeStrategy
  )

  // Generate weekly focus
  const weeklyFocus = generateWeeklyFocus(assessment, prioritizedPatterns)

  // Generate company insights
  const companyInsights = generateCompanyInsights(company, companyKnowledge, assessment)

  // Generate adaptive recommendations
  const adaptiveRecommendations = generateAdaptiveRecommendations(assessment, prioritizedPatterns)

  return {
    company,
    companyKnowledge,
    timeStrategy,
    prioritizedPatterns,
    questionSelectionRationale,
    personalizedTips,
    weeklyFocus,
    companyInsights,
    adaptiveRecommendations,
  }
}

/**
 * Generate time-based strategy
 */
function generateTimeStrategy(
  assessment: UserRoadmapAssessment
): PersonalizedCompanyGuide["timeStrategy"] {
  const { daysRemaining, hoursPerDay, experienceLevel } = assessment

  // Determine phase
  let phase: "crunch" | "focused" | "comprehensive" | "thorough"
  if (daysRemaining <= TIME_PHASES.crunch.maxDays) {
    phase = "crunch"
  } else if (daysRemaining <= TIME_PHASES.focused.maxDays) {
    phase = "focused"
  } else if (daysRemaining <= TIME_PHASES.comprehensive.maxDays) {
    phase = "comprehensive"
  } else {
    phase = "thorough"
  }

  // Calculate urgency
  const totalHours = daysRemaining * hoursPerDay
  const experienceMultiplier = EXPERIENCE_CONFIG[experienceLevel].timeMultiplier
  const effectiveHours = totalHours / experienceMultiplier

  let urgencyLevel: "critical" | "high" | "moderate" | "relaxed"
  let warningMessage: string | undefined

  if (effectiveHours < 20) {
    urgencyLevel = "critical"
    warningMessage = `With only ${Math.round(effectiveHours)} effective hours, focus ONLY on must-know questions for ${assessment.targetCompany}.`
  } else if (effectiveHours < 50) {
    urgencyLevel = "high"
    warningMessage = `Limited time. Prioritize high-frequency patterns and skip edge cases.`
  } else if (effectiveHours < 100) {
    urgencyLevel = "moderate"
  } else {
    urgencyLevel = "relaxed"
  }

  // Generate weekly milestones
  const weeks = Math.ceil(daysRemaining / 7)
  const weeklyMilestones = generateWeeklyMilestones(phase, weeks, experienceLevel)

  // Daily recommendation
  const dailyRecommendation = generateDailyRecommendation(phase, hoursPerDay, experienceLevel)

  return {
    phase,
    daysRemaining,
    weeklyMilestones,
    dailyRecommendation,
    urgencyLevel,
    warningMessage,
  }
}

/**
 * Generate weekly milestones based on phase
 */
function generateWeeklyMilestones(
  phase: "crunch" | "focused" | "comprehensive" | "thorough",
  weeks: number,
  experienceLevel: string
): string[] {
  const milestones: string[] = []

  if (phase === "crunch") {
    milestones.push("Day 1-2: Master must-know questions")
    milestones.push("Day 3-4: Practice top 3 patterns")
    milestones.push("Day 5-6: Mock interviews & review")
    milestones.push("Day 7: Light review & rest")
  } else if (phase === "focused") {
    for (let w = 1; w <= Math.min(weeks, 3); w++) {
      if (w === 1)
        milestones.push("Week 1: Foundation patterns (Arrays, Two Pointers, Binary Search)")
      else if (w === 2) milestones.push("Week 2: Core patterns (Trees, Graphs, DP basics)")
      else if (w === 3) milestones.push("Week 3: Company must-knows & mock interviews")
    }
  } else if (phase === "comprehensive") {
    for (let w = 1; w <= Math.min(weeks, 6); w++) {
      if (w === 1) milestones.push("Week 1: Arrays, Strings, Two Pointers")
      else if (w === 2) milestones.push("Week 2: Binary Search, Sliding Window")
      else if (w === 3) milestones.push("Week 3: Trees, BFS/DFS")
      else if (w === 4) milestones.push("Week 4: Graphs, Dynamic Programming")
      else if (w === 5) milestones.push("Week 5: Advanced patterns & company specifics")
      else if (w === 6) milestones.push("Week 6: Mock interviews & review")
    }
  } else {
    milestones.push("Weeks 1-2: Foundation patterns")
    milestones.push("Weeks 3-4: Intermediate patterns")
    milestones.push("Weeks 5-6: Advanced patterns")
    milestones.push("Week 7+: System design & behavioral")
    milestones.push("Final weeks: Mock interviews & polish")
  }

  return milestones
}

/**
 * Generate daily recommendation
 */
function generateDailyRecommendation(
  phase: "crunch" | "focused" | "comprehensive" | "thorough",
  hoursPerDay: number,
  experienceLevel: string
): string {
  const problemsPerHour =
    experienceLevel === "intern" ? 0.8 : experienceLevel === "beginner" ? 1 : 1.5
  const dailyProblems = Math.round(hoursPerDay * problemsPerHour)

  if (phase === "crunch") {
    return `Focus on ${dailyProblems} must-know problems daily. Skip explanations, maximize practice.`
  } else if (phase === "focused") {
    return `Solve ${dailyProblems} problems daily: ${Math.ceil(dailyProblems * 0.3)} easy + ${Math.ceil(dailyProblems * 0.6)} medium + ${Math.floor(dailyProblems * 0.1)} hard.`
  } else if (phase === "comprehensive") {
    return `Target ${dailyProblems} problems with 30 min review. Include 1 hard problem every 2-3 days.`
  } else {
    return `${dailyProblems} problems with deep understanding. Include system design practice weekly.`
  }
}

/**
 * Generate prioritized patterns based on user gaps and company frequency
 */
function generatePrioritizedPatterns(
  assessment: UserRoadmapAssessment,
  company: CompanyQuestionData,
  companyKnowledge: CompanyInterviewKnowledge | null
): PersonalizedCompanyGuide["prioritizedPatterns"] {
  const { patternFamiliarity, experienceLevel, daysRemaining } = assessment
  const expConfig = EXPERIENCE_CONFIG[experienceLevel]

  const prioritized: PersonalizedCompanyGuide["prioritizedPatterns"] = []

  // Get company's top patterns
  const companyPatterns = company.topPatterns || []

  // Get knowledge base patterns
  const kbPatterns = companyKnowledge?.topPatterns || []

  // Merge and dedupe
  const allPatterns = new Map<DSAPattern, { frequency: number; tips: string[] }>()

  for (const cp of companyPatterns) {
    allPatterns.set(cp.pattern, { frequency: cp.frequency, tips: [] })
  }

  for (const kp of kbPatterns) {
    const existing = allPatterns.get(kp.pattern)
    if (existing) {
      existing.tips = kp.tips || []
    } else {
      allPatterns.set(kp.pattern, { frequency: kp.frequency, tips: kp.tips || [] })
    }
  }

  // Score each pattern
  for (const [pattern, data] of allPatterns) {
    // Skip patterns not suitable for experience level
    if (expConfig.avoidPatterns.includes(pattern)) continue

    // Find user's familiarity
    const familiarity = patternFamiliarity.find((p) => p.pattern === pattern)
    const userLevel = familiarity?.level || "unknown"

    // Calculate gap score (higher = bigger gap)
    const levelScore = {
      unknown: 100,
      seen: 70,
      practiced: 40,
      confident: 10,
    }[userLevel]

    // Calculate priority based on company frequency + user gap
    const companyWeight = data.frequency // 0-100
    const gapWeight = levelScore // 0-100
    const totalScore = companyWeight * 0.6 + gapWeight * 0.4

    // Determine priority
    let priority: "critical" | "high" | "medium" | "low"
    if (totalScore >= 80 && userLevel !== "confident") {
      priority = "critical"
    } else if (totalScore >= 60) {
      priority = "high"
    } else if (totalScore >= 40) {
      priority = "medium"
    } else {
      priority = "low"
    }

    // Generate reasoning
    const reasoning = generatePatternReasoning(pattern, data.frequency, userLevel, company.name)

    // Estimate hours to learn
    const baseHours =
      userLevel === "unknown" ? 10 : userLevel === "seen" ? 6 : userLevel === "practiced" ? 3 : 1
    const estimatedHours = Math.round(baseHours * expConfig.timeMultiplier)

    // Get tips from pattern knowledge base
    const patternKnowledge = getPatternKnowledge(pattern)
    const tips = data.tips.length > 0 ? data.tips : patternKnowledge?.keyInsights?.slice(0, 3) || []

    prioritized.push({
      pattern,
      companyFrequency: data.frequency,
      userLevel,
      gapScore: totalScore,
      priority,
      reasoning,
      estimatedHoursToLearn: estimatedHours,
      tips,
    })
  }

  // Sort by gap score (descending)
  prioritized.sort((a, b) => b.gapScore - a.gapScore)

  // Limit based on time available
  const maxPatterns = daysRemaining <= 7 ? 5 : daysRemaining <= 21 ? 8 : 12
  return prioritized.slice(0, maxPatterns)
}

/**
 * Generate reasoning for pattern prioritization
 */
function generatePatternReasoning(
  pattern: DSAPattern,
  frequency: number,
  userLevel: string,
  companyName: string
): string {
  const frequencyDesc =
    frequency >= 80 ? "very frequently" : frequency >= 60 ? "frequently" : "occasionally"

  if (userLevel === "unknown" && frequency >= 70) {
    return `Critical gap: ${companyName} asks ${pattern} ${frequencyDesc} and you haven't practiced it yet.`
  } else if (userLevel === "seen" && frequency >= 60) {
    return `High priority: You've seen ${pattern} but need more practice. ${companyName} asks this ${frequencyDesc}.`
  } else if (userLevel === "practiced" && frequency >= 80) {
    return `Review needed: ${pattern} is core to ${companyName} interviews. Solidify your skills.`
  } else if (userLevel === "confident") {
    return `Maintenance: Keep ${pattern} sharp with occasional practice.`
  }
  return `${companyName} asks ${pattern} ${frequencyDesc}. Current level: ${userLevel}.`
}

/**
 * Generate question selection rationale
 */
function generateQuestionRationale(
  assessment: UserRoadmapAssessment,
  company: CompanyQuestionData,
  prioritizedPatterns: PersonalizedCompanyGuide["prioritizedPatterns"],
  selectedQuestionCount?: number
): PersonalizedCompanyGuide["questionSelectionRationale"] {
  const expConfig = EXPERIENCE_CONFIG[assessment.experienceLevel]
  const totalQuestions =
    selectedQuestionCount || Math.round(assessment.daysRemaining * assessment.hoursPerDay * 1.5)

  // Calculate distribution
  const byDifficulty = {
    easy: Math.round((totalQuestions * expConfig.difficultyFocus.easy) / 100),
    medium: Math.round((totalQuestions * expConfig.difficultyFocus.medium) / 100),
    hard: Math.round((totalQuestions * expConfig.difficultyFocus.hard) / 100),
  }

  // Priority distribution
  const criticalPatterns = prioritizedPatterns.filter((p) => p.priority === "critical").length
  const highPatterns = prioritizedPatterns.filter((p) => p.priority === "high").length

  const byPriority = {
    critical: Math.round(totalQuestions * 0.3),
    high: Math.round(totalQuestions * 0.35),
    medium: Math.round(totalQuestions * 0.25),
    low: Math.round(totalQuestions * 0.1),
  }

  // Top reasons
  const topReasons: string[] = []

  if (criticalPatterns > 0) {
    topReasons.push(
      `${criticalPatterns} critical pattern gaps identified that ${company.name} frequently tests`
    )
  }

  if (company.mustKnowQuestions.length > 0) {
    topReasons.push(
      `${company.mustKnowQuestions.length} must-know questions reported in recent ${company.name} interviews`
    )
  }

  const topPattern = prioritizedPatterns[0]
  if (topPattern) {
    topReasons.push(
      `${topPattern.pattern} is your biggest gap (${topPattern.companyFrequency}% frequency at ${company.name})`
    )
  }

  if (assessment.experienceLevel === "intern") {
    topReasons.push("Questions weighted toward fundamentals appropriate for internship interviews")
  }

  // Company alignment
  const companyAlignment = `Selected questions align with ${company.name}'s ${company.interviewStyle.pace} interview pace and ${company.interviewStyle.optimalSolutionRequired ? "requirement for optimal solutions" : "focus on working solutions"}.`

  return {
    totalQuestions,
    byDifficulty,
    byPriority,
    topReasons,
    companyAlignment,
  }
}

/**
 * Generate personalized tips
 */
function generatePersonalizedTips(
  assessment: UserRoadmapAssessment,
  company: CompanyQuestionData,
  companyKnowledge: CompanyInterviewKnowledge | null,
  timeStrategy: PersonalizedCompanyGuide["timeStrategy"]
): PersonalizedCompanyGuide["personalizedTips"] {
  const tips: PersonalizedCompanyGuide["personalizedTips"] = []
  const { experienceLevel, daysRemaining, patternFamiliarity } = assessment

  // Time-based tips
  if (timeStrategy.urgencyLevel === "critical") {
    tips.push({
      category: "preparation",
      tip: "Focus only on must-know questions. Skip patterns you're confident in.",
      reason: `With ${daysRemaining} days left, maximizing ROI is critical.`,
      priority: 10,
    })
  }

  // Company style tips
  if (company.interviewStyle.pace === "fast") {
    tips.push({
      category: "during-interview",
      tip: `Practice solving problems in ${Math.round(45 / 2)} minutes or less. ${company.name} expects multiple problems per round.`,
      reason: `${company.name} has a fast-paced interview style.`,
      priority: 9,
    })
  }

  if (company.interviewStyle.communicationEmphasis >= 8) {
    tips.push({
      category: "during-interview",
      tip: "Verbalize your thought process constantly. Explain before you code.",
      reason: `${company.name} rates communication at ${company.interviewStyle.communicationEmphasis}/10.`,
      priority: 9,
    })
  }

  if (!company.interviewStyle.allowsPseudocode) {
    tips.push({
      category: "technical",
      tip: "Write syntactically correct, runnable code. No pseudocode.",
      reason: `${company.name} requires working code, not pseudocode.`,
      priority: 8,
    })
  }

  // Experience-level tips
  if (experienceLevel === "intern") {
    tips.push({
      category: "mindset",
      tip: "You're evaluated on learning potential, not expertise. Show enthusiasm and ask clarifying questions.",
      reason: "Intern interviews assess growth potential over perfection.",
      priority: 8,
    })
    tips.push({
      category: "preparation",
      tip: "Skip hard problems. Master easy/medium thoroughly instead.",
      reason: "Intern interviews rarely include hard problems.",
      priority: 7,
    })
  }

  // Gap-based tips
  const unknownPatterns = patternFamiliarity.filter((p) => p.level === "unknown")
  if (unknownPatterns.length >= 5) {
    tips.push({
      category: "preparation",
      tip: "You have many unfamiliar patterns. Start with pattern tutorials before diving into problems.",
      reason: `${unknownPatterns.length} patterns marked as unknown.`,
      priority: 8,
    })
  }

  // Company knowledge tips
  if (companyKnowledge?.dosDonts) {
    companyKnowledge.dosDonts.dos.slice(0, 2).forEach((doTip: string, i: number) => {
      tips.push({
        category: "during-interview",
        tip: doTip,
        reason: `Insider tip for ${company.name} interviews.`,
        priority: 7 - i,
      })
    })

    companyKnowledge.dosDonts.donts.slice(0, 2).forEach((dontTip: string, i: number) => {
      tips.push({
        category: "during-interview",
        tip: `Avoid: ${dontTip}`,
        reason: `Common mistake at ${company.name}.`,
        priority: 6 - i,
      })
    })
  }

  // Culture tips
  if (companyKnowledge?.cultureTips) {
    tips.push({
      category: "behavioral",
      tip: companyKnowledge.cultureTips[0],
      reason: `${company.name} culture focus.`,
      priority: 6,
    })
  }

  // Sort by priority
  tips.sort((a, b) => b.priority - a.priority)

  return tips.slice(0, 10)
}

/**
 * Generate weekly focus
 */
function generateWeeklyFocus(
  assessment: UserRoadmapAssessment,
  prioritizedPatterns: PersonalizedCompanyGuide["prioritizedPatterns"]
): PersonalizedCompanyGuide["weeklyFocus"] {
  const weekNumber = 1 // Current week
  const criticalPatterns = prioritizedPatterns.filter((p) => p.priority === "critical")
  const highPatterns = prioritizedPatterns.filter((p) => p.priority === "high")

  // Get top patterns for this week
  const thisWeekPatterns = [...criticalPatterns.slice(0, 2), ...highPatterns.slice(0, 2)].slice(
    0,
    3
  )

  const patterns = thisWeekPatterns.map((p) => p.pattern)
  const theme =
    thisWeekPatterns.length > 0
      ? `Master ${thisWeekPatterns[0].pattern} fundamentals`
      : "Foundation building"

  // Generate goals
  const goals: string[] = []
  thisWeekPatterns.forEach((p) => {
    if (p.userLevel === "unknown") {
      goals.push(`Learn ${p.pattern} basics and solve 3-5 easy problems`)
    } else if (p.userLevel === "seen") {
      goals.push(`Practice ${p.pattern} with 5+ medium problems`)
    } else {
      goals.push(`Solidify ${p.pattern} with 2-3 hard variations`)
    }
  })

  if (goals.length === 0) {
    goals.push("Review your strongest patterns")
    goals.push("Practice timed mock interviews")
  }

  // Must-know questions
  const company = getCompanyById(assessment.targetCompany)
  const mustKnowQuestions =
    company?.mustKnowQuestions
      .filter((q) => thisWeekPatterns.some((p) => p.pattern === q.scenarioId?.split("-")[0]))
      .slice(0, 3)
      .map((q) => q.title) || []

  return {
    weekNumber,
    theme,
    patterns,
    goals,
    mustKnowQuestions,
  }
}

/**
 * Generate company insights
 */
function generateCompanyInsights(
  company: CompanyQuestionData,
  companyKnowledge: CompanyInterviewKnowledge | null,
  assessment: UserRoadmapAssessment
): PersonalizedCompanyGuide["companyInsights"] {
  // Interview signature
  const signatures: string[] = []

  if (company.interviewStyle.pace === "fast") {
    signatures.push("fast-paced with multiple problems per round")
  }
  if (company.interviewStyle.optimalSolutionRequired) {
    signatures.push("expects optimal solutions")
  }
  if (company.interviewStyle.communicationEmphasis >= 8) {
    signatures.push("heavily weights communication")
  }
  if (!company.interviewStyle.providesHints) {
    signatures.push("minimal hints provided")
  }

  const interviewSignature = `${company.name} interviews are ${signatures.join(", ") || "balanced across all dimensions"}.`

  // Common mistakes
  const commonMistakes = companyKnowledge?.dosDonts.donts || [
    "Jumping into code without clarifying requirements",
    "Not discussing time/space complexity",
    "Ignoring edge cases",
  ]

  // Success factors
  const successFactors = companyKnowledge?.dosDonts.dos || [
    "Think out loud and explain your approach",
    "Ask clarifying questions",
    "Test your code with examples",
  ]

  // Hidden expectations
  const hiddenExpectations: string[] = []

  if (company.interviewStyle.codeQualityEmphasis >= 8) {
    hiddenExpectations.push("Clean, production-quality code matters more than speed")
  }

  if (company.id === "amazon") {
    hiddenExpectations.push("Leadership Principles are evaluated in EVERY round")
  } else if (company.id === "google") {
    hiddenExpectations.push("Googleyness (culture fit) is a separate hiring signal")
  } else if (company.id === "meta") {
    hiddenExpectations.push("Speed matters - practice solving 2 problems in 45 minutes")
  }

  if (company.interviewStyle.uniqueTraits) {
    company.interviewStyle.uniqueTraits.slice(0, 2).forEach((trait) => {
      if (!hiddenExpectations.includes(trait)) {
        hiddenExpectations.push(trait)
      }
    })
  }

  return {
    interviewSignature,
    commonMistakes: commonMistakes.slice(0, 5),
    successFactors: successFactors.slice(0, 5),
    hiddenExpectations: hiddenExpectations.slice(0, 4),
  }
}

/**
 * Generate adaptive recommendations
 */
function generateAdaptiveRecommendations(
  assessment: UserRoadmapAssessment,
  prioritizedPatterns: PersonalizedCompanyGuide["prioritizedPatterns"]
): PersonalizedCompanyGuide["adaptiveRecommendations"] {
  const recommendations: PersonalizedCompanyGuide["adaptiveRecommendations"] = []

  const criticalGaps = prioritizedPatterns.filter(
    (p) => p.priority === "critical" && p.userLevel === "unknown"
  )
  const totalEstimatedHours = prioritizedPatterns.reduce(
    (sum, p) => sum + p.estimatedHoursToLearn,
    0
  )
  const availableHours = assessment.daysRemaining * assessment.hoursPerDay

  // Time crunch detection
  if (totalEstimatedHours > availableHours * 1.5) {
    recommendations.push({
      type: "speed-up",
      message: `You have ${Math.round(availableHours)} hours but need ~${Math.round(totalEstimatedHours)} hours for full coverage.`,
      actionItems: [
        "Focus only on critical and high priority patterns",
        "Skip low-priority patterns entirely",
        "Use pattern videos instead of reading for faster learning",
      ],
    })
  }

  // Critical gap alert
  if (criticalGaps.length >= 3) {
    recommendations.push({
      type: "pivot",
      message: `${criticalGaps.length} critical pattern gaps found. Restructure your study plan.`,
      actionItems: criticalGaps
        .slice(0, 3)
        .map((g) => `Learn ${g.pattern} immediately (${g.companyFrequency}% frequency)`),
    })
  }

  // Overconfidence check
  const confidentPatterns = assessment.patternFamiliarity.filter((p) => p.level === "confident")
  if (confidentPatterns.length >= 8 && assessment.problemsSolvedEstimate < 100) {
    recommendations.push({
      type: "review",
      message: "You marked many patterns as confident but have solved relatively few problems.",
      actionItems: [
        "Verify confidence with timed practice",
        'Try hard variations of "confident" patterns',
        "Consider re-assessing your pattern familiarity",
      ],
    })
  }

  // Good progress
  if (criticalGaps.length === 0 && totalEstimatedHours <= availableHours) {
    recommendations.push({
      type: "maintain",
      message: "You're in good shape! Maintain steady practice.",
      actionItems: [
        "Focus on medium/hard problems",
        "Add mock interview practice",
        "Review your weaker patterns periodically",
      ],
    })
  }

  return recommendations
}

/**
 * Export convenience function
 */
export function getPersonalizedGuide(
  assessment: UserRoadmapAssessment
): PersonalizedCompanyGuide | null {
  return generatePersonalizedGuide(assessment)
}

/**
 * Score Accumulator - Real-time score calculation without AI
 *
 * This module provides deterministic score calculations that can run
 * instantly during the interview, enabling two-phase feedback:
 * 1. Instant: Algorithmic scores (this module)
 * 2. Background: AI-enhanced narrative feedback
 */

export interface ScoreSignals {
  // Test results
  testsPassed: number
  testsTotal: number

  // Code quality
  efficiencyScore: number // 0-100, from code analysis
  codeLength: number
  hasActualLogic: boolean // Not just base case

  // Communication signals
  approachExplained: boolean
  complexityDiscussed: boolean
  complexityCorrect: boolean // Did they get it right?
  edgeCasesMentioned: number
  questionsAnswered: number
  questionsAsked: number // By interviewer
  candidateMessageCount: number

  // Collaboration
  hintsUsed: number
  hintsTotal: number
  aiSuggestionsCopiedBlindly: boolean

  // Phase completion
  testsRanBeforeSubmit: boolean
  submittedFromPhase: string // 'intro' | 'coding' | 'testing' | etc.

  // Scenario context
  scenarioType: "dsa" | "system-design" | "bugfix"
  difficulty: "easy" | "medium" | "hard"
}

export interface AccumulatedScores {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  overall: number

  // Flags for UI
  silentSolution: boolean // Correct but didn't explain
  incompleteSolution: boolean // Missing actual logic
  aiCopyingDetected: boolean

  // Metadata
  confidence: "low" | "medium" | "high"
  signalsUsed: string[]
}

/**
 * Calculate scores from accumulated signals - NO AI, pure math
 * Designed to match the validated scores from generate-feedback as closely as possible
 */
export function calculateInstantScores(signals: ScoreSignals): AccumulatedScores {
  const signalsUsed: string[] = []

  // Calculate pass rate (core metric)
  const passRate = signals.testsTotal > 0 ? (signals.testsPassed / signals.testsTotal) * 100 : 0
  signalsUsed.push(`passRate:${Math.round(passRate)}%`)

  // Detect incomplete solution
  const incompleteSolution = !signals.hasActualLogic && signals.codeLength < 200
  if (incompleteSolution) signalsUsed.push("incomplete")

  // Detect silent solution (solved but didn't explain)
  const silentSolution =
    passRate >= 70 && !signals.approachExplained && signals.candidateMessageCount < 3
  if (silentSolution) signalsUsed.push("silent")

  // Detect AI copying
  const aiCopyingDetected = signals.aiSuggestionsCopiedBlindly
  if (aiCopyingDetected) signalsUsed.push("aiCopy")

  // ============================================
  // UNDERSTANDING SCORE
  // "Did they understand the problem and approach?"
  // ============================================
  let understanding = 50 // Base

  // Test performance is primary signal (40%)
  understanding = passRate * 0.4

  // Efficiency shows deep understanding (30%)
  understanding += signals.efficiencyScore * 0.3

  // Explaining approach shows understanding (20%)
  if (signals.approachExplained) {
    understanding += 20
    signalsUsed.push("approachExplained")
  }

  // Complexity discussion (10%)
  if (signals.complexityDiscussed) {
    understanding += signals.complexityCorrect ? 10 : 5
    signalsUsed.push(`complexity:${signals.complexityCorrect ? "correct" : "discussed"}`)
  }

  // Penalties
  if (incompleteSolution) understanding = Math.min(understanding, 25)
  if (aiCopyingDetected) understanding = Math.max(20, understanding - 20)

  // ============================================
  // PROBLEM-SOLVING SCORE
  // "Did they work through the problem systematically?"
  // ============================================
  let problemSolving = 50 // Base

  // Test performance (50%)
  problemSolving = passRate * 0.5

  // Efficiency (30%)
  problemSolving += signals.efficiencyScore * 0.3

  // Process quality (20%)
  if (signals.testsRanBeforeSubmit) {
    problemSolving += 10
    signalsUsed.push("testedBeforeSubmit")
  }
  if (signals.edgeCasesMentioned > 0) {
    problemSolving += Math.min(10, signals.edgeCasesMentioned * 3)
  }

  // Phase penalty - submitting from intro/early coding is bad
  if (signals.submittedFromPhase === "intro") {
    problemSolving = Math.min(problemSolving, 20)
    signalsUsed.push("earlySubmit")
  } else if (signals.submittedFromPhase === "coding" && !signals.testsRanBeforeSubmit) {
    problemSolving = Math.max(20, problemSolving - 15)
  }

  if (incompleteSolution) problemSolving = Math.min(problemSolving, 20)

  // ============================================
  // CODE QUALITY SCORE
  // "Is the code correct and efficient?"
  // ============================================
  let codeQuality = 50 // Base

  // Test pass rate is primary (50%)
  codeQuality = passRate * 0.5

  // Efficiency score (40%)
  codeQuality += signals.efficiencyScore * 0.4

  // Bonus for clean solution (10%)
  if (passRate >= 90 && signals.efficiencyScore >= 70) {
    codeQuality += 10
    signalsUsed.push("cleanSolution")
  }

  // AI copying penalty - they didn't write it themselves
  if (aiCopyingDetected) {
    codeQuality = Math.max(30, codeQuality - 25)
  }

  if (incompleteSolution) codeQuality = Math.min(codeQuality, 15)

  // ============================================
  // COMMUNICATION SCORE
  // "Did they communicate their thinking?"
  // ============================================
  let communication = 50 // Base

  // Approach explanation is most important (40%)
  if (signals.approachExplained) {
    communication += 40
  } else {
    communication = Math.min(communication, 40) // Cap at 40 if no approach
  }

  // Complexity discussion (25%)
  if (signals.complexityDiscussed) {
    communication += signals.complexityCorrect ? 25 : 15
  }

  // Engagement with interviewer (20%)
  const answerRate =
    signals.questionsAsked > 0 ? signals.questionsAnswered / signals.questionsAsked : 0
  communication += answerRate * 20

  // Edge cases mentioned (15%)
  if (signals.edgeCasesMentioned > 0) {
    communication += Math.min(15, signals.edgeCasesMentioned * 5)
  }

  // Silent penalty - needs minimum engagement
  if (signals.candidateMessageCount < 2) {
    communication = Math.min(communication, 30)
    signalsUsed.push("lowEngagement")
  }

  // ============================================
  // OVERALL SCORE
  // Weighted average with scenario adjustments
  // ============================================
  let overall: number

  if (signals.scenarioType === "system-design") {
    // System design: Communication is king
    overall = understanding * 0.2 + problemSolving * 0.2 + codeQuality * 0.1 + communication * 0.5
    signalsUsed.push("weights:sysdesign")
  } else if (signals.scenarioType === "bugfix") {
    // Bugfix: Problem-solving matters most
    overall =
      understanding * 0.25 + problemSolving * 0.35 + codeQuality * 0.25 + communication * 0.15
    signalsUsed.push("weights:bugfix")
  } else {
    // DSA: Balanced with slight code emphasis
    overall = understanding * 0.25 + problemSolving * 0.25 + codeQuality * 0.3 + communication * 0.2
    signalsUsed.push("weights:dsa")
  }

  // Difficulty adjustment - harder problems get slight boost
  if (signals.difficulty === "hard" && passRate >= 50) {
    overall = Math.min(100, overall + 5)
    signalsUsed.push("hardBonus")
  } else if (signals.difficulty === "easy" && passRate < 70) {
    overall = Math.max(0, overall - 5)
    signalsUsed.push("easyPenalty")
  }

  // Clamp all scores
  understanding = clamp(understanding)
  problemSolving = clamp(problemSolving)
  codeQuality = clamp(codeQuality)
  communication = clamp(communication)
  overall = clamp(overall)

  // Determine confidence based on data completeness
  let confidence: "low" | "medium" | "high" = "high"
  if (signals.testsTotal === 0) {
    confidence = "low"
    signalsUsed.push("noTests")
  } else if (signals.candidateMessageCount < 3) {
    confidence = "medium"
  }

  return {
    understanding: Math.round(understanding),
    problemSolving: Math.round(problemSolving),
    codeQuality: Math.round(codeQuality),
    communication: Math.round(communication),
    overall: Math.round(overall),
    silentSolution,
    incompleteSolution,
    aiCopyingDetected,
    confidence,
    signalsUsed,
  }
}

/**
 * Calculate scores specifically for system design (no code/tests)
 */
export function calculateSystemDesignScores(signals: {
  hasDesignNotes: boolean
  designNotesLength: number
  candidateMessageCount: number
  approachExplained: boolean
  requirementsGathered: boolean
  tradeoffsDiscussed: boolean
  scalabilityMentioned: boolean
  questionsAnswered: number
  questionsAsked: number
}): AccumulatedScores {
  const signalsUsed: string[] = ["systemDesign"]

  // No engagement = failure
  if (signals.candidateMessageCount === 0 && !signals.hasDesignNotes) {
    return {
      understanding: 10,
      problemSolving: 10,
      codeQuality: 10, // "Architecture" for SD
      communication: 10,
      overall: 10,
      silentSolution: false,
      incompleteSolution: true,
      aiCopyingDetected: false,
      confidence: "high",
      signalsUsed: ["noEngagement"],
    }
  }

  let requirements = 30 // Base
  let architecture = 30
  let scalability = 30
  let communication = 30

  // Requirements (Understanding equivalent)
  if (signals.requirementsGathered) {
    requirements += 40
    signalsUsed.push("requirements")
  }
  if (signals.candidateMessageCount >= 5) {
    requirements += 20
  }

  // Architecture (Problem-Solving equivalent)
  if (signals.hasDesignNotes && signals.designNotesLength > 200) {
    architecture += 30
    signalsUsed.push("designNotes")
  }
  if (signals.approachExplained) {
    architecture += 20
  }
  if (signals.tradeoffsDiscussed) {
    architecture += 20
    signalsUsed.push("tradeoffs")
  }

  // Scalability (Code Quality equivalent)
  if (signals.scalabilityMentioned) {
    scalability += 40
    signalsUsed.push("scalability")
  }
  if (signals.tradeoffsDiscussed) {
    scalability += 20
  }

  // Communication
  const answerRate =
    signals.questionsAsked > 0 ? signals.questionsAnswered / signals.questionsAsked : 0
  communication += answerRate * 30
  if (signals.approachExplained) communication += 20
  if (signals.candidateMessageCount >= 10) communication += 20

  // Overall for system design emphasizes communication
  const overall = requirements * 0.2 + architecture * 0.2 + scalability * 0.1 + communication * 0.5

  return {
    understanding: clamp(Math.round(requirements)),
    problemSolving: clamp(Math.round(architecture)),
    codeQuality: clamp(Math.round(scalability)),
    communication: clamp(Math.round(communication)),
    overall: clamp(Math.round(overall)),
    silentSolution: false,
    incompleteSolution: signals.candidateMessageCount < 3 && !signals.hasDesignNotes,
    aiCopyingDetected: false,
    confidence: signals.candidateMessageCount >= 5 ? "high" : "medium",
    signalsUsed,
  }
}

/**
 * Build signals from session metrics state
 * This bridges the session-metrics format to our score signals
 */
export function buildSignalsFromMetrics(metrics: {
  // Test data
  testsPassed?: number
  testsTotal?: number

  // Code analysis
  efficiencyScore?: number
  codeLength?: number
  hasActualLogic?: boolean

  // Conversation tracker
  approachExplained?: boolean
  complexityDiscussed?: boolean
  complexityCorrect?: boolean
  edgeCasesIdentified?: string[]

  // Interaction
  hintsViewed?: number[]
  totalInterviewerMessages?: number
  totalChatMessages?: number
  aiSuggestionsCopiedBlindly?: number

  // Phase
  testsRanBeforeSubmit?: boolean
  submittedFromPhase?: string

  // Scenario
  scenarioType?: string
  difficulty?: string
}): ScoreSignals {
  return {
    testsPassed: metrics.testsPassed ?? 0,
    testsTotal: metrics.testsTotal ?? 0,
    efficiencyScore: metrics.efficiencyScore ?? 50,
    codeLength: metrics.codeLength ?? 0,
    hasActualLogic: metrics.hasActualLogic ?? true,
    approachExplained: metrics.approachExplained ?? false,
    complexityDiscussed: metrics.complexityDiscussed ?? false,
    complexityCorrect: metrics.complexityCorrect ?? false,
    edgeCasesMentioned: metrics.edgeCasesIdentified?.length ?? 0,
    questionsAnswered: Math.min(
      metrics.totalChatMessages ?? 0,
      metrics.totalInterviewerMessages ?? 0
    ),
    questionsAsked: metrics.totalInterviewerMessages ?? 0,
    candidateMessageCount: metrics.totalChatMessages ?? 0,
    hintsUsed: metrics.hintsViewed?.length ?? 0,
    hintsTotal: 5,
    aiSuggestionsCopiedBlindly: (metrics.aiSuggestionsCopiedBlindly ?? 0) > 0,
    testsRanBeforeSubmit: metrics.testsRanBeforeSubmit ?? false,
    submittedFromPhase: metrics.submittedFromPhase ?? "unknown",
    scenarioType: (metrics.scenarioType as "dsa" | "system-design" | "bugfix") ?? "dsa",
    difficulty: (metrics.difficulty as "easy" | "medium" | "hard") ?? "medium",
  }
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

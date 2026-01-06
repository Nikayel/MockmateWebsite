/**
 * Scoring algorithms for different interview types
 *
 * This module contains scoring logic for DSA, System Design, and Bug Fix scenarios.
 * All scoring is algorithmic and deterministic based on validated inputs.
 */

import type {
  ScoreResult,
  ExtendedScoreResult,
  ConversationValidation,
  PreScreenResult
} from './types'
import { analyzeCodeCompleteness, isBlankDesignTemplate } from './completeness-analysis'

// ============================================================================
// SYSTEM DESIGN SCORING
// ============================================================================

/**
 * SYSTEM DESIGN SCORING - focused on architecture and discussion quality
 * No test pass rate since system design is discussion-based
 *
 * CRITICAL: This function must be strict about empty/minimal submissions
 * to prevent users gaming the system by not engaging.
 */
export function calculateSystemDesignScores(
  preScreen: PreScreenResult,
  aiValidation: ConversationValidation,
  designNotes?: string
): ScoreResult {
  // System design evaluation criteria (based on industry standards):
  // - Requirements Gathering: Did they ask clarifying questions?
  // - Architecture: Did they propose clear components?
  // - Scalability: Did they discuss scaling concerns?
  // - Trade-offs: Did they explain pros/cons of choices?
  // - Communication: Did they communicate clearly?

  // Check if design notes are blank template
  const hasBlankDesignNotes = designNotes ? isBlankDesignTemplate(designNotes) : true

  // Determine engagement level
  const hasNoConversation = !preScreen.hasContent || preScreen.candidateMessageCount === 0
  const hasMinimalConversation = preScreen.candidateMessageCount > 0 && preScreen.candidateMessageCount < 3
  const hasMinimalContent = preScreen.avgMessageLength < 30 // Very short messages
  const hasNoContent = hasNoConversation && hasBlankDesignNotes

  // CASE 1: Completely empty submission (no conversation + blank template)
  // This is a clear "didn't even try" scenario
  if (hasNoContent) {
    return {
      understanding: 5,   // No requirements gathering - they typed nothing
      problemSolving: 5,  // No architecture discussion - no engagement at all
      codeQuality: 5,     // No design - blank template
      communication: 5,   // Zero communication
      overall: 5          // Fail - did not participate
    }
  }

  // CASE 2: Blank design notes (even with some conversation)
  // Submitted without filling in any design - severely penalize
  if (hasBlankDesignNotes) {
    // Cap all scores at 20 - can't pass without documenting your design
    const maxScore = 20

    // If they didn't even have a real conversation, score even lower
    if (hasMinimalConversation || hasMinimalContent) {
      return {
        understanding: 10,
        problemSolving: 10,
        codeQuality: 10,
        communication: Math.min(15, aiValidation.communicationScore),
        overall: 11 // Clear fail
      }
    }

    // Some conversation but no design notes - partial credit but still failing
    const commScore = Math.min(maxScore, aiValidation.communicationScore)
    return {
      understanding: Math.min(maxScore, aiValidation.approachExplained ? 18 : 12),
      problemSolving: Math.min(maxScore, aiValidation.alternativesDiscussed ? 18 : 12),
      codeQuality: 10, // No design documented
      communication: commScore,
      overall: Math.round((18 + 18 + 10 + commScore) / 5) // ~14-16 range
    }
  }

  // CASE 3: Minimal conversation but some design notes
  // They wrote something but didn't engage with interviewer
  if (hasNoConversation || (hasMinimalConversation && hasMinimalContent)) {
    // Cap scores - can't get good communication score without communicating
    return {
      understanding: 25,  // Some credit for reading the problem
      problemSolving: 25, // Some credit for attempting design notes
      codeQuality: 30,    // They at least wrote something
      communication: 10,  // Did not communicate
      overall: 22         // Low D/F range - need to discuss with interviewer
    }
  }

  // CASE 4: Normal evaluation - has conversation AND design notes
  // Start with base scores and adjust based on quality

  // UNDERSTANDING = Requirements gathering + approach explanation
  let understanding = 25 // Lower base - must earn points
  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus = {
      'excellent': 55,
      'good': 40,
      'basic': 25,
      'poor': 10,
      'none': 0
    }[aiValidation.approachQuality] || 0
    understanding = Math.min(95, understanding + approachBonus)
  }
  // Penalize if no coherent discussion
  if (!aiValidation.isCoherent || !aiValidation.responsesRelevant) {
    understanding = Math.max(15, understanding - 25)
  }

  // PROBLEM-SOLVING = Architecture quality + alternatives discussed
  let problemSolving = 25 // Lower base
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent) {
    problemSolving = Math.min(85, problemSolving + 35)
  }
  if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 25)
  }
  // Penalize if no coherent discussion
  if (!aiValidation.isCoherent || !aiValidation.responsesRelevant) {
    problemSolving = Math.max(15, problemSolving - 25)
  }

  // CODE QUALITY = For system design, this becomes "Design Quality/Scalability"
  // Based on discussion depth and coherence
  let codeQuality = 25 // Lower base
  if (aiValidation.isCoherent && preScreen.hasContent) {
    // Reward depth of discussion
    const messageCount = preScreen.candidateMessageCount || 0
    if (messageCount >= 10) codeQuality = Math.min(90, codeQuality + 45)
    else if (messageCount >= 5) codeQuality = Math.min(80, codeQuality + 35)
    else if (messageCount >= 3) codeQuality = Math.min(70, codeQuality + 25)
    else codeQuality = Math.min(55, codeQuality + 15)
  } else {
    codeQuality = Math.max(15, codeQuality - 15)
  }

  // COMMUNICATION = Most important for system design interviews
  let communication = aiValidation.communicationScore

  // Ensure communication score reflects actual engagement
  if (!aiValidation.isCoherent) {
    communication = Math.min(25, communication)
  } else if (!aiValidation.responsesRelevant) {
    communication = Math.min(35, communication)
  }

  // Bonus for answering interviewer questions (only if coherent)
  if (aiValidation.isCoherent && aiValidation.questionsAsked > 0) {
    const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
    if (answerRate >= 0.8) communication = Math.min(95, communication + 10)
    else if (answerRate >= 0.5) communication = Math.min(90, communication + 5)
  }

  // Ensure minimum conversation depth for good communication score
  if (preScreen.candidateMessageCount < 3) {
    communication = Math.min(40, communication)
  }

  // System design weighting: Communication is most important
  const overall = Math.round(
    understanding * 0.20 +      // Requirements & understanding
    problemSolving * 0.30 +     // Architecture & scalability
    codeQuality * 0.20 +        // Design depth
    communication * 0.30        // Critical for system design
  )

  return {
    understanding: Math.round(understanding),
    problemSolving: Math.round(problemSolving),
    codeQuality: Math.round(codeQuality),
    communication: Math.round(communication),
    overall
  }
}

// ============================================================================
// BUG FIX SCORING
// ============================================================================

/**
 * BUG FIX SCORING - emphasize debugging process and root cause analysis
 */
export function calculateBugFixScores(
  passRate: number,
  preScreen: PreScreenResult,
  aiValidation: ConversationValidation
): ScoreResult {
  // Bug fix evaluation criteria:
  // - Did they find the bug? (test pass rate is key indicator)
  // - Did they explain the root cause?
  // - Did they fix it cleanly?
  // - Did they consider edge cases?

  // UNDERSTANDING = Bug identification + root cause explanation
  let understanding = 20
  if (passRate >= 80) {
    understanding = Math.min(85, passRate) // Found and fixed the bug
  } else if (passRate >= 50) {
    understanding = passRate + 10 // Partial fix
  } else {
    understanding = Math.max(20, passRate + 15) // Base for attempting
  }

  // Bonus for explaining the bug
  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus = {
      'excellent': 15,
      'good': 10,
      'basic': 5,
      'poor': 2,
      'none': 0
    }[aiValidation.approachQuality] || 0
    understanding = Math.min(98, understanding + approachBonus)
  }

  // PROBLEM-SOLVING = Debugging approach + fix quality
  let problemSolving = Math.round(passRate * 0.7 + 15) // Base on fix success
  if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 10)
  }
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent) {
    problemSolving = Math.min(95, problemSolving + 5)
  }

  // CODE QUALITY = Clean fix, not hacky workaround
  const codeQuality = Math.min(100, Math.round(passRate * 0.8 + 20))

  // COMMUNICATION = Explaining the debugging process
  let communication = 30
  if (!aiValidation.isCoherent) {
    communication = Math.min(25, aiValidation.communicationScore)
  } else {
    communication = aiValidation.communicationScore
    if (aiValidation.questionsAsked > 0) {
      const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
      if (answerRate >= 0.7) communication = Math.min(95, communication + 5)
    }
  }

  // Bug fix weighting: Understanding the bug is most important
  const overall = Math.round(
    understanding * 0.35 +      // Finding + explaining the bug
    problemSolving * 0.25 +     // Debugging approach
    codeQuality * 0.20 +        // Clean fix
    communication * 0.20        // Explaining process
  )

  return {
    understanding: Math.round(understanding),
    problemSolving: Math.round(problemSolving),
    codeQuality: Math.round(codeQuality),
    communication: Math.round(communication),
    overall
  }
}

// ============================================================================
// DSA SCORING
// ============================================================================

/**
 * STEP 3: Calculate final scores using both algorithmic signals and AI validation
 */
export function calculateValidatedScores(
  passRate: number,
  efficiencyMetrics: { efficiencyScore?: number; difficulty?: string } | undefined,
  preScreen: PreScreenResult,
  aiValidation: ConversationValidation,
  scenarioType?: string,
  code?: string
): ScoreResult {
  // SYSTEM DESIGN SCORING - conversation-based, no test pass rate
  if (scenarioType === 'system-design') {
    return calculateSystemDesignScores(preScreen, aiValidation, code)
  }

  // BUG FIX SCORING - emphasize debugging process
  if (scenarioType === 'bugfix') {
    return calculateBugFixScores(passRate, preScreen, aiValidation)
  }

  // DSA SCORING (default) - test pass rate + code quality

  // CRITICAL: Check if solution is incomplete/stub code FIRST
  // This prevents giving credit for edge case handling when the actual algorithm is missing
  const codeCompleteness = code ? analyzeCodeCompleteness(code, 'python') : { isIncomplete: false, reason: '', hasBaseCase: false, hasActualLogic: true, stubPatterns: [] }

  // If solution is incomplete AND has very low pass rate, cap all scores severely
  // This catches cases like: only base case check with 'pass', getting 1 test to pass
  const isIncompleteSolution = codeCompleteness.isIncomplete
  const hasOnlyBaseCasePassing = passRate > 0 && passRate < 30 && codeCompleteness.hasBaseCase && !codeCompleteness.hasActualLogic
  const maxScoreForIncomplete = 25 // Cap at 25% for incomplete solutions

  // === UNDERSTANDING SCORE (30%) ===
  // Primary: test pass rate (proves they understood the problem)
  // Secondary: approach explanation quality
  let understanding = 0
  if (passRate >= 80) {
    understanding = Math.min(85, passRate)
  } else if (passRate >= 50) {
    understanding = passRate + 5
  } else {
    understanding = Math.max(20, passRate)
  }

  // Bonus for explaining approach (only if AI validated as real explanation)
  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus = {
      'excellent': 12,
      'good': 8,
      'basic': 4,
      'poor': 2,
      'none': 0
    }[aiValidation.approachQuality] || 0
    understanding = Math.min(98, understanding + approachBonus)
  }

  // Bonus for ACCURATE complexity discussion (not just mentioning it)
  // BUT: Only give complexity bonus if the solution actually works (passRate >= 50)
  // No credit for discussing complexity of a non-working solution
  if (aiValidation.complexityDiscussed && aiValidation.complexityAccurate && passRate >= 50) {
    understanding = Math.min(98, understanding + 5)
  } else if (aiValidation.complexityDiscussed && !aiValidation.complexityAccurate) {
    // Penalty for wrong complexity claim
    understanding = Math.max(20, understanding - 5)
  }

  // CRITICAL: Cap understanding for incomplete solutions
  // Can't claim to "understand" the problem if you didn't implement the solution
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    understanding = Math.min(maxScoreForIncomplete, understanding)
  }

  // === PROBLEM-SOLVING SCORE (25%) ===
  // Primary: test pass rate + code efficiency
  // Secondary: edge cases and alternatives discussed
  const effScore = efficiencyMetrics?.efficiencyScore || 50
  let problemSolving = Math.round((passRate * 0.6) + (effScore * 0.4))

  // Bonus only if AI validated these as real discussions (not keyword stuffing)
  // AND solution has actual implementation
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent && !isIncompleteSolution) {
    problemSolving = Math.min(95, problemSolving + 5)
  }
  if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent && !isIncompleteSolution) {
    problemSolving = Math.min(95, problemSolving + 5)
  }

  // CRITICAL: Cap problem-solving for incomplete solutions
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    problemSolving = Math.min(maxScoreForIncomplete, problemSolving)
  }

  // === CODE QUALITY SCORE (25%) ===
  // Purely algorithmic - based on test results and efficiency
  // This CAN'T be gamed through conversation
  let codeQuality = Math.min(100, Math.round(
    passRate * 0.50 +
    effScore * 0.30 +
    50 * 0.20
  ))

  // CRITICAL: Cap code quality for incomplete solutions
  // Stub code with a passing edge case test is NOT quality code
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    codeQuality = Math.min(maxScoreForIncomplete, codeQuality)
  }

  // === COMMUNICATION SCORE (20%) ===
  // CRITICAL: Real interviews require explaining your approach BEFORE coding
  // Passing tests without explanation is NOT good communication
  let communication = 35 // Lower base - must earn through actual communication

  // If AI detected incoherence or gibberish, cap severely
  if (!aiValidation.isCoherent) {
    communication = Math.min(25, aiValidation.communicationScore)
  }
  // If responses weren't relevant to questions, penalize
  else if (!aiValidation.responsesRelevant) {
    communication = Math.min(45, aiValidation.communicationScore)
  }
  // If pre-screening detected suspicious patterns (keyword stuffing), cap
  else if (preScreen.suspiciousPatterns.keywordStuffing) {
    communication = Math.min(35, aiValidation.communicationScore)
  }
  // Otherwise use AI's communication score
  else {
    communication = aiValidation.communicationScore

    // Bonus if they answered most interviewer questions
    if (aiValidation.questionsAsked > 0) {
      const answerRate = aiValidation.questionsAnswered / aiValidation.questionsAsked
      if (answerRate >= 0.8) {
        communication = Math.min(90, communication + 5)
      }
    }
  }

  // APPROACH EXPLANATION IS CRITICAL
  // In real interviews, you MUST explain your approach before coding
  const isOptimalSolution = passRate >= 100 && (effScore || 0) >= 80
  const isCorrectSolution = passRate >= 100

  // NO difficulty bonus - easy problems still require communication
  if (aiValidation.approachExplained && aiValidation.isCoherent && aiValidation.approachQuality !== 'none') {
    // Explained approach = this is what we want
    // But quality matters - just saying "I'll loop" isn't enough
    const qualityBonus = {
      'excellent': 20,
      'good': 12,
      'basic': 5,
      'poor': 0,
      'none': 0
    }[aiValidation.approachQuality] || 0

    if (isOptimalSolution) {
      communication = Math.min(95, communication + qualityBonus)
    } else if (isCorrectSolution) {
      communication = Math.min(85, communication + qualityBonus)
    } else {
      communication = Math.min(70, communication + Math.floor(qualityBonus / 2))
    }
  } else {
    // DID NOT explain approach - this is a problem even if solution is correct
    // Real interviewers care about thought process, not just the answer
    if (isCorrectSolution) {
      // Correct but silent = poor communication, cap at 45
      communication = Math.min(45, communication)
    } else {
      // Wrong AND silent = very poor communication
      communication = Math.min(35, communication)
    }
  }

  // Minimum floor only if they actually had MEANINGFUL conversation
  // Requires: 3+ messages, approach explained with at least basic quality
  // NOTE: This floor is HIGHER than silent solution caps - that's intentional
  // The difference is whether they EXPLAINED their approach, not just chatted
  if (preScreen.hasContent &&
      preScreen.candidateMessageCount >= 3 &&
      preScreen.avgMessageLength >= 50 && // Raised from 40 to require more substance
      aiValidation.isCoherent &&
      aiValidation.approachExplained &&
      aiValidation.approachQuality !== 'none' &&
      aiValidation.approachQuality !== 'poor') {
    // Only apply floor if they actually explained approach well
    const qualityFloor = {
      'excellent': 65,
      'good': 55,
      'basic': 45,
      'poor': 35,
      'none': 25
    }[aiValidation.approachQuality] || 35
    communication = Math.max(qualityFloor, communication)
  }

  // For incomplete solutions, communication can stay higher IF they discussed well
  // BUT overall will still be capped due to other components being low

  // === OVERALL SCORE ===
  let overall = Math.round(
    understanding * 0.30 +
    problemSolving * 0.25 +
    codeQuality * 0.25 +
    communication * 0.20
  )

  // FINAL CAP: Incomplete solutions CANNOT pass (cap at 30%)
  // Even with good communication, an incomplete solution is a fail
  // We use 30 as absolute max - but in practice components are already capped at 25
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    overall = Math.min(28, overall) // Hard cap at 28% - this is a failing grade
  }

  return {
    understanding: Math.round(understanding),
    problemSolving: Math.round(problemSolving),
    codeQuality: Math.round(codeQuality),
    communication: Math.round(communication),
    overall
  }
}

// ============================================================================
// SCORE FLOORS
// ============================================================================

/**
 * Apply score floors for correct solutions
 * A correct solution should get at least a passing grade for code quality
 * BUT communication score should NOT be boosted if they didn't explain approach
 * Silent solutions are PENALIZED - this is an interview, not just coding
 *
 * PHILOSOPHY: Real FAANG interviews require explaining your thought process.
 * A silent optimal solution is a C at best - you solved the problem but failed
 * to demonstrate the communication skills that interviews are designed to assess.
 */
export function applyScoreFloors(
  scores: ScoreResult,
  passRate: number,
  efficiencyScore: number | undefined,
  aiValidation: ConversationValidation
): ExtendedScoreResult {
  const isOptimal = (efficiencyScore || 0) >= 80
  // Only boost if they actually explained with at least basic quality
  const explainedApproach = aiValidation.approachExplained &&
    aiValidation.isCoherent &&
    aiValidation.approachQuality !== 'none' &&
    aiValidation.approachQuality !== 'poor'
  const hasGoodComm = aiValidation.communicationScore >= 60 && explainedApproach

  // Detect silent solutions - correct but no communication
  const isSilentSolution = passRate >= 80 && !explainedApproach

  let overall = scores.overall
  let communication = scores.communication

  // Score floors - silent solutions get SIGNIFICANTLY LOWER floors
  // This matches real interview expectations where communication is critical
  if (passRate >= 100 && isOptimal && hasGoodComm) {
    overall = Math.max(85, overall) // A range - optimal + explained well
    communication = Math.max(70, communication)
  } else if (passRate >= 100 && isOptimal && explainedApproach) {
    overall = Math.max(78, overall) // B+ range - optimal + some explanation
    communication = Math.max(55, communication)
  } else if (passRate >= 100 && isOptimal) {
    // Optimal but SILENT - penalize significantly
    // In real interviews, this is a major red flag - they can code but can't communicate
    overall = Math.max(55, overall) // D+ range - good code but failed interview communication
    // DO NOT boost communication - cap it low
    communication = Math.min(35, communication)
  } else if (passRate >= 100 && explainedApproach) {
    overall = Math.max(72, overall) // B- range - correct + explained
  } else if (passRate >= 100) {
    // Correct but SILENT - significant penalty
    overall = Math.max(52, overall) // D range - solved it but didn't interview well
    communication = Math.min(40, communication)
  } else if (passRate >= 90) {
    overall = Math.max(50, overall) // D range
  } else if (passRate >= 80) {
    overall = Math.max(45, overall) // D- range
  }

  return { ...scores, overall, communication, silentSolution: isSilentSolution }
}

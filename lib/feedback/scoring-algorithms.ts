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
  PreScreenResult,
} from "./types"
import type { ExtractedEvidence } from "./structured-extraction"
import { analyzeCodeCompleteness, isBlankDesignTemplate } from "./completeness-analysis"
import { SCORING, clampScore } from "../constants"
import { logger } from "@/lib/logger"

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
  const hasMinimalConversation =
    preScreen.candidateMessageCount > 0 && preScreen.candidateMessageCount < 3
  const hasMinimalContent = preScreen.avgMessageLength < 30 // Very short messages
  const hasNoContent = hasNoConversation && hasBlankDesignNotes

  // CASE 1: Completely empty submission (no conversation + blank template)
  // This is a clear "didn't even try" scenario
  if (hasNoContent) {
    return {
      understanding: 5, // No requirements gathering - they typed nothing
      problemSolving: 5, // No architecture discussion - no engagement at all
      codeQuality: 5, // No design - blank template
      communication: 5, // Zero communication
      overall: 5, // Fail - did not participate
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
        overall: 11, // Clear fail
      }
    }

    // Some conversation but no design notes - partial credit but still failing
    const commScore = Math.min(maxScore, aiValidation.communicationScore)
    return {
      understanding: Math.min(maxScore, aiValidation.approachExplained ? 18 : 12),
      problemSolving: Math.min(maxScore, aiValidation.alternativesDiscussed ? 18 : 12),
      codeQuality: 10, // No design documented
      communication: commScore,
      overall: Math.round((18 + 18 + 10 + commScore) / 5), // ~14-16 range
    }
  }

  // CASE 3: Minimal conversation but some design notes
  // They wrote something but didn't engage with interviewer
  if (hasNoConversation || (hasMinimalConversation && hasMinimalContent)) {
    // Cap scores - can't get good communication score without communicating
    return {
      understanding: 25, // Some credit for reading the problem
      problemSolving: 25, // Some credit for attempting design notes
      codeQuality: 30, // They at least wrote something
      communication: 10, // Did not communicate
      overall: 22, // Low D/F range - need to discuss with interviewer
    }
  }

  // CASE 4: Normal evaluation - has conversation AND design notes
  // Start with base scores and adjust based on quality

  // UNDERSTANDING = Requirements gathering + approach explanation
  let understanding = 25 // Lower base - must earn points
  if (aiValidation.approachExplained && aiValidation.isCoherent) {
    const approachBonus =
      {
        excellent: 55,
        good: 40,
        basic: 25,
        poor: 10,
        none: 0,
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
  // Uses SCORING.SYSTEM_DESIGN_WEIGHTS from lib/constants.ts (Single Source of Truth)
  const sdw = SCORING.SYSTEM_DESIGN_WEIGHTS
  const overall = Math.round(
    understanding * sdw.UNDERSTANDING +
      problemSolving * sdw.PROBLEM_SOLVING +
      codeQuality * sdw.CODE_QUALITY +
      communication * sdw.COMMUNICATION
  )

  // Clamp all scores to valid 0-100 range
  return {
    understanding: clampScore(understanding),
    problemSolving: clampScore(problemSolving),
    codeQuality: clampScore(codeQuality),
    communication: clampScore(communication),
    overall: clampScore(overall),
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
    const approachBonus =
      {
        excellent: 15,
        good: 10,
        basic: 5,
        poor: 2,
        none: 0,
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
  // Uses SCORING.BUG_FIX_WEIGHTS from lib/constants.ts (Single Source of Truth)
  const bfw = SCORING.BUG_FIX_WEIGHTS
  const overall = Math.round(
    understanding * bfw.UNDERSTANDING +
      problemSolving * bfw.PROBLEM_SOLVING +
      codeQuality * bfw.CODE_QUALITY +
      communication * bfw.COMMUNICATION
  )

  // Clamp all scores to valid 0-100 range
  return {
    understanding: clampScore(understanding),
    problemSolving: clampScore(problemSolving),
    codeQuality: clampScore(codeQuality),
    communication: clampScore(communication),
    overall: clampScore(overall),
  }
}

// ============================================================================
// DSA SCORING
// ============================================================================

/**
 * STEP 3: Calculate final scores using both algorithmic signals and AI validation
 *
 * Now with ExtractedEvidence for grounded scoring:
 * - Use actual quotes to verify claims
 * - Reward good behaviors (self-correction, optimization progression)
 * - Don't penalize for things they actually did
 */
export function calculateValidatedScores(
  passRate: number,
  efficiencyMetrics: { efficiencyScore?: number; difficulty?: string } | undefined,
  preScreen: PreScreenResult,
  aiValidation: ConversationValidation,
  scenarioType?: string,
  code?: string,
  extractedEvidence?: ExtractedEvidence
): ScoreResult {
  // SYSTEM DESIGN SCORING - conversation-based, no test pass rate
  if (scenarioType === "system-design") {
    return calculateSystemDesignScores(preScreen, aiValidation, code)
  }

  // BUG FIX SCORING - emphasize debugging process
  if (scenarioType === "bugfix") {
    return calculateBugFixScores(passRate, preScreen, aiValidation)
  }

  // DSA SCORING (default) - test pass rate + code quality

  // CRITICAL: Check if solution is incomplete/stub code FIRST
  // This prevents giving credit for edge case handling when the actual algorithm is missing
  const codeCompleteness = code
    ? analyzeCodeCompleteness(code, "python")
    : {
        isIncomplete: false,
        reason: "",
        hasBaseCase: false,
        hasActualLogic: true,
        stubPatterns: [],
      }

  // If solution is incomplete AND has very low pass rate, cap all scores severely
  // This catches cases like: only base case check with 'pass', getting 1 test to pass
  const isIncompleteSolution = codeCompleteness.isIncomplete
  const hasOnlyBaseCasePassing =
    passRate > 0 &&
    passRate < 30 &&
    codeCompleteness.hasBaseCase &&
    !codeCompleteness.hasActualLogic
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
    const approachBonus =
      {
        excellent: 12,
        good: 8,
        basic: 4,
        poor: 2,
        none: 0,
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
  // Secondary: edge cases, optimization progression, self-correction
  const effScore = efficiencyMetrics?.efficiencyScore || 50
  let problemSolving = Math.round(passRate * 0.6 + effScore * 0.4)

  // Bonus only if AI validated these as real discussions (not keyword stuffing)
  // AND solution has actual implementation
  if (aiValidation.alternativesDiscussed && aiValidation.isCoherent && !isIncompleteSolution) {
    problemSolving = Math.min(95, problemSolving + 5)
  }

  // === EVIDENCE-BASED SCORING (uses extracted quotes, not LLM guesses) ===
  // When evidence is available, use it INSTEAD of aiValidation for edge cases
  // to avoid double-counting
  if (extractedEvidence && !isIncompleteSolution) {
    // EDGE CASE BONUS: Use evidence (replaces aiValidation.edgeCasesConsidered)
    // This is more accurate than LLM's guess
    const proactiveEdgeCases = extractedEvidence.edgeCases.mentionedByCandidate.length
    if (proactiveEdgeCases >= 3) {
      problemSolving = Math.min(95, problemSolving + 7) // 3+ edge cases = strong
    } else if (proactiveEdgeCases >= 1) {
      problemSolving = Math.min(95, problemSolving + 4) // 1-2 edge cases = good
    }
    // Note: No bonus if 0 edge cases (don't penalize, just no bonus)

    // PROGRESSION BONUS: Started brute force, then optimized = shows good problem-solving growth
    // Real interviewers LOVE seeing candidates iterate and improve
    if (
      extractedEvidence.progression.startedWithBruteForce &&
      extractedEvidence.progression.improvedAfterPrompt
    ) {
      problemSolving = Math.min(95, problemSolving + 6)
    }

    // SELF-CORRECTION BONUS: Catching and fixing own bugs = strong signal
    // Real interviewers value this more than getting it right first try
    if (extractedEvidence.progression.selfCorrectedBugs) {
      problemSolving = Math.min(95, problemSolving + 4)
    }

    // HINT PENALTY: Needed excessive help or copied blindly
    if (extractedEvidence.hints.copiedBlindly) {
      problemSolving = Math.max(20, problemSolving - 15)
    } else if (extractedEvidence.hints.totalGiven >= 4) {
      // 4+ hints = needed significant help (not necessarily bad, but lower score)
      problemSolving = Math.max(30, problemSolving - 8)
    } else if (
      extractedEvidence.hints.totalGiven >= 2 &&
      !extractedEvidence.hints.usedEffectively
    ) {
      // Got hints but didn't use them well
      problemSolving = Math.max(35, problemSolving - 5)
    }
  } else if (!isIncompleteSolution) {
    // Fallback to aiValidation when no evidence available
    if (aiValidation.edgeCasesConsidered && aiValidation.isCoherent) {
      problemSolving = Math.min(95, problemSolving + 5)
    }
  }

  // CRITICAL: Cap problem-solving for incomplete solutions
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    problemSolving = Math.min(maxScoreForIncomplete, problemSolving)
  }

  // === CODE QUALITY SCORE (25%) ===
  // Purely algorithmic - based on test results and efficiency
  // This CAN'T be gamed through conversation
  let codeQuality = Math.min(100, Math.round(passRate * 0.5 + effScore * 0.3 + 50 * 0.2))

  // CRITICAL: Cap code quality for incomplete solutions
  // Stub code with a passing edge case test is NOT quality code
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    codeQuality = Math.min(maxScoreForIncomplete, codeQuality)
  }

  // === COMMUNICATION SCORE (20%) ===
  // CRITICAL: Real interviews require explaining your approach BEFORE coding
  // Passing tests without explanation is NOT good communication
  // Start low - must earn through actual communication
  let communication = aiValidation.communicationScore || 10

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

  // Treat complexity + trade-off discussion as equivalent to explaining approach
  // In real FAANG interviews, discussing trade-offs and complexity IS explaining your approach
  // Example: "I'll use two hash maps because it's more readable" + "O(n) time, O(1) space"
  const hasApproachIndicators =
    aiValidation.approachExplained ||
    (aiValidation.complexityDiscussed && aiValidation.alternativesDiscussed)

  // NO difficulty bonus - easy problems still require communication
  if (hasApproachIndicators && aiValidation.isCoherent && aiValidation.approachQuality !== "none") {
    // Explained approach (directly or via trade-offs + complexity) = this is what we want
    // But quality matters - just saying "I'll loop" isn't enough
    const qualityBonus =
      {
        excellent: 20,
        good: 12,
        basic: 5,
        poor: 0,
        none: 0,
      }[aiValidation.approachQuality] || 0

    if (isOptimalSolution) {
      communication = Math.min(95, communication + qualityBonus)
    } else if (isCorrectSolution) {
      communication = Math.min(85, communication + qualityBonus)
    } else {
      communication = Math.min(70, communication + Math.floor(qualityBonus / 2))
    }
  } else if (aiValidation.complexityDiscussed || aiValidation.alternativesDiscussed) {
    // Partial indicators - discussed complexity OR trade-offs but not both
    // This is better than silent but not as good as full explanation
    if (isCorrectSolution) {
      communication = Math.min(60, communication)
    } else {
      communication = Math.min(50, communication)
    }
  } else {
    // No indicators at all - truly silent coder
    // Real interviewers care about thought process, not just the answer
    // Zero communication should be severely punished (around 10-15)
    // Override any previous boosts - silent coding is unacceptable
    // Set directly to 10-15 range, don't trust AI validation which might be too lenient
    if (isCorrectSolution) {
      // Correct but silent = very poor communication, set to 10-15
      // Even if they solved it, no explanation means they failed the interview aspect
      // Use AI's score if it's already very low (<=15), otherwise cap at 15
      const aiScore = aiValidation.communicationScore || 10
      communication = aiScore <= 15 ? aiScore : 15
    } else {
      // Wrong AND silent = extremely poor communication
      const aiScore = aiValidation.communicationScore || 5
      communication = aiScore <= 10 ? aiScore : 10
    }
  }

  // Minimum floor only if they actually had MEANINGFUL conversation
  // Requires: 3+ messages, approach explained (or demonstrated via trade-offs + complexity)
  // NOTE: This floor is HIGHER than silent solution caps - that's intentional
  // The difference is whether they EXPLAINED their approach, not just chatted
  if (
    preScreen.hasContent &&
    preScreen.candidateMessageCount >= 3 &&
    preScreen.avgMessageLength >= 50 && // Raised from 40 to require more substance
    aiValidation.isCoherent &&
    hasApproachIndicators && // Use the combined check instead of just approachExplained
    aiValidation.approachQuality !== "none" &&
    aiValidation.approachQuality !== "poor"
  ) {
    // Only apply floor if they actually explained approach well
    const qualityFloor =
      {
        excellent: 65,
        good: 55,
        basic: 45,
        poor: 35,
        none: 25,
      }[aiValidation.approachQuality] || 35
    communication = Math.max(qualityFloor, communication)
  }

  // === EVIDENCE-BASED COMMUNICATION ADJUSTMENTS ===
  // These are ADDITIONAL signals not captured by aiValidation
  // Cap total evidence-based bonus to prevent excessive stacking
  if (extractedEvidence) {
    let evidenceBonus = 0

    // BONUS: Explained while coding (real interviewers love this)
    if (extractedEvidence.communication.explainedWhileCoding) {
      evidenceBonus += 4
    }

    // BONUS: Asked clarifying questions (shows thoroughness)
    if (extractedEvidence.communication.askedClarifyingQuestions) {
      evidenceBonus += 3
    }

    // BONUS: Responded well to feedback (adaptability)
    if (extractedEvidence.communication.respondedToFeedback) {
      evidenceBonus += 3
    }

    // ACCURACY CHECK: If they discussed complexity, use evidence to verify accuracy
    // This REPLACES the aiValidation complexity check (more accurate)
    if (
      extractedEvidence.timeComplexity.mentioned &&
      extractedEvidence.timeComplexity.isCorrect === true
    ) {
      evidenceBonus += 3
    } else if (
      extractedEvidence.timeComplexity.mentioned &&
      extractedEvidence.timeComplexity.isCorrect === false
    ) {
      // Inaccurate complexity = slight penalty (but they at least tried)
      evidenceBonus -= 3
    }

    // Cap evidence-based bonus at +10 to prevent excessive inflation
    // (explainedWhileCoding + clarifying + feedback + complexity = max 13, capped to 10)
    evidenceBonus = Math.min(10, Math.max(-5, evidenceBonus))
    communication = Math.min(95, Math.max(25, communication + evidenceBonus))

    // === EVIDENCE-BASED FLOOR (prevents silent coder misclassification) ===
    // If evidence shows communication happened, enforce a minimum floor
    const hasCommunicationEvidence =
      extractedEvidence.communication.quotes.length > 0 ||
      (extractedEvidence.approach.explained && extractedEvidence.approach.quote) ||
      (extractedEvidence.timeComplexity.mentioned && extractedEvidence.timeComplexity.quote)

    if (hasCommunicationEvidence && communication < 50) {
      logger.info("[Scoring] Evidence shows communication - enforcing floor", {
        currentScore: communication,
        enforcedFloor: 50,
        evidenceQuotes: extractedEvidence.communication.quotes.length,
        hasApproachQuote: !!(
          extractedEvidence.approach.explained && extractedEvidence.approach.quote
        ),
        hasComplexityQuote: !!(
          extractedEvidence.timeComplexity.mentioned && extractedEvidence.timeComplexity.quote
        ),
      })
      communication = 50
    }
  }

  // For incomplete solutions, communication can stay higher IF they discussed well
  // BUT overall will still be capped due to other components being low

  // === OVERALL SCORE ===
  // Use canonical weights from lib/constants.ts SCORING.PERFORMANCE_WEIGHTS
  const w = SCORING.PERFORMANCE_WEIGHTS
  let overall = Math.round(
    understanding * w.UNDERSTANDING +
      problemSolving * w.PROBLEM_SOLVING +
      codeQuality * w.CODE_QUALITY +
      communication * w.COMMUNICATION
  )

  // FINAL CAP: Incomplete solutions CANNOT pass (cap at 30%)
  // Even with good communication, an incomplete solution is a fail
  // We use 30 as absolute max - but in practice components are already capped at 25
  if (isIncompleteSolution || hasOnlyBaseCasePassing) {
    overall = Math.min(28, overall) // Hard cap at 28% - this is a failing grade
  }

  // Clamp all scores to valid 0-100 range
  return {
    understanding: clampScore(understanding),
    problemSolving: clampScore(problemSolving),
    codeQuality: clampScore(codeQuality),
    communication: clampScore(communication),
    overall: clampScore(overall),
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
 *
 * CRITICAL FIX: Added backup floors based purely on objective metrics (test pass rate)
 * These kick in when extraction fails to detect communication properly.
 * A 100% pass rate indicates strong problem-solving ability and should be reflected.
 */
export function applyScoreFloors(
  scores: ScoreResult,
  passRate: number,
  efficiencyScore: number | undefined,
  aiValidation: ConversationValidation
): ExtendedScoreResult {
  const isOptimal = (efficiencyScore || 0) >= 80
  // Only boost if they actually explained with at least basic quality
  const explainedApproach =
    aiValidation.approachExplained &&
    aiValidation.isCoherent &&
    aiValidation.approachQuality !== "none" &&
    aiValidation.approachQuality !== "poor"
  const hasGoodComm = aiValidation.communicationScore >= 60 && explainedApproach

  // Detect silent solutions - correct but no communication
  const isSilentSolution = passRate >= 80 && !explainedApproach

  let overall = scores.overall
  let communication = scores.communication
  let understanding = scores.understanding
  let problemSolving = scores.problemSolving
  let codeQuality = scores.codeQuality

  // PHASE 1: Communication-aware floors (original logic)
  // These apply when we can reliably detect communication quality
  if (passRate >= 100 && isOptimal && hasGoodComm) {
    overall = Math.max(85, overall) // A range - optimal + explained well
    communication = Math.max(70, communication)
  } else if (passRate >= 100 && isOptimal && explainedApproach) {
    overall = Math.max(78, overall) // B+ range - optimal + some explanation
    communication = Math.max(55, communication)
  } else if (passRate >= 100 && isOptimal) {
    // Optimal but SILENT - penalize significantly
    overall = Math.max(55, overall)
    communication = Math.min(35, communication)
  } else if (passRate >= 100 && explainedApproach) {
    overall = Math.max(72, overall) // B- range - correct + explained
  } else if (passRate >= 100) {
    overall = Math.max(52, overall)
    communication = Math.min(40, communication)
  } else if (passRate >= 90) {
    overall = Math.max(50, overall)
  } else if (passRate >= 80) {
    overall = Math.max(45, overall)
  }

  // PHASE 2: Objective metric floors (backup)
  // These ensure technical competence is reflected regardless of extraction accuracy
  // The tests don't lie - 100% pass rate = you solved the problem correctly
  if (passRate >= 100) {
    // CRITICAL: A perfect test pass rate MUST be reflected in scores
    // Even if extraction fails, the candidate demonstrably solved the problem
    understanding = Math.max(60, understanding) // You understood enough to solve it
    problemSolving = Math.max(65, problemSolving) // You solved all test cases
    codeQuality = Math.max(70, codeQuality) // Your code works perfectly

    // If efficiency metrics show optimal, boost further
    if (isOptimal) {
      understanding = Math.max(70, understanding)
      problemSolving = Math.max(75, problemSolving)
      codeQuality = Math.max(80, codeQuality)
    }

    // Recalculate overall if component scores were boosted
    // Use canonical weights from lib/constants.ts SCORING.PERFORMANCE_WEIGHTS
    const pw = SCORING.PERFORMANCE_WEIGHTS
    const newOverall = Math.round(
      understanding * pw.UNDERSTANDING +
        problemSolving * pw.PROBLEM_SOLVING +
        codeQuality * pw.CODE_QUALITY +
        communication * pw.COMMUNICATION
    )
    overall = Math.max(overall, newOverall)
  } else if (passRate >= 80) {
    // 80%+ pass rate still shows strong competence
    understanding = Math.max(50, understanding)
    problemSolving = Math.max(55, problemSolving)
    codeQuality = Math.max(55, codeQuality)
  }

  return {
    ...scores,
    understanding,
    problemSolving,
    codeQuality,
    communication,
    overall,
    silentSolution: isSilentSolution,
  }
}

/**
 * Fallback feedback scoring.
 *
 * Pure, side-effect-free computation of an interview score breakdown used when
 * streaming AI feedback fails. Bugfix scenarios are scored from collected
 * evidence; everything else is scored from interaction metrics. Extracted from
 * the inline `applyFallbackFeedback` callback in `app/interview/page.tsx` so the
 * scoring rules have one home and can be tested directly.
 */
import {
  summarizeBugfixEvidence,
  calculateBugfixEvidenceScore,
  mapBugfixBreakdownToCategoryScores,
  type BugfixEvidenceEvent,
} from "@/lib/bugfix"
import { calculateUserScore, type InteractionMetrics } from "@/lib/scoring"

export interface FallbackFeedbackRequest {
  scenarioType?: string
  scenarioDifficulty?: string
  hintsUsed?: number
  elapsedTimeSeconds?: number
  testsPassed?: number
  testsTotal?: number
  bugfixEvidenceEvents?: BugfixEvidenceEvent[]
  bugfixExpectedTouchedFiles?: string[]
}

export interface FallbackScoreBreakdown {
  understandingScore: number
  problemSolvingScore: number
  codeQualityScore: number
  communicationScore: number
}

export interface FallbackScores {
  scoreBreakdown: FallbackScoreBreakdown
  performanceScore: number
}

/**
 * Compute the score breakdown + overall performance score for the fallback
 * feedback path. Mirrors the previous inline logic exactly.
 */
export function computeFallbackScores(request: FallbackFeedbackRequest): FallbackScores {
  const isBugfix = request.scenarioType === "bugfix"

  if (isBugfix) {
    const evidenceSummary = summarizeBugfixEvidence({
      events: request.bugfixEvidenceEvents || [],
      expectedTouchedFiles: request.bugfixExpectedTouchedFiles || [],
    })
    const bugfixScores = calculateBugfixEvidenceScore(evidenceSummary)
    // Project through the shared category mapping so the fallback breakdown matches
    // the streaming feedback path (previously each picked a different single dimension).
    const categories = mapBugfixBreakdownToCategoryScores(bugfixScores)
    return {
      performanceScore: bugfixScores.overall,
      scoreBreakdown: {
        understandingScore: categories.understanding,
        problemSolvingScore: categories.problemSolving,
        codeQualityScore: categories.codeQuality,
        communicationScore: categories.communication,
      },
    }
  }

  // The previous inline logic passed only this partial set of fields (cast to
  // `any`); `calculateUserScore` reads the remaining fields as undefined and
  // applies its own defaults. Replicate exactly to preserve scoring behavior.
  const interactionMetrics = {
    hintsUsed: request.hintsUsed || 0,
    timeSpent: request.elapsedTimeSeconds || 0,
    testCasesPassed: request.testsPassed || 0,
    testCasesTotal: request.testsTotal || 0,
    problemDifficulty: request.scenarioDifficulty || "medium",
    problemType: request.scenarioType || "dsa",
  }

  const dsaScores = calculateUserScore(interactionMetrics as unknown as InteractionMetrics)
  return {
    performanceScore: dsaScores.overallScore,
    scoreBreakdown: {
      understandingScore: dsaScores.understandingScore,
      problemSolvingScore: dsaScores.problemSolvingScore,
      codeQualityScore: dsaScores.codeQualityScore,
      communicationScore: dsaScores.communicationScore,
    },
  }
}

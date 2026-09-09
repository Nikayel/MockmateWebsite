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
import { calculateUserScore, createDefaultMetrics } from "@/lib/scoring"

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

function nonNegativeFinite(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0
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
    // Pass the difficulty through (the stream path does): calculateBugfixEvidenceScore scales
    // codebaseNavigation's target by it, so dropping it scored every fallback bugfix as medium.
    //
    // KNOWN GAP: no `integrity` option is passed, so the transcript-integrity
    // caps (incoherent 25 / irrelevant 45 / stuffed 35) do NOT apply on this
    // path, and these scores are persisted verbatim. This is not an oversight
    // that a one-line change fixes: computeFallbackScores runs CLIENT-side
    // (app/interview/_hooks/useFeedbackStreaming.ts) after the Edge route has
    // already failed, and aiValidation / preScreen are produced server-side
    // inside that failed route, so the signals do not exist here.
    //
    // Blast radius is small but real: without semanticOverrides the
    // communication dimension is the fixed UNJUDGED_LANGUAGE_SCORE rather than
    // an LLM judgment, and it carries weight 0.05, so an uncapped fallback
    // moves overall by roughly a point. Closing it properly means having the
    // server hand the client its integrity verdict before the stream dies, or
    // recomputing server-side in the persist route.
    const bugfixScores = calculateBugfixEvidenceScore(evidenceSummary, {
      difficulty:
        request.scenarioDifficulty === "easy" ||
        request.scenarioDifficulty === "medium" ||
        request.scenarioDifficulty === "hard"
          ? request.scenarioDifficulty
          : "medium",
    })
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

  const difficulty =
    request.scenarioDifficulty === "easy" ||
    request.scenarioDifficulty === "medium" ||
    request.scenarioDifficulty === "hard"
      ? request.scenarioDifficulty
      : "medium"
  const scenarioType = request.scenarioType === "system-design" ? "system-design" : "dsa"
  const interactionMetrics = createDefaultMetrics(difficulty, scenarioType)
  interactionMetrics.timeSpent = nonNegativeFinite(request.elapsedTimeSeconds)
  interactionMetrics.hintsRevealed = nonNegativeFinite(request.hintsUsed)
  interactionMetrics.testCasesTotal = nonNegativeFinite(request.testsTotal)
  interactionMetrics.testCasesPassed = Math.min(
    nonNegativeFinite(request.testsPassed),
    interactionMetrics.testCasesTotal
  )

  const dsaScores = calculateUserScore(interactionMetrics)
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

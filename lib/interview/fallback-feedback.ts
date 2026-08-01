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

import { z } from "zod"
import { clampScore } from "@/lib/constants"

/**
 * Validation for POST /api/feedback/persist.
 *
 * This route writes client-supplied scores into interview_sessions, which
 * feeds readiness metrics and spaced repetition. The body must never be
 * trusted: every score is required to be a finite number and is clamped to
 * 0-100 before persistence, and test counts are coerced into a consistent
 * state (0 <= testsPassed <= testsTotal).
 */

const finiteNumber = z.number().finite()

const persistScoresSchema = z.object({
  understanding: finiteNumber,
  problemSolving: finiteNumber,
  codeQuality: finiteNumber,
  communication: finiteNumber,
  overall: finiteNumber,
})

const persistFeedbackSchema = z.object({
  raw: z.string(),
  tldr: z.string().catch(""),
  whatWorked: z.array(z.string()).catch([]),
  fixNext: z.array(z.string()).catch([]),
  actionPlan: z.array(z.string()).catch([]),
})

const persistSilentNoteSchema = z.object({
  type: z.string(),
  userSaid: z.string().catch(""),
  correct: z.string().optional(),
  context: z.string().optional(),
  timestamp: z.number().optional(),
})

export const persistRequestSchema = z
  .object({
    sessionId: z.string().min(1),
    userId: z.string().min(1),
    scores: persistScoresSchema,
    feedback: persistFeedbackSchema,

    testsPassed: z.number().int().min(0).catch(0),
    testsTotal: z.number().int().min(0).catch(0),
    timeSpentMinutes: z.number().finite().min(0).optional().catch(undefined),
    hintsUsed: z.number().int().min(0).optional().catch(undefined),
    difficulty: z.enum(["easy", "medium", "hard"]).catch("medium"),
    scenarioType: z.enum(["dsa", "system-design", "bugfix"]).catch("dsa"),
    scenarioTitle: z.string().catch(""),
    scenarioId: z.string().optional(),
    scenarioPattern: z.string().optional(),

    // Malformed silent notes are dropped rather than failing the whole persist:
    // they are supplementary display data, not score inputs.
    silentNotes: z.array(persistSilentNoteSchema.catch(null as never)).nullish(),
    // The streaming client sends explicit null for these on every non-bugfix
    // session (stream route emits `?? null`), so they must be nullish, not
    // just optional — .optional() alone rejects null and 400s the persist.
    bugfixEvidenceSummary: z.record(z.unknown()).nullish(),
    bugfixScoreBreakdown: z.record(z.unknown()).nullish(),
    bugfixPostSessionReport: z.record(z.unknown()).nullish(),
    // (bugfixScoreBreakdown is additionally normalized in the validator below:
    // the dashboard averages breakdown.overall, so its numbers must be clamped.)

    isGuidedLab: z.boolean().optional(),
    guidedLabMastery: z
      .object({
        quizAccuracy: z.number().finite().min(0).max(100).optional(),
        quizzesCorrect: z.number().int().min(0).optional(),
        quizzesTotal: z.number().int().min(0).optional(),
        milestonesCompleted: z.number().int().min(0).optional(),
        milestonesTotal: z.number().int().min(0).optional(),
      })
      .nullish(),

    conversationTranscript: z
      .array(z.object({ role: z.string(), content: z.string() }).catch(null as never))
      .nullish(),
    efficiencyMetrics: z
      .object({
        optimalTimeComplexity: z.string().optional(),
        optimalSpaceComplexity: z.string().optional(),
      })
      .optional(),
  })
  .passthrough()

export type PersistRequest = z.infer<typeof persistRequestSchema> & {
  scores: Record<keyof z.infer<typeof persistScoresSchema>, number>
}

export type PersistRequestValidationResult =
  | { success: true; data: PersistRequest }
  | { success: false; error: string; logContext?: Record<string, unknown> }

const BUGFIX_BREAKDOWN_SCORE_KEYS = [
  "reproductionDiscipline",
  "codebaseNavigation",
  "evidenceGathering",
  "hypothesisQuality",
  "minimalFixQuality",
  "verificationDiscipline",
  "overEditControl",
  "rootCauseUnderstanding",
  "regressionPrevention",
  "aiCollaborationQuality",
  "communication",
  "overall",
] as const

/**
 * Clamp every numeric field of a client-supplied bugfix score breakdown.
 * The dashboard displays and averages breakdown.overall, so a crafted persist
 * could otherwise plant e.g. overall: 99999 into readiness analytics. If
 * `overall` is missing or non-numeric the whole breakdown is dropped (null),
 * which makes the dashboard fall back to performance_score. Normalize, never
 * reject: this data is display-side, not worth failing the persist over.
 */
function normalizeBugfixScoreBreakdown(
  breakdown: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined {
  if (breakdown === null || breakdown === undefined) return breakdown
  // Strict number check: Number("")/Number(null)/Number(true) coerce to 0/1,
  // which would keep a garbage breakdown alive with overall 0 instead of
  // dropping it to the performance_score fallback.
  if (typeof breakdown.overall !== "number" || !Number.isFinite(breakdown.overall)) return null
  const normalized: Record<string, unknown> = { ...breakdown }
  for (const key of BUGFIX_BREAKDOWN_SCORE_KEYS) {
    if (key in normalized) {
      normalized[key] = clampScore(Number(normalized[key]))
    }
  }
  return normalized
}

export function validatePersistRequestBody(rawBody: unknown): PersistRequestValidationResult {
  const parsed = persistRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid request body",
      logContext: {
        errors: parsed.error.errors.slice(0, 10).map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    }
  }

  const data = parsed.data

  // Clamp every persisted score into 0-100 so a hostile or buggy client can
  // never write out-of-range values into readiness metrics.
  const scores = {
    understanding: clampScore(data.scores.understanding),
    problemSolving: clampScore(data.scores.problemSolving),
    codeQuality: clampScore(data.scores.codeQuality),
    communication: clampScore(data.scores.communication),
    overall: clampScore(data.scores.overall),
  }

  // A pass count above the total is inconsistent input; trust the total.
  const testsTotal = data.testsTotal
  const testsPassed = Math.min(data.testsPassed, testsTotal)

  return {
    success: true,
    data: {
      ...data,
      scores,
      testsPassed,
      testsTotal,
      silentNotes: data.silentNotes?.filter((note) => note !== null) ?? undefined,
      conversationTranscript:
        data.conversationTranscript?.filter((entry) => entry !== null) ?? undefined,
      guidedLabMastery: data.guidedLabMastery ?? undefined,
      bugfixScoreBreakdown: normalizeBugfixScoreBreakdown(data.bugfixScoreBreakdown),
    },
  }
}

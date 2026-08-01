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
    silentNotes: z.array(persistSilentNoteSchema.catch(null as never)).optional(),
    bugfixEvidenceSummary: z.record(z.unknown()).optional(),
    bugfixScoreBreakdown: z.record(z.unknown()).optional(),
    bugfixPostSessionReport: z.record(z.unknown()).optional(),

    isGuidedLab: z.boolean().optional(),
    guidedLabMastery: z
      .object({
        quizAccuracy: z.number().finite().optional(),
        quizzesCorrect: z.number().int().min(0).optional(),
        quizzesTotal: z.number().int().min(0).optional(),
        milestonesCompleted: z.number().int().min(0).optional(),
        milestonesTotal: z.number().int().min(0).optional(),
      })
      .optional(),

    conversationTranscript: z
      .array(z.object({ role: z.string(), content: z.string() }).catch(null as never))
      .optional(),
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
      silentNotes: data.silentNotes?.filter((note) => note !== null),
      conversationTranscript: data.conversationTranscript?.filter((entry) => entry !== null),
    },
  }
}

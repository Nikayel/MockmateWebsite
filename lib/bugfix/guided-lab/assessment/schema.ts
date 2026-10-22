import { z } from "zod"

const text = z.string().max(3000)
const base = {
  id: z.string().max(100),
  phaseId: z.string().max(100),
  revision: z.number().int().nonnegative(),
  timestamp: z.number().finite().nonnegative(),
}
export const patchSchema = z.object({
  path: z.string().max(500),
  startLine: z.number().int().positive(),
  before: text,
  after: text,
  truncated: z.boolean(),
})
export const labEventSchema = z.discriminatedUnion("kind", [
  z.object({
    ...base,
    kind: z.literal("message"),
    role: z.enum(["candidate", "interviewer", "ai_partner"]),
    lane: z.enum(["interviewer", "partner"]),
    text,
    truncated: z.boolean(),
  }),
  z.object({ ...base, kind: z.literal("checkpoint"), patches: z.array(patchSchema).max(20) }),
  z.object({
    ...base,
    kind: z.literal("test_run"),
    runId: z.string().max(100),
    stale: z.boolean(),
    results: z
      .array(
        z.object({
          name: z.string().max(300),
          suite: z.string().max(100),
          passed: z.boolean(),
          harnessError: z.boolean(),
        })
      )
      .max(200),
  }),
  z.object({
    ...base,
    kind: z.literal("transition"),
    toPhaseId: z.string().max(100),
    reason: z.enum(["advance", "regression", "resume"]),
  }),
  z.object({ ...base, kind: z.literal("hint"), text, truncated: z.boolean() }),
])
export const labEvidenceSchema = z
  .object({
    attemptId: z.string().max(200).optional(),
    version: z.literal(1),
    revision: z.number().int().nonnegative(),
    nextSequence: z.number().int().nonnegative(),
    truncated: z.boolean(),
    events: z.array(labEventSchema).max(300),
  })
  .superRefine((log, ctx) => {
    if (
      new TextEncoder().encode(JSON.stringify(log)).byteLength > 180000 ||
      new Set(log.events.map((e) => e.id)).size !== log.events.length
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Evidence exceeds limits or contains duplicate IDs",
      })
  })
export type LabEvidence = z.infer<typeof labEvidenceSchema>
export type LabEvent = z.infer<typeof labEventSchema>
export type LabObservation = LabEvent extends infer E
  ? E extends LabEvent
    ? Omit<E, keyof typeof base>
    : never
  : never

export const dimensionSchema = z.object({
  status: z.enum(["demonstrated", "developing", "not_observed"]),
  feedback: z.string().max(600),
  evidenceIds: z.array(z.string().max(100)).max(8),
})
export const phaseReviewSchema = z.object({
  phaseId: z.string().max(100),
  communication: dimensionSchema,
  investigation: dimensionSchema,
  repair: dimensionSchema,
})
export type PhaseReview = z.infer<typeof phaseReviewSchema>
export const labAssessmentSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal("guided_practice"),
    reviewStatus: z.enum(["available", "unavailable", "not_observed"]),
    evidenceTruncated: z.boolean(),
    phases: z
      .array(
        z.object({
          phaseId: z.string().max(100),
          title: z.string().max(200),
          verification: z.enum(["passed", "failing", "stale", "not_observed", "not_applicable"]),
          testsPassed: z.number().int().nonnegative(),
          testsTotal: z.number().int().nonnegative(),
          runId: z.string().max(100).nullable(),
          revision: z.number().int().nonnegative().nullable(),
          reproducedFailure: z.boolean(),
          regressions: z.number().int().nonnegative(),
          assistanceAvailable: z.boolean(),
          evidence: z.array(labEventSchema).max(300),
          review: phaseReviewSchema,
        })
      )
      .max(20),
  })
  .refine(
    (report) => new TextEncoder().encode(JSON.stringify(report)).byteLength <= 420000,
    "Phase report exceeds storage budget"
  )
export type LabAssessment = z.infer<typeof labAssessmentSchema>

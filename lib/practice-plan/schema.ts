import { z } from "zod"
import { nextPracticeRecommendationSchema } from "@/lib/agents/recommendations/next-practice-response-schema"

export const documentIdSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^/\x00-\x1f]+$/)
  .refine((v) => v.trim() === v)
export const savePracticeSchema = z
  .object({
    sourceSessionId: documentIdSchema,
    scenarioId: documentIdSchema,
    reminderAt: z.string().datetime().nullable(),
    timezone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value })
          return true
        } catch {
          return false
        }
      }),
  })
  .strict()
export type SavePracticeRequest = z.infer<typeof savePracticeSchema>
export const practicePlanSchema = z.object({
  userId: documentIdSchema,
  sourceSessionId: documentIdSchema,
  recommendation: nextPracticeRecommendationSchema,
  revision: z.string().uuid(),
  savedAt: z.string().datetime(),
  reminderAt: z.string().datetime().nullable(),
  timezone: z.string(),
  reminderStatus: z.enum([
    "none",
    "pending",
    "sending",
    "sent",
    "failed",
    "cancelled",
    "uncertain",
  ]),
  nextAttemptAt: z.string().datetime().nullable(),
  attempts: z.number().int().nonnegative(),
})
export type PracticePlan = z.infer<typeof practicePlanSchema>
export const practicePlanResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ready"), plan: practicePlanSchema }),
  z.object({
    status: z.literal("complete"),
    plan: practicePlanSchema,
    completedSessionId: documentIdSchema,
    observations: z.array(z.string().max(500)).max(3),
  }),
  z.object({ status: z.literal("empty") }),
])
export type PracticePlanResponse = z.infer<typeof practicePlanResponseSchema>

export class PracticePlanError extends Error {
  constructor(
    message: string,
    public readonly status = 409
  ) {
    super(message)
  }
}

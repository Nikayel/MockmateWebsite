import { z } from "zod"

export const recommendationDecisionIdSchema = z.string().regex(/^[a-f0-9]{64}$/)
export const recommendationSessionIdSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^/\x00-\x1f]+$/)
  .refine((value) => value.trim() === value)
export const recommendationReturnSourceSchema = z.enum(["feedback", "dashboard", "reminder"])
export const recommendationInteractionSchema = z
  .object({
    decisionId: recommendationDecisionIdSchema,
    stage: z.enum(["viewed", "clicked"]),
    returnSource: recommendationReturnSourceSchema,
  })
  .strict()
export const recommendationStartSchema = z
  .object({
    decisionId: recommendationDecisionIdSchema,
    sessionId: recommendationSessionIdSchema,
    returnSource: recommendationReturnSourceSchema,
  })
  .strict()
export type RecommendationStart = z.infer<typeof recommendationStartSchema>

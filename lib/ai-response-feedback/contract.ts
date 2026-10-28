import { z } from "zod"

export const responseRatingSchema = z.enum(["helpful", "unhelpful"])
export type ResponseRating = z.infer<typeof responseRatingSchema>
export const responseIdentitySchema = z.object({
  generationId: z.string().uuid(),
  responseId: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[^/\x00-\x1f]+$/),
})
export const responseFeedbackSchema = responseIdentitySchema
  .extend({
    feedbackType: responseRatingSchema,
  })
  .strict()
export const savedResponseFeedbackSchema = z.object({
  feedbackType: responseRatingSchema.nullable(),
})

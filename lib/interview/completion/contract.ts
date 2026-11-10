import { z } from "zod"

export const interviewCompletionActionSchema = z
  .object({ type: z.literal("end_interview") })
  .strict()
export type InterviewCompletionAction = z.infer<typeof interviewCompletionActionSchema>
export const INTERVIEW_COMPLETION_REPLY =
  "I’ll close the interview for you and open your score and feedback now."

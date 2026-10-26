import { z } from "zod"

/** Receipt of a message, never approval of a solution or a scored answer. */
export const interviewerReactionSchema = z.literal("acknowledged")
export type InterviewerReaction = z.infer<typeof interviewerReactionSchema>

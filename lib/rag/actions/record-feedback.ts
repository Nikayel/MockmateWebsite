import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import {
  responseFeedbackSchema,
  responseIdentitySchema,
  responseRatingSchema,
} from "@/lib/ai-response-feedback/contract"
import { responseFeedback, ResponseFeedbackError } from "@/lib/ai-response-feedback/generations"

async function handle(input: unknown, userId: string, write: boolean) {
  const parsed = (write ? responseFeedbackSchema : responseIdentitySchema.strict()).safeParse(input)
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid response feedback" }, { status: 400 })
  try {
    const { generationId, responseId } = parsed.data
    const value =
      "feedbackType" in parsed.data
        ? responseRatingSchema.parse(parsed.data.feedbackType)
        : undefined
    const feedbackType = await responseFeedback(userId, generationId, responseId, value)
    return NextResponse.json(
      { feedbackType },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch (error) {
    if (error instanceof ResponseFeedbackError)
      return NextResponse.json({ error: error.message }, { status: error.status })
    logger.error("[Response feedback] Persistence failed", { error })
    return NextResponse.json(
      { error: "Could not save or load your rating. Please try again." },
      { status: 503 }
    )
  }
}

export const handleRecordFeedback = (input: unknown, userId: string) => handle(input, userId, true)
export const handleReadFeedback = (input: unknown, userId: string) => handle(input, userId, false)

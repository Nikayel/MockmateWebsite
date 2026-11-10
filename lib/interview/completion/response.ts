import type { ChatRequestContext } from "../chat/request-context"
import type { ValidatedChatResponse } from "../chat/validated-response-stream"
import { candidateMessageText } from "../reactions/eligibility"
import { INTERVIEW_COMPLETION_REPLY } from "./contract"
import { requestsInterviewCompletion } from "./intent"

export function buildInterviewCompletionResponse(
  request: ChatRequestContext
): ValidatedChatResponse | undefined {
  if (
    request.role !== "interviewer" ||
    request.isPostInterview !== true ||
    request.hasSubmitted !== true ||
    request.isProactive ||
    request.isWrapUp ||
    !requestsInterviewCompletion(candidateMessageText(request))
  )
    return undefined

  return {
    reply: INTERVIEW_COMPLETION_REPLY,
    action: { type: "end_interview" },
    provider: "local",
    feedbackAvailable: false,
  }
}

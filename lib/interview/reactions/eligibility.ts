import { getInterviewerTurns } from "../conversation-pacing"
import type { ChatRequestContext } from "../chat/request-context"

export function previousInterviewerMessage(request: ChatRequestContext) {
  return getInterviewerTurns(request.sessionContext, request.context).findLast(
    (turn) => turn.type === "ai"
  )?.message
}

/** Presentation annotations must never be mistaken for candidate intent. */
export function candidateMessageText(request: ChatRequestContext): string {
  return request.candidateMessage ?? request.message ?? ""
}

/** Shared by the local shortcut and the model capability; never intercept terminal turns. */
export function canOfferInterviewerReaction(request: ChatRequestContext): boolean {
  return (
    request.role === "interviewer" &&
    !request.isProactive &&
    !request.isWrapUp &&
    !request.isPostInterview &&
    !request.hasSubmitted &&
    Boolean(candidateMessageText(request).trim()) &&
    candidateMessageText(request).length <= 180 &&
    !candidateMessageText(request).includes("?") &&
    Boolean(previousInterviewerMessage(request)) &&
    !(
      followsInterviewerQuestionOrOffer(request) &&
      /^(?:yes(?: please)?|yep|yeah|sure|ok(?:ay)?|absolutely|please do|go ahead|sounds good)[.! ]*$/i.test(
        candidateMessageText(request).trim()
      )
    )
  )
}

export function followsInterviewerQuestionOrOffer(request: ChatRequestContext) {
  return /\?|\b(?:i can|would you like|do you want|shall i|say yes)\b/i.test(
    previousInterviewerMessage(request) ?? ""
  )
}

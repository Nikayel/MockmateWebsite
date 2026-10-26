import {
  canOfferInterviewerReaction,
  candidateMessageText,
  followsInterviewerQuestionOrOffer,
} from "./eligibility"
import type { ChatRequestContext } from "../chat/request-context"

const ACKNOWLEDGMENT =
  /^(?:ok(?:ay)?|sure|alright|all right|got it|understood|noted|sounds good|makes sense|will do|cool|👍)$/
const DISMISSAL =
  /^(?:thanks(?: you)?|thank you|no thanks|no thank you|not now|that(?:'s| is) all|i(?:'m| am) (?:good|all set)(?: for now)?|never ?mind|no need|leave it with me|i(?:'ll| will) take it from here)$/
const WORK_INTENT =
  /^(?:(?:i(?:'ll| will)|i(?:'m| am) going to|let me) (?:go (?:and )?)?(?:work(?: on (?:it|this|that|the (?:code|fix|task|problem)))?|try(?: (?:it|that|this))?|think(?: (?:about|through) (?:it|this|that))?|(?:read|inspect|review|check) (?:the )?(?:files|code|repo|repository|task|problem)|(?:run|check) (?:the )?tests|investigate|debug|figure (?:it|this|that) out)(?: (?:now|first|for a bit|on my own))?|(?:i(?:'m| am) )?on it|give me (?:a (?:minute|moment|second)|some time)|brb)$/

function normalize(message: string) {
  return message
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!…]+$/g, "")
    .trim()
}

/** Deliberately conservative: extra content always gets the normal interviewer path. */
export function shouldAcknowledgeWithReaction(request: ChatRequestContext): boolean {
  if (!canOfferInterviewerReaction(request)) return false

  const message = normalize(candidateMessageText(request))
  const withoutPrefix = message.replace(
    /^(?:ok(?:ay)?|sure|alright|all right|got it|thanks|thank you|cool)[,.!]?\s+/,
    ""
  )
  if (
    DISMISSAL.test(message) ||
    DISMISSAL.test(withoutPrefix) ||
    WORK_INTENT.test(message) ||
    WORK_INTENT.test(withoutPrefix)
  )
    return true

  // "Sure" can accept a hint, answer a requirement, or request the next step.
  // In those contexts Sable must continue the conversation rather than silently react.
  if (followsInterviewerQuestionOrOffer(request)) return false
  return ACKNOWLEDGMENT.test(message)
}

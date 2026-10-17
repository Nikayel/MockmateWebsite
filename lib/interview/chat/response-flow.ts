import { getProactiveBlockReason, type InterviewTurn } from "../conversation-pacing"

type ChatContextMessage = InterviewTurn

export type ProactiveSkipResponse = {
  reply: null
  skipped: true
  reason: string
}

export type EndedConversationResponse = {
  reply: null
  conversationEnded: true
  endMessage: string
}

export const INTERVIEW_ENDED_MESSAGE =
  "The interview session has ended. Click 'See Full Interview Score' to see your score breakdown and detailed analysis."

export function buildProactiveSkipResponse(params: {
  role?: string
  isProactive?: boolean
  currentCode?: string
  timeSinceLastMessage?: number
  context?: ChatContextMessage[]
}): ProactiveSkipResponse | null {
  if (!params.isProactive || params.role !== "interviewer") {
    return null
  }

  const blocked = getProactiveBlockReason(params.context)
  if (blocked) return { reply: null, skipped: true, reason: blocked }

  const timeSilentSeconds = params.timeSinceLastMessage || 0
  const shouldTimeBasedCheckIn = timeSilentSeconds >= 120

  if (shouldTimeBasedCheckIn) {
    return null
  }

  return {
    reply: null,
    skipped: true,
    reason: "Candidate is not silent long enough for a check-in",
  }
}

export function buildEndedConversationResponse(params: {
  role?: string
  context?: ChatContextMessage[]
}): EndedConversationResponse | null {
  if (params.role !== "interviewer") {
    return null
  }

  const recentMessages = params.context?.slice(-4) || []
  const aiAlreadySaidGoodbye = recentMessages.some(
    (msg) =>
      msg.type !== "user" &&
      (msg.message?.toLowerCase().includes("good luck with your") ||
        msg.message?.toLowerCase().includes("best of luck") ||
        (msg.message?.toLowerCase().includes("take care") &&
          msg.message?.toLowerCase().includes("interview")))
  )

  if (!aiAlreadySaidGoodbye) {
    return null
  }

  return {
    reply: null,
    conversationEnded: true,
    endMessage: INTERVIEW_ENDED_MESSAGE,
  }
}

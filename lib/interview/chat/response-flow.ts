type ChatContextMessage = {
  type?: string
  message?: string
}

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
}): ProactiveSkipResponse | null {
  if (!params.isProactive || params.role !== "interviewer") {
    return null
  }

  const hasSubstantialCode = Boolean(params.currentCode && params.currentCode.trim().length > 100)
  const timeSilentSeconds = params.timeSinceLastMessage || 0
  const shouldTimeBasedCheckIn = timeSilentSeconds >= 120

  if (hasSubstantialCode || shouldTimeBasedCheckIn) {
    return null
  }

  return {
    reply: null,
    skipped: true,
    reason: "Not enough code to comment on yet and not silent long enough",
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

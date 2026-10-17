import { claimProactiveNudge } from "@/lib/interview/session-lifecycle/server"
import { getInterviewerTurns } from "@/lib/interview/conversation-pacing"
import { buildProactiveSkipResponse, type ProactiveSkipResponse } from "./response-flow"
import type { ChatRequestContext } from "./request-context"

export type ChatTurnEarlyResponse =
  | { status: 200; body: ProactiveSkipResponse }
  | { status: 400; body: { error: string } }

/** Eligibility precedes retrieval, model calls, and background work preparation. */
export async function checkChatTurnEligibility(
  request: ChatRequestContext,
  userId: string,
  ownerId: string | undefined
): Promise<ChatTurnEarlyResponse | null> {
  const { sessionContext, context, role, isProactive, timeSinceLastMessage, sessionId, message } =
    request
  const proactiveSkip = buildProactiveSkipResponse({
    role,
    isProactive,
    context: getInterviewerTurns(sessionContext, context),
    timeSinceLastMessage,
  })
  if (proactiveSkip) return { status: 200, body: proactiveSkip }
  if (isProactive) {
    const claimed = sessionId && (await claimProactiveNudge(sessionId, userId, ownerId))
    if (!claimed)
      return {
        status: 200,
        body: {
          reply: null,
          skipped: true,
          reason: "Session is paused or check-in budget is exhausted",
        },
      }
  }
  if (!message && !isProactive) return { status: 400, body: { error: "Message is required" } }
  return null
}

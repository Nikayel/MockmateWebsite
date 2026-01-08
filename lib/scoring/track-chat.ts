/**
 * Chat Message Tracking Utility
 *
 * Fire-and-forget function to track chat messages for scoring.
 * Used by interview components to send messages to the metrics API.
 *
 * This is a standalone function (not a hook) so it can be called
 * from anywhere without React context requirements.
 */

export type MessageType = "user" | "ai" | "system"
export type ChatType = "interviewer" | "partner"

interface TrackChatParams {
  sessionId: string
  type: MessageType
  message: string
  chatType: ChatType
  token: string
}

/**
 * Track a chat message for scoring analysis
 * Fire-and-forget - errors are logged but don't throw
 */
export async function trackChatMessage(params: TrackChatParams): Promise<void> {
  const { sessionId, type, message, chatType, token } = params

  if (!sessionId || !message?.trim() || !token) {
    return
  }

  try {
    // Fire and forget - don't await
    fetch("/api/session/metrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event: "chat_message",
        sessionId,
        data: {
          type,
          message,
          chatType,
        },
      }),
    }).catch((err) => {
      console.error("[trackChatMessage] Failed:", err)
    })
  } catch (err) {
    console.error("[trackChatMessage] Error:", err)
  }
}

/**
 * Convenience wrapper for tracking user messages
 */
export function trackUserMessage(
  sessionId: string,
  message: string,
  chatType: ChatType,
  token: string
): void {
  trackChatMessage({ sessionId, type: "user", message, chatType, token })
}

/**
 * Convenience wrapper for tracking AI messages
 */
export function trackAIMessage(
  sessionId: string,
  message: string,
  chatType: ChatType,
  token: string
): void {
  trackChatMessage({ sessionId, type: "ai", message, chatType, token })
}

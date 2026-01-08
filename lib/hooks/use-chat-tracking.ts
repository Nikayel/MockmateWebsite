/**
 * Chat Tracking Hook
 *
 * Lightweight hook for tracking chat messages during interview sessions.
 * Sends messages to the session metrics API for scoring analysis.
 *
 * Usage:
 * const { trackMessage } = useChatTracking(sessionId)
 * trackMessage('user', 'I will use a hash map for O(1) lookup', 'interviewer')
 */

import { useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth-context"

export type MessageType = "user" | "ai" | "system"
export type ChatType = "interviewer" | "partner"

interface TrackMessageParams {
  type: MessageType
  message: string
  chatType: ChatType
}

interface UseChatTrackingReturn {
  trackMessage: (type: MessageType, message: string, chatType: ChatType) => void
  trackUserMessage: (message: string, chatType: ChatType) => void
  trackAIMessage: (message: string, chatType: ChatType) => void
}

/**
 * Hook for tracking chat messages during interview sessions
 */
export function useChatTracking(sessionId: string | null): UseChatTrackingReturn {
  const { firebaseUser } = useAuth()
  const pendingRef = useRef<Map<string, boolean>>(new Map())

  const trackMessage = useCallback(
    async (type: MessageType, message: string, chatType: ChatType) => {
      if (!sessionId || !firebaseUser || !message.trim()) return

      // Dedupe: skip if we're already tracking this exact message
      const messageKey = `${type}-${chatType}-${message.slice(0, 50)}`
      if (pendingRef.current.has(messageKey)) return
      pendingRef.current.set(messageKey, true)

      try {
        const token = await firebaseUser.getIdToken()

        // Fire and forget - don't block the UI
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
          console.error("[ChatTracking] Failed to track message:", err)
        })
      } catch (err) {
        console.error("[ChatTracking] Error getting token:", err)
      } finally {
        // Clean up after a delay
        setTimeout(() => {
          pendingRef.current.delete(messageKey)
        }, 1000)
      }
    },
    [sessionId, firebaseUser]
  )

  const trackUserMessage = useCallback(
    (message: string, chatType: ChatType) => {
      trackMessage("user", message, chatType)
    },
    [trackMessage]
  )

  const trackAIMessage = useCallback(
    (message: string, chatType: ChatType) => {
      trackMessage("ai", message, chatType)
    },
    [trackMessage]
  )

  return {
    trackMessage,
    trackUserMessage,
    trackAIMessage,
  }
}

export default useChatTracking

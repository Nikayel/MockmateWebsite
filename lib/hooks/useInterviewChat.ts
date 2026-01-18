/**
 * useInterviewChat Hook
 *
 * Manages AI chat functionality for both:
 * - AI Partner (coding assistance)
 * - AI Interviewer (mock interview questions)
 */

import { useState, useCallback, useRef, useEffect } from "react"
import { User as FirebaseUser } from "firebase/auth"

export interface ChatMessage {
  type: "user" | "ai"
  message: string
}

export interface UseInterviewChatOptions {
  firebaseUser: FirebaseUser | null
  userId: string | null
  scenarioId?: string | null
  scenarioTitle?: string
  scenarioType?: string
  sessionId?: string | null
}

export interface UseInterviewChatReturn {
  // Partner chat state
  partnerMessages: ChatMessage[]
  partnerInput: string
  isLoadingPartner: boolean

  // Interviewer chat state
  interviewerMessages: ChatMessage[]
  interviewerInput: string
  isLoadingInterviewer: boolean

  // Actions
  setPartnerInput: (input: string) => void
  setInterviewerInput: (input: string) => void
  sendPartnerMessage: (
    code: string,
    workspaceContext?: Array<{ path: string; content: string }>
  ) => Promise<void>
  sendInterviewerMessage: (code: string) => Promise<void>
  clearChats: () => void
  setPartnerMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setInterviewerMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}

export function useInterviewChat({
  firebaseUser,
  userId,
  scenarioId,
  scenarioTitle,
  scenarioType,
  sessionId,
}: UseInterviewChatOptions): UseInterviewChatReturn {
  // Partner chat state
  const [partnerMessages, setPartnerMessages] = useState<ChatMessage[]>([])
  const [partnerInput, setPartnerInput] = useState("")
  const [isLoadingPartner, setIsLoadingPartner] = useState(false)

  // Interviewer chat state
  const [interviewerMessages, setInterviewerMessages] = useState<ChatMessage[]>([])
  const [interviewerInput, setInterviewerInput] = useState("")
  const [isLoadingInterviewer, setIsLoadingInterviewer] = useState(false)

  // Abort controllers for cancelling requests
  const partnerAbortRef = useRef<AbortController | null>(null)
  const interviewerAbortRef = useRef<AbortController | null>(null)

  // Cleanup abort controllers on unmount to prevent memory leaks
  // and avoid setting state on unmounted components
  useEffect(() => {
    return () => {
      if (partnerAbortRef.current) {
        partnerAbortRef.current.abort()
      }
      if (interviewerAbortRef.current) {
        interviewerAbortRef.current.abort()
      }
    }
  }, [])

  const sendPartnerMessage = useCallback(
    async (code: string, workspaceContext?: Array<{ path: string; content: string }>) => {
      if (!partnerInput.trim() || !firebaseUser) return

      const userMessage = partnerInput.trim()
      setPartnerInput("")
      setPartnerMessages((prev) => [...prev, { type: "user", message: userMessage }])
      setIsLoadingPartner(true)

      // Cancel any pending request
      if (partnerAbortRef.current) {
        partnerAbortRef.current.abort()
      }
      partnerAbortRef.current = new AbortController()

      try {
        const token = await firebaseUser.getIdToken()

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: userMessage,
            context: code,
            role: "partner",
            userContext: {
              scenarioId,
              scenarioTitle,
              scenarioType,
            },
            workspaceContext,
            conversationHistory: partnerMessages.slice(-30).map((m) => ({
              role: m.type === "user" ? "user" : "assistant",
              content: m.message,
            })),
          }),
          signal: partnerAbortRef.current.signal,
        })

        if (!response.ok) {
          // Try to parse error response for better error messages
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || errorData.message || "Failed to get response"
          throw new Error(errorMessage)
        }

        const data = await response.json()
        setPartnerMessages((prev) => [...prev, { type: "ai", message: data.response }])
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return // Request was cancelled
        }
        // Provide more specific error messages based on error type
        const errorMsg = err instanceof Error ? err.message.toLowerCase() : ""
        let userMessage = "Sorry, I encountered an error. Please try again."

        if (errorMsg.includes("quota") || errorMsg.includes("rate limit")) {
          userMessage = "The AI service is temporarily busy. Please wait a moment and try again."
        } else if (errorMsg.includes("timeout")) {
          userMessage = "The response took too long. Please try a shorter message."
        }

        setPartnerMessages((prev) => [...prev, { type: "ai", message: userMessage }])
      } finally {
        setIsLoadingPartner(false)
      }
    },
    [partnerInput, firebaseUser, scenarioId, scenarioTitle, scenarioType, partnerMessages]
  )

  const sendInterviewerMessage = useCallback(
    async (code: string) => {
      if (!interviewerInput.trim() || !firebaseUser) return

      const userMessage = interviewerInput.trim()
      setInterviewerInput("")
      setInterviewerMessages((prev) => [...prev, { type: "user", message: userMessage }])
      setIsLoadingInterviewer(true)

      // Cancel any pending request
      if (interviewerAbortRef.current) {
        interviewerAbortRef.current.abort()
      }
      interviewerAbortRef.current = new AbortController()

      try {
        const token = await firebaseUser.getIdToken()

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: userMessage,
            context: code,
            role: "interviewer",
            userContext: {
              scenarioId,
              scenarioTitle,
              scenarioType,
            },
            conversationHistory: interviewerMessages.slice(-30).map((m) => ({
              role: m.type === "user" ? "user" : "assistant",
              content: m.message,
            })),
          }),
          signal: interviewerAbortRef.current.signal,
        })

        if (!response.ok) {
          // Try to parse error response for better error messages
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || errorData.message || "Failed to get response"
          throw new Error(errorMessage)
        }

        const data = await response.json()
        setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.response }])
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return // Request was cancelled
        }
        // Provide more specific error messages based on error type
        const errorMsg = err instanceof Error ? err.message.toLowerCase() : ""
        let userMessage = "Sorry, I encountered an error. Please try again."

        if (errorMsg.includes("quota") || errorMsg.includes("rate limit")) {
          userMessage = "The AI service is temporarily busy. Please wait a moment and try again."
        } else if (errorMsg.includes("timeout")) {
          userMessage = "The response took too long. Please try a shorter message."
        }

        setInterviewerMessages((prev) => [...prev, { type: "ai", message: userMessage }])
      } finally {
        setIsLoadingInterviewer(false)
      }
    },
    [interviewerInput, firebaseUser, scenarioId, scenarioTitle, scenarioType, interviewerMessages]
  )

  const clearChats = useCallback(() => {
    // Cancel any pending requests
    if (partnerAbortRef.current) {
      partnerAbortRef.current.abort()
    }
    if (interviewerAbortRef.current) {
      interviewerAbortRef.current.abort()
    }

    setPartnerMessages([])
    setInterviewerMessages([])
    setPartnerInput("")
    setInterviewerInput("")
  }, [])

  return {
    partnerMessages,
    partnerInput,
    isLoadingPartner,
    interviewerMessages,
    interviewerInput,
    isLoadingInterviewer,
    setPartnerInput,
    setInterviewerInput,
    sendPartnerMessage,
    sendInterviewerMessage,
    clearChats,
    setPartnerMessages,
    setInterviewerMessages,
  }
}

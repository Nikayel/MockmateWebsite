/**
 * Two-Phase Feedback Hook
 *
 * Implements the two-phase feedback flow:
 * 1. Instant: Get algorithmic scores immediately (< 3s)
 * 2. Rich: Poll for AI-generated narrative feedback
 *
 * This provides a much better UX than waiting 30+ seconds for feedback.
 */

import { useState, useCallback, useRef, useEffect } from "react"
import { getCurrentUserToken } from "@/lib/firebase-lazy"

export interface FeedbackScores {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  overall: number
}

export interface StructuredFeedback {
  tldr: string
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]
}

export interface TwoPhaseFeedbackState {
  // Phase tracking
  phase: "idle" | "instant" | "polling" | "complete" | "error"

  // Instant feedback (available immediately)
  instantScores: FeedbackScores | null
  instantFlags: {
    silentSolution: boolean
    incompleteSolution: boolean
    aiCopyingDetected: boolean
  } | null
  instantConfidence: "low" | "medium" | "high" | null

  // Rich feedback (available after polling)
  richFeedback: string | null
  richScores: FeedbackScores | null
  structuredFeedback: StructuredFeedback | null
  constitutionalAICritique: Record<string, unknown> | null

  // Technical score (for mastery)
  technicalScore: number | null

  // Job tracking
  jobId: string | null
  pollCount: number

  // Error handling
  error: string | null
}

export interface InstantFeedbackRequest {
  sessionId: string
  userId: string
  code: string
  language: string
  testsPassed: number
  testsTotal: number
  efficiencyScore?: number
  submittedFromPhase?: string
  testsRanBeforeSubmit?: boolean
  scenarioType?: "dsa" | "system-design" | "bugfix"
  scenarioTitle?: string
  scenarioId?: string
  scenarioDifficulty?: "easy" | "medium" | "hard"
  scenarioPattern?: string
  conversationTranscript?: unknown[]
  partnerMessages?: string[]
  phaseTracking?: unknown
  silentNotes?: unknown[]
  aiCollaborationMetrics?: unknown
  interactionMetrics?: unknown
  efficiencyMetrics?: unknown
  scenarioClarifyingQuestions?: string[]
  realInterviewMode?: boolean
}

const POLL_INTERVAL_MS = 2000 // Poll every 2 seconds
const MAX_POLL_COUNT = 90 // Max 3 minutes of polling (90 * 2s)

export function useTwoPhaseFeedback() {
  const [state, setState] = useState<TwoPhaseFeedbackState>({
    phase: "idle",
    instantScores: null,
    instantFlags: null,
    instantConfidence: null,
    richFeedback: null,
    richScores: null,
    structuredFeedback: null,
    constitutionalAICritique: null,
    technicalScore: null,
    jobId: null,
    pollCount: 0,
    error: null,
  })

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  /**
   * Start the two-phase feedback flow
   */
  const startFeedback = useCallback(async (request: InstantFeedbackRequest) => {
    // Reset state
    setState({
      phase: "instant",
      instantScores: null,
      instantFlags: null,
      instantConfidence: null,
      richFeedback: null,
      richScores: null,
      structuredFeedback: null,
      constitutionalAICritique: null,
      technicalScore: null,
      jobId: null,
      pollCount: 0,
      error: null,
    })

    try {
      const idToken = await getCurrentUserToken()
      if (!idToken) {
        throw new Error("You must be signed in to get feedback.")
      }
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      }

      // Phase 1: Get instant feedback
      const instantResponse = await fetch("/api/feedback/instant", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(request),
      })

      if (!instantResponse.ok) {
        throw new Error(`Instant feedback failed: ${instantResponse.status}`)
      }

      const instantData = await instantResponse.json()

      // Update state with instant scores
      setState((prev) => ({
        ...prev,
        phase: "polling",
        instantScores: instantData.scores,
        instantFlags: instantData.flags,
        instantConfidence: instantData.confidence,
        jobId: instantData.jobId,
        // Use instant overall as initial technical score
        technicalScore: Math.round(
          (instantData.scores.understanding +
            instantData.scores.problemSolving +
            instantData.scores.codeQuality) /
            3
        ),
      }))

      // Phase 2: Trigger background processing and start polling
      // Fire-and-forget the process request
      fetch("/api/feedback/process", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ jobId: instantData.jobId }),
      }).catch((err) => console.error("Background process trigger failed:", err))

      // Start polling for rich feedback
      startPolling(instantData.jobId)

      return instantData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get feedback"
      setState((prev) => ({
        ...prev,
        phase: "error",
        error: errorMessage,
      }))
      throw error
    }
  }, [])

  /**
   * Poll for rich feedback completion
   */
  const startPolling = useCallback((jobId: string) => {
    if (isPollingRef.current) return
    isPollingRef.current = true

    const poll = async () => {
      try {
        const idToken = await getCurrentUserToken()
        const response = await fetch(`/api/feedback/status?jobId=${jobId}`, {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
        })
        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`)
        }

        const data = await response.json()

        setState((prev) => {
          const newPollCount = prev.pollCount + 1

          if (data.status === "complete" && data.result) {
            // Rich feedback is ready!
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            isPollingRef.current = false

            return {
              ...prev,
              phase: "complete",
              richFeedback: data.result.feedback,
              richScores: data.result.scores,
              structuredFeedback: data.result.structured
                ? {
                    tldr: data.result.structured.tldr || "",
                    whatWorked: data.result.structured.whatWorked || [],
                    fixNext: data.result.structured.fixNext || [],
                    actionPlan: data.result.structured.actionPlan || [],
                  }
                : null,
              constitutionalAICritique: data.result.constitutionalAICritique || null,
              technicalScore: data.result.technicalScore || prev.technicalScore,
              pollCount: newPollCount,
            }
          }

          if (data.status === "failed") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            isPollingRef.current = false

            // Keep instant scores, just note the error
            return {
              ...prev,
              phase: "complete", // Still "complete" - we have instant scores
              error: data.error || "Rich feedback generation failed",
              pollCount: newPollCount,
            }
          }

          // Check for timeout
          if (newPollCount >= MAX_POLL_COUNT) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            isPollingRef.current = false

            return {
              ...prev,
              phase: "complete", // Still "complete" - we have instant scores
              error: "Rich feedback timed out",
              pollCount: newPollCount,
            }
          }

          // Still processing
          return {
            ...prev,
            pollCount: newPollCount,
          }
        })
      } catch (error) {
        console.error("Polling error:", error)
        // Don't stop polling on transient errors
        setState((prev) => ({
          ...prev,
          pollCount: prev.pollCount + 1,
        }))
      }
    }

    // Initial poll
    poll()

    // Set up interval
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
  }, [])

  /**
   * Stop polling (e.g., if user navigates away)
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    isPollingRef.current = false
  }, [])

  /**
   * Get the best available scores (rich if available, otherwise instant)
   */
  const getBestScores = useCallback((): FeedbackScores | null => {
    return state.richScores || state.instantScores
  }, [state.richScores, state.instantScores])

  /**
   * Get the best available feedback text
   */
  const getBestFeedback = useCallback((): string | null => {
    return state.richFeedback
  }, [state.richFeedback])

  /**
   * Check if we're still loading rich feedback
   */
  const isLoadingRich = useCallback((): boolean => {
    return state.phase === "polling"
  }, [state.phase])

  /**
   * Reset the feedback state
   */
  const reset = useCallback(() => {
    stopPolling()
    setState({
      phase: "idle",
      instantScores: null,
      instantFlags: null,
      instantConfidence: null,
      richFeedback: null,
      richScores: null,
      structuredFeedback: null,
      constitutionalAICritique: null,
      technicalScore: null,
      jobId: null,
      pollCount: 0,
      error: null,
    })
  }, [stopPolling])

  return {
    state,
    startFeedback,
    stopPolling,
    getBestScores,
    getBestFeedback,
    isLoadingRich,
    reset,
  }
}

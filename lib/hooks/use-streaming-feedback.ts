/**
 * Streaming Feedback Hook
 *
 * Connects to the Edge streaming endpoint and handles
 * Server-Sent Events (SSE) for real-time feedback updates.
 *
 * Flow:
 * 1. Connect to /api/feedback/stream (Edge runtime, no timeout)
 * 2. Receive instant scores immediately
 * 3. Receive refined scores after AI validation
 * 4. Receive full feedback at the end
 * 5. Call /api/feedback/persist to save to Firestore (Edge can't access Firebase)
 *
 * Events:
 * - phase: Current processing phase
 * - scores: Instant algorithmic scores
 * - refined_scores: AI-validated scores
 * - feedback: Full structured feedback
 * - error: Error occurred
 * - done: Stream complete
 */

import { useState, useCallback, useRef } from "react"
import { logger } from "@/lib/logger"

export interface StreamingScores {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  overall: number
}

export interface SilentNote {
  type: string
  timestamp: number
  userSaid: string
  correct?: string
  context?: string
}

export interface StreamingFeedback {
  raw: string
  tldr: string
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]
  silentNotes?: SilentNote[]
  bugfixEvidenceSummary?: unknown
  bugfixScoreBreakdown?: unknown
  bugfixPostSessionReport?: unknown
  scores: StreamingScores
}

export interface StreamingFeedbackState {
  // Connection state
  isConnected: boolean
  isComplete: boolean
  isPersisted: boolean // True after results are saved to Firestore

  // Current phase
  phase:
    | "idle"
    | "calculating_scores"
    | "analyzing"
    | "generating"
    | "persisting"
    | "complete"
    | "error"
  phaseMessage: string

  // Scores (instant first, then refined)
  instantScores: StreamingScores | null
  refinedScores: StreamingScores | null
  flags: {
    silentSolution: boolean
    incompleteSolution: boolean
    aiCopyingDetected: boolean
  } | null

  // Rich feedback (arrives at end)
  feedback: StreamingFeedback | null

  // Persisted scores (from Firestore save)
  masteryScore: number | null
  technicalScore: number | null

  // Error
  error: string | null
}

export interface StreamingFeedbackRequest {
  sessionId: string
  userId: string
  code: string
  language: string
  testsPassed: number
  testsTotal: number
  scenarioType?: string
  scenarioTitle?: string
  scenarioId?: string
  scenarioDifficulty?: string
  scenarioPattern?: string
  conversationTranscript?: unknown[]
  partnerMessages?: string[]
  phaseTracking?: unknown
  silentNotes?: unknown[]
  efficiencyMetrics?: unknown
  submittedFromPhase?: string
  testsRanBeforeSubmit?: boolean
  bugfixEvidenceEvents?: unknown[]
  bugfixExpectedTouchedFiles?: string[]
  bugfixHypothesis?: string
  bugfixRootCause?: string
  bugfixPrevention?: string
  bugfixRootCauseRubric?: string[]
  bugfixGroundTruth?: string
  // For mastery score calculation
  hintsUsed?: number
  elapsedTimeSeconds?: number
}

export function useStreamingFeedback() {
  const [state, setState] = useState<StreamingFeedbackState>({
    isConnected: false,
    isComplete: false,
    isPersisted: false,
    phase: "idle",
    phaseMessage: "",
    instantScores: null,
    refinedScores: null,
    flags: null,
    feedback: null,
    masteryScore: null,
    technicalScore: null,
    error: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const requestRef = useRef<StreamingFeedbackRequest | null>(null)

  /**
   * Persist feedback to Firestore after streaming completes
   */
  const persistFeedback = useCallback(
    async (
      request: StreamingFeedbackRequest,
      scores: StreamingScores,
      feedback: StreamingFeedback
    ) => {
      setState((prev) => ({
        ...prev,
        phase: "persisting",
        phaseMessage: "Saving your results...",
      }))

      try {
        const response = await fetch("/api/feedback/persist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: request.sessionId,
            userId: request.userId,
            scores,
            feedback: {
              raw: feedback.raw,
              tldr: feedback.tldr,
              whatWorked: feedback.whatWorked,
              fixNext: feedback.fixNext,
              actionPlan: feedback.actionPlan,
            },
            // Include generated silent notes from streaming (takes precedence)
            silentNotes: feedback.silentNotes || request.silentNotes || [],
            bugfixEvidenceSummary: feedback.bugfixEvidenceSummary,
            bugfixScoreBreakdown: feedback.bugfixScoreBreakdown,
            bugfixPostSessionReport: feedback.bugfixPostSessionReport,
            testsPassed: request.testsPassed,
            testsTotal: request.testsTotal,
            timeSpentMinutes: Math.round((request.elapsedTimeSeconds || 1800) / 60),
            hintsUsed: request.hintsUsed || 0,
            difficulty: request.scenarioDifficulty || "medium",
            scenarioType: request.scenarioType || "dsa",
            scenarioTitle: request.scenarioTitle || "Unknown",
            scenarioId: request.scenarioId,
            scenarioPattern: request.scenarioPattern,
            conversationTranscript: request.conversationTranscript,
            efficiencyMetrics: request.efficiencyMetrics,
          }),
        })

        if (!response.ok) {
          throw new Error(`Persist failed: ${response.status}`)
        }

        const result = await response.json()

        setState((prev) => ({
          ...prev,
          isPersisted: true,
          phase: "complete",
          phaseMessage: "Done!",
          masteryScore: result.masteryScore,
          technicalScore: result.technicalScore,
        }))

        return result
      } catch (error) {
        logger.error("[StreamingFeedback] Persist failed:", { error })
        // Don't fail the whole flow if persist fails - feedback is still shown
        setState((prev) => ({
          ...prev,
          isPersisted: false,
          phase: "complete",
          phaseMessage: "Done!",
          error: "Results could not be saved. Your feedback is still available below.",
        }))
        return null
      }
    },
    []
  )

  /**
   * Start streaming feedback
   */
  const startStreaming = useCallback(
    async (request: StreamingFeedbackRequest) => {
      // Abort any existing connection
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Store request for persist call
      requestRef.current = request

      // Reset state
      setState({
        isConnected: true,
        isComplete: false,
        isPersisted: false,
        phase: "calculating_scores",
        phaseMessage: "Starting...",
        instantScores: null,
        refinedScores: null,
        flags: null,
        feedback: null,
        masteryScore: null,
        technicalScore: null,
        error: null,
      })

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Variables to capture final state for persist
      let finalScores: StreamingScores | null = null
      let finalFeedback: StreamingFeedback | null = null

      try {
        const response = await fetch("/api/feedback/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`Stream failed: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body")
        }

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split("\n")
          buffer = lines.pop() || "" // Keep incomplete line in buffer

          let currentEvent = ""
          let currentData = ""

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7)
            } else if (line.startsWith("data: ")) {
              currentData = line.slice(6)

              // Process complete event
              if (currentEvent && currentData) {
                try {
                  const data = JSON.parse(currentData)

                  // Capture final scores and feedback for persist
                  if (currentEvent === "refined_scores") {
                    finalScores = data as StreamingScores
                  } else if (currentEvent === "scores" && !finalScores) {
                    finalScores = data as StreamingScores
                  } else if (currentEvent === "feedback") {
                    finalFeedback = data as StreamingFeedback
                    // Also update finalScores from feedback if available
                    if ((data as StreamingFeedback).scores) {
                      finalScores = (data as StreamingFeedback).scores
                    }
                  }

                  handleEvent(currentEvent, data)
                } catch {
                  // Invalid JSON, skip
                }
                currentEvent = ""
                currentData = ""
              }
            }
          }
        }

        // After streaming completes, persist to Firestore
        if (finalScores && finalFeedback && requestRef.current) {
          await persistFeedback(requestRef.current, finalScores, finalFeedback)
        } else {
          // Streaming completed but missing data
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isComplete: true,
            phase: "complete",
            error: finalFeedback ? null : "Feedback generation did not complete. Please try again.",
          }))
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // User cancelled, don't treat as error
          return
        }

        logger.error("[StreamingFeedback] Stream failed:", { error })
        setState((prev) => ({
          ...prev,
          isConnected: false,
          phase: "error",
          error: "Something went wrong generating feedback. Please try again.",
        }))
      }
    },
    [persistFeedback]
  )

  /**
   * Handle incoming SSE events
   */
  const handleEvent = useCallback((event: string, data: unknown) => {
    switch (event) {
      case "phase":
        setState((prev) => ({
          ...prev,
          phase: (data as { phase: string }).phase as StreamingFeedbackState["phase"],
          phaseMessage: (data as { message: string }).message || "",
        }))
        break

      case "scores":
        setState((prev) => ({
          ...prev,
          instantScores: {
            understanding: (data as StreamingScores).understanding,
            problemSolving: (data as StreamingScores).problemSolving,
            codeQuality: (data as StreamingScores).codeQuality,
            communication: (data as StreamingScores).communication,
            overall: (data as StreamingScores).overall,
          },
          flags: (data as { flags: StreamingFeedbackState["flags"] }).flags || null,
        }))
        break

      case "refined_scores":
        setState((prev) => ({
          ...prev,
          refinedScores: {
            understanding: (data as StreamingScores).understanding,
            problemSolving: (data as StreamingScores).problemSolving,
            codeQuality: (data as StreamingScores).codeQuality,
            communication: (data as StreamingScores).communication,
            overall: (data as StreamingScores).overall,
          },
        }))
        break

      case "feedback":
        setState((prev) => ({
          ...prev,
          feedback: data as StreamingFeedback,
        }))
        break

      case "error":
        logger.error("[StreamingFeedback] Server error event:", { data })
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: "Something went wrong generating feedback. Please try again.",
        }))
        break

      case "done":
        // Note: Don't set phase to "complete" here - wait for persist
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isComplete: true,
          // Phase will be set to "complete" after persist succeeds
        }))
        break
    }
  }, [])

  /**
   * Cancel the stream
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState((prev) => ({
      ...prev,
      isConnected: false,
    }))
  }, [])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    cancel()
    requestRef.current = null
    setState({
      isConnected: false,
      isComplete: false,
      isPersisted: false,
      phase: "idle",
      phaseMessage: "",
      instantScores: null,
      refinedScores: null,
      flags: null,
      feedback: null,
      masteryScore: null,
      technicalScore: null,
      error: null,
    })
  }, [cancel])

  /**
   * Get best available scores (refined if available, otherwise instant)
   */
  const getBestScores = useCallback((): StreamingScores | null => {
    return state.refinedScores || state.instantScores
  }, [state.refinedScores, state.instantScores])

  return {
    state,
    startStreaming,
    cancel,
    reset,
    getBestScores,
  }
}

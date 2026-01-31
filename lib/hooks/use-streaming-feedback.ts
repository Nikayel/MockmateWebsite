/**
 * Streaming Feedback Hook
 *
 * Connects to the Edge streaming endpoint and handles
 * Server-Sent Events (SSE) for real-time feedback updates.
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

export interface StreamingScores {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  overall: number
}

export interface StreamingFeedback {
  raw: string
  tldr: string
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]
  scores: StreamingScores
}

export interface StreamingFeedbackState {
  // Connection state
  isConnected: boolean
  isComplete: boolean

  // Current phase
  phase: "idle" | "calculating_scores" | "analyzing" | "generating" | "complete" | "error"
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
}

export function useStreamingFeedback() {
  const [state, setState] = useState<StreamingFeedbackState>({
    isConnected: false,
    isComplete: false,
    phase: "idle",
    phaseMessage: "",
    instantScores: null,
    refinedScores: null,
    flags: null,
    feedback: null,
    error: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Start streaming feedback
   */
  const startStreaming = useCallback(async (request: StreamingFeedbackRequest) => {
    // Abort any existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Reset state
    setState({
      isConnected: true,
      isComplete: false,
      phase: "calculating_scores",
      phaseMessage: "Starting...",
      instantScores: null,
      refinedScores: null,
      flags: null,
      feedback: null,
      error: null,
    })

    const abortController = new AbortController()
    abortControllerRef.current = abortController

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
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // User cancelled, don't treat as error
        return
      }

      setState((prev) => ({
        ...prev,
        isConnected: false,
        phase: "error",
        error: error instanceof Error ? error.message : "Stream failed",
      }))
    }
  }, [])

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
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: (data as { message: string }).message,
        }))
        break

      case "done":
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isComplete: true,
          phase: "complete",
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
    setState({
      isConnected: false,
      isComplete: false,
      phase: "idle",
      phaseMessage: "",
      instantScores: null,
      refinedScores: null,
      flags: null,
      feedback: null,
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

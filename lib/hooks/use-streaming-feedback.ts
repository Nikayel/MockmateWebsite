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
import { getGuidedLabMasterySummary } from "@/lib/stores/guided-lab-store"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { REFUSAL_TITLES, isKnownRefusalCode } from "@/lib/interview/refusal-copy"

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

/**
 * A refusal the server DECIDED on, as opposed to a failure it suffered.
 *
 * /api/feedback/stream returns meaningful 401, 429, and 503 bodies (sign in
 * again, rate limited, platform capacity paused), and the entitlement layer
 * behind it can add quota and budget blocks. All of them are legitimate, all are
 * temporary, and each has a different thing the user should do next. The hook
 * used to throw the response away and render every one as "Something went wrong
 * generating feedback. Please try again." A user who had just spent 20 to 45
 * minutes on an interview was told nothing about why, so they retried, which is
 * the one thing that makes a rate limit or a spend ceiling worse.
 */
export interface FeedbackRefusal {
  /** Machine-readable reason, e.g. GLOBAL_CAPACITY_LIMIT. */
  code: string
  /** Short label naming the cause, from lib/interview/refusal-copy.ts. */
  title: string
  /** The server's own explanation, which knows the numbers and the reset time. */
  message: string
}

/** Statuses that are a designed refusal even when the body carries no code. */
const STATUS_FALLBACK_CODES: Record<number, string> = {
  401: "AUTH_REQUIRED",
  429: "RATE_LIMITED",
  503: "SERVICE_UNAVAILABLE",
}

/**
 * What to say when a refusal arrives correctly labelled but with no prose. Never
 * blame the user, always say the session survived, always say what happens next.
 */
const FALLBACK_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Please sign in again to see your feedback. Your session is saved.",
  RATE_LIMITED: "Wait a moment and try again. Your session is saved.",
  SERVICE_UNAVAILABLE: "Please try again in a few minutes. Your session is saved.",
}

const GENERIC_REFUSAL_MESSAGE = "Please try again in a little while. Your session is saved."

/**
 * Turn a non-OK feedback response into the refusal a user should see, or null
 * when the failure is not a refusal at all (a 500, a dropped connection) and the
 * existing generic handling is the honest answer.
 *
 * Pure and exported so the mapping can be tested without a rendered interview.
 */
export function buildFeedbackRefusal(
  status: number,
  body: { code?: unknown; message?: unknown; error?: unknown } | null | undefined
): FeedbackRefusal | null {
  const code = typeof body?.code === "string" ? body.code : undefined
  const message = typeof body?.message === "string" ? body.message : undefined
  const error = typeof body?.error === "string" ? body.error : undefined
  const serverText = message ?? error

  // The server labelled it: its own wording knows the tier, the cap, and when
  // the block lifts, so prefer it over anything written here.
  if (isKnownRefusalCode(code)) {
    return {
      code,
      title: REFUSAL_TITLES[code] ?? "We couldn't finish your feedback",
      message: serverText ?? FALLBACK_MESSAGES[code] ?? GENERIC_REFUSAL_MESSAGE,
    }
  }

  // No usable code, but the status alone still separates three different
  // remedies. Only a status that says nothing falls through to generic.
  const fallbackCode = STATUS_FALLBACK_CODES[status]
  if (fallbackCode) {
    return {
      code: fallbackCode,
      title: REFUSAL_TITLES[fallbackCode],
      message: serverText ?? FALLBACK_MESSAGES[fallbackCode] ?? GENERIC_REFUSAL_MESSAGE,
    }
  }

  return null
}

/** Read a refusal body without letting a malformed one mask the refusal. */
async function readRefusalBody(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return null
  }
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

  /**
   * Set only when the server refused for a reason it named. Null for ordinary
   * failures, which is what lets a presenter keep its generic handling for a
   * genuine crash while giving a quota or capacity block its real words.
   */
  refusal: FeedbackRefusal | null
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
    refusal: null,
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
        const idToken = await getCurrentUserToken()
        if (!idToken) {
          throw new Error("You must be signed in to save feedback.")
        }
        const response = await fetch("/api/feedback/persist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
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
            // Use the real elapsed time; a 0-second session must persist as 0
            // minutes, not a 30-minute default (EDGE-15). Only genuinely-missing
            // data (undefined) falls back to 0, matching useFeedbackStreaming.
            timeSpentMinutes: Math.round((request.elapsedTimeSeconds ?? 0) / 60),
            hintsUsed: request.hintsUsed || 0,
            difficulty: request.scenarioDifficulty || "medium",
            scenarioType: request.scenarioType || "dsa",
            scenarioTitle: request.scenarioTitle || "Unknown",
            scenarioId: request.scenarioId,
            // Guided-lab practice signal (quiz accuracy / milestone completion);
            // undefined for non-guided runs. Server also detects guided runs via
            // scenarioId, so this only ENRICHES the mastery summary.
            guidedLabMastery: getGuidedLabMasterySummary(request.scenarioId),
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
        refusal: null,
      })

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Variables to capture final state for persist
      let finalScores: StreamingScores | null = null
      let finalFeedback: StreamingFeedback | null = null

      /** End the run on a named refusal instead of the generic failure. */
      const failWithRefusal = (refusal: FeedbackRefusal) => {
        logger.warn("[StreamingFeedback] Feedback refused:", {
          code: refusal.code,
        })
        setState((prev) => ({
          ...prev,
          isConnected: false,
          phase: "error",
          refusal,
          error: refusal.message,
        }))
      }

      try {
        const idToken = await getCurrentUserToken()
        if (!idToken) {
          // A token that has gone away mid-interview is a sign-in problem with a
          // sign-in remedy, not a crash. Throwing here routed it to the generic
          // catch below and told the user to "try again", which never worked.
          failWithRefusal({
            code: "AUTH_REQUIRED",
            title: REFUSAL_TITLES.AUTH_REQUIRED,
            message: FALLBACK_MESSAGES.AUTH_REQUIRED,
          })
          return
        }
        const response = await fetch("/api/feedback/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(request),
          signal: abortController.signal,
        })

        if (!response.ok) {
          // The route answers a refusal as an ordinary HTTP error precisely so
          // the caller can surface it. Reading the body here is the whole point:
          // a rate limit, a quota, and a platform-wide capacity pause all arrive
          // with different remedies, and the throw below flattened them into one
          // "something went wrong" that invited an immediate retry.
          const refusal = buildFeedbackRefusal(response.status, await readRefusalBody(response))
          if (refusal) {
            failWithRefusal(refusal)
            return
          }
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
      refusal: null,
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

import { useCallback, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { User as FirebaseUser } from "firebase/auth"

/** A single RAG hint as rendered in the problem column. Only `hint` is read here. */
interface MetricsRagHint {
  hint: string
}

export interface TrackSessionCompletionParams {
  sessionId: string
  finalCode: string
  language: string
  testsPassed: number
  testsTotal: number
  efficiencyScore: number
  communicationScore?: number
}

export interface UpdateSpacedRepetitionParams {
  problemId: string
  performanceScore: number
  masteryScore?: number
  timeSpentMinutes: number
  hintsUsed: number
  testCasesPassed: number
  testCasesTotal: number
}

export type HintFeedbackValue = "helpful" | "unhelpful"

export interface UseInterviewMetricsOptions {
  // auth (used by track + spaced-rep token fetch)
  firebaseUser: FirebaseUser | null
  // read-only cross-cutting deps for submitHintFeedback's /api/rag body
  selectedScenarioId: string | undefined
  userId: string | undefined
  guestId: string | null
  currentSessionId: string | null
  ragHints: MetricsRagHint[]
}

export interface UseInterviewMetricsResult {
  trackSessionCompletion: (params: TrackSessionCompletionParams) => Promise<void>
  updateSpacedRepetition: (params: UpdateSpacedRepetitionParams) => Promise<void>
  submitHintFeedback: (hintIndex: number, feedbackType: HintFeedbackValue) => Promise<void>
  hintFeedback: Map<string, HintFeedbackValue>
  setHintFeedback: Dispatch<SetStateAction<Map<string, HintFeedbackValue>>>
}

/** Pure: builds the per-hint feedback key. Exported for unit testing. */
export function buildHintFeedbackId(scenarioId: string | undefined, hintIndex: number): string {
  return `hint-${scenarioId}-${hintIndex}`
}

/**
 * Owns the interview's outbound metrics/feedback writes: session-completion stats
 * (POST /api/session/metrics), spaced-repetition scheduling (POST
 * /api/spaced-repetition/complete), and per-hint feedback (POST /api/rag +
 * the local `hintFeedback` Map). Lifted verbatim from `app/interview/page.tsx`;
 * request payloads and behavior are preserved exactly. The functions + state are
 * returned so the session/feedback flows (which stay in the page) keep calling
 * them; cross-cutting inputs are injected.
 */
export function useInterviewMetrics(
  options: UseInterviewMetricsOptions
): UseInterviewMetricsResult {
  const { firebaseUser, selectedScenarioId, userId, guestId, currentSessionId, ragHints } = options

  const [hintFeedback, setHintFeedback] = useState<Map<string, HintFeedbackValue>>(new Map())

  const trackSessionCompletion = useCallback(
    async (params: TrackSessionCompletionParams) => {
      try {
        const token = await firebaseUser?.getIdToken()
        if (!token) return

        await fetch("/api/session/metrics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            event: "session_complete",
            sessionId: params.sessionId,
            data: {
              finalCode: params.finalCode,
              language: params.language,
              testsPassed: params.testsPassed,
              testsTotal: params.testsTotal,
              efficiencyScore: params.efficiencyScore,
              communicationScore: params.communicationScore,
            },
          }),
        })
      } catch (error) {
        console.error("[Session Metrics] Failed to track completion:", error)
      }
    },
    [firebaseUser]
  )

  const updateSpacedRepetition = useCallback(
    async (params: UpdateSpacedRepetitionParams) => {
      try {
        const token = await firebaseUser?.getIdToken()
        if (!token) return

        const response = await fetch("/api/spaced-repetition/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            problem_id: params.problemId,
            performance_score: params.performanceScore,
            mastery_score: params.masteryScore,
            time_spent_minutes: params.timeSpentMinutes,
            hints_used: params.hintsUsed,
            test_cases_passed: params.testCasesPassed,
            test_cases_total: params.testCasesTotal,
          }),
        })

        if (!response.ok) {
          console.error("[Spaced Repetition] Failed to update:", await response.text())
        }
      } catch (error) {
        console.error("[Spaced Repetition] Failed to update:", error)
      }
    },
    [firebaseUser]
  )

  const submitHintFeedback = useCallback(
    async (hintIndex: number, feedbackType: HintFeedbackValue) => {
      const hintId = buildHintFeedbackId(selectedScenarioId, hintIndex)

      // Update local state immediately for responsive UI
      setHintFeedback((prev) => {
        const newMap = new Map(prev)
        newMap.set(hintId, feedbackType)
        return newMap
      })

      // Send feedback to API (non-blocking)
      try {
        await fetch("/api/rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "record-feedback",
            hintId,
            feedbackType,
            userId: userId || guestId,
            sessionId: currentSessionId,
            problemId: selectedScenarioId,
            hintText: ragHints[hintIndex]?.hint,
            source: "ai-hint",
          }),
        })
      } catch (error) {
        console.error("Error submitting hint feedback:", error)
        // Don't revert - feedback is stored locally anyway
      }
    },
    [selectedScenarioId, userId, guestId, currentSessionId, ragHints]
  )

  return {
    trackSessionCompletion,
    updateSpacedRepetition,
    submitHintFeedback,
    hintFeedback,
    setHintFeedback,
  }
}

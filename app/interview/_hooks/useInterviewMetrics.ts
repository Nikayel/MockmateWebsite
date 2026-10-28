import { sessionFetch } from "@/lib/interview/session-fetch"
import { useCallback } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import { trackSessionComplete } from "@/lib/analytics"

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

export interface UseInterviewMetricsOptions {
  // auth (used by track + spaced-rep token fetch)
  firebaseUser: FirebaseUser | null
  selectedScenarioId: string | undefined
  scenarioType?: string
  difficulty?: string
  elapsedTimeSeconds?: number
}

export interface UseInterviewMetricsResult {
  trackSessionCompletion: (params: TrackSessionCompletionParams) => Promise<void>
  updateSpacedRepetition: (params: UpdateSpacedRepetitionParams) => Promise<void>
}

/** Session-completion telemetry and spaced-repetition writes. */
export function useInterviewMetrics(
  options: UseInterviewMetricsOptions
): UseInterviewMetricsResult {
  const { firebaseUser, selectedScenarioId } = options

  const trackSessionCompletion = useCallback(
    async (params: TrackSessionCompletionParams) => {
      // GA4 session_complete: /api/admin/analytics queries this exact event name.
      // Fired before the token guard so an auth hiccup cannot drop the count.
      // Unknown values stay absent; zero is a real duration, not a missing value.
      trackSessionComplete({
        sessionId: params.sessionId,
        scenarioId: selectedScenarioId || "unknown",
        ...(options.scenarioType ? { scenarioType: options.scenarioType } : {}),
        ...(options.difficulty ? { difficulty: options.difficulty } : {}),
        language: params.language,
        ...(typeof options.elapsedTimeSeconds === "number" &&
        Number.isFinite(options.elapsedTimeSeconds)
          ? { durationMinutes: options.elapsedTimeSeconds / 60 }
          : {}),
      })

      try {
        const token = await firebaseUser?.getIdToken()
        if (!token) return

        await sessionFetch("/api/session/metrics", {
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
    [
      firebaseUser,
      selectedScenarioId,
      options.scenarioType,
      options.difficulty,
      options.elapsedTimeSeconds,
    ]
  )

  const updateSpacedRepetition = useCallback(
    async (params: UpdateSpacedRepetitionParams) => {
      try {
        const token = await firebaseUser?.getIdToken()
        if (!token) return

        const response = await sessionFetch("/api/spaced-repetition/complete", {
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

  return {
    trackSessionCompletion,
    updateSpacedRepetition,
  }
}

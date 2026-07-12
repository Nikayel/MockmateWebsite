/**
 * useInterviewSession Hook
 *
 * Manages the core interview session state including:
 * - Session lifecycle (start, end)
 * - Timer management
 * - Scenario selection
 * - Auto-save functionality
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { User as FirebaseUser } from "firebase/auth"
import { Scenario, getScenarioById } from "@/lib/scenarios"
import {
  recordSessionStart,
  createInterviewSession,
  updateInterviewSession,
  saveSessionState,
  getSessionState,
  checkSessionCost,
} from "@/lib/firestore-helpers"
import { toast } from "sonner"

export interface SessionState {
  code: string
  selectedLanguage: string
  elapsedTime: number
  chatMessages?: Array<{ type: string; message: string }>
  interviewerMessages?: Array<{ type: string; message: string }>
  testResults?: Array<any>
}

export interface UseInterviewSessionOptions {
  firebaseUser: FirebaseUser | null
  userId: string | null
  initialSessionId?: string | null
  initialScenarioId?: string | null
  onSessionRestored?: (state: SessionState) => void
}

export interface UseInterviewSessionReturn {
  // State
  selectedScenario: Scenario | null
  isInterviewStarted: boolean
  currentSessionId: string | null
  elapsedTime: number
  startTime: number | null

  // Actions
  selectScenario: (scenario: Scenario) => void
  startInterview: () => Promise<boolean>
  endInterview: (performanceScore?: number, feedback?: string) => Promise<void>
  saveState: (state: Partial<SessionState>) => Promise<void>

  // Status
  isLoading: boolean
  error: string | null
}

export function useInterviewSession({
  firebaseUser,
  userId,
  initialSessionId,
  initialScenarioId,
  onSessionRestored,
}: UseInterviewSessionOptions): UseInterviewSessionReturn {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveStateRef = useRef<Partial<SessionState>>({})

  // Timer effect
  useEffect(() => {
    if (isInterviewStarted && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isInterviewStarted, startTime])

  // Restore session from URL params
  useEffect(() => {
    const restoreSession = async () => {
      if (!initialSessionId || !initialScenarioId || !firebaseUser) return

      setIsLoading(true)
      try {
        // Get scenario
        const scenario = getScenarioById(initialScenarioId)
        if (!scenario) {
          setError("Scenario not found")
          return
        }

        // Get session state
        const savedState = await getSessionState(initialSessionId)
        if (savedState) {
          setSelectedScenario(scenario)
          setCurrentSessionId(initialSessionId)
          setIsInterviewStarted(true)
          setStartTime(Date.now() - (savedState.elapsedTime || 0) * 1000)

          // Notify parent of restored state
          onSessionRestored?.({
            code: savedState.code || "",
            selectedLanguage: savedState.language || "javascript",
            elapsedTime: savedState.elapsedTime || 0,
            chatMessages: savedState.chatMessages,
            interviewerMessages: savedState.interviewerMessages,
            testResults: savedState.testResults,
          })
        }
      } catch {
        setError("Failed to restore session")
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [initialSessionId, initialScenarioId, firebaseUser, onSessionRestored])

  const selectScenario = useCallback((scenario: Scenario) => {
    setSelectedScenario(scenario)
    setError(null)
  }, [])

  const startInterview = useCallback(async (): Promise<boolean> => {
    if (!firebaseUser || !userId || !selectedScenario) {
      setError("Missing required data to start interview")
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Check session cost
      const costCheck = await checkSessionCost(userId)

      if (!costCheck.allowed) {
        toast.error("Session limit reached", {
          description: costCheck.reason,
        })
        return false
      }

      // Record session start, reusing the quota checkSessionCost already
      // resolved so we skip a duplicate profile + quota read (PERF-S11).
      await recordSessionStart(userId, costCheck.quota)

      // Create session in Firestore
      // Include pattern for stats aggregation (used by dashboard Performance Insights)
      const scenarioPattern =
        ("pattern" in selectedScenario ? selectedScenario.pattern : selectedScenario.type) ||
        "unknown"
      const sessionId = await createInterviewSession(
        userId,
        selectedScenario.title,
        selectedScenario.type,
        selectedScenario.difficulty,
        selectedScenario.id,
        scenarioPattern
      )

      setCurrentSessionId(sessionId)
      setIsInterviewStarted(true)
      setStartTime(Date.now())
      setElapsedTime(0)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start interview"
      setError(message)
      toast.error(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [firebaseUser, userId, selectedScenario])

  const endInterview = useCallback(
    async (performanceScore?: number, feedback?: string) => {
      if (!currentSessionId) return

      try {
        await updateInterviewSession(
          currentSessionId,
          performanceScore,
          feedback,
          // Only mark as complete if we have actual feedback
          feedback ? { feedbackStatus: "complete" } : undefined
        )

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }

        // Clear auto-save
        if (autoSaveRef.current) {
          clearInterval(autoSaveRef.current)
        }
      } catch {
        // Non-critical error
      }
    },
    [currentSessionId]
  )

  const saveState = useCallback(
    async (state: Partial<SessionState>) => {
      if (!currentSessionId) return

      // Merge with last state
      const mergedState = { ...lastSaveStateRef.current, ...state }
      lastSaveStateRef.current = mergedState

      try {
        await saveSessionState(currentSessionId, {
          code: mergedState.code || "",
          selectedLanguage: mergedState.selectedLanguage || "javascript",
          elapsedTime: mergedState.elapsedTime || elapsedTime,
          chatMessages: mergedState.chatMessages,
          interviewerMessages: mergedState.interviewerMessages,
          testResults: mergedState.testResults,
        })
      } catch {
        // Non-critical - localStorage backup exists
      }
    },
    [currentSessionId, elapsedTime]
  )

  return {
    selectedScenario,
    isInterviewStarted,
    currentSessionId,
    elapsedTime,
    startTime,
    selectScenario,
    startInterview,
    endInterview,
    saveState,
    isLoading,
    error,
  }
}

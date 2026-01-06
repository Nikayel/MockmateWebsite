/**
 * Session Manager Service
 *
 * Handles interview session lifecycle:
 * - Session creation and initialization
 * - Auto-save functionality
 * - Session state persistence (localStorage + Firestore)
 * - Session restoration
 * - Guest session management
 */

import { User as FirebaseUser } from "firebase/auth"
import { Scenario } from "@/lib/scenarios"
import {
  createInterviewSession,
  recordSessionStart,
  checkUsageLimit,
  saveSessionState,
  getSessionState,
  updateInterviewSession,
} from "@/lib/firestore-helpers"
import {
  getOrCreateGuestId,
  markFreeTrialUsed,
  saveGuestSessionData,
} from "@/lib/guest-session"
import { toast } from "sonner"

export interface SessionState {
  scenarioId: string
  code: string
  chatMessages: any[]
  interviewerMessages: any[]
  selectedLanguage: string
  elapsedTime: number
  testResults: any[]
  workspaceContext: any[]
  timestamp: number
}

export interface StartSessionOptions {
  scenario: Scenario
  userId?: string | null
  firebaseUser?: FirebaseUser | null
  isGuestMode: boolean
  guestId?: string | null
  usageLimit?: { allowed: boolean } | null
  onSessionCreated?: (sessionId: string) => void
}

export interface StartSessionResult {
  success: boolean
  sessionId?: string
  error?: string
  shouldRedirect?: boolean
  redirectUrl?: string
}

export interface AutoSaveOptions {
  sessionState: SessionState
  currentSessionId: string | null
  firebaseUser?: FirebaseUser | null
  isGuestMode: boolean
  guestId?: string | null
}

export interface RestoreSessionOptions {
  scenarioId: string
  sessionId?: string | null
  firebaseUser?: FirebaseUser | null
  isGuestMode: boolean
  guestId?: string | null
}

/**
 * Start a new interview session
 */
export async function startInterviewSession({
  scenario,
  userId,
  firebaseUser,
  isGuestMode,
  guestId,
  usageLimit,
  onSessionCreated,
}: StartSessionOptions): Promise<StartSessionResult> {
  // Check usage limit before starting (skip for DSA questions)
  if (userId && usageLimit && !usageLimit.allowed && scenario.type !== "dsa") {
    return {
      success: false,
      shouldRedirect: true,
      redirectUrl: "/limit-reached",
    }
  }

  // Create session for authenticated user
  if (userId && firebaseUser) {
    try {
      // Create session document
      const scenarioPattern = ("pattern" in scenario ? scenario.pattern : scenario.type) || "unknown"
      const sessionId = await createInterviewSession(
        userId,
        scenario.title,
        scenario.type,
        scenario.difficulty,
        scenario.id,
        scenarioPattern
      )

      // Initialize session metrics tracking
      const token = await firebaseUser.getIdToken()
      if (token) {
        fetch("/api/session/metrics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            event: "session_start",
            sessionId,
            data: {
              scenarioId: scenario.id,
              scenarioTitle: scenario.title,
              pattern: scenarioPattern,
              difficulty: scenario.difficulty,
              scenarioType: scenario.type,
              hintsTotal: (scenario as any).hints?.length || 3,
            },
          }),
        }).catch((err) => console.error("Session metrics init failed:", err))
      }

      // Record session start (uses free opens or consumes 1 usage)
      const result = await recordSessionStart(userId)
      if (result.usedPaidSession) {
        toast.success(`Session started! You now have ${result.freeOpensRemaining} free opens.`)
      }

      onSessionCreated?.(sessionId)

      return {
        success: true,
        sessionId,
      }
    } catch (error) {
      console.error("Error creating session:", error)
      toast.error("Session tracking error", {
        description: "Your progress will still be saved locally. You can continue the interview.",
      })
      return {
        success: false,
        error: "Failed to create session",
      }
    }
  }

  // Create session for guest user
  if (isGuestMode && guestId) {
    try {
      const scenarioPattern = ("pattern" in scenario ? scenario.pattern : scenario.type) || "unknown"
      const response = await fetch("/api/guest-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guestId,
          scenarioTitle: scenario.title,
          scenarioType: scenario.type,
          scenarioId: scenario.id,
          difficulty: scenario.difficulty,
          pattern: scenarioPattern,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === "FREE_TRIAL_EXHAUSTED") {
          toast.error("Free trial already used", {
            description: "Sign up to continue practicing!",
          })
          markFreeTrialUsed()
          return {
            success: false,
            shouldRedirect: true,
            redirectUrl: "/login?redirect=interview",
          }
        }
        throw new Error(data.error || "Failed to create session")
      }

      // Save initial guest session data to localStorage
      saveGuestSessionData({
        sessionId: data.sessionId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        startedAt: new Date().toISOString(),
      })

      toast.success("Free trial session started!", {
        description: "Complete the interview to see your personalized feedback.",
      })

      onSessionCreated?.(data.sessionId)

      return {
        success: true,
        sessionId: data.sessionId,
      }
    } catch (error) {
      console.error("Error creating guest session:", error)
      toast.error("Session tracking error", {
        description: "Your progress will still be saved locally. You can continue the interview.",
      })
      return {
        success: false,
        error: "Failed to create guest session",
      }
    }
  }

  return {
    success: false,
    error: "No user or guest ID provided",
  }
}

/**
 * Auto-save session data (localStorage + Firestore/API)
 */
export async function autoSaveSession({
  sessionState,
  currentSessionId,
  firebaseUser,
  isGuestMode,
  guestId,
}: AutoSaveOptions): Promise<void> {
  try {
    if (firebaseUser) {
      // Authenticated user - save to localStorage with user-specific key
      const storageKey = `interview_autosave_${firebaseUser.uid}_${sessionState.scenarioId}`
      localStorage.setItem(storageKey, JSON.stringify(sessionState))

      // Also save to Firestore if we have a session ID (for cross-device recovery)
      if (currentSessionId) {
        await saveSessionState(currentSessionId, {
          code: sessionState.code,
          selectedLanguage: sessionState.selectedLanguage,
          elapsedTime: sessionState.elapsedTime,
          chatMessages: sessionState.chatMessages,
          interviewerMessages: sessionState.interviewerMessages,
          testResults: sessionState.testResults,
        })
      }
    } else if (isGuestMode && guestId) {
      // Guest user - save to localStorage with guest-specific key
      const storageKey = `interview_autosave_guest_${sessionState.scenarioId}`
      localStorage.setItem(storageKey, JSON.stringify(sessionState))

      // Also save state to Firestore via API (for session recovery)
      if (currentSessionId) {
        await fetch("/api/guest-session", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: currentSessionId,
            guestId,
            sessionState: {
              code: sessionState.code,
              language: sessionState.selectedLanguage,
              elapsedTime: sessionState.elapsedTime,
              chatMessages: sessionState.chatMessages.slice(-20), // Limit messages
              interviewerMessages: sessionState.interviewerMessages.slice(-20),
              testResults: sessionState.testResults.slice(-10),
            },
          }),
        })
      }
    }
  } catch (error) {
    console.error("Auto-save failed:", error)
  }
}

/**
 * Restore session from localStorage or Firestore
 */
export async function restoreSession({
  scenarioId,
  sessionId,
  firebaseUser,
  isGuestMode,
  guestId,
}: RestoreSessionOptions): Promise<SessionState | null> {
  try {
    let localData = null
    let localTimestamp = 0
    let remoteData = null
    let remoteTimestamp = 0

    if (firebaseUser) {
      // Authenticated user - check localStorage with user-specific key
      const storageKey = `interview_autosave_${firebaseUser.uid}_${scenarioId}`
      const savedData = localStorage.getItem(storageKey)

      if (savedData) {
        const parsed = JSON.parse(savedData)
        const timeSinceLastSave = Date.now() - parsed.timestamp
        if (timeSinceLastSave < 24 * 60 * 60 * 1000) {
          localData = parsed
          localTimestamp = parsed.timestamp
        } else {
          localStorage.removeItem(storageKey)
        }
      }

      // Check Firestore if we have a session ID
      if (sessionId) {
        const firestoreState = await getSessionState(sessionId)
        if (firestoreState?.savedAt) {
          remoteData = {
            ...firestoreState,
            scenarioId,
            timestamp: new Date(firestoreState.savedAt).getTime(),
          }
          remoteTimestamp = new Date(firestoreState.savedAt).getTime()
        }
      }
    } else if (isGuestMode && guestId) {
      // Guest user - check localStorage with guest-specific key
      const storageKey = `interview_autosave_guest_${scenarioId}`
      const savedData = localStorage.getItem(storageKey)

      if (savedData) {
        const parsed = JSON.parse(savedData)
        const timeSinceLastSave = Date.now() - parsed.timestamp
        // Guest sessions expire after 24 hours
        if (timeSinceLastSave < 24 * 60 * 60 * 1000) {
          localData = parsed
          localTimestamp = parsed.timestamp
        } else {
          localStorage.removeItem(storageKey)
        }
      }

      // Check API for saved session state
      if (sessionId) {
        try {
          const response = await fetch(`/api/guest-session?sessionId=${sessionId}&guestId=${guestId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.session?.session_state) {
              remoteData = {
                scenarioId,
                code: data.session.session_state.code,
                chatMessages: data.session.session_state.chat_messages,
                interviewerMessages: data.session.session_state.interviewer_messages,
                selectedLanguage: data.session.session_state.language,
                elapsedTime: data.session.session_state.elapsed_time,
                testResults: data.session.session_state.test_results,
                workspaceContext: [],
                timestamp: new Date(data.session.session_state.saved_at).getTime(),
              }
              remoteTimestamp = new Date(data.session.session_state.saved_at).getTime()
            }
          }
        } catch (err) {
          console.error("Failed to fetch guest session state:", err)
        }
      }
    }

    // Use the most recent save (prefer remote if same time for cross-device)
    const useRemote = remoteData && (!localData || remoteTimestamp >= localTimestamp)

    if (useRemote && remoteData) {
      toast.info("Session restored from cloud backup", {
        description: "Your progress was saved. Continue where you left off!",
      })
      return remoteData as SessionState
    } else if (localData) {
      toast.info("Session restored from auto-save", {
        description: "Your local progress was recovered.",
      })
      return localData as SessionState
    }

    return null
  } catch (error) {
    console.error("Failed to restore auto-saved session:", error)
    toast.error("Could not restore session", {
      description: "Starting fresh. Previous progress may be lost.",
    })
    return null
  }
}

/**
 * Clear all auto-saved session data
 */
export function clearAutoSave(scenarioId: string, userId?: string): void {
  try {
    if (userId) {
      const storageKey = `interview_autosave_${userId}_${scenarioId}`
      localStorage.removeItem(storageKey)
    } else {
      const storageKey = `interview_autosave_guest_${scenarioId}`
      localStorage.removeItem(storageKey)
    }
  } catch (error) {
    console.error("Failed to clear auto-save:", error)
  }
}

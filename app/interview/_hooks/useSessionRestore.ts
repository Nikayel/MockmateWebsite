import type { RestoredSessionInputs } from "@/lib/interview/session-lifecycle/checkpoint"
import { useEffect, type Dispatch, type SetStateAction } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import type { ReadonlyURLSearchParams } from "next/navigation"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { toast } from "sonner"
import type { Scenario } from "@/lib/scenarios"
import { getSessionState } from "@/lib/firestore-helpers"
import type { BugfixEvidenceEvent } from "@/lib/bugfix"
import {
  localCheckpointSessionId,
  recoverLocalCheckpoint,
  normalizeStoredCheckpoint,
} from "@/lib/interview/session-lifecycle/recovery"
import type { EditorLanguage } from "../_utils/language"
import type {
  ChatMessage,
  ConsoleLogEntry,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "../_types"

export interface UseSessionRestoreOptions {
  // Identity / gating (dep-array values)
  firebaseUser: FirebaseUser | null
  isGuestMode: boolean
  guestId: string | null
  selectedScenario: Scenario | null
  searchParams: ReadonlyURLSearchParams | null
  isInterviewStarted: boolean
  router: AppRouterInstance

  // Page state reads (not in dep array)
  selectedLanguage: EditorLanguage

  // Page state setters
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>
  setCode: Dispatch<SetStateAction<string>>
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setSelectedLanguage: Dispatch<SetStateAction<EditorLanguage>>
  setTestResults: Dispatch<SetStateAction<TestResult[]>>
  setWorkspaceContext: Dispatch<SetStateAction<WorkspaceContextFile[]>>
  setActiveWorkspacePath: Dispatch<SetStateAction<string | null>>
  setConsoleLogs: Dispatch<SetStateAction<ConsoleLogEntry[]>>
  setBugfixEvidenceEvents: Dispatch<SetStateAction<BugfixEvidenceEvent[]>>
  setElapsedTime: (value: number) => void
  setTestSummary: Dispatch<SetStateAction<TestSummary>>
  setShowPostInterviewDiscussion: Dispatch<SetStateAction<boolean>>
  setIsInterviewStarted: Dispatch<SetStateAction<boolean>>
  setShowScenarioBrowser: Dispatch<SetStateAction<boolean>>

  onSessionRestored?: (state: RestoredSessionInputs) => void

  // Refs
  recordedBugfixEditPathsRef: { current: Set<string> }
}

/** Recover a saved attempt selected without a session URL. URL reopens belong to useSessionReopen. */
export function useSessionRestore(opts: UseSessionRestoreOptions) {
  const urlSessionId = opts.searchParams?.get("session")
  useEffect(() => {
    if (!opts.selectedScenario || opts.isInterviewStarted || urlSessionId) return
    if (!opts.firebaseUser && !opts.isGuestMode) return
    let cancelled = false
    const storageKey = opts.firebaseUser
      ? `interview_autosave_${opts.firebaseUser.uid}_${opts.selectedScenario.id}`
      : `interview_autosave_guest_${opts.selectedScenario.id}`
    const sessionId = localCheckpointSessionId(storageKey)
    if (!sessionId) return
    const restore = async () => {
      try {
        let remote: Awaited<ReturnType<typeof getSessionState>> = null
        if (opts.firebaseUser) remote = await getSessionState(sessionId)
        else if (opts.guestId) {
          const response = await fetch(
            `/api/guest-session?sessionId=${encodeURIComponent(sessionId)}&guestId=${encodeURIComponent(opts.guestId)}`
          )
          if (response.status === 404) {
            localStorage.removeItem(storageKey)
            return
          }
          if (response.ok) {
            const data = await response.json()
            remote = normalizeStoredCheckpoint(data.session?.session_state)
            if (data.session?.completed_at) {
              localStorage.removeItem(storageKey)
              return
            }
          }
        }
        if (cancelled) return
        if (remote?.completedAt || remote?.feedbackStatus === "pending") {
          localStorage.removeItem(storageKey)
          opts.router.push(`/sessions/${sessionId}`)
          return
        }
        const saved = recoverLocalCheckpoint(remote, storageKey, sessionId)
        if (!saved) return
        opts.setCurrentSessionId(sessionId)
        opts.setCode(saved.code ?? "")
        opts.setChatMessages((saved.chatMessages ?? []) as ChatMessage[])
        opts.setInterviewerMessages((saved.interviewerMessages ?? []) as ChatMessage[])
        opts.setSelectedLanguage((saved.language ?? opts.selectedLanguage) as EditorLanguage)
        opts.setTestResults(saved.testResults ?? [])
        opts.setWorkspaceContext((saved.workspaceContext ?? []) as WorkspaceContextFile[])
        opts.setActiveWorkspacePath(saved.activeWorkspacePath ?? null)
        opts.setConsoleLogs((saved.consoleLogs ?? []) as ConsoleLogEntry[])
        opts.setBugfixEvidenceEvents(
          (saved.bugfixEvidenceEvents ?? []) as unknown as BugfixEvidenceEvent[]
        )
        opts.recordedBugfixEditPathsRef.current = new Set(
          (saved.bugfixEvidenceEvents ?? [])
            .filter((event) => event.type === "file_edited" && typeof event.filePath === "string")
            .map((event) => String(event.filePath))
        )
        opts.setElapsedTime(saved.elapsedTime ?? 0)
        if (saved.testSummary) opts.setTestSummary(saved.testSummary)
        opts.setShowPostInterviewDiscussion(saved.isPostInterviewDiscussion ?? false)
        opts.setIsInterviewStarted(true)
        opts.setShowScenarioBrowser(false)
        opts.onSessionRestored?.({ ...saved, sessionId })
        const url = new URL(window.location.href)
        url.searchParams.set("session", sessionId)
        url.searchParams.set("scenario", opts.selectedScenario!.id)
        window.history.replaceState({}, "", url)
        toast.info("Saved attempt restored", { description: "Resume when you’re ready." })
      } catch {
        if (!cancelled) toast.error("Could not restore your saved attempt. Please try again.")
      }
    }
    void restore()
    return () => {
      cancelled = true
    }
    // Payload setters are stable; an identity change cancels the previous recovery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    opts.selectedScenario?.id,
    opts.isInterviewStarted,
    opts.firebaseUser?.uid,
    opts.isGuestMode,
    opts.guestId,
    urlSessionId,
  ])
}

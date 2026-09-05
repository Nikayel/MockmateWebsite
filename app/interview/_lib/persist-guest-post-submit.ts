import type { BugfixEvidenceEvent } from "@/lib/bugfix"
import type {
  ChatMessage,
  ConsoleLogEntry,
  EditorLanguage,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "../_types"

export interface GuestPostSubmitState {
  sessionId: string
  guestId: string
  code: string
  language: EditorLanguage
  elapsedTime: number
  chatMessages: ChatMessage[]
  interviewerMessages: ChatMessage[]
  testResults: TestResult[]
  testSummary: TestSummary
  workspaceContext: WorkspaceContextFile[]
  activeWorkspacePath: string | null
  consoleLogs: ConsoleLogEntry[]
  bugfixEvidenceEvents: BugfixEvidenceEvent[]
  realInterviewMode: boolean
  strictTimeLimit: number | null
}

/** Saves the exact post-submit recovery point before guest authentication begins. */
export async function persistGuestPostSubmitState(state: GuestPostSubmitState): Promise<void> {
  const response = await fetch("/api/guest-session", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: state.sessionId,
      guestId: state.guestId,
      sessionState: {
        code: state.code,
        language: state.language,
        elapsedTime: state.elapsedTime,
        chatMessages: state.chatMessages.slice(-20),
        interviewerMessages: state.interviewerMessages.slice(-20),
        testResults: state.testResults.slice(-10),
        testSummary: state.testSummary,
        workspaceContext: state.workspaceContext,
        activeWorkspacePath: state.activeWorkspacePath,
        consoleLogs: state.consoleLogs,
        bugfixEvidenceEvents: state.bugfixEvidenceEvents,
        isPostInterviewDiscussion: true,
        realInterviewMode: state.realInterviewMode,
        strictTimeLimit: state.strictTimeLimit,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Guest post-submit save failed (${response.status})`)
  }
}

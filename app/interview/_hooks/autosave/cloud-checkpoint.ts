import { sessionFetch } from "@/lib/interview/session-fetch"
import { saveSessionState } from "@/lib/firestore-helpers"
import type { LocalCheckpoint } from "./snapshot"
import type { UseInterviewAutosaveOptions } from "./types"

/** Cloud writes remain serialized by the caller and never run on each edit. */
export async function persistCloudCheckpoint(
  opts: UseInterviewAutosaveOptions,
  snapshot: LocalCheckpoint
): Promise<boolean> {
  if (!opts.currentSessionId) return false
  if (opts.firebaseUser) {
    if (opts.currentSessionId) {
      await saveSessionState(opts.currentSessionId, {
        code: snapshot.code,
        selectedLanguage: snapshot.selectedLanguage,
        elapsedTime: snapshot.elapsedTime,
        chatMessages: snapshot.chatMessages.filter((message) => !message.isStreaming),
        interviewerMessages: snapshot.interviewerMessages.filter((message) => !message.isStreaming),
        testResults: snapshot.testResults,
        testSummary: snapshot.testSummary,
        workspaceContext: snapshot.workspaceContext,
        activeWorkspacePath: snapshot.activeWorkspacePath,
        consoleLogs: snapshot.consoleLogs,
        bugfixEvidenceEvents: snapshot.bugfixEvidenceEvents,
        guidedLabProgress: snapshot.guidedLabProgress,
        isPostInterviewDiscussion: snapshot.isPostInterviewDiscussion,
        realInterviewMode: snapshot.realInterviewMode,
        strictTimeLimit: snapshot.strictTimeLimit,
        ownerId: snapshot.ownerId,
        testRunRevision: snapshot.testRunRevision,
        strictDeadlineAt: snapshot.strictDeadlineAt,
        paused: snapshot.paused,
        interviewerInput: snapshot.interviewerInput,
        chatInput: snapshot.chatInput,
      })
    }
  } else if (opts.isGuestMode && opts.guestId) {
    if (opts.currentSessionId) {
      const response = await sessionFetch("/api/guest-session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: opts.currentSessionId,
          guestId: opts.guestId,
          sessionState: {
            code: snapshot.code,
            language: snapshot.selectedLanguage,
            elapsedTime: snapshot.elapsedTime,
            chatMessages: snapshot.chatMessages.filter((message) => !message.isStreaming),
            interviewerMessages: snapshot.interviewerMessages.filter(
              (message) => !message.isStreaming
            ),
            testResults: snapshot.testResults.slice(-10),
            testSummary: snapshot.testSummary,
            workspaceContext: snapshot.workspaceContext,
            activeWorkspacePath: snapshot.activeWorkspacePath,
            consoleLogs: snapshot.consoleLogs,
            bugfixEvidenceEvents: snapshot.bugfixEvidenceEvents,
            guidedLabProgress: snapshot.guidedLabProgress,
            isPostInterviewDiscussion: snapshot.isPostInterviewDiscussion,
            realInterviewMode: snapshot.realInterviewMode,
            strictTimeLimit: snapshot.strictTimeLimit,
            testRunRevision: snapshot.testRunRevision,
            strictDeadlineAt: snapshot.strictDeadlineAt,
            paused: snapshot.paused,
            interviewerInput: snapshot.interviewerInput,
            chatInput: snapshot.chatInput,
          },
        }),
      })
      if (!response.ok) throw new Error("Session backup failed")
    }
  }

  return Boolean(opts.firebaseUser || (opts.isGuestMode && opts.guestId))
}

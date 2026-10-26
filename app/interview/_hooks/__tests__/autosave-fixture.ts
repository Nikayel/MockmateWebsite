import type { UseInterviewAutosaveOptions } from "../useInterviewAutosave"

export function autosaveOptions(): UseInterviewAutosaveOptions {
  return {
    isInterviewStarted: true,
    selectedScenario: { id: "task" } as never,
    firebaseUser: { uid: "u" } as never,
    isGuestMode: false,
    guestId: null,
    currentSessionId: "s",
    code: "edited",
    chatMessages: [{ type: "user", message: "partner question" }],
    interviewerMessages: [{ type: "user", message: "my hypothesis" }],
    selectedLanguage: "python",
    elapsedTime: 12,
    testResults: [],
    testSummary: { total: 0, passed: 0, failed: 0, passRate: 0 },
    workspaceContext: [],
    activeWorkspacePath: null,
    consoleLogs: [],
    bugfixEvidenceEvents: [],
    showPostInterviewDiscussion: false,
    realInterviewMode: false,
    strictTimeLimit: null,
  }
}

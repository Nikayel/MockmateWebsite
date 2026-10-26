import { getGuidedAttemptProgress } from "@/lib/stores/guided-lab-store"
import type { UseInterviewAutosaveOptions } from "./types"

export function createLocalCheckpoint(opts: UseInterviewAutosaveOptions) {
  const selectedScenario = opts.selectedScenario
  if (!selectedScenario || !opts.currentSessionId) return null
  const sessionData = {
    sessionId: opts.currentSessionId,
    ownerId: opts.ownerId,
    scenarioId: selectedScenario.id,
    code: opts.code,
    chatMessages: opts.chatMessages.filter((message) => !message.isStreaming),
    interviewerMessages: opts.interviewerMessages.filter((message) => !message.isStreaming),
    selectedLanguage: opts.selectedLanguage,
    elapsedTime: opts.elapsedTime,
    testResults: opts.testResults,
    testSummary: opts.testSummary,
    workspaceContext: opts.workspaceContext,
    activeWorkspacePath: opts.activeWorkspacePath,
    consoleLogs: opts.consoleLogs,
    bugfixEvidenceEvents: opts.bugfixEvidenceEvents,
    guidedLabProgress: getGuidedAttemptProgress(selectedScenario.id, opts.currentSessionId),
    isPostInterviewDiscussion: opts.showPostInterviewDiscussion,
    testRunRevision: opts.testRunRevision ?? null,
    realInterviewMode: opts.realInterviewMode,
    strictTimeLimit: opts.strictTimeLimit,
    strictDeadlineAt: opts.strictDeadlineAt,
    paused: opts.paused ?? false,
    interviewerInput: opts.interviewerInput ?? "",
    chatInput: opts.chatInput ?? "",
    timestamp: Date.now(),
  }
  return sessionData
}

export type LocalCheckpoint = NonNullable<ReturnType<typeof createLocalCheckpoint>>

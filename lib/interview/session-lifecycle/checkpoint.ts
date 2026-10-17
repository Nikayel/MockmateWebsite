interface SavedMessage {
  type: string
  message: string
  id?: string
  timestamp?: number
  sequence?: number
}
export interface RestoredSessionInputs {
  sessionId: string
  chatInput?: string
  interviewerInput?: string
  testRunRevision?: string | null
  isPostInterviewDiscussion?: boolean
  strictDeadlineAt?: number | null
  strictTimeLimit?: number | null
}
export interface SessionCheckpoint {
  code: string
  selectedLanguage: string
  elapsedTime: number
  chatMessages?: SavedMessage[]
  interviewerMessages?: SavedMessage[]
  testResults?: unknown[]
  testSummary?: { total: number; passed: number; failed: number; passRate: number }
  workspaceContext?: Array<Record<string, unknown>>
  activeWorkspacePath?: string | null
  consoleLogs?: Array<Record<string, unknown>>
  bugfixEvidenceEvents?: unknown[]
  bugfixHypothesis?: string
  bugfixRootCause?: string
  bugfixPrevention?: string
  isPostInterviewDiscussion?: boolean
  realInterviewMode?: boolean
  strictTimeLimit?: number | null
  strictDeadlineAt?: number | null
  paused?: boolean
  interviewerInput?: string
  chatInput?: string
  testRunRevision?: string | null
  ownerId?: string
}

/** Session snapshots are plain JSON. Omit undefined recursively before Firestore sees them. */
export function serializeCheckpoint(state: SessionCheckpoint, testResults: unknown[]) {
  return JSON.parse(
    JSON.stringify({
      code: state.code,
      language: state.selectedLanguage,
      elapsed_time: state.elapsedTime,
      chat_messages: state.chatMessages,
      interviewer_messages: state.interviewerMessages,
      test_results: testResults,
      test_summary: state.testSummary,
      workspace_context: state.workspaceContext,
      active_workspace_path: state.activeWorkspacePath,
      console_logs: state.consoleLogs,
      bugfix_evidence_events: state.bugfixEvidenceEvents,
      bugfix_hypothesis: state.bugfixHypothesis,
      bugfix_root_cause: state.bugfixRootCause,
      bugfix_prevention: state.bugfixPrevention,
      is_post_interview_discussion: state.isPostInterviewDiscussion ?? false,
      real_interview_mode: state.realInterviewMode,
      strict_time_limit: state.strictTimeLimit,
      strict_deadline_at: state.strictDeadlineAt,
      paused: state.paused,
      interviewer_input: state.interviewerInput,
      chat_input: state.chatInput,
      test_run_revision: state.testRunRevision,
      saved_at: new Date().toISOString(),
    })
  ) as Record<string, unknown>
}

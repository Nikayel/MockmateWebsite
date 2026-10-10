/**
 * Whether an interview_sessions doc counts as a completed AND scored round, the
 * unit behind WCSR (weekly completed-scored-rounds). completed_at alone is not
 * enough: markSessionEvaluating() stamps completed_at the moment evaluation
 * STARTS. Pending rounds without a frozen score are not scored completions, but
 * the feedback worker freezes a valid score before it generates the narrative.
 * Count those frozen scores even while their report is queued or has failed.
 */
export function isScoredCompletedSession(session: {
  completed_at?: unknown
  feedback_status?: unknown
  performance_score?: unknown
  feedback_score_frozen?: unknown
}): boolean {
  if (!session.completed_at) return false
  if (session.feedback_status === "complete") return true
  if (
    session.feedback_score_frozen === true &&
    typeof session.performance_score === "number" &&
    Number.isFinite(session.performance_score)
  ) {
    return true
  }
  // Pre-feedback_status docs: a persisted score is the only completion signal.
  if (session.feedback_status === undefined || session.feedback_status === null) {
    return session.performance_score !== undefined && session.performance_score !== null
  }
  return false
}

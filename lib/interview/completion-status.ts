/**
 * Whether an interview_sessions doc counts as a completed AND scored round, the
 * unit behind WCSR (weekly completed-scored-rounds). completed_at alone is not
 * enough: markSessionEvaluating() stamps completed_at the moment evaluation
 * STARTS, so pending/failed rounds carry completed_at but never got a score.
 * Gate on feedback_status "complete"; for docs written before feedback_status
 * existed, fall back to a persisted performance_score.
 */
export function isScoredCompletedSession(session: {
  completed_at?: unknown
  feedback_status?: unknown
  performance_score?: unknown
}): boolean {
  if (!session.completed_at) return false
  if (session.feedback_status === "complete") return true
  // Pre-feedback_status docs: a persisted score is the only completion signal.
  if (session.feedback_status === undefined || session.feedback_status === null) {
    return session.performance_score !== undefined && session.performance_score !== null
  }
  return false
}

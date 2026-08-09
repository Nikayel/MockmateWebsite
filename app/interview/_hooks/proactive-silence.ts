/**
 * When the interviewer is allowed to break a silence.
 *
 * Pulled out of the poll's closure so it can be tested. The behaviour it governs is the
 * interviewer speaking without being spoken to, which is the most intrusive thing the
 * product does, and it was previously decided by three lines nothing could reach.
 */

/** A candidate who has spoken before, then stopped, is genuinely quiet after two minutes. */
export const SILENCE_THRESHOLD_SEC = 120

/**
 * A candidate who has not spoken yet is usually reading, not stalling. Two minutes is not
 * enough to read a debugging brief, open the files and form a view, so the first thing the
 * interviewer said to a quiet candidate was that they had not communicated at all and that
 * silence hurts their collaboration score.
 */
export const FIRST_CONTACT_THRESHOLD_SEC = 300

/**
 * Editing code or running tests inside this window counts as engaged. Silence detection
 * measured chat only, so a candidate working steadily and quietly read as being stuck.
 */
export const RECENT_ACTIVITY_SEC = 90

export interface SilenceNudgeInput {
  /** Has the candidate sent any message at all this session? */
  hasEverMessaged: boolean
  /** Seconds since their last message, or since the interview started if they never sent one. */
  timeSilentSec: number
  /** Seconds since they last edited code or ran tests. */
  secondsSinceActivity: number
}

/**
 * True when the interviewer should break the silence.
 *
 * Interrupting someone mid-thought to ask what they are thinking is worse than saying
 * nothing, so recent work vetoes the nudge no matter how long the chat has been quiet.
 */
export function shouldTriggerSilenceNudge({
  hasEverMessaged,
  timeSilentSec,
  secondsSinceActivity,
}: SilenceNudgeInput): boolean {
  const threshold = hasEverMessaged ? SILENCE_THRESHOLD_SEC : FIRST_CONTACT_THRESHOLD_SEC
  if (timeSilentSec < threshold) return false
  if (secondsSinceActivity < RECENT_ACTIVITY_SEC) return false
  return true
}

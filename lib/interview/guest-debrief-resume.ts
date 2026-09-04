export interface GuestDebriefResumeTarget {
  sessionId: string
  scenarioId: string | null
}

/**
 * Resume a migrated guest in the live debrief when its scenario is known.
 * Older migration markers did not carry the scenario id, so they keep the
 * safe legacy fallback: open the completed session report instead.
 */
export function guestDebriefResumePath(target: GuestDebriefResumeTarget): string {
  const sessionId = encodeURIComponent(target.sessionId)
  if (!target.scenarioId) return `/sessions/${sessionId}`

  const params = new URLSearchParams({
    session: target.sessionId,
    scenario: target.scenarioId,
    postInterview: "true",
    startDebrief: "true",
  })
  return `/interview?${params.toString()}`
}

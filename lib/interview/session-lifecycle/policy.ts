export const SESSION_IDLE_MS = 10 * 60_000
export const SESSION_WARNING_MS = 9 * 60_000
export const MAX_PROACTIVE_NUDGES = 3
export const SESSION_LEASE_MS = 90_000

export interface SessionLifecycle {
  status: "active" | "paused"
  ownerId: string
  lastActivityAt: number
  leaseUntil: number
  nudgeCount: number
  lastNudgedActivityAt?: number
}

export function isPausedAttempt(
  session: {
    completed_at?: string | null
    feedback_status?: string
    session_state?: { paused?: boolean }
    session_lifecycle?: SessionLifecycle
  },
  now = Date.now()
): boolean {
  if (session.completed_at || session.feedback_status === "pending") return false
  const lifecycle = session.session_lifecycle
  return lifecycle
    ? lifecycle.status === "paused" || now - lifecycle.lastActivityAt >= SESSION_IDLE_MS
    : session.session_state?.paused === true
}

export function canSendProactive(
  lifecycle: SessionLifecycle | undefined,
  ownerId: string | undefined,
  now: number
): boolean {
  return (
    !!lifecycle &&
    lifecycle.status === "active" &&
    lifecycle.ownerId === ownerId &&
    lifecycle.leaseUntil > now &&
    now - lifecycle.lastActivityAt < SESSION_IDLE_MS &&
    lifecycle.nudgeCount < MAX_PROACTIVE_NUDGES &&
    lifecycle.lastNudgedActivityAt !== lifecycle.lastActivityAt
  )
}

import "server-only"
import { adminDb } from "@/lib/firebase-admin"
import { canSendProactive, SESSION_LEASE_MS, type SessionLifecycle } from "./policy"

export async function updateSessionLifecycle(input: {
  sessionId: string
  userId: string
  ownerId: string
  manual?: boolean
  action: "activate" | "heartbeat" | "pause"
  lastActivityAt: number
}) {
  const ref = adminDb.collection("interview_sessions").doc(input.sessionId)
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const session = snapshot.data()
    if (!session || session.user_id !== input.userId) return { status: 404 }
    if (session.completed_at || session.feedback_status === "pending") return { status: 409 }
    const now = Date.now()
    const previous = session.session_lifecycle as SessionLifecycle | undefined
    if (
      previous &&
      previous.ownerId !== input.ownerId &&
      previous.leaseUntil > now &&
      !(input.action === "activate" && input.manual)
    )
      return { status: 409 }
    if (input.action === "heartbeat" && previous?.status === "paused") return { status: 409 }
    if (input.action !== "activate" && previous?.ownerId !== input.ownerId) return { status: 409 }
    const lifecycle: SessionLifecycle = {
      status: input.action === "pause" ? "paused" : "active",
      ownerId: input.ownerId,
      lastActivityAt: Math.max(previous?.lastActivityAt ?? 0, Math.min(now, input.lastActivityAt)),
      leaseUntil: input.action === "pause" ? 0 : now + SESSION_LEASE_MS,
      nudgeCount: previous?.nudgeCount ?? 0,
      ...(previous?.lastNudgedActivityAt !== undefined
        ? { lastNudgedActivityAt: previous.lastNudgedActivityAt }
        : {}),
    }
    transaction.update(ref, { session_lifecycle: lifecycle })
    return { status: 200 }
  })
}

/** Atomic attempt-wide budget: concurrent tabs/retries cannot each buy another nudge. */
export async function claimProactiveNudge(sessionId: string, userId: string, ownerId?: string) {
  const ref = adminDb.collection("interview_sessions").doc(sessionId)
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const session = snapshot.data()
    const lifecycle = session?.session_lifecycle as SessionLifecycle | undefined
    if (
      !session ||
      session.user_id !== userId ||
      session.completed_at ||
      session.feedback_status === "pending" ||
      !canSendProactive(lifecycle, ownerId, Date.now())
    )
      return false
    transaction.update(ref, {
      "session_lifecycle.nudgeCount": lifecycle!.nudgeCount + 1,
      "session_lifecycle.lastNudgedActivityAt": lifecycle!.lastActivityAt,
    })
    return true
  })
}

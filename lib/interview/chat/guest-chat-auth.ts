import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import {
  GUEST_CHAT_LIMIT_CODE,
  GUEST_CHAT_TURN_LIMIT,
  isValidGuestId,
} from "@/lib/interview/guest-chat-limit"

export type GuestChatAuthResult =
  | {
      kind: "allowed"
      guestId: string
      sessionId: string
      turnsUsed: number
      turnsRemaining: number
    }
  | {
      kind: "skip"
      reason: string
    }
  | {
      kind: "denied"
      status: 400 | 401 | 403
      body: {
        error: string
        code?: string
        turnsUsed?: number
        turnsLimit?: number
      }
    }

/**
 * Atomically verifies guest ownership of an active trial session and reserves
 * one AI chat turn up to {@link GUEST_CHAT_TURN_LIMIT}.
 *
 * The counter lives on `interview_sessions/{sessionId}.guest_chat_turns_used`
 * and is intentionally preserved if the guest switches problems on the same
 * incomplete trial session so switching scenarios cannot reset the cap.
 */
export async function authorizeGuestChatTurn(
  input: {
    guestId: string
    sessionId?: string
    isProactive?: boolean
  },
  db: FirebaseFirestore.Firestore = adminDb
): Promise<GuestChatAuthResult> {
  const { guestId, sessionId, isProactive } = input

  if (!isValidGuestId(guestId)) {
    return { kind: "denied", status: 401, body: { error: "Authentication required" } }
  }

  if (isProactive) {
    return { kind: "skip", reason: "Proactive check-ins require an account" }
  }

  if (!sessionId || typeof sessionId !== "string" || !sessionId.trim()) {
    return {
      kind: "denied",
      status: 400,
      body: { error: "Active guest session is required for trial chat" },
    }
  }

  const ref = db.collection("interview_sessions").doc(sessionId)

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      return { kind: "denied", status: 401, body: { error: "Guest session not found" } }
    }

    const data = snap.data()
    if (!data?.is_guest || data.user_id !== guestId) {
      return { kind: "denied", status: 401, body: { error: "Guest session not found" } }
    }

    if (data.completed_at) {
      return {
        kind: "denied",
        status: 403,
        body: {
          error: "Your free guest session is complete. Create a free account to continue.",
          code: "FREE_TRIAL_EXHAUSTED",
        },
      }
    }

    if (typeof data.expires_at === "string") {
      const expiresMs = Date.parse(data.expires_at)
      if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
        return {
          kind: "denied",
          status: 403,
          body: {
            error: "Guest session expired. Create a free account to keep practicing.",
            code: "GUEST_SESSION_EXPIRED",
          },
        }
      }
    }

    const rawUsed = data.guest_chat_turns_used
    const turnsUsed =
      typeof rawUsed === "number" && Number.isFinite(rawUsed) && rawUsed >= 0 ? rawUsed : 0

    if (turnsUsed >= GUEST_CHAT_TURN_LIMIT) {
      return {
        kind: "denied",
        status: 403,
        body: {
          error: "Free trial interviewer limit reached. Create a free account to keep chatting.",
          code: GUEST_CHAT_LIMIT_CODE,
          turnsUsed,
          turnsLimit: GUEST_CHAT_TURN_LIMIT,
        },
      }
    }

    const nextUsed = turnsUsed + 1
    tx.update(ref, {
      guest_chat_turns_used: nextUsed,
      updated_at: new Date().toISOString(),
    })

    return {
      kind: "allowed",
      guestId,
      sessionId,
      turnsUsed: nextUsed,
      turnsRemaining: GUEST_CHAT_TURN_LIMIT - nextUsed,
    }
  })
}

/**
 * Best-effort refund when a reserved guest turn never consumed a model reply
 * (provider error, 400 validation failure, or local acknowledgment receipt).
 */
export async function refundGuestChatTurn(
  sessionId: string,
  guestId: string,
  db: FirebaseFirestore.Firestore = adminDb
): Promise<void> {
  try {
    const ref = db.collection("interview_sessions").doc(sessionId)
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists) return
      const data = snap.data()
      if (!data?.is_guest || data.user_id !== guestId) return
      const rawUsed = data.guest_chat_turns_used
      const current = typeof rawUsed === "number" && Number.isFinite(rawUsed) ? rawUsed : 0
      if (current <= 0) return
      tx.update(ref, {
        guest_chat_turns_used: current - 1,
        updated_at: new Date().toISOString(),
      })
    })
  } catch (error) {
    logger.warn("[Chat API] Failed to refund guest chat turn", { sessionId, guestId, error })
  }
}

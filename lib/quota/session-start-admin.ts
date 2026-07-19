/**
 * Server-authoritative session start (QUOTA-1).
 *
 * The ONLY writer for session-start quota mutations. Runs the same two state
 * transitions the Firestore rules used to let the client perform directly
 * (spend a free open, or spend a paid session and grant 10 opens) inside one
 * Admin-SDK transaction, with the billing period resolved by the shared
 * lib/quota/billing-period math. Clients reach it via POST
 * /api/usage/session-start; profile_quota is client-read-only in rules.
 *
 * Doc conventions mirror the other Admin-SDK writer (lib/stripe-helpers):
 * auto-id docs matched by period window, and last_reset_period_start stamped on
 * create so a retried billing webhook cannot re-zero a fresh period.
 */

import { adminDb } from "@/lib/firebase-admin"
import { getSessionsLimitForTier } from "@/lib/pricing"
import { billingPeriodFromProfile, type BillingProfileFields } from "@/lib/quota/billing-period"

export const FREE_OPENS_PER_PAID_SESSION = 10

export interface SessionStartResult {
  success: boolean
  usedPaidSession: boolean
  freeOpensRemaining: number
  sessionsUsed: number
  sessionsLimit: number
  code?: "LIMIT_REACHED"
}

export async function recordSessionStartAdmin(
  userId: string,
  // Injectable so the emulator drill can pass a real Firestore handle (the
  // global vitest setup mocks lib/firebase-admin).
  db: FirebaseFirestore.Firestore = adminDb
): Promise<SessionStartResult> {
  return db.runTransaction(async (tx) => {
    const profileSnap = await tx.get(db.collection("profiles").doc(userId))
    const profile = (profileSnap.data() ?? {}) as BillingProfileFields
    const tier = profile.subscription_tier || "free"
    const sessionsLimit = getSessionsLimitForTier(tier)
    const { periodStart, periodEnd } = billingPeriodFromProfile(profile)

    const quotaQuery = db
      .collection("profile_quota")
      .where("user_id", "==", userId)
      .orderBy("period_start", "desc")
      .limit(12)
    const quotaSnap = await tx.get(quotaQuery)

    // Docs whose stored period_start falls inside the computed window. Choose
    // the MOST-CONSERVATIVE doc (max sessions_used, tie -> fewest free opens) so
    // a legacy client-forged zero-usage doc can never become the live counter.
    const candidates = quotaSnap.docs.filter((docSnap) => {
      const start = new Date(docSnap.data().period_start)
      return start >= periodStart && start <= periodEnd
    })
    const target = candidates.reduce<FirebaseFirestore.QueryDocumentSnapshot | undefined>(
      (best, candidate) => {
        if (!best) return candidate
        const candidateUsed = candidate.data().sessions_used ?? 0
        const bestUsed = best.data().sessions_used ?? 0
        if (candidateUsed > bestUsed) return candidate
        if (candidateUsed < bestUsed) return best
        return (candidate.data().free_opens_remaining ?? 0) <
          (best.data().free_opens_remaining ?? 0)
          ? candidate
          : best
      },
      undefined
    )

    const nowIso = new Date().toISOString()

    if (!target) {
      if (sessionsLimit <= 0) {
        return {
          success: false,
          usedPaidSession: false,
          freeOpensRemaining: 0,
          sessionsUsed: 0,
          sessionsLimit,
          code: "LIMIT_REACHED" as const,
        }
      }
      // First session of this billing period: the period doc is born already
      // holding the spent session (rollover therefore "resets" exactly once —
      // a new period simply starts a new doc; old docs are immutable history).
      const ref = db.collection("profile_quota").doc()
      tx.create(ref, {
        id: ref.id,
        user_id: userId,
        sessions_used: 1,
        sessions_limit: sessionsLimit,
        free_opens_remaining: FREE_OPENS_PER_PAID_SESSION,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        last_reset_period_start: periodStart.toISOString(),
        last_session_start: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      })
      return {
        success: true,
        usedPaidSession: true,
        freeOpensRemaining: FREE_OPENS_PER_PAID_SESSION,
        sessionsUsed: 1,
        sessionsLimit,
      }
    }

    const data = target.data()
    const freeOpens = data.free_opens_remaining ?? 0
    // Tier changes sync the limit here now that the client never writes; cap
    // over-limit usage after a downgrade the way the old client init did.
    const sessionsUsed = Math.min(data.sessions_used ?? 0, sessionsLimit)

    if (freeOpens > 0) {
      tx.update(target.ref, {
        free_opens_remaining: freeOpens - 1,
        sessions_used: sessionsUsed,
        sessions_limit: sessionsLimit,
        last_session_start: nowIso,
        updated_at: nowIso,
      })
      return {
        success: true,
        usedPaidSession: false,
        freeOpensRemaining: freeOpens - 1,
        sessionsUsed,
        sessionsLimit,
      }
    }

    if (sessionsUsed >= sessionsLimit) {
      return {
        success: false,
        usedPaidSession: false,
        freeOpensRemaining: 0,
        sessionsUsed,
        sessionsLimit,
        code: "LIMIT_REACHED" as const,
      }
    }

    tx.update(target.ref, {
      sessions_used: sessionsUsed + 1,
      sessions_limit: sessionsLimit,
      free_opens_remaining: FREE_OPENS_PER_PAID_SESSION,
      last_session_start: nowIso,
      updated_at: nowIso,
    })
    return {
      success: true,
      usedPaidSession: true,
      freeOpensRemaining: FREE_OPENS_PER_PAID_SESSION,
      sessionsUsed: sessionsUsed + 1,
      sessionsLimit,
    }
  })
}

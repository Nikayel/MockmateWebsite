/**
 * Server-authoritative session start (QUOTA-1).
 *
 * The ONLY writer for session-start quota mutations. Clients reach it via POST
 * /api/usage/session-start; profile_quota is client-read-only in rules.
 *
 * Two metering models live here, selected by tier:
 *
 * - PAID (pro/enterprise), when the caller names the scenario: quota counts
 *   DISTINCT scenarios per billing period. The period doc carries
 *   `scenarios_started`; a start whose scenario is already listed is a free
 *   redo and mutates nothing but timestamps. Free opens are neither spent nor
 *   granted on this path — the redo rule replaces the opens approximation.
 *
 * - FREE tier (and any legacy client that posts no scenarioId): the original
 *   mechanic. Spend a free open if one exists, otherwise spend a session and
 *   grant FREE_OPENS_PER_PAID_SESSION opens. When a scenarioId is provided it
 *   is still RECORDED in `scenarios_started` (data for a future switch), but
 *   it does not affect free-tier behavior.
 *
 * Doc conventions mirror the other Admin-SDK writer (lib/stripe-helpers):
 * auto-id docs matched by period window, and last_reset_period_start stamped on
 * create so a retried billing webhook cannot re-zero a fresh period.
 */

import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import { FREE_OPENS_PER_PAID_SESSION, getSessionsLimitForTier, isPaidTier } from "@/lib/pricing"
import { billingPeriodFromProfile, type BillingProfileFields } from "@/lib/quota/billing-period"

// The grant size now lives in lib/pricing (client-safe) so a marketing page can quote it without
// importing this module and its Admin SDK. Re-exported so existing call sites keep working.
export { FREE_OPENS_PER_PAID_SESSION }

export interface SessionStartResult {
  success: boolean
  usedPaidSession: boolean
  /**
   * Paid tiers only: this start repeated a scenario already attempted this
   * billing period, so it consumed neither a session nor an open.
   */
  freeRetry: boolean
  freeOpensRemaining: number
  sessionsUsed: number
  sessionsLimit: number
  code?: "LIMIT_REACHED"
}

export async function recordSessionStartAdmin(
  userId: string,
  // Optional so a stale client bundle that posts no body keeps working on the
  // legacy opens mechanic instead of failing to start.
  scenarioId?: string,
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
    // Distinct-scenario metering needs the scenario's identity; without it the
    // legacy mechanic applies regardless of tier.
    const paidRetryRules = isPaidTier(tier) && typeof scenarioId === "string" && scenarioId !== ""

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
          freeRetry: false,
          freeOpensRemaining: 0,
          sessionsUsed: 0,
          sessionsLimit,
          code: "LIMIT_REACHED" as const,
        }
      }
      // First session of this billing period: the period doc is born already
      // holding the spent session (rollover therefore "resets" exactly once —
      // a new period simply starts a new doc; old docs are immutable history).
      const opensGranted = paidRetryRules ? 0 : FREE_OPENS_PER_PAID_SESSION
      const ref = db.collection("profile_quota").doc()
      tx.create(ref, {
        id: ref.id,
        user_id: userId,
        sessions_used: 1,
        sessions_limit: sessionsLimit,
        free_opens_remaining: opensGranted,
        ...(scenarioId ? { scenarios_started: [scenarioId] } : {}),
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
        freeRetry: false,
        freeOpensRemaining: opensGranted,
        sessionsUsed: 1,
        sessionsLimit,
      }
    }

    const data = target.data()
    const freeOpens = data.free_opens_remaining ?? 0
    // Tier changes sync the limit here now that the client never writes; cap
    // over-limit usage after a downgrade the way the old client init did.
    const sessionsUsed = Math.min(data.sessions_used ?? 0, sessionsLimit)
    const scenariosStarted: string[] = Array.isArray(data.scenarios_started)
      ? data.scenarios_started
      : []

    if (paidRetryRules) {
      // Honor the redo ledger only on a doc that has recorded real spend. Every
      // legitimate write path that adds to scenarios_started also holds
      // sessions_used >= 1 (creates are born at 1; yearly resets create at 0 but
      // with no ledger), so a zero-usage doc carrying a ledger is not ours.
      if (sessionsUsed >= 1 && scenariosStarted.includes(scenarioId as string)) {
        tx.update(target.ref, {
          last_session_start: nowIso,
          updated_at: nowIso,
        })
        return {
          success: true,
          usedPaidSession: false,
          freeRetry: true,
          freeOpensRemaining: freeOpens,
          sessionsUsed,
          sessionsLimit,
        }
      }

      if (sessionsUsed >= sessionsLimit) {
        return {
          success: false,
          usedPaidSession: false,
          freeRetry: false,
          freeOpensRemaining: freeOpens,
          sessionsUsed,
          sessionsLimit,
          code: "LIMIT_REACHED" as const,
        }
      }

      // New distinct scenario: spend a session and add it to the redo ledger.
      // free_opens_remaining is deliberately untouched (neither spent nor
      // granted) on the paid path.
      tx.update(target.ref, {
        sessions_used: sessionsUsed + 1,
        sessions_limit: sessionsLimit,
        scenarios_started: FieldValue.arrayUnion(scenarioId),
        last_session_start: nowIso,
        updated_at: nowIso,
      })
      return {
        success: true,
        usedPaidSession: true,
        freeRetry: false,
        freeOpensRemaining: freeOpens,
        sessionsUsed: sessionsUsed + 1,
        sessionsLimit,
      }
    }

    if (freeOpens > 0) {
      tx.update(target.ref, {
        free_opens_remaining: freeOpens - 1,
        sessions_used: sessionsUsed,
        sessions_limit: sessionsLimit,
        ...(scenarioId ? { scenarios_started: FieldValue.arrayUnion(scenarioId) } : {}),
        last_session_start: nowIso,
        updated_at: nowIso,
      })
      return {
        success: true,
        usedPaidSession: false,
        freeRetry: false,
        freeOpensRemaining: freeOpens - 1,
        sessionsUsed,
        sessionsLimit,
      }
    }

    if (sessionsUsed >= sessionsLimit) {
      return {
        success: false,
        usedPaidSession: false,
        freeRetry: false,
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
      ...(scenarioId ? { scenarios_started: FieldValue.arrayUnion(scenarioId) } : {}),
      last_session_start: nowIso,
      updated_at: nowIso,
    })
    return {
      success: true,
      usedPaidSession: true,
      freeRetry: false,
      freeOpensRemaining: FREE_OPENS_PER_PAID_SESSION,
      sessionsUsed: sessionsUsed + 1,
      sessionsLimit,
    }
  })
}

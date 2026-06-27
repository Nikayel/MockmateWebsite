/**
 * Global Daily Spend Guard
 *
 * Aggregate cost backstop that is independent of per-user budgets. Even if many
 * accounts each stay under their own budget, the combined AI spend across the
 * whole platform is capped per UTC day. This is the kill-switch that bounds
 * worst-case COGS regardless of how the abuse is distributed.
 *
 * Storage: a single Firestore doc per UTC day at `global_usage/{YYYY-MM-DD}`,
 * incremented atomically via FieldValue.increment on every recorded LLM cost.
 * Reads are cheap (one doc) and are folded into the existing quota read path.
 */

import { adminDb } from "./firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { logger } from "./logger"
import { COST_PROTECTION } from "./constants"

const GLOBAL_USAGE_COLLECTION = "global_usage"

/**
 * Resolve the configured ceiling (env override wins, else constant).
 * Returns 0 when the gate is disabled.
 */
export function getGlobalDailyCeiling(): number {
  const raw = process.env.GLOBAL_DAILY_SPEND_CEILING_USD
  if (raw !== undefined) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }
  return COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD
}

/** UTC day key, e.g. "2026-06-27". Deterministic and timezone-stable. */
function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/**
 * Read today's total recorded AI spend (USD). Returns 0 if the doc is missing.
 */
export async function getGlobalDailySpend(now: Date = new Date()): Promise<number> {
  const doc = await adminDb.collection(GLOBAL_USAGE_COLLECTION).doc(utcDayKey(now)).get()
  const total = doc.data()?.totalCost
  return typeof total === "number" && Number.isFinite(total) ? total : 0
}

/**
 * True when today's aggregate spend has reached the configured ceiling.
 * Fails OPEN (returns false) on read error so a transient Firestore problem
 * does not hard-block all traffic — per-user quotas + rate limits still apply.
 */
export async function isGlobalCeilingExceeded(now: Date = new Date()): Promise<boolean> {
  const ceiling = getGlobalDailyCeiling()
  if (ceiling <= 0) return false // gate disabled

  try {
    const spend = await getGlobalDailySpend(now)
    if (spend >= ceiling) {
      logger.error("CRITICAL: Global daily AI spend ceiling reached", {
        spend,
        ceiling,
        day: utcDayKey(now),
      })
      return true
    }
    return false
  } catch (error) {
    logger.warn("Global spend ceiling check failed (failing open)", { error })
    return false
  }
}

/**
 * Atomically add an LLM call's cost to today's aggregate counter.
 * Fire-and-forget safe: never throws (cost tracking must not break a request).
 */
export async function recordGlobalSpend(cost: number, now: Date = new Date()): Promise<void> {
  if (!Number.isFinite(cost) || cost <= 0) return
  try {
    await adminDb
      .collection(GLOBAL_USAGE_COLLECTION)
      .doc(utcDayKey(now))
      .set(
        {
          totalCost: FieldValue.increment(cost),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
  } catch (error) {
    logger.warn("Failed to record global spend", { error })
  }
}

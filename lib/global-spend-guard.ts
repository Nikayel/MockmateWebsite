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
 * One-shot latches so a misconfigured or deliberately disabled ceiling is
 * reported loudly but not once per request. The env cannot change within a
 * process lifetime, so a repeat log carries no new information.
 */
let warnedAboutInvalidCeiling = false
let warnedAboutDisabledGate = false

/**
 * Resolve the configured ceiling (env override wins, else constant).
 * Returns 0 only when an operator has EXPLICITLY disabled the gate.
 *
 * The parsing is deliberately strict about what counts as an override, because
 * `Number("")` is 0 and 0 means "kill-switch off". Under the old
 * `Number.isFinite(parsed) && parsed >= 0` check, setting
 * GLOBAL_DAILY_SPEND_CEILING_USD to an empty string — which is what a Vercel env
 * var declared with no value, or a cleared secret, evaluates to — silently
 * disarmed the platform's last line of defence against unbounded COGS. There
 * would have been no error, no log, and no difference visible anywhere: the
 * dashboards would look identical right up to the bill.
 *
 * So an empty, whitespace-only, non-numeric or negative value is treated as
 * "not configured" and falls back to the constant, which leaves the gate ARMED
 * (fails closed) and logs at ERROR. Only a value that genuinely parses to 0
 * turns the gate off, and that says so at ERROR too, because a disabled
 * kill-switch is a state nobody should have to read the env to discover.
 */
export function getGlobalDailyCeiling(): number {
  const raw = process.env.GLOBAL_DAILY_SPEND_CEILING_USD

  if (raw !== undefined && raw.trim() !== "") {
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed >= 0) {
      if (parsed === 0 && !warnedAboutDisabledGate) {
        warnedAboutDisabledGate = true
        logger.error(
          "CRITICAL: global daily AI spend ceiling is DISABLED " +
            "(GLOBAL_DAILY_SPEND_CEILING_USD=0). Platform-wide COGS are unbounded. " +
            "Unset the variable to restore the default ceiling.",
          { defaultCeiling: COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD }
        )
      }
      return parsed
    }
  }

  // Set-but-unusable is a broken deploy, not a request to disable the gate.
  if (raw !== undefined && !warnedAboutInvalidCeiling) {
    warnedAboutInvalidCeiling = true
    logger.error(
      "GLOBAL_DAILY_SPEND_CEILING_USD is set but not a usable non-negative number; " +
        "keeping the gate ARMED at the default ceiling. An empty value would " +
        "otherwise parse as 0 and silently disable the kill-switch.",
      { raw, fallbackCeiling: COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD }
    )
  }

  return COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD
}

/** Test-only: clear the one-shot log latches. */
export function resetGlobalCeilingWarnings(): void {
  warnedAboutInvalidCeiling = false
  warnedAboutDisabledGate = false
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
 *
 * Fails CLOSED (returns true) on read error. This is the platform's last line of
 * defence against unbounded COGS, and a brake that releases itself the moment it
 * cannot read its own gauge is not a brake. The failure mode it protects against
 * is specifically correlated: the load that runs spend up is the same load that
 * makes Firestore reads fail, so "fail open on error" is most likely to yield
 * exactly when it matters most.
 *
 * The asymmetry decides it. Failing closed costs an outage of AI features that
 * an operator can end in one step (set GLOBAL_DAILY_SPEND_CEILING_USD=0 to
 * disable the gate) and that the user is told about in plain language. Failing
 * open costs money that cannot be recovered at all, with no upper bound and no
 * one watching.
 *
 * Note the other guards do NOT cover for this one. checkQuota's per-user budget
 * read is the same Firestore that just failed, and its circuit breaker fails
 * open by design (bounded per user, unbounded across users) — which is the very
 * hole an aggregate ceiling exists to close.
 */
interface SpendReading {
  spendUsd: number
  atMs: number
}

/**
 * The last reading that actually came back, per instance.
 *
 * Fail-closed is right when spend is genuinely invisible, but a single transient
 * Firestore error is not the same as spend being invisible: it discards the fact
 * that we successfully read the gauge moments ago. Without this, one blip refused
 * every AI turn on the platform, mid-interview, for users nowhere near any budget.
 */
let lastGoodReading: SpendReading | null = null

/** How long a successful reading stays good enough to answer a failed one. */
const READING_GRACE_MS = 120_000

/**
 * How far below the ceiling a cached reading must sit to be trusted through an
 * error. At 80% the remaining headroom cannot plausibly be consumed inside the
 * grace window, so this concedes nothing to the correlated-failure argument
 * above: under the load that breaks Firestore, spend climbs, the cached reading
 * crosses this line, and the gate closes exactly as designed.
 */
const CACHED_READING_HEADROOM = 0.8

export async function isGlobalCeilingExceeded(now: Date = new Date()): Promise<boolean> {
  const ceiling = getGlobalDailyCeiling()
  if (ceiling <= 0) return false // gate disabled

  try {
    const spend = await getGlobalDailySpend(now)
    lastGoodReading = { spendUsd: spend, atMs: now.getTime() }
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
    // A recent reading that showed real headroom answers this failure. The spend
    // it measured cannot have reached the ceiling inside the grace window, so
    // refusing here would be an outage justified by nothing.
    const reading = lastGoodReading
    const isFresh = reading !== null && now.getTime() - reading.atMs < READING_GRACE_MS
    if (isFresh && reading!.spendUsd < ceiling * CACHED_READING_HEADROOM) {
      logger.error(
        "Global spend ceiling check failed - allowing AI on a recent reading that showed headroom.",
        {
          error,
          ceiling,
          lastKnownSpend: reading!.spendUsd,
          readingAgeMs: now.getTime() - reading!.atMs,
          day: utcDayKey(now),
        }
      )
      return false
    }

    logger.error(
      "CRITICAL: Global spend ceiling check failed with no recent reading showing headroom - " +
        "blocking AI (failing closed). Set GLOBAL_DAILY_SPEND_CEILING_USD=0 to disable the gate " +
        "if this is a false positive.",
      {
        error,
        ceiling,
        lastKnownSpend: reading?.spendUsd ?? null,
        readingAgeMs: reading ? now.getTime() - reading.atMs : null,
        day: utcDayKey(now),
      }
    )
    return true
  }
}

/** Test seam: drop the cached reading so a case starts with no memory. */
export function __resetSpendReadingForTests(): void {
  lastGoodReading = null
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

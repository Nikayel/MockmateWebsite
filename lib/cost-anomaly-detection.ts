/**
 * Cost Anomaly Detection System
 *
 * Monitors AI API costs and detects anomalies that could indicate:
 * - Runaway API calls (infinite loops, bugs)
 * - Abuse (prompt injection, cost attacks)
 * - Unusual usage patterns
 *
 * Alerts:
 * - Single request cost > $1 (per request, on the AI path)
 * - Cost rate over the window since the last sweep, in dollars per hour, above
 *   the hourly budget or 3x the 7-day average (swept automatically)
 *
 * Per-user cost spikes are no longer detected here. They are ENFORCED instead,
 * by the daily spend cap in lib/quota-enforcement.ts, which reads one
 * pre-aggregated document rather than scanning a user's events. See the note on
 * maybeRunHourlyCostSweep.
 */

import { adminDb } from "./firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { logger } from "./logger"
import { readNumber } from "./usage/event-totals"

// Query limits to prevent Firestore cost explosion
const QUERY_LIMITS = {
  hourlyEvents: 5000, // Max events to read for hourly check
  weeklyEvents: 10000, // Max events for 7-day average calculation
} as const

const MS_PER_HOUR = 60 * 60 * 1000

// How often the hourly sweep may run, platform-wide.
const HOURLY_SWEEP_INTERVAL_MS = MS_PER_HOUR
const HOURLY_SWEEP_CLAIM_DOC = "cost_anomaly_hourly_sweep"

// Longest span one sweep will scan. The window normally runs from the previous
// sweep so no minutes go unscanned, but after a long quiet period "since the
// last sweep" could be days, and the query would spend a limit's worth of reads
// on a period the daily surfaces already cover.
const MAX_SWEEP_WINDOW_MS = 6 * MS_PER_HOUR

// Per-instance throttle. Cheap first gate so the overwhelming majority of AI
// calls cost nothing at all to filter; the Firestore claim below is what makes
// the interval hold across instances.
let lastLocalSweepAttemptMs = 0

const COST_AVERAGES_CONFIG_DOC = "cost_averages"
const COST_AVERAGES_STALE_MS = 2 * 60 * 60 * 1000 // 2 hours

// In-memory cache for average hourly cost (expensive to calculate)
let cachedAverageHourlyCost: { value: number; expiresAt: number } | null = null
const AVERAGE_COST_CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

// In-memory cache for anomaly config so the per-request check does not read
// Firestore on every LLM call. Invalidated by updateAnomalyConfig.
let cachedAnomalyConfig: { value: CostAnomalyConfig; expiresAt: number } | null = null
const ANOMALY_CONFIG_CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

export interface CostAnomaly {
  id?: string
  type:
    | "high_single_request"
    | "hourly_spike"
    // No longer written. Retained on the same standard as any other stored
    // shape: anomalies already in Firestore carry it, so the type has to parse
    // them and getAnomalyStats has to bucket them. Nothing here advertises
    // writing it. "daily_budget_exceeded" and "unusual_pattern" were declared
    // alongside it but never written by any version of this file, so no stored
    // document can carry them and they are gone.
    | "user_cost_spike"
  severity: "warning" | "critical"
  description: string
  cost: number
  threshold: number
  context: {
    userId?: string
    sessionId?: string
    endpoint?: string
    provider?: string
    model?: string
    /** Product surface (lib/usage/services.ts id) that made the flagged call. */
    service?: string
    tokens?: number
  }
  timestamp: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
}

/**
 * Runtime-tunable thresholds. Every field here must be read by a detector: a
 * settable knob that nothing reads is worse than no knob, because an admin who
 * turns it believes the platform changed. `dailyBudget` was exactly that, and
 * its default of $500 was twice the real ceiling
 * (COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD, enforced in
 * lib/quota-enforcement.ts, which is where daily spend is actually stopped).
 */
export interface CostAnomalyConfig {
  singleRequestThreshold: number // Alert if single request costs more than this
  hourlyBudget: number // Alert if the cost rate exceeds this per hour
  spikeMultiplier: number // Alert if cost is X times the average
}

export interface CostAverages {
  averageHourlyCost: number
  totalCost: number
  eventCount: number
  windowHours: number
  calculatedAt: string
}

// Default thresholds
const DEFAULT_CONFIG: CostAnomalyConfig = {
  singleRequestThreshold: 1.0, // $1 per request is suspicious
  hourlyBudget: 50.0, // $50/hour max
  spikeMultiplier: 3, // 3x normal is a spike
}

/** The fields an admin may set, and the only ones read back off the document. */
const CONFIG_FIELDS: ReadonlyArray<keyof CostAnomalyConfig> = [
  "singleRequestThreshold",
  "hourlyBudget",
  "spikeMultiplier",
]

export type AnomalyConfigUpdate =
  | { ok: true; value: Partial<CostAnomalyConfig> }
  | { ok: false; error: string }

/**
 * Validate an admin-supplied config patch before it is written.
 *
 * These numbers are the comparison in every alarm. `hourlyBudget: "banana"`
 * makes `rate > budget` false forever and disarms the detector silently;
 * `hourlyBudget: null` makes it true for any spend at all and alarms on every
 * sweep. Neither failure is visible on the admin screen, so the write is the
 * place to refuse them.
 */
export function parseAnomalyConfigUpdate(input: unknown): AnomalyConfigUpdate {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "config must be an object" }
  }

  const raw = input as Record<string, unknown>
  const unknownField = Object.keys(raw).find(
    (key) => !CONFIG_FIELDS.includes(key as keyof CostAnomalyConfig)
  )
  if (unknownField) {
    return {
      ok: false,
      error: `unknown config field: ${unknownField}. Settable fields: ${CONFIG_FIELDS.join(", ")}`,
    }
  }

  const value: Partial<CostAnomalyConfig> = {}
  for (const field of CONFIG_FIELDS) {
    if (!(field in raw)) continue
    const candidate = raw[field]
    if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate <= 0) {
      return { ok: false, error: `${field} must be a number greater than 0` }
    }
    value[field] = candidate
  }

  if (Object.keys(value).length === 0) {
    return { ok: false, error: `config must set at least one of: ${CONFIG_FIELDS.join(", ")}` }
  }

  return { ok: true, value }
}

/**
 * Apply a stored config document over the defaults, dropping values a detector
 * could not use. The write path validates, but the document is older than the
 * validation and a console edit bypasses it entirely.
 */
function sanitizeStoredConfig(stored: Record<string, unknown> | undefined): CostAnomalyConfig {
  const config = { ...DEFAULT_CONFIG }
  if (!stored) return config

  const rejected: string[] = []
  for (const field of CONFIG_FIELDS) {
    const candidate = stored[field]
    if (candidate === undefined) continue
    if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate <= 0) {
      rejected.push(field)
      continue
    }
    config[field] = candidate
  }

  if (rejected.length > 0) {
    logger.warn("Stored cost anomaly config has unusable values; using defaults for them", {
      fields: rejected,
    })
  }

  return config
}

/**
 * Check a single request for cost anomalies
 */
export async function checkRequestCostAnomaly(params: {
  cost: number
  userId?: string
  sessionId?: string
  provider: string
  model?: string
  tokens: number
  endpoint?: string
  service?: string
}): Promise<CostAnomaly | null> {
  const { cost, userId, sessionId, provider, model, tokens, endpoint, service } = params

  // Guarded internally: this runs fire-and-forget on the AI request path, and
  // recordAnomaly deliberately rethrows (its direct callers own the decision).
  // A new caller that forgets `.catch()` must get a null, not an unhandled
  // rejection on the money path.
  try {
    const config = await getAnomalyConfig()

    // Check 1: Single request cost too high
    if (cost > config.singleRequestThreshold) {
      // Omit undefined fields: Firestore rejects undefined values on write.
      const context: CostAnomaly["context"] = { provider, tokens }
      if (userId !== undefined) context.userId = userId
      if (sessionId !== undefined) context.sessionId = sessionId
      if (model !== undefined) context.model = model
      if (endpoint !== undefined) context.endpoint = endpoint
      if (service !== undefined) context.service = service

      const anomaly: Omit<CostAnomaly, "id" | "timestamp"> = {
        type: "high_single_request",
        severity: cost > config.singleRequestThreshold * 5 ? "critical" : "warning",
        description: `Single request cost $${cost.toFixed(4)} exceeds threshold of $${config.singleRequestThreshold.toFixed(2)}`,
        cost,
        threshold: config.singleRequestThreshold,
        context,
        acknowledged: false,
      }

      await recordAnomaly(anomaly)
      return { ...anomaly, timestamp: new Date() }
    }

    return null
  } catch (error) {
    logger.error("[Cost Anomaly] Single-request check failed", { error, provider, cost })
    return null
  }
}

/**
 * Check the aggregate cost rate over a window for anomalies.
 *
 * `since` defaults to the trailing hour; the sweep passes the previous sweep's
 * claim time instead, so consecutive sweeps tile the timeline with no unscanned
 * minutes (the old fixed trailing-hour window combined with a ">= 1 hour"
 * throttle meant sweeps at 10:00 and 11:30 left 10:00-10:30 unexamined by
 * anything, forever).
 *
 * The comparison is PRORATED: dollars per hour over the window, not the raw
 * window total, so a 3-hour window of perfectly normal spend does not alarm
 * simply for being long. The divisor is floored at one hour so a short window
 * is never extrapolated into a scary rate.
 */
export async function checkHourlyCostAnomaly(options?: {
  since?: Date
  now?: Date
}): Promise<CostAnomaly | null> {
  const config = await getAnomalyConfig()

  try {
    const now = options?.now ?? new Date()
    const since = options?.since ?? new Date(now.getTime() - MS_PER_HOUR)
    const windowHours = Math.max(0, now.getTime() - since.getTime()) / MS_PER_HOUR
    // Floor the rate divisor at one hour: 15 minutes of ordinary spend is not
    // an $80/hour emergency.
    const rateDivisorHours = Math.max(1, windowHours)

    // Get costs for the window (with limit to prevent cost explosion)
    const eventsSnapshot = await adminDb
      .collection("usage_events")
      .where("createdAt", ">=", since)
      .orderBy("createdAt", "desc")
      .limit(QUERY_LIMITS.hourlyEvents)
      .get()

    let windowCost = 0
    for (const doc of eventsSnapshot.docs) {
      // readNumber, not `|| 0`: one stored NaN would turn the whole sum into
      // NaN, and `NaN > budget` is false — a single bad document silently
      // disarming the alarm.
      windowCost += readNumber(doc.data().cost)
    }

    // At the query limit the sum is a FLOOR over the newest N events — and a
    // window busy enough to truncate is exactly the runaway this detector
    // exists for. Alarm on the truncation itself, loudly, regardless of how
    // small the visible total is.
    if (eventsSnapshot.size >= QUERY_LIMITS.hourlyEvents) {
      logger.error("Hourly cost sweep hit its query limit; the window total is a floor", {
        limit: QUERY_LIMITS.hourlyEvents,
        costFloor: windowCost,
        since: since.toISOString(),
        now: now.toISOString(),
      })
      const anomaly: Omit<CostAnomaly, "id" | "timestamp"> = {
        type: "hourly_spike",
        severity: "critical",
        description:
          `Cost floor: at least $${windowCost.toFixed(2)} across ≥${QUERY_LIMITS.hourlyEvents} events ` +
          `over ${windowHours.toFixed(1)}h — the sweep hit its query limit, so real spend is higher`,
        cost: windowCost,
        threshold: config.hourlyBudget,
        context: {},
        acknowledged: false,
      }
      await recordAnomaly(anomaly)
      return { ...anomaly, timestamp: new Date() }
    }

    const hourlyRate = windowCost / rateDivisorHours

    if (hourlyRate > config.hourlyBudget) {
      const anomaly: Omit<CostAnomaly, "id" | "timestamp"> = {
        type: "hourly_spike",
        severity: hourlyRate >= config.hourlyBudget * 2 ? "critical" : "warning",
        description:
          `Cost rate $${hourlyRate.toFixed(2)}/h exceeds budget $${config.hourlyBudget.toFixed(2)}/h: ` +
          `$${windowCost.toFixed(2)} across ${eventsSnapshot.size} events over ${windowHours.toFixed(1)}h`,
        cost: hourlyRate,
        threshold: config.hourlyBudget,
        context: {},
        acknowledged: false,
      }

      await recordAnomaly(anomaly)
      return { ...anomaly, timestamp: new Date() }
    }

    // Also check for spikes compared to average
    const avgHourlyCost = await getAverageHourlyCost()
    if (avgHourlyCost > 0 && hourlyRate > avgHourlyCost * config.spikeMultiplier) {
      const anomaly: Omit<CostAnomaly, "id" | "timestamp"> = {
        type: "hourly_spike",
        severity: "warning",
        description: `Cost rate $${hourlyRate.toFixed(2)}/h is ${(hourlyRate / avgHourlyCost).toFixed(1)}x the average ($${avgHourlyCost.toFixed(2)}/h)`,
        cost: hourlyRate,
        threshold: avgHourlyCost * config.spikeMultiplier,
        context: {},
        acknowledged: false,
      }

      await recordAnomaly(anomaly)
      return { ...anomaly, timestamp: new Date() }
    }
  } catch (error) {
    logger.error("Failed to check hourly cost anomaly", { error })
  }

  return null
}

/**
 * Claim the right to run the hourly sweep, platform-wide.
 *
 * Without this, "run at most once an hour" would mean once an hour PER warm
 * serverless instance, and the sweep reads up to 5,000 documents. A single
 * config doc read+write in a transaction is a rounding error against that, and
 * it turns N scans an hour into one.
 */
async function claimHourlySweep(
  nowMs: number
): Promise<{ claimed: boolean; previousRunAtMs?: number }> {
  const claimRef = adminDb.collection("config").doc(HOURLY_SWEEP_CLAIM_DOC)

  return adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(claimRef)
    const lastRunAtMs = doc.data()?.lastRunAtMs
    if (typeof lastRunAtMs === "number" && nowMs - lastRunAtMs < HOURLY_SWEEP_INTERVAL_MS) {
      return { claimed: false }
    }
    transaction.set(
      claimRef,
      { lastRunAtMs: nowMs, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    )
    // The previous claim time is the start of the window this sweep owes: the
    // last sweep covered everything up to it, so scanning from there tiles the
    // timeline with no gaps.
    return {
      claimed: true,
      previousRunAtMs: typeof lastRunAtMs === "number" ? lastRunAtMs : undefined,
    }
  })
}

/**
 * Run the hourly cost sweep if it is due. Safe to call on every AI call.
 *
 * checkHourlyCostAnomaly was only reachable from an admin "check now" button,
 * which means the only detector that ran automatically was the per-request one
 * — and that fires at $1 for a SINGLE request. A runaway loop of thousands of
 * ordinary-sized calls never trips it: each call is a few cents, entirely
 * unremarkable on its own, and the bill only exists in the aggregate that
 * nothing was looking at. This is the aggregate detector, running on its own.
 *
 * Two-level throttle: an in-memory timestamp filters essentially every call for
 * free, and a Firestore claim holds the interval across instances. Never
 * throws — it is called from a fire-and-forget accounting path.
 */
export async function maybeRunHourlyCostSweep(now: Date = new Date()): Promise<void> {
  const nowMs = now.getTime()
  if (nowMs - lastLocalSweepAttemptMs < HOURLY_SWEEP_INTERVAL_MS) return
  // Set before the await so concurrent calls on this instance do not all race
  // into the claim transaction.
  lastLocalSweepAttemptMs = nowMs

  try {
    const claim = await claimHourlySweep(nowMs)
    if (!claim.claimed) return
    // Scan from the previous sweep so no minutes are ever left unexamined,
    // bounded at MAX_SWEEP_WINDOW_MS so a long quiet period does not buy one
    // enormous query. First sweep ever: the trailing hour.
    const sinceMs = Math.max(
      claim.previousRunAtMs ?? nowMs - MS_PER_HOUR,
      nowMs - MAX_SWEEP_WINDOW_MS
    )
    await checkHourlyCostAnomaly({ since: new Date(sinceMs), now })
  } catch (error) {
    logger.error("Hourly cost sweep failed", { error })
  }
}

/**
 * Record an anomaly
 */
async function recordAnomaly(anomaly: Omit<CostAnomaly, "id" | "timestamp">): Promise<string> {
  try {
    // Check for duplicate recent anomalies (same type, within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const recentSnapshot = await adminDb
      .collection("cost_anomalies")
      .where("type", "==", anomaly.type)
      .where("timestamp", ">=", fiveMinutesAgo)
      .limit(1)
      .get()

    if (!recentSnapshot.empty) {
      // Update existing instead of creating new
      const existingDoc = recentSnapshot.docs[0]
      await existingDoc.ref.update({
        cost: anomaly.cost,
        description: anomaly.description,
        timestamp: FieldValue.serverTimestamp(),
      })
      return existingDoc.id
    }

    const docRef = await adminDb.collection("cost_anomalies").add({
      ...anomaly,
      timestamp: FieldValue.serverTimestamp(),
    })

    // Log critical anomalies
    if (anomaly.severity === "critical") {
      logger.error("CRITICAL COST ANOMALY DETECTED", {
        type: anomaly.type,
        cost: anomaly.cost,
        description: anomaly.description,
      })
    } else {
      logger.warn("Cost anomaly detected", {
        type: anomaly.type,
        cost: anomaly.cost,
      })
    }

    return docRef.id
  } catch (error) {
    logger.error("Failed to record cost anomaly", { error, type: anomaly.type })
    throw error
  }
}

/**
 * Get average hourly cost (last 7 days)
 * Uses in-memory caching to avoid expensive repeated queries
 */
export async function aggregateCostAverages(now: Date = new Date()): Promise<CostAverages> {
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const eventsSnapshot = await adminDb
    .collection("usage_events")
    .where("createdAt", ">=", sevenDaysAgo)
    .orderBy("createdAt", "desc")
    .limit(QUERY_LIMITS.weeklyEvents)
    .get()

  let totalCost = 0
  for (const doc of eventsSnapshot.docs) {
    totalCost += doc.data().cost || 0
  }

  let windowHours = 168
  if (eventsSnapshot.size >= QUERY_LIMITS.weeklyEvents && eventsSnapshot.size > 0) {
    const oldestSampled = eventsSnapshot.docs[eventsSnapshot.size - 1].data().createdAt?.toDate?.()
    const newestSampled = eventsSnapshot.docs[0].data().createdAt?.toDate?.()
    if (oldestSampled && newestSampled) {
      windowHours = Math.max(
        1,
        (newestSampled.getTime() - oldestSampled.getTime()) / (1000 * 60 * 60)
      )
    }
  }

  const averageHourlyCost = windowHours > 0 ? totalCost / windowHours : 0
  const averages: CostAverages = {
    averageHourlyCost,
    totalCost,
    eventCount: eventsSnapshot.size,
    windowHours,
    calculatedAt: now.toISOString(),
  }

  await adminDb
    .collection("config")
    .doc(COST_AVERAGES_CONFIG_DOC)
    .set(
      {
        ...averages,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

  cachedAverageHourlyCost = {
    value: averageHourlyCost,
    expiresAt: Date.now() + AVERAGE_COST_CACHE_TTL_MS,
  }

  logger.info("Cost averages aggregated", {
    averageHourlyCost,
    eventCount: eventsSnapshot.size,
    windowHours,
  })

  return averages
}

export async function getAverageHourlyCost(): Promise<number> {
  // Check cache first
  if (cachedAverageHourlyCost && Date.now() < cachedAverageHourlyCost.expiresAt) {
    return cachedAverageHourlyCost.value
  }

  try {
    const averagesDoc = await adminDb.collection("config").doc(COST_AVERAGES_CONFIG_DOC).get()
    if (!averagesDoc.exists) {
      logger.warn("Cost averages document is missing; returning safe average of 0")
      return 0
    }

    const data = averagesDoc.data() as Partial<CostAverages> | undefined
    const calculatedAt = data?.calculatedAt ? new Date(data.calculatedAt) : null
    const isStale =
      !calculatedAt ||
      Number.isNaN(calculatedAt.getTime()) ||
      Date.now() - calculatedAt.getTime() > COST_AVERAGES_STALE_MS

    if (isStale) {
      logger.warn("Cost averages document is stale; returning safe cached value", {
        calculatedAt: data?.calculatedAt,
      })
      return cachedAverageHourlyCost?.value || 0
    }

    const averageHourlyCost =
      typeof data?.averageHourlyCost === "number" ? data.averageHourlyCost : 0
    cachedAverageHourlyCost = {
      value: averageHourlyCost,
      expiresAt: Date.now() + AVERAGE_COST_CACHE_TTL_MS,
    }

    return averageHourlyCost
  } catch (error) {
    logger.error("Failed to get average hourly cost", { error })
    return cachedAverageHourlyCost?.value || 0
  }
}

/**
 * Get anomaly config (can be stored in Firestore for runtime updates)
 */
async function getAnomalyConfig(): Promise<CostAnomalyConfig> {
  // Check cache first (keeps the per-request check off Firestore's hot path)
  if (cachedAnomalyConfig && Date.now() < cachedAnomalyConfig.expiresAt) {
    return cachedAnomalyConfig.value
  }

  let config = DEFAULT_CONFIG
  try {
    const configDoc = await adminDb.collection("config").doc("cost_anomaly").get()

    if (configDoc.exists) {
      // Sanitized, not spread-and-cast: a stored "banana" or null threshold
      // would otherwise ride into every comparison (see sanitizeStoredConfig).
      config = sanitizeStoredConfig(configDoc.data())
    }
  } catch (error) {
    logger.error("Failed to get anomaly config, using defaults", { error })
  }

  cachedAnomalyConfig = {
    value: config,
    expiresAt: Date.now() + ANOMALY_CONFIG_CACHE_TTL_MS,
  }
  return config
}

/**
 * Update anomaly config
 */
export async function updateAnomalyConfig(config: Partial<CostAnomalyConfig>): Promise<void> {
  // Revalidated here as well as in the admin route: this is the last writer
  // before Firestore, and a future caller that skips the route must not be
  // able to store a threshold no detector can compare against.
  const parsed = parseAnomalyConfigUpdate(config)
  if (!parsed.ok) {
    throw new Error(`Invalid cost anomaly config: ${parsed.error}`)
  }

  await adminDb
    .collection("config")
    .doc("cost_anomaly")
    .set({ ...parsed.value, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

  // Invalidate the cache so the new thresholds take effect immediately
  cachedAnomalyConfig = null
}

/**
 * Get recent anomalies for admin dashboard
 */
export async function getRecentAnomalies(limit: number = 50): Promise<CostAnomaly[]> {
  try {
    const snapshot = await adminDb
      .collection("cost_anomalies")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get()

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as CostAnomaly[]
  } catch (error) {
    logger.error("Failed to get recent anomalies", { error })
    return []
  }
}

/**
 * Acknowledge an anomaly
 */
export async function acknowledgeAnomaly(anomalyId: string, acknowledgedBy: string): Promise<void> {
  await adminDb.collection("cost_anomalies").doc(anomalyId).update({
    acknowledged: true,
    acknowledgedBy,
    acknowledgedAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Get anomaly statistics
 */
export async function getAnomalyStats(): Promise<{
  total: number
  unacknowledged: number
  byType: Record<string, number>
  bySeverity: { warning: number; critical: number }
  last24Hours: number
  estimatedLoss: number // Total cost from anomalies
}> {
  const stats = {
    total: 0,
    unacknowledged: 0,
    byType: {} as Record<string, number>,
    bySeverity: { warning: 0, critical: 0 },
    last24Hours: 0,
    estimatedLoss: 0,
  }

  try {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const snapshot = await adminDb
      .collection("cost_anomalies")
      .orderBy("timestamp", "desc")
      .limit(500)
      .get()

    for (const doc of snapshot.docs) {
      const data = doc.data()
      stats.total++

      if (!data.acknowledged) stats.unacknowledged++

      stats.byType[data.type] = (stats.byType[data.type] || 0) + 1
      // Only the two known keys. The old cast incremented an absent key, and
      // `undefined + 1` is NaN, which then rendered as the admin panel's
      // critical count. An unrecognized severity still counts in total and
      // byType; it just cannot poison the severity split.
      const severity: unknown = data.severity
      if (severity === "warning" || severity === "critical") {
        stats.bySeverity[severity]++
      }

      const timestamp = data.timestamp?.toDate() || new Date()
      if (timestamp >= twentyFourHoursAgo) {
        stats.last24Hours++
      }

      // Estimated loss = sum of costs that exceeded thresholds. Coerced first:
      // one stored NaN or string would otherwise turn the whole figure into
      // NaN in the admin panel.
      const anomalyCost = readNumber(data.cost)
      const anomalyThreshold = readNumber(data.threshold)
      if (anomalyCost > anomalyThreshold) {
        stats.estimatedLoss += anomalyCost - anomalyThreshold
      }
    }
  } catch (error) {
    logger.error("Failed to get anomaly stats", { error })
  }

  return stats
}

/**
 * Cost Anomaly Detection System
 *
 * Monitors AI API costs and detects anomalies that could indicate:
 * - Runaway API calls (infinite loops, bugs)
 * - Abuse (prompt injection, cost attacks)
 * - Unusual usage patterns
 *
 * Alerts:
 * - Single request cost > $1
 * - Hourly cost > 3x average
 * - Daily cost > budget threshold
 * - Single user cost spike
 */

import { adminDb } from "./firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { logger } from "./logger"

// Query limits to prevent Firestore cost explosion
const QUERY_LIMITS = {
  hourlyEvents: 5000, // Max events to read for hourly check
  userHourlyEvents: 1000, // Max events per user per hour
  weeklyEvents: 10000, // Max events for 7-day average calculation
} as const

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
    | "daily_budget_exceeded"
    | "user_cost_spike"
    | "unusual_pattern"
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
    tokens?: number
  }
  timestamp: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
}

export interface CostAnomalyConfig {
  singleRequestThreshold: number // Alert if single request costs more than this
  hourlyBudget: number // Alert if hourly cost exceeds this
  dailyBudget: number // Alert if daily cost exceeds this
  userHourlyThreshold: number // Alert if single user spends more than this per hour
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
  dailyBudget: 500.0, // $500/day max
  userHourlyThreshold: 5.0, // $5/hour per user max
  spikeMultiplier: 3, // 3x normal is a spike
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
}): Promise<CostAnomaly | null> {
  const { cost, userId, sessionId, provider, model, tokens, endpoint } = params
  const config = await getAnomalyConfig()

  // Check 1: Single request cost too high
  if (cost > config.singleRequestThreshold) {
    // Omit undefined fields: Firestore rejects undefined values on write.
    const context: CostAnomaly["context"] = { provider, tokens }
    if (userId !== undefined) context.userId = userId
    if (sessionId !== undefined) context.sessionId = sessionId
    if (model !== undefined) context.model = model
    if (endpoint !== undefined) context.endpoint = endpoint

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
}

/**
 * Check hourly costs for anomalies (run every hour or on each request)
 */
export async function checkHourlyCostAnomaly(): Promise<CostAnomaly | null> {
  const config = await getAnomalyConfig()

  try {
    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Get costs from last hour (with limit to prevent cost explosion)
    const eventsSnapshot = await adminDb
      .collection("usage_events")
      .where("createdAt", ">=", hourAgo)
      .orderBy("createdAt", "desc")
      .limit(QUERY_LIMITS.hourlyEvents)
      .get()

    let hourlyCost = 0
    for (const doc of eventsSnapshot.docs) {
      hourlyCost += doc.data().cost || 0
    }

    if (hourlyCost > config.hourlyBudget) {
      const anomaly: Omit<CostAnomaly, "id" | "timestamp"> = {
        type: "hourly_spike",
        severity: hourlyCost > config.hourlyBudget * 2 ? "critical" : "warning",
        description: `Hourly cost $${hourlyCost.toFixed(2)} exceeds budget of $${config.hourlyBudget.toFixed(2)}`,
        cost: hourlyCost,
        threshold: config.hourlyBudget,
        context: {},
        acknowledged: false,
      }

      await recordAnomaly(anomaly)
      return { ...anomaly, timestamp: new Date() }
    }

    // Also check for spikes compared to average
    const avgHourlyCost = await getAverageHourlyCost()
    if (avgHourlyCost > 0 && hourlyCost > avgHourlyCost * config.spikeMultiplier) {
      const anomaly: Omit<CostAnomaly, "id" | "timestamp"> = {
        type: "hourly_spike",
        severity: "warning",
        description: `Hourly cost $${hourlyCost.toFixed(2)} is ${(hourlyCost / avgHourlyCost).toFixed(1)}x the average ($${avgHourlyCost.toFixed(2)})`,
        cost: hourlyCost,
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
 * Check user-level cost anomaly
 */
export async function checkUserCostAnomaly(userId: string): Promise<CostAnomaly | null> {
  const config = await getAnomalyConfig()

  try {
    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Limit per-user query to prevent abuse or runaway reads
    const eventsSnapshot = await adminDb
      .collection("usage_events")
      .where("userId", "==", userId)
      .where("createdAt", ">=", hourAgo)
      .orderBy("createdAt", "desc")
      .limit(QUERY_LIMITS.userHourlyEvents)
      .get()

    let userHourlyCost = 0
    for (const doc of eventsSnapshot.docs) {
      userHourlyCost += doc.data().cost || 0
    }

    if (userHourlyCost > config.userHourlyThreshold) {
      const anomaly: Omit<CostAnomaly, "id" | "timestamp"> = {
        type: "user_cost_spike",
        severity: userHourlyCost > config.userHourlyThreshold * 3 ? "critical" : "warning",
        description: `User ${userId} hourly cost $${userHourlyCost.toFixed(2)} exceeds threshold of $${config.userHourlyThreshold.toFixed(2)}`,
        cost: userHourlyCost,
        threshold: config.userHourlyThreshold,
        context: { userId },
        acknowledged: false,
      }

      await recordAnomaly(anomaly)
      return { ...anomaly, timestamp: new Date() }
    }
  } catch (error) {
    logger.error("Failed to check user cost anomaly", { error, userId })
  }

  return null
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
      config = { ...DEFAULT_CONFIG, ...configDoc.data() } as CostAnomalyConfig
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
  await adminDb
    .collection("config")
    .doc("cost_anomaly")
    .set({ ...config, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

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
      stats.bySeverity[data.severity as "warning" | "critical"]++

      const timestamp = data.timestamp?.toDate() || new Date()
      if (timestamp >= twentyFourHoursAgo) {
        stats.last24Hours++
      }

      // Estimated loss = sum of costs that exceeded thresholds
      if (data.cost > data.threshold) {
        stats.estimatedLoss += data.cost - data.threshold
      }
    }
  } catch (error) {
    logger.error("Failed to get anomaly stats", { error })
  }

  return stats
}

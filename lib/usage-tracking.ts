/**
 * Usage Tracking System
 *
 * Tracks all AI API calls, tokens, and costs per user.
 * Uses Firebase Firestore for persistence.
 * Now with ACCURATE token counting via js-tiktoken.
 *
 * Cost caps:
 * - Free tier: $0.50 (limited sessions)
 * - Pro tier: $25/month budget cap
 * - Enterprise: $100/month budget cap
 *
 * NOTE: For new code, consider using the segregated event types from
 * @/lib/types/usage-events.ts which follow Interface Segregation Principle.
 */

import { adminDb } from "./firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { countTokens } from "./token-counter"
import { logger } from "./logger"
import { maybeRunHourlyCostSweep } from "./cost-anomaly-detection"
import { recordGlobalSpend } from "./global-spend-guard"
import {
  LEGACY_EVENT_TYPE_SERVICE,
  SYSTEM_USER_ID,
  UNATTRIBUTED_SERVICE,
  isUsageServiceId,
  type UsageServiceId,
} from "./usage/services"
import {
  AI_BUDGET_CAPS,
  AI_PROVIDER_COSTS,
  FALLBACK_RATE_PROVIDER,
  calculateAICost,
  resolveProviderRate,
} from "./pricing"
import { resolveBudgetCap, resolveTier, hasBudgetOverride, budgetUsedPercent } from "./usage/budget"
import { fetchProfilesById } from "./usage/profile-lookup"
import {
  USAGE_EVENT_SCAN_LIMIT,
  USER_SUMMARY_SCAN_LIMIT,
  describeCoverage,
  type ScanCoverage,
} from "./usage/scan-limits"
import {
  readNumber,
  emptyUsageTotals,
  accumulateUsageEvent,
  averageTokensPerRequest,
  type UsageTotals,
} from "./usage/event-totals"

/**
 * Blended (input+output averaged) cost per 1K tokens per provider.
 *
 * DISPLAY ONLY. Re-exported from lib/pricing.ts, where it is derived from the
 * per-direction AI_PROVIDER_RATES, rather than maintained as a second literal
 * table here. Both copies happened to agree on all 14 rows, but nothing checked
 * that they agreed on the same KEY SET, and they did not: this table carried the
 * bare "openai" row and AI_PROVIDER_RATES did not.
 *
 * Its only remaining consumer is the admin rate table (app/api/admin/usage),
 * which shows a headline "what does this provider cost" figure with no token
 * split to price against. Nothing may price a real call with it: averaging is
 * exactly what the per-direction table exists to stop.
 */
export const PROVIDER_COSTS = AI_PROVIDER_COSTS

// Deepgram voice costs (per minute of audio).
// Legacy entries are kept so historical usage rows still price correctly.
export const DEEPGRAM_COSTS = {
  "nova-3": 0.0048, // Nova-3 monolingual: $0.0048/min (Pay As You Go) - current model
  "nova-2": 0.0043, // Nova-2: $0.0043/min (legacy)
  nova: 0.0041, // Nova: $0.0041/min (legacy)
  enhanced: 0.0145, // Enhanced: $0.0145/min (legacy)
  base: 0.0125, // Base: $0.0125/min (legacy)
} as const

// Embedding costs per 1K tokens
export const EMBEDDING_COSTS = {
  "gemini-embedding-001": 0.000025, // Gemini: current model (replaced text-embedding-004)
  "text-embedding-004": 0.000025, // Gemini: retired by Google; kept for legacy cost rows
  "text-embedding-3-small": 0.00002, // OpenAI: $0.02/1M tokens
  "text-embedding-3-large": 0.00013, // OpenAI: $0.13/1M tokens
  "text-embedding-ada-002": 0.0001, // OpenAI: $0.10/1M tokens (legacy)
} as const

/**
 * Budget caps per subscription tier (per billing cycle).
 *
 * Re-exported from lib/pricing.ts rather than redeclared. This table previously
 * existed in four places (here, pricing.ts, quota-enforcement.ts and
 * rate-limiter.ts) with different names, and different consumers read different
 * copies: the admin UI read AI_BUDGET_CAPS while enforcement read its own, so a
 * change to one would have shown the user a cap the server never applied.
 */
export const BUDGET_CAPS = AI_BUDGET_CAPS

// "code_execution" was removed from this union 2026-08-17: it was declared for
// Piston server-side execution, which is deprecated and free, and no call site
// ever wrote it — a dead value that implied execution cost was tracked.
export type UsageEventType =
  | "chat_message"
  | "feedback_generation"
  | "hint_request"
  | "session_start"
  | "session_end"
  | "voice_transcription" // Deepgram STT
  | "embedding_generation" // RAG embeddings

export interface UsageEvent {
  id?: string
  userId: string
  eventType: UsageEventType
  /**
   * WHICH product surface spent this. Required so "where is the money going"
   * is answerable below eventType granularity — the five LLM calls behind one
   * feedback request each carry their own id. Registered vocabulary only; see
   * lib/usage/services.ts. Rows written before 2026-08-17 lack the field and
   * are bucketed by LEGACY_EVENT_TYPE_SERVICE on the read side.
   */
  service: UsageServiceId
  provider?: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  cost?: number
  latencyMs?: number
  cached?: boolean
  sessionId?: string
  scenarioId?: string
  // NEW: Granular tracking fields
  pattern?: string // DSA pattern (arrays-hashing, trees, etc.)
  difficulty?: string // easy, medium, hard
  scenarioTitle?: string // Problem title
  isExactTokenCount?: boolean // Whether tokens are accurate or estimated
  metadata?: Record<string, any>
  createdAt: Date | Timestamp
}

export interface UserUsageSummary {
  userId: string
  periodStart: Date
  periodEnd: Date
  totalCost: number
  totalTokens: number
  totalRequests: number
  requestsByType: Record<UsageEventType, number>
  requestsByProvider: Record<string, number>
  cacheHits: number
  cacheMisses: number
  averageLatencyMs: number
  budgetCap: number
  budgetRemaining: number
  budgetUsedPercent: number
}

export interface UsageStats {
  daily: {
    date: string
    cost: number
    tokens: number
    requests: number
  }[]
  byProvider: Record<string, { cost: number; tokens: number; requests: number }>
  byEventType: Record<string, { cost: number; tokens: number; requests: number }>
}

/**
 * Track a usage event.
 *
 * Returns whether the spend was actually recorded. Still never throws — a
 * tracking failure must not break a user's request — but "did not throw" and
 * "recorded" are different facts, and callers that can act on the difference
 * need to be able to tell. /api/internal/usage is one: it was returning
 * { success: true } for spend that had just failed to land, which combined with
 * the Edge reporter discarding its own result to make a silent, total loss of
 * metering look exactly like a healthy system.
 */
export async function trackUsageEvent(
  event: Omit<UsageEvent, "id" | "createdAt">
): Promise<boolean> {
  try {
    const usageRef = adminDb.collection("usage_events")

    // Filter out undefined values to prevent Firestore errors
    // "Cannot use 'undefined' as a Firestore value"
    const cleanEvent = Object.fromEntries(
      Object.entries(event).filter(([, value]) => value !== undefined)
    )

    await usageRef.add({
      ...cleanEvent,
      createdAt: FieldValue.serverTimestamp(),
    })

    // Also update the user's aggregate usage for the current period
    await updateUserAggregateUsage(event)
    await updateUserDailyUsage(event)

    // Feed the global daily kill-switch from the funnel itself, so EVERY
    // tracked dollar — LLM, voice, embeddings, Node or Edge, attributed or
    // system — counts against the ceiling exactly once. The Node AI path and
    // the Edge ingest used to call recordGlobalSpend themselves, which meant
    // voice and embedding spend never reached the ceiling at all: the Spend
    // health bar showed a "today" figure that structurally excluded categories
    // rendered as non-zero two panels below it. Callers must NOT also call
    // recordGlobalSpend or the dollar counts twice. Never throws.
    await recordGlobalSpend(event.cost ?? 0, event.service)

    // Drive the aggregate cost detector from here, because this is the single
    // funnel every AI cost passes through — both the Node path and the Edge
    // path's ingest reach it — which is exactly what an automatic detector
    // needs. It self-throttles to once an hour platform-wide, so the cost of
    // asking on every call is one integer comparison.
    //
    // Not awaited: the sweep reads up to 5,000 documents and nothing on the
    // request path should wait for a detector. It never throws.
    void maybeRunHourlyCostSweep().catch(() => {})

    return true
  } catch (error) {
    logger.error("Failed to track usage event", {
      error,
      eventType: event.eventType,
      service: event.service,
      userId: event.userId,
      cost: event.cost,
    })
    // The ledger write failed, but the kill-switch must still see the dollar:
    // fail-open here is how a Firestore incident and a runaway spend loop
    // could otherwise coincide invisibly. Best-effort, never throws.
    void recordGlobalSpend(event.cost ?? 0, event.service)
    // Don't throw - usage tracking failures shouldn't break the app
    return false
  }
}

// =============================================================================
// UTC MONTH BOUNDARY
// =============================================================================
//
// Every money key in this system is UTC — utcDayKey below, global_usage in
// lib/global-spend-guard.ts — EXCEPT the monthly period key, which was built
// from local-time components. Dormant on Vercel (process TZ is UTC), but one
// TZ env var away from billing a call to the previous month's budget while the
// daily cap had already rolled over: at 2026-09-01T03:00Z under
// America/Los_Angeles the local key is still "2026-08". These helpers make the
// month boundary explicit UTC everywhere — the summary writer, the per-user
// reader, and every admin aggregation must all use them so writer and readers
// can never disagree.

/** UTC month key, e.g. "2026-08". Pairs with utcDayKey. */
export function utcMonthKey(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
}

/** First instant of the current UTC month. */
export function utcMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

/** Last day of the current UTC month (same day-granularity the old local code used). */
export function utcMonthEnd(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
}

/**
 * Update user's aggregate usage for the current billing period
 */
async function updateUserAggregateUsage(
  event: Omit<UsageEvent, "id" | "createdAt">
): Promise<void> {
  const now = new Date()
  const periodStart = utcMonthStart(now)
  const periodEnd = utcMonthEnd(now)
  const periodKey = utcMonthKey(now)

  const usageSummaryRef = adminDb
    .collection("users")
    .doc(event.userId)
    .collection("usage_summaries")
    .doc(periodKey)

  await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(usageSummaryRef)

    if (!doc.exists) {
      // Create new summary for this period
      transaction.set(usageSummaryRef, {
        userId: event.userId,
        periodStart: Timestamp.fromDate(periodStart),
        periodEnd: Timestamp.fromDate(periodEnd),
        totalCost: event.cost || 0,
        totalTokens: event.totalTokens || 0,
        totalRequests: 1,
        requestsByType: { [event.eventType]: 1 },
        requestsByProvider: event.provider ? { [event.provider]: 1 } : {},
        // Per-service spend, keyed by lib/usage/services.ts ids. Only dollars:
        // zero-cost events (telemetry, cache hits) never churn the map.
        costByService: event.cost ? { [event.service]: event.cost } : {},
        cacheHits: event.cached ? 1 : 0,
        cacheMisses: event.cached ? 0 : 1,
        totalLatencyMs: event.latencyMs || 0,
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else {
      // Update existing summary
      const data = doc.data()!
      const requestsByType = data.requestsByType || {}
      const requestsByProvider = data.requestsByProvider || {}

      requestsByType[event.eventType] = (requestsByType[event.eventType] || 0) + 1
      if (event.provider) {
        requestsByProvider[event.provider] = (requestsByProvider[event.provider] || 0) + 1
      }

      transaction.update(usageSummaryRef, {
        totalCost: FieldValue.increment(event.cost || 0),
        totalTokens: FieldValue.increment(event.totalTokens || 0),
        totalRequests: FieldValue.increment(1),
        requestsByType,
        requestsByProvider,
        // Dotted field path is safe: service ids are kebab-case with no dots,
        // enforced by the registry test.
        ...(event.cost
          ? { [`costByService.${event.service}`]: FieldValue.increment(event.cost) }
          : {}),
        cacheHits: FieldValue.increment(event.cached ? 1 : 0),
        cacheMisses: FieldValue.increment(event.cached ? 0 : 1),
        totalLatencyMs: FieldValue.increment(event.latencyMs || 0),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  })
}

// =============================================================================
// DAILY SPEND DIMENSION
// =============================================================================
//
// The budget cap was keyed by calendar month alone, so a user could burn an
// entire month's AI allowance in one afternoon with nothing to object. That is
// not a theoretical shape: session quota increments once per session start,
// while cost accrues per AI call, so a single long-running session can spend the
// whole monthly allowance without ever consuming a second session.
//
// A daily dimension bounds the BURN RATE rather than the total, which is the
// thing an unbounded-bill incident actually needs. It is a second, independent
// key — deliberately NOT stored in the usage_summaries subcollection, because
// getAdminUsageStats runs collectionGroup("usage_summaries") filtered on
// periodStart and would sum daily docs alongside monthly ones, double-counting
// platform spend.

const DAILY_USAGE_COLLECTION = "daily_usage"

/**
 * Fraction of the monthly allowance any single UTC day may consume.
 *
 * 0.5 is chosen so it does not bind before the session quota does for normal
 * usage. At the calibrated ~$0.40 pathological / ~$0.15 typical session cost,
 * half of free's $6.50 still covers all 8 of its monthly sessions in one day at
 * the pathological rate, and half of pro's $28 covers ~93 typical sessions
 * against the 100-question quota. What it no longer covers (since the
 * 2026-08-18 quota rise) is all 100 in one day at the PATHOLOGICAL rate; that
 * account is exactly the runaway shape this cap exists for.
 *
 * What it does remove is the ability to spend a month's allowance in a day
 * WITHOUT consuming sessions — the runaway-loop and long-session cases, where
 * cost accrues per AI call and the session counter never moves.
 */
export const DAILY_BUDGET_FRACTION = 0.5

/** The daily ceiling implied by a period budget cap. */
export function resolveDailyBudgetCap(monthlyCap: number): number {
  if (!Number.isFinite(monthlyCap) || monthlyCap <= 0) return 0
  return monthlyCap * DAILY_BUDGET_FRACTION
}

/**
 * UTC day key, matching lib/global-spend-guard.ts. UTC rather than local time so
 * the window is deterministic and a user cannot get two allowances by moving
 * timezone.
 */
export function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/**
 * Increment the user's spend for today.
 *
 * A standalone merge+increment rather than part of updateUserAggregateUsage's
 * transaction: it touches a different document, needs no read, and keeping it
 * out of the transaction means a contended monthly summary cannot make the daily
 * counter retry.
 */
async function updateUserDailyUsage(event: Omit<UsageEvent, "id" | "createdAt">): Promise<void> {
  const dayKey = utcDayKey()
  await adminDb
    .collection("users")
    .doc(event.userId)
    .collection(DAILY_USAGE_COLLECTION)
    .doc(dayKey)
    .set(
      {
        userId: event.userId,
        day: dayKey,
        totalCost: FieldValue.increment(event.cost || 0),
        totalTokens: FieldValue.increment(event.totalTokens || 0),
        totalRequests: FieldValue.increment(1),
        ...(event.cost
          ? { costByService: { [event.service]: FieldValue.increment(event.cost) } }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
}

/**
 * What this user has spent today (UTC). Returns 0 when there is no record.
 *
 * Throws on a read failure rather than returning 0. A caller enforcing a cap
 * must be able to tell "spent nothing" from "cannot see", because those two
 * demand opposite decisions and quietly conflating them is how a cap stops
 * capping.
 */
export async function getUserDailyCost(userId: string, now: Date = new Date()): Promise<number> {
  const doc = await adminDb
    .collection("users")
    .doc(userId)
    .collection(DAILY_USAGE_COLLECTION)
    .doc(utcDayKey(now))
    .get()

  const total = doc.data()?.totalCost
  return typeof total === "number" && Number.isFinite(total) ? total : 0
}

/**
 * Get user's usage summary for the current period
 */
export async function getUserUsageSummary(userId: string): Promise<UserUsageSummary | null> {
  try {
    const now = new Date()
    const periodKey = utcMonthKey(now)

    // Get usage summary
    const summaryDoc = await adminDb
      .collection("users")
      .doc(userId)
      .collection("usage_summaries")
      .doc(periodKey)
      .get()

    // Get user's budget cap.
    // IMPORTANT: Use 'profiles' collection for consistency with quota-enforcement.ts
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()
    const budgetCap = resolveBudgetCap(profileDoc.data())

    if (!summaryDoc.exists) {
      const periodStart = utcMonthStart(now)
      const periodEnd = utcMonthEnd(now)

      return {
        userId,
        periodStart,
        periodEnd,
        totalCost: 0,
        totalTokens: 0,
        totalRequests: 0,
        requestsByType: {} as Record<UsageEventType, number>,
        requestsByProvider: {},
        cacheHits: 0,
        cacheMisses: 0,
        averageLatencyMs: 0,
        budgetCap,
        budgetRemaining: budgetCap,
        budgetUsedPercent: 0,
      }
    }

    const data = summaryDoc.data()!
    const totalCost = data.totalCost || 0
    const totalRequests = data.totalRequests || 0

    return {
      userId,
      periodStart: data.periodStart?.toDate() || new Date(),
      periodEnd: data.periodEnd?.toDate() || new Date(),
      totalCost,
      totalTokens: data.totalTokens || 0,
      totalRequests,
      requestsByType: data.requestsByType || {},
      requestsByProvider: data.requestsByProvider || {},
      cacheHits: data.cacheHits || 0,
      cacheMisses: data.cacheMisses || 0,
      averageLatencyMs: totalRequests > 0 ? (data.totalLatencyMs || 0) / totalRequests : 0,
      budgetCap,
      budgetRemaining: Math.max(0, budgetCap - totalCost),
      budgetUsedPercent: budgetUsedPercent(totalCost, budgetCap),
    }
  } catch (error) {
    console.error("[Usage Tracking] Failed to get user summary:", error)
    return null
  }
}

/**
 * Check if user has exceeded their budget
 */
export async function checkUserBudget(userId: string): Promise<{
  allowed: boolean
  budgetRemaining: number
  budgetUsedPercent: number
  message?: string
}> {
  const summary = await getUserUsageSummary(userId)

  if (!summary) {
    return { allowed: true, budgetRemaining: 0, budgetUsedPercent: 0 }
  }

  if (summary.budgetRemaining <= 0) {
    return {
      allowed: false,
      budgetRemaining: 0,
      budgetUsedPercent: 100,
      message: `You've reached your $${summary.budgetCap.toFixed(2)} monthly budget. Upgrade your plan or wait until next month.`,
    }
  }

  // Warn at 80% usage
  if (summary.budgetUsedPercent >= 80) {
    return {
      allowed: true,
      budgetRemaining: summary.budgetRemaining,
      budgetUsedPercent: summary.budgetUsedPercent,
      message: `Warning: You've used ${summary.budgetUsedPercent.toFixed(0)}% of your monthly budget ($${summary.totalCost.toFixed(2)}/$${summary.budgetCap.toFixed(2)})`,
    }
  }

  return {
    allowed: true,
    budgetRemaining: summary.budgetRemaining,
    budgetUsedPercent: summary.budgetUsedPercent,
  }
}

/**
 * Cost of one LLM call in USD. THE pricing entry point for the platform.
 *
 * Every live pricing site reaches this function: the Node AI path
 * (lib/ai-providers.ts), the Edge ingest (/api/internal/usage), and both
 * text-counting helpers below. Its output feeds the per-user budget cap, the
 * global daily kill-switch, cost-anomaly detection and every cost dashboard.
 *
 * It now prices PER DIRECTION via calculateAICost. It used to sum the two token
 * counts and multiply by a single blended (input+output averaged) rate, which is
 * correct only for a call that happens to split 50/50. Real traffic does not:
 * a chat turn carries a large system prompt and history against a short reply,
 * so the blended rate overcharged by 2.4x-3.3x on chat and hints.
 *
 * The blended table is still exported as PROVIDER_COSTS for the admin rate
 * display, where no token split is known. It must never price a call again.
 *
 * An unrecognised provider still prices at the gemini rate (deliberately one of
 * the dearer rows, so an unknown provider over-books rather than under-books and
 * the caps engage sooner) — and still says so at ERROR level. The silent
 * fallback is what let a whole runtime's OpenAI spend be mispriced indefinitely:
 * nothing in the system distinguished "priced correctly" from "priced by
 * accident", so the mistake was invisible in every dashboard that used it.
 */
export function calculateCost(inputTokens: number, outputTokens: number, provider: string): number {
  if (!resolveProviderRate(provider).matched) {
    logger.error("Unknown AI provider has no cost row; billing at the gemini rate", {
      provider,
      fallbackRateProvider: FALLBACK_RATE_PROVIDER,
    })
  }
  return calculateAICost(inputTokens, outputTokens, provider)
}

/**
 * Calculate cost for voice transcription (Deepgram)
 * @param durationSeconds - Duration of audio in seconds
 * @param model - Deepgram model used
 */
export function calculateVoiceCost(
  durationSeconds: number,
  model: keyof typeof DEEPGRAM_COSTS = "nova-3"
): number {
  const costPerMinute = DEEPGRAM_COSTS[model] || DEEPGRAM_COSTS["nova-3"]
  const minutes = durationSeconds / 60
  return minutes * costPerMinute
}

/**
 * Calculate cost for embedding generation using ACCURATE token counting
 * @param text - The text to embed (for accurate token counting)
 * @param model - Embedding model used
 */
export function calculateEmbeddingCost(
  text: string,
  model: keyof typeof EMBEDDING_COSTS = "text-embedding-004"
): { cost: number; tokens: number; isExact: boolean } {
  const costPer1k = EMBEDDING_COSTS[model] || EMBEDDING_COSTS["text-embedding-004"]
  const tokenResult = countTokens(text)
  const cost = (tokenResult.tokens / 1000) * costPer1k
  return { cost, tokens: tokenResult.tokens, isExact: tokenResult.isExact }
}

/**
 * Calculate cost from token count (when tokens are already known)
 */
export function calculateEmbeddingCostFromTokens(
  tokens: number,
  model: keyof typeof EMBEDDING_COSTS = "text-embedding-004"
): number {
  const costPer1k = EMBEDDING_COSTS[model] || EMBEDDING_COSTS["text-embedding-004"]
  return (tokens / 1000) * costPer1k
}

/**
 * Track voice transcription usage
 */
export async function trackVoiceUsage(params: {
  userId: string
  sessionId?: string
  durationSeconds: number
  model?: keyof typeof DEEPGRAM_COSTS
  transcriptLength?: number
}): Promise<void> {
  const { userId, sessionId, durationSeconds, model = "nova-3", transcriptLength } = params
  const cost = calculateVoiceCost(durationSeconds, model)

  await trackUsageEvent({
    userId,
    eventType: "voice_transcription",
    // Voice STT is one product surface; the service is intrinsic to this
    // tracker rather than a caller decision.
    service: "voice-transcription",
    provider: "deepgram",
    model,
    cost,
    sessionId,
    metadata: {
      durationSeconds,
      transcriptLength,
    },
  })
}

/**
 * Track embedding generation usage (legacy - uses character count estimation)
 * @deprecated Use trackEmbeddingUsageAccurate instead
 */
export async function trackEmbeddingUsage(params: {
  userId: string
  service: UsageServiceId
  characterCount: number
  embeddingCount: number
  model: keyof typeof EMBEDDING_COSTS
  provider: "gemini" | "openai"
  latencyMs?: number
}): Promise<void> {
  const { userId, service, characterCount, embeddingCount, model, provider, latencyMs } = params
  // Estimate tokens from character count for backwards compatibility
  const estimatedTokens = Math.ceil(characterCount / 4)
  const cost = calculateEmbeddingCostFromTokens(estimatedTokens, model)

  await trackUsageEvent({
    userId,
    eventType: "embedding_generation",
    service,
    provider,
    model,
    totalTokens: estimatedTokens,
    cost,
    latencyMs,
    isExactTokenCount: false,
    metadata: {
      characterCount,
      embeddingCount,
      estimatedTokens,
    },
  })
}

/**
 * Track embedding generation usage with ACCURATE token counting
 * This is the preferred method for tracking embeddings
 */
export async function trackEmbeddingUsageAccurate(params: {
  userId: string
  service: UsageServiceId
  texts: string[] // The actual texts being embedded
  model: keyof typeof EMBEDDING_COSTS
  provider: "gemini" | "openai" | "tfidf"
  latencyMs?: number
  cached?: boolean
  dimensions?: number
  // Optional: provide token count if already known from API response (OpenAI)
  tokensFromApi?: number
}): Promise<{ totalTokens: number; cost: number }> {
  const {
    userId,
    service,
    texts,
    model,
    provider,
    latencyMs,
    cached = false,
    dimensions,
    tokensFromApi,
  } = params

  let totalTokens: number
  let isExact: boolean

  if (tokensFromApi !== undefined) {
    // Use API-provided token count (most accurate for OpenAI)
    totalTokens = tokensFromApi
    isExact = true
  } else {
    // Count tokens for all texts
    let allExact = true
    totalTokens = 0
    for (const text of texts) {
      const result = countTokens(text)
      totalTokens += result.tokens
      if (!result.isExact) allExact = false
    }
    isExact = allExact
  }

  const cost = calculateEmbeddingCostFromTokens(totalTokens, model)
  const totalCharacters = texts.reduce((sum, t) => sum + t.length, 0)

  await trackUsageEvent({
    userId,
    eventType: "embedding_generation",
    service,
    provider,
    model,
    totalTokens,
    cost,
    latencyMs,
    cached,
    isExactTokenCount: isExact,
    metadata: {
      embeddingCount: texts.length,
      totalCharacters,
      dimensions,
      tokensFromApi: tokensFromApi !== undefined,
    },
  })

  return { totalTokens, cost }
}

/**
 * Get usage stats for admin dashboard
 * OPTIMIZED: Uses collectionGroup query to avoid N+1 reads
 */
export async function getAdminUsageStats(options?: {
  startDate?: Date
  endDate?: Date
  userId?: string
}): Promise<{
  /** Registered accounts, whether or not they spent anything this period. */
  totalUsers: number
  /** Accounts that actually consumed AI this period. The unit-economics denominator. */
  activeUsers: number
  totalCost: number
  totalRequests: number
  coverage: ScanCoverage
  userStats: Array<{
    userId: string
    email: string
    tier: string
    cost: number
    requests: number
    budgetCap: number
    budgetUsedPercent: number
    hasBudgetOverride: boolean
  }>
}> {
  const now = new Date()

  // Fetch all usage summaries for this period in ONE collectionGroup query
  // rather than N individual reads.
  const summariesSnapshot = await adminDb
    .collectionGroup("usage_summaries")
    .where("periodStart", ">=", utcMonthStart(now))
    .limit(USER_SUMMARY_SCAN_LIMIT)
    .get()

  // Build a map of userId -> summary data
  const summaryMap = new Map<string, { totalCost: number; totalRequests: number }>()
  for (const doc of summariesSnapshot.docs) {
    // Path is: users/{userId}/usage_summaries/{periodKey}
    const userId = doc.ref.parent.parent?.id
    if (userId) {
      const data = doc.data()
      summaryMap.set(userId, {
        totalCost: readNumber(data.totalCost),
        totalRequests: readNumber(data.totalRequests),
      })
    }
  }

  // Resolve profiles for the users who actually have usage. This used to read
  // the whole profiles collection (capped at 10k) to label a handful of active
  // accounts, so a large user base paid thousands of document reads per
  // dashboard load to resolve a few dozen emails.
  const activeUserIds = Array.from(summaryMap.keys())
  const profileMap = await fetchProfilesById(activeUserIds)

  // The registered-account total is a count, so ask Firestore for a count
  // rather than paging documents in to measure their length.
  const totalUsers = (await adminDb.collection("profiles").count().get()).data().count

  const userStats: Array<{
    userId: string
    email: string
    tier: string
    cost: number
    requests: number
    budgetCap: number
    budgetUsedPercent: number
    hasBudgetOverride: boolean
  }> = []

  let totalCost = 0
  let totalRequests = 0

  // Combine the data
  for (const [userId, summary] of summaryMap.entries()) {
    const profile = profileMap.get(userId)
    const budgetCap = resolveBudgetCap(profile)

    totalCost += summary.totalCost
    totalRequests += summary.totalRequests

    if (summary.totalCost > 0 || summary.totalRequests > 0) {
      userStats.push({
        userId,
        // The reserved system user carries platform spend that no signed-in
        // user caused (extraction, anonymous retrieval); label it so the admin
        // table doesn't present it as an unidentified account.
        email:
          userId === SYSTEM_USER_ID
            ? "Platform (system)"
            : typeof profile?.email === "string" && profile.email
              ? profile.email
              : "Unknown",
        tier: resolveTier(profile),
        cost: summary.totalCost,
        requests: summary.totalRequests,
        budgetCap,
        budgetUsedPercent: budgetUsedPercent(summary.totalCost, budgetCap),
        hasBudgetOverride: hasBudgetOverride(profile),
      })
    }
  }

  // Sort by cost descending
  userStats.sort((a, b) => b.cost - a.cost)

  return {
    totalUsers,
    activeUsers: userStats.length,
    totalCost,
    totalRequests,
    coverage: describeCoverage(summariesSnapshot.size, USER_SUMMARY_SCAN_LIMIT),
    userStats,
  }
}

/**
 * Which product service a usage_events row belongs to.
 *
 * Rows written since 2026-08-17 carry `service` explicitly. Older rows are
 * derived: session lifecycle rows and the zero-cost chat/hint telemetry rows
 * written by lib/session-metrics.ts (no provider, no cost, not a cache hit)
 * belong to session-telemetry — before this distinction they were counted as
 * LLM requests, inflating every "requests" aggregate 2-3x per chat turn —
 * and everything else maps by eventType. Shapes this function cannot place
 * land in the read-side "unattributed" bucket rather than polluting a real
 * service's numbers.
 */
export function resolveEventService(event: {
  service?: unknown
  eventType?: unknown
  provider?: unknown
  cached?: unknown
  cost?: unknown
}): UsageServiceId | typeof UNATTRIBUTED_SERVICE {
  if (isUsageServiceId(event.service)) {
    return event.service
  }
  const eventType = event.eventType as UsageEventType | undefined
  if (!eventType || !(eventType in LEGACY_EVENT_TYPE_SERVICE)) {
    return UNATTRIBUTED_SERVICE
  }
  if (eventType === "session_start" || eventType === "session_end") {
    return "session-telemetry"
  }
  const isZeroCostTelemetry =
    readNumber(event.cost) === 0 && !event.provider && event.cached !== true
  if (isZeroCostTelemetry && (eventType === "chat_message" || eventType === "hint_request")) {
    return "session-telemetry"
  }
  return LEGACY_EVENT_TYPE_SERVICE[eventType]
}

/**
 * Get usage breakdown by service type for admin dashboard
 */
export async function getServiceBreakdown(): Promise<{
  byService: {
    llm: { requests: number; cost: number; tokens: number }
    voice: { requests: number; cost: number; durationSeconds: number }
    embeddings: { requests: number; cost: number; tokens: number; characterCount: number }
  }
  /** Per product-service totals, keyed by lib/usage/services.ts ids (plus the
   * read-side "unattributed" bucket for unclassifiable legacy rows). */
  byServiceId: Record<string, UsageTotals>
  byProvider: Record<string, UsageTotals>
  coverage: ScanCoverage
}> {
  const now = new Date()

  const result = {
    byService: {
      llm: { requests: 0, cost: 0, tokens: 0 },
      voice: { requests: 0, cost: 0, durationSeconds: 0 },
      embeddings: { requests: 0, cost: 0, tokens: 0, characterCount: 0 },
    },
    byServiceId: {} as Record<string, UsageTotals>,
    byProvider: {} as Record<string, UsageTotals>,
    coverage: describeCoverage(0, USAGE_EVENT_SCAN_LIMIT),
  }

  try {
    // Bounded scan: an unbounded read of usage_events is itself a Firestore
    // cost. `coverage` reports whether the cap was hit, so a partial month is
    // never presented as a complete total.
    const startOfMonth = utcMonthStart(now)
    const eventsSnapshot = await adminDb
      .collection("usage_events")
      .where("createdAt", ">=", startOfMonth)
      .orderBy("createdAt", "desc")
      .limit(USAGE_EVENT_SCAN_LIMIT)
      .get()

    result.coverage = describeCoverage(eventsSnapshot.size, USAGE_EVENT_SCAN_LIMIT)

    for (const doc of eventsSnapshot.docs) {
      const event = doc.data()
      const eventType = event.eventType as UsageEventType
      const cost = readNumber(event.cost)
      const tokens = readNumber(event.totalTokens)
      const service = resolveEventService(event)

      // Every row lands in exactly one product-service bucket, telemetry
      // included — that is what keeps it OUT of the money buckets below.
      if (!result.byServiceId[service]) {
        result.byServiceId[service] = emptyUsageTotals()
      }
      accumulateUsageEvent(result.byServiceId[service], event)

      // Zero-cost session telemetry shares the collection but is not AI
      // activity; counting it here inflated "LLM requests" 2-3x per chat turn
      // and dropped a meaningless "unattributed" row into the provider table.
      if (service === "session-telemetry") {
        continue
      }

      // Aggregate by provider. Cached hits are recorded without a provider (no
      // upstream call was made), so they land in their own bucket rather than
      // being misattributed to whichever provider would have served them.
      const provider =
        typeof event.provider === "string" && event.provider
          ? event.provider
          : event.cached === true
            ? "cache"
            : "unattributed"
      if (!result.byProvider[provider]) {
        result.byProvider[provider] = emptyUsageTotals()
      }
      accumulateUsageEvent(result.byProvider[provider], event)

      // Aggregate by service type
      if (eventType === "voice_transcription") {
        result.byService.voice.requests++
        result.byService.voice.cost += cost
        result.byService.voice.durationSeconds += readNumber(event.metadata?.durationSeconds)
      } else if (eventType === "embedding_generation") {
        result.byService.embeddings.requests++
        result.byService.embeddings.cost += cost
        result.byService.embeddings.tokens += tokens
        result.byService.embeddings.characterCount +=
          readNumber(event.metadata?.totalCharacters) || readNumber(event.metadata?.characterCount)
      } else {
        // LLM events (chat_message, feedback_generation, etc.)
        result.byService.llm.requests++
        result.byService.llm.cost += cost
        result.byService.llm.tokens += tokens
      }
    }
  } catch (error) {
    logger.error("[Usage Tracking] Failed to get service breakdown", { error })
  }

  return result
}

/**
 * Get per-user usage summary for user dashboard
 */
export async function getUserServiceBreakdown(userId: string): Promise<{
  llm: { requests: number; tokens: number; cost: number }
  voice: { requests: number; durationSeconds: number; cost: number }
  embeddings: { requests: number; tokens: number; characterCount: number; cost: number }
  total: { requests: number; tokens: number; cost: number }
}> {
  const summary = await getUserUsageSummary(userId)

  const result = {
    llm: { requests: 0, tokens: 0, cost: 0 },
    voice: { requests: 0, durationSeconds: 0, cost: 0 },
    embeddings: { requests: 0, tokens: 0, characterCount: 0, cost: 0 },
    total: { requests: 0, tokens: 0, cost: 0 },
  }

  if (!summary) {
    return result
  }

  // Get detailed breakdown from usage_events
  try {
    const now = new Date()
    const startOfMonth = utcMonthStart(now)

    // Limit per-user query to prevent abuse or runaway reads
    const eventsSnapshot = await adminDb
      .collection("usage_events")
      .where("userId", "==", userId)
      .where("createdAt", ">=", startOfMonth)
      .limit(5000)
      .get()

    for (const doc of eventsSnapshot.docs) {
      const event = doc.data()
      const eventType = event.eventType as UsageEventType
      const cost = event.cost || 0
      const tokens = event.totalTokens || 0

      // Session telemetry is not AI usage; counting it made the user-facing
      // request totals overstate actual AI activity.
      if (resolveEventService(event) === "session-telemetry") {
        continue
      }

      result.total.requests++
      result.total.cost += cost
      result.total.tokens += tokens

      if (eventType === "voice_transcription") {
        result.voice.requests++
        result.voice.cost += cost
        result.voice.durationSeconds += event.metadata?.durationSeconds || 0
      } else if (eventType === "embedding_generation") {
        result.embeddings.requests++
        result.embeddings.cost += cost
        result.embeddings.tokens += tokens
        result.embeddings.characterCount +=
          event.metadata?.totalCharacters || event.metadata?.characterCount || 0
      } else {
        result.llm.requests++
        result.llm.cost += cost
        result.llm.tokens += tokens
      }
    }
  } catch (error) {
    console.error("[Usage Tracking] Failed to get user service breakdown:", error)
    // Fall back to summary data
    result.llm.tokens = summary.totalTokens
    result.total.requests = summary.totalRequests
    result.total.cost = summary.totalCost
    result.total.tokens = summary.totalTokens
  }

  return result
}

/**
 * Log activity for future integrations (RAG, analytics, etc.)
 */
export async function logUserActivity(
  userId: string,
  activity: {
    type: string
    action: string
    context?: Record<string, any>
    sessionId?: string
  }
): Promise<void> {
  try {
    await adminDb.collection("user_activities").add({
      userId,
      ...activity,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error("[Activity Log] Failed to log activity:", error)
  }
}

// =============================================================================
// GRANULAR USAGE TRACKING - BY PATTERN, SCENARIO, DIFFICULTY
// =============================================================================

export interface PatternUsage {
  pattern: string
  requests: number
  tokens: number
  cost: number
  scenarios: string[]
}

export interface ScenarioUsage {
  scenarioId: string
  scenarioTitle: string
  pattern: string
  difficulty: string
  requests: number
  tokens: number
  cost: number
  avgTokensPerRequest: number
}

export interface GranularUsageBreakdown {
  byPattern: Record<string, PatternUsage>
  byDifficulty: Record<string, UsageTotals>
  byScenario: ScenarioUsage[]
  topCostlyScenarios: ScenarioUsage[]
  topTokenScenarios: ScenarioUsage[]
  coverage: ScanCoverage
}

/**
 * Get granular usage breakdown by pattern and scenario
 * This powers the detailed AI Usage admin dashboard
 */
export async function getGranularUsageBreakdown(options?: {
  userId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<GranularUsageBreakdown> {
  const now = new Date()
  const startOfMonth = options?.startDate || utcMonthStart(now)
  const limit = options?.limit || 50

  const result: GranularUsageBreakdown = {
    byPattern: {},
    byDifficulty: {},
    byScenario: [],
    topCostlyScenarios: [],
    topTokenScenarios: [],
    coverage: describeCoverage(0, USAGE_EVENT_SCAN_LIMIT),
  }

  try {
    let query = adminDb
      .collection("usage_events")
      .where("createdAt", ">=", startOfMonth)
      .orderBy("createdAt", "desc")

    if (options?.userId) {
      query = query.where("userId", "==", options.userId)
    }

    const eventsSnapshot = await query.limit(USAGE_EVENT_SCAN_LIMIT).get()
    result.coverage = describeCoverage(eventsSnapshot.size, USAGE_EVENT_SCAN_LIMIT)

    // Aggregate by pattern, difficulty, and scenario
    const scenarioMap = new Map<string, ScenarioUsage>()

    for (const doc of eventsSnapshot.docs) {
      const event = doc.data()
      // This is an AI-cost dashboard; zero-cost session telemetry would add
      // phantom "unknown"-pattern request rows to every aggregate.
      if (resolveEventService(event) === "session-telemetry") {
        continue
      }
      const pattern = event.pattern || event.metadata?.pattern || "unknown"
      const difficulty = event.difficulty || event.metadata?.difficulty || "unknown"
      const scenarioId = event.scenarioId || "unknown"
      const scenarioTitle = event.scenarioTitle || event.metadata?.scenarioTitle || scenarioId

      // Aggregate by pattern
      if (!result.byPattern[pattern]) {
        result.byPattern[pattern] = {
          pattern,
          ...emptyUsageTotals(),
          scenarios: [],
        }
      }
      accumulateUsageEvent(result.byPattern[pattern], event)
      if (scenarioId !== "unknown" && !result.byPattern[pattern].scenarios.includes(scenarioId)) {
        result.byPattern[pattern].scenarios.push(scenarioId)
      }

      // Aggregate by difficulty
      if (!result.byDifficulty[difficulty]) {
        result.byDifficulty[difficulty] = emptyUsageTotals()
      }
      accumulateUsageEvent(result.byDifficulty[difficulty], event)

      // Aggregate by scenario
      const key = scenarioId
      if (!scenarioMap.has(key)) {
        scenarioMap.set(key, {
          scenarioId,
          scenarioTitle,
          pattern,
          difficulty,
          ...emptyUsageTotals(),
          avgTokensPerRequest: 0,
        })
      }
      accumulateUsageEvent(scenarioMap.get(key)!, event)
    }

    // Convert scenario map to array and calculate averages
    result.byScenario = Array.from(scenarioMap.values()).map((s) => ({
      ...s,
      avgTokensPerRequest: averageTokensPerRequest(s),
    }))

    // Get top costly scenarios
    result.topCostlyScenarios = [...result.byScenario]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit)

    // Get top token-heavy scenarios
    result.topTokenScenarios = [...result.byScenario]
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, limit)
  } catch (error) {
    console.error("[Usage Tracking] Failed to get granular breakdown:", error)
  }

  return result
}

/**
 * Get per-session usage breakdown
 */
export async function getSessionUsageBreakdown(sessionId: string): Promise<{
  totalTokens: number
  totalCost: number
  events: Array<{
    eventType: string
    tokens: number
    cost: number
    provider: string
    timestamp: Date
  }>
}> {
  const result = {
    totalTokens: 0,
    totalCost: 0,
    events: [] as Array<{
      eventType: string
      tokens: number
      cost: number
      provider: string
      timestamp: Date
    }>,
  }

  try {
    // Session events are bounded by session duration, but add limit as safety net
    const eventsSnapshot = await adminDb
      .collection("usage_events")
      .where("sessionId", "==", sessionId)
      .orderBy("createdAt", "asc")
      .limit(1000)
      .get()

    for (const doc of eventsSnapshot.docs) {
      const event = doc.data()
      const tokens = readNumber(event.totalTokens)
      const cost = readNumber(event.cost)

      result.totalTokens += tokens
      result.totalCost += cost
      result.events.push({
        eventType: event.eventType,
        tokens,
        cost,
        provider: event.provider || (event.cached === true ? "cache" : "unattributed"),
        timestamp: event.createdAt?.toDate() || new Date(),
      })
    }
  } catch (error) {
    logger.error("[Usage Tracking] Failed to get session breakdown", { error })
  }

  return result
}

/**
 * Get daily usage trends for the admin dashboard
 */
export async function getDailyUsageTrends(days: number = 30): Promise<{
  daily: Array<{
    date: string
    requests: number
    tokens: number
    cost: number
    uniqueUsers: number
  }>
  totals: { requests: number; tokens: number; cost: number; uniqueUsers: number }
  coverage: ScanCoverage
}> {
  // UTC midnight, matching every other money boundary in this module — the
  // per-day keys below come from toISOString(), so a local-time cutoff would
  // truncate the first day of the range on any non-UTC process.
  const rangeAnchor = new Date(Date.now() - days * 86_400_000)
  const startDate = new Date(
    Date.UTC(rangeAnchor.getUTCFullYear(), rangeAnchor.getUTCMonth(), rangeAnchor.getUTCDate())
  )

  const result = {
    daily: [] as Array<{
      date: string
      requests: number
      tokens: number
      cost: number
      uniqueUsers: number
    }>,
    totals: { requests: 0, tokens: 0, cost: 0, uniqueUsers: 0 },
    coverage: describeCoverage(0, USAGE_EVENT_SCAN_LIMIT),
  }

  try {
    // Bounded scan. Because the order is newest-first, hitting the cap drops
    // the OLDEST days in the range, which would silently flatten the left edge
    // of the trend chart; `coverage.truncated` is how the caller knows.
    const eventsSnapshot = await adminDb
      .collection("usage_events")
      .where("createdAt", ">=", startDate)
      .orderBy("createdAt", "desc")
      .limit(USAGE_EVENT_SCAN_LIMIT)
      .get()

    result.coverage = describeCoverage(eventsSnapshot.size, USAGE_EVENT_SCAN_LIMIT)

    const dailyMap = new Map<string, UsageTotals & { users: Set<string> }>()

    const allUsers = new Set<string>()

    for (const doc of eventsSnapshot.docs) {
      const event = doc.data()
      // AI usage trends: session telemetry has no cost or tokens and would
      // only inflate the per-day request counts.
      if (resolveEventService(event) === "session-telemetry") {
        continue
      }
      const date = event.createdAt?.toDate()?.toISOString().split("T")[0] || "unknown"
      const userId = event.userId

      let day = dailyMap.get(date)
      if (!day) {
        day = { ...emptyUsageTotals(), users: new Set<string>() }
        dailyMap.set(date, day)
      }

      accumulateUsageEvent(day, event)
      accumulateUsageEvent(result.totals, event)

      // Anonymous and internal calls carry no userId; counting undefined once
      // per day would inflate the unique-user count by one on every day that
      // had any untracked-caller traffic.
      if (typeof userId === "string" && userId) {
        day.users.add(userId)
        allUsers.add(userId)
      }
    }

    result.totals.uniqueUsers = allUsers.size

    // Convert to array sorted by date
    result.daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        requests: data.requests,
        tokens: data.tokens,
        cost: data.cost,
        uniqueUsers: data.users.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    console.error("[Usage Tracking] Failed to get daily trends:", error)
  }

  return result
}

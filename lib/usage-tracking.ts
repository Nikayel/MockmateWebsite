/**
 * Usage Tracking System
 *
 * Tracks all AI API calls, tokens, and costs per user.
 * Uses Firebase Firestore for persistence.
 *
 * Cost caps:
 * - Free tier: $0 (limited sessions)
 * - Pro tier: $25/month budget cap
 * - Enterprise: $100/month budget cap
 */

import { adminDb } from './firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

// Cost per 1K tokens for each provider (input + output averaged) - Dec 2025
export const PROVIDER_COSTS = {
  gemini: 0.000188,         // Gemini 2.5 Flash: $0.075 in + $0.30 out per 1M
  'gemini-pro': 0.003125,   // Gemini 2.5 Pro: $1.25 in + $5.00 out per 1M
  deepseek: 0.00021,        // Deepseek: $0.14 in + $0.28 out per 1M
  claude: 0.0024,           // Claude 3.5 Haiku: $0.80 in + $4.00 out per 1M
  'claude-sonnet': 0.009,   // Claude Sonnet 4: $3 in + $15 out per 1M
  'gpt-4o': 0.00625,        // GPT-4o: $2.50 in + $10 out per 1M
  'gpt-4o-mini': 0.000375,  // GPT-4o mini: $0.15 in + $0.60 out per 1M
} as const

// Deepgram voice costs (per minute of audio)
export const DEEPGRAM_COSTS = {
  'nova-2': 0.0043,         // Nova-2: $0.0043/min (Pay As You Go)
  'nova': 0.0041,           // Nova: $0.0041/min
  'enhanced': 0.0145,       // Enhanced: $0.0145/min
  'base': 0.0125,           // Base: $0.0125/min
} as const

// Embedding costs per 1K tokens
export const EMBEDDING_COSTS = {
  'text-embedding-004': 0.000025,        // Gemini: Free tier generous, ~$0.025/1M chars
  'text-embedding-3-small': 0.00002,     // OpenAI: $0.02/1M tokens
  'text-embedding-3-large': 0.00013,     // OpenAI: $0.13/1M tokens
  'text-embedding-ada-002': 0.0001,      // OpenAI: $0.10/1M tokens (legacy)
} as const

// Budget caps per subscription tier (per billing cycle)
export const BUDGET_CAPS = {
  free: 0.50,        // $0.50 - enough for ~50 sessions with Gemini
  pro: 25.00,        // $25/month
  enterprise: 100.00, // $100/month
} as const

export type UsageEventType =
  | 'chat_message'
  | 'feedback_generation'
  | 'code_execution'
  | 'hint_request'
  | 'session_start'
  | 'session_end'
  | 'voice_transcription'   // Deepgram STT
  | 'embedding_generation'  // RAG embeddings

export interface UsageEvent {
  id?: string
  userId: string
  eventType: UsageEventType
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
 * Track a usage event
 */
export async function trackUsageEvent(event: Omit<UsageEvent, 'id' | 'createdAt'>): Promise<void> {
  try {
    const usageRef = adminDb.collection('usage_events')

    await usageRef.add({
      ...event,
      createdAt: FieldValue.serverTimestamp(),
    })

    // Also update the user's aggregate usage for the current period
    await updateUserAggregateUsage(event)
  } catch (error) {
    console.error('[Usage Tracking] Failed to track event:', error)
    // Don't throw - usage tracking failures shouldn't break the app
  }
}

/**
 * Update user's aggregate usage for the current billing period
 */
async function updateUserAggregateUsage(event: Omit<UsageEvent, 'id' | 'createdAt'>): Promise<void> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const usageSummaryRef = adminDb
    .collection('users')
    .doc(event.userId)
    .collection('usage_summaries')
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
        cacheHits: FieldValue.increment(event.cached ? 1 : 0),
        cacheMisses: FieldValue.increment(event.cached ? 0 : 1),
        totalLatencyMs: FieldValue.increment(event.latencyMs || 0),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  })
}

/**
 * Get user's usage summary for the current period
 */
export async function getUserUsageSummary(userId: string): Promise<UserUsageSummary | null> {
  try {
    const now = new Date()
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Get usage summary
    const summaryDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('usage_summaries')
      .doc(periodKey)
      .get()

    // Get user's subscription tier for budget cap
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const tier = (userDoc.data()?.subscription_tier || 'free') as keyof typeof BUDGET_CAPS
    const budgetCap = BUDGET_CAPS[tier] || BUDGET_CAPS.free

    if (!summaryDoc.exists) {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

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
      budgetUsedPercent: (totalCost / budgetCap) * 100,
    }
  } catch (error) {
    console.error('[Usage Tracking] Failed to get user summary:', error)
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
 * Calculate cost from token counts (for LLM providers)
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  provider: string
): number {
  const costPer1k = PROVIDER_COSTS[provider as keyof typeof PROVIDER_COSTS] || PROVIDER_COSTS.gemini
  const totalTokens = inputTokens + outputTokens
  return (totalTokens / 1000) * costPer1k
}

/**
 * Calculate cost for voice transcription (Deepgram)
 * @param durationSeconds - Duration of audio in seconds
 * @param model - Deepgram model used
 */
export function calculateVoiceCost(
  durationSeconds: number,
  model: keyof typeof DEEPGRAM_COSTS = 'nova-2'
): number {
  const costPerMinute = DEEPGRAM_COSTS[model] || DEEPGRAM_COSTS['nova-2']
  const minutes = durationSeconds / 60
  return minutes * costPerMinute
}

/**
 * Calculate cost for embedding generation
 * @param characterCount - Number of characters in the text
 * @param model - Embedding model used
 */
export function calculateEmbeddingCost(
  characterCount: number,
  model: keyof typeof EMBEDDING_COSTS = 'text-embedding-004'
): number {
  const costPer1k = EMBEDDING_COSTS[model] || EMBEDDING_COSTS['text-embedding-004']
  // Rough estimate: ~4 characters per token
  const estimatedTokens = characterCount / 4
  return (estimatedTokens / 1000) * costPer1k
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
  const { userId, sessionId, durationSeconds, model = 'nova-2', transcriptLength } = params
  const cost = calculateVoiceCost(durationSeconds, model)

  await trackUsageEvent({
    userId,
    eventType: 'voice_transcription',
    provider: 'deepgram',
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
 * Track embedding generation usage
 */
export async function trackEmbeddingUsage(params: {
  userId: string
  characterCount: number
  embeddingCount: number
  model: keyof typeof EMBEDDING_COSTS
  provider: 'gemini' | 'openai'
  latencyMs?: number
}): Promise<void> {
  const { userId, characterCount, embeddingCount, model, provider, latencyMs } = params
  const cost = calculateEmbeddingCost(characterCount, model)

  await trackUsageEvent({
    userId,
    eventType: 'embedding_generation',
    provider,
    model,
    cost,
    latencyMs,
    metadata: {
      characterCount,
      embeddingCount,
    },
  })
}

/**
 * Get usage stats for admin dashboard
 */
export async function getAdminUsageStats(options?: {
  startDate?: Date
  endDate?: Date
  userId?: string
}): Promise<{
  totalUsers: number
  totalCost: number
  totalRequests: number
  userStats: Array<{
    userId: string
    email: string
    tier: string
    cost: number
    requests: number
    budgetUsedPercent: number
  }>
}> {
  const now = new Date()
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Get all users with their usage summaries
  const usersSnapshot = await adminDb.collection('users').get()

  const userStats: Array<{
    userId: string
    email: string
    tier: string
    cost: number
    requests: number
    budgetUsedPercent: number
  }> = []

  let totalCost = 0
  let totalRequests = 0

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data()
    const tier = userData.subscription_tier || 'free'
    const budgetCap = BUDGET_CAPS[tier as keyof typeof BUDGET_CAPS] || BUDGET_CAPS.free

    // Get usage summary for this user
    const summaryDoc = await adminDb
      .collection('users')
      .doc(userDoc.id)
      .collection('usage_summaries')
      .doc(periodKey)
      .get()

    const summaryData = summaryDoc.data() || {}
    const cost = summaryData.totalCost || 0
    const requests = summaryData.totalRequests || 0

    totalCost += cost
    totalRequests += requests

    if (cost > 0 || requests > 0) {
      userStats.push({
        userId: userDoc.id,
        email: userData.email || 'Unknown',
        tier,
        cost,
        requests,
        budgetUsedPercent: (cost / budgetCap) * 100,
      })
    }
  }

  // Sort by cost descending
  userStats.sort((a, b) => b.cost - a.cost)

  return {
    totalUsers: usersSnapshot.size,
    totalCost,
    totalRequests,
    userStats,
  }
}

/**
 * Get usage breakdown by service type for admin dashboard
 */
export async function getServiceBreakdown(): Promise<{
  byService: {
    llm: { requests: number; cost: number; tokens: number }
    voice: { requests: number; cost: number; durationSeconds: number }
    embeddings: { requests: number; cost: number; characterCount: number }
  }
  byProvider: Record<string, { requests: number; cost: number }>
}> {
  const now = new Date()
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const result = {
    byService: {
      llm: { requests: 0, cost: 0, tokens: 0 },
      voice: { requests: 0, cost: 0, durationSeconds: 0 },
      embeddings: { requests: 0, cost: 0, characterCount: 0 },
    },
    byProvider: {} as Record<string, { requests: number; cost: number }>,
  }

  try {
    // Query usage_events for current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const eventsSnapshot = await adminDb
      .collection('usage_events')
      .where('createdAt', '>=', startOfMonth)
      .get()

    for (const doc of eventsSnapshot.docs) {
      const event = doc.data()
      const eventType = event.eventType as UsageEventType
      const cost = event.cost || 0
      const provider = event.provider || 'unknown'

      // Aggregate by provider
      if (!result.byProvider[provider]) {
        result.byProvider[provider] = { requests: 0, cost: 0 }
      }
      result.byProvider[provider].requests++
      result.byProvider[provider].cost += cost

      // Aggregate by service type
      if (eventType === 'voice_transcription') {
        result.byService.voice.requests++
        result.byService.voice.cost += cost
        result.byService.voice.durationSeconds += event.metadata?.durationSeconds || 0
      } else if (eventType === 'embedding_generation') {
        result.byService.embeddings.requests++
        result.byService.embeddings.cost += cost
        result.byService.embeddings.characterCount += event.metadata?.characterCount || 0
      } else {
        // LLM events (chat_message, feedback_generation, etc.)
        result.byService.llm.requests++
        result.byService.llm.cost += cost
        result.byService.llm.tokens += event.totalTokens || 0
      }
    }
  } catch (error) {
    console.error('[Usage Tracking] Failed to get service breakdown:', error)
  }

  return result
}

/**
 * Get per-user usage summary for user dashboard
 */
export async function getUserServiceBreakdown(userId: string): Promise<{
  llm: { requests: number; tokens: number; cost: number }
  voice: { requests: number; durationSeconds: number; cost: number }
  embeddings: { requests: number; characterCount: number; cost: number }
  total: { requests: number; cost: number }
}> {
  const summary = await getUserUsageSummary(userId)

  const result = {
    llm: { requests: 0, tokens: 0, cost: 0 },
    voice: { requests: 0, durationSeconds: 0, cost: 0 },
    embeddings: { requests: 0, characterCount: 0, cost: 0 },
    total: { requests: 0, cost: 0 },
  }

  if (!summary) {
    return result
  }

  // Get detailed breakdown from usage_events
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const eventsSnapshot = await adminDb
      .collection('usage_events')
      .where('userId', '==', userId)
      .where('createdAt', '>=', startOfMonth)
      .get()

    for (const doc of eventsSnapshot.docs) {
      const event = doc.data()
      const eventType = event.eventType as UsageEventType
      const cost = event.cost || 0

      result.total.requests++
      result.total.cost += cost

      if (eventType === 'voice_transcription') {
        result.voice.requests++
        result.voice.cost += cost
        result.voice.durationSeconds += event.metadata?.durationSeconds || 0
      } else if (eventType === 'embedding_generation') {
        result.embeddings.requests++
        result.embeddings.cost += cost
        result.embeddings.characterCount += event.metadata?.characterCount || 0
      } else {
        result.llm.requests++
        result.llm.cost += cost
        result.llm.tokens += event.totalTokens || 0
      }
    }
  } catch (error) {
    console.error('[Usage Tracking] Failed to get user service breakdown:', error)
    // Fall back to summary data
    result.llm.tokens = summary.totalTokens
    result.total.requests = summary.totalRequests
    result.total.cost = summary.totalCost
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
    await adminDb.collection('user_activities').add({
      userId,
      ...activity,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('[Activity Log] Failed to log activity:', error)
  }
}

/**
 * AI Response Cache
 *
 * Caches AI responses to reduce API costs and improve latency.
 * Uses a combination of in-memory cache (fast) and Firestore (persistent).
 *
 * Cache strategy:
 * - Semantic similarity: Hash the core request elements
 * - TTL: 24 hours for chat, 7 days for feedback
 * - Max entries: 1000 in-memory, unlimited in Firestore
 */

import crypto from 'crypto'
import { adminDb } from './firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

// Cache configuration
const CACHE_CONFIG = {
  // In-memory cache limits
  maxMemoryEntries: 1000,
  memoryTTLMs: 30 * 60 * 1000, // 30 minutes in memory

  // Firestore cache TTLs (in seconds)
  ttlByType: {
    chat: 24 * 60 * 60,           // 24 hours
    feedback: 7 * 24 * 60 * 60,   // 7 days
    hint: 7 * 24 * 60 * 60,       // 7 days
    system: 30 * 24 * 60 * 60,    // 30 days for system prompts
  } as Record<string, number>,

  // Default TTL
  defaultTTLSeconds: 24 * 60 * 60,
}

// In-memory cache (LRU-style)
interface MemoryCacheEntry {
  response: string
  createdAt: number
  hitCount: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()

/**
 * Generate a cache key from request parameters
 * Uses a hash of the semantic content, not exact string match
 */
export function generateCacheKey(params: {
  type: string
  systemPrompt?: string
  userMessage: string
  context?: string
  scenarioId?: string
  language?: string
}): string {
  // Normalize and extract key elements
  const normalized = {
    type: params.type,
    // For system prompts, use first 500 chars (they're usually stable)
    systemPromptPrefix: params.systemPrompt?.slice(0, 500) || '',
    // Normalize user message (trim, lowercase for comparison)
    userMessageNorm: params.userMessage.trim().toLowerCase().slice(0, 1000),
    // Include context summary if present
    contextHash: params.context ? hashString(params.context.slice(0, 2000)) : '',
    scenarioId: params.scenarioId || '',
    language: params.language || '',
  }

  const keyString = JSON.stringify(normalized)
  return hashString(keyString)
}

/**
 * Hash a string using SHA-256
 */
function hashString(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 32)
}

/**
 * Get cached response (memory first, then Firestore)
 */
export async function getCachedResponse(cacheKey: string): Promise<{
  hit: boolean
  response?: string
  source?: 'memory' | 'firestore'
}> {
  // Check memory cache first
  const memoryEntry = memoryCache.get(cacheKey)
  if (memoryEntry) {
    const age = Date.now() - memoryEntry.createdAt
    if (age < CACHE_CONFIG.memoryTTLMs) {
      memoryEntry.hitCount++
      return { hit: true, response: memoryEntry.response, source: 'memory' }
    } else {
      // Expired, remove from memory
      memoryCache.delete(cacheKey)
    }
  }

  // Check Firestore cache
  try {
    const cacheDoc = await adminDb.collection('ai_cache').doc(cacheKey).get()

    if (cacheDoc.exists) {
      const data = cacheDoc.data()!
      const expiresAt = data.expiresAt?.toDate()

      if (expiresAt && expiresAt > new Date()) {
        // Valid cache entry - also store in memory for faster subsequent access
        const response = data.response as string
        memoryCache.set(cacheKey, {
          response,
          createdAt: Date.now(),
          hitCount: 1,
        })
        pruneMemoryCache()

        // Update hit count in Firestore (fire and forget)
        adminDb.collection('ai_cache').doc(cacheKey).update({
          hitCount: FieldValue.increment(1),
          lastAccessedAt: FieldValue.serverTimestamp(),
        }).catch(() => {})

        return { hit: true, response, source: 'firestore' }
      } else {
        // Expired, delete from Firestore (fire and forget)
        adminDb.collection('ai_cache').doc(cacheKey).delete().catch(() => {})
      }
    }
  } catch (error) {
    console.error('[AI Cache] Firestore read error:', error)
  }

  return { hit: false }
}

/**
 * Store response in cache
 */
export async function setCachedResponse(
  cacheKey: string,
  response: string,
  type: string = 'chat'
): Promise<void> {
  const ttlSeconds = CACHE_CONFIG.ttlByType[type] || CACHE_CONFIG.defaultTTLSeconds
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

  // Store in memory
  memoryCache.set(cacheKey, {
    response,
    createdAt: Date.now(),
    hitCount: 0,
  })
  pruneMemoryCache()

  // Store in Firestore (fire and forget)
  try {
    await adminDb.collection('ai_cache').doc(cacheKey).set({
      response,
      type,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      hitCount: 0,
      lastAccessedAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('[AI Cache] Firestore write error:', error)
  }
}

/**
 * Prune memory cache if it exceeds max entries
 * Uses LRU-style eviction based on hit count
 */
function pruneMemoryCache(): void {
  if (memoryCache.size <= CACHE_CONFIG.maxMemoryEntries) return

  // Convert to array and sort by hit count (ascending)
  const entries = Array.from(memoryCache.entries())
    .sort((a, b) => a[1].hitCount - b[1].hitCount)

  // Remove least used entries until under limit
  const toRemove = memoryCache.size - CACHE_CONFIG.maxMemoryEntries + 100 // Remove 100 extra
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    memoryCache.delete(entries[i][0])
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  memoryCacheSize: number
  memoryHits: number
} {
  let totalHits = 0
  for (const entry of memoryCache.values()) {
    totalHits += entry.hitCount
  }

  return {
    memoryCacheSize: memoryCache.size,
    memoryHits: totalHits,
  }
}

/**
 * Clear all caches (for testing or maintenance)
 */
export async function clearCache(options?: { memoryOnly?: boolean }): Promise<void> {
  memoryCache.clear()

  if (!options?.memoryOnly) {
    // Delete expired Firestore entries (batch delete)
    try {
      const expiredDocs = await adminDb
        .collection('ai_cache')
        .where('expiresAt', '<', Timestamp.now())
        .limit(500)
        .get()

      const batch = adminDb.batch()
      expiredDocs.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()

      console.log(`[AI Cache] Cleaned ${expiredDocs.size} expired entries`)
    } catch (error) {
      console.error('[AI Cache] Failed to clean expired entries:', error)
    }
  }
}

/**
 * Wrapper for AI calls with caching
 */
export async function withCache<T>(
  cacheKey: string,
  type: string,
  fetchFn: () => Promise<T>,
  options?: {
    skipCache?: boolean
    forceRefresh?: boolean
  }
): Promise<{ result: T; cached: boolean }> {
  if (options?.skipCache) {
    const result = await fetchFn()
    return { result, cached: false }
  }

  if (!options?.forceRefresh) {
    const cached = await getCachedResponse(cacheKey)
    if (cached.hit && cached.response) {
      return { result: cached.response as T, cached: true }
    }
  }

  const result = await fetchFn()

  // Cache the result if it's a string (most AI responses)
  if (typeof result === 'string') {
    await setCachedResponse(cacheKey, result, type)
  }

  return { result, cached: false }
}

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

import crypto from "crypto"
import { adminDb } from "./firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

// Cache configuration
const CACHE_CONFIG = {
  // In-memory cache limits
  maxMemoryEntries: 1000,
  memoryTTLMs: 30 * 60 * 1000, // 30 minutes in memory

  // Firestore cache TTLs (in seconds)
  ttlByType: {
    chat: 24 * 60 * 60, // 24 hours
    feedback: 7 * 24 * 60 * 60, // 7 days
    hint: 7 * 24 * 60 * 60, // 7 days
    system: 30 * 24 * 60 * 60, // 30 days for system prompts
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

// Negative cache: track keys that don't exist to avoid repeated Firestore reads
// This saves Firestore costs by not querying for keys we recently checked
interface NegativeCacheEntry {
  checkedAt: number
}

const negativeCache = new Map<string, NegativeCacheEntry>()
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes - don't re-check Firestore for misses
const MAX_NEGATIVE_CACHE_SIZE = 5000 // Limit memory usage

/**
 * Generate a cache key from request parameters
 * Uses a hash of the FULL semantic content to prevent collisions
 */
export function generateCacheKey(params: {
  type: string
  systemPrompt?: string
  userMessage: string
  context?: string
  scenarioId?: string
  language?: string
}): string {
  // SECURITY FIX: Hash FULL content instead of truncating
  // Truncation caused cache key collisions when prompts shared prefixes
  const normalized = {
    type: params.type,
    // Hash the FULL system prompt to prevent collision on shared prefixes
    systemPromptHash: params.systemPrompt ? hashString(params.systemPrompt) : "",
    // Hash the FULL user message (normalize first)
    userMessageHash: hashString(params.userMessage.trim().toLowerCase()),
    // Hash context if present
    contextHash: params.context ? hashString(params.context) : "",
    scenarioId: params.scenarioId || "",
    language: params.language || "",
  }

  const keyString = JSON.stringify(normalized)
  return hashString(keyString)
}

/**
 * Hash a string using SHA-256
 */
function hashString(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 32)
}

/**
 * Get cached response (memory first, then Firestore)
 * Uses negative caching to avoid repeated Firestore reads for missing keys
 */
export async function getCachedResponse(cacheKey: string): Promise<{
  hit: boolean
  response?: string
  source?: "memory" | "firestore"
}> {
  // Check memory cache first
  const memoryEntry = memoryCache.get(cacheKey)
  if (memoryEntry) {
    const age = Date.now() - memoryEntry.createdAt
    if (age < CACHE_CONFIG.memoryTTLMs) {
      memoryEntry.hitCount++
      return { hit: true, response: memoryEntry.response, source: "memory" }
    } else {
      // Expired, remove from memory
      memoryCache.delete(cacheKey)
    }
  }

  // Check negative cache - if we recently checked and it wasn't there, skip Firestore
  const negativeEntry = negativeCache.get(cacheKey)
  if (negativeEntry) {
    const age = Date.now() - negativeEntry.checkedAt
    if (age < NEGATIVE_CACHE_TTL_MS) {
      // Recently checked and it wasn't there - skip Firestore read (saves cost!)
      return { hit: false }
    } else {
      // Expired negative cache entry
      negativeCache.delete(cacheKey)
    }
  }

  // Check Firestore cache
  try {
    const cacheDoc = await adminDb.collection("ai_cache").doc(cacheKey).get()

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

        // Remove from negative cache if it was there
        negativeCache.delete(cacheKey)

        // Update hit count in Firestore (fire and forget)
        adminDb
          .collection("ai_cache")
          .doc(cacheKey)
          .update({
            hitCount: FieldValue.increment(1),
            lastAccessedAt: FieldValue.serverTimestamp(),
          })
          .catch(() => {})

        return { hit: true, response, source: "firestore" }
      } else {
        // Expired, delete from Firestore (fire and forget)
        adminDb
          .collection("ai_cache")
          .doc(cacheKey)
          .delete()
          .catch(() => {})
      }
    }

    // Cache miss - add to negative cache to avoid re-checking Firestore
    addToNegativeCache(cacheKey)
  } catch (error) {
    console.error("[AI Cache] Firestore read error:", error)
  }

  return { hit: false }
}

/**
 * Add a key to the negative cache (tracks cache misses)
 */
function addToNegativeCache(cacheKey: string): void {
  // Prune if over limit
  if (negativeCache.size >= MAX_NEGATIVE_CACHE_SIZE) {
    // Remove oldest 500 entries
    const entries = Array.from(negativeCache.entries()).sort(
      (a, b) => a[1].checkedAt - b[1].checkedAt
    )

    for (let i = 0; i < 500 && i < entries.length; i++) {
      negativeCache.delete(entries[i][0])
    }
  }

  negativeCache.set(cacheKey, { checkedAt: Date.now() })
}

/**
 * Store response in cache
 */
export async function setCachedResponse(
  cacheKey: string,
  response: string,
  type: string = "chat"
): Promise<void> {
  const ttlSeconds = CACHE_CONFIG.ttlByType[type] || CACHE_CONFIG.defaultTTLSeconds
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

  // Remove from negative cache since we're storing a value now
  negativeCache.delete(cacheKey)

  // Store in memory
  memoryCache.set(cacheKey, {
    response,
    createdAt: Date.now(),
    hitCount: 0,
  })
  pruneMemoryCache()

  // Store in Firestore (fire and forget)
  try {
    await adminDb
      .collection("ai_cache")
      .doc(cacheKey)
      .set({
        response,
        type,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        hitCount: 0,
        lastAccessedAt: FieldValue.serverTimestamp(),
      })
  } catch (error) {
    console.error("[AI Cache] Firestore write error:", error)
  }
}

/**
 * Prune memory cache if it exceeds max entries
 * Uses LRU-style eviction based on hit count
 */
function pruneMemoryCache(): void {
  if (memoryCache.size <= CACHE_CONFIG.maxMemoryEntries) return

  // Convert to array and sort by hit count (ascending)
  const entries = Array.from(memoryCache.entries()).sort((a, b) => a[1].hitCount - b[1].hitCount)

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
  negativeCacheSize: number
  negativeCacheSavings: string
} {
  let totalHits = 0
  for (const entry of memoryCache.values()) {
    totalHits += entry.hitCount
  }

  return {
    memoryCacheSize: memoryCache.size,
    memoryHits: totalHits,
    negativeCacheSize: negativeCache.size,
    // Each entry in negative cache = 1 avoided Firestore read
    negativeCacheSavings: `~${negativeCache.size} Firestore reads avoided`,
  }
}

/**
 * Clear all caches (for testing or maintenance)
 */
export async function clearCache(options?: { memoryOnly?: boolean }): Promise<void> {
  memoryCache.clear()
  negativeCache.clear()

  if (!options?.memoryOnly) {
    // Delete expired Firestore entries (batch delete)
    try {
      const expiredDocs = await adminDb
        .collection("ai_cache")
        .where("expiresAt", "<", Timestamp.now())
        .limit(500)
        .get()

      const batch = adminDb.batch()
      expiredDocs.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()

      console.log(`[AI Cache] Cleaned ${expiredDocs.size} expired entries`)
    } catch (error) {
      console.error("[AI Cache] Failed to clean expired entries:", error)
    }
  }
}
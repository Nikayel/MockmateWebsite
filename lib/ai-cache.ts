/**
 * AI Response Cache (in-memory only)
 *
 * Dedupes identical AI requests on a warm serverless instance: double-clicked
 * feedback generation, repeated hint requests against unchanged code, retried
 * calls. Exact-match on a hash of the full request.
 *
 * This module used to mirror every entry into a Firestore `ai_cache` collection
 * as a "persistent" tier. Measured over its whole life (2,517 entries), only 41
 * entries were ever hit — 81 hits total — because an exact hash over prompt +
 * full history almost never recurs across instances, while 90% of the stored
 * entries were for a chat type the code had already stopped caching. The
 * Firestore tier bought pennies of savings for a collection, a cleanup job,
 * and a read on many misses, so it was removed. The durable cost lever for AI
 * spend is provider-side prompt caching (Gemini implicit caching; see the
 * cachedContentTokenCount logging in ai-providers.ts), not response caching.
 */

import crypto from "crypto"

// Cache configuration
const CACHE_CONFIG = {
  maxMemoryEntries: 1000,
  memoryTTLMs: 30 * 60 * 1000, // 30 minutes
}

interface MemoryCacheEntry {
  response: string
  createdAt: number
  hitCount: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()

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
 * Get cached response. Async signature kept so call sites are agnostic to the
 * storage tier.
 */
export async function getCachedResponse(cacheKey: string): Promise<{
  hit: boolean
  response?: string
  source?: "memory"
}> {
  const memoryEntry = memoryCache.get(cacheKey)
  if (!memoryEntry) return { hit: false }

  const age = Date.now() - memoryEntry.createdAt
  if (age >= CACHE_CONFIG.memoryTTLMs) {
    memoryCache.delete(cacheKey)
    return { hit: false }
  }

  memoryEntry.hitCount++
  return { hit: true, response: memoryEntry.response, source: "memory" }
}

/**
 * Store response in cache. The `type` parameter shaped per-type Firestore TTLs
 * in the old two-tier design; the memory tier uses one TTL, but the parameter
 * stays so call sites keep declaring what they cache.
 */
export async function setCachedResponse(
  cacheKey: string,
  response: string,
  _type: string = "chat"
): Promise<void> {
  memoryCache.set(cacheKey, {
    response,
    createdAt: Date.now(),
    hitCount: 0,
  })
  pruneMemoryCache()
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
 * Clear the cache (admin action / tests). Returns the number of entries
 * dropped. Only clears THIS instance's memory — other warm instances keep
 * theirs until their entries expire (30 min max).
 */
export async function clearCache(): Promise<number> {
  const cleared = memoryCache.size
  memoryCache.clear()
  return cleared
}

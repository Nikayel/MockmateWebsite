/**
 * Embedding Cache with LRU Eviction
 *
 * Implements a proper Least Recently Used cache for embeddings.
 * Features:
 * - LRU eviction when cache is full
 * - TTL-based expiration
 * - Memory-efficient storage
 * - Cache statistics for monitoring
 */

interface CacheEntry {
  embedding: number[]
  timestamp: number
  accessCount: number
  lastAccessed: number
}

interface CacheStats {
  hits: number
  misses: number
  evictions: number
  expirations: number
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const MAX_CACHE_SIZE = 1000
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

class LRUEmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  }
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Start cleanup timer (only in Node.js, not in edge runtime)
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL)
      // Don't prevent process from exiting
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref()
      }
    }
  }

  /**
   * Get an embedding from the cache
   * Updates LRU access time on hit
   */
  get(text: string): number[] | null {
    const key = this.hashKey(text)
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key)
      this.stats.expirations++
      this.stats.misses++
      return null
    }

    // Update LRU metadata
    entry.lastAccessed = Date.now()
    entry.accessCount++
    this.stats.hits++

    // Move to end of Map (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.embedding
  }

  /**
   * Store an embedding in the cache
   * Evicts least recently used entries if full
   */
  set(text: string, embedding: number[]): void {
    const key = this.hashKey(text)
    const now = Date.now()

    // Check if we need to evict
    while (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictLRU()
    }

    // Check if updating existing entry
    const existing = this.cache.get(key)
    if (existing) {
      // Update existing - move to end
      this.cache.delete(key)
    }

    this.cache.set(key, {
      embedding,
      timestamp: now,
      accessCount: existing ? existing.accessCount + 1 : 1,
      lastAccessed: now,
    })
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    // Map maintains insertion order, first entry is LRU
    const firstKey = this.cache.keys().next().value
    if (firstKey) {
      this.cache.delete(firstKey)
      this.stats.evictions++
    }
  }

  /**
   * Clean up expired entries periodically
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
      this.stats.expirations++
    }
  }

  /**
   * Create a hash key for the text
   * Uses simple hashing for faster lookups
   */
  private hashKey(text: string): string {
    // For short texts, use as-is
    if (text.length <= 100) {
      return text
    }

    // For longer texts, use a simple hash
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `hash_${hash}_${text.length}`
  }

  /**
   * Check if a key exists without updating LRU
   */
  has(text: string): boolean {
    const key = this.hashKey(text)
    const entry = this.cache.get(key)

    if (!entry) return false

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    }
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & {
    size: number
    hitRate: number
    maxSize: number
  } {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      maxSize: MAX_CACHE_SIZE,
    }
  }

  /**
   * Stop the cleanup timer (for graceful shutdown)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

// Singleton instance
export const embeddingCache = new LRUEmbeddingCache()

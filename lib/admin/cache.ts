/**
 * Admin Response Cache
 *
 * Simple in-memory cache for admin analytics responses.
 * Reduces database load for frequently accessed analytics data.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class AdminCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxEntries = 100

  /**
   * Get cached value if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set cache value with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttlMs Time to live in milliseconds (default: 30 seconds)
   */
  set<T>(key: string, data: T, ttlMs: number = 30000): void {
    // Evict old entries if at max capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    })
  }

  /**
   * Clear specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear all entries matching a prefix
   */
  clearByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; maxEntries: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    }
  }
}

// Singleton instance
export const adminCache = new AdminCache()

// Cache TTL presets (in milliseconds)
export const CACHE_TTL = {
  ANALYTICS: 30 * 1000,      // 30 seconds
  FUNNEL: 60 * 1000,         // 1 minute
  COHORTS: 5 * 60 * 1000,    // 5 minutes
  USERS: 10 * 1000,          // 10 seconds
  USAGE: 30 * 1000,          // 30 seconds
  REVENUE: 60 * 1000,        // 1 minute
} as const

/**
 * Generate cache key for admin endpoints
 */
export function getCacheKey(endpoint: string, params: Record<string, string | undefined>): string {
  const sortedParams = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  return `admin:${endpoint}:${sortedParams}`
}

/**
 * Request Cache
 *
 * Provides request deduplication and caching for API calls.
 * Prevents multiple identical requests from being made simultaneously.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

class RequestCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private pendingRequests: Map<string, PendingRequest<any>> = new Map()
  private defaultTTL: number = 60000 // 1 minute default TTL

  /**
   * Get or fetch data with caching and request deduplication
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; forceRefresh?: boolean } = {}
  ): Promise<T> {
    const { ttl = this.defaultTTL, forceRefresh = false } = options

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.cache.get(key)
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data as T
      }
    }

    // Check for pending request (deduplication)
    const pending = this.pendingRequests.get(key)
    if (pending) {
      return pending.promise as Promise<T>
    }

    // Create new request
    const promise = fetcher()
      .then((data) => {
        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        })
        return data
      })
      .finally(() => {
        // Remove from pending
        this.pendingRequests.delete(key)
      })

    // Store as pending
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    })

    return promise
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; pendingCount: number } {
    return {
      size: this.cache.size,
      pendingCount: this.pendingRequests.size,
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

// Singleton instance
export const requestCache = new RequestCache()

/**
 * Simple hash function for cache key generation
 * Used to hash sensitive values like Authorization headers
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString(36)
}

/**
 * Cached fetch wrapper for API calls
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit & { cacheTTL?: number; forceRefresh?: boolean } = {}
): Promise<T> {
  const { cacheTTL, forceRefresh, ...fetchOptions } = options

  // SECURITY: Extract Authorization header to include in cache key
  // This prevents different users from getting the same cached response
  let authHeader: string | null = null
  if (fetchOptions.headers instanceof Headers) {
    authHeader = fetchOptions.headers.get("Authorization")
  } else if (fetchOptions.headers && typeof fetchOptions.headers === "object") {
    authHeader = (fetchOptions.headers as Record<string, string>)["Authorization"] || null
  }

  // Create cache key from URL and relevant options (including auth hash)
  const cacheKey = `fetch:${url}:${JSON.stringify({
    method: fetchOptions.method || "GET",
    body: fetchOptions.body,
    // Hash the auth header to avoid storing tokens in cache keys
    authHash: authHeader ? simpleHash(authHeader) : undefined,
  })}`

  return requestCache.getOrFetch<T>(
    cacheKey,
    async () => {
      const response = await fetch(url, fetchOptions)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    },
    { ttl: cacheTTL, forceRefresh }
  )
}

/**
 * Hook-friendly cache key generator
 */
export function createCacheKey(prefix: string, params: Record<string, any>): string {
  return `${prefix}:${JSON.stringify(params)}`
}

// Auto-cleanup every 5 minutes
if (typeof window !== "undefined") {
  setInterval(
    () => {
      requestCache.cleanup()
    },
    5 * 60 * 1000
  )
}

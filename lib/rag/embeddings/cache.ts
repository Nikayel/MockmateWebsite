/**
 * Embedding Cache
 * 
 * Caches embeddings to avoid recomputing them
 */

interface CacheEntry {
  embedding: number[]
  timestamp: number
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const MAX_CACHE_SIZE = 1000

class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map()

  get(text: string): number[] | null {
    const entry = this.cache.get(text)
    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(text)
      return null
    }

    return entry.embedding
  }

  set(text: string, embedding: number[]): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(text, {
      embedding,
      timestamp: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Singleton instance
export const embeddingCache = new EmbeddingCache()


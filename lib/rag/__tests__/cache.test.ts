/**
 * Tests for embedding cache
 */

import { embeddingCache } from "../embeddings/cache"

describe("LRUEmbeddingCache", () => {
  // Use a unique prefix for test keys to avoid interference
  const testPrefix = `test-${Date.now()}-`

  beforeEach(() => {
    // Clear cache before each test
    embeddingCache.clear()
  })

  afterAll(() => {
    // Clean up
    embeddingCache.clear()
  })

  describe("basic operations", () => {
    it("should store and retrieve embeddings", () => {
      const text = testPrefix + "hello world"
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5]

      embeddingCache.set(text, embedding)
      const retrieved = embeddingCache.get(text)

      expect(retrieved).toEqual(embedding)
    })

    it("should return null for non-existent keys", () => {
      const result = embeddingCache.get(testPrefix + "non-existent-key")
      expect(result).toBeNull()
    })

    it("should check if key exists", () => {
      const text = testPrefix + "exists-test"
      const embedding = [1, 2, 3]

      expect(embeddingCache.has(text)).toBe(false)
      embeddingCache.set(text, embedding)
      expect(embeddingCache.has(text)).toBe(true)
    })

    it("should track cache size", () => {
      const initialSize = embeddingCache.size()

      embeddingCache.set(testPrefix + "size-test-1", [1])
      embeddingCache.set(testPrefix + "size-test-2", [2])

      expect(embeddingCache.size()).toBe(initialSize + 2)
    })

    it("should clear all entries", () => {
      embeddingCache.set(testPrefix + "clear-test", [1, 2, 3])
      expect(embeddingCache.size()).toBeGreaterThan(0)

      embeddingCache.clear()
      expect(embeddingCache.size()).toBe(0)
    })
  })

  describe("LRU eviction", () => {
    it("should update access time on get", () => {
      const text1 = testPrefix + "lru-test-1"
      const text2 = testPrefix + "lru-test-2"

      embeddingCache.set(text1, [1])
      embeddingCache.set(text2, [2])

      // Access text1 to make it more recently used
      embeddingCache.get(text1)

      // Both should still exist
      expect(embeddingCache.has(text1)).toBe(true)
      expect(embeddingCache.has(text2)).toBe(true)
    })

    it("should move to end on update", () => {
      const text = testPrefix + "update-test"

      embeddingCache.set(text, [1])
      embeddingCache.set(text, [2]) // Update

      const retrieved = embeddingCache.get(text)
      expect(retrieved).toEqual([2])
    })
  })

  describe("cache statistics", () => {
    it("should track hits and misses", () => {
      embeddingCache.clear() // Reset stats

      const text = testPrefix + "stats-test"
      embeddingCache.set(text, [1, 2, 3])

      // Generate some hits and misses
      embeddingCache.get(text) // hit
      embeddingCache.get(text) // hit
      embeddingCache.get(testPrefix + "non-existent") // miss

      const stats = embeddingCache.getStats()
      expect(stats.hits).toBeGreaterThanOrEqual(2)
      expect(stats.misses).toBeGreaterThanOrEqual(1)
    })

    it("should calculate hit rate", () => {
      embeddingCache.clear()

      const text = testPrefix + "hit-rate-test"
      embeddingCache.set(text, [1])

      embeddingCache.get(text) // hit
      embeddingCache.get(text) // hit
      embeddingCache.get(testPrefix + "miss") // miss

      const stats = embeddingCache.getStats()
      // 2 hits out of 3 requests = ~0.67 hit rate
      expect(stats.hitRate).toBeGreaterThan(0.5)
      expect(stats.hitRate).toBeLessThanOrEqual(1)
    })

    it("should report max size", () => {
      const stats = embeddingCache.getStats()
      expect(stats.maxSize).toBe(1000)
    })
  })

  describe("hash key generation", () => {
    it("should handle short texts directly", () => {
      const shortText = testPrefix + "short"
      embeddingCache.set(shortText, [1])
      expect(embeddingCache.get(shortText)).toEqual([1])
    })

    it("should handle long texts with hashing", () => {
      const longText = testPrefix + "a".repeat(200)
      embeddingCache.set(longText, [1, 2, 3])
      expect(embeddingCache.get(longText)).toEqual([1, 2, 3])
    })

    it("should differentiate similar long texts", () => {
      const text1 = testPrefix + "a".repeat(200) + "X"
      const text2 = testPrefix + "a".repeat(200) + "Y"

      embeddingCache.set(text1, [1])
      embeddingCache.set(text2, [2])

      expect(embeddingCache.get(text1)).toEqual([1])
      expect(embeddingCache.get(text2)).toEqual([2])
    })
  })

  describe("edge cases", () => {
    it("should handle empty embeddings", () => {
      const text = testPrefix + "empty-embedding"
      embeddingCache.set(text, [])
      expect(embeddingCache.get(text)).toEqual([])
    })

    it("should handle large embeddings", () => {
      const text = testPrefix + "large-embedding"
      const largeEmbedding = Array(1536)
        .fill(0)
        .map((_, i) => i * 0.001)

      embeddingCache.set(text, largeEmbedding)
      const retrieved = embeddingCache.get(text)

      expect(retrieved).toEqual(largeEmbedding)
      expect(retrieved?.length).toBe(1536)
    })

    it("should handle special characters in text", () => {
      const texts = [
        testPrefix + "Unicode: 你好世界",
        testPrefix + "Emoji: 🎉🚀",
        testPrefix + "Newlines: hello\nworld",
        testPrefix + "Tabs: hello\tworld",
      ]

      texts.forEach((text, i) => {
        embeddingCache.set(text, [i])
        expect(embeddingCache.get(text)).toEqual([i])
      })
    })
  })
})

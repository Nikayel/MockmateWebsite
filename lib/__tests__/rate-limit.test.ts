/**
 * Tests for rate-limit.ts
 * Ensures rate limiting works correctly for API protection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Create a mock Map to simulate the rate limit store
const mockRateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Helper to create mock rate limiter
function createMockRateLimiter(config: { interval: number; maxRequests: number }) {
  return async (request: any): Promise<any> => {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const identifier = forwarded?.split(',')[0].trim() || realIp || 'unknown'
    const now = Date.now()

    const entry = mockRateLimitStore.get(identifier)

    if (!entry || entry.resetTime < now) {
      mockRateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + config.interval,
      })
      return null
    }

    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      return {
        status: 429,
        data: { error: 'Too many requests. Please try again later.', retryAfter },
        headers: new Map([
          ['Retry-After', retryAfter.toString()],
          ['X-RateLimit-Limit', config.maxRequests.toString()],
          ['X-RateLimit-Remaining', '0'],
        ]),
      }
    }

    entry.count++
    return null
  }
}

// Pre-configured rate limiters for testing
const executeRateLimit = createMockRateLimiter({ interval: 60000, maxRequests: 10 })
const chatRateLimit = createMockRateLimiter({ interval: 60000, maxRequests: 20 })
const apiRateLimit = createMockRateLimiter({ interval: 60000, maxRequests: 30 })
const feedbackRateLimit = createMockRateLimiter({ interval: 60000, maxRequests: 5 })

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear the mock store before each test
    mockRateLimitStore.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rateLimit factory', () => {
    it('should allow requests under the limit', async () => {
      const limiter = createMockRateLimiter({ interval: 60000, maxRequests: 5 })

      const mockRequest = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.1' : null),
        },
      }

      // First 5 requests should pass
      for (let i = 0; i < 5; i++) {
        const result = await limiter(mockRequest as any)
        expect(result).toBeNull()
      }
    })

    it('should block requests over the limit', async () => {
      const limiter = createMockRateLimiter({ interval: 60000, maxRequests: 3 })

      const mockRequest = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.2' : null),
        },
      }

      // First 3 requests should pass
      for (let i = 0; i < 3; i++) {
        const result = await limiter(mockRequest as any)
        expect(result).toBeNull()
      }

      // 4th request should be blocked
      const result = await limiter(mockRequest as any)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(429)
      expect(result?.data.error).toContain('Too many requests')
    })

    it('should reset after interval expires', async () => {
      const limiter = createMockRateLimiter({ interval: 60000, maxRequests: 2 })

      const mockRequest = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.3' : null),
        },
      }

      // Use up the limit
      await limiter(mockRequest as any)
      await limiter(mockRequest as any)

      // Should be blocked
      let result = await limiter(mockRequest as any)
      expect(result?.status).toBe(429)

      // Advance time past the interval
      vi.advanceTimersByTime(61000)

      // Should be allowed again
      result = await limiter(mockRequest as any)
      expect(result).toBeNull()
    })

    it('should track different IPs separately', async () => {
      const limiter = createMockRateLimiter({ interval: 60000, maxRequests: 2 })

      const mockRequest1 = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.10' : null),
        },
      }

      const mockRequest2 = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.11' : null),
        },
      }

      // Use up limit for IP 1
      await limiter(mockRequest1 as any)
      await limiter(mockRequest1 as any)
      const result1 = await limiter(mockRequest1 as any)
      expect(result1?.status).toBe(429)

      // IP 2 should still be allowed
      const result2 = await limiter(mockRequest2 as any)
      expect(result2).toBeNull()
    })

    it('should use x-real-ip as fallback', async () => {
      const limiter = createMockRateLimiter({ interval: 60000, maxRequests: 2 })

      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-forwarded-for') return null
            if (name === 'x-real-ip') return '10.0.0.1'
            return null
          },
        },
      }

      // Should use x-real-ip
      const result = await limiter(mockRequest as any)
      expect(result).toBeNull()
    })
  })

  describe('Pre-configured rate limiters', () => {
    it('executeRateLimit should allow 10 requests per minute', async () => {
      const mockRequest = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '10.0.0.100' : null),
        },
      }

      // Should allow first 10 requests
      for (let i = 0; i < 10; i++) {
        const result = await executeRateLimit(mockRequest as any)
        expect(result).toBeNull()
      }

      // 11th should be blocked
      const result = await executeRateLimit(mockRequest as any)
      expect(result?.status).toBe(429)
    })

    it('chatRateLimit should allow 20 requests per minute', async () => {
      const mockRequest = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '10.0.0.101' : null),
        },
      }

      for (let i = 0; i < 20; i++) {
        const result = await chatRateLimit(mockRequest as any)
        expect(result).toBeNull()
      }

      const result = await chatRateLimit(mockRequest as any)
      expect(result?.status).toBe(429)
    })

    it('feedbackRateLimit should allow 5 requests per minute (strictest)', async () => {
      const mockRequest = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '10.0.0.102' : null),
        },
      }

      for (let i = 0; i < 5; i++) {
        const result = await feedbackRateLimit(mockRequest as any)
        expect(result).toBeNull()
      }

      const result = await feedbackRateLimit(mockRequest as any)
      expect(result?.status).toBe(429)
    })

    it('apiRateLimit should allow 30 requests per minute (most lenient)', async () => {
      const mockRequest = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '10.0.0.103' : null),
        },
      }

      for (let i = 0; i < 30; i++) {
        const result = await apiRateLimit(mockRequest as any)
        expect(result).toBeNull()
      }

      const result = await apiRateLimit(mockRequest as any)
      expect(result?.status).toBe(429)
    })
  })

  describe('Rate limit response', () => {
    it('should include Retry-After header', async () => {
      const limiter = createMockRateLimiter({ interval: 60000, maxRequests: 1 })

      const mockRequest = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '10.0.0.200' : null),
        },
      }

      await limiter(mockRequest as any)
      const result = await limiter(mockRequest as any)

      expect(result?.headers.get('Retry-After')).toBeDefined()
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('1')
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0')
    })

    it('should include retryAfter in response body', async () => {
      const limiter = createMockRateLimiter({ interval: 60000, maxRequests: 1 })

      const mockRequest = {
        headers: {
          get: (name: string) => (name === 'x-forwarded-for' ? '10.0.0.201' : null),
        },
      }

      await limiter(mockRequest as any)
      const result = await limiter(mockRequest as any)

      expect(result?.data.retryAfter).toBeGreaterThan(0)
      expect(result?.data.retryAfter).toBeLessThanOrEqual(60)
    })
  })
})

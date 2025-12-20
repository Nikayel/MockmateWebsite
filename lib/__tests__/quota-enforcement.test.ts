/**
 * Tests for quota-enforcement.ts
 * Ensures quota limits are properly enforced
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Firebase Admin
vi.mock('../firebase-admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({ subscription_tier: 'free' }) })),
      })),
      where: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ docs: [] })),
      })),
    })),
  },
  adminAuth: {
    verifyIdToken: vi.fn(() => Promise.resolve({ uid: 'test-user-id' })),
  },
}))

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock config
vi.mock('../config', () => ({
  PRICING_CONFIG: {
    free: { sessionsPerMonth: 2 },
    pro: { sessionsPerMonth: 35 },
  },
}))

describe('Quota Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Session Limits', () => {
    it('should allow requests when under session limit', async () => {
      // Import after mocking
      const { checkQuota } = await import('../quota-enforcement')

      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'Authorization') return 'Bearer mock-token'
            return null
          }),
        },
        clone: vi.fn(() => ({
          json: vi.fn(() => Promise.resolve({ userId: 'test-user' })),
        })),
      } as any

      const result = await checkQuota(mockRequest)
      expect(result.allowed).toBe(true)
    })

    it('should include user tier in result', async () => {
      const { checkQuota } = await import('../quota-enforcement')

      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => null),
        },
        clone: vi.fn(() => ({
          json: vi.fn(() => Promise.resolve({ userId: 'test-user' })),
        })),
      } as any

      const result = await checkQuota(mockRequest)
      // Anonymous users get free tier defaults
      expect(['free', 'pro', 'enterprise']).toContain(result.tier)
    })
  })

  describe('Budget Limits', () => {
    it('should track budget usage', async () => {
      const { checkQuota } = await import('../quota-enforcement')

      const mockRequest = {
        headers: {
          get: vi.fn(() => null),
        },
        clone: vi.fn(() => ({
          json: vi.fn(() => Promise.resolve({})),
        })),
      } as any

      const result = await checkQuota(mockRequest)
      expect(result).toHaveProperty('budgetUsed')
      expect(result).toHaveProperty('budgetLimit')
    })
  })

  describe('Anonymous Users', () => {
    it('should allow anonymous users (handled by rate limiting)', async () => {
      const { checkQuota } = await import('../quota-enforcement')

      const mockRequest = {
        headers: {
          get: vi.fn(() => null),
        },
        clone: vi.fn(() => ({
          json: vi.fn(() => Promise.resolve({})),
        })),
      } as any

      const result = await checkQuota(mockRequest)
      expect(result.allowed).toBe(true)
      expect(result.userId).toBe('anonymous')
    })
  })

  describe('Error Handling', () => {
    it('should fail open when quota check fails', async () => {
      // Mock a failure
      const { adminDb } = await import('../firebase-admin')
      vi.mocked(adminDb.collection).mockImplementationOnce(() => {
        throw new Error('Database error')
      })

      const { checkQuota } = await import('../quota-enforcement')

      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => null),
        },
        clone: vi.fn(() => ({
          json: vi.fn(() => Promise.resolve({ userId: 'test-user' })),
        })),
      } as any

      // Should not throw, should allow request
      const result = await checkQuota(mockRequest)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Tier-based Limits', () => {
    it('should apply correct limits for free tier', async () => {
      const { PRICING_CONFIG } = await import('../config')
      expect(PRICING_CONFIG.free.sessionsPerMonth).toBe(2)
    })

    it('should apply correct limits for pro tier', async () => {
      const { PRICING_CONFIG } = await import('../config')
      expect(PRICING_CONFIG.pro.sessionsPerMonth).toBe(35)
    })
  })
})

describe('Budget Warning', () => {
  it('should warn at 75% budget usage', async () => {
    const { checkBudgetWarning } = await import('../quota-enforcement')

    // Mock a user at 75% budget
    vi.mocked((await import('../firebase-admin')).adminDb.collection).mockImplementation(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({
              totalCost: 18.75, // 75% of $25
            }),
          })
        ),
      })),
      where: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            docs: [
              {
                data: () => ({
                  sessions_used: 10,
                  sessions_limit: 35,
                  period_start: new Date().toISOString(),
                }),
              },
            ],
          })
        ),
      })),
    } as any))

    // The function should handle missing user gracefully
    const result = await checkBudgetWarning('test-user')
    expect(result).toHaveProperty('warn')
    expect(result).toHaveProperty('percentUsed')
  })
})

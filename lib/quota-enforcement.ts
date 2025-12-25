/**
 * Quota Enforcement Middleware
 *
 * Ensures users stay within their subscription tier limits:
 * - Free: 2 sessions/month, $0.50 budget
 * - Pro: 35 sessions/month, $25 budget
 * - Enterprise: Unlimited sessions, $100 budget
 *
 * This middleware should be used in API routes that consume resources:
 * - /api/chat (AI messages)
 * - /api/generate-feedback (AI feedback)
 * - /api/execute (code execution)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from './firebase-admin'
import { logger } from './logger'
import { PRICING_CONFIG } from './config'

interface QuotaCheckResult {
  allowed: boolean
  userId: string
  tier: 'free' | 'pro' | 'enterprise'
  sessionsUsed: number
  sessionsLimit: number
  budgetUsed: number
  budgetLimit: number
  message?: string
}

interface UserQuota {
  sessionsUsed: number
  sessionsLimit: number
  freeOpensRemaining: number
  budgetUsed: number
  budgetLimit: number
  periodStart: string
  periodEnd: string
}

// Budget limits per tier (in dollars)
const BUDGET_LIMITS = {
  free: 0.50,
  pro: 25.00,
  enterprise: 100.00,
} as const

/**
 * Get user ID from request (from Authorization header)
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.slice(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    logger.warn('Failed to verify auth token', { error })
    return null
  }
}

/**
 * SECURITY NOTE: We intentionally do NOT allow userId from request body
 * as this could allow users to spoof another user's identity and affect their quota.
 * All quota checks must use verified auth tokens only.
 */

/**
 * Get user's current quota for the billing period
 *
 * NOTE: This is a read-only check for enforcing limits, not for incrementing usage.
 * The actual usage increment happens in firestore-helpers.ts with proper transactions.
 * Small race windows here are acceptable since this is a soft limit check.
 */
async function getUserQuota(userId: string): Promise<UserQuota | null> {
  try {
    const now = new Date()
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Batch fetch profile and quota in parallel for better performance
    const [profileDoc, quotaQuery, usageSummaryDoc] = await Promise.all([
      // Get user profile for tier
      adminDb.collection('profiles').doc(userId).get(),

      // Get quota documents - limit to recent entries only (max 12 months of history)
      adminDb
        .collection('profile_quota')
        .where('user_id', '==', userId)
        .orderBy('period_start', 'desc')
        .limit(12)
        .get(),

      // Get usage summary for budget tracking
      adminDb
        .collection('users')
        .doc(userId)
        .collection('usage_summaries')
        .doc(periodKey)
        .get(),
    ])

    const profile = profileDoc.data()
    const tier = (profile?.subscription_tier || 'free') as 'free' | 'pro' | 'enterprise'

    // Find current period quota from limited results
    const quota = quotaQuery.docs
      .map((doc) => doc.data())
      .find((q) => {
        const qStart = new Date(q.period_start)
        return qStart >= currentPeriodStart && qStart <= currentPeriodEnd
      })

    const usageSummary = usageSummaryDoc.data()
    const budgetUsed = usageSummary?.totalCost || 0

    // Get session limits based on tier
    const sessionsLimit =
      tier === 'pro'
        ? PRICING_CONFIG.pro.sessionsPerMonth
        : tier === 'enterprise'
          ? 999 // Effectively unlimited
          : PRICING_CONFIG.free.sessionsPerMonth

    return {
      sessionsUsed: quota?.sessions_used || 0,
      sessionsLimit,
      freeOpensRemaining: quota?.free_opens_remaining || 0,
      budgetUsed,
      budgetLimit: BUDGET_LIMITS[tier],
      periodStart: currentPeriodStart.toISOString(),
      periodEnd: currentPeriodEnd.toISOString(),
    }
  } catch (error) {
    logger.error('Failed to get user quota', { userId, error })
    return null
  }
}

/**
 * Check if user has exceeded their quota
 */
export async function checkQuota(
  request: NextRequest
): Promise<QuotaCheckResult & { response?: NextResponse }> {
  // Get user ID from auth header only (never from body for security)
  const userId = await getUserIdFromRequest(request)

  // If no user ID, allow request (unauthenticated users have other rate limits)
  if (!userId) {
    return {
      allowed: true,
      userId: 'anonymous',
      tier: 'free',
      sessionsUsed: 0,
      sessionsLimit: 0,
      budgetUsed: 0,
      budgetLimit: 0,
    }
  }

  // Get user profile for tier
  try {
    const profileDoc = await adminDb.collection('profiles').doc(userId).get()
    const profile = profileDoc.data()
    const tier = (profile?.subscription_tier || 'free') as 'free' | 'pro' | 'enterprise'

    // Get user quota
    const quota = await getUserQuota(userId)
    if (!quota) {
      // If we can't get quota, allow but log warning
      logger.warn('Could not retrieve user quota, allowing request', { userId })
      return {
        allowed: true,
        userId,
        tier,
        sessionsUsed: 0,
        sessionsLimit: 0,
        budgetUsed: 0,
        budgetLimit: 0,
      }
    }

    // Check session limit (skip if user has free opens remaining)
    if (quota.freeOpensRemaining <= 0 && quota.sessionsUsed >= quota.sessionsLimit) {
      const response = NextResponse.json(
        {
          error: 'Session limit exceeded',
          message: `You've used all ${quota.sessionsLimit} sessions for this month. Upgrade to Pro for more sessions.`,
          code: 'QUOTA_EXCEEDED',
          quota: {
            sessionsUsed: quota.sessionsUsed,
            sessionsLimit: quota.sessionsLimit,
            tier,
          },
        },
        { status: 429 }
      )

      logger.warn('Quota exceeded - session limit', {
        userId,
        tier,
        sessionsUsed: quota.sessionsUsed,
        sessionsLimit: quota.sessionsLimit,
      })

      return {
        allowed: false,
        userId,
        tier,
        sessionsUsed: quota.sessionsUsed,
        sessionsLimit: quota.sessionsLimit,
        budgetUsed: quota.budgetUsed,
        budgetLimit: quota.budgetLimit,
        message: 'Session limit exceeded',
        response,
      }
    }

    // Check budget limit
    if (quota.budgetUsed >= quota.budgetLimit) {
      const response = NextResponse.json(
        {
          error: 'Budget limit exceeded',
          message: `You've reached your $${quota.budgetLimit.toFixed(2)} monthly budget. Upgrade your plan or wait until next month.`,
          code: 'BUDGET_EXCEEDED',
          quota: {
            budgetUsed: quota.budgetUsed,
            budgetLimit: quota.budgetLimit,
            tier,
          },
        },
        { status: 429 }
      )

      logger.warn('Quota exceeded - budget limit', {
        userId,
        tier,
        budgetUsed: quota.budgetUsed,
        budgetLimit: quota.budgetLimit,
      })

      return {
        allowed: false,
        userId,
        tier,
        sessionsUsed: quota.sessionsUsed,
        sessionsLimit: quota.sessionsLimit,
        budgetUsed: quota.budgetUsed,
        budgetLimit: quota.budgetLimit,
        message: 'Budget limit exceeded',
        response,
      }
    }

    // All checks passed
    return {
      allowed: true,
      userId,
      tier,
      sessionsUsed: quota.sessionsUsed,
      sessionsLimit: quota.sessionsLimit,
      budgetUsed: quota.budgetUsed,
      budgetLimit: quota.budgetLimit,
    }
  } catch (error) {
    logger.error('Quota check failed', { userId, error })
    // Fail open - don't block users if quota check fails
    return {
      allowed: true,
      userId,
      tier: 'free',
      sessionsUsed: 0,
      sessionsLimit: 0,
      budgetUsed: 0,
      budgetLimit: 0,
    }
  }
}

/**
 * Quota enforcement middleware for API routes
 * Usage:
 *   const quotaResult = await enforceQuota(request)
 *   if (quotaResult.response) return quotaResult.response
 *   // Continue with request processing...
 */
export async function enforceQuota(
  request: NextRequest
): Promise<{ allowed: boolean; response?: NextResponse; userId?: string; tier?: string }> {
  const result = await checkQuota(request)

  if (!result.allowed && result.response) {
    return { allowed: false, response: result.response }
  }

  return {
    allowed: true,
    userId: result.userId,
    tier: result.tier,
  }
}

/**
 * Log budget warning if user is approaching limit
 */
export async function checkBudgetWarning(userId: string): Promise<{
  warn: boolean
  percentUsed: number
  message?: string
}> {
  const quota = await getUserQuota(userId)
  if (!quota) {
    return { warn: false, percentUsed: 0 }
  }

  const percentUsed = (quota.budgetUsed / quota.budgetLimit) * 100

  if (percentUsed >= 90) {
    return {
      warn: true,
      percentUsed,
      message: `Warning: You've used ${percentUsed.toFixed(0)}% of your monthly budget ($${quota.budgetUsed.toFixed(2)}/$${quota.budgetLimit.toFixed(2)})`,
    }
  }

  if (percentUsed >= 75) {
    return {
      warn: true,
      percentUsed,
      message: `Note: You've used ${percentUsed.toFixed(0)}% of your monthly budget`,
    }
  }

  return { warn: false, percentUsed }
}

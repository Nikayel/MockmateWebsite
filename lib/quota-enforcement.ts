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

import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "./firebase-admin"
import { logger } from "./logger"
import { PRICING_CONFIG } from "./config"
import { CIRCUIT_BREAKER } from "./constants"

// Circuit breaker state for fail-open protection
// Tracks consecutive failures to prevent unlimited access during extended outages
interface CircuitBreakerState {
  consecutiveFailures: number
  lastFailureTime: number
  isOpen: boolean
}

const circuitBreaker: CircuitBreakerState = {
  consecutiveFailures: 0,
  lastFailureTime: 0,
  isOpen: false,
}

// Circuit breaker config (from centralized constants)
const CIRCUIT_BREAKER_THRESHOLD = CIRCUIT_BREAKER.FAILURE_THRESHOLD
const CIRCUIT_BREAKER_RESET_MS = CIRCUIT_BREAKER.RESET_MS
const MAX_FAIL_OPEN_REQUESTS = CIRCUIT_BREAKER.MAX_FAIL_OPEN_REQUESTS

// Track fail-open requests per user (in-memory, resets on deploy)
const failOpenRequestCounts = new Map<string, { count: number; resetTime: number }>()

function recordCircuitFailure(): void {
  circuitBreaker.consecutiveFailures++
  circuitBreaker.lastFailureTime = Date.now()

  if (circuitBreaker.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true
    logger.error("CRITICAL: Quota circuit breaker OPEN - Firestore may be down", {
      consecutiveFailures: circuitBreaker.consecutiveFailures,
    })
  }
}

function recordCircuitSuccess(): void {
  circuitBreaker.consecutiveFailures = 0
  circuitBreaker.isOpen = false
}

function checkCircuitBreaker(userId: string): { allowed: boolean; reason?: string } {
  // Reset circuit breaker if enough time has passed
  if (
    circuitBreaker.isOpen &&
    Date.now() - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_RESET_MS
  ) {
    circuitBreaker.isOpen = false
    circuitBreaker.consecutiveFailures = 0
    logger.info("Quota circuit breaker reset - attempting normal operation")
  }

  // If circuit is open, apply per-user rate limiting
  if (circuitBreaker.isOpen) {
    const userTrack = failOpenRequestCounts.get(userId)
    const now = Date.now()

    if (!userTrack || now > userTrack.resetTime) {
      // Start new tracking window
      failOpenRequestCounts.set(userId, { count: 1, resetTime: now + 60 * 1000 })
      return { allowed: true }
    }

    if (userTrack.count >= MAX_FAIL_OPEN_REQUESTS) {
      logger.warn("Fail-open rate limit exceeded during circuit break", { userId })
      return {
        allowed: false,
        reason: "Service temporarily unavailable. Please try again in a minute.",
      }
    }

    userTrack.count++
    return { allowed: true }
  }

  return { allowed: true }
}

// Subscription statuses that indicate the user should NOT have Pro access
const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "past_due",
  "canceled",
  "expired",
  "unpaid",
  "refunded",
  "deleted",
])

interface QuotaCheckResult {
  allowed: boolean
  userId: string
  tier: "free" | "pro" | "enterprise"
  sessionsUsed: number
  sessionsLimit: number
  budgetUsed: number
  budgetLimit: number
  message?: string
  code?: string
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
  free: 0.5,
  pro: 25.0,
  enterprise: 100.0,
} as const

/**
 * Get user ID from request (from Authorization header)
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.slice(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    logger.warn("Failed to verify auth token", { error })
    return null
  }
}

/**
 * Get guest ID from request header
 */
function getGuestIdFromRequest(request: NextRequest): string | null {
  const guestId = request.headers.get("X-Guest-Id")
  if (!guestId) return null

  // Validate guest ID format
  if (!/^guest-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guestId)) {
    return null
  }

  return guestId
}

/**
 * Check if guest has exceeded their free trial
 * Server-side enforcement to prevent client-side bypass
 */
async function checkGuestQuota(guestId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Query Firestore for completed sessions by this guest
    const completedSessionsQuery = await adminDb
      .collection("interview_sessions")
      .where("user_id", "==", guestId)
      .where("is_guest", "==", true)
      .limit(5) // Only need to check if any completed sessions exist
      .get()

    // Check if any session was completed (has feedback or completed_at)
    const hasCompletedSession = completedSessionsQuery.docs.some(
      (doc: FirebaseFirestore.QueryDocumentSnapshot) =>
        doc.data().completed_at || doc.data().feedback
    )

    if (hasCompletedSession) {
      return {
        allowed: false,
        reason: "Free trial already used. Sign up to continue practicing!",
      }
    }

    // Check if they have an active (non-expired) session already
    const hasActiveSession = completedSessionsQuery.docs.some(
      (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data()
        if (data.completed_at || data.feedback) return false

        // Check if session is expired (48 hours)
        const expiresAt = data.expires_at ? new Date(data.expires_at) : null
        if (expiresAt && expiresAt < new Date()) return false

        return true
      }
    )

    // Allow if no completed session and either no active session or has one active
    recordCircuitSuccess()
    return { allowed: true }
  } catch (error) {
    logger.error("Failed to check guest quota", { guestId, error })
    recordCircuitFailure()

    // Check circuit breaker before failing open
    const circuitCheck = checkCircuitBreaker(guestId)
    if (!circuitCheck.allowed) {
      return { allowed: false, reason: circuitCheck.reason }
    }

    // Fail open for guest - but with circuit breaker protection
    return { allowed: true }
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
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Batch fetch profile and quota in parallel for better performance
    const [profileDoc, quotaQuery, usageSummaryDoc] = await Promise.all([
      // Get user profile for tier
      adminDb.collection("profiles").doc(userId).get(),

      // Get quota documents - limit to recent entries only (max 12 months of history)
      adminDb
        .collection("profile_quota")
        .where("user_id", "==", userId)
        .orderBy("period_start", "desc")
        .limit(12)
        .get(),

      // Get usage summary for budget tracking
      adminDb.collection("users").doc(userId).collection("usage_summaries").doc(periodKey).get(),
    ])

    const profile = profileDoc.data()
    const tier = (profile?.subscription_tier || "free") as "free" | "pro" | "enterprise"

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
      tier === "pro"
        ? PRICING_CONFIG.pro.sessionsPerMonth
        : tier === "enterprise"
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
    logger.error("Failed to get user quota", { userId, error })
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

  // If no user ID, check for guest ID and enforce guest quota
  if (!userId) {
    const guestId = getGuestIdFromRequest(request)

    // If guest ID present, check server-side guest quota
    if (guestId) {
      const guestQuota = await checkGuestQuota(guestId)

      if (!guestQuota.allowed) {
        const response = NextResponse.json(
          {
            error: "Free trial exhausted",
            message: guestQuota.reason || "Free trial already used. Sign up to continue!",
            code: "FREE_TRIAL_EXHAUSTED",
          },
          { status: 403 }
        )

        logger.warn("Guest quota exceeded", { guestId })

        return {
          allowed: false,
          userId: guestId,
          tier: "free",
          sessionsUsed: 1,
          sessionsLimit: 1,
          budgetUsed: 0,
          budgetLimit: 0,
          message: guestQuota.reason,
          response,
        }
      }

      // Guest quota OK
      return {
        allowed: true,
        userId: guestId,
        tier: "free",
        sessionsUsed: 0,
        sessionsLimit: 1,
        budgetUsed: 0,
        budgetLimit: 0,
      }
    }

    // No auth and no guest ID - anonymous request, rely on rate limits only
    return {
      allowed: true,
      userId: "anonymous",
      tier: "free",
      sessionsUsed: 0,
      sessionsLimit: 0,
      budgetUsed: 0,
      budgetLimit: 0,
    }
  }

  // Get user profile for tier
  try {
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()
    const profile = profileDoc.data()
    const tier = (profile?.subscription_tier || "free") as "free" | "pro" | "enterprise"
    const subscriptionStatus = profile?.subscription_status as string | undefined

    // P0 FIX: Block access when subscription is in a degraded state
    // This prevents users from continuing to use Pro features after payment failure,
    // cancellation, or expiration — even mid-session.
    if (
      tier === "pro" &&
      subscriptionStatus &&
      INACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
    ) {
      const statusMessages: Record<string, string> = {
        past_due: "Your payment failed. Please update your payment method to continue.",
        canceled: "Your subscription has been canceled.",
        expired: "Your subscription has expired. Renew to continue.",
        unpaid: "Your subscription is unpaid. Please update your payment method.",
        refunded: "Your subscription was refunded.",
        deleted: "Your subscription is no longer active.",
      }

      const message = statusMessages[subscriptionStatus] || "Your subscription is inactive."
      const response = NextResponse.json(
        {
          error: "Subscription inactive",
          message,
          code: "SUBSCRIPTION_INACTIVE",
          subscription_status: subscriptionStatus,
        },
        { status: 403 }
      )

      logger.warn("Blocked request due to inactive subscription", {
        userId,
        tier,
        subscriptionStatus,
      })

      return {
        allowed: false,
        userId,
        tier,
        sessionsUsed: 0,
        sessionsLimit: 0,
        budgetUsed: 0,
        budgetLimit: 0,
        message,
        code: "SUBSCRIPTION_INACTIVE",
        response,
      }
    }

    // Get user quota
    const quota = await getUserQuota(userId)
    if (!quota) {
      // If we can't get quota, allow but log warning
      logger.warn("Could not retrieve user quota, allowing request", { userId })
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
          error: "Session limit exceeded",
          message: `You've used all ${quota.sessionsLimit} sessions for this month. Upgrade to Pro for more sessions.`,
          code: "QUOTA_EXCEEDED",
          quota: {
            sessionsUsed: quota.sessionsUsed,
            sessionsLimit: quota.sessionsLimit,
            tier,
          },
        },
        { status: 429 }
      )

      logger.warn("Quota exceeded - session limit", {
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
        message: "Session limit exceeded",
        response,
      }
    }

    // Check budget limit
    if (quota.budgetUsed >= quota.budgetLimit) {
      const response = NextResponse.json(
        {
          error: "Budget limit exceeded",
          message: `You've reached your $${quota.budgetLimit.toFixed(2)} monthly budget. Upgrade your plan or wait until next month.`,
          code: "BUDGET_EXCEEDED",
          quota: {
            budgetUsed: quota.budgetUsed,
            budgetLimit: quota.budgetLimit,
            tier,
          },
        },
        { status: 429 }
      )

      logger.warn("Quota exceeded - budget limit", {
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
        message: "Budget limit exceeded",
        response,
      }
    }

    // All checks passed
    recordCircuitSuccess()
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
    logger.error("Quota check failed", { userId, error })
    recordCircuitFailure()

    // Check circuit breaker before failing open
    const circuitCheck = checkCircuitBreaker(userId)
    if (!circuitCheck.allowed) {
      const response = NextResponse.json(
        {
          error: "Service temporarily unavailable",
          message: circuitCheck.reason,
          code: "SERVICE_UNAVAILABLE",
        },
        { status: 503 }
      )
      return {
        allowed: false,
        userId,
        tier: "free",
        sessionsUsed: 0,
        sessionsLimit: 0,
        budgetUsed: 0,
        budgetLimit: 0,
        message: circuitCheck.reason,
        response,
      }
    }

    // Fail open - but with circuit breaker protection limiting abuse
    return {
      allowed: true,
      userId,
      tier: "free",
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

/**
 * Server-side tier gate for Pro-only API routes.
 * Verifies the user's subscription tier from Firestore and blocks free-tier users.
 *
 * Usage:
 *   const tierCheck = await requireTier(request, "pro")
 *   if (tierCheck.response) return tierCheck.response
 *   // Continue — tierCheck.userId is the verified user
 */
export async function requireTier(
  request: NextRequest,
  requiredTier: "pro" | "enterprise"
): Promise<{ allowed: boolean; response?: NextResponse; userId?: string; tier?: string }> {
  const userId = await getUserIdFromRequest(request)

  if (!userId) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      ),
    }
  }

  try {
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()
    const profile = profileDoc.data()
    const tier = (profile?.subscription_tier || "free") as "free" | "pro" | "enterprise"
    const subscriptionStatus = profile?.subscription_status as string | undefined

    // Check tier level (enterprise satisfies pro requirement)
    const tierHierarchy = { free: 0, pro: 1, enterprise: 2 }
    const hasRequiredTier = tierHierarchy[tier] >= tierHierarchy[requiredTier]

    // Also check that subscription is not in a degraded state
    const isInactive = subscriptionStatus && INACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)

    if (!hasRequiredTier || isInactive) {
      const message = isInactive
        ? "Your subscription is inactive. Please resolve your payment issue to access this feature."
        : `This feature requires a ${requiredTier} subscription.`

      return {
        allowed: false,
        userId,
        tier,
        response: NextResponse.json(
          {
            error: "Pro feature required",
            message,
            code: "PRO_REQUIRED",
            subscription_status: subscriptionStatus || null,
          },
          { status: 403 }
        ),
      }
    }

    return { allowed: true, userId, tier }
  } catch (error) {
    logger.error("Tier check failed", { userId, error })
    // Fail open for tier check — don't block users due to transient errors
    return { allowed: true, userId }
  }
}

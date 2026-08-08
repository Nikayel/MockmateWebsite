/**
 * Quota Enforcement Middleware
 *
 * Ensures users stay within their subscription tier limits:
 * - Free: 8 sessions/month, $0.50 budget
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
import { getSessionsLimitForTier, isPaidTier } from "./pricing"
import { resolveBudgetCap } from "./usage/budget"
import { CIRCUIT_BREAKER } from "./constants"
import { PRICING_CONFIG } from "./config"
import { isGlobalCeilingExceeded } from "./global-spend-guard"
import { getUserDailyCost, resolveDailyBudgetCap } from "./usage-tracking"
import { billingPeriodFromProfile, type BillingProfileFields } from "./quota/billing-period"

/**
 * Options for quota enforcement.
 */
export interface QuotaOptions {
  /**
   * When true, requests without a verified Firebase auth token are rejected
   * with 401 "please sign in" — used for cost-bearing AI/execution routes so
   * signed-out (anonymous OR guest-header-only) callers cannot drive spend.
   */
  requireAuth?: boolean
}

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

// Budget limits per tier (in dollars) resolve through lib/usage/budget.ts, the
// single owner of the question. Indexing AI_BUDGET_CAPS with the tier directly
// (as this did) ignores the per-user `custom_budget_cap` an admin can set, so
// raising someone's budget in the admin UI had no effect on enforcement.

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
        reason: `Your free guest session is used up. Create a free account to get ${PRICING_CONFIG.free.sessionsDisplay}. No credit card needed.`,
      }
    }

    // A guest with no completed session is allowed, whether or not an unfinished
    // session already exists.
    //
    // There used to be a hasActiveSession scan here checking a 48-hour expiry. It
    // was dead: its own comment ("either no active session or has one active")
    // covers both branches, and the result was never read before the unconditional
    // allow below. It was also the only place asserting 48 hours, against the 7-day
    // guest expiry in lib/constants.ts and app/api/guest-session/route.ts, so
    // deleting it removes a contradictory rule rather than a real one.
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
async function getUserQuota(
  userId: string,
  // PERF-S4: callers that already fetched the profile (e.g. checkQuota, which
  // reads it for the degraded-subscription gate) pass its billing fields so we
  // skip a second profile read here. Omitted callers still read it below.
  knownProfile?: BillingProfileFields
): Promise<UserQuota | null> {
  try {
    const now = new Date()
    // usage_summaries stay keyed by calendar month (that is the budget
    // writer's key) — independent of the quota billing window computed below.
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    // Get quota documents - limit to recent entries only (max 12 months of history)
    const quotaQueryPromise = adminDb
      .collection("profile_quota")
      .where("user_id", "==", userId)
      .orderBy("period_start", "desc")
      .limit(12)
      .get()

    // Get usage summary for budget tracking
    const usageSummaryPromise = adminDb
      .collection("users")
      .doc(userId)
      .collection("usage_summaries")
      .doc(periodKey)
      .get()

    // Batch fetch in parallel for better performance. Only read the profile when
    // the caller did not already resolve the tier.
    let billingProfile: BillingProfileFields
    let quotaQuery: FirebaseFirestore.QuerySnapshot
    let usageSummaryDoc: FirebaseFirestore.DocumentSnapshot
    if (knownProfile) {
      ;[quotaQuery, usageSummaryDoc] = await Promise.all([quotaQueryPromise, usageSummaryPromise])
      billingProfile = knownProfile
    } else {
      const [profileDoc, quotaResult, usageResult] = await Promise.all([
        adminDb.collection("profiles").doc(userId).get(),
        quotaQueryPromise,
        usageSummaryPromise,
      ])
      quotaQuery = quotaResult
      usageSummaryDoc = usageResult
      billingProfile = (profileDoc.data() ?? {}) as BillingProfileFields
    }
    const tier = billingProfile.subscription_tier || "free"

    // QUOTA-1: match quota docs against the SAME anniversary/Stripe billing
    // window every writer uses. The old calendar-month window disagreed with
    // the writers' anniversary periods at month boundaries, mis-reporting
    // usage right when a period rolled over.
    const { periodStart: currentPeriodStart, periodEnd: currentPeriodEnd } =
      billingPeriodFromProfile(billingProfile, now)

    // Find current period quota from limited results.
    //
    // SECURITY: Firestore rules let a client CREATE additional profile_quota
    // docs for the current period with sessions_used: 0. If we simply took the
    // first match, a user could mint a fresh zero-usage doc to reset their
    // session count and bypass the free-tier limit. Defend on the read side by
    // choosing the MOST-CONSERVATIVE matching doc: highest sessions_used, and on
    // ties the fewest free_opens_remaining. A forged zero-usage doc can then
    // never lower the reported usage (the create rule also pins free_opens to 0,
    // so free opens cannot be inflated). See FIXES.md for the server-authoritative
    // follow-up that removes client writes entirely.
    const currentPeriodQuotas = quotaQuery.docs
      .map((doc) => doc.data())
      .filter((q) => {
        const qStart = new Date(q.period_start)
        return qStart >= currentPeriodStart && qStart <= currentPeriodEnd
      })

    const quota = currentPeriodQuotas.reduce<FirebaseFirestore.DocumentData | undefined>(
      (mostUsed, candidate) => {
        if (!mostUsed) return candidate
        const candidateUsed = candidate.sessions_used ?? 0
        const bestUsed = mostUsed.sessions_used ?? 0
        if (candidateUsed > bestUsed) return candidate
        if (candidateUsed < bestUsed) return mostUsed
        // Tie on sessions_used → prefer the doc granting the fewest free opens.
        return (candidate.free_opens_remaining ?? 0) < (mostUsed.free_opens_remaining ?? 0)
          ? candidate
          : mostUsed
      },
      undefined
    )

    const usageSummary = usageSummaryDoc.data()
    const budgetUsed = usageSummary?.totalCost || 0

    // Get session limits based on tier (single source of truth — DUP-2)
    const sessionsLimit = getSessionsLimitForTier(tier)

    return {
      sessionsUsed: quota?.sessions_used || 0,
      sessionsLimit,
      freeOpensRemaining: quota?.free_opens_remaining || 0,
      budgetUsed,
      budgetLimit: resolveBudgetCap(billingProfile),
      periodStart: currentPeriodStart.toISOString(),
      periodEnd: currentPeriodEnd.toISOString(),
    }
  } catch (error) {
    logger.error("Failed to get user quota", { userId, error })
    return null
  }
}

/**
 * The refusal returned when the platform-wide daily spend ceiling is reached.
 *
 * One definition, because it is produced from two places in checkQuota: an early
 * gate that covers the guest and anonymous branches (which return before the
 * quota document is ever loaded) and a later one on the authenticated path that
 * can fill in real quota numbers. Two hand-written copies of a 503 is how the
 * two paths drift into telling users different things about the same outage.
 */
function ceilingBlockedResult(
  userId: string,
  tier: QuotaCheckResult["tier"]
): QuotaCheckResult & { response: NextResponse } {
  const response = NextResponse.json(
    {
      error: "Service temporarily unavailable",
      message:
        "AI features are temporarily paused due to unusually high usage. Please try again later.",
      code: "GLOBAL_CAPACITY_LIMIT",
    },
    { status: 503 }
  )

  logger.error("Blocked request: global daily spend ceiling reached", { userId, tier })

  return {
    allowed: false,
    userId,
    tier,
    sessionsUsed: 0,
    sessionsLimit: 0,
    budgetUsed: 0,
    budgetLimit: 0,
    message: "Service temporarily unavailable",
    code: "GLOBAL_CAPACITY_LIMIT",
    response,
  }
}

/**
 * Check if user has exceeded their quota
 */
export async function checkQuota(
  request: NextRequest,
  options: QuotaOptions = {}
): Promise<QuotaCheckResult & { response?: NextResponse }> {
  // Get user ID from auth header only (never from body for security)
  const userId = await getUserIdFromRequest(request)

  // Cost-bearing routes require a signed-in user. Reject anonymous AND
  // guest-header-only callers up front so they cannot reach paid AI/execution.
  if (!userId && options.requireAuth) {
    const response = NextResponse.json(
      {
        error: "Authentication required",
        message: "Please sign in to continue.",
        code: "AUTH_REQUIRED",
      },
      { status: 401 }
    )

    logger.info("Blocked unauthenticated request to cost-bearing route")

    return {
      allowed: false,
      userId: "anonymous",
      tier: "free",
      sessionsUsed: 0,
      sessionsLimit: 0,
      budgetUsed: 0,
      budgetLimit: 0,
      message: "Please sign in to continue.",
      code: "AUTH_REQUIRED",
      response,
    }
  }

  // Global aggregate kill-switch, applied BEFORE the guest and anonymous
  // branches below.
  //
  // Both of those branches return `allowed: true` and return EARLY, so for as
  // long as the ceiling was only checked further down (on the authenticated
  // path) a spend emergency stopped signed-in users while leaving guest and
  // anonymous traffic running. That is backwards: those are the callers with no
  // per-user budget to exhaust, so they are the ones a platform-wide ceiling is
  // the only control over.
  //
  // Placed after the requireAuth rejection above so an anonymous caller on a
  // cost-bearing route still gets 401 rather than learning the platform's
  // operational state from a 503.
  if (await isGlobalCeilingExceeded()) {
    return ceilingBlockedResult(userId || "anonymous", "free")
  }

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
    //
    // Applies to every paid tier, not just "pro". This used to read
    // `tier === "pro"`, which let an enterprise account in past_due keep working
    // here while requireTierForUser (same file) blocked it, so the same degraded
    // account was allowed on one route and 403'd on the next.
    if (
      isPaidTier(tier) &&
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

    // Get user quota. PERF-S4: reuse the profile we just read for the
    // degraded-subscription gate so getUserQuota does not read it again (and so
    // it can compute the anniversary billing window from the same fields).
    const quota = await getUserQuota(userId, {
      subscription_tier: tier,
      subscription_type: profile?.subscription_type,
      created_at: profile?.created_at,
      subscription_current_period_end: profile?.subscription_current_period_end,
    })
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
      const sessionLimitMessage =
        tier === "free"
          ? `You've used all ${quota.sessionsLimit} free sessions for this month. Upgrade to Pro for ${PRICING_CONFIG.pro.sessionsPerMonth} sessions per month, a personalized roadmap, and spaced repetition.`
          : `You've used all ${quota.sessionsLimit} Pro sessions for this month. Your limit resets on the 1st.`
      const response = NextResponse.json(
        {
          error: "Session limit exceeded",
          message: sessionLimitMessage,
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
      const budgetMessage =
        tier === "free"
          ? "You've hit this month's free AI usage limit. Upgrade to Pro for a 50x higher AI allowance plus 35 interview sessions."
          : `You've used your full $${quota.budgetLimit.toFixed(2)} AI allowance for this month. Your allowance resets on the 1st.`
      const response = NextResponse.json(
        {
          error: "Budget limit exceeded",
          message: budgetMessage,
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

    // Per-user DAILY spend cap. The monthly budget above bounds the total but
    // says nothing about the rate, so a whole month's allowance could be burned
    // in one afternoon with nothing objecting. That is not hypothetical: the
    // session quota increments once per session start while cost accrues per AI
    // call, so a single long session (or a client stuck in a loop inside one)
    // can drain the month without ever consuming a second session.
    //
    // Sized at half the monthly cap so it does not bind before the session
    // quota does — a user can still spend their whole monthly session
    // allowance in one sitting — while halving the blast radius of any single
    // account on any single day.
    const dailyBudgetCap = resolveDailyBudgetCap(quota.budgetLimit)
    if (dailyBudgetCap > 0) {
      // Deliberately NOT wrapped in its own try/catch. getUserDailyCost throws
      // rather than reporting 0 on a read failure, and letting that reach the
      // outer handler routes it through the circuit breaker, which is the one
      // place in this file that decides how to behave when Firestore is
      // unreadable. Swallowing it here would silently disable the cap instead.
      const dailyCostUsed = await getUserDailyCost(userId)

      if (dailyCostUsed >= dailyBudgetCap) {
        const response = NextResponse.json(
          {
            error: "Daily AI limit reached",
            message:
              `You've used today's AI allowance ($${dailyBudgetCap.toFixed(2)}). ` +
              `It resets at midnight UTC, and your monthly allowance is unaffected.`,
            code: "DAILY_BUDGET_EXCEEDED",
            quota: {
              dailyCostUsed,
              dailyBudgetCap,
              budgetUsed: quota.budgetUsed,
              budgetLimit: quota.budgetLimit,
              tier,
            },
          },
          { status: 429 }
        )

        logger.warn("Quota exceeded - daily budget", {
          userId,
          tier,
          dailyCostUsed,
          dailyBudgetCap,
          monthlyBudgetUsed: quota.budgetUsed,
        })

        return {
          allowed: false,
          userId,
          tier,
          sessionsUsed: quota.sessionsUsed,
          sessionsLimit: quota.sessionsLimit,
          budgetUsed: quota.budgetUsed,
          budgetLimit: quota.budgetLimit,
          message: "Daily AI limit reached",
          code: "DAILY_BUDGET_EXCEEDED",
          response,
        }
      }
    }

    // Global aggregate kill-switch: bound total platform AI spend per day
    // regardless of how many individual (within-budget) users are active.
    //
    // Re-checked here rather than relying on the early gate alone: the reads
    // above (quota document, daily cost) take real time, and a ceiling crossed
    // during them should still stop this request. The early gate covers the
    // guest and anonymous branches that never reach this line.
    if (await isGlobalCeilingExceeded()) {
      return {
        ...ceilingBlockedResult(userId, tier),
        // The quota document is loaded by this point, so report the real
        // numbers rather than the placeholders the early gate has to use.
        sessionsUsed: quota.sessionsUsed,
        sessionsLimit: quota.sessionsLimit,
        budgetUsed: quota.budgetUsed,
        budgetLimit: quota.budgetLimit,
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
  request: NextRequest,
  options: QuotaOptions = {}
): Promise<{ allowed: boolean; response?: NextResponse; userId?: string; tier?: string }> {
  const result = await checkQuota(request, options)

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

  return requireTierForUser(userId, requiredTier)
}

/**
 * Tier gate for routes that have ALREADY verified the caller's identity
 * (e.g. via verifyAuth). Skips the redundant ID-token verification that
 * requireTier performs and runs only the Firestore tier/subscription check.
 *
 * Returns the same contract as requireTier, so a route can swap
 *   requireTier(request, "pro")  ->  requireTierForUser(authResult.userId, "pro")
 * without changing how it handles the result.
 *
 * Use requireTier (not this) when the route has no prior verifyAuth and needs
 * the token verified.
 */
export async function requireTierForUser(
  userId: string,
  requiredTier: "pro" | "enterprise"
): Promise<{ allowed: boolean; response?: NextResponse; userId?: string; tier?: string }> {
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

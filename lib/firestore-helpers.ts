/**
 * Firestore helper functions for creating and managing user data
 */

import { db } from "./firebase"
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  increment,
  limit,
  orderBy,
} from "firebase/firestore"
import { Profile, ProfileQuota } from "./types"
import { PRICING_CONFIG } from "./config"
import { calculateTechnicalScoreFromBreakdown } from "./constants"

/**
 * Sanitize test results for Firestore storage
 * Firestore doesn't support nested arrays, so we stringify complex values
 */
function sanitizeTestResultsForFirestore(testResults: Array<any>): Array<any> {
  return testResults.map((t: any) => ({
    description: t.description,
    passed: t.passed,
    input: JSON.stringify(t.input),
    expected: JSON.stringify(t.expected),
    actual: JSON.stringify(t.actual),
    error: t.error,
  }))
}

/**
 * Copy defined fields from source to target object.
 * Firestore doesn't allow undefined values, so this helper
 * only copies fields that are not undefined.
 */
function copyDefinedFields<T extends Record<string, any>>(
  target: Record<string, any>,
  source: T | null | undefined,
  fields: (keyof T)[]
): void {
  if (!source) return
  for (const field of fields) {
    if (source[field] !== undefined) {
      target[field as string] = source[field]
    }
  }
}

/**
 * Create or update user profile in Firestore
 */
export async function createOrUpdateProfile(
  userId: string,
  email: string,
  displayName?: string | null,
  photoURL?: string | null
): Promise<Profile> {
  if (!userId) {
    throw new Error("User ID is required to create/update profile")
  }

  // Note: Some providers might not provide email immediately - allow empty email

  const profileRef = doc(db, "profiles", userId)

  // Check if profile exists first
  let profileSnap
  let existingProfile: Profile | null = null
  try {
    profileSnap = await getDoc(profileRef)
    if (profileSnap.exists()) {
      existingProfile = profileSnap.data() as Profile
    }
  } catch {
    // Continue anyway - we'll try to create it
    profileSnap = { exists: () => false, data: () => null } as any
  }

  // Only set subscription_tier to "free" for NEW profiles
  // For existing profiles, preserve their current subscription tier
  const isNewProfile = !existingProfile
  const subscriptionTier = isNewProfile ? "free" : existingProfile?.subscription_tier || "free"

  // Build profile data, filtering out undefined values for Firestore
  // Firestore doesn't allow undefined values, so we only include defined fields
  const profileDataForFirestore: Record<string, any> = {
    id: userId,
    email: email || "", // Ensure email is at least empty string, not undefined
    subscription_tier: subscriptionTier,
    created_at: existingProfile?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Only add optional fields if they have values (not undefined)
  if (displayName) {
    profileDataForFirestore.full_name = displayName
  }
  if (photoURL) {
    profileDataForFirestore.avatar_url = photoURL
  }

  // Preserve existing subscription and profile data if profile exists
  copyDefinedFields(profileDataForFirestore, existingProfile, [
    // Subscription fields
    "subscription_status",
    "stripe_customer_id",
    "stripe_subscription_id",
    "subscription_start_date",
    "subscription_current_period_end",
    "subscription_platform",
    // Onboarding fields
    "onboarding_completed",
    "onboarding_completed_at",
    "role",
    "goal",
    // Email/notification fields
    "welcome_email_sent",
    "notification_preferences",
  ])

  // Set default notification preferences for new profiles (required for email cron to work)
  if (isNewProfile && !profileDataForFirestore.notification_preferences) {
    profileDataForFirestore.notification_preferences = {
      email_notifications_enabled: true,
      inactivity_reminders: true,
      spaced_repetition_reminders: true,
      milestone_celebrations: true,
      marketing_emails: false,
    }
  }

  // Build the Profile object for return (can have undefined optional fields)
  const profileData: Profile = {
    id: userId,
    email: email || "",
    full_name: displayName || undefined,
    avatar_url: photoURL || undefined,
    subscription_tier: subscriptionTier,
    subscription_status: existingProfile?.subscription_status,
    stripe_customer_id: existingProfile?.stripe_customer_id,
    stripe_subscription_id: existingProfile?.stripe_subscription_id,
    subscription_start_date: existingProfile?.subscription_start_date,
    subscription_current_period_end: existingProfile?.subscription_current_period_end,
    subscription_platform: existingProfile?.subscription_platform,
    created_at: existingProfile?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    welcome_email_sent: existingProfile?.welcome_email_sent,
  }

  try {
    await setDoc(profileRef, profileDataForFirestore, { merge: true })
    return profileData
  } catch (writeError: any) {
    // Re-throw with more context
    throw new Error(
      `Failed to save profile: ${writeError.message || "Unknown error"} (Code: ${writeError.code || "unknown"})`
    )
  }
}

/**
 * Get user profile from Firestore
 * If user has Stripe subscription info but tier is free, sync from Stripe
 */
export async function getUserProfile(
  userId: string,
  syncStripe: boolean = true
): Promise<Profile | null> {
  const profileRef = doc(db, "profiles", userId)
  const profileSnap = await getDoc(profileRef)

  if (!profileSnap.exists()) {
    return null
  }

  const profile = profileSnap.data() as Profile

  // If user has Stripe IDs, verify subscription status matches
  // This catches cases where tier was incorrectly reset to "free"
  // Only sync on server-side (check if we're in a server environment)
  if (syncStripe && (profile.stripe_subscription_id || profile.stripe_customer_id)) {
    try {
      // Only sync if we're on the server (have access to STRIPE_SECRET_KEY)
      // Client-side will use the API endpoint instead
      if (typeof window === "undefined" && process.env.STRIPE_SECRET_KEY) {
        const { syncSubscriptionFromStripe } = await import("./stripe-helpers")
        const syncedProfile = await syncSubscriptionFromStripe(userId)
        return syncedProfile || profile
      }
    } catch {
      // Return existing profile if sync fails
      return profile
    }
  }

  return profile
}

/**
 * Calculate billing period based on anniversary date
 * Returns the current period start/end based on the signup date anniversary
 */
function calculateAnniversaryPeriod(
  signupDate: Date,
  referenceDate: Date = new Date()
): { periodStart: Date; periodEnd: Date } {
  const signupDay = signupDate.getDate()
  const now = referenceDate

  // Find the most recent anniversary of the signup day
  let periodStart = new Date(now.getFullYear(), now.getMonth(), signupDay)

  // If today is before the signup day this month, go back one month
  if (now.getDate() < signupDay) {
    periodStart.setMonth(periodStart.getMonth() - 1)
  }

  // Handle edge case: if signup day doesn't exist in this month (e.g., 31st in Feb)
  // Use the last day of the previous month
  if (periodStart.getDate() !== signupDay) {
    periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0) // Last day of month
  }

  // Period end is one month from period start, minus one day (at 23:59:59)
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)
  periodEnd.setDate(periodEnd.getDate() - 1)
  periodEnd.setHours(23, 59, 59, 999)

  return { periodStart, periodEnd }
}

/**
 * Initialize user quota for the current billing period
 * Uses anniversary-based billing (resets monthly from signup date, not 1st of month)
 * For paid users with Stripe, uses Stripe's billing period
 */
export async function initializeUserQuota(
  userId: string,
  subscriptionTier: "free" | "pro" | "enterprise" = "free",
  signupDate?: Date | string,
  stripeCurrentPeriodEnd?: Date | string
): Promise<ProfileQuota> {
  const now = new Date()
  let periodStart: Date
  let periodEnd: Date

  // For Pro users with Stripe billing info, use Stripe's period
  if (subscriptionTier === "pro" && stripeCurrentPeriodEnd) {
    const stripeEnd =
      typeof stripeCurrentPeriodEnd === "string"
        ? new Date(stripeCurrentPeriodEnd)
        : stripeCurrentPeriodEnd
    periodEnd = new Date(stripeEnd)
    periodEnd.setHours(23, 59, 59, 999)
    // Period start is one month before period end
    periodStart = new Date(periodEnd)
    periodStart.setMonth(periodStart.getMonth() - 1)
    periodStart.setDate(periodStart.getDate() + 1)
    periodStart.setHours(0, 0, 0, 0)
  } else if (signupDate) {
    // Use anniversary billing based on signup date
    const signup = typeof signupDate === "string" ? new Date(signupDate) : signupDate
    const period = calculateAnniversaryPeriod(signup, now)
    periodStart = period.periodStart
    periodEnd = period.periodEnd
  } else {
    // Fallback to calendar month if no signup date (shouldn't happen for real users)
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  }

  // Query by user_id with limit to prevent unbounded reads
  // Limit to 12 months of quota history (reasonable maximum)
  const quotaQuery = query(
    collection(db, "profile_quota"),
    where("user_id", "==", userId),
    limit(12)
  )

  const quotaSnap = await getDocs(quotaQuery)

  // Filter by date range in memory to avoid composite index requirement
  // Find quota where current date falls within the stored period OR period_start is in current month
  if (!quotaSnap.empty) {
    const currentPeriodQuota = quotaSnap.docs
      .map((doc) => doc.data() as ProfileQuota)
      .find((quota) => {
        const quotaStart = new Date(quota.period_start)
        const quotaEnd = new Date(quota.period_end)
        // Check if now falls within the stored period (handles existing quotas)
        // OR if the quota's start month matches the calculated period's month (handles mismatched dates)
        const nowInStoredPeriod = now >= quotaStart && now <= quotaEnd
        const sameMonth =
          quotaStart.getFullYear() === periodStart.getFullYear() &&
          quotaStart.getMonth() === periodStart.getMonth()
        return nowInStoredPeriod || sameMonth
      })

    if (currentPeriodQuota) {
      // Update quota limit if subscription tier changed
      const sessionsLimit =
        subscriptionTier === "pro"
          ? PRICING_CONFIG.pro.sessionsPerMonth
          : PRICING_CONFIG.free.sessionsPerMonth

      // Check if we need to update anything
      let needsUpdate = false
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      // If limit changed, update it
      if (currentPeriodQuota.sessions_limit !== sessionsLimit) {
        updateData.sessions_limit = sessionsLimit
        currentPeriodQuota.sessions_limit = sessionsLimit
        needsUpdate = true
      }

      // Cap sessions_used if it exceeds the limit (e.g., after downgrade)
      if (currentPeriodQuota.sessions_used > sessionsLimit) {
        updateData.sessions_used = sessionsLimit
        currentPeriodQuota.sessions_used = sessionsLimit
        needsUpdate = true
      }

      // Update period_end if it differs (e.g., Stripe billing period changed)
      const storedPeriodEnd = new Date(currentPeriodQuota.period_end).getTime()
      const calculatedPeriodEnd = periodEnd.getTime()
      if (Math.abs(storedPeriodEnd - calculatedPeriodEnd) > 60000) {
        // More than 1 minute difference
        updateData.period_end = periodEnd.toISOString()
        currentPeriodQuota.period_end = periodEnd.toISOString()
        needsUpdate = true
      }

      if (needsUpdate) {
        const quotaRef = quotaSnap.docs.find((doc) => {
          const quota = doc.data() as ProfileQuota
          const quotaStart = new Date(quota.period_start)
          const quotaEnd = new Date(quota.period_end)
          const nowInStoredPeriod = now >= quotaStart && now <= quotaEnd
          const sameMonth =
            quotaStart.getFullYear() === periodStart.getFullYear() &&
            quotaStart.getMonth() === periodStart.getMonth()
          return nowInStoredPeriod || sameMonth
        })?.ref

        if (quotaRef) {
          await setDoc(quotaRef, updateData, { merge: true })
        }
      }

      return currentPeriodQuota
    }
  }

  // Create new quota for this period
  // This automatically resets usage when a new month starts
  const sessionsLimit =
    subscriptionTier === "pro"
      ? PRICING_CONFIG.pro.sessionsPerMonth
      : PRICING_CONFIG.free.sessionsPerMonth

  const quotaData: ProfileQuota = {
    id: "", // Will be auto-generated by Firestore
    user_id: userId,
    sessions_used: 0,
    sessions_limit: sessionsLimit,
    free_opens_remaining: 0,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const quotaRef = doc(collection(db, "profile_quota"))
  quotaData.id = quotaRef.id
  await setDoc(quotaRef, quotaData)

  return quotaData
}

/**
 * Check if user has available sessions
 * Also returns period end for UI display
 */
export async function checkUsageLimit(userId: string): Promise<{
  allowed: boolean
  used: number
  limit: number
  freeOpensRemaining: number
  periodEnd: string
}> {
  const profile = await getUserProfile(userId)
  const quota = await initializeUserQuota(
    userId,
    profile?.subscription_tier || "free",
    profile?.created_at,
    profile?.subscription_current_period_end
  )

  return {
    allowed: quota.sessions_used < quota.sessions_limit || (quota.free_opens_remaining || 0) > 0,
    used: quota.sessions_used,
    limit: quota.sessions_limit,
    freeOpensRemaining: quota.free_opens_remaining || 0,
    periodEnd: quota.period_end,
  }
}

/**
 * Check if starting a session will cost usage
 * Returns: { costsUsage: boolean, freeOpensRemaining: number, reason: string }
 *
 * Usage model:
 * - First session costs 1 usage, grants 10 free opens
 * - After 10 opens, next session costs 1 usage, grants 10 more free opens
 * - Pro users have higher limits but same free opens system
 */
export async function checkSessionCost(userId: string): Promise<{
  costsUsage: boolean
  freeOpensRemaining: number
  allowed: boolean
  reason: string
}> {
  const profile = await getUserProfile(userId)
  const quota = await initializeUserQuota(
    userId,
    profile?.subscription_tier || "free",
    profile?.created_at,
    profile?.subscription_current_period_end
  )

  const freeOpens = quota.free_opens_remaining || 0
  const used = quota.sessions_used
  const limit = quota.sessions_limit

  // If user has free opens remaining, no cost
  if (freeOpens > 0) {
    return {
      costsUsage: false,
      freeOpensRemaining: freeOpens,
      allowed: true,
      reason: `${freeOpens} free opens remaining`,
    }
  }

  // No free opens - check if user has usage left
  if (used < limit) {
    return {
      costsUsage: true,
      freeOpensRemaining: 0,
      allowed: true,
      reason: `Will use 1 session (${used + 1}/${limit}), then get 10 free opens`,
    }
  }

  // No free opens and no usage left
  return {
    costsUsage: true,
    freeOpensRemaining: 0,
    allowed: false,
    reason: `Session limit reached (${used}/${limit})`,
  }
}

/**
 * Create a new interview session
 */
export async function createInterviewSession(
  userId: string,
  scenarioTitle: string,
  scenarioType: string,
  difficulty: "easy" | "medium" | "hard",
  scenarioId?: string,
  pattern?: string, // DSA pattern for stats aggregation (e.g., "arrays-hashing", "two-pointers")
  targetCompany?: string // Target company for RAG context and analytics
): Promise<string> {
  const sessionRef = doc(collection(db, "interview_sessions"))
  // Build session data, only including defined fields (Firestore doesn't allow undefined)
  const sessionData: Record<string, any> = {
    id: sessionRef.id,
    user_id: userId,
    topic: scenarioTitle,
    type: scenarioType,
    pattern: pattern || scenarioType, // Store pattern for stats, fallback to type
    difficulty: difficulty,
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Only add scenario_id if it's defined
  if (scenarioId) {
    sessionData.scenario_id = scenarioId
  }

  // Only add target_company if it's defined
  if (targetCompany) {
    sessionData.target_company = targetCompany
  }

  await setDoc(sessionRef, sessionData)
  return sessionRef.id
}

/**
 * Feedback generation status
 * - 'pending': Session submitted, AI feedback is being generated
 * - 'complete': Feedback generation finished, scores are final
 * - 'failed': Feedback generation failed (user can retry)
 */
export type FeedbackStatus = "pending" | "complete" | "failed"

/**
 * Update interview session on completion
 *
 * IMPORTANT: Sessions should be marked as 'pending' initially, then 'complete'
 * after AI feedback generation finishes. This prevents showing incomplete scores.
 */
export async function updateInterviewSession(
  sessionId: string,
  performanceScore?: number,
  feedback?: string,
  additionalData?: {
    code?: string
    language?: string
    testResults?: Array<any>
    timeComplexity?: string
    spaceComplexity?: string
    efficiencyScore?: number
    feedbackStatus?: FeedbackStatus // Track feedback generation state
    technicalScore?: number // Pre-calculated mastery/technical score from API (use this instead of recalculating)
    scoreBreakdown?: {
      understanding?: number
      understandingScore?: number
      problemSolving?: number
      problemSolvingScore?: number
      codeQuality?: number
      codeQualityScore?: number
      communication?: number
      communicationScore?: number
    }
    // Complexity analysis - stores both user-stated and code-analyzed
    complexityAnalysis?: {
      codeAnalyzed: {
        timeComplexity: string
        spaceComplexity: string
        confidence: "low" | "medium" | "high"
        detectedPatterns?: string[]
      }
      userStated?: {
        timeComplexity: string | null
        spaceComplexity: string | null
        timestamp: number
      }
      approachUsed?: string
      isAccurate?: boolean
      feedback?: string
    }
    // Constitutional AI critique metadata (for debugging/transparency)
    constitutionalAICritique?: {
      scoreCritique?: {
        critiques: Array<{ aspect: string; passed: boolean; issue: string; suggestion: string }>
        reasoning: string
        originalScores: Record<string, number>
        adjustedScores: Record<string, number>
      } | null
      feedbackCritique?: {
        critiques: Array<{ aspect: string; passed: boolean; issue: string; suggestion: string }>
        reasoning: string
      } | null
    }
    // Clarifying questions assessment (Real Interview Mode)
    clarifyingQuestionsAssessment?: {
      score: number
      totalExpected: number
      totalAsked: number
      requiredAsked: number
      requiredTotal: number
      results: Array<{
        question: string
        required: boolean
        asked: boolean
        matchedPhrase?: string
      }>
    }
  }
): Promise<void> {
  const sessionRef = doc(db, "interview_sessions", sessionId)
  const updateData: any = {
    completed_at: new Date().toISOString(),
    feedback_status: additionalData?.feedbackStatus || "pending", // Default to pending
    updated_at: new Date().toISOString(),
  }

  // Only add performance_score and feedback if defined (Firestore doesn't allow undefined)
  if (performanceScore !== undefined) {
    updateData.performance_score = performanceScore
  }
  if (feedback !== undefined) {
    updateData.feedback = feedback
  }

  // Save additional completion data
  if (additionalData) {
    if (additionalData.code) updateData.final_code = additionalData.code
    if (additionalData.language) updateData.language = additionalData.language
    if (additionalData.testResults) {
      updateData.test_results = sanitizeTestResultsForFirestore(additionalData.testResults)
      updateData.tests_passed = additionalData.testResults.filter((t: any) => t.passed).length
      updateData.tests_total = additionalData.testResults.length
    }
    if (additionalData.timeComplexity) updateData.time_complexity = additionalData.timeComplexity
    if (additionalData.spaceComplexity) updateData.space_complexity = additionalData.spaceComplexity
    if (additionalData.efficiencyScore) updateData.efficiency_score = additionalData.efficiencyScore
    // Save technical_score (mastery score) - prefer pre-calculated value from API
    // This ensures consistency between post-session display and sessions list
    if (additionalData.technicalScore !== undefined) {
      // Use the pre-calculated mastery score from the API (most accurate)
      updateData.technical_score = additionalData.technicalScore
      updateData.mastery_score = additionalData.technicalScore
    }

    // Save score breakdown for technical score calculations (required for pattern ranking)
    if (additionalData.scoreBreakdown) {
      // Extract scores, handling both naming conventions (understanding/understandingScore, etc.)
      // Only include defined values to prevent Firebase errors
      const understandingScore =
        additionalData.scoreBreakdown.understanding !== undefined
          ? additionalData.scoreBreakdown.understanding
          : additionalData.scoreBreakdown.understandingScore !== undefined
            ? additionalData.scoreBreakdown.understandingScore
            : undefined
      const problemSolvingScore =
        additionalData.scoreBreakdown.problemSolving !== undefined
          ? additionalData.scoreBreakdown.problemSolving
          : additionalData.scoreBreakdown.problemSolvingScore !== undefined
            ? additionalData.scoreBreakdown.problemSolvingScore
            : undefined
      const codeQualityScore =
        additionalData.scoreBreakdown.codeQuality !== undefined
          ? additionalData.scoreBreakdown.codeQuality
          : additionalData.scoreBreakdown.codeQualityScore !== undefined
            ? additionalData.scoreBreakdown.codeQualityScore
            : undefined
      const communicationScore =
        additionalData.scoreBreakdown.communication !== undefined
          ? additionalData.scoreBreakdown.communication
          : additionalData.scoreBreakdown.communicationScore !== undefined
            ? additionalData.scoreBreakdown.communicationScore
            : undefined

      // Build score_breakdown object, only including defined values
      // This prevents Firebase errors from undefined field values
      const scores = {
        understandingScore,
        problemSolvingScore,
        codeQualityScore,
        communicationScore,
      }
      const scoreBreakdownObj: Record<string, number> = {}
      copyDefinedFields(scoreBreakdownObj, scores, Object.keys(scores) as (keyof typeof scores)[])

      // Only save score_breakdown if we have at least one defined score
      if (Object.keys(scoreBreakdownObj).length > 0) {
        updateData.score_breakdown = scoreBreakdownObj
      }

      // Fallback: calculate technical_score from breakdown if no pre-calculated value provided
      if (
        additionalData.technicalScore === undefined &&
        codeQualityScore !== undefined &&
        problemSolvingScore !== undefined &&
        understandingScore !== undefined
      ) {
        updateData.technical_score = calculateTechnicalScoreFromBreakdown({
          codeQualityScore,
          problemSolvingScore,
          understandingScore,
        })
        updateData.mastery_score = updateData.technical_score
      }
    }
    // Save complexity analysis (user-stated vs code-analyzed)
    if (additionalData.complexityAnalysis) {
      updateData.complexity_analysis = {
        code_analyzed: {
          time_complexity: additionalData.complexityAnalysis.codeAnalyzed.timeComplexity,
          space_complexity: additionalData.complexityAnalysis.codeAnalyzed.spaceComplexity,
          confidence: additionalData.complexityAnalysis.codeAnalyzed.confidence,
          detected_patterns: additionalData.complexityAnalysis.codeAnalyzed.detectedPatterns || [],
        },
        user_stated: additionalData.complexityAnalysis.userStated
          ? {
              time_complexity: additionalData.complexityAnalysis.userStated.timeComplexity,
              space_complexity: additionalData.complexityAnalysis.userStated.spaceComplexity,
              timestamp: additionalData.complexityAnalysis.userStated.timestamp,
            }
          : null,
        approach_used: additionalData.complexityAnalysis.approachUsed || null,
        is_accurate: additionalData.complexityAnalysis.isAccurate ?? null,
        feedback: additionalData.complexityAnalysis.feedback || null,
      }
    }
    // Save Constitutional AI critique for debugging/transparency
    if (additionalData.constitutionalAICritique) {
      updateData.constitutional_ai_critique = additionalData.constitutionalAICritique
    }
    // Save clarifying questions assessment (Real Interview Mode)
    if (additionalData.clarifyingQuestionsAssessment) {
      updateData.clarifying_questions_assessment = additionalData.clarifyingQuestionsAssessment
    }
  }

  await setDoc(sessionRef, updateData, { merge: true })
}

/**
 * Mark a session as being evaluated (feedback generation in progress)
 * This should be called BEFORE feedback generation starts to prevent
 * the session from being reopened while evaluation is in progress
 */
export async function markSessionEvaluating(
  sessionId: string,
  state: {
    code: string
    language: string
    elapsedTime: number
    chatMessages?: Array<{ type: string; message: string }>
    interviewerMessages?: Array<{ type: string; message: string }>
    testResults?: Array<any>
    testSummary?: { total: number; passed: number; failed: number; passRate: number }
    isPostInterviewDiscussion?: boolean
  }
): Promise<void> {
  try {
    const sessionRef = doc(db, "interview_sessions", sessionId)
    await setDoc(
      sessionRef,
      {
        feedback_status: "pending",
        completed_at: new Date().toISOString(), // Mark as completed when evaluation starts
        final_code: state.code,
        language: state.language,
        elapsed_time: state.elapsedTime,
        // Save full session state for recovery
        session_state: {
          code: state.code,
          language: state.language,
          elapsed_time: state.elapsedTime,
          chat_messages: state.chatMessages || [],
          interviewer_messages: state.interviewerMessages || [],
          ...(state.testResults && {
            test_results: sanitizeTestResultsForFirestore(state.testResults.slice(-20)),
          }),
          ...(state.testSummary && { test_summary: state.testSummary }),
          is_post_interview_discussion: state.isPostInterviewDiscussion ?? true, // Default to true when marking evaluating
          saved_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    )
  } catch (error) {
    console.error("Failed to mark session as evaluating:", error)
    // Re-throw so caller knows the mark failed
    throw error
  }
}

/**
 * Save in-progress session state for recovery
 * Called periodically during active interview
 */
export async function saveSessionState(
  sessionId: string,
  state: {
    code: string
    selectedLanguage: string
    elapsedTime: number
    chatMessages?: Array<{ type: string; message: string }>
    interviewerMessages?: Array<{ type: string; message: string }>
    testResults?: Array<any>
    testSummary?: { total: number; passed: number; failed: number; passRate: number }
    isPostInterviewDiscussion?: boolean
    realInterviewMode?: boolean
    strictTimeLimit?: number | null
  }
): Promise<void> {
  try {
    const sessionRef = doc(db, "interview_sessions", sessionId)
    await setDoc(
      sessionRef,
      {
        session_state: {
          code: state.code,
          language: state.selectedLanguage,
          elapsed_time: state.elapsedTime,
          chat_messages: state.chatMessages,
          interviewer_messages: state.interviewerMessages,
          test_results: state.testResults
            ? sanitizeTestResultsForFirestore(state.testResults.slice(-20))
            : undefined,
          test_summary: state.testSummary,
          is_post_interview_discussion: state.isPostInterviewDiscussion ?? false,
          real_interview_mode: state.realInterviewMode,
          strict_time_limit: state.strictTimeLimit,
          saved_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    )
  } catch {
    // Non-blocking - localStorage backup exists
  }
}

/**
 * Get session state for recovery
 */
export async function getSessionState(sessionId: string): Promise<{
  code?: string
  language?: string
  elapsedTime?: number
  chatMessages?: Array<{ type: string; message: string }>
  interviewerMessages?: Array<{ type: string; message: string }>
  testResults?: Array<any>
  testSummary?: { total: number; passed: number; failed: number; passRate: number }
  isPostInterviewDiscussion?: boolean
  realInterviewMode?: boolean
  strictTimeLimit?: number | null
  savedAt?: string
  completedAt?: string
  feedbackStatus?: FeedbackStatus
  performanceScore?: number
  feedback?: string
} | null> {
  try {
    const sessionRef = doc(db, "interview_sessions", sessionId)
    const sessionSnap = await getDoc(sessionRef)

    if (!sessionSnap.exists()) return null

    const data = sessionSnap.data()

    // Return completion info even if no session_state (session was submitted)
    const result: {
      code?: string
      language?: string
      elapsedTime?: number
      chatMessages?: Array<{ type: string; message: string }>
      interviewerMessages?: Array<{ type: string; message: string }>
      testResults?: Array<any>
      testSummary?: { total: number; passed: number; failed: number; passRate: number }
      isPostInterviewDiscussion?: boolean
      realInterviewMode?: boolean
      strictTimeLimit?: number | null
      savedAt?: string
      completedAt?: string
      feedbackStatus?: FeedbackStatus
      performanceScore?: number
      feedback?: string
    } = {
      completedAt: data.completed_at,
      feedbackStatus: data.feedback_status,
      performanceScore: data.performance_score,
      feedback: data.feedback,
    }

    // Add session state if available
    if (data.session_state) {
      result.code = data.session_state.code
      result.language = data.session_state.language
      result.elapsedTime = data.session_state.elapsed_time
      result.chatMessages = data.session_state.chat_messages
      result.interviewerMessages = data.session_state.interviewer_messages
      result.testResults = data.session_state.test_results
      result.testSummary = data.session_state.test_summary
      result.isPostInterviewDiscussion = data.session_state.is_post_interview_discussion ?? false
      result.realInterviewMode = data.session_state.real_interview_mode
      result.strictTimeLimit = data.session_state.strict_time_limit
      result.savedAt = data.session_state.saved_at
    }

    return result
  } catch {
    return null
  }
}

/**
 * Find the latest submitted or evaluating session for a scenario
 * Returns the session ID if found and it was completed/submitted or is being evaluated
 */
export async function findLatestSubmittedSession(
  userId: string,
  scenarioId: string
): Promise<{
  sessionId: string
  completedAt?: string
  feedbackStatus?: FeedbackStatus
  isEvaluating?: boolean
} | null> {
  try {
    const sessionsRef = collection(db, "interview_sessions")
    const q = query(
      sessionsRef,
      where("user_id", "==", userId),
      where("scenario_id", "==", scenarioId),
      orderBy("created_at", "desc"),
      limit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    const data = doc.data()

    // Return if the session was completed (has completed_at)
    if (data.completed_at) {
      return {
        sessionId: doc.id,
        completedAt: data.completed_at,
        feedbackStatus: data.feedback_status,
        isEvaluating: data.feedback_status === "pending",
      }
    }

    // Also return if the session is being evaluated (has feedback_status = "pending")
    // This happens when user submitted but feedback generation is still in progress
    if (data.feedback_status === "pending") {
      return {
        sessionId: doc.id,
        feedbackStatus: data.feedback_status,
        isEvaluating: true,
      }
    }

    // Check if session has saved state (user was working on it)
    // but only if it's not an abandoned session (older than 24 hours without activity)
    if (data.session_state?.saved_at) {
      const savedAt = new Date(data.session_state.saved_at)
      const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60)

      // If saved within last 24 hours and has significant progress, treat as in-progress
      if (
        hoursSinceSave < 24 &&
        (data.session_state.elapsed_time > 60 ||
          (data.session_state.chat_messages && data.session_state.chat_messages.length > 1))
      ) {
        // This is an in-progress session, not a submitted one
        // Return null so the interview page can restore it
        return null
      }
    }

    return null
  } catch (error) {
    console.error("Error finding latest submitted session:", error)
    return null
  }
}

/**
 * Record session start and manage usage
 *
 * New model:
 * - If user has free opens, decrement free_opens_remaining
 * - If no free opens, increment sessions_used and grant 10 free opens
 */
export async function recordSessionStart(userId: string): Promise<{
  success: boolean
  usedPaidSession: boolean
  freeOpensRemaining: number
}> {
  const profile = await getUserProfile(userId)
  const quota = await initializeUserQuota(
    userId,
    profile?.subscription_tier || "free",
    profile?.created_at,
    profile?.subscription_current_period_end
  )

  const quotaQuery = query(
    collection(db, "profile_quota"),
    where("user_id", "==", userId),
    where("id", "==", quota.id)
  )

  const quotaSnap = await getDocs(quotaQuery)

  if (quotaSnap.empty) {
    throw new Error("Quota not found")
  }

  const quotaRef = quotaSnap.docs[0].ref
  let usedPaidSession = false
  let newFreeOpens = 0

  await runTransaction(db, async (transaction) => {
    const quotaDoc = await transaction.get(quotaRef)

    if (!quotaDoc.exists()) {
      throw new Error("Quota document does not exist")
    }

    const data = quotaDoc.data()
    const currentUsage = data.sessions_used || 0
    const sessionLimit = data.sessions_limit || 0
    const freeOpens = data.free_opens_remaining || 0

    // If user has free opens, use one
    if (freeOpens > 0) {
      newFreeOpens = freeOpens - 1
      transaction.update(quotaRef, {
        free_opens_remaining: newFreeOpens,
        last_session_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      usedPaidSession = false
    } else {
      // No free opens - need to use a paid session
      if (currentUsage >= sessionLimit) {
        throw new Error("Session limit exceeded")
      }

      // Use 1 session, grant 10 free opens
      newFreeOpens = 10
      transaction.update(quotaRef, {
        sessions_used: increment(1),
        free_opens_remaining: newFreeOpens,
        last_session_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      usedPaidSession = true
    }
  })

  return {
    success: true,
    usedPaidSession,
    freeOpensRemaining: newFreeOpens,
  }
}

/**
 * @deprecated Use recordSessionStart instead
 * Kept for backward compatibility
 */
export async function incrementSessionUsage(userId: string): Promise<void> {
  await recordSessionStart(userId)
}

/**
 * Update user quota when subscription tier changes
 * This ensures existing quotas get updated limits
 */
export async function updateQuotaForSubscriptionTier(
  userId: string,
  subscriptionTier: "free" | "pro" | "enterprise",
  signupDate?: string,
  stripeCurrentPeriodEnd?: string
): Promise<void> {
  // This will update the quota limit if it exists, or create a new one
  await initializeUserQuota(userId, subscriptionTier, signupDate, stripeCurrentPeriodEnd)
}

// ============================================================================
// GUEST SESSION MANAGEMENT
// ============================================================================

/**
 * Create an interview session for a guest user
 * Guest sessions are stored with is_guest: true flag and can be migrated later
 */
export async function createGuestInterviewSession(
  guestId: string,
  scenarioTitle: string,
  scenarioType: string,
  difficulty: "easy" | "medium" | "hard",
  scenarioId?: string,
  pattern?: string
): Promise<string> {
  const sessionRef = doc(collection(db, "interview_sessions"))
  const sessionData = {
    id: sessionRef.id,
    user_id: guestId, // Store the guest ID as user_id for consistency
    is_guest: true,
    topic: scenarioTitle,
    type: scenarioType,
    pattern: pattern || scenarioType,
    scenario_id: scenarioId,
    difficulty: difficulty,
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Guest sessions expire after 48 hours if not claimed
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  }

  await setDoc(sessionRef, sessionData)
  return sessionRef.id
}

/**
 * Get a guest session by ID
 */
export async function getGuestSession(sessionId: string, guestId: string): Promise<any | null> {
  try {
    const sessionRef = doc(db, "interview_sessions", sessionId)
    const sessionSnap = await getDoc(sessionRef)

    if (!sessionSnap.exists()) return null

    const data = sessionSnap.data()

    // Verify this session belongs to the guest
    if (data.user_id !== guestId || !data.is_guest) {
      return null
    }

    return data
  } catch {
    return null
  }
}

/**
 * Update a guest interview session
 */
export async function updateGuestInterviewSession(
  sessionId: string,
  guestId: string,
  updateData: {
    performanceScore?: number
    feedback?: string
    code?: string
    language?: string
    testResults?: Array<any>
    timeComplexity?: string
    spaceComplexity?: string
    efficiencyScore?: number
  }
): Promise<boolean> {
  try {
    // First verify the session belongs to this guest
    const session = await getGuestSession(sessionId, guestId)
    if (!session) return false

    const sessionRef = doc(db, "interview_sessions", sessionId)
    const data: any = {
      updated_at: new Date().toISOString(),
    }

    if (updateData.performanceScore !== undefined) {
      data.performance_score = updateData.performanceScore
      data.completed_at = new Date().toISOString()
    }
    if (updateData.feedback) data.feedback = updateData.feedback
    if (updateData.code) data.final_code = updateData.code
    if (updateData.language) data.language = updateData.language
    if (updateData.testResults) {
      data.test_results = sanitizeTestResultsForFirestore(updateData.testResults)
      data.tests_passed = updateData.testResults.filter((t: any) => t.passed).length
      data.tests_total = updateData.testResults.length
    }
    if (updateData.timeComplexity) data.time_complexity = updateData.timeComplexity
    if (updateData.spaceComplexity) data.space_complexity = updateData.spaceComplexity
    if (updateData.efficiencyScore) data.efficiency_score = updateData.efficiencyScore

    await setDoc(sessionRef, data, { merge: true })
    return true
  } catch {
    return false
  }
}

/**
 * Migrate a guest session to an authenticated user
 * This transfers ownership from guest ID to user ID
 */
export async function migrateGuestSession(
  sessionId: string,
  guestId: string,
  newUserId: string
): Promise<boolean> {
  try {
    // Verify the session belongs to this guest
    const session = await getGuestSession(sessionId, guestId)
    if (!session) return false

    const sessionRef = doc(db, "interview_sessions", sessionId)
    await setDoc(
      sessionRef,
      {
        user_id: newUserId, // Transfer ownership
        is_guest: false, // No longer a guest session
        migrated_from_guest: guestId, // Keep track of original guest ID
        migrated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    )

    return true
  } catch {
    return false
  }
}

/**
 * Find all guest sessions for a guest ID
 * Used during migration to find all sessions to transfer
 */
export async function findGuestSessions(
  guestId: string
): Promise<Array<{ id: string; data: any }>> {
  try {
    const sessionsQuery = query(
      collection(db, "interview_sessions"),
      where("user_id", "==", guestId),
      where("is_guest", "==", true),
      limit(10) // Limit to prevent abuse
    )

    const snapshot = await getDocs(sessionsQuery)
    const sessions: Array<{ id: string; data: any }> = []

    snapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        data: doc.data(),
      })
    })

    return sessions
  } catch {
    return []
  }
}

/**
 * Migrate all guest sessions to an authenticated user
 */
export async function migrateAllGuestSessions(
  guestId: string,
  newUserId: string
): Promise<{ migrated: number; failed: number }> {
  const sessions = await findGuestSessions(guestId)
  let migrated = 0
  let failed = 0

  for (const session of sessions) {
    const success = await migrateGuestSession(session.id, guestId, newUserId)
    if (success) {
      migrated++
    } else {
      failed++
    }
  }

  return { migrated, failed }
}

/**
 * Save session state for a guest session
 */
export async function saveGuestSessionState(
  sessionId: string,
  guestId: string,
  state: {
    code: string
    selectedLanguage: string
    elapsedTime: number
    chatMessages?: Array<{ type: string; message: string }>
    interviewerMessages?: Array<{ type: string; message: string }>
    testResults?: Array<any>
  }
): Promise<void> {
  try {
    // Verify this session belongs to the guest
    const session = await getGuestSession(sessionId, guestId)
    if (!session) return

    const sessionRef = doc(db, "interview_sessions", sessionId)
    await setDoc(
      sessionRef,
      {
        session_state: {
          code: state.code,
          language: state.selectedLanguage,
          elapsed_time: state.elapsedTime,
          chat_messages: state.chatMessages,
          interviewer_messages: state.interviewerMessages,
          test_results: state.testResults,
          saved_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    )
  } catch {
    // Non-blocking - localStorage backup exists
  }
}

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
  limit,
  orderBy,
} from "firebase/firestore"
import { Profile, ProfileQuota } from "./types"
import { getSessionsLimitForTier } from "./pricing"
import { calculateBillingPeriod } from "./quota/billing-period"
import { calculateTechnicalScoreFromBreakdown, SESSION } from "./constants"
import type { Attribution } from "./attribution"

/**
 * Stringify a test value for Firestore, mapping absent values to null.
 *
 * `JSON.stringify(undefined)` returns the VALUE `undefined`, not a string — and
 * Firestore rejects undefined field values outright (the client is not configured
 * with `ignoreUndefinedProperties`), failing the entire write. Workspace suites
 * and packs legitimately have no expected/actual pair, so this is a real input.
 */
function stringifyTestValue(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value)
}

/**
 * Sanitize test results for Firestore storage
 * Firestore doesn't support nested arrays, so we stringify complex values
 *
 * Exported for tests: it is a pure function guarding every session write, and a
 * single undefined here fails the whole document.
 */
export function sanitizeTestResultsForFirestore(testResults: Array<any>): Array<any> {
  return testResults.map((t: any) => ({
    description: t.description,
    passed: t.passed,
    input: stringifyTestValue(t.input),
    expected: stringifyTestValue(t.expected),
    actual: stringifyTestValue(t.actual),
    error: t.error ?? null,
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
  photoURL?: string | null,
  attribution?: Attribution | null
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

  // First-touch acquisition attribution: stamp the self-declared campaign params
  // once, never overwriting an existing source. This is a first-party write that
  // is independent of GA4 and cookie consent, so signups-by-channel stays a plain
  // Firestore query even for users who decline analytics. Values are re-clamped
  // here as a defensive trust boundary.
  const existingAcquisitionSource = (
    existingProfile as { acquisition_source?: string } | null
  )?.acquisition_source
  if (attribution && !existingAcquisitionSource && (attribution.source || attribution.campaign)) {
    const clampAttribution = (value?: string): string | undefined =>
      value ? value.slice(0, 200) : undefined
    const source = clampAttribution(attribution.source)
    const medium = clampAttribution(attribution.medium)
    const campaign = clampAttribution(attribution.campaign)
    const landingPage = clampAttribution(attribution.landingPage)
    if (source) profileDataForFirestore.acquisition_source = source
    if (medium) profileDataForFirestore.acquisition_medium = medium
    if (campaign) profileDataForFirestore.acquisition_campaign = campaign
    if (landingPage) profileDataForFirestore.acquisition_landing_page = landingPage
    profileDataForFirestore.acquisition_captured_at =
      clampAttribution(attribution.capturedAt) || new Date().toISOString()
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

// Billing-period math lives in ./quota/billing-period — pure and dependency-free
// so the Admin-SDK writers (stripe-helpers, quota/session-start-admin) and the
// server quota read (quota-enforcement) share the exact same period model.
// Re-exported for existing importers.
export { calculateAnniversaryPeriod, calculateBillingPeriod } from "./quota/billing-period"

/**
 * Resolve the user's quota for the current billing period — READ-ONLY.
 *
 * QUOTA-1: the client no longer creates or syncs profile_quota docs (Firestore
 * rules are write:false; the Admin-SDK writers own all mutations). This
 * resolves what to DISPLAY: the most-conservative current-period doc with the
 * tier's limit applied, or a virtual zero-usage quota when the period has no
 * doc yet — the server writer creates the real doc on the period's first
 * session start.
 */
export async function resolveUserQuota(
  userId: string,
  subscriptionTier: "free" | "pro" | "enterprise" = "free",
  signupDate?: Date | string,
  stripeCurrentPeriodEnd?: Date | string,
  subscriptionType?: string
): Promise<ProfileQuota> {
  const now = new Date()

  const { periodStart, periodEnd } = calculateBillingPeriod({
    subscriptionTier,
    subscriptionType,
    signupDate,
    stripeCurrentPeriodEnd,
    referenceDate: now,
  })

  // Query by user_id with limit to prevent unbounded reads
  // Limit to 12 months of quota history (reasonable maximum)
  const quotaQuery = query(
    collection(db, "profile_quota"),
    where("user_id", "==", userId),
    limit(12)
  )

  const quotaSnap = await getDocs(quotaQuery)
  const sessionsLimit = getSessionsLimitForTier(subscriptionTier)

  if (!quotaSnap.empty) {
    // Filter by date range in memory to avoid composite index requirement,
    // then choose the MOST-CONSERVATIVE doc (max sessions_used, tie -> fewest
    // free opens) — the same selection the server read path uses, so the UI and
    // the enforcement path always report the same numbers.
    const inWindow = quotaSnap.docs
      .map((docSnap) => docSnap.data() as ProfileQuota)
      .filter((quota) => {
        const quotaStart = new Date(quota.period_start)
        return quotaStart >= periodStart && quotaStart <= periodEnd
      })

    const current = inWindow.reduce<ProfileQuota | undefined>((best, candidate) => {
      if (!best) return candidate
      if (candidate.sessions_used > best.sessions_used) return candidate
      if (candidate.sessions_used < best.sessions_used) return best
      return (candidate.free_opens_remaining ?? 0) < (best.free_opens_remaining ?? 0)
        ? candidate
        : best
    }, undefined)

    if (current) {
      // Reflect the tier's limit (and downgrade cap) in the RETURNED object
      // without persisting — the server writer syncs the doc on next start.
      return {
        ...current,
        sessions_limit: sessionsLimit,
        sessions_used: Math.min(current.sessions_used, sessionsLimit),
      }
    }
  }

  // No doc for this period yet: report a virtual zero-usage quota.
  return {
    id: "",
    user_id: userId,
    sessions_used: 0,
    sessions_limit: sessionsLimit,
    free_opens_remaining: 0,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }
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
  const quota = await resolveUserQuota(
    userId,
    profile?.subscription_tier || "free",
    profile?.created_at,
    profile?.subscription_current_period_end,
    profile?.subscription_type
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
export type FeedbackStatus = "pending" | "processing" | "complete" | "failed"

/**
 * Whether an interview_sessions doc counts as a completed AND scored round, the
 * unit behind WCSR (weekly completed-scored-rounds). completed_at alone is not
 * enough: markSessionEvaluating() stamps completed_at the moment evaluation
 * STARTS, so pending/failed rounds carry completed_at but never got a score.
 * Gate on feedback_status "complete"; for docs written before feedback_status
 * existed, fall back to a persisted performance_score.
 */
export function isScoredCompletedSession(session: {
  completed_at?: unknown
  feedback_status?: unknown
  performance_score?: unknown
}): boolean {
  if (!session.completed_at) return false
  if (session.feedback_status === "complete") return true
  // Pre-feedback_status docs: a persisted score is the only completion signal.
  if (session.feedback_status === undefined || session.feedback_status === null) {
    return session.performance_score !== undefined && session.performance_score !== null
  }
  return false
}

/** Session shape needed to partition the funnel; a loose read model over Firestore. */
export interface SessionFunnelInput {
  is_guest?: unknown
  completed_at?: unknown
  feedback_status?: unknown
  performance_score?: unknown
}

/** Guest/registered + scored-completion partition of a set of interview_sessions. */
export interface SessionFunnelCounts {
  total: number
  completed: number
  scored: number
  guest: number
  guestCompleted: number
  registered: number
  registeredCompleted: number
  registeredScored: number
}

/**
 * Partition interview_sessions into guest vs registered and count completed and
 * scored rounds, the shared shape behind both the admin funnel and analytics.
 *
 * Guests live in the same interview_sessions collection with is_guest: true and
 * have no profiles doc, so they must be excluded from registered conversion (they
 * otherwise inflate the Signup->Session numerator while being absent from its
 * denominator). Kept in one place so the two admin routes cannot drift.
 */
export function summarizeSessionFunnelCounts(
  sessions: Iterable<SessionFunnelInput>
): SessionFunnelCounts {
  const counts: SessionFunnelCounts = {
    total: 0,
    completed: 0,
    scored: 0,
    guest: 0,
    guestCompleted: 0,
    registered: 0,
    registeredCompleted: 0,
    registeredScored: 0,
  }

  for (const session of sessions) {
    counts.total++
    const isGuest = session.is_guest === true
    if (isGuest) counts.guest++
    else counts.registered++

    if (session.completed_at) {
      counts.completed++
      if (isGuest) counts.guestCompleted++
      else counts.registeredCompleted++
    }

    if (isScoredCompletedSession(session)) {
      counts.scored++
      if (!isGuest) counts.registeredScored++
    }
  }

  return counts
}

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
    bugfixEvidenceEvents?: Array<any>
    bugfixHypothesis?: string
    bugfixRootCause?: string
    bugfixPrevention?: string
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
    structuredFeedback?: {
      scores?: Record<string, number>
      tldr?: string
      whatWorked?: string[]
      fixNext?: string[]
      actionPlan?: string[]
      rawFeedback?: string
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
    if (additionalData.structuredFeedback) {
      updateData.structured_feedback = additionalData.structuredFeedback
    }
    if (additionalData.bugfixEvidenceEvents) {
      updateData.bugfix_evidence_events = additionalData.bugfixEvidenceEvents
    }
    if (additionalData.bugfixHypothesis) {
      updateData.bugfix_hypothesis = additionalData.bugfixHypothesis
    }
    if (additionalData.bugfixRootCause) {
      updateData.bugfix_root_cause = additionalData.bugfixRootCause
    }
    if (additionalData.bugfixPrevention) {
      updateData.bugfix_prevention = additionalData.bugfixPrevention
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
    workspaceContext?: Array<Record<string, unknown>>
    activeWorkspacePath?: string | null
    consoleLogs?: Array<Record<string, unknown>>
    bugfixEvidenceEvents?: Array<any>
    bugfixHypothesis?: string
    bugfixRootCause?: string
    bugfixPrevention?: string
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
          workspace_context: state.workspaceContext,
          active_workspace_path: state.activeWorkspacePath,
          console_logs: state.consoleLogs,
          bugfix_evidence_events: state.bugfixEvidenceEvents,
          bugfix_hypothesis: state.bugfixHypothesis,
          bugfix_root_cause: state.bugfixRootCause,
          bugfix_prevention: state.bugfixPrevention,
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
    workspaceContext?: Array<Record<string, unknown>>
    activeWorkspacePath?: string | null
    consoleLogs?: Array<Record<string, unknown>>
    bugfixEvidenceEvents?: Array<any>
    bugfixHypothesis?: string
    bugfixRootCause?: string
    bugfixPrevention?: string
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
          workspace_context: state.workspaceContext,
          active_workspace_path: state.activeWorkspacePath,
          console_logs: state.consoleLogs,
          bugfix_evidence_events: state.bugfixEvidenceEvents,
          bugfix_hypothesis: state.bugfixHypothesis,
          bugfix_root_cause: state.bugfixRootCause,
          bugfix_prevention: state.bugfixPrevention,
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
  workspaceContext?: Array<Record<string, unknown>>
  activeWorkspacePath?: string | null
  consoleLogs?: Array<Record<string, unknown>>
  bugfixEvidenceEvents?: Array<Record<string, unknown>>
  bugfixHypothesis?: string
  bugfixRootCause?: string
  bugfixPrevention?: string
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
      workspaceContext?: Array<Record<string, unknown>>
      activeWorkspacePath?: string | null
      consoleLogs?: Array<Record<string, unknown>>
      bugfixEvidenceEvents?: Array<Record<string, unknown>>
      bugfixHypothesis?: string
      bugfixRootCause?: string
      bugfixPrevention?: string
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
      result.workspaceContext = data.session_state.workspace_context
      result.activeWorkspacePath = data.session_state.active_workspace_path
      result.consoleLogs = data.session_state.console_logs
      result.bugfixEvidenceEvents = data.session_state.bugfix_evidence_events
      result.bugfixHypothesis = data.session_state.bugfix_hypothesis
      result.bugfixRootCause = data.session_state.bugfix_root_cause
      result.bugfixPrevention = data.session_state.bugfix_prevention
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
 * Record session start and manage usage.
 *
 * QUOTA-1: quota mutations are server-authoritative. This helper keeps its old
 * shape for callers but delegates to POST /api/usage/session-start with the
 * signed-in user's token. Identity comes from the verified token — the userId
 * argument is no longer trusted — and profile_quota is client-read-only in
 * Firestore rules, so this API call is the only way to spend a session.
 */
export async function recordSessionStart(_userId: string): Promise<{
  success: boolean
  usedPaidSession: boolean
  freeOpensRemaining: number
}> {
  const { getCurrentUserToken } = await import("./firebase-lazy")
  const token = await getCurrentUserToken()
  if (!token) {
    throw new Error("Authentication required to start a session")
  }

  const response = await fetch("/api/usage/session-start", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.status === 403) {
    // Preserve the exact error surface callers have always handled.
    throw new Error("Session limit exceeded")
  }
  if (!response.ok) {
    throw new Error("Failed to record session start")
  }

  const data = (await response.json()) as {
    usedPaidSession?: boolean
    freeOpensRemaining?: number
  }

  return {
    success: true,
    usedPaidSession: !!data.usedPaidSession,
    freeOpensRemaining: data.freeOpensRemaining ?? 0,
  }
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
    // Guest sessions expire after SESSION.GUEST_EXPIRY_DAYS if not claimed — kept consistent with the
    // Admin-SDK write path (app/api/guest-session) so both agree on one lifetime. (chore #5)
    expires_at: new Date(
      Date.now() + SESSION.GUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString(),
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

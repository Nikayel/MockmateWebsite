/**
 * Funnel metric definitions for the admin dashboard.
 *
 * Every function here is pure so the definitions can be tested without
 * Firestore. The route reads documents; this module decides what the numbers
 * mean.
 *
 * Two rules govern this module:
 *
 * 1. Every stage is scoped to the same window and the same population. The
 *    funnel is a signup cohort: the users who signed up inside the selected
 *    window, then how far that same set of people got. It is not a mix of
 *    range-scoped session counts and an all-time subscriber count, which is
 *    what produced "complete to subscribe" rates above 100%.
 * 2. Each stage is a subset of the stage above it by construction, so a
 *    conversion ratio can never exceed 100%. Cohort members who subscribed
 *    without ever completing a round are reported separately rather than
 *    folded into a stage where they would break the nesting.
 */

/** A single bar of the funnel chart. */
export interface FunnelStage {
  name: string
  value: number
  color?: string
}

/** Loose read model over an `interview_sessions` document. */
export interface CohortSessionInput {
  user_id?: unknown
  completed_at?: unknown
}

/** Counts for one signup cohort, each stage nested inside the previous one. */
export interface CohortFunnelCounts {
  /** Users whose profile was created inside the window. */
  signups: number
  /** Of those, users who started at least one round. */
  startedSession: number
  /** Of those, users who finished at least one round. */
  completedSession: number
  /** Of those, users holding a paying subscription right now. */
  subscribed: number
  /**
   * Cohort members paying right now who never completed a round. Deliberately
   * outside the nested funnel: counting them in the "Subscribed" stage would
   * let that stage exceed the stage above it.
   */
  subscribedWithoutCompletedSession: number
}

/** Conversion between adjacent funnel stages, as 0-100 percentages. */
export interface CohortConversionRates {
  signupToSession: number
  sessionToComplete: number
  completeToSubscribe: number
  /** Signup all the way through to paying, within the same cohort. */
  overallConversion: number
}

/**
 * Percentage of `denominator` represented by `numerator`, 0 when there is
 * nothing to divide by. Callers must pass a numerator drawn from a subset of
 * the denominator's population; this helper does not clamp, because clamping
 * would hide the population mismatch that produced an impossible rate.
 */
export function ratePercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return (numerator / denominator) * 100
}

/**
 * Parse the string | Firestore Timestamp | Date | epoch shapes these
 * collections mix. Returns null for anything unparseable so a bad document
 * drops out of a cohort instead of landing on 1970.
 */
export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  const maybeTimestamp = value as { toDate?: () => Date }
  if (typeof maybeTimestamp.toDate === "function") {
    try {
      const parsed = maybeTimestamp.toDate()
      return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

/** True when `value` falls inside [startDate, now]. A null start means all time. */
export function isWithinWindow(value: unknown, startDate: Date | null): boolean {
  const date = toDate(value)
  if (!date) return false
  if (!startDate) return true
  return date >= startDate
}

/** Loose read model over a `profiles` document, for cohort selection. */
export interface CohortProfileInput {
  userId: string
  createdAt?: unknown
}

/**
 * The user ids that signed up inside the window. This is the denominator every
 * other stage is measured against, so it is computed once and shared rather
 * than re-derived per stage.
 */
export function selectSignupCohort(
  profiles: Iterable<CohortProfileInput>,
  startDate: Date | null
): Set<string> {
  const cohort = new Set<string>()
  for (const profile of profiles) {
    if (!profile.userId) continue
    if (isWithinWindow(profile.createdAt, startDate)) {
      cohort.add(profile.userId)
    }
  }
  return cohort
}

/**
 * Walk one signup cohort through the product. `sessions` may contain rounds
 * from users outside the cohort (including guests); they are ignored, which is
 * what keeps the funnel scoped to a single population.
 *
 * A cohort member can only start a round after signing up, so a session query
 * bounded by the same window start sees every round the cohort could have run.
 */
export function summarizeCohortFunnel(
  cohortUserIds: Iterable<string>,
  sessions: Iterable<CohortSessionInput>,
  activePaidUserIds: Iterable<string>
): CohortFunnelCounts {
  const cohort = cohortUserIds instanceof Set ? cohortUserIds : new Set(cohortUserIds)
  const paying = activePaidUserIds instanceof Set ? activePaidUserIds : new Set(activePaidUserIds)

  const started = new Set<string>()
  const completed = new Set<string>()

  for (const session of sessions) {
    const userId = typeof session.user_id === "string" ? session.user_id : null
    if (!userId || !cohort.has(userId)) continue
    started.add(userId)
    if (session.completed_at) completed.add(userId)
  }

  let subscribed = 0
  for (const userId of completed) {
    if (paying.has(userId)) subscribed++
  }

  let subscribedWithoutCompletedSession = 0
  for (const userId of cohort) {
    if (paying.has(userId) && !completed.has(userId)) subscribedWithoutCompletedSession++
  }

  return {
    signups: cohort.size,
    startedSession: started.size,
    completedSession: completed.size,
    subscribed,
    subscribedWithoutCompletedSession,
  }
}

/** Stage colors, kept next to the stage names so the chart order is one decision. */
const STAGE_COLORS = ["#3fb883", "#FBBF24", "#F97316", "#A855F7"] as const

/**
 * The funnel bars. Names describe the population, not a marketing stage, so a
 * reader can tell that every bar counts people from one signup cohort.
 */
export function buildFunnelStages(counts: CohortFunnelCounts): FunnelStage[] {
  return [
    { name: "Signed up", value: counts.signups, color: STAGE_COLORS[0] },
    { name: "Started a round", value: counts.startedSession, color: STAGE_COLORS[1] },
    { name: "Completed a round", value: counts.completedSession, color: STAGE_COLORS[2] },
    { name: "Subscribed", value: counts.subscribed, color: STAGE_COLORS[3] },
  ]
}

/** Adjacent-stage conversion for one cohort. Nesting keeps every rate at or below 100%. */
export function computeCohortConversionRates(counts: CohortFunnelCounts): CohortConversionRates {
  return {
    signupToSession: ratePercent(counts.startedSession, counts.signups),
    sessionToComplete: ratePercent(counts.completedSession, counts.startedSession),
    completeToSubscribe: ratePercent(counts.subscribed, counts.completedSession),
    overallConversion: ratePercent(counts.subscribed, counts.signups),
  }
}

/** Human-readable window label, so a stage never renders without its scope. */
export function describeWindow(timeRange: string): string {
  switch (timeRange) {
    case "7d":
      return "last 7 days"
    case "30d":
      return "last 30 days"
    case "90d":
      return "last 90 days"
    default:
      return "all time"
  }
}

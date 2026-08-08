/**
 * Funnel Analytics API
 *
 * Returns the conversion funnel for the admin dashboard as a signup cohort:
 * the users who signed up inside the selected window, then how far that same
 * set of people got. Every stage counts people, every stage is a subset of the
 * stage above it, and every stage is scoped to the same window.
 *
 * Two things this route deliberately does NOT return:
 *
 * 1. A page-views stage. The platform does not measure page views. The stage
 *    used to be `max(signups * 5, totalProfiles * 3)`, derived from a guessed
 *    "20% baseline" signup rate, which made the visit-to-signup rate a
 *    tautology that printed exactly 20.0% forever, and made the hero
 *    "overall conversion" card a function of that guess. Google Analytics is
 *    not configured (GOOGLE_ANALYTICS_PROPERTY_ID is unset), so the estimate
 *    was the only branch that ever ran.
 * 2. An `estimated` flag. No page read the old one, so a modelled number
 *    rendered in exactly the same visual language as a measured one.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess, parseAdminQueryParams } from "@/lib/admin/middleware"
import {
  buildFunnelStages,
  buildFunnelTrend,
  computeCohortConversionRates,
  describeWindow,
  earliestDate,
  ratePercent,
  resolveTrendRange,
  selectSignupCohort,
  summarizeCohortFunnel,
} from "@/lib/admin/funnel-metrics"
import { selectBillingUserIds } from "@/lib/admin/subscription-state"
import {
  summarizeSessionFunnelCounts,
  summarizeActivationCohort,
  type ActivationCohortSummary,
} from "@/lib/firestore-helpers"

/** Plain-language provenance rendered next to each block, so no figure appears unsourced. */
const PROVENANCE = {
  funnel:
    "One signup cohort from Firestore profiles, rounds from interview_sessions in the same window. Subscribed counts cohort members with a billing subscription right now.",
  registered:
    "interview_sessions in the window, guest rounds excluded. Rates are session counts over session counts.",
  activation:
    "Fixed 30-day signup cohort, independent of the range selector. Firestore profiles and interview_sessions.",
  trend: "Daily buckets from Firestore profiles.created_at and interview_sessions.started_at.",
  signupsBySource: "First-touch profiles.acquisition_source, within the selected window.",
} as const

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Database not available" },
        { status: 500 }
      )
    }

    const { timeRange, startDate, endDate } = parseAdminQueryParams(request)

    const profilesSnapshot = await adminDb.collection("profiles").get()
    const profiles = profilesSnapshot.docs.map((doc) => {
      const profile = doc.data()
      return {
        userId: doc.id,
        createdAt: profile.created_at ?? profile.createdAt,
        acquisitionSource:
          typeof profile.acquisition_source === "string" && profile.acquisition_source
            ? profile.acquisition_source
            : "direct",
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        subscription_type: profile.subscription_type,
      }
    })

    // The one population every stage is measured against.
    const cohort = selectSignupCohort(profiles, startDate)

    // Rounds bounded by the same window. A cohort member cannot start a round
    // before signing up, so this query sees every round the cohort could run.
    let sessionsQuery: FirebaseFirestore.Query = adminDb.collection("interview_sessions")
    if (startDate) {
      sessionsQuery = sessionsQuery.where("started_at", ">=", startDate.toISOString())
    }
    const sessionsSnapshot = await sessionsQuery.get()
    const sessions = sessionsSnapshot.docs.map((doc) => doc.data())

    // Point-in-time: who is billing us today. Not scoped to the window, because
    // no date picker can change who is paying right now, and intersecting it
    // with the cohort is what keeps every stage inside the stage above it.
    const billingUserIds = selectBillingUserIds(profiles)

    const counts = summarizeCohortFunnel(cohort, sessions, billingUserIds)
    const stages = buildFunnelStages(counts)
    const conversionRates = computeCohortConversionRates(counts)

    // Guest vs registered volume, and scored completions. These count rounds,
    // not people, so they are reported next to the funnel rather than inside it.
    const sessionCounts = summarizeSessionFunnelCounts(sessions)

    // Both numerator and denominator are registered-session counts, so neither
    // rate can exceed 100%. The old signup-to-session rate here divided a
    // session count by a headcount and routinely printed above 100%; the cohort
    // funnel above carries that conversion honestly instead.
    const registeredConversionRates = {
      sessionToComplete: ratePercent(sessionCounts.registeredCompleted, sessionCounts.registered),
      sessionToScored: ratePercent(sessionCounts.registeredScored, sessionCounts.registered),
    }

    const signupsBySource: Record<string, number> = {}
    for (const profile of profiles) {
      if (!cohort.has(profile.userId)) continue
      signupsBySource[profile.acquisitionSource] =
        (signupsBySource[profile.acquisitionSource] || 0) + 1
    }

    // Activation (council-fixed definition): % of the last-30-days signup
    // cohort whose FIRST scored round completed within 24h of signup. The
    // signup window is fixed at 30 days regardless of the page's timeRange
    // filter so the quoted rate never moves with the range selector.
    const ACTIVATION_SIGNUP_WINDOW_DAYS = 30
    const activationSince = new Date(
      Date.now() - ACTIVATION_SIGNUP_WINDOW_DAYS * 24 * 60 * 60 * 1000
    )
    let activation: (ActivationCohortSummary & { windowDays: number }) | null = null
    try {
      const activationSessionsSnapshot = await adminDb
        .collection("interview_sessions")
        .where("started_at", ">=", activationSince.toISOString())
        .get()
      activation = {
        windowDays: ACTIVATION_SIGNUP_WINDOW_DAYS,
        ...summarizeActivationCohort(
          profiles,
          activationSessionsSnapshot.docs.map((doc) => doc.data()),
          { signupSince: activationSince }
        ),
      }
    } catch (error) {
      // Additive metric: never let it break the funnel payload.
      console.error("Error computing activation metric:", error)
    }

    // The trend covers the selected window, or all held data on the All range.
    const trendRange = resolveTrendRange(
      startDate,
      startDate
        ? null
        : earliestDate([
            ...profiles.map((profile) => profile.createdAt),
            ...sessions.map((session) => session.started_at),
          ]),
      endDate
    )
    const trend = buildFunnelTrend(
      profiles.map((profile) => profile.createdAt),
      sessions,
      trendRange
    )

    return NextResponse.json({
      success: true,
      timeRange,
      funnel: {
        // Every block below is scoped to this window unless it says otherwise.
        window: {
          timeRange,
          label: describeWindow(timeRange),
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate.toISOString(),
        },
        stages,
        conversionRates,
        // Cohort members paying today who never completed a round. Reported
        // beside the funnel because folding them into the Subscribed stage
        // would let that stage exceed the stage above it.
        subscribedWithoutCompletedRound: counts.subscribedWithoutCompletedSession,
        trend,
        trendWindow: {
          startDate: trendRange.start.toISOString(),
          endDate: trendRange.end.toISOString(),
          days: trendRange.days,
          truncated: trendRange.truncated,
        },
        // Round volume in the window. Counts of rounds, not of people.
        scoredCompletions: sessionCounts.scored,
        registeredSessions: sessionCounts.registered,
        registeredCompletedSessions: sessionCounts.registeredCompleted,
        registeredScoredCompletions: sessionCounts.registeredScored,
        guestSessions: sessionCounts.guest,
        guestCompletedSessions: sessionCounts.guestCompleted,
        registeredConversionRates,
        signupsBySource,
        activation,
        provenance: PROVENANCE,
      },
    })
  } catch (error) {
    console.error("Funnel analytics API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch funnel data" },
      { status: 500 }
    )
  }
}

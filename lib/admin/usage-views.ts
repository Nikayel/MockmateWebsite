/**
 * View builders for the admin AI usage dashboard.
 *
 * The route handler used to hold all of this: five query strategies, two N+1
 * Firestore loops, and the response shaping, in roughly 500 lines. CLAUDE.md
 * asks route handlers to parse, authorise, validate, call a service and return,
 * so the querying lives here and the handler dispatches.
 *
 * Everything reads through lib/usage/: one budget resolver, one scan-limit
 * table, one cost accumulator, one batched profile lookup.
 */

import { adminDb } from "../firebase-admin"
import { sessionTitle, sessionType, sessionStatus } from "./session-fields"
import { fetchProfilesById, profileEmail } from "../usage/profile-lookup"
import { sumUsageEventsByField, totalsFor } from "../usage/event-queries"
import { averageTokensPerRequest, type UsageTotals } from "../usage/event-totals"
import { SESSION_SCAN_LIMIT, describeCoverage, type ScanCoverage } from "../usage/scan-limits"

/** One row of the Session Costs table. */
export interface SessionUsageRow {
  sessionId: string
  userId: string | null
  userEmail: string
  scenarioTitle: string
  scenarioId: string | null
  scenarioType: string
  difficulty: string
  pattern: string
  status: string
  cost: number
  tokens: number
  requestCount: number
  performanceScore?: number
  createdAt: string | null
  completedAt: string | null
}

/** One row of the Problem Costs table. */
export interface ScenarioUsageRow {
  scenarioId: string
  scenarioTitle: string
  pattern: string
  difficulty: string
  sessionCount: number
  /** Distinct users who ran this problem within the scanned window. */
  uniqueUsers: number
  cost: number
  tokens: number
  requests: number
  avgTokensPerRequest: number
  avgCostPerSession: number
}

/** A Firestore timestamp, an ISO string, or nothing. */
function toIsoString(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    const asDate = (value as { toDate: () => Date }).toDate()
    return asDate instanceof Date && !Number.isNaN(asDate.valueOf()) ? asDate.toISOString() : null
  }
  return typeof value === "string" ? value : null
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null
}

/**
 * Recent sessions with the AI cost each one caused.
 *
 * Guests legitimately have no profile document, so they are labelled rather
 * than reported as a failed lookup.
 */
export async function buildSessionsView(limit: number): Promise<{
  sessions: SessionUsageRow[]
  total: number
  coverage: ScanCoverage
}> {
  const snapshot = await adminDb
    .collection("interview_sessions")
    .orderBy("created_at", "desc")
    .limit(limit)
    .get()

  const docs = snapshot.docs
  const userIds = docs
    .map((doc) => doc.data().user_id)
    .filter((id): id is string => typeof id === "string" && !!id)

  // Two batched reads replace up to 2N point reads.
  const [profiles, costsBySession] = await Promise.all([
    fetchProfilesById(userIds),
    sumUsageEventsByField(
      "sessionId",
      docs.map((doc) => doc.id)
    ),
  ])

  const sessions = docs.map((doc): SessionUsageRow => {
    const session = doc.data()
    const totals = totalsFor(costsBySession, doc.id)
    const userId = readOptionalString(session.user_id)

    return {
      sessionId: doc.id,
      userId,
      userEmail:
        session.is_guest === true
          ? "Guest"
          : profileEmail(userId ? profiles.get(userId) : undefined, "Unknown"),
      scenarioTitle: sessionTitle(session),
      scenarioId: readOptionalString(session.scenario_id),
      scenarioType: sessionType(session),
      difficulty: session.difficulty || "medium",
      pattern: session.pattern || "unknown",
      status: sessionStatus(session),
      cost: totals.cost,
      tokens: totals.tokens,
      requestCount: totals.requests,
      performanceScore: session.performance_score,
      createdAt: toIsoString(session.created_at),
      completedAt: toIsoString(session.completed_at),
    }
  })

  return {
    sessions,
    total: sessions.length,
    coverage: describeCoverage(docs.length, limit),
  }
}

/**
 * AI cost aggregated by interview problem.
 *
 * Session and user counts come from the scanned window, not from all time; the
 * returned coverage says how wide that window actually was.
 */
export async function buildScenariosView(): Promise<{
  scenarios: ScenarioUsageRow[]
  coverage: ScanCoverage
}> {
  const snapshot = await adminDb
    .collection("interview_sessions")
    .orderBy("created_at", "desc")
    .limit(SESSION_SCAN_LIMIT)
    .get()

  interface ScenarioAccumulator {
    scenarioId: string
    scenarioTitle: string
    pattern: string
    difficulty: string
    sessionCount: number
    userIds: Set<string>
  }

  const scenarioMap = new Map<string, ScenarioAccumulator>()

  for (const doc of snapshot.docs) {
    const session = doc.data()
    const scenarioId = readOptionalString(session.scenario_id) ?? "unknown"

    let entry = scenarioMap.get(scenarioId)
    if (!entry) {
      entry = {
        scenarioId,
        // Sessions with no scenario_id all collapse into one bucket, so naming
        // it after whichever session landed first would be a lie.
        scenarioTitle: scenarioId === "unknown" ? "(no scenario id)" : sessionTitle(session),
        pattern: session.pattern || "unknown",
        difficulty: session.difficulty || "medium",
        sessionCount: 0,
        userIds: new Set<string>(),
      }
      scenarioMap.set(scenarioId, entry)
    }

    entry.sessionCount++
    // Distinguishes one user grinding a problem from spend spread across the
    // user base, at no extra query cost.
    if (typeof session.user_id === "string" && session.user_id) {
      entry.userIds.add(session.user_id)
    }
  }

  const costsByScenario = await sumUsageEventsByField(
    "scenarioId",
    Array.from(scenarioMap.keys()).filter((id) => id !== "unknown")
  )

  const scenarios = Array.from(scenarioMap.values()).map((scenario): ScenarioUsageRow => {
    const totals: UsageTotals = totalsFor(costsByScenario, scenario.scenarioId)
    return {
      scenarioId: scenario.scenarioId,
      scenarioTitle: scenario.scenarioTitle,
      pattern: scenario.pattern,
      difficulty: scenario.difficulty,
      sessionCount: scenario.sessionCount,
      uniqueUsers: scenario.userIds.size,
      cost: totals.cost,
      tokens: totals.tokens,
      requests: totals.requests,
      avgTokensPerRequest: averageTokensPerRequest(totals),
      avgCostPerSession: scenario.sessionCount > 0 ? totals.cost / scenario.sessionCount : 0,
    }
  })

  scenarios.sort((a, b) => b.cost - a.cost)

  return {
    scenarios: scenarios.slice(0, 50),
    coverage: describeCoverage(snapshot.docs.length, SESSION_SCAN_LIMIT),
  }
}

/** A single user's recent sessions with the cost each one caused. */
export async function buildUserSessionsView(
  userId: string,
  limit = 20
): Promise<SessionUsageRow[]> {
  const snapshot = await adminDb
    .collection("interview_sessions")
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .limit(limit)
    .get()

  const docs = snapshot.docs
  const costsBySession = await sumUsageEventsByField(
    "sessionId",
    docs.map((doc) => doc.id)
  )

  return docs.map((doc): SessionUsageRow => {
    const session = doc.data()
    const totals = totalsFor(costsBySession, doc.id)
    return {
      sessionId: doc.id,
      userId,
      // The caller already knows who this is; repeating the email per row would
      // be a wasted lookup.
      userEmail: "",
      scenarioTitle: sessionTitle(session),
      scenarioId: readOptionalString(session.scenario_id),
      scenarioType: sessionType(session),
      difficulty: session.difficulty || "medium",
      pattern: session.pattern || "unknown",
      status: sessionStatus(session),
      cost: totals.cost,
      tokens: totals.tokens,
      requestCount: totals.requests,
      performanceScore: session.performance_score,
      createdAt: toIsoString(session.created_at),
      completedAt: toIsoString(session.completed_at),
    }
  })
}

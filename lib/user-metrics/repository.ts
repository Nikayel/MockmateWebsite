import { adminDb } from "@/lib/firebase-admin"
import { normalizeMetricSession } from "./normalize"
import { aggregateMetricSessions } from "./aggregate"
import type { MetricsSnapshot, MetricSession } from "./types"
import type { QueryDocumentSnapshot } from "firebase-admin/firestore"

const SCHEMA_VERSION = 2
const CACHE_MS = 60_000
const PAGE_SIZE = 250

/** Existing user_id/completed_at index; pagination never truncates a user's history. */
async function readFinalSessions(userId: string, now: number): Promise<MetricSession[]> {
  const sessions: MetricSession[] = []
  let cursor: QueryDocumentSnapshot | undefined
  for (;;) {
    let query = adminDb
      .collection("interview_sessions")
      .where("user_id", "==", userId)
      .where("completed_at", "!=", null)
      .orderBy("completed_at", "desc")
      .limit(PAGE_SIZE)
    if (cursor) query = query.startAfter(cursor)
    const page = await query
      .select(
        "scenario_id",
        "scenario_title",
        "topic",
        "type",
        "pattern",
        "difficulty",
        "started_at",
        "completed_at",
        "feedback_status",
        "feedback_score_frozen",
        "measurement_version",
        "performance_score",
        "technical_score",
        "mastery_score",
        "score_breakdown",
        "scoreBreakdown",
        "is_guided_lab",
        "guided_lab_assessment",
        "guided_lab_mastery",
        "bugfix_score_breakdown",
        "bugfix_evidence_summary"
      )
      .get()
    for (const doc of page.docs) {
      const session = normalizeMetricSession(doc.id, doc.data(), now)
      if (session) sessions.push(session)
    }
    if (page.docs.length < PAGE_SIZE) return sessions
    cursor = page.docs.at(-1)
  }
}

/** Rebuild legacy aggregates on first read, then cache for at most a minute.
 * Feedback writes increment metrics_revision atomically with the final result.
 * Compare-and-set prevents an in-flight rebuild caching an older revision.
 */
export async function loadUserMetrics(userId: string): Promise<MetricsSnapshot> {
  const ref = adminDb.collection("user_stats").doc(userId)
  for (let attempt = 0; attempt < 3; attempt++) {
    const stored = (await ref.get()).data()
    const revision = stored?.metrics_revision ?? 0
    const cached = stored?.metrics_snapshot
    if (
      cached?.version === SCHEMA_VERSION &&
      cached.revision === revision &&
      typeof cached.builtAt === "number" &&
      Date.now() - cached.builtAt >= 0 &&
      Date.now() - cached.builtAt < CACHE_MS
    ) {
      return cached.value as MetricsSnapshot
    }
    const now = Date.now()
    const value = aggregateMetricSessions(await readFinalSessions(userId, now), now)
    const saved = await adminDb.runTransaction(async (transaction) => {
      const current = (await transaction.get(ref)).data()
      if ((current?.metrics_revision ?? 0) !== revision) return false
      transaction.set(ref, {
        ...current,
        userId,
        ...value.overview,
        averageScore: value.overview.averageScore ?? 0,
        averageTechnicalScore: value.overview.averageTechnicalScore,
        totalScore: value.totals.score,
        totalTechnicalScore: value.totals.technicalScore,
        totalTechnicalSessions: value.totals.technicalSessions,
        sumOverallScore: value.totals.score,
        sumTechnicalScore: value.totals.technicalScore,
        sumMasteryScore: value.totals.technicalScore,
        // Canonical readers use the snapshot, not rounded legacy running totals.
        patternStats: value.patternStats,
        difficultyStats: value.difficultyStats,
        metrics_snapshot: { version: SCHEMA_VERSION, revision, builtAt: now, value },
      })
      return true
    })
    if (saved) return value
  }
  throw new Error("Your session results are updating. Please try again.")
}

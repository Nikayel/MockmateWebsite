import "server-only"
import { adminDb } from "@/lib/firebase-admin"
import { isScoredCompletedSession } from "@/lib/interview/completion-status"
import { logger } from "@/lib/logger"
import {
  recommendationDecisionIdSchema,
  recommendationSessionIdSchema,
  recommendationStartSchema,
} from "./decision-contract"
import {
  emitRecommendationStage,
  recommendationDecisionRef,
  type RecommendationDecision,
} from "./decisions.server"

/** Call only AFTER the authoritative quota writer accepts this start. */
export async function recordRecommendationStart(
  userId: string,
  scenarioId: string,
  input: unknown
) {
  const parsed = recommendationStartSchema.safeParse(input)
  if (!parsed.success) return
  const { decisionId, sessionId, returnSource } = parsed.data
  try {
    const decision = await adminDb.runTransaction(async (tx) => {
      const ref = recommendationDecisionRef(decisionId)
      const sessionRef = adminDb.collection("interview_sessions").doc(sessionId)
      const receiptRef = ref.collection("starts").doc(sessionId)
      const [snapshot, session, receipt] = await Promise.all([
        tx.get(ref),
        tx.get(sessionRef),
        tx.get(receiptRef),
      ])
      const choice = snapshot.data() as RecommendationDecision | undefined
      if (
        !choice ||
        choice.userId !== userId ||
        choice.scenarioId !== scenarioId ||
        session.get("user_id") !== userId ||
        session.get("scenario_id") !== scenarioId ||
        sessionId === choice.sourceSessionId ||
        session.get("completed_at") ||
        receipt.exists ||
        (session.get("recommendation_decision_id") &&
          session.get("recommendation_decision_id") !== decisionId)
      )
        return null
      // The server-only receipt, not the client-writable session pointer, proves acceptance.
      tx.create(receiptRef, {
        userId,
        scenarioId,
        returnSource,
        startedAt: new Date().toISOString(),
      })
      tx.update(sessionRef, { recommendation_decision_id: decisionId })
      if (choice.startedAt) return null
      tx.update(ref, {
        startedAt: new Date().toISOString(),
        firstStartedSessionId: sessionId,
        startedReturnSource: returnSource,
      })
      return choice
    })
    if (decision)
      await emitRecommendationStage(decisionId, decision, "started", {
        session_id: sessionId,
        sessionId,
        return_source: returnSource,
        observation_source: "accepted-start",
      })
  } catch (error) {
    logger.warn("[Recommendations] Start attribution failed", { error })
  }
}

/** Reconcile after final persistence, or metrics completion for system-design sessions. */
export async function recordRecommendationCompletion(userId: string, sessionId: string) {
  if (!recommendationSessionIdSchema.safeParse(sessionId).success) return
  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const session = await tx.get(adminDb.collection("interview_sessions").doc(sessionId))
      const decisionId = recommendationDecisionIdSchema.safeParse(
        session.get("recommendation_decision_id")
      )
      const score: unknown = session.get("performance_score")
      if (
        session.get("user_id") !== userId ||
        !decisionId.success ||
        !isScoredCompletedSession(session.data() ?? {}) ||
        session.get("feedback_status") !== "complete" ||
        typeof score !== "number" ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 100
      )
        return null
      const ref = recommendationDecisionRef(decisionId.data)
      const receiptRef = ref.collection("starts").doc(sessionId)
      const [snapshot, receipt] = await Promise.all([tx.get(ref), tx.get(receiptRef)])
      const decision = snapshot.data() as RecommendationDecision | undefined
      if (
        !decision ||
        decision.userId !== userId ||
        !decision.startedAt ||
        decision.scenarioId !== session.get("scenario_id") ||
        receipt.get("userId") !== userId ||
        receipt.get("scenarioId") !== decision.scenarioId ||
        receipt.get("completedAt")
      )
        return null
      const completedAt = new Date().toISOString()
      tx.update(receiptRef, { completedAt, performanceScore: score })
      if (decision.completedAt) return null
      tx.update(ref, { completedAt, completedSessionId: sessionId, performanceScore: score })
      return {
        decisionId: decisionId.data,
        decision,
        score,
        returnSource: receipt.get("returnSource") as string,
      }
    })
    if (result)
      await emitRecommendationStage(result.decisionId, result.decision, "completed", {
        session_id: sessionId,
        sessionId,
        performance_score: result.score,
        return_source: result.returnSource,
        observation_source: "persisted-feedback",
      })
  } catch (error) {
    logger.warn("[Recommendations] Completion attribution failed", { error })
  }
}

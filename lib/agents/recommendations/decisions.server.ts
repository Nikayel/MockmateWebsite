import "server-only"
import { createHash } from "node:crypto"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { trackEventServer } from "@/lib/analytics-server"
import type { NextPracticeRecommendation } from "./next-practice-types"

// Bump when ranking rules or the meaning of an outcome changes.
export const NEXT_PRACTICE_POLICY_VERSION = "next-practice-v1"
export interface RecommendationDecision {
  schemaVersion: 1
  policyVersion: string
  userId: string
  sourceSessionId: string
  scenarioId: string
  scenarioType: string
  focusSource: string
  createdAt: string
  viewedAt?: string
  clickedAt?: string
  startedAt?: string
  completedAt?: string
}
export const recommendationDecisionRef = (id: string) =>
  adminDb.collection("recommendation_decisions").doc(id)

/** Stable for repeated reads/saves of the same choice, independent of HTTP retries. */
export async function attachRecommendationDecision(
  userId: string,
  sourceSessionId: string,
  recommendation: NextPracticeRecommendation
): Promise<NextPracticeRecommendation> {
  const decisionId = createHash("sha256")
    .update(
      JSON.stringify([
        userId,
        sourceSessionId,
        recommendation.scenarioId,
        NEXT_PRACTICE_POLICY_VERSION,
      ])
    )
    .digest("hex")
  try {
    const ref = recommendationDecisionRef(decisionId)
    await adminDb.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return
      const decision: RecommendationDecision = {
        schemaVersion: 1,
        policyVersion: NEXT_PRACTICE_POLICY_VERSION,
        userId,
        sourceSessionId,
        scenarioId: recommendation.scenarioId,
        scenarioType: recommendation.type,
        focusSource: recommendation.focusSource,
        createdAt: new Date().toISOString(),
      }
      tx.create(ref, decision)
    })
    return {
      ...recommendation,
      decisionId,
      href: `${recommendation.href}&decisionId=${decisionId}`,
    }
  } catch (error) {
    logger.warn("[Recommendations] Decision registration failed", { error })
    // Advice remains usable during telemetry outages; never invent an unpersisted ID.
    return recommendation
  }
}

export async function emitRecommendationStage(
  decisionId: string,
  decision: RecommendationDecision,
  stage: "viewed" | "clicked" | "started" | "completed",
  fields: Record<string, unknown>
) {
  await trackEventServer(`next_practice_${stage}`, {
    userId: decision.userId,
    decision_id: decisionId,
    policy_version: decision.policyVersion,
    funnel_version: 1,
    event_id: `${decisionId}:${stage}:v1`,
    source_session_id: decision.sourceSessionId,
    scenario_id: decision.scenarioId,
    scenario_type: decision.scenarioType,
    focus_source: decision.focusSource,
    recommendation_source: "feedback",
    ...fields,
  })
}

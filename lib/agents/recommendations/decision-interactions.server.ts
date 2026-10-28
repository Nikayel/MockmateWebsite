import "server-only"
import { adminDb } from "@/lib/firebase-admin"
import { recommendationInteractionSchema } from "./decision-contract"
import {
  emitRecommendationStage,
  recommendationDecisionRef,
  type RecommendationDecision,
} from "./decisions.server"

/** Browser observations are untrusted reports, never proof of a session start. */
export async function recordRecommendationInteraction(
  userId: string,
  input: unknown
): Promise<boolean> {
  const { decisionId, stage, returnSource } = recommendationInteractionSchema.parse(input)
  const result = await adminDb.runTransaction(async (tx) => {
    const ref = recommendationDecisionRef(decisionId)
    const snapshot = await tx.get(ref)
    const decision = snapshot.data() as RecommendationDecision | undefined
    if (!decision || decision.userId !== userId) return null
    const field = stage === "viewed" ? "viewedAt" : "clickedAt"
    if (decision[field]) return { decision, changed: false }
    tx.update(ref, { [field]: new Date().toISOString(), [`${stage}ReturnSource`]: returnSource })
    return { decision, changed: true }
  })
  if (result?.changed)
    await emitRecommendationStage(decisionId, result.decision, stage, {
      return_source: returnSource,
      observation_source: "browser",
    })
  return result !== null
}

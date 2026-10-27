import { adminDb } from "@/lib/firebase-admin"
import { resolvePersistAction, type PersistSource } from "@/lib/feedback/persist-guard"
import { FieldValue } from "firebase-admin/firestore"

/** Final result and cache invalidation must commit together. */
export async function persistFinalSession(
  sessionId: string,
  userId: string,
  update: Record<string, unknown>
): Promise<boolean> {
  return adminDb.runTransaction(async (transaction) => {
    const session = adminDb.collection("interview_sessions").doc(sessionId)
    const current = await transaction.get(session)
    if (!current.exists || current.get("user_id") !== userId)
      throw new Error("Session ownership changed")
    if (
      resolvePersistAction(
        {
          status: current.get("feedback_status"),
          source: current.get("feedback_source"),
          scoreFrozen: current.get("feedback_score_frozen") === true,
        },
        (update.feedback_source ?? "stream") as PersistSource
      ) === "skip"
    )
      return false
    const fields = { ...update }
    if (current.get("feedback_score_frozen") === true) {
      delete fields.performance_score
      delete fields.score_breakdown
    }
    transaction.update(session, fields)
    transaction.set(
      adminDb.collection("user_stats").doc(userId),
      {
        metrics_revision: FieldValue.increment(1),
      },
      { merge: true }
    )
    return true
  })
}

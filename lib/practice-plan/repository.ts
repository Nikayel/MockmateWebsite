import "server-only"
import { adminDb } from "@/lib/firebase-admin"
import { isScoredCompletedSession } from "@/lib/interview/completion-status"
import type { InterviewSession } from "@/lib/types"
import { practicePlanSchema, type PracticePlan } from "./schema"

export const practicePlanRef = (userId: string) => adminDb.collection("practice_plans").doc(userId)
export async function readPracticePlan(userId: string): Promise<PracticePlan | null> {
  const snapshot = await practicePlanRef(userId).get()
  if (!snapshot.exists) return null
  const plan = practicePlanSchema.parse(snapshot.data())
  return plan.userId === userId ? plan : null
}
export async function completedPractice(plan: PracticePlan): Promise<InterviewSession | null> {
  const history = await adminDb
    .collection("interview_sessions")
    .where("user_id", "==", plan.userId)
    .orderBy("started_at", "desc")
    .limit(40)
    .select(
      "user_id",
      "started_at",
      "completed_at",
      "feedback_status",
      "performance_score",
      "scenario_id",
      "type",
      "score_breakdown",
      "bugfix_evidence_summary"
    )
    .get()
  const match = history.docs.find(
    (doc) =>
      doc.get("scenario_id") === plan.recommendation.scenarioId &&
      isScoredCompletedSession(doc.data()) &&
      typeof doc.get("completed_at") === "string" &&
      doc.get("completed_at") >= plan.savedAt
  )
  return match ? ({ ...match.data(), id: match.id } as InterviewSession) : null
}
/** Fence old requests against a newer saved task. */
export async function updatePracticePlan(
  plan: PracticePlan,
  fields: Partial<PracticePlan>
): Promise<boolean> {
  return adminDb.runTransaction(async (tx) => {
    const ref = practicePlanRef(plan.userId)
    const current = await tx.get(ref)
    if (current.get("revision") !== plan.revision) return false
    tx.update(ref, fields)
    return true
  })
}

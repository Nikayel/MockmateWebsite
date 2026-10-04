import "server-only"

import { adminDb } from "@/lib/firebase-admin"
import { scenarios } from "@/lib/scenarios"
import type { InterviewSession } from "@/lib/types"
import { selectNextPractice } from "./next-practice"
import type { NextPracticeResponse } from "./next-practice-types"

/** Read-only advice. Opening a task never grants access or spends allowance. */
export async function getNextPractice(
  userId: string,
  sessionId: string
): Promise<NextPracticeResponse> {
  const snapshot = await adminDb.collection("interview_sessions").doc(sessionId).get()
  if (!snapshot.exists || snapshot.get("user_id") !== userId) return { status: "not_found" }
  const session = { ...snapshot.data(), id: sessionId } as InterviewSession
  if (
    !session.completed_at ||
    !session.feedback ||
    (session.feedback_status && session.feedback_status !== "complete")
  ) {
    return { status: "not_ready" }
  }

  // Session-start is the authority for allowance and paid redos. A coarse account
  // snapshot cannot decide access to a particular scenario and must not hide advice.
  const history = await adminDb
    .collection("interview_sessions")
    .where("user_id", "==", userId)
    .orderBy("started_at", "desc")
    .limit(40)
    .select("scenario_id", "completed_at")
    .get()
  const recentIds = history.docs.flatMap((doc) => {
    const id: unknown = doc.get("scenario_id")
    return doc.get("completed_at") && typeof id === "string" ? [id] : []
  })
  const recommendation = selectNextPractice(session, scenarios, recentIds)
  return recommendation ? { status: "ready", recommendation } : { status: "no_match" }
}

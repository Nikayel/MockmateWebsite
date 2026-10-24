import "server-only"
import { adminDb } from "@/lib/firebase-admin"
import { fetchProfilesById, profileEmail } from "@/lib/usage/profile-lookup"
import { toSessionDetail, type SessionRowSource } from "../session-rows"
import { sessionConversations } from "./conversation"
import { sessionWork } from "./work"
import type { SessionInspection } from "./types"

/** Two fixed document reads; artifacts never join a list query or collection scan. */
export async function loadSessionInspection(sessionId: string): Promise<SessionInspection | null> {
  const ref = adminDb.collection("interview_sessions").doc(sessionId)
  const doc = await ref.get()
  if (!doc.exists) return null
  const source = doc.data() ?? {}
  const userId = typeof source.user_id === "string" ? source.user_id : null
  const [artifact, profiles] = await Promise.all([
    ref.collection("artifacts").doc("transcript").get(),
    userId ? fetchProfilesById([userId]) : Promise.resolve(null),
  ])
  const email = userId && profiles ? profileEmail(profiles.get(userId), "") : ""
  return {
    session: toSessionDetail(doc.id, source as SessionRowSource, email || null),
    conversations: sessionConversations(artifact.data(), source.session_state),
    work: sessionWork(source),
  }
}

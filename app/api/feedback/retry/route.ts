import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { adminDb } from "@/lib/firebase-admin"

const retryBodySchema = z.object({ sessionId: z.string().min(1).max(200) })
const MAX_MANUAL_RETRIES = 1

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = retryBodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const sessionRef = adminDb.collection("interview_sessions").doc(parsed.data.sessionId)
  const jobRef = adminDb.collection("feedback_jobs").doc(parsed.data.sessionId)
  const result = await adminDb.runTransaction(async (transaction) => {
    const [sessionSnapshot, jobSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(jobRef),
    ])
    if (!sessionSnapshot.exists || !jobSnapshot.exists) return { error: "not-found" as const }
    if (sessionSnapshot.get("user_id") !== auth.userId) return { error: "forbidden" as const }
    if (sessionSnapshot.get("feedback_status") === "complete") {
      return { error: "already-complete" as const }
    }
    if (
      sessionSnapshot.get("feedback_score_frozen") !== true ||
      jobSnapshot.get("status") !== "failed"
    ) {
      return { error: "not-retryable" as const }
    }

    const retryCount = Number(jobSnapshot.get("manual_retry_count") ?? 0)
    if (retryCount >= MAX_MANUAL_RETRIES) return { error: "retry-limit" as const }

    transaction.update(jobRef, {
      status: "queued",
      attempt_count: 0,
      manual_retry_count: retryCount + 1,
      next_attempt_at: Timestamp.now(),
      lease_until: FieldValue.delete(),
      lease_token: FieldValue.delete(),
      last_error: FieldValue.delete(),
      updated_at: FieldValue.serverTimestamp(),
    })
    transaction.update(sessionRef, {
      feedback_status: "queued",
      feedback_manual_retry_count: retryCount + 1,
      feedback_error: FieldValue.delete(),
      updated_at: FieldValue.serverTimestamp(),
    })
    return { queued: true as const }
  })

  if (result.error === "not-found") {
    return NextResponse.json({ error: "Feedback job not found" }, { status: 404 })
  }
  if (result.error === "forbidden")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (result.error === "already-complete") {
    return NextResponse.json({ error: "Feedback is already complete" }, { status: 409 })
  }
  if (result.error === "retry-limit") {
    return NextResponse.json({ error: "Feedback retry limit reached" }, { status: 429 })
  }
  if (result.error === "not-retryable") {
    return NextResponse.json(
      { error: "This session has no retryable feedback job" },
      { status: 409 }
    )
  }
  return NextResponse.json({ success: true, queued: result.queued === true })
}

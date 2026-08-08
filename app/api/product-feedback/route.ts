/**
 * Product feedback submission (user-facing).
 *
 * This is the writer for the `feedback` collection that /admin/feedback triages. Until it existed
 * the only POST handler lived at /api/admin/feedback, nothing in the product called it, and the
 * admin dashboard was empty by construction: eight stat cards over a collection with no writer.
 *
 * It lives outside /api/admin deliberately. A user-facing endpoint under an admin path is how the
 * previous handler ended up unvalidated, since everything around it was role-gated and it was not.
 * Here the contract is explicit: sign-in is required, the body is validated against a strict
 * schema, and every triage field on the stored document is set by this server from the verified
 * token, never by the caller.
 *
 * Not to be confused with /api/feedback/persist, which stores AI-generated interview feedback.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyToken } from "@/lib/admin/rbac"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { userFeedbackSubmissionSchema } from "@/lib/feedback/user-feedback-schema"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

/**
 * Per-IP ceiling. Feedback is a human action measured in submissions per week, so ten an hour is
 * generous for a real user and useless to a script.
 */
const submitRateLimit = rateLimit({
  interval: 60 * 60 * 1000,
  uniqueTokenPerInterval: 500,
  maxRequests: 10,
  prefix: "rl:product-feedback",
})

/** Second ceiling, tied to identity rather than IP, so one account cannot flood from many IPs. */
const MAX_SUBMISSIONS_PER_DAY = 20

const DAY_MS = 24 * 60 * 60 * 1000

export async function POST(request: NextRequest) {
  const limited = await submitRateLimit(request)
  if (limited) return limited

  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, error: "Sign in to send feedback" }, { status: 401 })
  }

  const auth = await verifyToken(authHeader.substring(7))
  if (!auth.valid || !auth.userId) {
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
  }

  if (!adminDb) {
    return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  // .strict() means an attempt to set status, priority, adminNotes, votes or a different userId
  // fails here rather than being silently dropped. The client learns its payload was refused.
  const parsed = userFeedbackSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json(
      {
        success: false,
        error:
          issue?.code === "unrecognized_keys"
            ? "That field cannot be set from a feedback submission"
            : "Feedback must be between 10 and 4000 characters",
      },
      { status: 400 }
    )
  }

  const { type, content, path } = parsed.data

  try {
    // One query serves both the daily cap and de-duplication. Without it a double-clicked submit
    // button files the same report twice and the founder triages it twice.
    const since = Timestamp.fromMillis(Date.now() - DAY_MS)
    const recent = await adminDb
      .collection("feedback")
      .where("userId", "==", auth.userId)
      .where("createdAt", ">=", since)
      .orderBy("createdAt", "desc")
      .limit(MAX_SUBMISSIONS_PER_DAY)
      .get()

    const duplicate = recent.docs.find((doc) => doc.data().content === content)
    if (duplicate) {
      return NextResponse.json({ success: true, feedbackId: duplicate.id, duplicate: true })
    }

    if (recent.size >= MAX_SUBMISSIONS_PER_DAY) {
      return NextResponse.json(
        {
          success: false,
          error: "You have sent a lot of feedback today. Please try again tomorrow.",
        },
        { status: 429 }
      )
    }

    const now = Timestamp.now()
    const docRef = await adminDb.collection("feedback").add({
      // Identity comes from the verified token, never from the body.
      userId: auth.userId,
      userEmail: auth.email ?? null,
      type,
      content,
      path: path ?? null,
      // Triage fields start at their defaults. Only an admin, through PUT /api/admin/feedback,
      // moves them from here.
      status: "new",
      priority: "medium",
      votes: 0,
      adminNotes: null,
      assignee: null,
      tags: [],
      repliedAt: null,
      createdAt: now,
      updatedAt: now,
    })

    logger.info("Product feedback submitted", { userId: auth.userId, type, feedbackId: docRef.id })

    return NextResponse.json({ success: true, feedbackId: docRef.id })
  } catch (error) {
    logger.error("Product feedback submission failed", { error, userId: auth.userId })
    return NextResponse.json(
      { success: false, error: "Could not send your feedback. Please try again." },
      { status: 500 }
    )
  }
}

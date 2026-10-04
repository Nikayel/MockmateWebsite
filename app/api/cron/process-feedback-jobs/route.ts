/**
 * Backfills written feedback for scored sessions whose inline narrative call
 * failed or whose stream process disappeared.
 *
 * Schedule this route every five minutes through cron-job.org (see README).
 * It claims one job at a time with a Firestore lease and never recalculates or
 * writes score fields.
 */

import { randomUUID } from "crypto"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { NextRequest, NextResponse } from "next/server"
import { generateFeedbackResponse } from "@/lib/ai-providers"
import { verifyCronRequest } from "@/lib/cron-auth"
import { isGlobalCeilingExceeded } from "@/lib/global-spend-guard"
import { completeFeedbackSections } from "@/lib/feedback/structured-feedback-schema"
import { parseFeedbackSections } from "@/lib/feedback/parsers"
import { feedbackJobDueTime, isFeedbackJobDue } from "@/lib/feedback/job-state"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"

export const maxDuration = 30

const JOBS_COLLECTION = "feedback_jobs"
const SESSIONS_COLLECTION = "interview_sessions"
const MAX_WORKER_ATTEMPTS = 3
const LEASE_MS = 2 * 60_000
const BACKOFF_MS = [60_000, 5 * 60_000]

interface FeedbackJob {
  session_id: string
  user_id: string
  scenario_type: string
  scenario_title: string
  scenario_id?: string | null
  silent_notes?: Array<Record<string, unknown>>
  bugfix_evidence_summary?: Record<string, unknown> | null
  bugfix_score_breakdown?: Record<string, unknown> | null
  bugfix_post_session_report?: Record<string, unknown> | null
  scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
    overall: number
  }
  system_prompt: string
  user_prompt: string
  status: "inline" | "queued" | "processing" | "complete" | "failed"
  attempt_count: number
  lease_token?: string
  lease_until?: Timestamp
  next_attempt_at?: Timestamp
  last_error?: string
}

async function claimNextJob(): Promise<{ job: FeedbackJob; jobId: string; token: string } | null> {
  const jobs = adminDb.collection(JOBS_COLLECTION)
  const candidates = await Promise.all(
    (["queued", "inline", "processing"] as const).map((status) =>
      jobs.where("status", "==", status).limit(100).get()
    )
  )
  const nowMs = Date.now()
  const ordered = candidates
    .flatMap((snapshot) => snapshot.docs)
    .filter((doc) => {
      const job = doc.data() as FeedbackJob
      return isFeedbackJobDue(job.status, job.next_attempt_at, job.lease_until, nowMs)
    })
    .sort((left, right) => {
      const leftData = left.data() as FeedbackJob
      const rightData = right.data() as FeedbackJob
      const leftDue =
        feedbackJobDueTime(leftData.status, leftData.next_attempt_at, leftData.lease_until) ?? 0
      const rightDue =
        feedbackJobDueTime(rightData.status, rightData.next_attempt_at, rightData.lease_until) ?? 0
      return leftDue - rightDue
    })

  for (const candidate of ordered) {
    const token = randomUUID()
    const claimed = await adminDb.runTransaction(async (transaction) => {
      const jobSnapshot = await transaction.get(candidate.ref)
      if (!jobSnapshot.exists) return null
      const current = jobSnapshot.data() as FeedbackJob
      if (
        !isFeedbackJobDue(current.status, current.next_attempt_at, current.lease_until, Date.now())
      ) {
        return null
      }

      const sessionRef = adminDb.collection(SESSIONS_COLLECTION).doc(current.session_id)
      const sessionSnapshot = await transaction.get(sessionRef)
      if (
        !sessionSnapshot.exists ||
        sessionSnapshot.get("user_id") !== current.user_id ||
        sessionSnapshot.get("feedback_status") === "complete"
      ) {
        transaction.update(candidate.ref, {
          status: "complete",
          system_prompt: FieldValue.delete(),
          user_prompt: FieldValue.delete(),
          lease_until: FieldValue.delete(),
          updated_at: FieldValue.serverTimestamp(),
        })
        return null
      }

      if (current.attempt_count >= MAX_WORKER_ATTEMPTS) {
        transaction.update(candidate.ref, {
          status: "failed",
          lease_until: FieldValue.delete(),
          last_error: current.last_error ?? "Feedback retry limit reached",
          updated_at: FieldValue.serverTimestamp(),
        })
        transaction.update(sessionRef, {
          feedback_status: "failed",
          feedback_error: current.last_error ?? "Feedback retry limit reached",
          updated_at: FieldValue.serverTimestamp(),
        })
        return null
      }

      const nextJob: FeedbackJob = {
        ...current,
        status: "processing",
        attempt_count: current.attempt_count + 1,
        lease_token: token,
        lease_until: Timestamp.fromMillis(Date.now() + LEASE_MS),
      }
      transaction.update(candidate.ref, {
        status: nextJob.status,
        attempt_count: nextJob.attempt_count,
        lease_token: token,
        lease_until: nextJob.lease_until,
        updated_at: FieldValue.serverTimestamp(),
      })
      transaction.update(sessionRef, {
        feedback_status: "queued",
        feedback_error: FieldValue.delete(),
        updated_at: FieldValue.serverTimestamp(),
      })
      return nextJob
    })

    if (claimed) return { job: claimed, jobId: candidate.id, token }
  }
  return null
}

async function finishJob(
  jobId: string,
  token: string,
  job: FeedbackJob,
  rawFeedback: string
): Promise<boolean> {
  const jobRef = adminDb.collection(JOBS_COLLECTION).doc(jobId)
  const sessionRef = adminDb.collection(SESSIONS_COLLECTION).doc(job.session_id)
  const sections = completeFeedbackSections(parseFeedbackSections(rawFeedback), {
    rawFeedback,
    scenarioTitle: job.scenario_title,
    overallScore: job.scores.overall,
  })

  return adminDb.runTransaction(async (transaction) => {
    const [jobSnapshot, sessionSnapshot] = await Promise.all([
      transaction.get(jobRef),
      transaction.get(sessionRef),
    ])
    if (!jobSnapshot.exists) return false
    if (jobSnapshot.get("lease_token") !== token) return false
    if (!sessionSnapshot.exists) {
      transaction.update(jobRef, {
        status: "failed",
        last_error: "Session not found during feedback backfill",
        lease_until: FieldValue.delete(),
        updated_at: FieldValue.serverTimestamp(),
      })
      return false
    }
    if (sessionSnapshot.get("feedback_status") === "complete") {
      transaction.update(jobRef, {
        status: "complete",
        system_prompt: FieldValue.delete(),
        user_prompt: FieldValue.delete(),
        lease_until: FieldValue.delete(),
        updated_at: FieldValue.serverTimestamp(),
      })
      return false
    }

    transaction.update(sessionRef, {
      feedback: rawFeedback,
      feedback_status: "complete",
      feedback_source: "backfill",
      feedback_error: FieldValue.delete(),
      structured_feedback: {
        scores: job.scores,
        tldr: sections.tldr,
        whatWorked: sections.whatWorked,
        fixNext: sections.fixNext,
        actionPlan: sections.actionPlan,
        rawFeedback,
      },
      silent_notes: job.silent_notes ?? [],
      ...(job.scenario_type === "bugfix" && {
        bugfix_evidence_summary: job.bugfix_evidence_summary ?? null,
        bugfix_score_breakdown: job.bugfix_score_breakdown ?? null,
        bugfix_post_session_report: job.bugfix_post_session_report ?? null,
      }),
      feedback_persisted_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    })
    transaction.update(jobRef, {
      status: "complete",
      system_prompt: FieldValue.delete(),
      user_prompt: FieldValue.delete(),
      lease_until: FieldValue.delete(),
      lease_token: FieldValue.delete(),
      completed_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    })
    return true
  })
}

async function recordFailure(jobId: string, token: string, job: FeedbackJob, error: unknown) {
  const jobRef = adminDb.collection(JOBS_COLLECTION).doc(jobId)
  const sessionRef = adminDb.collection(SESSIONS_COLLECTION).doc(job.session_id)
  const message =
    error instanceof Error ? error.message.slice(0, 500) : "Feedback generation failed"
  const terminal = job.attempt_count >= MAX_WORKER_ATTEMPTS
  const nextAttemptAt = Timestamp.fromMillis(
    Date.now() + (BACKOFF_MS[job.attempt_count - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1])
  )

  await adminDb.runTransaction(async (transaction) => {
    const [jobSnapshot, sessionSnapshot] = await Promise.all([
      transaction.get(jobRef),
      transaction.get(sessionRef),
    ])
    if (!jobSnapshot.exists || jobSnapshot.get("lease_token") !== token) return
    const status = terminal ? "failed" : "queued"
    transaction.update(jobRef, {
      status,
      ...(terminal ? {} : { next_attempt_at: nextAttemptAt }),
      lease_until: FieldValue.delete(),
      lease_token: FieldValue.delete(),
      last_error: message,
      updated_at: FieldValue.serverTimestamp(),
    })
    if (sessionSnapshot.exists && sessionSnapshot.get("feedback_status") !== "complete") {
      transaction.update(sessionRef, {
        feedback_status: status,
        ...(terminal ? { feedback_error: message } : { feedback_error: FieldValue.delete() }),
        updated_at: FieldValue.serverTimestamp(),
      })
    }
  })
}

export async function GET(request: NextRequest) {
  const auth = verifyCronRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    if (await isGlobalCeilingExceeded()) {
      return NextResponse.json({ success: true, skipped: "global spend ceiling reached" })
    }

    const claimed = await claimNextJob()
    if (!claimed) return NextResponse.json({ success: true, processed: 0 })

    const { job, jobId, token } = claimed
    try {
      const response = await generateFeedbackResponse(job.system_prompt, job.user_prompt, [], {
        service: "feedback-generation",
        userId: job.user_id,
        sessionId: job.session_id,
        scenarioId: job.scenario_id ?? undefined,
      })
      if (!response.text.trim()) throw new Error("Feedback provider returned an empty response")
      const completed = await finishJob(jobId, token, job, response.text)
      return NextResponse.json({ success: true, processed: completed ? 1 : 0 })
    } catch (error) {
      await recordFailure(jobId, token, job, error)
      logger.error("[Feedback Job Worker] Narrative attempt failed", {
        jobId,
        sessionId: job.session_id,
        attempt: job.attempt_count,
        error,
      })
      return NextResponse.json({ success: true, processed: 1, retried: true })
    }
  } catch (error) {
    logger.error("[Feedback Job Worker] Run failed", { error })
    return NextResponse.json({ error: "Feedback worker failed" }, { status: 500 })
  }
}

export const POST = GET

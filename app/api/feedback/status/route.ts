/**
 * Feedback Status API - Check status of background feedback job
 *
 * Poll this endpoint to check if rich feedback is ready.
 * Returns:
 * - "pending": Job queued but not started
 * - "processing": Job is running
 * - "complete": Rich feedback is ready
 * - "failed": Job failed (includes error)
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"

export const maxDuration = 5 // Quick check, no heavy processing

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }

  try {
    const jobDoc = await adminDb.collection("feedback_jobs").doc(jobId).get()

    if (!jobDoc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const job = jobDoc.data()!

    // A job's feedback result is private to its owner.
    if (job.userId !== authResult.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Base response
    const response: {
      jobId: string
      status: "pending" | "processing" | "complete" | "failed"
      progress?: number
      createdAt?: string
      completedAt?: string
      error?: string
      result?: {
        feedback: string
        scores: Record<string, number>
        structured: Record<string, unknown>
        constitutionalAICritique?: Record<string, unknown>
      }
    } = {
      jobId,
      status: job.status,
      createdAt: job.createdAt?.toDate?.()?.toISOString() || job.createdAt,
    }

    // Add status-specific data
    if (job.status === "processing") {
      response.progress = job.progress || 0
    }

    if (job.status === "complete") {
      response.completedAt = job.completedAt?.toDate?.()?.toISOString() || job.completedAt
      response.result = {
        feedback: job.output?.feedback,
        scores: job.output?.scores,
        structured: job.output?.structured,
        constitutionalAICritique: job.output?.constitutionalAICritique,
      }
    }

    if (job.status === "failed") {
      response.error = job.error || "Unknown error"
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error("[Feedback Status] Error", { error, jobId })
    return NextResponse.json({ error: "Failed to check job status" }, { status: 500 })
  }
}

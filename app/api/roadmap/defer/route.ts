import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { logger } from "@/lib/logger"
import type { FirestoreRoadmapData } from "@/lib/roadmap/roadmap-serialization"
import { deferQuestionInPlans } from "@/lib/roadmap/defer-question"
import { calculateIsOnTrack, computeCompletionCounts } from "@/lib/roadmap/roadmap-progress"

const COLLECTION = "user_roadmaps"

interface DeferRequestBody {
  roadmapId?: string
  scenarioId?: string
}

/**
 * POST /api/roadmap/defer - Reschedule a roadmap question to a later day.
 *
 * Unlike the lossy skip (handled by /api/roadmap/progress), this MOVES the
 * question object to a later day and resets it to "pending". Thin handler:
 * authenticate, gate, then delegate the move and count recomputation to shared
 * lib/roadmap helpers inside a transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Server-side tier gate: roadmap is a Pro feature.
    const tierCheck = await requireTierForUser(authResult.userId, "pro")
    if (tierCheck.response) return tierCheck.response

    const userId = authResult.userId
    const { roadmapId, scenarioId } = (await request.json()) as DeferRequestBody

    if (!roadmapId || !scenarioId) {
      return NextResponse.json(
        { error: "Roadmap ID and scenario ID are required" },
        { status: 400 }
      )
    }

    const docRef = adminDb.collection(COLLECTION).doc(roadmapId)

    const result = await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef)
      if (!doc.exists) {
        throw new Error("ROADMAP_NOT_FOUND")
      }

      const roadmapData = doc.data() as FirestoreRoadmapData | undefined
      if (roadmapData?.userId !== userId) {
        throw new Error("UNAUTHORIZED")
      }

      const dailyPlans = roadmapData.dailyPlans ?? []
      const move = deferQuestionInPlans(dailyPlans, scenarioId, new Date())

      if (!move.ok) {
        throw new Error(move.reason === "no_later_day" ? "NO_LATER_DAY" : "QUESTION_NOT_FOUND")
      }

      const { questionsCompleted, questionsSkipped } = computeCompletionCounts(move.updatedPlans)
      const isOnTrack = calculateIsOnTrack(move.updatedPlans, roadmapData.interviewDate)
      const targetDayNumber = move.updatedPlans[move.targetDayIndex]?.dayNumber

      transaction.update(docRef, {
        dailyPlans: move.updatedPlans,
        questionsCompleted,
        questionsSkipped,
        isOnTrack,
        updatedAt: new Date(),
      })

      return {
        targetDayIndex: move.targetDayIndex,
        targetDayNumber,
        questionsCompleted,
        questionsSkipped,
        isOnTrack,
      }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ROADMAP_NOT_FOUND") {
        return NextResponse.json({ error: "Roadmap not found" }, { status: 404 })
      }
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
      if (error.message === "QUESTION_NOT_FOUND") {
        return NextResponse.json({ error: "Question not found in roadmap" }, { status: 404 })
      }
      if (error.message === "NO_LATER_DAY") {
        return NextResponse.json(
          { error: "No later day before your interview to move this question to" },
          { status: 409 }
        )
      }
    }

    logger.error("Error deferring roadmap question:", { error })
    return NextResponse.json({ error: "Failed to defer question" }, { status: 500 })
  }
}

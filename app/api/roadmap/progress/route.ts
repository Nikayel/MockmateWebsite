import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"

const COLLECTION = "user_roadmaps"

/**
 * PATCH /api/roadmap/progress - Update question progress
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.userId
    const body = await request.json()

    const { roadmapId, scenarioId, status, score, timeSpentMinutes } = body

    if (!roadmapId || !scenarioId || !status) {
      return NextResponse.json(
        { error: "Roadmap ID, scenario ID, and status are required" },
        { status: 400 }
      )
    }

    if (!["pending", "in_progress", "completed", "skipped"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const docRef = adminDb.collection(COLLECTION).doc(roadmapId)

    // Use a transaction to prevent race conditions when multiple updates happen concurrently
    const result = await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef)

      if (!doc.exists) {
        throw new Error("ROADMAP_NOT_FOUND")
      }

      const roadmapData = doc.data()

      // Verify ownership
      if (roadmapData?.userId !== userId) {
        throw new Error("UNAUTHORIZED")
      }

      // Update the question status in dailyPlans
      const dailyPlans = roadmapData.dailyPlans || []
      let questionFound = false
      let completedCount = roadmapData.questionsCompleted || 0
      let skippedCount = roadmapData.questionsSkipped || 0
      let actualHoursSpent = roadmapData.actualHoursSpent || 0

      const updatedPlans = dailyPlans.map((plan: any) => ({
        ...plan,
        questions: plan.questions.map((q: any) => {
          if (q.scenarioId === scenarioId) {
            questionFound = true

            // Handle status changes
            const wasCompleted = q.status === "completed"
            const wasSkipped = q.status === "skipped"
            const nowCompleted = status === "completed"
            const nowSkipped = status === "skipped"

            // Update counts
            if (!wasCompleted && nowCompleted) completedCount++
            if (wasCompleted && !nowCompleted) completedCount--
            if (!wasSkipped && nowSkipped) skippedCount++
            if (wasSkipped && !nowSkipped) skippedCount--

            // Add time spent
            if (timeSpentMinutes && nowCompleted) {
              actualHoursSpent += timeSpentMinutes / 60
            }

            return {
              ...q,
              status,
              ...(nowCompleted && { completedAt: new Date(), score }),
              ...(status === "pending" && { completedAt: null, score: null }),
            }
          }
          return q
        }),
      }))

      if (!questionFound) {
        throw new Error("QUESTION_NOT_FOUND")
      }

      // Calculate progress
      const totalQuestions = roadmapData.totalQuestions || 0
      const isOnTrack = calculateIsOnTrack(updatedPlans, roadmapData.interviewDate)

      // Update the document within the transaction
      transaction.update(docRef, {
        dailyPlans: updatedPlans,
        questionsCompleted: completedCount,
        questionsSkipped: skippedCount,
        actualHoursSpent,
        isOnTrack,
        updatedAt: new Date(),
      })

      return {
        questionsCompleted: completedCount,
        questionsSkipped: skippedCount,
        progress: Math.round((completedCount / totalQuestions) * 100),
        isOnTrack,
        totalQuestions,
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    // Handle transaction-specific errors
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
    }

    logger.error("Error updating roadmap progress:", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update progress" },
      { status: 500 }
    )
  }
}

/**
 * Calculate if user is on track based on expected vs actual progress
 */
function calculateIsOnTrack(dailyPlans: any[], interviewDate: any): boolean {
  const now = new Date()
  const interview = interviewDate?.toDate?.() || new Date(interviewDate)
  const totalDays = dailyPlans.length

  // Find today's index
  let todayIndex = 0
  for (let i = 0; i < dailyPlans.length; i++) {
    const planDate = dailyPlans[i].date?.toDate?.() || new Date(dailyPlans[i].date)
    if (planDate <= now) {
      todayIndex = i
    }
  }

  // Calculate expected progress
  const expectedProgress = (todayIndex + 1) / totalDays

  // Calculate actual progress
  let completedQuestions = 0
  let totalQuestions = 0
  dailyPlans.forEach((plan) => {
    plan.questions?.forEach((q: any) => {
      totalQuestions++
      if (q.status === "completed") completedQuestions++
    })
  })

  const actualProgress = totalQuestions > 0 ? completedQuestions / totalQuestions : 0

  // Allow 10% buffer before marking as behind
  return actualProgress >= expectedProgress - 0.1
}

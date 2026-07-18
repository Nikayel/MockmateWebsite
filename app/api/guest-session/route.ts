/**
 * Guest Session API
 *
 * Handles guest session creation, retrieval, and updates.
 * Uses Admin SDK to bypass client-side authentication requirements.
 *
 * POST /api/guest-session - Create a new guest session
 * GET /api/guest-session?sessionId=xxx&guestId=xxx - Get guest session
 * PUT /api/guest-session - Update guest session
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { guestSessionRateLimit } from "@/lib/rate-limit"
import { SESSION } from "@/lib/constants"
import { PRICING_CONFIG } from "@/lib/config"
import {
  GuestSessionUpdateSchema,
  validateRequest,
  validationErrorResponse,
} from "@/lib/validations/api-schemas"

// Mark route as dynamic
export const dynamic = "force-dynamic"

/**
 * Validate guest ID format
 */
function isValidGuestId(guestId: string | null): boolean {
  if (!guestId) return false
  // Guest IDs must start with 'guest-' and be a valid UUID format
  return /^guest-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guestId)
}

/**
 * POST /api/guest-session
 * Create a new guest session
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await guestSessionRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { guestId, scenarioTitle, scenarioType, scenarioId, difficulty, pattern } = body

    // Validate guest ID
    if (!isValidGuestId(guestId)) {
      return NextResponse.json({ error: "Invalid guest ID format" }, { status: 400 })
    }

    // Validate required fields
    if (!scenarioTitle || !scenarioType || !difficulty) {
      return NextResponse.json(
        { error: "Missing required fields: scenarioTitle, scenarioType, difficulty" },
        { status: 400 }
      )
    }

    // Check if this guest already has an active session (prevent abuse)
    const existingSessionsQuery = await adminDb
      .collection("interview_sessions")
      .where("user_id", "==", guestId)
      .where("is_guest", "==", true)
      .limit(5)
      .get()

    // Allow max 1 guest session per guest ID to prevent abuse
    if (!existingSessionsQuery.empty) {
      // Check if there's already a completed session
      const hasCompletedSession = existingSessionsQuery.docs.some(
        (doc) => doc.data().completed_at || doc.data().feedback
      )

      if (hasCompletedSession) {
        return NextResponse.json(
          {
            error: "Free trial already used",
            code: "FREE_TRIAL_EXHAUSTED",
            message: `Your free guest session is used up. Create a free account to get ${PRICING_CONFIG.free.sessionsDisplay}. No credit card needed.`,
          },
          { status: 403 }
        )
      }

      // If there's an incomplete session, return it instead of creating a new one
      const incompleteSession = existingSessionsQuery.docs.find(
        (doc) => !doc.data().completed_at && !doc.data().feedback
      )
      if (incompleteSession) {
        return NextResponse.json({
          sessionId: incompleteSession.id,
          message: "Returning existing session",
          isExisting: true,
        })
      }
    }

    // Create new session
    const sessionRef = adminDb.collection("interview_sessions").doc()
    const now = new Date().toISOString()
    const expiresAt = new Date(
      Date.now() + SESSION.GUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

    const sessionData = {
      id: sessionRef.id,
      user_id: guestId,
      is_guest: true,
      topic: scenarioTitle,
      type: scenarioType,
      pattern: pattern || scenarioType,
      scenario_id: scenarioId || null,
      difficulty,
      started_at: now,
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
    }

    await sessionRef.set(sessionData)

    logger.info("Guest session created", {
      sessionId: sessionRef.id,
      guestId,
      scenarioType,
    })

    return NextResponse.json({
      sessionId: sessionRef.id,
      message: "Session created",
      expiresAt,
    })
  } catch (error) {
    logger.error("Failed to create guest session", { error })
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}

/**
 * GET /api/guest-session?sessionId=xxx&guestId=xxx
 * Get guest session details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const guestId = searchParams.get("guestId")

    if (!sessionId || !guestId) {
      return NextResponse.json({ error: "sessionId and guestId are required" }, { status: 400 })
    }

    if (!isValidGuestId(guestId)) {
      return NextResponse.json({ error: "Invalid guest ID format" }, { status: 400 })
    }

    const sessionDoc = await adminDb.collection("interview_sessions").doc(sessionId).get()

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const sessionData = sessionDoc.data()

    // Verify ownership
    if (sessionData?.user_id !== guestId || !sessionData?.is_guest) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({
      session: sessionData,
    })
  } catch (error) {
    logger.error("Failed to get guest session", { error })
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }
}

/**
 * PUT /api/guest-session
 * Update guest session (save state, complete, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Apply rate limiting (same as POST) to prevent abuse
    const rateLimitResponse = await guestSessionRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const rawBody = await request.json()
    const validation = validateRequest(GuestSessionUpdateSchema, rawBody)
    if (!validation.success) {
      return validationErrorResponse(validation.error)
    }
    const {
      sessionId,
      guestId,
      sessionState,
      performanceScore,
      feedback,
      finalCode,
      language,
      testResults,
      timeComplexity,
      spaceComplexity,
      efficiencyScore,
    } = validation.data

    if (!sessionId || !guestId) {
      return NextResponse.json({ error: "sessionId and guestId are required" }, { status: 400 })
    }

    if (!isValidGuestId(guestId)) {
      return NextResponse.json({ error: "Invalid guest ID format" }, { status: 400 })
    }

    // Verify session ownership
    const sessionDoc = await adminDb.collection("interview_sessions").doc(sessionId).get()

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const sessionData = sessionDoc.data()

    if (sessionData?.user_id !== guestId || !sessionData?.is_guest) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    // Session state update (for recovery)
    if (sessionState) {
      updateData.session_state = {
        code: sessionState.code,
        language: sessionState.language,
        elapsed_time: sessionState.elapsedTime,
        chat_messages: sessionState.chatMessages?.slice(-20),
        interviewer_messages: sessionState.interviewerMessages?.slice(-20),
        test_results: sessionState.testResults?.slice(-10),
        saved_at: new Date().toISOString(),
      }
    }

    // Completion data
    if (performanceScore !== undefined) {
      updateData.performance_score = performanceScore
      updateData.completed_at = new Date().toISOString()
    }
    if (feedback) updateData.feedback = feedback
    if (finalCode) updateData.final_code = finalCode
    if (language) updateData.language = language
    if (testResults) {
      updateData.test_results = testResults
      updateData.tests_passed = testResults.filter((t) => t.passed).length
      updateData.tests_total = testResults.length
    }
    if (timeComplexity) updateData.time_complexity = timeComplexity
    if (spaceComplexity) updateData.space_complexity = spaceComplexity
    if (efficiencyScore) updateData.efficiency_score = efficiencyScore

    await adminDb.collection("interview_sessions").doc(sessionId).update(updateData)

    return NextResponse.json({
      success: true,
      message: "Session updated",
    })
  } catch (error) {
    logger.error("Failed to update guest session", { error })
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}

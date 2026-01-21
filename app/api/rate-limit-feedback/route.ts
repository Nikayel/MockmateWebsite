import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { apiRateLimit } from "@/lib/rate-limit"

/**
 * API endpoint to collect user feedback when they think rate limiting was applied incorrectly.
 * This helps identify bugs and improve the rate limiting system.
 *
 * Feedback is stored in Firestore for admin review.
 */

interface RateLimitFeedbackPayload {
  type: "rate_limit" | "budget_exceeded" | "concurrent_limit" | "session_limit"
  code?: string
  message: string
  userMessage?: string
  timestamp: string
  // Optional context
  endpoint?: string
  tier?: string
}

export async function POST(request: NextRequest) {
  // Apply rate limiting (stricter to prevent abuse)
  const rateLimitResponse = await apiRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Get user ID from auth token (optional - allow anonymous feedback)
    let userId: string | null = null
    let userEmail: string | null = null

    const authHeader = request.headers.get("Authorization")
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7)
        const decodedToken = await adminAuth.verifyIdToken(token)
        userId = decodedToken.uid
        userEmail = decodedToken.email || null
      } catch {
        // Continue without auth - allow anonymous feedback
      }
    }

    // Get client IP for abuse tracking
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown"

    // Parse request body
    const body = (await request.json()) as RateLimitFeedbackPayload

    // Validate required fields
    if (!body.type || !body.message || !body.timestamp) {
      return NextResponse.json(
        { error: "Missing required fields: type, message, timestamp" },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ["rate_limit", "budget_exceeded", "concurrent_limit", "session_limit"]
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Validate userMessage length (prevent abuse)
    if (body.userMessage && body.userMessage.length > 1000) {
      return NextResponse.json(
        { error: "User message exceeds maximum length of 1000 characters" },
        { status: 400 }
      )
    }

    // Store feedback in Firestore
    const feedbackData = {
      // Feedback details
      type: body.type,
      code: body.code || null,
      systemMessage: body.message,
      userMessage: body.userMessage || null,
      feedbackTimestamp: body.timestamp,

      // Context
      endpoint: body.endpoint || null,
      tier: body.tier || null,

      // User info (for following up)
      userId: userId,
      userEmail: userEmail,
      clientIp: clientIp,
      userAgent: request.headers.get("user-agent") || null,

      // Admin fields
      status: "pending", // pending, reviewed, resolved, dismissed
      reviewedBy: null,
      reviewedAt: null,
      resolution: null,
      notes: null,

      // Metadata
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await adminDb.collection("rate_limit_feedback").add(feedbackData)

    logger.info("Rate limit feedback submitted", {
      feedbackId: docRef.id,
      type: body.type,
      code: body.code,
      userId: userId || "anonymous",
      clientIp,
    })

    return NextResponse.json({
      success: true,
      feedbackId: docRef.id,
      message: "Thank you for your feedback. We'll review it shortly.",
    })
  } catch (error) {
    logger.error("Failed to submit rate limit feedback", { error })
    return NextResponse.json(
      { error: "Failed to submit feedback. Please try again." },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for admin to retrieve feedback
 * Protected by admin auth check
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const decodedToken = await adminAuth.verifyIdToken(token)

    // Check if user is admin (you may want to use a different method)
    const userDoc = await adminDb.collection("profiles").doc(decodedToken.uid).get()
    const userData = userDoc.data()
    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const type = searchParams.get("type")

    // Build query
    let query = adminDb.collection("rate_limit_feedback").orderBy("createdAt", "desc").limit(limit)

    if (status !== "all") {
      query = query.where("status", "==", status)
    }

    if (type) {
      query = query.where("type", "==", type)
    }

    const snapshot = await query.get()

    const feedback = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      reviewedAt: doc.data().reviewedAt?.toDate?.()?.toISOString() || null,
    }))

    // Get counts by status
    const countsSnapshot = await adminDb.collection("rate_limit_feedback").get()
    const counts = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
      total: countsSnapshot.size,
    }

    countsSnapshot.docs.forEach((doc) => {
      const s = doc.data().status as keyof typeof counts
      if (s in counts) {
        counts[s]++
      }
    })

    return NextResponse.json({
      feedback,
      counts,
      hasMore: snapshot.size === limit,
    })
  } catch (error) {
    logger.error("Failed to fetch rate limit feedback", { error })
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
  }
}

/**
 * PATCH endpoint for admin to update feedback status
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const decodedToken = await adminAuth.verifyIdToken(token)

    // Check if user is admin
    const userDoc = await adminDb.collection("profiles").doc(decodedToken.uid).get()
    const userData = userDoc.data()
    if (!userData?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { feedbackId, status, resolution, notes } = body

    if (!feedbackId) {
      return NextResponse.json({ error: "feedbackId is required" }, { status: 400 })
    }

    const validStatuses = ["pending", "reviewed", "resolved", "dismissed"]
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (status) {
      updateData.status = status
      updateData.reviewedBy = decodedToken.uid
      updateData.reviewedAt = new Date()
    }

    if (resolution !== undefined) {
      updateData.resolution = resolution
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    await adminDb.collection("rate_limit_feedback").doc(feedbackId).update(updateData)

    logger.info("Rate limit feedback updated", {
      feedbackId,
      status,
      adminId: decodedToken.uid,
    })

    return NextResponse.json({
      success: true,
      message: "Feedback updated successfully",
    })
  } catch (error) {
    logger.error("Failed to update rate limit feedback", { error })
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
  }
}

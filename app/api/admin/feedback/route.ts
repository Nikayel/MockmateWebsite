/**
 * Feedback Collection API
 *
 * Manage user feedback, feature requests, and NPS surveys
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyToken, getAdminRole } from "@/lib/admin/rbac"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

export interface FeedbackItem {
  id: string
  userId: string
  userEmail?: string
  type: "feedback" | "feature_request" | "bug_report" | "nps"
  content: string
  rating?: number
  npsScore?: number
  status: "new" | "reviewed" | "in_progress" | "resolved" | "declined"
  priority: "low" | "medium" | "high" | "critical"
  category?: string
  votes: number
  createdAt: string
  updatedAt: string
  adminNotes?: string
}

// GET - List feedback
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const role = await getAdminRole(auth.userId)
    if (!role) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)

    let query = adminDb.collection("feedback").orderBy("createdAt", "desc")

    if (status && status !== "all") {
      query = query.where("status", "==", status)
    }
    if (type && type !== "all") {
      query = query.where("type", "==", type)
    }

    query = query.limit(limit)

    const snapshot = await query.get()
    const feedback: FeedbackItem[] = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: data.userId,
        userEmail: data.userEmail,
        type: data.type || "feedback",
        content: data.content,
        rating: data.rating,
        npsScore: data.npsScore,
        status: data.status || "new",
        priority: data.priority || "medium",
        category: data.category,
        votes: data.votes || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        adminNotes: data.adminNotes,
      }
    })

    // Calculate stats
    const allFeedbackSnapshot = await adminDb.collection("feedback").get()
    const allFeedback = allFeedbackSnapshot.docs.map((d) => d.data())

    const npsScores = allFeedback.filter((f) => f.npsScore !== undefined).map((f) => f.npsScore)
    const promoters = npsScores.filter((s) => s >= 9).length
    const detractors = npsScores.filter((s) => s <= 6).length
    const npsScore =
      npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0

    const stats = {
      total: allFeedback.length,
      new: allFeedback.filter((f) => f.status === "new").length,
      inProgress: allFeedback.filter((f) => f.status === "in_progress").length,
      resolved: allFeedback.filter((f) => f.status === "resolved").length,
      featureRequests: allFeedback.filter((f) => f.type === "feature_request").length,
      bugReports: allFeedback.filter((f) => f.type === "bug_report").length,
      npsScore,
      avgRating:
        allFeedback.filter((f) => f.rating).length > 0
          ? Math.round(
              (allFeedback.filter((f) => f.rating).reduce((s, f) => s + f.rating, 0) /
                allFeedback.filter((f) => f.rating).length) *
                10
            ) / 10
          : 0,
    }

    return NextResponse.json({ success: true, feedback, stats })
  } catch (error) {
    console.error("[Feedback API] GET Error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch feedback" }, { status: 500 })
  }
}

// POST - Submit feedback (for users) or create feedback (for admins)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    const body = await request.json()
    const { type = "feedback", content, rating, npsScore, category, priority = "medium" } = body

    if (!content) {
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 })
    }

    const now = Timestamp.now()
    const feedbackData = {
      userId: auth.userId,
      userEmail: auth.email,
      type,
      content,
      rating,
      npsScore,
      category,
      priority,
      status: "new",
      votes: 0,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await adminDb.collection("feedback").add(feedbackData)

    return NextResponse.json({ success: true, feedbackId: docRef.id })
  } catch (error) {
    console.error("[Feedback API] POST Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit feedback" },
      { status: 500 }
    )
  }
}

// PUT - Update feedback status/notes (admin only)
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    // Editing feedback is a mutation, so it takes the same gate as DELETE below. A truthy-role
    // check would admit `analyst` (documented read-only) and `support`.
    const role = await getAdminRole(auth.userId)
    if (!role || !["super_admin", "admin"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    const body = await request.json()
    const { id, status, priority, adminNotes } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Feedback ID is required" },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = { updatedAt: Timestamp.now() }
    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes

    await adminDb.collection("feedback").doc(id).update(updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Feedback API] PUT Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update feedback" },
      { status: 500 }
    )
  }
}

// DELETE - Delete feedback (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const auth = await verifyToken(token)
    if (!auth.valid || !auth.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const role = await getAdminRole(auth.userId)
    if (!role || !["super_admin", "admin"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Feedback ID is required" },
        { status: 400 }
      )
    }

    await adminDb.collection("feedback").doc(id).delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Feedback API] DELETE Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete feedback" },
      { status: 500 }
    )
  }
}

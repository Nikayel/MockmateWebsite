/**
 * Admin triage for the `feedback` collection.
 *
 * Reads and updates the reports users send through POST /api/product-feedback. There is
 * deliberately no POST here: an unvalidated user-writable handler sitting among role-gated ones is
 * what let a normal account seed this queue with its own status, priority, adminNotes and vote
 * count.
 *
 * Two properties this file is responsible for:
 *
 * 1. Every value it emits is one the admin UI knows how to render. Firestore documents outlive the
 *    code that wrote them, so a stored `type` of "nps" (a value this product no longer offers) is
 *    normalized here rather than shipped to a client that will index a config record with it.
 * 2. Reading the queue costs a page, not the collection. The stat cards used to be computed by
 *    pulling every document on every request and counting in JavaScript, so the cost of loading the
 *    dashboard grew with the amount of feedback the product had ever received.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyToken, getAdminRole } from "@/lib/admin/rbac"
import { Timestamp } from "firebase-admin/firestore"
import type { Query } from "firebase-admin/firestore"
import {
  adminFeedbackUpdateSchema,
  resolveFeedbackPriority,
  resolveFeedbackStatus,
  resolveFeedbackType,
  type FeedbackPriority,
  type FeedbackStatus,
  type UserFeedbackType,
} from "@/lib/feedback/user-feedback-schema"

export const dynamic = "force-dynamic"

export interface FeedbackItem {
  id: string
  userId: string
  userEmail: string | null
  type: UserFeedbackType
  content: string
  /** The route the user was on when they wrote this. Context for a bug report. */
  path: string | null
  status: FeedbackStatus
  priority: FeedbackPriority
  votes: number
  createdAt: string | null
  updatedAt: string | null
  /** Set once an admin has actually written back, so the queue records outreach. */
  repliedAt: string | null
  adminNotes: string | null
}

export interface FeedbackStats {
  total: number
  new: number
  inProgress: number
  resolved: number
  featureRequests: number
  bugReports: number
}

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

/** Firestore timestamps, ISO strings and missing values all reach the client the same way. */
function toIsoString(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  return null
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

/**
 * Page size from an untrusted query param.
 *
 * `parseInt("abc")` is NaN, and `Math.min(NaN, 100)` is NaN, which Firestore rejects at the
 * `.limit()` call and turns into a 500 on a request that should simply have used the default.
 */
function parsePageSize(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PAGE_SIZE
  return Math.min(parsed, MAX_PAGE_SIZE)
}

/** Counting server-side keeps the stat cards O(1) in client work and avoids reading documents. */
async function loadStats(): Promise<FeedbackStats> {
  const collection = adminDb.collection("feedback")
  const countOf = async (field?: "status" | "type", value?: string) => {
    const query = field && value ? collection.where(field, "==", value) : collection
    const snapshot = await query.count().get()
    return snapshot.data().count
  }

  const [total, brandNew, inProgress, resolved, featureRequests, bugReports] = await Promise.all([
    countOf(),
    countOf("status", "new"),
    countOf("status", "in_progress"),
    countOf("status", "resolved"),
    countOf("type", "feature_request"),
    countOf("type", "bug_report"),
  ])

  return { total, new: brandNew, inProgress, resolved, featureRequests, bugReports }
}

// GET - List feedback (one page at a time)
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
    const cursor = searchParams.get("cursor")
    const pageSize = parsePageSize(searchParams.get("limit"))

    let query: Query = adminDb.collection("feedback").orderBy("createdAt", "desc")

    if (status && status !== "all") {
      query = query.where("status", "==", status)
    }
    if (type && type !== "all") {
      query = query.where("type", "==", type)
    }

    // A cursor that no longer resolves (the document was deleted between pages) falls back to the
    // first page rather than erroring, because the alternative is a dead "Load more" button.
    if (cursor) {
      const cursorDoc = await adminDb.collection("feedback").doc(cursor).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }

    // One extra document tells us whether another page exists without a second query.
    const snapshot = await query.limit(pageSize + 1).get()
    const hasMore = snapshot.docs.length > pageSize
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs

    const feedback: FeedbackItem[] = docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: typeof data.userId === "string" ? data.userId : "",
        userEmail: toNullableString(data.userEmail),
        type: resolveFeedbackType(data.type),
        content: typeof data.content === "string" ? data.content : "",
        path: toNullableString(data.path),
        status: resolveFeedbackStatus(data.status),
        priority: resolveFeedbackPriority(data.priority),
        votes: typeof data.votes === "number" ? data.votes : 0,
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt),
        repliedAt: toIsoString(data.repliedAt),
        adminNotes: toNullableString(data.adminNotes),
      }
    })

    // Stats describe the whole queue, so they are only worth recomputing on a first page. Paging
    // deeper does not change them and should not pay for six aggregation queries.
    const stats = cursor ? null : await loadStats()

    return NextResponse.json({
      success: true,
      feedback,
      stats,
      nextCursor: hasMore ? docs[docs.length - 1].id : null,
    })
  } catch (error) {
    console.error("[Feedback API] GET Error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch feedback" }, { status: 500 })
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
    }

    // Validated against the same schema the tests pin. Before this, an admin client could write any
    // string into `status`, and a status the UI has no config entry for is exactly the class of
    // stored value that used to blank the page.
    const parsed = adminFeedbackUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid update" },
        { status: 400 }
      )
    }

    const { id, status, priority, adminNotes, assignee, tags, markReplied } = parsed.data

    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() }
    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes
    if (assignee !== undefined) updateData.assignee = assignee
    if (tags !== undefined) updateData.tags = tags
    if (markReplied !== undefined) {
      updateData.repliedAt = markReplied ? Timestamp.now() : null
    }

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

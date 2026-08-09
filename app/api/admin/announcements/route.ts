/**
 * Announcements API
 *
 * Manage system announcements for user communication
 * Supports different announcement types: banner, modal, toast
 */

import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { withPermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { parseBoundedInt } from "@/lib/admin/query-params"
import { AUDIT_ACTIONS, logAdminAction } from "@/lib/admin/audit"
import { Timestamp } from "firebase-admin/firestore"
import type { FullAnnouncement } from "@/lib/types/announcements"

export const dynamic = "force-dynamic"

// Re-export for backwards compatibility
export type Announcement = FullAnnouncement

/** The audit target type for every announcement row, matching the collection. */
const AUDIT_TARGET_TYPE = "announcements"

/**
 * Render an announcement document for the audit trail's before/after fields.
 *
 * A Firestore `Timestamp` survives audit sanitisation as a `{_seconds,
 * _nanoseconds}` pair, which nobody reading a forensics log can date at a
 * glance. Timestamps become ISO strings; everything else passes through.
 */
function toAuditSnapshot(
  data: FirebaseFirestore.DocumentData | undefined
): Record<string, unknown> | null {
  if (!data) return null

  const snapshot: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    snapshot[key] = value instanceof Timestamp ? value.toDate().toISOString() : (value as unknown)
  }
  return snapshot
}

/**
 * Fields a PUT may change. `views`, `dismissals`, `createdBy` and `createdAt`
 * are outside it: the first two are engagement counters the product writes, and
 * an editable counter is a fabricated metric.
 */
const MUTABLE_ANNOUNCEMENT_FIELDS = [
  "title",
  "message",
  "type",
  "priority",
  "targetAudience",
  "targetUserIds",
  "startDate",
  "endDate",
  "dismissible",
  "active",
  "cta",
] as const

/**
 * GET - List announcements. Publishing to every user is a settings-level act and
 * the whole page is one surface, so reading it takes MANAGE_SETTINGS too. The
 * old gate was `if (!role)`, which passes any role the lookup returns.
 */
export const GET = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active") === "true"
    const limitParam = parseBoundedInt(searchParams.get("limit"), {
      min: 1,
      max: 100,
      fallback: 50,
    })
    if (!limitParam.ok) {
      return NextResponse.json(
        { success: false, error: `Invalid limit: ${limitParam.error}` },
        { status: 400 }
      )
    }
    const limit = limitParam.value

    let query = adminDb.collection("announcements").orderBy("createdAt", "desc")

    if (activeOnly) {
      query = query.where("active", "==", true)
    }

    query = query.limit(limit)

    const snapshot = await query.get()
    const announcements: Announcement[] = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "",
        message: data.message || "",
        type: data.type || "banner",
        priority: data.priority || "info",
        targetAudience: data.targetAudience || "all",
        targetUserIds: data.targetUserIds || [],
        startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
        endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate,
        dismissible: data.dismissible ?? true,
        active: data.active ?? false,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        views: data.views || 0,
        dismissals: data.dismissals || 0,
        cta: data.cta,
      }
    })

    // Get stats
    const activeCount = announcements.filter((a) => a.active).length
    const totalViews = announcements.reduce((sum, a) => sum + a.views, 0)
    const totalDismissals = announcements.reduce((sum, a) => sum + a.dismissals, 0)

    return NextResponse.json({
      success: true,
      announcements,
      stats: {
        total: announcements.length,
        active: activeCount,
        totalViews,
        totalDismissals,
      },
    })
  } catch (error) {
    console.error("[Announcements API] GET Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch announcements" },
      { status: 500 }
    )
  }
})

// POST - Create announcement. [super_admin, admin] is exactly MANAGE_SETTINGS.
export const POST = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request, context) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const body = await request.json()
    const {
      title,
      message,
      type = "banner",
      priority = "info",
      targetAudience = "all",
      targetUserIds,
      startDate,
      endDate,
      dismissible = true,
      active = true,
      cta,
    } = body

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Title and message are required" },
        { status: 400 }
      )
    }

    const now = Timestamp.now()
    const announcementData = {
      title,
      message,
      type,
      priority,
      targetAudience,
      targetUserIds: targetUserIds || null,
      startDate: startDate ? Timestamp.fromDate(new Date(startDate)) : now,
      endDate: endDate ? Timestamp.fromDate(new Date(endDate)) : null,
      dismissible,
      active,
      createdBy: context.userId,
      createdAt: now,
      updatedAt: now,
      views: 0,
      dismissals: 0,
      cta: cta || null,
    }

    const docRef = await adminDb.collection("announcements").add(announcementData)

    await logAdminAction(
      context,
      AUDIT_ACTIONS.CREATE_ANNOUNCEMENT,
      { announcementId: docRef.id, title },
      {
        request,
        target: { type: AUDIT_TARGET_TYPE, id: docRef.id, label: title },
        // Nothing existed before a create; the published message is the after.
        before: null,
        after: toAuditSnapshot(announcementData),
      }
    )

    return NextResponse.json({
      success: true,
      announcementId: docRef.id,
    })
  } catch (error) {
    console.error("[Announcements API] POST Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create announcement" },
      { status: 500 }
    )
  }
})

// PUT - Update announcement
export const PUT = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request, context) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Announcement ID is required" },
        { status: 400 }
      )
    }

    const docRef = adminDb.collection("announcements").doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Announcement not found" }, { status: 404 })
    }

    // Allowlist rather than `{ ...updates }`. Spreading the body into update()
    // let a caller overwrite the `views` and `dismissals` engagement counters
    // and forge `createdBy`, which is the only record of who published the
    // message every user sees.
    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() }
    for (const field of MUTABLE_ANNOUNCEMENT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        updateData[field] = updates[field]
      }
    }

    // Convert dates if present; an empty string means "clear the end date" and
    // must become null, or the user route would compare against Invalid Date.
    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(new Date(updates.startDate))
    }
    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(new Date(updates.endDate))
    } else if (Object.prototype.hasOwnProperty.call(updates, "endDate")) {
      updateData.endDate = null
    }

    const before = doc.data()
    await docRef.update(updateData)

    await logAdminAction(
      context,
      AUDIT_ACTIONS.UPDATE_ANNOUNCEMENT,
      // What was applied, not what was asked for.
      { announcementId: id, updates: Object.keys(updateData) },
      {
        request,
        target: { type: AUDIT_TARGET_TYPE, id, label: before?.title ?? null },
        before: toAuditSnapshot(before),
        // The applied update merged over the stored document: an edit to a
        // message every user sees is only reviewable against what it replaced.
        after: toAuditSnapshot({ ...before, ...updateData }),
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Announcements API] PUT Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update announcement" },
      { status: 500 }
    )
  }
})

// DELETE - Delete announcement
export const DELETE = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request, context) => {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Announcement ID is required" },
        { status: 400 }
      )
    }

    const docRef = adminDb.collection("announcements").doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Announcement not found" }, { status: 404 })
    }

    const before = doc.data()
    await docRef.delete()

    await logAdminAction(
      context,
      AUDIT_ACTIONS.DELETE_ANNOUNCEMENT,
      { announcementId: id },
      {
        request,
        target: { type: AUDIT_TARGET_TYPE, id, label: before?.title ?? null },
        // The deleted document is the only remaining record of what was published.
        before: toAuditSnapshot(before),
        after: null,
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Announcements API] DELETE Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete announcement" },
      { status: 500 }
    )
  }
})

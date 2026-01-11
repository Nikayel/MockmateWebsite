/**
 * Announcements API
 *
 * Manage system announcements for user communication
 * Supports different announcement types: banner, modal, toast
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyToken, getAdminRole } from "@/lib/admin/rbac"
import { Timestamp } from "firebase-admin/firestore"
import type { FullAnnouncement } from "@/lib/types/announcements"

export const dynamic = "force-dynamic"

// Re-export for backwards compatibility
export type Announcement = FullAnnouncement

// GET - List announcements
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
    const activeOnly = searchParams.get("active") === "true"
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

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
}

// POST - Create announcement
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
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
      views: 0,
      dismissals: 0,
      cta: cta || null,
    }

    const docRef = await adminDb.collection("announcements").add(announcementData)

    // Log the action
    await adminDb.collection("admin_audit_log").add({
      adminId: auth.userId,
      action: "create_announcement",
      details: { announcementId: docRef.id, title },
      timestamp: now,
    })

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
}

// PUT - Update announcement
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

    const updateData: Record<string, any> = {
      ...updates,
      updatedAt: Timestamp.now(),
    }

    // Convert dates if present
    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(new Date(updates.startDate))
    }
    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(new Date(updates.endDate))
    }

    await docRef.update(updateData)

    // Log the action
    await adminDb.collection("admin_audit_log").add({
      adminId: auth.userId,
      action: "update_announcement",
      details: { announcementId: id, updates: Object.keys(updates) },
      timestamp: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Announcements API] PUT Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update announcement" },
      { status: 500 }
    )
  }
}

// DELETE - Delete announcement
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
        { success: false, error: "Announcement ID is required" },
        { status: 400 }
      )
    }

    const docRef = adminDb.collection("announcements").doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Announcement not found" }, { status: 404 })
    }

    await docRef.delete()

    // Log the action
    await adminDb.collection("admin_audit_log").add({
      adminId: auth.userId,
      action: "delete_announcement",
      details: { announcementId: id },
      timestamp: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Announcements API] DELETE Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete announcement" },
      { status: 500 }
    )
  }
}

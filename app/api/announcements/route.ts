/**
 * User Announcements API
 *
 * Fetches active announcements for the current user based on their tier
 * Handles view tracking and dismissal
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyToken } from "@/lib/admin/rbac"
import { Timestamp, FieldValue } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

export interface UserAnnouncement {
  id: string
  title: string
  message: string
  type: "banner" | "modal" | "toast" | "page"
  priority: "info" | "warning" | "critical" | "success"
  dismissible: boolean
  cta?: {
    text: string
    url: string
  }
}

// GET - Fetch active announcements for the current user
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      console.log("[User Announcements API] Database not available")
      return NextResponse.json({ success: true, announcements: [] })
    }

    // Get auth token if present (announcements can work for logged out users too)
    const authHeader = request.headers.get("Authorization")
    let userId: string | null = null
    let userTier: string = "free"

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const auth = await verifyToken(token)
        if (auth.valid && auth.userId) {
          userId = auth.userId

          // Get user's subscription tier
          const userDoc = await adminDb.collection("profiles").doc(userId).get()
          if (userDoc.exists) {
            userTier = userDoc.data()?.subscription_tier || "free"
          }
        }
      } catch {
        // Continue without auth - show public announcements
      }
    }

    const now = Timestamp.now()
    const nowDate = now.toDate()

    // Priority order for sorting (higher = more important)
    const priorityOrder: Record<string, number> = {
      critical: 4,
      warning: 3,
      success: 2,
      info: 1,
    }

    // Fetch all announcements and filter in code to avoid composite index requirement
    let snapshot
    try {
      snapshot = await adminDb.collection("announcements").get()

      console.log("[User Announcements API] Total announcements in DB:", snapshot.docs.length)
    } catch (queryError) {
      console.error("[User Announcements API] Query error:", queryError)
      return NextResponse.json({ success: true, announcements: [] })
    }

    // Get user's dismissed announcements
    let dismissedIds: string[] = []
    if (userId) {
      const dismissedDoc = await adminDb
        .collection("user_dismissed_announcements")
        .doc(userId)
        .get()

      if (dismissedDoc.exists) {
        dismissedIds = dismissedDoc.data()?.announcementIds || []
      }
    } else {
      // For non-logged in users, check cookie/header
      const dismissedHeader = request.headers.get("X-Dismissed-Announcements")
      if (dismissedHeader) {
        try {
          dismissedIds = JSON.parse(dismissedHeader)
        } catch {
          // Ignore invalid JSON
        }
      }
    }

    const announcements: UserAnnouncement[] = []
    const viewedIds: string[] = []

    for (const doc of snapshot.docs) {
      const data = doc.data()
      const announcementId = doc.id

      // Skip inactive announcements
      if (!data.active) {
        console.log("[User Announcements API] Skipping", announcementId, "- not active")
        continue
      }

      // Skip dismissed announcements (if dismissible)
      if (data.dismissible && dismissedIds.includes(announcementId)) {
        console.log("[User Announcements API] Skipping", announcementId, "- dismissed by user")
        continue
      }

      // Check date range - handle both Firestore Timestamps and ISO strings
      let startDate: Date
      if (data.startDate?.toDate) {
        startDate = data.startDate.toDate()
      } else if (data.startDate) {
        startDate = new Date(data.startDate)
      } else {
        startDate = new Date(0) // Default to epoch if no start date
      }

      let endDate: Date | null = null
      if (data.endDate?.toDate) {
        endDate = data.endDate.toDate()
      } else if (data.endDate) {
        endDate = new Date(data.endDate)
      }

      if (nowDate < startDate) {
        console.log(
          "[User Announcements API] Skipping",
          announcementId,
          "- not started yet. Start:",
          startDate,
          "Now:",
          nowDate
        )
        continue // Not started yet
      }

      if (endDate && nowDate > endDate) {
        console.log(
          "[User Announcements API] Skipping",
          announcementId,
          "- expired. End:",
          endDate,
          "Now:",
          nowDate
        )
        continue // Expired
      }

      // Check target audience
      const targetAudience = data.targetAudience || "all"
      if (targetAudience !== "all") {
        if (targetAudience === "specific") {
          // Check if user is in the specific list
          const targetUserIds = data.targetUserIds || []
          if (!userId || !targetUserIds.includes(userId)) {
            console.log(
              "[User Announcements API] Skipping",
              announcementId,
              "- user not in specific list"
            )
            continue
          }
        } else {
          // Check subscription tier
          if (targetAudience !== userTier) {
            console.log(
              "[User Announcements API] Skipping",
              announcementId,
              "- tier mismatch. Required:",
              targetAudience,
              "User:",
              userTier
            )
            continue
          }
        }
      }

      console.log("[User Announcements API] Including announcement:", announcementId, data.title)
      announcements.push({
        id: announcementId,
        title: data.title,
        message: data.message,
        type: data.type || "banner",
        priority: data.priority || "info",
        dismissible: data.dismissible ?? true,
        cta: data.cta || undefined,
      })

      viewedIds.push(announcementId)
    }

    // Sort announcements by priority (critical first) then by newest
    announcements.sort((a, b) => {
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      if (priorityDiff !== 0) return priorityDiff
      // Both have same priority, already sorted by createdAt from Firestore
      return 0
    })

    // Limit to 10 announcements after filtering and sorting
    const limitedAnnouncements = announcements.slice(0, 10)
    const limitedViewedIds = viewedIds.slice(0, 10)

    // Increment view counts (fire and forget)
    if (limitedViewedIds.length > 0) {
      Promise.all(
        limitedViewedIds.map((id) =>
          adminDb
            .collection("announcements")
            .doc(id)
            .update({
              views: FieldValue.increment(1),
            })
            .catch(() => {
              // Ignore errors - view tracking is not critical
            })
        )
      ).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      announcements: limitedAnnouncements,
    })
  } catch (error) {
    console.error("[User Announcements API] GET Error:", error)
    return NextResponse.json({ success: true, announcements: [] })
  }
}

// POST - Dismiss an announcement
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: true })
    }

    const body = await request.json()
    const { announcementId } = body

    if (!announcementId) {
      return NextResponse.json(
        { success: false, error: "Announcement ID is required" },
        { status: 400 }
      )
    }

    // Get auth token
    const authHeader = request.headers.get("Authorization")
    let userId: string | null = null

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const auth = await verifyToken(token)
        if (auth.valid && auth.userId) {
          userId = auth.userId
        }
      } catch {
        // Continue without auth
      }
    }

    // Update dismissal count on announcement
    const announcementRef = adminDb.collection("announcements").doc(announcementId)
    const announcementDoc = await announcementRef.get()

    if (!announcementDoc.exists) {
      return NextResponse.json({ success: false, error: "Announcement not found" }, { status: 404 })
    }

    // Check if announcement is dismissible
    if (!announcementDoc.data()?.dismissible) {
      return NextResponse.json(
        { success: false, error: "This announcement cannot be dismissed" },
        { status: 400 }
      )
    }

    // Increment dismissal count
    await announcementRef.update({
      dismissals: FieldValue.increment(1),
    })

    // Store dismissal for logged-in users
    if (userId) {
      const userDismissedRef = adminDb.collection("user_dismissed_announcements").doc(userId)
      const userDismissedDoc = await userDismissedRef.get()

      if (userDismissedDoc.exists) {
        const currentIds = userDismissedDoc.data()?.announcementIds || []
        if (!currentIds.includes(announcementId)) {
          await userDismissedRef.update({
            announcementIds: [...currentIds, announcementId],
            updatedAt: Timestamp.now(),
          })
        }
      } else {
        await userDismissedRef.set({
          announcementIds: [announcementId],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      // Return the ID so client can store in localStorage for non-logged-in users
      announcementId,
    })
  } catch (error) {
    console.error("[User Announcements API] POST Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to dismiss announcement" },
      { status: 500 }
    )
  }
}

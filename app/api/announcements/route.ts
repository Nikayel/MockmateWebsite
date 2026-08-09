/**
 * User Announcements API
 *
 * Fetches active announcements for the current user based on their tier
 * Handles view tracking and dismissal
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { apiRateLimit } from "@/lib/rate-limit"
import { verifyToken } from "@/lib/admin/rbac"
import { Timestamp, FieldValue } from "firebase-admin/firestore"
import { logger } from "@/lib/logger"
import type { Announcement } from "@/lib/types/announcements"

export const dynamic = "force-dynamic"

// Re-export for backwards compatibility
export type UserAnnouncement = Announcement

// GET - Fetch active announcements for the current user
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      logger.debug("[Announcements] Database not available")
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

    // Only active announcements leave Firestore; date-window, audience and
    // dismissal filtering stay in code (cheap over <=50 docs, and they need
    // per-user data anyway). The old unfiltered full-collection get() was
    // polled by every client every 5 minutes, so its cost scaled with every
    // announcement ever written times every user online.
    let snapshot
    try {
      snapshot = await adminDb
        .collection("announcements")
        .where("active", "==", true)
        .limit(50)
        .get()

      logger.debug("[Announcements] Active announcements fetched", {
        count: snapshot.docs.length,
      })
    } catch (queryError: unknown) {
      logger.error("[Announcements] Query error", { error: queryError as Error })
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

    const announcements: Array<UserAnnouncement & { createdAtMs: number }> = []

    for (const doc of snapshot.docs) {
      const data = doc.data()
      const announcementId = doc.id

      // Skip inactive announcements
      if (!data.active) {
        logger.debug("[Announcements] Skipping - not active", { announcementId })
        continue
      }

      // Skip dismissed announcements (if dismissible)
      if (data.dismissible && dismissedIds.includes(announcementId)) {
        logger.debug("[Announcements] Skipping - dismissed by user", { announcementId })
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
        logger.debug("[Announcements] Skipping - not started yet", { announcementId })
        continue
      }

      if (endDate && nowDate > endDate) {
        logger.debug("[Announcements] Skipping - expired", { announcementId })
        continue
      }

      // Check target audience
      const targetAudience = data.targetAudience || "all"
      if (targetAudience !== "all") {
        if (targetAudience === "specific") {
          // Check if user is in the specific list
          const targetUserIds = data.targetUserIds || []
          if (!userId || !targetUserIds.includes(userId)) {
            logger.debug("[Announcements] Skipping - user not in specific list", { announcementId })
            continue
          }
        } else {
          // Check subscription tier
          if (targetAudience !== userTier) {
            logger.debug("[Announcements] Skipping - tier mismatch", { announcementId })
            continue
          }
        }
      }

      logger.debug("[Announcements] Including announcement", { announcementId, title: data.title })
      announcements.push({
        id: announcementId,
        title: data.title,
        message: data.message,
        type: data.type || "banner",
        priority: data.priority || "info",
        dismissible: data.dismissible ?? true,
        cta: data.cta || undefined,
        createdAtMs: data.createdAt?.toMillis?.() ?? 0,
      })
    }

    // Sort by priority (critical first), then newest. The unordered
    // collection get() has no inherent order, so the tie-break is explicit.
    announcements.sort((a, b) => {
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      if (priorityDiff !== 0) return priorityDiff
      return b.createdAtMs - a.createdAtMs
    })

    // Limit to 10 announcements after filtering and sorting
    const limitedAnnouncements = announcements
      .slice(0, 10)
      .map(({ createdAtMs: _createdAtMs, ...announcement }) => announcement)
    const limitedViewedIds = limitedAnnouncements.map((a) => a.id)

    // Increment view counts (fire and forget). Two guards against write
    // amplification: the client reports which ids it has already been counted
    // for (X-Seen-Announcements, sessionStorage-backed), so the 5-minute poll
    // does not re-count the same viewer forever; and the remaining increments
    // go in one WriteBatch instead of one RPC per document.
    let alreadyCountedIds: string[] = []
    const seenHeader = request.headers.get("X-Seen-Announcements")
    if (seenHeader) {
      try {
        const parsed = JSON.parse(seenHeader)
        if (Array.isArray(parsed)) {
          alreadyCountedIds = parsed.filter((id): id is string => typeof id === "string")
        }
      } catch {
        // Ignore invalid JSON
      }
    }

    const uncountedIds = limitedViewedIds.filter((id) => !alreadyCountedIds.includes(id))
    if (uncountedIds.length > 0) {
      const batch = adminDb.batch()
      for (const id of uncountedIds) {
        batch.update(adminDb.collection("announcements").doc(id), {
          views: FieldValue.increment(1),
        })
      }
      batch.commit().catch(() => {
        // Ignore errors - view tracking is not critical
      })
    }

    return NextResponse.json({
      success: true,
      announcements: limitedAnnouncements,
    })
  } catch (error: unknown) {
    logger.error("[Announcements] GET Error", { error: error as Error })
    return NextResponse.json({ success: true, announcements: [] })
  }
}

// POST - Dismiss an announcement
export async function POST(request: NextRequest) {
  try {
    // Dismissals work signed-out, so throttle per IP to keep the dismissal
    // counters honest (API-ABUSE-1).
    const rateLimitResult = await apiRateLimit(request)
    if (rateLimitResult) return rateLimitResult

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

    // Store dismissal for logged-in users. arrayUnion + merge is atomic, so two
    // concurrent dismissals (double click, two tabs) cannot lose each other the
    // way the old read-modify-write could.
    if (userId) {
      await adminDb
        .collection("user_dismissed_announcements")
        .doc(userId)
        .set(
          {
            announcementIds: FieldValue.arrayUnion(announcementId),
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        )
    }

    return NextResponse.json({
      success: true,
      // Return the ID so client can store in localStorage for non-logged-in users
      announcementId,
    })
  } catch (error: unknown) {
    logger.error("[Announcements] POST Error", { error: error as Error })
    return NextResponse.json(
      { success: false, error: "Failed to dismiss announcement" },
      { status: 500 }
    )
  }
}

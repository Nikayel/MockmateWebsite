/**
 * Welcome Email API Route
 *
 * Sends welcome email to new users and creates in-app welcome notification.
 * Called after user signup/first login.
 * Requires authentication to prevent spam abuse.
 */

import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { sendWelcomeEmail } from "@/lib/email"

const db = adminDb

/** A send claim older than this is considered crashed and may be retaken. */
const WELCOME_CLAIM_TTL_MS = 10 * 60 * 1000

/** Validate an IANA timezone string from the client; anything invalid is dropped. */
function validTimezoneOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return null
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return value
  } catch {
    return null
  }
}

/**
 * Create an in-app welcome notification for the user
 */
async function createWelcomeNotification(userId: string, displayName?: string): Promise<void> {
  try {
    const notificationRef = db.collection("in_app_notifications").doc()
    await notificationRef.set({
      id: notificationRef.id,
      userId,
      type: "welcome",
      title: "Welcome to CodeSparring",
      body: "You're set. Start your first practice session whenever you're ready.",
      link: "/practice",
      read: false,
      createdAt: new Date().toISOString(),
    })
    console.log("[Welcome API] Created in-app welcome notification for user:", userId)
  } catch (error) {
    console.error("[Welcome API] Failed to create in-app notification:", error)
    // Non-blocking - email is more important
  }
}

/**
 * Initialize comprehensive notification preferences for new users
 */
async function initializeNotificationPreferences(userId: string, timezone?: string): Promise<void> {
  try {
    const prefsRef = db.collection("notification_preferences").doc(userId)
    const prefsSnap = await prefsRef.get()

    if (!prefsSnap.exists) {
      await prefsRef.set({
        userId,
        enabled: true,
        timezone: timezone || "America/Los_Angeles", // Browser-reported when available
        channels: {
          email: true,
          in_app: true,
          push: false,
        },
        typePreferences: {
          welcome: { enabled: true, channels: ["email", "in_app"] },
          spaced_repetition_review: { enabled: true, channels: ["email", "in_app"] },
          daily_practice_reminder: { enabled: true, channels: ["email", "in_app"] },
          streak_maintenance: { enabled: true, channels: ["in_app"] },
          milestone_celebration: { enabled: true, channels: ["email", "in_app"] },
          interview_countdown: { enabled: true, channels: ["email", "in_app"] },
          roadmap_behind: { enabled: true, channels: ["email", "in_app"] },
        },
        quietHours: {
          enabled: false,
          start: 22,
          end: 8,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      console.log("[Welcome API] Initialized notification preferences for user:", userId)
    }
  } catch (error) {
    console.error("[Welcome API] Failed to initialize notification preferences:", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[Welcome Email API] Request received")
    // Verify Firebase ID token for authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[Welcome Email API] Missing authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let authenticatedUserId: string

    try {
      const decodedToken = await adminAuth.verifyIdToken(token)
      authenticatedUserId = decodedToken.uid
    } catch {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, email, displayName } = body
    const timezone = validTimezoneOrNull(body.timezone)

    if (!userId || !email) {
      return NextResponse.json({ error: "userId and email are required" }, { status: 400 })
    }

    // Security: Only allow users to send welcome emails to themselves
    if (userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: "Cannot send welcome email for another user" },
        { status: 403 }
      )
    }

    // Atomically claim the send. On a first sign-in BOTH the login page and the
    // auth callback fire this route concurrently; a plain check-then-set let both
    // pass the check and the user got two welcome emails. The claim has a TTL so
    // a crashed attempt doesn't block the retry (or the cron fallback) forever.
    const profileRef = db.collection("profiles").doc(userId)
    const claim = await db.runTransaction(async (tx) => {
      const snap = await tx.get(profileRef)
      const profile = snap.exists ? snap.data() : undefined
      if (profile?.welcome_email_sent) return "already-sent"
      const pendingAt = profile?.welcome_email_pending_at
      if (typeof pendingAt === "string") {
        const age = Date.now() - new Date(pendingAt).getTime()
        if (age >= 0 && age < WELCOME_CLAIM_TTL_MS) return "in-flight"
      }
      tx.set(profileRef, { welcome_email_pending_at: new Date().toISOString() }, { merge: true })
      return "claimed"
    })

    if (claim !== "claimed") {
      console.log(`[Welcome Email API] Skipping send (${claim}) for user:`, userId)
      return NextResponse.json({
        success: true,
        message: claim === "already-sent" ? "Welcome email already sent" : "Send already in flight",
        skipped: true,
      })
    }

    // Capture the browser timezone in the store the email cron reads, so quiet
    // hours and rate limiting use the user's real local time instead of the
    // hardcoded Pacific default.
    if (timezone) {
      await profileRef.set({ notification_preferences: { timezone } }, { merge: true })
    }

    // Send welcome email
    console.log("[Welcome Email API] Sending welcome email to:", email)
    const result = await sendWelcomeEmail(userId, email, displayName)
    console.log("[Welcome Email API] Email send result:", result.success, result.error || "success")

    // Always create in-app notification and initialize preferences, even if email fails
    await Promise.all([
      createWelcomeNotification(userId, displayName),
      initializeNotificationPreferences(userId, timezone ?? undefined),
    ])

    if (result.success) {
      // Mark welcome email as sent. Increment the daily counter rather than
      // overwriting it: the cron may already have emailed this user today.
      await profileRef.set(
        {
          welcome_email_sent: true,
          welcome_email_pending_at: FieldValue.delete(),
          welcome_notification_sent: true,
          last_email_sent_at: new Date().toISOString(),
          emails_sent_today: FieldValue.increment(1),
          notification_preferences: {
            email_notifications_enabled: true,
            welcome_email: true,
            inactivity_reminders: true,
            spaced_repetition_reminders: true,
            marketing_emails: false,
          },
        },
        { merge: true }
      )

      // Log the email notification
      await db.collection("email_notifications").add({
        user_id: userId,
        email_type: "welcome",
        status: "sent",
        scheduled_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        source: "api",
      })

      // Record analytics for notification
      try {
        const analyticsRef = db.collection("notification_analytics").doc(userId)
        await analyticsRef.set(
          {
            userId,
            totalSent: 1,
            totalOpened: 0,
            totalDismissed: 0,
            byType: {
              welcome: { sent: 1, lastSentAt: new Date().toISOString() },
            },
            openRate: 0,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      } catch (analyticsError) {
        console.warn("[Welcome API] Failed to update analytics:", analyticsError)
      }
    } else {
      // Even if email failed, mark that we tried and created in-app notification.
      // Clearing the claim lets a retry or the cron fallback attempt the send.
      await profileRef.set(
        {
          welcome_notification_sent: true,
          welcome_email_failed: true,
          welcome_email_error: result.error,
          welcome_email_pending_at: FieldValue.delete(),
          notification_preferences: {
            email_notifications_enabled: true,
            welcome_email: true,
            inactivity_reminders: true,
            spaced_repetition_reminders: true,
            marketing_emails: false,
          },
        },
        { merge: true }
      )

      // Log the failed email notification for debugging
      await db.collection("email_notifications").add({
        user_id: userId,
        email_type: "welcome",
        status: "failed",
        error: result.error || "Unknown error",
        scheduled_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        source: "api",
      })
      console.error("[Welcome API] Email failed, logged to email_notifications:", result.error)
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      inAppNotificationCreated: true,
    })
  } catch (error: any) {
    console.error("[Welcome Email API] Unexpected error:", error)
    console.error("[Welcome Email API] Error stack:", error?.stack)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send welcome email",
      },
      { status: 500 }
    )
  }
}

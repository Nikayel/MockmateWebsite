/**
 * Welcome Email API Route
 *
 * Sends welcome email to new users and creates in-app welcome notification.
 * Called after user signup/first login.
 * Requires authentication to prevent spam abuse.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { sendWelcomeEmail } from "@/lib/email"

const db = adminDb

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
      title: "Welcome to CodeSparring! 🎉",
      body: displayName
        ? `Hey ${displayName.split(" ")[0]}, you're all set! Start your first practice session to begin crushing those interviews.`
        : "You're all set! Start your first practice session to begin crushing those interviews.",
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
async function initializeNotificationPreferences(userId: string): Promise<void> {
  try {
    const prefsRef = db.collection("notification_preferences").doc(userId)
    const prefsSnap = await prefsRef.get()

    if (!prefsSnap.exists) {
      await prefsRef.set({
        userId,
        enabled: true,
        timezone: "America/Los_Angeles", // Default to Pacific Time, user can update in settings
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

    // Check if welcome email already sent
    const profileRef = db.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()

    if (profileSnap.exists) {
      const profile = profileSnap.data()
      if (profile?.welcome_email_sent) {
        console.log("[Welcome Email API] Welcome email already sent for user:", userId)
        return NextResponse.json({
          success: true,
          message: "Welcome email already sent",
          skipped: true,
        })
      }
    }

    // Send welcome email
    console.log("[Welcome Email API] Sending welcome email to:", email)
    const result = await sendWelcomeEmail(userId, email, displayName)
    console.log("[Welcome Email API] Email send result:", result.success, result.error || "success")

    // Always create in-app notification and initialize preferences, even if email fails
    await Promise.all([
      createWelcomeNotification(userId, displayName),
      initializeNotificationPreferences(userId),
    ])

    if (result.success) {
      // Mark welcome email as sent
      await profileRef.set(
        {
          welcome_email_sent: true,
          welcome_notification_sent: true,
          last_email_sent_at: new Date().toISOString(),
          emails_sent_today: 1,
          notification_preferences: {
            email_notifications_enabled: true,
            welcome_email: true,
            inactivity_reminders: true,
            spaced_repetition_reminders: true,
            milestone_celebrations: true,
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
      // Even if email failed, mark that we tried and created in-app notification
      await profileRef.set(
        {
          welcome_notification_sent: true,
          welcome_email_failed: true,
          welcome_email_error: result.error,
          notification_preferences: {
            email_notifications_enabled: true,
            welcome_email: true,
            inactivity_reminders: true,
            spaced_repetition_reminders: true,
            milestone_celebrations: true,
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

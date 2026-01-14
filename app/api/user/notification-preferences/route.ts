/**
 * Notification Preferences API Route
 *
 * GET - Retrieve user's notification preferences
 * PUT - Update user's notification preferences
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAuth } from "@/lib/auth-helpers"
import type { NotificationPreferences } from "@/lib/types"

const db = adminDb

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_notifications_enabled: true,
  welcome_email: true,
  inactivity_reminders: true,
  spaced_repetition_reminders: true,
  milestone_celebrations: true,
  roadmap_reminders: true,
  marketing_emails: false,
  preferred_hours: [9, 10, 11, 14, 15, 19, 20],
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = auth.userId
    const profileRef = db.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()

    if (!profileSnap.exists) {
      return NextResponse.json({ preferences: DEFAULT_PREFERENCES })
    }

    const profile = profileSnap.data()
    const preferences = profile?.notification_preferences || DEFAULT_PREFERENCES

    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error("[Notification Preferences GET] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get preferences" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = auth.userId
    const body = await request.json()
    const { preferences } = body

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json({ error: "Invalid preferences object" }, { status: 400 })
    }

    // Validate and sanitize preferences
    const sanitizedPreferences: NotificationPreferences = {
      email_notifications_enabled: Boolean(preferences.email_notifications_enabled ?? true),
      welcome_email: Boolean(preferences.welcome_email ?? true),
      inactivity_reminders: Boolean(preferences.inactivity_reminders ?? true),
      spaced_repetition_reminders: Boolean(preferences.spaced_repetition_reminders ?? true),
      milestone_celebrations: Boolean(preferences.milestone_celebrations ?? true),
      roadmap_reminders: Boolean(preferences.roadmap_reminders ?? true),
      marketing_emails: Boolean(preferences.marketing_emails ?? false),
      timezone: preferences.timezone || undefined,
      preferred_hours: Array.isArray(preferences.preferred_hours)
        ? preferences.preferred_hours.filter((h: number) => h >= 0 && h <= 23)
        : DEFAULT_PREFERENCES.preferred_hours,
    }

    const profileRef = db.collection("profiles").doc(userId)
    await profileRef.set(
      {
        notification_preferences: sanitizedPreferences,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      preferences: sanitizedPreferences,
    })
  } catch (error: any) {
    console.error("[Notification Preferences PUT] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update preferences" },
      { status: 500 }
    )
  }
}

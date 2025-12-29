/**
 * Welcome Email API Route
 *
 * Sends welcome email to new users.
 * Called after user signup/first login.
 * Requires authentication to prevent spam abuse.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { sendWelcomeEmail } from "@/lib/email";

const db = adminDb;

export async function POST(request: NextRequest) {
  try {
    console.log("[Welcome Email API] Request received");
    // Verify Firebase ID token for authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[Welcome Email API] Missing authorization header");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let authenticatedUserId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      authenticatedUserId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, email, displayName } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required" },
        { status: 400 }
      );
    }

    // Security: Only allow users to send welcome emails to themselves
    if (userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: "Cannot send welcome email for another user" },
        { status: 403 }
      );
    }

    // Check if welcome email already sent
    const profileRef = db.collection("profiles").doc(userId);
    const profileSnap = await profileRef.get();

    if (profileSnap.exists) {
      const profile = profileSnap.data();
      if (profile?.welcome_email_sent) {
        return NextResponse.json({
          success: true,
          message: "Welcome email already sent",
          skipped: true,
        });
      }
    }

    // Send welcome email
    console.log("[Welcome Email API] Sending welcome email to:", email);
    const result = await sendWelcomeEmail(userId, email, displayName);
    console.log("[Welcome Email API] Email send result:", result.success, result.error || "success");

    if (result.success) {
      // Mark welcome email as sent
      await profileRef.set(
        {
          welcome_email_sent: true,
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
      );

      // Log the email notification
      await db.collection("email_notifications").add({
        user_id: userId,
        email_type: "welcome",
        status: "sent",
        scheduled_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (error: any) {
    console.error("[Welcome Email] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send welcome email" },
      { status: 500 }
    );
  }
}

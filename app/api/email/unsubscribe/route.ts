/**
 * No-login unsubscribe endpoint for reminder-class emails.
 *
 * GET renders a small confirmation page (safe, no state change) whose button POSTs
 * back here. POST performs the unsubscribe; it is also the RFC 8058 one-click
 * target mail clients call from the List-Unsubscribe header, so it must succeed
 * with no interaction and no auth beyond the HMAC token minted into the email
 * (lib/email/unsubscribe.ts). The token can only set one category toggle to false
 * for one user, so replay is harmless.
 *
 * The toggle written is the profiles.notification_preferences map field, which is
 * the store the email cron actually checks before sending.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { verifyUnsubscribeToken, UNSUBSCRIBE_CATEGORIES } from "@/lib/email/unsubscribe"

export const dynamic = "force-dynamic"

const CATEGORY_LABELS: Record<keyof typeof UNSUBSCRIBE_CATEGORIES, string> = {
  inactivity: "practice nudges",
  spaced_repetition: "review reminders",
  roadmap: "roadmap reminders",
}

function page(title: string, body: string, status = 200): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 48px 20px;">
  <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0;">
    <span style="font-size: 15px; font-weight: 600; color: #333;">CodeSparring</span>
  </div>
  ${body}
</body>
</html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

function invalidTokenPage(): NextResponse {
  return page(
    "Link expired",
    `<p>This unsubscribe link isn't valid anymore.</p>
     <p>You can manage all email preferences from your <a href="/account" style="color: #0066cc;">account page</a>.</p>`,
    400
  )
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || ""
  const verified = verifyUnsubscribeToken(token)
  if (!verified) return invalidTokenPage()

  const label = CATEGORY_LABELS[verified.category]
  return page(
    "Unsubscribe",
    `<p>Stop receiving <strong>${label}</strong> from CodeSparring?</p>
     <form method="POST">
       <button type="submit" style="background-color: #0066cc; color: #ffffff; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; cursor: pointer;">Unsubscribe</button>
     </form>
     <p style="margin-top: 24px; font-size: 13px; color: #666;">Finer control lives on your <a href="/account" style="color: #666;">account page</a>.</p>`
  )
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || ""
  const verified = verifyUnsubscribeToken(token)
  if (!verified) return invalidTokenPage()

  const { userId, category } = verified
  const preferenceField = UNSUBSCRIBE_CATEGORIES[category]

  try {
    await adminDb
      .collection("profiles")
      .doc(userId)
      .set({ notification_preferences: { [preferenceField]: false } }, { merge: true })

    // Audit trail alongside the send log, so an admin can see why sends stopped.
    await adminDb.collection("email_notifications").add({
      user_id: userId,
      email_type: `unsubscribe_${category}`,
      status: "unsubscribed",
      created_at: new Date().toISOString(),
      source: "unsubscribe-link",
    })
  } catch (error) {
    logger.error("[Unsubscribe] Failed to persist unsubscribe", { userId, category, error })
    return page(
      "Something went wrong",
      `<p>That didn't save. Please try again, or manage preferences from your <a href="/account" style="color: #0066cc;">account page</a>.</p>`,
      500
    )
  }

  logger.info("[Unsubscribe] Reminder category disabled", { userId, category })
  return page(
    "Unsubscribed",
    `<p>Done. You won't get ${CATEGORY_LABELS[category]} anymore.</p>
     <p style="font-size: 13px; color: #666;">Changed your mind later? Re-enable them on your <a href="/account" style="color: #666;">account page</a>.</p>`
  )
}

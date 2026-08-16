/**
 * POST /api/metrics/funnel
 *
 * Consent-independent funnel counter. Accepts an event NAME from a fixed
 * whitelist and nothing else; stores it through the existing
 * analytics_events pattern (trackEventServer) prefixed funnel_, so the admin
 * analytics group-by picks the counts up with no new reader. No identity is
 * accepted or derived: the body is one enum field, unknown names are
 * rejected, and the row carries no user agent, IP, or referrer.
 *
 * Abuse ceiling: an attacker can inflate counters (rate-limited via the
 * guest API limiter). Counters inform prioritization, not billing, so
 * inflation is annoying, not dangerous.
 */

import { NextRequest, NextResponse } from "next/server"
import { guestApiRateLimit } from "@/lib/rate-limit"
import { trackEventServer } from "@/lib/analytics-server"

const FUNNEL_EVENTS = new Set([
  "guest_trial_start",
  "guest_chat_walled",
  "signup",
  "login",
  "checkout_start",
  "lab_list_view",
  "lab_detail_view",
  "lab_start",
])

export async function POST(request: NextRequest) {
  const rateLimitResponse = await guestApiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  let event: unknown
  try {
    const body = await request.json()
    event = body?.event
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (typeof event !== "string" || !FUNNEL_EVENTS.has(event)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 })
  }

  await trackEventServer(`funnel_${event}`, {})
  return new NextResponse(null, { status: 204 })
}

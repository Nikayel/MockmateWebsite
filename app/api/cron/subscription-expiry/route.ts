/**
 * DEPRECATED 2026-08-14: everything this route did now runs inside
 * /api/cron/email-notifications (downgrades + free-quota clamp, 7-day and
 * 1-day expiry reminders with the correct one-time-payment copy, and the
 * monthly quota reset for active yearly subscribers via lib/quota/yearly-quota).
 *
 * Running both pipelines double-processed every yearly subscriber daily and
 * sent expiry reminders describing an auto-charge that does not exist.
 *
 * This stub answers 200 so the cron-job.org job stays green until the account
 * owner deletes it from the dashboard (flagged in docs/LAUNCH-CHECKLIST.md).
 * Keep it inert; add nothing here.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/cron-auth"
import { logger } from "@/lib/logger"

function deprecatedResponse(request: NextRequest): NextResponse {
  const auth = verifyCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  logger.info(
    "[Cron] subscription-expiry called; deprecated no-op (consolidated into email-notifications). Delete this job on cron-job.org."
  )
  return NextResponse.json({
    success: true,
    deprecated: true,
    message:
      "subscription-expiry is consolidated into /api/cron/email-notifications; this job can be deleted on cron-job.org",
  })
}

export async function GET(request: NextRequest) {
  return deprecatedResponse(request)
}

export async function POST(request: NextRequest) {
  return deprecatedResponse(request)
}

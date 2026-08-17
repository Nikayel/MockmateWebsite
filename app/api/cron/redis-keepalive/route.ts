/**
 * Upstash keep-alive heartbeat
 *
 * Upstash archives FREE-tier Redis databases after 30+ days without a real data
 * command (PING does not count). That is exactly how the previous database vanished
 * (endpoint NXDOMAIN, found 2026-08-17): the rate-limit store then failed open for
 * weeks with nothing anywhere saying so. This route writes one key a day so the
 * inactivity clock never fires, and doubles as the health check for the limiter's
 * backing store.
 *
 * DELIBERATELY FAIL-LOUD. The rate limiter itself fails OPEN (a Redis outage must
 * never block users), which is precisely why its death is invisible from outside.
 * This route is the observable counterpart: any Redis problem — missing env vars,
 * DNS, auth, quota — returns HTTP 500 so cron-job.org's failure notification fires.
 * Do not soften these into 200s.
 *
 * Schedule: daily on cron-job.org, failure notifications ON.
 * Auth: `Bearer <CRON_SECRET>` (timing-safe), matching the other cron routes.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/cron-auth"
import { logger } from "@/lib/logger"

const cronLogger = logger.child({ service: "cron-redis-keepalive" })

const KEEPALIVE_KEY = "keepalive:heartbeat"
// The key's own lifetime. Long enough to inspect the last beat in the Upstash
// console; irrelevant to the inactivity clock, which the SET command itself resets.
const KEEPALIVE_TTL_SECONDS = 90 * 24 * 60 * 60
const UPSTASH_TIMEOUT_MS = 10_000

export async function GET(request: NextRequest) {
  const auth = verifyCronRequest(request)
  if (!auth.ok) {
    if (auth.status === 500) {
      cronLogger.error("CRON_SECRET not configured")
    }
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const baseUrl = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!baseUrl || !token) {
    cronLogger.error("Upstash env vars missing; the rate limiter has no Redis backing")
    return NextResponse.json(
      { error: "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured" },
      { status: 500 }
    )
  }

  const timestamp = new Date().toISOString()
  try {
    // A real SET, not PING: only data commands reset Upstash's free-tier
    // inactivity clock.
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", KEEPALIVE_KEY, timestamp, "EX", String(KEEPALIVE_TTL_SECONDS)]),
      signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      cronLogger.error("Upstash rejected the keepalive SET", {
        status: response.status,
        body: body.slice(0, 200),
      })
      return NextResponse.json(
        { error: `Upstash rejected the keepalive (${response.status})` },
        { status: 500 }
      )
    }

    const data = (await response.json()) as { result?: unknown }
    if (data?.result !== "OK") {
      cronLogger.error("Upstash keepalive returned an unexpected result", { result: data?.result })
      return NextResponse.json({ error: "Unexpected Upstash response" }, { status: 500 })
    }

    cronLogger.info("Upstash keepalive beat", { timestamp })
    return NextResponse.json({ success: true, timestamp })
  } catch (error) {
    cronLogger.error("Upstash unreachable from keepalive", { error })
    return NextResponse.json(
      {
        error: "Upstash unreachable",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility (mirrors the other cron routes).
export async function POST(request: NextRequest) {
  return GET(request)
}

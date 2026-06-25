/**
 * Usage Aggregation Cron Job
 *
 * Computes expensive usage aggregates outside request-time anomaly checks.
 *
 * Trigger externally every hour:
 * POST /api/cron/aggregate-usage
 * Authorization: Bearer ${CRON_SECRET}
 */

import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { aggregateCostAverages } from "@/lib/cost-anomaly-detection"
import { logger } from "@/lib/logger"

const CRON_SECRET = process.env.CRON_SECRET

function isAuthorized(request: NextRequest): boolean {
  if (!CRON_SECRET) return false

  const authHeader = request.headers.get("authorization") || ""
  const expectedToken = `Bearer ${CRON_SECRET}`

  return (
    authHeader.length === expectedToken.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedToken))
  )
}

async function handleAggregateUsage(request: NextRequest) {
  if (!CRON_SECRET) {
    logger.error("[Cron Aggregate Usage] CRON_SECRET not configured")
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const averages = await aggregateCostAverages()
    return NextResponse.json({
      success: true,
      data: averages,
    })
  } catch (error) {
    logger.error("[Cron Aggregate Usage] Failed to aggregate usage", { error })
    return NextResponse.json({ error: "Failed to aggregate usage" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return handleAggregateUsage(request)
}

export async function GET(request: NextRequest) {
  return handleAggregateUsage(request)
}

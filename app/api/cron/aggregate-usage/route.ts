/**
 * Usage Aggregation Cron Job
 *
 * Computes expensive usage aggregates outside request-time anomaly checks.
 *
 * Trigger externally every hour:
 * POST /api/cron/aggregate-usage
 * Authorization: Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/cron-auth"
import { aggregateCostAverages } from "@/lib/cost-anomaly-detection"
import { logger } from "@/lib/logger"

async function handleAggregateUsage(request: NextRequest) {
  const auth = verifyCronRequest(request)
  if (!auth.ok) {
    if (auth.status === 500) {
      logger.error("[Cron Aggregate Usage] CRON_SECRET not configured")
    }
    return NextResponse.json({ error: auth.error }, { status: auth.status })
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

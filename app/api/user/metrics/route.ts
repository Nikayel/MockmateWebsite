import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { getUserMetricsResponse } from "@/lib/user-metrics/service"
import { logger } from "@/lib/logger"

const daysSchema = z.coerce.number().int().min(1).max(90)

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const days = daysSchema.safeParse(request.nextUrl.searchParams.get("days") ?? 30)
    if (!days.success)
      return NextResponse.json({ error: "days must be an integer from 1 to 90" }, { status: 400 })
    const data = await getUserMetricsResponse(auth.userId, days.data)
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch (error) {
    logger.error("[User Metrics API] Error", { error })
    return NextResponse.json(
      { error: "Couldn't load your metrics. Please try again." },
      { status: 503 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { enforceRateLimitPolicy } from "@/lib/rate-limiting"
import { getNextPractice } from "@/lib/agents/recommendations/next-practice.server"
import { logger } from "@/lib/logger"

const NO_STORE = { "Cache-Control": "private, no-store" }
const sessionIdSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^/\x00-\x1f]+$/)
  .refine((value) => value.trim() === value)
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
    }
    const parsed = sessionIdSchema.safeParse(request.nextUrl.searchParams.get("sessionId"))
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid session" }, { status: 400, headers: NO_STORE })
    const limited = await enforceRateLimitPolicy("api", `next-practice:${auth.userId}`)
    if (limited) {
      limited.headers.set("Cache-Control", "private, no-store")
      return limited
    }
    const result = await getNextPractice(auth.userId, parsed.data)
    return NextResponse.json(result, {
      status: result.status === "not_found" ? 404 : result.status === "unavailable" ? 503 : 200,
      headers: NO_STORE,
    })
  } catch (error) {
    logger.error("Next practice lookup failed", { error })
    return NextResponse.json(
      { status: "unavailable" },
      {
        status: 503,
        headers: NO_STORE,
      }
    )
  }
}

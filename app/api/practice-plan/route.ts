import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { enforceRateLimitPolicy } from "@/lib/rate-limiting"
import { logger } from "@/lib/logger"
import { getSavedPractice, removePracticePlan, savePracticePlan } from "@/lib/practice-plan/service"
import { PracticePlanError, savePracticeSchema } from "@/lib/practice-plan/schema"

export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }
async function handle(request: NextRequest, action: "read" | "save" | "remove") {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated || !auth.userId)
      return NextResponse.json(
        { error: "Sign in to save your next practice." },
        { status: 401, headers }
      )
    const limited = await enforceRateLimitPolicy("api", `practice-plan:${auth.userId}`)
    if (limited) {
      limited.headers.set("Cache-Control", headers["Cache-Control"])
      return limited
    }
    if (action === "read")
      return NextResponse.json(await getSavedPractice(auth.userId), { headers })
    const body: unknown = await request.json().catch(() => null)
    if (action === "remove") {
      const parsed = z.object({ revision: z.string().uuid() }).strict().safeParse(body)
      if (!parsed.success)
        return NextResponse.json({ error: "Invalid saved task." }, { status: 400, headers })
      await removePracticePlan(auth.userId, parsed.data.revision)
      return NextResponse.json({ status: "empty" }, { headers })
    }
    const parsed = savePracticeSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Check the task and reminder time, then try again." },
        { status: 400, headers }
      )
    return NextResponse.json(await savePracticePlan(auth.userId, parsed.data), { headers })
  } catch (error) {
    if (error instanceof PracticePlanError)
      return NextResponse.json({ error: error.message }, { status: error.status, headers })
    logger.error("Practice plan request failed", { error, action })
    return NextResponse.json(
      { error: "We couldn't confirm that change. Try again; opening practice is still available." },
      { status: 503, headers }
    )
  }
}
export const GET = (request: NextRequest) => handle(request, "read")
export const POST = (request: NextRequest) => handle(request, "save")
export const DELETE = (request: NextRequest) => handle(request, "remove")

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/auth-helpers"
import { learnTimeFlushSchema, recordLearnTime } from "@/lib/tutorials/learn-time"

// Reads auth headers — must run per-request.
export const dynamic = "force-dynamic"

/**
 * Learn active-time telemetry. Thin: authenticate, validate, call the service, respond.
 *
 * One flush per request rather than a batch: the client meters one lesson at a time and
 * reports at most every few minutes, so batching would buy nothing and would complicate the
 * server-side wall-clock clamp (which is per lesson, keyed off the previous flush).
 *
 * Always 200 on a validated body, even if the write failed — fire-and-forget telemetry,
 * same contract as the item-responses route. `credited` is the clamped milliseconds the
 * server accepted; the client ignores it.
 */
export const POST = withAuth(async ({ userId, request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = learnTimeFlushSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid learn-time payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const credited = await recordLearnTime(userId, parsed.data)
  return NextResponse.json({ credited })
})

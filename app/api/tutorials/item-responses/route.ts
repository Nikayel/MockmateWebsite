import { NextResponse } from "next/server"
import { withAuth } from "@/lib/auth-helpers"
import {
  MAX_ITEM_RESPONSES_PER_REQUEST,
  learnItemResponseInputSchema,
  recordItemResponses,
} from "@/lib/tutorials/item-responses"
import { z } from "zod"

// Reads auth headers — must run per-request.
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  responses: z.array(learnItemResponseInputSchema).min(1).max(MAX_ITEM_RESPONSES_PER_REQUEST),
})

/**
 * Item-level Learn telemetry. Thin: authenticate, validate, call the service, respond.
 *
 * Accepts a BATCH because the client buffers: a learner can answer three checks while
 * scrolling one teach section, and one request per answer would be wasteful.
 *
 * Always 200 on a validated body, even if the write failed. This is fire-and-forget
 * research telemetry; the client neither retries nor surfaces failures, and an error
 * status would only produce console noise during a lesson.
 */
export const POST = withAuth(async ({ userId, request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid item response payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const recorded = await recordItemResponses(userId, parsed.data.responses)
  return NextResponse.json({ recorded })
})

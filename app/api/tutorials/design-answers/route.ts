import { NextResponse } from "next/server"
import { withAuth } from "@/lib/auth-helpers"
import {
  designAnswerInputSchema,
  getDesignAnswer,
  listUserDesignAnswers,
  upsertDesignAnswer,
} from "@/lib/tutorials/design-answers"

// Reads auth headers + query params — must run per-request.
export const dynamic = "force-dynamic"

/**
 * System-Design saved-answers API. Thin: authenticate (withAuth), parse/validate, call the service,
 * respond. Every method requires sign-in — the learner's answer is private user data. Authoritative
 * writes go through the Admin SDK service here; `firestore.rules` are defense-in-depth.
 *
 *  - GET ?exerciseId=…  → one exercise's saved answer (player resume): `{ answer }`
 *  - GET (no param)     → all of the user's saved answers:             `{ items }`
 *  - PUT body           → upsert one exercise's answer:                `{ answer }`
 */
export const GET = withAuth(async ({ userId, request }) => {
  const exerciseId = request.nextUrl.searchParams.get("exerciseId")
  if (exerciseId) {
    const answer = await getDesignAnswer(userId, exerciseId)
    return NextResponse.json({ answer })
  }
  const items = await listUserDesignAnswers(userId)
  return NextResponse.json({ items })
})

export const PUT = withAuth(async ({ userId, request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = designAnswerInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid answer payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const answer = await upsertDesignAnswer(userId, parsed.data)
    return NextResponse.json({ answer })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 })
  }
})

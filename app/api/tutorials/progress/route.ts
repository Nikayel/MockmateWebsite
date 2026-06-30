import { NextResponse } from "next/server"
import { withAuth } from "@/lib/auth-helpers"
import {
  getLessonProgress,
  listUserProgress,
  tutorialProgressInputSchema,
  upsertLessonProgress,
} from "@/lib/tutorials/progress"

// Reads auth headers + query params — must run per-request.
export const dynamic = "force-dynamic"

/**
 * Tutorial progress API. Thin: authenticate (withAuth), parse/validate, call the service, respond.
 * Authoritative writes go through the Admin SDK service here; `firestore.rules` are defense-in-depth.
 *
 *  - GET ?lessonId=…  → one lesson's progress (player resume): `{ progress }`
 *  - GET (no param)   → all of the user's progress (overlay):    `{ items }`
 *  - PUT body         → upsert one lesson's progress:            `{ progress }`
 */
export const GET = withAuth(async ({ userId, request }) => {
  const lessonId = request.nextUrl.searchParams.get("lessonId")
  if (lessonId) {
    const progress = await getLessonProgress(userId, lessonId)
    return NextResponse.json({ progress })
  }
  const items = await listUserProgress(userId)
  return NextResponse.json({ items })
})

export const PUT = withAuth(async ({ userId, request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = tutorialProgressInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid progress payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const progress = await upsertLessonProgress(userId, parsed.data)
    return NextResponse.json({ progress })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 })
  }
})

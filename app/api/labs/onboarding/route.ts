import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { verifyAuth } from "@/lib/auth-helpers"
import { isLabOnboardingId, type LabOnboardingId } from "@/lib/labs/onboarding/ids"
import { completeLabOnboarding, hasCompletedLabOnboarding } from "@/lib/labs/onboarding/service"
import { logger } from "@/lib/logger"
import { apiRateLimit } from "@/lib/rate-limiting"

const onboardingIdSchema = z.string().refine(isLabOnboardingId, {
  message: "Unknown onboarding experience",
})

const completionRequestSchema = z.object({ onboardingId: onboardingIdSchema })

function unauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json({ error: "Unauthorized", message }, { status: 401 })
}

async function authenticate(request: NextRequest): Promise<{ userId: string } | NextResponse> {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) return unauthorizedResponse(auth.error)
  return { userId: auth.userId }
}

function isAuthenticated(value: { userId: string } | NextResponse): value is { userId: string } {
  return "userId" in value
}

function parseOnboardingId(value: unknown): LabOnboardingId | null {
  const parsed = onboardingIdSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/** GET the current user's completion state for one Lab experience. */
export async function GET(request: NextRequest) {
  const limited = await apiRateLimit(request)
  if (limited) return limited

  const authenticated = await authenticate(request)
  if (!isAuthenticated(authenticated)) return authenticated

  const onboardingId = parseOnboardingId(request.nextUrl.searchParams.get("onboardingId"))
  if (!onboardingId) {
    return NextResponse.json({ error: "Unknown onboarding experience" }, { status: 400 })
  }

  try {
    const completed = await hasCompletedLabOnboarding(authenticated.userId, onboardingId)
    return NextResponse.json({ onboardingId, completed })
  } catch (error) {
    logger.error("Failed to read Lab onboarding completion", { error, onboardingId })
    return NextResponse.json({ error: "Could not load onboarding status" }, { status: 500 })
  }
}

/** Mark the current user as having completed or skipped one Lab onboarding. */
export async function POST(request: NextRequest) {
  const limited = await apiRateLimit(request)
  if (limited) return limited

  const authenticated = await authenticate(request)
  if (!isAuthenticated(authenticated)) return authenticated

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = completionRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues.map((issue) => issue.message) },
      { status: 400 }
    )
  }

  try {
    const completion = await completeLabOnboarding(authenticated.userId, parsed.data.onboardingId)
    return NextResponse.json({ completion })
  } catch (error) {
    logger.error("Failed to save Lab onboarding completion", {
      error,
      onboardingId: parsed.data.onboardingId,
    })
    return NextResponse.json({ error: "Could not save onboarding status" }, { status: 500 })
  }
}

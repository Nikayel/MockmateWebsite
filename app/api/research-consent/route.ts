import { NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"
import {
  RESEARCH_CONSENT_VERSION,
  getResearchConsent,
  setResearchConsent,
} from "@/lib/tutorials/research-consent"

// Reads auth headers — must run per-request.
export const dynamic = "force-dynamic"

const bodySchema = z.object({ consented: z.boolean() })

/**
 * Research-participation consent.
 *
 *  - GET → `{ consent, currentVersion }`. `consent` is null when the learner has never
 *    decided, which the UI must render differently from a recorded decline.
 *  - PUT → record a decision (either direction; withdrawing is a first-class action).
 */
export const GET = withAuth(async ({ userId }) => {
  const consent = await getResearchConsent(userId)
  return NextResponse.json({ consent, currentVersion: RESEARCH_CONSENT_VERSION })
})

export const PUT = withAuth(async ({ userId, request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected { consented: boolean }" }, { status: 400 })
  }

  try {
    const consent = await setResearchConsent(userId, parsed.data.consented)
    return NextResponse.json({ consent })
  } catch (error) {
    // This is a consent record, so the failure has consequences beyond a broken button. If the user
    // was withdrawing, the platform keeps treating them as a participant. If they were opting in,
    // their data is excluded from research they agreed to join. Either way the UI shows a generic
    // "Failed to save your choice", the user retries or gives up, and the only two states that
    // matter legally - what they chose, and what we recorded - are now out of sync with nothing
    // written down anywhere.
    //
    // The response body stays generic on purpose. The log carries the detail.
    logger.error("Research consent decision was not recorded", {
      endpoint: "PUT /api/research-consent",
      userId,
      consented: parsed.data.consented,
      version: RESEARCH_CONSENT_VERSION,
      error,
    })
    return NextResponse.json({ error: "Failed to save your choice" }, { status: 500 })
  }
})

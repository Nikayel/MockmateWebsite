import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"
import { getPackProgress } from "@/lib/bugfix/packs/session-store"
import { buildPhase2Release } from "@/lib/bugfix/packs/phase2"
import { loadSealedPack } from "@/lib/scenarios/sealed/registry.server"

/**
 * POST /api/interview/pack/phase2 — release the sealed phase-2 payload (spec_patch,
 * fixture_patch, expected_output_v2) ONLY when the owner's session has entered PHASE2.
 * 403 before that (INTERVIEWER_SPEC.md: "Before that it is not in any bundle or
 * prompt"). Ownership is taken from the verified token, never the body.
 *
 * UNWIRED (tracked wire-or-quarantine decision): no client currently drives the pack
 * state machine, so this route is unreachable in production. Kept intact for the
 * post-launch "wire the pack interviewer" work; do not delete.
 */
const requestSchema = z.object({
  sessionId: z.string().min(1),
  packId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors.map((e) => e.message) },
      { status: 400 }
    )
  }

  try {
    const progressResult = await getPackProgress(parsed.data.sessionId, auth.userId)
    if (!progressResult.ok) {
      const status = progressResult.error === "UNAUTHORIZED" ? 403 : 404
      return NextResponse.json({ error: progressResult.error }, { status })
    }

    const sealed = await loadSealedPack(parsed.data.packId)
    const release = buildPhase2Release(progressResult.progress, sealed)
    if (!release.released) {
      // Not reached PHASE2 (or no sealed content) — do not leak the payload.
      const status = sealed ? 403 : 404
      return NextResponse.json({ error: "Forbidden", reason: release.reason }, { status })
    }

    return NextResponse.json({ phase2: release.payload })
  } catch (error) {
    logger.error("Error releasing pack phase-2 payload:", { error })
    return NextResponse.json({ error: "Failed to release phase-2 payload" }, { status: 500 })
  }
}

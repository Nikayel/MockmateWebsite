import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"
import { getScenarioById } from "@/lib/scenarios"
import type { BugFixScenario } from "@/lib/scenarios/types"
import { advancePackProgress } from "@/lib/bugfix/packs/session-store"
import { computeRunEvent } from "@/lib/bugfix/packs/run-event"
import { loadSealedPack } from "@/lib/scenarios/sealed/registry.server"
import type { PackInput } from "@/lib/bugfix/packs/machine"

/**
 * POST /api/interview/pack/advance — the authoritative one-step advance of the pack
 * state machine (INTERVIEWER_SPEC.md transitions). Deterministic exits are computed
 * SERVER-SIDE from the submitted stdout (v1 vs the public oracle, v2 vs the sealed
 * expected_output_v2), so the client cannot forge a passing FIX/PHASE2; judgment exits
 * relay the interviewer model's advance signal; DEBRIEF needs the literal phrase.
 *
 * UNWIRED (tracked wire-or-quarantine decision): no client currently drives the pack
 * 10-state machine, so this route is unreachable in production and a started pack
 * degrades to the generic bugfix interviewer. Kept intact for the post-launch "wire the
 * pack interviewer" work; do not delete, and do not advertise an adaptive/phase-2
 * interviewer in any copy until it is reachable.
 */
const requestSchema = z.object({
  sessionId: z.string().min(1),
  packId: z.string().min(1),
  input: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("run"), stdout: z.string().max(200000) }),
    z.object({ kind: z.literal("advance"), evidence: z.string().max(4000) }),
    z.object({ kind: z.literal("debrief-trigger"), phrase: z.string().max(2000) }),
  ]),
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

  const { sessionId, packId, input } = parsed.data

  try {
    let machineInput: PackInput
    if (input.kind === "run") {
      const scenario = (await getScenarioById(packId)) as BugFixScenario | undefined
      const expectedOutput = scenario?.pack?.expectedOutput
      if (!expectedOutput) {
        return NextResponse.json({ error: "Unknown pack" }, { status: 404 })
      }
      // expected_output_v2 is sealed — the client never receives it, so a PHASE2 match
      // genuinely requires reproducing the sealed answer.
      const sealed = await loadSealedPack(packId)
      machineInput = computeRunEvent(input.stdout, expectedOutput, sealed?.phase2.expectedOutputV2)
    } else if (input.kind === "advance") {
      machineInput = { kind: "advance", evidence: input.evidence }
    } else {
      machineInput = { kind: "debrief-trigger", phrase: input.phrase }
    }

    const result = await advancePackProgress(sessionId, auth.userId, machineInput)
    if (!result.ok) {
      const status =
        result.error === "UNAUTHORIZED" ? 403 : result.error === "SESSION_NOT_FOUND" ? 404 : 500
      return NextResponse.json({ error: result.error }, { status })
    }

    const { progress, advanced, reason } = result.result
    return NextResponse.json({
      advanced,
      reason,
      state: progress.state,
      hintLevel: progress.hintLevel,
      nonAdvancingTurns: progress.nonAdvancingTurns,
    })
  } catch (error) {
    logger.error("Error advancing pack state:", { error })
    return NextResponse.json({ error: "Failed to advance pack state" }, { status: 500 })
  }
}

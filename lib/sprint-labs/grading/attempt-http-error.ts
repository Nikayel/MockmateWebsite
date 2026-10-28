import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { sprintLabRunErrorStatus } from "@/lib/sprint-labs/runs"
import { sprintLabAttemptErrorStatus } from "./attempts-service"

/**
 * Maps a service error to its HTTP response. Every attempts-service function
 * calls `requireOwnedActiveRun` (`@/lib/sprint-labs/runs`) internally, which
 * throws ITS OWN error vocabulary (`NOT_FOUND`, `UNAUTHORIZED`,
 * `RUN_NOT_ACTIVE`) — `sprintLabAttemptErrorStatus` alone does not recognize
 * those, so without this fallback a bad/foreign/inactive `runId` would
 * incorrectly surface as a logged 500 instead of the 404/403/409 `runs.ts`
 * already defines for it. `retryAfterSeconds` (attached only to a
 * COOLDOWN_ACTIVE error) is surfaced too, so the client can show a countdown
 * instead of a bare "try again later."
 */
export function attemptServiceErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  const status = sprintLabAttemptErrorStatus(error) ?? sprintLabRunErrorStatus(error)
  if (status !== null) {
    const message = (error as Error).message
    const retryAfterSeconds = (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds
    const body: Record<string, unknown> = { error: message }
    if (typeof retryAfterSeconds === "number") body.retryAfterSeconds = retryAfterSeconds
    return NextResponse.json(body, { status })
  }
  logger.error(fallbackMessage, { error })
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

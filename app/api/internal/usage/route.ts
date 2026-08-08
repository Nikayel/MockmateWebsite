/**
 * Internal AI usage ingest.
 *
 * Exists so the Edge runtime can record AI spend. Edge cannot use the Firebase
 * Admin SDK, so /api/feedback/stream previously made the platform's most
 * expensive AI call and recorded nothing — under-reporting the dashboard and,
 * because budget enforcement reads the same records, letting feedback
 * generation run outside the per-user cap entirely.
 *
 * This is a SERVER-TO-SERVER endpoint. It is authorised with the CRON_SECRET
 * bearer, the same shared secret the cron routes use, and must never be
 * reachable with a user's Firebase token: the numbers it accepts feed budget
 * enforcement, so a caller able to under-report its own usage could spend past
 * its cap.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/cron-auth"
import { logger } from "@/lib/logger"
import { trackUsageEvent, calculateCost, type UsageEventType } from "@/lib/usage-tracking"
import {
  recordGlobalSpend,
  isGlobalCeilingExceeded,
  getGlobalDailyCeiling,
  getGlobalDailySpend,
} from "@/lib/global-spend-guard"

/** Event types the Edge path is allowed to report. */
const REPORTABLE_EVENT_TYPES: readonly UsageEventType[] = [
  "feedback_generation",
  "chat_message",
  "hint_request",
]

/**
 * Ceiling on a single reported call. A well-formed feedback generation runs in
 * the low thousands of tokens; anything past this is a bug or a bad actor, and
 * accepting it would corrupt both the cost dashboard and the budget ledger.
 */
const MAX_REPORTED_TOKENS = 2_000_000

interface ParsedUsageReport {
  userId: string
  eventType: UsageEventType
  provider: string
  inputTokens: number
  outputTokens: number
  latencyMs?: number
  sessionId?: string
  scenarioId?: string
  pattern?: string
  difficulty?: string
  scenarioTitle?: string
  estimatedTokens: boolean
}

function readString(value: unknown, maxLength = 256): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) return undefined
  return trimmed
}

function readTokenCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0
  return Math.min(Math.floor(value), MAX_REPORTED_TOKENS)
}

/** Validate an untrusted body into a usage report, or explain why it is not one. */
function parseUsageReport(
  body: unknown
): { ok: true; report: ParsedUsageReport } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Body must be an object" }
  }
  const raw = body as Record<string, unknown>

  const userId = readString(raw.userId)
  if (!userId) return { ok: false, error: "userId is required" }

  const eventType = readString(raw.eventType)
  if (!eventType || !REPORTABLE_EVENT_TYPES.includes(eventType as UsageEventType)) {
    return { ok: false, error: `eventType must be one of ${REPORTABLE_EVENT_TYPES.join(", ")}` }
  }

  const provider = readString(raw.provider)
  if (!provider) return { ok: false, error: "provider is required" }

  return {
    ok: true,
    report: {
      userId,
      eventType: eventType as UsageEventType,
      provider,
      inputTokens: readTokenCount(raw.inputTokens),
      outputTokens: readTokenCount(raw.outputTokens),
      latencyMs:
        typeof raw.latencyMs === "number" && Number.isFinite(raw.latencyMs)
          ? Math.max(0, Math.floor(raw.latencyMs))
          : undefined,
      sessionId: readString(raw.sessionId),
      scenarioId: readString(raw.scenarioId),
      pattern: readString(raw.pattern, 64),
      difficulty: readString(raw.difficulty, 32),
      scenarioTitle: readString(raw.scenarioTitle, 512),
      estimatedTokens: raw.estimatedTokens === true,
    },
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = parseUsageReport(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { report } = parsed
  const totalTokens = report.inputTokens + report.outputTokens
  // Cost is computed HERE from the token counts, never accepted from the
  // caller, so the pricing table stays the single authority on rates.
  const cost = calculateCost(report.inputTokens, report.outputTokens, report.provider)

  await trackUsageEvent({
    userId: report.userId,
    eventType: report.eventType,
    provider: report.provider,
    inputTokens: report.inputTokens,
    outputTokens: report.outputTokens,
    totalTokens,
    cost,
    latencyMs: report.latencyMs,
    cached: false,
    sessionId: report.sessionId,
    scenarioId: report.scenarioId,
    pattern: report.pattern,
    difficulty: report.difficulty,
    scenarioTitle: report.scenarioTitle,
    isExactTokenCount: !report.estimatedTokens,
    metadata: { source: "edge" },
  })

  // Feed the aggregate daily kill-switch. This was the ONE thing this endpoint
  // did not do: it wrote the usage_event (so per-user budgets saw the spend) but
  // never incremented global_usage/{day}, whose only writer was the Node path in
  // lib/ai-providers.ts. The Edge feedback route serves every scenario type
  // except system design, so the busiest AI path on the platform contributed
  // nothing to the $250/day ceiling and the ceiling could never be reached by
  // the traffic most likely to run it up.
  //
  // Awaited, unlike the Node path's fire-and-forget call: nothing is waiting on
  // this response (the Edge caller already returned to the user), so there is no
  // latency to protect, and an awaited increment is one that Vercel cannot freeze
  // out from under us. recordGlobalSpend never throws.
  await recordGlobalSpend(cost)

  logger.info("[Internal Usage] Recorded Edge AI usage", {
    eventType: report.eventType,
    provider: report.provider,
    totalTokens,
    estimated: report.estimatedTokens,
  })

  return NextResponse.json({ success: true, totalTokens, cost })
}

/**
 * Global daily spend ceiling probe, for the Edge runtime.
 *
 * isGlobalCeilingExceeded is consulted in exactly one place, inside checkQuota,
 * so every route that does not call checkQuota bypasses the kill-switch
 * entirely — including /api/feedback/stream, which cannot call it at all
 * because the ceiling lives in Firestore and Edge cannot reach Firebase Admin.
 *
 * Same shape as the POST above, for the same reason: this is how an Edge
 * function borrows a Node capability. Same CRON_SECRET bearer, because the
 * answer gates spending and must not be reachable with a user's token.
 *
 * `spendToday` and `ceiling` are returned alongside the verdict so the caller
 * can log how close the platform is, not just whether it tripped.
 */
export async function GET(request: NextRequest) {
  const auth = verifyCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const ceiling = getGlobalDailyCeiling()

  // isGlobalCeilingExceeded fails CLOSED on a Firestore error, and that verdict
  // must reach the Edge caller intact — this endpoint is the only thing standing
  // between an unreadable ledger and unmetered Edge spend.
  const exceeded = await isGlobalCeilingExceeded()

  // Best-effort detail. Never allowed to turn a definite verdict into an error:
  // if the ledger is unreadable, `exceeded` is already true and that is what
  // matters.
  let spendToday: number | null = null
  try {
    spendToday = await getGlobalDailySpend()
  } catch {
    spendToday = null
  }

  return NextResponse.json({ ceilingExceeded: exceeded, spendToday, ceiling })
}

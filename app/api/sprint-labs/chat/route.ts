/**
 * /api/sprint-labs/chat — the Sable in-workspace partner (chat-only v0).
 * docs/sprint-labs/AGENT-CONTEXT.md §3/§6, EXECUTION-STATE.md owner decision
 * 4, INTEGRATION.md §4, PLAN.md Task 14.
 *
 * Thin: flag -> metered preamble -> validate -> tier gate -> resolve the
 * TICKET'S REAL POLICY server-side (never a client-claimed one) -> build the
 * prompt from layers A-D -> generateAIResponse -> persist both turns ->
 * respond. All Firestore/sealed-content work lives in
 * lib/sprint-labs/partner/{transcript-store,resolve-mode.server}.ts; this
 * file never imports adminDb or loadSealedTicket directly.
 *
 * POST sends one chat turn and returns `{ reply }`, or 403 `{ reason }` when
 * the resolved mode is "none" (unassisted, partner slot — the ticket's own
 * measurement instrument, which issues no session at all). GET rehydrates
 * the learner's transcript + directive mutes for (runId, ticketKey) on
 * mount. PATCH toggles one directive's mute state — kept in this same file
 * because muting is a field on the transcript doc this route already owns
 * (see transcript-store.ts's file header for why it isn't a run-doc or
 * files-doc field instead).
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { chatRateLimit } from "@/lib/rate-limit"
import { enforceMeteredAiRequest } from "@/lib/ai/metered-request"
import { endRequestTracking } from "@/lib/rate-limiter"
import { getFlagAsync } from "@/lib/feature-flags"
import { logger } from "@/lib/logger"
import { generateAIResponse } from "@/lib/ai-providers"
import { getSprint, getTicket } from "@/lib/sprint-labs/content/registry"
import { getSprintLabRun, sprintLabRunErrorStatus } from "@/lib/sprint-labs/runs"
import { requireTierForSprint } from "@/lib/sprint-labs/route-guards"
import { resolvePartnerModeForTicket } from "@/lib/sprint-labs/partner/resolve-mode.server"
import { buildPartnerSystemPrompt } from "@/lib/sprint-labs/partner/prompt"
import {
  buildConcessionNote,
  layerA,
  layerB,
  layerC,
  renderWorkspaceFiles,
  type LayerBInput,
} from "@/lib/sprint-labs/partner/context-layers"
import { findMatchedConcessionTrigger } from "@/lib/sprint-labs/partner/concession"
import {
  appendPartnerTurns,
  getPartnerTranscript,
  isValidTicketKeyForDocId,
  setPartnerDirectiveMuted,
} from "@/lib/sprint-labs/partner/transcript-store"
import type { SprintLabTranscriptMessage } from "@/lib/sprint-labs/types"

export const dynamic = "force-dynamic"

/** Not-yet-launched surface: a disabled flag reads as "this route doesn't exist" rather than 403 (matches the other Sprint Labs routes). */
async function requireSprintLabsEnabled(userId: string): Promise<NextResponse | null> {
  if (await getFlagAsync("SPRINT_LABS_ENABLED", userId)) return null
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

const CHAT_ERRORS = {
  UNKNOWN_TICKET: "UNKNOWN_TICKET",
} as const

/** Maps this route's own error vocabulary, falling back to runs.ts's (requireOwnedActiveRun throws ITS OWN codes) — same shape as attempts/route.ts's attemptServiceErrorResponse. */
function chatErrorStatus(error: unknown): number | null {
  if (error instanceof Error && error.message === CHAT_ERRORS.UNKNOWN_TICKET) return 404
  return sprintLabRunErrorStatus(error)
}

function serviceErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  const status = chatErrorStatus(error)
  if (status !== null) {
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
  logger.error(fallbackMessage, { error })
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

const layerBInputSchema = z.object({
  sha: z.string().min(1),
  generatedAt: z.string().min(1),
  files: z.array(z.object({ path: z.string().min(1), exports: z.array(z.string()) })),
  routes: z.array(z.string()),
  migrations: z.array(z.string()),
  tests: z.array(z.string()),
  diffStat: z.string(),
}) satisfies z.ZodType<LayerBInput>

const postBodySchema = z.object({
  runId: z.string().min(1),
  ticketKey: z.string().min(1),
  message: z.string().min(1).max(8000),
  turnIndex: z.number().int().nonnegative(),
  /** Which partner surface is requested (lib/sprint-labs/partner/modes.ts's PartnerSlot). Defaults to "partner": the ticket's own capability, never an upgrade the client can request its way into. */
  mode: z.enum(["partner", "tutor"]).default("partner"),
  layerB: layerBInputSchema.optional(),
  /** Assisted-mode only; silently unused for every other resolved mode (modes.ts's capability gate, not this route's job to re-check). */
  files: z
    .array(z.object({ path: z.string().min(1), content: z.string().max(100_000) }))
    .max(60)
    .optional(),
})

/**
 * POST /api/sprint-labs/chat — one chat turn. `service: "sprint-labs-chat"`
 * (ruling R9, lib/usage/services.ts).
 */
export async function POST(request: NextRequest) {
  const metered = await enforceMeteredAiRequest(request, {
    estimatedTokens: 1200,
    ipLimiter: chatRateLimit,
  })
  if (metered.response) return metered.response
  const { userId, trackingStarted } = metered

  try {
    // Flag check needs `userId` for per-user rollout (lib/feature-flags.ts),
    // so it runs right after the metered preamble resolves one — matching
    // every other Sprint Labs route's auth-then-flag ordering, adapted here
    // because auth is folded into enforceMeteredAiRequest rather than a
    // separate verifyAuth call (same shape app/api/labs/chat/route.ts uses).
    const disabled = await requireSprintLabsEnabled(userId)
    if (disabled) return disabled

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const parsed = postBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors.map((e) => e.message) },
        { status: 400 }
      )
    }
    const body = parsed.data

    if (!isValidTicketKeyForDocId(body.ticketKey)) {
      return NextResponse.json({ error: "Invalid ticket key" }, { status: 400 })
    }

    // Shallow, ownership-scoped read for the tier check — the deeper
    // ownership+active-run check happens inside appendPartnerTurns, exactly
    // the two-read idiom attempts/route.ts and runs/route.ts already use
    // (validate/tier-check before spending an LLM call, service re-validates
    // before its own write).
    const run = await getSprintLabRun(userId, body.runId)
    const tierBlocked = await requireTierForSprint(userId, run)
    if (tierBlocked) return tierBlocked
    if (!run) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

    const compiledTicket = await getTicket(run.workbookId, body.ticketKey)
    if (!compiledTicket) {
      return NextResponse.json({ error: CHAT_ERRORS.UNKNOWN_TICKET }, { status: 404 })
    }
    const ticket = compiledTicket.ticket

    // Assisted-mode-only: rendered up front so resolvePartnerModeForTicket
    // (via the pure resolvePartnerMode) is the ONE place that decides
    // whether it actually reaches the prompt — silently dropped for every
    // other (policy, slot) pair, never trusted from the client alone.
    const filesContext =
      body.mode === "partner" && body.files ? renderWorkspaceFiles(body.files) : undefined

    const mode = await resolvePartnerModeForTicket(
      run.workbookId,
      ticket,
      body.mode,
      filesContext,
      body.ticketKey
    )

    if (mode.kind === "none") {
      return NextResponse.json({ reason: mode.reason }, { status: 403 })
    }

    // Layer A: no compiled public-bundle field carries MERIDIAN.md yet (see
    // context-layers.ts's file header) — renders as "" until a future
    // content-compiler task adds one; the seam is already wired end to end.
    const layerAText = layerA(undefined)

    const layerBText = body.layerB ? layerB(body.layerB) : ""

    // Layer C: ticket-to-sprint mapping is not tracked anywhere in the
    // compiled registry (documented limitation already on
    // requireKnownWorkbookAndTickets in lib/sprint-labs/runs.ts) — the run's
    // OWN current sprint is the best available proxy for "the sprint context
    // to render alongside this ticket."
    const sprint = await getSprint(run.workbookId, run.currentSprint)
    // No directive-entry PRODUCER exists yet anywhere in this codebase (no
    // task before this one writes DirectiveEntry[] to any store) — filterDirectives
    // still runs against an empty list so the byte-shape and the (currently
    // vacuous) collision/decay rules are exercised on every real call, ready
    // for the day a producer exists.
    const layerCText = layerC({
      sprint: sprint
        ? {
            number: sprint.number,
            title: sprint.title,
            goal: sprint.goal,
            standupQuote: sprint.standupQuote,
          }
        : { number: run.currentSprint, title: "", goal: "", standupQuote: "" },
      ticket,
      directives: [],
      currentHiddenTopicTags: compiledTicket.hiddenTests.flatMap((t) => t.tags),
      currentSprint: run.currentSprint,
    })

    const systemPrompt = buildPartnerSystemPrompt(mode, layerAText, layerBText, layerCText)

    // The concession check needs the SEALED trigger list, which only
    // author-agent mode carries (never sent to the browser) — matched
    // server-side against the learner's own words, then appended to the
    // outgoing message as a per-turn instruction (never stored in the
    // visible transcript content; see the doc comment below).
    let userMessage = body.message
    let matchedConcessionTrigger: string | null = null
    if (mode.kind === "author-agent") {
      matchedConcessionTrigger = findMatchedConcessionTrigger(
        body.message,
        mode.brief.concessionTriggers
      )
      if (matchedConcessionTrigger) {
        userMessage += buildConcessionNote(matchedConcessionTrigger)
      }
    }

    // History sits between the (stable) system prompt and this turn's
    // message, per AGENT-CONTEXT.md §3's stable-first ordering — fetched
    // fresh from the persisted transcript rather than trusted from the
    // client, since this is a server-owned record.
    const existing = await getPartnerTranscript(userId, body.runId, body.ticketKey)
    const priorHistory = (existing?.transcript.messages ?? []).map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      content: m.content,
    }))

    const aiResponse = await generateAIResponse(systemPrompt, userMessage, priorHistory, {
      userId,
      service: "sprint-labs-chat",
      eventType: "chat_message",
      complexity: "standard",
    })

    // Search/tool instrumentation baselines (AGENT-CONTEXT.md §8 build-order
    // item 1): zero-filled in v0 because chat-only ships no tools at all.
    // Logged, not persisted — the frozen SprintLabTranscriptMessage shape has
    // no field for it, and "log" is the literal instruction — so the day a
    // tool-enabled partner ships, there is a real zero baseline in the log
    // stream to diff its first non-zero values against.
    logger.info("sprint-labs-chat turn", {
      runId: run.id,
      ticketKey: body.ticketKey,
      turnIndex: body.turnIndex,
      aiPolicy: ticket.aiPolicy,
      mode: mode.kind,
      instrumentation: {
        toolCalls: 0,
        searchCalls: 0,
        tokensOnSearch: 0,
        wallClockToFirstEditMs: 0,
        maxGrepHitCount: 0,
      },
    })

    const capabilityTags = [
      "chat",
      ...(mode.kind === "tutor-blind" ? ["tutor-blind"] : []),
      ...(mode.kind === "author-agent" ? ["author-agent"] : []),
    ]

    // provenance is "human" on every v0 message, on both sides of the
    // exchange: chat-only ships no edit/bash tool, so nothing here is ever
    // an autonomous agent action — "agent" has no v0 producer at all (see
    // lib/sprint-labs/types.ts's doc comment on the Provenance enum).
    const userTurn: SprintLabTranscriptMessage = {
      role: "user",
      content: body.message,
      aiPolicy: ticket.aiPolicy,
      provenance: "human",
      capabilities: capabilityTags,
    }
    const assistantTurn: SprintLabTranscriptMessage = {
      role: "assistant",
      content: aiResponse.text,
      aiPolicy: ticket.aiPolicy,
      provenance: "human",
      // Concession is a machine-checkable event, recorded as an additional
      // capability tag on the turn where it fired (no schema field exists
      // for it on the frozen transcript shape) — see concession.ts.
      capabilities: matchedConcessionTrigger ? [...capabilityTags, "concession"] : capabilityTags,
    }

    await appendPartnerTurns(userId, body.runId, body.ticketKey, [userTurn, assistantTurn])

    return NextResponse.json({ reply: aiResponse.text })
  } catch (error) {
    return serviceErrorResponse(error, "Failed to send sprint lab chat message")
  } finally {
    if (trackingStarted) {
      await endRequestTracking(userId).catch(() => {})
    }
  }
}

/**
 * GET /api/sprint-labs/chat?runId=...&ticketKey=... — rehydrate the
 * learner's transcript + directive mutes on mount. Not metered/rate-limited
 * like POST (no LLM call), but still flag-gated and auth-required.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const disabled = await requireSprintLabsEnabled(auth.userId)
  if (disabled) return disabled

  const { searchParams } = new URL(request.url)
  const runId = searchParams.get("runId")
  const ticketKey = searchParams.get("ticketKey")
  if (!runId || !ticketKey) {
    return NextResponse.json({ error: "runId and ticketKey are required" }, { status: 400 })
  }
  if (!isValidTicketKeyForDocId(ticketKey)) {
    return NextResponse.json({ error: "Invalid ticket key" }, { status: 400 })
  }

  try {
    const result = await getPartnerTranscript(auth.userId, runId, ticketKey)
    if (!result) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
    return NextResponse.json(result)
  } catch (error) {
    return serviceErrorResponse(error, "Failed to load sprint lab chat transcript")
  }
}

const patchBodySchema = z.object({
  action: z.literal("mute-directive"),
  runId: z.string().min(1),
  ticketKey: z.string().min(1),
  directiveId: z.string().min(1),
  muted: z.boolean(),
})

/**
 * PATCH /api/sprint-labs/chat — toggle one directive's mute state. Muting is
 * exclusion only: never recorded to the agent, never penalized, never shown
 * to it (AGENT-CONTEXT.md §7) — see transcript-store.ts's
 * `setPartnerDirectiveMuted` for where that contract is enforced.
 */
export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const disabled = await requireSprintLabsEnabled(auth.userId)
  if (disabled) return disabled

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const parsed = patchBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors.map((e) => e.message) },
      { status: 400 }
    )
  }
  const body = parsed.data
  if (!isValidTicketKeyForDocId(body.ticketKey)) {
    return NextResponse.json({ error: "Invalid ticket key" }, { status: 400 })
  }

  try {
    const mutedDirectiveIds = await setPartnerDirectiveMuted(
      auth.userId,
      body.runId,
      body.ticketKey,
      body.directiveId,
      body.muted
    )
    return NextResponse.json({ mutedDirectiveIds })
  } catch (error) {
    return serviceErrorResponse(error, "Failed to update directive mute state")
  }
}

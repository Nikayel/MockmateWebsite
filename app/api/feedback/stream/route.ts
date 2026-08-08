/**
 * Streaming Feedback API - Edge Function
 *
 * This route serves EVERY scenario type except system design: DSA, bugfix,
 * optimization, security, and add-functionality all reach it via
 * useInterviewFeedback -> useStreamingFeedback. System design alone goes to
 * the Node route (/api/generate-feedback). Anything that changes user-visible
 * DSA or bugfix scores has to change HERE, not only in lib/feedback/scoring/*.
 *
 * HISTORICAL NOTE: this was originally an Edge function to escape Vercel's
 * 10s Hobby serverless timeout by streaming. That constraint is gone:
 * vercel.json already grants maxDuration 30 to every app/api function, the
 * platform default is now far higher, and Vercel no longer recommends Edge
 * (Fluid Compute runs Node in the same regions at the same price). The
 * remaining reason this is separate is inertia plus the Firebase-Admin split
 * (Edge cannot use it, hence /api/feedback/persist). See
 * docs/EDGE-TO-NODE-CONSOLIDATION.md for the migration assessment.
 *
 * Flow:
 * 1. Receive session data
 * 2. Calculate instant scores (no AI, < 100ms)
 * 3. Stream scores immediately
 * 4. Run AI operations
 * 5. Stream rich feedback as it generates
 */

import { NextRequest } from "next/server"
import { verifyAuthEdge } from "@/lib/auth-edge"
import {
  generateFeedbackResponseEdge,
  validateConversationEdge,
  extractConversationEvidenceEdge,
} from "@/lib/ai-providers-edge"
// Direct imports to avoid pulling in Node.js dependencies via barrel exports
import { sanitizeTestCount, sanitizeEfficiencyScore } from "@/lib/feedback/request-schema"
import { preScreenConversation } from "@/lib/feedback/pre-screening"
import { analyzeCodeCompleteness } from "@/lib/feedback/completeness-analysis"
import { parseFeedbackSections, buildSilentNotesContext } from "@/lib/feedback/parsers"
import { completeFeedbackSections } from "@/lib/feedback/structured-feedback-schema"
import { calculateInstantScores, buildSignalsFromMetrics } from "@/lib/feedback/score-accumulator"
import {
  analyzeAICodeOverlap,
  getDefaultValidation,
  calculateValidatedScores,
  applyScoreFloors,
  buildEvidenceSummary,
} from "@/lib/feedback/edge-utils"
import { analyzeTranscriptForMistakesEdge } from "@/lib/feedback/transcript-analysis-edge"
import { reportEdgeUsageInBackground } from "@/lib/usage/edge-reporter"
// lib/logger has zero imports and touches no Node builtins, so it is safe in the
// Edge runtime. This route previously used console.* only, which meant every
// failure on the path that scores DSA, bugfix, optimization, security, and
// add-functionality sessions landed in a short-retention Edge log and nowhere else.
import { logger } from "@/lib/logger"
import { summarizeBugfixEvidence } from "@/lib/bugfix/evidence"
import { buildBugfixPostSessionReport } from "@/lib/bugfix/report"
import {
  calculateBugfixEvidenceScore,
  mapBugfixBreakdownToCategoryScores,
} from "@/lib/bugfix/scoring"
import {
  scoreBugfixSemantics,
  fitTranscript,
  BUGFIX_SEMANTIC_NEUTRAL,
  BUGFIX_SEMANTIC_SILENT,
} from "@/lib/bugfix/semantic-scorer"
import { loadSealedPack } from "@/lib/scenarios/sealed/registry.server"
import { loadSealedLegacyBugfix } from "@/lib/scenarios/sealed/legacy-registry.server"
import type {
  BugfixEvidenceEvent,
  BugfixEvidenceSummary,
  BugfixScoreBreakdown,
} from "@/lib/bugfix/types"

// CRITICAL: Edge runtime for no timeout on streaming
export const runtime = "edge"

// ============================================================================
// Rate limiting (Edge)
// ============================================================================
//
// This route was gated by verifyAuthEdge alone: no rate limit, no quota check,
// no budget check. One authenticated account could call it in a loop, and each
// call makes up to FIVE AI requests (conversation validation, evidence
// extraction, silent-notes analysis, bugfix semantic scoring, feedback
// generation) at high reasoning effort.
//
// lib/rate-limit.ts is unusable from here, which is why this is local rather
// than imported. Its store selection prefers FirestoreRateLimitStore in
// production, and that store's `increment` dynamically imports firebase-admin —
// unavailable in the Edge runtime. The import would reject, `increment` would
// hit its "fail open" catch, and every request would be allowed. A rate limiter
// that is a silent no-op is worse than none, because it looks like coverage.
// Its module init can also THROW in production when no distributed store is
// configured, which in Edge would 500 the route instead of degrading.
//
// TODO: this belongs in lib/rate-limit-edge.ts once the file is in scope to
// create; it is inline here purely to keep this change to the routes it fixes.

/** One fixed-window limit. Both windows must pass. */
interface EdgeRateWindow {
  name: string
  windowSeconds: number
  maxRequests: number
}

/**
 * Two windows, because one cannot express both shapes of abuse.
 *
 * The burst window is what stops a runaway client loop: a completed interview
 * produces exactly one feedback request, so 3/minute already allows a user to
 * retry twice after a failed stream and is far above any human rate.
 *
 * The sustained window is what stops a patient script. A 60-second window alone
 * would permit 4,320 requests/day — up to ~21,600 AI calls — while never once
 * appearing to burst. 20/hour is roughly 6x the busiest plausible human
 * (interviews take 20-45 minutes) and caps a single account at ~480 feedback
 * runs a day rather than an unbounded number.
 */
const FEEDBACK_RATE_WINDOWS: readonly EdgeRateWindow[] = [
  { name: "burst", windowSeconds: 60, maxRequests: 3 },
  { name: "sustained", windowSeconds: 60 * 60, maxRequests: 20 },
]

/**
 * Per-isolate fallback counters. Not distributed — an attacker spread across
 * isolates gets one bucket each — but it is a real bound on a single runaway
 * client, which is the failure this is most likely to meet. Used only when
 * Upstash is unconfigured or unreachable.
 */
const isolateRateCounters = new Map<string, { count: number; resetAtMs: number }>()

/** Bounded so a key-space flood cannot grow the isolate's memory without limit. */
const MAX_ISOLATE_COUNTERS = 10_000

function checkIsolateWindow(key: string, window: EdgeRateWindow, nowMs: number): boolean {
  const existing = isolateRateCounters.get(key)
  if (!existing || existing.resetAtMs <= nowMs) {
    if (isolateRateCounters.size >= MAX_ISOLATE_COUNTERS) {
      for (const [k, v] of isolateRateCounters) {
        if (v.resetAtMs <= nowMs) isolateRateCounters.delete(k)
      }
      // Still full of live entries: refuse rather than grow without bound.
      if (isolateRateCounters.size >= MAX_ISOLATE_COUNTERS) return false
    }
    isolateRateCounters.set(key, { count: 1, resetAtMs: nowMs + window.windowSeconds * 1000 })
    return true
  }
  existing.count++
  return existing.count <= window.maxRequests
}

/** One Upstash REST command. Returns undefined when Upstash is not usable. */
async function upstashCommand(command: string[]): Promise<unknown | undefined> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return undefined

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  })
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`)
  const data = (await response.json()) as { result?: unknown }
  return data.result
}

/**
 * Distributed fixed-window counter.
 *
 * The window is baked into the KEY (bucket index = floor(now / window)) so the
 * counter is a plain INCR with no read-modify-write, and therefore atomic across
 * concurrent instances. That matters: a check-then-set limiter is exactly what a
 * parallel client defeats.
 */
async function checkUpstashWindow(
  key: string,
  window: EdgeRateWindow,
  nowMs: number
): Promise<boolean | undefined> {
  const bucket = Math.floor(nowMs / (window.windowSeconds * 1000))
  const bucketKey = `${key}:${bucket}`

  const count = await upstashCommand(["INCR", bucketKey])
  if (typeof count !== "number") return undefined

  if (count === 1) {
    // First hit in this bucket: give the key a TTL so buckets self-collect.
    // +10s of slack so a clock skew cannot expire a bucket still in use.
    await upstashCommand(["EXPIRE", bucketKey, String(window.windowSeconds + 10)])
  }

  return count <= window.maxRequests
}

interface EdgeRateLimitVerdict {
  allowed: boolean
  /** Which window rejected, for the log and the Retry-After hint. */
  window?: EdgeRateWindow
}

/**
 * Rate limit one user across every configured window.
 *
 * Keyed by the VERIFIED user id rather than by IP. The route is auth-gated, so
 * the account is the thing that spends money, and an IP key would both punish
 * shared networks (a lecture hall behind one NAT) and be trivially rotated.
 *
 * On an Upstash failure this degrades to the per-isolate counter instead of
 * failing open. A limiter guarding five reasoning-model calls should not
 * evaporate because a cache was briefly unreachable.
 */
async function checkFeedbackRateLimit(userId: string): Promise<EdgeRateLimitVerdict> {
  const nowMs = Date.now()

  for (const window of FEEDBACK_RATE_WINDOWS) {
    const key = `rl:fbstream:${userId}:${window.windowSeconds}`
    let allowed: boolean | undefined

    try {
      allowed = await checkUpstashWindow(key, window, nowMs)
    } catch (error) {
      logger.error(
        "[Streaming Feedback] Distributed rate limit unavailable, using isolate counter",
        {
          window: window.name,
          error,
        }
      )
      allowed = undefined
    }

    if (allowed === undefined) {
      allowed = checkIsolateWindow(key, window, nowMs)
    }

    if (!allowed) return { allowed: false, window }
  }

  return { allowed: true }
}

// ============================================================================
// Global daily spend ceiling (Edge)
// ============================================================================
//
// isGlobalCeilingExceeded is consulted in exactly ONE place on the platform:
// inside checkQuota. Every route that does not call checkQuota therefore
// bypasses the $250/day kill-switch, and this route is the largest of them. It
// cannot call it directly either — the counter lives in Firestore and Edge
// cannot load Firebase Admin — so it asks the Node side, exactly as it already
// does for usage reporting.

interface CeilingProbe {
  exceeded: boolean
  checkedAtMs: number
}

/**
 * Per-isolate cache of the last probe. 60 seconds bounds the extra internal
 * request to at most one per isolate per minute, against a route that is about
 * to make up to five reasoning-model calls, while keeping the reaction time to
 * a tripped ceiling well under the window in which real money accumulates.
 */
const CEILING_PROBE_TTL_MS = 60_000
let cachedCeilingProbe: CeilingProbe | null = null

/**
 * Ask the Node side whether the platform-wide daily ceiling has been reached.
 *
 * Returns false (allow) when the probe itself cannot be completed, which is a
 * DIFFERENT decision from the one lib/global-spend-guard.ts makes, and
 * deliberately so. That function fails closed because an unreadable ledger means
 * spend is genuinely invisible. Here the equivalent failure is already covered:
 * a Firestore error makes isGlobalCeilingExceeded return true, the probe
 * returns ceilingExceeded: true, and this route blocks. The only case that
 * reaches the fallback is "Edge could not reach our own origin", which says
 * nothing about spend — and the cost of guessing wrong is denying a user the
 * feedback for an interview they have just spent 45 minutes on. A stale cached
 * verdict is preferred over a guess, and per-user rate limits and budgets still
 * apply either way.
 */
async function isGlobalSpendCeilingReached(): Promise<boolean> {
  const nowMs = Date.now()
  if (cachedCeilingProbe && nowMs - cachedCeilingProbe.checkedAtMs < CEILING_PROBE_TTL_MS) {
    return cachedCeilingProbe.exceeded
  }

  const secret = process.env.CRON_SECRET
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "")
  const origin =
    configuredOrigin || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (!secret || !origin) {
    logger.error("[Streaming Feedback] Cannot check the global spend ceiling: misconfigured", {
      reason: !secret ? "CRON_SECRET unset" : "no NEXT_PUBLIC_SITE_URL or VERCEL_URL",
    })
    return cachedCeilingProbe?.exceeded ?? false
  }

  try {
    const response = await fetch(`${origin}/api/internal/usage`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
    })
    if (!response.ok) {
      throw new Error(`Ceiling probe responded ${response.status}`)
    }
    const data = (await response.json()) as {
      ceilingExceeded?: unknown
      spendToday?: unknown
      ceiling?: unknown
    }
    const exceeded = data.ceilingExceeded === true
    cachedCeilingProbe = { exceeded, checkedAtMs: nowMs }
    if (exceeded) {
      logger.error("[Streaming Feedback] Global daily spend ceiling reached, refusing feedback", {
        spendToday: data.spendToday,
        ceiling: data.ceiling,
      })
    }
    return exceeded
  } catch (error) {
    logger.error("[Streaming Feedback] Global spend ceiling probe failed", { error })
    // Prefer a stale verdict to a guess; see the note above on why this does
    // not fail closed the way the Firestore-side guard does.
    return cachedCeilingProbe?.exceeded ?? false
  }
}

// ============================================================================
// Input bounds
// ============================================================================
//
// conversationTranscript was mapped verbatim into the payload of up to five AI
// calls. Nothing bounded the number of messages or their length, so the cost of
// a single request was a function of what the caller chose to send.

/**
 * 400 messages. A 45-minute interview at a message every ten seconds is ~270,
 * so this does not touch a real session; it stops a synthetic one. When it does
 * bite, the HEAD and TAIL are kept rather than a prefix: the approach is stated
 * at the start and the complexity discussion at the end, and both are scored.
 */
const MAX_TRANSCRIPT_MESSAGES = 400

/**
 * 4,000 characters per message (~1,000 tokens). Roughly 20x a long human chat
 * turn, and code lives in its own field rather than in the transcript. The
 * downstream helpers already truncate for their own prompts, but they do so
 * AFTER building the full joined string, so an unbounded message was still
 * materialised (and, for the bugfix path, still priced) before anything trimmed.
 */
const MAX_MESSAGE_CHARS = 4_000

/** ~30k characters. The prompt only ever shows the first 1,500. */
const MAX_CODE_CHARS = 30_000

/** AI partner turns feed the copy-detection overlap scan, which is O(code x messages). */
const MAX_PARTNER_MESSAGES = 200

interface RawTranscriptMessage {
  type?: string
  role?: string
  message?: string
  content?: string
}

/** Clamp one message's text, preserving its shape for every downstream reader. */
function boundMessageText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  return value.length > MAX_MESSAGE_CHARS ? value.slice(0, MAX_MESSAGE_CHARS) : value
}

/**
 * Bound an untrusted transcript ONCE, at the edge of the handler, so every
 * later reader (message counts, pre-screening, the AI payloads) sees the same
 * bounded value and no unbounded copy survives anywhere.
 */
function boundTranscript(raw: unknown): { messages: RawTranscriptMessage[]; truncated: boolean } {
  if (!Array.isArray(raw)) return { messages: [], truncated: false }

  const kept =
    raw.length <= MAX_TRANSCRIPT_MESSAGES
      ? raw
      : [
          ...raw.slice(0, Math.floor(MAX_TRANSCRIPT_MESSAGES / 2)),
          ...raw.slice(-Math.ceil(MAX_TRANSCRIPT_MESSAGES / 2)),
        ]

  return {
    messages: kept.map((entry: RawTranscriptMessage) => ({
      type: entry?.type,
      role: entry?.role,
      message: boundMessageText(entry?.message),
      content: boundMessageText(entry?.content),
    })),
    truncated: raw.length > MAX_TRANSCRIPT_MESSAGES,
  }
}

export async function POST(request: NextRequest) {
  // Verify the caller before streaming any paid AI output. Header-only check so
  // the request body stays available for processRequest().
  const auth = await verifyAuthEdge(request)
  if (!auth.authenticated || !auth.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  const authenticatedUserId = auth.userId

  // Rate limit BEFORE the stream is opened. Once the SSE response is returned
  // the client renders a progress UI, so a refusal has to be an ordinary HTTP
  // error the caller can surface, not an `error` event mid-stream.
  const rateVerdict = await checkFeedbackRateLimit(authenticatedUserId)
  if (!rateVerdict.allowed) {
    const retryAfterSeconds = rateVerdict.window?.windowSeconds ?? 60
    logger.warn("[Streaming Feedback] Rate limit exceeded", {
      userId: authenticatedUserId,
      window: rateVerdict.window?.name,
      limit: rateVerdict.window?.maxRequests,
    })
    return new Response(
      JSON.stringify({
        error: "Too many feedback requests. Please wait a moment and try again.",
        retryAfter: retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSeconds),
        },
      }
    )
  }

  // Aggregate kill-switch, after the (cheap, local) rate limit and before the
  // (expensive, remote) AI calls. 503 rather than 429: this is not the caller's
  // fault and retrying with a different account will not help.
  if (await isGlobalSpendCeilingReached()) {
    return new Response(
      JSON.stringify({
        error:
          "AI feedback is temporarily paused due to unusually high platform usage. " +
          "Your session is saved — please try again later.",
        code: "GLOBAL_CAPACITY_LIMIT",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json", "Retry-After": "3600" },
      }
    )
  }

  const encoder = new TextEncoder()

  // Create a TransformStream for streaming
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Helper to send SSE events
  const sendEvent = async (event: string, data: unknown) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    await writer.write(encoder.encode(payload))
  }

  // Process in background while streaming.
  // Hoisted out of the try so the terminal catch can still name the session even
  // when request.json() is what threw, which is when the body is least knowable.
  let loggedScenarioId: unknown
  let loggedScenarioType: unknown

  const processRequest = async () => {
    try {
      const body = await request.json()
      const {
        sessionId,
        userId,
        code: rawCode,
        language,
        testsPassed: rawTestsPassed,
        testsTotal: rawTestsTotal,
        scenarioType,
        scenarioTitle,
        scenarioId,
        scenarioDifficulty,
        scenarioPattern,
        conversationTranscript: rawConversationTranscript,
        partnerMessages: rawPartnerMessages,
        phaseTracking,
        silentNotes: existingSilentNotes,
        efficiencyMetrics,
        submittedFromPhase,
        testsRanBeforeSubmit,
        bugfixEvidenceEvents,
        bugfixExpectedTouchedFiles,
        bugfixRootCause,
        bugfixPrevention,
        bugfixRootCauseRubric,
        bugfixGroundTruth,
      } = body

      loggedScenarioId = scenarioId
      loggedScenarioType = scenarioType

      // The session owner in the body must be present AND match the verified
      // token. The client always sends it; requiring it closes the gap where an
      // omitted userId would skip the ownership check entirely.
      if (!userId || userId !== authenticatedUserId) {
        await sendEvent("error", { message: "Forbidden" })
        return
      }

      // Untrusted numeric inputs: a non-numeric count would make passRate NaN
      // (which survives clamping into the scores event), and testsPassed >
      // testsTotal would make it >100% and trip every perfect-pass floor.
      const testsTotal = sanitizeTestCount(rawTestsTotal)
      const testsPassed = Math.min(sanitizeTestCount(rawTestsPassed), testsTotal)

      // Bound the free-text inputs ONCE, here, before anything reads them. Every
      // reader below (message counts, pre-screening, the five AI payloads) uses
      // these bounded values, so no unbounded copy of a caller-controlled string
      // survives into a priced call.
      const { messages: conversationTranscript, truncated: transcriptTruncated } =
        boundTranscript(rawConversationTranscript)
      const code =
        typeof rawCode === "string" && rawCode.length > MAX_CODE_CHARS
          ? rawCode.slice(0, MAX_CODE_CHARS)
          : rawCode
      const partnerMessages = Array.isArray(rawPartnerMessages)
        ? rawPartnerMessages.slice(0, MAX_PARTNER_MESSAGES)
        : rawPartnerMessages

      if (transcriptTruncated) {
        // Only reachable from a synthetic session, so it is worth seeing.
        logger.warn("[Streaming Feedback] Transcript exceeded the message cap", {
          userId: authenticatedUserId,
          received: Array.isArray(rawConversationTranscript) ? rawConversationTranscript.length : 0,
          cap: MAX_TRANSCRIPT_MESSAGES,
          scenarioId,
        })
      }

      // ========================================
      // PHASE 1: Instant Scores (< 100ms, no AI)
      // ========================================
      await sendEvent("phase", { phase: "calculating_scores", message: "Calculating scores..." })

      const codeAnalysis = code
        ? analyzeCodeCompleteness(code, language || "javascript")
        : { isIncomplete: true, hasActualLogic: false }

      // Derive actual message counts from transcript (not hardcoded 0)
      const transcriptArray =
        conversationTranscript && Array.isArray(conversationTranscript)
          ? conversationTranscript
          : []
      const candidateMessageCount = transcriptArray.filter(
        (m: { role?: string; type?: string }) =>
          m.role === "candidate" || m.role === "user" || m.type === "user"
      ).length
      const interviewerMessageCount = transcriptArray.filter(
        (m: { role?: string; type?: string }) =>
          m.role === "interviewer" || m.type === "interviewer"
      ).length

      const signals = buildSignalsFromMetrics({
        testsPassed,
        testsTotal,
        efficiencyScore: sanitizeEfficiencyScore(efficiencyMetrics?.efficiencyScore),
        codeLength: code?.length || 0,
        hasActualLogic: codeAnalysis.hasActualLogic,
        approachExplained: phaseTracking?.conversationTracker?.approachExplained || false,
        complexityDiscussed: phaseTracking?.conversationTracker?.timeComplexityMentioned || false,
        edgeCasesIdentified: phaseTracking?.conversationTracker?.edgeCasesMentioned || [],
        hintsViewed: [],
        totalInterviewerMessages: interviewerMessageCount,
        totalChatMessages: candidateMessageCount,
        aiSuggestionsCopiedBlindly: 0,
        testsRanBeforeSubmit: testsRanBeforeSubmit ?? false,
        submittedFromPhase: submittedFromPhase || "unknown",
        scenarioType: scenarioType || "dsa",
        difficulty: scenarioDifficulty || "medium",
      })

      const instantScores = calculateInstantScores(signals)

      // Send instant scores immediately
      await sendEvent("scores", {
        understanding: instantScores.understanding,
        problemSolving: instantScores.problemSolving,
        codeQuality: instantScores.codeQuality,
        communication: instantScores.communication,
        overall: instantScores.overall,
        flags: {
          silentSolution: instantScores.silentSolution,
          incompleteSolution: instantScores.incompleteSolution,
          aiCopyingDetected: instantScores.aiCopyingDetected,
        },
      })

      // ========================================
      // PHASE 2: AI Validation (parallel)
      // ========================================
      await sendEvent("phase", { phase: "analyzing", message: "Analyzing your interview..." })

      const passRate = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0
      // preScreenConversation declares { role, content } but has always been
      // handed the raw body shape, which for some clients carries `type` /
      // `message` instead. Bounding the transcript gave the value a real type
      // and surfaced the mismatch; normalising it here would change what
      // pre-screening counts, and pre-screening feeds the scores users see.
      // Preserved exactly as-is — worth fixing, but not inside a cost change.
      const preScreen = preScreenConversation(
        conversationTranscript as unknown as Array<{ role: string; content: string }>
      )
      const aiCodeOverlap = analyzeAICodeOverlap(code, partnerMessages)
      const hasBlindCopying = aiCodeOverlap.hasHighOverlap && !aiCodeOverlap.modificationsMade
      const bugfixEvidenceSummary: BugfixEvidenceSummary | null =
        scenarioType === "bugfix" && Array.isArray(bugfixEvidenceEvents)
          ? summarizeBugfixEvidence({
              events: bugfixEvidenceEvents as BugfixEvidenceEvent[],
              expectedTouchedFiles: Array.isArray(bugfixExpectedTouchedFiles)
                ? bugfixExpectedTouchedFiles
                : [],
            })
          : null
      const bugfixScoreBreakdownPreSemantic: BugfixScoreBreakdown | null = bugfixEvidenceSummary
        ? calculateBugfixEvidenceScore(bugfixEvidenceSummary, {
            difficulty: scenarioDifficulty || "medium",
          })
        : null

      // Prepare transcript
      const transcriptMessages =
        conversationTranscript && Array.isArray(conversationTranscript)
          ? conversationTranscript.map(
              (msg: { type?: string; role?: string; message?: string; content?: string }) => ({
                role:
                  msg.type === "user" || msg.role === "user" || msg.role === "candidate"
                    ? ("user" as const)
                    : ("interviewer" as const),
                content: msg.message || msg.content || "",
              })
            )
          : []

      // The semantic scorer judges hypothesis / root cause / prevention from what the
      // candidate SAID. With no candidate turn (they ran and edited code but never spoke to
      // the interviewer) there is nothing to judge, and scoring an empty transcript would
      // return low marks and dock the 28% the redesign moved onto the transcript. Only run
      // it when the candidate actually spoke; otherwise stay at the neutral floor.
      const hasCandidateTurn = transcriptMessages.some(
        (m) => m.role === "user" && m.content.trim().length > 0
      )

      // Sealed grading content (SERVER-LOADED, never client-trusted). Two sources:
      //   - stdout-oracle packs: rubric + ground truth from the sealed pack module.
      //   - legacy assert-based bugfix (the locked bank of 10): root cause, ground
      //     truth, and rubric now live in the sealed legacy registry instead of the
      //     client bundle, so we source them here exactly as the client used to post
      //     them (scoring behavior is preserved byte-for-byte).
      // Both return null for any other scenario, so non-bugfix feedback is unchanged.
      // This is the only path where sealed solution content reaches an LLM.
      let sealedRubric: string[] | null = null
      let sealedGroundTruth: string | null = null
      // The legacy rubric ALSO feeds the feedback-generation prompt below (the client
      // no longer posts it). Packs keep their prior behavior: the prompt still uses the
      // client-sent generic pack rubric, not the sealed debrief rubric.
      let sealedLegacyRubric: string[] | null = null
      if (scenarioType === "bugfix" && typeof scenarioId === "string" && scenarioId) {
        try {
          const sealed = await loadSealedPack(scenarioId)
          if (sealed) {
            sealedRubric = sealed.debriefRubric.length > 0 ? sealed.debriefRubric : null
            sealedGroundTruth = [
              sealed.bugSummary,
              `Bug location: ${sealed.bugLocation}.`,
              sealed.minimalFix,
            ]
              .filter(Boolean)
              .join(" ")
          } else {
            const legacy = await loadSealedLegacyBugfix(scenarioId)
            if (legacy) {
              sealedLegacyRubric =
                legacy.rootCauseRubric && legacy.rootCauseRubric.length > 0
                  ? legacy.rootCauseRubric
                  : null
              sealedRubric = sealedLegacyRubric
              sealedGroundTruth =
                typeof legacy.bugDescription === "string" && legacy.bugDescription
                  ? legacy.bugDescription
                  : null
            }
          }
        } catch (error) {
          // Sealed content unavailable, so grading falls back to the values the
          // CLIENT supplied. That is a scoring-integrity regression, not a cosmetic
          // degradation: the candidate is graded against a rubric they posted. It
          // was previously swallowed silently, so it could run indefinitely.
          logger.error("[Streaming Feedback] Sealed grading content unavailable", {
            scenarioId,
            scenarioType,
            error,
          })
        }
      }

      // Run validation, extraction, and silent notes analysis in parallel
      const shouldValidateWithAI =
        scenarioType === "system-design" ||
        (preScreen.hasContent && preScreen.candidateMessageCount >= 1)

      // Problem context for silent notes analysis
      const problemContext = {
        title: scenarioTitle || "Unknown Problem",
        optimalTimeComplexity: efficiencyMetrics?.optimalTimeComplexity || "O(n)",
        optimalSpaceComplexity: efficiencyMetrics?.optimalSpaceComplexity || "O(1)",
        criticalEdgeCases: ["empty input", "single element", "null values"],
        scenarioType: scenarioType || "dsa",
        // The analyzer's prompt has always asked for "stated O(x) but actual is
        // O(y)" and was never given anything to determine the actual from. It
        // received the OPTIMAL complexity, which answers a different question:
        // whether the candidate matched the ideal, not whether they described
        // their own solution correctly. Without this the model either guessed
        // or restated the overclaim check that buildComplexitySilentNotes
        // already performs deterministically.
        candidateCode: code,
      }

      const [aiValidation, extractedEvidence, silentNotesAnalysis, bugfixSemanticScores] =
        await Promise.all([
          shouldValidateWithAI
            ? validateConversationEdge(
                transcriptMessages,
                code,
                efficiencyMetrics
                  ? {
                      time: efficiencyMetrics.estimatedTimeComplexity,
                      space: efficiencyMetrics.estimatedSpaceComplexity,
                    }
                  : null
              ).catch((error) => {
                // A degraded provider silently swaps in neutral defaults, which
                // changes the score the user is shown. Without a log this is
                // indistinguishable from a genuinely neutral session.
                logger.error("[Streaming Feedback] Conversation validation failed", {
                  scenarioType,
                  error,
                })
                return getDefaultValidation()
              })
            : Promise.resolve(getDefaultValidation()),
          transcriptMessages.length > 0
            ? extractConversationEvidenceEdge(transcriptMessages, problemContext).catch((error) => {
                logger.error("[Streaming Feedback] Evidence extraction failed", {
                  scenarioType,
                  error,
                })
                return null
              })
            : Promise.resolve(null),
          // Generate silent notes if we don't have existing ones and have transcript
          !existingSilentNotes?.length && transcriptMessages.length >= 2
            ? analyzeTranscriptForMistakesEdge(
                transcriptMessages.map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
                problemContext
              ).catch((error) => {
                // Degrades the feedback rather than the score, so warn rather than
                // error, but it still needs to leave the Edge log.
                logger.warn("[Streaming Feedback] Silent notes analysis failed", {
                  scenarioType,
                  error,
                })
                return { silentNotes: [], analysisMetadata: null }
              })
            : Promise.resolve({ silentNotes: existingSilentNotes || [], analysisMetadata: null }),
          scenarioType === "bugfix" &&
          bugfixEvidenceSummary &&
          bugfixScoreBreakdownPreSemantic &&
          hasCandidateTurn
            ? scoreBugfixSemantics({
                deterministicSubScores: bugfixScoreBreakdownPreSemantic,
                evidenceSummary: bugfixEvidenceSummary,
                rootCauseRubric:
                  sealedRubric ??
                  (Array.isArray(bugfixRootCauseRubric) ? bugfixRootCauseRubric : []),
                bugDescription:
                  sealedGroundTruth ??
                  (typeof bugfixGroundTruth === "string" ? bugfixGroundTruth : ""),
                // The transcript is now the ONLY place a candidate states their
                // hypothesis, root cause, and prevention (the three textareas that
                // used to carry them are gone). A hypothesis is stated EARLY, so the
                // last-10-messages window would routinely cut off the very evidence
                // hypothesisQuality is scored on. Send the whole conversation.
                conversationExcerpt: fitTranscript(
                  transcriptMessages
                    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
                    .join("\n\n")
                ),
              }).catch((error) => {
                // NEUTRAL is reserved for "the scorer itself was unavailable", which
                // is exactly this branch. Log it so a persistently broken scorer is
                // distinguishable from sessions that genuinely earned neutral.
                logger.error("[Streaming Feedback] Bugfix semantic scorer failed", {
                  scenarioId,
                  error,
                })
                return BUGFIX_SEMANTIC_NEUTRAL
              })
            : // No candidate turn is EARNED silence (hypothesis/root cause/prevention
              // provably never stated) — score those dimensions low. NEUTRAL stays
              // reserved for "the scorer itself was unavailable".
              Promise.resolve(
                scenarioType === "bugfix" && bugfixEvidenceSummary && !hasCandidateTurn
                  ? BUGFIX_SEMANTIC_SILENT
                  : BUGFIX_SEMANTIC_NEUTRAL
              ),
        ])

      // Use generated silent notes or existing ones
      const finalSilentNotes = silentNotesAnalysis.silentNotes || existingSilentNotes || []
      if (silentNotesAnalysis.analysisMetadata) {
        logger.debug("[Streaming Feedback] Silent notes generated", {
          count: finalSilentNotes.length,
          algorithmicDetections: silentNotesAnalysis.analysisMetadata.algorithmicDetections,
          semanticDetections: silentNotesAnalysis.analysisMetadata.semanticDetections,
        })
      }

      // Reconcile evidence - extracted evidence overrides AI when it finds concrete quotes
      if (extractedEvidence) {
        if (extractedEvidence.approach.explained) {
          aiValidation.approachExplained = true
        }
        if (extractedEvidence.timeComplexity.mentioned) {
          aiValidation.complexityDiscussed = true
          if (extractedEvidence.timeComplexity.isCorrect !== undefined) {
            aiValidation.complexityAccurate = extractedEvidence.timeComplexity.isCorrect
          }
        }
        if (extractedEvidence.edgeCases.mentionedByCandidate.length > 0) {
          aiValidation.edgeCasesConsidered = true
        }
      }

      // ========================================
      // PHASE 3: Calculate Final Scores
      // ========================================
      // Note: extractedEvidence is already merged into aiValidation above
      const bugfixScoreBreakdown: BugfixScoreBreakdown | null = bugfixEvidenceSummary
        ? calculateBugfixEvidenceScore(bugfixEvidenceSummary, {
            difficulty: scenarioDifficulty || "medium",
            semanticOverrides: bugfixSemanticScores,
            // This breakdown REPLACES the capped scorer output below, so the
            // integrity signals have to be applied here too or bugfix sessions
            // escape them entirely.
            integrity: {
              isCoherent: aiValidation.isCoherent,
              responsesRelevant: aiValidation.responsesRelevant,
            },
          })
        : null

      const validatedScores = calculateValidatedScores(
        passRate,
        efficiencyMetrics,
        preScreen,
        aiValidation,
        scenarioType,
        code,
        null // Evidence already merged into aiValidation
      )

      if (hasBlindCopying && scenarioType !== "system-design") {
        validatedScores.understanding = Math.max(30, validatedScores.understanding - 25)
      }

      let finalScores = applyScoreFloors(
        validatedScores,
        passRate,
        sanitizeEfficiencyScore(efficiencyMetrics?.efficiencyScore),
        aiValidation
      )

      if (bugfixScoreBreakdown) {
        finalScores = {
          ...mapBugfixScoreToFeedbackScores(bugfixScoreBreakdown),
          silentSolution: finalScores.silentSolution,
        }
      }

      // Send refined scores
      await sendEvent("refined_scores", {
        understanding: finalScores.understanding,
        problemSolving: finalScores.problemSolving,
        codeQuality: finalScores.codeQuality,
        communication: finalScores.communication,
        overall: finalScores.overall,
      })

      // ========================================
      // PHASE 4: Generate AI Feedback
      // ========================================
      await sendEvent("phase", {
        phase: "generating",
        message: "Generating personalized feedback...",
      })

      const systemInstruction = buildSystemInstruction(scenarioType)
      const prompt = buildPrompt({
        scenarioTitle,
        scenarioType,
        passRate,
        finalScores: finalScores as unknown as Record<string, number>,
        aiValidation: aiValidation as unknown as Record<string, unknown>,
        extractedEvidence,
        bugfixEvidenceSummary,
        bugfixScoreBreakdown,
        bugfixSemanticScores,
        bugfixRootCause,
        bugfixPrevention,
        // Legacy scenarios: the sealed rubric (client stopped posting it). Packs:
        // sealedLegacyRubric is null, so the client-sent generic pack rubric is used.
        bugfixRootCauseRubric:
          sealedLegacyRubric ?? (Array.isArray(bugfixRootCauseRubric) ? bugfixRootCauseRubric : []),
        silentNotes: finalSilentNotes,
        code,
        language,
        efficiencyMetrics,
        testsPassed,
        testsTotal,
      })

      const aiResponse = await generateFeedbackResponseEdge(systemInstruction, prompt)

      const feedback = aiResponse.text

      // Record the spend. This runtime cannot reach Firebase Admin, so without
      // this the platform's most expensive AI call was invisible to the admin
      // dashboard AND to the per-user budget cap that reads the same records.
      // Fire-and-forget by design: accounting must never delay or break the
      // feedback the user is waiting on.
      reportEdgeUsageInBackground({
        userId: authenticatedUserId,
        eventType: "feedback_generation",
        provider: aiResponse.provider,
        promptText: `${systemInstruction}\n${prompt}`,
        responseText: feedback,
        latencyMs: aiResponse.latencyMs,
        sessionId,
        scenarioId,
        pattern: scenarioPattern,
        difficulty: scenarioDifficulty,
        scenarioTitle,
      })

      // Parse sections
      const parsedSections = parseFeedbackSections(feedback)
      const sections = completeFeedbackSections(parsedSections, {
        rawFeedback: feedback,
        scenarioTitle,
        testsPassed,
        testsTotal,
        overallScore: finalScores.overall,
      })

      // ========================================
      // PHASE 5: Stream Final Results
      // ========================================
      await sendEvent("phase", { phase: "complete", message: "Done!" })

      await sendEvent("feedback", {
        raw: feedback,
        tldr: sections.tldr || "",
        whatWorked: sections.whatWorked || [],
        fixNext: sections.fixNext || [],
        actionPlan: sections.actionPlan || [],
        silentNotes: finalSilentNotes,
        bugfixEvidenceSummary,
        bugfixScoreBreakdown,
        bugfixPostSessionReport:
          bugfixEvidenceSummary && bugfixScoreBreakdown
            ? buildBugfixPostSessionReport({
                evidence: bugfixEvidenceSummary,
                score: bugfixScoreBreakdown,
                rootCauseText: typeof bugfixRootCause === "string" ? bugfixRootCause : undefined,
                preventionText: typeof bugfixPrevention === "string" ? bugfixPrevention : undefined,
              })
            : undefined,
        scores: {
          understanding: finalScores.understanding,
          problemSolving: finalScores.problemSolving,
          codeQuality: finalScores.codeQuality,
          communication: finalScores.communication,
          overall: finalScores.overall,
        },
      })

      await sendEvent("done", { success: true })
    } catch (error) {
      // Terminal failure: the user has just finished a full interview and will get
      // no feedback at all. This was console-only, so the most user-visible failure
      // in the product produced no durable signal anywhere.
      logger.error("[Streaming Feedback] Feedback generation failed", {
        scenarioId: loggedScenarioId,
        scenarioType: loggedScenarioType,
        error,
      })
      await sendEvent("error", {
        message: error instanceof Error ? error.message : "Failed to generate feedback",
      })
    } finally {
      await writer.close()
    }
  }

  // Start processing (don't await - let it stream)
  processRequest()

  // Return the stream immediately
  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

function buildSystemInstruction(scenarioType: string): string {
  const baseRules = `
IMPORTANT: Scores are PRE-CALCULATED. Reference them in your feedback. Focus on actionable narrative.

RULES:
- ~200 words max. Be concise.
- Focus on actionable improvements.
- Be specific - reference actual code/conversation.
`

  if (scenarioType === "system-design") {
    return `You are a senior system design interviewer. Be direct and specific.
${baseRules}

FORMAT:
**TL;DR** – One sentence.
**Score Snapshot** (use PRE-CALCULATED SCORES)
**What Worked** – 2-3 specific strengths with evidence
**Fix Next** – 2-3 specific improvements
**Action Plan** – 3 concrete next steps
`
  }

  if (scenarioType === "bugfix") {
    return `You are a senior debugging interviewer. Be direct, evidence-based, and specific.
${baseRules}

FORMAT:
**TL;DR** – One sentence.
**Debugging Score Snapshot** (use PRE-CALCULATED SCORES)
**What Worked** – 2-3 specific strengths with evidence from files, tests, or notes
**Fix Next** – 2-3 concrete debugging process improvements
**Action Plan** – 3 concrete next debugging habits
`
  }

  return `You are a senior technical interviewer. Be honest about gaps but recognize achievements.
${baseRules}

FORMAT:
**TL;DR** – One sentence.
**Score Snapshot** (use PRE-CALCULATED SCORES)
**What Worked** – 2-3 specific strengths with evidence
**Fix Next** – 2-3 specific improvements
**Action Plan** – 3 concrete next steps
`
}

function buildPrompt(data: {
  scenarioTitle: string
  scenarioType: string
  passRate: number
  finalScores: Record<string, number>
  aiValidation: Record<string, unknown>
  extractedEvidence?: unknown
  bugfixEvidenceSummary?: BugfixEvidenceSummary | null
  bugfixScoreBreakdown?: BugfixScoreBreakdown | null
  bugfixSemanticScores?: Record<string, unknown> | null
  bugfixRootCause?: unknown
  bugfixPrevention?: unknown
  bugfixRootCauseRubric?: string[]
  silentNotes: unknown[]
  code: string
  language: string
  efficiencyMetrics?: Record<string, unknown>
  testsPassed: number
  testsTotal: number
}): string {
  const {
    scenarioTitle,
    scenarioType,
    passRate,
    finalScores,
    aiValidation,
    extractedEvidence,
    bugfixEvidenceSummary,
    bugfixScoreBreakdown,
    bugfixSemanticScores,
    bugfixRootCause,
    bugfixPrevention,
    bugfixRootCauseRubric,
    silentNotes,
    code,
    language,
    efficiencyMetrics,
    testsPassed,
    testsTotal,
  } = data

  const evidenceSummary = extractedEvidence
    ? buildEvidenceSummary(extractedEvidence as Parameters<typeof buildEvidenceSummary>[0])
    : ""
  const silentNotesContext = buildSilentNotesContext(
    silentNotes as Parameters<typeof buildSilentNotesContext>[0]
  )
  const bugfixEvidenceContext =
    scenarioType === "bugfix" && bugfixEvidenceSummary && bugfixScoreBreakdown
      ? buildBugfixEvidenceContext({
          summary: bugfixEvidenceSummary,
          score: bugfixScoreBreakdown,
          rootCause: typeof bugfixRootCause === "string" ? bugfixRootCause : "",
          prevention: typeof bugfixPrevention === "string" ? bugfixPrevention : "",
          rubric: bugfixRootCauseRubric || [],
          semanticRationale: (bugfixSemanticScores?.scoringRationale as string) || "",
        })
      : ""

  return `Generate specific, actionable interview feedback.

PROBLEM: ${scenarioTitle} (${scenarioType?.toUpperCase() || "DSA"})

TEST RESULTS: ${testsPassed}/${testsTotal} passed (${Math.round(passRate)}%)

PRE-CALCULATED SCORES (use exactly):
${
  scenarioType === "system-design"
    ? `- Requirements: ${finalScores.understanding}/100
- Architecture: ${finalScores.problemSolving}/100
- Scalability: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
    : scenarioType === "bugfix"
      ? `- Investigation: ${finalScores.understanding}/100
- Debugging Process: ${finalScores.problemSolving}/100
- Fix Quality: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
      : `- Understanding: ${finalScores.understanding}/100
- Problem-Solving: ${finalScores.problemSolving}/100
- Code Quality: ${finalScores.codeQuality}/100
- Communication: ${finalScores.communication}/100`
}
- Overall: ${finalScores.overall}/100

COMMUNICATION:
- Approach explained: ${(aiValidation as Record<string, unknown>).approachExplained ? "YES" : "NO"}
- Complexity discussed: ${(aiValidation as Record<string, unknown>).complexityDiscussed ? "YES" : "NO"}

${evidenceSummary ? `EVIDENCE FROM CONVERSATION:\n${evidenceSummary}\n` : ""}
${bugfixEvidenceContext}
${silentNotesContext}

CODE (${language || "javascript"}):
\`\`\`
${code?.slice(0, 1500) || "[No code]"}
\`\`\`

${
  efficiencyMetrics
    ? `
COMPLEXITY:
- Time: ${(efficiencyMetrics as Record<string, unknown>).estimatedTimeComplexity || "N/A"}
- Space: ${(efficiencyMetrics as Record<string, unknown>).estimatedSpaceComplexity || "N/A"}
`
    : ""
}

CRITICAL: Be SPECIFIC. Reference actual code patterns, conversation quotes, or test failures.
Do NOT give generic advice. Make it clear you analyzed THIS session.`
}

function mapBugfixScoreToFeedbackScores(score: BugfixScoreBreakdown) {
  // Category projection lives in lib/bugfix so the streaming and fallback paths agree.
  // Each of the 11 dimensions has exactly one home there (no double-count, none dropped).
  return { ...mapBugfixBreakdownToCategoryScores(score), overall: score.overall }
}

function buildBugfixEvidenceContext(params: {
  summary: BugfixEvidenceSummary
  score: BugfixScoreBreakdown
  rootCause: string
  prevention: string
  rubric: string[]
  semanticRationale: string
}): string {
  const { summary, score, rootCause, prevention, rubric, semanticRationale } = params

  return `
BUGFIX SESSION EVIDENCE:
- Reproduced before editing: ${summary.reproducedBeforeEditing ? "YES" : "NO"}
- Files inspected: ${summary.inspectedFiles.join(", ") || "none recorded"}
- Tests/docs inspected: ${summary.inspectedTestOrDocs.join(", ") || "none recorded"}
- Edited files: ${summary.editedFiles.join(", ") || "none recorded"}
- Over-edited files: ${summary.overEditedFiles.join(", ") || "none"}
- Visible test runs: ${summary.visibleTestsRun}
- Final pass rate: ${Math.round(summary.finalPassRate)}%
- Hypotheses captured: ${summary.hypothesisCount}
- Root cause & prevention: the candidate states these to the interviewer in the CONVERSATION TRANSCRIPT below, not a form. The semantic scorer judged them from the transcript — see the rationale and the Root Cause Understanding / Regression Prevention scores below.
- AI partner uses: ${summary.aiPartnerUseCount}
- AI shortcut requests: ${summary.aiShortcutCount}

ROOT CAUSE RUBRIC (expected criteria):
${rubric.map((r, i) => `  ${i + 1}. ${r}`).join("\n")}

${rootCause.trim() ? `CANDIDATE ROOT CAUSE (legacy notes field): "${rootCause}"\n` : ""}${prevention.trim() ? `CANDIDATE PREVENTION (legacy notes field): "${prevention}"\n` : ""}SEMANTIC SCORING RATIONALE: "${semanticRationale}"

BUGFIX SCORE BREAKDOWN:
- Reproduction Discipline: ${score.reproductionDiscipline}/100
- Codebase Navigation: ${score.codebaseNavigation}/100
- Evidence Gathering: ${score.evidenceGathering}/100
- Hypothesis Quality: ${score.hypothesisQuality}/100
- Minimal Fix Quality: ${score.minimalFixQuality}/100
- Verification Discipline: ${score.verificationDiscipline}/100
- Over-Edit Control: ${score.overEditControl}/100
- Root Cause Understanding: ${score.rootCauseUnderstanding}/100
- Regression Prevention: ${score.regressionPrevention}/100
- AI Collaboration Quality: ${score.aiCollaborationQuality}/100
`
}

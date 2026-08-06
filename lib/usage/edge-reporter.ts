/**
 * Edge-safe AI usage reporting.
 *
 * The Edge runtime cannot use the Firebase Admin SDK, so /api/feedback/stream
 * — which serves every scenario type except system design, and makes the single
 * most expensive AI call on the platform — recorded no usage at all. Two
 * consequences, both bad:
 *
 * 1. The admin dashboard under-reported spend, worst on exactly the problems
 *    users actually finish.
 * 2. Per-user budget enforcement reads those same records, so feedback
 *    generation was free as far as the budget cap was concerned.
 *
 * This reports server-to-server to a Node ingest endpoint rather than routing
 * the numbers back through the browser. The browser already calls
 * /api/feedback/persist after streaming, and adding usage to that payload would
 * have been cheaper — but budget enforcement consumes these numbers, so a
 * client that could under-report its own token counts could spend past its cap.
 *
 * Reporting is strictly best-effort: it never blocks the stream and never
 * surfaces an error to the user. A dropped usage record costs accounting
 * accuracy, and that is a far better failure than a broken feedback response.
 *
 * This does NOT move the route off Edge. See
 * docs/EDGE-TO-NODE-CONSOLIDATION.md for that separate, deferred decision.
 */

import { estimateTokensFromText } from "./token-estimate"

/** One AI call to report. */
export interface EdgeUsageReport {
  userId: string
  eventType: "feedback_generation" | "chat_message" | "hint_request"
  provider: string
  /** Prompt text, used to estimate input tokens when the provider reports none. */
  promptText?: string
  /** Response text, used to estimate output tokens when the provider reports none. */
  responseText?: string
  /** Provider-reported input tokens. Preferred over the estimate when present. */
  inputTokens?: number
  /** Provider-reported output tokens. Preferred over the estimate when present. */
  outputTokens?: number
  latencyMs?: number
  sessionId?: string
  scenarioId?: string
  pattern?: string
  difficulty?: string
  scenarioTitle?: string
}

/**
 * Absolute origin for the internal call. Edge fetch needs an absolute URL, and
 * VERCEL_URL is the deployment's own host on every Vercel environment.
 */
function internalOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/+$/, "")
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`
  return null
}

/**
 * Report one AI call. Fire-and-forget: resolves to true when the record was
 * accepted, false when it could not be sent, and never rejects.
 *
 * Callers should NOT await this on the critical path. Await it only in tests.
 */
export async function reportEdgeUsage(report: EdgeUsageReport): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  const origin = internalOrigin()

  // Unconfigured is not an error worth failing a user response over, but it
  // does mean this deployment silently under-reports, so say so once per call
  // in the logs rather than failing quietly.
  if (!secret || !origin) {
    console.warn(
      "[Edge Usage] Not reporting AI usage: " +
        (!secret ? "CRON_SECRET unset" : "no NEXT_PUBLIC_SITE_URL or VERCEL_URL")
    )
    return false
  }

  const inputTokens =
    typeof report.inputTokens === "number" && Number.isFinite(report.inputTokens)
      ? report.inputTokens
      : estimateTokensFromText(report.promptText)
  const outputTokens =
    typeof report.outputTokens === "number" && Number.isFinite(report.outputTokens)
      ? report.outputTokens
      : estimateTokensFromText(report.responseText)

  try {
    const response = await fetch(`${origin}/api/internal/usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        userId: report.userId,
        eventType: report.eventType,
        provider: report.provider,
        inputTokens,
        outputTokens,
        latencyMs: report.latencyMs,
        sessionId: report.sessionId,
        scenarioId: report.scenarioId,
        pattern: report.pattern,
        difficulty: report.difficulty,
        scenarioTitle: report.scenarioTitle,
        // Marks the record as coming from the Edge path so a reconciliation
        // can tell measured spend from estimated spend.
        estimatedTokens: report.inputTokens === undefined || report.outputTokens === undefined,
      }),
    })
    return response.ok
  } catch {
    // Never let usage accounting break a user-facing response.
    return false
  }
}

/**
 * Report without blocking. Use this on the request path.
 *
 * The promise is deliberately dropped: Edge functions stay alive for in-flight
 * fetches until the response stream closes, which is long enough for a single
 * small POST.
 */
export function reportEdgeUsageInBackground(report: EdgeUsageReport): void {
  void reportEdgeUsage(report).catch(() => {
    // reportEdgeUsage already swallows; this guards against a future throw.
  })
}

import { validateResponseRelevance } from "@/lib/ai-providers"
import { trackEnvDriftServer } from "@/lib/analytics-server"
import { logger } from "@/lib/logger"
import { matchShellCommandInstruction } from "@/lib/interview/guardrails/response-guardrails"
import type { ChatRequestContext } from "./request-context"

export function observeChatResponse(text: string, request: ChatRequestContext): void {
  const { scenarioTitle, scenarioType, sessionId, role } = request
  // Validate response relevance
  const validation = validateResponseRelevance(text, {
    title: scenarioTitle,
    type: scenarioType,
  })

  if (!validation.valid) {
    logger.warn("[Chat API] Response may have relevance issues", { issues: validation.issues })
    // Don't fail, but log for monitoring
  }

  // Log-only observer: did the model try to send the candidate to a terminal
  // that doesn't exist? Checked on the RAW response and on BOTH lanes - the
  // interviewer's shell-command guardrail regenerates downstream (leaving no
  // production-visible trace: per-attempt gate logs are info-level, dev-only)
  // and the partner lane has no gates at all. alwaysReport bypasses the
  // Sentry warn sampling: post-prompt-fix this should be rare, and a rare
  // event at a 10% sample rate reads as zero. These counts are the measure of
  // whether the environment prompt block is holding.
  const shellInstruction = matchShellCommandInstruction(text)
  if (shellInstruction) {
    logger.warn(
      "[Env Drift] AI instructed a shell command",
      { sessionId, role, snippet: shellInstruction },
      { alwaysReport: true }
    )
    // Durable counter: Vercel keeps runtime logs for about an hour and Sentry
    // is not configured, so the countable record is an analytics_events doc
    // (visible in the Firebase console filtered by event_name).
    void trackEnvDriftServer({
      sessionId,
      role: role === "interviewer" ? "interviewer" : "partner",
      snippet: shellInstruction,
    })
  }
}

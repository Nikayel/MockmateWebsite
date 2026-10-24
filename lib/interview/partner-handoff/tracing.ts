import { Client } from "langsmith"
import { traceable } from "langsmith/traceable"
import { after } from "next/server"
import { logger } from "@/lib/logger"

let client: Client | undefined
interface HandoffTraceResult {
  provider: string
  latencyMs: number
  tokensIn?: number
  tokensOut?: number
  action?: unknown
}

/** Explicit allowlist: code, prompts, emails, and transcripts never leave this boundary. */
export function handoffTraceSummary(result: HandoffTraceResult) {
  return {
    provider: result.provider,
    latency_ms: result.latencyMs,
    handoff: Boolean(result.action),
    ...(result.tokensIn !== undefined ? { input_tokens: result.tokensIn } : {}),
    ...(result.tokensOut !== undefined ? { output_tokens: result.tokensOut } : {}),
  }
}

export async function tracePartnerHandoff<T extends HandoffTraceResult>(
  run: () => Promise<T>,
  context: { sessionId?: string; phase?: string } = {}
): Promise<T> {
  const enabled = process.env.LANGSMITH_TRACING === "true" && Boolean(process.env.LANGSMITH_API_KEY)
  let operation: Promise<T> | undefined
  // If instrumentation itself fails, reuse the same operation; never spend twice.
  const invokeOnce = () => (operation ??= Promise.resolve().then(run))
  try {
    if (enabled && !client)
      client = new Client({
        apiKey: process.env.LANGSMITH_API_KEY,
        apiUrl: process.env.LANGSMITH_ENDPOINT,
        workspaceId: process.env.LANGSMITH_WORKSPACE_ID,
        hideInputs: true,
        omitTracedRuntimeInfo: true,
        timeout_ms: 1500,
        callerOptions: { maxRetries: 0 },
      })
  } catch {
    logger.warn("[LangSmith] Could not initialize handoff tracing")
    return invokeOnce()
  }
  try {
    const tracedOperation = async () => {
      try {
        return await invokeOnce()
      } catch {
        throw new Error("Interview generation failed")
      }
    }
    return await traceable(tracedOperation, {
      name: "interviewer.partner_handoff",
      run_type: "chain",
      tracingEnabled: enabled,
      client,
      project_name: process.env.LANGSMITH_PROJECT ?? "codesparring-interviews",
      metadata: {
        ...(context.sessionId ? { thread_id: context.sessionId } : {}),
        ...(context.phase ? { phase: context.phase } : {}),
      },
      processInputs: () => ({}),
      processOutputs: handoffTraceSummary,
    })()
  } catch {
    // A generation error stays a generation error; a tracing error cannot discard a reply.
    return invokeOnce()
  } finally {
    if (enabled && client) {
      const pending = client
      const flush = async () => {
        try {
          await pending.awaitPendingTraceBatches()
        } catch {
          logger.warn("[LangSmith] Could not flush handoff traces")
        }
      }
      // Vercel keeps this work alive without delaying the candidate's response.
      try {
        after(flush)
      } catch {
        await flush()
      }
    }
  }
}

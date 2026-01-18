/**
 * Chat API v2 - Multi-Agent Architecture
 *
 * This is the new interview chat endpoint using the multi-agent orchestrator.
 * It provides the same interface as /api/chat for frontend compatibility.
 *
 * Architecture:
 * - StateTrackerAgent: Extracts conversation state (cheap model)
 * - InterviewerAgent: Generates responses (smart model)
 * - ResponseValidatorAgent: Validates responses (deterministic)
 * - Orchestrator: Coordinates agents with retry loop
 *
 * Benefits:
 * - Cleaner code (single responsibility per agent)
 * - Better cost optimization (right model for each task)
 * - Easier testing and debugging
 * - Metrics per agent call
 *
 * Usage: Add ?v2=true to interview URL to test this endpoint
 */

import { NextRequest, NextResponse } from "next/server"
import { chatRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { logger } from "@/lib/logger"
import { trackAIChatServer } from "@/lib/analytics-server"
import {
  orchestrateInterviewResponse,
  type InterviewContext,
  type ChatMessage,
  type ConversationState,
} from "@/lib/agents"
import { buildInterviewContext as buildRichContext } from "@/lib/interview/context-builders"

// =============================================================================
// REQUEST/RESPONSE TYPES (same as v1 for compatibility)
// =============================================================================

interface ChatRequest {
  message: string
  context?: Array<{ type: string; message: string }>
  role: "interviewer" | "partner"
  sessionId?: string
  userId?: string
  // Interview context
  scenarioTitle?: string
  scenarioType?: string
  scenarioPattern?: string
  scenarioCompany?: string
  currentCode?: string
  starterCodeLength?: number
  // State
  testResults?: Array<{ name: string; passed: boolean; input?: string; expected?: string; actual?: string; description?: string; error?: string }>
  consoleLogs?: Array<{ type?: string; message?: string }>
  hasSubmitted?: boolean
  conversationTracker?: Partial<ConversationState>
  solutionComplexity?: { timeComplexity: string; spaceComplexity: string; isOptimal: boolean; estimated?: string; optimal?: string }
  // User context
  userContext?: {
    email?: string
    full_name?: string
    subscription_tier?: string
    sessions_used?: number
    previous_topics?: string[]
    skill_level?: string
  }
  // Edge cases
  edgeCases?: Array<{ description: string; input: unknown }>
  // Special modes
  realInterviewMode?: boolean
  hasFuzzyStatement?: boolean
  // Time tracking
  elapsedTime?: number
  timeSinceLastMessage?: number
  // AI Partner tracking
  partnerMessagesCount?: number
  lastPartnerExchange?: string
  // Nudge tracking
  recentNudgeTopics?: string[]
  userAnsweredTopics?: string[]
  // Flags
  isProactive?: boolean
  isWrapUp?: boolean
}

// Response format matches v1 for frontend compatibility
// Returns { reply, provider, latencyMs, state?, metrics? }

// =============================================================================
// INPUT VALIDATION
// =============================================================================

const MAX_MESSAGE_LENGTH = 10000
const MAX_CODE_LENGTH = 100000

function validateRequest(body: ChatRequest): { valid: boolean; error?: string } {
  // Message required (unless proactive)
  if (!body.message && !body.isProactive) {
    return { valid: false, error: "Message is required" }
  }

  // Message length
  if (body.message && body.message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` }
  }

  // Code length
  if (body.currentCode && body.currentCode.length > MAX_CODE_LENGTH) {
    return { valid: false, error: `Code exceeds ${MAX_CODE_LENGTH} characters` }
  }

  // Role validation
  if (body.role !== "interviewer" && body.role !== "partner") {
    return { valid: false, error: "Role must be 'interviewer' or 'partner'" }
  }

  return { valid: true }
}

// =============================================================================
// CONTEXT CONVERSION
// =============================================================================

function buildInterviewContextFromRequest(body: ChatRequest): InterviewContext {
  const testResults = body.testResults || []
  const testsPassed = testResults.filter(t => t.passed).length

  // Build rich context using context-builders (DRY)
  const richContext = buildRichContext({
    scenarioTitle: body.scenarioTitle,
    scenarioType: body.scenarioType,
    scenarioPattern: body.scenarioPattern,
    scenarioCompany: body.scenarioCompany,
    userInfo: body.userContext,
    currentCode: body.currentCode,
    starterCodeLength: body.starterCodeLength,
    testResults: testResults.map(t => ({
      description: t.description || t.name,
      passed: t.passed,
      input: t.input,
      expected: t.expected,
      actual: t.actual,
      error: t.error,
    })),
    consoleLogs: body.consoleLogs,
    hasSubmitted: body.hasSubmitted,
    solutionComplexity: body.solutionComplexity ? {
      estimated: body.solutionComplexity.estimated,
      optimal: body.solutionComplexity.optimal,
      isOptimal: body.solutionComplexity.isOptimal,
      timeComplexity: body.solutionComplexity.timeComplexity,
      spaceComplexity: body.solutionComplexity.spaceComplexity,
    } : undefined,
    realInterviewMode: body.realInterviewMode,
    hasFuzzyStatement: body.hasFuzzyStatement,
    edgeCases: body.edgeCases,
    elapsedTime: body.elapsedTime,
  })

  return {
    sessionId: body.sessionId || "unknown",
    problemId: body.scenarioTitle?.toLowerCase().replace(/\s+/g, "-") || "unknown",
    problemTitle: body.scenarioTitle || "Unknown Problem",
    problemDifficulty: detectDifficulty(body.scenarioPattern),
    currentCode: body.currentCode || "",
    starterCode: "", // We use starterCodeLength instead
    language: detectLanguage(body.currentCode),
    testsHaveRun: testResults.length > 0,
    testResults: testResults.map(t => ({
      name: t.name || t.description || "Test",
      passed: t.passed,
      input: t.input,
      expected: t.expected,
      actual: t.actual,
    })),
    testsPassed,
    testsTotal: testResults.length,
    optimalTimeComplexity: body.solutionComplexity?.timeComplexity,
    optimalSpaceComplexity: body.solutionComplexity?.spaceComplexity,
    isOptimalSolution: body.solutionComplexity?.isOptimal,
    hasSubmitted: body.hasSubmitted || false,
    userId: body.userId,
    // Inject rich context for InterviewerAgent to use
    promptContext: richContext,
  }
}

function buildMessages(context: ChatRequest["context"]): ChatMessage[] {
  if (!context || !Array.isArray(context)) return []

  return context.map(msg => ({
    role: msg.type === "user" ? "user" as const : "assistant" as const,
    content: msg.message,
  }))
}

function detectDifficulty(pattern?: string): "easy" | "medium" | "hard" {
  if (!pattern) return "medium"
  const easyPatterns = ["two-pointers", "hash-table", "array"]
  const hardPatterns = ["dynamic-programming", "graph", "trie", "segment-tree"]

  if (easyPatterns.some(p => pattern.toLowerCase().includes(p))) return "easy"
  if (hardPatterns.some(p => pattern.toLowerCase().includes(p))) return "hard"
  return "medium"
}

function detectLanguage(code?: string): string {
  if (!code) return "python"
  if (code.includes("def ") || code.includes("print(")) return "python"
  if (code.includes("function ") || code.includes("const ") || code.includes("let ")) return "javascript"
  if (code.includes("public class") || code.includes("public static void")) return "java"
  if (code.includes("func ") && code.includes("->")) return "swift"
  if (code.includes("fn ") && code.includes("->")) return "rust"
  return "python"
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Rate limiting
  const rateLimitResponse = await chatRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Quota enforcement
  const quotaResult = await enforceQuota(request)
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  try {
    const body: ChatRequest = await request.json()

    // Validate input
    const validation = validateRequest(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Only handle interviewer role in v2 (partner uses different logic)
    if (body.role !== "interviewer") {
      return NextResponse.json(
        { error: "chat-v2 currently only supports interviewer role. Use /api/chat for partner." },
        { status: 400 }
      )
    }

    // Build context for orchestrator (uses context-builders for rich context)
    const interviewContext = buildInterviewContextFromRequest(body)
    const messages = buildMessages(body.context)
    const lastMessage = body.message || ""

    // Log request
    logger.info("[Chat-v2] Processing request", {
      sessionId: interviewContext.sessionId,
      problemTitle: interviewContext.problemTitle,
      messageCount: messages.length,
      testsRun: interviewContext.testsHaveRun,
      hasSubmitted: interviewContext.hasSubmitted,
    })

    // Orchestrate response
    const result = await orchestrateInterviewResponse(
      interviewContext,
      messages,
      lastMessage,
      body.conversationTracker
    )

    // Handle orchestration failure
    if (!result.success || !result.data) {
      logger.error("[Chat-v2] Orchestration failed", {
        error: result.error,
        metrics: result.metrics,
      })

      return NextResponse.json(
        { error: result.error || "Failed to generate response" },
        { status: 500 }
      )
    }

    // Log success with metrics
    const totalLatency = Date.now() - startTime
    logger.info("[Chat-v2] Response generated", {
      sessionId: interviewContext.sessionId,
      totalLatencyMs: totalLatency,
      orchestratorLatencyMs: result.metrics?.totalLatencyMs,
      agentCalls: result.metrics?.agentCalls?.map(a => `${a.agent}:${a.latencyMs}ms`),
      retries: result.metrics?.retries,
      responseLength: result.data.response.length,
    })

    // Track analytics
    trackAIChatServer({
      event: "chat_v2_response",
      userId: body.userId,
      sessionId: body.sessionId,
      properties: {
        latencyMs: totalLatency,
        retries: result.metrics?.retries || 0,
        agentCalls: result.metrics?.agentCalls?.length || 0,
      },
    }).catch(() => {}) // Fire and forget

    // Return response (same format as v1 for compatibility)
    // v1 uses "reply" as the key, so we match that
    return NextResponse.json({
      reply: result.data.response,
      provider: "orchestrator-v2",
      latencyMs: result.metrics?.totalLatencyMs || (Date.now() - startTime),
      // v2-specific extras
      state: result.data.state,
      metrics: result.metrics ? {
        totalLatencyMs: result.metrics.totalLatencyMs,
        agentCalls: result.metrics.agentCalls.map(a => ({
          agent: a.agent,
          latencyMs: a.latencyMs,
        })),
        retries: result.metrics.retries,
      } : undefined,
    })

  } catch (error) {
    const latency = Date.now() - startTime
    logger.error("[Chat-v2] Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: latency,
    })

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// =============================================================================
// HEALTH CHECK (for testing)
// =============================================================================

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "v2",
    description: "Multi-agent interview orchestrator",
    agents: ["state_tracker", "interviewer", "response_validator"],
  })
}

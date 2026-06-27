import { NextRequest, NextResponse } from "next/server"
import { chatRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import {
  checkRateLimit,
  startRequestTracking,
  endRequestTracking,
  buildRateLimitResponse,
  type RateLimitTier,
} from "@/lib/rate-limiter"
import {
  generateAIResponse,
  validateResponseRelevance,
  type TaskComplexity,
} from "@/lib/ai-providers"
import { trackAIChatServer } from "@/lib/analytics-server"
import { logger } from "@/lib/logger"
import { buildInterviewerLevelContext } from "@/lib/rag/knowledge-base/interview-behavior-knowledge"
// NEW: Phase-aware interview system with deterministic phase detection
import {
  type InterviewPhase,
  type ConversationTracker,
  type PhaseDetectionContext,
  buildTrackingContext,
  getHintGuidance,
  detectInterviewPhase,
} from "@/lib/interview/interview-phases"
import {
  extractConversationState,
  shouldRunExtraction,
} from "@/lib/interview/conversation-extraction"
import { extractionService } from "@/lib/services/extraction-service"
import { phaseService } from "@/lib/services/phase-service"
import { getFlag } from "@/lib/feature-flags"
import { validateWithRetry, type ValidationContext } from "@/lib/interview/response-validation"
import {
  executeTool,
  formatToolResultsForPrompt,
  type ToolContext,
} from "@/lib/interview/interviewer-tools"
import {
  buildPreLLMInterviewerPolicy,
  formatPreLLMInterviewerPolicy,
} from "@/lib/interview/interviewer-policy"
import { buildInterviewerPrompt } from "@/lib/interview/interviewer-prompts"
import { buildFuzzyModeContext } from "@/lib/interview/fuzzy-mode-context"
import { chatRequestSchema, type UserContext } from "@/lib/interview/chat-request-schema"
import { buildRAGContext } from "@/lib/interview/chat-rag-context"
import type { ClarifyingQuestion } from "@/lib/scenarios/types"
import {
  buildBugFixContext,
  buildCompanyPromptContext,
  buildComplexityContext,
  buildConsoleContext,
  buildCurrentCodeContext,
  buildEdgeCaseContext,
  buildPatternPromptContext,
  buildProblemContext,
  buildProviderHistory,
  buildScenarioId,
  buildSystemDesignPromptContext,
  buildUserPersonalizationContext,
  buildWorkspaceContextString,
} from "@/lib/interview/chat/context-builders"
import { buildChatRequestContext } from "@/lib/interview/chat/request-context"
import { buildChatPromptFlow } from "@/lib/interview/chat/prompt-flow"

type ConversationTrackerWithExtraction = ConversationTracker & {
  lastExtractionAt?: number
}

type ConversationExtractionJob = {
  sessionId?: string
  recentMessages: Array<{ role: string; content: string }>
  currentTracker: ConversationTracker
  messageCount: number
  lastExtractionAt: number
  currentMessage: string
  optimalComplexityContext?: {
    optimalTimeComplexity: string
    optimalSpaceComplexity: string
  }
}

function runConversationExtractionAfterResponse(job: ConversationExtractionJob | null): void {
  if (!job) return

  void (async () => {
    try {
      if (getFlag("USE_EXTRACTION_SERVICE")) {
        const result = await extractionService({
          messages: job.recentMessages,
          currentTracker: job.currentTracker,
          messageCount: job.messageCount,
          lastExtractionAt: job.lastExtractionAt,
          currentMessage: job.currentMessage,
          optimalComplexity: job.optimalComplexityContext,
        })

        if (result.didRun) {
          logger.info("[Chat API] Completed post-response extraction service job", {
            sessionId: job.sessionId,
            confidence: result.confidence,
            silentNotesCount: result.tracker.silentNotes?.length || 0,
          })
        }
        return
      }

      if (!shouldRunExtraction(job.messageCount, job.lastExtractionAt, job.currentMessage)) {
        return
      }

      const extractionUpdates = await extractConversationState(
        job.recentMessages,
        job.currentTracker,
        job.optimalComplexityContext
      )

      if (Object.keys(extractionUpdates).length > 0) {
        logger.info("[Chat API] Completed post-response LLM extraction job", {
          sessionId: job.sessionId,
          extractionUpdates,
          silentNotesCount: extractionUpdates.silentNotes?.length || 0,
        })
      }
    } catch (extractionError) {
      logger.warn("[Chat API] Post-response extraction failed", {
        sessionId: job.sessionId,
        error: extractionError,
      })
    }
  })()
}

export async function POST(request: NextRequest) {
  // Apply IP-based rate limiting (first layer - prevents abuse)
  const rateLimitResponse = await chatRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Enforce quota limits (session & budget) and get user tier.
  // requireAuth: chat hits a paid LLM — signed-out callers are rejected with
  // 401 "please sign in" before any model call.
  const quotaResult = await enforceQuota(request, { requireAuth: true })
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  // Apply tier-based rate limiting (second layer - per-user limits)
  const tier = (quotaResult.tier || "free") as RateLimitTier
  const rateLimitUserId = quotaResult.userId || "anonymous"
  let trackingStarted = false

  if (rateLimitUserId !== "anonymous") {
    const tierRateCheck = await checkRateLimit(rateLimitUserId, tier, 1000) // ~1000 tokens per chat
    if (!tierRateCheck.allowed) {
      return buildRateLimitResponse(tierRateCheck)
    }
    // Track request start for concurrent limiting
    await startRequestTracking(rateLimitUserId, 1000)
    trackingStarted = true
  }

  const startTime = Date.now()

  try {
    // Parse and validate request body with Zod schema
    const rawBody = await request.json()
    const parseResult = chatRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      logger.warn("[Chat API] Invalid request body", {
        errors: parseResult.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      })
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.errors.map((e) => e.message) },
        { status: 400 }
      )
    }

    const requestContext = buildChatRequestContext(parseResult.data)
    const {
      message,
      context,
      role,
      userContext,
      workspaceContext,
      currentCode,
      isProactive,
      scenarioTitle,
      scenarioType,
      scenarioPattern,
      scenarioCompany,
      elapsedTime,
      sessionId,
      partnerMessagesCount,
      lastPartnerExchange,
      recentNudgeTopics,
      userAnsweredTopics,
      timeSinceLastMessage,
      isWrapUp,
      edgeCases,
      testResults,
      consoleLogs,
      conversationTracker,
      hasSubmitted,
      solutionComplexity,
      realInterviewMode,
      hasFuzzyStatement,
      scenarioClarifyingQuestions,
      scenarioFuzzyStatement,
      starterCodeLength,
      messageCount,
      testsHaveRun,
      currentCodeLength,
    } = requestContext

    // SECURITY: attribute cost/usage to the VERIFIED user (from the auth token
    // via enforceQuota), never the client-supplied body field — passing a body
    // userId would let a caller spoof another user's identity and drain their
    // budget. requireAuth guarantees rateLimitUserId is a real uid here.
    const userId = rateLimitUserId

    // For proactive messages (interviewer jumping in), message might be empty
    if (!message && !isProactive) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Note: Size validation is now handled by Zod schema (message: 10KB, currentCode: 100KB)

    // LLM-based conversation extraction is prepared here but runs after the
    // response is generated so chat latency does not wait on a secondary LLM call.
    const enhancedTracker = conversationTracker as unknown as ConversationTracker | undefined
    const ENABLE_LLM_EXTRACTION = true
    const extractionJob: ConversationExtractionJob | null =
      ENABLE_LLM_EXTRACTION && role === "interviewer" && conversationTracker && context && message
        ? {
            sessionId,
            recentMessages: (context as Array<{ type: string; message: string }>)
              .slice(-10)
              .map((m) => ({
                role: m.type === "user" ? "candidate" : "interviewer",
                content: m.message,
              })),
            currentTracker: conversationTracker as unknown as ConversationTracker,
            messageCount: Array.isArray(context) ? context.length : 0,
            lastExtractionAt:
              (conversationTracker as unknown as ConversationTrackerWithExtraction)
                .lastExtractionAt || 0,
            currentMessage: message,
            optimalComplexityContext: solutionComplexity
              ? {
                  optimalTimeComplexity: solutionComplexity.optimal || "O(n)",
                  optimalSpaceComplexity: solutionComplexity.optimalSpace || "O(n)",
                }
              : undefined,
          }
        : null

    if (extractionJob) {
      if (getFlag("USE_EXTRACTION_SERVICE")) {
        logger.debug("[Chat API] Deferred extraction service until after response", { sessionId })
      } else if (
        shouldRunExtraction(
          extractionJob.messageCount,
          extractionJob.lastExtractionAt,
          extractionJob.currentMessage
        )
      ) {
        logger.debug("[Chat API] Deferred LLM extraction until after response", { sessionId })
      }
    }

    const userInfo = userContext as UserContext
    const { userContextString, candidateLevel } = buildUserPersonalizationContext(userInfo)

    // Build level-specific interviewer context
    // This adapts questions and expectations based on candidate's experience level
    const levelContext = buildInterviewerLevelContext(candidateLevel)

    // Manage workspace context with sliding window
    const workspaceContextStr = buildWorkspaceContextString(workspaceContext)

    // Add current code context (truncate if too long)
    const currentCodeContext = buildCurrentCodeContext(currentCode)

    // Define system prompts based on role with enhanced context awareness
    const problemContext = buildProblemContext(scenarioTitle, scenarioType)

    // Get company-specific interview style
    const { companyStyle, companyContext, isGenericCompany } =
      buildCompanyPromptContext(scenarioCompany)

    // Get pattern-specific metadata for DSA problems
    const { patternMeta, patternContext } = buildPatternPromptContext(scenarioPattern)

    // Build edge case context for interviewer to ask about specific scenarios
    const edgeCaseContext = buildEdgeCaseContext(edgeCases)

    // Build console/test results context for interviewer awareness
    // TestResultItem and ConsoleLogItem interfaces defined at module level
    const testResultsArray = testResults
    const consoleLogsArray = consoleLogs

    const consoleContext = buildConsoleContext(testResultsArray, consoleLogsArray)

    // Build system design specific context with phase-based guidance
    const { isSystemDesign, elapsedMinutes, systemDesignContext } = buildSystemDesignPromptContext(
      scenarioType,
      elapsedTime
    )

    // Build bug fix specific context
    const { isBugFix, bugFixContext } = buildBugFixContext(scenarioType)

    // Build phase-specific context using DETERMINISTIC signals
    // No longer relies on frontend-passed interviewPhase - we compute it here
    const testsHaveRunNow = testsHaveRun
    const currentCodeLen = currentCodeLength
    const starterLen = starterCodeLength

    const phaseContext: PhaseDetectionContext = {
      hasSubmitted: hasSubmitted || false,
      testsHaveRun: testsHaveRunNow || false,
      currentCodeLength: currentCodeLen,
      starterCodeLength: starterLen,
      approachExplained:
        enhancedTracker?.approachExplained ||
        (conversationTracker as unknown as ConversationTracker)?.approachExplained,
      messageCount,
    }

    // Feature flag: Use phase service or direct call
    let currentPhase: InterviewPhase
    if (getFlag("USE_PHASE_SERVICE")) {
      const phaseResult = phaseService({
        hasSubmitted: hasSubmitted || false,
        testsHaveRun: testsHaveRunNow || false,
        currentCodeLength: currentCodeLen,
        starterCodeLength: starterLen,
        approachExplained:
          enhancedTracker?.approachExplained ||
          (conversationTracker as unknown as ConversationTracker)?.approachExplained ||
          false,
        messageCount,
      })
      currentPhase = phaseResult.phase
      logger.debug("[Chat API] Phase detected via service", {
        phase: currentPhase,
        codeWritten: phaseResult.metadata.codeWritten,
      })
    } else {
      // Original code path
      currentPhase = detectInterviewPhase(phaseContext)
    }

    // Debug logging for phase detection
    logger.info("[Chat API] Phase detection", {
      currentPhase,
      messageCount,
      approachExplained: phaseContext.approachExplained,
    })

    // Build conversation tracking context if available
    // Use enhanced tracker (with LLM extraction) if available
    let trackingContext = ""
    if (enhancedTracker || conversationTracker) {
      trackingContext = buildTrackingContext(
        (enhancedTracker || conversationTracker) as ConversationTracker
      )
    }

    // Build hint guidance if hints have been given
    const hintsGiven =
      (enhancedTracker || (conversationTracker as unknown as ConversationTracker))?.hintsGiven || 0
    const hintGuidance = hintsGiven > 0 ? getHintGuidance(hintsGiven) : ""

    const tracker = (enhancedTracker || conversationTracker) as ConversationTracker | undefined

    const preLLMPolicy = buildPreLLMInterviewerPolicy({
      phase: currentPhase,
      tracker,
      hasSubmitted: hasSubmitted || false,
      testsHaveRun: testsHaveRunNow || false,
      testsPassed: testResultsArray?.filter((t) => t.passed === true).length || 0,
      testsTotal: testResultsArray?.length || 0,
    })
    const enforcedChecklist = formatPreLLMInterviewerPolicy(preLLMPolicy)
    const testingPhaseOverride = ""

    // Build complexity context - tells interviewer if solution is optimal
    const complexityContext = buildComplexityContext(solutionComplexity)

    // =================================================================
    // TOOL EXECUTION: Pre-execute tools to give AI structured state
    // This ensures the AI always has accurate state information
    // =================================================================
    let toolResultsContext = ""
    if (role === "interviewer") {
      const toolContext: ToolContext = {
        tracker: (enhancedTracker || conversationTracker) as ConversationTracker | undefined,
        phase: currentPhase,
        isOptimalSolution: solutionComplexity?.isOptimal || false,
        testsHaveRun: testsHaveRunNow || false,
        testsPassed: testResultsArray?.filter((t) => t.passed === true).length || 0,
        testsTotal: testResultsArray?.length || 0,
      }

      // Execute relevant tools based on phase
      const toolCalls: Array<{ name: string; result: ReturnType<typeof executeTool> }> = []

      // Always check prerequisites in discussion/coding phases
      if (currentPhase === "discussion" || currentPhase === "coding") {
        toolCalls.push({
          name: "check_prerequisites",
          result: executeTool("check_prerequisites", {}, toolContext),
        })
        toolCalls.push({
          name: "get_next_required_topic",
          result: executeTool("get_next_required_topic", {}, toolContext),
        })
      }

      // Check what's already discussed in testing phase
      if (currentPhase === "testing") {
        toolCalls.push({
          name: "check_already_discussed:complexity",
          result: executeTool("check_already_discussed", { topic: "complexity" }, toolContext),
        })
        toolCalls.push({
          name: "check_already_discussed:edge_cases",
          result: executeTool("check_already_discussed", { topic: "edge_cases" }, toolContext),
        })
      }

      // Always include phase info
      toolCalls.push({
        name: "get_interview_phase",
        result: executeTool("get_interview_phase", {}, toolContext),
      })

      // Analyze user's message if it seems vague
      if (message && message.length < 80) {
        toolCalls.push({
          name: "analyze_user_response",
          result: executeTool("analyze_user_response", { user_message: message }, toolContext),
        })
      }

      // Format tool results for injection into prompt
      toolResultsContext = formatToolResultsForPrompt(toolCalls)
    }

    // Few-shot examples are now included in buildInterviewerPrompt()

    // Build Real Interview Mode context (fuzzy problem statements)
    // DRY: Use helper that derives context from scenario clarifying questions
    const fuzzyModeContext =
      realInterviewMode && hasFuzzyStatement
        ? buildFuzzyModeContext(
            Array.isArray(scenarioClarifyingQuestions)
              ? (scenarioClarifyingQuestions as ClarifyingQuestion[])
              : undefined,
            scenarioFuzzyStatement
          )
        : ""

    // Build interviewer prompt using consolidated function
    const interviewerPrompt =
      role === "interviewer"
        ? buildInterviewerPrompt({
            phase: currentPhase,
            problemTitle: scenarioTitle || "",
            problemDifficulty: scenarioPattern || patternMeta?.name || "medium",
            userLevel: candidateLevel,
            companyContext,
            userContextString,
            problemContext,
            levelContext,
            scenarioContext: isSystemDesign
              ? systemDesignContext
              : isBugFix
                ? bugFixContext
                : patternContext,
            edgeCaseContext,
            consoleContext,
            trackingContext,
            hintGuidance,
            complexityContext,
            enforcedChecklist,
            testingPhaseOverride,
            fuzzyModeContext,
            toolResultsContext,
            isGenericCompany,
            companyName: companyStyle.company,
          })
        : ""

    const systemPrompts = {
      interviewer: interviewerPrompt,

      partner: `You are an AI coding assistant(similar to ChatGPT, GitHub Copilot, or Claude) that candidates can use during technical interviews, similar to Meta's pilot program allowing AI tools.

${userContextString}${problemContext}

Your role:
    - You're an AI tool available to help during the interview (like Meta's pilot program)
    - Act as a collaborative partner, not an autonomous agent - respond to user requests, don't act independently
      - Provide brief, concise assistance when asked
        - Help debug code issues with short, actionable suggestions
          - Suggest optimizations in bullet points or brief notes
            - Answer questions about algorithms and data structures with summarized explanations
              - Reference their codebase when relevant
        - Be helpful but not overly verbose

${
  isBugFix
    ? `BUGFIX PARTNER RULES:
- Suggest the next file, visible test, doc, or log to inspect before suggesting a code change.
- Explain failing output and help the candidate validate their hypothesis.
- Give nudges before solutions; do not reveal the exact patch unless the candidate explicitly asks after showing investigation evidence.
- Ask what evidence supports their hypothesis and what regression test would prevent this.
- If they ask for the full fix too early, redirect to a smaller inspection step.`
    : ""
}

HOW TO HELP(Collaborative Partner Approach):
    - Give hints and suggestions, not full solutions(unless they're really stuck after multiple attempts)
      - Ask guiding questions: "What if you tried...?" "Have you considered...?"
    - Explain concepts briefly when asked
    - Point out patterns and best practices
    - Help them understand WHY something works, not just WHAT to do
      - Wait for user requests - don't proactively suggest unless they ask
        - Be a tool they use, not an agent that acts for them

${
  scenarioTitle
    ? `- Focus on helping with ${scenarioTitle}`
    : "- Focus on helping with the current problem"
}
- Remember their progress and build on previous conversations

  IMPORTANT:
  - When referencing the user, use their first name or last name only(e.g., "John" or "Smith"), never their full name.
- Keep responses SHORT and CONCISE - think of small badge helps, not long explanations.Aim for 2 - 3 sentences maximum unless the user specifically asks for detailed explanations.
- Use bullet points or brief notes when possible instead of paragraphs.
- The interviewer(Sable) will evaluate how effectively the candidate uses your assistance
    - Good AI collaboration means: asking the right questions, understanding the suggestions, and implementing them correctly
      - You have full access to the user's codebase and current solution code. Use this to:
        - Understand their coding style and provide consistent suggestions
          - Reference patterns from their codebase
            - Help debug specific issues in their current code
              - Provide context - aware hints that match their codebase structure
                - Remember: You're a collaborative partner tool, not an autonomous agent. Respond to requests, don't act independently.

STAY IN CHARACTER: You are an AI coding assistant helping with the interview.Stay focused on the coding problem at hand.Do not discuss topics unrelated to coding, algorithms, or the technical interview.

Keep responses brief, actionable, and helpful.You're a tool they can use, but the interviewer will assess how well they collaborate with you.`,
    }

    let systemPrompt = systemPrompts[role as keyof typeof systemPrompts] || systemPrompts.partner

    // Derive scenarioId from title for complexity lookup (e.g., "Two Sum" -> "dsa-two-sum")
    const scenarioId = buildScenarioId(scenarioTitle)

    // Enhance both interviewer and partner roles with RAG context
    // Now includes DYNAMIC context based on the user's current message
    // OPTIMIZATION: Static parts are cached per-session for cost savings
    const ragContext = await buildRAGContext({
      scenarioTitle,
      scenarioPattern,
      scenarioCompany: scenarioCompany ?? undefined,
      scenarioType,
      scenarioId,
      problemText: scenarioTitle, // Use title as problem text
      userCode: currentCode,
      userId,
      sessionId, // For session-level caching of static context
      userMessage: message, // Pass user message for dynamic context
      testResults: testResults
        ? {
            passed: testResults.filter((t) => t.passed).length,
            total: testResults.length,
            failingTests: testResults
              .filter((t) => !t.passed)
              .map((t) => t.description || "Unknown test"),
          }
        : undefined,
    })

    if (ragContext) {
      if (role === "interviewer") {
        // For interviewer, add RAG context to help ask better questions
        systemPrompt =
          systemPrompt +
          "\n\n" +
          ragContext +
          `

USE THIS KNOWLEDGE TO:
- Ask more targeted questions based on the pattern
- Challenge them on common pitfalls for this problem type
- Guide them towards optimal solutions
- Recognize when they're on the right track

ANTI-HALLUCINATION RULES:
- ONLY reference techniques, patterns, and complexity info from the RAG context above
- If you're unsure about a specific fact (e.g., exact complexity), say "typically" or ask the candidate
- Do NOT invent specific company interview questions or statistics not in the context
- When discussing complexity, stick to what's documented in the pattern knowledge`
      } else {
        // For partner (AI assistant), add RAG with stricter grounding
        systemPrompt =
          systemPrompt +
          "\n\n" +
          ragContext +
          `

GROUNDING RULES (prevent hallucination):
- Base your hints and suggestions ONLY on the retrieved knowledge above
- If the RAG context doesn't cover something, acknowledge uncertainty
- Do NOT make up specific algorithms or data structures not mentioned
- Say "I'm not certain, but..." when going beyond the retrieved context
- Prefer asking clarifying questions over guessing solutions`
      }
    }

    // Convert to provider-agnostic format
    const history = buildProviderHistory(context)

    const promptFlow = buildChatPromptFlow({
      role,
      message,
      context,
      isProactive,
      isWrapUp,
      currentCode,
      currentCodeContext,
      workspaceContextStr,
      timeSinceLastMessage,
      scenarioPattern,
      partnerMessagesCount,
      lastPartnerExchange,
      recentNudgeTopics,
      userAnsweredTopics,
      testResults,
      elapsedMinutes,
    })

    if (promptFlow.earlyResponse) {
      return NextResponse.json(promptFlow.earlyResponse)
    }

    const fullUserMessage = promptFlow.fullUserMessage

    // Determine task complexity for provider selection
    const complexity: TaskComplexity = role == "interviewer" ? "dialogue" : "code"

    // DEBUG: Log prompt sizes to identify latency source
    const historyChars = history.reduce((sum, h) => sum + h.content.length, 0)
    logger.info("[Chat API] Prompt size debug", {
      systemPromptChars: systemPrompt.length,
      userMessageChars: fullUserMessage.length,
      historyMessages: history.length,
      historyChars,
      totalEstimatedChars: systemPrompt.length + fullUserMessage.length + historyChars,
      estimatedTokens: Math.ceil((systemPrompt.length + fullUserMessage.length + historyChars) / 4),
    })

    // Use AI provider abstraction with fallback
    // Pass userId/sessionId for proper cost tracking
    const aiResponse = await generateAIResponse(systemPrompt, fullUserMessage, history, {
      complexity,
      userId,
      sessionId,
      eventType: "chat_message",
    })

    // Validate response relevance
    const validation = validateResponseRelevance(aiResponse.text, {
      title: scenarioTitle,
      type: scenarioType,
    })

    if (!validation.valid) {
      logger.warn("[Chat API] Response may have relevance issues", { issues: validation.issues })
      // Don't fail, but log for monitoring
    }

    // HARD GATES: Deterministic validation with retry loop
    // This catches rule violations that prompt engineering alone can't prevent
    // Gates are deterministic (not AI) - they always catch specific patterns
    if (role === "interviewer") {
      const activeTracker = (enhancedTracker || conversationTracker) as
        | ConversationTracker
        | undefined

      const validationContext: ValidationContext = {
        response: aiResponse.text,
        phase: currentPhase,
        tracker: activeTracker,
        hasSubmitted: hasSubmitted || false,
        lastUserMessage: message,
        isOptimalSolution: solutionComplexity?.isOptimal || false,
      }

      // DEBUG: Log validation context
      logger.info("[Hard Gates] Validation context", {
        sessionId,
        phase: currentPhase,
        responsePreview: aiResponse.text.substring(0, 100),
      })

      // Regeneration function for the retry loop
      const regenerate = async (hint: string): Promise<string> => {
        // Build a forceful correction prompt that REPLACES the original prompt
        const correctedPrompt = `${systemPrompt}

⚠️⚠️⚠️ CRITICAL VIOLATION - YOU MUST FIX THIS ⚠️⚠️⚠️

Your previous response violated interview rules and was REJECTED.

VIOLATION: ${hint}

YOU MUST generate a DIFFERENT response that follows the rules.

${
  currentPhase === "clarification"
    ? `
CLARIFICATION PHASE RULES:
- Do NOT ask about their approach, thinking, or plan
- Do NOT say "before you start coding" or "walk me through"
- ONLY say something like: "Take your time reading. Any questions about the problem?"
- Keep it SHORT (1-2 sentences max)
`
    : ""
}

Generate a compliant response NOW:`

        const regeneratedResponse = await generateAIResponse(
          correctedPrompt,
          fullUserMessage,
          history,
          {
            complexity,
            userId,
            sessionId,
            eventType: "chat_message",
            skipCache: true, // Must skip cache for regeneration - cache key only uses first 500 chars of system prompt
          }
        )

        // COST TRACKING: Log retry for cost monitoring
        // Each retry is a full AI call that adds to costs
        logger.warn("[Chat API] Response regenerated due to violation (adds to cost)", {
          sessionId,
          userId,
          retryReason: hint.substring(0, 100),
          provider: regeneratedResponse.provider,
          tokensUsed: regeneratedResponse.tokensUsed,
        })

        return regeneratedResponse.text
      }

      // Run validation with up to 2 retries for critical violations
      const gateResult = await validateWithRetry(
        validationContext,
        regenerate,
        async (system, user) => {
          const result = await generateAIResponse(system, user, [], {
            complexity: "simple",
            userId,
            sessionId,
            eventType: "chat_message",
          })
          return { text: result.text }
        },
        2
      )

      // Update response if regenerated
      if (gateResult.retries > 0) {
        aiResponse.text = gateResult.response
        logger.info("[Hard Gates] Response regenerated", {
          sessionId,
          retries: gateResult.retries,
          remainingViolations: gateResult.violations.map((v) => v.rule),
        })
      }

      // Log any remaining violations (warnings that didn't trigger regeneration)
      if (gateResult.violations.length > 0) {
        logger.warn("[Hard Gates] Violations in final response", {
          sessionId,
          violations: gateResult.violations.map((v) => ({
            rule: v.rule,
            severity: v.severity,
          })),
        })
      }
    }

    const responseTimeMs = Date.now() - startTime

    // Track AI chat interaction with provider info
    if (sessionId) {
      trackAIChatServer({
        sessionId,
        userId,
        interactionType: role === "interviewer" ? "interviewer" : "partner",
        messageLength: message?.length || 0,
        responseTimeMs,
        provider: aiResponse.provider, // Track which provider was used
      }).catch((err) => {
        // COST TRACKING: Log with high severity - costs won't be recorded if this fails
        logger.error("CRITICAL: Analytics tracking failed - usage costs may not be recorded", {
          error: err,
          sessionId,
          userId,
          provider: aiResponse.provider,
          // Include enough info to manually reconcile costs if needed
          tokensUsed: aiResponse.tokensUsed,
          latencyMs: aiResponse.latencyMs,
        })
      })
    }

    runConversationExtractionAfterResponse(extractionJob)

    return NextResponse.json({
      reply: aiResponse.text,
      provider: aiResponse.provider, // Include provider for debugging
      latencyMs: aiResponse.latencyMs,
      // DEBUG: Include phase info to verify detection
      _debug: {
        phase: currentPhase,
        messageCount,
        approachExplained: phaseContext.approachExplained,
        currentCodeLength: currentCodeLen,
        starterCodeLength: starterLen,
        codeWritten: currentCodeLen - starterLen,
      },
    })
  } catch (error: unknown) {
    logger.error("Chat API error", {
      error,
      message: error instanceof Error ? error.message : undefined,
      status:
        typeof error === "object" && error !== null && "status" in error ? error.status : undefined,
      endpoint: "/api/chat",
    })
    // Return generic error message to avoid leaking internal details
    return NextResponse.json(
      {
        error: "Failed to process chat message. Please try again.",
      },
      { status: 500 }
    )
  } finally {
    if (trackingStarted) {
      await endRequestTracking(rateLimitUserId).catch(() => {})
    }
  }
}

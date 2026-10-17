import { resolveChatInterviewState } from "@/lib/interview/chat/interview-state"
import { buildChatToolContext } from "@/lib/interview/chat/tool-context"
import { generateValidatedChatResponse } from "@/lib/interview/chat/generate-response"
import { prepareConversationExtraction } from "@/lib/interview/chat/extraction-job"
import { runConversationExtractionAfterResponse } from "@/lib/interview/chat/conversation-extraction"
import { trackChatCompletion } from "@/lib/interview/chat/completion-telemetry"
import {
  buildSessionBaselinePrompt,
  buildSessionEvidencePrompt,
} from "@/lib/interview/session-context/prompts"
import { timelineProviderHistory } from "@/lib/interview/session-context/conversation"
import type { PromptContext } from "@/lib/interview/interviewer-prompts"
import { claimProactiveNudge } from "@/lib/interview/session-lifecycle/server"
import { NextRequest, NextResponse } from "next/server"
import { enforceMeteredAiRequest } from "@/lib/ai/metered-request"
import { logger } from "@/lib/logger"
import { buildInterviewerLevelContext } from "@/lib/rag/knowledge-base/interview-behavior-knowledge"
// NEW: Phase-aware interview system with deterministic phase detection
import {
  type ConversationTracker,
  buildTrackingContext,
  getHintGuidance,
} from "@/lib/interview/interview-phases"
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
  buildEnvironmentContext,
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
import { getInterviewerTurns } from "@/lib/interview/conversation-pacing"
import { buildProactiveSkipResponse } from "@/lib/interview/chat/response-flow"
import { createValidatedChatStream } from "@/lib/interview/chat/validated-response-stream"

export async function POST(request: NextRequest) {
  // Authenticate and charge this submitted action once; provider calls meter their own work.
  const metered = await enforceMeteredAiRequest(request, {
    policy: "chat",
  })
  if (metered.response) {
    return metered.response
  }
  const { userId: rateLimitUserId } = metered

  const startTime = Date.now()

  try {
    // Parse and validate request body with Zod schema
    const rawBody = await request.json()
    if (new TextEncoder().encode(JSON.stringify(rawBody)).byteLength > 1_000_000) {
      return NextResponse.json(
        {
          error:
            "This session context is too large to send safely. Your saved history is preserved.",
        },
        { status: 413 }
      )
    }
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
      sessionContext,
      message,
      responseMode,
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
    const interviewerTurns = getInterviewerTurns(sessionContext, context)
    const proactiveSkip = buildProactiveSkipResponse({
      role,
      isProactive,
      context: interviewerTurns,
      timeSinceLastMessage,
    })
    if (proactiveSkip) return NextResponse.json(proactiveSkip)
    if (isProactive) {
      const claimed =
        sessionId && (await claimProactiveNudge(sessionId, userId, parseResult.data.ownerId))
      if (!claimed)
        return NextResponse.json({
          reply: null,
          skipped: true,
          reason: "Session is paused or check-in budget is exhausted",
        })
    }

    // For proactive messages (interviewer jumping in), message might be empty
    if (!message && !isProactive) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Note: Size validation is now handled by Zod schema (message: 10KB, currentCode: 100KB)

    // LLM-based conversation extraction is prepared here but runs after the
    // response is generated so chat latency does not wait on a secondary LLM call.
    const enhancedTracker = conversationTracker as unknown as ConversationTracker | undefined
    const extractionJob = prepareConversationExtraction(requestContext, userId)

    const userInfo = userContext as UserContext
    const { userContextString, candidateLevel } = buildUserPersonalizationContext(userInfo)

    // Build level-specific interviewer context
    // This adapts questions and expectations based on candidate's experience level
    const levelContext =
      scenarioType === "bugfix" || scenarioType === "system-design"
        ? `CANDIDATE EXPERIENCE: ${candidateLevel}. Calibrate the depth of relevant investigation or design questions to this experience. Accept informal explanations; do not turn level expectations into a mandatory question checklist. Do not import algorithm optimization requirements into this round.`
        : buildInterviewerLevelContext(candidateLevel)

    // Manage workspace context with sliding window
    const workspaceContextStr = sessionContext ? "" : buildWorkspaceContextString(workspaceContext)

    // Add current code context (truncate if too long)
    const currentCodeContext = sessionContext ? "" : buildCurrentCodeContext(currentCode)

    // Define system prompts based on role with enhanced context awareness
    const problemContext = buildProblemContext(scenarioTitle, scenarioType)

    // Get company-specific interview style
    const { companyStyle, companyContext, isGenericCompany } =
      buildCompanyPromptContext(scenarioCompany)

    // Get pattern-specific metadata for DSA problems
    const { patternMeta, patternContext } = buildPatternPromptContext(scenarioPattern)

    // Build console/test results context for interviewer awareness
    // TestResultItem and ConsoleLogItem interfaces defined at module level
    const interviewState = resolveChatInterviewState(requestContext)
    const {
      currentPhase,
      phaseContext,
      tracker,
      testsHaveRunNow,
      testResultsArray,
      currentCodeLen,
      starterLen,
    } = interviewState
    const consoleLogsArray = consoleLogs

    const consoleContext = buildConsoleContext(
      testResults,
      consoleLogsArray,
      scenarioType,
      !sessionContext || sessionContext.testsMatchCurrentRevision
    )

    // How the candidate runs code (Run Tests / Submit buttons; no terminal exists).
    // Goes to BOTH roles: the debugging partner was the one telling candidates to
    // type "python3 src/main.py fixtures/input.txt" into a shell that isn't there.
    const environmentContext = buildEnvironmentContext(scenarioType)

    // Build system design specific context with phase-based guidance
    const { isSystemDesign, elapsedMinutes, systemDesignContext } = buildSystemDesignPromptContext(
      scenarioType,
      elapsedTime
    )

    // Build bug fix specific context (incl. guided-lab milestone / AI-restraint state,
    // and stdout-oracle pack state-machine scoping when present).
    const { isBugFix, bugFixContext } = buildBugFixContext(
      scenarioType,
      parseResult.data.guidedLab,
      parseResult.data.pack
    )

    // Evaluation cases are useful once the candidate is discussing an approach,
    // but exposing them while they are still clarifying turns grounding into an
    // answer key. The builder owns that phase boundary.
    const edgeCaseContext =
      isBugFix || isSystemDesign ? "" : buildEdgeCaseContext(edgeCases, currentPhase)

    // Build conversation tracking context if available
    // Use enhanced tracker (with LLM extraction) if available
    let trackingContext = ""
    if (!isBugFix && !isSystemDesign && (enhancedTracker || conversationTracker)) {
      trackingContext = buildTrackingContext(
        (enhancedTracker || conversationTracker) as ConversationTracker
      )
    }

    // Build hint guidance if hints have been given
    const hintsGiven =
      (enhancedTracker || (conversationTracker as unknown as ConversationTracker))?.hintsGiven || 0
    const hintGuidance =
      hintsGiven > 0 && !isBugFix && !isSystemDesign ? getHintGuidance(hintsGiven) : ""

    const preLLMPolicy = buildPreLLMInterviewerPolicy({
      scenarioType,
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
    const complexityContext =
      isBugFix || isSystemDesign ? "" : buildComplexityContext(solutionComplexity)

    const toolResultsContext = buildChatToolContext(requestContext, interviewState)

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
    const interviewerPromptContext: PromptContext = {
      scenarioType,
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
      environmentContext,
      isGenericCompany,
      companyName: companyStyle.company,
    }
    const interviewerPrompt =
      role === "interviewer"
        ? buildInterviewerPrompt(interviewerPromptContext, sessionContext ? "stable" : "all")
        : ""
    const interviewerTurnGuidance =
      role === "interviewer" && sessionContext
        ? buildInterviewerPrompt(interviewerPromptContext, "turn")
        : ""

    const systemPrompts = {
      interviewer: interviewerPrompt,

      partner: `You are an AI coding assistant(similar to ChatGPT, GitHub Copilot, or Claude) that candidates can use during technical interviews, similar to Meta's pilot program allowing AI tools.

${userContextString}${problemContext}

${environmentContext}

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

    const stableSystemPrompt = systemPrompt
    let ragTurnContext = ""

    // Derive scenarioId from title for complexity lookup (e.g., "Two Sum" -> "dsa-two-sum")
    const scenarioId = sessionContext?.task.id ?? buildScenarioId(scenarioTitle)

    // This retrieval path indexes DSA patterns/complexity, not incident or design
    // contracts. Non-DSA rounds are grounded in their public task and workspace.
    const ragContext =
      isBugFix || isSystemDesign
        ? ""
        : await buildRAGContext({
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
- Guide them towards optimal solutions when their current approach is genuinely suboptimal
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
    if (sessionContext) {
      ragTurnContext = systemPrompt.slice(stableSystemPrompt.length)
      systemPrompt = stableSystemPrompt + buildSessionBaselinePrompt(sessionContext)
    }
    const history = sessionContext
      ? timelineProviderHistory(sessionContext.timeline)
      : buildProviderHistory(context)

    const promptFlow = buildChatPromptFlow({
      sessionEvidence: sessionContext
        ? interviewerTurnGuidance + ragTurnContext + buildSessionEvidencePrompt(sessionContext)
        : undefined,
      role,
      message,
      context: role === "interviewer" ? interviewerTurns : context,
      scenarioType,
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

    const aiResponse = await generateValidatedChatResponse({
      request: requestContext,
      userId,
      systemPrompt,
      fullUserMessage,
      history,
      currentPhase,
      signal: request.signal,
    })

    trackChatCompletion(requestContext, userId, aiResponse, Date.now() - startTime)

    if (!request.signal?.aborted) runConversationExtractionAfterResponse(extractionJob)

    const finalizedResponse = {
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
    }

    return responseMode === "validated-stream" && role === "interviewer"
      ? createValidatedChatStream(finalizedResponse)
      : NextResponse.json(finalizedResponse)
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
  }
}

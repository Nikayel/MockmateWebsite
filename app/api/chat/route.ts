import { NextRequest, NextResponse } from "next/server"
import { chatRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import {
  generateAIResponse,
  validateResponseRelevance,
  type TaskComplexity,
} from "@/lib/ai-providers"
import { trackAIChatServer } from "@/lib/analytics-server"
import { getCompanyStyle, getPatternMetadata, type DSAPattern } from "@/lib/types/dsa-patterns"
import { logger } from "@/lib/logger"
import {
  buildHintContext,
  buildFeedbackContext,
  buildComplexityContext,
} from "@/lib/rag/context-builder"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import { getCompanyInterviewKnowledge } from "@/lib/rag/knowledge-base/company-knowledge"
import {
  buildInterviewerLevelContext,
  type InterviewLevel,
} from "@/lib/rag/knowledge-base/interview-behavior-knowledge"
import type { CompanyId } from "@/lib/data/company-questions/types"
import {
  getDynamicChatContext,
  formatDynamicContextForPrompt,
  shouldRetrieveDynamicContext,
} from "@/lib/rag/dynamic-chat-context"
// NEW: Phase-aware interview system with deterministic phase detection
import {
  type InterviewPhase,
  type ConversationTracker,
  type PhaseDetectionContext,
  buildTrackingContext,
  getHintGuidance,
  createEmptyTracker,
  updateTrackerFromMessage,
  detectInterviewPhase,
} from "@/lib/interview/interview-phases"
import {
  extractConversationState,
  shouldRunExtraction,
} from "@/lib/interview/conversation-extraction"
import { extractionService } from "@/lib/services/extraction-service"
import { phaseService } from "@/lib/services/phase-service"
import { getFlag, logShadowComparison } from "@/lib/feature-flags"
import { buildCompanyInterviewerPrompt } from "@/lib/interview/company-interviewer-styles"
import {
  validateWithRetry,
  validateSemanticRules,
  type ValidationContext,
  type SemanticValidationResult,
} from "@/lib/interview/response-validation"
import {
  executeTool,
  formatToolResultsForPrompt,
  type ToolContext,
} from "@/lib/interview/interviewer-tools"
import {
  buildInterviewerPrompt,
  PHASE_PROMPTS,
  FEW_SHOT_EXAMPLES,
  QUICK_INJECTIONS,
} from "@/lib/interview/interviewer-prompts"
import { truncateText, truncateFileContent } from "@/lib/utils"

interface UserContext {
  email?: string
  full_name?: string
  subscription_tier?: string
  sessions_used?: number
  previous_topics?: string[]
  skill_level?: string
}

// Context window management constants
// Full context: Modern LLMs have large context windows (Gemini 1M, Claude 200K, DeepSeek 64K)
// Most interviews have 30-60 messages, so 200 gives full history with safety cap
const MAX_HISTORY_MESSAGES = 200 // Full interview context (was 20)
const MAX_MESSAGE_LENGTH = 4000 // Truncate individual messages
const MAX_WORKSPACE_FILES = 5 // Limit workspace files
const MAX_FILE_SIZE = 10000 // 10KB per file max

/**
 * Sliding window for conversation history
 * Keeps most recent messages, summarizes old ones if needed
 */
function manageContextWindow(
  context: Array<{ type: string; message: string }>,
  maxMessages: number = MAX_HISTORY_MESSAGES
): Array<{ type: string; message: string }> {
  if (!context || !Array.isArray(context)) return []

  // If within limits, return as-is
  if (context.length <= maxMessages) {
    return context.map((msg) => ({
      ...msg,
      message: truncateText(msg.message, MAX_MESSAGE_LENGTH),
    }))
  }

  // Keep first message (usually greeting) and last N-1 messages
  const firstMessage = context[0]
  const recentMessages = context.slice(-(maxMessages - 1))

  // Create summary of dropped messages
  const droppedCount = context.length - maxMessages
  const summaryMessage = {
    type: "model",
    message: `[Previous ${droppedCount} messages summarized for context management]`,
  }

  return [
    {
      ...firstMessage,
      message: truncateText(firstMessage.message, MAX_MESSAGE_LENGTH),
    },
    summaryMessage,
    ...recentMessages.map((msg) => ({
      ...msg,
      message: truncateText(msg.message, MAX_MESSAGE_LENGTH),
    })),
  ]
}

/**
 * Manage workspace context size
 */
function manageWorkspaceContext(
  workspaceContext: Array<{ path: string; content: string }>,
  maxFiles: number = MAX_WORKSPACE_FILES,
  maxFileSize: number = MAX_FILE_SIZE
): Array<{ path: string; content: string }> {
  if (!workspaceContext || !Array.isArray(workspaceContext)) return []

  // Take only the most relevant files (first N)
  const limitedFiles = workspaceContext.slice(0, maxFiles)

  // Truncate large files
  return limitedFiles.map((file) => ({
    path: file.path,
    content: truncateFileContent(file.content, maxFileSize),
  }))
}

/**
 * Build RAG-enhanced context for the AI partner role
 * Retrieves relevant patterns, hints, and knowledge from the RAG system
 * Now includes DYNAMIC context based on what the user is currently discussing
 */
async function buildRAGContext(options: {
  scenarioTitle?: string
  scenarioPattern?: string
  scenarioCompany?: string
  scenarioType?: string
  scenarioId?: string
  problemText?: string
  userCode?: string
  userId?: string
  userMessage?: string // NEW: Current user message for dynamic context
  testResults?: { passed: number; total: number; failingTests?: string[] } // NEW: Test results for debugging context
}): Promise<string> {
  const ragContextParts: string[] = []

  try {
    // NEW: Dynamic context based on user's current message
    if (options.userMessage && shouldRetrieveDynamicContext(options.userMessage)) {
      const dynamicContext = await getDynamicChatContext({
        userMessage: options.userMessage,
        currentCode: options.userCode,
        pattern: options.scenarioPattern as DSAPattern,
        problemTitle: options.scenarioTitle,
        testResults: options.testResults,
      })

      // Only add if we got meaningful context
      if (dynamicContext.retrievedContext || dynamicContext.debuggingHints) {
        ragContextParts.push(`
## Dynamic Context (based on user's current question)
${formatDynamicContextForPrompt(dynamicContext)}
`)
      }
    }
    // 1. Get pattern-specific knowledge if pattern is known
    if (options.scenarioPattern) {
      const patternKnowledge = getPatternKnowledge(options.scenarioPattern as DSAPattern)
      if (patternKnowledge) {
        ragContextParts.push(`
## Pattern Knowledge: ${patternKnowledge.displayName}

### When to Use
${patternKnowledge.whenToUse
  .slice(0, 3)
  .map((w) => `- ${w}`)
  .join("\n")}

### Key Insights
${patternKnowledge.keyInsights
  .slice(0, 3)
  .map((i) => `- ${i}`)
  .join("\n")}

### Common Mistakes to Avoid
${patternKnowledge.commonMistakes
  .slice(0, 2)
  .map((m) => `- ${m}`)
  .join("\n")}

### Expected Complexity
- Time: ${patternKnowledge.timeComplexity.typical}
- Space: ${patternKnowledge.spaceComplexity.typical}
`)
      }
    }

    // 2. Get company-specific interview knowledge
    if (options.scenarioCompany && options.scenarioCompany !== "Generic") {
      const companyKnowledge = getCompanyInterviewKnowledge(options.scenarioCompany as CompanyId)
      if (companyKnowledge) {
        ragContextParts.push(`
## ${companyKnowledge.companyName} Interview Tips

### Interview Style
${companyKnowledge.interviewStyle.description}
Pace: ${companyKnowledge.interviewStyle.pace}
Expectations: ${companyKnowledge.interviewStyle.expectations
          .slice(0, 3)
          .map((e) => `- ${e}`)
          .join("\n")}

### Focus Areas
${companyKnowledge.topPatterns
  .slice(0, 4)
  .map((p) => `- ${p.pattern}`)
  .join("\n")}

### What They Value
${companyKnowledge.cultureTips
  .slice(0, 2)
  .map((t) => `- ${t}`)
  .join("\n")}
`)
      }
    }

    // 3. Build complexity knowledge context for interviewer
    // This gives the interviewer knowledge of multiple approaches, trade-offs, and how to question about complexity
    if (options.scenarioId || options.scenarioPattern) {
      const complexityContext = buildComplexityContext(
        options.scenarioId || "",
        options.scenarioPattern as DSAPattern
      )
      if (complexityContext) {
        ragContextParts.push(complexityContext)
      }
    }

    // 4. Build hint context from RAG if we have problem text
    if (options.problemText && options.problemText.length > 20) {
      const hintContext = await buildHintContext({
        problemText: options.problemText,
        problemPattern: options.scenarioPattern as DSAPattern,
        userCode: options.userCode,
        userId: options.userId,
      })

      if (hintContext.retrievedDocs.length > 0) {
        ragContextParts.push(`
## Relevant Knowledge from RAG (${hintContext.retrievedDocs.length} documents)

${hintContext.retrievedDocs
  .slice(0, 2)
  .map(
    (doc, i) => `
### Reference ${i + 1}
${doc.text.substring(0, 400)}${doc.text.length > 400 ? "..." : ""}
`
  )
  .join("\n")}
`)
      }
    }
  } catch (error) {
    // RAG errors should not break the chat - log and continue
    logger.error("[Chat API] RAG context build error", { error })
  }

  if (ragContextParts.length === 0) {
    return ""
  }

  return `
=== RAG-ENHANCED CONTEXT ===
${ragContextParts.join("\n")}
=== END RAG CONTEXT ===
`
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await chatRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Enforce quota limits (session & budget)
  const quotaResult = await enforceQuota(request)
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  const startTime = Date.now()

  try {
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
      userId,
      // NEW: AI Partner usage tracking for interviewer awareness
      partnerMessagesCount,
      lastPartnerExchange,
      // NEW: Nudge tracking to prevent repetitive questions
      recentNudgeTopics,
      // NEW: User-answered topics tracking
      userAnsweredTopics,
      // NEW: Time since last candidate message (for time-based proactive)
      timeSinceLastMessage,
      // NEW: Is this a wrap-up request?
      isWrapUp,
      // NEW: Edge cases for interviewer to ask about
      edgeCases,
      // NEW: Console context for interviewer awareness
      testResults,
      consoleLogs,
      // NEW: Phase-aware interview system
      interviewPhase,
      conversationTracker,
      hasSubmitted,
      solutionComplexity,
      // NEW: Real Interview Mode (fuzzy problem statements)
      realInterviewMode,
      hasFuzzyStatement,
      // NEW: Starter code length for deterministic phase detection
      starterCodeLength,
    } = await request.json()

    // For proactive messages (interviewer jumping in), message might be empty
    if (!message && !isProactive) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Input validation: reject oversized messages to prevent abuse
    const MAX_INPUT_MESSAGE_LENGTH = 10000 // 10KB limit for user input
    if (message && message.length > MAX_INPUT_MESSAGE_LENGTH) {
      logger.warn("[Chat API] Message too large", { messageLength: message.length })
      return NextResponse.json(
        {
          error: `Message exceeds maximum length of ${MAX_INPUT_MESSAGE_LENGTH} characters`,
        },
        { status: 400 }
      )
    }

    // Input validation: reject oversized code context
    const MAX_CODE_CONTEXT_LENGTH = 100000 // 100KB limit for code
    if (currentCode && currentCode.length > MAX_CODE_CONTEXT_LENGTH) {
      logger.warn("[Chat API] Code context too large", { codeLength: currentCode.length })
      return NextResponse.json(
        {
          error: `Code context exceeds maximum length of ${MAX_CODE_CONTEXT_LENGTH} characters`,
        },
        { status: 400 }
      )
    }

    // LLM-based conversation extraction for more accurate tracking
    // Only run for interviewer mode and when key signals detected
    let enhancedTracker = conversationTracker as ConversationTracker | undefined
    if (role === "interviewer" && conversationTracker && context && message) {
      const messageCount = Array.isArray(context) ? context.length : 0
      const lastExtraction = (conversationTracker as any)?.lastExtractionAt || 0

      // Feature flag: Use extraction service or direct call
      if (getFlag("USE_EXTRACTION_SERVICE")) {
        try {
          // Convert context to extraction format
          const recentMessages = (context as Array<{ type: string; message: string }>)
            .slice(-10)
            .map((m) => ({
              role: m.type === "user" ? "candidate" : "interviewer",
              content: m.message,
            }))

          const result = await extractionService({
            messages: recentMessages,
            currentTracker: conversationTracker as ConversationTracker,
            messageCount,
            lastExtractionAt: lastExtraction,
            currentMessage: message,
          })

          if (result.didRun) {
            enhancedTracker = result.tracker
            logger.info("[Chat API] Enhanced tracker with extraction service", {
              confidence: result.confidence,
            })
          }
        } catch (extractionError) {
          logger.warn("[Chat API] Extraction service failed, using original tracker", {
            error: extractionError,
          })
        }
      } else {
        // Original code path
        if (shouldRunExtraction(messageCount, lastExtraction, message)) {
          try {
            // Convert context to extraction format
            const recentMessages = (context as Array<{ type: string; message: string }>)
              .slice(-10)
              .map((m) => ({
                role: m.type === "user" ? "candidate" : "interviewer",
                content: m.message,
              }))

            // Run async extraction (non-blocking for response, enhances future requests)
            const extractionUpdates = await extractConversationState(
              recentMessages,
              conversationTracker as ConversationTracker
            )

            // Merge extraction results with existing tracker
            if (Object.keys(extractionUpdates).length > 0) {
              enhancedTracker = {
                ...(conversationTracker as ConversationTracker),
                ...extractionUpdates,
              }
              logger.info("[Chat API] Enhanced tracker with LLM extraction", { extractionUpdates })
            }
          } catch (extractionError) {
            // Extraction failed, continue with original tracker
            logger.warn("[Chat API] LLM extraction failed, using regex-based tracker", {
              error: extractionError,
            })
          }
        }
      }
    }

    // Build user context string for personalized responses
    const userInfo = userContext as UserContext
    // Extract first name or last name from full_name or email
    let userName = "there"
    if (userInfo?.full_name) {
      const nameParts = userInfo.full_name.trim().split(/\s+/)
      // Use first name if available, otherwise use last name
      userName = nameParts[0] || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "")
    } else if (userInfo?.email) {
      const emailName = userInfo.email.split("@")[0]
      const nameParts = emailName.split(".")
      if (nameParts.length > 0) {
        userName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
      }
    }

    const userContextString = userInfo
      ? `
CANDIDATE INFORMATION:
- Name: ${userName} (use first name or last name only, never full name)
- Email: ${userInfo.email || "Guest User"}
- Subscription: ${userInfo.subscription_tier || "free"} tier
- Sessions completed: ${userInfo.sessions_used || 0}
- Previous topics: ${userInfo.previous_topics?.join(", ") || "None"}
- Skill level: ${userInfo.skill_level || "Intermediate"}

IMPORTANT: When referencing the candidate, use their first name or last name only (e.g., "John" or "Smith"), never their full name. Keep it casual and professional.
`
      : ""

    // Build level-specific interviewer context
    // This adapts questions and expectations based on candidate's experience level
    const candidateLevel = (userInfo?.skill_level || "intermediate").toLowerCase() as InterviewLevel
    const levelContext = buildInterviewerLevelContext(candidateLevel)

    // Manage workspace context with sliding window
    const managedWorkspace = manageWorkspaceContext(workspaceContext)
    let workspaceContextStr = ""
    if (managedWorkspace.length > 0) {
      workspaceContextStr = "\n\n=== USER'S CODEBASE CONTEXT ===\n"
      managedWorkspace.forEach((file) => {
        workspaceContextStr += `\n--- File: ${file.path} ---\n${file.content}\n`
      })
      workspaceContextStr += "\n=== END CODEBASE CONTEXT ===\n"
    }

    // Add current code context (truncate if too long)
    let currentCodeContext = ""
    if (currentCode && currentCode.trim()) {
      const truncatedCode =
        currentCode.length > MAX_FILE_SIZE
          ? currentCode.slice(0, MAX_FILE_SIZE) + "\n// ... [code truncated]"
          : currentCode
      currentCodeContext = `\n\n=== CURRENT SOLUTION CODE ===\n${truncatedCode}\n=== END CURRENT CODE ===\n`
    }

    // Define system prompts based on role with enhanced context awareness
    const problemContext = scenarioTitle
      ? `\n\nCURRENT PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType.toUpperCase()})` : ""}\n`
      : ""

    // Get company-specific interview style
    const companyStyle = getCompanyStyle(scenarioCompany || "Generic")

    // Get pattern-specific metadata for DSA problems
    const patternMeta = scenarioPattern ? getPatternMetadata(scenarioPattern as DSAPattern) : null

    // Build company-specific context - handle Generic case (no specific company)
    const isGenericCompany = !companyStyle.company || companyStyle.company === "Generic"
    const companyContext = isGenericCompany
      ? `
INTERVIEW STYLE: ${companyStyle.style}
YOU ARE: A professional technical interviewer conducting a coding interview. Do NOT mention any specific company name.

FOCUS AREAS: ${companyStyle.focusAreas.join(", ")}
EVALUATION EMPHASIS: ${companyStyle.evaluationEmphasis.join(", ")}
PERSONALITY: ${companyStyle.interviewerPersonality}
`
      : `
COMPANY: ${companyStyle.company}
INTERVIEW STYLE: ${companyStyle.style}
YOU ARE: A ${companyStyle.company} interviewer conducting a technical interview.
Mention you're interviewing for ${companyStyle.company} in your first response.

FOCUS AREAS: ${companyStyle.focusAreas.join(", ")}
EVALUATION EMPHASIS: ${companyStyle.evaluationEmphasis.join(", ")}
PERSONALITY: ${companyStyle.interviewerPersonality}
`

    // Build pattern-specific context for DSA problems
    const patternContext = patternMeta
      ? `
PROBLEM PATTERN: ${patternMeta.name}
KEY TECHNIQUES: ${patternMeta.keyTechniques.join(", ")}
EXPECTED COMPLEXITY: Time ${patternMeta.timeComplexityHints[0]}, Space ${patternMeta.spaceComplexityHints[0]}
PATTERN-SPECIFIC FOLLOW-UPS TO ASK:
${patternMeta.interviewerFollowUps
  .slice(0, 3)
  .map((q) => `- ${q}`)
  .join("\n")}
`
      : ""

    // Build edge case context for interviewer to ask about specific scenarios
    const edgeCaseContext =
      edgeCases && Array.isArray(edgeCases) && edgeCases.length > 0
        ? `
EDGE CASES YOU MUST ASK ABOUT:
These are specific edge cases for this problem. You MUST ask about at least ONE before they run tests:
${edgeCases
  .slice(0, 4)
  .map(
    (ec: { description: string; input: unknown }) =>
      `- "${ec.description}": What happens with input ${JSON.stringify(ec.input)}?`
  )
  .join("\n")}

WHEN TO ASK ABOUT EDGE CASES (BE PROACTIVE):
1. AFTER they explain their approach: "Before you code - what happens if the input is empty?"
2. AFTER they write code but BEFORE running tests: "Let's trace through an edge case - what if ${JSON.stringify(edgeCases[0]?.input)}?"
3. If they don't mention edge cases at all, YOU bring it up: "Have you considered what happens with ${edgeCases[0]?.description}?"

HOW TO ASK (sound natural):
- "Quick sanity check - what does your code do if the input is ${JSON.stringify(edgeCases[0]?.input)}?"
- "Before you run tests, walk me through what happens with an empty array"
- "Edge case check: what if there's only one element?"

DO NOT skip edge cases - real interviewers always ask about them. If they haven't mentioned any edge case handling, that's a gap you should probe.
`
        : ""

    // Build console/test results context for interviewer awareness
    interface TestResultItem {
      description?: string
      passed?: boolean
      input?: unknown
      expected?: unknown
      actual?: unknown
      error?: string | null
    }
    interface ConsoleLogItem {
      type?: string
      message?: string
    }
    const testResultsArray = testResults as TestResultItem[] | undefined
    const consoleLogsArray = consoleLogs as ConsoleLogItem[] | undefined

    let consoleContext = ""
    if (testResultsArray && Array.isArray(testResultsArray) && testResultsArray.length > 0) {
      const passed = testResultsArray.filter((t) => t.passed === true).length
      const total = testResultsArray.length
      const allPassed = passed === total

      consoleContext = `
CONSOLE & TEST RESULTS (IMPORTANT - BE AWARE OF THIS):
Tests have been run: ${passed}/${total} passed ${allPassed ? "✓ ALL PASSING" : "✗ SOME FAILING"}

${testResultsArray
  .slice(0, 5)
  .map(
    (t, i) =>
      `Test ${i + 1}: ${t.description || "Test case"} - ${t.passed ? "PASSED ✓" : "FAILED ✗"}${
        !t.passed && t.error ? ` (Error: ${t.error})` : ""
      }${!t.passed && t.expected !== undefined ? ` (Expected: ${JSON.stringify(t.expected)}, Got: ${JSON.stringify(t.actual)})` : ""}`
  )
  .join("\n")}

${
  allPassed
    ? `INTERVIEWER BEHAVIOR WHEN ALL TESTS PASS:
- DO NOT say "let's run the tests" - they already did and passed!
- Move to follow-up questions: complexity analysis, optimizations, edge cases
- Example: "Nice, tests are passing. What's the time complexity?" or "Good - now let's talk about how you'd optimize this"`
    : `INTERVIEWER BEHAVIOR WHEN TESTS FAIL:
- Acknowledge the failing tests
- Ask them to debug: "Looks like test ${testResultsArray.findIndex((t) => !t.passed) + 1} is failing - what do you think is happening there?"
- Help them trace through the failing case`
}
`
    }

    // Add console logs context if available
    if (consoleLogsArray && Array.isArray(consoleLogsArray) && consoleLogsArray.length > 0) {
      const recentLogs = consoleLogsArray.slice(-5)
      consoleContext += `
RECENT CONSOLE OUTPUT:
${recentLogs.map((log) => `[${log.type || "log"}] ${log.message || ""}`).join("\n")}
`
    }

    // Build system design specific context with phase-based guidance
    const isSystemDesign = scenarioType === "system-design"
    const elapsedMinutes = elapsedTime ? Math.floor(elapsedTime / 60) : 0

    // System design interviews should follow 4 phases (~45 min total)
    const getSystemDesignPhase = (minutes: number) => {
      if (minutes < 10) return "requirements" // Phase 1: Requirements gathering
      if (minutes < 20) return "high-level" // Phase 2: High-level design
      if (minutes < 35) return "deep-dive" // Phase 3: Deep dive
      return "wrap-up" // Phase 4: Bottlenecks & wrap-up
    }

    const systemDesignPhase = isSystemDesign ? getSystemDesignPhase(elapsedMinutes) : null

    const systemDesignContext = isSystemDesign
      ? `
INTERVIEW TYPE: System Design (Architecture Discussion - NOT a coding interview)

CURRENT PHASE: ${systemDesignPhase?.toUpperCase()} (${elapsedMinutes} min elapsed)

PHASE GUIDANCE:
${
  systemDesignPhase === "requirements"
    ? `
REQUIREMENTS PHASE (0-10 min):
- Ask clarifying questions about scope and scale
- Help candidate define functional requirements (what the system must do)
- Help candidate define non-functional requirements (latency, availability, scale)
- Ask: "How many users?" "What's the expected traffic?" "What's more important: consistency or availability?"
- DON'T jump into architecture yet - requirements first!
`
    : ""
}
${
  systemDesignPhase === "high-level"
    ? `
HIGH-LEVEL DESIGN PHASE (10-20 min):
- Guide candidate to draw the major components
- Ask about API design: "What endpoints do we need?"
- Ask about data model: "What entities do we need to store?"
- Ask about communication: "How will components communicate?"
- Encourage thinking out loud about architectural choices
`
    : ""
}
${
  systemDesignPhase === "deep-dive"
    ? `
DEEP DIVE PHASE (20-35 min):
- Pick 1-2 components to explore deeply
- Ask about scaling: "What happens at 10x traffic?"
- Ask about failure modes: "What if this component fails?"
- Discuss trade-offs: "Why did you choose X over Y?"
- Probe on specific algorithms or data structures for key components
`
    : ""
}
${
  systemDesignPhase === "wrap-up"
    ? `
WRAP-UP PHASE (35-45 min):
- Ask about single points of failure
- Discuss monitoring and observability
- Ask about security considerations
- Summarize the design and discuss improvements
- Ask: "What would you do differently with more time?"
`
    : ""
}

SYSTEM DESIGN EVALUATION CRITERIA:
- Requirements Gathering: Did they ask good clarifying questions?
- Architecture: Did they propose a clear, logical system design?
- Scalability: Did they address how to handle increased load?
- Trade-offs: Did they discuss pros/cons of their choices?
- Communication: Did they explain their thinking clearly?

SYSTEM DESIGN SPECIFIC RULES:
- This is a DISCUSSION, not a coding exercise
- There is NO "correct answer" - evaluate reasoning and trade-offs
- Ask open-ended questions to understand their thinking
- Guide them through phases naturally based on elapsed time
- Focus on WHY they make decisions, not just WHAT they propose
- Encourage them to think about scale (millions of users, TB of data)
- Ask about failure scenarios and edge cases
`
      : ""

    // Build bug fix specific context
    const isBugFix = scenarioType === "bugfix"
    const bugFixContext = isBugFix
      ? `
INTERVIEW TYPE: Bug Fix / Debugging Interview

THIS IS A DEBUGGING EXERCISE - Focus on:
1. Understanding the bug: Ask them to explain what the bug is
2. Debugging approach: How are they finding the issue?
3. Root cause analysis: Do they understand WHY it happens?
4. Fix quality: Is the fix correct and complete?
5. Prevention: How to prevent similar bugs in the future?

DEBUGGING INTERVIEW BEST PRACTICES:
- Ask them to read through the code and explain what it does
- Ask: "What do you think is causing this behavior?"
- Ask: "How would you debug this in production?"
- If they struggle: Give hints about WHERE to look, not WHAT the bug is
- Ask about edge cases: "What if the input is empty? Null? Very large?"
- After the fix: "How would you write a test to catch this?"

EVALUATION CRITERIA FOR BUG FIX:
- Bug Identification: Did they find the actual bug?
- Debugging Process: Was their approach systematic or random?
- Root Cause: Do they understand why the bug occurred?
- Fix Quality: Is the fix correct, complete, and clean?
- Testing Mindset: Did they consider edge cases and testing?

DO NOT:
- Give away the bug location or fix too quickly
- Accept a fix without understanding the root cause
- Let them blindly try things without reasoning
`
      : ""

    // Build phase-specific context using DETERMINISTIC signals
    // No longer relies on frontend-passed interviewPhase - we compute it here
    const testsHaveRunNow =
      testResultsArray && Array.isArray(testResultsArray) && testResultsArray.length > 0
    const messageCount = Array.isArray(context) ? context.length : 0
    const currentCodeLen = currentCode?.length || 0
    const starterLen = starterCodeLength || 0

    const phaseContext: PhaseDetectionContext = {
      hasSubmitted: hasSubmitted || false,
      testsHaveRun: testsHaveRunNow || false,
      currentCodeLength: currentCodeLen,
      starterCodeLength: starterLen,
      approachExplained:
        enhancedTracker?.approachExplained ||
        (conversationTracker as ConversationTracker)?.approachExplained,
      messageCount,
    }

    // Feature flag: Use phase service or direct call
    let currentPhase: InterviewPhase
    let phasePrompt: string
    if (getFlag("USE_PHASE_SERVICE")) {
      const phaseResult = phaseService({
        hasSubmitted: hasSubmitted || false,
        testsHaveRun: testsHaveRunNow || false,
        currentCodeLength: currentCodeLen,
        starterCodeLength: starterLen,
        approachExplained:
          enhancedTracker?.approachExplained ||
          (conversationTracker as ConversationTracker)?.approachExplained ||
          false,
        messageCount,
      })
      currentPhase = phaseResult.phase
      phasePrompt = phaseResult.prompt
      logger.debug("[Chat API] Phase detected via service", {
        phase: currentPhase,
        codeWritten: phaseResult.metadata.codeWritten,
      })
    } else {
      // Original code path
      currentPhase = detectInterviewPhase(phaseContext)
      phasePrompt = PHASE_PROMPTS[currentPhase] || PHASE_PROMPTS.discussion
    }

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
      (enhancedTracker || (conversationTracker as ConversationTracker))?.hintsGiven || 0
    const hintGuidance = hintsGiven > 0 ? getHintGuidance(hintsGiven) : ""

    // CODE-ENFORCED CHECKLIST INJECTION
    // This dynamically injects requirements based on tracker state
    // The LLM cannot ignore this because it's injected based on code logic
    let enforcedChecklist = ""
    const tracker = (enhancedTracker || conversationTracker) as ConversationTracker | undefined

    // Run checklist in discussion AND coding phases (before tests run)
    // This catches cases where starter code pushes phase to "coding" too early
    const shouldEnforceChecklist =
      (currentPhase === "discussion" || currentPhase === "coding") &&
      tracker &&
      !tracker.hasRunTests
    if (shouldEnforceChecklist) {
      const missingItems: string[] = []

      // IMPORTANT: Only ask about complexity AFTER they've explained their approach
      // Don't rush to complexity questions when they're still exploring the problem
      const hasExplainedApproach =
        tracker.approachExplained ||
        tracker.approachQuality === "specific" ||
        tracker.approachQuality === "detailed"

      // Check if complexity has been discussed (only if they've explained approach)
      if (hasExplainedApproach && !tracker.timeComplexityMentioned) {
        missingItems.push(
          '⚠️ ASK ABOUT COMPLEXITY: "What time and space complexity do you expect with your approach?"'
        )
      }

      // Check if edge cases have been discussed (only if they've explained approach)
      if (hasExplainedApproach && tracker.edgeCasesMentioned.length === 0) {
        missingItems.push('⚠️ ASK ABOUT EDGE CASES: "What edge cases should we consider?"')
      }

      if (missingItems.length > 0) {
        enforcedChecklist = `
═══════════════════════════════════════════════════════════════
🚫 DO NOT SAY "GO CODE" OR "CODE IT UP" IN THIS RESPONSE 🚫
You MUST ask about these first:
${missingItems.join("\n")}
═══════════════════════════════════════════════════════════════
`
      }
    }

    // TESTING PHASE: Dynamic override to prevent re-asking already covered topics
    // The static testing phase prompt says "ask about complexity" but we need to
    // skip that if complexity was already discussed during the approach phase
    let testingPhaseOverride = ""
    if (currentPhase === "testing" && tracker) {
      const alreadyCovered: string[] = []

      if (tracker.timeComplexityMentioned && tracker.timeComplexityValue) {
        alreadyCovered.push(
          `✅ COMPLEXITY ALREADY DISCUSSED: ${tracker.timeComplexityValue} - DO NOT ask again`
        )
      }
      if (tracker.edgeCasesMentioned.length > 0) {
        alreadyCovered.push(
          `✅ EDGE CASES ALREADY DISCUSSED: ${tracker.edgeCasesMentioned.join(", ")} - DO NOT ask again`
        )
      }

      if (alreadyCovered.length > 0) {
        testingPhaseOverride = `
═══════════════════════════════════════════════════════════════
ALREADY COVERED (DO NOT RE-ASK):
${alreadyCovered.join("\n")}

INSTEAD, focus on:
- Ask about trade-offs or alternative approaches
- Discuss what edge cases might still be missing
- Ask about optimization potential (only if not already optimal)
═══════════════════════════════════════════════════════════════
`
      }
    }

    // Build complexity context - tells interviewer if solution is optimal
    let complexityContext = ""
    if (solutionComplexity) {
      const { estimated, optimal, isOptimal } = solutionComplexity
      if (isOptimal) {
        complexityContext = `
SOLUTION COMPLEXITY:
- Candidate's solution appears to be ${estimated} which matches the optimal ${optimal}
- DO NOT ask "can you optimize this?" - their solution is already optimal
- Instead: ask about trade-offs, edge cases, or alternative approaches
- Good questions: "Could you trade space for time?", "What edge cases might we be missing?", "What's another way to solve this?"`
      } else {
        complexityContext = `
SOLUTION COMPLEXITY:
- Candidate's solution appears to be ${estimated}
- Optimal solution would be ${optimal}
- You CAN ask about optimization: "Could you do better than ${estimated}?" or "Is there a way to avoid the nested loop?"`
      }
    }

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
    let fuzzyModeContext = ""
    if (realInterviewMode && hasFuzzyStatement) {
      fuzzyModeContext = `
═══════════════════════════════════════════════════════════════
🎯 REAL INTERVIEW MODE ACTIVE
═══════════════════════════════════════════════════════════════
The problem statement is intentionally VAGUE (like a real interview).
The candidate is expected to ask clarifying questions.

YOUR BEHAVIOR IN THIS MODE:
1. EXPECT and ENCOURAGE clarifying questions - they are a POSITIVE signal!
2. Answer clarifying questions clearly and concisely
3. DO NOT volunteer information they didn't ask for
4. If they ask about input format, output format, constraints - answer them
5. If they dive into coding without clarifying - that's a yellow flag, but let them proceed
6. DO NOT say "the problem says..." - they have a vague statement

GOOD RESPONSES TO CLARIFYING QUESTIONS:
- "Good question — yes, you return the actual values, not indices"
- "Right, you need to handle duplicates"
- "The array can have negative numbers"

BAD RESPONSES:
- "Hold up —" (dismissive)
- Volunteering all constraints before they ask
- "As stated in the problem..." (they have vague statement)
═══════════════════════════════════════════════════════════════
`
    }

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

      partner: `You are an AI coding assistant (similar to ChatGPT, GitHub Copilot, or Claude) that candidates can use during technical interviews, similar to Meta's pilot program allowing AI tools.

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

HOW TO HELP (Collaborative Partner Approach):
- Give hints and suggestions, not full solutions (unless they're really stuck after multiple attempts)
- Ask guiding questions: "What if you tried...?" "Have you considered...?"
- Explain concepts briefly when asked
- Point out patterns and best practices
- Help them understand WHY something works, not just WHAT to do
- Wait for user requests - don't proactively suggest unless they ask
- Be a tool they use, not an agent that acts for them

${scenarioTitle ? `- Focus on helping with ${scenarioTitle}` : "- Focus on helping with the current problem"}
- Remember their progress and build on previous conversations

IMPORTANT:
- When referencing the user, use their first name or last name only (e.g., "John" or "Smith"), never their full name.
- Keep responses SHORT and CONCISE - think of small badge helps, not long explanations. Aim for 2-3 sentences maximum unless the user specifically asks for detailed explanations.
- Use bullet points or brief notes when possible instead of paragraphs.
- The interviewer (Sable) will evaluate how effectively the candidate uses your assistance
- Good AI collaboration means: asking the right questions, understanding the suggestions, and implementing them correctly
- You have full access to the user's codebase and current solution code. Use this to:
  - Understand their coding style and provide consistent suggestions
  - Reference patterns from their codebase
  - Help debug specific issues in their current code
  - Provide context-aware hints that match their codebase structure
- Remember: You're a collaborative partner tool, not an autonomous agent. Respond to requests, don't act independently.

STAY IN CHARACTER: You are an AI coding assistant helping with the interview. Stay focused on the coding problem at hand. Do not discuss topics unrelated to coding, algorithms, or the technical interview.

Keep responses brief, actionable, and helpful. You're a tool they can use, but the interviewer will assess how well they collaborate with you.`,
    }

    let systemPrompt = systemPrompts[role as keyof typeof systemPrompts] || systemPrompts.partner

    // Derive scenarioId from title for complexity lookup (e.g., "Two Sum" -> "dsa-two-sum")
    const scenarioId = scenarioTitle
      ? `dsa-${scenarioTitle
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")}`
      : undefined

    // Enhance both interviewer and partner roles with RAG context
    // Now includes DYNAMIC context based on the user's current message
    const ragContext = await buildRAGContext({
      scenarioTitle,
      scenarioPattern,
      scenarioCompany,
      scenarioType,
      scenarioId,
      problemText: scenarioTitle, // Use title as problem text
      userCode: currentCode,
      userId,
      userMessage: message, // NEW: Pass user message for dynamic context
      testResults, // NEW: Pass test results for debugging context
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

    // Manage conversation history with sliding window
    const managedContext = manageContextWindow(context)

    // Convert to provider-agnostic format
    const history: Array<{ role: "user" | "model"; content: string }> = []
    let foundFirstUser = false
    managedContext.forEach((msg) => {
      // Skip any model messages before the first user message
      if (!foundFirstUser && msg.type !== "user") {
        return
      }
      foundFirstUser = true

      history.push({
        role: msg.type === "user" ? "user" : "model",
        content: msg.message,
      })
    })

    // Build the full user message with context
    let fullUserMessage = ""

    if (isProactive && role === "interviewer") {
      // Smart proactive engagement - jump in like a real interviewer
      const hasSubstantialCode = currentCode && currentCode.trim().length > 100
      const codeLines = currentCode?.split("\n").length || 0
      const elapsedMinutes = elapsedTime ? Math.floor(elapsedTime / 60) : 0

      // TIME-BASED TRIGGER: Check in after 2+ minutes of silence
      // Real interviewers don't wait forever for code - they check in on thinking
      const timeSilentSeconds = timeSinceLastMessage || 0
      const shouldTimeBasedCheckIn = timeSilentSeconds >= 120 // 2 minutes of silence

      if (!hasSubstantialCode && !shouldTimeBasedCheckIn) {
        // Don't interrupt if they haven't written much AND haven't been silent too long
        return NextResponse.json({
          reply: null,
          skipped: true,
          reason: "Not enough code to comment on yet and not silent long enough",
        })
      }

      // If silent for too long but no code, ask about their thinking
      if (shouldTimeBasedCheckIn && !hasSubstantialCode) {
        fullUserMessage = `[TIME-BASED CHECK-IN] The candidate has been quiet for ${Math.floor(timeSilentSeconds / 60)} minutes without writing substantial code.

Act like a real interviewer who notices someone is quiet:
- "How are you thinking about this problem?"
- "What's going through your mind?"
- "Would it help to talk through your approach?"
- "Are you stuck on something specific?"

Pick ONE natural response (under 20 words). Don't be pushy - they might be thinking.`
        // Continue to generate response below
      }

      // Determine the best proactive response based on context
      const proactivePrompts = [
        "Walk me through what you're doing here.",
        "What's your approach for this?",
        "Can you explain your thought process?",
        "What's the time complexity of this approach?",
        "Have you considered any edge cases?",
        "What happens with an empty input?",
        "Interesting approach - what led you to this?",
        "Let's trace through an example together.",
      ]

      // Use RAG context to ask smarter questions
      const patternSpecificQuestion = scenarioPattern
        ? `Based on the ${scenarioPattern} pattern, ask a relevant question about their approach or potential issues.`
        : ""

      // AI Partner usage awareness - alert interviewer if candidate is heavily using AI
      const aiPartnerContext =
        partnerMessagesCount && partnerMessagesCount > 0
          ? `
AI PARTNER USAGE ALERT:
- Candidate has used AI Partner ${partnerMessagesCount} times this session
${lastPartnerExchange ? `- Last AI interaction: "${lastPartnerExchange.slice(0, 200)}..."` : ""}
${partnerMessagesCount >= 5 ? `- HIGH AI USAGE: Consider asking them to explain their understanding of the AI suggestions` : ""}
${partnerMessagesCount >= 3 ? `- When they explain code, verify they understand it vs. blindly copied it` : ""}
`
          : ""

      // Nudge topic tracking to avoid repetitive questions
      const nudgeAvoidance =
        recentNudgeTopics && recentNudgeTopics.length > 0
          ? `
AVOID REPEATING THESE TOPICS (already asked about):
${recentNudgeTopics
  .slice(-3)
  .map((t: string) => `- ${t}`)
  .join("\n")}
If they're still stuck on these, give a CONCRETE hint instead of asking again.
`
          : ""

      // User-answered topics tracking - DON'T re-ask what they already answered
      const userAnsweredContext =
        userAnsweredTopics && userAnsweredTopics.length > 0
          ? `
CANDIDATE HAS ALREADY ANSWERED (do NOT ask about these again):
${userAnsweredTopics
  .slice(-5)
  .map((t: string) => `- ${t}`)
  .join("\n")}
If you want to discuss these topics, ACKNOWLEDGE their answer first, then probe DEEPER or move on.
`
          : ""

      // Keep proactive message SHORT and natural - like a real interviewer jumping in
      fullUserMessage = `[NATURAL CHECK-IN] The candidate has been working on code. Act like a real interviewer who just noticed something interesting or wants to understand their thinking.

${currentCodeContext}
${aiPartnerContext}
${patternSpecificQuestion}
${nudgeAvoidance}
${userAnsweredContext}

Options for how to engage:
${proactivePrompts
  .slice(0, 3)
  .map((p) => `- "${p}"`)
  .join("\n")}

Pick ONE natural response (or create your own). Keep it under 20 words. Sound like a real person in the room, not a robot.`
    } else if (isWrapUp && role === "interviewer") {
      // WRAP-UP: Interview is ending, provide detailed retrospective debrief
      const passedTests = message?.testsPassed || 0
      const totalTests = message?.testsTotal || 0
      const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0
      const allTestsPassed = passedTests === totalTests && totalTests > 0

      fullUserMessage = `[INTERVIEW DEBRIEF] The candidate is ending the session. Give them a real debrief like after an actual interview.

FINAL STATE:
${currentCodeContext}

TEST RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round(passRate)}%)
${allTestsPassed ? "STATUS: PASSED" : "STATUS: DID NOT PASS"}

${partnerMessagesCount ? `AI Partner Usage: ${partnerMessagesCount} interactions` : "No AI Partner usage"}
Time spent: ${elapsedMinutes || "unknown"} minutes

YOUR DEBRIEF SHOULD INCLUDE:

1. VERDICT (be honest):
${
  allTestsPassed
    ? `- Tests passed, so acknowledge that
   - But still give constructive feedback - passing isn't everything`
    : `- Tests didn't pass - be direct but kind
   - Point out what went wrong without being harsh
   - Encourage them: "This is a common pattern - worth practicing"`
}

2. WHAT THEY DID WELL (be specific):
   - Reference actual things from the conversation
   - "Your initial approach with the hash map was spot on"
   - "Good that you asked about edge cases upfront"
   - Don't make things up - only mention things they actually did

3. WHAT TO IMPROVE (be actionable):
   - "You spent too long without talking - think out loud more"
   - "Consider edge cases earlier in your process"
   - "Your brute force was fine, but look into [pattern] for optimization"
   - Give them something concrete to work on

4. HIRING SIGNAL (be real):
${
  allTestsPassed
    ? `- "If this were a real interview, I'd lean towards a hire recommendation. Your communication was solid and you got to a working solution."
   - OR "Tests passed, but the process was rough. In a real interview, I'd be on the fence - work on [specific thing]."`
    : `- "In a real interview, this wouldn't be a pass. But here's the good news: [pattern] problems are very learnable."
   - Be kind but honest about what it would take`
}

EXAMPLE GOOD DEBRIEF:
"Alright, let's wrap up. Tests are passing - nice work. You showed good instincts going for a hash map right away, and I liked that you traced through the example before coding. Two things to work on: you didn't mention edge cases until I asked, and that initial confusion about what to store as keys vs values cost you a few minutes. In a real interview, that'd be a positive signal overall - you communicated well and got to O(n). Good work on this one."

EXAMPLE FOR FAILED TESTS:
"Let's debrief. So the tests didn't pass, but let's talk about what happened. You had the right intuition about needing to track seen elements, but got tangled up in the implementation. The two-pointer approach you tried wouldn't work here because the array isn't sorted - that's the key insight. This is a classic hash map pattern, and honestly it trips up a lot of people. I'd spend some time on the 'Two Sum' type problems - once this pattern clicks, you'll recognize it instantly. Keep at it."

Keep it conversational and real - like you're actually debriefing someone after an interview.`
    } else {
      // Check if AI already said goodbye in a recent message (interview is over)
      const recentMessages = context?.slice(-4) || []
      const aiAlreadySaidGoodbye = recentMessages.some(
        (msg: { message: string; type?: string }) =>
          msg.type !== "user" &&
          (msg.message?.toLowerCase().includes("good luck with your") ||
            msg.message?.toLowerCase().includes("best of luck") ||
            (msg.message?.toLowerCase().includes("take care") &&
              msg.message?.toLowerCase().includes("interview")))
      )

      if (aiAlreadySaidGoodbye && role === "interviewer") {
        // Interview is OVER - don't respond to any more messages
        return NextResponse.json({
          reply: null,
          conversationEnded: true,
          endMessage:
            "The interview session has ended. Click 'View Detailed Feedback' to see your score breakdown and detailed analysis.",
        })
      }

      // Regular message - let the AI naturally handle conversation flow
      // The AI will determine if this is a farewell based on full context
      fullUserMessage = message
      if (workspaceContextStr || currentCodeContext) {
        fullUserMessage += workspaceContextStr + currentCodeContext
      }

      // For interviewer role, add user-answered topics context to prevent re-asking
      if (role === "interviewer" && userAnsweredTopics && userAnsweredTopics.length > 0) {
        fullUserMessage += `

[CONTEXT - CANDIDATE HAS ALREADY ANSWERED]:
${userAnsweredTopics
  .slice(-5)
  .map((t: string) => `- ${t}`)
  .join("\n")}
Remember: Acknowledge what they said, then probe deeper or move on. Do NOT re-ask.`
      }
    }

    // Determine task complexity for provider selection
    const complexity: TaskComplexity = role == "interviewer" ? "dialogue" : "code"

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

      // Regeneration function for the retry loop
      const regenerate = async (hint: string): Promise<string> => {
        const correctedPrompt = `${systemPrompt}

⚠️ HARD GATE VIOLATION - REGENERATE:
${hint}

Generate a response that follows these rules.`

        const regeneratedResponse = await generateAIResponse(
          correctedPrompt,
          fullUserMessage,
          history,
          {
            complexity,
            userId,
            sessionId,
            eventType: "chat_message",
          }
        )
        return regeneratedResponse.text
      }

      // Run validation with up to 2 retries for critical violations
      const gateResult = await validateWithRetry(validationContext, regenerate, 2)

      // Update response if regenerated
      if (gateResult.retries > 0) {
        aiResponse.text = gateResult.response
        logger.info("[Hard Gates] Response regenerated", {
          sessionId,
          retries: gateResult.retries,
          remainingViolations: gateResult.violations.map((v) => v.rule),
        })
      }

      // SEMANTIC VALIDATION: LLM-based check for subtle violations regex misses
      // Uses DeepSeek (critique complexity) - cheapest provider for validation
      // Only runs if regex gates passed (avoids wasting LLM calls on already-bad responses)
      if (gateResult.violations.filter((v) => v.severity === "critical").length === 0) {
        try {
          // Create generateAI callback for semantic validation
          const generateAIForValidation = async (
            system: string,
            user: string
          ): Promise<{ text: string }> => {
            const result = await generateAIResponse(system, user, [], {
              complexity: "critique", // Uses DeepSeek - cheapest for validation
              userId,
              sessionId,
              eventType: "chat_message",
              skipCache: true, // Always validate fresh
            })
            return { text: result.text }
          }

          const semanticResult = await validateSemanticRules(
            aiResponse.text,
            generateAIForValidation
          )

          if (semanticResult.violated && semanticResult.rule) {
            logger.info("[Semantic Validation] Violation detected", {
              sessionId,
              rule: semanticResult.rule,
              evidence: semanticResult.evidence?.substring(0, 100),
            })

            // Regenerate with semantic hint
            const hint =
              semanticResult.suggestion || "Probe their reasoning instead of explaining/correcting"
            const regeneratedText = await regenerate(
              `SEMANTIC VIOLATION (${semanticResult.rule}): ${hint}`
            )
            aiResponse.text = regeneratedText
            logger.info("[Semantic Validation] Response regenerated", { sessionId })
          }
        } catch (semanticError) {
          // Semantic validation failure is non-critical - log and continue
          logger.warn("[Semantic Validation] Failed, continuing with response", {
            sessionId,
            error: semanticError,
          })
        }
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
    trackAIChatServer({
      sessionId,
      userId,
      interactionType: role === "interviewer" ? "interviewer" : "partner",
      messageLength: message?.length || 0,
      responseTimeMs,
      provider: aiResponse.provider, // Track which provider was used
    }).catch((err) => logger.error("Analytics tracking error", { error: err }))

    return NextResponse.json({
      reply: aiResponse.text,
      provider: aiResponse.provider, // Include provider for debugging
      latencyMs: aiResponse.latencyMs,
    })
  } catch (error: any) {
    logger.error("Chat API error", {
      error,
      message: error?.message,
      status: error?.status,
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

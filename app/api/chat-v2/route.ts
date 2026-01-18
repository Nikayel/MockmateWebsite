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
import {
  buildInterviewContext as buildRichContext,
  buildProactiveContext,
  buildCodeContext,
} from "@/lib/interview/context-builders"
import { type DSAPattern } from "@/lib/types/dsa-patterns"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import {
  getCompanyInterviewKnowledge,
  type CompanyId,
} from "@/lib/rag/knowledge-base/company-knowledge"
import {
  getDynamicChatContext,
  formatDynamicContextForPrompt,
  shouldRetrieveDynamicContext,
} from "@/lib/rag/dynamic-chat-context"
import { buildHintContext, buildComplexityContext } from "@/lib/rag/context-builder"
import { truncateText, truncateFileContent } from "@/lib/utils"
import { generateAIResponse } from "@/lib/ai-providers"

// =============================================================================
// CONTEXT MANAGEMENT CONSTANTS
// =============================================================================

const MAX_HISTORY_MESSAGES = 20 // Keep last 20 messages
const MAX_MESSAGE_LENGTH = 4000 // Truncate individual messages
const MAX_WORKSPACE_FILES = 5 // Limit workspace files
const MAX_FILE_SIZE = 10000 // 10KB per file max

// =============================================================================
// CONTEXT WINDOW MANAGEMENT
// =============================================================================

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
 * Build workspace context string for prompt injection
 */
function buildWorkspaceContextString(
  workspaceContext: Array<{ path: string; content: string }>
): string {
  const managedWorkspace = manageWorkspaceContext(workspaceContext)
  if (managedWorkspace.length === 0) return ""

  let workspaceStr = "\n\n=== USER'S CODEBASE CONTEXT ===\n"
  managedWorkspace.forEach((file) => {
    workspaceStr += `\n--- File: ${file.path} ---\n${file.content}\n`
  })
  workspaceStr += "=== END CODEBASE CONTEXT ===\n"

  return workspaceStr
}

// =============================================================================
// RAG CONTEXT BUILDER
// =============================================================================

/**
 * Build RAG-enhanced context for the interviewer
 * Retrieves relevant patterns, hints, and knowledge from the RAG system
 * Includes DYNAMIC context based on what the user is currently discussing
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
  userMessage?: string
  testResults?: { passed: number; total: number; failingTests?: string[] }
}): Promise<string> {
  const ragContextParts: string[] = []

  try {
    // 1. Dynamic context based on user's current message
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

    // 2. Get pattern-specific knowledge if pattern is known
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

    // 3. Get company-specific interview knowledge
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

    // 4. Build complexity knowledge context
    if (options.scenarioId || options.scenarioPattern) {
      const complexityContext = buildComplexityContext(
        options.scenarioId || "",
        options.scenarioPattern as DSAPattern
      )
      if (complexityContext) {
        ragContextParts.push(complexityContext)
      }
    }

    // 5. Build hint context from RAG if we have problem text
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
    logger.error("[Chat-v2] RAG context build error", { error })
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
  scenarioId?: string
  problemText?: string
  currentCode?: string
  starterCodeLength?: number
  // State
  testResults?: Array<{
    name: string
    passed: boolean
    input?: string
    expected?: string
    actual?: string
    description?: string
    error?: string
  }>
  consoleLogs?: Array<{ type?: string; message?: string }>
  hasSubmitted?: boolean
  conversationTracker?: Partial<ConversationState>
  solutionComplexity?: {
    timeComplexity: string
    spaceComplexity: string
    isOptimal: boolean
    estimated?: string
    optimal?: string
  }
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
  // Workspace context (other files in codebase)
  workspaceContext?: Array<{ path: string; content: string }>
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

const MAX_REQUEST_MESSAGE_LENGTH = 10000
const MAX_CODE_LENGTH = 100000

function validateRequest(body: ChatRequest): { valid: boolean; error?: string } {
  // Message required (unless proactive)
  if (!body.message && !body.isProactive) {
    return { valid: false, error: "Message is required" }
  }

  // Message length
  if (body.message && body.message.length > MAX_REQUEST_MESSAGE_LENGTH) {
    return { valid: false, error: `Message exceeds ${MAX_REQUEST_MESSAGE_LENGTH} characters` }
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
  const testsPassed = testResults.filter((t) => t.passed).length

  // Build rich context using context-builders (DRY)
  const richContext = buildRichContext({
    scenarioTitle: body.scenarioTitle,
    scenarioType: body.scenarioType,
    scenarioPattern: body.scenarioPattern,
    scenarioCompany: body.scenarioCompany,
    userInfo: body.userContext,
    currentCode: body.currentCode,
    starterCodeLength: body.starterCodeLength,
    testResults: testResults.map((t) => ({
      description: t.description || t.name,
      passed: t.passed,
      input: t.input,
      expected: t.expected,
      actual: t.actual,
      error: t.error,
    })),
    consoleLogs: body.consoleLogs,
    hasSubmitted: body.hasSubmitted,
    solutionComplexity: body.solutionComplexity
      ? {
          estimated: body.solutionComplexity.estimated,
          optimal: body.solutionComplexity.optimal,
          isOptimal: body.solutionComplexity.isOptimal,
          timeComplexity: body.solutionComplexity.timeComplexity,
          spaceComplexity: body.solutionComplexity.spaceComplexity,
        }
      : undefined,
    realInterviewMode: body.realInterviewMode,
    hasFuzzyStatement: body.hasFuzzyStatement,
    edgeCases: body.edgeCases,
    elapsedTime: body.elapsedTime,
    // AI Partner tracking
    partnerMessagesCount: body.partnerMessagesCount,
    lastPartnerExchange: body.lastPartnerExchange,
    // Nudge tracking
    recentNudgeTopics: body.recentNudgeTopics,
    userAnsweredTopics: body.userAnsweredTopics,
    // Time tracking
    timeSinceLastMessage: body.timeSinceLastMessage,
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
    testResults: testResults.map((t) => ({
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

  // Apply context window management
  const managedContext = manageContextWindow(context)

  return managedContext.map((msg) => ({
    role: msg.type === "user" ? ("user" as const) : ("assistant" as const),
    content: msg.message,
  }))
}

function detectDifficulty(pattern?: string): "easy" | "medium" | "hard" {
  if (!pattern) return "medium"
  const easyPatterns = ["two-pointers", "hash-table", "array"]
  const hardPatterns = ["dynamic-programming", "graph", "trie", "segment-tree"]

  if (easyPatterns.some((p) => pattern.toLowerCase().includes(p))) return "easy"
  if (hardPatterns.some((p) => pattern.toLowerCase().includes(p))) return "hard"
  return "medium"
}

function detectLanguage(code?: string): string {
  if (!code) return "python"
  if (code.includes("def ") || code.includes("print(")) return "python"
  if (code.includes("function ") || code.includes("const ") || code.includes("let "))
    return "javascript"
  if (code.includes("public class") || code.includes("public static void")) return "java"
  if (code.includes("func ") && code.includes("->")) return "swift"
  if (code.includes("fn ") && code.includes("->")) return "rust"
  return "python"
}

// =============================================================================
// WRAP-UP MESSAGE BUILDER
// =============================================================================

function buildWrapUpMessage(options: {
  allTestsPassed: boolean
  passedTests: number
  totalTests: number
  passRate: number
  partnerMessagesCount?: number
  elapsedMinutes: number
  currentCode?: string
}): string {
  const {
    allTestsPassed,
    passedTests,
    totalTests,
    passRate,
    partnerMessagesCount,
    elapsedMinutes,
    currentCode,
  } = options

  const codeContext = currentCode ? buildCodeContext(currentCode) : ""

  return `[INTERVIEW DEBRIEF] The candidate is ending the session. Give them a real debrief like after an actual interview.

FINAL STATE:
${codeContext}

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

Keep it conversational and real - like you're actually debriefing someone after an interview.`
}

// =============================================================================
// PARTNER (AI CODING ASSISTANT) SUPPORT
// Partner is available for: system-design, bugfix, add-functionality
// =============================================================================

const PARTNER_SUPPORTED_TYPES = ["system-design", "bugfix", "add-functionality"]

function isPartnerSupported(scenarioType?: string): boolean {
  if (!scenarioType) return false
  return PARTNER_SUPPORTED_TYPES.includes(scenarioType.toLowerCase())
}

function buildPartnerSystemPrompt(options: {
  scenarioTitle?: string
  scenarioType?: string
  userName?: string
  currentCode?: string
  workspaceContext?: string
  ragContext?: string
}): string {
  const { scenarioTitle, scenarioType, userName, currentCode, workspaceContext, ragContext } =
    options

  let typeSpecificGuidance = ""
  if (scenarioType === "system-design") {
    typeSpecificGuidance = `
SYSTEM DESIGN ASSISTANCE:
- Help brainstorm architectural components and trade-offs
- Suggest relevant technologies, databases, caching strategies
- Discuss scalability patterns (load balancing, sharding, CDNs)
- Help estimate capacity and throughput requirements
- Remind them about common system design topics: consistency vs availability, CAP theorem
`
  } else if (scenarioType === "bugfix") {
    typeSpecificGuidance = `
DEBUGGING ASSISTANCE:
- Help identify potential bug locations through code analysis
- Suggest debugging strategies (print statements, breakpoints, unit tests)
- Explain common bug patterns (off-by-one, null references, race conditions)
- Help trace through code execution with specific inputs
- DON'T just give the answer - guide them to find it
`
  } else if (scenarioType === "add-functionality") {
    typeSpecificGuidance = `
FEATURE IMPLEMENTATION ASSISTANCE:
- Help break down the feature into smaller components
- Suggest design patterns that fit the use case
- Discuss API design and data models
- Help identify edge cases and validation requirements
- Review their approach before they start coding
`
  }

  return `You are an AI coding assistant (similar to ChatGPT, GitHub Copilot, or Claude) that candidates can use during technical interviews, similar to Meta's pilot program allowing AI tools.

CANDIDATE: ${userName || "Candidate"}
PROBLEM: ${scenarioTitle || "Technical Interview"}

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

${typeSpecificGuidance}

IMPORTANT:
- Keep responses SHORT and CONCISE - think of small badge helps, not long explanations. Aim for 2-3 sentences maximum unless the user specifically asks for detailed explanations.
- Use bullet points or brief notes when possible instead of paragraphs.
- The interviewer (Sable) will evaluate how effectively the candidate uses your assistance
- Good AI collaboration means: asking the right questions, understanding the suggestions, and implementing them correctly

${currentCode ? `\nCURRENT CODE:\n${currentCode.slice(0, 5000)}${currentCode.length > 5000 ? "\n// ... [truncated]" : ""}` : ""}
${workspaceContext || ""}
${ragContext || ""}

STAY IN CHARACTER: You are an AI coding assistant helping with the interview. Stay focused on the problem at hand. Do not discuss topics unrelated to coding, algorithms, or the technical interview.

Keep responses brief, actionable, and helpful. You're a tool they can use, but the interviewer will assess how well they collaborate with you.`
}

async function handlePartnerRequest(
  body: ChatRequest,
  startTime: number,
  workspaceContextStr: string,
  ragContext: string
): Promise<NextResponse> {
  // Build partner prompt
  const userName = body.userContext?.full_name?.split(" ")[0] || "Candidate"
  const systemPrompt = buildPartnerSystemPrompt({
    scenarioTitle: body.scenarioTitle,
    scenarioType: body.scenarioType,
    userName,
    currentCode: body.currentCode,
    workspaceContext: workspaceContextStr,
    ragContext,
  })

  // Build conversation history
  const history: Array<{ role: "user" | "model"; content: string }> = []
  const context = body.context || []
  let foundFirstUser = false

  for (const msg of context.slice(-MAX_HISTORY_MESSAGES)) {
    if (!foundFirstUser && msg.type !== "user") continue
    foundFirstUser = true
    history.push({
      role: msg.type === "user" ? "user" : "model",
      content: truncateText(msg.message, MAX_MESSAGE_LENGTH),
    })
  }

  // Build user message with code context
  let fullMessage = body.message || ""
  if (body.currentCode) {
    fullMessage += `\n\n[Current Code]:\n${body.currentCode.slice(0, 5000)}`
  }

  try {
    const response = await generateAIResponse(systemPrompt, fullMessage, history, {
      complexity: "code",
      userId: body.userId,
      sessionId: body.sessionId,
      eventType: "chat_partner",
    })

    logger.info("[Chat-v2] Partner response generated", {
      sessionId: body.sessionId,
      latencyMs: Date.now() - startTime,
      responseLength: response.text.length,
    })

    return NextResponse.json({
      reply: response.text,
      provider: response.provider,
      latencyMs: response.latencyMs,
    })
  } catch (error) {
    logger.error("[Chat-v2] Partner generation failed", { error })
    return NextResponse.json({ error: "Failed to generate partner response" }, { status: 500 })
  }
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

    // ==========================================================================
    // PARTNER ROLE HANDLING
    // Partner (AI coding assistant) available for system-design, bugfix, add-functionality
    // ==========================================================================
    if (body.role === "partner") {
      if (!isPartnerSupported(body.scenarioType)) {
        return NextResponse.json(
          {
            error: `AI Partner not available for scenario type: ${body.scenarioType || "unknown"}. Partner is available for: ${PARTNER_SUPPORTED_TYPES.join(", ")}`,
          },
          { status: 400 }
        )
      }

      // Build contexts for partner
      const workspaceContextStr = body.workspaceContext
        ? buildWorkspaceContextString(body.workspaceContext)
        : ""

      const ragContext = await buildRAGContext({
        scenarioTitle: body.scenarioTitle,
        scenarioPattern: body.scenarioPattern,
        scenarioCompany: body.scenarioCompany,
        scenarioType: body.scenarioType,
        userMessage: body.message,
        userCode: body.currentCode,
      })

      return handlePartnerRequest(body, startTime, workspaceContextStr, ragContext)
    }

    // ==========================================================================
    // CONVERSATION ENDED DETECTION
    // Check if AI already said goodbye - interview is over
    // ==========================================================================
    const recentMessages = body.context?.slice(-4) || []
    const aiAlreadySaidGoodbye = recentMessages.some(
      (msg: { message: string; type?: string }) =>
        msg.type !== "user" &&
        (msg.message?.toLowerCase().includes("good luck with your") ||
          msg.message?.toLowerCase().includes("best of luck") ||
          (msg.message?.toLowerCase().includes("take care") &&
            msg.message?.toLowerCase().includes("interview")))
    )

    if (aiAlreadySaidGoodbye) {
      return NextResponse.json({
        reply: null,
        conversationEnded: true,
        endMessage:
          "The interview session has ended. Click 'View Detailed Feedback' to see your score breakdown and detailed analysis.",
      })
    }

    // ==========================================================================
    // PROACTIVE MESSAGE HANDLING
    // Interviewer jumps in without user message
    // ==========================================================================
    if (body.isProactive) {
      const proactiveResult = buildProactiveContext({
        currentCode: body.currentCode,
        timeSinceLastMessage: body.timeSinceLastMessage,
        partnerMessagesCount: body.partnerMessagesCount,
        lastPartnerExchange: body.lastPartnerExchange,
        recentNudgeTopics: body.recentNudgeTopics,
        userAnsweredTopics: body.userAnsweredTopics,
        scenarioPattern: body.scenarioPattern,
      })

      if (proactiveResult.shouldSkip) {
        return NextResponse.json({
          reply: null,
          skipped: true,
          reason: proactiveResult.reason,
        })
      }

      // Use proactive message as the "lastMessage" for orchestrator
      // The orchestrator will generate an appropriate check-in response
      logger.info("[Chat-v2] Proactive check-in triggered", {
        sessionId: body.sessionId,
        timeSinceLastMessage: body.timeSinceLastMessage,
        hasCode: !!body.currentCode,
      })
    }

    // ==========================================================================
    // WRAP-UP MESSAGE HANDLING
    // End-of-interview debrief
    // ==========================================================================
    if (body.isWrapUp) {
      const testResults = body.testResults || []
      const passedTests = testResults.filter((t: { passed: boolean }) => t.passed).length
      const totalTests = testResults.length
      const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0
      const allTestsPassed = passedTests === totalTests && totalTests > 0
      const elapsedMinutes = body.elapsedTime ? Math.floor(body.elapsedTime / 60) : 0

      // Build wrap-up debrief context
      const wrapUpMessage = buildWrapUpMessage({
        allTestsPassed,
        passedTests,
        totalTests,
        passRate,
        partnerMessagesCount: body.partnerMessagesCount,
        elapsedMinutes,
        currentCode: body.currentCode,
      })

      logger.info("[Chat-v2] Wrap-up debrief requested", {
        sessionId: body.sessionId,
        allTestsPassed,
        passRate: Math.round(passRate),
      })

      // Use wrap-up message as the context for orchestrator
      body.message = wrapUpMessage
    }

    // Build workspace context
    const workspaceContextStr = body.workspaceContext
      ? buildWorkspaceContextString(body.workspaceContext)
      : ""

    // Build RAG context (async - dynamic knowledge retrieval)
    const testResults = body.testResults || []
    const testsPassed = testResults.filter((t) => t.passed).length
    const ragContext = await buildRAGContext({
      scenarioTitle: body.scenarioTitle,
      scenarioPattern: body.scenarioPattern,
      scenarioCompany: body.scenarioCompany,
      scenarioType: body.scenarioType,
      scenarioId: body.scenarioId,
      problemText: body.problemText,
      userCode: body.currentCode,
      userId: body.userId,
      userMessage: body.message,
      testResults:
        testResults.length > 0
          ? {
              passed: testsPassed,
              total: testResults.length,
              failingTests: testResults
                .filter((t) => !t.passed)
                .map((t) => t.description || t.name || "Test failed"),
            }
          : undefined,
    })

    // Build context for orchestrator (uses context-builders for rich context)
    const interviewContext = buildInterviewContextFromRequest(body)

    // Inject workspace and RAG context into promptContext
    if (interviewContext.promptContext) {
      interviewContext.promptContext.workspaceContext = workspaceContextStr
      interviewContext.promptContext.ragContext = ragContext
    }

    const messages = buildMessages(body.context)
    const lastMessage = body.isProactive
      ? buildProactiveContext({
          currentCode: body.currentCode,
          timeSinceLastMessage: body.timeSinceLastMessage,
          partnerMessagesCount: body.partnerMessagesCount,
          lastPartnerExchange: body.lastPartnerExchange,
          recentNudgeTopics: body.recentNudgeTopics,
          userAnsweredTopics: body.userAnsweredTopics,
          scenarioPattern: body.scenarioPattern,
        }).message
      : body.message || ""

    // Log request
    logger.info("[Chat-v2] Processing request", {
      sessionId: interviewContext.sessionId,
      problemTitle: interviewContext.problemTitle,
      messageCount: messages.length,
      testsRun: interviewContext.testsHaveRun,
      hasSubmitted: interviewContext.hasSubmitted,
      isProactive: body.isProactive,
      isWrapUp: body.isWrapUp,
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
      agentCalls: result.metrics?.agentCalls?.map((a) => `${a.agent}:${a.latencyMs}ms`),
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
      latencyMs: result.metrics?.totalLatencyMs || Date.now() - startTime,
      // v2-specific extras
      state: result.data.state,
      metrics: result.metrics
        ? {
            totalLatencyMs: result.metrics.totalLatencyMs,
            agentCalls: result.metrics.agentCalls.map((a) => ({
              agent: a.agent,
              latencyMs: a.latencyMs,
            })),
            retries: result.metrics.retries,
          }
        : undefined,
    })
  } catch (error) {
    const latency = Date.now() - startTime
    logger.error("[Chat-v2] Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: latency,
    })

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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

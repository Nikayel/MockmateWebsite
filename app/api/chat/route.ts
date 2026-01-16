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
// NEW: Phase-aware interview system
import {
  type InterviewPhase,
  type ConversationTracker,
  PHASE_PROMPTS,
  INTERVIEWER_BEHAVIOR_RULES,
  buildTrackingContext,
  getHintGuidance,
  createEmptyTracker,
  updateTrackerFromMessage,
} from "@/lib/interview/interview-phases"
import { buildCompanyInterviewerPrompt } from "@/lib/interview/company-interviewer-styles"

interface UserContext {
  email?: string
  full_name?: string
  subscription_tier?: string
  sessions_used?: number
  previous_topics?: string[]
  skill_level?: string
}

// Context window management constants
const MAX_HISTORY_MESSAGES = 20 // Keep last 20 messages
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
      message:
        msg.message.length > MAX_MESSAGE_LENGTH
          ? msg.message.slice(0, MAX_MESSAGE_LENGTH) + "... [truncated]"
          : msg.message,
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
      message:
        firstMessage.message.length > MAX_MESSAGE_LENGTH
          ? firstMessage.message.slice(0, MAX_MESSAGE_LENGTH) + "... [truncated]"
          : firstMessage.message,
    },
    summaryMessage,
    ...recentMessages.map((msg) => ({
      ...msg,
      message:
        msg.message.length > MAX_MESSAGE_LENGTH
          ? msg.message.slice(0, MAX_MESSAGE_LENGTH) + "... [truncated]"
          : msg.message,
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
    content:
      file.content.length > maxFileSize
        ? file.content.slice(0, maxFileSize) + "\n// ... [file truncated for context management]"
        : file.content,
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
      const passed = testResultsArray.filter((t) => t.passed).length
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

    const systemPrompts = {
      interviewer: `You are Sable, a sharp and direct technical interviewer${isGenericCompany ? "" : ` at ${companyStyle.company}`}. You're known for being brutally honest but fair - you give real signal, not empty praise.

YOUR PERSONALITY:
- Direct and no-nonsense, but not mean
- You've seen hundreds of interviews - you know what good looks like
- You use casual language ("Nice", "Hmm", "Walk me through that", "Let's see...")
- You're genuinely curious about how candidates think
- You call out BS but also celebrate genuine insight
- Occasional dry humor is fine: "Bold choice" when they pick a suboptimal approach
- You're not a robot - react naturally to what they say

THINGS SABLE SAYS:
- "Interesting - what made you go with that approach?"
- "Hmm, let's trace through that with a concrete example"
- "Bold. What's plan B if that doesn't work?"
- "Good instinct there"
- "I'm not following - can you break that down?"
- "Before you code, convince me this works"
- "What's the gotcha here? There's always a gotcha"

THINGS SABLE NEVER SAYS:
- "Great question!" (you ask the questions, not them)
- "That's absolutely correct!" (too eager)
- "I appreciate you sharing that" (too formal)
- Long paragraphs of praise
- Generic encouragement without substance

${companyContext}
${userContextString}${problemContext}
${levelContext}
${isSystemDesign ? systemDesignContext : isBugFix ? bugFixContext : patternContext}
${edgeCaseContext}
${consoleContext}

${(() => {
  // Build phase-specific context
  const phase = (hasSubmitted ? 'post_interview' : interviewPhase) as InterviewPhase || 'discussion'
  const phasePrompt = PHASE_PROMPTS[phase] || PHASE_PROMPTS.discussion

  // Build conversation tracking context if available
  let trackingContext = ''
  if (conversationTracker) {
    trackingContext = buildTrackingContext(conversationTracker as ConversationTracker)
  }

  // Build hint guidance if hints have been given
  const hintsGiven = (conversationTracker as ConversationTracker)?.hintsGiven || 0
  const hintGuidance = hintsGiven > 0 ? getHintGuidance(hintsGiven) : ''

  return `
${phasePrompt}
${trackingContext}
${hintGuidance}
${INTERVIEWER_BEHAVIOR_RULES}
`
})()}

INTERVIEW STYLE - ACT LIKE A REAL INTERVIEWER:
You are having a natural conversation with the candidate. They may:
- Talk through their thinking aloud (encourage this!)
- Type code while explaining their approach
- Ask clarifying questions
- Get stuck or go quiet

YOUR BEHAVIOR AS A REAL INTERVIEWER:
1. LISTEN ACTIVELY: When they explain their thinking, respond naturally like you're in the same room
2. JUMP IN NATURALLY: If they pause or seem stuck, ask a guiding question (don't wait for them to ask)
3. PROBE THEIR REASONING: "Why did you choose that approach?" "What's the tradeoff there?"
4. CHALLENGE CONSTRUCTIVELY: "What if the input was very large?" "Have you considered edge cases?"
5. ENCOURAGE VERBALIZATION: "Walk me through your thought process" "What are you thinking?"

CORE RULES:
- Keep responses SHORT (2-4 sentences max)
- Ask ONE question at a time
${isGenericCompany ? "- Conduct a standard technical interview without mentioning any company" : `- Adapt your style to ${companyStyle.company}'s interview culture`}
- No generic praise until tests pass
- Sound natural, conversational, like a real person

PROACTIVE ENGAGEMENT (JUMP IN WHEN):
- They've been silent for a while: "What are you thinking about?"
- They write code without explaining: "Can you walk me through that?"
- They seem stuck: "Would it help to think about a simpler case first?"
- They make an interesting choice: "Interesting approach - what led you to that?"
- They might have a bug: "Let's trace through with an example - what happens with [input]?"

USE CONCRETE EXAMPLES PROACTIVELY:
When a candidate shows conceptual confusion (like mixing up keys vs values in a hash map), don't just ask abstract questions. Offer a concrete trace:
- "Let's try a specific example: with nums=[2,7] and target=9, what happens when we're at index 1?"
- "If your map is {2: 0} at this point, what would map[7] return?"
- "Walk me through: when c=7, what's target - c?"
Ground abstract concepts in concrete values to help them see the issue.

COMPANY-SPECIFIC FOLLOW-UPS:
${companyStyle.commonFollowUps
  .slice(0, 3)
  .map((q) => `- ${q}`)
  .join("\n")}

WHAT TO DO:
- When they share code: Ask about complexity OR edge cases (pick one)
- When they explain: Acknowledge briefly, then probe deeper with ONE follow-up
- When stuck: Give a small hint, not a lecture
- When tests pass: Give retrospective feedback (see AFTER TESTS PASS section)
- When they verbalize their thinking: Respond like a real interviewer would

BEFORE LETTING THEM CODE - VALIDATE THEIR APPROACH:
When a candidate proposes an approach (e.g., "I'll use a hash map"), probe BEFORE they start coding:

1. PROBE ALTERNATIVES (ask ONE):
   - "What made you choose that over [alternative]?" (e.g., sorting, brute force, two pointers)
   - "Did you consider any other approaches?"
   - "Why not just use brute force here?"

2. PROBE TRADE-OFFS (ask ONE):
   - "What's the trade-off with that approach?"
   - "What are you giving up for that speed?"
   - "What's the space cost?"

3. THEN APPROVE AND LET THEM CODE:
   - "Good reasoning. Go ahead and code it."
   - "Right, that makes sense. Let's see it."

EXAMPLE GOOD FLOW:
Candidate: "I'll use a hash map to get O(n) time"
You: "What made you choose that over sorting?"
Candidate: "Sorting is O(n log n), hash map gives O(n)"
You: "What's the trade-off?"
Candidate: "O(n) extra space"
You: "Right. Go ahead and code it up."

EXAMPLE BAD FLOW (what we want to avoid):
Candidate: "I'll use a hash map"
You: "Sounds good, go ahead and code it" ← Missed opportunity to probe!

NOTE: This is ONE quick exchange, not an interrogation. If they already mentioned trade-offs unprompted, skip straight to "go ahead and code it."

WHEN TO LET THEM CODE (CRITICAL - DON'T OVER-QUESTION):
Real interviewers don't ask endless clarifying questions. Once the candidate has:
1. Explained their approach clearly (e.g., "I'll use two pointers...")
2. Walked through an example showing they understand the mechanics
3. Addressed any major gaps you probed

Then SAY: "Sounds good, go ahead and code it up" or "That makes sense - let's see it in code"

DO NOT keep asking implementation questions once they've demonstrated understanding.
Signs they're ready to code:
- They've traced through a concrete example correctly
- They know the core data structure/algorithm they'll use
- They can explain WHY their approach works

If they ask "Can I start coding?" - the answer is almost always YES. Don't add more questions.

SMART QUESTIONING (AVOID REPETITION):
- If you've asked about the same concept twice and they're still confused, DON'T ask the same question a third time
- Instead, give a CONCRETE NUDGE with a specific example:
  - "Let me make this concrete - if seen[7] returns 0, what does that tell us?"
  - "Let's trace through: if we store index->number, and we want to find the number 7, how would we look it up?"
  - "Think about what you're looking up - the number or the index? Which one is the key?"
- Use concrete values (7, 0, 2) instead of abstract descriptions
- After the nudge, let them work through it - don't immediately give the answer

ACCEPT CORRECT LOGIC (VERY IMPORTANT):
When a candidate explains their approach and it's ACTUALLY CORRECT, you MUST:
1. ACKNOWLEDGE they are right: "You're right, that works because..."
2. DON'T keep pushing back if their logic is valid
3. Move on to the next topic (complexity, edge cases, or run tests)

Examples of VALID approaches you should NOT challenge:
- In-place tree mutation (swap-then-recurse OR recurse-then-swap are BOTH valid)
- Not storing recursive return values when mutating in-place (mutation doesn't need return values)
- Using iteration vs recursion (both are valid)
- Different variable naming conventions

If you suggested something incorrect and the candidate corrects you:
1. Acknowledge your mistake: "You're right, I misspoke"
2. Confirm their correct understanding
3. Move forward - don't double down on wrong advice

NEVER:
- Keep challenging a correct solution because you want to "find something wrong"
- Insist on storing return values when in-place mutation is being used correctly
- Push back on valid algorithmic approaches just to seem thorough

HANDLING PLATFORM ISSUES (VERY IMPORTANT):
When a candidate says things like:
- "it's not letting me"
- "I can't edit the code"
- "the editor is not working"
- "I can't make changes"
- "it's not saving"
- Any indication of frustration with the PLATFORM (not the problem)

DO THIS:
1. IMMEDIATELY acknowledge the technical difficulty: "That sounds like a platform issue - let me note that."
2. DON'T keep asking them to fix the code if they say they can't
3. Ask them to DESCRIBE what they would change verbally instead
4. Say something like: "Since you're having trouble with the editor, can you tell me what you would change and why?"
5. If they've already explained the fix verbally, acknowledge it: "Right, removing those extra parentheses would fix it. Good catch."

NEVER:
- Repeat the same instruction if they've said they can't do it
- Tell them to "go ahead and make that change" after they said they can't
- Ignore their frustration about the platform
- Sound dismissive of technical difficulties

AFTER TESTS PASS - FOLLOW-UP QUESTIONS & DEBRIEF:
When the candidate passes all tests, DON'T just end it! Real interviewers always ask follow-up questions.

FOLLOW-UP SEQUENCE (ask in order, pick 1-2):

1. COMPLEXITY ANALYSIS (always ask):
   - "What's the time and space complexity?"
   - If they're wrong, probe: "Are you sure about that? Walk me through it."

2. OPTIMIZATION FOLLOW-UP (ask ONE):
   - "Could you do this with O(1) space instead?"
   - "What if the array was sorted - would that change your approach?"
   - "Is there a way to solve this without extra memory?"
   - "What if we needed to handle this in a streaming fashion?"

3. VARIATION QUESTIONS (ask ONE if time permits):
   - "What if there could be multiple valid answers?"
   - "How would you modify this if the input could have duplicates?"
   - "What if the input was too large to fit in memory?"
   - "What would change if we needed to return all solutions, not just one?"

4. THEN GIVE DEBRIEF (be specific and honest):
   - ONE thing they did well (specific example from the interview)
   - ONE thing to improve (be constructive but direct)
   - Brief overall assessment

EXAMPLE GOOD FLOW:
Candidate: "All tests pass!"
You: "Nice. What's the time complexity of your solution?"
Candidate: "O(n) time, O(n) space"
You: "Right. Quick follow-up - could you solve this with O(1) space if the array was sorted?"
Candidate: [discusses two-pointer approach]
You: "Exactly. Good instinct. Overall - you communicated well and your hash map approach was solid. One thing to work on: you dove into code quickly without discussing edge cases first. I had to ask about empty input. In real interviews, mention those upfront. When you're ready, click 'End Session' for your detailed breakdown."

EXAMPLE BAD (too short, no follow-up):
"Tests pass. O(n) is correct. Click end session."

PERSONALITY IN DEBRIEF:
- Be direct but not harsh: "That part was rough" not "That was terrible"
- Acknowledge struggle that led to growth: "You were stuck on the hash map direction for a bit, but once you got it, you executed well"
- Give actionable feedback: "Next time, trace through a small example before coding"

CONVERSATION CONTINUITY:
Keep interviewing until the candidate explicitly says goodbye (e.g., "bye", "goodbye") or clicks End Session. Short replies like "ok", "thanks", "cool", "got it" are normal acknowledgments - continue with your next question.

WHAT NOT TO DO:
- Don't give long speeches or multiple questions at once
- Don't say "Great question!" or "That's a good point!" repeatedly
- Don't summarize what they just said back to them
- Don't be robotic or overly formal
- Don't ask the same clarifying question more than twice - switch to concrete examples

${scenarioTitle ? `Problem: ${scenarioTitle}` : ""}

You've already introduced yourself. Continue naturally. Use their first name only. Remember: this is a CONVERSATION, not a Q&A session.`,

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

      // Keep proactive message SHORT and natural - like a real interviewer jumping in
      fullUserMessage = `[NATURAL CHECK-IN] The candidate has been working on code. Act like a real interviewer who just noticed something interesting or wants to understand their thinking.

${currentCodeContext}
${aiPartnerContext}
${patternSpecificQuestion}
${nudgeAvoidance}

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
            "The interview session has ended. Click 'Submit or View detailed feedback' to see your detailed feedback and score breakdown.",
        })
      }

      // Regular message - let the AI naturally handle conversation flow
      // The AI will determine if this is a farewell based on full context
      fullUserMessage = message
      if (workspaceContextStr || currentCodeContext) {
        fullUserMessage += workspaceContextStr + currentCodeContext
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

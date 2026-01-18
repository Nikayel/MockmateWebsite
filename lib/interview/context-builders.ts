/**
 * Context Builders - Reusable context generation for interview AI
 *
 * Extracted from /api/chat route to enable DRY usage across:
 * - v1 chat route (legacy)
 * - v2 orchestrator (multi-agent)
 *
 * Single Responsibility: Each builder handles one type of context.
 * DRY: Both routes import from here instead of duplicating logic.
 */

import { getCompanyStyle, getPatternMetadata, type DSAPattern } from "@/lib/types/dsa-patterns"
import type { CompanyId } from "@/lib/data/company-questions/types"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import { getCompanyInterviewKnowledge } from "@/lib/rag/knowledge-base/company-knowledge"
import { buildInterviewerLevelContext, type InterviewLevel } from "@/lib/rag/knowledge-base/interview-behavior-knowledge"
import type { ConversationTracker, InterviewPhase } from "./interview-phases"

// =============================================================================
// TYPES
// =============================================================================

export interface UserInfo {
  email?: string
  full_name?: string
  subscription_tier?: string
  sessions_used?: number
  previous_topics?: string[]
  skill_level?: string
}

export interface TestResultItem {
  description?: string
  passed?: boolean
  input?: unknown
  expected?: unknown
  actual?: unknown
  error?: string | null
}

export interface EdgeCase {
  description: string
  input: unknown
}

export interface SolutionComplexity {
  estimated?: string
  optimal?: string
  isOptimal?: boolean
  timeComplexity?: string
  spaceComplexity?: string
}

export interface ContextBuilderOptions {
  // Scenario info
  scenarioTitle?: string
  scenarioType?: string
  scenarioPattern?: string
  scenarioCompany?: string

  // User info
  userInfo?: UserInfo

  // Code state
  currentCode?: string
  starterCodeLength?: number

  // Test results
  testResults?: TestResultItem[]
  consoleLogs?: Array<{ type?: string; message?: string }>

  // Interview state
  currentPhase?: InterviewPhase
  tracker?: ConversationTracker
  hasSubmitted?: boolean
  solutionComplexity?: SolutionComplexity

  // Special modes
  realInterviewMode?: boolean
  hasFuzzyStatement?: boolean
  edgeCases?: EdgeCase[]

  // Time tracking
  elapsedTime?: number
  timeSinceLastMessage?: number

  // AI Partner tracking
  partnerMessagesCount?: number
  lastPartnerExchange?: string

  // Nudge tracking
  recentNudgeTopics?: string[]
  userAnsweredTopics?: string[]
}

// =============================================================================
// USER CONTEXT
// =============================================================================

/**
 * Build user context string for personalized responses
 */
export function buildUserContext(userInfo?: UserInfo): { context: string; userName: string } {
  if (!userInfo) {
    return { context: "", userName: "there" }
  }

  // Extract first name or last name
  let userName = "there"
  if (userInfo.full_name) {
    const nameParts = userInfo.full_name.trim().split(/\s+/)
    userName = nameParts[0] || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "")
  } else if (userInfo.email) {
    const emailName = userInfo.email.split("@")[0]
    const nameParts = emailName.split(".")
    if (nameParts.length > 0) {
      userName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
    }
  }

  const context = `
CANDIDATE INFORMATION:
- Name: ${userName} (use first name or last name only, never full name)
- Email: ${userInfo.email || "Guest User"}
- Subscription: ${userInfo.subscription_tier || "free"} tier
- Sessions completed: ${userInfo.sessions_used || 0}
- Previous topics: ${userInfo.previous_topics?.join(", ") || "None"}
- Skill level: ${userInfo.skill_level || "Intermediate"}

IMPORTANT: When referencing the candidate, use their first name or last name only (e.g., "John" or "Smith"), never their full name. Keep it casual and professional.
`
  return { context, userName }
}

// =============================================================================
// COMPANY CONTEXT
// =============================================================================

/**
 * Build company-specific interview context
 */
export function buildCompanyContext(scenarioCompany?: string): string {
  const companyStyle = getCompanyStyle(scenarioCompany || "Generic")
  const isGenericCompany = !companyStyle.company || companyStyle.company === "Generic"

  if (isGenericCompany) {
    return `
INTERVIEW STYLE: ${companyStyle.style}
YOU ARE: A professional technical interviewer conducting a coding interview. Do NOT mention any specific company name.

FOCUS AREAS: ${companyStyle.focusAreas.join(", ")}
EVALUATION EMPHASIS: ${companyStyle.evaluationEmphasis.join(", ")}
PERSONALITY: ${companyStyle.interviewerPersonality}
`
  }

  return `
COMPANY: ${companyStyle.company}
INTERVIEW STYLE: ${companyStyle.style}
YOU ARE: A ${companyStyle.company} interviewer conducting a technical interview.
Mention you're interviewing for ${companyStyle.company} in your first response.

FOCUS AREAS: ${companyStyle.focusAreas.join(", ")}
EVALUATION EMPHASIS: ${companyStyle.evaluationEmphasis.join(", ")}
PERSONALITY: ${companyStyle.interviewerPersonality}
`
}

// =============================================================================
// PATTERN CONTEXT
// =============================================================================

/**
 * Build pattern-specific context for DSA problems
 */
export function buildPatternContext(scenarioPattern?: string): string {
  if (!scenarioPattern) return ""

  const patternMeta = getPatternMetadata(scenarioPattern as DSAPattern)
  if (!patternMeta) return ""

  return `
PROBLEM PATTERN: ${patternMeta.name}
KEY TECHNIQUES: ${patternMeta.keyTechniques.join(", ")}
EXPECTED COMPLEXITY: Time ${patternMeta.timeComplexityHints[0]}, Space ${patternMeta.spaceComplexityHints[0]}
PATTERN-SPECIFIC FOLLOW-UPS TO ASK:
${patternMeta.interviewerFollowUps
  .slice(0, 3)
  .map((q) => `- ${q}`)
  .join("\n")}
`
}

// =============================================================================
// EDGE CASE CONTEXT
// =============================================================================

/**
 * Build edge case context for interviewer to ask about
 */
export function buildEdgeCaseContext(edgeCases?: EdgeCase[]): string {
  if (!edgeCases || !Array.isArray(edgeCases) || edgeCases.length === 0) {
    return ""
  }

  return `
EDGE CASES YOU MUST ASK ABOUT:
These are specific edge cases for this problem. You MUST ask about at least ONE before they run tests:
${edgeCases
  .slice(0, 4)
  .map((ec) => `- "${ec.description}": What happens with input ${JSON.stringify(ec.input)}?`)
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
}

// =============================================================================
// TEST RESULTS CONTEXT
// =============================================================================

/**
 * Build console/test results context for interviewer awareness
 */
export function buildTestResultsContext(testResults?: TestResultItem[], consoleLogs?: Array<{ type?: string; message?: string }>): string {
  if (!testResults || !Array.isArray(testResults) || testResults.length === 0) {
    return ""
  }

  const passed = testResults.filter((t) => t.passed).length
  const total = testResults.length
  const allPassed = passed === total

  let context = `
CONSOLE & TEST RESULTS (IMPORTANT - BE AWARE OF THIS):
Tests have been run: ${passed}/${total} passed ${allPassed ? "✓ ALL PASSING" : "✗ SOME FAILING"}

${testResults
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
- Ask them to debug: "Looks like test ${testResults.findIndex((t) => !t.passed) + 1} is failing - what do you think is happening there?"
- Help them trace through the failing case`
}
`

  // Add console logs if available
  if (consoleLogs && Array.isArray(consoleLogs) && consoleLogs.length > 0) {
    const recentLogs = consoleLogs.slice(-5)
    context += `
RECENT CONSOLE OUTPUT:
${recentLogs.map((log) => `[${log.type || "log"}] ${log.message || ""}`).join("\n")}
`
  }

  return context
}

// =============================================================================
// COMPLEXITY CONTEXT
// =============================================================================

/**
 * Build solution complexity context
 */
export function buildComplexityContext(solutionComplexity?: SolutionComplexity): string {
  if (!solutionComplexity) return ""

  const { estimated, optimal, isOptimal } = solutionComplexity

  if (isOptimal) {
    return `
SOLUTION COMPLEXITY:
- Candidate's solution appears to be ${estimated} which matches the optimal ${optimal}
- DO NOT ask "can you optimize this?" - their solution is already optimal
- Instead: ask about trade-offs, edge cases, or alternative approaches
- Good questions: "Could you trade space for time?", "What edge cases might we be missing?", "What's another way to solve this?"`
  }

  return `
SOLUTION COMPLEXITY:
- Candidate's solution appears to be ${estimated}
- Optimal solution would be ${optimal}
- You CAN ask about optimization: "Could you do better than ${estimated}?" or "Is there a way to avoid the nested loop?"`
}

// =============================================================================
// SYSTEM DESIGN CONTEXT
// =============================================================================

/**
 * Build system design specific context with phase-based guidance
 */
export function buildSystemDesignContext(elapsedTime?: number): string {
  const elapsedMinutes = elapsedTime ? Math.floor(elapsedTime / 60) : 0

  const getPhase = (minutes: number) => {
    if (minutes < 10) return "requirements"
    if (minutes < 20) return "high-level"
    if (minutes < 35) return "deep-dive"
    return "wrap-up"
  }

  const phase = getPhase(elapsedMinutes)

  const phaseGuidance: Record<string, string> = {
    requirements: `
REQUIREMENTS PHASE (0-10 min):
- Ask clarifying questions about scope and scale
- Help candidate define functional requirements (what the system must do)
- Help candidate define non-functional requirements (latency, availability, scale)
- Ask: "How many users?" "What's the expected traffic?" "What's more important: consistency or availability?"
- DON'T jump into architecture yet - requirements first!
`,
    "high-level": `
HIGH-LEVEL DESIGN PHASE (10-20 min):
- Guide candidate to draw the major components
- Ask about API design: "What endpoints do we need?"
- Ask about data model: "What entities do we need to store?"
- Ask about communication: "How will components communicate?"
- Encourage thinking out loud about architectural choices
`,
    "deep-dive": `
DEEP DIVE PHASE (20-35 min):
- Pick 1-2 components to explore deeply
- Ask about scaling: "What happens at 10x traffic?"
- Ask about failure modes: "What if this component fails?"
- Discuss trade-offs: "Why did you choose X over Y?"
- Probe on specific algorithms or data structures for key components
`,
    "wrap-up": `
WRAP-UP PHASE (35-45 min):
- Ask about single points of failure
- Discuss monitoring and observability
- Ask about security considerations
- Summarize the design and discuss improvements
- Ask: "What would you do differently with more time?"
`,
  }

  return `
INTERVIEW TYPE: System Design (Architecture Discussion - NOT a coding interview)

CURRENT PHASE: ${phase.toUpperCase()} (${elapsedMinutes} min elapsed)

PHASE GUIDANCE:
${phaseGuidance[phase] || ""}

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
`
}

// =============================================================================
// BUG FIX CONTEXT
// =============================================================================

/**
 * Build bug fix specific context
 */
export function buildBugFixContext(): string {
  return `
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

DO NOT:
- Give away the bug location or fix too quickly
- Accept a fix without understanding the root cause
- Let them blindly try things without reasoning
`
}

// =============================================================================
// REAL INTERVIEW MODE CONTEXT
// =============================================================================

/**
 * Build real interview mode context (fuzzy problem statements)
 */
export function buildFuzzyModeContext(realInterviewMode?: boolean, hasFuzzyStatement?: boolean): string {
  if (!realInterviewMode || !hasFuzzyStatement) return ""

  return `
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

// =============================================================================
// PROACTIVE MESSAGE CONTEXT
// =============================================================================

/**
 * Build proactive message for interviewer jumping in
 */
export function buildProactiveContext(options: {
  currentCode?: string
  timeSinceLastMessage?: number
  partnerMessagesCount?: number
  lastPartnerExchange?: string
  recentNudgeTopics?: string[]
  userAnsweredTopics?: string[]
  scenarioPattern?: string
}): { shouldSkip: boolean; message: string; reason?: string } {
  const {
    currentCode,
    timeSinceLastMessage = 0,
    partnerMessagesCount,
    lastPartnerExchange,
    recentNudgeTopics,
    userAnsweredTopics,
    scenarioPattern,
  } = options

  const hasSubstantialCode = currentCode && currentCode.trim().length > 100
  const shouldTimeBasedCheckIn = timeSinceLastMessage >= 120 // 2 minutes

  // Don't interrupt if no code and not silent too long
  if (!hasSubstantialCode && !shouldTimeBasedCheckIn) {
    return {
      shouldSkip: true,
      message: "",
      reason: "Not enough code to comment on yet and not silent long enough",
    }
  }

  // Time-based check-in without code
  if (shouldTimeBasedCheckIn && !hasSubstantialCode) {
    return {
      shouldSkip: false,
      message: `[TIME-BASED CHECK-IN] The candidate has been quiet for ${Math.floor(timeSinceLastMessage / 60)} minutes without writing substantial code.

Act like a real interviewer who notices someone is quiet:
- "How are you thinking about this problem?"
- "What's going through your mind?"
- "Would it help to talk through your approach?"
- "Are you stuck on something specific?"

Pick ONE natural response (under 20 words). Don't be pushy - they might be thinking.`,
    }
  }

  // Build context parts
  const parts: string[] = []

  // AI Partner usage
  if (partnerMessagesCount && partnerMessagesCount > 0) {
    parts.push(`
AI PARTNER USAGE ALERT:
- Candidate has used AI Partner ${partnerMessagesCount} times this session
${lastPartnerExchange ? `- Last AI interaction: "${lastPartnerExchange.slice(0, 200)}..."` : ""}
${partnerMessagesCount >= 5 ? `- HIGH AI USAGE: Consider asking them to explain their understanding of the AI suggestions` : ""}
${partnerMessagesCount >= 3 ? `- When they explain code, verify they understand it vs. blindly copied it` : ""}
`)
  }

  // Pattern-specific question
  if (scenarioPattern) {
    parts.push(`Based on the ${scenarioPattern} pattern, ask a relevant question about their approach or potential issues.`)
  }

  // Nudge avoidance
  if (recentNudgeTopics && recentNudgeTopics.length > 0) {
    parts.push(`
AVOID REPEATING THESE TOPICS (already asked about):
${recentNudgeTopics.slice(-3).map((t) => `- ${t}`).join("\n")}
If they're still stuck on these, give a CONCRETE hint instead of asking again.
`)
  }

  // User-answered topics
  if (userAnsweredTopics && userAnsweredTopics.length > 0) {
    parts.push(`
CANDIDATE HAS ALREADY ANSWERED (do NOT ask about these again):
${userAnsweredTopics.slice(-5).map((t) => `- ${t}`).join("\n")}
If you want to discuss these topics, ACKNOWLEDGE their answer first, then probe DEEPER or move on.
`)
  }

  const proactivePrompts = [
    "Walk me through what you're doing here.",
    "What's your approach for this?",
    "Can you explain your thought process?",
    "What's the time complexity of this approach?",
    "Have you considered any edge cases?",
  ]

  return {
    shouldSkip: false,
    message: `[NATURAL CHECK-IN] The candidate has been working on code. Act like a real interviewer who just noticed something interesting or wants to understand their thinking.

${parts.join("\n")}

Options for how to engage:
${proactivePrompts.slice(0, 3).map((p) => `- "${p}"`).join("\n")}

Pick ONE natural response (or create your own). Keep it under 20 words. Sound like a real person in the room, not a robot.`,
  }
}

// =============================================================================
// LEVEL CONTEXT
// =============================================================================

/**
 * Build level-specific interviewer context
 */
export function buildLevelContext(skillLevel?: string): string {
  const candidateLevel = (skillLevel || "intermediate").toLowerCase() as InterviewLevel
  return buildInterviewerLevelContext(candidateLevel)
}

// =============================================================================
// RAG KNOWLEDGE CONTEXT (lightweight version - no async)
// =============================================================================

/**
 * Build pattern knowledge context from RAG
 */
export function buildPatternKnowledgeContext(scenarioPattern?: string): string {
  if (!scenarioPattern) return ""

  const patternKnowledge = getPatternKnowledge(scenarioPattern as DSAPattern)
  if (!patternKnowledge) return ""

  return `
## Pattern Knowledge: ${patternKnowledge.displayName}

### When to Use
${patternKnowledge.whenToUse.slice(0, 3).map((w) => `- ${w}`).join("\n")}

### Key Insights
${patternKnowledge.keyInsights.slice(0, 3).map((i) => `- ${i}`).join("\n")}

### Common Mistakes to Avoid
${patternKnowledge.commonMistakes.slice(0, 2).map((m) => `- ${m}`).join("\n")}

### Expected Complexity
- Time: ${patternKnowledge.timeComplexity.typical}
- Space: ${patternKnowledge.spaceComplexity.typical}
`
}

/**
 * Build company interview knowledge context
 */
export function buildCompanyKnowledgeContext(scenarioCompany?: string): string {
  if (!scenarioCompany || scenarioCompany === "Generic") return ""

  const companyKnowledge = getCompanyInterviewKnowledge(scenarioCompany as CompanyId)
  if (!companyKnowledge) return ""

  return `
## ${companyKnowledge.companyName} Interview Tips

### Interview Style
${companyKnowledge.interviewStyle.description}
Pace: ${companyKnowledge.interviewStyle.pace}
Expectations: ${companyKnowledge.interviewStyle.expectations.slice(0, 3).map((e) => `- ${e}`).join("\n")}

### Focus Areas
${companyKnowledge.topPatterns.slice(0, 4).map((p) => `- ${p.pattern}`).join("\n")}

### What They Value
${companyKnowledge.cultureTips.slice(0, 2).map((t) => `- ${t}`).join("\n")}
`
}

// =============================================================================
// CODE CONTEXT
// =============================================================================

const MAX_CODE_SIZE = 10000 // 10KB max for code context

/**
 * Build code context for the interviewer to see the current solution
 */
export function buildCodeContext(currentCode?: string, starterCodeLength?: number): string {
  if (!currentCode || !currentCode.trim()) {
    return ""
  }

  // Check if code has changed from starter
  const codeLength = currentCode.length
  const hasWrittenCode = starterCodeLength ? codeLength > starterCodeLength + 50 : codeLength > 100

  if (!hasWrittenCode) {
    return "" // Don't include if they haven't written anything
  }

  // Truncate if too long
  const truncatedCode = currentCode.length > MAX_CODE_SIZE
    ? currentCode.slice(0, MAX_CODE_SIZE) + "\n// ... [code truncated]"
    : currentCode

  return `
=== CURRENT SOLUTION CODE ===
${truncatedCode}
=== END CURRENT CODE ===

IMPORTANT: You can see their code above. Reference specific lines if discussing bugs or improvements.
`
}

// =============================================================================
// COMBINED CONTEXT BUILDER
// =============================================================================

/**
 * Build all interview context in one call
 * Returns structured context that can be injected into prompts
 */
export function buildInterviewContext(options: ContextBuilderOptions): {
  userContext: string
  userName: string
  companyContext: string
  patternContext: string
  edgeCaseContext: string
  testResultsContext: string
  complexityContext: string
  typeSpecificContext: string // System design or bug fix
  fuzzyModeContext: string
  levelContext: string
  knowledgeContext: string
  codeContext: string // Current solution code
} {
  const { context: userContext, userName } = buildUserContext(options.userInfo)

  // Determine type-specific context
  let typeSpecificContext = ""
  if (options.scenarioType === "system-design") {
    typeSpecificContext = buildSystemDesignContext(options.elapsedTime)
  } else if (options.scenarioType === "bugfix") {
    typeSpecificContext = buildBugFixContext()
  }

  // Build knowledge context
  const knowledgeContext = [
    buildPatternKnowledgeContext(options.scenarioPattern),
    buildCompanyKnowledgeContext(options.scenarioCompany),
  ].filter(Boolean).join("\n")

  return {
    userContext,
    userName,
    companyContext: buildCompanyContext(options.scenarioCompany),
    patternContext: buildPatternContext(options.scenarioPattern),
    edgeCaseContext: buildEdgeCaseContext(options.edgeCases),
    testResultsContext: buildTestResultsContext(options.testResults, options.consoleLogs),
    complexityContext: buildComplexityContext(options.solutionComplexity),
    typeSpecificContext,
    fuzzyModeContext: buildFuzzyModeContext(options.realInterviewMode, options.hasFuzzyStatement),
    levelContext: buildLevelContext(options.userInfo?.skill_level),
    knowledgeContext: knowledgeContext ? `\n=== RAG KNOWLEDGE ===\n${knowledgeContext}\n=== END RAG ===\n` : "",
    codeContext: buildCodeContext(options.currentCode, options.starterCodeLength),
  }
}

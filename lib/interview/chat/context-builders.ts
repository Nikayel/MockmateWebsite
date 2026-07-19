import { getCompanyStyle, getPatternMetadata, type DSAPattern } from "@/lib/types/dsa-patterns"
import {
  MAX_FILE_SIZE,
  manageContextWindow,
  manageWorkspaceContext,
  type WorkspaceContextItem,
} from "@/lib/interview/context-window"
import type {
  ConsoleLogItem,
  TestResultItem,
  UserContext,
} from "@/lib/interview/chat-request-schema"
import type { InterviewLevel } from "@/lib/rag/knowledge-base/interview-behavior-knowledge"
import { buildPackStatePrompt } from "@/lib/bugfix/packs/prompt"
import type { PackState } from "@/lib/bugfix/packs/machine"
import { getFlag } from "@/lib/feature-flags"

export interface CompanyPromptContext {
  companyStyle: ReturnType<typeof getCompanyStyle>
  companyContext: string
  isGenericCompany: boolean
}

export interface SystemDesignPromptContext {
  isSystemDesign: boolean
  elapsedMinutes: number
  systemDesignPhase: ReturnType<typeof getSystemDesignPhase> | null
  systemDesignContext: string
}

export interface UserPersonalizationContext {
  userName: string
  userContextString: string
  candidateLevel: InterviewLevel
}

export interface SolutionComplexityContext {
  estimated?: string
  optimal?: string
  optimalSpace?: string
  isOptimal?: boolean
}

export function buildUserPersonalizationContext(
  userInfo: UserContext | undefined
): UserPersonalizationContext {
  let userName = "there"
  if (userInfo?.full_name) {
    const nameParts = userInfo.full_name.trim().split(/\s+/)
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

IMPORTANT: - Do NOT use their name in every response. Real interviewers rarely say the candidate's name mid-interview.
- You may use their first name once at the very start (e.g. "Hey ${userName}, take your time reading...") or sparingly when wrapping up. 
Otherwise, just ask questions naturally without naming them (e.g. "Walk me through your approach" not "X, walk me through your approach").
`
    : ""

  return {
    userName,
    userContextString,
    candidateLevel: (userInfo?.skill_level || "intermediate").toLowerCase() as InterviewLevel,
  }
}

export function buildWorkspaceContextString(
  workspaceContext: WorkspaceContextItem[] | undefined
): string {
  const managedWorkspace = manageWorkspaceContext(workspaceContext || [])
  if (managedWorkspace.length === 0) {
    return ""
  }

  let workspaceContextStr = "\n\n=== USER'S CODEBASE CONTEXT ===\n"
  managedWorkspace.forEach((file) => {
    const metadata = [
      file.role ? `role=${file.role}` : null,
      file.active ? "active=true" : null,
      file.edited ? "edited=true" : null,
      file.description ? `description=${file.description}` : null,
    ]
      .filter(Boolean)
      .join("; ")
    workspaceContextStr += `\n--- File: ${file.path}${metadata ? ` (${metadata})` : ""} ---\n${file.content} \n`
  })
  workspaceContextStr += "\n=== END CODEBASE CONTEXT ===\n"
  return workspaceContextStr
}

export function buildCurrentCodeContext(currentCode: string | undefined): string {
  if (!currentCode || !currentCode.trim()) {
    return ""
  }

  const truncatedCode =
    currentCode.length > MAX_FILE_SIZE
      ? currentCode.slice(0, MAX_FILE_SIZE) + "\n// ... [code truncated]"
      : currentCode
  return `\n\n === CURRENT SOLUTION CODE ===\n${truncatedCode} \n === END CURRENT CODE ===\n`
}

export function buildProblemContext(
  scenarioTitle: string | undefined,
  scenarioType: string | undefined
): string {
  return scenarioTitle
    ? `\n\nCURRENT PROBLEM: ${scenarioTitle}${scenarioType ? ` (${scenarioType.toUpperCase()})` : ""} \n`
    : ""
}

export function buildCompanyPromptContext(
  scenarioCompany: string | null | undefined
): CompanyPromptContext {
  const companyStyle = getCompanyStyle(scenarioCompany || "Generic")
  const isGenericCompany = !companyStyle.company || companyStyle.company === "Generic"
  const companyContext = isGenericCompany
    ? `
INTERVIEW STYLE: ${companyStyle.style}
YOU ARE: A professional technical interviewer conducting a coding interview.Do NOT mention any specific company name.

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

  return { companyStyle, companyContext, isGenericCompany }
}

export function buildPatternPromptContext(scenarioPattern: string | undefined): {
  patternMeta: ReturnType<typeof getPatternMetadata> | null
  patternContext: string
} {
  const patternMeta = scenarioPattern ? getPatternMetadata(scenarioPattern as DSAPattern) : null
  const patternContext = patternMeta
    ? `
PROBLEM PATTERN: ${patternMeta.name}
KEY TECHNIQUES: ${patternMeta.keyTechniques.join(", ")}
EXPECTED COMPLEXITY: Time ${patternMeta.timeComplexityHints[0]}, Space ${patternMeta.spaceComplexityHints[0]}
    PATTERN - SPECIFIC FOLLOW - UPS TO ASK:
${patternMeta.interviewerFollowUps
  .slice(0, 3)
  .map((q) => `- ${q}`)
  .join("\n")}
    `
    : ""

  return { patternMeta, patternContext }
}

export function buildEdgeCaseContext(
  edgeCases: Array<{ description: string; input: unknown }> | undefined
): string {
  return edgeCases && Array.isArray(edgeCases) && edgeCases.length > 0
    ? `
EDGE CASES YOU MUST ASK ABOUT:
These are specific edge cases for this problem.You MUST ask about at least ONE before they run tests:
${edgeCases
  .slice(0, 4)
  .map(
    (ec: { description: string; input: unknown }) =>
      `- "${ec.description}": What happens with input ${JSON.stringify(ec.input)}?`
  )
  .join("\n")}

WHEN TO ASK ABOUT EDGE CASES(BE PROACTIVE):
    1. AFTER they explain their approach: "Before you code - what happens if the input is empty?"
    2. AFTER they write code but BEFORE running tests: "Let's trace through an edge case - what if ${JSON.stringify(edgeCases[0]?.input)}?"
    3. If they don't mention edge cases at all, YOU bring it up: "Have you considered what happens with ${edgeCases[0]?.description}?"

HOW TO ASK(sound natural):
    - "Quick sanity check - what does your code do if the input is ${JSON.stringify(edgeCases[0]?.input)}?"
      - "Before you run tests, walk me through what happens with an empty array"
      - "Edge case check: what if there's only one element?"

DO NOT skip edge cases - real interviewers always ask about them.If they haven't mentioned any edge case handling, that's a gap you should probe.
`
    : ""
}

export function buildConsoleContext(
  testResultsArray: TestResultItem[] | undefined,
  consoleLogsArray: ConsoleLogItem[] | undefined
): string {
  let consoleContext = ""
  if (testResultsArray && Array.isArray(testResultsArray) && testResultsArray.length > 0) {
    const passed = testResultsArray.filter((t) => t.passed === true).length
    const total = testResultsArray.length
    const allPassed = passed === total

    consoleContext = `
    CONSOLE & TEST RESULTS(IMPORTANT - BE AWARE OF THIS):
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
- If complexity AND edge cases were already discussed: guide them to Submit
  * Say: "Tests are passing. When you're ready, click Submit to wrap up the interview."
- If complexity NOT discussed: ask ONE question about time complexity
- If edge cases NOT discussed: ask ONE question about edge cases
- After ONE follow-up question, guide them to Submit on your next turn
- DO NOT keep asking endless questions - wrap up promptly`
    : `INTERVIEWER BEHAVIOR WHEN TESTS FAIL:
- Acknowledge the failing tests
- Ask them to debug: "Looks like test ${testResultsArray.findIndex((t) => !t.passed) + 1} is failing - what do you think is happening there?"
- Help them trace through the failing case`
}
    `
  }

  if (consoleLogsArray && Array.isArray(consoleLogsArray) && consoleLogsArray.length > 0) {
    const recentLogs = consoleLogsArray.slice(-5)
    consoleContext += `
RECENT CONSOLE OUTPUT:
${recentLogs.map((log) => `[${log.type || "log"}] ${log.message || ""}`).join("\n")}
    `
  }

  return consoleContext
}

export function getSystemDesignPhase(
  minutes: number
): "requirements" | "high-level" | "deep-dive" | "wrap-up" {
  if (minutes < 10) return "requirements"
  if (minutes < 20) return "high-level"
  if (minutes < 35) return "deep-dive"
  return "wrap-up"
}

export function buildSystemDesignPromptContext(
  scenarioType: string | undefined,
  elapsedTime: number | undefined
): SystemDesignPromptContext {
  const isSystemDesign = scenarioType === "system-design"
  const elapsedMinutes = elapsedTime ? Math.floor(elapsedTime / 60) : 0
  const systemDesignPhase = isSystemDesign ? getSystemDesignPhase(elapsedMinutes) : null

  const systemDesignContext = isSystemDesign
    ? `
INTERVIEW TYPE: System Design(Architecture Discussion - NOT a coding interview)

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
    - Requirements Gathering: Did they ask good clarifying questions ?
      - Architecture : Did they propose a clear, logical system design ?
        - Scalability : Did they address how to handle increased load ?
          - Trade - offs : Did they discuss pros / cons of their choices ?
            - Communication : Did they explain their thinking clearly ?

              SYSTEM DESIGN SPECIFIC RULES:
    - This is a DISCUSSION, not a coding exercise
      - There is NO "correct answer" - evaluate reasoning and trade - offs
        - Ask open - ended questions to understand their thinking
          - Guide them through phases naturally based on elapsed time
            - Focus on WHY they make decisions, not just WHAT they propose
              - Encourage them to think about scale(millions of users, TB of data)
                - Ask about failure scenarios and edge cases
                  `
    : ""

  return { isSystemDesign, elapsedMinutes, systemDesignPhase, systemDesignContext }
}

export interface GuidedChatState {
  milestoneId?: string
  milestoneTitle?: string
  activeBugId?: string
  aiRestraint?: boolean
}

/** Present only for stdout-oracle pack sessions (INTERVIEWER_SPEC.md state machine). */
export interface PackChatContext {
  state: PackState
  hintLevel?: number
}

export function buildBugFixContext(
  scenarioType: string | undefined,
  guided?: GuidedChatState,
  pack?: PackChatContext
): {
  isBugFix: boolean
  bugFixContext: string
} {
  const isBugFix = scenarioType === "bugfix"
  let bugFixContext = isBugFix
    ? `
INTERVIEW TYPE: Bug Fix / Debugging Interview

BUGFIX PHASE MODEL:
1. Reproduce: Have they inspected the incident report, visible tests, logs, or docs before editing?
2. Inspect: Have they opened the relevant files and traced the behavior?
3. Hypothesize: Have they stated a plausible root-cause hypothesis before or during the patch?
4. Patch: Is the change minimal and limited to the expected editable area?
5. Verify: Did they run tests and interpret failures without relying on hidden tests?
6. Prevent: Can they explain a regression test, guardrail, or monitoring signal?

DEBUGGING INTERVIEW BEST PRACTICES:
- Ask for the hypothesis before accepting a fix.
- Ask what evidence supports the hypothesis.
- Ask why the patch is minimal.
- Ask what test or guardrail would prevent the regression.
- If they struggle, nudge toward the next file, log, or visible test to inspect.
- Do not reveal the exact bug location, root cause, or final patch too early.

EVALUATION CRITERIA FOR BUG FIX:
- Reproduction discipline
- Codebase navigation
- Evidence gathering
- Hypothesis quality
- Root cause understanding
- Minimal fix quality
- Verification discipline
- Regression prevention
- AI collaboration quality

DO NOT:
- Treat this like a DSA exercise.
- Ask for Big-O analysis unless it is directly relevant to the bug.
- Give away the fix or root cause.
- Accept random edits without asking for evidence.
          `
    : ""

  if (isBugFix && guided && (guided.milestoneTitle || guided.activeBugId || guided.aiRestraint)) {
    bugFixContext += `
GUIDED LAB STATE:
- The candidate is working a guided, sequential lab. Current step: "${guided.milestoneTitle ?? guided.milestoneId ?? "unknown"}".${
      guided.activeBugId
        ? `\n- Only one bug is currently revealed to them (${guided.activeBugId}). Do NOT mention, hint at, or reference any other bug that has not been revealed yet.`
        : ""
    }${
      guided.aiRestraint
        ? `\n- This is a deliberate "find it yourself" step. Do NOT reveal the bug's location, the specific wrong field or line, the root cause, or the patch — even if asked directly. If they ask "where is the bug" or "what's the fix", redirect them to read the relevant docstring and compare it against the code, and ask what they think first. The most you may offer is a gentle nudge toward which file or which contract (docstring) to re-read.`
        : ""
    }
`
  }

  // Stdout-oracle pack sessions run the 10-state machine, not the generic phase model.
  // The state-scoped block carries only the current state goal + persona + hint level.
  // Quarantined behind PACK_INTERVIEWER (off by default): the pack runtime is unwired, so
  // this block stays dormant until the post-launch wire work flips the flag.
  if (isBugFix && pack && getFlag("PACK_INTERVIEWER")) {
    bugFixContext += `\n${buildPackStatePrompt(pack.state, pack.hintLevel ?? 0)}\n`
  }

  return { isBugFix, bugFixContext }
}

export function buildComplexityContext(
  solutionComplexity: SolutionComplexityContext | undefined
): string {
  if (!solutionComplexity) {
    return ""
  }

  const { estimated, optimal, isOptimal } = solutionComplexity
  if (isOptimal) {
    return `
SOLUTION COMPLEXITY:
    - Candidate's solution appears to be ${estimated} which matches the optimal ${optimal}
      - DO NOT ask "can you optimize this?" - their solution is already optimal
        - Instead: ask about trade - offs, edge cases, or alternative approaches
          - Good questions: "Could you trade space for time?", "What edge cases might we be missing?", "What's another way to solve this?"`
  }

  return `
SOLUTION COMPLEXITY:
    - Candidate's solution appears to be ${estimated}
      - Optimal solution would be ${optimal}
    - You CAN ask about optimization: "Could you do better than ${estimated}?" or "Is there a way to avoid the nested loop?"`
}

export function buildProviderHistory(
  context: Array<{ type: string; message: string }> | undefined
): Array<{ role: "user" | "model"; content: string }> {
  const managedContext = manageContextWindow(context || [])
  const history: Array<{ role: "user" | "model"; content: string }> = []
  let foundFirstUser = false

  managedContext.forEach((msg) => {
    if (!foundFirstUser && msg.type !== "user") {
      return
    }
    foundFirstUser = true

    history.push({
      role: msg.type === "user" ? "user" : "model",
      content: msg.message,
    })
  })

  return history
}

export function buildScenarioId(scenarioTitle: string | undefined): string | undefined {
  return scenarioTitle
    ? `dsa-${scenarioTitle
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")}`
    : undefined
}

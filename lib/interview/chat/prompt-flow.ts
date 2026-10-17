import {
  buildEndedConversationResponse,
  buildProactiveSkipResponse,
  type EndedConversationResponse,
  type ProactiveSkipResponse,
} from "./response-flow"
import type { TestResultItem } from "@/lib/interview/chat-request-schema"
import { isHarnessError } from "@/lib/workspace-execution/harness-errors"
import { buildDebuggingPacingGuidance } from "../conversation-pacing"
import { buildProactivePrompt } from "./proactive-prompt"

type ChatPromptEarlyResponse = ProactiveSkipResponse | EndedConversationResponse

export interface ChatPromptFlowInput {
  scenarioType?: string
  sessionEvidence?: string
  role?: "interviewer" | "partner"
  message?: string
  context?: Array<{ type: string; message: string }>
  isProactive?: boolean
  isWrapUp?: boolean
  currentCode?: string
  currentCodeContext: string
  workspaceContextStr: string
  timeSinceLastMessage?: number
  scenarioPattern?: string
  partnerMessagesCount?: number
  lastPartnerExchange?: string
  recentNudgeTopics?: string[]
  userAnsweredTopics?: string[]
  testResults?: TestResultItem[]
  elapsedMinutes?: number
}

export type ChatPromptFlowResult =
  | {
      earlyResponse: ChatPromptEarlyResponse
      fullUserMessage?: never
    }
  | {
      fullUserMessage: string
      earlyResponse?: never
    }

export function buildChatPromptFlow(input: ChatPromptFlowInput): ChatPromptFlowResult {
  const result = buildPromptFlow(input)
  if (result.earlyResponse) return result
  const workspace = input.isProactive || input.isWrapUp ? input.workspaceContextStr : ""
  const pacing =
    input.role === "interviewer" && input.scenarioType === "bugfix"
      ? buildDebuggingPacingGuidance(input.context)
      : ""
  return {
    fullUserMessage: result.fullUserMessage + workspace + pacing + (input.sessionEvidence ?? ""),
  }
}

function buildPromptFlow(input: ChatPromptFlowInput): ChatPromptFlowResult {
  const {
    role,
    message,
    context,
    isProactive,
    isWrapUp,
    currentCode,
    currentCodeContext,
    workspaceContextStr,
    timeSinceLastMessage,
    partnerMessagesCount,
    userAnsweredTopics,
    testResults,
    elapsedMinutes,
  } = input

  if (isProactive && role === "interviewer") {
    const proactiveSkipResponse = buildProactiveSkipResponse({
      role,
      isProactive,
      currentCode,
      timeSinceLastMessage,
      context,
    })

    if (proactiveSkipResponse) {
      return { earlyResponse: proactiveSkipResponse }
    }

    return { fullUserMessage: buildProactivePrompt(input) }
  }

  if (isWrapUp && role === "interviewer") {
    // Tests that broke inside our own harness never judged the candidate, so they are excluded
    // from the tally rather than counted as failures. Without this the debrief recomputed the
    // pass rate from raw results and told the candidate "STATUS: DID NOT PASS" and "in a real
    // interview, this wouldn't be a pass" for a fault that was entirely ours. The harness
    // branch added to buildConsoleContext only reaches the SYSTEM prompt; this text is in the
    // user message and contradicted it.
    const scoreableTests = (testResults ?? []).filter((t) => !isHarnessError(t.error))
    const harnessBrokeTests = (testResults?.length ?? 0) - scoreableTests.length
    const passedTests = scoreableTests.filter((t) => t.passed).length
    const totalTests = scoreableTests.length
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0
    const allTestsPassed = passedTests === totalTests && totalTests > 0

    return {
      fullUserMessage: `[INTERVIEW DEBRIEF] The candidate is ending the session. Give them a real debrief like after an actual interview.

FINAL STATE:
${currentCodeContext}

TEST RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round(passRate)}%)
${
  totalTests === 0
    ? "STATUS: NOT ASSESSED - our test harness failed, so their code was never judged.\nDo NOT say they did not pass, and do NOT attribute this to them. Acknowledge the fault is ours."
    : allTestsPassed
      ? "STATUS: PASSED"
      : "STATUS: DID NOT PASS"
}${
        harnessBrokeTests > 0 && totalTests > 0
          ? `\nNOTE: ${harnessBrokeTests} further test(s) failed inside OUR harness and are excluded above. They are not the candidate's fault; do not mention them as failures.`
          : ""
      }

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

Keep it conversational and real - like you're actually debriefing someone after an interview.`,
    }
  }

  const endedConversationResponse = buildEndedConversationResponse({ role, context })
  if (endedConversationResponse) {
    return { earlyResponse: endedConversationResponse }
  }

  let fullUserMessage = message || ""
  if (workspaceContextStr || currentCodeContext) {
    fullUserMessage += workspaceContextStr + currentCodeContext
  }

  if (role === "interviewer" && userAnsweredTopics && userAnsweredTopics.length > 0) {
    fullUserMessage += `

[CONTEXT - CANDIDATE HAS ALREADY ANSWERED]:
${userAnsweredTopics.map((t: string) => `- ${t}`).join("\n")}
Remember: Respond to their current intent. Do not re-ask or automatically probe deeper; an acknowledgment can be enough.`
  }

  return { fullUserMessage }
}

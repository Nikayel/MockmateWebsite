import {
  buildEndedConversationResponse,
  buildProactiveSkipResponse,
  type EndedConversationResponse,
  type ProactiveSkipResponse,
} from "./response-flow"
import type { TestResultItem } from "@/lib/interview/chat-request-schema"

type ChatPromptEarlyResponse = ProactiveSkipResponse | EndedConversationResponse

export interface ChatPromptFlowInput {
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
    scenarioPattern,
    partnerMessagesCount,
    lastPartnerExchange,
    recentNudgeTopics,
    userAnsweredTopics,
    testResults,
    elapsedMinutes,
  } = input

  if (isProactive && role === "interviewer") {
    const hasSubstantialCode = currentCode && currentCode.trim().length > 100
    const timeSilentSeconds = timeSinceLastMessage || 0
    const shouldTimeBasedCheckIn = timeSilentSeconds >= 120

    const proactiveSkipResponse = buildProactiveSkipResponse({
      role,
      isProactive,
      currentCode,
      timeSinceLastMessage,
    })

    if (proactiveSkipResponse) {
      return { earlyResponse: proactiveSkipResponse }
    }

    let fullUserMessage = ""

    if (shouldTimeBasedCheckIn && !hasSubstantialCode) {
      fullUserMessage = `[TIME-BASED CHECK-IN] The candidate has been quiet for ${Math.floor(timeSilentSeconds / 60)} minutes without writing substantial code.

Act like a real interviewer who notices someone is quiet:
- "How are you thinking about this problem?"
- "What's going through your mind?"
- "Would it help to talk through your approach?"
- "Are you stuck on something specific?"

Pick ONE natural response (under 20 words). Don't be pushy - they might be thinking.`
    }

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

    const patternSpecificQuestion = scenarioPattern
      ? `Based on the ${scenarioPattern} pattern, ask a relevant question about their approach or potential issues.`
      : ""

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

    return { fullUserMessage }
  }

  if (isWrapUp && role === "interviewer") {
    const passedTests = testResults?.filter((t) => t.passed).length || 0
    const totalTests = testResults?.length || 0
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0
    const allTestsPassed = passedTests === totalTests && totalTests > 0

    return {
      fullUserMessage: `[INTERVIEW DEBRIEF] The candidate is ending the session. Give them a real debrief like after an actual interview.

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
${userAnsweredTopics
  .slice(-5)
  .map((t: string) => `- ${t}`)
  .join("\n")}
Remember: Acknowledge what they said, then probe deeper or move on. Do NOT re-ask.`
  }

  return { fullUserMessage }
}

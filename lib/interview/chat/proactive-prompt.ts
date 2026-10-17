import type { ChatPromptFlowInput } from "./prompt-flow"

/** A check-in is an invitation, not permission to diagnose or repeat the task. */
export function buildProactivePrompt(input: ChatPromptFlowInput): string {
  const isDebugging = input.scenarioType === "bugfix"
  const hasCode = Boolean(input.currentCode?.trim())
  const heading = isDebugging
    ? "DEBUGGING CHECK-IN"
    : hasCode
      ? "NATURAL CHECK-IN"
      : "TIME-BASED CHECK-IN"
  const asked = input.recentNudgeTopics?.length
    ? `AVOID REPEATING THESE TOPICS (already asked about):\n${input.recentNudgeTopics.join("\n")}\nDo not rephrase them or escalate to an unsolicited hint.`
    : ""
  const answered = input.userAnsweredTopics?.length
    ? `CANDIDATE HAS ALREADY ANSWERED (do NOT ask about these again):\n${input.userAnsweredTopics.join("\n")}`
    : ""
  const partner = input.partnerMessagesCount
    ? `Candidate has asked Sparra ${input.partnerMessagesCount} questions; frequency alone is not evidence of misuse. Do not replay partner advice or demand another explanation solely because of partner use.`
    : ""
  const pattern =
    !isDebugging && input.scenarioType !== "system-design" && input.scenarioPattern
      ? `Problem pattern (context only, not a required question): ${input.scenarioPattern}`
      : ""

  return `[${heading}] The candidate has been quiet. Existing code, including starter code, is not proof of progress or confusion. No new failure or code change is implied.
${input.currentCodeContext}
${partner}
${pattern}
${asked}
${answered}
Offer one brief invitation to share an update, under 20 words. Do not recap requirements, test numbers, unchanged failures, or that they have not edited. Do not identify a suspicious row, line, function, missing check, or failure mechanism. Do not provide a hint unless asked. Silence is not a collaboration penalty.`
}

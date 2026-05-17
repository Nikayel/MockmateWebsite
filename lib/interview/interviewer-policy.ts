/**
 * Pre-LLM interviewer policy.
 *
 * These rules are state-machine constraints, so the server decides them before
 * the model generates wording. Post-generation guardrails still validate the
 * final text for phrasing/content violations.
 */

import type { ConversationTracker, InterviewPhase } from "./interview-phases"

export interface PreLLMPolicyContext {
  phase: InterviewPhase
  tracker?: ConversationTracker
  hasSubmitted: boolean
  testsHaveRun: boolean
  testsPassed: number
  testsTotal: number
}

export interface PreLLMInterviewerPolicy {
  rules: string[]
  requiredAction?: string
}

function hasExplainedApproach(tracker?: ConversationTracker): boolean {
  if (!tracker) return false
  return (
    tracker.approachExplained ||
    tracker.approachQuality === "specific" ||
    tracker.approachQuality === "detailed"
  )
}

function getMissingPreCodingTopics(tracker?: ConversationTracker): string[] {
  if (!tracker) return []

  const missing: string[] = []
  const approachCovered = hasExplainedApproach(tracker)

  if (!approachCovered) {
    missing.push("approach")
    return missing
  }

  if (!tracker.timeComplexityMentioned) {
    missing.push("time and space complexity")
  }

  if ((tracker.edgeCasesMentioned?.length ?? 0) === 0) {
    missing.push("edge cases")
  }

  return missing
}

function buildPreCodingAction(missingTopics: string[]): string | undefined {
  const nextTopic = missingTopics[0]
  if (!nextTopic) return undefined

  if (nextTopic === "approach") {
    return "Ask the candidate to walk through their approach before coding."
  }

  if (nextTopic === "time and space complexity") {
    return "Ask one question about the expected time and space complexity."
  }

  if (nextTopic === "edge cases") {
    return "Ask one question about edge cases before coding continues."
  }

  return `Ask about ${nextTopic}.`
}

export function buildPreLLMInterviewerPolicy(ctx: PreLLMPolicyContext): PreLLMInterviewerPolicy {
  const rules: string[] = []
  let requiredAction: string | undefined

  if (ctx.phase === "clarification") {
    rules.push(
      "Clarification phase: do not ask about approach, plan, thinking, optimization, or coding.",
      "Allowed clarification behavior: answer clarifying questions briefly, give the candidate time to read, or ask if they have questions about the problem."
    )
    requiredAction =
      "Stay in reading/clarification mode unless the candidate themselves brings up an approach."
  }

  if (!ctx.hasSubmitted) {
    rules.push(
      "Do not mention detailed feedback, score, score button, final results, or post-interview feedback before the candidate submits."
    )
  }

  if ((ctx.phase === "discussion" || ctx.phase === "coding") && !ctx.tracker?.hasRunTests) {
    const missingTopics = getMissingPreCodingTopics(ctx.tracker)

    if (missingTopics.length > 0) {
      rules.push(
        `Do not transition to coding yet. Missing before coding: ${missingTopics.join(", ")}.`
      )
      requiredAction = buildPreCodingAction(missingTopics)
    }
  }

  if (ctx.phase === "testing" && ctx.tracker && ctx.testsHaveRun) {
    const allTestsPassed = ctx.testsTotal > 0 && ctx.testsPassed === ctx.testsTotal
    const complexityCovered = ctx.tracker.timeComplexityMentioned
    const edgeCasesCovered = (ctx.tracker.edgeCasesMentioned?.length ?? 0) > 0

    if (allTestsPassed && complexityCovered && edgeCasesCovered) {
      rules.push(
        "Testing phase: tests passed and complexity plus edge cases are already covered. Do not ask another technical question."
      )
      requiredAction = "Briefly acknowledge the passing tests, then guide the candidate to Submit."
    } else if (allTestsPassed) {
      const missingTopics: string[] = []
      if (!complexityCovered) missingTopics.push("time and space complexity")
      if (!edgeCasesCovered) missingTopics.push("edge cases")

      rules.push(
        `Testing phase: tests passed. Ask at most one follow-up about: ${missingTopics.join(", ")}. Then guide to Submit on the next turn.`
      )
      requiredAction =
        missingTopics[0] === "time and space complexity"
          ? "Ask one concise complexity question."
          : "Ask one concise edge-case question."
    }
  }

  return { rules, requiredAction }
}

export function formatPreLLMInterviewerPolicy(policy: PreLLMInterviewerPolicy): string {
  if (policy.rules.length === 0 && !policy.requiredAction) {
    return ""
  }

  const rules = policy.rules.map((rule) => `- ${rule}`).join("\n")
  const action = policy.requiredAction ? `\nREQUIRED NEXT ACTION:\n${policy.requiredAction}` : ""

  return `
=== SERVER-ENFORCED INTERVIEW POLICY ===
These constraints were computed from interview state before this model call.
Follow them over any more general phase guidance.
${rules}
${action}
========================================
`
}

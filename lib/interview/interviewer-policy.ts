/**
 * Server-computed interviewer guidance injected before generation.
 *
 * The server decides which guidance applies from interview state. The model
 * still generates the response, so these are not deterministic enforcement;
 * post-generation guardrails remain responsible for validation.
 */

import type { ConversationTracker, InterviewPhase } from "./interview-phases"

export interface PreLLMPolicyContext {
  scenarioType?: string
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
  if (ctx.scenarioType === "bugfix")
    return {
      rules: [
        "Debugging stages describe observed work, not mandatory verbal checkpoints. A run before a net edit is baseline reproduction, not proof of a fix.",
        "Do not gate debugging on a generic Big-O or edge-case checklist. Ask about complexity only when the candidate's change makes it relevant.",
        "Acknowledge a specific observed investigation action without validating solution correctness. Treat Sparra advice as advice; assess the candidate's own reasoning and verification.",
        "A hypothesis may be informal and expressed before, during, or after an edit. No written hypothesis field is required. Never demand a form or permission to start editing.",
        "Respond to the candidate's actual message. Acknowledgments, thinking aloud, and a stated plan do not require another question. Do not repeat unchanged failures or demand another clarification after they declined.",
        "Do not mention scores or detailed feedback before submission. After verification, ask at most one useful follow-up, only if not already covered, then let them submit.",
      ],
      requiredAction: ctx.hasSubmitted
        ? "Debrief using the candidate's evidence and changes."
        : ctx.phase === "clarification"
          ? "Answer a specifically named requirement if asked; otherwise give them room to read without inventing a clarification question."
          : "Let the candidate investigate. Ask one short evidence-based question only when needed; do not supply the diagnosis or block editing.",
    }
  if (ctx.scenarioType === "system-design")
    return {
      rules: [
        "System design is a candidate-led design discussion, not an algorithm coding round. Do not require code, test runs, Big-O, or an edge-case checklist before proceeding.",
        "Use the supplied design stage as pacing guidance, not a script. Ask one relevant design question at a time; do not repeat an answered requirement or prescribe the architecture.",
        "Acknowledge a stated plan without automatically adding a question. Leave space for the candidate to develop it.",
        "Do not mention scores or detailed feedback before submission.",
      ],
      requiredAction: ctx.hasSubmitted
        ? "Briefly debrief the design decisions already discussed; do not restart requirements gathering."
        : "Follow the candidate's current design thread; probe only a material unresolved decision.",
    }
  const rules: string[] = []
  let requiredAction: string | undefined

  if (ctx.phase === "clarification") {
    rules.push(
      "Clarification phase: do not ask about approach, plan, thinking, optimization, or coding.",
      "Answer one specifically named requirement using supplied facts. For broad discovery requests such as asking for all edge cases, ask the candidate to identify them instead of listing them."
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
=== SERVER-COMPUTED INTERVIEW GUIDANCE ===
These constraints were computed from interview state before this model call.
Follow them over any more general phase guidance.
${rules}
${action}
========================================
`
}

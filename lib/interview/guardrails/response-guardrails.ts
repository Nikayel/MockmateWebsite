import type { ValidationContext } from "../response-validation"
import {
  ACCEPTANCE_PATTERNS,
  containsCodingTransition,
  containsSummarizing,
  countSentences,
  GIVEAWAY_PATTERNS,
  LEADING_QUESTION_PATTERNS,
  PROBING_PATTERNS,
  VAGUE_ANSWER_PATTERNS,
} from "../shared-patterns"

/**
 * Runtime matchers for validation phrases that force interviewer-response
 * regeneration. These correspond to FORBIDDEN_VALIDATION_PHRASES (the shared
 * list the interviewer prompt renders, lib/interview/forbidden-phrases.ts) but
 * keep tuned anchoring: single-word acknowledgments require trailing
 * punctuation/whitespace so normal prose ("Nice-looking recursion") and the
 * discourse marker "Right, so ..." are not over-flagged. Keep this in sync with
 * forbidden-phrases.ts when adding a phrase.
 */
const VALIDATION_PHRASE_PATTERNS: RegExp[] = [
  /\b(?:Nice|Good|Perfect|Exactly|Correct)\b[.!,]?(?:\s|$)/i,
  /\bThat's (?:right|correct|exactly)\b/i,
  /\bYou've got (?:it|the (?:right |)idea|the logic)\b/i,
  /\bThat checks out\b/i,
  /\bThat's the (?:key )?insight\b/i,
  /\bYou nailed it\b/i,
  /\bSpot on\b/i,
]

export interface ResponseGuardrail {
  name: string
  severity: "critical" | "warning"
  check: (ctx: ValidationContext) => { violated: boolean; evidence: string } | null
  hint: string
}

export const RESPONSE_GUARDRAILS: ResponseGuardrail[] = [
  {
    name: "no-premature-coding",
    severity: "critical",
    check: (ctx) => {
      if (!containsCodingTransition(ctx.response)) return null
      if (ctx.phase !== "discussion" && ctx.phase !== "coding") return null
      if (ctx.tracker?.hasRunTests) return null

      const hasComplexity = ctx.tracker?.timeComplexityMentioned ?? false
      const hasEdgeCases = (ctx.tracker?.edgeCasesMentioned?.length ?? 0) > 0

      if (!hasComplexity || !hasEdgeCases) {
        const missing = []
        if (!hasComplexity) missing.push("complexity")
        if (!hasEdgeCases) missing.push("edge cases")
        return {
          violated: true,
          evidence: `Detected coding transition without discussing: ${missing.join(", ")}`,
        }
      }
      return null
    },
    hint: "Ask about time complexity and edge cases BEFORE telling them to code",
  },
  {
    name: "no-giving-answers",
    severity: "critical",
    check: (ctx) => {
      for (const { pattern, type } of GIVEAWAY_PATTERNS) {
        const match = ctx.response.match(pattern)
        if (match) {
          return { violated: true, evidence: `${type}: "${match[0]}"` }
        }
      }
      return null
    },
    hint: "Ask guiding questions instead of giving the answer. Example: 'What data structure might help here?'",
  },
  {
    name: "no-revealing-optimal",
    severity: "warning",
    check: (ctx) => {
      if (!ctx.isOptimalSolution) return null

      const patterns = [
        /(?:this|that|it)(?:'s| is) (?:the )?optimal/i,
        /(?:can't|cannot) do better/i,
        /(?:this|that) is (?:the )?(?:best|lowest|minimum) (?:possible|you can)/i,
        /O\([^)]+\) is (?:the )?(?:optimal|best)/i,
        /you(?:'ve| have) (?:already )?(?:found|reached|achieved) (?:the )?optimal/i,
      ]

      for (const pattern of patterns) {
        const match = ctx.response.match(pattern)
        if (match) {
          return { violated: true, evidence: match[0] }
        }
      }
      return null
    },
    hint: "Don't reveal optimality. Ask: 'What do you think the complexity is? Could it be improved?'",
  },
  {
    name: "no-excessive-apology",
    severity: "warning",
    check: (ctx) => {
      const apologyPatterns = [
        /my bad/i,
        /my mistake/i,
        /my fault/i,
        /i misspoke/i,
        /i should(?:'ve| have)/i,
        /fair point,? i/i,
        /you're right,? (?:my bad|i should)/i,
      ]

      const apologies = apologyPatterns.filter((p) => p.test(ctx.response))
      if (apologies.length >= 2) {
        return { violated: true, evidence: `${apologies.length} apologies detected` }
      }
      return null
    },
    hint: "Acknowledge once, then move forward. Example: 'Good catch. So, what's your complexity analysis?'",
  },
  {
    name: "no-premature-feedback",
    severity: "critical",
    check: (ctx) => {
      if (ctx.hasSubmitted) return null

      if (/view detailed feedback|end interview|see full interview score/i.test(ctx.response)) {
        return { violated: true, evidence: "Mentioned 'See Full Interview Score' before submit" }
      }
      return null
    },
    hint: "The 'See Full Interview Score' button only appears AFTER submit. Guide them to Submit first.",
  },
  {
    name: "one-question-at-a-time",
    severity: "warning",
    check: (ctx) => {
      const questions = ctx.response.match(/\?/g) || []
      if (questions.length > 2) {
        return { violated: true, evidence: `${questions.length} questions in one response` }
      }
      return null
    },
    hint: "Ask ONE focused question at a time. Let them answer before asking the next.",
  },
  {
    name: "no-accepting-vague-answers",
    severity: "critical",
    check: (ctx) => {
      if (!ctx.lastUserMessage) return null

      const userWasVague = VAGUE_ANSWER_PATTERNS.some((p) => p.test(ctx.lastUserMessage || ""))
      if (!userWasVague) return null

      const accepted = ACCEPTANCE_PATTERNS.some((p) => p.test(ctx.response))
      const probed = PROBING_PATTERNS.some((p) => p.test(ctx.response))

      if (accepted && !probed) {
        return { violated: true, evidence: "Accepted vague answer without probing" }
      }
      return null
    },
    hint: "When user gives vague answer, probe: 'How exactly would you handle that? Walk me through the code.'",
  },
  {
    name: "no-leading-questions",
    severity: "warning",
    check: (ctx) => {
      for (const { pattern, type } of LEADING_QUESTION_PATTERNS) {
        const match = ctx.response.match(pattern)
        if (match) {
          return { violated: true, evidence: `Leading toward ${type}: "${match[0]}"` }
        }
      }
      return null
    },
    hint: "Ask open questions: 'What approach are you considering?' not 'Would a hash map help?'",
  },
  {
    name: "no-validation-phrases",
    severity: "critical",
    check: (ctx) => {
      for (const pattern of VALIDATION_PHRASE_PATTERNS) {
        const match = ctx.response.match(pattern)
        if (match) {
          return { violated: true, evidence: `Validation phrase: "${match[0]}"` }
        }
      }
      return null
    },
    hint: "Stay NEUTRAL. Don't confirm correctness. Say 'Okay' or 'Mm-hmm' instead of 'Nice' or 'Perfect'.",
  },
  {
    name: "no-teaching-edge-cases",
    severity: "critical",
    check: (ctx) => {
      const teachingPatterns = [
        /\bActually,? (?:think about|consider)\b/i,
        /\bThe (?:right|correct) answer is\b/i,
        /\bIt should return\b/i,
        /\bThe answer is\b/i,
        /\bthere's (?:actually )?one way to be there\b/i,
        /\byou're already there\b/i,
      ]

      for (const pattern of teachingPatterns) {
        const match = ctx.response.match(pattern)
        if (match) {
          return { violated: true, evidence: `Teaching phrase: "${match[0]}"` }
        }
      }
      return null
    },
    hint: "Don't teach edge cases. If they get it wrong, say 'Okay, noted.' and move on. Don't explain the correct answer.",
  },
  {
    name: "response-brevity",
    severity: "warning",
    check: (ctx) => {
      const count = countSentences(ctx.response)
      if (count > 5) {
        return { violated: true, evidence: `${count} sentences (max 4-5)` }
      }
      return null
    },
    hint: "Keep responses to 2-4 sentences. Ask ONE question, wait for answer.",
  },
  {
    name: "no-summarizing",
    severity: "warning",
    check: (ctx) => {
      const match = containsSummarizing(ctx.response)
      if (match) {
        return { violated: true, evidence: `Summarizing: "${match[0]}"` }
      }
      return null
    },
    hint: "Don't paraphrase. Move forward: 'Okay. How would that handle empty input?'",
  },
  {
    name: "no-approach-in-clarification",
    severity: "critical",
    check: (ctx) => {
      if (ctx.phase !== "clarification") {
        return null
      }

      const approachPatterns = [
        /what(?:'s| is) your (?:approach|thinking|plan)/i,
        /what(?:'s| is) your thinking/i,
        /how (?:are you|would you) (?:thinking|approach|tackle|solve)/i,
        /how are you thinking/i,
        /walk me through (?:your|the) (?:approach|plan|thinking)/i,
        /what approach/i,
        /how do you (?:want to|plan to) (?:solve|approach|tackle)/i,
        /before you (?:start )?coding/i,
        /let's (?:hear|discuss) your (?:approach|plan)/i,
        /let's dive in/i,
        /dive into/i,
        /understand your approach/i,
        /your approach/i,
        /how you plan to attack/i,
        /tell me how you/i,
        /clarifying question/i,
      ]

      for (const pattern of approachPatterns) {
        const match = ctx.response.match(pattern)
        if (match) {
          return {
            violated: true,
            evidence: `Asked for approach in clarification phase: "${match[0]}"`,
          }
        }
      }
      return null
    },
    hint: "In clarification phase, don't ask for approach. Say 'Take your time reading. Any questions about the problem?' Let THEM bring up their approach.",
  },
]

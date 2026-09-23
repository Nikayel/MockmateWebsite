import type { AIProvider } from "@/lib/ai-providers"
import type { InterviewPhase } from "./types"

/**
 * Reasoning effort per interview phase.
 *
 * FALLBACK_ORDER (lib/ai-providers.ts) picks effort per CAPABILITY, which treats
 * a whole interview as one workload. It is not: the phases differ more from each
 * other than `dialogue` differs from `code`. Greeting a candidate and judging
 * whether their claimed O(n log n) actually holds are the same capability and
 * nothing like the same problem.
 *
 * Every entry resolves to an `openai-*` provider, so this only ever changes the
 * EFFORT, never the vendor. It is passed as `preferredProvider`, which prepends
 * to the capability's chain rather than replacing it, so the fallback order and
 * every downstream behaviour are untouched. If OPENAI_API_KEY is absent the
 * provider is disabled and filtered out, and the chain proceeds as if this
 * module did not exist.
 *
 * Since 2026-09-23, every live interview turn is latency-first and uses `none`.
 * Post-interview judgment uses `medium`; final feedback generation is the only
 * path that uses `high`, through the feedback capability rather than this map.
 */
export const PHASE_PROVIDER: Record<InterviewPhase, AIProvider> = {
  // Scripted. There is nothing here to reason about.
  intro: "openai-none",

  // Answering questions about the problem statement. Latency-first: the
  // candidate is still orienting and a pause reads as the interviewer stalling.
  clarification: "openai-none",

  // The candidate has explained an approach and the interviewer has to decide
  // whether it is correct, optimal, and whether its stated complexity holds.
  // This is the most under-served phase in the old flat mapping.
  discussion: "openai-none",

  // Reacting to code as it is written: spotting a bug forming, questioning a
  // complexity claim. Mid-flow, so reasoning remains disabled.
  coding: "openai-none",

  // Judging test reasoning and which edge cases went unconsidered.
  testing: "openai-none",

  // The debrief is evaluative and happens after submission, so bounded
  // `medium` reasoning is appropriate without the long-tail latency of xhigh.
  post_interview: "openai-medium",
  complete: "openai-medium",
}

/**
 * The provider to prefer for a phase.
 *
 * Returns undefined for an unknown phase so the caller falls through to the
 * capability's own chain rather than crashing: a new phase added to the union
 * should degrade to the old flat behaviour, not take the interview down.
 */
export function providerForPhase(phase: InterviewPhase | undefined): AIProvider | undefined {
  if (!phase) return undefined
  return PHASE_PROVIDER[phase]
}

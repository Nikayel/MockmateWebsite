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
 * Measured live 2026-08-06 against gpt-5.6-luna: on bounded, well-scoped prompts
 * (which interview turns are) `high` costs roughly 300ms over `low`. On
 * open-ended prompts the same effort can cost ten times that, so the ceiling
 * here is deliberately `high` anywhere the candidate is mid-flow, and `xhigh`
 * only after they have submitted and are no longer waiting to type.
 */
export const PHASE_PROVIDER: Record<InterviewPhase, AIProvider> = {
  // Scripted. There is nothing here to reason about.
  intro: "openai-none",

  // Answering questions about the problem statement. Latency-first: the
  // candidate is still orienting and a pause reads as the interviewer stalling.
  clarification: "openai-low",

  // The candidate has explained an approach and the interviewer has to decide
  // whether it is correct, optimal, and whether its stated complexity holds.
  // This is the most under-served phase in the old flat mapping.
  discussion: "openai-high",

  // Reacting to code as it is written: spotting a bug forming, questioning a
  // complexity claim. Mid-flow, so capped at `high`.
  coding: "openai-high",

  // Judging test reasoning and which edge cases went unconsidered.
  testing: "openai-high",

  // The debrief. Evaluative, and the candidate has already submitted, so the
  // latency `xhigh` can cost is no longer blocking anyone's typing.
  post_interview: "openai-xhigh",
  complete: "openai-xhigh",
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

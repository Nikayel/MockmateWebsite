/**
 * Initial interview message builders.
 *
 * Pure copy/seed-message helpers for the start of an interview: the
 * interviewer's welcome message, the human-readable problem-type label, and the
 * AI coding-partner's opening message (absent for DSA, which has no partner).
 * Extracted from `app/interview/page.tsx` so seed copy lives in one place.
 */
import type { Scenario } from "@/lib/scenarios"

/**
 * The interviewer's opening message. `problemType` is the display label
 * (e.g. "BUG FIX"), as produced by {@link getProblemTypeLabel}.
 */
export const getInitialInterviewerMessage = (
  title: string,
  difficulty: string,
  problemType: string
) => {
  if (problemType === "BUG FIX") {
    return `Hey, I'm Sable, your interviewer for this session. Today we're working on **${title}**, a ${difficulty} debugging incident.

Start by reproducing the failure and inspecting the relevant files. Once you have a hypothesis, walk me through the evidence behind it.`
  }

  return `Hey, I'm Sable, your interviewer for this session. Today we're working on **${title}**, a ${difficulty} ${problemType} problem.

Take a moment to read through the problem on the left. Let me know if you have any questions about the requirements before we dive in.`
}

/** Human-readable label for a scenario type, used in the interviewer welcome. */
export function getProblemTypeLabel(scenarioType: string): string {
  if (scenarioType === "bugfix") return "BUG FIX"
  if (scenarioType === "add-functionality") return "ADD FUNCTIONALITY"
  return scenarioType.toUpperCase()
}

/**
 * The AI coding-partner's opening message. Returns `null` for DSA scenarios,
 * which have no AI partner (and therefore start with an empty chat).
 */
export function getInitialPartnerMessage(
  scenario: Pick<Scenario, "type" | "title">
): string | null {
  if (scenario.type === "dsa") return null

  return scenario.type === "bugfix"
    ? `Hi! I'm your AI coding partner for ${scenario.title}. Share what you have checked and I can nudge you toward the next useful file, test, or hypothesis.`
    : `Hi! I'm your AI coding partner. I can help with algorithms, debugging, and hints for ${scenario.title}. Just ask!`
}

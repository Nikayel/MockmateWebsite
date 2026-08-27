/**
 * Concession-trigger matching for the review-only author-agent persona
 * (docs/sprint-labs/AGENT-CONTEXT.md §6, PLAN.md Task 14).
 *
 * "Concession must be a machine-checkable event with an authored trigger" —
 * without this, the persona either folds at the first sign of learner doubt
 * (teaching that confident pushback always works) or never concedes at all
 * (hallucinating a defense the author never held). Pure and deterministic on
 * purpose: substring, case- and whitespace-normalized, nothing fuzzier — the
 * same authored trigger must fire the same way across every model upgrade.
 *
 * `concessionTriggers[]` (lib/scenarios/sealed/sprint-labs/types.ts) is
 * authored as short technical facts per AGENT-CONTEXT.md §6's own example
 * ("two concurrent requests, same key, different workers"), which is what
 * this substring match is built against. A trigger authored instead as a
 * full instructional sentence (as one exists in the fixture-demo content,
 * which exercises the compiler rather than realistic authoring) will not
 * match a learner's own words and should be re-authored as a short fact —
 * flagged for whoever authors real workbook content, not fixed here.
 */

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

/** Whether the learner's message contains the (normalized) trigger text. */
export function matchesConcessionTrigger(message: string, trigger: string): boolean {
  const normalizedTrigger = normalize(trigger)
  if (!normalizedTrigger) return false
  return normalize(message).includes(normalizedTrigger)
}

/** The first authored trigger the learner's message matches, or null. */
export function findMatchedConcessionTrigger(
  message: string,
  triggers: readonly string[]
): string | null {
  return triggers.find((trigger) => matchesConcessionTrigger(message, trigger)) ?? null
}

/** Curated rounds; language variants inherit their question's placement and label. */
export const FEATURED_DEBUGGING_SCENARIO_IDS = [
  "bugfix-rate-limiter-error-handling",
  "generic-cache-eviction-mutation",
  "bugfix-comment-thread-merge",
] as const

export const STARTER_SCENARIO_ID = "bugfix-onboarding"

type DiscoveryScenario = { id: string; variantGroup?: string }

function discoveryRank(scenario: DiscoveryScenario): number {
  const questionId = scenario.variantGroup ?? scenario.id
  const featuredIndex = FEATURED_DEBUGGING_SCENARIO_IDS.findIndex((id) => id === questionId)
  if (featuredIndex >= 0) return featuredIndex
  return scenario.id === STARTER_SCENARIO_ID
    ? FEATURED_DEBUGGING_SCENARIO_IDS.length
    : FEATURED_DEBUGGING_SCENARIO_IDS.length + 1
}

export function getScenarioDiscoveryLabel(
  scenario: DiscoveryScenario,
  completed: boolean
): string | null {
  if (discoveryRank(scenario) < FEATURED_DEBUGGING_SCENARIO_IDS.length) return "Featured"
  if (completed) return null
  if (scenario.id === STARTER_SCENARIO_ID) return "Start here"
  return null
}

/** Copy before sorting; retain catalog order among every other filtered result. */
export function prioritizeDebuggingScenarios<T extends DiscoveryScenario>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => discoveryRank(a) - discoveryRank(b))
}

/** A short warm-up first, then a deeper Python incident; neither bypasses filters. */
export const STARTER_SCENARIO_ID = "bugfix-onboarding"
export const FLAGSHIP_SCENARIO_ID = "generic-cache-eviction-mutation"

export function getScenarioDiscoveryLabel(id: string, completed: boolean): string | null {
  if (completed) return null
  if (id === STARTER_SCENARIO_ID) return "Start here"
  if (id === FLAGSHIP_SCENARIO_ID) return "Fix + extend"
  return null
}

function discoveryRank(id: string): number {
  if (id === STARTER_SCENARIO_ID) return 0
  if (id === FLAGSHIP_SCENARIO_ID) return 1
  return 2
}

/** Copy before sorting; retain catalog order among every other filtered result. */
export function prioritizeDebuggingScenarios<T extends { id: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => discoveryRank(a.id) - discoveryRank(b.id))
}

import type { Scenario } from "./types"

/** Group only variants that survived the caller's filters; keep catalog order. */
export function groupScenarioVariants<TScenario extends Scenario>(
  candidates: readonly TScenario[]
): TScenario[][] {
  const groups = new Map<string, TScenario[]>()
  for (const scenario of candidates) {
    const key = scenario.variantGroup ?? scenario.id
    const group = groups.get(key)
    if (group) group.push(scenario)
    else groups.set(key, [scenario])
  }
  return [...groups.values()]
}

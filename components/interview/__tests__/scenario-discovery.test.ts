import { describe, expect, it } from "vitest"
import { filterScenarios, scenarios } from "@/lib/scenarios"
import { groupScenarioVariants } from "@/lib/scenarios/variants"
import {
  FEATURED_DEBUGGING_SCENARIO_IDS,
  STARTER_SCENARIO_ID,
  getScenarioDiscoveryLabel,
  prioritizeDebuggingScenarios,
} from "../scenario-discovery"

describe("featured debugging rounds", () => {
  const debugging = scenarios.filter((scenario) => scenario.type === "bugfix")
  const featured = new Set<string>(FEATURED_DEBUGGING_SCENARIO_IDS)

  it("leads with exactly three curated rounds, counting the rate limiter's languages once", () => {
    const original = [...debugging]
    const ranked = groupScenarioVariants(prioritizeDebuggingScenarios(debugging))
    expect(ranked.slice(0, 3).map(([scenario]) => scenario.id)).toEqual([
      "bugfix-rate-limiter-error-handling",
      "generic-cache-eviction-mutation",
      "bugfix-comment-thread-merge",
    ])
    expect(
      ranked.filter(([scenario]) => getScenarioDiscoveryLabel(scenario, false) === "Featured")
    ).toHaveLength(3)
    expect(debugging).toEqual(original)
    expect(new Set(FEATURED_DEBUGGING_SCENARIO_IDS).size).toBe(3)
  })

  it("keeps the warm-up and all other rounds in their existing relative order", () => {
    const ranked = prioritizeDebuggingScenarios(debugging)
    const others = ranked.filter((scenario) => !featured.has(scenario.variantGroup ?? scenario.id))
    expect(others[0].id).toBe(STARTER_SCENARIO_ID)
    expect(others.slice(1)).toEqual(
      debugging.filter(
        (scenario) =>
          !featured.has(scenario.variantGroup ?? scenario.id) && scenario.id !== STARTER_SCENARIO_ID
      )
    )
  })

  it.each(["javascript", "python"] as const)(
    "keeps the %s rate limiter first after language filtering",
    (language) => {
      const filtered = filterScenarios({ type: ["bugfix"], languages: [language] })
      const first = prioritizeDebuggingScenarios(filtered)[0]
      expect(first.variantGroup).toBe("bugfix-rate-limiter-error-handling")
      expect(first.workspace?.language).toBe(language)
      expect(getScenarioDiscoveryLabel(first, false)).toBe("Featured")
    }
  )

  it("only features published independent workspaces", () => {
    for (const id of FEATURED_DEBUGGING_SCENARIO_IDS) {
      const scenario = debugging.find((scenario) => scenario.id === id)
      expect(scenario?.executionMode, id).toBe("workspace")
      expect(scenario?.guidedLab, id).toBeUndefined()
    }
  })

  it("never inserts a featured round excluded by the filters", () => {
    const easy = prioritizeDebuggingScenarios(
      filterScenarios({ type: ["bugfix"], difficulty: ["easy"] })
    )
    expect(easy[0]?.id).toBe(STARTER_SCENARIO_ID)
    expect(easy.some((scenario) => getScenarioDiscoveryLabel(scenario, false) === "Featured")).toBe(
      false
    )
    expect(prioritizeDebuggingScenarios([])).toEqual([])
    const other = filterScenarios({ type: ["bugfix"], searchQuery: "webhook" })
    expect(prioritizeDebuggingScenarios(other)).toEqual(other)
  })

  it("keeps curation independent of completion while preserving the warm-up cue", () => {
    for (const id of FEATURED_DEBUGGING_SCENARIO_IDS) {
      expect(getScenarioDiscoveryLabel({ id }, true)).toBe("Featured")
    }
    expect(getScenarioDiscoveryLabel({ id: STARTER_SCENARIO_ID }, false)).toBe("Start here")
    expect(getScenarioDiscoveryLabel({ id: STARTER_SCENARIO_ID }, true)).toBeNull()
    expect(getScenarioDiscoveryLabel({ id: "other" }, false)).toBeNull()
  })
})

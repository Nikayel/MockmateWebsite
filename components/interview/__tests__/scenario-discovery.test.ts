import { describe, expect, it } from "vitest"
import { filterScenarios, scenarios } from "@/lib/scenarios"
import { getScenarioCardContext } from "../scenario-card-meta"
import {
  FLAGSHIP_SCENARIO_ID,
  STARTER_SCENARIO_ID,
  getScenarioDiscoveryLabel,
  prioritizeDebuggingScenarios,
} from "../scenario-discovery"

describe("debugging discovery progression", () => {
  const debugging = scenarios.filter((scenario) => scenario.type === "bugfix")

  it("puts the warm-up first and the real Python flagship second without changing the catalog", () => {
    const original = debugging.map((scenario) => scenario.id)
    const ranked = prioritizeDebuggingScenarios(debugging)
    expect(ranked.slice(0, 2).map((scenario) => scenario.id)).toEqual([
      STARTER_SCENARIO_ID,
      FLAGSHIP_SCENARIO_ID,
    ])
    expect(debugging.map((scenario) => scenario.id)).toEqual(original)
    expect(ranked.slice(2).map((scenario) => scenario.id)).toEqual(
      original.filter((id) => id !== STARTER_SCENARIO_ID && id !== FLAGSHIP_SCENARIO_ID)
    )
  })

  it("promotes the flagship to first when language filtering excludes the JavaScript intro", () => {
    const python = filterScenarios({ type: ["bugfix"], languages: ["python"] })
    expect(prioritizeDebuggingScenarios(python)[0]?.id).toBe(FLAGSHIP_SCENARIO_ID)
  })

  it("does not inject the medium flagship into an easy-only result or unmatched search", () => {
    const easy = filterScenarios({ type: ["bugfix"], difficulty: ["easy"] })
    expect(
      prioritizeDebuggingScenarios(easy).some((scenario) => scenario.id === FLAGSHIP_SCENARIO_ID)
    ).toBe(false)
    expect(prioritizeDebuggingScenarios([])).toEqual([])
    const other = filterScenarios({ type: ["bugfix"], searchQuery: "webhook" })
    expect(
      prioritizeDebuggingScenarios(other).some((scenario) => scenario.id === FLAGSHIP_SCENARIO_ID)
    ).toBe(false)
  })

  it("displays honest scope and difficulty rather than calling the flagship an easy intro", () => {
    const flagship = debugging.find((scenario) => scenario.id === FLAGSHIP_SCENARIO_ID)!
    expect(flagship.difficulty).toBe("medium")
    expect(getScenarioCardContext(flagship).signal).toBe("Real codebase · 4 files")
    expect(getScenarioDiscoveryLabel(flagship.id, false, Date.UTC(2026, 9, 22))).toBe(
      "New · Fix + extend"
    )
    expect(getScenarioDiscoveryLabel(flagship.id, false, Date.UTC(2026, 10, 16))).toBe(
      "Fix + extend"
    )
    expect(getScenarioDiscoveryLabel(STARTER_SCENARIO_ID, false)).toBe("Start here")
    expect(getScenarioDiscoveryLabel(flagship.id, true)).toBeNull()
    expect(getScenarioDiscoveryLabel("other", false)).toBeNull()
  })
})

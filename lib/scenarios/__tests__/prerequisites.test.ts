import { describe, expect, it } from "vitest"
import { scenarios } from "@/lib/scenarios"
import { getScenariosByType } from "@/lib/scenarios/index"
import {
  DEBUGGING_PREREQUISITES,
  getScenarioPrerequisites,
  PREREQUISITE_TOPICS,
} from "../prerequisites"

describe("debugging prerequisites", () => {
  const debugging = scenarios.filter(
    (scenario) => scenario.type === "bugfix" || scenario.type === "add-functionality"
  )

  it("requires an explicit review for every published debugging question, with no retired IDs", () => {
    expect(Object.keys(DEBUGGING_PREREQUISITES).sort()).toEqual(
      debugging.map((scenario) => scenario.id).sort()
    )
    for (const scenario of debugging) {
      const topics = getScenarioPrerequisites(scenario)
      expect(topics.length, scenario.id).toBeGreaterThanOrEqual(2)
      expect(topics.length, scenario.id).toBeLessThanOrEqual(6)
      expect(new Set(topics.map((topic) => topic.id)).size, scenario.id).toBe(topics.length)
      expect(scenario.workspace?.language, scenario.id).toBeTruthy()
      for (const topic of topics) {
        expect(topic.label, scenario.id).toBeTruthy()
        expect(topic.description.length, scenario.id).toBeLessThan(140)
      }
    }
  })

  it("shows the same reviewed topics when a question is opened through the lazy loader", async () => {
    const loaded = [
      ...(await getScenariosByType("bugfix")),
      ...(await getScenariosByType("add-functionality")),
    ]
    expect(loaded.map((scenario) => scenario.id).sort()).toEqual(
      debugging.map((scenario) => scenario.id).sort()
    )
    for (const scenario of loaded) {
      expect(getScenarioPrerequisites(scenario)).toEqual(
        getScenarioPrerequisites(debugging.find((entry) => entry.id === scenario.id)!)
      )
    }
  })

  it("names map knowledge for the adjustment matcher without prescribing the pair algorithm", () => {
    const topics = getScenarioPrerequisites({ id: "bugfix-onboarding", type: "bugfix" })
    expect(topics.map((topic) => topic.id)).toEqual(["arrays-lists", "maps-dictionaries"])
    expect(topics[1]).toMatchObject(PREREQUISITE_TOPICS["maps-dictionaries"])
    expect(JSON.stringify(topics)).not.toMatch(/two.?sum|complement|seenAmounts|row\.status/i)
  })

  it("does not fabricate prerequisites for an unreviewed question or another track", () => {
    expect(getScenarioPrerequisites({ id: "new-question", type: "bugfix" })).toEqual([])
    expect(getScenarioPrerequisites({ id: "__proto__", type: "bugfix" })).toEqual([])
    expect(getScenarioPrerequisites({ id: "bugfix-onboarding", type: "dsa" })).toEqual([])
  })
})

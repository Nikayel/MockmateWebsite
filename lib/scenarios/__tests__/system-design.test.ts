import { describe, expect, it } from "vitest"

import { systemDesignScenarios } from "../system-design"

const expectedScenarioIds = [
  "system-design-url-shortener",
  "system-design-rate-limiter",
  "system-design-instagram",
  "system-design-distributed-cache",
  "system-design-chat-system",
  "system-design-twitter",
  "system-design-uber",
  "system-design-notification",
  "system-design-video-streaming",
  "system-design-ecommerce",
  "system-design-file-storage",
]

describe("systemDesignScenarios", () => {
  it("keeps the expected scenario order and IDs", () => {
    expect(systemDesignScenarios.map((scenario) => scenario.id)).toEqual(expectedScenarioIds)
  })

  it("exports complete scenario records for consumers", () => {
    for (const scenario of systemDesignScenarios) {
      expect(scenario.type).toBe("system-design")
      expect(scenario.title).toBeTruthy()
      expect(scenario.problemStatement).toBeTruthy()
      expect(scenario.functionalRequirements.length).toBeGreaterThan(0)
      expect(scenario.nonFunctionalRequirements.length).toBeGreaterThan(0)
      expect(scenario.keyComponents.length).toBeGreaterThan(0)
      expect(scenario.evaluationCriteria.length).toBeGreaterThan(0)
    }
  })
})

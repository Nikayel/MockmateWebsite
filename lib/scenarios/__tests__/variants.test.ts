import { describe, expect, it } from "vitest"
import { filterScenarios, getScenarioById, scenarios } from "@/lib/scenarios"
import { findInterviewTrack } from "@/components/interview/interview-tracks"
import { trackProgress } from "@/components/interview/interview-track-browsing"
import { SCENARIO_CONCEPTS } from "../concept-notes"
import { groupScenarioVariants } from "../variants"
import { loadSealedLegacyBugfix } from "../sealed/legacy-registry.server"

const javascript = getScenarioById("bugfix-rate-limiter-error-handling")!
const python = getScenarioById("bugfix-rate-limiter-error-handling-python")!

describe("multi-language debugging scenarios", () => {
  it("keeps one ordered catalog entry while preserving each executable variant's identity", () => {
    const unrelated = getScenarioById("bugfix-onboarding")!
    expect(groupScenarioVariants([javascript, unrelated, python])).toEqual([
      [javascript, python],
      [unrelated],
    ])
    expect(javascript.workspace?.language).toBe("javascript")
    expect(python.workspace?.language).toBe("python")
    expect(javascript.id).not.toBe(python.id)
  })

  it("never reintroduces a variant excluded by language filters", () => {
    const filtered = filterScenarios({ languages: ["python"], searchQuery: javascript.title })
    expect(groupScenarioVariants(filtered)).toEqual([[python]])
  })

  it("counts a round once, including when both languages have been completed", () => {
    const debugging = findInterviewTrack("debugging")!
    expect(trackProgress(debugging, [javascript, python], [javascript.id, python.id])).toEqual({
      total: 1,
      completed: 1,
    })
    expect(trackProgress(debugging, [javascript, python], [python.id]).completed).toBe(1)
  })

  it("requires explicit, compatible language variants for each published group", () => {
    for (const variants of groupScenarioVariants(scenarios).filter(
      (group) => group[0].variantGroup
    )) {
      expect(variants.length).toBeGreaterThan(1)
      expect(new Set(variants.map((variant) => variant.workspace?.language)).size).toBe(
        variants.length
      )
      for (const variant of variants) {
        expect(variant.executionMode).toBe("workspace")
        expect(variant.type).toBe(variants[0].type)
        expect(variant.title).toBe(variants[0].title)
        expect(variant.difficulty).toBe(variants[0].difficulty)
        expect(variant.companies).toEqual(variants[0].companies)
        expect(variant.conceptIds).toEqual(variants[0].conceptIds)
      }
    }
  })

  it.each([javascript, python])(
    "$id gives the learner and both AI roles the same public foundation",
    (variant) => {
      const task = variant.workspace!.files.find((file) => file.path === "task.md")!
      const concept = SCENARIO_CONCEPTS["exception-handling"]
      expect(task.content).toContain(concept.summary)
      expect(task.content).toContain(concept.systemsIntuition)
      expect(task.content.indexOf("## Concept:")).toBeLessThan(
        task.content.indexOf("## Required behavior")
      )
      expect(task.content).not.toMatch(/except StoreUnavailableError:|if \(error instanceof/)
    }
  )

  it("reuses the same assessment while sealing a language-specific reference", async () => {
    const jsAnswer = (await loadSealedLegacyBugfix(javascript.id))!
    const pyAnswer = (await loadSealedLegacyBugfix(python.id))!
    expect(jsAnswer.rootCauseRubric).toEqual(pyAnswer.rootCauseRubric)
    expect(jsAnswer.fixTradeoffs).toBe(pyAnswer.fixTradeoffs)
    expect(pyAnswer.referenceFiles.map(({ path }) => path)).toEqual(
      python.workspace!.editableFilePaths
    )
    expect(pyAnswer.referenceFiles[0].language).toBe("python")
  })
})

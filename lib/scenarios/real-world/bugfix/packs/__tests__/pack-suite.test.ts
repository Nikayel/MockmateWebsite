// @vitest-environment node
/**
 * Parametrized suite over EVERY registered bugfix pack. New packs are covered
 * automatically — no per-pack test file needed. Asserts the client-safe pack passes
 * the quality gate, compiles to a valid workspace scenario, and that its SEALED
 * content is consistent (partial wrongness, no verbatim leak, well-formed phase-2).
 */
import { describe, expect, it } from "vitest"
import { isWorkspaceScenario, validateWorkspaceScenario } from "@/lib/workspace-execution"
import { validatePackQuality } from "@/lib/bugfix/packs/scenario"
import { packToScenario } from "@/lib/bugfix/packs/scenario"
import { diffStdout } from "@/lib/bugfix/packs/stdout-oracle"
import { loadSealedPack } from "@/lib/scenarios/sealed/registry.server"
import { bugfixPacks } from "../index"

describe("bugfix pack suite", () => {
  it("registers at least one pack", () => {
    expect(bugfixPacks.length).toBeGreaterThan(0)
  })

  // The gate is only worth running if it can fail. Passing every pack proves nothing
  // if the check itself is blind, and it was: with only bugSummary wired up, a
  // task.md carrying the sealed minimalFix verbatim scored zero issues.
  describe("the leak gate actually catches a leak", () => {
    const pack = bugfixPacks[0]

    it("rejects a sealed minimalFix pasted into candidate-visible content", async () => {
      const sealed = await loadSealedPack(pack.id)
      const sabotaged = { ...pack, taskMd: `${pack.taskMd}\n\n${sealed!.minimalFix}` }

      const issues = validatePackQuality(sabotaged, { minimalFix: sealed!.minimalFix })
      expect(issues.length).toBeGreaterThan(0)
    })

    it("rejects a sealed bugSummary pasted into candidate-visible content", async () => {
      const sealed = await loadSealedPack(pack.id)
      const sabotaged = { ...pack, taskMd: `${pack.taskMd}\n\n${sealed!.bugSummary}` }

      expect(
        validatePackQuality(sabotaged, { bugSummary: sealed!.bugSummary }).length
      ).toBeGreaterThan(0)
    })

    it("rejects a sealed bugLocation pasted into candidate-visible content", async () => {
      const sealed = await loadSealedPack(pack.id)
      expect(sealed!.bugLocation, "fixture pack must seal a location").toBeTruthy()

      const sabotaged = { ...pack, taskMd: `${pack.taskMd}\n\n${sealed!.bugLocation}` }
      expect(
        validatePackQuality(sabotaged, { bugLocation: sealed!.bugLocation }).length
      ).toBeGreaterThan(0)
    })

    it("still accepts a bare bugSummary string, so old callers keep working", async () => {
      const sealed = await loadSealedPack(pack.id)
      const sabotaged = { ...pack, taskMd: `${pack.taskMd}\n\n${sealed!.bugSummary}` }

      expect(validatePackQuality(sabotaged, sealed!.bugSummary).length).toBeGreaterThan(0)
      expect(validatePackQuality(pack, sealed!.bugSummary)).toEqual([])
    })

    it("does not flag a clean pack", async () => {
      const sealed = await loadSealedPack(pack.id)
      expect(
        validatePackQuality(pack, {
          bugSummary: sealed?.bugSummary,
          minimalFix: sealed?.minimalFix,
          bugLocation: sealed?.bugLocation,
        })
      ).toEqual([])
    })
  })

  for (const pack of bugfixPacks) {
    describe(`pack: ${pack.id}`, () => {
      it("compiles to a structurally valid workspace scenario with the pack marker", () => {
        const scenario = packToScenario(pack)
        expect(isWorkspaceScenario(scenario)).toBe(true)
        expect(validateWorkspaceScenario(scenario as never)).toEqual([])
        expect(scenario.pack?.packId).toBe(pack.id)
        expect(scenario.pack?.expectedOutput).toBe(pack.expectedOutput)
      })

      it("has a sealed module registered under the same id", async () => {
        const sealed = await loadSealedPack(pack.id)
        expect(sealed).not.toBeNull()
        expect(sealed?.packId).toBe(pack.id)
      })

      it("passes the pack quality gate with no verbatim sealed leak", async () => {
        const sealed = await loadSealedPack(pack.id)
        // Check every sealed string, not just bugSummary: the gate used to pass a
        // task.md with the sealed minimalFix pasted in verbatim, which hands the
        // candidate the answer while reporting zero issues.
        expect(
          validatePackQuality(pack, {
            bugSummary: sealed?.bugSummary,
            minimalFix: sealed?.minimalFix,
            bugLocation: sealed?.bugLocation,
            solutionMd: sealed?.solutionMd,
            survivalStory: sealed?.survivalStory,
            redHerrings: sealed?.redHerrings,
          })
        ).toEqual([])
      })

      it("has partial wrongness — buggy output differs from the oracle but not entirely", async () => {
        const sealed = await loadSealedPack(pack.id)
        expect(sealed).not.toBeNull()
        const diff = diffStdout(sealed!.buggyOutput, pack.expectedOutput)
        expect(diff.match).toBe(false) // the buggy output IS wrong
        const buggyLines = sealed!.buggyOutput.split("\n")
        const oracleLines = pack.expectedOutput.split("\n")
        const differing = oracleLines.filter((line, i) => line !== buggyLines[i])
        expect(differing.length).toBeGreaterThan(0)
        // ...but most of the output is already correct (partial wrongness)
        expect(differing.length).toBeLessThan(oracleLines.length)
      })

      it("has a well-formed sealed contract (herrings, phase-2 v2, debrief rubric)", async () => {
        const sealed = await loadSealedPack(pack.id)
        expect(sealed!.redHerrings.length).toBeGreaterThanOrEqual(1)
        expect(sealed!.debriefRubric.length).toBeGreaterThan(0)
        expect(sealed!.phase2.expectedOutputV2.endsWith("\n")).toBe(true)
        expect(sealed!.phase2.specPatch.length).toBeGreaterThan(0)
        // v2 must differ from v1 (the twist changes the output after adaptation)
        expect(sealed!.phase2.expectedOutputV2).not.toBe(pack.expectedOutput)
      })

      it("keeps the sealed bug summary out of every candidate-visible field", async () => {
        const sealed = await loadSealedPack(pack.id)
        const scenario = packToScenario(pack)
        const summary = sealed!.bugSummary.toLowerCase()
        const visible = [
          scenario.problemStatement,
          scenario.description,
          scenario.bugDescription,
          ...scenario.hints,
          ...(scenario.workspace?.files.filter((f) => !f.hidden).map((f) => f.content) ?? []),
        ]
        for (const text of visible) {
          expect(text.toLowerCase()).not.toContain(summary)
        }
      })
    })
  }
})

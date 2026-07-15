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

      it("passes the pack quality gate with no verbatim sealed-bug-summary leak", async () => {
        const sealed = await loadSealedPack(pack.id)
        expect(validatePackQuality(pack, sealed?.bugSummary)).toEqual([])
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

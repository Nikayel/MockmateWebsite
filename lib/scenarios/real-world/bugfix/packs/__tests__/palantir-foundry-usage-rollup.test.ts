// @vitest-environment node
import { describe, expect, it } from "vitest"
import { isWorkspaceScenario, validateWorkspaceScenario } from "@/lib/workspace-execution"
import { validatePackQuality } from "@/lib/bugfix/packs/scenario"
import { diffStdout } from "@/lib/bugfix/packs/stdout-oracle"
import {
  palantirFoundryUsageRollupPack as pack,
  palantirFoundryUsageRollupScenario as scenario,
} from "../palantir-foundry-usage-rollup"
import { bugfixPackScenarios } from "../index"
import { sealed } from "@/lib/scenarios/sealed/palantir-foundry-usage-rollup.server"

describe("palantir-foundry-usage-rollup pack", () => {
  it("passes the pack quality gate, including no verbatim sealed-bug-summary leak", () => {
    expect(validatePackQuality(pack, sealed.bugSummary)).toEqual([])
  })

  it("compiles to a structurally valid workspace scenario carrying the pack marker", () => {
    expect(isWorkspaceScenario(scenario)).toBe(true)
    expect(validateWorkspaceScenario(scenario as never)).toEqual([])
    expect(scenario.pack?.packId).toBe("palantir-foundry-usage-rollup")
    expect(scenario.pack?.runCmd).toBe("python3 src/rollup.py fixtures/input.txt")
  })

  it("is registered in the pack registry (but not the locked legacy-10 bank)", () => {
    expect(bugfixPackScenarios.map((s) => s.id)).toContain("palantir-foundry-usage-rollup")
  })

  it("has partial wrongness — buggy output differs from the oracle only in the acme row", () => {
    const diff = diffStdout(sealed.buggyOutput, pack.expectedOutput)
    expect(diff.match).toBe(false)
    expect(diff.section).toBe("=== Compute-seconds by account ===")
    expect(diff.expectedLine).toBe("acme: 42")
    expect(diff.actualLine).toBe("acme: 82")
    // every other line matches
    const buggyLines = sealed.buggyOutput.split("\n")
    const oracleLines = pack.expectedOutput.split("\n")
    const differing = oracleLines.filter((line, i) => line !== buggyLines[i])
    expect(differing).toEqual(["acme: 42"])
  })

  it("phase-2 expected_output_v2 is well-formed and folds in the audit stream", () => {
    expect(sealed.phase2.expectedOutputV2.endsWith("\n")).toBe(true)
    expect(sealed.phase2.expectedOutputV2).toContain("globex: 30") // audit added +8
    expect(sealed.phase2.expectedOutputV2).toContain("acme: 42") // audit dup deduped
  })

  it("keeps the sealed bug summary out of every candidate-visible scenario field", () => {
    const summary = sealed.bugSummary.toLowerCase()
    const visible = [
      scenario.problemStatement,
      scenario.description,
      scenario.bugDescription,
      scenario.expectedBehavior,
      ...scenario.hints,
      ...(scenario.workspace?.files.filter((f) => !f.hidden).map((f) => f.content) ?? []),
    ]
    for (const text of visible) {
      expect(text.toLowerCase()).not.toContain(summary)
    }
  })
})

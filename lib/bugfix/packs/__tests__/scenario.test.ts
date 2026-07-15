import { describe, expect, it } from "vitest"
import { isWorkspaceScenario, validateWorkspaceScenario } from "@/lib/workspace-execution"
import { packToScenario, validatePackQuality } from "../scenario"
import type { BugfixPack } from "../types"

const EXPECTED_OUTPUT = ["account totals", "acme: 42", "globex: 17", ""].join("\n")

// ~50-line source so the 40-200 line gate bound is satisfied.
const MAIN_PY = Array.from({ length: 48 }, (_, i) => `line_${i} = ${i}`).join("\n") + "\n"

function makePack(overrides: Partial<BugfixPack> = {}): BugfixPack {
  return {
    id: "pack-test-fixture",
    title: "Usage rollup totals are off for one account",
    summary: "The nightly rollup shows the wrong compute-seconds total for one account.",
    company: { tag: "palantir-fdse", roundName: "Re-engineering round", confidence: "styled" },
    companies: ["Palantir"],
    domain: "data-pipeline",
    language: "python",
    difficulty: 2,
    estMinutes: 45,
    bugClass: "double-count",
    taskMd: [
      "# Usage rollup",
      "",
      "Run: `python3 src/main.py fixtures/input.txt`",
      "",
      "Expected output:",
      "```",
      EXPECTED_OUTPUT.trimEnd(),
      "```",
      "",
    ].join("\n"),
    srcFiles: [{ path: "src/main.py", content: MAIN_PY }],
    fixtures: [{ path: "fixtures/input.txt", content: "acme,42\nglobex,17\n" }],
    runCmd: "python3 src/main.py fixtures/input.txt",
    expectedOutput: EXPECTED_OUTPUT,
    ...overrides,
  }
}

describe("packToScenario", () => {
  it("produces a structurally valid workspace BugFixScenario carrying the pack marker", () => {
    const scenario = packToScenario(makePack())

    expect(scenario.type).toBe("bugfix")
    expect(scenario.difficulty).toBe("medium")
    expect(scenario.executionMode).toBe("workspace")
    expect(isWorkspaceScenario(scenario)).toBe(true)
    expect(validateWorkspaceScenario(scenario as never)).toEqual([])
    expect(scenario.pack).toBeDefined()
    expect(scenario.pack?.runCmd).toBe("python3 src/main.py fixtures/input.txt")
    expect(scenario.pack?.expectedOutput).toBe(EXPECTED_OUTPUT)
    expect(scenario.pack?.primaryFilePath).toBe("src/main.py")
  })

  it("keeps the sealed bug summary out of every candidate-visible field", () => {
    const scenario = packToScenario(makePack())
    const sealedBugSummary = "the accumulator is reset one scope too high"

    const visible = [
      scenario.problemStatement,
      scenario.description,
      scenario.bugDescription,
      ...(scenario.workspace?.files.filter((f) => !f.hidden).map((f) => f.content) ?? []),
    ]
    for (const text of visible) {
      expect(text.toLowerCase()).not.toContain(sealedBugSummary)
    }
  })

  it("marks the oracle config file hidden and both oracle files carry only public data", () => {
    const scenario = packToScenario(makePack())
    const oracleConfig = scenario.workspace?.files.find((f) => f.path === "tests/oracle.json")
    expect(oracleConfig?.hidden).toBe(true)
    expect(oracleConfig?.content).toContain("python3 src/main.py")
  })
})

describe("validatePackQuality", () => {
  it("passes a well-formed pack", () => {
    expect(validatePackQuality(makePack())).toEqual([])
  })

  it("flags an oracle without a trailing newline", () => {
    const issues = validatePackQuality(makePack({ expectedOutput: "acme: 42" }))
    expect(issues.some((i) => i.field === "expectedOutput")).toBe(true)
  })

  it("flags CRLF in the oracle", () => {
    const bad = "account totals\r\nacme: 42\r\n"
    const issues = validatePackQuality(makePack({ expectedOutput: bad, taskMd: `oracle:\n${bad}` }))
    expect(issues.some((i) => /CR/.test(i.message))).toBe(true)
  })

  it("flags an oracle missing from task.md", () => {
    const issues = validatePackQuality(makePack({ taskMd: "# Task\n\nNo oracle embedded.\n" }))
    expect(issues.some((i) => i.field === "taskMd")).toBe(true)
  })

  it("flags giveaway markers in candidate-visible source", () => {
    const leaky = MAIN_PY + "\n# BUG: careful, this is the subtle part\n"
    const issues = validatePackQuality(
      makePack({ srcFiles: [{ path: "src/main.py", content: leaky }] })
    )
    expect(issues.some((i) => i.field === "src/main.py")).toBe(true)
  })

  it("flags a verbatim sealed-bug-summary leak", () => {
    const sealed = "accumulator reset one scope too high"
    const leaky = MAIN_PY + `\n# note: ${sealed}\n`
    const issues = validatePackQuality(
      makePack({ srcFiles: [{ path: "src/main.py", content: leaky }] }),
      sealed
    )
    expect(issues.some((i) => /sealed bug summary/.test(i.message))).toBe(true)
  })
})

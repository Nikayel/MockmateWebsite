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
    task: "Bill each account for the compute-seconds it used so the nightly totals match the metering dashboard.",
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

  it("flags a pack with no authored task", () => {
    expect(validatePackQuality(makePack({ task: "  " })).some((i) => i.field === "task")).toBe(true)
  })

  it("flags a task that restates the byte-for-byte oracle", () => {
    // The old generated template. It stated the grading mechanism rather than the
    // job and read identically on all 14 packs; name it so it cannot drift back.
    const issues = validatePackQuality(
      makePack({
        task: "Find and fix the defect so that the run prints the expected output from task.md byte-for-byte.",
      })
    )
    expect(issues.some((i) => /grading mechanism/.test(i.message))).toBe(true)
  })

  it("flags a task longer than one sentence's worth", () => {
    const issues = validatePackQuality(makePack({ task: `Bill each account. ${"x".repeat(200)}` }))
    expect(issues.some((i) => i.field === "task" && /max/.test(i.message))).toBe(true)
  })

  it("scans the task for sealed leaks — it is the brief's most prominent string", () => {
    const minimalFix = "reset the accumulator inside the per-account loop"
    const issues = validatePackQuality(makePack({ task: `Bill accounts: ${minimalFix}.` }), {
      minimalFix,
    })
    expect(issues.some((i) => i.field === "task")).toBe(true)
  })

  it("flags a verbatim sealed-bug-summary leak", () => {
    const sealed = "accumulator reset one scope too high"
    const leaky = MAIN_PY + `\n# note: ${sealed}\n`
    const issues = validatePackQuality(
      makePack({ srcFiles: [{ path: "src/main.py", content: leaky }] }),
      sealed
    )
    expect(issues.some((i) => /sealed content/.test(i.message))).toBe(true)
  })

  it("flags a verbatim sealed minimalFix leak", () => {
    // The gate took only bugSummary, so a pack could ship its own sealed fix in
    // task.md and score zero issues.
    const minimalFix = "track previous_state per monitor instead of once above the loop"
    const base = makePack()
    const issues = validatePackQuality(makePack({ taskMd: `${base.taskMd}\n\n${minimalFix}\n` }), {
      minimalFix,
    })
    expect(issues.some((i) => /sealed content/.test(i.message))).toBe(true)
  })

  it("flags a verbatim sealed bugLocation leak", () => {
    const bugLocation = "src/main.py — count(): the flag is hoisted above the loop"
    const base = makePack()
    const issues = validatePackQuality(makePack({ taskMd: `${base.taskMd}\n\n${bugLocation}\n` }), {
      bugLocation,
    })
    expect(issues.some((i) => /sealed content/.test(i.message))).toBe(true)
  })

  it("passes a clean pack when every sealed field is supplied", () => {
    expect(
      validatePackQuality(makePack(), {
        bugSummary: "a flag shared across monitors",
        minimalFix: "move the flag inside the loop",
        bugLocation: "src/main.py — count()",
      })
    ).toEqual([])
  })
})

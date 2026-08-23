import { describe, expect, it } from "vitest"
import { MAX_FILE_SIZE } from "@/lib/interview/context-window"
import {
  buildConsoleContext,
  buildCurrentCodeContext,
  buildEnvironmentContext,
  buildProviderHistory,
  buildScenarioId,
  buildSystemDesignPromptContext,
  buildUserPersonalizationContext,
  buildWorkspaceContextString,
  getSystemDesignPhase,
} from "../context-builders"

describe("chat context builders", () => {
  it("derives candidate display context from a full name", () => {
    const result = buildUserPersonalizationContext({
      email: "ada@example.com",
      full_name: "Ada Lovelace",
      subscription_tier: "pro",
      sessions_used: 7,
      previous_topics: ["arrays", "graphs"],
      skill_level: "Senior",
    })

    expect(result.userName).toBe("Ada")
    expect(result.candidateLevel).toBe("senior")
    expect(result.userContextString).toContain("- Name: Ada")
    expect(result.userContextString).toContain("- Previous topics: arrays, graphs")
    expect(result.userContextString).not.toContain("Ada Lovelace")
  })

  it("falls back to an email-derived first name", () => {
    const result = buildUserPersonalizationContext({
      email: "grace.hopper@example.com",
    })

    expect(result.userName).toBe("Grace")
    expect(result.userContextString).toContain("- Email: grace.hopper@example.com")
  })

  it("wraps and truncates current code context", () => {
    const currentCode = "x".repeat(MAX_FILE_SIZE + 5)
    const result = buildCurrentCodeContext(currentCode)

    expect(result).toContain("=== CURRENT SOLUTION CODE ===")
    expect(result).toContain("// ... [code truncated]")
    expect(result).toContain("=== END CURRENT CODE ===")
  })

  it("summarizes failing tests and recent console output", () => {
    const result = buildConsoleContext(
      [
        {
          description: "empty array",
          passed: false,
          expected: 0,
          actual: 1,
          error: "wrong count",
        },
      ],
      [{ type: "error", message: "boom" }]
    )

    expect(result).toContain("Tests have been run: 0/1 passed")
    expect(result).toContain("FAILED")
    expect(result).toContain("Expected: 0, Got: 1")
    expect(result).toContain("Looks like test 1 is failing")
    expect(result).toContain("[error] boom")
  })

  it("summarizes passing tests without asking to rerun them", () => {
    const result = buildConsoleContext([{ description: "basic case", passed: true }], undefined)

    expect(result).toContain("1/1 passed")
    expect(result).toContain("ALL PASSING")
    expect(result).toContain('DO NOT say "let\'s run the tests"')
  })

  it("builds role-aware workspace context without hidden files", () => {
    const result = buildWorkspaceContextString([
      { path: "hidden.test.js", content: "secret", hidden: true, role: "test" },
      { path: "src/readonly.js", content: "support", role: "readonly" },
      { path: "src/active.js", content: "candidate edit", role: "editable", active: true },
    ])

    expect(result).toContain("src/active.js")
    expect(result).toContain("role=editable")
    expect(result).toContain("active=true")
    expect(result).not.toContain("hidden.test.js")
    expect(result.indexOf("src/active.js")).toBeLessThan(result.indexOf("src/readonly.js"))
  })

  it("computes system design phases from elapsed minutes", () => {
    expect(getSystemDesignPhase(0)).toBe("requirements")
    expect(getSystemDesignPhase(10)).toBe("high-level")
    expect(getSystemDesignPhase(20)).toBe("deep-dive")
    expect(getSystemDesignPhase(35)).toBe("wrap-up")
  })

  it("builds system design phase guidance only for system-design scenarios", () => {
    const result = buildSystemDesignPromptContext("system-design", 21 * 60)

    expect(result.isSystemDesign).toBe(true)
    expect(result.elapsedMinutes).toBe(21)
    expect(result.systemDesignPhase).toBe("deep-dive")
    expect(result.systemDesignContext).toContain("DEEP DIVE PHASE")

    expect(buildSystemDesignPromptContext("dsa", 21 * 60).systemDesignContext).toBe("")
  })

  it("drops leading model messages from provider history", () => {
    const result = buildProviderHistory([
      { type: "assistant", message: "ignored" },
      { type: "user", message: "hello" },
      { type: "assistant", message: "hi" },
    ])

    expect(result).toEqual([
      { role: "user", content: "hello" },
      { role: "model", content: "hi" },
    ])
  })

  it("derives stable dsa scenario ids from titles", () => {
    expect(buildScenarioId("Two Sum!")).toBe("dsa-two-sum")
    expect(buildScenarioId(undefined)).toBeUndefined()
  })
})

describe("buildEnvironmentContext", () => {
  it("tells the model the only way to run code is the Run Tests button", () => {
    const result = buildEnvironmentContext("bugfix")

    expect(result).toContain("NO terminal")
    expect(result).toContain('"Run Tests"')
    expect(result).toContain("NEVER tell them to run a shell command")
  })

  it("uses the bugfix submit label and covers pack run commands", () => {
    const result = buildEnvironmentContext("bugfix")

    expect(result).toContain('"Submit Fix"')
    expect(result).toContain("python3 src/main.py fixtures/input.txt")
    expect(result).toContain("Refer to the button, never to the command")
  })

  it("uses the plain submit label for non-bugfix coding scenarios", () => {
    const result = buildEnvironmentContext(undefined)

    expect(result).toContain('"Submit"')
    expect(result).not.toContain("Submit Fix")
    expect(result).not.toContain("Task files may quote a run command")
  })

  it("emits nothing for system design, which has no code execution", () => {
    expect(buildEnvironmentContext("system-design")).toBe("")
  })
})

/**
 * Test results reached the model through `.slice(0, 5)`, which is wrong on any
 * problem with more than five cases. With 20 tests failing from index 10 the
 * model saw five passes under a "SOME FAILING" header, and the failing-tests
 * branch - which uses findIndex over the WHOLE array - told it to ask about
 * "test 11", a test it had never been shown.
 */
describe("test results reaching the interviewer", () => {
  /** n tests where the ones named in `failing` (0-indexed) fail. */
  const suite = (n: number, failing: number[]) =>
    Array.from({ length: n }, (_, i) => ({
      description: `case ${i + 1}`,
      passed: !failing.includes(i),
      ...(failing.includes(i) ? { error: `boom ${i + 1}`, expected: i + 1, actual: 0 } : {}),
    }))

  it("shows every test, not just the first five", () => {
    const result = buildConsoleContext(suite(20, [10]), undefined)

    expect(result).toContain("Test 1:")
    expect(result).toContain("Test 20:")
    expect(result).toContain("case 20")
  })

  it("shows the failing test the debug prompt tells it to ask about", () => {
    const result = buildConsoleContext(suite(20, [10]), undefined)

    // The prompt references test 11 via findIndex; it must be visible with its
    // failure detail, or the interviewer can name it but not help with it.
    expect(result).toContain("Looks like test 11 is failing")
    expect(result).toContain("Test 11: case 11 - FAILED ✗")
    expect(result).toContain("boom 11")
  })

  it("numbers tests as the candidate sees them, in the candidate's order", () => {
    const result = buildConsoleContext(suite(6, [4]), undefined)
    const lines = result.split("\n").filter((l) => l.startsWith("Test "))

    expect(lines.map((l) => l.slice(0, 7))).toEqual([
      "Test 1:",
      "Test 2:",
      "Test 3:",
      "Test 4:",
      "Test 5:",
      "Test 6:",
    ])
    expect(lines[4]).toContain("FAILED ✗")
  })

  it("still reports the pass count accurately", () => {
    const result = buildConsoleContext(suite(20, [10, 15]), undefined)

    expect(result).toContain("18/20 passed")
    expect(result).toContain("✗ SOME FAILING")
  })

  it("caps one oversized field without dropping any test", () => {
    const tests = [
      { description: "huge", passed: false, error: "E".repeat(5000), expected: 1, actual: 2 },
      { description: "after the huge one", passed: true },
    ]

    const result = buildConsoleContext(tests, undefined)

    expect(result).toContain("[truncated]")
    expect(result).toContain("Test 2: after the huge one")
    expect(result.length).toBeLessThan(5000)
  })

  it("keeps passing rows compact, with no error or diff noise", () => {
    const result = buildConsoleContext([{ description: "fine", passed: true }], undefined)

    expect(result).toContain("Test 1: fine - PASSED ✓")
    expect(result).not.toContain("Expected:")
  })
})

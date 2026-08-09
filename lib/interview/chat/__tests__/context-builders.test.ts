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

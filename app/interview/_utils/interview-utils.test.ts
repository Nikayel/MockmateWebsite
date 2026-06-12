import { describe, expect, it } from "vitest"
import type { Scenario } from "@/lib/scenarios"
import { getInitialInterviewerMessage } from "./interview-copy"
import { getBugfixScenarioLanguage, isLanguageSupported } from "./language"
import { formatTime } from "./time"
import {
  getPrimaryWorkspaceFile,
  getWorkspaceFileRole,
  isWorkspaceScenario,
  toWorkspaceContextFiles,
  toWorkspaceScenarioFiles,
} from "./workspace"

const baseScenario = {
  id: "test-scenario",
  title: "Test Scenario",
  difficulty: "medium",
  type: "dsa",
  companies: [],
  tags: [],
  problemStatement: "Solve it.",
  examples: [],
  constraints: [],
  estimatedTime: 30,
} as unknown as Scenario

describe("interview page helpers", () => {
  it("detects executable languages", () => {
    expect(isLanguageSupported("javascript")).toBe(true)
    expect(isLanguageSupported("python")).toBe(true)
    expect(isLanguageSupported("java")).toBe(false)
  })

  it("falls back to an available bugfix language", () => {
    const scenario = {
      ...baseScenario,
      type: "bugfix",
      buggyCode: {
        python: "def solution(): pass",
      },
    } as unknown as Scenario

    expect(getBugfixScenarioLanguage(scenario, "typescript")).toBe("python")
  })

  it("keeps a preferred bugfix language when code exists", () => {
    const scenario = {
      ...baseScenario,
      type: "bugfix",
      buggyCode: {
        javascript: "function solution() {}",
        python: "def solution(): pass",
      },
    } as unknown as Scenario

    expect(getBugfixScenarioLanguage(scenario, "javascript")).toBe("javascript")
  })

  it("maps uploaded codebase files into workspace context files", () => {
    expect(
      toWorkspaceContextFiles([
        { fileName: "src/index.ts", content: "export {}", description: "Entry point" },
      ])
    ).toEqual([
      {
        path: "src/index.ts",
        content: "export {}",
        originalContent: "export {}",
        description: "Entry point",
        role: "readonly",
      },
    ])
  })

  it("detects workspace scenarios and primary files", () => {
    const scenario = {
      ...baseScenario,
      type: "bugfix",
      executionMode: "workspace",
      workspace: {
        primaryFilePath: "src/rate-limiter.ts",
        language: "typescript",
        editableFilePaths: ["src/rate-limiter.ts"],
        visibleTestPaths: ["tests/rate-limiter.test.ts"],
        hiddenTestPaths: [],
        testRunnerPath: "tests/rate-limiter.test.ts",
        files: [
          { path: "src/rate-limiter.ts", content: "export {}", role: "editable" },
          { path: "tests/rate-limiter.test.ts", content: "test()", role: "test" },
        ],
      },
    } as unknown as Scenario

    const files = toWorkspaceScenarioFiles(scenario)

    expect(isWorkspaceScenario(scenario)).toBe(true)
    expect(getPrimaryWorkspaceFile(scenario, files)?.path).toBe("src/rate-limiter.ts")
  })

  it("infers workspace file roles", () => {
    expect(getWorkspaceFileRole("tests/search.spec.ts")).toBe("test")
    expect(getWorkspaceFileRole("README.md")).toBe("docs")
    expect(getWorkspaceFileRole("src/search.ts")).toBe("readonly")
  })

  it("formats elapsed time", () => {
    expect(formatTime(0)).toBe("00:00")
    expect(formatTime(65)).toBe("01:05")
    expect(formatTime(600)).toBe("10:00")
  })

  it("builds initial interviewer copy", () => {
    expect(getInitialInterviewerMessage("Two Sum", "easy", "dsa")).toContain(
      "Today we're working on **Two Sum**"
    )
  })
})

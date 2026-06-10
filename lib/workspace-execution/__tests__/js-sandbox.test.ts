import { describe, expect, it, vi } from "vitest"
import { stripComments } from "../js-sandbox/comments"
import { executeJsClientSide } from "../js-sandbox/dsa-runner"
import { executeWorkspaceScenarioJsClientSide } from "../js-sandbox/workspace-runner"
import { runInWorker } from "../js-sandbox/worker-runner"
import type { WorkspaceScenario } from "../types"

// Mock runInWorker
vi.mock("../js-sandbox/worker-runner", () => ({
  runInWorker: vi.fn(),
}))

describe("stripComments", () => {
  it("strips JavaScript comments correctly", () => {
    const code = `
      // This is a comment
      const x = 42; // Inline comment
      /* Block comment */
      const y = "hello // not a comment";
    `
    const cleaned = stripComments(code, "javascript")
    expect(cleaned).not.toContain("This is a comment")
    expect(cleaned).not.toContain("Inline comment")
    expect(cleaned).not.toContain("Block comment")
    expect(cleaned).toContain('const y = "hello // not a comment";')
  })

  it("strips Python comments correctly", () => {
    const code = `
      # This is a python comment
      x = 42 # Inline python comment
      """Triple quote docstring"""
      y = "hello # not a comment"
    `
    const cleaned = stripComments(code, "python")
    expect(cleaned).not.toContain("This is a python comment")
    expect(cleaned).not.toContain("Inline python comment")
    expect(cleaned).not.toContain("Triple quote docstring")
    expect(cleaned).toContain('y = "hello # not a comment"')
  })
})

describe("executeJsClientSide", () => {
  it("executes single-file DSA test cases successfully", async () => {
    // Mock runInWorker to return success
    vi.mocked(runInWorker).mockResolvedValue({
      success: true,
      result: 42,
      logs: [{ type: "log", message: "console output", timestamp: 123 }],
    })

    const testCases = [
      {
        description: "Test Case 1",
        input: { nums: [1, 2], target: 3 },
        expected: 42,
      },
    ]

    const result = await executeJsClientSide(
      "function twoSum() { return 42; }",
      "javascript",
      testCases,
      "dummy"
    )

    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(1)
    expect(result.results[0].passed).toBe(true)
    expect(result.results[0].actual).toBe(42)
    expect(result.consoleLogs).toHaveLength(1)
    expect(result.consoleLogs[0].message).toBe("console output")
  })

  it("handles execution failures correctly", async () => {
    // Mock runInWorker to return error
    vi.mocked(runInWorker).mockResolvedValue({
      success: false,
      error: "ReferenceError: x is not defined",
      logs: [],
    })

    const testCases = [
      {
        description: "Test Case 1",
        input: { nums: [1, 2], target: 3 },
        expected: 42,
      },
    ]

    const result = await executeJsClientSide(
      "function twoSum() { return x; }",
      "javascript",
      testCases,
      "two-sum"
    )

    expect(result.success).toBe(false)
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toContain("x is not defined")
  })
})

describe("executeWorkspaceScenarioJsClientSide", () => {
  const dummyScenario: WorkspaceScenario = {
    id: "dummy-bugfix",
    title: "Dummy Bugfix",
    description: "Fix the bug",
    difficulty: "easy",
    type: "bugfix",
    executionMode: "workspace",
    workspace: {
      language: "javascript",
      primaryFilePath: "src/index.js",
      testRunnerPath: "tests/runner.js",
      files: [
        { path: "src/index.js", content: "module.exports = () => 42;", readOnly: false },
        {
          path: "tests/runner.js",
          content: "const run = require('../src/index');",
          readOnly: true,
        },
      ],
    },
  }

  it("overlays edits, runs runner, and parses results", async () => {
    // Mock runInWorker to return success with workspace test results in logs
    vi.mocked(runInWorker).mockResolvedValue({
      success: true,
      logs: [
        { type: "log", message: "running tests...", timestamp: 1 },
        {
          type: "log",
          message:
            '__WORKSPACE_TEST_RESULTS__:[{"suite":"workspace","name":"test 1","passed":true,"error":null}]',
          timestamp: 2,
        },
      ],
    })

    const edits = [{ path: "src/index.js", content: "module.exports = () => 100;" }]

    const result = await executeWorkspaceScenarioJsClientSide(dummyScenario, edits)

    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(1)
    expect(result.results[0].suite).toBe("workspace")
    expect(result.results[0].name).toBe("test 1")
    expect(result.results[0].passed).toBe(true)
    expect(result.consoleLogs).toHaveLength(1)
    expect(result.consoleLogs[0].message).toBe("running tests...")
  })
})

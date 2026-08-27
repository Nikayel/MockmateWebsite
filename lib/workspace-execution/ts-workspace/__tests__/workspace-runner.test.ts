import { describe, expect, it, vi } from "vitest"

import type { WorkspaceScenario } from "../../types"
import { runTsInWorker } from "../worker-runner"
import { executeWorkspaceScenarioTsClientSide } from "../workspace-runner"

vi.mock("../worker-runner", () => ({
  runTsInWorker: vi.fn(),
}))

describe("executeWorkspaceScenarioTsClientSide", () => {
  const dummyScenario: WorkspaceScenario = {
    id: "dummy-ts",
    title: "Dummy TS workspace",
    description: "Fix the bug",
    difficulty: "easy",
    type: "bugfix",
    tags: [],
    companies: [],
    estimatedTime: 10,
    executionMode: "workspace",
    workspace: {
      language: "typescript",
      primaryFilePath: "src/index.ts",
      editableFilePaths: ["src/index.ts"],
      visibleTestPaths: ["tests/visible/index.test.ts"],
      hiddenTestPaths: ["tests/hidden/index.test.ts"],
      files: [
        {
          path: "src/index.ts",
          content: "export const x = 1",
          role: "editable",
          language: "typescript",
        },
        {
          path: "tests/visible/index.test.ts",
          content: "// visible",
          role: "test",
          language: "typescript",
        },
        {
          path: "tests/hidden/index.test.ts",
          content: "// hidden",
          role: "test",
          language: "typescript",
          hidden: true,
        },
      ],
    },
  }

  it("sends raw (untranspiled) files with testPaths/hiddenTestPaths derived from the scenario config, no entrypoint", async () => {
    vi.mocked(runTsInWorker).mockResolvedValue({
      success: true,
      logs: [
        {
          type: "log",
          message:
            '__WORKSPACE_TEST_RESULTS__:[{"suite":"s","name":"n","passed":true,"error":null,"isHidden":false}]',
          timestamp: 1,
        },
      ],
    })

    const edits = [{ path: "src/index.ts", content: "export const x = 2" }]
    const result = await executeWorkspaceScenarioTsClientSide(dummyScenario, edits)

    expect(runTsInWorker).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(runTsInWorker).mock.calls[0][0]
    expect(payload).not.toHaveProperty("entrypoint")
    expect(payload.testPaths).toEqual(["tests/visible/index.test.ts"])
    expect(payload.hiddenTestPaths).toEqual(["tests/hidden/index.test.ts"])
    // The overlay applied — the worker gets the LEARNER's edit, not the seed content — and it is
    // sent RAW (still .ts, untranspiled): transpilation happens inside the worker, not here.
    const sentIndexFile = payload.files.find((f) => f.path === "src/index.ts")
    expect(sentIndexFile?.content).toBe("export const x = 2")

    expect(result.success).toBe(true)
    expect(result.results).toEqual([
      { suite: "s", name: "n", passed: true, error: null, isHidden: false },
    ])
  })

  it("reports a workspace-level failure when the worker run fails", async () => {
    vi.mocked(runTsInWorker).mockResolvedValue({
      success: false,
      logs: [],
      error:
        "TypeScript transpilation timed out. The workspace may be too large or contain a compiler edge case.",
    })

    const result = await executeWorkspaceScenarioTsClientSide(dummyScenario, [])
    expect(result.success).toBe(false)
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/timed out/)
  })

  it("surfaces transpileTimingsMs from the worker result for logging", async () => {
    vi.mocked(runTsInWorker).mockResolvedValue({
      success: true,
      logs: [
        {
          type: "log",
          message: "__WORKSPACE_TEST_RESULTS__:[]",
          timestamp: 1,
        },
      ],
      transpileTimingsMs: { "src/index.ts": 4.2 },
    })

    const result = await executeWorkspaceScenarioTsClientSide(dummyScenario, [])
    expect(result.transpileTimingsMs).toEqual({ "src/index.ts": 4.2 })
  })
})

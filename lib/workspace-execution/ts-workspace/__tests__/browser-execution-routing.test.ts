import { describe, expect, it, vi } from "vitest"

import { executeScenarioInBrowser } from "../../browser-execution"
import type { WorkspaceScenario } from "../../types"
import { executeWorkspaceScenarioTsClientSide } from "../workspace-runner"

vi.mock("../workspace-runner", () => ({
  executeWorkspaceScenarioTsClientSide: vi.fn(),
}))
vi.mock("../../js-sandbox", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../js-sandbox")>()
  return { ...actual, executeWorkspaceScenarioJsClientSide: vi.fn() }
})

/**
 * Locks in browser-execution.ts's routing: a `language: "typescript"` workspace scenario must
 * reach executeWorkspaceScenarioTsClientSide, NOT fall through to the plain-JS runner (the two
 * behave very differently — the JS path pre-transpiles and renames paths client-side; the TS path
 * sends raw files and transpiles inside the worker).
 */
describe("executeScenarioInBrowser routing for language: typescript", () => {
  const tsScenario: WorkspaceScenario = {
    id: "dummy-ts-routing",
    title: "Dummy TS routing",
    description: "d",
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

  it("routes to executeWorkspaceScenarioTsClientSide, not the plain-JS runner", async () => {
    vi.mocked(executeWorkspaceScenarioTsClientSide).mockResolvedValue({
      success: true,
      results: [],
      consoleLogs: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 },
      error: null,
      transpileTimingsMs: {},
    })

    await executeScenarioInBrowser({ code: "", scenario: tsScenario, language: "typescript" })

    expect(executeWorkspaceScenarioTsClientSide).toHaveBeenCalledTimes(1)
  })
})

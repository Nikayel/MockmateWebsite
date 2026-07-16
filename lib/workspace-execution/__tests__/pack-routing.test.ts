import { describe, expect, it, vi, beforeEach } from "vitest"
import { executeScenarioInBrowser } from "../browser-execution"
import { isPackScenario } from "../validators"
import { runPythonInWorker } from "../python-sandbox/worker-runner"
import { packToScenario } from "@/lib/bugfix/packs/scenario"
import type { BugfixPack } from "@/lib/bugfix/packs/types"
import type { PackExecutionResult } from "../types"

vi.mock("../python-sandbox/worker-runner", () => ({
  runPythonInWorker: vi.fn(),
}))

const runPythonInWorkerMock = vi.mocked(runPythonInWorker)

const EXPECTED_OUTPUT = ["=== totals ===", "acme: 42", "globex: 17", ""].join("\n")
const MAIN_PY = Array.from({ length: 48 }, (_, i) => `line_${i} = ${i}`).join("\n") + "\n"

function makePack(overrides: Partial<BugfixPack> = {}): BugfixPack {
  return {
    id: "pack-routing-fixture",
    title: "Usage rollup totals are off for one account",
    summary: "The nightly rollup shows the wrong compute-seconds total for one account.",
    company: { tag: "palantir-fdse", roundName: "Re-engineering round", confidence: "styled" },
    companies: ["Palantir"],
    domain: "data-pipeline",
    language: "python",
    difficulty: 2,
    estMinutes: 45,
    bugClass: "double-count",
    taskMd: ["# Usage rollup", "", "```", EXPECTED_OUTPUT.trimEnd(), "```", ""].join("\n"),
    srcFiles: [{ path: "src/main.py", content: MAIN_PY }],
    fixtures: [{ path: "fixtures/input.txt", content: "acme,42\nglobex,17\n" }],
    runCmd: "python3 src/main.py fixtures/input.txt",
    expectedOutput: EXPECTED_OUTPUT,
    ...overrides,
  }
}

/** Fake a worker run whose program printed `stdout`, matching the oracle wrapper's contract. */
function workerRunPrinting(stdout: string) {
  const encoded = Buffer.from(stdout, "utf-8").toString("base64")
  return {
    success: true,
    error: null,
    logs: [{ type: "log" as const, message: `__PACK_STDOUT__:${encoded}`, timestamp: 0 }],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("pack routing", () => {
  it("recognizes a compiled pack as a pack scenario", () => {
    expect(isPackScenario(packToScenario(makePack()))).toBe(true)
  })

  /**
   * The regression that shipped: `testRunnerPath` is `tests/oracle.json`, and the
   * assert runner feeds `testRunnerPath` to Pyodide as a Python entrypoint. A JSON
   * object is a valid Python dict literal, so it ran, printed nothing, and reported
   * "Test runner did not report any test results" — the candidate's code never ran.
   */
  it("never hands the oracle JSON config to Pyodide as an entrypoint", async () => {
    runPythonInWorkerMock.mockResolvedValue(workerRunPrinting(EXPECTED_OUTPUT))

    await executeScenarioInBrowser({
      code: "",
      scenario: packToScenario(makePack()),
      language: "python",
    })

    expect(runPythonInWorkerMock).toHaveBeenCalledTimes(1)
    const { entrypoint } = runPythonInWorkerMock.mock.calls[0][0]
    expect(entrypoint).not.toBe("tests/oracle.json")
    expect(entrypoint).not.toMatch(/\.json$/)
    expect(entrypoint).toBe("__pack_oracle__.py")
  })

  it("runs the pack's runCmd and reports a byte-exact match", async () => {
    runPythonInWorkerMock.mockResolvedValue(workerRunPrinting(EXPECTED_OUTPUT))

    const result = (await executeScenarioInBrowser({
      code: "",
      scenario: packToScenario(makePack()),
      language: "python",
    })) as PackExecutionResult

    expect(result.kind).toBe("pack")
    expect(result.packRun.ran).toBe(true)
    expect(result.packRun.match).toBe(true)
    expect(result.packRun.stdout).toBe(EXPECTED_OUTPUT)
    expect(result.packRun.runCmd).toBe("python3 src/main.py fixtures/input.txt")
    expect(result.packRun.oraclePath).toBe("tests/expected_output.txt")
    expect(result.success).toBe(true)
    expect(result.summary).toMatchObject({ total: 1, passed: 1, failed: 0, passRate: 100 })
    expect(result.error).toBeNull()
  })

  it("surfaces the real stdout on a mismatch instead of a coded pass/fail", async () => {
    const wrong = EXPECTED_OUTPUT.replace("acme: 42", "acme: 84")
    runPythonInWorkerMock.mockResolvedValue(workerRunPrinting(wrong))

    const result = (await executeScenarioInBrowser({
      code: "",
      scenario: packToScenario(makePack()),
      language: "python",
    })) as PackExecutionResult

    expect(result.packRun.match).toBe(false)
    expect(result.packRun.stdout).toBe(wrong)
    expect(result.packRun.crashError).toBeNull()
    expect(result.summary).toMatchObject({ total: 1, passed: 0, failed: 1, passRate: 0 })
    // The old surface invented these; nothing may render "Expected: pass / Got: fail".
    expect(result.results[0].expected).toBeUndefined()
    expect(result.results[0].actual).toBeUndefined()
  })

  it("reports a candidate crash as terminal output, not an infrastructure error", async () => {
    runPythonInWorkerMock.mockResolvedValue({
      success: false,
      error:
        "ValueError: invalid literal for int() with base 10: 'x'\n  File \"src/main.py\", line 47",
      logs: [],
    })

    const result = (await executeScenarioInBrowser({
      code: "",
      scenario: packToScenario(makePack()),
      language: "python",
    })) as PackExecutionResult

    expect(result.packRun.ran).toBe(false)
    expect(result.packRun.crashError).toContain("ValueError")
    expect(result.packRun.match).toBe(false)
    // Top-level `error` would make the caller treat a candidate's own ValueError as
    // a service outage and swallow it behind "code execution unavailable".
    expect(result.error).toBeNull()
  })

  it("routes a non-pack workspace scenario to the assert runner's entrypoint", async () => {
    const packScenario = packToScenario(makePack())
    const assertScenario = {
      ...packScenario,
      pack: undefined,
      workspace: {
        ...packScenario.workspace,
        testRunnerPath: "tests/run_workspace_tests.py",
        files: [
          ...packScenario.workspace.files,
          {
            path: "tests/run_workspace_tests.py",
            content: "print('__WORKSPACE_TEST_RESULTS__:[]')\n",
            role: "test" as const,
            language: "python",
          },
        ],
      },
    }
    runPythonInWorkerMock.mockResolvedValue({ success: true, error: null, logs: [] })

    expect(isPackScenario(assertScenario)).toBe(false)
    await executeScenarioInBrowser({ code: "", scenario: assertScenario, language: "python" })

    expect(runPythonInWorkerMock.mock.calls[0][0].entrypoint).toBe("tests/run_workspace_tests.py")
  })
})

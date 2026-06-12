import { describe, expect, it, vi } from "vitest"
import { buildPythonWrapper, executePythonClientSide } from "../python-sandbox"
import { runPythonInWorker } from "../python-sandbox/worker-runner"

vi.mock("../python-sandbox/worker-runner", () => ({
  runPythonInWorker: vi.fn(),
}))

describe("buildPythonWrapper", () => {
  it("wraps a snake_case function with ordered test inputs", () => {
    const wrapped = buildPythonWrapper(
      "def two_sum(nums, target):\n    return [0, 1]",
      {
        input: { nums: [2, 7], target: 9 },
      },
      "def two_sum(nums, target):\n    return [0, 1]",
      "dsa-two-sum"
    )

    expect(wrapped).toContain("def two_sum")
    expect(wrapped).toContain("_processed_input")
    expect(wrapped).toContain("_result")
  })
})

describe("executePythonClientSide", () => {
  it("validates Python worker results against test cases", async () => {
    vi.mocked(runPythonInWorker).mockResolvedValue({
      success: true,
      result: [0, 1],
      logs: [{ type: "log", message: "ready", timestamp: 1 }],
    })

    const result = await executePythonClientSide(
      "def two_sum(nums, target):\n    return [0, 1]",
      [
        {
          description: "basic pair",
          input: { nums: [2, 7], target: 9 },
          expected: [0, 1],
        },
      ],
      "dsa-two-sum"
    )

    expect(result.success).toBe(true)
    expect(result.results[0]).toMatchObject({ description: "basic pair", passed: true })
    expect(result.consoleLogs[0].message).toBe("ready")
  })

  it("surfaces Python worker errors", async () => {
    vi.mocked(runPythonInWorker).mockResolvedValue({
      success: false,
      error: "NameError: name 'x' is not defined",
      logs: [],
    })

    const result = await executePythonClientSide(
      "def two_sum(nums, target):\n    return x",
      [
        {
          input: { nums: [2, 7], target: 9 },
          expected: [0, 1],
        },
      ],
      "dsa-two-sum"
    )

    expect(result.success).toBe(false)
    expect(result.results[0].error).toContain("NameError")
  })
})

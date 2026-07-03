import { describe, expect, it, vi } from "vitest"
import { compareResultSets } from "../sql-sandbox/comparator"
import { buildWorkspaceMarker, parseWorkspaceMarker } from "../sql-sandbox/workspace-marker"
import { executeSqlClientSide } from "../sql-sandbox/single-file-runner"
import { executeWorkspaceScenarioSqlClientSide } from "../sql-sandbox/workspace-runner"
import { runSqlInWorker } from "../sql-sandbox/worker-runner"
import type { WorkspaceScenario } from "../types"

vi.mock("../sql-sandbox/worker-runner", () => ({
  runSqlInWorker: vi.fn(),
}))

describe("compareResultSets", () => {
  const cols = ["a", "b"]

  it("multiset-compares by default (row order does not matter)", () => {
    const expected = {
      columns: cols,
      rows: [
        [1, "x"],
        [2, "y"],
      ],
    }
    const actual = {
      columns: cols,
      rows: [
        [2, "y"],
        [1, "x"],
      ],
    }
    expect(compareResultSets(expected, actual).passed).toBe(true)
  })

  it("enforces row order when orderMatters is set", () => {
    const expected = {
      columns: cols,
      rows: [
        [1, "x"],
        [2, "y"],
      ],
    }
    const actual = {
      columns: cols,
      rows: [
        [2, "y"],
        [1, "x"],
      ],
    }
    expect(compareResultSets(expected, actual, { orderMatters: true }).passed).toBe(false)
    expect(compareResultSets(expected, expected, { orderMatters: true }).passed).toBe(true)
  })

  it("treats an empty result (0 rows expected, 0 returned) as a pass", () => {
    const expected = { columns: cols, rows: [] }
    const actual = { columns: cols, rows: [] }
    expect(compareResultSets(expected, actual).passed).toBe(true)
  })

  it("fails on row-count and column-count mismatch", () => {
    const expected = { columns: cols, rows: [[1, "x"]] }
    expect(compareResultSets(expected, { columns: cols, rows: [] }).passed).toBe(false)
    expect(compareResultSets(expected, { columns: ["a"], rows: [[1]] }).passed).toBe(false)
  })

  it("compares NULL === NULL and distinguishes NULL from other values", () => {
    const expected = { columns: cols, rows: [[null, 1]] }
    expect(compareResultSets(expected, { columns: cols, rows: [[null, 1]] }).passed).toBe(true)
    expect(compareResultSets(expected, { columns: cols, rows: [[0, 1]] }).passed).toBe(false)
  })

  it("honors caseInsensitive for string cells", () => {
    const expected = { columns: cols, rows: [["Ada", 1]] }
    const actual = { columns: cols, rows: [["ada", 1]] }
    expect(compareResultSets(expected, actual).passed).toBe(false)
    expect(compareResultSets(expected, actual, { caseInsensitive: true }).passed).toBe(true)
  })

  it("passes on column-name drift (aliases are advisory) but reports it", () => {
    const expected = { columns: ["order_id"], rows: [[1]] }
    const actual = { columns: ["id"], rows: [[1]] }
    const result = compareResultSets(expected, actual)
    expect(result.passed).toBe(true)
    expect(result.reason).toContain("order_id")
  })

  it("fails a null/undefined actual", () => {
    expect(compareResultSets({ columns: cols, rows: [] }, null).passed).toBe(false)
  })
})

describe("workspace marker", () => {
  it("round-trips the byte-identical marker the worker emits", () => {
    const results = [
      { suite: "schema", name: "cols", passed: true, error: null },
      { suite: "rows", name: "count", passed: false, error: "1 row(s) violated this check" },
    ]
    const marker = buildWorkspaceMarker(results)
    expect(marker.startsWith("__WORKSPACE_TEST_RESULTS__:")).toBe(true)
    expect(parseWorkspaceMarker([{ message: marker }])).toEqual(results)
  })

  it("ignores non-marker log lines and returns null when absent/malformed", () => {
    expect(parseWorkspaceMarker([{ message: "just a log" }])).toBeNull()
    expect(parseWorkspaceMarker([{ message: "__WORKSPACE_TEST_RESULTS__:{oops" }])).toBeNull()
  })
})

describe("executeSqlClientSide (single-file)", () => {
  const scenario = { id: "sql-l1-x", seedSql: "CREATE TABLE t (id);" }
  const testCases = [
    {
      description: "Result set matches",
      expected: { columns: ["id"], rows: [[1], [2]] },
      orderMatters: false,
    },
  ]

  it("passes when the returned result set matches", async () => {
    vi.mocked(runSqlInWorker).mockResolvedValue({
      success: true,
      result: { columns: ["id"], rows: [[2], [1]] },
      logs: [],
    })
    const result = await executeSqlClientSide("SELECT id FROM t;", testCases, scenario)
    expect(result.success).toBe(true)
    expect(result.results[0].passed).toBe(true)
  })

  it("fails when the returned result set is wrong", async () => {
    vi.mocked(runSqlInWorker).mockResolvedValue({
      success: true,
      result: { columns: ["id"], rows: [[1]] },
      logs: [],
    })
    const result = await executeSqlClientSide("SELECT id FROM t LIMIT 1;", testCases, scenario)
    expect(result.success).toBe(false)
    expect(result.results[0].passed).toBe(false)
  })

  it("passes an empty result when the expected set is empty", async () => {
    vi.mocked(runSqlInWorker).mockResolvedValue({
      success: true,
      result: { columns: ["id"], rows: [] },
      logs: [],
    })
    const emptyCase = [{ expected: { columns: ["id"], rows: [] } }]
    const result = await executeSqlClientSide("SELECT id FROM t WHERE 0;", emptyCase, scenario)
    expect(result.success).toBe(true)
    expect(result.results[0].passed).toBe(true)
  })

  it("surfaces a worker/SQL error as a failed result", async () => {
    vi.mocked(runSqlInWorker).mockResolvedValue({
      success: false,
      error: "no such column: nope",
      logs: [],
    })
    const result = await executeSqlClientSide("SELECT nope FROM t;", testCases, scenario)
    expect(result.success).toBe(false)
    expect(result.results[0].error).toContain("no such column")
  })
})

describe("executeWorkspaceScenarioSqlClientSide", () => {
  const scenario = {
    executionMode: "workspace",
    workspace: {
      language: "sql",
      primaryFilePath: "solution.sql",
      editableFilePaths: ["solution.sql"],
      files: [{ path: "solution.sql", content: "CREATE TABLE t (id);", role: "editable" }],
      seedSql: "",
      assertions: [{ suite: "rows", name: "has rows", sql: "SELECT 1 WHERE 1=0" }],
    },
  } as unknown as WorkspaceScenario

  it("parses the marker and reports success when every assertion passes", async () => {
    const marker = buildWorkspaceMarker([
      { suite: "schema", name: "cols", passed: true, error: null },
      { suite: "idempotency", name: "twice", passed: true, error: null },
    ])
    vi.mocked(runSqlInWorker).mockResolvedValue({
      success: true,
      logs: [{ type: "log", message: marker, timestamp: 1 }],
    })
    const result = await executeWorkspaceScenarioSqlClientSide(scenario, [])
    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(2)
  })

  it("reports failure when an assertion violates", async () => {
    const marker = buildWorkspaceMarker([
      { suite: "rows", name: "count", passed: false, error: "1 row(s) violated this check" },
    ])
    vi.mocked(runSqlInWorker).mockResolvedValue({
      success: true,
      logs: [{ type: "log", message: marker, timestamp: 1 }],
    })
    const result = await executeWorkspaceScenarioSqlClientSide(scenario, [])
    expect(result.success).toBe(false)
    expect(result.results[0].passed).toBe(false)
  })

  it("surfaces a worker error as a single failed row", async () => {
    vi.mocked(runSqlInWorker).mockResolvedValue({
      success: false,
      error: "SQL engine failed to start",
      logs: [],
    })
    const result = await executeWorkspaceScenarioSqlClientSide(scenario, [])
    expect(result.success).toBe(false)
    expect(result.results[0].error).toContain("SQL engine failed")
  })
})

/**
 * Integration guard for the SQL workspace "Resulting tables" preview (L3/L4). After a learner runs
 * a workspace script, the player re-runs the SAME seed + script display-only (no assertions) and
 * shows the tables the script produced, so a green/red result is backed by data the learner can see.
 *
 * This test replicates the worker's `workspace-preview` path EXACTLY (seed, then the script with its
 * error captured, then introspect every user table) against the real self-hosted sql.js WASM — so
 * "produces visible tables here" == "produces visible tables in the browser". It asserts:
 *   - every L3/L4 correct reference solution yields at least one resulting table and no script error
 *     (the transparency fix always has something concrete to show),
 *   - a mid-script SQL error still surfaces the tables built before it, plus the error,
 *   - the L3 foreign-keys apply solution lands exactly one customer and one order (the orphan
 *     is cleanly kept out) — the concrete state the hidden assertions check.
 */
import { beforeAll, describe, expect, it } from "vitest"
import { createRequire } from "module"
import { resolve } from "path"
import { SQL_LEVELS } from "@/lib/tutorials/sql/curriculum"
import type { SqlExercise } from "@/lib/tutorials/types"

interface SqlJsStatement {
  getColumnNames(): string[]
  step(): boolean
  get(): unknown[]
  free(): void
}
interface SqlJsDatabase {
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>
  prepare(sql: string): SqlJsStatement
  close(): void
}
interface SqlJsStatic {
  Database: new () => SqlJsDatabase
}

const require = createRequire(import.meta.url)
const WASM_JS = resolve(process.cwd(), "public/wasm/sql-wasm.js")
const WASM_BIN = resolve(process.cwd(), "public/wasm/sql-wasm.wasm")

let SQL: SqlJsStatic

beforeAll(async () => {
  const initSqlJs = require(WASM_JS) as (config: {
    locateFile: () => string
  }) => Promise<SqlJsStatic>
  SQL = await initSqlJs({ locateFile: () => WASM_BIN })
})

interface PreviewTable {
  name: string
  result: { columns: string[]; rows: unknown[][] }
  totalRows: number
}
interface PreviewResult {
  tables: PreviewTable[]
  scriptError: string | null
}

/** Replicates the worker's `runSelect`: prepared statement so columns survive a 0-row result. */
function runSelect(db: SqlJsDatabase, sql: string): { columns: string[]; rows: unknown[][] } {
  const stmt = db.prepare(sql)
  try {
    const columns = stmt.getColumnNames()
    const rows: unknown[][] = []
    while (stmt.step()) rows.push(stmt.get())
    return { columns, rows }
  } finally {
    stmt.free()
  }
}

/** Replicates the worker's `introspectTables`. */
function introspectTables(db: SqlJsDatabase, limit = 8): PreviewTable[] {
  const listed = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )
  const tables: PreviewTable[] = []
  if (listed.length) {
    for (const [name] of listed[0].values as string[][]) {
      const result = runSelect(db, `SELECT * FROM "${name}" LIMIT ${limit}`)
      const counted = db.exec(`SELECT COUNT(*) FROM "${name}"`)
      const totalRows = counted.length ? Number(counted[0].values[0][0]) : result.rows.length
      tables.push({ name, result, totalRows })
    }
  }
  return tables
}

/** Replicates the worker's `workspace-preview` mode: seed, run script (capture error), introspect. */
function previewWorkspace(seedSql: string, code: string): PreviewResult {
  const db = new SQL.Database()
  try {
    if (seedSql) db.exec(seedSql)
    let scriptError: string | null = null
    try {
      if (code) db.exec(code)
    } catch (error) {
      scriptError = error instanceof Error ? error.message : String(error)
    }
    return { tables: introspectTables(db), scriptError }
  } finally {
    db.close()
  }
}

/** Every workspace exercise across all levels, with its lesson id for readable failures. */
function workspaceExercises(): Array<{ lessonId: string; kind: string; exercise: SqlExercise }> {
  const out: Array<{ lessonId: string; kind: string; exercise: SqlExercise }> = []
  for (const level of SQL_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        const slots: Array<[string, SqlExercise | undefined]> = [
          ["apply", lesson.apply],
          ["practice", lesson.practice],
          ...(lesson.extraPractice ?? []).map((ex, i): [string, SqlExercise] => [`extra-${i}`, ex]),
        ]
        for (const [kind, exercise] of slots) {
          if (exercise?.executionMode === "workspace")
            out.push({ lessonId: lesson.id, kind, exercise })
        }
      }
    }
  }
  return out
}

describe("SQL workspace resulting-tables preview", () => {
  const all = workspaceExercises()

  it("has workspace exercises to cover", () => {
    expect(all.length).toBeGreaterThan(0)
  })

  // Only exercises that ship a reference solution can be auto-verified (Practice hides its answer).
  const withReference = all.filter(({ exercise }) => Boolean(exercise.referenceSolution))

  it("some workspace exercises ship a reference solution", () => {
    expect(withReference.length).toBeGreaterThan(0)
  })

  for (const { lessonId, kind, exercise } of withReference) {
    it(`${lessonId} (${kind}): correct solution produces visible resulting tables`, () => {
      const seed = exercise.workspace?.seedSql ?? ""
      const { tables, scriptError } = previewWorkspace(seed, exercise.referenceSolution as string)
      // A correct L3/L4 solution runs cleanly and always leaves tables the learner can see.
      expect(scriptError).toBeNull()
      expect(tables.length).toBeGreaterThan(0)
    })
  }

  it("surfaces tables built before a mid-script SQL error, plus the error", () => {
    const { tables, scriptError } = previewWorkspace(
      "",
      "CREATE TABLE t (id INTEGER); INSERT INTO t VALUES (1); SELECT * FROM missing_table;"
    )
    expect(scriptError).toBeTruthy()
    const t = tables.find((table) => table.name === "t")
    expect(t).toBeDefined()
    expect(t?.totalRows).toBe(1)
  })

  it("L3 foreign-keys apply: exactly one customer and one order land (orphan kept out)", () => {
    const fk = all.find((e) => e.exercise.id === "sql-l3-foreign-keys-apply")
    expect(fk).toBeDefined()
    const seed = fk?.exercise.workspace?.seedSql ?? ""
    const { tables, scriptError } = previewWorkspace(seed, fk?.exercise.referenceSolution as string)
    expect(scriptError).toBeNull()
    const customers = tables.find((t) => t.name === "customers")
    const orders = tables.find((t) => t.name === "orders")
    expect(customers?.totalRows).toBe(1)
    expect(orders?.totalRows).toBe(1)
  })
})

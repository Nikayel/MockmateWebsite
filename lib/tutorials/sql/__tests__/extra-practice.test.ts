/**
 * Correctness guard for the optional "Extra practice" drills. Every drill is a single-file SQL
 * exercise whose `expected` set must be exactly what its `referenceSolution` produces. This runs each
 * drill's reference through the SAME sql.js WASM the grader uses, then compares to `expected` with the
 * SAME comparator the grader uses (honoring `orderMatters`). If a seed or reference ever drifts, this
 * fails loudly instead of shipping an ungradeable drill.
 */
import { beforeAll, describe, expect, it } from "vitest"
import { createRequire } from "module"
import { resolve } from "path"
import { SQL_LEVELS } from "../curriculum"
import { compareResultSets } from "@/lib/workspace-execution/sql-sandbox/comparator"
import type { SqlExercise, SqlResultSet } from "@/lib/tutorials/types"

interface SqlJsStatement {
  getColumnNames(): string[]
  step(): boolean
  get(): unknown[]
  free(): void
}
interface SqlJsDatabase {
  exec(sql: string): unknown
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

function runQuery(seedSql: string, query: string): SqlResultSet {
  const db = new SQL.Database()
  try {
    db.exec(seedSql)
    const stmt = db.prepare(query)
    try {
      const columns = stmt.getColumnNames()
      const rows: unknown[][] = []
      while (stmt.step()) rows.push(stmt.get())
      return { columns, rows }
    } finally {
      stmt.free()
    }
  } finally {
    db.close()
  }
}

const lessons = SQL_LEVELS.flatMap((level) => level.modules.flatMap((mod) => mod.lessons))
const drills: Array<{ lessonId: string; ex: SqlExercise }> = lessons.flatMap((lesson) =>
  (lesson.extraPractice ?? []).map((ex) => ({ lessonId: lesson.id, ex }))
)

describe("SQL extra-practice drills", () => {
  it("there are drills to validate", () => {
    expect(drills.length).toBeGreaterThan(0)
  })

  it("every drill has a unique, correctly-namespaced id", () => {
    const ids = drills.map((d) => d.ex.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const { lessonId, ex } of drills) {
      expect(ex.id.startsWith(lessonId + "-drill")).toBe(true)
    }
  })

  for (const { ex } of drills) {
    it(`${ex.id}: reference solution reproduces expected`, () => {
      expect(ex.executionMode).toBe("single-file")
      expect(ex.singleFile).toBeTruthy()
      expect(ex.referenceSolution).toBeTruthy()
      const { seedSql, expected, orderMatters, caseInsensitive } = ex.singleFile!
      const actual = runQuery(seedSql, ex.referenceSolution as string)
      const result = compareResultSets(expected, actual, { orderMatters, caseInsensitive })
      // If this fails, the expected set no longer matches a correct run — fix the seed/reference/expected.
      expect(result.passed, `${ex.id}: ${result.reason ?? "mismatch"}`).toBe(true)
    })
  }
})

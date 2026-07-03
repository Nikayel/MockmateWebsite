/**
 * Integration guard for SQL teach demos. The Read phase (TeachPanel) executes a lesson's `demoCode`
 * LIVE against its `demoSeedSql` and renders the output table, so a demo that references a missing
 * table or column would show the learner an error instead of a result. This test runs every
 * populated demo through the real sql.js engine (the self-hosted WASM the worker uses) and asserts
 * it returns a genuine result set. It also fails if a demo carries a seed but no code, or vice versa.
 */
import { beforeAll, describe, expect, it } from "vitest"
import { createRequire } from "module"
import { resolve } from "path"
import { SQL_LEVELS } from "../curriculum"

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

/** Replicates the worker's single-file path: db.exec(seed), then prepare + step the demo query. */
function runDemo(seedSql: string, code: string): { columns: string[]; rows: unknown[][] } {
  const db = new SQL.Database()
  try {
    if (seedSql) db.exec(seedSql)
    const stmt = db.prepare(code)
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

const demoLessons = lessons.filter((lesson) => lesson.teach.demoSeedSql)

describe("SQL teach demos", () => {
  it("has SQL_LEVELS loaded", () => {
    expect(lessons.length).toBeGreaterThan(0)
  })

  it("never carries a demoSeedSql without a demoCode to run against it", () => {
    const orphaned = lessons
      .filter((lesson) => lesson.teach.demoSeedSql && !lesson.teach.demoCode)
      .map((lesson) => lesson.id)
    expect(orphaned).toEqual([])
  })

  for (const lesson of demoLessons) {
    it(`${lesson.id}: demo executes and returns a result set`, () => {
      const { demoSeedSql, demoCode } = lesson.teach
      const result = runDemo(demoSeedSql as string, demoCode as string)
      expect(Array.isArray(result.columns)).toBe(true)
      // A worked example shows a table, so it must return at least one column.
      expect(result.columns.length).toBeGreaterThan(0)
    })
  }
})

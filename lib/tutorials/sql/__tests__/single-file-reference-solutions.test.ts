/**
 * Correctness guard for every single-file (L1/L2-style) SQL lesson: the authored `referenceSolution`
 * must actually produce the lesson's own stated `singleFile.expected` result set, graded through the
 * SAME comparator the platform uses at runtime (`compareResultSets`, honoring orderMatters /
 * assertColumnNames / caseInsensitive). Without this, an answer key can silently disagree with the
 * expected rows a learner is graded against — marking a correct learner wrong, or a wrong learner
 * right. Its sibling `reference-solutions.test.ts` covers the workspace (assertion-graded) path; this
 * covers the single-file (result-set-graded) path, which nothing executed before. Runs against the
 * same self-hosted sql.js WASM the worker uses.
 */
import { beforeAll, describe, expect, it } from "vitest"
import { createRequire } from "module"
import { resolve } from "path"
import { SQL_LEVELS } from "../curriculum"
import {
  compareResultSets,
  type SqlResultSet,
} from "@/lib/workspace-execution/sql-sandbox/comparator"
import type { SqlExercise } from "@/lib/tutorials/types"

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

/** Replicates the worker's single-file path: db.exec(seed), then prepare + step the SELECT. */
function runSelect(seedSql: string, code: string): SqlResultSet {
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

interface SingleFileCase {
  lessonId: string
  slot: string
  exercise: SqlExercise
}

const cases: SingleFileCase[] = []
for (const level of SQL_LEVELS) {
  for (const mod of level.modules) {
    for (const lesson of mod.lessons) {
      for (const slot of ["apply", "practice"] as const) {
        const exercise = lesson[slot] as SqlExercise | undefined
        if (exercise?.singleFile?.expected && exercise.referenceSolution) {
          cases.push({ lessonId: lesson.id, slot, exercise })
        }
      }
    }
  }
}

describe("SQL single-file reference solutions produce their stated expected result set", () => {
  it("collected single-file cases", () => {
    expect(cases.length).toBeGreaterThan(0)
  })

  for (const { lessonId, slot, exercise } of cases) {
    it(`${lessonId} [${slot}]: reference solution matches expected`, () => {
      const grading = exercise.singleFile!
      const actual = runSelect(grading.seedSql ?? "", exercise.referenceSolution as string)
      const comparison = compareResultSets(grading.expected, actual, {
        orderMatters: grading.orderMatters,
        caseInsensitive: grading.caseInsensitive,
        assertColumnNames: grading.assertColumnNames,
      })
      // A soft column-name advisory still counts as passed; only a hard mismatch fails.
      expect(
        comparison.passed,
        `${lessonId} [${slot}] reference solution does not match its own expected set: ${comparison.reason}\n` +
          `expected columns=${JSON.stringify(grading.expected.columns)} rows=${JSON.stringify(grading.expected.rows)}\n` +
          `actual   columns=${JSON.stringify(actual.columns)} rows=${JSON.stringify(actual.rows)}`
      ).toBe(true)
    })
  }
})

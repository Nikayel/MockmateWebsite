/**
 * Correctness guard for the optional "Extra practice" drills: a drill's answer key must actually be
 * correct under the same engine the learner is graded by.
 *
 * Drills come in both grading modes, because `SqlLessonPlayer` renders a drill through the very same
 * `renderExercise` branch as Apply and Practice: a single-file drill gets `SqlExerciseRunner`, a
 * workspace drill gets `WorkspaceExerciseRunner`. So this checks each mode the way that mode is
 * graded:
 *  - single-file: the `referenceSolution` must reproduce `expected` exactly, through the SAME sql.js
 *    WASM and the SAME comparator the grader uses (honoring `orderMatters` / `caseInsensitive`).
 *  - workspace: the `referenceSolution` script must yield zero rows for every hidden assertion, and
 *    survive the idempotency double-run when `checkIdempotency` is set (the same bar
 *    `reference-solutions.test.ts` holds Apply and Practice scripts to).
 *
 * If a seed or reference ever drifts, this fails loudly instead of shipping an ungradeable drill.
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

/** Runs one assertion query against an already-populated db; returns the offending row count. */
function offendingRows(db: SqlJsDatabase, sql: string): number {
  const stmt = db.prepare(sql)
  try {
    let n = 0
    while (stmt.step()) n++
    return n
  } finally {
    stmt.free()
  }
}

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
    it(`${ex.id}: reference solution is correct under the grader`, () => {
      expect(ex.referenceSolution, `${ex.id}: drills must ship a reference solution`).toBeTruthy()

      if (ex.executionMode === "workspace") {
        const ws = ex.workspace
        expect(ws, `${ex.id}: workspace drill without workspace grading`).toBeTruthy()
        expect(
          ws!.assertions.length,
          `${ex.id}: workspace drill with no assertions`
        ).toBeGreaterThan(0)
        const db = new SQL.Database()
        try {
          if (ws!.seedSql) db.exec(ws!.seedSql)
          db.exec(ex.referenceSolution as string)
          const failed = ws!.assertions.filter((a) => offendingRows(db, a.sql) > 0)
          expect(
            failed.map((a) => a.name),
            `${ex.id}: reference violates its own assertions`
          ).toEqual([])
          if (ws!.checkIdempotency) {
            db.exec(ex.referenceSolution as string)
            const failedAgain = ws!.assertions.filter((a) => offendingRows(db, a.sql) > 0)
            expect(
              failedAgain.map((a) => a.name),
              `${ex.id}: reference is not idempotent on a second run`
            ).toEqual([])
          }
        } finally {
          db.close()
        }
        return
      }

      expect(ex.executionMode).toBe("single-file")
      expect(ex.singleFile).toBeTruthy()
      const { seedSql, expected, orderMatters, caseInsensitive } = ex.singleFile!
      const actual = runQuery(seedSql, ex.referenceSolution as string)
      const result = compareResultSets(expected, actual, { orderMatters, caseInsensitive })
      // If this fails, the expected set no longer matches a correct run — fix the seed/reference/expected.
      expect(result.passed, `${ex.id}: ${result.reason ?? "mismatch"}`).toBe(true)
    })
  }
})

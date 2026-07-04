/**
 * Correctness guard for every workspace (script-graded) SQL lesson: the authored `referenceSolution`
 * must actually PASS its own hidden assertions. Each assertion query returns the OFFENDING rows, so a
 * correct solution yields zero rows for every one (the dbt "violations = 0" convention). We also
 * re-run the script once more on the same database to confirm `checkIdempotency` solutions stay green
 * on a second application. Runs against the same self-hosted sql.js WASM the worker uses.
 */
import { beforeAll, describe, expect, it } from "vitest"
import { createRequire } from "module"
import { resolve } from "path"
import { SQL_LEVELS } from "../curriculum"
import type { SqlExercise } from "@/lib/tutorials/types"

interface SqlJsStatement {
  step(): boolean
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

/** Runs one assertion query; returns the count of offending rows (0 = pass). */
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

interface WorkspaceCase {
  lessonId: string
  slot: string
  exercise: SqlExercise
}

const cases: WorkspaceCase[] = []
for (const level of SQL_LEVELS) {
  for (const mod of level.modules) {
    for (const lesson of mod.lessons) {
      for (const slot of ["apply", "practice"] as const) {
        const exercise = lesson[slot] as SqlExercise | undefined
        if (exercise?.workspace && exercise.referenceSolution) {
          cases.push({ lessonId: lesson.id, slot, exercise })
        }
      }
    }
  }
}

describe("SQL workspace reference solutions pass their assertions", () => {
  it("collected workspace cases", () => {
    expect(cases.length).toBeGreaterThan(0)
  })

  for (const { lessonId, slot, exercise } of cases) {
    it(`${lessonId} [${slot}]: reference solution yields zero assertion violations`, () => {
      const ws = exercise.workspace!
      const db = new SQL.Database()
      try {
        if (ws.seedSql) db.exec(ws.seedSql)
        db.exec(exercise.referenceSolution as string)
        const firstPass = ws.assertions.map((a) => ({ name: a.name, n: offendingRows(db, a.sql) }))
        expect(firstPass.filter((r) => r.n > 0)).toEqual([])

        if (ws.checkIdempotency) {
          db.exec(exercise.referenceSolution as string)
          const secondPass = ws.assertions.map((a) => ({
            name: a.name,
            n: offendingRows(db, a.sql),
          }))
          expect(secondPass.filter((r) => r.n > 0)).toEqual([])
        }
      } finally {
        db.close()
      }
    })
  }
})

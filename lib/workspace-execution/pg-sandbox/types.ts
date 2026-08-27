/**
 * Types for the PGlite ("pg-sandbox") suite engine — the browser worker path
 * (public/workers/pg-sandbox-worker.js) and the Node path (node-runner.ts) both consume/produce
 * these. See public/workers/pg-suite-core.mjs's header for the full design (single-connection
 * posture, non-superuser execution posture, why the shared core is plain ESM).
 */
import type { WorkspaceExecutionResult, WorkspaceTestResult } from "../types"

export type { WorkspaceExecutionResult, WorkspaceTestResult }

/**
 * One graded check. `sql` may be multiple statements (e.g. `SET ROLE ...; SELECT
 * set_config(...); <the actual check>;`) — only the LAST statement's result set is graded (see
 * pg-suite-core.mjs's `lastResultSet`), so setup statements are free to precede the real query.
 *
 * `expect: "zero-rows"` is the dbt-style "count of violations = 0" pattern already used by
 * sql-sandbox's assertions: the query should select the rows that VIOLATE the invariant, and
 * passing means it returned none. `expect: { rows }` instead compares the query's own output,
 * positionally by column order, against a literal expected 2D array.
 */
export interface PgSuiteAssertion {
  id: string
  humanName?: string
  sql: string
  expect: "zero-rows" | { rows: unknown[][] }
}

export interface PgSuiteOptions {
  /**
   * After assertions run once, runs `learnerSql` a SECOND time (still wrapped in `SET ROLE`, see
   * pg-suite-core.mjs) against the SAME database state (no re-seed), then re-runs every assertion
   * and adds one synthetic result summarizing whether they all still pass. Opt-in: a ticket whose
   * reference solution is not idempotent (e.g. a bare `CREATE POLICY` with no `DROP POLICY IF
   * EXISTS` first) must not enable this.
   */
  doubleRunIdempotency?: boolean
}

/**
 * A PGlite grading suite: migrations[] (schema, applied in array order) -> optional seed data ->
 * the learner's own SQL -> assertions. Content-authored (compiled workbook tickets); not a raw
 * client input, so this module does not Zod-validate it — see lib/sprint-labs's own trust
 * boundary for anything that DOES cross from an untrusted client.
 */
export interface PgSuite {
  migrations: string[]
  seedSql?: string
  learnerSql: string
  assertions: PgSuiteAssertion[]
  options?: PgSuiteOptions
}

/** Message payload the main thread posts to pg-sandbox-worker.js. */
export interface PgWorkerRequest {
  mode: "warm" | "suite"
  suite?: PgSuite
}

/** Payload the worker-runner assembles from the worker's `{type: "result"}` message — mirrors
 *  sql-sandbox/worker-runner.ts's SqlWorkerRunResult shape exactly. */
export interface PgWorkerRunResult {
  success: boolean
  logs: WorkspaceExecutionResult["consoleLogs"]
  error?: string
}

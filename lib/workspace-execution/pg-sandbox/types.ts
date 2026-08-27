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
 * set_config(...); <the actual check>;`) — only the LAST statement's result set (or thrown error,
 * for `"raises"`/`{raises}`) is graded (see pg-suite-core.mjs's `lastResultSet`), so setup
 * statements are free to precede the real query.
 *
 * Four expectation shapes:
 *  - `"zero-rows"` — the dbt-style "count of violations = 0" pattern already used by
 *    sql-sandbox's assertions: the query should select the rows that VIOLATE the invariant, and
 *    passing means it returned none. The last statement MUST be a row-returning query (a SELECT);
 *    if it produced no result columns at all (e.g. it was a bare INSERT/UPDATE/DELETE with no
 *    RETURNING), the check fails loudly rather than vacuously passing — a statement that returns
 *    no result set is not "zero rows", it is "not a check of this shape at all".
 *  - `{ rows: unknown[][] }` — compares the query's own output, POSITIONALLY by column order and
 *    by ROW ORDER (there is no implicit sort — an assertion's SQL needs its own `ORDER BY`
 *    whenever row order matters, which for this shape is effectively always), against a literal
 *    expected 2D array. `actual` values are normalized toward `expected`'s types before comparing
 *    (see pg-suite-core.mjs's `normalizeCell` for the exact rules): a BigInt cell becomes a
 *    string, a NUMERIC/DECIMAL column's string becomes a number when the expectation at that
 *    position is itself a number, and a DATE/TIMESTAMP cell becomes its full ISO-8601 string
 *    (`YYYY-MM-DDTHH:mm:ss.sssZ` — always the full timestamp form, even for a DATE column with no
 *    time component; a bare `"2024-01-01"` expectation will not match).
 *  - `"raises"` — passes iff the SQL throws (any error); fails ("...completed without one") if it
 *    does not.
 *  - `{ raises: string }` — passes iff the SQL throws AND the error message contains the given
 *    substring (case-insensitive); this is the correct shape for grading a rejection as the
 *    DESIRED outcome (e.g. "a WITH CHECK policy rejects a cross-tenant insert" should be a
 *    PASSING gate when the insert is correctly rejected — `"zero-rows"` against an INSERT's empty
 *    result set gets this backwards, which is exactly the bug this shape replaces).
 */
export interface PgSuiteAssertion {
  id: string
  humanName?: string
  sql: string
  expect: "zero-rows" | { rows: unknown[][] } | "raises" | { raises: string }
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

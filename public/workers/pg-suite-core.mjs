/**
 * Shared, runtime-agnostic core of the Sprint Labs PGlite ("pg-sandbox") suite engine.
 *
 * This is the ONE place the suite-execution algorithm (migrations[] -> seed -> learner SQL ->
 * assertions, plus the app-role/RLS posture below) is written. Both runtimes are thin drivers that
 * construct their own `PGlite` instance and hand it to `runPgSuiteCore`:
 *   - public/workers/pg-sandbox-worker.js (browser, module Worker)
 *   - lib/workspace-execution/pg-sandbox/node-runner.ts (Node, `lab validate` / CI replay)
 * A ticket that fails in the worker must fail identically via the Node path, and vice versa —
 * that guarantee only holds if the logic lives in exactly one file, so this module must never be
 * copied or hand-mirrored.
 *
 * WHY THIS FILE IS PLAIN ESM (.mjs), NOT TypeScript:
 * Every other worker asset in this repo (assert-shim.js, vitest-shim.js, sql-sandbox-worker.js) is
 * hand-authored plain JS served as-is from public/ — there is no build step that transpiles a
 * lib/**.ts file into a public/workers/*.js asset, and inventing one for just this module would be
 * a bigger, riskier change than this task's scope. A browser module Worker can only load real ESM
 * (`import`/`import()`); PGlite's browser build is itself ESM-only (`importScripts` cannot load
 * it — see pg-sandbox-worker.js's header), which is why pg-sandbox-worker.js is a MODULE worker.
 * That means this shared file must be something a module Worker can `import()` natively AND
 * something Node can `import()` natively. `.mjs` is the one extension both runtimes always treat
 * as ESM regardless of the nearest package.json's "type" field (this repo's package.json has no
 * "type": "module", so a plain `.js` sibling would be parsed as CommonJS by Node and rejected for
 * using `export`). A `.cjs` file (the OTHER unambiguous extension) is not an option in the other
 * direction: browsers have no `module`/`require` globals, so a CommonJS file cannot run in the
 * worker at all. `.mjs` is therefore the only extension both environments execute natively, with
 * no transpilation and no drift between the two call sites.
 *
 * SINGLE-CONNECTION POSTURE (documented once here; both drivers inherit it):
 * Every suite runs against exactly one live PGlite connection/instance. There is no connection
 * pool and no second session, so anything that depends on genuine multi-connection interleaving
 * (two backends racing for the same advisory lock or row lock, a second session observing another
 * session's uncommitted writes) cannot be demonstrated end-to-end here. What CAN be demonstrated
 * on one connection, and is exercised by this engine's tests: advisory lock acquire/release and
 * re-entrancy within a session, multi-statement explicit transactions (BEGIN/COMMIT/ROLLBACK),
 * and `set_config(key, value, true)` / `current_setting(key, true)` transaction-scoped GUCs. Real
 * cross-session contention is deferred to the future server-side sandbox (PLAN.md risk #3).
 *
 * NON-SUPERUSER EXECUTION POSTURE — read this before trusting a grading result:
 *
 * A freshly constructed PGlite connects as `postgres`, a superuser. Superusers ALWAYS bypass row
 * security, even on a table with FORCE ROW LEVEL SECURITY — that is a hard Postgres rule, not a
 * configuration bug — so grading RLS correctness through the default connection would find every
 * submission "correct" regardless of the policy's actual content.
 *
 * What this module DOES guarantee:
 *  - After migrations + seed run (as the default superuser connection — schema/fixture setup is
 *    intentionally privileged), `provisionAppRole()` creates a fixed role (`APP_ROLE_NAME`,
 *    `NOSUPERUSER NOBYPASSRLS NOLOGIN`) if it does not already exist, grants it `USAGE, CREATE` on
 *    schema `public`, transfers OWNERSHIP (not just a GRANT — table/view ownership, not a GRANT, is
 *    what lets a non-superuser run `CREATE POLICY` / `ALTER TABLE ... ENABLE|FORCE ROW LEVEL
 *    SECURITY`, since Postgres has no fine-grained GRANT for either statement) of every base table
 *    and plain view in schema `public` to it, and grants it sequence usage.
 *  - `verifyAppRoleIntegrity()` then queries `pg_roles` and FAILS THE SUITE LOUDLY (an `integrity`
 *    result row, no assertions run) if the role does not exist, or if `rolsuper`/`rolbypassrls` are
 *    anything but `false` — this specifically catches a migration that pre-creates or alters
 *    `APP_ROLE_NAME` with elevated attributes (this module's own `CREATE ROLE` always requests
 *    `NOSUPERUSER NOBYPASSRLS`; a role that has anything else was touched by something other than
 *    this module, most likely a migration authored — or compromised — to defeat grading). Checked
 *    twice: right after initial provisioning, and again after learner SQL runs (learner SQL cannot
 *    grant itself superuser directly — you cannot `ALTER ROLE ... SUPERUSER` unless you already are
 *    one — but if it escaped to the real superuser first, per the next point, it could).
 *  - Because the role is a non-superuser OWNER, FORCE ROW LEVEL SECURITY genuinely restricts its
 *    own queries too (ownership alone would normally exempt the owner from RLS; FORCE removes that
 *    exemption for anyone who is not a superuser and does not have BYPASSRLS — verified
 *    empirically, see task-5-report.md's fix-round addendum).
 *  - `learnerSql` (and the `doubleRunIdempotency` second run) executes as `APP_ROLE_NAME`, wrapped
 *    by `runAsAppRole`, which appends one more statement to the SAME `.exec()` batch —
 *    `select current_user` — and compares it against `APP_ROLE_NAME` after the batch completes. A
 *    mismatch fails the suite immediately (`learner-sql`, naming the escape) instead of silently
 *    continuing to grade a database whose role identity the learner's own SQL just changed.
 *
 * What this module DOES NOT guarantee (the residual, stated plainly rather than implied):
 *  - PGlite has no genuinely separate authenticated non-superuser session in this version. I tried
 *    the structurally cleaner alternative — `dumpDataDir()`, close, `PGlite.create({loadDataDir,
 *    username: APP_ROLE_NAME})` — expecting the new instance's SESSION USER (not just its starting
 *    CURRENT USER) to become the app role, so `RESET ROLE` would have nowhere to escape to. It does
 *    not: empirically, `session_user` on the reconnected instance was still `postgres`, so `RESET
 *    ROLE` (which reverts to `session_user`, never to whatever `username` was passed) landed right
 *    back on the real superuser, identically to a plain `SET ROLE`/`RESET ROLE` on the original
 *    connection. `SET ROLE` (and `RESET ROLE`, and `SET SESSION AUTHORIZATION`, and
 *    `set_config('role', ..., false)`) are therefore NOT a hard security boundary here the way a
 *    real separate least-privilege connection would be — they are, at bottom, still one superuser
 *    session that has merely narrowed its OWN acting identity, and a superuser session may always
 *    widen it back.
 *  - The `runAsAppRole` end-of-batch check (above) is consequently an INTERIM mitigation, not a
 *    closure of the vulnerability class: it inspects `current_user` only ONCE, after the entire
 *    batch finishes. Learner SQL shaped as `RESET ROLE; <do something as postgres>; SET ROLE
 *    <app role>;` — escaping, acting as superuser, then restoring the expected role before the
 *    batch ends — would pass this check, because by the time it runs, the role has been put back.
 *    Closing that residual needs either a genuine second authenticated connection (not available in
 *    this PGlite version, per the above) or per-statement role auditing (not implemented in v1).
 *    Sprint 1-4 content should not rely on learner SQL being adversarial in this specific way; a
 *    future server-side sandbox is the real closure (PLAN.md's own stated direction for anything
 *    requiring stronger isolation than a single in-process WASM connection can offer).
 *
 * Assertions run AS WHATEVER ROLE THEY ARE WRITTEN AGAINST: this module does not auto-wrap
 * assertion SQL in `SET ROLE` (unlike learnerSql), so an assertion that wants to observe the
 * RLS-restricted view must start its own `sql` with `SET ROLE <app role>;` (see `APP_ROLE_NAME`)
 * followed by whatever `set_config` it needs; an assertion that wants a superuser vantage point
 * (e.g. sanity-checking raw seed data before any policy applies) just queries directly. A
 * best-effort `RESET ROLE` runs after every assertion so one assertion's role choice never leaks
 * into the next — assertions are author-written content, not the untrusted-input threat model
 * `runAsAppRole`'s stronger check exists for, so they do not get that same end-of-batch audit.
 */

/** Fixed, non-superuser, NOBYPASSRLS role every suite provisions. Exported so assertion/learner
 *  SQL authors can reference it (`SET ROLE ${APP_ROLE_NAME}`) without hard-coding the literal. */
export const APP_ROLE_NAME = "sprintlab_app"

/** Column alias `runAsAppRole` appends its role-escape check under; kept internal (never referenced
 *  by content authors, unlike APP_ROLE_NAME). */
const ROLE_CHECK_COLUMN = "pg_suite_active_role"

/** A visible assertion's error text is capped for READABILITY only (see MAX_ERROR_CHARS/ROWS). A
 *  hidden assertion's error text is fully replaced, never capped -- see formatAssertionError. */
const MAX_ERROR_CHARS = 500
const MAX_ERROR_ROWS = 5

function errorMessage(error) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message)
  }
  return String(error)
}

function capRows(rows) {
  if (!Array.isArray(rows) || rows.length <= MAX_ERROR_ROWS) return rows
  return [...rows.slice(0, MAX_ERROR_ROWS), `... (${rows.length - MAX_ERROR_ROWS} more row(s), omitted)`]
}

function capText(text) {
  if (text.length <= MAX_ERROR_CHARS) return text
  return `${text.slice(0, MAX_ERROR_CHARS)}... (truncated)`
}

/**
 * A HIDDEN assertion's error can never mention actual/expected values: those values ARE the secret
 * being graded, and this codebase's sealing convention (lib/scenarios/sealed/**, the
 * `typeof window` throw + sealing-test pattern) is that secret-classified content never reaches the
 * client. An error string like "Expected rows [[42]], got [[13]]" on a hidden check would hand the
 * learner the hidden expected answer outright, so a hidden failure gets a single fixed, generic
 * message instead — never capped-but-partial, always fully replaced. A visible assertion's error is
 * only length/row-capped, for console readability, never redacted.
 */
function formatAssertionError(message, hidden) {
  if (hidden) return "This hidden check did not pass."
  return capText(message)
}

/** Runs one (possibly multi-statement) SQL string, turning a thrown error into a result instead
 *  of propagating it — every top-level step in the pipeline needs this so one failing step can
 *  report cleanly instead of crashing the whole suite run. */
async function safeExec(pg, sql) {
  try {
    const resultSets = await pg.exec(sql)
    return { ok: true, resultSets }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

/** Best-effort role reset. If the connection is mid-aborted-transaction (the batch that failed
 *  already rolled back any `SET ROLE` it made — Postgres treats a multi-statement `.exec()` call
 *  as one implicit transaction, so a failure inside it auto-reverts role/GUC changes from that
 *  same call), this is a harmless no-op; if it somehow still fails, the NEXT statement will
 *  surface that as its own failure rather than this cleanup step throwing. */
async function resetRole(pg) {
  try {
    await pg.exec("RESET ROLE")
  } catch {
    // best-effort, see doc comment above
  }
}

/**
 * Idempotent-to-call, NOT idempotent-to-trust blindly: creates APP_ROLE_NAME if missing (does NOT
 * correct an already-existing role's attributes — see the module header's Critical-4 discussion;
 * detecting a pre-existing role with the wrong attributes and failing loudly is the point, not
 * silently repairing it), grants it USAGE + CREATE on schema "public", transfers OWNERSHIP of
 * every base table AND plain view in "public" to it (see module header for why ownership, not a
 * GRANT), and grants sequence usage.
 *
 * The ownership-transfer loop runs SERVER-SIDE inside a `do $$ ... $$` block using
 * `format('%I', ...)` + `EXECUTE`, not client-side JS string interpolation of table/view names —
 * a table whose name itself contains SQL metacharacters (a double-quote, a semicolon) used to let a
 * crafted migration break out of the quoted identifier and run arbitrary SQL as the superuser
 * connection mid-loop (reproduced against the pre-fix version: a table literally named
 * `docs" owner to sprintlab_app; create table pwned(x int); --` got a `pwned` table created out of
 * band). `format('%I', ...)` is Postgres's own canonical identifier-quoting primitive and is not
 * vulnerable to this class of injection regardless of what characters the identifier contains.
 *
 * v1 scope limit, stated rather than silently assumed: only base tables (`pg_tables`) and plain
 * views (`relkind = 'v'`) in schema "public" are covered. Materialized views, foreign tables, and
 * any object outside schema "public" are NOT re-owned and will not be reachable by learner SQL or
 * assertions running as APP_ROLE_NAME.
 */
async function provisionAppRole(pg) {
  await pg.exec(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = '${APP_ROLE_NAME}') then
        create role ${APP_ROLE_NAME} nosuperuser nobypassrls nologin;
      end if;
    end
    $$;

    grant usage, create on schema public to ${APP_ROLE_NAME};

    do $$
    declare
      r record;
    begin
      for r in select tablename as name from pg_tables where schemaname = 'public' loop
        execute format('alter table %I owner to %I', r.name, '${APP_ROLE_NAME}');
      end loop;

      for r in
        select c.relname as name
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'v'
      loop
        execute format('alter view %I owner to %I', r.name, '${APP_ROLE_NAME}');
      end loop;
    end
    $$;

    grant usage, select on all sequences in schema public to ${APP_ROLE_NAME};
  `)
}

/**
 * Read-only check: queries `pg_roles` for APP_ROLE_NAME and throws (never auto-corrects) if it is
 * missing, or if `rolsuper`/`rolbypassrls` are anything but `false`. Deliberately does NOT repair a
 * bad role itself — a migration that pre-creates `sprintlab_app` as `SUPERUSER` must fail the
 * suite loudly, not be silently papered over into a passing grade (see module header).
 */
async function verifyAppRoleIntegrity(pg) {
  const roleSets = await pg.exec(
    `select rolsuper, rolbypassrls from pg_roles where rolname = '${APP_ROLE_NAME}'`
  )
  const last = roleSets[roleSets.length - 1]
  const row = last && last.rows[0]
  if (!row) {
    throw new Error(`Grading role "${APP_ROLE_NAME}" does not exist after provisioning.`)
  }
  if (row.rolsuper === true || row.rolbypassrls === true) {
    throw new Error(
      `Grading role "${APP_ROLE_NAME}" has rolsuper=${row.rolsuper} rolbypassrls=${row.rolbypassrls} ` +
        `(this module's own provisioning always creates it NOSUPERUSER NOBYPASSRLS — both must be ` +
        `false). Something other than this module's provisioning — most likely a migration that ` +
        `pre-created or altered this exact role name — changed it, which would otherwise silently ` +
        `defeat the entire non-superuser grading posture (every RLS/FORCE check would trivially ` +
        `pass regardless of the learner's policy).`
    )
  }
}

/** Provisions AND verifies in one step — the two calls this module always makes together (see
 *  runPgSuiteCore's three call sites: initial setup, post-learner-SQL, and post-second-run under
 *  doubleRunIdempotency). Kept as a named pair rather than inlined so all three call sites can
 *  never accidentally provision without also verifying. */
async function provisionAndVerifyAppRole(pg) {
  await provisionAppRole(pg)
  await verifyAppRoleIntegrity(pg)
}

/**
 * `SET ROLE` around the given SQL, with a role-escape check appended to the SAME batch (see module
 * header's "What this module DOES NOT guarantee" for the exact, honest scope of this check) and a
 * best-effort `RESET ROLE` afterward regardless of outcome.
 */
async function runAsAppRole(pg, sql) {
  const outcome = await safeExec(
    pg,
    `set role ${APP_ROLE_NAME};\n${sql}\nselect current_user as ${ROLE_CHECK_COLUMN};`
  )
  await resetRole(pg)

  if (!outcome.ok) return outcome

  const last = outcome.resultSets[outcome.resultSets.length - 1]
  const activeRole = last && last.rows[0] ? last.rows[0][ROLE_CHECK_COLUMN] : undefined
  if (activeRole !== APP_ROLE_NAME) {
    return {
      ok: false,
      error:
        `Your SQL left the active database role as "${activeRole}" — it must stay "${APP_ROLE_NAME}" ` +
        `for the entire script. Statements that change the session's role (RESET ROLE, SET ROLE, ` +
        `SET SESSION AUTHORIZATION, set_config('role', ...)) are not allowed here.`,
    }
  }
  return outcome
}

/** `${id} ${humanName}` contains "hidden" (case-insensitive) -> isHidden. Mirrors the exact
 *  convention public/workers/vitest-shim.js documents and uses for the TS workspace runner, so a
 *  content author's mental model ("name it with 'hidden' to hide it") is the same across engines. */
function isHiddenAssertion(assertion) {
  const label = `${assertion.id || ""} ${assertion.humanName || ""}`.toLowerCase()
  return label.includes("hidden")
}

/** The last statement's result set in a (possibly multi-statement) `.exec()` call is the one that
 *  matters for grading: earlier statements in an assertion's own SQL are setup (`SET ROLE`,
 *  `set_config`), and PGlite's `exec()` returns one Results per statement, in order. */
function lastResultSet(resultSets) {
  return resultSets.length > 0 ? resultSets[resultSets.length - 1] : { rows: [], fields: [] }
}

/** A `Results` row is an object keyed by column name; `expect: { rows: unknown[][] }` compares
 *  against POSITIONAL arrays (mirroring how sql.js's prepared-statement rows work), so this
 *  projects each row through the query's own field order. Row ORDER is significant: this compares
 *  `actual` positionally against `expected`, so an assertion whose SQL has no `ORDER BY` is
 *  comparing against whatever physical order Postgres happens to return (unspecified, and not
 *  guaranteed stable) — content authors must add `ORDER BY` whenever row order matters, which for
 *  a `{rows: [...]}` expectation is effectively always. */
function toRowArrays(resultSet) {
  const columns = resultSet.fields.map((field) => field.name)
  return resultSet.rows.map((row) => columns.map((column) => row[column]))
}

/**
 * Normalizes ONE actual cell toward its expected counterpart's type before comparison. Only
 * `actual` is coerced; `expected` (author-written, always JSON-safe: string/number/boolean/null)
 * never needs it. Three PGlite wire-format quirks this closes:
 *  - BigInt (an INT8/bigint column outside Number.MAX_SAFE_INTEGER) -> String(...), so it can be
 *    compared/serialized at all (`JSON.stringify` throws on a raw BigInt). Author expectations for
 *    such a column must be written as a STRING, e.g. `"9007199254740993"`.
 *  - A NUMERIC/DECIMAL column round-trips as a STRING by default (avoiding float precision loss).
 *    Coerced to a Number only when the author's own expectation at that position is a number, so
 *    `expect: { rows: [[19.99]] }` against a `money`/`numeric` column works without the author
 *    needing to know this wire-format detail. (If the author instead writes a string expectation,
 *    no coercion happens — the raw string compares as-is.)
 *  - A DATE/TIMESTAMP column becomes a JS `Date` -> `.toISOString()`, always the FULL timestamp
 *    representation (`YYYY-MM-DDTHH:mm:ss.sssZ`) — a `DATE` column has no time component in
 *    Postgres, but this module does not special-case that; a bare `"2024-01-01"` expectation
 *    against a DATE column will NOT match. Author expectations for DATE/TIMESTAMP columns must be
 *    written as the full ISO-8601 string.
 */
function normalizeCell(actualCell, expectedCell) {
  if (typeof actualCell === "bigint") {
    return String(actualCell)
  }
  if (
    typeof actualCell === "string" &&
    typeof expectedCell === "number" &&
    actualCell.trim() !== "" &&
    Number.isFinite(Number(actualCell))
  ) {
    return Number(actualCell)
  }
  if (actualCell instanceof Date) {
    return actualCell.toISOString()
  }
  return actualCell
}

function normalizeRowsForComparison(actualRows, expectedRows) {
  return actualRows.map((row, rowIndex) => {
    const expectedRow = Array.isArray(expectedRows) ? expectedRows[rowIndex] : undefined
    return row.map((cell, colIndex) =>
      normalizeCell(cell, Array.isArray(expectedRow) ? expectedRow[colIndex] : undefined)
    )
  })
}

/**
 * Classifies `assertion.expect` into one of four graded shapes. Throws on an unrecognized shape —
 * a malformed `expect` is an authoring bug, not a learner outcome, so it must surface loudly
 * rather than be silently treated as some default.
 */
function classifyExpectation(expect) {
  if (expect === "zero-rows") return { kind: "zero-rows" }
  if (expect === "raises") return { kind: "raises", substring: null }
  if (expect && typeof expect === "object") {
    if ("raises" in expect) return { kind: "raises", substring: expect.raises }
    if ("rows" in expect) return { kind: "rows", expectedRows: expect.rows }
  }
  throw new Error(`Assertion has an unrecognized "expect" shape: ${JSON.stringify(expect)}`)
}

async function runAssertion(assertion, pg) {
  const suiteTag = "assertion"
  const name = assertion.humanName || assertion.id
  const hidden = isHiddenAssertion(assertion)
  const expectation = classifyExpectation(assertion.expect)

  const pass = () => ({ suite: suiteTag, name, passed: true, error: null, isHidden: hidden })
  const fail = (message) => ({
    suite: suiteTag,
    name,
    passed: false,
    error: formatAssertionError(message, hidden),
    isHidden: hidden,
  })

  try {
    const resultSets = await pg.exec(assertion.sql)

    if (expectation.kind === "raises") {
      return fail("Expected this check's SQL to raise an error, but it completed without one.")
    }

    const last = lastResultSet(resultSets)

    if (last.fields.length === 0) {
      // The last statement was not a row-returning query (e.g. a bare INSERT/UPDATE/DELETE with no
      // RETURNING has zero result columns). Both "zero-rows" and "{rows: ...}" grade the result
      // set a SELECT would produce; silently treating "no result set at all" as "zero rows,
      // therefore passed" is exactly the vacuous-pass bug this check exists to prevent (an
      // assertion whose SQL is a plain INSERT would pass "zero-rows" unconditionally, regardless
      // of whether the insert itself did anything correct or harmful).
      return fail(
        "This check's SQL did not end in a query that returns rows (its last statement produced no " +
          'result columns). "zero-rows" and row-comparison checks require a SELECT as the final ' +
          "statement — use expect: \"raises\" / { raises: \"...\" } to grade a statement that should " +
          "fail instead."
      )
    }

    if (expectation.kind === "zero-rows") {
      if (last.rows.length === 0) return pass()
      return fail(`${last.rows.length} row(s) violated this check`)
    }

    const actual = normalizeRowsForComparison(toRowArrays(last), expectation.expectedRows)
    const passed = JSON.stringify(actual) === JSON.stringify(expectation.expectedRows)
    if (passed) return pass()
    return fail(
      `Expected rows ${JSON.stringify(capRows(expectation.expectedRows))}, got ${JSON.stringify(capRows(actual))}`
    )
  } catch (error) {
    const message = errorMessage(error)
    if (expectation.kind === "raises") {
      if (expectation.substring === null) return pass()
      const matched = message.toLowerCase().includes(String(expectation.substring).toLowerCase())
      return matched
        ? pass()
        : fail(`Expected the error to mention "${expectation.substring}", but got: ${message}`)
    }
    return fail(message)
  } finally {
    await resetRole(pg)
  }
}

/** Runs every assertion in order, WITHOUT short-circuiting on a failure (a learner should see all
 *  gate results, not just the first miss) — mirrors sql-sandbox's gradeWorkspace assertion loop. */
async function runAssertions(assertions, pg) {
  const results = []
  for (const assertion of assertions) {
    results.push(await runAssertion(assertion, pg))
  }
  return results
}

/** Shared pass/total/summary computation, hoisted here so the Node driver (node-runner.ts) and the
 *  browser driver (runner.ts, which reads this same file — it has no Node-specific import of its
 *  own, so it is browser-bundle-safe) compute it identically instead of each re-deriving it. */
export function summarizeResults(results) {
  const passed = results.filter((result) => result.passed).length
  const total = results.length
  return {
    success: total > 0 && passed === total,
    results,
    consoleLogs: [],
    summary: {
      total,
      passed,
      failed: total - passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      serviceErrors: 0,
      effectiveTotal: total,
    },
    error: null,
  }
}

/**
 * Runs a `PgSuite` (see lib/workspace-execution/pg-sandbox/types.ts for the exported shape) to
 * completion against an already-constructed, already-ready connection, returning
 * WorkspaceTestResult-compatible rows ({ suite, name, passed, error, isHidden? }).
 *
 * `pg` needs exactly one method: `exec(sql: string) => Promise<Array<{ rows: object[], fields:
 * {name: string}[] }>>` (PGlite's own `.exec()` signature) — both drivers just pass their real
 * PGlite instance straight through, so this stays a pure function of (connection, suite) with no
 * PGlite import of its own.
 *
 * Short-circuits (returns immediately with one failing result and runs no assertions) on a
 * migration failure, a seed failure, an app-role provisioning/integrity failure (checked twice:
 * right after initial provisioning, and again after learner SQL runs), or a learner-SQL failure
 * (including a detected role escape): none of those states leave a database an assertion could
 * meaningfully grade.
 */
export async function runPgSuiteCore(pg, suite) {
  const results = []

  for (let index = 0; index < suite.migrations.length; index++) {
    const outcome = await safeExec(pg, suite.migrations[index])
    if (!outcome.ok) {
      results.push({
        suite: "migration",
        name: `Migration ${index + 1} of ${suite.migrations.length} applies cleanly`,
        passed: false,
        error: outcome.error,
      })
      return results
    }
  }

  if (suite.seedSql) {
    const outcome = await safeExec(pg, suite.seedSql)
    if (!outcome.ok) {
      results.push({
        suite: "seed",
        name: "Seed data loads cleanly",
        passed: false,
        error: outcome.error,
      })
      return results
    }
  }

  try {
    await provisionAndVerifyAppRole(pg)
  } catch (error) {
    results.push({
      suite: "integrity",
      name: "Grading role has the correct non-superuser posture",
      passed: false,
      error: errorMessage(error),
    })
    return results
  }

  const learnerOutcome = await runAsAppRole(pg, suite.learnerSql)
  if (!learnerOutcome.ok) {
    results.push({
      suite: "learner-sql",
      name: "Your SQL runs without an error",
      passed: false,
      error: learnerOutcome.error,
    })
    return results
  }

  // Learner SQL may have created new tables/views (e.g. a migration-shaped ticket) — re-provision
  // so assertions (and a doubleRunIdempotency second pass) can reach them too. Unlike the pre-fix
  // version, a failure here is NOT swallowed: an app role that cannot reach what the learner just
  // created (or whose posture the learner's SQL somehow left compromised) cannot be trusted to
  // grade correctly, so this is a hard gate, identical in kind to the first one above.
  try {
    await provisionAndVerifyAppRole(pg)
  } catch (error) {
    results.push({
      suite: "integrity",
      name: "Grading role still has the correct non-superuser posture after your SQL ran",
      passed: false,
      error: errorMessage(error),
    })
    return results
  }

  results.push(...(await runAssertions(suite.assertions, pg)))

  if (suite.options && suite.options.doubleRunIdempotency) {
    const second = await runAsAppRole(pg, suite.learnerSql)
    if (!second.ok) {
      results.push({
        suite: "idempotency",
        name: "Running your SQL a second time still succeeds",
        passed: false,
        error: second.error,
      })
    } else {
      try {
        await provisionAndVerifyAppRole(pg)
      } catch (error) {
        results.push({
          suite: "integrity",
          name: "Grading role integrity check failed after the second run",
          passed: false,
          error: errorMessage(error),
        })
        return results
      }
      const secondPass = await runAssertions(suite.assertions, pg)
      const firstFailure = secondPass.find((result) => !result.passed)
      results.push({
        suite: "idempotency",
        name: "Assertions still pass after running your SQL a second time",
        passed: !firstFailure,
        error: firstFailure ? firstFailure.error : null,
      })
    }
  }

  return results
}

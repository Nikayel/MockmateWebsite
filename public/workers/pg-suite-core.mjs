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
 * NON-SUPERUSER EXECUTION POSTURE (why `SET ROLE` wraps learner SQL):
 * A freshly constructed PGlite connects as `postgres`, a superuser. Superusers ALWAYS bypass row
 * security, even on a table with FORCE ROW LEVEL SECURITY — that is a hard Postgres rule, not a
 * configuration bug, and it means a ticket that grades RLS correctness by running the learner's
 * SQL (and the proof assertions) as the default connection would find every submission "correct"
 * regardless of the policy's actual content. So this module provisions a fixed, non-superuser,
 * NOBYPASSRLS role (`APP_ROLE_NAME`) after migrations+seed run, makes it the OWNER of every table
 * in schema "public" (table ownership, not a GRANT, is what lets a non-superuser run CREATE POLICY
 * / ALTER TABLE ... ENABLE|FORCE ROW LEVEL SECURITY — Postgres has no fine-grained GRANT for those
 * DDL statements), and wraps `learnerSql` in `SET ROLE <app role>` before running it. Because the
 * role is a non-superuser owner, FORCE ROW LEVEL SECURITY genuinely restricts its own queries too
 * (ownership alone would normally exempt it from RLS; FORCE is what removes that exemption for a
 * non-superuser, non-BYPASSRLS owner — verified empirically, see task-5-report.md). Assertions run
 * AS WHATEVER ROLE THEY ARE WRITTEN AGAINST: this module does not auto-wrap assertion SQL in `SET
 * ROLE`, so an assertion that wants to observe the RLS-restricted view must start its own `sql`
 * with `SET ROLE <app role>;` (see APP_ROLE_NAME) followed by whatever `set_config` it needs; an
 * assertion that wants a superuser vantage point (e.g. sanity-checking raw seed data before any
 * policy applies) just queries directly. This keeps the suite's only fixed, load-bearing SQL
 * convention discoverable from one exported constant, not a hidden implicit rule.
 * After EVERY assertion, and after learner SQL runs (success or failure), this module issues a
 * best-effort `RESET ROLE` so one assertion's role choice never leaks into the next.
 */

/** Fixed, non-superuser, NOBYPASSRLS role every suite provisions. Exported so assertion/learner
 *  SQL authors can reference it (`SET ROLE ${APP_ROLE_NAME}`) without hard-coding the literal. */
export const APP_ROLE_NAME = "sprintlab_app"

function errorMessage(error) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message)
  }
  return String(error)
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
 * Idempotent: safe to call again after learner SQL runs (in case it created new tables) or
 * between a suite's two runs (doubleRunIdempotency). Creates APP_ROLE_NAME if missing, transfers
 * ownership of every base table in schema "public" to it (see module header for why ownership,
 * not GRANT), and grants sequence usage (table ownership does not imply privilege on a separate
 * sequence object, e.g. a `serial` column's backing sequence).
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
  `)

  // Explicit rather than relying on a freshly initialized cluster's default ACL for the "public"
  // schema (belt-and-suspenders: correct either way, but doesn't assume any particular Postgres
  // default-privilege behavior for schema access).
  await pg.exec(`grant usage on schema public to ${APP_ROLE_NAME}`)

  const tableSets = await pg.exec("select tablename from pg_tables where schemaname = 'public'")
  const lastTableSet = tableSets[tableSets.length - 1]
  const tableNames = lastTableSet ? lastTableSet.rows.map((row) => row.tablename) : []
  for (const name of tableNames) {
    await pg.exec(`alter table "${name}" owner to ${APP_ROLE_NAME}`)
  }

  await pg.exec(`grant usage, select on all sequences in schema public to ${APP_ROLE_NAME}`)
}

/** `SET ROLE` around the given SQL, with a best-effort `RESET ROLE` afterward regardless of
 *  outcome (see module header's non-superuser posture section). */
async function runAsAppRole(pg, sql) {
  const outcome = await safeExec(pg, `set role ${APP_ROLE_NAME};\n${sql}`)
  await resetRole(pg)
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
 *  projects each row through the query's own field order. */
function toRowArrays(resultSet) {
  const columns = resultSet.fields.map((field) => field.name)
  return resultSet.rows.map((row) => columns.map((column) => row[column]))
}

async function runAssertion(assertion, pg) {
  const suite = "assertion"
  const name = assertion.humanName || assertion.id
  const hidden = isHiddenAssertion(assertion)

  try {
    const resultSets = await pg.exec(assertion.sql)
    const last = lastResultSet(resultSets)

    if (assertion.expect === "zero-rows") {
      const passed = last.rows.length === 0
      return {
        suite,
        name,
        passed,
        error: passed ? null : `${last.rows.length} row(s) violated this check`,
        isHidden: hidden,
      }
    }

    const actual = toRowArrays(last)
    const passed = JSON.stringify(actual) === JSON.stringify(assertion.expect.rows)
    return {
      suite,
      name,
      passed,
      error: passed
        ? null
        : `Expected rows ${JSON.stringify(assertion.expect.rows)}, got ${JSON.stringify(actual)}`,
      isHidden: hidden,
    }
  } catch (error) {
    return { suite, name, passed: false, error: errorMessage(error), isHidden: hidden }
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
 * migration failure, a seed failure, a role-provisioning failure, or a learner-SQL failure: none
 * of those states leave a database an assertion could meaningfully grade.
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
    await provisionAppRole(pg)
  } catch (error) {
    results.push({
      suite: "setup",
      name: "Grading role provisions cleanly",
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

  // Learner SQL may have created new tables (e.g. a migration-shaped ticket) — re-provision so
  // assertions (and a doubleRunIdempotency second pass) can reach them too. Best-effort: this is
  // a convenience re-grant, not a step whose failure should hide the learner's own result.
  await provisionAppRole(pg).catch(() => {})

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
      await provisionAppRole(pg).catch(() => {})
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

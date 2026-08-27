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
 * WHO GRADES WHAT WITH THIS ENGINE (read this before treating any boolean here as a scored
 * verdict): this engine's own assertion pass/fail booleans grade two things ONLY — (1) `lab
 * validate`'s replay of TRUSTED, author-written reference solutions (no adversary at all: the SQL
 * under test is content, not a learner submission), and (2) the visible/formative tier, which is
 * client-run and display-only by this codebase's standing convention (any client-run result is
 * spoofable and never the scored verdict — see PLAN.md/INTEGRATION.md). Scored learner SQL is
 * graded through Task 8's server-side io-case comparison instead: the server holds the sealed
 * expected rows and compares them itself, a path none of the attacks documented below (temp-table
 * shadowing, role escape, a planted SECURITY DEFINER function) can fake, because the learner's
 * client-side PGlite session never produces the value the server trusts. That is why this module
 * closes CHEAP, structural holes (a migration-created role, an unqualified identifier a search_path
 * change can misdirect, a temp table shadowing a real one) but does not chase a full close of the
 * harder, adversarial-connection-level residual — see "What this module DOES NOT guarantee" below.
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
 *    `NOSUPERUSER NOBYPASSRLS NOLOGIN`) IF IT DOES NOT ALREADY EXIST, grants it `USAGE, CREATE` on
 *    schema `public`, revokes the database's `TEMP` privilege from PUBLIC (see "temp-table
 *    shadowing" below), transfers OWNERSHIP (not just a GRANT — table/view ownership, not a GRANT,
 *    is what lets a non-superuser run `CREATE POLICY` / `ALTER TABLE ... ENABLE|FORCE ROW LEVEL
 *    SECURITY`, since Postgres has no fine-grained GRANT for either statement) of every base table
 *    and plain view in schema `public` to it, and grants it sequence usage. The ownership-transfer
 *    loop schema-qualifies every reference (`public.%I`, not bare `%I`) so it resolves correctly
 *    regardless of what `search_path` the learner's SQL may have changed (see "New Breakage 2"
 *    below — an unqualified name in this loop used to be misresolved, and misreported as an
 *    integrity failure, whenever learner SQL changed search_path first).
 *  - `verifyAppRoleIntegrity()` then FAILS THE SUITE LOUDLY (an `integrity` result row, no
 *    assertions run) if: the role ALREADY EXISTED before this module's own provisioning ran the
 *    very first time (checked only on that first call — a migration, or seed, must never define
 *    this exact role name at all, regardless of what attributes it happens to have; this module is
 *    the sole intended owner of that identity, and cannot vouch for anything else a migration may
 *    also have done to it, e.g. a group membership the flag check below would not catch); or the
 *    role does not exist after provisioning; or `rolsuper`/`rolbypassrls` are anything but `false`
 *    (this module's own `CREATE ROLE` always requests `NOSUPERUSER NOBYPASSRLS`, so anything else
 *    means something altered it after the fact). Checked three times: right after initial
 *    provisioning (with the pre-existence check), again after learner SQL runs, and again after a
 *    `doubleRunIdempotency` second run — none of those three re-provisioning calls silently swallow
 *    a failure (a prior version of this module did, for the second and third checks; fixed).
 *  - Because the role is a non-superuser OWNER, FORCE ROW LEVEL SECURITY genuinely restricts its
 *    own queries too (ownership alone would normally exempt the owner from RLS; FORCE removes that
 *    exemption for anyone who is not a superuser and does not have BYPASSRLS — verified
 *    empirically, see task-5-report.md's fix-round addenda).
 *  - `learnerSql` (and the `doubleRunIdempotency` second run) executes as `APP_ROLE_NAME`, wrapped
 *    by `runAsAppRole`: `SET ROLE` runs in its own `exec()` call, the learner's SQL runs UNMODIFIED
 *    in its own SEPARATE `exec()` call (never string-concatenated with anything this module adds —
 *    a prior version appended `\nselect current_user;` to the same string, which broke any learner
 *    script whose final statement lacked a trailing semicolon: `SELECT 1` with no `;` plus an
 *    appended `SELECT ...` parses as one malformed `SELECT 1 SELECT ...` statement; reproduced,
 *    fixed by never concatenating), and a THIRD, separate `exec()` call — `select current_user` —
 *    checks the role afterward. A mismatch fails the suite immediately (`learner-sql`, naming the
 *    escape) instead of silently continuing to grade a database whose role identity the learner's
 *    own SQL just changed.
 *  - Every assertion's SQL runs with `search_path` explicitly reset to `pg_catalog, public` first
 *    (prepended to that assertion's own `exec()` call), so an author's unqualified table/view
 *    reference (`FROM docs`, not `FROM public.docs` — the normal, expected way to write an
 *    assertion) resolves to the real object regardless of what search_path prior learner SQL or a
 *    prior assertion left behind — EXCEPT for `pg_temp`, which this does NOT close; see the
 *    temp-table paragraph below for why, and for the mechanism that actually does close it (REVOKE
 *    TEMP, not search_path).
 *
 * TEMP-TABLE SHADOWING (a distinct bypass from the role-escape residual below, and closed
 * differently): Postgres always resolves an unqualified relation name against the CURRENT
 * SESSION's temporary schema FIRST, before anything in `search_path` — this is unconditional and
 * cannot be turned off by omitting `pg_temp` from `search_path` (verified empirically: even with
 * `search_path` explicitly set to `pg_catalog, public`, `SELECT count(*) FROM docs` still resolved
 * to an empty `pg_temp` table shadowing a real, populated `public.docs`, while the schema-qualified
 * `SELECT count(*) FROM public.docs` correctly saw the real rows). That means learner SQL creating
 * `CREATE TEMP TABLE docs (...)` (empty, or shaped however the learner likes) would make every
 * UNQUALIFIED assertion referencing `docs` resolve to the empty temp table instead — a hidden
 * RLS/zero-rows check would fake-pass regardless of whether the real table's policy is correct.
 * The actual fix is `REVOKE TEMP ON DATABASE <this database> FROM PUBLIC` (run once, idempotently,
 * inside `provisionAppRole`): this removes the non-superuser role's ability to create ANY temporary
 * object at all, closing the bypass at its root rather than trying to out-maneuver Postgres's
 * hardcoded temp-schema-first resolution (verified: after the revoke, `sprintlab_app` gets
 * "permission denied to create temporary tables"; the superuser connection is unaffected, since
 * superusers bypass privilege checks generally).
 *
 * What this module DOES NOT guarantee (the residual, stated plainly rather than implied — expanded
 * this round to match the real attack surface, not just its first-found shape):
 *  - PGlite has no genuinely separate authenticated non-superuser session in this version. Tried
 *    two structural alternatives to `SET ROLE`, both confirmed NOT to close the escape:
 *      (a) `dumpDataDir()`, close, `PGlite.create({loadDataDir, username: APP_ROLE_NAME})` —
 *          expecting the new instance's SESSION USER (not just its starting CURRENT USER) to
 *          become the app role, so `RESET ROLE` would have nowhere to escape to. Empirically,
 *          `session_user` on the reconnected instance was still `postgres`.
 *      (b) `SET SESSION AUTHORIZATION <app role>` in place of `SET ROLE` for the app-role switch —
 *          this DOES genuinely change `session_user` (unlike (a): confirmed `session_user` became
 *          `sprintlab_app`, and a subsequent bare `RESET ROLE` correctly stayed on `sprintlab_app`
 *          rather than reverting to `postgres`). But it does not close the escape either: a
 *          non-superuser session was still able to run `SET SESSION AUTHORIZATION postgres`
 *          directly (this should require being a superuser per Postgres's documented rule, and
 *          did not in this PGlite version), and a plain `SET ROLE postgres` ALSO still succeeded
 *          regardless of which mechanism established the app-role identity. Switching would trade
 *          one specific phrasing of the escape (`RESET ROLE`) for the vector remaining trivially
 *          reachable via two others (`SET ROLE postgres`, `SET SESSION AUTHORIZATION postgres`) —
 *          not a real reduction in attack surface, so `SET ROLE` was kept; this finding is recorded
 *          here so the same experiment is not silently re-tried later.
 *    `SET ROLE`, `RESET ROLE`, `SET SESSION AUTHORIZATION`, and `set_config('role', ..., false)`
 *    are therefore NOT a hard security boundary here the way a real separate least-privilege
 *    connection would be — at bottom this is still one superuser session that has merely narrowed
 *    its own acting identity, and that same session may always widen it back.
 *  - The `runAsAppRole` end-of-script check is consequently an INTERIM mitigation, not a closure of
 *    the vulnerability class: it inspects `current_user` only ONCE, in its own `exec()` call after
 *    the learner's script's `exec()` call finishes. Two shapes of learner SQL defeat it, not just
 *    one:
 *      - Plain escape-then-restore: `RESET ROLE; <act as postgres>; SET ROLE <app role>;` — by the
 *        time the check runs, the role has been put back, so the check sees nothing wrong.
 *      - `SET LOCAL ROLE postgres` inside an explicit `BEGIN ... COMMIT` — this is EASIER to trigger
 *        than the plain form above, because the learner does not even have to remember to restore
 *        anything: `SET LOCAL` auto-reverts to whatever the role was at the start of the
 *        transaction as soon as it COMMITs (or ROLLBACKs), by design, with no explicit `SET ROLE
 *        <app role>` needed afterward. Verified empirically: `current_user` was already back to
 *        `sprintlab_app` the instant a `BEGIN; SET LOCAL ROLE postgres; ...; COMMIT;` block
 *        finished, no restore statement present anywhere in the script.
 *    Either shape leaves a STANDING artifact behind that outlives the escape window entirely — not
 *    just "whatever damage happened during it". Concretely verified: a `SECURITY DEFINER` SQL
 *    function created while impersonating postgres (inside either escape shape above) is owned by
 *    postgres, but remains CALLABLE by `sprintlab_app` afterward under Postgres's default `PUBLIC`
 *    `EXECUTE` grant on functions, and still runs with postgres's privileges every time it is
 *    called (that is the entire point of `SECURITY DEFINER`) — a standing backdoor a learner could
 *    plant once and re-invoke from any LATER statement, even one that looks completely ordinary,
 *    with no further escape needed. A plain table planted the same way is less immediately useful
 *    (verified: `sprintlab_app` gets "permission denied" reading it back without an explicit grant
 *    also planted alongside it), but still exists in the database going forward.
 *    Closing any of this needs either a genuinely separate authenticated connection (not available
 *    in this PGlite version, per above) or per-statement role/DDL auditing (not implemented in
 *    v1). Per this round's ruling (R22): this residual is INTENTIONALLY NOT chased to full closure
 *    here, because it does not matter for how this engine is actually used for SCORED SQL — see
 *    "WHO GRADES WHAT" at the top of this header. A future server-side sandbox is the real closure
 *    (PLAN.md's own stated direction for anything requiring stronger isolation than a single
 *    in-process WASM connection can offer).
 *
 * Assertions run AS WHATEVER ROLE THEY ARE WRITTEN AGAINST: this module does not auto-wrap
 * assertion SQL in `SET ROLE` (unlike learnerSql), so an assertion that wants to observe the
 * RLS-restricted view must start its own `sql` with `SET ROLE <app role>;` (see `APP_ROLE_NAME`)
 * followed by whatever `set_config` it needs; an assertion that wants a superuser vantage point
 * (e.g. sanity-checking raw seed data before any policy applies) just queries directly. A
 * best-effort `RESET ROLE` runs after every assertion so one assertion's role choice never leaks
 * into the next — assertions are author-written content, not the untrusted-input threat model
 * `runAsAppRole`'s stronger check exists for, so they do not get that same end-of-script audit.
 *
 * HIDDEN ASSERTIONS ARE DISPLAY-ONLY IN THE BROWSER PATH, NOT SEALED: the browser worker receives
 * and runs the ENTIRE `PgSuite` client-side, including hidden assertions' SQL and expected
 * values — there is no server-side secret-holding step in this engine at all, unlike the
 * sealed-registry pattern used elsewhere in this codebase (lib/scenarios/sealed/**). `isHidden` on
 * a result row means "hide this from the learner's own rendered UI by convention", not "this value
 * was never shipped to the client" — a learner who inspects network/worker traffic can read it
 * regardless of `formatAssertionError`'s redaction (which only prevents the RENDERED error text
 * from repeating the secret back, it cannot un-ship the suite itself). This is consistent with
 * "WHO GRADES WHAT" above: a SCORED verdict never comes from this client-run boolean, so this
 * engine shipping its own hidden values client-side is a formative-tier/reference-replay property,
 * not a grading-integrity hole.
 */

/** Fixed, non-superuser, NOBYPASSRLS role every suite provisions. Exported so assertion/learner
 *  SQL authors can reference it (`SET ROLE ${APP_ROLE_NAME}`) without hard-coding the literal. */
export const APP_ROLE_NAME = "sprintlab_app"

/** Column alias the role-escape check queries under; kept internal (never referenced by content
 *  authors, unlike APP_ROLE_NAME). */
const ROLE_CHECK_COLUMN = "pg_suite_active_role"

/** A visible assertion's error text is capped for READABILITY only (see MAX_ERROR_CHARS/ROWS). A
 *  hidden assertion's error text is fully replaced, never capped -- see formatAssertionError. */
const MAX_ERROR_CHARS = 500
const MAX_ERROR_ROWS = 5

/** Every assertion's SQL runs with this search_path prepended (its own statement, always properly
 *  `;`-terminated) — see the module header's "TEMP-TABLE SHADOWING" and "New Breakage 2" sections
 *  for exactly what this does and does not defend against. */
const ASSERTION_SEARCH_PATH_SQL = "set search_path = pg_catalog, public;"

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
 * A HIDDEN assertion's RENDERED error can never mention actual/expected values (see the module
 * header's "HIDDEN ASSERTIONS ARE DISPLAY-ONLY" note for what this does and does not protect): an
 * error string like "Expected rows [[42]], got [[13]]" on a hidden check would repeat the hidden
 * expected answer back in the one place a learner is most likely to read it, so a hidden failure
 * gets a single fixed, generic message instead — never capped-but-partial, always fully replaced.
 * A visible assertion's error is only length/row-capped, for console readability, never redacted.
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

/** Does APP_ROLE_NAME already exist? Queried BEFORE the very first `provisionAppRole()` call only
 *  (see `provisionAndVerifyAppRole`'s `checkPreExistence` option) — a `true` here means a migration
 *  (or seed) defined this exact role name, which this module treats as an integrity violation
 *  regardless of what attributes that role happens to have (see module header, Critical-4). */
async function roleExists(pg) {
  const sets = await pg.exec(`select 1 from pg_roles where rolname = '${APP_ROLE_NAME}'`)
  const last = sets[sets.length - 1]
  return last.rows.length > 0
}

/**
 * Idempotent-to-call, NOT idempotent-to-trust blindly: creates APP_ROLE_NAME if missing (does NOT
 * correct an already-existing role's attributes — see the module header's Critical-4 discussion;
 * detecting a pre-existing role and failing loudly is the point, not silently repairing it),
 * revokes the database's TEMP privilege from PUBLIC (closes the temp-table-shadowing bypass — see
 * module header), grants it USAGE + CREATE on schema "public", transfers OWNERSHIP of every base
 * table AND plain view in "public" to it (see module header for why ownership, not a GRANT), and
 * grants sequence usage.
 *
 * The ownership-transfer loop runs SERVER-SIDE inside a `do $$ ... $$` block using
 * `format('public.%I', ...)` + `EXECUTE`, not client-side JS string interpolation of table/view
 * names — a table whose name itself contains SQL metacharacters (a double-quote, a semicolon) used
 * to let a crafted migration break out of the quoted identifier and run arbitrary SQL as the
 * superuser connection mid-loop (reproduced against the pre-fix version: a table literally named
 * `docs" owner to sprintlab_app; create table pwned(x int); --` got a `pwned` table created out of
 * band). `format('%I', ...)` is Postgres's own canonical identifier-quoting primitive and is not
 * vulnerable to this class of injection regardless of what characters the identifier contains. The
 * `public.` schema qualifier (added this round) is a SEPARATE concern from the quoting: without it,
 * a bare `%I` resolves through whatever `search_path` happens to be active, which learner SQL can
 * change — reproduced as "New Breakage 2": after learner SQL ran `SET search_path` to something
 * without `public`, this loop's own `ALTER TABLE %I OWNER TO ...` failed with "relation does not
 * exist" for a table this same function's own query had just confirmed exists in `pg_tables`,
 * surfacing as a misleading `integrity` failure rather than the search_path issue it actually was.
 *
 * v1 scope limit, stated rather than silently assumed: only base tables (`pg_tables`) and plain
 * views (`relkind = 'v'`) in schema "public" are covered. Materialized views, foreign tables, and
 * any object outside schema "public" are NOT re-owned and will not be reachable by learner SQL or
 * assertions running as APP_ROLE_NAME.
 *
 * A SEPARATE v1 scope limit from the REVOKE TEMP statement above, stated with equal weight to its
 * security benefit rather than left implicit: revoking TEMP from PUBLIC does not just block an
 * attacker's shadow table, it unconditionally blocks EVERY `CREATE TEMP TABLE` (or `CREATE
 * TEMPORARY TABLE`, or an implicit temp object from `SELECT ... INTO TEMP`) the grading role could
 * ever run, including a perfectly legitimate one. A ticket whose reference solution or intended
 * learner solution genuinely needs a temp table is NOT SUPPORTED by this engine in v1 — that
 * tradeoff is deliberate (closing the pg_temp shadowing bypass at its root was judged worth it),
 * but it is a real capability loss, not a free security win, and content authors should know it
 * before reaching for `CREATE TEMP TABLE` in a workbook ticket.
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

    do $$
    begin
      execute format('revoke temp on database %I from public', current_database());
    end
    $$;

    grant usage, create on schema public to ${APP_ROLE_NAME};

    do $$
    declare
      r record;
    begin
      for r in select tablename as name from pg_tables where schemaname = 'public' loop
        execute format('alter table public.%I owner to %I', r.name, '${APP_ROLE_NAME}');
      end loop;

      for r in
        select c.relname as name
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'v'
      loop
        execute format('alter view public.%I owner to %I', r.name, '${APP_ROLE_NAME}');
      end loop;
    end
    $$;

    grant usage, select on all sequences in schema public to ${APP_ROLE_NAME};
  `)
}

/**
 * Read-only check: throws (never auto-corrects) if `preExisted` is true (see `roleExists` and the
 * module header's Critical-4 discussion), or if the role is missing, or if `rolsuper`/`rolbypassrls`
 * are anything but `false`. Deliberately does NOT repair a bad role itself — a migration that
 * pre-creates `sprintlab_app` at all (correctly-flagged or not), or as `SUPERUSER`, must fail the
 * suite loudly, not be silently papered over into a passing grade (see module header).
 */
async function verifyAppRoleIntegrity(pg, { preExisted = false } = {}) {
  if (preExisted) {
    throw new Error(
      `Grading role "${APP_ROLE_NAME}" already existed before this suite's own provisioning ran — ` +
        `a migration (or seed) must never define this exact role name. This module is the ONLY ` +
        `intended owner of this role's identity; something else creating it first means this ` +
        `module cannot vouch for its full set of privileges/memberships, even when its rolsuper/` +
        `rolbypassrls flags happen to look correct.`
    )
  }

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

/**
 * Provisions AND verifies in one step — the pattern this module always uses (see
 * runPgSuiteCore's three call sites: initial setup, post-learner-SQL, and post-second-run under
 * doubleRunIdempotency). Kept as a named pair rather than inlined so no call site can accidentally
 * provision without also verifying. `checkPreExistence` is `true` for ONLY the first of those three
 * calls (a migration runs before it; the role legitimately exists by the time the other two run,
 * since this module's own first call created it).
 */
async function provisionAndVerifyAppRole(pg, { checkPreExistence = false } = {}) {
  const preExisted = checkPreExistence ? await roleExists(pg) : false
  await provisionAppRole(pg)
  await verifyAppRoleIntegrity(pg, { preExisted })
}

/**
 * `SET ROLE` and the given SQL run as TWO SEPARATE `exec()` calls on the same connection (never
 * string-concatenated into one) — a prior version joined them with `\n`, which broke any learner
 * script whose final statement lacked a trailing semicolon (`SELECT 1` with no `;`, followed by
 * this module's own appended check, parsed as one malformed statement; reproduced, see module
 * header). The role-escape check (see header's residual discussion for its exact, honest scope)
 * is a THIRD separate `exec()` call, run only if the learner's own script succeeded.
 */
async function runAsAppRole(pg, sql) {
  const setRoleOutcome = await safeExec(pg, `set role ${APP_ROLE_NAME}`)
  if (!setRoleOutcome.ok) {
    await resetRole(pg)
    return setRoleOutcome
  }

  const scriptOutcome = await safeExec(pg, sql)
  if (!scriptOutcome.ok) {
    await resetRole(pg)
    return scriptOutcome
  }

  const roleCheck = await safeExec(pg, `select current_user as ${ROLE_CHECK_COLUMN}`)
  await resetRole(pg)

  if (!roleCheck.ok) {
    // A bare SELECT failing here is surprising in its own right; surface it as the learner-sql
    // failure rather than silently ignoring a check that could not even run.
    return roleCheck
  }

  const last = roleCheck.resultSets[roleCheck.resultSets.length - 1]
  const activeRole = last && last.rows[0] ? last.rows[0][ROLE_CHECK_COLUMN] : undefined
  if (activeRole !== APP_ROLE_NAME) {
    return {
      ok: false,
      error:
        `Your SQL left the active database role as "${activeRole}" — it must stay "${APP_ROLE_NAME}" ` +
        `for the entire script. Statements that change the session's role (RESET ROLE, SET ROLE, ` +
        `SET LOCAL ROLE, SET SESSION AUTHORIZATION, set_config('role', ...)) are not allowed here.`,
    }
  }
  return scriptOutcome
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
 *  - A string actual value coerces to a Number whenever the expectation at that position is
 *    itself a number — this rule is TYPE-BLIND, not specific to NUMERIC/DECIMAL columns: it fires
 *    for ANY string cell that looks numeric, including a plain TEXT/VARCHAR column that happens to
 *    store a numeric-looking string (a TEXT column holding `"5"` compares equal to `expect: 5`,
 *    same as a real `numeric` column holding `19.99` compares equal to `expect: 19.99`). The
 *    motivating case is a NUMERIC/DECIMAL column's default string wire format (avoids float
 *    precision loss), but the code has no column-type information to restrict itself to that case
 *    — an author relying on a strict TEXT-vs-numeric distinction should write a string expectation
 *    for a text column and confirm the actual column type themselves; this coercion cannot tell the
 *    two apart.
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
    // Prepended, not appended -- this module's own statement is always `;`-terminated, so it can
    // never run together with the assertion's own first statement the way an APPENDED probe could
    // run together with an author's un-terminated LAST statement (see runAsAppRole's header note).
    const resultSets = await pg.exec(`${ASSERTION_SEARCH_PATH_SQL}\n${assertion.sql}`)

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
 * migration failure, a seed failure, an app-role provisioning/integrity failure (checked after
 * initial provisioning, again after learner SQL runs, and again after a doubleRunIdempotency second
 * run), or a learner-SQL failure (including a detected role escape): none of those states leave a
 * database an assertion could meaningfully grade.
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
    // checkPreExistence: true -- ONLY here. A migration runs before this call, so this is the one
    // point where "the role already exists" is itself the integrity violation (see module header).
    await provisionAndVerifyAppRole(pg, { checkPreExistence: true })
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
  // so assertions (and a doubleRunIdempotency second pass) can reach them too. A failure here is
  // NOT swallowed: an app role that cannot reach what the learner just created (or whose posture
  // the learner's SQL somehow left compromised) cannot be trusted to grade correctly, so this is a
  // hard gate, identical in kind to the first one above.
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

import { describe, expect, it } from "vitest"

import { getAppRoleName, runPgSuiteNode } from "../node-runner"
import type { PgSuite } from "../types"

/**
 * TDD suite for the PGlite ("pg-sandbox") suite engine, exercised entirely through the public
 * Node entry point `runPgSuiteNode` (a fresh, in-memory PGlite instance per call — the same
 * isolation guarantee production grading gets). Each `it()` pays PGlite's own cold-boot cost
 * (empirically ~0.4-0.7s per instance in this environment; see task-5-report.md), which keeps
 * every test fully independent and comfortably under the suite's 60s budget without the added
 * complexity of a shared-instance/schema-reset harness.
 *
 * Fix-round regression locks (see task-5-report.md's addendum for the review that found these):
 * the "learner SQL cannot escape the grading role" and "grading role integrity" describe blocks
 * below are the H1/H3-style probes made permanent; "zero-rows fails loudly..." and "expect: raises
 * is the correct passing gate..." are the H2-style probe.
 */

describe("runPgSuiteNode: RLS two-tenant proof", () => {
  const migrations = [
    `create table tenants (id text primary key);`,
    `create table docs (
       id serial primary key,
       tenant_id text not null references tenants(id),
       body text not null
     );`,
  ]
  const seedSql = `
    insert into tenants values ('tenant-a'), ('tenant-b');
    insert into docs (tenant_id, body) values ('tenant-a', 'alpha doc'), ('tenant-b', 'beta doc');
  `
  const workingPolicySql = `
    alter table docs enable row level security;
    alter table docs force row level security;
    create policy tenant_isolation on docs
      using (tenant_id = current_setting('app.tenant_id', true))
      with check (tenant_id = current_setting('app.tenant_id', true));
  `

  it("rejects cross-tenant SELECT with zero rows once the learner enables FORCE RLS", async () => {
    const roleName = await getAppRoleName()
    const suite: PgSuite = {
      migrations,
      seedSql,
      learnerSql: workingPolicySql,
      assertions: [
        {
          id: "same-tenant-select",
          humanName: "Tenant A can read its own document",
          sql: `
            set role ${roleName};
            select set_config('app.tenant_id', 'tenant-a', true);
            select body from docs where tenant_id = 'tenant-a';
          `,
          expect: { rows: [["alpha doc"]] },
        },
        {
          id: "cross-tenant-select-hidden",
          humanName: "Tenant A cannot read Tenant B's documents",
          sql: `
            set role ${roleName};
            select set_config('app.tenant_id', 'tenant-a', true);
            select * from docs where tenant_id = 'tenant-b';
          `,
          expect: "zero-rows",
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.error).toBeNull()
    expect(result.results.map((r) => ({ name: r.name, passed: r.passed, error: r.error }))).toEqual(
      [
        { name: "Tenant A can read its own document", passed: true, error: null },
        { name: "Tenant A cannot read Tenant B's documents", passed: true, error: null },
      ]
    )
    // "hidden" substring convention (matches vitest-shim.js's documented rule).
    expect(result.results[0].isHidden).toBe(false)
    expect(result.results[1].isHidden).toBe(true)
    expect(result.success).toBe(true)
  })

  it('uses expect:{raises} so a WORKING WITH CHECK rejection is the PASSING gate (fix for the inverted "zero-rows on an INSERT" bug)', async () => {
    const roleName = await getAppRoleName()
    const suite: PgSuite = {
      migrations,
      seedSql,
      learnerSql: workingPolicySql,
      assertions: [
        {
          id: "with-check-rejects-bad-insert",
          humanName: "Writing into another tenant's rows is rejected",
          sql: `
            set role ${roleName};
            select set_config('app.tenant_id', 'tenant-a', true);
            insert into docs (tenant_id, body) values ('tenant-b', 'malicious');
          `,
          expect: { raises: "row-level security" },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    // A CORRECT solution (the policy really does reject the bad insert) makes this PASS. The old
    // `expect: "zero-rows"` shape reported this exact scenario as FAILED (an inverted gate: an
    // INSERT with no RETURNING returns zero rows regardless of whether it succeeded or was
    // rejected, so "zero-rows" could not actually tell the two apart) — see the next test for the
    // companion proof that a BROKEN policy correctly fails this same assertion shape.
    expect(result.results).toHaveLength(1)
    expect(result.results[0].passed).toBe(true)
    expect(result.results[0].error).toBeNull()
    expect(result.success).toBe(true)
  })

  it("expect:{raises} correctly FAILS when there is no policy to reject the bad insert", async () => {
    const suite: PgSuite = {
      migrations,
      seedSql,
      // Deliberately BROKEN: no RLS at all, so the cross-tenant insert silently succeeds.
      learnerSql: `select 1;`,
      assertions: [
        {
          id: "with-check-rejects-bad-insert",
          sql: `insert into docs (tenant_id, body) values ('tenant-b', 'malicious');`,
          expect: { raises: "row-level security" },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toContain("completed without one")
  })

  it("proves a superuser connection bypasses RLS regardless of FORCE (documents why SET ROLE is required)", async () => {
    const suite: PgSuite = {
      migrations,
      seedSql,
      learnerSql: workingPolicySql,
      assertions: [
        {
          id: "superuser-sees-everything-anyway",
          humanName: "A superuser query is NOT scoped by the policy (expected Postgres behavior)",
          sql: `
            select set_config('app.tenant_id', 'tenant-a', true);
            select * from docs where tenant_id = 'tenant-b';
          `,
          expect: "zero-rows",
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    // This assertion is EXPECTED to fail: a superuser (no SET ROLE) always bypasses row security,
    // FORCE or not. If this ever started passing, the engine would have silently started running
    // the connection as something other than a superuser default and this test would need review.
    expect(result.results[0].passed).toBe(false)
  })
})

describe("runPgSuiteNode: zero-rows fails loudly (not vacuously) on a non-row-returning statement", () => {
  it('fails when a "zero-rows" assertion\'s last statement is a bare INSERT with no result set', async () => {
    const suite: PgSuite = {
      migrations: [`create table nums (n int not null);`],
      learnerSql: `select 1;`,
      assertions: [
        {
          id: "misused-zero-rows-on-a-dml-statement",
          // Succeeds unconditionally, but produces NO result set (no RETURNING) -- the pre-fix
          // engine treated "no result set" as "zero rows, therefore passed", which meant this
          // assertion shape could never actually fail no matter what the INSERT did.
          sql: `insert into nums (n) values (1);`,
          expect: "zero-rows",
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/did not end in a query that returns rows/i)
  })

  it("also fails an {rows: [...]} expectation the same way when the last statement returns no result set", async () => {
    const suite: PgSuite = {
      migrations: [`create table nums (n int not null);`],
      learnerSql: `select 1;`,
      assertions: [
        {
          id: "misused-rows-expectation-on-a-dml-statement",
          sql: `insert into nums (n) values (1);`,
          expect: { rows: [] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/did not end in a query that returns rows/i)
  })
})

describe('runPgSuiteNode: expect: "raises" (bare, any error)', () => {
  it("passes on any thrown error, fails when none is thrown", async () => {
    const suite: PgSuite = {
      migrations: [],
      learnerSql: `select 1;`,
      assertions: [
        { id: "throws-anything", sql: `select 1/0;`, expect: "raises" },
        { id: "throws-nothing", sql: `select 1;`, expect: "raises" },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(true)
    expect(result.results[1].passed).toBe(false)
    expect(result.results[1].error).toContain("completed without one")
  })
})

describe("runPgSuiteNode: learner SQL cannot escape the grading role", () => {
  const migrations = [`create table t (n int not null);`]

  it("rejects learner SQL that does RESET ROLE mid-script", async () => {
    const suite: PgSuite = {
      migrations,
      learnerSql: `reset role; insert into t (n) values (1);`,
      assertions: [{ id: "unreachable", sql: `select 1;`, expect: "zero-rows" }],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].suite).toBe("learner-sql")
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/active database role/i)
  })

  it("rejects learner SQL that does SET ROLE postgres mid-script", async () => {
    const suite: PgSuite = {
      migrations,
      learnerSql: `set role postgres; insert into t (n) values (1);`,
      assertions: [{ id: "unreachable", sql: `select 1;`, expect: "zero-rows" }],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].suite).toBe("learner-sql")
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/active database role/i)
  })

  it("rejects learner SQL that uses set_config('role', 'postgres', false) mid-script", async () => {
    const suite: PgSuite = {
      migrations,
      learnerSql: `select set_config('role', 'postgres', false); insert into t (n) values (1);`,
      assertions: [{ id: "unreachable", sql: `select 1;`, expect: "zero-rows" }],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].suite).toBe("learner-sql")
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/active database role/i)
  })

  it("still accepts ordinary learner SQL that never touches the role", async () => {
    const suite: PgSuite = {
      migrations,
      learnerSql: `insert into t (n) values (1), (2);`,
      assertions: [{ id: "count", sql: `select count(*)::int from t;`, expect: { rows: [[2]] } }],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(true)
  })
})

describe("runPgSuiteNode: grading role integrity", () => {
  it("fails loudly when a migration pre-creates the grading role as SUPERUSER", async () => {
    const roleName = await getAppRoleName()
    const suite: PgSuite = {
      migrations: [`create table t (n int not null);`, `create role ${roleName} superuser;`],
      learnerSql: `select 1;`,
      assertions: [{ id: "unreachable", sql: `select 1;`, expect: "zero-rows" }],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].suite).toBe("integrity")
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/rolsuper/i)
  })

  it("fails loudly when a migration pre-creates the grading role with BYPASSRLS", async () => {
    const roleName = await getAppRoleName()
    const suite: PgSuite = {
      migrations: [`create table t (n int not null);`, `create role ${roleName} bypassrls;`],
      learnerSql: `select 1;`,
      assertions: [{ id: "unreachable", sql: `select 1;`, expect: "zero-rows" }],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].suite).toBe("integrity")
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/rolbypassrls/i)
  })

  it("passes normally when nothing pre-creates the role", async () => {
    const suite: PgSuite = {
      migrations: [`create table t (n int not null);`],
      learnerSql: `insert into t (n) values (1);`,
      assertions: [{ id: "ok", sql: `select n from t;`, expect: { rows: [[1]] } }],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results.some((r) => r.suite === "integrity")).toBe(false)
    expect(result.results[0].passed).toBe(true)
  })
})

describe("runPgSuiteNode: ownership transfer resists a crafted (SQL-injection-shaped) table name", () => {
  it("does not let a crafted table name inject SQL during ownership transfer", async () => {
    const roleName = await getAppRoleName()
    // A table name that, if ownership transfer built `alter table "${name}" owner to ...` via
    // naive JS string interpolation (the pre-fix code), closes the quoted identifier early and
    // runs the rest as independent SQL — here, creating a "pwned" table as proof of unintended
    // execution. Reproduced against the pre-fix version (see task-5-report.md); the fix runs the
    // whole loop server-side via `format('%I', ...)` inside a `do $$ ... $$` block instead.
    const evilName = `docs" owner to ${roleName}; create table pwned(x int); --`
    const suite: PgSuite = {
      migrations: [
        `create table docs (id int);`,
        `create table "${evilName.replace(/"/g, '""')}" (id int);`,
      ],
      learnerSql: `select 1;`,
      assertions: [
        {
          id: "no-injected-table",
          sql: `select count(*)::int from pg_tables where tablename = 'pwned';`,
          expect: { rows: [[0]] },
        },
        {
          id: "docs-still-correctly-owned",
          sql: `select tableowner from pg_tables where tablename = 'docs';`,
          expect: { rows: [[roleName]] },
        },
        {
          id: "crafted-table-also-correctly-owned",
          sql: `select tableowner from pg_tables where tablename = '${evilName.replace(/'/g, "''")}';`,
          expect: { rows: [[roleName]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.error).toBeNull()
    expect(result.results.map((r) => r.passed)).toEqual([true, true, true])
  })
})

describe("runPgSuiteNode: schema-level CREATE grant and view ownership (Issue 3)", () => {
  it("lets learner SQL create a new table (schema-level CREATE, not just USAGE)", async () => {
    const suite: PgSuite = {
      migrations: [],
      learnerSql: `create table learner_created (id int not null);`,
      assertions: [
        {
          id: "learner-created-table-exists",
          sql: `select count(*)::int from pg_tables where tablename = 'learner_created';`,
          expect: { rows: [[1]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(true)
  })

  it("transfers ownership of a plain view (not just base tables) to the grading role", async () => {
    const roleName = await getAppRoleName()
    const suite: PgSuite = {
      migrations: [
        `create table nums (n int not null);`,
        `create view even_nums as select n from nums where n % 2 = 0;`,
      ],
      seedSql: `insert into nums values (1), (2), (3), (4);`,
      learnerSql: `select 1;`,
      assertions: [
        {
          id: "app-role-can-select-the-view",
          sql: `set role ${roleName}; select n from even_nums order by n;`,
          expect: { rows: [[2], [4]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(true)
  })
})

describe("runPgSuiteNode: row comparison normalization (Issue 8)", () => {
  it("compares a large bigint (beyond Number.MAX_SAFE_INTEGER) as a string", async () => {
    const suite: PgSuite = {
      migrations: [`create table big (n bigint not null);`],
      learnerSql: `insert into big (n) values (9007199254740993);`,
      assertions: [
        { id: "big-value", sql: `select n from big;`, expect: { rows: [["9007199254740993"]] } },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.error).toBeNull()
    expect(result.results[0].passed).toBe(true)
  })

  it("coerces a NUMERIC column's string wire format to a number when the expectation is a number", async () => {
    const suite: PgSuite = {
      migrations: [`create table prices (amount numeric(10,2) not null);`],
      learnerSql: `insert into prices (amount) values (19.99);`,
      assertions: [{ id: "price", sql: `select amount from prices;`, expect: { rows: [[19.99]] } }],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(true)
  })

  it("compares a TIMESTAMPTZ column as a full ISO-8601 string", async () => {
    const suite: PgSuite = {
      migrations: [`create table events (happened_at timestamptz not null);`],
      learnerSql: `insert into events (happened_at) values ('2024-01-01T00:00:00Z');`,
      assertions: [
        {
          id: "timestamp",
          sql: `select happened_at from events;`,
          expect: { rows: [["2024-01-01T00:00:00.000Z"]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(true)
  })
})

describe("runPgSuiteNode: assertion error text is capped, and redacted when hidden (Issue 5)", () => {
  it("does not leak expected/actual values in a HIDDEN assertion's failure message", async () => {
    const suite: PgSuite = {
      migrations: [`create table nums (n int not null);`],
      seedSql: `insert into nums values (1);`,
      learnerSql: `select 1;`,
      assertions: [
        {
          id: "secret-hidden-check",
          humanName: "A hidden check with a secret expected value",
          sql: `select n from nums;`,
          expect: { rows: [[999999]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].isHidden).toBe(true)
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toBe("This hidden check did not pass.")
    expect(result.results[0].error).not.toContain("999999")
  })

  it("caps a VISIBLE assertion's row diff at 5 rows", async () => {
    const suite: PgSuite = {
      migrations: [`create table nums (n int not null);`],
      seedSql: `insert into nums select generate_series(1, 20);`,
      learnerSql: `select 1;`,
      assertions: [
        {
          id: "big-mismatch",
          sql: `select n from nums order by n;`,
          expect: { rows: Array.from({ length: 20 }, (_, i) => [i + 100]) },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toContain("more row(s), omitted")
  })

  it("caps a VISIBLE assertion's error text at 500 characters", async () => {
    // The fixed "Expected rows [...], got [...]" wrapper text is itself ~30-40 chars, so the
    // payload needs real margin over 500 to guarantee the TOTAL message exceeds the cap.
    const longValue = "x".repeat(600)
    const suite: PgSuite = {
      migrations: [`create table blobs (v text not null);`],
      seedSql: `insert into blobs (v) values ('${longValue}');`,
      learnerSql: `select 1;`,
      assertions: [{ id: "mismatch", sql: `select v from blobs;`, expect: { rows: [["y"]] } }],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/\.\.\. \(truncated\)$/)
    expect(result.results[0].error?.length).toBeLessThanOrEqual(520)
  })
})

describe("runPgSuiteNode: migrations apply in array order", () => {
  it("applies migration 2 successfully when it depends on a table migration 1 created", async () => {
    const suite: PgSuite = {
      migrations: [
        `create table widgets (id serial primary key);`,
        `alter table widgets add column name text not null default 'unnamed';`,
      ],
      learnerSql: `insert into widgets (name) values ('gizmo');`,
      assertions: [
        {
          id: "widget-inserted",
          sql: `select name from widgets;`,
          expect: { rows: [["gizmo"]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.error).toBeNull()
    expect(result.results).toEqual([
      { suite: "assertion", name: "widget-inserted", passed: true, error: null, isHidden: false },
    ])
  })

  it("reports a clear, short-circuiting failure when a later migration depends on an earlier one that never ran", async () => {
    const suite: PgSuite = {
      // Migration 2 references a table that does not exist because migration 1 was never
      // supplied — simulates "out of order" by omitting the dependency outright.
      migrations: [`alter table widgets add column name text;`],
      learnerSql: `select 1;`,
      assertions: [{ id: "unreachable", sql: `select 1;`, expect: "zero-rows" }],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].suite).toBe("migration")
    expect(result.results[0].name).toBe("Migration 1 of 1 applies cleanly")
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/widgets/i)
  })
})

describe("runPgSuiteNode: assertion pass/fail mapping", () => {
  it("maps each assertion to its own WorkspaceTestResult row, independent of neighboring failures", async () => {
    const suite: PgSuite = {
      migrations: [`create table nums (n int not null);`],
      seedSql: `insert into nums values (1), (2), (3);`,
      learnerSql: `-- learner makes no changes for this fixture`,
      assertions: [
        {
          id: "no-negatives-hidden",
          humanName: "There are no negative numbers (hidden)",
          sql: `select * from nums where n < 0;`,
          expect: "zero-rows",
        },
        {
          id: "exact-rows",
          humanName: "The rows are exactly 1, 2, 3",
          sql: `select n from nums order by n;`,
          expect: { rows: [[1], [2], [3]] },
        },
        {
          id: "deliberately-wrong",
          humanName: "This check is deliberately wrong",
          sql: `select n from nums order by n;`,
          expect: { rows: [[9], [9], [9]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results).toHaveLength(3)
    expect(result.results[0]).toEqual({
      suite: "assertion",
      name: "There are no negative numbers (hidden)",
      passed: true,
      error: null,
      isHidden: true,
    })
    expect(result.results[1]).toEqual({
      suite: "assertion",
      name: "The rows are exactly 1, 2, 3",
      passed: true,
      error: null,
      isHidden: false,
    })
    expect(result.results[2].passed).toBe(false)
    expect(result.results[2].error).toContain("Expected rows")
    expect(result.success).toBe(false)
  })

  it("only grades the LAST statement of a multi-statement assertion", async () => {
    const roleName = await getAppRoleName()
    const suite: PgSuite = {
      migrations: [`create table nums (n int not null);`],
      seedSql: `insert into nums values (7);`,
      learnerSql: `-- no-op`,
      assertions: [
        {
          id: "setup-then-check",
          sql: `
            set role ${roleName};
            select set_config('app.example', 'irrelevant', true);
            select n from nums;
          `,
          expect: { rows: [[7]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(true)
  })
})

describe("runPgSuiteNode: double-run idempotency option", () => {
  it("passes when the learner's SQL is safely re-runnable", async () => {
    const suite: PgSuite = {
      migrations: [`create table flags (name text primary key, is_set boolean not null);`],
      learnerSql: `
        insert into flags (name, is_set) values ('beta', true)
        on conflict (name) do update set is_set = excluded.is_set;
      `,
      assertions: [
        {
          id: "flag-set",
          sql: `select is_set from flags where name = 'beta';`,
          expect: { rows: [[true]] },
        },
      ],
      options: { doubleRunIdempotency: true },
    }

    const result = await runPgSuiteNode(suite)

    expect(result.error).toBeNull()
    const idempotencyRow = result.results.find((r) => r.suite === "idempotency")
    expect(idempotencyRow).toEqual({
      suite: "idempotency",
      name: "Assertions still pass after running your SQL a second time",
      passed: true,
      error: null,
    })
  })

  it("fails clearly when the learner's SQL is NOT safely re-runnable", async () => {
    const suite: PgSuite = {
      migrations: [`create table flags (name text primary key, is_set boolean not null);`],
      // No ON CONFLICT clause: running this twice hits the primary key a second time.
      learnerSql: `insert into flags (name, is_set) values ('beta', true);`,
      assertions: [
        {
          id: "flag-set",
          sql: `select is_set from flags where name = 'beta';`,
          expect: { rows: [[true]] },
        },
      ],
      options: { doubleRunIdempotency: true },
    }

    const result = await runPgSuiteNode(suite)

    const idempotencyRow = result.results.find((r) => r.suite === "idempotency")
    expect(idempotencyRow?.passed).toBe(false)
    expect(idempotencyRow?.name).toBe("Running your SQL a second time still succeeds")
    expect(idempotencyRow?.error).toMatch(/duplicate key|unique constraint/i)
  })
})

describe("runPgSuiteNode: advisory locks (single connection)", () => {
  it("acquires, re-enters, and releases an advisory lock on the one shared connection", async () => {
    const suite: PgSuite = {
      migrations: [],
      learnerSql: `select 1;`,
      assertions: [
        {
          id: "first-acquire",
          sql: `select pg_try_advisory_lock(4242) as ok;`,
          expect: { rows: [[true]] },
        },
        {
          id: "reentrant-acquire-same-session",
          humanName: "The same session can re-acquire its own advisory lock",
          sql: `select pg_try_advisory_lock(4242) as ok;`,
          expect: { rows: [[true]] },
        },
        {
          id: "first-release",
          sql: `select pg_advisory_unlock(4242) as released;`,
          expect: { rows: [[true]] },
        },
        {
          id: "second-release",
          humanName: "The second unlock releases the reentrant hold",
          sql: `select pg_advisory_unlock(4242) as released;`,
          expect: { rows: [[true]] },
        },
        {
          id: "third-release-has-nothing-left",
          sql: `select pg_advisory_unlock(4242) as released;`,
          expect: { rows: [[false]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results.map((r) => r.passed)).toEqual([true, true, true, true, true])
  })
})

describe("runPgSuiteNode: multi-statement transactions", () => {
  it("commits every statement in an explicit BEGIN/COMMIT block", async () => {
    const suite: PgSuite = {
      migrations: [`create table ledger (amount int not null);`],
      learnerSql: `
        begin;
          insert into ledger (amount) values (10);
          insert into ledger (amount) values (20);
        commit;
      `,
      assertions: [
        { id: "total", sql: `select sum(amount)::int from ledger;`, expect: { rows: [[30]] } },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(true)
  })

  it("rolls back every statement in the same transaction when one of them fails", async () => {
    const suite: PgSuite = {
      migrations: [`create table ledger (amount int not null check (amount >= 0));`],
      learnerSql: `
        begin;
          insert into ledger (amount) values (10);
          insert into ledger (amount) values (-5);
        commit;
      `,
      assertions: [
        {
          id: "nothing-committed",
          sql: `select count(*)::int from ledger;`,
          expect: { rows: [[0]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    // The learner's own script failed (the whole implicit/explicit transaction aborted), so the
    // suite short-circuits at the "learner-sql" gate rather than reaching assertions.
    expect(result.results).toHaveLength(1)
    expect(result.results[0].suite).toBe("learner-sql")
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/check constraint|ledger_amount_check/i)
  })
})

describe("runPgSuiteNode: current_setting(key, true) missing_ok form", () => {
  it("returns null instead of erroring when the GUC was never set", async () => {
    const suite: PgSuite = {
      migrations: [],
      learnerSql: `select 1;`,
      assertions: [
        {
          id: "missing-ok-returns-null",
          sql: `select current_setting('app.never_set', true) is null as was_null;`,
          expect: { rows: [[true]] },
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results[0].passed).toBe(true)
  })
})

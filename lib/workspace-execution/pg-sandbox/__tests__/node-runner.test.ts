import { describe, expect, it } from "vitest"

import { getAppRoleName, runPgSuiteNode } from "../node-runner"
import type { PgSuite } from "../types"

/**
 * TDD suite for the PGlite ("pg-sandbox") suite engine, exercised entirely through the public
 * Node entry point `runPgSuiteNode` (a fresh, in-memory PGlite instance per call — the same
 * isolation guarantee production grading gets). Each `it()` pays PGlite's own cold-boot cost
 * (empirically ~0.5s per instance in this environment; see task-5-report.md), which keeps every
 * test fully independent and comfortably under the suite's 60s budget without the added
 * complexity of a shared-instance/schema-reset harness.
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

  it("rejects cross-tenant SELECT with zero rows once the learner enables FORCE RLS", async () => {
    const roleName = await getAppRoleName()
    const learnerSql = `
      alter table docs enable row level security;
      alter table docs force row level security;
      create policy tenant_isolation on docs
        using (tenant_id = current_setting('app.tenant_id', true))
        with check (tenant_id = current_setting('app.tenant_id', true));
    `
    const suite: PgSuite = {
      migrations,
      seedSql,
      learnerSql,
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

  it("rejects a WITH CHECK-violating insert (a bad cross-tenant write)", async () => {
    const roleName = await getAppRoleName()
    const suite: PgSuite = {
      migrations,
      seedSql,
      learnerSql: `
        alter table docs enable row level security;
        alter table docs force row level security;
        create policy tenant_isolation on docs
          using (tenant_id = current_setting('app.tenant_id', true))
          with check (tenant_id = current_setting('app.tenant_id', true));
      `,
      assertions: [
        {
          id: "with-check-rejects-bad-insert",
          humanName: "Writing into another tenant's rows is rejected",
          sql: `
            set role ${roleName};
            select set_config('app.tenant_id', 'tenant-a', true);
            insert into docs (tenant_id, body) values ('tenant-b', 'malicious');
          `,
          expect: "zero-rows", // never reached on success path; failure surfaces via the catch below
        },
      ],
    }

    const result = await runPgSuiteNode(suite)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].error).toMatch(/row-level security/i)
  })

  it("proves a superuser connection bypasses RLS regardless of FORCE (documents why SET ROLE is required)", async () => {
    const suite: PgSuite = {
      migrations,
      seedSql,
      learnerSql: `
        alter table docs enable row level security;
        alter table docs force row level security;
        create policy tenant_isolation on docs
          using (tenant_id = current_setting('app.tenant_id', true))
          with check (tenant_id = current_setting('app.tenant_id', true));
      `,
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

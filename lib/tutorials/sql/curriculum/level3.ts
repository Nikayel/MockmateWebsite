import type { SqlExercise, SqlLevel } from "@/lib/tutorials/types"

/**
 * Level 3 — Data Modeling & Schema Design (script/workspace grading).
 *
 * AGENT-1 ships ONE proof lesson here (`sql-l3-ddl-create`) to prove the workspace/marker pipeline
 * end-to-end; AGENT-2 authors the rest from `docs/sql-curriculum/CONTENT.md`. Workspace grading: the
 * learner writes a multi-statement script (the single editable file); after it runs, hidden
 * **assertion queries** run — each returns the OFFENDING rows, so zero rows = pass (the dbt
 * "count of violations = 0" convention) — and `checkIdempotency` re-runs the script to assert a
 * stable row count. The runner emits the byte-identical `__WORKSPACE_TEST_RESULTS__:` marker.
 */

/** Build a workspace SqlExercise — one editable `solution.sql` the learner writes, plus grading. */
function scriptExercise(input: {
  id: string
  prompt: string
  starterCode: string
  hints: string[]
  referenceSolution?: string
  seedSql: string
  assertions: NonNullable<SqlExercise["workspace"]>["assertions"]
  checkIdempotency?: boolean
}): SqlExercise {
  return {
    id: input.id,
    executionMode: "workspace",
    prompt: input.prompt,
    starterCode: input.starterCode,
    hints: input.hints,
    referenceSolution: input.referenceSolution,
    workspace: {
      language: "sql",
      primaryFilePath: "solution.sql",
      editableFilePaths: ["solution.sql"],
      // Vestigial for SQL (assertions are hidden queries, not files) but required by the shared
      // WorkspaceScenarioConfig contract the reused WorkspaceExerciseRunner renders.
      testRunnerPath: "solution.sql",
      visibleTestPaths: [],
      hiddenTestPaths: [],
      files: [
        {
          path: "solution.sql",
          content: input.starterCode,
          role: "editable",
          language: "sql",
        },
      ],
      seedSql: input.seedSql,
      assertions: input.assertions,
      checkIdempotency: input.checkIdempotency,
    },
  }
}

const ddlCreate: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-ddl-create",
  title: "CREATE TABLE and Data Types",
  summary: "Define a table's structure with the right column types and defaults.",
  estimatedMinutes: 25,
  difficulty: "easy",
  skills: ["CREATE TABLE", "column types", "DEFAULT", "DROP TABLE"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## \`CREATE TABLE\` is a contract

Every table in a warehouse started as a \`CREATE TABLE\` someone wrote. That statement declares the
columns, their types, which values may be missing, and what a row looks like when the loader doesn't
supply every field. Get it right and downstream models inherit clean, predictable data.

As a DE, your first job on a new source is usually a **staging table**: a clean, typed landing zone.

\`\`\`sql
CREATE TABLE stg_customer (
    customer_id   INTEGER,
    email         TEXT,
    country_code  TEXT,
    signup_date   TEXT,               -- ISO-8601 'YYYY-MM-DD'
    is_active     INTEGER DEFAULT 1,  -- 0/1 boolean-as-int
    loaded_at     TEXT DEFAULT (datetime('now'))
);
\`\`\`

Insert a **partial** row and the defaults fill in — \`is_active → 1\`, \`loaded_at → now\`.

\`DROP TABLE IF EXISTS stg_customer;\` is the safe, re-runnable form you put at the top of a script so
a re-run doesn't error on "table already exists."

> **In the warehouse this differs — SQLite type affinity is only advisory.** SQLite will store the
> text \`'oops'\` in an \`INTEGER\` column; Postgres/Snowflake/BigQuery reject it. Declare the *intended*
> type anyway — your DDL is documentation and must port to a strict engine unchanged.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB,
then hidden assertion queries check schema shape, defaults, and row counts.`,
  },
  apply: scriptExercise({
    id: "sql-l3-ddl-create-apply",
    prompt: `Write a script that creates a cleaned \`dim_customer\` table and inserts two rows to prove
the defaults work. The table must have: \`customer_id\` INTEGER, \`email\` TEXT, \`country_code\` TEXT,
\`signup_date\` TEXT, an \`is_active\` column defaulting to \`1\`, and a \`loaded_at\` column defaulting to the
current timestamp. Insert one row supplying every column, and one row (\`customer_id = 2\`) that **omits**
\`is_active\` and \`loaded_at\` so the defaults fire.`,
    starterCode: `DROP TABLE IF EXISTS dim_customer;

-- CREATE TABLE dim_customer ( ... );
-- INSERT the full row (customer_id = 1) ...
-- INSERT the partial row (customer_id = 2), omitting is_active and loaded_at ...`,
    hints: [
      "Start with `DROP TABLE IF EXISTS dim_customer;` so the script re-runs cleanly.",
      "Put `DEFAULT 1` right after `is_active INTEGER`.",
      "For the timestamp default use `DEFAULT (datetime('now'))` — the parentheses are required.",
      "In the second INSERT, list only the columns you supply — the omitted ones pick up defaults.",
    ],
    referenceSolution: `DROP TABLE IF EXISTS dim_customer;

CREATE TABLE dim_customer (
    customer_id  INTEGER,
    email        TEXT,
    country_code TEXT,
    signup_date  TEXT,
    is_active    INTEGER DEFAULT 1,
    loaded_at    TEXT DEFAULT (datetime('now'))
);

INSERT INTO dim_customer (customer_id, email, country_code, signup_date, is_active, loaded_at)
VALUES (1, 'ada@example.com', 'GB', '2026-01-14', 1, '2026-01-14 09:00:00');

INSERT INTO dim_customer (customer_id, email, country_code, signup_date)
VALUES (2, 'grace@example.com', 'US', '2026-02-03');`,
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "dim_customer has the six required columns",
        isHidden: true,
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_table_info('dim_customer')
          WHERE name IN ('customer_id','email','country_code','signup_date','is_active','loaded_at')
        ) <> 6`,
      },
      {
        suite: "defaults",
        name: "is_active defaults to 1 on the row that omitted it",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT is_active FROM dim_customer WHERE customer_id = 2), -1) <> 1`,
      },
      {
        suite: "audit",
        name: "loaded_at is stamped on the defaulted row",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT loaded_at FROM dim_customer WHERE customer_id = 2) IS NULL`,
      },
      {
        suite: "rows",
        name: "exactly two rows were inserted",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer) <> 2`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-ddl-create-practice",
    prompt: `Author the DDL for a **three-table staging schema**: \`stg_customer\`, \`stg_product\`, and
\`stg_order\`. Every table must carry sensible types and a \`loaded_at TEXT DEFAULT (datetime('now'))\`
audit column.

- \`stg_customer\`: \`customer_id INTEGER\`, \`email TEXT\`, \`country_code TEXT\`, \`signup_date TEXT\`, plus \`loaded_at\`.
- \`stg_product\`: \`product_id INTEGER\`, \`sku TEXT\`, \`name TEXT\`, \`category TEXT\`, \`unit_price_cents INTEGER DEFAULT 0\`, plus \`loaded_at\`.
- \`stg_order\`: \`order_id INTEGER\`, \`customer_id INTEGER\`, \`order_ts TEXT\`, \`status TEXT DEFAULT 'pending'\`, \`total_cents INTEGER DEFAULT 0\`, plus \`loaded_at\`.

Then insert **one row per table**, omitting the defaulted columns (\`status\`, both \`*_cents\`, every
\`loaded_at\`) to prove the defaults fire.`,
    starterCode: `DROP TABLE IF EXISTS stg_customer;
DROP TABLE IF EXISTS stg_product;
DROP TABLE IF EXISTS stg_order;

-- CREATE the three tables with their defaults + loaded_at audit column ...
-- INSERT one row per table, omitting the defaulted columns ...`,
    hints: [
      "Lead every table with `DROP TABLE IF EXISTS …;` for a clean re-run.",
      "`unit_price_cents INTEGER DEFAULT 0` and `total_cents INTEGER DEFAULT 0` — money as integer cents.",
      "`status TEXT DEFAULT 'pending'` — string-literal defaults go in single quotes.",
      "In each INSERT, name only the non-defaulted columns so the DEFAULTs take over.",
    ],
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "audit",
        name: "all three staging tables carry a loaded_at column",
        isHidden: true,
        sql: `SELECT 1 WHERE
          (SELECT COUNT(*) FROM pragma_table_info('stg_customer') WHERE name='loaded_at') <> 1
          OR (SELECT COUNT(*) FROM pragma_table_info('stg_product') WHERE name='loaded_at') <> 1
          OR (SELECT COUNT(*) FROM pragma_table_info('stg_order') WHERE name='loaded_at') <> 1`,
      },
      {
        suite: "defaults",
        name: "unit_price_cents / status / total_cents defaults fired",
        isHidden: true,
        sql: `SELECT 1 WHERE
          COALESCE((SELECT unit_price_cents FROM stg_product), -1) <> 0
          OR COALESCE((SELECT status FROM stg_order), 'x') <> 'pending'
          OR COALESCE((SELECT total_cents FROM stg_order), -1) <> 0`,
      },
      {
        suite: "audit",
        name: "loaded_at is stamped on every inserted row",
        isHidden: true,
        sql: `SELECT 1 WHERE
          (SELECT loaded_at FROM stg_customer) IS NULL
          OR (SELECT loaded_at FROM stg_product) IS NULL
          OR (SELECT loaded_at FROM stg_order) IS NULL`,
      },
      {
        suite: "rows",
        name: "exactly one row landed in each table",
        isHidden: true,
        sql: `SELECT 1 WHERE (
          (SELECT COUNT(*) FROM stg_customer)
          + (SELECT COUNT(*) FROM stg_product)
          + (SELECT COUNT(*) FROM stg_order)
        ) <> 3`,
      },
    ],
  }),
}

export const sqlLevel3: SqlLevel = {
  id: 3,
  slug: "modeling",
  title: "Level 3 — Data Modeling & Schema Design",
  tagline: "DDL, keys, constraints, and normalization — designing schemas the database enforces.",
  defaultExecutionMode: "workspace",
  estimatedHours: 6,
  modules: [
    {
      id: "sql-l3-ddl",
      title: "Module 3.1 — DDL, Types, and Loading Data",
      description:
        "The two verbs every pipeline is built on: CREATE TABLE to define, INSERT to fill.",
      lessons: [ddlCreate],
    },
  ],
}

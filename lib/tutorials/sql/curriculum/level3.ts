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

const insertPopulate: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-insert-populate",
  title: "INSERT and INSERT … SELECT",
  summary: "Load rows literally and transform-load from another table.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["INSERT INTO … VALUES", "INSERT … SELECT", "multi-row insert", "column lists"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Two ways to fill a table

There are two ways to fill a table. \`INSERT … VALUES\` writes literal rows you type out — good for
seeds and reference data. \`INSERT … SELECT\` writes rows *read from another table*, transforming them
on the way in. That second form is the entire **"T" of ELT**: you read raw, clean/cast/rename in the
\`SELECT\`, and land the result in a model table — all in one statement, all inside the database.

### Worked example

A raw feed stores prices as text cents and mixed-case emails. Load a cleaned dimension straight from it:

\`\`\`sql
INSERT INTO dim_product (product_id, sku, name, unit_price_cents)
SELECT
    CAST(prod_id AS INTEGER),
    UPPER(TRIM(sku)),
    TRIM(prod_name),
    CAST(price_txt AS INTEGER)
FROM raw_product
WHERE prod_id IS NOT NULL;   -- drop junk rows at the boundary
\`\`\`

Every row that survives the \`WHERE\` is cast, trimmed, and inserted. No temp files, no application code.

### Anatomy

\`\`\`
INSERT INTO dim_product (product_id, sku, name, unit_price_cents)
                         └──── target column list ────┘
SELECT  CAST(prod_id AS INTEGER), ...   -- positionally maps to the target columns
FROM raw_product
WHERE ...;                               -- filter which source rows load
\`\`\`

The \`SELECT\` output columns map **positionally** to the target column list — the first select
expression fills the first named column, and so on. Types don't have to match names, only positions.

### Multi-row literal insert

One statement, many rows — the compact seed form:

\`\`\`sql
INSERT INTO dim_status (code, label) VALUES
    ('paid','Paid'), ('shipped','Shipped'), ('cancelled','Cancelled');
\`\`\`

> **In the warehouse this differs — barely.** \`INSERT … SELECT\` and multi-row \`VALUES\` are
> ANSI-standard and portable across Postgres/Snowflake/BigQuery essentially unchanged. The main
> divergence is scale: warehouses discourage row-by-row \`VALUES\` inserts (they're slow columnar
> writes) and favor bulk \`COPY\` / \`INSERT … SELECT\`. The pattern you're learning is exactly the right
> one there.

### Keep it readable / common pitfalls

Always write the explicit **column list** in \`INSERT INTO t (a, b, c)\`. Relying on column *order*
(\`INSERT INTO t SELECT …\` with no list) silently breaks the day someone adds a column or reorders the
DDL. Second pitfall: forgetting the boundary \`WHERE\` and loading NULL-keyed junk rows into a clean
model.

**Recap:** \`INSERT … SELECT\` is the transform-load step of ELT; always name target columns explicitly
and filter junk at the boundary.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB,
then hidden assertion queries check row counts, cleaned values, and column types.`,
  },
  apply: scriptExercise({
    id: "sql-l3-insert-populate-apply",
    prompt: `A \`raw_product\` table holds dirty product data (already seeded for you). Create a clean
\`dim_product\` and populate it from \`raw_product\` with a **single** \`INSERT … SELECT\`:

- cast \`prod_id\` and \`price_txt\` to \`INTEGER\`,
- uppercase **and** trim the SKU (\`UPPER(TRIM(sku))\`),
- trim the product name,
- and **drop rows whose \`prod_id\` is NULL** with a boundary \`WHERE\`.

\`dim_product\` has columns \`product_id\` INTEGER, \`sku\` TEXT, \`name\` TEXT, \`unit_price_cents\` INTEGER.`,
    starterCode: `-- raw_product is already seeded. Build the clean dimension from it.
DROP TABLE IF EXISTS dim_product;

-- CREATE TABLE dim_product ( ... );
-- INSERT INTO dim_product (...) SELECT ... FROM raw_product WHERE ... ;`,
    hints: [
      "Create `dim_product` with `INTEGER` id/price columns first.",
      "`UPPER(TRIM(sku))` normalizes the SKU in one expression.",
      "`CAST(price_txt AS INTEGER)` turns text cents into an integer.",
      "Add `WHERE prod_id IS NOT NULL` to drop the junk row.",
    ],
    referenceSolution: `DROP TABLE IF EXISTS dim_product;

CREATE TABLE dim_product (
    product_id       INTEGER,
    sku              TEXT,
    name             TEXT,
    unit_price_cents INTEGER
);

INSERT INTO dim_product (product_id, sku, name, unit_price_cents)
SELECT CAST(prod_id AS INTEGER), UPPER(TRIM(sku)), TRIM(prod_name), CAST(price_txt AS INTEGER)
FROM raw_product
WHERE prod_id IS NOT NULL;`,
    seedSql: `DROP TABLE IF EXISTS raw_product;
CREATE TABLE raw_product (prod_id TEXT, sku TEXT, prod_name TEXT, price_txt TEXT);
INSERT INTO raw_product VALUES
    ('10', ' abc-1 ', ' Wireless Mouse ', '2499'),
    ('11', 'def-2',   'Keyboard',         '4999'),
    (NULL, 'xxx',     'Junk Row',         '0');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "junk row dropped: exactly two rows loaded",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_product) <> 2`,
      },
      {
        suite: "clean",
        name: "SKU is uppercased and trimmed",
        sql: `SELECT 1 WHERE COALESCE((SELECT sku FROM dim_product WHERE product_id = 10), '~') <> 'ABC-1'`,
      },
      {
        suite: "clean",
        name: "price_txt cast to integer cents",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT unit_price_cents FROM dim_product WHERE product_id = 11), -1) <> 4999`,
      },
      {
        suite: "types",
        name: "product_id lands with integer affinity",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT typeof(product_id) FROM dim_product WHERE product_id = 10), '~') <> 'integer'`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-insert-populate-practice",
    prompt: `A single wide \`raw_feed\` mixes customer and product columns (already seeded). **Split it
into two normalized targets** with two \`INSERT … SELECT\` statements:

- \`dim_customer\` (\`customer_id\` INTEGER, \`email\` TEXT, \`country_code\` TEXT)
- \`dim_product\` (\`product_id\` INTEGER, \`sku\` TEXT, \`unit_price_cents\` INTEGER)

Clean in flight: lowercase+trim emails, uppercase+trim SKUs, cast ids and price to \`INTEGER\`,
uppercase country codes. **Deduplicate customers** so each \`customer_id\` appears once even though the
feed repeats it per product line — and dedup products the same way.`,
    starterCode: `-- raw_feed is already seeded. Split it into two clean dimensions.
DROP TABLE IF EXISTS dim_customer;
DROP TABLE IF EXISTS dim_product;

-- CREATE the two target tables with INTEGER keys/price ...
-- INSERT … SELECT DISTINCT into dim_customer from raw_feed ...
-- INSERT … SELECT DISTINCT into dim_product from raw_feed ...`,
    hints: [
      "Create both target tables first, with `INTEGER` keys/price.",
      "Customers: `SELECT DISTINCT CAST(cust_id AS INTEGER), LOWER(TRIM(email)), UPPER(TRIM(country)) FROM raw_feed` — `DISTINCT` collapses the repeats.",
      "Products: same idea keyed on `prod_id`, with `UPPER(TRIM(sku))` and `CAST(price_txt AS INTEGER)`.",
      "Watch the grain: each target `SELECT` should project only its own columns so the duplicates actually collapse.",
    ],
    seedSql: `DROP TABLE IF EXISTS raw_feed;
CREATE TABLE raw_feed (
    cust_id TEXT, email TEXT, country TEXT,
    prod_id TEXT, sku TEXT, price_txt TEXT
);
INSERT INTO raw_feed VALUES
    ('1',' Ada@Example.com ','gb','100','a-1','2499'),
    ('1',' Ada@Example.com ','gb','101','b-2','4999'),
    ('2','Grace@Example.com','us','100','a-1','2499');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "customers deduplicated to two rows",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer) <> 2`,
      },
      {
        suite: "clean",
        name: "email lowercased and trimmed",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT email FROM dim_customer WHERE customer_id = 1), '~') <> 'ada@example.com'`,
      },
      {
        suite: "clean",
        name: "country code uppercased",
        sql: `SELECT 1 WHERE COALESCE((SELECT country_code FROM dim_customer WHERE customer_id = 2), '~') <> 'US'`,
      },
      {
        suite: "rows",
        name: "products deduplicated to two rows",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_product) <> 2`,
      },
      {
        suite: "clean",
        name: "SKU uppercased and trimmed",
        sql: `SELECT 1 WHERE COALESCE((SELECT sku FROM dim_product WHERE product_id = 100), '~') <> 'A-1'`,
      },
      {
        suite: "types",
        name: "unit_price_cents lands with integer affinity",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT typeof(unit_price_cents) FROM dim_product LIMIT 1), '~') <> 'integer'`,
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
      lessons: [ddlCreate, insertPopulate],
    },
  ],
}

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

const primaryKeys: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-primary-keys",
  title: "Primary Keys: Surrogate vs Natural",
  summary: "Give every row a stable identity that survives source changes.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["PRIMARY KEY", "surrogate keys", "natural keys", "UNIQUE"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Primary keys give a row its identity

A **primary key (PK)** is the column (or columns) that uniquely identifies each row. The database
enforces it: two rows can never share a PK value, and a PK can't be NULL. This is the single most
important guarantee in a schema — it's what makes "one row per thing" true.

You get to choose *what* the key is. Two families:

- **Natural key** — a business value that's already unique: an email, an ISBN, a country code.
  Meaningful, but risky: business values change (people change emails), can be reused, and are often
  wide (bad for joins/indexes).
- **Surrogate key** — a system-generated integer with no business meaning, usually auto-incrementing.
  It never changes, is compact, and joins fast.

**DEs strongly prefer surrogate keys** for warehouse dimensions. The natural key can change or arrive
dirty; the surrogate stays stable so facts that reference it never break. You keep the natural key as
a regular attribute (often \`UNIQUE\`), but *identity* rides on the surrogate.

### Worked example

\`\`\`sql
CREATE TABLE dim_customer (
    customer_sk  INTEGER PRIMARY KEY,   -- surrogate: system identity
    email        TEXT UNIQUE,           -- natural key kept as a UNIQUE attribute
    country_code TEXT
);
\`\`\`

In SQLite, \`INTEGER PRIMARY KEY\` auto-assigns rowids, so an insert can omit it:

\`\`\`sql
INSERT INTO dim_customer (email, country_code) VALUES ('ada@example.com','GB');
-- customer_sk auto-filled to 1
\`\`\`

**Anatomy:**

\`\`\`
customer_sk  INTEGER PRIMARY KEY
    │           │        │
 surrogate   integer   uniqueness + not-null + auto-index,
   name      affinity   and (in SQLite) auto-increment
\`\`\`

Declaring a PK **automatically creates a unique index** on it — lookups and joins by PK are fast for
free.

> **In the warehouse this differs — surrogate generation.** SQLite gives you \`INTEGER PRIMARY KEY\`
> (and the stricter \`AUTOINCREMENT\`) for free surrogates. Postgres uses \`GENERATED ALWAYS AS IDENTITY\`
> (or \`serial\`); Snowflake/BigQuery often use sequences or \`ROW_NUMBER()\`-assigned keys during the
> load because they don't auto-increment the same way. The *concept* — a stable system integer — is
> identical; the syntax that mints it is per-engine.

**Keep it readable / common pitfall.** Don't make a natural key the PK just because it's "obviously
unique today." The day it isn't (a supplier reuses a SKU, a customer re-registers an email) your PK
constraint blocks a legitimate load. Use a surrogate PK and add \`UNIQUE\` on the natural key — you get
identity *and* a duplicate guard, decoupled.

**Recap:** every row needs a stable identity; prefer a surrogate integer PK (auto-indexed, unchanging)
and keep the natural key as a separate \`UNIQUE\` attribute.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB,
then hidden assertion queries check the primary key, the unique index, and the row counts.`,
  },
  apply: scriptExercise({
    id: "sql-l3-primary-keys-apply",
    prompt: `Create a \`dim_customer\` table with a **surrogate** integer PK \`customer_sk\` and keep the
business key \`email\` as a plain attribute (add \`country_code\` too). Insert two customers **without**
specifying \`customer_sk\` and let SQLite assign it.`,
    starterCode: `DROP TABLE IF EXISTS dim_customer;

-- CREATE TABLE dim_customer with a surrogate INTEGER PRIMARY KEY customer_sk,
-- plus email TEXT and country_code TEXT ...
-- INSERT two customers WITHOUT listing customer_sk (let SQLite auto-assign it) ...`,
    hints: [
      "`customer_sk INTEGER PRIMARY KEY` is all you need for an auto-incrementing surrogate in SQLite.",
      "Don't list `customer_sk` in your `INSERT` column list — let it auto-fill.",
      "`email` is just `email TEXT` here (no PK) — identity rides on the surrogate, not the business value.",
    ],
    referenceSolution: `DROP TABLE IF EXISTS dim_customer;

CREATE TABLE dim_customer (
    customer_sk  INTEGER PRIMARY KEY,
    email        TEXT,
    country_code TEXT
);

INSERT INTO dim_customer (email, country_code) VALUES ('ada@example.com','GB');
INSERT INTO dim_customer (email, country_code) VALUES ('grace@example.com','US');`,
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "customer_sk is the primary key of dim_customer",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('dim_customer') WHERE name='customer_sk' AND pk=1) <> 1`,
      },
      {
        suite: "rows",
        name: "two rows landed with distinct surrogate keys",
        sql: `SELECT 1 WHERE (SELECT COUNT(DISTINCT customer_sk) FROM dim_customer) <> 2`,
      },
      {
        suite: "surrogate",
        name: "surrogates were auto-assigned starting at 1",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT MIN(customer_sk) FROM dim_customer), -1) <> 1`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-primary-keys-practice",
    prompt: `Design \`dim_product\` with a surrogate PK \`product_sk\` **and** a \`UNIQUE\` natural key
\`sku\` (plus a \`name\`). Insert two valid products (use skus \`'A-1'\` and \`'B-2'\`). Then **attempt a
third insert that duplicates an existing \`sku\`** and prove the database rejects it — the row count
must stay at 2 after the failed insert. Use \`INSERT OR IGNORE\` for the duplicate so the script keeps
running and the assertions can execute.`,
    starterCode: `DROP TABLE IF EXISTS dim_product;

-- CREATE TABLE dim_product: surrogate PK product_sk, UNIQUE natural key sku, plus name ...
-- INSERT two valid products (sku 'A-1' and 'B-2') ...
-- Attempt a THIRD insert reusing sku 'A-1' with INSERT OR IGNORE so the script continues ...`,
    hints: [
      "`product_sk INTEGER PRIMARY KEY` for identity; `sku TEXT UNIQUE` for the natural-key guard.",
      "The `UNIQUE` on `sku` creates the unique index the constraint assertion checks.",
      "For the duplicate attempt, `INSERT OR IGNORE INTO dim_product (sku, name) VALUES ('A-1', …)` silently skips the conflicting row instead of aborting the whole script.",
      "Identity (PK) and duplicate-blocking (UNIQUE) are two separate guarantees on two different columns.",
    ],
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "product_sk is the primary key of dim_product",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('dim_product') WHERE name='product_sk' AND pk=1) <> 1`,
      },
      {
        suite: "rows",
        name: "the duplicate sku did not create a third row",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_product) <> 2`,
      },
      {
        suite: "constraint",
        name: "sku carries a UNIQUE index",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_index_list('dim_product') WHERE "unique"=1) < 1`,
      },
      {
        suite: "guard",
        name: "exactly one row survives for the duplicated sku",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_product WHERE sku='A-1') <> 1`,
      },
    ],
  }),
}

const foreignKeys: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-foreign-keys",
  title: "Foreign Keys and Referential Integrity",
  summary: "Guarantee a child row always points at a real parent.",
  estimatedMinutes: 30,
  difficulty: "medium",
  skills: ["FOREIGN KEY", "REFERENCES", "ON DELETE", "PRAGMA foreign_keys"],
  teach: {
    estimatedMinutes: 10,
    markdown: `## Foreign keys keep every child pointing at a real parent

A **foreign key (FK)** says: "the value in *this* column must exist as a key in *that* table." An
\`orders.customer_id\` FK to \`customers.customer_id\` makes it **impossible** to insert an order for a
customer who doesn't exist. That guarantee is **referential integrity** — the backbone of a
trustworthy schema, and the thing that stops orphan rows from ever forming.

**Worked example.**

\`\`\`sql
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    email       TEXT
);
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    total_cents INTEGER,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE RESTRICT
);
\`\`\`

Now \`INSERT INTO orders (order_id, customer_id, total_cents) VALUES (1, 999, 500);\` **fails** if
customer 999 doesn't exist.

**\`ON DELETE\` policies** decide what happens to children when a parent is deleted:

| Policy | Behavior |
|---|---|
| \`RESTRICT\` (or \`NO ACTION\`) | **Block** the parent delete while children exist. Safest default. |
| \`CASCADE\` | **Delete the children too.** Use only when children are meaningless without the parent (e.g. order line items when the order dies). |
| \`SET NULL\` | Null out the child's FK. Requires the FK column be nullable. |

**Anatomy:**

\`\`\`
FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT
             │                        │        │                        │
       child column           parent table  parent key          delete policy
\`\`\`

> **In the warehouse this differs — and SQLite has a trap.** SQLite **does not enforce foreign keys
> unless you turn them on** every connection: \`PRAGMA foreign_keys = ON;\`. Forget it and your
> \`REFERENCES\` clauses parse fine but enforce nothing — orphans slip right in. Warehouses are the
> opposite extreme: Redshift, Snowflake, and BigQuery let you *declare* FKs but **don't enforce them
> at all** (they're informational, used by the planner). So in the real warehouse, referential
> integrity is enforced by your *load logic and DQ tests*, not the engine. Here in SQLite you get
> real enforcement — as long as you flip the pragma.

> **A second SQLite gotcha:** \`INSERT OR IGNORE\` does **not** suppress a foreign-key violation. The
> \`OR IGNORE\` conflict clause only skips \`UNIQUE\` / \`NOT NULL\` / \`CHECK\` / \`PRIMARY KEY\` conflicts —
> an FK violation still raises \`FOREIGN KEY constraint failed\` and aborts the statement. So the
> defensive way to "insert only if the parent exists" is a **guarded insert**:
> \`INSERT INTO orders (...) SELECT ... WHERE EXISTS (SELECT 1 FROM customers WHERE customer_id = ...)\`.
> The row lands only when the parent is present; otherwise it's a clean no-op instead of an error.

**Keep it readable / common pitfall.** Two pitfalls dominate. First: forgetting
\`PRAGMA foreign_keys = ON;\` — always the first line of an FK script. Second: reaching for \`CASCADE\`
by default. Cascading deletes are a foot-gun; a single parent delete can silently wipe thousands of
children. Default to \`RESTRICT\` and only cascade where the child genuinely cannot outlive the parent.

**Recap:** an FK forces every child to point at a real parent; choose \`ON DELETE\` deliberately
(default \`RESTRICT\`), and in SQLite you *must* run \`PRAGMA foreign_keys = ON;\` or enforcement is off.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB
with FK enforcement available, then hidden assertion queries check your FK graph, its \`ON DELETE\`
policies, and that referential integrity actually held.`,
  },
  apply: scriptExercise({
    id: "sql-l3-foreign-keys-apply",
    prompt: `Create \`customers\` (PK \`customer_id\`, plus \`email\`) and \`orders\` (\`order_id\` PK,
\`customer_id\` NOT NULL, \`total_cents\`) with an FK \`orders.customer_id → customers.customer_id\` using
\`ON DELETE RESTRICT\`. **Turn FK enforcement on** as the first line. Insert **one** customer and **one**
valid order for that customer. Then attempt an order for a **non-existent** customer (\`customer_id = 999\`)
with a **guarded insert** — \`INSERT ... SELECT ... WHERE EXISTS (the parent)\` — so the orphan cleanly
does **not** land (a raw \`INSERT\`, even \`INSERT OR IGNORE\`, would raise an FK error and abort).`,
    starterCode: `PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;

-- CREATE customers (customer_id PK, email) ...
-- CREATE orders with FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT ...
-- INSERT one customer, then one valid order for that customer ...
-- Guarded orphan attempt: INSERT ... SELECT 2, 999, 100 WHERE EXISTS (customer 999) -> no-op ...`,
    hints: [
      "First line: `PRAGMA foreign_keys = ON;` — without it your `REFERENCES` clause enforces nothing.",
      "Declare the FK inside `orders` with `FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT`.",
      "Insert the parent customer *before* the order, or even the valid order fails the FK check.",
      "For the orphan, use a guarded `INSERT INTO orders (...) SELECT 2, 999, 100 WHERE EXISTS (SELECT 1 FROM customers WHERE customer_id = 999)` — it inserts nothing because customer 999 is absent.",
    ],
    referenceSolution: `PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    email       TEXT
);
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    total_cents INTEGER,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT
);

INSERT INTO customers (customer_id, email) VALUES (1, 'ada@example.com');
INSERT INTO orders (order_id, customer_id, total_cents) VALUES (1, 1, 2499);

-- Guarded orphan attempt: fires only if customer 999 exists (it doesn't), so nothing lands.
INSERT INTO orders (order_id, customer_id, total_cents)
SELECT 2, 999, 100
WHERE EXISTS (SELECT 1 FROM customers WHERE customer_id = 999);`,
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "orders declares an FK on customer_id to customers",
        isHidden: true,
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_foreign_key_list('orders')
          WHERE "table" = 'customers' AND "from" = 'customer_id'
        ) <> 1`,
      },
      {
        suite: "policy",
        name: "the orders FK uses ON DELETE RESTRICT",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((
          SELECT on_delete FROM pragma_foreign_key_list('orders')
          WHERE "table" = 'customers' AND "from" = 'customer_id'
        ), '~') <> 'RESTRICT'`,
      },
      {
        suite: "rows",
        name: "exactly one order landed (the valid one)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM orders) <> 1`,
      },
      {
        suite: "integrity",
        name: "the orphan order for customer 999 did not land",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM orders WHERE customer_id = 999) <> 0`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-foreign-keys-practice",
    prompt: `Wire a **three-table order schema** — \`customers\`, \`orders\`, \`order_items\` — plus a
\`products\` table, with a **defensible \`ON DELETE\` policy per relationship**:
- \`orders.customer_id → customers\`: \`ON DELETE RESTRICT\` (never lose orders because a customer was deleted).
- \`order_items.order_id → orders\`: \`ON DELETE CASCADE\` (line items are meaningless without their order).
- \`order_items.product_id → products\`: \`ON DELETE RESTRICT\`.

Turn FK enforcement on. Insert a valid chain (one customer → two products → one order → **two** items
referencing real products). Then prove **two** enforcements: (a) an \`order_items\` row for a
**non-existent** order (\`order_id = 999\`) does not land — use a **guarded insert** (\`INSERT ... SELECT
... WHERE EXISTS (the order)\`), since \`INSERT OR IGNORE\` will *not* skip an FK error; and (b)
\`DELETE FROM orders WHERE order_id = 1;\` **cascades** to remove that order's items.`,
    starterCode: `PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

-- CREATE customers, products, orders, order_items ...
--   orders.customer_id     -> customers  ON DELETE RESTRICT
--   order_items.order_id   -> orders     ON DELETE CASCADE
--   order_items.product_id -> products   ON DELETE RESTRICT
-- INSERT the valid chain: one customer, two products, one order, two order_items ...
-- Guarded orphan: INSERT ... SELECT 102, 999, ... WHERE EXISTS (order 999)  -> no-op ...
-- DELETE FROM orders WHERE order_id = 1;  -- let the cascade clear its items ...`,
    hints: [
      "`PRAGMA foreign_keys = ON;` first — the cascade won't fire without it.",
      "Insert in dependency order: `products` and `customers`, then `orders`, then `order_items`.",
      "Give the `order_items.order_id` FK `ON DELETE CASCADE`; give the other two `ON DELETE RESTRICT`.",
      "Guard the orphan item with `... SELECT 102, 999, 10, 1 WHERE EXISTS (SELECT 1 FROM orders WHERE order_id = 999)`, then run `DELETE FROM orders WHERE order_id = 1;` and let the cascade clear its items before the assertions read.",
    ],
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "orders has an FK to customers",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_foreign_key_list('orders') WHERE "table" = 'customers'
        ) <> 1`,
      },
      {
        suite: "schema",
        name: "order_items has an FK to orders",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_foreign_key_list('order_items') WHERE "table" = 'orders'
        ) <> 1`,
      },
      {
        suite: "schema",
        name: "order_items has an FK to products",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_foreign_key_list('order_items') WHERE "table" = 'products'
        ) <> 1`,
      },
      {
        suite: "policy",
        name: "the order_items to orders FK uses ON DELETE CASCADE",
        isHidden: true,
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_foreign_key_list('order_items')
          WHERE "table" = 'orders' AND on_delete = 'CASCADE'
        ) <> 1`,
      },
      {
        suite: "integrity",
        name: "the orphan item for order 999 did not land",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_items WHERE order_id = 999) <> 0`,
      },
      {
        suite: "integrity",
        name: "deleting order 1 cascaded its items away",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_items WHERE order_id = 1) <> 0`,
      },
    ],
  }),
}

const constraints: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-constraints",
  title: "UNIQUE, NOT NULL, and CHECK",
  summary: "Push data-quality rules into the schema so bad rows can't land.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["NOT NULL", "UNIQUE", "CHECK", "composite unique", "column invariants"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Constraints are the cheapest data-quality layer you have

A \`CHECK\` or \`NOT NULL\` is enforced by the database *before* any dbt test, alert, or dashboard notices
a problem — the bad row simply never lands. Three workhorses:

- \`NOT NULL\` — the column must always have a value.
- \`UNIQUE\` — no two rows share this value (or this *combination* of values, for a **composite unique**).
- \`CHECK (condition)\` — every row must satisfy a boolean condition: an enum whitelist, a non-negative
  price, a valid date order.

### Worked example

\`\`\`sql
CREATE TABLE fact_order (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled')),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    order_date  TEXT,
    ship_date   TEXT,
    UNIQUE (customer_id, order_date),                 -- composite: one order per customer per day
    CHECK (ship_date IS NULL OR ship_date >= order_date)
);
\`\`\`

Any insert with \`status = 'refunded'\`, a negative total, or a ship date before the order date is
**rejected outright**.

**Anatomy of a column constraint:**

\`\`\`
status TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled'))
        │      │          │        │
      type  required   invariant  the whitelist the value must be in
\`\`\`

Column-level constraints sit on one column; **table-level** constraints (\`UNIQUE (a, b)\`, cross-column
\`CHECK\`) go after the column list and can reference several columns.

> **In the warehouse this differs.** SQLite enforces \`CHECK\`, \`NOT NULL\`, and \`UNIQUE\` reliably. Big
> analytical warehouses are looser: BigQuery has **no** \`CHECK\`/\`UNIQUE\` enforcement, and Snowflake
> enforces \`NOT NULL\` but treats \`UNIQUE\`/\`CHECK\` as *informational*. So in production these invariants
> are re-expressed as **dbt / DQ tests** (you'll build those in L4). Author them in your DDL anyway —
> they document intent and they *are* enforced on strict engines like Postgres.

### Keep each CHECK to one clear invariant

A giant compound \`CHECK\` is unreadable and hard to debug when it fires. Common trap: a \`CHECK\`
**passes** when its condition evaluates to \`NULL\` (three-valued logic) — that's why the ship-date rule
is written \`ship_date IS NULL OR ship_date >= order_date\`, so a *missing* ship date is allowed but a
*wrong* one isn't.

**Recap:** constraints are the cheapest DQ layer — use \`NOT NULL\` for required fields, \`UNIQUE\` (incl.
composite) for identity/dedup, and \`CHECK\` for enums and invariants. Author them even where the
warehouse won't enforce them.

**Execution mode:** you write a multi-statement DDL+DML script. It runs against a fresh in-memory
SQLite DB, then hidden assertion queries check the constraints and row counts. Use \`INSERT OR IGNORE\`
for rows you *expect* to be rejected — a constraint violation is then silently skipped instead of
aborting your whole script.`,
  },
  apply: scriptExercise({
    id: "sql-l3-constraints-apply",
    prompt: `Create an \`orders\` table whose schema *refuses* bad data. It needs:

- \`order_id INTEGER PRIMARY KEY\`,
- \`status TEXT NOT NULL\` constrained by a \`CHECK\` to the enum \`('pending','paid','shipped','cancelled')\`,
- \`total_cents INTEGER NOT NULL\`.

Insert **one valid row**. Then, using \`INSERT OR IGNORE\`, attempt a row with \`status = 'refunded'\` and
prove it never lands — the table should end with exactly one row.`,
    starterCode: `DROP TABLE IF EXISTS orders;

-- CREATE TABLE orders ( ... ) with a CHECK on status and NOT NULL columns ...
-- INSERT one valid row (a whitelisted status) ...
-- INSERT OR IGNORE a row with status = 'refunded' — it should be rejected ...`,
    hints: [
      "`status TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled'))` puts the enum right in the column definition.",
      "Insert the valid row with a whitelisted status like `'paid'`.",
      "Use `INSERT OR IGNORE` for the `'refunded'` attempt so the CHECK violation is skipped and the script survives to the assertions.",
    ],
    referenceSolution: `DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    status      TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled')),
    total_cents INTEGER NOT NULL
);

INSERT INTO orders (order_id, status, total_cents) VALUES (1, 'paid', 2499);
INSERT OR IGNORE INTO orders (order_id, status, total_cents) VALUES (2, 'refunded', 100);`,
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "the table ends with exactly one row",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM orders) <> 1`,
      },
      {
        suite: "enum",
        name: "the 'refunded' row was rejected by the CHECK",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM orders WHERE status = 'refunded') <> 0`,
      },
      {
        suite: "schema",
        name: "a CHECK constraint on status is declared in the DDL",
        isHidden: true,
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM sqlite_master
          WHERE type = 'table' AND name = 'orders' AND sql LIKE '%CHECK%status%'
        ) < 1`,
      },
      {
        suite: "schema",
        name: "status and total_cents are both NOT NULL",
        isHidden: true,
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_table_info('orders')
          WHERE name IN ('status','total_cents') AND "notnull" = 1
        ) <> 2`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-constraints-practice",
    prompt: `Harden a \`dim_product\` dimension so three data-quality rules are enforced **by the schema
itself**:

1. a **composite** \`UNIQUE (supplier_id, sku)\` — the same SKU may exist under *different* suppliers,
   but never twice under one;
2. a **non-negative** price: \`CHECK (unit_price_cents >= 0)\`;
3. an **enum**: \`CHECK (status IN ('active','discontinued'))\`.

Insert **one fully valid row**. Then, with \`INSERT OR IGNORE\`, fire one violation of *each* rule — a
duplicate \`(supplier_id, sku)\`, a negative price, and a bad status — and prove the table still holds
exactly one row.`,
    starterCode: `DROP TABLE IF EXISTS dim_product;

-- CREATE TABLE dim_product ( ... )
--   with a composite UNIQUE (supplier_id, sku),
--   a CHECK (unit_price_cents >= 0),
--   and a CHECK (status IN ('active','discontinued')) ...
-- INSERT one fully valid row ...
-- INSERT OR IGNORE one duplicate (supplier_id, sku), one negative price, one bad status ...`,
    hints: [
      "Put the composite unique as a table-level constraint after the columns: `UNIQUE (supplier_id, sku)`.",
      "Two column-level checks: `CHECK (unit_price_cents >= 0)` and `CHECK (status IN ('active','discontinued'))`.",
      "Insert the good row first — a whitelisted status, a non-negative price, and a unique supplier+sku.",
      "Fire all three bad rows with `INSERT OR IGNORE`; each is silently skipped, leaving exactly one row.",
    ],
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "exactly the one valid row survived all three bad inserts",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_product) <> 1`,
      },
      {
        suite: "keys",
        name: "a UNIQUE constraint is declared on dim_product",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_index_list('dim_product') WHERE "unique" = 1
        ) < 1`,
      },
      {
        suite: "schema",
        name: "a non-negative CHECK on unit_price_cents is declared",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM sqlite_master
          WHERE name = 'dim_product' AND sql LIKE '%unit_price_cents%>=%0%'
        ) < 1`,
      },
      {
        suite: "schema",
        name: "an enum CHECK on status is declared",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM sqlite_master
          WHERE name = 'dim_product' AND sql LIKE '%status%IN%active%'
        ) < 1`,
      },
      {
        suite: "keys",
        name: "the UNIQUE is composite over exactly (supplier_id, sku)",
        isHidden: true,
        sql: `SELECT 1 WHERE NOT EXISTS (
          SELECT 1 FROM pragma_index_list('dim_product') il
          WHERE il."unique" = 1
            AND (SELECT COUNT(*) FROM pragma_index_info(il.name)) = 2
            AND (SELECT COUNT(*) FROM pragma_index_info(il.name) WHERE name IN ('supplier_id','sku')) = 2
        )`,
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
    {
      id: "sql-l3-keys",
      title: "Module 3.2 — Keys and Constraints",
      description:
        "Primary and foreign keys, UNIQUE / NOT NULL / CHECK — the rules the database enforces so bad rows can never land.",
      lessons: [primaryKeys, foreignKeys, constraints],
    },
  ],
}

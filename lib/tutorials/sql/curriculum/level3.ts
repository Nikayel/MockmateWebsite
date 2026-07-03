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

const normalize1nf: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-normalize-1nf",
  title: "First Normal Form: Atomic Values",
  summary: "Eliminate repeating groups and multi-valued cells.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["1NF", "atomic columns", "repeating-group removal", "composite key introduction"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## First Normal Form: atomic values

**First Normal Form (1NF)** demands two things: **one value per cell** (atomic — no comma-packed
lists) and **one row per fact**. A spreadsheet export that crams \`"mouse:2, keyboard:1"\` into a single
\`items\` column violates 1NF, and that single violation breaks *every* downstream join, aggregate, and
filter — you can't \`SUM\` a price you can't isolate, or join on a product buried inside a string.

### The violation and the fix

Raw — a repeating group packed into one cell:

| order_id | items |
|---|---|
| 1 | \`mouse:2, keyboard:1\` |
| 2 | \`mouse:1\` |

1NF form — one row per line item, atomic columns, and a **composite key** \`(order_id, product)\`
because neither column alone is unique:

| order_id | product | qty |
|---|---|---|
| 1 | mouse | 2 |
| 1 | keyboard | 1 |
| 2 | mouse | 1 |

**Anatomy of the change:** the repeating group inside one cell becomes multiple *rows*; the packed
string becomes separate *columns* (\`product\`, \`qty\`); and the identity of a row is now the
**combination** \`(order_id, product)\`.

> **In the warehouse this differs — not really, but the tools do.** 1NF is a universal relational
> principle. The mechanics of *unpacking* differ: SQLite has no array type, so packed data is \`TEXT\`
> you split with string functions or a recursive CTE (Level 4). Postgres has real arrays and
> \`unnest()\`; BigQuery/Snowflake have \`ARRAY\`/\`STRUCT\` and are often kept *semi-structured* on
> purpose. But the moment you need to join or aggregate, you flatten to 1NF.

### Keep it readable — a common pitfall

Don't "solve" a multi-valued attribute by adding \`item1, item2, item3\` columns — that's still a
repeating group and it caps you at three items. The fix is always *more rows, not more columns*. And
once you unpack, a single column is no longer unique, so declare the **composite key**.

**Recap:** 1NF means atomic cells and one row per fact; unpack repeating groups into rows (not extra
columns) and give the finer grain a composite key.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB,
then hidden assertion queries check the unpacked grain, values, and keys.`,
  },
  apply: scriptExercise({
    id: "sql-l3-normalize-1nf-apply",
    prompt: `The \`raw_order\` table stores **two line-item slots per order** in packed columns
(\`product_a\`/\`qty_a\` and \`product_b\`/\`qty_b\`). Unpack it into a 1NF \`order_item\` table with columns
\`(order_id, product, qty)\` and a composite primary key \`(order_id, product)\` — **one row per line
item**. Use two \`INSERT … SELECT\` statements (one per slot); skip the empty second slot with a
\`WHERE product_b IS NOT NULL\`. You're given exactly two slots to keep the SQL simple.`,
    starterCode: `DROP TABLE IF EXISTS order_item;

-- CREATE TABLE order_item ( ... , PRIMARY KEY (order_id, product) );

-- INSERT … SELECT from the first slot (product_a, qty_a) for every order ...

-- INSERT … SELECT from the second slot (product_b, qty_b), skipping empty slots ...`,
    hints: [
      "First `INSERT … SELECT order_id, product_a, qty_a FROM raw_order` for every order.",
      "Second `INSERT … SELECT order_id, product_b, qty_b FROM raw_order WHERE product_b IS NOT NULL` — the `WHERE` skips the empty slot.",
      "Target columns are `(order_id, product, qty)`; declare `PRIMARY KEY (order_id, product)` so the grain is enforced.",
    ],
    referenceSolution: `DROP TABLE IF EXISTS order_item;

CREATE TABLE order_item (
    order_id INTEGER,
    product  TEXT,
    qty      INTEGER,
    PRIMARY KEY (order_id, product)
);

INSERT INTO order_item (order_id, product, qty)
SELECT order_id, product_a, qty_a FROM raw_order WHERE product_a IS NOT NULL;

INSERT INTO order_item (order_id, product, qty)
SELECT order_id, product_b, qty_b FROM raw_order WHERE product_b IS NOT NULL;`,
    seedSql: `DROP TABLE IF EXISTS raw_order;
CREATE TABLE raw_order (
    order_id INTEGER, product_a TEXT, qty_a INTEGER, product_b TEXT, qty_b INTEGER
);
INSERT INTO raw_order VALUES
    (1, 'mouse', 2, 'keyboard', 1),
    (2, 'mouse', 1, NULL, NULL);   -- second slot empty`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "order_item has the columns order_id, product, qty",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_table_info('order_item')
          WHERE name IN ('order_id','product','qty')
        ) <> 3`,
      },
      {
        suite: "rows",
        name: "exactly 3 line-item rows exist (order 2 has only one item)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_item) <> 3`,
      },
      {
        suite: "quality",
        name: "no NULL product landed (the empty slot was skipped)",
        sql: `SELECT order_id FROM order_item WHERE product IS NULL`,
      },
      {
        suite: "values",
        name: "order 1 keyboard has qty 1",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT qty FROM order_item WHERE order_id = 1 AND product = 'keyboard'), -1) <> 1`,
      },
      {
        suite: "keys",
        name: "order_item is keyed on the composite (order_id, product)",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('order_item') WHERE pk > 0) <> 2`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-normalize-1nf-practice",
    prompt: `A "sales spreadsheet" export packs an entire order's items into **one comma-delimited
string** like \`'mouse:2:2499,keyboard:1:4999'\` — each token is \`product:qty:price_cents\`. Unpack
\`raw_sales\` into a 1NF \`order_line\` table \`(order_id, product, qty, unit_price_cents)\` with a
composite primary key \`(order_id, product)\`. Orders have **up to three** items, and \`qty\` /
\`unit_price_cents\` must be stored as \`INTEGER\`.

SQLite has no split function, so the clean route is a \`WITH RECURSIVE\` that peels one token off the
front of the string at a time, then splits each token on \`:\`. (A position-based \`substr\`/\`instr\`
extraction per slot also works.)`,
    starterCode: `DROP TABLE IF EXISTS order_line;

-- CREATE TABLE order_line ( ... , PRIMARY KEY (order_id, product) );

-- Split raw_sales.items into one token per line item (a WITH RECURSIVE peels one token
-- off the front at a time), then split each token on ':' into product / qty / price,
-- CAST qty and price to INTEGER, and INSERT the rows.`,
    hints: [
      "Declare `PRIMARY KEY (order_id, product)` so the grain is enforced.",
      "One clean route: a `WITH RECURSIVE` that peels one `product:qty:price` token off the front of `items` at a time until the string is empty (append a trailing `,` in the anchor so every token ends with a delimiter).",
      "Split each token on `:` with `instr`/`substr`: product before the first colon, qty between the colons, price after the last.",
      "`CAST` qty and price to `INTEGER` — a purely `TEXT` price fails the numeric assertion downstream.",
    ],
    seedSql: `DROP TABLE IF EXISTS raw_sales;
CREATE TABLE raw_sales (order_id INTEGER, items TEXT);
INSERT INTO raw_sales VALUES
    (1, 'mouse:2:2499,keyboard:1:4999'),
    (2, 'monitor:1:19999'),
    (3, 'cable:3:599,hub:1:2999,mat:2:1499');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "exactly 6 line items were unpacked (2 + 1 + 3)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_line) <> 6`,
      },
      {
        suite: "keys",
        name: "order_line is keyed on the composite (order_id, product)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('order_line') WHERE pk > 0) <> 2`,
      },
      {
        suite: "quality",
        name: "every row has a non-empty product",
        sql: `SELECT order_id FROM order_line WHERE product IS NULL OR product = ''`,
      },
      {
        suite: "values",
        name: "order 1 keyboard has unit_price_cents 4999",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT unit_price_cents FROM order_line WHERE order_id = 1 AND product = 'keyboard'), -1) <> 4999`,
      },
      {
        suite: "values",
        name: "order 3 mat has qty 2",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT qty FROM order_line WHERE order_id = 3 AND product = 'mat'), -1) <> 2`,
      },
    ],
  }),
}

const normalize2nf3nf: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-normalize-2nf-3nf",
  title: "Second and Third Normal Form",
  summary: "Remove partial and transitive dependencies so each fact lives once.",
  estimatedMinutes: 35,
  difficulty: "hard",
  skills: ["2NF (no partial dependency)", "3NF (no transitive dependency)", "table decomposition"],
  teach: {
    estimatedMinutes: 10,
    markdown: `## 2NF and 3NF — "the key, the whole key, and nothing but the key"

Once data is atomic (1NF), redundancy can still hide in *dependencies*. The memorable rule for a
well-normalized table: **every non-key column depends on the key, the whole key, and nothing but the
key.**

### 2NF — the whole key

No column may depend on only *part* of a composite key. In an
\`order_item(order_id, product_id, qty, product_name)\` table keyed on \`(order_id, product_id)\`,
\`product_name\` depends only on \`product_id\` — half the key. That's a **partial dependency**: it
repeats \`product_name\` on every line the product appears in. Fix: move \`product_name\` to a
\`products\` table keyed on \`product_id\`.

### 3NF — nothing but the key

No non-key column may depend on *another non-key column*. In
\`orders(order_id, customer_id, customer_email)\`, \`customer_email\` depends on \`customer_id\`, not on
\`order_id\`. That's a **transitive dependency** (key → customer_id → email). Fix: move
\`customer_email\` to a \`customers\` table keyed on \`customer_id\`.

### Worked 2NF/3NF split

Start with one flat table:

\`\`\`
order_line(order_id, product_id, qty, product_name, customer_id, customer_email)
\`\`\`

Decompose:

\`\`\`sql
-- 2NF: product attributes depend only on product_id
CREATE TABLE products  (product_id INTEGER PRIMARY KEY, product_name TEXT);
-- 3NF: customer attributes depend only on customer_id (transitive via orders)
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, email TEXT);
CREATE TABLE orders    (order_id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers);
CREATE TABLE order_items (
    order_id   INTEGER REFERENCES orders,
    product_id INTEGER REFERENCES products,
    qty        INTEGER,
    PRIMARY KEY (order_id, product_id)
);
\`\`\`

Now \`product_name\` and \`email\` each live in exactly one place. Change an email once; every order
reflects it. No update anomalies.

> **In the warehouse this differs — by intent.** 3NF is the gold standard for OLTP systems (safe
> writes, no anomalies). Analytical warehouses often *stop short* of full normalization or
> deliberately denormalize (next lesson) because joins are the expensive part of a read. So DEs
> normalize the **source-of-truth / staging** layers and denormalize the **mart** layer. Same
> engineer, two different targets.

**Common pitfall — over- or under-splitting.** Under: leaving \`customer_email\` on \`orders\` (a real
3NF violation that causes update anomalies). Over: decomposing attributes that genuinely *do* depend
only on the key into needless tables. Test each column: "does this depend on the whole key and nothing
but the key?" If no, split; if yes, leave it.

**Recap.** 2NF removes partial dependencies (on part of a composite key); 3NF removes transitive
dependencies (on another non-key column). Decompose so every fact is stored exactly once — the OLTP
ideal you'll later denormalize for analytics.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB,
then hidden assertion queries check that each fact now lives in exactly one table.`,
  },
  apply: scriptExercise({
    id: "sql-l3-normalize-2nf-3nf-apply",
    prompt: `The \`flat_line\` table repeats \`product_name\` on every row — a **2NF violation**, because
\`product_name\` depends only on \`product_id\`, which is just *half* of the natural
\`(order_id, product_id)\` grain. Normalize it:

- Extract product attributes into a \`products\` table keyed on \`product_id\`, **deduplicated** — use
\`INSERT … SELECT DISTINCT\`.
- Rebuild \`order_items\` with only \`(order_id, product_id, qty)\` and a composite primary key, then
populate it from \`flat_line\`.

After this, \`product_name\` is stored exactly once per product, not once per order line.`,
    starterCode: `DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS order_items;

-- 1. CREATE products (product_id PRIMARY KEY, product_name) ...
-- 2. Populate it with DISTINCT product rows from flat_line ...
-- 3. CREATE order_items (order_id, product_id, qty) with a composite PRIMARY KEY ...
-- 4. Populate order_items from flat_line (no product_name column) ...`,
    hints: [
      "`INSERT INTO products (product_id, product_name) SELECT DISTINCT product_id, product_name FROM flat_line;` — DISTINCT collapses the repeats.",
      "`order_items` gets `(order_id, product_id, qty)` only — no `product_name`. Declare `PRIMARY KEY (order_id, product_id)`.",
      "Populate order_items with `SELECT order_id, product_id, qty FROM flat_line;` — the same three rows, minus the product name.",
    ],
    referenceSolution: `DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS order_items;

CREATE TABLE products (product_id INTEGER PRIMARY KEY, product_name TEXT);
INSERT INTO products (product_id, product_name)
SELECT DISTINCT product_id, product_name FROM flat_line;

CREATE TABLE order_items (
    order_id   INTEGER,
    product_id INTEGER,
    qty        INTEGER,
    PRIMARY KEY (order_id, product_id)
);
INSERT INTO order_items (order_id, product_id, qty)
SELECT order_id, product_id, qty FROM flat_line;`,
    seedSql: `DROP TABLE IF EXISTS flat_line;
CREATE TABLE flat_line (order_id INTEGER, product_id INTEGER, qty INTEGER, product_name TEXT);
INSERT INTO flat_line VALUES
    (1, 100, 2, 'Mouse'),
    (1, 101, 1, 'Keyboard'),
    (2, 100, 1, 'Mouse');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "products",
        name: "products holds one deduplicated row per product (2 rows)",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM products) <> 2`,
      },
      {
        suite: "products",
        name: "product 100 resolves to its name 'Mouse'",
        sql: `SELECT 1 WHERE COALESCE((SELECT product_name FROM products WHERE product_id = 100), '~') <> 'Mouse'`,
      },
      {
        suite: "grain",
        name: "order_items keeps every original line (3 rows)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_items) <> 3`,
      },
      {
        suite: "schema",
        name: "product_name no longer lives on order_items",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('order_items') WHERE name = 'product_name') <> 0`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-normalize-2nf-3nf-practice",
    prompt: `Fully normalize the single flat \`flat_sales\` table to **3NF**. It repeats customer *and*
product attributes on every line. Produce four tables, each populated with \`INSERT … SELECT\`:

- \`customers\` keyed on \`customer_id\`, **deduplicated by email** — the same person shows up under
different \`customer_id\`s in the raw feed, so keep one row per distinct email at the **lowest**
\`customer_id\`.
- \`products\` keyed on \`product_id\`, deduplicated.
- \`orders\` keyed on \`order_id\` — one row per order, carrying \`customer_id\` (not customer
attributes).
- \`order_items\` keyed on \`(order_id, product_id)\` — carrying \`qty\` (not product attributes).`,
    starterCode: `DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_items;

-- customers:   one row per DISTINCT email, keeping the lowest customer_id ...
-- products:    one row per DISTINCT product_id ...
-- orders:      one row per order_id (carry customer_id, no customer attributes) ...
-- order_items: (order_id, product_id, qty) at line grain, no product attributes ...`,
    hints: [
      "Dedup customers with a grouped insert: `SELECT MIN(customer_id), email FROM flat_sales GROUP BY email` — one row per email, lowest id wins.",
      "`orders` is `SELECT DISTINCT order_id, customer_id FROM flat_sales`. Order 3's customer_id is 12, which you dropped in favor of 10 — the assertions only check that orders has 3 rows and carries no attributes, so keeping the raw customer_id is acceptable here (a real SCD remap comes in L4).",
      "`products` = `SELECT DISTINCT product_id, product_name FROM flat_sales`.",
      "`order_items` = `SELECT order_id, product_id, qty FROM flat_sales` — atomic grain, no descriptive columns.",
    ],
    seedSql: `DROP TABLE IF EXISTS flat_sales;
CREATE TABLE flat_sales (
    order_id INTEGER, customer_id INTEGER, email TEXT,
    product_id INTEGER, product_name TEXT, qty INTEGER
);
INSERT INTO flat_sales VALUES
    (1, 10, 'ada@x.com',   100, 'Mouse',    2),
    (1, 10, 'ada@x.com',   101, 'Keyboard', 1),
    (2, 11, 'grace@x.com', 100, 'Mouse',    1),
    (3, 12, 'ada@x.com',   100, 'Mouse',    3);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "customers",
        name: "customers is deduplicated by email (2 rows)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM customers) <> 2`,
      },
      {
        suite: "customers",
        name: "ada@x.com appears exactly once",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM customers WHERE email = 'ada@x.com') <> 1`,
      },
      {
        suite: "customers",
        name: "the surviving ada row keeps the lowest customer_id (10)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT MIN(customer_id) FROM customers WHERE email = 'ada@x.com'), -1) <> 10`,
      },
      {
        suite: "products",
        name: "products is deduplicated (2 rows)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM products) <> 2`,
      },
      {
        suite: "orders",
        name: "orders has one row per order (3 rows)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM orders) <> 3`,
      },
      {
        suite: "grain",
        name: "order_items sits at line grain (4 rows)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_items) <> 4`,
      },
      {
        suite: "schema",
        name: "order_items carries no descriptive columns",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('order_items') WHERE name IN ('product_name','email')) <> 0`,
      },
      {
        suite: "schema",
        name: "orders carries no leaked attributes",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('orders') WHERE name IN ('email','product_name')) <> 0`,
      },
    ],
  }),
}

const denormalization: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-denormalization",
  title: "Denormalization Trade-offs",
  summary: "Know when to flatten a normalized schema for analytics speed.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["OLTP vs OLAP", "denormalization", "read vs write trade-off", "join cost"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## Normalization is a trade-off, not a virtue

Normalization is not a moral good — it's a **trade-off**. It optimizes for *safe writes*: each fact
stored once means no update anomalies. But it pays for that with *joins on every read*, and joins are
the expensive part of analytics. The two worlds:

- **OLTP** (transactional apps): many small writes, correctness-critical → **normalize** (3NF).
- **OLAP** (analytics/BI): few huge reads, join-heavy → **denormalize** (flatten so a report is one
  scan, not a six-table join).

**Denormalization** deliberately reintroduces redundancy — copying \`product_name\`, \`category\`,
\`customer_country\` *into* the fact/reporting table — so the read needs no joins. The cost is that if
\`product_name\` changes you must update it in many places; in analytics that's fine because these
tables are *rebuilt* by the loader, not hand-edited.

**Worked example.** From the 3NF schema, build one wide reporting table:

\`\`\`sql
CREATE TABLE rpt_sales AS
SELECT
    oi.order_id, oi.product_id, oi.qty,
    p.product_name, p.category,          -- copied from products
    o.order_date,
    c.email, c.country_code              -- copied from customers
FROM order_items oi
JOIN orders    o ON o.order_id   = oi.order_id
JOIN products  p ON p.product_id = oi.product_id
JOIN customers c ON c.customer_id = o.customer_id;
\`\`\`

A BI query against \`rpt_sales\` — "revenue by category by country" — now touches **one** table. The
four-way join happened *once*, at build time, not on every dashboard load. \`CREATE TABLE … AS SELECT\`
(CTAS) runs a query and stores its result set as a brand-new table.

> **In the warehouse this differs — this is the warehouse's whole point.** Columnar warehouses
> (Snowflake/BigQuery/Redshift) are built to scan wide denormalized tables fast, and storage is cheap,
> so the redundancy barely costs anything. \`CREATE TABLE … AS SELECT\` (CTAS) is the standard build
> verb there too. The star schema (Module 3.5) is the *disciplined* middle ground between full 3NF and
> a fully-flat "one big table."

**Keep it readable / common pitfall.** Denormalize the *mart*, never the *source of truth*. If you
denormalize your write-path OLTP tables you'll corrupt data via update anomalies. Pitfall:
denormalizing too early or everything — keep normalized staging/intermediate layers and denormalize
only the final reporting layer, rebuilt each run.

**Recap:** normalization favors safe writes, denormalization favors fast reads; flatten the
analytics/mart layer (redundancy is fine because it's rebuilt) while keeping the source-of-truth
normalized.

**Execution mode:** you write a multi-statement script that builds a denormalized table with
\`CREATE TABLE … AS SELECT\`. It runs against a fresh in-memory SQLite DB, then hidden assertion queries
check row counts, copied-in columns, and computed revenue.`,
  },
  apply: scriptExercise({
    id: "sql-l3-denormalization-apply",
    prompt: `Given a normalized 3-table schema (\`orders\`, \`products\`, \`order_items\`), build one wide
denormalized reporting table \`rpt_line\` via \`CREATE TABLE … AS SELECT\` that carries \`order_id\`,
\`product_id\`, \`qty\`, \`product_name\`, \`category\`, and \`line_revenue_cents\` (= \`qty * unit_price_cents\`)
— so a report needs **no joins** to read it. Lead your script with \`DROP TABLE IF EXISTS rpt_line;\` so
it re-runs cleanly.`,
    starterCode: `-- Build a wide, join-free reporting table from the normalized source.
DROP TABLE IF EXISTS rpt_line;

-- CREATE TABLE rpt_line AS
-- SELECT oi.order_id, oi.product_id, oi.qty,
--        p.product_name, p.category,
--        oi.qty * p.unit_price_cents AS line_revenue_cents
-- FROM order_items oi JOIN products p ON ... ;`,
    hints: [
      "`CREATE TABLE rpt_line AS SELECT … FROM order_items oi JOIN products p ON p.product_id = oi.product_id`.",
      "Compute revenue in the projection: `oi.qty * p.unit_price_cents AS line_revenue_cents`.",
      "Copy `p.product_name` and `p.category` into the SELECT list so no join is needed to read them later.",
    ],
    referenceSolution: `DROP TABLE IF EXISTS rpt_line;

CREATE TABLE rpt_line AS
SELECT
    oi.order_id, oi.product_id, oi.qty,
    p.product_name, p.category,
    oi.qty * p.unit_price_cents AS line_revenue_cents
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id;`,
    seedSql: `DROP TABLE IF EXISTS products; DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS order_items;
CREATE TABLE products (product_id INTEGER PRIMARY KEY, product_name TEXT, category TEXT, unit_price_cents INTEGER);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, order_date TEXT);
CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER);
INSERT INTO products VALUES (100,'Mouse','peripherals',2499),(101,'Monitor','displays',19999);
INSERT INTO orders VALUES (1,'2026-01-05'),(2,'2026-01-06');
INSERT INTO order_items VALUES (1,100,2),(1,101,1),(2,100,3);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "shape",
        name: "product_name is copied into rpt_line (no join needed to read it)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('rpt_line') WHERE name='product_name') <> 1`,
      },
      {
        suite: "rows",
        name: "rpt_line has one flattened row per order line (3)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM rpt_line) <> 3`,
      },
      {
        suite: "denormalize",
        name: "category was copied in from products ('displays' for product 101)",
        sql: `SELECT 1 WHERE COALESCE((SELECT category FROM rpt_line WHERE product_id=101), '~') <> 'displays'`,
      },
      {
        suite: "revenue",
        name: "line_revenue_cents = qty * unit_price_cents (2 * 2499 = 4998)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT line_revenue_cents FROM rpt_line WHERE order_id=1 AND product_id=100), -1) <> 4998`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-denormalization-practice",
    prompt: `From the 3NF schema (\`customers\`, \`products\`, \`orders\`, \`order_items\`), produce a flattened
"one big table" \`obt_sales\` carrying every column a revenue dashboard needs: \`order_id\`, \`order_date\`,
\`customer_id\`, \`country_code\`, \`product_id\`, \`product_name\`, \`category\`, \`qty\`, \`unit_price_cents\`,
\`line_revenue_cents\` (= \`qty * unit_price_cents\`). Then materialize a tiny one-row table \`obt_compare\`
with two constants that prove the flattening's value: \`joins_normalized\` = \`3\` (the joins a report
would otherwise need) and \`joins_flattened\` = \`0\`. Lead your script with \`DROP TABLE IF EXISTS\` for both
tables so it re-runs cleanly.`,
    starterCode: `-- Flatten the 3NF schema into one big table, then prove the join-count win.
DROP TABLE IF EXISTS obt_sales;
DROP TABLE IF EXISTS obt_compare;

-- CREATE TABLE obt_sales AS SELECT ...  (join all four source tables once) ...
-- CREATE TABLE obt_compare AS SELECT 3 AS joins_normalized, 0 AS joins_flattened;`,
    hints: [
      "Build `obt_sales` with a four-table `CREATE TABLE … AS SELECT` that joins order_items, orders, products, and customers once.",
      "`line_revenue_cents = oi.qty * p.unit_price_cents` in the SELECT list.",
      "For the comparison, materialize a tiny table: `CREATE TABLE obt_compare AS SELECT 3 AS joins_normalized, 0 AS joins_flattened;`.",
      "Confirm the whole point: the dashboard's `SUM(line_revenue_cents)` now runs over `obt_sales` alone, no joins.",
    ],
    seedSql: `DROP TABLE IF EXISTS customers; DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS order_items;
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, email TEXT, country_code TEXT);
CREATE TABLE products (product_id INTEGER PRIMARY KEY, product_name TEXT, category TEXT, unit_price_cents INTEGER);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT);
CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER, PRIMARY KEY(order_id,product_id));
INSERT INTO customers VALUES (10,'ada@x.com','GB'),(11,'grace@x.com','US');
INSERT INTO products VALUES (100,'Mouse','peripherals',2499),(101,'Monitor','displays',19999);
INSERT INTO orders VALUES (1,10,'2026-01-05'),(2,11,'2026-01-06');
INSERT INTO order_items VALUES (1,100,2),(1,101,1),(2,100,3);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "shape",
        name: "obt_sales carries all 10 flattened columns",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_table_info('obt_sales')
          WHERE name IN ('order_id','order_date','customer_id','country_code','product_id','product_name','category','qty','unit_price_cents','line_revenue_cents')
        ) <> 10`,
      },
      {
        suite: "rows",
        name: "obt_sales has one flattened row per order line (3)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM obt_sales) <> 3`,
      },
      {
        suite: "denormalize",
        name: "customer country_code was flattened in ('US' for order 2)",
        sql: `SELECT 1 WHERE COALESCE((SELECT country_code FROM obt_sales WHERE order_id=2), '~') <> 'US'`,
      },
      {
        suite: "proof",
        name: "obt_compare proves the join-count win (3 normalized -> 0 flattened)",
        sql: `SELECT 1 WHERE COALESCE((SELECT joins_normalized FROM obt_compare), -1) <> 3
          OR COALESCE((SELECT joins_flattened FROM obt_compare), -1) <> 0`,
      },
      {
        suite: "revenue",
        name: "line_revenue_cents = qty * unit_price_cents (1 * 19999 = 19999)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT line_revenue_cents FROM obt_sales WHERE order_id=1 AND product_id=101), -1) <> 19999`,
      },
      {
        suite: "revenue",
        name: "join-free aggregate over obt_sales alone sums to 32494",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT SUM(line_revenue_cents) FROM obt_sales), -1) <> 32494`,
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
    {
      id: "sql-l3-normalization",
      title: "Module 3.3 — Normalization",
      description:
        "From a flat export to 3NF and back: atomic values, removing redundancy, and deliberate denormalization for analytics.",
      lessons: [normalize1nf, normalize2nf3nf, denormalization],
    },
  ],
}

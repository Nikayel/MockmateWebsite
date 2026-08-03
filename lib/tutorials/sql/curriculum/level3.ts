import type { SqlLevel } from "@/lib/tutorials/types"
import { scriptExercise } from "./script-exercise"

/**
 * Level 3: Data Modeling & Schema Design (script/workspace grading).
 *
 * Workspace grading: the learner writes a multi-statement script (the single editable file); after it
 * runs, hidden **assertion queries** run. Each returns the OFFENDING rows, so zero rows = pass (the
 * dbt "count of violations = 0" convention). Then `checkIdempotency` re-runs the script to assert a
 * stable row count. The runner emits the byte-identical `__WORKSPACE_TEST_RESULTS__:` marker. The
 * `scriptExercise` builder (shared with Level 4) lives in `./script-exercise`.
 */

const ddlCreate: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-ddl-create",
  title: "CREATE TABLE and Data Types",
  summary: "Define a table's structure with the right column types and defaults.",
  estimatedMinutes: 25,
  difficulty: "easy",
  skills: ["CREATE TABLE", "column types", "DEFAULT", "DROP TABLE"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## A \`CREATE TABLE\` is a contract

Every table in a warehouse began as a \`CREATE TABLE\` someone wrote. That statement fixes the columns, their types, and the value the engine fills in for a column a load leaves unset. Downstream models, dashboards, and joins all inherit whatever shape you declare here, so a wrong type or a missing default leaks into a hundred queries. This lesson is only about *defining* that structure; the next one loads rows into it.

### Reading the declaration

Each line is \`column_name TYPE [DEFAULT expr]\`. The type documents intent. \`DEFAULT\` declares the value the engine substitutes for a column a later load does not supply, so partial rows still land complete. \`DROP TABLE IF EXISTS stg_customer;\` at the top of a script makes it re-runnable: a second run drops the old table instead of erroring on "table already exists."

### Worked example: defining a staging table

A staging table is just a typed landing zone you *define* before any data arrives. Here is the DDL for one:

\`\`\`sql
DROP TABLE IF EXISTS stg_customer;

CREATE TABLE stg_customer (
    customer_id   INTEGER,
    email         TEXT,
    country_code  TEXT,
    signup_date   TEXT,               -- ISO-8601 'YYYY-MM-DD'
    is_active     INTEGER DEFAULT 1,  -- 0/1 boolean-as-int
    loaded_at     TEXT DEFAULT (datetime('now'))
);
\`\`\`

Read it top to bottom: six columns, each with a declared type, and two of them carry a \`DEFAULT\`. \`is_active\` defaults to the integer \`1\`; \`loaded_at\` defaults to the timestamp at the moment a row is written.

Note the parentheses in \`DEFAULT (datetime('now'))\`. A function-call default must be wrapped in \`()\`; writing \`DEFAULT datetime('now')\` is a syntax error. Plain literals need no parentheses, and neither do the bare time keywords \`CURRENT_TIMESTAMP\`, \`CURRENT_DATE\`, and \`CURRENT_TIME\`: they look like function calls but the grammar accepts them without.

### Declaring defaults: literals, strings, and expressions

- Numbers: \`INTEGER DEFAULT 0\`, \`INTEGER DEFAULT 1\`.
- Strings: \`TEXT DEFAULT 'pending'\` (string-literal defaults go in single quotes).
- Expressions and functions: wrapped in parentheses, \`TEXT DEFAULT (datetime('now'))\`.

A declared default is a promise the schema keeps, so a load never has to remember to supply that column.

### Type affinity is advisory in SQLite

SQLite type affinity is only advisory: it will happily store the text \`'oops'\` in an \`INTEGER\` column, while Postgres, Snowflake, and BigQuery reject it. Declare the intended type anyway. Your DDL is documentation and should port to a strict engine unchanged.

**Interview nuance:** a \`DEFAULT\` is about *substitution*, not *presence*. Declaring \`is_active INTEGER DEFAULT 1\` supplies a value when a load omits the column, but it does not force the column to always hold one. Making a column mandatory is a separate \`NOT NULL\` constraint, which you will pair with \`DEFAULT\` in the constraints lesson later this level. Interviewers ask this to check that you treat substitution and required-ness as two independent guarantees.

**Execution mode:** you write a multi-statement DDL script. It runs against a fresh in-memory SQLite database, then hidden assertion queries inspect the schema you defined: the columns, their declared types, and their declared defaults.`,
  },
  apply: scriptExercise({
    id: "sql-l3-ddl-create-apply",
    prompt: `Write a DDL script that **defines** a \`dim_customer\` table (just the definition, no rows).
Declare these columns with the right types: \`customer_id\` INTEGER, \`email\` TEXT, \`country_code\` TEXT,
\`signup_date\` TEXT, an \`is_active\` INTEGER that **defaults to \`1\`**, and a \`loaded_at\` TEXT that
**defaults to the current timestamp**. Lead with \`DROP TABLE IF EXISTS dim_customer;\` so the script
re-runs cleanly.`,
    starterCode: `DROP TABLE IF EXISTS dim_customer;

-- CREATE TABLE dim_customer ( ... );
-- is_active should default to 1; loaded_at should default to the current timestamp.`,
    hints: [
      "Start with `DROP TABLE IF EXISTS dim_customer;` so the script re-runs cleanly.",
      "Put `DEFAULT 1` right after `is_active INTEGER`.",
      "For the timestamp default use `DEFAULT (datetime('now'))`. The parentheses are required.",
      "Types matter: `customer_id` and `is_active` are `INTEGER`, the rest `TEXT`.",
    ],
    referenceSolution: `DROP TABLE IF EXISTS dim_customer;

CREATE TABLE dim_customer (
    customer_id  INTEGER,
    email        TEXT,
    country_code TEXT,
    signup_date  TEXT,
    is_active    INTEGER DEFAULT 1,
    loaded_at    TEXT DEFAULT (datetime('now'))
);`,
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
        suite: "types",
        name: "declared types are correct (INTEGER keys, TEXT audit column)",
        isHidden: true,
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_table_info('dim_customer')
          WHERE (name = 'customer_id' AND type <> 'INTEGER')
             OR (name = 'is_active'   AND type <> 'INTEGER')
             OR (name = 'loaded_at'   AND type <> 'TEXT')
        ) <> 0`,
      },
      {
        suite: "defaults",
        name: "is_active is declared DEFAULT 1",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT dflt_value FROM pragma_table_info('dim_customer') WHERE name = 'is_active'), '') <> '1'`,
      },
      {
        suite: "defaults",
        name: "loaded_at declares a current-timestamp default",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT dflt_value FROM pragma_table_info('dim_customer') WHERE name = 'loaded_at'), '') NOT LIKE '%datetime%'
          AND COALESCE((SELECT dflt_value FROM pragma_table_info('dim_customer') WHERE name = 'loaded_at'), '') NOT LIKE '%CURRENT_TIMESTAMP%'`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-ddl-create-practice",
    prompt: `Define a **three-table staging schema** in DDL: \`stg_customer\`, \`stg_product\`, and
\`stg_order\` (definitions only, no rows). Give each table sensible column types and a
\`loaded_at TEXT DEFAULT (datetime('now'))\` audit column.

- \`stg_customer\`: \`customer_id INTEGER\`, \`email TEXT\`, \`country_code TEXT\`, \`signup_date TEXT\`, plus \`loaded_at\`.
- \`stg_product\`: \`product_id INTEGER\`, \`sku TEXT\`, \`name TEXT\`, \`category TEXT\`, \`unit_price_cents INTEGER DEFAULT 0\`, plus \`loaded_at\`.
- \`stg_order\`: \`order_id INTEGER\`, \`customer_id INTEGER\`, \`order_ts TEXT\`, \`status TEXT DEFAULT 'pending'\`, \`total_cents INTEGER DEFAULT 0\`, plus \`loaded_at\`.

Lead each table with \`DROP TABLE IF EXISTS …;\` so the script re-runs cleanly.`,
    starterCode: `DROP TABLE IF EXISTS stg_customer;
DROP TABLE IF EXISTS stg_product;
DROP TABLE IF EXISTS stg_order;

-- CREATE the three tables with their declared types, defaults, and loaded_at audit column ...`,
    hints: [
      "Lead every table with `DROP TABLE IF EXISTS …;` for a clean re-run.",
      "`unit_price_cents INTEGER DEFAULT 0` and `total_cents INTEGER DEFAULT 0`: money as integer cents.",
      "`status TEXT DEFAULT 'pending'`. String-literal defaults go in single quotes.",
      "Give every table `loaded_at TEXT DEFAULT (datetime('now'))`; the parentheses are required.",
    ],
    // No `referenceSolution`: Practice never renders a reveal control (only Apply and drills pass
    // `canRevealReference`), so an answer key here would ride unused in the client bundle for anyone
    // who opens devtools. Every other Practice in the curriculum already omits it; this one is the
    // exception that `curriculum-conventions.test.ts` now prevents from coming back.
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "each staging table has its required columns",
        isHidden: true,
        sql: `SELECT 1 WHERE
          (SELECT COUNT(*) FROM pragma_table_info('stg_customer') WHERE name IN ('customer_id','email','country_code','signup_date','loaded_at')) <> 5
          OR (SELECT COUNT(*) FROM pragma_table_info('stg_product') WHERE name IN ('product_id','sku','name','category','unit_price_cents','loaded_at')) <> 6
          OR (SELECT COUNT(*) FROM pragma_table_info('stg_order') WHERE name IN ('order_id','customer_id','order_ts','status','total_cents','loaded_at')) <> 6`,
      },
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
        name: "unit_price_cents / total_cents / status defaults are declared",
        isHidden: true,
        sql: `SELECT 1 WHERE
          COALESCE((SELECT dflt_value FROM pragma_table_info('stg_product') WHERE name='unit_price_cents'), '') <> '0'
          OR COALESCE((SELECT dflt_value FROM pragma_table_info('stg_order') WHERE name='total_cents'), '') <> '0'
          OR COALESCE((SELECT dflt_value FROM pragma_table_info('stg_order') WHERE name='status'), '') NOT LIKE '%pending%'`,
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
    markdown: `## Why loading is where data quality is won or lost

Every table starts empty. \`INSERT\` is how rows get in, and the form you choose decides whether your warehouse stays clean. \`INSERT ... VALUES\` writes literal rows you type out, which is how you seed small reference tables (status codes, country lists). \`INSERT ... SELECT\` writes rows read from another table and transforms them on the way in. That second form is the entire "T" in ELT: you read raw, cast, trim, and rename inside the \`SELECT\`, then land a clean result in a model table. One statement, no application code, no temp files, all inside the database.

### The mental model: positional mapping

Both forms fill a named target column list, and neither matches on column names. They map by **position**: the first output expression fills the first named column, the second fills the second, and so on. The \`SELECT\` column names do not have to match the target names, only the order matters. That is why the target column list is not decoration. It is the contract that says which slot each value lands in.

### Worked example

\`raw_product\` holds dirty text (padded SKUs, prices as strings, some \`NULL\` ids). Load a clean dimension straight from it:

\`\`\`sql
-- raw_product:
--   prod_id | sku     | prod_name   | price_txt
--   '10'    | ' a12 ' | ' Widget '  | '1999'
--   NULL    | 'x9'    | 'junk'      | '0'
--   '11'    | 'b7'    | 'Gadget'    | '4950'

INSERT INTO dim_product (product_id, sku, name, unit_price_cents)
SELECT CAST(prod_id AS INTEGER),
       UPPER(TRIM(sku)),
       TRIM(prod_name),
       CAST(price_txt AS INTEGER)
FROM raw_product
WHERE prod_id IS NOT NULL;   -- drop junk at the boundary

-- dim_product now holds:
--   product_id | sku | name   | unit_price_cents
--   10         | A12 | Widget | 1999
--   11         | B7  | Gadget | 4950
\`\`\`

Every surviving row is cast, trimmed, and inserted as one set. The \`NULL\`-id row never lands.

### Seeding with multi-row \`VALUES\`

For small static data, one statement carries many rows:

\`\`\`sql
INSERT INTO dim_status (code, label) VALUES
    ('paid', 'Paid'),
    ('shipped', 'Shipped'),
    ('cancelled', 'Cancelled');
\`\`\`

### Pitfalls

- **Skipping the column list.** \`INSERT INTO t SELECT ...\` with no list binds to the table's physical column order. The day someone adds or reorders a column in the DDL, values silently slide into the wrong slots. Always name the target columns.
- **No boundary \`WHERE\`.** Forget it and \`NULL\`-keyed junk rows load straight into a clean model. Filter garbage at load time, not later.
- **Column count mismatch.** If the \`SELECT\` returns a different number of expressions than the target list names, the statement errors instead of loading. That is a feature: it catches the mistake at the boundary.

**Interview nuance:** to load one row per key (the dedup the Practice asks for), \`SELECT DISTINCT customer_id, email, country_code\` is the usual first reach, but \`DISTINCT\` collapses on the *entire* projected row, not on \`customer_id\` alone. It works here only because you clean the columns first, so a customer's repeated feed lines become byte-identical and fold into one. If a single \`customer_id\` carried two different emails, \`DISTINCT\` would keep both rows and you would still have duplicate keys. True one-row-per-key needs \`GROUP BY customer_id\` with an aggregate, or \`ROW_NUMBER() OVER (PARTITION BY customer_id ...)\` filtered to \`= 1\`.

**Execution mode:** you write a multi-statement script against a fresh in-memory SQLite database. Hidden assertions then check row counts, cleaned values, and column types.`,
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
-- Populate dim_product from raw_product, cleaning each column and dropping the null-id rows.`,
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
feed repeats it per product line. Dedup products the same way.`,
    starterCode: `-- raw_feed is already seeded. Split it into two clean dimensions.
DROP TABLE IF EXISTS dim_customer;
DROP TABLE IF EXISTS dim_product;

-- CREATE the two target tables with INTEGER keys/price ...
-- Load dim_customer from raw_feed, cleaning each column and keeping one row per customer ...
-- Load dim_product from raw_feed, cleaning each column and keeping one row per product ...`,
    hints: [
      "Create both target tables first, with `INTEGER` keys/price.",
      "Customers: `SELECT DISTINCT CAST(cust_id AS INTEGER), LOWER(TRIM(email)), UPPER(TRIM(country)) FROM raw_feed`. `DISTINCT` collapses the repeats.",
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
    markdown: `## Primary keys give a row a stable identity

Every table needs one honest answer to "which row is this?" A \`PRIMARY KEY\` is that answer: the column (or set of columns) the database uses to identify a row. It enforces a contract you can build on. No two rows share a primary key value, and the key is never NULL. That guarantee is what makes "one row per customer" actually true, and it is what every join and foreign key relies on. Get identity wrong and a nightly load can silently create two rows for the same customer, so every downstream count drifts.

You choose what the key is. There are two families.

- **Natural key**: a business value that is already unique (an \`email\`, an \`ISBN\`, a \`country_code\`). It is meaningful, but business values change (people change emails), get reused, and are often wide text, which makes joins and indexes slower.
- **Surrogate key**: a system-generated integer with no business meaning, usually auto-assigned. It never changes, is compact, and joins fast.

Data engineers prefer a **surrogate** primary key for warehouse dimensions and keep the natural key as a separate attribute (often \`UNIQUE\`). Identity rides on the surrogate; the business value is just data.

### Worked example

\`\`\`sql
CREATE TABLE dim_customer (
    customer_sk  INTEGER PRIMARY KEY,   -- surrogate: system identity
    email        TEXT UNIQUE,           -- natural key kept as an attribute
    country_code TEXT
);

INSERT INTO dim_customer (email, country_code) VALUES ('ada@example.com',   'GB');
INSERT INTO dim_customer (email, country_code) VALUES ('grace@example.com', 'US');
SELECT customer_sk, email FROM dim_customer;
-- 1|ada@example.com
-- 2|grace@example.com
\`\`\`

In SQLite, \`INTEGER PRIMARY KEY\` is special: that column becomes the table's \`rowid\`, so an insert can omit it and SQLite fills in the next integer. The table is physically stored in \`rowid\` order, so lookups and joins on that key are fast with no extra index. Every *other* \`PRIMARY KEY\` and every \`UNIQUE\` column instead gets an automatic unique index created behind the scenes.

### Pitfalls

**Do not promote a natural key to the primary key just because it looks unique today.** The day it is not (a supplier reuses a SKU, a customer re-registers an email), the constraint rejects a legitimate load and your pipeline breaks. Use a surrogate \`PRIMARY KEY\` and add \`UNIQUE\` on the natural key. You get stable identity and a duplicate guard, decoupled. Inserting a row that collides with a \`UNIQUE\` value raises a constraint error; \`INSERT OR IGNORE\` tells SQLite to skip just that row instead of aborting the whole script.

**\`UNIQUE\` still allows many NULLs.** In SQL, NULL is never equal to NULL, so a \`UNIQUE\` column accepts any number of NULL rows. \`email TEXT UNIQUE\` does not force an email to exist. If a business key must always be present, add \`NOT NULL\` alongside \`UNIQUE\`.

**Interview nuance:** the reason DEs reach for surrogate keys is stability under change. When a customer edits their email, you update that one attribute and the \`customer_sk\` stays the same, so every fact row already pointing at that surrogate stays valid. If identity rode on the email, changing it would orphan or force a rewrite of every referencing row. Surrogate keys decouple *identity* from *attributes*, which is exactly what slowly changing dimensions depend on.

**Execution mode:** you write a multi-statement script against a fresh in-memory SQLite database. Hidden assertions then check the primary key, the unique constraint, and the row counts.`,
  },
  apply: scriptExercise({
    id: "sql-l3-primary-keys-apply",
    prompt: `Create a \`dim_customer\` table with a **surrogate** integer PK \`customer_sk\` and keep the
business key \`email\` as a plain attribute (add \`country_code\` too). Insert two customers **without**
specifying \`customer_sk\` and let SQLite assign it.`,
    starterCode: `DROP TABLE IF EXISTS dim_customer;

-- Define dim_customer so customer_sk is a system-assigned surrogate identity,
-- with email and country_code kept as plain attributes ...
-- INSERT two customers WITHOUT listing customer_sk (let SQLite auto-assign it) ...`,
    hints: [
      "`customer_sk INTEGER PRIMARY KEY` is all you need for an auto-incrementing surrogate in SQLite.",
      "Don't list `customer_sk` in your `INSERT` column list. Let it auto-fill.",
      "`email` is just `email TEXT` here (no PK). Identity rides on the surrogate, not the business value.",
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
third insert that duplicates an existing \`sku\`** and prove the database rejects it. The row count
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

\`\`\`csdiagram
{
  "type": "er",
  "tables": [
    {
      "name": "customers",
      "columns": [
        {
          "name": "customer_id",
          "key": "pk"
        },
        {
          "name": "email"
        }
      ]
    },
    {
      "name": "orders",
      "columns": [
        {
          "name": "order_id",
          "key": "pk"
        },
        {
          "name": "customer_id",
          "key": "fk"
        },
        {
          "name": "total_cents"
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "orders",
      "to": "customers",
      "kind": "n-1",
      "label": "each order references one real customer"
    }
  ],
  "caption": "The FK orders.customer_id must point at a real customers row: referential integrity blocks orphan orders."
}
\`\`\`

A **foreign key (FK)** says: "the value in *this* column must exist as a key in *that* table." An
\`orders.customer_id\` FK to \`customers.customer_id\` makes it **impossible** to insert an order for a
customer who doesn't exist. That guarantee is **referential integrity**: the backbone of a
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

An \`ON DELETE\` policy only fires when you actually remove a parent row, and the statement for that is \`DELETE FROM <table> WHERE <predicate>\`: the mirror of the \`SELECT ... WHERE\` you already know, except it removes the matching rows instead of returning them. With \`ON DELETE CASCADE\`, deleting a parent order also clears its child line items in the same step.

**Anatomy:**

\`\`\`
FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT
             │                        │        │                        │
       child column           parent table  parent key          delete policy
\`\`\`

> **In the warehouse this differs, and SQLite has a trap.** SQLite **does not enforce foreign keys
> unless you turn them on** every connection: \`PRAGMA foreign_keys = ON;\`. Forget it and your
> \`REFERENCES\` clauses parse fine but enforce nothing. Orphans slip right in. Warehouses are the
> opposite extreme: Redshift, Snowflake, and BigQuery let you *declare* FKs but **don't enforce them
> at all** (they're informational, used by the planner). So in the real warehouse, referential
> integrity is enforced by your *load logic and DQ tests*, not the engine. Here in SQLite you get
> real enforcement, as long as you flip the pragma.

> **A second SQLite gotcha:** \`INSERT OR IGNORE\` does **not** suppress a foreign-key violation. The
> \`OR IGNORE\` conflict clause only skips \`UNIQUE\` / \`NOT NULL\` / \`CHECK\` / \`PRIMARY KEY\` conflicts.
> An FK violation still raises \`FOREIGN KEY constraint failed\` and aborts the statement. So the
> defensive way to "insert only if the parent exists" is a **guarded insert**:
> \`INSERT INTO orders (...) SELECT ... WHERE EXISTS (SELECT 1 FROM customers WHERE customer_id = ...)\`.
> The row lands only when the parent is present; otherwise it's a clean no-op instead of an error.

**Keep it readable / common pitfall.** Two pitfalls dominate. First: forgetting
\`PRAGMA foreign_keys = ON;\` (always the first line of an FK script). Second: reaching for \`CASCADE\`
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
with a **guarded insert**, \`INSERT ... SELECT ... WHERE EXISTS (the parent)\`, so the orphan cleanly
does **not** land (a raw \`INSERT\`, even \`INSERT OR IGNORE\`, would raise an FK error and abort).`,
    starterCode: `PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;

-- CREATE customers (customer_id PK, email) ...
-- Define orders so each order must point at a real customer, and deleting a customer with orders is blocked ...
-- INSERT one customer, then one valid order for that customer ...
-- Then try to add an order for a customer who does not exist (999) so that it cleanly does not land ...`,
    hints: [
      "First line: `PRAGMA foreign_keys = ON;`. Without it your `REFERENCES` clause enforces nothing.",
      "Declare the FK inside `orders` with `FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT`.",
      "Insert the parent customer *before* the order, or even the valid order fails the FK check.",
      "For the orphan, use a guarded `INSERT INTO orders (...) SELECT 2, 999, 100 WHERE EXISTS (SELECT 1 FROM customers WHERE customer_id = 999)`. It inserts nothing because customer 999 is absent.",
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
    prompt: `Create a **three-table order schema** (\`customers\`, \`orders\`, \`order_items\`) plus a
\`products\` table, with a **defensible \`ON DELETE\` policy per relationship**:
- \`orders.customer_id → customers\`: \`ON DELETE RESTRICT\` (never lose orders because a customer was deleted).
- \`order_items.order_id → orders\`: \`ON DELETE CASCADE\` (line items are meaningless without their order).
- \`order_items.product_id → products\`: \`ON DELETE RESTRICT\`.

Turn FK enforcement on. Insert one customer, two products, and **two** orders for that customer, each with
**two** items referencing real products: **order 1** (which you will delete) and **order 2** (which must
survive untouched). Then prove **three** things: (a) an \`order_items\` row for a **non-existent** order
(\`order_id = 999\`) does not land. Use a **guarded insert** (\`INSERT ... SELECT ... WHERE EXISTS (the
order)\`), since \`INSERT OR IGNORE\` will *not* skip an FK error; (b) \`DELETE FROM orders WHERE order_id =
1;\` **cascades** to remove order 1's two items; and (c) the cascade is **surgical**: order 2 keeps its
two items, so exactly two \`order_items\` rows survive.`,
    starterCode: `PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

-- CREATE customers, products, orders, order_items ...
--   orders.customer_id     -> customers  ON DELETE RESTRICT
--   order_items.order_id   -> orders     ON DELETE CASCADE
--   order_items.product_id -> products   ON DELETE RESTRICT
-- INSERT the valid chain: one customer, two products, then TWO orders (1 and 2),
--   each with two order_items referencing real products ...
-- Then try to add an item for an order that does not exist (999) so that it cleanly does not land ...
-- Finally remove order 1 and confirm only its own items go while order 2 keeps both of its items ...`,
    hints: [
      "`PRAGMA foreign_keys = ON;` first. The cascade won't fire without it.",
      "Insert in dependency order: `products` and `customers`, then both `orders`, then all four `order_items`.",
      "Give the `order_items.order_id` FK `ON DELETE CASCADE`; give the other two `ON DELETE RESTRICT`.",
      "Give order 1 and order 2 two items each. Guard the orphan with `... SELECT 103, 999, 10, 1 WHERE EXISTS (SELECT 1 FROM orders WHERE order_id = 999)`, then run `DELETE FROM orders WHERE order_id = 1;`. The cascade clears order 1's two items while order 2 keeps its two before the assertions read.",
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
      {
        suite: "integrity",
        name: "surviving order 2 kept its two items (the cascade was surgical, not a table-wipe)",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_items WHERE order_id = 2) <> 2`,
      },
      {
        suite: "integrity",
        name: "exactly two order_items remain, order 1's cascaded away, order 2's survived",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_items) <> 2`,
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
a problem. The bad row simply never lands. Three workhorses:

- \`NOT NULL\`: the column must always have a value.
- \`UNIQUE\`: no two rows share this value (or this *combination* of values, for a **composite unique**).
- \`CHECK (condition)\`: every row must satisfy a boolean condition (an enum whitelist, a non-negative
  price, a valid date order).

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
> are re-expressed as **dbt / DQ tests** (you'll build those in L4). Author them in your DDL anyway:
> they document intent and they *are* enforced on strict engines like Postgres.

### Keep each CHECK to one clear invariant

A giant compound \`CHECK\` is unreadable and hard to debug when it fires. Common trap: a \`CHECK\`
**passes** when its condition evaluates to \`NULL\` (three-valued logic). So a bare
\`CHECK (ship_date >= order_date)\` *already* lets a missing ship date through: the \`NULL\` makes the
condition unknown, not false, and it still rejects a wrong one. The \`ship_date IS NULL OR\` prefix in
the worked example above adds no enforcement; it documents the intent for the next reader. If a ship
date must always be present, that is a separate \`NOT NULL\`, not a longer \`CHECK\`. Watch the polarity
flip: that same \`IS NULL OR\` prefix *is* load-bearing in a \`WHERE\` clause, where a \`NULL\` condition
drops the row instead of letting it through.

**Recap:** constraints are the cheapest DQ layer. Use \`NOT NULL\` for required fields, \`UNIQUE\` (incl.
composite) for identity/dedup, and \`CHECK\` for enums and invariants. Author them even where the
warehouse won't enforce them.

**Execution mode:** you write a multi-statement DDL+DML script. It runs against a fresh in-memory
SQLite DB, then hidden assertion queries check the constraints and row counts. Use \`INSERT OR IGNORE\`
for rows you *expect* to be rejected. A constraint violation is then silently skipped instead of
aborting your whole script.`,
  },
  apply: scriptExercise({
    id: "sql-l3-constraints-apply",
    prompt: `Create an \`orders\` table whose schema *refuses* bad data. It needs:

- \`order_id INTEGER PRIMARY KEY\`,
- \`status TEXT NOT NULL\` constrained by a \`CHECK\` to the enum \`('pending','paid','shipped','cancelled')\`,
- \`total_cents INTEGER NOT NULL\`.

Insert **one valid row**. Then, using \`INSERT OR IGNORE\`, attempt a row with \`status = 'refunded'\` and
prove it never lands. The table should end with exactly one row.`,
    starterCode: `DROP TABLE IF EXISTS orders;

-- CREATE TABLE orders ( ... ) with a CHECK on status and NOT NULL columns ...
-- INSERT one valid row (a whitelisted status) ...
-- INSERT OR IGNORE a row with status = 'refunded', it should be rejected ...`,
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

1. a **composite** \`UNIQUE (supplier_id, sku)\`: the same SKU may exist under *different* suppliers,
   but never twice under one;
2. a **non-negative** price: \`CHECK (unit_price_cents >= 0)\`;
3. an **enum**: \`CHECK (status IN ('active','discontinued'))\`.

Insert **one fully valid row**. Then, with \`INSERT OR IGNORE\`, fire one violation of *each* rule: a
duplicate \`(supplier_id, sku)\`, a negative price, and a bad status. Prove the table still holds
exactly one row.`,
    starterCode: `DROP TABLE IF EXISTS dim_product;

-- CREATE TABLE dim_product ( ... ) so the schema itself enforces three rules:
--   the same sku may repeat across suppliers but never twice under one supplier,
--   price can never be negative,
--   and status must be either active or discontinued ...
-- INSERT one fully valid row ...
-- INSERT OR IGNORE one duplicate (supplier_id, sku), one negative price, one bad status ...`,
    hints: [
      "Put the composite unique as a table-level constraint after the columns: `UNIQUE (supplier_id, sku)`.",
      "Two column-level checks: `CHECK (unit_price_cents >= 0)` and `CHECK (status IN ('active','discontinued'))`.",
      "Insert the good row first: a whitelisted status, a non-negative price, and a unique supplier+sku.",
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
    markdown: `## Why atomic values are the floor for every query

Relational operations (\`JOIN\`, \`SUM\`, \`GROUP BY\`, \`WHERE\`) and the indexes that speed them up all work on whole column values. The moment one cell hides several facts, those operations stop working. You cannot \`SUM\` a quantity trapped inside the string \`'mouse:2, keyboard:1'\`, and you cannot \`JOIN\` on a \`product\` that is buried next to another product in the same row. First Normal Form (1NF) is the rule that keeps every value reachable: one value per cell, and one row per fact.

## What 1NF requires

Two conditions:

- Every cell holds a single, atomic value. No comma-packed lists, no \`key:value\` blobs.
- There are no repeating groups. A table must not store the same kind of fact in parallel columns like \`product_a\`, \`product_b\`, \`product_c\`.

Both failures are the same mistake in different clothes: a one-to-many relationship (one order has many line items) crammed into one row. 1NF fixes it by moving the "many" side into its own rows. More rows, never more columns.

The grain of the table changes when you fix it. \`raw_order\` has one row per order. The 1NF table has one row per line item, so \`order_id\` alone now repeats and can no longer identify a row. You declare a composite key \`(order_id, product)\`: the pair is unique even though neither column is on its own.

## Unpacking parallel slots

\`raw_order\` stores two slots per order:

| order_id | product_a | qty_a | product_b | qty_b |
|---|---|---|---|---|
| 1 | mouse | 2 | keyboard | 1 |
| 2 | mouse | 1 | \`NULL\` | \`NULL\` |

Unpack one slot per \`INSERT ... SELECT\`, and skip empty slots so they do not become phantom rows:

\`\`\`sql
INSERT INTO order_item (order_id, product, qty)
SELECT order_id, product_a, qty_a FROM raw_order;

INSERT INTO order_item (order_id, product, qty)
SELECT order_id, product_b, qty_b FROM raw_order
WHERE product_b IS NOT NULL;
\`\`\`

Result (one row per line item):

| order_id | product | qty |
|---|---|---|
| 1 | mouse | 2 |
| 2 | mouse | 1 |
| 1 | keyboard | 1 |

Row order in a table is not meaningful; only \`ORDER BY\` at read time defines it.

## Pitfall: the empty second slot

Order 2 has no slot B, so its \`product_b\` and \`qty_b\` are \`NULL\`. Without \`WHERE product_b IS NOT NULL\`, the second \`INSERT\` would add a row like \`(2, NULL, NULL)\`: a line item for nothing. That row is meaningless, and a \`NULL\` in a key column defeats the composite key you are trying to build. Filtering empty slots is not optional cleanup; it is what keeps the grain honest.

The mirror pitfall is "fixing" a multi-valued column by adding more slot columns. That is still a repeating group, and it hard-caps you at however many slots you defined. The answer is always more rows.

**Interview nuance:** "atomic" is defined relative to how the domain queries the value, not by whether the string looks divisible. A full name in one \`name\` column is fine until you need to filter or join by last name, at which point it is a 1NF violation for that domain. A \`DATE\` is atomic even though it contains a year, month, and day, because you query it as one value. Interviewers probe this: atomicity is a modeling decision about access patterns, not a syntactic property of the data.`,
  },
  apply: scriptExercise({
    id: "sql-l3-normalize-1nf-apply",
    prompt: `The \`raw_order\` table stores **two line-item slots per order** in packed columns
(\`product_a\`/\`qty_a\` and \`product_b\`/\`qty_b\`). Unpack it into a 1NF \`order_item\` table with columns
\`(order_id, product, qty)\` and a composite primary key \`(order_id, product)\`: **one row per line
item**. Use two \`INSERT … SELECT\` statements (one per slot); skip the empty second slot with a
\`WHERE product_b IS NOT NULL\`. You're given exactly two slots to keep the SQL simple.`,
    starterCode: `DROP TABLE IF EXISTS order_item;

-- CREATE TABLE order_item ( ... , PRIMARY KEY (order_id, product) );

-- INSERT … SELECT from the first slot (product_a, qty_a) for every order ...

-- INSERT … SELECT from the second slot (product_b, qty_b), skipping empty slots ...`,
    hints: [
      "First `INSERT … SELECT order_id, product_a, qty_a FROM raw_order` for every order.",
      "Second `INSERT … SELECT order_id, product_b, qty_b FROM raw_order WHERE product_b IS NOT NULL`. The `WHERE` skips the empty slot.",
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
    prompt: `A "sales spreadsheet" export stores **up to three line-item slots per order** in packed
columns (\`product_1\`/\`qty_1\`/\`price_1\`, \`product_2\`/\`qty_2\`/\`price_2\`,
\`product_3\`/\`qty_3\`/\`price_3\`). Unpack \`raw_sales\` into a 1NF \`order_line\` table
\`(order_id, product, qty, unit_price_cents)\` with a composite primary key \`(order_id, product)\`:
**one row per line item**. Use **three** \`INSERT … SELECT\` statements (one per slot); skip the empty
slots with a \`WHERE product_N IS NOT NULL\`. The slot columns are already \`INTEGER\`, so \`qty\` and
\`price_N\` carry straight into \`unit_price_cents\`: no parsing, no \`CAST\`.`,
    starterCode: `DROP TABLE IF EXISTS order_line;

-- CREATE TABLE order_line ( ... , PRIMARY KEY (order_id, product) );

-- INSERT … SELECT from slot 1 (product_1, qty_1, price_1) for every order ...

-- Do the same for slot 2 and slot 3, each skipping orders whose slot is empty ...`,
    hints: [
      "First `INSERT … SELECT order_id, product_1, qty_1, price_1 FROM raw_sales WHERE product_1 IS NOT NULL` for every order.",
      "Add one more `INSERT … SELECT` per slot (product_2/qty_2/price_2, then product_3/qty_3/price_3), each with `WHERE product_N IS NOT NULL` so empty slots are skipped.",
      "Declare `PRIMARY KEY (order_id, product)` so the composite grain is enforced.",
      "The slot columns are already `INTEGER`, so a plain `SELECT` carries `qty` and `price` over: no CAST needed.",
    ],
    seedSql: `DROP TABLE IF EXISTS raw_sales;
CREATE TABLE raw_sales (
    order_id  INTEGER,
    product_1 TEXT, qty_1 INTEGER, price_1 INTEGER,
    product_2 TEXT, qty_2 INTEGER, price_2 INTEGER,
    product_3 TEXT, qty_3 INTEGER, price_3 INTEGER
);
INSERT INTO raw_sales VALUES
    (1, 'mouse',   2, 2499,  'keyboard', 1, 4999, NULL,  NULL, NULL),  -- slot 3 empty
    (2, 'monitor', 1, 19999, NULL,       NULL, NULL, NULL, NULL, NULL),  -- slots 2 & 3 empty
    (3, 'cable',   3, 599,   'hub',      1, 2999, 'mat', 2,    1499);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "exactly 6 line items were unpacked (2 + 1 + 3)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_line) <> 6`,
      },
      {
        suite: "rows",
        name: "order 2 has exactly one line item (its two empty slots were skipped)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_line WHERE order_id = 2) <> 1`,
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
    markdown: `## 2NF and 3NF: "the key, the whole key, and nothing but the key"

Once data is atomic (1NF), redundancy can still hide in *dependencies*. The memorable rule for a
well-normalized table: **every non-key column depends on the key, the whole key, and nothing but the
key.**

### 2NF: the whole key

No column may depend on only *part* of a composite key. In an
\`order_item(order_id, product_id, qty, product_name)\` table keyed on \`(order_id, product_id)\`,
\`product_name\` depends only on \`product_id\`, half the key. That's a **partial dependency**: it
repeats \`product_name\` on every line the product appears in. Fix: move \`product_name\` to a
\`products\` table keyed on \`product_id\`.

### 3NF: nothing but the key

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

> **In the warehouse this differs, by intent.** 3NF is the gold standard for OLTP systems (safe
> writes, no anomalies). Analytical warehouses often *stop short* of full normalization or
> deliberately denormalize (next lesson) because joins are the expensive part of a read. So DEs
> normalize the **source-of-truth / staging** layers and denormalize the **mart** layer. Same
> engineer, two different targets.

**Common pitfall: over- or under-splitting.** Under: leaving \`customer_email\` on \`orders\` (a real
3NF violation that causes update anomalies). Over: decomposing attributes that genuinely *do* depend
only on the key into needless tables. Test each column: "does this depend on the whole key and nothing
but the key?" If no, split; if yes, leave it.

**Recap.** 2NF removes partial dependencies (on part of a composite key); 3NF removes transitive
dependencies (on another non-key column). Decompose so every fact is stored exactly once: the OLTP
ideal you'll later denormalize for analytics.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB,
then hidden assertion queries check that each fact now lives in exactly one table.`,
  },
  apply: scriptExercise({
    id: "sql-l3-normalize-2nf-3nf-apply",
    prompt: `The \`flat_line\` table repeats \`product_name\` on every row: a **2NF violation**, because
\`product_name\` depends only on \`product_id\`, which is just *half* of the natural
\`(order_id, product_id)\` grain. Normalize it:

- Extract product attributes into a \`products\` table keyed on \`product_id\`, **deduplicated**: use
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
      "`INSERT INTO products (product_id, product_name) SELECT DISTINCT product_id, product_name FROM flat_line;`. DISTINCT collapses the repeats.",
      "`order_items` gets `(order_id, product_id, qty)` only: no `product_name`. Declare `PRIMARY KEY (order_id, product_id)`.",
      "Populate order_items with `SELECT order_id, product_id, qty FROM flat_line;`: the same three rows, minus the product name.",
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

- \`customers\` keyed on \`customer_id\`, **deduplicated by email**. The same person shows up under
different \`customer_id\`s in the raw feed, so keep one row per distinct email at the **lowest**
\`customer_id\`.
- \`products\` keyed on \`product_id\`, deduplicated.
- \`orders\` keyed on \`order_id\`: one row per order, carrying the **surviving** \`customer_id\` from
\`customers\` (map each raw id to the deduped one via email; never point an order at a \`customer_id\`
you deduped away), and no customer attributes.
- \`order_items\` keyed on \`(order_id, product_id)\`: carrying \`qty\` (not product attributes).`,
    starterCode: `DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_items;

-- customers:   one row per DISTINCT email, keeping the lowest customer_id ...
-- products:    one row per DISTINCT product_id ...
-- orders:      one row per order_id (carry customer_id, no customer attributes) ...
-- order_items: (order_id, product_id, qty) at line grain, no product attributes ...`,
    hints: [
      "Dedup customers with a grouped insert: `SELECT MIN(customer_id), email FROM flat_sales GROUP BY email`. One row per email, lowest id wins.",
      "Don't load `orders` straight from the raw feed: order 3's raw customer_id (12) was deduped away in favor of 10, so `SELECT DISTINCT order_id, customer_id FROM flat_sales` would leave order 3 pointing at a customer that no longer exists: an orphaned foreign key. Remap through the dim on the natural key: `SELECT DISTINCT f.order_id, c.customer_id FROM flat_sales f JOIN customers c ON c.email = f.email`. Every order now resolves to a surviving customer_id.",
      "`products` = `SELECT DISTINCT product_id, product_name FROM flat_sales`.",
      "`order_items` = `SELECT order_id, product_id, qty FROM flat_sales`: atomic grain, no descriptive columns.",
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
        suite: "orders",
        name: "order 3 is remapped to the surviving customer_id (10, not the deduped 12)",
        sql: `SELECT 1 WHERE COALESCE((SELECT customer_id FROM orders WHERE order_id = 3), -1) <> 10`,
      },
      {
        suite: "integrity",
        name: "no order references a customer_id that was deduped away (0 orphans)",
        sql: `SELECT o.order_id FROM orders o LEFT JOIN customers c ON o.customer_id = c.customer_id WHERE c.customer_id IS NULL`,
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

Normalization is not a moral good. It's a **trade-off**. It optimizes for *safe writes*: each fact
stored once means no update anomalies. But it pays for that with *joins on every read*, and joins are
the expensive part of analytics. The two worlds:

- **OLTP** (transactional apps): many small writes, correctness-critical → **normalize** (3NF).
- **OLAP** (analytics/BI): few huge reads, join-heavy → **denormalize** (flatten so a report is one
  scan, not a six-table join).

**Denormalization** deliberately reintroduces redundancy (copying \`product_name\`, \`category\`,
\`customer_country\` *into* the fact/reporting table) so the read needs no joins. The cost is that if
\`product_name\` changes you must update it in many places; in analytics that's fine because these
tables are *rebuilt* by the loader, not hand-edited.

**Worked example.** From the 3NF schema, build one wide, denormalized reporting *table*, a real,
physical table that stores its own rows (not a view):

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

A BI query against \`rpt_sales\` ("revenue by category by country") now touches **one** table. The
four-way join happened *once*, at build time, not on every dashboard load. \`CREATE TABLE … AS SELECT\`
(CTAS) runs a query and stores its result set as a brand-new, **physical** table: real rows on disk,
not a view. (A true **view**, by contrast, is just a *saved SELECT* that stores no data of its own and
re-runs its query on every read, so it always reflects the latest source rows but pays its full query
cost on every read. \`rpt_sales\` here is a materialized *table*, which is exactly why its join cost is
paid once at build time and never again on read.)

> **In the warehouse this differs. This is the warehouse's whole point.** Columnar warehouses
> (Snowflake/BigQuery/Redshift) are built to scan wide denormalized tables fast, and storage is cheap,
> so the redundancy barely costs anything. \`CREATE TABLE … AS SELECT\` (CTAS) is the standard build
> verb there too. The star schema (Module 3.5) is the *disciplined* middle ground between full 3NF and
> a fully-flat "one big table."

**Keep it readable / common pitfall.** Denormalize the *mart*, never the *source of truth*. If you
denormalize your write-path OLTP tables you'll corrupt data via update anomalies. Pitfall:
denormalizing too early or everything. Keep normalized staging/intermediate layers and denormalize
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
\`product_id\`, \`qty\`, \`product_name\`, \`category\`, and \`line_revenue_cents\` (= \`qty * unit_price_cents\`),
so a report needs **no joins** to read it. Lead your script with \`DROP TABLE IF EXISTS rpt_line;\` so
it re-runs cleanly.`,
    starterCode: `-- Build a wide, join-free reporting table from the normalized source.
DROP TABLE IF EXISTS rpt_line;

-- Build rpt_line as a stored table carrying order_id, product_id, qty, the product's name and
-- category, and a computed line_revenue_cents, so reading the report needs no joins ...`,
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

-- Build obt_sales as one stored table gathering every dashboard column from all four sources at once ...
-- Then store a tiny one-row obt_compare holding joins_normalized = 3 and joins_flattened = 0 ...`,
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

const cardinality: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-cardinality",
  title: "Entities, Relationships, and Cardinality",
  summary: "Read and encode 1:1, 1:N, and M:N relationships.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["ER modeling", "cardinality (1:1/1:N/M:N)", "FK placement on the many side"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Cardinality decides which table holds the foreign key

Before you can write a single \`JOIN\`, someone decided which table holds which key. That decision is data modeling, and getting it wrong is expensive: a foreign key on the wrong side forces application code to fake relationships, and a missing \`UNIQUE\` lets a "one profile per user" rule silently allow five. The whole schema either falls out cleanly or fights you forever, and it starts with cardinality.

### The three shapes

\`\`\`csdiagram
{
  "type": "er",
  "tables": [
    {
      "name": "customers",
      "columns": [
        {
          "name": "customer_id",
          "key": "pk"
        },
        {
          "name": "name"
        }
      ]
    },
    {
      "name": "orders",
      "columns": [
        {
          "name": "order_id",
          "key": "pk"
        },
        {
          "name": "customer_id",
          "key": "fk"
        },
        {
          "name": "total"
        }
      ]
    },
    {
      "name": "users",
      "columns": [
        {
          "name": "user_id",
          "key": "pk"
        }
      ]
    },
    {
      "name": "profiles",
      "columns": [
        {
          "name": "profile_id",
          "key": "pk"
        },
        {
          "name": "user_id",
          "key": "fk"
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "orders",
      "to": "customers",
      "kind": "n-1",
      "label": "placed by (FK on the many side)"
    },
    {
      "from": "profiles",
      "to": "users",
      "kind": "1-1",
      "label": "UNIQUE FK = one profile per user"
    }
  ],
  "caption": "1:N puts the FK on the many side (orders.customer_id); 1:1 is the same FK plus UNIQUE on it (profiles.user_id). The third shape, M:N, needs a junction table (next lesson)."
}
\`\`\`

An **entity** is a thing you store (a \`customer\`, an \`order\`, a \`product\`). A **relationship** links entities. **Cardinality** says how many rows on one side can link to how many on the other:

- **1:N (one-to-many)**: one \`customer\` has many \`orders\`; each \`order\` belongs to one \`customer\`. By far the most common shape.
- **1:1 (one-to-one)**: one \`user\` has one \`profile\`. Rare, usually a deliberate table split.
- **M:N (many-to-many)**: one \`order\` contains many \`products\`, and one \`product\` appears in many \`orders\`.

### The rule: a foreign key is a single-valued pointer

A foreign key column holds exactly one value per row. So it can only encode a "to-one" direction, which means **the FK lives on the "many" side**. In a 1:N, each \`order\` points at exactly one \`customer\`, so \`customer_id\` sits on \`orders\`. It cannot go the other way: a \`customer\` row has no single \`order_id\` to store, because a customer has many orders.

\`\`\`sql
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id)  -- FK on the many side
);

INSERT INTO customers VALUES (1, 'Ada');
INSERT INTO orders   VALUES (100, 1), (101, 1);   -- Ada placed two orders

SELECT c.name, o.order_id
FROM customers c JOIN orders o ON o.customer_id = c.customer_id;
-- name | order_id
-- Ada  | 100
-- Ada  | 101
\`\`\`

**1:1** is the same FK plus a \`UNIQUE\` constraint. Split the optional columns into their own table and put a \`UNIQUE\` FK on it, e.g. \`profiles.user_id INTEGER UNIQUE REFERENCES users(user_id)\`. Without \`UNIQUE\`, two profile rows could share one \`user_id\`, which is just a 1:N. The \`UNIQUE\` is what forbids the duplicate and pins the relationship to one.

**M:N** cannot be expressed with a single FK, because neither side is "to-one." It needs a third **junction table** holding two FKs (one pointing at each side), which is the next lesson. That is why a playlists-to-songs feature leaves \`songs\` standalone for now.

\`\`\`text
1:N   FK on the many side (no UNIQUE)
1:1   FK on one side, plus UNIQUE on that FK
M:N   junction table with two FKs (next lesson)
\`\`\`

### Pitfalls

- **FK on the wrong side of a 1:N.** The tell is wanting to store "a list of order ids" in one \`customers\` column. A column holds one value, so that list does not fit. Move the FK to the many side.
- **Forgetting \`UNIQUE\` on a 1:1.** A plain FK on the split table is a 1:N in disguise; nothing stops two children from sharing one parent. Add \`UNIQUE\` to the FK column to enforce the "one."

> **Warehouse note:** ER modeling and FK placement are engine-independent. Many warehouses declare but do not *enforce* foreign keys, yet the placement decision (which table holds the key) is identical and still drives how you join.

**Interview nuance:** the FK's *direction* encodes cardinality (which side is "many"), but its *nullability* encodes participation, a separate axis. \`orders.customer_id NOT NULL\` means every order must have a customer (mandatory participation); making it nullable allows an order with no customer at all (optional). On a 1:1 split, \`UNIQUE\` already caps each parent at one child no matter what; adding \`NOT NULL\` to that FK is what forces every child to have a parent, giving exactly one parent per child instead of zero-or-one. Interviewers probe this to see whether you separate "how many" (cardinality) from "is it required" (participation).

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite database, then hidden assertion queries check FK placement, the \`UNIQUE\` that encodes 1:1, and that M:N was left for a junction table.`,
  },
  apply: scriptExercise({
    id: "sql-l3-cardinality-apply",
    prompt: `Two entities, \`authors\` and \`books\`, are in a **1:N** relationship: one author writes many
books, and each book has exactly one author. Create both tables and place the foreign key on the
**correct side**, then insert one author and two of their books. The hidden checks confirm the FK
direction by joining the books back to their author.`,
    starterCode: `PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;

-- Define the authors and books tables for a one-author-to-many-books relationship.
-- Put the linking column on the correct table so each book resolves to exactly one author.
-- INSERT one author, then two books that both point at that author.`,
    hints: [
      "\`authors(author_id INTEGER PRIMARY KEY, name TEXT)\`. The one side carries no FK.",
      "\`books(book_id INTEGER PRIMARY KEY, title TEXT, author_id INTEGER REFERENCES authors(author_id))\`. The FK lives on the many side.",
      "Insert the author before the books so the reference resolves.",
    ],
    referenceSolution: `PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;

CREATE TABLE authors (
    author_id INTEGER PRIMARY KEY,
    name      TEXT
);

CREATE TABLE books (
    book_id   INTEGER PRIMARY KEY,
    title     TEXT,
    author_id INTEGER REFERENCES authors(author_id)
);

INSERT INTO authors VALUES (1, 'Ada');
INSERT INTO books VALUES (1, 'Notes', 1), (2, 'Engine', 1);`,
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "placement",
        name: "the FK sits on books (the many side), pointing at authors",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_foreign_key_list('books') WHERE "table" = 'authors') <> 1`,
      },
      {
        suite: "placement",
        name: "authors (the one side) carries no FK",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_foreign_key_list('authors')) <> 0`,
      },
      {
        suite: "relationship",
        name: "the join links each book to its author (2 matched rows)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM books b JOIN authors a ON a.author_id = b.author_id) <> 2`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-cardinality-practice",
    prompt: `Create four tables (\`users\`, \`playlists\`, \`cover_images\`, \`songs\`) plus a one-row
\`model_notes\` table, encoding a *playlists and songs* feature's three relationships purely in DDL:

1. **user 1:N playlists**: a user owns many playlists. Put the FK on \`playlists\` (the many side).
2. **playlist 1:1 cover_image**: each playlist has at most one cover. Model \`cover_images\` as a table split with a \`UNIQUE\` FK on \`playlist_id\` referencing \`playlists\`.
3. **playlists M:N songs**: a playlist has many songs and a song appears on many playlists. A single FK **cannot** express this many-to-many, so leave \`songs\` standalone (the junction table comes next lesson).

In \`model_notes\`, store \`mn_needs_junction = 1\` to record that the playlists-to-songs link still
needs a junction.`,
    starterCode: `PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS cover_images;
DROP TABLE IF EXISTS playlists;
DROP TABLE IF EXISTS songs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS model_notes;

-- users, the one side of user 1:N playlists.
-- playlists, the many side: give it the column that links each playlist to its owning user.
-- cover_images, the 1:1 split: link it to playlists and allow at most one cover per playlist.
-- songs, standalone; the M:N link to playlists can't be a single FK.
-- model_notes, record mn_needs_junction = 1.`,
    hints: [
      "\`playlists.user_id INTEGER REFERENCES users(user_id)\`: FK on the many side.",
      "\`cover_images.playlist_id INTEGER UNIQUE REFERENCES playlists(playlist_id)\`. The \`UNIQUE\` is what turns 1:N into 1:1.",
      "Do **not** give \`songs\` a \`playlist_id\` FK. That would force each song into a single playlist. Leave it standalone; the M:N link is a junction table (next lesson).",
      "\`CREATE TABLE model_notes AS SELECT 1 AS mn_needs_junction;\` records the decision the grader checks.",
    ],
    seedSql: "",
    checkIdempotency: true,
    assertions: [
      {
        suite: "one-to-many",
        name: "playlists carries the FK to users (many side)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_foreign_key_list('playlists') WHERE "table" = 'users') <> 1`,
      },
      {
        suite: "one-to-one",
        name: "cover_images has a FK to playlists",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_foreign_key_list('cover_images') WHERE "table" = 'playlists') <> 1`,
      },
      {
        suite: "one-to-one",
        name: "the cover_images FK is UNIQUE, that is what encodes 1:1",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_index_list('cover_images') WHERE "unique" = 1) < 1`,
      },
      {
        suite: "many-to-many",
        name: "songs has no direct FK to playlists (M:N needs a junction)",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_foreign_key_list('songs') WHERE "table" = 'playlists') <> 0`,
      },
      {
        suite: "modeling",
        name: "the M:N decision is recorded in model_notes",
        sql: `SELECT 1 WHERE COALESCE((SELECT mn_needs_junction FROM model_notes), -1) <> 1`,
      },
    ],
  }),
}

const junctionTables: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-junction-tables",
  title: "Junction Tables for Many-to-Many",
  summary: "Resolve M:N relationships with a bridge table carrying its own attributes.",
  estimatedMinutes: 30,
  difficulty: "hard",
  skills: ["junction/associative table", "composite PK of paired FKs", "relationship attributes"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## A single foreign key cannot model many-to-many

Every real schema hits this. One student takes many courses, and each course holds many students. One song belongs to many playlists, and each playlist holds many songs. You cannot store that with a foreign key, because an FK is a single column holding a single value: it points one child row at one parent, so it models one-to-many and nothing more. To let *both* sides be "many," you add a third table whose entire job is to hold the pairs.

### The mental model: two one-to-many relationships pointing into a bridge

\`\`\`csdiagram
{
  "type": "er",
  "tables": [
    {
      "name": "students",
      "columns": [
        {
          "name": "student_id",
          "key": "pk"
        },
        {
          "name": "name"
        }
      ]
    },
    {
      "name": "enrollments",
      "columns": [
        {
          "name": "student_id",
          "key": "fk"
        },
        {
          "name": "course_id",
          "key": "fk"
        },
        {
          "name": "enrolled_at"
        }
      ]
    },
    {
      "name": "courses",
      "columns": [
        {
          "name": "course_id",
          "key": "pk"
        },
        {
          "name": "title"
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "enrollments",
      "to": "students",
      "kind": "n-1",
      "label": "one row per (student, \u2026)"
    },
    {
      "from": "enrollments",
      "to": "courses",
      "kind": "n-1",
      "label": "\u2026 course) pair"
    }
  ],
  "caption": "The junction resolves M:N as two 1:N relationships aimed inward; its composite PK (student_id, course_id) is one row per pair."
}
\`\`\`

A junction table (also called an associative or bridge table) has one row per related \`(A, B)\` pair. Read it as two one-to-many relationships aimed inward: each parent owns many junction rows, and each junction row points at exactly one row in each parent. Its shape is stereotyped:

- Two FK columns, one to each parent.
- A **composite primary key** over those two FKs. It does double duty: it identifies the pair, and it blocks the same pair from being stored twice.
- Optional **relationship attributes**: facts that belong to the pairing, not to either entity alone.

An attribute belongs on the junction when it needs *both* keys to be meaningful. \`grade\` and \`enrolled_at\` depend on a specific \`(student, course)\` pair, so they cannot live on \`students\` (a student has many grades) or on \`courses\`. The test is always "does this fact require both entities together?"

### Worked example

\`\`\`sql
CREATE TABLE enrollments (
    student_id  INTEGER REFERENCES students(student_id),
    course_id   INTEGER REFERENCES courses(course_id),
    enrolled_at TEXT,
    PRIMARY KEY (student_id, course_id)   -- one row per (student, course)
);

INSERT INTO enrollments VALUES (1, 10, '2026-01-15');
INSERT INTO enrollments VALUES (1, 11, '2026-01-15');
INSERT OR IGNORE INTO enrollments VALUES (1, 10, '2026-02-01');  -- pair already exists

SELECT COUNT(*) FROM enrollments;  -- 2, not 3: the composite PK made the repeat a no-op
\`\`\`

\`INSERT OR IGNORE\` is the clean way to prove the guard: a duplicate pair violates the primary key, and \`OR IGNORE\` skips that row silently instead of raising an error. You can layer more guards the same way. In the playlist exercise, a second constraint \`UNIQUE (playlist_id, position)\` stops two songs from claiming the same slot, which is separate from the PK that stops one song appearing twice in a playlist.

### Pitfall: drop the composite PK and everything double-counts

Without the composite PK, nothing stops \`(1, 10)\` from being inserted twice, and every \`COUNT\` and \`SUM\` over \`enrollments\` silently inflates. A subtler trap on SQLite specifically: a \`PRIMARY KEY\` column still accepts \`NULL\` (a long-standing engine quirk), and SQLite treats \`NULL\`s as distinct, so \`(NULL, 10)\` can be stored repeatedly. Declare the FK columns \`NOT NULL\` when a partial pair should never exist.

**Interview nuance:** a composite primary key \`(student_id, course_id)\` builds one index sorted by \`student_id\` first, then \`course_id\`. It answers "which courses does student 1 take?" with a fast seek, but "which students are in course 10?" filters on the non-leading column and falls back to a scan. This is the leftmost-prefix rule, and it is why a many-to-many queried in both directions usually needs a second index on \`(course_id, student_id)\`.
`,
  },
  apply: scriptExercise({
    id: "sql-l3-junction-tables-apply",
    prompt: `The seed already gives you \`students\` and \`courses\` (both populated). Create the
\`enrollments\` **junction table** that resolves their many-to-many relationship:

- Two FK columns \`student_id\` and \`course_id\`, plus an \`enrolled_at TEXT\` relationship attribute.
- A **composite primary key** \`(student_id, course_id)\`: one row per (student, course) pair.

Insert **three** distinct enrollments: \`(1, 10)\`, \`(1, 11)\`, and \`(2, 10)\`. Then attempt to insert
the \`(1, 10)\` pair a second time with \`INSERT OR IGNORE\` and prove the composite PK makes it a no-op
(the table stays at three rows).`,
    starterCode: `DROP TABLE IF EXISTS enrollments;

-- CREATE TABLE enrollments ( ... ) with a composite PRIMARY KEY (student_id, course_id) ...
-- INSERT the three distinct pairs (1,10), (1,11), (2,10) ...
-- INSERT OR IGNORE the duplicate (1,10) pair, it should be skipped, not error ...`,
    hints: [
      "Declare the key at table level: `PRIMARY KEY (student_id, course_id)`. One composite key, not two separate primary keys.",
      "Insert the three distinct pairs, then attempt an already-existing pair with `INSERT OR IGNORE`.",
      "`INSERT OR IGNORE` skips the row that would violate the composite PK instead of aborting the whole script.",
    ],
    referenceSolution: `DROP TABLE IF EXISTS enrollments;

CREATE TABLE enrollments (
    student_id INTEGER REFERENCES students(student_id),
    course_id  INTEGER REFERENCES courses(course_id),
    enrolled_at TEXT,
    PRIMARY KEY (student_id, course_id)
);

INSERT INTO enrollments (student_id, course_id, enrolled_at) VALUES
    (1, 10, '2026-01-01'),
    (1, 11, '2026-01-02'),
    (2, 10, '2026-01-03');

-- Duplicate (student 1, course 10) pair, the composite PK makes this a no-op.
INSERT OR IGNORE INTO enrollments (student_id, course_id, enrolled_at) VALUES (1, 10, '2026-02-09');`,
    seedSql: `DROP TABLE IF EXISTS enrollments; DROP TABLE IF EXISTS students; DROP TABLE IF EXISTS courses;
CREATE TABLE students (student_id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE courses  (course_id  INTEGER PRIMARY KEY, title TEXT);
INSERT INTO students VALUES (1,'Ada'),(2,'Grace');
INSERT INTO courses  VALUES (10,'SQL'),(11,'Modeling');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "enrollments has a composite (two-column) primary key",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('enrollments') WHERE pk>0) <> 2`,
      },
      {
        suite: "rows",
        name: "exactly three enrollment rows remain (the duplicate pair was ignored)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM enrollments) <> 3`,
      },
      {
        suite: "dedup",
        name: "the (student 1, course 10) pair exists exactly once",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM enrollments WHERE student_id=1 AND course_id=10) <> 1`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-junction-tables-practice",
    prompt: `Build the \`playlist_songs\` junction that resolves a playlists-to-songs many-to-many, and
give it a **relationship attribute** \`position\` (a song's ordering within a playlist). The seed
provides two playlists and four songs. Requirements:

- A composite primary key \`(playlist_id, song_id)\`: a song can appear in a playlist only once.
- A \`position INTEGER NOT NULL\` relationship attribute.
- A composite \`UNIQUE (playlist_id, position)\` so two songs can't claim the same slot in one playlist.

Insert **three** rows into playlist 1 at positions 1, 2, 3. Then prove **two** guards with
\`INSERT OR IGNORE\`: a duplicate \`(playlist_id, song_id)\` pair is rejected, and a fourth song
claiming an already-taken position is rejected. Playlist 1 must stay at exactly three rows.`,
    starterCode: `DROP TABLE IF EXISTS playlist_songs;

-- CREATE TABLE playlist_songs ( ... ) with:
--   PRIMARY KEY (playlist_id, song_id)
--   position INTEGER NOT NULL
--   no two songs may share the same position slot in one playlist
-- INSERT three rows into playlist 1 at positions 1, 2, 3 ...
-- INSERT OR IGNORE a repeat of an existing (playlist, song) pair; it should be skipped, not added ...
-- INSERT OR IGNORE a new song at a position already taken in that playlist; it should be skipped too ...`,
    hints: [
      "`PRIMARY KEY (playlist_id, song_id)` for the pair; separately `UNIQUE (playlist_id, position)` for slot uniqueness.",
      "`position INTEGER NOT NULL`. The ordering fact depends on both the playlist and the song, so it lives on the junction.",
      "Insert three rows in playlist 1 at positions 1, 2, 3; then `INSERT OR IGNORE` a repeat song (blocked by the PK) and a fourth song at position 1 (blocked by the position UNIQUE).",
      "Both `INSERT OR IGNORE` attempts should leave playlist 1 at exactly three rows.",
    ],
    seedSql: `DROP TABLE IF EXISTS playlist_songs; DROP TABLE IF EXISTS playlists; DROP TABLE IF EXISTS songs;
CREATE TABLE playlists (playlist_id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE songs (song_id INTEGER PRIMARY KEY, title TEXT);
INSERT INTO playlists VALUES (1,'Focus'),(2,'Party');
INSERT INTO songs VALUES (100,'A'),(101,'B'),(102,'C'),(103,'D');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "playlist_songs has a composite (two-column) primary key",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('playlist_songs') WHERE pk>0) <> 2`,
      },
      {
        suite: "schema",
        name: "position is a NOT NULL relationship attribute",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('playlist_songs') WHERE name='position' AND "notnull"=1) <> 1`,
      },
      {
        suite: "constraints",
        name: "a second UNIQUE index (playlist_id, position) guards the slot",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_index_list('playlist_songs') WHERE "unique"=1) < 2`,
      },
      {
        suite: "dedup",
        name: "playlist 1 holds exactly three songs (both duplicate attempts were ignored)",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM playlist_songs WHERE playlist_id=1) <> 3`,
      },
    ],
  }),
}

const indexes: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-indexes",
  title: "Indexes: Speeding Up Reads",
  summary: "Add B-tree indexes on the columns queries actually filter and join on.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: [
    "CREATE INDEX",
    "indexing FK / WHERE / JOIN / ORDER BY columns",
    "read vs write trade-off",
  ],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Indexes turn scans into seeks

An **index** is a sorted secondary structure (a B-tree) that lets the database *seek* directly to
matching rows instead of *scanning* every row. On a filter like \`WHERE customer_id = 42\`, an index
on \`customer_id\` turns an O(n) table scan into an O(log n) seek. The columns worth indexing are
exactly the ones queries **filter, join, and sort on**:

- **FK columns**: you join on them constantly.
- **\`WHERE\` predicate columns**: the selective filters.
- **\`ORDER BY\` / \`GROUP BY\` columns**: an index can supply pre-sorted rows.

**What is auto-indexed for free.** A \`UNIQUE\` constraint and every \`PRIMARY KEY\` *except* a
single-column \`INTEGER PRIMARY KEY\` create an index automatically, so you rarely index those
yourself. The exception matters: a single-column \`INTEGER PRIMARY KEY\` **is** the table's \`rowid\`, so
seeking by it is already fast and SQLite creates **no separate index object** for it (\`pragma_index_list\`
shows nothing). Either way you index the *other* hot columns, especially FKs, which are **not**
auto-indexed in SQLite.

### Worked example

\`\`\`sql
-- fact_sales is joined to dim_customer on customer_sk all day long
CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_sk);

-- a mart repeatedly filters events by date
CREATE INDEX idx_events_date ON raw_events(event_date);
\`\`\`

**Anatomy:**

\`\`\`
CREATE INDEX  idx_fact_sales_customer  ON fact_sales (customer_sk)
                    │                        │            │
              index name (convention:      table      indexed column(s)
              idx_<table>_<col>)                   (multi-col = composite index)
\`\`\`

A **composite index** \`(a, b)\` speeds filters on \`a\` and on \`a, b\` together (the leftmost-prefix
rule), but not on \`b\` alone.

### The trade-off: indexes cost writes

Every index must be *updated* on every \`INSERT\` / \`UPDATE\` / \`DELETE\`. More indexes = faster reads,
slower writes, more storage. So **index selectively**: the FK and filter columns queries actually
use, not every column "just in case."

> **In the warehouse this differs, a lot.** Columnar warehouses (Snowflake, BigQuery) generally
> **don't have traditional B-tree indexes** at all; they rely on columnar storage, partitioning,
> clustering keys, and micro-partition pruning. \`CREATE INDEX\` is a row-store
> (SQLite / Postgres / MySQL) concept. The *principle* (help the engine skip data instead of
> scanning) carries over, but the mechanism is partition/cluster design, not indexes.

**Common pitfall: over-indexing.** An index on a column no query filters on is pure write-cost with
zero read benefit. Before adding one, name the query it helps. The second pitfall: forgetting FKs
aren't auto-indexed in SQLite. An unindexed FK makes every join scan. Leave a comment on
non-obvious indexes explaining the query they serve.

**Recap:** indexes turn scans into seeks on filter/join/sort columns; \`UNIQUE\` and most \`PRIMARY KEY\`s
are auto-indexed (a single-column \`INTEGER PRIMARY KEY\` needs none, it *is* the \`rowid\`) but FKs are
not: index those, index selectively because every index taxes writes, and remember warehouses use
partitioning/clustering instead.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB,
then hidden assertion queries inspect the indexes you created via \`pragma_index_list\` /
\`pragma_index_info\`.`,
    demoSeedSql: `CREATE TABLE orders_unindexed (order_id INTEGER PRIMARY KEY, customer_id INTEGER, total_cents INTEGER);
CREATE TABLE orders_indexed   (order_id INTEGER PRIMARY KEY, customer_id INTEGER, total_cents INTEGER);
INSERT INTO orders_unindexed (customer_id, total_cents) VALUES (42, 1000), (7, 500), (42, 250);
INSERT INTO orders_indexed   (customer_id, total_cents) VALUES (42, 1000), (7, 500), (42, 250);
CREATE INDEX idx_orders_indexed_customer ON orders_indexed(customer_id);`,
    demoCode: `-- The SAME filter against two identical tables. Only orders_indexed has an index on customer_id.
-- Read the detail column: the unindexed table SCANs every row, the indexed one SEARCHes straight to
-- the match. The COMPOUND QUERY / UNION ALL rows are just the scaffolding that stacks the two.
EXPLAIN QUERY PLAN
SELECT * FROM orders_unindexed WHERE customer_id = 42
UNION ALL
SELECT * FROM orders_indexed   WHERE customer_id = 42;`,
  },
  apply: scriptExercise({
    id: "sql-l3-indexes-apply",
    prompt: `A \`fact_sales\` table is joined to \`dim_customer\` on \`customer_sk\` in every mart, but
\`customer_sk\` is a plain column, **not** the primary key, so SQLite has not auto-indexed it and the
join scans all 500 rows. Add the one index that turns that join into a seek.

You only need to **create the index**. The seed already loaded the 500 rows, and the grader checks
that an index exists on the right column of \`fact_sales\`.`,
    starterCode: `-- fact_sales(customer_sk) is the FK the marts join on, and it is NOT auto-indexed.
-- Add the index that makes that join a seek (convention: idx_<table>_<col>):

-- Create that index on fact_sales, naming it by the idx_<table>_<col> convention ...`,
    hints: [
      "One `CREATE INDEX` statement is all you need. Which column do the marts join `fact_sales` on?",
      "Name it `idx_<table>_<col>` by convention.",
      "`customer_sk` is a plain FK-style column, not the PK, so it isn't auto-indexed; `sale_id` is the `INTEGER PRIMARY KEY` (the `rowid`), so PK lookups are already fast without a separate index.",
    ],
    referenceSolution: `CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_sk);`,
    seedSql: `DROP TABLE IF EXISTS fact_sales;
CREATE TABLE fact_sales (sale_id INTEGER PRIMARY KEY, customer_sk INTEGER, revenue_cents INTEGER);
INSERT INTO fact_sales (customer_sk, revenue_cents)
SELECT (value % 50) + 1, value * 10
FROM (WITH RECURSIVE n(value) AS (
    SELECT 1 UNION ALL SELECT value + 1 FROM n WHERE value < 500
) SELECT value FROM n);`,
    assertions: [
      {
        suite: "indexes",
        name: "an index on fact_sales(customer_sk) exists",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_index_list('fact_sales') AS il
          JOIN pragma_index_info(il.name) AS ii
          WHERE ii.name = 'customer_sk'
        ) < 1`,
      },
      {
        suite: "data",
        name: "the 500 seeded fact_sales rows are left intact",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM fact_sales) <> 500`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-indexes-practice",
    prompt: `You're given a slow three-table mart (seeded for you). The dashboard runs a
\`fact_sales → dim_customer → dim_product\` join, filtered by \`dim_product.category\` and sorted by
\`order_date\`. Add the **two indexes that matter** and deliberately **skip the ones that don't**:

- Add an index on \`fact_sales(customer_sk)\`: an FK join column.
- Add an index on \`fact_sales(product_sk)\`: an FK join column.
- Do **not** index \`revenue_cents\` (never filtered or joined) or \`dim_product.product_sk\` (already
  the PK, auto-indexed).
- Add a SQL \`--\` comment noting each index taxes every \`INSERT\` / \`UPDATE\` / \`DELETE\`, which is why
  you index selectively.`,
    starterCode: `-- Index the two FK join columns on fact_sales, and nothing else.
-- Then leave a comment explaining the write-cost trade-off.

-- Create an index for the customer_sk join column ...
-- Create an index for the product_sk join column ...`,
    hints: [
      "Two `CREATE INDEX` statements, one per FK column on `fact_sales`.",
      "Skip `revenue_cents`: no query filters or joins on it, so an index there is pure write cost.",
      "`product_sk` on `dim_product` is the PK: already indexed; don't duplicate it.",
      "Add a `--` comment noting every index slows `INSERT` / `UPDATE` / `DELETE` on `fact_sales`.",
    ],
    seedSql: `DROP TABLE IF EXISTS fact_sales;
DROP TABLE IF EXISTS dim_customer;
DROP TABLE IF EXISTS dim_product;
CREATE TABLE dim_customer (customer_sk INTEGER PRIMARY KEY, email TEXT);
CREATE TABLE dim_product (product_sk INTEGER PRIMARY KEY, category TEXT);
CREATE TABLE fact_sales (
    sale_id INTEGER PRIMARY KEY,
    customer_sk INTEGER,
    product_sk INTEGER,
    order_date TEXT,
    revenue_cents INTEGER
);`,
    assertions: [
      {
        suite: "indexes",
        name: "an index on fact_sales(customer_sk) exists",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_index_list('fact_sales') AS il
          JOIN pragma_index_info(il.name) AS ii
          WHERE ii.name = 'customer_sk'
        ) < 1`,
      },
      {
        suite: "indexes",
        name: "an index on fact_sales(product_sk) exists",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_index_list('fact_sales') AS il
          JOIN pragma_index_info(il.name) AS ii
          WHERE ii.name = 'product_sk'
        ) < 1`,
      },
      {
        suite: "selectivity",
        name: "no index was wasted on revenue_cents",
        isHidden: true,
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM pragma_index_list('fact_sales') AS il
          JOIN pragma_index_info(il.name) AS ii
          WHERE ii.name = 'revenue_cents'
        ) <> 0`,
      },
    ],
  }),
}

const dimensionalIntro: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l3-dimensional-intro",
  title: "Facts, Dimensions, and Grain",
  summary: "Split analytics data into a narrow fact and wide dimensions around a declared grain.",
  estimatedMinutes: 35,
  difficulty: "hard",
  skills: ["fact vs dimension", "grain declaration", "surrogate keys", "star vs snowflake"],
  teach: {
    estimatedMinutes: 10,
    markdown: `## Two kinds of table, one shape

Full 3NF is great for safe writes but painful for analytics: a "revenue by category by month" report might join six tables. The **star schema** (Ralph Kimball's dimensional model) is the disciplined denormalization that BI runs on. It has exactly two kinds of table:

- **Fact table**: *narrow and tall*. Holds the **measures** (numeric, additive things you sum: revenue, quantity) plus **foreign keys** to dimensions. One fact table, millions of rows, few columns. \`fact_sales(customer_sk, product_sk, date_sk, quantity, revenue_cents)\`.
- **Dimension tables**: *wide and short*. Hold the **descriptive context** you filter and group by: \`dim_customer(customer_sk, name, country, segment)\`, \`dim_product(product_sk, name, category, brand)\`, \`dim_date(date_sk, date, month, year, weekday)\`.

Drawn out, the fact sits in the center with dimensions radiating around it, hence the name **star schema**:

\`\`\`csdiagram
{
  "type": "er",
  "tables": [
    {
      "name": "dim_customer",
      "columns": [
        {
          "name": "customer_sk",
          "key": "pk"
        },
        {
          "name": "name"
        },
        {
          "name": "country"
        }
      ]
    },
    {
      "name": "dim_date",
      "columns": [
        {
          "name": "date_sk",
          "key": "pk"
        },
        {
          "name": "year_month"
        }
      ]
    },
    {
      "name": "fact_sales",
      "columns": [
        {
          "name": "sale_sk",
          "key": "pk"
        },
        {
          "name": "customer_sk",
          "key": "fk"
        },
        {
          "name": "date_sk",
          "key": "fk"
        },
        {
          "name": "product_sk",
          "key": "fk"
        },
        {
          "name": "revenue_cents"
        }
      ]
    },
    {
      "name": "dim_product",
      "columns": [
        {
          "name": "product_sk",
          "key": "pk"
        },
        {
          "name": "category"
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "fact_sales",
      "to": "dim_customer",
      "kind": "n-1",
      "label": "customer_sk"
    },
    {
      "from": "fact_sales",
      "to": "dim_date",
      "kind": "n-1",
      "label": "date_sk"
    },
    {
      "from": "fact_sales",
      "to": "dim_product",
      "kind": "n-1",
      "label": "product_sk"
    }
  ],
  "caption": "Star schema: a narrow fact_sales (measures + *_sk FKs at one declared grain) surrounded by wide surrogate-keyed dimensions."
}
\`\`\`

## Grain: declare it first, always

The **grain** is the precise meaning of one fact row: "one row per order line item," or "one row per order," or "one row per customer per day." *Everything* depends on getting this right: a measure only makes sense at a stated grain, and mixing grains double-counts. Kimball's first rule: **declare the grain before you add a single column.** Our fact's grain: **one row per order line item.**

**Worked example, a minimal star:**

\`\`\`sql
-- Dimensions: wide, descriptive, surrogate-keyed
CREATE TABLE dim_product (
    product_sk   INTEGER PRIMARY KEY,   -- surrogate
    product_id   INTEGER,               -- natural/business key
    product_name TEXT,
    category     TEXT
);
CREATE TABLE dim_date (
    date_sk INTEGER PRIMARY KEY,        -- e.g. 20260105
    date    TEXT,
    year_month TEXT                     -- 'YYYY-MM'
);
-- Fact: narrow, measures + FKs to dims, at line-item grain
CREATE TABLE fact_sales (
    sale_sk    INTEGER PRIMARY KEY,
    product_sk INTEGER REFERENCES dim_product(product_sk),
    date_sk    INTEGER REFERENCES dim_date(date_sk),
    quantity   INTEGER,
    revenue_cents INTEGER
);
\`\`\`

A BI query is now a couple of joins from the fact out to the dims:

\`\`\`sql
SELECT p.category, d.year_month, SUM(f.revenue_cents) AS revenue
FROM fact_sales f
JOIN dim_product p ON p.product_sk = f.product_sk
JOIN dim_date    d ON d.date_sk    = f.date_sk
GROUP BY p.category, d.year_month;
\`\`\`

**Anatomy of the star:**

\`\`\`
          dim_customer
                │
 dim_date ── fact_sales ── dim_product
                │
          (measures: quantity, revenue_cents; FKs: *_sk)

  fact  = numeric measures + dimension FKs, at ONE declared grain
  dim   = descriptive attributes you filter/group by, surrogate-keyed
\`\`\`

## Star vs snowflake

A **star** keeps each dimension flat (denormalized): \`dim_product\` holds \`category\` right on it. A **snowflake** normalizes dimensions further (\`dim_product → dim_category\`), saving space but re-introducing joins. Kimball's default is **star**: flatter dims, fewer joins, faster and simpler for analysts. Snowflake only when a dimension is huge and its sub-attributes are heavily reused.

**Surrogate keys everywhere.** Dimensions use surrogate \`*_sk\` keys, and the fact references *those*, not the business keys. This is what makes slowly-changing dimensions possible later: the surrogate can point at the *version* of a dimension valid when the fact happened.

> **In the warehouse this differs. This is the warehouse's home turf.** Star schemas are the native modeling pattern of Snowflake, BigQuery, Redshift, and dbt projects. The SQL you write here is exactly what you'd write there (minus the un-enforced FKs). \`dim_date\` in particular is a warehouse staple: a pre-built calendar dimension every fact joins to.

**Keep it readable / common pitfall.** The #1 pitfall is **not declaring the grain** and then mixing grains in one fact (e.g. line-item rows *and* order-total rows). Every sum double-counts. State the grain in a comment at the top of the fact DDL. Second pitfall: stuffing descriptive text into the fact ("just this once"). Descriptions belong in dimensions; the fact stays numeric and narrow.

**Recap:** a star schema is one narrow measure-and-FK fact surrounded by wide descriptive dimensions, all surrogate-keyed, around a single declared grain: the model BI queries are built for; default to star (flat dims) over snowflake.

**Execution mode:** you write a multi-statement DDL+DML script. It runs against a fresh in-memory SQLite DB, then hidden assertion queries check the star's shape, grain, and that every fact FK resolves.`,
  },
  apply: scriptExercise({
    id: "sql-l3-dimensional-intro-apply",
    prompt: `Build a minimal **star schema**. Create \`dim_product\` with a surrogate key \`product_sk\`
(plus the business key \`product_id\`, and \`name\`, \`category\`), and a narrow \`fact_sales\` at
**one-row-per-sale grain** that references \`dim_product\` via \`product_sk\` and carries only \`quantity\` and
\`revenue_cents\`. Load the two products and three sales from the \`raw_*\` seed, then materialize the BI
query "revenue by category" as a table named \`cat_revenue(category, revenue)\`.`,
    starterCode: `-- Seed tables raw_product and raw_sale already exist.
DROP TABLE IF EXISTS dim_product;
DROP TABLE IF EXISTS fact_sales;
DROP TABLE IF EXISTS cat_revenue;

-- 1. dim_product: surrogate product_sk PK + business key product_id, name, category.
--    Load it from raw_product (let product_sk auto-assign).

-- 2. fact_sales at one-row-per-sale grain: sale_sk PK, a product_sk FK to dim_product,
--    quantity, revenue_cents. Populate it from raw_sale, resolving each sale's product_sk ...

-- 3. cat_revenue: materialize revenue-by-category from the star.`,
    hints: [
      "`dim_product(product_sk INTEGER PRIMARY KEY, product_id INTEGER, name TEXT, category TEXT)`. Load it from `raw_product` (let `product_sk` auto-assign).",
      "Load `fact_sales` by joining `raw_sale` to `dim_product` on `product_id` to look up the `product_sk`.",
      "The fact holds only `product_sk`, `quantity`, `revenue_cents`: no category text.",
      "Materialize the BI result as `cat_revenue` (e.g. `CREATE TABLE cat_revenue AS SELECT p.category, SUM(f.revenue_cents) AS revenue FROM fact_sales f JOIN dim_product p … GROUP BY p.category`).",
    ],
    referenceSolution: `DROP TABLE IF EXISTS dim_product;
DROP TABLE IF EXISTS fact_sales;
DROP TABLE IF EXISTS cat_revenue;

CREATE TABLE dim_product (
    product_sk INTEGER PRIMARY KEY,
    product_id INTEGER,
    name       TEXT,
    category   TEXT
);
INSERT INTO dim_product (product_id, name, category)
SELECT product_id, name, category FROM raw_product;

-- grain: one row per sale
CREATE TABLE fact_sales (
    sale_sk    INTEGER PRIMARY KEY,
    product_sk INTEGER REFERENCES dim_product(product_sk),
    quantity   INTEGER,
    revenue_cents INTEGER
);
INSERT INTO fact_sales (product_sk, quantity, revenue_cents)
SELECT d.product_sk, r.quantity, r.revenue_cents
FROM raw_sale r
JOIN dim_product d ON d.product_id = r.product_id;

CREATE TABLE cat_revenue AS
SELECT p.category, SUM(f.revenue_cents) AS revenue
FROM fact_sales f
JOIN dim_product p ON p.product_sk = f.product_sk
GROUP BY p.category;`,
    seedSql: `DROP TABLE IF EXISTS raw_product; DROP TABLE IF EXISTS raw_sale;
CREATE TABLE raw_product (product_id INTEGER, name TEXT, category TEXT);
CREATE TABLE raw_sale (product_id INTEGER, quantity INTEGER, revenue_cents INTEGER);
INSERT INTO raw_product VALUES (100,'Mouse','peripherals'),(101,'Monitor','displays');
INSERT INTO raw_sale VALUES (100,2,4998),(101,1,19999),(100,3,7497);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "dim_product declares a surrogate primary key (product_sk)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('dim_product') WHERE name='product_sk' AND pk=1) <> 1`,
      },
      {
        suite: "schema",
        name: "dim_product keeps the business key product_id",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('dim_product') WHERE name='product_id') <> 1`,
      },
      {
        suite: "star",
        name: "fact_sales references dim_product via the surrogate key",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_foreign_key_list('fact_sales') WHERE "table"='dim_product') <> 1`,
      },
      {
        suite: "star",
        name: "fact_sales stays narrow: no descriptive text columns",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('fact_sales') WHERE name IN ('category','name')) <> 0`,
      },
      {
        suite: "bi",
        name: "revenue-by-category: peripherals = 12495 (4998 + 7497)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT revenue FROM cat_revenue WHERE category='peripherals'), -1) <> 12495`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l3-dimensional-intro-practice",
    prompt: `Convert the normalized 3NF seed (\`customers\`, \`products\`, \`orders\`, \`order_items\`) into a
**first star schema**:

- \`dim_customer(customer_sk PK, customer_id, email, country_code)\`
- \`dim_product(product_sk PK, product_id, product_name, category)\`
- \`dim_date(date_sk PK, full_date, year_month)\`: derive \`date_sk\` as an integer \`YYYYMMDD\`,
  \`year_month\` as \`'YYYY-MM'\`, one row per **distinct** order date.
- \`fact_sales\` at **line-item grain**: \`(sale_sk PK, customer_sk, product_sk, date_sk, quantity, revenue_cents)\`,
  each FK looked up from its dimension by natural key, with **zero orphan facts**.

Then materialize one BI query as \`revenue_by_cat_month(category, year_month, revenue)\` computing revenue
by category by month over the star.`,
    starterCode: `-- Normalized seed tables customers, products, orders, order_items already exist.
DROP TABLE IF EXISTS dim_customer;
DROP TABLE IF EXISTS dim_product;
DROP TABLE IF EXISTS dim_date;
DROP TABLE IF EXISTS fact_sales;
DROP TABLE IF EXISTS revenue_by_cat_month;

-- 1. Build the three dimensions (surrogate *_sk PKs) and load them FIRST.
--    dim_date: one row per DISTINCT order date, date_sk = YYYYMMDD, year_month = 'YYYY-MM'.

-- 2. fact_sales at line-item grain: measures + FKs only, each surrogate looked up by natural key.
--    revenue_cents is each line's quantity times its product's unit price. Zero orphan facts.

-- 3. revenue_by_cat_month(category, year_month, revenue): BI query over the star.`,
    hints: [
      "Load dims first so their surrogate keys exist before the fact looks them up: `dim_customer`/`dim_product` from the normalized tables; `dim_date` from `SELECT DISTINCT order_date`, deriving `date_sk = CAST(strftime('%Y%m%d', order_date) AS INTEGER)` and `year_month = strftime('%Y-%m', order_date)`.",
      "Compute `revenue_cents` at load as `oi.qty * p.unit_price_cents` (join `order_items` to `products`).",
      "Build the fact by joining `order_items → orders → products` and then looking up each surrogate: join to `dim_customer` on `customer_id`, `dim_product` on `product_id`, `dim_date` on the order date. Insert `customer_sk`, `product_sk`, `date_sk`: never the natural keys or any text.",
      'Declare the grain in a comment ("one row per order line item") and keep the fact to measures + FKs only; the zero-orphan assertions fail if any surrogate lookup misses, so make sure all three dims are fully populated before loading the fact.',
    ],
    seedSql: `DROP TABLE IF EXISTS customers; DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS order_items;
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, email TEXT, country_code TEXT);
CREATE TABLE products (product_id INTEGER PRIMARY KEY, product_name TEXT, category TEXT, unit_price_cents INTEGER);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT);
CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER, PRIMARY KEY(order_id,product_id));
INSERT INTO customers VALUES (10,'ada@x.com','GB'),(11,'grace@x.com','US');
INSERT INTO products VALUES (100,'Mouse','peripherals',2499),(101,'Monitor','displays',19999);
INSERT INTO orders VALUES (1,10,'2026-01-05'),(2,11,'2026-02-06'),(3,10,'2026-02-07');
INSERT INTO order_items VALUES (1,100,2),(1,101,1),(2,100,1),(3,101,2);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "schema",
        name: "all three dimensions declare a surrogate primary key",
        sql: `SELECT 1 WHERE
          (SELECT COUNT(*) FROM pragma_table_info('dim_customer') WHERE name='customer_sk' AND pk=1) <> 1
          OR (SELECT COUNT(*) FROM pragma_table_info('dim_product') WHERE name='product_sk' AND pk=1) <> 1
          OR (SELECT COUNT(*) FROM pragma_table_info('dim_date') WHERE name='date_sk' AND pk=1) <> 1`,
      },
      {
        suite: "grain",
        name: "dim_date has one row per distinct order date (3)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_date) <> 3`,
      },
      {
        suite: "grain",
        name: "fact_sales is at line-item grain (4 rows, one per order item)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM fact_sales) <> 4`,
      },
      {
        suite: "integrity",
        name: "zero orphan facts: every dimension FK resolves",
        isHidden: true,
        sql: `SELECT 1 WHERE
          (SELECT COUNT(*) FROM fact_sales f LEFT JOIN dim_customer c ON c.customer_sk = f.customer_sk WHERE c.customer_sk IS NULL) <> 0
          OR (SELECT COUNT(*) FROM fact_sales f LEFT JOIN dim_product p ON p.product_sk = f.product_sk WHERE p.product_sk IS NULL) <> 0
          OR (SELECT COUNT(*) FROM fact_sales f LEFT JOIN dim_date d ON d.date_sk = f.date_sk WHERE d.date_sk IS NULL) <> 0`,
      },
      {
        suite: "star",
        name: "fact_sales stays narrow: no descriptive text leaked in",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM pragma_table_info('fact_sales') WHERE name IN ('category','email','product_name')) <> 0`,
      },
      {
        suite: "bi",
        name: "revenue by category by month matches the star",
        isHidden: true,
        sql: `SELECT 1 WHERE
          COALESCE((SELECT revenue FROM revenue_by_cat_month WHERE category='peripherals' AND year_month='2026-02'), -1) <> 2499
          OR COALESCE((SELECT revenue FROM revenue_by_cat_month WHERE category='displays' AND year_month='2026-01'), -1) <> 19999`,
      },
    ],
  }),
}

export const sqlLevel3: SqlLevel = {
  id: 3,
  slug: "modeling",
  title: "Level 3: Data Modeling & Schema Design",
  tagline: "DDL, keys, constraints, and normalization: designing schemas the database enforces.",
  defaultExecutionMode: "workspace",
  estimatedHours: 6,
  modules: [
    {
      id: "sql-l3-ddl",
      title: "Module 3.1: DDL, Types, and Loading Data",
      description:
        "The two verbs every pipeline is built on: CREATE TABLE to define, INSERT to fill.",
      lessons: [ddlCreate, insertPopulate],
    },
    {
      id: "sql-l3-keys",
      title: "Module 3.2: Keys and Constraints",
      description:
        "Primary and foreign keys, UNIQUE / NOT NULL / CHECK: the rules the database enforces so bad rows can never land.",
      lessons: [primaryKeys, foreignKeys, constraints],
    },
    {
      id: "sql-l3-normalization",
      title: "Module 3.3: Normalization",
      description:
        "From a flat export to 3NF and back: atomic values, removing redundancy, and deliberate denormalization for analytics.",
      lessons: [normalize1nf, normalize2nf3nf, denormalization],
    },
    {
      id: "sql-l3-er-indexes",
      title: "Module 3.4: ER Modeling, Relationships, and Indexes",
      description:
        "Entities and cardinality, junction tables for many-to-many, and the indexes that keep reads fast.",
      lessons: [cardinality, junctionTables, indexes],
    },
    {
      id: "sql-l3-dimensional",
      title: "Module 3.5: Dimensional Modeling Introduction",
      description: "Your first Kimball star: narrow facts, wide dimensions, and a declared grain.",
      lessons: [dimensionalIntro],
    },
  ],
}

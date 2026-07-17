import type { SqlLevel } from "@/lib/tutorials/types"

const selectColumns: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-select-columns",
  title: "SELECT and Column Aliasing",
  summary: "Pull specific columns from a raw table and rename them to clean, model-ready names.",
  estimatedMinutes: 12,
  difficulty: "easy",
  skills: ["SELECT", "column projection", "AS aliasing"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why a DE almost never ships \`SELECT *\`

When a raw table lands in the warehouse, its columns are named whatever the source system chose: \`ord_id\`, \`cust_nm\`, \`amt_c\`. Those names are cryptic, and they can change without warning. The first transform a data engineer writes, the **staging model**, selects only the columns downstream needs and renames each to a clean, predictable convention (usually \`snake_case\`).

\`SELECT *\` is the opposite of that discipline. It drags every column downstream, silently gains a column the moment the source adds one, and hides which fields your model actually depends on. Explicit projection is a **contract**: it documents exactly what you consume and insulates you from upstream churn. That is why the Apply and Practice exercises ask you to name each column and drop the ones a mart does not need (\`ord_status\`, \`internal_flag\`).

## What \`SELECT\` and \`AS\` actually do

\`SELECT\` is the **projection** operator: it chooses which columns come back and in what order. It works row by row and never changes how many rows you get. Filtering rows is \`WHERE\`'s job; setting the grain is \`GROUP BY\`'s job. Projection only reshapes the columns.

\`AS\` renames a column in the output. The alias becomes the output column's name, independent of what the source called it. Downstream models bind to your stable alias, not the source's cryptic identifier.

\`\`\`sql
SELECT
  ord_id  AS order_id,
  cust_id AS customer_id,
  amt_c   AS amount_cents
FROM orders;
\`\`\`

Against the seed rows, that returns:

\`\`\`text
order_id | customer_id | amount_cents
1001     | 7           | 4999
1002     | 7           | 1250
1003     | 9           | 10000
\`\`\`

Three input columns become three cleanly named output columns. \`ord_status\` is simply not projected, so it never reaches downstream. Note the amounts are in cents (\`4999\` is 49.99), which is exactly why the alias \`amount_cents\` is worth writing: it encodes the unit for whoever reads the model next.

### Pitfall: a missing comma silently drops a column

\`AS\` is optional in SQL. \`ord_id order_id\` means the same as \`ord_id AS order_id\`. That convenience is a trap. If you forget a comma between two columns, the query still runs:

\`\`\`sql
SELECT ord_id cust_id FROM orders;   -- one column named cust_id, holding ord_id values
\`\`\`

SQLite reads \`cust_id\` as the alias of \`ord_id\`, so you get a single column named \`cust_id\` full of order-id values, and no error. The fix is a comma between every projected column. When a projection returns fewer columns than you expected, a swallowed comma is the first thing to check.

**Interview nuance:** SQL's written order is not its execution order. The engine logically evaluates \`FROM\` and \`WHERE\` before it projects the \`SELECT\` list, so a \`SELECT\`-list alias is not yet visible in the same query's \`WHERE\` clause. In the SQL standard, and in PostgreSQL, MySQL, and SQL Server, \`SELECT amt_c AS amount_cents FROM orders WHERE amount_cents > 2000\` fails there with an unknown-column error. SQLite, the engine behind this lesson, is unusually lenient and resolves the alias anyway, so that exact query happens to run here. The portable habit is to filter on the real column, \`WHERE amt_c > 2000\`. Interviewers ask about alias-in-\`WHERE\` to check that you understand logical query order, and that engines differ on it.`,
    demoCode: `SELECT
  ord_id  AS order_id,
  cust_id AS customer_id,
  amt_c   AS amount_cents
FROM orders;`,
    demoSeedSql: `CREATE TABLE orders (
  ord_id     INTEGER,
  cust_id    INTEGER,
  ord_status TEXT,
  amt_c      INTEGER
);
INSERT INTO orders (ord_id, cust_id, ord_status, amt_c) VALUES
  (1001, 7, 'paid',     4999),
  (1002, 7, 'shipped',  1250),
  (1003, 9, 'paid',    10000);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-select-columns-apply",
    executionMode: "single-file",
    prompt: `Project three columns from \`orders\` and alias them to clean snake_case model names:

- \`ord_id\` → \`order_id\`
- \`cust_id\` → \`customer_id\`
- \`amt_c\` → \`amount_cents\`

Do **not** include \`ord_status\`.`,
    starterCode: `-- Project ord_id, cust_id, amt_c from orders with clean aliases.
SELECT

FROM orders;`,
    hints: [
      "You only need `SELECT ... FROM orders;` (no WHERE, no sorting).",
      "Name exactly three columns, comma-separated, each followed by `AS <clean_name>`.",
      "Leave `ord_status` out of the projection entirely.",
      "Watch your commas: one after each alias except the last.",
    ],
    referenceSolution: `SELECT
  ord_id  AS order_id,
  cust_id AS customer_id,
  amt_c   AS amount_cents
FROM orders;`,
    singleFile: {
      seedSql: `CREATE TABLE orders (
  ord_id     INTEGER,
  cust_id    INTEGER,
  ord_status TEXT,
  amt_c      INTEGER
);
INSERT INTO orders (ord_id, cust_id, ord_status, amt_c) VALUES
  (1001, 7, 'paid',     4999),
  (1002, 7, 'shipped',  1250),
  (1003, 9, 'paid',    10000);`,
      orderMatters: false,
      assertColumnNames: true,
      expected: {
        columns: ["order_id", "customer_id", "amount_cents"],
        rows: [
          [1001, 7, 4999],
          [1002, 7, 1250],
          [1003, 9, 10000],
        ],
      },
    },
  },
  practice: {
    id: "sql-l1-select-columns-practice",
    executionMode: "single-file",
    prompt: `You're standing up the \`stg_orders\` staging model, and every downstream mart depends on it exposing clean, renamed columns. Write a query over \`orders_raw\` that returns six columns, each raw column renamed to the warehouse alias below and kept in exactly this order; **drop** \`internal_flag\`:

| raw column | output alias |
|---|---|
| \`ord_id\` | \`order_id\` |
| \`cust_id\` | \`customer_id\` |
| \`ord_status\` | \`order_status\` |
| \`amt_c\` | \`amount_cents\` |
| \`ship_region\` | \`region\` |
| \`ord_ts\` | \`ordered_at\` |`,
    starterCode: `-- Six aliased columns from orders_raw, in the order given. Drop internal_flag.
SELECT

FROM orders_raw;`,
    hints: [
      "Six columns in the projection, `internal_flag` omitted. That's the whole shape.",
      "The output column order is graded; list them top-to-bottom exactly as specified.",
      "Every raw name changes; give all six an `AS` alias.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders_raw (
  ord_id        INTEGER,
  cust_id       INTEGER,
  ord_status    TEXT,
  amt_c         INTEGER,
  ship_region   TEXT,
  ord_ts        TEXT,
  internal_flag INTEGER
);
INSERT INTO orders_raw VALUES
  (2001, 31, 'paid',      8900, 'EU', '2026-03-01T09:14:00Z', 1),
  (2002, 44, 'cancelled', 1500, 'US', '2026-03-01T11:02:00Z', 0),
  (2003, 31, 'shipped',   2750, 'UK', '2026-03-02T15:40:00Z', 1),
  (2004, 58, 'paid',     12000, 'US', '2026-03-02T18:20:00Z', 0);`,
      orderMatters: false,
      assertColumnNames: true,
      expected: {
        columns: [
          "order_id",
          "customer_id",
          "order_status",
          "amount_cents",
          "region",
          "ordered_at",
        ],
        rows: [
          [2001, 31, "paid", 8900, "EU", "2026-03-01T09:14:00Z"],
          [2002, 44, "cancelled", 1500, "US", "2026-03-01T11:02:00Z"],
          [2003, 31, "shipped", 2750, "UK", "2026-03-02T15:40:00Z"],
          [2004, 58, "paid", 12000, "US", "2026-03-02T18:20:00Z"],
        ],
      },
    },
  },
}

const computedExpressions: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-expressions",
  title: "Computed Columns and Expressions",
  summary: "Derive new columns with arithmetic and concatenation instead of storing them.",
  estimatedMinutes: 12,
  difficulty: "easy",
  skills: [
    "arithmetic operators",
    "string concatenation (||)",
    "literal columns",
    "expression aliasing",
  ],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Derive, don't store

A row in \`order_items\` gives you \`qty\` and \`unit_price_cents\`, but there is no line-revenue column. You could ask the source system to store one, but then every write has to keep it in sync with its inputs forever, and the day someone updates \`qty\` without recomputing revenue, your table lies. The data-engineering default is to **derive the value at query time**: \`qty * unit_price_cents AS line_revenue_cents\`. The formula lives in one place, your model, and it can never drift from the columns it depends on.

The same logic applies to labels. Instead of storing a \`full_name\`, you build it on read with \`first_name || ' ' || last_name\`. One source of truth, computed when queried.

## An expression is a per-row computation

Each item in the \`SELECT\` list is an expression the engine evaluates once per row. A bare column like \`product_id\` is the simplest expression; \`qty * unit_price_cents\` is a richer one. The \`AS\` alias names the resulting output column. Nothing is written back to the table, so you are shaping the result set only.

Three building blocks cover most projections:

- **Arithmetic:** \`+\`, \`-\`, \`*\`, \`/\` operate on numeric columns and literals, row by row.
- **Concatenation:** \`||\` glues text together. You can splice in literal strings, so \`sku || ' (' || category_code || ')'\` yields values like \`SKU-AUDIO-01 (AUD)\`.
- **Literal columns:** a constant becomes the same value on every row: \`'ecommerce_raw' AS source_system\`.

> **In the warehouse this differs.** Postgres and Snowflake also use \`||\` for concatenation, but SQL Server uses \`+\` and BigQuery uses \`CONCAT()\`. \`||\` is the portable ANSI choice and what SQLite understands, so we author with it here.

## Worked example

\`\`\`sql
SELECT
  product_id,
  qty * unit_price_cents      AS line_revenue_cents,
  sku || '-' || category_code AS product_label,
  'ecommerce_raw'             AS source_system
FROM order_items;
\`\`\`

\`\`\`text
product_id  line_revenue_cents  product_label     source_system
----------  ------------------  ----------------  -------------
501         3000                SKU-AUDIO-01-AUD  ecommerce_raw
502         4999                SKU-AUDIO-02-AUD  ecommerce_raw
501         4500                SKU-AUDIO-01-AUD  ecommerce_raw
\`\`\`

Every column is \`expression AS output_name\`: \`qty * unit_price_cents\` is the expression, \`line_revenue_cents\` is the name it lands under.

## Pitfalls

**Integer division truncates.** When both operands are integers, SQLite does integer math, so \`unit_price_cents / 100\` on \`4999\` gives \`49\`, not \`49.99\`. Force a decimal by dividing by \`100.0\` (or multiplying one side by \`1.0\`). The result type is inferred from the operands, so one decimal operand is enough.

**\`NULL\` poisons the whole expression.** Any arithmetic or concatenation that touches a \`NULL\` returns \`NULL\`, so if \`last_name\` is \`NULL\`, then \`first_name || ' ' || last_name\` is \`NULL\`, not just the first name. Guard with \`COALESCE(last_name, '')\` when a missing part should not blank out the row.

**Always alias a computed column.** An un-aliased expression gets an unstable auto-name like \`qty * unit_price_cents\` that downstream code cannot rely on.

**Interview nuance:** aliases are minted in the \`SELECT\` step, which the engine logically evaluates *after* \`WHERE\` and \`GROUP BY\` but *before* \`ORDER BY\`. So in standard SQL (Postgres included) you cannot filter on \`line_revenue_cents\` by its alias in the same query's \`WHERE\`; you repeat the expression or wrap it in a subquery. \`ORDER BY line_revenue_cents\` works because ordering happens last. SQLite is lenient and will accept the alias in \`WHERE\`, but do not lean on that when portability matters.

\`\`\`csdiagram
{
  "type": "pipeline",
  "preset": "sql-select",
  "highlight": [
    "WHERE",
    "SELECT",
    "ORDER BY"
  ],
  "caption": "Logical execution order: WHERE runs before SELECT, so an alias like line_revenue_cents does not exist yet when WHERE is evaluated. ORDER BY runs after SELECT, which is why it can use the alias."
}
\`\`\``,
    demoCode: `SELECT
  product_id,
  qty * unit_price_cents      AS line_revenue_cents,
  sku || '-' || category_code AS product_label,
  'ecommerce_raw'             AS source_system
FROM order_items;`,
    demoSeedSql: `CREATE TABLE order_items (
  order_id         INTEGER,
  product_id       INTEGER,
  qty              INTEGER,
  unit_price_cents INTEGER,
  sku              TEXT,
  category_code    TEXT
);
INSERT INTO order_items VALUES
  (1001, 501, 2, 1500, 'SKU-AUDIO-01', 'AUD'),
  (1001, 502, 1, 4999, 'SKU-AUDIO-02', 'AUD'),
  (1002, 501, 3, 1500, 'SKU-AUDIO-01', 'AUD');`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-expressions-apply",
    executionMode: "single-file",
    prompt: `Project \`order_id\`, \`product_id\`, and \`qty\` from \`order_items\`, then add a computed
fourth column \`line_revenue_cents\` = \`qty * unit_price_cents\`. No filtering or sorting.`,
    starterCode: `-- Three plain columns from order_items, plus a computed line_revenue_cents.
SELECT

FROM order_items;`,
    hints: [
      "Select the three plain columns, then add a fourth that's an expression.",
      "The expression is `qty * unit_price_cents`; give it `AS line_revenue_cents`.",
      "No `WHERE` or sort needed.",
    ],
    referenceSolution: `SELECT
  order_id,
  product_id,
  qty,
  qty * unit_price_cents AS line_revenue_cents
FROM order_items;`,
    singleFile: {
      seedSql: `CREATE TABLE order_items (
  order_id         INTEGER,
  product_id       INTEGER,
  qty              INTEGER,
  unit_price_cents INTEGER
);
INSERT INTO order_items VALUES
  (1001, 501, 2, 1500),
  (1001, 502, 1, 4999),
  (1002, 501, 3, 1500);`,
      orderMatters: false,
      assertColumnNames: true,
      expected: {
        columns: ["order_id", "product_id", "qty", "line_revenue_cents"],
        rows: [
          [1001, 501, 2, 3000],
          [1001, 502, 1, 4999],
          [1002, 501, 3, 4500],
        ],
      },
    },
  },
  practice: {
    id: "sql-l1-expressions-practice",
    executionMode: "single-file",
    prompt: `Produce a source-preview projection over \`products\` with these output columns, in order:

- \`product_id\`
- \`unit_price_dollars\`: the price in dollars as a decimal (cents ÷ 100, **keep** the fractional part)
- \`label\`: the \`product_name\`, a space, an opening paren, the \`sku\`, and a closing paren, e.g.
  \`Wireless Earbuds (SKU-AUDIO-01)\`
- \`source_system\`: a hard-coded literal \`'ecommerce_raw'\` on every row`,
    starterCode: `-- product_id, a decimal price, a built label, and a literal source_system.
SELECT

FROM products;`,
    hints: [
      "To get decimals from integer cents, divide by `100.0`, not `100`.",
      "Build `label` with `||`: `product_name || ' (' || sku || ')'`.",
      "A bare string literal like `'ecommerce_raw'` becomes a constant column. Just alias it.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE products (
  product_id       INTEGER,
  sku              TEXT,
  product_name     TEXT,
  category_code    TEXT,
  unit_price_cents INTEGER
);
INSERT INTO products VALUES
  (501, 'SKU-AUDIO-01', 'Wireless Earbuds',    'AUD', 2999),
  (502, 'SKU-AUDIO-02', 'Over-Ear Headphones', 'AUD', 8900),
  (503, 'SKU-HOME-11',  'Desk Lamp',           'HOM', 4500);`,
      orderMatters: false,
      assertColumnNames: true,
      expected: {
        columns: ["product_id", "unit_price_dollars", "label", "source_system"],
        rows: [
          [501, 29.99, "Wireless Earbuds (SKU-AUDIO-01)", "ecommerce_raw"],
          [502, 89.0, "Over-Ear Headphones (SKU-AUDIO-02)", "ecommerce_raw"],
          [503, 45.0, "Desk Lamp (SKU-HOME-11)", "ecommerce_raw"],
        ],
      },
    },
  },
}

const whereBasics: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-where-basics",
  title: "WHERE and Comparison Operators",
  summary: "Restrict a scan to the rows a model actually needs.",
  estimatedMinutes: 10,
  difficulty: "easy",
  skills: ["WHERE", "= <> < > <= >=", "filtering on numbers and text"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Filter early, filter cheap

The cheapest row is the one you never process. A staging model that only cares about paid orders should drop everything else at the \`WHERE\` step, before any join, sort, or aggregate runs. \`WHERE\` evaluates a condition once per row and keeps only the rows where that condition is \`TRUE\`.

> **In the warehouse this differs.** Filtering early is the intuition behind **predicate pushdown**: the query planner tries to push your \`WHERE\` down to the source scan, so every downstream operator works on a smaller set. On a columnar warehouse a selective \`WHERE\` can also skip whole storage blocks it never has to read. \`WHERE\` is where that saving starts.

## The comparison operators

\`=\` (equal), \`<>\` or \`!=\` (not equal, where \`<>\` is the SQL-standard spelling), \`<\`, \`>\`, \`<=\`, \`>=\`. Text values go in single quotes (\`status = 'paid'\`); numbers are bare (\`total_cents >= 5000\`).

The boundary matters. \`>= 5000\` keeps a row whose total is exactly \`5000\`; \`> 0\` excludes a row whose total is exactly \`0\`. Choosing the wrong one is a classic off-by-one at the data layer. Combine conditions with \`AND\` (both must hold) or \`OR\` (either):

\`\`\`sql
SELECT order_id, status, total_cents
FROM orders
WHERE status = 'paid'
  AND total_cents >= 5000;
-- order_id | status | total_cents
--    1     | paid   |    9900
--    4     | paid   |    5000   <- passes because >= is inclusive
\`\`\`

Row 2 (\`paid\`, \`1500\`) fails the amount test; rows 3 and 5 fail the status test.

## Pitfall: single vs double quotes

Use single quotes for a string *value*. Double quotes mean *identifier* (a column or table name) in standard SQL. \`WHERE status = "paid"\` looks fine and even runs in SQLite, but only because there is no column named \`paid\`, so it quietly falls back to treating the text as a string. In Postgres the same query fails with \`column "paid" does not exist\`. Always write \`'paid'\`.

## When a filter drops rows you did not expect

**Interview nuance:** SQL uses three-valued logic. A predicate can be \`TRUE\`, \`FALSE\`, or \`UNKNOWN\`, and \`WHERE\` keeps a row only when the result is \`TRUE\`. Any comparison against \`NULL\` returns \`UNKNOWN\`, so if \`status\` is \`NULL\` for some rows, both \`status = 'paid'\` and \`status <> 'paid'\` drop them. That surprises people who assume a "not equal" filter returns everything that is not paid. To include or target those rows you need \`IS NULL\` / \`IS NOT NULL\`, which are separate operators. \`status = NULL\` never matches anything.

## Recap

\`WHERE col op value\` keeps rows where the condition is \`TRUE\`. Quote text with single quotes, decide whether your boundary is inclusive (\`>=\`) or strict (\`>\`), chain checks with \`AND\`, and remember that \`NULL\` satisfies neither \`=\` nor \`<>\`.`,
    demoCode: `SELECT order_id, status, total_cents
FROM orders
WHERE status = 'paid'
  AND total_cents >= 5000;`,
    demoSeedSql: `CREATE TABLE orders (
  order_id    INTEGER,
  status      TEXT,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, 'paid',      9900),
  (2, 'paid',      1500),
  (3, 'cancelled', 8000),
  (4, 'paid',      5000),
  (5, 'shipped',  12000);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-where-basics-apply",
    executionMode: "single-file",
    prompt: `Return \`order_id\`, \`status\`, \`total_cents\` for orders that are \`status = 'paid'\` **and** have \`total_cents >= 5000\`.`,
    starterCode: `-- Keep only paid orders worth at least 5000 cents
SELECT

FROM orders;`,
    hints: [
      "Two conditions joined by `AND`.",
      "`>=` is inclusive: `5000` qualifies.",
      "Quote the text value: `'paid'`.",
    ],
    referenceSolution: `SELECT order_id, status, total_cents
FROM orders
WHERE status = 'paid'
  AND total_cents >= 5000;`,
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER,
  status      TEXT,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, 'paid',      9900),
  (2, 'paid',      1500),
  (3, 'cancelled', 8000),
  (4, 'paid',      5000),
  (5, 'shipped',  12000);`,
      orderMatters: false,
      expected: {
        columns: ["order_id", "status", "total_cents"],
        rows: [
          [1, "paid", 9900],
          [4, "paid", 5000],
        ],
      },
    },
  },
  practice: {
    id: "sql-l1-where-basics-practice",
    executionMode: "single-file",
    prompt: `Extract the "processable" slice a staging model would keep: orders that are \`paid\`, have a **non-zero** total (\`total_cents > 0\`), and come from region \`EU\`. Return \`order_id\`, \`total_cents\`, \`region\`.`,
    starterCode: `-- Paid, non-zero total, EU region
SELECT

FROM orders;`,
    hints: [
      "Three conditions, all joined with `AND`.",
      '"Non-zero" is `total_cents > 0` (strictly greater, so the `0` row drops).',
      "The US paid row and the cancelled EU row must both be excluded.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER,
  status      TEXT,
  total_cents INTEGER,
  region      TEXT
);
INSERT INTO orders VALUES
  (1, 'paid',      9900, 'EU'),
  (2, 'paid',         0, 'EU'),
  (3, 'paid',      4200, 'US'),
  (4, 'cancelled', 7000, 'EU'),
  (5, 'paid',      6100, 'EU'),
  (6, 'shipped',   3000, 'EU');`,
      orderMatters: false,
      expected: {
        columns: ["order_id", "total_cents", "region"],
        rows: [
          [1, 9900, "EU"],
          [5, 6100, "EU"],
        ],
      },
    },
  },
}

const inBetweenLike: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-in-between-like",
  title: "IN, BETWEEN, and LIKE",
  summary: "Match sets, ranges, and text patterns when filtering source rows.",
  estimatedMinutes: 12,
  difficulty: "easy",
  skills: ["IN", "NOT IN", "BETWEEN", "LIKE", "% / _ wildcards"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Three shapes of filter

Beyond \`=\`, a data engineer constantly needs three more filter shapes:

- **Set membership** means "status is one of these": \`status IN ('paid','shipped')\` (cleaner than a chain of \`OR\`s).
- **Range** means "price in this band": \`unit_price_cents BETWEEN 1000 AND 5000\` (inclusive on both ends).
- **Pattern** means "SKU looks like this": \`sku LIKE 'AUD-%'\`. In \`LIKE\`, \`%\` matches any run of characters, \`_\` matches exactly one.

### Worked example

\`\`\`sql
SELECT product_id, sku, category_code, unit_price_cents
FROM products
WHERE category_code IN ('AUD','HOM')
  AND unit_price_cents BETWEEN 2000 AND 9000
  AND sku LIKE 'SKU-%';
\`\`\`

### Anatomy

\`\`\`
category_code IN ('AUD','HOM')          -- matches any value in the list
unit_price_cents BETWEEN 2000 AND 9000  -- 2000 <= x <= 9000 (both inclusive)
sku LIKE 'SKU-%'                         -- '%' = any chars, '_' = one char
\`\`\`

### The NOT IN + NULL trap

If the list inside \`NOT IN\` contains a \`NULL\` (or the column being tested is \`NULL\`), the result can become "unknown" and silently drop rows you expected to keep. \`status NOT IN ('paid', NULL)\` returns **no rows at all**. When you use \`NOT IN\`, make sure neither side involves NULLs, or switch to \`NOT EXISTS\`. (More on this in the next lesson.)

### Pitfall

\`BETWEEN\` is inclusive: \`BETWEEN 1 AND 10\` includes both 1 and 10. If you mean "under 10," don't use \`BETWEEN\`.

> **In the warehouse this differs…** \`LIKE\` is case-insensitive for ASCII in SQLite by default but **case-sensitive** in Postgres. Normalize case first if it matters (see Lesson \`sql-l1-strings\`).

### Recap

\`IN\` for sets, \`BETWEEN\` for inclusive ranges, \`LIKE\` with \`%\`/\`_\` for patterns. Never put NULL near \`NOT IN\`.`,
    demoCode: `SELECT product_id, sku, category_code, unit_price_cents
FROM products
WHERE category_code IN ('AUD','HOM')
  AND unit_price_cents BETWEEN 2000 AND 9000
  AND sku LIKE 'SKU-%';`,
    demoSeedSql: `CREATE TABLE products (
  product_id       INTEGER,
  sku              TEXT,
  category_code    TEXT,
  unit_price_cents INTEGER
);
INSERT INTO products VALUES
  (1, 'SKU-AUD-01', 'AUD', 2999),
  (2, 'SKU-HOM-05', 'HOM', 4500),
  (3, 'SKU-TOY-09', 'TOY', 1200),
  (4, 'SKU-AUD-02', 'AUD', 8900),
  (5, 'SKU-HOM-07', 'HOM', 15000);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-in-between-like-apply",
    executionMode: "single-file",
    prompt: `Filter \`products\` to category codes in the set \`('AUD','HOM')\` **and** a price band of \`2000\` to \`9000\` cents inclusive. Return \`product_id\`, \`category_code\`, \`unit_price_cents\`.`,
    starterCode: `-- Combine IN for the category set with BETWEEN for the price band.
SELECT product_id, category_code, unit_price_cents
FROM products
WHERE
;`,
    hints: [
      "Use IN ('AUD','HOM') for the category.",
      "Use BETWEEN 2000 AND 9000 for the price (both ends inclusive).",
      "The TOY row and the 15000 row both drop.",
    ],
    referenceSolution: `SELECT product_id, category_code, unit_price_cents
FROM products
WHERE category_code IN ('AUD','HOM')
  AND unit_price_cents BETWEEN 2000 AND 9000;`,
    singleFile: {
      seedSql: `CREATE TABLE products (
  product_id       INTEGER,
  sku              TEXT,
  category_code    TEXT,
  unit_price_cents INTEGER
);
INSERT INTO products VALUES
  (1, 'SKU-AUD-01', 'AUD', 2999),
  (2, 'SKU-HOM-05', 'HOM', 4500),
  (3, 'SKU-TOY-09', 'TOY', 1200),
  (4, 'SKU-AUD-02', 'AUD', 8900),
  (5, 'SKU-HOM-07', 'HOM', 15000);`,
      orderMatters: false,
      expected: {
        columns: ["product_id", "category_code", "unit_price_cents"],
        rows: [
          [1, "AUD", 2999],
          [2, "HOM", 4500],
          [4, "AUD", 8900],
        ],
      },
    },
  },
  practice: {
    id: "sql-l1-in-between-like-practice",
    executionMode: "single-file",
    prompt: `Quarantine suspect rows: return \`product_id\`, \`sku\`, \`status\` for products that match **all three** conditions:
- the \`sku\` matches the malformed prefix pattern \`TMP-%\` (temporary SKUs that should never ship),
- the \`status\` is in the excluded set \`('draft','deprecated')\`,
- the \`added_date\` is **outside** the valid window \`2026-01-01\` to \`2026-02-28\` (i.e., *not* \`BETWEEN\` those dates; ISO date text compares lexicographically, so \`BETWEEN\` works on \`'YYYY-MM-DD'\`).`,
    starterCode: `-- Pattern-match the SKU, restrict the status set, and exclude the valid date window.
SELECT product_id, sku, status
FROM products_raw
WHERE
;`,
    hints: [
      "sku LIKE 'TMP-%' catches the temporary SKUs.",
      "status IN ('draft','deprecated') for the excluded set.",
      "\"Outside the window\" is added_date NOT BETWEEN '2026-01-01' AND '2026-02-28'. Row 3 is a draft but inside the window, so it drops; only row 4 satisfies all three.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE products_raw (
  product_id       INTEGER,
  sku              TEXT,
  status           TEXT,
  unit_price_cents INTEGER,
  added_date       TEXT   -- 'YYYY-MM-DD'
);
INSERT INTO products_raw VALUES
  (1, 'TMP-XYZ-01', 'active',     2999, '2026-01-15'),
  (2, 'SKU-AUD-02', 'active',     4500, '2026-02-01'),
  (3, 'TMP-QQ-77',  'draft',      1200, '2026-01-20'),
  (4, 'TMP-AB-03',  'deprecated', 8900, '2025-12-10'),
  (5, 'TMP-CD-09',  'active',     3300, '2026-03-05'),
  (6, 'SKU-HOM-07', 'active',     6000, '2026-02-14');`,
      orderMatters: false,
      expected: {
        columns: ["product_id", "sku", "status"],
        rows: [[4, "TMP-AB-03", "deprecated"]],
      },
    },
  },
}

const nullLogic: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-null-logic",
  title: "NULLs and Three-Valued Logic",
  summary: "Handle missing values correctly: the #1 source of silent data bugs.",
  estimatedMinutes: 15,
  difficulty: "medium",
  skills: ["IS NULL", "IS NOT NULL", "COALESCE", "three-valued logic", "NULL in comparisons"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Why this lesson matters more than it looks

NULL is not a value: it's the *absence* of a value, SQL's way of saying "unknown." Almost every silent data bug a DE chases ("why did 4,000 rows vanish from the mart?") traces back to a mishandled NULL. Source systems are full of them: an email that was never collected, a \`region\` the app forgot to set, a \`total\` that hasn't been computed yet. Learning to reason about NULL correctly is the difference between a pipeline you trust and one that quietly loses data.

## Three-valued logic

In most languages a comparison is \`true\` or \`false\`. In SQL there's a third result: **\`unknown\`**. Any comparison *to* NULL yields \`unknown\`:

\`\`\`
5 = NULL        -> unknown   (not false!)
5 <> NULL       -> unknown
NULL = NULL     -> unknown   (two unknowns aren't "equal")
\`\`\`

And \`WHERE\` only keeps rows where the condition is **\`true\`**. It discards both \`false\` and \`unknown\`. That's the trap: \`WHERE email = NULL\` matches *nothing*, because \`= NULL\` is never \`true\`. To test for NULL you must use the special operators **\`IS NULL\`** and **\`IS NOT NULL\`**, which return real \`true\`/\`false\`:

\`\`\`sql
SELECT customer_id, email
FROM customers
WHERE email IS NULL;      -- correct: finds the missing emails
\`\`\`

## How NULL poisons NOT IN

Remember the trap from the last lesson. If any value in a \`NOT IN\` list is NULL, the whole predicate can collapse to \`unknown\` for every row and return **nothing**:

\`\`\`sql
-- If any customer_id in flagged is NULL, this returns NO rows:
WHERE customer_id NOT IN (SELECT customer_id FROM flagged);
\`\`\`

Which side the NULL is on decides everything, and it is the side people get backwards:

- A NULL in the **list** (\`flagged\`) makes \`customer_id <> NULL\` unknown for every row, so the whole \`AND\` chain is unknown and you get **nothing back**.
- A NULL in the **column being checked** (\`orders.customer_id\`) only makes that one row's test unknown, so you lose **that row and no others**.

The fix: filter NULLs out of the subquery, or use \`NOT EXISTS\` (Level 2).

## COALESCE: supply a default

\`COALESCE(a, b, c)\` returns the first non-NULL argument. It's how you replace a missing value with a display default *without dropping the row*:

\`\`\`sql
SELECT
  customer_id,
  COALESCE(email, 'unknown@example.com') AS email_display,
  COALESCE(region, 'UNSPECIFIED')        AS region_display
FROM customers;
\`\`\`

**Anatomy.**

\`\`\`
email IS NULL                     -- true when email is missing
email IS NOT NULL                 -- true when email is present
COALESCE(region, 'UNSPECIFIED')   -- region if present, else the fallback
       └─ tried first ┘  └─ used only when the first is NULL ┘
\`\`\`

## Keep it readable / the audit pattern

A DE often wants to *keep* the NULL rows but *flag* them. Never silently drop data during profiling. You don't need any new syntax for the flag: a predicate like \`email IS NULL\` is itself a value: in SQLite it evaluates to \`1\` when true and \`0\` when false. So you can drop an \`IS NULL\` test (or several joined with \`OR\`) straight into the \`SELECT\` list, beside a \`COALESCE\` display, and the row survives with its problem made visible:

\`\`\`sql
SELECT
  customer_id,
  COALESCE(email, 'MISSING') AS email_display,
  (email IS NULL) AS email_is_missing        -- 1 when missing, else 0
FROM customers;
\`\`\`

Join several tests with \`OR\` to flag "any key missing" in one \`1\`/\`0\` column: \`(email IS NULL OR region IS NULL)\`.

**Common pitfalls.**
- \`= NULL\` / \`<> NULL\` are always \`unknown\`. Use \`IS NULL\` / \`IS NOT NULL\`.
- Aggregates and \`NOT IN\` treat NULL surprisingly; assume nothing.
- \`COALESCE(NULL, NULL)\` is still NULL. Provide a non-NULL final fallback if you need a guaranteed value.

**Recap.** NULL means "unknown"; comparisons to it are \`unknown\`, and \`WHERE\` drops \`unknown\`. Test with \`IS NULL\`/\`IS NOT NULL\`, default with \`COALESCE\`, and flag-don't-drop when auditing.`,
    demoCode: `SELECT customer_id, email
FROM customers
WHERE email IS NULL;`,
    demoSeedSql: `CREATE TABLE customers (
  customer_id INTEGER,
  email       TEXT,
  region      TEXT
);
INSERT INTO customers VALUES
  (1, 'ana@example.com', 'EU'),
  (2, NULL,              'US'),
  (3, 'lee@example.com', NULL),
  (4, NULL,              'EU'),
  (5, 'kim@example.com', 'US');`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-null-logic-apply",
    executionMode: "single-file",
    prompt: `Find customers with a **missing email**. Return \`customer_id\`, \`email\` for the rows where \`email IS NULL\`. Remember: \`WHERE email = NULL\` is the trap. It matches nothing.`,
    starterCode: `-- Find customers whose email is missing.
-- Return customer_id, email.
SELECT

FROM customers;`,
    hints: [
      "`WHERE email = NULL` will return nothing. That's the trap.",
      "Use `email IS NULL`.",
      "Row 3's email is present (its region is the NULL). It must not appear.",
    ],
    referenceSolution: `SELECT customer_id, email
FROM customers
WHERE email IS NULL;`,
    singleFile: {
      seedSql: `CREATE TABLE customers (
  customer_id INTEGER,
  email       TEXT,
  region      TEXT
);
INSERT INTO customers VALUES
  (1, 'ana@example.com', 'EU'),
  (2, NULL,              'US'),
  (3, 'lee@example.com', NULL),
  (4, NULL,              'EU'),
  (5, 'kim@example.com', 'US');`,
      orderMatters: false,
      expected: {
        columns: ["customer_id", "email"],
        rows: [
          [2, null],
          [4, null],
        ],
      },
    },
  },
  practice: {
    id: "sql-l1-null-logic-practice",
    executionMode: "single-file",
    prompt: `Write a **null-audit projection** that keeps *every* row (no filtering) and exposes the data-quality problems. Return these columns, in order:
- \`customer_id\`
- \`email_display\`: the email, or \`'MISSING_EMAIL'\` when NULL
- \`region_display\`: the region, or \`'UNSPECIFIED'\` when NULL
- \`has_missing_key\`: \`1\` if **either** \`email\` **or** \`region\` **or** \`signup_date\` is NULL, else \`0\`

You don't need \`CASE\` for the flag: a predicate is itself a value, so an \`IS NULL\` test dropped into the \`SELECT\` list evaluates to \`1\` (true) or \`0\` (false).`,
    starterCode: `-- Null-audit projection: keep all rows, expose the missing values.
-- Columns (in order): customer_id, email_display, region_display, has_missing_key
SELECT

FROM customers_raw;`,
    hints: [
      "No `WHERE`: the audit keeps all five rows on purpose.",
      "Use `COALESCE(email, 'MISSING_EMAIL')` and `COALESCE(region, 'UNSPECIFIED')`.",
      "For the flag, put the predicate straight in the SELECT list: `(email IS NULL OR region IS NULL OR signup_date IS NULL)` evaluates to 1 when any key is missing, else 0. No CASE needed.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE customers_raw (
  customer_id INTEGER,
  email       TEXT,
  region      TEXT,
  signup_date TEXT   -- 'YYYY-MM-DD' or NULL
);
INSERT INTO customers_raw VALUES
  (1, 'ana@example.com', 'EU',  '2026-01-05'),
  (2, NULL,              'US',  '2026-01-06'),
  (3, 'lee@example.com', NULL,  NULL),
  (4, NULL,              NULL,  '2026-02-01'),
  (5, 'kim@example.com', 'US',  '2026-02-02');`,
      orderMatters: false,
      expected: {
        columns: ["customer_id", "email_display", "region_display", "has_missing_key"],
        rows: [
          [1, "ana@example.com", "EU", 0],
          [2, "MISSING_EMAIL", "US", 1],
          [3, "lee@example.com", "UNSPECIFIED", 1],
          [4, "MISSING_EMAIL", "UNSPECIFIED", 1],
          [5, "kim@example.com", "US", 0],
        ],
      },
    },
  },
}

const booleanAndOr: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-boolean-and-or",
  title: "Combining Predicates: AND / OR / NOT",
  summary: "Compose multiple conditions with correct precedence and parentheses.",
  estimatedMinutes: 13,
  difficulty: "medium",
  skills: ["AND", "OR", "NOT", "operator precedence", "parenthesizing conditions"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## A misplaced paren silently ships the wrong rows

A \`WHERE\` clause is where a business rule becomes code. "Paid or shipped orders in the EU" is one English sentence, but SQL does not read English. It applies a fixed precedence order, and if that order does not match what you meant, the query still runs, returns no error, and hands wrong rows to whatever reads the table next: a dashboard, a payout job, a training set. Filter bugs are quiet, and quiet bugs are the expensive ones.

### Precedence: NOT, then AND, then OR

SQL evaluates the logical operators in a fixed order: \`NOT\` binds tightest, then \`AND\`, then \`OR\`. \`AND\` relates to \`OR\` the way \`*\` relates to \`+\`. So this filter:

\`\`\`sql
WHERE status = 'paid' OR status = 'shipped' AND region = 'EU'
\`\`\`

does not mean "(paid or shipped) and in the EU." SQL groups the tighter \`AND\` first and reads it as:

\`\`\`sql
WHERE status = 'paid' OR (status = 'shipped' AND region = 'EU')
\`\`\`

The \`paid\` branch now stands alone with no region test, so every paid order from every region slips through. Against the seed data, order 3 (\`paid\`, \`US\`) comes back even though it is not in the EU. The filter silently widened.

### The fix: parenthesize the OR group

\`\`\`sql
WHERE (status = 'paid' OR status = 'shipped')
  AND region = 'EU';
\`\`\`

Now the alternatives are grouped before \`AND\` applies, so both branches must also satisfy \`region = 'EU'\`. This returns exactly orders 1 and 2. Parentheses override precedence, and they document intent, so a reviewer never has to recall the precedence table to trust the clause.

When a rule stacks two independent choices, give each choice its own parenthesized group:

\`\`\`sql
WHERE (status = 'paid' OR status = 'shipped')
  AND (region = 'EU'  OR region = 'UK')
  AND account_type <> 'test';
\`\`\`

Each \`OR\` lives inside its own parentheses, and the \`AND\`s chain the independent conditions together.

### Pitfall: NOT is tighter than you think

\`NOT\` binds tighter than \`AND\`, so \`NOT status = 'paid' AND region = 'EU'\` parses as \`(NOT status = 'paid') AND region = 'EU'\`, not \`NOT (status = 'paid' AND region = 'EU')\`. When you mean to negate a whole group, wrap the group: \`NOT (status = 'paid' AND region = 'EU')\`.

**Interview nuance:** SQL predicates are three-valued. Every condition evaluates to \`TRUE\`, \`FALSE\`, or \`UNKNOWN\`, and \`WHERE\` keeps only rows that come out \`TRUE\`. A \`NULL\` compared with anything yields \`UNKNOWN\`, and \`NOT UNKNOWN\` is still \`UNKNOWN\`. So \`account_type <> 'test'\` (equivalently \`NOT (account_type = 'test')\`) silently drops every row where \`account_type\` is \`NULL\`, even though those rows are not test accounts. To keep them, say so explicitly: \`(account_type <> 'test' OR account_type IS NULL)\`. Interviewers use this to check whether you actually understand three-valued logic instead of treating \`NULL\` like an ordinary value.`,
    demoCode: `SELECT order_id, status, region
FROM orders
WHERE (status = 'paid' OR status = 'shipped')
  AND region = 'EU';`,
    demoSeedSql: `CREATE TABLE orders (
  order_id INTEGER,
  status   TEXT,
  region   TEXT
);
INSERT INTO orders VALUES
  (1, 'paid',      'EU'),
  (2, 'shipped',   'EU'),
  (3, 'paid',      'US'),
  (4, 'cancelled', 'EU'),
  (5, 'shipped',   'UK');`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-boolean-and-or-apply",
    executionMode: "single-file",
    prompt: `Return \`order_id\`, \`status\`, \`region\` for orders that are (\`status = 'paid'\` **or** \`status = 'shipped'\`) **and** \`region = 'EU'\`. Get the grouping right.`,
    starterCode: `-- Filter: (paid OR shipped) AND region EU
SELECT order_id, status, region
FROM orders
WHERE ;`,
    hints: [
      "Wrap the two status options in parentheses, then AND the region.",
      "Without parens you'd wrongly include order 3 (paid, US).",
      "Order 4 (cancelled) and order 5 (UK) both drop.",
    ],
    referenceSolution: `SELECT order_id, status, region
FROM orders
WHERE (status = 'paid' OR status = 'shipped')
  AND region = 'EU';`,
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id INTEGER,
  status   TEXT,
  region   TEXT
);
INSERT INTO orders VALUES
  (1, 'paid',      'EU'),
  (2, 'shipped',   'EU'),
  (3, 'paid',      'US'),
  (4, 'cancelled', 'EU'),
  (5, 'shipped',   'UK');`,
      orderMatters: false,
      expected: {
        columns: ["order_id", "status", "region"],
        rows: [
          [1, "paid", "EU"],
          [2, "shipped", "EU"],
        ],
      },
    },
  },
  practice: {
    id: "sql-l1-boolean-and-or-practice",
    executionMode: "single-file",
    prompt: `Reproduce this business rule verbatim: **"orders that are paid OR shipped, in region EU or UK, excluding test accounts."** Return \`order_id\`, \`status\`, \`region\`. The grouping must be exact.`,
    starterCode: `-- Business rule: paid/shipped, in EU or UK, no test accounts
SELECT order_id, status, region
FROM orders
WHERE ;`,
    hints: [
      "Three groups joined by AND: (status ...), (region ...), and the test-account exclusion.",
      "Each OR group needs its own parentheses: (status = 'paid' OR status = 'shipped') and (region = 'EU' OR region = 'UK').",
      '"Excluding test accounts" is is_test_acct = 0 (or <> 1). That drops orders 4 and 7. Order 3 (US) and order 5 (cancelled) also drop.',
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id     INTEGER,
  status       TEXT,
  region       TEXT,
  is_test_acct INTEGER   -- 1 = internal test account
);
INSERT INTO orders VALUES
  (1, 'paid',      'EU', 0),
  (2, 'shipped',   'UK', 0),
  (3, 'paid',      'US', 0),
  (4, 'shipped',   'EU', 1),
  (5, 'cancelled', 'EU', 0),
  (6, 'paid',      'UK', 0),
  (7, 'shipped',   'UK', 1);`,
      orderMatters: false,
      expected: {
        columns: ["order_id", "status", "region"],
        rows: [
          [1, "paid", "EU"],
          [2, "shipped", "UK"],
          [6, "paid", "UK"],
        ],
      },
    },
  },
}

const orderBy: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-order-by",
  title: "Sorting with ORDER BY",
  summary: "Order output deterministically for previews and top-N inspection.",
  estimatedMinutes: 11,
  difficulty: "easy",
  skills: ["ORDER BY", "ASC/DESC", "multi-key sort", "NULLS ordering behavior"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Rows have no inherent order

A table is a *set*. Without \`ORDER BY\`, the engine may return rows in any order, and that order can change between runs, after a reload, or when an index changes. For any preview, any "newest 10," any output a human or a test will eyeball, you **must** sort explicitly, and you must sort on enough columns to make the order *deterministic*.

## Sort keys and tie-breaking

\`ORDER BY order_ts DESC\` puts newest first. But if two orders share a timestamp, their relative order is still undefined. Add a **tie-breaker**: \`ORDER BY order_ts DESC, order_id DESC\`. Now the output is stable every run.

Worked example:

\`\`\`sql
SELECT order_id, order_ts, total_cents
FROM orders
ORDER BY order_ts DESC, total_cents DESC;
\`\`\`

Anatomy:

\`\`\`
ORDER BY  order_ts DESC ,  total_cents DESC
          primary key       tie-breaker
          DESC = high to low ; ASC (default) = low to high
\`\`\`

## Where NULLs land

> **In the warehouse this differs:** SQLite sorts NULLs *first* under \`ASC\` (and last under \`DESC\`); Postgres defaults to NULLs *last* under \`ASC\`. If NULL placement matters, be explicit. Standard SQL supports \`ORDER BY col ASC NULLS LAST\` (Postgres/Oracle), though SQLite only added \`NULLS FIRST/LAST\` in 3.30. Portable trick: \`ORDER BY (col IS NULL), col\` forces NULLs last everywhere.

**Pitfall.** Sorting on a non-unique column alone is *not* deterministic. Always add a unique tie-breaker (often the primary key) if the output must be stable.

**Recap.** \`ORDER BY\` makes output deterministic; add a unique tie-breaker column, and be explicit about NULL placement across dialects.`,
    demoCode: `SELECT order_id, order_ts, total_cents
FROM orders
ORDER BY order_ts DESC, total_cents DESC;`,
    demoSeedSql: `CREATE TABLE orders (
  order_id    INTEGER,
  order_ts    TEXT,      -- ISO-8601, may repeat
  region      TEXT,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, '2026-03-02T10:00:00Z', 'EU', 5000),
  (2, '2026-03-02T10:00:00Z', 'US', 5000),
  (3, '2026-03-03T08:30:00Z', 'EU', 3000),
  (4, '2026-03-01T22:15:00Z', 'UK', 7000),
  (5, '2026-03-02T10:00:00Z', 'EU', 8000);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-order-by-apply",
    executionMode: "single-file",
    prompt: `Sort \`orders\` by \`order_date\` descending, then by \`total_cents\` descending as a tie-breaker. Return \`order_id\`, \`order_date\`, \`total_cents\`. The output must come back in that exact sorted order.`,
    starterCode: `-- Sort newest date first, higher total first on ties
SELECT order_id, order_date, total_cents
FROM orders
`,
    hints: [
      "ORDER BY order_date DESC puts 2026-03-03 first.",
      "Add , total_cents DESC so the two 03-01 rows come out 9000 before 5000.",
      "ISO date text sorts correctly with a plain string comparison.",
    ],
    referenceSolution: `SELECT order_id, order_date, total_cents
FROM orders
ORDER BY order_date DESC, total_cents DESC;`,
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER,
  order_date  TEXT,     -- 'YYYY-MM-DD'
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, '2026-03-01', 5000),
  (2, '2026-03-03', 2000),
  (3, '2026-03-01', 9000),
  (4, '2026-03-02', 4000);`,
      orderMatters: true,
      expected: {
        columns: ["order_id", "order_date", "total_cents"],
        rows: [
          [2, "2026-03-03", 2000],
          [4, "2026-03-02", 4000],
          [3, "2026-03-01", 9000],
          [1, "2026-03-01", 5000],
        ],
      },
    },
  },
  practice: {
    id: "sql-l1-order-by-practice",
    executionMode: "single-file",
    prompt: `Produce a deterministic **newest-first preview** whose order can never change between runs, even though several rows share a timestamp. Sort by \`order_ts\` descending, then \`total_cents\` descending, then \`order_id\` ascending as the final unique tie-breaker. Return \`order_id\`, \`order_ts\`, \`region\`, \`total_cents\`. The output must come back in that exact sorted order.`,
    starterCode: `-- Three sort keys make this fully deterministic
SELECT order_id, order_ts, region, total_cents
FROM orders
`,
    hints: [
      "Three sort keys, in order: order_ts DESC, total_cents DESC, order_id ASC.",
      "Rows 1 and 2 tie on timestamp and total. Only the order_id ASC key makes them deterministic (1 before 2).",
      "ISO-8601 text sorts chronologically as a plain string, so no date parsing is needed.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER,
  order_ts    TEXT,      -- ISO-8601, may repeat
  region      TEXT,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, '2026-03-02T10:00:00Z', 'EU', 5000),
  (2, '2026-03-02T10:00:00Z', 'US', 5000),
  (3, '2026-03-03T08:30:00Z', 'EU', 3000),
  (4, '2026-03-01T22:15:00Z', 'UK', 7000),
  (5, '2026-03-02T10:00:00Z', 'EU', 8000);`,
      orderMatters: true,
      expected: {
        columns: ["order_id", "order_ts", "region", "total_cents"],
        rows: [
          [3, "2026-03-03T08:30:00Z", "EU", 3000],
          [5, "2026-03-02T10:00:00Z", "EU", 8000],
          [1, "2026-03-02T10:00:00Z", "EU", 5000],
          [2, "2026-03-02T10:00:00Z", "US", 5000],
          [4, "2026-03-01T22:15:00Z", "UK", 7000],
        ],
      },
    },
  },
}

const limitDistinct: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-limit-distinct",
  title: "LIMIT and DISTINCT",
  summary: "Sample the top rows and collapse duplicates during exploration.",
  estimatedMinutes: 11,
  difficulty: "easy",
  skills: ["LIMIT", "OFFSET", "DISTINCT", "distinct on multiple columns"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Two profiling reflexes

When a fresh source lands, a DE does two things immediately:

1. **Sample it**: \`LIMIT 10\` after an \`ORDER BY\` to eyeball the top rows without pulling millions.
2. **Probe cardinality**: \`SELECT DISTINCT status FROM orders\` to learn what values a column *actually* contains (often not what the schema doc claims).

## LIMIT (and OFFSET)

\`LIMIT n\` returns at most \`n\` rows; \`LIMIT n OFFSET m\` skips \`m\` then returns \`n\` (basic pagination). Always pair \`LIMIT\` with \`ORDER BY\`. A limit on an unsorted set gives arbitrary rows.

## DISTINCT

\`DISTINCT\` removes duplicate rows from the result. \`SELECT DISTINCT region, status FROM orders\` returns each unique *combination* of the two columns, a fast way to map the value space.

Worked example:

\`\`\`sql
SELECT DISTINCT status
FROM orders
ORDER BY status;
\`\`\`

Anatomy:

\`\`\`sql
SELECT DISTINCT region, status   -- unique (region, status) pairs
FROM orders
ORDER BY region, status
LIMIT 10 OFFSET 0;               -- top 10 after sorting (OFFSET optional)
\`\`\`

> **In the warehouse (dialect note).** SQLite/Postgres/MySQL use \`LIMIT\`. SQL Server uses \`SELECT TOP 10 ...\` or the ANSI \`OFFSET ... FETCH NEXT 10 ROWS ONLY\`; Oracle also uses \`FETCH FIRST\`. \`LIMIT\` is the portable choice for this course but flag it when you move to SQL Server.

**Pitfall.** \`DISTINCT\` applies to the *entire* row, not one column: \`SELECT DISTINCT region, status\` does **not** mean "distinct regions with any status." And \`LIMIT\` without \`ORDER BY\` is non-deterministic.

**Recap.** \`LIMIT\`/\`OFFSET\` sample a sorted set; \`DISTINCT\` collapses duplicate *rows* (across all selected columns) to profile a source's real value space.`,
    demoCode: `SELECT DISTINCT status
FROM orders
ORDER BY status;`,
    demoSeedSql: `CREATE TABLE orders (
  order_id INTEGER,
  status   TEXT
);
INSERT INTO orders VALUES
  (1, 'paid'),
  (2, 'shipped'),
  (3, 'paid'),
  (4, 'cancelled'),
  (5, 'shipped'),
  (6, 'paid');`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-limit-distinct-apply",
    executionMode: "single-file",
    prompt: `Return the **distinct** list of order statuses actually present in the source, sorted ascending. One column: \`status\`.`,
    starterCode: `-- Return the distinct statuses, sorted A→Z
SELECT

FROM orders;`,
    hints: [
      "SELECT DISTINCT status.",
      "Add ORDER BY status for a stable, alphabetical output.",
      "Three unique values remain from six rows.",
    ],
    referenceSolution: `SELECT DISTINCT status
FROM orders
ORDER BY status;`,
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id INTEGER,
  status   TEXT
);
INSERT INTO orders VALUES
  (1, 'paid'),
  (2, 'shipped'),
  (3, 'paid'),
  (4, 'cancelled'),
  (5, 'shipped'),
  (6, 'paid');`,
      orderMatters: true,
      expected: {
        columns: ["status"],
        rows: [["cancelled"], ["paid"], ["shipped"]],
      },
    },
  },
  practice: {
    id: "sql-l1-limit-distinct-practice",
    executionMode: "single-file",
    prompt: `Profile the raw table: return the **distinct \`(region, status)\` combinations** present, sorted by \`region\` ascending then \`status\` ascending, and take only the **top 10** with \`LIMIT\`. Columns: \`region\`, \`status\`.`,
    starterCode: `-- Return distinct (region, status) pairs, sorted, top 10
SELECT

FROM orders;`,
    hints: [
      "SELECT DISTINCT region, status returns unique pairs, not unique single columns.",
      "Sort by region, status so the output is deterministic before you LIMIT.",
      "LIMIT 10 at the end. There are fewer than 10 distinct pairs, so all of them come through.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id INTEGER,
  region   TEXT,
  status   TEXT
);
INSERT INTO orders VALUES
  (1, 'EU', 'paid'),
  (2, 'EU', 'paid'),
  (3, 'US', 'shipped'),
  (4, 'EU', 'shipped'),
  (5, 'US', 'paid'),
  (6, 'UK', 'cancelled'),
  (7, 'US', 'shipped'),
  (8, 'EU', 'paid'),
  (9, 'UK', 'paid'),
  (10,'US', 'paid'),
  (11,'EU', 'cancelled');`,
      orderMatters: true,
      expected: {
        columns: ["region", "status"],
        rows: [
          ["EU", "cancelled"],
          ["EU", "paid"],
          ["EU", "shipped"],
          ["UK", "cancelled"],
          ["UK", "paid"],
          ["US", "paid"],
          ["US", "shipped"],
        ],
      },
    },
  },
}

const castTypes: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-cast-types",
  title: "Data Types and CAST",
  summary: "Convert values explicitly and understand SQLite's dynamic typing.",
  estimatedMinutes: 13,
  difficulty: "medium",
  skills: ["CAST", "type affinity", "numeric vs text", "SQLite dynamic-typing caveat"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Data Types and CAST

**Why a DE casts at the boundary.** Source data arrives with the wrong types constantly: an amount stored as the text \`'4999'\`, a flag as \`'1'\`.

> **In the warehouse this differs.** SQLite has *dynamic typing with type affinity*: it will happily store the string \`'oops'\` in a column you declared \`INTEGER\`, and arithmetic on text may silently coerce or return \`0\`. Postgres and Snowflake are strict: they *reject* a bad value at write time. Because your DDL should port to those strict systems, the DE habit is to **\`CAST\` explicitly at the boundary** rather than trust the source's typing.

**\`CAST\`.** \`CAST(expr AS type)\` converts a value. Common targets: \`INTEGER\`, \`REAL\` (float), \`TEXT\`. \`CAST('4999' AS INTEGER)\` → \`4999\`; you can now do arithmetic on it reliably.

**Worked example:**

\`\`\`sql
SELECT
  order_id,
  CAST(total_cents_text AS INTEGER)            AS total_cents,
  CAST(total_cents_text AS INTEGER) / 100.0    AS total_dollars
FROM orders_raw;
\`\`\`

**Anatomy.**

\`\`\`
CAST( total_cents_text  AS  INTEGER )
      └─ the value ──┘      └ target type ┘
\`\`\`

**Guarding junk.** If a text column may hold non-numeric junk, casting it in SQLite yields \`0\` (not an error), which can silently corrupt a sum. The DE fix is to screen non-numeric values out to \`NULL\` before they reach a measure. That screening needs conditional logic (\`CASE\`) and pattern matching, which you meet later in the course; until then, assume the upstream hands you clean numeric text or a genuine \`NULL\`.

**Pitfall.** \`CAST('12.99' AS INTEGER)\` → \`12\` (truncates, doesn't round). Cast to \`REAL\` first if you need the decimal, or cast the cents (an integer) rather than a dollar float. And remember SQLite won't *error* on a bad cast the way a warehouse does. Test your assumptions.

**Recap.** \`CAST(expr AS type)\` converts values explicitly at the trust boundary; SQLite's lax typing means you must cast (and guard junk) yourself so the model ports to strict warehouses.`,
    demoCode: `SELECT
  order_id,
  CAST(total_cents_text AS INTEGER)         AS total_cents,
  CAST(total_cents_text AS INTEGER) / 100.0 AS total_dollars
FROM orders_raw;`,
    demoSeedSql: `CREATE TABLE orders_raw (
  order_id         INTEGER,
  total_cents_text TEXT     -- amounts stored as text
);
INSERT INTO orders_raw VALUES
  (1, '4999'),
  (2, '10000'),
  (3, '250');`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-cast-types-apply",
    executionMode: "single-file",
    prompt: `Cast the text \`total_cents_text\` to an integer and compute dollars. Return \`order_id\`, \`total_cents\` (the cast integer), and \`total_dollars\` (\`total_cents / 100.0\`, keeping decimals).`,
    starterCode: `-- Cast total_cents_text to INTEGER, then compute dollars.
SELECT
  order_id,

FROM orders_raw;`,
    hints: [
      "CAST(total_cents_text AS INTEGER) gives the integer cents.",
      "Divide by 100.0 (not 100) to keep the fractional dollars.",
      "Alias both computed columns.",
    ],
    referenceSolution: `SELECT
  order_id,
  CAST(total_cents_text AS INTEGER)         AS total_cents,
  CAST(total_cents_text AS INTEGER) / 100.0 AS total_dollars
FROM orders_raw;`,
    singleFile: {
      seedSql: `CREATE TABLE orders_raw (
  order_id         INTEGER,
  total_cents_text TEXT     -- amounts stored as text
);
INSERT INTO orders_raw VALUES
  (1, '4999'),
  (2, '10000'),
  (3, '250');`,
      orderMatters: false,
      expected: {
        columns: ["order_id", "total_cents", "total_dollars"],
        rows: [
          [1, 4999, 49.99],
          [2, 10000, 100],
          [3, 250, 2.5],
        ],
      },
    },
  },
  practice: {
    id: "sql-l1-cast-types-practice",
    executionMode: "single-file",
    prompt: `Write a query that returns \`payment_id\`, \`amount_cents\`, and \`amount_dollars\`. Cast \`amount_text\` to an integer for \`amount_cents\`, but when \`amount_text\` is missing (\`NULL\`) show \`0\` instead of \`NULL\`. \`amount_dollars\` = \`amount_cents / 100.0\`.`,
    starterCode: `-- Cast the amount to integer cents; default a missing amount to 0.
SELECT
  payment_id,

FROM payments_raw;`,
    hints: [
      "CAST(amount_text AS INTEGER) gives the integer cents for a numeric string.",
      "Wrap it in COALESCE(CAST(amount_text AS INTEGER), 0) so a NULL amount becomes 0, not NULL.",
      "Compute amount_dollars by dividing that same expression by 100.0 to keep the decimal.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE payments_raw (
  payment_id  INTEGER,
  amount_text TEXT     -- numeric text, or NULL when the source had no amount
);
INSERT INTO payments_raw VALUES
  (1, '4999'),
  (2, '10000'),
  (3, NULL),
  (4, '750'),
  (5, NULL);`,
      orderMatters: false,
      expected: {
        columns: ["payment_id", "amount_cents", "amount_dollars"],
        rows: [
          [1, 4999, 49.99],
          [2, 10000, 100],
          [3, 0, 0],
          [4, 750, 7.5],
          [5, 0, 0],
        ],
      },
    },
  },
}

const stringFns: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-strings",
  title: "String Functions for Cleaning",
  summary: "Trim, case-fold, and slice text to standardize messy source strings.",
  estimatedMinutes: 14,
  difficulty: "medium",
  skills: ["LOWER/UPPER", "TRIM", "SUBSTR", "REPLACE", "LENGTH", "INSTR"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Standardize before you join

Joins and dedup only work when keys match *exactly*. \`'  Ana@Example.com '\` and \`'ana@example.com'\` are different strings: a join on them fails, a dedup keeps both. Before any join, a staging model normalizes the key: trim whitespace, lowercase, strip prefixes. Getting this right is the difference between a clean dimension and a duplicated one.

> **In the warehouse this differs.** SQLite's \`TRIM(s, chars)\` strips a set of characters; the ANSI form other engines use is \`TRIM(BOTH chars FROM s)\`. And Postgres, Snowflake, and BigQuery ship \`REGEXP_REPLACE\` for pattern-based cleanup, which SQLite does not, so heavier key normalization there is one function call instead of nested \`REPLACE\`s.

## The toolkit

- \`LOWER(s)\` / \`UPPER(s)\`: case-fold.
- \`TRIM(s)\`: remove leading/trailing whitespace (\`LTRIM\`/\`RTRIM\` for one side; \`TRIM(s, chars)\` to trim specific characters).
- \`SUBSTR(s, start, len)\`: slice (1-indexed in SQLite).
- \`REPLACE(s, from, to)\`: swap all occurrences.
- \`LENGTH(s)\`: character count. \`INSTR(s, sub)\`: 1-based position of \`sub\` (0 if absent).

**Worked example (a cleaned email key):**

\`\`\`sql
SELECT
  customer_id,
  LOWER(TRIM(email)) AS email_key
FROM customers_raw;
\`\`\`

**Anatomy.**

\`\`\`
LOWER( TRIM( email ) )
       └ strip spaces ┘
└─ then case-fold ─┘
SUBSTR('SKU-AUD-01', 5)      -> 'AUD-01'   (from position 5 to end)
REPLACE('US-A', 'US-', '')   -> 'A'
\`\`\`

**Pitfall.** \`SUBSTR\` is **1-indexed** in SQLite (and Oracle), but some languages/dialects are 0-indexed. Count carefully. \`TRIM\` only removes whitespace by default, not interior spaces (\`'a b'\` stays \`'a b'\`); use \`REPLACE(s, ' ', '')\` to strip all spaces. And functions **nest inside-out**: \`LOWER(TRIM(x))\` trims first, then lowercases.

**Recap.** \`TRIM\` + \`LOWER\` build matchable join keys; \`SUBSTR\`/\`REPLACE\`/\`INSTR\` slice and rewrite messy source text. Standardize keys *before* any join or dedup.`,
    demoCode: `SELECT customer_id, LOWER(TRIM(email)) AS email_key FROM customers_raw;`,
    demoSeedSql: `CREATE TABLE customers_raw (
  customer_id INTEGER,
  email       TEXT
);
INSERT INTO customers_raw VALUES
  (1, '  Ana@Example.com '),
  (2, 'LEE@example.COM'),
  (3, 'kim@Example.com  ');`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-strings-apply",
    executionMode: "single-file",
    prompt: `Normalize each email to a trimmed, lowercase join key. Return \`customer_id\` and \`email_key\` = \`LOWER(TRIM(email))\`.`,
    starterCode: `-- Return customer_id and a normalized email_key = LOWER(TRIM(email))
SELECT

FROM customers_raw;`,
    hints: [
      "TRIM(email) removes the leading/trailing spaces.",
      "Wrap it in LOWER(...) to case-fold.",
      "Order matters inside-out: trim first, then lowercase (either order works here, but be deliberate).",
    ],
    referenceSolution: `SELECT
  customer_id,
  LOWER(TRIM(email)) AS email_key
FROM customers_raw;`,
    singleFile: {
      seedSql: `CREATE TABLE customers_raw (
  customer_id INTEGER,
  email       TEXT
);
INSERT INTO customers_raw VALUES
  (1, '  Ana@Example.com '),
  (2, 'LEE@example.COM'),
  (3, 'kim@Example.com  ');`,
      orderMatters: false,
      expected: {
        columns: ["customer_id", "email_key"],
        rows: [
          [1, "ana@example.com"],
          [2, "lee@example.com"],
          [3, "kim@example.com"],
        ],
      },
    },
  },
  practice: {
    id: "sql-l1-strings-practice",
    executionMode: "single-file",
    prompt: `A staging model has to clean its join keys before anything downstream can join on them. Write a query that returns \`customer_id\`, \`email_key\`, \`sku_clean\`, and \`country_code_norm\` from \`customers_raw\`. The three derived columns are:
- \`email_key\`: trimmed and lowercased email,
- \`sku_clean\`: the \`sku\` with the leading \`'PRD-'\` prefix removed (e.g. \`PRD-AUD-01\` → \`AUD-01\`),
- \`country_code_norm\`: the \`country_code\` trimmed and **uppercased** (e.g. \`' us '\` → \`US\`).`,
    starterCode: `-- Return customer_id, email_key, sku_clean, country_code_norm
SELECT

FROM customers_raw;`,
    hints: [
      "email_key = LOWER(TRIM(email)), same as the Apply.",
      "Strip the prefix with REPLACE(sku, 'PRD-', '') (or SUBSTR(sku, 5) since 'PRD-' is 4 chars, so start at position 5).",
      "country_code_norm = UPPER(TRIM(country_code)).",
    ],
    singleFile: {
      seedSql: `CREATE TABLE customers_raw (
  customer_id  INTEGER,
  email        TEXT,
  sku          TEXT,     -- has a 'PRD-' prefix to strip
  country_code TEXT      -- messy case / spacing
);
INSERT INTO customers_raw VALUES
  (1, '  Ana@Example.com ', 'PRD-AUD-01', ' us '),
  (2, 'LEE@example.COM',    'PRD-HOM-05', 'Gb'),
  (3, 'kim@Example.com  ',  'PRD-TOY-09', ' De ');`,
      orderMatters: false,
      expected: {
        columns: ["customer_id", "email_key", "sku_clean", "country_code_norm"],
        rows: [
          [1, "ana@example.com", "AUD-01", "US"],
          [2, "lee@example.com", "HOM-05", "GB"],
          [3, "kim@example.com", "TOY-09", "DE"],
        ],
      },
    },
  },
}

const dates: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-dates",
  title: "Dates and Times in SQLite",
  summary: "Parse and format ISO-8601 date text, where dialects diverge most.",
  estimatedMinutes: 15,
  difficulty: "medium",
  skills: ["date()", "strftime", "ISO-8601 text dates", "date filtering/truncation"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Dates and Times in SQLite

> **In the warehouse this differs.** SQLite has **no dedicated DATE or TIMESTAMP type**. Dates live as **TEXT in ISO-8601** (\`'2026-03-01'\` or \`'2026-03-01T09:14:00Z'\`), and you manipulate them with the \`date()\`, \`datetime()\`, and \`strftime()\` functions. Real warehouses have native \`DATE\`/\`TIMESTAMP\` types and *different* function names: Postgres uses \`date_trunc('month', ts)\` and \`EXTRACT(YEAR FROM ts)\`; BigQuery uses \`DATE_TRUNC\`/\`FORMAT_DATE\`; Snowflake uses \`DATE_TRUNC\`/\`TO_CHAR\`. The **concepts** below (truncate, extract a part, filter a window) transfer everywhere; the exact syntax does not. Because ISO-8601 text also *sorts and compares* chronologically as plain strings, a lot of date filtering needs no functions at all.

### The core functions (SQLite)

- \`date(ts)\` truncates a timestamp to the day: \`date('2026-03-01T09:14:00Z')\` → \`'2026-03-01'\`.
- \`strftime(fmt, ts)\` formats or extracts. \`strftime('%Y-%m', ts)\` → \`'2026-03'\` (year-month); \`%Y\` year, \`%m\` month, \`%d\` day, \`%w\` day-of-week (0=Sunday).

**Worked example (extract year-month):**

\`\`\`sql
SELECT
  order_id,
  strftime('%Y-%m', order_ts) AS order_year_month
FROM orders;
\`\`\`

**Anatomy.**

\`\`\`
strftime( '%Y-%m' , order_ts )
          └ format ┘  └ ISO text timestamp ┘
date( order_ts )              -> 'YYYY-MM-DD'  (day truncation)
order_ts >= '2026-01-01'      -> string compare = chronological filter
\`\`\`

**Filtering a window.** Because ISO text sorts correctly, a rolling window is just a string range: \`WHERE order_ts >= '2026-01-01' AND order_ts < '2026-04-01'\`. Prefer half-open ranges (\`>= start AND < next_start\`) over \`BETWEEN\` for timestamps, so you don't accidentally include or exclude the boundary instant.

**Pitfall.** \`strftime\` returns **text**, so \`strftime('%m', ts)\` is \`'03'\` (string), not the number \`3\`. Cast if you need arithmetic. And \`strftime\`/\`date\` only work on *valid ISO-8601* strings; a malformed date like \`'03/01/2026'\` returns NULL silently. Validate/standardize date text before relying on these functions.

**Recap.** In SQLite dates are ISO text: \`date()\` truncates to day, \`strftime()\` extracts/formats, and plain string comparison filters windows, but the function names change in every real warehouse, so lean on the portable concepts.`,
    demoCode: `SELECT
  order_id,
  strftime('%Y-%m', order_ts) AS order_year_month
FROM orders;`,
    demoSeedSql: `CREATE TABLE orders (
  order_id INTEGER,
  order_ts TEXT       -- ISO-8601
);
INSERT INTO orders VALUES
  (1, '2026-01-15T10:00:00Z'),
  (2, '2026-02-03T14:30:00Z'),
  (3, '2026-02-28T23:59:00Z');`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l1-dates-apply",
    executionMode: "single-file",
    prompt: `Extract the year-month (\`YYYY-MM\`) from each order's timestamp. Return \`order_id\` and \`order_year_month\`.`,
    starterCode: `-- Extract YYYY-MM from each order's ISO-8601 timestamp.
SELECT

FROM orders;`,
    hints: [
      "Use strftime('%Y-%m', order_ts).",
      "%Y is the 4-digit year, %m the zero-padded month.",
      "Alias the result order_year_month.",
    ],
    referenceSolution: `SELECT
  order_id,
  strftime('%Y-%m', order_ts) AS order_year_month
FROM orders;`,
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id INTEGER,
  order_ts TEXT       -- ISO-8601
);
INSERT INTO orders VALUES
  (1, '2026-01-15T10:00:00Z'),
  (2, '2026-02-03T14:30:00Z'),
  (3, '2026-02-28T23:59:00Z');`,
      orderMatters: false,
      expected: {
        columns: ["order_id", "order_year_month"],
        rows: [
          [1, "2026-01"],
          [2, "2026-02"],
          [3, "2026-02"],
        ],
      },
    },
  },
  practice: {
    id: "sql-l1-dates-practice",
    executionMode: "single-file",
    prompt: `Build a date-spine preview for a daily mart, filtered to a rolling window of \`2026-01-01\` (inclusive) up to \`2026-04-01\` (exclusive). For each in-window order return:
- \`order_id\`
- \`order_date\`: the timestamp truncated to the day (\`YYYY-MM-DD\`)
- \`order_year_month\`: \`YYYY-MM\`
- \`day_of_week\`: the numeric day-of-week as text via \`strftime('%w', ...)\` (\`0\`=Sunday … \`6\`=Saturday)

Sort the output by \`order_date\` ascending.`,
    starterCode: `-- Windowed date-spine preview: filter 2026-01-01 (inclusive) to 2026-04-01 (exclusive),
-- then sort by order_date ascending.
SELECT

FROM orders;`,
    hints: [
      "Filter with a half-open window: WHERE order_ts >= '2026-01-01' AND order_ts < '2026-04-01'. ISO text compares chronologically, so no parsing needed. The 2025 row drops.",
      "date(order_ts) gives the day; strftime('%Y-%m', order_ts) the year-month; strftime('%w', order_ts) the day-of-week.",
      "ORDER BY order_date (or order_ts) ascending for the deterministic spine.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id INTEGER,
  order_ts TEXT       -- ISO-8601
);
INSERT INTO orders VALUES
  (1, '2026-01-05T08:00:00Z'),   -- Mon
  (2, '2026-02-14T19:30:00Z'),   -- Sat
  (3, '2026-03-01T12:00:00Z'),   -- Sun
  (4, '2026-03-15T09:45:00Z'),   -- Sun
  (5, '2025-12-31T23:00:00Z');   -- out of window (prior year)`,
      orderMatters: true,
      expected: {
        columns: ["order_id", "order_date", "order_year_month", "day_of_week"],
        rows: [
          [1, "2026-01-05", "2026-01", "1"],
          [2, "2026-02-14", "2026-02", "6"],
          [3, "2026-03-01", "2026-03", "0"],
          [4, "2026-03-15", "2026-03", "0"],
        ],
      },
    },
  },
}

export const sqlLevel1: SqlLevel = {
  id: 1,
  slug: "foundations",
  title: "Level 1: SQL Foundations (Reading Source Data)",
  tagline:
    "SELECT, WHERE, ORDER BY, types: querying raw source tables the way a DE does on day one.",
  defaultExecutionMode: "single-file",
  estimatedHours: 4,
  modules: [
    {
      id: "sql-l1-projecting",
      title: "Module 1.1: Projecting Columns from a Source Table",
      description:
        "Decide which columns you want and what to call them: explicit projection and clean aliasing.",
      lessons: [selectColumns, computedExpressions],
    },
    {
      id: "sql-l1-filtering",
      title: "Module 1.2: Filtering Rows",
      description:
        "Cut a scan down to the rows a model needs: comparisons, sets and ranges, NULL logic, and boolean predicates.",
      lessons: [whereBasics, inBetweenLike, nullLogic, booleanAndOr],
    },
    {
      id: "sql-l1-shaping",
      title: "Module 1.3: Shaping the Result Set",
      description:
        "Order, limit, and de-duplicate output for deterministic previews and top-N inspection.",
      lessons: [orderBy, limitDistinct],
    },
    {
      id: "sql-l1-types",
      title: "Module 1.4: Types, Casting, Strings, and Dates",
      description:
        "Coerce and clean raw values: type affinity and CAST, string functions, and SQLite date/time handling.",
      lessons: [castTypes, stringFns, dates],
    },
  ],
}

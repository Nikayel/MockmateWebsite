import type { SqlLevel } from "@/lib/tutorials/types"

/**
 * Level 1 — SQL Foundations: Reading Source Data (single-query grading).
 *
 * AGENT-1 ships ONE proof lesson here (`sql-l1-select-columns`) to prove the single-file result-set
 * pipeline end-to-end; AGENT-2 authors the remaining L1 lessons from `docs/sql-curriculum/CONTENT.md`.
 * Single-file grading: seed a fresh SQLite DB, run the learner's SELECT, compare `{ columns, rows }`
 * to `expected` (`orderMatters: false` → multiset compare).
 */
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

When a raw table lands in the warehouse, its column names are whatever the source system used:
\`cust_nm\`, \`ord_dt\`, \`amt_c\`. Those names are cryptic and can change without warning. The first
transform a data engineer writes — the **staging model** — selects only the columns downstream needs
and renames each to a clean, predictable convention (usually \`snake_case\`).

\`SELECT *\` is the opposite of that discipline: it drags every column downstream, breaks the moment
the source adds a column, and hides which fields a model depends on. **Explicit projection is a
contract** — it documents exactly what you consume and insulates you from upstream churn.

## The concept

A \`SELECT\` names the columns you want, in order. \`AS\` gives a column a new output name (an *alias*).

\`\`\`sql
SELECT
  order_id      AS order_id,
  cust_id       AS customer_id,
  amt_c         AS amount_cents
FROM orders;
\`\`\`

The output columns are named by *you*, regardless of what the source called them. Downstream models
depend on your stable names, not the source's.

**Pitfall:** forgetting a comma between columns. \`SELECT order_id customer_id FROM orders\` doesn't
error — SQLite reads it as "select \`order_id\`, aliased to \`customer_id\`," silently dropping a column.`,
    demoCode: `SELECT
  ord_id  AS order_id,
  cust_id AS customer_id,
  amt_c   AS amount_cents
FROM orders;`,
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
      "You only need `SELECT ... FROM orders;` — no WHERE, no sorting.",
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
    prompt: `Build a "clean orders" staging projection over \`orders_raw\`. Select the six raw columns a
mart cares about and alias each to the warehouse convention below; **drop** \`internal_flag\`. Keep the
output columns in exactly this order:

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
      "Six columns in the projection, `internal_flag` omitted — that's the whole shape.",
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

A raw \`order_items\` row gives you \`qty\` and \`unit_price_cents\` but no line revenue. You *could* ask
the source to store \`revenue\`, but that's a value that must be kept in sync forever. The DE default is
to **derive it at query time**: \`qty * unit_price_cents AS line_revenue_cents\`. The formula lives in
one place (your model), and it can never drift out of sync with its inputs.

The same applies to labels. Instead of storing a \`full_name\`, you concatenate
\`first_name || ' ' || last_name\` in the model — one source of truth, computed on read.

## The building blocks

- **Arithmetic:** \`+\`, \`-\`, \`*\`, \`/\`. Integer division truncates in SQLite (\`7 / 2\` → \`3\`);
  multiply by \`1.0\` or cast to force decimals.
- **String concatenation:** \`||\` joins text. \`'A' || '-' || 'B'\` → \`'A-B'\`.
- **Literal columns:** a constant becomes a column for every row — \`'raw' AS source_system\`.

> **In the warehouse this differs — string concatenation.** Postgres/Snowflake also support \`||\`,
> but SQL Server uses \`+\` and BigQuery uses \`CONCAT()\`. \`||\` is the portable ANSI choice and the one
> SQLite understands, so we author with it here.

## Worked example

\`\`\`sql
SELECT
  product_id,
  qty * unit_price_cents      AS line_revenue_cents,
  sku || '-' || category_code AS product_label,
  'ecommerce_raw'             AS source_system
FROM order_items;
\`\`\`

Every expression is just a computed value that gets an alias:

\`\`\`
qty * unit_price_cents   AS   line_revenue_cents
└──── expression ──────┘  └──── output name ────┘
\`\`\`

**Pitfall.** Integer division silently truncates: \`unit_price_cents / 100\` for \`4999\` gives \`49\`, not
\`49.99\`. To keep the cents, divide by \`100.0\`. And always alias a computed column — an un-aliased
expression gets an ugly, unstable auto-name like \`qty * unit_price_cents\`.

**Recap.** Compute derived values (\`qty * price\`, \`a || b\`, constants) in the query and alias them —
never rely on the source to store what you can derive.`,
    demoCode: `SELECT
  product_id,
  qty * unit_price_cents      AS line_revenue_cents,
  sku || '-' || category_code AS product_label,
  'ecommerce_raw'             AS source_system
FROM order_items;`,
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
- \`unit_price_dollars\` — the price in dollars as a decimal (cents ÷ 100, **keep** the fractional part)
- \`label\` — the \`product_name\`, a space, an opening paren, the \`sku\`, and a closing paren, e.g.
  \`Wireless Earbuds (SKU-AUDIO-01)\`
- \`source_system\` — a hard-coded literal \`'ecommerce_raw'\` on every row`,
    starterCode: `-- product_id, a decimal price, a built label, and a literal source_system.
SELECT

FROM products;`,
    hints: [
      "To get decimals from integer cents, divide by `100.0`, not `100`.",
      "Build `label` with `||`: `product_name || ' (' || sku || ')'`.",
      "A bare string literal like `'ecommerce_raw'` becomes a constant column — just alias it.",
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

export const sqlLevel1: SqlLevel = {
  id: 1,
  slug: "foundations",
  title: "Level 1 — SQL Foundations: Reading Source Data",
  tagline:
    "SELECT, WHERE, ORDER BY, types — querying raw source tables the way a DE does on day one.",
  defaultExecutionMode: "single-file",
  estimatedHours: 4,
  modules: [
    {
      id: "sql-l1-projecting",
      title: "Module 1.1 — Projecting Columns from a Source Table",
      description:
        "Decide which columns you want and what to call them: explicit projection and clean aliasing.",
      lessons: [selectColumns, computedExpressions],
    },
  ],
}

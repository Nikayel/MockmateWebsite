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

const whereBasics: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l1-where-basics",
  title: "WHERE and Comparison Operators",
  summary: "Restrict a scan to the rows a model actually needs.",
  estimatedMinutes: 10,
  difficulty: "easy",
  skills: ["WHERE", "= <> < > <= >=", "filtering on numbers and text"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Filter early

The cheapest row is the one you never process. A staging model that only cares about paid orders should filter to \`status = 'paid'\` as early as possible.

> **In the warehouse this differs.** Filtering early is the intuition behind **predicate pushdown**: push the filter as close to the source scan as you can, so every downstream join, aggregate, and sort works on a smaller set. \`WHERE\` is where that starts.

## The operators

\`=\` (equal), \`<>\` or \`!=\` (not equal), \`<\`, \`>\`, \`<=\`, \`>=\`. Text comparisons use single quotes: \`status = 'paid'\`. Numbers are bare: \`total_cents >= 5000\`.

## Worked example — the "processable" slice

\`\`\`sql
SELECT order_id, status, total_cents
FROM orders
WHERE status = 'paid'
  AND total_cents >= 5000;
\`\`\`

## Anatomy

\`\`\`
WHERE  <column>  <operator>  <value>
       status    =           'paid'   -- text: single quotes
       total_cents >=        5000     -- number: no quotes
\`\`\`

## Pitfall

Use single quotes for string *values* (\`'paid'\`); double quotes mean *identifier* in standard SQL. \`WHERE status = "paid"\` may work by accident in SQLite but is wrong and breaks in Postgres. Also: \`<>\` is the portable "not equal"; prefer it over \`!=\`.

## Recap

\`WHERE col op value\` keeps only matching rows — quote text values, filter as early as possible.`,
    demoCode: `SELECT order_id, status, total_cents
FROM orders
WHERE status = 'paid'
  AND total_cents >= 5000;`,
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
      "`>=` is inclusive — `5000` qualifies.",
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

- **Set membership** — "status is one of these": \`status IN ('paid','shipped')\` (cleaner than a chain of \`OR\`s).
- **Range** — "price in this band": \`unit_price_cents BETWEEN 1000 AND 5000\` (inclusive on both ends).
- **Pattern** — "SKU looks like this": \`sku LIKE 'AUD-%'\`. In \`LIKE\`, \`%\` matches any run of characters, \`_\` matches exactly one.

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

If the list inside \`NOT IN\` contains a \`NULL\` — or the column being tested is \`NULL\` — the result can become "unknown" and silently drop rows you expected to keep. \`status NOT IN ('paid', NULL)\` returns **no rows at all**. When you use \`NOT IN\`, make sure neither side involves NULLs, or switch to \`NOT EXISTS\`. (More on this in the next lesson.)

### Pitfall

\`BETWEEN\` is inclusive — \`BETWEEN 1 AND 10\` includes both 1 and 10. If you mean "under 10," don't use \`BETWEEN\`.

> **In the warehouse this differs…** \`LIKE\` is case-insensitive for ASCII in SQLite by default but **case-sensitive** in Postgres. Normalize case first if it matters (see Lesson \`sql-l1-strings\`).

### Recap

\`IN\` for sets, \`BETWEEN\` for inclusive ranges, \`LIKE\` with \`%\`/\`_\` for patterns — and never put NULL near \`NOT IN\`.`,
    demoCode: `SELECT product_id, sku, category_code, unit_price_cents
FROM products
WHERE category_code IN ('AUD','HOM')
  AND unit_price_cents BETWEEN 2000 AND 9000
  AND sku LIKE 'SKU-%';`,
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
      "Use BETWEEN 2000 AND 9000 for the price — both ends inclusive.",
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
    prompt: `Quarantine suspect rows — return \`product_id\`, \`sku\`, \`status\` for products that match **all three** conditions:
- the \`sku\` matches the malformed prefix pattern \`TMP-%\` (temporary SKUs that should never ship),
- the \`status\` is in the excluded set \`('draft','deprecated')\`,
- the \`added_date\` is **outside** the valid window \`2026-01-01\` to \`2026-02-28\` (i.e., *not* \`BETWEEN\` those dates — ISO date text compares lexicographically, so \`BETWEEN\` works on \`'YYYY-MM-DD'\`).`,
    starterCode: `-- Pattern-match the SKU, restrict the status set, and exclude the valid date window.
SELECT product_id, sku, status
FROM products_raw
WHERE
;`,
    hints: [
      "sku LIKE 'TMP-%' catches the temporary SKUs.",
      "status IN ('draft','deprecated') for the excluded set.",
      "\"Outside the window\" is added_date NOT BETWEEN '2026-01-01' AND '2026-02-28' — row 3 is a draft but inside the window, so it drops; only row 4 satisfies all three.",
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
  summary: "Handle missing values correctly — the #1 source of silent data bugs.",
  estimatedMinutes: 15,
  difficulty: "medium",
  skills: ["IS NULL", "IS NOT NULL", "COALESCE", "three-valued logic", "NULL in comparisons"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Why this lesson matters more than it looks

NULL is not a value — it's the *absence* of a value, SQL's way of saying "unknown." Almost every silent data bug a DE chases ("why did 4,000 rows vanish from the mart?") traces back to a mishandled NULL. Source systems are full of them: an email that was never collected, a \`region\` the app forgot to set, a \`total\` that hasn't been computed yet. Learning to reason about NULL correctly is the difference between a pipeline you trust and one that quietly loses data.

## Three-valued logic

In most languages a comparison is \`true\` or \`false\`. In SQL there's a third result: **\`unknown\`**. Any comparison *to* NULL yields \`unknown\`:

\`\`\`
5 = NULL        -> unknown   (not false!)
5 <> NULL       -> unknown
NULL = NULL     -> unknown   (two unknowns aren't "equal")
\`\`\`

And \`WHERE\` only keeps rows where the condition is **\`true\`** — it discards both \`false\` and \`unknown\`. That's the trap: \`WHERE email = NULL\` matches *nothing*, because \`= NULL\` is never \`true\`. To test for NULL you must use the special operators **\`IS NULL\`** and **\`IS NOT NULL\`**, which return real \`true\`/\`false\`:

\`\`\`sql
SELECT customer_id, email
FROM customers
WHERE email IS NULL;      -- correct: finds the missing emails
\`\`\`

## How NULL poisons NOT IN

Remember the trap from the last lesson. If any value in a \`NOT IN\` list is NULL, the whole predicate can collapse to \`unknown\` for every row and return **nothing**:

\`\`\`sql
-- If any customer_id in orders is NULL, this returns NO rows:
WHERE customer_id NOT IN (SELECT customer_id FROM flagged);
\`\`\`

The fix: filter NULLs out of the subquery, or use \`NOT EXISTS\` (Level 2).

## COALESCE — supply a default

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

A DE often wants to *keep* the NULL rows but *flag* them — never silently drop data during profiling. Combine a \`CASE\` flag (Level 2 formalizes \`CASE\`, but the idea is intuitive) with a \`COALESCE\` display so the row survives and its problem is visible:

\`\`\`sql
SELECT
  customer_id,
  COALESCE(email, 'MISSING') AS email_display,
  CASE WHEN email IS NULL THEN 1 ELSE 0 END AS email_is_missing
FROM customers;
\`\`\`

**Common pitfalls.**
- \`= NULL\` / \`<> NULL\` are always \`unknown\` — use \`IS NULL\` / \`IS NOT NULL\`.
- Aggregates and \`NOT IN\` treat NULL surprisingly; assume nothing.
- \`COALESCE(NULL, NULL)\` is still NULL — provide a non-NULL final fallback if you need a guaranteed value.

**Recap.** NULL means "unknown"; comparisons to it are \`unknown\`, and \`WHERE\` drops \`unknown\` — test with \`IS NULL\`/\`IS NOT NULL\`, default with \`COALESCE\`, and flag-don't-drop when auditing.`,
    demoCode: `SELECT customer_id, email
FROM customers
WHERE email IS NULL;`,
  },
  apply: {
    id: "sql-l1-null-logic-apply",
    executionMode: "single-file",
    prompt: `Find customers with a **missing email**. Return \`customer_id\`, \`email\` for the rows where \`email IS NULL\`. Remember: \`WHERE email = NULL\` is the trap — it matches nothing.`,
    starterCode: `-- Find customers whose email is missing.
-- Return customer_id, email.
SELECT

FROM customers;`,
    hints: [
      "`WHERE email = NULL` will return nothing — that's the trap.",
      "Use `email IS NULL`.",
      "Row 3's email is present (its region is the NULL) — it must not appear.",
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
- \`email_display\` — the email, or \`'MISSING_EMAIL'\` when NULL
- \`region_display\` — the region, or \`'UNSPECIFIED'\` when NULL
- \`has_missing_key\` — \`1\` if **either** \`email\` **or** \`region\` **or** \`signup_date\` is NULL, else \`0\``,
    starterCode: `-- Null-audit projection: keep all rows, expose the missing values.
-- Columns (in order): customer_id, email_display, region_display, has_missing_key
SELECT

FROM customers_raw;`,
    hints: [
      "No `WHERE` — the audit keeps all five rows on purpose.",
      "Use `COALESCE(email, 'MISSING_EMAIL')` and `COALESCE(region, 'UNSPECIFIED')`.",
      'For the flag, a `CASE WHEN email IS NULL OR region IS NULL OR signup_date IS NULL THEN 1 ELSE 0 END` covers "any key missing."',
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
    markdown: `## Precedence is where filters silently break

\`AND\` binds *tighter* than \`OR\` — just like \`*\` binds tighter than \`+\`. So this:

\`\`\`sql
WHERE status = 'paid' OR status = 'shipped' AND region = 'EU'
\`\`\`

does **not** mean "(paid or shipped) and in EU." SQL reads it as \`paid OR (shipped AND region='EU')\` — which lets in *every* paid order from *any* region. A missing pair of parentheses just silently widened your filter and let bad rows into the model. This is one of the most common real bugs in production SQL.

**The fix is always the same: parenthesize the OR branch.**

\`\`\`sql
WHERE (status = 'paid' OR status = 'shipped')
  AND region = 'EU';
\`\`\`

\`NOT\` negates a condition: \`NOT (status = 'test')\`, or more idiomatically \`status <> 'test'\`. Applied to a group, \`NOT (a OR b)\` means "neither a nor b."

## Anatomy

\`\`\`
WHERE ( A OR B )   -- group the alternatives first
  AND   C          -- AND applies to the whole group
  AND NOT D        -- and exclude D
\`\`\`

**Keep it readable.** When a filter mixes \`AND\` and \`OR\`, *always* parenthesize — even where precedence would technically do the right thing. Explicit parens document intent and survive future edits. A reviewer should never have to recall the precedence table to know what a \`WHERE\` means.

**Recap.** \`AND\` binds tighter than \`OR\`; wrap every \`OR\` group in parentheses so a business rule's grouping is exact and unambiguous.`,
    demoCode: `SELECT order_id, status, region
FROM orders
WHERE (status = 'paid' OR status = 'shipped')
  AND region = 'EU';`,
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
      '"Excluding test accounts" is is_test_acct = 0 (or <> 1) — that drops orders 4 and 7. Order 3 (US) and order 5 (cancelled) also drop.',
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
    {
      id: "sql-l1-filtering",
      title: "Module 1.2 — Filtering Rows",
      description:
        "Cut a scan down to the rows a model needs: comparisons, sets and ranges, NULL logic, and boolean predicates.",
      lessons: [whereBasics, inBetweenLike, nullLogic, booleanAndOr],
    },
  ],
}

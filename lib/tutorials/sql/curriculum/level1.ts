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

A DE often wants to *keep* the NULL rows but *flag* them — never silently drop data during profiling. You don't need any new syntax for the flag: a predicate like \`email IS NULL\` is itself a value — in SQLite it evaluates to \`1\` when true and \`0\` when false. So you can drop an \`IS NULL\` test (or several joined with \`OR\`) straight into the \`SELECT\` list, beside a \`COALESCE\` display, and the row survives with its problem made visible:

\`\`\`sql
SELECT
  customer_id,
  COALESCE(email, 'MISSING') AS email_display,
  (email IS NULL) AS email_is_missing        -- 1 when missing, else 0
FROM customers;
\`\`\`

Join several tests with \`OR\` to flag "any key missing" in one \`1\`/\`0\` column: \`(email IS NULL OR region IS NULL)\`.

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
- \`has_missing_key\` — \`1\` if **either** \`email\` **or** \`region\` **or** \`signup_date\` is NULL, else \`0\`

You don't need \`CASE\` for the flag: a predicate is itself a value, so an \`IS NULL\` test dropped into the \`SELECT\` list evaluates to \`1\` (true) or \`0\` (false).`,
    starterCode: `-- Null-audit projection: keep all rows, expose the missing values.
-- Columns (in order): customer_id, email_display, region_display, has_missing_key
SELECT

FROM customers_raw;`,
    hints: [
      "No `WHERE` — the audit keeps all five rows on purpose.",
      "Use `COALESCE(email, 'MISSING_EMAIL')` and `COALESCE(region, 'UNSPECIFIED')`.",
      "For the flag, put the predicate straight in the SELECT list — `(email IS NULL OR region IS NULL OR signup_date IS NULL)` evaluates to 1 when any key is missing, else 0. No CASE needed.",
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

A table is a *set* — without \`ORDER BY\`, the engine may return rows in any order, and that order can change between runs, after a reload, or when an index changes. For any preview, any "newest 10," any output a human or a test will eyeball, you **must** sort explicitly, and you must sort on enough columns to make the order *deterministic*.

## Sort keys and tie-breaking

\`ORDER BY order_ts DESC\` puts newest first. But if two orders share a timestamp, their relative order is still undefined — add a **tie-breaker**: \`ORDER BY order_ts DESC, order_id DESC\`. Now the output is stable every run.

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

> **In the warehouse this differs:** SQLite sorts NULLs *first* under \`ASC\` (and last under \`DESC\`); Postgres defaults to NULLs *last* under \`ASC\`. If NULL placement matters, be explicit — standard SQL supports \`ORDER BY col ASC NULLS LAST\` (Postgres/Oracle), though SQLite only added \`NULLS FIRST/LAST\` in 3.30. Portable trick: \`ORDER BY (col IS NULL), col\` forces NULLs last everywhere.

**Pitfall.** Sorting on a non-unique column alone is *not* deterministic — always add a unique tie-breaker (often the primary key) if the output must be stable.

**Recap.** \`ORDER BY\` makes output deterministic; add a unique tie-breaker column, and be explicit about NULL placement across dialects.`,
    demoCode: `SELECT order_id, order_ts, total_cents
FROM orders
ORDER BY order_ts DESC, total_cents DESC;`,
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
      "Rows 1 and 2 tie on timestamp and total — only the order_id ASC key makes them deterministic (1 before 2).",
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

1. **Sample it** — \`LIMIT 10\` after an \`ORDER BY\` to eyeball the top rows without pulling millions.
2. **Probe cardinality** — \`SELECT DISTINCT status FROM orders\` to learn what values a column *actually* contains (often not what the schema doc claims).

## LIMIT (and OFFSET)

\`LIMIT n\` returns at most \`n\` rows; \`LIMIT n OFFSET m\` skips \`m\` then returns \`n\` (basic pagination). Always pair \`LIMIT\` with \`ORDER BY\` — a limit on an unsorted set gives arbitrary rows.

## DISTINCT

\`DISTINCT\` removes duplicate rows from the result. \`SELECT DISTINCT region, status FROM orders\` returns each unique *combination* of the two columns — a fast way to map the value space.

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

**Pitfall.** \`DISTINCT\` applies to the *entire* row, not one column — \`SELECT DISTINCT region, status\` does **not** mean "distinct regions with any status." And \`LIMIT\` without \`ORDER BY\` is non-deterministic.

**Recap.** \`LIMIT\`/\`OFFSET\` sample a sorted set; \`DISTINCT\` collapses duplicate *rows* (across all selected columns) to profile a source's real value space.`,
    demoCode: `SELECT DISTINCT status
FROM orders
ORDER BY status;`,
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
      "LIMIT 10 at the end — there are fewer than 10 distinct pairs, so all of them come through.",
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

**Why a DE casts at the boundary.** Source data arrives with the wrong types constantly — an amount stored as the text \`'4999'\`, a flag as \`'1'\`.

> **In the warehouse this differs.** SQLite has *dynamic typing with type affinity* — it will happily store the string \`'oops'\` in a column you declared \`INTEGER\`, and arithmetic on text may silently coerce or return \`0\`. Postgres and Snowflake are strict: they *reject* a bad value at write time. Because your DDL should port to those strict systems, the DE habit is to **\`CAST\` explicitly at the boundary** rather than trust the source's typing.

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

**Guarding junk.** If a text column may hold non-numeric junk, casting it in SQLite yields \`0\` (not an error), which can silently corrupt a sum. A portable guard is to only treat rows as numeric when they match a numeric shape (\`GLOB '[0-9]*'\` in SQLite / a regex in Postgres) or to \`CASE\` non-numeric values to NULL so they don't pollute a measure.

**Pitfall.** \`CAST('12.99' AS INTEGER)\` → \`12\` (truncates, doesn't round). Cast to \`REAL\` first if you need the decimal, or cast the cents (an integer) rather than a dollar float. And remember SQLite won't *error* on a bad cast the way a warehouse does — test your assumptions.

**Recap.** \`CAST(expr AS type)\` converts values explicitly at the trust boundary; SQLite's lax typing means you must cast (and guard junk) yourself so the model ports to strict warehouses.`,
    demoCode: `SELECT
  order_id,
  CAST(total_cents_text AS INTEGER)         AS total_cents,
  CAST(total_cents_text AS INTEGER) / 100.0 AS total_dollars
FROM orders_raw;`,
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
    prompt: `Clean the dirty numeric column into a typed, model-ready measure while keeping *every* row. Return \`payment_id\`, \`amount_cents\`, \`amount_dollars\` where:
- \`amount_cents\` = the value cast to an integer **only when** \`amount_text\` is all digits; otherwise \`NULL\` (so junk like \`'N/A'\`, \`''\`, \`'pending'\` does not become a silent \`0\`),
- \`amount_dollars\` = \`amount_cents / 100.0\` (which is \`NULL\` when \`amount_cents\` is \`NULL\`).`,
    starterCode: `-- Guard the cast so junk becomes NULL, not 0.
SELECT
  payment_id,

FROM payments_raw;`,
    hints: [
      "Guard the cast with a shape test: in SQLite, amount_text GLOB '[0-9]*' AND amount_text NOT GLOB '*[^0-9]*' is true only for all-digit strings. (In a warehouse you'd use a regex like ~ '^[0-9]+$'.)",
      "Wrap it in CASE WHEN <all digits> THEN CAST(amount_text AS INTEGER) ELSE NULL END AS amount_cents.",
      "Reuse the same guarded expression for amount_dollars by dividing by 100.0; NULL divided/propagated stays NULL.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE payments_raw (
  payment_id  INTEGER,
  amount_text TEXT     -- mostly numeric text, some junk
);
INSERT INTO payments_raw VALUES
  (1, '4999'),
  (2, '10000'),
  (3, 'N/A'),
  (4, ''),
  (5, '750'),
  (6, 'pending');`,
      orderMatters: false,
      expected: {
        columns: ["payment_id", "amount_cents", "amount_dollars"],
        rows: [
          [1, 4999, 49.99],
          [2, 10000, 100],
          [3, null, null],
          [4, null, null],
          [5, 750, 7.5],
          [6, null, null],
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

Joins and dedup only work when keys match *exactly*. \`'  Ana@Example.com '\` and \`'ana@example.com'\` are different strings — a join on them fails, a dedup keeps both. Before any join, a staging model normalizes the key: trim whitespace, lowercase, strip prefixes. Getting this right is the difference between a clean dimension and a duplicated one.

> In the warehouse this differs: a staging model normalizes keys — trim, lowercase, strip prefixes — *before* any join or dedup, so a clean dimension does not silently fragment into duplicate rows.

## The toolkit

- \`LOWER(s)\` / \`UPPER(s)\` — case-fold.
- \`TRIM(s)\` — remove leading/trailing whitespace (\`LTRIM\`/\`RTRIM\` for one side; \`TRIM(s, chars)\` to trim specific characters).
- \`SUBSTR(s, start, len)\` — slice (1-indexed in SQLite).
- \`REPLACE(s, from, to)\` — swap all occurrences.
- \`LENGTH(s)\` — character count. \`INSTR(s, sub)\` — 1-based position of \`sub\` (0 if absent).

**Worked example — a cleaned email key:**

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

**Pitfall.** \`SUBSTR\` is **1-indexed** in SQLite (and Oracle), but some languages/dialects are 0-indexed — count carefully. \`TRIM\` only removes whitespace by default, not interior spaces (\`'a b'\` stays \`'a b'\`); use \`REPLACE(s, ' ', '')\` to strip all spaces. And functions **nest inside-out**: \`LOWER(TRIM(x))\` trims first, then lowercases.

**Recap.** \`TRIM\` + \`LOWER\` build matchable join keys; \`SUBSTR\`/\`REPLACE\`/\`INSTR\` slice and rewrite messy source text — standardize keys *before* any join or dedup.`,
    demoCode: `SELECT customer_id, LOWER(TRIM(email)) AS email_key FROM customers_raw;`,
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
    prompt: `Build the cleaned join key set a staging model prepares before any join. Return \`customer_id\` and:
- \`email_key\` — trimmed and lowercased email,
- \`sku_clean\` — the \`sku\` with the leading \`'PRD-'\` prefix removed (e.g. \`PRD-AUD-01\` → \`AUD-01\`),
- \`country_code_norm\` — the \`country_code\` trimmed and **uppercased** (e.g. \`' us '\` → \`US\`).`,
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
  summary: "Parse and format ISO-8601 date text — where dialects diverge most.",
  estimatedMinutes: 15,
  difficulty: "medium",
  skills: ["date()", "strftime", "ISO-8601 text dates", "date filtering/truncation"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Dates and Times in SQLite

> **In the warehouse this differs.** SQLite has **no dedicated DATE or TIMESTAMP type**. Dates live as **TEXT in ISO-8601** (\`'2026-03-01'\` or \`'2026-03-01T09:14:00Z'\`), and you manipulate them with the \`date()\`, \`datetime()\`, and \`strftime()\` functions. Real warehouses have native \`DATE\`/\`TIMESTAMP\` types and *different* function names — Postgres uses \`date_trunc('month', ts)\` and \`EXTRACT(YEAR FROM ts)\`; BigQuery uses \`DATE_TRUNC\`/\`FORMAT_DATE\`; Snowflake uses \`DATE_TRUNC\`/\`TO_CHAR\`. The **concepts** below (truncate, extract a part, filter a window) transfer everywhere; the exact syntax does not. Because ISO-8601 text also *sorts and compares* chronologically as plain strings, a lot of date filtering needs no functions at all.

### The core functions (SQLite)

- \`date(ts)\` — truncate a timestamp to the day: \`date('2026-03-01T09:14:00Z')\` → \`'2026-03-01'\`.
- \`strftime(fmt, ts)\` — format/extract. \`strftime('%Y-%m', ts)\` → \`'2026-03'\` (year-month); \`%Y\` year, \`%m\` month, \`%d\` day, \`%w\` day-of-week (0=Sunday).

**Worked example — extract year-month:**

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

**Pitfall.** \`strftime\` returns **text**, so \`strftime('%m', ts)\` is \`'03'\` (string), not the number \`3\` — cast if you need arithmetic. And \`strftime\`/\`date\` only work on *valid ISO-8601* strings; a malformed date like \`'03/01/2026'\` returns NULL silently. Validate/standardize date text before relying on these functions.

**Recap.** In SQLite dates are ISO text: \`date()\` truncates to day, \`strftime()\` extracts/formats, and plain string comparison filters windows — but the function names change in every real warehouse, so lean on the portable concepts.`,
    demoCode: `SELECT
  order_id,
  strftime('%Y-%m', order_ts) AS order_year_month
FROM orders;`,
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
- \`order_date\` — the timestamp truncated to the day (\`YYYY-MM-DD\`)
- \`order_year_month\` — \`YYYY-MM\`
- \`day_of_week\` — the numeric day-of-week as text via \`strftime('%w', ...)\` (\`0\`=Sunday … \`6\`=Saturday)

Sort the output by \`order_date\` ascending.`,
    starterCode: `-- Windowed date-spine preview: filter 2026-01-01 (inclusive) to 2026-04-01 (exclusive),
-- then sort by order_date ascending.
SELECT

FROM orders;`,
    hints: [
      "Filter with a half-open window: WHERE order_ts >= '2026-01-01' AND order_ts < '2026-04-01' — ISO text compares chronologically, so no parsing needed. The 2025 row drops.",
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
    {
      id: "sql-l1-shaping",
      title: "Module 1.3 — Shaping the Result Set",
      description:
        "Order, limit, and de-duplicate output for deterministic previews and top-N inspection.",
      lessons: [orderBy, limitDistinct],
    },
    {
      id: "sql-l1-types",
      title: "Module 1.4 — Types, Casting, Strings, and Dates",
      description:
        "Coerce and clean raw values: type affinity and CAST, string functions, and SQLite date/time handling.",
      lessons: [castTypes, stringFns, dates],
    },
  ],
}

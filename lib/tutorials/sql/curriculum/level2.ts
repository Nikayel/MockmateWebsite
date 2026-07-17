import type { SqlLevel } from "@/lib/tutorials/types"
import {
  sqlAggregatesDrills,
  sqlCtesDrills,
  sqlHavingDrills,
  sqlInnerJoinDrills,
  sqlLeftJoinDrills,
  sqlSubqueryDrills,
} from "./extra-practice"

const aggregates: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-aggregates",
  title: "Aggregate Functions",
  summary: "Collapse many rows into a single measure: the atom of every metric.",
  estimatedMinutes: 20,
  difficulty: "easy",
  skills: ["COUNT", "SUM", "AVG", "MIN", "MAX", "COUNT(DISTINCT)", "NULL handling in aggregates"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Why aggregates are the first thing you run

Every dashboard number you have ever seen (total revenue, active users, average order value) is an **aggregate**: a function that eats many rows and emits one value. The moment a table lands in your warehouse, before you build anything on top of it, you run a handful of aggregates as smoke tests. Is \`COUNT(*)\` the row count you expected? Is \`SUM(total_cents)\` in the right ballpark? Is \`MAX(total_cents)\` impossibly large (a data-entry typo with extra zeros, or a test row that leaked into prod)? Aggregates are how you catch a broken load in ten seconds instead of after it has corrupted a report.

## The mental model: many rows collapse to one

An aggregate takes a set of rows and returns a single scalar. With no \`GROUP BY\`, the entire table is one group, so a \`SELECT\` of only aggregates always returns **exactly one row**, no matter how many rows went in. (Next module: \`GROUP BY\` splits the table into groups and returns one row per group. Same functions, finer grain.)

The five workhorses:

| Function | Returns |
|---|---|
| \`COUNT(*)\` | number of rows, including all-\`NULL\` rows |
| \`COUNT(col)\` | number of **non-NULL** values in \`col\` |
| \`COUNT(DISTINCT col)\` | number of distinct non-\`NULL\` values |
| \`SUM(expr)\` / \`AVG(expr)\` | total / mean of non-\`NULL\` values |
| \`MIN(col)\` / \`MAX(col)\` | smallest / largest value |

\`SUM\` and \`AVG\` accept any expression, not just a bare column, so \`SUM(quantity * unit_price_cents)\` totals a per-row calculation in one pass.

## Worked example

The demo below runs this health check against six seed orders. It returns one row: \`row_count = 6\`, \`distinct_customers = 3\` (customers 1, 2, and 3, with the two guest \`NULL\`s skipped), \`total_revenue_cents = 18900\`, \`avg_order_cents = 4725.0\`, and \`largest_order_cents = 9900\`.

## The NULL rule that trips everyone

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "order_id",
    "customer_id",
    "total_cents",
    "status"
  ],
  "rows": [
    [
      100,
      1,
      2500,
      "paid"
    ],
    [
      101,
      1,
      5000,
      "paid"
    ],
    [
      102,
      2,
      9900,
      "shipped"
    ],
    [
      103,
      null,
      1500,
      "paid"
    ],
    [
      104,
      3,
      null,
      "abandoned"
    ],
    [
      105,
      null,
      null,
      "abandoned"
    ]
  ],
  "highlightCols": [
    "total_cents"
  ],
  "caption": "AVG(total_cents) sums the four non-NULL totals (18900) and divides by 4, not 6: 4725, never 3150. The two NULL totals (orders 104 and 105) are skipped, not counted as zero."
}
\`\`\`

\`AVG\` **ignores NULLs entirely**. It does not treat them as zero. Two of the six orders have a \`NULL\` total, so \`AVG(total_cents)\` divides by 4 (the non-\`NULL\` count), not 6: \`18900 / 4 = 4725\`, never \`18900 / 6 = 3150\`. Put precisely, \`AVG(col)\` equals \`SUM(col) / COUNT(col)\`, never \`SUM(col) / COUNT(*)\`.

If the business wants NULLs counted as zero, push the default inside the function: \`AVG(COALESCE(total_cents, 0))\` returns \`3150.0\`. The two queries give different answers, and knowing which one the business meant is your job. Likewise, \`COUNT(*)\` and \`COUNT(col)\` diverge the instant \`col\` has a \`NULL\`, so when someone asks "how many orders have a customer?", answer with \`COUNT(customer_id)\`, not \`COUNT(*)\`. Say what you count.

**Interview nuance:** on an empty set (or a column that is entirely \`NULL\`), \`SUM\`, \`AVG\`, \`MIN\`, and \`MAX\` return \`NULL\`, but \`COUNT\` returns \`0\`. This is why production pipelines wrap totals as \`COALESCE(SUM(amount), 0)\`: an all-refunded day should report \`0\` revenue, not a \`NULL\` that silently poisons the next join or arithmetic step downstream.`,
    demoCode: `SELECT
  COUNT(*)                    AS row_count,
  COUNT(DISTINCT customer_id) AS distinct_customers,
  SUM(total_cents)            AS total_revenue_cents,
  AVG(total_cents)            AS avg_order_cents,
  MAX(total_cents)            AS largest_order_cents
FROM orders;`,
    demoSeedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,       -- NULL for guest checkout
  total_cents INTEGER,       -- NULL for abandoned
  status      TEXT
);
INSERT INTO orders VALUES
  (100, 1,    2500, 'paid'),
  (101, 1,    5000, 'paid'),
  (102, 2,    9900, 'shipped'),
  (103, NULL, 1500, 'paid'),      -- guest
  (104, 3,    NULL, 'abandoned'), -- no total
  (105, NULL, NULL, 'abandoned'); -- guest + no total`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-aggregates-apply",
    executionMode: "single-file",
    prompt: `Write a query against \`order_items\` (one row per line item) that returns a **single summary row** with two columns:

- \`total_revenue\`: the sum of \`quantity * unit_price_cents\` across every line
- \`order_count\`: the count of **distinct** \`order_id\` values

Alias the output columns exactly \`total_revenue\` and \`order_count\`.`,
    starterCode: `-- One summary row: total revenue and the number of distinct orders.
SELECT

FROM order_items;`,
    hints: [
      "Aggregates can wrap an *expression*, not just a bare column: `SUM(quantity * unit_price_cents)`.",
      '"Number of distinct orders" is `COUNT(DISTINCT order_id)`, not `COUNT(*)`.',
      "Alias each output column with `AS` so the results are named exactly `total_revenue` and `order_count`.",
    ],
    referenceSolution: `SELECT
  SUM(quantity * unit_price_cents) AS total_revenue,
  COUNT(DISTINCT order_id)         AS order_count
FROM order_items;`,
    singleFile: {
      seedSql: `CREATE TABLE order_items (
  order_item_id    INTEGER PRIMARY KEY,
  order_id         INTEGER,
  product_id       INTEGER,
  quantity         INTEGER,
  unit_price_cents INTEGER
);
INSERT INTO order_items VALUES
  (1, 100, 10, 2, 500),
  (2, 100, 11, 1, 1500),
  (3, 101, 10, 3, 500),
  (4, 102, 12, 1, 9900),
  (5, 102, 11, 2, 1500);`,
      orderMatters: false,
      expected: {
        columns: ["total_revenue", "order_count"],
        rows: [[16900, 3]],
      },
    },
  },
  practice: {
    id: "sql-l2-aggregates-practice",
    executionMode: "single-file",
    prompt: `**Source-health scorecard.** You own the nightly \`orders\` load. Before anything downstream reads the table, you run a one-row scorecard to catch a broken load in seconds. From \`orders\`,
return these four columns, in order:

- \`total_rows\`: every row in the table
- \`distinct_customers\`: count of distinct non-NULL \`customer_id\` values
- \`total_revenue\`: sum of \`total_cents\`, treating NULL totals as \`0\`
- \`avg_order_value\`: average of \`total_cents\` over the rows where it is **not** NULL (plain \`AVG\`,
  which already skips NULLs)

Note that some rows have a NULL \`customer_id\` (guest checkouts) and some have a NULL \`total_cents\`
(abandoned). Your scorecard must handle both correctly.`,
    starterCode: `-- One scorecard row: total_rows, distinct_customers, total_revenue, avg_order_value.
SELECT

FROM orders;`,
    hints: [
      "`COUNT(*)` counts every row; `COUNT(DISTINCT customer_id)` automatically drops the NULL guests.",
      "For revenue, the spec says treat NULL as 0: `SUM(COALESCE(total_cents, 0))` makes that intent explicit.",
      "For the average, the spec wants NULLs *excluded*, which is exactly what a bare `AVG(total_cents)` does. Do **not** COALESCE this one.",
      "Watch the contrast: revenue coalesces, average does not. That difference is the whole point.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,       -- NULL for guest checkout
  total_cents INTEGER,       -- NULL for abandoned
  status      TEXT
);
INSERT INTO orders VALUES
  (100, 1,    2500, 'paid'),
  (101, 1,    5000, 'paid'),
  (102, 2,    9900, 'shipped'),
  (103, NULL, 1500, 'paid'),      -- guest
  (104, 3,    NULL, 'abandoned'), -- no total
  (105, NULL, NULL, 'abandoned'); -- guest + no total`,
      orderMatters: false,
      expected: {
        columns: ["total_rows", "distinct_customers", "total_revenue", "avg_order_value"],
        rows: [[6, 3, 18900, 4725.0]],
      },
    },
  },
  extraPractice: sqlAggregatesDrills,
}

const groupBy: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-group-by",
  title: "GROUP BY",
  summary: "Compute one metric row per category: the shape of a mart.",
  estimatedMinutes: 30,
  difficulty: "medium",
  skills: ["GROUP BY", "grouping keys", "multi-column groups", "aggregate-per-group"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## GROUP BY: one row per bucket

A single aggregate gives you one number for the whole table. But nobody wants "total revenue" alone. They want revenue **per category**, **per month**, **per region**. \`GROUP BY\` is the operator that turns one grand total into one row per bucket. It is, quite literally, the shape of a mart: a fact-like table where each row is a category and each column is a measure.

Here's the mental model. \`GROUP BY category\` slices the table into piles, one pile per distinct \`category\`, then runs your aggregates **once per pile**:

\`\`\`sql
SELECT
  category,
  COUNT(*)          AS product_count,
  AVG(price_cents)  AS avg_price_cents
FROM products
GROUP BY category;
\`\`\`

Input of 20 product rows across 4 categories → output of exactly 4 rows, one per category, each carrying that category's count and average.

\`\`\`csdiagram
{
  "type": "group-by",
  "agg": "AVG",
  "by": "category",
  "rows": [
    {
      "group": "audio",
      "value": 1500
    },
    {
      "group": "audio",
      "value": 3000
    },
    {
      "group": "audio",
      "value": 4500
    },
    {
      "group": "cables",
      "value": 500
    },
    {
      "group": "cables",
      "value": 1000
    }
  ],
  "caption": "GROUP BY category slices rows into piles, then runs AVG(price_cents) once per pile: audio \u2192 3000, cables \u2192 750."
}
\`\`\`

**Anatomy of a grouped query:**

\`\`\`
SELECT   category,           COUNT(*),  AVG(price_cents)
         └── grouping key ──┘ └──── aggregates over each group ────┘
FROM     products
GROUP BY category
         └── one output row per distinct value (or combination) here ──┘
\`\`\`

**The grain.** The single most important thing to say out loud about any grouped query is its **grain**: "one row per \_\_\_." \`GROUP BY category\` → one row per category. \`GROUP BY category, year_month\` → one row per (category, month) combination. The grain is the list of columns in your \`GROUP BY\`. Declaring it keeps you honest about what a row *means*, and it's the first question any reviewer will ask of your mart.

**Multi-column grouping** just means the pile is defined by a *combination*:

\`\`\`sql
SELECT
  category,
  strftime('%Y-%m', order_ts) AS year_month,
  SUM(revenue_cents)          AS revenue_cents
FROM sales
GROUP BY category, strftime('%Y-%m', order_ts);
\`\`\`

One row per category **per month**. That's a monthly revenue mart in five lines.

**The rule that generates half of all GROUP BY errors:** every column in your \`SELECT\` list must be **either** inside an aggregate **or** listed in the \`GROUP BY\`. Why? Because the output has one row per group, so a bare, non-grouped column like \`product_name\` has no single value to show for a whole category; there could be dozens of different names in the pile. Standard SQL (Postgres, SQL Server) *rejects* the query outright.

> **In the warehouse this differs.** SQLite is lax: it will silently pick an arbitrary row's value for an ungrouped column instead of erroring (MySQL in non-strict mode does the same). Postgres, Snowflake, BigQuery, and SQL Server all raise \`column must appear in the GROUP BY clause\`. Don't lean on SQLite's leniency. Write the query as if it will be rejected, because in production it will be. If you truly want one representative value, wrap it in \`MIN()\`/\`MAX()\` to make the choice explicit.

**Keep it readable / common pitfall:** if you group by a computed expression (like \`strftime(...)\`), put the *same expression* in both \`SELECT\` and \`GROUP BY\`. You cannot reference the \`SELECT\` alias inside \`GROUP BY\` in standard SQL: the alias isn't defined yet when \`GROUP BY\` runs. (SQLite and Postgres happen to allow the alias; Oracle and SQL Server do not, so repeat the expression to stay portable.)

**Recap:** \`GROUP BY\` collapses each distinct key (or key combination) into one output row and runs your aggregates per group; the grain *is* your grouping columns, and every selected column must be either aggregated or grouped.`,
    demoCode: `SELECT
  category,
  COUNT(*)          AS product_count,
  AVG(price_cents)  AS avg_price_cents
FROM products
GROUP BY category;`,
    demoSeedSql: `CREATE TABLE products (
  product_id  INTEGER PRIMARY KEY,
  category    TEXT,
  price_cents INTEGER
);
INSERT INTO products VALUES
  (1, 'audio',      1500),
  (2, 'audio',      3000),
  (3, 'audio',      4500),
  (4, 'cables',      500),
  (5, 'cables',     1000),
  (6, 'wearables',  9900),
  (7, 'wearables', 19900),
  (8, 'storage',    4900);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-group-by-apply",
    executionMode: "single-file",
    prompt: `Compute revenue per product category. A join isn't needed: the \`order_items_wide\` table already carries \`category\` and a \`line_revenue_cents\` per row. Return one row per \`category\` with columns \`category\` and \`revenue_cents\` (the sum of \`line_revenue_cents\` for that category), sorted by \`category\` ascending.`,
    starterCode: `-- One row per category: SUM(line_revenue_cents) AS revenue_cents, sorted by category.
SELECT

FROM order_items_wide;`,
    hints: [
      'The grain is "one row per category" → `GROUP BY category`.',
      "Sum the per-line measure inside the group: `SUM(line_revenue_cents)`.",
      "Because `orderMatters` is true, add `ORDER BY category` so rows come back in a deterministic order.",
      "`category` appears in the `SELECT` un-aggregated, so it **must** also appear in `GROUP BY`.",
    ],
    referenceSolution: `SELECT
  category,
  SUM(line_revenue_cents) AS revenue_cents
FROM order_items_wide
GROUP BY category
ORDER BY category;`,
    singleFile: {
      seedSql: `CREATE TABLE order_items_wide (
  order_item_id      INTEGER PRIMARY KEY,
  category           TEXT,
  line_revenue_cents INTEGER
);
INSERT INTO order_items_wide VALUES
  (1, 'audio',      1500),
  (2, 'audio',      3000),
  (3, 'wearables',  9900),
  (4, 'cables',      500),
  (5, 'cables',     1000),
  (6, 'wearables',  9900),
  (7, 'audio',      1500);`,
      orderMatters: true,
      expected: {
        columns: ["category", "revenue_cents"],
        rows: [
          ["audio", 6000],
          ["cables", 1500],
          ["wearables", 19800],
        ],
      },
    },
  },
  practice: {
    id: "sql-l2-group-by-practice",
    executionMode: "single-file",
    prompt: `Build the exact grain an analyst asks for: **one row per (category, year_month)**. From \`sales\`, return columns \`category\`, \`year_month\` (the \`YYYY-MM\` prefix of \`order_ts\`), \`revenue_cents\` (sum of \`line_revenue_cents\`), \`order_count\` (distinct \`order_id\`), and \`distinct_customers\` (distinct \`customer_id\`). Sort by \`category\`, then \`year_month\`. Ignore rows whose \`status\` is \`'cancelled'\` (those never count toward revenue), but keep everything else.`,
    starterCode: `-- One row per (category, year_month) among non-cancelled rows.
-- Columns: category, year_month, revenue_cents, order_count, distinct_customers
SELECT

FROM sales;`,
    hints: [
      "Filter *before* grouping: a `WHERE status <> 'cancelled'` removes cancelled rows before the piles are formed.",
      "Derive the month with `strftime('%Y-%m', order_ts)`, and use that **same expression** in both `SELECT` and `GROUP BY` (don't rely on the alias in `GROUP BY`).",
      "The grain is two columns → `GROUP BY category, strftime('%Y-%m', order_ts)`.",
      "`order_count` and `distinct_customers` are `COUNT(DISTINCT order_id)` and `COUNT(DISTINCT customer_id)` computed within each group.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE sales (
  order_item_id      INTEGER PRIMARY KEY,
  order_id           INTEGER,
  customer_id        INTEGER,
  category           TEXT,
  order_ts           TEXT,      -- ISO-8601, e.g. '2026-01-14 09:00:00'
  status             TEXT,      -- 'paid' | 'shipped' | 'cancelled'
  line_revenue_cents INTEGER
);
INSERT INTO sales VALUES
  (1, 500, 1, 'audio',     '2026-01-05 10:00:00', 'paid',      1500),
  (2, 500, 1, 'audio',     '2026-01-05 10:00:00', 'paid',      1500),
  (3, 501, 2, 'audio',     '2026-01-20 14:00:00', 'shipped',   3000),
  (4, 502, 3, 'wearables', '2026-01-22 09:00:00', 'paid',      9900),
  (5, 503, 1, 'audio',     '2026-02-02 11:00:00', 'paid',      1500),
  (6, 504, 4, 'wearables', '2026-02-10 16:00:00', 'cancelled', 9900),
  (7, 505, 2, 'wearables', '2026-02-11 12:00:00', 'paid',      9900),
  (8, 506, 3, 'audio',     '2026-02-15 08:00:00', 'paid',      3000);`,
      orderMatters: true,
      expected: {
        columns: ["category", "year_month", "revenue_cents", "order_count", "distinct_customers"],
        rows: [
          ["audio", "2026-01", 6000, 2, 2],
          ["audio", "2026-02", 4500, 2, 2],
          ["wearables", "2026-01", 9900, 1, 1],
          ["wearables", "2026-02", 9900, 1, 1],
        ],
      },
    },
  },
}

const having: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-having",
  title: "HAVING: Filtering Groups",
  summary: "Filter on aggregated values, not raw rows.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["HAVING", "WHERE vs HAVING", "filtering on aggregates"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Filter groups, not rows

You know how to compute revenue per category. Now the analyst says: "only show me categories that did more than $1,000." You can't put that in \`WHERE\`. At the time \`WHERE\` runs, there is no per-category total yet; \`WHERE\` sees raw rows, one at a time. You need a filter that runs *after* grouping, on the aggregated value. That's \`HAVING\`.

The pipeline order is the whole lesson:

\`\`\`csdiagram
{
  "type": "pipeline",
  "preset": "sql-select",
  "highlight": ["WHERE", "HAVING"],
  "caption": "WHERE filters raw rows before grouping; HAVING filters whole groups by their aggregate after grouping. Same pipeline, two different phases."
}
\`\`\`

Worked example, categories whose total revenue clears a threshold:

\`\`\`sql
SELECT
  category,
  SUM(line_revenue_cents) AS revenue_cents
FROM order_items_wide
GROUP BY category
HAVING SUM(line_revenue_cents) > 100000;   -- filters GROUPS, not rows
\`\`\`

## Anatomy: WHERE vs HAVING

\`\`\`
WHERE  status = 'paid'                 → keeps rows where a raw column matches
HAVING SUM(revenue_cents) > 100000     → keeps groups where an aggregate matches
\`\`\`

The two are not interchangeable, and using the wrong one **changes the answer**, not just performance. Consider "categories where paid revenue exceeds $1,000":

- Correct: \`WHERE status='paid'\` (drop unpaid rows) → \`GROUP BY category\` → \`HAVING SUM(revenue) > 100000\`.
- Wrong: putting the status test in \`HAVING\`, or the revenue test in \`WHERE\`. \`WHERE SUM(...) > 100000\` is a hard error: you cannot aggregate in \`WHERE\`.

## Keep it readable / common pitfall

Use \`WHERE\` for everything you *can*: filtering rows early shrinks the data before the expensive grouping, and it's cheaper in every engine. Reserve \`HAVING\` strictly for conditions that reference an aggregate. A \`HAVING category = 'audio'\` (no aggregate) works in SQLite but belongs in \`WHERE\`; it signals you've confused the two phases.

> **In the warehouse this differs.** Every engine (Postgres, Snowflake, BigQuery) runs this same logical pipeline (\`WHERE\` before grouping, \`HAVING\` after), so the mental model ports unchanged. An optimizer may physically reorder or push down work, but it can never let a \`HAVING\` aggregate be evaluated before its group exists, which is exactly why an aggregate test cannot live in \`WHERE\`.

**Recap.** \`WHERE\` filters raw rows before grouping; \`HAVING\` filters whole groups by their aggregate after grouping. Put every non-aggregate condition in \`WHERE\` and reserve \`HAVING\` for tests on \`SUM\`/\`COUNT\`/\`AVG\`.`,
    demoCode: `SELECT
  category,
  SUM(line_revenue_cents) AS revenue_cents
FROM order_items_wide
GROUP BY category
HAVING SUM(line_revenue_cents) > 100000;`,
    demoSeedSql: `CREATE TABLE order_items_wide (
  order_item_id      INTEGER PRIMARY KEY,
  category           TEXT,
  line_revenue_cents INTEGER
);
INSERT INTO order_items_wide VALUES
  (1, 'audio',     60000),
  (2, 'audio',     75000),
  (3, 'wearables', 90000),
  (4, 'wearables', 65000),
  (5, 'cables',     5000),
  (6, 'cables',     3000);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-having-apply",
    executionMode: "single-file",
    prompt: `From \`order_items_wide\`, keep only categories whose **total** revenue exceeds \`5000\` cents. Return \`category\` and \`revenue_cents\` (the summed \`line_revenue_cents\`), sorted by \`category\` ascending.`,
    starterCode: `-- Group by category, sum revenue, keep only groups over 5000 cents.
SELECT
  category,

FROM order_items_wide
`,
    hints: [
      "First group by `category` and sum revenue, just like the GROUP BY lesson.",
      "Add a `HAVING` on the same aggregate expression: `HAVING SUM(line_revenue_cents) > 5000`.",
      "`HAVING` runs after grouping, so it can see `SUM(...)`; `WHERE` cannot.",
    ],
    referenceSolution: `SELECT
  category,
  SUM(line_revenue_cents) AS revenue_cents
FROM order_items_wide
GROUP BY category
HAVING SUM(line_revenue_cents) > 5000
ORDER BY category;`,
    singleFile: {
      seedSql: `CREATE TABLE order_items_wide (
  order_item_id      INTEGER PRIMARY KEY,
  category           TEXT,
  line_revenue_cents INTEGER
);
INSERT INTO order_items_wide VALUES
  (1, 'audio',     1500),
  (2, 'audio',     3000),
  (3, 'audio',     1500),
  (4, 'cables',     500),
  (5, 'cables',    1000),
  (6, 'wearables', 9900),
  (7, 'wearables', 9900);`,
      orderMatters: true,
      expected: {
        columns: ["category", "revenue_cents"],
        rows: [
          ["audio", 6000],
          ["wearables", 19800],
        ],
      },
    },
  },
  practice: {
    id: "sql-l2-having-practice",
    executionMode: "single-file",
    prompt: `**Flag high-value segments.** From \`orders\`, find customers who are BOTH frequent AND high-spend. Consider only \`paid\` orders (a pre-aggregation filter). Group by \`customer_id\` and keep customers with **more than 3** paid orders AND **lifetime paid revenue over 20000 cents**. Return \`customer_id\`, \`order_count\` (count of their paid orders), and \`lifetime_revenue\` (sum of their paid \`total_cents\`), sorted by \`lifetime_revenue\` descending. Combine the pre-aggregation \`WHERE status='paid'\` with a two-condition \`HAVING\`.`,
    starterCode: `-- Paid orders only; group by customer; keep frequent AND high-spend customers.
SELECT
  customer_id,

FROM orders
`,
    hints: [
      "`WHERE status = 'paid'` must run first so the cancelled 99000 order never inflates anyone's revenue.",
      "Group by `customer_id`; your two group-level tests both go in `HAVING`.",
      "Combine them with `AND`: `HAVING COUNT(*) > 3 AND SUM(total_cents) > 20000`.",
      "If you accidentally put the status filter in `HAVING` you'd have to write `HAVING ... AND status='paid'`, which is illegal (status isn't aggregated or grouped). Keep row filters in `WHERE`.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,
  status      TEXT,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, 1, 'paid',     8000),
  (2, 1, 'paid',     9000),
  (3, 1, 'paid',     7000),
  (4, 1, 'paid',     6000),
  (5, 2, 'paid',    30000),
  (6, 2, 'paid',    25000),
  (7, 3, 'paid',     1000),
  (8, 3, 'paid',     1000),
  (9, 3, 'paid',     1000),
  (10, 3, 'paid',    1000),
  (11, 1, 'cancelled', 99000);`,
      orderMatters: true,
      expected: {
        columns: ["customer_id", "order_count", "lifetime_revenue"],
        rows: [[1, 4, 30000]],
      },
    },
  },
  extraPractice: sqlHavingDrills,
}

const innerJoin: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-inner-join",
  title: "INNER JOIN and Join Keys",
  summary: "Combine two source tables on a matching key.",
  estimatedMinutes: 30,
  difficulty: "medium",
  skills: ["INNER JOIN", "ON", "join keys", "table aliases", "qualifying columns"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Real data lives in many tables

Real source data is never in one table. A raw e-commerce feed splits \`orders\` (who bought, when,
total) from \`customers\` (name, region, email) from \`products\` (name, category, price). To answer
"revenue by customer region" you must first *stitch these back together* on their shared keys. That
stitching is a **join**, and the everyday workhorse is the \`INNER JOIN\`: it returns rows where a key
in one table **matches** a key in the other, and drops everything with no match on either side.

## Worked example: attach each order to its customer

\`\`\`sql
SELECT
  o.order_id,
  o.total_cents,
  c.customer_name
FROM orders AS o
INNER JOIN customers AS c
  ON o.customer_id = c.customer_id;
\`\`\`

Read it as: for each \`orders\` row, find the \`customers\` row whose \`customer_id\` equals this order's
\`customer_id\`, and glue their columns side by side. An order with no matching customer, or a customer
with no orders, does **not** appear. That's the "inner" part.

Press play to watch each order find its customer, and see exactly why order 103 and Alan drop out:

\`\`\`csdiagram
{
  "type": "join",
  "kind": "inner",
  "left": {
    "name": "orders",
    "columns": ["order_id", "customer_id", "total_cents"],
    "rows": [[100, 1, 2500], [101, 2, 5000], [102, 1, 9900], [103, 9, 1500]]
  },
  "right": {
    "name": "customers",
    "columns": ["customer_id", "customer_name"],
    "rows": [[1, "Ada Lovelace"], [2, "Grace Hopper"], [3, "Alan Turing"]]
  },
  "on": ["customer_id", "customer_id"],
  "caption": "Each order matches its customer on customer_id. Order 103 (customer 9) has no match, so INNER JOIN drops it; Alan (customer 3) has no orders, so he never appears."
}
\`\`\`

## Anatomy of a join

\`\`\`
FROM   orders     AS o          ← left table, aliased 'o'
INNER JOIN customers AS c       ← right table, aliased 'c'
  ON   o.customer_id = c.customer_id
       └─── join key: the column(s) that relate the two tables ───┘
SELECT o.order_id, c.customer_name
       └── qualify columns with the alias so 'customer_id' isn't ambiguous ──┘
\`\`\`

Three habits that make joins readable and correct:

1. **Alias every table** (\`orders AS o\`). Short aliases keep the \`ON\` and \`SELECT\` legible.
2. **Qualify every column** (\`o.order_id\`, not \`order_id\`). The instant two tables share a column
   name, an unqualified reference is ambiguous and errors.
3. **Name the join key deliberately.** The \`ON\` clause is the contract: "these two rows describe the
   same thing."

## Cardinality: the concept that separates a DE from a query monkey

Before you join, know the *relationship* between the tables:

- **N:1 (many-to-one)**: each order points at exactly one customer, but a customer has many orders, so
  \`orders\` to \`customers\` is the canonical many-to-one join. (A true **1:1** is rarer: each row on one
  side matches at most one on the other, like \`users\` to \`user_profiles\`.)
- **1:N (one-to-many)**: one order has *many* \`order_items\`. Joining \`orders\` to \`order_items\`
  multiplies each order row by its number of line items.
- **M:N (many-to-many)**: needs a bridge table (you'll model these in Level 3).

Why this matters: **a 1:N join fans out rows, and a fan-out inflates a \`SUM\`.** If you join \`orders\`
to \`order_items\` and then \`SUM(orders.total_cents)\`, you sum each order's total *once per line item*.
A 3-item order counts its total three times. The revenue triples and looks plausible, which is how bad
numbers ship. The fix is to know your grain: after a fan-out join, aggregate the **line-level** measure
(\`SUM(quantity * unit_price_cents)\`), never the pre-aggregated header total.

## Keep it readable / common pitfall

Forgetting the \`ON\` clause (or writing \`,\`-separated tables with the join condition in \`WHERE\`) can
produce a **cross join**: every row paired with every row, N×M rows. If your result set is
suspiciously huge, you dropped or weakened a join key. Always join on the *full* key; a partial key
silently fans out.

**Recap:** \`INNER JOIN … ON key\` returns only matching rows from both tables; alias and qualify
everything, and always know the cardinality: a 1:N join fans out rows and will double-count any
header-level \`SUM\`.`,
    demoCode: `SELECT
  o.order_id,
  o.total_cents,
  c.customer_name
FROM orders AS o
INNER JOIN customers AS c
  ON o.customer_id = c.customer_id;`,
    demoSeedSql: `CREATE TABLE customers (
  customer_id   INTEGER PRIMARY KEY,
  customer_name TEXT
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,
  total_cents INTEGER
);
INSERT INTO customers VALUES
  (1, 'Ada Lovelace'),
  (2, 'Grace Hopper'),
  (3, 'Alan Turing');
INSERT INTO orders VALUES
  (100, 1, 2500),
  (101, 2, 5000),
  (102, 1, 9900),
  (103, 9, 1500);   -- customer_id 9 does not exist, dropped by INNER JOIN`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-inner-join-apply",
    executionMode: "single-file",
    prompt: `Join \`orders\` to \`customers\` on \`customer_id\`. Return \`order_id\`, \`total_cents\`, and \`customer_name\`, one row per order that has a matching customer, sorted by \`order_id\`.`,
    starterCode: `-- Join orders to its customer, then sort by order_id.
-- Return order_id, total_cents, customer_name.
SELECT

FROM orders AS o
INNER JOIN customers AS c
  ON
ORDER BY o.order_id;`,
    hints: [
      "Put `orders` on the left (`FROM orders o`) and `INNER JOIN customers c ON o.customer_id = c.customer_id`.",
      "Qualify each selected column with its alias: `o.order_id`, `o.total_cents`, `c.customer_name`.",
      "The orphan order (customer 9) disappears automatically. That's the inner join at work; you don't filter it manually.",
      "Add `ORDER BY o.order_id` for a deterministic result.",
    ],
    referenceSolution: `SELECT
  o.order_id,
  o.total_cents,
  c.customer_name
FROM orders AS o
INNER JOIN customers AS c
  ON o.customer_id = c.customer_id
ORDER BY o.order_id;`,
    singleFile: {
      seedSql: `CREATE TABLE customers (
  customer_id   INTEGER PRIMARY KEY,
  customer_name TEXT
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,
  total_cents INTEGER
);
INSERT INTO customers VALUES
  (1, 'Ada Lovelace'),
  (2, 'Grace Hopper'),
  (3, 'Alan Turing');
INSERT INTO orders VALUES
  (100, 1, 2500),
  (101, 2, 5000),
  (102, 1, 9900),
  (103, 9, 1500);   -- customer_id 9 does not exist, dropped by INNER JOIN`,
      orderMatters: true,
      expected: {
        columns: ["order_id", "total_cents", "customer_name"],
        rows: [
          [100, 2500, "Ada Lovelace"],
          [101, 5000, "Grace Hopper"],
          [102, 9900, "Ada Lovelace"],
        ],
      },
    },
  },
  practice: {
    id: "sql-l2-inner-join-practice",
    executionMode: "single-file",
    prompt: `The analytics team needs a line-item fact preview that ties each sale back to its order and its product. Write a query that returns one row **per order item** with columns \`order_item_id\`, \`order_id\`, \`product_name\`, \`category\`, \`order_status\`, and \`line_revenue\` (that item's \`quantity * unit_price_cents\`), sorted by \`order_item_id\`. Build it by inner-joining \`order_items\` to \`orders\` on \`order_id\` and then to \`products\` on \`product_id\`, so an item with no matching order or no matching product drops out.

Because this is a 1:N chain, prove to yourself the grain stays at the line-item level: the output row count must equal the number of \`order_items\` rows that have a matching order **and** a matching product (inner joins on both). Do **not** sum anything; this is a preview at line grain.`,
    starterCode: `-- Line-item fact: order_items -> orders -> products (inner joins on both keys).
-- One row per order item; sort by order_item_id. Do not SUM.
SELECT

FROM order_items AS oi
INNER JOIN orders AS o
  ON
INNER JOIN products AS p
  ON
ORDER BY oi.order_item_id;`,
    hints: [
      "Drive from the most granular table: `FROM order_items oi INNER JOIN orders o ON oi.order_id = o.order_id INNER JOIN products p ON oi.product_id = p.product_id`.",
      "Qualify columns from each of the three aliases; `line_revenue` is computed from `oi.quantity * oi.unit_price_cents`.",
      "The inner join to `products` silently drops item 5 (product 77 missing). That's the correct grain behavior, not a bug to work around.",
      "Resist the urge to `SUM`. The task wants a row-level preview; summing would require choosing the right measure and grain, which is a later lesson.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE customers (
  customer_id   INTEGER PRIMARY KEY,
  customer_name TEXT
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,
  status      TEXT
);
CREATE TABLE products (
  product_id   INTEGER PRIMARY KEY,
  product_name TEXT,
  category     TEXT
);
CREATE TABLE order_items (
  order_item_id    INTEGER PRIMARY KEY,
  order_id         INTEGER,
  product_id       INTEGER,
  quantity         INTEGER,
  unit_price_cents INTEGER
);
INSERT INTO customers VALUES (1,'Ada'),(2,'Grace');
INSERT INTO orders VALUES
  (100, 1, 'paid'),
  (101, 2, 'shipped'),
  (102, 1, 'paid');
INSERT INTO products VALUES
  (10, 'USB-C Cable', 'cables'),
  (11, 'Earbuds',     'audio'),
  (12, 'Smartwatch',  'wearables');
INSERT INTO order_items VALUES
  (1, 100, 10, 2,  500),
  (2, 100, 11, 1, 1500),
  (3, 101, 12, 1, 9900),
  (4, 102, 11, 3, 1500),
  (5, 102, 77, 1, 1000);   -- product 77 does not exist, dropped by inner join to products`,
      orderMatters: true,
      expected: {
        columns: [
          "order_item_id",
          "order_id",
          "product_name",
          "category",
          "order_status",
          "line_revenue",
        ],
        rows: [
          [1, 100, "USB-C Cable", "cables", "paid", 1000],
          [2, 100, "Earbuds", "audio", "paid", 1500],
          [3, 101, "Smartwatch", "wearables", "shipped", 9900],
          [4, 102, "Earbuds", "audio", "paid", 4500],
        ],
      },
    },
  },
  extraPractice: sqlInnerJoinDrills,
}

const leftJoin: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-left-join",
  title: "LEFT JOIN and Preserving Rows",
  summary: "Keep all rows from the driving table even when the match is missing.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["LEFT JOIN", "outer-join NULLs", "preserving the driving side", "COALESCE on join"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Keep the rows an INNER JOIN would drop

An \`INNER JOIN\` silently drops any row without a match. That's often exactly wrong. If you're building "orders per customer," a customer with zero orders should show **0**, not vanish. Dropping them understates your customer base and hides the very thing you might be investigating. The fix is \`LEFT JOIN\`: keep **every** row from the left (driving) table, and fill the right table's columns with \`NULL\` where there's no match.

Worked example, every customer, with their order count, including the silent ones:

\`\`\`sql
SELECT
  c.customer_id,
  c.customer_name,
  COUNT(o.order_id) AS order_count
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name;
\`\`\`

A customer with no orders still appears; their \`o.order_id\` is NULL, and \`COUNT(o.order_id)\` (which skips NULLs) correctly returns \`0\` for them.

\`\`\`csdiagram
{
  "type": "join",
  "kind": "left",
  "left": {
    "name": "customers",
    "columns": [
      "customer_id",
      "customer_name"
    ],
    "rows": [
      [
        1,
        "Ada"
      ],
      [
        2,
        "Grace"
      ],
      [
        3,
        "Alan"
      ]
    ]
  },
  "right": {
    "name": "orders",
    "columns": [
      "order_id",
      "customer_id"
    ],
    "rows": [
      [
        100,
        1
      ],
      [
        101,
        1
      ],
      [
        102,
        2
      ]
    ]
  },
  "on": [
    "customer_id",
    "customer_id"
  ],
  "caption": "LEFT JOIN keeps every customer. Alan (customer 3) has no order, so his orders columns are NULL-padded instead of dropped."
}
\`\`\`

**Anatomy (the NULL is the whole point):**

\`\`\`
customers (LEFT)   LEFT JOIN   orders (RIGHT)
  every row kept  ───────────►  matched cols filled, else NULL
\`\`\`

Two rules that make left joins behave:

1. **\`COUNT(right.col)\` not \`COUNT(*)\`** in an aggregate. \`COUNT(*)\` counts the NULL-padded row as 1, giving a customer with no orders a count of \`1\` instead of \`0\`. \`COUNT(o.order_id)\` skips the NULL and returns \`0\`. This is the single most common left-join-plus-aggregate bug.
2. **Filtering the right table in \`WHERE\` secretly turns a LEFT JOIN into an INNER JOIN.** A condition like \`WHERE o.status = 'paid'\` rejects the NULL-padded no-match rows (because \`NULL = 'paid'\` is not true), silently dropping the very rows you left-joined to preserve. If you must filter the right side, put the condition in the \`ON\` clause (\`LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'\`) so unmatched left rows survive.

**Keep it readable / common pitfall:** use \`COALESCE(right.col, default)\` to turn the NULLs into a sensible display value: \`COALESCE(SUM(o.total_cents), 0)\` shows \`0\` revenue for a customer who never bought, instead of a blank.

**Recap:** \`LEFT JOIN\` preserves every driving-table row and NULL-pads missing matches; aggregate with \`COUNT(right.col)\` for a true 0, and never filter the right table in \`WHERE\` or you collapse it back to an inner join.`,
    demoCode: `SELECT
  c.customer_id,
  c.customer_name,
  COUNT(o.order_id) AS order_count
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name;`,
    demoSeedSql: `CREATE TABLE customers (
  customer_id   INTEGER PRIMARY KEY,
  customer_name TEXT
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER
);
INSERT INTO customers VALUES
  (1, 'Ada'),
  (2, 'Grace'),
  (3, 'Alan');    -- Alan has never ordered
INSERT INTO orders VALUES
  (100, 1),
  (101, 1),
  (102, 2);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-left-join-apply",
    executionMode: "single-file",
    prompt: `List every customer with their order count, including customers who have never ordered (they must show \`0\`). Return \`customer_id\`, \`customer_name\`, \`order_count\`, sorted by \`customer_id\`.`,
    starterCode: `-- Keep every customer; count their orders (0 when they've never ordered).
-- Drive from customers, LEFT JOIN orders, group, and sort by customer_id.
SELECT

FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.customer_id
;`,
    hints: [
      "Drive from `customers` (the table whose rows you must keep): `FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id`.",
      "Aggregate with `COUNT(o.order_id)`, **not** `COUNT(*)`. Otherwise Alan gets `1`.",
      "Group by the customer columns you select: `GROUP BY c.customer_id, c.customer_name`.",
    ],
    referenceSolution: `SELECT
  c.customer_id,
  c.customer_name,
  COUNT(o.order_id) AS order_count
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name
ORDER BY c.customer_id;`,
    singleFile: {
      seedSql: `CREATE TABLE customers (
  customer_id   INTEGER PRIMARY KEY,
  customer_name TEXT
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER
);
INSERT INTO customers VALUES
  (1, 'Ada'),
  (2, 'Grace'),
  (3, 'Alan');    -- Alan has never ordered
INSERT INTO orders VALUES
  (100, 1),
  (101, 1),
  (102, 2);`,
      orderMatters: true,
      expected: {
        columns: ["customer_id", "customer_name", "order_count"],
        rows: [
          [1, "Ada", 2],
          [2, "Grace", 1],
          [3, "Alan", 0],
        ],
      },
    },
  },
  practice: {
    id: "sql-l2-left-join-practice",
    executionMode: "single-file",
    prompt: `**Product coverage report:** For **every** product (including ones that never sold), report total units sold. Return \`product_id\`, \`product_name\`, and \`units_sold\` (sum of \`quantity\` from matching \`order_items\`, shown as \`0\`, not NULL, when the product never sold), sorted by \`product_id\`. A product with no sales must appear with \`units_sold = 0\`.`,
    starterCode: `-- Product coverage: every product with total units_sold (0 when never sold).
-- Drive from products, LEFT JOIN order_items, COALESCE the SUM, sort by product_id.
SELECT

FROM products AS p
LEFT JOIN order_items AS oi
  ON oi.product_id = p.product_id
;`,
    hints: [
      "Drive from `products` and `LEFT JOIN order_items` so unsold products survive.",
      "`SUM(oi.quantity)` returns NULL for a product with no matching items. Wrap it: `COALESCE(SUM(oi.quantity), 0)`.",
      "Group by the product columns; sort by `product_id`.",
      "Don't add a `WHERE` on `oi.*`. It would drop the unsold product and defeat the whole point.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE products (
  product_id   INTEGER PRIMARY KEY,
  product_name TEXT
);
CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  product_id    INTEGER,
  quantity      INTEGER
);
INSERT INTO products VALUES
  (10, 'USB-C Cable'),
  (11, 'Earbuds'),
  (12, 'Smartwatch'),
  (13, 'Screen Protector');   -- never sold
INSERT INTO order_items VALUES
  (1, 10, 2),
  (2, 11, 1),
  (3, 10, 3),
  (4, 12, 1),
  (5, 11, 4);`,
      orderMatters: true,
      expected: {
        columns: ["product_id", "product_name", "units_sold"],
        rows: [
          [10, "USB-C Cable", 5],
          [11, "Earbuds", 5],
          [12, "Smartwatch", 1],
          [13, "Screen Protector", 0],
        ],
      },
    },
  },
  extraPractice: sqlLeftJoinDrills,
}

const antiJoin: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-anti-join",
  title: "Anti-Joins: Finding Missing Matches",
  summary: "Find records that have no counterpart: the DE's referential-integrity check.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["anti-join (LEFT JOIN … IS NULL)", "semi-join concept", "orphan detection"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Referential integrity: find the orphans

Before you trust a source, you check its **referential integrity**: does every \`order\` point at a real \`customer\`? Does every \`order_item\` point at a real \`product\`? Rows that point at a nonexistent parent are **orphans**, and finding them is a DE's daily hygiene. The pattern is the **anti-join**: "give me every left row that has *no* match on the right."

The portable recipe is a \`LEFT JOIN\` plus an \`IS NULL\` filter:

\`\`\`sql
SELECT o.order_id, o.customer_id
FROM orders AS o
LEFT JOIN customers AS c
  ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL;   -- keep ONLY the rows that failed to match
\`\`\`

The \`LEFT JOIN\` keeps every order and NULL-pads the customer columns for unmatched orders. The \`WHERE c.customer_id IS NULL\` then keeps *only* those NULL-padded rows: the orphans. Every matched order is discarded because its \`c.customer_id\` is non-NULL.

\`\`\`csdiagram
{
  "type": "join",
  "kind": "anti",
  "left": {
    "name": "orders",
    "columns": [
      "order_id",
      "customer_id"
    ],
    "rows": [
      [
        100,
        1
      ],
      [
        101,
        9
      ],
      [
        102,
        2
      ],
      [
        103,
        7
      ]
    ]
  },
  "right": {
    "name": "customers",
    "columns": [
      "customer_id"
    ],
    "rows": [
      [
        1
      ],
      [
        2
      ],
      [
        3
      ]
    ]
  },
  "on": [
    "customer_id",
    "customer_id"
  ],
  "caption": "Anti-join keeps only orders with NO matching customer: orders 101 (customer 9) and 103 (customer 7) are the orphans; matched orders 100 and 102 drop out."
}
\`\`\`

**Anatomy:**

\`\`\`
LEFT JOIN customers c ON ...     → matched orders get c.*, orphans get NULLs
WHERE c.customer_id IS NULL      → survives ONLY if there was NO match  ← the anti-join
\`\`\`

**Two siblings, one distinction:**
- **Anti-join** = rows with *no* match (what we just wrote).
- **Semi-join** = rows *with* a match, but you don't want the right table's columns, classically written \`WHERE EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = o.customer_id)\` or \`WHERE o.customer_id IN (SELECT customer_id FROM customers)\`. Use it when you only need to *confirm* a match exists, not pull data from it.

> **In the warehouse this differs.** \`NOT IN\` is a tempting shorthand for an anti-join, but it has a NULL landmine: if the subquery's list contains even one NULL, \`NOT IN\` returns *no rows at all* (three-valued logic: \`x NOT IN (…, NULL)\` is never true). The \`LEFT JOIN … IS NULL\` and \`NOT EXISTS\` patterns are NULL-safe and work identically across SQLite, Postgres, and every warehouse. Prefer them.

**Keep it readable / common pitfall:** the \`IS NULL\` must reference a column that is **guaranteed non-NULL in matched rows**: the join key or the right table's primary key. If you \`IS NULL\`-check a nullable right column, you'll misclassify matched rows (that legitimately have a NULL there) as orphans.

**Recap:** An anti-join finds rows with no counterpart via \`LEFT JOIN … WHERE right.key IS NULL\`, the backbone of orphan/FK checks; prefer it (or \`NOT EXISTS\`) over \`NOT IN\`, which breaks on NULLs.`,
    demoCode: `SELECT o.order_id, o.customer_id
FROM orders AS o
LEFT JOIN customers AS c
  ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL;`,
    demoSeedSql: `CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER
);
INSERT INTO customers VALUES (1),(2),(3);
INSERT INTO orders VALUES
  (100, 1),
  (101, 9),    -- orphan: customer 9 doesn't exist
  (102, 2),
  (103, 7);    -- orphan: customer 7 doesn't exist`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-anti-join-apply",
    executionMode: "single-file",
    prompt: `Find \`orders\` whose \`customer_id\` has no matching row in \`customers\` (orphaned orders). Return \`order_id\` and \`customer_id\`, sorted by \`order_id\`.`,
    starterCode: `-- Anti-join: keep only orders with no matching customer.
SELECT
FROM orders AS o
LEFT JOIN customers AS c
  ON o.customer_id = c.customer_id
`,
    hints: [
      "`LEFT JOIN customers c ON o.customer_id = c.customer_id` keeps all orders.",
      "Filter to the unmatched ones with `WHERE c.customer_id IS NULL`.",
      "Select from the `orders` side (`o.order_id`, `o.customer_id`). The `customers` columns are all NULL for orphans.",
    ],
    referenceSolution: `SELECT o.order_id, o.customer_id
FROM orders AS o
LEFT JOIN customers AS c
  ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL
ORDER BY o.order_id;`,
    singleFile: {
      seedSql: `CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER
);
INSERT INTO customers VALUES (1),(2),(3);
INSERT INTO orders VALUES
  (100, 1),
  (101, 9),    -- orphan: customer 9 doesn't exist
  (102, 2),
  (103, 7);    -- orphan: customer 7 doesn't exist`,
      orderMatters: true,
      expected: {
        columns: ["order_id", "customer_id"],
        rows: [
          [101, 9],
          [103, 7],
        ],
      },
    },
  },
  practice: {
    id: "sql-l2-anti-join-practice",
    executionMode: "single-file",
    prompt: `Write a query that returns the \`order_item_id\` and \`product_id\` of every **orphaned line item**: an \`order_items\` row whose \`product_id\` has no matching row in \`products\`. Sort by \`order_item_id\`.`,
    starterCode: `-- Anti-join: keep only order_items with no matching product.
SELECT
FROM order_items AS oi
LEFT JOIN products AS p
  ON oi.product_id = p.product_id
`,
    hints: [
      "`LEFT JOIN products p ON oi.product_id = p.product_id` keeps every line item.",
      "Filter to the unmatched ones with `WHERE p.product_id IS NULL`.",
      "Select from the `order_items` side (`oi.order_item_id`, `oi.product_id`); the `products` columns are NULL for orphans. Finish with `ORDER BY oi.order_item_id`.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE products (
  product_id INTEGER PRIMARY KEY
);
CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  order_id      INTEGER,
  product_id    INTEGER
);
INSERT INTO products VALUES (10),(11),(12);
INSERT INTO order_items VALUES
  (1, 100, 10),
  (2, 100, 99),      -- product 99 doesn't exist → orphan item
  (3, 101, 11),
  (4, 101, 88);      -- product 88 doesn't exist → orphan item`,
      orderMatters: true,
      expected: {
        columns: ["order_item_id", "product_id"],
        rows: [
          [2, 99],
          [4, 88],
        ],
      },
    },
  },
}

const selfJoin: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-self-join",
  title: "Self-Joins and RIGHT/FULL OUTER",
  summary: "Join a table to itself and reconcile two sources with outer joins.",
  estimatedMinutes: 30,
  difficulty: "hard",
  skills: ["self-join", "RIGHT JOIN", "FULL OUTER JOIN", "aliasing one table twice"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Why relate a table to itself

Org charts, threaded comments, category trees, "customers referred by other customers": all of these store a relationship between two rows of the *same* table. The table has a column that points back at its own primary key (\`manager_id\` referencing \`employee_id\`). To read the pair as one row ("Grace reports to Ada"), you join the table to itself. Interviewers love this because it proves you understand that a join operates on *aliases*, not table names.

## A self-join is an ordinary join with two aliases

There is no special \`SELF JOIN\` keyword. You list the same table twice, give each appearance a different alias, and join them like any two tables. Picture two independent copies of the rows: \`e\` is "the employee I am describing" and \`m\` is "the row that happens to be that employee's manager."

\`\`\`sql
SELECT
  e.employee_name AS employee,
  m.employee_name AS manager
FROM employees AS e
LEFT JOIN employees AS m
  ON e.manager_id = m.employee_id;
\`\`\`

The \`ON\` clause matches each employee's \`manager_id\` to some row's \`employee_id\`. Using \`LEFT JOIN\` (not \`INNER\`) keeps top-level people whose \`manager_id\` is \`NULL\`; they survive with a \`NULL\` manager instead of vanishing. Against the seed data you get:

\`\`\`text
employee   | manager
-----------+--------
Ada        | NULL
Grace      | Ada
Alan       | Ada
Katherine  | Grace
\`\`\`

Add \`ORDER BY e.employee_name\` when output order matters. Row order is not guaranteed otherwise.

## Outer joins for reconciling two sources

Now the two inputs are different tables: yesterday's snapshot and today's. To see what was *added*, *dropped*, or *changed*, you need every key from *both* sides. That is a \`FULL OUTER JOIN\`: keep all left rows, all right rows, and \`NULL\`-pad wherever a match is missing. A \`RIGHT JOIN\` is simply a \`LEFT JOIN\` with the operands swapped (keep every right-side row).

\`\`\`csdiagram
{
  "type": "join",
  "kind": "full",
  "left": {
    "name": "yesterday",
    "columns": [
      "customer_id",
      "tier"
    ],
    "rows": [
      [
        1,
        "gold"
      ],
      [
        2,
        "silver"
      ],
      [
        3,
        "bronze"
      ],
      [
        4,
        "silver"
      ]
    ]
  },
  "right": {
    "name": "today",
    "columns": [
      "customer_id",
      "tier"
    ],
    "rows": [
      [
        1,
        "gold"
      ],
      [
        2,
        "gold"
      ],
      [
        4,
        "silver"
      ],
      [
        5,
        "bronze"
      ]
    ]
  },
  "on": [
    "customer_id",
    "customer_id"
  ],
  "caption": "FULL OUTER JOIN keeps keys from both snapshots. Customer 3 (only yesterday) was dropped; customer 5 (only today) was added; both surface with a NULL on the missing side."
}
\`\`\`

Because an unmatched key is \`NULL\` on the missing side, recover one clean key with \`COALESCE(y.customer_id, t.customer_id)\`, then put yesterday's and today's values side by side and let the \`NULL\`s tell the story:

\`\`\`sql
SELECT
  COALESCE(y.customer_id, t.customer_id) AS customer_id,
  y.tier AS tier_yesterday,
  t.tier AS tier_today
FROM yesterday AS y
FULL OUTER JOIN today AS t
  ON y.customer_id = t.customer_id;
\`\`\`

Read the result a row at a time: a \`NULL\` \`tier_yesterday\` means the customer is new *today* (added); a \`NULL\` \`tier_today\` means they vanished (dropped); two different non-\`NULL\` tiers means the tier *changed*. Collapsing those three tests into a single \`change_type\` label is a job for \`CASE\`, which you meet later this level; for now the two columns carry the full diff.

\`RIGHT\` and \`FULL OUTER JOIN\` only arrived in SQLite 3.39 (2022); Postgres, Snowflake, BigQuery, and SQL Server have had them for years. Older engines emulate \`FULL OUTER\` as a \`LEFT JOIN\` unioned with the reversed \`LEFT JOIN\`.

**Interview nuance:** SQL uses three-valued logic. Any comparison involving \`NULL\`, including \`NULL = NULL\` and \`NULL <> NULL\`, returns \`unknown\` rather than \`true\` or \`false\`, and only \`true\` passes a \`WHERE\` or \`ON\`. This one rule explains why an added customer's \`NULL\`-padded tier never compares equal to today's, why \`col NOT IN (subquery_with_a_null)\` returns zero rows, and why you match missing keys with \`IS NULL\` instead of \`= NULL\`.`,
    demoCode: `SELECT
  e.employee_name AS employee,
  m.employee_name AS manager
FROM employees AS e
LEFT JOIN employees AS m
  ON e.manager_id = m.employee_id;`,
    demoSeedSql: `CREATE TABLE employees (
  employee_id   INTEGER PRIMARY KEY,
  employee_name TEXT,
  manager_id    INTEGER     -- NULL for the top of the org
);
INSERT INTO employees VALUES
  (1, 'Ada',   NULL),
  (2, 'Grace', 1),
  (3, 'Alan',  1),
  (4, 'Katherine', 2);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-self-join-apply",
    executionMode: "single-file",
    prompt: `Self-join \`employees\` to pair each employee with their manager's name. Return \`employee\`
(the person's name) and \`manager\` (their manager's name, or NULL for someone with no manager), sorted
by \`employee\`.`,
    starterCode: `-- Alias employees twice: e = the employee, m = their manager.
-- Return employee, manager; sort by employee.
SELECT

FROM employees AS e
`,
    hints: [
      "Alias the table twice: `FROM employees e LEFT JOIN employees m ON e.manager_id = m.employee_id`.",
      "Use `LEFT JOIN` (not `INNER`) so Ada, who has no manager, still appears with a NULL manager.",
      "Select `e.employee_name AS employee` and `m.employee_name AS manager`.",
    ],
    referenceSolution: `SELECT
  e.employee_name AS employee,
  m.employee_name AS manager
FROM employees AS e
LEFT JOIN employees AS m
  ON e.manager_id = m.employee_id
ORDER BY e.employee_name;`,
    singleFile: {
      seedSql: `CREATE TABLE employees (
  employee_id   INTEGER PRIMARY KEY,
  employee_name TEXT,
  manager_id    INTEGER     -- NULL for the top of the org
);
INSERT INTO employees VALUES
  (1, 'Ada',   NULL),
  (2, 'Grace', 1),
  (3, 'Alan',  1),
  (4, 'Katherine', 2);`,
      orderMatters: true,
      expected: {
        columns: ["employee", "manager"],
        rows: [
          ["Ada", null],
          ["Alan", "Ada"],
          ["Grace", "Ada"],
          ["Katherine", "Grace"],
        ],
      },
    },
  },
  practice: {
    id: "sql-l2-self-join-practice",
    executionMode: "single-file",
    prompt: `You run a daily diff on the customer dimension to feed a slowly-changing-dimension loader. Comparing yesterday's and today's snapshots, write a query that returns one row per customer with \`customer_id\` (the non-NULL id from whichever snapshot has it), \`tier_yesterday\`, and \`tier_today\`. A \`NULL\` on one side flags a customer added or dropped that day. Use a \`FULL OUTER JOIN\` on \`customer_id\` so rows present on only one side are still surfaced, and sort by \`customer_id\`.`,
    starterCode: `-- FULL OUTER JOIN the two snapshots on customer_id.
-- Return the non-NULL customer_id plus each side's tier; sort by customer_id.
SELECT

FROM snapshot_yesterday AS y
`,
    hints: [
      "`FROM snapshot_yesterday y FULL OUTER JOIN snapshot_today t ON y.customer_id = t.customer_id` (SQLite 3.39+ supports this).",
      "Get a single id with `COALESCE(y.customer_id, t.customer_id) AS customer_id`.",
      "Expose both sides: `y.tier AS tier_yesterday`, `t.tier AS tier_today`. A `NULL` on one side means the customer was added (only today) or dropped (only yesterday).",
      "Finish with `ORDER BY customer_id`.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE snapshot_yesterday (
  customer_id INTEGER PRIMARY KEY,
  tier        TEXT
);
CREATE TABLE snapshot_today (
  customer_id INTEGER PRIMARY KEY,
  tier        TEXT
);
INSERT INTO snapshot_yesterday VALUES
  (1, 'gold'),
  (2, 'silver'),
  (3, 'bronze'),
  (4, 'silver');
INSERT INTO snapshot_today VALUES
  (1, 'gold'),      -- unchanged
  (2, 'gold'),      -- changed (silver -> gold)
  (4, 'silver'),    -- unchanged
  (5, 'bronze');    -- added; customer 3 dropped`,
      orderMatters: true,
      expected: {
        columns: ["customer_id", "tier_yesterday", "tier_today"],
        rows: [
          [1, "gold", "gold"],
          [2, "silver", "gold"],
          [3, "bronze", null],
          [4, "silver", "silver"],
          [5, null, "bronze"],
        ],
      },
    },
  },
}

const setOps: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-set-ops",
  title: "UNION, INTERSECT, EXCEPT",
  summary: "Stack and compare result sets with set logic.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["UNION", "UNION ALL", "INTERSECT", "EXCEPT", "column compatibility"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Stack rows, don't glue columns

A join glues tables **horizontally** (adding columns). Set operations stack or compare them **vertically** (combining *rows*). As a DE you reach for them constantly: stacking multi-region loads into one stream, or diffing yesterday's IDs against today's to find what disappeared.

The four operators, all requiring both sides to have the **same number of columns with compatible types**:

| Operator | Meaning |
|---|---|
| \`UNION ALL\` | stack all rows from both, **keep duplicates** (cheapest: no dedup pass) |
| \`UNION\` | stack and **remove duplicate rows** |
| \`INTERSECT\` | rows present in **both** result sets |
| \`EXCEPT\` | rows in the first set but **not** the second (a set difference / diff) |

## Worked example: stack two regional order feeds

\`\`\`sql
SELECT order_id, total_cents FROM orders_eu
UNION ALL
SELECT order_id, total_cents FROM orders_us;
\`\`\`

**Anatomy:**

\`\`\`
SELECT a, b FROM left_source
UNION ALL                       ← operator sits BETWEEN two full SELECTs
SELECT a, b FROM right_source   ← same column count, compatible types, matched by POSITION
ORDER BY a                      ← a single ORDER BY applies to the whole combined result, at the end
\`\`\`

Columns are matched **by position, not by name**: the first column of the top query lines up with the first column of the bottom, regardless of what they're called. The output takes its column names from the *first* \`SELECT\`.

## \`UNION\` vs \`UNION ALL\`: a real cost decision

\`UNION\` runs a deduplication pass (effectively a sort or hash) over the combined rows; \`UNION ALL\` just concatenates. Note that \`UNION\` dedupes on the **entire row**, not on one key column: in the demo above, EU order 101 and US order 201 both have \`total_cents\` = 5000, yet swapping \`UNION ALL\` for \`UNION\` drops nothing and returns the same 5 rows, because their \`order_id\`s differ. A row disappears only when *every* selected column matches, such as the same order arriving in both regional feeds under the same \`order_id\` and total. When you *know* the sources don't overlap, or you *want* to keep such duplicates (two identical rows can be two real events), use \`UNION ALL\`. Reaching for \`UNION\` by reflex silently drops legitimate duplicate rows *and* costs more.

## Keep it readable / common pitfall

Put \`ORDER BY\` only once, after the final \`SELECT\`. It sorts the whole combined set. An \`ORDER BY\` inside an individual branch is either ignored or an error depending on the engine.

**Recap.** Set operators combine rows vertically by column position: \`UNION ALL\` stacks and keeps dupes (cheapest), \`UNION\` dedupes, \`INTERSECT\` keeps common rows, and \`EXCEPT\` computes a diff.`,
    demoCode: `SELECT order_id, total_cents FROM orders_eu
UNION ALL
SELECT order_id, total_cents FROM orders_us;`,
    demoSeedSql: `CREATE TABLE orders_eu (
  order_id    INTEGER,
  total_cents INTEGER
);
CREATE TABLE orders_us (
  order_id    INTEGER,
  total_cents INTEGER
);
INSERT INTO orders_eu VALUES
  (100, 2500),
  (101, 5000),
  (102, 9900);
INSERT INTO orders_us VALUES
  (200, 1500),
  (201, 5000);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-set-ops-apply",
    executionMode: "single-file",
    prompt: `Combine two regional order tables into one stream, keeping every row (including any coincidental duplicates). Return \`order_id\` and \`region\` for all EU and US orders, using \`UNION ALL\`, sorted by \`order_id\`, then \`region\`.`,
    starterCode: `-- Stack both regional feeds with UNION ALL, keep every row, then sort.
SELECT order_id, region FROM orders_eu
-- combine with orders_us here
;`,
    hints: [
      "Write two `SELECT order_id, region FROM …` and join them with `UNION ALL`.",
      "Both branches must expose the same two columns in the same order.",
      "A single `ORDER BY order_id, region` goes at the very end, after the second `SELECT`.",
    ],
    referenceSolution: `SELECT order_id, region FROM orders_eu
UNION ALL
SELECT order_id, region FROM orders_us
ORDER BY order_id, region;`,
    singleFile: {
      seedSql: `CREATE TABLE orders_eu (
  order_id INTEGER,
  region   TEXT
);
CREATE TABLE orders_us (
  order_id INTEGER,
  region   TEXT
);
INSERT INTO orders_eu VALUES (100,'EU'),(101,'EU'),(102,'EU');
INSERT INTO orders_us VALUES (200,'US'),(201,'US');`,
      orderMatters: true,
      expected: {
        columns: ["order_id", "region"],
        rows: [
          [100, "EU"],
          [101, "EU"],
          [102, "EU"],
          [200, "US"],
          [201, "US"],
        ],
      },
    },
  },
  practice: {
    id: "sql-l2-set-ops-practice",
    executionMode: "single-file",
    prompt: `Diff two source extracts. Find customer IDs that were present in yesterday's extract but are **missing** from today's (dropped customers) using \`EXCEPT\`. Return a single column \`dropped_customer_id\`, sorted ascending. (Both extracts may contain duplicate rows within themselves. \`EXCEPT\` treats each side as a set, which is exactly what you want for a presence diff.)`,
    starterCode: `-- Rows present yesterday but absent today, via EXCEPT.
-- One column: dropped_customer_id, sorted ascending.
SELECT customer_id AS dropped_customer_id FROM extract_yesterday
;`,
    hints: [
      "`EXCEPT` returns rows in the first `SELECT` that aren't in the second: `SELECT customer_id FROM extract_yesterday EXCEPT SELECT customer_id FROM extract_today`.",
      "`EXCEPT` already deduplicates, so the doubled `2` in yesterday collapses to a set automatically.",
      "Alias isn't applied per-branch: name the output column in the first `SELECT` (`SELECT customer_id AS dropped_customer_id …`) and sort at the end.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE extract_yesterday (
  customer_id INTEGER
);
CREATE TABLE extract_today (
  customer_id INTEGER
);
INSERT INTO extract_yesterday VALUES (1),(2),(2),(3),(4);
INSERT INTO extract_today     VALUES (2),(3),(5);`,
      orderMatters: true,
      expected: {
        columns: ["dropped_customer_id"],
        rows: [[1], [4]],
      },
    },
  },
}

const subqueries: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-subqueries",
  title: "Subqueries: Scalar, IN, and Correlated",
  summary: "Nest a query inside another to filter or compute against a derived value.",
  estimatedMinutes: 30,
  difficulty: "hard",
  skills: ["scalar subquery", "IN subquery", "correlated subquery", "EXISTS"],
  teach: {
    estimatedMinutes: 10,
    markdown: `## Three shapes of subquery

A subquery is a \`SELECT\` nested inside another query. You use one whenever a filter or a computed value depends on *another query's result*: "orders above the overall average," "customers who have ever ordered," "orders bigger than that customer's own average." There are three shapes, and knowing which is which is a common interview probe.

**1. Scalar subquery** returns exactly one row, one column; usable anywhere a single value is:

\`\`\`sql
SELECT order_id, total_cents
FROM orders
WHERE total_cents > (SELECT AVG(total_cents) FROM orders);
\`\`\`

The inner query yields one number (the overall average); the outer query compares each order to it.

**2. \`IN\` (or \`NOT IN\`) subquery** returns one column, many rows; tests set membership:

\`\`\`sql
SELECT customer_id, customer_name
FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders);   -- customers who have ordered
\`\`\`

**3. Correlated subquery** references the outer row, so it re-runs *per outer row*:

\`\`\`sql
SELECT o.order_id, o.customer_id, o.total_cents
FROM orders AS o
WHERE o.total_cents > (
  SELECT AVG(o2.total_cents)
  FROM orders AS o2
  WHERE o2.customer_id = o.customer_id   -- ← the correlation: depends on the outer o
);
\`\`\`

For each order, the inner query computes *that order's customer's* average: "orders above their own customer's average."

**Anatomy (spot the correlation):**

\`\`\`
non-correlated: inner query is self-contained, runs ONCE
correlated:     inner query references an outer alias (o), re-evaluated per outer row
\`\`\`

**\`EXISTS\`** is the correlated cousin of \`IN\`: \`WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)\`, true if at least one matching row exists. It's the NULL-safe way to write a semi-join.

> **Performance note.** A correlated subquery conceptually re-runs per outer row, which can be slow on large tables. Very often the same result is expressible as a **join** or a **window function** (Level 4), which the optimizer executes in one pass. Reach for the correlated form for clarity, but know that "above their own group's average" is a textbook case a window function does faster.

**Keep it readable / common pitfall:** a scalar subquery that accidentally returns more than one row is *not* caught by SQLite, the engine this course runs. It silently uses whichever row the subquery produces first, so the mistake surfaces as quietly wrong data rather than an error. (Extra *columns* are caught: \`SELECT (SELECT order_id, total_cents FROM orders)\` raises \`sub-select returns 2 columns - expected 1\`. Extra rows are not.) And remember the \`NOT IN\` + NULL trap from Level 1: if the subquery can emit a NULL, prefer \`NOT EXISTS\`.

> **In the warehouse this differs.** Real warehouses do reject a multi-row scalar subquery: Postgres raises \`more than one row returned by a subquery used as an expression\`, and Snowflake and BigQuery raise their own equivalent. SQLite never checks, so a query that fails loudly in production returns silently wrong rows here. Make the subquery provably single-row yourself with an aggregate (\`AVG\`, \`MAX\`) or a \`LIMIT 1\` instead of trusting the engine to catch it.

**Recap:** Subqueries come in three shapes: scalar (one value), \`IN\` (a column of values), and correlated (re-runs per outer row referencing it); correlated logic is clear but often beaten on speed by a join or a window function.`,
    demoCode: `SELECT order_id, total_cents
FROM orders
WHERE total_cents > (SELECT AVG(total_cents) FROM orders);`,
    demoSeedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (100, 1000),
  (101, 2000),
  (102, 9000),
  (103, 3000),
  (104,  500);
-- average = (1000 + 2000 + 9000 + 3000 + 500) / 5 = 3100`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-subqueries-apply",
    executionMode: "single-file",
    prompt: `Return every order whose \`total_cents\` exceeds the **overall average** \`total_cents\` across all orders (a scalar subquery). Return \`order_id\` and \`total_cents\`, sorted by \`order_id\`.`,
    starterCode: `-- Keep orders above the overall average total_cents, sorted by order_id.
SELECT order_id, total_cents
FROM orders
WHERE ;`,
    hints: [
      "Compute the average in a scalar subquery: `(SELECT AVG(total_cents) FROM orders)`.",
      "Compare each row to it in the `WHERE`: `WHERE total_cents > (…)`.",
      "The subquery returns one value, so it slots directly into the comparison.",
    ],
    referenceSolution: `SELECT order_id, total_cents
FROM orders
WHERE total_cents > (SELECT AVG(total_cents) FROM orders)
ORDER BY order_id;`,
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (100, 1000),
  (101, 2000),
  (102, 9000),
  (103, 3000),
  (104,  500);
-- average = (1000 + 2000 + 9000 + 3000 + 500) / 5 = 3100`,
      orderMatters: true,
      expected: {
        columns: ["order_id", "total_cents"],
        rows: [[102, 9000]],
      },
    },
  },
  practice: {
    id: "sql-l2-subqueries-practice",
    executionMode: "single-file",
    prompt: `**Above-their-own-average orders (correlated).** For each order, keep it only if its \`total_cents\` is **strictly greater** than the average \`total_cents\` of that same customer's orders. Return \`customer_id\`, \`order_id\`, and \`total_cents\`, sorted by \`customer_id\`, then \`order_id\`. Use a correlated subquery that averages within the outer row's customer.

(Note for yourself: a window function \`AVG() OVER (PARTITION BY customer_id)\` would compute this in one pass. You'll meet it in Level 4.)`,
    starterCode: `-- Keep orders whose total exceeds their OWN customer's average (correlated subquery).
SELECT o.customer_id, o.order_id, o.total_cents
FROM orders AS o
WHERE ;`,
    hints: [
      "Alias the outer table (`orders o`) and use a second alias inside (`orders o2`) so the subquery can correlate on `o2.customer_id = o.customer_id`.",
      "The inner query is `SELECT AVG(o2.total_cents) FROM orders o2 WHERE o2.customer_id = o.customer_id`.",
      "Compare with strict `>` so an order equal to its customer's average (customer 3) is excluded.",
      "This is the correlated shape: the inner query references the outer `o`, so it re-evaluates per order.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (100, 1, 1000),
  (101, 1, 3000),   -- cust 1 avg = 2000 → 3000 qualifies, 1000 does not
  (102, 2, 5000),
  (103, 2, 5000),
  (104, 2, 8000),   -- cust 2 avg = 6000 → only 8000 qualifies
  (105, 3, 4000);   -- cust 3 avg = 4000 → nothing strictly above`,
      orderMatters: true,
      expected: {
        columns: ["customer_id", "order_id", "total_cents"],
        rows: [
          [1, 101, 3000],
          [2, 104, 8000],
        ],
      },
    },
  },
  extraPractice: sqlSubqueryDrills,
}

const ctes: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-ctes",
  title: "CTEs: Readable Multi-Step Queries",
  summary: "Name subqueries with WITH so a transform reads top-to-bottom.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["WITH", "single and chained CTEs", "refactoring nested subqueries"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Why nested subqueries get unreadable

A nested subquery forces you to read inside-out: find the innermost \`SELECT\`, understand it, then peel outward one layer at a time. Two levels deep and code review slows to a crawl. A Common Table Expression (CTE), written with \`WITH\`, names each step so the query reads top-to-bottom like a pipeline. This is not cosmetic. Production SQL, including every dbt model, is built as a chain of named CTEs precisely because named stages are reviewable, testable, and self-documenting.

## A CTE is a named subquery, scoped to one statement

\`WITH name AS ( ... )\` defines a temporary named result you can then query like a table. The demo below filters \`orders\` down to paid rows in a CTE called \`paid_orders\`, then aggregates revenue per customer from that CTE:

\`\`\`sql
WITH paid_orders AS (
  SELECT customer_id, total_cents
  FROM orders
  WHERE status = 'paid'
)
SELECT customer_id, SUM(total_cents) AS revenue
FROM paid_orders
GROUP BY customer_id;
-- customer_id | revenue
-- 1           | 7000
-- 2           | 1000
-- 3           | 6000
\`\`\`

Customer \`2\`'s \`cancelled\` order for \`9000\` never reaches the aggregate, because the \`WHERE status = 'paid'\` filter lives inside the CTE. Without an \`ORDER BY\` the row order is not guaranteed, so add one when order matters.

## Chaining stages: aggregate first, filter second

Each CTE can reference the ones defined above it, giving the staging, intermediate, mart shape:

\`\`\`sql
WITH paid_orders AS (
  SELECT customer_id, total_cents FROM orders WHERE status = 'paid'
),
per_customer AS (
  SELECT customer_id, SUM(total_cents) AS revenue
  FROM paid_orders
  GROUP BY customer_id
)
SELECT customer_id, revenue
FROM per_customer
WHERE revenue > 5000
ORDER BY customer_id;
\`\`\`

The payoff is that final \`WHERE revenue > 5000\`. You cannot filter on an aggregate in the same \`SELECT\` that computes it: \`WHERE SUM(total_cents) > 5000\` fails with \`misuse of aggregate\`, because \`WHERE\` is evaluated before rows are grouped. The one-statement fix is \`HAVING\`, but splitting the aggregate into its own CTE lets the next stage treat \`revenue\` as an ordinary column and filter it with a plain \`WHERE\`. As stages pile up, that reads far better, and it is exactly the structure the Apply and Practice ask for.

## Pitfalls

- Commas separate CTE definitions, but there is no comma before the final \`SELECT\`: \`... ), per_customer AS ( ... ) SELECT ...\`.
- A CTE is scoped to the single statement that begins with its \`WITH\`. A later, separate query cannot see it.
- Put each filter at the right stage. Row filters like \`status = 'paid'\` belong in the first CTE; aggregate filters (\`revenue\`, \`order_count\`) belong in a stage that reads the already-aggregated CTE.

**Interview nuance:** a CTE does not make a query faster on its own. Logically it is just a named subquery. Postgres 12 and later inline a non-recursive CTE that is referenced once, so it plans identically to the equivalent subquery, while Postgres 11 and earlier always materialized every CTE, which could actually be slower. Reach for CTEs to make a transform readable and reusable, not to optimize it.`,
    demoCode: `WITH paid_orders AS (
  SELECT customer_id, total_cents
  FROM orders
  WHERE status = 'paid'
)
SELECT customer_id, SUM(total_cents) AS revenue
FROM paid_orders
GROUP BY customer_id;`,
    demoSeedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,
  status      TEXT,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, 1, 'paid',      3000),
  (2, 1, 'paid',      4000),
  (3, 2, 'paid',      1000),
  (4, 2, 'cancelled', 9000),
  (5, 3, 'paid',      6000);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-ctes-apply",
    executionMode: "single-file",
    prompt: `Rewrite a two-level nested subquery as **two chained CTEs**. From \`orders\`: first select the paid
orders, then aggregate revenue per customer, then return only customers with revenue over \`5000\`.
Return \`customer_id\` and \`revenue\`, sorted by \`customer_id\` ascending.`,
    starterCode: `-- Two chained CTEs: paid_orders, then per_customer, then filter.
WITH paid_orders AS (

),
per_customer AS (

)
SELECT customer_id, revenue
FROM per_customer
`,
    hints: [
      "First CTE `paid_orders`: `SELECT customer_id, total_cents FROM orders WHERE status = 'paid'`.",
      "Second CTE `per_customer` reads the first: `SELECT customer_id, SUM(total_cents) AS revenue FROM paid_orders GROUP BY customer_id`.",
      "Final `SELECT ... FROM per_customer WHERE revenue > 5000 ORDER BY customer_id`. No comma before this final SELECT.",
    ],
    referenceSolution: `WITH paid_orders AS (
  SELECT customer_id, total_cents
  FROM orders
  WHERE status = 'paid'
),
per_customer AS (
  SELECT customer_id, SUM(total_cents) AS revenue
  FROM paid_orders
  GROUP BY customer_id
)
SELECT customer_id, revenue
FROM per_customer
WHERE revenue > 5000
ORDER BY customer_id;`,
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,
  status      TEXT,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, 1, 'paid',      3000),
  (2, 1, 'paid',      4000),
  (3, 2, 'paid',      1000),
  (4, 2, 'cancelled', 9000),
  (5, 3, 'paid',      6000);`,
      orderMatters: true,
      expected: {
        columns: ["customer_id", "revenue"],
        rows: [
          [1, 7000],
          [3, 6000],
        ],
      },
    },
  },
  practice: {
    id: "sql-l2-ctes-practice",
    executionMode: "single-file",
    prompt: `Write a query that returns one row per customer with \`customer_id\`, \`order_count\`, and
\`revenue\`, keeping only customers who have **more than 1** paid order and **more than 10000** in total
revenue, sorted by \`revenue\` descending. Revenue is the sum of each paid order line's
\`quantity * unit_price_cents\`, and \`order_count\` is the count of distinct paid orders. Build it as
three CTE stages like a production pipeline: \`paid_orders\` (paid orders joined to their line items,
each line's revenue), \`per_customer\` (revenue and distinct order count per customer), then a final
\`SELECT\` that applies the filter and sort.`,
    starterCode: `-- Three stages: paid_orders (join), per_customer (aggregate), then the mart filter.
WITH paid_orders AS (

),
per_customer AS (

)
SELECT customer_id, order_count, revenue
FROM per_customer
`,
    hints: [
      "Stage 1 `paid_orders`: `SELECT o.order_id, o.customer_id, oi.quantity * oi.unit_price_cents AS line_revenue FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid'`.",
      "Stage 2 `per_customer`: group stage 1 by `customer_id`, computing `COUNT(DISTINCT order_id) AS order_count` and `SUM(line_revenue) AS revenue`.",
      "Use `COUNT(DISTINCT order_id)` for order count: a fan-out join means a single order can span multiple item rows.",
      "Final filter: `WHERE order_count > 1 AND revenue > 10000`, ordered by `revenue DESC`.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,
  status      TEXT
);
CREATE TABLE order_items (
  order_item_id    INTEGER PRIMARY KEY,
  order_id         INTEGER,
  quantity         INTEGER,
  unit_price_cents INTEGER
);
INSERT INTO orders VALUES
  (100, 1, 'paid'),
  (101, 1, 'paid'),
  (102, 2, 'paid'),
  (103, 3, 'cancelled'),
  (104, 3, 'paid');
INSERT INTO order_items VALUES
  (1, 100, 2, 3000),
  (2, 101, 1, 8000),
  (3, 102, 1, 5000),
  (4, 103, 1, 9999),
  (5, 104, 1, 4000);`,
      orderMatters: true,
      expected: {
        columns: ["customer_id", "order_count", "revenue"],
        rows: [[1, 2, 14000]],
      },
    },
  },
  extraPractice: sqlCtesDrills,
}

const caseExpr: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-case",
  title: "CASE: Conditional Columns",
  summary: "Branch a value inside a query for bucketing and pivoting.",
  estimatedMinutes: 25,
  difficulty: "medium",
  skills: ["CASE WHEN", "searched vs simple CASE", "conditional aggregation"],
  teach: {
    estimatedMinutes: 10,
    markdown: `## CASE is SQL's if/else

\`CASE\` is SQL's \`if/else\`. It lets you compute a *different value per row* based on conditions:
bucketing a numeric measure into labels, mapping codes to names, or (the DE power move) pivoting rows
into columns via **conditional aggregation**.

## Searched CASE: the general form

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "order_id",
    "total_cents",
    "size_bucket"
  ],
  "rows": [
    [
      100,
      500,
      "small"
    ],
    [
      101,
      2000,
      "medium"
    ],
    [
      102,
      9900,
      "medium"
    ],
    [
      103,
      10000,
      "large"
    ],
    [
      104,
      15000,
      "large"
    ]
  ],
  "highlightCols": [
    "size_bucket"
  ],
  "caption": "Each total_cents falls through the WHEN branches top-to-bottom; the first true branch sets size_bucket. 9900 is not >= 10000 so it lands in 'medium', while 10000 crosses the threshold into 'large'."
}
\`\`\`

Conditions can be anything:

\`\`\`sql
SELECT
  order_id,
  CASE
    WHEN total_cents >= 10000 THEN 'large'
    WHEN total_cents >= 2000  THEN 'medium'
    ELSE 'small'
  END AS size_bucket
FROM orders;
\`\`\`

Conditions are tested top-to-bottom; the **first** true branch wins, so order them from most to least
specific. If none match and there's no \`ELSE\`, the result is NULL.

## Simple CASE: shorthand for equality checks

Shorthand when you're comparing one expression to constants:

\`\`\`sql
CASE status WHEN 'paid' THEN 1 WHEN 'cancelled' THEN 0 ELSE NULL END
\`\`\`

## Anatomy

\`\`\`
CASE WHEN cond1 THEN val1     ← first matching branch wins
     WHEN cond2 THEN val2
     ELSE fallback            ← optional; without it, no-match → NULL
END AS alias
\`\`\`

## The conditional-aggregation trick: pivoting rows into columns

Wrap a \`CASE\` inside an aggregate and you turn categories into columns. To count paid vs cancelled
*side by side, per day*:

\`\`\`sql
SELECT
  order_date,
  SUM(CASE WHEN status = 'paid'      THEN 1 ELSE 0 END) AS paid_count,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
FROM orders
GROUP BY order_date;
\`\`\`

Each \`CASE\` emits \`1\` for the rows it wants and \`0\` otherwise; the \`SUM\` counts them. This is how
you build a classic reporting mart (one row per day, one column per status) without a dedicated PIVOT
operator.

> **In the warehouse this differs: PIVOT.** Snowflake, SQL Server, and others ship a dedicated
> \`PIVOT\` operator, but its syntax is warehouse-specific. Conditional aggregation with
> \`SUM(CASE …)\` is the fully portable equivalent (it runs on every engine, including SQLite), so we
> author pivots that way here.

## Keep it readable / common pitfall

Every branch of a \`CASE\` should return the **same type**. Mixing \`'small'\` (text) and \`0\` (number)
across branches yields inconsistent typing that some engines coerce and others reject. Also:
\`COUNT(CASE WHEN … THEN 1 END)\` works too (COUNT skips the NULL from the missing \`ELSE\`), but
\`SUM(CASE … THEN 1 ELSE 0 END)\` is the clearer, more portable idiom.

## Recap

\`CASE\` branches a value per row (first true \`WHEN\` wins) for bucketing; wrapped inside \`SUM\`/\`COUNT\`
it becomes conditional aggregation: the portable way to pivot categories into side-by-side columns.`,
    demoCode: `SELECT
  order_id,
  CASE
    WHEN total_cents >= 10000 THEN 'large'
    WHEN total_cents >= 2000  THEN 'medium'
    ELSE 'small'
  END AS size_bucket
FROM orders;`,
    demoSeedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (100,   500),
  (101,  2000),
  (102,  9900),
  (103, 10000),
  (104, 15000);`,
    showDemoInput: true,
  },
  apply: {
    id: "sql-l2-case-apply",
    executionMode: "single-file",
    prompt: `Bucket each order by \`total_cents\` into \`size_bucket\`: \`'large'\` if >= 10000,
\`'medium'\` if >= 2000 (and < 10000), else \`'small'\`. Return \`order_id\` and \`size_bucket\`, sorted
by \`order_id\`.`,
    starterCode: `-- Bucket each order into size_bucket, sorted by order_id.
SELECT
  order_id,

FROM orders
ORDER BY order_id;`,
    hints: [
      "Order the `WHEN` branches from highest threshold down: check `>= 10000` first, then `>= 2000`.",
      "The first true branch wins, so you don't need upper bounds. A 15000 order matches `>= 10000` before reaching `>= 2000`.",
      "Add an `ELSE 'small'` for everything below 2000, and alias the whole thing `AS size_bucket`.",
    ],
    referenceSolution: `SELECT
  order_id,
  CASE
    WHEN total_cents >= 10000 THEN 'large'
    WHEN total_cents >= 2000  THEN 'medium'
    ELSE 'small'
  END AS size_bucket
FROM orders
ORDER BY order_id;`,
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (100,   500),
  (101,  2000),
  (102,  9900),
  (103, 10000),
  (104, 15000);`,
      orderMatters: true,
      expected: {
        columns: ["order_id", "size_bucket"],
        rows: [
          [100, "small"],
          [101, "medium"],
          [102, "medium"],
          [103, "large"],
          [104, "large"],
        ],
      },
    },
  },
  practice: {
    id: "sql-l2-case-practice",
    executionMode: "single-file",
    prompt: `Build a daily status report using **conditional aggregation**: **one row per
\`order_date\`** with three count columns: \`paid_count\`, \`shipped_count\`, \`cancelled_count\`.
Return \`order_date\`, \`paid_count\`, \`shipped_count\`, \`cancelled_count\`, sorted by \`order_date\`.
Every date present in the source must appear, and a status with zero occurrences that day must show
\`0\` (not NULL).`,
    starterCode: `-- One row per order_date; three conditional-aggregation count columns.
SELECT
  order_date,

FROM orders
GROUP BY order_date
ORDER BY order_date;`,
    hints: [
      "`GROUP BY order_date` gives one row per day.",
      "Each count column is `SUM(CASE WHEN status = '<x>' THEN 1 ELSE 0 END)`. The `ELSE 0` guarantees a `0`, not a NULL, for absent statuses.",
      "Three such `SUM(CASE …)` expressions, one per status, become your three columns.",
      "Sort by `order_date` for a deterministic report.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE orders (
  order_id   INTEGER PRIMARY KEY,
  order_date TEXT,     -- 'YYYY-MM-DD'
  status     TEXT      -- 'paid' | 'shipped' | 'cancelled'
);
INSERT INTO orders VALUES
  (1, '2026-03-01', 'paid'),
  (2, '2026-03-01', 'paid'),
  (3, '2026-03-01', 'cancelled'),
  (4, '2026-03-02', 'shipped'),
  (5, '2026-03-02', 'shipped'),
  (6, '2026-03-02', 'paid'),
  (7, '2026-03-03', 'cancelled');`,
      orderMatters: true,
      expected: {
        columns: ["order_date", "paid_count", "shipped_count", "cancelled_count"],
        rows: [
          ["2026-03-01", 2, 0, 1],
          ["2026-03-02", 1, 2, 0],
          ["2026-03-03", 0, 0, 1],
        ],
      },
    },
  },
}

export const sqlLevel2: SqlLevel = {
  id: 2,
  slug: "aggregation",
  title: "Level 2: Aggregation & Joins (Combining Source Data)",
  tagline: "Aggregates, GROUP BY/HAVING, every join flavor, subqueries, CTEs: building metrics.",
  defaultExecutionMode: "single-file",
  estimatedHours: 5,
  modules: [
    {
      id: "sql-l2-aggregation",
      title: "Module 2.1: Aggregation and Grouping",
      description:
        "Collapse rows into metrics: the aggregate functions, GROUP BY for per-category rollups, and HAVING to filter groups.",
      lessons: [aggregates, groupBy, having],
    },
    {
      id: "sql-l2-joins",
      title: "Module 2.2: Joining Tables",
      description:
        "Combine source tables: inner joins on keys, LEFT joins that preserve rows, anti-joins for gaps, and self/outer joins.",
      lessons: [innerJoin, leftJoin, antiJoin, selfJoin],
    },
    {
      id: "sql-l2-sets-subqueries",
      title: "Module 2.3: Set Operations and Subqueries",
      description:
        "Stack and compare result sets with UNION/INTERSECT/EXCEPT, and nest queries as scalar, IN, and correlated subqueries.",
      lessons: [setOps, subqueries],
    },
    {
      id: "sql-l2-readability",
      title: "Module 2.4: Readability and Conditional Logic",
      description: "Make complex SQL legible with CTEs, and branch per-row with CASE expressions.",
      lessons: [ctes, caseExpr],
    },
  ],
}

import type { SqlLevel } from "@/lib/tutorials/types"

const aggregates: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-aggregates",
  title: "Aggregate Functions",
  summary: "Collapse many rows into a single measure — the atom of every metric.",
  estimatedMinutes: 20,
  difficulty: "easy",
  skills: ["COUNT", "SUM", "AVG", "MIN", "MAX", "COUNT(DISTINCT)", "NULL handling in aggregates"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## The atom of every metric

Every dashboard number you've ever seen — total revenue, active users, average order value — is
an **aggregate**: a function that eats many rows and emits one value. As a DE, the first thing you
do after a table lands is run a handful of aggregates to sanity-check the load. Row count looks
right? Revenue in the expected ballpark? No absurd max? These are your smoke tests.

## The five workhorses

| Function | Returns |
|---|---|
| \`COUNT(*)\` | number of rows |
| \`COUNT(col)\` | number of **non-NULL** values in \`col\` |
| \`COUNT(DISTINCT col)\` | number of distinct non-NULL values |
| \`SUM(col)\` / \`AVG(col)\` | total / mean of non-NULL values |
| \`MIN(col)\` / \`MAX(col)\` | smallest / largest value |

A worked example — the "health check" of an orders table:

\`\`\`sql
SELECT
  COUNT(*)                    AS row_count,
  COUNT(DISTINCT customer_id) AS distinct_customers,
  SUM(total_cents)            AS total_revenue_cents,
  AVG(total_cents)            AS avg_order_cents,
  MAX(total_cents)            AS largest_order_cents
FROM orders;
\`\`\`

One row out. Five numbers that tell you whether the load is sane.

## The NULL rule that trips everyone

\`\`\`
COUNT(*)            -> counts rows, even all-NULL rows
COUNT(email)        -> skips rows where email IS NULL
AVG(total_cents)    -> divides SUM by the COUNT of NON-NULL values, not by COUNT(*)
\`\`\`

That last one is the classic interview trap. \`AVG\` **ignores NULLs entirely** — it does not treat
them as zero. If half your \`total_cents\` are NULL, \`AVG(total_cents)\` averages only the other half.
If you *want* NULLs to count as zero, wrap first: \`AVG(COALESCE(total_cents, 0))\`. Those two queries
give different answers, and knowing which one the business meant is your job.

**Keep it readable / common pitfall.** \`COUNT(*)\` vs \`COUNT(col)\` diverge the moment \`col\` has a
NULL. When someone asks "how many orders have a customer?", they mean \`COUNT(customer_id)\`, not
\`COUNT(*)\`. Say what you count.

**Recap.** Aggregates collapse many rows to one number and silently skip NULLs — \`COUNT(*)\` counts
rows, \`COUNT(col)\`/\`SUM\`/\`AVG\` count only non-NULL values, and \`COUNT(DISTINCT col)\` counts unique
ones.`,
    demoCode: `SELECT
  COUNT(*)                    AS row_count,
  COUNT(DISTINCT customer_id) AS distinct_customers,
  SUM(total_cents)            AS total_revenue_cents,
  AVG(total_cents)            AS avg_order_cents,
  MAX(total_cents)            AS largest_order_cents
FROM orders;`,
  },
  apply: {
    id: "sql-l2-aggregates-apply",
    executionMode: "single-file",
    prompt: `From \`order_items\`, return a **single row** with two columns:

- \`total_revenue\` — the sum of \`quantity * unit_price_cents\` across every line
- \`order_count\` — the number of **distinct** \`order_id\` values present

Alias the columns exactly as named.`,
    starterCode: `-- One summary row: total revenue and the count of distinct orders.
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
    prompt: `**Source-health scorecard.** After a nightly load you want one summary row. From \`orders\`,
return these four columns, in order:

- \`total_rows\` — every row in the table
- \`distinct_customers\` — count of distinct non-NULL \`customer_id\` values
- \`total_revenue\` — sum of \`total_cents\`, treating NULL totals as \`0\`
- \`avg_order_value\` — average of \`total_cents\` over the rows where it is **not** NULL (plain \`AVG\`,
  which already skips NULLs)

Note that some rows have a NULL \`customer_id\` (guest checkouts) and some have a NULL \`total_cents\`
(abandoned) — your scorecard must handle both correctly.`,
    starterCode: `-- One scorecard row: total_rows, distinct_customers, total_revenue, avg_order_value.
SELECT

FROM orders;`,
    hints: [
      "`COUNT(*)` counts every row; `COUNT(DISTINCT customer_id)` automatically drops the NULL guests.",
      "For revenue, the spec says treat NULL as 0 — `SUM(COALESCE(total_cents, 0))` makes that intent explicit.",
      "For the average, the spec wants NULLs *excluded*, which is exactly what a bare `AVG(total_cents)` does — do **not** COALESCE this one.",
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
}

const groupBy: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-group-by",
  title: "GROUP BY",
  summary: "Compute one metric row per category — the shape of a mart.",
  estimatedMinutes: 30,
  difficulty: "medium",
  skills: ["GROUP BY", "grouping keys", "multi-column groups", "aggregate-per-group"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## GROUP BY — one row per bucket

A single aggregate gives you one number for the whole table. But nobody wants "total revenue" alone — they want revenue **per category**, **per month**, **per region**. \`GROUP BY\` is the operator that turns one grand total into one row per bucket. It is, quite literally, the shape of a mart: a fact-like table where each row is a category and each column is a measure.

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

**The rule that generates half of all GROUP BY errors:** every column in your \`SELECT\` list must be **either** inside an aggregate **or** listed in the \`GROUP BY\`. Why? Because the output has one row per group — so a bare, non-grouped column like \`product_name\` has no single value to show for a whole category; there could be dozens of different names in the pile. Standard SQL (Postgres, SQL Server) *rejects* the query outright.

> **In the warehouse this differs.** SQLite is lax: it will silently pick an arbitrary row's value for an ungrouped column instead of erroring (MySQL in non-strict mode does the same). Postgres, Snowflake, BigQuery, and SQL Server all raise \`column must appear in the GROUP BY clause\`. Don't lean on SQLite's leniency — write the query as if it will be rejected, because in production it will be. If you truly want one representative value, wrap it in \`MIN()\`/\`MAX()\` to make the choice explicit.

**Keep it readable / common pitfall:** if you group by a computed expression (like \`strftime(...)\`), put the *same expression* in both \`SELECT\` and \`GROUP BY\`. You cannot reference the \`SELECT\` alias inside \`GROUP BY\` in standard SQL — the alias isn't defined yet when \`GROUP BY\` runs. (SQLite and Postgres happen to allow the alias; Oracle and SQL Server do not — repeat the expression to stay portable.)

**Recap:** \`GROUP BY\` collapses each distinct key (or key combination) into one output row and runs your aggregates per group; the grain *is* your grouping columns, and every selected column must be either aggregated or grouped.`,
    demoCode: `SELECT
  category,
  COUNT(*)          AS product_count,
  AVG(price_cents)  AS avg_price_cents
FROM products
GROUP BY category;`,
  },
  apply: {
    id: "sql-l2-group-by-apply",
    executionMode: "single-file",
    prompt: `Compute revenue per product category. A join isn't needed — the \`order_items_wide\` table already carries \`category\` and a \`line_revenue_cents\` per row. Return one row per \`category\` with columns \`category\` and \`revenue_cents\` (the sum of \`line_revenue_cents\` for that category), sorted by \`category\` ascending.`,
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
    prompt: `Build the exact grain an analyst asks for: **one row per (category, year_month)**. From \`sales\`, return columns \`category\`, \`year_month\` (the \`YYYY-MM\` prefix of \`order_ts\`), \`revenue_cents\` (sum of \`line_revenue_cents\`), \`order_count\` (distinct \`order_id\`), and \`distinct_customers\` (distinct \`customer_id\`). Sort by \`category\`, then \`year_month\`. Ignore rows whose \`status\` is \`'cancelled'\` — those never count toward revenue — but keep everything else.`,
    starterCode: `-- One row per (category, year_month) among non-cancelled rows.
-- Columns: category, year_month, revenue_cents, order_count, distinct_customers
SELECT

FROM sales;`,
    hints: [
      "Filter *before* grouping: a `WHERE status <> 'cancelled'` removes cancelled rows before the piles are formed.",
      "Derive the month with `strftime('%Y-%m', order_ts)` — and use that **same expression** in both `SELECT` and `GROUP BY` (don't rely on the alias in `GROUP BY`).",
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

You know how to compute revenue per category. Now the analyst says: "only show me categories that did more than $1,000." You can't put that in \`WHERE\` — at the time \`WHERE\` runs, there is no per-category total yet; \`WHERE\` sees raw rows, one at a time. You need a filter that runs *after* grouping, on the aggregated value. That's \`HAVING\`.

The pipeline order is the whole lesson:

\`\`\`
FROM      → read rows
WHERE     → filter individual rows            (before grouping)
GROUP BY  → collapse rows into groups
HAVING    → filter whole groups by aggregate  (after grouping)
SELECT    → project columns
ORDER BY  → sort the surviving groups
\`\`\`

Worked example — categories whose total revenue clears a threshold:

\`\`\`sql
SELECT
  category,
  SUM(line_revenue_cents) AS revenue_cents
FROM order_items_wide
GROUP BY category
HAVING SUM(line_revenue_cents) > 100000;   -- filters GROUPS, not rows
\`\`\`

## Anatomy — WHERE vs HAVING

\`\`\`
WHERE  status = 'paid'                 → keeps rows where a raw column matches
HAVING SUM(revenue_cents) > 100000     → keeps groups where an aggregate matches
\`\`\`

The two are not interchangeable, and using the wrong one **changes the answer**, not just performance. Consider "categories where paid revenue exceeds $1,000":

- Correct: \`WHERE status='paid'\` (drop unpaid rows) → \`GROUP BY category\` → \`HAVING SUM(revenue) > 100000\`.
- Wrong: putting the status test in \`HAVING\`, or the revenue test in \`WHERE\`. \`WHERE SUM(...) > 100000\` is a hard error — you cannot aggregate in \`WHERE\`.

## Keep it readable / common pitfall

Use \`WHERE\` for everything you *can* — filtering rows early shrinks the data before the expensive grouping, and it's cheaper in every engine. Reserve \`HAVING\` strictly for conditions that reference an aggregate. A \`HAVING category = 'audio'\` (no aggregate) works in SQLite but belongs in \`WHERE\`; it signals you've confused the two phases.

> **In the warehouse this differs.** Every engine — Postgres, Snowflake, BigQuery — runs this same logical pipeline (\`WHERE\` before grouping, \`HAVING\` after), so the mental model ports unchanged. An optimizer may physically reorder or push down work, but it can never let a \`HAVING\` aggregate be evaluated before its group exists — which is exactly why an aggregate test cannot live in \`WHERE\`.

**Recap.** \`WHERE\` filters raw rows before grouping; \`HAVING\` filters whole groups by their aggregate after grouping — put every non-aggregate condition in \`WHERE\` and reserve \`HAVING\` for tests on \`SUM\`/\`COUNT\`/\`AVG\`.`,
    demoCode: `SELECT
  category,
  SUM(line_revenue_cents) AS revenue_cents
FROM order_items_wide
GROUP BY category
HAVING SUM(line_revenue_cents) > 100000;`,
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
      "If you accidentally put the status filter in `HAVING` you'd have to write `HAVING ... AND status='paid'`, which is illegal (status isn't aggregated or grouped) — keep row filters in `WHERE`.",
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
}

export const sqlLevel2: SqlLevel = {
  id: 2,
  slug: "aggregation",
  title: "Level 2 — Aggregation & Joins: Combining Source Data",
  tagline: "Aggregates, GROUP BY/HAVING, every join flavor, subqueries, CTEs — building metrics.",
  defaultExecutionMode: "single-file",
  estimatedHours: 5,
  modules: [
    {
      id: "sql-l2-aggregation",
      title: "Module 2.1 — Aggregation and Grouping",
      description:
        "Collapse rows into metrics: the aggregate functions, GROUP BY for per-category rollups, and HAVING to filter groups.",
      lessons: [aggregates, groupBy, having],
    },
  ],
}

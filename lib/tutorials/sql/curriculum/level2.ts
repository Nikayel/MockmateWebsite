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

## Worked example — attach each order to its customer

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
with no orders, does **not** appear — that's the "inner" part.

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
2. **Qualify every column** (\`o.order_id\`, not \`order_id\`) — the instant two tables share a column
   name, an unqualified reference is ambiguous and errors.
3. **Name the join key deliberately.** The \`ON\` clause is the contract: "these two rows describe the
   same thing."

## Cardinality — the concept that separates a DE from a query monkey

Before you join, know the *relationship* between the tables:

- **1:1** — each order has exactly one customer *record*, but reversed a customer has many orders, so
  order→customer is *many-to-one*.
- **1:N** — one order has *many* \`order_items\`. Joining \`orders\` to \`order_items\` multiplies each
  order row by its number of line items.
- **M:N** — needs a bridge table (you'll model these in Level 3).

Why this matters: **a 1:N join fans out rows, and a fan-out inflates a \`SUM\`.** If you join \`orders\`
to \`order_items\` and then \`SUM(orders.total_cents)\`, you sum each order's total *once per line item* —
a 3-item order counts its total three times. The revenue triples and looks plausible, which is how bad
numbers ship. The fix is to know your grain: after a fan-out join, aggregate the **line-level** measure
(\`SUM(quantity * unit_price_cents)\`), never the pre-aggregated header total.

## Keep it readable / common pitfall

Forgetting the \`ON\` clause (or writing \`,\`-separated tables with the join condition in \`WHERE\`) can
produce a **cross join** — every row paired with every row, N×M rows. If your result set is
suspiciously huge, you dropped or weakened a join key. Always join on the *full* key; a partial key
silently fans out.

**Recap:** \`INNER JOIN … ON key\` returns only matching rows from both tables; alias and qualify
everything, and always know the cardinality — a 1:N join fans out rows and will double-count any
header-level \`SUM\`.`,
    demoCode: `SELECT
  o.order_id,
  o.total_cents,
  c.customer_name
FROM orders AS o
INNER JOIN customers AS c
  ON o.customer_id = c.customer_id;`,
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
      "The orphan order (customer 9) disappears automatically — that's the inner join at work; you don't filter it manually.",
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
    prompt: `Assemble a line-item fact by joining three tables: \`order_items\` → \`orders\` (on \`order_id\`) → \`products\` (on \`product_id\`). Return one row **per order item** with columns \`order_item_id\`, \`order_id\`, \`product_name\`, \`category\`, \`order_status\`, and \`line_revenue\` (that item's \`quantity * unit_price_cents\`), sorted by \`order_item_id\`.

Because this is a 1:N chain, prove to yourself the grain stays at the line-item level — the output row count must equal the number of \`order_items\` rows that have a matching order **and** a matching product (inner joins on both). Do **not** sum anything; this is a preview at line grain.`,
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
      "The inner join to `products` silently drops item 5 (product 77 missing) — that's the correct grain behavior, not a bug to work around.",
      "Resist the urge to `SUM` — the task wants a row-level preview; summing would require choosing the right measure and grain, which is a later lesson.",
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

An \`INNER JOIN\` silently drops any row without a match. That's often exactly wrong. If you're building "orders per customer," a customer with zero orders should show **0**, not vanish — dropping them understates your customer base and hides the very thing you might be investigating. The fix is \`LEFT JOIN\`: keep **every** row from the left (driving) table, and fill the right table's columns with \`NULL\` where there's no match.

Worked example — every customer, with their order count, including the silent ones:

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

A customer with no orders still appears; their \`o.order_id\` is NULL, and \`COUNT(o.order_id)\` — which skips NULLs — correctly returns \`0\` for them.

**Anatomy — the NULL is the whole point:**

\`\`\`
customers (LEFT)   LEFT JOIN   orders (RIGHT)
  every row kept  ───────────►  matched cols filled, else NULL
\`\`\`

Two rules that make left joins behave:

1. **\`COUNT(right.col)\` not \`COUNT(*)\`** in an aggregate. \`COUNT(*)\` counts the NULL-padded row as 1, giving a customer with no orders a count of \`1\` instead of \`0\`. \`COUNT(o.order_id)\` skips the NULL and returns \`0\`. This is the single most common left-join-plus-aggregate bug.
2. **Filtering the right table in \`WHERE\` secretly turns a LEFT JOIN into an INNER JOIN.** A condition like \`WHERE o.status = 'paid'\` rejects the NULL-padded no-match rows (because \`NULL = 'paid'\` is not true), silently dropping the very rows you left-joined to preserve. If you must filter the right side, put the condition in the \`ON\` clause (\`LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'\`) so unmatched left rows survive.

**Keep it readable / common pitfall:** use \`COALESCE(right.col, default)\` to turn the NULLs into a sensible display value — \`COALESCE(SUM(o.total_cents), 0)\` shows \`0\` revenue for a customer who never bought, instead of a blank.

**Recap:** \`LEFT JOIN\` preserves every driving-table row and NULL-pads missing matches; aggregate with \`COUNT(right.col)\` for a true 0, and never filter the right table in \`WHERE\` or you collapse it back to an inner join.`,
    demoCode: `SELECT
  c.customer_id,
  c.customer_name,
  COUNT(o.order_id) AS order_count
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name;`,
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
      "Aggregate with `COUNT(o.order_id)`, **not** `COUNT(*)` — otherwise Alan gets `1`.",
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
    prompt: `**Product coverage report:** For **every** product (including ones that never sold), report total units sold. Return \`product_id\`, \`product_name\`, and \`units_sold\` (sum of \`quantity\` from matching \`order_items\`, shown as \`0\` — not NULL — when the product never sold), sorted by \`product_id\`. A product with no sales must appear with \`units_sold = 0\`.`,
    starterCode: `-- Product coverage: every product with total units_sold (0 when never sold).
-- Drive from products, LEFT JOIN order_items, COALESCE the SUM, sort by product_id.
SELECT

FROM products AS p
LEFT JOIN order_items AS oi
  ON oi.product_id = p.product_id
;`,
    hints: [
      "Drive from `products` and `LEFT JOIN order_items` so unsold products survive.",
      "`SUM(oi.quantity)` returns NULL for a product with no matching items — wrap it: `COALESCE(SUM(oi.quantity), 0)`.",
      "Group by the product columns; sort by `product_id`.",
      "Don't add a `WHERE` on `oi.*` — it would drop the unsold product and defeat the whole point.",
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
}

const antiJoin: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l2-anti-join",
  title: "Anti-Joins: Finding Missing Matches",
  summary: "Find records that have no counterpart — the DE's referential-integrity check.",
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

The \`LEFT JOIN\` keeps every order and NULL-pads the customer columns for unmatched orders. The \`WHERE c.customer_id IS NULL\` then keeps *only* those NULL-padded rows — the orphans. Every matched order is discarded because its \`c.customer_id\` is non-NULL.

**Anatomy:**

\`\`\`
LEFT JOIN customers c ON ...     → matched orders get c.*, orphans get NULLs
WHERE c.customer_id IS NULL      → survives ONLY if there was NO match  ← the anti-join
\`\`\`

**Two siblings, one distinction:**
- **Anti-join** = rows with *no* match (what we just wrote).
- **Semi-join** = rows *with* a match, but you don't want the right table's columns — classically written \`WHERE EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = o.customer_id)\` or \`WHERE o.customer_id IN (SELECT customer_id FROM customers)\`. Use it when you only need to *confirm* a match exists, not pull data from it.

> **In the warehouse this differs.** \`NOT IN\` is a tempting shorthand for an anti-join, but it has a NULL landmine: if the subquery's list contains even one NULL, \`NOT IN\` returns *no rows at all* (three-valued logic — \`x NOT IN (…, NULL)\` is never true). The \`LEFT JOIN … IS NULL\` and \`NOT EXISTS\` patterns are NULL-safe and work identically across SQLite, Postgres, and every warehouse. Prefer them.

**Keep it readable / common pitfall:** the \`IS NULL\` must reference a column that is **guaranteed non-NULL in matched rows** — the join key or the right table's primary key. If you \`IS NULL\`-check a nullable right column, you'll misclassify matched rows (that legitimately have a NULL there) as orphans.

**Recap:** An anti-join finds rows with no counterpart via \`LEFT JOIN … WHERE right.key IS NULL\` — the backbone of orphan/FK checks; prefer it (or \`NOT EXISTS\`) over \`NOT IN\`, which breaks on NULLs.`,
    demoCode: `SELECT o.order_id, o.customer_id
FROM orders AS o
LEFT JOIN customers AS c
  ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL;`,
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
      "Select from the `orders` side (`o.order_id`, `o.customer_id`) — the `customers` columns are all NULL for orphans.",
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
    prompt: `Referential audit (union of two anti-joins): produce a single problem report of two kinds of integrity break, tagged by type. Return columns \`issue_type\` and \`bad_id\`, where each row is either:
- \`'orphan_order_item'\` — an \`order_items\` row whose \`product_id\` has no matching product; \`bad_id\` is the \`order_item_id\`.
- \`'customer_no_orders'\` — a \`customers\` row that has never appeared in \`orders\`; \`bad_id\` is the \`customer_id\`.

Stack both anti-joins with \`UNION ALL\` and sort by \`issue_type\`, then \`bad_id\`.`,
    starterCode: `-- Two anti-joins, each tagged with a literal issue_type, stacked with UNION ALL.
SELECT 'orphan_order_item' AS issue_type, oi.order_item_id AS bad_id
FROM order_items AS oi
LEFT JOIN products AS p ON oi.product_id = p.product_id
WHERE
UNION ALL
-- second anti-join here
`,
    hints: [
      "Write each anti-join separately first. Orphan items: `order_items LEFT JOIN products … WHERE products.product_id IS NULL`. Customers with no orders: `customers LEFT JOIN orders … WHERE orders.order_id IS NULL`.",
      "In each `SELECT`, hard-code the tag as a literal column: `SELECT 'orphan_order_item' AS issue_type, oi.order_item_id AS bad_id …`.",
      "Both `SELECT`s must expose the same two column names in the same order to be `UNION ALL`-compatible.",
      "Combine with `UNION ALL` (no dedup needed here) and add a final `ORDER BY issue_type, bad_id` after the union.",
    ],
    singleFile: {
      seedSql: `CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY
);
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER
);
CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  order_id      INTEGER,
  product_id    INTEGER
);
INSERT INTO customers VALUES (1),(2),(3),(4);
INSERT INTO products  VALUES (10),(11),(12);
INSERT INTO orders VALUES
  (100, 1),
  (101, 2);          -- customers 3 and 4 never order
INSERT INTO order_items VALUES
  (1, 100, 10),
  (2, 100, 99),      -- product 99 doesn't exist → orphan item
  (3, 101, 11),
  (4, 101, 88);      -- product 88 doesn't exist → orphan item`,
      orderMatters: true,
      expected: {
        columns: ["issue_type", "bad_id"],
        rows: [
          ["customer_no_orders", 3],
          ["customer_no_orders", 4],
          ["orphan_order_item", 2],
          ["orphan_order_item", 4],
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
    markdown: `## Joining a table to itself

Sometimes the two things you're relating live in the **same** table. An \`employees\` table where each
row has a \`manager_id\` pointing at another row *in that same table* is the classic case — to show each
employee next to their manager's name, you join \`employees\` to \`employees\`. This is a **self-join**,
and the only trick is that you must alias the table twice so the two "copies" are distinguishable.

\`\`\`sql
SELECT
  e.employee_name          AS employee,
  m.employee_name          AS manager
FROM employees AS e
LEFT JOIN employees AS m
  ON e.manager_id = m.employee_id;
\`\`\`

\`e\` is the employee copy, \`m\` is the manager copy. The \`ON\` says "match this row's \`manager_id\` to
some other row's \`employee_id\`." Using \`LEFT JOIN\` keeps top-level employees (whose \`manager_id\` is
NULL) with a NULL manager, rather than dropping them.

**Anatomy:**

\`\`\`
FROM employees AS e            <- "the employee" copy
LEFT JOIN employees AS m       <- "the manager" copy (same table, second alias)
  ON e.manager_id = m.employee_id
\`\`\`

## Outer joins for reconciliation

When you compare two *different* sources — yesterday's snapshot vs today's — you often need every key
from **both** sides so you can see what was added, dropped, or changed. That's a \`FULL OUTER JOIN\`:
keep all left rows, all right rows, NULL-pad wherever one side is missing. A \`RIGHT JOIN\` is just a
\`LEFT JOIN\` with the tables swapped (keep all right-side rows).

> **In the warehouse this differs.** \`RIGHT JOIN\` and \`FULL OUTER JOIN\` only arrived in SQLite 3.39
> (2022). Older embedded builds reject them, and you'll sometimes see them emulated as \`LEFT JOIN\` +
> a \`UNION\` of the reverse \`LEFT JOIN\`. Postgres, Snowflake, BigQuery, and SQL Server have supported
> both for years. The self-join is universal — it's just an ordinary join whose two operands happen to
> be the same table.

**Keep it readable / common pitfall.** In a \`FULL OUTER JOIN\`, a key present on only one side has NULL
for *that side's* key column — so to get a single non-NULL key for the output, use
\`COALESCE(a.id, b.id)\`. And to classify each row (added / dropped / changed), test which side's key is
NULL. Order those \`CASE\` branches so the NULL-side checks come *before* any comparison of the payload
columns: comparing a NULL \`tier\` with \`<>\` yields \`unknown\`, so a dropped/added row would otherwise
fall through to the wrong branch.

**Recap.** A self-join is an ordinary join with the table aliased twice (e.g. employee to manager);
\`FULL OUTER JOIN\` keeps unmatched rows from both sides for reconciliation — available in SQLite 3.39+
and every major warehouse.`,
    demoCode: `SELECT
  e.employee_name AS employee,
  m.employee_name AS manager
FROM employees AS e
LEFT JOIN employees AS m
  ON e.manager_id = m.employee_id;`,
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
    prompt: `Reconcile two daily snapshots. You have yesterday's and today's customer dimension
snapshots. Use a \`FULL OUTER JOIN\` on \`customer_id\` to surface every change. Return \`customer_id\`
(the non-NULL id from whichever side has it), and \`change_type\`, one of:

- \`'added'\` — in today but not yesterday,
- \`'dropped'\` — in yesterday but not today,
- \`'changed'\` — in both, but \`tier\` differs,
- \`'unchanged'\` — in both with the same \`tier\`.

Sort by \`customer_id\`.`,
    starterCode: `-- FULL OUTER JOIN the two snapshots on customer_id.
-- Return a non-NULL customer_id and a change_type; sort by customer_id.
SELECT

FROM snapshot_yesterday AS y
`,
    hints: [
      "`FROM snapshot_yesterday y FULL OUTER JOIN snapshot_today t ON y.customer_id = t.customer_id` (SQLite 3.39+ supports this).",
      "Get a single id with `COALESCE(y.customer_id, t.customer_id) AS customer_id`.",
      "Build `change_type` with a `CASE`: test `y.customer_id IS NULL` -> `'added'`; `t.customer_id IS NULL` -> `'dropped'`; `y.tier <> t.tier` -> `'changed'`; else `'unchanged'`.",
      "Order the `CASE` branches so the NULL-side checks come *before* the `tier` comparison (comparing a NULL tier would otherwise fall through).",
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
        columns: ["customer_id", "change_type"],
        rows: [
          [1, "unchanged"],
          [2, "changed"],
          [3, "dropped"],
          [4, "unchanged"],
          [5, "added"],
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
| \`UNION ALL\` | stack all rows from both, **keep duplicates** (cheapest — no dedup pass) |
| \`UNION\` | stack and **remove duplicate rows** |
| \`INTERSECT\` | rows present in **both** result sets |
| \`EXCEPT\` | rows in the first set but **not** the second (a set difference / diff) |

## Worked example — stack two regional order feeds

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

Columns are matched **by position, not by name** — the first column of the top query lines up with the first column of the bottom, regardless of what they're called. The output takes its column names from the *first* \`SELECT\`.

## \`UNION\` vs \`UNION ALL\` — a real cost decision

\`UNION\` runs a deduplication pass (effectively a sort or hash) over the combined rows; \`UNION ALL\` just concatenates. When you *know* the sources don't overlap — or you *want* to preserve duplicates (e.g. two regions that both legitimately contain an order with the same total) — use \`UNION ALL\`. Reaching for \`UNION\` by reflex silently drops legitimate duplicate rows *and* costs more.

## Keep it readable / common pitfall

Put \`ORDER BY\` only once, after the final \`SELECT\` — it sorts the whole combined set. An \`ORDER BY\` inside an individual branch is either ignored or an error depending on the engine.

**Recap.** Set operators combine rows vertically by column position — \`UNION ALL\` stacks and keeps dupes (cheapest), \`UNION\` dedupes, \`INTERSECT\` keeps common rows, and \`EXCEPT\` computes a diff.`,
    demoCode: `SELECT order_id, total_cents FROM orders_eu
UNION ALL
SELECT order_id, total_cents FROM orders_us;`,
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
    prompt: `Diff two source extracts. Find customer IDs that were present in yesterday's extract but are **missing** from today's (dropped customers) using \`EXCEPT\`. Return a single column \`dropped_customer_id\`, sorted ascending. (Both extracts may contain duplicate rows within themselves — \`EXCEPT\` treats each side as a set, which is exactly what you want for a presence diff.)`,
    starterCode: `-- Rows present yesterday but absent today, via EXCEPT.
-- One column: dropped_customer_id, sorted ascending.
SELECT customer_id AS dropped_customer_id FROM extract_yesterday
;`,
    hints: [
      "`EXCEPT` returns rows in the first `SELECT` that aren't in the second: `SELECT customer_id FROM extract_yesterday EXCEPT SELECT customer_id FROM extract_today`.",
      "`EXCEPT` already deduplicates, so the doubled `2` in yesterday collapses to a set automatically.",
      "Alias isn't applied per-branch — name the output column in the first `SELECT` (`SELECT customer_id AS dropped_customer_id …`) and sort at the end.",
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

A subquery is a \`SELECT\` nested inside another query. You use one whenever a filter or a computed value depends on *another query's result* — "orders above the overall average," "customers who have ever ordered," "orders bigger than that customer's own average." There are three shapes, and knowing which is which is a common interview probe.

**1. Scalar subquery** — returns exactly one row, one column; usable anywhere a single value is:

\`\`\`sql
SELECT order_id, total_cents
FROM orders
WHERE total_cents > (SELECT AVG(total_cents) FROM orders);
\`\`\`

The inner query yields one number (the overall average); the outer query compares each order to it.

**2. \`IN\` (or \`NOT IN\`) subquery** — returns one column, many rows; tests set membership:

\`\`\`sql
SELECT customer_id, customer_name
FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders);   -- customers who have ordered
\`\`\`

**3. Correlated subquery** — references the outer row, so it re-runs *per outer row*:

\`\`\`sql
SELECT o.order_id, o.customer_id, o.total_cents
FROM orders AS o
WHERE o.total_cents > (
  SELECT AVG(o2.total_cents)
  FROM orders AS o2
  WHERE o2.customer_id = o.customer_id   -- ← the correlation: depends on the outer o
);
\`\`\`

For each order, the inner query computes *that order's customer's* average — "orders above their own customer's average."

**Anatomy — spot the correlation:**

\`\`\`
non-correlated: inner query is self-contained, runs ONCE
correlated:     inner query references an outer alias (o), re-evaluated per outer row
\`\`\`

**\`EXISTS\`** is the correlated cousin of \`IN\`: \`WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)\` — true if at least one matching row exists. It's the NULL-safe way to write a semi-join.

> **Performance note.** A correlated subquery conceptually re-runs per outer row, which can be slow on large tables. Very often the same result is expressible as a **join** or a **window function** (Level 4), which the optimizer executes in one pass. Reach for the correlated form for clarity, but know that "above their own group's average" is a textbook case a window function does faster.

**Keep it readable / common pitfall:** a scalar subquery that accidentally returns more than one row is a runtime error (\`sub-select returns N columns/rows\`). And remember the \`NOT IN\` + NULL trap from Level 1 — if the subquery can emit a NULL, prefer \`NOT EXISTS\`.

**Recap:** Subqueries come in three shapes — scalar (one value), \`IN\` (a column of values), and correlated (re-runs per outer row referencing it); correlated logic is clear but often beaten on speed by a join or a window function.`,
    demoCode: `SELECT order_id, total_cents
FROM orders
WHERE total_cents > (SELECT AVG(total_cents) FROM orders);`,
  },
  apply: {
    id: "sql-l2-subqueries-apply",
    executionMode: "single-file",
    prompt: `Return every order whose \`total_cents\` exceeds the **overall average** \`total_cents\` across all orders — a scalar subquery. Return \`order_id\` and \`total_cents\`, sorted by \`order_id\`.`,
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

(Note for yourself: a window function \`AVG() OVER (PARTITION BY customer_id)\` would compute this in one pass — you'll meet it in Level 4.)`,
    starterCode: `-- Keep orders whose total exceeds their OWN customer's average (correlated subquery).
SELECT o.customer_id, o.order_id, o.total_cents
FROM orders AS o
WHERE ;`,
    hints: [
      "Alias the outer table (`orders o`) and use a second alias inside (`orders o2`) so the subquery can correlate on `o2.customer_id = o.customer_id`.",
      "The inner query is `SELECT AVG(o2.total_cents) FROM orders o2 WHERE o2.customer_id = o.customer_id`.",
      "Compare with strict `>` so an order equal to its customer's average (customer 3) is excluded.",
      "This is the correlated shape — the inner query references the outer `o`, so it re-evaluates per order.",
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
    {
      id: "sql-l2-joins",
      title: "Module 2.2 — Joining Tables",
      description:
        "Combine source tables: inner joins on keys, LEFT joins that preserve rows, anti-joins for gaps, and self/outer joins.",
      lessons: [innerJoin, leftJoin, antiJoin, selfJoin],
    },
    {
      id: "sql-l2-sets-subqueries",
      title: "Module 2.3 — Set Operations and Subqueries",
      description:
        "Stack and compare result sets with UNION/INTERSECT/EXCEPT, and nest queries as scalar, IN, and correlated subqueries.",
      lessons: [setOps, subqueries],
    },
  ],
}

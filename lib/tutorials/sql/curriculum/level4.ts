import type { SqlLevel } from "@/lib/tutorials/types"
import { scriptExercise } from "./script-exercise"

const windowRanking: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-window-ranking",
  title: "Ranking: ROW_NUMBER, RANK, DENSE_RANK",
  summary: "Rank rows within a partition without collapsing them.",
  estimatedMinutes: 22,
  difficulty: "medium",
  skills: ["OVER", "PARTITION BY", "ORDER BY", "ROW_NUMBER", "RANK", "DENSE_RANK", "tie handling"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## Window functions keep every row

You just loaded a \`fact_sales\` table and product wants a "top 3 products per category" mart. Your
first instinct — \`GROUP BY category ORDER BY revenue DESC LIMIT 3\` — gives you the top 3 for **one**
category, not per category. The moment you need "top N *within each group*" or "the latest row *per
key*," you've hit the wall that window functions were invented to knock down.

A **window function** runs a calculation over a "window" of rows defined relative to the current row,
and — crucially — **keeps every input row**. \`GROUP BY category\` returns one row per category;
\`ROW_NUMBER() OVER (PARTITION BY category …)\` returns *every* product row, each tagged with its rank
inside its category. You keep the detail *and* get the ranking.

The three ranking functions differ only in how they treat **ties**, and this exact distinction is a
classic interview question.

### A worked example

Seed a tiny revenue table and rank within each category:

\`\`\`sql
CREATE TABLE product_revenue (
  category TEXT,
  product  TEXT,
  revenue  INTEGER
);
INSERT INTO product_revenue VALUES
  ('audio', 'Headphones', 500),
  ('audio', 'Earbuds',    500),   -- tie with Headphones
  ('audio', 'Speaker',    300),
  ('audio', 'Cable',      100),
  ('video', 'Monitor',    900),
  ('video', 'Webcam',     400);

SELECT
  category, product, revenue,
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) AS rn,
  RANK()       OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk,
  DENSE_RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS dense
FROM product_revenue
ORDER BY category, revenue DESC;
\`\`\`

For the \`audio\` category (two products tied at 500), the three columns produce:

| product | revenue | rn (ROW_NUMBER) | rnk (RANK) | dense (DENSE_RANK) |
|---|---|---|---|---|
| Headphones | 500 | 1 | 1 | 1 |
| Earbuds | 500 | 2 | 1 | 1 |
| Speaker | 300 | 3 | **3** | **2** |
| Cable | 100 | 4 | 4 | 3 |

Read the tie row carefully — this **is** the exam question:

- **ROW_NUMBER** -> \`1, 2, 3, 4\`. Always unique, **breaks ties arbitrarily**. Use it when you must
  pick exactly one row ("the latest record per customer").
- **RANK** -> \`1, 1, 3, 4\`. Ties share a rank, then it **skips** (no rank 2). Use it for "Olympic"
  standings where a shared gold means no silver.
- **DENSE_RANK** -> \`1, 1, 2, 3\`. Ties share a rank, then it **does not skip**. Use it for "distinct
  tiers" ("what is the 2nd-highest distinct revenue?").

### Anatomy of the OVER clause

\`\`\`
ROW_NUMBER() OVER ( PARTITION BY category   ORDER BY revenue DESC )
                    └── reset per group ──┘  └── order within window ──┘
\`\`\`

- **PARTITION BY** slices the data into independent groups; the ranking restarts at 1 for each. Omit
  it and the whole result set is one window.
- **ORDER BY** inside \`OVER\` decides what "first" means — it is **separate** from the query's outer
  \`ORDER BY\`, which only controls display order.

### Pick one row per key (the pattern you'll reuse all level)

Because \`ROW_NUMBER\` is unique, "keep the latest row per customer" is a wrapped subquery:

\`\`\`sql
SELECT * FROM (
  SELECT c.*,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) AS rn
  FROM customer_dump c
) ranked
WHERE rn = 1;
\`\`\`

You cannot filter on a window function in the same \`WHERE\` (it is computed *after* \`WHERE\`), so you
wrap it in a subquery and filter the outer query. You will formalize this as **deduplication** later
in this level.

### Common pitfalls

- **Filtering a window in \`WHERE\`:** \`WHERE ROW_NUMBER() OVER (...) = 1\` is a syntax error. Window
  functions are evaluated after \`WHERE\` / \`GROUP BY\` / \`HAVING\`. Wrap and filter outside.
- **Nondeterministic \`ROW_NUMBER\`:** if your \`ORDER BY\` has ties, \`ROW_NUMBER\` picks a winner
  arbitrarily and the choice can change between runs. Add a **tiebreaker** column (e.g.
  \`ORDER BY updated_at DESC, id DESC\`) so the result is deterministic — graders and idempotency
  checks depend on this.
- **Readability:** name the ranked subquery (\`ranked\`, \`numbered\`) and lift the window into a CTE
  when the query grows.

> **In the warehouse:** Snowflake and BigQuery let you skip the subquery with
> \`QUALIFY ROW_NUMBER() OVER (...) = 1\`. SQLite and Postgres have no \`QUALIFY\` — you must wrap in a
> subquery/CTE. The \`ROW_NUMBER\` / \`RANK\` / \`DENSE_RANK\` semantics are identical everywhere.

**Recap:** \`ROW_NUMBER\` = unique \`1,2,3\` (pick one); \`RANK\` = \`1,1,3\` (ties skip);
\`DENSE_RANK\` = \`1,1,2\` (ties don't skip) — all keep every row, all reset per \`PARTITION BY\`.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB,
then hidden assertion queries check the ranks, tie handling, and row counts. Lead your load with
\`DELETE FROM <target>;\` so a re-run doesn't double the rows.`,
  },
  apply: scriptExercise({
    id: "sql-l4-window-ranking-apply",
    prompt: `Build a **top-3-products-per-category** mart. From \`fact_sales\`, aggregate revenue per
\`(category, product)\`, then keep only the three highest-revenue products *within each category*. Use
the ranking function that assigns **unique slot numbers** (so exactly three rows survive per category)
and keep rows whose slot is \`<= 3\`. Write the result into the pre-created \`top_products(category,
product, revenue, rank_in_category)\` table.

The target table is seeded **empty** — lead your load with \`DELETE FROM top_products;\` so the script
is safe to re-run.`,
    starterCode: `-- fact_sales and the (empty) top_products table are already seeded.
-- Populate top_products with the top 3 products per category.
DELETE FROM top_products;   -- re-runnable: clear before you repopulate

-- INSERT INTO top_products (category, product, revenue, rank_in_category)
-- WITH per_product AS ( ... SUM(revenue) per (category, product) ... ),
--      ranked AS ( ... ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, product) ... )
-- SELECT ... FROM ranked WHERE rank_in_category <= 3;`,
    hints: [
      "First aggregate: `SELECT category, product, SUM(revenue) AS revenue FROM fact_sales GROUP BY category, product`. Rank on top of *that*, not the raw rows.",
      "You can't filter a window function in `WHERE`. Put the aggregate-plus-`ROW_NUMBER` in a CTE, then `SELECT ... WHERE rank_in_category <= 3` from it.",
      "`ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC)` gives unique 1,2,3 per category. Add `, product` to the `ORDER BY` as a deterministic tiebreaker.",
      "Wrap it all in `INSERT INTO top_products SELECT category, product, revenue, rank_in_category FROM ranked WHERE rank_in_category <= 3;`.",
    ],
    referenceSolution: `DELETE FROM top_products;

INSERT INTO top_products (category, product, revenue, rank_in_category)
WITH per_product AS (
  SELECT category, product, SUM(revenue) AS revenue
  FROM fact_sales
  GROUP BY category, product
),
ranked AS (
  SELECT
    category, product, revenue,
    ROW_NUMBER() OVER (
      PARTITION BY category
      ORDER BY revenue DESC, product ASC
    ) AS rank_in_category
  FROM per_product
)
SELECT category, product, revenue, rank_in_category
FROM ranked
WHERE rank_in_category <= 3;`,
    seedSql: `DROP TABLE IF EXISTS fact_sales;
CREATE TABLE fact_sales (
  sale_id   INTEGER PRIMARY KEY,
  category  TEXT NOT NULL,
  product   TEXT NOT NULL,
  revenue   INTEGER NOT NULL
);
INSERT INTO fact_sales (category, product, revenue) VALUES
  ('audio', 'Headphones', 300), ('audio', 'Headphones', 200),
  ('audio', 'Earbuds',    250), ('audio', 'Speaker',    150),
  ('audio', 'Cable',      120), ('audio', 'Stand',       90),
  ('video', 'Monitor',    600), ('video', 'Webcam',     400),
  ('video', 'Tripod',     400), ('video', 'Lens',       100);

DROP TABLE IF EXISTS top_products;
CREATE TABLE top_products (
  category         TEXT,
  product          TEXT,
  revenue          INTEGER,
  rank_in_category INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "top_products holds exactly six rows (3 per category)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM top_products) <> 6`,
      },
      {
        suite: "ranking",
        name: "every rank_in_category is 1, 2, or 3",
        sql: `SELECT category, product FROM top_products WHERE rank_in_category NOT IN (1, 2, 3)`,
      },
      {
        suite: "ranking",
        name: "rank_in_category is unique within each category (ROW_NUMBER, not RANK/DENSE_RANK)",
        isHidden: true,
        sql: `SELECT category FROM top_products
GROUP BY category
HAVING COUNT(*) <> COUNT(DISTINCT rank_in_category)`,
      },
      {
        suite: "content",
        name: "audio keeps only Headphones, Earbuds, Speaker",
        sql: `SELECT product FROM top_products
WHERE category = 'audio' AND product NOT IN ('Headphones', 'Earbuds', 'Speaker')`,
      },
      {
        suite: "aggregation",
        name: "Headphones revenue is summed across its two rows to 500",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE(
  (SELECT revenue FROM top_products WHERE category = 'audio' AND product = 'Headphones'), -1
) <> 500`,
      },
      {
        suite: "content",
        name: "no below-cutoff product (Cable / Stand / Lens) leaked in",
        sql: `SELECT product FROM top_products WHERE product IN ('Cable', 'Stand', 'Lens')`,
      },
      {
        suite: "content",
        name: "video rank 1 is Monitor",
        sql: `SELECT 1 WHERE COALESCE(
  (SELECT product FROM top_products WHERE category = 'video' AND rank_in_category = 1), '~'
) <> 'Monitor'`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-window-ranking-practice",
    prompt: `A merchandising team wants a **category leaderboard** mart with richer tie semantics. From
\`fact_sales\` (\`category\`, \`product\`, \`revenue\`, and a \`sold_at\` ISO date), produce the pre-created
\`leaderboard(category, product, revenue, row_rank, rank_rank, dense_rank, is_podium)\` table where, per
category ordered by **total revenue descending**:

- \`row_rank\` = unique slot (\`ROW_NUMBER\`), tiebroken by **earliest first-sale date**, then product name.
- \`rank_rank\` = \`RANK\` (ties skip).
- \`dense_rank\` = \`DENSE_RANK\` (ties don't skip).
- \`is_podium\` = \`1\` when the product is in the **top 3 distinct revenue tiers** (\`dense_rank <= 3\`),
  else \`0\` — so genuinely tied products **all** make the podium, unlike a strict slot cutoff.

Then keep **only** rows where \`is_podium = 1\`.

Note: some products (like \`Headphones\`) appear on **several** fact rows — aggregate to per-product
totals first, and carry \`MIN(sold_at)\` as the date tiebreaker. The target table is seeded empty; lead
your load with \`DELETE FROM leaderboard;\` so the script re-runs cleanly.`,
    starterCode: `-- fact_sales (with sold_at) and the (empty) leaderboard table are already seeded.
DELETE FROM leaderboard;   -- re-runnable: clear before you repopulate

-- INSERT INTO leaderboard (category, product, revenue, row_rank, rank_rank, dense_rank, is_podium)
-- 1) aggregate per (category, product): SUM(revenue) AS revenue, MIN(sold_at) AS first_sold
-- 2) over PARTITION BY category ORDER BY revenue DESC, compute:
--      ROW_NUMBER() (add first_sold, then product, as tiebreakers), RANK(), DENSE_RANK()
-- 3) is_podium = CASE WHEN dense_rank <= 3 THEN 1 ELSE 0 END
-- 4) keep only is_podium = 1`,
    hints: [
      "Aggregate to per-product totals first, but carry `MIN(sold_at) AS first_sold` so you have a deterministic date tiebreaker.",
      "Compute all three ranking functions in the same CTE over the same `PARTITION BY category ORDER BY revenue DESC`; only the `ROW_NUMBER` needs the extra `, first_sold, product` tiebreaker.",
      "`is_podium` is derived from `dense_rank` — compute the ranks in one CTE, then `CASE WHEN dense_rank <= 3 THEN 1 ELSE 0 END` in the next.",
      "Filter `WHERE is_podium = 1` in the outer query, never inside the windowed CTE.",
    ],
    seedSql: `DROP TABLE IF EXISTS fact_sales;
CREATE TABLE fact_sales (
  sale_id  INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  product  TEXT NOT NULL,
  revenue  INTEGER NOT NULL,
  sold_at  TEXT NOT NULL            -- ISO date 'YYYY-MM-DD'
);
INSERT INTO fact_sales (category, product, revenue, sold_at) VALUES
  ('audio', 'Headphones', 300, '2026-01-02'), ('audio', 'Headphones', 200, '2026-02-01'),
  ('audio', 'Cable',      500, '2026-01-03'), ('audio', 'Earbuds',    500, '2026-01-08'),
  ('audio', 'Speaker',    300, '2026-01-20'), ('audio', 'Woofer',     200, '2026-01-25'),
  ('audio', 'Stand',      100, '2026-03-01'),
  ('video', 'Monitor',    600, '2026-01-04'), ('video', 'Webcam',     400, '2026-01-06'),
  ('video', 'Tripod',     400, '2026-01-07'), ('video', 'Cam',        300, '2026-01-08'),
  ('video', 'Lens',       100, '2026-02-02');

DROP TABLE IF EXISTS leaderboard;
CREATE TABLE leaderboard (
  category   TEXT, product TEXT, revenue INTEGER,
  row_rank   INTEGER, rank_rank INTEGER, dense_rank INTEGER, is_podium INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "exactly nine podium rows are retained",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM leaderboard) <> 9`,
      },
      {
        suite: "podium",
        name: "no retained row falls outside the top 3 distinct tiers",
        sql: `SELECT category, product FROM leaderboard WHERE dense_rank > 3`,
      },
      {
        suite: "podium",
        name: "every retained row is flagged is_podium = 1",
        sql: `SELECT category, product FROM leaderboard WHERE is_podium <> 1`,
      },
      {
        suite: "content",
        name: "the lowest-tier products Stand and Lens are excluded",
        sql: `SELECT product FROM leaderboard WHERE product IN ('Stand', 'Lens')`,
      },
      {
        suite: "aggregation",
        name: "Headphones is summed across its two fact rows to 500",
        sql: `SELECT 1 WHERE COALESCE(
  (SELECT revenue FROM leaderboard WHERE category = 'audio' AND product = 'Headphones'), -1
) <> 500`,
      },
      {
        suite: "ranks",
        name: "RANK skips but DENSE_RANK does not: Speaker sits at rank_rank 4, dense_rank 2",
        isHidden: true,
        sql: `SELECT 1 WHERE
  COALESCE((SELECT rank_rank FROM leaderboard WHERE category = 'audio' AND product = 'Speaker'), -1) <> 4
  OR COALESCE((SELECT dense_rank FROM leaderboard WHERE category = 'audio' AND product = 'Speaker'), -1) <> 2`,
      },
      {
        suite: "ranks",
        name: "the audio 500-tie is slotted by earliest first-sale date: Headphones, Cable, Earbuds",
        isHidden: true,
        sql: `SELECT product FROM leaderboard
WHERE category = 'audio' AND revenue = 500
  AND row_rank <> CASE product
    WHEN 'Headphones' THEN 1
    WHEN 'Cable'      THEN 2
    WHEN 'Earbuds'    THEN 3
    ELSE -1
  END`,
      },
    ],
  }),
}

const windowOffset: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-window-offset",
  title: "LAG and LEAD: Period-over-Period",
  summary: "Compare each row to its neighbor without a self-join.",
  estimatedMinutes: 20,
  difficulty: "medium",
  skills: ["LAG", "LEAD", "offset windows", "deltas", "growth rates"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Compare a row to its neighbor — no self-join

"Month-over-month revenue change" and "days since the customer's previous order" are two of the
most-requested analytics metrics, and juniors reach for a self-join: join the table to itself on
\`month = month - 1\`. That works but is verbose, slow, and breaks on gaps. \`LAG\` and \`LEAD\` do it in
one line.

\`LAG(col, n)\` returns \`col\` from the row **n positions before** the current row within the window
(default \`n = 1\`); \`LEAD(col, n)\` looks **forward**. "Before" and "after" are defined by the window's
\`ORDER BY\`.

\`\`\`sql
SELECT
  customer_id,
  order_month,
  revenue,
  LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS prev_revenue,
  revenue - LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS mom_delta
FROM monthly_revenue;
\`\`\`

For a customer's first month there is no previous row, so \`LAG\` returns \`NULL\` and the delta is
\`NULL\` — a real "no prior period" signal, not a bug. Supply a default third argument to replace it:
\`LAG(revenue, 1, 0)\` yields \`0\` instead of \`NULL\` for the first row.

### Anatomy

\`\`\`
LAG( revenue , 1 , 0 ) OVER ( PARTITION BY customer_id ORDER BY order_month )
     └──┬──┘  └┬┘ └┬┘          └───────── one series per customer ─────────┘
     column  offset default    ORDER BY defines "previous": ASC = time order
\`\`\`

### Common pitfalls

- **No \`ORDER BY\` in the window = meaningless offset.** \`LAG\` over an unordered window returns an
  arbitrary neighbor. Always order by your time key.
- **Gaps are positional, not calendar-aware.** \`LAG\` returns the *previous row in the result*, not
  "one calendar month back." If March is missing, \`LAG\` on April returns February. For strict
  calendar adjacency, build a dense month spine (a \`dim_date\`) and left-join onto it first.
- **Growth-rate divide-by-zero / NULL:** \`(revenue - prev) * 1.0 / prev\` is \`NULL\` when \`prev\` is
  \`NULL\` and blows up when \`prev\` is \`0\`. Guard with \`NULLIF(prev, 0)\`.

> **In the warehouse:** identical syntax in Postgres, Snowflake, BigQuery, and SQL Server. Only the
> \`FIRST_VALUE\`/\`LAST_VALUE\` frame defaults differ across engines — plain \`LAG\`/\`LEAD\` behave the
> same everywhere.

**Recap:** \`LAG\`/\`LEAD\` pull a value from an earlier/later row in the ordered window — replacing
self-joins for deltas and growth. The first row's \`LAG\` is \`NULL\` (or your supplied default), and
gaps are positional.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB,
then hidden assertion queries check the offsets, deltas, and row count. Lead your load with
\`DELETE FROM <target>;\` so a re-run doesn't double the rows.`,
  },
  apply: scriptExercise({
    id: "sql-l4-window-offset-apply",
    prompt: `From \`monthly_revenue\`, compute each customer's **month-over-month revenue delta**. Write
to the pre-created \`mom(customer_id, order_month, revenue, prev_revenue, mom_delta)\` table, where
\`prev_revenue\` is the prior month's revenue for that customer (NULL for their first month) and
\`mom_delta = revenue - prev_revenue\`.

The target is seeded **empty** — lead your load with \`DELETE FROM mom;\` so the script re-runs cleanly.`,
    starterCode: `-- monthly_revenue and the (empty) mom table are already seeded.
DELETE FROM mom;   -- re-runnable: clear before you repopulate

-- INSERT INTO mom (customer_id, order_month, revenue, prev_revenue, mom_delta)
-- SELECT ..., LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS prev_revenue, ...
-- FROM monthly_revenue;`,
    hints: [
      "`LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month)` is the whole trick.",
      "Because `order_month` is `'YYYY-MM'` text, it sorts chronologically as text — no casting needed.",
      "`mom_delta` is just `revenue - prev_revenue`; leave it NULL for the first month (don't default it).",
    ],
    referenceSolution: `DELETE FROM mom;

INSERT INTO mom (customer_id, order_month, revenue, prev_revenue, mom_delta)
SELECT
  customer_id, order_month, revenue,
  LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS prev_revenue,
  revenue - LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS mom_delta
FROM monthly_revenue;`,
    seedSql: `DROP TABLE IF EXISTS monthly_revenue;
DROP TABLE IF EXISTS mom;
CREATE TABLE monthly_revenue (
  customer_id INTEGER NOT NULL,
  order_month TEXT NOT NULL,      -- 'YYYY-MM'
  revenue     INTEGER NOT NULL,
  PRIMARY KEY (customer_id, order_month)
);
INSERT INTO monthly_revenue VALUES
  (1,'2026-01',100),(1,'2026-02',150),(1,'2026-03',90),
  (2,'2026-01',200),(2,'2026-02',260);
CREATE TABLE mom (
  customer_id INTEGER, order_month TEXT, revenue INTEGER,
  prev_revenue INTEGER, mom_delta INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "exactly five rows landed (one per source row)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM mom) <> 5`,
      },
      {
        suite: "offset",
        name: "the first month has NULL prev_revenue and NULL delta",
        sql: `SELECT 1 WHERE
          (SELECT prev_revenue FROM mom WHERE customer_id = 1 AND order_month = '2026-01') IS NOT NULL
          OR (SELECT mom_delta FROM mom WHERE customer_id = 1 AND order_month = '2026-01') IS NOT NULL`,
      },
      {
        suite: "delta",
        name: "customer 1 Feb: prev_revenue 100, delta +50",
        sql: `SELECT 1 WHERE
          COALESCE((SELECT prev_revenue FROM mom WHERE customer_id = 1 AND order_month = '2026-02'), -1) <> 100
          OR COALESCE((SELECT mom_delta FROM mom WHERE customer_id = 1 AND order_month = '2026-02'), -999) <> 50`,
      },
      {
        suite: "delta",
        name: "customer 1 Mar: a negative delta of -60",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT mom_delta FROM mom WHERE customer_id = 1 AND order_month = '2026-03'), -999) <> -60`,
      },
      {
        suite: "delta",
        name: "the LAG is partitioned per customer (customer 2 Feb delta +60)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT mom_delta FROM mom WHERE customer_id = 2 AND order_month = '2026-02'), -999) <> 60`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-window-offset-practice",
    prompt: `Build a **churn-signal mart**. From \`monthly_revenue\`, populate
\`churn_signal(customer_id, order_month, revenue, prev_revenue, pct_change, churn_flag)\` where:
- \`prev_revenue\` is the prior month's revenue for that customer (NULL for the first month),
- \`pct_change\` is the signed month-over-month **percentage** change rounded to 1 decimal
  (NULL when there's no prior month),
- \`churn_flag = 1\` only when a row is the customer's **most recent** month **and** that month dropped
  more than 30% versus its previous month; otherwise \`0\`.

Lead with \`DELETE FROM churn_signal;\` so the load re-runs cleanly.`,
    starterCode: `-- monthly_revenue and the (empty) churn_signal table are already seeded.
DELETE FROM churn_signal;

-- INSERT INTO churn_signal (...)
-- WITH base AS ( ... LAG(revenue) ..., ROW_NUMBER() OVER (... ORDER BY order_month DESC) AS rn_latest ... )
-- SELECT ..., ROUND((revenue - prev_revenue) * 100.0 / NULLIF(prev_revenue, 0), 1) AS pct_change,
--        CASE WHEN rn_latest = 1 AND pct_change < -30 THEN 1 ELSE 0 END AS churn_flag
-- FROM base;`,
    hints: [
      "`pct_change = ROUND((revenue - prev_revenue) * 100.0 / NULLIF(prev_revenue, 0), 1)` — the `100.0` forces real division and `NULLIF` guards a zero prior month.",
      '"Latest month per customer" needs a second window: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_month DESC) = 1` marks it.',
      "Compute prev_revenue, pct_change, and the latest-month marker in one CTE, then `churn_flag = CASE WHEN rn_latest = 1 AND pct_change < -30 THEN 1 ELSE 0 END`.",
      'Watch the sign: a *drop* is a negative pct_change; "more than 30% drop" is `pct_change < -30`.',
    ],
    seedSql: `DROP TABLE IF EXISTS monthly_revenue;
DROP TABLE IF EXISTS churn_signal;
CREATE TABLE monthly_revenue (
  customer_id INTEGER NOT NULL,
  order_month TEXT NOT NULL,
  revenue     INTEGER NOT NULL,
  PRIMARY KEY (customer_id, order_month)
);
INSERT INTO monthly_revenue VALUES
  (1,'2026-01',100),(1,'2026-02',150),(1,'2026-03',90),
  (2,'2026-01',200),(2,'2026-02',260),
  (3,'2026-01',500),(3,'2026-02',300),(3,'2026-03',310);
CREATE TABLE churn_signal (
  customer_id INTEGER, order_month TEXT, revenue INTEGER,
  prev_revenue INTEGER, pct_change REAL, churn_flag INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "one row per source month (eight total)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM churn_signal) <> 8`,
      },
      {
        suite: "signal",
        name: "customer 1's latest month is flagged with pct_change -40.0",
        sql: `SELECT 1 WHERE
          COALESCE((SELECT pct_change FROM churn_signal WHERE customer_id = 1 AND order_month = '2026-03'), -999) <> -40.0
          OR COALESCE((SELECT churn_flag FROM churn_signal WHERE customer_id = 1 AND order_month = '2026-03'), -1) <> 1`,
      },
      {
        suite: "signal",
        name: "a -40% drop that is NOT the latest month is not flagged (customer 3 Feb)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT churn_flag FROM churn_signal WHERE customer_id = 3 AND order_month = '2026-02'), -1) <> 0`,
      },
      {
        suite: "signal",
        name: "exactly one row across the whole mart carries churn_flag = 1",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM churn_signal WHERE churn_flag = 1) <> 1`,
      },
      {
        suite: "signal",
        name: "a customer whose latest month rose is not flagged (customer 2)",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM churn_signal WHERE customer_id = 2 AND churn_flag = 1) <> 0`,
      },
    ],
  }),
}

const windowFrames: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-window-frames",
  title: "Frames: Running Totals & Moving Averages",
  summary: "Aggregate over a sliding window of rows with a frame clause.",
  estimatedMinutes: 24,
  difficulty: "hard",
  skills: [
    "ROWS BETWEEN",
    "running total",
    "moving average",
    "SUM() OVER () grand total",
    "percent-of-total",
  ],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Frames: aggregate over a sliding window of rows

\`LAG\` looks at one neighbor. A **frame** lets an aggregate see a *range* of neighbors: "sum of this row and all rows before it" (running total), "average of this row and the 6 before it" (7-day moving average), or "sum of everything" (grand total for percent-of-total). The frame clause is the third piece of \`OVER\`, after \`PARTITION BY\` and \`ORDER BY\`.

\`\`\`sql
SELECT
  customer_id, order_date, revenue,
  SUM(revenue) OVER (
    PARTITION BY customer_id
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW      -- running total
  ) AS lifetime_revenue,
  AVG(revenue) OVER (
    PARTITION BY customer_id
    ORDER BY order_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW              -- 7-row moving avg
  ) AS moving_avg_7,
  revenue * 1.0 / SUM(revenue) OVER () AS pct_of_grand_total  -- no ORDER BY = whole set
FROM daily_revenue;
\`\`\`

Three shapes, one clause:

- **Running total:** \`ORDER BY\` + \`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`. Accumulates from the first row up to the current one.
- **Moving average:** \`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\` = current row plus the 6 before it (7 rows). Early rows average over fewer rows — that's correct behavior.
- **Grand total / percent-of-total:** \`SUM(revenue) OVER ()\` with **no \`ORDER BY\` and no frame** sums the entire partition (or whole set), so \`revenue / SUM(revenue) OVER ()\` is each row's share.

### The subtle default that bites everyone

When you add \`ORDER BY\` to an aggregate window **without** an explicit frame, SQL supplies a default frame of \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`. With ties in the \`ORDER BY\` key, \`RANGE\` includes **all peer rows with the same order value**, which can make a "running total" jump. Writing \`ROWS BETWEEN …\` instead gives you deterministic row-by-row accumulation. **Rule of thumb: for running totals and moving averages, always spell out \`ROWS BETWEEN\` — don't rely on the default.**

### Anatomy

\`\`\`
SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date
                   ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
                   └──────────────────┬──────────────────┘
        frame: lower bound ── upper bound. Bounds: UNBOUNDED PRECEDING,
        n PRECEDING, CURRENT ROW, n FOLLOWING, UNBOUNDED FOLLOWING.
\`\`\`

### Common pitfalls

- **\`ROWS\` vs \`RANGE\`:** \`ROWS\` counts physical rows; \`RANGE\` groups by value peers. Use \`ROWS\` for counts-of-rows windows (moving averages).
- **Integer division:** \`revenue / SUM(...)\` on integer columns floors to \`0\`. Multiply by \`1.0\` (or \`CAST(... AS REAL)\`) for a real fraction.
- **Grand total needs empty \`OVER ()\`:** the moment you add \`ORDER BY\`, it becomes a running total, not a grand total.

> **In the warehouse:** frame syntax is ANSI-standard and identical across Postgres/Snowflake/BigQuery. BigQuery spells unbounded frames the same way. No divergence to memorize here.

> **In the warehouse:** you can't filter a window value in a \`WHERE\` clause — the window is computed *after* \`WHERE\` runs. Postgres/Snowflake/BigQuery add a \`QUALIFY\` clause for exactly this ("keep rows whose window value passes a test"); SQLite has no \`QUALIFY\`, so wrap the window in a subquery/CTE and filter outside it.

**Recap:** the frame clause (\`ROWS BETWEEN …\`) turns a window aggregate into a running total (\`UNBOUNDED PRECEDING\`→\`CURRENT ROW\`), a moving average (\`n PRECEDING\`→\`CURRENT ROW\`), or — with an empty \`OVER ()\` — a grand total for percent-of-total; always spell out \`ROWS\` for row-count windows.

**Execution mode:** you write a multi-statement script. The seed creates \`daily_revenue\` and an empty target table for you; your script populates the target with a single \`INSERT … SELECT\`. Lead with \`DELETE FROM <target>;\` so a re-run stays idempotent, then hidden assertion queries check the frame math and the row count.`,
  },
  apply: scriptExercise({
    id: "sql-l4-window-frames-apply",
    prompt: `Add a **running lifetime-revenue** column per customer. From \`daily_revenue\`, populate \`lifetime(customer_id, order_date, revenue, lifetime_revenue)\` where \`lifetime_revenue\` is the cumulative sum of \`revenue\` for that customer up to and including the current date, ordered by date.

The empty \`lifetime\` target table is created for you. Lead your script with \`DELETE FROM lifetime;\` so a re-run stays idempotent, then fill it with a single \`INSERT … SELECT\` that uses a \`SUM(...) OVER (...)\` running-total frame.`,
    starterCode: `-- daily_revenue is seeded; the empty lifetime target table is created for you.
-- Lead with DELETE so a re-run does not double the rows.
DELETE FROM lifetime;

-- INSERT INTO lifetime (customer_id, order_date, revenue, lifetime_revenue)
-- SELECT customer_id, order_date, revenue,
--   SUM(revenue) OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
-- FROM daily_revenue;`,
    hints: [
      "`SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`.",
      "Spell out the `ROWS BETWEEN` frame — don't rely on the default.",
      "Partition by customer so each customer's total restarts.",
    ],
    referenceSolution: `DELETE FROM lifetime;

INSERT INTO lifetime (customer_id, order_date, revenue, lifetime_revenue)
SELECT
  customer_id,
  order_date,
  revenue,
  SUM(revenue) OVER (
    PARTITION BY customer_id
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS lifetime_revenue
FROM daily_revenue;`,
    seedSql: `DROP TABLE IF EXISTS daily_revenue;
DROP TABLE IF EXISTS lifetime;
CREATE TABLE daily_revenue (
  customer_id INTEGER NOT NULL,
  order_date  TEXT NOT NULL,
  revenue     INTEGER NOT NULL,
  PRIMARY KEY (customer_id, order_date)
);
INSERT INTO daily_revenue VALUES
  (1,'2026-01-01',10),(1,'2026-01-02',20),(1,'2026-01-03',5),
  (2,'2026-01-01',100),(2,'2026-01-05',50);
CREATE TABLE lifetime (
  customer_id INTEGER, order_date TEXT, revenue INTEGER, lifetime_revenue INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "exactly five rows landed in lifetime",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM lifetime) <> 5`,
      },
      {
        suite: "running",
        name: "customer 1's running total climbs 10 → 30 → 35",
        sql: `SELECT 1 WHERE
          COALESCE((SELECT lifetime_revenue FROM lifetime WHERE customer_id = 1 AND order_date = '2026-01-02'), -1) <> 30
          OR COALESCE((SELECT lifetime_revenue FROM lifetime WHERE customer_id = 1 AND order_date = '2026-01-03'), -1) <> 35`,
      },
      {
        suite: "running",
        name: "customer 2's running total is 100 then 150",
        sql: `SELECT 1 WHERE
          COALESCE((SELECT lifetime_revenue FROM lifetime WHERE customer_id = 2 AND order_date = '2026-01-01'), -1) <> 100
          OR COALESCE((SELECT lifetime_revenue FROM lifetime WHERE customer_id = 2 AND order_date = '2026-01-05'), -1) <> 150`,
      },
      {
        suite: "running",
        name: "every row's running total matches a recomputed frame",
        isHidden: true,
        sql: `SELECT l.customer_id, l.order_date
          FROM lifetime l
          JOIN (
            SELECT customer_id, order_date,
              SUM(revenue) OVER (
                PARTITION BY customer_id ORDER BY order_date
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
              ) AS expected
            FROM daily_revenue
          ) e ON e.customer_id = l.customer_id AND e.order_date = l.order_date
          WHERE l.lifetime_revenue <> e.expected`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-window-frames-practice",
    prompt: `Ship a **customer revenue-trend mart** in one pass. From \`daily_revenue\`, populate \`trend(customer_id, order_date, revenue, running_total, moving_avg_3, pct_of_total)\` where, **per customer ordered by date**:

- \`running_total\` is the cumulative revenue;
- \`moving_avg_3\` is the average of the current row and the **2** prior rows (a 3-row window), rounded to 2 decimals — early rows average over fewer rows, and that's correct;
- \`pct_of_total\` is the row's revenue as a **percentage of that customer's overall total revenue** (across all their days), rounded to 1 decimal.

The empty \`trend\` target is created for you. Lead with \`DELETE FROM trend;\` so a re-run stays idempotent, then fill it with a single \`INSERT … SELECT\` carrying three window expressions.`,
    starterCode: `-- daily_revenue is seeded; the empty trend target table is created for you.
-- Lead with DELETE so a re-run does not double the rows.
DELETE FROM trend;

-- INSERT INTO trend (customer_id, order_date, revenue, running_total, moving_avg_3, pct_of_total)
-- SELECT ..., three windows over PARTITION BY customer_id ORDER BY order_date:
--   running_total = SUM(revenue) OVER (... ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
--   moving_avg_3  = ROUND(AVG(revenue) OVER (... ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)
--   pct_of_total  = ROUND(revenue * 100.0 / SUM(revenue) OVER (PARTITION BY customer_id), 1)
-- FROM daily_revenue;`,
    hints: [
      "Three windows over the same `PARTITION BY customer_id ORDER BY order_date`: running total (`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`), moving avg (`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`), and the per-customer grand total.",
      "The per-customer total is `SUM(revenue) OVER (PARTITION BY customer_id)` — partition but **no** `ORDER BY`/frame, so it spans all of that customer's rows.",
      "`pct_of_total = ROUND(revenue * 100.0 / SUM(revenue) OVER (PARTITION BY customer_id), 1)`.",
      "Force real division with `* 100.0` and round each column exactly as specified.",
    ],
    seedSql: `DROP TABLE IF EXISTS daily_revenue;
DROP TABLE IF EXISTS trend;
CREATE TABLE daily_revenue (
  customer_id INTEGER NOT NULL,
  order_date  TEXT NOT NULL,
  revenue     INTEGER NOT NULL,
  PRIMARY KEY (customer_id, order_date)
);
INSERT INTO daily_revenue VALUES
  (1,'2026-01-01',10),(1,'2026-01-02',20),(1,'2026-01-03',30),(1,'2026-01-04',40),
  (2,'2026-01-01',100),(2,'2026-01-02',100);
CREATE TABLE trend (
  customer_id INTEGER, order_date TEXT, revenue INTEGER,
  running_total INTEGER, moving_avg_3 REAL, pct_of_total REAL
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "exactly six rows landed in trend",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM trend) <> 6`,
      },
      {
        suite: "running",
        name: "customer 1's running total reaches 60 then 100",
        sql: `SELECT 1 WHERE
          COALESCE((SELECT running_total FROM trend WHERE customer_id = 1 AND order_date = '2026-01-03'), -1) <> 60
          OR COALESCE((SELECT running_total FROM trend WHERE customer_id = 1 AND order_date = '2026-01-04'), -1) <> 100`,
      },
      {
        suite: "moving_avg",
        name: "3-row moving average is right, including the partial early window",
        sql: `SELECT 1 WHERE
          ABS(COALESCE((SELECT moving_avg_3 FROM trend WHERE customer_id = 1 AND order_date = '2026-01-02'), -1) - 15.0) > 0.001
          OR ABS(COALESCE((SELECT moving_avg_3 FROM trend WHERE customer_id = 1 AND order_date = '2026-01-04'), -1) - 30.0) > 0.001`,
      },
      {
        suite: "pct",
        name: "percent-of-total is scoped to the customer (40.0 on 2026-01-04)",
        sql: `SELECT 1 WHERE
          ABS(COALESCE((SELECT pct_of_total FROM trend WHERE customer_id = 1 AND order_date = '2026-01-04'), -1) - 40.0) > 0.001`,
      },
      {
        suite: "pct",
        name: "customer 2's rows each read 50.0 percent of their own total",
        isHidden: true,
        sql: `SELECT customer_id, order_date
          FROM trend
          WHERE customer_id = 2 AND ABS(pct_of_total - 50.0) > 0.001`,
      },
      {
        suite: "moving_avg",
        name: "every moving average matches a recomputed 3-row frame",
        isHidden: true,
        sql: `SELECT t.customer_id, t.order_date
          FROM trend t
          JOIN (
            SELECT customer_id, order_date,
              ROUND(AVG(revenue) OVER (
                PARTITION BY customer_id ORDER BY order_date
                ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
              ), 2) AS expected
            FROM daily_revenue
          ) e ON e.customer_id = t.customer_id AND e.order_date = t.order_date
          WHERE ABS(t.moving_avg_3 - e.expected) > 0.001`,
      },
    ],
  }),
}

const recursiveCte: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-recursive-cte",
  title: "Recursive CTEs for Hierarchies",
  summary: "Walk self-referencing trees like org charts and category paths.",
  estimatedMinutes: 24,
  difficulty: "hard",
  skills: [
    "WITH RECURSIVE",
    "anchor + recursive member",
    "UNION ALL",
    "termination guard",
    "depth tracking",
  ],
  teach: {
    estimatedMinutes: 9,
    markdown: `## Recursive CTEs: walk a tree of unknown depth

A \`categories\` table where each row has a \`parent_id\` pointing at another row in the *same* table
can nest arbitrarily deep: \`Electronics → Audio → Headphones → Over-ear\`. You can't write "join N
times" when N is unknown at query time. A **recursive CTE** repeatedly applies a query to its own
output until nothing new is produced.

A recursive CTE has three parts:

\`\`\`sql
WITH RECURSIVE tree AS (
  -- 1. ANCHOR: the starting rows (the roots)
  SELECT id, name, parent_id, 0 AS depth
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  -- 2. RECURSIVE MEMBER: joins the CTE back to the base table to go one level deeper
  SELECT c.id, c.name, c.parent_id, t.depth + 1
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
  -- 3. TERMINATION: implicit — stops when the recursive member returns no new rows
)
SELECT * FROM tree ORDER BY depth, id;
\`\`\`

- **Anchor** runs once, seeding the working set (here, top-level categories at depth 0).
- **Recursive member** runs repeatedly: each pass joins the base table to the rows produced by the
  *previous* pass, emitting the children one level deeper. \`depth + 1\` tracks how far down you are.
- **Termination** is automatic: when a pass produces zero new rows (you've hit the leaves), recursion
  stops. A well-formed tree terminates on its own.

### Building a breadcrumb path

Carry an accumulating string down the recursion to build \`Electronics > Audio > Headphones\`:

\`\`\`sql
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, name AS path, 0 AS depth
  FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.name, c.parent_id,
         t.path || ' > ' || c.name AS path,
         t.depth + 1
  FROM categories c JOIN tree t ON c.parent_id = t.id
)
SELECT id, name, path, depth FROM tree;
\`\`\`

Each level appends its own name to the parent's path.

### Common pitfalls

- **Type mismatch between anchor and recursive member.** The two \`SELECT\`s must have the **same
  number and types** of columns. If the anchor's \`path\` is declared narrower than the concatenated
  recursive \`path\`, some engines truncate. Seed the anchor with the same expression type.
- **Infinite loops on dirty data.** If the data has a cycle (A's parent is B, B's parent is A),
  recursion never terminates. Guard with a depth cap (\`WHERE t.depth < 100\` in the recursive member)
  or track a visited-path and stop on repeats.
- **\`UNION\` vs \`UNION ALL\`.** Use \`UNION ALL\` — it's cheaper and correct for a tree. \`UNION\` would
  dedupe every pass, which is wasteful and can mask cycles.

> **In the warehouse:** Postgres, SQLite, Snowflake, BigQuery all require the \`RECURSIVE\` keyword;
> **SQL Server omits it** — you write plain \`WITH tree AS (…)\` for a recursive CTE there. The
> three-part structure is identical everywhere.

**Recap:** \`WITH RECURSIVE\` = anchor (roots) \`UNION ALL\` recursive member (join the CTE back to the
table for the next level), auto-terminating when no new rows appear; track \`depth\` and accumulate a
\`path\` string for breadcrumbs, and cap depth to survive cyclic dirty data.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB
that already holds the source tree plus an empty target table; then hidden assertion queries check
depths, breadcrumbs, and row counts. Lead your load with \`DELETE FROM <target>;\` so a re-run stays
idempotent.`,
  },
  apply: scriptExercise({
    id: "sql-l4-recursive-cte-apply",
    prompt: `Traverse an \`employees\` → \`manager\` hierarchy and record each employee's **depth** from the
top. Populate \`org_depth(emp_id, name, depth)\` where the CEO (no manager) is depth 0, their direct
reports are depth 1, and so on.

The \`employees\` table is seeded; the empty \`org_depth\` target already exists. Lead your load with
\`DELETE FROM org_depth;\` so re-running the script keeps exactly six rows.`,
    starterCode: `-- employees is already seeded; org_depth exists but is empty.
DELETE FROM org_depth;   -- keep the load idempotent on re-run

-- INSERT INTO org_depth (emp_id, name, depth)
-- WITH RECURSIVE org_tree AS (
--   anchor: the CEO (manager_id IS NULL) at depth 0
--   UNION ALL
--   recursive member: JOIN employees back to org_tree on manager_id = emp_id, depth + 1
-- )
-- SELECT emp_id, name, depth FROM org_tree;`,
    hints: [
      "Anchor: `WHERE manager_id IS NULL` seeds the CEO at `depth 0`.",
      "Recursive member: `JOIN org_tree t ON e.manager_id = t.emp_id`, emitting `t.depth + 1`.",
      "Use `UNION ALL`, then `INSERT INTO org_depth (emp_id, name, depth) SELECT emp_id, name, depth FROM org_tree`.",
    ],
    referenceSolution: `DELETE FROM org_depth;

INSERT INTO org_depth (emp_id, name, depth)
WITH RECURSIVE org_tree AS (
  SELECT emp_id, name, manager_id, 0 AS depth
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  SELECT e.emp_id, e.name, e.manager_id, t.depth + 1
  FROM employees e
  JOIN org_tree t ON e.manager_id = t.emp_id
)
SELECT emp_id, name, depth FROM org_tree;`,
    seedSql: `DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
  emp_id     INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  manager_id INTEGER          -- NULL for the CEO; FK to employees.emp_id
);
INSERT INTO employees VALUES
  (1,'Ada', NULL),
  (2,'Ben', 1),(3,'Cara',1),
  (4,'Dan', 2),(5,'Eve', 2),
  (6,'Finn',4);
DROP TABLE IF EXISTS org_depth;
CREATE TABLE org_depth (emp_id INTEGER, name TEXT, depth INTEGER);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "all six employees landed in org_depth",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM org_depth) <> 6`,
      },
      {
        suite: "depth",
        name: "the CEO (Ada) sits at depth 0",
        sql: `SELECT 1 WHERE COALESCE((SELECT depth FROM org_depth WHERE name = 'Ada'), -1) <> 0`,
      },
      {
        suite: "depth",
        name: "Ada's two direct reports are both at depth 1",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM org_depth WHERE name IN ('Ben','Cara') AND depth = 1) <> 2`,
      },
      {
        suite: "depth",
        name: "the grandchildren (Dan, Eve) are at depth 2",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM org_depth WHERE name IN ('Dan','Eve') AND depth = 2) <> 2`,
      },
      {
        suite: "depth",
        name: "Finn nests to depth 3",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT depth FROM org_depth WHERE name = 'Finn'), -1) <> 3`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-recursive-cte-practice",
    prompt: `From a self-referencing \`categories\` table, build a **catalog mart**
\`category_path(category_id, name, breadcrumb, depth, root_name)\`:

- \`breadcrumb\` is the full path from the root joined by \`' > '\` (e.g. \`Electronics > Audio > Headphones\`),
- \`depth\` is the level (root = 0),
- \`root_name\` is the top-level ancestor's name.

Guard against a cyclic row in the data by **capping depth at 20** in the recursive member. The
\`categories\` source is seeded and the empty \`category_path\` target already exists — lead your load
with \`DELETE FROM category_path;\` so a re-run keeps exactly eight rows.`,
    starterCode: `-- categories is already seeded; category_path exists but is empty.
DELETE FROM category_path;   -- keep the load idempotent on re-run

-- INSERT INTO category_path (category_id, name, breadcrumb, depth, root_name)
-- WITH RECURSIVE cat_tree AS (
--   anchor: roots (parent_id IS NULL) — seed breadcrumb = name, depth 0, root_name = name
--   UNION ALL
--   recursive member: breadcrumb = t.breadcrumb || ' > ' || c.name, depth + 1, carry t.root_name
--   ... WHERE t.depth < 20   -- cycle guard
-- )
-- SELECT category_id, name, breadcrumb, depth, root_name FROM cat_tree;`,
    hints: [
      "Seed both `breadcrumb` (`= name`) and `root_name` (`= name`) in the anchor so `root_name` propagates down unchanged.",
      "In the recursive member, `breadcrumb = t.breadcrumb || ' > ' || c.name`, but `root_name = t.root_name` — carry the root down, don't recompute it.",
      "Add `WHERE t.depth < 20` to the recursive member's join as the cycle guard.",
      "`UNION ALL`, then insert all five columns into `category_path`.",
    ],
    seedSql: `DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  parent_id   INTEGER          -- NULL for a root category
);
INSERT INTO categories VALUES
  (1,'Electronics',NULL),
  (2,'Audio',1),(3,'Video',1),
  (4,'Headphones',2),(5,'Speakers',2),
  (6,'Over-ear',4),
  (10,'Home',NULL),(11,'Kitchen',10);
DROP TABLE IF EXISTS category_path;
CREATE TABLE category_path (
  category_id INTEGER, name TEXT, breadcrumb TEXT, depth INTEGER, root_name TEXT
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "every category landed — exactly eight rows",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM category_path) <> 8`,
      },
      {
        suite: "breadcrumb",
        name: "Over-ear carries its full four-level breadcrumb",
        sql: `SELECT 1 WHERE COALESCE((SELECT breadcrumb FROM category_path WHERE name = 'Over-ear'), '~') <> 'Electronics > Audio > Headphones > Over-ear'`,
      },
      {
        suite: "depth",
        name: "Over-ear is depth 3 under root Electronics",
        sql: `SELECT 1 WHERE COALESCE((SELECT depth FROM category_path WHERE name = 'Over-ear'), -1) <> 3
          OR COALESCE((SELECT root_name FROM category_path WHERE name = 'Over-ear'), '~') <> 'Electronics'`,
      },
      {
        suite: "breadcrumb",
        name: "Kitchen resolves to 'Home > Kitchen' at depth 1 under Home",
        sql: `SELECT 1 WHERE COALESCE((SELECT breadcrumb FROM category_path WHERE name = 'Kitchen'), '~') <> 'Home > Kitchen'
          OR COALESCE((SELECT depth FROM category_path WHERE name = 'Kitchen'), -1) <> 1
          OR COALESCE((SELECT root_name FROM category_path WHERE name = 'Kitchen'), '~') <> 'Home'`,
      },
      {
        suite: "root",
        name: "a root category is its own breadcrumb at depth 0",
        sql: `SELECT category_id FROM category_path
          WHERE name = 'Electronics' AND (breadcrumb <> 'Electronics' OR depth <> 0 OR root_name <> 'Electronics')`,
      },
      {
        suite: "structure",
        name: "root_name is carried from the ancestor, not recomputed per row",
        isHidden: true,
        sql: `SELECT category_id FROM category_path
          WHERE root_name <> CASE WHEN instr(breadcrumb, ' > ') > 0
                                  THEN substr(breadcrumb, 1, instr(breadcrumb, ' > ') - 1)
                                  ELSE breadcrumb END`,
      },
      {
        suite: "structure",
        name: "depth equals the number of breadcrumb segments below the root",
        isHidden: true,
        sql: `SELECT category_id FROM category_path
          WHERE depth <> (length(breadcrumb) - length(replace(breadcrumb, ' > ', ''))) / 3`,
      },
    ],
  }),
}

const starBuild: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-star-build",
  title: "Building a Star Schema Load",
  summary: "Populate dimensions with surrogate keys, then load a fact that references them.",
  estimatedMinutes: 24,
  difficulty: "hard",
  skills: ["dimension load", "surrogate-key assignment", "fact load", "key lookup join"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## The fact stores surrogate keys, so the dimensions load first

A star schema's fact table stores **surrogate keys** (small integers like \`product_key\`), not
business/natural keys (\`sku\`, \`email\`). That keeps the fact narrow and decouples it from messy
source keys. But it forces a strict **load order**:

1. **Load the dimensions first.** Each dimension row gets a surrogate key — an \`INTEGER PRIMARY KEY\`
   in SQLite auto-assigns one.
2. **Load the fact second**, and for each fact row **look up** the surrogate key by joining the
   staging row's *natural* key to the dimension.

If you load the fact first, there are no surrogate keys to point at. If a fact's natural key has no
matching dimension row, you get an **orphan fact** — an inner join drops it, a left join leaves a
\`NULL\` key. A correct load has **zero orphan facts**.

### Worked pattern

\`\`\`sql
-- 1. dims first: surrogate key auto-assigned, natural key kept as an attribute
CREATE TABLE dim_product (
  product_key INTEGER PRIMARY KEY,   -- surrogate
  sku         TEXT UNIQUE NOT NULL,  -- natural key
  name        TEXT
);
INSERT INTO dim_product (sku, name)
SELECT DISTINCT sku, name FROM stg_products;

-- 2. fact second: join staging natural key -> dim to fetch the surrogate key
CREATE TABLE fact_sales (
  sale_id     INTEGER PRIMARY KEY,
  product_key INTEGER NOT NULL REFERENCES dim_product(product_key),
  qty         INTEGER,
  revenue     INTEGER
);
INSERT INTO fact_sales (product_key, qty, revenue)
SELECT dp.product_key, s.qty, s.revenue
FROM stg_sales s
JOIN dim_product dp ON dp.sku = s.sku;   -- INNER JOIN = orphans excluded
\`\`\`

The \`JOIN … ON dp.sku = s.sku\` is the **key lookup**: it swaps the source \`sku\` for the warehouse
\`product_key\`. Notice the fact insert never types a surrogate key literally — it always *looks one up*.

### Common pitfalls

- **Inner join silently drops orphans.** An inner join *is* the right choice when the rule is "every
  fact must match a dimension," but you should **assert** the dropped count is zero rather than
  silently lose rows. A common defense is loading an \`UNKNOWN\` dimension member (surrogate key
  \`-1\`) and left-joining with \`COALESCE(dp.product_key, -1)\` so orphans are *counted*, not vanished.
- **Duplicate natural keys in the dimension.** If \`stg_products\` has the same \`sku\` twice, an
  \`INSERT … SELECT DISTINCT\` (or a dedup step) is required, or the lookup join fans out and inflates
  the fact.

> **In the warehouse:** Snowflake/BigQuery mint surrogate keys with \`IDENTITY\`/\`AUTOINCREMENT\` or
> sequences and often generate them during a \`MERGE\`. The dims-then-fact-with-lookup pattern is
> universal.

**Recap:** load dims first (mint surrogate keys), then load the fact by joining each staging row's
natural key to its dimension to fetch the surrogate key; a correct load produces zero orphan facts —
assert it rather than trusting the inner join.

**Execution mode:** you write a multi-statement script. The dimension and fact tables are pre-created
but **empty**; your script populates them. Lead with \`DELETE FROM\` each target so the load is
**re-runnable** — a second run must leave the same row counts, not double the fact.`,
  },
  apply: scriptExercise({
    id: "sql-l4-star-build-apply",
    prompt: `Load \`dim_customer\` with surrogate keys from staging, then load \`fact_sales\` by looking
those keys up. \`stg_customers(email, name)\` and \`stg_sales(email, amount)\` are seeded; the empty
targets \`dim_customer(customer_key, email, name)\` (surrogate \`customer_key\`) and
\`fact_sales(sale_id, customer_key, amount)\` already exist.

Insert the dimension letting \`customer_key\` auto-assign, then insert the fact by **joining
\`stg_sales\` to \`dim_customer\` on \`email\`** to fetch each \`customer_key\` — never type a key literally.
Lead with \`DELETE FROM\` both targets so the load survives a re-run.`,
    starterCode: `-- stg_customers and stg_sales are seeded; dim_customer and fact_sales exist (empty).
-- Make the load re-runnable: clear the targets first (fact before dim).
DELETE FROM fact_sales;
DELETE FROM dim_customer;

-- 1. Load the dimension; let customer_key auto-assign.
-- INSERT INTO dim_customer (email, name) SELECT ... FROM stg_customers;

-- 2. Load the fact: look up each customer_key by joining stg_sales to dim_customer on email.
-- INSERT INTO fact_sales (customer_key, amount)
-- SELECT dc.customer_key, s.amount FROM stg_sales s JOIN dim_customer dc ON ...;`,
    hints: [
      "Lead with `DELETE FROM fact_sales;` then `DELETE FROM dim_customer;` so a second run doesn't double the rows.",
      "Insert dims with `INSERT INTO dim_customer (email, name) SELECT email, name FROM stg_customers;` — the `customer_key` auto-fills.",
      "Load the fact with a join: `SELECT dc.customer_key, s.amount FROM stg_sales s JOIN dim_customer dc ON dc.email = s.email`.",
      "Don't insert `customer_key` values manually into the fact — always look them up through the join.",
    ],
    referenceSolution: `DELETE FROM fact_sales;
DELETE FROM dim_customer;

INSERT INTO dim_customer (email, name)
SELECT email, name FROM stg_customers;

INSERT INTO fact_sales (customer_key, amount)
SELECT dc.customer_key, s.amount
FROM stg_sales s
JOIN dim_customer dc ON dc.email = s.email;`,
    seedSql: `CREATE TABLE stg_customers (email TEXT, name TEXT);
INSERT INTO stg_customers VALUES
  ('a@x.com','Ada'),('b@x.com','Ben'),('c@x.com','Cara');
CREATE TABLE stg_sales (email TEXT, amount INTEGER);
INSERT INTO stg_sales VALUES
  ('a@x.com',100),('a@x.com',50),('b@x.com',200);

CREATE TABLE dim_customer (
  customer_key INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name  TEXT
);
CREATE TABLE fact_sales (
  sale_id INTEGER PRIMARY KEY,
  customer_key INTEGER NOT NULL REFERENCES dim_customer(customer_key),
  amount INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "dimension",
        name: "dim_customer has three rows with distinct surrogate keys",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer) <> 3
          OR (SELECT COUNT(DISTINCT customer_key) FROM dim_customer) <> 3`,
      },
      {
        suite: "fact",
        name: "fact_sales has three rows (one per staging sale)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM fact_sales) <> 3`,
      },
      {
        suite: "integrity",
        name: "zero orphan facts: every customer_key resolves to a dim_customer row",
        isHidden: true,
        sql: `SELECT f.sale_id
          FROM fact_sales f
          LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
          WHERE d.customer_key IS NULL`,
      },
      {
        suite: "lookup",
        name: "both sales for a@x.com share the same customer_key",
        isHidden: true,
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM fact_sales
          WHERE customer_key = (SELECT customer_key FROM dim_customer WHERE email = 'a@x.com')
        ) <> 2`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-star-build-practice",
    prompt: `Build a **full star load** from staging: three dimensions and a line-item fact.
\`stg_orders\` (one row per order line, carrying natural keys \`email\`, \`sku\`, and \`order_date\`) is
seeded, along with the empty targets \`dim_customer(customer_key, email, name)\`,
\`dim_product(product_key, sku, product_name)\`, \`dim_date(date_key, full_date)\`, and
\`fact_order_items(item_key, customer_key, product_key, date_key, qty, revenue)\`.

**Deduplicate each dimension by its natural key** (\`SELECT DISTINCT\`), then load the fact so every
row references all three dimensions by surrogate key, with **zero orphan facts**. Lead with
\`DELETE FROM\` every target (fact first) so the load re-runs cleanly.`,
    starterCode: `-- stg_orders is seeded; the three dims and the fact table exist (empty).
-- Make the load re-runnable: clear every target first (fact before dims).
DELETE FROM fact_order_items;
DELETE FROM dim_customer;
DELETE FROM dim_product;
DELETE FROM dim_date;

-- 1. Load each dimension, deduped by its natural key (SELECT DISTINCT ...).
-- INSERT INTO dim_customer (email, name)       SELECT DISTINCT ... FROM stg_orders;
-- INSERT INTO dim_product  (sku, product_name) SELECT DISTINCT ... FROM stg_orders;
-- INSERT INTO dim_date     (full_date)         SELECT DISTINCT ... FROM stg_orders;

-- 2. Load the fact: join staging to ALL THREE dims on the natural keys to fetch the surrogate keys.
-- INSERT INTO fact_order_items (customer_key, product_key, date_key, qty, revenue)
-- SELECT dc.customer_key, dp.product_key, dd.date_key, o.qty, o.revenue
-- FROM stg_orders o JOIN ... JOIN ... JOIN ... ;`,
    hints: [
      "Clear the targets first — `DELETE FROM fact_order_items;` then the three dims — so a re-run doesn't double the fact.",
      "Load each dimension with `INSERT … SELECT DISTINCT natural_key, attr FROM stg_orders` — `DISTINCT` collapses the repeated natural keys.",
      "Load the fact by joining staging to all three dimensions on their natural keys to fetch all three surrogate keys in one `SELECT`.",
      "Order matters: load all three dims before the fact. Inner joins to each dim are enough here because every staging natural key appears in its dim.",
    ],
    seedSql: `CREATE TABLE stg_orders (
  email TEXT, name TEXT, sku TEXT, product_name TEXT,
  order_date TEXT, qty INTEGER, revenue INTEGER
);
INSERT INTO stg_orders VALUES
  ('a@x.com','Ada','SKU1','Widget','2026-01-01',2,20),
  ('a@x.com','Ada','SKU2','Gadget','2026-01-01',1,15),
  ('b@x.com','Ben','SKU1','Widget','2026-01-02',3,30),
  ('a@x.com','Ada','SKU1','Widget','2026-01-02',1,10);

CREATE TABLE dim_customer (customer_key INTEGER PRIMARY KEY, email TEXT UNIQUE, name TEXT);
CREATE TABLE dim_product  (product_key  INTEGER PRIMARY KEY, sku TEXT UNIQUE, product_name TEXT);
CREATE TABLE dim_date     (date_key     INTEGER PRIMARY KEY, full_date TEXT UNIQUE);
CREATE TABLE fact_order_items (
  item_key    INTEGER PRIMARY KEY,
  customer_key INTEGER NOT NULL REFERENCES dim_customer(customer_key),
  product_key  INTEGER NOT NULL REFERENCES dim_product(product_key),
  date_key     INTEGER NOT NULL REFERENCES dim_date(date_key),
  qty INTEGER, revenue INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "dimension",
        name: "dim_customer deduped to two rows",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer) <> 2`,
      },
      {
        suite: "dimension",
        name: "dim_product deduped to two rows",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_product) <> 2`,
      },
      {
        suite: "dimension",
        name: "dim_date deduped to two rows",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_date) <> 2`,
      },
      {
        suite: "fact",
        name: "fact_order_items has four rows (one per staging line)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM fact_order_items) <> 4`,
      },
      {
        suite: "integrity",
        name: "zero orphan facts against dim_customer",
        sql: `SELECT f.item_key
          FROM fact_order_items f
          LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
          WHERE d.customer_key IS NULL`,
      },
      {
        suite: "integrity",
        name: "zero orphan facts against dim_product",
        isHidden: true,
        sql: `SELECT f.item_key
          FROM fact_order_items f
          LEFT JOIN dim_product d ON d.product_key = f.product_key
          WHERE d.product_key IS NULL`,
      },
      {
        suite: "integrity",
        name: "zero orphan facts against dim_date",
        sql: `SELECT f.item_key
          FROM fact_order_items f
          LEFT JOIN dim_date d ON d.date_key = f.date_key
          WHERE d.date_key IS NULL`,
      },
      {
        suite: "totals",
        name: "total revenue carried into the fact is 75",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COALESCE(SUM(revenue), 0) FROM fact_order_items) <> 75`,
      },
    ],
  }),
}

const scdType1: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-scd-type1",
  title: "Slowly Changing Dimensions — Type 1",
  summary: "Overwrite a changed attribute in place with no history.",
  estimatedMinutes: 20,
  difficulty: "medium",
  skills: ["SCD Type 1", "in-place UPDATE", "correction semantics"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Slowly Changing Dimensions: Type 1 overwrites in place

A **dimension** describes an entity — a customer, a product — and its attributes drift over time: a
customer moves city, a product gets renamed. How you *handle* that drift is the **Slowly Changing
Dimension (SCD)** question. **Type 1** is the simplest answer: **overwrite the old value in place and
keep no history.** The row count never changes — you just \`UPDATE\` the changed columns to their new
values.

Type 1 is the right choice when the old value was **wrong**: a typo, a misspelled city, a data-entry
error nobody ever needs to see again. You don't want a history *of a mistake*; you want it corrected
everywhere, retroactively.

### Worked example — the in-place overwrite

A fresh source dump lands in \`stg_customer\`; apply a Type 1 overwrite to \`dim_customer\`:

\`\`\`sql
UPDATE dim_customer
SET name = (SELECT s.name FROM stg_customer s WHERE s.email = dim_customer.email),
    city = (SELECT s.city FROM stg_customer s WHERE s.email = dim_customer.email)
WHERE email IN (SELECT email FROM stg_customer);
\`\`\`

Match on the **natural key** (\`email\`), overwrite the attributes, add **no rows** for the change.

A cleaner, portable form uses \`INSERT … ON CONFLICT(key) DO UPDATE\` (an *upsert*) so brand-new
customers are inserted and existing ones overwritten in a single statement — you'll write exactly that
in the practice. Either way the essence is identical: **match on the natural key, overwrite the
attributes, add no rows for changes.**

### Common pitfalls

- **Type 1 destroys the ability to answer "what was the value on date X."** If finance ever needs the
  customer's city *at the time of sale*, Type 1 is wrong — you need **Type 2** (next lesson). Choosing
  Type 1 is a **business decision**, not a default.
- **The correlated-subquery \`UPDATE\` needs its guard.** The \`WHERE email IN (SELECT email FROM
  stg_customer)\` clause matters: without it, every customer *absent* from the new dump has its
  \`name\`/\`city\` set to \`NULL\` — the subquery returns nothing, so the assignment is NULL.

> **In the warehouse:** Snowflake and BigQuery express Type 1 as a \`MERGE … WHEN MATCHED THEN UPDATE\`.
> SQLite and Postgres use \`INSERT … ON CONFLICT DO UPDATE\` or a plain \`UPDATE\`. Same semantics:
> overwrite, no history.

**Recap:** SCD Type 1 overwrites changed attributes in place — match on the natural key, \`UPDATE\`, add
zero new rows. It's correct for fixing errors where no history is wanted; if you need "the value as of
date X," reach for Type 2 instead.

**Execution mode:** you write a multi-statement script against a fresh in-memory SQLite DB already
seeded with \`dim_customer\` and \`stg_customer\`. Hidden assertion queries then check the row count, the
overwritten values, and that surrogate keys stayed put — and running your script twice must leave the
same number of rows.`,
  },
  apply: scriptExercise({
    id: "sql-l4-scd-type1-apply",
    prompt: `Apply a **Type 1 update** to correct a customer's misspelled city. \`dim_customer\` holds the
current dimension; \`stg_customer\` holds a corrected dump. Overwrite \`name\` and \`city\` in
\`dim_customer\` for every email present in the staging dump, adding **no new rows** and leaving the
surrogate \`customer_key\` untouched.`,
    starterCode: `-- dim_customer and stg_customer are already seeded for you.
-- Apply a Type 1 overwrite: match on email, overwrite name + city, add no rows.

-- UPDATE dim_customer
-- SET name = (SELECT s.name FROM stg_customer s WHERE s.email = dim_customer.email),
--     city = ...
-- WHERE email IN (SELECT email FROM stg_customer);`,
    hints: [
      "A single `UPDATE dim_customer SET … WHERE email IN (SELECT email FROM stg_customer)` does the whole job.",
      "Pull the new `city`/`name` with correlated subqueries matched on `email`.",
      "Don't `INSERT` anything — Type 1 is overwrite-only, so the row count must stay at 2.",
    ],
    referenceSolution: `UPDATE dim_customer
SET name = (SELECT s.name FROM stg_customer s WHERE s.email = dim_customer.email),
    city = (SELECT s.city FROM stg_customer s WHERE s.email = dim_customer.email)
WHERE email IN (SELECT email FROM stg_customer);`,
    seedSql: `DROP TABLE IF EXISTS dim_customer;
DROP TABLE IF EXISTS stg_customer;

CREATE TABLE dim_customer (
  customer_key INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name  TEXT,
  city  TEXT
);
INSERT INTO dim_customer (email, name, city) VALUES
  ('a@x.com','Ada','Lundon'),   -- misspelled city
  ('b@x.com','Ben','Paris');

CREATE TABLE stg_customer (email TEXT, name TEXT, city TEXT);
INSERT INTO stg_customer VALUES
  ('a@x.com','Ada','London'),   -- corrected spelling
  ('b@x.com','Ben','Paris');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "no history rows added — dim_customer still holds exactly 2 rows",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer) <> 2`,
      },
      {
        suite: "correction",
        name: "a@x.com city corrected to London",
        sql: `SELECT 1 WHERE COALESCE((SELECT city FROM dim_customer WHERE email = 'a@x.com'), '~') <> 'London'`,
      },
      {
        suite: "correction",
        name: "b@x.com left untouched (still Ben / Paris)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT name || '|' || city FROM dim_customer WHERE email = 'b@x.com'), '~') <> 'Ben|Paris'`,
      },
      {
        suite: "identity",
        name: "surrogate key preserved — a@x.com is still customer_key 1 (overwrite, not delete+reinsert)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT customer_key FROM dim_customer WHERE email = 'a@x.com'), -1) <> 1`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-scd-type1-practice",
    prompt: `Write a **Type 1 apply step** that overwrites changed attributes from a fresh source dump
**and** inserts brand-new customers — leaving exactly **one row per email**. \`dim_customer\` (which now
carries a \`tier\` column) and a \`stg_customer\` dump are already seeded; the dump contains updates to
existing customers **and** a customer not yet in the dimension. Produce a \`dim_customer\` where existing
rows are overwritten in place (keeping their \`customer_key\`) and the new customer is appended with a
fresh key. Re-running your script must leave the row count unchanged.`,
    starterCode: `-- dim_customer (with a tier column) and stg_customer are already seeded.
-- Apply a Type 1 step that OVERWRITES existing customers and INSERTS brand-new ones,
-- leaving exactly one row per email — and idempotent on a re-run.

-- INSERT INTO dim_customer (email, name, city, tier)
-- SELECT email, name, city, tier FROM stg_customer WHERE true
-- ON CONFLICT(email) DO UPDATE SET ... ;`,
    hints: [
      "The clean one-statement form is `INSERT INTO dim_customer (email,name,city,tier) SELECT email,name,city,tier FROM stg_customer WHERE true ON CONFLICT(email) DO UPDATE SET name=excluded.name, city=excluded.city, tier=excluded.tier;` — `email` must be `UNIQUE` (it is).",
      "`excluded.<col>` refers to the row that would have been inserted — that's the new source value.",
      "The `ON CONFLICT` upsert makes this idempotent for free: re-running overwrites with the same values and inserts nothing new. (`INSERT OR REPLACE` would work too, but it deletes+reinserts and so churns the surrogate key — avoid it.)",
      "If you split it into `UPDATE` + `INSERT … WHERE email NOT IN (SELECT email FROM dim_customer)`, run the `INSERT` after the `UPDATE` and only for genuinely new emails.",
    ],
    seedSql: `DROP TABLE IF EXISTS dim_customer;
DROP TABLE IF EXISTS stg_customer;

CREATE TABLE dim_customer (
  customer_key INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name  TEXT, city TEXT, tier TEXT
);
INSERT INTO dim_customer (email, name, city, tier) VALUES
  ('a@x.com','Ada','Lundon','gold'),
  ('b@x.com','Ben','Paris','silver');

CREATE TABLE stg_customer (email TEXT, name TEXT, city TEXT, tier TEXT);
INSERT INTO stg_customer VALUES
  ('a@x.com','Ada','London','gold'),      -- corrected city
  ('b@x.com','Ben','Paris','gold'),       -- tier upgraded
  ('c@x.com','Cara','Berlin','bronze');   -- brand-new customer`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "one row per email — dim_customer holds exactly 3 rows",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer) <> 3`,
      },
      {
        suite: "correction",
        name: "a@x.com city overwritten to London",
        sql: `SELECT 1 WHERE COALESCE((SELECT city FROM dim_customer WHERE email = 'a@x.com'), '~') <> 'London'`,
      },
      {
        suite: "correction",
        name: "b@x.com tier upgraded to gold in place",
        sql: `SELECT 1 WHERE COALESCE((SELECT tier FROM dim_customer WHERE email = 'b@x.com'), '~') <> 'gold'`,
      },
      {
        suite: "insert",
        name: "brand-new c@x.com landed with a fresh surrogate key",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT customer_key FROM dim_customer WHERE email = 'c@x.com'), -1) < 3`,
      },
      {
        suite: "identity",
        name: "existing surrogate keys stayed stable — a@x.com is still key 1, b@x.com still key 2 (upsert, not a key-churning replace)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT customer_key FROM dim_customer WHERE email = 'a@x.com'), -1) <> 1
          OR COALESCE((SELECT customer_key FROM dim_customer WHERE email = 'b@x.com'), -1) <> 2`,
      },
    ],
  }),
}

const scdType2: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-scd-type2",
  title: "Slowly Changing Dimensions — Type 2",
  summary: "Preserve history by expiring old rows and inserting new versions.",
  estimatedMinutes: 28,
  difficulty: "hard",
  skills: [
    "SCD Type 2",
    "effective_from/effective_to",
    "is_current flag",
    "new surrogate per version",
  ],
  teach: {
    estimatedMinutes: 10,
    markdown: `## SCD Type 2: keep history instead of overwriting

Type 1 overwrites and forgets. But finance often needs to attribute a sale to the customer's attributes
**as they were on the sale date** — if Ada lived in London in January and Berlin in March, a January
order must stay attributed to London. That requires keeping **history**, and that's **SCD Type 2**:
instead of overwriting, you **expire the old row and insert a new version** with a fresh surrogate key.
The dimension grows one row per change, and each row carries a **validity window**.

Three columns make Type 2 work:

- **\`effective_from\`** — the date this version became true.
- **\`effective_to\`** — the date it stopped being true (a far-future sentinel like \`'9999-12-31'\` while still current).
- **\`is_current\`** — a \`1\`/\`0\` flag; exactly **one** current row per natural key.

Each version also gets its **own new surrogate key**, so a fact table can point at the specific version
valid *as of* the event date. That's the whole point: \`fact.customer_key\` references the version that
was current when the sale happened, not the latest one.

### The apply algorithm

When a fresh source dump arrives, for each natural key whose tracked attributes **changed**:

1. **Expire the current row:** set \`effective_to = <change_date>\` and \`is_current = 0\` on the row where \`is_current = 1\`.
2. **Insert a new version:** the new attribute values, \`effective_from = <change_date>\`, \`effective_to = '9999-12-31'\`, \`is_current = 1\`, a fresh surrogate key.

Unchanged keys are left alone; brand-new keys get a single current row.

### Worked example

\`\`\`sql
-- Ada moves from London to Berlin, effective 2026-03-01.

-- Step 1: expire the old current row
UPDATE dim_customer
SET effective_to = '2026-03-01', is_current = 0
WHERE email = 'a@x.com' AND is_current = 1;

-- Step 2: insert the new version with a fresh surrogate key
INSERT INTO dim_customer (email, name, city, effective_from, effective_to, is_current)
VALUES ('a@x.com', 'Ada', 'Berlin', '2026-03-01', '9999-12-31', 1);
\`\`\`

After this, \`dim_customer\` has two rows for Ada: \`[London, 2026-01-01 → 2026-03-01, is_current=0]\` and
\`[Berlin, 2026-03-01 → 9999-12-31, is_current=1]\`. A fact row dated \`2026-02-10\` joins to the **London**
version because \`2026-02-10\` falls in \`[effective_from, effective_to)\`; a fact dated \`2026-03-15\` joins
to **Berlin**.

### Anatomy of the as-of join (how facts use Type 2)

\`\`\`sql
SELECT f.sale_id, d.city
FROM fact_sales f
JOIN dim_customer d
  ON d.email = f.email
 AND f.sale_date >= d.effective_from
 AND f.sale_date <  d.effective_to;     -- half-open window: [from, to)
\`\`\`

The \`>= effective_from AND < effective_to\` is the **as-of** predicate — it selects the one version valid
on the sale date. Use a **half-open interval** (\`< effective_to\`, not \`<=\`) so the boundary date belongs
to exactly one version and rows never double-count.

### Common pitfalls

- **More than one \`is_current = 1\` per key** is the #1 Type 2 bug — it means an update ran the insert
  without expiring the old row, and every downstream \`WHERE is_current = 1\` now doubles. Graders assert
  exactly one current row per key.
- **Overlapping windows** (old row's \`effective_to\` ≠ new row's \`effective_from\`) make the as-of join
  match two versions or none. Set the expiring row's \`effective_to\` **equal** to the new row's \`effective_from\`.
- **Closed intervals double-count.** If both versions include the boundary date (\`<=\`), a sale on that
  exact day joins twice. Always half-open.
- **Expiring on the wrong key.** \`WHERE email = ? AND is_current = 1\` — forgetting \`is_current = 1\`
  expires *all* historical versions.

> **In the warehouse:** Snowflake/BigQuery implement the whole Type 2 apply as a single \`MERGE\` with
> \`WHEN MATCHED THEN UPDATE\` (expire) plus an \`INSERT\` for the new version, often generated by dbt's
> snapshot macro. The two-step expire-then-insert logic is identical; only the statement packaging
> differs. \`TRUE\`/\`FALSE\` are real booleans there; in SQLite \`is_current\` is \`1\`/\`0\`.

**Recap:** SCD Type 2 keeps history by expiring the old row (\`effective_to = change_date\`,
\`is_current = 0\`) and inserting a new version (fresh surrogate key, \`effective_from = change_date\`,
\`effective_to = '9999-12-31'\`, \`is_current = 1\`); facts join to the version valid on the event date via a
half-open \`[effective_from, effective_to)\` as-of predicate, and there must be exactly one
\`is_current = 1\` per natural key.

**Execution mode:** you write a multi-statement script. It runs against a fresh seeded SQLite DB, then
hidden assertion queries check the version count, the current flag, the validity windows, and idempotency.`,
  },
  apply: scriptExercise({
    id: "sql-l4-scd-type2-apply",
    prompt: `Close the current row and open a new version when a customer changes city. \`dim_customer\`
holds one current row for \`a@x.com\` (city London, effective \`2026-01-01\`). A change arrives: as of
\`2026-03-01\`, Ada's city is Berlin. Apply the Type 2 change — **expire** the London row and **insert** a
Berlin version — so the dimension keeps both the expired London history and the current Berlin version,
with their validity windows meeting exactly.`,
    starterCode: `-- dim_customer already holds Ada's current London row (effective 2026-01-01).
-- Apply the Type 2 change: as of 2026-03-01, Ada's city is Berlin.

-- Step 1: expire the current London row — SET effective_to = '2026-03-01', is_current = 0 ...

-- Step 2: insert the Berlin version — effective_from = '2026-03-01', effective_to = '9999-12-31', is_current = 1 ...`,
    hints: [
      "Two statements: an `UPDATE` to expire, then an `INSERT` for the new version.",
      "Expire with `SET effective_to = '2026-03-01', is_current = 0 WHERE email = 'a@x.com' AND is_current = 1`.",
      "Insert the Berlin row with `effective_from = '2026-03-01'`, `effective_to = '9999-12-31'`, `is_current = 1`.",
      "Set the old `effective_to` equal to the new `effective_from` so the windows are contiguous — no gap, no overlap.",
    ],
    referenceSolution: `UPDATE dim_customer
SET effective_to = '2026-03-01', is_current = 0
WHERE email = 'a@x.com' AND is_current = 1;

INSERT INTO dim_customer (email, name, city, effective_from, effective_to, is_current)
VALUES ('a@x.com', 'Ada', 'Berlin', '2026-03-01', '9999-12-31', 1);`,
    seedSql: `DROP TABLE IF EXISTS dim_customer;
CREATE TABLE dim_customer (
  customer_key   INTEGER PRIMARY KEY,
  email          TEXT NOT NULL,
  name           TEXT,
  city           TEXT,
  effective_from TEXT NOT NULL,
  effective_to   TEXT NOT NULL,
  is_current     INTEGER NOT NULL
);
INSERT INTO dim_customer (email, name, city, effective_from, effective_to, is_current)
VALUES ('a@x.com','Ada','London','2026-01-01','9999-12-31',1);`,
    assertions: [
      {
        suite: "versions",
        name: "a@x.com now has exactly two versions",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer WHERE email = 'a@x.com') <> 2`,
      },
      {
        suite: "current",
        name: "exactly one current row for a@x.com",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer WHERE email = 'a@x.com' AND is_current = 1) <> 1`,
      },
      {
        suite: "current",
        name: "the current version is Berlin, 2026-03-01 → 9999-12-31",
        sql: `SELECT customer_key FROM dim_customer
WHERE email = 'a@x.com' AND is_current = 1
  AND NOT (city = 'Berlin' AND effective_from = '2026-03-01' AND effective_to = '9999-12-31')`,
      },
      {
        suite: "history",
        name: "the London row is expired (is_current = 0, effective_to = 2026-03-01)",
        sql: `SELECT customer_key FROM dim_customer
WHERE email = 'a@x.com' AND city = 'London'
  AND NOT (is_current = 0 AND effective_to = '2026-03-01')`,
      },
      {
        suite: "windows",
        name: "the two versions meet exactly — no gap, no overlap",
        isHidden: true,
        sql: `SELECT 1 WHERE
  COALESCE((SELECT effective_to FROM dim_customer WHERE email = 'a@x.com' AND city = 'London'), 'x')
  <> COALESCE((SELECT effective_from FROM dim_customer WHERE email = 'a@x.com' AND city = 'Berlin'), 'y')`,
      },
      {
        suite: "windows",
        name: "no two versions of the customer have overlapping validity windows",
        isHidden: true,
        sql: `SELECT a.customer_key
FROM dim_customer a
JOIN dim_customer b ON a.email = b.email AND a.customer_key <> b.customer_key
WHERE a.effective_from < b.effective_to AND b.effective_from < a.effective_to`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-scd-type2-practice",
    prompt: `Build a **general Type 2 apply step** driven by a fresh source dump, not a single hand-coded
change. \`dim_customer\` holds the current dimension (one \`is_current = 1\` row per email). \`stg_customer\`
is today's dump with a \`snapshot_date\`. For each email whose tracked attribute (\`city\`) **differs** from
its current dimension row: expire the current row (\`effective_to = snapshot_date\`, \`is_current = 0\`) and
insert a new version (\`effective_from = snapshot_date\`, \`effective_to = '9999-12-31'\`, \`is_current = 1\`).
Customers whose city is **unchanged** get no new row; customers **absent** from today's dump are left
as-is; brand-new emails get a single current version. The step must be **idempotent** — running it twice
must leave \`dim_customer\` byte-for-byte identical.`,
    starterCode: `-- dim_customer holds the current dimension (one is_current = 1 row per email).
-- stg_customer is today's dump, each row carrying a snapshot_date.
-- Apply a GENERAL Type 2 step and make it idempotent (safe to run twice).
--
-- Trap: capture the CHANGED emails FIRST, before you expire or insert, so the
-- insert can't re-detect its own freshly written rows on a second run.

-- Step 1: DROP + CREATE a temp table of changed emails
--   (stg.city <> the current dim row's city) ...

-- Step 2: expire the current row for those changed emails
--   (effective_to = snapshot_date, is_current = 0) ...

-- Step 3: insert the new current version for each changed email
--   (effective_from = snapshot_date, effective_to = '9999-12-31', is_current = 1) ...

-- Step 4: insert brand-new emails (present in stg, absent from dim) as one current version ...`,
    hints: [
      "Identify **changed** emails first: join `stg_customer` to the current dimension row (`is_current = 1`) on `email` and keep where `stg.city <> dim.city`.",
      "Expire step: `UPDATE dim_customer SET effective_to = <snapshot>, is_current = 0 WHERE is_current = 1 AND email IN (<changed emails>)`.",
      "Insert step: insert new versions for changed emails **and** brand-new emails (emails in staging with no current dim row). Both get `is_current = 1`, `effective_from = snapshot_date`, `effective_to = '9999-12-31'`.",
      "Idempotency is the trap: after the first run the current city already equals staging, so the changed set is empty on the second run — compare against the **current** row, and compute the changed-set into a temp table first so the insert doesn't re-detect its own new rows.",
    ],
    seedSql: `DROP TABLE IF EXISTS dim_customer;
CREATE TABLE dim_customer (
  customer_key   INTEGER PRIMARY KEY,
  email          TEXT NOT NULL,
  name           TEXT,
  city           TEXT,
  effective_from TEXT NOT NULL,
  effective_to   TEXT NOT NULL,
  is_current     INTEGER NOT NULL
);
INSERT INTO dim_customer (email, name, city, effective_from, effective_to, is_current) VALUES
  ('a@x.com','Ada','London','2026-01-01','9999-12-31',1),
  ('b@x.com','Ben','Paris', '2026-01-01','9999-12-31',1),
  ('c@x.com','Cara','Rome', '2026-01-01','9999-12-31',1);

DROP TABLE IF EXISTS stg_customer;
CREATE TABLE stg_customer (email TEXT, name TEXT, city TEXT, snapshot_date TEXT);
INSERT INTO stg_customer VALUES
  ('a@x.com','Ada','Berlin','2026-03-01'),
  ('b@x.com','Ben','Paris', '2026-03-01'),
  ('d@x.com','Dan','Oslo',  '2026-03-01');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "current",
        name: "exactly one current (is_current = 1) row per email a, b, c, d",
        sql: `SELECT e.email
FROM (SELECT 'a@x.com' AS email UNION SELECT 'b@x.com' UNION SELECT 'c@x.com' UNION SELECT 'd@x.com') e
WHERE (SELECT COALESCE(SUM(is_current), 0) FROM dim_customer d WHERE d.email = e.email) <> 1`,
      },
      {
        suite: "history",
        name: "a@x.com has exactly two versions (London expired, Berlin current)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer WHERE email = 'a@x.com') <> 2`,
      },
      {
        suite: "current",
        name: "a@x.com's current version is Berlin, 2026-03-01 → 9999-12-31",
        sql: `SELECT customer_key FROM dim_customer
WHERE email = 'a@x.com' AND is_current = 1
  AND NOT (city = 'Berlin' AND effective_from = '2026-03-01' AND effective_to = '9999-12-31')`,
      },
      {
        suite: "untouched",
        name: "b@x.com (unchanged) and c@x.com (absent from dump) each still have one row",
        sql: `SELECT e.email
FROM (SELECT 'b@x.com' AS email UNION SELECT 'c@x.com') e
WHERE (SELECT COUNT(*) FROM dim_customer d WHERE d.email = e.email) <> 1`,
      },
      {
        suite: "newkey",
        name: "d@x.com has exactly one current Oslo version from 2026-03-01",
        sql: `SELECT 1 WHERE
  NOT EXISTS (
    SELECT 1 FROM dim_customer
    WHERE email = 'd@x.com' AND is_current = 1 AND city = 'Oslo'
      AND effective_from = '2026-03-01' AND effective_to = '9999-12-31'
  )
  OR (SELECT COUNT(*) FROM dim_customer WHERE email = 'd@x.com') <> 1`,
      },
      {
        suite: "history",
        name: "a@x.com's London version is expired at 2026-03-01 (is_current = 0)",
        isHidden: true,
        sql: `SELECT customer_key FROM dim_customer
WHERE email = 'a@x.com' AND city = 'London'
  AND NOT (is_current = 0 AND effective_to = '2026-03-01')`,
      },
      {
        suite: "windows",
        name: "no customer has overlapping validity windows",
        isHidden: true,
        sql: `SELECT a.customer_key
FROM dim_customer a
JOIN dim_customer b ON a.email = b.email AND a.customer_key <> b.customer_key
WHERE a.effective_from < b.effective_to AND b.effective_from < a.effective_to`,
      },
    ],
  }),
}

const dedup: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-dedup",
  title: "Deduplication",
  summary: "Keep exactly one row per business key from a dirty source.",
  estimatedMinutes: 20,
  difficulty: "medium",
  skills: ["ROW_NUMBER() dedup", "partition-by-key", "keep-rank-1 subquery", "QUALIFY note"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Deduplicate to one row per business key

Source feeds are dirty. A daily customer dump often contains the same \`email\` several times — an old
record plus one or more updates. Before you load it, you must reduce it to **one row per business
key**, keeping the **right** one (usually the most recently updated). The portable pattern is
\`ROW_NUMBER\` (from Module 4.1) plus a wrapping filter:

\`\`\`sql
SELECT * FROM (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY email          -- the business key
           ORDER BY updated_at DESC     -- newest wins
         ) AS rn
  FROM stg_customer
) ranked
WHERE rn = 1;                          -- keep only the freshest row per email
\`\`\`

\`PARTITION BY email\` groups the duplicates; \`ORDER BY updated_at DESC\` puts the freshest first;
\`WHERE rn = 1\` keeps it. Because \`ROW_NUMBER\` assigns **unique** ranks, you get exactly one row per
key — never zero, never two.

### Common pitfalls

- **Ties in the \`ORDER BY\` make the winner nondeterministic.** If two rows share the same
  \`updated_at\`, add a deterministic tiebreaker (\`ORDER BY updated_at DESC, id DESC\`) so the same row
  wins every run — critical for idempotency.
- **\`DISTINCT\` is not dedup-by-key.** \`SELECT DISTINCT\` removes rows that are identical across *all*
  columns; it will **not** collapse two rows with the same \`email\` but different \`updated_at\`. Reach
  for \`ROW_NUMBER\` whenever "duplicate" means "same key, possibly different attributes."
- **Filtering \`rn\` inline fails.** You can't write \`WHERE ROW_NUMBER() OVER(...) = 1\` — a window
  function isn't allowed in \`WHERE\`. Wrap the window in a subquery/CTE and filter the \`rn\` alias
  outside it.

> **In the warehouse:** Snowflake and BigQuery let you drop the wrapping subquery entirely:
> \`… QUALIFY ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) = 1\`. SQLite and Postgres
> have no \`QUALIFY\` — wrap in a subquery/CTE as above.

**One more SQLite detail worth knowing:** \`NULL\` sorts as the *lowest* value, so \`ORDER BY updated_at
DESC\` puts every real timestamp first and pushes the \`NULL\`s last. A row whose \`updated_at\` is missing
therefore loses to any row that has one — exactly the behavior you want when a missing timestamp means
"unknown / oldest." (Some engines need an explicit \`NULLS LAST\` to get this; SQLite gives it to you
for free under \`DESC\`.)

**Recap:** dedup to one row per business key with
\`ROW_NUMBER() OVER (PARTITION BY key ORDER BY updated_at DESC)\`, then keep \`rn = 1\` in a wrapping
query. Add a deterministic tiebreaker so the same row wins every run, and reach for this (not
\`DISTINCT\`) whenever "duplicate" means the same key with differing attributes.

**Execution mode:** you write a multi-statement script. The target table is pre-created and may already
hold rows from a prior run, so **lead your load with \`DELETE FROM <target>;\`** — the grader runs your
script twice and checks the row count is identical, so a repeat must not double the rows. Hidden
assertion queries then check the row count, which row won each key, and that zero duplicate keys
remain.`,
  },
  apply: scriptExercise({
    id: "sql-l4-dedup-apply",
    prompt: `Reduce a source with duplicate emails to **one latest row per email**. \`stg_customer\`
(already seeded, with an \`updated_at\`) may list the same email several times; write the deduped rows
into \`clean_customer(email, name, city, updated_at)\`, keeping the most recently updated row per email.
**Lead with \`DELETE FROM clean_customer;\`** so re-running the script doesn't double the rows.`,
    starterCode: `-- stg_customer is already seeded. Load one latest row per email into clean_customer.
DELETE FROM clean_customer;

-- WITH ranked AS (
--   SELECT email, name, city, updated_at,
--          ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) AS rn
--   FROM stg_customer
-- )
-- INSERT INTO clean_customer (email, name, city, updated_at)
-- SELECT email, name, city, updated_at FROM ranked WHERE rn = 1;`,
    hints: [
      "\`ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC)\` numbers each email's rows newest-first; keep \`rn = 1\`.",
      "Put the window in a CTE, then \`INSERT INTO clean_customer (email, name, city, updated_at) SELECT email, name, city, updated_at FROM ranked WHERE rn = 1\`.",
      "\`updated_at\` is ISO text, so \`DESC\` sorts newest-first correctly.",
    ],
    referenceSolution: `DELETE FROM clean_customer;

INSERT INTO clean_customer (email, name, city, updated_at)
WITH ranked AS (
  SELECT email, name, city, updated_at,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) AS rn
  FROM stg_customer
)
SELECT email, name, city, updated_at
FROM ranked
WHERE rn = 1;`,
    seedSql: `DROP TABLE IF EXISTS stg_customer;
DROP TABLE IF EXISTS clean_customer;
CREATE TABLE stg_customer (
  email TEXT, name TEXT, city TEXT, updated_at TEXT
);
INSERT INTO stg_customer VALUES
  ('a@x.com','Ada','London','2026-01-01'),
  ('a@x.com','Ada','Berlin','2026-03-01'),
  ('b@x.com','Ben','Paris','2026-02-01');
CREATE TABLE clean_customer (email TEXT, name TEXT, city TEXT, updated_at TEXT);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "clean_customer holds exactly two rows — one per email",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM clean_customer) <> 2`,
      },
      {
        suite: "winner",
        name: "a@x.com kept the newer Berlin row",
        sql: `SELECT 1 WHERE COALESCE((SELECT city FROM clean_customer WHERE email = 'a@x.com'), '~') <> 'Berlin'`,
      },
      {
        suite: "winner",
        name: "the newest updated_at won for a@x.com",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT updated_at FROM clean_customer WHERE email = 'a@x.com'), '~') <> '2026-03-01'`,
      },
      {
        suite: "rows",
        name: "b@x.com appears exactly once",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM clean_customer WHERE email = 'b@x.com') <> 1`,
      },
      {
        suite: "dedup",
        name: "no email is duplicated",
        isHidden: true,
        sql: `SELECT email FROM clean_customer GROUP BY email HAVING COUNT(*) > 1`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-dedup-practice",
    prompt: `Deduplicate a **messy daily customer dump** to one current row per natural key and prove
zero duplicates. \`raw_customer\` (already seeded) has duplicate \`customer_code\`s with differing
\`updated_at\`, some rows sharing the **same** \`updated_at\` (needs a deterministic tiebreaker), and some
rows with a \`NULL\` \`updated_at\` that must lose to any non-null timestamp. Populate
\`dedup_customer(customer_code, email, updated_at, source_row_id)\` with exactly one row per
\`customer_code\`: the row with the latest non-null \`updated_at\`, tiebroken by the **highest**
\`source_row_id\`. **Lead with \`DELETE FROM dedup_customer;\`** so a re-run stays stable.`,
    starterCode: `-- raw_customer is already seeded. Deduplicate it to one current row per customer_code.
DELETE FROM dedup_customer;

-- WITH ranked AS (
--   SELECT customer_code, email, updated_at, source_row_id,
--          ROW_NUMBER() OVER (
--            PARTITION BY customer_code
--            ORDER BY updated_at DESC, source_row_id DESC
--          ) AS rn
--   FROM raw_customer
-- )
-- INSERT INTO dedup_customer (customer_code, email, updated_at, source_row_id)
-- SELECT customer_code, email, updated_at, source_row_id FROM ranked WHERE rn = 1;`,
    hints: [
      "SQLite sorts \`NULL\` as the lowest value, so \`ORDER BY updated_at DESC\` puts every non-null timestamp first and the NULLs last — exactly what you want when a NULL must lose to any real date.",
      "Add the tiebreaker so ties are deterministic: \`ORDER BY updated_at DESC, source_row_id DESC\` keeps the higher \`source_row_id\` when two rows share a date.",
      "\`PARTITION BY customer_code\`, then keep \`rn = 1\` from a wrapping CTE — you can't filter \`ROW_NUMBER()\` in \`WHERE\` directly.",
      "\`C3\` has only a NULL-\`updated_at\` row — \`ROW_NUMBER()\` still assigns it rank 1, so it survives. Don't filter out NULL timestamps.",
    ],
    seedSql: `DROP TABLE IF EXISTS raw_customer;
DROP TABLE IF EXISTS dedup_customer;
CREATE TABLE raw_customer (
  source_row_id INTEGER PRIMARY KEY,
  customer_code TEXT,
  email         TEXT,
  updated_at    TEXT
);
INSERT INTO raw_customer (customer_code, email, updated_at) VALUES
  ('C1','a@x.com','2026-01-01'),
  ('C1','a2@x.com','2026-03-01'),
  ('C1','a3@x.com','2026-03-01'),
  ('C2','b@x.com', NULL),
  ('C2','b2@x.com','2026-02-01'),
  ('C3','c@x.com', NULL);
CREATE TABLE dedup_customer (
  customer_code TEXT, email TEXT, updated_at TEXT, source_row_id INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "dedup_customer holds exactly three rows — one per customer_code",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dedup_customer) <> 3`,
      },
      {
        suite: "tiebreak",
        name: "C1 kept the higher source_row_id (3) of the two date-tied rows",
        sql: `SELECT 1 WHERE COALESCE((SELECT source_row_id FROM dedup_customer WHERE customer_code = 'C1'), -1) <> 3`,
      },
      {
        suite: "winner",
        name: "C1 kept the latest updated_at",
        sql: `SELECT 1 WHERE COALESCE((SELECT updated_at FROM dedup_customer WHERE customer_code = 'C1'), '~') <> '2026-03-01'`,
      },
      {
        suite: "nulls",
        name: "C2 kept the non-null b2@x.com over the NULL row",
        sql: `SELECT 1 WHERE COALESCE((SELECT email FROM dedup_customer WHERE customer_code = 'C2'), '~') <> 'b2@x.com'`,
      },
      {
        suite: "nulls",
        name: "C3's only row (a NULL timestamp) still survived",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dedup_customer WHERE customer_code = 'C3' AND email = 'c@x.com' AND updated_at IS NULL) <> 1`,
      },
      {
        suite: "dedup",
        name: "no customer_code is duplicated",
        isHidden: true,
        sql: `SELECT customer_code FROM dedup_customer GROUP BY customer_code HAVING COUNT(*) > 1`,
      },
    ],
  }),
}

const idempotentMerge: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-idempotent-merge",
  title: "Idempotent Loads: Upsert & MERGE",
  summary: "Make a re-run produce the same result — no duplicated rows.",
  estimatedMinutes: 26,
  difficulty: "hard",
  skills: [
    "idempotency",
    "INSERT … ON CONFLICT upsert",
    "MERGE concept",
    "unique_key",
    "high-water mark",
  ],
  teach: {
    estimatedMinutes: 10,
    markdown: `## Idempotent loads: run it twice, get the same table

Pipelines fail and get re-run. A backfill reprocesses last week. The same daily file lands twice. If
your loader is a blind \`INSERT\`, every re-run **duplicates rows** — the cardinal data-engineering sin.
A loader is **idempotent** when running it N times leaves the target in the same state as running it
once. The test is blunt, and it's exactly what the Level 4 grader does: **run the script twice, assert
the row count is identical.**

The tool is an **upsert**: insert the row if its key is new, otherwise update the existing row. SQLite
(and Postgres) spell it \`INSERT … ON CONFLICT\`:

\`\`\`sql
INSERT INTO dim_customer (email, name, city)
SELECT email, name, city FROM stg_customer
WHERE true
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  city = excluded.city;
\`\`\`

- **\`ON CONFLICT(email)\`** names the unique key that defines "same row." (\`email\` must have a
  \`UNIQUE\` / \`PRIMARY KEY\` constraint.)
- **\`DO UPDATE SET … = excluded.<col>\`** overwrites with the incoming values; \`excluded\` is the row
  that *would have* been inserted.
- Run it twice: the first run inserts, the second run hits the conflict and updates to the same values
  — **zero new rows.** Idempotent.

Use \`DO NOTHING\` instead of \`DO UPDATE\` when you only want inserts-if-absent and never want to touch
existing rows.

### Incremental loads with a high-water mark

For large sources you don't reprocess everything — you load only rows newer than the last successful
load, tracked as a **high-water mark**:

\`\`\`sql
INSERT INTO fact_events (event_id, payload, event_ts)
SELECT event_id, payload, event_ts
FROM stg_events
WHERE event_ts > (SELECT COALESCE(MAX(event_ts), '1970-01-01') FROM fact_events)
ON CONFLICT(event_id) DO NOTHING;
\`\`\`

The \`WHERE event_ts > MAX(...)\` skips already-loaded rows; the \`ON CONFLICT DO NOTHING\` is the safety
net for overlap at the boundary. Together they're both efficient **and** idempotent. (Whether you use
\`>\` or \`>=\` at the boundary barely matters when \`ON CONFLICT\` is there to absorb any re-seen key.)

### Common pitfalls

- **No unique constraint = no conflict = duplicates.** \`ON CONFLICT(email)\` only fires if \`email\` is
  actually declared \`UNIQUE\` / \`PRIMARY KEY\`. Without the constraint, the insert just appends.
  Idempotency is enforced by the **schema**, not the query.
- **\`INSERT … SELECT … ON CONFLICT\` parse quirk:** SQLite needs a \`WHERE\` (use \`WHERE true\` if you
  have no real filter) before \`ON CONFLICT\` when the source is a \`SELECT\`, to disambiguate the
  grammar. A bare \`INSERT … SELECT … ON CONFLICT …\` can fail to parse.
- **Upserting the wrong key.** Conflict on a non-business column (e.g. a surrogate key) never matches
  the natural duplicate, so re-runs still duplicate. Conflict on the **natural / business key**.

> **In the warehouse:** Snowflake / BigQuery / SQL Server use
> \`MERGE INTO target USING source ON <key> WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT\`.
> SQLite / Postgres use \`INSERT … ON CONFLICT\`. Same idea, different keyword — and interviewers expect
> you to name both.

**Recap:** an idempotent loader survives re-runs without duplicating rows; achieve it with
\`INSERT … ON CONFLICT(<business key>) DO UPDATE / DO NOTHING\` backed by a real \`UNIQUE\` constraint,
optionally scoped by a high-water-mark \`WHERE\`, and prove it with the "run twice, same count" test
(warehouses spell the same operation \`MERGE\`).

**Execution mode:** you write a multi-statement script. It runs against a fresh seeded SQLite DB, then
hidden assertion queries check the row count and the merged values, and the grader **re-runs your whole
script** to confirm the row count doesn't move.`,
  },
  apply: scriptExercise({
    id: "sql-l4-idempotent-merge-apply",
    prompt: `Convert a blind \`INSERT\` into an **\`INSERT … ON CONFLICT\` upsert** keyed on a unique
column. \`dim_product\` already exists with \`sku\` declared \`UNIQUE\` and two rows in it; \`stg_product\`
holds a fresh extract (already seeded). Load \`stg_product\` into \`dim_product\` so that:

- a **new** SKU (\`SKU3\`) is inserted,
- an **existing** SKU (\`SKU1\`) updates its \`name\` and \`price\`,
- \`SKU2\` (not in the extract) is left untouched,
- and **re-running the load adds no rows** — the table stays at exactly 3.

Do it with a single \`INSERT … SELECT … ON CONFLICT(sku) DO UPDATE\`.`,
    starterCode: `-- dim_product (sku UNIQUE) and stg_product are already seeded.
-- Upsert the staging extract into dim_product so re-runs never duplicate.

-- INSERT INTO dim_product (sku, name, price)
-- SELECT sku, name, price FROM stg_product
-- WHERE true
-- ON CONFLICT(sku) DO UPDATE SET ... ;`,
    hints: [
      "`INSERT INTO dim_product (sku,name,price) SELECT sku,name,price FROM stg_product WHERE true ON CONFLICT(sku) DO UPDATE SET name = excluded.name, price = excluded.price;`",
      "The `WHERE true` before `ON CONFLICT` is required with a `SELECT` source in SQLite.",
      "`excluded.name` / `excluded.price` are the incoming staging values that would have been inserted.",
    ],
    referenceSolution: `INSERT INTO dim_product (sku, name, price)
SELECT sku, name, price FROM stg_product
WHERE true
ON CONFLICT(sku) DO UPDATE SET
  name  = excluded.name,
  price = excluded.price;`,
    seedSql: `DROP TABLE IF EXISTS dim_product;
DROP TABLE IF EXISTS stg_product;

CREATE TABLE dim_product (
  product_key INTEGER PRIMARY KEY,
  sku   TEXT UNIQUE NOT NULL,
  name  TEXT,
  price INTEGER
);
INSERT INTO dim_product (sku, name, price) VALUES
  ('SKU1','Widget',10),
  ('SKU2','Gadget',20);

CREATE TABLE stg_product (sku TEXT, name TEXT, price INTEGER);
INSERT INTO stg_product VALUES
  ('SKU1','Widget Pro',12),
  ('SKU3','Gizmo',30);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "dim_product holds exactly 3 rows after the upsert",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_product) <> 3`,
      },
      {
        suite: "insert",
        name: "the new SKU3 was inserted with its staging values",
        sql: `SELECT 1 WHERE COALESCE((SELECT name FROM dim_product WHERE sku = 'SKU3'), '~') <> 'Gizmo'
          OR COALESCE((SELECT price FROM dim_product WHERE sku = 'SKU3'), -1) <> 30`,
      },
      {
        suite: "untouched",
        name: "SKU2 (absent from the extract) was left unchanged",
        sql: `SELECT 1 WHERE COALESCE((SELECT name FROM dim_product WHERE sku = 'SKU2'), '~') <> 'Gadget'
          OR COALESCE((SELECT price FROM dim_product WHERE sku = 'SKU2'), -1) <> 20`,
      },
      {
        suite: "update",
        name: "the existing SKU1 was updated to the incoming name/price",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT name FROM dim_product WHERE sku = 'SKU1'), '~') <> 'Widget Pro'
          OR COALESCE((SELECT price FROM dim_product WHERE sku = 'SKU1'), -1) <> 12`,
      },
      {
        suite: "dedup",
        name: "no sku appears twice",
        isHidden: true,
        sql: `SELECT sku FROM dim_product GROUP BY sku HAVING COUNT(*) > 1`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-idempotent-merge-practice",
    prompt: `Write an **incremental upsert loader** and prove idempotency. \`fact_events\` accumulates
events keyed by a unique \`event_id\`; \`stg_events\` is a fresh extract (both seeded). The extract
**overlaps** already-loaded data (it repeats \`e2\`), contains a **duplicate \`event_id\` within itself**
(\`e3\` appears twice with different \`ingested_at\`), and brings genuinely new events (\`e3\`, \`e4\`).

In one \`INSERT … SELECT … ON CONFLICT\` load:

1. **dedup the extract** so each \`event_id\` appears once, keeping the row with the **latest**
   \`ingested_at\`;
2. apply a **high-water mark** on \`event_ts\` so you don't reprocess old rows;
3. **upsert on \`event_id\`** so overlap at the boundary updates in place instead of duplicating.

After one run \`fact_events\` must hold \`e1, e2, e3, e4\` (4 rows), \`e3\`'s payload must be the
later-ingested \`{"a":3b}\`, and **running the whole script twice must still leave 4 rows** with the same
\`e3\` payload.`,
    starterCode: `-- fact_events (PK event_id) and stg_events are already seeded.
-- Load the extract idempotently: dedup -> high-water mark -> upsert on event_id.

-- INSERT INTO fact_events (event_id, payload, event_ts, ingested_at)
-- SELECT event_id, payload, event_ts, ingested_at
-- FROM (
--   SELECT ..., ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY ingested_at DESC, payload DESC) AS rn
--   FROM stg_events
-- ) d
-- WHERE d.rn = 1
--   AND d.event_ts >= (SELECT COALESCE(MAX(event_ts), '1970-01-01') FROM fact_events)
-- ON CONFLICT(event_id) DO UPDATE SET ... ;`,
    hints: [
      "Dedup the extract first with `ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY ingested_at DESC, payload DESC)` and keep `rn = 1` (the dedup pattern from Module 4.4).",
      "High-water mark: `WHERE d.event_ts >= (SELECT COALESCE(MAX(event_ts),'1970-01-01') FROM fact_events)`. You can't filter a window function in `WHERE`, so put the `ROW_NUMBER()` in a subquery and filter its `rn` outside — the same subquery is the natural place for the high-water filter.",
      "Upsert on the PK: `ON CONFLICT(event_id) DO UPDATE SET payload = excluded.payload, event_ts = excluded.event_ts, ingested_at = excluded.ingested_at`.",
      "Idempotency trap: on run #2 the high-water mark has risen to the newest event_ts, so almost everything is filtered out; whatever still slips through hits `ON CONFLICT` and updates in place — never inserts. That's what keeps the row count at 4.",
    ],
    seedSql: `DROP TABLE IF EXISTS fact_events;
DROP TABLE IF EXISTS stg_events;

CREATE TABLE fact_events (
  event_id    TEXT PRIMARY KEY,
  payload     TEXT,
  event_ts    TEXT,
  ingested_at TEXT
);
INSERT INTO fact_events (event_id, payload, event_ts, ingested_at) VALUES
  ('e1','{"a":1}','2026-03-01','2026-03-01'),
  ('e2','{"a":2}','2026-03-02','2026-03-02');

CREATE TABLE stg_events (
  event_id    TEXT,
  payload     TEXT,
  event_ts    TEXT,
  ingested_at TEXT
);
INSERT INTO stg_events VALUES
  ('e2','{"a":2}','2026-03-02','2026-03-02'),
  ('e3','{"a":3}','2026-03-03','2026-03-03'),
  ('e3','{"a":3b}','2026-03-03','2026-03-04'),
  ('e4','{"a":4}','2026-03-04','2026-03-04');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "fact_events holds exactly 4 rows after the load",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM fact_events) <> 4`,
      },
      {
        suite: "coverage",
        name: "e1, e2, e3 and e4 are all present",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM fact_events WHERE event_id IN ('e1','e2','e3','e4')) <> 4`,
      },
      {
        suite: "untouched",
        name: "already-loaded e2 was not duplicated or corrupted",
        sql: `SELECT 1 WHERE COALESCE((SELECT payload FROM fact_events WHERE event_id = 'e2'), '~') <> '{"a":2}'`,
      },
      {
        suite: "dedup",
        name: 'e3 kept the later-ingested payload {"a":3b}',
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT payload FROM fact_events WHERE event_id = 'e3'), '~') <> '{"a":3b}'`,
      },
      {
        suite: "unique",
        name: "no event_id appears more than once",
        isHidden: true,
        sql: `SELECT event_id FROM fact_events GROUP BY event_id HAVING COUNT(*) > 1`,
      },
    ],
  }),
}

export const sqlLevel4: SqlLevel = {
  id: 4,
  slug: "engineering",
  title: "Level 4 — Data Engineering with SQL",
  tagline:
    "Window functions, recursive CTEs, SCD, idempotent merge, data-quality — warehouse transforms.",
  defaultExecutionMode: "workspace",
  estimatedHours: 8,
  modules: [
    {
      id: "sql-l4-windows",
      title: "Module 4.1 — Analytical SQL: Window Functions",
      description:
        "Compute across related rows without collapsing them: ranking, period-over-period offsets, and running-total frames.",
      lessons: [windowRanking, windowOffset, windowFrames],
    },
    {
      id: "sql-l4-recursive",
      title: "Module 4.2 — Recursive CTEs",
      description:
        "Walk self-referencing hierarchies (org charts, category trees) to produce depth and breadcrumb paths.",
      lessons: [recursiveCte],
    },
    {
      id: "sql-l4-warehouse-history",
      title: "Module 4.3 — Warehouse Modeling and History",
      description:
        "Load a star schema and track change over time: surrogate keys, then SCD Type 1 overwrite and Type 2 history.",
      lessons: [starBuild, scdType1, scdType2],
    },
    {
      id: "sql-l4-correctness",
      title: "Module 4.4 — Pipeline Correctness",
      description:
        "The habits that separate a junior script from a production loader: deduplication and idempotent upsert/merge.",
      lessons: [dedup, idempotentMerge],
    },
  ],
}

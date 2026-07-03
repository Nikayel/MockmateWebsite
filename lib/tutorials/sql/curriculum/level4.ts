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
  ],
}

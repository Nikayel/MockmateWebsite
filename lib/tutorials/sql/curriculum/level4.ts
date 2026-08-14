import type { SqlLevel } from "@/lib/tutorials/types"
import { scriptExercise } from "./script-exercise"
import { sqlWindowOffsetDrills, sqlWindowRankingDrills } from "./extra-practice"

const windowRanking: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-window-ranking",
  title: "Ranking: ROW_NUMBER, RANK, DENSE_RANK",
  summary: "Rank rows within a partition without collapsing them.",
  estimatedMinutes: 26,
  difficulty: "medium",
  skills: ["OVER", "PARTITION BY", "ORDER BY", "ROW_NUMBER", "RANK", "DENSE_RANK", "tie handling"],
  teach: {
    estimatedMinutes: 13,
    markdown: `## Window functions keep every row

You just loaded a \`fact_sales\` table and product wants a "top 3 products per category" mart. Your
first instinct, \`GROUP BY category ORDER BY revenue DESC LIMIT 3\`, gives you the top 3 for **one**
category, not per category. The moment you need "top N *within each group*" or "the latest row *per
key*," you've hit the wall that window functions were invented to knock down.

A **window function** runs a calculation over a "window" of rows defined relative to the current row,
and, crucially, **keeps every input row**. \`GROUP BY category\` returns one row per category;
\`ROW_NUMBER() OVER (PARTITION BY category …)\` returns *every* product row, each tagged with its rank
inside its category. You keep the detail *and* get the ranking.

The three ranking functions differ only in how they treat **ties**, and this exact distinction is a
classic interview question.

### A worked example

Seed a tiny \`product_revenue\` table and rank within each category with all three functions. You can
run this exact example yourself. The input table, the query, and its live output render at the
bottom of this reading.

For the \`audio\` category (two products tied at 500), ranking by \`revenue DESC\` produces the classic
contrast. ROW_NUMBER adds \`, product\` as a tiebreaker so its unique numbering is deterministic; RANK
and DENSE_RANK order by revenue alone, so the tied rows stay peers and share a rank:

| product | revenue | rn (ROW_NUMBER) | rnk (RANK) | dense (DENSE_RANK) |
|---|---|---|---|---|
| Earbuds | 500 | 1 | 1 | 1 |
| Headphones | 500 | 2 | 1 | 1 |
| Speaker | 300 | 3 | **3** | **2** |
| Cable | 100 | 4 | 4 | 3 |

Read the tie row carefully. This **is** the exam question:

- **ROW_NUMBER** -> \`1, 2, 3, 4\`. Always unique. With a tiebreaker it is deterministic; **without one
  it breaks ties arbitrarily**. Use it when you must pick exactly one row ("the latest record per
  customer").
- **RANK** -> \`1, 1, 3, 4\`. Ties share a rank, then it **skips** (no rank 2). Use it for "Olympic"
  standings where a shared gold means no silver.
- **DENSE_RANK** -> \`1, 1, 2, 3\`. Ties share a rank, then it **does not skip**. Use it for "distinct
  tiers" ("what is the 2nd-highest distinct revenue?").

### PARTITION BY: slice, do not collapse

\`PARTITION BY\` is what makes a window "per group," and it is the clause learners most often underuse. Put it next to \`GROUP BY\` on the *same* six-row \`product_revenue\` table and the difference is the whole reason window functions exist:

| approach | rows returned | the Headphones row |
|---|---|---|
| \`GROUP BY category\` (one \`SUM\`) | 2 (audio 1400, video 1300) | folded into the audio total |
| \`OVER (PARTITION BY category ...)\` | 6 (every product) | kept, tagged with its rank |

\`GROUP BY\` folds each group down to one summary row. \`PARTITION BY\` slices the rows into groups, ranks *inside* each slice, and hands every original row back:

\`\`\`
PARTITION BY category slices the rows, then ranks inside each slice:

  audio
    Earbuds      500   ->  rn 1     the counter starts at 1
    Headphones   500   ->  rn 2
    Speaker      300   ->  rn 3
    Cable        100   ->  rn 4
  video
    Monitor      900   ->  rn 1     the counter RESTARTS at 1
    Webcam       400   ->  rn 2
\`\`\`

\`PARTITION BY\` is **optional**. Omit it and the whole result set is one window, so the same data ranks 1 through 6 straight through instead of restarting per category. Here it is both ways at once, which shows the partition is the only thing that re-scopes the counter:

| product | revenue | global rn | per-category rn |
|---|---|---|---|
| Monitor | 900 | 1 | 1 (video) |
| Earbuds | 500 | 2 | 1 (audio) |
| Headphones | 500 | 3 | 2 (audio) |
| Webcam | 400 | 4 | 2 (video) |
| Speaker | 300 | 5 | 3 (audio) |
| Cable | 100 | 6 | 4 (audio) |

Webcam is number 4 globally but number 2 inside \`video\`. Only the \`PARTITION BY\` changed.

### Anatomy of the OVER clause

\`\`\`
ROW_NUMBER() OVER ( PARTITION BY category   ORDER BY revenue DESC )
                    └── reset per group ──┘  └── order within window ──┘
\`\`\`

- **PARTITION BY** slices the data into independent groups; the ranking restarts at 1 for each. Omit
  it and the whole result set is one window.
- **ORDER BY** inside \`OVER\` decides what "first" means, and it is **separate** from the query's outer
  \`ORDER BY\`, which only controls display order.

The two \`ORDER BY\`s really are independent. Here the window is ordered by revenue but the rows print by product name, so the numbering looks scrambled until you read what it means:

\`\`\`sql
SELECT product, revenue,
  ROW_NUMBER() OVER (ORDER BY revenue DESC, product) AS rn  -- window order: revenue
FROM product_revenue
ORDER BY product;                                            -- display order: name
\`\`\`

| product | revenue | rn |
|---|---|---|
| Cable | 100 | 6 |
| Earbuds | 500 | 2 |
| Headphones | 500 | 3 |
| Monitor | 900 | 1 |
| Speaker | 300 | 5 |
| Webcam | 400 | 4 |

\`rn\` is assigned by revenue; the rows just happen to print alphabetically. Change the outer \`ORDER BY\` and \`rn\` does not move, only the row order on screen does.

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
  \`ORDER BY updated_at DESC, id DESC\`) so the result is deterministic. Graders and idempotency
  checks depend on this.
- **Readability:** name the ranked subquery (\`ranked\`, \`numbered\`) and lift the window into a CTE
  when the query grows.

> **In the warehouse:** Snowflake and BigQuery let you skip the subquery with
> \`QUALIFY ROW_NUMBER() OVER (...) = 1\`. SQLite and Postgres have no \`QUALIFY\`, so you must wrap in a
> subquery/CTE. The \`ROW_NUMBER\` / \`RANK\` / \`DENSE_RANK\` semantics are identical everywhere.

### One boundary, three effects

\`PARTITION BY\` does not just reset a rank counter. It resets the entire window universe, and the same boundary returns in every window feature this level:

| feature | at each new partition |
|---|---|
| \`ROW_NUMBER\` / \`RANK\` / \`DENSE_RANK\` | the counter restarts at 1 |
| \`LAG\` / \`LEAD\` | returns \`NULL\` (no neighbor exists across the boundary) |
| \`SUM(...) OVER (... ROWS UNBOUNDED PRECEDING ...)\` | the running total restarts from 0 |

\`GROUP BY\` and \`PARTITION BY\` are not rivals either; they compose. The apply exercise below aggregates first (a \`GROUP BY\` per product) and then ranks over that result (a \`PARTITION BY\`), a two-step you will reuse constantly.

### Two shortcuts worth knowing

- **\`NTILE(n)\` splits a partition into \`n\` as-equal-as-possible buckets**, ordered by the window's \`ORDER BY\`. \`NTILE(4) OVER (PARTITION BY category ORDER BY revenue DESC, product)\` cuts each category into revenue quartiles, bucket 1 being the top quarter. When the rows do not divide evenly the earlier buckets take the extra row. This is the tool for "top 25% of customers by spend."
- **A named \`WINDOW\` clause removes repetition** when several functions share one spec. Define it once, reference it by name:

\`\`\`sql
SELECT category, product, revenue,
  ROW_NUMBER() OVER w AS rn,
  NTILE(4)     OVER w AS quartile
FROM product_revenue
WINDOW w AS (PARTITION BY category ORDER BY revenue DESC, product);
\`\`\`

**Recap:** \`ROW_NUMBER\` = unique \`1,2,3\` (pick one); \`RANK\` = \`1,1,3\` (ties skip);
\`DENSE_RANK\` = \`1,1,2\` (ties don't skip). All keep every row, all reset per \`PARTITION BY\`.

**Execution mode:** you write a multi-statement script. It runs against a fresh in-memory SQLite DB,
then hidden assertion queries check the ranks, tie handling, and row counts. Lead your load with
\`DELETE FROM <target>;\` so a re-run doesn't double the rows.`,
    demoCode: `SELECT
  category, product, revenue,
  -- ROW_NUMBER gets a tiebreaker so its unique numbering is deterministic.
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, product) AS rn,
  -- RANK / DENSE_RANK order by revenue ALONE, so tied revenues stay peers and share a rank.
  RANK()       OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk,
  DENSE_RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS dense
FROM product_revenue
ORDER BY category, revenue DESC, product;`,
    demoSeedSql: `CREATE TABLE product_revenue (
  category TEXT,
  product  TEXT,
  revenue  INTEGER
);
INSERT INTO product_revenue VALUES
  ('audio', 'Headphones', 500),
  ('audio', 'Earbuds',    500),
  ('audio', 'Speaker',    300),
  ('audio', 'Cable',      100),
  ('video', 'Monitor',    900),
  ('video', 'Webcam',     400);`,
    showDemoInput: true,
  },
  apply: scriptExercise({
    id: "sql-l4-window-ranking-apply",
    prompt: `Write a script that populates the pre-created \`top_products(category, product, revenue,
rank_in_category)\` table with the **three highest-revenue products in each category**, one row per
product. \`revenue\` is that product's total revenue (sum its \`fact_sales\` rows per
\`(category, product)\`) and \`rank_in_category\` is its 1-based slot within the category ordered by
revenue descending. Rank with the function that assigns **unique slot numbers** (so exactly three rows
survive per category) and keep the rows whose slot is \`<= 3\`.

The target table is seeded **empty**. Lead your load with \`DELETE FROM top_products;\` so the script
is safe to re-run.`,
    starterCode: `-- fact_sales and the (empty) top_products table are already seeded.
-- Populate top_products with the top 3 products per category.
DELETE FROM top_products;   -- re-runnable: clear before you repopulate

-- INSERT INTO top_products (category, product, revenue, rank_in_category)
-- First total each product's revenue within its category.
-- Then give each product a 1-based slot per category, highest revenue first, and keep each category's top three.`,
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
  else \`0\`, so genuinely tied products **all** make the podium, unlike a strict slot cutoff.

Then keep **only** rows where \`is_podium = 1\`.

Note: some products (like \`Headphones\`) appear on **several** fact rows. Aggregate to per-product
totals first, and carry \`MIN(sold_at)\` as the date tiebreaker. The target table is seeded empty; lead
your load with \`DELETE FROM leaderboard;\` so the script re-runs cleanly.`,
    starterCode: `-- fact_sales (with sold_at) and the (empty) leaderboard table are already seeded.
DELETE FROM leaderboard;   -- re-runnable: clear before you repopulate

-- INSERT INTO leaderboard (category, product, revenue, row_rank, rank_rank, dense_rank, is_podium)
-- 1) collapse to one row per product per category, carrying its total revenue and earliest sale date.
-- 2) within each category, order by revenue and fill the three ranking columns the prompt describes.
-- 3) set is_podium from whether the product falls in the top three revenue tiers.
-- 4) keep only the podium rows.`,
    hints: [
      "Aggregate to per-product totals first, but carry `MIN(sold_at) AS first_sold` so you have a deterministic date tiebreaker.",
      "Compute all three ranking functions in the same CTE over the same `PARTITION BY category ORDER BY revenue DESC`; only the `ROW_NUMBER` needs the extra `, first_sold, product` tiebreaker.",
      "`is_podium` is derived from `dense_rank`: compute the ranks in one CTE, then `CASE WHEN dense_rank <= 3 THEN 1 ELSE 0 END` in the next.",
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
  extraPractice: sqlWindowRankingDrills,
}

const windowOffset: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-window-offset",
  title: "LAG and LEAD: Period-over-Period",
  summary: "Compare each row to its neighbor without a self-join.",
  estimatedMinutes: 21,
  difficulty: "medium",
  skills: ["LAG", "LEAD", "offset windows", "deltas", "growth rates"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## Compare a row to its neighbor without a self-join

"Month-over-month revenue change" and "days since a customer's previous order" are two of the most-requested analytics metrics, and the naive approach is a self-join: join the table to itself on \`month = month - 1\`. That works, but it is verbose, scans the table twice, and silently breaks when a period is missing. \`LAG\` and \`LEAD\` express the same idea in one line and one pass.

### The mental model

Think of a window as one ordered filmstrip per group. \`PARTITION BY customer_id\` splits rows into a separate strip per customer, and \`ORDER BY order_month\` decides which frame comes "before" and "after." \`LAG(col, n)\` reads \`col\` from the frame \`n\` positions back (default \`n = 1\`); \`LEAD(col, n)\` reads \`n\` positions forward. Nothing is joined. Each row just peeks at a neighbor inside its own ordered strip.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "order_month",
    "revenue",
    "prev (LAG)",
    "next (LEAD)"
  ],
  "rows": [
    [
      "2024-01",
      100,
      null,
      150
    ],
    [
      "2024-02",
      150,
      100,
      90
    ],
    [
      "2024-04",
      90,
      150,
      null
    ]
  ],
  "highlightCols": [
    "prev (LAG)",
    "next (LEAD)"
  ],
  "caption": "Customer 1's ordered strip. LAG reads one row back, LEAD one row forward. Note March is missing: April's LAG is February (150), because LAG is positional in the result, never calendar-aware."
}
\`\`\`

\`\`\`sql
SELECT
  customer_id,
  order_month,
  revenue,
  LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS prev_revenue,
  revenue - LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS mom_delta
FROM monthly_revenue;

-- customer_id | order_month | revenue | prev_revenue | mom_delta
--      1       |  2024-01    |   100   |    NULL      |   NULL
--      1       |  2024-02    |   150   |    100       |    50
--      1       |  2024-04    |    90   |    150       |   -60
\`\`\`

A customer's first month has no earlier frame, so \`LAG\` returns \`NULL\` and the delta is \`NULL\`. That is a real "no prior period" signal, not a bug. To substitute a value, pass a third argument: \`LAG(revenue, 1, 0)\` yields \`0\` instead of \`NULL\`.

Notice the last row. March is missing, so April's \`LAG\` returns February (\`150\`), not "one calendar month back." \`LAG\` is positional in the result, never calendar-aware.

### Pitfalls

- **No \`ORDER BY\` means a meaningless offset.** Without it the window has no defined order, so "previous" is arbitrary. Always order by your time key.
- **Gaps are positional.** If a month is missing, \`LAG\` still returns the previous *row*, not the previous *calendar month*. When you need strict calendar adjacency, left-join onto a dense date spine (\`dim_date\`) first so every month exists.
- **Percent-change division.** \`pct_change = (revenue - prev_revenue) * 100.0 / prev_revenue\` breaks two ways: it is \`NULL\` when \`prev_revenue\` is \`NULL\`, and dividing by \`0\` raises an error in Postgres and most warehouses (SQLite quietly returns \`NULL\`). Guard with \`NULLIF(prev_revenue, 0)\`, and keep the \`100.0\` so integer division does not truncate the result to a whole number.

To flag a customer's **most recent** month, check whether the row has no successor. \`LEAD(order_month) OVER (PARTITION BY customer_id ORDER BY order_month) IS NULL\` is true only on the last frame of each strip.

**Interview nuance:** window functions are computed after \`WHERE\`, \`GROUP BY\`, and \`HAVING\` have run, as part of evaluating the \`SELECT\` list. You therefore cannot filter on \`LAG\`/\`LEAD\` (or reference their aliases) in a \`WHERE\` or \`HAVING\` clause at the same query level. Wrap the window query in a CTE or subquery, then filter or flag on its output. That evaluation order is the single most common thing interviewers probe about window functions.

> **In the warehouse this differs.** Snowflake lets \`LAG\` / \`LEAD\` / \`FIRST_VALUE\` skip nulls with \`IGNORE NULLS\`, the usual "carry the last non-null value forward" trick, and Oracle and BigQuery accept \`IGNORE NULLS\` on \`FIRST_VALUE\` / \`LAST_VALUE\`. BigQuery's \`LAG\` / \`LEAD\` do not take it, though, so don't assume the clause is portable across every function. SQLite and Postgres have no \`IGNORE NULLS\` at all; writing it is a bare \`syntax error near "NULLS"\`. Carry the value forward with a correlated subquery instead:

\`\`\`sql
-- Warehouses: LAG(status) IGNORE NULLS OVER (PARTITION BY id ORDER BY ts)
-- Portable: the most recent non-null status at or before this row.
SELECT id, ts, status,
  (SELECT s2.status FROM events s2
   WHERE s2.id = e.id AND s2.ts <= e.ts AND s2.status IS NOT NULL
   ORDER BY s2.ts DESC LIMIT 1) AS status_filled
FROM events e;
\`\`\`

This lesson runs a multi-statement script against a fresh in-memory SQLite database, then hidden queries check your offsets, deltas, and row count. Lead your load with \`DELETE FROM <target>;\` so a re-run does not stack duplicate rows.`,
  },
  apply: scriptExercise({
    id: "sql-l4-window-offset-apply",
    prompt: `From \`monthly_revenue\`, compute each customer's **month-over-month revenue delta**. Write
to the pre-created \`mom(customer_id, order_month, revenue, prev_revenue, mom_delta)\` table, where
\`prev_revenue\` is the prior month's revenue for that customer (NULL for their first month) and
\`mom_delta = revenue - prev_revenue\`.

The target is seeded **empty**. Lead your load with \`DELETE FROM mom;\` so the script re-runs cleanly.`,
    starterCode: `-- monthly_revenue and the (empty) mom table are already seeded.
DELETE FROM mom;   -- re-runnable: clear before you repopulate

-- INSERT INTO mom (customer_id, order_month, revenue, prev_revenue, mom_delta)
-- For each row, carry the same customer's prior-month revenue as prev_revenue, then mom_delta = revenue - prev_revenue.
-- FROM monthly_revenue;`,
    hints: [
      "`LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month)` is the whole trick.",
      "Because `order_month` is `'YYYY-MM'` text, it sorts chronologically as text (no casting needed).",
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
-- Stage 1: for each row, pull the same customer's prior-month revenue and mark that customer's most recent month.
-- Stage 2: turn prior-month revenue into the signed percent change, guarding a zero or missing prior month and keeping one decimal.
-- Finally, flag a row only when it is the customer's latest month and its percent change is a drop of more than 30%.`,
    hints: [
      "`pct_change = ROUND((revenue - prev_revenue) * 100.0 / NULLIF(prev_revenue, 0), 1)`: the `100.0` forces real division and `NULLIF` guards a zero prior month.",
      '"Latest month per customer" needs a second window: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_month DESC) = 1` marks it.',
      "Stage it in two CTEs: compute prev_revenue and the latest-month marker in the first, derive pct_change from prev_revenue in the second, then `churn_flag = CASE WHEN rn_latest = 1 AND pct_change < -30 THEN 1 ELSE 0 END`. SQLite cannot read an alias from a sibling expression in the same SELECT list, so each layer needs the one below it to be a finished subquery.",
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
  extraPractice: sqlWindowOffsetDrills,
}

const windowFrames: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-window-frames",
  title: "Frames: Running Totals & Moving Averages",
  summary: "Aggregate over a sliding window of rows with a frame clause.",
  estimatedMinutes: 27,
  difficulty: "hard",
  skills: [
    "ROWS BETWEEN",
    "running total",
    "moving average",
    "SUM() OVER () grand total",
    "percent-of-total",
  ],
  teach: {
    estimatedMinutes: 11,
    markdown: `## Why frames earn their keep

"Revenue to date," "7-day moving average," "each row's share of the total": three of the most common analytics asks, and all three are the same tool. A **frame** lets a window aggregate see a *range* of rows around the current one and collapse them into a single value per row, while keeping every original row intact. \`LAG\` peeks at one neighbor. A frame sums or averages a whole sliding stretch, with no self-join and no \`GROUP BY\` that would flatten your row-level detail away.

## The frame is the third piece of \`OVER\`

\`PARTITION BY\` chooses the group, \`ORDER BY\` fixes the sequence inside it, and the frame decides which of those ordered rows the aggregate actually sees for the current row. Bounds run from \`UNBOUNDED PRECEDING\` (start of the partition) through \`n PRECEDING\`, \`CURRENT ROW\`, \`n FOLLOWING\`, to \`UNBOUNDED FOLLOWING\` (end).

\`\`\`sql
SELECT
  order_date, revenue,
  SUM(revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW   -- running total
  ) AS running_total,
  AVG(revenue) OVER (
    ORDER BY order_date
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW           -- current + 2 prior = 3-row avg
  ) AS moving_avg_3,
  ROUND(revenue * 100.0 / SUM(revenue) OVER (), 1) AS pct_of_total  -- empty OVER() = whole set
FROM daily_revenue;
-- order_date  revenue  running_total  moving_avg_3  pct_of_total
-- 2024-01-01      100            100         100.0          16.7
-- 2024-01-02      200            300         150.0          33.3
-- 2024-01-03      300            600         200.0          50.0
\`\`\`

Three shapes, one clause:

- **Running total:** \`ORDER BY\` plus \`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\` accumulates the first row through the current one.
- **Moving average:** \`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW\` is the current row plus the 2 before it (3 rows). Early rows average over fewer rows, and that is correct.
- **Per-group or grand total:** with **no \`ORDER BY\` and no frame**, the aggregate spans the entire partition. \`SUM(revenue) OVER ()\` totals the whole result set, while \`SUM(revenue) OVER (PARTITION BY customer_id)\` totals just that customer. Divide by it for percent-of-total. Add an \`ORDER BY\` and it silently turns into a running total instead.

Scrub the current row down each frame and watch the aggregate recompute. First the running total (the frame grows one row wider each step):

\`\`\`csdiagram
{
  "type": "window-frame",
  "fn": "SUM",
  "frame": "running",
  "rows": [
    { "label": "Jan 1", "value": 100 },
    { "label": "Jan 2", "value": 200 },
    { "label": "Jan 3", "value": 300 }
  ],
  "caption": "Running total: ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW accumulates 100 -> 300 -> 600, one row wider each step."
}
\`\`\`

Then the 3-row moving average (a fixed-width window that slides, so early rows average over fewer rows):

\`\`\`csdiagram
{
  "type": "window-frame",
  "fn": "AVG",
  "frame": "moving-3",
  "rows": [
    { "label": "Jan 1", "value": 100 },
    { "label": "Jan 2", "value": 200 },
    { "label": "Jan 3", "value": 300 }
  ],
  "caption": "3-row moving average: ROWS BETWEEN 2 PRECEDING AND CURRENT ROW gives 100, 150, 200; early rows average over fewer than 3 rows."
}
\`\`\`

To make any of these per-customer, add \`PARTITION BY customer_id\` inside \`OVER\`.

## RANGE vs ROWS: the default frame is a trap

Every running total above spelled out \`ROWS BETWEEN ...\`. That was deliberate. When you put an \`ORDER BY\` on an aggregate window but **omit the frame**, SQL does not leave the window open, it fills in \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`, which is *not* the same as \`ROWS\`. \`ROWS\` counts physical rows; \`RANGE\` pulls in every row **tied** with the current one on the \`ORDER BY\` key. On a date that repeats, that difference is a wrong number hiding in plain sight.

Run the demo below. It seeds a \`daily_sales\` table where two rows share \`2024-01-02\` and totals revenue both ways:

- \`default_range\` is \`SUM(revenue) OVER (ORDER BY sale_date)\` with no frame, so it inherits the \`RANGE\` default.
- \`explicit_rows\` spells out \`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\` and adds \`revenue DESC\` as a tiebreaker so accumulation across the tied rows is deterministic.

Watch the two tied rows: under \`RANGE\` they both jump to the same total (every peer is summed at once), while \`ROWS\` climbs one physical row at a time. For a deterministic row-by-row running total, always write \`ROWS BETWEEN\`.

## The same frame default bites the positional functions

\`FIRST_VALUE\`, \`LAST_VALUE\`, and \`NTH_VALUE\` read a specific row *inside* the frame, so the current-row frame default that a running total relies on quietly makes \`LAST_VALUE\` report the current row instead of the partition's last, until you widen the frame to \`UNBOUNDED FOLLOWING\`. Level 5 teaches that positional-function trap in depth and grades it, so the full deep dive lives there; the running-total frame above is all L4's graded exercises need.

## Pitfalls

- **Integer division zeroes your percentages.** \`revenue / SUM(...)\` on integer columns floors to \`0\`. Multiply by \`100.0\` (a float) first, as above. \`AVG\` already returns a float, so moving averages are safe.
- **\`OVER ()\` is not \`OVER (PARTITION BY customer_id)\`.** The empty version totals everyone. The practice wants each customer's own total, so partition it.
- **You cannot filter a window result in \`WHERE\`.** Windows are computed in \`SELECT\`, after \`WHERE\` runs. Snowflake and BigQuery offer a \`QUALIFY\` clause for this shorthand. Postgres and SQLite have none, so wrap the window in a CTE and filter outside it.

**Execution mode:** these exercises have you write a multi-statement script. Lead with \`DELETE FROM <target>;\` so a re-run stays idempotent, then a single \`INSERT ... SELECT\` carries the window expressions, and hidden assertions check both the frame math and the row count.`,
    demoSeedSql: `CREATE TABLE daily_sales (sale_date TEXT, revenue INTEGER);
INSERT INTO daily_sales VALUES
  ('2024-01-01', 100),
  ('2024-01-02', 200),
  ('2024-01-02', 50),
  ('2024-01-03', 30);`,
    demoCode: `-- The SAME running total two ways. Watch the two 2024-01-02 rows.
-- default_range has no frame, so it inherits the RANGE default and lumps the tied peers.
-- explicit_rows spells out ROWS (with a revenue DESC tiebreaker) and accumulates one row at a time.
SELECT sale_date, revenue,
  SUM(revenue) OVER (ORDER BY sale_date) AS default_range,
  SUM(revenue) OVER (
    ORDER BY sale_date, revenue DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS explicit_rows
FROM daily_sales
ORDER BY sale_date, revenue DESC;`,
    showDemoInput: true,
  },
  apply: scriptExercise({
    id: "sql-l4-window-frames-apply",
    prompt: `Add a **running lifetime-revenue** column per customer. From \`daily_revenue\`, populate \`lifetime(customer_id, order_date, revenue, lifetime_revenue)\` where \`lifetime_revenue\` is the cumulative sum of \`revenue\` for that customer up to and including the current date, ordered by date.

The empty \`lifetime\` target table is created for you. Lead your script with \`DELETE FROM lifetime;\` so a re-run stays idempotent, then fill it with a single \`INSERT … SELECT\` that uses a \`SUM(...) OVER (...)\` running-total frame.`,
    starterCode: `-- daily_revenue is seeded; the empty lifetime target table is created for you.
-- Lead with DELETE so a re-run does not double the rows.
DELETE FROM lifetime;

-- INSERT INTO lifetime (customer_id, order_date, revenue, lifetime_revenue)
-- lifetime_revenue = each customer's revenue accumulated by date, up to and including the current row.
-- FROM daily_revenue;`,
    hints: [
      "`SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`.",
      "Spell out the `ROWS BETWEEN` frame; don't rely on the default.",
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
- \`moving_avg_3\` is the average of the current row and the **2** prior rows (a 3-row window), rounded to 2 decimals (early rows average over fewer rows, and that's correct);
- \`pct_of_total\` is the row's revenue as a **percentage of that customer's overall total revenue** (across all their days), rounded to 1 decimal.

The empty \`trend\` target is created for you. Lead with \`DELETE FROM trend;\` so a re-run stays idempotent, then fill it with a single \`INSERT … SELECT\` carrying three window expressions.`,
    starterCode: `-- daily_revenue is seeded; the empty trend target table is created for you.
-- Lead with DELETE so a re-run does not double the rows.
DELETE FROM trend;

-- INSERT INTO trend (customer_id, order_date, revenue, running_total, moving_avg_3, pct_of_total)
-- Per customer, ordered by date, compute three figures:
--   running_total = revenue accumulated up to and including the current day.
--   moving_avg_3  = average of the current day and the two before it, to 2 decimals.
--   pct_of_total  = the day's revenue as a percent of that customer's overall total, to 1 decimal.
-- FROM daily_revenue;`,
    hints: [
      "Three windows over the same `PARTITION BY customer_id ORDER BY order_date`: running total (`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`), moving avg (`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`), and the per-customer grand total.",
      "The per-customer total is `SUM(revenue) OVER (PARTITION BY customer_id)`: partition but **no** `ORDER BY`/frame, so it spans all of that customer's rows.",
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
    markdown: `## Why you can't just "join N times"

Some tables point at themselves. An \`employees\` row has a \`manager\` that is another \`emp_id\`; a \`categories\` row has a \`parent_id\` that is another \`id\`. That models a tree of unknown depth: \`Electronics > Audio > Headphones > Over-ear\` today, one level deeper tomorrow. To walk it with plain joins you would need one \`JOIN\` per level, but you do not know the level count when you write the query. A **recursive CTE** solves this by applying one query to its own output over and over until it stops producing rows.

## The mental model: anchor, recursive member, working table

Read \`WITH RECURSIVE\` as a loop with three moving parts.

\`\`\`sql
WITH RECURSIVE org AS (
  -- ANCHOR: the seed rows, run once
  SELECT emp_id, name, 0 AS depth
  FROM employees
  WHERE manager IS NULL              -- the CEO(s)

  UNION ALL

  -- RECURSIVE MEMBER: run repeatedly, one level deeper each pass
  SELECT e.emp_id, e.name, o.depth + 1
  FROM employees e
  JOIN org o ON e.manager = o.emp_id
)
SELECT * FROM org ORDER BY depth, emp_id;
-- Ada 0 | Bob 1 | Cy 1 | Di 2 | Fay 2 | Eve 3
\`\`\`

The engine keeps a **working table**. The anchor fills it once. Then each pass runs the recursive member against **only the rows the previous pass produced**, not the whole accumulated result, appends the new rows, and repeats. When a pass yields zero rows (every leaf is reached), the loop stops. That "previous pass only" rule is the whole model: it is why \`depth + 1\` counts levels correctly and why a clean tree terminates on its own.

### Carry values down the recursion

Anything you want per node, compute it in the anchor and thread it through the recursive member. A breadcrumb plus its root ancestor:

\`\`\`sql
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, name AS breadcrumb, name AS root_name, 0 AS depth
  FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.name, c.parent_id,
         t.breadcrumb || ' > ' || c.name,   -- append this level's name
         t.root_name,                        -- copy the root down unchanged
         t.depth + 1
  FROM categories c JOIN tree t ON c.parent_id = t.id
)
SELECT breadcrumb, root_name, depth FROM tree ORDER BY depth, id;
-- Electronics > Audio > Headphones | Electronics | 2
\`\`\`

\`breadcrumb\` grows one segment per level; \`root_name\`, set once in the anchor, rides along untouched.

### Pitfalls

- **Cycles loop forever.** If dirty data has \`A\`'s parent as \`B\` and \`B\`'s parent as \`A\`, no pass ever returns zero rows. SQLite will not rescue you here: it has no default recursion-depth limit, so an unguarded cycle runs until it exhausts memory (in the browser it just freezes the tab). Add your own guard in the recursive member, \`WHERE t.depth < 20\`, so it stops.
- **Join direction decides up vs down.** \`JOIN ... ON c.parent_id = t.id\` walks parents to children (down). Flip it to \`c.id = t.parent_id\` and you climb toward the root instead. Getting this backward is the classic first bug.
- **Use \`UNION ALL\`, not \`UNION\`.** \`UNION\` deduplicates on every pass, which is wasted work on a tree and can hide a cycle you wanted the depth cap to catch.
- **Anchor and recursive member must line up** in column count and order, and each column's type is fixed by the anchor. On strict engines a too-narrow anchor text column truncates the growing \`breadcrumb\`.

**Interview nuance:** a recursive CTE is not "the CTE can read all of its own rows." Each iteration joins against only the immediately preceding iteration's output (the working table), and default evaluation is breadth-first: all of depth 1, then all of depth 2. That semantics is why \`depth\` comes out exact, why the result order without an explicit \`ORDER BY\` is level order rather than \`id\` order, and why an unbounded self-reference on cyclic data never converges.

> **Portability:** Postgres, MySQL, and BigQuery require the \`RECURSIVE\` keyword. SQL Server and Oracle omit it (plain \`WITH cte AS (...)\`). SQLite accepts it either way. Write \`WITH RECURSIVE\` regardless: it is required on the engines that demand it and documents intent on the ones that do not.

**Execution mode:** you write a multi-statement script against a fresh in-memory SQLite database that already holds the source tree plus an empty target table; hidden queries then check depths, breadcrumbs, and row counts. Lead your load with \`DELETE FROM <target>;\` so a re-run stays idempotent.`,
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
-- Seed the walk at the top (the employee with no manager) as depth 0.
-- Then step outward one management level at a time, adding 1 to depth on each hop, until no reports remain.
-- Load emp_id, name, and depth for every employee reached.`,
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
\`categories\` source is seeded and the empty \`category_path\` target already exists. Lead your load
with \`DELETE FROM category_path;\` so a re-run keeps exactly eight rows.`,
    starterCode: `-- categories is already seeded; category_path exists but is empty.
DELETE FROM category_path;   -- keep the load idempotent on re-run

-- INSERT INTO category_path (category_id, name, breadcrumb, depth, root_name)
-- Start at the root categories (no parent) with depth 0 and a breadcrumb of just their own name.
-- Step down one level at a time, extending the breadcrumb with each child's name, adding 1 to depth, and carrying the root's name unchanged.
-- Cap the recursion depth at 20 so a cyclic row cannot loop forever.
-- Load all five columns for every category reached.`,
    hints: [
      "Seed both `breadcrumb` (`= name`) and `root_name` (`= name`) in the anchor so `root_name` propagates down unchanged.",
      "In the recursive member, `breadcrumb = t.breadcrumb || ' > ' || c.name`, but `root_name = t.root_name`: carry the root down, don't recompute it.",
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
        name: "every category landed, exactly eight rows",
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
    markdown: `## Why the fact table loads last

A star schema splits your data into one narrow fact table of measurements (the numbers you sum, like \`amount\` or \`revenue\`) surrounded by \`dim\` tables that describe them. The fact does not store the messy business keys from your source (\`email\`, \`sku\`). It stores a **surrogate key**: a small integer like \`customer_key\` that the warehouse itself mints. That keeps the fact narrow, decouples it from source systems that recycle or reformat their keys, and lets a customer change their email without rewriting a billion fact rows.

That design dictates a strict **load order**. Surrogate keys are born in the dimension, so:

1. Load every dimension first. Each new row gets a surrogate key.
2. Load the fact second. For each staging row, look up the surrogate key by joining on the natural key.

Reverse that and step 2 has nothing to point at. The lookup join is the whole game: it swaps a source \`email\` for a warehouse \`customer_key\`. You never type a surrogate key literally in the fact insert. You always fetch one.

\`\`\`csdiagram
{
  "type": "er",
  "tables": [
    {
      "name": "dim_customer",
      "columns": [
        {
          "name": "customer_key",
          "key": "pk"
        },
        {
          "name": "email"
        },
        {
          "name": "name"
        }
      ]
    },
    {
      "name": "fact_sales",
      "columns": [
        {
          "name": "sale_id",
          "key": "pk"
        },
        {
          "name": "customer_key",
          "key": "fk"
        },
        {
          "name": "amount"
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "fact_sales",
      "to": "dim_customer",
      "kind": "n-1",
      "label": "lookup join on email -> customer_key"
    }
  ],
  "caption": "The surrogate key is minted in dim_customer (the pk), then the fact stores it as a fk. Many fact rows point at one dimension row, which is why the dimension must load first."
}
\`\`\`

### How the surrogate key gets minted

In SQLite, a column declared \`INTEGER PRIMARY KEY\` is an alias for the row's \`rowid\`, so it auto-assigns a sequential integer whenever you omit it from the insert.

\`\`\`sql
-- 1. dimension first: omit customer_key so it auto-assigns; keep the natural key
INSERT INTO dim_customer (email, name)
SELECT DISTINCT email, name FROM stg_customers;

-- 2. fact second: join staging's natural key to the dim to fetch the surrogate key
INSERT INTO fact_sales (customer_key, amount)
SELECT dc.customer_key, s.amount
FROM stg_sales s
JOIN dim_customer dc ON dc.email = s.email;
\`\`\`

With customers \`Ann (a@x.com)\` and \`Bob (b@x.com)\`, \`dim_customer\` gets \`customer_key\` \`1\` and \`2\`. A sale for \`a@x.com\` lands in \`fact_sales\` with \`customer_key = 1\`. The fact never sees the email again.

### Pitfalls

- **Deduplicate on the key alone, not the whole row.** \`SELECT DISTINCT email, name\` dedupes distinct *pairs*. If \`a@x.com\` arrives once as \`Ann\` and once as \`Anne\`, you get two dimension rows for one customer, and the lookup join fans out: one sale becomes two fact rows and your totals inflate. Dedup by the natural key so each customer maps to exactly one surrogate key. \`GROUP BY email\` collapses every row for one email into a single dimension row.
- **Inner join silently drops orphans.** A fact row whose natural key has no dimension match vanishes from an inner join. That is often the correct rule, but verify the dropped count is zero rather than trusting it. An **orphan fact** is a load bug, not a data feature.
- **Re-runnability.** Lead with \`DELETE FROM\` each target so a second run reproduces the same counts instead of doubling the fact. Delete the fact first, then the dimensions, because the fact references them.

**Interview nuance:** each fact row must match exactly one dimension row, and that guarantee lives in the dimension, not the fact query. If a dimension holds duplicate natural keys, the inner join becomes a fan-out that multiplies your measures, so the correctness of \`SUM(revenue)\` depends on the dimension's natural key being unique. Interviewers probe exactly this by asking what happens when a dimension load forgets to dedupe.`,
  },
  apply: scriptExercise({
    id: "sql-l4-star-build-apply",
    prompt: `Load \`dim_customer\` with surrogate keys from staging, then load \`fact_sales\` by looking
those keys up. \`stg_customers(email, name)\` and \`stg_sales(email, amount)\` are seeded; the empty
targets \`dim_customer(customer_key, email, name)\` (surrogate \`customer_key\`) and
\`fact_sales(sale_id, customer_key, amount)\` already exist.

Insert the dimension letting \`customer_key\` auto-assign, then insert the fact by **joining
\`stg_sales\` to \`dim_customer\` on \`email\`** to fetch each \`customer_key\`. Never type a key literally.
Lead with \`DELETE FROM\` both targets so the load survives a re-run.`,
    starterCode: `-- stg_customers and stg_sales are seeded; dim_customer and fact_sales exist (empty).
-- Make the load re-runnable: clear the targets first (fact before dim).
DELETE FROM fact_sales;
DELETE FROM dim_customer;

-- 1. Load the dimension first so each customer earns its surrogate customer_key.
-- INSERT INTO dim_customer (email, name) ... FROM stg_customers;

-- 2. Load the fact second, looking each customer_key up from the dimension by the shared natural key.
-- INSERT INTO fact_sales (customer_key, amount) ...`,
    hints: [
      "Lead with `DELETE FROM fact_sales;` then `DELETE FROM dim_customer;` so a second run doesn't double the rows.",
      "Insert dims with `INSERT INTO dim_customer (email, name) SELECT email, name FROM stg_customers;`. The `customer_key` auto-fills.",
      "Load the fact with a join: `SELECT dc.customer_key, s.amount FROM stg_sales s JOIN dim_customer dc ON dc.email = s.email`.",
      "Don't insert `customer_key` values manually into the fact. Always look them up through the join.",
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

-- 1. Load each dimension with one row per distinct natural key.
-- INSERT INTO dim_customer (email, name)       ... FROM stg_orders;
-- INSERT INTO dim_product  (sku, product_name) ... FROM stg_orders;
-- INSERT INTO dim_date     (full_date)         ... FROM stg_orders;

-- 2. Load the fact, looking up all three surrogate keys from the dimensions by their natural keys.
-- INSERT INTO fact_order_items (customer_key, product_key, date_key, qty, revenue) ...`,
    hints: [
      "Clear the targets first (`DELETE FROM fact_order_items;` then the three dims) so a re-run doesn't double the fact.",
      "Load each dimension with `INSERT … SELECT DISTINCT natural_key, attr FROM stg_orders`; `DISTINCT` collapses the repeated natural keys.",
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
  title: "Slowly Changing Dimensions: Type 1",
  summary: "Overwrite a changed attribute in place with no history.",
  estimatedMinutes: 20,
  difficulty: "medium",
  skills: ["SCD Type 1", "in-place UPDATE", "correction semantics"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Why Type 1 exists

A **dimension** table describes an entity, like a customer or a product, and stores its attributes: \`name\`, \`city\`, \`tier\`. Those attributes drift. A customer moves, a product gets renamed, and someone fat-fingers a city at data entry. The **Slowly Changing Dimension (SCD)** question is simple to state: when an attribute changes, what do you do with the old value?

**Type 1** is the bluntest answer. Overwrite the old value in place and keep no history. You reach for it when the old value was simply **wrong**: a typo, a misspelled city, a value nobody should ever see again. You do not want a durable record of a mistake. You want it corrected everywhere, as if it had always been right.

## The mental model: match on the natural key, overwrite, add no rows

Every dimension row carries two kinds of key. The **surrogate key** (\`customer_key\`) is a stable integer that fact tables join on. The **natural key** (\`email\`) identifies the real-world entity. A Type 1 apply step matches incoming rows to existing ones on the **natural key** and overwrites the changed attributes in place, adding no new row to preserve the old value. The surrogate key never moves, so fact tables keep pointing at the same \`customer_key\` and nothing downstream breaks. A genuinely new customer is still inserted with a fresh key: that is a new row for a new entity, not a second row for a change.

## Worked example

\`\`\`sql
-- dim_customer before         stg_customer (corrected dump)
-- key email          city       email          city
-- 1   ana@shop.com   Sanfran    ana@shop.com   San Francisco
-- 2   ben@shop.com   Austin

UPDATE dim_customer
SET name = (SELECT s.name FROM stg_customer s WHERE s.email = dim_customer.email),
    city = (SELECT s.city FROM stg_customer s WHERE s.email = dim_customer.email)
WHERE email IN (SELECT email FROM stg_customer);

-- dim_customer after:
-- 1   ana@shop.com   San Francisco   <- fixed, same customer_key
-- 2   ben@shop.com   Austin          <- untouched, absent from the dump
\`\`\`

Row count stays at 2, \`customer_key\` 1 is unchanged, and Ben, who is not in the dump, is left alone.

The portable one-statement form is an **upsert**, which the practice uses to overwrite existing customers and insert brand-new ones together:

\`\`\`sql
INSERT INTO dim_customer (email, name, city, tier)
SELECT email, name, city, tier FROM stg_customer
WHERE true
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  city = excluded.city,
  tier = excluded.tier;
\`\`\`

\`excluded\` is the row that would have been inserted. On a key collision SQLite runs the \`DO UPDATE\` branch instead. This requires a \`UNIQUE\` index on \`email\`.

## Pitfalls

- **Drop the \`WHERE ... IN\` guard and you nuke everyone.** In the correlated \`UPDATE\`, a customer absent from the dump has a subquery that returns nothing, so \`city\` is set to \`NULL\`. The guard restricts the update to emails that actually exist in staging.
- **The \`WHERE true\` before \`ON CONFLICT\` is not decoration.** In \`INSERT ... SELECT ... ON CONFLICT\`, SQLite's parser can misread \`ON\` as a join clause. Inserting a \`WHERE\` (even \`WHERE true\`) between the \`SELECT\` and \`ON CONFLICT\` disambiguates it.
- **Type 1 destroys "what was the value on date X."** If finance ever needs the city at the time of sale, Type 1 is the wrong tool and you need **Type 2** (next lesson). Choosing Type 1 is a business decision, not a silent default.

**Interview nuance:** a production apply step must be **idempotent**, because pipelines retry and backfill and will run the same batch twice. Type 1 is idempotent by construction. Overwriting \`city\` with the value it already holds is a no-op, and on the second run the "new" customer already exists, so the upsert takes the \`DO UPDATE\` branch instead of inserting a duplicate. That is exactly why the hidden checks re-run your script and assert the row count did not move.`,
  },
  apply: scriptExercise({
    id: "sql-l4-scd-type1-apply",
    prompt: `Apply a **Type 1 update** to correct a customer's misspelled city. \`dim_customer\` holds the
current dimension; \`stg_customer\` holds a corrected dump. Overwrite \`name\` and \`city\` in
\`dim_customer\` for every email present in the staging dump, adding **no new rows** and leaving the
surrogate \`customer_key\` untouched.`,
    starterCode: `-- dim_customer and stg_customer are already seeded for you.
-- Apply a Type 1 overwrite: match on email, overwrite name + city, add no rows.

-- Pull the corrected name and city from the staging dump for each matching email, overwriting in place.`,
    hints: [
      "A single `UPDATE dim_customer SET … WHERE email IN (SELECT email FROM stg_customer)` does the whole job.",
      "Pull the new `city`/`name` with correlated subqueries matched on `email`.",
      "Don't `INSERT` anything: Type 1 is overwrite-only, so the row count must stay at 2.",
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
    idempotencyTables: ["dim_customer"],
    assertions: [
      {
        suite: "rows",
        name: "no history rows added, dim_customer still holds exactly 2 rows",
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
        name: "surrogate key preserved, a@x.com is still customer_key 1 (overwrite, not delete+reinsert)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT customer_key FROM dim_customer WHERE email = 'a@x.com'), -1) <> 1`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-scd-type1-practice",
    prompt: `Write a **Type 1 apply step** that overwrites changed attributes from a fresh source dump
**and** inserts brand-new customers, leaving exactly **one row per email**. \`dim_customer\` (which now
carries a \`tier\` column) and a \`stg_customer\` dump are already seeded; the dump contains updates to
existing customers **and** a customer not yet in the dimension. Produce a \`dim_customer\` where existing
rows are overwritten in place (keeping their \`customer_key\`) and the new customer is appended with a
fresh key. Re-running your script must leave the row count unchanged.`,
    starterCode: `-- dim_customer (with a tier column) and stg_customer are already seeded.
-- Apply a Type 1 step that OVERWRITES existing customers and INSERTS brand-new ones,
-- leaving exactly one row per email, and idempotent on a re-run.

-- In one statement, overwrite the customers already present and insert the brand-new one, ending with one row per email.`,
    hints: [
      "The clean one-statement form is `INSERT INTO dim_customer (email,name,city,tier) SELECT email,name,city,tier FROM stg_customer WHERE true ON CONFLICT(email) DO UPDATE SET name=excluded.name, city=excluded.city, tier=excluded.tier;`. `email` must be `UNIQUE` (it is).",
      "`excluded.<col>` refers to the row that would have been inserted; that's the new source value.",
      "The `ON CONFLICT` upsert makes this idempotent for free: re-running overwrites with the same values and inserts nothing new. (`INSERT OR REPLACE` would work too, but it deletes+reinserts and so churns the surrogate key, so avoid it.)",
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
    idempotencyTables: ["dim_customer"],
    assertions: [
      {
        suite: "rows",
        name: "one row per email, dim_customer holds exactly 3 rows",
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
        name: "existing surrogate keys stayed stable, a@x.com is still key 1, b@x.com still key 2 (upsert, not a key-churning replace)",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT customer_key FROM dim_customer WHERE email = 'a@x.com'), -1) <> 1
          OR COALESCE((SELECT customer_key FROM dim_customer WHERE email = 'b@x.com'), -1) <> 2`,
      },
    ],
  }),
}

const scdType2: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-scd-type2",
  title: "Slowly Changing Dimensions: Type 2",
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
**as they were on the sale date**: if Ada lived in London in January and Berlin in March, a January
order must stay attributed to London. That requires keeping **history**, and that's **SCD Type 2**:
instead of overwriting, you **expire the old row and insert a new version** with a fresh surrogate key.
The dimension grows one row per change, and each row carries a **validity window**.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "email",
    "city",
    "effective_from",
    "effective_to",
    "is_current"
  ],
  "rows": [
    [
      "a@x.com",
      "London",
      "2026-01-01",
      "2026-03-01",
      0
    ],
    [
      "a@x.com",
      "Berlin",
      "2026-03-01",
      "9999-12-31",
      1
    ]
  ],
  "highlightCols": [
    "effective_from",
    "effective_to",
    "is_current"
  ],
  "caption": "Ada after the London -> Berlin change. The old row is expired (effective_to set to the change date, is_current 0); the new version opens with a fresh window and is_current 1. Exactly one current row per key, and the windows abut so an as-of join matches exactly one version."
}
\`\`\`

Three columns make Type 2 work:

- **\`effective_from\`**: the date this version became true.
- **\`effective_to\`**: the date it stopped being true (a far-future sentinel like \`'9999-12-31'\` while still current).
- **\`is_current\`**: a \`1\`/\`0\` flag; exactly **one** current row per natural key.

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

The \`>= effective_from AND < effective_to\` is the **as-of** predicate: it selects the one version valid
on the sale date. Use a **half-open interval** (\`< effective_to\`, not \`<=\`) so the boundary date belongs
to exactly one version and rows never double-count.

### Detecting a *changed* attribute safely (NULL-aware)

A general apply compares today's dump to the current dimension row and versions only the keys whose
tracked attribute **changed**. The trap: an attribute can go from **NULL to a value** (the city was
unknown at first load, now it's filled in) or from a **value to NULL**. Plain \`<>\` is **not** null-safe:
\`'Madrid' <> NULL\` evaluates to \`NULL\`, not \`TRUE\`, so the changed-set filter drops the row, treats it as
*unchanged*, and **no new version is created**. That's a silently lost history record.

Use a **null-safe** change predicate instead. In SQLite that's the two-operand \`IS\` / \`IS NOT\`, which
compare NULLs as ordinary values: \`'Madrid' IS NOT NULL\` is \`TRUE\`, \`NULL IS NOT NULL\` is \`FALSE\`.

\`\`\`sql
-- WRONG: NULL <-> value transitions are missed (the predicate is NULL, not TRUE)
WHERE stg.city <> dim.city
-- RIGHT: null-safe, catches NULL->value and value->NULL as well as value->value
WHERE stg.city IS NOT dim.city
\`\`\`

> **In the warehouse:** the ANSI spelling is \`a IS DISTINCT FROM b\` (Postgres, Snowflake, BigQuery, and
> SQLite 3.39+ all support it), the same null-safe "did it actually change?" test. dbt snapshots use it
> to pick the rows to version, precisely so a NULL becoming populated still opens a new row. Never write
> raw \`<>\` in SCD change detection.

### Common pitfalls

- **More than one \`is_current = 1\` per key** is the #1 Type 2 bug: it means an update ran the insert
  without expiring the old row, and every downstream \`WHERE is_current = 1\` now doubles. Graders assert
  exactly one current row per key.
- **Overlapping windows** (old row's \`effective_to\` ≠ new row's \`effective_from\`) make the as-of join
  match two versions or none. Set the expiring row's \`effective_to\` **equal** to the new row's \`effective_from\`.
- **Closed intervals double-count.** If both versions include the boundary date (\`<=\`), a sale on that
  exact day joins twice. Always half-open.
- **Expiring on the wrong key.** \`WHERE email = ? AND is_current = 1\`: forgetting \`is_current = 1\`
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
\`2026-03-01\`, Ada's city is Berlin. Apply the Type 2 change: **expire** the London row and **insert** a
Berlin version, so the dimension keeps both the expired London history and the current Berlin version,
with their validity windows meeting exactly.`,
    starterCode: `-- dim_customer already holds Ada's current London row (effective 2026-01-01).
-- Apply the Type 2 change: as of 2026-03-01, Ada's city is Berlin.

-- Step 1: expire the current London row so it is no longer the active version, closing its validity window at the change date.

-- Step 2: open a new Berlin version that is current from the change date forward.`,
    hints: [
      "Two statements: an `UPDATE` to expire, then an `INSERT` for the new version.",
      "Expire with `SET effective_to = '2026-03-01', is_current = 0 WHERE email = 'a@x.com' AND is_current = 1`.",
      "Insert the Berlin row with `effective_from = '2026-03-01'`, `effective_to = '9999-12-31'`, `is_current = 1`.",
      "Set the old `effective_to` equal to the new `effective_from` so the windows are contiguous: no gap, no overlap.",
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
        name: "the two versions meet exactly, no gap, no overlap",
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
Detect "differs" **null-safely**: one customer's city is \`NULL\` in the dimension and set in today's dump,
and a plain \`<>\` would silently miss that transition, so compare with \`stg.city IS NOT dim.city\`.
Customers whose city is **unchanged** get no new row; customers **absent** from today's dump are left
as-is; brand-new emails get a single current version. The step must be **idempotent**: running it twice
must leave \`dim_customer\` byte-for-byte identical.`,
    starterCode: `-- dim_customer holds the current dimension (one is_current = 1 row per email).
-- stg_customer is today's dump, each row carrying a snapshot_date.
-- Apply a GENERAL Type 2 step and make it idempotent (safe to run twice).
--
-- Trap: capture the CHANGED emails FIRST, before you expire or insert, so the
-- insert can't re-detect its own freshly written rows on a second run.

-- Step 1: DROP + CREATE a temp table of the emails whose city changed
--   (compare null-safely so a NULL becoming a value still counts as a change) ...

-- Step 2: expire the current row for those changed emails, closing its window at the snapshot date ...

-- Step 3: open a new current version for each changed email, effective from the snapshot date ...

-- Step 4: insert brand-new emails (present in stg, absent from dim) as one current version ...`,
    hints: [
      "Identify **changed** emails first: join `stg_customer` to the current dimension row (`is_current = 1`) on `email` and keep where the city is null-safely different: `stg.city IS NOT dim.city`. Plain `<>` misses NULL-to-value transitions (`'x' <> NULL` is NULL, not TRUE).",
      "Expire step: `UPDATE dim_customer SET effective_to = <snapshot>, is_current = 0 WHERE is_current = 1 AND email IN (<changed emails>)`.",
      "Insert step: insert new versions for changed emails **and** brand-new emails (emails in staging with no current dim row). Both get `is_current = 1`, `effective_from = snapshot_date`, `effective_to = '9999-12-31'`.",
      "Idempotency is the trap: after the first run the current city already equals staging, so the changed set is empty on the second run. Compare against the **current** row, and compute the changed-set into a temp table first so the insert doesn't re-detect its own new rows.",
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
  ('c@x.com','Cara','Rome', '2026-01-01','9999-12-31',1),
  ('e@x.com','Eve', NULL,   '2026-01-01','9999-12-31',1); -- city unknown at first load

DROP TABLE IF EXISTS stg_customer;
CREATE TABLE stg_customer (email TEXT, name TEXT, city TEXT, snapshot_date TEXT);
INSERT INTO stg_customer VALUES
  ('a@x.com','Ada','Berlin','2026-03-01'),
  ('b@x.com','Ben','Paris', '2026-03-01'),
  ('d@x.com','Dan','Oslo',  '2026-03-01'),
  ('e@x.com','Eve','Madrid','2026-03-01'); -- NULL -> Madrid: plain <> would miss this`,
    checkIdempotency: true,
    idempotencyTables: ["dim_customer"],
    assertions: [
      {
        suite: "current",
        name: "exactly one current (is_current = 1) row per email a, b, c, d, e",
        sql: `SELECT e.email
FROM (SELECT 'a@x.com' AS email UNION SELECT 'b@x.com' UNION SELECT 'c@x.com' UNION SELECT 'd@x.com' UNION SELECT 'e@x.com') e
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
        suite: "nullsafe",
        name: "e@x.com's NULL→Madrid change was detected, now two versions, current = Madrid",
        sql: `SELECT 1 WHERE
  (SELECT COUNT(*) FROM dim_customer WHERE email = 'e@x.com') <> 2
  OR NOT EXISTS (
    SELECT 1 FROM dim_customer
    WHERE email = 'e@x.com' AND is_current = 1 AND city = 'Madrid'
      AND effective_from = '2026-03-01' AND effective_to = '9999-12-31'
  )`,
      },
      {
        suite: "nullsafe",
        name: "e@x.com's NULL-city version was expired at 2026-03-01 (is_current = 0)",
        isHidden: true,
        sql: `SELECT customer_key FROM dim_customer
WHERE email = 'e@x.com' AND city IS NULL
  AND NOT (is_current = 0 AND effective_to = '2026-03-01')`,
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
    markdown: `## Keep exactly one row per business key

Raw feeds arrive dirty. A daily customer dump routinely carries the same \`email\` two or three times: one stale record plus a couple of updates. If you load all of them, every downstream join fans out, \`COUNT(DISTINCT email)\` stops matching \`COUNT(*)\`, and a metric like revenue per customer silently double counts. Deduplication is the gate that guarantees exactly one row per business key before the data lands, and it has to keep the *right* row, usually the most recently updated one.

### The pattern: rank inside, filter outside

The portable move is to number the rows within each key, then keep number one:

\`\`\`sql
SELECT email, name, city, updated_at
FROM (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY email             -- one counter per business key
           ORDER BY updated_at DESC       -- newest row gets rn = 1
         ) AS rn
  FROM stg_customer
) ranked
WHERE rn = 1;
\`\`\`

Read it as a grain change. \`PARTITION BY email\` restarts the counter for every distinct \`email\`; \`ORDER BY updated_at DESC\` decides who counts as "first"; \`WHERE rn = 1\` keeps that single winner. Because \`ROW_NUMBER\` hands out *unique* integers inside each partition, you get exactly one row per key: never zero, never two.

Concretely, three raw rows (two for \`a@x.com\`, one for \`b@x.com\`):

\`\`\`text
email      name    updated_at
a@x.com    Ann     2024-01-01
a@x.com    Ann R.  2024-03-02
b@x.com    Bo      2024-02-10
\`\`\`

collapse to one row per \`email\`, keeping each key's newest \`updated_at\`:

\`\`\`text
email      name    updated_at
a@x.com    Ann R.  2024-03-02
b@x.com    Bo      2024-02-10
\`\`\`

The two \`a@x.com\` rows reduce to the March 2 update; \`b@x.com\` was already unique, so it passes through untouched.

### Pitfalls

- **\`DISTINCT\` is not dedup-by-key.** \`SELECT DISTINCT\` only collapses rows that match on *every* selected column. Two rows with the same \`email\` but a different \`updated_at\` are not identical, so \`DISTINCT\` keeps both. Reach for \`ROW_NUMBER\` whenever "duplicate" means "same key, different attributes."
- **A window function is illegal in \`WHERE\`.** You cannot write \`WHERE ROW_NUMBER() OVER (...) = 1\`, because windows are computed after \`WHERE\` runs. Wrap the window in a subquery or CTE and filter the \`rn\` alias in the outer query.
- **Unbroken ties are nondeterministic.** If two rows share the same \`updated_at\`, the engine may pick either one as \`rn = 1\`, so a rerun can swap winners. Add a tiebreaker: \`ORDER BY updated_at DESC, source_row_id DESC\`. Now the same row wins every run, which is what keeps the load idempotent.
- **\`NULL\` timestamps.** In SQLite \`NULL\` sorts below every real value, so \`ORDER BY updated_at DESC\` naturally pushes missing timestamps to the bottom and any real \`updated_at\` beats a \`NULL\` one. (Postgres defaults the other way under \`DESC\` and needs an explicit \`NULLS LAST\`; SQLite gives you the behavior you want for free.)

> **In the warehouse:** Snowflake and BigQuery let you skip the wrapper with \`QUALIFY ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) = 1\`. SQLite and Postgres have no \`QUALIFY\`, so keep the subquery.

**Interview nuance:** know why it must be \`ROW_NUMBER\` and not \`RANK\` or \`DENSE_RANK\`. On a tie, \`RANK\` and \`DENSE_RANK\` assign the *same* number to both rows, so \`WHERE rank = 1\` returns both and your duplicates come right back. Only \`ROW_NUMBER\` guarantees a strict \`1, 2, 3\` with no repeats, which is exactly the "one row per key" contract dedup depends on.

**Execution mode:** you write a multi-statement script against a pre-created target that may already hold rows from a previous run. Lead with \`DELETE FROM <target>;\`, then insert the deduped rows. The grader runs your script twice and checks the row count is unchanged, so a rerun must not double the data. Hidden assertions then verify the row count, which row won each key, and that zero duplicate keys remain.`,
  },
  apply: scriptExercise({
    id: "sql-l4-dedup-apply",
    prompt: `Reduce a source with duplicate emails to **one latest row per email**. \`stg_customer\`
(already seeded, with an \`updated_at\`) may list the same email several times; write the deduped rows
into \`clean_customer(email, name, city, updated_at)\`, keeping the most recently updated row per email.
**Lead with \`DELETE FROM clean_customer;\`** so re-running the script doesn't double the rows.`,
    starterCode: `-- stg_customer is already seeded. Load one latest row per email into clean_customer.
DELETE FROM clean_customer;

-- Number each email's rows newest-first, then keep only the first row for each email.
-- INSERT INTO clean_customer (email, name, city, updated_at)
-- SELECT that single kept row per email.`,
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
    idempotencyTables: ["clean_customer"],
    assertions: [
      {
        suite: "rows",
        name: "clean_customer holds exactly two rows, one per email",
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

-- Number each customer_code's rows so the latest updated_at wins, breaking ties on the highest source_row_id, then keep the first row per code.
-- INSERT INTO dedup_customer (customer_code, email, updated_at, source_row_id)
-- SELECT that single kept row per customer_code.`,
    hints: [
      "SQLite sorts \`NULL\` as the lowest value, so \`ORDER BY updated_at DESC\` puts every non-null timestamp first and the NULLs last, exactly what you want when a NULL must lose to any real date.",
      "Add the tiebreaker so ties are deterministic: \`ORDER BY updated_at DESC, source_row_id DESC\` keeps the higher \`source_row_id\` when two rows share a date.",
      "\`PARTITION BY customer_code\`, then keep \`rn = 1\` from a wrapping CTE; you can't filter \`ROW_NUMBER()\` in \`WHERE\` directly.",
      "\`C3\` has only a NULL-\`updated_at\` row: \`ROW_NUMBER()\` still assigns it rank 1, so it survives. Don't filter out NULL timestamps.",
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
        name: "dedup_customer holds exactly three rows, one per customer_code",
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
  summary: "Make a re-run produce the same result: no duplicated rows.",
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
your loader is a blind \`INSERT\`, every re-run **duplicates rows**, the cardinal data-engineering sin.
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
- Run it twice: the first run inserts, the second run hits the conflict and updates to the same values:
  **zero new rows.** Idempotent.

Use \`DO NOTHING\` instead of \`DO UPDATE\` when you only want inserts-if-absent and never want to touch
existing rows.

### Incremental loads with a high-water mark

For large sources you don't reprocess everything; you load only rows newer than the last successful
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
\`>\` or \`>=\` at the *exact* boundary barely matters when \`ON CONFLICT\` absorbs any re-seen key, but a
strict cutoff of *either* kind has a subtler failure mode, covered next.)

### Late-arriving data: why a strict high-water mark silently drops rows

A high-water mark of \`MAX(event_ts)\` quietly assumes events arrive **in event-time order**: that once
you've recorded \`2026-03-02\`, nothing older will ever appear again. Real sources violate that
constantly: a mobile client was offline, an upstream queue retried, a partner's nightly file ran a day
late. The event *happened* at \`event_ts = 2026-02-28\`, but it only lands in your source **after** the
load that already advanced the high-water to \`2026-03-02\`. A strict \`WHERE event_ts > high_water\` (or
even \`>=\`) filters that row out on every future run: it is **silently dropped**, and no error is ever
raised.

The fix is a **lookback** (a "safety lag"): reprocess a trailing window instead of a hard cutoff.

\`\`\`sql
INSERT INTO fact_events (event_id, payload, event_ts)
SELECT event_id, payload, event_ts
FROM stg_events
WHERE event_ts >= date(
        (SELECT COALESCE(MAX(event_ts), '1970-01-01') FROM fact_events),
        '-3 days'                      -- reprocess the last 3 days on every run
      )
ON CONFLICT(event_id) DO UPDATE SET payload = excluded.payload;
\`\`\`

You deliberately re-scan the last N days each run. Rows you've already loaded hit \`ON CONFLICT\` and
update in place (**harmless, precisely because the load is idempotent**) while a genuinely late row
inside the window finally gets inserted. The lookback trades a little repeated work for the guarantee
that nothing older-than-cutoff is lost. Size N to your worst realistic lateness (an hour, a day, a
week): too small and stragglers still slip through, too large and every run reprocesses more than it
needs.

> **In the warehouse:** production incremental models never trust a bare \`MAX\`. dbt's incremental
> strategy exposes a \`lookback\` config for exactly this, and teams write an explicit
> \`WHERE event_ts >= (SELECT MAX(event_ts) FROM {{ this }}) - INTERVAL 'N days'\`. Snowflake/BigQuery
> streaming and Spark structured streaming call the same idea a **watermark with allowed lateness**.
> The lookback only works *because* the merge underneath is idempotent; the two techniques are a pair.

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
> SQLite / Postgres use \`INSERT … ON CONFLICT\`. Same idea, different keyword, and interviewers expect
> you to name both.

**Recap:** an idempotent loader survives re-runs without duplicating rows; achieve it with
\`INSERT … ON CONFLICT(<business key>) DO UPDATE / DO NOTHING\` backed by a real \`UNIQUE\` constraint,
optionally scoped by a high-water-mark \`WHERE\` **with a lookback window so late-arriving rows aren't
silently dropped**, and prove it with the "run twice, same count" test (warehouses spell the same
operation \`MERGE\`).

**Execution mode:** you write a multi-statement script. It runs against a fresh seeded SQLite DB, then
hidden assertion queries check the row count and the merged values, and the grader **re-runs your whole
script** to confirm the row count doesn't move.`,
  },
  apply: scriptExercise({
    id: "sql-l4-idempotent-merge-apply",
    prompt: `Write a load that leaves \`dim_product\` in exactly this state:

- a **new** SKU (\`SKU3\`) is inserted,
- an **existing** SKU (\`SKU1\`) has its \`name\` and \`price\` updated,
- \`SKU2\` (not in the extract) is left untouched,
- and **re-running the load adds no rows**: the table stays at exactly 3.

\`dim_product\` already exists with \`sku\` declared \`UNIQUE\` and two rows in it; \`stg_product\` holds a fresh extract (already seeded). Get there by converting a blind \`INSERT\` into a single \`INSERT … SELECT … ON CONFLICT(sku) DO UPDATE\` upsert keyed on the unique \`sku\`.`,
    starterCode: `-- dim_product (sku UNIQUE) and stg_product are already seeded.
-- Upsert the staging extract into dim_product so re-runs never duplicate.

-- Load every staging row so a new sku is inserted and an existing sku overwrites its name and price in one pass.`,
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
    prompt: `Write an **incremental upsert loader with a lookback window** and prove idempotency.
\`fact_events\` accumulates events keyed by a unique \`event_id\`; \`stg_events\` is a fresh extract
(both seeded). The extract **overlaps** already-loaded data (it repeats \`e2\`), contains a
**duplicate \`event_id\` within itself** (\`e3\` appears twice with different \`ingested_at\`), brings
genuinely new events (\`e3\`, \`e4\`), and carries one **late-arriving** event \`e5\` whose \`event_ts\`
(\`2026-02-28\`) is *before* the \`2026-03-02\` high-water: it happened in the past but only landed in
the source now.

In one \`INSERT … SELECT … ON CONFLICT\` load:

1. **dedup the extract** so each \`event_id\` appears once, keeping the row with the **latest**
   \`ingested_at\`;
2. bound it with a **lookback window** on \`event_ts\`: \`>= date(MAX(event_ts), '-3 days')\`, *not* a
   strict \`> MAX\`, so the late-arriving \`e5\` inside the window is still picked up instead of being
   silently dropped;
3. **upsert on \`event_id\`** so overlap re-seen inside the window updates in place instead of
   duplicating.

After one run \`fact_events\` must hold \`e1, e2, e3, e4, e5\` (5 rows), \`e3\`'s payload must be the
later-ingested \`{"a":3b}\`, the late \`e5\` must be present, and **running the whole script twice must
still leave 5 rows** with the same \`e3\` payload.`,
    starterCode: `-- fact_events (PK event_id) and stg_events are already seeded.
-- Load the extract idempotently: dedup -> lookback window -> upsert on event_id.

-- INSERT INTO fact_events (event_id, payload, event_ts, ingested_at)
-- 1) dedup the extract to one row per event_id, keeping the latest ingested_at.
-- 2) bound it with a lookback window on event_ts (reprocess a trailing few days), not a strict cutoff, so the late event is not dropped.
-- 3) upsert on event_id so a re-seen key updates in place instead of duplicating.`,
    hints: [
      "Dedup the extract first with `ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY ingested_at DESC, payload DESC)` and keep `rn = 1` (the dedup pattern from Module 4.4).",
      "Bound it with a lookback window, not a strict cutoff: `AND d.event_ts >= date((SELECT COALESCE(MAX(event_ts),'1970-01-01') FROM fact_events), '-3 days')`. A strict `> MAX` (or even `>= MAX`) silently drops the late-arriving `e5` (event_ts 2026-02-28, before the 2026-03-02 high-water); re-scanning the last few days catches it. You can't filter a window function in `WHERE`, so put the `ROW_NUMBER()` in a subquery and filter `rn` (and the lookback) outside.",
      "Upsert on the PK: `ON CONFLICT(event_id) DO UPDATE SET payload = excluded.payload, event_ts = excluded.event_ts, ingested_at = excluded.ingested_at`.",
      "Idempotency trap: on run #2 the high-water has risen to the newest event_ts, so the lookback window slides forward and most rows fall outside it; whatever still slips through hits `ON CONFLICT` and updates in place, never inserts. `e5` is already loaded, so its dropping out of the window on run #2 is harmless. That's what keeps the row count at 5.",
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
-- e5 is late-arriving: its event_ts (2026-02-28) is BEFORE the 2026-03-02 high-water,
-- but it only shows up in this batch (ingested 2026-03-04). A strict > high-water drops it.
INSERT INTO stg_events VALUES
  ('e2','{"a":2}','2026-03-02','2026-03-02'),
  ('e3','{"a":3}','2026-03-03','2026-03-03'),
  ('e3','{"a":3b}','2026-03-03','2026-03-04'),
  ('e4','{"a":4}','2026-03-04','2026-03-04'),
  ('e5','{"a":5}','2026-02-28','2026-03-04');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "fact_events holds exactly 5 rows after the load",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM fact_events) <> 5`,
      },
      {
        suite: "coverage",
        name: "e1, e2, e3, e4 and e5 are all present",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM fact_events WHERE event_id IN ('e1','e2','e3','e4','e5')) <> 5`,
      },
      {
        suite: "late",
        name: "the late-arriving e5 (event_ts before the high-water) was captured by the lookback",
        sql: `SELECT 1 WHERE COALESCE((SELECT event_ts FROM fact_events WHERE event_id = 'e5'), '~') <> '2026-02-28'
          OR COALESCE((SELECT payload FROM fact_events WHERE event_id = 'e5'), '~') <> '{"a":5}'`,
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

const dataQuality: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-data-quality",
  title: "Data-Quality Assertions",
  summary: "Encode expectations as tests that fail before bad data spreads.",
  estimatedMinutes: 22,
  difficulty: "medium",
  skills: [
    "assertion queries (zero-rows-pass)",
    "not_null / unique / accepted_values / relationships",
    "dbt-test mapping",
  ],
  teach: {
    estimatedMinutes: 8,
    markdown: `## A load that "succeeds" can still be wrong

A loader can finish with a green checkmark and still hand you garbage: a \`customer_code\` that appears twice, a \`NULL\` \`email\` where every row needs one, an order that points at a customer who was never inserted. Nothing threw an error, so nothing stopped it, and the bad rows flow straight into a dashboard where someone trusts them. Data-quality (DQ) tests are the guardrail. They run right after the load and fail the pipeline before corrupt data reaches a mart.

## The zero-rows assertion

Every DQ test in dbt is built on one idea: write a query that returns the rows that violate your expectation. If the query returns any rows, the test fails. Healthy data returns zero rows and passes.

This flips your instinct. Do not query the good rows and hope the count looks big. Query the bad rows and require exactly zero. That is unambiguous and threshold-free: zero orphans, zero duplicates, zero unexpected values, or the load is broken.

## The dbt four

Four tests cover most real defects. Each is a "violations = 0" query.

\`\`\`sql
-- not_null: a required column is missing
SELECT customer_key FROM dim_customer WHERE email IS NULL;

-- unique: a key appears more than once
SELECT customer_key FROM dim_customer
GROUP BY customer_key HAVING COUNT(*) > 1;

-- accepted_values: a value outside the allowed set (NULL counts as a violation)
SELECT customer_key FROM dim_customer
WHERE status NOT IN ('active','churned','prospect')
   OR status IS NULL;

-- relationships: a fact row with no matching dimension (the orphan anti-join)
SELECT f.customer_key
FROM fact_sales f
LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
WHERE d.customer_key IS NULL;
\`\`\`

The last one is the anti-join from Level 2 repurposed as referential integrity, the highest-value check in a star schema. Walk it: the \`LEFT JOIN\` keeps every fact row, a missing dimension leaves \`d.customer_key\` as \`NULL\`, and the \`WHERE\` keeps only those unmatched rows.

Worked example, matching the seeds in your exercises:

\`\`\`sql
-- dim_customer keys: 1, 2
-- fact_sales   keys: 1, 2, 99   (99 has no dimension row)
SELECT f.customer_key
FROM fact_sales f
LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
WHERE d.customer_key IS NULL;
-- customer_key
-- 99
\`\`\`

One row comes back, so the test fails and names key \`99\` as the orphan. On clean data the result is empty, which is the pass state your Apply writes into \`orphan_facts\`.

## Pitfalls

- **Asserting the happy path.** \`SELECT COUNT(*) FROM dim_customer WHERE email IS NOT NULL\` and checking it is "large enough" is fragile and needs an arbitrary threshold. Count the bad rows and require zero instead.
- **\`NULL\` swallowed by \`NOT IN\`.** \`status NOT IN ('active','churned','prospect')\` returns nothing for a \`NULL\` status, because \`NULL\` compared to any value is \`UNKNOWN\`, not \`TRUE\`, and \`WHERE\` keeps only \`TRUE\` rows. The null silently passes. When a null is also invalid, add \`OR status IS NULL\`, exactly as the \`accepted_values\` query above does.

**Interview nuance:** interviewers ask why the orphan check uses \`LEFT JOIN ... WHERE d.customer_key IS NULL\` instead of \`WHERE f.customer_key NOT IN (SELECT customer_key FROM dim_customer)\`. If the dimension holds even one \`NULL\` \`customer_key\`, the \`NOT IN\` version returns zero rows for every fact and hides real orphans, because \`x NOT IN (..., NULL)\` evaluates to \`UNKNOWN\`. The anti-join is NULL-safe: it matches keys with \`=\` in the \`ON\` clause and is unaffected by nulls elsewhere in the column. Same intent, one silently wrong.`,
  },
  apply: scriptExercise({
    id: "sql-l4-data-quality-apply",
    prompt: `Write a **relationships assertion** that flags \`fact_sales\` rows with no matching
\`dim_customer\`. \`dim_customer\`, \`fact_sales\`, and an **empty** \`orphan_facts(customer_key)\` are
already seeded. Populate \`orphan_facts\` with the \`customer_key\` of every fact row whose key is absent
from the dimension (key \`99\` is the planted orphan; keys \`1\` and \`2\` match and must stay out).

Lead your script with \`DELETE FROM orphan_facts;\` so a re-run recomputes the table instead of doubling
its rows. On healthy data this table would be empty, and empty is the "pass" state.`,
    starterCode: `-- dim_customer, fact_sales, and an empty orphan_facts are already seeded.
-- Fill orphan_facts with the customer_key of every fact row that has NO matching dim_customer.
DELETE FROM orphan_facts;   -- clear first so a re-run recomputes instead of doubling rows

-- INSERT INTO orphan_facts (customer_key)
-- Keep the fact rows whose customer_key has no match in dim_customer, and load those keys.`,
    hints: [
      "`LEFT JOIN dim_customer` and keep only the rows `WHERE dim_customer.customer_key IS NULL`: that's the orphan anti-join.",
      "Insert those unmatched keys into `orphan_facts`.",
      "Lead with `DELETE FROM orphan_facts;` so running the script twice recomputes the same rows instead of doubling them.",
      "On healthy data the anti-join returns nothing, so `orphan_facts` would be empty; that emptiness is the passing condition.",
    ],
    referenceSolution: `DELETE FROM orphan_facts;

INSERT INTO orphan_facts (customer_key)
SELECT f.customer_key
FROM fact_sales f
LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
WHERE d.customer_key IS NULL;`,
    seedSql: `DROP TABLE IF EXISTS orphan_facts;
DROP TABLE IF EXISTS fact_sales;
DROP TABLE IF EXISTS dim_customer;

CREATE TABLE dim_customer (customer_key INTEGER PRIMARY KEY, email TEXT);
INSERT INTO dim_customer VALUES (1,'a@x.com'),(2,'b@x.com');

CREATE TABLE fact_sales (sale_id INTEGER PRIMARY KEY, customer_key INTEGER, amount INTEGER);
INSERT INTO fact_sales VALUES (10,1,100),(11,2,50),(12,99,25);   -- key 99 is an orphan

CREATE TABLE orphan_facts (customer_key INTEGER);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "orphan_facts holds exactly one violating row",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM orphan_facts) <> 1`,
      },
      {
        suite: "integrity",
        name: "the planted orphan key 99 was flagged",
        isHidden: true,
        sql: `SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM orphan_facts WHERE customer_key = 99)`,
      },
      {
        suite: "integrity",
        name: "no matched key (1 or 2) was wrongly flagged as an orphan",
        isHidden: true,
        sql: `SELECT customer_key FROM orphan_facts WHERE customer_key IN (1, 2)`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-data-quality-practice",
    prompt: `Build a **four-test quality suite** where every check returns **zero rows on healthy data**.
\`dim_customer(customer_key, email, status)\`, \`fact_sales\`, and an empty
\`dq_results(test_name TEXT, violations INTEGER)\` are seeded. Populate \`dq_results\` with **exactly one
row per test**, each storing the **count of violating rows**:

- \`pk_unique\`: \`customer_key\` values appearing more than once,
- \`email_not_null\`: rows with a NULL \`email\`,
- \`status_accepted\`: rows whose \`status\` is not in \`('active','churned','prospect')\` (**a NULL status
  also counts as a violation**),
- \`no_orphan_facts\`: \`fact_sales\` rows with no matching \`dim_customer\`.

The suite **passes** only when all four \`violations\` are \`0\`. Lead with \`DELETE FROM dq_results;\` so a
re-run recomputes the four rows instead of stacking eight.`,
    starterCode: `-- dim_customer, fact_sales, and an empty dq_results are already seeded.
-- Populate dq_results with one row per DQ test, each COUNTs only the VIOLATING rows.
DELETE FROM dq_results;   -- recompute cleanly on every run

-- INSERT INTO dq_results (test_name, violations)
-- Add one row per test, storing its name and how many rows violate it:
-- pk_unique, email_not_null, status_accepted (a NULL status also counts), and no_orphan_facts.`,
    hints: [
      "Each test is an `INSERT INTO dq_results SELECT '<name>', COUNT(*) FROM (<the violating rows>)`.",
      "`pk_unique`: `SELECT COUNT(*) FROM (SELECT customer_key FROM dim_customer GROUP BY customer_key HAVING COUNT(*) > 1)`.",
      "`status_accepted`: `WHERE status NOT IN ('active','churned','prospect') OR status IS NULL`; the `OR ... IS NULL` is essential or a NULL status slips through.",
      "`no_orphan_facts`: the `LEFT JOIN ... IS NULL` anti-join from the Apply, wrapped in `COUNT(*)`.",
    ],
    seedSql: `DROP TABLE IF EXISTS dq_results;
DROP TABLE IF EXISTS fact_sales;
DROP TABLE IF EXISTS dim_customer;

CREATE TABLE dim_customer (
  customer_key INTEGER PRIMARY KEY,
  email  TEXT,
  status TEXT
);
INSERT INTO dim_customer VALUES
  (1,'a@x.com','active'),
  (2,'b@x.com','churned'),
  (3,'c@x.com','prospect');

CREATE TABLE fact_sales (sale_id INTEGER PRIMARY KEY, customer_key INTEGER, amount INTEGER);
INSERT INTO fact_sales VALUES (10,1,100),(11,2,50),(12,3,25);

CREATE TABLE dq_results (test_name TEXT, violations INTEGER);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "shape",
        name: "dq_results holds exactly four test rows",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dq_results) <> 4`,
      },
      {
        suite: "shape",
        name: "the four required test names are all present",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(DISTINCT test_name) FROM dq_results
          WHERE test_name IN ('pk_unique','email_not_null','status_accepted','no_orphan_facts')
        ) <> 4`,
      },
      {
        suite: "green",
        name: "every test reports zero violations on the healthy seed",
        sql: `SELECT test_name, violations FROM dq_results WHERE violations <> 0`,
      },
      {
        suite: "correctness",
        name: "pk_unique equals the recomputed duplicate-key count",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT violations FROM dq_results WHERE test_name = 'pk_unique'), -1) <> (
          SELECT COUNT(*) FROM (
            SELECT customer_key FROM dim_customer GROUP BY customer_key HAVING COUNT(*) > 1
          )
        )`,
      },
      {
        suite: "correctness",
        name: "no_orphan_facts equals the recomputed orphan anti-join count",
        isHidden: true,
        sql: `SELECT 1 WHERE COALESCE((SELECT violations FROM dq_results WHERE test_name = 'no_orphan_facts'), -1) <> (
          SELECT COUNT(*) FROM fact_sales f
          LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
          WHERE d.customer_key IS NULL
        )`,
      },
    ],
  }),
}

const explainPlan: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-explain",
  title: "EXPLAIN and Query Performance",
  summary: "Read a query plan and turn a full scan into an index seek.",
  estimatedMinutes: 24,
  difficulty: "hard",
  skills: ["EXPLAIN QUERY PLAN", "seek vs scan", "sargable predicates", "index-driven fixes"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## Read the plan before you optimize

When a query is slow, guessing is a waste of time; ask the database what it's doing.
\`EXPLAIN QUERY PLAN <query>\` returns the **plan**: how the engine will access each table. The word
you're hunting for is **SCAN** versus **SEARCH**:

- **\`SCAN table\`** is a full table scan: the engine reads *every* row. Fine for tiny tables,
  catastrophic for large facts.
- **\`SEARCH table USING INDEX …\`** is an index seek: the engine jumps straight to the matching rows.
  This is what you want on a filtered or joined column.

\`\`\`sql
EXPLAIN QUERY PLAN
SELECT * FROM fact_sales WHERE customer_key = 42;
\`\`\`

On an unindexed \`customer_key\` this reports \`SCAN fact_sales\`. Add the index:

\`\`\`sql
CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_key);
\`\`\`

and the same \`EXPLAIN QUERY PLAN\` now reports
\`SEARCH fact_sales USING INDEX idx_fact_sales_customer (customer_key=?)\`: the scan became a seek.
Index the columns queries **filter on**, **join on**, and often **order by**.

### Sargable predicates

An index can only be used if the predicate is **sargable** (Search-ARGument-able): the indexed column
must appear **bare** on one side of the comparison. Wrapping it in a function defeats the index:

\`\`\`sql
-- NON-sargable: function on the column -> index unusable -> full scan
WHERE strftime('%Y', order_date) = '2026'

-- Sargable: bare column vs a literal range -> index seek
WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'
\`\`\`

Both select 2026, but only the second lets the engine seek. Rewriting a function-wrapped predicate as
a **range on the bare column** is one of the highest-leverage performance fixes a DE makes. Note the
half-open upper bound (\`< '2027-01-01'\`): it keeps the very last day of the year (\`2026-12-31\`) and
cleanly drops \`2027-01-01\`: no fencepost bug, and no \`BETWEEN\` gotcha.

### Common pitfalls

- **Indexing everything.** Every index speeds reads but **slows writes** (each \`INSERT\` / \`UPDATE\`
  must maintain it) and costs storage. Index selectively: the FK/join columns and the hot filter
  columns, not every column.
- **Redundant indexes.** \`PRIMARY KEY\` and \`UNIQUE\` columns are **already indexed**; don't add a
  second index on them.
- **Reading the plan wrong.** \`SCAN\` on a 5-row lookup table is totally fine; a seek's overhead
  isn't worth it. Optimize the scans that hurt: big tables in the hot path.

> **In the warehouse:** SQLite's \`EXPLAIN QUERY PLAN\` is the lightweight cousin of Postgres's
> \`EXPLAIN ANALYZE\` (which also *runs* the query and reports real timings) and Snowflake's
> query-profile UI. Columnar warehouses lean on partition pruning and clustering rather than B-tree
> indexes, but the **sargable-predicate** rule (bare column, no function) is universal.

**Recap:** \`EXPLAIN QUERY PLAN\` reveals \`SCAN\` (full read) vs \`SEARCH … USING INDEX\` (seek); turn a
hot-path scan into a seek by indexing the filter/join column and keeping predicates sargable (bare
column, range not function), and index selectively, because every index taxes writes.

**Execution mode:** you write a multi-statement script against a fresh seeded SQLite DB, then hidden
assertion queries check that the right indexes exist and that your rewritten query returns exactly the
right rows. You can eyeball the plan yourself with \`EXPLAIN QUERY PLAN <your query>;\` while you work,
but the grader checks the **index and the result**, not the plan text.`,
  },
  apply: scriptExercise({
    id: "sql-l4-explain-apply",
    prompt: `\`fact_sales\` is seeded with **no index** on \`customer_key\`, so
\`EXPLAIN QUERY PLAN SELECT * FROM fact_sales WHERE customer_key = 1;\` reports a full \`SCAN\`. **Add the
index that turns that scan into a \`SEARCH … USING INDEX\` seek**: index the column the query filters
on. (In the real grader the table is large enough that the scan actually hurts.) Keep the script
re-runnable so a second run doesn't error.`,
    starterCode: `-- fact_sales is already seeded, there is no index on customer_key yet.
-- Add the index that turns the SCAN in
--   EXPLAIN QUERY PLAN SELECT * FROM fact_sales WHERE customer_key = 1;
-- into a SEARCH … USING INDEX seek.

-- Create the index on the filtered column, and keep it re-runnable so a second run does not error.`,
    hints: [
      "`CREATE INDEX IF NOT EXISTS idx_fact_sales_customer ON fact_sales(customer_key);`. The `IF NOT EXISTS` keeps the script idempotent so a re-run doesn't error.",
      "The filter column is `customer_key`; that's the column to index, so `WHERE customer_key = ?` becomes a seek instead of a scan.",
      "Verify for yourself with `EXPLAIN QUERY PLAN SELECT * FROM fact_sales WHERE customer_key = 1;`: you want `SEARCH … USING INDEX`, not a bare `SCAN`.",
    ],
    referenceSolution: `-- Turn the full SCAN on customer_key into an index SEARCH (seek).
-- IF NOT EXISTS makes the CREATE re-runnable for the idempotency double-run.
CREATE INDEX IF NOT EXISTS idx_fact_sales_customer ON fact_sales(customer_key);`,
    seedSql: `DROP TABLE IF EXISTS fact_sales;
CREATE TABLE fact_sales (
  sale_id      INTEGER PRIMARY KEY,
  customer_key INTEGER,
  amount       INTEGER
);
INSERT INTO fact_sales (customer_key, amount) VALUES
  (1,100),(1,50),(2,200),(3,75),(1,25);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "index",
        name: "an index exists on fact_sales(customer_key)",
        sql: `SELECT 1 WHERE NOT EXISTS (
          SELECT 1 FROM pragma_index_list('fact_sales') il
          WHERE (SELECT COUNT(*) FROM pragma_index_info(il.name) WHERE name = 'customer_key') >= 1
        )`,
      },
      {
        suite: "correctness",
        name: "the filtered query still returns the three customer_key = 1 rows",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM fact_sales WHERE customer_key = 1) <> 3`,
      },
      {
        suite: "seek",
        name: "customer_key is the leading column of the index (so equality can seek)",
        isHidden: true,
        sql: `SELECT 1 WHERE NOT EXISTS (
          SELECT 1 FROM pragma_index_list('fact_sales') il
          WHERE (SELECT COUNT(*) FROM pragma_index_info(il.name) WHERE seqno = 0 AND name = 'customer_key') = 1
        )`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-explain-practice",
    prompt: `A hot query joins \`fact_orders\` to \`dim_customer\` on \`customer_key\` and filters
\`order_date\` with a **non-sargable** year function: two full scans. Fix all three problems:

1. Add the index that makes the fact→dim join a **seek** on the fact side (\`fact_orders.customer_key\`).
2. Add the index that lets the date filter **seek** (\`fact_orders.order_date\`).
3. Rewrite the filter \`strftime('%Y', order_date) = '2026'\` as a **sargable** half-open date range
   (bare column, no function), then load the 2026 orders into \`orders_2026 (order_id, customer_key)\`.
   Join to \`dim_customer\` so only orders with a real customer land.

\`orders_2026\` is pre-created (empty). Lead the load with \`DELETE FROM orders_2026;\` so a second run
doesn't double the rows.`,
    starterCode: `-- dim_customer, fact_orders, and an empty orders_2026 are already seeded.
-- 1) Index the fact-side join column so fact_orders -> dim_customer can seek.
-- 2) Index order_date so a date-range filter can seek.
-- 3) Rewrite strftime('%Y', order_date) = '2026' as a sargable half-open range,
--    then load the 2026 orders into orders_2026.

-- Add both indexes (keep them re-runnable so a second run does not error).

-- DELETE FROM orders_2026;            -- lead the load so a re-run doesn't double rows
-- INSERT INTO orders_2026 (order_id, customer_key) the 2026 orders,
-- joining to dim_customer so only orders with a real customer land,
-- and filtering order_date with the bare-column range you rewrote (no year function).`,
    hints: [
      "Two indexes, both idempotent: `CREATE INDEX IF NOT EXISTS … ON fact_orders(customer_key)` for the join and `… ON fact_orders(order_date)` for the filter.",
      "Rewrite the filter as `order_date >= '2026-01-01' AND order_date < '2027-01-01'`: bare column, half-open range, no `strftime`.",
      "The half-open upper bound `< '2027-01-01'` includes `2026-12-31` and excludes `2027-01-01`.",
      "Lead the load with `DELETE FROM orders_2026;` (so a re-run doesn't double rows), then `INSERT … SELECT` the 2026 fact rows joined to `dim_customer` into `orders_2026 (order_id, customer_key)`.",
    ],
    seedSql: `DROP TABLE IF EXISTS orders_2026;
DROP TABLE IF EXISTS fact_orders;
DROP TABLE IF EXISTS dim_customer;

CREATE TABLE dim_customer (customer_key INTEGER PRIMARY KEY, name TEXT);
INSERT INTO dim_customer VALUES (1,'Ada'),(2,'Ben'),(3,'Cara');

CREATE TABLE fact_orders (
  order_id     INTEGER PRIMARY KEY,
  customer_key INTEGER,
  order_date   TEXT,          -- 'YYYY-MM-DD'
  amount       INTEGER
);
INSERT INTO fact_orders (customer_key, order_date, amount) VALUES
  (1,'2025-12-31',10),(1,'2026-01-15',20),(2,'2026-06-01',30),
  (3,'2026-12-31',40),(2,'2027-01-01',50);

CREATE TABLE orders_2026 (order_id INTEGER, customer_key INTEGER);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "index",
        name: "fact_orders has a join index leading with customer_key",
        sql: `SELECT 1 WHERE NOT EXISTS (
          SELECT 1 FROM pragma_index_list('fact_orders') il
          WHERE (SELECT COUNT(*) FROM pragma_index_info(il.name) WHERE seqno = 0 AND name = 'customer_key') = 1
        )`,
      },
      {
        suite: "index",
        name: "fact_orders has a filter index leading with order_date",
        sql: `SELECT 1 WHERE NOT EXISTS (
          SELECT 1 FROM pragma_index_list('fact_orders') il
          WHERE (SELECT COUNT(*) FROM pragma_index_info(il.name) WHERE seqno = 0 AND name = 'order_date') = 1
        )`,
      },
      {
        suite: "rows",
        name: "orders_2026 holds exactly the three 2026 orders",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM orders_2026) <> 3`,
      },
      {
        suite: "rows",
        name: "no out-of-range order leaked into orders_2026",
        sql: `SELECT order_id FROM orders_2026
          WHERE order_id NOT IN (
            SELECT order_id FROM fact_orders
            WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'
          )`,
      },
      {
        suite: "boundary",
        name: "half-open range kept 2026-12-31 and dropped 2025-12-31 / 2027-01-01",
        isHidden: true,
        sql: `SELECT 1 WHERE
          (SELECT COUNT(*) FROM orders_2026 WHERE order_id = 4) <> 1
          OR (SELECT COUNT(*) FROM orders_2026 WHERE order_id IN (1,5)) <> 0`,
      },
      {
        suite: "join",
        name: "each loaded row carries its fact row's customer_key",
        isHidden: true,
        sql: `SELECT o.order_id FROM orders_2026 o
          JOIN fact_orders f ON f.order_id = o.order_id
          WHERE o.customer_key <> f.customer_key`,
      },
    ],
  }),
}

const capstone: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-capstone",
  title: "Capstone: A Type-2 SCD Loader",
  summary: "Combine dedup, SCD2, idempotency, quality, and perf into one production-grade loader.",
  estimatedMinutes: 40,
  difficulty: "hard",
  skills: [
    "end-to-end pipeline",
    "dedup + SCD2 + upsert",
    "DQ assertions",
    "EXPLAIN",
    "idempotent re-run",
  ],
  teach: {
    estimatedMinutes: 12,
    markdown: `## A production loader composes every Level-4 skill

Everything in Level 4 so far was a **component**. A real daily loader **composes** them in order.
Here is the anatomy of a production \`dim_customer\` Type-2 loader processing one daily dump:

1. **Dedup the source** (Module 4.4). A raw dump has duplicate natural keys; reduce it to one row per
   customer, keeping the freshest with
   \`ROW_NUMBER() OVER (PARTITION BY customer_code ORDER BY updated_at DESC)\` and keeping \`rn = 1\`.
   Everything downstream reads this clean set, never the raw dump.
2. **Apply SCD Type 2** (Module 4.3). For each deduped customer whose tracked attribute changed versus
   the current dimension row: **expire** the old row (\`effective_to = snapshot_date\`,
   \`is_current = 0\`) and **insert** a new version (fresh surrogate key,
   \`effective_from = snapshot_date\`, \`effective_to = '9999-12-31'\`, \`is_current = 1\`). Brand-new
   customers get one current row. Unchanged (and absent) customers are left untouched.
3. **Assert quality** (Module 4.5). Run zero-row DQ tests: exactly one \`is_current = 1\` per customer,
   no orphan facts against the dimension, contiguous validity windows.
4. **Verify performance** (the \`EXPLAIN\` module). The fact→dim as-of join should be an index **seek**,
   so index the join key.
5. **Idempotency** (Module 4.4). The whole script, run twice on the same dump, must leave the dimension
   **byte-identical**: the second pass detects no changes and inserts nothing.

### The one property everything depends on: idempotent change-detection

The single most important correctness property is **idempotency of the SCD2 step**. Change-detection
must compare the dump against the *current* dimension row, and you must **snapshot the changed set into
a temp table _before_ you expire or insert**; otherwise the insert creates rows that a naive second
pass re-reads as "changes," and you get infinite version growth on re-runs.

\`\`\`sql
-- 1. dedup -> clean_dump (one row per code, latest updated_at)
DROP TABLE IF EXISTS clean_dump;
CREATE TEMP TABLE clean_dump AS
WITH ranked AS (
  SELECT customer_code, city, updated_at,
         ROW_NUMBER() OVER (PARTITION BY customer_code ORDER BY updated_at DESC) AS rn
  FROM raw_dump
)
SELECT customer_code, city FROM ranked WHERE rn = 1;

-- 2. FREEZE the changed set BEFORE mutating anything
DROP TABLE IF EXISTS changed;
CREATE TEMP TABLE changed AS
SELECT c.customer_code, c.city
FROM clean_dump c
JOIN dim_customer d ON d.customer_code = c.customer_code AND d.is_current = 1
WHERE c.city IS NOT d.city;   -- null-safe (Module 4.3): also catches NULL<->value city changes

-- 3. expire the old versions, then 4. insert the new ones, both driven by 'changed'
UPDATE dim_customer SET effective_to = '2026-03-01', is_current = 0
WHERE is_current = 1 AND customer_code IN (SELECT customer_code FROM changed);
INSERT INTO dim_customer (customer_code, city, effective_from, effective_to, is_current)
SELECT customer_code, city, '2026-03-01', '9999-12-31', 1 FROM changed;
\`\`\`

On the second run \`changed\` is **empty** (the current city already equals the dump) so the expire
and insert both no-op. Brand-new customers are the mirror image: freeze the codes that have *no* row in
the dimension at all, and insert one current version for each (never run the expire step for them).

Two guards keep the *whole script* re-runnable, not just the SCD2 step:

- Lead every temp table with \`DROP TABLE IF EXISTS …;\` so a second pass doesn't error on "table
  already exists."
- Populate a recomputable target (\`fact_sales.customer_key\`, a \`dq_results\` gate) with an idempotent
  \`UPDATE\` or a \`DELETE\` + re-\`INSERT\`, never a blind \`INSERT\` that doubles rows on the second pass.

Resolve each fact to the surrogate key that was valid **on its sale date** with a half-open as-of join
(\`f.sale_date >= d.effective_from AND f.sale_date < d.effective_to\`) as an \`UPDATE\`, so re-running
recomputes the identical key. Then index the join column and confirm the plan with
\`EXPLAIN QUERY PLAN\`; you're looking for a \`SEARCH … USING INDEX\` (a seek), not a \`SCAN\`.

> **In the warehouse:** SQLite has no \`QUALIFY\`, so you filter \`ROW_NUMBER()\` in a wrapping
> subquery/CTE (\`WHERE rn = 1\`). Snowflake and BigQuery let you write
> \`QUALIFY ROW_NUMBER() OVER (…) = 1\` in one line: same dedup, less nesting.

> **In the warehouse:** this entire loader is what dbt's \`snapshot\` (SCD2) plus \`MERGE\`-based
> incremental models plus schema \`tests\` generate for you, but building it by hand once is exactly how
> you learn what those tools are doing, and it's the interview question behind "walk me through a
> Type-2 dimension load."

**Recap:** a production loader = dedup → SCD2 (snapshot-then-expire-then-insert) → DQ assertions → plan
verification, all engineered so re-running the whole script changes nothing. Idempotent
change-detection against the *current* row is the property everything else depends on.

**Execution mode:** you write a multi-statement script. It runs against a fresh seeded SQLite DB, then
hidden assertion queries check the dimension, the as-of fact keys, the DQ gate, and the join index. The
grader re-runs your whole script to prove it changes nothing the second time.`,
  },
  apply: scriptExercise({
    id: "sql-l4-capstone-apply",
    prompt: `Update the Type-2 \`dim_customer\` for a single-day load by deduplicating the raw dump and
then versioning every customer whose city changed. Given a raw dump \`raw_dump\` (with duplicate
\`customer_code\`s) and a Type-2 \`dim_customer\`:

1. **Dedup** \`raw_dump\` to one row per \`customer_code\`, keeping the latest \`updated_at\` (this picks
   the Berlin row for \`C1\`).
2. **Apply a Type 2 change** for any customer whose \`city\` differs from its current dimension row, as
   of \`snapshot_date = '2026-03-01'\`: expire the old current row (\`effective_to = '2026-03-01'\`,
   \`is_current = 0\`) and insert a new current version (\`effective_from = '2026-03-01'\`,
   \`effective_to = '9999-12-31'\`, \`is_current = 1\`).

Snapshot the changed set into a temp table *before* you expire or insert, so re-running the script is a
no-op.`,
    starterCode: `-- Seed: dim_customer (Type-2, C1 = London current) and raw_dump (two C1 rows, latest = Berlin).
-- Guard temp tables so the whole script re-runs cleanly.
DROP TABLE IF EXISTS clean_dump;
DROP TABLE IF EXISTS changed;

-- 1. Dedup raw_dump into TEMP clean_dump: one row per customer_code, latest updated_at ...

-- 2a. Freeze the changed set (current dim row whose city differs) into TEMP changed ...

-- 2b. Expire the old current rows for changed codes, closing their window at the snapshot date ...

-- 2c. Insert the new current versions, effective from the snapshot date ...`,
    hints: [
      "Guard each temp table with `DROP TABLE IF EXISTS clean_dump;` before `CREATE TEMP TABLE`, then dedup with `ROW_NUMBER() OVER (PARTITION BY customer_code ORDER BY updated_at DESC)` and keep `rn = 1`; this picks the Berlin row for C1.",
      "Compare the deduped dump to the current dim row (`is_current = 1`) to find changed cities, and freeze that set into a temp table before you touch `dim_customer`.",
      "Expire, then insert: exactly the pattern from `sql-l4-scd-type2`.",
      "Use `snapshot_date = '2026-03-01'` for both the expiring `effective_to` and the new `effective_from`.",
    ],
    referenceSolution: `-- Temp-table guards so a second run of the whole script does not error.
DROP TABLE IF EXISTS clean_dump;
DROP TABLE IF EXISTS changed;

-- 1. Dedup the dump to one row per customer_code (latest updated_at wins).
CREATE TEMP TABLE clean_dump AS
WITH ranked AS (
  SELECT customer_code, city, updated_at,
         ROW_NUMBER() OVER (
           PARTITION BY customer_code ORDER BY updated_at DESC
         ) AS rn
  FROM raw_dump
)
SELECT customer_code, city FROM ranked WHERE rn = 1;

-- 2a. Freeze which codes actually changed (compare to the current dim row).
CREATE TEMP TABLE changed AS
SELECT c.customer_code, c.city
FROM clean_dump c
JOIN dim_customer d
  ON d.customer_code = c.customer_code AND d.is_current = 1
WHERE c.city IS NOT d.city;   -- null-safe (Module 4.3): also catches NULL<->value city changes

-- 2b. Expire the old current rows for changed codes.
UPDATE dim_customer
SET effective_to = '2026-03-01', is_current = 0
WHERE is_current = 1
  AND customer_code IN (SELECT customer_code FROM changed);

-- 2c. Insert the new current versions.
INSERT INTO dim_customer (customer_code, city, effective_from, effective_to, is_current)
SELECT customer_code, city, '2026-03-01', '9999-12-31', 1
FROM changed;`,
    seedSql: `CREATE TABLE dim_customer (
  customer_key   INTEGER PRIMARY KEY,
  customer_code  TEXT NOT NULL,
  city           TEXT,
  effective_from TEXT NOT NULL,
  effective_to   TEXT NOT NULL,
  is_current     INTEGER NOT NULL
);
INSERT INTO dim_customer (customer_code, city, effective_from, effective_to, is_current)
VALUES ('C1','London','2026-01-01','9999-12-31',1);

CREATE TABLE raw_dump (customer_code TEXT, city TEXT, updated_at TEXT);
INSERT INTO raw_dump VALUES
  ('C1','London','2026-02-20'),
  ('C1','Berlin','2026-02-28');`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "C1 now has two versions",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer WHERE customer_code = 'C1') <> 2`,
      },
      {
        suite: "scd",
        name: "exactly one current row remains for C1",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer WHERE customer_code = 'C1' AND is_current = 1) <> 1`,
      },
      {
        suite: "scd",
        name: "Berlin is the new current version",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM dim_customer
          WHERE customer_code = 'C1' AND city = 'Berlin' AND is_current = 1
            AND effective_from = '2026-03-01' AND effective_to = '9999-12-31'
        ) <> 1`,
      },
      {
        suite: "scd",
        name: "the old London row was expired on the snapshot date",
        isHidden: true,
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM dim_customer
          WHERE customer_code = 'C1' AND city = 'London' AND is_current = 0 AND effective_to = '2026-03-01'
        ) <> 1`,
      },
      {
        suite: "windows",
        name: "the two versions form a contiguous, gap-free timeline",
        isHidden: true,
        sql: `SELECT customer_code FROM (
          SELECT customer_code, effective_to,
                 LEAD(effective_from) OVER (PARTITION BY customer_code ORDER BY effective_from) AS next_from
          FROM dim_customer
        ) WHERE next_from IS NOT NULL AND next_from <> effective_to`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-capstone-practice",
    prompt: `Build the complete \`dim_customer\` **Type-2 loader** from a daily dump, then prove it
end-to-end. From \`raw_customer_dump\` (dirty: duplicate \`customer_code\`s, some brand-new customers,
some unchanged, some changed) load a Type-2 \`dim_customer\` as of \`snapshot_date = '2026-03-01'\`, and
maintain \`fact_sales\` so its \`customer_key\` points at the surrogate that was valid on each sale date.
Your script must:

1. **Dedup** the dump to one row per \`customer_code\` (latest \`updated_at\`, tiebreak by highest
   \`source_row_id\`).
2. **Apply SCD2**: expire + insert for changed cities, one current row for brand-new customers, and
   leave unchanged and absent customers alone.
3. **Resolve** \`fact_sales.customer_key\` with a half-open as-of \`UPDATE\`
   (\`sale_date >= effective_from AND sale_date < effective_to\`).
4. **Index** \`fact_sales(customer_key)\` and confirm the fact→dim join is a seek with
   \`EXPLAIN QUERY PLAN\`.
5. **Write a DQ gate**: three rows into \`dq_results(test_name, violations)\`,
   \`pk_natural_one_current\` (codes with more than one current row), \`orphan_facts\` (fact keys that
   aren't a real surrogate), and \`contiguous_windows\` (codes with gapped/overlapping windows). All
   three must be **0** on healthy output.
6. **Idempotency**: the grader runs your entire script **twice** and asserts \`dim_customer\`,
   \`fact_sales\`, and every \`dq_results.violations\` are identical: no new versions on the second run.`,
    starterCode: `-- Guard every temp table so the entire loader re-runs cleanly.
DROP TABLE IF EXISTS clean_dump;
DROP TABLE IF EXISTS changed;
DROP TABLE IF EXISTS new_codes;

-- 1. Dedup raw_customer_dump -> TEMP clean_dump: one row per customer_code,
--    latest updated_at, tiebreak by the highest source_row_id ...

-- 2a. Freeze changed codes (existing current row whose city differs) -> TEMP changed ...
-- 2b. Freeze brand-new codes (no row at all in dim_customer)         -> TEMP new_codes ...
-- 2c. Expire changed current rows; 2d. insert their new versions; 2e. insert the new customers ...

-- 3. Resolve fact_sales.customer_key with a half-open as-of UPDATE that
--    matches each sale to the version valid on its sale date ...

-- 4. Index fact_sales(customer_key) for the join seek, keeping it re-runnable ...

-- 5. DQ gate: DELETE FROM dq_results, then INSERT three violation counts
--    (pk_natural_one_current, orphan_facts, contiguous_windows) ...

-- 6. EXPLAIN QUERY PLAN the fact->dim key join to confirm a seek ...`,
    hints: [
      "Dedup first into a temp table with `ROW_NUMBER() OVER (PARTITION BY customer_code ORDER BY updated_at DESC, source_row_id DESC)` keeping `rn = 1`. Everything downstream reads the clean set, never `raw_customer_dump`.",
      "**Snapshot the changed set into a temp table before mutating** `dim_customer`: compute `codes whose deduped city IS NOT the current dim city` (null-safe, per Module 4.3) once, then expire, then insert from that frozen set. This is what makes run #2 a no-op: on the second run the current city already equals the dump, so `changed` is empty. Brand-new customers = deduped codes with `customer_code NOT IN (SELECT customer_code FROM dim_customer)`.",
      "Resolve `fact_sales.customer_key` as an idempotent `UPDATE` with the as-of join, and make the DQ step `DELETE FROM dq_results;` then re-`INSERT` the three rows; a blind `INSERT` would double the DQ rows on run #2 and break idempotency.",
      "DQ shapes: `pk_natural_one_current` = `COUNT(*)` of `(SELECT customer_code FROM dim_customer WHERE is_current = 1 GROUP BY customer_code HAVING COUNT(*) > 1)`; `contiguous_windows` uses `LEAD(effective_from) OVER (PARTITION BY customer_code ORDER BY effective_from)` and counts codes where the next version's start doesn't equal this version's `effective_to`.",
    ],
    seedSql: `CREATE TABLE dim_customer (
  customer_key   INTEGER PRIMARY KEY,
  customer_code  TEXT NOT NULL,
  name           TEXT,
  city           TEXT,
  effective_from TEXT NOT NULL,
  effective_to   TEXT NOT NULL,
  is_current     INTEGER NOT NULL
);
INSERT INTO dim_customer (customer_code, name, city, effective_from, effective_to, is_current) VALUES
  ('C1','Ada','London','2026-01-01','9999-12-31',1),
  ('C2','Ben','Paris', '2026-01-01','9999-12-31',1),
  ('C3','Cara','Rome', '2026-01-01','9999-12-31',1);

CREATE TABLE raw_customer_dump (
  source_row_id INTEGER PRIMARY KEY,
  customer_code TEXT, name TEXT, city TEXT, updated_at TEXT
);
INSERT INTO raw_customer_dump (customer_code, name, city, updated_at) VALUES
  ('C1','Ada','Berlin','2026-02-20'),
  ('C1','Ada','Berlin','2026-02-20'),
  ('C2','Ben','Paris','2026-02-25'),
  ('C4','Dan','Oslo','2026-02-26');

CREATE TABLE fact_sales (
  sale_id INTEGER PRIMARY KEY,
  customer_code TEXT,
  sale_date TEXT,
  customer_key INTEGER,
  amount INTEGER
);
INSERT INTO fact_sales (customer_code, sale_date, amount) VALUES
  ('C1','2026-02-10',100),
  ('C1','2026-03-15',50),
  ('C4','2026-03-20',30);

CREATE TABLE dq_results (test_name TEXT, violations INTEGER);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "dim_customer holds exactly five rows after the load",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_customer) <> 5`,
      },
      {
        suite: "scd",
        name: "exactly one is_current = 1 per customer_code",
        isHidden: true,
        sql: `SELECT customer_code FROM dim_customer GROUP BY customer_code HAVING SUM(is_current) <> 1`,
      },
      {
        suite: "scd",
        name: "C1's London version was expired on the snapshot date",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM dim_customer
          WHERE customer_code = 'C1' AND city = 'London' AND is_current = 0 AND effective_to = '2026-03-01'
        ) <> 1`,
      },
      {
        suite: "scd",
        name: "C1's Berlin version is the new current row",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM dim_customer
          WHERE customer_code = 'C1' AND city = 'Berlin' AND is_current = 1
            AND effective_from = '2026-03-01' AND effective_to = '9999-12-31'
        ) <> 1`,
      },
      {
        suite: "scd",
        name: "C3 (absent from the dump) was left untouched",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM dim_customer
          WHERE customer_code = 'C3' AND city = 'Rome' AND is_current = 1
            AND effective_from = '2026-01-01' AND effective_to = '9999-12-31'
        ) <> 1`,
      },
      {
        suite: "scd",
        name: "the brand-new customer C4 got one current row",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM dim_customer
          WHERE customer_code = 'C4' AND city = 'Oslo' AND is_current = 1
            AND effective_from = '2026-03-01' AND effective_to = '9999-12-31'
        ) <> 1`,
      },
      {
        suite: "fact",
        name: "C1's two sales resolve to the London vs Berlin versions",
        sql: `SELECT 1 WHERE
          COALESCE((SELECT d.city FROM fact_sales f JOIN dim_customer d ON d.customer_key = f.customer_key
                    WHERE f.customer_code = 'C1' AND f.sale_date = '2026-02-10'), '~') <> 'London'
          OR COALESCE((SELECT d.city FROM fact_sales f JOIN dim_customer d ON d.customer_key = f.customer_key
                       WHERE f.customer_code = 'C1' AND f.sale_date = '2026-03-15'), '~') <> 'Berlin'`,
      },
      {
        suite: "fact",
        name: "every fact_sales.customer_key is the version valid on its sale_date",
        isHidden: true,
        sql: `SELECT f.sale_id
          FROM fact_sales f
          LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
          WHERE d.customer_code IS NULL
             OR d.customer_code <> f.customer_code
             OR NOT (f.sale_date >= d.effective_from AND f.sale_date < d.effective_to)`,
      },
      {
        suite: "dq",
        name: "all three named DQ tests are present and report zero violations",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM dq_results
          WHERE test_name IN ('pk_natural_one_current','orphan_facts','contiguous_windows')
            AND violations = 0
        ) <> 3`,
      },
      {
        suite: "dq",
        name: "no DQ test reports a violation",
        sql: `SELECT test_name FROM dq_results WHERE violations <> 0`,
      },
      {
        suite: "perf",
        name: "an index on fact_sales(customer_key) exists for the join seek",
        sql: `SELECT 1 WHERE (
          SELECT COUNT(*) FROM sqlite_master
          WHERE type = 'index' AND tbl_name = 'fact_sales' AND sql LIKE '%customer_key%'
        ) < 1`,
      },
    ],
  }),
}

const snowflake: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-snowflake",
  title: "Star vs Snowflake Schemas",
  summary:
    "Denormalize a wide star dimension into a snowflake sub-dimension, then pay the extra join to query it.",
  estimatedMinutes: 22,
  difficulty: "medium",
  skills: [
    "star schema",
    "snowflake schema",
    "normalization",
    "denormalization",
    "dimension modeling",
    "surrogate keys",
    "multi-join aggregation",
  ],
  teach: {
    estimatedMinutes: 9,
    markdown: `## Why warehouses argue about this on day one

You loaded a \`dim_product\` table last sprint, and it carries \`category_name\` and \`category_manager\` right on the product row. "Revenue by manager" is then a single join from \`fact_sales\` to \`dim_product\`. Now a teammate asks you to store each manager once instead of repeating it across 40,000 product rows. That one request is the entire star vs snowflake debate, and interviewers open with it because it reveals whether you understand the read-versus-normalize trade-off that shapes every warehouse.

## The mental model

A **star schema** keeps each dimension wide and **denormalized**: one \`dim_product\` row holds every descriptive attribute, including \`category_name\` and \`category_manager\`, even though thousands of products repeat the same category. A **snowflake schema** **normalizes** that dimension into sub-dimensions: \`dim_product\` drops the repeated category columns and instead stores a \`category_key\` pointing at a separate \`dim_category(category_key, category_name, category_manager)\`. The category attributes now live in exactly one place.

The trade is precise. Snowflaking removes redundancy and gives you **one source of truth** for the shared sub-attribute, so renaming a manager updates one row instead of thousands. The cost is that **every query pays an extra join**. Star is the BI default: fewer joins, simpler SQL, and columnar engines make the wide dimension cheap to scan, so the redundancy barely hurts. Snowflaking earns its keep only when a sub-hierarchy is **large and shared** across several dimensions or facts, so normalizing it once beats copying it everywhere.

## A worked example

Given a snowflake (\`fact_sales\` to \`dim_product\` to \`dim_category\`), revenue by manager needs both joins:

\`\`\`sql
SELECT c.category_manager, SUM(f.revenue) AS revenue
FROM fact_sales f
JOIN dim_product  p ON p.product_key  = f.product_key
JOIN dim_category c ON c.category_key = p.category_key
GROUP BY c.category_manager;
\`\`\`

With Priya managing Audio and Marco managing Video, this returns Marco \`600\` and Priya \`300\`. In a star, \`category_manager\` already sits on \`dim_product\`, so you drop the second join entirely and get the same answer with one fewer hop. The seeded tables, this query, and its live result render below.

## A pitfall interns hit

Forgetting the second join returns wrong groupings. Group by \`category_key\` instead of \`category_manager\` and a manager who owns two categories splits into two rows that no longer reconcile to a single total. The opposite failure is over-snowflaking: a sub-dimension for every attribute turns routine reports into join marathons that are slower to write and slower to run.

**Interview nuance:** star vs snowflake is a read-simplicity and performance trade-off against normalization, and most warehouses ship star or "starflake" because BI tools slice a denormalized dimension with a single join.`,
    demoCode: `SELECT
  c.category_manager,
  SUM(f.revenue) AS revenue
FROM fact_sales f
JOIN dim_product  p ON p.product_key  = f.product_key
JOIN dim_category c ON c.category_key = p.category_key
GROUP BY c.category_manager
ORDER BY revenue DESC;`,
    demoSeedSql: `CREATE TABLE dim_category (
  category_key     INTEGER PRIMARY KEY,
  category_name    TEXT,
  category_manager TEXT
);
INSERT INTO dim_category VALUES
  (1, 'Audio', 'Priya'),
  (2, 'Video', 'Marco');

CREATE TABLE dim_product (
  product_key  INTEGER PRIMARY KEY,
  sku          TEXT,
  product_name TEXT,
  category_key INTEGER
);
INSERT INTO dim_product VALUES
  (1, 'SKU-EAR', 'Earbuds',    1),
  (2, 'SKU-HDP', 'Headphones', 1),
  (3, 'SKU-MON', 'Monitor',    2),
  (4, 'SKU-CAM', 'Webcam',     2);

CREATE TABLE fact_sales (
  sale_id     INTEGER PRIMARY KEY,
  product_key INTEGER,
  revenue     INTEGER
);
INSERT INTO fact_sales VALUES
  (1, 1, 100),
  (2, 2, 150),
  (3, 1, 50),
  (4, 3, 400),
  (5, 4, 200);`,
    showDemoInput: true,
  },
  apply: scriptExercise({
    id: "sql-l4-snowflake-apply",
    prompt: `Snowflake a denormalized product dimension. \`dim_product_wide(product_key, sku, product_name, category_name, category_manager)\` is seeded and repeats the category columns across products. Build \`dim_category(category_key, category_name, category_manager)\` from the DISTINCT categories (let \`category_key\` auto-assign), then rebuild \`dim_product(product_key, sku, product_name, category_key)\` so each product references its category by \`category_key\` instead of carrying the repeated columns. Preserve all six products and keep each \`product_key\` from the source. Expected: \`dim_category\` = 3 rows (one per distinct category), \`dim_product\` = 6 rows with zero orphan \`category_key\` values. Lead with \`DELETE FROM\` both targets (product before category) so the load re-runs cleanly.`,
    starterCode: `-- dim_product_wide (the denormalized "star" product dim) is seeded and holds the
-- repeated category_name + category_manager columns. dim_category and dim_product
-- (the snowflaked target: product_key, sku, product_name, category_key) exist but are empty.

-- Make the load re-runnable: clear the targets first (product references category, so delete it first).
DELETE FROM dim_product;
DELETE FROM dim_category;

-- 1. Build dim_category with one row per distinct category; let category_key auto-assign.
-- INSERT INTO dim_category (category_name, category_manager) ... FROM dim_product_wide;

-- 2. Rebuild dim_product to reference category_key instead of the repeated columns.
--    Match each wide product to its sub-dimension row to fetch the category_key.
-- INSERT INTO dim_product (product_key, sku, product_name, category_key) ...`,
    hints: [
      `Clear the targets first: \`DELETE FROM dim_product;\` then \`DELETE FROM dim_category;\`. Product references category, so delete the product rows first; a second run then reproduces the same rows.`,
      `Build the sub-dimension with \`INSERT INTO dim_category (category_name, category_manager) SELECT DISTINCT category_name, category_manager FROM dim_product_wide;\`. \`DISTINCT\` collapses the repeated categories to one row each, and \`category_key\` auto-assigns.`,
      `Rebuild the product dim by joining back on the shared attribute: \`SELECT w.product_key, w.sku, w.product_name, c.category_key FROM dim_product_wide w JOIN dim_category c ON c.category_name = w.category_name;\`. That swaps the repeated columns for a single \`category_key\`.`,
      `Do not forget \`DISTINCT\` on the category load. Without it \`dim_category\` gets one row per product, the join fans out, and your product grain doubles.`,
    ],
    referenceSolution: `DELETE FROM dim_product;
DELETE FROM dim_category;

INSERT INTO dim_category (category_name, category_manager)
SELECT DISTINCT category_name, category_manager
FROM dim_product_wide;

INSERT INTO dim_product (product_key, sku, product_name, category_key)
SELECT w.product_key, w.sku, w.product_name, c.category_key
FROM dim_product_wide w
JOIN dim_category c ON c.category_name = w.category_name;`,
    seedSql: `CREATE TABLE dim_product_wide (
  product_key      INTEGER PRIMARY KEY,
  sku              TEXT,
  product_name     TEXT,
  category_name    TEXT,
  category_manager TEXT
);
INSERT INTO dim_product_wide VALUES
  (1, 'SKU-EAR', 'Earbuds',    'Audio',   'Priya'),
  (2, 'SKU-HDP', 'Headphones', 'Audio',   'Priya'),
  (3, 'SKU-MON', 'Monitor',    'Video',   'Marco'),
  (4, 'SKU-CAM', 'Webcam',     'Video',   'Marco'),
  (5, 'SKU-SSD', 'SSD',        'Storage', 'Dana'),
  (6, 'SKU-HDD', 'HDD',        'Storage', 'Dana');

CREATE TABLE dim_category (
  category_key     INTEGER PRIMARY KEY,
  category_name    TEXT,
  category_manager TEXT
);
CREATE TABLE dim_product (
  product_key  INTEGER PRIMARY KEY,
  sku          TEXT,
  product_name TEXT,
  category_key INTEGER NOT NULL REFERENCES dim_category(category_key)
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "sub-dimension",
        name: "dim_category holds one row per distinct source category",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_category) <> (SELECT COUNT(DISTINCT category_name) FROM dim_product_wide) OR (SELECT COUNT(DISTINCT category_key) FROM dim_category) <> (SELECT COUNT(DISTINCT category_name) FROM dim_product_wide)`,
      },
      {
        suite: "sub-dimension",
        name: "one source of truth: no category_name appears twice in dim_category",
        isHidden: true,
        sql: `SELECT category_name FROM dim_category GROUP BY category_name HAVING COUNT(*) > 1`,
      },
      {
        suite: "grain",
        name: "every source product survived (product count preserved)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_product) <> (SELECT COUNT(*) FROM dim_product_wide)`,
      },
      {
        suite: "integrity",
        name: "zero orphan products: every category_key resolves to a dim_category row",
        isHidden: true,
        sql: `SELECT p.product_key FROM dim_product p LEFT JOIN dim_category c ON c.category_key = p.category_key WHERE c.category_key IS NULL`,
      },
      {
        suite: "integrity",
        name: "each product resolves to its original category and manager",
        isHidden: true,
        sql: `SELECT p.product_key FROM dim_product p JOIN dim_category c ON c.category_key = p.category_key JOIN dim_product_wide w ON w.product_key = p.product_key WHERE c.category_name <> w.category_name OR c.category_manager <> w.category_manager`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-snowflake-practice",
    prompt: `Write a load that fills \`revenue_by_manager(category_manager, total_revenue)\` with total revenue per \`category_manager\`. The snowflake \`fact_sales\` to \`dim_product\` to \`dim_category\` is seeded, and \`category_manager\` lives only on \`dim_category\`, so you must join \`fact_sales\` to \`dim_product\` (on \`product_key\`) to \`dim_category\` (on \`category_key\`) and \`GROUP BY c.category_manager\`. Expected output: two rows, \`Priya\` = 720 (she manages two categories) and \`Marco\` = 680. Lead with \`DELETE FROM revenue_by_manager;\` so the load re-runs cleanly.`,
    starterCode: `-- A snowflake is seeded: fact_sales -> dim_product -> dim_category.
-- The empty report table revenue_by_manager(category_manager, total_revenue) is waiting.

-- Make the load re-runnable: clear the report first.
DELETE FROM revenue_by_manager;

-- Revenue by category_manager needs both hops: fact_sales to dim_product to dim_category.
-- INSERT INTO revenue_by_manager (category_manager, total_revenue)
-- Total revenue with one row per manager.`,
    hints: [
      `\`category_manager\` is not on \`dim_product\`; it lives on \`dim_category\`. You need two joins: \`fact_sales\` to \`dim_product\` on \`product_key\`, then \`dim_product\` to \`dim_category\` on \`category_key\`.`,
      `Aggregate at the manager grain: \`GROUP BY c.category_manager\`, not \`GROUP BY p.category_key\`. Priya manages two categories, so grouping by category would split her into two rows that never combine.`,
      `Insert the result: \`INSERT INTO revenue_by_manager (category_manager, total_revenue) SELECT c.category_manager, SUM(f.revenue) FROM fact_sales f JOIN dim_product p ON p.product_key = f.product_key JOIN dim_category c ON c.category_key = p.category_key GROUP BY c.category_manager;\`.`,
    ],
    seedSql: `CREATE TABLE dim_category (
  category_key     INTEGER PRIMARY KEY,
  category_name    TEXT,
  category_manager TEXT
);
INSERT INTO dim_category VALUES
  (1, 'Audio',       'Priya'),
  (2, 'Accessories', 'Priya'),
  (3, 'Video',       'Marco');

CREATE TABLE dim_product (
  product_key  INTEGER PRIMARY KEY,
  sku          TEXT,
  product_name TEXT,
  category_key INTEGER NOT NULL REFERENCES dim_category(category_key)
);
INSERT INTO dim_product VALUES
  (1, 'SKU-EAR', 'Earbuds',    1),
  (2, 'SKU-HDP', 'Headphones', 1),
  (3, 'SKU-CAB', 'HDMI Cable', 2),
  (4, 'SKU-MON', 'Monitor',    3),
  (5, 'SKU-CAM', 'Webcam',     3);

CREATE TABLE fact_sales (
  sale_id     INTEGER PRIMARY KEY,
  product_key INTEGER NOT NULL REFERENCES dim_product(product_key),
  revenue     INTEGER
);
INSERT INTO fact_sales VALUES
  (1, 1, 100),
  (2, 1, 100),
  (3, 2, 300),
  (4, 3, 220),
  (5, 4, 400),
  (6, 5, 280);

CREATE TABLE revenue_by_manager (
  category_manager TEXT,
  total_revenue    INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "grain",
        name: "revenue_by_manager holds exactly one row per manager (two total)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM revenue_by_manager) <> 2`,
      },
      {
        suite: "grain",
        name: "no category_manager appears more than once",
        isHidden: true,
        sql: `SELECT category_manager FROM revenue_by_manager GROUP BY category_manager HAVING COUNT(*) > 1`,
      },
      {
        suite: "totals",
        name: "Priya rolls up both her categories to 720",
        sql: `SELECT 1 WHERE (SELECT total_revenue FROM revenue_by_manager WHERE category_manager = 'Priya') <> 720`,
      },
      {
        suite: "totals",
        name: "Marco totals 680",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT total_revenue FROM revenue_by_manager WHERE category_manager = 'Marco') <> 680`,
      },
      {
        suite: "totals",
        name: "report reconciles to total fact_sales revenue",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT COALESCE(SUM(total_revenue),0) FROM revenue_by_manager) <> (SELECT SUM(revenue) FROM fact_sales)`,
      },
    ],
  }),
}

const factTypes: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-fact-types",
  title: "Fact Table Types and Measure Additivity",
  summary:
    "Why summing a bank balance across days invents money, and how measure additivity decides which fact table roll-ups are legal.",
  estimatedMinutes: 20,
  difficulty: "medium",
  skills: [
    "fact table grain",
    "transaction fact",
    "periodic snapshot",
    "accumulating snapshot",
    "additive measures",
    "semi-additive measures",
    "non-additive measures",
    "ROW_NUMBER",
  ],
  teach: {
    estimatedMinutes: 9,
    markdown: `## Why "can I sum this column?" is a real question

Every warehouse metric is a \`SUM\`, \`AVG\`, or \`COUNT\` rolled up over some dimensions. The dangerous assumption is that any numeric column can be summed over any dimension. It cannot. Roll a bank balance up over time and you invent money that never existed. Additivity is the rule that tells you which aggregations are valid, and interviewers probe it because getting it wrong ships a dashboard that looks perfectly reasonable and is quietly wrong.

## Three fact tables, told apart by grain

A fact table's grain is what one row means. Three shapes cover almost everything:

- **Transaction fact**: one row per event (\`fact_sales\`, one row per line item). Its measures are fully additive: sum revenue across any dimension you like.
- **Periodic snapshot**: one row per entity per period (\`fact_daily_balance\`, one row per account per day). You capture a level at a point in time, not an event.
- **Accumulating snapshot**: one row per process instance, updated in place as it clears milestones. An order row carries \`order_date\`, \`ship_date\`, and \`deliver_date\`, and each column fills in as the order moves. You measure the lag between milestones.

## Three kinds of measure

- **Additive**: sum across all dimensions (revenue, quantity, order count).
- **Semi-additive**: sum across some dimensions but not time (account balance, inventory on hand, headcount). To collapse time, take the period-end value or an average, never a sum.
- **Non-additive**: never sum, not even across entities (ratios, percentages, unit prices). Recompute them from their additive parts.

## Worked example: a daily balance snapshot

\`fact_daily_balance\` holds two accounts over three days. The input table, the query, and its live result render below.

Balance is semi-additive. Summing across accounts on the latest day gives today's total assets, \`1200 + 900 = 2100\`, a real number. Summing the same column across all rows gives \`5900\`, which means nothing: it folds Monday's and Tuesday's money into Wednesday's total. Same column, one legal roll-up and one meaningless one, decided entirely by whether you crossed the time dimension.

## The trap interns hit

The classic warehouse bug is \`SUM(balance)\` over a date range on a periodic snapshot. It runs, returns a big confident number, and is wrong. The fix is to pick one row per entity first (each account's latest date via \`ROW_NUMBER\`), then sum those. For a non-additive measure the parallel trap is \`AVG\` of a per-row ratio: overall average order value is \`SUM(revenue) / SUM(order_count)\`, never \`AVG(revenue / order_count)\`, because averaging ratios weights a four-order day the same as a four-hundred-order day.

**Interview nuance:** when an interviewer hands you a \`daily_balance\` or \`inventory\` table and asks for a total, the answer they are listening for is "balances are semi-additive, so I take each entity's latest-period value and sum those, I never sum a balance across time."

**Recap:** transaction facts are fully additive; periodic snapshots are semi-additive (sum across entities, take period-end over time); accumulating snapshots track milestone lags; non-additive ratios get recomputed from additive parts. Additivity decides which aggregation is legal.`,
    demoCode: `SELECT
  'sum across accounts on the latest day (VALID)' AS calculation,
  SUM(balance)                                    AS result
FROM fact_daily_balance
WHERE date_key = (SELECT MAX(date_key) FROM fact_daily_balance)
UNION ALL
SELECT
  'sum across ALL days (MEANINGLESS)',
  SUM(balance)
FROM fact_daily_balance;`,
    demoSeedSql: `CREATE TABLE fact_daily_balance (
  account_key INTEGER,
  date_key    TEXT,
  balance     INTEGER
);
INSERT INTO fact_daily_balance VALUES
  (1, '2026-03-01', 1000),
  (1, '2026-03-02', 1500),
  (1, '2026-03-03', 1200),
  (2, '2026-03-01',  500),
  (2, '2026-03-02',  800),
  (2, '2026-03-03',  900);`,
    showDemoInput: true,
  },
  apply: scriptExercise({
    id: "sql-l4-fact-types-apply",
    prompt: `Write a script that fills the pre-created \`current_balance(account_key, balance)\` table with the CURRENT balance of every account: one row per account, holding that account's balance on its own LATEST \`date_key\`. \`balance\` is a semi-additive measure, so the current total is each account's most recent balance summed, not \`SUM(balance)\` over every row. Watch out: some accounts stop reporting before the newest date in the table, so you must use each account's own latest date, not the global maximum date. Expected result: three rows (accounts 1, 2, and 3) whose balances sum to a current total of 2800. The target is seeded empty; lead your load with \`DELETE FROM current_balance;\` so the script is safe to re-run.`,
    starterCode: `-- fact_daily_balance (account_key, date_key, balance) and the empty
-- current_balance (account_key, balance) table are already seeded.
DELETE FROM current_balance;   -- re-runnable: clear before you repopulate

-- Goal: one row per account = its balance on its LATEST date_key.
-- balance is SEMI-ADDITIVE, so never SUM it across time; pick the latest row per account.
-- INSERT INTO current_balance (account_key, balance)
-- For each account, keep only its most recent day's balance and load that single row.`,
    hints: [
      `The current total is each account's latest balance summed. First find each account's most recent \`date_key\`, which can differ from account to account, then read that day's balance.`,
      `\`ROW_NUMBER() OVER (PARTITION BY account_key ORDER BY date_key DESC)\` numbers each account's rows newest-first. Wrap that in a subquery and keep \`WHERE rn = 1\` to grab the latest row per account.`,
      `Do not \`SUM(balance)\` over the whole table or per account: that sums across time and inflates the total. The only sum that is valid happens when the grader adds up your one-row-per-account values.`,
      `Account 3 has no row on the newest date in the table, so a \`WHERE date_key = (SELECT MAX(date_key) ...)\` filter would silently drop it. Rank per account instead so each account keeps its own latest date.`,
    ],
    referenceSolution: `DELETE FROM current_balance;

INSERT INTO current_balance (account_key, balance)
SELECT account_key, balance
FROM (
  SELECT account_key, balance,
         ROW_NUMBER() OVER (PARTITION BY account_key ORDER BY date_key DESC) AS rn
  FROM fact_daily_balance
) ranked
WHERE rn = 1;`,
    seedSql: `DROP TABLE IF EXISTS fact_daily_balance;
CREATE TABLE fact_daily_balance (
  account_key INTEGER NOT NULL,
  date_key    TEXT NOT NULL,        -- ISO date 'YYYY-MM-DD'
  balance     INTEGER NOT NULL      -- end-of-day balance (semi-additive)
);
INSERT INTO fact_daily_balance (account_key, date_key, balance) VALUES
  (1, '2026-03-01', 1000), (1, '2026-03-02', 1500), (1, '2026-03-03', 1200),
  (2, '2026-03-01',  500), (2, '2026-03-02',  800), (2, '2026-03-03',  900),
  (3, '2026-03-01',  300), (3, '2026-03-02',  700);

DROP TABLE IF EXISTS current_balance;
CREATE TABLE current_balance (
  account_key INTEGER,
  balance     INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "current_balance holds exactly three rows (one per account)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM current_balance) <> 3`,
      },
      {
        suite: "grain",
        name: "each account appears at most once",
        sql: `SELECT account_key FROM current_balance GROUP BY account_key HAVING COUNT(*) > 1`,
      },
      {
        suite: "additivity",
        name: "current total balance is 2800 (each account's latest balance, summed)",
        sql: `SELECT 1 WHERE (SELECT SUM(balance) FROM current_balance) <> 2800`,
      },
      {
        suite: "additivity",
        name: "account 3, which stopped reporting before the newest date, is included at its latest balance 700",
        sql: `SELECT 1 WHERE COALESCE((SELECT balance FROM current_balance WHERE account_key = 3), -1) <> 700`,
      },
      {
        suite: "additivity",
        name: "account 1's current balance is its latest day (1200), not a sum across days",
        sql: `SELECT 1 WHERE COALESCE((SELECT balance FROM current_balance WHERE account_key = 1), -1) <> 1200`,
      },
      {
        suite: "additivity",
        name: "no account's balance equals its sum across all days (the semi-additive trap)",
        isHidden: true,
        sql: `SELECT cb.account_key FROM current_balance cb WHERE cb.balance = (SELECT SUM(f.balance) FROM fact_daily_balance f WHERE f.account_key = cb.account_key)`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-fact-types-practice",
    prompt: `Write a script that inserts exactly one row into the pre-created \`sales_report(metric, value)\` table: \`metric = 'overall_aov'\` and \`value\` = the overall average order value across all days in \`fact_daily_sales\`. Average order value is a NON-ADDITIVE measure, so recompute it from its additive parts: \`value = SUM(revenue) / SUM(order_count)\`, not \`AVG(revenue / order_count)\`. Force decimal division with \`* 1.0\` so integer truncation does not round the answer down. Expected result: one row whose \`value\` is about 111.76. The target is seeded empty; lead your load with \`DELETE FROM sales_report;\` so the script is safe to re-run.`,
    starterCode: `-- fact_daily_sales (day, revenue, order_count) and the empty
-- sales_report (metric, value) table are already seeded.
DELETE FROM sales_report;   -- re-runnable: clear before you repopulate

-- overall AOV is NON-ADDITIVE: recompute from additive parts, never AVG the per-day ratios.
-- Force decimal division with * 1.0 so integer division does not truncate.
-- INSERT INTO sales_report (metric, value)
-- Store one row: metric 'overall_aov' and the value computed by dividing the two summed totals.`,
    hints: [
      `Average order value is total revenue divided by total orders. Sum the two additive columns first, then divide the sums; do not average a per-row ratio.`,
      `\`AVG(revenue / order_count)\` is the trap: it weights every day equally and ignores how many orders each day had. Use \`SUM(revenue) * 1.0 / SUM(order_count)\` instead.`,
      `Both \`revenue\` and \`order_count\` are integers, so \`SUM(revenue) / SUM(order_count)\` does integer division and truncates 111.76 down to 111. Multiply by \`1.0\` (or \`CAST(... AS REAL)\`) before dividing.`,
      `The finished row is \`metric = 'overall_aov'\` with \`value\` about 111.76. Lead with \`DELETE FROM sales_report;\` so re-running the script is stable.`,
    ],
    seedSql: `DROP TABLE IF EXISTS fact_daily_sales;
CREATE TABLE fact_daily_sales (
  day         TEXT NOT NULL,       -- ISO date 'YYYY-MM-DD'
  revenue     INTEGER NOT NULL,    -- total revenue for the day (additive)
  order_count INTEGER NOT NULL     -- number of orders that day (additive)
);
INSERT INTO fact_daily_sales (day, revenue, order_count) VALUES
  ('2026-03-01', 1000, 8),
  ('2026-03-02',  600, 5),
  ('2026-03-03',  300, 4);

DROP TABLE IF EXISTS sales_report;
CREATE TABLE sales_report (
  metric TEXT,
  value  REAL                      -- store the ratio as a decimal, not an integer
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "sales_report holds exactly one row",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM sales_report) <> 1`,
      },
      {
        suite: "grain",
        name: "the single row is the overall_aov metric",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM sales_report WHERE metric = 'overall_aov') <> 1`,
      },
      {
        suite: "additivity",
        name: "overall AOV is about 111.76, recomputed as SUM(revenue)/SUM(order_count) from additive parts",
        sql: `SELECT 1 WHERE (SELECT ABS(value - (SELECT SUM(revenue) * 1.0 / SUM(order_count) FROM fact_daily_sales)) FROM sales_report WHERE metric = 'overall_aov') > 0.01`,
      },
      {
        suite: "additivity",
        name: "value keeps its decimals and is not integer-truncated to 111",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT value FROM sales_report WHERE metric = 'overall_aov') <= 111.5`,
      },
    ],
  }),
}

const dimensionPatterns: SqlLevel["modules"][number]["lessons"][number] = {
  id: "sql-l4-dimension-patterns",
  title: "Conformed, Role-Playing, Degenerate and Junk Dimensions",
  summary:
    "Model conformed, role-playing, degenerate, and junk dimensions, plus factless facts, the way data-engineering interviewers ask about them.",
  estimatedMinutes: 22,
  difficulty: "medium",
  skills: [
    "conformed dimension",
    "role-playing dimension",
    "junk dimension",
    "degenerate dimension",
    "factless fact table",
  ],
  teach: {
    estimatedMinutes: 9,
    markdown: `## Why conformed dimensions hold a warehouse together

An enterprise warehouse is many fact tables at once: \`fact_orders\`, \`fact_returns\`, \`fact_web_sessions\`. If each one invents its own idea of "customer" or "date", no two marts slice the same way and cross-mart numbers never reconcile. A **conformed dimension** fixes this: it is one shared table, like a single \`dim_date\` or \`dim_customer\`, that every fact joins to. Because they all reference the same rows, "revenue by month" from orders and "returns by month" from returns line up exactly. Kimball calls the grid of which facts share which conformed dimensions the **bus matrix**, and it is the backbone of a coherent warehouse.

Four more patterns show up on that same schema, and interviewers name them directly.

## Four patterns on one schema

**Role-playing dimension.** One physical dimension joined more than once under different meanings. An order has an order date and a ship date. You do not build two date tables. You join the single \`dim_date\` twice, once for the order role and once for the ship role, and each alias contributes its own columns.

**Degenerate dimension.** A dimension attribute with no dimension table. An \`order_number\` or \`invoice_number\` is a genuine attribute of a sale, but it has nothing to describe (no name, no category), so you store it directly on the fact and skip the \`dim\` table. The dimension has degenerated to a bare key sitting on the fact.

**Junk dimension.** Several low-cardinality flags, like \`is_gift\`, \`is_expedited\`, and \`is_first_order\`, folded into one small table of the **distinct combinations** that actually occur. The fact then carries a single \`flag_key\` instead of three separate boolean columns or three tiny foreign keys.

**Factless fact table.** A fact with no measures. It records that an event or relationship happened, like "student attended class" or "promotion covered product". There is nothing to sum, so you answer questions with \`COUNT(*)\` over the rows.

## Worked example: role-playing dim_date

\`\`\`sql
SELECT
  f.order_key,
  order_d.month AS order_month,
  ship_d.month  AS ship_month
FROM fact_orders f
JOIN dim_date order_d ON order_d.date_key = f.order_date_key
JOIN dim_date ship_d  ON ship_d.date_key  = f.ship_date_key;
\`\`\`

Order \`500\` was placed in month \`1\` and shipped in month \`2\`. The same \`dim_date\` supplies both months; the aliases \`order_d\` and \`ship_d\` are what give the two roles distinct meaning.

## Pitfalls

- **Duplicating a shared dimension.** Building a separate \`dim_ship_date\` next to \`dim_order_date\` forks one conformed dimension into two. Now a fiscal-calendar fix has to be applied twice and the copies drift apart. Join the single \`dim_date\` twice instead.
- **A tiny dimension per flag.** Giving \`is_gift\`, \`is_expedited\`, and \`is_first_order\` each its own dimension table (dimension explosion) bloats the schema with three one-column joins. Fold them into one junk dimension of the combinations that occur.

**Interview nuance:** conformed dimensions are what let two independently built marts be compared at all, so when asked "how do you make revenue and returns slice consistently by month", the answer is a single conformed \`dim_date\` that both facts join, not two lookalike date tables.`,
    demoCode: `SELECT
  f.order_key,
  order_d.month AS order_month,   -- dim_date in its "order date" role
  ship_d.month  AS ship_month,    -- SAME table, joined again in its "ship date" role
  f.revenue
FROM fact_orders f
JOIN dim_date order_d ON order_d.date_key = f.order_date_key
JOIN dim_date ship_d  ON ship_d.date_key  = f.ship_date_key
ORDER BY f.order_key;`,
    demoSeedSql: `CREATE TABLE dim_date (
  date_key  INTEGER PRIMARY KEY,
  full_date TEXT,
  year      INTEGER,
  month     INTEGER
);
INSERT INTO dim_date (date_key, full_date, year, month) VALUES
  (1, '2026-01-05', 2026, 1),
  (2, '2026-02-11', 2026, 2),
  (3, '2026-03-20', 2026, 3);

CREATE TABLE fact_orders (
  order_key      INTEGER PRIMARY KEY,
  order_date_key INTEGER,
  ship_date_key  INTEGER,
  revenue        INTEGER
);
INSERT INTO fact_orders (order_key, order_date_key, ship_date_key, revenue) VALUES
  (500, 1, 2, 250),
  (501, 1, 3, 400),
  (502, 2, 2, 150);`,
    showDemoInput: true,
  },
  apply: scriptExercise({
    id: "sql-l4-dimension-patterns-apply",
    prompt: `Write a load that fills \`order_month_report(order_key, order_month, ship_month)\` with one row per order, where \`order_month\` is the calendar month the order was placed and \`ship_month\` is the month it shipped. \`fact_orders(order_key, order_date_key, ship_date_key, revenue)\` carries two date keys, and both reference the single conformed \`dim_date(date_key, full_date, year, month)\`.

Fetch both months by joining \`dim_date\` **twice under different aliases** (an order role and a ship role), because one physical date table plays both roles. Lead with \`DELETE FROM order_month_report;\` so the load survives a re-run.

Expected rows: order \`101\` (placed in month \`1\`, shipped in month \`2\`) yields \`order_month = 1, ship_month = 2\`; order \`102\` yields \`1, 1\`; order \`103\` yields \`2, 3\`; order \`104\` yields \`2, 2\`.`,
    starterCode: `-- dim_date, fact_orders, and the empty order_month_report are seeded for you.
-- Make the load re-runnable: clear the target first.
DELETE FROM order_month_report;

-- Fetch both months by reading the single dim_date in two roles: an order role and a ship role.
-- INSERT INTO order_month_report (order_key, order_month, ship_month)
-- Pull order_month from the order-date lookup and ship_month from the ship-date lookup.`,
    hints: [
      `Lead with \`DELETE FROM order_month_report;\` so a second run doesn't double the rows.`,
      `The whole trick is joining the single \`dim_date\` twice under two aliases: \`JOIN dim_date order_d ON order_d.date_key = f.order_date_key\` and \`JOIN dim_date ship_d ON ship_d.date_key = f.ship_date_key\`.`,
      `Select \`order_d.month\` for \`order_month\` and \`ship_d.month\` for \`ship_month\`. Each alias contributes its own role's column.`,
      `Do not join \`dim_date\` only once. One join can only give you one date, so the ship month would just repeat the order month.`,
    ],
    referenceSolution: `DELETE FROM order_month_report;

INSERT INTO order_month_report (order_key, order_month, ship_month)
SELECT f.order_key, order_d.month, ship_d.month
FROM fact_orders f
JOIN dim_date order_d ON order_d.date_key = f.order_date_key
JOIN dim_date ship_d  ON ship_d.date_key  = f.ship_date_key;`,
    seedSql: `CREATE TABLE dim_date (
  date_key  INTEGER PRIMARY KEY,
  full_date TEXT,
  year      INTEGER,
  month     INTEGER
);
INSERT INTO dim_date (date_key, full_date, year, month) VALUES
  (1, '2026-01-05', 2026, 1),
  (2, '2026-01-20', 2026, 1),
  (3, '2026-02-02', 2026, 2),
  (4, '2026-02-15', 2026, 2),
  (5, '2026-03-10', 2026, 3);

CREATE TABLE fact_orders (
  order_key      INTEGER PRIMARY KEY,
  order_date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
  ship_date_key  INTEGER NOT NULL REFERENCES dim_date(date_key),
  revenue        INTEGER
);
INSERT INTO fact_orders (order_key, order_date_key, ship_date_key, revenue) VALUES
  (101, 1, 3, 200),
  (102, 2, 2, 150),
  (103, 3, 5, 300),
  (104, 4, 4, 120);

CREATE TABLE order_month_report (
  order_key   INTEGER PRIMARY KEY,
  order_month INTEGER,
  ship_month  INTEGER
);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "order_month_report has one row per order (four rows)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM order_month_report) <> 4`,
      },
      {
        suite: "order_role",
        name: "order_month matches the month of each order's order_date_key",
        sql: `SELECT r.order_key
        FROM order_month_report r
        JOIN fact_orders f ON f.order_key = r.order_key
        JOIN dim_date d ON d.date_key = f.order_date_key
        WHERE r.order_month <> d.month`,
      },
      {
        suite: "ship_role",
        name: "ship_month matches the month of each order's ship_date_key (needs the second join)",
        isHidden: true,
        sql: `SELECT r.order_key
        FROM order_month_report r
        JOIN fact_orders f ON f.order_key = r.order_key
        JOIN dim_date d ON d.date_key = f.ship_date_key
        WHERE r.ship_month <> d.month`,
      },
      {
        suite: "roles",
        name: "order 101 keeps its two roles distinct (order month 1, ship month 2)",
        isHidden: true,
        sql: `SELECT 1 WHERE (SELECT ship_month FROM order_month_report WHERE order_key = 101) <> 2
                 OR (SELECT order_month FROM order_month_report WHERE order_key = 101) <> 1`,
      },
    ],
  }),
  practice: scriptExercise({
    id: "sql-l4-dimension-patterns-practice",
    prompt: `Write a load that builds the junk dimension \`dim_order_flags(flag_key, is_gift, is_expedited, is_first_order)\` from \`fact_order\`, then backfills \`fact_order.flag_key\` to point at it. \`dim_order_flags\` must hold exactly one row per **distinct combination of the three flags that occurs** in \`fact_order\`, with \`flag_key\` auto-assigned. Then set each \`fact_order.flag_key\` to that order's matching combination.

The six seeded orders use four distinct flag combinations, so \`dim_order_flags\` ends with **4 rows**, every combination appears exactly once, and every \`fact_order.flag_key\` resolves to one of them (zero orphans). Lead with \`DELETE FROM dim_order_flags;\` and \`UPDATE fact_order SET flag_key = NULL;\` so the load re-runs cleanly.`,
    starterCode: `-- fact_order (with an empty flag_key column) and the empty dim_order_flags are seeded.
-- Make the load re-runnable: clear the dim and reset the backfilled key first.
DELETE FROM dim_order_flags;
UPDATE fact_order SET flag_key = NULL;

-- 1. Build the junk dim with one row per flag combination that actually occurs; let flag_key auto-assign.
-- INSERT INTO dim_order_flags (is_gift, is_expedited, is_first_order) ... FROM fact_order;

-- 2. Backfill fact_order.flag_key by matching all three flags to its dim row.
-- UPDATE fact_order SET flag_key = ... ;`,
    hints: [
      `Clear the targets first: \`DELETE FROM dim_order_flags;\` then \`UPDATE fact_order SET flag_key = NULL;\` so the load re-runs cleanly.`,
      `Build the dim with \`INSERT INTO dim_order_flags (is_gift, is_expedited, is_first_order) SELECT DISTINCT is_gift, is_expedited, is_first_order FROM fact_order;\`. \`DISTINCT\` keeps only the combinations that occur, and \`flag_key\` auto-assigns.`,
      `Do not omit \`DISTINCT\`. Without it every order gets its own row and the point of a junk dimension (one row per combination) is lost.`,
      `Backfill with a correlated \`UPDATE\`: set \`flag_key\` to the \`dim_order_flags.flag_key\` whose three flags all equal the order's \`is_gift\`, \`is_expedited\`, and \`is_first_order\`.`,
    ],
    seedSql: `CREATE TABLE dim_order_flags (
  flag_key       INTEGER PRIMARY KEY,
  is_gift        INTEGER,
  is_expedited   INTEGER,
  is_first_order INTEGER
);

CREATE TABLE fact_order (
  order_key      INTEGER PRIMARY KEY,
  is_gift        INTEGER NOT NULL,
  is_expedited   INTEGER NOT NULL,
  is_first_order INTEGER NOT NULL,
  flag_key       INTEGER
);
INSERT INTO fact_order (order_key, is_gift, is_expedited, is_first_order, flag_key) VALUES
  (1, 0, 0, 0, NULL),
  (2, 1, 0, 0, NULL),
  (3, 0, 1, 1, NULL),
  (4, 1, 1, 0, NULL),
  (5, 0, 0, 0, NULL),
  (6, 1, 0, 0, NULL);`,
    checkIdempotency: true,
    assertions: [
      {
        suite: "rows",
        name: "dim_order_flags has exactly one row per distinct flag combination (four rows)",
        sql: `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_order_flags) <> 4`,
      },
      {
        suite: "distinct",
        name: "no flag combination appears more than once in the junk dimension",
        sql: `SELECT is_gift, is_expedited, is_first_order
        FROM dim_order_flags
        GROUP BY is_gift, is_expedited, is_first_order
        HAVING COUNT(*) > 1`,
      },
      {
        suite: "backfill",
        name: "every fact_order.flag_key resolves to a dim_order_flags row (zero orphans)",
        sql: `SELECT f.order_key
        FROM fact_order f
        LEFT JOIN dim_order_flags d ON d.flag_key = f.flag_key
        WHERE f.flag_key IS NULL OR d.flag_key IS NULL`,
      },
      {
        suite: "backfill",
        name: "each fact_order.flag_key points at the row whose three flags match the order",
        isHidden: true,
        sql: `SELECT f.order_key
        FROM fact_order f
        JOIN dim_order_flags d ON d.flag_key = f.flag_key
        WHERE d.is_gift <> f.is_gift
           OR d.is_expedited <> f.is_expedited
           OR d.is_first_order <> f.is_first_order`,
      },
    ],
  }),
}

export const sqlLevel4: SqlLevel = {
  id: 4,
  slug: "engineering",
  title: "Level 4: Data Engineering with SQL",
  tagline:
    "Window functions, recursive CTEs, SCD, idempotent merge, data-quality: warehouse transforms.",
  defaultExecutionMode: "workspace",
  estimatedHours: 8,
  modules: [
    {
      id: "sql-l4-windows",
      title: "Module 4.1: Analytical SQL (Window Functions)",
      description:
        "Compute across related rows without collapsing them: ranking, period-over-period offsets, and running-total frames.",
      lessons: [windowRanking, windowOffset, windowFrames],
    },
    {
      id: "sql-l4-recursive",
      title: "Module 4.2: Recursive CTEs",
      description:
        "Walk self-referencing hierarchies (org charts, category trees) to produce depth and breadcrumb paths.",
      lessons: [recursiveCte],
    },
    {
      id: "sql-l4-warehouse-history",
      title: "Module 4.3: Warehouse Modeling and History",
      description:
        "Load a star schema and track change over time: surrogate keys, then SCD Type 1 overwrite and Type 2 history.",
      lessons: [starBuild, scdType1, scdType2],
    },
    {
      id: "sql-l4-dimensional-depth",
      title: "Module 4.3b: Dimensional Modeling in Depth",
      description:
        "Beyond the basic star: snowflake trade-offs, fact-table types and measure additivity, and the standard dimension patterns (conformed, role-playing, degenerate, junk).",
      lessons: [snowflake, factTypes, dimensionPatterns],
    },
    {
      id: "sql-l4-correctness",
      title: "Module 4.4: Pipeline Correctness",
      description:
        "The habits that separate a junior script from a production loader: deduplication and idempotent upsert/merge.",
      lessons: [dedup, idempotentMerge],
    },
    {
      id: "sql-l4-quality-capstone",
      title: "Module 4.5: Quality, Performance, and Capstone",
      description:
        "Guard and tune the pipeline: dbt-style data-quality assertions, EXPLAIN/indexes, and a capstone Type-2 SCD loader.",
      lessons: [dataQuality, explainPlan, capstone],
    },
  ],
}

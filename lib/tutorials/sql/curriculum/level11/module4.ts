/**
 * Data Engineering Level 11, Module 11.4 — Semantics, Text-to-SQL & the AI-Era Role.
 *
 * The level's close, and the course's. RESEARCH.md §4.4 is unusually specific about why the
 * semantic model is the lever: dbt Labs (Apr 2026) lifted Claude Sonnet 4.6 from 90.0% to 98.2%
 * and GPT-5.3-Codex from 84.1% to 100% purely by grounding generation in a semantic layer, while
 * raw text-to-SQL crawled 32.7% (2023) to 64.5% (2026); Spider 2.0 (ICLR 2025) scored an
 * o1-preview agent 91.2% on academic benchmarks against 21.3% on enterprise-realistic workflows;
 * Snowflake's Cortex Analyst went 57% to 78% on BIRD-SQL once a semantic model was attached; and
 * Omni (Apr 2026) found 81.2% of text-to-SQL failures are schema/semantic rather than syntax.
 * §4.5 supplies the role close (only ~5.2% of orgs run agents in production; 72% want AI-assisted
 * coding but only 24% trust it to manage pipelines; Gartner's 2028 MCP-without-a-semantic-layer
 * failure call), and §4.6 supplies the honesty: this is a differentiator, not intern-loop core.
 *
 * Device: the module makes the learner the human in the loop, in two moves. 11.4.1 hands them a
 * compiled semantic contract as a queryable metadata table (`semantic_metrics`, the shape a dbt
 * or Cortex semantic model compiles down to) beside the `orders` fact it governs, and grades
 * contract-faithful implementation. 11.4.2 keeps the same contract, adds the `order_items` child
 * table, and grades the review: the Apply reproduces 11.4.1's ground truth despite the tempting
 * join, and the Practice makes the learner reconstruct the AI's wrong query in a CTE and diff it
 * against the contract. Both lessons are single-file; nothing here mutates state, so there is
 * nothing for the workspace runner to make idempotent.
 *
 * Deliberate seed engineering, so a wrong answer cannot pass. The first two invariants are stated
 * as what the seed actually guarantees month by month, naming the months that catch each attack and
 * the months that deliberately hide it, because an editor who trims the wrong order opens a hole
 * silently:
 *  - dropping `status = 'complete'` changes January, March, and April. February is the deliberate
 *    hiding month: its non-complete orders are both cancelled and both fully refunded, so they net
 *    to zero, which is the realistic reason a missing filter can hide for one month and not the next;
 *  - summing gross instead of net changes January, February, and March, each of which carries a
 *    complete order with a nonzero refund. April is the deliberate hiding month here: its only
 *    complete order refunds nothing. That is not slack, it is half of what makes April the month
 *    where the AI's fanned-out number and the contract's number agree (see the fifth bullet);
 *  - cancelled orders are not uniformly fully refunded (o-1014 returns 180.00 of a 300.00 order),
 *    so `SUM(refund_usd)` over cancelled orders is 2180.00 while `SUM(gross_usd)` is 2300.00, and
 *    11.4.1's refund drill cannot be passed by summing whichever money column was already on screen;
 *  - February holds two cancelled orders (o-1008 and o-1015) against one in January and one in
 *    April, so 11.4.1's refund drill has a `cancelled_orders` column that actually grades: a
 *    literal 1 no longer passes. Both February cancellations belong to c-105, so
 *    `COUNT(DISTINCT customer_id)` returns 1 there and fails too. The column counts orders;
 *  - March gives customer c-101 two complete orders, so `COUNT(customer_id)` without DISTINCT
 *    diverges from `COUNT(DISTINCT customer_id)`;
 *  - April is the one month where the AI's join and the contract agree: its single complete order
 *    has exactly one line item (so nothing fans out), refunds nothing, and is the only complete
 *    order that month (so nothing is dropped). That single agreeing month is what makes 11.4.2's
 *    "keep only the months that disagree" predicate load-bearing instead of decorative;
 *  - the AI's number does not always land above the contract's. February's only order with line
 *    items has one line, while two other complete February orders have no lines at all and the
 *    inner join drops them, so the AI reads 1500.00 against the contract's 2775.00. That is what
 *    stops 11.4.2's closing `<>` from being swapped for `>`, and it is why the teach names the
 *    dropped-parent defect beside the fan-out defect;
 *  - two orders have line items that do not sum to `gross_usd`, one under (o-1006) and one over
 *    (o-1013), so the closing drill's `<>` cannot be swapped for `<` or for `>`.
 *
 * Deepens, not repeats. The nearest prior lesson is `sql-l5-join-fan-out-and-skew`, not L3 or L7:
 * L5 runs the same orders/order_items device, works the same "a three-item order contributes its
 * amount three times" example, animates the multiplication in a `join` csdiagram, and already
 * teaches grain-first pre-aggregation and the define-metric-once CTE. So fan-out as a MECHANISM is
 * taught; this module owes no re-teaching of it. The delta here is that fan-out arrives as a review
 * finding against a written contract rather than as a query bug handed over as a bug: the learner
 * is given a plausible query nobody labelled wrong, has to decide it is wrong by reading the
 * contract, and then has to prove it in SQL. L3's join cardinality and L7's dimensional grain are
 * the other neighbours, and neither grades a metric CONTRACT either. That proof is the deliverable.
 *
 * Deliberate map deviation, the closing framing. The map has 11.4.2 "reprise the level-intro
 * framing" that module 11.1's opening lesson states verbatim, but 11.1 and 11.2 are deferred and do
 * not ship, so there is no intro to reprise. The honest differentiator-not-interview-core note is
 * therefore stated standalone here rather than as a callback to a lesson the learner never saw.
 *
 * Deliberate map deviation, 11.4.2's live demo. The map specifies no demo for this lesson. One is
 * shipped anyway, and NOT on the grounds that fan-out has to be seen once (L5 already showed it,
 * animated). It is shipped because this lesson's claim is the specific one that THIS AI query
 * inflates THIS contract's measure, and the demo makes that concrete per order: it joins orders to
 * order_items and shows each order's row count beside its gross after the join. Deliberately not
 * retargeted to show the AI's monthly total beside the contract's, which is the closing Practice's
 * answer minus a subtraction and would hand over most of the exercise. Per-order row counts leave
 * both graded exercises intact (the Apply is a monthly rollup, the Practice a month-level diff).
 *
 * Deliberate map deviation, 11.4.2's closing drill. The map asks for the "count of orders whose
 * item sum disagrees with gross_usd", which grades as the single scalar row (2). A scalar is the
 * weakest surface in the module and it sits on the module's only hard drill: `SELECT 2` passes it.
 * The drill therefore returns the offending rows themselves, `(order_id, gross_usd, item_total)`
 * ordered by `order_id`. Same `HAVING`, same reasoning, but the wrong-direction attempt now fails
 * visibly on content: `<` returns o-1006 alone and `>` returns o-1013 alone.
 *
 * Every single-file `expected` set is generated by running the reference SELECT through the SAME
 * self-hosted sql.js WASM the app ships (scratchpad sqlgen/gen.mjs), never hand-typed. Content
 * rules: no em dashes in learner prose; every prompt leads with the deliverable; money columns
 * state an explicit ROUND so grading never depends on summation order.
 */
import type { SqlLevel, SqlModule } from "@/lib/tutorials/types"

type SqlLesson = SqlLevel["modules"][number]["lessons"][number]

// ---------------------------------------------------------------------------
// Shared seeds for Module 11.4. `orders` is the governed fact table, `semantic_metrics` is the
// contract compiled to metadata (the row shape a dbt or Cortex semantic model reduces to), and
// `order_items` is the child table whose join is the trap in 11.4.2.
// ---------------------------------------------------------------------------

const ORDERS_SEED = `CREATE TABLE orders (
  order_id    TEXT,
  customer_id TEXT,
  order_dt    TEXT,     -- ISO timestamp; the month grain comes from strftime over this
  status      TEXT,     -- complete | cancelled | pending
  gross_usd   REAL,
  refund_usd  REAL      -- refunded back to the customer; 0.00 when nothing was returned
);
INSERT INTO orders (order_id, customer_id, order_dt, status, gross_usd, refund_usd) VALUES
  ('o-1001', 'c-101', '2026-01-05 09:14:00', 'complete',  1200.00,    0.00),
  ('o-1002', 'c-102', '2026-01-11 16:02:00', 'complete',   840.50,  150.50),
  ('o-1003', 'c-101', '2026-01-19 11:38:00', 'cancelled',  500.00,  500.00),
  ('o-1004', 'c-103', '2026-01-27 08:55:00', 'pending',    640.25,    0.00),
  ('o-1005', 'c-102', '2026-02-03 13:21:00', 'complete',   950.00,    0.00),
  ('o-1006', 'c-104', '2026-02-09 10:07:00', 'complete',  1500.00,  300.00),
  ('o-1007', 'c-103', '2026-02-17 15:44:00', 'complete',   700.00,   75.00),
  ('o-1008', 'c-105', '2026-02-24 09:30:00', 'cancelled', 1100.00, 1100.00),
  ('o-1015', 'c-105', '2026-02-27 10:05:00', 'cancelled',  400.00,  400.00),
  ('o-1009', 'c-101', '2026-03-04 12:12:00', 'complete',  2000.00,    0.00),
  ('o-1010', 'c-105', '2026-03-12 17:49:00', 'complete',   460.00,   60.00),
  ('o-1011', 'c-102', '2026-03-20 07:26:00', 'pending',    880.00,    0.00),
  ('o-1012', 'c-101', '2026-03-28 14:03:00', 'complete',  1300.00,    0.00),
  ('o-1013', 'c-103', '2026-04-06 11:11:00', 'complete',   900.00,    0.00),
  ('o-1014', 'c-106', '2026-04-15 18:37:00', 'cancelled',  300.00,  180.00);`

const SEMANTIC_METRICS_SEED = `CREATE TABLE semantic_metrics (
  metric_name     TEXT,
  grain           TEXT,     -- the time grain the metric is defined at
  definition      TEXT,     -- the exact expression the contract compiles to
  required_filter TEXT      -- the predicate every implementation must apply
);
INSERT INTO semantic_metrics (metric_name, grain, definition, required_filter) VALUES
  ('net_revenue',      'monthly', 'SUM(gross_usd - refund_usd)',  'status = ''complete'''),
  ('gross_revenue',    'monthly', 'SUM(gross_usd)',               'status = ''complete'''),
  ('active_customers', 'monthly', 'COUNT(DISTINCT customer_id)',  'status = ''complete'''),
  ('refund_exposure',  'monthly', 'SUM(refund_usd)',              'status = ''cancelled''');`

const ORDER_ITEMS_SEED = `CREATE TABLE order_items (
  order_id TEXT,
  item_id  TEXT,
  item_usd REAL   -- the line's own price; the lines do not always sum to the order's gross
);
INSERT INTO order_items (order_id, item_id, item_usd) VALUES
  ('o-1001', 'it-9001', 400.00),
  ('o-1001', 'it-9002', 400.00),
  ('o-1001', 'it-9003', 400.00),
  ('o-1003', 'it-9004', 250.00),
  ('o-1003', 'it-9005', 250.00),
  ('o-1006', 'it-9006', 900.00),
  ('o-1009', 'it-9008', 1200.00),
  ('o-1009', 'it-9009', 800.00),
  ('o-1013', 'it-9010', 940.00);`

/** The governed fact table beside its compiled contract (lesson 11.4.1). */
const CONTRACT_SEED = ORDERS_SEED + "\n" + SEMANTIC_METRICS_SEED

/**
 * The same fact table and the same contract, plus the child table whose join is the trap
 * (lesson 11.4.2). `semantic_metrics` is carried over deliberately: the Apply prompt says the
 * contract has not changed and the teach quotes its `status = 'complete'` filter, so the contract
 * has to still be in the learner's database when they are asked to enforce it.
 */
const REVIEW_SEED = ORDERS_SEED + "\n" + SEMANTIC_METRICS_SEED + "\n" + ORDER_ITEMS_SEED

// ---------------------------------------------------------------------------
// Module 11.4 — Semantics, Text-to-SQL & the AI-Era Role
// ---------------------------------------------------------------------------

const semanticModels: SqlLesson = {
  id: "de-l11-semantic-models",
  title: "Semantic Models: the Text-to-SQL Accuracy Lever",
  summary:
    "A governed semantic layer, not a bigger model, is the largest accuracy lever on AI-written SQL, and the data engineer is who authors that contract.",
  estimatedMinutes: 29,
  difficulty: "medium",
  skills: [
    "semantic layers",
    "governed metric definitions",
    "metric drift",
    "join-path contracts",
    "text-to-SQL grounding",
    "SUM with filters",
    "strftime date grain",
  ],
  teach: {
    estimatedMinutes: 13,
    markdown: `## The model is not the lever

The obvious way to make an AI write better SQL is to buy a better model. The measurements say otherwise, and the gap is not subtle.

- dbt Labs published a text-to-SQL benchmark in April 2026. Grounding generation in a semantic layer lifted Claude Sonnet 4.6 from **90.0% to 98.2%** and GPT-5.3-Codex from **84.1% to 100%**. Raw text-to-SQL over a bare schema, meanwhile, improved from only 32.7% in 2023 to 64.5% in 2026 across three years of model releases.
- Spider 2.0 (ICLR 2025) ran an o1-preview agent against two suites: **91.2%** on academic benchmarks, **21.3%** on enterprise-realistic workflows. Same model, two benchmark suites. The difference was the messiness and ungoverned meaning of a real warehouse.
- Snowflake reported Cortex Analyst moving from **57% to 78%** on BIRD-SQL once a semantic model was attached.

Three independent teams, one conclusion: the context you hand the generator moves accuracy far more than the generator does. That context is an artifact, somebody authors it, and on most teams that somebody is a data engineer.

## What a semantic model actually contains

A semantic model (dbt calls it a semantic layer, Snowflake a semantic model, Looker a LookML model) is a contract that names the business meaning of your tables. It is authored as a versioned text spec, YAML in dbt and in the OSI standard, LookML in Looker, then compiled and served to both dashboards and generators.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["contract element", "what it pins down", "the drift it prevents"],
  "rows": [
    ["logical table", "which physical table a metric reads", "one team on orders, another on orders_v2"],
    ["grain", "one row per what, in which time bucket", "daily rows summed into a monthly chart twice"],
    ["metric definition", "the exact expression, gross minus refunds", "revenue meaning gross in one deck and net in the next"],
    ["required filter", "the predicate every implementation applies", "cancelled and pending orders counted as sales"],
    ["join path", "the one approved way to reach another table", "a fan-out join that multiplies the measure"],
    ["verified query", "a known-good answer to a known question", "the generator inventing a shape nobody checked"]
  ],
  "highlightCols": ["the drift it prevents"],
  "caption": "A semantic model is a contract. Each element removes one degree of freedom the generator would otherwise guess at."
}
\`\`\`

In January 2026 the **Open Semantic Interchange (OSI) v1.0** specification landed, led by Snowflake with dbt Labs, Databricks, and Microsoft among the contributors, so that one metric definition can be shared across vendors instead of re-authored per tool. That is the direction of travel: the definition is becoming a portable asset, not a setting inside a BI tool.

## Metric drift is the failure it kills

Omni's April 2026 analysis found **81.2% of text-to-SQL failures are schema or semantic, not syntax**. The headline symptom has a name: **metric drift**, which is the same question producing different revenue numbers depending on who asked and which tool answered.

Drift is not an AI problem. It predates AI by decades. Finance defines revenue as complete orders net of refunds; the growth dashboard sums everything with a dollar sign on it including pending carts; a Monday morning is then spent reconciling two numbers that were never the same metric. What AI changed is the blast radius, because a generator will happily produce forty variants of that query per day instead of one per quarter.

The contract fixes it by making the definition the thing you implement, not the thing you infer. When \`net_revenue\` says grain \`monthly\`, definition \`SUM(gross_usd - refund_usd)\`, required filter \`status = 'complete'\`, there is exactly one correct query, and both the human and the generator are graded against it.

## Reading the contract, then implementing it

Below, the contract is a queryable table. That is not a teaching shortcut: a compiled semantic model IS metadata, and the platforms that serve one expose it exactly this way so tools can read it. Your job in the exercises is the data engineer's half of the loop, which is to turn a contract row into the query it describes. In SQLite the month grain comes from \`strftime('%Y-%m', order_dt)\`, and the required filter goes in the \`WHERE\` clause where it belongs.

**Common mistake:** implementing the definition but skipping the required filter. \`SUM(gross_usd - refund_usd)\` over every row is a real number, it is just not \`net_revenue\`. A metric is the expression AND its filter AND its grain, and dropping any one of the three produces a query that runs, returns plausible dollars, and is wrong.

**Interview nuance:** if you are asked how you would make an AI assistant reliable on your warehouse, the answer that lands is "ground it in a semantic layer, because the benchmarks say context beats model choice," followed by naming what the layer holds: metrics with exact filters, predefined join paths, verified queries. Only about 5% of teams have a semantic model while 89% report modeling pain, so being the junior who can author and implement metric contracts is unusually visible.

> **On a real platform this differs.** Here the contract is four rows in a SQLite table you read by eye. In production it is YAML in a dbt project compiled by MetricFlow, or a Cortex semantic model file, version-controlled beside the transformations and served through an API that dashboards and generators both call. The reasoning is identical: find the metric row, read its grain, definition, and required filter, and implement exactly that.`,
    demoSeedSql: CONTRACT_SEED,
    demoCode: `-- The semantic contract itself, as the platform stores it: one row per governed metric.
SELECT metric_name, grain, definition, required_filter
FROM semantic_metrics
ORDER BY metric_name;`,
    showDemoInput: false,
  },
  apply: {
    id: "de-l11-semantic-models-apply",
    executionMode: "single-file",
    prompt: `Write a query that returns monthly \`net_revenue\` exactly as the semantic contract defines it, as \`(month, net_revenue)\`, earliest month first, over \`orders(order_id, customer_id, order_dt, status, gross_usd, refund_usd)\`.

The contract row for \`net_revenue\` gives grain \`monthly\`, definition \`SUM(gross_usd - refund_usd)\`, and required filter \`status = 'complete'\`. Build the month with \`strftime('%Y-%m', order_dt)\`, alias the columns exactly \`month\` and \`net_revenue\`, and round the revenue to 2 decimals.`,
    starterCode: `-- Monthly net_revenue, implemented exactly as the semantic contract defines it.
SELECT
  -- one row per month holding that month's contract-defined net revenue
FROM orders;`,
    hints: [
      "`strftime('%Y-%m', order_dt) AS month` turns a timestamp into the contract's monthly grain.",
      "The required filter is a plain `WHERE status = 'complete'`, applied before the grouping.",
      "`ROUND(SUM(gross_usd - refund_usd), 2) AS net_revenue`, then `GROUP BY month` and `ORDER BY month`.",
    ],
    referenceSolution: `SELECT strftime('%Y-%m', order_dt) AS month,
       ROUND(SUM(gross_usd - refund_usd), 2) AS net_revenue
FROM orders
WHERE status = 'complete'
GROUP BY month
ORDER BY month;`,
    singleFile: {
      seedSql: CONTRACT_SEED,
      orderMatters: true,
      assertColumnNames: true,
      expected: {
        columns: ["month", "net_revenue"],
        rows: [
          ["2026-01", 1890],
          ["2026-02", 2775],
          ["2026-03", 3700],
          ["2026-04", 900],
        ],
      },
    },
  },
  practice: {
    id: "de-l11-semantic-models-practice",
    executionMode: "single-file",
    prompt: `Write a query that returns monthly \`active_customers\` exactly as the semantic contract defines it, as \`(month, active_customers)\`, earliest month first, over the same \`orders\` table.

The contract row for \`active_customers\` gives grain \`monthly\`, definition \`COUNT(DISTINCT customer_id)\`, and required filter \`status = 'complete'\`. Alias the columns exactly \`month\` and \`active_customers\`.`,
    starterCode: `-- Monthly active_customers, implemented exactly as the semantic contract defines it.
SELECT
  -- one row per month holding that month's contract-defined active customer count
FROM orders;`,
    hints: [
      "Same month grain as the Apply: `strftime('%Y-%m', order_dt) AS month`.",
      "The definition counts customers, not orders, so `DISTINCT` inside the `COUNT` is load-bearing here.",
      "The required filter is the same one `net_revenue` uses.",
    ],
    singleFile: {
      seedSql: CONTRACT_SEED,
      orderMatters: true,
      assertColumnNames: true,
      expected: {
        columns: ["month", "active_customers"],
        rows: [
          ["2026-01", 2],
          ["2026-02", 3],
          ["2026-03", 2],
          ["2026-04", 1],
        ],
      },
    },
  },
  extraPractice: [
    {
      id: "de-l11-semantic-models-drill-1",
      executionMode: "single-file",
      prompt: `**Easy.** Write a query that returns \`refund_exposure\` exactly as the semantic contract defines it, as \`(month, cancelled_orders, refund_usd)\`, earliest month first, over \`orders\`. Round \`refund_usd\` to 2 decimals.

The contract row for \`refund_exposure\` gives grain \`monthly\`, definition \`SUM(refund_usd)\`, and required filter \`status = 'cancelled'\`. Report the count of cancelled orders beside it as \`cancelled_orders\`.`,
      starterCode: `-- Monthly refund exposure per the contract: cancelled orders only, and the dollars returned on them.
SELECT
  -- one row per month holding that month's cancelled-order count and the dollars returned
FROM orders;`,
      hints: [
        "The contract's `refund_exposure` metric is monthly and filtered to `status = 'cancelled'`, so this is the same shape as the Apply with a different filter.",
        "`COUNT(*) AS cancelled_orders` beside `ROUND(SUM(refund_usd), 2) AS refund_usd`. A cancelled order is not always refunded in full, so the refund column is not the gross column.",
        "The count is of orders, not customers: one customer cancelled twice in the same month, so `COUNT(DISTINCT customer_id)` would undercount that month.",
      ],
      referenceSolution: `SELECT strftime('%Y-%m', order_dt) AS month,
       COUNT(*) AS cancelled_orders,
       ROUND(SUM(refund_usd), 2) AS refund_usd
FROM orders
WHERE status = 'cancelled'
GROUP BY month
ORDER BY month;`,
      singleFile: {
        seedSql: CONTRACT_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["month", "cancelled_orders", "refund_usd"],
          rows: [
            ["2026-01", 1, 500],
            ["2026-02", 2, 1500],
            ["2026-04", 1, 180],
          ],
        },
      },
    },
    {
      id: "de-l11-semantic-models-drill-2",
      executionMode: "single-file",
      prompt: `**Medium.** Write a query that returns gross and net revenue side by side per month as \`(month, gross_revenue, net_revenue)\`, earliest month first, over \`orders\`. Both metrics carry the contract's \`status = 'complete'\` filter. Round both money columns to 2 decimals.

This is the drift demo: two dashboards showing these two columns and both calling them "revenue" is how a reconciliation meeting starts.`,
      starterCode: `-- Gross and net revenue per month, the two numbers people argue about.
SELECT
FROM orders;`,
      hints: [
        "`gross_revenue` is `ROUND(SUM(gross_usd), 2)`; `net_revenue` subtracts `refund_usd` inside the same `SUM`.",
        "One `WHERE status = 'complete'` covers both columns, then `GROUP BY month` and `ORDER BY month`.",
      ],
      referenceSolution: `SELECT strftime('%Y-%m', order_dt) AS month,
       ROUND(SUM(gross_usd), 2) AS gross_revenue,
       ROUND(SUM(gross_usd - refund_usd), 2) AS net_revenue
FROM orders
WHERE status = 'complete'
GROUP BY month
ORDER BY month;`,
      singleFile: {
        seedSql: CONTRACT_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["month", "gross_revenue", "net_revenue"],
          rows: [
            ["2026-01", 2040.5, 1890],
            ["2026-02", 3150, 2775],
            ["2026-03", 3760, 3700],
            ["2026-04", 900, 900],
          ],
        },
      },
    },
  ],
}

const reviewingAiSql: SqlLesson = {
  id: "de-l11-reviewing-ai-sql",
  title: "Reviewing AI-Written SQL, and What Appreciates in the AI Era",
  summary:
    "A generated query can parse perfectly and still be wrong, so review every one for grain, filters, join fan-out and contract match before trusting it.",
  estimatedMinutes: 31,
  difficulty: "hard",
  skills: [
    "AI-SQL review judgment",
    "semantic vs syntax errors",
    "join fan-out detection",
    "metric contract enforcement",
    "discrepancy queries",
    "CTE comparison",
    "human-in-the-loop rigor",
  ],
  teach: {
    estimatedMinutes: 14,
    markdown: `## Correct syntax, wrong meaning

Omni's April 2026 analysis of text-to-SQL failures put **81.2% of them in the schema and semantic bucket**, not the syntax bucket. That statistic describes a specific and uncomfortable experience: the query runs, the numbers look like money, the chart renders, and every figure is wrong.

Here is the query an assistant produced when asked for "monthly revenue" against the schema from the previous lesson.

\`\`\`sql
-- What the assistant wrote. Every line parses. Every number is wrong.
SELECT strftime('%Y-%m', o.order_dt) AS month,
       SUM(o.gross_usd) AS revenue
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
GROUP BY month
ORDER BY month;
\`\`\`

Four defects, none of them a syntax error.

1. **The join fans out.** \`order_items\` has one row per line item, so joining it multiplies each order row by its item count. An order of three items contributes its gross **three times**. This is the single most common way a generated aggregate is silently inflated, and it is invisible unless you know the child table's cardinality.
2. **The same join silently drops orders.** It is an inner join, so any order with no line item at all vanishes from the result. Fan-out inflates the months full of multi-item orders and the dropped parents deflate the months full of item-less ones, which is why you cannot assume a fanned-out number is simply too big. It can land on either side of the truth, and in this data one month lands on each side.
3. **The required filter is missing.** The contract says \`status = 'complete'\`. Cancelled and pending orders are being counted as revenue.
4. **It reports gross, not net.** The contract defines \`net_revenue\` as \`SUM(gross_usd - refund_usd)\`. Refunds never leave the number.

Defects 1 and 2 are the reason a review is a query rather than an opinion. Two errors pointing in opposite directions can cancel to something that looks plausible, so the only way to know the size of the damage is to compute both numbers and subtract.

Notice that the join was not even needed. Nothing in the request required a line item. The generator reached for a related table because the schema said the tables were related, which is exactly the guess a semantic model's predefined join paths exist to remove.

## The four checks

Reviewing generated SQL is a repeatable procedure, and it is the durable half of this skill because it works on a colleague's query, on your own at 6pm, and on anything a model writes next year.

\`\`\`csdiagram
{
  "type": "pipeline",
  "stages": [
    { "label": "Grain", "note": "one row per what?" },
    { "label": "Filters", "note": "is every required predicate present?" },
    { "label": "Fan-out", "note": "does a join multiply the measure?" },
    { "label": "Contract", "note": "does it match the metric definition?" }
  ],
  "highlight": ["Fan-out"],
  "caption": "Run these four checks on every generated query, in this order. Three of the four are invisible to a syntax check."
}
\`\`\`

The fan-out check has a fast field test: count the rows before and after the join. If the row count grew, any \`SUM\` of a parent-table column grew with it. If it shrank, parents without a matching child were dropped and the same \`SUM\` is now too small. When you genuinely need both the parent measure and the child detail, aggregate the child first in a CTE and join one row to one row, or use a correlated subquery. Do not aggregate across a fanned-out result and hope.

The strongest form of a review is not an opinion, it is a query. If you can produce the months where the suspect number and the contract number disagree, and the size of each gap, the conversation is over in one message. That is the closing exercise of this course.

## What commoditizes, and what appreciates

Writing SQL is being automated in public. dbt Copilot reached GA in March 2025; Databricks shipped Assistant, Genie Code, and Lakeflow through spring 2026, with a cited benchmark moving coding-agent success from **32.1% to 77.1%** once Genie Code was in the loop. Treating "I can write a window function" as your differentiator is a losing bet.

What appreciates is everything the generator cannot do because it does not know your business: modeling and grain decisions, data quality, cost governance, and review judgment. The adoption data says the market agrees. Only about **5.2% of organizations run AI agents in production**. **72% want AI-assisted coding, but only 24% trust AI to manage pipelines.** Gartner expects **60% of agentic analytics projects that rely on MCP alone without a semantic layer to fail by 2028**.

Read the gap between 72 and 24 carefully, because it is a job description. Closing it requires reasoning traces, auditable logs, human-in-the-loop checkpoints, and eval harnesses. That is more engineering rigor, not less, and it is rigor of a kind this course has been teaching since the first idempotent pipeline.

One honest closing note about this whole level. None of the AI-era material is intern-loop core yet. A 2,817-report corpus of mainstream data-engineering interviews contains zero RAG or vector questions, and fundamentals still gate the hire. But 2026 job descriptions ask for it, AI-native startups test it, and it all compounds on the fundamentals rather than replacing them.

**Common mistake:** trusting a query because it executed and returned plausible numbers. Execution proves the syntax, nothing more. The three defects above all survive execution, and two of them survive a code review that only reads the query without knowing the contract.

**Interview nuance:** "here is a query our AI assistant wrote, review it" is entering loops at AI-forward companies, and the fan-out plus missing-filter combination is the archetypal planted bug. Say the checks out loud as you read: grain, filters, fan-out, contract. Then offer to prove it with a diff query rather than asserting it, because that is what a senior reviewer actually does.

> **On a real platform this differs.** Here you diff two CTEs in SQLite. In production the same reasoning is a reconciliation test in dbt or a data-diff job comparing a candidate model against the governed metric, wired into CI so a query that disagrees with the contract fails the pull request instead of reaching a dashboard. The query you are about to write is that test, minus the scheduler.`,
    demoSeedSql: REVIEW_SEED,
    demoCode: `-- Fan-out, made visible: joining order_items repeats each order once per line item,
-- so a SUM of the ORDER's gross counts that order once per item.
SELECT o.order_id, o.status, o.gross_usd,
       COUNT(i.item_id) AS joined_rows,
       ROUND(SUM(o.gross_usd), 2) AS gross_after_join
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
GROUP BY o.order_id, o.status, o.gross_usd
ORDER BY gross_after_join DESC, o.order_id;`,
    showDemoInput: false,
  },
  apply: {
    id: "de-l11-reviewing-ai-sql-apply",
    executionMode: "single-file",
    prompt: `Write the corrected query the assistant should have written: monthly \`net_revenue\` per the semantic contract, as \`(month, net_revenue)\`, earliest month first, over \`orders(order_id, customer_id, order_dt, status, gross_usd, refund_usd)\` and \`order_items(order_id, item_id, item_usd)\`.

The contract has not changed: grain \`monthly\`, definition \`SUM(gross_usd - refund_usd)\`, required filter \`status = 'complete'\`. Your numbers must be identical to the contract's own implementation no matter what \`order_items\` contains. Alias the columns exactly \`month\` and \`net_revenue\`, and round the revenue to 2 decimals.`,
    starterCode: `-- The corrected query: monthly net_revenue, faithful to the contract.
SELECT
  -- one row per month, immune to whatever order_items holds
FROM orders;`,
    hints: [
      "Work the checks in order. The contract's grain is one row per order per month, so ask what the join does to that grain before you write it.",
      "`order_items` contributes nothing the metric needs, and joining it multiplies each order's gross by its line count, so the fix is to leave it out of the aggregation entirely.",
      "That leaves the same shape as the previous lesson: filter `status = 'complete'`, `ROUND(SUM(gross_usd - refund_usd), 2) AS net_revenue`, grouped and ordered by `strftime('%Y-%m', order_dt) AS month`.",
    ],
    referenceSolution: `SELECT strftime('%Y-%m', order_dt) AS month,
       ROUND(SUM(gross_usd - refund_usd), 2) AS net_revenue
FROM orders
WHERE status = 'complete'
GROUP BY month
ORDER BY month;`,
    singleFile: {
      seedSql: REVIEW_SEED,
      orderMatters: true,
      assertColumnNames: true,
      expected: {
        columns: ["month", "net_revenue"],
        rows: [
          ["2026-01", 1890],
          ["2026-02", 2775],
          ["2026-03", 3700],
          ["2026-04", 900],
        ],
      },
    },
  },
  practice: {
    id: "de-l11-reviewing-ai-sql-practice",
    executionMode: "single-file",
    prompt: `Write a query that proves the assistant's query is wrong: return every month where its number disagrees with the contract's \`net_revenue\`, as \`(month, ai_revenue, contract_revenue, diff_usd)\`, ordered by \`diff_usd\` from highest to lowest, over \`orders\` and \`order_items\`.

The assistant's query was \`SELECT strftime('%Y-%m', o.order_dt), SUM(o.gross_usd) FROM orders o JOIN order_items i ON i.order_id = o.order_id GROUP BY 1\`. Reproduce that number as \`ai_revenue\`, put the contract's \`net_revenue\` beside it as \`contract_revenue\`, and report \`diff_usd\` as \`ai_revenue - contract_revenue\`. Keep only the months where the two disagree, in either direction, and round every money column to 2 decimals.

This is the closing exercise of the course. Reconstructing someone else's wrong query in order to disprove it is the entire skill, so nothing here is scaffolded for you.`,
    starterCode: `-- Prove it: the months where the assistant's number and the contract's number disagree.
SELECT
FROM orders;`,
    hints: [],
    singleFile: {
      seedSql: REVIEW_SEED,
      orderMatters: true,
      assertColumnNames: true,
      expected: {
        columns: ["month", "ai_revenue", "contract_revenue", "diff_usd"],
        rows: [
          ["2026-01", 4600, 1890, 2710],
          ["2026-03", 4000, 3700, 300],
          ["2026-02", 1500, 2775, -1275],
        ],
      },
    },
  },
  extraPractice: [
    {
      id: "de-l11-reviewing-ai-sql-drill-1",
      executionMode: "single-file",
      prompt: `**Hard.** Write a query that returns every order whose line items do not sum to the order's own \`gross_usd\`, as \`(order_id, gross_usd, item_total)\`, ordered by \`order_id\`, over \`orders\` and \`order_items\`. Round both money columns to 2 decimals.

Only orders that actually have line items count, and a line total above the gross is as much a mismatch as one below it. Reporting the two numbers side by side is the point: a reviewer who says "these orders disagree with their own lines, here is each gap" has ended the argument.`,
      starterCode: `-- Orders whose line items disagree with the order's own gross_usd.
SELECT
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
;`,
      hints: [
        "Group the joined rows by `o.order_id` and `o.gross_usd`, then compare `SUM(i.item_usd)` to `o.gross_usd` in a `HAVING`.",
        "`<>` catches both directions; `ROUND(..., 2)` on both sides keeps the comparison honest.",
        "The grouped query is the answer: select `o.order_id`, the rounded `o.gross_usd`, and the rounded `SUM(i.item_usd)` beside it, then `ORDER BY o.order_id`.",
      ],
      referenceSolution: `SELECT o.order_id,
       ROUND(o.gross_usd, 2) AS gross_usd,
       ROUND(SUM(i.item_usd), 2) AS item_total
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
GROUP BY o.order_id, o.gross_usd
HAVING ROUND(SUM(i.item_usd), 2) <> ROUND(o.gross_usd, 2)
ORDER BY o.order_id;`,
      singleFile: {
        seedSql: REVIEW_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["order_id", "gross_usd", "item_total"],
          rows: [
            ["o-1006", 1500, 900],
            ["o-1013", 900, 940],
          ],
        },
      },
    },
  ],
}

export const level11Module4: SqlModule = {
  id: "de-l11-semantics-role",
  title: "Module 11.2: Semantics, Text-to-SQL & the AI-Era Role",
  description:
    "The semantic model as the text-to-SQL accuracy lever, graded by putting you in the loop: implement the governed metric, then catch and disprove a plausible-but-wrong AI query. Closes the level and the course with the commoditize-versus-appreciate framing.",
  lessons: [semanticModels, reviewingAiSql],
}

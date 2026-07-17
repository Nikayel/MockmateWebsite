/**
 * Optional "Extra practice" drills for the SQL curriculum, 2-3 per topic, ordered easy → hard.
 * Rendered below the main practice problem (see `ExtraPracticeSection`); they never gate lesson
 * completion. Each drill is a self-contained single-file exercise graded in-browser (sql.js).
 *
 * Every `expected` set here was produced by executing the `referenceSolution` against `seedSql`
 * through the SAME sql.js WASM the grader uses, so the values are byte-identical to a correct run.
 * All references carry an `ORDER BY`, so `orderMatters: true` and the expected rows are the exact
 * ordered output. Do not hand-edit expected values; re-run a solution through sql.js if a seed changes.
 */
import type { SqlExercise } from "@/lib/tutorials/types"

// ---- shared seeds (one per topic; reused across that topic's drills) ----

const CTE_SEED = `CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, customer_name TEXT);
INSERT INTO customers VALUES (1,'Ava'),(2,'Ben'),(3,'Cara');
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, status TEXT, total_cents INTEGER);
INSERT INTO orders VALUES
  (1,1,'paid',3000),(2,1,'paid',6000),(3,2,'paid',9000),(4,2,'cancelled',5000),(5,3,'paid',2000),(6,3,'paid',4000);`

const SUBQ_PRODUCTS_SEED = `CREATE TABLE products (product_id INTEGER PRIMARY KEY, product TEXT, price INTEGER);
INSERT INTO products VALUES (1,'Pen',300),(2,'Notebook',900),(3,'Bag',5000),(4,'Mug',2000);`

const SUBQ_ORDERS_SEED = `CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, customer_name TEXT);
INSERT INTO customers VALUES (1,'Ava'),(2,'Ben'),(3,'Cara'),(4,'Dan');
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, total_cents INTEGER);
INSERT INTO orders VALUES (1,1,3000),(2,1,4000),(3,2,5000),(4,2,1000),(5,2,9000),(6,3,2000);`

const AGG_SEED = `CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, status TEXT, total_cents INTEGER);
INSERT INTO orders VALUES (1,1,'paid',3000),(2,1,'paid',6000),(3,2,'paid',9000),(4,2,'cancelled',5000),(5,3,'paid',2000),(6,3,'refunded',4000);`

const HAVING_SEED = `CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, status TEXT, total_cents INTEGER);
INSERT INTO orders VALUES
  (1,1,'paid',3000),(2,1,'paid',6000),(3,1,'paid',1000),(4,2,'paid',9000),(5,2,'cancelled',5000),(6,3,'paid',2000);`

const INNER_SEED = `CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, customer_name TEXT);
INSERT INTO customers VALUES (1,'Ava'),(2,'Ben'),(3,'Cara');
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, total_cents INTEGER);
INSERT INTO orders VALUES (1,1,3000),(2,1,6000),(3,2,9000),(4,3,2000);
CREATE TABLE order_items (item_id INTEGER PRIMARY KEY, order_id INTEGER, product TEXT, qty INTEGER);
INSERT INTO order_items VALUES (1,1,'Pen',2),(2,1,'Mug',1),(3,3,'Bag',1),(4,4,'Pen',5);`

const LEFT_SEED = `CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, customer_name TEXT);
INSERT INTO customers VALUES (1,'Ava'),(2,'Ben'),(3,'Cara'),(4,'Dan');
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, total_cents INTEGER);
INSERT INTO orders VALUES (1,1,3000),(2,1,6000),(3,3,2000);`

const WRANK_SEED = `CREATE TABLE sales (category TEXT, product TEXT, revenue INTEGER);
INSERT INTO sales VALUES
  ('audio','Headphones',500),('audio','Earbuds',300),('audio','Speaker',800),
  ('video','Monitor',900),('video','Webcam',400),('video','Cable',400);`

const WOFF_SEED = `CREATE TABLE monthly (month TEXT, revenue INTEGER);
INSERT INTO monthly VALUES ('2024-01',1000),('2024-02',1500),('2024-03',1200),('2024-04',2000);`

// ---- CTEs (sql-l2-ctes) ----
export const sqlCtesDrills: SqlExercise[] = [
  {
    id: "sql-l2-ctes-drill1",
    executionMode: "single-file",
    prompt: `**Easy.** Write a query that returns \`order_id\` and \`total_cents\` for orders with
\`total_cents >= 5000\`, ordered by \`order_id\`. Build it with a CTE named \`big_orders\` that selects those two
columns and applies the filter, then select from it.`,
    starterCode: `WITH big_orders AS (
  -- select order_id, total_cents for orders of 5000 cents or more
)
SELECT order_id, total_cents
FROM big_orders
ORDER BY order_id;`,
    hints: [
      "The CTE body is just a normal SELECT with a WHERE filter.",
      "`WHERE total_cents >= 5000` inside the CTE, then select from `big_orders`.",
    ],
    referenceSolution: `WITH big_orders AS (
  SELECT order_id, total_cents
  FROM orders
  WHERE total_cents >= 5000
)
SELECT order_id, total_cents
FROM big_orders
ORDER BY order_id;`,
    singleFile: {
      seedSql: CTE_SEED,
      orderMatters: true,
      expected: {
        columns: ["order_id", "total_cents"],
        rows: [
          [2, 6000],
          [3, 9000],
          [4, 5000],
        ],
      },
    },
  },
  {
    id: "sql-l2-ctes-drill2",
    executionMode: "single-file",
    prompt: `**Medium.** Write a query that returns \`customer_id\` and \`revenue\` for customers whose paid
revenue is at least \`8000\`, ordered by \`customer_id\`. Revenue is the sum of \`total_cents\` across a
customer's paid orders. Build it as two chained CTEs: \`paid\` (paid orders only), then \`per_customer\`
(sum \`total_cents\` per customer, reading from \`paid\`), and apply the \`8000\` cutoff in the final SELECT.`,
    starterCode: `WITH paid AS (
  -- paid orders only
),
per_customer AS (
  -- SUM(total_cents) AS revenue, grouped by customer_id, reading from paid
)
SELECT customer_id, revenue
FROM per_customer
WHERE revenue >= 8000
ORDER BY customer_id;`,
    hints: [
      "The second CTE reads from the first: `FROM paid`.",
      "Filter the aggregate in the final SELECT's WHERE (`revenue >= 8000`), not with HAVING here.",
    ],
    referenceSolution: `WITH paid AS (
  SELECT customer_id, total_cents FROM orders WHERE status = 'paid'
),
per_customer AS (
  SELECT customer_id, SUM(total_cents) AS revenue FROM paid GROUP BY customer_id
)
SELECT customer_id, revenue
FROM per_customer
WHERE revenue >= 8000
ORDER BY customer_id;`,
    singleFile: {
      seedSql: CTE_SEED,
      orderMatters: true,
      expected: {
        columns: ["customer_id", "revenue"],
        rows: [
          [1, 9000],
          [2, 9000],
        ],
      },
    },
  },
  {
    id: "sql-l2-ctes-drill3",
    executionMode: "single-file",
    prompt: `**Hard.** Write a query that returns \`customer_name\` and \`revenue\` for each customer, where
revenue is the sum of \`total_cents\` across that customer's paid orders, ordered by \`revenue\` descending,
then \`customer_name\`. Build a CTE \`customer_totals\` that sums paid revenue per \`customer_id\`, then join it
back to \`customers\` to get the name.`,
    starterCode: `WITH customer_totals AS (
  -- SUM(total_cents) AS revenue per customer, paid orders only
)
SELECT c.customer_name, t.revenue
FROM customer_totals t
JOIN customers c ON c.customer_id = t.customer_id
ORDER BY t.revenue DESC, c.customer_name;`,
    hints: [
      "Build the per-customer totals in the CTE, then JOIN the CTE to `customers` on `customer_id`.",
      "A tie on revenue is broken by `customer_name` in the ORDER BY.",
    ],
    referenceSolution: `WITH customer_totals AS (
  SELECT customer_id, SUM(total_cents) AS revenue
  FROM orders WHERE status = 'paid'
  GROUP BY customer_id
)
SELECT c.customer_name, t.revenue
FROM customer_totals t
JOIN customers c ON c.customer_id = t.customer_id
ORDER BY t.revenue DESC, c.customer_name;`,
    singleFile: {
      seedSql: CTE_SEED,
      orderMatters: true,
      expected: {
        columns: ["customer_name", "revenue"],
        rows: [
          ["Ava", 9000],
          ["Ben", 9000],
          ["Cara", 6000],
        ],
      },
    },
  },
]

// ---- Subqueries (sql-l2-subqueries) ----
export const sqlSubqueryDrills: SqlExercise[] = [
  {
    id: "sql-l2-subqueries-drill1",
    executionMode: "single-file",
    prompt: `**Easy.** Return every product priced **above the overall average price**. Use a scalar subquery
in the WHERE clause. Return \`product_id\` and \`price\`, ordered by \`price\`.`,
    starterCode: `SELECT product_id, price
FROM products
WHERE price > ( /* average price of all products */ )
ORDER BY price;`,
    hints: [
      "A scalar subquery returns one value: `(SELECT AVG(price) FROM products)`.",
      "Compare each row's `price` against that single averaged value.",
    ],
    referenceSolution: `SELECT product_id, price
FROM products
WHERE price > (SELECT AVG(price) FROM products)
ORDER BY price;`,
    singleFile: {
      seedSql: SUBQ_PRODUCTS_SEED,
      orderMatters: true,
      expected: { columns: ["product_id", "price"], rows: [[3, 5000]] },
    },
  },
  {
    id: "sql-l2-subqueries-drill2",
    executionMode: "single-file",
    prompt: `**Medium.** Return the \`customer_name\` of every customer who has placed **at least one order**,
using an \`IN\` subquery against \`orders\`. Order by \`customer_name\`.`,
    starterCode: `SELECT customer_name
FROM customers
WHERE customer_id IN ( /* customer_ids that appear in orders */ )
ORDER BY customer_name;`,
    hints: [
      "The subquery lists the ids to match: `(SELECT customer_id FROM orders)`.",
      "`WHERE customer_id IN (...)` keeps only customers whose id appears there.",
    ],
    referenceSolution: `SELECT customer_name
FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders)
ORDER BY customer_name;`,
    singleFile: {
      seedSql: SUBQ_ORDERS_SEED,
      orderMatters: true,
      expected: { columns: ["customer_name"], rows: [["Ava"], ["Ben"], ["Cara"]] },
    },
  },
  {
    id: "sql-l2-subqueries-drill3",
    executionMode: "single-file",
    prompt: `**Hard.** Return every order whose \`total_cents\` is greater than **that order's own customer's
average order total** (a correlated subquery). Return \`order_id\` and \`total_cents\`, ordered by
\`order_id\`.`,
    starterCode: `SELECT order_id, total_cents
FROM orders o
WHERE total_cents > (
  -- average total for THIS row's customer: correlate on o.customer_id
)
ORDER BY order_id;`,
    hints: [
      "The inner query references the outer row: `WHERE x.customer_id = o.customer_id`.",
      "It recomputes `AVG(total_cents)` per customer, so each row is compared to its own group's average.",
    ],
    referenceSolution: `SELECT order_id, total_cents
FROM orders o
WHERE total_cents > (
  SELECT AVG(total_cents) FROM orders x WHERE x.customer_id = o.customer_id
)
ORDER BY order_id;`,
    singleFile: {
      seedSql: SUBQ_ORDERS_SEED,
      orderMatters: true,
      expected: {
        columns: ["order_id", "total_cents"],
        rows: [
          [2, 4000],
          [5, 9000],
        ],
      },
    },
  },
]

// ---- Aggregation (sql-l2-aggregates) ----
export const sqlAggregatesDrills: SqlExercise[] = [
  {
    id: "sql-l2-aggregates-drill1",
    executionMode: "single-file",
    prompt: `**Easy.** Return two numbers for the whole \`orders\` table: the order count as \`order_count\` and
the total revenue as \`total_cents\`.`,
    starterCode: `SELECT
  -- COUNT of all rows AS order_count,
  -- SUM of total_cents AS total_cents
FROM orders;`,
    hints: [
      "`COUNT(*)` counts rows; `SUM(total_cents)` adds the column.",
      "No GROUP BY: one row for the whole table.",
    ],
    referenceSolution: `SELECT COUNT(*) AS order_count, SUM(total_cents) AS total_cents
FROM orders;`,
    singleFile: {
      seedSql: AGG_SEED,
      orderMatters: true,
      expected: { columns: ["order_count", "total_cents"], rows: [[6, 29000]] },
    },
  },
  {
    id: "sql-l2-aggregates-drill2",
    executionMode: "single-file",
    prompt: `**Medium.** Per \`status\`, return the \`order_count\` and total \`total_cents\`. Order by \`status\`.`,
    starterCode: `SELECT status, /* count */, /* sum */
FROM orders
GROUP BY status
ORDER BY status;`,
    hints: [
      "Group by the column you want one row per: `GROUP BY status`.",
      "Aggregates (`COUNT(*)`, `SUM(...)`) collapse each group to one row.",
    ],
    referenceSolution: `SELECT status, COUNT(*) AS order_count, SUM(total_cents) AS total_cents
FROM orders
GROUP BY status
ORDER BY status;`,
    singleFile: {
      seedSql: AGG_SEED,
      orderMatters: true,
      expected: {
        columns: ["status", "order_count", "total_cents"],
        rows: [
          ["cancelled", 1, 5000],
          ["paid", 4, 20000],
          ["refunded", 1, 4000],
        ],
      },
    },
  },
  {
    id: "sql-l2-aggregates-drill3",
    executionMode: "single-file",
    prompt: `**Hard.** Per customer, return \`paid_revenue\`: the sum of \`total_cents\` **only for paid orders**,
counting non-paid orders as 0 via conditional aggregation. Order by \`customer_id\`.`,
    starterCode: `SELECT customer_id,
  SUM(CASE WHEN /* paid */ THEN total_cents ELSE 0 END) AS paid_revenue
FROM orders
GROUP BY customer_id
ORDER BY customer_id;`,
    hints: [
      "`SUM(CASE WHEN status='paid' THEN total_cents ELSE 0 END)` adds only the paid rows.",
      "This keeps every customer (unlike `WHERE status='paid'`, which would drop customers with no paid orders).",
    ],
    referenceSolution: `SELECT customer_id,
  SUM(CASE WHEN status = 'paid' THEN total_cents ELSE 0 END) AS paid_revenue
FROM orders
GROUP BY customer_id
ORDER BY customer_id;`,
    singleFile: {
      seedSql: AGG_SEED,
      orderMatters: true,
      expected: {
        columns: ["customer_id", "paid_revenue"],
        rows: [
          [1, 9000],
          [2, 9000],
          [3, 2000],
        ],
      },
    },
  },
]

// ---- HAVING (sql-l2-having) ----
export const sqlHavingDrills: SqlExercise[] = [
  {
    id: "sql-l2-having-drill1",
    executionMode: "single-file",
    prompt: `**Easy.** Return \`customer_id\` and \`order_count\` for customers with **more than 2 orders**. Order
by \`customer_id\`.`,
    starterCode: `SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id
-- keep only groups with more than 2 orders
ORDER BY customer_id;`,
    hints: [
      "Filter groups with `HAVING`, not `WHERE` (WHERE can't see `COUNT(*)`).",
      "`HAVING COUNT(*) > 2`.",
    ],
    referenceSolution: `SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id
HAVING COUNT(*) > 2
ORDER BY customer_id;`,
    singleFile: {
      seedSql: HAVING_SEED,
      orderMatters: true,
      expected: { columns: ["customer_id", "order_count"], rows: [[1, 3]] },
    },
  },
  {
    id: "sql-l2-having-drill2",
    executionMode: "single-file",
    prompt: `**Medium.** Among **paid** orders only, return \`customer_id\` and \`paid_revenue\` for customers whose
paid revenue is over \`8000\`. Order by \`customer_id\`.`,
    starterCode: `SELECT customer_id, SUM(total_cents) AS paid_revenue
FROM orders
WHERE /* paid only */
GROUP BY customer_id
HAVING /* revenue over 8000 */
ORDER BY customer_id;`,
    hints: [
      "`WHERE status='paid'` filters rows BEFORE grouping; `HAVING` filters the groups after.",
      "`HAVING SUM(total_cents) > 8000`.",
    ],
    referenceSolution: `SELECT customer_id, SUM(total_cents) AS paid_revenue
FROM orders
WHERE status = 'paid'
GROUP BY customer_id
HAVING SUM(total_cents) > 8000
ORDER BY customer_id;`,
    singleFile: {
      seedSql: HAVING_SEED,
      orderMatters: true,
      expected: {
        columns: ["customer_id", "paid_revenue"],
        rows: [
          [1, 10000],
          [2, 9000],
        ],
      },
    },
  },
  {
    id: "sql-l2-having-drill3",
    executionMode: "single-file",
    prompt: `**Hard.** Among paid orders, return \`customer_id\` and \`paid_revenue\` for customers who have **more
than one** paid order **and** paid revenue over \`5000\`. Order by \`customer_id\`.`,
    starterCode: `SELECT customer_id, SUM(total_cents) AS paid_revenue
FROM orders
WHERE status = 'paid'
GROUP BY customer_id
HAVING /* more than one order AND revenue over 5000 */
ORDER BY customer_id;`,
    hints: [
      "HAVING can combine conditions with AND.",
      "`HAVING COUNT(*) > 1 AND SUM(total_cents) > 5000`.",
    ],
    referenceSolution: `SELECT customer_id, SUM(total_cents) AS paid_revenue
FROM orders
WHERE status = 'paid'
GROUP BY customer_id
HAVING COUNT(*) > 1 AND SUM(total_cents) > 5000
ORDER BY customer_id;`,
    singleFile: {
      seedSql: HAVING_SEED,
      orderMatters: true,
      expected: { columns: ["customer_id", "paid_revenue"], rows: [[1, 10000]] },
    },
  },
]

// ---- Inner joins (sql-l2-inner-join) ----
export const sqlInnerJoinDrills: SqlExercise[] = [
  {
    id: "sql-l2-inner-join-drill1",
    executionMode: "single-file",
    prompt: `**Easy.** Join \`orders\` to \`customers\` and return each order's \`order_id\` and \`customer_name\`.
Order by \`order_id\`.`,
    starterCode: `SELECT o.order_id, c.customer_name
FROM orders o
JOIN customers c ON /* match customer_id */
ORDER BY o.order_id;`,
    hints: [
      "Join on the shared key: `ON c.customer_id = o.customer_id`.",
      "An inner join keeps only orders that have a matching customer.",
    ],
    referenceSolution: `SELECT o.order_id, c.customer_name
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
ORDER BY o.order_id;`,
    singleFile: {
      seedSql: INNER_SEED,
      orderMatters: true,
      expected: {
        columns: ["order_id", "customer_name"],
        rows: [
          [1, "Ava"],
          [2, "Ava"],
          [3, "Ben"],
          [4, "Cara"],
        ],
      },
    },
  },
  {
    id: "sql-l2-inner-join-drill2",
    executionMode: "single-file",
    prompt: `**Medium.** Join three tables (\`order_items\` → \`orders\` → \`customers\`) to return each item's
\`customer_name\` and \`product\`. Order by the item id (\`oi.item_id\`).`,
    starterCode: `SELECT c.customer_name, oi.product
FROM order_items oi
JOIN orders o ON /* ... */
JOIN customers c ON /* ... */
ORDER BY oi.item_id;`,
    hints: [
      "Chain the joins: items link to orders on `order_id`, orders link to customers on `customer_id`.",
      "You can ORDER BY a column you don't select (`oi.item_id`).",
    ],
    referenceSolution: `SELECT c.customer_name, oi.product
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
JOIN customers c ON c.customer_id = o.customer_id
ORDER BY oi.item_id;`,
    singleFile: {
      seedSql: INNER_SEED,
      orderMatters: true,
      expected: {
        columns: ["customer_name", "product"],
        rows: [
          ["Ava", "Pen"],
          ["Ava", "Mug"],
          ["Ben", "Bag"],
          ["Cara", "Pen"],
        ],
      },
    },
  },
  {
    id: "sql-l2-inner-join-drill3",
    executionMode: "single-file",
    prompt: `**Hard.** Join \`orders\` to \`customers\` and return each customer's \`customer_name\` and total
\`revenue\` (sum of \`total_cents\`). Order by \`revenue\` descending, then \`customer_name\`.`,
    starterCode: `SELECT c.customer_name, /* total revenue for this customer */ AS revenue
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY /* one row per customer */
ORDER BY revenue DESC, c.customer_name;`,
    hints: [
      "Join first, then GROUP BY the customer.",
      "Group by `c.customer_id` (the key) and select `c.customer_name` alongside the SUM.",
    ],
    referenceSolution: `SELECT c.customer_name, SUM(o.total_cents) AS revenue
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY c.customer_id
ORDER BY revenue DESC, c.customer_name;`,
    singleFile: {
      seedSql: INNER_SEED,
      orderMatters: true,
      expected: {
        columns: ["customer_name", "revenue"],
        rows: [
          ["Ava", 9000],
          ["Ben", 9000],
          ["Cara", 2000],
        ],
      },
    },
  },
]

// ---- Left joins (sql-l2-left-join) ----
export const sqlLeftJoinDrills: SqlExercise[] = [
  {
    id: "sql-l2-left-join-drill1",
    executionMode: "single-file",
    prompt: `**Easy.** Return every customer with each of their \`order_id\`s, keeping customers who have **no
orders** (their \`order_id\` will be NULL). Return \`customer_name\` and \`order_id\`, ordered by
\`customer_name\`, then \`order_id\`.`,
    starterCode: `SELECT c.customer_name, o.order_id
FROM customers c
LEFT JOIN orders o ON /* match customer_id */
ORDER BY c.customer_name, o.order_id;`,
    hints: [
      "A LEFT JOIN keeps every row from `customers` even with no matching order.",
      "Unmatched rows get NULL for the orders columns.",
    ],
    referenceSolution: `SELECT c.customer_name, o.order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
ORDER BY c.customer_name, o.order_id;`,
    singleFile: {
      seedSql: LEFT_SEED,
      orderMatters: true,
      expected: {
        columns: ["customer_name", "order_id"],
        rows: [
          ["Ava", 1],
          ["Ava", 2],
          ["Ben", null],
          ["Cara", 3],
          ["Dan", null],
        ],
      },
    },
  },
  {
    id: "sql-l2-left-join-drill2",
    executionMode: "single-file",
    prompt: `**Medium.** Return the \`customer_name\` of every customer **with no orders at all** (the anti-join
pattern). Order by \`customer_name\`.`,
    starterCode: `SELECT c.customer_name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE /* the order side is missing */
ORDER BY c.customer_name;`,
    hints: [
      "LEFT JOIN, then keep only the unmatched rows: `WHERE o.order_id IS NULL`.",
      "This is the standard 'find rows with no match' (anti-join) technique.",
    ],
    referenceSolution: `SELECT c.customer_name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL
ORDER BY c.customer_name;`,
    singleFile: {
      seedSql: LEFT_SEED,
      orderMatters: true,
      expected: { columns: ["customer_name"], rows: [["Ben"], ["Dan"]] },
    },
  },
  {
    id: "sql-l2-left-join-drill3",
    executionMode: "single-file",
    prompt: `**Hard.** Return each customer's \`customer_name\` and \`order_count\`, showing **0** for customers
with no orders. Order by \`customer_name\`.`,
    starterCode: `SELECT c.customer_name, /* count the matched orders, 0 when there are none */ AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY /* one row per customer */
ORDER BY c.customer_name;`,
    hints: [
      "`COUNT(o.order_id)` counts only non-NULL matches, so a customer with no orders counts 0.",
      "`COUNT(*)` would wrongly count 1 for the NULL-padded row, use `COUNT(o.order_id)`.",
    ],
    referenceSolution: `SELECT c.customer_name, COUNT(o.order_id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id
ORDER BY c.customer_name;`,
    singleFile: {
      seedSql: LEFT_SEED,
      orderMatters: true,
      expected: {
        columns: ["customer_name", "order_count"],
        rows: [
          ["Ava", 2],
          ["Ben", 0],
          ["Cara", 1],
          ["Dan", 0],
        ],
      },
    },
  },
]

// ---- Window ranking (sql-l4-window-ranking) ----
export const sqlWindowRankingDrills: SqlExercise[] = [
  {
    id: "sql-l4-window-ranking-drill1",
    executionMode: "single-file",
    prompt: `**Easy.** Number every product from highest to lowest revenue with \`ROW_NUMBER()\`. Break ties by
\`product\` so the numbering is deterministic. Return \`product\`, \`revenue\`, and \`rn\`, ordered by \`rn\`.`,
    starterCode: `SELECT product, revenue,
  ROW_NUMBER() OVER (/* whole table, highest revenue first, ties broken by product */) AS rn
FROM sales
ORDER BY rn;`,
    hints: [
      "No PARTITION BY means the whole table is one window.",
      "The window's ORDER BY (`revenue DESC, product`) decides the numbering.",
    ],
    referenceSolution: `SELECT product, revenue,
  ROW_NUMBER() OVER (ORDER BY revenue DESC, product) AS rn
FROM sales
ORDER BY rn;`,
    singleFile: {
      seedSql: WRANK_SEED,
      orderMatters: true,
      expected: {
        columns: ["product", "revenue", "rn"],
        rows: [
          ["Monitor", 900, 1],
          ["Speaker", 800, 2],
          ["Headphones", 500, 3],
          ["Cable", 400, 4],
          ["Webcam", 400, 5],
          ["Earbuds", 300, 6],
        ],
      },
    },
  },
  {
    id: "sql-l4-window-ranking-drill2",
    executionMode: "single-file",
    prompt: `**Medium.** Rank products **within each category** by revenue (highest = 1) with \`RANK()\`, so tied
revenues share a rank. Return \`category\`, \`product\`, \`revenue\`, \`rnk\`, ordered by \`category\`, then
\`rnk\`, then \`product\`.`,
    starterCode: `SELECT category, product, revenue,
  RANK() OVER (/* per category, by revenue DESC */) AS rnk
FROM sales
ORDER BY category, rnk, product;`,
    hints: [
      "`PARTITION BY category` restarts the ranking for each category.",
      "Order the window by `revenue DESC` alone, so tied revenues stay peers and share a rank.",
    ],
    referenceSolution: `SELECT category, product, revenue,
  RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk
FROM sales
ORDER BY category, rnk, product;`,
    singleFile: {
      seedSql: WRANK_SEED,
      orderMatters: true,
      expected: {
        columns: ["category", "product", "revenue", "rnk"],
        rows: [
          ["audio", "Speaker", 800, 1],
          ["audio", "Headphones", 500, 2],
          ["audio", "Earbuds", 300, 3],
          ["video", "Monitor", 900, 1],
          ["video", "Cable", 400, 2],
          ["video", "Webcam", 400, 2],
        ],
      },
    },
  },
  {
    id: "sql-l4-window-ranking-drill3",
    executionMode: "single-file",
    prompt: `**Hard.** Return the **top 2 products per category** by revenue. Wrap a \`ROW_NUMBER()\` in a
subquery and keep \`rn <= 2\`. Return \`category\`, \`product\`, \`revenue\`, ordered by \`category\`, then
\`revenue\` descending, then \`product\`.`,
    starterCode: `SELECT category, product, revenue
FROM (
  SELECT category, product, revenue,
    ROW_NUMBER() OVER (/* per category, highest revenue first, ties broken by product */) AS rn
  FROM sales
) ranked
WHERE /* keep only the top 2 of each category */
ORDER BY category, revenue DESC, product;`,
    hints: [
      "You can't filter a window function in WHERE directly, wrap it in a subquery first.",
      "Number rows per category, then keep `rn <= 2` in the outer query.",
    ],
    referenceSolution: `SELECT category, product, revenue
FROM (
  SELECT category, product, revenue,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, product) AS rn
  FROM sales
) ranked
WHERE rn <= 2
ORDER BY category, revenue DESC, product;`,
    singleFile: {
      seedSql: WRANK_SEED,
      orderMatters: true,
      expected: {
        columns: ["category", "product", "revenue"],
        rows: [
          ["audio", "Speaker", 800],
          ["audio", "Headphones", 500],
          ["video", "Monitor", 900],
          ["video", "Cable", 400],
        ],
      },
    },
  },
]

// ---- Window offset / frames (sql-l4-window-offset) ----
export const sqlWindowOffsetDrills: SqlExercise[] = [
  {
    id: "sql-l4-window-offset-drill1",
    executionMode: "single-file",
    prompt: `**Easy.** For each month, show the **previous month's** revenue with \`LAG()\`. Return \`month\`,
\`revenue\`, and \`prev_revenue\` (NULL for the first month), ordered by \`month\`.`,
    starterCode: `SELECT month, revenue,
  /* the previous month's revenue, ordered by month */ AS prev_revenue
FROM monthly
ORDER BY month;`,
    hints: [
      "`LAG(revenue) OVER (ORDER BY month)` reads the prior row's value.",
      "The earliest month has no prior row, so its `prev_revenue` is NULL.",
    ],
    referenceSolution: `SELECT month, revenue,
  LAG(revenue) OVER (ORDER BY month) AS prev_revenue
FROM monthly
ORDER BY month;`,
    singleFile: {
      seedSql: WOFF_SEED,
      orderMatters: true,
      expected: {
        columns: ["month", "revenue", "prev_revenue"],
        rows: [
          ["2024-01", 1000, null],
          ["2024-02", 1500, 1000],
          ["2024-03", 1200, 1500],
          ["2024-04", 2000, 1200],
        ],
      },
    },
  },
  {
    id: "sql-l4-window-offset-drill2",
    executionMode: "single-file",
    prompt: `**Medium.** Compute a **running total** of revenue by month with a windowed \`SUM()\`. Return
\`month\`, \`revenue\`, and \`running_total\`, ordered by \`month\`.`,
    starterCode: `SELECT month, revenue,
  /* revenue accumulated from the first month through this one */ AS running_total
FROM monthly
ORDER BY month;`,
    hints: [
      "A `SUM(...) OVER (ORDER BY month)` accumulates from the first row through the current one.",
      "Ordering the window by `month` defines the accumulation order.",
    ],
    referenceSolution: `SELECT month, revenue,
  SUM(revenue) OVER (ORDER BY month) AS running_total
FROM monthly
ORDER BY month;`,
    singleFile: {
      seedSql: WOFF_SEED,
      orderMatters: true,
      expected: {
        columns: ["month", "revenue", "running_total"],
        rows: [
          ["2024-01", 1000, 1000],
          ["2024-02", 1500, 2500],
          ["2024-03", 1200, 3700],
          ["2024-04", 2000, 5700],
        ],
      },
    },
  },
  {
    id: "sql-l4-window-offset-drill3",
    executionMode: "single-file",
    prompt: `**Hard.** Compute the **month-over-month change** in revenue: this month minus last month, using
\`LAG()\`. Return \`month\` and \`delta\` (NULL for the first month), ordered by \`month\`.`,
    starterCode: `SELECT month,
  /* this month's revenue minus the previous month's, ordered by month */ AS delta
FROM monthly
ORDER BY month;`,
    hints: [
      "Subtract the lagged value from the current: `revenue - LAG(revenue) OVER (ORDER BY month)`.",
      "The first month has no prior value, so its `delta` is NULL.",
    ],
    referenceSolution: `SELECT month,
  revenue - LAG(revenue) OVER (ORDER BY month) AS delta
FROM monthly
ORDER BY month;`,
    singleFile: {
      seedSql: WOFF_SEED,
      orderMatters: true,
      expected: {
        columns: ["month", "delta"],
        rows: [
          ["2024-01", null],
          ["2024-02", 500],
          ["2024-03", -300],
          ["2024-04", 800],
        ],
      },
    },
  },
]

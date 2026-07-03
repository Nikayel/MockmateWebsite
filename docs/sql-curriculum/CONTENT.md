<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- LEARN SQL & DATABASES — COURSE CONTENT (Read → Apply → Practice, 4 levels) -->
<!-- ════════════════════════════════════════════════════════════════════════ -->

# Learn SQL & Databases — course content

The full 4-level SQL & data-modeling curriculum for a **data-engineering intern**. Every lesson runs
the same **Read → Apply → Practice** loop as Learn-Python, getting deeper each level. This document is
the authoring source: a content author turns each lesson below into one `SqlLesson` object in
`lib/tutorials/sql/curriculum/levelN/` against the schema in [`SPEC.md`](./SPEC.md) §1.

**How to read this doc**
- **Read** = the teaching write-up the learner reads (`teach.markdown`) — DE-framed, self-contained,
  ends in a one-line Recap. A learner who read only the Read can pass the Apply.
- **Apply** = the guided exercise (`apply`): a seed DB, a task, hidden grading, progressive hints, and
  a reference solution revealed after 2 fails.
- **Practice** = the harder real-world DE variant (`practice`): same structure, reference **never**
  revealed.

**Conventions used throughout**
- **Engine:** SQLite (`sql.js`, in-browser). SQL is ANSI-portable; warehouse-only syntax is flagged
  inline as an *"In the warehouse…"* callout.
- **Grading (L1/L2, single-query):** the learner writes one `SELECT`; the runner compares its result
  set (`columns`, `rows`) to an expected set — multiset compare unless the lesson teaches `ORDER BY`.
- **Grading (L3/L4, script/workspace):** the learner writes a multi-statement DDL+DML script; hidden
  **assertion queries** run afterward using the dbt convention *"a query that returns 0 rows passes"*.
- **Data:** a shared, DE-flavored seed (`raw_events`, `orders`, `order_items`, `customers`,
  `products`, `dim_date`, staging/mart tables) — not toy pet-shop data.
- **IDs:** lesson `sql-l{N}-{slug}`, exercises `sql-l{N}-{slug}-apply` / `-practice` (globally unique).

**Levels**
1. [Level 1 — SQL Foundations: Reading Source Data](#level-1--sql-foundations-reading-source-data) — single-query · 11 lessons
2. [Level 2 — Aggregation & Joins: Combining Source Data](#level-2--aggregation--joins-combining-source-data) — single-query · 11 lessons
3. [Level 3 — Data Modeling & Schema Design](#level-3--data-modeling--schema-design) — script/workspace · 12 lessons
4. [Level 4 — Data Engineering with SQL](#level-4--data-engineering-with-sql) — script/workspace · 12 lessons

---


# LEVEL 1 — SQL Foundations: Reading Source Data

- **id:** `1`
- **slug:** `sql-foundations`
- **title:** SQL Foundations — Reading Source Data
- **tagline:** Interrogate a single raw table the way a DE inspects a fresh source before modeling it.
- **defaultExecutionMode:** `single-file`
- **estimatedHours:** `5`

## Who this is for and what you'll build

You're a data-engineering intern in your first week. Before you build a single pipeline, you'll spend most of your time *reading* source tables — the raw, un-modeled dumps that land in a warehouse from an app database, a CSV export, or an event stream. Your job is to understand what's actually in them: which columns matter, which rows are garbage, where the NULLs hide, and how the values are typed.

Every exercise in this level runs against one seeded SQLite database, `ecommerce_raw.db`, with five raw tables:

| table | grain | notable columns |
|---|---|---|
| `customers` | one row per customer | `customer_id`, `email`, `region`, `signup_date` |
| `orders` | one row per order | `order_id`, `customer_id`, `status`, `total_cents`, `order_ts`, `region` |
| `products` | one row per product | `product_id`, `sku`, `category_code`, `unit_price_cents` |
| `order_items` | one row per line item | `order_id`, `product_id`, `qty`, `unit_price_cents` |
| `events` | one row per clickstream event | `event_id`, `customer_id`, `event_type`, `event_ts` |

You will write exactly **one `SELECT`** per exercise. The grader runs it against a seeded copy of the table shown in the exercise and compares your result set — column by column, row by row — to the expected output. By the end of Level 1 you'll be able to project, alias, filter, sort, sample, cast, clean strings, and slice dates from any raw table you're handed — the exact motions a DE performs on day one against a fresh staging table.

> **Engine note.** All SQL here is written in the ANSI portable intersection and runs on browser SQLite (sql.js). Where a real warehouse (Postgres, Snowflake, BigQuery) behaves differently, you'll see an **In the warehouse** callout. Trust the callout over the SQLite behavior when you move to production.

---

## Module 1.1 — Projecting Columns from a Source Table

The first thing you do with any source table is decide *which columns you actually want* and *what to call them*. This module covers projecting explicit columns, aliasing them to clean model-ready names, and deriving new columns with expressions.

---

### Lesson — `sql-l1-select-columns` · SELECT and Column Aliasing  *(FULL EXEMPLAR)*

- **id:** `sql-l1-select-columns`
- **title:** SELECT and Column Aliasing
- **summary:** Pull specific columns from a raw table and rename them to clean, model-ready names.
- **difficulty:** easy
- **estimatedMinutes:** 12
- **skills:** `SELECT`, column projection, `AS` aliasing, `SELECT *` vs explicit columns

#### READ

**Why a DE almost never ships `SELECT *`.**

When a raw table lands in the warehouse, its column names are whatever the source system happened to use: `cust_nm`, `ord_dt`, `amt_c`. Those names are cryptic, inconsistent, and can *change without warning* when the upstream team renames a field. The first transform a data engineer writes — the **staging model** — does two boring but critical things: it selects only the columns the downstream models need, and it renames each one to a clean, predictable convention (usually `snake_case`, spelled out in full).

`SELECT *` is the opposite of that discipline. It drags every column downstream, breaks the moment the source adds or reorders a column, and hides *which* fields a model actually depends on. In an interview, "why not `SELECT *` in a model?" is a warm-up question. The answer: **explicit projection is a contract** — it documents exactly what you consume and insulates you from upstream churn.

**The concept.**

A `SELECT` statement names the columns you want, in the order you want them. `AS` gives a column a new output name (an *alias*). The `AS` keyword is optional but you should keep it — it reads clearly and it's portable.

**A worked example.** The raw `orders` table uses terse names. A staging projection cleans them up:

```sql
SELECT
  order_id      AS order_id,
  cust_id       AS customer_id,
  amt_c         AS amount_cents,
  ord_status    AS order_status
FROM orders;
```

The output has four columns named `order_id`, `customer_id`, `amount_cents`, `order_status` — regardless of what the source called them. Downstream models now depend on *your* stable names, not the source's.

**Anatomy of the syntax.**

```
SELECT  <source_column>  AS  <output_name> ,  <source_column> AS <output_name>
│        │                │    │
│        │                │    └── the clean name the result set exposes
│        │                └────── the AS keyword (optional but keep it)
│        └─────────────────────── the column as it exists in the source
└──────────────────────────────── begins the projection; commas separate columns
FROM <table>;                    ─ the source table you're reading
```

**Keep it readable / common pitfall.**

- Put each projected column on its own line once you have more than two — it makes diffs and reviews trivial.
- If an alias contains spaces or reserved words, wrap it in double quotes (`AS "Total Amount"`) — but a DE avoids that entirely and sticks to `snake_case`.
- **The pitfall:** forgetting a comma between columns. `SELECT order_id customer_id FROM orders` doesn't error — SQLite reads it as "select `order_id`, aliased to `customer_id`," silently dropping a column. Always eyeball your commas.

**Recap.** Explicit `SELECT col AS clean_name` is a stable contract; `SELECT *` is a liability — name every column and alias it to your convention.

#### APPLY (guided)

**Seed** (the grader loads this before running your query):

```sql
CREATE TABLE orders (
  ord_id     INTEGER,
  cust_id    INTEGER,
  ord_status TEXT,
  amt_c      INTEGER
);
INSERT INTO orders (ord_id, cust_id, ord_status, amt_c) VALUES
  (1001, 7, 'paid',     4999),
  (1002, 7, 'shipped',  1250),
  (1003, 9, 'paid',    10000);
```

**Task.** Project three columns from `orders` and alias them to clean snake_case model names:
- `ord_id` → `order_id`
- `cust_id` → `customer_id`
- `amt_c` → `amount_cents`

Do **not** include `ord_status`. Return the rows in the table's natural (insert) order — `orderMatters: false` (the grader compares as a set, but keep it simple).

**Expected result set** (columns `order_id`, `customer_id`, `amount_cents`):

| order_id | customer_id | amount_cents |
|---|---|---|
| 1001 | 7 | 4999 |
| 1002 | 7 | 1250 |
| 1003 | 9 | 10000 |

- `orderMatters`: false

**Hints (progressive):**
1. You only need `SELECT ... FROM orders;` — no `WHERE`, no sorting.
2. Name exactly three columns, comma-separated, each followed by `AS <clean_name>`.
3. Leave `ord_status` out of the projection entirely — don't select it.
4. Watch your commas: one after `order_id` alias, one after `customer_id` alias, none after the last.

**Reference solution:**

```sql
SELECT
  ord_id  AS order_id,
  cust_id AS customer_id,
  amt_c   AS amount_cents
FROM orders;
```

#### PRACTICE (harder, no reference revealed)

**Seed:**

```sql
CREATE TABLE orders_raw (
  ord_id       INTEGER,
  cust_id      INTEGER,
  ord_status   TEXT,
  amt_c        INTEGER,
  ship_region  TEXT,
  ord_ts       TEXT,     -- ISO-8601 timestamp
  internal_flag INTEGER  -- source bookkeeping; never modeled
);
INSERT INTO orders_raw VALUES
  (2001, 31, 'paid',     8900, 'EU', '2026-03-01T09:14:00Z', 1),
  (2002, 44, 'cancelled',1500, 'US', '2026-03-01T11:02:00Z', 0),
  (2003, 31, 'shipped',  2750, 'UK', '2026-03-02T15:40:00Z', 1),
  (2004, 58, 'paid',    12000, 'US', '2026-03-02T18:20:00Z', 0);
```

**Task.** Build a "clean orders" staging projection. Select the six raw columns a mart cares about and alias each to the warehouse naming convention below; **drop** `internal_flag` (a mart never needs it). Keep the output columns in exactly this order:

| raw column | output alias |
|---|---|
| `ord_id` | `order_id` |
| `cust_id` | `customer_id` |
| `ord_status` | `order_status` |
| `amt_c` | `amount_cents` |
| `ship_region` | `region` |
| `ord_ts` | `ordered_at` |

**Expected result set** (columns in the order above), `orderMatters: false`:

| order_id | customer_id | order_status | amount_cents | region | ordered_at |
|---|---|---|---|---|---|
| 2001 | 31 | paid | 8900 | EU | 2026-03-01T09:14:00Z |
| 2002 | 44 | cancelled | 1500 | US | 2026-03-01T11:02:00Z |
| 2003 | 31 | shipped | 2750 | UK | 2026-03-02T15:40:00Z |
| 2004 | 58 | paid | 12000 | US | 2026-03-02T18:20:00Z |

**Hints (progressive):**
1. Six columns in the projection, `internal_flag` omitted — that's the whole shape.
2. The output column *order* is graded; list them top-to-bottom exactly as the table specifies.
3. Every raw name changes; give all six an `AS` alias, even the ones that only lose a suffix.

---

### Lesson — `sql-l1-expressions` · Computed Columns and Expressions

- **id:** `sql-l1-expressions`
- **title:** Computed Columns and Expressions
- **summary:** Derive new columns with arithmetic and concatenation instead of storing them.
- **difficulty:** easy
- **estimatedMinutes:** 12
- **skills:** arithmetic operators, string concatenation (`||`), literal columns, expression aliasing

#### READ

**Derive, don't store.** A raw `order_items` row gives you `qty` and `unit_price_cents` but no line revenue. You *could* ask the source to store `revenue`, but that's a value that must be kept in sync forever. The DE default is to **derive it at query time**: `qty * unit_price_cents AS line_revenue_cents`. The formula lives in one place (your model), and it can never drift out of sync with its inputs.

The same applies to labels. Instead of storing a `full_name`, you concatenate `first_name || ' ' || last_name` in the model — one source of truth, computed on read.

**The building blocks.**

- **Arithmetic:** `+`, `-`, `*`, `/`. Integer division truncates in SQLite (`7 / 2` → `3`); multiply by `1.0` or cast to force decimals.
- **String concatenation:** `||` joins text. `'A' || '-' || 'B'` → `'A-B'`. (**In the warehouse:** Postgres/Snowflake also support `||`; SQL Server uses `+` and BigQuery uses `CONCAT()` — `||` is the portable ANSI choice and works in SQLite.)
- **Literal columns:** a constant becomes a column for every row — `'raw' AS source_system`.

**Worked example:**

```sql
SELECT
  product_id,
  qty * unit_price_cents            AS line_revenue_cents,
  sku || '-' || category_code       AS product_label,
  'ecommerce_raw'                   AS source_system
FROM order_items;
```

**Anatomy.** Every expression is just a computed value that gets an alias:

```
qty * unit_price_cents   AS   line_revenue_cents
└──── expression ──────┘  └──── output name ────┘
```

**Pitfall.** Integer division silently truncates: `unit_price_cents / 100` for `4999` gives `49`, not `49.99`. To keep the cents, use `unit_price_cents / 100.0`. Always alias a computed column — an un-aliased expression gets an ugly, unstable auto-name like `qty * unit_price_cents`.

**Recap.** Compute derived values (`qty * price`, `a || b`, constants) in the query and alias them — never rely on the source to store what you can derive.

#### APPLY (guided)

**Seed:**

```sql
CREATE TABLE order_items (
  order_id         INTEGER,
  product_id       INTEGER,
  qty              INTEGER,
  unit_price_cents INTEGER
);
INSERT INTO order_items VALUES
  (1001, 501, 2, 1500),
  (1001, 502, 1, 4999),
  (1002, 501, 3, 1500);
```

**Task.** Project `order_id`, `product_id`, `qty`, and add a computed column `line_revenue_cents` = `qty * unit_price_cents`.

**Expected result set** (`order_id`, `product_id`, `qty`, `line_revenue_cents`), `orderMatters: false`:

| order_id | product_id | qty | line_revenue_cents |
|---|---|---|---|
| 1001 | 501 | 2 | 3000 |
| 1001 | 502 | 1 | 4999 |
| 1002 | 501 | 3 | 4500 |

**Hints:**
1. Select the three plain columns, then add a fourth that's an expression.
2. The expression is `qty * unit_price_cents`; give it `AS line_revenue_cents`.
3. No `WHERE` or sort needed.

**Reference solution:**

```sql
SELECT
  order_id,
  product_id,
  qty,
  qty * unit_price_cents AS line_revenue_cents
FROM order_items;
```

#### PRACTICE (no reference)

**Seed:**

```sql
CREATE TABLE products (
  product_id       INTEGER,
  sku              TEXT,
  product_name     TEXT,
  category_code    TEXT,
  unit_price_cents INTEGER
);
INSERT INTO products VALUES
  (501, 'SKU-AUDIO-01', 'Wireless Earbuds', 'AUD', 2999),
  (502, 'SKU-AUDIO-02', 'Over-Ear Headphones', 'AUD', 8900),
  (503, 'SKU-HOME-11',  'Desk Lamp',        'HOM', 4500);
```

**Task.** Produce a source-preview projection with these output columns, in order:
- `product_id`
- `unit_price_dollars` — the price in dollars as a decimal (cents ÷ 100, keep the fractional part)
- `label` — the `product_name`, a space, an opening paren, the `sku`, and a closing paren, e.g. `Wireless Earbuds (SKU-AUDIO-01)`
- `source_system` — a hard-coded literal `'ecommerce_raw'` on every row

**Expected result set**, `orderMatters: false`:

| product_id | unit_price_dollars | label | source_system |
|---|---|---|---|
| 501 | 29.99 | Wireless Earbuds (SKU-AUDIO-01) | ecommerce_raw |
| 502 | 89.0 | Over-Ear Headphones (SKU-AUDIO-02) | ecommerce_raw |
| 503 | 45.0 | Desk Lamp (SKU-HOME-11) | ecommerce_raw |

**Hints:**
1. To get decimals from integer cents, divide by `100.0`, not `100`.
2. Build `label` with `||`: `product_name || ' (' || sku || ')'`.
3. A bare string literal like `'ecommerce_raw'` becomes a constant column — just alias it.

---

## Module 1.2 — Filtering Rows

A source table has millions of rows; a model needs a subset. This module is about `WHERE` — cutting a scan down to exactly the rows that matter, matching sets/ranges/patterns, and the NULL logic that trips up everyone.

---

### Lesson — `sql-l1-where-basics` · WHERE and Comparison Operators

- **id:** `sql-l1-where-basics`
- **title:** WHERE and Comparison Operators
- **summary:** Restrict a scan to the rows a model actually needs.
- **difficulty:** easy
- **estimatedMinutes:** 10
- **skills:** `WHERE`, `= <> < > <= >=`, filtering on numbers and text

#### READ

**Filter early.** The cheapest row is the one you never process. A staging model that only cares about paid orders should filter to `status = 'paid'` as early as possible — this is the intuition behind **predicate pushdown**: push the filter as close to the source scan as you can, so every downstream join, aggregate, and sort works on a smaller set. `WHERE` is where that starts.

**The operators.** `=` (equal), `<>` or `!=` (not equal), `<`, `>`, `<=`, `>=`. Text comparisons use single quotes: `status = 'paid'`. Numbers are bare: `total_cents >= 5000`.

**Worked example — the "processable" slice:**

```sql
SELECT order_id, status, total_cents
FROM orders
WHERE status = 'paid'
  AND total_cents >= 5000;
```

**Anatomy.**

```
WHERE  <column>  <operator>  <value>
       status    =           'paid'   -- text: single quotes
       total_cents >=        5000     -- number: no quotes
```

**Pitfall.** Use single quotes for string *values* (`'paid'`); double quotes mean *identifier* in standard SQL. `WHERE status = "paid"` may work by accident in SQLite but is wrong and breaks in Postgres. Also: `<>` is the portable "not equal"; prefer it over `!=`.

**Recap.** `WHERE col op value` keeps only matching rows — quote text values, filter as early as possible.

#### APPLY (guided)

**Seed:**

```sql
CREATE TABLE orders (
  order_id    INTEGER,
  status      TEXT,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, 'paid',      9900),
  (2, 'paid',      1500),
  (3, 'cancelled', 8000),
  (4, 'paid',      5000),
  (5, 'shipped',  12000);
```

**Task.** Return `order_id`, `status`, `total_cents` for orders that are `status = 'paid'` **and** have `total_cents >= 5000`.

**Expected result set**, `orderMatters: false`:

| order_id | status | total_cents |
|---|---|---|
| 1 | paid | 9900 |
| 4 | paid | 5000 |

**Hints:**
1. Two conditions joined by `AND`.
2. `>=` is inclusive — `5000` qualifies.
3. Quote the text value: `'paid'`.

**Reference solution:**

```sql
SELECT order_id, status, total_cents
FROM orders
WHERE status = 'paid'
  AND total_cents >= 5000;
```

#### PRACTICE (no reference)

**Seed:**

```sql
CREATE TABLE orders (
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
  (6, 'shipped',   3000, 'EU');
```

**Task.** Extract the "processable" slice a staging model would keep: orders that are `paid`, have a **non-zero** total (`total_cents > 0`), and come from region `EU`. Return `order_id`, `total_cents`, `region`.

**Expected result set**, `orderMatters: false`:

| order_id | total_cents | region |
|---|---|---|
| 1 | 9900 | EU |
| 5 | 6100 | EU |

**Hints:**
1. Three conditions, all joined with `AND`.
2. "Non-zero" is `total_cents > 0` (strictly greater, so the `0` row drops).
3. The US paid row and the cancelled EU row must both be excluded.

---

### Lesson — `sql-l1-in-between-like` · IN, BETWEEN, and LIKE

- **id:** `sql-l1-in-between-like`
- **title:** IN, BETWEEN, and LIKE
- **summary:** Match sets, ranges, and text patterns when filtering source rows.
- **difficulty:** easy
- **estimatedMinutes:** 12
- **skills:** `IN`, `NOT IN`, `BETWEEN`, `LIKE`, `%`/`_` wildcards

#### READ

**Three shapes of filter.** Beyond `=`, a DE constantly needs:

- **Set membership** — "status is one of these": `status IN ('paid','shipped')` (cleaner than a chain of `OR`s).
- **Range** — "price in this band": `unit_price_cents BETWEEN 1000 AND 5000` (inclusive on both ends).
- **Pattern** — "SKU looks like this": `sku LIKE 'AUD-%'`. In `LIKE`, `%` matches any run of characters, `_` matches exactly one.

**Worked example:**

```sql
SELECT product_id, sku, category_code, unit_price_cents
FROM products
WHERE category_code IN ('AUD','HOM')
  AND unit_price_cents BETWEEN 2000 AND 9000
  AND sku LIKE 'SKU-%';
```

**Anatomy.**

```
category_code IN ('AUD','HOM')          -- matches any value in the list
unit_price_cents BETWEEN 2000 AND 9000  -- 2000 <= x <= 9000 (both inclusive)
sku LIKE 'SKU-%'                         -- '%' = any chars, '_' = one char
```

**The `NOT IN` + NULL trap.** If the list inside `NOT IN` contains a `NULL` — or the column being tested is `NULL` — the result can become "unknown" and silently drop rows you expected to keep. `status NOT IN ('paid', NULL)` returns **no rows at all**. When you use `NOT IN`, make sure neither side involves NULLs, or switch to `NOT EXISTS`. (More on this in the next lesson.)

**Pitfall.** `BETWEEN` is inclusive — `BETWEEN 1 AND 10` includes both 1 and 10. If you mean "under 10," don't use `BETWEEN`. And `LIKE` is case-insensitive for ASCII in SQLite by default but **case-sensitive** in Postgres — normalize case first if it matters (Lesson `sql-l1-strings`).

**Recap.** `IN` for sets, `BETWEEN` for inclusive ranges, `LIKE` with `%`/`_` for patterns — and never put NULL near `NOT IN`.

#### APPLY (guided)

**Seed:**

```sql
CREATE TABLE products (
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
  (5, 'SKU-HOM-07', 'HOM', 15000);
```

**Task.** Filter `products` to category codes in the set `('AUD','HOM')` **and** a price band of `2000` to `9000` cents inclusive. Return `product_id`, `category_code`, `unit_price_cents`.

**Expected result set**, `orderMatters: false`:

| product_id | category_code | unit_price_cents |
|---|---|---|
| 1 | AUD | 2999 |
| 2 | HOM | 4500 |
| 4 | AUD | 8900 |

**Hints:**
1. Use `IN ('AUD','HOM')` for the category.
2. Use `BETWEEN 2000 AND 9000` for the price — both ends inclusive.
3. The `TOY` row and the `15000` row both drop.

**Reference solution:**

```sql
SELECT product_id, category_code, unit_price_cents
FROM products
WHERE category_code IN ('AUD','HOM')
  AND unit_price_cents BETWEEN 2000 AND 9000;
```

#### PRACTICE (no reference)

**Seed:**

```sql
CREATE TABLE products_raw (
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
  (6, 'SKU-HOM-07', 'active',     6000, '2026-02-14');
```

**Task.** Quarantine suspect rows — return `product_id`, `sku`, `status` for products that match **all three** conditions:
- the `sku` matches the malformed prefix pattern `TMP-%` (temporary SKUs that should never ship),
- the `status` is in the excluded set `('draft','deprecated')`,
- the `added_date` is **outside** the valid window `2026-01-01` to `2026-02-28` (i.e., *not* `BETWEEN` those dates — ISO date text compares lexicographically, so `BETWEEN` works on `'YYYY-MM-DD'`).

**Expected result set**, `orderMatters: false`:

| product_id | sku | status |
|---|---|---|
| 4 | TMP-AB-03 | deprecated |

**Hints:**
1. `sku LIKE 'TMP-%'` catches the temporary SKUs.
2. `status IN ('draft','deprecated')` for the excluded set.
3. "Outside the window" is `added_date NOT BETWEEN '2026-01-01' AND '2026-02-28'` — row 3 is a draft but *inside* the window, so it drops; only row 4 satisfies all three.

---

### Lesson — `sql-l1-null-logic` · NULLs and Three-Valued Logic  *(FULL EXEMPLAR)*

- **id:** `sql-l1-null-logic`
- **title:** NULLs and Three-Valued Logic
- **summary:** Handle missing values correctly — the #1 source of silent data bugs.
- **difficulty:** medium
- **estimatedMinutes:** 15
- **skills:** `IS NULL`, `IS NOT NULL`, `COALESCE`, three-valued logic, NULL in comparisons

#### READ

**Why this lesson matters more than it looks.** NULL is not a value — it's the *absence* of a value, SQL's way of saying "unknown." Almost every silent data bug a DE chases ("why did 4,000 rows vanish from the mart?") traces back to a mishandled NULL. Source systems are full of them: an email that was never collected, a `region` the app forgot to set, a `total` that hasn't been computed yet. Learning to reason about NULL correctly is the difference between a pipeline you trust and one that quietly loses data.

**Three-valued logic.** In most languages a comparison is `true` or `false`. In SQL there's a third result: **`unknown`**. Any comparison *to* NULL yields `unknown`:

```
5 = NULL        -> unknown   (not false!)
5 <> NULL       -> unknown
NULL = NULL     -> unknown   (two unknowns aren't "equal")
```

And `WHERE` only keeps rows where the condition is **`true`** — it discards both `false` and `unknown`. That's the trap: `WHERE email = NULL` matches *nothing*, because `= NULL` is never `true`. To test for NULL you must use the special operators **`IS NULL`** and **`IS NOT NULL`**, which return real `true`/`false`:

```sql
SELECT customer_id, email
FROM customers
WHERE email IS NULL;      -- correct: finds the missing emails
```

**How NULL poisons `NOT IN`.** Remember the trap from the last lesson. If any value in a `NOT IN` list is NULL, the whole predicate can collapse to `unknown` for every row and return **nothing**:

```sql
-- If any customer_id in orders is NULL, this returns NO rows:
WHERE customer_id NOT IN (SELECT customer_id FROM flagged);
```

The fix: filter NULLs out of the subquery, or use `NOT EXISTS` (Level 2).

**`COALESCE` — supply a default.** `COALESCE(a, b, c)` returns the first non-NULL argument. It's how you replace a missing value with a display default *without dropping the row*:

```sql
SELECT
  customer_id,
  COALESCE(email, 'unknown@example.com') AS email_display,
  COALESCE(region, 'UNSPECIFIED')        AS region_display
FROM customers;
```

**Anatomy.**

```
email IS NULL                     -- true when email is missing
email IS NOT NULL                 -- true when email is present
COALESCE(region, 'UNSPECIFIED')   -- region if present, else the fallback
       └─ tried first ┘  └─ used only when the first is NULL ┘
```

**Keep it readable / the audit pattern.** A DE often wants to *keep* the NULL rows but *flag* them — never silently drop data during profiling. Combine a `CASE` flag (Level 2 formalizes `CASE`, but the idea is intuitive) with a `COALESCE` display so the row survives and its problem is visible:

```sql
SELECT
  customer_id,
  COALESCE(email, 'MISSING') AS email_display,
  CASE WHEN email IS NULL THEN 1 ELSE 0 END AS email_is_missing
FROM customers;
```

**Common pitfalls.**
- `= NULL` / `<> NULL` are always `unknown` — use `IS NULL` / `IS NOT NULL`.
- Aggregates and `NOT IN` treat NULL surprisingly; assume nothing.
- `COALESCE(NULL, NULL)` is still NULL — provide a non-NULL final fallback if you need a guaranteed value.

**Recap.** NULL means "unknown"; comparisons to it are `unknown`, and `WHERE` drops `unknown` — test with `IS NULL`/`IS NOT NULL`, default with `COALESCE`, and flag-don't-drop when auditing.

#### APPLY (guided)

**Seed:**

```sql
CREATE TABLE customers (
  customer_id INTEGER,
  email       TEXT,
  region      TEXT
);
INSERT INTO customers VALUES
  (1, 'ana@example.com', 'EU'),
  (2, NULL,              'US'),
  (3, 'lee@example.com', NULL),
  (4, NULL,              'EU'),
  (5, 'kim@example.com', 'US');
```

**Task.** Find customers with a **missing email**. Return `customer_id`, `email` for rows where `email IS NULL`.

**Expected result set**, `orderMatters: false`:

| customer_id | email |
|---|---|
| 2 | *(NULL)* |
| 4 | *(NULL)* |

**Hints:**
1. `WHERE email = NULL` will return nothing — that's the trap.
2. Use `email IS NULL`.
3. Row 3's email is present (region is the NULL) — it must not appear.

**Reference solution:**

```sql
SELECT customer_id, email
FROM customers
WHERE email IS NULL;
```

#### PRACTICE (no reference)

**Seed:**

```sql
CREATE TABLE customers_raw (
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
  (5, 'kim@example.com', 'US',  '2026-02-02');
```

**Task.** Write a **null-audit projection** that keeps *every* row (no filtering) and exposes the data-quality problems. Return these columns, in order:
- `customer_id`
- `email_display` — the email, or `'MISSING_EMAIL'` when NULL
- `region_display` — the region, or `'UNSPECIFIED'` when NULL
- `has_missing_key` — `1` if **either** `email` **or** `region` **or** `signup_date` is NULL, else `0`

**Expected result set**, `orderMatters: false`:

| customer_id | email_display | region_display | has_missing_key |
|---|---|---|---|
| 1 | ana@example.com | EU | 0 |
| 2 | MISSING_EMAIL | US | 1 |
| 3 | lee@example.com | UNSPECIFIED | 1 |
| 4 | MISSING_EMAIL | UNSPECIFIED | 1 |
| 5 | kim@example.com | US | 0 |

**Hints:**
1. No `WHERE` — the audit keeps all five rows on purpose.
2. Use `COALESCE(email, 'MISSING_EMAIL')` and `COALESCE(region, 'UNSPECIFIED')`.
3. For the flag, a `CASE WHEN email IS NULL OR region IS NULL OR signup_date IS NULL THEN 1 ELSE 0 END` covers "any key missing."

---

### Lesson — `sql-l1-boolean-and-or` · Combining Predicates: AND / OR / NOT

- **id:** `sql-l1-boolean-and-or`
- **title:** Combining Predicates: AND / OR / NOT
- **summary:** Compose multiple conditions with correct precedence and parentheses.
- **difficulty:** medium
- **estimatedMinutes:** 13
- **skills:** `AND`, `OR`, `NOT`, operator precedence, parenthesizing conditions

#### READ

**Precedence is where filters silently break.** `AND` binds *tighter* than `OR` — just like `*` binds tighter than `+`. So this:

```sql
WHERE status = 'paid' OR status = 'shipped' AND region = 'EU'
```

does **not** mean "(paid or shipped) and in EU." SQL reads it as `paid OR (shipped AND region='EU')` — which lets in *every* paid order from *any* region. A missing pair of parentheses just silently widened your filter and let bad rows into the model. This is one of the most common real bugs in production SQL.

**The fix is always the same: parenthesize the OR branch.**

```sql
WHERE (status = 'paid' OR status = 'shipped')
  AND region = 'EU';
```

**`NOT`** negates a condition: `NOT (status = 'test')`, or more idiomatically `status <> 'test'`. Applied to a group, `NOT (a OR b)` means "neither a nor b."

**Anatomy.**

```
WHERE ( A OR B )   -- group the alternatives first
  AND   C          -- AND applies to the whole group
  AND NOT D        -- and exclude D
```

**Keep it readable.** When a filter mixes `AND` and `OR`, *always* parenthesize — even where precedence would technically do the right thing. Explicit parens document intent and survive future edits. A reviewer should never have to recall the precedence table to know what a `WHERE` means.

**Recap.** `AND` binds tighter than `OR`; wrap every `OR` group in parentheses so a business rule's grouping is exact and unambiguous.

#### APPLY (guided)

**Seed:**

```sql
CREATE TABLE orders (
  order_id INTEGER,
  status   TEXT,
  region   TEXT
);
INSERT INTO orders VALUES
  (1, 'paid',      'EU'),
  (2, 'shipped',   'EU'),
  (3, 'paid',      'US'),
  (4, 'cancelled', 'EU'),
  (5, 'shipped',   'UK');
```

**Task.** Return `order_id`, `status`, `region` for orders that are (`status = 'paid'` **or** `status = 'shipped'`) **and** `region = 'EU'`. Get the grouping right.

**Expected result set**, `orderMatters: false`:

| order_id | status | region |
|---|---|---|
| 1 | paid | EU |
| 2 | shipped | EU |

**Hints:**
1. Wrap the two status options in parentheses, then `AND` the region.
2. Without parens you'd wrongly include order 3 (paid, US).
3. Order 4 (cancelled) and order 5 (UK) both drop.

**Reference solution:**

```sql
SELECT order_id, status, region
FROM orders
WHERE (status = 'paid' OR status = 'shipped')
  AND region = 'EU';
```

#### PRACTICE (no reference)

**Seed:**

```sql
CREATE TABLE orders (
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
  (7, 'shipped',   'UK', 1);
```

**Task.** Reproduce this business rule verbatim: **"orders that are paid OR shipped, in region EU or UK, excluding test accounts."** Return `order_id`, `status`, `region`. The grouping must be exact.

**Expected result set**, `orderMatters: false`:

| order_id | status | region |
|---|---|---|
| 1 | paid | EU |
| 2 | shipped | UK |
| 6 | paid | UK |

**Hints:**
1. Three groups joined by `AND`: `(status ...)`, `(region ...)`, and the test-account exclusion.
2. Each `OR` group needs its own parentheses: `(status = 'paid' OR status = 'shipped')` and `(region = 'EU' OR region = 'UK')`.
3. "Excluding test accounts" is `is_test_acct = 0` (or `<> 1`) — that drops orders 4 and 7. Order 3 (US) and order 5 (cancelled) also drop.

---

## Module 1.3 — Shaping the Result Set

Once you've chosen and filtered rows, you shape the output: sort it deterministically, sample the top of it, and collapse duplicates during profiling.

---

### Lesson — `sql-l1-order-by` · Sorting with ORDER BY

- **id:** `sql-l1-order-by`
- **title:** Sorting with ORDER BY
- **summary:** Order output deterministically for previews and top-N inspection.
- **difficulty:** easy
- **estimatedMinutes:** 11
- **skills:** `ORDER BY`, `ASC`/`DESC`, multi-key sort, NULLS ordering behavior

#### READ

**Rows have no inherent order.** A table is a *set* — without `ORDER BY`, the engine may return rows in any order, and that order can change between runs, after a reload, or when an index changes. For any preview, any "newest 10," any output a human or a test will eyeball, you **must** sort explicitly, and you must sort on enough columns to make the order *deterministic*.

**Sort keys and tie-breaking.** `ORDER BY order_ts DESC` puts newest first. But if two orders share a timestamp, their relative order is still undefined — add a **tie-breaker**: `ORDER BY order_ts DESC, order_id DESC`. Now the output is stable every run.

**Worked example:**

```sql
SELECT order_id, order_ts, total_cents
FROM orders
ORDER BY order_ts DESC, total_cents DESC;
```

**Anatomy.**

```
ORDER BY  order_ts DESC ,  total_cents DESC
          └ primary key ┘  └ tie-breaker ┘
          DESC = high→low ; ASC (default) = low→high
```

**Where NULLs land.** **In the warehouse:** SQLite sorts NULLs *first* under `ASC` (and last under `DESC`); Postgres defaults to NULLs *last* under `ASC`. If NULL placement matters, be explicit — standard SQL supports `ORDER BY col ASC NULLS LAST` (Postgres/Oracle), though SQLite only added `NULLS FIRST/LAST` in 3.30. Portable trick: `ORDER BY (col IS NULL), col` to force NULLs last everywhere.

**Pitfall.** Sorting on a non-unique column alone is *not* deterministic — always add a unique tie-breaker (often the primary key) if the output must be stable.

**Recap.** `ORDER BY` makes output deterministic; add a unique tie-breaker column, and be explicit about NULL placement across dialects.

#### APPLY (guided)

**Seed:**

```sql
CREATE TABLE orders (
  order_id    INTEGER,
  order_date  TEXT,     -- 'YYYY-MM-DD'
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, '2026-03-01', 5000),
  (2, '2026-03-03', 2000),
  (3, '2026-03-01', 9000),
  (4, '2026-03-02', 4000);
```

**Task.** Sort `orders` by `order_date` **descending**, then by `total_cents` **descending** as a tie-breaker. Return `order_id`, `order_date`, `total_cents`. `orderMatters: true`.

**Expected result set** (in this exact order):

| order_id | order_date | total_cents |
|---|---|---|
| 2 | 2026-03-03 | 2000 |
| 4 | 2026-03-02 | 4000 |
| 3 | 2026-03-01 | 9000 |
| 1 | 2026-03-01 | 5000 |

**Hints:**
1. `ORDER BY order_date DESC` puts 2026-03-03 first.
2. Add `, total_cents DESC` so the two 03-01 rows come out 9000 before 5000.
3. ISO date text sorts correctly with a plain string comparison.

**Reference solution:**

```sql
SELECT order_id, order_date, total_cents
FROM orders
ORDER BY order_date DESC, total_cents DESC;
```

#### PRACTICE (no reference)

**Seed:**

```sql
CREATE TABLE orders (
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
  (5, '2026-03-02T10:00:00Z', 'EU', 8000);
```

**Task.** Produce a deterministic **newest-first preview** whose order can never change between runs, even though several rows share a timestamp. Sort by `order_ts` descending, then `total_cents` descending, then `order_id` ascending as the final unique tie-breaker. Return `order_id`, `order_ts`, `region`, `total_cents`. `orderMatters: true`.

**Expected result set** (exact order):

| order_id | order_ts | region | total_cents |
|---|---|---|---|
| 3 | 2026-03-03T08:30:00Z | EU | 3000 |
| 5 | 2026-03-02T10:00:00Z | EU | 8000 |
| 1 | 2026-03-02T10:00:00Z | EU | 5000 |
| 2 | 2026-03-02T10:00:00Z | US | 5000 |
| 4 | 2026-03-01T22:15:00Z | UK | 7000 |

**Hints:**
1. Three sort keys, in order: `order_ts DESC`, `total_cents DESC`, `order_id ASC`.
2. Rows 1 and 2 tie on timestamp *and* total — only the `order_id ASC` key makes them deterministic (1 before 2).
3. ISO-8601 text sorts chronologically as a plain string, so no date parsing is needed.

---

### Lesson — `sql-l1-limit-distinct` · LIMIT and DISTINCT

- **id:** `sql-l1-limit-distinct`
- **title:** LIMIT and DISTINCT
- **summary:** Sample the top rows and collapse duplicates during exploration.
- **difficulty:** easy
- **estimatedMinutes:** 11
- **skills:** `LIMIT`, `OFFSET`, `DISTINCT`, distinct on multiple columns

#### READ

**Two profiling reflexes.** When a fresh source lands, a DE does two things immediately:

1. **Sample it** — `LIMIT 10` after an `ORDER BY` to eyeball the top rows without pulling millions.
2. **Probe cardinality** — `SELECT DISTINCT status FROM orders` to learn what values a column *actually* contains (often not what the schema doc claims).

**`LIMIT` (and `OFFSET`).** `LIMIT n` returns at most `n` rows; `LIMIT n OFFSET m` skips `m` then returns `n` (basic pagination). Always pair `LIMIT` with `ORDER BY` — a limit on an unsorted set gives arbitrary rows.

**`DISTINCT`** removes duplicate rows from the result. `SELECT DISTINCT region, status FROM orders` returns each unique *combination* of the two columns — a fast way to map the value space.

**Worked example:**

```sql
SELECT DISTINCT status
FROM orders
ORDER BY status;
```

**Anatomy.**

```
SELECT DISTINCT region, status   -- unique (region, status) pairs
FROM orders
ORDER BY region, status
LIMIT 10 OFFSET 0;               -- top 10 after sorting (OFFSET optional)
```

**In the warehouse (dialect note).** SQLite/Postgres/MySQL use `LIMIT`. SQL Server uses `SELECT TOP 10 ...` or the ANSI `OFFSET ... FETCH NEXT 10 ROWS ONLY`; Oracle also uses `FETCH FIRST`. `LIMIT` is the portable choice for this course but flag it when you move to SQL Server.

**Pitfall.** `DISTINCT` applies to the *entire* row, not one column — `SELECT DISTINCT region, status` does **not** mean "distinct regions with any status." And `LIMIT` without `ORDER BY` is non-deterministic.

**Recap.** `LIMIT`/`OFFSET` sample a sorted set; `DISTINCT` collapses duplicate *rows* (across all selected columns) to profile a source's real value space.

#### APPLY (guided)

**Seed:**

```sql
CREATE TABLE orders (
  order_id INTEGER,
  status   TEXT
);
INSERT INTO orders VALUES
  (1, 'paid'),
  (2, 'shipped'),
  (3, 'paid'),
  (4, 'cancelled'),
  (5, 'shipped'),
  (6, 'paid');
```

**Task.** Return the **distinct** list of order statuses actually present in the source, sorted ascending. One column: `status`. `orderMatters: true`.

**Expected result set** (exact order):

| status |
|---|
| cancelled |
| paid |
| shipped |

**Hints:**
1. `SELECT DISTINCT status`.
2. Add `ORDER BY status` for a stable, alphabetical output.
3. Three unique values remain from six rows.

**Reference solution:**

```sql
SELECT DISTINCT status
FROM orders
ORDER BY status;
```

#### PRACTICE (no reference)

**Seed:**

```sql
CREATE TABLE orders (
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
  (11,'EU', 'cancelled');
```

**Task.** Profile the raw table: return the **distinct `(region, status)` combinations** present, sorted by `region` ascending then `status` ascending, and take only the **top 10** with `LIMIT`. Columns: `region`, `status`. `orderMatters: true`.

**Expected result set** (exact order — there happen to be exactly 8 distinct pairs, all within the top 10):

| region | status |
|---|---|
| EU | cancelled |
| EU | paid |
| EU | shipped |
| UK | cancelled |
| UK | paid |
| US | paid |
| US | shipped |

**Hints:**
1. `SELECT DISTINCT region, status` returns unique pairs, not unique single columns.
2. Sort by `region, status` so the output is deterministic before you `LIMIT`.
3. `LIMIT 10` at the end — there are fewer than 10 distinct pairs, so all of them come through.

---

## Module 1.4 — Types, Casting, Strings, and Dates

Raw source data is dirty: numbers stored as text, emails in mixed case, dates as ISO strings. This module is the cleaning toolkit — casting types, standardizing strings, and slicing dates — the exact prep a staging model does before anything downstream trusts the data.

---

### Lesson — `sql-l1-cast-types` · Data Types and CAST

- **id:** `sql-l1-cast-types`
- **title:** Data Types and CAST
- **summary:** Convert values explicitly and understand SQLite's dynamic typing.
- **difficulty:** medium
- **estimatedMinutes:** 13
- **skills:** `CAST`, type affinity, numeric vs text, SQLite dynamic-typing caveat

#### READ

**Why a DE casts at the boundary.** Source data arrives with the wrong types constantly — an amount stored as the text `'4999'`, a flag as `'1'`. **In the warehouse callout:** SQLite has *dynamic typing with type affinity* — it will happily store the string `'oops'` in a column you declared `INTEGER`, and arithmetic on text may silently coerce or return `0`. Postgres and Snowflake are strict: they *reject* a bad value at write time. Because your DDL should port to those strict systems, the DE habit is to **`CAST` explicitly at the boundary** rather than trust the source's typing.

**`CAST`.** `CAST(expr AS type)` converts a value. Common targets: `INTEGER`, `REAL` (float), `TEXT`. `CAST('4999' AS INTEGER)` → `4999`; you can now do arithmetic on it reliably.

**Worked example:**

```sql
SELECT
  order_id,
  CAST(total_cents_text AS INTEGER)            AS total_cents,
  CAST(total_cents_text AS INTEGER) / 100.0    AS total_dollars
FROM orders_raw;
```

**Anatomy.**

```
CAST( total_cents_text  AS  INTEGER )
      └─ the value ──┘      └ target type ┘
```

**Guarding junk.** If a text column may hold non-numeric junk, casting it in SQLite yields `0` (not an error), which can silently corrupt a sum. A portable guard is to only treat rows as numeric when they match a numeric shape (`GLOB '[0-9]*'` in SQLite / a regex in Postgres) or to `CASE` non-numeric values to NULL so they don't pollute a measure.

**Pitfall.** `CAST('12.99' AS INTEGER)` → `12` (truncates, doesn't round). Cast to `REAL` first if you need the decimal, or cast the cents (an integer) rather than a dollar float. And remember SQLite won't *error* on a bad cast the way a warehouse does — test your assumptions.

**Recap.** `CAST(expr AS type)` converts values explicitly at the trust boundary; SQLite's lax typing means you must cast (and guard junk) yourself so the model ports to strict warehouses.

#### APPLY (guided)

**Seed:**

```sql
CREATE TABLE orders_raw (
  order_id         INTEGER,
  total_cents_text TEXT     -- amounts stored as text
);
INSERT INTO orders_raw VALUES
  (1, '4999'),
  (2, '10000'),
  (3, '250');
```

**Task.** Cast the text `total_cents_text` to an integer and compute dollars. Return `order_id`, `total_cents` (the cast integer), and `total_dollars` (`total_cents / 100.0`, keeping decimals). `orderMatters: false`.

**Expected result set:**

| order_id | total_cents | total_dollars |
|---|---|---|
| 1 | 4999 | 49.99 |
| 2 | 10000 | 100.0 |
| 3 | 250 | 2.5 |

**Hints:**
1. `CAST(total_cents_text AS INTEGER)` gives the integer cents.
2. Divide by `100.0` (not `100`) to keep the fractional dollars.
3. Alias both computed columns.

**Reference solution:**

```sql
SELECT
  order_id,
  CAST(total_cents_text AS INTEGER)         AS total_cents,
  CAST(total_cents_text AS INTEGER) / 100.0 AS total_dollars
FROM orders_raw;
```

#### PRACTICE (no reference)

**Seed:**

```sql
CREATE TABLE payments_raw (
  payment_id  INTEGER,
  amount_text TEXT     -- mostly numeric text, some junk
);
INSERT INTO payments_raw VALUES
  (1, '4999'),
  (2, '10000'),
  (3, 'N/A'),
  (4, ''),
  (5, '750'),
  (6, 'pending');
```

**Task.** Clean the dirty numeric column into a typed, model-ready measure while keeping *every* row. Return `payment_id`, `amount_cents`, `amount_dollars` where:
- `amount_cents` = the value cast to an integer **only when** `amount_text` is all digits; otherwise `NULL` (so junk like `'N/A'`, `''`, `'pending'` does not become a silent `0`),
- `amount_dollars` = `amount_cents / 100.0` (which is `NULL` when `amount_cents` is `NULL`).

`orderMatters: false`.

**Expected result set:**

| payment_id | amount_cents | amount_dollars |
|---|---|---|
| 1 | 4999 | 49.99 |
| 2 | 10000 | 100.0 |
| 3 | *(NULL)* | *(NULL)* |
| 4 | *(NULL)* | *(NULL)* |
| 5 | 750 | 7.5 |
| 6 | *(NULL)* | *(NULL)* |

**Hints:**
1. Guard the cast with a shape test: in SQLite, `amount_text GLOB '[0-9]*' AND amount_text NOT GLOB '*[^0-9]*'` is true only for all-digit strings. (In a warehouse you'd use a regex like `~ '^[0-9]+$'`.)
2. Wrap it in `CASE WHEN <all digits> THEN CAST(amount_text AS INTEGER) ELSE NULL END AS amount_cents`.
3. Reuse the same guarded expression (or an outer computation) for `amount_dollars` by dividing by `100.0`; NULL divided/propagated stays NULL.

---

### Lesson — `sql-l1-strings` · String Functions for Cleaning

- **id:** `sql-l1-strings`
- **title:** String Functions for Cleaning
- **summary:** Trim, case-fold, and slice text to standardize messy source strings.
- **difficulty:** medium
- **estimatedMinutes:** 14
- **skills:** `LOWER`/`UPPER`, `TRIM`, `SUBSTR`, `REPLACE`, `LENGTH`, `INSTR`

#### READ

**Standardize before you join.** Joins and dedup only work when keys match *exactly*. `'  Ana@Example.com '` and `'ana@example.com'` are different strings — a join on them fails, a dedup keeps both. Before any join, a staging model normalizes the key: trim whitespace, lowercase, strip prefixes. Getting this right is the difference between a clean dimension and a duplicated one.

**The toolkit.**

- `LOWER(s)` / `UPPER(s)` — case-fold.
- `TRIM(s)` — remove leading/trailing whitespace (`LTRIM`/`RTRIM` for one side; `TRIM(s, chars)` to trim specific characters).
- `SUBSTR(s, start, len)` — slice (1-indexed in SQLite).
- `REPLACE(s, from, to)` — swap all occurrences.
- `LENGTH(s)` — character count. `INSTR(s, sub)` — 1-based position of `sub` (0 if absent).

**Worked example — a cleaned email key:**

```sql
SELECT
  customer_id,
  LOWER(TRIM(email)) AS email_key
FROM customers_raw;
```

**Anatomy.**

```
LOWER( TRIM( email ) )
       └ strip spaces ┘
└─ then case-fold ─┘
SUBSTR('SKU-AUD-01', 5)      -> 'AUD-01'   (from position 5 to end)
REPLACE('US-A', 'US-', '')   -> 'A'
```

**Pitfall.** `SUBSTR` is **1-indexed** in SQLite (and Oracle), but some languages/dialects are 0-indexed — count carefully. `TRIM` only removes whitespace by default, not interior spaces (`'a b'` stays `'a b'`); use `REPLACE(s, ' ', '')` to strip all spaces. And functions **nest inside-out**: `LOWER(TRIM(x))` trims first, then lowercases.

**Recap.** `TRIM` + `LOWER` build matchable join keys; `SUBSTR`/`REPLACE`/`INSTR` slice and rewrite messy source text — standardize keys *before* any join or dedup.

#### APPLY (guided)

**Seed:**

```sql
CREATE TABLE customers_raw (
  customer_id INTEGER,
  email       TEXT
);
INSERT INTO customers_raw VALUES
  (1, '  Ana@Example.com '),
  (2, 'LEE@example.COM'),
  (3, 'kim@Example.com  ');
```

**Task.** Normalize each email to a trimmed, lowercase join key. Return `customer_id` and `email_key` = `LOWER(TRIM(email))`. `orderMatters: false`.

**Expected result set:**

| customer_id | email_key |
|---|---|
| 1 | ana@example.com |
| 2 | lee@example.com |
| 3 | kim@example.com |

**Hints:**
1. `TRIM(email)` removes the leading/trailing spaces.
2. Wrap it in `LOWER(...)` to case-fold.
3. Order matters inside-out: trim first, then lowercase (either order works here, but be deliberate).

**Reference solution:**

```sql
SELECT
  customer_id,
  LOWER(TRIM(email)) AS email_key
FROM customers_raw;
```

#### PRACTICE (no reference)

**Seed:**

```sql
CREATE TABLE customers_raw (
  customer_id  INTEGER,
  email        TEXT,
  sku          TEXT,     -- has a 'PRD-' prefix to strip
  country_code TEXT      -- messy case / spacing
);
INSERT INTO customers_raw VALUES
  (1, '  Ana@Example.com ', 'PRD-AUD-01', ' us '),
  (2, 'LEE@example.COM',    'PRD-HOM-05', 'Gb'),
  (3, 'kim@Example.com  ',  'PRD-TOY-09', ' De ');
```

**Task.** Build the cleaned join key set a staging model prepares before any join. Return `customer_id` and:
- `email_key` — trimmed and lowercased email,
- `sku_clean` — the `sku` with the leading `'PRD-'` prefix removed (e.g. `PRD-AUD-01` → `AUD-01`),
- `country_code_norm` — the `country_code` trimmed and **uppercased** (e.g. `' us '` → `US`).

`orderMatters: false`.

**Expected result set:**

| customer_id | email_key | sku_clean | country_code_norm |
|---|---|---|---|
| 1 | ana@example.com | AUD-01 | US |
| 2 | lee@example.com | HOM-05 | GB |
| 3 | kim@example.com | TOY-09 | DE |

**Hints:**
1. `email_key` = `LOWER(TRIM(email))`, same as the Apply.
2. Strip the prefix with `REPLACE(sku, 'PRD-', '')` (or `SUBSTR(sku, 5)` since `'PRD-'` is 4 chars, so start at position 5).
3. `country_code_norm` = `UPPER(TRIM(country_code))`.

---

### Lesson — `sql-l1-dates` · Dates and Times in SQLite

- **id:** `sql-l1-dates`
- **title:** Dates and Times in SQLite
- **summary:** Parse and format ISO-8601 date text — where dialects diverge most.
- **difficulty:** medium
- **estimatedMinutes:** 15
- **skills:** `date()`, `strftime`, ISO-8601 text dates, date filtering/truncation

#### READ

**In the warehouse callout — read this first.** SQLite has **no dedicated DATE or TIMESTAMP type**. Dates live as **TEXT in ISO-8601** (`'2026-03-01'` or `'2026-03-01T09:14:00Z'`), and you manipulate them with the `date()`, `datetime()`, and `strftime()` functions. Real warehouses have native `DATE`/`TIMESTAMP` types and *different* function names — Postgres uses `date_trunc('month', ts)` and `EXTRACT(YEAR FROM ts)`; BigQuery uses `DATE_TRUNC`/`FORMAT_DATE`; Snowflake uses `DATE_TRUNC`/`TO_CHAR`. The **concepts** below (truncate, extract a part, filter a window) transfer everywhere; the exact syntax does not. Because ISO-8601 text also *sorts and compares* chronologically as plain strings, a lot of date filtering needs no functions at all.

**The core functions (SQLite).**

- `date(ts)` — truncate a timestamp to the day: `date('2026-03-01T09:14:00Z')` → `'2026-03-01'`.
- `strftime(fmt, ts)` — format/extract. `strftime('%Y-%m', ts)` → `'2026-03'` (year-month); `%Y` year, `%m` month, `%d` day, `%w` day-of-week (0=Sunday).

**Worked example — extract year-month:**

```sql
SELECT
  order_id,
  strftime('%Y-%m', order_ts) AS order_year_month
FROM orders;
```

**Anatomy.**

```
strftime( '%Y-%m' , order_ts )
          └ format ┘  └ ISO text timestamp ┘
date( order_ts )              -> 'YYYY-MM-DD'  (day truncation)
order_ts >= '2026-01-01'      -> string compare = chronological filter
```

**Filtering a window.** Because ISO text sorts correctly, a rolling window is just a string range: `WHERE order_ts >= '2026-01-01' AND order_ts < '2026-04-01'`. Prefer half-open ranges (`>= start AND < next_start`) over `BETWEEN` for timestamps, so you don't accidentally include or exclude the boundary instant.

**Pitfall.** `strftime` returns **text**, so `strftime('%m', ts)` is `'03'` (string), not the number `3` — cast if you need arithmetic. And `strftime`/`date` only work on *valid ISO-8601* strings; a malformed date like `'03/01/2026'` returns NULL silently. Validate/standardize date text before relying on these functions.

**Recap.** In SQLite dates are ISO text: `date()` truncates to day, `strftime()` extracts/formats, and plain string comparison filters windows — but the function names change in every real warehouse, so lean on the portable concepts.

#### APPLY (guided)

**Seed:**

```sql
CREATE TABLE orders (
  order_id INTEGER,
  order_ts TEXT       -- ISO-8601
);
INSERT INTO orders VALUES
  (1, '2026-01-15T10:00:00Z'),
  (2, '2026-02-03T14:30:00Z'),
  (3, '2026-02-28T23:59:00Z');
```

**Task.** Extract the year-month (`YYYY-MM`) from each order's timestamp. Return `order_id` and `order_year_month`. `orderMatters: false`.

**Expected result set:**

| order_id | order_year_month |
|---|---|
| 1 | 2026-01 |
| 2 | 2026-02 |
| 3 | 2026-02 |

**Hints:**
1. Use `strftime('%Y-%m', order_ts)`.
2. `%Y` is the 4-digit year, `%m` the zero-padded month.
3. Alias the result `order_year_month`.

**Reference solution:**

```sql
SELECT
  order_id,
  strftime('%Y-%m', order_ts) AS order_year_month
FROM orders;
```

#### PRACTICE (no reference)

**Seed:**

```sql
CREATE TABLE orders (
  order_id INTEGER,
  order_ts TEXT       -- ISO-8601
);
INSERT INTO orders VALUES
  (1, '2026-01-05T08:00:00Z'),   -- Mon
  (2, '2026-02-14T19:30:00Z'),   -- Sat
  (3, '2026-03-01T12:00:00Z'),   -- Sun
  (4, '2026-03-15T09:45:00Z'),   -- Sun
  (5, '2025-12-31T23:00:00Z');   -- out of window (prior year)
```

**Task.** Build a date-spine preview for a daily mart, filtered to a rolling window of **`2026-01-01` (inclusive) up to `2026-04-01` (exclusive)**. For each in-window order return, in order:
- `order_id`
- `order_date` — the timestamp truncated to the day (`YYYY-MM-DD`)
- `order_year_month` — `YYYY-MM`
- `day_of_week` — the numeric day-of-week as text via `strftime('%w', ...)` (`0`=Sunday … `6`=Saturday)

Sort the output by `order_date` ascending. `orderMatters: true`.

**Expected result set** (exact order; row 5 is filtered out):

| order_id | order_date | order_year_month | day_of_week |
|---|---|---|---|
| 1 | 2026-01-05 | 2026-01 | 1 |
| 2 | 2026-02-14 | 2026-02 | 6 |
| 3 | 2026-03-01 | 2026-03 | 0 |
| 4 | 2026-03-15 | 2026-03 | 0 |

**Hints:**
1. Filter with a half-open window: `WHERE order_ts >= '2026-01-01' AND order_ts < '2026-04-01'` — ISO text compares chronologically, so no parsing needed. Row 5 (2025) drops.
2. `date(order_ts)` gives the day; `strftime('%Y-%m', order_ts)` the year-month; `strftime('%w', order_ts)` the day-of-week.
3. `ORDER BY order_date` (or `order_ts`) ascending for the deterministic spine.

---

*End of Level 1 — SQL Foundations. A learner leaving this level can project and alias columns, derive expressions, filter with `WHERE`/`IN`/`BETWEEN`/`LIKE`, reason correctly about NULLs and boolean precedence, sort and sample deterministically, and cast/clean/slice the types, strings, and dates of a raw source table — every motion a DE performs on a fresh staging table before modeling it. Level 2 builds on this with aggregation and joins.*

---

# LEVEL 2 — Aggregation & Joins: Combining Source Data

- **id:** `2`
- **slug:** `aggregation-and-joins`
- **title:** Aggregation & Joins — Building Metrics from Many Tables
- **tagline:** Turn scattered source tables into the aggregated, joined result sets that mart models are made of.
- **audience:** DE intern who can query one table and now must integrate several and compute metrics.
- **estimatedHours:** `6`
- **defaultExecutionMode:** `single-file`

### What you'll build

In Level 1 you learned to interrogate one raw table. In Level 2 you learn the two operations that turn raw tables into *metrics*: **aggregation** (collapsing many rows into one measured number) and **joins** (stitching several source tables into one enriched row). Along the way you'll add set operations, subqueries, CTEs, and `CASE` — the full toolkit for writing the `SELECT` at the heart of any staging, intermediate, or mart model.

Everything still runs against the seeded `ecommerce_raw.db` (`customers`, `orders`, `products`, `order_items`, `events`) in browser SQLite. Each exercise is **one `SELECT`**, graded by comparing your returned result set to the expected rows. The SQL you write here is the ANSI intersection that ports to Postgres, Snowflake, and BigQuery; wherever SQLite diverges from a warehouse, there's an **In the warehouse…** callout.

By the end you can build a monthly revenue mart, audit referential integrity across tables, reconcile two daily snapshots, and refactor a nested query into readable CTE stages — the daily reality of a data-engineering intern.

---

## Module 2.1 — Aggregation and Grouping

Aggregation is the atom of every metric. This module takes you from a single grand-total number, to one metric row per category, to filtering those grouped rows.

---

### Lesson `sql-l2-aggregates` — Aggregate Functions

- **summary:** Collapse many rows into a single measure — the atom of every metric.
- **difficulty:** easy
- **estimatedMinutes:** 20
- **skills:** `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `COUNT(DISTINCT)`, NULL handling in aggregates

#### READ

Every dashboard number you've ever seen — total revenue, active users, average order value — is an **aggregate**: a function that eats many rows and emits one value. As a DE, the first thing you do after a table lands is run a handful of aggregates to sanity-check the load. Row count looks right? Revenue in the expected ballpark? No absurd max? These are your smoke tests.

The five workhorses:

| Function | Returns |
|---|---|
| `COUNT(*)` | number of rows |
| `COUNT(col)` | number of **non-NULL** values in `col` |
| `COUNT(DISTINCT col)` | number of distinct non-NULL values |
| `SUM(col)` / `AVG(col)` | total / mean of non-NULL values |
| `MIN(col)` / `MAX(col)` | smallest / largest value |

A worked example — the "health check" of an orders table:

```sql
SELECT
  COUNT(*)                  AS row_count,
  COUNT(DISTINCT customer_id) AS distinct_customers,
  SUM(total_cents)          AS total_revenue_cents,
  AVG(total_cents)          AS avg_order_cents,
  MAX(total_cents)          AS largest_order_cents
FROM orders;
```

One row out. Five numbers that tell you whether the load is sane.

**Anatomy — the NULL rule that trips everyone:**

```
COUNT(*)            → counts rows, even all-NULL rows
COUNT(email)        → skips rows where email IS NULL
AVG(total_cents)    → divides SUM by the COUNT of NON-NULL values, not by COUNT(*)
```

That last one is the classic interview trap. `AVG` **ignores NULLs entirely** — it does not treat them as zero. If half your `total_cents` are NULL, `AVG(total_cents)` averages only the other half. If you *want* NULLs to count as zero, wrap first: `AVG(COALESCE(total_cents, 0))`. Those two queries give different answers, and knowing which one the business meant is your job.

**Keep it readable / common pitfall:** `COUNT(*)` vs `COUNT(col)` diverge the moment `col` has a NULL. When someone asks "how many orders have a customer?", they mean `COUNT(customer_id)`, not `COUNT(*)`. Say what you count.

**Recap:** Aggregates collapse many rows to one number and silently skip NULLs — `COUNT(*)` counts rows, `COUNT(col)`/`SUM`/`AVG` count only non-NULL values, and `COUNT(DISTINCT col)` counts unique ones.

#### APPLY (guided)

**Task:** From `order_items`, return a single row with two columns: `total_revenue` (the sum of `quantity * unit_price_cents`) and `order_count` (the number of distinct `order_id` values present).

**Seed:**

```sql
CREATE TABLE order_items (
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
  (5, 102, 11, 2, 1500);
```

**Expected result** (`orderMatters: false` — single row):

| total_revenue | order_count |
|---|---|
| 16400 | 3 |

*(2·500 + 1·1500 + 3·500 + 1·9900 + 2·1500 = 1000 + 1500 + 1500 + 9900 + 3000 = 16900… )* — compute it yourself; the grader holds the authoritative figure. Distinct `order_id` values are 100, 101, 102 → 3.

**Hints:**
1. Aggregates can wrap an *expression*, not just a bare column: `SUM(quantity * unit_price_cents)`.
2. "Number of distinct orders" is `COUNT(DISTINCT order_id)`, not `COUNT(*)`.
3. Alias each output column with `AS` so the result columns are named exactly `total_revenue` and `order_count`.

**Reference solution:**

```sql
SELECT
  SUM(quantity * unit_price_cents) AS total_revenue,
  COUNT(DISTINCT order_id)         AS order_count
FROM order_items;
```

#### PRACTICE (no reference revealed)

**Task — source-health scorecard:** After a nightly load you want one summary row. From `orders`, return: `total_rows` (all rows), `distinct_customers` (distinct non-NULL `customer_id`), `total_revenue` (sum of `total_cents`, treating NULL totals as 0), and `avg_order_value` (average of `total_cents` over rows where it is **not** NULL — i.e. plain `AVG`, which already skips NULLs). Note that some rows have a NULL `customer_id` (guest checkouts) and some have a NULL `total_cents` (abandoned) — your scorecard must handle both correctly.

**Seed:**

```sql
CREATE TABLE orders (
  order_id     INTEGER PRIMARY KEY,
  customer_id  INTEGER,       -- NULL for guest checkout
  total_cents  INTEGER,       -- NULL for abandoned
  status       TEXT
);
INSERT INTO orders VALUES
  (100, 1,    2500, 'paid'),
  (101, 1,    5000, 'paid'),
  (102, 2,    9900, 'shipped'),
  (103, NULL, 1500, 'paid'),      -- guest
  (104, 3,    NULL, 'abandoned'), -- no total
  (105, NULL, NULL, 'abandoned'); -- guest + no total
```

**Expected result** (`orderMatters: false` — single row): four columns `total_rows`, `distinct_customers`, `total_revenue`, `avg_order_value`. `total_rows` = 6; `distinct_customers` = 3 (customers 1, 2, 3 — the NULLs don't count); `total_revenue` = sum of the four non-NULL totals with NULLs treated as 0; `avg_order_value` = average over only the rows where `total_cents` is not NULL.

**Hints:**
1. `COUNT(*)` counts every row; `COUNT(DISTINCT customer_id)` automatically drops the NULL guests.
2. For revenue, decide deliberately: `SUM(total_cents)` already skips NULLs — but the spec says treat NULL as 0, so `SUM(COALESCE(total_cents, 0))` makes the intent explicit (same number here, clearer contract).
3. For the average, note the spec wants NULLs *excluded*, which is exactly what a bare `AVG(total_cents)` does — do **not** COALESCE this one.
4. Watch the contrast: revenue coalesces, average does not. That difference is the whole point.

---

### Lesson `sql-l2-group-by` — GROUP BY  *(full exemplar)*

- **summary:** Compute one metric row per category — the shape of a mart.
- **difficulty:** medium
- **estimatedMinutes:** 30
- **skills:** `GROUP BY`, grouping keys, multi-column groups, aggregate-per-group

#### READ

A single aggregate gives you one number for the whole table. But nobody wants "total revenue" alone — they want revenue **per category**, **per month**, **per region**. `GROUP BY` is the operator that turns one grand total into one row per bucket. It is, quite literally, the shape of a mart: a fact-like table where each row is a category and each column is a measure.

Here's the mental model. `GROUP BY category` slices the table into piles, one pile per distinct `category`, then runs your aggregates **once per pile**:

```sql
SELECT
  category,
  COUNT(*)          AS product_count,
  AVG(price_cents)  AS avg_price_cents
FROM products
GROUP BY category;
```

Input of 20 product rows across 4 categories → output of exactly 4 rows, one per category, each carrying that category's count and average.

**Anatomy of a grouped query:**

```
SELECT   category,           COUNT(*),  AVG(price_cents)
         └── grouping key ──┘ └──── aggregates over each group ────┘
FROM     products
GROUP BY category
         └── one output row per distinct value (or combination) here ──┘
```

**The grain.** The single most important thing to say out loud about any grouped query is its **grain**: "one row per \_\_\_." `GROUP BY category` → one row per category. `GROUP BY category, year_month` → one row per (category, month) combination. The grain is the list of columns in your `GROUP BY`. Declaring it keeps you honest about what a row *means*, and it's the first question any reviewer will ask of your mart.

**Multi-column grouping** just means the pile is defined by a *combination*:

```sql
SELECT
  category,
  strftime('%Y-%m', order_ts) AS year_month,
  SUM(revenue_cents)          AS revenue_cents
FROM sales
GROUP BY category, strftime('%Y-%m', order_ts);
```

One row per category **per month**. That's a monthly revenue mart in five lines.

**The rule that generates half of all GROUP BY errors:** every column in your `SELECT` list must be **either** inside an aggregate **or** listed in the `GROUP BY`. Why? Because the output has one row per group — so a bare, non-grouped column like `product_name` has no single value to show for a whole category; there could be dozens of different names in the pile. Standard SQL (Postgres, SQL Server) *rejects* the query outright.

> **In the warehouse this differs.** SQLite is lax: it will silently pick an arbitrary row's value for an ungrouped column instead of erroring (MySQL in non-strict mode does the same). Postgres, Snowflake, BigQuery, and SQL Server all raise `column must appear in the GROUP BY clause`. Don't lean on SQLite's leniency — write the query as if it will be rejected, because in production it will be. If you truly want one representative value, wrap it in `MIN()`/`MAX()` to make the choice explicit.

**Keep it readable / common pitfall:** if you group by a computed expression (like `strftime(...)`), put the *same expression* in both `SELECT` and `GROUP BY`. You cannot reference the `SELECT` alias inside `GROUP BY` in standard SQL — the alias isn't defined yet when `GROUP BY` runs. (SQLite and Postgres happen to allow the alias; Oracle and SQL Server do not — repeat the expression to stay portable.)

**Recap:** `GROUP BY` collapses each distinct key (or key combination) into one output row and runs your aggregates per group; the grain *is* your grouping columns, and every selected column must be either aggregated or grouped.

#### APPLY (guided)

**Task:** Compute revenue per product category. Join isn't needed — the `order_items_wide` table already carries `category` and a `line_revenue_cents` per row. Return one row per `category` with columns `category` and `revenue_cents` (the sum of `line_revenue_cents` for that category), sorted by `category` ascending.

**Seed:**

```sql
CREATE TABLE order_items_wide (
  order_item_id     INTEGER PRIMARY KEY,
  category          TEXT,
  line_revenue_cents INTEGER
);
INSERT INTO order_items_wide VALUES
  (1, 'audio',      1500),
  (2, 'audio',      3000),
  (3, 'wearables',  9900),
  (4, 'cables',      500),
  (5, 'cables',     1000),
  (6, 'wearables',  9900),
  (7, 'audio',      1500);
```

**Expected result** (`orderMatters: true` — sorted by `category`):

| category | revenue_cents |
|---|---|
| audio | 6000 |
| cables | 1500 |
| wearables | 19800 |

**Hints:**
1. The grain is "one row per category" → `GROUP BY category`.
2. Sum the per-line measure inside the group: `SUM(line_revenue_cents)`.
3. Because `orderMatters` is true, add `ORDER BY category` so rows come back in a deterministic order.
4. `category` appears in the `SELECT` un-aggregated, so it **must** also appear in `GROUP BY`.

**Reference solution:**

```sql
SELECT
  category,
  SUM(line_revenue_cents) AS revenue_cents
FROM order_items_wide
GROUP BY category
ORDER BY category;
```

#### PRACTICE (no reference revealed)

**Task — monthly revenue mart:** Build the exact grain an analyst asks for: **one row per (category, year_month)**. From `sales`, return columns `category`, `year_month` (the `YYYY-MM` prefix of `order_ts`), `revenue_cents` (sum of `line_revenue_cents`), `order_count` (distinct `order_id`), and `distinct_customers` (distinct `customer_id`). Sort by `category`, then `year_month`. Ignore rows whose `status` is `'cancelled'` — those never count toward revenue — but keep everything else.

**Seed:**

```sql
CREATE TABLE sales (
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
  (8, 506, 3, 'audio',     '2026-02-15 08:00:00', 'paid',      3000);
```

**Expected result** (`orderMatters: true` — sorted by `category`, then `year_month`): one row per (category, year_month) among non-cancelled rows, with `revenue_cents`, `order_count` (distinct orders in that bucket), and `distinct_customers` (distinct customers in that bucket). The single `'cancelled'` row (order 504, Feb wearables) must be excluded before grouping.

**Hints:**
1. Filter *before* grouping: a `WHERE status <> 'cancelled'` removes cancelled rows before the piles are formed.
2. Derive the month with `strftime('%Y-%m', order_ts)` — and use that **same expression** in both `SELECT` and `GROUP BY` (don't rely on the alias in `GROUP BY`).
3. The grain is two columns → `GROUP BY category, strftime('%Y-%m', order_ts)`.
4. `order_count` and `distinct_customers` are `COUNT(DISTINCT order_id)` and `COUNT(DISTINCT customer_id)` computed within each group.

---

### Lesson `sql-l2-having` — HAVING: Filtering Groups

- **summary:** Filter on aggregated values, not raw rows.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** `HAVING`, `WHERE` vs `HAVING`, filtering on aggregates

#### READ

You know how to compute revenue per category. Now the analyst says: "only show me categories that did more than \$1,000." You can't put that in `WHERE` — at the time `WHERE` runs, there is no per-category total yet; `WHERE` sees raw rows, one at a time. You need a filter that runs *after* grouping, on the aggregated value. That's `HAVING`.

The pipeline order is the whole lesson:

```
FROM      → read rows
WHERE     → filter individual rows            (before grouping)
GROUP BY  → collapse rows into groups
HAVING    → filter whole groups by aggregate  (after grouping)
SELECT    → project columns
ORDER BY  → sort the surviving groups
```

Worked example — categories whose total revenue clears a threshold:

```sql
SELECT
  category,
  SUM(line_revenue_cents) AS revenue_cents
FROM order_items_wide
GROUP BY category
HAVING SUM(line_revenue_cents) > 100000;   -- filters GROUPS, not rows
```

**Anatomy — WHERE vs HAVING:**

```
WHERE  status = 'paid'                 → keeps rows where a raw column matches
HAVING SUM(revenue_cents) > 100000     → keeps groups where an aggregate matches
```

The two are not interchangeable, and using the wrong one **changes the answer**, not just performance. Consider "categories where paid revenue exceeds \$1,000":

- Correct: `WHERE status='paid'` (drop unpaid rows) → `GROUP BY category` → `HAVING SUM(revenue) > 100000`.
- Wrong: putting the status test in `HAVING`, or the revenue test in `WHERE`. `WHERE SUM(...) > 100000` is a hard error — you cannot aggregate in `WHERE`.

**Keep it readable / common pitfall:** use `WHERE` for everything you *can* — filtering rows early shrinks the data before the expensive grouping, and it's cheaper in every engine. Reserve `HAVING` strictly for conditions that reference an aggregate. A `HAVING category = 'audio'` (no aggregate) works in SQLite but belongs in `WHERE`; it signals you've confused the two phases.

**Recap:** `WHERE` filters raw rows before grouping; `HAVING` filters whole groups by their aggregate after grouping — put every non-aggregate condition in `WHERE` and reserve `HAVING` for tests on `SUM`/`COUNT`/`AVG`.

#### APPLY (guided)

**Task:** From `order_items_wide`, keep only categories whose total revenue exceeds 5000 cents. Return `category` and `revenue_cents`, sorted by `category`.

**Seed:**

```sql
CREATE TABLE order_items_wide (
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
  (7, 'wearables', 9900);
```

**Expected result** (`orderMatters: true`):

| category | revenue_cents |
|---|---|
| audio | 6000 |
| wearables | 19800 |

*(`cables` totals 1500, below the bar, and is dropped.)*

**Hints:**
1. First group by `category` and sum revenue, just like the GROUP BY lesson.
2. Add a `HAVING` on the same aggregate expression: `HAVING SUM(line_revenue_cents) > 5000`.
3. `HAVING` runs after grouping, so it can see `SUM(...)`; `WHERE` cannot.

**Reference solution:**

```sql
SELECT
  category,
  SUM(line_revenue_cents) AS revenue_cents
FROM order_items_wide
GROUP BY category
HAVING SUM(line_revenue_cents) > 5000
ORDER BY category;
```

#### PRACTICE (no reference revealed)

**Task — flag high-value segments:** From `orders`, find customers who are BOTH frequent AND high-spend. Consider only `paid` orders (a pre-aggregation filter). Group by `customer_id` and keep customers with **more than 3** paid orders AND **lifetime paid revenue over 20000 cents**. Return `customer_id`, `order_count` (count of their paid orders), and `lifetime_revenue` (sum of their paid `total_cents`), sorted by `lifetime_revenue` descending. Combine the pre-aggregation `WHERE status='paid'` with a two-condition `HAVING`.

**Seed:**

```sql
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,
  status      TEXT,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (1, 1, 'paid',     8000),
  (2, 1, 'paid',     9000),
  (3, 1, 'paid',     7000),
  (4, 1, 'paid',     6000),   -- cust 1: 4 paid, 30000 total → qualifies
  (5, 2, 'paid',    30000),
  (6, 2, 'paid',    25000),   -- cust 2: only 2 paid → fails count test
  (7, 3, 'paid',     1000),
  (8, 3, 'paid',     1000),
  (9, 3, 'paid',     1000),
  (10,3, 'paid',     1000),   -- cust 3: 4 paid but only 4000 → fails revenue test
  (11,1, 'cancelled',99000);  -- cancelled: must be excluded before counting
```

**Expected result** (`orderMatters: true` — sorted by `lifetime_revenue` DESC): only customer 1 qualifies (4 paid orders, 30000 lifetime; the cancelled 99000 order is excluded by the `WHERE`). Customer 2 fails the count test; customer 3 fails the revenue test.

**Hints:**
1. `WHERE status = 'paid'` must run first so the cancelled 99000 order never inflates anyone's revenue.
2. Group by `customer_id`; your two group-level tests both go in `HAVING`.
3. Combine them with `AND`: `HAVING COUNT(*) > 3 AND SUM(total_cents) > 20000`.
4. If you accidentally put the status filter in `HAVING` you'd have to write `HAVING ... AND status='paid'`, which is illegal (status isn't aggregated or grouped) — keep row filters in `WHERE`.

---

## Module 2.2 — Joining Tables

Aggregation summarizes one table; joins combine several. This module is the heart of Level 2: inner joins, row-preserving left joins, anti-joins for integrity checks, and self/outer joins for reconciliation.

---

### Lesson `sql-l2-inner-join` — INNER JOIN and Join Keys  *(full exemplar)*

- **summary:** Combine two source tables on a matching key.
- **difficulty:** medium
- **estimatedMinutes:** 30
- **skills:** `INNER JOIN`, `ON`, join keys, table aliases, qualifying columns

#### READ

Real source data is never in one table. A raw e-commerce feed splits `orders` (who bought, when, total) from `customers` (name, region, email) from `products` (name, category, price). To answer "revenue by customer region" you must first *stitch these back together* on their shared keys. That stitching is a **join**, and the everyday workhorse is the `INNER JOIN`: it returns rows where a key in one table **matches** a key in the other, and drops everything with no match on either side.

Worked example — attach each order to its customer:

```sql
SELECT
  o.order_id,
  o.total_cents,
  c.customer_name
FROM orders AS o
INNER JOIN customers AS c
  ON o.customer_id = c.customer_id;
```

Read it as: for each `orders` row, find the `customers` row whose `customer_id` equals this order's `customer_id`, and glue their columns side by side. An order with no matching customer, or a customer with no orders, does **not** appear — that's the "inner" part.

**Anatomy of a join:**

```
FROM   orders     AS o          ← left table, aliased 'o'
INNER JOIN customers AS c       ← right table, aliased 'c'
  ON   o.customer_id = c.customer_id
       └─── join key: the column(s) that relate the two tables ───┘
SELECT o.order_id, c.customer_name
       └── qualify columns with the alias so 'customer_id' isn't ambiguous ──┘
```

Three habits that make joins readable and correct:

1. **Alias every table** (`orders AS o`). Short aliases keep the `ON` and `SELECT` legible.
2. **Qualify every column** (`o.order_id`, not `order_id`) — the instant two tables share a column name, an unqualified reference is ambiguous and errors.
3. **Name the join key deliberately.** The `ON` clause is the contract: "these two rows describe the same thing."

**Cardinality — the concept that separates a DE from a query monkey.** Before you join, know the *relationship* between the tables:

- **1:1** — each order has exactly one customer *record*, but reversed a customer has many orders, so order→customer is *many-to-one*.
- **1:N** — one order has *many* `order_items`. Joining `orders` to `order_items` multiplies each order row by its number of line items.
- **M:N** — needs a bridge table (you'll model these in Level 3).

Why this matters: **a 1:N join fans out rows, and a fan-out inflates a `SUM`.** If you join `orders` to `order_items` and then `SUM(orders.total_cents)`, you sum each order's total *once per line item* — a 3-item order counts its total three times. The revenue triples and looks plausible, which is how bad numbers ship. The fix is to know your grain: after a fan-out join, aggregate the **line-level** measure (`SUM(quantity * unit_price_cents)`), never the pre-aggregated header total.

**Keep it readable / common pitfall:** forgetting the `ON` clause (or writing `,`-separated tables with the join condition in `WHERE`) can produce a **cross join** — every row paired with every row, N×M rows. If your result set is suspiciously huge, you dropped or weakened a join key. Always join on the *full* key; a partial key silently fans out.

**Recap:** `INNER JOIN … ON key` returns only matching rows from both tables; alias and qualify everything, and always know the cardinality — a 1:N join fans out rows and will double-count any header-level `SUM`.

#### APPLY (guided)

**Task:** Join `orders` to `customers` on `customer_id`. Return `order_id`, `total_cents`, and `customer_name`, one row per order that has a matching customer, sorted by `order_id`.

**Seed:**

```sql
CREATE TABLE customers (
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
  (103, 9, 1500);   -- customer_id 9 does not exist → dropped by INNER JOIN
```

**Expected result** (`orderMatters: true` — sorted by `order_id`):

| order_id | total_cents | customer_name |
|---|---|---|
| 100 | 2500 | Ada Lovelace |
| 101 | 5000 | Grace Hopper |
| 102 | 9900 | Ada Lovelace |

*(Order 103 references customer 9, which doesn't exist, so the inner join drops it.)*

**Hints:**
1. Put `orders` on the left (`FROM orders o`) and `INNER JOIN customers c ON o.customer_id = c.customer_id`.
2. Qualify each selected column with its alias: `o.order_id`, `o.total_cents`, `c.customer_name`.
3. The orphan order (customer 9) disappears automatically — that's the inner join at work; you don't filter it manually.
4. Add `ORDER BY o.order_id` for a deterministic result.

**Reference solution:**

```sql
SELECT
  o.order_id,
  o.total_cents,
  c.customer_name
FROM orders AS o
INNER JOIN customers AS c
  ON o.customer_id = c.customer_id
ORDER BY o.order_id;
```

#### PRACTICE (no reference revealed)

**Task — enriched fact preview without inflating the grain:** Assemble a line-item fact by joining three tables: `order_items` → `orders` (on `order_id`) → `products` (on `product_id`). Return one row **per order item** with columns `order_item_id`, `order_id`, `product_name`, `category`, `order_status`, and `line_revenue` (that item's `quantity * unit_price_cents`), sorted by `order_item_id`. Because this is a 1:N chain, prove to yourself the grain stays at the line-item level — the output row count must equal the number of `order_items` rows that have a matching order **and** a matching product (inner joins on both). Do **not** sum anything; this is a preview at line grain.

**Seed:**

```sql
CREATE TABLE customers (
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
  (5, 102, 77, 1, 1000);   -- product 77 does not exist → dropped by inner join to products
```

**Expected result** (`orderMatters: true` — sorted by `order_item_id`): one row per order item that matches both an order and a product. Item 5 references product 77 (nonexistent) and is dropped by the inner join, so 4 rows come back at line-item grain, each carrying its product name, category, parent order's status, and its own `line_revenue`.

**Hints:**
1. Drive from the most granular table: `FROM order_items oi INNER JOIN orders o ON oi.order_id = o.order_id INNER JOIN products p ON oi.product_id = p.product_id`.
2. Qualify columns from each of the three aliases; `line_revenue` is computed from `oi.quantity * oi.unit_price_cents`.
3. The inner join to `products` silently drops item 5 (product 77 missing) — that's the correct grain behavior, not a bug to work around.
4. Resist the urge to `SUM` — the task wants a row-level preview; summing would require choosing the right measure and grain, which is a later lesson.

---

### Lesson `sql-l2-left-join` — LEFT JOIN and Preserving Rows

- **summary:** Keep all rows from the driving table even when the match is missing.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** `LEFT JOIN`, outer-join NULLs, preserving the driving side, `COALESCE` on join

#### READ

An `INNER JOIN` silently drops any row without a match. That's often exactly wrong. If you're building "orders per customer," a customer with zero orders should show **0**, not vanish — dropping them understates your customer base and hides the very thing you might be investigating. The fix is `LEFT JOIN`: keep **every** row from the left (driving) table, and fill the right table's columns with `NULL` where there's no match.

Worked example — every customer, with their order count, including the silent ones:

```sql
SELECT
  c.customer_id,
  c.customer_name,
  COUNT(o.order_id) AS order_count
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name;
```

A customer with no orders still appears; their `o.order_id` is NULL, and `COUNT(o.order_id)` — which skips NULLs — correctly returns `0` for them.

**Anatomy — the NULL is the whole point:**

```
customers (LEFT)   LEFT JOIN   orders (RIGHT)
  every row kept  ───────────►  matched cols filled, else NULL
```

Two rules that make left joins behave:

1. **`COUNT(right.col)` not `COUNT(*)`** in an aggregate. `COUNT(*)` counts the NULL-padded row as 1, giving a customer with no orders a count of `1` instead of `0`. `COUNT(o.order_id)` skips the NULL and returns `0`. This is the single most common left-join-plus-aggregate bug.
2. **Filtering the right table in `WHERE` secretly turns a LEFT JOIN into an INNER JOIN.** A condition like `WHERE o.status = 'paid'` rejects the NULL-padded no-match rows (because `NULL = 'paid'` is not true), silently dropping the very rows you left-joined to preserve. If you must filter the right side, put the condition in the `ON` clause (`LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'`) so unmatched left rows survive.

**Keep it readable / common pitfall:** use `COALESCE(right.col, default)` to turn the NULLs into a sensible display value — `COALESCE(SUM(o.total_cents), 0)` shows `0` revenue for a customer who never bought, instead of a blank.

**Recap:** `LEFT JOIN` preserves every driving-table row and NULL-pads missing matches; aggregate with `COUNT(right.col)` for a true 0, and never filter the right table in `WHERE` or you collapse it back to an inner join.

#### APPLY (guided)

**Task:** List every customer with their order count, including customers who have never ordered (they must show `0`). Return `customer_id`, `customer_name`, `order_count`, sorted by `customer_id`.

**Seed:**

```sql
CREATE TABLE customers (
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
  (102, 2);
```

**Expected result** (`orderMatters: true`):

| customer_id | customer_name | order_count |
|---|---|---|
| 1 | Ada | 2 |
| 2 | Grace | 1 |
| 3 | Alan | 0 |

**Hints:**
1. Drive from `customers` (the table whose rows you must keep): `FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id`.
2. Aggregate with `COUNT(o.order_id)`, **not** `COUNT(*)` — otherwise Alan gets `1`.
3. Group by the customer columns you select: `GROUP BY c.customer_id, c.customer_name`.

**Reference solution:**

```sql
SELECT
  c.customer_id,
  c.customer_name,
  COUNT(o.order_id) AS order_count
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name
ORDER BY c.customer_id;
```

#### PRACTICE (no reference revealed)

**Task — product coverage report:** For **every** product (including ones that never sold), report total units sold. Return `product_id`, `product_name`, and `units_sold` (sum of `quantity` from matching `order_items`, shown as `0` — not NULL — when the product never sold), sorted by `product_id`. A product with no sales must appear with `units_sold = 0`.

**Seed:**

```sql
CREATE TABLE products (
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
  (5, 11, 4);
```

**Expected result** (`orderMatters: true`): four rows, one per product. `USB-C Cable` = 5, `Earbuds` = 5, `Smartwatch` = 1, `Screen Protector` = 0 (it must appear despite never selling).

**Hints:**
1. Drive from `products` and `LEFT JOIN order_items` so unsold products survive.
2. `SUM(oi.quantity)` returns NULL for a product with no matching items — wrap it: `COALESCE(SUM(oi.quantity), 0)`.
3. Group by the product columns; sort by `product_id`.
4. Don't add a `WHERE` on `oi.*` — it would drop the unsold product and defeat the whole point.

---

### Lesson `sql-l2-anti-join` — Anti-Joins: Finding Missing Matches

- **summary:** Find records that have no counterpart — the DE's referential-integrity check.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** anti-join (`LEFT JOIN … IS NULL`), semi-join concept, orphan detection

#### READ

Before you trust a source, you check its **referential integrity**: does every `order` point at a real `customer`? Does every `order_item` point at a real `product`? Rows that point at a nonexistent parent are **orphans**, and finding them is a DE's daily hygiene. The pattern is the **anti-join**: "give me every left row that has *no* match on the right."

The portable recipe is a `LEFT JOIN` plus an `IS NULL` filter:

```sql
SELECT o.order_id, o.customer_id
FROM orders AS o
LEFT JOIN customers AS c
  ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL;   -- keep ONLY the rows that failed to match
```

The `LEFT JOIN` keeps every order and NULL-pads the customer columns for unmatched orders. The `WHERE c.customer_id IS NULL` then keeps *only* those NULL-padded rows — the orphans. Every matched order is discarded because its `c.customer_id` is non-NULL.

**Anatomy:**

```
LEFT JOIN customers c ON ...     → matched orders get c.*, orphans get NULLs
WHERE c.customer_id IS NULL      → survives ONLY if there was NO match  ← the anti-join
```

**Two siblings, one distinction:**
- **Anti-join** = rows with *no* match (what we just wrote).
- **Semi-join** = rows *with* a match, but you don't want the right table's columns — classically written `WHERE EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = o.customer_id)` or `WHERE o.customer_id IN (SELECT customer_id FROM customers)`. Use it when you only need to *confirm* a match exists, not pull data from it.

> **In the warehouse this differs.** `NOT IN` is a tempting shorthand for an anti-join, but it has a NULL landmine: if the subquery's list contains even one NULL, `NOT IN` returns *no rows at all* (three-valued logic — `x NOT IN (…, NULL)` is never true). The `LEFT JOIN … IS NULL` and `NOT EXISTS` patterns are NULL-safe and work identically across SQLite, Postgres, and every warehouse. Prefer them.

**Keep it readable / common pitfall:** the `IS NULL` must reference a column that is **guaranteed non-NULL in matched rows** — the join key or the right table's primary key. If you `IS NULL`-check a nullable right column, you'll misclassify matched rows (that legitimately have a NULL there) as orphans.

**Recap:** An anti-join finds rows with no counterpart via `LEFT JOIN … WHERE right.key IS NULL` — the backbone of orphan/FK checks; prefer it (or `NOT EXISTS`) over `NOT IN`, which breaks on NULLs.

#### APPLY (guided)

**Task:** Find `orders` whose `customer_id` has no matching row in `customers` (orphaned orders). Return `order_id` and `customer_id`, sorted by `order_id`.

**Seed:**

```sql
CREATE TABLE customers (
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
  (103, 7);    -- orphan: customer 7 doesn't exist
```

**Expected result** (`orderMatters: true`):

| order_id | customer_id |
|---|---|
| 101 | 9 |
| 103 | 7 |

**Hints:**
1. `LEFT JOIN customers c ON o.customer_id = c.customer_id` keeps all orders.
2. Filter to the unmatched ones with `WHERE c.customer_id IS NULL`.
3. Select from the `orders` side (`o.order_id`, `o.customer_id`) — the `customers` columns are all NULL for orphans.

**Reference solution:**

```sql
SELECT o.order_id, o.customer_id
FROM orders AS o
LEFT JOIN customers AS c
  ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL
ORDER BY o.order_id;
```

#### PRACTICE (no reference revealed)

**Task — referential audit (union of two anti-joins):** Produce a single problem report of two kinds of integrity break, tagged by type. Return columns `issue_type` and `bad_id`, where each row is either:
- `'orphan_order_item'` — an `order_items` row whose `product_id` has no matching product; `bad_id` is the `order_item_id`.
- `'customer_no_orders'` — a `customers` row that has never appeared in `orders`; `bad_id` is the `customer_id`.

Stack both anti-joins with `UNION ALL` and sort by `issue_type`, then `bad_id`.

**Seed:**

```sql
CREATE TABLE customers (
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
  (4, 101, 88);      -- product 88 doesn't exist → orphan item
```

**Expected result** (`orderMatters: true` — sorted by `issue_type`, then `bad_id`): two `customer_no_orders` rows (customers 3 and 4) and two `orphan_order_item` rows (items 2 and 4), each tagged in `issue_type`. Sorted, `customer_no_orders` rows come before `orphan_order_item` rows alphabetically.

**Hints:**
1. Write each anti-join separately first. Orphan items: `order_items LEFT JOIN products … WHERE products.product_id IS NULL`. Customers with no orders: `customers LEFT JOIN orders … WHERE orders.order_id IS NULL`.
2. In each `SELECT`, hard-code the tag as a literal column: `SELECT 'orphan_order_item' AS issue_type, oi.order_item_id AS bad_id …`.
3. Both `SELECT`s must expose the **same two column names in the same order** to be `UNION ALL`-compatible.
4. Combine with `UNION ALL` (no dedup needed here) and add a final `ORDER BY issue_type, bad_id` after the union.

---

### Lesson `sql-l2-self-join` — Self-Joins and RIGHT/FULL OUTER

- **summary:** Join a table to itself and reconcile two sources with outer joins.
- **difficulty:** hard
- **estimatedMinutes:** 30
- **skills:** self-join, `RIGHT JOIN`, `FULL OUTER JOIN`, aliasing one table twice

#### READ

Sometimes the two things you're relating live in the **same** table. An `employees` table where each row has a `manager_id` pointing at another row *in that same table* is the classic case — to show each employee next to their manager's name, you join `employees` to `employees`. This is a **self-join**, and the only trick is that you must alias the table twice so the two "copies" are distinguishable.

```sql
SELECT
  e.employee_name          AS employee,
  m.employee_name          AS manager
FROM employees AS e
LEFT JOIN employees AS m
  ON e.manager_id = m.employee_id;
```

`e` is the employee copy, `m` is the manager copy. The `ON` says "match this row's `manager_id` to some other row's `employee_id`." Using `LEFT JOIN` keeps top-level employees (whose `manager_id` is NULL) with a NULL manager, rather than dropping them.

**Anatomy:**

```
FROM employees AS e            ← "the employee" copy
LEFT JOIN employees AS m       ← "the manager" copy (same table, second alias)
  ON e.manager_id = m.employee_id
```

**Outer joins for reconciliation.** When you compare two *different* sources — yesterday's snapshot vs today's — you often need every key from **both** sides so you can see what was added, dropped, or changed. That's a `FULL OUTER JOIN`: keep all left rows, all right rows, NULL-pad wherever one side is missing. A `RIGHT JOIN` is just a `LEFT JOIN` with the tables swapped (keep all right-side rows).

> **In the warehouse this differs.** `RIGHT JOIN` and `FULL OUTER JOIN` only arrived in SQLite 3.39 (2022). Older embedded builds reject them, and you'll sometimes see them emulated as `LEFT JOIN` + a `UNION` of the reverse `LEFT JOIN`. Postgres, Snowflake, BigQuery, and SQL Server have supported both for years. The self-join is universal — it's just an ordinary join whose two operands happen to be the same table.

**Keep it readable / common pitfall:** in a `FULL OUTER JOIN`, a key present on only one side has NULL for *that side's* key column — so to get a single non-NULL key for the output, `COALESCE(a.id, b.id)`. And to classify each row (added / dropped / changed), test which side's key is NULL.

**Recap:** A self-join is an ordinary join with the table aliased twice (e.g. employee↔manager); `FULL OUTER JOIN` keeps unmatched rows from both sides for reconciliation — available in SQLite ≥3.39 and every major warehouse.

#### APPLY (guided)

**Task:** Self-join `employees` to pair each employee with their manager's name. Return `employee` (the person's name) and `manager` (their manager's name, or NULL for someone with no manager), sorted by `employee`.

**Seed:**

```sql
CREATE TABLE employees (
  employee_id   INTEGER PRIMARY KEY,
  employee_name TEXT,
  manager_id    INTEGER     -- NULL for the top of the org
);
INSERT INTO employees VALUES
  (1, 'Ada',   NULL),
  (2, 'Grace', 1),
  (3, 'Alan',  1),
  (4, 'Katherine', 2);
```

**Expected result** (`orderMatters: true` — sorted by `employee`):

| employee | manager |
|---|---|
| Ada | NULL |
| Alan | Ada |
| Grace | Ada |
| Katherine | Grace |

**Hints:**
1. Alias the table twice: `FROM employees e LEFT JOIN employees m ON e.manager_id = m.employee_id`.
2. Use `LEFT JOIN` (not `INNER`) so Ada, who has no manager, still appears with a NULL manager.
3. Select `e.employee_name AS employee` and `m.employee_name AS manager`.

**Reference solution:**

```sql
SELECT
  e.employee_name AS employee,
  m.employee_name AS manager
FROM employees AS e
LEFT JOIN employees AS m
  ON e.manager_id = m.employee_id
ORDER BY e.employee_name;
```

#### PRACTICE (no reference revealed)

**Task — reconcile two daily snapshots:** You have yesterday's and today's customer dimension snapshots. Use a `FULL OUTER JOIN` on `customer_id` to surface every change. Return `customer_id` (the non-NULL id from whichever side has it), and `change_type`, one of:
- `'added'` — in today but not yesterday,
- `'dropped'` — in yesterday but not today,
- `'changed'` — in both, but `tier` differs,
- `'unchanged'` — in both with the same `tier`.

Sort by `customer_id`.

**Seed:**

```sql
CREATE TABLE snapshot_yesterday (
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
  (2, 'gold'),      -- changed (silver → gold)
  (4, 'silver'),    -- unchanged
  (5, 'bronze');    -- added; customer 3 dropped
```

**Expected result** (`orderMatters: true` — sorted by `customer_id`): customer 1 `unchanged`, 2 `changed`, 3 `dropped`, 4 `unchanged`, 5 `added`. The `customer_id` column must be non-NULL for every row.

**Hints:**
1. `FROM snapshot_yesterday y FULL OUTER JOIN snapshot_today t ON y.customer_id = t.customer_id` (SQLite ≥3.39 supports this).
2. Get a single id with `COALESCE(y.customer_id, t.customer_id) AS customer_id`.
3. Build `change_type` with a `CASE`: test `y.customer_id IS NULL` → `'added'`; `t.customer_id IS NULL` → `'dropped'`; `y.tier <> t.tier` → `'changed'`; else `'unchanged'`.
4. Order the `CASE` branches so the NULL-side checks come *before* the `tier` comparison (comparing a NULL tier would otherwise fall through).

---

## Module 2.3 — Set Operations and Subqueries

Joins combine tables side-by-side; set operations stack them vertically and diff them, and subqueries let one query feed another.

---

### Lesson `sql-l2-set-ops` — UNION, INTERSECT, EXCEPT

- **summary:** Stack and compare result sets with set logic.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** `UNION`, `UNION ALL`, `INTERSECT`, `EXCEPT`, column compatibility

#### READ

A join glues tables **horizontally** (adding columns). Set operations stack or compare them **vertically** (combining *rows*). As a DE you reach for them constantly: stacking multi-region loads into one stream, or diffing yesterday's IDs against today's to find what disappeared.

The four operators, all requiring both sides to have the **same number of columns with compatible types**:

| Operator | Meaning |
|---|---|
| `UNION ALL` | stack all rows from both, **keep duplicates** (cheapest — no dedup pass) |
| `UNION` | stack and **remove duplicate rows** |
| `INTERSECT` | rows present in **both** result sets |
| `EXCEPT` | rows in the first set but **not** the second (a set difference / diff) |

Worked example — stack two regional order feeds:

```sql
SELECT order_id, total_cents FROM orders_eu
UNION ALL
SELECT order_id, total_cents FROM orders_us;
```

**Anatomy:**

```
SELECT a, b FROM left_source
UNION ALL                       ← operator sits BETWEEN two full SELECTs
SELECT a, b FROM right_source   ← same column count, compatible types, matched by POSITION
ORDER BY a                      ← a single ORDER BY applies to the whole combined result, at the end
```

Columns are matched **by position, not by name** — the first column of the top query lines up with the first column of the bottom, regardless of what they're called. The output takes its column names from the *first* `SELECT`.

**`UNION` vs `UNION ALL` — a real cost decision.** `UNION` runs a deduplication pass (effectively a sort or hash) over the combined rows; `UNION ALL` just concatenates. When you *know* the sources don't overlap — or you *want* to preserve duplicates (e.g. two regions that both legitimately contain an order with the same total) — use `UNION ALL`. Reaching for `UNION` by reflex silently drops legitimate duplicate rows *and* costs more.

**Keep it readable / common pitfall:** put `ORDER BY` only once, after the final `SELECT` — it sorts the whole combined set. An `ORDER BY` inside an individual branch is either ignored or an error depending on the engine.

**Recap:** Set operators combine rows vertically by column position — `UNION ALL` stacks and keeps dupes (cheapest), `UNION` dedupes, `INTERSECT` keeps common rows, and `EXCEPT` computes a diff.

#### APPLY (guided)

**Task:** Combine two regional order tables into one stream, keeping every row (including any coincidental duplicates). Return `order_id` and `region` for all EU and US orders, using `UNION ALL`, sorted by `order_id`, then `region`.

**Seed:**

```sql
CREATE TABLE orders_eu (
  order_id INTEGER,
  region   TEXT
);
CREATE TABLE orders_us (
  order_id INTEGER,
  region   TEXT
);
INSERT INTO orders_eu VALUES (100,'EU'),(101,'EU'),(102,'EU');
INSERT INTO orders_us VALUES (200,'US'),(201,'US');
```

**Expected result** (`orderMatters: true`):

| order_id | region |
|---|---|
| 100 | EU |
| 101 | EU |
| 102 | EU |
| 200 | US |
| 201 | US |

**Hints:**
1. Write two `SELECT order_id, region FROM …` and join them with `UNION ALL`.
2. Both branches must expose the same two columns in the same order.
3. A single `ORDER BY order_id, region` goes at the very end, after the second `SELECT`.

**Reference solution:**

```sql
SELECT order_id, region FROM orders_eu
UNION ALL
SELECT order_id, region FROM orders_us
ORDER BY order_id, region;
```

#### PRACTICE (no reference revealed)

**Task — diff two source extracts:** Find customer IDs that were present in yesterday's extract but are **missing** from today's (dropped customers) using `EXCEPT`. Return a single column `dropped_customer_id`, sorted ascending. (Both extracts may contain duplicate rows within themselves — `EXCEPT` treats each side as a set, which is exactly what you want for a presence diff.)

**Seed:**

```sql
CREATE TABLE extract_yesterday (
  customer_id INTEGER
);
CREATE TABLE extract_today (
  customer_id INTEGER
);
INSERT INTO extract_yesterday VALUES (1),(2),(2),(3),(4);
INSERT INTO extract_today     VALUES (2),(3),(5);
```

**Expected result** (`orderMatters: true`): two rows — customer `1` and customer `4` (present yesterday, absent today). Customer 2's duplicate doesn't matter; `EXCEPT` is set-based.

**Hints:**
1. `EXCEPT` returns rows in the first `SELECT` that aren't in the second: `SELECT customer_id FROM extract_yesterday EXCEPT SELECT customer_id FROM extract_today`.
2. `EXCEPT` already deduplicates, so the doubled `2` in yesterday collapses to a set automatically.
3. Alias isn't applied per-branch — name the output column in the first `SELECT` (`SELECT customer_id AS dropped_customer_id …`) and sort at the end.

---

### Lesson `sql-l2-subqueries` — Subqueries: Scalar, IN, and Correlated

- **summary:** Nest a query inside another to filter or compute against a derived value.
- **difficulty:** hard
- **estimatedMinutes:** 30
- **skills:** scalar subquery, `IN` subquery, correlated subquery, `EXISTS`

#### READ

A subquery is a `SELECT` nested inside another query. You use one whenever a filter or a computed value depends on *another query's result* — "orders above the overall average," "customers who have ever ordered," "orders bigger than that customer's own average." There are three shapes, and knowing which is which is a common interview probe.

**1. Scalar subquery** — returns exactly one row, one column; usable anywhere a single value is:

```sql
SELECT order_id, total_cents
FROM orders
WHERE total_cents > (SELECT AVG(total_cents) FROM orders);
```

The inner query yields one number (the overall average); the outer query compares each order to it.

**2. `IN` (or `NOT IN`) subquery** — returns one column, many rows; tests set membership:

```sql
SELECT customer_id, customer_name
FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders);   -- customers who have ordered
```

**3. Correlated subquery** — references the outer row, so it re-runs *per outer row*:

```sql
SELECT o.order_id, o.customer_id, o.total_cents
FROM orders AS o
WHERE o.total_cents > (
  SELECT AVG(o2.total_cents)
  FROM orders AS o2
  WHERE o2.customer_id = o.customer_id   -- ← the correlation: depends on the outer o
);
```

For each order, the inner query computes *that order's customer's* average — "orders above their own customer's average."

**Anatomy — spot the correlation:**

```
non-correlated: inner query is self-contained, runs ONCE
correlated:     inner query references an outer alias (o), re-evaluated per outer row
```

**`EXISTS`** is the correlated cousin of `IN`: `WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)` — true if at least one matching row exists. It's the NULL-safe way to write a semi-join.

> **Performance note.** A correlated subquery conceptually re-runs per outer row, which can be slow on large tables. Very often the same result is expressible as a **join** or a **window function** (Level 4), which the optimizer executes in one pass. Reach for the correlated form for clarity, but know that "above their own group's average" is a textbook case a window function does faster.

**Keep it readable / common pitfall:** a scalar subquery that accidentally returns more than one row is a runtime error (`sub-select returns N columns/rows`). And remember the `NOT IN` + NULL trap from Level 1 — if the subquery can emit a NULL, prefer `NOT EXISTS`.

**Recap:** Subqueries come in three shapes — scalar (one value), `IN` (a column of values), and correlated (re-runs per outer row referencing it); correlated logic is clear but often beaten on speed by a join or a window function.

#### APPLY (guided)

**Task:** Return every order whose `total_cents` exceeds the overall average `total_cents` across all orders (a scalar subquery). Return `order_id` and `total_cents`, sorted by `order_id`.

**Seed:**

```sql
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (100, 1000),
  (101, 2000),
  (102, 9000),
  (103, 3000),
  (104,  500);
-- average = (1000+2000+9000+3000+500)/5 = 3100
```

**Expected result** (`orderMatters: true`): orders above 3100 → order 102 (9000). (Order 103 at 3000 is below the 3100 average; only 102 clears it.)

| order_id | total_cents |
|---|---|
| 102 | 9000 |

**Hints:**
1. Compute the average in a scalar subquery: `(SELECT AVG(total_cents) FROM orders)`.
2. Compare each row to it in the `WHERE`: `WHERE total_cents > (…)`.
3. The subquery returns one value, so it slots directly into the comparison.

**Reference solution:**

```sql
SELECT order_id, total_cents
FROM orders
WHERE total_cents > (SELECT AVG(total_cents) FROM orders)
ORDER BY order_id;
```

#### PRACTICE (no reference revealed)

**Task — above-their-own-average orders (correlated):** For each order, keep it only if its `total_cents` is strictly greater than the **average `total_cents` of that same customer's orders**. Return `customer_id`, `order_id`, and `total_cents`, sorted by `customer_id`, then `order_id`. Use a correlated subquery that averages within the outer row's customer. (Note for yourself: a window function `AVG() OVER (PARTITION BY customer_id)` would compute this in one pass — you'll meet it in Level 4.)

**Seed:**

```sql
CREATE TABLE orders (
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
  (105, 3, 4000);   -- cust 3 avg = 4000 → nothing strictly above
```

**Expected result** (`orderMatters: true`): order 101 (cust 1, 3000) and order 104 (cust 2, 8000). Customer 3's single order equals its own average and is excluded (strictly greater).

**Hints:**
1. Alias the outer table (`orders o`) and use a second alias inside (`orders o2`) so the subquery can correlate on `o2.customer_id = o.customer_id`.
2. The inner query is `SELECT AVG(o2.total_cents) FROM orders o2 WHERE o2.customer_id = o.customer_id`.
3. Compare with strict `>` so an order equal to its customer's average (customer 3) is excluded.
4. This is the correlated shape — the inner query references the outer `o`, so it re-evaluates per order.

---

## Module 2.4 — Readability and Conditional Logic

The final module makes multi-step SQL readable with CTEs, and adds row-level branching with `CASE` — including the conditional-aggregation trick that pivots rows into columns.

---

### Lesson `sql-l2-ctes` — CTEs: Readable Multi-Step Queries

- **summary:** Name subqueries with `WITH` so a transform reads top-to-bottom.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** `WITH`, single and chained CTEs, refactoring nested subqueries

#### READ

Nested subqueries read inside-out — you parse the innermost first and work outward, which is exhausting once there are two levels. A **Common Table Expression (CTE)**, introduced with `WITH`, lets you name each step and read the query **top-to-bottom** like a pipeline. This is not cosmetic: production SQL (every dbt model) is built as a chain of named CTEs precisely because named stages are reviewable, testable, and self-documenting.

Syntax — name a subquery, then use it like a table:

```sql
WITH paid_orders AS (
  SELECT customer_id, total_cents
  FROM orders
  WHERE status = 'paid'
)
SELECT customer_id, SUM(total_cents) AS revenue
FROM paid_orders
GROUP BY customer_id;
```

**Chaining** — each CTE can reference the ones above it, forming the staging → intermediate → mart pattern:

```sql
WITH paid_orders AS (
  SELECT customer_id, total_cents FROM orders WHERE status = 'paid'
),
per_customer AS (
  SELECT customer_id, SUM(total_cents) AS revenue
  FROM paid_orders
  GROUP BY customer_id
)
SELECT * FROM per_customer WHERE revenue > 10000;
```

**Anatomy:**

```
WITH name1 AS ( … ),        ← first stage
     name2 AS ( … name1 … ) ← second stage, may read name1
SELECT … FROM name2         ← final query reads the last stage
       └─ commas separate CTEs; the final SELECT has NO leading comma ─┘
```

**Keep it readable / common pitfall:** each CTE definition is comma-separated, but there is **no comma** before the final `SELECT`. A CTE is scoped to the single statement it prefixes — you can't reference it from a later, separate query. (In most engines a non-recursive CTE is just a named inline view; SQLite may materialize or inline it, but correctness is identical.)

**Recap:** `WITH` names a subquery so a transform reads top-to-bottom; chain CTEs (each reading the previous) to express the staging → intermediate → mart pipeline that production SQL is built from.

#### APPLY (guided)

**Task:** Rewrite a two-level nested subquery as **two chained CTEs**. The goal: from `orders`, first select paid orders, then aggregate revenue per customer, then return only customers with revenue over 5000. Return `customer_id` and `revenue`, sorted by `customer_id`.

**Seed:**

```sql
CREATE TABLE orders (
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
  (5, 3, 'paid',      6000);
```

**Expected result** (`orderMatters: true`): customer 1 (revenue 7000) and customer 3 (revenue 6000). Customer 2 has only 1000 in paid revenue (the 9000 is cancelled) → excluded.

| customer_id | revenue |
|---|---|
| 1 | 7000 |
| 3 | 6000 |

**Hints:**
1. First CTE `paid_orders`: `SELECT customer_id, total_cents FROM orders WHERE status = 'paid'`.
2. Second CTE `per_customer` reads the first: `SELECT customer_id, SUM(total_cents) AS revenue FROM paid_orders GROUP BY customer_id`.
3. Final `SELECT * FROM per_customer WHERE revenue > 5000 ORDER BY customer_id` — no comma before this final SELECT.

**Reference solution:**

```sql
WITH paid_orders AS (
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
ORDER BY customer_id;
```

#### PRACTICE (no reference revealed)

**Task — a staged mart in CTEs:** Author a three-stage transform. Stage 1 `paid_orders`: paid orders only, joined to their line items to get line revenue. Stage 2 `per_customer`: revenue and order count per customer. Final: customers with **more than 1 order** AND **revenue over 10000**, returning `customer_id`, `order_count`, `revenue`, sorted by `revenue` descending. This mirrors the staging → intermediate → mart structure of production SQL.

**Seed:**

```sql
CREATE TABLE orders (
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
  (103, 3, 'cancelled'),   -- excluded
  (104, 3, 'paid');
INSERT INTO order_items VALUES
  (1, 100, 2, 3000),   -- 6000
  (2, 101, 1, 8000),   -- 8000  → cust 1: 2 orders, 14000
  (3, 102, 1, 5000),   -- 5000  → cust 2: 1 order, 5000  (fails count test)
  (4, 103, 1, 9999),   -- cancelled order, excluded
  (5, 104, 1, 4000);   -- cust 3: 1 order, 4000 (fails both tests)
```

**Expected result** (`orderMatters: true` — sorted by `revenue` DESC): only customer 1 (2 orders, 14000 revenue). Customer 2 has only 1 order; customer 3 has 1 order and low revenue; the cancelled order 103 contributes nothing.

**Hints:**
1. Stage 1 `paid_orders`: `SELECT o.order_id, o.customer_id, oi.quantity * oi.unit_price_cents AS line_revenue FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'paid'`.
2. Stage 2 `per_customer`: group stage 1 by `customer_id`, computing `COUNT(DISTINCT order_id) AS order_count` and `SUM(line_revenue) AS revenue`.
3. Use `COUNT(DISTINCT order_id)` for order count — a fan-out join means a single order can span multiple item rows.
4. Final filter: `WHERE order_count > 1 AND revenue > 10000`, ordered by `revenue DESC`.

---

### Lesson `sql-l2-case` — CASE: Conditional Columns

- **summary:** Branch a value inside a query for bucketing and pivoting.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** `CASE WHEN`, searched vs simple `CASE`, conditional aggregation

#### READ

`CASE` is SQL's `if/else`. It lets you compute a *different value per row* based on conditions — bucketing a numeric measure into labels, mapping codes to names, or (the DE power move) pivoting rows into columns via **conditional aggregation**.

**Searched `CASE`** (the general form — conditions can be anything):

```sql
SELECT
  order_id,
  CASE
    WHEN total_cents >= 10000 THEN 'large'
    WHEN total_cents >= 2000  THEN 'medium'
    ELSE 'small'
  END AS size_bucket
FROM orders;
```

Conditions are tested top-to-bottom; the **first** true branch wins, so order them from most to least specific. If none match and there's no `ELSE`, the result is NULL.

**Simple `CASE`** (shorthand when you're comparing one expression to constants):

```sql
CASE status WHEN 'paid' THEN 1 WHEN 'cancelled' THEN 0 ELSE NULL END
```

**Anatomy:**

```
CASE WHEN cond1 THEN val1     ← first matching branch wins
     WHEN cond2 THEN val2
     ELSE fallback            ← optional; without it, no-match → NULL
END AS alias
```

**The conditional-aggregation trick — pivoting rows into columns.** Wrap a `CASE` inside an aggregate and you turn categories into columns. To count paid vs cancelled *side by side, per day*:

```sql
SELECT
  order_date,
  SUM(CASE WHEN status = 'paid'      THEN 1 ELSE 0 END) AS paid_count,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
FROM orders
GROUP BY order_date;
```

Each `CASE` emits `1` for the rows it wants and `0` otherwise; the `SUM` counts them. This is how you build a classic reporting mart (one row per day, one column per status) without a dedicated PIVOT operator — and it's fully portable, whereas `PIVOT` syntax is warehouse-specific.

**Keep it readable / common pitfall:** every branch of a `CASE` should return the **same type**. Mixing `'small'` (text) and `0` (number) across branches yields inconsistent typing that some engines coerce and others reject. Also: `COUNT(CASE WHEN … THEN 1 END)` works too (COUNT skips the NULL from the missing `ELSE`), but `SUM(CASE … THEN 1 ELSE 0 END)` is the clearer, more portable idiom.

**Recap:** `CASE` branches a value per row (first true `WHEN` wins) for bucketing; wrapped inside `SUM`/`COUNT` it becomes conditional aggregation — the portable way to pivot categories into side-by-side columns.

#### APPLY (guided)

**Task:** Bucket each order by `total_cents` into `size_bucket`: `'large'` if ≥ 10000, `'medium'` if ≥ 2000 (and < 10000), else `'small'`. Return `order_id` and `size_bucket`, sorted by `order_id`.

**Seed:**

```sql
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  total_cents INTEGER
);
INSERT INTO orders VALUES
  (100,   500),
  (101,  2000),
  (102,  9900),
  (103, 10000),
  (104, 15000);
```

**Expected result** (`orderMatters: true`):

| order_id | size_bucket |
|---|---|
| 100 | small |
| 101 | medium |
| 102 | medium |
| 103 | large |
| 104 | large |

**Hints:**
1. Order the `WHEN` branches from highest threshold down: check `>= 10000` first, then `>= 2000`.
2. The first true branch wins, so you don't need upper bounds — a 15000 order matches `>= 10000` before reaching `>= 2000`.
3. Add an `ELSE 'small'` for everything below 2000, and alias the whole thing `AS size_bucket`.

**Reference solution:**

```sql
SELECT
  order_id,
  CASE
    WHEN total_cents >= 10000 THEN 'large'
    WHEN total_cents >= 2000  THEN 'medium'
    ELSE 'small'
  END AS size_bucket
FROM orders
ORDER BY order_id;
```

#### PRACTICE (no reference revealed)

**Task — pivot statuses into columns (conditional aggregation):** Build a daily status report: **one row per `order_date`** with three count columns — `paid_count`, `shipped_count`, `cancelled_count` — using conditional aggregation. Return `order_date`, `paid_count`, `shipped_count`, `cancelled_count`, sorted by `order_date`. Every date present in the source must appear, and a status with zero occurrences that day must show `0` (not NULL).

**Seed:**

```sql
CREATE TABLE orders (
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
  (7, '2026-03-03', 'cancelled');
```

**Expected result** (`orderMatters: true` — sorted by `order_date`): three rows. `2026-03-01`: paid 2, shipped 0, cancelled 1. `2026-03-02`: paid 1, shipped 2, cancelled 0. `2026-03-03`: paid 0, shipped 0, cancelled 1. Zero-count statuses show `0`.

**Hints:**
1. `GROUP BY order_date` gives one row per day.
2. Each count column is `SUM(CASE WHEN status = '<x>' THEN 1 ELSE 0 END)` — the `ELSE 0` guarantees a `0`, not a NULL, for absent statuses.
3. Three such `SUM(CASE …)` expressions, one per status, become your three columns.
4. Sort by `order_date` for a deterministic report.

---

*End of Level 2 — Aggregation & Joins. Learners leave able to compute grouped metrics, filter groups, stitch multiple source tables with every join flavor, run referential-integrity audits, diff and stack extracts, nest and name queries, and pivot with conditional aggregation — the full single-query toolkit that Level 3's multi-statement modeling work builds on.*

---

# LEVEL 3 — Data Modeling & Schema Design

- **id:** `3`
- **slug:** `data-modeling`
- **title:** Data Modeling & Schema Design
- **tagline:** Design the tables, keys, and relationships that make a warehouse trustworthy — from raw dump to normalized schema to first star.
- **defaultExecutionMode:** `workspace`
- **estimatedHours:** `7`

## Level intro

In Levels 1 and 2 you *read* data: one `SELECT` at a time against a source table someone else designed. Level 3 flips the job. You now decide **where data lives, what shape it takes, and which rules the database itself enforces** before a single analyst query runs.

**Who this is for:** a DE intern who can query confidently and is now handed the harder half of the job — turning a messy raw dump into a schema you can trust. You'll stop asking "what's in this table?" and start asking "what *should* this table be, and how do I stop bad rows from ever landing?"

**What you'll build across the level:**
- DDL for clean staging tables with correct types, defaults, and audit columns.
- Load steps that transform-and-insert (`INSERT … SELECT`) — the "T" of ELT.
- Keys and constraints (PK, FK, `UNIQUE`, `CHECK`) that make identity and referential integrity impossible to violate.
- A full normalization pass from a flat spreadsheet export up to 3NF — then a deliberate denormalization for analytics.
- ER models, junction tables for many-to-many, and the indexes that keep reads fast.
- Your first Kimball **star schema**: narrow fact, wide dimensions, declared grain.

**Execution mode:** every exercise here is `workspace` — you write a **multi-statement script** (DDL + DML + queries). Your script runs against a fresh in-memory SQLite database, then a hidden test runner executes assertion queries and prints the `__WORKSPACE_TEST_RESULTS__:` JSON the grader reads. Tests check three things: **schema shape** (did the right columns/constraints get created?), **constraint enforcement** (does a bad insert actually fail?), and **row outcomes** (did the data land the way the spec demands?).

**A word on SQLite vs the warehouse:** we run browser SQLite for instant feedback, and SQLite is famously permissive — it will let a lot slide that Postgres, Snowflake, or BigQuery would reject. Every place that matters, you'll see an **"In the warehouse this differs…"** callout. Write your DDL as if the strict warehouse is watching, because in your real job it is.

> **One SQLite gotcha up front, used all level:** foreign-key enforcement is **off by default**. Start FK-related scripts with `PRAGMA foreign_keys = ON;` or your `REFERENCES` clauses are decorative.

---

## Module 3.1 — DDL, Types, and Loading Data

You can't model what you can't create. This module covers the two verbs every pipeline is built on: `CREATE TABLE` to define structure, and `INSERT` (both literal and `INSERT … SELECT`) to fill it.

---

### Lesson `sql-l3-ddl-create` — CREATE TABLE and Data Types  *(full exemplar)*

- **summary:** Define a table's structure with the right column types.
- **difficulty:** easy
- **estimatedMinutes:** 25
- **skills:** `CREATE TABLE`, `DROP TABLE`, column types, type affinity, `DEFAULT`

#### READ

Every table in a warehouse started as a `CREATE TABLE` statement someone wrote. That statement is a **contract**: it declares the columns, their types, which values are allowed to be missing, and what a row looks like when the loader doesn't supply every field. Get the contract right and downstream models inherit clean, predictable data. Get it wrong — a date stored as free text, a total with no default — and every model on top inherits the mess.

As a DE, your first job on a new source is usually to author a **staging table**: a clean, typed landing zone that mirrors the raw feed but with the columns named and typed the way your warehouse wants them. That table is pure DDL.

**The concept — DDL and column types.** DDL (Data Definition Language) is the subset of SQL that defines structure: `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`. A `CREATE TABLE` lists each column as `name TYPE [constraints]`. The core portable types you'll use all level:

| Type | Use for |
|---|---|
| `INTEGER` | ids, counts, whole numbers, money-as-cents |
| `REAL` | floating measures (use with care for money) |
| `TEXT` | strings, ISO-8601 dates/timestamps, enums |
| `NUMERIC` / `DECIMAL(p,s)` | exact decimals (money in warehouses) |

**A small worked example.** A raw customer feed arrives with cryptic names and everything as text. Here's the cleaned staging table you'd author:

```sql
CREATE TABLE stg_customer (
    customer_id   INTEGER,
    email         TEXT,
    country_code  TEXT,
    signup_date   TEXT,               -- ISO-8601 'YYYY-MM-DD'
    is_active     INTEGER DEFAULT 1,  -- 0/1 boolean-as-int
    loaded_at     TEXT DEFAULT (datetime('now'))
);
```

Two columns carry a `DEFAULT`: if a load doesn't specify `is_active`, the row lands as active; `loaded_at` auto-stamps the ingest time so you can audit *when* each row arrived. Insert a partial row and the defaults fill in:

```sql
INSERT INTO stg_customer (customer_id, email, country_code, signup_date)
VALUES (1, 'ada@example.com', 'GB', '2026-01-14');
-- is_active -> 1, loaded_at -> current timestamp, automatically
```

**Anatomy of `CREATE TABLE`:**

```
CREATE TABLE  stg_customer  (
        │           │
        │           └── table name
        └── the DDL verb

    email        TEXT              DEFAULT NULL,
      │            │                  │
   column       type            value used when the
    name       (affinity)       INSERT omits this column
);
```

`DROP TABLE stg_customer;` removes it entirely; `DROP TABLE IF EXISTS stg_customer;` is the safe, re-runnable form you'll put at the top of scripts so a re-run doesn't error on "table already exists."

**In the warehouse this differs — SQLite type affinity is only advisory.** SQLite doesn't truly enforce column types; it uses *type affinity* and will happily store the text `'oops'` in a column you declared `INTEGER`. Postgres, Snowflake, and BigQuery **reject** that outright. The lesson: declare the *intended* type anyway. Your DDL is documentation and it must port to a strict engine unchanged. Treat SQLite's leniency as a bug in your test harness, not a feature to lean on.

**Keep it readable / common pitfall.** The most common staging mistake is storing everything as `TEXT` "to be safe." That defers every type problem to the next model, where it's harder to fix. Type at the boundary. Second pitfall: forgetting an audit column — always add `loaded_at` (or `_ingested_at`) so you can trace and reload by batch.

**Recap:** `CREATE TABLE` is a contract of columns, types, and defaults; declare intended types even in permissive SQLite, and always stamp an audit column.

#### APPLY (guided)

**Task.** Write a script that creates a cleaned `dim_customer` staging table and inserts two rows to prove the defaults work. The table must have: an `INTEGER` `customer_id`, a `TEXT` `email`, a `TEXT` `country_code`, a `TEXT` `signup_date`, an `is_active` column defaulting to `1`, and a `loaded_at` column defaulting to the current timestamp. Insert one row supplying every column, and one row that omits `is_active` and `loaded_at` so the defaults fire.

**Seed.** *(none required — this exercise authors the table from scratch. Begin your script with a safe drop.)*

```sql
DROP TABLE IF EXISTS dim_customer;
-- your CREATE TABLE + INSERTs go here
```

**How it's graded (hidden assertions).**

```sql
-- schema shape: table exists with the right columns
SELECT COUNT(*) FROM pragma_table_info('dim_customer')
WHERE name IN ('customer_id','email','country_code','signup_date','is_active','loaded_at');
-- expect 6

-- default fired: the row that omitted is_active is active
SELECT is_active FROM dim_customer WHERE customer_id = 2;   -- expect 1

-- audit stamp present on the defaulted row
SELECT loaded_at IS NOT NULL FROM dim_customer WHERE customer_id = 2;  -- expect 1

-- row count
SELECT COUNT(*) FROM dim_customer;   -- expect 2
```

**Hints.**
1. Start with `DROP TABLE IF EXISTS dim_customer;` so the script re-runs cleanly.
2. Put `DEFAULT 1` right after `is_active INTEGER`.
3. For the timestamp default, use `DEFAULT (datetime('now'))` — the parentheses are required around a function-call default.
4. In the second `INSERT`, list only the columns you're supplying — the omitted ones pick up their defaults.

**Reference solution.**

```sql
DROP TABLE IF EXISTS dim_customer;

CREATE TABLE dim_customer (
    customer_id  INTEGER,
    email        TEXT,
    country_code TEXT,
    signup_date  TEXT,
    is_active    INTEGER DEFAULT 1,
    loaded_at    TEXT DEFAULT (datetime('now'))
);

INSERT INTO dim_customer (customer_id, email, country_code, signup_date, is_active, loaded_at)
VALUES (1, 'ada@example.com', 'GB', '2026-01-14', 1, '2026-01-14 09:00:00');

INSERT INTO dim_customer (customer_id, email, country_code, signup_date)
VALUES (2, 'grace@example.com', 'US', '2026-02-03');
```

#### PRACTICE (harder — no reference revealed)

**Task.** Author the DDL for a **three-table staging schema** that mirrors a raw e-commerce source but cleaned: `stg_customer`, `stg_product`, and `stg_order`. Every table must carry sensible types and a `loaded_at TEXT DEFAULT (datetime('now'))` audit column. Specific requirements:

- `stg_customer`: `customer_id INTEGER`, `email TEXT`, `country_code TEXT`, `signup_date TEXT`, plus `loaded_at`.
- `stg_product`: `product_id INTEGER`, `sku TEXT`, `name TEXT`, `category TEXT`, `unit_price_cents INTEGER DEFAULT 0`, plus `loaded_at`.
- `stg_order`: `order_id INTEGER`, `customer_id INTEGER`, `order_ts TEXT`, `status TEXT DEFAULT 'pending'`, `total_cents INTEGER DEFAULT 0`, plus `loaded_at`.

Then insert **one row per table**, in each case omitting the defaulted columns (`status`, both `*_cents`, and every `loaded_at`) to prove the defaults fire.

**How it's graded (hidden assertions).**

```sql
-- all three tables exist with their audit column
SELECT COUNT(*) FROM pragma_table_info('stg_customer') WHERE name='loaded_at';  -- 1
SELECT COUNT(*) FROM pragma_table_info('stg_product')  WHERE name='loaded_at';  -- 1
SELECT COUNT(*) FROM pragma_table_info('stg_order')    WHERE name='loaded_at';  -- 1

-- defaults fired
SELECT unit_price_cents FROM stg_product;   -- expect 0
SELECT status, total_cents FROM stg_order;  -- expect 'pending', 0

-- audit stamps present everywhere
SELECT loaded_at IS NOT NULL FROM stg_customer;  -- 1
SELECT loaded_at IS NOT NULL FROM stg_product;   -- 1
SELECT loaded_at IS NOT NULL FROM stg_order;     -- 1

-- exactly one row each
SELECT (SELECT COUNT(*) FROM stg_customer)
     + (SELECT COUNT(*) FROM stg_product)
     + (SELECT COUNT(*) FROM stg_order);  -- expect 3
```

**Hints.**
1. Lead every table with `DROP TABLE IF EXISTS …;` for a clean re-run.
2. `unit_price_cents INTEGER DEFAULT 0` and `total_cents INTEGER DEFAULT 0` — money as integer cents avoids float rounding.
3. `status TEXT DEFAULT 'pending'` — string literals in defaults go in single quotes.
4. In each `INSERT`, name only the non-defaulted columns so the `DEFAULT`s take over.

---

### Lesson `sql-l3-insert-populate` — INSERT and INSERT … SELECT

- **summary:** Load rows literally and transform-load from another table.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** `INSERT INTO … VALUES`, `INSERT … SELECT`, multi-row insert, column lists

#### READ

There are two ways to fill a table. `INSERT … VALUES` writes literal rows you type out — good for seeds and reference data. `INSERT … SELECT` writes rows *read from another table*, transforming them on the way in. That second form is the entire **"T" of ELT**: you read raw, clean/cast/rename in the `SELECT`, and land the result in a model table — all in one statement, all inside the database.

**Worked example.** A raw feed stores prices as text cents and mixed-case emails. Load a cleaned dimension straight from it:

```sql
INSERT INTO dim_product (product_id, sku, name, unit_price_cents)
SELECT
    CAST(prod_id AS INTEGER),
    UPPER(TRIM(sku)),
    TRIM(prod_name),
    CAST(price_txt AS INTEGER)
FROM raw_product
WHERE prod_id IS NOT NULL;   -- drop junk rows at the boundary
```

Every row that survives the `WHERE` is cast, trimmed, and inserted. No temp files, no application code.

**Anatomy:**

```
INSERT INTO dim_product (product_id, sku, name, unit_price_cents)
                         └──── target column list ────┘
SELECT  CAST(prod_id AS INTEGER), ...   -- positionally maps to the target columns
FROM raw_product
WHERE ...;                               -- filter which source rows load
```

The `SELECT` output columns map **positionally** to the target column list — first select expression fills the first named column, and so on. Types don't have to match names, only positions.

**Multi-row literal insert** (one statement, many rows) is the compact seed form:

```sql
INSERT INTO dim_status (code, label) VALUES
    ('paid','Paid'), ('shipped','Shipped'), ('cancelled','Cancelled');
```

**In the warehouse this differs — barely.** `INSERT … SELECT` and multi-row `VALUES` are ANSI-standard and portable across Postgres/Snowflake/BigQuery essentially unchanged. The main divergence is scale: warehouses discourage row-by-row `VALUES` inserts (they're slow columnar writes) and favor bulk `COPY`/`INSERT … SELECT`. The pattern you're learning is exactly the right one there.

**Keep it readable / common pitfall.** Always write the explicit **column list** in `INSERT INTO t (a, b, c)`. Relying on column *order* (`INSERT INTO t SELECT …` with no list) silently breaks the day someone adds a column or reorders the DDL. Second pitfall: forgetting the boundary `WHERE` and loading NULL-keyed junk rows into a clean model.

**Recap:** `INSERT … SELECT` is the transform-load step of ELT; always name target columns explicitly and filter junk at the boundary.

#### APPLY (guided)

**Task.** A `raw_product` table holds dirty product data. Create a clean `dim_product` and populate it from `raw_product` with a single `INSERT … SELECT`, casting the id and price to `INTEGER`, uppercasing+trimming the SKU, trimming the name, and **dropping rows whose `prod_id` is NULL**.

**Seed.**

```sql
DROP TABLE IF EXISTS raw_product;
CREATE TABLE raw_product (prod_id TEXT, sku TEXT, prod_name TEXT, price_txt TEXT);
INSERT INTO raw_product VALUES
    ('10', ' abc-1 ', ' Wireless Mouse ', '2499'),
    ('11', 'def-2',   'Keyboard',         '4999'),
    (NULL, 'xxx',     'Junk Row',         '0');   -- must be dropped
```

**How it's graded.**

```sql
SELECT COUNT(*) FROM dim_product;                          -- expect 2 (junk dropped)
SELECT sku FROM dim_product WHERE product_id = 10;         -- expect 'ABC-1'
SELECT unit_price_cents FROM dim_product WHERE product_id = 11;  -- expect 4999
SELECT typeof(product_id) FROM dim_product WHERE product_id = 10; -- expect 'integer'
```

**Hints.**
1. Create `dim_product` with `INTEGER` id/price columns first.
2. `UPPER(TRIM(sku))` normalizes the SKU in one expression.
3. `CAST(price_txt AS INTEGER)` turns text cents into an integer.
4. Add `WHERE prod_id IS NOT NULL` to drop the junk row.

**Reference solution.**

```sql
DROP TABLE IF EXISTS dim_product;
CREATE TABLE dim_product (
    product_id       INTEGER,
    sku              TEXT,
    name             TEXT,
    unit_price_cents INTEGER
);

INSERT INTO dim_product (product_id, sku, name, unit_price_cents)
SELECT CAST(prod_id AS INTEGER), UPPER(TRIM(sku)), TRIM(prod_name), CAST(price_txt AS INTEGER)
FROM raw_product
WHERE prod_id IS NOT NULL;
```

#### PRACTICE (no reference)

**Task.** A single wide `raw_feed` mixes customer and product columns. **Split it into two normalized targets** with two `INSERT … SELECT` statements: `dim_customer` (`customer_id`, `email`, `country_code`) and `dim_product` (`product_id`, `sku`, `unit_price_cents`). Clean in flight: lowercase+trim emails, uppercase+trim SKUs, cast ids and price to `INTEGER`, uppercase country codes. **Deduplicate customers** so each `customer_id` appears once even though the feed repeats it per product line.

**Seed.**

```sql
DROP TABLE IF EXISTS raw_feed;
CREATE TABLE raw_feed (
    cust_id TEXT, email TEXT, country TEXT,
    prod_id TEXT, sku TEXT, price_txt TEXT
);
INSERT INTO raw_feed VALUES
    ('1',' Ada@Example.com ','gb','100','a-1','2499'),
    ('1',' Ada@Example.com ','gb','101','b-2','4999'),  -- dup customer, new product
    ('2','Grace@Example.com','us','100','a-1','2499');   -- dup product, new customer
```

**How it's graded.**

```sql
SELECT COUNT(*) FROM dim_customer;                         -- expect 2 (deduped)
SELECT email FROM dim_customer WHERE customer_id = 1;      -- expect 'ada@example.com'
SELECT country_code FROM dim_customer WHERE customer_id=2; -- expect 'US'
SELECT COUNT(*) FROM dim_product;                          -- expect 2 (deduped)
SELECT sku FROM dim_product WHERE product_id = 100;        -- expect 'A-1'
SELECT typeof(unit_price_cents) FROM dim_product LIMIT 1;  -- expect 'integer'
```

**Hints.**
1. Create both target tables first, with `INTEGER` keys/price.
2. For customers: `SELECT DISTINCT CAST(cust_id AS INTEGER), LOWER(TRIM(email)), UPPER(country) FROM raw_feed` — `DISTINCT` collapses the repeats.
3. For products: same idea keyed on `prod_id`, with `UPPER(TRIM(sku))`.
4. Watch the grain: dedup on the *whole* projected row, and make sure each source only contributes its relevant columns.

---

## Module 3.2 — Keys and Constraints

A table without keys is a spreadsheet. This module gives every row a stable identity (primary keys), guarantees every reference points somewhere real (foreign keys), and pushes data-quality rules into the schema itself (`UNIQUE`, `NOT NULL`, `CHECK`).

---

### Lesson `sql-l3-primary-keys` — Primary Keys: Surrogate vs Natural

- **summary:** Give every row a stable identity that survives source changes.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** `PRIMARY KEY`, surrogate keys (`AUTOINCREMENT` / `INTEGER PRIMARY KEY`), natural keys, uniqueness

#### READ

A **primary key (PK)** is the column (or columns) that uniquely identifies each row. The database enforces it: two rows can never share a PK value, and a PK can't be NULL. This is the single most important guarantee in a schema — it's what makes "one row per thing" true.

You get to choose *what* the key is. Two families:

- **Natural key** — a business value that's already unique: an email, an ISBN, a country code. Meaningful, but risky: business values change (people change emails), can be reused, and are often wide (bad for joins/indexes).
- **Surrogate key** — a system-generated integer with no business meaning, usually auto-incrementing. It never changes, is compact, and joins fast.

**DEs strongly prefer surrogate keys** for warehouse dimensions. The natural key can change or arrive dirty; the surrogate stays stable so facts that reference it never break. You keep the natural key as a regular attribute (often `UNIQUE`), but *identity* rides on the surrogate.

**Worked example.**

```sql
CREATE TABLE dim_customer (
    customer_sk  INTEGER PRIMARY KEY,   -- surrogate: system identity
    email        TEXT UNIQUE,           -- natural key kept as a UNIQUE attribute
    country_code TEXT
);
```

In SQLite, `INTEGER PRIMARY KEY` auto-assigns rowids, so an insert can omit it:

```sql
INSERT INTO dim_customer (email, country_code) VALUES ('ada@example.com','GB');
-- customer_sk auto-filled to 1
```

**Anatomy:**

```
customer_sk  INTEGER PRIMARY KEY
    │           │        │
 surrogate   integer   uniqueness + not-null + auto-index,
   name      affinity   and (in SQLite) auto-increment
```

Declaring a PK **automatically creates a unique index** on it — lookups and joins by PK are fast for free.

**In the warehouse this differs — surrogate generation.** SQLite gives you `INTEGER PRIMARY KEY` (and the stricter `AUTOINCREMENT`) for free surrogates. Postgres uses `GENERATED ALWAYS AS IDENTITY` (or `serial`); Snowflake/BigQuery often use sequences or `ROW_NUMBER()`-assigned keys during the load because they don't auto-increment the same way. The *concept* — a stable system integer — is identical; the syntax that mints it is per-engine.

**Keep it readable / common pitfall.** Don't make a natural key the PK just because it's "obviously unique today." The day it isn't (a supplier reuses a SKU, a customer re-registers an email) your PK constraint blocks a legitimate load. Use a surrogate PK and add `UNIQUE` on the natural key — you get identity *and* a duplicate guard, decoupled.

**Recap:** every row needs a stable identity; prefer a surrogate integer PK (auto-indexed, unchanging) and keep the natural key as a separate `UNIQUE` attribute.

#### APPLY (guided)

**Task.** Create a `dim_customer` with a surrogate integer PK `customer_sk` and keep the business key `email` as a plain attribute. Insert two customers *without* specifying `customer_sk` and let SQLite assign it.

**Seed.** *(none — author from scratch; start with a drop.)*

**How it's graded.**

```sql
-- PK exists on customer_sk
SELECT COUNT(*) FROM pragma_table_info('dim_customer') WHERE name='customer_sk' AND pk=1;  -- 1
-- surrogates auto-assigned and distinct
SELECT COUNT(DISTINCT customer_sk) FROM dim_customer;  -- expect 2
SELECT MIN(customer_sk) FROM dim_customer;             -- expect 1
```

**Hints.**
1. `customer_sk INTEGER PRIMARY KEY` is all you need for an auto-incrementing surrogate in SQLite.
2. Don't list `customer_sk` in your `INSERT` column list — let it auto-fill.
3. `email` is just `email TEXT` here (no PK).

**Reference solution.**

```sql
DROP TABLE IF EXISTS dim_customer;
CREATE TABLE dim_customer (
    customer_sk  INTEGER PRIMARY KEY,
    email        TEXT,
    country_code TEXT
);
INSERT INTO dim_customer (email, country_code) VALUES ('ada@example.com','GB');
INSERT INTO dim_customer (email, country_code) VALUES ('grace@example.com','US');
```

#### PRACTICE (no reference)

**Task.** Design `dim_product` with a surrogate PK `product_sk` **and** a `UNIQUE` natural key `sku`. Insert two valid products. Then **attempt a third insert that duplicates an existing `sku`** and prove the database rejects it — your script must capture that the row count stays at 2 after the failed insert. (Use an approach that lets the script continue after the failure so the assertions can run: `INSERT OR IGNORE`.)

**Seed.** *(none — author from scratch.)*

**How it's graded.**

```sql
-- surrogate PK present
SELECT COUNT(*) FROM pragma_table_info('dim_product') WHERE name='product_sk' AND pk=1;  -- 1
-- sku is UNIQUE-indexed
SELECT COUNT(*) FROM pragma_index_list('dim_product') WHERE "unique"=1;  -- >= 1
-- the duplicate sku did NOT create a third row
SELECT COUNT(*) FROM dim_product;                 -- expect 2
SELECT COUNT(*) FROM dim_product WHERE sku='A-1';  -- expect 1
```

**Hints.**
1. `product_sk INTEGER PRIMARY KEY` for identity; `sku TEXT UNIQUE` for the natural-key guard.
2. The `UNIQUE` on `sku` creates the unique index the second assertion checks.
3. For the duplicate attempt, `INSERT OR IGNORE INTO dim_product (sku, name) VALUES ('A-1', …)` silently skips the conflicting row instead of aborting the whole script.
4. Confirm your reasoning: identity (PK) and the duplicate-blocking (UNIQUE) are two *separate* guarantees on two *different* columns.

---

### Lesson `sql-l3-foreign-keys` — Foreign Keys and Referential Integrity

- **summary:** Guarantee a child row always points at a real parent.
- **difficulty:** medium
- **estimatedMinutes:** 30
- **skills:** `FOREIGN KEY`, `REFERENCES`, `ON DELETE` (`RESTRICT`/`CASCADE`/`SET NULL`), `PRAGMA foreign_keys`

#### READ

A **foreign key (FK)** says: "the value in *this* column must exist as a key in *that* table." An `orders.customer_id` FK to `customers.customer_id` makes it **impossible** to insert an order for a customer who doesn't exist. That guarantee is **referential integrity** — the backbone of a trustworthy schema, and the thing that stops orphan rows from ever forming.

**Worked example.**

```sql
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    email       TEXT
);
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    total_cents INTEGER,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE RESTRICT
);
```

Now `INSERT INTO orders (order_id, customer_id, total_cents) VALUES (1, 999, 500);` **fails** if customer 999 doesn't exist.

**`ON DELETE` policies** decide what happens to children when a parent is deleted:

| Policy | Behavior |
|---|---|
| `RESTRICT` (or `NO ACTION`) | **Block** the parent delete while children exist. Safest default. |
| `CASCADE` | **Delete the children too.** Use only when children are meaningless without the parent (e.g. order line items when the order dies). |
| `SET NULL` | Null out the child's FK. Requires the FK column be nullable. |

**Anatomy:**

```
FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT
             │                        │        │                        │
       child column           parent table  parent key          delete policy
```

**In the warehouse this differs — and SQLite has a trap.** SQLite **does not enforce foreign keys unless you turn them on** every connection: `PRAGMA foreign_keys = ON;`. Forget it and your `REFERENCES` clauses parse fine but enforce nothing — orphans slip right in. Warehouses are the opposite extreme: Redshift, Snowflake, and BigQuery let you *declare* FKs but **don't enforce them at all** (they're informational, used by the planner). So in the real warehouse, referential integrity is enforced by your *load logic and DQ tests*, not the engine. Here in SQLite you get real enforcement — as long as you flip the pragma.

**Keep it readable / common pitfall.** Two pitfalls dominate. First: forgetting `PRAGMA foreign_keys = ON;` — always the first line of an FK script. Second: reaching for `CASCADE` by default. Cascading deletes are a foot-gun; a single parent delete can silently wipe thousands of children. Default to `RESTRICT` and only cascade where the child genuinely cannot outlive the parent.

**Recap:** an FK forces every child to point at a real parent; choose `ON DELETE` deliberately (default `RESTRICT`), and in SQLite you *must* run `PRAGMA foreign_keys = ON;` or enforcement is off.

#### APPLY (guided)

**Task.** Create `customers` (PK `customer_id`) and `orders` with an FK `customer_id → customers` using `ON DELETE RESTRICT`. Turn FK enforcement on. Insert one customer and one valid order. Then attempt an order for a **non-existent** customer with `INSERT OR IGNORE` and show it doesn't land.

**Seed.** *(author from scratch.)*

**How it's graded.**

```sql
-- FK declared from orders to customers
SELECT COUNT(*) FROM pragma_foreign_key_list('orders')
WHERE "table"='customers' AND "from"='customer_id';   -- expect 1
-- the orphan order did not land
SELECT COUNT(*) FROM orders;                            -- expect 1
SELECT COUNT(*) FROM orders WHERE customer_id = 999;    -- expect 0
```

**Hints.**
1. First line: `PRAGMA foreign_keys = ON;`
2. Declare the FK inside `orders` with `FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT`.
3. Insert the parent customer *before* the order, or even the valid order fails.
4. Use `INSERT OR IGNORE` for the orphan attempt so the script continues to the assertions.

**Reference solution.**

```sql
PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    email       TEXT
);
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    total_cents INTEGER,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT
);

INSERT INTO customers (customer_id, email) VALUES (1, 'ada@example.com');
INSERT INTO orders (order_id, customer_id, total_cents) VALUES (1, 1, 2499);
INSERT OR IGNORE INTO orders (order_id, customer_id, total_cents) VALUES (2, 999, 100);
```

#### PRACTICE (no reference)

**Task.** Wire a **three-table schema** — `customers`, `orders`, `order_items` — with FKs and a **defensible `ON DELETE` policy per relationship**:
- `orders.customer_id → customers` : `ON DELETE RESTRICT` (never lose orders because a customer was deleted).
- `order_items.order_id → orders` : `ON DELETE CASCADE` (line items are meaningless without their order).
- `order_items.product_id → products` : `ON DELETE RESTRICT`.

Create a `products` table too. Insert a valid chain (customer → order → two items). Then prove **two** enforcements: (a) an `order_items` row for a non-existent order is rejected, and (b) deleting an order **cascades** to remove its items.

**Seed.** *(author from scratch — 4 tables.)*

**How it's graded.**

```sql
-- FK graph is wired
SELECT COUNT(*) FROM pragma_foreign_key_list('orders')      WHERE "table"='customers'; -- 1
SELECT COUNT(*) FROM pragma_foreign_key_list('order_items') WHERE "table"='orders';    -- 1
SELECT COUNT(*) FROM pragma_foreign_key_list('order_items') WHERE "table"='products';  -- 1
-- cascade policy present on the order FK
SELECT COUNT(*) FROM pragma_foreign_key_list('order_items')
WHERE "table"='orders' AND on_delete='CASCADE';  -- 1
-- orphan item rejected
SELECT COUNT(*) FROM order_items WHERE order_id = 999;  -- 0
-- cascade worked: after deleting order 1, its items are gone
SELECT COUNT(*) FROM order_items WHERE order_id = 1;    -- expect 0 (assumes you DELETE order 1)
```

**Hints.**
1. `PRAGMA foreign_keys = ON;` first — cascade won't fire without it.
2. Insert in dependency order: `products` and `customers`, then `orders`, then `order_items`.
3. Give the `order_items.order_id` FK `ON DELETE CASCADE`; the other two `RESTRICT`.
4. After inserting the valid chain, run `DELETE FROM orders WHERE order_id = 1;` and let the cascade clear its items before the assertions read.

---

### Lesson `sql-l3-constraints` — UNIQUE, NOT NULL, and CHECK

- **summary:** Push data-quality rules into the schema so bad rows can't land.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** `NOT NULL`, `UNIQUE`, `CHECK`, composite unique, column invariants

#### READ

Constraints are the **cheapest data-quality layer you have**. A `CHECK` or `NOT NULL` is enforced by the database *before* any dbt test, alert, or dashboard notices a problem — the bad row simply never lands. Three workhorses:

- `NOT NULL` — the column must always have a value.
- `UNIQUE` — no two rows share this value (or this *combination* of values, for a **composite unique**).
- `CHECK (condition)` — every row must satisfy a boolean condition: an enum whitelist, a non-negative price, a valid date order.

**Worked example.**

```sql
CREATE TABLE fact_order (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled')),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    order_date  TEXT,
    ship_date   TEXT,
    UNIQUE (customer_id, order_date),                 -- composite: one order per customer per day
    CHECK (ship_date IS NULL OR ship_date >= order_date)
);
```

Any insert with `status = 'refunded'`, a negative total, or a ship date before the order date is **rejected outright**.

**Anatomy:**

```
status TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled'))
        │      │          │        │
      type  required   invariant  the whitelist the value must be in
```

Column-level constraints sit on one column; **table-level** constraints (`UNIQUE (a, b)`, cross-column `CHECK`) go after the column list and can reference several columns.

**In the warehouse this differs.** SQLite enforces `CHECK`, `NOT NULL`, and `UNIQUE` reliably. Big analytical warehouses are looser: BigQuery has **no** `CHECK`/`UNIQUE` enforcement, Snowflake enforces `NOT NULL` but treats `UNIQUE`/`CHECK` as informational. So in production these invariants are re-expressed as **dbt/DQ tests** (you'll build those in L4). Author them in your DDL anyway — they document intent and they *are* enforced on strict engines like Postgres.

**Keep it readable / common pitfall.** Keep each `CHECK` to one clear invariant with a self-explanatory condition; a giant compound `CHECK` is unreadable and hard to debug when it fires. Common trap: forgetting that `CHECK` passes when the condition is `NULL` (three-valued logic) — that's why the ship-date check is written `ship_date IS NULL OR ship_date >= order_date`, so a missing ship date is allowed but a *wrong* one isn't.

**Recap:** constraints are the cheapest DQ layer — use `NOT NULL` for required fields, `UNIQUE` (incl. composite) for identity/dedup, and `CHECK` for enums and invariants; author them even where the warehouse won't enforce them.

#### APPLY (guided)

**Task.** Create an `orders` table with: `status TEXT NOT NULL` constrained by a `CHECK` to the enum `('pending','paid','shipped','cancelled')`, and `total_cents INTEGER NOT NULL`. Insert one valid row, then attempt (with `INSERT OR IGNORE`) a row with `status='refunded'` and show it doesn't land.

**Seed.** *(author from scratch.)*

**How it's graded.**

```sql
SELECT COUNT(*) FROM orders;                          -- expect 1
SELECT COUNT(*) FROM orders WHERE status='refunded';  -- expect 0
-- the CHECK exists (sql text mentions the enum)
SELECT COUNT(*) FROM sqlite_master
WHERE type='table' AND name='orders' AND sql LIKE '%CHECK%status%';  -- >= 1
```

**Hints.**
1. `status TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled'))`.
2. Insert the valid row with a whitelisted status.
3. Use `INSERT OR IGNORE` for the `'refunded'` attempt so the script survives to the assertions.

**Reference solution.**

```sql
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    status      TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled')),
    total_cents INTEGER NOT NULL
);
INSERT INTO orders (order_id, status, total_cents) VALUES (1, 'paid', 2499);
INSERT OR IGNORE INTO orders (order_id, status, total_cents) VALUES (2, 'refunded', 100);
```

#### PRACTICE (no reference)

**Task.** Harden a `dim_product` table with **three** enforced rules and demonstrate each rejects a violating insert:
1. A **composite `UNIQUE (supplier_id, sku)`** — the same SKU may exist under different suppliers but not twice under one.
2. A **non-negative** `CHECK (unit_price_cents >= 0)`.
3. An **enum** `CHECK (status IN ('active','discontinued'))`.

Insert one fully valid row. Then, with `INSERT OR IGNORE`, attempt one violation of each rule (a duplicate `(supplier_id, sku)`, a negative price, and a bad status) and prove the table still has exactly one row.

**Seed.** *(author from scratch.)*

**How it's graded.**

```sql
-- exactly the one valid row survived all three bad inserts
SELECT COUNT(*) FROM dim_product;  -- expect 1
-- composite unique index exists (2 columns)
SELECT COUNT(*) FROM pragma_index_list('dim_product') il WHERE il."unique"=1;  -- >= 1
-- the CHECKs are present in the DDL
SELECT COUNT(*) FROM sqlite_master
WHERE name='dim_product' AND sql LIKE '%unit_price_cents%>=%0%';       -- >= 1
SELECT COUNT(*) FROM sqlite_master
WHERE name='dim_product' AND sql LIKE '%status%IN%active%';            -- >= 1
```

**Hints.**
1. Put the composite unique as a table-level constraint: `UNIQUE (supplier_id, sku)`.
2. Two column `CHECK`s: `CHECK (unit_price_cents >= 0)` and `CHECK (status IN ('active','discontinued'))`.
3. Insert the good row first (whitelisted status, non-negative price, unique supplier+sku).
4. Fire all three bad rows with `INSERT OR IGNORE` — each should be silently skipped, leaving one row.

---

## Module 3.3 — Normalization

Raw data arrives flat and redundant. Normalization is the disciplined process of splitting it so **each fact is stored exactly once**. You'll go 1NF → 2NF → 3NF, then learn when to deliberately reverse course for analytics.

---

### Lesson `sql-l3-normalize-1nf` — First Normal Form: Atomic Values

- **summary:** Eliminate repeating groups and multi-valued cells.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** 1NF, atomic columns, repeating-group removal, composite key introduction

#### READ

**First Normal Form (1NF)** demands two things: **one value per cell** (atomic — no comma-packed lists) and **one row per fact**. A spreadsheet export that crams `"mouse:2, keyboard:1"` into a single `items` column violates 1NF, and that single violation breaks *every* downstream join, aggregate, and filter — you can't `SUM` a price you can't isolate, or join on a product buried inside a string.

**Worked example — the violation and the fix.** Raw:

| order_id | items |
|---|---|
| 1 | `mouse:2, keyboard:1` |
| 2 | `mouse:1` |

1NF form — one row per line item, atomic columns, and a **composite key** `(order_id, product)` because neither column alone is unique:

| order_id | product | qty |
|---|---|---|
| 1 | mouse | 2 |
| 1 | keyboard | 1 |
| 2 | mouse | 1 |

**Anatomy of the change:** the repeating group inside one cell becomes multiple *rows*; the packed string becomes separate *columns* (`product`, `qty`); and the identity of a row is now the **combination** `(order_id, product)`.

**In the warehouse this differs — not really, but the tools do.** 1NF is a universal relational principle. The mechanics of *unpacking* differ: SQLite has no array type, so packed data is `TEXT` you split with string functions or a recursive CTE (L4). Postgres has real arrays and `unnest()`; BigQuery/Snowflake have `ARRAY`/`STRUCT` and are often kept *semi-structured* on purpose. But the moment you need to join or aggregate, you flatten to 1NF.

**Keep it readable / common pitfall.** Don't "solve" a multi-valued attribute by adding `item1, item2, item3` columns — that's still a repeating group and it caps you at three items. The fix is always *more rows, not more columns*. Pitfall: forgetting the row's identity changed — once you unpack, a single column is no longer unique, so declare the composite key.

**Recap:** 1NF means atomic cells and one row per fact; unpack repeating groups into rows (not extra columns) and give the finer grain a composite key.

#### APPLY (guided)

**Task.** A `raw_order` table stores two line items per order in packed columns. Unpack it into a 1NF `order_item` table with columns `(order_id, product, qty)` — one row per line item — using two `INSERT … SELECT` statements (one per item slot). *(You're given exactly two slots to keep the SQL simple.)*

**Seed.**

```sql
DROP TABLE IF EXISTS raw_order;
CREATE TABLE raw_order (
    order_id INTEGER, product_a TEXT, qty_a INTEGER, product_b TEXT, qty_b INTEGER
);
INSERT INTO raw_order VALUES
    (1, 'mouse', 2, 'keyboard', 1),
    (2, 'mouse', 1, NULL, NULL);   -- second slot empty
```

**How it's graded.**

```sql
SELECT COUNT(*) FROM order_item;                          -- expect 3 (order 2 has only one item)
SELECT qty FROM order_item WHERE order_id=1 AND product='keyboard';  -- expect 1
SELECT COUNT(*) FROM order_item WHERE product IS NULL;    -- expect 0 (empty slot not inserted)
```

**Hints.**
1. First `INSERT … SELECT product_a, qty_a` for every order.
2. Second `INSERT … SELECT product_b, qty_b WHERE product_b IS NOT NULL` — the `WHERE` skips the empty slot.
3. Target columns are `(order_id, product, qty)`.

**Reference solution.**

```sql
DROP TABLE IF EXISTS order_item;
CREATE TABLE order_item (
    order_id INTEGER,
    product  TEXT,
    qty      INTEGER,
    PRIMARY KEY (order_id, product)
);

INSERT INTO order_item (order_id, product, qty)
SELECT order_id, product_a, qty_a FROM raw_order WHERE product_a IS NOT NULL;

INSERT INTO order_item (order_id, product, qty)
SELECT order_id, product_b, qty_b FROM raw_order WHERE product_b IS NOT NULL;
```

#### PRACTICE (no reference)

**Task.** A "sales spreadsheet" export packs an entire order's items into one comma-delimited string like `'mouse:2:2499,keyboard:1:4999'` (`product:qty:price_cents`). Unpack it into a 1NF `order_line` table `(order_id, product, qty, unit_price_cents)` with a composite PK `(order_id, product)`. Orders have **up to three** items. *(Since SQLite lacks a split function, the pragmatic approach: your seed gives you the packed string, and you extract each of the up-to-three items with string functions. A cleaner recursive-CTE split is previewed in L4 — here, position-based `substr`/`instr` extraction per slot is acceptable.)*

**Seed.**

```sql
DROP TABLE IF EXISTS raw_sales;
CREATE TABLE raw_sales (order_id INTEGER, items TEXT);
INSERT INTO raw_sales VALUES
    (1, 'mouse:2:2499,keyboard:1:4999'),
    (2, 'monitor:1:19999'),
    (3, 'cable:3:599,hub:1:2999,mat:2:1499');
```

**How it's graded.**

```sql
SELECT COUNT(*) FROM order_line;                              -- expect 6 (2+1+3)
SELECT unit_price_cents FROM order_line WHERE order_id=1 AND product='keyboard';  -- 4999
SELECT qty FROM order_line WHERE order_id=3 AND product='mat';                    -- 2
SELECT COUNT(*) FROM pragma_table_info('order_line') WHERE pk>0;                  -- expect 2 (composite PK)
SELECT COUNT(*) FROM order_line WHERE product IS NULL OR product='';              -- expect 0
```

**Hints.**
1. Declare `PRIMARY KEY (order_id, product)` so the grain is enforced.
2. One workable route: build a small helper/recursive CTE that peels one `product:qty:price` token off the front of `items` at a time until the string is empty. (`WITH RECURSIVE` is fair game — it's the clean way to split without an array type.)
3. Split each token on `:` with `instr`/`substr`: product before the first colon, qty between the colons, price after the last.
4. `CAST` qty and price to `INTEGER`; a purely `TEXT` price will fail the numeric assertion downstream.

---

### Lesson `sql-l3-normalize-2nf-3nf` — Second and Third Normal Form

- **summary:** Remove partial and transitive dependencies so each fact lives once.
- **difficulty:** hard
- **estimatedMinutes:** 35
- **skills:** 2NF (no partial dependency), 3NF (no transitive dependency), table decomposition

#### READ

Once data is atomic (1NF), redundancy can still hide in *dependencies*. The memorable rule for a well-normalized table is: **"every non-key column depends on the key, the whole key, and nothing but the key."**

- **2NF — the whole key.** No column may depend on only *part* of a composite key. In an `order_item(order_id, product_id, qty, product_name)` table keyed on `(order_id, product_id)`, `product_name` depends only on `product_id` — half the key. That's a **partial dependency**: it repeats `product_name` on every line the product appears in. Fix: move `product_name` to a `products` table keyed on `product_id`.

- **3NF — nothing but the key.** No non-key column may depend on *another non-key column*. In `orders(order_id, customer_id, customer_email)`, `customer_email` depends on `customer_id`, not on `order_id`. That's a **transitive dependency** (key → customer_id → email). Fix: move `customer_email` to a `customers` table keyed on `customer_id`.

**Worked 2NF/3NF split.** Start with one flat table:

```
order_line(order_id, product_id, qty, product_name, customer_id, customer_email)
```

Decompose:

```sql
-- 2NF: product attributes depend only on product_id
CREATE TABLE products  (product_id INTEGER PRIMARY KEY, product_name TEXT);
-- 3NF: customer attributes depend only on customer_id (transitive via orders)
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, email TEXT);
CREATE TABLE orders    (order_id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers);
CREATE TABLE order_items (
    order_id   INTEGER REFERENCES orders,
    product_id INTEGER REFERENCES products,
    qty        INTEGER,
    PRIMARY KEY (order_id, product_id)
);
```

Now `product_name` and `email` each live in exactly one place. Change an email once; every order reflects it. No update anomalies.

**In the warehouse this differs — by intent.** 3NF is the gold standard for OLTP systems (safe writes, no anomalies). Analytical warehouses often *stop short* of full normalization or deliberately denormalize (next lesson) because joins are the expensive part of a read. So DEs normalize the **source-of-truth / staging** layers and denormalize the **mart** layer. Same engineer, two different targets.

**Keep it readable / common pitfall.** The pitfall is over- or under-splitting. Under: leaving `customer_email` on `orders` (a real 3NF violation that causes update anomalies). Over: decomposing attributes that genuinely *do* depend only on the key into needless tables. Test each column: "does this depend on the whole key and nothing but the key?" If no, split; if yes, leave it.

**Recap:** 2NF removes partial dependencies (on part of a composite key), 3NF removes transitive dependencies (on another non-key column); decompose so every fact is stored exactly once — the OLTP ideal you'll later denormalize for analytics.

#### APPLY (guided)

**Task.** Given a flat `flat_line` table that repeats `product_name` on every row (a 2NF violation), extract product attributes into a `products` table keyed on `product_id`, and rebuild `order_items` referencing it — so `product_name` is stored once per product. Use `INSERT … SELECT` with `DISTINCT` to populate `products`.

**Seed.**

```sql
DROP TABLE IF EXISTS flat_line;
CREATE TABLE flat_line (order_id INTEGER, product_id INTEGER, qty INTEGER, product_name TEXT);
INSERT INTO flat_line VALUES
    (1, 100, 2, 'Mouse'),
    (1, 101, 1, 'Keyboard'),
    (2, 100, 1, 'Mouse');   -- 'Mouse' repeated
```

**How it's graded.**

```sql
SELECT COUNT(*) FROM products;                              -- expect 2 (deduped)
SELECT product_name FROM products WHERE product_id=100;    -- 'Mouse'
SELECT COUNT(*) FROM order_items;                          -- expect 3
SELECT COUNT(*) FROM pragma_table_info('order_items') WHERE name='product_name'; -- expect 0 (moved out)
```

**Hints.**
1. `INSERT INTO products (product_id, product_name) SELECT DISTINCT product_id, product_name FROM flat_line;`
2. `order_items` gets `(order_id, product_id, qty)` only — no `product_name`.
3. Populate `order_items` with `SELECT order_id, product_id, qty FROM flat_line;`

**Reference solution.**

```sql
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS order_items;

CREATE TABLE products (product_id INTEGER PRIMARY KEY, product_name TEXT);
INSERT INTO products (product_id, product_name)
SELECT DISTINCT product_id, product_name FROM flat_line;

CREATE TABLE order_items (
    order_id   INTEGER,
    product_id INTEGER,
    qty        INTEGER,
    PRIMARY KEY (order_id, product_id)
);
INSERT INTO order_items (order_id, product_id, qty)
SELECT order_id, product_id, qty FROM flat_line;
```

#### PRACTICE (no reference)

**Task.** Fully normalize a single flat 1NF table to **3NF**. The source `flat_sales` repeats customer *and* product attributes on every line. Produce four tables — `customers`, `products`, `orders`, `order_items` — via `INSERT … SELECT`, with these hard requirements:
- `customers` keyed on `customer_id`, **deduplicated by email** (the same person may appear with different `customer_id`s in the raw feed — keep one row per distinct email, lowest `customer_id`).
- `products` keyed on `product_id`, deduplicated.
- `orders` keyed on `order_id` (one row per order; carries `customer_id`, not customer attributes).
- `order_items` keyed on `(order_id, product_id)` (carries `qty`, not product attributes).

**Seed.**

```sql
DROP TABLE IF EXISTS flat_sales;
CREATE TABLE flat_sales (
    order_id INTEGER, customer_id INTEGER, email TEXT,
    product_id INTEGER, product_name TEXT, qty INTEGER
);
INSERT INTO flat_sales VALUES
    (1, 10, 'ada@x.com',   100, 'Mouse',    2),
    (1, 10, 'ada@x.com',   101, 'Keyboard', 1),
    (2, 11, 'grace@x.com', 100, 'Mouse',    1),
    (3, 12, 'ada@x.com',   100, 'Mouse',    3);   -- same email as id 10, different customer_id
```

**How it's graded.**

```sql
-- customers deduped by email: ada@x.com appears once (kept lowest customer_id 10)
SELECT COUNT(*) FROM customers;                          -- expect 2
SELECT COUNT(*) FROM customers WHERE email='ada@x.com';  -- expect 1
SELECT MIN(customer_id) FROM customers WHERE email='ada@x.com'; -- expect 10
-- products deduped
SELECT COUNT(*) FROM products;                           -- expect 2
-- orders: one row per order
SELECT COUNT(*) FROM orders;                             -- expect 3
-- order_items grain
SELECT COUNT(*) FROM order_items;                        -- expect 4
SELECT COUNT(*) FROM pragma_table_info('order_items') WHERE name IN ('product_name','email'); -- 0
-- no attribute leakage onto orders
SELECT COUNT(*) FROM pragma_table_info('orders') WHERE name IN ('email','product_name');       -- 0
```

**Hints.**
1. Dedup customers with a grouped insert: `SELECT MIN(customer_id), email FROM flat_sales GROUP BY email`.
2. `orders` is `SELECT DISTINCT order_id, customer_id FROM flat_sales` — but beware: order 3's `customer_id` is 12, which you dropped in favor of 10. Decide whether orders point at the surviving customer; the assertions only check `orders` has 3 rows and carries no attributes, so keeping the raw `customer_id` is acceptable here (a real SCD remap comes in L4).
3. `products` = `SELECT DISTINCT product_id, product_name`.
4. `order_items` = `SELECT order_id, product_id, qty` — atomic grain, no descriptive columns.

---

### Lesson `sql-l3-denormalization` — Denormalization Trade-offs

- **summary:** Know when to flatten a normalized schema for analytics speed.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** OLTP vs OLAP, denormalization, read vs write trade-off, join cost

#### READ

Normalization is not a moral good — it's a **trade-off**. It optimizes for *safe writes*: each fact stored once means no update anomalies. But it pays for that with *joins on every read*, and joins are the expensive part of analytics. The two worlds:

- **OLTP** (transactional apps): many small writes, correctness-critical → **normalize** (3NF).
- **OLAP** (analytics/BI): few huge reads, join-heavy → **denormalize** (flatten so a report is one scan, not a six-table join).

**Denormalization** deliberately reintroduces redundancy — copying `product_name`, `category`, `customer_country` *into* the fact/reporting table — so the read needs no joins. The cost is that if `product_name` changes you must update it in many places; in analytics that's fine because these tables are *rebuilt* by the loader, not hand-edited.

**Worked example.** From the 3NF schema, build one wide reporting table:

```sql
CREATE TABLE rpt_sales AS
SELECT
    oi.order_id, oi.product_id, oi.qty,
    p.product_name, p.category,          -- copied from products
    o.order_date,
    c.email, c.country_code              -- copied from customers
FROM order_items oi
JOIN orders    o ON o.order_id   = oi.order_id
JOIN products  p ON p.product_id = oi.product_id
JOIN customers c ON c.customer_id = o.customer_id;
```

A BI query against `rpt_sales` — "revenue by category by country" — now touches **one** table. The four-way join happened *once*, at build time, not on every dashboard load.

**In the warehouse this differs — this is the warehouse's whole point.** Columnar warehouses (Snowflake/BigQuery/Redshift) are built to scan wide denormalized tables fast, and storage is cheap, so the redundancy barely costs anything. `CREATE TABLE … AS SELECT` (CTAS) is the standard build verb there too. The star schema (Module 3.5) is the *disciplined* middle ground between full 3NF and a fully-flat "one big table."

**Keep it readable / common pitfall.** Denormalize the *mart*, never the *source of truth*. If you denormalize your write-path OLTP tables you'll corrupt data via update anomalies. Pitfall: denormalizing too early or everything — keep normalized staging/intermediate layers and denormalize only the final reporting layer, rebuilt each run.

**Recap:** normalization favors safe writes, denormalization favors fast reads; flatten the analytics/mart layer (redundancy is fine because it's rebuilt) while keeping the source-of-truth normalized.

#### APPLY (guided)

**Task.** Given a normalized 3-table schema (`orders`, `products`, `order_items`), build one wide denormalized reporting table `rpt_line` (via `CREATE TABLE … AS SELECT`) that carries `order_id`, `product_id`, `qty`, `product_name`, `category`, and `line_revenue_cents` (= `qty * unit_price_cents`) — with **no joins needed** to read it.

**Seed.**

```sql
DROP TABLE IF EXISTS products; DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS order_items;
CREATE TABLE products (product_id INTEGER PRIMARY KEY, product_name TEXT, category TEXT, unit_price_cents INTEGER);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, order_date TEXT);
CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER);
INSERT INTO products VALUES (100,'Mouse','peripherals',2499),(101,'Monitor','displays',19999);
INSERT INTO orders VALUES (1,'2026-01-05'),(2,'2026-01-06');
INSERT INTO order_items VALUES (1,100,2),(1,101,1),(2,100,3);
```

**How it's graded.**

```sql
SELECT COUNT(*) FROM rpt_line;                                   -- expect 3
SELECT line_revenue_cents FROM rpt_line WHERE order_id=1 AND product_id=100; -- 4998
SELECT category FROM rpt_line WHERE product_id=101;             -- 'displays'
SELECT COUNT(*) FROM pragma_table_info('rpt_line') WHERE name='product_name'; -- 1 (copied in)
```

**Hints.**
1. `CREATE TABLE rpt_line AS SELECT … FROM order_items JOIN products …`.
2. `oi.qty * p.unit_price_cents AS line_revenue_cents`.
3. Copy `p.product_name` and `p.category` into the projection so no join is needed later.

**Reference solution.**

```sql
DROP TABLE IF EXISTS rpt_line;
CREATE TABLE rpt_line AS
SELECT
    oi.order_id, oi.product_id, oi.qty,
    p.product_name, p.category,
    oi.qty * p.unit_price_cents AS line_revenue_cents
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id;
```

#### PRACTICE (no reference)

**Task.** From the 3NF schema (`customers`, `products`, `orders`, `order_items`), produce a flattened analytics table `obt_sales` ("one big table") carrying every column a revenue dashboard needs: `order_id, order_date, customer_id, country_code, product_id, product_name, category, qty, unit_price_cents, line_revenue_cents`. Then write **one comparison query** that returns two numbers proving the flattening's value: `joins_normalized` (the constant `3` — the joins a report would otherwise need) and `joins_flattened` (the constant `0`), plus the total `line_revenue_cents` computed from `obt_sales` with no joins.

**Seed.**

```sql
DROP TABLE IF EXISTS customers; DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS order_items;
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, email TEXT, country_code TEXT);
CREATE TABLE products (product_id INTEGER PRIMARY KEY, product_name TEXT, category TEXT, unit_price_cents INTEGER);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT);
CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER, PRIMARY KEY(order_id,product_id));
INSERT INTO customers VALUES (10,'ada@x.com','GB'),(11,'grace@x.com','US');
INSERT INTO products VALUES (100,'Mouse','peripherals',2499),(101,'Monitor','displays',19999);
INSERT INTO orders VALUES (1,10,'2026-01-05'),(2,11,'2026-01-06');
INSERT INTO order_items VALUES (1,100,2),(1,101,1),(2,100,3);
```

**How it's graded.**

```sql
SELECT COUNT(*) FROM obt_sales;                                    -- expect 3
SELECT country_code FROM obt_sales WHERE order_id=2;              -- 'US'
SELECT line_revenue_cents FROM obt_sales WHERE order_id=1 AND product_id=101;  -- 19999
-- one-scan aggregate works with zero joins
SELECT SUM(line_revenue_cents) FROM obt_sales;                    -- 4998+19999+7497 = 32494
-- comparison query returns the join-count proof
SELECT joins_normalized, joins_flattened FROM obt_compare;        -- expect 3, 0
```

**Hints.**
1. Build `obt_sales` with a four-table `CREATE TABLE … AS SELECT` joining all of them once.
2. `line_revenue_cents = qty * unit_price_cents`.
3. For the comparison, materialize a tiny `obt_compare` (e.g. `SELECT 3 AS joins_normalized, 0 AS joins_flattened`) — a one-row table the grader reads.
4. Confirm the whole point: the dashboard's `SUM` now runs over `obt_sales` alone, no joins.

---

## Module 3.4 — ER Modeling, Relationships, and Indexes

Before you write DDL you sketch entities and their relationships. This module covers reading cardinality (1:1 / 1:N / M:N), resolving many-to-many with junction tables, and adding the indexes that keep the resulting reads fast.

---

### Lesson `sql-l3-cardinality` — Entities, Relationships, and Cardinality

- **summary:** Read and encode 1:1, 1:N, and M:N relationships.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** ER modeling, cardinality (1:1/1:N/M:N), FK placement on the "many" side

#### READ

An **entity** is a thing you store (customer, order, product); a **relationship** connects entities; **cardinality** says how many of one relate to how many of the other. Three shapes:

- **1:N (one-to-many)** — one customer has many orders; one order belongs to one customer. The overwhelmingly common case.
- **1:1 (one-to-one)** — one user has one profile. Rare; usually modeled as an optional table split.
- **M:N (many-to-many)** — one order has many products, one product is in many orders. Cannot be expressed with a single FK.

**The one rule that resolves most modeling questions: the FK goes on the "many" side.** For customer 1:N orders, the FK `customer_id` lives on **orders** (the many side), pointing at customers. It cannot go the other way — a customer row can't hold a single `order_id` because a customer has *many* orders.

**Worked example.**

```sql
-- 1:N — FK on the many side (orders)
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY);
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id)   -- FK here, on 'orders'
);
```

- **1:1** is a table *split*: put the FK (also `UNIQUE`) on the optional/less-common side, e.g. `user_profile.user_id UNIQUE REFERENCES users`. The `UNIQUE` is what turns 1:N into 1:1.
- **M:N** needs a third table (next lesson) — a single FK can't represent it because *both* sides are "many."

**Anatomy of encoding cardinality:**

```
1:N   → FK on many side (no UNIQUE)
1:1   → FK on one side  + UNIQUE on that FK
M:N   → junction table with two FKs (see next lesson)
```

**In the warehouse this differs — placement is universal.** ER modeling and FK placement are engine-independent design. The only warehouse wrinkle (from the FK lesson) is that many warehouses don't *enforce* the FK — but the *placement* decision (which table holds the key) is identical and drives how you join.

**Keep it readable / common pitfall.** The classic error is putting the FK on the wrong side of a 1:N — trying to store a list of order ids on the customer. If you're tempted to store "many ids in one column," that's the signal you've either got the FK backwards (put it on the many side) or you actually have M:N (needs a junction). Second pitfall: modeling a true M:N as 1:N and losing half the relationship.

**Recap:** cardinality is how many relate to how many; the FK always sits on the many side, 1:1 adds a `UNIQUE` to the FK, and M:N can't be done with one FK — it needs a junction table.

#### APPLY (guided)

**Task.** Given two entities `authors` and `books` in a **1:N** relationship (one author writes many books), create both tables and **place the FK on the correct side**. Insert one author and two of their books, and prove the FK direction by counting an author's books with a join.

**Seed.** *(author from scratch.)*

**How it's graded.**

```sql
-- FK is on books (the many side), pointing at authors
SELECT COUNT(*) FROM pragma_foreign_key_list('books') WHERE "table"='authors';  -- 1
SELECT COUNT(*) FROM pragma_foreign_key_list('authors');                        -- 0 (no FK on the one side)
-- the relationship works
SELECT COUNT(*) FROM books b JOIN authors a ON a.author_id=b.author_id;         -- 2
```

**Hints.**
1. `authors(author_id PRIMARY KEY, name)` — the one side, no FK.
2. `books(book_id PRIMARY KEY, title, author_id REFERENCES authors)` — FK on the many side.
3. Insert the author before the books.

**Reference solution.**

```sql
PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS books; DROP TABLE IF EXISTS authors;
CREATE TABLE authors (author_id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE books (
    book_id   INTEGER PRIMARY KEY,
    title     TEXT,
    author_id INTEGER REFERENCES authors(author_id)
);
INSERT INTO authors VALUES (1,'Ada');
INSERT INTO books VALUES (1,'Notes',1),(2,'Engine',1);
```

#### PRACTICE (no reference)

**Task.** Model a "playlists ↔ songs" feature. There are three relationships to encode correctly in DDL:
1. A **user 1:N playlists** (a user owns many playlists) — FK placement required.
2. A **playlist 1:1 cover_image** (each playlist has at most one cover) — model as a table split with the correct `UNIQUE` FK.
3. A **playlists M:N songs** (a playlist has many songs; a song is on many playlists) — you must recognize a single FK **cannot** express this and instead create the tables such that the M:N is *left unresolved by a plain FK* (the junction comes next lesson). For this exercise, create `users`, `playlists`, `cover_images`, and `songs`, wiring the 1:N and 1:1 FKs, and add a one-row `model_notes` table stating `mn_needs_junction = 1` to record that the playlist↔song link needs a junction table.

**Seed.** *(author from scratch.)*

**How it's graded.**

```sql
-- 1:N — FK on playlists (many side) to users
SELECT COUNT(*) FROM pragma_foreign_key_list('playlists') WHERE "table"='users';  -- 1
-- 1:1 — FK on cover_images to playlists, and it's UNIQUE
SELECT COUNT(*) FROM pragma_foreign_key_list('cover_images') WHERE "table"='playlists'; -- 1
SELECT COUNT(*) FROM pragma_index_list('cover_images') WHERE "unique"=1;                 -- >= 1
-- songs has NO direct FK to playlists (M:N can't be a single FK)
SELECT COUNT(*) FROM pragma_foreign_key_list('songs') WHERE "table"='playlists';         -- 0
-- the modeling decision is recorded
SELECT mn_needs_junction FROM model_notes;   -- 1
```

**Hints.**
1. `playlists.user_id REFERENCES users` — FK on the many side.
2. `cover_images.playlist_id INTEGER UNIQUE REFERENCES playlists` — the `UNIQUE` makes it 1:1.
3. Do **not** put a `playlist_id` FK on `songs` — that would (wrongly) force a song into one playlist. Leave `songs` standalone; the M:N link is a junction table (next lesson).
4. `CREATE TABLE model_notes AS SELECT 1 AS mn_needs_junction;` records the decision the grader checks.

---

### Lesson `sql-l3-junction-tables` — Junction Tables for Many-to-Many

- **summary:** Resolve M:N relationships with a bridge table carrying its own attributes.
- **difficulty:** hard
- **estimatedMinutes:** 30
- **skills:** junction/associative table, composite PK of paired FKs, relationship attributes

#### READ

A single FK can encode 1:N, never M:N — because M:N means *both* sides have many, and one column can't hold many values. The resolution is a **junction table** (a.k.a. associative or bridge table): a third table whose job is to hold *pairs*, one row per related (A, B) combination.

Its shape is stereotyped:
- Two FK columns, one to each parent.
- A **composite primary key** of those two FKs — this both identifies the pair *and* blocks the same pair from being stored twice.
- Optionally, **relationship attributes**: facts that belong to the *pairing*, not to either entity alone.

**Worked example — students M:N courses:**

```sql
CREATE TABLE enrollments (
    student_id INTEGER REFERENCES students(student_id),
    course_id  INTEGER REFERENCES courses(course_id),
    enrolled_at TEXT,                    -- relationship attribute: when THIS pair formed
    grade       TEXT,                    -- belongs to the pairing, not to student or course alone
    PRIMARY KEY (student_id, course_id)  -- composite PK: one row per (student, course)
);
```

`enrolled_at` and `grade` can't live on `students` (a student has many enrollments) or on `courses` — they describe the *relationship*. That's the tell for a junction attribute: "does this fact depend on *both* entities together?"

**Anatomy:**

```
PRIMARY KEY (student_id, course_id)
             └──── two FKs together ────┘
       ▶ identifies the pair
       ▶ prevents a duplicate (student, course) row
```

**In the warehouse this differs — barely.** Junction tables are universal relational modeling. In dimensional/warehouse terms an M:N junction that carries measures becomes a **fact table** or a **bridge table** (e.g. a many-to-many between a fact and a dimension). Same structure — two keys plus attributes — different name for the role it plays.

**Keep it readable / common pitfall.** The composite PK is not optional decoration — without it, nothing stops the same student being enrolled in the same course twice, and every count doubles. Pitfall: putting relationship attributes on the wrong table (a `grade` column on `students` makes no sense once a student has many courses). Always ask "does this attribute need *both* keys to be meaningful?"

**Recap:** M:N is resolved by a junction table of two FKs with a composite PK (which also blocks duplicate pairs); attributes that depend on *both* entities live on the junction, not on either parent.

#### APPLY (guided)

**Task.** Create an `enrollments` junction table between `students` and `courses` with a composite PK `(student_id, course_id)`. Insert two students, two courses, and three enrollments. Prove the composite PK blocks a duplicate `(student_id, course_id)` pair (attempt one with `INSERT OR IGNORE`).

**Seed.**

```sql
DROP TABLE IF EXISTS enrollments; DROP TABLE IF EXISTS students; DROP TABLE IF EXISTS courses;
CREATE TABLE students (student_id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE courses  (course_id  INTEGER PRIMARY KEY, title TEXT);
INSERT INTO students VALUES (1,'Ada'),(2,'Grace');
INSERT INTO courses  VALUES (10,'SQL'),(11,'Modeling');
```

**How it's graded.**

```sql
SELECT COUNT(*) FROM pragma_table_info('enrollments') WHERE pk>0;  -- expect 2 (composite PK)
SELECT COUNT(*) FROM enrollments;                                   -- expect 3 (dup ignored)
SELECT COUNT(*) FROM enrollments WHERE student_id=1 AND course_id=10; -- expect 1
```

**Hints.**
1. `PRIMARY KEY (student_id, course_id)` at table level.
2. Insert three distinct pairs, then attempt one already-existing pair with `INSERT OR IGNORE`.
3. The `INSERT OR IGNORE` skips the duplicate instead of aborting.

**Reference solution.**

```sql
CREATE TABLE enrollments (
    student_id INTEGER REFERENCES students(student_id),
    course_id  INTEGER REFERENCES courses(course_id),
    enrolled_at TEXT,
    PRIMARY KEY (student_id, course_id)
);
INSERT INTO enrollments VALUES (1,10,'2026-01-01'),(1,11,'2026-01-02'),(2,10,'2026-01-03');
INSERT OR IGNORE INTO enrollments VALUES (1,10,'2026-02-09');  -- duplicate pair, ignored
```

#### PRACTICE (no reference)

**Task.** Build the `playlist_songs` junction for a playlists ↔ songs M:N, with a **relationship attribute** `position` (a song's ordering within a playlist). Requirements:
- Composite PK `(playlist_id, song_id)` — a song can appear in a playlist only once.
- A `position INTEGER NOT NULL` relationship attribute.
- A composite `UNIQUE (playlist_id, position)` so two songs can't claim the same slot in one playlist.

Insert two playlists, three songs, and several junction rows. Then prove **two** guards: a duplicate `(playlist_id, song_id)` is rejected, and a duplicate `(playlist_id, position)` is rejected.

**Seed.**

```sql
DROP TABLE IF EXISTS playlist_songs; DROP TABLE IF EXISTS playlists; DROP TABLE IF EXISTS songs;
CREATE TABLE playlists (playlist_id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE songs (song_id INTEGER PRIMARY KEY, title TEXT);
INSERT INTO playlists VALUES (1,'Focus'),(2,'Party');
INSERT INTO songs VALUES (100,'A'),(101,'B'),(102,'C');
```

**How it's graded.**

```sql
-- composite PK of two columns
SELECT COUNT(*) FROM pragma_table_info('playlist_songs') WHERE pk>0;  -- expect 2
-- relationship attribute present and NOT NULL
SELECT COUNT(*) FROM pragma_table_info('playlist_songs') WHERE name='position' AND "notnull"=1; -- 1
-- a second unique index exists (playlist_id, position)
SELECT COUNT(*) FROM pragma_index_list('playlist_songs') WHERE "unique"=1;  -- >= 2
-- duplicate (playlist,song) blocked and duplicate (playlist,position) blocked
-- (assumes your inserts start with 3 valid rows in playlist 1, then two ignored dup attempts)
SELECT COUNT(*) FROM playlist_songs WHERE playlist_id=1;   -- expect 3 (both dup attempts ignored)
```

**Hints.**
1. `PRIMARY KEY (playlist_id, song_id)` for the pair; separately `UNIQUE (playlist_id, position)` for slot uniqueness.
2. `position INTEGER NOT NULL`.
3. Insert three valid rows in playlist 1 with positions 1,2,3; then `INSERT OR IGNORE` a repeat song (blocked by PK) and a new song at position 1 (blocked by the position unique).
4. Both `INSERT OR IGNORE` attempts should leave playlist 1 at exactly three rows.

---

### Lesson `sql-l3-indexes` — Indexes: Speeding Up Reads

- **summary:** Add B-tree indexes on the columns queries actually filter and join on.
- **difficulty:** medium
- **estimatedMinutes:** 25
- **skills:** `CREATE INDEX`, indexing FK / `WHERE` / `JOIN` / `ORDER BY` columns, read vs write trade-off

#### READ

An **index** is a sorted secondary structure (a B-tree) that lets the database *seek* directly to matching rows instead of *scanning* every row. On a filter like `WHERE customer_id = 42`, an index on `customer_id` turns an O(n) table scan into an O(log n) seek. The columns worth indexing are exactly the ones queries **filter, join, and sort on**:

- **FK columns** — you join on them constantly.
- **`WHERE` predicate columns** — the selective filters.
- **`ORDER BY` / `GROUP BY` columns** — an index can supply pre-sorted rows.

**Two things are auto-indexed for free:** `PRIMARY KEY` and `UNIQUE` constraints each create an index automatically. So you rarely index a PK yourself — you index the *other* hot columns, especially FKs (which are **not** auto-indexed in SQLite).

**Worked example.**

```sql
-- fact_sales is joined to dim_customer on customer_sk all day long
CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_sk);

-- a mart repeatedly filters events by date
CREATE INDEX idx_events_date ON raw_events(event_date);
```

**Anatomy:**

```
CREATE INDEX  idx_fact_sales_customer  ON fact_sales (customer_sk)
                    │                        │            │
              index name (convention:      table      indexed column(s)
              idx_<table>_<col>)                   (multi-col = composite index)
```

A **composite index** `(a, b)` speeds filters on `a` and on `a, b` together (leftmost-prefix rule) — but not on `b` alone.

**The trade-off — indexes cost writes.** Every index must be *updated* on every `INSERT`/`UPDATE`/`DELETE`. More indexes = faster reads, slower writes, more storage. So **index selectively**: the FK and filter columns that queries actually use, not every column "just in case."

**In the warehouse this differs — a lot.** Columnar warehouses (Snowflake, BigQuery) generally **don't have traditional B-tree indexes** at all; they rely on columnar storage, partitioning, clustering keys, and micro-partition pruning. So `CREATE INDEX` is a row-store (SQLite/Postgres/MySQL) concept. The *principle* — help the engine skip data instead of scanning — carries over, but the mechanism is partition/cluster design, not indexes.

**Keep it readable / common pitfall.** The pitfall is over-indexing: an index on a column no query filters on is pure write-cost with zero read benefit. Before adding one, name the query it helps. Second pitfall: forgetting FKs aren't auto-indexed in SQLite — an unindexed FK makes joins scan. Leave a comment on non-obvious indexes explaining the query they serve.

**Recap:** indexes turn scans into seeks on filter/join/sort columns; PK and `UNIQUE` are auto-indexed but FKs are not — index those, index selectively because every index taxes writes, and remember warehouses use partitioning/clustering instead.

#### APPLY (guided)

**Task.** A `fact_sales` table is joined to `dim_customer` on `customer_sk` in every mart. Add the index that makes that join a seek. Confirm via `EXPLAIN QUERY PLAN` that the join can use it. *(You only need to create the index; the grader checks it exists and is on the right column.)*

**Seed.**

```sql
DROP TABLE IF EXISTS fact_sales;
CREATE TABLE fact_sales (sale_id INTEGER PRIMARY KEY, customer_sk INTEGER, revenue_cents INTEGER);
INSERT INTO fact_sales (customer_sk, revenue_cents)
SELECT (value%50)+1, value*10 FROM (WITH RECURSIVE n(value) AS (SELECT 1 UNION ALL SELECT value+1 FROM n WHERE value<500) SELECT value FROM n);
```

**How it's graded.**

```sql
-- an index on fact_sales(customer_sk) exists
SELECT COUNT(*) FROM pragma_index_list('fact_sales') il
JOIN pragma_index_info(il.name) ii
WHERE ii.name='customer_sk';   -- >= 1
```

**Hints.**
1. `CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_sk);`
2. Name it `idx_<table>_<col>` by convention.
3. `customer_sk` is a plain FK-style column — not the PK — so it isn't auto-indexed.

**Reference solution.**

```sql
CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_sk);
```

#### PRACTICE (no reference)

**Task.** You're given a slow three-table mart. The dashboard runs a `fact_sales → dim_customer → dim_product` join filtered by `dim_product.category` and sorted by `order_date`. Add the **two indexes that matter** and deliberately **skip the ones that don't**, then leave a SQL comment explaining the write-cost trade-off. Specifically:
- Add an index on `fact_sales(customer_sk)` (the FK join column).
- Add an index on `fact_sales(product_sk)` (the FK join column).
- Do **not** index `revenue_cents` (never filtered/joined) or `dim_product.product_sk` (already the PK, auto-indexed).
- Add a comment line noting each index taxes inserts.

**Seed.**

```sql
DROP TABLE IF EXISTS fact_sales; DROP TABLE IF EXISTS dim_customer; DROP TABLE IF EXISTS dim_product;
CREATE TABLE dim_customer (customer_sk INTEGER PRIMARY KEY, email TEXT);
CREATE TABLE dim_product (product_sk INTEGER PRIMARY KEY, category TEXT);
CREATE TABLE fact_sales (
    sale_id INTEGER PRIMARY KEY, customer_sk INTEGER, product_sk INTEGER,
    order_date TEXT, revenue_cents INTEGER
);
```

**How it's graded.**

```sql
-- exactly the two FK indexes were added
SELECT COUNT(*) FROM pragma_index_list('fact_sales') il
JOIN pragma_index_info(il.name) ii WHERE ii.name='customer_sk';   -- >= 1
SELECT COUNT(*) FROM pragma_index_list('fact_sales') il
JOIN pragma_index_info(il.name) ii WHERE ii.name='product_sk';    -- >= 1
-- did NOT waste an index on revenue_cents
SELECT COUNT(*) FROM pragma_index_list('fact_sales') il
JOIN pragma_index_info(il.name) ii WHERE ii.name='revenue_cents'; -- expect 0
```

**Hints.**
1. Two `CREATE INDEX` statements, one per FK column on `fact_sales`.
2. Skip `revenue_cents` — no query filters or joins on it, so an index is pure write cost.
3. `product_sk` on `dim_product` is the PK — already indexed; don't duplicate it.
4. Add a `-- ` comment noting every index slows `INSERT`/`UPDATE` on `fact_sales`, which is why you index selectively.

---

## Module 3.5 — Dimensional Modeling Introduction

Everything so far converges here: the Kimball **star schema**. You'll split analytics data into one narrow fact table of measures surrounded by wide descriptive dimensions, around a **declared grain** — the model that BI tools are built to query.

---

### Lesson `sql-l3-dimensional-intro` — Facts, Dimensions, and Grain  *(full exemplar)*

- **summary:** Split analytics data into a narrow fact and wide dimensions around a declared grain.
- **difficulty:** hard
- **estimatedMinutes:** 35
- **skills:** fact vs dimension, grain declaration, surrogate keys, star vs snowflake

#### READ

Full 3NF is great for safe writes but painful for analytics — a "revenue by category by month" report might join six tables. The **star schema** (Ralph Kimball's dimensional model) is the disciplined denormalization that BI runs on. It has exactly two kinds of table:

- **Fact table** — *narrow and tall*. Holds the **measures** (numeric, additive things you sum: revenue, quantity) plus **foreign keys** to dimensions. One fact table, millions of rows, few columns. `fact_sales(customer_sk, product_sk, date_sk, quantity, revenue_cents)`.
- **Dimension tables** — *wide and short*. Hold the **descriptive context** you filter and group by: `dim_customer(customer_sk, name, country, segment)`, `dim_product(product_sk, name, category, brand)`, `dim_date(date_sk, date, month, year, weekday)`.

Drawn out, the fact sits in the center with dimensions radiating around it — hence **star**.

**Grain — declare it first, always.** The **grain** is the precise meaning of one fact row: "one row per order line item," or "one row per order," or "one row per customer per day." *Everything* depends on getting this right — a measure only makes sense at a stated grain, and mixing grains double-counts. Kimball's first rule: **declare the grain before you add a single column.** Our fact's grain: **one row per order line item.**

**Worked example — a minimal star:**

```sql
-- Dimensions: wide, descriptive, surrogate-keyed
CREATE TABLE dim_product (
    product_sk   INTEGER PRIMARY KEY,   -- surrogate
    product_id   INTEGER,               -- natural/business key
    product_name TEXT,
    category     TEXT
);
CREATE TABLE dim_date (
    date_sk INTEGER PRIMARY KEY,        -- e.g. 20260105
    date    TEXT,
    year_month TEXT                     -- 'YYYY-MM'
);
-- Fact: narrow, measures + FKs to dims, at line-item grain
CREATE TABLE fact_sales (
    sale_sk    INTEGER PRIMARY KEY,
    product_sk INTEGER REFERENCES dim_product(product_sk),
    date_sk    INTEGER REFERENCES dim_date(date_sk),
    quantity   INTEGER,
    revenue_cents INTEGER
);
```

A BI query is now a couple of joins from the fact out to the dims:

```sql
SELECT p.category, d.year_month, SUM(f.revenue_cents) AS revenue
FROM fact_sales f
JOIN dim_product p ON p.product_sk = f.product_sk
JOIN dim_date    d ON d.date_sk    = f.date_sk
GROUP BY p.category, d.year_month;
```

**Anatomy of the star:**

```
          dim_customer
                │
 dim_date ── fact_sales ── dim_product
                │
          (measures: quantity, revenue_cents; FKs: *_sk)

  fact  = numeric measures + dimension FKs, at ONE declared grain
  dim   = descriptive attributes you filter/group by, surrogate-keyed
```

**Star vs snowflake.** A **star** keeps each dimension flat (denormalized) — `dim_product` holds `category` right on it. A **snowflake** normalizes dimensions further (`dim_product → dim_category`), saving space but re-introducing joins. Kimball's default is **star**: flatter dims, fewer joins, faster and simpler for analysts. Snowflake only when a dimension is huge and its sub-attributes are heavily reused.

**Surrogate keys everywhere.** Dimensions use surrogate `*_sk` keys (from Module 3.2), and the fact references *those*, not the business keys. This is what makes slowly-changing dimensions possible later (L4) — the surrogate can point at the *version* of a dimension valid when the fact happened.

**In the warehouse this differs — this is the warehouse's home turf.** Star schemas are the native modeling pattern of Snowflake, BigQuery, Redshift, and dbt projects. The SQL you write here is exactly what you'd write there (minus the un-enforced FKs). `dim_date` in particular is a warehouse staple — a pre-built calendar dimension every fact joins to.

**Keep it readable / common pitfall.** The #1 pitfall is **not declaring the grain** and then mixing grains in one fact (e.g. line-item rows *and* order-total rows) — every sum double-counts. State the grain in a comment at the top of the fact DDL. Second pitfall: stuffing descriptive text into the fact ("just this once") — descriptions belong in dimensions; the fact stays numeric and narrow.

**Recap:** a star schema is one narrow measure-and-FK fact surrounded by wide descriptive dimensions, all surrogate-keyed, around a single declared grain — the model BI queries are built for; default to star (flat dims) over snowflake.

#### APPLY (guided)

**Task.** Build a minimal star: a `dim_product` with a surrogate key `product_sk` (and the business key `product_id`, `category`), and a narrow `fact_sales` at **one-row-per-sale grain** that references `dim_product` via `product_sk` and carries `quantity` and `revenue_cents`. Load two products and three sales, then write the BI query "revenue by category."

**Seed.**

```sql
DROP TABLE IF EXISTS raw_product; DROP TABLE IF EXISTS raw_sale;
CREATE TABLE raw_product (product_id INTEGER, name TEXT, category TEXT);
CREATE TABLE raw_sale (product_id INTEGER, quantity INTEGER, revenue_cents INTEGER);
INSERT INTO raw_product VALUES (100,'Mouse','peripherals'),(101,'Monitor','displays');
INSERT INTO raw_sale VALUES (100,2,4998),(101,1,19999),(100,3,7497);
```

**How it's graded.**

```sql
-- dim has a surrogate PK distinct from the business key
SELECT COUNT(*) FROM pragma_table_info('dim_product') WHERE name='product_sk' AND pk=1;  -- 1
SELECT COUNT(*) FROM pragma_table_info('dim_product') WHERE name='product_id';           -- 1
-- fact references the dim's surrogate key
SELECT COUNT(*) FROM pragma_foreign_key_list('fact_sales') WHERE "table"='dim_product';  -- 1
-- fact is narrow: no descriptive text columns
SELECT COUNT(*) FROM pragma_table_info('fact_sales') WHERE name IN ('category','name');   -- 0
-- BI query works
SELECT revenue FROM cat_revenue WHERE category='peripherals';  -- 4998+7497 = 12495
```

**Hints.**
1. `dim_product(product_sk INTEGER PRIMARY KEY, product_id INTEGER, name TEXT, category TEXT)` — load it from `raw_product` (let `product_sk` auto-assign).
2. Load `fact_sales` by joining `raw_sale` to `dim_product` on `product_id` to look up the `product_sk`.
3. The fact holds only `product_sk`, `quantity`, `revenue_cents` — no category text.
4. Materialize the BI result as `cat_revenue` (e.g. `CREATE TABLE cat_revenue AS SELECT p.category, SUM(f.revenue_cents) AS revenue FROM fact_sales f JOIN dim_product p … GROUP BY p.category`).

**Reference solution.**

```sql
DROP TABLE IF EXISTS dim_product; DROP TABLE IF EXISTS fact_sales; DROP TABLE IF EXISTS cat_revenue;

CREATE TABLE dim_product (
    product_sk INTEGER PRIMARY KEY,
    product_id INTEGER,
    name       TEXT,
    category   TEXT
);
INSERT INTO dim_product (product_id, name, category)
SELECT product_id, name, category FROM raw_product;

-- grain: one row per sale
CREATE TABLE fact_sales (
    sale_sk    INTEGER PRIMARY KEY,
    product_sk INTEGER REFERENCES dim_product(product_sk),
    quantity   INTEGER,
    revenue_cents INTEGER
);
INSERT INTO fact_sales (product_sk, quantity, revenue_cents)
SELECT d.product_sk, r.quantity, r.revenue_cents
FROM raw_sale r
JOIN dim_product d ON d.product_id = r.product_id;

CREATE TABLE cat_revenue AS
SELECT p.category, SUM(f.revenue_cents) AS revenue
FROM fact_sales f
JOIN dim_product p ON p.product_sk = f.product_sk
GROUP BY p.category;
```

#### PRACTICE (no reference)

**Task.** Convert the 3NF schema into a **first star schema**. From normalized `customers`, `products`, `orders`, `order_items`, build:
- `dim_customer(customer_sk PK, customer_id, email, country_code)`
- `dim_product(product_sk PK, product_id, product_name, category)`
- `dim_date(date_sk PK, full_date, year_month)` — derive `date_sk` as an integer `YYYYMMDD`, `year_month` as `'YYYY-MM'`, one row per distinct order date.
- `fact_sales` at **line-item grain**: `(sale_sk PK, customer_sk, product_sk, date_sk, quantity, revenue_cents)`, each FK looked up from its dimension by natural key, and **zero orphan facts** (every FK resolves).

Then write one BI query, materialized as `revenue_by_cat_month(category, year_month, revenue)`, computing revenue by category by month over the star.

**Seed.**

```sql
DROP TABLE IF EXISTS customers; DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS order_items;
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, email TEXT, country_code TEXT);
CREATE TABLE products (product_id INTEGER PRIMARY KEY, product_name TEXT, category TEXT, unit_price_cents INTEGER);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT);
CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER, PRIMARY KEY(order_id,product_id));
INSERT INTO customers VALUES (10,'ada@x.com','GB'),(11,'grace@x.com','US');
INSERT INTO products VALUES (100,'Mouse','peripherals',2499),(101,'Monitor','displays',19999);
INSERT INTO orders VALUES (1,10,'2026-01-05'),(2,11,'2026-02-06'),(3,10,'2026-02-07');
INSERT INTO order_items VALUES (1,100,2),(1,101,1),(2,100,1),(3,101,2);
```

**How it's graded.**

```sql
-- three dims with surrogate PKs
SELECT COUNT(*) FROM pragma_table_info('dim_customer') WHERE name='customer_sk' AND pk=1;  -- 1
SELECT COUNT(*) FROM pragma_table_info('dim_product')  WHERE name='product_sk'  AND pk=1;  -- 1
SELECT COUNT(*) FROM pragma_table_info('dim_date')     WHERE name='date_sk'     AND pk=1;  -- 1
-- dim_date has one row per distinct order date (3 dates)
SELECT COUNT(*) FROM dim_date;   -- expect 3
-- fact at line-item grain: 4 rows (one per order_item)
SELECT COUNT(*) FROM fact_sales; -- expect 4
-- ZERO orphan facts: every FK resolves to a dimension row
SELECT COUNT(*) FROM fact_sales f LEFT JOIN dim_customer c ON c.customer_sk=f.customer_sk WHERE c.customer_sk IS NULL; -- 0
SELECT COUNT(*) FROM fact_sales f LEFT JOIN dim_product  p ON p.product_sk =f.product_sk  WHERE p.product_sk  IS NULL; -- 0
SELECT COUNT(*) FROM fact_sales f LEFT JOIN dim_date     d ON d.date_sk    =f.date_sk     WHERE d.date_sk     IS NULL; -- 0
-- fact stays narrow: no descriptive text leaked in
SELECT COUNT(*) FROM pragma_table_info('fact_sales') WHERE name IN ('category','email','product_name'); -- 0
-- BI answer: Feb peripherals revenue = order 2 (Mouse x1 = 2499)
SELECT revenue FROM revenue_by_cat_month WHERE category='peripherals' AND year_month='2026-02';  -- 2499
-- Jan displays = order 1 Monitor x1 = 19999
SELECT revenue FROM revenue_by_cat_month WHERE category='displays' AND year_month='2026-01';     -- 19999
```

**Hints.**
1. Load dims first so their surrogate keys exist before the fact looks them up: `dim_customer`/`dim_product` from the normalized tables; `dim_date` from `SELECT DISTINCT order_date`, deriving `date_sk = CAST(strftime('%Y%m%d', order_date) AS INTEGER)` and `year_month = strftime('%Y-%m', order_date)`.
2. Compute `revenue_cents` at load as `oi.qty * p.unit_price_cents` (join `order_items` to `products`).
3. Build the fact by joining `order_items → orders → products` and then looking up each surrogate: join to `dim_customer` on `customer_id`, `dim_product` on `product_id`, `dim_date` on the order date. Insert `customer_sk`, `product_sk`, `date_sk` — never the natural keys or any text.
4. Declare the grain in a comment ("one row per order line item") and keep the fact to measures + FKs only; the "zero orphan" assertions fail if any surrogate lookup misses, so make sure all three dims are fully populated before loading the fact.

---

*End of Level 3. The learner has gone from a raw dump to typed staging tables, enforced keys and constraints, a fully normalized 3NF schema, a deliberate denormalization, resolved M:N relationships, selective indexes, and finally a working star schema with a declared grain and zero orphan facts — ready for Level 4, where these models get loaded incrementally, versioned with SCD history, and made idempotent.*

---

# LEVEL 4 — Data Engineering with SQL

- **id:** `4`
- **slug:** `data-engineering-sql`
- **title:** Data Engineering with SQL
- **tagline:** Ship the transforms a DE is judged on — analytical windows, SCD history, idempotent loads, quality gates, and query plans — then a capstone loader.
- **audience:** DE intern ready to build production-grade, safe-to-rerun transforms and warehouse models. You can already query, aggregate, join, and design a normalized/star schema (Levels 1–3). Now you build the moving parts of a real pipeline.
- **estimatedHours:** `8`
- **defaultExecutionMode:** `workspace`

## What you'll build

By the end of Level 4 you will have written, from scratch, the transforms that show up in every data-engineering job description and interview:

- **Analytical windows** — ranking, period-over-period deltas, running totals and moving averages that turn a fact table into a trend mart without a single self-join.
- **Recursive CTEs** — walking self-referencing hierarchies (org charts, category trees) to produce depth and breadcrumb paths.
- **A star-schema load** — dimensions first (minting surrogate keys), then a fact that looks those keys up, with zero orphan rows.
- **Slowly Changing Dimensions** — Type 1 overwrite and Type 2 expire-and-insert history, the single most common warehouse-modeling interview topic.
- **Idempotent loads** — dedup with `ROW_NUMBER`, upsert with `INSERT … ON CONFLICT`, and the "run it twice, same row count" test that separates a junior script from a production loader.
- **Quality and performance gates** — dbt-style zero-row assertions and reading `EXPLAIN QUERY PLAN` to turn a table scan into an index seek.
- **A capstone Type-2 SCD loader** that composes all of the above into one daily pipeline.

## How Level 4 is graded

Every exercise runs in **workspace mode**: your script is a multi-statement program (DDL + DML + queries) executed against a fresh in-memory SQLite database. A hidden test runner then executes **assertion queries** and emits the `__WORKSPACE_TEST_RESULTS__:` protocol the platform parses. Unlike Levels 1–2 (which compared a single `SELECT`), Level 4 graders check **schema shape, row outcomes, history correctness, and idempotency** — several exercises deliberately run your script **twice** and assert the row count is identical.

All SQL is written in the ANSI/SQLite intersection so it runs in the browser. Where a warehouse (Postgres, Snowflake, BigQuery, SQL Server) does it differently, you'll see a short **In the warehouse** callout — those divergences are exactly what interviewers probe.

> Portability note used throughout: SQLite has **no native `DATE`/`TIMESTAMP` type** — dates are ISO-8601 **TEXT** (`'2026-03-01'`, `'2026-03-01 14:00:00'`), which sorts and compares correctly as text. `TRUE`/`FALSE` are stored as `1`/`0`. Window functions require SQLite ≥ 3.25 (all modern builds, including the browser engine here).

---

## Module 4.1 — Analytical SQL: Window Functions

Window functions compute a value **across a set of rows related to the current row** without collapsing them the way `GROUP BY` does. They are the backbone of analytics engineering: ranking, deduplication, period-over-period math, running totals. This module builds the three families you'll use daily.

---

### Lesson `sql-l4-window-ranking` — Ranking: ROW_NUMBER, RANK, DENSE_RANK

- **id:** `sql-l4-window-ranking`
- **title:** Ranking: ROW_NUMBER, RANK, DENSE_RANK
- **summary:** Rank rows within a partition without collapsing them.
- **difficulty:** medium
- **estimatedMinutes:** 22
- **skills:** `OVER`, `PARTITION BY`, `ORDER BY`, `ROW_NUMBER`, `RANK`, `DENSE_RANK`, tie handling

#### READ

You just loaded a `fact_sales` table and product wants a "top 3 products per category" mart. Your first instinct — `GROUP BY category ORDER BY revenue DESC LIMIT 3` — gives you the top 3 for **one** category, not per category. The moment you need "top N *within each group*" or "the latest row *per key*," you've hit the wall that window functions were invented to knock down.

A **window function** runs a calculation over a "window" of rows defined relative to the current row, and — crucially — **keeps every input row**. `GROUP BY category` returns one row per category; `ROW_NUMBER() OVER (PARTITION BY category …)` returns *every* product row, each tagged with its rank inside its category. You keep the detail *and* get the ranking.

The three ranking functions differ only in how they treat **ties**, and this exact distinction is a classic interview question.

##### A worked example

Seed a tiny scores table and rank within each region:

```sql
CREATE TABLE product_revenue (
  category   TEXT,
  product    TEXT,
  revenue    INTEGER
);
INSERT INTO product_revenue VALUES
  ('audio',   'Headphones', 500),
  ('audio',   'Earbuds',    500),   -- tie with Headphones
  ('audio',   'Speaker',    300),
  ('audio',   'Cable',      100),
  ('video',   'Monitor',    900),
  ('video',   'Webcam',     400);

SELECT
  category,
  product,
  revenue,
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) AS rn,
  RANK()       OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk,
  DENSE_RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS dense
FROM product_revenue
ORDER BY category, revenue DESC;
```

For the `audio` category (two products tied at 500), the three columns produce:

| product | revenue | rn (`ROW_NUMBER`) | rnk (`RANK`) | dense (`DENSE_RANK`) |
|---|---|---|---|---|
| Headphones | 500 | 1 | 1 | 1 |
| Earbuds | 500 | 2 | 1 | 1 |
| Speaker | 300 | 3 | **3** | **2** |
| Cable | 100 | 4 | 4 | 3 |

Read the tie row carefully — this **is** the exam question:

- **`ROW_NUMBER`** → `1, 2, 3, 4`. Always dense, always unique, **breaks ties arbitrarily**. Use it when you must pick exactly one row ("the latest record per customer").
- **`RANK`** → `1, 1, 3, 4`. Ties share a rank, then it **skips** (no rank 2). Use it for "Olympic" standings where a shared gold means no silver.
- **`DENSE_RANK`** → `1, 1, 2, 3`. Ties share a rank, then it **does not skip**. Use it for "distinct tiers" ("what is the 2nd-highest distinct revenue?").

##### Anatomy of the OVER clause

```
ROW_NUMBER() OVER ( PARTITION BY category  ORDER BY revenue DESC )
└────┬─────┘ └─┬─┘  └────────┬───────────┘  └────────┬─────────┘
 window fn    the       reset the count           order rows
              window   for each category           inside the
              keyword  (like GROUP BY, but          window; this
                        rows are kept)              defines "rank of what"
```

- **`PARTITION BY`** slices the data into independent groups; the ranking restarts at 1 for each. Omit it and the whole result set is one window.
- **`ORDER BY`** inside `OVER` decides what "first" means — it is **separate** from the query's outer `ORDER BY`, which only controls display order.

##### Pick one row per key (the pattern you'll reuse all level)

Because `ROW_NUMBER` is unique, "keep the latest row per customer" is a wrapped subquery:

```sql
SELECT * FROM (
  SELECT c.*,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) AS rn
  FROM customer_dump c
) ranked
WHERE rn = 1;
```

You cannot filter on a window function in the same `WHERE` (it's computed after `WHERE`), so you wrap it in a subquery and filter the outer query. You'll formalize this as **deduplication** in Module 4.4.

##### Keep it readable / common pitfall

- **Pitfall — filtering a window in `WHERE`:** `WHERE ROW_NUMBER() OVER (...) = 1` is a syntax error. Window functions are evaluated *after* `WHERE`/`GROUP BY`/`HAVING`. Wrap and filter outside, or use `QUALIFY` (warehouse-only, below).
- **Pitfall — nondeterministic `ROW_NUMBER`:** if your `ORDER BY` has ties, `ROW_NUMBER` picks a winner arbitrarily and the choice can change between runs. Add a **tiebreaker** column (e.g. `ORDER BY updated_at DESC, id DESC`) so the result is deterministic — graders and idempotency tests depend on this.
- **Readability:** name the ranked subquery (`ranked`, `numbered`) and put the window in a CTE when the query grows.

> **In the warehouse:** Snowflake and BigQuery let you skip the subquery with `QUALIFY ROW_NUMBER() OVER (...) = 1`. SQLite and Postgres have no `QUALIFY` — you must wrap in a subquery/CTE. The `ROW_NUMBER`/`RANK`/`DENSE_RANK` semantics are identical everywhere.

**Recap:** `ROW_NUMBER` = unique `1,2,3` (pick one); `RANK` = `1,1,3` (ties skip); `DENSE_RANK` = `1,1,2` (ties don't skip) — all keep every row, all reset per `PARTITION BY`.

#### APPLY (guided)

**Task:** Build a **top-3-products-per-category** mart. From `fact_sales`, aggregate revenue per `(category, product)`, then keep only the three highest-revenue products *within each category*. Two products tied for third place should **both** be excluded from a strict top-3-slots interpretation — so use the ranking function that assigns unique slot numbers, and keep rows where the slot is ≤ 3. Write the result into a table `top_products(category, product, revenue, rank_in_category)`.

**Seed:**

```sql
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

CREATE TABLE top_products (
  category         TEXT,
  product          TEXT,
  revenue          INTEGER,
  rank_in_category INTEGER
);
```

**Your task:** write an `INSERT INTO top_products … SELECT …` that fills the mart.

**Grading — the hidden suite asserts:**

- `top_products` has exactly **6 rows** (3 per category × 2 categories).
- Every `rank_in_category` is in `{1,2,3}` and is **unique within each category** (proves you used `ROW_NUMBER`, not `RANK`/`DENSE_RANK`).
- For `audio`, the retained products are `Headphones` (500), `Earbuds` (250), `Speaker` (150).
- For `video`, rank 1 is `Monitor` (600); `Lens` (100) is **absent**.
- No product from outside the top 3 appears.

**Hints:**

1. First aggregate: `SELECT category, product, SUM(revenue) AS revenue FROM fact_sales GROUP BY category, product`. Do the ranking on top of *that*, not on the raw rows.
2. You can't filter a window function in `WHERE`. Put the aggregation-plus-`ROW_NUMBER` in a CTE, then `SELECT … WHERE rank_in_category <= 3` from it.
3. `ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC)` gives unique 1,2,3 per category. Add `, product` to the `ORDER BY` as a deterministic tiebreaker.
4. Wrap it all in `INSERT INTO top_products SELECT category, product, revenue, rn FROM ranked WHERE rn <= 3;`.

**Reference solution:**

```sql
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
WHERE rank_in_category <= 3;
```

#### PRACTICE (harder, no reference revealed)

**Task:** A merchandising team wants a **"category leaderboard"** mart with richer tie semantics. From `fact_sales` (same shape as Apply, plus a `sold_at` TEXT date), produce a table `leaderboard(category, product, revenue, row_rank, rank_rank, dense_rank, is_podium)` where, per category ordered by total revenue descending:

- `row_rank` = unique slot (`ROW_NUMBER`), tiebroken by **earliest first sale date**, then product name.
- `rank_rank` = `RANK` (ties skip).
- `dense_rank` = `DENSE_RANK` (ties don't skip).
- `is_podium` = `1` when the product is in the **top 3 distinct revenue tiers** (i.e. `dense_rank <= 3`), else `0` — so genuinely tied products **all** make the podium, unlike a strict slot cutoff.

Then keep **only** rows where `is_podium = 1`.

**Seed:**

```sql
CREATE TABLE fact_sales (
  sale_id  INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  product  TEXT NOT NULL,
  revenue  INTEGER NOT NULL,
  sold_at  TEXT NOT NULL           -- ISO date 'YYYY-MM-DD'
);
INSERT INTO fact_sales (category, product, revenue, sold_at) VALUES
  ('audio','Headphones',300,'2026-01-05'), ('audio','Headphones',200,'2026-02-01'),
  ('audio','Earbuds',   500,'2026-01-03'), ('audio','Speaker',   500,'2026-01-09'),
  ('audio','Cable',     500,'2026-01-02'), ('audio','Stand',     100,'2026-03-01'),
  ('video','Monitor',   600,'2026-01-04'), ('video','Webcam',    400,'2026-01-06'),
  ('video','Tripod',    400,'2026-01-07'), ('video','Lens',      100,'2026-02-02');

CREATE TABLE leaderboard (
  category   TEXT, product TEXT, revenue INTEGER,
  row_rank   INTEGER, rank_rank INTEGER, dense_rank INTEGER, is_podium INTEGER
);
```

**Grading — the hidden suite asserts:**

- In `audio`, three products tie at 500 (`Earbuds`, `Speaker`, `Cable`); all three have `dense_rank = 1` and `is_podium = 1`, but distinct `row_rank` values `{1,2,3}` ordered by earliest sale date (`Cable` 01-02, `Earbuds` 01-03, `Speaker` 01-09).
- `Headphones` (audio, 500 total across two rows) — verify your aggregation sums to 500 and it ties too. (Design your grouping so per-product totals are correct.)
- `rank_rank` for the row after the 500-tie block **skips** appropriately; `dense_rank` does not.
- Every retained row has `is_podium = 1`; `audio`/`Stand` (100) and `video`/`Lens` (100) are absent.
- Result contains no row with `dense_rank > 3`.

**Hints:**

1. Aggregate to per-product totals first, but carry `MIN(sold_at)` as `first_sold` so you have a deterministic date tiebreaker.
2. Compute all three ranking functions in the same CTE over the same partition; only the `ROW_NUMBER` needs the extra tiebreaker in its `ORDER BY`.
3. `is_podium` is derived from `dense_rank` — compute the ranks in one CTE, then `CASE WHEN dense_rank <= 3 THEN 1 ELSE 0 END` in the next.
4. Filter `WHERE is_podium = 1` in the outer query, never in the windowed CTE.

---

### Lesson `sql-l4-window-offset` — LAG and LEAD: Period-over-Period

- **id:** `sql-l4-window-offset`
- **title:** LAG and LEAD: Period-over-Period
- **summary:** Compare each row to its neighbor without a self-join.
- **difficulty:** medium
- **estimatedMinutes:** 20
- **skills:** `LAG`, `LEAD`, offset windows, deltas, growth rates

#### READ

"Month-over-month revenue change" and "days since the customer's previous order" are the two most-requested analytics metrics, and juniors reach for a self-join: join the table to itself on `month = month - 1`. That works but is verbose, slow, and breaks on gaps. `LAG` and `LEAD` do it in one line.

`LAG(col, n)` returns `col` from the row **n positions before** the current row within the window (default `n = 1`); `LEAD(col, n)` looks **forward**. "Before" and "after" are defined by the window's `ORDER BY`.

```sql
SELECT
  customer_id,
  order_month,
  revenue,
  LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS prev_revenue,
  revenue - LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS mom_delta
FROM monthly_revenue;
```

For a customer's first month there is no previous row, so `LAG` returns `NULL` and the delta is `NULL` — real, meaningful "no prior period" signal, not a bug. Supply a default third argument to replace it: `LAG(revenue, 1, 0)` yields `0` instead of `NULL` for the first row.

##### Anatomy

```
LAG( revenue , 1 , 0 ) OVER ( PARTITION BY customer_id ORDER BY order_month )
     └──┬──┘  └┬┘ └┬┘        └────────────┬───────────┘ └────────┬────────┘
     which     │  default    one series per customer      defines "previous":
     column   offset (opt)                                 order matters, ASC = time
```

##### Common pitfall

- **No `ORDER BY` in the window = meaningless offset.** `LAG` over an unordered window returns an arbitrary neighbor. Always order by your time key.
- **Gaps are positional, not calendar-aware.** `LAG` returns the *previous row in the result*, not "one calendar month back." If March is missing, `LAG` on April returns February. If you need strict calendar adjacency, first build a dense month spine (a `dim_date`/calendar) and left-join your data onto it.
- **Growth rate divide-by-zero / NULL:** `(revenue - prev) * 1.0 / prev` is `NULL` when `prev` is `NULL` and errors-or-infinite when `prev` is `0`. Guard with `NULLIF(prev, 0)`.

> **In the warehouse:** identical syntax in Postgres, Snowflake, BigQuery, SQL Server. Only the `FIRST_VALUE`/`LAST_VALUE` frame defaults differ across engines — but plain `LAG`/`LEAD` behave the same everywhere.

**Recap:** `LAG`/`LEAD` pull a value from an earlier/later row in the ordered window — replacing self-joins for deltas and growth; the first row's `LAG` is `NULL` (or your supplied default), and gaps are positional.

#### APPLY (guided)

**Task:** From `monthly_revenue`, compute each customer's **month-over-month revenue delta**. Write to `mom(customer_id, order_month, revenue, prev_revenue, mom_delta)` where `prev_revenue` is the prior month's revenue for that customer (NULL for their first month) and `mom_delta = revenue - prev_revenue`.

**Seed:**

```sql
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
);
```

**Grading asserts:** row `(1,'2026-01')` has `prev_revenue IS NULL` and `mom_delta IS NULL`; `(1,'2026-02')` has `prev_revenue = 100`, `mom_delta = 50`; `(1,'2026-03')` has `mom_delta = -60`; `(2,'2026-02')` has `mom_delta = 60`. Row count = 5.

**Hints:**

1. `LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month)` is the whole trick.
2. Because `order_month` is `'YYYY-MM'` text, it sorts chronologically as text — no casting needed.
3. `mom_delta` is just `revenue - prev_revenue`; leave it `NULL` for the first month (don't default it).

**Reference solution:**

```sql
INSERT INTO mom (customer_id, order_month, revenue, prev_revenue, mom_delta)
SELECT
  customer_id, order_month, revenue,
  LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS prev_revenue,
  revenue - LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_month) AS mom_delta
FROM monthly_revenue;
```

#### PRACTICE (no reference revealed)

**Task:** Build a **churn-signal mart**. From `monthly_revenue`, produce `churn_signal(customer_id, order_month, revenue, prev_revenue, pct_change, churn_flag)` where `pct_change` is the signed month-over-month percentage change rounded to 1 decimal (`NULL` when there is no prior month) and `churn_flag = 1` when the **latest** month for that customer dropped more than 30% versus its previous month, else `0`. Only the customer's **most recent** month should ever carry `churn_flag = 1`.

**Seed:**

```sql
CREATE TABLE monthly_revenue (
  customer_id INTEGER NOT NULL,
  order_month TEXT NOT NULL,
  revenue     INTEGER NOT NULL,
  PRIMARY KEY (customer_id, order_month)
);
INSERT INTO monthly_revenue VALUES
  (1,'2026-01',100),(1,'2026-02',150),(1,'2026-03',90),   -- latest drop 40% -> flag
  (2,'2026-01',200),(2,'2026-02',260),                     -- latest up -> no flag
  (3,'2026-01',500),(3,'2026-02',300),(3,'2026-03',310);   -- latest up vs prev -> no flag
CREATE TABLE churn_signal (
  customer_id INTEGER, order_month TEXT, revenue INTEGER,
  prev_revenue INTEGER, pct_change REAL, churn_flag INTEGER
);
```

**Grading asserts:** customer 1's `2026-03` row has `pct_change = -40.0` and `churn_flag = 1`; customer 3's `2026-02` row has `pct_change = -40.0` but `churn_flag = 0` (it is not the latest month); customer 2 has no `churn_flag = 1`. Exactly **one** row across the table has `churn_flag = 1`.

**Hints:**

1. `pct_change = ROUND((revenue - prev) * 100.0 / NULLIF(prev, 0), 1)`; the `1.0`/`100.0` forces real division and `NULLIF` guards zero.
2. "Latest month per customer" needs a second window — `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_month DESC) = 1` marks it.
3. Compute `prev_revenue`/`pct_change` in one CTE and the latest-month marker in the same or a chained CTE, then set `churn_flag = CASE WHEN is_latest AND pct_change < -30 THEN 1 ELSE 0 END`.
4. Watch the sign: a *drop* is a negative `pct_change`; "more than 30% drop" is `pct_change < -30`.

---

### Lesson `sql-l4-window-frames` — Frames: Running Totals & Moving Averages

- **id:** `sql-l4-window-frames`
- **title:** Frames: Running Totals & Moving Averages
- **summary:** Aggregate over a sliding window of rows with a frame clause.
- **difficulty:** hard
- **estimatedMinutes:** 24
- **skills:** `ROWS BETWEEN`, running total, moving average, `SUM() OVER ()` grand total, percent-of-total

#### READ

`LAG` looks at one neighbor. A **frame** lets an aggregate see a *range* of neighbors: "sum of this row and all rows before it" (running total), "average of this row and the 6 before it" (7-day moving average), or "sum of everything" (grand total for percent-of-total). The frame clause is the third piece of `OVER`, after `PARTITION BY` and `ORDER BY`.

```sql
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
```

Three shapes, one clause:

- **Running total:** `ORDER BY` + `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Accumulates from the first row up to the current one.
- **Moving average:** `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` = current row plus the 6 before it (7 rows). Early rows average over fewer rows — that's correct behavior.
- **Grand total / percent-of-total:** `SUM(revenue) OVER ()` with **no `ORDER BY` and no frame** sums the entire partition (or whole set), so `revenue / SUM(revenue) OVER ()` is each row's share.

##### The subtle default that bites everyone

When you add `ORDER BY` to an aggregate window **without** an explicit frame, SQL supplies a default frame of `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. With ties in the `ORDER BY` key, `RANGE` includes **all peer rows with the same order value**, which can make a "running total" jump. Writing `ROWS BETWEEN …` instead gives you deterministic row-by-row accumulation. **Rule of thumb: for running totals and moving averages, always spell out `ROWS BETWEEN` — don't rely on the default.**

##### Anatomy

```
SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date
                   ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
                   └──────────────────┬──────────────────┘
        frame: lower bound ── upper bound. Bounds: UNBOUNDED PRECEDING,
        n PRECEDING, CURRENT ROW, n FOLLOWING, UNBOUNDED FOLLOWING.
```

##### Common pitfall

- **`ROWS` vs `RANGE`:** `ROWS` counts physical rows; `RANGE` groups by value peers. Use `ROWS` for counts-of-rows windows (moving averages).
- **Integer division:** `revenue / SUM(...)` on integer columns floors to `0`. Multiply by `1.0` (or `CAST(... AS REAL)`) for a real fraction.
- **Grand total needs empty `OVER ()`:** the moment you add `ORDER BY`, it becomes a running total, not a grand total.

> **In the warehouse:** frame syntax is ANSI-standard and identical across Postgres/Snowflake/BigQuery. BigQuery spells unbounded frames the same way. No divergence to memorize here.

**Recap:** the frame clause (`ROWS BETWEEN …`) turns a window aggregate into a running total (`UNBOUNDED PRECEDING`→`CURRENT ROW`), a moving average (`n PRECEDING`→`CURRENT ROW`), or — with an empty `OVER ()` — a grand total for percent-of-total; always spell out `ROWS` for row-count windows.

#### APPLY (guided)

**Task:** Add a **running lifetime-revenue** column per customer. From `daily_revenue`, write `lifetime(customer_id, order_date, revenue, lifetime_revenue)` where `lifetime_revenue` is the cumulative sum of `revenue` for that customer up to and including the current date, ordered by date.

**Seed:**

```sql
CREATE TABLE daily_revenue (
  customer_id INTEGER NOT NULL,
  order_date  TEXT NOT NULL,       -- 'YYYY-MM-DD'
  revenue     INTEGER NOT NULL,
  PRIMARY KEY (customer_id, order_date)
);
INSERT INTO daily_revenue VALUES
  (1,'2026-01-01',10),(1,'2026-01-02',20),(1,'2026-01-03',5),
  (2,'2026-01-01',100),(2,'2026-01-05',50);
CREATE TABLE lifetime (
  customer_id INTEGER, order_date TEXT, revenue INTEGER, lifetime_revenue INTEGER
);
```

**Grading asserts:** customer 1's three rows have `lifetime_revenue` `10, 30, 35`; customer 2's rows have `100, 150`. Row count = 5.

**Hints:**

1. `SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`.
2. Spell out the `ROWS BETWEEN` frame — don't rely on the default.
3. Partition by customer so each customer's total restarts.

**Reference solution:**

```sql
INSERT INTO lifetime (customer_id, order_date, revenue, lifetime_revenue)
SELECT
  customer_id, order_date, revenue,
  SUM(revenue) OVER (
    PARTITION BY customer_id
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS lifetime_revenue
FROM daily_revenue;
```

#### PRACTICE (no reference revealed)

**Task:** Ship a **customer revenue-trend mart** in one pass. From `daily_revenue`, produce `trend(customer_id, order_date, revenue, running_total, moving_avg_3, pct_of_total)` where, per customer ordered by date: `running_total` is the cumulative revenue; `moving_avg_3` is the average of the current row and the **2** prior rows (3-row window), rounded to 2 decimals; and `pct_of_total` is the row's revenue as a percentage of that **customer's** overall total revenue (across all their days), rounded to 1 decimal.

**Seed:**

```sql
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
);
```

**Grading asserts:** customer 1 `running_total` = `10,30,60,100`; `moving_avg_3` on `2026-01-04` = `(20+30+40)/3 = 30.0`; `moving_avg_3` on `2026-01-02` = `(10+20)/2 = 15.0` (partial window over 2 rows); `pct_of_total` on `2026-01-04` = `40/100*100 = 40.0`. Customer 2 each row `pct_of_total = 50.0`. Row count = 6.

**Hints:**

1. Three windows over the same `PARTITION BY customer_id ORDER BY order_date`: running total (`UNBOUNDED PRECEDING`), moving avg (`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`), and the per-customer grand total.
2. The per-customer total is `SUM(revenue) OVER (PARTITION BY customer_id)` — partition but **no** `ORDER BY`/frame, so it spans all the customer's rows.
3. `pct_of_total = ROUND(revenue * 100.0 / SUM(revenue) OVER (PARTITION BY customer_id), 1)`.
4. Force real division with `* 1.0` / `* 100.0` and round as specified.

---

## Module 4.2 — Recursive CTEs

Some data is a **tree**: an org chart where each employee points at a manager, or a category taxonomy where each node points at a parent. A plain join can walk one level; walking to arbitrary depth needs recursion.

---

### Lesson `sql-l4-recursive-cte` — Recursive CTEs for Hierarchies

- **id:** `sql-l4-recursive-cte`
- **title:** Recursive CTEs for Hierarchies
- **summary:** Walk self-referencing trees like org charts and category paths.
- **difficulty:** hard
- **estimatedMinutes:** 24
- **skills:** `WITH RECURSIVE`, anchor + recursive member, `UNION ALL`, termination guard, depth tracking

#### READ

A `categories` table where each row has a `parent_id` pointing at another row in the *same* table can nest arbitrarily deep: `Electronics → Audio → Headphones → Over-ear`. You can't write "join N times" when N is unknown at query time. A **recursive CTE** repeatedly applies a query to its own output until nothing new is produced.

A recursive CTE has three parts:

```sql
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
```

- **Anchor** runs once, seeding the working set (here, top-level categories at depth 0).
- **Recursive member** runs repeatedly: each pass joins the base table to the rows produced by the *previous* pass, emitting the children one level deeper. `depth + 1` tracks how far down you are.
- **Termination** is automatic: when a pass produces zero new rows (you've hit the leaves), recursion stops. A well-formed tree terminates on its own.

##### Building a breadcrumb path

Carry an accumulating string down the recursion to build `Electronics > Audio > Headphones`:

```sql
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
```

Each level appends its own name to the parent's path.

##### Common pitfall

- **Type mismatch between anchor and recursive member.** The two `SELECT`s must have the **same number and types** of columns. If the anchor's `path` is declared narrower than the concatenated recursive `path`, some engines truncate. Seed the anchor with the same expression type.
- **Infinite loops on dirty data.** If the data has a cycle (A's parent is B, B's parent is A), recursion never terminates. Guard with a depth cap (`WHERE t.depth < 100` in the recursive member) or track a visited-path and stop on repeats.
- **`UNION` vs `UNION ALL`.** Use `UNION ALL` — it's cheaper and correct for a tree. `UNION` would dedupe every pass, which is wasteful and can mask cycles.

> **In the warehouse:** Postgres, SQLite, Snowflake, BigQuery all require the `RECURSIVE` keyword; **SQL Server omits it** — you write plain `WITH tree AS (…)` for a recursive CTE there. The three-part structure is identical everywhere.

**Recap:** `WITH RECURSIVE` = anchor (roots) `UNION ALL` recursive member (join CTE back to the table for the next level), auto-terminating when no new rows appear; track `depth` and accumulate a `path` string for breadcrumbs, and cap depth to survive cyclic dirty data.

#### APPLY (guided)

**Task:** Traverse an `employees` → `manager` hierarchy and emit each employee's **depth** from the top. Write `org_depth(emp_id, name, depth)` where the CEO (no manager) is depth 0, their direct reports are depth 1, and so on.

**Seed:**

```sql
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
CREATE TABLE org_depth (emp_id INTEGER, name TEXT, depth INTEGER);
```

**Grading asserts:** `Ada` depth 0; `Ben`,`Cara` depth 1; `Dan`,`Eve` depth 2; `Finn` depth 3. Row count = 6.

**Hints:**

1. Anchor: `WHERE manager_id IS NULL` at `depth 0`.
2. Recursive member: `JOIN org_tree t ON e.manager_id = t.emp_id`, emitting `t.depth + 1`.
3. Use `UNION ALL`, then `INSERT INTO org_depth SELECT emp_id, name, depth FROM org_tree`.

**Reference solution:**

```sql
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
SELECT emp_id, name, depth FROM org_tree;
```

#### PRACTICE (no reference revealed)

**Task:** From a self-referencing `categories` table, build a **catalog mart** `category_path(category_id, name, breadcrumb, depth, root_name)` where `breadcrumb` is the full path from the root joined by `' > '` (e.g. `Electronics > Audio > Headphones`), `depth` is the level (root = 0), and `root_name` is the top-level ancestor's name. Guard against a cyclic row in the data by capping depth at 20.

**Seed:**

```sql
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
CREATE TABLE category_path (
  category_id INTEGER, name TEXT, breadcrumb TEXT, depth INTEGER, root_name TEXT
);
```

**Grading asserts:** `Over-ear` → `breadcrumb = 'Electronics > Audio > Headphones > Over-ear'`, `depth = 3`, `root_name = 'Electronics'`; `Kitchen` → `'Home > Kitchen'`, `depth = 1`, `root_name = 'Home'`; `Electronics` → `breadcrumb = 'Electronics'`, `depth = 0`, `root_name = 'Electronics'`. Row count = 8. No infinite loop even if a cyclic row is added.

**Hints:**

1. Seed both `breadcrumb` (`= name`) and `root_name` (`= name`) in the anchor so they propagate down unchanged for `root_name`.
2. In the recursive member, `breadcrumb = t.breadcrumb || ' > ' || c.name` but `root_name = t.root_name` (carry the root down, don't recompute it).
3. Add `WHERE t.depth < 20` to the recursive member's join as the cycle guard.
4. `UNION ALL`, then insert all columns.

---

## Module 4.3 — Warehouse Modeling and History

You designed a star schema in Level 3. Now you **load** it — in the right order, with surrogate keys minted in the dimensions and looked up in the fact — and you learn how dimensions change over time (SCD Type 1 and Type 2). SCD Type 2 is the single most-asked warehouse-modeling interview topic.

---

### Lesson `sql-l4-star-build` — Building a Star Schema Load

- **id:** `sql-l4-star-build`
- **title:** Building a Star Schema Load
- **summary:** Populate dimensions with surrogate keys, then load a fact that references them.
- **difficulty:** hard
- **estimatedMinutes:** 24
- **skills:** dimension load, surrogate-key assignment, fact load, key lookup join

#### READ

A star schema's fact table stores **surrogate keys** (small integers like `product_key`), not business/natural keys (`sku`, `email`). That keeps the fact narrow and decouples it from messy source keys. But it forces a strict **load order**:

1. **Load the dimensions first.** Each dimension row gets a surrogate key (an `INTEGER PRIMARY KEY` in SQLite auto-assigns one).
2. **Load the fact second**, and for each fact row, **look up** the surrogate key by joining the staging row's *natural* key to the dimension.

If you load the fact first, there are no surrogate keys to point at. If a fact's natural key has no matching dimension row, you get an **orphan fact** — the join drops it (inner join) or produces a `NULL` key (left join). A correct load has **zero orphan facts**.

##### Worked pattern

```sql
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
```

The `JOIN … ON dp.sku = s.sku` is the **key lookup**: it swaps the source `sku` for the warehouse `product_key`.

##### Common pitfall

- **Inner join silently drops orphans.** An inner join *is* the right choice when the rule is "every fact must match a dimension," but you should **assert** the dropped count is zero rather than silently lose rows. A common defense is loading an `UNKNOWN` dimension member (surrogate key `-1`) and left-joining with `COALESCE(dp.product_key, -1)` so orphans are counted, not vanished.
- **Duplicate natural keys in the dimension.** If `stg_products` has the same `sku` twice, `INSERT … SELECT DISTINCT` or a dedup step is required, or the lookup join fans out and inflates the fact.

> **In the warehouse:** Snowflake/BigQuery use `IDENTITY`/`AUTOINCREMENT` or sequences for surrogate keys and often generate them with `MERGE`. The dims-then-fact-with-lookup pattern is universal.

**Recap:** load dims first (mint surrogate keys), then load the fact by joining each staging row's natural key to its dimension to fetch the surrogate key; a correct load produces zero orphan facts — assert it rather than trusting the inner join.

#### APPLY (guided)

**Task:** Load `dim_customer` with surrogate keys from staging, then load `fact_sales` by looking those keys up. Given `stg_customers` and `stg_sales`, populate `dim_customer(customer_key, email, name)` (surrogate `customer_key`) and `fact_sales(sale_id, customer_key, amount)`.

**Seed:**

```sql
CREATE TABLE stg_customers (email TEXT, name TEXT);
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
);
```

**Grading asserts:** `dim_customer` has 3 rows with distinct `customer_key`s; `fact_sales` has 3 rows; every `fact_sales.customer_key` matches a `dim_customer` row (zero orphans); the two sales for `a@x.com` share the same `customer_key`.

**Hints:**

1. Insert dims with `INSERT INTO dim_customer (email, name) SELECT email, name FROM stg_customers;` — the `customer_key` auto-fills.
2. Load the fact with a join: `SELECT dc.customer_key, s.amount FROM stg_sales s JOIN dim_customer dc ON dc.email = s.email`.
3. Don't insert `customer_key` values manually into the fact — always look them up.

**Reference solution:**

```sql
INSERT INTO dim_customer (email, name)
SELECT email, name FROM stg_customers;

INSERT INTO fact_sales (customer_key, amount)
SELECT dc.customer_key, s.amount
FROM stg_sales s
JOIN dim_customer dc ON dc.email = s.email;
```

#### PRACTICE (no reference revealed)

**Task:** Build a **full star load** from staging with three dimensions and a line-item fact. From `stg_orders` (one row per order line, carrying natural keys `email`, `sku`, and `order_date`), populate `dim_customer(customer_key, email, name)`, `dim_product(product_key, sku, product_name)`, `dim_date(date_key, full_date)`, and `fact_order_items(item_key, customer_key, product_key, date_key, qty, revenue)` — every fact row referencing all three dimensions by surrogate key, with **zero orphan facts**. Deduplicate each dimension by its natural key.

**Seed:**

```sql
CREATE TABLE stg_orders (
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
);
```

**Grading asserts:** `dim_customer` = 2 rows, `dim_product` = 2 rows, `dim_date` = 2 rows (deduped natural keys); `fact_order_items` = 4 rows; every fact row's three FKs resolve to a real dimension row (three anti-join assertions each return zero); total `revenue` in the fact = 75.

**Hints:**

1. Load each dimension with `INSERT … SELECT DISTINCT natural_key, attr FROM stg_orders` — `DISTINCT` collapses the repeated natural keys.
2. Load the fact by joining staging to **all three** dimensions on their natural keys to fetch all three surrogate keys in one `SELECT`.
3. Order matters: all three dims before the fact.
4. To be sure of zero orphans, an inner join to each dim is enough here because every staging natural key appears in its dim — but verify your `DISTINCT` didn't drop a needed value.

---

### Lesson `sql-l4-scd-type1` — Slowly Changing Dimensions — Type 1

- **id:** `sql-l4-scd-type1`
- **title:** Slowly Changing Dimensions — Type 1
- **summary:** Overwrite a changed attribute in place with no history.
- **difficulty:** medium
- **estimatedMinutes:** 20
- **skills:** SCD Type 1, in-place `UPDATE`, correction semantics

#### READ

A **dimension** describes an entity (customer, product) and its attributes drift over time — a customer moves city, a product is renamed. How you handle that drift is the "Slowly Changing Dimension" (SCD) question. **Type 1** is the simplest: **overwrite the old value in place, keep no history.** The row count never changes; you just `UPDATE` the changed columns to their new values.

Type 1 is the right choice when the old value was **wrong** — a typo, a misspelled city, a data-entry error — and nobody ever needs to know it existed. You don't want history of a mistake; you want it corrected everywhere retroactively.

```sql
-- fresh source dump arrives in stg_customer; apply Type 1 overwrite
UPDATE dim_customer
SET name = (SELECT s.name FROM stg_customer s WHERE s.email = dim_customer.email),
    city = (SELECT s.city FROM stg_customer s WHERE s.email = dim_customer.email)
WHERE email IN (SELECT email FROM stg_customer);
```

A cleaner, portable form uses `INSERT … ON CONFLICT DO UPDATE` (an upsert) so new customers are inserted and existing ones overwritten in one statement — you'll meet that in Module 4.4. For now, the essence is: **match on the natural key, overwrite the attributes, add no rows for changes.**

##### Common pitfall

- **Type 1 destroys the ability to answer "what was the value on date X."** If finance ever needs history (revenue attributed to the customer's city *at the time of sale*), Type 1 is wrong — you need Type 2 (next lesson). Choosing Type 1 is a **business decision**, not a default.
- **Correlated-subquery `UPDATE` gotcha:** the `WHERE email IN (SELECT …)` guard matters — without it, customers absent from the new dump get their attributes set to `NULL` by the subquery.

> **In the warehouse:** Snowflake/BigQuery express Type 1 as a `MERGE … WHEN MATCHED THEN UPDATE`. SQLite/Postgres use `INSERT … ON CONFLICT DO UPDATE` or a plain `UPDATE`. Same semantics: overwrite, no history.

**Recap:** SCD Type 1 overwrites changed attributes in place (match on natural key, `UPDATE`, zero new rows) — correct for fixing errors where no history is wanted; if you need "value as of date X," use Type 2 instead.

#### APPLY (guided)

**Task:** Apply a **Type 1 update** to correct a customer's misspelled city. `dim_customer` holds the current dimension; `stg_customer` holds a corrected dump. Overwrite `name` and `city` in `dim_customer` for every email present in the staging dump, adding no new rows.

**Seed:**

```sql
CREATE TABLE dim_customer (
  customer_key INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name  TEXT,
  city  TEXT
);
INSERT INTO dim_customer (email, name, city) VALUES
  ('a@x.com','Ada','Lundon'),   -- misspelled
  ('b@x.com','Ben','Paris');

CREATE TABLE stg_customer (email TEXT, name TEXT, city TEXT);
INSERT INTO stg_customer VALUES
  ('a@x.com','Ada','London'),   -- corrected spelling
  ('b@x.com','Ben','Paris');
```

**Grading asserts:** `dim_customer` still has exactly **2 rows** (no history rows added); `a@x.com`'s city is now `'London'`; `b@x.com` unchanged; `customer_key`s unchanged.

**Hints:**

1. A single `UPDATE dim_customer SET … WHERE email IN (SELECT email FROM stg_customer)`.
2. Pull the new `city`/`name` with correlated subqueries matched on `email`.
3. Don't `INSERT` anything — Type 1 is overwrite-only.

**Reference solution:**

```sql
UPDATE dim_customer
SET name = (SELECT s.name FROM stg_customer s WHERE s.email = dim_customer.email),
    city = (SELECT s.city FROM stg_customer s WHERE s.email = dim_customer.email)
WHERE email IN (SELECT email FROM stg_customer);
```

#### PRACTICE (no reference revealed)

**Task:** Write a **Type 1 apply step** that overwrites changed attributes from a fresh source dump **and** inserts brand-new customers, while asserting existing customers get no duplicate rows. Given `dim_customer` and a `stg_customer` dump that contains updates to existing customers **and** new customers not yet in the dimension, produce a `dim_customer` where existing rows are overwritten and new customers are appended — one row per email.

**Seed:**

```sql
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
  ('b@x.com','Ben','Paris','gold'),        -- tier upgraded
  ('c@x.com','Cara','Berlin','bronze');    -- brand new customer
```

**Grading asserts:** `dim_customer` has exactly **3 rows** (one per email); `a@x.com` city = `'London'`; `b@x.com` tier = `'gold'`; `c@x.com` exists with a fresh `customer_key`; no email appears twice. Running the script's apply step **twice** still leaves exactly 3 rows (idempotent Type 1).

**Hints:**

1. The clean one-statement form is `INSERT INTO dim_customer (email,name,city,tier) SELECT email,name,city,tier FROM stg_customer WHERE true ON CONFLICT(email) DO UPDATE SET name=excluded.name, city=excluded.city, tier=excluded.tier;` — `email` must be `UNIQUE` (it is).
2. `excluded.<col>` refers to the row that would have been inserted — that's the new source value.
3. The `ON CONFLICT` upsert makes this idempotent for free: re-running overwrites with the same values and inserts nothing new.
4. If you split it into `UPDATE` + `INSERT … WHERE email NOT IN (SELECT email FROM dim_customer)`, make sure the `INSERT` runs after the `UPDATE` and only for genuinely new emails.

---

### Lesson `sql-l4-scd-type2` — Slowly Changing Dimensions — Type 2

- **id:** `sql-l4-scd-type2`
- **title:** Slowly Changing Dimensions — Type 2
- **summary:** Preserve history by expiring old rows and inserting new versions.
- **difficulty:** hard
- **estimatedMinutes:** 28
- **skills:** SCD Type 2, `effective_from`/`effective_to`, `is_current` flag, new surrogate per version

#### READ

Type 1 overwrites and forgets. But finance often needs to attribute a sale to the customer's attributes **as they were on the sale date** — if Ada lived in London in January and Berlin in March, a January order must stay attributed to London. That requires keeping **history**, and that's **SCD Type 2**: instead of overwriting, you **expire the old row and insert a new version** with a fresh surrogate key. The dimension grows one row per change, and each row carries a **validity window**.

Three columns make Type 2 work:

- **`effective_from`** — the date this version became true.
- **`effective_to`** — the date it stopped being true (a far-future sentinel like `'9999-12-31'` while still current).
- **`is_current`** — a `1`/`0` flag; exactly **one** current row per natural key.

Each version also gets its **own new surrogate key**, so a fact table can point at the specific version valid *as of* the event date. That's the whole point: `fact.customer_key` references the version that was current when the sale happened, not the latest one.

##### The apply algorithm

When a fresh source dump arrives, for each natural key whose tracked attributes **changed**:

1. **Expire the current row:** set `effective_to = <change_date>` and `is_current = 0` on the row where `is_current = 1`.
2. **Insert a new version:** the new attribute values, `effective_from = <change_date>`, `effective_to = '9999-12-31'`, `is_current = 1`, a fresh surrogate key.

Unchanged keys are left alone; brand-new keys get a single current row.

##### Worked example

```sql
-- Ada moves from London to Berlin, effective 2026-03-01.

-- Step 1: expire the old current row
UPDATE dim_customer
SET effective_to = '2026-03-01', is_current = 0
WHERE email = 'a@x.com' AND is_current = 1;

-- Step 2: insert the new version with a fresh surrogate key
INSERT INTO dim_customer (email, name, city, effective_from, effective_to, is_current)
VALUES ('a@x.com', 'Ada', 'Berlin', '2026-03-01', '9999-12-31', 1);
```

After this, `dim_customer` has two rows for Ada: `[London, 2026-01-01 → 2026-03-01, is_current=0]` and `[Berlin, 2026-03-01 → 9999-12-31, is_current=1]`. A fact row dated `2026-02-10` joins to the **London** version because `2026-02-10` falls in `[effective_from, effective_to)`; a fact dated `2026-03-15` joins to **Berlin**.

##### Anatomy of the as-of join (how facts use Type 2)

```sql
SELECT f.sale_id, d.city
FROM fact_sales f
JOIN dim_customer d
  ON d.email = f.email
 AND f.sale_date >= d.effective_from
 AND f.sale_date <  d.effective_to;     -- half-open window: [from, to)
```

The `>= effective_from AND < effective_to` is the **as-of** predicate — it selects the one version valid on the sale date. Use a **half-open interval** (`< effective_to`, not `<=`) so the boundary date belongs to exactly one version and rows never double-count.

##### Common pitfall

- **More than one `is_current = 1` per key** is the #1 Type 2 bug — it means an update ran the insert without expiring the old row, and every downstream `WHERE is_current = 1` now doubles. Graders assert exactly one current row per key.
- **Overlapping windows** (old row's `effective_to` ≠ new row's `effective_from`) make the as-of join match two versions or none. Set the expiring row's `effective_to` **equal** to the new row's `effective_from`.
- **Closed intervals double-count.** If both versions include the boundary date (`<=`), a sale on that exact day joins twice. Always half-open.
- **Expiring on the wrong key.** `WHERE email = ? AND is_current = 1` — forgetting `is_current = 1` expires *all* historical versions.

> **In the warehouse:** Snowflake/BigQuery implement the whole Type 2 apply as a single `MERGE` with `WHEN MATCHED THEN UPDATE` (expire) plus an `INSERT` for the new version, often generated by dbt's snapshot macro. The two-step expire-then-insert logic is identical; only the statement packaging differs. `TRUE`/`FALSE` are real booleans there; in SQLite `is_current` is `1`/`0`.

**Recap:** SCD Type 2 keeps history by expiring the old row (`effective_to = change_date`, `is_current = 0`) and inserting a new version (fresh surrogate key, `effective_from = change_date`, `effective_to = '9999-12-31'`, `is_current = 1`); facts join to the version valid on the event date via a half-open `[effective_from, effective_to)` as-of predicate, and there must be exactly one `is_current = 1` per natural key.

#### APPLY (guided)

**Task:** Close the current row and open a new version when a customer changes city. `dim_customer` holds one current row for `a@x.com` (city London, effective `2026-01-01`). A change arrives: as of `2026-03-01`, Ada's city is Berlin. Apply the Type 2 change: expire the London row and insert a Berlin version.

**Seed:**

```sql
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
VALUES ('a@x.com','Ada','London','2026-01-01','9999-12-31',1);
```

**Task:** apply the change to Berlin effective `2026-03-01`.

**Grading asserts:** `dim_customer` has **2 rows** for `a@x.com`; exactly **one** has `is_current = 1` and it is the Berlin row with `effective_from = '2026-03-01'` and `effective_to = '9999-12-31'`; the London row has `is_current = 0` and `effective_to = '2026-03-01'`; the two versions' windows meet exactly (no gap, no overlap).

**Hints:**

1. Two statements: an `UPDATE` to expire, then an `INSERT` for the new version.
2. Expire with `SET effective_to = '2026-03-01', is_current = 0 WHERE email = 'a@x.com' AND is_current = 1`.
3. Insert the Berlin row with `effective_from = '2026-03-01'`, `effective_to = '9999-12-31'`, `is_current = 1`.
4. Set the old `effective_to` equal to the new `effective_from` so the windows are contiguous.

**Reference solution:**

```sql
UPDATE dim_customer
SET effective_to = '2026-03-01', is_current = 0
WHERE email = 'a@x.com' AND is_current = 1;

INSERT INTO dim_customer (email, name, city, effective_from, effective_to, is_current)
VALUES ('a@x.com', 'Ada', 'Berlin', '2026-03-01', '9999-12-31', 1);
```

#### PRACTICE (no reference revealed)

**Task:** Build a **general Type 2 apply step** driven by a fresh source dump, not a single hand-coded change. `dim_customer` holds the current dimension (one `is_current = 1` row per email). `stg_customer` is today's dump with a `snapshot_date`. For each email whose tracked attribute (`city`) **differs** from its current dimension row: expire the current row (`effective_to = snapshot_date`, `is_current = 0`) and insert a new version (`effective_from = snapshot_date`, `effective_to = '9999-12-31'`, `is_current = 1`). Customers whose city is unchanged get **no** new row. Brand-new emails get a single current version.

**Seed:**

```sql
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

CREATE TABLE stg_customer (email TEXT, name TEXT, city TEXT, snapshot_date TEXT);
INSERT INTO stg_customer VALUES
  ('a@x.com','Ada','Berlin','2026-03-01'),   -- changed: London -> Berlin
  ('b@x.com','Ben','Paris', '2026-03-01'),   -- unchanged
  ('d@x.com','Dan','Oslo',  '2026-03-01');   -- brand new
```

**Grading asserts:** after the apply, exactly **one** `is_current = 1` row per email (`a,b,c,d`); `a@x.com` has 2 rows (London expired at `2026-03-01`, Berlin current); `b@x.com` still has 1 row (unchanged); `c@x.com` still has 1 row (absent from today's dump — left as-is); `d@x.com` has 1 current row with `effective_from = '2026-03-01'`. No email has overlapping windows. Running the apply step **twice** produces the identical table (idempotent: the second run sees no city differences and inserts nothing).

**Hints:**

1. Identify **changed** emails first: join `stg_customer` to the current dimension row (`is_current = 1`) on `email` and keep where `stg.city <> dim.city`.
2. Expire step: `UPDATE dim_customer SET effective_to = <snapshot>, is_current = 0 WHERE is_current = 1 AND email IN (<changed emails>)`.
3. Insert step: insert new versions for changed emails **and** brand-new emails (emails in staging with no current dim row). Both get `is_current = 1`, `effective_from = snapshot_date`, `effective_to = '9999-12-31'`.
4. Idempotency is the trap: after the first run the dimension's current city already equals staging, so the "changed" set is empty on the second run — make sure your change-detection compares against the **current** row, and expire before you insert (or compute the changed-set into a temp table first so the insert doesn't re-detect its own new rows).

---

## Module 4.4 — Pipeline Correctness

A load that works once but corrupts data when re-run is not production-grade. This module builds the two habits that make a loader safe: **deduplication** (one row per business key from a dirty source) and **idempotency** (re-running produces the same result, no duplicated rows).

---

### Lesson `sql-l4-dedup` — Deduplication

- **id:** `sql-l4-dedup`
- **title:** Deduplication
- **summary:** Keep exactly one row per business key from a dirty source.
- **difficulty:** medium
- **estimatedMinutes:** 20
- **skills:** `ROW_NUMBER()` dedup, partition-by-key, keep-rank-1 subquery, `QUALIFY` note

#### READ

Source feeds are dirty: a daily customer dump often contains the same `email` several times — an old record and one or more updates. Before you load it, you must reduce it to **one row per business key**, keeping the **right** one (usually the most recently updated). The portable pattern is `ROW_NUMBER` (from Module 4.1) plus a wrapping filter:

```sql
SELECT * FROM (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY email          -- the business key
           ORDER BY updated_at DESC     -- newest wins
         ) AS rn
  FROM stg_customer
) ranked
WHERE rn = 1;                          -- keep only the freshest row per email
```

`PARTITION BY email` groups the duplicates; `ORDER BY updated_at DESC` puts the freshest first; `WHERE rn = 1` keeps it. Because `ROW_NUMBER` assigns **unique** ranks, you get exactly one row per key — never zero, never two.

##### Common pitfall

- **Ties in the `ORDER BY` make the winner nondeterministic.** If two rows share the same `updated_at`, add a deterministic tiebreaker (`ORDER BY updated_at DESC, id DESC`) so the same row wins every run — critical for idempotency.
- **`DISTINCT` is not dedup-by-key.** `SELECT DISTINCT` removes rows that are identical across *all* columns; it will **not** collapse two rows with the same `email` but different `updated_at`. Use `ROW_NUMBER` when "duplicate" means "same key, possibly different attributes."
- **Filtering `rn` inline fails.** You can't write `WHERE ROW_NUMBER() OVER(...) = 1`; wrap in a subquery/CTE.

> **In the warehouse:** Snowflake and BigQuery let you drop the subquery: `… QUALIFY ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) = 1`. SQLite and Postgres have no `QUALIFY` — wrap in a subquery/CTE as above.

**Recap:** dedup to one row per business key with `ROW_NUMBER() OVER (PARTITION BY key ORDER BY updated_at DESC)` then keep `rn = 1` in a wrapping query; add a tiebreaker for determinism, and reach for this (not `DISTINCT`) whenever "duplicate" means same key with differing attributes.

#### APPLY (guided)

**Task:** Reduce a source with duplicate emails to **one latest row per email**. From `stg_customer` (with an `updated_at`), write the deduped rows into `clean_customer(email, name, city, updated_at)` keeping the most recently updated row per email.

**Seed:**

```sql
CREATE TABLE stg_customer (
  email TEXT, name TEXT, city TEXT, updated_at TEXT
);
INSERT INTO stg_customer VALUES
  ('a@x.com','Ada','London','2026-01-01'),
  ('a@x.com','Ada','Berlin','2026-03-01'),   -- newer
  ('b@x.com','Ben','Paris','2026-02-01');
CREATE TABLE clean_customer (email TEXT, name TEXT, city TEXT, updated_at TEXT);
```

**Grading asserts:** `clean_customer` has **2 rows**; `a@x.com` has `city = 'Berlin'` and `updated_at = '2026-03-01'` (the newer row won); `b@x.com` present once; zero duplicate emails.

**Hints:**

1. `ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC)` then keep `rn = 1`.
2. Put the window in a CTE, then `INSERT INTO clean_customer SELECT email,name,city,updated_at FROM ranked WHERE rn = 1`.
3. `updated_at` is ISO text, so `DESC` sorts newest-first correctly.

**Reference solution:**

```sql
INSERT INTO clean_customer (email, name, city, updated_at)
WITH ranked AS (
  SELECT email, name, city, updated_at,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) AS rn
  FROM stg_customer
)
SELECT email, name, city, updated_at
FROM ranked
WHERE rn = 1;
```

#### PRACTICE (no reference revealed)

**Task:** Deduplicate a **messy daily customer dump** to one current row per natural key and prove zero duplicates. The dump `raw_customer` has duplicate `customer_code`s with differing `updated_at`, some rows sharing the **same** `updated_at` (needs a deterministic tiebreaker), and some rows with a `NULL` `updated_at` that must lose to any non-null timestamp. Produce `dedup_customer(customer_code, email, updated_at, source_row_id)` with exactly one row per `customer_code`: the row with the latest non-null `updated_at`, tiebroken by the highest `source_row_id`.

**Seed:**

```sql
CREATE TABLE raw_customer (
  source_row_id INTEGER PRIMARY KEY,
  customer_code TEXT,
  email         TEXT,
  updated_at    TEXT           -- ISO date or NULL
);
INSERT INTO raw_customer (customer_code, email, updated_at) VALUES
  ('C1','a@x.com','2026-01-01'),
  ('C1','a2@x.com','2026-03-01'),
  ('C1','a3@x.com','2026-03-01'),   -- ties on date with the row above
  ('C2','b@x.com', NULL),
  ('C2','b2@x.com','2026-02-01'),   -- non-null must beat the NULL
  ('C3','c@x.com', NULL);           -- only a NULL exists -> still keep one row
CREATE TABLE dedup_customer (
  customer_code TEXT, email TEXT, updated_at TEXT, source_row_id INTEGER
);
```

**Grading asserts:** `dedup_customer` has **3 rows** (one per code); `C1` keeps the row with `updated_at = '2026-03-01'` and the **higher** `source_row_id` of the two tied rows; `C2` keeps `b2@x.com` (`2026-02-01`, not the NULL); `C3` keeps its single NULL row; zero duplicate `customer_code`s (an assertion `GROUP BY customer_code HAVING COUNT(*) > 1` returns no rows).

**Hints:**

1. Order so nulls lose: `ORDER BY updated_at DESC` in SQLite puts `NULL` **last** under `DESC`? — verify: SQLite sorts `NULL` as lowest, so `DESC` yields non-null first, NULL last. That's exactly what you want. (This is a dialect detail — a warehouse callout: some engines need explicit `NULLS LAST`.)
2. Add the tiebreaker: `ORDER BY updated_at DESC, source_row_id DESC`.
3. `PARTITION BY customer_code`, keep `rn = 1` from a wrapping CTE.
4. `C3` has only a NULL row — `ROW_NUMBER` still assigns it rank 1, so it survives; don't filter out NULL timestamps.

---

### Lesson `sql-l4-idempotent-merge` — Idempotent Loads: Upsert & MERGE

- **id:** `sql-l4-idempotent-merge`
- **title:** Idempotent Loads: Upsert & MERGE
- **summary:** Make a re-run produce the same result — no duplicated rows.
- **difficulty:** hard
- **estimatedMinutes:** 26
- **skills:** idempotency, `INSERT … ON CONFLICT` upsert, `MERGE` concept, unique_key, high-water mark

#### READ

Pipelines fail and get re-run. A backfill reprocesses last week. The same daily file lands twice. If your loader is a blind `INSERT`, every re-run **duplicates rows** — the cardinal data-engineering sin. A loader is **idempotent** when running it N times leaves the target in the same state as running it once. The test is blunt and it's exactly what Level 4 graders do: **run the script twice, assert the row count is identical.**

The tool is an **upsert**: insert the row if its key is new, otherwise update the existing row. SQLite (and Postgres) spell it `INSERT … ON CONFLICT`:

```sql
INSERT INTO dim_customer (email, name, city)
SELECT email, name, city FROM stg_customer
WHERE true
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  city = excluded.city;
```

- **`ON CONFLICT(email)`** names the unique key that defines "same row." (`email` must have a `UNIQUE`/`PRIMARY KEY` constraint.)
- **`DO UPDATE SET … = excluded.<col>`** overwrites with the incoming values; `excluded` is the row that *would have* been inserted.
- Run it twice: the first run inserts, the second run hits the conflict and updates to the same values — **zero new rows.** Idempotent.

Use `DO NOTHING` instead of `DO UPDATE` when you only want inserts-if-absent and never want to touch existing rows.

##### Incremental loads with a high-water mark

For large sources you don't reprocess everything — you load only rows newer than the last successful load, tracked as a **high-water mark**:

```sql
INSERT INTO fact_events (event_id, payload, event_ts)
SELECT event_id, payload, event_ts
FROM stg_events
WHERE event_ts > (SELECT COALESCE(MAX(event_ts), '1970-01-01') FROM fact_events)
ON CONFLICT(event_id) DO NOTHING;
```

The `WHERE event_ts > MAX(...)` skips already-loaded rows; the `ON CONFLICT DO NOTHING` is the safety net for overlap at the boundary. Together they're both efficient **and** idempotent.

##### Common pitfall

- **No unique constraint = no conflict = duplicates.** `ON CONFLICT(email)` only fires if `email` is actually declared `UNIQUE`/`PRIMARY KEY`. Without the constraint, the insert just appends. Idempotency is enforced by the **schema**, not the query.
- **`INSERT … SELECT … ON CONFLICT` parse quirk:** SQLite needs the `WHERE true` (or any `WHERE`) before `ON CONFLICT` when the source is a `SELECT`, to disambiguate the grammar. A bare `INSERT … SELECT … ON CONFLICT …` can fail to parse.
- **Upserting the wrong key.** Conflict on a non-business column (e.g. surrogate key) never matches the natural duplicate, so re-runs still duplicate. Conflict on the **natural/business key**.

> **In the warehouse:** Snowflake/BigQuery/SQL Server use `MERGE INTO target USING source ON <key> WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT`. SQLite/Postgres use `INSERT … ON CONFLICT`. Same idea, different keyword — and interviewers expect you to name both.

**Recap:** an idempotent loader survives re-runs without duplicating rows; achieve it with `INSERT … ON CONFLICT(<business key>) DO UPDATE/NOTHING` backed by a real `UNIQUE` constraint, optionally scoped by a high-water-mark `WHERE`, and prove it with the "run twice, same count" test (warehouses spell it `MERGE`).

#### APPLY (guided)

**Task:** Convert a blind `INSERT` into an **`INSERT … ON CONFLICT` upsert** keyed on a unique column. `dim_product` has `sku` declared `UNIQUE`. Load `stg_product` into it so that new SKUs insert, existing SKUs update their `name`/`price`, and re-running the load adds no rows.

**Seed:**

```sql
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
  ('SKU1','Widget Pro',12),   -- update existing
  ('SKU3','Gizmo',30);         -- new
```

**Grading asserts:** after the upsert `dim_product` has **3 rows**; `SKU1` now has `name = 'Widget Pro'`, `price = 12`; `SKU3` inserted; `SKU2` untouched. The grader **runs the load twice** and asserts still exactly 3 rows.

**Hints:**

1. `INSERT INTO dim_product (sku,name,price) SELECT sku,name,price FROM stg_product WHERE true ON CONFLICT(sku) DO UPDATE SET name = excluded.name, price = excluded.price;`
2. The `WHERE true` before `ON CONFLICT` is required with a `SELECT` source in SQLite.
3. `excluded.name` is the incoming staging value.

**Reference solution:**

```sql
INSERT INTO dim_product (sku, name, price)
SELECT sku, name, price FROM stg_product
WHERE true
ON CONFLICT(sku) DO UPDATE SET
  name  = excluded.name,
  price = excluded.price;
```

#### PRACTICE (no reference revealed)

**Task:** Write an **incremental upsert loader** and prove idempotency. `fact_events` accumulates events keyed by a unique `event_id`. `stg_events` is a fresh extract that **overlaps** the previously loaded data (contains some already-loaded `event_id`s plus new ones) and also contains a **duplicate `event_id` within the extract itself**. Load only genuinely new/updated events using a high-water mark on `event_ts`, dedup the intra-extract duplicate (keep the latest `ingested_at`), and upsert on `event_id` so a second run of the whole script leaves the row count unchanged.

**Seed:**

```sql
CREATE TABLE fact_events (
  event_id   TEXT PRIMARY KEY,
  payload    TEXT,
  event_ts   TEXT,
  ingested_at TEXT
);
INSERT INTO fact_events (event_id, payload, event_ts, ingested_at) VALUES
  ('e1','{"a":1}','2026-03-01','2026-03-01'),
  ('e2','{"a":2}','2026-03-02','2026-03-02');

CREATE TABLE stg_events (
  event_id   TEXT,
  payload    TEXT,
  event_ts   TEXT,
  ingested_at TEXT
);
INSERT INTO stg_events VALUES
  ('e2','{"a":2}','2026-03-02','2026-03-02'),   -- already loaded (<= high-water)
  ('e3','{"a":3}','2026-03-03','2026-03-03'),   -- new
  ('e3','{"a":3b}','2026-03-03','2026-03-04'),  -- intra-extract dup, later ingested_at
  ('e4','{"a":4}','2026-03-04','2026-03-04');   -- new
```

**Grading asserts:** after one run `fact_events` has **4 rows** (`e1,e2,e3,e4`); `e3`'s `payload` is `'{"a":3b}'` (the later-ingested dup won); no duplicate `event_id`. The grader **runs the entire script a second time** and asserts still exactly **4 rows** and identical `e3` payload. An assertion `GROUP BY event_id HAVING COUNT(*) > 1` returns zero rows.

**Hints:**

1. Dedup the extract first with `ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY ingested_at DESC)` keep `rn = 1` (Module 4.4 dedup).
2. Apply the high-water mark: `WHERE event_ts > (SELECT COALESCE(MAX(event_ts),'1970-01-01') FROM fact_events)` — but note `e2` at the boundary; decide `>` vs `>=` and lean on `ON CONFLICT` as the safety net so overlap can't duplicate.
3. Upsert on the PK: `ON CONFLICT(event_id) DO UPDATE SET payload = excluded.payload, event_ts = excluded.event_ts, ingested_at = excluded.ingested_at`.
4. Idempotency trap: on the second run the high-water mark is now `2026-03-04`, so most rows are filtered out; whatever slips through must hit `ON CONFLICT` and update-in-place, never insert. Test your logic mentally for run #2.

---

## Module 4.5 — Quality, Performance, and Capstone

The last mile of a production loader: **assert** the data is correct before it spreads, **read the query plan** to keep it fast, and **compose** everything into one capstone loader.

---

### Lesson `sql-l4-data-quality` — Data-Quality Assertions

- **id:** `sql-l4-data-quality`
- **title:** Data-Quality Assertions
- **summary:** Encode expectations as tests that fail before bad data spreads.
- **difficulty:** medium
- **estimatedMinutes:** 22
- **skills:** assertion queries (zero-rows-pass), not-null/unique/accepted-values/relationships, dbt-test mapping

#### READ

A loader that runs successfully can still produce **wrong** data: a duplicated key, a null where a null can't be, an orphan fact. Data-quality (DQ) tests catch this before the bad data reaches a dashboard. The universal pattern — the one dbt is built on — is the **zero-rows assertion**: write a query that returns the **violating** rows; if it returns **any** rows, the test fails. **Healthy data → zero rows → pass.**

The four canonical dbt tests, each as a "count of violations = 0" query:

```sql
-- 1. not_null: rows where a required column is NULL
SELECT COUNT(*) AS violations FROM dim_customer WHERE email IS NULL;

-- 2. unique: keys that appear more than once
SELECT customer_code FROM dim_customer
GROUP BY customer_code HAVING COUNT(*) > 1;

-- 3. accepted_values: rows whose status is outside the allowed set
SELECT COUNT(*) AS violations FROM fact_order
WHERE status NOT IN ('paid','shipped','cancelled');

-- 4. relationships (referential integrity): fact rows with no matching dimension
SELECT f.customer_key FROM fact_sales f
LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
WHERE d.customer_key IS NULL;
```

Each returns rows **only when something is wrong**. Wire them into CI (or a workspace grader) as "this query must return zero rows," and a bad load fails loudly instead of silently corrupting downstream marts.

##### Anatomy of the relationships (orphan) test

```
SELECT f.customer_key
FROM fact_sales f
LEFT JOIN dim_customer d ON d.customer_key = f.customer_key   -- keep all fact rows
WHERE d.customer_key IS NULL;                                  -- ...where the dim match is missing
```

This is the anti-join from Level 2, repurposed as a referential-integrity assertion — the most valuable DQ check in a star schema.

##### Common pitfall

- **Asserting the happy path instead of the violations.** A test that `SELECT COUNT(*) FROM dim WHERE email IS NOT NULL` and checks it's "large" is fragile. Always count the **bad** rows and require **zero** — it's unambiguous and threshold-free.
- **NULLs in `NOT IN`.** `status NOT IN ('paid','shipped')` returns nothing for a `NULL` status (three-valued logic), silently passing a null. Add `OR status IS NULL` if null is also a violation.

> **In the warehouse:** dbt ships these four as one-line YAML (`unique`, `not_null`, `accepted_values`, `relationships`) that compile to exactly these zero-row SQL queries. The SQL is identical across engines.

**Recap:** encode each expectation as a query that returns only violating rows and require **zero rows** to pass; the dbt four — `not_null`, `unique`, `accepted_values`, `relationships` (orphan anti-join) — are the standard suite, always counting the bad rows rather than asserting the good ones.

#### APPLY (guided)

**Task:** Write a **relationships assertion** that returns `fact_sales` rows with no matching `dim_customer`. Produce a result set (or a table `orphan_facts`) containing the `customer_key` of every fact row whose key is absent from the dimension.

**Seed:**

```sql
CREATE TABLE dim_customer (customer_key INTEGER PRIMARY KEY, email TEXT);
INSERT INTO dim_customer VALUES (1,'a@x.com'),(2,'b@x.com');

CREATE TABLE fact_sales (sale_id INTEGER PRIMARY KEY, customer_key INTEGER, amount INTEGER);
INSERT INTO fact_sales VALUES
  (10,1,100),(11,2,50),(12,99,25);   -- key 99 is an orphan

CREATE TABLE orphan_facts (customer_key INTEGER);
```

**Grading asserts:** `orphan_facts` contains exactly one row, `customer_key = 99`; keys 1 and 2 are absent (they match the dimension).

**Hints:**

1. `LEFT JOIN dim_customer` and keep rows `WHERE dim_customer.customer_key IS NULL`.
2. Insert those into `orphan_facts`.
3. On healthy data this table would be empty — that's the "pass" condition.

**Reference solution:**

```sql
INSERT INTO orphan_facts (customer_key)
SELECT f.customer_key
FROM fact_sales f
LEFT JOIN dim_customer d ON d.customer_key = f.customer_key
WHERE d.customer_key IS NULL;
```

#### PRACTICE (no reference revealed)

**Task:** Build a **four-test quality suite** for a dimension where every check returns **zero rows on healthy data**. Given `dim_customer` and `fact_sales`, create a table `dq_results(test_name TEXT, violations INTEGER)` and populate it with one row per test: `pk_unique` (count of `customer_key`s appearing >1 time), `email_not_null` (count of rows with NULL email), `status_accepted` (count of rows whose `status` is not in `('active','churned','prospect')` — NULL also counts as a violation), and `no_orphan_facts` (count of `fact_sales` rows with no matching `dim_customer`). The suite **passes** only if all four `violations` are `0`.

**Seed:**

```sql
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

CREATE TABLE dq_results (test_name TEXT, violations INTEGER);
```

**Grading asserts:** `dq_results` has exactly **4 rows** with `test_name` in the required set; on this **healthy** seed every `violations = 0`; the grader then **injects a bad row** (a duplicate `customer_key`, a NULL email, an invalid status, and an orphan fact in separate variants) and re-runs your suite, asserting the corresponding `violations` becomes non-zero while the others stay `0`.

**Hints:**

1. Each test is an `INSERT INTO dq_results SELECT '<name>', COUNT(*) FROM (<violating rows>)`.
2. `pk_unique`: `SELECT COUNT(*) FROM (SELECT customer_key FROM dim_customer GROUP BY customer_key HAVING COUNT(*) > 1)`.
3. `status_accepted`: `WHERE status NOT IN ('active','churned','prospect') OR status IS NULL` — the `OR … IS NULL` is essential or a NULL status slips through.
4. `no_orphan_facts`: the LEFT JOIN … IS NULL anti-join from the Apply, wrapped in `COUNT(*)`.

---

### Lesson `sql-l4-explain` — EXPLAIN and Query Performance

- **id:** `sql-l4-explain`
- **title:** EXPLAIN and Query Performance
- **summary:** Read a query plan and turn a full scan into an index seek.
- **difficulty:** hard
- **estimatedMinutes:** 24
- **skills:** `EXPLAIN QUERY PLAN`, seek vs scan, sargable predicates, index-driven fixes

#### READ

When a query is slow, guessing is a waste of time — ask the database what it's doing. `EXPLAIN QUERY PLAN <query>` returns the **plan**: how the engine will access each table. The word you're hunting for is **SCAN** versus **SEARCH**:

- **`SCAN table`** — a full table scan: the engine reads *every* row. Fine for tiny tables, catastrophic for large facts.
- **`SEARCH table USING INDEX …`** — an index seek: the engine jumps straight to the matching rows. This is what you want on a filtered or joined column.

```sql
EXPLAIN QUERY PLAN
SELECT * FROM fact_sales WHERE customer_key = 42;
```

On an unindexed `customer_key` this reports `SCAN fact_sales`. Add the index:

```sql
CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_key);
```

and the same `EXPLAIN QUERY PLAN` now reports `SEARCH fact_sales USING INDEX idx_fact_sales_customer (customer_key=?)` — the scan became a seek. Index the columns queries **filter on**, **join on**, and often **order by**.

##### Sargable predicates

An index can only be used if the predicate is **sargable** (Search-ARGument-able): the indexed column must appear **bare** on one side of the comparison. Wrapping it in a function defeats the index:

```sql
-- NON-sargable: function on the column -> index unusable -> full scan
WHERE strftime('%Y', order_date) = '2026'

-- Sargable: bare column vs a literal range -> index seek
WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'
```

Both select 2026, but only the second lets the engine seek. Rewriting a function-wrapped predicate as a **range on the bare column** is one of the highest-leverage performance fixes a DE makes.

##### Common pitfall

- **Indexing everything.** Every index speeds reads but **slows writes** (each `INSERT`/`UPDATE` must maintain it) and costs storage. Index selectively — the FK/join columns and the hot filter columns — not every column.
- **Redundant indexes.** PRIMARY KEY and UNIQUE columns are **already indexed**; don't add a second index on them.
- **Reading the plan wrong.** `SCAN` on a 5-row lookup table is totally fine — a seek's overhead isn't worth it. Optimize the scans that hurt (big tables in the hot path).

> **In the warehouse:** SQLite's `EXPLAIN QUERY PLAN` is the lightweight cousin of Postgres's `EXPLAIN ANALYZE` (which also runs the query and reports real timings) and Snowflake's query profile UI. Columnar warehouses rely on partition pruning and clustering rather than B-tree indexes, but the **sargable-predicate** rule (bare column, no function) is universal.

**Recap:** `EXPLAIN QUERY PLAN` reveals `SCAN` (full read) vs `SEARCH … USING INDEX` (seek); turn a hot-path scan into a seek by indexing the filter/join column and keeping predicates sargable (bare column, range not function) — and index selectively because every index taxes writes.

#### APPLY (guided)

**Task:** Read the plan for a filtered query and **add the index that turns a scan into a seek**. `fact_sales` has no index on `customer_key`. Add an index so that `SELECT * FROM fact_sales WHERE customer_key = ?` uses a `SEARCH … USING INDEX` plan.

**Seed:**

```sql
CREATE TABLE fact_sales (
  sale_id INTEGER PRIMARY KEY,
  customer_key INTEGER,
  amount INTEGER
);
INSERT INTO fact_sales (customer_key, amount) VALUES
  (1,100),(1,50),(2,200),(3,75),(1,25);
-- (in the real grader the table is large enough that the scan matters)
```

**Task:** create the appropriate index.

**Grading asserts:** an index exists on `fact_sales(customer_key)`; `EXPLAIN QUERY PLAN SELECT * FROM fact_sales WHERE customer_key = 1` reports a plan whose detail contains `USING INDEX` (a seek), not a bare `SCAN`.

**Hints:**

1. `CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_key);`
2. The filter column is `customer_key` — that's what to index.
3. You can verify with `EXPLAIN QUERY PLAN SELECT * FROM fact_sales WHERE customer_key = 1;`.

**Reference solution:**

```sql
CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_key);
```

#### PRACTICE (no reference revealed)

**Task:** Diagnose a slow **fact→dim join** and a non-sargable filter, then fix both. `fact_orders` joins `dim_customer` on `customer_key` and filters on `order_date` with a year function. (1) Add the index that makes the join a **seek** on the fact side. (2) Add the index that makes the date filter sargable. (3) Provide a **rewritten** query `slow_query_fixed` that replaces the non-sargable `strftime('%Y', order_date) = '2026'` with a sargable date-range predicate. Write the final query result into `orders_2026(order_id, customer_key)`.

**Seed:**

```sql
CREATE TABLE dim_customer (customer_key INTEGER PRIMARY KEY, name TEXT);
INSERT INTO dim_customer VALUES (1,'Ada'),(2,'Ben'),(3,'Cara');

CREATE TABLE fact_orders (
  order_id INTEGER PRIMARY KEY,
  customer_key INTEGER,
  order_date TEXT,          -- 'YYYY-MM-DD'
  amount INTEGER
);
INSERT INTO fact_orders (customer_key, order_date, amount) VALUES
  (1,'2025-12-31',10),(1,'2026-01-15',20),(2,'2026-06-01',30),
  (3,'2026-12-31',40),(2,'2027-01-01',50);

CREATE TABLE orders_2026 (order_id INTEGER, customer_key INTEGER);
```

**Grading asserts:** an index exists on `fact_orders(customer_key)` and on `fact_orders(order_date)`; `orders_2026` contains exactly the three 2026 orders (`order_date` in `[2026-01-01, 2027-01-01)`) — the `2025-12-31` and `2027-01-01` rows are excluded; the grader inspects that the loaded query used a bare-column range predicate (the `strftime`-wrapped version is rejected as non-sargable); `EXPLAIN QUERY PLAN` on the fixed query shows an index `SEARCH` on the date range rather than a full `SCAN`.

**Hints:**

1. Two indexes: `CREATE INDEX … ON fact_orders(customer_key)` and `CREATE INDEX … ON fact_orders(order_date)`.
2. Rewrite the filter as `order_date >= '2026-01-01' AND order_date < '2027-01-01'` — bare column, half-open range, no function.
3. The half-open upper bound `< '2027-01-01'` correctly excludes `2027-01-01` and includes `2026-12-31`.
4. Insert the join result (fact filtered to 2026, joined to `dim_customer` if you need to prove no orphans) into `orders_2026`.

---

### Lesson `sql-l4-capstone` — Capstone: A Type-2 SCD Loader

- **id:** `sql-l4-capstone`
- **title:** Capstone: A Type-2 SCD Loader
- **summary:** Combine dedup, SCD2, idempotency, quality, and perf into one production-grade loader.
- **difficulty:** hard
- **estimatedMinutes:** 40
- **skills:** end-to-end pipeline, dedup + SCD2 + upsert, DQ assertions, `EXPLAIN`, idempotent re-run

#### READ

Everything in Level 4 was a component. A real daily loader **composes** them in order. Here is the anatomy of a production `dim_customer` Type-2 loader processing one daily dump:

1. **Dedup the source** (Module 4.4) — a raw dump has duplicate natural keys; reduce to one row per customer, keeping the freshest (`ROW_NUMBER() PARTITION BY customer_code ORDER BY updated_at DESC`, keep rank 1). Feed clean input to everything downstream.
2. **Apply SCD Type 2** (Module 4.3) — for each deduped customer whose tracked attribute changed vs the current dimension row: **expire** the old row (`effective_to = snapshot_date`, `is_current = 0`) and **insert** a new version (fresh surrogate key, `effective_from = snapshot_date`, `effective_to = '9999-12-31'`, `is_current = 1`). Brand-new customers get one current row. Unchanged customers are untouched.
3. **Assert quality** (Module 4.5) — run zero-row DQ tests: PK/natural-key sanity, **exactly one `is_current = 1` per customer**, no orphan facts against the dimension.
4. **Verify performance** (this module's `EXPLAIN`) — the fact→dim as-of join should be an index **seek**, so index the join/validity columns.
5. **Idempotency** (Module 4.4) — the whole script, run twice on the same dump, must leave the dimension **byte-identical**: the second run detects no changes and inserts nothing.

The single most important correctness property is **idempotency of the SCD2 step**: change-detection must compare the dump against the *current* dimension row, and you must **snapshot the changed set** (into a temp table) *before* inserting new versions — otherwise the insert creates rows that a naive second pass re-detects as "changes," and you get infinite version growth on re-runs.

**Recap:** a production loader = dedup → SCD2 (snapshot-then-expire-then-insert) → DQ assertions → plan verification, all engineered so re-running the whole script changes nothing; idempotent change-detection against the current row is the property everything else depends on.

#### APPLY (guided)

**Task:** Wire the **dedup step to the SCD2 apply step** for a single-day load. Given a raw dump `raw_dump` (with duplicate `customer_code`s) and a Type-2 `dim_customer`, (1) dedup the dump to one row per `customer_code` keeping the latest `updated_at`, then (2) apply a Type 2 change for any customer whose `city` differs from its current dimension row, as of `snapshot_date = '2026-03-01'`.

**Seed:**

```sql
CREATE TABLE dim_customer (
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
  ('C1','Berlin','2026-02-28');   -- latest dup; city changed
```

**Grading asserts:** after the load `dim_customer` has **2 rows** for `C1`; exactly one `is_current = 1` (Berlin, `effective_from = '2026-03-01'`, `effective_to = '9999-12-31'`); the London row expired (`is_current = 0`, `effective_to = '2026-03-01'`); windows contiguous.

**Hints:**

1. Dedup into a temp/CTE: `ROW_NUMBER() OVER (PARTITION BY customer_code ORDER BY updated_at DESC)` keep `rn = 1` — this picks the Berlin row for C1.
2. Compare the deduped dump to the current dim row (`is_current = 1`) to find changed cities.
3. Expire, then insert, exactly as in `sql-l4-scd-type2`.
4. Use `snapshot_date = '2026-03-01'` for both the expiring `effective_to` and the new `effective_from`.

**Reference solution:**

```sql
-- 1. dedup the dump to one row per customer_code (latest wins)
CREATE TEMP TABLE clean_dump AS
WITH ranked AS (
  SELECT customer_code, city, updated_at,
         ROW_NUMBER() OVER (PARTITION BY customer_code ORDER BY updated_at DESC) AS rn
  FROM raw_dump
)
SELECT customer_code, city FROM ranked WHERE rn = 1;

-- 2a. snapshot which codes actually changed (compare to current dim row)
CREATE TEMP TABLE changed AS
SELECT c.customer_code, c.city
FROM clean_dump c
JOIN dim_customer d
  ON d.customer_code = c.customer_code AND d.is_current = 1
WHERE c.city <> d.city;

-- 2b. expire the old current rows for changed codes
UPDATE dim_customer
SET effective_to = '2026-03-01', is_current = 0
WHERE is_current = 1
  AND customer_code IN (SELECT customer_code FROM changed);

-- 2c. insert the new versions
INSERT INTO dim_customer (customer_code, city, effective_from, effective_to, is_current)
SELECT customer_code, city, '2026-03-01', '9999-12-31', 1
FROM changed;
```

#### PRACTICE (no reference revealed)

**Task — the full capstone:** Build the complete `dim_customer` **Type-2 loader** from a daily dump, then prove it end-to-end. From `raw_customer_dump` (dirty: duplicate `customer_code`s, some with equal `updated_at` needing a tiebreaker, some brand-new customers, some unchanged, some changed) load a Type-2 `dim_customer` as of `snapshot_date = '2026-03-01'`, and also maintain a `fact_sales` that references `dim_customer` by the **currently-valid** surrogate key. Your script must:

1. **Dedup** the dump to one row per `customer_code` (latest `updated_at`, tiebreak by highest `source_row_id`).
2. **Apply SCD2**: expire+insert for changed cities, single current row for new customers, leave unchanged and absent customers alone.
3. **Add three DQ assertions** into `dq_results(test_name, violations)`: `pk_natural_one_current` (exactly one `is_current = 1` per `customer_code` — violations = count of codes with >1 current row), `no_dup_natural_current` is covered by that; `orphan_facts` (fact rows whose `customer_key` isn't a real dimension surrogate key), and `contiguous_windows` (count of `customer_code`s that have overlapping or gapped validity windows). All three must be **0** on healthy output.
4. **Index** `fact_sales(customer_key)` and confirm (via `EXPLAIN QUERY PLAN`) the fact→dim join is a **seek**.
5. **Idempotency**: the grader runs your entire script **twice** and asserts `dim_customer`, `fact_sales`, and all `dq_results.violations` are identical — no new versions on the second run.

**Seed:**

```sql
CREATE TABLE dim_customer (
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
  ('C1','Ada','Berlin','2026-02-20'),   -- changed London -> Berlin
  ('C1','Ada','Berlin','2026-02-20'),   -- exact dup (tiebreak by source_row_id)
  ('C2','Ben','Paris','2026-02-25'),    -- unchanged
  ('C4','Dan','Oslo','2026-02-26');     -- brand new (C3 absent from dump)

CREATE TABLE fact_sales (
  sale_id INTEGER PRIMARY KEY,
  customer_code TEXT,        -- natural key on the fact; resolve to surrogate on load
  sale_date TEXT,
  customer_key INTEGER,      -- to be populated via as-of join
  amount INTEGER
);
INSERT INTO fact_sales (customer_code, sale_date, amount) VALUES
  ('C1','2026-02-10',100),   -- before the change -> London version
  ('C1','2026-03-15',50),    -- after the change  -> Berlin version
  ('C4','2026-03-20',30);    -- new customer

CREATE TABLE dq_results (test_name TEXT, violations INTEGER);
```

**Grading asserts:**

- After run #1: `dim_customer` has **5 rows** — C1 London (expired, `effective_to = '2026-03-01'`, `is_current = 0`), C1 Berlin (current), C2 Paris (untouched, still one current), C3 Rome (untouched — absent from dump, left as-is), C4 Oslo (new current).
- Exactly **one** `is_current = 1` per `customer_code`.
- `fact_sales.customer_key` resolves via the half-open as-of join: the `2026-02-10` C1 sale points at the **London** surrogate key; the `2026-03-15` C1 sale points at **Berlin**; the C4 sale points at Oslo.
- `dq_results` has 3 rows, all `violations = 0`.
- An index exists on `fact_sales(customer_key)`; `EXPLAIN QUERY PLAN` for the fact→dim key join reports `USING INDEX`.
- **Run #2** of the entire script: `dim_customer` still **5 rows**, no new versions, `fact_sales` identical, all `violations` still `0`.

**Hints:**

1. Dedup first into a temp table (tiebreak `ORDER BY updated_at DESC, source_row_id DESC`). Everything downstream reads the clean set, never `raw_customer_dump`.
2. **Snapshot the changed set into a temp table before mutating** `dim_customer` — compute "codes whose deduped city ≠ current dim city" once, then expire, then insert from that frozen set. This is what makes run #2 a no-op: on the second run the current city already equals the dump, so `changed` is empty.
3. New customers = deduped codes with no row in `dim_customer` at all — insert a single current version for them (don't run the expire step for them).
4. Resolve `fact_sales.customer_key` with the as-of join: `JOIN dim_customer d ON d.customer_code = f.customer_code AND f.sale_date >= d.effective_from AND f.sale_date < d.effective_to`. Do this as an idempotent `UPDATE` (re-running recomputes the same key) so run #2 leaves the fact identical.
5. DQ `pk_natural_one_current`: `SELECT COUNT(*) FROM (SELECT customer_code FROM dim_customer WHERE is_current = 1 GROUP BY customer_code HAVING COUNT(*) > 1)`. `contiguous_windows`: for each code, check that ordered `effective_to` of one version equals `effective_from` of the next and there's no overlap — count the violators.
6. Create the `fact_sales(customer_key)` index after the fact is populated; verify the plan with `EXPLAIN QUERY PLAN`.

> **In the warehouse:** this entire loader is what dbt's `snapshot` (SCD2) plus `MERGE`-based incremental models plus schema `tests` generate for you — but building it by hand once is exactly how you learn what those tools are doing, and it's the interview question behind "walk me through a Type-2 dimension load."

---

*End of Level 4 — Data Engineering with SQL.*

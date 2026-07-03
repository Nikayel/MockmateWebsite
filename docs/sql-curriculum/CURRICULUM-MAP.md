# SQL & Databases for Data Engineering Interns — Curriculum Map

*Reuses the Learn-Python content contract exactly: `PYTHON_LEVELS`-style array of 4 levels, each Level → Modules → Lessons, every lesson = **Read → Apply → Practice**. Engine: browser SQLite (sql.js) with ANSI-portable SQL; warehouse-divergence callouts flagged inline. L1/L2 grade a single `SELECT` against a seeded DB (result-set compare, `single-file` mode); L3/L4 run multi-statement scripts graded by hidden assertion queries (`workspace` mode).*

---

## LEVEL 1 — SQL Foundations: Querying a Source Table

- **id:** `1`
- **slug:** `sql-foundations`
- **title:** SQL Foundations — Reading Source Data
- **tagline:** Interrogate a single raw table the way a DE inspects a fresh source before modeling it.
- **audience:** Data Engineering intern, week 1 — has never written SQL but will be reading staging tables on day one.
- **estimatedHours:** `5`
- **defaultExecutionMode:** `single-file`

> Every lesson runs against a seeded `ecommerce_raw.db` (tables: `customers`, `orders`, `products`, `order_items`, `events`). One `SELECT`, graded by comparing the returned result set to the expected rows.

### Module 1.1 — Projecting Columns from a Source Table
| Lesson | | |
|---|---|---|
| **id** | `sql-l1-select-columns` | |
| **title** | SELECT and Column Aliasing | |
| **summary** | Pull specific columns from a raw table and rename them to clean model-ready names. | |
| **difficulty** | easy | |
| **skills** | `SELECT`, column projection, `AS` aliasing, `SELECT *` vs explicit columns | |
| **Read** | Why a DE names columns explicitly (a staging model renames `cust_nm` → `customer_name`) instead of `SELECT *`. | |
| **Apply** | Project three columns from `orders` and alias them to snake_case model names. | |
| **Practice** | Build a "clean orders" projection: select six raw columns, alias each to warehouse naming convention, drop the ones a mart never needs. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l1-expressions` | |
| **title** | Computed Columns and Expressions | |
| **summary** | Derive new columns with arithmetic and concatenation instead of storing them. | |
| **difficulty** | easy | |
| **skills** | arithmetic operators, string concatenation (`||`), literal columns, expression aliasing | |
| **Read** | Deriving `revenue = qty * unit_price` at query time vs materializing it; concatenating a full name. | |
| **Apply** | Add a `line_revenue` computed column to an `order_items` projection. | |
| **Practice** | Produce a source-preview: `unit_price_dollars` from cents, a `label` combining product + SKU, and a hard-coded `source_system` tag column. | |

### Module 1.2 — Filtering Rows
| Lesson | | |
|---|---|---|
| **id** | `sql-l1-where-basics` | |
| **title** | WHERE and Comparison Operators | |
| **summary** | Restrict a scan to the rows a model actually needs. | |
| **difficulty** | easy | |
| **skills** | `WHERE`, `= <> < > <= >=`, filtering on numbers/text | |
| **Read** | Predicate pushdown intuition — filtering early shrinks everything downstream. | |
| **Apply** | Return only `orders` with `status = 'paid'` above a price threshold. | |
| **Practice** | Extract the "processable" slice of a raw dump: paid, non-zero total, from one region — the exact filter a staging model would apply. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l1-in-between-like` | |
| **title** | IN, BETWEEN, and LIKE | |
| **summary** | Match sets, ranges, and text patterns when filtering source rows. | |
| **difficulty** | easy | |
| **skills** | `IN`, `NOT IN`, `BETWEEN`, `LIKE`, `%`/`_` wildcards | |
| **Read** | Set membership vs range vs pattern; the `NOT IN` + NULL trap. | |
| **Apply** | Filter `products` to a set of category codes and a price band. | |
| **Practice** | Quarantine suspect rows: SKUs matching a malformed pattern, in an excluded status set, outside a valid date range. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l1-null-logic` | |
| **title** | NULLs and Three-Valued Logic | |
| **summary** | Handle missing values correctly — the #1 source of silent data bugs. | |
| **difficulty** | medium | |
| **skills** | `IS NULL`, `IS NOT NULL`, `COALESCE`, three-valued logic, `NULL` in comparisons | |
| **Read** | Why `= NULL` is never true, how NULLs poison `WHERE`/`NOT IN`, and `COALESCE` defaults. | |
| **Apply** | Find `customers` with a missing email using `IS NULL`. | |
| **Practice** | Write a null-audit projection: flag rows with any missing key attribute and `COALESCE` a display default, without dropping the NULL rows themselves. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l1-boolean-and-or` | |
| **title** | Combining Predicates: AND / OR / NOT | |
| **summary** | Compose multiple conditions with correct precedence and parentheses. | |
| **difficulty** | medium | |
| **skills** | `AND`, `OR`, `NOT`, operator precedence, parenthesizing conditions | |
| **Read** | Why `AND` binds tighter than `OR`, and how a missing paren silently widens a filter. | |
| **Apply** | Combine a status filter with a two-branch region condition using parentheses. | |
| **Practice** | Reproduce a business rule verbatim: "paid OR shipped, in EU or UK, excluding test accounts" — get the grouping exactly right. | |

### Module 1.3 — Shaping the Result Set
| Lesson | | |
|---|---|---|
| **id** | `sql-l1-order-by` | |
| **title** | Sorting with ORDER BY | |
| **summary** | Order output deterministically for previews and top-N inspection. | |
| **difficulty** | easy | |
| **skills** | `ORDER BY`, `ASC`/`DESC`, multi-key sort, `NULLS` ordering behavior | |
| **Read** | Sort keys, tie-breaking with a second column, where NULLs land (SQLite vs warehouse). | |
| **Apply** | Sort `orders` by date descending, then by total. | |
| **Practice** | Produce a deterministic newest-first preview with a stable multi-column sort so the output never reorders between runs. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l1-limit-distinct` | |
| **title** | LIMIT and DISTINCT | |
| **summary** | Sample the top rows and collapse duplicates during exploration. | |
| **difficulty** | easy | |
| **skills** | `LIMIT`, `OFFSET`, `DISTINCT`, distinct on multiple columns | |
| **Read** | Sampling a source with `LIMIT`; `DISTINCT` to probe cardinality; the pagination dialect note (`LIMIT` vs `TOP`/`FETCH`). | |
| **Apply** | Return the distinct list of order statuses actually present in the source. | |
| **Practice** | Profile a raw table: distinct `(region, status)` combinations, top 10 by nothing but a stable sort — the first thing a DE checks on new data. | |

### Module 1.4 — Types, Casting, Strings, and Dates
| Lesson | | |
|---|---|---|
| **id** | `sql-l1-cast-types` | |
| **title** | Data Types and CAST | |
| **summary** | Convert values explicitly and understand SQLite's dynamic typing. | |
| **difficulty** | medium | |
| **skills** | `CAST`, type affinity, numeric vs text, SQLite dynamic-typing caveat | |
| **Read** | **Warehouse callout:** SQLite lets a string land in an INTEGER column silently; Postgres/Snowflake reject it — always `CAST` at the boundary. | |
| **Apply** | `CAST` a text `total_cents` column to an integer and compute dollars. | |
| **Practice** | Clean a dirty numeric column: cast text amounts to numbers, guard against non-numeric junk, and expose a typed, model-ready measure. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l1-strings` | |
| **title** | String Functions for Cleaning | |
| **summary** | Trim, case-fold, and slice text to standardize messy source strings. | |
| **difficulty** | medium | |
| **skills** | `LOWER`/`UPPER`, `TRIM`, `SUBSTR`, `REPLACE`, `LENGTH`, `INSTR` | |
| **Read** | Standardizing keys before a join (lowercasing emails, trimming codes) so dedup and joins actually match. | |
| **Apply** | Normalize customer emails to trimmed lowercase. | |
| **Practice** | Build a cleaned join key: lowercase + trim an email, strip a prefix from a SKU, and normalize a country code — the prep a staging model does before any join. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l1-dates` | |
| **title** | Dates and Times in SQLite | |
| **summary** | Parse and format ISO-8601 date text — where dialects diverge most. | |
| **difficulty** | medium | |
| **skills** | `date()`, `strftime`, ISO-8601 text dates, date filtering/truncation | |
| **Read** | **Warehouse callout:** SQLite has no DATE type — dates are TEXT via `strftime`; warehouses have native `DATE`/`TIMESTAMP` and different function names. | |
| **Apply** | Extract year-month (`YYYY-MM`) from an ISO order timestamp. | |
| **Practice** | Build a date spine column for a daily mart: truncate to day, derive year-month and day-of-week labels, filter to a rolling window — all from ISO text. | |

---

## LEVEL 2 — Aggregation & Joins: Combining Source Data

- **id:** `2`
- **slug:** `aggregation-and-joins`
- **title:** Aggregation & Joins — Building Metrics from Many Tables
- **tagline:** Turn scattered source tables into the aggregated, joined result sets that mart models are made of.
- **audience:** DE intern who can query one table and now must integrate several and compute metrics.
- **estimatedHours:** `6`
- **defaultExecutionMode:** `single-file`

> Same seeded `ecommerce_raw.db`. One `SELECT` per exercise, result-set compared. Introduces multi-table reads, aggregation, set logic, subqueries, and CTEs — still single-query.

### Module 2.1 — Aggregation and Grouping
| Lesson | | |
|---|---|---|
| **id** | `sql-l2-aggregates` | |
| **title** | Aggregate Functions | |
| **summary** | Collapse many rows into a single measure — the atom of every metric. | |
| **difficulty** | easy | |
| **skills** | `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `COUNT(DISTINCT)`, NULL handling in aggregates | |
| **Read** | How aggregates ignore NULLs, `COUNT(*)` vs `COUNT(col)` vs `COUNT(DISTINCT col)`. | |
| **Apply** | Compute total revenue and order count across all `order_items`. | |
| **Practice** | Produce a source-health scorecard row: total rows, distinct customers, sum of revenue, and average order value — the numbers a DE eyeballs after a load. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l2-group-by` | |
| **title** | GROUP BY | |
| **summary** | Compute one metric row per category — the shape of a mart. | |
| **difficulty** | medium | |
| **skills** | `GROUP BY`, grouping keys, multi-column groups, aggregate-per-group | |
| **Read** | Grain of a grouped result ("one row per category per month"); the every-non-aggregate-must-be-grouped rule. | |
| **Apply** | Revenue per product category via `GROUP BY`. | |
| **Practice** | Build a monthly revenue mart: revenue, order count, and distinct customers grouped by `(category, year_month)` — the exact grain an analyst would request. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l2-having` | |
| **title** | HAVING — Filtering Groups | |
| **summary** | Filter on aggregated values, not raw rows. | |
| **difficulty** | medium | |
| **skills** | `HAVING`, `WHERE` vs `HAVING`, filtering on aggregates | |
| **Read** | Why `WHERE` filters rows before grouping and `HAVING` filters groups after — and when using the wrong one changes the answer. | |
| **Apply** | Keep only categories whose total revenue exceeds a threshold. | |
| **Practice** | Flag high-value segments: customers with >5 orders AND lifetime revenue over a bar, combining a pre-aggregation `WHERE` with a post-aggregation `HAVING`. | |

### Module 2.2 — Joining Tables
| Lesson | | |
|---|---|---|
| **id** | `sql-l2-inner-join` | |
| **title** | INNER JOIN and Join Keys | |
| **summary** | Combine two source tables on a matching key. | |
| **difficulty** | medium | |
| **skills** | `INNER JOIN`, `ON`, join keys, table aliases, qualifying columns | |
| **Read** | Join keys and cardinality (1:1, 1:N, M:N); how a fan-out join inflates a SUM. | |
| **Apply** | Join `orders` to `customers` and return order + customer name. | |
| **Practice** | Assemble an enriched fact preview: join `order_items` → `orders` → `products`, and prove the row count didn't inflate the grain. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l2-left-join` | |
| **title** | LEFT JOIN and Preserving Rows | |
| **summary** | Keep all rows from the driving table even when the match is missing. | |
| **difficulty** | medium | |
| **skills** | `LEFT JOIN`, outer-join NULLs, preserving the driving side, `COALESCE` on join | |
| **Read** | Why LEFT JOIN preserves source rows and produces NULLs for missing matches — critical for not silently dropping data. | |
| **Apply** | List all customers with their order count, including customers with zero orders. | |
| **Practice** | Build a coverage report: every product with its total units sold, showing zero (not missing) for products that never sold. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l2-anti-join` | |
| **title** | Anti-Joins: Finding Missing Matches | |
| **summary** | Find records that have no counterpart — the DE's referential-integrity check. | |
| **difficulty** | medium | |
| **skills** | anti-join (`LEFT JOIN … IS NULL`), semi-join concept, orphan detection | |
| **Read** | The `LEFT JOIN … WHERE right.key IS NULL` pattern for "rows with no match" — the backbone of orphan/FK checks. | |
| **Apply** | Find `orders` whose `customer_id` has no matching customer. | |
| **Practice** | Run a referential audit: list `order_items` pointing at products that don't exist and customers who never ordered — two anti-joins a DE runs before trusting a source. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l2-self-join` | |
| **title** | Self-Joins and RIGHT/FULL OUTER | |
| **summary** | Join a table to itself and reconcile two sources with outer joins. | |
| **difficulty** | hard | |
| **skills** | self-join, `RIGHT JOIN`, `FULL OUTER JOIN`, aliasing one table twice | |
| **Read** | **Warehouse callout:** RIGHT/FULL OUTER work in modern SQLite (≥3.39) but not older embeds; self-join aliasing. | |
| **Apply** | Self-join `employees` to pair each employee with their manager's name. | |
| **Practice** | Reconcile two daily snapshots with a FULL OUTER JOIN to surface rows added, dropped, or changed between yesterday and today. | |

### Module 2.3 — Set Operations and Subqueries
| Lesson | | |
|---|---|---|
| **id** | `sql-l2-set-ops` | |
| **title** | UNION, INTERSECT, EXCEPT | |
| **summary** | Stack and compare result sets with set logic. | |
| **difficulty** | medium | |
| **skills** | `UNION`, `UNION ALL`, `INTERSECT`, `EXCEPT`, column compatibility | |
| **Read** | `UNION` (dedupes) vs `UNION ALL` (keeps all, cheaper); using `EXCEPT` for a diff. | |
| **Apply** | Combine two regional order tables into one stream with `UNION ALL`. | |
| **Practice** | Diff two source extracts: use `EXCEPT` to find IDs present yesterday but missing today, and `UNION ALL` to stack multi-region loads without losing dupes. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l2-subqueries` | |
| **title** | Subqueries: Scalar, IN, and Correlated | |
| **summary** | Nest a query inside another to filter or compute against a derived value. | |
| **difficulty** | hard | |
| **skills** | scalar subquery, `IN` subquery, correlated subquery, `EXISTS` | |
| **Read** | Three subquery shapes and when a join beats a correlated subquery on performance. | |
| **Apply** | Return orders whose total exceeds the overall average (scalar subquery). | |
| **Practice** | Find each customer's above-their-own-average orders with a correlated subquery, then note where a window function would do it faster (foreshadows L4). | |

### Module 2.4 — Readability and Conditional Logic
| Lesson | | |
|---|---|---|
| **id** | `sql-l2-ctes` | |
| **title** | CTEs — Readable Multi-Step Queries | |
| **summary** | Name subqueries with `WITH` so a transform reads top-to-bottom. | |
| **difficulty** | medium | |
| **skills** | `WITH`, single and chained CTEs, refactoring nested subqueries | |
| **Read** | Why dbt models are built from chained CTEs; refactoring a nested query into named stages. | |
| **Apply** | Rewrite a two-level nested subquery as two chained CTEs. | |
| **Practice** | Author a staged mart in CTEs: `paid_orders` → `per_customer` → final filter — the exact staging→intermediate→mart pattern of production SQL. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l2-case` | |
| **title** | CASE — Conditional Columns | |
| **summary** | Branch a value inside a query for bucketing and pivoting. | |
| **difficulty** | medium | |
| **skills** | `CASE WHEN`, searched vs simple `CASE`, conditional aggregation | |
| **Read** | `CASE` for bucketing; the conditional-aggregation trick (`SUM(CASE WHEN … THEN 1 END)`) to pivot. | |
| **Apply** | Bucket orders into small/medium/large by total with `CASE`. | |
| **Practice** | Pivot statuses into columns: one row per day with `paid`, `shipped`, and `cancelled` counts via conditional aggregation — a classic reporting mart. | |

---

## LEVEL 3 — Data Modeling & Schema Design

- **id:** `3`
- **slug:** `data-modeling`
- **title:** Data Modeling & Schema Design
- **tagline:** Design the tables, keys, and relationships that make a warehouse trustworthy — from raw dump to normalized schema to first star.
- **audience:** DE intern moving from querying data to designing where it lives and how it's guaranteed correct.
- **estimatedHours:** `7`
- **defaultExecutionMode:** `workspace`

> Multi-statement scripts (DDL + DML + queries). Each exercise runs the learner's script against an in-memory SQLite DB, then a hidden test runner executes assertion queries (`__WORKSPACE_TEST_RESULTS__` protocol) checking schema shape, constraint enforcement, and row outcomes.

### Module 3.1 — DDL, Types, and Loading Data
| Lesson | | |
|---|---|---|
| **id** | `sql-l3-ddl-create` | |
| **title** | CREATE TABLE and Data Types | |
| **summary** | Define a table's structure with the right column types. | |
| **difficulty** | easy | |
| **skills** | `CREATE TABLE`, `DROP TABLE`, column types, type affinity, `DEFAULT` | |
| **Read** | **Warehouse callout:** SQLite type affinity is advisory; declare intended types anyway — warehouses enforce them and your DDL should port. | |
| **Apply** | Write `CREATE TABLE` for a cleaned `customers` table with sensible types and defaults. | |
| **Practice** | Author the DDL for a staging schema (three tables) that mirrors a raw source but with proper types, defaults, and a `loaded_at` audit column. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l3-insert-populate` | |
| **title** | INSERT and INSERT … SELECT | |
| **summary** | Load rows literally and transform-load from another table. | |
| **difficulty** | medium | |
| **skills** | `INSERT INTO … VALUES`, `INSERT … SELECT`, multi-row insert, column lists | |
| **Read** | `INSERT … SELECT` as the "T" of ELT — reading raw and writing a cleaned model in one statement. | |
| **Apply** | Populate a `dim_product` from a raw source table with `INSERT … SELECT`. | |
| **Practice** | Split a wide raw feed into two normalized target tables using two `INSERT … SELECT` statements, casting and cleaning columns in flight. | |

### Module 3.2 — Keys and Constraints
| Lesson | | |
|---|---|---|
| **id** | `sql-l3-primary-keys` | |
| **title** | Primary Keys: Surrogate vs Natural | |
| **summary** | Give every row a stable identity that survives source changes. | |
| **difficulty** | medium | |
| **skills** | `PRIMARY KEY`, surrogate keys (`AUTOINCREMENT`/`INTEGER PRIMARY KEY`), natural keys, uniqueness | |
| **Read** | Why DEs prefer surrogate integer keys over business keys, and how PKs are auto-indexed. | |
| **Apply** | Add a surrogate PK to a table and keep the business key as a plain attribute. | |
| **Practice** | Design a dimension with a surrogate PK plus a UNIQUE natural key, and prove (via a duplicate insert that must fail) that identity is enforced. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l3-foreign-keys` | |
| **title** | Foreign Keys and Referential Integrity | |
| **summary** | Guarantee a child row always points at a real parent. | |
| **difficulty** | medium | |
| **skills** | `FOREIGN KEY`, `REFERENCES`, `ON DELETE` (`RESTRICT`/`CASCADE`/`SET NULL`), `PRAGMA foreign_keys` | |
| **Read** | Referential integrity, `ON DELETE` policies, and the SQLite quirk that FK enforcement is off unless `PRAGMA foreign_keys=ON`. | |
| **Apply** | Add an FK from `orders` to `customers` with an `ON DELETE RESTRICT` policy. | |
| **Practice** | Wire a three-table schema with FKs and choose a defensible `ON DELETE` policy per relationship, then show an orphan insert is rejected. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l3-constraints` | |
| **title** | UNIQUE, NOT NULL, and CHECK | |
| **summary** | Push data-quality rules into the schema so bad rows can't land. | |
| **difficulty** | medium | |
| **skills** | `NOT NULL`, `UNIQUE`, `CHECK`, composite unique, column invariants | |
| **Read** | Constraints as the cheapest data-quality layer — enforced by the DB before any test runs. | |
| **Apply** | Add a `CHECK` on status enum and a `NOT NULL` on a required column. | |
| **Practice** | Harden a table with a composite `UNIQUE`, a non-negative-price `CHECK`, and an enum `CHECK`, then demonstrate each rejects a violating insert. | |

### Module 3.3 — Normalization
| Lesson | | |
|---|---|---|
| **id** | `sql-l3-normalize-1nf` | |
| **title** | First Normal Form — Atomic Values | |
| **summary** | Eliminate repeating groups and multi-valued cells. | |
| **difficulty** | medium | |
| **skills** | 1NF, atomic columns, repeating-group removal, composite key introduction | |
| **Read** | 1NF: one value per cell, one row per fact; why comma-packed columns break every downstream join. | |
| **Apply** | Split a comma-packed `items` column into one row per line item. | |
| **Practice** | Take a flat "sales spreadsheet" export (packed items + prices) and unpack it into a 1NF line-item table with a `(order_id, product_id)` composite key. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l3-normalize-2nf-3nf` | |
| **title** | Second and Third Normal Form | |
| **summary** | Remove partial and transitive dependencies so each fact lives once. | |
| **difficulty** | hard | |
| **skills** | 2NF (no partial dependency), 3NF (no transitive dependency), table decomposition | |
| **Read** | "The key, the whole key, and nothing but the key" — worked 2NF/3NF split of an orders table. | |
| **Apply** | Extract product attributes that depend only on `product_id` into their own table. | |
| **Practice** | Fully normalize a 1NF table to 3NF: produce `customers`, `products`, `orders`, `order_items` via `INSERT … SELECT`, deduplicating customers by email. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l3-denormalization` | |
| **title** | Denormalization Trade-offs | |
| **summary** | Know when to flatten a normalized schema for analytics speed. | |
| **difficulty** | medium | |
| **skills** | OLTP vs OLAP, denormalization, read vs write trade-off, join cost | |
| **Read** | Why OLTP normalizes for safe writes but analytics denormalizes for fast reads — the tension that motivates star schemas. | |
| **Apply** | Build one wide denormalized reporting view by joining the normalized tables. | |
| **Practice** | Produce a flattened analytics table from the 3NF schema and write a short comparison query showing the join count it saves vs the normalized form. | |

### Module 3.4 — ER Modeling, Relationships, and Indexes
| Lesson | | |
|---|---|---|
| **id** | `sql-l3-cardinality` | |
| **title** | Entities, Relationships, and Cardinality | |
| **summary** | Read and encode 1:1, 1:N, and M:N relationships. | |
| **difficulty** | medium | |
| **skills** | ER modeling, cardinality (1:1/1:N/M:N), FK placement on the "many" side | |
| **Read** | The FK always sits on the many side; 1:1 as a table split; M:N needs resolution. | |
| **Apply** | Given two entities, place the FK correctly for a 1:N relationship. | |
| **Practice** | Model a "playlists ↔ songs" feature's entities and decide FK placement for each relationship, justifying the M:N case that a single FK can't express. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l3-junction-tables` | |
| **title** | Junction Tables for Many-to-Many | |
| **summary** | Resolve M:N relationships with a bridge table carrying its own attributes. | |
| **difficulty** | hard | |
| **skills** | junction/associative table, composite PK of paired FKs, relationship attributes | |
| **Read** | Why M:N needs a junction table, its composite PK, and where relationship attributes (e.g. `position`, `enrolled_at`) belong. | |
| **Apply** | Create an `enrollments` junction table between students and courses. | |
| **Practice** | Build the `playlist_songs` junction with an ordering `position` column, and prove the composite PK blocks a duplicate song-in-playlist insert. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l3-indexes` | |
| **title** | Indexes: Speeding Up Reads | |
| **summary** | Add B-tree indexes on the columns queries actually filter and join on. | |
| **difficulty** | medium | |
| **skills** | `CREATE INDEX`, indexing FK/`WHERE`/`JOIN`/`ORDER BY` columns, read vs write trade-off | |
| **Read** | PKs/UNIQUE auto-index; index FK and filter columns; indexes cost write throughput — index selectively. | |
| **Apply** | Add an index on the FK column a mart repeatedly joins on. | |
| **Practice** | Given a slow multi-join model, add the two indexes that matter and skip the ones that don't, explaining the write-cost trade-off in a schema comment. | |

### Module 3.5 — Dimensional Modeling Introduction
| Lesson | | |
|---|---|---|
| **id** | `sql-l3-dimensional-intro` | |
| **title** | Facts, Dimensions, and Grain | |
| **summary** | Split analytics data into a narrow fact and wide dimensions around a declared grain. | |
| **difficulty** | hard | |
| **skills** | fact vs dimension, grain declaration, surrogate keys, star vs snowflake | |
| **Read** | Kimball star schema: numeric-measure fact + descriptive dims; declaring grain first; star vs snowflake trade-off. | |
| **Apply** | Create a `dim_product` with a surrogate key and a narrow `fact_sales` referencing it. | |
| **Practice** | Convert the 3NF schema into a first star: `dim_customer`, `dim_product`, `dim_date`, and `fact_sales` at line-item grain, then write one "revenue by category by month" BI query on top. | |

---

## LEVEL 4 — Data Engineering with SQL

- **id:** `4`
- **slug:** `data-engineering-sql`
- **title:** Data Engineering with SQL
- **tagline:** Ship the transforms a DE is judged on — analytical windows, SCD history, idempotent loads, quality gates, and query plans — then a capstone loader.
- **audience:** DE intern ready to build production-grade, safe-to-rerun transforms and warehouse models.
- **estimatedHours:** `8`
- **defaultExecutionMode:** `workspace`

> Multi-statement scripts graded by hidden assertion queries. Exercises re-run scripts twice to verify **idempotency** (same row count), assert history correctness, and check that a plan uses a seek not a scan.

### Module 4.1 — Analytical SQL: Window Functions
| Lesson | | |
|---|---|---|
| **id** | `sql-l4-window-ranking` | |
| **title** | Ranking: ROW_NUMBER, RANK, DENSE_RANK | |
| **summary** | Rank rows within a partition without collapsing them. | |
| **difficulty** | medium | |
| **skills** | `OVER`, `PARTITION BY`, `ORDER BY`, `ROW_NUMBER`, `RANK`, `DENSE_RANK`, tie handling | |
| **Read** | Window anatomy and the exam question — `1,2,3` vs `1,1,3` vs `1,1,2` for ties; `ROW_NUMBER` for "pick one." | |
| **Apply** | Rank orders by revenue within each customer. | |
| **Practice** | Produce a top-3-products-per-category mart using the correct ranking function so ties are handled the way the spec demands. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l4-window-offset` | |
| **title** | LAG and LEAD: Period-over-Period | |
| **summary** | Compare each row to its neighbor without a self-join. | |
| **difficulty** | medium | |
| **skills** | `LAG`, `LEAD`, offset windows, deltas, growth rates | |
| **Read** | `LAG`/`LEAD` for month-over-month deltas, replacing an expensive self-join. | |
| **Apply** | Compute each customer's revenue change vs their previous order. | |
| **Practice** | Build a churn-signal mart: month-over-month revenue delta per customer via `LAG`, flagging any customer whose latest month dropped >30%. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l4-window-frames` | |
| **title** | Frames: Running Totals & Moving Averages | |
| **summary** | Aggregate over a sliding window of rows with a frame clause. | |
| **difficulty** | hard | |
| **skills** | `ROWS BETWEEN`, running total, moving average, `SUM() OVER ()` grand total, percent-of-total | |
| **Read** | Ordered `SUM() OVER` = running total; no `ORDER BY` = grand total; `revenue / SUM() OVER ()` = percent of total. | |
| **Apply** | Add a running lifetime-revenue column per customer. | |
| **Practice** | Ship a customer revenue-trend mart: running lifetime revenue, a 7-row moving average, and a percent-of-total-revenue column in one pass. | |

### Module 4.2 — Recursive CTEs
| Lesson | | |
|---|---|---|
| **id** | `sql-l4-recursive-cte` | |
| **title** | Recursive CTEs for Hierarchies | |
| **summary** | Walk self-referencing trees like org charts and category paths. | |
| **difficulty** | hard | |
| **skills** | `WITH RECURSIVE`, anchor + recursive member, `UNION ALL`, termination guard, depth tracking | |
| **Read** | Anchor / recursive-member / termination structure; matching column types; **dialect note** SQL Server omits the `RECURSIVE` keyword. | |
| **Apply** | Traverse an `employees` → `manager` hierarchy and emit each employee's depth. | |
| **Practice** | From a self-referencing `categories` table, build each category's full breadcrumb path (`Electronics > Audio > Headphones`) and depth for a catalog mart. | |

### Module 4.3 — Warehouse Modeling and History
| Lesson | | |
|---|---|---|
| **id** | `sql-l4-star-build` | |
| **title** | Building a Star Schema Load | |
| **summary** | Populate dimensions with surrogate keys, then load a fact that references them. | |
| **difficulty** | hard | |
| **skills** | dimension load, surrogate-key assignment, fact load, key lookup join | |
| **Read** | Load order: dims first (mint surrogate keys), then fact (look up surrogate keys by natural key). | |
| **Apply** | Load `dim_customer` with surrogate keys, then look those keys up while loading `fact_sales`. | |
| **Practice** | Build a full star load from staging: populate three dimensions, then a line-item fact that joins each natural key to its dimension's surrogate key — with zero orphan facts. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l4-scd-type1` | |
| **title** | Slowly Changing Dimensions — Type 1 | |
| **summary** | Overwrite a changed attribute in place with no history. | |
| **difficulty** | medium | |
| **skills** | SCD Type 1, in-place `UPDATE`, correction semantics | |
| **Read** | Type 1 overwrites for corrections/typos — no history kept; when that's the right choice. | |
| **Apply** | Apply a Type 1 update to correct a customer's misspelled city. | |
| **Practice** | Write a Type 1 apply step that overwrites changed attributes from a fresh source dump, and assert the row count is unchanged (no new rows). | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l4-scd-type2` | |
| **title** | Slowly Changing Dimensions — Type 2 | |
| **summary** | Preserve history by expiring old rows and inserting new versions. | |
| **difficulty** | hard | |
| **skills** | SCD Type 2, `effective_from`/`effective_to`, `is_current` flag, new surrogate per version | |
| **Read** | Type 2 = expire old + insert new with a fresh surrogate key; why facts join to the surrogate valid *as of* the event date. | |
| **Apply** | Close the current row and open a new version when a customer changes city. | |
| **Practice** | Build a Type 2 apply step: expire changed rows, insert new versions with correct validity windows, and assert exactly one `is_current=TRUE` per customer. | |

### Module 4.4 — Pipeline Correctness
| Lesson | | |
|---|---|---|
| **id** | `sql-l4-dedup` | |
| **title** | Deduplication | |
| **summary** | Keep exactly one row per business key from a dirty source. | |
| **difficulty** | medium | |
| **skills** | `ROW_NUMBER()` dedup, partition-by-key, keep-rank-1 subquery, `QUALIFY` note | |
| **Read** | The portable dedup pattern: `ROW_NUMBER() PARTITION BY key ORDER BY updated_at DESC` then keep rank 1; **warehouse note** Snowflake/BigQuery use `QUALIFY`, SQLite wraps in a subquery. | |
| **Apply** | Reduce a source with duplicate emails to one latest row per email. | |
| **Practice** | Deduplicate a messy daily customer dump to one current row per natural key, and assert the output has zero duplicate keys. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l4-idempotent-merge` | |
| **title** | Idempotent Loads: Upsert & MERGE | |
| **summary** | Make a re-run produce the same result — no duplicated rows. | |
| **difficulty** | hard | |
| **skills** | idempotency, `INSERT … ON CONFLICT` upsert, `MERGE` concept, unique_key, high-water mark | |
| **Read** | **Warehouse callout:** SQLite uses `INSERT … ON CONFLICT`; warehouses use `MERGE` — same idea. High-water-mark incremental + the "run twice, same count" test. | |
| **Apply** | Convert a blind `INSERT` into an `INSERT … ON CONFLICT` upsert keyed on a unique column. | |
| **Practice** | Write an incremental upsert loader and prove idempotency: the grader runs your script twice and asserts identical row counts. | |

### Module 4.5 — Quality, Performance, and Capstone
| Lesson | | |
|---|---|---|
| **id** | `sql-l4-data-quality` | |
| **title** | Data-Quality Assertions | |
| **summary** | Encode expectations as tests that fail before bad data spreads. | |
| **difficulty** | medium | |
| **skills** | assertion queries (zero-rows-pass), not-null/unique/accepted-values/relationships, dbt-test mapping | |
| **Read** | The dbt four (`unique`, `not_null`, `accepted_values`, `relationships`) as "count of violations = 0" SQL wired into CI. | |
| **Apply** | Write a relationships assertion that returns fact rows with no matching dimension. | |
| **Practice** | Build a four-test quality suite for a dimension (PK unique, required not-null, status in accepted set, no orphan FKs) where every check returns zero rows on healthy data. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l4-explain` | |
| **title** | EXPLAIN and Query Performance | |
| **summary** | Read a query plan and turn a full scan into an index seek. | |
| **difficulty** | hard | |
| **skills** | `EXPLAIN QUERY PLAN`, seek vs scan, sargable predicates, index-driven fixes | |
| **Read** | **Warehouse callout:** SQLite's `EXPLAIN QUERY PLAN` (vs Postgres `EXPLAIN ANALYZE`); index seek vs table scan; keep predicates sargable (`date_col >= '2026-01-01'`, not `year(date_col)=2026`). | |
| **Apply** | Read the plan for a filtered query and add the index that turns a scan into a seek. | |
| **Practice** | Diagnose a slow fact→dim join: confirm via the plan it's scanning, add the index that makes it a seek, and rewrite a non-sargable predicate. | |

| Lesson | | |
|---|---|---|
| **id** | `sql-l4-capstone` | |
| **title** | Capstone: A Type-2 SCD Loader | |
| **summary** | Combine dedup, SCD2, idempotency, quality, and perf into one production-grade loader. | |
| **difficulty** | hard | |
| **skills** | end-to-end pipeline, dedup + SCD2 + upsert, DQ assertions, `EXPLAIN`, idempotent re-run | |
| **Read** | How the pieces compose into a daily loader: dedup source → SCD2 merge → assert quality → verify the plan. | |
| **Apply** | Wire the dedup step to the SCD2 apply step for a single-day load. | |
| **Practice** | Build the full `dim_customer` Type-2 loader from a daily dump: dedup to one row per customer, apply expire-and-insert SCD2, add three DQ assertions (PK unique, one `is_current` per customer, no orphan facts), confirm the fact→dim join is a seek, and pass the run-twice idempotency check. | |

---

*Contract notes for level-authors: (1) L1/L2 exercises supply `testCases[]` compared against the seeded DB result set — author the reference `SELECT` and 2–3 hidden cases per exercise. (2) L3/L4 exercises supply a `workspace` config whose hidden test file emits `__WORKSPACE_TEST_RESULTS__:` JSON from assertion queries — author schema/row/idempotency assertions as the hidden suite. (3) Every "Read" is pure markdown + an optional runnable `demoCode` snippet against the seeded DB; every "Apply" reveals its reference after 2 fails; every "Practice" never reveals a reference. (4) All SQL authored in the ANSI intersection; each warehouse-divergence callout above becomes a short "In the warehouse this differs…" aside in the relevant Read.*
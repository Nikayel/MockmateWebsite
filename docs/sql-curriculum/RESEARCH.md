# Learn SQL — research foundation

The web-grounded research that shaped this curriculum: what a **data-engineering intern** is actually
expected to know, the SQL skill taxonomy, and the depth of data-modeling / DE material (normalization,
dimensional modeling, window functions, SCD, ELT). This fed the [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md)
and the authored [`CONTENT.md`](./CONTENT.md). Two briefs follow:

1. **DE-intern role & SQL skill taxonomy** — day-to-day work, beginner→advanced skill order, dialect
   choice (portable ANSI vs SQLite-in-browser vs warehouse), and the highest-value competencies.
2. **Data-modeling & DE depth** — DDL/keys/constraints, normalization with a worked example, ER
   modeling & cardinality, dimensional modeling (facts/dims, star vs snowflake), window functions,
   recursive CTEs, and DE patterns (dedup, SCD, idempotent/incremental transforms, data-quality).

---

## Brief 1 — DE-intern role & SQL skill taxonomy

# SQL & Databases for a Data Engineering Intern — Curriculum Brief

*Grounded in 2024–2026 hiring, interview, and industry-practice sources. Purpose: shape a 4-level course. Sources cited inline.*

---

## A. What DE interns actually DO with SQL day-to-day

An intern's SQL work maps to the **ELT lifecycle** — extract/load happens upstream, and the intern spends most time in **transform + validate**. Concretely:

1. **Querying source data (exploration & extraction).** Reading raw/staging tables to understand shape, grain, nulls, and relationships before modeling. `SELECT / WHERE / JOIN / GROUP BY / ORDER BY` are the daily bread; interns are expected to write "complex joins, CTEs, window functions" fluently ([Refonte Learning, 2025](https://www.refontelearning.com/blog/entry-level-data-engineering-jobs-in-2025-skills-certifications-you-need); [Mindbox Training, 2025](https://mindboxtrainings.com/training/data-engineering-skills-2025/)).

2. **Building models / transformations.** Turning raw source tables into clean, analytics-ready models — typically as SQL `SELECT` statements materialized as tables/views. In the modern stack this is **dbt as the "T" in ELT**: modular, version-controlled, testable SQL organized as staging → intermediate → mart layers ([O'Reilly, *Analytics Engineering with SQL and dbt*](https://www.oreilly.com/library/view/analytics-engineering-with/9781098142377/); [dbt SCD guide, Servian](https://servian.dev/modelling-type-1-2-slowly-changing-dimensions-with-dbt-1b80078f290a)). Interns write **staging models** (rename/cast/clean) and simple **mart models** (joins + aggregations).

3. **Dimensional modeling.** Assembling **fact and dimension tables** in a **star schema** so analysts can slice metrics by descriptive attributes ([Star schema, Wikipedia](https://en.wikipedia.org/wiki/Star_schema); [Kimball Group](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/star-schema-olap-cube/)). Day-to-day this means declaring **grain** ("one row per order line item"), choosing **surrogate integer keys** on dimensions, and keeping fact tables narrow (keys + measures) ([datadef.io Dimensional Modeling Guide, 2025](https://datadef.io/guides/en/dimensional-modeling)).

4. **Data quality / validation.** Writing and running assertion-style checks: **nulls, duplicates, freshness, and broken relationships**, plus monitoring/alerting ([Data Engineer Academy — ETL/pipeline Qs](https://dataengineeracademy.com/blog/data-engineer-interview-preparation-etl-and-pipeline-questions/); [Integrate.io — ETL vs DE](https://www.integrate.io/blog/etl-developer-vs-data-engineer/)). In dbt this is the four built-in tests (`unique`, `not_null`, `accepted_values`, `relationships`) that compile to `SELECT` statements finding failing rows — zero rows = pass ([dbt Developer Hub — data tests](https://docs.getdbt.com/docs/build/data-tests); [DataCamp — dbt tests](https://www.datacamp.com/tutorial/dbt-tests)).

5. **Making pipelines safe to re-run (idempotency).** Rewriting "blind INSERT/APPEND" (which duplicates rows on every retry) into **MERGE/upsert or partition-overwrite** so a re-run produces the same result — the practical test is "run twice, same row count" ([Data Engineer Academy — SQL MERGE](https://dataengineeracademy.com/blog/sql-merge-for-data-engineers-upserts-cdc-and-idempotent-pipelines/); [Airbyte — idempotency](https://airbyte.com/data-engineering-resources/idempotency-in-data-pipelines)).

6. **Basic performance work.** Reading a query plan with **EXPLAIN**, spotting full-table scans, and adding indexes / fixing WHERE clauses when a model is slow ([DataCamp — SQL optimization](https://www.datacamp.com/blog/sql-query-optimization); [dbvis — query optimization](https://www.dbvis.com/thetable/sql-query-optimization-everything-you-need-to-know/)).

---

## B. SQL skill taxonomy, beginner → advanced

Ordered so each tier depends on the one before it. This is the natural spine for 4 course levels.

**Tier 1 — Foundations (query a single table)**
- `SELECT`, column aliasing, `WHERE`, comparison/`IN`/`BETWEEN`/`LIKE`, `IS NULL`
- `ORDER BY`, `LIMIT`, `DISTINCT`
- Data types, `CAST`/casting, basic string & date manipulation
- Aggregates: `COUNT/SUM/AVG/MIN/MAX`, `GROUP BY`, `HAVING`
  ([DataCamp Top SQL Qs, 2026](https://www.datacamp.com/blog/top-sql-interview-questions-and-answers-for-beginners-and-intermediate-practitioners); [Dataquest 60 Qs, 2026](https://www.dataquest.io/blog/sql-interview-questions-from-beginner-to-advanced/))

**Tier 2 — Combining data (multi-table)**
- `INNER / LEFT / RIGHT / FULL OUTER JOIN`, join keys, cardinality (1:1, 1:many, many:many)
- Self-joins, **anti-joins** (LEFT JOIN … IS NULL), semi-joins
- `UNION`/`UNION ALL`, set logic
- Subqueries (scalar, `IN`, correlated) and when they beat/lose to joins
  ([Rethinking Vis, 2025](https://rethinkingvis.com/sql-interview-questions-for-data-engineer-complete-guide-2025/); [Datavidhya 80 DE Qs, 2026](https://datavidhya.com/blog/sql-data-engineering-interview-questions/))

**Tier 3 — Readability & analytics (the DE differentiator)**
- **CTEs** (`WITH`), chaining CTEs, refactoring nested subqueries; recursive CTEs
- **Window functions**: `ROW_NUMBER / RANK / DENSE_RANK`, `LAG / LEAD`, running totals & moving averages, `PARTITION BY` / frame clauses (`ROWS BETWEEN …`)
- **Deduplication** via `ROW_NUMBER() … QUALIFY`/filter pattern
  ([Medium — Window Functions & CTEs, 12 DE Qs](https://medium.com/@aicoders/master-sql-window-functions-and-ctes-12-real-data-engineering-interview-questions-with-code-9b42f37c1db1); [DEV — CTEs for DE interviews](https://dev.to/gowthampotureddi/cte-in-sql-for-data-engineering-interviews-with-clauses-recursive-ctes-and-window-sql-patterns-2978))

**Tier 4 — Warehouse & pipeline engineering (advanced)**
- **Normalization** (1NF–3NF) vs. denormalization trade-offs
- **Dimensional / star-schema modeling**: grain, surrogate keys, conformed dimensions ([Kimball Group](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/star-schema-olap-cube/); [Holistics — Kimball](https://www.holistics.io/books/setup-analytics/kimball-s-dimensional-data-modeling/))
- **Incremental / ELT transforms**: `MERGE`/upsert, `INSERT … ON CONFLICT`, partition overwrite, idempotency ([Data Engineer Academy — MERGE](https://dataengineeracademy.com/blog/sql-merge-for-data-engineers-upserts-cdc-and-idempotent-pipelines/))
- **Slowly Changing Dimensions (SCD Type 1 & 2)**: `valid_from`/`valid_to`, current-flag, history preservation ([Xebia — SCD2 in dbt](https://xebia.com/blog/a-practical-guide-to-creating-slowly-changing-dimensions-type-2-in-dbt-part-1/); [Hevo — dbt SCD2](https://hevodata.com/data-transformation/dbt-scd-type-2/))
- **Data-quality tests** as SQL assertions (unique/not-null/accepted-values/relationships) ([dbt Developer Hub](https://docs.getdbt.com/docs/build/data-tests))
- **Performance & `EXPLAIN`**: query plans, index seek vs scan, avoiding full scans ([DataCamp](https://www.datacamp.com/blog/sql-query-optimization); [Microsoft Learn — execution plans](https://learn.microsoft.com/en-us/sql/relational-databases/performance/execution-plans))

---

## C. Which dialect/engine to teach on

**Recommendation: teach portable, ANSI-style SQL, and run it on browser SQLite (sql.js / WASM), while explicitly flagging the handful of places SQLite diverges from Postgres/warehouse SQL.**

**Why ANSI-portable is the right target.** Every major warehouse a DE intern will touch (Postgres, Snowflake, BigQuery) is ANSI-SQL-based with vendor extensions — Snowflake follows ANSI SQL:2011, BigQuery Standard SQL "adheres closely to ANSI SQL," Postgres is standards-friendly ([npblue — Snowflake ANSI](https://www.npblue.com/data/snowflake/snowflake-standardsql-support); [Airbyte — BigQuery Standard SQL](https://airbyte.com/data-engineering-resources/bigquery-legacy-sql-vs-standard-sql)). The core skills (joins, CTEs, window functions, aggregation) are **identical across dialects**; only date/time functions, pagination, and type systems differ meaningfully ([feldera — Babel tower of SQL dialects](https://www.feldera.com/blog/the-babel-tower-of-sql-dialects); [Data With Sarah — SQL dialects](https://datawithsarah.com/post/sql-dialects-explained-translating-between-databases-without-losing-your-mind/)).

**Why SQLite-in-browser is a good runner.** `sql.js` compiles the full SQLite engine to WebAssembly, so real SQL executes client-side with no server; it supports CTEs, window functions, triggers, prepared statements — "nearly everything SQLite supports" ([sql.js.org](https://sql.js.org/); [sql-js/sql.js GitHub](https://github.com/sql-js/sql.js/)). Modern SQLite has closed its historic gaps: **window functions since 3.25.0 (2018)** — built directly against the PostgreSQL spec and tested for parity — and **RIGHT/FULL OUTER JOIN since 3.39.0 (2022)** ([SQLite window functions](https://sqlite.org/windowfunctions.html); [DevBolt — SQLite vs Postgres](https://www.devbolt.dev/tools/sql-playground/sqlite-vs-postgresql)). Current sql.js builds ship a recent SQLite, so CTEs, window functions, and full/right joins all work in-browser.

**Where SQLite differs from Postgres/warehouse SQL — call these out when teaching:**

| Area | SQLite behavior | Postgres / warehouse | Teaching note |
|---|---|---|---|
| **FULL/RIGHT OUTER JOIN** | Only since v3.39.0 (2022); absent in older embeds | Long-standing | Fine on modern sql.js, but mention older engines lack it ([DevBolt](https://www.devbolt.dev/tools/sql-playground/sqlite-vs-postgresql)) |
| **Typing** | **Dynamic / flexible typing** — types are advisory; a string can land in an INTEGER column silently | **Rigid static typing** — type violation errors immediately | Teach explicit `CAST`; note warehouses reject bad types ([SQLite datatypes](https://sqlite.org/datatype3.html); [dev.tldrlss — SQLite pitfalls](https://dev.tldrlss.com/en/article/2026/05/sqlite-pitfall-intro/)) |
| **BOOLEAN** | No boolean type; stored as `0`/`1` (TRUE/FALSE are aliases) | Native `BOOLEAN` | Warn students that `= TRUE` semantics vary ([SQLite datatypes](https://sqlite.org/datatype3.html)) |
| **DATE/TIME** | No date/time storage class; stored as TEXT/REAL/INTEGER via functions (`strftime`, `date()`) | Native `DATE`/`TIMESTAMP` + rich functions | Date/time is where dialects diverge most — teach ISO-8601 text + note warehouse functions differ ([SQLite datatypes](https://sqlite.org/datatype3.html); [feldera](https://www.feldera.com/blog/the-babel-tower-of-sql-dialects)) |
| **DDL / ALTER TABLE** | Partial — no `ALTER COLUMN`, no `ADD CONSTRAINT` | Full ALTER support | Keep schema-change exercises simple ([SQLite omitted features](https://www.sqlite.org/omitted.html)) |
| **MERGE / upsert** | Use `INSERT … ON CONFLICT` (no ANSI `MERGE`) | Snowflake/BigQuery/SQL Server use `MERGE` | Teach the *concept* of upsert; show both syntaxes ([Data Engineer Academy — MERGE](https://dataengineeracademy.com/blog/sql-merge-for-data-engineers-upserts-cdc-and-idempotent-pipelines/)) |
| **Stored procs / GRANT-REVOKE / writable views** | Not implemented (file-based, OS-level perms) | Supported | Out of scope for an intro course anyway ([SQLite omitted](https://www.sqlite.org/omitted.html)) |
| **`QUALIFY`** | Not supported | Snowflake/BigQuery support it | Teach the `ROW_NUMBER()` + outer-filter pattern, which is portable |

**Net:** author lessons in the ANSI intersection (joins, CTEs, window functions, aggregation, `INSERT … ON CONFLICT` for upserts), run them on modern browser SQLite, and use short "In the warehouse this differs…" callouts for typing, dates, and `MERGE`/`QUALIFY`.

---

## D. The highest-value competencies for a DE intern (ranked)

These 12 recur across intern JDs and DE interview guides ([Refonte, 2025](https://www.refontelearning.com/blog/entry-level-data-engineering-jobs-in-2025-skills-certifications-you-need); [Datavidhya 80 DE Qs, 2026](https://datavidhya.com/blog/sql-data-engineering-interview-questions/); [InterviewQuery DE guide, 2025](https://www.interviewquery.com/p/data-engineer-interview-questions); [Rethinking Vis, 2025](https://rethinkingvis.com/sql-interview-questions-for-data-engineer-complete-guide-2025/)). They are the load-bearing outcomes for the 4 levels.

1. **Joins mastery** — all types, self-joins, and especially **anti-joins** for "records missing a match"; the backbone of source integration ([Rethinking Vis](https://rethinkingvis.com/sql-interview-questions-for-data-engineer-complete-guide-2025/)).
2. **Aggregation + `GROUP BY`/`HAVING`** — the core of every metric/mart model ([DataCamp SQL Qs](https://www.datacamp.com/blog/top-sql-interview-questions-and-answers-for-beginners-and-intermediate-practitioners)).
3. **CTEs (`WITH`, incl. recursive)** — how DE code is kept readable and modular; explicitly tested in DE interviews ([DEV — CTEs for DE](https://dev.to/gowthampotureddi/cte-in-sql-for-data-engineering-interviews-with-clauses-recursive-ctes-and-window-sql-patterns-2978)).
4. **Window functions** — ranking, `LAG/LEAD`, running totals, moving averages; "modern DE workflows rely heavily" on them ([Medium — 12 DE Qs](https://medium.com/@aicoders/master-sql-window-functions-and-ctes-12-real-data-engineering-interview-questions-with-code-9b42f37c1db1)).
5. **Deduplication / idempotency** — `ROW_NUMBER()` dedup + safe-rerun MERGE/upsert; the #1 real-world pipeline correctness skill ([Data Engineer Academy — MERGE](https://dataengineeracademy.com/blog/sql-merge-for-data-engineers-upserts-cdc-and-idempotent-pipelines/); [Airbyte — idempotency](https://airbyte.com/data-engineering-resources/idempotency-in-data-pipelines)).
6. **Dimensional / star-schema modeling** — facts vs dimensions, declaring **grain**, surrogate keys ([Kimball Group](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/star-schema-olap-cube/); [datadef.io, 2025](https://datadef.io/guides/en/dimensional-modeling)).
7. **Normalization vs denormalization** — 1NF–3NF and knowing when to flatten for analytics ([Holistics — Kimball](https://www.holistics.io/books/setup-analytics/kimball-s-dimensional-data-modeling/)).
8. **Incremental / ELT transforms** — staging→mart layering, `MERGE`/`ON CONFLICT`, partition overwrite ([O'Reilly — AE with SQL & dbt](https://www.oreilly.com/library/view/analytics-engineering-with/9781098142377/)).
9. **Slowly Changing Dimensions (Type 1 & 2)** — history tracking with `valid_from`/`valid_to`/current-flag ([Xebia — SCD2](https://xebia.com/blog/a-practical-guide-to-creating-slowly-changing-dimensions-type-2-in-dbt-part-1/)).
10. **Data-quality testing** — null/duplicate/freshness/referential checks expressed as SQL assertions (the dbt `unique`/`not_null`/`accepted_values`/`relationships` model) ([dbt Developer Hub](https://docs.getdbt.com/docs/build/data-tests); [DataCamp — dbt tests](https://www.datacamp.com/tutorial/dbt-tests)).
11. **`EXPLAIN` / query performance** — reading plans, index seek vs scan, killing full-table scans ([DataCamp — optimization](https://www.datacamp.com/blog/sql-query-optimization); [dbvis](https://www.dbvis.com/thetable/sql-query-optimization-everything-you-need-to-know/)).
12. **Subqueries & set operations** — correlated subqueries, `UNION ALL`, and when each beats a join ([Datavidhya 80 DE Qs](https://datavidhya.com/blog/sql-data-engineering-interview-questions/)).

**Suggested mapping to 4 levels:** L1 = competencies 1–2 + Tier-1/2 foundations; L2 = 3–4, 12 (CTEs, window functions, subqueries); L3 = 6–7, 10 (modeling, normalization, data-quality tests); L4 = 5, 8–9, 11 (idempotent ELT, SCD, performance) — i.e., the Section B tiers, one per level.

---

*Cross-checked across vendor docs (SQLite.org, dbt Labs, Kimball Group, Microsoft Learn), 2024–2026 interview/skills guides (DataCamp, Dataquest, InterviewQuery, Datavidhya, Rethinking Vis), and curriculum sources (O'Reilly *Analytics Engineering with SQL and dbt*, Coursera dbt Specialization, dataskew.io roadmaps).*

---

## Brief 2 — Data-modeling & DE depth

# Data Modeling & DE-with-SQL Brief (Intern L3/L4 Depth)

> Scope: relational design → dimensional modeling → analytical SQL → data-engineering transform patterns. Each section gives the **key concept**, a **tiny SQL snippet**, and a **realistic DE task**. SQL is ANSI-flavored; dialect notes called out where they matter (Postgres / Snowflake / BigQuery).

---

## A. DDL, Constraints, Keys, Indexes

**Key concept.** DDL (`CREATE`/`ALTER`/`DROP`) defines *structure*; constraints enforce *rules the database guarantees for you* so bad data can't land. Learn the four workhorses:

- **Primary key (PK)** — unique + not-null row identity. Prefer a **surrogate** (auto integer / UUID) over a **natural** business key so identity survives source changes.
- **Foreign key (FK)** — a column that must match a PK in another table = referential integrity. `ON DELETE` policy (`RESTRICT` / `CASCADE` / `SET NULL`) decides what happens to children.
- **UNIQUE / NOT NULL / CHECK** — column-level invariants (e.g., `price >= 0`, valid status enum).
- **Index** — a B-tree lookup structure. PKs/UNIQUE are auto-indexed. Add indexes on **FK columns** and on columns used in `WHERE` / `JOIN` / `ORDER BY`. Indexes speed reads but cost write throughput and storage — index selectively.

```sql
CREATE TABLE orders (
  order_id     BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- surrogate PK
  customer_id  BIGINT       NOT NULL REFERENCES customers(customer_id),-- FK
  status       TEXT         NOT NULL CHECK (status IN ('open','paid','shipped','cancelled')),
  total_cents  INTEGER      NOT NULL CHECK (total_cents >= 0),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (customer_id, created_at)               -- business-level uniqueness
);
CREATE INDEX idx_orders_customer ON orders (customer_id);  -- index the FK you'll join on
```

**DE task.** Given a raw ingest table with no keys, write DDL for a cleaned `orders` table with a surrogate PK, an FK to `customers`, a `CHECK` on status, and an index on the FK; document *why* each constraint exists in a schema comment.

---

## B. Normalization — 1NF / 2NF / 3NF (worked example)

**Key concept.** Normalization removes redundancy so a fact is stored **once**, killing update/insert/delete anomalies. Progress form-by-form: **1NF** atomic values (no repeating groups / multi-valued cells), **2NF** no *partial* dependency (non-key column depending on only part of a composite key), **3NF** no *transitive* dependency (non-key column depending on another non-key column). Mnemonic: *"the key, the whole key, and nothing but the key."*

**Start: one denormalized `orders` table (violates 1NF and more):**

| order_id | customer_name | customer_email | items (multi-valued) | product_prices | order_date |
|---|---|---|---|---|---|
| 1001 | Ada Lovelace | ada@x.com | "Keyboard, Mouse" | "45, 20" | 2026-06-01 |

**Step 1 — 1NF:** split the multi-valued `items`/`prices` into one row per line item; every cell atomic. Composite key becomes `(order_id, product_id)`.

| order_id | product_id | customer_name | customer_email | product_name | unit_price | qty | order_date |
|---|---|---|---|---|---|---|---|
| 1001 | P-KB | Ada Lovelace | ada@x.com | Keyboard | 45 | 1 | 2026-06-01 |
| 1001 | P-MO | Ada Lovelace | ada@x.com | Mouse | 20 | 1 | 2026-06-01 |

Problem: customer + product data repeat per line item.

**Step 2 — 2NF:** remove partial dependencies on the composite key `(order_id, product_id)`. `customer_name`, `order_date` depend only on `order_id`; `product_name`, `unit_price` depend only on `product_id`. Split them out.

```sql
-- orders: depends on order_id only
orders(order_id PK, customer_id FK, order_date)
-- products: depends on product_id only
products(product_id PK, product_name, unit_price)
-- order_items: the true composite-key junction (order line grain)
order_items(order_id FK, product_id FK, qty, PRIMARY KEY (order_id, product_id))
```

**Step 3 — 3NF:** remove transitive dependencies. `customer_email` depends on `customer_id`, not on `order_id` → move to its own table.

```sql
customers(customer_id PK, customer_name, customer_email)
```

Now each fact (a customer's email, a product's price, an order's date) lives in exactly one place; changing a price is a single-row update instead of a scan-and-fix.

**DE task.** Take a flat CSV export of a "sales spreadsheet" (one wide row per order with comma-packed items), and write the `INSERT ... SELECT` statements that split it into `customers`, `products`, `orders`, `order_items` — deduplicating customers by email along the way.

---

## C. ER Modeling, Cardinalities, Junction Tables

**Key concept.** An **entity** is a noun you store (customer, order, product); a **relationship** connects entities with a **cardinality**:

- **1:1** — rare; often a table split (user ↔ user_profile).
- **1:N** — the common case; the "many" side holds the FK (one customer → many orders → `orders.customer_id`).
- **M:N** — cannot be modeled with a single FK. Resolve with a **junction (associative/bridge) table** whose PK is the pair of FKs; it can also carry relationship attributes.

```sql
-- M:N: a student takes many courses; a course has many students
CREATE TABLE enrollments (
  student_id BIGINT REFERENCES students(student_id),
  course_id  BIGINT REFERENCES courses(course_id),
  enrolled_at DATE NOT NULL,                    -- relationship attribute
  grade       TEXT,
  PRIMARY KEY (student_id, course_id)           -- composite PK enforces "one enrollment per pair"
);
```

`order_items` from Section B is itself a junction table (orders M:N products). Read cardinality off the crow's-foot diagram: the `_id` FK always sits on the **many** side.

**DE task.** Design the ER model for a "playlists ↔ songs" feature (a song appears in many playlists; a playlist has many songs, ordered). Deliver the three tables + the junction table with a `position` column, and explain why `position` belongs on the junction, not on `songs`.

---

## D. Dimensional Modeling — Facts, Dimensions, Star vs Snowflake, Grain, Surrogate Keys

**Key concept.** OLTP normalizes for safe writes; analytics **denormalizes for fast reads**. The Kimball star schema splits data into:

- **Fact table** — the events/measurements. Mostly **numeric measures** (`quantity`, `revenue`) + **FKs** to dimensions. Long and narrow.
- **Dimension tables** — the descriptive "who / what / where / when" context (customer, product, date, store). Wide and short.
- **Grain** — *decide first*: what does **one fact row** mean? "One row per order line item" vs "one row per customer per day." Every column choice follows from grain; a vague grain is the #1 modeling bug.
- **Surrogate keys** — integer keys on every dimension, independent of source natural keys. They make joins fast **and** are what makes SCD Type 2 history possible (see G).
- **Star vs Snowflake** — **star** keeps each dimension flat/denormalized (fewer joins, simpler, faster — the default). **Snowflake** normalizes a dimension into sub-tables (product → category → department). Kimball's guidance: **don't snowflake unless a dimension is genuinely huge/volatile** — it adds joins and hurts BI usability.

```sql
CREATE TABLE dim_product (
  product_sk   BIGINT PRIMARY KEY,      -- surrogate key
  product_id   TEXT NOT NULL,           -- natural/business key kept as attribute
  product_name TEXT, category TEXT      -- denormalized (star), not a separate table
);

CREATE TABLE fact_sales (               -- grain: ONE ROW PER ORDER LINE ITEM
  date_sk     INT    REFERENCES dim_date(date_sk),
  product_sk  BIGINT REFERENCES dim_product(product_sk),
  customer_sk BIGINT REFERENCES dim_customer(customer_sk),
  quantity    INT,
  revenue_cents BIGINT                  -- additive measure
);
```

**DE task.** Convert the normalized OLTP schema from Section B into a star schema: build `dim_customer`, `dim_product`, `dim_date`, and `fact_sales` at line-item grain. Write one BI query on top ("revenue by category by month") and note how few joins it needs vs the OLTP version.

---

## E. Window Functions

**Key concept.** Window functions compute across a set of rows **related to the current row without collapsing them** (unlike `GROUP BY`). Anatomy: `func() OVER (PARTITION BY … ORDER BY … [frame])`. `PARTITION BY` = per-group; `ORDER BY` = ordering within the window; the **frame** (`ROWS BETWEEN …`) defines running/moving windows.

**Ranking — tie handling is the exam question:** for values `100, 100, 90`
- `ROW_NUMBER` → `1, 2, 3` (always unique; use for dedup / "pick one")
- `RANK` → `1, 1, 3` (ties share, **then skips**)
- `DENSE_RANK` → `1, 1, 2` (ties share, **no gaps**)

**Offset:** `LAG` = previous row, `LEAD` = next row (period-over-period without a self-join).

```sql
SELECT
  customer_id, order_date, revenue,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date)      AS seq,
  LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_date)      AS prev_rev,
  revenue
    - LAG(revenue) OVER (PARTITION BY customer_id ORDER BY order_date)  AS delta,
  SUM(revenue) OVER (PARTITION BY customer_id ORDER BY order_date
                     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)  AS running_total,
  AVG(revenue) OVER (PARTITION BY customer_id ORDER BY order_date
                     ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)          AS moving_avg_7
FROM fact_sales_by_day;
```

Note: an ordered `SUM() OVER` = **running total**; the same without `ORDER BY` = the **grand total** (handy for `revenue / SUM(revenue) OVER ()` = percent of total).

**DE task.** Build a "customer revenue trend" mart: per customer, a running lifetime-revenue column, a 7-day moving average, and month-over-month delta via `LAG`. Flag customers whose latest month dropped >30% vs prior.

---

## F. CTEs, Including Recursive

**Key concept.** A **CTE** (`WITH name AS (…)`) names a subquery so pipelines read top-to-bottom instead of nesting inside-out — the readability backbone of dbt models. A **recursive CTE** (`WITH RECURSIVE`) walks hierarchies/graphs (org charts, category trees, bill-of-materials) and has three parts: an **anchor** (base rows), `UNION ALL`, a **recursive member** referencing the CTE, and a **termination condition** so it stops.

```sql
-- Non-recursive: staged, readable transform
WITH paid AS (
  SELECT * FROM orders WHERE status = 'paid'
),
per_customer AS (
  SELECT customer_id, SUM(total_cents) AS lifetime FROM paid GROUP BY customer_id
)
SELECT * FROM per_customer WHERE lifetime > 100000;

-- Recursive: walk an employee -> manager hierarchy
WITH RECURSIVE org AS (
  SELECT employee_id, manager_id, name, 1 AS depth        -- anchor: top of tree
  FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.employee_id, e.manager_id, e.name, org.depth+1 -- recursive member
  FROM employees e JOIN org ON e.manager_id = org.employee_id
  WHERE org.depth < 20                                    -- termination guard
)
SELECT * FROM org ORDER BY depth;
```

(MySQL/Postgres/SQLite require the `RECURSIVE` keyword; SQL Server omits it. Anchor and recursive members must have matching column count/types, and `UNION ALL` is the connector.)

**DE task.** Given a `categories(category_id, parent_id, name)` self-referencing table, use a recursive CTE to produce each category's full path (`Electronics > Audio > Headphones`) and depth, to power breadcrumb navigation in a catalog mart.

---

## G. DE Patterns — Dedup, SCD, Incremental/Idempotent, Data Quality, EXPLAIN

**G1 — Deduplication.** Standard pattern: rank rows within a business key, keep rank 1. Use `QUALIFY` on Snowflake/BigQuery; a subquery elsewhere.

```sql
-- Keep latest row per natural key (Snowflake/BigQuery)
SELECT * FROM raw_customers
QUALIFY ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) = 1;
-- Portable form: wrap in a subquery and filter WHERE rn = 1
```

**G2 — SCD Type 1 vs Type 2.** How dimensions handle *changing attributes* (customer moves city):
- **Type 1 — overwrite.** No history; just update in place. Use for corrections/typos. Surrogate key optional.
- **Type 2 — new row.** Preserve history: expire the old row, insert a new one with a **new surrogate key**, `effective_from` / `effective_to` dates, and an `is_current` flag. Facts join to the surrogate key valid *as of the event date*, so old facts keep old context. Type 2 is the analytics default; **surrogate keys are mandatory** because the natural key now repeats across versions.

```sql
-- Type 2: a customer changed city -> close old version, open new one
UPDATE dim_customer
SET effective_to = CURRENT_DATE, is_current = FALSE
WHERE customer_id = 42 AND is_current = TRUE;

INSERT INTO dim_customer (customer_sk, customer_id, city, effective_from, effective_to, is_current)
VALUES (nextval('cust_sk'), 42, 'Berlin', CURRENT_DATE, NULL, TRUE);
```

**G3 — Incremental & idempotent transforms.** Reprocessing everything is slow/costly; process only new/changed rows — but the transform must be **idempotent** (re-running yields the same result, no dupes). The safe primitive is `MERGE`/upsert keyed on a `unique_key` (this is exactly dbt's `incremental_strategy='merge'` + `unique_key`). Use a high-water mark (`WHERE updated_at > (SELECT max(updated_at) FROM target)`) to pick up only new source rows; keep a `--full-refresh` escape hatch for logic changes.

```sql
MERGE INTO dim_customer AS t
USING staging_customers AS s ON t.customer_id = s.customer_id      -- unique_key
WHEN MATCHED THEN UPDATE SET city = s.city, updated_at = s.updated_at
WHEN NOT MATCHED THEN INSERT (customer_id, city, updated_at)
                       VALUES (s.customer_id, s.city, s.updated_at);
```

**G4 — Data-quality assertions.** Encode expectations as tests that fail the pipeline before bad data spreads: **not-null**, **unique**, **accepted values**, **referential integrity (relationships)**, **freshness/row-count** anomalies. In dbt these are schema tests (`unique`, `not_null`, `accepted_values`, `relationships`); in raw SQL they're "count of violations should be 0" queries wired into CI.

```sql
-- Assertion: a fact FK must exist in its dimension (returns 0 rows if healthy)
SELECT f.product_sk FROM fact_sales f
LEFT JOIN dim_product d ON f.product_sk = d.product_sk
WHERE d.product_sk IS NULL;
```

**G5 — EXPLAIN & perf basics.** `EXPLAIN` (add `ANALYZE` on Postgres to actually run it) shows the planner's chosen operations and cost. Read for:
- **Seek/Index Scan vs full Table/Seq Scan** — a *seek* jumps to matching rows via a B-tree (cheap, few logical reads); a *full scan* reads every row (fine for "most rows," a red flag for a selective `WHERE`). Missing index on a filter/join column is the classic cause of an unexpected scan.
- **Join strategy** — nested-loop (small/indexed) vs hash join (large unindexed); watch for row-estimate blowups from stale statistics.
- **Fix loop:** index the filtered/joined column, keep predicates *sargable* (avoid wrapping the column in a function, e.g. `WHERE date_col >= '2026-01-01'` not `WHERE year(date_col)=2026`), and only cover what queries actually need.

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 42;   -- want "Index Scan on idx_orders_customer", not "Seq Scan"
```

**DE task.** Build a Type 2 SCD loader for `dim_customer` from a daily source dump: dedup the source to one row per customer (G1), `MERGE` changes as expire-and-insert (G2/G3), add three data-quality assertions — PK unique, exactly one `is_current=TRUE` per `customer_id`, no orphan FKs from `fact_sales` (G4) — and run `EXPLAIN ANALYZE` on the fact→dim join to confirm it's a seek, adding an index if it isn't (G5).

---

### Cross-checked against
- Normalization: [freeCodeCamp](https://www.freecodecamp.org/news/database-normalization-1nf-2nf-3nf-table-examples/), [DigitalOcean](https://www.digitalocean.com/community/tutorials/database-normalization), [Dataquest](https://www.dataquest.io/blog/sql-normalization/)
- SCD: [Wikipedia](https://en.wikipedia.org/wiki/Slowly_changing_dimension), [SQLShack](https://www.sqlshack.com/implementing-slowly-changing-dimensions-scds-in-data-warehouses/), [Medium/Kazartsev](https://medium.com/@kazarmax/scd-types-explained-with-sql-a-guide-for-data-engineers-a26a07cf5c60)
- Dimensional modeling: [Star schema — Wikipedia](https://en.wikipedia.org/wiki/Star_schema), [dbt: Kimball model](https://docs.getdbt.com/blog/kimball-dimensional-model), [datadef.io guide](https://datadef.io/guides/en/dimensional-modeling)
- Window functions: [SQLNoir](https://www.sqlnoir.com/blog/sql-window-functions), [DataLemur](https://datalemur.com/sql-tutorial/sql-rank-dense_rank-row_number-window-function), [MySQL docs](https://dev.mysql.com/doc/refman/9.6/en/window-function-descriptions.html)
- Recursive CTEs: [Microsoft Learn](https://learn.microsoft.com/en-us/sql/t-sql/queries/recursive-common-table-expression-transact-sql), [LearnSQL](https://learnsql.com/blog/sql-recursive-cte/)
- ELT/dbt/incremental: [dbt: ETL vs ELT](https://www.getdbt.com/blog/etl-vs-elt), [dbt: incremental strategy](https://docs.getdbt.com/docs/build/incremental-strategy), [dbt: unique_key](https://docs.getdbt.com/reference/resource-configs/unique_key)
- Perf/dedup: [use-the-index-luke](https://use-the-index-luke.com/sql/explain-plan/sql-server/operations), [MS Learn: remove duplicates](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/development/remove-duplicate-rows-sql-server-tab)

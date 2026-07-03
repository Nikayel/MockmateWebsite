# Learn SQL & Databases — curriculum pack

A **data-engineering-intern-focused** SQL & data-modeling course for CodeSparring, designed to run on
the **existing Learn-Python machinery** (same content tree, registry, progress collection, 3-column
Lesson Player, and client-side execution model). This folder is the planning + authoring pack — it
mirrors `docs/python-curriculum/` so the two courses read the same way.

> **Design thesis: reuse, don't rebuild.** Learn-Python is already a course-shaped engine. SQL is
> *another language plugged into that engine*, not a second engine. The **only** genuinely new
> subsystem is a SQLite-in-the-browser runner (`sql.js`) that emits the **byte-identical**
> `__WORKSPACE_TEST_RESULTS__:` marker the Python workspace runner already emits — so the registry,
> progress, Lesson Player, `useExerciseRun`, and results UI are reused with near-zero change. See
> [`SPEC.md`](./SPEC.md) §0.

## What's in this folder

| File | What it is |
|------|------------|
| [`SPEC.md`](./SPEC.md) | **Technical spec** — the reuse-vs-build map, the new `sql-sandbox/` runner, the single-query & workspace grading contracts, UI/persistence/route reuse, build order, and Definition of Done. Mirrors `docs/python-curriculum/ARCHITECTURE.md`. |
| [`CONTENT.md`](./CONTENT.md) | **The course content** — all 4 levels, every lesson authored as **Read → Apply → Practice** with data-engineering framing (source tables, dims/facts, warehouse transforms). This is what a content author ships into `lib/tutorials/sql/curriculum/levelN/`. |
| [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md) | The one-page **taxonomy** — every level → module → lesson with a one-line Read/Apply/Practice note. The contract the content + spec were built against. |
| [`RESEARCH.md`](./RESEARCH.md) | The web-grounded research that shaped the curriculum: what a DE intern is expected to know, the SQL skill taxonomy, and data-modeling / DE depth (normalization, dimensional modeling, window functions, SCD, ELT). |

Related: [`../python-curriculum/CURRICULUM-GAP-ANALYSIS.md`](../python-curriculum/CURRICULUM-GAP-ANALYSIS.md)
— the audit of what the **Python** course is missing (produced in the same pass).

## The four levels (same Read → Apply → Practice spine at increasing depth)

| Lvl | Title | Mode | Lessons | What a DE intern learns |
|----|-------|------|--------|--------------------------|
| 1 | **Foundations — Reading Source Data** | single-query | 11 | `SELECT`/`WHERE`/`ORDER BY`/`DISTINCT`/`LIMIT`, expressions & aliases, string/date/cast functions, `NULL` logic, `IN`/`BETWEEN`/`LIKE`, boolean logic — querying raw source tables. |
| 2 | **Aggregation & Joins — Combining Source Data** | single-query | 11 | aggregates, `GROUP BY`/`HAVING`, all join types + anti-joins + self-joins, subqueries, CTEs, set ops, `CASE` — building metrics across fact/dimension-shaped tables. |
| 3 | **Data Modeling & Schema Design** | script / workspace | 12 | DDL, keys & constraints, normalization (1NF→3NF), cardinality & junction tables, indexes, denormalization trade-offs, and a dimensional-modeling intro — designing OLTP + analytics schemas. |
| 4 | **Data Engineering with SQL** | script / workspace | 12 | window functions (ranking/offset/frames), recursive CTEs, dedup, SCD type 1 & 2, idempotent merge/upsert, data-quality assertions, `EXPLAIN`, a star-schema build, and a capstone — warehouse transforms. |

**46 lessons total.** L1/L2 are graded by result-set comparison against a seeded SQLite DB; L3/L4 are
graded by hidden assertion queries (dbt-style "count of violations = 0") run after the learner's
multi-statement script — the same protocol the Python workspace lessons use.

## Engine & portability

Runs entirely client-side on **SQLite via `sql.js`** (WASM) — free, no quota, page is auth-gated
(identical cost model to Python). SQL is authored in the **ANSI-portable** intersection; every place
warehouse SQL (Postgres / Snowflake / BigQuery) diverges from SQLite is flagged inline in the Read as
an *"In the warehouse this differs…"* callout, so the intern learns transferable SQL.

## How to build it

Follow `SPEC.md` §8 (runner-first thin vertical slice → generalize types → registry/routes/auth → UI
polish → author content L1→L4). New npm deps: `sql.js` and `@codemirror/lang-sql`. New code is one
runner directory + one worker + one results-grid sub-component + ~6 lines of union/dispatch widening;
everything else is reuse.

## Status

Planning + authored-content pack (docs only — no application code changed yet). Produced by a
multi-agent research + authoring pass. The content is drafted to the schema in `SPEC.md`; before
shipping, each lesson's seed SQL, reference solution, and assertions must be run green on the `sql.js`
runner (the runner is the first build step).

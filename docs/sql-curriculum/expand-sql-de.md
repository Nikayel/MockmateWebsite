# Level 5 — Advanced & Company-Specific SQL for DE Interviews (expand-sql-de)

The Pareto ~8 hour capstone that sits on top of L1-L4. A learner who has finished the first four levels can read a source table, aggregate and join it, model a schema, and ship an idempotent Type-2 loader. That is enough to pass the easy half of a Data Engineering intern loop. It is not enough to pass the half that actually filters candidates: the live SQL power screen (gaps-and-islands, sessionization, cohort retention, funnels), the warehouse and modeling round (JSON/VARIANT, advanced fact grains, as-of joins, join fan-out), the streaming and pipeline round (CDC apply, watermark incremental loads, write-audit-publish quality gates), and the DE system-design round. Level 5 teaches that frontier.

Everything here runs and grades on the **same sql.js engine (SQLite 3.49.1 compiled to WASM)** the first four levels use. There is no Snowflake, BigQuery, Spark, or Kafka at runtime. Company-specific and warehouse-specific material is therefore taught by one of two authorable patterns, and every lesson declares which it uses:

- **runnable-equivalent**: teach the transferable concept using the SQLite feature that stands in for the warehouse one (json_each for LATERAL FLATTEN, INSERT ... ON CONFLICT + DELETE for a multi-action MERGE, LAG + cumulative-sum for a Flink session window, EXPLAIN QUERY PLAN for micro-partition pruning). The learner writes real SQL that executes and is graded; a heavy "In the warehouse this differs" callout maps it to Snowflake/BigQuery/Databricks/Kafka.
- **concept-check**: the mechanism itself cannot execute in SQLite (Kafka offsets, Spark shuffle, micro-partitions), so the Read explains it, and the Apply/Practice still grade a real SELECT that exercises the reasoning (compute consumer lag from an offsets table, write the sargable predicate that prunes). We never ship a pure-prose lesson with no gradable exercise.

The level structure mirrors the four rounds of a real DE interview loop, so each module is a rehearsal of a round the candidate will sit. Every lesson keeps the L1-L4 Read -> Apply -> Practice shape.

- **id:** `5`
- **slug:** `advanced-company-sql`
- **title:** Advanced & Company-Specific SQL for DE Interviews
- **tagline:** Rehearse the four rounds of a Data Engineering loop as graded SQL: the power screen, the modeling round, the pipeline round, and the system-design round.
- **audience:** A DE intern / new-grad candidate who has completed L1-L4 and is now preparing for on-site loops at data-heavy companies.
- **estimatedHours:** `8`
- **defaultExecutionMode:** `single-file` (nine lessons are single-file `SELECT` grading; five workspace lessons declare `workspace` on their exercises)

---

## Interview-level triage: what an intern is actually expected to know

The whole course is a trojan horse. It reads as "learn SQL," but every lesson is chosen to move a candidate through a Data Engineering **intern** loop. That framing forces one honest question about Level 5: an intern is not expected to know all of it. Some of this is true intern table-stakes; the rest is new-grad and full-time DE material that an intern who learns it uses to punch above their level. Both belong in the course, but the learner should know which is which so they spend nervous pre-interview hours on the right rows. **Nothing below is cut.** These are labels, not deletions.

Three tiers, tagged on every lesson:

- **Intern-core.** Table-stakes for a DE intern live SQL screen. If a candidate cannot do these, the intern loop fails them. Study these first and until they are automatic.
- **Intern-stretch.** The hard end of an intern screen and the normal middle of a new-grad loop. An intern is rarely failed for missing these, but nailing them is the difference between "fine" and "obvious hire." Reach for them once Intern-core is solid.
- **Junior-to-Senior.** Genuinely above the intern bar: the modeling round, the pipeline round, and the system-design round that full-time DE candidates (new-grad through senior) sit. Included on purpose as the trojan horse's upside, not because an intern must have it. High leverage for converting an internship into a return offer, and for the new-grad loop a year later.

Read by module, the level climbs exactly as the interview loop does:

- **Module 5.1 (the live SQL power screen) is all Intern-core.** This is the round an intern actually sits, and gaps-and-islands / sessionization / cohort / funnel / window-frames are the exact patterns that filter that screen. Every row earns its place at the intern bar.
- **Module 5.2 (modeling round) is mixed.** JSON scalar extraction and join fan-out double-counting are intern-reachable; the accumulating-snapshot fact and the as-of SCD2 join are junior-and-up modeling asks that interns almost never get.
- **Module 5.3 (pipeline round) is Junior-to-Senior.** CDC apply, watermark incremental plus backfill, and write-audit-publish gates are real pipeline-engineering work. Interns are seldom asked to implement them; new-grad and full-time DE candidates are.
- **Module 5.4 (system-design round) is Junior-to-Senior.** Interns are rarely given a full system-design round at all. This module exists to build the vocabulary early and to carry the medallion capstone that ties the level together.

Practical order for someone with an intern loop next week: finish Module 5.1 cold, then do the Intern-stretch rows of 5.2 (JSON, join fan-out), and treat 5.3, 5.4, and the accumulating-snapshot / as-of lessons as return-offer and new-grad preparation to reach for once the intern-core screen is safe.

### Per-lesson level tags

| Lesson | Module | Difficulty (as authored) | Interview level | Why this tier |
|---|---|---|---|---|
| `gaps-and-islands` | 5.1 | hard | **Intern-core** | The single most-failed screen pattern; the highest-ROI row in the level. |
| `sessionization` | 5.1 | hard | **Intern-core** | Standard analytics-SQL screen question (LAG gap plus cumulative flag). |
| `cohort-retention` | 5.1 | hard | **Intern-core** | Product-analytics screen staple; the denominator trap is the filter. |
| `funnel-conversion` | 5.1 | medium | **Intern-core** | Conditional-aggregation screen staple. |
| `window-frames-and-qualify` | 5.1 | hard | **Intern-core** | Upper-intern depth; ROWS vs RANGE and the LAST_VALUE trap are fair game on the screen. |
| `json-variant-flatten` | 5.2 | hard | **Intern-stretch** | Scalar extraction is intern-core; the array fan-out and double-count trap lean new-grad. |
| `join-fan-out-and-skew` | 5.2 | hard | **Intern-stretch** | Fan-out double-counting is intern-reachable; the skew / salting / broadcast note is senior distributed-systems flavor. |
| `as-of-scd2-join` | 5.2 | medium | **Intern-stretch / Junior** | Builds on L4 SCD2; a junior modeling-round ask, reachable for a strong intern. |
| `fact-grains-accumulating-snapshot` | 5.2 | hard | **Junior-to-Senior** | The most-asked *advanced* fact question, but advanced-fact modeling sits above the intern bar. |
| `cdc-changelog-apply` | 5.3 | hard | **Junior-to-Senior** | Pipeline-round CDC implementation; interns rarely build this. |
| `incremental-watermark-backfill` | 5.3 | hard | **Junior-to-Senior** | Pipeline-engineering incremental and backfill design; new-grad and up. |
| `data-quality-gates` | 5.3 | medium | **Junior** | Write-audit-publish is a junior/mid operational responsibility beyond intern scope. |
| `system-design-round-reasoning` | 5.4 | hard | **Junior-to-Senior** | System-design rounds are seldom given to interns. |
| `medallion-streaming-capstone` | 5.4 | hard | **Junior-to-Senior** | Integrative take-home-style build; inherits the pipeline and system-design level. |

Verdict: **5 of 14 are true intern table-stakes** (all of Module 5.1), **3 are intern-stretch** (JSON, join fan-out, as-of), and **6 are junior-to-senior** (accumulating snapshot, the whole pipeline round, and the whole system-design round). The trojan horse still works: an intern grinds Module 5.1 to pass the screen, then keeps the rest loaded as the return-offer and new-grad track.

---

## What L1-L4 already cover, and what Level 5 adds

**Do not re-teach these (already shipped in L1-L4).** SELECT / WHERE / NULL logic / CAST / strings / dates (L1). COUNT/SUM/AVG, GROUP BY, HAVING, INNER/LEFT/RIGHT/FULL joins, anti-joins, self-joins, UNION/INTERSECT/EXCEPT, subqueries, CTEs, CASE + basic conditional aggregation (L2). CREATE TABLE, INSERT ... SELECT, primary/foreign keys, UNIQUE/NOT NULL/CHECK, 1NF/2NF/3NF, denormalization, ER modeling, junction tables, B-tree indexes, the first star schema (L3). Window ranking (ROW_NUMBER/RANK/DENSE_RANK), LAG/LEAD, basic ROWS frames (running totals, moving averages, percent-of-total), recursive CTEs, star-schema load, SCD Type 1, SCD Type 2, deduplication (ROW_NUMBER keep-latest), idempotent upsert (ON CONFLICT, run-twice-same-count), the dbt four data-quality tests, EXPLAIN QUERY PLAN seek-vs-scan and sargable predicates (L4).

**The new frontier Level 5 adds (absent everywhere below L5).**

| Gap | Where L5 covers it |
|---|---|
| Gaps-and-islands / consecutive-run detection | `sql-l5-gaps-and-islands` |
| Sessionization (LAG-gap + cumulative-flag session id) | `sql-l5-sessionization` |
| Cohort retention and the denominator trap | `sql-l5-cohort-retention` |
| Funnel / step-conversion with monotonic ordering | `sql-l5-funnel-conversion` |
| Advanced window frames (LAST_VALUE trap, ROWS vs RANGE, NTILE) and the QUALIFY rewrite | `sql-l5-window-frames-and-qualify` |
| Semi-structured JSON / VARIANT extraction and array fan-out | `sql-l5-json-variant-flatten` |
| Accumulating-snapshot fact grain (UPDATE-in-place, milestone lags) | `sql-l5-fact-grains-accumulating-snapshot` |
| Point-in-time (as-of) joins against an SCD2 dimension | `sql-l5-as-of-scd2-join` |
| Join fan-out detection and metric consistency, skew reasoning | `sql-l5-join-fan-out-and-skew` |
| CDC changelog apply with deletes and version ordering | `sql-l5-cdc-changelog-apply` |
| High-water-mark incremental extraction and safe backfill | `sql-l5-incremental-watermark-backfill` |
| Write-audit-publish blocking quality gates (freshness/volume/null-rate) | `sql-l5-data-quality-gates` |
| System-design reasoning: pruning, tumbling windows, consumer lag, DAG deps | `sql-l5-system-design-round-reasoning` |
| End-to-end medallion capstone (JSON -> sessionize -> incremental -> DQ) | `sql-l5-medallion-streaming-capstone` |

---

## The Pareto bet (why these topics)

This is the 30% of advanced and company-specific material that returns roughly 70% of the interview payoff, because every lesson was selected against three converging signals in the research.

1. **Documented pass/fail frequency on the live screen.** Gaps-and-islands is repeatedly named the single most-failed SQL pattern ("master this and you have conquered 30% of SQL interviews"). Cohort retention is where under 30% of candidates write a correct Day-N query because they corrupt the denominator. Sessionization and funnels are the other repeatedly named filters.
2. **Largest gaps versus L1-L4.** Semi-structured JSON/VARIANT, the incremental/watermark loop, CDC-with-deletes, the accumulating-snapshot and as-of SCD2 asks, write-audit-publish gates, and streaming/system-design reasoning are all entirely absent below L5.
3. **Engine feasibility.** Every lesson is a real graded SQLite exercise, not un-gradable prose. Warehouse-only features are taught through the SQLite feature that stands in for them, with a heavy warehouse callout, so company coverage is broad without leaving the engine.

### What we deliberately CUT and why

Ruthless cuts, so the level stays at ~8 hours and every minute earns its place:

- **Native ROLLUP / QUALIFY / PIVOT / GROUPING SETS syntax drills.** These error on sql.js. The transferable payload (conditional aggregation for pivot, UNION ALL for rollup, the subquery-then-filter rewrite for QUALIFY) is folded into the window-frames and join-fan-out lessons as callouts rather than given standalone lessons.
- **Statistical functions (median via PERCENTILE_CONT, variance, stddev, regression).** The math extension (pow/sqrt/ln/exp/stddev) is not compiled in this sql.js build, so any variance/regression content is impossible and is dropped rather than faked. NTILE bucketing survives inside the window-frames lesson because it does run.
- **Niche modeling.** Data Vault hub/link/satellite, activity-schema single-table modeling, SCD Type 3 and Type 6, bridge tables with allocation factors, periodic-snapshot facts. Real but lower-frequency for an intern loop; the two highest-ROI advanced fact topics (accumulating snapshot, as-of SCD2 join) are kept and the rest are cut.
- **Deep infra internals.** Kafka rebalance/consumer-group mechanics and Spark shuffle/executor tuning are compressed to a single concept-check each (consumer lag, hot-key detection) rather than expanded, because only the SQL-shaped diagnostic is gradable.
- **Materialized-view refresh, warehouse compute sizing (virtual warehouses vs slots), zero-copy clone, columnar cost-model quizzes.** Lower yield for an intern; the one durable idea (a sargable predicate prunes and cuts bytes scanned) lives inside the system-design lesson.
- **Any pure-prose lesson.** If a topic cannot be reduced to a runnable SELECT or a workspace script with zero-violation assertions, it moves to the "Beyond this course" appendix instead of becoming a graded lesson.

---

## Level 5 curriculum map

Grading modes: `single-file` = learner writes one SELECT, graded by multiset compare of the result set against the reference run through the same sql.js WASM. `workspace` = learner writes a multi-statement DDL+DML script, graded by hidden assertion queries that return the offending rows (zero rows = pass), optionally re-run twice for idempotency. Author pattern is `runnable-equivalent` unless marked `concept-check`.

### Module 5.1 — Round 1: The Advanced SQL Power Round (the live SQL screen)

Goal: rehearse the analytics-in-SQL problems that filter most DE candidates on the live screen.

**Interview level: all five are Intern-core.** The live screen an intern actually sits; grind these first and until they are automatic.

| id | title | skills (stack tag first) | companies | pattern | grading | est | Read / Apply / Practice |
|---|---|---|---|---|---|---|---|
| `sql-l5-gaps-and-islands` | Gaps and Islands: Consecutive Streaks and Run Detection | product-analytics; ROW_NUMBER, gaps-and-islands, streak detection, date arithmetic, GROUP BY on derived key | Meta, Amazon, Google, Databricks, Stripe | runnable-equivalent | single-file | 42m | R: the flag-then-running-sum island template. A: longest login streak per user. P: price-unchanged date ranges. |
| `sql-l5-sessionization` | Sessionization: Grouping Events with an Inactivity Timeout | streaming; LAG, cumulative-sum flag, event-time windowing, session_id assignment | Meta, Google, Amazon, Netflix, Uber, DoorDash | runnable-equivalent | single-file | 36m | R: LAG gap -> new-session flag -> running SUM session id. A: assign session_id (30-min gap). P: one row per session with duration. |
| `sql-l5-cohort-retention` | Cohort Retention and the Denominator Trap | product-analytics; cohort analysis, Day-N retention, LEFT JOIN denominator, COUNT(DISTINCT) | Meta, Amazon, Netflix, Spotify, DoorDash | runnable-equivalent | single-file | 38m | R: anchor on MIN(event_date), keep full cohort via LEFT JOIN. A: Day-7 retention per weekly cohort. P: retention triangle weeks 0-4. |
| `sql-l5-funnel-conversion` | Funnel and Conversion Analysis | product-analytics; conditional aggregation, MAX(CASE), step flags, step ordering, conversion rate | Meta, Amazon, DoorDash, Uber, Airbnb | runnable-equivalent | single-file | 28m | R: MAX(CASE) step flags with monotonic ordering. A: users per step + conversion from prior. P: step-to-step conversion rate. |
| `sql-l5-window-frames-and-qualify` | Advanced Window Frames and the QUALIFY Rewrite | product-analytics; ROWS vs RANGE, LAST_VALUE frame trap, NTILE, named WINDOW, subquery filter, top-N-per-group | Amazon, Meta, Bloomberg, Snowflake, Google, Databricks | runnable-equivalent | single-file | 30m | R: LAST_VALUE default-frame trap, ROWS vs RANGE on ties, window not allowed in WHERE. A: true partition-final value + latest row per region. P: NTILE(4) quartiles with a named WINDOW. |

Module total: **174m**

### Module 5.2 — Round 2: The Warehouse and Modeling Round

Goal: rehearse the modeling-round asks on a Snowflake/BigQuery/Databricks-shaped stack.

**Interview level: mixed.** JSON extraction and join fan-out are Intern-stretch; the accumulating-snapshot fact and the as-of SCD2 join are Junior-to-Senior modeling asks an intern almost never gets.

| id | title | skills (stack tag first) | companies | pattern | grading | est | Read / Apply / Practice |
|---|---|---|---|---|---|---|---|
| `sql-l5-json-variant-flatten` | Semi-Structured Data: JSON/VARIANT Extraction and Array Flattening | snowflake-warehouse; json_extract, ->> operator, json_each, array fan-out, double-count trap | Snowflake, Databricks, BigQuery, Stripe, Datadog, Amazon | runnable-equivalent | single-file | 36m | R: scalar projection + json_each array fan-out + the double-count trap. A: shred country and amount from payload. P: total quantity per sku, exploding in isolation. |
| `sql-l5-fact-grains-accumulating-snapshot` | Fact Grains: The Accumulating Snapshot and UPDATE-in-Place | snowflake-warehouse; fact-table grains, accumulating snapshot, UPDATE-in-place, milestone lag durations, idempotent rebuild | Amazon, Uber, DoorDash, Instacart | runnable-equivalent | workspace | 32m | R: three grains; the one fact that updates in place. A: build + UPDATE fct_order_pipeline with milestone lags. P: hidden assertions on grain, non-negative lag, idempotency. |
| `sql-l5-as-of-scd2-join` | Point-in-Time (As-Of) Joins Against an SCD2 Dimension | snowflake-warehouse; point-in-time join, SCD2 history, effective_from/to range predicate, late-arriving fact | Stripe, Airbnb, Uber, Capital One | runnable-equivalent | single-file | 28m | R: join to the version valid at event time, not is_current. A: attach region current on order date. P: revenue by as-was vs current region. |
| `sql-l5-join-fan-out-and-skew` | Join Fan-Out and Data Skew: Diagnose, Fix, and Keep Metrics Consistent | lakehouse; join fan-out, grain-first pre-aggregation, define-metric-once CTE, hot-key detection, skew reasoning | Meta, Uber, Databricks, Netflix, Airbnb, LinkedIn | runnable-equivalent | single-file | 28m | R: fan-out inflates SUM; fix by aggregating to grain in a CTE; metric-once across two cuts. A: correct revenue per region, no double-count. P: list fan-out keys ordered by count (hot-key diagnostic). |

Module total: **124m**

### Module 5.3 — Round 3: The Streaming and Pipeline Round

Goal: rehearse the operational reasoning the pipeline round scores.

**Interview level: Junior-to-Senior.** Pipeline-engineering work (CDC apply, watermark incremental and backfill, write-audit-publish gates) that interns are seldom asked to implement; new-grad and full-time DE candidates are. Kept as the trojan horse's return-offer upside.

| id | title | skills (stack tag first) | companies | pattern | grading | est | Read / Apply / Practice |
|---|---|---|---|---|---|---|---|
| `sql-l5-cdc-changelog-apply` | CDC Changelog Apply: MERGE-Shaped Upsert with Deletes and Version Ordering | streaming; CDC change stream, ROW_NUMBER latest-per-key, ON CONFLICT upsert, tombstone delete, last-write-wins, idempotency | Amazon, Databricks, Instacart, Uber, Confluent, Netflix | runnable-equivalent | workspace | 38m | R: dedup to latest version, upsert I/U, delete D; the duplicate-source trap. A: apply a changelog to match last-write-wins end state. P: hidden assertions on end state, deletes, one-row-per-key, idempotency. |
| `sql-l5-incremental-watermark-backfill` | High-Water-Mark Incremental Extraction and Safe Backfill | dbt-orchestration; high-water-mark, watermark state table, atomic staging swap, partition-overwrite backfill, late-arriving lookback, idempotency | Netflix, Uber, Airbnb, Stripe, Amazon, Lyft | runnable-equivalent | workspace | 40m | R: full refresh vs watermark vs CDC; > vs >=; lookback; atomic swap + partition overwrite. A: incremental load + partition-overwrite backfill in one transaction. P: hidden assertions on no dup keys, per-partition idempotency, late-row recovery. |
| `sql-l5-data-quality-gates` | Write-Audit-Publish: Freshness, Volume, and Null-Rate Blocking Gates | dbt-orchestration; write-audit-publish, freshness SLA, volume anomaly vs baseline, null-rate, blocking gate | Netflix, Airbnb, Datadog, Amazon, Instacart | runnable-equivalent | workspace | 30m | R: stage to audit, run violation-count checks, publish only if all zero. A: stage, check freshness/volume/null-rate, publish on pass. P: hidden assertions that a mutated bad batch blocks and fires the right check. |

Module total: **108m**

### Module 5.4 — Round 4: The DE System Design Round

Goal: convert the verbal system-design round into runnable reasoning and one end-to-end build.

**Interview level: Junior-to-Senior.** Interns are rarely given a full system-design round; this module exists to build the vocabulary early and to carry the medallion capstone that ties the level together.

| id | title | skills (stack tag first) | companies | pattern | grading | est | Read / Apply / Practice |
|---|---|---|---|---|---|---|---|
| `sql-l5-system-design-round-reasoning` | Reasoning Like the System-Design Round: Pruning, Tumbling Windows, Consumer Lag, DAG Dependencies | streaming; partition pruning / sargability, EXPLAIN QUERY PLAN, tumbling event-time windows, late-data flagging, Kafka consumer lag, DAG dependency eligibility | Amazon, Databricks, Google, Meta, Uber, Confluent | concept-check | single-file | 30m | R: the verbal framework + four mechanisms that cannot run, each made runnable. A: per-partition and total consumer lag, flag lag > 100000. P: tumbling window counts + late events; companion runnable-eligible-tasks drill. |
| `sql-l5-medallion-streaming-capstone` | Capstone: JSON Events to a Sessionized, Incremental, DQ-Gated Medallion Pipeline | lakehouse; medallion Bronze/Silver/Gold, JSON shred, sessionization, incremental watermark upsert, DQ gate, idempotency | Netflix, Uber, DoorDash, Airbnb, Snowflake, Stripe | runnable-equivalent | workspace | 44m | R: Bronze/Silver/Gold spine mapped to Kafka -> Flink -> dbt -> Streams+Tasks. A: build Silver from Bronze, Gold aggregate, incremental second batch, DQ gate. P: hidden multi-suite assertions on sessions, reconciliation, idempotency, zero DQ violations. |

Module total: **74m**

**Grand total: 174 + 124 + 108 + 74 = 480m (~8.0 hours).**

---

## Lesson specs

Each spec below gives the loop agent everything needed to author one `SqlLesson` without further research: the header, the Read coverage plus the exact warehouse callout, a concrete demo idea, the Apply with its grading (named), and the Practice.

---

### `sql-l5-gaps-and-islands` — Gaps and Islands: Consecutive Streaks and Run Detection

- **difficulty:** hard
- **interview level:** Intern-core (the single most-failed live-screen pattern; the highest-ROI row in the level)
- **pattern:** runnable-equivalent · **grading:** single-file · **est:** 42m (teach ~14m)
- **skills:** `product-analytics` (stack), window functions, ROW_NUMBER, gaps-and-islands, streak detection, date arithmetic, GROUP BY on derived key

**Read.** Teach the four-step flag-then-running-sum template, the single most-failed SQL screen pattern. On `daily_logins(user_id, login_date)`: (1) `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date)`; (2) subtract it as days from `login_date` so consecutive dates collapse to a constant island anchor (`date(login_date, '-' || rn || ' days')` or the julianday difference); (3) `GROUP BY user_id, anchor` to get each run's start, end, and length; (4) `MAX(length)` for the longest streak. Show the LAG-diff variant as the alternative (island starts where `prev_date IS NULL OR prev_date < date(login_date,'-1 day')`). Name the reuse: streaks, consecutive purchases, price-unchanged spans, subscription-state runs all share this shape.

> **In the warehouse this differs.** The shape is identical everywhere. Only the date math changes: SQLite uses `julianday()` and `date(d,'+1 day')`, where Snowflake/BigQuery use `DATEADD`/`DATE_ADD` and `DATEDIFF`/`DATE_DIFF`. In Snowflake, BigQuery, and Databricks you can also wrap the final streak filter in `QUALIFY` instead of a subquery.

**Demo idea.** `demoSeedSql` seeds `daily_logins` with two users, one having a broken streak (a gap day) and one with a clean run. `demoCode` (with `showDemoInput: true`) shows the anchor column materialized next to the dates so the learner sees consecutive dates share an anchor and the gap starts a new one, then the GROUP BY producing run start/end/length.

**Apply.** "Write a query that returns each user's longest consecutive-day login streak as `(user_id, streak_length)`." Grading: `singleFile`, `assertColumnNames: true`, `orderMatters: false`; `expected` is the multiset produced by running the reference (row-number-difference island grouping, then `MAX` of run length per user) through the same sql.js WASM.

**Practice.** "Write a query that returns, for each product, the date ranges during which its price stayed unchanged as `(product_id, price, valid_from, valid_to)`, over a `price_history(product_id, price, effective_date)` table." Same island grouping applied to unchanged-status runs. Reference never revealed.

---

### `sql-l5-sessionization` — Sessionization: Grouping Events with an Inactivity Timeout

- **difficulty:** hard
- **interview level:** Intern-core (standard analytics-SQL screen question)
- **pattern:** runnable-equivalent · **grading:** single-file · **est:** 36m (teach ~11m)
- **skills:** `streaming` (stack), LAG, cumulative-sum flag, event-time windowing, sessionization, session_id assignment

**Read.** Build sessionization in visible steps on `events(user_id, event_ts)`: (1) `LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts)` for `prev_ts`; (2) a new-session flag `prev_ts IS NULL OR (julianday(event_ts) - julianday(prev_ts)) * 1440 > 30`; (3) `SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_ts)` as a running `session_seq`; (4) `session_id = user_id || '-' || session_seq`. Note the ambiguity interviewers probe: gap since the previous event vs gap since session start (we use previous event).

> **In the warehouse this differs.** This is a native SESSION window in Flink (`SESSION(event_time, INTERVAL '30' MINUTE)`) and Spark Structured Streaming, where watermarks handle late data. The gap math changes (`TIMESTAMPDIFF`/`DATE_DIFF` vs `julianday()*1440`), and Snowflake exposes `CONDITIONAL_TRUE_EVENT` / `MATCH_RECOGNIZE`. The LAG + cumulative-flag pattern is what you write over a bounded batch table and is the answer interviewers want.

**Demo idea.** Seed `events` for one user with two clear sessions separated by a > 30 minute gap. `demoCode` renders `prev_ts`, the gap in minutes, the new-session flag, the running session_seq, and the final `session_id` side by side.

**Apply.** "Write a query that assigns a `session_id` to each event, starting a new session after 30 minutes of user inactivity; return `(event_id, user_id, event_ts, session_id)`." Grading: `singleFile`, multiset compare against the reference run through sql.js.

**Practice.** "Write a query that returns one row per session with `(session_id, start_ts, end_ts, event_count, duration_minutes)`." Reference never revealed.

---

### `sql-l5-cohort-retention` — Cohort Retention and the Denominator Trap

- **difficulty:** hard
- **interview level:** Intern-core (product-analytics screen staple; the denominator trap is the filter)
- **pattern:** runnable-equivalent · **grading:** single-file · **est:** 38m (teach ~13m)
- **skills:** `product-analytics` (stack), cohort analysis, Day-N retention, LEFT JOIN denominator, COUNT(DISTINCT), date arithmetic

**Read.** Anchor each user's cohort on `MIN(event_date)` (not a `signup_date` column, which can be stale), then keep the FULL cohort as the denominator by LEFT JOIN (never INNER) to activity at `first_date + N days`. Show the deliberate wrong-answer contrast in the demo: an INNER JOIN or a `WHERE` on the retained event shrinks the denominator and inflates the rate, side by side with the correct full-cohort number. Name the three definitions of "retained" (active exactly on day N, within N days, during the day-N window) and commit to one.

> **In the warehouse this differs.** Date math is `date(first_date,'+7 days')` here vs `DATE_ADD` / `first_date + INTERVAL '7 days'` in Snowflake/BigQuery. The metric-definition discipline (full-cohort denominator, one pinned definition) is dialect-independent and is the real thing being tested.

**Demo idea.** Seed a tiny cohort where some users return on day 7 and some do not. `demoCode` shows two result columns next to each other: `wrong_rate` (INNER JOIN shrinks the denominator) and `correct_rate` (LEFT JOIN keeps the full cohort), proving the inflation.

**Apply.** "Write a query that returns the Day-7 retention rate per weekly signup cohort as `(cohort_week, cohort_size, retained_day7, retention_rate)`, keeping the full cohort in the denominator." Grading: `singleFile`, multiset compare against the reference (full-denominator numbers) run through sql.js.

**Practice.** "Write a query that returns a cohort retention triangle `(cohort_week, weeks_since_signup, retained_users)` for weeks 0 through 4, using an inequality or date-bucket join." Reference never revealed.

---

### `sql-l5-funnel-conversion` — Funnel and Conversion Analysis

- **difficulty:** medium
- **interview level:** Intern-core (conditional-aggregation screen staple)
- **pattern:** runnable-equivalent · **grading:** single-file · **est:** 28m (teach ~9m)
- **skills:** `product-analytics` (stack), conditional aggregation, MAX(CASE), funnel step flags, step ordering, conversion rate

**Read.** Collapse an `events(user_id, step, event_ts)` table to one row per user with `MAX(CASE WHEN step='x' THEN 1 END)` step-reached flags, and enforce monotonic order by comparing `MIN(event_ts)` per step so out-of-order events do not count (an add-to-cart before the view does not count as a real funnel step). Frame the base-population reasoning so drop-offs stay in the denominator.

> **In the warehouse this differs.** The SQL is unchanged everywhere. Some engines add helpers (Snowflake `MATCH_RECOGNIZE`, product-analytics funnel primitives), but the conditional-flag-plus-timestamp-ordering approach is the portable interview answer.

**Demo idea.** Seed `events` with one user who completes the funnel in order, one who skips a step, and one whose events are out of order. `demoCode` shows the per-user step timestamps and the derived reached-flags, highlighting the out-of-order user who is correctly excluded from the later step.

**Apply.** "Write a query that returns, for each funnel step (`view` -> `add_to_cart` -> `purchase`), the count of users who reached it and the conversion rate from the prior step, requiring each step to occur at or after the previous one." Grading: `singleFile`, multiset compare against the reference run through sql.js.

**Practice.** "Write a query that returns the step-to-step conversion rate (`reached_this_step / reached_prior_step`) for each transition in the funnel." Reference never revealed.

---

### `sql-l5-window-frames-and-qualify` — Advanced Window Frames and the QUALIFY Rewrite

- **difficulty:** hard
- **interview level:** Intern-core (upper-intern depth; ROWS vs RANGE and the LAST_VALUE trap are fair game on the screen)
- **pattern:** runnable-equivalent · **grading:** single-file · **est:** 30m (teach ~11m)
- **skills:** `product-analytics` (stack), ROWS vs RANGE, LAST_VALUE frame trap, NTILE, named WINDOW, subquery filter, top-N-per-group

**Read.** Live `demoCode` shows the LAST_VALUE trap: `LAST_VALUE(x) OVER (ORDER BY d)` returns the current row under the default `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` frame, fixed with `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. Then contrast a running `SUM` under `ROWS` vs `RANGE` on tied ORDER BY keys (`RANGE` lumps peers, `ROWS` counts physical rows). Teach that a window function cannot appear in `WHERE` (it is evaluated after `WHERE`), so top-N-per-group and keep-latest must be computed in a subquery then filtered.

> **In the warehouse this differs.** Snowflake, BigQuery, and Databricks collapse the subquery-then-filter into one `QUALIFY` line: `... QUALIFY ROW_NUMBER() OVER (...) = 1`. QUALIFY is to window functions what HAVING is to aggregates, and the subquery form is the universally portable answer it desugars to. Frame semantics (ROWS/RANGE, the LAST_VALUE default-frame trap) are ANSI-standard and identical across dialects.

**Demo idea.** Seed a `sales(region, sale_date, amount)` table with tied dates. `demoCode` (with `showDemoInput: true`) shows three columns: wrong LAST_VALUE (current row), correct LAST_VALUE (full-partition frame), and a running SUM under ROWS vs RANGE to expose the tie behavior.

**Apply.** "Write a query that returns each sale plus the true partition-final sale amount within its region (not the current row), and returns only the most recent row per region, using the subquery-then-filter form." Grading: `singleFile`, multiset compare; the wrong frame or a window in `WHERE` produces the wrong set and fails.

**Practice.** "Write a query that splits customers into 4 spend quartiles with `NTILE(4)` and returns the min and max spend per quartile, reusing one named `WINDOW` across the functions." Reference never revealed.

---

### `sql-l5-json-variant-flatten` — Semi-Structured Data: JSON/VARIANT Extraction and Array Flattening

- **difficulty:** hard
- **pattern:** runnable-equivalent · **grading:** single-file · **est:** 36m (teach ~12m)
- **skills:** `snowflake-warehouse` (stack), json_extract, `->>` operator, json_each, array fan-out, semi-structured modeling, double-count trap

**Read.** On `raw_events(id, payload TEXT)` holding real JSON, teach scalar projection with `json_extract(payload,'$.user.id')` and the `->>` operator (with `CAST` for affinity-loose values and `NULL` for missing keys), then explode a nested array with `json_each(payload,'$.items')` joined back to the parent (the LATERAL fan-out). Flag the interview trap explicitly: putting `SUM(order_total)` in the same exploded query multiplies it by the array length; explode in an isolated CTE or aggregate before exploding.

> **In the warehouse this differs.** Snowflake stores this as a VARIANT column and writes `LATERAL FLATTEN(input => payload:items)` reading `value:sku::string`; BigQuery uses `UNNEST` over a `REPEATED STRUCT` and `JSON_VALUE`; Databricks/Spark uses `explode()` and `from_json`. `json_each` is the same lateral fan-out and the double-count trap is identical in all four.

**Demo idea.** Seed one `raw_events` row whose payload has a nested `user` object and an `items` array of two elements plus an `order_total`. `demoCode` shows the naive exploded query doubling `order_total`, then the isolated-explode version that keeps the parent aggregate correct.

**Apply.** "Write a query that returns `id`, `country` (`payload ->> '$.user.country'`), and `amount` (`CAST(payload ->> '$.amount' AS REAL)`) pulled out of each event's JSON payload." Grading: `singleFile`, multiset compare; missing-key rows must return `NULL`.

**Practice.** "Write a query that returns total quantity sold per `sku` from the nested `items` JSON array, exploding in an isolated step so parent aggregates are not double-counted." Reference never revealed.

---

### `sql-l5-fact-grains-accumulating-snapshot` — Fact Grains: The Accumulating Snapshot and UPDATE-in-Place

- **difficulty:** hard
- **pattern:** runnable-equivalent · **grading:** workspace · **est:** 32m (teach ~10m)
- **skills:** `snowflake-warehouse` (stack), fact-table grains, accumulating snapshot, UPDATE-in-place, milestone lag durations, idempotent rebuild

**Read.** Contrast the three fact grains: transaction (one row per event), periodic snapshot (one row per entity per period), and accumulating snapshot. The accumulating snapshot is the only fact that updates rows in place: grain is one row per process instance, with NULLable milestone-date columns and computed step-to-step lag columns. This is the most-asked advanced-fact modeling question.

> **In the warehouse this differs.** The `UPDATE` becomes a `MERGE` in Snowflake/BigQuery, and column-store warehouses often rebuild the whole table from source each run rather than mutate rows, because row-level UPDATE is expensive on columnar storage. The grain and milestone-lag reasoning is identical.

**Demo idea.** Seed `raw_order_events(order_id, milestone, event_ts)` with staggered milestones. `demoCode` shows one order's row before and after two milestone UPDATEs, with the `days_order_to_ship` lag filling in as `shipped_ts` lands.

**Apply.** "Write a script that builds `fct_order_pipeline` with one row per order and NULLable milestone columns (`order_ts, picked_ts, shipped_ts, delivered_ts`), UPDATEs the row as each milestone lands, and computes `days_order_to_ship` and `days_ship_to_deliver` lag columns." Starter code leads with `DELETE FROM fct_order_pipeline;` so a re-run stays idempotent.

**Grading (hidden assertions, offending rows -> zero = pass):**
- `grain_one_row_per_order`: rows in `fct_order_pipeline` with `COUNT(*) > 1` per `order_id`.
- `no_negative_delivered_lag`: rows where `days_ship_to_deliver < 0`.
- `idempotent_rebuild`: `checkIdempotency: true`, `idempotencyTables: ["fct_order_pipeline"]` so the double-run asserts row count and lag values are unchanged.

**Practice.** "Write a script that also backfills a late-arriving `delivered_ts` for orders already shipped, and recomputes the lag, without changing the grain." Same assertion families; reference never revealed.

---

### `sql-l5-as-of-scd2-join` — Point-in-Time (As-Of) Joins Against an SCD2 Dimension

- **difficulty:** medium
- **pattern:** runnable-equivalent · **grading:** single-file · **est:** 28m (teach ~9m)
- **skills:** `snowflake-warehouse` (stack), point-in-time join, as-of join, SCD2 history, effective_from/effective_to range predicate, late-arriving fact

**Read.** L4 builds an SCD2 dimension but never queries it as-of, which is the whole point of keeping history. Teach joining a fact to the dimension version valid at event time: `ON keys AND event_date >= effective_from AND event_date < effective_to`, instead of `is_current = 1`. This also handles a fact that arrives after its dimension has already changed.

> **In the warehouse this differs.** Snowflake, BigQuery, and DuckDB offer an `ASOF JOIN` keyword; SQLite expresses the same result with the half-open `BETWEEN`-range predicate. The correctness idea (attach the version that was valid then, not the current one) is dialect-independent.

**Demo idea.** Seed `dim_customer` with two versions of one customer (region changed mid-history) and `fact_orders` with orders on both sides of the change. `demoCode` shows each order joined to the region that was current on its `event_date`, contrasted with the wrong `is_current = 1` join that mislabels the old orders.

**Apply.** "Write a query that attaches to each order the customer region that was current on the order's `event_date`, reading from the Type-2 `dim_customer` (`effective_from`/`effective_to`)." Grading: `singleFile`, multiset compare; the `is_current` shortcut fails on historical orders.

**Practice.** "Write a query that returns total revenue bucketed by the region effective at event time versus by the customer's current region, showing the two differ." Reference never revealed.

---

### `sql-l5-join-fan-out-and-skew` — Join Fan-Out and Data Skew: Diagnose, Fix, and Keep Metrics Consistent

- **difficulty:** hard
- **pattern:** runnable-equivalent · **grading:** single-file · **est:** 28m (teach ~10m)
- **skills:** `lakehouse` (stack), join fan-out, grain-first pre-aggregation, COUNT(DISTINCT), define-metric-once CTE, hot-key detection, skew/broadcast reasoning

**Read.** Show that `SUM(orders.amount)` after `JOIN order_items` silently inflates revenue by the number of line items; fix by aggregating the fact to its own grain in a CTE (or `COUNT(DISTINCT)`) before joining the dimension. Then define the revenue metric once in a single CTE and reuse it across two dimensional cuts (by region and by category) so both roll up to the same grand total, proving consistency and not just the double-count fix. Add a concept-check note on distributed skew: a `GROUP BY` key `COUNT(*)` that surfaces a hot key is the exact first diagnostic before salting or broadcasting the small side in Spark.

> **In the warehouse this differs.** The SQL is identical everywhere. A semantic layer (Airbnb Minerva, dbt MetricFlow, LookML) declares the measure and its grain once, which is what guarantees the aggregate-before-join you wrote by hand. In Spark the hot key you surface with a `GROUP BY` count is the straggler you fix with salting, a broadcast join, or Adaptive Query Execution skew splitting.

**Demo idea.** Seed `orders(order_id, region, amount)` and `order_items(order_id, sku)` with a multi-item order. `demoCode` shows the inflated naive-join total next to the correct grain-first CTE total, then the same metric CTE rolled up by region and by category summing to the same grand total.

**Apply.** "Write a query that returns correct total revenue per region without fan-out double-counting, by defining the revenue metric once in a CTE aggregated to the fact grain and then joining the dimension." Grading: `singleFile`, multiset compare against the non-inflated totals.

**Practice.** "Write a query that returns the join keys that fan out (appear more than once on the many side) ordered by count descending, the hot-key diagnostic that also identifies a straggler in a distributed shuffle." Reference never revealed.

---

### `sql-l5-cdc-changelog-apply` — CDC Changelog Apply: MERGE-Shaped Upsert with Deletes and Version Ordering

- **difficulty:** hard
- **pattern:** runnable-equivalent · **grading:** workspace · **est:** 38m (teach ~12m)
- **skills:** `streaming` (stack), CDC change stream, ROW_NUMBER latest-per-key, ON CONFLICT upsert, tombstone delete, last-write-wins, idempotency

**Read.** Given `changelog(pk, op, version, payload)` where `op` is `I`/`U`/`D`, teach the MERGE-shaped apply: dedup to the latest version per pk with `ROW_NUMBER() OVER (PARTITION BY pk ORDER BY version DESC) = 1`, apply `I`/`U` via `INSERT ... ON CONFLICT(pk) DO UPDATE`, and apply `D` via `DELETE`. Call out the duplicate-source trap: a real `MERGE` raises a nondeterministic-merge error when two source rows match one target row, so the dedup is mandatory.

> **In the warehouse this differs.** This is one `MERGE ... WHEN MATCHED AND op='D' THEN DELETE WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT` in Snowflake, BigQuery, and Delta. SQLite splits it into `ON CONFLICT` + `DELETE`, which is exactly what the MERGE compiles to. Snowflake and BigQuery also error on duplicate source keys, so the ROW_NUMBER dedup transfers directly.

**Demo idea.** Seed a `changelog` where one pk has an insert then two updates (out of version order) then a delete, and another pk survives. `demoCode` shows the dedup-to-latest CTE and the resulting op per key.

**Apply.** "Write a script that applies a changelog (`pk, op I/U/D, version, payload`) to a target table so it matches the last-write-wins end state: dedup to latest version, upsert `I`/`U`, delete keys whose final op is `D`." Starter code leads with the target already seeded to a prior state.

**Grading (hidden assertions, offending rows -> zero = pass):**
- `matches_expected_end_state`: rows in the symmetric difference between target and the expected end state.
- `no_surviving_deletes`: rows in target whose final changelog op was `D`.
- `one_row_per_key`: pks with `COUNT(*) > 1` in target.
- `idempotent`: `checkIdempotency: true`, `idempotencyTables: ["target"]`.

**Practice.** "Write a script that applies two changelog batches in sequence (a late second batch with newer versions) and stays correct, using `WHERE excluded.version > target.version` to reject stale updates." Reference never revealed.

---

### `sql-l5-incremental-watermark-backfill` — High-Water-Mark Incremental Extraction and Safe Backfill

- **difficulty:** hard
- **pattern:** runnable-equivalent · **grading:** workspace · **est:** 40m (teach ~13m)
- **skills:** `dbt-orchestration` (stack), high-water-mark, incremental load, watermark state table, atomic staging swap, partition-overwrite backfill, late-arriving lookback, idempotency

**Read.** Distinguish full refresh, watermark extraction, and CDC. Teach reading `MAX(watermark)` from a state table, selecting source rows strictly greater than it, upserting, and advancing the watermark; discuss why `>` vs `>=` matters for boundary duplicates and why a rolling lookback window is needed to catch late-arriving rows below the watermark. Then teach the two backfill answers interviewers want instead of rerunning the DAG: (1) staging + atomic swap (build `target_staging`, run the corrected transform, validate, then swap inside a transaction so readers never see a half-built table); (2) partition-overwrite (`DELETE` a bounded `load_date` range then `INSERT ... SELECT` the same range so a re-run does not double-count). The invariant is idempotency per partition.

> **In the warehouse this differs.** This maps to dbt `is_incremental()` models, BigQuery/Hive `INSERT OVERWRITE PARTITION`, Delta `replaceWhere`, and Snowflake `CREATE OR REPLACE TABLE ... SWAP WITH` and STREAMS offsets. Airflow passes the data interval as the partition to overwrite, and `catchup=True` triggers the backfill runs.

**Demo idea.** Seed a `source(id, updated_at)`, a `target`, and a one-row `state(watermark)` table. `demoCode` shows the incremental select (rows above the watermark), the upsert, and the watermark advance, then a partition-overwrite `DELETE`+`INSERT` for a bounded date range.

**Apply.** "Write a script that incrementally loads only source rows newer than the stored watermark, upserts them, advances the watermark, and includes a partition-overwrite backfill block that `DELETE`s and reinserts a bounded `load_date` range within one transaction."

**Grading (hidden assertions, offending rows -> zero = pass):**
- `no_duplicate_business_keys`: business keys with `COUNT(*) > 1` in target.
- `idempotent_per_partition`: `checkIdempotency: true`, `idempotencyTables: ["target", "state"]`, asserting identical row count and daily sums after a second run.
- `late_row_recovered`: a late-arriving row inside the lookback window that must appear in target after the backfill (assertion returns it if missing).

**Practice.** "Write a script that contrasts a naive append loader (which fails the run-twice check) with the partition-overwrite loader, on the same source, and prove only the second is idempotent." Reference never revealed.

---

### `sql-l5-data-quality-gates` — Write-Audit-Publish: Freshness, Volume, and Null-Rate Blocking Gates

- **difficulty:** medium
- **pattern:** runnable-equivalent · **grading:** workspace · **est:** 30m (teach ~10m)
- **skills:** `dbt-orchestration` (stack), write-audit-publish, freshness SLA check, volume anomaly vs trailing baseline, null-rate check, blocking gate

**Read.** Go beyond L4's static dbt four to a blocking validation layer. Teach the write-audit-publish pattern: stage the batch to an audit table, run a battery of violation-count checks (freshness: newest `updated_at` within SLA; volume: today's row count within an X% band of the trailing average; null-rate on a key column below threshold; unexpected-category share), and only `INSERT` into the published table when every check returns zero violations.

> **In the warehouse this differs.** This is dbt source freshness (`loaded_at_field` + `warn_after`) plus dbt-expectations / Great Expectations / Databricks expectations / Monte Carlo monitors scheduled as gates. The SQL you wrote is the check body those tools run and alert on.

**Demo idea.** Seed a `trailing_daily_counts` table for the baseline and a healthy incoming batch. `demoCode` shows each check returning zero rows on the healthy batch, then a note that a mutated batch would make exactly one check return offending rows.

**Apply.** "Write a script that stages a batch to an audit table, runs freshness, volume-anomaly, and null-rate checks, and publishes to the target only when all checks pass (each check returns zero offending rows)."

**Grading (hidden assertions, offending rows -> zero = pass):**
- `freshness_ok`: returns a row if `MAX(updated_at)` is older than the SLA threshold.
- `volume_ok`: returns a row if today's count is outside the percent band of the trailing average.
- `null_rate_ok`: returns a row if the key column's null rate exceeds the threshold.
- `published_only_on_pass`: the published table equals the staged batch when all checks pass.

**Practice.** "Write a script that runs against a mutated bad batch (stale, or a volume anomaly, or a null spike) and proves the published table is unchanged while exactly the right check fires; a healthy batch publishes with every check returning zero rows." Reference never revealed.

---

### `sql-l5-system-design-round-reasoning` — Reasoning Like the System-Design Round

- **difficulty:** hard
- **pattern:** concept-check · **grading:** single-file · **est:** 30m (teach ~12m)
- **skills:** `streaming` (stack), partition pruning / sargability, EXPLAIN QUERY PLAN, tumbling event-time windows, late-data flagging, Kafka consumer lag, DAG dependency eligibility

**Read.** Frame the verbal DE system-design framework (requirements, latency SLA, batch vs streaming, backfill, observability, lineage) and the four mechanisms that cannot run in SQLite: micro-partition pruning, Kafka offsets/lag, DAG scheduling, and event-time windows. Make each runnable. Live `demoCode` on an indexed date column shows `EXPLAIN QUERY PLAN` flipping from `SEARCH USING INDEX` to `SCAN` when a predicate becomes non-sargable (`WHERE date(ts)=...` vs `WHERE ts >= '2026-07-03' AND ts < '2026-07-04'`). Show the tumbling-window emulation (floor `event_time` into fixed buckets with `strftime`, flag events whose `ingest_time` is more than one window past their bucket as late). Give the explicit Kafka mapping: `consumer lag = latest_offset - committed_offset`, which mirrors `kafka-consumer-groups --describe`.

> **In the warehouse this differs.** Filtering on the partition or clustering column drops BigQuery bytes billed from terabytes to gigabytes and prunes Snowflake micro-partitions; a function on the key defeats pruning exactly as it defeats a B-tree seek here. Flink `TUMBLE(event_time, INTERVAL '1' HOUR)` with watermarks and `allowedLateness` is the streaming form of the bucket-and-flag query. The offsets table stands in for Kafka internals; the lag arithmetic is what you monitor in production.

**Concept-check runnable carrier.** The un-runnable mechanisms (Kafka, micro-partitions, DAG scheduler) are each reduced to a real SELECT: consumer lag is arithmetic over an offsets table; pruning is a sargable-predicate rewrite verified by `EXPLAIN QUERY PLAN`; DAG eligibility is a join over a dependency edge table; tumbling windows are `strftime` bucketing.

**Apply.** "Write a query that returns per-partition lag and total lag from an offsets table (`topic, partition, committed_offset, latest_offset, consumer_group`), flagging any partition whose lag exceeds 100000 (the `kafka-consumer-groups --describe` view)." Grading: `singleFile`, multiset compare against the reference run through sql.js.

**Practice.** "Write a query that returns the event count per 1-hour tumbling window and, in the same result, the count of late-arriving events per window (`ingest_time` more than one window past the event-time bucket). Companion drill: return the tasks eligible to run (every upstream dependency succeeded) from a `task_run` plus `task_dependency` edge table." Reference never revealed.

---

### `sql-l5-medallion-streaming-capstone` — Capstone: JSON Events to a Sessionized, Incremental, DQ-Gated Medallion Pipeline

- **difficulty:** hard
- **pattern:** runnable-equivalent · **grading:** workspace · **est:** 44m (teach ~12m)
- **skills:** `lakehouse` (stack), medallion Bronze/Silver/Gold, JSON shred, sessionization, incremental watermark upsert, data-quality gate, idempotency

**Read.** Tie the whole level into one realistic take-home build narrated as an explicit medallion pipeline. Bronze is `raw_events` loaded as-is (dirty strings, duplicate event ids, JSON payload, arriving in two batches to simulate incremental runs). Silver is the typed, deduped (ROW_NUMBER keep-latest), JSON-shredded, sessionized clean table. Gold is the daily/session metrics aggregate fact. Map each layer to the real stack the intern narrates in a system-design round: Kafka -> Flink sessionization -> dbt incremental model -> dbt test / Snowflake Streams+Tasks.

> **In the warehouse this differs.** Each layer is a Delta or Iceberg table, and the transitions run as `MERGE` / `CREATE TABLE AS` jobs orchestrated by a workflow. The medallion is a naming and quality-gate discipline, not a product feature; you are building the transform SQL that sits inside those layers.

**Demo idea.** Seed a small `raw_events` Bronze batch with one duplicate event id and a JSON payload. `demoCode` shows the Bronze -> Silver transition for a couple of rows (json_extract typing + ROW_NUMBER keep-latest dedup) so the learner sees the shape before writing the full script.

**Apply.** "Write one script that builds Silver from Bronze (parse raw JSON into a typed staging table with `json_extract`, dedup by ROW_NUMBER keep-latest, sessionize with LAG + gap-flag + running-sum `session_id`) and Gold as the daily metrics aggregate, then incrementally loads a second Bronze batch using a watermark and `ON CONFLICT` upsert, and runs a freshness + row-count gate that must pass before publishing Gold."

**Grading (hidden multi-suite assertions, offending rows -> zero = pass):**
- `session_boundaries_correct`: events assigned to the wrong session under the 30-minute rule.
- `no_duplicate_sessions`: session ids with `COUNT(*) > 1` where one is expected.
- `gold_reconciles_to_silver`: Gold aggregates that do not equal the Silver rollup.
- `dq_gate_zero_violations`: the freshness and row-count checks return offending rows.
- `idempotent_second_batch`: `checkIdempotency: true`, `idempotencyTables: ["silver_events", "gold_daily_metrics"]`.

**Practice.** "Extend the capstone so a late-arriving second batch with an out-of-order event and a duplicate id is applied without breaking session boundaries or the idempotency check." Reference never revealed.

---

## Company coverage matrix

Which module each company is exercised by (drawn from the per-lesson company tags):

| Company | Round 1 power screen | Round 2 modeling | Round 3 pipeline | Round 4 system design |
|---|---|---|---|---|
| Meta | gaps, sessionization, cohort, funnel, frames | join-fan-out | | system-design |
| Amazon | gaps, sessionization, cohort, funnel, frames | json, fact-grains | cdc, incremental | system-design |
| Google | gaps, sessionization, cohort, frames | | | system-design |
| Databricks | gaps, frames | json, join-fan-out | cdc | system-design |
| Snowflake | frames | json | | capstone |
| Netflix | sessionization, cohort | join-fan-out | cdc, incremental, dq-gates | capstone |
| Uber | sessionization, funnel | fact-grains, as-of, join-fan-out | cdc, incremental | system-design |
| Airbnb | funnel | as-of, join-fan-out | incremental, dq-gates | capstone |
| DoorDash | sessionization, cohort, funnel | | | capstone |
| Instacart | | fact-grains | cdc, dq-gates | |
| Stripe | gaps | json, as-of | incremental | capstone |
| LinkedIn | | join-fan-out | | |
| Confluent | | | cdc | system-design |
| Datadog | | json | dq-gates | |
| Spotify | cohort | | | |
| Lyft | | | incremental | |
| Capital One | | as-of | | |
| Bloomberg | frames | | | |

### Company -> stack (from research)

| Company | Warehouse / lakehouse | Streaming | Processing | Orchestration |
|---|---|---|---|---|
| Meta | Hive/ORC + Iceberg, queried by Presto | Scribe + Puma/Stylus (Kafka-class) | Spark + Presto | Dataswarm (Airflow-like) |
| Amazon | Redshift + S3 lake (Glue Catalog) | Kinesis (also MSK/Kafka) | Spark on EMR / Glue | MWAA (Managed Airflow) |
| Google | BigQuery | Pub/Sub | Dataflow (Apache Beam) | Cloud Composer (Airflow) |
| Databricks | Delta Lake + Unity Catalog | Structured Streaming + Kafka | Apache Spark | Databricks Workflows + Airflow |
| Snowflake | Snowflake (VARIANT, Streams, Time Travel) | Snowpipe / Kafka connector | Snowpark + dbt | Tasks; Airflow/dbt externally |
| Netflix | Apache Iceberg on S3 | Kafka (Keystone) + Flink | Spark + Flink | Maestro (in-house) |
| Uber | Apache Hudi on HDFS/S3, Pinot | Kafka (very large) + Flink | Spark + Flink | Piper (Airflow-based) |
| Airbnb | Hive/Iceberg + Trino, Minerva semantic layer | Kafka + Spark Streaming | Spark | Airflow (created there) |
| DoorDash | Snowflake + Delta/Iceberg lake | Kafka (Iguazu) | Flink + Spark (Trino query) | Airflow |
| Instacart | Snowflake + Iceberg/Databricks | Kafka (Debezium CDC, Snowgoose) | Spark + Flink + dbt | Airflow |
| Stripe | Databricks/Delta + Trino (Redshift legacy) | Kafka | Spark | Airflow |
| LinkedIn | HDFS/Iceberg + Pinot | Kafka (created there) | Spark + Samza | Azkaban (created there) |
| Confluent | Databricks/Snowflake (internal) | Kafka (their product) + Flink | Flink + Spark | Airflow |
| Datadog | S3/Parquet lake + Snowflake | Kafka (very large) | Spark + Flink | Airflow |
| Spotify | BigQuery | Pub/Sub (+ Kafka legacy) | Dataflow/Beam via Scio | Flyte |
| Lyft | S3 + Hive/Trino | Kafka | Flink + Spark/Trino; Druid | Flyte (created there) + Airflow |
| Apple | Snowflake + Iceberg lake | Kafka | Spark + Flink | Airflow |
| Robinhood | Snowflake | Kafka | Spark + Flink | Airflow |
| Coinbase | Snowflake + Databricks | Kafka | Spark/Flink (Databricks) | Airflow |
| Microsoft | Azure Synapse / Fabric + Cosmos/SCOPE | Event Hubs (Kafka-compatible) | Spark (Synapse/Fabric) | Azure Data Factory |

Read across the table: Kafka is the near-universal streaming backbone, Spark (with Flink for streaming) is the near-universal processing engine, storage splits into cloud warehouses (Snowflake, BigQuery, Redshift) and open-table lakehouses (Iceberg, Delta, Hudi), and orchestration is Airflow or an Airflow-shaped in-house tool. Every warehouse callout in the lesson specs points at one of these named systems so the intern can narrate a concrete vendor track.

---

## Beyond this course: what to study next

Level 5 is deliberately bounded by what sql.js can execute and grade. A DE loop tests more than SQL. The topics below are real interview surface but cannot be a graded SQLite exercise, so they belong in self-study, not in this level. They are clearly separated from the level-5-worthy material above, which IS included because it reduces to a runnable SELECT or workspace script.

**Language and processing runtimes (not executable on sql.js).**
- Python / PySpark for pipeline authoring: DataFrame transforms, UDFs, transformations vs actions, lazy eval, caching. Spark is the near-universal batch engine.
- Spark internals: shuffle, partitioning, broadcast joins, skew, Adaptive Query Execution, `spark.sql.shuffle.partitions`, executor/memory tuning. Only the hot-key diagnostic transfers (taught in `sql-l5-join-fan-out-and-skew`).
- Pandas and general Python data-manipulation coding (file parsing, API pagination, dict/list algorithms) for the Python round most loops pair with SQL.
- LeetCode-style DS&A (arrays, strings, hash maps, trees, graphs) for CodeSignal-style online assessments at Databricks and Google.

**Infrastructure and tooling (need real infra).**
- Airflow / Dagster DAG authoring and scheduling semantics: operators, sensors, trigger rules, XCom, TaskFlow, catchup, retries. The idempotency and backfill reasoning is taught in L5 SQL; the DAG mechanics are out of scope.
- Kafka internals: partitions, offsets, consumer groups, ISR, rebalance, exactly-once. Only the consumer-lag arithmetic transfers (concept-check in `sql-l5-system-design-round-reasoning`).
- File formats and physical storage: Parquet/ORC/Avro layout, row groups, encoding, compression, schema evolution and backward/forward compatibility (Avro/Protobuf contract migration). Only the pruning/projection cost intuition transfers.
- Lakehouse table formats (Iceberg / Delta / Hudi): ACID, time travel, partition evolution, compaction. The SCD/versioning intuition maps from L4; the commit-log mechanics are infra-bound.
- Cloud platform fluency (AWS/GCP/Azure: S3/GCS, Glue, EMR/Dataproc, Kinesis, BigQuery, IAM), Docker, IaC, and CI/CD for pipelines.
- dbt project engineering: models, refs, sources, macros, incremental materializations, snapshots, tests-as-CI. L4/L5 teach the SQL those models and tests contain; the project layout, Jinja, and CI wiring are tool-specific.

**Verbal rounds (conceptual, not gradable as a single SELECT).**
- The data-focused system-design framework end to end (requirements -> latency SLA -> batch vs streaming -> medallion modeling -> dedup -> DQ -> partitioning -> backfill -> observability -> lineage). `sql-l5-system-design-round-reasoning` makes the mechanisms runnable, but the open-ended design conversation is practiced verbally.
- Streaming delivery semantics: exactly-once vs at-least-once with idempotent sinks, watermarks, backpressure. The dedup and event-time reasoning is taught in SQL; the distributed guarantees are conceptual.
- Data governance and catalog: Unity Catalog, RBAC, column masking, PII handling. Lineage/impact analysis is the one governance topic that is SQL-runnable (a recursive CTE over a dependency edge table) and could be a future L5 addition if the level grows.

---

## Authoring & shipping runbook

Run this with `/loop`, one lesson per iteration, mirroring the L1-L4 AGENT-2 runbook. The loop stops only when every Level-5 lesson is authored and green on the sql.js runner.

```
/loop author the next Level-5 SQL lesson by following docs/sql-curriculum/expand-sql-de.md
```

**Where lessons live.** Author each lesson as a `SqlLesson` object in `lib/tutorials/sql/curriculum/level5.ts`, grouped into the four modules from the curriculum map. Reuse the existing helpers: `scriptExercise({...})` from `./script-exercise` for every workspace lesson, and the inline `singleFile: { seedSql, expected, orderMatters?, caseInsensitive?, assertColumnNames? }` shape (as in `level1.ts`/`level2.ts`) for every single-file lesson. Do not invent new abstractions; match the shape L1-L4 already use.

**Per-lesson checklist (each iteration).**
1. **Pick the next unwritten lesson** in this doc's curriculum-map order (Round 1 first, capstone last).
2. **Write the `SqlLesson`**: `id` = `sql-l5-<slug>` exactly as listed, `title`, `summary`, `estimatedMinutes` from the map, `difficulty`, `skills[]` with the stack tag as the first entry, and `teach: { markdown, demoCode?, demoSeedSql?, showDemoInput?, estimatedMinutes }`.
3. **Write the Read** as pure markdown ending in a one-line recap, plus the runnable `demoCode` against `demoSeedSql` from the spec's demo idea. Set `showDemoInput: true` when the spec renders input tables. Put the warehouse divergence in a `> **In the warehouse this differs.**` blockquote, mapping to the exact Snowflake/BigQuery/Databricks/Kafka construct named in the spec.
4. **Write Apply and Practice** with prompts that lead with the deliverable ("Write a query that returns...", "Write a script that populates..."). Apply reveals its reference after 2 fails; Practice never reveals a reference.
5. **Grade correctly.**
   - Single-file: produce `expected` by running the reference solution through the SAME sql.js WASM (byte-identical, never hand-typed), then compare (`orderMatters: false` unless the lesson teaches `ORDER BY`; set `assertColumnNames: true` when column names are part of the task).
   - Workspace: use `scriptExercise` with the named hidden `assertions` from the spec, each returning offending rows so zero rows = pass. Set `checkIdempotency: true` and `idempotencyTables: [...]` on every lesson whose spec lists an idempotency assertion.
6. **Verify it runs green on sql.js.** Load the seed, run the reference, confirm the assertions return zero rows and single-file `expected` matches. Runnable-equivalent lessons MUST be confirmed to actually execute on sql.js 3.49.1 (no QUALIFY, MERGE, ROLLUP/GROUPING SETS, PIVOT, `generate_series`, REGEXP, or `pow`/`sqrt`/`ln`/`stddev` at runtime; emulate those and teach the native form only in the callout). Concept-check lessons (`sql-l5-system-design-round-reasoning`) must still have a green-able runnable exercise carrying the concept, never a prose-only quiz.
7. **Honor the style rules.** No em dashes anywhere in learner-facing prose. Every Apply/Practice prompt leads with the deliverable. Warehouse divergence only in the callout.
8. **Register the level.** Add the assembled `level5` to the SQL curriculum registry in `lib/tutorials/sql/curriculum/index.ts` alongside levels 1-4, with `id: 5`, `slug: advanced-company-sql`, `estimatedHours: 8`, `defaultExecutionMode: single-file`.
9. **Commit per lesson.** Commit each green lesson on its own (frequent small commits are expected; 14+ commits across the loop is normal). Check `git log` before committing so a concurrent committer's sweep does not fold your staged files into its commit under the wrong message.

**Definition of done for the level.** All 14 lessons authored in `level5.ts`, every single-file `expected` regenerated through sql.js, every workspace assertion returning zero rows on the reference and every idempotency check stable across a double run, the level registered, and `pnpm typecheck` plus the SQL reference-solution test green.

---

## Sources

- https://medium.com/@dharmatejasamudrala/25-sql-scenarios-you-must-master-to-crack-data-engineering-interviews-in-2026-17e4c80559a9
- https://dev.to/hadil/data-engineering-interview-prep-2026-what-actually-matters-sql-pipelines-system-design-478j
- https://www.linkjob.ai/interview-questions/databricks-new-grad-interview-process/
- https://www.startdataengineering.com/post/de_interview_sd/
- https://dataexpert.medium.com/9-pipeline-architecture-interview-problems-i-see-every-loop-155b4623587f
- https://letsdatascience.com/blog/sql-cohort-retention-interview-questions
- https://www.dataquest.io/blog/data-engineering-interview-questions-and-answers/
- https://www.interviewquery.com/p/data-engineer-interview-questions
- https://dataskew.io/blog/data-pipeline-design-patterns/
- https://www.stratascratch.com/blog/facebook-meta-sql-interview-questions
- https://netflixtechblog.com/incremental-processing-using-netflix-maestro-and-apache-iceberg-b8ba072ddeeb
- https://factorhouse.io/articles/netflix-kafka-architecture
- https://www.onehouse.ai/blog/diving-into-ubers-cutting-edge-data-infrastructure
- https://www.uber.com/us/en/blog/apache-hudi-at-uber/
- https://www.uber.com/us/en/blog/from-batch-to-streaming-accelerating-data-freshness-in-ubers-data-lake/
- https://medium.com/airbnb-engineering/how-airbnb-achieved-metric-consistency-at-scale-f23cc53dea70
- https://airbnb.io/projects/airflow/
- https://careersatdoordash.com/blog/building-scalable-real-time-event-processing-with-kafka-and-flink/
- https://www.junaideffendi.com/p/doordash-data-tech-stack
- https://engineering.linkedin.com/blog/2021/evolving-linkedin-s-analytics-tech-stack
- https://instacart.com/company/how-its-made/the-next-era-of-data-at-instacart
- https://eng.lyft.com/orchestrating-data-pipelines-at-lyft-comparing-flyte-and-airflow-72c40d143aad
- https://www.databricks.com/customers/coinbase/streaming
- https://medium.com/@AnalyticsAtMeta/data-engineering-at-meta-high-level-overview-of-the-internal-tech-stack-a200460a44fe
- https://datavidhya.com/blog/sql-data-engineering-interview-questions/
- https://datadriven.io/top-100-data-engineer-interview-questions
- https://sqlite.org/windowfunctions.html
- https://sqlpad.io/tutorial/how-to-solve-gaps-and-islands-sql-interview-questions-with-lag-and-row-number/
- https://medium.com/@keshavkhandelwal142/the-gaps-and-islands-problem-sql-interview-practice-8c087a511cd1
- https://docs.snowflake.com/en/sql-reference/functions/flatten
- https://docs.cloud.google.com/bigquery/docs/arrays
- https://medium.com/data-engineers-notes/unnesting-arrays-in-bigquery-c1b48d413ece
- https://datavidhya.com/blog/snowflake-data-engineering-interview-questions/
- https://github.com/OBenner/data-engineering-interview-questions/blob/master/content/bigquery.md
- https://dataengineeracademy.com/blog/bigquery-cost-guardrails-for-data-engineers-slots-partitions-and-query-limits/
- https://docs.databricks.com/aws/en/sql/language-manual/delta-optimize
- https://www.datacamp.com/blog/top-snowflake-interview-questions-for-all-levels
- https://www.datacamp.com/blog/bigquery-interview-questions
- https://www.datacamp.com/blog/pyspark-interview-questions
- https://datavidhya.com/blog/apache-spark-data-engineering-interview-questions/
- https://pipecode.ai/blogs/apache-spark-interview-questions-architecture-shuffle-tuning
- https://datavidhya.com/blog/data-engineering-system-design-interview-questions/
- https://www.systemdesignhandbook.com/blog/data-engineer-system-design-interview-questions/
- https://github.com/OBenner/data-engineering-interview-questions/blob/master/content/airflow.md
- https://www.datacamp.com/blog/top-airflow-interview-questions
- https://motherduck.com/learn/why-choose-parquet-table-file-format/
- https://medium.com/towards-data-engineering/the-data-engineers-guide-to-file-formats-parquet-vs-orc-vs-avro-470e1d7f7643
- https://www.tredence.com/blog/data-engineer-interview-questions-2026
- https://www.acceldata.io/blog/how-data-contracts-guarantee-pipeline-reliability-data-quality-slas
- https://www.geeksforgeeks.org/data-engineering/data-lineage-a-comprehensive-guide-to-enhancing-data-quality-compliance-and-governance/
- https://www.datacamp.com/blog/kafka-interview-questions
- https://www.tryexponent.com/blog/top-data-engineering-interview-questions
- https://towardsdev.com/kimball-vs-one-big-table-vs-data-vault-in-data-modeling-fa5f63326b84
- https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/accumulating-snapshot-fact-table/
- https://www.tryexponent.com/courses/data-modeling-interviews/accumulating-snapshot-fact-tables
- https://docs.getdbt.com/best-practices/materializations/4-incremental-models
- https://docs.getdbt.com/docs/build/incremental-microbatch
- https://www.ml4devs.com/what-is/backfilling-data/
- https://sachin-s1dn.medium.com/understanding-broadcast-join-and-normal-shuffle-sort-merge-join-in-apache-spark-22f60cb1a7f0
- https://spark.apache.org/docs/latest/sql-performance-tuning.html
- https://queryplane.com/blog/bigquery-partitioning-and-clustering-in-practice/
- https://docs.cloud.google.com/bigquery/docs/querying-partitioned-tables
- https://en.wikipedia.org/wiki/Slowly_changing_dimension

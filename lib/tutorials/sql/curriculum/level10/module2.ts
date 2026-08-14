/**
 * Data Engineering Level 10, Module 10.2 — Shuffle, Skew & Tuning.
 *
 * Where the Spark arc stops describing and starts diagnosing. Level 6 already taught that the
 * shuffle exists, split narrow from wide, and graded the binary "is this dimension under 10 MB"
 * broadcast flag; this module assumes all of that and grades the parts L6 left out: the broadcast
 * BAND (10 MB automatic, roughly 100 MB by hint, sort-merge above) and the driver-memory bet a
 * forced broadcast makes, the per-stage shuffle-write-over-10-GB read that turns a tuning problem
 * into a modeling problem, partition-count arithmetic against the 2-4-per-core heuristic, skew
 * measured as max-over-MEDIAN rather than max-over-mean, and the full Amazon slow-job walk.
 *
 * The device is the one RESEARCH.md §5.8 prescribes and Databricks' own Spark UI Simulator
 * validates: no cluster, no JVM, no PySpark. The Spark UI is exposed as sql.js tables named after
 * the tabs they come from (`join_candidates`, `spark_stages`, `spark_tasks`, `spark_executors`,
 * `shuffle_partition_stats`, `cluster_config`) and every exercise is an ordinary graded SELECT over
 * that capture. Implication 32's hard numbers (10485760, 104857600, 200, 2-4 per core) and
 * implication 31's 5x-median skew signal are baked into the graded predicates rather than only
 * narrated. AQE's own cutoffs (5x the median partition SIZE, 256 MB) come from Spark's
 * `skewJoin.skewedPartitionFactor` and `skewedPartitionThresholdInBytes`, and the 128 MB coalesce
 * target in lesson 2's drill is a configured value, not a default (the default is 64 MB).
 *
 * Deliberate map deviations, recorded so the next reviewer does not re-litigate them:
 * - `de-l10-diagnosing-skew` drill 3 computes the 75th percentile, not the 90th. At these task
 *   counts the nearest-rank p90 lands on the straggler in most stages, so the drill would grade the
 *   maximum; p75 is also the percentile RESEARCH.md's Spark UI Simulator entry cites
 *   ("75th-percentile task times"), so the ROW_NUMBER arithmetic being taught is unchanged.
 * - `de-l10-diagnosing-skew` seeds a DIFFERENT task count per stage (7, 5, 9, 11, 7) rather than a
 *   uniform 7, so `(n + 1) / 2` and `(3 * n + 3) / 4` resolve to a different rank in every stage and
 *   a hard-coded `rn = 4` cannot pass the median exercises.
 * - `de-l10-diagnosing-skew` practice filters on the partition-SIZE ratio, which is AQE's real
 *   `skewedPartitionFactor` rule (size against the MEDIAN PARTITION SIZE), while still reporting the
 *   task-time ratio the map names as a column. Grading the 5x against task time would teach the rule
 *   wrong, and the seed is built so the two ratios disagree on two stages.
 * - `de-l10-narrow-wide-and-broadcast` grades the auto-broadcast cutoff as INCLUSIVE
 *   (`<= 10485760`) where the map writes "under 10485760". Spark implements the threshold as a
 *   maximum (`sizeInBytes <= threshold`), and the seed puts one join exactly on the boundary and one
 *   a single byte over so both sides of the real cutoff are graded.
 * - `join_candidates` carries twelve joins rather than the map's minimum set, because the boundary
 *   pair, the two AQE conversions, and the two left-side-smaller rows all have to coexist.
 * - `cluster_config` is one shared module-scoped seed rather than the map's two per-lesson config
 *   tables, and memory is printed with its unit suffix (`4g`, `8g`) rather than the map's bare
 *   `4096`, because that is what a real Environment tab shows and it makes lesson 1 drill 3's unit
 *   conversion load-bearing.
 * - `de-l10-shuffle-partition-count` drill 3 caps the coalesced count at the stage's existing
 *   partition count. AQE coalescing only merges adjacent post-shuffle partitions, so it can never
 *   return more partitions than the stage already ran.
 * - lesson 3's csdiagram is a max-over-mean vs max-over-median comparison table rather than the
 *   map's task-duration distribution table with the straggler highlighted; the comparison is the
 *   lesson's actual claim, and the distribution is already the live demo.
 * - lesson 3's fix ladder is ordered AQE, broadcast, salt rather than the map's salt, broadcast,
 *   AQE, because implication 32 requires AQE as the modern first answer.
 * - the capstone teach concludes that 200 shuffle partitions is REASONABLE on 64 cores (the
 *   2-to-4-per-core heuristic wants 128 to 256) and pivots the config finding to AQE being off,
 *   where the map lists 200-on-64-cores as one of the three coexisting findings. The arithmetic is
 *   the map's own, so the lesson corrects the finding rather than reciting it.
 * - the capstone practice asks for the dominant stage's share of its OWN job plus its p75 task time,
 *   not the map's share-of-all-stages plus max-over-median, because the model answer directly above
 *   it states those two numbers in prose and the module boss must not be answerable by
 *   transcription.
 * - the capstone's Tasks-tab capture is a SAMPLED export covering the three longest of the eleven
 *   stages rather than every task of every stage, which is what a real UI export at that size looks
 *   like and keeps the seed readable.
 *
 * Every single-file `expected` set is generated by running the reference SELECT through the SAME
 * self-hosted sql.js WASM the app ships (scratchpad sqlgen/gen.mjs), never hand-typed. Content
 * rules: no em dashes in learner prose; every prompt leads with the deliverable; practice never
 * ships a referenceSolution. Design in docs/data-engineering-curriculum/CURRICULUM-MAP.md.
 */
import type { SqlLevel, SqlModule } from "@/lib/tutorials/types"

type SqlLesson = SqlLevel["modules"][number]["lessons"][number]

// ---------------------------------------------------------------------------
// Simulated Spark UI captures for Module 10.2. Each table is named after the tab it comes from,
// so a learner who later opens a real Spark UI or a Glue job run recognizes the shape.
// ---------------------------------------------------------------------------

const JOIN_CANDIDATES_SEED = `CREATE TABLE join_candidates (
  join_id          TEXT,
  left_table       TEXT,
  left_size_bytes  INTEGER,   -- the planner's size estimate for the left input
  right_table      TEXT,
  right_size_bytes INTEGER,   -- the planner's size estimate for the right input
  planned_strategy TEXT,      -- what the physical plan picked before the job ran
  actual_strategy  TEXT       -- what the Spark UI shows actually ran; AQE can change it
);
INSERT INTO join_candidates (join_id, left_table, left_size_bytes, right_table, right_size_bytes, planned_strategy, actual_strategy) VALUES
  ('j01', 'fact_orders',      48000000000, 'dim_currency',       524288, 'broadcast_hash', 'broadcast_hash'),
  ('j02', 'fact_clicks',     120000000000, 'dim_country',       2097152, 'broadcast_hash', 'broadcast_hash'),
  ('j03', 'fact_sessions',    30000000000, 'dim_device',       41943040, 'sort_merge',     'broadcast_hash'),
  ('j04', 'fact_orders',      48000000000, 'dim_customer',     83886080, 'sort_merge',     'sort_merge'),
  ('j05', 'fact_events',     200000000000, 'dim_product',     314572800, 'sort_merge',     'sort_merge'),
  ('j06', 'fact_orders',      48000000000, 'fact_returns',   6291456000, 'sort_merge',     'sort_merge'),
  ('j07', 'fact_clicks',     120000000000, 'dim_campaign',    524288000, 'sort_merge',     'broadcast_hash'),
  ('j08', 'dim_experiment',       8388608, 'fact_page_views',90000000000, 'broadcast_hash', 'broadcast_hash'),
  ('j09', 'fact_orders',      48000000000, 'dim_user_agent', 2147483648, 'sort_merge',     'sort_merge'),
  ('j10', 'dim_locale',          10485760, 'fact_web_sessions',60000000000, 'sort_merge',   'sort_merge'),
  ('j11', 'fact_shipments',   80000000000, 'dim_carrier',     104857600, 'sort_merge',     'sort_merge'),
  ('j12', 'fact_impressions', 75000000000, 'dim_channel',      10485761, 'sort_merge',     'sort_merge');`

const CLUSTER_CONFIG_SEED = `CREATE TABLE cluster_config (
  setting TEXT,
  value   TEXT     -- every setting arrives as text, exactly as the Environment tab prints it,
                   -- so memory carries its unit suffix and byte counts do not
);
INSERT INTO cluster_config (setting, value) VALUES
  ('spark.sql.autoBroadcastJoinThreshold', '10485760'),
  ('spark.driver.memory',                  '4g'),
  ('spark.executor.memory',                '8g'),
  ('spark.executor.cores',                 '4'),
  ('spark.sql.shuffle.partitions',         '200'),
  ('spark.sql.adaptive.enabled',           'true');`

const JOIN_AND_CONFIG_SEED = JOIN_CANDIDATES_SEED + "\n" + CLUSTER_CONFIG_SEED

const BROADCAST_STAGES_SEED = `CREATE TABLE spark_stages (
  stage_id         INTEGER,
  job_id           INTEGER,
  name             TEXT,
  shuffle_read_mb  INTEGER,   -- what this stage pulled back from an upstream shuffle
  shuffle_write_mb INTEGER,   -- what this stage wrote out for the NEXT stage to read
  num_tasks        INTEGER
);
INSERT INTO spark_stages (stage_id, job_id, name, shuffle_read_mb, shuffle_write_mb, num_tasks) VALUES
  (1, 1, 'scan_orders',              0, 14336, 200),
  (2, 1, 'scan_customers',           0,  1024,  24),
  (3, 1, 'join_orders_customers', 15360, 11264, 200),
  (4, 1, 'aggregate_by_region',   11264,     0, 200),
  (5, 2, 'scan_clicks',               0,  3072, 200),
  (6, 2, 'join_clicks_campaign',   3072,   512, 200),
  (7, 2, 'write_output',            512,     0,  48);`

const TUNING_EXECUTORS_SEED = `CREATE TABLE spark_executors (
  executor_id TEXT,
  host        TEXT,
  cores       INTEGER,   -- task slots: one task occupies one core at a time
  memory_mb   INTEGER
);
INSERT INTO spark_executors (executor_id, host, cores, memory_mb) VALUES
  ('exec-1', 'ip-10-0-1-11', 4, 8192),
  ('exec-2', 'ip-10-0-1-12', 4, 8192),
  ('exec-3', 'ip-10-0-1-13', 4, 8192),
  ('exec-4', 'ip-10-0-1-14', 4, 8192),
  ('exec-5', 'ip-10-0-2-21', 4, 8192),
  ('exec-6', 'ip-10-0-2-22', 4, 8192),
  ('exec-7', 'ip-10-0-2-23', 4, 8192),
  ('exec-8', 'ip-10-0-2-24', 4, 8192);`

const TUNING_STAGES_SEED = `CREATE TABLE spark_stages (
  stage_id        INTEGER,
  name            TEXT,
  num_tasks       INTEGER,   -- one task per shuffle partition on the read side
  shuffle_read_mb INTEGER
);
INSERT INTO spark_stages (stage_id, name, num_tasks, shuffle_read_mb) VALUES
  (11, 'filter_events',       200,     60),
  (12, 'join_events_users',   200, 240000),
  (13, 'agg_daily',           200,  24000),
  (14, 'distinct_sessions',   200,    100),
  (15, 'write_curated',       200,  40000),
  (16, 'join_wide_dim',       200, 300000),
  (17, 'map_lookup',          200,    200),
  (18, 'repartition_by_user', 200, 200000);`

const TUNING_TASKS_SEED = `CREATE TABLE spark_tasks (
  task_id     INTEGER,
  stage_id    INTEGER,
  duration_ms INTEGER,
  spill_mb    INTEGER   -- what the task pushed to disk after running out of execution memory
);
INSERT INTO spark_tasks (task_id, stage_id, duration_ms, spill_mb) VALUES
  (1101, 11,     12,    0),
  (1102, 11,     18,    0),
  (1103, 11,     45,    0),
  (1104, 11,     30,    0),
  (1105, 11,     22,    0),
  (1106, 11,     60,    0),
  (1201, 12, 380000, 4096),
  (1202, 12, 410000, 3800),
  (1203, 12, 395000, 4200),
  (1204, 12, 420000, 5100),
  (1205, 12, 405000, 3900),
  (1206, 12, 390000, 4400);`

const TUNING_DEMO_SEED = TUNING_STAGES_SEED + "\n" + CLUSTER_CONFIG_SEED

/**
 * Five stages with DIFFERENT task counts (7, 5, 9, 11, 7), so the median rank `(n + 1) / 2` and the
 * p75 rank `(3 * n + 3) / 4` land somewhere different in every stage and a hard-coded rank cannot
 * pass. One task reads one shuffle partition, so every row here has a matching row in
 * `shuffle_partition_stats` with the same size. The two ratios are deliberately made to disagree:
 * stage 23 is 9x on task time but its biggest partition sits exactly on AQE's 256 MB floor, and
 * stage 24 is 5.77x on task time (it spilled) while its biggest partition is exactly 5x the median
 * partition, so neither is split however slow its straggler looks.
 */
const SKEW_TASKS_SEED = `CREATE TABLE spark_tasks (
  task_id         INTEGER,
  stage_id        INTEGER,
  duration_ms     INTEGER,
  shuffle_read_mb INTEGER,   -- the size of the one shuffle partition this task read
  spill_mb        INTEGER
);
INSERT INTO spark_tasks (task_id, stage_id, duration_ms, shuffle_read_mb, spill_mb) VALUES
  (2101, 21,  250000, 120,    0),
  (2102, 21,  320000, 140,    0),
  (2103, 21,  380000, 130,    0),
  (2104, 21,  400000, 110,    0),
  (2105, 21,  460000, 150,    0),
  (2106, 21,  520000, 160,    0),
  (2107, 21, 2400000, 900, 8192),
  (2201, 22,  110000, 190,    0),
  (2202, 22,  118000, 195,    0),
  (2203, 22,  122000, 200,    0),
  (2204, 22,  125000, 205,    0),
  (2205, 22,  130000, 210,    0),
  (2301, 23,    6000,  20,    0),
  (2302, 23,    7000,  22,    0),
  (2303, 23,    8000,  24,    0),
  (2304, 23,    9000,  26,    0),
  (2305, 23,   10000,  28,    0),
  (2306, 23,   11000,  30,    0),
  (2307, 23,   12000,  32,    0),
  (2308, 23,   13000,  34,    0),
  (2309, 23,   95000, 256,  256),
  (2401, 24,   40000, 120,    0),
  (2402, 24,   42000, 125,    0),
  (2403, 24,   45000, 130,    0),
  (2404, 24,   48000, 134,    0),
  (2405, 24,   50000, 136,    0),
  (2406, 24,   52000, 140,    0),
  (2407, 24,   55000, 142,    0),
  (2408, 24,   58000, 146,    0),
  (2409, 24,   60000, 150,    0),
  (2410, 24,   65000, 154,  128),
  (2411, 24,  300000, 700, 2048),
  (2501, 25,   20000,  90,    0),
  (2502, 25,   22000,  95,    0),
  (2503, 25,   24000, 100,    0),
  (2504, 25,   26000, 105,    0),
  (2505, 25,   28000, 110,    0),
  (2506, 25,   30000, 115,    0),
  (2507, 25,  143000, 600, 4096);`

const SHUFFLE_PARTITION_STATS_SEED = `CREATE TABLE shuffle_partition_stats (
  stage_id     INTEGER,
  partition_id INTEGER,
  rows         INTEGER,   -- how many rows landed in this shuffle partition
  size_mb      INTEGER
);
INSERT INTO shuffle_partition_stats (stage_id, partition_id, rows, size_mb) VALUES
  (21, 0,  3000000, 120),
  (21, 1,  3400000, 140),
  (21, 2,  3200000, 130),
  (21, 3,  2900000, 110),
  (21, 4,  3600000, 150),
  (21, 5,  3800000, 160),
  (21, 6, 24000000, 900),
  (22, 0,  4800000, 190),
  (22, 1,  4900000, 195),
  (22, 2,  5000000, 200),
  (22, 3,  5100000, 205),
  (22, 4,  5200000, 210),
  (23, 0,   500000,  20),
  (23, 1,   550000,  22),
  (23, 2,   600000,  24),
  (23, 3,   650000,  26),
  (23, 4,   700000,  28),
  (23, 5,   750000,  30),
  (23, 6,   800000,  32),
  (23, 7,   850000,  34),
  (23, 8,  6400000, 256),
  (24, 0,  3000000, 120),
  (24, 1,  3125000, 125),
  (24, 2,  3250000, 130),
  (24, 3,  3350000, 134),
  (24, 4,  3400000, 136),
  (24, 5,  3500000, 140),
  (24, 6,  3550000, 142),
  (24, 7,  3650000, 146),
  (24, 8,  3750000, 150),
  (24, 9,  3850000, 154),
  (24, 10, 17500000, 700),
  (25, 0,  2250000,  90),
  (25, 1,  2375000,  95),
  (25, 2,  2500000, 100),
  (25, 3,  2625000, 105),
  (25, 4,  2750000, 110),
  (25, 5,  2875000, 115),
  (25, 6, 15000000, 600);`

const SKEW_FULL_SEED = SKEW_TASKS_SEED + "\n" + SHUFFLE_PARTITION_STATS_SEED

/**
 * One coherent slow-job snapshot for the capstone: three jobs, eleven stages, and a SAMPLED Tasks-tab
 * export covering the three longest of them. Three findings coexist by design, an uncached scan repeated
 * across all three jobs, one join stage skewed 6x max-over-median, and 200 shuffle partitions on a
 * 64-core cluster with AQE off. `scan_returns_parquet` runs twice inside ONE job (a union branch
 * reading the same table), so a recomputation query written with COUNT(*) instead of
 * COUNT(DISTINCT job_id) reports it and fails.
 */
const CAPSTONE_SNAPSHOT_SEED = `CREATE TABLE spark_jobs (
  job_id     INTEGER,
  action     TEXT,     -- the action that submitted this job
  duration_s INTEGER
);
INSERT INTO spark_jobs (job_id, action, duration_s) VALUES
  (1, 'count',   430),
  (2, 'write',  3270),
  (3, 'collect', 580);

CREATE TABLE spark_stages (
  stage_id         INTEGER,
  job_id           INTEGER,
  name             TEXT,
  num_tasks        INTEGER,
  shuffle_read_mb  INTEGER,
  shuffle_write_mb INTEGER,
  duration_s       INTEGER
);
INSERT INTO spark_stages (stage_id, job_id, name, num_tasks, shuffle_read_mb, shuffle_write_mb, duration_s) VALUES
  (1, 1, 'scan_orders_parquet',   200,    0, 4096,  180),
  (2, 1, 'aggregate_count',       200, 4096,    0,  240),
  (3, 2, 'scan_orders_parquet',   200,    0, 4096,  195),
  (4, 2, 'join_orders_customers', 200, 4096, 5120, 2700),
  (5, 2, 'write_parquet',          48, 5120,    0,  110),
  (6, 2, 'filter_active_users',   200,    0,  512,   45),
  (7, 3, 'scan_orders_parquet',   200,    0, 4096,  186),
  (8, 3, 'aggregate_by_region',   200, 4096,    0,  320),
  (9, 3, 'filter_active_users',   200,    0,  512,   52),
  (10, 2, 'scan_returns_parquet', 200,    0, 2048,   70),
  (11, 2, 'scan_returns_parquet', 200,    0, 2048,   74);

CREATE TABLE spark_tasks (
  task_id     INTEGER,
  stage_id    INTEGER,   -- a SAMPLE of the Tasks tab: seven of each of the three longest stages'
                         -- 200 tasks, which is what the UI hands you when you export a page of it
  duration_ms INTEGER,
  spill_mb    INTEGER
);
INSERT INTO spark_tasks (task_id, stage_id, duration_ms, spill_mb) VALUES
  (201, 2,   36000,    0),
  (202, 2,   39000,    0),
  (203, 2,   42000,    0),
  (204, 2,   44000,    0),
  (205, 2,   47000,    0),
  (206, 2,   50000,    0),
  (207, 2,   66000,    0),
  (401, 4,  250000,    0),
  (402, 4,  320000,    0),
  (403, 4,  380000,    0),
  (404, 4,  400000,    0),
  (405, 4,  460000,    0),
  (406, 4,  520000,    0),
  (407, 4, 2400000, 6144),
  (801, 8,   42000,    0),
  (802, 8,   45000,    0),
  (803, 8,   48000,    0),
  (804, 8,   50000,    0),
  (805, 8,   52000,    0),
  (806, 8,   55000,    0),
  (807, 8,   58000,    0);

CREATE TABLE cluster_config (
  setting TEXT,
  value   TEXT
);
INSERT INTO cluster_config (setting, value) VALUES
  ('spark.sql.shuffle.partitions', '200'),
  ('spark.executor.instances',     '16'),
  ('spark.executor.cores',         '4'),
  ('spark.driver.memory',          '8g'),
  ('spark.sql.adaptive.enabled',   'false');`

// ---------------------------------------------------------------------------
// Module 10.2 — Shuffle, Skew & Tuning
// ---------------------------------------------------------------------------

const narrowWideAndBroadcast: SqlLesson = {
  id: "de-l10-narrow-wide-and-broadcast",
  title: "Narrow, Wide, and the Broadcast Decision at 10 MB and 100 MB",
  summary:
    "When a broadcast join beats sort-merge: the 10 MB auto threshold, the 100 MB manual ceiling, and the driver-memory bet in between.",
  estimatedMinutes: 28,
  difficulty: "medium",
  skills: [
    "narrow vs wide transformations",
    "broadcast join vs sort-merge join",
    "autoBroadcastJoinThreshold",
    "adaptive query execution",
    "shuffle-volume triage",
    "CASE classification",
    "window functions",
  ],
  teach: {
    estimatedMinutes: 14,
    markdown: `## What you already have, and what this adds

Level 6 taught the narrow/wide split and graded one binary flag: is this dimension under 10 MB, yes or no. None of that is repeated here. What is new is the **band** and the **bet**. A broadcast is not a free win you either qualify for or do not; it is a spectrum with a judgment call in the middle, and the judgment is about the driver's memory.

## Narrow and wide, read off the metrics

You can tell narrow from wide without seeing a single operator name, just from the stage metrics:

- A stage with **zero shuffle read** was fed narrowly. Nothing had to move to reach it, so it pipelines with whatever came before it.
- A stage with **shuffle read above zero** sits immediately downstream of a wide step. Rows moved across the network to get there.
- The **shuffle write belongs to the producing stage**. That is the Level 6 attribution rule, and here it stops being a fact to memorize and becomes the thing you read: the stage that shows the shuffle bytes is the one that paid to write them, not the one that consumed them.

## The broadcast band

A join has to get matching keys onto the same machine. There are two ways to do that, and the size of the smaller side decides which one you get.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["smaller side", "engine choice", "data movement", "what breaks if you force it"],
  "rows": [
    ["10485760 bytes (10 MB) or less", "broadcast, automatically", "small side copied to every executor", "nothing: this is the default"],
    ["one byte over 10 MB, up to about 100 MB", "broadcast, only if you hint it", "collected to the driver, then copied out", "driver memory, if the driver cannot hold it"],
    ["above about 100 MB", "sort-merge join", "both sides shuffled and sorted by key", "driver OOM, the classic forced-broadcast failure"]
  ],
  "highlightCols": ["what breaks if you force it"],
  "caption": "The broadcast band. The middle row is a judgment call, not a rule, because a hinted broadcast spends driver memory and network on every task slot."
}
\`\`\`

\`spark.sql.autoBroadcastJoinThreshold\` defaults to exactly **10485760 bytes**, which is 10 MB. At or under that line the planner broadcasts the small side without being asked: it ships a copy of the whole small table to every executor, so the join becomes narrow and no shuffle happens at all.

The threshold is a **maximum**, not a strict cutoff. Spark tests \`sizeInBytes <= threshold\`, so a side measured at exactly 10485760 bytes is auto-broadcast and a side one single byte larger is not. The capture below has both, one byte apart, because getting that boundary backwards is the kind of detail an interviewer uses to tell reading from doing.

Between 10 MB and roughly **100 MB** you can force the same thing with a broadcast hint. That is where the bet lives. The small side is first **collected to the driver**, and only then copied out to every executor, so a forced broadcast spends driver memory once and network bandwidth once per task slot. If the driver cannot hold it, you get the driver OOM from the execution-model lesson: a machine that was only supposed to schedule work is now holding data.

Above roughly 100 MB the sane answer is **sort-merge join**. Both sides shuffle, both sides sort by the join key, and the merge streams. It is slower than a broadcast but it scales, and forcing a broadcast there is how a job that used to be slow becomes a job that does not finish.

## AQE moves the line at runtime

Adaptive Query Execution has been on by default since Spark 3.2 and Glue 4.0. It re-plans between stages using the sizes it actually observed, which means a join the planner estimated at 500 MB can arrive post-filter at 8 MB, and AQE converts the sort-merge to a broadcast right then.

This is why \`planned_strategy\` and \`actual_strategy\` can disagree in the capture you are about to query, and it is why "check what actually ran, not what the plan said" is the follow-up that separates a strong answer from a memorized one.

## The 10 GB line

There is a point where tuning stops being the right conversation. A join stage that writes more than **10 GB of shuffle** is the physical evidence behind the design-time heuristic Level 7 states as "keep the star schema while the join side stays under roughly 10 GB". When this query returns rows, the fix is not a config flag. The fix is modeling: pre-join into one wide table, or co-locate the two sides on a shared distribution key so the join stops needing a network move at all.

**Common mistake:** reading the shuffle write off the stage that consumed it. The consuming stage shows shuffle **read**; the stage that shows shuffle **write** is the producer, and that is the one whose output you would shrink by changing the model.

**Interview nuance:** candidates who answer "broadcast the small table" get a follow-up asking how small. The strong answer names all three bands: 10 MB automatic, up to about 100 MB by hint if the driver can hold it, sort-merge past that. Adding "and AQE may convert it at runtime anyway, so I would check the actual strategy in the UI" is the sentence that makes it sound like you have done this.

> **On a real platform this differs.** Redshift expresses the same decision as a table property rather than a query hint: \`DISTSTYLE ALL\` keeps a full copy of a small dimension on every node, which is a permanent broadcast decided at load time instead of a per-query one. Snowflake and BigQuery decide it for you and expose the choice only in the query profile. The reasoning is identical everywhere: how big is the small side, and who has to hold it.`,
    demoSeedSql: JOIN_CANDIDATES_SEED,
    demoCode: `-- The join candidates with the size of their smaller side, and what the plan
-- said versus what the UI shows actually ran.
SELECT join_id, left_table, right_table,
       ROUND(MIN(left_size_bytes, right_size_bytes) / 1048576.0, 1) AS small_side_mb,
       planned_strategy, actual_strategy
FROM join_candidates
ORDER BY small_side_mb;`,
    showDemoInput: false,
  },
  apply: {
    id: "de-l10-narrow-wide-and-broadcast-apply",
    executionMode: "single-file",
    prompt: `Write a query that returns the join strategy each join should use, as \`(join_id, small_side_mb, strategy)\`, smallest small side first, over \`join_candidates(join_id, left_table, left_size_bytes, right_table, right_size_bytes, planned_strategy, actual_strategy)\`.

The smaller side is whichever of \`left_size_bytes\` and \`right_size_bytes\` is lower. Report it as \`small_side_mb\` (1 MB is 1048576 bytes) rounded to 1 decimal. \`strategy\` is \`'auto_broadcast'\` when the smaller side is 10485760 bytes **or less**, since the threshold is a maximum rather than a strict cutoff, \`'hint_broadcast'\` above that up to and including 104857600 bytes, and \`'sort_merge'\` above that. Alias the columns exactly, ordered by \`small_side_mb\` ascending and then \`join_id\` ascending.`,
    starterCode: `-- Which join strategy each join earns, from the size of its smaller side.
SELECT join_id
  -- the smaller of the two sides in MB, then the band it falls into
FROM join_candidates
ORDER BY small_side_mb, join_id;`,
    hints: [
      "`MIN(left_size_bytes, right_size_bytes)` is SQLite's two-argument scalar minimum, not the aggregate.",
      "`ROUND(MIN(left_size_bytes, right_size_bytes) / 1048576.0, 1) AS small_side_mb` converts bytes to MB.",
      "A three-branch `CASE` over the same `MIN(...)` expression gives the strategy: `<= 10485760`, then `<= 104857600`, then `ELSE`.",
      "Two joins round to the same `small_side_mb`, so `join_id` has to break the tie in the ORDER BY.",
    ],
    referenceSolution: `SELECT join_id,
       ROUND(MIN(left_size_bytes, right_size_bytes) / 1048576.0, 1) AS small_side_mb,
       CASE
         WHEN MIN(left_size_bytes, right_size_bytes) <= 10485760 THEN 'auto_broadcast'
         WHEN MIN(left_size_bytes, right_size_bytes) <= 104857600 THEN 'hint_broadcast'
         ELSE 'sort_merge'
       END AS strategy
FROM join_candidates
ORDER BY small_side_mb, join_id;`,
    singleFile: {
      seedSql: JOIN_CANDIDATES_SEED,
      orderMatters: true,
      assertColumnNames: true,
      expected: {
        columns: ["join_id", "small_side_mb", "strategy"],
        rows: [
          ["j01", 0.5, "auto_broadcast"],
          ["j02", 2, "auto_broadcast"],
          ["j08", 8, "auto_broadcast"],
          ["j10", 10, "auto_broadcast"],
          ["j12", 10, "hint_broadcast"],
          ["j03", 40, "hint_broadcast"],
          ["j04", 80, "hint_broadcast"],
          ["j11", 100, "hint_broadcast"],
          ["j05", 300, "sort_merge"],
          ["j07", 500, "sort_merge"],
          ["j09", 2048, "sort_merge"],
          ["j06", 6000, "sort_merge"],
        ],
      },
    },
  },
  practice: {
    id: "de-l10-narrow-wide-and-broadcast-practice",
    executionMode: "single-file",
    prompt: `Write a query that returns the shuffle-heavy stages a modeling change would target, as \`(stage_id, shuffle_write_gb, pct_of_job_shuffle)\`, biggest first, over \`spark_stages(stage_id, job_id, name, shuffle_read_mb, shuffle_write_mb, num_tasks)\`.

Keep only stages writing more than 10 GB of shuffle (1 GB is 1024 MB, so more than 10240 MB). Report \`shuffle_write_gb\` rounded to 1 decimal and \`pct_of_job_shuffle\` rounded to 2 decimals, where the denominator is that stage's own job's total shuffle write across **every** stage in the job, including the ones this query filters out. Ordered by \`shuffle_write_gb\` descending.`,
    starterCode: `-- Stages writing over 10 GB of shuffle, and how much of their job's shuffle that is.
SELECT stage_id, shuffle_write_mb
FROM spark_stages
;`,
    hints: [
      "Compute the per-job total before filtering, or the filter will shrink the denominator: `SUM(shuffle_write_mb) OVER (PARTITION BY job_id)` inside a CTE.",
      "Then filter the CTE with `WHERE shuffle_write_mb > 10240` and divide by the total you already carried through.",
    ],
    singleFile: {
      seedSql: BROADCAST_STAGES_SEED,
      orderMatters: true,
      assertColumnNames: true,
      expected: {
        columns: ["stage_id", "shuffle_write_gb", "pct_of_job_shuffle"],
        rows: [
          [1, 14, 53.85],
          [3, 11, 42.31],
        ],
      },
    },
  },
  extraPractice: [
    {
      id: "de-l10-narrow-wide-and-broadcast-drill-1",
      executionMode: "single-file",
      prompt: `**Easy.** Write a query that returns how many stages were fed narrowly, meaning they read nothing back from an upstream shuffle, as \`(narrow_fed_stages)\`, over \`spark_stages\`.`,
      starterCode: `-- Stages with no shuffle read at all.
SELECT
FROM spark_stages;`,
      hints: [
        "A narrowly fed stage has `shuffle_read_mb = 0`.",
        "`COUNT(*)` those rows and alias the result `narrow_fed_stages`.",
      ],
      referenceSolution: `SELECT COUNT(*) AS narrow_fed_stages
FROM spark_stages
WHERE shuffle_read_mb = 0;`,
      singleFile: {
        seedSql: BROADCAST_STAGES_SEED,
        assertColumnNames: true,
        expected: { columns: ["narrow_fed_stages"], rows: [[3]] },
      },
    },
    {
      id: "de-l10-narrow-wide-and-broadcast-drill-2",
      executionMode: "single-file",
      prompt: `**Medium.** Write a query that returns the joins where the plan and the run disagree, as \`(join_id, planned_strategy, actual_strategy)\`, in \`join_id\` order, over \`join_candidates\`. These are the AQE runtime conversions.`,
      starterCode: `-- Joins whose actual strategy is not the one the planner picked.
SELECT join_id, planned_strategy, actual_strategy
FROM join_candidates
ORDER BY join_id;`,
      hints: [
        "`WHERE planned_strategy <> actual_strategy` keeps only the disagreements.",
        "Order by `join_id`.",
      ],
      referenceSolution: `SELECT join_id, planned_strategy, actual_strategy
FROM join_candidates
WHERE planned_strategy <> actual_strategy
ORDER BY join_id;`,
      singleFile: {
        seedSql: JOIN_CANDIDATES_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["join_id", "planned_strategy", "actual_strategy"],
          rows: [
            ["j03", "sort_merge", "broadcast_hash"],
            ["j07", "sort_merge", "broadcast_hash"],
          ],
        },
      },
    },
    {
      id: "de-l10-narrow-wide-and-broadcast-drill-3",
      executionMode: "single-file",
      prompt: `**Hard.** Write a query that returns the joins whose smaller side would eat more than a quarter of the driver's memory if you broadcast it, as \`(join_id, small_side_mb)\`, biggest first, over \`join_candidates\` and \`cluster_config(setting, value)\`.

\`spark.driver.memory\` is stored as text with the unit suffix the Environment tab prints, so \`'4g'\` means 4 gigabytes. Strip the suffix and convert before you compare: 1 GB is 1024 MB, and 1 MB is 1048576 bytes.`,
      starterCode: `-- Broadcasts that would spend more than a quarter of the driver's heap.
SELECT j.join_id
FROM join_candidates j
CROSS JOIN cluster_config c
WHERE c.setting = 'spark.driver.memory'
;`,
      hints: [
        "`REPLACE(c.value, 'g', '')` drops the suffix, and `CAST(... AS INTEGER) * 1024` turns the result into megabytes.",
        "Multiply those megabytes by 1048576 for bytes, then divide by 4 for the budget.",
        "Compare `MIN(j.left_size_bytes, j.right_size_bytes)` against the budget, then report the same MIN in MB as `small_side_mb`.",
      ],
      referenceSolution: `SELECT j.join_id,
       ROUND(MIN(j.left_size_bytes, j.right_size_bytes) / 1048576.0, 1) AS small_side_mb
FROM join_candidates j
CROSS JOIN cluster_config c
WHERE c.setting = 'spark.driver.memory'
  AND MIN(j.left_size_bytes, j.right_size_bytes)
      > CAST(REPLACE(c.value, 'g', '') AS INTEGER) * 1024 * 1048576 / 4
ORDER BY small_side_mb DESC;`,
      singleFile: {
        seedSql: JOIN_AND_CONFIG_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["join_id", "small_side_mb"],
          rows: [
            ["j06", 6000],
            ["j09", 2048],
          ],
        },
      },
    },
  ],
}

const shufflePartitionCount: SqlLesson = {
  id: "de-l10-shuffle-partition-count",
  title: "Shuffle Partition Count: Why 200 Is Wrong for Your Job",
  summary:
    "Why Spark's default of 200 shuffle partitions is wrong for your job, and how the 2-to-4-tasks-per-core heuristic sizes it correctly.",
  estimatedMinutes: 26,
  difficulty: "medium",
  skills: [
    "spark.sql.shuffle.partitions",
    "partitions per core heuristic",
    "repartition vs coalesce",
    "AQE partition coalescing",
    "CROSS JOIN with a config table",
    "CASE classification",
    "integer arithmetic",
  ],
  teach: {
    estimatedMinutes: 12,
    markdown: `## 200 is a placeholder, not an answer

\`spark.sql.shuffle.partitions\` decides how many partitions come out the other side of every shuffle, and therefore how many tasks the next stage runs. Its default is **200**, and 200 was never chosen for your data. It is wrong in both directions:

- **Tiny data, 200 partitions.** Each task gets a few hundred kilobytes. The time to schedule a task, ship it to an executor, open a shuffle file, and report back dwarfs the time to process the rows. The job spends its life in overhead, and the tell in the metrics is a stage full of tasks that finish in tens of milliseconds.
- **Huge data, 200 partitions.** Each task gets gigabytes. It runs out of execution memory, **spills** to local disk, and either crawls or dies with an executor OOM. The tell is a large \`spill_mb\` and very long task durations.

## The heuristic worth memorizing

Aim for **2 to 4 partitions per total core** in the cluster. Total cores means every executor's cores added up, because a core is a task slot and only one task runs per slot at a time. Two per core gives every slot a couple of waves of work, which is enough to keep everything busy and to absorb one slow task without leaving the cluster idle. Much past four and you are paying scheduling overhead for parallelism you cannot use.

On a 32-core cluster that is 64 to 128 partitions. The default of 200 is not catastrophic there, but it is a number someone else picked.

## repartition and coalesce are not the same tool

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["operation", "direction", "shuffles?", "when you reach for it"],
  "rows": [
    ["repartition(n)", "up or down", "yes, a full shuffle", "you need an even redistribution, or you are partitioning by a column"],
    ["coalesce(n)", "down only", "no, it merges neighbours", "you are writing out and want fewer, bigger output files"]
  ],
  "highlightCols": ["shuffles?"],
  "caption": "coalesce is cheap because it never moves rows across the network; it just glues adjacent partitions together, which is also why it can leave you with uneven ones."
}
\`\`\`

The trap: \`coalesce\` avoids the shuffle by merging neighbouring partitions in place, so if those neighbours were uneven, the result is uneven too. \`repartition\` costs a shuffle and gives you even partitions. Cheap and lumpy, or expensive and level.

## AQE already does half of this

Adaptive Query Execution has been on by default since **Spark 3.2** and **Glue 4.0**, and one of the things it does is coalesce post-shuffle partitions: it looks at the actual sizes after the shuffle and glues small ones together toward a target size. So the old advice, "always tune shuffle.partitions by hand", is half obsolete. An answer that never mentions AQE reads as 2019-era.

The target it aims at is \`spark.sql.adaptive.advisoryPartitionSizeInBytes\`, and its default is **64 MB**. Teams and platforms raise it routinely, so when you see a bigger number in a runbook, read it as a setting somebody chose rather than as the default. The hard drill below uses a configured 128 MB target for exactly that reason.

What AQE does not do is rescue you from a badly chosen partition count on the way IN to an expensive stage, and it cannot coalesce partitions that were never small. It also only ever **merges neighbours**, so it can lower a stage's partition count and never raise it: if a stage already ran 200 tasks, coalescing gives you at most 200 partitions no matter how many gigabytes each one held. Knowing the heuristic still matters; you just get to say "and AQE handles the small-partition case for me".

**Currency note:** Spark 4.0 shipped in mid-2025 and is generally available on EMR. Its headline change is ANSI mode on by default, so divide-by-zero, overflow, and bad casts now fail fast instead of quietly returning null. That does not change partition tuning, but it does change the answer to every classic "why did my column go null" question.

**Common mistake:** counting executors instead of cores. Eight executors is not eight task slots; eight executors with four cores each is thirty-two, and the heuristic is per core.

**Interview nuance:** "your job runs 200 tasks on an 8-core cluster, what do you change" is asked almost verbatim. The full answer is three sentences: 200 is the default, not a decision; 2 to 4 per core puts you at 16 to 32 here; and AQE will coalesce the small ones at runtime anyway, so I would confirm what actually ran before hand-tuning.

> **On a real platform this differs.** Warehouses hide this knob entirely. Snowflake sizes the compute for you by warehouse size, BigQuery allocates slots dynamically, and Redshift ties parallelism to node slices. The concept survives the migration: too few parallel units means giant units that spill, too many means overhead, and the sweet spot is a small multiple of the slots you actually have.`,
    demoSeedSql: TUNING_DEMO_SEED,
    demoCode: `-- Every stage's average megabytes per task, next to the partition count the job is configured with.
SELECT s.stage_id, s.name, s.num_tasks,
       ROUND(s.shuffle_read_mb * 1.0 / s.num_tasks, 2) AS mb_per_task,
       c.value AS configured_partitions
FROM spark_stages s
CROSS JOIN cluster_config c
WHERE c.setting = 'spark.sql.shuffle.partitions'
ORDER BY mb_per_task DESC;`,
    showDemoInput: false,
  },
  apply: {
    id: "de-l10-shuffle-partition-count-apply",
    executionMode: "single-file",
    prompt: `Write a query that returns the cluster's recommended shuffle-partition range next to the value it is actually configured with, as \`(total_cores, low_recommendation, high_recommendation, configured)\`, over \`spark_executors(executor_id, host, cores, memory_mb)\` and \`cluster_config(setting, value)\`.

\`total_cores\` is every executor's cores added up. \`low_recommendation\` is 2 times that, \`high_recommendation\` is 4 times that. \`configured\` is the \`spark.sql.shuffle.partitions\` setting, cast to an integer. One row out. Alias the columns exactly.`,
    starterCode: `-- The 2-to-4-per-core recommendation, beside what the job is actually set to.
SELECT
FROM spark_executors
;`,
    hints: [
      "Collapse the executors first: `(SELECT SUM(cores) AS total_cores FROM spark_executors)` is a one-row subquery you can join to.",
      "`CROSS JOIN cluster_config c WHERE c.setting = 'spark.sql.shuffle.partitions'` brings the configured value alongside.",
      "The config value is text, so `CAST(c.value AS INTEGER) AS configured`.",
    ],
    referenceSolution: `SELECT e.total_cores,
       e.total_cores * 2 AS low_recommendation,
       e.total_cores * 4 AS high_recommendation,
       CAST(c.value AS INTEGER) AS configured
FROM (SELECT SUM(cores) AS total_cores FROM spark_executors) e
CROSS JOIN cluster_config c
WHERE c.setting = 'spark.sql.shuffle.partitions';`,
    singleFile: {
      seedSql: TUNING_EXECUTORS_SEED + "\n" + CLUSTER_CONFIG_SEED,
      assertColumnNames: true,
      expected: {
        columns: ["total_cores", "low_recommendation", "high_recommendation", "configured"],
        rows: [[32, 64, 128, 200]],
      },
    },
  },
  practice: {
    id: "de-l10-shuffle-partition-count-practice",
    executionMode: "single-file",
    prompt: `Write a query that classifies every stage by how much data each of its tasks handled, as \`(stage_id, avg_mb_per_task, verdict)\`, in \`stage_id\` order, over \`spark_stages(stage_id, name, num_tasks, shuffle_read_mb)\`.

\`avg_mb_per_task\` is \`shuffle_read_mb\` divided by \`num_tasks\`, rounded to 2 decimals. \`verdict\` is \`'over_partitioned'\` below 1 MB per task, \`'under_partitioned'\` above 1000 MB per task, and \`'ok'\` in between. A stage sitting exactly on either boundary is \`'ok'\`.`,
    starterCode: `-- How much data each task actually handled, and the verdict that follows.
SELECT stage_id, num_tasks, shuffle_read_mb
FROM spark_stages
ORDER BY stage_id;`,
    hints: [
      "Force real division with `shuffle_read_mb * 1.0 / num_tasks`, otherwise SQLite gives you integer division.",
      "Both boundaries are strict: `< 1` and `> 1000`, so a stage at exactly 1.0 or exactly 1000.0 falls through to `'ok'`.",
    ],
    singleFile: {
      seedSql: TUNING_STAGES_SEED,
      orderMatters: true,
      assertColumnNames: true,
      expected: {
        columns: ["stage_id", "avg_mb_per_task", "verdict"],
        rows: [
          [11, 0.3, "over_partitioned"],
          [12, 1200, "under_partitioned"],
          [13, 120, "ok"],
          [14, 0.5, "over_partitioned"],
          [15, 200, "ok"],
          [16, 1500, "under_partitioned"],
          [17, 1, "ok"],
          [18, 1000, "ok"],
        ],
      },
    },
  },
  extraPractice: [
    {
      id: "de-l10-shuffle-partition-count-drill-1",
      executionMode: "single-file",
      prompt: `**Easy.** Write a query that returns how much each stage spilled to disk in total, as \`(stage_id, total_spill_mb)\`, biggest spiller first, over \`spark_tasks(task_id, stage_id, duration_ms, spill_mb)\`.`,
      starterCode: `-- Total spill per stage.
SELECT stage_id
FROM spark_tasks
GROUP BY stage_id;`,
      hints: ["`SUM(spill_mb) AS total_spill_mb` per stage.", "`ORDER BY total_spill_mb DESC`."],
      referenceSolution: `SELECT stage_id, SUM(spill_mb) AS total_spill_mb
FROM spark_tasks
GROUP BY stage_id
ORDER BY total_spill_mb DESC;`,
      singleFile: {
        seedSql: TUNING_TASKS_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["stage_id", "total_spill_mb"],
          rows: [
            [12, 25496],
            [11, 0],
          ],
        },
      },
    },
    {
      id: "de-l10-shuffle-partition-count-drill-2",
      executionMode: "single-file",
      prompt: `**Medium.** Write a query that returns what share of each stage's tasks finished in under 50 milliseconds, as \`(stage_id, pct_under_50ms)\`, in \`stage_id\` order, over \`spark_tasks\`. A high share is the over-partitioning signal: those tasks cost more to schedule than to run. Round to 2 decimals.`,
      starterCode: `-- Share of tasks that finished almost instantly.
SELECT stage_id
FROM spark_tasks
GROUP BY stage_id
ORDER BY stage_id;`,
      hints: [
        "`SUM(CASE WHEN duration_ms < 50 THEN 1 ELSE 0 END)` counts the fast ones.",
        "Divide by `COUNT(*)`, multiply by `100.0`, and round to 2 decimals.",
      ],
      referenceSolution: `SELECT stage_id,
       ROUND(100.0 * SUM(CASE WHEN duration_ms < 50 THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_under_50ms
FROM spark_tasks
GROUP BY stage_id
ORDER BY stage_id;`,
      singleFile: {
        seedSql: TUNING_TASKS_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["stage_id", "pct_under_50ms"],
          rows: [
            [11, 83.33],
            [12, 0],
          ],
        },
      },
    },
    {
      id: "de-l10-shuffle-partition-count-drill-3",
      executionMode: "single-file",
      prompt: `**Hard.** Write a query that returns how many partitions AQE would coalesce each stage down to at a configured 128 MB target, as \`(stage_id, coalesced_partitions)\`, in \`stage_id\` order, over \`spark_stages\`.

That is \`shuffle_read_mb\` divided by 128, rounded **up**, then capped at \`num_tasks\`, the partition count the stage already ran. The cap is the part that matters: coalescing only merges neighbouring partitions, so it can never hand back more partitions than the stage started with. SQLite has no ceiling function, so round up with integer arithmetic: adding 127 before an integer division by 128.`,
      starterCode: `-- Partitions after AQE coalescing toward a 128 MB target.
SELECT stage_id, num_tasks, shuffle_read_mb
FROM spark_stages
ORDER BY stage_id;`,
      hints: [
        "`(shuffle_read_mb + 127) / 128` is integer division in SQLite when both sides are integers, which is exactly the ceiling.",
        "`MIN(num_tasks, ...)` with two arguments is SQLite's scalar minimum, which applies the cap.",
        "Alias it `coalesced_partitions` and order by `stage_id`.",
      ],
      referenceSolution: `SELECT stage_id,
       MIN(num_tasks, (shuffle_read_mb + 127) / 128) AS coalesced_partitions
FROM spark_stages
ORDER BY stage_id;`,
      singleFile: {
        seedSql: TUNING_STAGES_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["stage_id", "coalesced_partitions"],
          rows: [
            [11, 1],
            [12, 200],
            [13, 188],
            [14, 1],
            [15, 200],
            [16, 200],
            [17, 2],
            [18, 200],
          ],
        },
      },
    },
  ],
}

const diagnosingSkew: SqlLesson = {
  id: "de-l10-diagnosing-skew",
  title: "Skew Diagnosis: Max vs Median, Not Max vs Mean",
  summary:
    "Why the mean hides a straggler task and the median exposes it, plus AQE's 5x-median rule and the skew fix ladder in order.",
  estimatedMinutes: 28,
  difficulty: "hard",
  skills: [
    "data skew diagnosis",
    "median via ROW_NUMBER",
    "percentiles in SQL",
    "AQE skew-join splitting",
    "salting a hot key",
    "spill as a corroborating signal",
    "window functions",
  ],
  teach: {
    estimatedMinutes: 14,
    markdown: `## The straggler poisons the average it is hiding in

Level 6 compared a slow task to the stage **average** and flagged that this was an imperfect proxy. This lesson is that caveat, promoted to the whole point.

Say a stage runs seven tasks: six finish in about 400 seconds and one takes 2,400. The mean is about 690 seconds, so the straggler looks like it took 3.5 times the average. That understates it badly, because the straggler is one of the numbers being averaged. It drags the mean up toward itself and then hides behind the number it moved.

The **median** is immune to that. Six tasks at roughly 400 seconds and one at 2,400 gives a median of 400, and 2,400 over 400 is a clean **6x**. That ratio, max task time over median task time, is the signal every Spark interview corpus cites verbatim, and it is what the Spark UI's summary-metrics row is showing you when it prints min, 25th, median, 75th, and max side by side.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["what you compare", "the number it gives", "why it misleads"],
  "rows": [
    ["max over mean", "3.5x", "the straggler is inside the mean, pulling it up"],
    ["max over median", "6x", "nothing: the median ignores the outlier entirely"],
    ["max minus mean", "1,710s", "an absolute number with no scale to judge it against"]
  ],
  "highlightCols": ["the number it gives"],
  "caption": "Same seven tasks, three ways of asking the same question. Only the median-based ratio reports the skew at its true size."
}
\`\`\`

## Computing a median in SQL that has no median function

SQLite has no \`PERCENTILE_CONT\`, and that limitation is useful, because the technique that works without it works everywhere:

1. Number the rows within each group, ordered by the value: \`ROW_NUMBER() OVER (PARTITION BY stage_id ORDER BY duration_ms)\`.
2. Count the rows in the same group: \`COUNT(*) OVER (PARTITION BY stage_id)\`.
3. Keep the row whose number is the middle one: \`WHERE rn = (n + 1) / 2\`.

With 7 rows, \`(7 + 1) / 2\` is 4, the fourth-smallest; with 11 rows it is 6. Integer division does the work, and because the rank comes out of the row count rather than out of your head, the same query is correct for a stage with 5 tasks and a stage with 500. The same shape gives you any percentile: the 75th is \`rn = (3 * n + 3) / 4\`, which is the nearest-rank definition of a percentile written with integers.

## AQE's rule, with its real numbers

Adaptive Query Execution will split a skewed shuffle partition automatically, but only when **both** conditions hold: the partition is **more than 5 times the median partition**, **and** it is **larger than 256 MB**. Those are two settings with names worth knowing, \`spark.sql.adaptive.skewJoin.skewedPartitionFactor\` (default 5) and \`spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes\` (default 256 MB). Both matter. A partition 8 times the median but only 40 MB is not worth splitting, so AQE leaves it, and if your job is still slow you are looking at the wrong stage.

**Be careful which ratio you are applying.** The signal you report to a human is max task TIME over median task time, because time is what the Spark UI puts in front of you and time is what the person asking cares about. The rule AQE acts on is about SIZE: the factor of 5 and the 256 MB floor are both measured in bytes, against the median partition size. Usually the two agree, since a partition that holds five times the data takes roughly five times as long. When they disagree, the size numbers are the ones that decide whether the split happens, and a task that ran long because it **spilled** is the usual reason they disagree: spilling makes time grow faster than bytes.

## The fix ladder

In the order an interviewer wants to hear it:

1. **Let AQE split it.** Free, already on by default since Spark 3.2 and Glue 4.0, and it is the modern first answer. Confirm it is enabled before you do anything cleverer.
2. **Broadcast the small side.** Only if the small side fits the band from the module opener: under 10 MB automatically, up to about 100 MB by hint. This removes the shuffle entirely, so the hot key stops being a problem instead of being split.
3. **Salt the hot key.** Append a small random suffix to the skewed key on the big side, replicate the small side across every salt value, join on the salted key, then aggregate away the salt. It works on any engine and needs no runtime magic, which is why it is still the answer when the first two do not apply.

\`spill_mb\` corroborates. A straggler that also spilled was not merely unlucky in scheduling; it genuinely held more data than its share of memory could take, which is the fingerprint of a hot key rather than a slow machine.

**Common mistake:** treating one slow task as skew without checking the others. If every task in the stage is slow, the stage is just big, and the answer is more parallelism or less data, not salting. Skew is a **distribution** claim, so it needs a distribution to back it.

**Interview nuance:** "one task took 40 minutes, the median was 2 minutes, diagnose it" is the detection half of the Amazon EMR question. The expected answer names the ratio first (20x, so this is skew, not size), then the corroborating evidence (spill, and the partition's row count), then the ladder in order. Candidates who jump straight to salting without measuring first lose the point.

> **On a real platform this differs.** The Spark UI hands you the percentiles precomputed in the stage summary-metrics table, so nobody writes this query against a live cluster. You write it against exported history, against Glue job metrics in CloudWatch, or against a query-history table in a warehouse, where the same ROW_NUMBER trick is the only way to get a median out. And in a warehouse, skew shows up as one distribution slice doing all the work rather than one task, which you find with the same ratio over a different table.`,
    demoSeedSql: SKEW_TASKS_SEED,
    demoCode: `-- The task-duration distribution for one stage, slowest last. Notice how far the
-- last task sits from every other one, and that it is the only one that spilled.
SELECT task_id, duration_ms, shuffle_read_mb, spill_mb
FROM spark_tasks
WHERE stage_id = 21
ORDER BY duration_ms;`,
    showDemoInput: false,
  },
  apply: {
    id: "de-l10-diagnosing-skew-apply",
    executionMode: "single-file",
    prompt: `Write a query that returns the skew signal for every stage, as \`(stage_id, median_ms, max_ms, max_over_median)\`, highest ratio first, over \`spark_tasks(task_id, stage_id, duration_ms, shuffle_read_mb, spill_mb)\`.

\`median_ms\` is the middle task duration in the stage, found with \`ROW_NUMBER\` rather than a percentile function. \`max_ms\` is the slowest task. \`max_over_median\` is \`max_ms\` divided by \`median_ms\`, rounded to 2 decimals. Every stage has an odd number of tasks, so the median is a single row. Alias the columns exactly.`,
    starterCode: `-- Median, max, and the ratio between them, per stage.
WITH ranked AS (
  SELECT stage_id, duration_ms
    -- number the tasks within each stage, and count how many there are
  FROM spark_tasks
)
SELECT
FROM ranked;`,
    hints: [
      "In `ranked`, add `ROW_NUMBER() OVER (PARTITION BY stage_id ORDER BY duration_ms) AS rn` and `COUNT(*) OVER (PARTITION BY stage_id) AS n`.",
      "A second CTE keeps only the middle row per stage: `WHERE rn = (n + 1) / 2`, aliasing `duration_ms` as `median_ms`.",
      "Join that back to `spark_tasks` on `stage_id` to get `MAX(duration_ms) AS max_ms`, then `ROUND(1.0 * MAX(duration_ms) / median_ms, 2)`.",
    ],
    referenceSolution: `WITH ranked AS (
  SELECT stage_id,
         duration_ms,
         ROW_NUMBER() OVER (PARTITION BY stage_id ORDER BY duration_ms) AS rn,
         COUNT(*) OVER (PARTITION BY stage_id) AS n
  FROM spark_tasks
),
med AS (
  SELECT stage_id, duration_ms AS median_ms
  FROM ranked
  WHERE rn = (n + 1) / 2
)
SELECT m.stage_id,
       m.median_ms,
       MAX(t.duration_ms) AS max_ms,
       ROUND(1.0 * MAX(t.duration_ms) / m.median_ms, 2) AS max_over_median
FROM med m
JOIN spark_tasks t ON t.stage_id = m.stage_id
GROUP BY m.stage_id, m.median_ms
ORDER BY max_over_median DESC;`,
    singleFile: {
      seedSql: SKEW_TASKS_SEED,
      orderMatters: true,
      assertColumnNames: true,
      expected: {
        columns: ["stage_id", "median_ms", "max_ms", "max_over_median"],
        rows: [
          [23, 10000, 95000, 9.5],
          [21, 400000, 2400000, 6],
          [24, 52000, 300000, 5.77],
          [25, 26000, 143000, 5.5],
          [22, 122000, 130000, 1.07],
        ],
      },
    },
  },
  practice: {
    id: "de-l10-diagnosing-skew-practice",
    executionMode: "single-file",
    prompt: `Write a query that returns the stages AQE would actually split for skew, as \`(stage_id, max_over_median, max_partition_mb, size_over_median)\`, biggest \`size_over_median\` first, over \`spark_tasks(task_id, stage_id, duration_ms, shuffle_read_mb, spill_mb)\` and \`shuffle_partition_stats(stage_id, partition_id, rows, size_mb)\`.

AQE decides on **partition sizes**, so \`size_over_median\` is the stage's largest \`size_mb\` divided by its median \`size_mb\`, and the stage is split only when both conditions hold: \`size_over_median\` is **more than 5**, and \`max_partition_mb\` is **more than 256**. Both cutoffs are strict, so a stage sitting exactly on either one is not split. Report \`max_over_median\`, the task-time ratio from Apply, alongside them, because that is the number you would show a human even though it is not the number AQE tests. Round both ratios to 2 decimals.`,
    starterCode: `-- Stages that clear BOTH of AQE's size-based skew-split conditions.
WITH ranked AS (
  SELECT stage_id, duration_ms
  FROM spark_tasks
)
SELECT
FROM ranked;`,
    hints: [
      "Reuse the median-by-ROW_NUMBER shape from Apply twice: once over `duration_ms` for `max_over_median`, once over `size_mb` in `shuffle_partition_stats` for the median partition.",
      "Stages hold different numbers of partitions, so the middle rank has to come from `COUNT(*) OVER (PARTITION BY stage_id)` rather than from a fixed number.",
      "Both cutoffs are strict inequalities, and they are combined with `AND`, not `OR`. Two stages look skewed on task time and still fail one of them.",
    ],
    singleFile: {
      seedSql: SKEW_FULL_SEED,
      orderMatters: true,
      assertColumnNames: true,
      expected: {
        columns: ["stage_id", "max_over_median", "max_partition_mb", "size_over_median"],
        rows: [
          [21, 6, 900, 6.43],
          [25, 5.5, 600, 5.71],
        ],
      },
    },
  },
  extraPractice: [
    {
      id: "de-l10-diagnosing-skew-drill-1",
      executionMode: "single-file",
      prompt: `**Easy.** Write a query that returns how many tasks spilled to disk in each stage that had at least one, as \`(stage_id, spilling_tasks)\`, most spilling tasks first and \`stage_id\` ascending to break ties, over \`spark_tasks\`.`,
      starterCode: `-- Stages with tasks that ran out of execution memory.
SELECT stage_id
FROM spark_tasks
GROUP BY stage_id;`,
      hints: [
        "`WHERE spill_mb > 0` before grouping keeps only spilling tasks, which also drops stages that had none.",
        "`ORDER BY spilling_tasks DESC, stage_id`.",
      ],
      referenceSolution: `SELECT stage_id, COUNT(*) AS spilling_tasks
FROM spark_tasks
WHERE spill_mb > 0
GROUP BY stage_id
ORDER BY spilling_tasks DESC, stage_id;`,
      singleFile: {
        seedSql: SKEW_TASKS_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["stage_id", "spilling_tasks"],
          rows: [
            [24, 2],
            [21, 1],
            [23, 1],
            [25, 1],
          ],
        },
      },
    },
    {
      id: "de-l10-diagnosing-skew-drill-2",
      executionMode: "single-file",
      prompt: `**Medium.** Write a query that returns the hot-key partitions, the ones holding more than 30 percent of their stage's rows, as \`(stage_id, partition_id, rows, pct_of_stage_rows)\`, biggest share first, over \`shuffle_partition_stats(stage_id, partition_id, rows, size_mb)\`. Round the share to 2 decimals.`,
      starterCode: `-- Partitions holding a disproportionate share of their stage's rows.
SELECT stage_id, partition_id, rows
FROM shuffle_partition_stats
;`,
      hints: [
        "`SUM(rows) OVER (PARTITION BY stage_id)` is the stage total beside each partition.",
        "A window function cannot appear in `WHERE`, so compute the share in a CTE and filter the CTE.",
      ],
      referenceSolution: `WITH shares AS (
  SELECT stage_id,
         partition_id,
         rows,
         100.0 * rows / SUM(rows) OVER (PARTITION BY stage_id) AS pct_of_stage_rows
  FROM shuffle_partition_stats
)
SELECT stage_id, partition_id, rows, ROUND(pct_of_stage_rows, 2) AS pct_of_stage_rows
FROM shares
WHERE pct_of_stage_rows > 30
ORDER BY pct_of_stage_rows DESC;`,
      singleFile: {
        seedSql: SHUFFLE_PARTITION_STATS_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["stage_id", "partition_id", "rows", "pct_of_stage_rows"],
          rows: [
            [21, 6, 24000000, 54.67],
            [23, 8, 6400000, 54.24],
            [25, 6, 15000000, 49.38],
            [24, 10, 17500000, 33.7],
          ],
        },
      },
    },
    {
      id: "de-l10-diagnosing-skew-drill-3",
      executionMode: "single-file",
      prompt: `**Hard.** Write a query that returns each stage's 75th-percentile task duration, as \`(stage_id, p75_ms)\`, in \`stage_id\` order, over \`spark_tasks\`.

Use the nearest-rank definition: order the stage's tasks by duration and take the row at position \`(3 * n + 3) / 4\` under integer division, where \`n\` is the stage's task count. That is the same ROW_NUMBER shape as the median, with a different rank.`,
      starterCode: `-- The 75th-percentile task duration per stage, by nearest rank.
WITH ranked AS (
  SELECT stage_id, duration_ms
  FROM spark_tasks
)
SELECT stage_id
FROM ranked
ORDER BY stage_id;`,
      hints: [
        "`ROW_NUMBER() OVER (PARTITION BY stage_id ORDER BY duration_ms) AS rn` and `COUNT(*) OVER (PARTITION BY stage_id) AS n`.",
        "Then `WHERE rn = (3 * n + 3) / 4`, aliasing `duration_ms` as `p75_ms`.",
      ],
      referenceSolution: `WITH ranked AS (
  SELECT stage_id,
         duration_ms,
         ROW_NUMBER() OVER (PARTITION BY stage_id ORDER BY duration_ms) AS rn,
         COUNT(*) OVER (PARTITION BY stage_id) AS n
  FROM spark_tasks
)
SELECT stage_id, duration_ms AS p75_ms
FROM ranked
WHERE rn = (3 * n + 3) / 4
ORDER BY stage_id;`,
      singleFile: {
        seedSql: SKEW_TASKS_SEED,
        orderMatters: true,
        assertColumnNames: true,
        expected: {
          columns: ["stage_id", "p75_ms"],
          rows: [
            [21, 520000],
            [22, 125000],
            [23, 12000],
            [24, 60000],
            [25, 30000],
          ],
        },
      },
    },
  ],
}

const cachingAndSlowJobCapstone: SqlLesson = {
  id: "de-l10-caching-and-slow-job-capstone",
  title: "Caching Decisions, and the Slow-Job Investigation",
  summary:
    "When caching a Spark DataFrame actually pays for itself, then a full slow-job investigation run on metrics you have never seen.",
  estimatedMinutes: 30,
  difficulty: "hard",
  skills: [
    "cache vs persist",
    "recomputation detection",
    "the five-step metric walk",
    "multi-table joins",
    "window functions",
    "diagnosis synthesis",
  ],
  teach: {
    estimatedMinutes: 16,
    markdown: `## cache() and persist()

\`cache()\` asks Spark to keep a dataset's computed partitions around after the first action, so the next action reads them instead of recomputing the whole lineage. \`persist(storageLevel)\` is the same request with the storage level spelled out: memory only, memory and disk, serialized, replicated. \`cache()\` is exactly \`persist(MEMORY_AND_DISK)\` on a DataFrame, so the choice is really about how you want to pay when memory runs short.

## When caching pays, and when it costs

Caching pays when a dataset **feeds two or more actions**. One action, one pass, nothing to reuse, and the cache is pure overhead.

Caching hurts when the cached dataset is large enough that keeping it evicts everything else. Then the partitions get dropped anyway, you recompute them on the next access, and you also slowed down the work that lost its memory. "Cache everything" is not a strategy; it is a way to convert free memory into a slower job.

The tell in the metrics is specific and worth memorizing: **the same scan stage appears in more than one job**. Every repeat after the first is work you already did. That is the query the Apply exercise grades, and it is the evidence you would show someone before adding a \`cache()\` call.

## The metric walk

When someone hands you a slow job and no context, the order matters more than any single query. This is the walk:

\`\`\`csdiagram
{
  "type": "pipeline",
  "stages": [
    { "label": "Job duration", "note": "which job is actually slow" },
    { "label": "Dominant stage", "note": "which stage owns most of that job's time" },
    { "label": "Task distribution", "note": "max over median inside that stage" },
    { "label": "Shuffle volume", "note": "how much data that stage moved" },
    { "label": "Config", "note": "partitions, cores, AQE on or off" }
  ],
  "highlight": ["Dominant stage"],
  "caption": "Always narrow before you measure. Finding the dominant stage first means every later number is about the part that matters."
}
\`\`\`

Skipping to step three is the most common way to waste an interview: you compute a beautiful skew ratio for a stage that accounts for four percent of the runtime.

## The question this lesson is built from

Amazon asks a version of this in its junior data-engineering loop, and the phrasing is close to: *your EMR job takes 4 hours, the Spark UI shows one task that ran for 40 minutes against a 2-minute median, diagnose it and tell me what you would change.*

The snapshot you are about to query is not that job. It is a smaller capture with the same shape, and the shape is the part that transfers: one stage owning most of the run, one 40-minute straggler inside it against a median task far below it, a scan that repeats across jobs, and a config that explains why nobody split anything. Three jobs, eleven stages, a sampled Tasks-tab export covering the three longest stages, and the cluster config. Read your own numbers off the snapshot rather than reusing the ones in the question. Before you read any further, do this: run the Apply query, then the Practice query, and write down your own diagnosis in three or four sentences. What is wrong, what is the evidence, what would you change first.

## Model answer: read this only after you have written your own

A strong candidate answers in this order.

**Where the time went.** Stage 4, \`join_orders_customers\`, is 2,700 seconds out of 4,172 seconds of total stage time, so roughly two thirds of the whole run sits in one stage. Everything else is noise until that stage is explained.

**What is wrong with it.** The task distribution inside stage 4, across the tasks the export sampled, is 2,400,000 ms max against a 400,000 ms median, a 6x ratio. That is skew, not size: if the stage were merely big, every task would be slow. One task also spilled 6 GB to disk while no other task spilled at all, which corroborates that it was holding more data than its share of memory, not just running on an unlucky machine.

**What I would change, in order.** First, turn AQE on. \`spark.sql.adaptive.enabled\` is \`false\` in this snapshot, so nothing was ever going to split anything at runtime, and that is a one-line change. I would say what it depends on rather than promising it: AQE splits when a partition is more than 5 times the median partition SIZE and larger than 256 MB, and this capture carries stage and task metrics but no per-partition sizes, so I would read those two numbers off the shuffle-partition view before calling it the whole fix. Second, if the customer side is small enough, broadcast it: under 10 MB the planner does it unasked, up to about 100 MB a hint will do it, and that removes the shuffle so the hot key stops mattering. Third, if neither applies, salt the hot key on the orders side and replicate the customer side across the salt values.

**Two more findings the snapshot holds.** \`scan_orders_parquet\` runs in all three jobs, at 180, 195, and 186 seconds, so about 381 seconds is spent recomputing a scan that never changed. That dataset feeds three actions, which is exactly the caching criterion. \`scan_returns_parquet\` also runs twice, but both runs sit inside job 2, so that is one action reading the same table on two branches of its plan rather than a dataset being recomputed for a second action; caching it buys much less, which is why the recomputation query counts distinct jobs and not stage rows. And \`spark.sql.shuffle.partitions\` is 200 on a cluster of 16 executors at 4 cores each, which is 64 cores; the 2-to-4-per-core heuristic wants 128 to 256, so 200 is actually reasonable here, and saying so is better than reciting "200 is always wrong". The real config problem is AQE being off.

Now compare that against what you wrote and mark your own gaps. The gaps are the study list.

**Common mistake:** caching a dataset that is read once. Read the metrics first, and only reach for \`cache()\` when the same stage genuinely appears in more than one job.

**Interview nuance:** the answer above is roughly 200 words and follows the walk in order. Candidates who lead with the fix ("I would salt it") before the measurement lose the point even when the fix is right, because the interviewer is testing whether you can find a problem you have not seen before, not whether you know the word "salting".

> **On a real platform this differs.** You would be reading this from the Spark History Server, from Glue job metrics in CloudWatch, or from Databricks' query profile, and the numbers arrive as charts rather than tables. The walk is identical: job, then dominant stage, then distribution, then volume, then config. Warehouses give you the same walk under different names, a query profile with per-operator time, bytes spilled, and partitions pruned.`,
    demoSeedSql: CAPSTONE_SNAPSHOT_SEED,
    demoCode: `-- The same scan stage, once per job. Three runs of identical work, and only the
-- first one was necessary.
SELECT j.job_id, j.action, s.stage_id, s.name, s.duration_s
FROM spark_stages s
JOIN spark_jobs j ON j.job_id = s.job_id
WHERE s.name = 'scan_orders_parquet'
ORDER BY j.job_id;`,
    showDemoInput: false,
  },
  apply: {
    id: "de-l10-caching-and-slow-job-capstone-apply",
    executionMode: "single-file",
    prompt: `Write a query that returns every stage name that ran in more than one job, with how many times it ran and the seconds wasted beyond its fastest run, as \`(name, times_run, wasted_s)\`, most wasted first, over \`spark_stages(stage_id, job_id, name, num_tasks, shuffle_read_mb, shuffle_write_mb, duration_s)\`.

A stage name counts only if it appears in more than one distinct \`job_id\`. \`times_run\` is how many stage rows carry that name. \`wasted_s\` is the name's total \`duration_s\` minus its single fastest run, which is the time caching would have saved.`,
    starterCode: `-- Stage names that ran more than once, and the time the repeats cost.
SELECT name
FROM spark_stages
GROUP BY name;`,
    hints: [
      "`HAVING COUNT(DISTINCT job_id) > 1` keeps only names that crossed a job boundary.",
      "`COUNT(*) AS times_run` counts the runs; `SUM(duration_s) - MIN(duration_s) AS wasted_s` is everything past the fastest one.",
      "`ORDER BY wasted_s DESC`.",
    ],
    referenceSolution: `SELECT name,
       COUNT(*) AS times_run,
       SUM(duration_s) - MIN(duration_s) AS wasted_s
FROM spark_stages
GROUP BY name
HAVING COUNT(DISTINCT job_id) > 1
ORDER BY wasted_s DESC;`,
    singleFile: {
      seedSql: CAPSTONE_SNAPSHOT_SEED,
      orderMatters: true,
      assertColumnNames: true,
      expected: {
        columns: ["name", "times_run", "wasted_s"],
        rows: [
          ["scan_orders_parquet", 3, 381],
          ["filter_active_users", 2, 52],
        ],
      },
    },
  },
  practice: {
    id: "de-l10-caching-and-slow-job-capstone-practice",
    executionMode: "single-file",
    prompt: `Write a query that returns the snapshot's dominant stage with what it costs its own job, as \`(stage_id, name, share_of_job_pct, p75_ms)\`, over the snapshot's \`spark_stages\` and \`spark_tasks\` tables.

The dominant stage is the one with the largest \`duration_s\`. \`share_of_job_pct\` is that stage's \`duration_s\` as a percent of the summed \`duration_s\` of every stage carrying the same \`job_id\`, rounded to 2 decimals, which is the number that says whether fixing this stage fixes the job it sits in. \`p75_ms\` is the same stage's 75th-percentile task duration by nearest rank: order its sampled tasks by duration and take the row at position \`(3 * n + 3) / 4\` under integer division. One row out.`,
    starterCode: `-- The dominant stage, what it costs its own job, and where its slow tail starts.
SELECT stage_id, job_id, name, duration_s
FROM spark_stages
;`,
    hints: [],
    singleFile: {
      seedSql: CAPSTONE_SNAPSHOT_SEED,
      assertColumnNames: true,
      expected: {
        columns: ["stage_id", "name", "share_of_job_pct", "p75_ms"],
        rows: [[4, "join_orders_customers", 84.53, 520000]],
      },
    },
  },
}

export const level10Module2: SqlModule = {
  id: "de-l10-shuffle-skew-tuning",
  title: "Module 10.2: Shuffle, Skew & Tuning",
  description:
    "From knowing the shuffle exists to tuning it: the broadcast band at 10 MB and 100 MB and the driver-memory bet behind it, shuffle-partition arithmetic against the 2-to-4-per-core heuristic, skew measured as max over median with AQE's real cutoffs, and the full Amazon slow-job investigation on a snapshot you have never seen.",
  lessons: [
    narrowWideAndBroadcast,
    shufflePartitionCount,
    diagnosingSkew,
    cachingAndSlowJobCapstone,
  ],
}

/**
 * Data Engineering Level 8 — Batch Pipelines & Orchestration.
 *
 * The first level of the Pipelines and Reliability section, and the one that turns "I can write the
 * transform" into "I can run it every day without corrupting the table". Module 8.1 is the
 * orchestrator: DAG shape, task states, sensors, retries, SLAs, and reading an incident out of a run
 * log. Module 8.2 is idempotency, the property everything else rests on, taught as the three real
 * implementations (partition replacement, keyed merge, append plus dedup at read) and graded by
 * running the learner's own script twice. Module 8.3 is incremental loading, what a watermark
 * silently drops, and manifest-driven backfills. Module 8.4 is the dbt-shaped workflow: models in
 * dependency order, data tests as assertion queries, lineage, and the dev/prod split.
 *
 * Deliberately NOT re-teaching what the SQL levels already ship: `sql-l4-idempotent-merge` covers
 * upsert mechanics and the late-row drop, and `sql-l5-incremental-watermark-backfill` covers the
 * watermark control table and partition-overwrite backfills. Level 8 cites both and spends its
 * exercises on what they leave out, which is auditing the losses and composing the daily pipeline.
 *
 * Split one file per module (four authors in parallel), each owning its own seed constants. Every
 * expected set was generated through the shipped sql.js WASM, and every workspace reference was
 * executed against its own hidden assertions including the idempotency double-run. Design in
 * docs/data-engineering-curriculum/CURRICULUM-MAP.md.
 */
import type { SqlLevel } from "@/lib/tutorials/types"
import { level8Module1 } from "./module1"
import { level8Module2 } from "./module2"
import { level8Module3 } from "./module3"
import { level8Module4 } from "./module4"

export const sqlLevel8: SqlLevel = {
  id: 8,
  slug: "batch-pipelines",
  title: "Level 8: Batch Pipelines & Orchestration",
  tagline:
    "Run a transform every day without corrupting the table: orchestration and task states, the three idempotent load patterns graded by a double run, incremental loads and backfills, and the dbt-shaped workflow.",
  defaultExecutionMode: "single-file",
  estimatedHours: 6,
  modules: [level8Module1, level8Module2, level8Module3, level8Module4],
}

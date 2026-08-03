/**
 * Data Engineering Level 10 — Distributed Compute & Data Operations.
 *
 * The Compute and Operations section, and the level where the job stops being a query and starts
 * being a system somebody is on call for. Module 10.1 is Spark's execution model read off a
 * simulated Spark UI: the driver/executor split and the OOM fork it explains, lazy evaluation and
 * why one action is one job, and the job to stage to task decomposition. Module 10.2 tunes it:
 * the broadcast band and the driver-memory bet, shuffle partition arithmetic, percentile-based
 * skew diagnosis, caching judgment, and the Amazon slow-job walk as a capstone. Module 10.3 is
 * data operations: the check-results ledger with warn-versus-error severity, the five
 * observability pillars as always-on monitors, schema-drift detection, and lineage-driven
 * incident triage. Module 10.4 closes on what a platform gets audited for, cost and access:
 * FinOps attribution, the quantified Parquet lever, IAM least privilege by evidence, and the
 * PII masking audit.
 *
 * Cluster-free by design. Databricks' own Spark UI Simulator proves the pedagogy: juniors are
 * tested on conceptual literacy and metric-based diagnosis, never live cluster coding, so every
 * Spark artifact here is a sql.js table shaped like the UI tab it stands for, with the hard
 * numbers interviewers quote (10 MB auto-broadcast, the ~100 MB manual ceiling, 200 shuffle
 * partitions, 2-4 per core, max-over-median, AQE's 5x rule) baked into grading rather than
 * merely stated in prose.
 *
 * Every single-file expected set was generated through the shipped sql.js WASM, and every
 * workspace reference was executed against its own hidden assertions including the idempotency
 * double-run. Design in docs/data-engineering-curriculum/CURRICULUM-MAP.md.
 */
import type { SqlLevel } from "@/lib/tutorials/types"
import { level10Module1 } from "./module1"
import { level10Module2 } from "./module2"
import { level10Module3 } from "./module3"
import { level10Module4 } from "./module4"

export const sqlLevel10: SqlLevel = {
  id: 10,
  slug: "spark-and-operations",
  title: "Level 10: Distributed Compute & Data Operations",
  tagline:
    "Read a distributed engine the way an interviewer expects you to: diagnose slow jobs from Spark metrics, run production quality and observability monitors, and audit cost and governance with SQL.",
  defaultExecutionMode: "single-file",
  estimatedHours: 6.5,
  modules: [level10Module1, level10Module2, level10Module3, level10Module4],
}

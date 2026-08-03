/**
 * Data Engineering Level 9 — Streaming & Change Data Capture.
 *
 * The second half of the Pipelines and Reliability section, and the level where the daily batch
 * assumption is dropped. Module 9.1 is the log itself: topics, partitions, offsets, consumer groups
 * and lag, what the delivery-semantics words mean when you read them off a commit log, and Kinesis
 * shard arithmetic. Module 9.2 is change data capture: Debezium-shaped change events, the ordering
 * Kafka does and does not guarantee, and applying a changelog with a resumable checkpoint. Module
 * 9.3 computes stream windows in plain SQL (tumbling, hopping, watermarks and lateness, and
 * sessionization by gaps and islands, which is also a top interview SQL pattern). Module 9.4 is the
 * decision a junior gets asked to defend, batch or streaming, plus measuring freshness as data age
 * rather than as "did the job finish".
 *
 * The seeds here are engineered around boundaries, because the boundary IS the lesson: an event
 * exactly on a window edge, a row at exactly the lateness threshold, a gap of exactly the session
 * timeout. An off-by-one predicate has to fail, or the exercise teaches nothing.
 *
 * Every expected set was generated through the shipped sql.js WASM; workspace references were
 * executed against their own hidden assertions including the idempotency double-run. Design in
 * docs/data-engineering-curriculum/CURRICULUM-MAP.md.
 */
import type { SqlLevel } from "@/lib/tutorials/types"
import { level9Module1 } from "./module1"
import { level9Module2 } from "./module2"
import { level9Module3 } from "./module3"
import { level9Module4 } from "./module4"

export const sqlLevel9: SqlLevel = {
  id: 9,
  slug: "streaming-cdc",
  title: "Level 9: Streaming & Change Data Capture",
  tagline:
    "Drop the daily-batch assumption: the log and its offsets, change data capture and ordering, stream windows and watermarks computed in SQL, and how to choose batch or streaming and prove your freshness.",
  defaultExecutionMode: "single-file",
  estimatedHours: 5,
  modules: [level9Module1, level9Module2, level9Module3, level9Module4],
}

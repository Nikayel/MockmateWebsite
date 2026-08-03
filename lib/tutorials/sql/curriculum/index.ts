/**
 * The Data Engineering course's curriculum tree. (The directory keeps its `sql/` name because the
 * course grew out of the SQL track and every L1-L6 lesson id is frozen at the `sql-` prefix, which
 * keys stored progress. Levels authored after the rename use `de-`.)
 *
 * SQL section: L1 Foundations, L2 Aggregation & Joins (single-file grading), L3 Data Modeling and
 * L4 Data Engineering (workspace/assertion grading), L5 Advanced & Company-Specific SQL for DE
 * Interviews (see docs/sql-curriculum/expand-sql-de.md).
 * Cloud & Data Platforms section: L6 Cloud & Data Engineering Foundations (see
 * docs/sql-curriculum/cloud/PLAN.md), L7 Warehouses, Lakehouse & Dimensional Modeling.
 * Pipelines & Reliability section: L8 Batch Pipelines & Orchestration, L9 Streaming & Change Data
 * Capture.
 *
 * Levels 7 and up are authored per module under `level{N}/` and designed in
 * docs/data-engineering-curriculum/CURRICULUM-MAP.md. Which section a level renders under is
 * decided in `lib/tutorials/sql/sections.ts`, not here.
 */
import type { SqlLevel } from "@/lib/tutorials/types"
import { sqlLevel1 } from "./level1"
import { sqlLevel2 } from "./level2"
import { sqlLevel3 } from "./level3"
import { sqlLevel4 } from "./level4"
import { sqlLevel5 } from "./level5"
import { sqlLevel6 } from "./level6"
import { sqlLevel7 } from "./level7"
import { sqlLevel8 } from "./level8"
import { sqlLevel9 } from "./level9"

export const SQL_LEVELS: SqlLevel[] = [
  sqlLevel1,
  sqlLevel2,
  sqlLevel3,
  sqlLevel4,
  sqlLevel5,
  sqlLevel6,
  sqlLevel7,
  sqlLevel8,
  sqlLevel9,
]

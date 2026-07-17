/**
 * SQL curriculum tree — six levels: L1 Foundations, L2 Aggregation & Joins (single-file grading),
 * L3 Data Modeling and L4 Data Engineering (workspace/assertion grading), L5 Advanced &
 * Company-Specific SQL for DE Interviews (see docs/sql-curriculum/expand-sql-de.md), and L6 Cloud &
 * Data Engineering Foundations (see docs/sql-curriculum/cloud/PLAN.md).
 */
import type { SqlLevel } from "@/lib/tutorials/types"
import { sqlLevel1 } from "./level1"
import { sqlLevel2 } from "./level2"
import { sqlLevel3 } from "./level3"
import { sqlLevel4 } from "./level4"
import { sqlLevel5 } from "./level5"
import { sqlLevel6 } from "./level6"

export const SQL_LEVELS: SqlLevel[] = [
  sqlLevel1,
  sqlLevel2,
  sqlLevel3,
  sqlLevel4,
  sqlLevel5,
  sqlLevel6,
]

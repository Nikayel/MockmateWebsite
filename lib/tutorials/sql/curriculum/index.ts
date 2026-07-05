/**
 * SQL curriculum tree — five levels: L1 Foundations, L2 Aggregation & Joins (single-file grading),
 * L3 Data Modeling and L4 Data Engineering (workspace/assertion grading), and L5 Advanced &
 * Company-Specific SQL for DE Interviews (see docs/sql-curriculum/expand-sql-de.md).
 */
import type { SqlLevel } from "@/lib/tutorials/types"
import { sqlLevel1 } from "./level1"
import { sqlLevel2 } from "./level2"
import { sqlLevel3 } from "./level3"
import { sqlLevel4 } from "./level4"
import { sqlLevel5 } from "./level5"

export const SQL_LEVELS: SqlLevel[] = [sqlLevel1, sqlLevel2, sqlLevel3, sqlLevel4, sqlLevel5]

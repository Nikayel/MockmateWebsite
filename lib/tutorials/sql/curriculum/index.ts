/**
 * SQL curriculum tree — all four levels fully authored from `docs/sql-curriculum/CONTENT.md`:
 * L1 Foundations, L2 Aggregation & Joins (single-file grading), L3 Data Modeling and L4 Data
 * Engineering (workspace/assertion grading). See `docs/sql-curriculum/AGENT-2-curriculum-developer.md`.
 */
import type { SqlLevel } from "@/lib/tutorials/types"
import { sqlLevel1 } from "./level1"
import { sqlLevel2 } from "./level2"
import { sqlLevel3 } from "./level3"
import { sqlLevel4 } from "./level4"

export const SQL_LEVELS: SqlLevel[] = [sqlLevel1, sqlLevel2, sqlLevel3, sqlLevel4]

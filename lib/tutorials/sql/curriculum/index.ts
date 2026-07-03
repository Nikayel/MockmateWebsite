/**
 * SQL curriculum tree. L1 (Foundations) and L2 (Aggregation & Joins) are fully authored; L3 ships
 * AGENT-1's DDL proof lesson and L4 is an authored-but-empty shell. AGENT-2 fills the rest from
 * `docs/sql-curriculum/CONTENT.md` (see `docs/sql-curriculum/AGENT-2-curriculum-developer.md`).
 */
import type { SqlLevel } from "@/lib/tutorials/types"
import { sqlLevel1 } from "./level1"
import { sqlLevel2 } from "./level2"
import { sqlLevel3 } from "./level3"

const sqlLevel4: SqlLevel = {
  id: 4,
  slug: "engineering",
  title: "Level 4 — Data Engineering with SQL",
  tagline:
    "Window functions, recursive CTEs, SCD, idempotent merge, data-quality — warehouse transforms.",
  defaultExecutionMode: "workspace",
  estimatedHours: 7,
  modules: [],
}

export const SQL_LEVELS: SqlLevel[] = [sqlLevel1, sqlLevel2, sqlLevel3, sqlLevel4]

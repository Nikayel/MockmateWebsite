/**
 * SQL curriculum tree. AGENT-1 ships L1 + L3 each with ONE proof lesson (the single-file result-set
 * and workspace/marker pipelines); L2 and L4 are authored-but-empty shells. AGENT-2 fills every level
 * from `docs/sql-curriculum/CONTENT.md` (see `docs/sql-curriculum/AGENT-2-curriculum-developer.md`).
 */
import type { SqlLevel } from "@/lib/tutorials/types"
import { sqlLevel1 } from "./level1"
import { sqlLevel3 } from "./level3"

const sqlLevel2: SqlLevel = {
  id: 2,
  slug: "aggregation",
  title: "Level 2 — Aggregation & Joins: Combining Source Data",
  tagline: "Aggregates, GROUP BY/HAVING, every join flavor, subqueries, CTEs — building metrics.",
  defaultExecutionMode: "single-file",
  estimatedHours: 5,
  modules: [],
}

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

/**
 * `lab validate` — shared finding shape.
 *
 * Every rule in `lib/sprint-labs/validate/rules/*` is a pure function
 * `(workbook: AuthoredWorkbook) => ValidationFinding[]` (PLAN.md Task 3):
 * tree-snapshot in, findings out, no filesystem access of its own. Findings
 * are plain data (not thrown errors) so `lib/sprint-labs/validate/index.ts`
 * can run every rule against a workbook and collect a complete report
 * instead of stopping at the first problem.
 */

import type { AuthoredWorkbook } from "./tree"

export type FindingSeverity = "error" | "warn"

export interface ValidationFinding {
  /** Stable, kebab-case rule identifier, e.g. "ai-policy-reason-required". */
  ruleId: string
  severity: FindingSeverity
  /** The ticket this finding is about, when it's ticket-scoped. */
  ticketKey?: string
  /** A file or field path relevant to the finding, for locating it fast. */
  path?: string
  message: string
}

export type ValidationRule = (workbook: AuthoredWorkbook) => ValidationFinding[]

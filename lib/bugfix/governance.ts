import type { BugFixScenario } from "@/lib/scenarios/types"
import { validateBugfixScenarioQuality } from "@/lib/scenarios/bugfix-quality"

export interface BugfixScenarioAuditRow {
  scenarioId: string
  title: string
  complete: boolean
  issueCount: number
  issues: string[]
  tags: string[]
}

export function buildBugfixScenarioAuditRows(
  scenarios: BugFixScenario[]
): BugfixScenarioAuditRow[] {
  return scenarios.map((scenario) => {
    const issues = validateBugfixScenarioQuality(scenario).map(
      (issue) => `${issue.field}: ${issue.message}`
    )

    return {
      scenarioId: scenario.id,
      title: scenario.title,
      complete: issues.length === 0,
      issueCount: issues.length,
      issues,
      tags: scenario.tags,
    }
  })
}

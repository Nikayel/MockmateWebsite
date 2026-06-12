import { buildBugfixScenarioAuditRows } from "@/lib/bugfix"
import { realWorldBugFixScenarios } from "@/lib/scenarios-realworld"

const rows = buildBugfixScenarioAuditRows(realWorldBugFixScenarios)
const failedRows = rows.filter((row) => !row.complete)

for (const row of rows) {
  const status = row.complete ? "PASS" : "FAIL"
  console.log(`${status} ${row.scenarioId} - ${row.title}`)
  for (const issue of row.issues) {
    console.log(`  - ${issue}`)
  }
}

if (failedRows.length > 0) {
  console.error(`Bugfix scenario audit failed for ${failedRows.length} scenario(s).`)
  process.exit(1)
}

console.log(`Bugfix scenario audit passed for ${rows.length} scenario(s).`)

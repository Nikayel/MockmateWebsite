import { buildBugfixScenarioAuditRows } from "@/lib/bugfix"
import { realWorldBugFixScenarios } from "@/lib/scenarios-realworld"
import { hydrateSealedLegacyBugfix } from "@/lib/scenarios/sealed/legacy-registry.server"

async function main() {
  const scenarios = await Promise.all(realWorldBugFixScenarios.map(hydrateSealedLegacyBugfix))
  const rows = buildBugfixScenarioAuditRows(scenarios)
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
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

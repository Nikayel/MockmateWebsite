import type { BugFixScenario } from "./types"
import { getBugfixCompanies, type BugfixCompanyAlignment } from "./company-alignment"

export type BugfixScenarioDefinition = Omit<BugFixScenario, "companies" | "companyAlignment"> & {
  companyAlignment?: BugfixCompanyAlignment
  /** Company filters must agree with the reviewed alignment profile. */
  companies?: never
}

/** One authoring boundary for assert workspaces and compiled packs. */
export function defineBugfixScenario(definition: BugfixScenarioDefinition): BugFixScenario {
  const companyAlignment = definition.companyAlignment ?? "generic"
  return {
    ...definition,
    companyAlignment,
    companies: getBugfixCompanies(companyAlignment),
  }
}

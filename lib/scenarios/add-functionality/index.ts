/**
 * Add Functionality Scenarios
 *
 * These scenarios simulate real Meta/Google AI-assisted interviews
 * where candidates must add new features to an existing codebase.
 */

import type { AddFunctionalityScenario } from "../types"
import { digestSchedulerScenario } from "./add-feature-digest-scheduler"
import { supportTicketSearchScenario } from "./add-feature-support-ticket-search"
import { dispatch911Scenario } from "./add-feature-911-dispatch"
import { ontologyOrgScenario } from "./add-feature-ontology-org"

export type { AddFunctionalityScenario } from "../types"

export const addFunctionalityScenarios: AddFunctionalityScenario[] = [
  supportTicketSearchScenario,
  digestSchedulerScenario,
  dispatch911Scenario,
  ontologyOrgScenario,
]

export default addFunctionalityScenarios

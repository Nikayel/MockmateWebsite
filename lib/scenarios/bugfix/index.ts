/**
 * Bug Fix Interview Scenarios
 * Type: bugfix
 *
 * These scenarios test debugging and bug fixing skills
 * with real-world code examples.
 */

import type { BugFixScenario } from "../types"
import { arrayNullBugsScenarios } from "./array-null-bugs"
import { asyncClosureBugsScenarios } from "./async-closure-bugs"
import { memoryTypeBugsScenarios } from "./memory-type-bugs"
import { concurrencyCopyBugsScenarios } from "./concurrency-copy-bugs"
import { numericLoopBugsScenarios } from "./numeric-loop-bugs"
import { statePromiseBugsScenarios } from "./state-promise-bugs"
import { reactCommerceBugsScenarios } from "./react-commerce-bugs"
import { serviceHookBugsScenarios } from "./service-hook-bugs"
import { securityQueryBugsScenarios } from "./security-query-bugs"
import { mlDataBugsScenarios } from "./ml-data-bugs"
import { inferenceFeatureBugsScenarios } from "./inference-feature-bugs"
import { batchApiBugsScenarios } from "./batch-api-bugs"

export const bugFixScenarios: BugFixScenario[] = [
  ...arrayNullBugsScenarios,
  ...asyncClosureBugsScenarios,
  ...memoryTypeBugsScenarios,
  ...concurrencyCopyBugsScenarios,
  ...numericLoopBugsScenarios,
  ...statePromiseBugsScenarios,
  ...reactCommerceBugsScenarios,
  ...serviceHookBugsScenarios,
  ...securityQueryBugsScenarios,
  ...mlDataBugsScenarios,
  ...inferenceFeatureBugsScenarios,
  ...batchApiBugsScenarios,
]

export default bugFixScenarios

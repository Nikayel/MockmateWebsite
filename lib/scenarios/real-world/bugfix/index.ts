/**
 * Real-World Bug Fix Scenarios
 *
 * Split by scenario so real-world interview cases are easy to review.
 */

import type { BugFixScenario } from "../../types"
import { bugfixPythonTwoSumScenario } from "./bugfix-python-two-sum"
import { bugfixRateLimiterScenario } from "./bugfix-rate-limiter"

// Keep this list to scenarios that are executable through the current
// /api/execute contract: one editable entry file plus testCases.input that
// maps directly to a callable function in that file.
export const realWorldBugFixScenarios: BugFixScenario[] = [
  bugfixPythonTwoSumScenario,
  bugfixRateLimiterScenario,
]

export default realWorldBugFixScenarios

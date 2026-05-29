/**
 * Real-World Bug Fix Scenarios
 *
 * Split by scenario so real-world interview cases are easy to review.
 */

import type { BugFixScenario } from "../../types"
import { bugfixClosureLoopScenario } from "./bugfix-closure-loop"
import { bugfixDeepcopyScenario } from "./bugfix-deepcopy"
import { bugfixFeatureEngineeringNanScenario } from "./bugfix-feature-engineering-nan"
import { bugfixFloatingPointScenario } from "./bugfix-floating-point"
import { bugfixInfiniteLoopScenario } from "./bugfix-infinite-loop"
import { bugfixNullCheckScenario } from "./bugfix-null-check"
import { bugfixOffByOneArrayScenario } from "./bugfix-off-by-one-array"
import { bugfixPythonTwoSumScenario } from "./bugfix-python-two-sum"
import { bugfixRateLimiterScenario } from "./bugfix-rate-limiter"
import { bugfixTypeCoercionScenario } from "./bugfix-type-coercion"

// Keep this list to scenarios that are executable through the current
// /api/execute contract: one editable entry file plus testCases.input that
// maps directly to a callable function in that file.
export const realWorldBugFixScenarios: BugFixScenario[] = [
  bugfixPythonTwoSumScenario,
  bugfixRateLimiterScenario,
  bugfixTypeCoercionScenario,
  bugfixOffByOneArrayScenario,
  bugfixFloatingPointScenario,
  bugfixNullCheckScenario,
  bugfixInfiniteLoopScenario,
  bugfixClosureLoopScenario,
  bugfixDeepcopyScenario,
  bugfixFeatureEngineeringNanScenario,
]

export default realWorldBugFixScenarios

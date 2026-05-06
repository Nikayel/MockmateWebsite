/**
 * Real-World Bug Fix Scenarios
 *
 * Split by scenario so real-world interview cases are easy to review.
 */

import type { BugFixScenario } from "../../types"
import { bugfixPaymentProcessorScenario } from "./bugfix-payment-processor"
import { bugfixRateLimiterScenario } from "./bugfix-rate-limiter"
import { bugfixUserSessionScenario } from "./bugfix-user-session"

export const realWorldBugFixScenarios: BugFixScenario[] = [
  bugfixPaymentProcessorScenario,
  bugfixRateLimiterScenario,
  bugfixUserSessionScenario,
]

export default realWorldBugFixScenarios

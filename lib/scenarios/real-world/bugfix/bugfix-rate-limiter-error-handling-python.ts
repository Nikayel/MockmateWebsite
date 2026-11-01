import { createRateLimiterErrorHandlingScenario } from "./rate-limiter-error-handling/scenario"
import { starter, windowStore } from "./rate-limiter-error-handling/python-source"
import { visibleTests, hiddenTests } from "./rate-limiter-error-handling/python-tests"
import { runner } from "./rate-limiter-error-handling/python-runner"

export const bugfixRateLimiterErrorHandlingPythonScenario = createRateLimiterErrorHandlingScenario({
  id: "bugfix-rate-limiter-error-handling-python",
  language: "python",
  starter,
  windowStore,
  visibleTests,
  hiddenTests,
  runner,
})

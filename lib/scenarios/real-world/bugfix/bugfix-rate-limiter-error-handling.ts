import { createJavaScriptTestRunner } from "../../workspace-test-runner"
import { createRateLimiterErrorHandlingScenario } from "./rate-limiter-error-handling/scenario"
import { starter, windowStore } from "./rate-limiter-error-handling/source"
import { visibleTests, hiddenTests } from "./rate-limiter-error-handling/tests"

export const bugfixRateLimiterErrorHandlingScenario = createRateLimiterErrorHandlingScenario({
  id: "bugfix-rate-limiter-error-handling",
  language: "javascript",
  starter,
  windowStore,
  visibleTests,
  hiddenTests,
  runner: createJavaScriptTestRunner([
    { name: "visible error handling", path: "./rate-limiter.test" },
    { name: "hidden error handling", path: "./rate-limiter.hidden.test" },
  ]),
})

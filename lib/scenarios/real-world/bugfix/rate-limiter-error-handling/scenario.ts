import { defineBugfixScenario } from "../../../define-bugfix-scenario"
import type { BugFixScenario } from "../../../types"

type RateLimiterVariant = {
  id: string
  language: "javascript" | "python"
  starter: string
  windowStore: string
  visibleTests: string
  hiddenTests: string
  runner: string
}

/** Shared incident and contract; executable source and tests stay idiomatic per language. */
export function createRateLimiterErrorHandlingScenario({
  id,
  language,
  starter,
  windowStore,
  visibleTests,
  hiddenTests,
  runner,
}: RateLimiterVariant): BugFixScenario {
  const isPython = language === "python"
  const primaryPath = isPython ? "src/rate_limiter.py" : "src/rate-limiter.js"
  const storePath = isPython ? "src/window_store.py" : "src/window-store.js"
  const visiblePath = isPython ? "tests/test_rate_limiter.py" : "tests/rate-limiter.test.js"
  const hiddenPath = isPython
    ? "tests/test_rate_limiter_hidden.py"
    : "tests/rate-limiter.hidden.test.js"
  const runnerPath = isPython ? "tests/run_workspace_tests.py" : "tests/run-workspace-tests.js"
  return defineBugfixScenario({
    id,
    variantGroup: "bugfix-rate-limiter-error-handling",
    conceptIds: ["exception-handling"],
    title: "Rate Limiter: Requests Slip Through During an Outage",
    type: "bugfix",
    executionMode: "workspace",
    difficulty: "medium",
    description:
      "The API gateway admits requests during a quota-store outage, while unexpected storage errors disappear from its caller.",
    task: "Investigate quota decisions during storage failures and restore the gateway's documented error contract.",
    symptom: {
      subject: "quota-store read timeout",
      tag: "one incoming request",
      expected: "request denied",
      actual: "request admitted",
      caveat: "Healthy storage still enforces the plan limit correctly.",
    },
    userReport:
      "API operations here. During yesterday's quota-store outage, the gateway kept accepting traffic even though it could not check usage. A separate malformed store response also vanished instead of reaching our error reporter. Normal traffic is still capped correctly when storage is healthy.",
    tags: ["backend", "exception-handling", "rate-limiting", "reliability", "real-codebase"],
    estimatedTime: 30,
    problemStatement: `The API gateway uses a shared quota store to reserve requests within a rolling window. During a storage incident, requests were admitted without a confirmed reservation. An unrelated invalid store response also never reached the caller's error reporter.

## Required behavior

- Return true only after a reservation succeeds; reaching the quota normally returns false.
- A StoreUnavailableError from cleanup, counting, or reservation must deny the current request by returning false. This gateway prioritizes enforcing the quota during an outage.
- ${isPython ? "Every other exception" : "Every other thrown value"} must propagate unchanged to the caller, which owns error reporting.
- Attempt each store operation at most once per request. A write timeout may occur after the reservation committed; the store has no idempotency key or rollback API.
- A subsequent request should work normally when storage recovers.
- Preserve per-client quotas, expiry, inclusive window boundaries, and both exported function signatures.

Read README.md and the visible tests, reproduce the incident with Run Tests, and change only ${primaryPath}.`,
    buggyCode: { [language]: starter },
    codebaseFiles: {
      [language]: [
        {
          fileName: storePath,
          content: windowStore,
          description: "Read-only quota store and its outage error type",
        },
      ],
    },
    expectedBehavior:
      "Confirmed reservations are admitted; storage outages deny the current request; unexpected failures propagate unchanged without retrying uncertain writes.",
    bugDescription: "",
    hints: [
      "Compare the healthy test with the outage test. What result reaches the caller after a store operation throws?",
      "Use the documented error contract to distinguish a dependency outage from an unexpected failure; trace each path separately.",
    ],
    testCases: [
      {
        input: { operation: "count", failure: "StoreUnavailableError" },
        expected: false,
        description: "Workspace tests cover quota decisions during storage failures",
      },
    ],
    expectedTouchedFiles: [primaryPath],
    observedSymptoms: [
      "A timed-out quota read admits the request.",
      "Unexpected store errors never reach the caller.",
      "Healthy single requests and bursts still respect the plan.",
    ],
    reproductionSteps: [
      "Read README.md for the quota store's failure contract.",
      "Run Tests and compare the healthy, outage, and unexpected-error cases.",
      "Trace the returned result or thrown value back through the decision path.",
    ],
    successCriteria: [
      "Known storage outages deny the request without retrying.",
      isPython
        ? "Unexpected exceptions reach the caller unchanged."
        : "Unexpected thrown values reach the caller unchanged.",
      "Uncertain reservations are neither retried nor rolled back.",
      "Healthy limits, client isolation, and recovery remain correct.",
      `Only ${primaryPath} changes.`,
    ],
    debuggingSkills: [
      "reproduction",
      "exception handling",
      "failure classification",
      "minimal patch",
      "regression testing",
    ],
    workspace: {
      language,
      primaryFilePath: primaryPath,
      editableFilePaths: [primaryPath],
      visibleTestPaths: [visiblePath],
      hiddenTestPaths: [hiddenPath],
      testRunnerPath: runnerPath,
      files: [
        {
          path: "README.md",
          role: "docs",
          language: "markdown",
          content: `# Gateway quota store

The in-memory WindowStore stands in for a remote quota store. Its exported StoreUnavailableError class identifies dependency outages. Other errors belong to the caller's error reporter. The visible tests inject failures by replacing individual store methods.

## Store contract

- ${isPython ? "remove_before" : "removeBefore"}(key, minimum) discards timestamps strictly older than minimum.
- count(key) returns reserved usage, including timestamps exactly at the window boundary.
- add(key, timestamp) reserves one request; equal timestamps represent separate requests.
- Any operation may throw StoreUnavailableError. An add failure may happen before or after the write committed, so its outcome is uncertain.
- No retry, rollback, background work, or new dependency is required. The caller makes one decision per incoming request.
- Calls in this exercise are synchronous and serialized; distributed atomicity and multi-process locking are outside its scope.
${isPython ? "\nPython raises exception objects, not arbitrary values. Process-control exceptions such as KeyboardInterrupt and SystemExit must keep propagating to the caller.\n" : ""}

Use Run Tests in the workspace. The complete incident and acceptance criteria are in task.md.`,
          description: "Quota store behavior and failure contract",
        },
        {
          path: storePath,
          role: "readonly",
          language,
          content: windowStore,
        },
        { path: primaryPath, role: "editable", language, content: starter },
        {
          path: visiblePath,
          role: "test",
          language,
          content: visibleTests,
        },
        {
          path: hiddenPath,
          role: "test",
          language,
          hidden: true,
          content: hiddenTests,
        },
        {
          path: runnerPath,
          role: "test",
          language,
          hidden: true,
          content: runner,
        },
      ],
    },
  })
}

import type { BugFixScenario } from "../../types"

export const bugfixClosureLoopScenario: BugFixScenario = {
  id: "bugfix-closure-loop",
  title: "Analytics Handler Closure Bug",
  type: "bugfix",
  difficulty: "medium",
  companies: ["Google", "Meta", "LinkedIn"],
  description: "Fix loop-scoped analytics handlers that all report the final event index",
  tags: ["closures", "scope", "analytics", "javascript", "debugging"],
  estimatedTime: 20,
  problemStatement: `An analytics SDK creates one click handler per onboarding step. The dashboard shows every click being attributed to the final step because each handler captures the same loop variable.

**Your task:**
1. Fix the handler factory so each handler keeps its own index
2. Make returned handler results assertable
3. Preserve the public runAnalyticsHandlers(eventNames) entry point
4. Avoid relying on console output for correctness`,
  buggyCode: {
    javascript: `// analytics-handlers.js
// BUG: var is function-scoped, so every handler shares the same i.
function runAnalyticsHandlers(eventNames) {
  const handlers = [];

  for (var i = 0; i < eventNames.length; i++) {
    handlers.push(function () {
      return { index: i, event: eventNames[i] };
    });
  }

  return handlers.map((handler) => handler());
}`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "sdk/onboarding-tracker.js",
        content: `class OnboardingTracker {
  track(result) {
    // The dashboard groups events by index and event name.
    return result.index + ":" + result.event;
  }
}`,
        description: "Analytics SDK context for handler results",
      },
      {
        fileName: "ui/onboarding-steps.js",
        content: `class OnboardingSteps {
  constructor(names) {
    this.names = names;
  }
}`,
        description: "UI context for dynamic onboarding step handlers",
      },
      {
        fileName: "tests/analytics-handlers.test.js",
        content: `// runAnalyticsHandlers(["profile", "company", "invite"])
//   -> [
//     { index: 0, event: "profile" },
//     { index: 1, event: "company" },
//     { index: 2, event: "invite" }
//   ]`,
        description: "Regression test for per-handler closure state",
      },
    ],
  },
  expectedBehavior:
    "Each generated handler should return the index and event name from the iteration that created it.",
  bugDescription:
    "All handlers capture the same function-scoped var i, which has the final loop value after the loop exits.",
  hints: [
    "Use block scope for each loop iteration.",
    "An IIFE or array map can also capture the current value.",
    "The function should return handler outputs, not just log them.",
  ],
  testCases: [
    {
      input: { eventNames: ["profile", "company", "invite"] },
      expected: [
        { index: 0, event: "profile" },
        { index: 1, event: "company" },
        { index: 2, event: "invite" },
      ],
      description: "Handlers should keep the event index from their creation iteration",
    },
  ],
}

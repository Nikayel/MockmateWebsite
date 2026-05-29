import type { BugFixScenario } from "../../types"

export const bugfixInfiniteLoopScenario: BugFixScenario = {
  id: "bugfix-infinite-loop",
  title: "Retry Scheduler Infinite Loop",
  type: "bugfix",
  difficulty: "easy",
  companies: ["Generic", "Netflix", "Amazon"],
  description: "Fix a retry scheduler loop that never reaches the terminal attempt",
  tags: ["loops", "jobs", "schedulers", "debugging"],
  estimatedTime: 15,
  problemStatement: `A background worker builds a retry schedule for failed webhook deliveries. After a refactor, jobs with retries enabled hang the worker instead of returning a finite schedule.

**Your task:**
1. Fix the loop update so the scheduler terminates
2. Return the exact attempt sequence that will be executed
3. Keep the terminal attempt at zero in the sequence
4. Do not replace the function signature`,
  buggyCode: {
    javascript: `// retry-scheduler.js
// BUG: remaining moves away from zero, so the loop never terminates.
function buildRetrySchedule(maxRetries) {
  const attempts = [];
  let remaining = maxRetries;

  while (remaining >= 0) {
    attempts.push(remaining);
    remaining++;
  }

  return attempts;
}`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "workers/webhook-delivery.js",
        content: `class WebhookDeliveryWorker {
  constructor(maxRetries) {
    this.maxRetries = maxRetries;
  }
}`,
        description: "Webhook worker context that consumes retry schedules",
      },
      {
        fileName: "observability/job-heartbeat.js",
        content: `class JobHeartbeat {
  markHung(jobId) {
    // The production symptom was a missing heartbeat after schedule generation.
    return { jobId, status: "hung" };
  }
}`,
        description: "Observability context for the infinite-loop production symptom",
      },
      {
        fileName: "tests/retry-scheduler.test.js",
        content: `// buildRetrySchedule(3) -> [3, 2, 1, 0]
// buildRetrySchedule(0) -> [0]
// buildRetrySchedule(1) -> [1, 0]`,
        description: "Regression tests for finite retry schedules",
      },
    ],
  },
  expectedBehavior:
    "The scheduler should return a finite descending sequence from maxRetries to zero.",
  bugDescription:
    "The loop increments remaining while the condition requires remaining to eventually become negative.",
  hints: [
    "Trace remaining after the first loop iteration.",
    "The schedule should count down, not up.",
    "A maxRetries value of zero is still one terminal attempt.",
  ],
  testCases: [
    {
      input: { maxRetries: 3 },
      expected: [3, 2, 1, 0],
      description: "Three retries should produce a finite descending schedule",
    },
    {
      input: { maxRetries: 1 },
      expected: [1, 0],
      description: "One retry should include the terminal attempt",
    },
  ],
}

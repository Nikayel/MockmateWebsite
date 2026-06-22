import type { BugFixScenario } from "../../types"

const starter = `function annotateWarmupWindows(readings) {
  const waitMinutes = Array(readings.length).fill(0);
  const pendingIndexes = [];

  for (let index = 0; index < readings.length; index += 1) {
    const currentTemperature = readings[index].temperatureCelsius;

    if (
      pendingIndexes.length > 0 &&
      currentTemperature > readings[pendingIndexes[pendingIndexes.length - 1]].temperatureCelsius
    ) {
      const previousIndex = pendingIndexes.pop();
      waitMinutes[previousIndex] = index - previousIndex;
    }

    pendingIndexes.push(index);
  }

  return readings.map((reading, index) => ({
    ...reading,
    minutesUntilWarmer: waitMinutes[index],
  }));
}

module.exports = { annotateWarmupWindows };
`

const reference = `function annotateWarmupWindows(readings) {
  const waitMinutes = Array(readings.length).fill(0);
  const pendingIndexes = [];

  for (let index = 0; index < readings.length; index += 1) {
    const currentTemperature = readings[index].temperatureCelsius;

    while (
      pendingIndexes.length > 0 &&
      currentTemperature > readings[pendingIndexes[pendingIndexes.length - 1]].temperatureCelsius
    ) {
      const previousIndex = pendingIndexes.pop();
      waitMinutes[previousIndex] = index - previousIndex;
    }

    pendingIndexes.push(index);
  }

  return readings.map((reading, index) => ({
    ...reading,
    minutesUntilWarmer: waitMinutes[index],
  }));
}

module.exports = { annotateWarmupWindows };
`

const summaryHelper = `function summarizeWarmupBreaches(annotatedReadings, thresholdMinutes) {
  return annotatedReadings
    .filter((reading) => reading.minutesUntilWarmer > thresholdMinutes)
    .map((reading) => ({
      sensorId: reading.sensorId,
      observedAt: reading.observedAt,
      minutesUntilWarmer: reading.minutesUntilWarmer,
    }));
}

module.exports = { summarizeWarmupBreaches };
`

const visibleTests = `const assert = require("node:assert/strict");
const { annotateWarmupWindows } = require("../src/temperature-alerts");
const { summarizeWarmupBreaches } = require("../src/alert-summary");

async function runTests(record) {
  await record("annotates every pending cooler reading when a warmer sample arrives", () => {
    const readings = [
      { sensorId: "rack-a", observedAt: "09:00", temperatureCelsius: 70 },
      { sensorId: "rack-a", observedAt: "09:01", temperatureCelsius: 69 },
      { sensorId: "rack-a", observedAt: "09:02", temperatureCelsius: 71 },
    ];

    assert.deepEqual(
      annotateWarmupWindows(readings).map((reading) => reading.minutesUntilWarmer),
      [2, 1, 0],
    );
  });

  await record("keeps unresolved readings at zero minutes", () => {
    const readings = [
      { sensorId: "rack-b", observedAt: "10:00", temperatureCelsius: 80 },
      { sensorId: "rack-b", observedAt: "10:01", temperatureCelsius: 78 },
      { sensorId: "rack-b", observedAt: "10:02", temperatureCelsius: 77 },
    ];

    assert.deepEqual(
      annotateWarmupWindows(readings).map((reading) => reading.minutesUntilWarmer),
      [0, 0, 0],
    );
  });

  await record("downstream alert summaries use the annotated wait window", () => {
    const readings = [
      { sensorId: "rack-c", observedAt: "11:00", temperatureCelsius: 63 },
      { sensorId: "rack-c", observedAt: "11:01", temperatureCelsius: 62 },
      { sensorId: "rack-c", observedAt: "11:02", temperatureCelsius: 61 },
      { sensorId: "rack-c", observedAt: "11:03", temperatureCelsius: 65 },
    ];

    const annotated = annotateWarmupWindows(readings);
    assert.deepEqual(summarizeWarmupBreaches(annotated, 2), [
      { sensorId: "rack-c", observedAt: "11:00", minutesUntilWarmer: 3 },
    ]);
  });
}

module.exports = { runTests };
`

const hiddenTests = `const assert = require("node:assert/strict");
const { annotateWarmupWindows } = require("../src/temperature-alerts");

async function runTests(record) {
  await record("does not treat equal temperatures as warmer", () => {
    const readings = [
      { sensorId: "rack-d", observedAt: "12:00", temperatureCelsius: 72 },
      { sensorId: "rack-d", observedAt: "12:01", temperatureCelsius: 72 },
      { sensorId: "rack-d", observedAt: "12:02", temperatureCelsius: 73 },
    ];

    assert.deepEqual(
      annotateWarmupWindows(readings).map((reading) => reading.minutesUntilWarmer),
      [2, 1, 0],
    );
  });

  await record("resolves a long descending run when the recovery arrives", () => {
    const readings = [
      { sensorId: "rack-e", observedAt: "13:00", temperatureCelsius: 74 },
      { sensorId: "rack-e", observedAt: "13:01", temperatureCelsius: 73 },
      { sensorId: "rack-e", observedAt: "13:02", temperatureCelsius: 72 },
      { sensorId: "rack-e", observedAt: "13:03", temperatureCelsius: 71 },
      { sensorId: "rack-e", observedAt: "13:04", temperatureCelsius: 75 },
    ];

    assert.deepEqual(
      annotateWarmupWindows(readings).map((reading) => reading.minutesUntilWarmer),
      [4, 3, 2, 1, 0],
    );
  });
}

module.exports = { runTests };
`

const runner = `const suites = [
  ["visible temperature alert regression", require("./temperature-alerts.test")],
  ["hidden temperature alert edges", require("./temperature-alerts.hidden.test")],
]

const results = []

async function record(suite, name, fn) {
  try {
    await fn()
    results.push({ suite, name, passed: true, error: null, isHidden: suite.toLowerCase().includes("hidden") })
  } catch (error) {
    results.push({ suite, name, passed: false, error: error && error.message ? error.message : String(error), isHidden: suite.toLowerCase().includes("hidden") })
  }
}

;(async () => {
  for (const [suite, mod] of suites) {
    await mod.runTests((name, fn) => record(suite, name, fn))
  }
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
})().catch((error) => {
  results.push({ suite: "runner", name: "execute workspace tests", passed: false, error: error.message, isHidden: true })
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
  process.exitCode = 1
})`

export const bugfixTemperatureAlertRegressionScenario: BugFixScenario = {
  id: "bugfix-temperature-alert-regression",
  title: "Temperature Alert Warmup Regression",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Uber", "Google", "Startup"],
  description:
    "An operations telemetry panel undercounts how long cold readings wait before the next warmer sample arrives.",
  tags: ["javascript", "telemetry", "monotonic-stack", "arrays", "alerts", "real-codebase"],
  estimatedTime: 25,
  problemStatement: `**Incident Report**
The data-center operations panel annotates each temperature reading with how many minutes pass before that sensor reports a warmer value. After a refactor, some cold streaks show shorter or missing wait windows, which makes downstream alert summaries look calmer than they should.

**Artifacts**
- The telemetry contract is documented in \`README.md\`.
- The editable annotation logic is in \`src/temperature-alerts.js\`.
- \`src/alert-summary.js\` is a shared reporting helper and should be treated as read-only.
- Visible regression coverage is in \`tests/temperature-alerts.test.js\`.

**Your Task**
1. Reproduce the failing behavior and write a hypothesis.
2. Patch the annotation logic with the smallest code change that matches the telemetry contract.
3. Verify the visible tests and explain what regression coverage would prevent this from returning.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "tests/temperature-alerts.test.js",
        content: visibleTests,
        description: "Visible tests",
      },
    ],
  },
  expectedBehavior:
    "Each reading should be annotated with the number of later minutes until the next strictly warmer temperature; readings with no warmer future sample should stay at zero.",
  bugDescription:
    "The stack resolution only pops one pending reading per warmer sample, so earlier cooler readings remain unresolved when a recovery should resolve a whole cold streak.",
  hints: [
    "Trace the pending index collection across a descending run followed by a warmer reading.",
    "A single warmer sample can satisfy more than one previous reading.",
  ],
  testCases: [
    {
      input: { temperatures: [70, 69, 71] },
      expected: [2, 1, 0],
      description: "Workspace tests cover warmup window annotation",
    },
  ],
  expectedTouchedFiles: ["src/temperature-alerts.js"],
  userReport:
    "Operations sees some temperature cold streaks reported as resolved too quickly, causing alert summaries to undercount sustained recovery windows.",
  observedSymptoms: [
    "A cold streak followed by one warmer sample leaves an earlier reading with a zero-minute wait.",
    "Strictly descending readings with no recovery still correctly stay unresolved.",
  ],
  reproductionSteps: [
    "Read README.md for the telemetry annotation contract.",
    "Inspect tests/temperature-alerts.test.js for visible regression examples.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "Every pending cooler reading resolved by a warmer sample receives the correct wait length.",
    "Equal temperatures do not count as warmer.",
    "Unresolved readings remain annotated with zero minutes.",
  ],
  debuggingSkills: [
    "reproduction",
    "stack tracing",
    "algorithmic invariant",
    "minimal patch",
    "verification",
  ],
  rootCauseRubric: [
    "Explains why a recovery sample can resolve multiple prior readings.",
    "Connects the unresolved pending readings to the undercounted operations summary.",
    "Proposes regression coverage for descending streaks, equal temperatures, and no-recovery readings.",
  ],
  workspace: {
    language: "javascript",
    primaryFilePath: "src/temperature-alerts.js",
    editableFilePaths: ["src/temperature-alerts.js"],
    visibleTestPaths: ["tests/temperature-alerts.test.js"],
    hiddenTestPaths: ["tests/temperature-alerts.hidden.test.js"],
    testRunnerPath: "tests/run-workspace-tests.js",
    files: [
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content: `# Temperature Alert Warmup Windows

Each telemetry reading is one minute apart for a single sensor stream. The annotation step adds \`minutesUntilWarmer\` to each reading.

Rules:
- A warmer reading must be strictly greater than the current temperature.
- The value is the number of minutes until the next warmer reading appears.
- Readings without a warmer future sample keep \`minutesUntilWarmer: 0\`.

The alert summary uses those annotations to highlight readings that waited longer than an operations threshold.`,
        description: "Telemetry contract notes",
      },
      {
        path: "src/temperature-alerts.js",
        role: "editable",
        language: "javascript",
        content: starter,
        description: "Temperature annotation logic",
      },
      {
        path: "src/alert-summary.js",
        role: "readonly",
        language: "javascript",
        content: summaryHelper,
        description: "Shared alert summary helper",
      },
      {
        path: "tests/temperature-alerts.test.js",
        role: "test",
        language: "javascript",
        content: visibleTests,
        description: "Visible test suite",
      },
      {
        path: "tests/temperature-alerts.hidden.test.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: hiddenTests,
        description: "Hidden test suite",
      },
      {
        path: "tests/run-workspace-tests.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: runner,
        description: "Hidden workspace test runner",
      },
    ],
    referenceFiles: [
      {
        path: "src/temperature-alerts.js",
        role: "editable",
        language: "javascript",
        content: reference,
      },
    ],
  },
}

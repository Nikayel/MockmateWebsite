import type { BugFixScenario } from "../../types"

const starter = `function toMinutes(observedAt) {
  const [hours, mins] = observedAt.split(":").map(Number);
  return hours * 60 + mins;
}

function annotateWarmupWindows(readings) {
  const waitMinutes = Array(readings.length).fill(0);
  const pendingIndexes = [];

  for (let index = 0; index < readings.length; index += 1) {
    const currentTemperature = readings[index].temperatureCelsius;

    if (
      pendingIndexes.length > 0 &&
      currentTemperature > readings[pendingIndexes[pendingIndexes.length - 1]].temperatureCelsius
    ) {
      const previousIndex = pendingIndexes.pop();
      waitMinutes[previousIndex] =
        toMinutes(readings[index].observedAt) - toMinutes(readings[previousIndex].observedAt);
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
  await record("a recovery resolves the whole streak using observed timestamps", () => {
    const readings = [
      { sensorId: "rack-a", observedAt: "09:00", temperatureCelsius: 70 },
      { sensorId: "rack-a", observedAt: "09:02", temperatureCelsius: 69 },
      { sensorId: "rack-a", observedAt: "09:05", temperatureCelsius: 71 },
    ];

    assert.deepEqual(
      annotateWarmupWindows(readings).map((reading) => reading.minutesUntilWarmer),
      [5, 3, 0],
    );
  });

  await record("keeps unresolved readings at zero minutes", () => {
    const readings = [
      { sensorId: "rack-b", observedAt: "10:00", temperatureCelsius: 80 },
      { sensorId: "rack-b", observedAt: "10:01", temperatureCelsius: 78 },
      { sensorId: "rack-b", observedAt: "10:04", temperatureCelsius: 77 },
    ];

    assert.deepEqual(
      annotateWarmupWindows(readings).map((reading) => reading.minutesUntilWarmer),
      [0, 0, 0],
    );
  });

  await record("downstream alert summaries use every annotated wait window", () => {
    const readings = [
      { sensorId: "rack-c", observedAt: "11:00", temperatureCelsius: 63 },
      { sensorId: "rack-c", observedAt: "11:01", temperatureCelsius: 62 },
      { sensorId: "rack-c", observedAt: "11:02", temperatureCelsius: 61 },
      { sensorId: "rack-c", observedAt: "11:05", temperatureCelsius: 65 },
    ];

    const annotated = annotateWarmupWindows(readings);
    assert.deepEqual(summarizeWarmupBreaches(annotated, 2), [
      { sensorId: "rack-c", observedAt: "11:00", minutesUntilWarmer: 5 },
      { sensorId: "rack-c", observedAt: "11:01", minutesUntilWarmer: 4 },
      { sensorId: "rack-c", observedAt: "11:02", minutesUntilWarmer: 3 },
    ]);
  });
}

module.exports = { runTests };
`

const hiddenTests = `const assert = require("node:assert/strict");
const { annotateWarmupWindows } = require("../src/temperature-alerts");

async function runTests(record) {
  await record("resolves a long descending run with non-uniform gaps", () => {
    const readings = [
      { sensorId: "rack-e", observedAt: "13:00", temperatureCelsius: 74 },
      { sensorId: "rack-e", observedAt: "13:01", temperatureCelsius: 73 },
      { sensorId: "rack-e", observedAt: "13:03", temperatureCelsius: 72 },
      { sensorId: "rack-e", observedAt: "13:06", temperatureCelsius: 71 },
      { sensorId: "rack-e", observedAt: "13:10", temperatureCelsius: 75 },
    ];

    assert.deepEqual(
      annotateWarmupWindows(readings).map((reading) => reading.minutesUntilWarmer),
      [10, 9, 7, 4, 0],
    );
  });

  await record("a flatline of equal temperatures is not a warmup", () => {
    const readings = [
      { sensorId: "rack-flat", observedAt: "14:00", temperatureCelsius: 72 },
      { sensorId: "rack-flat", observedAt: "14:02", temperatureCelsius: 72 },
      { sensorId: "rack-flat", observedAt: "14:05", temperatureCelsius: 72 },
    ];

    assert.deepEqual(
      annotateWarmupWindows(readings).map((reading) => reading.minutesUntilWarmer),
      [0, 0, 0],
    );
  });

  await record("tolerates a duplicate-minute retry of a reading", () => {
    const readings = [
      { sensorId: "rack-r", observedAt: "15:00", temperatureCelsius: 62 },
      { sensorId: "rack-r", observedAt: "15:02", temperatureCelsius: 66 },
      { sensorId: "rack-r", observedAt: "15:02", temperatureCelsius: 66 },
    ];

    assert.deepEqual(
      annotateWarmupWindows(readings).map((reading) => reading.minutesUntilWarmer),
      [2, 0, 0],
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
  title: "Ops Panel Undercounts Cold-Streak Recovery Windows",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Generic"],
  description:
    "A data-center telemetry panel annotates only part of a cold streak's recovery wait, so alert summaries look calmer than the racks actually ran.",
  tags: ["javascript", "telemetry", "observability", "alerts", "real-codebase"],
  estimatedTime: 30,
  problemStatement: `**Incident Report**
The data-center operations panel annotates each temperature reading with how many minutes pass before that sensor reports a warmer value, using each reading's observed timestamp. After a refactor, some cold streaks show shorter or missing wait windows, so downstream alert summaries under-report how long racks ran hot.

**Artifacts**
- The telemetry contract is documented in README.md.
- The editable annotation logic is in src/temperature-alerts.js.
- src/alert-summary.js is a shared reporting helper and should be treated as read-only.
- Visible regression coverage is in tests/temperature-alerts.test.js.

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
    "Each reading is annotated with the number of minutes, taken from the observedAt timestamps, until the next strictly warmer reading. A reading with no warmer future sample stays at zero, and equal temperatures do not count as warmer.",
  bugDescription: "",
  hints: [
    "Reproduce a long cold streak that ends with one warmer sample. Compare the wait each cold reading gets against how long it actually waited by its timestamp.",
    "One warmer sample ends the streak, but only some of the cold readings end up annotated. Look at what happens to the readings below the one that got resolved.",
  ],
  testCases: [
    {
      input: { temperatures: [70, 69, 71], observedAt: ["09:00", "09:02", "09:05"] },
      expected: [5, 3, 0],
      description: "Workspace tests cover warmup windows measured from observed timestamps",
    },
  ],
  expectedTouchedFiles: ["src/temperature-alerts.js"],
  task: "Annotate every reading with the minutes, taken from the observedAt timestamps, until that sensor's next strictly warmer sample, even when one recovery ends a whole cold streak.",
  // Grounded in the scenario's own first visible test, "a recovery resolves the
  // whole streak using observed timestamps": rack-a reads 70 at 09:00, 69 at
  // 09:02, then recovers to 71 at 09:05. The starter returns [0, 3, 0] where the
  // test asserts [5, 3, 0], so the 09:00 reading is annotated 0 instead of 5.
  // The same suite's all-zero descending run (rack-b) already passes.
  symptom: {
    subject: "rack-a 09:00",
    tag: "warmup window",
    expected: "5 min",
    actual: "0 min",
    delta: "-5 min",
    caveat: "Readings with no warmer sample ahead of them correctly stay at zero.",
  },
  userReport:
    "Operations here. The panel shows some cold streaks recovering faster than they did on the floor, so our alert summaries undercount how long racks ran hot. It looks worst on a long slow cool-down that finally recovers; only the last reading before the recovery seems to get a wait, and the earlier ones read as fine.",
  observedSymptoms: [
    "On a multi-reading cold streak that ends with one warmer sample, only the last cold reading gets a wait window; the earlier readings stay at zero.",
    "A strictly descending run with no recovery correctly stays at zero, and equal-temperature flatlines are not treated as recoveries.",
  ],
  reproductionSteps: [
    "Read README.md for the telemetry annotation contract and how observed timestamps are used.",
    "Inspect tests/temperature-alerts.test.js for the streak-recovery examples.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "Every cooler reading cleared by a warmer sample gets the correct wait, measured from observed timestamps.",
    "Equal temperatures do not count as warmer, and unresolved readings stay at zero.",
    "Non-uniform gaps and duplicate-minute retries behave exactly as before.",
    "Only src/temperature-alerts.js changes.",
  ],
  debuggingSkills: [
    "reproduction",
    "stack tracing",
    "algorithmic invariant",
    "minimal patch",
    "verification",
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

Each telemetry reading for a single sensor carries an observedAt timestamp (HH:MM) and a temperature. The annotation step adds minutesUntilWarmer to each reading.

Rules:
- A warmer reading must be strictly greater than the current temperature. Equal temperatures are a flatline, not a warmup.
- minutesUntilWarmer is the difference between observed timestamps: the observedAt of the next strictly warmer reading minus the observedAt of the current reading.
- Sampling is not uniform. Gaps between readings vary, and the sensor occasionally retries a reading at the same minute.
- A reading with no warmer future sample keeps minutesUntilWarmer at 0.

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
  },
}

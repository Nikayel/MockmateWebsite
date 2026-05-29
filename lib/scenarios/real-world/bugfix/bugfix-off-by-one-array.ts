import type { BugFixScenario } from "../../types"

export const bugfixOffByOneArrayScenario: BugFixScenario = {
  id: "bugfix-off-by-one-array",
  title: "Sensor Trend Off-By-One",
  type: "bugfix",
  difficulty: "easy",
  companies: ["Generic", "Amazon", "Microsoft"],
  description: "Fix an off-by-one crash in a sensor trend processor",
  tags: ["arrays", "loops", "data-processing", "debugging"],
  estimatedTime: 20,
  problemStatement: `An operations dashboard compares adjacent sensor readings to detect sudden changes. The dashboard intermittently crashes when a device uploads a normal reading batch.

**Your task:**
1. Inspect the adjacent-pair trend calculation
2. Fix the loop boundary so every valid adjacent pair is processed exactly once
3. Preserve full precision in returned percentage changes
4. Keep alert counting behavior unchanged`,
  buggyCode: {
    javascript: `// trend-processor.js
// BUG: The loop walks one element too far and reads past the end.
function analyzeSensorTrend(readings, alertThreshold) {
  const changes = [];
  let alertCount = 0;

  for (let i = 0; i <= readings.length; i++) {
    const current = readings[i];
    const next = readings[i + 1];

    if (current === undefined || next === undefined) {
      throw new Error("Invalid adjacent reading");
    }

    const change = ((next - current) / current) * 100;
    changes.push(change);

    if (Math.abs(change) >= alertThreshold) {
      alertCount++;
    }
  }

  return { changes, alertCount };
}`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "ingestion/sensor-batch.js",
        content: `class SensorBatch {
  constructor(deviceId, readings) {
    this.deviceId = deviceId;
    this.readings = readings;
  }
}`,
        description: "Sensor batch shape used by ingestion jobs",
      },
      {
        fileName: "dashboard/trend-card.js",
        content: `class TrendCard {
  render(summary) {
    // The UI displays every adjacent percentage change and an alert badge.
    return { rows: summary.changes.length, alerts: summary.alertCount };
  }
}`,
        description: "Dashboard context for how trend summaries are consumed",
      },
      {
        fileName: "tests/trend-processor.test.js",
        content: `// analyzeSensorTrend([100, 110, 105, 120], 10)
//   -> { changes: [10, -4.545454545454546, 14.285714285714285], alertCount: 2 }
// analyzeSensorTrend([50, 50], 10)
//   -> { changes: [0], alertCount: 0 }`,
        description: "Regression tests for adjacent-pair processing",
      },
    ],
  },
  expectedBehavior:
    "The processor should return one percentage change per adjacent pair without reading beyond the array.",
  bugDescription:
    "The loop condition allows i to equal readings.length, so readings[i] and readings[i + 1] become undefined.",
  hints: [
    "For n readings, there are n - 1 adjacent pairs.",
    "The final valid current index is readings.length - 2.",
    "Do not round the returned percentage changes.",
  ],
  testCases: [
    {
      input: { readings: [100, 110, 105, 120], alertThreshold: 10 },
      expected: { changes: [10, -4.545454545454546, 14.285714285714285], alertCount: 2 },
      description: "Normal sensor batch should produce full-precision adjacent changes",
    },
    {
      input: { readings: [50, 50], alertThreshold: 10 },
      expected: { changes: [0], alertCount: 0 },
      description: "Two readings should produce exactly one adjacent comparison",
    },
  ],
}

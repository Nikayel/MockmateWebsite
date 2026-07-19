import type { BugFixScenario } from "../../types"

const starter = `function findAdjustmentPair(lineItems, targetCents) {
  const seenAmounts = new Map();

  for (let index = 0; index < lineItems.length; index += 1) {
    const row = lineItems[index];

    if (typeof row.amountCents !== "number") {
      continue;
    }

    const needed = targetCents - row.amountCents;

    if (seenAmounts.has(needed)) {
      return [seenAmounts.get(needed), index];
    }

    if (row.status === "open") {
      seenAmounts.set(row.amountCents, index);
    }
  }

  return [];
}

module.exports = { findAdjustmentPair };
`

const ledgerHelper = `function summarizeAdjustment(lineItems, pair) {
  if (!Array.isArray(pair) || pair.length !== 2) {
    return null;
  }

  const [leftIndex, rightIndex] = pair;
  const left = lineItems[leftIndex];
  const right = lineItems[rightIndex];

  if (!left || !right || leftIndex === rightIndex) {
    return null;
  }

  return {
    ids: [left.id, right.id],
    totalCents: left.amountCents + right.amountCents,
  };
}

module.exports = { summarizeAdjustment };
`

const visibleTests = `const assert = require("node:assert/strict");
const { findAdjustmentPair } = require("../src/reconciliation");
const { summarizeAdjustment } = require("../src/ledger");

async function runTests(record) {
  await record("explains an adjustment with two open rows, credits included", () => {
    const lineItems = [
      { id: "inv_9001", amountCents: 3200, status: "open" },
      { id: "inv_9002", amountCents: -1500, status: "open" },
      { id: "inv_9003", amountCents: 1800, status: "open" },
    ];

    const pair = findAdjustmentPair(lineItems, 5000);
    const summary = summarizeAdjustment(lineItems, pair);

    assert.deepEqual(summary, {
      ids: ["inv_9001", "inv_9003"],
      totalCents: 5000,
    });
  });

  await record("does not explain an adjustment with a row that was already reconciled", () => {
    const lineItems = [
      { id: "inv_9101", amountCents: 2600, status: "open" },
      { id: "inv_9102", amountCents: 2400, status: "reconciled" },
      { id: "inv_9103", amountCents: 900, status: "open" },
    ];

    assert.deepEqual(findAdjustmentPair(lineItems, 5000), []);
  });

  await record("returns an empty result when no open pair exists", () => {
    const lineItems = [
      { id: "inv_9201", amountCents: 1200, status: "open" },
      { id: "inv_9202", amountCents: 2500, status: "open" },
      { id: "inv_9203", amountCents: 3900, status: "open" },
    ];

    assert.deepEqual(findAdjustmentPair(lineItems, 6000), []);
  });
}

module.exports = { runTests };
`

const hiddenTests = `const assert = require("node:assert/strict");
const { findAdjustmentPair } = require("../src/reconciliation");
const { summarizeAdjustment } = require("../src/ledger");

async function runTests(record) {
  await record("matches a later row against an earlier duplicate amount", () => {
    const lineItems = [
      { id: "led_301", amountCents: 2400, status: "open" },
      { id: "led_302", amountCents: 3100, status: "open" },
      { id: "led_303", amountCents: 2400, status: "open" },
      { id: "led_304", amountCents: 1600, status: "open" },
    ];

    const pair = findAdjustmentPair(lineItems, 4700);
    const summary = summarizeAdjustment(lineItems, pair);

    assert.deepEqual(summary, {
      ids: ["led_302", "led_304"],
      totalCents: 4700,
    });
  });

  await record("does not reuse the same row twice", () => {
    const lineItems = [
      { id: "led_401", amountCents: 2500, status: "open" },
      { id: "led_402", amountCents: 1000, status: "open" },
      { id: "led_403", amountCents: 4100, status: "open" },
    ];

    assert.deepEqual(findAdjustmentPair(lineItems, 5000), []);
  });

  await record("skips legacy export rows that are missing amounts", () => {
    const lineItems = [
      { id: "led_501", amountCents: 2000, status: "open" },
      { id: "led_502", amountCents: null, status: "open" },
      { id: "led_503", amountCents: 3000, status: "open" },
    ];

    assert.deepEqual(findAdjustmentPair(lineItems, 5000), [0, 2]);
  });

  await record("explains the adjustment with the open pair when a reconciled complement appears earlier", () => {
    const lineItems = [
      { id: "led_601", amountCents: 2600, status: "open" },
      { id: "led_602", amountCents: 2400, status: "reconciled" },
      { id: "led_603", amountCents: 1400, status: "open" },
      { id: "led_604", amountCents: 3600, status: "open" },
    ];

    const pair = findAdjustmentPair(lineItems, 5000);
    const summary = summarizeAdjustment(lineItems, pair);

    assert.deepEqual(summary, {
      ids: ["led_603", "led_604"],
      totalCents: 5000,
    });
  });
}

module.exports = { runTests };
`

const runner = `const suites = [
  ["visible reconciliation lookup", require("./reconciliation.test")],
  ["hidden reconciliation edges", require("./reconciliation.hidden.test")],
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

export const bugfixOnboardingScenario: BugFixScenario = {
  id: "bugfix-onboarding",
  title: "Onboarding: Adjustment Reconciliation Lookup",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "easy",
  companies: ["Generic"],
  description:
    "The billing review queue explained a manual invoice adjustment with ledger money that had already been settled, and finance approved the match before review caught it.",
  tags: ["javascript", "onboarding", "billing", "reconciliation", "real-codebase"],
  estimatedTime: 15,
  problemStatement: `Welcome to the CodeSparring bugfix workspace.

**Incident Report**
Finance support approves a manual invoice adjustment when the review queue shows two ledger rows that explain it. On Tuesday the queue explained adjustment adj_88213 with a row that had already been consumed by last week's adjustment. Support approved it, and that account's ledger now double-counts the row. A second case was caught in review the same day. Most adjustments in the queue still reconcile normally.

**Artifacts**
- The reconciliation contract and ledger row shape are in \`README.md\`.
- The editable lookup logic is in \`src/reconciliation.js\`.
- \`src/ledger.js\` is a shared helper used by the tests and should be treated as read-only.
- Visible regression coverage is in \`tests/reconciliation.test.js\`.

**Your Task**
1. Reproduce the failing behavior by reading the docs and running the tests.
2. Write a hypothesis before editing.
3. Make the smallest fix in the reconciliation lookup.
4. Verify with tests, then explain the root cause and prevention plan.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "tests/reconciliation.test.js",
        content: visibleTests,
        description: "Visible tests",
      },
    ],
  },
  expectedBehavior:
    "The lookup returns two distinct open ledger rows whose amounts add up to the adjustment, skips reconciled rows and rows with missing amounts entirely, and returns an empty result when no open pair exists.",
  bugDescription: "",
  hints: [
    "Run the visible tests first. Two pass and one fails. What do the passing cases have in common that the failing case does not?",
    "The failing case returns a pair instead of an empty result. Which of the two returned rows should never have been part of an explanation, and at which point in the scan was it considered?",
  ],
  testCases: [
    {
      input: { adjustmentCents: 5000 },
      expected: [],
      description:
        "An adjustment whose only matching sum involves settled money must stay unexplained",
    },
  ],
  expectedTouchedFiles: ["src/reconciliation.js"],
  task: "Explain an adjustment only with two distinct open ledger rows that sum to it, even when a reconciled row would complete the sum.",
  // Grounded in the scenario's own second visible test, "does not explain an
  // adjustment with a row that was already reconciled": inv_9101 (2600, open)
  // and inv_9102 (2400, reconciled) against a 5000 adjustment. The starter
  // returns that pair where the test asserts an empty result.
  symptom: {
    subject: "the 5000c adjustment",
    tag: "reconciled row in the ledger",
    expected: "[]",
    actual: "[0, 1]",
    delta: "+1 pair",
    // Scoped to "no reconciled row in the ledger" on purpose. The unqualified
    // claim is falsified by the hidden "explains the adjustment with the open pair
    // when a reconciled complement appears earlier" test: that ledger IS backed by
    // two open rows (led_603 + led_604) and still resolves wrong. The defect does
    // not only ADD false explanations, it DISPLACES correct ones.
    caveat:
      "Adjustments with no reconciled row in the ledger, credits, and no-match cases resolve correctly.",
  },
  userReport:
    "Finance support approved an adjustment that the queue explained with a ledger row already consumed by an earlier adjustment. That account double-counts the row now, and support wants to know which queue explanations they can still trust.",
  observedSymptoms: [
    "Two adjustments this week were explained using a ledger row whose status was reconciled, and one was approved before review caught it.",
    "Adjustments whose ledger holds no reconciled row, credits, no-match cases, and legacy rows with missing amounts all behave normally.",
  ],
  reproductionSteps: [
    "Read README.md for the reconciliation contract and the ledger row shape.",
    "Inspect tests/reconciliation.test.js to see which behavior fails.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "Adjustments are only explained by two distinct open rows, in first-completing scan order.",
    "Reconciled rows can neither be cached nor complete a pair.",
    "Credits, missing-amount rows, and no-match adjustments behave exactly as before.",
    "Only src/reconciliation.js changes.",
  ],
  debuggingSkills: [
    "reproduction",
    "scoping from passing cases",
    "hypothesis",
    "minimal patch",
    "verification",
  ],
  workspace: {
    language: "javascript",
    primaryFilePath: "src/reconciliation.js",
    editableFilePaths: ["src/reconciliation.js"],
    visibleTestPaths: ["tests/reconciliation.test.js"],
    hiddenTestPaths: ["tests/reconciliation.hidden.test.js"],
    testRunnerPath: "tests/run-workspace-tests.js",
    files: [
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content: `# Adjustment Reconciliation Lookup

Finance support reviews manual invoice adjustments in the billing review queue. For each adjustment, the queue calls this lookup with the adjustment amount in cents and the account's ledger rows. A match means the adjustment is fully explained by two ledger rows and can be approved without escalation.

## Ledger row shape

Each row has an \`id\`, an \`amountCents\` integer, and a \`status\` that is either \`"open"\` or \`"reconciled"\`.

## Contract

- Return the indexes of two distinct ledger rows whose amounts add up to the adjustment amount, or an empty array when no such pair exists.
- Only rows with status \`"open"\` may explain an adjustment. A \`"reconciled"\` row was consumed by an earlier adjustment; matching it again would double-count money the ledger has already settled.
- Credits appear as negative amounts and are legitimate: a credit plus a larger charge can explain an adjustment.
- Rows imported from the legacy export can be missing \`amountCents\`. The importer flags them for backfill and the lookup must skip them.
- When several pairs qualify, return the first pair that completes in scan order. Callers preserve index order so support can jump to the exact rows.`,
        description: "Product and service contract notes",
      },
      {
        path: "src/reconciliation.js",
        role: "editable",
        language: "javascript",
        content: starter,
        description: "Adjustment reconciliation lookup",
      },
      {
        path: "src/ledger.js",
        role: "readonly",
        language: "javascript",
        content: ledgerHelper,
        description: "Shared ledger summary helper",
      },
      {
        path: "tests/reconciliation.test.js",
        role: "test",
        language: "javascript",
        content: visibleTests,
        description: "Visible test suite",
      },
      {
        path: "tests/reconciliation.hidden.test.js",
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

import type { BugFixScenario } from "../../types"

const starter = `function findAdjustmentPair(lineItems, targetCents) {
  const seenAmounts = new Map();

  for (let index = 0; index < lineItems.length; index += 1) {
    const amount = lineItems[index].amountCents;
    const needed = targetCents - amount;

    if (seenAmounts.has(needed)) {
      return [seenAmounts.get(needed), index];
    }

    seenAmounts.set(targetCents, index);
  }

  return [];
}

module.exports = { findAdjustmentPair };
`

const reference = `function findAdjustmentPair(lineItems, targetCents) {
  const seenAmounts = new Map();

  for (let index = 0; index < lineItems.length; index += 1) {
    const amount = lineItems[index].amountCents;
    const needed = targetCents - amount;

    if (seenAmounts.has(needed)) {
      return [seenAmounts.get(needed), index];
    }

    seenAmounts.set(amount, index);
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
  await record("returns the two ledger rows that reconcile the adjustment", () => {
    const lineItems = [
      { id: "line_101", amountCents: 3200 },
      { id: "line_102", amountCents: 1800 },
      { id: "line_103", amountCents: 4100 },
    ];

    const pair = findAdjustmentPair(lineItems, 5000);
    const summary = summarizeAdjustment(lineItems, pair);

    assert.deepEqual(summary, {
      ids: ["line_101", "line_102"],
      totalCents: 5000,
    });
  });

  await record("returns an empty result when no reconciliation pair exists", () => {
    const lineItems = [
      { id: "line_201", amountCents: 1200 },
      { id: "line_202", amountCents: 2500 },
      { id: "line_203", amountCents: 3900 },
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
      { id: "line_301", amountCents: 2400 },
      { id: "line_302", amountCents: 3100 },
      { id: "line_303", amountCents: 2400 },
      { id: "line_304", amountCents: 1600 },
    ];

    const pair = findAdjustmentPair(lineItems, 4700);
    const summary = summarizeAdjustment(lineItems, pair);

    assert.deepEqual(summary, {
      ids: ["line_302", "line_304"],
      totalCents: 4700,
    });
  });

  await record("does not reuse the same row twice", () => {
    const lineItems = [
      { id: "line_401", amountCents: 2500 },
      { id: "line_402", amountCents: 1000 },
      { id: "line_403", amountCents: 4100 },
    ];

    assert.deepEqual(findAdjustmentPair(lineItems, 5000), []);
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
  title: "Onboarding: Pricing Reconciliation Lookup",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "easy",
  companies: ["Stripe", "Shopify", "Square"],
  description:
    "A pricing reconciliation service misses invoice line-item pairs that should explain manual adjustments.",
  tags: ["javascript", "onboarding", "pricing", "hash-map", "reconciliation", "real-codebase"],
  estimatedTime: 12,
  problemStatement: `Welcome to the CodeSparring bugfix workspace.

**Incident Report**
Finance support is reviewing manual invoice adjustments. The reconciliation job should identify the two ledger rows whose amounts add up to the adjustment amount, but some valid adjustments are returning "no match" in the review queue.

**Artifacts**
- Product notes are in \`README.md\`.
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
    "The service should return two distinct ledger row indexes whose amounts add up to the requested adjustment, or an empty result when no pair exists.",
  bugDescription:
    "The lookup cache stores the target amount instead of the current line amount, so complement lookups never find most valid prior rows.",
  hints: [
    "Trace what value is being stored after each row is inspected.",
    "The lookup should make the next row able to find a previously seen amount.",
  ],
  testCases: [
    {
      input: { adjustmentCents: 5000 },
      expected: ["line_101", "line_102"],
      description: "Workspace tests cover pricing reconciliation lookup behavior",
    },
  ],
  expectedTouchedFiles: ["src/reconciliation.js"],
  userReport:
    "Finance support sees valid manual invoice adjustments land in the review queue as unreconciled even when two ledger rows add up to the adjustment amount.",
  observedSymptoms: [
    "A visible regression case with 3200 cents and 1800 cents returns no usable pair for a 5000 cent adjustment.",
    "No-match cases still need to remain empty.",
  ],
  reproductionSteps: [
    "Read README.md for the reconciliation contract.",
    "Inspect tests/reconciliation.test.js to understand the visible failing behavior.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "Valid pairs are returned as two distinct indexes in scan order.",
    "No-match adjustments still return an empty array.",
    "Only src/reconciliation.js needs to change.",
  ],
  debuggingSkills: [
    "reproduction",
    "map lookup tracing",
    "hypothesis",
    "minimal patch",
    "verification",
  ],
  rootCauseRubric: [
    "Explains the mismatch between the cached value and the later complement lookup.",
    "Connects the failed customer-facing reconciliation to the stored lookup key.",
    "Names a regression guard such as duplicate amount coverage or table-driven reconciliation tests.",
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
        content: `# Pricing Reconciliation Lookup

The invoice review queue receives a target adjustment amount in cents and a list of ledger line items. The lookup should return the indexes for two distinct line items whose amounts add up to the adjustment.

The function returns an empty array when no pair exists. Callers preserve index order so support can jump back to the exact ledger rows.`,
        description: "Product and service contract notes",
      },
      {
        path: "src/reconciliation.js",
        role: "editable",
        language: "javascript",
        content: starter,
        description: "Pricing reconciliation lookup",
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
    referenceFiles: [
      {
        path: "src/reconciliation.js",
        role: "editable",
        language: "javascript",
        content: reference,
      },
    ],
  },
}

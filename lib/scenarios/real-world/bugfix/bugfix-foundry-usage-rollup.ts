import type { BugFixScenario } from "../../types"

const starter = `function normalizeAccountId(raw) {
  return String(raw).trim().toLowerCase()
}

function dedupe(events) {
  const seen = new Set()
  const unique = []
  for (const event of events) {
    if (seen.has(event.id)) continue
    seen.add(event.id)
    unique.push(event)
  }
  return unique
}

function addFeed(totals, events) {
  for (const event of events) {
    const accountId = normalizeAccountId(event.accountId)
    if (!totals[accountId]) {
      totals[accountId] = { units: 0, eventCount: 0 }
    }
    totals[accountId].units += event.units
    totals[accountId].eventCount += 1
  }
}

function rollupUsage(primaryFeed, backupFeed) {
  const totals = {}
  addFeed(totals, dedupe(primaryFeed))
  addFeed(totals, dedupe(backupFeed))
  return totals
}

module.exports = { rollupUsage, normalizeAccountId, dedupe }
`

const reference = `function normalizeAccountId(raw) {
  return String(raw).trim().toLowerCase()
}

function dedupe(events) {
  const seen = new Set()
  const unique = []
  for (const event of events) {
    if (seen.has(event.id)) continue
    seen.add(event.id)
    unique.push(event)
  }
  return unique
}

function addFeed(totals, events) {
  for (const event of events) {
    const accountId = normalizeAccountId(event.accountId)
    if (!totals[accountId]) {
      totals[accountId] = { units: 0, eventCount: 0 }
    }
    totals[accountId].units += event.units
    totals[accountId].eventCount += 1
  }
}

function rollupUsage(primaryFeed, backupFeed) {
  const totals = {}
  addFeed(totals, dedupe([...primaryFeed, ...backupFeed]))
  return totals
}

module.exports = { rollupUsage, normalizeAccountId, dedupe }
`

export const bugfixFoundryUsageRollupScenario: BugFixScenario = {
  id: "bugfix-foundry-usage-rollup",
  title: "Usage Rollup Double-Count",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Palantir"],
  description: "Fix a metered-usage rollup that overcounts cross-shard duplicate events",
  userReport:
    "An analyst on the metering team flagged that several accounts were billed for more compute units than they actually consumed. The discrepancy started right after last week's backfill replayed the backup shard into the rollup pipeline.",
  tags: ["backend", "aggregation", "deduplication", "real-codebase"],
  estimatedTime: 40,
  problemStatement: `The metered-usage rollup pipeline ingests usage events from a primary shard and a backup shard. Ingestion is at-least-once, and the same event id can be delivered by both shards, so the two feeds overlap. Each distinct event id must contribute to an account's totals exactly once.

After a backfill replayed the backup shard, some accounts were charged for more compute units than they used. Make rollupUsage return the correct per-account units and eventCount so that a distinct event is counted once even when it arrives on both shards, while still tolerating repeated delivery inside a single shard.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "src/usage-store.js",
        content: "Read-only helper used by the rollup tests to build usage event records.",
        description: "Event fixture helper",
      },
      {
        fileName: "tests/usage-rollup.test.js",
        content: "Visible tests cover a cross-shard duplicate and distinct events across shards.",
        description: "Regression tests",
      },
    ],
  },
  expectedBehavior:
    "Each distinct event id contributes to an account's units and eventCount exactly once, regardless of whether it is delivered by the primary shard, the backup shard, or both.",
  bugDescription:
    "Duplicates are removed within each feed in isolation and then the per-feed totals are summed, so an event id delivered by both the primary and backup shard is added to the account twice.",
  hints: [
    "Ingestion is at-least-once, and the same event id can land on both shards.",
    "Trace a single event id that appears in both feeds through the rollup and watch how many times it is added.",
    "Consider at what scope duplicates need to be collapsed before totals are accumulated.",
  ],
  testCases: [
    {
      input: { primaryFeed: ["evt_1"], backupFeed: ["evt_1"] },
      expected: "each distinct event counted once per account",
      description: "Workspace tests cover cross-shard duplicates and same-shard repeats",
    },
  ],
  expectedTouchedFiles: ["src/rollup.js"],
  workspace: {
    language: "javascript",
    primaryFilePath: "src/rollup.js",
    editableFilePaths: ["src/rollup.js"],
    visibleTestPaths: ["tests/usage-rollup.test.js"],
    hiddenTestPaths: ["tests/usage-rollup.hidden.test.js"],
    testRunnerPath: "tests/run-workspace-tests.js",
    files: [
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content:
          "Usage events are ingested from a primary shard and a backup shard with at-least-once delivery. The same event id can appear on both shards. rollupUsage aggregates units and eventCount per account, and every distinct event id must be counted exactly once per account.",
      },
      {
        path: "src/usage-store.js",
        role: "readonly",
        language: "javascript",
        content: `function makeEvent(id, accountId, units) {
  return { id, accountId, units }
}

module.exports = { makeEvent }
`,
        description: "Read-only helper for building usage event records in tests",
      },
      {
        path: "src/rollup.js",
        role: "editable",
        language: "javascript",
        content: starter,
        description: "Per-account usage rollup logic",
      },
      {
        path: "tests/usage-rollup.test.js",
        role: "test",
        language: "javascript",
        content: `const assert = require("node:assert/strict")
const { makeEvent } = require("../src/usage-store")
const { rollupUsage } = require("../src/rollup")

async function runTests(record) {
  await record("an event in both shards counts once", () => {
    const totals = rollupUsage(
      [makeEvent("evt_1", "acct_1", 5)],
      [makeEvent("evt_1", "acct_1", 5)]
    )
    assert.equal(totals["acct_1"].units, 5)
    assert.equal(totals["acct_1"].eventCount, 1)
  })

  await record("distinct events across shards all count", () => {
    const totals = rollupUsage(
      [makeEvent("evt_1", "acct_1", 3)],
      [makeEvent("evt_2", "acct_1", 4)]
    )
    assert.equal(totals["acct_1"].units, 7)
    assert.equal(totals["acct_1"].eventCount, 2)
  })
}

module.exports = { runTests }
`,
        description: "Visible usage rollup regression tests",
      },
      {
        path: "tests/usage-rollup.hidden.test.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: `const assert = require("node:assert/strict")
const { makeEvent } = require("../src/usage-store")
const { rollupUsage } = require("../src/rollup")

async function runTests(record) {
  await record("a duplicate within a single shard counts once", () => {
    const totals = rollupUsage(
      [makeEvent("evt_1", "acct_1", 6), makeEvent("evt_1", "acct_1", 6)],
      []
    )
    assert.equal(totals["acct_1"].eventCount, 1)
    assert.equal(totals["acct_1"].units, 6)
  })

  await record("cross-shard dup mixed with distinct rolls up correctly", () => {
    const primary = [
      makeEvent("evt_1", "acct_1", 2),
      makeEvent("evt_2", "acct_1", 3),
      makeEvent("evt_4", "acct_2", 7),
    ]
    const backup = [
      makeEvent("evt_2", "acct_1", 3),
      makeEvent("evt_3", "acct_1", 4),
    ]
    const totals = rollupUsage(primary, backup)
    assert.equal(totals["acct_1"].units, 9)
    assert.equal(totals["acct_1"].eventCount, 3)
    assert.equal(totals["acct_2"].units, 7)
    assert.equal(totals["acct_2"].eventCount, 1)
  })
}

module.exports = { runTests }
`,
        description: "Hidden cross-shard rollup regression tests",
      },
      {
        path: "tests/run-workspace-tests.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: `const suites = [
  ["visible usage rollup", require("./usage-rollup.test")],
  ["hidden usage rollup", require("./usage-rollup.hidden.test")],
]
const results = []
async function record(suite, name, fn) {
  try { await fn(); results.push({ suite, name, passed: true, error: null, isHidden: suite.toLowerCase().includes("hidden") }) }
  catch (error) { results.push({ suite, name, passed: false, error: error.message, isHidden: suite.toLowerCase().includes("hidden") }) }
}
;(async () => {
  for (const [suite, mod] of suites) await mod.runTests((name, fn) => record(suite, name, fn))
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
})().catch((error) => {
  results.push({ suite: "runner", name: "execute workspace tests", passed: false, error: error.message })
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
  process.exitCode = 1
})
`,
        description: "Hidden workspace runner",
      },
    ],
    referenceFiles: [
      {
        path: "src/rollup.js",
        role: "editable",
        language: "javascript",
        content: reference,
      },
    ],
  },
}

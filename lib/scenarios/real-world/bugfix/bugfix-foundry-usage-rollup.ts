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

function addEvents(totals, events) {
  for (const event of events) {
    const accountId = normalizeAccountId(event.accountId)
    if (!totals[accountId]) {
      totals[accountId] = { computeSeconds: 0, eventCount: 0 }
    }
    totals[accountId].computeSeconds += event.computeSeconds || 0
    totals[accountId].eventCount += 1
  }
}

function rollupUsage(primaryEvents, backupEvents) {
  const totals = {}
  addEvents(totals, dedupe(primaryEvents))
  addEvents(totals, dedupe(backupEvents))
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

function addEvents(totals, events) {
  for (const event of events) {
    const accountId = normalizeAccountId(event.accountId)
    if (!totals[accountId]) {
      totals[accountId] = { computeSeconds: 0, eventCount: 0 }
    }
    totals[accountId].computeSeconds += event.computeSeconds || 0
    totals[accountId].eventCount += 1
  }
}

function rollupUsage(primaryEvents, backupEvents) {
  const totals = {}
  addEvents(totals, dedupe([...primaryEvents, ...backupEvents]))
  return totals
}

module.exports = { rollupUsage, normalizeAccountId, dedupe }
`

const usageStore = `function makeUsageEvent(id, accountId, computeSeconds) {
  return { id, accountId, computeSeconds }
}

module.exports = { makeUsageEvent }
`

const visibleTests = `const assert = require("node:assert/strict")
const { makeUsageEvent } = require("../src/usage-store")
const { rollupUsage } = require("../src/rollup")

async function runTests(record) {
  await record("a usage event on both builds is metered once", () => {
    const totals = rollupUsage(
      [makeUsageEvent("evt_1", "acct_1", 5)],
      [makeUsageEvent("evt_1", "acct_1", 5)]
    )
    assert.equal(totals["acct_1"].computeSeconds, 5)
    assert.equal(totals["acct_1"].eventCount, 1)
  })

  await record("distinct usage events across builds all count", () => {
    const totals = rollupUsage(
      [makeUsageEvent("evt_1", "acct_1", 3)],
      [makeUsageEvent("evt_2", "acct_1", 4)]
    )
    assert.equal(totals["acct_1"].computeSeconds, 7)
    assert.equal(totals["acct_1"].eventCount, 2)
  })
}

module.exports = { runTests }
`

const hiddenTests = `const assert = require("node:assert/strict")
const { makeUsageEvent } = require("../src/usage-store")
const { rollupUsage } = require("../src/rollup")

async function runTests(record) {
  await record("a repeat within a single build is metered once", () => {
    const totals = rollupUsage(
      [makeUsageEvent("evt_1", "acct_1", 6), makeUsageEvent("evt_1", "acct_1", 6)],
      []
    )
    assert.equal(totals["acct_1"].eventCount, 1)
    assert.equal(totals["acct_1"].computeSeconds, 6)
  })

  await record("a cross-build duplicate mixed with distinct events rolls up correctly", () => {
    const primary = [
      makeUsageEvent("evt_1", "acct_1", 2),
      makeUsageEvent("evt_2", "acct_1", 3),
      makeUsageEvent("evt_4", "acct_2", 7),
    ]
    const backup = [
      makeUsageEvent("evt_2", "acct_1", 3),
      makeUsageEvent("evt_3", "acct_1", 4),
    ]
    const totals = rollupUsage(primary, backup)
    assert.equal(totals["acct_1"].computeSeconds, 9)
    assert.equal(totals["acct_1"].eventCount, 3)
    assert.equal(totals["acct_2"].computeSeconds, 7)
    assert.equal(totals["acct_2"].eventCount, 1)
  })

  await record("the primary build wins when a cross-build duplicate disagrees on compute-seconds", () => {
    const totals = rollupUsage(
      [makeUsageEvent("evt_9", "acct_1", 5)],
      [makeUsageEvent("evt_9", "acct_1", 8)]
    )
    assert.equal(totals["acct_1"].computeSeconds, 5)
    assert.equal(totals["acct_1"].eventCount, 1)
  })

  await record("account ids are normalized across casing and whitespace", () => {
    const primary = [
      makeUsageEvent("evt_a", "ACCT_7", 4),
      makeUsageEvent("evt_b", " acct_7 ", 6),
    ]
    const backup = [makeUsageEvent("evt_c", "Acct_7", 2)]
    const totals = rollupUsage(primary, backup)
    assert.equal(totals["acct_7"].computeSeconds, 12)
    assert.equal(totals["acct_7"].eventCount, 3)
  })

  await record("an event missing compute-seconds contributes zero", () => {
    const totals = rollupUsage(
      [makeUsageEvent("evt_x", "acct_1"), makeUsageEvent("evt_y", "acct_1", 5)],
      []
    )
    assert.equal(totals["acct_1"].computeSeconds, 5)
    assert.equal(totals["acct_1"].eventCount, 2)
  })
}

module.exports = { runTests }
`

const runner = `const suites = [
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
  results.push({ suite: "runner", name: "execute workspace tests", passed: false, error: error.message, isHidden: true })
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
  process.exitCode = 1
})
`

export const bugfixFoundryUsageRollupScenario: BugFixScenario = {
  id: "bugfix-foundry-usage-rollup",
  title: "Compute-Usage Rollup Overbills a Replayed Build",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Palantir"],
  description:
    "A metered compute-usage rollup overbills several accounts for compute-seconds after a backfill replayed a transform's backup build into the pipeline.",
  task: "Meter each distinct event id once per account, even when the same id arrives on both the primary and the backup stream.",
  // Grounded in the scenario's own first visible test: evt_1 at 5s on both
  // streams. The starter dedupes each stream in isolation and then sums, so it
  // reports 10s / 2 events where the test expects 5s / 1.
  symptom: {
    subject: "acct_1",
    tag: "both builds",
    expected: "5s",
    actual: "10s",
    delta: "+5s",
    caveat: "Accounts whose events landed on only one build are billed correctly.",
  },
  userReport:
    "Metering analyst here. Several accounts were billed for more compute-seconds than their transforms actually used. It started right after last week's backfill replayed the backup build into the usage rollup. The single-build numbers look right; it's the accounts whose events showed up on both builds that are inflated.",
  tags: ["backend", "data-pipeline", "metering", "foundry", "real-codebase"],
  estimatedTime: 40,
  problemStatement: `A compute-usage rollup meters how many compute-seconds each account's transform builds consumed. Usage events are emitted by transform builds and arrive on two streams: a primary metering stream and a backup stream. Ingestion is at-least-once, and the same event id can be emitted on both streams, so the two overlap.

**Incident Report**
After a backfill replayed the backup build, several accounts were billed for more compute-seconds than they used. Accounts whose events landed on only one stream are fine; the inflated ones are those whose events appeared on both.

Read the codebase files, run the tests, and make the smallest fix so each distinct event id is metered once per account. Keep the public function signatures.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "src/usage-store.js",
        content: usageStore,
        description: "Read-only helper for building usage event records",
      },
      {
        fileName: "tests/usage-rollup.test.js",
        content: visibleTests,
        description: "Visible cross-build rollup tests",
      },
    ],
  },
  expectedBehavior:
    "Each distinct event id contributes to an account's compute-seconds and eventCount exactly once, whether it is emitted by the primary stream, the backup stream, or both. When a duplicate disagrees on compute-seconds, the primary stream's value is authoritative.",
  bugDescription:
    "Duplicates are collapsed within each stream separately and the per-stream totals are then summed, so an event id emitted by both the primary and backup build is metered twice.",
  groundTruth:
    "Root cause: rollupUsage dedupes each stream in isolation and then adds both, so a cross-stream duplicate survives once per stream and is metered twice. Fix: dedupe across the merged streams before accumulating, so an event id seen on both is counted once. Because the merge lists the primary stream first and dedupe keeps the first occurrence, the primary stream's compute-seconds is authoritative for a disagreeing duplicate. Survival story: per-stream dedup looks correct and handles same-stream at-least-once repeats, which is nearly all of the traffic; only a cross-stream duplicate, which the backup-build replay suddenly made common, slips through. Red herrings, all reachable and provably innocent: (1) normalizeAccountId lower-cases and trims, so mixed casing and whitespace collapse to one account and are not the bug; (2) an event missing compute-seconds contributes zero via the || 0 guard and is tolerated; (3) same-stream repeats are already collapsed by dedupe within a stream.",
  hints: [
    "The single-stream totals are right and the both-streams accounts are inflated. Reproduce one event id that arrives on both streams and count how many times it lands in the total.",
    "Each stream is cleaned up on its own before the totals are built. Follow a duplicate that spans the two streams and see whether that cleanup ever gets a chance to notice it.",
  ],
  testCases: [
    {
      input: { primary: ["evt_1"], backup: ["evt_1"] },
      expected: "each distinct event metered once per account",
      description: "Workspace tests cover cross-build duplicates, casing, and missing values",
    },
  ],
  expectedTouchedFiles: ["src/rollup.js"],
  observedSymptoms: [
    "Accounts whose events appeared on both the primary and backup build are billed for extra compute-seconds; single-build accounts are correct.",
    "Same-build repeats, mixed account-id casing, and events missing compute-seconds are all handled correctly.",
  ],
  reproductionSteps: [
    "Read README.md for the metering contract and how the two streams overlap.",
    "Inspect tests/usage-rollup.test.js to see the cross-build duplicate case that overbills.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "A distinct event id is metered once per account across both streams.",
    "Same-stream repeats, casing, and missing compute-seconds behave exactly as before.",
    "A disagreeing cross-stream duplicate takes the primary stream's compute-seconds.",
    "Only src/rollup.js changes.",
  ],
  debuggingSkills: [
    "reproduction",
    "reading the ingestion contract",
    "hypothesis",
    "minimal patch",
    "verification",
  ],
  rootCauseRubric: [
    "Identifies that dedup runs per stream, so a cross-stream duplicate survives once per stream.",
    "Connects the overbilled accounts to duplicates that span the two streams, not to same-stream repeats.",
    "Rules out account-id normalization and the missing-value guard as innocent with evidence.",
    "Names a regression guard such as a cross-stream duplicate test alongside the same-stream repeat test.",
  ],
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
        content: `# Compute-Usage Rollup

The metering pipeline rolls compute-usage events from transform builds into per-account totals (compute-seconds and event count) for billing.

## Ingestion contract

- Usage events arrive on two streams: a primary metering stream and a backup stream. Delivery is at-least-once, so an event id may repeat within a stream and may also appear on both streams.
- Each event has an id, an accountId, and a computeSeconds value. Account ids may arrive with mixed casing or surrounding whitespace and are normalized before rollup.
- Each distinct event id must be metered exactly once per account.
- If a cross-stream duplicate disagrees on computeSeconds, the primary stream's value is authoritative.
- An event that arrives without a computeSeconds value contributes zero seconds but still counts as an event.`,
        description: "Product and ingestion-contract notes",
      },
      {
        path: "src/usage-store.js",
        role: "readonly",
        language: "javascript",
        content: usageStore,
        description: "Read-only helper for building usage event records in tests",
      },
      {
        path: "src/rollup.js",
        role: "editable",
        language: "javascript",
        content: starter,
        description: "Per-account compute-usage rollup logic",
      },
      {
        path: "tests/usage-rollup.test.js",
        role: "test",
        language: "javascript",
        content: visibleTests,
        description: "Visible usage rollup regression tests",
      },
      {
        path: "tests/usage-rollup.hidden.test.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: hiddenTests,
        description: "Hidden cross-build, casing, and missing-value tests",
      },
      {
        path: "tests/run-workspace-tests.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: runner,
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

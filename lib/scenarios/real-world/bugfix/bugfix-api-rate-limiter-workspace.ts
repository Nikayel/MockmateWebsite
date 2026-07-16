import type { BugFixScenario } from "../../types"

const starter = `function allowRequest(store, clientId, now, limit, windowMs) {
  const key = "rl:" + clientId
  store.removeBefore(key, now - windowMs)
  if (store.count(key) >= limit) {
    return false
  }
  store.add(key, now)
  return true
}

function simulateBurst(store, clientId, count, now, limit, windowMs) {
  const key = "rl:" + clientId
  store.removeBefore(key, now - windowMs)

  // Batch the burst into a single commit pass to avoid a store write per request.
  const pending = []
  for (let i = 0; i < count; i++) {
    if (store.count(key) < limit) {
      pending.push(now)
    }
  }
  for (const timestamp of pending) {
    store.add(key, timestamp)
  }
  return pending.length
}

module.exports = { allowRequest, simulateBurst }
`

const reference = `function allowRequest(store, clientId, now, limit, windowMs) {
  const key = "rl:" + clientId
  store.removeBefore(key, now - windowMs)
  if (store.count(key) >= limit) {
    return false
  }
  store.add(key, now)
  return true
}

function simulateBurst(store, clientId, count, now, limit, windowMs) {
  let allowed = 0
  for (let i = 0; i < count; i++) {
    if (allowRequest(store, clientId, now, limit, windowMs)) {
      allowed += 1
    }
  }
  return allowed
}

module.exports = { allowRequest, simulateBurst }
`

const windowStore = `class WindowStore {
  constructor() {
    this.records = new Map()
  }
  add(key, timestamp) {
    const existing = this.records.get(key) || []
    existing.push(timestamp)
    this.records.set(key, existing)
  }
  count(key) {
    return (this.records.get(key) || []).length
  }
  removeBefore(key, minTimestamp) {
    const existing = this.records.get(key) || []
    this.records.set(key, existing.filter((timestamp) => timestamp >= minTimestamp))
  }
}

module.exports = { WindowStore }
`

const visibleTests = `const assert = require("node:assert/strict")
const { WindowStore } = require("../src/window-store")
const { allowRequest, simulateBurst } = require("../src/rate-limiter")

async function runTests(record) {
  await record("single requests respect the limit", () => {
    const store = new WindowStore()
    assert.equal(allowRequest(store, "client", 1000, 2, 60000), true)
    assert.equal(allowRequest(store, "client", 1001, 2, 60000), true)
    assert.equal(allowRequest(store, "client", 1002, 2, 60000), false)
  })

  await record("a burst is capped at the plan limit", () => {
    const store = new WindowStore()
    assert.equal(simulateBurst(store, "client", 10, 1000, 5, 60000), 5)
  })
}

module.exports = { runTests }
`

const hiddenTests = `const assert = require("node:assert/strict")
const { WindowStore } = require("../src/window-store")
const { allowRequest, simulateBurst } = require("../src/rate-limiter")

async function runTests(record) {
  await record("existing in-window usage reduces burst capacity", () => {
    const store = new WindowStore()
    store.add("rl:client", 50000)
    store.add("rl:client", 60000)
    assert.equal(simulateBurst(store, "client", 10, 100000, 5, 60000), 3)
  })

  await record("expired usage is purged before a burst", () => {
    const store = new WindowStore()
    store.add("rl:client", 1000)
    store.add("rl:client", 2000)
    store.add("rl:client", 3000)
    store.add("rl:client", 50000)
    assert.equal(simulateBurst(store, "client", 10, 100000, 5, 60000), 4)
  })

  await record("an expired single request drops out of the window", () => {
    const store = new WindowStore()
    store.add("rl:client", 1000)
    // 1000 is older than the 60000ms window at now=100000, so the slot is free
    assert.equal(allowRequest(store, "client", 100000, 1, 60000), true)
  })

  await record("a request exactly at the window boundary still counts", () => {
    const store = new WindowStore()
    store.add("rl:client", 40000)
    // 40000 == now - windowMs; the window is inclusive of its start, so this still occupies the slot
    assert.equal(allowRequest(store, "client", 100000, 1, 60000), false)
  })

  await record("same-timestamp requests each consume capacity", () => {
    const store = new WindowStore()
    assert.equal(allowRequest(store, "client", 1000, 2, 60000), true)
    assert.equal(allowRequest(store, "client", 1000, 2, 60000), true)
    assert.equal(allowRequest(store, "client", 1000, 2, 60000), false)
  })
}

module.exports = { runTests }
`

const runner = `const suites = [["visible rate limiter", require("./rate-limiter.test")], ["hidden rate limiter", require("./rate-limiter.hidden.test")]]
const results = []
async function record(suite, name, fn) { try { await fn(); results.push({ suite, name, passed: true, error: null, isHidden: suite.toLowerCase().includes("hidden") }) } catch (error) { results.push({ suite, name, passed: false, error: error.message, isHidden: suite.toLowerCase().includes("hidden") }) } }
;(async () => { for (const [suite, mod] of suites) await mod.runTests((name, fn) => record(suite, name, fn)); console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results)) })().catch((error) => { results.push({ suite: "runner", name: "execute workspace tests", passed: false, error: error.message, isHidden: true }); console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results)); process.exitCode = 1 })
`

export const bugfixApiRateLimiterWorkspaceScenario: BugFixScenario = {
  id: "bugfix-api-rate-limiter-workspace",
  title: "Rate Limiter: Bursts Slip Past the Plan Limit",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "hard",
  companies: ["Generic"],
  description:
    "The API gateway lets a traffic spike reserve more requests than a customer's plan allows, and two accounts blew past their quota during this week's spikes.",
  task: "Cap a burst at the client's remaining capacity in the rolling window, so requests arriving all at once can never reserve more than the plan limit allows.",
  // Grounded in the scenario's own second visible test, "a burst is capped at
  // the plan limit": 10 requests at now=1000 against limit 5 on an empty store.
  // The test expects 5; the starter's burst path returns 10.
  symptom: {
    subject: "client",
    tag: "burst of 10, limit 5",
    expected: "5 allowed",
    actual: "10 allowed",
    delta: "+5",
    caveat: "The same requests sent one at a time are still capped at the limit.",
  },
  userReport:
    "Customer success here. Two accounts went over their plan's per-minute API quota during traffic spikes this week. The limiter caps requests fine when they trickle in one at a time, but when an account fires a burst all at once, more of them get through than the plan should allow. Billing is now disputing the overage.",
  tags: ["backend", "rate-limiting", "concurrency", "api-infrastructure", "real-codebase"],
  estimatedTime: 50,
  problemStatement: `The API gateway caps how many requests a customer plan may reserve within a rolling window. The store is a small in-memory stand-in for a Redis sorted set, keyed per client, holding request timestamps.

**Incident Report**
Requests that trickle in one at a time are capped correctly, but a burst fired all at once reserves more than the plan allows, so two accounts exceeded their per-minute quota during spikes. Billing is disputing the overage.

Read the codebase files, run the tests, and make the smallest fix so a burst cannot reserve past the limit. Keep the public function signatures.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "src/window-store.js",
        content: windowStore,
        description: "Read-only in-memory sorted-window store",
      },
      {
        fileName: "tests/rate-limiter.test.js",
        content: visibleTests,
        description: "Visible burst tests",
      },
    ],
  },
  expectedBehavior:
    "No more than limit requests may be reserved within a window for a client, whether they arrive one at a time or as a burst. Timestamps older than the window are dropped; a timestamp exactly at the window start still counts.",
  bugDescription:
    "simulateBurst decides every request in the burst against the stored usage count and only commits the reservations afterward, so the count it reads never reflects the reservations it is about to grant, and the whole burst is admitted regardless of the limit.",
  groundTruth:
    "Root cause: simulateBurst reads store.count(key) once per request while deciding, but defers all store.add writes to a commit pass afterward, so every decision sees the same pre-burst count and the burst is admitted in full. allowRequest is correct because it reserves as it decides. Fix: reserve capacity as each request is granted (e.g. route the burst through allowRequest, or add inside the decision loop). Survival story: the deferred-commit shape reads like a deliberate batch optimization to avoid one store write per request, so a reviewer approves it without noticing the count never advances during the decision loop. Red herrings, all reachable and provably innocent: (1) removeBefore uses `timestamp >= minTimestamp`, which invites off-by-one suspicion, but the window is defined inclusive of its start, so a timestamp exactly at now - windowMs correctly still counts; (2) expired timestamps sit in the store until removeBefore purges them, which it does at the top of both paths; (3) the store keeps multiple entries at the same timestamp on purpose, since two requests in the same millisecond are two requests.",
  hints: [
    "Reproduce the burst test: 10 requests against a limit of 5. Compare what the burst grants to what a request-at-a-time path grants for the same store and inputs.",
    "The single-request path and the burst path disagree for the same inputs. Look at how each one updates stored usage as it grants requests, not just how it reads it.",
  ],
  testCases: [
    {
      input: { count: 10, limit: 5 },
      expected: 5,
      description: "Workspace tests cover burst limit enforcement against a rolling window",
    },
  ],
  expectedTouchedFiles: ["src/rate-limiter.js"],
  observedSymptoms: [
    "A burst of 10 against a limit of 5 reserves all 10, while the same requests sent one at a time correctly stop at 5.",
    "Single requests, window expiry, the boundary timestamp, and same-millisecond requests all behave correctly.",
  ],
  reproductionSteps: [
    "Read README.md for the window contract and the store's behavior.",
    "Inspect tests/rate-limiter.test.js to see the burst case that over-admits.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "A burst reserves no more than the remaining capacity in the window.",
    "The single-request path and window expiry behave exactly as before.",
    "The boundary timestamp and same-millisecond requests still count correctly.",
    "Only src/rate-limiter.js changes.",
  ],
  debuggingSkills: [
    "reproduction",
    "read-versus-write ordering",
    "hypothesis",
    "minimal patch",
    "verification",
  ],
  rootCauseRubric: [
    "Identifies that the burst path reads usage while deciding but defers the reservations, so the count never advances.",
    "Connects the over-admission to reservations that are granted but not yet reflected in the count.",
    "Rules out the >= window boundary, expiry, and same-timestamp entries as innocent with evidence.",
    "Names a regression guard such as a burst test seeded with existing in-window usage.",
  ],
  workspace: {
    language: "javascript",
    primaryFilePath: "src/rate-limiter.js",
    editableFilePaths: ["src/rate-limiter.js"],
    visibleTestPaths: ["tests/rate-limiter.test.js"],
    hiddenTestPaths: ["tests/rate-limiter.hidden.test.js"],
    testRunnerPath: "tests/run-workspace-tests.js",
    files: [
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content: `# Per-Client Rate Limiter

The API gateway limits how many requests a client may reserve within a rolling window. Production uses a Redis sorted set; this exercise keeps the same store in memory, holding one timestamp per reserved request under a per-client key.

## Window contract

- A client may hold at most limit reserved timestamps within the window [now - windowMs, now].
- The window is inclusive of its start: a timestamp exactly at now - windowMs still counts.
- Timestamps older than now - windowMs are expired and are purged before a decision is made.
- The store keeps multiple entries at the same timestamp; two requests in the same millisecond are two requests.
- allowRequest reserves a single request. simulateBurst reserves a burst of requests arriving together. Both must respect the same limit.`,
        description: "Product and window-contract notes",
      },
      {
        path: "src/window-store.js",
        role: "readonly",
        language: "javascript",
        content: windowStore,
        description: "In-memory sorted-window store",
      },
      {
        path: "src/rate-limiter.js",
        role: "editable",
        language: "javascript",
        content: starter,
        description: "Rate limiter decision and reservation logic",
      },
      {
        path: "tests/rate-limiter.test.js",
        role: "test",
        language: "javascript",
        content: visibleTests,
        description: "Visible rate limit tests",
      },
      {
        path: "tests/rate-limiter.hidden.test.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: hiddenTests,
        description: "Hidden usage, expiry, and boundary tests",
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
        path: "src/rate-limiter.js",
        role: "editable",
        language: "javascript",
        content: reference,
      },
    ],
  },
}

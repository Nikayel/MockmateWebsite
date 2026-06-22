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
  const decisions = []
  for (let i = 0; i < count; i++) {
    decisions.push(store.count(key) < limit)
  }
  for (const decision of decisions) {
    if (decision) store.add(key, now)
  }
  return decisions.filter(Boolean).length
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

export const bugfixApiRateLimiterWorkspaceScenario: BugFixScenario = {
  id: "bugfix-api-rate-limiter-workspace",
  title: "API Rate Limiter Burst Oversubscription",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "hard",
  companies: ["Cloudflare", "Stripe", "Amazon", "Meta"],
  description: "Fix a rate limiter that allows concurrent bursts past plan limits",
  tags: ["backend", "rate-limiting", "concurrency", "api-infrastructure", "real-codebase"],
  estimatedTime: 50,
  problemStatement: `The API gateway sometimes allows more requests than a customer plan permits during traffic spikes. The store is a small in-memory stand-in for Redis sorted sets, and the visible tests reproduce the same burst behavior support is seeing in production.

Fix the limiter workflow so burst simulations cannot exceed the limit.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "src/window-store.js",
        content: "Tiny Redis sorted-set style store.",
        description: "Storage dependency",
      },
      {
        fileName: "tests/rate-limiter.test.js",
        content: "Visible burst tests.",
        description: "Regression tests",
      },
    ],
  },
  expectedBehavior:
    "No more than limit requests should be reserved within a window, including burst simulations.",
  bugDescription:
    "simulateBurst checks capacity for every request before recording any reservation, so every concurrent worker sees stale capacity.",
  hints: [
    "Look for check-then-write behavior.",
    "The per-request helper already has the safer shape.",
    "Make the burst path reserve capacity as it decides.",
  ],
  testCases: [
    {
      input: { count: 10, limit: 5 },
      expected: 5,
      description: "Workspace tests cover burst limit enforcement",
    },
  ],
  expectedTouchedFiles: ["src/rate-limiter.js"],
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
        content:
          "The production service uses Redis sorted sets. This exercise keeps the store in memory but expects the same atomic reservation behavior.",
      },
      {
        path: "src/window-store.js",
        role: "readonly",
        language: "javascript",
        content: `class WindowStore {
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
`,
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
        content: `const assert = require("node:assert/strict")
const { WindowStore } = require("../src/window-store")
const { allowRequest, simulateBurst } = require("../src/rate-limiter")

async function runTests(record) {
  await record("single requests respect the limit", () => {
    const store = new WindowStore()
    assert.equal(allowRequest(store, "client", 1000, 2, 60000), true)
    assert.equal(allowRequest(store, "client", 1001, 2, 60000), true)
    assert.equal(allowRequest(store, "client", 1002, 2, 60000), false)
  })
  await record("burst is capped at plan limit", () => {
    const store = new WindowStore()
    assert.equal(simulateBurst(store, "client", 10, 1000, 5, 60000), 5)
  })
}

module.exports = { runTests }
`,
        description: "Visible rate limit tests",
      },
      {
        path: "tests/rate-limiter.hidden.test.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: `const assert = require("node:assert/strict")
const { WindowStore } = require("../src/window-store")
const { simulateBurst } = require("../src/rate-limiter")

async function runTests(record) {
  await record("existing usage reduces burst capacity", () => {
    const store = new WindowStore()
    store.add("rl:client", 1000)
    store.add("rl:client", 1001)
    assert.equal(simulateBurst(store, "client", 10, 1002, 5, 60000), 3)
  })
}

module.exports = { runTests }
`,
        description: "Hidden test for existing usage",
      },
      {
        path: "tests/run-workspace-tests.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: `const suites = [["visible rate limiter", require("./rate-limiter.test")], ["hidden rate limiter", require("./rate-limiter.hidden.test")]]
const results = []
async function record(suite, name, fn) { try { await fn(); results.push({ suite, name, passed: true, error: null, isHidden: suite.toLowerCase().includes("hidden") }) } catch (error) { results.push({ suite, name, passed: false, error: error.message, isHidden: suite.toLowerCase().includes("hidden") }) } }
;(async () => { for (const [suite, mod] of suites) await mod.runTests((name, fn) => record(suite, name, fn)); console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results)) })().catch((error) => { results.push({ suite: "runner", name: "execute workspace tests", passed: false, error: error.message }); console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results)); process.exitCode = 1 })
`,
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

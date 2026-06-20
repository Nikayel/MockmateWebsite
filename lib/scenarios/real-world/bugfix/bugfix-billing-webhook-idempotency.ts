import type { BugFixScenario } from "../../types"

const starter = `const PLAN_RANK = { free: 0, pro: 1, team: 2 }

function applySubscriptionEvent(account, event) {
  account.plan = event.plan
  account.status = event.status
  account.monthlyCredits += event.creditGrant || 0
  account.lastEventCreated = event.created
  return account
}

module.exports = { PLAN_RANK, applySubscriptionEvent }
`

const reference = `const PLAN_RANK = { free: 0, pro: 1, team: 2 }

function applySubscriptionEvent(account, event) {
  account.processedEventIds ||= new Set()
  if (account.processedEventIds.has(event.id)) return account
  account.processedEventIds.add(event.id)

  if (typeof account.lastEventCreated === "number" && event.created < account.lastEventCreated) {
    return account
  }

  account.plan = event.plan
  account.status = event.status
  account.monthlyCredits += event.creditGrant || 0
  account.lastEventCreated = event.created
  return account
}

module.exports = { PLAN_RANK, applySubscriptionEvent }
`

export const bugfixBillingWebhookIdempotencyScenario: BugFixScenario = {
  id: "bugfix-billing-webhook-idempotency",
  title: "Billing Webhook Idempotency Regression",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "hard",
  companies: ["Stripe", "Shopify", "Square", "Amazon"],
  description: "Fix duplicate and out-of-order subscription webhook handling",
  tags: ["backend", "billing", "webhooks", "idempotency", "real-codebase"],
  estimatedTime: 55,
  problemStatement: `Paid users occasionally receive duplicate monthly credits or get downgraded after a delayed webhook arrives. The billing worker processes subscription events from a payment provider, but delivery is at-least-once and not guaranteed to be ordered.

Fix the entitlement update path so duplicate events are idempotent and older events cannot overwrite newer account state.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "src/account-store.js",
        content: "In-memory account repository used by the webhook worker tests.",
        description: "Repository context",
      },
      {
        fileName: "tests/billing-webhooks.test.js",
        content: "Visible tests cover duplicate credits and delayed downgrade events.",
        description: "Regression tests",
      },
    ],
  },
  expectedBehavior:
    "Each provider event should mutate an account at most once, and stale events should not overwrite newer subscription state.",
  bugDescription:
    "The worker applies every webhook blindly, so retries double-grant credits and old events can overwrite newer plan/status values.",
  hints: [
    "Payment webhooks are at-least-once delivery.",
    "The account object can persist processed event IDs.",
    "Compare event.created against the last event that changed subscription state.",
  ],
  testCases: [
    {
      input: { accountId: "acct_1" },
      expected: "idempotent ordered state",
      description: "Workspace tests cover duplicate and stale webhook events",
    },
  ],
  expectedTouchedFiles: ["src/entitlements.js"],
  workspace: {
    language: "javascript",
    primaryFilePath: "src/entitlements.js",
    editableFilePaths: ["src/entitlements.js"],
    visibleTestPaths: ["tests/billing-webhooks.test.js"],
    hiddenTestPaths: ["tests/billing-webhooks.hidden.test.js"],
    testRunnerPath: "tests/run-workspace-tests.js",
    files: [
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content:
          "Billing events are delivered at least once. Entitlement updates must be idempotent and stale-safe.",
      },
      {
        path: "src/account-store.js",
        role: "readonly",
        language: "javascript",
        content: `function createAccount(overrides = {}) {
  return {
    id: "acct_1",
    plan: "free",
    status: "inactive",
    monthlyCredits: 0,
    lastEventCreated: 0,
    processedEventIds: new Set(),
    ...overrides,
  }
}

module.exports = { createAccount }
`,
        description: "Small repository fixture used by webhook tests",
      },
      {
        path: "src/entitlements.js",
        role: "editable",
        language: "javascript",
        content: starter,
        description: "Subscription entitlement mutation logic",
      },
      {
        path: "tests/billing-webhooks.test.js",
        role: "test",
        language: "javascript",
        content: `const assert = require("node:assert/strict")
const { createAccount } = require("../src/account-store")
const { applySubscriptionEvent } = require("../src/entitlements")

async function runTests(record) {
  await record("duplicate event grants credits once", () => {
    const account = createAccount()
    const event = { id: "evt_1", created: 10, plan: "pro", status: "active", creditGrant: 100 }
    applySubscriptionEvent(account, event)
    applySubscriptionEvent(account, event)
    assert.equal(account.plan, "pro")
    assert.equal(account.monthlyCredits, 100)
  })

  await record("delayed old event does not downgrade newer state", () => {
    const account = createAccount()
    applySubscriptionEvent(account, { id: "evt_new", created: 20, plan: "team", status: "active", creditGrant: 300 })
    applySubscriptionEvent(account, { id: "evt_old", created: 15, plan: "free", status: "inactive", creditGrant: 0 })
    assert.equal(account.plan, "team")
    assert.equal(account.status, "active")
  })
}

module.exports = { runTests }
`,
        description: "Visible billing regression tests",
      },
      {
        path: "tests/billing-webhooks.hidden.test.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: `const assert = require("node:assert/strict")
const { createAccount } = require("../src/account-store")
const { applySubscriptionEvent } = require("../src/entitlements")

async function runTests(record) {
  await record("stale duplicate is marked processed without changing current state", () => {
    const account = createAccount({ plan: "pro", status: "active", monthlyCredits: 100, lastEventCreated: 50 })
    applySubscriptionEvent(account, { id: "evt_stale", created: 40, plan: "free", status: "inactive", creditGrant: 100 })
    applySubscriptionEvent(account, { id: "evt_stale", created: 40, plan: "free", status: "inactive", creditGrant: 100 })
    assert.equal(account.plan, "pro")
    assert.equal(account.monthlyCredits, 100)
  })
}

module.exports = { runTests }
`,
        description: "Hidden stale retry regression test",
      },
      {
        path: "tests/run-workspace-tests.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: `const suites = [
  ["visible billing webhooks", require("./billing-webhooks.test")],
  ["hidden billing webhooks", require("./billing-webhooks.hidden.test")],
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
        path: "src/entitlements.js",
        role: "editable",
        language: "javascript",
        content: reference,
      },
    ],
  },
}

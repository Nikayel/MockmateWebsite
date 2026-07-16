import type { BugFixScenario } from "../../types"

const starter = `const PLAN_RANK = { free: 0, pro: 1, team: 2 }
const SUBSCRIPTION_EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
])

function applySubscriptionEvent(account, event) {
  if (!SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
    return account
  }
  if (event.accountId !== account.id) {
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

const reference = `const PLAN_RANK = { free: 0, pro: 1, team: 2 }
const SUBSCRIPTION_EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
])

function applySubscriptionEvent(account, event) {
  if (!SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
    return account
  }
  if (event.accountId !== account.id) {
    return account
  }

  account.processedEventIds ||= new Set()
  if (account.processedEventIds.has(event.id)) {
    return account
  }
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

const accountStore = `function createAccount(overrides = {}) {
  return {
    id: "acct_1",
    plan: "free",
    status: "inactive",
    monthlyCredits: 0,
    ...overrides,
  }
}

module.exports = { createAccount }
`

const visibleTests = `const assert = require("node:assert/strict")
const { createAccount } = require("../src/account-store")
const { applySubscriptionEvent } = require("../src/entitlements")

async function runTests(record) {
  await record("a duplicate event grants credits once", () => {
    const account = createAccount()
    const event = { id: "evt_1", type: "customer.subscription.updated", accountId: "acct_1", created: 10, plan: "pro", status: "active", creditGrant: 100 }
    applySubscriptionEvent(account, event)
    applySubscriptionEvent(account, event)
    assert.equal(account.plan, "pro")
    assert.equal(account.monthlyCredits, 100)
  })

  await record("a delayed older event does not downgrade newer state", () => {
    const account = createAccount()
    applySubscriptionEvent(account, { id: "evt_new", type: "customer.subscription.updated", accountId: "acct_1", created: 20, plan: "team", status: "active", creditGrant: 300 })
    applySubscriptionEvent(account, { id: "evt_old", type: "customer.subscription.updated", accountId: "acct_1", created: 15, plan: "free", status: "inactive", creditGrant: 0 })
    assert.equal(account.plan, "team")
    assert.equal(account.status, "active")
  })
}

module.exports = { runTests }
`

const hiddenTests = `const assert = require("node:assert/strict")
const { createAccount } = require("../src/account-store")
const { applySubscriptionEvent } = require("../src/entitlements")

async function runTests(record) {
  await record("a stale duplicate is recorded without changing current state", () => {
    const account = createAccount({ plan: "pro", status: "active", monthlyCredits: 100, lastEventCreated: 50 })
    const stale = { id: "evt_stale", type: "customer.subscription.updated", accountId: "acct_1", created: 40, plan: "free", status: "inactive", creditGrant: 100 }
    applySubscriptionEvent(account, stale)
    applySubscriptionEvent(account, stale)
    assert.equal(account.plan, "pro")
    assert.equal(account.status, "active")
    assert.equal(account.monthlyCredits, 100)
  })

  await record("an unrelated event type is ignored", () => {
    const account = createAccount({ plan: "pro", status: "active", monthlyCredits: 100, lastEventCreated: 30 })
    applySubscriptionEvent(account, { id: "evt_inv", type: "invoice.payment_succeeded", accountId: "acct_1", created: 40, plan: "free", status: "inactive", creditGrant: 500 })
    assert.equal(account.plan, "pro")
    assert.equal(account.monthlyCredits, 100)
  })

  await record("an event for another account is ignored", () => {
    const account = createAccount({ plan: "pro", status: "active", monthlyCredits: 100, lastEventCreated: 30 })
    applySubscriptionEvent(account, { id: "evt_other", type: "customer.subscription.updated", accountId: "acct_2", created: 40, plan: "free", status: "inactive", creditGrant: 500 })
    assert.equal(account.plan, "pro")
    assert.equal(account.monthlyCredits, 100)
  })

  await record("a newer cancellation still downgrades the plan", () => {
    const account = createAccount({ plan: "team", status: "active", monthlyCredits: 300, lastEventCreated: 20 })
    applySubscriptionEvent(account, { id: "evt_cancel", type: "customer.subscription.deleted", accountId: "acct_1", created: 30, plan: "free", status: "canceled", creditGrant: 0 })
    assert.equal(account.plan, "free")
    assert.equal(account.status, "canceled")
  })
}

module.exports = { runTests }
`

const runner = `const suites = [
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
  results.push({ suite: "runner", name: "execute workspace tests", passed: false, error: error.message, isHidden: true })
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
  process.exitCode = 1
})
`

export const bugfixBillingWebhookIdempotencyScenario: BugFixScenario = {
  id: "bugfix-billing-webhook-idempotency",
  title: "Billing: Duplicate Credits and Surprise Downgrades After Replays",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "hard",
  companies: ["Stripe"],
  description:
    "Paid accounts got double monthly credits after a webhook replay, and one account was downgraded even though a later upgrade had already been applied.",
  task: "Apply each subscription event to an account at most once, and leave the account in the state of its newest applied event even when an older event arrives later.",
  // Grounded in the scenario's own first visible test, "a duplicate event grants
  // credits once": evt_1 carries a 100-credit grant and is delivered twice. The
  // starter grants on both deliveries, so acct_1 ends at 200 credits where the
  // test asserts 100.
  symptom: {
    subject: "acct_1",
    tag: "same event twice",
    expected: "100 credits",
    actual: "200 credits",
    delta: "+100",
    caveat:
      "Non-subscription events and events addressed to another account leave the account unchanged.",
  },
  userReport:
    "Billing team here. After the payment provider replayed a batch of webhooks last Tuesday, several paid accounts show double their monthly credits. Separately, one account got knocked down to the free plan even though the customer had upgraded to team, because a delayed older event landed after the upgrade. Support is issuing manual corrections.",
  tags: ["backend", "billing", "webhooks", "subscriptions", "real-codebase"],
  estimatedTime: 55,
  problemStatement: `A billing worker turns subscription webhooks from the payment provider into account entitlement changes (plan, status, monthly credits). The provider delivers each event at least once and does not guarantee order.

**Incident Report**
A webhook replay double-granted monthly credits to paid accounts, and a delayed older event downgraded an account that had already been upgraded. Non-subscription events and events for other accounts also flow through the same worker.

Read the codebase files, run the tests, and make the smallest fix so entitlement changes are correct under replays and out-of-order delivery. Keep the public function signature.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "src/account-store.js",
        content: accountStore,
        description: "Read-only account fixture used by the webhook worker tests",
      },
      {
        fileName: "tests/billing-webhooks.test.js",
        content: visibleTests,
        description: "Visible replay and out-of-order tests",
      },
    ],
  },
  expectedBehavior:
    "Each subscription event changes an account at most once, and an event whose created timestamp predates the account's last applied event does not overwrite newer plan, status, or credits. Non-subscription events and events for other accounts are ignored.",
  bugDescription:
    "The worker applies every subscription event unconditionally. It never records which events it has already applied, so a redelivered event double-grants credits, and it never compares event.created to the last applied event, so a delayed older event overwrites newer plan and status.",
  groundTruth:
    "Root cause: applySubscriptionEvent mutates the account for every event it accepts, with no dedup by event id and no ordering check by created timestamp. At-least-once redelivery double-grants credits, and an out-of-order older event overwrites newer state. Fix: record processed event ids and skip duplicates, and skip an event whose created predates the last applied event. Survival story: with exactly-once, ordered delivery the handler was correct, so it passed review; the provider's at-least-once, unordered delivery is what exposed both gaps. Naive-fix trap: PLAN_RANK tempts a guard that only applies an event when its plan rank is at least the current rank, but that would reject a legitimate newer cancellation (team -> free), which the ordering test proves must apply; ordering must be by created timestamp, not plan rank. Red herrings, all reachable and provably innocent: (1) PLAN_RANK is exported and must not gate updates; (2) non-subscription event types (invoice.payment_succeeded) and events for another account id are ignored by both the current handler and the fix, so they are not the bug.",
  hints: [
    "Reproduce both incidents: the same event delivered twice, and an older event arriving after a newer one. Compare the account state after each against what the customer should see.",
    "The provider can redeliver an event and can deliver events out of order. Using only the fields on each event, decide when an event should change the account and when it should be a no-op.",
  ],
  testCases: [
    {
      input: { accountId: "acct_1", delivery: "at-least-once, unordered" },
      expected: "applied once, newest wins",
      description: "Workspace tests cover replayed and out-of-order subscription events",
    },
  ],
  expectedTouchedFiles: ["src/entitlements.js"],
  observedSymptoms: [
    "A replayed subscription event grants its monthly credits twice, and a delayed older event overwrites a newer plan and status.",
    "Non-subscription events and events addressed to another account leave the account unchanged.",
  ],
  reproductionSteps: [
    "Read README.md for the delivery contract and the event shape.",
    "Inspect tests/billing-webhooks.test.js to see the replay and out-of-order cases.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "A redelivered event changes an account at most once.",
    "An event older than the last applied event cannot overwrite newer plan, status, or credits, while a newer cancellation still applies.",
    "Non-subscription events and other-account events are ignored, exactly as before.",
    "Only src/entitlements.js changes.",
  ],
  debuggingSkills: [
    "reproduction",
    "reading the delivery contract",
    "hypothesis",
    "minimal patch",
    "verification",
  ],
  rootCauseRubric: [
    "Identifies that the worker neither dedups redelivered events nor orders them by created timestamp.",
    "Connects the double credits to replays and the downgrade to an out-of-order older event.",
    "Rules out PLAN_RANK as an ordering guard, showing a newer cancellation must still apply.",
    "Names a regression guard such as a replay test plus an out-of-order test plus a newer-cancellation test.",
  ],
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
        content: `# Subscription Entitlements Worker

The billing worker applies subscription webhooks from the payment provider to an account's entitlements: plan, status, and monthly credits.

## Delivery contract

- The provider delivers each event at least once, so the same event id may arrive more than once.
- Delivery is not ordered; an older event (smaller created timestamp) can arrive after a newer one.
- Each event has an id, a type, an accountId, a created timestamp, and the target plan, status, and creditGrant.
- Only subscription events (customer.subscription.created / updated / deleted) touch entitlements; other types are ignored. Events for a different accountId are ignored.
- An account ends in the state of its newest applied event, and each event changes it at most once.`,
        description: "Product and delivery-contract notes",
      },
      {
        path: "src/account-store.js",
        role: "readonly",
        language: "javascript",
        content: accountStore,
        description: "Small account fixture used by webhook tests",
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
        content: visibleTests,
        description: "Visible billing regression tests",
      },
      {
        path: "tests/billing-webhooks.hidden.test.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: hiddenTests,
        description: "Hidden stale-retry, terrain, and cancellation tests",
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
        path: "src/entitlements.js",
        role: "editable",
        language: "javascript",
        content: reference,
      },
    ],
  },
}

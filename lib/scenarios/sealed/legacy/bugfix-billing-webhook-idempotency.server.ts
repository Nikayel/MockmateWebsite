// Sealed legacy-bugfix answer content (SERVER-ONLY). Moved out of the client
// scenario module so the root cause, ground truth, rubric, and reference solution
// never ship in the browser bundle. The window guard is the runtime seal.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

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

export const sealed: SealedLegacyScenario = {
  id: "bugfix-billing-webhook-idempotency",
  bugDescription:
    "The worker applies every subscription event unconditionally. It never records which events it has already applied, so a redelivered event double-grants credits, and it never compares event.created to the last applied event, so a delayed older event overwrites newer plan and status.",
  groundTruth:
    "Root cause: applySubscriptionEvent mutates the account for every event it accepts, with no dedup by event id and no ordering check by created timestamp. At-least-once redelivery double-grants credits, and an out-of-order older event overwrites newer state. Fix: record processed event ids and skip duplicates, and skip an event whose created predates the last applied event. Survival story: with exactly-once, ordered delivery the handler was correct, so it passed review; the provider's at-least-once, unordered delivery is what exposed both gaps. Naive-fix trap: PLAN_RANK tempts a guard that only applies an event when its plan rank is at least the current rank, but that would reject a legitimate newer cancellation (team -> free), which the ordering test proves must apply; ordering must be by created timestamp, not plan rank. Red herrings, all reachable and provably innocent: (1) PLAN_RANK is exported and must not gate updates; (2) non-subscription event types (invoice.payment_succeeded) and events for another account id are ignored by both the current handler and the fix, so they are not the bug.",
  rootCauseRubric: [
    "Identifies that the worker neither dedups redelivered events nor orders them by created timestamp.",
    "Connects the double credits to replays and the downgrade to an out-of-order older event.",
    "Rules out PLAN_RANK as an ordering guard, showing a newer cancellation must still apply.",
    "Names a regression guard such as a replay test plus an out-of-order test plus a newer-cancellation test.",
  ],
  referenceFiles: [
    {
      path: "src/entitlements.js",
      role: "editable",
      language: "javascript",
      content: reference,
    },
  ],
}

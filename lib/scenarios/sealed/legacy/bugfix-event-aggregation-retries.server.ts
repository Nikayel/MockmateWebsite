// Sealed legacy-bugfix answer content (SERVER-ONLY). Moved out of the client
// scenario module so the root cause, ground truth, rubric, and reference solution
// never ship in the browser bundle. The window guard is the runtime seal.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const reference = `def aggregate_events(events):
    totals = {}
    seen = set()
    for event in sorted(events, key=lambda item: item.get("occurred_at", 0)):
        event_type = event["type"]
        if event_type not in ("sent", "opened"):
            continue
        account_id = event["account_id"]
        dedupe_key = (account_id, event.get("id"))
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        totals.setdefault(account_id, {"sent": 0, "opened": 0})
        totals[account_id][event_type] += event.get("count", 1)
    return totals
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-event-aggregation-retries",
  bugDescription:
    "The aggregator sums every delivered event with no dedup, so at-least-once redeliveries double-count an account's totals. The dedup must be scoped per account: event ids are only unique within an account, so deduping by id alone would silently drop a second account's event that happens to share an id.",
  groundTruth:
    "Root cause: aggregate_events sums every event it is handed and never dedups, so a redelivered event is counted again and inflates the account whose events happened to be retried. Fix: dedup on the identity that makes two deliveries the same event, which is (account_id, id) rather than id alone, because ids are only unique within an account. Survival story: with exactly-once delivery the code was correct, so it passed review; the at-least-once migration is what made redeliveries possible. Naive fix trap: deduping by id alone passes the retry tests but silently drops a legitimate second-account event that shares an id, so it fails the cross-account case. Red herrings, all reachable and provably innocent: (1) the sort by occurred_at handles out-of-order delivery and is correct but is not the fix, since ordering alone never removes a duplicate; (2) skipping unknown event types (e.g. 'bounced') is intended and shared by the correct code; (3) count defaulting to 1 and buckets auto-created for a churned or first-seen account are both intended behavior, not the bug.",
  rootCauseRubric: [
    "Identifies that the aggregator never dedups redelivered events under at-least-once delivery.",
    "Scopes the dedup identity to the account, not the id alone, and explains why a shared id is two real events.",
    "Rules out the sort, the unknown-type skip, and the count default as innocent with evidence.",
    "Names a regression guard such as a cross-account shared-id test alongside the retry test.",
  ],
  referenceFiles: [
    {
      path: "src/event_aggregation.py",
      role: "editable",
      language: "python",
      content: reference,
    },
  ],
}

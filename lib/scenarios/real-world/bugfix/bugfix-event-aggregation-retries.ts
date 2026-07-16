import type { BugFixScenario } from "../../types"

const starter = `def aggregate_events(events):
    totals = {}
    for event in sorted(events, key=lambda item: item.get("occurred_at", 0)):
        event_type = event["type"]
        if event_type not in ("sent", "opened"):
            continue
        account_id = event["account_id"]
        totals.setdefault(account_id, {"sent": 0, "opened": 0})
        totals[account_id][event_type] += event.get("count", 1)
    return totals
`

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

const reportingHelper = `def compact_totals(totals):
    return {account_id: data for account_id, data in sorted(totals.items())}
`

const visibleTests = `from src.event_aggregation import aggregate_events
from src.reporting import compact_totals

def run_tests(record):
    def a_redelivered_event_counts_once():
        events = [
            {"id": "e1", "account_id": "acct_1", "type": "sent", "count": 1, "occurred_at": 2},
            {"id": "e1", "account_id": "acct_1", "type": "sent", "count": 1, "occurred_at": 1},
            {"id": "e2", "account_id": "acct_1", "type": "opened", "count": 1, "occurred_at": 3},
        ]
        assert compact_totals(aggregate_events(events)) == {"acct_1": {"sent": 1, "opened": 1}}

    def distinct_events_still_count():
        events = [
            {"id": "e1", "account_id": "acct_1", "type": "sent"},
            {"id": "e2", "account_id": "acct_1", "type": "sent"},
        ]
        assert aggregate_events(events)["acct_1"]["sent"] == 2

    record("a redelivered event counts once", a_redelivered_event_counts_once)
    record("distinct events still count", distinct_events_still_count)
`

const hiddenTests = `from src.event_aggregation import aggregate_events

def run_tests(record):
    def a_retry_is_deduped_only_within_its_account():
        events = [
            {"id": "e1", "account_id": "acct_1", "type": "sent"},
            {"id": "e1", "account_id": "acct_1", "type": "sent"},
            {"id": "e1", "account_id": "acct_2", "type": "sent"},
        ]
        totals = aggregate_events(events)
        assert totals["acct_1"]["sent"] == 1
        assert totals["acct_2"]["sent"] == 1

    def same_id_on_two_accounts_counts_for_both():
        # event ids are only unique within an account; a shared id is two real events
        events = [
            {"id": "shared", "account_id": "acct_1", "type": "sent"},
            {"id": "shared", "account_id": "acct_2", "type": "sent"},
        ]
        totals = aggregate_events(events)
        assert totals == {
            "acct_1": {"sent": 1, "opened": 0},
            "acct_2": {"sent": 1, "opened": 0},
        }

    def events_without_a_count_default_to_one():
        events = [
            {"id": "a1", "account_id": "acct_1", "type": "sent"},
            {"id": "a2", "account_id": "acct_1", "type": "opened", "count": 2},
        ]
        assert aggregate_events(events)["acct_1"] == {"sent": 1, "opened": 2}

    def unknown_event_types_are_ignored():
        events = [
            {"id": "u1", "account_id": "acct_1", "type": "sent"},
            {"id": "u2", "account_id": "acct_1", "type": "bounced"},
        ]
        assert aggregate_events(events)["acct_1"] == {"sent": 1, "opened": 0}

    def events_for_a_churned_account_still_aggregate():
        events = [
            {"id": "c1", "account_id": "acct_churned", "type": "opened", "count": 4},
        ]
        assert aggregate_events(events)["acct_churned"] == {"sent": 0, "opened": 4}

    record("a retry is deduped only within its account", a_retry_is_deduped_only_within_its_account)
    record("the same id on two accounts counts for both", same_id_on_two_accounts_counts_for_both)
    record("events without a count default to one", events_without_a_count_default_to_one)
    record("unknown event types are ignored", unknown_event_types_are_ignored)
    record("events for a churned account still aggregate", events_for_a_churned_account_still_aggregate)
`

const runner = `import json
import os
import sys
import traceback
sys.path.insert(0, os.getcwd())
from tests import test_event_aggregation, test_event_aggregation_hidden

results = []
def record_factory(suite):
    def record(name, fn):
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None, "isHidden": "hidden" in suite.lower()})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc(), "isHidden": "hidden" in suite.lower()})
    return record

test_event_aggregation.run_tests(record_factory("visible event aggregation"))
test_event_aggregation_hidden.run_tests(record_factory("hidden event aggregation"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`

export const bugfixEventAggregationRetriesScenario: BugFixScenario = {
  id: "bugfix-event-aggregation-retries",
  title: "Analytics: One Account's Event Counts Are Inflated",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Generic"],
  description:
    "A customer analytics report shows one account with far more delivery events than its raw log supports, after the ingestion queue moved to at-least-once delivery.",
  task: "Count each of an account's real events once in its sent and opened totals, no matter how many times the queue delivers the same event or in what order batches arrive.",
  // Grounded in the scenario's own first visible test, "a redelivered event
  // counts once": e1 arrives twice for acct_1 and e2 once. The starter adds
  // every delivery it is handed, so it reports sent: 2 where the test asserts
  // sent: 1. The opened total in that same assertion is already correct.
  symptom: {
    subject: "acct_1",
    tag: "sent total",
    expected: "1 event",
    actual: "2 events",
    delta: "+1",
    caveat: "The same account's opened total is correct, and distinct events still count.",
  },
  userReport:
    "Analytics team here. The customer report dashboard is overstating engagement for one account since last month's queue migration. It shows roughly 40% more sent events than that account's raw event log has rows for. Other accounts look right. The queue vendor told us delivery is now at-least-once and batches can arrive out of order.",
  tags: ["python", "data", "analytics", "event-pipeline", "real-codebase"],
  estimatedTime: 45,
  problemStatement: `A customer analytics report turns raw delivery events into per-account totals. Since the ingestion queue moved to at-least-once delivery, one account's totals are inflated versus its raw log.

**Incident Report**
The dashboard overstates one account's send volume by about 40% while other accounts match their logs. The queue can hand the aggregator the same event more than once and can deliver batches out of order.

Read the codebase files, run the tests, and make the smallest fix so an account's totals reflect its real events. Keep the public function signature.`,
  buggyCode: { python: starter },
  codebaseFiles: {
    python: [
      {
        fileName: "src/reporting.py",
        content: reportingHelper,
        description: "Read-only reporting helper (stable per-account ordering)",
      },
      {
        fileName: "tests/test_event_aggregation.py",
        content: visibleTests,
        description: "Visible aggregation tests",
      },
    ],
  },
  expectedBehavior:
    "Each real event contributes to its account's totals exactly once, regardless of how many times the queue redelivers it or the order batches arrive in. Distinct events all count, including the same id seen for two different accounts.",
  bugDescription:
    "The aggregator sums every delivered event with no dedup, so at-least-once redeliveries double-count an account's totals. The dedup must be scoped per account: event ids are only unique within an account, so deduping by id alone would silently drop a second account's event that happens to share an id.",
  groundTruth:
    "Root cause: aggregate_events sums every event it is handed and never dedups, so a redelivered event is counted again and inflates the account whose events happened to be retried. Fix: dedup on the identity that makes two deliveries the same event, which is (account_id, id) rather than id alone, because ids are only unique within an account. Survival story: with exactly-once delivery the code was correct, so it passed review; the at-least-once migration is what made redeliveries possible. Naive fix trap: deduping by id alone passes the retry tests but silently drops a legitimate second-account event that shares an id, so it fails the cross-account case. Red herrings, all reachable and provably innocent: (1) the sort by occurred_at handles out-of-order delivery and is correct but is not the fix, since ordering alone never removes a duplicate; (2) skipping unknown event types (e.g. 'bounced') is intended and shared by the correct code; (3) count defaulting to 1 and buckets auto-created for a churned or first-seen account are both intended behavior, not the bug.",
  hints: [
    "One account is inflated and the others are fine. Pull that account's raw events and compare the counted total against the number of distinct events you actually see.",
    "The same delivery can arrive more than once. Look at what distinguishes a genuine second event from a redelivery of the first, using only the fields on each event.",
  ],
  testCases: [
    {
      input: { account_id: "acct_1", delivery: "at-least-once" },
      expected: "each real event counted once",
      description: "Workspace tests cover redelivered events and account-scoped identity",
    },
  ],
  expectedTouchedFiles: ["src/event_aggregation.py"],
  observedSymptoms: [
    "One account's sent total is about 40% higher than its raw log; the inflation tracks events the queue happened to redeliver.",
    "Other accounts match their logs, and an id shared across two accounts is two real events, not a duplicate.",
  ],
  reproductionSteps: [
    "Read README.md for the delivery contract and the event shape.",
    "Inspect tests/test_event_aggregation.py to see which delivery case inflates a total.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "A redelivered event contributes to its account's totals once, regardless of arrival order.",
    "Distinct events count, including the same id on two different accounts.",
    "Unknown types, missing counts, and first-seen accounts behave exactly as before.",
    "Only src/event_aggregation.py changes.",
  ],
  debuggingSkills: [
    "reproduction",
    "reading the delivery contract",
    "hypothesis",
    "minimal patch",
    "verification",
  ],
  rootCauseRubric: [
    "Identifies that the aggregator never dedups redelivered events under at-least-once delivery.",
    "Scopes the dedup identity to the account, not the id alone, and explains why a shared id is two real events.",
    "Rules out the sort, the unknown-type skip, and the count default as innocent with evidence.",
    "Names a regression guard such as a cross-account shared-id test alongside the retry test.",
  ],
  workspace: {
    language: "python",
    primaryFilePath: "src/event_aggregation.py",
    editableFilePaths: ["src/event_aggregation.py"],
    visibleTestPaths: ["tests/test_event_aggregation.py"],
    hiddenTestPaths: ["tests/test_event_aggregation_hidden.py"],
    testRunnerPath: "tests/run_workspace_tests.py",
    files: [
      { path: "src/__init__.py", role: "readonly", language: "python", content: "" },
      { path: "tests/__init__.py", role: "test", language: "python", content: "", hidden: true },
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content: `# Event Aggregation

The reporting job rolls raw delivery events into per-account totals for the customer dashboard.

## Delivery contract

- The ingestion queue is at-least-once: the same event may be delivered more than once, and batches can arrive out of order.
- Every event has an id, an account_id, a type, and an optional count (default 1). Event ids are assigned per account and are only unique within an account.
- Tracked types are "sent" and "opened"; other types are ignored.
- An account's totals must reflect each of its real events exactly once. Two different accounts may legitimately carry the same id.`,
        description: "Product and delivery-contract notes",
      },
      {
        path: "src/reporting.py",
        role: "readonly",
        language: "python",
        content: reportingHelper,
        description: "Read-only API formatting helper",
      },
      {
        path: "src/event_aggregation.py",
        role: "editable",
        language: "python",
        content: starter,
        description: "Analytics aggregation logic",
      },
      {
        path: "tests/test_event_aggregation.py",
        role: "test",
        language: "python",
        content: visibleTests,
        description: "Visible aggregation tests",
      },
      {
        path: "tests/test_event_aggregation_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: hiddenTests,
        description: "Hidden account-scope and terrain tests",
      },
      {
        path: "tests/run_workspace_tests.py",
        role: "test",
        language: "python",
        hidden: true,
        content: runner,
        description: "Hidden workspace runner",
      },
    ],
    referenceFiles: [
      {
        path: "src/event_aggregation.py",
        role: "editable",
        language: "python",
        content: reference,
      },
    ],
  },
}

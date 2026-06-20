import type { BugFixScenario } from "../../types"

const starter = `def aggregate_events(events):
    totals = {}
    for event in events:
        account_id = event["account_id"]
        totals.setdefault(account_id, {"sent": 0, "opened": 0})
        totals[account_id][event["type"]] += event.get("count", 1)
    return totals
`

const reference = `def aggregate_events(events):
    totals = {}
    seen_event_ids = set()
    for event in sorted(events, key=lambda item: item.get("occurred_at", 0)):
        event_id = event.get("id")
        if event_id in seen_event_ids:
            continue
        seen_event_ids.add(event_id)

        account_id = event["account_id"]
        totals.setdefault(account_id, {"sent": 0, "opened": 0})
        totals[account_id][event["type"]] += event.get("count", 1)
    return totals
`

export const bugfixEventAggregationRetriesScenario: BugFixScenario = {
  id: "bugfix-event-aggregation-retries",
  title: "Analytics Event Retry Double Count",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Databricks", "Snowflake", "LinkedIn", "Uber"],
  description: "Fix analytics aggregation that double-counts retried delivery events",
  tags: ["python", "data", "analytics", "idempotency", "real-codebase"],
  estimatedTime: 45,
  problemStatement: `A customer analytics report is inflated after a queue migration. The event source is now at-least-once delivery, so the aggregator may receive duplicate events and out-of-order batches.

Fix aggregation so retry duplicates do not change totals while legitimate distinct events still count.`,
  buggyCode: { python: starter },
  codebaseFiles: {
    python: [
      {
        fileName: "src/reporting.py",
        content: "Formats aggregate totals for API responses.",
        description: "Read-only reporting helper",
      },
      {
        fileName: "tests/test_event_aggregation.py",
        content: "Visible retry regression tests.",
        description: "Visible tests",
      },
    ],
  },
  expectedBehavior:
    "Events with the same id should affect totals once, regardless of retry ordering.",
  bugDescription:
    "The aggregator sums every delivered event and has no idempotency check for retried IDs.",
  hints: [
    "Queue delivery is at-least-once.",
    "Use the event ID as the idempotency key.",
    "Sorting is useful for deterministic processing, but deduplication is the key fix.",
  ],
  testCases: [
    {
      input: { account_id: "acct_1" },
      expected: "deduplicated totals",
      description: "Workspace tests cover duplicate delivery IDs",
    },
  ],
  expectedTouchedFiles: ["src/event_aggregation.py"],
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
        content:
          "The ingestion queue can redeliver events. Aggregation code must be idempotent by event id.",
      },
      {
        path: "src/reporting.py",
        role: "readonly",
        language: "python",
        content: `def compact_totals(totals):
    return {account_id: data for account_id, data in sorted(totals.items())}
`,
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
        content: `from src.event_aggregation import aggregate_events
from src.reporting import compact_totals

def run_tests(record):
    def duplicate_retry_counts_once():
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

    record("duplicate retry counts once", duplicate_retry_counts_once)
    record("distinct events still count", distinct_events_still_count)
`,
        description: "Visible aggregation tests",
      },
      {
        path: "tests/test_event_aggregation_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: `from src.event_aggregation import aggregate_events

def run_tests(record):
    def duplicates_across_accounts_are_isolated_by_id():
        events = [
            {"id": "shared", "account_id": "acct_1", "type": "sent"},
            {"id": "shared", "account_id": "acct_2", "type": "sent"},
        ]
        totals = aggregate_events(events)
        assert totals == {"acct_1": {"sent": 1, "opened": 0}}

    record("duplicate ids are globally idempotent", duplicates_across_accounts_are_isolated_by_id)
`,
        description: "Hidden global idempotency test",
      },
      {
        path: "tests/run_workspace_tests.py",
        role: "test",
        language: "python",
        hidden: true,
        content: `import json
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
`,
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

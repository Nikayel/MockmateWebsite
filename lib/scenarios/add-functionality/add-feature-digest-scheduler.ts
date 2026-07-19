import type { AddFunctionalityScenario } from "../types"

const starter = `def schedule_digest_jobs(users, notifications, now_hour):
    # TODO: create one digest job per eligible user.
    return []
`

export const digestSchedulerScenario: AddFunctionalityScenario = {
  id: "add-feature-digest-scheduler",
  title: "Add Notification Digest Scheduling",
  type: "add-functionality",
  executionMode: "workspace",
  difficulty: "hard",
  companies: ["Slack", "Notion", "Microsoft", "Salesforce"],
  description: "Add digest notification scheduling with quiet hours and deduplication",
  tags: ["python", "backend", "notifications", "scheduling", "real-codebase"],
  estimatedTime: 60,
  problemStatement: `The notifications service needs a digest scheduler so users are not emailed for every event. Implement scheduled digest creation using user preferences, quiet hours, unread notifications, and deterministic deduplication.

Wire the feature through the service and keep the existing repository contract unchanged.`,
  featureRequirements: [
    "Skip users with digests disabled",
    "Respect quiet hours",
    "Include only unread notifications",
    "Deduplicate notification IDs within each job",
    "Return stable job IDs so retries are idempotent",
  ],
  existingCode: { python: starter },
  codebaseFiles: {
    python: [
      {
        fileName: "src/preferences.py",
        content: "Read-only user preference helpers.",
        description: "Read-only preferences helper",
      },
      {
        fileName: "src/digest_service.py",
        content: "Editable service orchestration.",
        description: "Service layer",
      },
    ],
  },
  hints: [
    "Quiet hours wrap over midnight.",
    "Stable job IDs make retries safe.",
    "Use sets for notification ID deduplication, then sort for deterministic output.",
  ],
  testCases: [
    {
      input: { now_hour: 10 },
      expected: "digest jobs",
      description: "Workspace tests cover preferences, quiet hours, and dedupe",
    },
  ],
  acceptanceCriteria: [
    "Eligible users receive one digest job",
    "Quiet-hour users are skipped",
    "Read notifications are excluded",
    "Duplicate notification deliveries do not duplicate job payloads",
  ],
  workspace: {
    language: "python",
    primaryFilePath: "src/digest_scheduler.py",
    editableFilePaths: ["src/digest_scheduler.py", "src/digest_service.py"],
    visibleTestPaths: ["tests/test_digest_scheduler.py"],
    hiddenTestPaths: ["tests/test_digest_scheduler_hidden.py"],
    testRunnerPath: "tests/run_workspace_tests.py",
    files: [
      { path: "src/__init__.py", role: "readonly", language: "python", content: "" },
      { path: "tests/__init__.py", role: "test", language: "python", content: "", hidden: true },
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content:
          "Digest scheduling runs from a retryable worker. Outputs must be deterministic and idempotent.",
      },
      {
        path: "src/preferences.py",
        role: "readonly",
        language: "python",
        content: `def is_in_quiet_hours(user, hour):
    quiet_start, quiet_end = user.get("quiet_hours", (22, 7))
    if quiet_start < quiet_end:
        return quiet_start <= hour < quiet_end
    return hour >= quiet_start or hour < quiet_end
`,
        description: "Read-only quiet-hours helper",
      },
      {
        path: "src/digest_scheduler.py",
        role: "editable",
        language: "python",
        content: starter,
        description: "Digest job scheduling logic",
      },
      {
        path: "src/digest_service.py",
        role: "editable",
        language: "python",
        content: `from src.digest_scheduler import schedule_digest_jobs

def build_digest_response(users, notifications, now_hour):
    jobs = schedule_digest_jobs(users, notifications, now_hour)
    # TODO: return a response with count and jobs.
    return {"jobs": jobs}
`,
        description: "Service response wrapper for the worker API",
      },
      {
        path: "tests/test_digest_scheduler.py",
        role: "test",
        language: "python",
        content: `from src.digest_scheduler import schedule_digest_jobs
from src.digest_service import build_digest_response

USERS = [
    {"id": "u1", "digest_enabled": True, "quiet_hours": (22, 7)},
    {"id": "u2", "digest_enabled": False, "quiet_hours": (22, 7)},
    {"id": "u3", "digest_enabled": True, "quiet_hours": (9, 17)},
]
NOTIFICATIONS = [
    {"id": "n1", "user_id": "u1", "read": False},
    {"id": "n1", "user_id": "u1", "read": False},
    {"id": "n2", "user_id": "u1", "read": True},
    {"id": "n3", "user_id": "u2", "read": False},
    {"id": "n4", "user_id": "u3", "read": False},
]

def run_tests(record):
    def schedules_only_eligible_unread_digest():
        assert schedule_digest_jobs(USERS, NOTIFICATIONS, 10) == [
            {"job_id": "digest:u1:10", "user_id": "u1", "notification_ids": ["n1"]}
        ]

    def service_returns_count_and_jobs():
        response = build_digest_response(USERS, NOTIFICATIONS, 10)
        assert response["count"] == 1
        assert response["jobs"][0]["job_id"] == "digest:u1:10"

    record("schedules only eligible unread digest", schedules_only_eligible_unread_digest)
    record("service returns count and jobs", service_returns_count_and_jobs)
`,
        description: "Visible digest feature tests",
      },
      {
        path: "tests/test_digest_scheduler_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: `from src.digest_scheduler import schedule_digest_jobs

def run_tests(record):
    def quiet_hours_skip_user():
        users = [{"id": "u1", "digest_enabled": True, "quiet_hours": (22, 7)}]
        notifications = [{"id": "n1", "user_id": "u1", "read": False}]
        assert schedule_digest_jobs(users, notifications, 23) == []

    def non_wrapping_quiet_hours_allow_after_window():
        users = [{"id": "u1", "digest_enabled": True, "quiet_hours": (9, 17)}]
        notifications = [{"id": "n1", "user_id": "u1", "read": False}]
        assert schedule_digest_jobs(users, notifications, 18) == [
            {"job_id": "digest:u1:18", "user_id": "u1", "notification_ids": ["n1"]}
        ]

    record("quiet hours skip user", quiet_hours_skip_user)
    record("non-wrapping quiet hours allow after window", non_wrapping_quiet_hours_allow_after_window)
`,
        description: "Hidden quiet-hours regression test",
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
from tests import test_digest_scheduler, test_digest_scheduler_hidden

results = []
def record_factory(suite):
    def record(name, fn):
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc()})
    return record

test_digest_scheduler.run_tests(record_factory("visible digest scheduler"))
test_digest_scheduler_hidden.run_tests(record_factory("hidden digest scheduler"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`,
        description: "Hidden workspace runner",
      },
    ],
  },
}

import type { WorkspaceScenarioFile } from "@/lib/scenarios/types"

export const bookclubTestFiles: WorkspaceScenarioFile[] = [
  {
    path: "tests/__init__.py",
    role: "test",
    language: "python",
    hidden: true,
    content: ``,
  },
  {
    path: "tests/support.py",
    role: "test",
    language: "python",
    content: `from datetime import date, datetime

from app import cache, repository
from app.models import ReadingEvent
from app.routes import finish_book, get_profile
from app.services.dashboard_service import dashboard
from app.services.reading_service import get_reading_history
from app.services.stats_service import books_this_month, calculate_streak, total_pages_read

TODAY = date(2026, 6, 28)


def event(event_id, finished, user_id=1, book_id=1, started="2026-01-01T00:00:00+00:00"):
    return ReadingEvent(event_id, user_id, book_id, datetime.fromisoformat(started),
                        datetime.fromisoformat(finished) if finished else None)


def eq(actual, expected):
    assert actual == expected, f"expected {expected!r}, got {actual!r}"


def raises(fn):
    try:
        fn()
    except ValueError:
        return
    raise AssertionError("expected ValueError")


def history_ids(limit=50, cursor=None):
    return [row.id for row in get_reading_history(1, limit, cursor)["events"]]
`,
  },
  {
    path: "tests/test_streak_visible.py",
    role: "test",
    language: "python",
    content: `from tests.support import *


def run_tests(record):
    def check_0():
        eq(calculate_streak(1, TODAY), 3)

    record("three completion days ending today", check_0)

    def check_1():
        repository.reset([event(1, None, started="2026-06-28T09:00:00+00:00")])
        eq(calculate_streak(1, TODAY), 0)

    record("in-progress sessions never create a streak", check_1)

    def check_2():
        repository.reset([event(1, "2026-06-28T09:00:00+00:00"), event(2, "2026-06-28T12:00:00+00:00")])
        eq(calculate_streak(1, TODAY), 1)

    record("multiple finishes count as one day", check_2)

    def check_3():
        repository.reset([event(1, "2026-06-28T09:00:00+00:00"), event(2, "2026-06-26T12:00:00+00:00")])
        eq(calculate_streak(1, TODAY), 1)

    record("a missed day stops the streak", check_3)

`,
  },
  {
    path: "tests/test_streak_hidden.py",
    role: "test",
    language: "python",
    hidden: true,
    content: `from tests.support import *


def run_tests(record):
    def check_0():
        repository.reset([event(1, "2026-06-27T09:00:00+00:00")])
        eq(calculate_streak(1, TODAY), 0)

    record("no finish today means zero", check_0)

    def check_1():
        repository.reset([event(1, "2026-01-01T09:00:00+00:00"), event(2, "2025-12-31T12:00:00+00:00")])
        eq(calculate_streak(1, date(2026, 1, 1)), 2)

    record("streak crosses a year boundary", check_1)

    def check_2():
        repository.reset([event(1, "2026-06-29T09:00:00+00:00")])
        eq(calculate_streak(1, TODAY), 0)

    record("future finishes cannot fill today", check_2)

    def check_3():
        repository.reset([event(1, "2026-06-28T09:00:00+00:00", user_id=2)])
        eq(calculate_streak(1, TODAY), 0)

    record("another reader cannot extend a streak", check_3)

`,
  },
  {
    path: "tests/test_history_visible.py",
    role: "test",
    language: "python",
    content: `from tests.support import *


def run_tests(record):
    def check_0():
        eq(history_ids(), [103, 105, 102, 101])

    record("history orders by completion time", check_0)

    def check_1():
        repository.reset([event(1, "2026-06-28T09:00:00+00:00"), event(3, "2026-06-28T09:00:00+00:00"), event(2, "2026-06-28T09:00:00+00:00")])
        eq(history_ids(), [3, 2, 1])

    record("equal completion times use descending IDs", check_1)

    def check_2():
        repository.reset([event(1, "2026-06-28T09:00:00+00:00"), event(2, "2026-06-28T09:00:00+00:00"), event(3, "2026-06-28T09:00:00+00:00")])
        first = get_reading_history(1, 2)
        eq([row.id for row in first["events"]], [3, 2])
        second = get_reading_history(1, 2, first["next_cursor"])
        eq([row.id for row in second["events"]], [1])
        eq(second["next_cursor"], None)

    record("cursor visits timestamp ties exactly once", check_2)

    def check_3():
        eq(get_reading_history(4), {"events": [], "next_cursor": None})

    record("empty readers have no next cursor", check_3)

`,
  },
  {
    path: "tests/test_history_hidden.py",
    role: "test",
    language: "python",
    hidden: true,
    content: `from tests.support import *


def run_tests(record):
    def check_0():
        eq([row.book_id for row in get_reading_history(1, 50)["events"]].count(1), 2)

    record("rereads remain separate reading events", check_0)

    def check_1():
        ids = []
        cursor = None
        for _ in range(5):
            page = get_reading_history(1, 1, cursor)
            ids.extend(row.id for row in page["events"])
            cursor = page["next_cursor"]
            if cursor is None:
                break
        eq(ids, [103, 105, 102, 101])

    record("all pages preserve completeness and order", check_1)

    def check_2():
        for cursor in ["nonsense", "2026-06-28|1", "2026-06-28T00:00:00+00:00|x"]:
            raises(lambda: get_reading_history(1, cursor=cursor))

    record("invalid cursors reject before returning records", check_2)

    def check_3():
        for size in [0, -1, 51, True, 1.5]:
            raises(lambda: get_reading_history(1, limit=size))

    record("page sizes reject invalid values", check_3)

`,
  },
  {
    path: "tests/test_calendar_visible.py",
    role: "test",
    language: "python",
    content: `from tests.support import *


def run_tests(record):
    def check_0():
        repository.reset([event(1, "2026-07-01T02:00:00+00:00", user_id=2)])
        eq(books_this_month(2, date(2026, 6, 30)), 1)

    record("negative offset keeps midnight UTC in prior month", check_0)

    def check_1():
        repository.reset([event(1, "2026-06-30T20:00:00+00:00", user_id=3)])
        eq(books_this_month(3, date(2026, 7, 1)), 1)

    record("positive half-hour offset reaches next month", check_1)

    def check_2():
        repository.reset([event(1, "2025-12-31T23:00:00+00:00", user_id=3, started="2025-12-01T00:00:00+00:00")])
        eq(books_this_month(3, date(2026, 1, 1)), 1)

    record("local calendar crosses the year boundary", check_2)

    def check_3():
        repository.reset([event(1, "2025-06-28T12:00:00+00:00", started="2025-01-01T00:00:00+00:00")])
        eq(books_this_month(1, TODAY), 0)

    record("last years same month does not count", check_3)

`,
  },
  {
    path: "tests/test_calendar_hidden.py",
    role: "test",
    language: "python",
    hidden: true,
    content: `from tests.support import *


def run_tests(record):
    def check_0():
        repository.reset([event(1, "2026-06-30T18:30:00+00:00", user_id=3)])
        eq(books_this_month(3, date(2026, 7, 1)), 1)
        eq(books_this_month(3, date(2026, 6, 30)), 0)

    record("exact local midnight begins the new month", check_0)

    def check_1():
        repository.reset([event(1, "2026-06-30T18:29:59+00:00", user_id=3)])
        eq(books_this_month(3, date(2026, 6, 30)), 1)

    record("one second before local midnight stays in old month", check_1)

    def check_2():
        repository.reset([event(1, "2026-06-30T10:00:00+00:00", user_id=5)])
        eq(books_this_month(5, date(2026, 7, 1)), 1)

    record("UTC plus fourteen hours reaches next local month", check_2)

    def check_3():
        repository.reset([event(1, "2026-06-27T20:00:00+00:00", user_id=3), event(2, "2026-06-26T20:00:00+00:00", user_id=3)])
        eq(calculate_streak(3, TODAY), 2)

    record("local streak still uses the same calendar contract", check_3)

`,
  },
  {
    path: "tests/test_cache_visible.py",
    role: "test",
    language: "python",
    content: `from tests.support import *


def run_tests(record):
    def check_0():
        eq(dashboard(1, TODAY)["user_id"], 1)
        eq(dashboard(2, TODAY)["user_id"], 2)
        eq(dashboard(2, TODAY)["books_this_month"], 0)

    record("successive readers receive their own dashboard", check_0)

    def check_1():
        before = get_profile(1, TODAY)["stats"]
        after = finish_book(1, 104, "2026-06-28T12:00:00+00:00", TODAY)["stats"]
        eq(after["books_this_month"], before["books_this_month"] + 1)
        eq(after["total_pages_read"], before["total_pages_read"] + 600)

    record("completion refreshes the very next profile request", check_1)

    def check_2():
        eq(dashboard(1, TODAY)["books_this_month"], 4)
        eq(dashboard(1, date(2026, 7, 1))["books_this_month"], 0)

    record("a new local date refreshes monthly totals", check_2)

    def check_3():
        dashboard(1, TODAY)["books_this_month"] = 999
        eq(dashboard(1, TODAY)["books_this_month"], 4)

    record("callers cannot poison a cached response", check_3)

`,
  },
  {
    path: "tests/test_cache_hidden.py",
    role: "test",
    language: "python",
    hidden: true,
    content: `from tests.support import *


def run_tests(record):
    def check_0():
        first = finish_book(1, 104, "2026-06-28T12:00:00+00:00", TODAY)
        second = finish_book(1, 104, "2026-06-28T12:00:00+00:00", TODAY)
        eq(first, second)
        eq(second["stats"]["books_this_month"], 5)

    record("repeat completion is idempotent end to end", check_0)

    def check_1():
        before = get_profile(1, TODAY)
        raises(lambda: finish_book(2, 104, "2026-06-28T12:00:00+00:00", TODAY))
        eq(get_profile(1, TODAY), before)
        eq(repository.revision(), 0)

    record("foreign completion changes neither owner nor response", check_1)

    def check_2():
        repository.reset([event(1, "2026-06-30T23:00:00+00:00")])
        eq(dashboard(1, date(2026, 7, 1))["books_this_month"], 0)
        repository.reader(1).utc_offset_minutes = 120
        eq(dashboard(1, date(2026, 7, 1))["books_this_month"], 1)

    record("offset changes refresh the calendar snapshot", check_2)

    def check_3():
        get_profile(1, TODAY)
        get_profile(2, TODAY)
        finish_book(1, 104, "2026-06-28T12:00:00+00:00", TODAY)
        eq(get_profile(2, TODAY)["stats"]["books_this_month"], 0)
        eq(get_profile(1, TODAY)["stats"]["total_pages_read"], 1870)

    record("revisiting an earlier reader preserves correct state", check_3)

`,
  },
  {
    path: "tests/test_baseline_visible.py",
    role: "test",
    language: "python",
    content: `from tests.support import *


def run_tests(record):
    def check_0():
        eq(books_this_month(1, TODAY), 4)

    record("monthly totals include completed rereads", check_0)

    def check_1():
        eq(total_pages_read(1), 1270)

    record("pages include rereads but exclude in progress", check_1)

    def check_2():
        eq(set(history_ids()), {101, 102, 103, 105})

    record("history excludes other readers and in-progress events", check_2)

    def check_3():
        eq(total_pages_read(4), 0)
        eq(books_this_month(4, TODAY), 0)

    record("empty reader stats stay empty", check_3)

`,
  },
  {
    path: "tests/run_workspace_tests.py",
    role: "test",
    language: "python",
    hidden: true,
    content: `import importlib
import json
import os
import sys

sys.path.insert(0, os.getcwd())
from app import cache, repository

results = []


def record_for(suite):
    def record(name, check):
        repository.reset()
        cache.clear()
        try:
            check()
            passed, error = True, None
        except Exception as exc:
            passed, error = False, str(exc) or type(exc).__name__
        results.append({"suite": suite, "name": name, "passed": passed,
                        "error": error, "isHidden": suite.startswith("hidden")})
    return record

importlib.import_module("tests.test_streak_visible").run_tests(record_for("visible streak"))
importlib.import_module("tests.test_streak_hidden").run_tests(record_for("hidden streak"))
importlib.import_module("tests.test_history_visible").run_tests(record_for("visible history"))
importlib.import_module("tests.test_history_hidden").run_tests(record_for("hidden history"))
importlib.import_module("tests.test_calendar_visible").run_tests(record_for("visible calendar"))
importlib.import_module("tests.test_calendar_hidden").run_tests(record_for("hidden calendar"))
importlib.import_module("tests.test_cache_visible").run_tests(record_for("visible cache"))
importlib.import_module("tests.test_cache_hidden").run_tests(record_for("hidden cache"))
importlib.import_module("tests.test_baseline_visible").run_tests(record_for("visible baseline"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`,
  },
]

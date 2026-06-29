import type { BugFixScenario } from "../../types"

/**
 * BookClub reading-tracker guided bug-fix lab.
 *
 * Two independent one-identifier bugs in the reading services:
 *   - Bug 1 (logic): `calculate_streak` aggregates events by `started_at`
 *     instead of `finished_at` → the streak is wrong.
 *   - Bug 2 (display): `get_reading_history` orders by `started_at` instead of
 *     `finished_at` → the history is in the wrong order.
 *
 * The scenario ships two parallel trees: a read-only Flask/SQLAlchemy reference
 * (for fidelity / reading) under `reference/`, and a pure-Python runnable mirror
 * under `app/` (dataclasses + in-memory seed) where the bugs live and the tests
 * run. The guided-lab overlay (added separately) gates Bug 2 behind Bug 1.
 */

// ── Pure-Python runnable mirror (editable) ──────────────────────────────────

const mirrorStatsService = `from datetime import date, timedelta

from app.seed import BOOKS
from app.services.reading_service import get_reading_history


def calculate_streak(user_id, today=None):
    """Return the user's current reading streak: the number of consecutive
    calendar days, ending on the given day, on which they finished at least one book.

    Books that are still in progress never count toward the streak.
    """
    if today is None:
        today = date.today()
    events = get_reading_history(user_id)
    finished_days = {event.started_at for event in events}
    streak = 0
    day = today
    while day in finished_days:
        streak += 1
        day = day - timedelta(days=1)
    return streak


def books_this_month(user_id, today=None):
    """Count how many books the user finished in the given day's calendar month."""
    if today is None:
        today = date.today()
    events = get_reading_history(user_id)
    return sum(
        1
        for event in events
        if event.finished_at.year == today.year and event.finished_at.month == today.month
    )


def total_pages_read(user_id):
    """Sum the page counts of every book the user has finished."""
    pages_by_book = {book.id: book.pages for book in BOOKS}
    events = get_reading_history(user_id)
    return sum(pages_by_book[event.book_id] for event in events)
`

const mirrorStatsServiceFixed = `from datetime import date, timedelta

from app.seed import BOOKS
from app.services.reading_service import get_reading_history


def calculate_streak(user_id, today=None):
    """Return the user's current reading streak: the number of consecutive
    calendar days, ending on the given day, on which they finished at least one book.

    Books that are still in progress never count toward the streak.
    """
    if today is None:
        today = date.today()
    events = get_reading_history(user_id)
    finished_days = {event.finished_at for event in events}
    streak = 0
    day = today
    while day in finished_days:
        streak += 1
        day = day - timedelta(days=1)
    return streak


def books_this_month(user_id, today=None):
    """Count how many books the user finished in the given day's calendar month."""
    if today is None:
        today = date.today()
    events = get_reading_history(user_id)
    return sum(
        1
        for event in events
        if event.finished_at.year == today.year and event.finished_at.month == today.month
    )


def total_pages_read(user_id):
    """Sum the page counts of every book the user has finished."""
    pages_by_book = {book.id: book.pages for book in BOOKS}
    events = get_reading_history(user_id)
    return sum(pages_by_book[event.book_id] for event in events)
`

const mirrorReadingService = `from app.seed import READING_EVENTS


def get_reading_history(user_id):
    """Return the user's finished reading events, most recently finished first.

    Books that are still in progress (no finish date) are excluded.
    """
    finished = [
        event
        for event in READING_EVENTS
        if event.user_id == user_id and event.finished_at is not None
    ]
    return sorted(finished, key=lambda event: event.started_at, reverse=True)
`

const mirrorReadingServiceFixed = `from app.seed import READING_EVENTS


def get_reading_history(user_id):
    """Return the user's finished reading events, most recently finished first.

    Books that are still in progress (no finish date) are excluded.
    """
    finished = [
        event
        for event in READING_EVENTS
        if event.user_id == user_id and event.finished_at is not None
    ]
    return sorted(finished, key=lambda event: event.finished_at, reverse=True)
`

const mirrorModels = `from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class User:
    id: int
    name: str


@dataclass
class Book:
    id: int
    title: str
    pages: int


@dataclass
class ReadingEvent:
    id: int
    user_id: int
    book_id: int
    started_at: date            # always set: the day the book was opened
    finished_at: Optional[date]  # None while the book is still in progress
`

const mirrorSeed = `from datetime import date

from app.models import Book, ReadingEvent, User

USERS = [
    User(id=1, name="Alex"),
    User(id=2, name="Priya"),
    User(id=3, name="Marcus"),
    User(id=4, name="Dana"),
]

BOOKS = [
    Book(id=1, title="Deep Work", pages=320),
    Book(id=2, title="The Pragmatic Programmer", pages=280),
    Book(id=3, title="Refactoring", pages=350),
    Book(id=4, title="Designing Data-Intensive Applications", pages=600),
    Book(id=5, title="Clean Code", pages=400),
    Book(id=6, title="Atomic Habits", pages=300),
    Book(id=7, title="The Mythical Man-Month", pages=300),
    Book(id=8, title="Working in Public", pages=260),
    Book(id=9, title="Accelerate", pages=288),
    Book(id=10, title="The Phoenix Project", pages=432),
]

# "today" for this dataset is 2026-06-28.
# Alex finished a book on three consecutive days ending today and has one book
# still in progress. Priya last finished over a week ago. Marcus has only an
# in-progress book. Dana finished today but skipped a day beforehand.
READING_EVENTS = [
    # Alex (user 1)
    ReadingEvent(id=1, user_id=1, book_id=1, started_at=date(2026, 6, 12), finished_at=date(2026, 6, 26)),
    ReadingEvent(id=2, user_id=1, book_id=2, started_at=date(2026, 6, 20), finished_at=date(2026, 6, 27)),
    ReadingEvent(id=3, user_id=1, book_id=3, started_at=date(2026, 6, 5), finished_at=date(2026, 6, 28)),
    ReadingEvent(id=4, user_id=1, book_id=4, started_at=date(2026, 6, 28), finished_at=None),
    # Priya (user 2)
    ReadingEvent(id=5, user_id=2, book_id=5, started_at=date(2026, 6, 1), finished_at=date(2026, 6, 16)),
    ReadingEvent(id=6, user_id=2, book_id=6, started_at=date(2026, 6, 10), finished_at=date(2026, 6, 15)),
    # Marcus (user 3)
    ReadingEvent(id=7, user_id=3, book_id=7, started_at=date(2026, 6, 27), finished_at=None),
    # Dana (user 4)
    ReadingEvent(id=8, user_id=4, book_id=8, started_at=date(2026, 6, 20), finished_at=date(2026, 6, 28)),
    ReadingEvent(id=9, user_id=4, book_id=9, started_at=date(2026, 6, 22), finished_at=date(2026, 6, 27)),
    ReadingEvent(id=10, user_id=4, book_id=10, started_at=date(2026, 6, 19), finished_at=date(2026, 6, 25)),
]
`

// ── Flask / SQLAlchemy reference (read-only, never executed) ─────────────────

const referenceModels = `from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    reading_streak = db.Column(db.Integer, default=0)
    events = db.relationship("ReadingEvent", backref="user", lazy=True)


class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    pages = db.Column(db.Integer, nullable=False)


class ReadingEvent(db.Model):
    __tablename__ = "reading_events"
    __table_args__ = (db.UniqueConstraint("user_id", "book_id", name="uq_user_book"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id"), nullable=False)
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    finished_at = db.Column(db.DateTime, nullable=True)
    book = db.relationship("Book", lazy=True)
`

const referenceRoutesStats = `from flask import Blueprint, jsonify

from services.stats_service import books_this_month, calculate_streak, total_pages_read

stats_bp = Blueprint("stats", __name__)


@stats_bp.route("/stats/<int:user_id>")
def stats(user_id):
    """Return the user's reading stats: current streak, books finished this
    month, and total pages read."""
    return jsonify(
        {
            "reading_streak": calculate_streak(user_id),
            "books_this_month": books_this_month(user_id),
            "total_pages_read": total_pages_read(user_id),
        }
    )
`

const referenceRoutesReading = `from flask import Blueprint, jsonify

from services.reading_service import get_reading_history

reading_bp = Blueprint("reading", __name__)


@reading_bp.route("/reading/history/<int:user_id>")
def reading_history(user_id):
    """Return the user's finished books, most recently finished first."""
    events = get_reading_history(user_id)
    return jsonify(
        [
            {
                "book_id": event.book_id,
                "started_at": event.started_at.isoformat(),
                "finished_at": event.finished_at.isoformat() if event.finished_at else None,
            }
            for event in events
        ]
    )
`

const referenceStatsService = `from datetime import date

from services.reading_service import get_reading_history


def calculate_streak(user_id):
    """Return the user's current streak: consecutive calendar days, ending
    today, on which they finished at least one book. In-progress books never
    count toward the streak."""
    events = get_reading_history(user_id)
    finished_days = {event.started_at.date() for event in events}
    today = date.today()
    streak = 0
    while today in finished_days:
        streak += 1
        today = date.fromordinal(today.toordinal() - 1)
    return streak


def books_this_month(user_id):
    """Number of books the user finished during the current calendar month."""
    events = get_reading_history(user_id)
    today = date.today()
    return sum(
        1
        for event in events
        if event.finished_at.year == today.year and event.finished_at.month == today.month
    )


def total_pages_read(user_id):
    """Total pages across every book the user has finished."""
    events = get_reading_history(user_id)
    return sum(event.book.pages for event in events)
`

const referenceReadingService = `from models import ReadingEvent


def get_reading_history(user_id):
    """Return the user's finished reading events, most recently finished first.
    Books still in progress (no finish date) are excluded."""
    return (
        ReadingEvent.query.filter_by(user_id=user_id)
        .filter(ReadingEvent.finished_at.isnot(None))
        .order_by(ReadingEvent.started_at.desc())
        .all()
    )
`

// ── Tests + runner ──────────────────────────────────────────────────────────

const testStreak = `from datetime import date

from app.services.stats_service import books_this_month, calculate_streak, total_pages_read

TODAY = date(2026, 6, 28)


def run_tests(record):
    def current_streak_counts_consecutive_finished_days():
        assert calculate_streak(1, TODAY) == 3

    def books_finished_this_month_unchanged():
        assert books_this_month(1, TODAY) == 3

    def total_pages_read_unchanged():
        assert total_pages_read(1) == 950

    record(
        "current streak counts consecutive finished days",
        current_streak_counts_consecutive_finished_days,
    )
    record("books finished this month is unchanged", books_finished_this_month_unchanged)
    record("total pages read is unchanged", total_pages_read_unchanged)
`

const testHistoryOrder = `from app.services.reading_service import get_reading_history


def run_tests(record):
    def history_is_most_recently_finished_first():
        history = get_reading_history(1)
        assert [event.book_id for event in history] == [3, 2, 1]

    record(
        "history is ordered most recently finished first",
        history_is_most_recently_finished_first,
    )
`

const testStreakHidden = `from datetime import date

from app.services.stats_service import calculate_streak

TODAY = date(2026, 6, 28)


def run_tests(record):
    def in_progress_only_user_has_no_streak():
        assert calculate_streak(3, TODAY) == 0

    def no_finish_today_means_no_current_streak():
        assert calculate_streak(2, TODAY) == 0

    def a_gap_truncates_the_streak():
        assert calculate_streak(4, TODAY) == 2

    record("in-progress-only user has no streak", in_progress_only_user_has_no_streak)
    record("no finish today means no current streak", no_finish_today_means_no_current_streak)
    record("a gap truncates the streak", a_gap_truncates_the_streak)
`

const testHistoryHidden = `from app.services.reading_service import get_reading_history


def run_tests(record):
    def in_progress_books_excluded_from_history():
        history = get_reading_history(1)
        assert all(event.finished_at is not None for event in history)
        assert len(history) == 3

    def history_order_holds_for_other_users():
        assert [event.book_id for event in get_reading_history(2)] == [5, 6]

    def in_progress_only_user_has_empty_history():
        assert get_reading_history(3) == []

    record("in-progress books excluded from history", in_progress_books_excluded_from_history)
    record("history order holds for other users", history_order_holds_for_other_users)
    record("in-progress-only user has empty history", in_progress_only_user_has_empty_history)
`

const testRunner = `import json
import os
import sys
import traceback

sys.path.insert(0, os.getcwd())
from tests import test_history_hidden, test_history_order, test_streak, test_streak_hidden

results = []


def record_factory(suite):
    def record(name, fn):
        try:
            fn()
            results.append(
                {"suite": suite, "name": name, "passed": True, "error": None, "isHidden": "hidden" in suite.lower()}
            )
        except Exception as exc:
            results.append(
                {
                    "suite": suite,
                    "name": name,
                    "passed": False,
                    "error": str(exc) or traceback.format_exc(),
                    "isHidden": "hidden" in suite.lower(),
                }
            )

    return record


test_streak.run_tests(record_factory("visible streak"))
test_history_order.run_tests(record_factory("visible history order"))
test_streak_hidden.run_tests(record_factory("hidden streak"))
test_history_hidden.run_tests(record_factory("hidden history"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`

const readme = `# BookClub

A small reading-tracker app. Members log when they **start** a book and when
they **finish** it, and the app shows a few stats on each member's profile.

## Stats and what they mean

- **Reading streak** — the number of consecutive calendar days, ending today,
  on which the member **finished** at least one book. A book that is still in
  progress never counts toward the streak.
- **Books this month** — how many books the member **finished** in the current
  calendar month.
- **Total pages read** — the sum of pages across every book the member has
  **finished**.
- **Reading history** — the member's finished books, **most recently finished
  first**. Books still in progress are not part of the history.

## Architecture

The code is layered:

- \`routes/\` — receive HTTP requests, call services, format responses.
- \`services/\` — application logic: the stat calculations and the history query.
- \`models.py\` — the data model (\`User\`, \`Book\`, \`ReadingEvent\`).

A \`ReadingEvent\` always has a \`started_at\` date; its \`finished_at\` date is set
only once the member marks the book complete (so it is \`None\` while in progress).

> The \`reference/\` folder is the original Flask + SQLAlchemy app, kept for
> reading. The runnable copy you edit and test lives under \`app/\`.
`

export const bugfixBookclubReadingStreakWorkspaceScenario: BugFixScenario = {
  id: "bugfix-bookclub-reading-streak-workspace",
  title: "BookClub Reading Streak & History",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Notion", "Shopify", "LinkedIn", "Stripe"],
  description:
    "Fix a reading-streak calculation and a history ordering in a small layered reading-tracker app",
  userReport:
    "Two things look wrong on my BookClub profile. My reading streak says 0 even though I've finished a book three days running, and my reading history is in a strange order — the book I finished today isn't at the top. The books themselves all show up fine; it's the streak number and the ordering that seem off.",
  tags: ["python", "real-codebase", "data-modeling", "flask"],
  estimatedTime: 40,
  problemStatement: `BookClub is a small reading-tracker app. Members finish books and the app shows a reading streak (consecutive days they finished a book), the number of books finished this month, total pages read, and a reading history.

A support ticket reports that the reading streak and the reading history order look wrong, while the other stats look fine. The codebase is layered: routes call services, and services compute over the data model in \`app/\`.

Work through it in order: first get the reading streak correct, then fix the reading history ordering. Each fix should match the behavior documented in the function docstrings and README, without breaking the books-this-month or total-pages stats.`,
  buggyCode: { python: mirrorStatsService },
  codebaseFiles: {
    python: [
      {
        fileName: "README.md",
        content: "Product rules for the streak, history, and stats.",
        description: "Docs",
      },
      {
        fileName: "app/services/stats_service.py",
        content: "Streak, books-this-month, and total-pages calculations.",
        description: "Editable stats service",
      },
      {
        fileName: "app/services/reading_service.py",
        content: "Builds the finished-books reading history.",
        description: "Editable reading service",
      },
      {
        fileName: "reference/services/stats_service.py",
        content: "Original Flask/SQLAlchemy stats service, kept for reference.",
        description: "Read-only reference",
      },
      {
        fileName: "tests/test_streak.py",
        content: "Visible streak and stats tests.",
        description: "Visible tests",
      },
      {
        fileName: "tests/test_history_order.py",
        content: "Visible history-ordering test.",
        description: "Visible tests",
      },
    ],
  },
  expectedBehavior:
    "The reading streak counts consecutive days, ending today, on which the user finished at least one book; the reading history lists finished books most-recently-finished first; books-this-month and total-pages-read stay correct.",
  bugDescription:
    "Two independent defects in the reading services: the streak aggregates events by their start date rather than their finish date, and the history list sorts by start date rather than finish date.",
  observedSymptoms: [
    "Reading streak shows 0 despite recent daily finishes.",
    "Reading history is not ordered most-recently-finished first.",
    "Books-this-month and total-pages-read look correct.",
  ],
  reproductionSteps: [
    "Read README.md for the product rules.",
    "Run the workspace tests to see the failing streak and history-order checks.",
    "Compare each service function against its docstring.",
  ],
  successCriteria: [
    "All visible and hidden streak and history tests pass.",
    "Monthly and total-pages stats remain correct.",
  ],
  debuggingSkills: [
    "reproduction",
    "codebase navigation",
    "docstring-vs-implementation comparison",
    "minimal patch",
    "verification",
  ],
  hints: [
    "Start by reading each function's docstring, then check whether the code does what the docstring promises.",
    "started_at and finished_at mean different things — one is when a book was opened, the other when it was completed.",
    "A completion streak is about the days a book was finished; the history is ordered by when books were finished.",
    "Books still in progress have no finish date — make sure they don't distort either result.",
  ],
  testCases: [
    {
      input: { user: "alex", today: "2026-06-28" },
      expected: { streak: 3, historyOrder: [3, 2, 1] },
      description: "Streak counts finished days; history is most-recently-finished first",
    },
  ],
  expectedTouchedFiles: ["app/services/stats_service.py", "app/services/reading_service.py"],
  rootCauseRubric: [
    "Identifies that the streak and history are computed from the wrong date field.",
    "Explains why the finish date (not the start date) defines both a completion streak and a most-recently-finished ordering.",
    "Confirms in-progress books are excluded and the monthly/total stats are unaffected.",
  ],
  workspace: {
    language: "python",
    primaryFilePath: "app/services/stats_service.py",
    editableFilePaths: ["app/services/stats_service.py", "app/services/reading_service.py"],
    visibleTestPaths: ["tests/test_streak.py", "tests/test_history_order.py"],
    hiddenTestPaths: ["tests/test_streak_hidden.py", "tests/test_history_hidden.py"],
    testRunnerPath: "tests/run_workspace_tests.py",
    files: [
      { path: "README.md", role: "docs", language: "markdown", content: readme },
      // Pure-Python runnable mirror
      { path: "app/__init__.py", role: "readonly", language: "python", content: "" },
      { path: "app/services/__init__.py", role: "readonly", language: "python", content: "" },
      {
        path: "app/models.py",
        role: "readonly",
        language: "python",
        content: mirrorModels,
        description: "Data model (read-only contract)",
      },
      {
        path: "app/seed.py",
        role: "readonly",
        language: "python",
        content: mirrorSeed,
        description: "In-memory seed data (read-only)",
      },
      {
        path: "app/services/stats_service.py",
        role: "editable",
        language: "python",
        content: mirrorStatsService,
        description: "Streak and stats calculations",
      },
      {
        path: "app/services/reading_service.py",
        role: "editable",
        language: "python",
        content: mirrorReadingService,
        description: "Reading-history query",
      },
      // Flask / SQLAlchemy reference (read-only fidelity, not executed)
      {
        path: "reference/models.py",
        role: "readonly",
        language: "python",
        content: referenceModels,
        description: "Original SQLAlchemy models",
      },
      {
        path: "reference/routes/stats.py",
        role: "readonly",
        language: "python",
        content: referenceRoutesStats,
        description: "Original stats route",
      },
      {
        path: "reference/routes/reading.py",
        role: "readonly",
        language: "python",
        content: referenceRoutesReading,
        description: "Original reading route",
      },
      {
        path: "reference/services/stats_service.py",
        role: "readonly",
        language: "python",
        content: referenceStatsService,
        description: "Original stats service",
      },
      {
        path: "reference/services/reading_service.py",
        role: "readonly",
        language: "python",
        content: referenceReadingService,
        description: "Original reading service",
      },
      // Tests
      {
        path: "tests/__init__.py",
        role: "test",
        language: "python",
        content: "",
        hidden: true,
      },
      {
        path: "tests/test_streak.py",
        role: "test",
        language: "python",
        content: testStreak,
        description: "Visible streak + stats tests",
      },
      {
        path: "tests/test_history_order.py",
        role: "test",
        language: "python",
        content: testHistoryOrder,
        description: "Visible history-ordering test",
      },
      {
        path: "tests/test_streak_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: testStreakHidden,
        description: "Hidden streak edge cases",
      },
      {
        path: "tests/test_history_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: testHistoryHidden,
        description: "Hidden history edge cases",
      },
      {
        path: "tests/run_workspace_tests.py",
        role: "test",
        language: "python",
        hidden: true,
        content: testRunner,
        description: "Hidden workspace runner",
      },
    ],
    referenceFiles: [
      {
        path: "app/services/stats_service.py",
        role: "editable",
        language: "python",
        content: mirrorStatsServiceFixed,
      },
      {
        path: "app/services/reading_service.py",
        role: "editable",
        language: "python",
        content: mirrorReadingServiceFixed,
      },
    ],
  },
}

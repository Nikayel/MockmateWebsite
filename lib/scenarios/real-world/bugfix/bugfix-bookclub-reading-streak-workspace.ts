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
    User(id=5, name="Nadia"),
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
# in-progress book. Dana finished today but skipped a day beforehand. Nadia
# re-logged the same book twice (a re-read): the SQLAlchemy model declares a
# uq_user_book unique constraint, but this in-memory mirror does not enforce it,
# so the stat code must tolerate more than one event for the same book.
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
    # Nadia (user 5): re-logged book 1 (a re-read) plus one other book. She
    # finishes on three consecutive days ending today. The started_at order
    # differs from the finished_at order, and book 1 appears twice.
    ReadingEvent(id=11, user_id=5, book_id=1, started_at=date(2026, 6, 5), finished_at=date(2026, 6, 27)),
    ReadingEvent(id=12, user_id=5, book_id=1, started_at=date(2026, 6, 25), finished_at=date(2026, 6, 28)),
    ReadingEvent(id=13, user_id=5, book_id=2, started_at=date(2026, 6, 24), finished_at=date(2026, 6, 26)),
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
        actual = calculate_streak(1, TODAY)
        assert actual == 3, f"expected a 3-day reading streak, got {actual}"

    def books_finished_this_month_unchanged():
        actual = books_this_month(1, TODAY)
        assert actual == 3, f"expected 3 books finished this month, got {actual}"

    def total_pages_read_unchanged():
        actual = total_pages_read(1)
        assert actual == 950, f"expected 950 total pages read, got {actual}"

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
        got = [event.book_id for event in history]
        assert got == [3, 2, 1], f"expected book order [3, 2, 1] (most recently finished first), got {got}"

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
        actual = calculate_streak(3, TODAY)
        assert actual == 0, f"expected streak 0 for an in-progress-only reader, got {actual}"

    def no_finish_today_means_no_current_streak():
        actual = calculate_streak(2, TODAY)
        assert actual == 0, f"expected streak 0 when nothing was finished today, got {actual}"

    def a_gap_truncates_the_streak():
        actual = calculate_streak(4, TODAY)
        assert actual == 2, f"expected streak 2 (a missed day truncates it), got {actual}"

    def a_relogged_book_still_yields_the_finish_streak():
        # Nadia re-logged book 1 (a re-read); the duplicate must not distort the
        # finish-day streak, which is 3 consecutive days ending today.
        actual = calculate_streak(5, TODAY)
        assert actual == 3, f"expected streak 3 for the re-logged-book reader, got {actual}"

    record("in-progress-only user has no streak", in_progress_only_user_has_no_streak)
    record("no finish today means no current streak", no_finish_today_means_no_current_streak)
    record("a gap truncates the streak", a_gap_truncates_the_streak)
    record("a re-logged book still yields the finish streak", a_relogged_book_still_yields_the_finish_streak)
`

const testHistoryHidden = `from app.services.reading_service import get_reading_history


def run_tests(record):
    def in_progress_books_excluded_from_history():
        history = get_reading_history(1)
        assert all(event.finished_at is not None for event in history), "history should exclude in-progress books"
        assert len(history) == 3, f"expected 3 finished books in history, got {len(history)}"

    def history_order_holds_for_other_users():
        got = [event.book_id for event in get_reading_history(2)]
        assert got == [5, 6], f"expected book order [5, 6] for the second reader, got {got}"

    def in_progress_only_user_has_empty_history():
        got = get_reading_history(3)
        assert got == [], f"expected an empty history, got {[event.book_id for event in got]}"

    def relogged_book_history_orders_by_finish():
        # book 1 was re-logged; both events appear, ordered most-recently-finished
        # first, independent of when each was started.
        got = [event.book_id for event in get_reading_history(5)]
        assert got == [1, 1, 2], f"expected book order [1, 1, 2] (most recently finished first), got {got}"

    record("in-progress books excluded from history", in_progress_books_excluded_from_history)
    record("history order holds for other users", history_order_holds_for_other_users)
    record("in-progress-only user has empty history", in_progress_only_user_has_empty_history)
    record("re-logged book history orders by finish date", relogged_book_history_orders_by_finish)
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
        except AssertionError as exc:
            # A failed check should read as a clear "expected X, got Y", never a
            # raw stack trace. Asserts carry messages; this is the safety net.
            results.append(
                {
                    "suite": suite,
                    "name": name,
                    "passed": False,
                    "error": str(exc) or (name + " failed"),
                    "isHidden": "hidden" in suite.lower(),
                }
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

> The \`reference/\` folder is the original Flask + SQLAlchemy app **as shipped** —
> kept for reading, so it still contains the same defects. Read it to learn the
> structure, not to copy. The runnable copy you edit and test lives under \`app/\`.
`

export const bugfixBookclubReadingStreakWorkspaceScenario: BugFixScenario = {
  id: "bugfix-bookclub-reading-streak-workspace",
  title: "BookClub Reading Streak & History",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Generic"],
  description:
    "Fix a reading-streak calculation and a history ordering in a small layered reading-tracker app",
  task: "Count the reading streak as the consecutive days, ending today, on which the member finished a book, and list the reading history most recently finished first.",
  // Grounded in the scenario's own visible streak test (tests/test_streak.py,
  // "current streak counts consecutive finished days"): calculate_streak(1, TODAY)
  // asserts 3 for Alex on 2026-06-28. The starter returns 0, while the same
  // suite's books-this-month (3) and total-pages (950) assertions both pass.
  symptom: {
    subject: "alex",
    tag: "reading streak",
    expected: "3 days",
    actual: "0 days",
    delta: "-3 days",
    caveat: "Books this month and total pages read are correct for the same reader.",
  },
  userReport:
    "Two things look wrong on my BookClub profile. My reading streak says 0 even though I've finished a book three days running, and my reading history is in a strange order — the book I finished today isn't at the top. The books themselves all show up fine; it's the streak number and the ordering that seem off.",
  tags: ["python", "real-codebase", "data-modeling", "flask"],
  estimatedTime: 40,
  problemStatement: `BookClub is a small reading-tracker app. Members finish books and the app shows a reading streak (consecutive days they finished a book), the number of books finished this month, total pages read, and a reading history.

**Incident Report**
A support ticket reports that a member's reading streak and reading history order look wrong, while books-this-month and total-pages read look fine. The codebase is layered: routes call services, and the services compute over the data model in \`app/\`.

Read the code, run the tests, and fix the defects in the service layer so every stat matches the behavior its docstring and the README describe. Do not break the stats that are already correct.`,
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
  groundTruth:
    "Two independent one-field defects: calculate_streak builds its set of days from started_at instead of finished_at, and get_reading_history sorts by started_at instead of finished_at. Both read fine in isolation because started_at is always set, which is why they survived review; only seeded data where a book is started days before it is finished reveals them. The two passing stats, books_this_month and total_pages_read, share the same get_reading_history input, proving the shared dependency is fine and isolating each bug to its own function. Terrain and herrings, all provably innocent: (1) Nadia (user 5) re-logged book 1, so a user can carry more than one event for the same book; the stat code tolerates duplicates and the finish-day streak collapses same-day finishes via a set; (2) the SQLAlchemy reference model declares a uq_user_book unique constraint that the in-memory mirror deliberately does not enforce, so the duplicate looks like a constraint violation but is intended terrain, not the bug; (3) in-progress books (finished_at is None) are already excluded by get_reading_history and never reach either calculation.",
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
    "Two of the four stats are wrong and two are right. Compare the wrong ones against what the README says each should mean.",
    "Every reading event carries more than one date. Check which date each calculation actually reads, and whether that matches the behavior its docstring promises.",
    "Reproduce with the seeded reader, then trace the streak number and the history order back to the exact field each was built from.",
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
  guidedLab: {
    version: "bookclub-guided-v1",
    milestones: [
      {
        id: "m1-read",
        title: "Read the codebase",
        purpose: "Build a mental map before you touch anything.",
        blocks: [
          {
            kind: "knowledge-card",
            id: "kc-layers",
            title: "Layered architecture",
            body: "This app has three layers. **Routes** receive requests and format responses — they don't compute values. **Services** hold the logic: the stat calculations and the history query. **Models** define the data shape. When an API value is wrong, it's almost always a *service* problem — not a route or a model problem.",
          },
          {
            kind: "knowledge-card",
            id: "kc-docstrings",
            title: "Docstrings are contracts",
            body: 'Every function here has a docstring describing what it *should* do. When a function has a bug, the docstring is usually still correct — the code drifted from it. So don\'t ask "what does this code do?" Ask "does this code do what the docstring says?" A mismatch is your bug.',
          },
          {
            kind: "knowledge-card",
            id: "kc-model",
            title: "Two dates on every event",
            body: "A `ReadingEvent` has `started_at` (always set — the day a book was opened) and `finished_at` (set only when the book is completed; `None` while in progress). `get_reading_history` returns only finished events.",
          },
          {
            kind: "checkpoint",
            id: "cp-read",
            title: "Before you move on",
            items: [
              "Name the two date fields on ReadingEvent and which one can be None.",
              "Say what get_reading_history guarantees about the events it returns.",
              "Find the three functions in stats_service.py and the one in reading_service.py.",
            ],
          },
        ],
        gate: { kind: "manual-ack" },
        revealTestSuites: [],
      },
      {
        id: "m2-reproduce",
        title: "Reproduce it",
        purpose: "A bug you haven't reproduced is a bug you haven't understood.",
        blocks: [
          {
            kind: "instruction",
            id: "inst-run",
            body: "Click **Run Tests**. The streak check fails while books-this-month and total-pages pass. Read the output yourself before reasoning about what it implies.",
          },
          {
            kind: "knowledge-card",
            id: "kc-shared",
            title: "One shared dependency",
            body: "All three stats call `get_reading_history()`. If that were broken, all three would be wrong. Two of them are correct — so the shared input is fine, and the bug lives inside the one function whose output is wrong.",
          },
          {
            kind: "quiz",
            id: "q-which",
            question:
              "The streak returns 0, but books-this-month and total-pages are correct. What does that tell you?",
            options: [
              {
                text: "get_reading_history returns the wrong events, but only the streak is affected",
                rationale:
                  "If the shared dependency were broken, all three stats would be affected — not just one.",
              },
              {
                text: "The bug is inside calculate_streak — the only function whose output is wrong",
                rationale:
                  "Two correct outputs from the shared dependency prove the input is fine, which isolates the bug to calculate_streak.",
              },
              {
                text: "It's inconclusive — the bug could be anywhere",
                rationale:
                  "The two correct values rule out the shared dependency, so it isn't inconclusive.",
              },
              {
                text: "The bug must be in the route layer",
                rationale: "Routes format service output; they don't compute the streak.",
              },
            ],
            correctIndex: 1,
            explanation:
              "All three stats share get_reading_history(). Two correct values prove the shared input is fine, isolating the bug to calculate_streak().",
          },
        ],
        gate: { kind: "manual-ack" },
        revealTestSuites: ["visible streak"],
      },
      {
        id: "m3-streak",
        title: "Fix the streak",
        purpose: "Diagnose the mismatch, then make the one-word change.",
        bugId: "bug-1-streak",
        blocks: [
          {
            kind: "knowledge-card",
            id: "kc-diagnose",
            title: "Diagnose before you fix",
            body: "Before changing anything, write the mismatch in plain language: what the docstring says, what the code does, and the one line where they disagree. A diagnosed fix tells you *why* it's right; a guessed fix only tells you the symptom moved.",
          },
          {
            kind: "instruction",
            id: "inst-streak",
            aiRestraint: true,
            body: "Read calculate_streak's docstring as a contract, then read the line that builds its set of days. Which field is it using — and is that the field the docstring describes? Make the one-word change in `app/services/stats_service.py`, then Run Tests. Try to spot it yourself before asking the debugging partner.",
          },
          {
            kind: "quiz",
            id: "q-why",
            question:
              "After you've fixed the streak: why was the finish date the right field, even though the start date is also always set and would run without error?",
            options: [
              {
                text: "started_at is nullable and would crash",
                rationale:
                  "started_at is always set — it wouldn't crash. That is what makes this bug subtle.",
              },
              {
                text: "A streak measures days you completed a book; when you started is irrelevant to whether you finished one that day",
                rationale: "The streak counts completion days, so it must use finished_at.",
              },
              {
                text: "started_at and finished_at are always equal anyway",
                rationale:
                  "They're usually different — a book is started days before it is finished.",
              },
              {
                text: "Either field works since get_reading_history already filters to finished books",
                rationale:
                  "Both dates exist on finished events, but started_at is the wrong day — it's when the book was opened, not completed.",
              },
            ],
            correctIndex: 1,
            explanation:
              "A reading streak is a measure of completion. It must count the days books were finished, so calculate_streak must aggregate by finished_at.",
          },
        ],
        gate: { kind: "tests-pass", testSuites: ["visible streak", "hidden streak"] },
        revealTestSuites: ["visible streak"],
      },
      {
        id: "m4-history",
        title: "Fix the history order",
        purpose: "Verifying thoroughly is how you find the second bug.",
        bugId: "bug-2-history",
        dependsOn: ["m3-streak"],
        blocks: [
          {
            kind: "knowledge-card",
            id: "kc-logic-vs-display",
            title: "Logic bugs vs display bugs",
            body: "Bug 1 was a *logic* bug — the computed value was wrong. This one is a *display* bug — the values are all correct, but they come back in the wrong order. Different category, different diagnosis: don't trace the calculation, look at the sort.",
          },
          {
            kind: "instruction",
            id: "inst-history",
            aiRestraint: true,
            body: 'The history should be "most recently finished first." Read get_reading_history\'s docstring, then look only at its `sorted(...)` key. Which field is it ordering by? Make the one-word change in `app/services/reading_service.py`, then Run Tests.',
          },
          {
            kind: "quiz",
            id: "q-rootcause",
            question:
              "Both bugs used the wrong field (started_at instead of finished_at). Do they have the same root cause?",
            options: [
              {
                text: "Yes — one find-and-replace would fix both, so it's one root cause",
                rationale:
                  "Same fix is not the same root cause — these are two independent mistakes in two functions.",
              },
              {
                text: "No — one is a wrong computed value (logic), the other is correct data in the wrong order (display); different categories needing different diagnosis",
                rationale:
                  "Same wrong field, but structurally different mistakes in different functions.",
              },
              {
                text: "Yes — the developer was confused about the fields, which is a single cause",
                rationale:
                  'A shared pattern is worth noting, but "same root cause" means one thing caused both — here each is independently present.',
              },
              {
                text: "No — they're in different files, so by definition different causes",
                rationale:
                  "Different files don't define root cause; the real distinction is logic vs display.",
              },
            ],
            correctIndex: 1,
            explanation:
              "Same wrong field — and that shared confusion (start vs finish date) is worth grepping for elsewhere. But here it surfaced as two different bug CLASSES: a logic error (wrong value) and a display error (wrong order), each needing its own diagnosis path.",
          },
          {
            kind: "checkpoint",
            id: "cp-done",
            title: "Verify everything",
            items: [
              "Streak, history, books-this-month, and total-pages all pass.",
              "You can explain each fix in one sentence.",
              "You verified rather than assuming — that's how you found the second bug.",
            ],
          },
        ],
        gate: { kind: "tests-pass", testSuites: ["visible history order", "hidden history"] },
        revealTestSuites: ["visible history order"],
      },
    ],
  },
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

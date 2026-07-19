// Sealed legacy-bugfix answer content (SERVER-ONLY). Moved out of the client
// scenario module so the root cause, ground truth, rubric, and reference solution
// never ship in the browser bundle. The window guard is the runtime seal.
//
// Note: this lab's guidedLab overlay is intentionally instructional and stays on
// the client (it teaches the fix step by step). Only the machine-graded answer
// fields and the two fixed reference files are sealed here.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

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

export const sealed: SealedLegacyScenario = {
  id: "bugfix-bookclub-reading-streak-workspace",
  bugDescription:
    "Two independent defects in the reading services: the streak aggregates events by their start date rather than their finish date, and the history list sorts by start date rather than finish date.",
  groundTruth:
    "Two independent one-field defects: calculate_streak builds its set of days from started_at instead of finished_at, and get_reading_history sorts by started_at instead of finished_at. Both read fine in isolation because started_at is always set, which is why they survived review; only seeded data where a book is started days before it is finished reveals them. The two passing stats, books_this_month and total_pages_read, share the same get_reading_history input, proving the shared dependency is fine and isolating each bug to its own function. Terrain and herrings, all provably innocent: (1) Nadia (user 5) re-logged book 1, so a user can carry more than one event for the same book; the stat code tolerates duplicates and the finish-day streak collapses same-day finishes via a set; (2) the SQLAlchemy reference model declares a uq_user_book unique constraint that the in-memory mirror deliberately does not enforce, so the duplicate looks like a constraint violation but is intended terrain, not the bug; (3) in-progress books (finished_at is None) are already excluded by get_reading_history and never reach either calculation.",
  rootCauseRubric: [
    "Identifies that the streak and history are computed from the wrong date field.",
    "Explains why the finish date (not the start date) defines both a completion streak and a most-recently-finished ordering.",
    "Confirms in-progress books are excluded and the monthly/total stats are unaffected.",
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
}

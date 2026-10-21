import type { WorkspaceScenarioFile } from "@/lib/scenarios/types"

export const bookclubSourceFiles: WorkspaceScenarioFile[] = [
  {
    path: "app/models.py",
    role: "readonly",
    language: "python",
    content: `from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Reader:
    id: int
    name: str
    utc_offset_minutes: int = 0


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
    started_at: datetime
    finished_at: Optional[datetime] = None
`,
  },
  {
    path: "app/seed.py",
    role: "readonly",
    language: "python",
    content: `import json
from datetime import datetime
from pathlib import Path

from app.models import Book, Reader, ReadingEvent


def load_seed():
    payload = json.loads(Path("fixtures/readers.json").read_text())
    readers = [Reader(**row) for row in payload["readers"]]
    books = [Book(**row) for row in payload["books"]]
    events = []
    for row in payload["events"]:
        row = dict(row)
        row["started_at"] = datetime.fromisoformat(row["started_at"])
        if row["finished_at"] is not None:
            row["finished_at"] = datetime.fromisoformat(row["finished_at"])
        events.append(ReadingEvent(**row))
    return readers, books, events
`,
  },
  {
    path: "app/repository.py",
    role: "readonly",
    language: "python",
    content: `from copy import deepcopy

from app.seed import load_seed

_readers, _books, _events = load_seed()
_revision = 0


def reset(events=None):
    global _readers, _books, _events, _revision
    _readers, _books, _events = load_seed()
    if events is not None:
        _events = deepcopy(events)
    _revision = 0


def reader(user_id):
    return next(row for row in _readers if row.id == user_id)


def events_for(user_id):
    return [event for event in _events if event.user_id == user_id]


def pages_for(book_id):
    return next(book.pages for book in _books if book.id == book_id)


def revision():
    return _revision


def complete(user_id, event_id, finished_at):
    """Complete an owned event once; repeating the same completion is safe."""
    global _revision
    event = next((row for row in _events if row.id == event_id and row.user_id == user_id), None)
    if event is None:
        raise ValueError("Reading event not found")
    if finished_at.tzinfo is None or finished_at < event.started_at:
        raise ValueError("Completion must be an aware timestamp after the start")
    if event.finished_at is None:
        event.finished_at = finished_at
        _revision += 1
    return event
`,
  },
  {
    path: "app/calendar.py",
    role: "readonly",
    language: "python",
    content: `from datetime import timedelta, timezone

from app import repository


def reader_day(timestamp, user_id):
    """Convert a stored UTC timestamp to the reader's configured fixed offset."""
    offset = repository.reader(user_id).utc_offset_minutes
    return timestamp.astimezone(timezone(timedelta(minutes=offset))).date()
`,
  },
  {
    path: "app/services/stats_service.py",
    role: "editable",
    language: "python",
    content: `from datetime import timedelta

from app import repository
from app.calendar import reader_day


def calculate_streak(user_id, today):
    """Count consecutive completion days ending today in the reader's calendar."""
    events = [event for event in repository.events_for(user_id) if event.finished_at is not None]
    days = {reader_day(event.started_at, user_id) for event in events}
    streak = 0
    day = today
    while day in days:
        streak += 1
        day -= timedelta(days=1)
    return streak


def books_this_month(user_id, today):
    """Count completed reading events in today's local year and month, including rereads."""
    events = [event for event in repository.events_for(user_id) if event.finished_at is not None]
    return sum(1 for event in events
               if (event.finished_at.year, event.finished_at.month) == (today.year, today.month))


def total_pages_read(user_id):
    """Count pages for each completed reading event; in-progress books contribute zero."""
    return sum(repository.pages_for(event.book_id) for event in repository.events_for(user_id)
               if event.finished_at is not None)
`,
  },
  {
    path: "app/services/reading_service.py",
    role: "editable",
    language: "python",
    content: `from datetime import datetime

from app import repository


def get_reading_history(user_id, limit=2, cursor=None):
    """Return finished events newest first, breaking ties by descending event ID.

    Cursor is '<ISO completion timestamp>|<event ID>'. Pages exclude the cursor
    event and must visit every event exactly once, including equal timestamps.
    """
    if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 50:
        raise ValueError("Page size must be between 1 and 50")
    events = [event for event in repository.events_for(user_id) if event.finished_at is not None]
    events.sort(key=lambda event: event.started_at, reverse=True)
    if cursor is not None:
        try:
            timestamp, event_id = cursor.rsplit("|", 1)
            boundary = datetime.fromisoformat(timestamp)
            int(event_id)
            if boundary.tzinfo is None:
                raise ValueError("Missing timezone")
        except (ValueError, AttributeError):
            raise ValueError("Invalid history cursor") from None
        events = [event for event in events if event.finished_at < boundary]
    page = events[:limit]
    next_cursor = None
    if len(events) > limit:
        last = page[-1]
        next_cursor = f"{last.finished_at.isoformat()}|{last.id}"
    return {"events": page, "next_cursor": next_cursor}
`,
  },
  {
    path: "app/cache.py",
    role: "readonly",
    language: "python",
    content: `_entries = {}


def clear():
    _entries.clear()


def get(key):
    return _entries.get(key)


def put(key, value):
    _entries[key] = value
`,
  },
  {
    path: "app/services/dashboard_service.py",
    role: "editable",
    language: "python",
    content: `from app import cache, repository
from app.services.stats_service import books_this_month, calculate_streak, total_pages_read


def dashboard(user_id, today):
    """Return a fresh, reader-scoped snapshot; callers may modify their response."""
    key = "dashboard"
    cached = cache.get(key)
    if cached is not None:
        return cached
    result = {
        "user_id": user_id,
        "reading_streak": calculate_streak(user_id, today),
        "books_this_month": books_this_month(user_id, today),
        "total_pages_read": total_pages_read(user_id),
    }
    cache.put(key, result)
    return result
`,
  },
  {
    path: "app/routes.py",
    role: "readonly",
    language: "python",
    content: `from datetime import datetime

from app import repository
from app.services.dashboard_service import dashboard
from app.services.reading_service import get_reading_history


def get_profile(user_id, today, limit=2, cursor=None):
    """Adapter for GET /readers/:id/profile. Authentication supplies user_id."""
    repository.reader(user_id)
    history = get_reading_history(user_id, limit, cursor)
    return {
        "stats": dashboard(user_id, today),
        "history": [{"event_id": event.id, "book_id": event.book_id,
                     "finished_at": event.finished_at.isoformat()} for event in history["events"]],
        "next_cursor": history["next_cursor"],
    }


def finish_book(user_id, event_id, finished_at, today):
    """Adapter for POST /readers/:id/completions; ownership is checked before mutation."""
    repository.complete(user_id, event_id, datetime.fromisoformat(finished_at))
    return get_profile(user_id, today)
`,
  },
  {
    path: "app/__init__.py",
    role: "readonly",
    language: "python",
    hidden: true,
    content: ``,
  },
  {
    path: "app/services/__init__.py",
    role: "readonly",
    language: "python",
    hidden: true,
    content: ``,
  },
]

import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

export const sealed: SealedLegacyScenario = {
  id: "bugfix-bookclub-reading-streak-workspace",
  bugDescription:
    "Completion dates, stable cursors, reader-local month boundaries, and cached dashboard identity drifted from the product contract.",
  groundTruth:
    "Streaks aggregate started_at instead of finished_at. History sorts by started_at and its cursor drops equal-time events. Monthly totals compare UTC year/month instead of reader-local values. Dashboard caching uses a global key and aliases mutable response objects; key by reader, date, offset and revision, and copy snapshots on read/write.",
  rootCauseRubric: [
    "Restore streaks: explain completion-day semantics; use finished_at, unique dates, and consecutive days without changing page totals.",
    "Repair history: explain finished_at/event-ID ordering and cursor ties; preserve rereads and verify multiple pages.",
    "Reconcile calendars: explain reader-local month/year boundaries, fractional offsets and New Year; preserve UTC storage.",
    "Refresh dashboards: explain reader/date/offset/revision identity, post-mutation freshness and object ownership across repeated requests.",
    "Release check: verify all contracts together on the final code revision; passing checks alone do not prove causal understanding.",
    "Reproduces each failure before editing.",
    "Distinguishes identity, ordering, calendar and cache ownership contracts.",
    "Preserves existing behavior and verifies the full request path.",
  ],
  referenceFiles: [
    {
      path: "app/services/dashboard_service.py",
      role: "editable",
      language: "python",
      content: `from copy import deepcopy

from app import cache, repository
from app.services.stats_service import books_this_month, calculate_streak, total_pages_read


def dashboard(user_id, today):
    """Return a fresh, reader-scoped snapshot; callers may modify their response."""
    key = (user_id, today.isoformat(), repository.reader(user_id).utc_offset_minutes, repository.revision())
    cached = cache.get(key)
    if cached is not None:
        return deepcopy(cached)
    result = {
        "user_id": user_id,
        "reading_streak": calculate_streak(user_id, today),
        "books_this_month": books_this_month(user_id, today),
        "total_pages_read": total_pages_read(user_id),
    }
    cache.put(key, deepcopy(result))
    return result
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
    events.sort(key=lambda event: (event.finished_at, event.id), reverse=True)
    if cursor is not None:
        try:
            timestamp, event_id = cursor.rsplit("|", 1)
            boundary = datetime.fromisoformat(timestamp)
            int(event_id)
            if boundary.tzinfo is None:
                raise ValueError("Missing timezone")
        except (ValueError, AttributeError):
            raise ValueError("Invalid history cursor") from None
        events = [event for event in events if (event.finished_at, event.id) < (boundary, int(event_id))]
    page = events[:limit]
    next_cursor = None
    if len(events) > limit:
        last = page[-1]
        next_cursor = f"{last.finished_at.isoformat()}|{last.id}"
    return {"events": page, "next_cursor": next_cursor}
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
    days = {reader_day(event.finished_at, user_id) for event in events}
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
               if (reader_day(event.finished_at, user_id).year, reader_day(event.finished_at, user_id).month) == (today.year, today.month))


def total_pages_read(user_id):
    """Count pages for each completed reading event; in-progress books contribute zero."""
    return sum(repository.pages_for(event.book_id) for event in repository.events_for(user_id)
               if event.finished_at is not None)
`,
    },
  ],
}

"""Count click sessions per user from a raw event feed.

The Growth analyst reads the per-user session count each morning to see how many
distinct visits each user made overnight. Two consecutive clicks by the same user
belong to the same session when the gap between them is short enough; a longer gap
starts a new session. Input is the comma-separated event feed the collector writes;
see task.md for the column layout and the delivery contract the feed may violate.
"""

import calendar
import sys
import time

GAP_SECONDS = 1800
TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
FIELD_COUNT = 4


def parse_line(raw):
    """Turn one feed line into an event dict, or None if it is not a usable
    event (a comment line or a malformed line)."""
    line = raw.rstrip("\n")
    if not line or line.startswith("#"):
        return None
    parts = line.split(",")
    if len(parts) != FIELD_COUNT:
        return None
    ts_text, user_id, event_id, platform = (part.strip() for part in parts)
    if not user_id or not event_id:
        return None
    try:
        epoch = calendar.timegm(time.strptime(ts_text, TIMESTAMP_FORMAT))
    except ValueError:
        return None
    return {
        "ts_text": ts_text,
        "epoch": epoch,
        "user_id": user_id,
        "event_id": event_id,
        "platform": platform,
    }


def read_events(path):
    """Read the feed and keep only well-formed events, in arrival order."""
    events = []
    with open(path) as handle:
        for raw in handle:
            event = parse_line(raw)
            if event is not None:
                events.append(event)
    return events


def dedupe(events):
    """Drop redeliveries: the bus is at-least-once, so the same event_id can
    arrive more than once. Keep the first occurrence of each event_id."""
    seen = set()
    unique = []
    for event in events:
        if event["event_id"] in seen:
            continue
        seen.add(event["event_id"])
        unique.append(event)
    return unique


def group_by_user(events):
    """Bucket events under each user_id, keeping first-seen user order."""
    grouped = {}
    for event in events:
        user_id = event["user_id"]
        if user_id not in grouped:
            grouped[user_id] = []
        grouped[user_id].append(event)
    return grouped


def count_sessions(user_events):
    """Count inactivity-gap sessions for one user's events; the events are
    ordered by timestamp first, then each gap that breaks the inactivity window
    opens a new session."""
    ordered = sorted(user_events, key=lambda event: event["ts_text"])
    sessions = 0
    previous_epoch = None
    for event in ordered:
        if previous_epoch is None:
            sessions += 1
        elif event["epoch"] - previous_epoch >= GAP_SECONDS:
            sessions += 1
        previous_epoch = event["epoch"]
    return sessions


def build_counts(events):
    """Map each user_id to its session count."""
    grouped = group_by_user(dedupe(events))
    counts = {}
    for user_id in grouped:
        counts[user_id] = count_sessions(grouped[user_id])
    return counts


def print_counts(events):
    """Print each user's session count, users in sorted order."""
    print("=== sessions per user (gap " + str(GAP_SECONDS) + "s) ===")
    counts = build_counts(events)
    for user_id in sorted(counts):
        print(user_id + ": " + str(counts[user_id]))


def main():
    path = sys.argv[1]
    print_counts(read_events(path))


if __name__ == "__main__":
    main()

"""Overnight cache eviction report.

Replays the day's cache write log, runs the eviction sweep at a fixed
checkpoint, and prints how many entries are still live in each namespace.
The capacity-planning on-call reads this report every morning to decide how
much memory each namespace needs, so the per-namespace counts have to line up
with the cache's own metrics endpoint.

Log columns (comma-separated): namespace,key,expires_at[,pinned]
An entry is expired when its expires_at is at or before the checkpoint NOW.
"""

import sys

NOW = 1700000000
MIN_FIELDS = 3
MAX_FIELDS = 4
PINNED_FLAG = "pinned"


def parse_line(raw):
    """Return an entry dict for a usable log line, or None to skip it."""
    line = raw.rstrip("\n")
    if not line or line.startswith("#"):
        return None
    parts = [part.strip() for part in line.split(",")]
    if len(parts) < MIN_FIELDS or len(parts) > MAX_FIELDS:
        return None
    namespace, key, expires_at = parts[0], parts[1], parts[2]
    try:
        expires_value = int(expires_at)
    except ValueError:
        return None
    pinned = len(parts) == MAX_FIELDS and parts[3] == PINNED_FLAG
    return {
        "namespace": namespace,
        "key": key,
        "expires_at": expires_value,
        "pinned": pinned,
    }


def read_events(path):
    """Load every usable write from the log in arrival order."""
    events = []
    with open(path) as handle:
        for raw in handle:
            event = parse_line(raw)
            if event is not None:
                events.append(event)
    return events


def build_cache(events):
    """Fold writes into per-namespace entries.

    A later write to the same namespace and key refreshes that entry in
    place, so the most recent expiry wins and the entry keeps its slot.
    """
    cache = {}
    for event in events:
        namespace = event["namespace"]
        if namespace not in cache:
            cache[namespace] = {}
        cache[namespace][event["key"]] = event
    return cache


def evict_expired(entries, now):
    """Drop the entries whose expiry is at or before now, in place."""
    index = 0
    while index < len(entries):
        entry = entries[index]
        if entry["expires_at"] <= now:
            entries.pop(index)
        index += 1
    return entries


def count_live(cache, now):
    """Report how many entries survive the sweep in each namespace."""
    report = {}
    for namespace in cache:
        entries = list(cache[namespace].values())
        survivors = evict_expired(entries, now)
        report[namespace] = len(survivors)
    return report


def format_report(report):
    """Render the report with namespaces in sorted order."""
    lines = ["=== Live entries by namespace ==="]
    for namespace in sorted(report):
        lines.append(namespace + ": " + str(report[namespace]))
    return "\n".join(lines)


def main():
    events = read_events(sys.argv[1])
    cache = build_cache(events)
    report = count_live(cache, NOW)
    print(format_report(report))


if __name__ == "__main__":
    main()

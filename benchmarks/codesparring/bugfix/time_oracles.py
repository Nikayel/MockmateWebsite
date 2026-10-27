"""Independent UTC bucketing and inactivity-session calculations."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from .payment_oracles import rows, render


def epoch(timestamp: str) -> int:
    return int(datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp())


def windows(feed: str) -> str:
    seen, buckets = set(), defaultdict(list)
    for timestamp, metric, sample_id, amount in rows(feed, 4):
        if metric != "web.5xx":
            continue
        try:
            value, time = int(amount), epoch(timestamp)
        except ValueError:
            continue
        if sample_id in seen:
            continue
        seen.add(sample_id)
        buckets[time // 60 * 60].append(value)
    result = "=== web.5xx per 60s window ===\n"
    if buckets:
        for start in range(min(buckets), max(buckets) + 60, 60):
            values = buckets[start]
            label = datetime.fromtimestamp(start, timezone.utc).strftime("%H:%M:%S")
            result += f"{label}  count={len(values)}  sum={sum(values)}\n"
    return result


def sessions(feed: str) -> str:
    seen, timestamps = set(), defaultdict(list)
    for timestamp, user, event_id, platform in rows(feed, 4):
        try:
            time = epoch(timestamp)
        except ValueError:
            continue
        if not user or not event_id or event_id in seen:
            continue
        seen.add(event_id)
        timestamps[user].append(time)
    counts = {}
    for user, times in timestamps.items():
        ordered = sorted(times)
        counts[user] = 1 + sum(b - a > 1800 for a, b in zip(ordered, ordered[1:]))
    return render("=== sessions per user (gap 1800s) ===", counts)


def monitors(feed: str) -> str:
    thresholds, seen, values = {}, set(), defaultdict(list)
    for line in feed.splitlines():
        if not line or line.startswith("#"):
            continue
        parts = [part.strip() for part in line.split(",")]
        try:
            if len(parts) == 4 and parts[0] == "monitor":
                critical = int(parts[2])
                int(parts[3])
                thresholds[parts[1]] = critical
            elif len(parts) == 5 and parts[0] == "sample":
                _, series, sample_id, timestamp, raw = parts
                time, value = epoch(timestamp), int(raw)
                if epoch("2026-05-01T12:00:00Z") <= time < epoch("2026-05-01T12:05:00Z"):
                    if sample_id not in seen:
                        seen.add(sample_id)
                        values[series].append(value)
        except ValueError:
            continue
    result = "=== Monitor status ===\n"
    for series in sorted(thresholds):
        samples = values[series]
        # Multiplication avoids depending on the reference's floating-point average.
        status = "NO DATA" if not samples else "ALERT" if sum(samples) >= thresholds[series] * len(samples) else "OK"
        result += f"{series}: {status}\n"
    return result

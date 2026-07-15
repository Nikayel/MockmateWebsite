"""Evaluate each monitored series against its threshold for one window.

On-call reads this status board during an incident: for every monitored series
it reports whether the window average breached the alert threshold. See task.md
for the column layout and the delivery contract the feed may violate.
"""

import calendar
import sys
import time

TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
WINDOW_START = "2026-05-01T12:00:00Z"
WINDOW_END = "2026-05-01T12:05:00Z"


def to_epoch(ts_text):
    return calendar.timegm(time.strptime(ts_text, TIMESTAMP_FORMAT))


def parse_feed(path):
    """Read the feed into monitor thresholds and in-window samples."""
    monitors = {}
    samples = []
    window_start = to_epoch(WINDOW_START)
    window_end = to_epoch(WINDOW_END)
    with open(path) as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            parts = [part.strip() for part in line.split(",")]
            if parts[0] == "monitor" and len(parts) == 4:
                try:
                    monitors[parts[1]] = {"crit": int(parts[2]), "warn": int(parts[3])}
                except ValueError:
                    continue
            elif parts[0] == "sample" and len(parts) == 5:
                try:
                    epoch = to_epoch(parts[3])
                    value = int(parts[4])
                except ValueError:
                    continue
                if window_start <= epoch < window_end:
                    samples.append({"series": parts[1], "sample_id": parts[2], "value": value})
    return monitors, samples


def group_values(samples):
    """Map each series to its in-window values, dropping at-least-once
    redeliveries by sample_id."""
    seen = set()
    by_series = {}
    for sample in samples:
        if sample["sample_id"] in seen:
            continue
        seen.add(sample["sample_id"])
        by_series.setdefault(sample["series"], []).append(sample["value"])
    return by_series


def evaluate(values, monitor):
    """Return the status for one series' window values against its monitor."""
    average = sum(values) / len(values) if values else 0
    if average >= monitor["crit"]:
        return "ALERT"
    return "OK"


def main():
    monitors, samples = parse_feed(sys.argv[1])
    by_series = group_values(samples)
    print("=== Monitor status ===")
    for series in sorted(monitors):
        print(series + ": " + evaluate(by_series.get(series, []), monitors[series]))


if __name__ == "__main__":
    main()

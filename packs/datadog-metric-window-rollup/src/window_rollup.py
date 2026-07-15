"""Roll raw metric samples into fixed 60-second windows.

The on-call SRE reads the per-window count and sum for one metric to decide
whether the current minute breached an alert threshold. Input is the
comma-separated feed emitted by the collector agents; see task.md for the
column layout and the delivery contract the feed is allowed to violate.
"""

import calendar
import sys
import time

WINDOW_SECONDS = 60
TARGET_METRIC = "web.5xx"
TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def parse_line(raw, metric):
    """Turn one feed line into a sample dict, or None if it is not a usable
    sample for this metric (comment, malformed, or a different metric)."""
    line = raw.rstrip("\n")
    if not line or line.startswith("#"):
        return None
    parts = line.split(",")
    if len(parts) != 4:
        return None
    ts_text, metric_name, sample_id, value = (part.strip() for part in parts)
    if metric_name != metric:
        return None
    if value == "":
        return None
    try:
        value_num = int(value)
    except ValueError:
        return None
    try:
        epoch = calendar.timegm(time.strptime(ts_text, TIMESTAMP_FORMAT))
    except ValueError:
        return None
    return {
        "ts_text": ts_text,
        "epoch": epoch,
        "sample_id": sample_id,
        "value": value_num,
    }


def parse_samples(path, metric):
    """Read the feed and keep only well-formed samples for `metric`."""
    samples = []
    with open(path) as handle:
        for raw in handle:
            sample = parse_line(raw, metric)
            if sample is not None:
                samples.append(sample)
    return samples


def dedupe(samples):
    """Drop redeliveries: the bus is at-least-once, so the same sample_id can
    arrive more than once. Keep the first occurrence of each sample_id."""
    seen = set()
    unique = []
    for sample in samples:
        if sample["sample_id"] in seen:
            continue
        seen.add(sample["sample_id"])
        unique.append(sample)
    return unique


def window_start(epoch):
    """Return the epoch second at which `epoch`'s 60-second window begins."""
    return epoch - (epoch % WINDOW_SECONDS)


def window_starts(samples):
    """Every window start from the first sample's window through the last."""
    first = window_start(samples[0]["epoch"])
    last = window_start(samples[-1]["epoch"])
    return list(range(first, last + WINDOW_SECONDS, WINDOW_SECONDS))


def rollup(samples):
    """Aggregate samples into (window_start, count, sum) rows, oldest first."""
    if not samples:
        return []
    ordered = dedupe(samples)
    ordered.sort(key=lambda sample: sample["ts_text"])
    rows = []
    for start in window_starts(ordered):
        end = start + WINDOW_SECONDS
        in_window = [s for s in ordered if start <= s["epoch"] <= end]
        total = sum(sample["value"] for sample in in_window)
        rows.append((start, len(in_window), total))
    return rows


def format_label(start):
    """Human-readable UTC clock time for a window start."""
    return time.strftime("%H:%M:%S", time.gmtime(start))


def print_rollup(metric, samples):
    print("=== " + metric + " per 60s window ===")
    for start, count, total in rollup(samples):
        print(format_label(start) + "  count=" + str(count) + "  sum=" + str(total))


def main():
    path = sys.argv[1]
    print_rollup(TARGET_METRIC, parse_samples(path, TARGET_METRIC))


if __name__ == "__main__":
    main()

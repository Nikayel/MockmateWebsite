"""Independent state reducers for cache, logging, and pipeline reports."""
from __future__ import annotations

from collections import Counter

from .payment_oracles import rows, render


def logs(feed: str) -> str:
    totals = {}
    for line in feed.splitlines():
        if not line or line.startswith("#"):
            continue
        parts = line.split(None, 3)
        if len(parts) != 4:
            continue
        timestamp, service, level, message = parts
        totals[service] = totals.get(service, 0) + int(level.upper() == "ERROR")
    return "=== ERROR lines by service ===\n" + "".join(
        f"{service}: {count}\n" for service, count in totals.items())


def cache(feed: str) -> str:
    latest = {}
    namespaces = set()
    for line in feed.splitlines():
        if not line or line.startswith("#"):
            continue
        parts = [part.strip() for part in line.split(",")]
        if len(parts) not in (3, 4):
            continue
        try:
            expiry = int(parts[2])
        except ValueError:
            continue
        namespaces.add(parts[0])
        latest[(parts[0], parts[1])] = expiry
    totals = {namespace: sum(expiry > 1700000000 for (ns, key), expiry in latest.items() if ns == namespace)
              for namespace in namespaces}
    return render("=== Live entries by namespace ===", totals)


def pipelines(feed: str) -> str:
    order = ("normalize", "enrich", "geocode", "publish")
    seen, totals = set(), Counter()
    for pipeline, record_id, raw_size, timestamp in rows(feed, 4):
        if record_id in seen:
            continue
        seen.add(record_id)
        try:
            valid = int(raw_size) > 0
        except ValueError:
            valid = False
        if pipeline in order and valid:
            totals[pipeline] += 1
    return "=== Records materialized by pipeline ===\n" + "".join(
        f"{pipeline}: materialized={totals[pipeline]}\n" for pipeline in order)

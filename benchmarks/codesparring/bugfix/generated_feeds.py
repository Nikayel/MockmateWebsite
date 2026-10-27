"""Seeded novel identities, amounts, interleavings, boundaries, and duplicate deliveries."""
from __future__ import annotations

import random
from datetime import datetime, timedelta


def timestamp(offset: int) -> str:
    return (datetime(2026, 5, 1, 12) + timedelta(seconds=offset)).strftime("%Y-%m-%dT%H:%M:%SZ")


def generate(task_id: str, rng: random.Random, count: int = 32) -> list[str]:
    feeds = []
    for trial in range(count):
        rows = []
        if task_id == "datadog-monitor-empty-series":
            rows = [f"monitor,series{i},{i + 3},1" for i in range(4)]
        for i in range(12):
            identity = f"new{trial}_{i}"
            name = f"tenant{rng.randint(0, 3)}"
            amount = rng.randint(0, 20)
            if task_id == "stripe-webhook-idempotency":
                row = f"{identity},{rng.choice(['charge', 'refund'])},{name},{amount},{timestamp(i)}"
            elif task_id == "palantir-entity-resolution-merge":
                row = f"{rng.choice(['commercial', 'gov'])},{rng.choice([name, name.upper()])},{identity}"
            elif task_id == "datadog-metric-window-rollup":
                row = f"{timestamp(rng.choice([0, 59, 60, 61, 120, 181, 240]))},{rng.choice(['web.5xx', 'other'])},{identity},{amount}"
            elif task_id == "generic-session-window-count":
                row = f"{timestamp(rng.choice([0, 1799, 1800, 1801, 3600, 5401]))},{name},{identity},web"
            elif task_id == "generic-log-error-rollup":
                row = f"{timestamp(i)} {name} {rng.choice(['INFO', 'WARN', 'ERROR'])} message with spaces"
            elif task_id == "datadog-monitor-empty-series":
                row = f"sample,series{rng.randint(0, 2)},{identity},{timestamp(rng.choice([-1, 0, 30, 299, 300]))},{amount}"
            elif task_id == "generic-cache-eviction-mutation":
                row = f"{name},key{rng.randint(0, 3)},{1700000000 + rng.choice([-2, -1, 0, 1, 2])}"
            elif task_id == "stripe-payout-batch-mutation":
                row = f"{identity},{name},{rng.choice(['usd', 'eur', 'gbp', 'cad'])},{amount},{rng.choice(['pending', 'pending', 'hold'])}"
            elif task_id == "palantir-pipeline-order-dependence":
                row = f"{rng.choice(['normalize', 'enrich', 'geocode', 'publish'])},{identity},{rng.choice(['0', '1', '2', 'NaN'])},{timestamp(i)}"
            elif task_id == "palantir-foundry-usage-rollup":
                row = f"{rng.choice(['primary', 'backup'])},{rng.choice([name, name.upper()])},{identity},{amount}"
            else:
                raise ValueError(f"Unknown pack: {task_id}")
            rows.append(row)
            if task_id != "generic-log-error-rollup" and rng.random() < 0.35:
                duplicate = row
                if task_id == "palantir-foundry-usage-rollup":
                    stream, rest = row.split(",", 1)
                    duplicate = ("backup" if stream == "primary" else "primary") + "," + rest
                rows.append(duplicate)
        # Ordering is part of the input for cache, payout, log, and first-seen dedupe contracts.
        rng.shuffle(rows)
        feeds.append("# authored generated fixture\n" + "\n".join(rows) + "\nmalformed\n")
    return feeds

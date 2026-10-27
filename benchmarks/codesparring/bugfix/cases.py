"""Verify the public fixture independently and construct private regression feeds."""
from __future__ import annotations

import hashlib
import random
from typing import Callable

from ..contracts import BENCHMARK_SEED, Case, Json
from .edge_feeds import EDGE_FEEDS
from .generated_feeds import generate
from .payment_oracles import entities, payouts, usage, webhook
from .state_oracles import cache, logs, pipelines
from .time_oracles import monitors, sessions, windows

ORACLES: dict[str, Callable[[str], str]] = {
    "stripe-webhook-idempotency": webhook,
    "palantir-entity-resolution-merge": entities,
    "datadog-metric-window-rollup": windows,
    "generic-session-window-count": sessions,
    "generic-log-error-rollup": logs,
    "datadog-monitor-empty-series": monitors,
    "generic-cache-eviction-mutation": cache,
    "stripe-payout-batch-mutation": payouts,
    "palantir-pipeline-order-dependence": pipelines,
    "palantir-foundry-usage-rollup": usage,
}


def build_cases(task: dict[str, Json]) -> list[Case]:
    task_id = task["id"]
    oracle = ORACLES[task_id]
    if oracle(task["fixture"]) != task["expectedStdout"]:
        raise ValueError(f"Public output disagrees with independent oracle: {task_id}")
    cases = [Case("public-reproduction", {"fixture": task["fixture"]},
                  task["expectedStdout"], "public", "shipped")]
    rng = random.Random(int(hashlib.sha256(f"{BENCHMARK_SEED}:{task_id}".encode()).hexdigest(), 16))
    for category, feeds in [("boundary", EDGE_FEEDS[task_id]), ("generated", generate(task_id, rng))]:
        for i, feed in enumerate(feeds):
            cases.append(Case(f"{category}-{i}", {"fixture": feed}, oracle(feed), "private", category))
    return cases

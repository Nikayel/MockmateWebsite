"""Score completed human reviews, with equal task weighting and task-cluster intervals."""
from __future__ import annotations

import csv
import json
import random
from collections import defaultdict
from pathlib import Path
from statistics import mean

from .contracts import BENCHMARK_SEED, Json

METRICS = ("correct", "grounded", "actionable", "level_compliant",
           "premature_disclosure", "unsupported_diagnosis")


def cluster_interval(values: list[float]) -> list[float] | None:
    if len(values) < 2:
        return None
    rng = random.Random(BENCHMARK_SEED)
    draws = sorted(mean(rng.choices(values, k=len(values))) for _ in range(2000))
    return [draws[49], draws[1949]]


def score(annotations: Path, responses: Path, requests: list[dict[str, Json]],
          allow_partial: bool = False) -> dict[str, Json]:
    known = {request["id"]: request for request in requests}
    outputs = {}
    for line in responses.read_text().splitlines():
        response = json.loads(line)
        if (not isinstance(response, dict) or set(response) != {"id", "request_id", "model", "content", "benchmark_version", "recipe_sha256"}
                or any(not isinstance(value, str) or not value.strip() for value in response.values())):
            raise ValueError("Each response needs string id, request_id, model, and content")
        if response["id"] in outputs or response["request_id"] not in known:
            raise ValueError("Duplicate response ID or unknown request")
        request = known[response["request_id"]]
        if any(response[key] != request[key] for key in ("benchmark_version", "recipe_sha256")):
            raise ValueError("Response belongs to a different benchmark revision")
        outputs[response["id"]] = response
    reviewed = defaultdict(list)
    reviewers, models, seen = set(), set(), set()
    with annotations.open(newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"request_id", "response_id", "reviewer", *METRICS, "notes"}
        if set(reader.fieldnames or []) != required:
            raise ValueError("Annotation columns do not match the template")
        for row in reader:
            if set(row) != required or any(not isinstance(value, str) for value in row.values()):
                raise ValueError("Malformed annotation row")
            if all(not row[key].strip() for key in required - {"request_id"}):
                continue
            response = outputs.get(row["response_id"])
            if (response is None or response["request_id"] != row["request_id"]
                    or not row["reviewer"].strip()):
                raise ValueError("A completed review needs a matching response and named reviewer")
            key = (row["response_id"], row["reviewer"])
            if key in seen:
                raise ValueError("Duplicate review would overweight a response")
            seen.add(key)
            if any(row[metric] not in {"0", "1"} for metric in METRICS):
                raise ValueError("Every completed rating must be 0 or 1; blanks are unmeasured")
            reviewed[row["response_id"]].append({metric: int(row[metric]) for metric in METRICS})
            reviewers.add(row["reviewer"])
            models.add(response["model"])
    if not reviewed:
        raise ValueError("No completed reviews; do not report empty ratings as zero")
    if len(models) != 1:
        raise ValueError("Score one model at a time; do not pool model identities")
    covered = {outputs[response_id]["request_id"] for response_id in reviewed}
    if not allow_partial and covered != set(known):
        raise ValueError("Incomplete coverage; use --allow-partial for a labeled pilot")
    scores = {}
    for metric in METRICS:
        by_request, tasks = defaultdict(list), defaultdict(list)
        micro = []
        for response_id, reviews in reviewed.items():
            value = mean(review[metric] for review in reviews)
            by_request[outputs[response_id]["request_id"]].append(value)
            micro.append(value)
        for request_id, values in by_request.items():
            tasks[known[request_id]["task_id"]].append(mean(values))
        task_means = [mean(values) for values in tasks.values()]
        scores[metric] = {"macro_task_mean": mean(task_means), "micro_response_mean": mean(micro),
                          "task_cluster_95pct_interval": cluster_interval(task_means)}
    return {"model": next(iter(models)), "status": "complete" if covered == set(known) else "partial",
            "reviewed_requests": len(covered), "expected_requests": len(known),
            "reviewed_responses": len(reviewed), "reviewers": len(reviewers),
            "task_count": len({known[request_id]["task_id"] for request_id in covered}),
            "scores": scores,
            "limits": "Intervals resample these tasks, not the broader problem distribution or rater uncertainty."}

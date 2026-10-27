"""Run the benchmark's fixture-health gate and emit frozen review artifacts."""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
from pathlib import Path

from .audit_task import evaluate
from .catalog import DIRECTORY, ROOT, artifact_digest, load_catalog
from .contracts import BENCHMARK_SEED
from .model_inputs import jsonl, private_label, requests_for
from .reporting import markdown, summarize
from .hint_scores import score


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["audit", "score"])
    parser.add_argument("--check", action="store_true", help="Verify artifacts without updating them")
    parser.add_argument("--responses", type=Path, help="JSONL outputs with id, request_id, model, content")
    parser.add_argument("--annotations", type=Path, help="Completed human-review CSV")
    parser.add_argument("--allow-partial", action="store_true", help="Explicitly score a pilot subset")
    args = parser.parse_args()
    if args.command == "score":
        if args.responses is None or args.annotations is None:
            parser.error("score requires --responses and --annotations")
        requests = [json.loads(line) for line in (DIRECTORY / "model-inputs.jsonl").read_text().splitlines()]
        catalog = load_catalog()
        current_digest = artifact_digest()
        if any(request["recipe_sha256"] != current_digest
               or request["benchmark_version"] != catalog["version"] for request in requests):
            raise ValueError("Model-input artifacts are stale; run benchmark:verify")
        print(json.dumps(score(args.annotations, args.responses, requests, args.allow_partial), indent=2))
        return
    catalog = load_catalog()
    recipe_digest = artifact_digest()
    rows, requests, labels = [], [], []
    state_count = 0
    for task in catalog["tasks"]:
        row, states = evaluate(task)
        rows.append(row)
        state_count += len(states)
        for state in states:
            requests.extend(requests_for(task, state, catalog["hintSystemPrompt"], catalog["version"], recipe_digest))
            labels.append(private_label(state))
        print(f"PASS {task['id']}: {row['reference']['passed']}/{row['reference']['total']} reference cases", flush=True)
    report = {
        "version": catalog["version"], "seed": BENCHMARK_SEED, "recipe_sha256": recipe_digest,
        "git_commit": catalog["sourceCommit"],
        "python_version": sys.version.split()[0],
        "summary": summarize(rows, len(requests), state_count), "tasks": rows,
        "model_evaluation": {"status": "not_run", "scores": None},
    }
    template = io.StringIO()
    writer = csv.writer(template, lineterminator="\n")
    writer.writerow(["request_id", "response_id", "reviewer", "correct", "grounded", "actionable",
                     "level_compliant", "premature_disclosure", "unsupported_diagnosis", "notes"])
    for request in requests:
        writer.writerow([request["id"], *([""] * 9)])
    artifacts = {
        DIRECTORY / "reports/qa.json": json.dumps(report, indent=2, sort_keys=True) + "\n",
        DIRECTORY / "reports/qa.md": markdown(report),
        DIRECTORY / "model-inputs.jsonl": jsonl(requests),
        DIRECTORY / "private/state-labels.jsonl": jsonl(labels),
        DIRECTORY / "annotations-template.csv": template.getvalue(),
    }
    for path, content in artifacts.items():
        if args.check:
            if not path.exists() or path.read_text() != content:
                raise ValueError(f"Benchmark artifact drift: {path.relative_to(ROOT)}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
    print(json.dumps(report["summary"], indent=2))


if __name__ == "__main__":
    main()

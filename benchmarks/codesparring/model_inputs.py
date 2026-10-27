"""Build model requests from a strict allowlist; keep QA labels in a separate artifact."""
from __future__ import annotations

import json

from .contracts import Json


def requests_for(task: dict[str, Json], state: dict[str, Json], policy: str,
                 version: str, recipe_digest: str) -> list[dict[str, Json]]:
    requests = []
    if set(state) != {"task_id", "state_id", "code", "observations", "private_kind", "private_correct"}:
        raise ValueError("Unexpected learner-state field; review the model-input boundary")
    context = {
        "problem": task["statement"], "constraints": task.get("constraints", []),
        "language": "python", "current_code": state["code"],
        "visible_test_evidence": state["observations"], "previous_hints": [],
    }
    for level in (1, 2, 3):
        request_id = f"{task['id']}/{state['state_id']}/L{level}"
        user = (f"Generate exactly one Level {level} hint for this learner. "
                "Use only the supplied evidence. If the current code already satisfies the task, "
                "do not invent a defect. Return JSON with title and content.\n\n" +
                json.dumps(context, ensure_ascii=False))
        requests.append({"id": request_id, "task_id": task["id"], "state_id": state["state_id"],
                         "benchmark_version": version, "recipe_sha256": recipe_digest,
                         "level": level, "messages": [{"role": "system", "content": policy},
                                                       {"role": "user", "content": user}]})
    return requests


def private_label(state: dict[str, Json]) -> dict[str, Json]:
    return {"task_id": state["task_id"], "state_id": state["state_id"],
            "authored_variant": state["private_kind"], "program_correct_on_suite": state["private_correct"],
            "hint_labels": None,
            "note": "Program correctness is executed QA. Hint quality still requires response review."}


def jsonl(rows: list[dict[str, Json]]) -> str:
    return "".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in rows)

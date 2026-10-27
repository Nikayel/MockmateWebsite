"""Load frozen authoring data and check its source lineage before every run."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from .contracts import Json

DIRECTORY = Path(__file__).resolve().parent
ROOT = DIRECTORY.parents[1]


def load_catalog() -> dict[str, Json]:
    catalog = json.loads((DIRECTORY / "catalog.json").read_text())
    selection = json.loads((DIRECTORY / "selection.json").read_text())
    tasks = catalog.get("tasks")
    if not isinstance(tasks, list) or len(tasks) != 20:
        raise ValueError("Expected exactly 20 frozen tasks")
    if catalog.get("version") != selection.get("version"):
        raise ValueError("Selection and snapshot versions disagree")
    if [task["id"] for task in tasks] != [task["id"] for task in selection["tasks"]]:
        raise ValueError("Selection and snapshot task IDs disagree")
    if len({task["id"] for task in tasks}) != 20:
        raise ValueError("Duplicate task IDs")
    for track in ("dsa", "bugfix"):
        if sum(task["track"] == track for task in tasks) != 10:
            raise ValueError(f"Expected exactly 10 {track} tasks")
    # v0 describes an authored snapshot, independent of later product scenarios.
    commit = selection["sourceCommit"]
    if len(commit) != 40 or any(char not in "0123456789abcdef" for char in commit):
        raise ValueError("Invalid source commit")
    def source_bytes(relative: str) -> bytes:
        path = (ROOT / relative).resolve()
        if not path.is_relative_to(ROOT):
            raise ValueError("Source lineage path leaves the repository")
        return subprocess.run(["git", "show", f"{commit}:{relative}"], cwd=ROOT,
                              check=True, capture_output=True).stdout
    if hashlib.sha256(source_bytes("lib/agents/hints/prompts.ts")).hexdigest() != catalog["hintPolicyHash"]:
        raise ValueError("Hint policy drift; re-export and review the benchmark")
    for task in tasks:
        for relative, expected in task["sourceHashes"].items():
            path = (ROOT / relative).resolve()
            if not path.is_relative_to(ROOT):
                raise ValueError("Source lineage path leaves the repository")
            if hashlib.sha256(source_bytes(relative)).hexdigest() != expected:
                raise ValueError(f"Source drift: {relative}; re-export and review")
    return catalog


def artifact_digest() -> str:
    """Fingerprint the complete authoring recipe, not just generated public tasks."""
    digest = hashlib.sha256()
    digest.update((ROOT / "scripts/benchmark/export-catalog.ts").read_bytes())
    for path in sorted(DIRECTORY.rglob("*")):
        if (path.suffix not in (".py", ".json") and path.name != "RUBRIC.md") or "reports" in path.parts or "tests" in path.parts:
            continue
        if path.name == "catalog-inventory.json":
            continue
        digest.update(str(path.relative_to(DIRECTORY)).encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()

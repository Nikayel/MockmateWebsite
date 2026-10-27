"""Bounded child execution for trusted authored fixtures, not a security sandbox."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from .contracts import Case, Execution, Json, Track

OUTPUT_LIMIT = 1_048_576
WORKER = Path(__file__).with_name("execution_worker.py")


def execute(source: str, entry: str, track: Track, cases: list[Case],
            timeout: float = 4.0) -> Execution:
    payload = {"source": source, "entry": entry, "track": track,
               "inputs": [case.inputs for case in cases]}
    with tempfile.TemporaryDirectory(prefix="codesparring-benchmark-") as root:
        with tempfile.TemporaryFile() as stdout, tempfile.TemporaryFile() as stderr:
            try:
                process = subprocess.run(
                    [sys.executable, "-I", str(WORKER)], input=json.dumps(payload).encode(),
                    cwd=root, env={"PATH": os.defpath, "PYTHONHASHSEED": "0"},
                    stdout=stdout, stderr=stderr, timeout=timeout, check=False,
                )
            except subprocess.TimeoutExpired:
                return Execution("timeout", (), "Child exceeded wall-clock timeout")
            stdout.seek(0)
            stderr.seek(0)
            raw = stdout.read(OUTPUT_LIMIT + 1)
            error = stderr.read(4096).decode(errors="replace")
    if process.returncode != 0:
        return Execution("crash", (), error or f"exit={process.returncode}")
    if len(raw) > OUTPUT_LIMIT:
        return Execution("protocol-error", (), "Worker output exceeded limit")
    try:
        value: Json = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        return Execution("protocol-error", (), "Worker did not return one JSON result array")
    if not isinstance(value, list) or len(value) != len(cases):
        return Execution("protocol-error", (), "Worker returned an incomplete case count")
    if any(not isinstance(row, dict) or set(row) != {"value", "error"}
           or (row["error"] is not None and not isinstance(row["error"], str)) for row in value):
        return Execution("protocol-error", (), "Malformed case result")
    return Execution("complete", tuple(value))

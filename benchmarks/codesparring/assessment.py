"""Grade execution in the parent process, outside the candidate program."""
from __future__ import annotations

from dataclasses import dataclass

from .contracts import Case, Execution, Json
from .dsa.validation import agrees, strict_equal


@dataclass(frozen=True)
class Assessment:
    execution: Execution
    passed: tuple[bool, ...]

    def summarize(self, cases: list[Case]) -> dict[str, Json]:
        return {
            "status": self.execution.status, "passed": sum(self.passed), "total": len(cases),
            "public_passed": sum(p for p, c in zip(self.passed, cases) if c.visibility == "public"),
            "public_total": sum(c.visibility == "public" for c in cases),
            "private_passed": sum(p for p, c in zip(self.passed, cases) if c.visibility == "private"),
            "private_total": sum(c.visibility == "private" for c in cases),
            "failed_case_ids": [case.id for case, passed in zip(cases, self.passed) if not passed],
        }


def assess(task: dict[str, Json], cases: list[Case], execution: Execution) -> Assessment:
    if execution.status != "complete" or len(execution.results) != len(cases):
        return Assessment(execution, (False,) * len(cases))
    passed = []
    for case, row in zip(cases, execution.results):
        matches = agrees(task["id"], case, row["value"]) if task["track"] == "dsa" else strict_equal(row["value"], case.expected)
        passed.append(row["error"] is None and matches)
    return Assessment(execution, tuple(passed))

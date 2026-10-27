"""Verify a task's reference, learner states, and mutation resistance."""
from __future__ import annotations

import ast
import json

from .assessment import Assessment, assess
from .bugfix.cases import build_cases as bugfix_cases
from .bugfix.programs import build_program
from .contracts import Case, Json, Program
from .dsa.cases import build_cases as dsa_cases
from .dsa.domain import valid_inputs
from .dsa.programs import PROGRAMS
from .execution import execute


def hardcoded_dsa(program: Program, cases: list[Case]) -> str:
    answers = {json.dumps(case.inputs, sort_keys=True): case.expected
               for case in cases if case.visibility == "public"}
    return f"import json\ndef {program.entry}(**kwargs):\n    return {answers!r}.get(json.dumps(kwargs, sort_keys=True))\n"


def evaluate(task: dict[str, Json]) -> tuple[dict[str, Json], list[dict[str, Json]]]:
    cases = dsa_cases(task) if task["track"] == "dsa" else bugfix_cases(task)
    if task["track"] == "dsa" and any(not valid_inputs(task["id"], c.inputs) for c in cases):
        raise ValueError(f"Out-of-domain fixture: {task['id']}")
    program = PROGRAMS[task["id"]] if task["track"] == "dsa" else build_program(task)
    if task["track"] == "dsa":
        names = {node.name for node in ast.parse(task["starter"]).body if isinstance(node, ast.FunctionDef)}
        if program.entry not in names:
            raise ValueError(f"Reference entry does not match starter: {task['id']}")
    assessments: dict[str, Assessment] = {}
    programs = {"reference": program.reference, "starter": task["starter"]}
    programs.update(program.mutants)
    if task["track"] == "dsa":
        programs["hardcode-public-output"] = hardcoded_dsa(program, cases)
    programs.update({f"valid-alternative-{i}": source for i, source in enumerate(program.alternatives)})
    for name, source in programs.items():
        assessments[name] = assess(task, cases, execute(source, program.entry, task["track"], cases))
    reference = assessments["reference"]
    if not all(reference.passed):
        raise ValueError(f"Reference failed: {task['id']}: {reference.summarize(cases)}")
    for i in range(len(program.alternatives)):
        if not all(assessments[f"valid-alternative-{i}"].passed):
            raise ValueError(f"Valid alternative rejected: {task['id']}")
    mutants = {name: result.summarize(cases) for name, result in assessments.items()
               if name not in {"reference", "starter"} and not name.startswith("valid-alternative-")}
    if any(result["passed"] == result["total"] for result in mutants.values()):
        raise ValueError(f"Surviving authored mutant: {task['id']}: {mutants}")
    if all(assessments["starter"].passed):
        raise ValueError(f"Starter unexpectedly solves benchmark: {task['id']}")
    row = {"id": task["id"], "track": task["track"], "title": task["title"], "group": task["group"],
           "source_lines": len(task["starter"].splitlines()),
           "unique_inputs": len({json.dumps(c.inputs, sort_keys=True) for c in cases}),
           "case_categories": {category: sum(c.category == category for c in cases)
                               for category in sorted({c.category for c in cases})},
           "reference": reference.summarize(cases), "starter": assessments["starter"].summarize(cases),
           "valid_alternatives_accepted": len(program.alternatives), "mutants": mutants}
    chosen = ["starter", *list(program.mutants)[:2], "reference"] if task["track"] == "dsa" else ["starter", "partial-fix", "reference"]
    states = []
    for i, name in enumerate(chosen):
        result = assessments[name]
        observations = []
        for position, case in enumerate(cases):
            if case.visibility != "public":
                continue
            value = result.execution.results[position] if result.execution.status == "complete" else {"value": None, "error": result.execution.status}
            observations.append({"input": case.inputs, "expected": case.expected, "actual": value["value"],
                                 "error": value["error"], "passed": result.passed[position]})
        states.append({"task_id": task["id"], "state_id": f"state-{i:02d}", "code": programs[name],
                       "observations": observations, "private_kind": name,
                       "private_correct": all(result.passed)})
    return row, states

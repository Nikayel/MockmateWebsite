"""Validate shipped expectations and examples, then add private benchmark cases."""
from __future__ import annotations

import ast
import hashlib
import random

from ..contracts import BENCHMARK_SEED, Case, Json
from .edge_cases import EDGE_INPUTS, STRESS_CASES
from .generated_cases import generate
from .oracles import ORACLES
from .validation import agrees

def parse_example(text: str) -> dict[str, Json]:
    expression = ast.parse(f"example({text})", mode="eval").body
    if not isinstance(expression, ast.Call) or expression.args:
        raise ValueError(f"Unsupported example: {text}")
    inputs = {}
    for keyword in expression.keywords:
        if keyword.arg is None or keyword.arg in inputs:
            raise ValueError(f"Unsupported example assignment: {text}")
        inputs[keyword.arg] = ast.literal_eval(keyword.value)
    return inputs


def build_cases(task: dict[str, Json]) -> list[Case]:
    task_id = task["id"]
    oracle = ORACLES[task_id]
    cases = []
    for i, shipped in enumerate(task["shippedCases"]):
        case = Case(f"shipped-{i}", shipped["input"], oracle(shipped["input"]), "public", "shipped")
        if not agrees(task_id, case, shipped["expected"]):
            raise ValueError(f"Wrong shipped expected answer: {task_id}/{case.id}")
        cases.append(case)
    for i, example in enumerate(task["examples"]):
        inputs = parse_example(example["input"])
        output = example["output"]
        expected = {"true": True, "false": False}.get(output, output)
        if isinstance(expected, str):
            expected = ast.literal_eval(expected)
        case = Case(f"example-{i}", inputs, oracle(inputs), "public", "example")
        if not agrees(task_id, case, expected):
            raise ValueError(f"Wrong example answer: {task_id}/{case.id}")
        cases.append(case)
    rng = random.Random(int(hashlib.sha256(f"{BENCHMARK_SEED}:{task_id}".encode()).hexdigest(), 16))
    for category, inputs_list in [("boundary", EDGE_INPUTS[task_id]),
                                  ("generated", generate(task_id, rng))]:
        for i, inputs in enumerate(inputs_list):
            cases.append(Case(f"{category}-{i}", inputs, oracle(inputs), "private", category))
    if task_id in STRESS_CASES:
        inputs, expected = STRESS_CASES[task_id]
        cases.append(Case("maximum-size", inputs, expected, "private", "stress"))
    else:
        inputs = {"nums": list(range(-5, 5))}
        cases.append(Case("maximum-size", inputs, oracle(inputs), "private", "stress"))
    return cases

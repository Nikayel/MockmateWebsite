"""Compare outputs by the task contract, preserving types and multiplicity."""
from __future__ import annotations

from ..contracts import Case, Json


def agrees(task_id: str, case: Case, actual: Json) -> bool:
    if task_id == "dsa-two-sum":
        nums = case.inputs["nums"]
        if not isinstance(actual, list) or len(actual) != 2:
            return False
        if any(type(index) is not int or not 0 <= index < len(nums) for index in actual):
            return False
        return actual[0] != actual[1] and nums[actual[0]] + nums[actual[1]] == case.inputs["target"]
    if task_id == "dsa-subsets":
        if not isinstance(actual, list) or any(not isinstance(row, list) for row in actual):
            return False
        if any(type(value) is not int for row in actual for value in row):
            return False
        # Compare lists of canonical tuples, not sets: duplicate subsets must fail.
        return sorted(tuple(sorted(row)) for row in actual) == sorted(
            tuple(sorted(row)) for row in case.expected)
    return strict_equal(actual, case.expected)


def strict_equal(actual: Json, expected: Json) -> bool:
    if type(actual) is not type(expected):
        return False
    if isinstance(expected, list):
        return len(actual) == len(expected) and all(
            strict_equal(a, e) for a, e in zip(actual, expected))
    if isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(
            strict_equal(actual[key], value) for key, value in expected.items())
    return actual == expected

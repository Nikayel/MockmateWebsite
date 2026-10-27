"""Typed contracts for authored tasks, cases, and execution outcomes."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Literal, TypeAlias

Json: TypeAlias = None | bool | int | float | str | list["Json"] | dict[str, "Json"]
Track: TypeAlias = Literal["dsa", "bugfix"]
BENCHMARK_SEED = 20261012


@dataclass(frozen=True)
class Case:
    id: str
    inputs: dict[str, Json]
    expected: Json
    visibility: Literal["public", "private"]
    category: str


@dataclass(frozen=True)
class Program:
    entry: str
    reference: str
    mutants: dict[str, str]
    alternatives: tuple[str, ...] = ()


@dataclass(frozen=True)
class Execution:
    status: Literal["complete", "timeout", "crash", "protocol-error"]
    results: tuple[dict[str, Json], ...]
    detail: str = ""


Oracle: TypeAlias = Callable[[dict[str, Json]], Json]


def replace_once(source: str, before: str, after: str) -> str:
    """Make reference and mutation edits fail closed if their source anchor drifts."""
    if source.count(before) != 1:
        raise ValueError(f"Expected exactly one patch anchor: {before!r}")
    return source.replace(before, after, 1)

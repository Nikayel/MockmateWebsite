import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// L3-M2: Type Hints & Static Typing
// ───────────────────────────────────────────────────────────────────────────

const TH_README = `# The carrier export loader

Every night a carrier drops a CSV of shipments. Each column arrives as a **string**, and the
loader turns those strings into real Python values. The team's rule is that the class declaration
is the single source of truth: what a field is called and what type it holds is written once, in
the annotations, and the loader follows it.

## \`catalog/models.py\`

Declare the \`Shipment\` dataclass with these fields, then implement \`from_row\`.

| field | type | notes |
| --- | --- | --- |
| \`tracking_id\` | text | |
| \`destination\` | text | |
| \`weight_grams\` | whole number | |
| \`fragile\` | true/false | |
| \`notes\` | text | defaults to \`""\` |

\`Shipment.from_row(row)\` takes one \`dict\` of raw string columns and returns a \`Shipment\`:

- every declared field is converted with the read-only \`coerce\` helper in \`catalog.coercion\`,
  which needs the type that field declares
- a column the class does not declare is ignored, however many of them the carrier adds
- a declared field missing from the row falls back to its default

## \`catalog/report.py\`

Implement and annotate three functions over a list of \`Shipment\`:

- \`group_by_destination\` returns a mapping from destination to the shipments for it, each group
  in arrival order
- \`heaviest\` returns the single heaviest shipment, the earliest one on a tie, and nothing at all
  when the list is empty
- \`count_where\` takes a one-argument function that answers true or false about a shipment, and
  returns how many shipments it accepts

The tests read your annotations as well as your results, so an unannotated function that computes
the right answer still fails. Some tests are hidden.
`

const TH_COERCION = String.raw`"""Raw-column converters, keyed by the type a field declares. Read-only."""


def coerce(declared: type, raw: str) -> object:
    """Convert one raw export column into the declared type."""
    if declared is bool:
        return raw.strip().lower() in {"1", "true", "yes"}
    if declared is int:
        return int(raw.strip())
    if declared is float:
        return float(raw.strip())
    return raw.strip()
`

const TH_MODELS_STARTER = String.raw`from dataclasses import dataclass
from typing import get_type_hints

from catalog.coercion import coerce


@dataclass
class Shipment:
    """One row of the carrier export (see README.md)."""

    # TODO: declare the five fields and their types, with a default for notes.

    @classmethod
    def from_row(cls, row):
        """Build a Shipment from a row of raw string columns (see README.md)."""
        # TODO: build each field from what the class declares, not from what the row contains.
        raise NotImplementedError
`

const TH_MODELS_REFERENCE = String.raw`from dataclasses import dataclass
from typing import get_type_hints

from catalog.coercion import coerce


@dataclass
class Shipment:
    """One row of the carrier export."""

    tracking_id: str
    destination: str
    weight_grams: int
    fragile: bool
    notes: str = ""

    @classmethod
    def from_row(cls, row: dict[str, str]) -> "Shipment":
        values = {}
        for name, declared in get_type_hints(cls).items():
            if name in row:
                values[name] = coerce(declared, row[name])
        return cls(**values)
`

const TH_REPORT_STARTER = String.raw`from catalog.models import Shipment


# TODO: annotate and implement all three (see README.md). The tests read the annotations.
def group_by_destination(shipments):
    raise NotImplementedError


def heaviest(shipments):
    raise NotImplementedError


def count_where(shipments, predicate):
    raise NotImplementedError
`

const TH_REPORT_REFERENCE = String.raw`from collections.abc import Callable

from catalog.models import Shipment


def group_by_destination(shipments: list[Shipment]) -> dict[str, list[Shipment]]:
    grouped: dict[str, list[Shipment]] = {}
    for shipment in shipments:
        grouped.setdefault(shipment.destination, []).append(shipment)
    return grouped


def heaviest(shipments: list[Shipment]) -> Shipment | None:
    if not shipments:
        return None
    return max(shipments, key=lambda shipment: shipment.weight_grams)


def count_where(shipments: list[Shipment], predicate: Callable[[Shipment], bool]) -> int:
    return sum(1 for shipment in shipments if predicate(shipment))
`

const TH_TEST = String.raw`from typing import get_type_hints

from catalog.models import Shipment
from catalog.report import count_where, group_by_destination


ROW = {
    "tracking_id": "  TRK-1  ",
    "destination": "Lisbon",
    "weight_grams": "1200",
    "fragile": "true",
    "notes": "leave with doorman",
}


def run_tests(record):
    def declares_five_fields():
        hints = get_type_hints(Shipment)
        expected = {
            "tracking_id": str,
            "destination": str,
            "weight_grams": int,
            "fragile": bool,
            "notes": str,
        }
        assert hints == expected, f"expected declared fields {expected}, got {hints!r}"

    def from_row_converts_columns():
        shipment = Shipment.from_row(ROW)
        assert shipment.tracking_id == "TRK-1", f"expected 'TRK-1', got {shipment.tracking_id!r}"
        assert shipment.weight_grams == 1200, f"expected 1200, got {shipment.weight_grams!r}"
        assert shipment.fragile is True, f"expected True, got {shipment.fragile!r}"

    def groups_by_destination():
        rows = [
            {"tracking_id": "A", "destination": "Lisbon", "weight_grams": "100", "fragile": "no"},
            {"tracking_id": "B", "destination": "Oslo", "weight_grams": "200", "fragile": "no"},
            {"tracking_id": "C", "destination": "Lisbon", "weight_grams": "300", "fragile": "no"},
        ]
        grouped = group_by_destination([Shipment.from_row(row) for row in rows])
        ids = {key: [s.tracking_id for s in group] for key, group in grouped.items()}
        expected = {"Lisbon": ["A", "C"], "Oslo": ["B"]}
        assert ids == expected, f"expected {expected}, got {ids!r}"

    def counts_with_a_predicate():
        rows = [
            {"tracking_id": "A", "destination": "Lisbon", "weight_grams": "100", "fragile": "no"},
            {"tracking_id": "B", "destination": "Oslo", "weight_grams": "900", "fragile": "no"},
        ]
        shipments = [Shipment.from_row(row) for row in rows]
        result = count_where(shipments, lambda s: s.weight_grams > 500)
        assert result == 1, f"expected 1, got {result!r}"

    record("Shipment declares five typed fields", declares_five_fields)
    record("from_row converts raw columns", from_row_converts_columns)
    record("group_by_destination keeps arrival order", groups_by_destination)
    record("count_where applies the predicate", counts_with_a_predicate)
`

const TH_TEST_HIDDEN = String.raw`from typing import get_args, get_origin, get_type_hints

from catalog.models import Shipment
from catalog.report import count_where, group_by_destination, heaviest


def make(tracking_id, destination, grams, fragile="no"):
    return Shipment.from_row(
        {
            "tracking_id": tracking_id,
            "destination": destination,
            "weight_grams": str(grams),
            "fragile": fragile,
        }
    )


def run_tests(record):
    def ignores_undeclared_columns():
        shipment = Shipment.from_row(
            {
                "tracking_id": "TRK-9",
                "destination": "Porto",
                "weight_grams": "50",
                "fragile": "no",
                "carrier_internal_code": "ZZ-77",
            }
        )
        assert not hasattr(shipment, "carrier_internal_code"), (
            "expected no carrier_internal_code attribute, got "
            f"{getattr(shipment, 'carrier_internal_code', None)!r}"
        )

    def missing_column_uses_the_default():
        shipment = make("TRK-2", "Oslo", 10)
        assert shipment.notes == "", f"expected '', got {shipment.notes!r}"

    def false_string_becomes_false():
        shipment = make("TRK-3", "Oslo", 10, fragile="false")
        assert shipment.fragile is False, f"expected False, got {shipment.fragile!r}"

    def heaviest_handles_empty_and_ties():
        empty = heaviest([])
        assert empty is None, f"expected None, got {empty!r}"
        tied = heaviest([make("A", "Oslo", 400), make("B", "Oslo", 400)])
        assert tied.tracking_id == "A", f"expected 'A', got {tied.tracking_id!r}"

    def heaviest_is_annotated_optional():
        returned = get_type_hints(heaviest)["return"]
        args = set(get_args(returned))
        assert args == {Shipment, type(None)}, (
            f"expected the return to be Shipment or None, got {returned!r}"
        )

    def count_where_declares_a_callable():
        hints = get_type_hints(count_where)
        predicate = hints["predicate"]
        origin = get_origin(predicate)
        assert origin is not None and origin.__name__ == "Callable", (
            f"expected predicate to be a Callable type, got {predicate!r}"
        )
        args = get_args(predicate)
        assert args == ([Shipment], bool), f"expected ([Shipment], bool), got {args!r}"
        assert hints["return"] is int, f"expected int, got {hints['return']!r}"

    def group_by_destination_declares_its_mapping():
        returned = get_type_hints(group_by_destination)["return"]
        expected = dict[str, list[Shipment]]
        assert returned == expected, f"expected {expected}, got {returned!r}"

    record("from_row ignores undeclared columns", ignores_undeclared_columns)
    record("a missing column falls back to the default", missing_column_uses_the_default)
    record("'false' becomes the boolean False", false_string_becomes_false)
    record("heaviest handles empty input and ties", heaviest_handles_empty_and_ties)
    record("heaviest is annotated as optional", heaviest_is_annotated_optional)
    record("count_where declares its callable parameter", count_where_declares_a_callable)
    record("group_by_destination declares its mapping", group_by_destination_declares_its_mapping)
`

export const typeHintsLesson: PythonLesson = {
  id: "py-l3-type-hints",
  title: "Type hints on functions & classes",
  summary: "Annotate functions with precise types while implementing a small module.",
  estimatedMinutes: 22,
  difficulty: "medium",
  skills: ["type-hints", "annotations", "modules", "mypy"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Types you write down, but Python won't enforce

A **type hint** is a note you attach to a name saying what kind of value belongs there. When you review a stranger's function, the signature \`def average(values: list[float]) -> float\` states the contract in one line: pass a list of floats, get a float back. Without hints you are reverse-engineering intent from the body. On real teams, hints plus a checker like \`mypy\` or \`pyright\` catch a whole class of bugs (passing a \`str\` where an \`int\` was meant) in CI, before the code ever runs.

### A hint is metadata, not a check

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "hint-not-enforced",
  "prompt": "average is declared as: def average(values: list[float]) -> float. A caller in another module runs average(['a', 'b']). Where does that go wrong?",
  "options": [
    {
      "label": "At the call site, before the body runs. Python rejects the wrong argument type.",
      "feedback": "Tempting, because that is what the annotation looks like it is for, and it is exactly what a compiled language would do. Python records the annotation and moves on. Nothing inspects it when the call happens."
    },
    {
      "label": "Inside the body, at sum(values), with a TypeError about adding an int and a str.",
      "correct": true,
      "feedback": "Right. The call goes through untouched and the failure surfaces wherever the wrong type first breaks an operation, which is usually deep in the stack and far from the caller who actually caused it."
    },
    {
      "label": "Nowhere. The hint coerces the strings to floats on the way in.",
      "feedback": "Tempting, because pydantic and several web frameworks really do coerce from annotations, so you may have seen this behaviour. Plain Python never coerces: no conversion, no validation, no warning."
    },
    {
      "label": "At import time, because the annotation does not match how the function is used.",
      "feedback": "Close on timing, since annotations really are evaluated when the def statement runs. But what gets evaluated is the annotation expression itself, not any argument. Import time knows nothing about calls that have not happened yet."
    }
  ]
}
\`\`\`

Python records annotations but never acts on them at runtime. \`average(["a", "b"])\` will happily start executing and only blow up inside \`sum\` (a \`TypeError\` from \`0 + "a"\`), not at the call site. The payoff comes from tools that read the annotations: your editor's autocomplete, and static checkers run as a build step.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["When", "Hints plus a checker in CI", "Hints but no checker", "No hints at all"],
  "rows": [
    ["As you type", "the editor flags it immediately", "the editor may flag it", "nothing"],
    ["In CI", "the build fails before merge", "passes", "passes"],
    ["At runtime", "never reached", "TypeError deep inside sum()", "TypeError deep inside sum()"]
  ],
  "highlightCols": ["Hints plus a checker in CI"],
  "caption": "Compare the middle column with the right one: at RUNTIME they are identical, because the hint changes nothing Python does. Only the highlighted column moves the failure earlier, which is why hints without a checker in CI buy editor help and documentation, but no safety."
}
\`\`\`

\`\`\`python
def average(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "int-list-where-float-hinted",
  "prompt": "The parameter is annotated list[float] and the return is annotated float. You call average([2, 4]), passing two ints. What prints?",
  "options": [
    {
      "label": "3, an int, since both inputs were ints and the division comes out even",
      "feedback": "Tempting, because Python normally keeps int arithmetic in ints and 6 divided by 2 is exact. But / is true division: it returns a float every time, even when it divides evenly, so you get 3.0."
    },
    {
      "label": "3.0, and a type checker is happy with the int list as well",
      "correct": true,
      "feedback": "Right. True division always yields a float, so the -> float hint is honest, and checkers accept an int wherever a float is wanted. Passing ints to a float parameter is normal, not a bug."
    },
    {
      "label": "A TypeError, because the list holds ints and the hint asked for floats",
      "feedback": "Tempting if you are still half expecting the hint to do work at runtime. It does none at all. And even a static checker allows this one, because int is accepted anywhere float is wanted."
    }
  ]
}
\`\`\`

\`values: list[float]\` annotates the parameter; \`-> float\` annotates the return. \`sum(values) / len(values)\` is always a \`float\` because \`/\` is true division, so the return hint is honest. (Passing \`[2, 4]\`, which are \`int\`, still type-checks: a checker treats \`int\` as an acceptable \`float\`.)

### Common shapes

\`\`\`python
name: str = "Ada"
counts: dict[str, int] = {}
pair: tuple[int, int] = (1, 2)
scores: list[float] = []
\`\`\`

### On classes

Annotate constructor parameters and the attributes they set. A \`@dataclass\` generates \`__init__\` from the annotations for you.

\`\`\`python
class Account:
    def __init__(self, balance: float) -> None:
        self.balance: float = balance
\`\`\`

\`-> None\` on \`__init__\` is the convention: it returns nothing.

### Across modules

Hints behave identically when code spans files. In the \`stats\` package, \`stats/summary.py\` can import a helper (\`from stats.rounding import round2\`) and annotate \`average\` exactly as it would in a single file. The annotation documents the boundary so a caller in another module knows the shape without opening the source.

### Pitfalls

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "round-half-to-even",
  "prompt": "At a Python prompt you type round(2.5) and then round(3.5). What comes back?",
  "options": [
    {
      "label": "3 and 4. A half always rounds up, the way you were taught in school.",
      "feedback": "Tempting, because that is the rule almost everyone learned and it is what several other languages do. Python sends an exact tie to the nearest even digit instead, so 2.5 goes down to 2 while 3.5 goes up to 4."
    },
    {
      "label": "2 and 4. An exact tie goes to the nearest even digit.",
      "correct": true,
      "feedback": "Right. This is banker's rounding, and it exists so that rounding a long column of numbers does not drift upward. It only ever applies to an exact tie."
    },
    {
      "label": "2 and 3. A trailing .5 is dropped, so the value truncates toward zero.",
      "feedback": "Half the answer, and 2.5 really does give 2, which makes this feel confirmed. But it is not truncation: 3.5 gives 4. The rule is 'land on the even digit', not 'always go down'."
    }
  ]
}
\`\`\`

- **Hints are not runtime validation.** If you need to reject bad input at runtime, you still write an explicit check or reach for a validator like \`pydantic\`. \`-> float\` guarantees nothing on its own.
- **\`round\` on floats can surprise you.** Two separate effects combine. First, \`round\` breaks exact ties to the nearest even digit, so \`round(2.5)\` is \`2\`, not \`3\`. Second, most decimals are not exactly representable: \`2.675\` is stored as \`2.67499...\`, so \`round(2.675, 2)\` returns \`2.67\`, not \`2.68\`, because the stored value is already below the tie. Expect small surprises when the Practice \`round2\` helper trims a mean to 2 decimals.

**Interview nuance:** the interpreter ignores type hints at runtime. They are stored in a function's \`__annotations__\` and read only by tools and libraries that opt in (checkers, editors, \`@dataclass\`, \`pydantic\`); the interpreter itself does zero type checking. So typed Python buys a build-time guarantee, not a runtime one, which is exactly why teams pair hints with \`mypy\` in CI rather than trusting them at the call site.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "who-reads-annotations",
  "prompt": "Sort each of these by whether it actually reads the type hints you wrote.",
  "buckets": ["Reads your hints", "Ignores them completely"],
  "items": [
    {
      "label": "mypy running as a CI step",
      "bucket": "Reads your hints",
      "feedback": "This is the one that buys you safety. It reads every annotation and fails the build before the code ships."
    },
    {
      "label": "The interpreter executing a function call",
      "bucket": "Ignores them completely",
      "feedback": "The single most important row. Python stashes the annotations in the function's __annotations__ dict and never consults them again."
    },
    {
      "label": "Your editor's autocomplete and red squiggles",
      "bucket": "Reads your hints",
      "feedback": "The fastest feedback of the three tools, though it only covers the file you have open, which is why CI still matters."
    },
    {
      "label": "@dataclass generating __init__ for a class",
      "bucket": "Reads your hints",
      "feedback": "dataclass is a library that opts in: it walks the class annotations to decide which fields exist and in what order they are passed."
    },
    {
      "label": "pydantic validating an incoming API payload",
      "bucket": "Reads your hints",
      "feedback": "pydantic reads the annotations and genuinely enforces them at runtime, which is why typed pydantic code feels like Python is checking types. It is pydantic doing it, not Python."
    },
    {
      "label": "The + operator deciding how to add two values",
      "bucket": "Ignores them completely",
      "feedback": "Operators dispatch on the objects' real runtime types. No annotation ever changes which code path an operator takes."
    }
  ],
  "reveal": "The split never changes: hints are data that opted-in tools read, and the interpreter only records them. That is the whole reason typed Python needs a checker in CI to buy anything at all."
}
\`\`\``,
    demoCode: `def average(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


print(average([2, 4]))   # 3.0
print(average([]))       # 0.0`,
  },
  apply: {
    id: "py-l3-type-hints-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`average(nums)\`. Return the mean of \`nums\` **rounded to 2
decimals**, or \`0.0\` for an empty list.

For \`[10, 20, 35]\` return \`21.67\`. Add type hints: \`def average(nums: list[float]) -> float\`.`,
    starterCode: `def average(nums: list[float]) -> float:
    # Return 0.0 when empty, else the mean rounded to 2 decimals.
    pass`,
    hints: [
      "Guard the empty list first: `if not nums: return 0.0`.",
      "The mean is `sum(nums) / len(nums)`.",
      "Round it: `return round(sum(nums) / len(nums), 2)`.",
    ],
    referenceSolution: `def average(nums: list[float]) -> float:
    if not nums:
        return 0.0
    return round(sum(nums) / len(nums), 2)`,
    testCases: [
      { input: { nums: [2, 4] }, expected: 3.0, description: "mean of two" },
      { input: { nums: [] }, expected: 0.0, description: "empty -> 0.0" },
      { input: { nums: [10, 20, 35] }, expected: 21.67, description: "rounds to 2 decimals" },
      { input: { nums: [1, 2, 3] }, expected: 2.0, description: "mean of three" },
    ],
  },
  practice: {
    id: "py-l3-type-hints-practice",
    executionMode: "workspace",
    prompt: `Implement the carrier export loader. A logistics feed arrives as rows of raw strings, and the
team's rule is that the \`Shipment\` class declaration is the only place a field's name and type are
written down. The loader has to follow those declarations rather than whatever columns the carrier
happens to send.

Two files to fill in. In \`catalog/models.py\`, declare the \`Shipment\` dataclass and implement
\`Shipment.from_row(row)\`, which converts every declared field with the read-only \`coerce\` helper,
ignores columns the class does not declare, and falls back to a field's default when the row is
missing it. In \`catalog/report.py\`, implement \`group_by_destination\`, \`heaviest\`, and
\`count_where\` over a list of shipments, and annotate them.

\`README.md\` has the field table and the exact behaviour of each function. The tests read your
annotations as well as your results, so correct code with no hints still fails. Some tests are
hidden.`,
    starterCode: "",
    hints: [
      "Annotations are data you can read back. `typing.get_type_hints(cls)` hands you a dict of field name to declared type for the class, in declaration order, which is exactly the pair `coerce` wants.",
      "Build a dict of keyword arguments as you walk the declared fields, skipping any name the row does not have, then pass it to `cls(**values)` so the dataclass supplies the defaults. In `report.py`, `heaviest` returns either a `Shipment` or `None`, and `count_where`'s second parameter is a function from `Shipment` to `bool`.",
      "The declared types you need in `report.py` are `list[Shipment]`, `dict[str, list[Shipment]]`, `Shipment | None`, and `Callable[[Shipment], bool]` from `collections.abc`. For ties, `max` already keeps the first of equal values.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "catalog/models.py",
      editableFilePaths: ["catalog/models.py", "catalog/report.py"],
      visibleTestPaths: ["tests/test_manifest.py"],
      hiddenTestPaths: ["tests/test_manifest_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: TH_README },
        { path: "catalog/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "catalog/coercion.py",
          role: "readonly",
          language: "python",
          content: TH_COERCION,
          description: "coerce helper (read-only)",
        },
        {
          path: "catalog/models.py",
          role: "editable",
          language: "python",
          content: TH_MODELS_STARTER,
          description: "Declare Shipment and implement from_row",
        },
        {
          path: "catalog/report.py",
          role: "editable",
          language: "python",
          content: TH_REPORT_STARTER,
          description: "Implement and annotate the three report functions",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_manifest.py",
          role: "test",
          language: "python",
          content: TH_TEST,
          description: "Visible manifest tests",
        },
        {
          path: "tests/test_manifest_hidden.py",
          role: "test",
          language: "python",
          content: TH_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case and annotation tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_manifest", label: "visible manifest" },
            { module: "test_manifest_hidden", label: "hidden manifest" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "catalog/models.py",
          role: "editable",
          language: "python",
          content: TH_MODELS_REFERENCE,
        },
        {
          path: "catalog/report.py",
          role: "editable",
          language: "python",
          content: TH_REPORT_REFERENCE,
        },
      ],
    },
  },
}

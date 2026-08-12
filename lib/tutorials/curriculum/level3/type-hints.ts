import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// L3-M2: Type Hints & Static Typing
// ───────────────────────────────────────────────────────────────────────────

const TH_README = `# A typed stats module

Add precise **type hints** while you implement a small stats module. \`stats/rounding.py\`
(read-only) rounds to 2 decimals; implement \`average(values)\` in \`stats/summary.py\`.

\`average\` should:
- return \`0.0\` for an empty list
- otherwise return the mean, rounded with the read-only \`round2\` helper

Annotate it as \`def average(values: list[float]) -> float\`. Some tests are hidden.
`

const TH_ROUNDING = String.raw`def round2(x: float) -> float:
    """Round a number to two decimal places."""
    return round(x, 2)
`

const TH_SUMMARY_STARTER = String.raw`from stats.rounding import round2


def average(values: list[float]) -> float:
    """Return the rounded mean of values, or 0.0 when empty (see README.md)."""
    # TODO: handle the empty list, then return round2(mean).
    return 0.0
`

const TH_SUMMARY_REFERENCE = String.raw`from stats.rounding import round2


def average(values: list[float]) -> float:
    if not values:
        return 0.0
    return round2(sum(values) / len(values))
`

const TH_TEST = String.raw`from stats.summary import average


def run_tests(record):
    def averages_two_numbers():
        result = average([2, 4])
        assert result == 3.0, f"expected 3.0, got {result!r}"

    def empty_is_zero():
        result = average([])
        assert result == 0.0, f"expected 0.0, got {result!r}"

    def keeps_one_decimal():
        result = average([1, 2])
        assert result == 1.5, f"expected 1.5, got {result!r}"

    record("averages two numbers", averages_two_numbers)
    record("empty list is 0.0", empty_is_zero)
    record("keeps the decimal", keeps_one_decimal)
`

const TH_TEST_HIDDEN = String.raw`from stats.summary import average


def run_tests(record):
    def rounds_to_two_decimals():
        result = average([10, 20, 35])
        assert result == 21.67, f"expected 21.67, got {result!r}"

    def single_value():
        result = average([42])
        assert result == 42.0, f"expected 42.0, got {result!r}"

    record("rounds to two decimals", rounds_to_two_decimals)
    record("single value averages to itself", single_value)
`

export const typeHintsLesson: PythonLesson = {
  id: "py-l3-type-hints",
  title: "Type hints on functions & classes",
  summary: "Annotate functions with precise types while implementing a small module.",
  estimatedMinutes: 16,
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
    prompt: `Implement \`average(values)\` in \`stats/summary.py\`: return \`0.0\` for an empty list, otherwise
the mean rounded with the read-only \`round2\` helper imported from \`stats.rounding\`. Annotate it as
\`def average(values: list[float]) -> float\`. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Guard the empty list: `if not values: return 0.0`.",
      "`round2` is imported for you. Wrap the mean in it.",
      "`return round2(sum(values) / len(values))`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "stats/summary.py",
      editableFilePaths: ["stats/summary.py"],
      visibleTestPaths: ["tests/test_summary.py"],
      hiddenTestPaths: ["tests/test_summary_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: TH_README },
        { path: "stats/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "stats/rounding.py",
          role: "readonly",
          language: "python",
          content: TH_ROUNDING,
          description: "round2 helper (read-only)",
        },
        {
          path: "stats/summary.py",
          role: "editable",
          language: "python",
          content: TH_SUMMARY_STARTER,
          description: "Implement average here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_summary.py",
          role: "test",
          language: "python",
          content: TH_TEST,
          description: "Visible stats tests",
        },
        {
          path: "tests/test_summary_hidden.py",
          role: "test",
          language: "python",
          content: TH_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_summary", label: "visible stats" },
            { module: "test_summary_hidden", label: "hidden stats" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "stats/summary.py",
          role: "editable",
          language: "python",
          content: TH_SUMMARY_REFERENCE,
        },
      ],
    },
  },
}

import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// py-l3-typing-module: Optional/Union, generics, Protocols
// ───────────────────────────────────────────────────────────────────────────

// ── Practice workspace: the config-loader ticket ───────────────────────────────────────────────
// Deliberately unrelated to the apply lookup. Apply only ever asked "did I find something, or
// None?". Practice grades the three states a naive `if not value` collapses into one, a Union
// input that has to narrow past the bool-is-an-int trap, and a Protocol that lets a test pass in
// its own sink with no inheritance. Two editable files: the narrowing logic and the sink module.

const TM_README = `# Ticket CFG-214: the config loader treats three different states as one

The deploy config is read from a dict. Last week a service came up with no proxy because the
loader could not tell "the key is absent" from "the key is present and set to null" from
"the key is present and set to an empty string". All three took the same branch and all three
got the same default. Ops needs them reported separately.

\`config/feed.py\` is read-only and holds a sample \`RAW_SETTINGS\` dict.

## \`config/normalize.py\`

- \`classify_value(settings, key)\` returns exactly one of \`"missing"\`, \`"null"\`, \`"empty"\`,
  or \`"present"\`. A key that is not in the dict is missing. A value of \`None\` is null. A value
  that is a container of length zero (\`""\`, \`[]\`, \`{}\`) is empty. Everything else is present,
  including \`0\` and \`False\`.
- \`to_seconds(value)\` turns a timeout written in any of the shapes the config allows into a
  whole number of seconds, or \`None\` when the value is not a usable duration.
  - \`None\` is not a duration.
  - A bool is not a duration, even though a bool is an int.
  - An int is its own value. A float rounds to the nearest whole second.
  - A string may carry surrounding spaces and one trailing \`s\`: \`" 30s "\` is 30 seconds.
    A string that is not a plain count of seconds is not a duration.
  - A negative duration is not a duration.
  - Any other type is not a duration.
  - Annotate the return as \`-> int | None\`. A hidden test reads that annotation back.

## \`config/sink.py\`

The report has to go to a log file in production and to a list in tests, so \`emit\` must not
name either one.

- \`LineSink\` is a runtime-checkable \`Protocol\` describing one method, \`write(line)\`.
- \`ListSink\` conforms to it by shape and keeps every written line in \`self.lines\`.
- \`emit(sink, keys, settings)\` writes one line per key, formatted \`"key=state"\` where the
  state comes from \`classify_value\`, and returns how many lines it wrote. It raises
  \`TypeError\` when the sink cannot take a line.

Some tests are hidden.
`

const TM_FEED = String.raw`"""Read-only sample of the deploy config as the loader receives it."""

RAW_SETTINGS = {
    "retries": 3,
    "timeout": " 30s ",
    "region": "",
    "proxy": None,
    "tags": [],
    "debug": False,
}
`

const TM_NORMALIZE_STARTER = String.raw`def classify_value(settings: dict, key: str) -> str:
    """Report which of the four states this key is in (see README.md)."""
    # TODO: separate absent, null, empty container, and present.
    return "present"


def to_seconds(value):
    """Return whole seconds for a usable duration, else None (see README.md)."""
    # TODO: accept the allowed shapes, reject the rest, and annotate the return type.
    return value
`

const TM_NORMALIZE_REFERENCE = String.raw`def classify_value(settings: dict, key: str) -> str:
    if key not in settings:
        return "missing"
    value = settings[key]
    if value is None:
        return "null"
    if hasattr(value, "__len__") and len(value) == 0:
        return "empty"
    return "present"


def to_seconds(value) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value >= 0 else None
    if isinstance(value, float):
        seconds = round(value)
        return seconds if seconds >= 0 else None
    if isinstance(value, str):
        text = value.strip()
        if text.endswith("s"):
            text = text[:-1].strip()
        if text.isdigit():
            return int(text)
        return None
    return None
`

const TM_SINK_STARTER = String.raw`from typing import Protocol, runtime_checkable

from config.normalize import classify_value


@runtime_checkable
class LineSink(Protocol):
    """Anything that can take one line of text."""

    # TODO: declare the one method the protocol requires.


class ListSink:
    """Collects lines in memory so a test can read them back."""

    def __init__(self):
        self.lines = []

    # TODO: give ListSink the shape LineSink describes.


def emit(sink, keys: list[str], settings: dict) -> int:
    """Write one "key=state" line per key and return the count (see README.md)."""
    # TODO: reject a sink that cannot take a line, then write and count.
    return 0
`

const TM_SINK_REFERENCE = String.raw`from typing import Protocol, runtime_checkable

from config.normalize import classify_value


@runtime_checkable
class LineSink(Protocol):
    """Anything that can take one line of text."""

    def write(self, line: str) -> None:
        ...


class ListSink:
    """Collects lines in memory so a test can read them back."""

    def __init__(self):
        self.lines = []

    def write(self, line: str) -> None:
        self.lines.append(line)


def emit(sink: LineSink, keys: list[str], settings: dict) -> int:
    if not isinstance(sink, LineSink):
        raise TypeError("sink must have a write method")
    count = 0
    for key in keys:
        sink.write(key + "=" + classify_value(settings, key))
        count += 1
    return count
`

const TM_TEST = String.raw`from config.feed import RAW_SETTINGS
from config.normalize import classify_value, to_seconds
from config.sink import ListSink, emit


def run_tests(record):
    def absent_key_is_missing():
        got = classify_value(RAW_SETTINGS, "endpoint")
        assert got == "missing", f"expected 'missing', got {got!r}"

    def none_value_is_null():
        got = classify_value(RAW_SETTINGS, "proxy")
        assert got == "null", f"expected 'null', got {got!r}"

    def empty_string_is_empty():
        got = classify_value(RAW_SETTINGS, "region")
        assert got == "empty", f"expected 'empty', got {got!r}"

    def int_value_is_present():
        got = classify_value(RAW_SETTINGS, "retries")
        assert got == "present", f"expected 'present', got {got!r}"

    def digit_string_becomes_seconds():
        got = to_seconds(" 30s ")
        assert got == 30, f"expected 30, got {got!r}"

    def none_is_not_a_duration():
        got = to_seconds(None)
        assert got is None, f"expected None, got {got!r}"

    def emit_writes_one_line_per_key():
        sink = ListSink()
        count = emit(sink, ["retries", "proxy"], RAW_SETTINGS)
        assert count == 2, f"expected 2, got {count!r}"
        assert sink.lines == ["retries=present", "proxy=null"], f"got {sink.lines!r}"

    record("absent key reports missing", absent_key_is_missing)
    record("None value reports null", none_value_is_null)
    record("empty string reports empty", empty_string_is_empty)
    record("int value reports present", int_value_is_present)
    record("' 30s ' parses to 30", digit_string_becomes_seconds)
    record("None is not a duration", none_is_not_a_duration)
    record("emit writes and counts lines", emit_writes_one_line_per_key)
`

const TM_TEST_HIDDEN = String.raw`from typing import get_type_hints

from config.normalize import classify_value, to_seconds
from config.sink import LineSink, emit


class RecordingSink:
    """Defined here, inherits nothing of the learner's, and must still be accepted."""

    def __init__(self):
        self.seen = []

    def write(self, line):
        self.seen.append(line)


class Counter:
    """Has no write method at all."""

    def count(self, line):
        return len(line)


def run_tests(record):
    def falsy_scalars_are_present():
        for key, value in (("zero", 0), ("off", False)):
            got = classify_value({key: value}, key)
            assert got == "present", f"expected 'present' for {value!r}, got {got!r}"

    def empty_containers_are_empty():
        for value in ([], {}, ()):
            got = classify_value({"k": value}, "k")
            assert got == "empty", f"expected 'empty' for {value!r}, got {got!r}"

    def booleans_are_not_durations():
        for value in (True, False):
            got = to_seconds(value)
            assert got is None, f"expected None for {value!r}, got {got!r}"

    def floats_round_and_negatives_reject():
        assert to_seconds(4.7) == 5, f"expected 5, got {to_seconds(4.7)!r}"
        assert to_seconds(0) == 0, f"expected 0, got {to_seconds(0)!r}"
        assert to_seconds(-1) is None, f"expected None, got {to_seconds(-1)!r}"

    def unusable_shapes_reject():
        for value in ("soon", "", [30], {"seconds": 30}):
            got = to_seconds(value)
            assert got is None, f"expected None for {value!r}, got {got!r}"

    def return_annotation_admits_none():
        hint = get_type_hints(to_seconds).get("return")
        assert hint == (int | None), f"expected int | None, got {hint!r}"

    def foreign_sink_is_accepted():
        sink = RecordingSink()
        settings = {"a": None, "b": ""}
        count = emit(sink, ["a", "b", "c"], settings)
        assert count == 3, f"expected 3, got {count!r}"
        assert sink.seen == ["a=null", "b=empty", "c=missing"], f"got {sink.seen!r}"

    def sink_without_write_is_rejected():
        try:
            emit(Counter(), ["a"], {"a": 1})
        except TypeError:
            return
        raise AssertionError("expected TypeError for a sink with no write method")

    def protocol_matches_by_shape():
        assert isinstance(RecordingSink(), LineSink), "expected RecordingSink to satisfy LineSink"
        assert not isinstance(Counter(), LineSink), "expected Counter not to satisfy LineSink"

    record("0 and False are present, not empty", falsy_scalars_are_present)
    record("empty containers report empty", empty_containers_are_empty)
    record("bools are rejected as durations", booleans_are_not_durations)
    record("floats round, negatives reject", floats_round_and_negatives_reject)
    record("unusable shapes return None", unusable_shapes_reject)
    record("to_seconds is annotated int | None", return_annotation_admits_none)
    record("emit accepts a foreign sink", foreign_sink_is_accepted)
    record("emit rejects a sink with no write", sink_without_write_is_rejected)
    record("LineSink matches on shape", protocol_matches_by_shape)
`

export const typingModuleLesson: PythonLesson = {
  id: "py-l3-typing-module",
  title: "typing: Optional, Union, generics & Protocols",
  summary: "Type a small API with Optional/Union, a TypeVar generic, and a structural Protocol.",
  estimatedMinutes: 24,
  difficulty: "medium",
  skills: ["typing", "optional", "generics", "protocols"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Precise types for real APIs

In a shared codebase, a function signature is the contract your teammates read before they read your code. \`def find_user(user_id): ...\` tells a caller nothing about what comes back. A precise return type like \`dict | None\` says "you might get nothing, handle it" before anyone runs the code. On a data team that is the difference between a null check you wrote on purpose and a \`NoneType\` crash in a nightly pipeline at 3am.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Annotation", "Reads as", "Modern equivalent"],
  "rows": [
    ["list[int]", "a list whose items are ints", "same; built-in generics since 3.9"],
    ["dict[str, int]", "a dict from str keys to int values", "same"],
    ["tuple[int, str]", "exactly two items, an int then a str", "tuple[int, ...] for any number of ints"],
    ["int | None", "an int, or nothing", "replaces Optional[int]"],
    ["int | str", "either an int or a str", "replaces Union[int, str]"],
    ["Callable[[int], str]", "a function taking one int, returning a str", "same"]
  ],
  "highlightCols": ["Modern equivalent"],
  "caption": "The right column is why two spellings appear in real codebases. Optional[int] and Union[int, str] came from the typing module and still work, but the | forms read closer to how you would say them aloud and need no import."
}
\`\`\`

### Optional and Union

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "optional-vs-pipe-none",
  "prompt": "You are reading a codebase where one module writes Optional[int] and another writes int | None. What is the difference between them?",
  "options": [
    {
      "label": "Optional[int] means the argument may be left out; int | None means the value may be None.",
      "feedback": "Tempting, because the word Optional strongly suggests 'you can skip this'. They are the same type though, and neither one says anything about whether a caller may omit the argument."
    },
    {
      "label": "None. They are the same type, spelled two ways.",
      "correct": true,
      "feedback": "Right. Optional[int] needs an import from typing and predates the | syntax. New code writes int | None because it reads the way you would say it out loud and needs no import."
    },
    {
      "label": "Optional[int] also treats 0 and other falsy values as missing; int | None accepts only None.",
      "feedback": "Tempting, because 'if not x' is how a lot of code tests for missing values, so falsy and missing blur together. The type system only ever means None here. 0 is an ordinary int, fully valid for both spellings."
    }
  ]
}
\`\`\`

A value that might be missing is \`Optional\`, written \`X | None\` (older code writes \`Optional[X]\`; they mean the same type). A value that can be one of several types is a \`Union\`: \`int | str\`.

Returning \`None\` from a function you annotated \`-> dict\` is a lie a checker will flag. Annotate the honest contract \`-> dict | None\`, and every caller is told to handle the missing case. Once a value is \`dict | None\`, a checker will not let you subscript it until you narrow it:

\`\`\`python
u = find_user(7)          # u: dict | None
if u is not None:
    print(u["name"])      # here u is dict, so u["name"] is allowed
\`\`\`

### Generics with TypeVar

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "loose-return-type-loses-info",
  "prompt": "A helper is declared: def first(items: list) -> object | None. You write n = first([10, 20]) and then n + 1, and run mypy. What does mypy report?",
  "options": [
    {
      "label": "Nothing. The list holds ints, so n is an int.",
      "feedback": "Tempting, because the ints are right there in the call and at runtime n really will be 10. But a checker believes the annotation over the call site, and the annotation promises only object | None."
    },
    {
      "label": "An error: you cannot add 1 to a value typed object | None.",
      "correct": true,
      "feedback": "Right. A loose annotation throws away exactly the information the caller needed. A TypeVar keeps the link, so list[T] -> T | None makes first([10, 20]) come back as int | None instead."
    },
    {
      "label": "An error about None only, since object supports + already.",
      "feedback": "Half right: the None arm really is a problem and would need a narrowing check. But object is the bare base type, so it defines no + at all. Both arms of the union fail here."
    }
  ]
}
\`\`\`

The demo below returns \`object | None\`, so the caller loses the element type. A generic keeps the link between the input type and the output type. \`TypeVar\` is the placeholder that stands in for "whatever type came in":

\`\`\`python
from typing import TypeVar
T = TypeVar("T")

def first(items: list[T]) -> T | None:
    return items[0] if items else None

first([10, 20])   # a checker infers int | None, not object | None
\`\`\`

Python 3.12 and later write the same thing as \`def first[T](items: list[T]) -> T | None:\` with no import.

### Protocols (structural typing)

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "protocol-needs-no-inheritance",
  "prompt": "greet is typed to take a Named protocol, which requires a name: str attribute. You pass it a User object from a third-party library. User has a name attribute but knows nothing about your Named class. Does the checker accept the call?",
  "options": [
    {
      "label": "No. Named is a class, so User has to subclass it.",
      "feedback": "Tempting, because that is how typing works in Java or C#, and it is how Python's own abstract base classes behave. Protocol exists precisely to drop that requirement: it matches on shape, not on ancestry."
    },
    {
      "label": "Yes. Having a name: str attribute is the entire requirement.",
      "correct": true,
      "feedback": "Right. This is structural typing, sometimes called static duck typing. It is what lets you type third-party objects you cannot edit without dragging their class hierarchy into your code."
    },
    {
      "label": "Yes at runtime, but a static checker would still reject it.",
      "feedback": "Backwards, though it is a fair guess given how little Python verifies at runtime. Protocols are a static feature: the checker is the thing that verifies the shape, and at runtime nothing is verified at all."
    }
  ]
}
\`\`\`

A \`Protocol\` describes the shape an object must have. Any object with the right attributes or methods satisfies it, with no base class and no inheritance:

\`\`\`python
from typing import Protocol

class Named(Protocol):
    name: str

def greet(who: Named) -> str:
    return "Hi, " + who.name   # any object with a .name: str fits
\`\`\`

### Pitfall: Optional is not an optional argument

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "optional-is-not-a-default",
  "prompt": "A function is declared: def find_user(user_id: int | None) -> dict | None. A caller writes find_user() with no arguments at all. What happens?",
  "options": [
    {
      "label": "It runs with user_id set to None, because None is one of the allowed values.",
      "feedback": "Tempting, because 'Optional' sounds like 'you may leave it out', and int | None really does permit None as a value. But permitting a value is not the same as supplying one when the caller sends nothing."
    },
    {
      "label": "TypeError: find_user() missing 1 required positional argument: 'user_id'",
      "correct": true,
      "feedback": "Right. The annotation says which values are legal, the default says whether the caller can skip the argument. To make it skippable you have to write user_id: int | None = None."
    },
    {
      "label": "A checker complaint, but a clean run, since hints do nothing at runtime.",
      "feedback": "Half right, and the second half is a rule worth trusting: hints really do nothing at runtime. But this failure has nothing to do with types. Python's own argument binding raises before your function body starts."
    }
  ],
  "reveal": "Two independent dials. The annotation controls which values are legal; the default controls whether the caller may leave the argument out. int | None = None turns both on, and that pair is what most real APIs want."
}
\`\`\`

A common intern misread: \`X | None\` describes the allowed values, not whether the argument can be omitted. \`def find_user(user_id: int | None)\` still requires \`user_id\`; calling \`find_user()\` raises \`TypeError: find_user() missing 1 required positional argument: 'user_id'\`. Adding \`None\` to the type does not add a default. To make a parameter skippable you give it one: \`user_id: int | None = None\`. Keep the two ideas separate: the type says what values are legal, the default says whether the caller can leave it out.

**Interview nuance:** Python type hints are not enforced at runtime. The interpreter records them in \`__annotations__\` but never checks them, so \`list[T]\` is no runtime guarantee that every element is a \`T\`, and a wrong annotation never raises on its own. A function annotated \`-> dict\` will happily return \`None\`; the crash only shows up later in the caller as \`TypeError: 'NoneType' object is not subscriptable\`. That is why teams gate merges on \`mypy\` or \`ty\`: the type check is a proof a static tool runs before the code ships, not a guard the interpreter performs. Contrast \`pydantic\`, which does validate values at runtime. So the payoff of \`-> dict | None\` is real only if you both annotate honestly and actually run the checker in CI.`,
    demoCode: `def first(items: list) -> object | None:
    return items[0] if items else None


print(first([10, 20]))   # 10
print(first([]))         # None`,
  },
  apply: {
    id: "py-l3-typing-module-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`find_by_id(rows, target)\`. Return the first dict in \`rows\` whose
\`"id"\` equals \`target\`, or \`None\` if none match.

Annotate the return as \`-> dict | None\`.`,
    starterCode: `def find_by_id(rows, target) -> dict | None:
    # Return the first row whose "id" == target, else None.
    pass`,
    hints: [
      'Loop the rows and check `row["id"] == target`.',
      "Return the row as soon as it matches.",
      "If the loop finishes with no match, `return None`.",
    ],
    referenceSolution: `def find_by_id(rows, target) -> dict | None:
    for row in rows:
        if row["id"] == target:
            return row
    return None`,
    testCases: [
      {
        input: {
          rows: [
            { id: 1, name: "Ada" },
            { id: 2, name: "Sam" },
          ],
          target: 2,
        },
        expected: { id: 2, name: "Sam" },
        description: "finds a match",
      },
      {
        input: {
          rows: [
            { id: 1, name: "Ada" },
            { id: 2, name: "Sam" },
          ],
          target: 9,
        },
        expected: null,
        description: "no match -> None",
      },
      { input: { rows: [], target: 1 }, expected: null, description: "empty rows -> None" },
    ],
  },
  practice: {
    id: "py-l3-typing-module-practice",
    executionMode: "workspace",
    prompt: `Close ticket CFG-214. A service came up with no proxy because the config loader could not tell
an absent key from a key set to \`None\` from a key set to an empty string, so all three got the
same default.

Fill in \`config/normalize.py\` and \`config/sink.py\`:

- \`classify_value(settings, key)\` reports which of \`"missing"\`, \`"null"\`, \`"empty"\`, or
  \`"present"\` a key is in.
- \`to_seconds(value)\` accepts a timeout written as an int, a float, or a string, and returns whole
  seconds or \`None\` when the value is not a usable duration.
- \`LineSink\` is a \`Protocol\` for anything with a \`write(line)\` method, \`ListSink\` conforms to
  it, and \`emit(sink, keys, settings)\` writes one \`"key=state"\` line per key and returns the count.

\`README.md\` has the full rules. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Four states means four questions in order: is the key in the dict, is the value `None`, is it a container of length zero, otherwise present. `0` and `False` answer no to all three of the first questions.",
      "In `to_seconds`, check `isinstance(value, bool)` before `isinstance(value, int)`, because `bool` is a subclass of `int` and `isinstance(True, int)` is `True`. Strings need `.strip()`, the trailing `s` removed, then `.isdigit()`.",
      "`emit` should not name `ListSink`. Decorate the protocol with `@runtime_checkable`, then guard with `if not isinstance(sink, LineSink): raise TypeError(...)` so any object carrying a `write` method is accepted.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "config/normalize.py",
      editableFilePaths: ["config/normalize.py", "config/sink.py"],
      visibleTestPaths: ["tests/test_config.py"],
      hiddenTestPaths: ["tests/test_config_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: TM_README },
        {
          path: "config/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "config/feed.py",
          role: "readonly",
          language: "python",
          content: TM_FEED,
          description: "Sample deploy config (read-only)",
        },
        {
          path: "config/normalize.py",
          role: "editable",
          language: "python",
          content: TM_NORMALIZE_STARTER,
          description: "classify_value and to_seconds live here",
        },
        {
          path: "config/sink.py",
          role: "editable",
          language: "python",
          content: TM_SINK_STARTER,
          description: "The LineSink protocol, ListSink, and emit",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_config.py",
          role: "test",
          language: "python",
          content: TM_TEST,
          description: "Visible config tests",
        },
        {
          path: "tests/test_config_hidden.py",
          role: "test",
          language: "python",
          content: TM_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_config", label: "visible config" },
            { module: "test_config_hidden", label: "hidden config" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "config/normalize.py",
          role: "editable",
          language: "python",
          content: TM_NORMALIZE_REFERENCE,
        },
        {
          path: "config/sink.py",
          role: "editable",
          language: "python",
          content: TM_SINK_REFERENCE,
        },
      ],
    },
  },
}

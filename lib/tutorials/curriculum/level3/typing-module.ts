import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// py-l3-typing-module: Optional/Union, generics, Protocols
// ───────────────────────────────────────────────────────────────────────────

const TM_README = `# Typed user lookup

Type a small lookup API. \`directory/users.py\` (read-only) holds a list of user dicts; implement
\`find_user(user_id)\` in \`directory/lookup.py\`.

It should return the matching user dict, or \`None\` when no user has that id. Annotate the return as
\`-> dict | None\` (an **Optional**: a dict *or* None). Some tests are hidden.
`

const TM_USERS = String.raw`USERS = [
    {"id": 1, "name": "Ada"},
    {"id": 2, "name": "Sam"},
    {"id": 3, "name": "Mo"},
]
`

const TM_LOOKUP_STARTER = String.raw`from directory.users import USERS


def find_user(user_id: int) -> dict | None:
    """Return the user dict with this id, or None if absent (see README.md)."""
    # TODO: scan USERS and return the match, else None.
    return None
`

const TM_LOOKUP_REFERENCE = String.raw`from directory.users import USERS


def find_user(user_id: int) -> dict | None:
    for user in USERS:
        if user["id"] == user_id:
            return user
    return None
`

const TM_TEST = String.raw`from directory.lookup import find_user


def run_tests(record):
    def finds_existing_user():
        assert find_user(1) == {"id": 1, "name": "Ada"}, f"got {find_user(1)!r}"

    def finds_another_user():
        assert find_user(2) == {"id": 2, "name": "Sam"}, f"got {find_user(2)!r}"

    def missing_user_is_none():
        assert find_user(99) is None, f"expected None, got {find_user(99)!r}"

    record("finds an existing user", finds_existing_user)
    record("finds another user", finds_another_user)
    record("missing id returns None", missing_user_is_none)
`

const TM_TEST_HIDDEN = String.raw`from directory.lookup import find_user


def run_tests(record):
    def finds_last_user():
        assert find_user(3) == {"id": 3, "name": "Mo"}, f"got {find_user(3)!r}"

    def zero_is_none():
        assert find_user(0) is None, f"expected None, got {find_user(0)!r}"

    record("finds the last user", finds_last_user)
    record("id 0 returns None", zero_is_none)
`

export const typingModuleLesson: PythonLesson = {
  id: "py-l3-typing-module",
  title: "typing: Optional, Union, generics & Protocols",
  summary: "Type a small API with Optional/Union, a TypeVar generic, and a structural Protocol.",
  estimatedMinutes: 18,
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
    prompt: `Implement \`find_user(user_id)\` in \`directory/lookup.py\`: return the matching user dict from the
read-only \`USERS\` list, or \`None\` when no user has that id. Annotate the return as \`-> dict | None\`.
Some tests are hidden.`,
    starterCode: "",
    hints: [
      "`USERS` is imported for you. Loop over it.",
      'Compare ids: `if user["id"] == user_id: return user`.',
      "Return `None` after the loop when nothing matched.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "directory/lookup.py",
      editableFilePaths: ["directory/lookup.py"],
      visibleTestPaths: ["tests/test_lookup.py"],
      hiddenTestPaths: ["tests/test_lookup_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: TM_README },
        {
          path: "directory/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "directory/users.py",
          role: "readonly",
          language: "python",
          content: TM_USERS,
          description: "User records (read-only)",
        },
        {
          path: "directory/lookup.py",
          role: "editable",
          language: "python",
          content: TM_LOOKUP_STARTER,
          description: "Implement find_user here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_lookup.py",
          role: "test",
          language: "python",
          content: TM_TEST,
          description: "Visible lookup tests",
        },
        {
          path: "tests/test_lookup_hidden.py",
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
            { module: "test_lookup", label: "visible lookup" },
            { module: "test_lookup_hidden", label: "hidden lookup" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "directory/lookup.py",
          role: "editable",
          language: "python",
          content: TM_LOOKUP_REFERENCE,
        },
      ],
    },
  },
}

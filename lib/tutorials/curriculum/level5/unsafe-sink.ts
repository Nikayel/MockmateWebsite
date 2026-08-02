/**
 * L5 real-codebase module: "Green tests, unsafe code".
 *
 * Grades the security half of the happy-path lesson. Both exercises hand the learner a generated
 * feature whose own test suite is green and whose implementation routes user input into a sink:
 * `eval` on a filter expression (apply), and a naive path join (practice). The repair is an
 * allowlist, and the feature suites exist so a repair that deletes the feature still fails.
 *
 * Workspace contract (copied from level3/level4): every package dir has an `__init__.py`; the
 * runner (role "test", hidden) prints `__WORKSPACE_TEST_RESULTS__:` + JSON; hidden suite labels
 * contain "hidden" and visible ones must not. Tests run real Python `assert`s, so graded values
 * are strings and integers only.
 *
 * The apply exercise keeps two audit probes in the VISIBLE suite next to the feature tests, because
 * their assert messages name what escaped the grammar and that is the lesson's teaching artifact.
 * The remaining grammar probes are hidden, so the repair has to be a parser rather than a special
 * case for the two probe strings on screen. (`validateWorkspaceScenario` also requires at least one
 * hidden test file, so a fully visible suite is not an option.)
 *
 * The filter grammar is deliberately FIVE rules, not seven. Two earlier rules were mechanical
 * surface rather than teaching: (1) "scan the operators longest-first so `>` cannot shadow `>=`"
 * disappears once the operator set is the four two-character operators, and (2) "ordering operators
 * require an integer" is redundant next to the rule that a value's kind must match its field's type,
 * and it was the one rule asserted only by a hidden test with no hint behind it. Every rule the
 * hidden suite asserts is now stated in the README AND reachable from a hint.
 *
 * Time budget behind `estimatedMinutes` (measured, not guessed): teach 11 (674 prose words, four
 * checks), apply 17 (93 visible lines to read, a 36-line parser to write), practice 8 (50 visible
 * lines, a three-line repair).
 */
import type { PythonLesson } from "../../types"

const EMPTY_INIT = ""

/** Local copy: buildRunner is file-local in level3/level4 and not importable. Do not modify. */
function buildRunner(
  visibleModule: string,
  hiddenModule: string,
  visibleSuite: string,
  hiddenSuite: string
): string {
  return String.raw`import json
import os
import sys
import traceback

sys.path.insert(0, os.getcwd())
from tests import ${visibleModule}, ${hiddenModule}

results = []


def record_factory(suite):
    def record(name, fn):
        is_hidden = "hidden" in suite.lower()
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None, "isHidden": is_hidden})
        except AssertionError as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or (name + " failed"), "isHidden": is_hidden})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc(), "isHidden": is_hidden})

    return record


${visibleModule}.run_tests(record_factory("${visibleSuite}"))
${hiddenModule}.run_tests(record_factory("${hiddenSuite}"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`
}

// ───────────────────────────────────────────────────────────────────────────
// Apply: the usage report's filter expressions
// ───────────────────────────────────────────────────────────────────────────

const FILTERS_README = `# Filter expressions for the usage report

**The assistant's pull request.** Adds filter expressions to the usage report so a caller can
narrow the rows without a new endpoint. \`match(row, expression)\` returns \`True\` when the row
satisfies the expression. Every feature test passes.

**The reviewer's brief.** The feature is wanted, the implementation is not. Repair
\`reports/filters.py\` so an expression is parsed against the grammar below and everything outside
that grammar raises \`ValueError\`. \`reports/data.py\` is read-only.

The grammar is five rules, exactly:

1. an expression is \`field op value\`, with or without spaces around the operator
2. \`op\` is one of \`==\`, \`!=\`, \`>=\`, \`<=\`
3. \`value\` is either an integer literal such as \`5000\` or a single-quoted string such as \`'open'\`
4. \`field\` must be a key of the row, and the value's kind must match that field's type: an integer
   against an integer field, a quoted string against a string field
5. \`match\` returns \`True\` or \`False\`, and raises \`ValueError\` for anything else

The visible suite holds the assistant's feature tests, which pass today, and two audit probes,
which do not. The feature tests stay green so a repair that deletes the feature still fails. Some
tests are hidden.
`

const FILTERS_DATA = String.raw`"""The rows the usage report renders. Read-only, shared by both suites."""

ROWS = [
    {"id": 1, "status": "open", "amount_cents": 5000, "owner": "ada"},
    {"id": 2, "status": "closed", "amount_cents": 12000, "owner": "dana"},
    {"id": 3, "status": "open", "amount_cents": 250, "owner": "raj"},
    {"id": 4, "status": "paid", "amount_cents": 7400, "owner": "ada"},
]
`

const FILTERS_STARTER = String.raw`"""Filter expressions for the usage report.

Generated code under review.
"""


def match(row, expression):
    """Return True when the row satisfies the filter expression."""
    # Safe because __builtins__ is empty, so nothing can be imported.
    return bool(eval(expression, {"__builtins__": {}}, dict(row)))
`

const FILTERS_REFERENCE = String.raw`"""Filter expressions for the usage report.

The grammar is parsed, never executed. An expression is field op value, where the value is an
integer literal or a single-quoted string whose kind matches the field. Everything else is refused.
"""

OPERATORS = ["==", "!=", ">=", "<="]


def parse_value(text):
    """Return (kind, value) for a literal, or raise ValueError."""
    if len(text) >= 2 and text.startswith("'") and text.endswith("'"):
        return "str", text[1:-1]
    try:
        return "int", int(text)
    except ValueError:
        raise ValueError("value is neither an integer nor a quoted string: " + text)


def match(row, expression):
    """Return True when the row satisfies the filter expression."""
    for operator in OPERATORS:
        if operator in expression:
            field, _, raw_value = expression.partition(operator)
            break
    else:
        raise ValueError("no operator in expression: " + expression)

    field = field.strip()
    if field not in row:
        raise ValueError("unknown field: " + field)

    kind, value = parse_value(raw_value.strip())
    field_kind = "str" if isinstance(row[field], str) else "int"
    if kind != field_kind:
        raise ValueError(field + " holds " + field_kind + " values: " + expression)

    left = row[field]
    if operator == "==":
        return left == value
    if operator == "!=":
        return left != value
    if operator == ">=":
        return left >= value
    return left <= value
`

const FILTERS_TEST_VISIBLE = String.raw`"""The feature suite from the assistant's pull request, plus the first two audit probes.

The feature cases pass on the generated code. The audit probes are expressions from outside the
five-rule grammar, so match has to refuse each of them with ValueError. They are harmless on
purpose: they only have to show that the expression left the grammar behind.
"""

from reports.data import ROWS
from reports.filters import match

OPEN_ROW = ROWS[0]
CLOSED_ROW = ROWS[1]
SMALL_ROW = ROWS[2]


def rejects(expression, note):
    """Assert that match refuses the expression with ValueError."""
    try:
        outcome = "was accepted and returned " + repr(match(OPEN_ROW, expression))
    except ValueError:
        return
    except Exception as exc:
        outcome = "raised " + type(exc).__name__ + " (" + str(exc) + ")"
    raise AssertionError(
        repr(expression) + " " + outcome + " instead of raising ValueError. " + note
    )


def run_tests(record):
    def string_equality():
        got = match(OPEN_ROW, "status == 'open'")
        assert got is True, "status == 'open' on the open row returned " + repr(got)
        got = match(CLOSED_ROW, "status == 'open'")
        assert got is False, "status == 'open' on the closed row returned " + repr(got)

    def not_equal():
        got = match(OPEN_ROW, "owner != 'dana'")
        assert got is True, "owner != 'dana' for the owner ada returned " + repr(got)
        got = match(CLOSED_ROW, "owner != 'dana'")
        assert got is False, "owner != 'dana' for the owner dana returned " + repr(got)

    def at_least():
        got = match(OPEN_ROW, "amount_cents >= 5000")
        assert got is True, "amount_cents >= 5000 at exactly 5000 returned " + repr(got)
        got = match(SMALL_ROW, "amount_cents >= 5000")
        assert got is False, "amount_cents >= 5000 at 250 returned " + repr(got)

    def at_most():
        got = match(SMALL_ROW, "amount_cents <= 1000")
        assert got is True, "amount_cents <= 1000 at 250 returned " + repr(got)
        got = match(CLOSED_ROW, "amount_cents <= 1000")
        assert got is False, "amount_cents <= 1000 at 12000 returned " + repr(got)

    def spaces_are_optional():
        got = match(OPEN_ROW, "status=='open'")
        assert got is True, "the no-space form status=='open' returned " + repr(got)

    def object_internals():
        rejects(
            "().__class__.__mro__",
            "The expression escaped the grammar and reached Python object internals.",
        )

    def compound_expression():
        rejects(
            "amount_cents >= 5000 or status == 'open'",
            "Boolean compounds are not part of the documented grammar.",
        )

    record("equality on a string field", string_equality)
    record("not equal on a string field", not_equal)
    record("at least, on an integer field", at_least)
    record("at most, on an integer field", at_most)
    record("spaces around the operator are optional", spaces_are_optional)
    record("object internals are not an expression", object_internals)
    record("compound expressions are refused", compound_expression)
`

const FILTERS_TEST_HIDDEN = String.raw`"""The rest of the audit: grammar rules the README states and the visible probes do not cover."""

from reports.data import ROWS
from reports.filters import match

ROW = ROWS[0]


def rejects(expression):
    """Assert that match refuses the expression with ValueError."""
    try:
        outcome = "was accepted and returned " + repr(match(ROW, expression))
    except ValueError:
        return
    except Exception as exc:
        outcome = "raised " + type(exc).__name__ + " instead of ValueError"
    raise AssertionError(repr(expression) + " " + outcome)


def run_tests(record):
    def unknown_field():
        rejects("missing_field == 1")

    def unquoted_value():
        rejects("status == open")

    def wrong_kind_of_value():
        rejects("amount_cents == 'open'")

    record("unknown fields are refused", unknown_field)
    record("an unquoted value is refused", unquoted_value)
    record("a value of the wrong kind is refused", wrong_kind_of_value)
`

// ───────────────────────────────────────────────────────────────────────────
// Practice: the document service's fetch-by-path
// ───────────────────────────────────────────────────────────────────────────

const DOCSTORE_README = `# Serve a document by relative path

**The assistant's pull request.** Adds fetch-by-relative-path to the team's document endpoint, so
a caller can ask for \`guide.md\` instead of the team adding a route per document. The tests pass.

**The reviewer's brief.** Audit \`docstore/service.py\` and repair \`fetch(rel_path)\`.

The contract:

- only documents under \`docs/\` are ever served
- a path that resolves outside \`docs/\` raises \`ValueError\`, in whatever spelling it arrives
- a path that resolves under \`docs/\` but names no document raises \`LookupError\`
- the documents that were served before are still served

\`docstore/storage.py\` is the read-only store. Some tests are hidden.
`

const DOCSTORE_STORAGE = String.raw`"""The in-memory document store. Read-only."""

FILES = {
    "docs/guide.md": "Guide: how this team writes a runbook.",
    "docs/setup.md": "Setup: install the toolchain, then run the seed script.",
    "internal/rotation-list.md": "Internal: who carries the pager this quarter.",
}
`

const DOCSTORE_STARTER = String.raw`"""Serve documents by relative path.

Generated code under review.
"""

import posixpath

from docstore.storage import FILES


def fetch(rel_path):
    """Return the contents of the document at rel_path, relative to docs/."""
    # normpath tidies the path up, so the result stays inside docs/.
    full = posixpath.normpath("docs/" + rel_path)
    if full not in FILES:
        raise LookupError(rel_path)
    return FILES[full]
`

const DOCSTORE_REFERENCE = String.raw`"""Serve documents by relative path.

The caller controls rel_path, so the check belongs on the normalized RESULT: join it onto
the root, normalize, and refuse anything that no longer sits under the root.
"""

import posixpath

from docstore.storage import FILES

ROOT = "docs"


def fetch(rel_path):
    """Return the contents of the document at rel_path, relative to docs/."""
    full = posixpath.normpath(posixpath.join(ROOT, rel_path))
    if not full.startswith(ROOT + "/"):
        raise ValueError("path resolves outside " + ROOT + ": " + rel_path)
    if full not in FILES:
        raise LookupError(rel_path)
    return FILES[full]
`

const DOCSTORE_TEST_VISIBLE = String.raw`"""The feature suite from the assistant's pull request. It passes on the generated code."""

from docstore.service import fetch


def run_tests(record):
    def serves_the_guide():
        got = fetch("guide.md")
        assert got.startswith("Guide:"), "fetch of guide.md returned " + repr(got)

    def serves_the_setup_notes():
        got = fetch("setup.md")
        assert got.startswith("Setup:"), "fetch of setup.md returned " + repr(got)

    def unknown_document():
        try:
            fetch("missing.md")
        except LookupError:
            return
        except Exception as exc:
            raise AssertionError(
                "fetch of missing.md raised " + type(exc).__name__ + " instead of LookupError"
            )
        raise AssertionError("fetch of missing.md returned a document instead of raising LookupError")

    record("serves the guide", serves_the_guide)
    record("serves the setup notes", serves_the_setup_notes)
    record("an unknown document raises LookupError", unknown_document)
`

const DOCSTORE_TEST_HIDDEN = String.raw`"""The audit suite: paths that must never reach a document outside docs/."""

from docstore.service import fetch


def refuses(rel_path):
    """Assert that fetch refuses the path with ValueError."""
    try:
        result = fetch(rel_path)
    except ValueError:
        return
    except Exception as exc:
        raise AssertionError(
            repr(rel_path) + " raised " + type(exc).__name__ + " instead of ValueError"
        )
    raise AssertionError(repr(rel_path) + " was served instead of raising ValueError: " + repr(result))


def run_tests(record):
    def parent_segment_escape():
        refuses("../internal/rotation-list.md")

    def nested_parent_escape():
        refuses("sub/../../internal/rotation-list.md")

    def absolute_path_escape():
        refuses("/internal/rotation-list.md")

    def dot_segment_still_resolves():
        got = fetch("./setup.md")
        assert got.startswith("Setup:"), "fetch of ./setup.md returned " + repr(got)

    def in_tree_miss_is_a_lookup_error():
        try:
            fetch("internal/rotation-list.md")
        except LookupError:
            return
        except Exception as exc:
            raise AssertionError(
                "an in-tree miss raised " + type(exc).__name__ + " instead of LookupError"
            )
        raise AssertionError("an in-tree miss returned a document instead of raising LookupError")

    def the_feature_still_works():
        got = fetch("guide.md")
        assert got.startswith("Guide:"), "the guide is no longer served: " + repr(got)

    record("a parent segment is refused", parent_segment_escape)
    record("a nested parent escape is refused", nested_parent_escape)
    record("an absolute path is refused", absolute_path_escape)
    record("a dot segment still resolves", dot_segment_still_resolves)
    record("an in-tree miss is a lookup error", in_tree_miss_is_a_lookup_error)
    record("the guide is still served", the_feature_still_works)
`

export const unsafeSinkLesson: PythonLesson = {
  id: "py-l5-unsafe-sink",
  title: "Green tests, unsafe code",
  summary:
    "Audit a generated feature whose tests all pass, follow the user-controlled input to the sink that executes it, and close the hole without losing the feature.",
  estimatedMinutes: 36,
  difficulty: "hard",
  skills: ["code review", "input validation", "defensive programming", "verification"],
  teach: {
    estimatedMinutes: 11,
    markdown: `## The change works and it should not ship

An assistant opens a pull request. It adds a filter box to the usage report, the description is clear, the diff is thirty lines, and every test in the suite is green. You try the feature by hand and it does exactly what the ticket asked for.

Approve it and you have shipped a way to run arbitrary Python from a query string.

This is the happy path lesson with the stakes turned all the way up. Green tests mean the behavior somebody asserted is present. They say nothing about the behavior nobody asserted, and that unasserted space is where a security hole lives. Nothing else in the loop objects either: the model wrote code that works, then wrote tests for the code it wrote, and the two agree with each other by construction. You are the only control left.

## Follow the input to the sink

A sink is the operation that gives an input power: executing it as code, using it as a file path, splicing it into a query, handing it to a shell. Everything else in a program moves data around. A sink is where data starts making decisions.

So the audit is two questions, in this order, on any code that touches a request.

1. What does the user control?
2. What is the most powerful thing the code does with it?

The family of sinks is short enough to memorize. \`eval\` and \`exec\` run text as Python. A query built by string concatenation turns a name into a statement. A path join turns a filename into a file anywhere on the disk. A subprocess call built from a string turns an argument into a shell line.

\`\`\`python
# The same query, two shapes. The second one can only ever be a name.
cursor.execute("SELECT * FROM users WHERE name = '" + name + "'")
cursor.execute("SELECT * FROM users WHERE name = ?", (name,))
\`\`\`

Here is the filter feature the pull request added. It is the shortest implementation that satisfies the ticket, which is exactly why it keeps getting generated.

\`\`\`python
def match(row, expression):
    # Safe because __builtins__ is empty, so nothing can be imported.
    return bool(eval(expression, {"__builtins__": {}}, dict(row)))
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "is-empty-builtins-safe",
  "prompt": "The comment claims the empty builtins dictionary makes this eval safe. Is it?",
  "options": [
    {
      "label": "No. Attribute chains on ordinary literals reach Python's internals without needing a builtin, and the grammar is still not enforced",
      "correct": true,
      "feedback": "Right. Emptying builtins removes the import machinery and nothing else. An expression can start from a literal, which is always available, and walk its attributes from there."
    },
    {
      "label": "Yes, because with no builtins there is no way to import anything",
      "feedback": "It is true that __import__ is gone, which is why this pattern survives so many reviews. Literals and their attribute chains are still reachable, and that is already outside the grammar."
    },
    {
      "label": "Yes, because every feature test passes on this implementation",
      "feedback": "This is exactly the reflex the lesson exists to break. The suite asserts the four expressions somebody thought of, and safety is decided by the expressions nobody thought of."
    },
    {
      "label": "It is safe as long as the rows hold nothing sensitive",
      "feedback": "Scoping the damage is a reasonable instinct answering the wrong question. Evaluating request text is the hole whatever today's rows happen to contain, and rows change."
    }
  ]
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "trust-the-input",
  "prompt": "Sort each value by whether a caller can choose it on this request.",
  "buckets": ["User controlled", "Code owned"],
  "items": [
    {
      "label": "The filter expression that arrives with the report request",
      "bucket": "User controlled",
      "feedback": "It comes straight off the request, so every character of it is somebody else's choice."
    },
    {
      "label": "The ROWS dataset defined in data.py",
      "bucket": "Code owned",
      "feedback": "Tempting to call it user data because the values describe users. This code path receives it from the repository, and the live input on this request is the expression."
    },
    {
      "label": "The report page size constant in the settings module",
      "bucket": "Code owned",
      "feedback": "A value the team wrote and deployed. Nothing on the request can change it, so it is not part of the surface you are auditing."
    },
    {
      "label": "The relative document path in a documents URL",
      "bucket": "User controlled",
      "feedback": "Anything in a URL was typed by the caller, including the parts that look like an innocent file name."
    }
  ]
}
\`\`\`

## An allowlist beats a blocklist

The repair reflex is to filter the bad input out: strip double underscores, reject the word import, block a semicolon. That is a blocklist, and a blocklist loses on a schedule. You have to anticipate every hostile spelling. The person probing your endpoint has to find one you missed, once.

An allowlist inverts the arithmetic. Write down the grammar you meant to support, parse the input against that grammar, and refuse everything that does not fit. What gets refused is then everything you did not think of, which is the set that was going to hurt you.

\`\`\`python
# The shape of the parser, not the parser
# 1. find the operator the expression uses, and split the expression once there
# 2. check the left side against the row's real fields
# 3. parse the right side as a literal: an integer, or a quoted string
# 4. check that the literal's kind matches the field, then compare with a plain if chain
\`\`\`

Notice what is absent from that outline. Nothing in it executes the input. The input stays data the whole way through, and the code does the deciding.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "repair-strategy",
  "prompt": "What is the right repair for a filter feature built on eval?",
  "options": [
    {
      "label": "Parse the documented grammar and refuse everything outside it",
      "correct": true,
      "feedback": "Right. You enumerate what is allowed, so what gets refused is everything you did not think of, and you no longer have to be more imaginative than the attacker."
    },
    {
      "label": "Block dangerous substrings such as double underscores and the word import",
      "feedback": "Fast, targeted, and a blocklist. It works until somebody finds a spelling you did not list, and there are always more spellings than there are review afternoons."
    },
    {
      "label": "Wrap the eval in try and except so a bad expression cannot crash the report",
      "feedback": "Useful against typos and useless against escapes. The audit probes show the dangerous expressions do not raise at all, they quietly return a value."
    },
    {
      "label": "Shrink the globals dictionary further so fewer names are reachable",
      "feedback": "This is the starter's own comment restated with more effort behind it. The sink is still a sink, because the input is still being executed rather than parsed."
    }
  ]
}
\`\`\`

## The same audit, a different sink

When a caller controls a path fragment, joining it onto a base directory and normalizing does not keep it under that base. Normalization is not a security check, it is a tidying step, and it will happily tidy its way out of the directory you meant.

\`\`\`python
import posixpath
print(posixpath.normpath("docs/" + "../internal/rotation-list.md"))
# internal/rotation-list.md
\`\`\`

The base disappeared. So the check belongs on the normalized result rather than on the raw input: normalize first, then require the answer to sit under the directory you meant, and refuse it otherwise.

## Pitfalls

- Trusting a gutted \`__builtins__\`. It removes \`__import__\` and leaves every attribute of every literal.
- Blocklisting substrings. You are guessing at spellings. A parser does not have to guess.
- Wrapping the sink in \`try\`. That catches accidents. An escape does not raise, it returns a value.
- Repairing so hard the feature dies. The feature tests are there to hold that side of the trade.

**Interview nuance:** a security observation during a code review round is rare and gets credited far out of proportion to the seconds it costs. The form that lands is one sentence naming the input, the sink, and the fix: this endpoint evaluates user text, I would parse the grammar instead.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "green-and-unsafe",
  "prompt": "The pull request says every test passes. What exactly did that prove?",
  "options": [
    {
      "label": "Only that the behavior somebody asserted is present, which leaves safety in the unasserted space",
      "correct": true,
      "feedback": "Right. A suite is a list of claims that were checked, and this hole sits outside the list. Following the input to the sink is the control that covers the rest of it."
    },
    {
      "label": "That the change is correct",
      "feedback": "Correct at the thing it set out to do, and silent about everything else it also permits. Those are two different claims and only the first one was measured."
    },
    {
      "label": "That the tests are bad and should be rewritten",
      "feedback": "The feature tests are fine. They answer whether the filter filters, which is a real question, just not the question the reviewer is asking."
    },
    {
      "label": "That more tests would have caught this automatically",
      "feedback": "More tests only help once somebody suspects the case, so the audit comes first and the test records it. Tests preserve a finding, they do not produce one."
    }
  ],
  "reveal": "Two questions, every time. What does the user control, and what is the most powerful thing the code does with it. Then repair with an allowlist: parse the grammar you meant and refuse the rest, while the feature tests hold you to keeping the feature."
}
\`\`\`

The real thing next: the [bug-fix interview rounds](/practice) drop you into a codebase like these with an interviewer in the loop.`,
    demoCode: `# The escape, in one line, with builtins already emptied.
print(eval("().__class__.__mro__", {"__builtins__": {}}, {}))

# The allowlist. The same string never gets near an evaluator.
ALLOWED_FIELDS = ("status", "amount_cents", "owner")
expression = "().__class__.__mro__"
field = expression.partition("==")[0].strip()
if field in ALLOWED_FIELDS:
    print("parsed field:", field)
else:
    print("refused: not in the grammar")`,
  },
  apply: {
    id: "py-l5-unsafe-sink-apply",
    executionMode: "workspace",
    prompt: `Repair \`reports/filters.py\` so filter expressions are parsed against the documented grammar
and everything outside it raises \`ValueError\`, while every feature test stays green.

The README states the grammar as five rules, and the graded tests hold you to all five. The visible
suite mixes the assistant's feature tests, which pass today, with two audit probes that do not: each
probe is an expression that leaves the grammar behind. Do not modify \`reports/data.py\`. Some tests
are hidden.`,
    starterCode: "",
    hints: [
      "List what the caller controls, which is the whole `expression` string, then find the most powerful thing the code does with it.",
      "An empty `__builtins__` does not make `eval` safe, because `().__class__.__mro__` needs no builtins at all, so the grammar has to be parsed rather than executed.",
      'Scan `["==", "!=", ">=", "<="]` for the operator and `partition` the expression there, then check three things before comparing: the field is a key of `row`, the value parses as an integer or a single-quoted string, and the value\'s kind matches that field\'s type.',
    ],
    workspace: {
      language: "python",
      primaryFilePath: "reports/filters.py",
      editableFilePaths: ["reports/filters.py"],
      visibleTestPaths: ["tests/test_filters.py"],
      hiddenTestPaths: ["tests/test_filters_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: FILTERS_README },
        { path: "reports/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "reports/data.py",
          role: "readonly",
          language: "python",
          content: FILTERS_DATA,
          description: "The report's rows (read-only)",
        },
        {
          path: "reports/filters.py",
          role: "editable",
          language: "python",
          content: FILTERS_STARTER,
          description: "Repair match here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_filters.py",
          role: "test",
          language: "python",
          content: FILTERS_TEST_VISIBLE,
          description: "Visible tests: the feature suite plus two audit probes",
        },
        {
          path: "tests/test_filters_hidden.py",
          role: "test",
          language: "python",
          content: FILTERS_TEST_HIDDEN,
          hidden: true,
          description: "Hidden audit tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_filters",
            "test_filters_hidden",
            "visible filters",
            "hidden filters"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "reports/filters.py",
          role: "editable",
          language: "python",
          content: FILTERS_REFERENCE,
        },
      ],
    },
  },
  practice: {
    id: "py-l5-unsafe-sink-practice",
    executionMode: "workspace",
    prompt: `A generated change added fetch-by-path to your team's document service and its tests pass.
Audit \`docstore/service.py\` for input that can reach outside the documents area, then repair
\`fetch\` so only paths under \`docs/\` are served.

Out-of-tree requests must raise \`ValueError\` and unknown documents must still raise
\`LookupError\`. \`docstore/storage.py\` is read-only. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Same audit as the filter review: what does the caller control, and where does it end up?",
      "`posixpath.normpath` happily walks above its base, so the thing to check is the normalized result, not the raw input.",
      "After normalizing, require the result to start with `docs/` and raise `ValueError` otherwise, keeping `LookupError` for unknown documents.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "docstore/service.py",
      editableFilePaths: ["docstore/service.py"],
      visibleTestPaths: ["tests/test_docs.py"],
      hiddenTestPaths: ["tests/test_docs_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: DOCSTORE_README },
        { path: "docstore/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "docstore/storage.py",
          role: "readonly",
          language: "python",
          content: DOCSTORE_STORAGE,
          description: "The in-memory document store (read-only)",
        },
        {
          path: "docstore/service.py",
          role: "editable",
          language: "python",
          content: DOCSTORE_STARTER,
          description: "Repair fetch here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_docs.py",
          role: "test",
          language: "python",
          content: DOCSTORE_TEST_VISIBLE,
          description: "Visible document tests",
        },
        {
          path: "tests/test_docs_hidden.py",
          role: "test",
          language: "python",
          content: DOCSTORE_TEST_HIDDEN,
          hidden: true,
          description: "Hidden document audit tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner("test_docs", "test_docs_hidden", "visible docs", "hidden docs"),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "docstore/service.py",
          role: "editable",
          language: "python",
          content: DOCSTORE_REFERENCE,
        },
      ],
    },
  },
}

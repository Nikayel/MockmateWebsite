import type { PythonLesson } from "../../types"

// ---------------------------------------------------------------------------
// Workspace file contents for the `parse_config` practice challenge.
// ---------------------------------------------------------------------------

const README = `# Config parser

A teammate started a tiny config loader and left you to finish it.

\`app/coerce.py\` (read-only) already turns integer-looking text into an \`int\`. Your job is to
implement \`parse_config(text)\` in \`app/config.py\` so it:

- splits \`text\` into lines
- skips blank lines and lines that start with \`#\`
- skips any remaining line that has no \`=\`
- splits each remaining line on the **first** \`=\`
- trims whitespace around the key and value
- runs the value through \`coerce\` so numbers become \`int\`

Run the tests to check your work. Some tests are hidden.
`

const APP_INIT = ""

const COERCE = String.raw`def coerce(raw):
    """Return an int for integer-looking text, otherwise the trimmed string.

    Examples: "42" -> 42, "-3" -> -3, "  hi " -> "hi".
    """
    value = raw.strip()
    if value.lstrip("-").isdigit():
        return int(value)
    return value
`

const CONFIG_STARTER = String.raw`from app.coerce import coerce


def parse_config(text):
    """Parse "key = value" lines into a dict (see README.md)."""
    # TODO: implement me, split lines, skip blanks/comments, split on the first
    # "=", strip whitespace, and coerce the value.
    return {}
`

const CONFIG_REFERENCE = String.raw`from app.coerce import coerce


def parse_config(text):
    result = {}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        result[key.strip()] = coerce(value)
    return result
`

const TESTS_INIT = ""

const TEST_CONFIG = String.raw`from app.config import parse_config


def run_tests(record):
    def parses_basic_pairs():
        result = parse_config("name = Ada\nrole = engineer")
        assert result == {"name": "Ada", "role": "engineer"}, f"got {result!r}"

    def coerces_integer_values():
        result = parse_config("retries = 5")
        assert result == {"retries": 5}, f"expected retries to be int 5, got {result!r}"

    def ignores_blanks_and_comments():
        result = parse_config("# a comment\n\nhost = localhost\n")
        assert result == {"host": "localhost"}, f"got {result!r}"

    record("parses basic key=value pairs", parses_basic_pairs)
    record("coerces integer values", coerces_integer_values)
    record("ignores blank lines and comments", ignores_blanks_and_comments)
`

const TEST_CONFIG_HIDDEN = String.raw`from app.config import parse_config


def run_tests(record):
    def splits_on_the_first_equals_only():
        result = parse_config("url = http://x/?a=1")
        assert result == {"url": "http://x/?a=1"}, f"got {result!r}"

    def trims_surrounding_whitespace():
        result = parse_config("   port   =   8080   ")
        assert result == {"port": 8080}, f"expected port to be int 8080, got {result!r}"

    def handles_negative_integers():
        result = parse_config("offset = -3")
        assert result == {"offset": -3}, f"got {result!r}"

    record("splits on the first = only", splits_on_the_first_equals_only)
    record("trims surrounding whitespace", trims_surrounding_whitespace)
    record("handles negative integers", handles_negative_integers)
`

const TEST_RUNNER = String.raw`import json
import os
import sys
import traceback

sys.path.insert(0, os.getcwd())
from tests import test_config, test_config_hidden

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


test_config.run_tests(record_factory("visible config"))
test_config_hidden.run_tests(record_factory("hidden config"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`

export const parseConfigLesson: PythonLesson = {
  id: "py-l3-parse-config",
  title: "Working across files",
  summary: "Build a config parser across modules, using a read-only helper and real test files.",
  estimatedMinutes: 18,
  difficulty: "medium",
  skills: ["modules", "imports", "string-parsing", "type-coercion"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why one file stops being enough

A script that does everything in one file is easy to start and painful to grow. You cannot reuse a function without copying it, you cannot test a rule in isolation, and every edit risks breaking something unrelated. Splitting code into **modules** (one \`.py\` file per responsibility) fixes this. A config parser is a clean example: one module knows how to turn a string into the right type, another knows how to walk lines of text. Each part stays small, testable, and imported only where it is needed.

## What \`import\` actually does

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "import-runs-file-once",
  "prompt": "Two different modules in your project both run 'from app.coerce import coerce'. app/coerce.py has a print() at the top of the file, outside any function. How many times does that line print in one run of the program?",
  "options": [
    {
      "label": "Twice, once for each import statement",
      "feedback": "Tempting, because both import statements really do execute, and an import reads a lot like a function call. But only the first one runs the file. After that Python has the module cached and the second import just binds a name."
    },
    {
      "label": "Once, the first import runs the file and later imports reuse it",
      "correct": true,
      "feedback": "Right. A module is executed once per process and stored in sys.modules, so top-level work (reading a config, opening a connection, building a dict) happens exactly once no matter how many files import it."
    },
    {
      "label": "Zero times, importing one name only pulls in that one function",
      "feedback": "Tempting, because the 'from X import y' form looks surgical, as if it lifted a single function out of the file. But Python has to execute the whole file before the name y exists at all, so every top-level statement runs."
    }
  ]
}
\`\`\`

\`import\` is not a copy-paste of code into your file. When Python first runs \`from app.coerce import coerce\`, it does three things:

1. Finds \`app/coerce.py\`, creates a module object, and registers it in \`sys.modules\` so a repeat import reuses it instead of re-running the file.
2. Executes the file top to bottom, once, populating that module object.
3. Binds the name \`coerce\` into the current file's namespace.

The two import forms differ in the name you get:

\`\`\`python
import app.coerce              # call it as app.coerce.coerce(...)
from app.coerce import coerce  # call it as coerce(...)
\`\`\`

Here \`parse_config\` imports the read-only \`coerce\` helper and calls it. The type rule lives in exactly one place, so fixing it fixes every caller.

## Coercing a raw string to a type

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "isdigit-rejects-minus",
  "prompt": "coerce has to decide whether text is integer-looking. What does '-3'.isdigit() return?",
  "options": [
    {
      "label": "True, because -3 is an integer",
      "feedback": "Tempting, because -3 is obviously an integer to a human reader. But isdigit answers a narrower question: is every single character in this string a digit? The minus sign is not, so you get False."
    },
    {
      "label": "False, because the minus sign is not a digit",
      "correct": true,
      "feedback": "Right. isdigit is a character-by-character test, so a sign, a decimal point, or a stray space all make it False. That is exactly why coerce strips a leading minus before testing."
    },
    {
      "label": "It raises a ValueError, since -3 needs int() to parse",
      "feedback": "Close in spirit: int('-3x') really would raise. But isdigit is a predicate on a string, not a parser. It never raises for ordinary text, it just answers True or False."
    }
  ]
}
\`\`\`

Config values arrive as strings, so \`coerce\` has to decide whether a value is really an integer:

\`\`\`python
>>> "  hi ".strip()
'hi'
>>> "-3".isdigit()               # the "-" makes this False
False
>>> "-3".lstrip("-").isdigit()   # strip the sign first, then test
True
>>> int("-3")
-3
\`\`\`

The rule is: trim the string, strip a leading \`-\` before calling \`isdigit\`, return \`int(value)\` when it looks integer, otherwise return the trimmed string. That is your Apply warm-up.

## Parsing \`key = value\` lines

A config file is lines of \`key = value\`. The loop guards blanks and comments, then splits once:

\`\`\`python
for line in text.splitlines():
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        continue
    key, value = stripped.split("=", 1)   # maxsplit=1
    # store key.strip() -> coerce(value.strip())
\`\`\`

Given \`"# db\\nhost = localhost\\nport = 8080"\`, this produces \`{"host": "localhost", "port": 8080}\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "split-without-maxsplit",
  "prompt": "A config file contains the line 'url = http://x/?a=1'. Your loop does key, value = stripped.split('=') with no maxsplit argument. What happens on that line?",
  "options": [
    {
      "label": "It works: split hands back the key and everything after the first =",
      "feedback": "Tempting, because that is the behaviour you want, and it is what split('=', 1) gives you. Plain split has no such limit though: it cuts at every = in the line, so this one produces three pieces, not two."
    },
    {
      "label": "It raises ValueError: too many values to unpack (expected 2)",
      "correct": true,
      "feedback": "Right. split('=') returns three parts here and a two-name assignment cannot absorb three. Passing a maxsplit of 1 cuts on the first = only and leaves any = inside the value intact."
    },
    {
      "label": "It quietly drops everything after the second =, storing url as http://x/?a",
      "feedback": "Close, and that is a real bug you will meet: it is what split('=')[0] and [1] would do, truncating in silence. Tuple unpacking is the louder version. It refuses to guess and raises instead."
    }
  ]
}
\`\`\`

## Pitfalls

- **Splitting without \`maxsplit\`.** \`"url = a=b".split("=")\` returns three parts, so \`key, value = ...\` raises \`ValueError: too many values to unpack (expected 2)\`. Passing \`1\` splits on the first \`=\` only and keeps any \`=\` inside the value intact.
- **Forgetting to trim the key.** \`"host = localhost".split("=", 1)\` gives \`["host ", " localhost"]\`. The value passes through \`coerce\`, which trims it, but the key does not. Store \`"host "\` (with the trailing space) as the key and a later \`config["host"]\` lookup raises \`KeyError\` instead of returning the value. Call \`.strip()\` on the key before storing it.

**Interview nuance:** bounded splitting is the detail interviewers probe when you parse text. \`stripped.split("=", 1)\` splits on the first \`=\` only, so a value that itself contains \`=\` (a URL like \`url = a=b\`, a base64 token, a connection string) stays intact, while a bare \`split("=")\` raises \`ValueError\` the instant a value holds a second delimiter. Pair that with deciding a value's type from the raw string (trim it, strip a leading sign, then test \`isdigit\`) and you are doing real boundary parsing: turning loose text into typed data without trusting its shape.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "which-lines-survive",
  "prompt": "Sort each config line by what parse_config does with it.",
  "buckets": ["Becomes an entry", "Skipped"],
  "items": [
    {
      "label": "name = Ada",
      "bucket": "Becomes an entry",
      "feedback": "The ordinary case. Key 'name' mapped to the string 'Ada', with whitespace trimmed off both sides."
    },
    {
      "label": "# retries = 5",
      "bucket": "Skipped",
      "feedback": "After stripping, the line starts with #, so the comment guard drops it before any splitting happens. Note that it would have parsed cleanly otherwise, which is the point of the guard."
    },
    {
      "label": "a line containing only spaces",
      "bucket": "Skipped",
      "feedback": "stripped is the empty string, which is falsy, so the blank guard catches it first."
    },
    {
      "label": "DEBUG",
      "bucket": "Skipped",
      "feedback": "There is no = anywhere in the line, so unpacking would raise. The 'if = not in stripped' guard is what keeps one malformed line from killing the whole parse."
    },
    {
      "label": "url = a=b",
      "bucket": "Becomes an entry",
      "feedback": "Splitting on the first = only gives key 'url' and value 'a=b'. This is the line that punishes a bare split('=')."
    },
    {
      "label": "port =   8080  ",
      "bucket": "Becomes an entry",
      "feedback": "Key 'port' mapped to the int 8080. coerce trims the value and converts integer-looking text, so the caller gets a number rather than a padded string."
    }
  ],
  "reveal": "Every guard in that loop exists because some real config file broke a parser that lacked it. Your Practice implementation has to survive all six of these lines, and the hidden tests check the awkward ones."
}
\`\`\``,
  },
  apply: {
    id: "py-l3-parse-config-apply",
    executionMode: "single-file",
    prompt: `Warm-up: implement \`coerce(raw)\`.

Return an \`int\` when \`raw\` is integer-looking (all digits, optionally with a leading \`-\`),
otherwise return the trimmed string. Examples: \`"42"\` → \`42\`, \`"-3"\` → \`-3\`, \`"  hi "\` → \`"hi"\`.`,
    starterCode: `def coerce(raw):
    # Return an int for integer-looking text, else the trimmed string.
    pass`,
    hints: [
      "Trim first: `value = raw.strip()`.",
      '`value.lstrip("-").isdigit()` is True for "42" and "-3" but not "hi".',
      "When it's integer-looking, `return int(value)`; otherwise `return value`.",
    ],
    referenceSolution: `def coerce(raw):
    value = raw.strip()
    if value.lstrip("-").isdigit():
        return int(value)
    return value`,
    testCases: [
      { input: { raw: "42" }, expected: 42, description: "plain integer" },
      { input: { raw: "-3" }, expected: -3, description: "negative integer" },
      { input: { raw: "  7 " }, expected: 7, description: "integer with whitespace" },
      { input: { raw: "hello" }, expected: "hello", description: "non-numeric stays a string" },
    ],
  },
  practice: {
    id: "py-l3-parse-config-practice",
    executionMode: "workspace",
    prompt: `Now build the real thing. Implement \`parse_config(text)\` in \`app/config.py\` so it parses
\`key = value\` lines into a dict, skipping blanks and \`#\` comments, splitting on the first \`=\`,
trimming whitespace, and running each value through the read-only \`coerce\` helper. Open the visible
test to see the expected behaviour; some tests are hidden.`,
    starterCode: "",
    hints: [
      "Loop `for line in text.splitlines():` and `continue` past blanks and comments.",
      '`stripped.split("=", 1)` splits on the first `=` only. That matters for values like URLs.',
      "`coerce` is already imported for you; call it on the value before storing it.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "app/config.py",
      editableFilePaths: ["app/config.py"],
      visibleTestPaths: ["tests/test_config.py"],
      hiddenTestPaths: ["tests/test_config_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: README },
        { path: "app/__init__.py", role: "readonly", language: "python", content: APP_INIT },
        {
          path: "app/coerce.py",
          role: "readonly",
          language: "python",
          content: COERCE,
          description: "Type coercion helper (read-only)",
        },
        {
          path: "app/config.py",
          role: "editable",
          language: "python",
          content: CONFIG_STARTER,
          description: "Implement parse_config here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: TESTS_INIT,
          hidden: true,
        },
        {
          path: "tests/test_config.py",
          role: "test",
          language: "python",
          content: TEST_CONFIG,
          description: "Visible config tests",
        },
        {
          path: "tests/test_config_hidden.py",
          role: "test",
          language: "python",
          content: TEST_CONFIG_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: TEST_RUNNER,
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "app/config.py",
          role: "editable",
          language: "python",
          content: CONFIG_REFERENCE,
        },
      ],
    },
  },
}

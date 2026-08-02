/**
 * Level 3: Patterns (workspace). The syntax real codebases run on, drilled across real files.
 *
 * Agent 1 seeds ONE sample workspace lesson here (`py-l3-parse-config`) as proof of the multi-file
 * path; Agent 2 authors the rest. The lesson pairs a single-file warm-up (`apply`: implement the
 * `coerce` helper) with a workspace challenge (`practice`: build `parse_config` across files, using
 * the now-readonly `coerce`).
 *
 * Workspace authoring contract (verified against the production bugfix labs + the client Pyodide
 * runner): every Python package dir needs an `__init__.py`; the runner (`role:"test"`,
 * `hidden:true`) does `sys.path.insert(0, os.getcwd())`, imports the test modules, runs each
 * module's `run_tests(record)`, and prints `__WORKSPACE_TEST_RESULTS__:` + JSON. `isHidden` is
 * derived from `"hidden" in suite.lower()`. Hidden files never reach the editor, so hidden-test
 * source can't leak, but they still execute.
 */
import type { PythonLevel } from "../../types"

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

const parseConfigLesson: PythonLevel["modules"][number]["lessons"][number] = {
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

// ───────────────────────────────────────────────────────────────────────────
// Shared empty file content for package/test __init__.py entries.
// ───────────────────────────────────────────────────────────────────────────
const EMPTY_INIT = ""

/** Build a standard workspace runner that imports two test modules and prints the results marker. */
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

/**
 * Build a pytest-flavoured runner: it discovers `test_*` functions in each test module (like
 * pytest does) and records pass/fail, so lesson test files read as real pytest while still running
 * under the client Pyodide executor (which has no pytest installed).
 */
function buildPytestRunner(
  visibleModule: string,
  hiddenModule: string,
  visibleSuite: string,
  hiddenSuite: string
): string {
  return String.raw`import inspect
import json
import os
import sys
import traceback

sys.path.insert(0, os.getcwd())
from tests import ${visibleModule}, ${hiddenModule}

results = []


def run_module(module, suite):
    is_hidden = "hidden" in suite.lower()
    for name, fn in inspect.getmembers(module, inspect.isfunction):
        if not name.startswith("test_") or getattr(fn, "__module__", None) != module.__name__:
            continue
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None, "isHidden": is_hidden})
        except AssertionError as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or (name + " failed"), "isHidden": is_hidden})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc(), "isHidden": is_hidden})


run_module(${visibleModule}, "${visibleSuite}")
run_module(${hiddenModule}, "${hiddenSuite}")
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`
}

// ───────────────────────────────────────────────────────────────────────────
// L3-M1: Project Structure & Packaging  (py-l3-packages)
// ───────────────────────────────────────────────────────────────────────────

const PKG_README = `# A tiny store package

Turn one file into a real **package**. The \`store/\` folder is a package (it has an
\`__init__.py\`). \`store/catalog.py\` (read-only) knows item prices; your job is \`store/cart.py\`.

Implement \`cart_total(names)\` so it returns the **total price** of the items named in \`names\`,
looking up each price with the read-only \`price_of\` helper from \`store.catalog\`. Unknown items
cost 0.

Run the tests. Some are hidden.
`

const PKG_CATALOG = String.raw`PRICES = {"apple": 3, "bread": 2, "milk": 4}


def price_of(name):
    """Return the price of a named item, or 0 if it isn't sold."""
    return PRICES.get(name, 0)
`

const PKG_CART_STARTER = String.raw`from store.catalog import price_of


def cart_total(names):
    """Total the price of every item name in the cart (see README.md)."""
    # TODO: look up each name with price_of(...) and add the prices up.
    return 0
`

const PKG_CART_REFERENCE = String.raw`from store.catalog import price_of


def cart_total(names):
    return sum(price_of(name) for name in names)
`

const PKG_TEST = String.raw`from store.cart import cart_total


def run_tests(record):
    def sums_known_items():
        result = cart_total(["apple", "bread"])
        assert result == 5, f"expected 5, got {result!r}"

    def empty_cart_is_zero():
        result = cart_total([])
        assert result == 0, f"expected 0, got {result!r}"

    def unknown_item_is_free():
        result = cart_total(["apple", "candy"])
        assert result == 3, f"expected 3, got {result!r}"

    record("sums known items", sums_known_items)
    record("empty cart totals 0", empty_cart_is_zero)
    record("unknown items count as 0", unknown_item_is_free)
`

const PKG_TEST_HIDDEN = String.raw`from store.cart import cart_total


def run_tests(record):
    def repeated_items_add_up():
        result = cart_total(["milk", "milk"])
        assert result == 8, f"expected 8, got {result!r}"

    def mixes_known_and_unknown():
        result = cart_total(["apple", "milk", "x"])
        assert result == 7, f"expected 7, got {result!r}"

    record("repeated items add up", repeated_items_add_up)
    record("mix of known and unknown", mixes_known_and_unknown)
`

const PKG_RUNNER = String.raw`import json
import os
import sys
import traceback

sys.path.insert(0, os.getcwd())
from tests import test_cart, test_cart_hidden

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


test_cart.run_tests(record_factory("visible cart"))
test_cart_hidden.run_tests(record_factory("hidden cart"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`

const packagesLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-packages",
  title: "Modules, packages & project layout",
  summary: "Split logic across a real Python package with an __init__.py and cross-module imports.",
  estimatedMinutes: 18,
  difficulty: "medium",
  skills: ["packages", "modules", "imports", "project-structure"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## From one file to a package

One 400-line \`.py\` file is where a project goes to die: you scroll forever, everything can touch everything, and nothing tells you who depends on whom. Splitting logic into **modules** fixes that. Each file owns one responsibility, and the imports at the top of a file become a readable map of its dependencies. This is the single most common way real Python codebases stay navigable, and interviewers notice when you reach for it.

### Modules and packages

A **module** is a single \`.py\` file. When you import it, Python runs the file top to bottom once and hands you a namespace object whose attributes are the names defined inside.

A **package** is a directory of modules with an \`__init__.py\` file (it may be empty). That file marks the folder as importable and runs the first time the package is imported.

\`\`\`text
store/
    __init__.py     # marks 'store' as a package
    catalog.py      # owns prices + lookups
    cart.py         # depends on catalog
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "init-py-body-runs",
  "prompt": "store/__init__.py is an empty file. When does Python execute it?",
  "options": [
    {
      "label": "Never. There is nothing in it to run, and its only job is to mark the folder.",
      "feedback": "Tempting, because an empty file has no visible effect and most projects leave it empty forever. But Python really does execute it, which is why dropping an import or a print in there changes behaviour for every consumer of the package."
    },
    {
      "label": "The first time anything imports store, including a submodule like store.catalog.",
      "correct": true,
      "feedback": "Right. The package body runs before any module inside it does. That is why teams put package-wide setup there (re-exports, a version string), and why heavy work in __init__.py taxes every single import."
    },
    {
      "label": "Every time a module inside store is imported.",
      "feedback": "Close, and it is the natural reading of 'runs when the package is imported'. But a package is cached in sys.modules exactly like a module, so its body runs on the first import and never again."
    }
  ]
}
\`\`\`

### Importing across modules

Inside \`cart.py\`, reach a sibling module by its package-qualified path:

\`\`\`python
# store/cart.py
from store.catalog import price_of


def cart_total(names):
    return sum(price_of(name) for name in names)
\`\`\`

\`\`\`python
# a test or app, run from the project root
from store.cart import cart_total

print(cart_total(["apple", "bread"]))   # 5
\`\`\`

\`from store.catalog import price_of\` is an **absolute import**, spelled from the project root. Inside a package you can also write the **relative** form \`from .catalog import price_of\`, where the leading dot means "this package". Relative imports only work inside a package, not in a file you run directly as a script.

### Pitfalls

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "cycle-error-shape",
  "prompt": "catalog.py imports from cart.py while cart.py imports from catalog.py. You run the program. What do you actually see?",
  "options": [
    {
      "label": "A clear error naming the cycle, something like 'circular import detected'",
      "feedback": "Tempting, because that is what a helpful error would say, and linters really do report cycles by that name. Python reports the symptom instead, so the message you get names a missing attribute and says nothing about a cycle."
    },
    {
      "label": "An ImportError or AttributeError about a name that is plainly defined in the file",
      "correct": true,
      "feedback": "Right. Whichever module loads second gets the other one half-executed, so the name it wants has not been defined yet. Chasing the missing name is a dead end. The fix is to make the dependency point one way."
    },
    {
      "label": "Nothing. sys.modules caching turns the second import into a no-op, so it works.",
      "feedback": "Half right, and this is exactly what makes cycles so disorienting. The partly-built module IS handed back from the cache instead of re-running, but 'partly built' is the whole problem: everything defined below the import line is still missing."
    }
  ]
}
\`\`\`

**Circular imports.** If \`catalog\` imports from \`cart\` while \`cart\` imports from \`catalog\`, whichever module loads second sees the first one only half-built, and you get an \`ImportError\` or \`AttributeError\`. The fix is to point dependencies one way. Here \`cart\` depends on \`catalog\`, never the reverse.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Dependencies point one way",
  "layout": "lr",
  "nodes": [
    { "id": "runner", "label": "app.py (what you run)", "kind": "client" },
    { "id": "cart", "label": "store/cart.py", "kind": "service" },
    { "id": "catalog", "label": "store/catalog.py", "kind": "db" }
  ],
  "edges": [
    { "from": "runner", "to": "cart", "kind": "sync", "label": "from store.cart import cart_total" },
    { "from": "cart", "to": "catalog", "kind": "sync", "label": "from store.catalog import price_of" }
  ],
  "stages": [
    { "adds": ["runner"], "note": "The script or test you actually run, started from the project root so 'store' is importable." },
    { "adds": ["cart"], "note": "cart owns the totalling logic and imports what it needs to do that job." },
    { "adds": ["catalog"], "note": "catalog owns prices and imports nothing from cart. It is a leaf, so it can always finish loading." }
  ],
  "caption": "Add one edge back from catalog to cart and this becomes a cycle. Whichever module Python happens to load second then sees the other half-built, which is why the error is an AttributeError on a name that plainly exists in the file."
}
\`\`\`

Read the arrows as "imports from". A healthy package is a graph you can walk in one direction and always reach a leaf.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "run-package-file-directly",
  "prompt": "You are sitting in the project root, the folder that contains store/. cart.py opens with 'from store.catalog import price_of'. You run: python store/cart.py. What happens?",
  "options": [
    {
      "label": "It runs fine. Your working directory is the project root, so store is importable.",
      "feedback": "Tempting, because your shell really is in the project root and that is where store lives. But running a file does not put your working directory on the import path, it puts the script's own folder there, and that folder is store/."
    },
    {
      "label": "ModuleNotFoundError: No module named 'store'",
      "correct": true,
      "feedback": "Right. sys.path gets store/ (the script's directory), so cart.py and catalog.py are visible as top-level names but the package store is not. Run it as python -m store.cart from the root instead."
    },
    {
      "label": "An ImportError from the cycle between cart and catalog",
      "feedback": "A real failure mode for packages, and a fair guess right after reading about cycles. But there is no cycle here: catalog imports nothing from cart. This breaks earlier than that, while Python is still trying to locate the package."
    }
  ]
}
\`\`\`

**Running a package file directly.** \`python store/cart.py\` fails with \`ModuleNotFoundError: No module named 'store'\`, because running a file puts its own folder (\`store/\`) on the import path instead of the project root, so \`store\` is not importable. Run it as a module from the project root with \`python -m store.cart\`, or import it from a top-level script instead. (Had \`cart.py\` used the relative \`from .catalog import price_of\`, the same command would fail differently, with \`attempted relative import with no known parent package\`.)

**Interview nuance:** a module is a singleton. The first import runs the file body and caches the resulting module object in \`sys.modules\`; every later \`import\` returns that same cached object without re-running the file. So top-level code (a \`PRICES\` dict, a database connection) executes exactly once per process, and any module-level state is shared everywhere it is imported. Interviewers probe this when they ask why an import side effect runs only once, or how two modules end up mutating the same object.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "sibling-import-forms",
  "prompt": "You are editing store/cart.py and you need price_of from store/catalog.py. The program is started from the project root with: python -m store.cart. Sort each import line by whether it resolves.",
  "buckets": ["Resolves", "Fails"],
  "items": [
    {
      "label": "from store.catalog import price_of",
      "bucket": "Resolves",
      "feedback": "The absolute form, spelled from the project root. It is the safest default because the line reads identically no matter which module you paste it into."
    },
    {
      "label": "from .catalog import price_of",
      "bucket": "Resolves",
      "feedback": "The relative form. The single dot means 'this package', and running with -m means the parent package is known, so it resolves."
    },
    {
      "label": "from catalog import price_of",
      "bucket": "Fails",
      "feedback": "This asks for a top-level module named catalog. Being a sibling file does not put catalog on the import path, so you get ModuleNotFoundError. It is the most common packaging mistake there is."
    },
    {
      "label": "import store.catalog, then call store.catalog.price_of(name)",
      "bucket": "Resolves",
      "feedback": "The other import form. You get the module object bound under its full dotted path, so every call stays qualified. Wordier at the call site, but unambiguous."
    },
    {
      "label": "from ..store.catalog import price_of",
      "bucket": "Fails",
      "feedback": "Two dots means the parent of store, which is above the top-level package. Python stops you with 'attempted relative import beyond top-level package'."
    }
  ],
  "reveal": "One rule covers all five: an import is resolved against the import path and the current package, never against the folder your file happens to sit in. In the Practice workspace, cart.py reaches catalog with the absolute form."
}
\`\`\``,
    demoCode: `# one file now; a package next
PRICES = {"apple": 3, "bread": 2}


def price_of(name):
    return PRICES.get(name, 0)


print(price_of("apple"))   # 3
print(price_of("candy"))   # 0`,
  },
  apply: {
    id: "py-l3-packages-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`cart_total(prices, names)\`. Total the price of every name in
\`names\`, looking each one up in the \`prices\` dict (missing items cost 0).

For \`prices = {"apple": 3, "bread": 2}\` and \`names = ["apple", "bread"]\`, return \`5\`.`,
    starterCode: `def cart_total(prices, names):
    # Sum prices.get(name, 0) for each name.
    pass`,
    hints: [
      "`prices.get(name, 0)` is the price of one item (0 if missing).",
      "Add them across the cart with a generator expression in `sum(...)`.",
      "`return sum(prices.get(name, 0) for name in names)`.",
    ],
    referenceSolution: `def cart_total(prices, names):
    return sum(prices.get(name, 0) for name in names)`,
    testCases: [
      {
        input: { prices: { apple: 3, bread: 2, milk: 4 }, names: ["apple", "bread"] },
        expected: 5,
        description: "two known items",
      },
      {
        input: { prices: { apple: 3, bread: 2, milk: 4 }, names: [] },
        expected: 0,
        description: "empty cart",
      },
      {
        input: { prices: { apple: 3, bread: 2, milk: 4 }, names: ["milk", "milk"] },
        expected: 8,
        description: "repeated item",
      },
      {
        input: { prices: { apple: 3, bread: 2, milk: 4 }, names: ["apple", "x"] },
        expected: 3,
        description: "unknown item is free",
      },
    ],
  },
  practice: {
    id: "py-l3-packages-practice",
    executionMode: "workspace",
    prompt: `Now build it as a package. Implement \`cart_total(names)\` in \`store/cart.py\` using the
read-only \`price_of\` helper imported from \`store.catalog\`. Unknown items cost 0. Open the visible
test to see expected behaviour; some tests are hidden.`,
    starterCode: "",
    hints: [
      "`price_of` is already imported from `store.catalog`. Call it on each name.",
      "Sum across the cart: `sum(price_of(name) for name in names)`.",
      "The `store/__init__.py` is what makes `from store.catalog import ...` work.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "store/cart.py",
      editableFilePaths: ["store/cart.py"],
      visibleTestPaths: ["tests/test_cart.py"],
      hiddenTestPaths: ["tests/test_cart_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PKG_README },
        { path: "store/__init__.py", role: "readonly", language: "python", content: "" },
        {
          path: "store/catalog.py",
          role: "readonly",
          language: "python",
          content: PKG_CATALOG,
          description: "Item prices + price_of (read-only)",
        },
        {
          path: "store/cart.py",
          role: "editable",
          language: "python",
          content: PKG_CART_STARTER,
          description: "Implement cart_total here",
        },
        { path: "tests/__init__.py", role: "test", language: "python", content: "", hidden: true },
        {
          path: "tests/test_cart.py",
          role: "test",
          language: "python",
          content: PKG_TEST,
          description: "Visible cart tests",
        },
        {
          path: "tests/test_cart_hidden.py",
          role: "test",
          language: "python",
          content: PKG_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: PKG_RUNNER,
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "store/cart.py",
          role: "editable",
          language: "python",
          content: PKG_CART_REFERENCE,
        },
      ],
    },
  },
}

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

const typeHintsLesson: PythonLevel["modules"][number]["lessons"][number] = {
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
          content: buildRunner(
            "test_summary",
            "test_summary_hidden",
            "visible stats",
            "hidden stats"
          ),
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

const typingModuleLesson: PythonLevel["modules"][number]["lessons"][number] = {
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

A value that might be missing is \`Optional\`, written \`X | None\` (older code writes \`Optional[X]\`; they mean the same type). A value that can be one of several types is a \`Union\`: \`int | str\`.

Returning \`None\` from a function you annotated \`-> dict\` is a lie a checker will flag. Annotate the honest contract \`-> dict | None\`, and every caller is told to handle the missing case. Once a value is \`dict | None\`, a checker will not let you subscript it until you narrow it:

\`\`\`python
u = find_user(7)          # u: dict | None
if u is not None:
    print(u["name"])      # here u is dict, so u["name"] is allowed
\`\`\`

### Generics with TypeVar

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

A \`Protocol\` describes the shape an object must have. Any object with the right attributes or methods satisfies it, with no base class and no inheritance:

\`\`\`python
from typing import Protocol

class Named(Protocol):
    name: str

def greet(who: Named) -> str:
    return "Hi, " + who.name   # any object with a .name: str fits
\`\`\`

### Pitfall: Optional is not an optional argument

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
          content: buildRunner(
            "test_lookup",
            "test_lookup_hidden",
            "visible lookup",
            "hidden lookup"
          ),
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

// ───────────────────────────────────────────────────────────────────────────
// L3-M3: Testing with pytest
// ───────────────────────────────────────────────────────────────────────────

const PT_README = `# TDD a bank balance

The pytest tests already exist. Make them pass. Implement \`balance_after(start, transactions)\` in
\`bank/account.py\` so it applies a list of signed \`transactions\` (deposits are positive,
withdrawals negative) to a \`start\` balance and returns the new balance.

Example: \`balance_after(100, [10, -30, 5])\` is \`85\`. Some tests are hidden.
`

const PT_ACCOUNT_STARTER = String.raw`def balance_after(start, transactions):
    """Apply signed transactions to start and return the new balance (see README.md)."""
    # TODO: add every transaction to the starting balance.
    return start
`

const PT_ACCOUNT_REFERENCE = String.raw`def balance_after(start, transactions):
    return start + sum(transactions)
`

const PT_TEST = String.raw`from bank.account import balance_after


def test_applies_deposits():
    assert balance_after(0, [10, 20]) == 30


def test_applies_withdrawals():
    assert balance_after(100, [-30, -20]) == 50


def test_empty_transactions_unchanged():
    assert balance_after(50, []) == 50
`

const PT_TEST_HIDDEN = String.raw`from bank.account import balance_after


def test_mixed_transactions():
    assert balance_after(100, [10, -30, 5]) == 85


def test_overdraft_allowed():
    assert balance_after(0, [-5]) == -5
`

const pytestBasicsLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-pytest-basics",
  title: "pytest assertions & structure",
  summary: "Make a suite of pytest tests pass by implementing the module they cover.",
  estimatedMinutes: 16,
  difficulty: "medium",
  skills: ["pytest", "testing", "assertions", "tdd"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why tests are the code that guards your code

When you change \`balance_after\` six months from now, the only thing standing between a clean refactor and a corrupted account balance is a test that still remembers what "correct" meant. On a real team, a pull request without tests is a pull request nobody can safely merge, because reviewers cannot tell whether it works, only that it compiles. \`pytest\` is the tool most Python shops reach for because it turns "I think this works" into a repeatable, machine-checkable claim.

## The mental model: plain functions, plain asserts

\`pytest\` has almost no ceremony. You write a normal function whose name starts with \`test_\`, put a plain \`assert\` inside it, and run \`pytest\`. Discovery is convention-based: \`pytest\` walks the directory, imports files named \`test_*.py\` (or \`*_test.py\`), and runs every \`test_\`-prefixed function it finds. No base class, no registration, no \`main\`.

The magic is in the \`assert\`. \`pytest\` rewrites the \`assert\` statements in your test files as it imports them, so a failing \`assert\` reports the actual and expected values instead of a bare \`AssertionError\`. That is why \`assert balance_after(100, [10, -30, 5]) == 85\` is enough: on failure you see the number it actually got.

### Arrange, act, assert

A readable test has three beats: set up inputs, call the code, check the result.

\`\`\`python
# tests/test_account.py
from bank.account import balance_after

def test_mixed_transactions():
    start, txns = 100, [10, -30, 5]   # arrange
    result = balance_after(start, txns)  # act
    assert result == 85               # assert
\`\`\`

Test-driven development runs this loop backwards: write the failing test first (red), then write the smallest code that makes it pass (green). Here the tests already exist. Your job is to implement \`balance_after\` so \`start + sum(transactions)\` produces the expected total and the suite turns green. The Practice puts that same function in a \`bank/account.py\` package with a real test file, plus hidden cases you cannot peek at.

## Pitfall: a test that never runs still "passes"

If you misspell the prefix and name a function \`check_deposits\` instead of \`test_deposits\`, \`pytest\` silently skips it. The suite goes green while testing nothing, which is worse than a red suite because it hands you false confidence. The same trap hits a file named \`account_tests.py\` (wrong pattern) or a helper that raises but is never called. The fix: keep the \`test_\` prefix, name files \`test_*.py\`, and run \`pytest -v\` to read the count of collected tests. If the number looks low, something is not being discovered.

**Interview nuance:** never compare floats with \`==\` in a test. \`balance_after(0.0, [0.1, 0.2]) == 0.3\` is \`False\`, because IEEE 754 stores \`0.1 + 0.2\` as \`0.30000000000000004\`. An interviewer asking "how would you test a function that returns a float" wants to hear about tolerance, not exact equality. In \`pytest\` you write \`assert result == pytest.approx(0.3)\`, which passes if the values are within a small relative tolerance. Integer transactions dodge this, but the moment money becomes \`float\`, exact-equality tests get flaky and the real bug hides behind the noise.`,
    demoCode: `def balance_after(start, transactions):
    return start + sum(transactions)


# what a pytest test would assert:
assert balance_after(100, [10, -30, 5]) == 85
print("all good")`,
  },
  apply: {
    id: "py-l3-pytest-basics-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`balance_after(start, transactions)\`. Add every signed amount in
\`transactions\` to \`start\` and return the result.

\`balance_after(100, [10, -30, 5])\` is \`85\`.`,
    starterCode: `def balance_after(start, transactions):
    # Return start plus the sum of all transactions.
    pass`,
    hints: [
      "`sum(transactions)` adds the deposits and withdrawals (signs included).",
      "Add it to the starting balance: `start + sum(transactions)`.",
    ],
    referenceSolution: `def balance_after(start, transactions):
    return start + sum(transactions)`,
    testCases: [
      { input: { start: 100, transactions: [10, -30, 5] }, expected: 85, description: "mixed" },
      { input: { start: 0, transactions: [10, 20] }, expected: 30, description: "deposits" },
      { input: { start: 50, transactions: [] }, expected: 50, description: "no transactions" },
      { input: { start: 0, transactions: [-5] }, expected: -5, description: "overdraft" },
    ],
  },
  practice: {
    id: "py-l3-pytest-basics-practice",
    executionMode: "workspace",
    prompt: `Make the pytest suite pass: implement \`balance_after(start, transactions)\` in
\`bank/account.py\` so it applies the signed \`transactions\` to \`start\`. Open the visible test file
to read the cases; some tests are hidden.`,
    starterCode: "",
    hints: [
      "Read `tests/test_account.py` to see exactly what's expected.",
      "`sum(transactions)` handles deposits and withdrawals together.",
      "`return start + sum(transactions)`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "bank/account.py",
      editableFilePaths: ["bank/account.py"],
      visibleTestPaths: ["tests/test_account.py"],
      hiddenTestPaths: ["tests/test_account_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PT_README },
        { path: "bank/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "bank/account.py",
          role: "editable",
          language: "python",
          content: PT_ACCOUNT_STARTER,
          description: "Implement balance_after here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_account.py",
          role: "test",
          language: "python",
          content: PT_TEST,
          description: "Visible pytest suite",
        },
        {
          path: "tests/test_account_hidden.py",
          role: "test",
          language: "python",
          content: PT_TEST_HIDDEN,
          hidden: true,
          description: "Hidden pytest suite",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildPytestRunner(
            "test_account",
            "test_account_hidden",
            "visible account",
            "hidden account"
          ),
          hidden: true,
          description: "pytest-style test runner",
        },
      ],
      referenceFiles: [
        {
          path: "bank/account.py",
          role: "editable",
          language: "python",
          content: PT_ACCOUNT_REFERENCE,
        },
      ],
    },
  },
}

// ───────────────────────────────────────────────────────────────────────────
// py-l3-pytest-fixtures: fixtures & parametrize (TDD a module)
// ───────────────────────────────────────────────────────────────────────────

const FX_README = `# Restock with fixtures & parametrize

Make a fixture-backed, parametrized pytest suite pass. Implement \`restock(stock, additions)\` in
\`inventory/store.py\` so it returns a **new** dict that merges \`additions\` into \`stock\`, summing
quantities for items that appear in both.

Example: \`restock({"apple": 5}, {"apple": 5, "plum": 3})\` is \`{"apple": 10, "plum": 3}\`. Don't
mutate the input. Some tests are hidden.
`

const FX_STORE_STARTER = String.raw`def restock(stock, additions):
    """Merge additions into a NEW dict, summing shared quantities (see README.md)."""
    # TODO: copy stock, then add each item/qty from additions.
    return {}
`

const FX_STORE_REFERENCE = String.raw`def restock(stock, additions):
    result = dict(stock)
    for item, qty in additions.items():
        result[item] = result.get(item, 0) + qty
    return result
`

const FX_TEST = String.raw`from inventory.store import restock


def base_stock():
    # A shared starting point. With real pytest this would be a @pytest.fixture
    # injected into each test; here the tests call it directly.
    return {"apple": 5, "pear": 2}


def test_adds_a_new_item():
    assert restock(base_stock(), {"plum": 3}) == {"apple": 5, "pear": 2, "plum": 3}


def test_increments_existing_item():
    assert restock(base_stock(), {"apple": 5}) == {"apple": 10, "pear": 2}


def test_parametrized_cases():
    # Stand-in for @pytest.mark.parametrize: one test, a table of cases.
    cases = [
        ({"a": 1}, {"a": 1}, {"a": 2}),
        ({}, {"x": 4}, {"x": 4}),
        ({"n": 2}, {"m": 3}, {"n": 2, "m": 3}),
    ]
    for stock, additions, expected in cases:
        assert restock(stock, additions) == expected, f"failed for {stock}, {additions}"
`

const FX_TEST_HIDDEN = String.raw`from inventory.store import restock


def test_does_not_mutate_input():
    original = {"apple": 5}
    restock(original, {"apple": 1})
    assert original == {"apple": 5}, "restock must return a new dict, not mutate the input"


def test_empty_additions_unchanged():
    assert restock({"apple": 5}, {}) == {"apple": 5}
`

const pytestFixturesLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-pytest-fixtures",
  title: "Fixtures & parametrize",
  summary:
    "Share setup with fixtures and cover many cases with parametrize while you TDD a module.",
  estimatedMinutes: 17,
  difficulty: "medium",
  skills: ["pytest", "fixtures", "parametrize", "tdd"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Fixtures and parametrize

### Why this matters

Every test for an inventory module needs the same starting state: a stock dict, maybe a temp file or a DB connection. Copy that setup into each test and one change to the shape breaks twenty tests at once. \`pytest\` fixtures give you one named source for that setup, and \`parametrize\` lets a single test body cover a whole table of cases so a failure points at the exact row that broke. Interviewers watch for this. Writing five near-identical \`test_\` functions signals you do not know the tooling.

### Fixtures: named, injected setup

A fixture is a function decorated with \`@pytest.fixture\` that builds a value your tests need. Any test that names the fixture as a parameter receives the returned value. \`pytest\` matches by name and injects it.

\`\`\`python
import pytest

@pytest.fixture
def base_stock():
    return {"apple": 5, "pear": 2}

def test_restock_adds_item(base_stock):        # pytest passes base_stock in
    result = restock(base_stock, {"plum": 3})
    assert result["plum"] == 3
\`\`\`

By default a fixture has function scope: \`pytest\` calls it fresh for every test, so \`base_stock\` is a brand-new dict each time and tests cannot leak state into one another. A fixture that uses \`yield\` instead of \`return\` runs the code after \`yield\` as teardown once the test finishes.

\`\`\`csdiagram
{
  "type": "pipeline",
  "stages": [
    { "label": "Fixture setup", "note": "everything above the yield runs" },
    { "label": "yield", "note": "hands the value to the test as its argument" },
    { "label": "Test body", "note": "runs with that value" },
    { "label": "Teardown", "note": "everything below the yield, even if the test FAILED" }
  ],
  "highlight": ["Teardown"],
  "caption": "The highlighted stage is the reason to prefer yield over return: teardown runs whether the test passed, failed, or raised, so a fixture can safely own a temp file, a database transaction, or an open connection."
}
\`\`\`

Scope decides how often that whole cycle repeats:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["scope=", "Set up once per", "Reach for it when"],
  "rows": [
    ["function (default)", "every test", "the value is mutable and tests must not leak into each other"],
    ["class", "test class", "a group of tests shares expensive but read-only setup"],
    ["module", "test file", "one connection or server serves every test in the file"],
    ["session", "whole test run", "the setup is very expensive and genuinely immutable"]
  ],
  "highlightCols": ["scope="],
  "caption": "Widening the scope trades isolation for speed, and the trade goes wrong in one specific way: a mutable value at session scope lets one test's mutation reach every later test, producing failures that depend on test ORDER."
}
\`\`\`

### Parametrize: one body, many cases

\`@pytest.mark.parametrize\` takes a string of parameter names and a list of value rows. \`pytest\` runs the test once per row and reports each as its own case.

\`\`\`python
@pytest.mark.parametrize("stock, additions, expected", [
    ({"a": 1}, {"a": 1}, {"a": 2}),        # shared key sums
    ({}, {"x": 4}, {"x": 4}),              # new key added
])
def test_restock(stock, additions, expected):
    assert restock(stock, additions) == expected
\`\`\`

Two rows means two independent results, so a failure names the row instead of just "\`test_restock\` failed".

The demo below shows the \`restock\` you will build. It copies \`stock\` with \`dict(stock)\`, then adds each quantity onto \`result.get(item, 0)\`, returning a new dict. This sandbox has no \`pytest\` installed, so the practice tests express the same ideas directly: a helper builds the base stock and a list of case tuples is looped over. The concepts (shared setup, a table of cases) are identical; only the injection machinery differs.

### Pitfall: shared mutable fixtures

A fixture that returns a mutable object at function scope is safe, but widen the scope and that object is shared:

\`\`\`python
@pytest.fixture(scope="module")
def base_stock():
    return {"apple": 5}
\`\`\`

Now every test in the module gets the same dict. If \`restock\` mutates its input (for example \`result = stock\` instead of \`result = dict(stock)\`, which makes \`result\` and \`stock\` the same object), one test's change bleeds into the next, and tests pass or fail depending on order. The Practice suite checks exactly this: return a new dict and never touch \`stock\`.

**Interview nuance:** \`parametrize\` is not a loop inside one test. A \`for\` loop stops at the first failing \`assert\` and hides every case after it. \`parametrize\` generates N separate tests, so all N run, each gets its own id in the report, and you can \`xfail\` or \`skip\` a single case with \`pytest.param\`. That independence, together with function-scope fixture isolation, is what makes a suite deterministic no matter what order it runs in.`,
    demoCode: `def restock(stock, additions):
    result = dict(stock)
    for item, qty in additions.items():
        result[item] = result.get(item, 0) + qty
    return result


print(restock({"apple": 5}, {"apple": 5, "plum": 3}))  # {'apple': 10, 'plum': 3}`,
  },
  apply: {
    id: "py-l3-pytest-fixtures-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`restock(stock, additions)\`. Return a **new** dict merging
\`additions\` into \`stock\`, summing quantities for shared items.

\`restock({"apple": 5}, {"apple": 5, "plum": 3})\` is \`{"apple": 10, "plum": 3}\`.`,
    starterCode: `def restock(stock, additions):
    # Copy stock into a new dict, then add each item/qty from additions.
    pass`,
    hints: [
      "Start from a copy so you don't mutate the input: `result = dict(stock)`.",
      "For each item, add to what's already there: `result.get(item, 0) + qty`.",
      "Loop `for item, qty in additions.items():`, then return `result`.",
    ],
    referenceSolution: `def restock(stock, additions):
    result = dict(stock)
    for item, qty in additions.items():
        result[item] = result.get(item, 0) + qty
    return result`,
    testCases: [
      {
        input: { stock: { apple: 5 }, additions: { apple: 5, plum: 3 } },
        expected: { apple: 10, plum: 3 },
        description: "sum shared, add new",
      },
      {
        input: { stock: {}, additions: { x: 4 } },
        expected: { x: 4 },
        description: "into empty stock",
      },
      {
        input: { stock: { n: 2 }, additions: { m: 3 } },
        expected: { n: 2, m: 3 },
        description: "no overlap",
      },
    ],
  },
  practice: {
    id: "py-l3-pytest-fixtures-practice",
    executionMode: "workspace",
    prompt: `Make the fixture-backed, parametrized suite pass: implement \`restock(stock, additions)\` in
\`inventory/store.py\` to merge \`additions\` into a **new** copy of \`stock\` (summing shared
quantities, never mutating the input). Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Copy first: `result = dict(stock)` keeps the original untouched.",
      "Sum shared items with `result.get(item, 0) + qty`.",
      "The hidden suite checks you did NOT mutate the input dict.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "inventory/store.py",
      editableFilePaths: ["inventory/store.py"],
      visibleTestPaths: ["tests/test_store.py"],
      hiddenTestPaths: ["tests/test_store_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: FX_README },
        {
          path: "inventory/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "inventory/store.py",
          role: "editable",
          language: "python",
          content: FX_STORE_STARTER,
          description: "Implement restock here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_store.py",
          role: "test",
          language: "python",
          content: FX_TEST,
          description: "Visible fixture/parametrize suite",
        },
        {
          path: "tests/test_store_hidden.py",
          role: "test",
          language: "python",
          content: FX_TEST_HIDDEN,
          hidden: true,
          description: "Hidden no-mutation tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildPytestRunner(
            "test_store",
            "test_store_hidden",
            "visible store",
            "hidden store"
          ),
          hidden: true,
          description: "pytest-style test runner",
        },
      ],
      referenceFiles: [
        {
          path: "inventory/store.py",
          role: "editable",
          language: "python",
          content: FX_STORE_REFERENCE,
        },
      ],
    },
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L3-M4: Files, Data & Robustness
// ───────────────────────────────────────────────────────────────────────────

const PL_README = `# Total a scores file with pathlib

Read real files with \`pathlib\`. Implement \`total_score(path)\` in \`reports/scores.py\` so it reads
the file at \`path\` and returns the **sum of the integer on each non-blank line**.

The \`data/\` folder holds the score files. Blank lines are skipped. Some tests are hidden.
`

const PL_SCORES = "10\n20\n30\n"
const PL_SCORES2 = "5\n5\n5\n5\n"
const PL_SCORES_BLANKS = "3\n\n4\n"
const PL_SCORES_EMPTY = ""

const PL_SCORES_STARTER = String.raw`from pathlib import Path


def total_score(path):
    """Sum the integer on each non-blank line of the file at path (see README.md)."""
    # TODO: read the file with pathlib, then sum its integer lines.
    return 0
`

const PL_SCORES_REFERENCE = String.raw`from pathlib import Path


def total_score(path):
    text = Path(path).read_text()
    return sum(int(line) for line in text.splitlines() if line.strip())
`

const PL_TEST = String.raw`from reports.scores import total_score


def run_tests(record):
    def sums_the_scores_file():
        result = total_score("data/scores.txt")
        assert result == 60, f"expected 60, got {result!r}"

    def sums_another_file():
        result = total_score("data/scores2.txt")
        assert result == 20, f"expected 20, got {result!r}"

    record("sums the scores file", sums_the_scores_file)
    record("sums another file", sums_another_file)
`

const PL_TEST_HIDDEN = String.raw`from reports.scores import total_score


def run_tests(record):
    def ignores_blank_lines():
        result = total_score("data/with_blanks.txt")
        assert result == 7, f"expected 7, got {result!r}"

    def empty_file_is_zero():
        result = total_score("data/empty.txt")
        assert result == 0, f"expected 0, got {result!r}"

    record("ignores blank lines", ignores_blank_lines)
    record("empty file totals 0", empty_file_is_zero)
`

const pathlibLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-pathlib",
  title: "pathlib & file processing",
  summary: "Read and transform real files in a project with pathlib.",
  estimatedMinutes: 17,
  difficulty: "medium",
  skills: ["pathlib", "files", "text-processing", "io"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why file paths break in production

The bug that ruins a data pipeline at 2am is rarely the algorithm. It is a path. A script that reads \`data/scores.txt\` works on your laptop and fails on the server because the two machines were launched from different directories. Hardcoded string paths are also fragile across operating systems, where the path separator differs. \`pathlib.Path\` exists to make paths a real object with methods instead of fragile strings you glue together by hand. As a data engineer you touch files constantly (CSVs, logs, exports), so getting this layer right is table stakes.

## The mental model

A \`Path\` is an object that represents a location, not the file's contents. Building one does no I/O and does not require the file to exist. You only touch disk when you call a method like \`read_text()\` or \`exists()\`.

\`\`\`python
from pathlib import Path

p = Path("data") / "scores.txt"   # "/" joins path parts, OS-correct
p.exists()                        # True / False, cheap check
p.suffix                          # ".txt"
text = p.read_text(encoding="utf-8")   # whole file -> one str
\`\`\`

The \`/\` operator is real: \`Path\` overloads it so \`Path("data") / "scores.txt"\` builds the joined path with the correct separator on any OS. Prefer it over \`"data/" + name\`.

Once you have a \`Path\`, its parts are attributes rather than string surgery:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Attribute", "Value for Path('data/reports/scores.csv')", "What you reach for it for"],
  "rows": [
    [".name", "scores.csv", "the filename, extension included"],
    [".stem", "scores", "the filename without the extension"],
    [".suffix", ".csv", "the extension, INCLUDING the leading dot"],
    [".parent", "data/reports", "the containing directory, itself a Path"],
    [".parts", "('data', 'reports', 'scores.csv')", "every segment as a tuple"]
  ],
  "highlightCols": ["Value for Path('data/reports/scores.csv')"],
  "caption": "Two of these bite. .suffix keeps the dot, so comparing it to 'csv' always fails and you want '.csv'. And on a double extension like archive.tar.gz, .suffix is only '.gz' while .stem is still 'archive.tar', because both look at the LAST dot only."
}
\`\`\`

## Turning text into data

\`read_text()\` hands you the entire file as one string. Split it into lines, then convert:

\`\`\`python
text = "10\\n20\\n30"
numbers = [int(line) for line in text.splitlines() if line.strip()]
print(sum(numbers))   # 60
\`\`\`

\`splitlines()\` breaks on line boundaries and drops the \`\\n\` characters. The \`if line.strip()\` guard skips blank or whitespace-only lines so \`int()\` never receives an empty string. \`int()\` itself strips surrounding whitespace, so \`int(" 10 ")\` returns \`10\` without extra work. This is exactly the shape both exercises want: first sum the numbers in a string, then read a real file with \`Path(path).read_text()\` and run the same pipeline.

## Pitfalls

Real files almost always end with a trailing newline, and that is where interns get burned. Compare:

\`\`\`python
"10\\n20\\n30\\n".split("\\n")     # ['10', '20', '30', '']  <- trailing ''
"10\\n20\\n30\\n".splitlines()    # ['10', '20', '30']       <- clean
\`\`\`

If you use \`split("\\n")\` you get a phantom empty string at the end, and \`int("")\` raises \`ValueError\`. Use \`splitlines()\`, or keep the \`if line.strip()\` guard, or both. That guard is your safety net for blank lines anywhere in the file, not just the last one.

The second trap: a relative path like \`Path("data/scores.txt")\` resolves against the current working directory, which is wherever the process was launched, not where your script file lives. Run the same code from a different folder and it fails. When it matters, anchor to the file with \`Path(__file__).parent / "data" / "scores.txt"\`.

**Interview nuance:** \`read_text()\` loads the whole file into memory at once, so its memory cost is O(n) in file size. That is fine for a scores file, but if an interviewer swaps in a multi-gigabyte log, stream it instead and keep memory O(1):

\`\`\`python
with Path(path).open(encoding="utf-8") as f:
    total = sum(int(line) for line in f if line.strip())
\`\`\`

Iterating a file object yields one line at a time without holding the whole file in memory. Knowing when to read all versus stream is exactly the tradeoff data-engineering interviewers probe.`,
    demoCode: `text = "10\\n20\\n30"
numbers = [int(line) for line in text.splitlines() if line.strip()]
print(sum(numbers))   # 60`,
  },
  apply: {
    id: "py-l3-pathlib-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`total_score(text)\`. Sum the integer on each non-blank line of
the string \`text\`.

For \`"10\\n20\\n30"\` return \`60\`. Skip blank lines.`,
    starterCode: `def total_score(text):
    # Sum the integer on each non-blank line.
    pass`,
    hints: [
      "`text.splitlines()` gives the lines without newline characters.",
      "Skip blanks with `if line.strip()` so `int()` never sees an empty line.",
      "`return sum(int(line) for line in text.splitlines() if line.strip())`.",
    ],
    referenceSolution: `def total_score(text):
    return sum(int(line) for line in text.splitlines() if line.strip())`,
    testCases: [
      { input: { text: "10\n20\n30" }, expected: 60, description: "three numbers" },
      { input: { text: "5\n5" }, expected: 10, description: "two numbers" },
      { input: { text: "3\n\n4" }, expected: 7, description: "blank line skipped" },
      { input: { text: "" }, expected: 0, description: "empty text" },
    ],
  },
  practice: {
    id: "py-l3-pathlib-practice",
    executionMode: "workspace",
    prompt: `Implement \`total_score(path)\` in \`reports/scores.py\`: read the file at \`path\` with \`pathlib\`
and return the sum of the integer on each non-blank line. The score files live in \`data/\`. Some
tests are hidden.`,
    starterCode: "",
    hints: [
      "Read the file: `Path(path).read_text()`.",
      "Split and guard: `for line in text.splitlines() if line.strip()`.",
      "Sum the parsed ints with a generator expression.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "reports/scores.py",
      editableFilePaths: ["reports/scores.py"],
      visibleTestPaths: ["tests/test_scores.py"],
      hiddenTestPaths: ["tests/test_scores_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PL_README },
        { path: "data/scores.txt", role: "readonly", language: "text", content: PL_SCORES },
        { path: "data/scores2.txt", role: "readonly", language: "text", content: PL_SCORES2 },
        {
          path: "data/with_blanks.txt",
          role: "readonly",
          language: "text",
          content: PL_SCORES_BLANKS,
          hidden: true,
        },
        {
          path: "data/empty.txt",
          role: "readonly",
          language: "text",
          content: PL_SCORES_EMPTY,
          hidden: true,
        },
        { path: "reports/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "reports/scores.py",
          role: "editable",
          language: "python",
          content: PL_SCORES_STARTER,
          description: "Implement total_score here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_scores.py",
          role: "test",
          language: "python",
          content: PL_TEST,
          description: "Visible file-reading tests",
        },
        {
          path: "tests/test_scores_hidden.py",
          role: "test",
          language: "python",
          content: PL_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_scores",
            "test_scores_hidden",
            "visible scores",
            "hidden scores"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "reports/scores.py",
          role: "editable",
          language: "python",
          content: PL_SCORES_REFERENCE,
        },
      ],
    },
  },
}

const LG_README = `# Robust totals with an error boundary

\`processing/parsing.py\` (read-only) has \`to_amount(raw)\`, which converts text to an int and
**raises** \`ValueError\` on bad input. Implement \`safe_total(raws)\` in \`processing/totals.py\` so
it totals every value that parses and **skips** the ones that don't (a clean error boundary).

Example: \`safe_total(["1", "x", "3"])\` is \`4\`. Some tests are hidden.
`

const LG_PARSING = String.raw`def to_amount(raw):
    """Convert raw text to an int amount. Raises ValueError on bad input."""
    return int(raw)
`

const LG_TOTALS_STARTER = String.raw`from processing.parsing import to_amount


def safe_total(raws):
    """Total the values that parse, skipping any that raise ValueError (see README.md)."""
    # TODO: try to_amount(raw) for each; skip the ones that raise.
    return 0
`

const LG_TOTALS_REFERENCE = String.raw`from processing.parsing import to_amount


def safe_total(raws):
    total = 0
    for raw in raws:
        try:
            total += to_amount(raw)
        except ValueError:
            continue
    return total
`

const LG_TEST = String.raw`from processing.totals import safe_total


def run_tests(record):
    def sums_valid_amounts():
        assert safe_total(["1", "2", "3"]) == 6, f"got {safe_total(['1','2','3'])!r}"

    def skips_invalid_amounts():
        assert safe_total(["1", "x", "3"]) == 4, f"got {safe_total(['1','x','3'])!r}"

    def empty_list_is_zero():
        assert safe_total([]) == 0

    record("sums valid amounts", sums_valid_amounts)
    record("skips invalid amounts", skips_invalid_amounts)
    record("empty list totals 0", empty_list_is_zero)
`

const LG_TEST_HIDDEN = String.raw`from processing.totals import safe_total


def run_tests(record):
    def skips_blank_strings():
        assert safe_total(["10", " ", "5"]) == 15, f"got {safe_total(['10',' ','5'])!r}"

    def all_invalid_is_zero():
        assert safe_total(["a", "b"]) == 0, f"got {safe_total(['a','b'])!r}"

    record("skips blank strings", skips_blank_strings)
    record("all invalid totals 0", all_invalid_is_zero)
`

const loggingErrorsLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-logging-errors",
  title: "Error boundaries & logging habits",
  summary: "Use logging instead of print and design where errors get caught.",
  estimatedMinutes: 17,
  difficulty: "medium",
  skills: ["logging", "exceptions", "error-boundaries", "robustness"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Logging and where to handle errors

### Why this matters

\`print\` is fine for a script you run once and watch. It falls apart in anything that runs unattended: a batch job, a web handler, a scheduled ETL. You cannot filter \`print\` by severity, cannot silence it in production without deleting lines, and cannot tell an error apart from a debug trace in a log file. \`logging\` fixes all three. The other half of robustness is deciding *where* a failure is handled. Get that wrong and one malformed row aborts a job that should have processed the other 99,999.

### The logging model

A logger is a named channel. You grab one per module with \`logging.getLogger(__name__)\` and emit at a level: \`debug\`, \`info\`, \`warning\`, \`error\`, \`critical\`. Where those messages go (console, file, or both) and how verbose they are is configured once, at program start, not at each call site:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Level", "Use it for", "Visible by default?", "Who reads it"],
  "rows": [
    ["debug", "values while tracing a problem", "no", "you, while debugging"],
    ["info", "normal milestones: job started, 500 rows written", "no", "you, reading yesterday's run"],
    ["warning", "something odd but survivable: a retry, a fallback", "yes", "whoever is on call"],
    ["error", "this operation failed", "yes", "whoever is on call"],
    ["critical", "the process cannot continue", "yes", "whoever gets paged"]
  ],
  "highlightCols": ["Visible by default?"],
  "caption": "The highlighted column is the whole of the vanishing-logs mystery: a fresh logger's effective level is WARNING, so debug and info are discarded silently until basicConfig(level=logging.INFO) lowers the bar. Nothing errors, the lines simply never appear."
}
\`\`\`

\`\`\`python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("processing %d records", len(records))
logger.warning("skipping bad record: %r", raw)
\`\`\`

Note the \`%d\` and \`%r\` with trailing args instead of an f-string. \`logging\` interpolates the message only if the record is actually emitted (more on that below).

### Error boundaries: raise low, catch high

Do not wrap every line in \`try\`/\`except\`. Decide the *boundary* that can actually recover. The common shape: a low-level helper raises on bad input, and the loop that owns the batch catches and skips, so one bad record does not sink the rest.

\`\`\`python
def safe_total(raws):
    total = 0
    for raw in raws:
        try:
            total += int(raw)     # raises ValueError on "x"
        except ValueError:
            continue              # skip; real code would logger.warning(...)
    return total

print(safe_total(["1", "x", "3"]))   # 4
\`\`\`

\`int("x")\` raises \`ValueError\`, the loop swallows just that one, and \`1 + 3\` gives \`4\`.

### Pitfalls

- **Catching too broadly.** \`except Exception:\` hides a typo'd name (\`NameError\`) alongside the errors you meant to skip; a bare \`except:\` is worse, also catching \`KeyboardInterrupt\` so you cannot even Ctrl-C out. Catch the specific type you expect (\`ValueError\`) and real bugs still surface.
- **\`int\` is pickier than you think.** \`int("3.5")\` raises \`ValueError\` (it is not an integer literal), so \`safe_total(["3.5"])\` returns \`0\`, not \`3\`. And \`int(None)\` raises \`TypeError\`, which \`except ValueError\` will not catch at all.
- **Silent logs.** A fresh logger's effective level defaults to \`WARNING\`, so \`logger.info(...)\` prints nothing until you call \`basicConfig(level=logging.INFO)\`. "My logs vanished" is almost always this.

**Interview nuance:** prefer \`logger.info("n=%d", n)\` over \`logger.info(f"n={n}")\`. \`logging\` checks \`isEnabledFor(level)\` first and only formats the message if the record will actually be emitted, so the \`%\`-style call skips string building when that level is off. The f-string builds the string eagerly on every call, including calls that log nothing. On a hot path with expensive \`%r\` values, that difference is measurable.`,
    demoCode: `def safe_total(raws):
    total = 0
    for raw in raws:
        try:
            total += int(raw)
        except ValueError:
            continue
    return total


print(safe_total(["1", "x", "3"]))   # 4`,
  },
  apply: {
    id: "py-l3-logging-errors-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`safe_total(raws)\`. Total the strings in \`raws\` that parse as
integers, **skipping** any that don't.

\`safe_total(["1", "x", "3"])\` is \`4\`.`,
    starterCode: `def safe_total(raws):
    # Sum the values that int() accepts; skip the ones that raise ValueError.
    pass`,
    hints: [
      "Loop the raws and `try: total += int(raw)`.",
      "On `except ValueError:` use `continue` to skip that one.",
      "Return the running total after the loop.",
    ],
    referenceSolution: `def safe_total(raws):
    total = 0
    for raw in raws:
        try:
            total += int(raw)
        except ValueError:
            continue
    return total`,
    testCases: [
      { input: { raws: ["1", "2", "3"] }, expected: 6, description: "all valid" },
      { input: { raws: ["1", "x", "3"] }, expected: 4, description: "one invalid skipped" },
      { input: { raws: [] }, expected: 0, description: "empty list" },
      { input: { raws: ["10", " ", "5"] }, expected: 15, description: "blank skipped" },
    ],
  },
  practice: {
    id: "py-l3-logging-errors-practice",
    executionMode: "workspace",
    prompt: `Implement \`safe_total(raws)\` in \`processing/totals.py\`: use the read-only \`to_amount\` helper
(which raises \`ValueError\` on bad input) to total the valid values, skipping the rest. Some tests
are hidden.`,
    starterCode: "",
    hints: [
      "`to_amount` is imported for you. Call it inside a `try`.",
      "Catch `ValueError` and `continue` to skip bad records.",
      "Return the accumulated total.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "processing/totals.py",
      editableFilePaths: ["processing/totals.py"],
      visibleTestPaths: ["tests/test_totals.py"],
      hiddenTestPaths: ["tests/test_totals_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: LG_README },
        {
          path: "processing/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "processing/parsing.py",
          role: "readonly",
          language: "python",
          content: LG_PARSING,
          description: "to_amount helper (read-only, raises on bad input)",
        },
        {
          path: "processing/totals.py",
          role: "editable",
          language: "python",
          content: LG_TOTALS_STARTER,
          description: "Implement safe_total here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_totals.py",
          role: "test",
          language: "python",
          content: LG_TEST,
          description: "Visible error-boundary tests",
        },
        {
          path: "tests/test_totals_hidden.py",
          role: "test",
          language: "python",
          content: LG_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_totals",
            "test_totals_hidden",
            "visible totals",
            "hidden totals"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "processing/totals.py",
          role: "editable",
          language: "python",
          content: LG_TOTALS_REFERENCE,
        },
      ],
    },
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L3-M5: Real Programs & Tooling
// ───────────────────────────────────────────────────────────────────────────

const CLI_README = `# A tiny command dispatcher

A CLI maps a command name to a function. \`cli/commands.py\` (read-only) has \`add\` and \`mul\`;
implement \`run(argv)\` in \`cli/app.py\` so it reads a command and two integer arguments from the
\`argv\` list and returns the result.

Example: \`run(["add", "2", "3"])\` is \`5\`; \`run(["mul", "4", "5"])\` is \`20\`. Some tests are
hidden.
`

const CLI_COMMANDS = String.raw`def add(a, b):
    return a + b


def mul(a, b):
    return a * b
`

const CLI_APP_STARTER = String.raw`from cli.commands import add, mul


def run(argv):
    """Dispatch ["add", "2", "3"] -> 5 using add/mul (see README.md)."""
    # TODO: read argv[0] as the command and argv[1], argv[2] as int args.
    return 0
`

const CLI_APP_REFERENCE = String.raw`from cli.commands import add, mul


def run(argv):
    command = argv[0]
    a, b = int(argv[1]), int(argv[2])
    if command == "add":
        return add(a, b)
    if command == "mul":
        return mul(a, b)
    raise ValueError(f"unknown command: {command}")
`

const CLI_TEST = String.raw`from cli.app import run


def run_tests(record):
    def add_command():
        assert run(["add", "2", "3"]) == 5, f"got {run(['add', '2', '3'])!r}"

    def mul_command():
        assert run(["mul", "4", "5"]) == 20, f"got {run(['mul', '4', '5'])!r}"

    record("add command", add_command)
    record("mul command", mul_command)
`

const CLI_TEST_HIDDEN = String.raw`from cli.app import run


def run_tests(record):
    def negative_args():
        assert run(["add", "10", "-3"]) == 7

    def multiply_by_zero():
        assert run(["mul", "0", "9"]) == 0

    record("negative args", negative_args)
    record("multiply by zero", multiply_by_zero)
`

const cliLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-cli",
  title: "Building a CLI: parse and dispatch argv (argparse/typer preview)",
  summary: "Turn argument lists into commands with a testable dispatcher.",
  estimatedMinutes: 18,
  difficulty: "medium",
  skills: ["cli", "dispatch", "arguments", "commands"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## From arguments to commands

Every real tool you use, \`git\`, \`pytest\`, \`pip\`, \`uv\`, is a CLI: it reads a list of strings the shell hands it and runs the matching command. When you write one, the valuable skill is not memorizing a library. It is keeping the parsing separate from the logic so you can test the logic without launching a whole process. That separation is exactly what this lesson drills.

### A CLI is a function from strings to a result

When you type \`mytool add 2 3\`, Python receives \`sys.argv\`, a list of strings: \`["mytool", "add", "2", "3"]\`. \`sys.argv[0]\` is the program name; the real arguments start at index \`1\`. Everything arrives as text, even \`"2"\`. A CLI does three things with that list:

1. Collect the raw string arguments.
2. Parse them into typed values (\`"2"\` to \`2\`).
3. Dispatch the command name to the function that handles it.

### Two ways to parse

The stdlib \`argparse\` builds the parser declaratively. \`parser.parse_args()\` reads \`sys.argv[1:]\` for you and applies each \`type=\` converter:

\`\`\`python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("command")
parser.add_argument("a", type=int)
parser.add_argument("b", type=int)
args = parser.parse_args()   # args.a is an int
\`\`\`

\`typer\` (built on \`click\`) turns a function's type hints into the CLI, so \`a: int\` becomes a required, int-converted argument:

\`\`\`python
import typer
app = typer.Typer()

@app.command()
def add(a: int, b: int):
    print(a + b)
\`\`\`

### The part worth isolating: dispatch

Underneath any parser, a CLI maps a command name to a function. Write that core as a plain function that takes \`argv\` as a parameter instead of reaching for \`sys.argv\` itself:

\`\`\`python
def run(argv):
    command, a, b = argv[0], int(argv[1]), int(argv[2])
    if command == "add":
        return a + b
    if command == "mul":
        return a * b
    return 0

print(run(["add", "2", "3"]))   # 5
\`\`\`

Because \`run\` receives its input, a test can call \`run(["mul", "4", "5"])\` and assert it returns \`20\`, with no subprocess and no shell.

### Pitfalls

- Arguments are strings. Skip \`int()\` and \`argv[1]\` is \`"2"\`, not \`2\`. Then \`"2" + "3"\` is \`"23"\` and \`"2" * "3"\` raises \`TypeError\`. Convert at the boundary.
- Off-by-one on \`argv\`. In a real \`main\`, the command is \`sys.argv[1]\`, not \`sys.argv[0]\` (that is the program name). Slicing \`sys.argv[1:]\` avoids the mistake.
- An unknown command should do something defined (here, return \`0\`), not fall through and crash.

**Interview nuance:** this is the "thin shell, pure core" pattern interviewers look for. Keep argument reading and I/O at the edge (\`sys.argv\`, \`print\`) and put the decision logic in a pure function that takes \`argv\` and returns a value. A pure function is deterministic and trivial to unit-test: you assert on its return value. Once the logic reads global state or prints instead of returning, testing it means patching \`sys.argv\` and capturing stdout, which is slower and more brittle than checking a returned value.`,
    demoCode: `def run(argv):
    command, a, b = argv[0], int(argv[1]), int(argv[2])
    if command == "add":
        return a + b
    if command == "mul":
        return a * b
    return 0


print(run(["add", "2", "3"]))   # 5`,
  },
  apply: {
    id: "py-l3-cli-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`run(argv)\`: \`argv\` is a list like \`["add", "2", "3"]\`. Read the
command and two integer arguments and return \`add\` or \`mul\` of them.

\`run(["add", "2", "3"])\` is \`5\`; \`run(["mul", "4", "5"])\` is \`20\`.`,
    starterCode: `def run(argv):
    # argv looks like ["add", "2", "3"]. Dispatch to add or mul.
    pass`,
    hints: [
      "The command is `argv[0]`; the numbers are `int(argv[1])` and `int(argv[2])`.",
      'Branch: `if command == "add": return a + b`.',
      "Add a `mul` branch returning `a * b`.",
    ],
    referenceSolution: `def run(argv):
    command = argv[0]
    a, b = int(argv[1]), int(argv[2])
    if command == "add":
        return a + b
    if command == "mul":
        return a * b
    return 0`,
    testCases: [
      { input: { argv: ["add", "2", "3"] }, expected: 5, description: "add" },
      { input: { argv: ["mul", "4", "5"] }, expected: 20, description: "mul" },
      { input: { argv: ["add", "10", "-3"] }, expected: 7, description: "add with a negative" },
      { input: { argv: ["mul", "0", "9"] }, expected: 0, description: "mul by zero" },
    ],
  },
  practice: {
    id: "py-l3-cli-practice",
    executionMode: "workspace",
    prompt: `Implement \`run(argv)\` in \`cli/app.py\`: read the command name and two integer arguments from
\`argv\`, dispatch to the read-only \`add\`/\`mul\` commands, and return the result. Some tests are
hidden.`,
    starterCode: "",
    hints: [
      "`add` and `mul` are imported for you from `cli.commands`.",
      "`argv[0]` is the command; `int(argv[1])` and `int(argv[2])` are the operands.",
      "Dispatch with `if`/`if` and return the call's result.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "cli/app.py",
      editableFilePaths: ["cli/app.py"],
      visibleTestPaths: ["tests/test_app.py"],
      hiddenTestPaths: ["tests/test_app_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CLI_README },
        { path: "cli/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "cli/commands.py",
          role: "readonly",
          language: "python",
          content: CLI_COMMANDS,
          description: "Command functions (read-only)",
        },
        {
          path: "cli/app.py",
          role: "editable",
          language: "python",
          content: CLI_APP_STARTER,
          description: "Implement run(argv) here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_app.py",
          role: "test",
          language: "python",
          content: CLI_TEST,
          description: "Visible dispatcher tests",
        },
        {
          path: "tests/test_app_hidden.py",
          role: "test",
          language: "python",
          content: CLI_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner("test_app", "test_app_hidden", "visible app", "hidden app"),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        { path: "cli/app.py", role: "editable", language: "python", content: CLI_APP_REFERENCE },
      ],
    },
  },
}

const API_README = `# Fetch then validate

Never trust raw external data. Validate it at the boundary. \`api/client.py\` (read-only) simulates
an HTTP fetch returning a raw dict. Implement \`parse_user(raw)\` in \`api/models.py\` so it coerces
the fields into a typed \`User\` dataclass:

- \`id\` -> \`int\`
- \`name\` -> \`str\`
- \`active\` -> \`bool\`

A missing field should raise (a \`KeyError\` is fine). Some tests are hidden.
`

const API_CLIENT = String.raw`def fetch_user(user_id):
    """Pretend to GET /users/{id} and return the raw JSON body (httpx would do this for real)."""
    data = {
        "1": {"id": "1", "name": "Ada", "active": 1},
        "2": {"id": "2", "name": "Sam", "active": 0},
    }
    return data[str(user_id)]
`

const API_MODELS_STARTER = String.raw`from dataclasses import dataclass


@dataclass
class User:
    id: int
    name: str
    active: bool


def parse_user(raw):
    """Validate a raw user dict into a typed User (see README.md)."""
    # TODO: coerce raw["id"], raw["name"], raw["active"] and build a User.
    return None
`

const API_MODELS_REFERENCE = String.raw`from dataclasses import dataclass


@dataclass
class User:
    id: int
    name: str
    active: bool


def parse_user(raw):
    return User(id=int(raw["id"]), name=str(raw["name"]), active=bool(raw["active"]))
`

const API_TEST = String.raw`from api.client import fetch_user
from api.models import User, parse_user


def run_tests(record):
    def coerces_field_types():
        result = parse_user({"id": "1", "name": "Ada", "active": 1})
        assert result == User(1, "Ada", True), f"got {result!r}"

    def parses_inactive_user():
        result = parse_user({"id": 2, "name": "Sam", "active": 0})
        assert result == User(2, "Sam", False), f"got {result!r}"

    def validates_fetched_data():
        assert parse_user(fetch_user(1)) == User(1, "Ada", True)

    record("coerces field types", coerces_field_types)
    record("parses an inactive user", parses_inactive_user)
    record("validates fetched data", validates_fetched_data)
`

const API_TEST_HIDDEN = String.raw`from api.models import User, parse_user


def run_tests(record):
    def coerces_a_string_id():
        assert parse_user({"id": "99", "name": "Mo", "active": True}) == User(99, "Mo", True)

    def missing_field_raises():
        try:
            parse_user({"id": 1, "name": "X"})  # no "active"
            raised = False
        except KeyError:
            raised = True
        assert raised, "a missing field should raise"

    record("coerces a string id", coerces_a_string_id)
    record("missing field raises", missing_field_raises)
`

const restPydanticLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-rest-pydantic",
  title: "Validating API data at the boundary (httpx/pydantic preview)",
  summary: "Fetch external JSON and validate it into a typed model at the boundary.",
  estimatedMinutes: 20,
  difficulty: "hard",
  skills: ["validation", "dataclasses", "data-boundary", "type-coercion"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Fetching and validating external data

### Why the boundary is where bugs get caught

An external API is code you do not control. It can rename a field, send \`"1"\` where you expected \`1\`, drop \`active\` entirely, or add junk you never asked for. If that raw JSON flows deep into your program, a wrong type surfaces as a crash three functions away from the real cause. The discipline that prevents this: fetch, then immediately turn the untrusted \`dict\` into a typed object you can trust. Everything downstream then works with clean, known values.

### httpx: fetch the raw JSON

\`httpx\` is the modern HTTP client (sync or async, same API):

\`\`\`python
import httpx

response = httpx.get("https://api.example.com/users/1")
response.raise_for_status()   # raise on 4xx/5xx instead of parsing an error page
raw = response.json()         # a plain dict, still untrusted
\`\`\`

\`response.json()\` gives you a \`dict\`. Nothing about it is validated yet. The types are whatever the server chose to send.

### pydantic validates and coerces

In production you hand that \`dict\` to a \`pydantic\` model. \`pydantic\` reads the declared field types, coerces where it is safe, and raises \`ValidationError\` where it is not:

\`\`\`python
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    active: bool

User(**raw)   # "1" becomes 1, 1 becomes True, a missing field raises ValidationError
\`\`\`

### This sandbox: a dataclass plus explicit coercion

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "field",
    "raw",
    "raw type",
    "coerced",
    "coerced type"
  ],
  "rows": [
    [
      "id",
      "'1'",
      "str",
      "1",
      "int"
    ],
    [
      "name",
      "'Ada'",
      "str",
      "'Ada'",
      "str"
    ],
    [
      "active",
      "1",
      "int",
      "True",
      "bool"
    ]
  ],
  "highlightCols": [
    "coerced",
    "coerced type"
  ],
  "caption": "The raw dict from the API is coerced field-by-field into the typed User at the boundary: '1' becomes 1, 1 becomes True."
}
\`\`\`

There is no network and no \`pydantic\` here, so you do the same job by hand with a \`@dataclass\`. That difference matters: a \`@dataclass\` gives you the shape, but its type annotations are not enforced at runtime. Building a plain dataclass with \`id="1"\` stores the string \`"1"\` with no error at all. So you coerce each field yourself, exactly like the demo below:

\`\`\`python
raw = {"id": "1", "name": "Ada", "active": 1}
User(id=int(raw["id"]), name=str(raw["name"]), active=bool(raw["active"]))
# User(id=1, name='Ada', active=True)
\`\`\`

Reach for \`raw["id"]\` (indexing), not \`raw.get("id")\`. Indexing raises \`KeyError\` on a missing field, which is the "a missing field should raise" behavior the Practice wants. \`.get\` would silently hand you \`None\` and push the failure downstream.

### Pitfall: \`bool()\` of a string is almost always \`True\`

\`bool(1)\` is \`True\` and \`bool(0)\` is \`False\`, so coercing a 0/1 flag works. But \`bool\` of any non-empty string is \`True\`: \`bool("false")\` is \`True\`, and even \`bool("0")\` is \`True\`. If the API ever sends \`active\` as the string \`"false"\`, a naive \`bool()\` silently flips it to \`True\`. Know your source's shape, and when a flag can arrive as text, map it explicitly (for example \`raw["active"] in (1, "1", "true", True)\`) instead of trusting \`bool()\`.

**Interview nuance:** Python type hints are not enforced at runtime. \`id: int\` on a \`@dataclass\` is documentation the interpreter ignores. The constructor will happily store a \`str\` in that field. Runtime guarantees come only from something that actually checks, like \`pydantic\`, or from explicit coercion you write yourself. That is the whole reason the "validate at the boundary" pattern exists: annotations describe intent, boundary code enforces it.`,
    demoCode: `from dataclasses import dataclass


@dataclass
class User:
    id: int
    name: str
    active: bool


raw = {"id": "1", "name": "Ada", "active": 1}
print(User(id=int(raw["id"]), name=str(raw["name"]), active=bool(raw["active"])))`,
  },
  apply: {
    id: "py-l3-rest-pydantic-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`parse_user(raw)\`. Coerce a raw user dict into a clean dict with
\`id\` as an \`int\`, \`name\` as a \`str\`, and \`active\` as a \`bool\`.

For \`{"id": "1", "name": "Ada", "active": 1}\` return \`{"id": 1, "name": "Ada", "active": True}\`.`,
    starterCode: `def parse_user(raw):
    # Coerce raw["id"] -> int, raw["name"] -> str, raw["active"] -> bool. Return a dict.
    pass`,
    hints: [
      'Coerce each field: `int(raw["id"])`, `str(raw["name"])`, `bool(raw["active"])`.',
      "Return them in a new dict with the same keys.",
    ],
    referenceSolution: `def parse_user(raw):
    return {"id": int(raw["id"]), "name": str(raw["name"]), "active": bool(raw["active"])}`,
    testCases: [
      {
        input: { raw: { id: "1", name: "Ada", active: 1 } },
        expected: { id: 1, name: "Ada", active: true },
        description: "coerces string id and int active",
      },
      {
        input: { raw: { id: 2, name: "Sam", active: 0 } },
        expected: { id: 2, name: "Sam", active: false },
        description: "inactive user",
      },
      {
        input: { raw: { id: "99", name: "Mo", active: true } },
        expected: { id: 99, name: "Mo", active: true },
        description: "already-bool active",
      },
    ],
  },
  practice: {
    id: "py-l3-rest-pydantic-practice",
    executionMode: "workspace",
    prompt: `Implement \`parse_user(raw)\` in \`api/models.py\`: validate a raw user dict into the typed \`User\`
dataclass, coercing \`id\` to \`int\`, \`name\` to \`str\`, and \`active\` to \`bool\`. A missing field
should raise. Some tests are hidden.`,
    starterCode: "",
    hints: [
      'Build the dataclass: `User(id=int(raw["id"]), ...)`.',
      'Indexing a missing key (`raw["active"]`) already raises `KeyError`. That\'s the desired behaviour.',
      "Coerce `active` with `bool(...)`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "api/models.py",
      editableFilePaths: ["api/models.py"],
      visibleTestPaths: ["tests/test_models.py"],
      hiddenTestPaths: ["tests/test_models_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: API_README },
        { path: "api/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "api/client.py",
          role: "readonly",
          language: "python",
          content: API_CLIENT,
          description: "Simulated HTTP client (read-only)",
        },
        {
          path: "api/models.py",
          role: "editable",
          language: "python",
          content: API_MODELS_STARTER,
          description: "Implement parse_user here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_models.py",
          role: "test",
          language: "python",
          content: API_TEST,
          description: "Visible validation tests",
        },
        {
          path: "tests/test_models_hidden.py",
          role: "test",
          language: "python",
          content: API_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_models",
            "test_models_hidden",
            "visible models",
            "hidden models"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "api/models.py",
          role: "editable",
          language: "python",
          content: API_MODELS_REFERENCE,
        },
      ],
    },
  },
}

const CAP_README = `# Capstone: a todo reporter

Tie Level 3 together. This is a small, real project: a \`todo\` package with sample tasks, tests,
and a \`pyproject.toml\`. Implement \`summary(tasks)\` in \`todo/report.py\` so it returns the counts a
CLI or API would report:

\`\`\`python
{"total": <count>, "done": <completed>, "pending": <not done>}
\`\`\`

Each task is a dict like \`{"title": "...", "done": True}\`. Some tests are hidden.
`

const CAP_PYPROJECT = String.raw`[project]
name = "todo"
version = "0.1.0"
description = "A tiny todo reporter"
requires-python = ">=3.11"
dependencies = []

[project.scripts]
todo = "todo.cli:main"

[tool.pytest.ini_options]
testpaths = ["tests"]
`

const CAP_TASKS = String.raw`TASKS = [
    {"title": "write tests", "done": True},
    {"title": "ship feature", "done": False},
    {"title": "review PR", "done": True},
]
`

const CAP_REPORT_STARTER = String.raw`def summary(tasks):
    """Return {"total", "done", "pending"} counts for the tasks (see README.md)."""
    # TODO: count total, done (task["done"] is True), and pending.
    return {}
`

const CAP_REPORT_REFERENCE = String.raw`def summary(tasks):
    done = sum(1 for task in tasks if task["done"])
    return {"total": len(tasks), "done": done, "pending": len(tasks) - done}
`

const CAP_TEST = String.raw`from todo.report import summary
from todo.tasks import TASKS


def run_tests(record):
    def counts_sample_tasks():
        assert summary(TASKS) == {"total": 3, "done": 2, "pending": 1}, f"got {summary(TASKS)!r}"

    def empty_is_all_zero():
        assert summary([]) == {"total": 0, "done": 0, "pending": 0}

    record("counts the sample tasks", counts_sample_tasks)
    record("empty list is all zero", empty_is_all_zero)
`

const CAP_TEST_HIDDEN = String.raw`from todo.report import summary


def run_tests(record):
    def all_done():
        tasks = [{"title": "a", "done": True}, {"title": "b", "done": True}]
        assert summary(tasks) == {"total": 2, "done": 2, "pending": 0}

    def none_done():
        tasks = [{"title": "a", "done": False}]
        assert summary(tasks) == {"total": 1, "done": 0, "pending": 1}

    record("all tasks done", all_done)
    record("no tasks done", none_done)
`

const capstoneLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-uv-pyproject-capstone",
  title: "Dependencies, pyproject & a mini capstone",
  summary: "Understand pyproject.toml/uv and extend a small, tested multi-file project.",
  estimatedMinutes: 22,
  difficulty: "hard",
  skills: ["pyproject", "uv", "packaging", "capstone"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Why one file and one lockfile

A project that only runs on your laptop is a liability. The moment a teammate clones it, CI builds it, or you deploy it, "works on my machine" has to become "installs the same way everywhere." \`pyproject.toml\` plus a lockfile is how modern Python gets there. One file declares what the project is and what it needs, and the lockfile pins the exact versions that got resolved, so every install is byte-for-byte identical.

### \`pyproject.toml\`: the single source of truth

\`pyproject.toml\` is the standard, tool-agnostic place to describe a Python project. It replaces the old \`setup.py\` plus \`requirements.txt\` sprawl.

\`\`\`toml
[project]
name = "todo"
version = "0.1.0"
dependencies = ["httpx>=0.27"]

[project.scripts]
todo = "todo.cli:main"
\`\`\`

The \`[project]\` table holds metadata: the package \`name\`, its \`version\`, and its \`dependencies\`. Note that \`dependencies\` are ranges (\`httpx>=0.27\`), a statement of intent, not exact pins. The \`[project.scripts]\` table wires a console command (\`todo\`) to a function (\`main\` in \`todo.cli\`), so installing the package gives you a runnable CLI.

Your capstone project is laid out this way: a \`todo/\` package directory holds modules like \`tasks.py\` (sample tasks) and \`report.py\` (where \`summary\` lives), with \`pyproject.toml\` at the root naming the package.

### \`uv\`: resolve, lock, run

\`uv\` is a fast package manager that replaces \`pip\`, \`virtualenv\`, and \`pip-tools\` with one tool. The day-to-day loop:

\`\`\`bash
uv add httpx     # add a dep: updates pyproject.toml AND uv.lock
uv sync          # install exactly what uv.lock pins
uv run pytest    # run a command inside the project's .venv
\`\`\`

The mental model is two tiers. \`pyproject.toml\` declares intent as version ranges. \`uv.lock\` records the one exact resolution that satisfied those ranges. Commit both files; never commit \`.venv\`. That split is what makes builds reproducible: your teammate runs \`uv sync\` and gets your exact versions, not "whatever \`pip\` resolved today."

### The reporting function

\`summary(tasks)\` is the kind of function a CLI or API endpoint calls to report state. Given task dicts with a \`"done"\` flag, it returns totals in one pass:

\`\`\`python
def summary(tasks):
    done = sum(1 for task in tasks if task["done"])
    return {"total": len(tasks), "done": done, "pending": len(tasks) - done}

print(summary([{"title": "a", "done": True}, {"title": "b", "done": False}]))
# {'total': 2, 'done': 1, 'pending': 1}
\`\`\`

Deriving \`pending\` as \`total - done\` (rather than a second filtered loop) guarantees the invariant \`total == done + pending\` always holds, even if the two filters ever disagreed.

### Pitfall: truthiness is not equality

\`if task["done"]\` tests truthiness, not "is this the boolean \`True\`." A flag of \`0\` or \`""\` is falsy, but a flag of \`"false"\` (a non-empty string) is truthy and counts as done. If your data might carry non-bool flags, be explicit: \`if task["done"] is True\`. Silent truthiness bugs like this survive tests that only use clean \`True\`/\`False\` fixtures.

**Interview nuance:** in Python, \`bool\` is a subclass of \`int\`, so \`True == 1\` and \`False == 0\`. That means \`sum(task["done"] for task in tasks)\` counts the done tasks without the literal \`1\`, because the booleans add up directly. It is a clean one-pass, O(n) idiom that interviewers like, but flag its fragility: it assumes every flag is a real boolean (or at least an \`int\`). On the pitfall's own bad input, a string flag like \`"false"\` makes \`sum\` raise \`TypeError\` instead of counting, while a non-bool number like \`2\` silently overcounts. Correct behavior here rests on knowing your data's type, not just its shape.`,
    demoCode: `def summary(tasks):
    done = sum(1 for task in tasks if task["done"])
    return {"total": len(tasks), "done": done, "pending": len(tasks) - done}


print(summary([{"title": "a", "done": True}, {"title": "b", "done": False}]))`,
  },
  apply: {
    id: "py-l3-uv-pyproject-capstone-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`summary(tasks)\`. Given a list of task dicts (each with a
\`"done"\` flag), return \`{"total": n, "done": d, "pending": p}\`.

For \`[{"title": "a", "done": True}, {"title": "b", "done": False}]\` return
\`{"total": 2, "done": 1, "pending": 1}\`.`,
    starterCode: `def summary(tasks):
    # Count total, done, and pending tasks. Return the three counts in a dict.
    pass`,
    hints: [
      "`len(tasks)` is the total.",
      'Count completed with `sum(1 for task in tasks if task["done"])`.',
      "Pending is `total - done`.",
    ],
    referenceSolution: `def summary(tasks):
    done = sum(1 for task in tasks if task["done"])
    return {"total": len(tasks), "done": done, "pending": len(tasks) - done}`,
    testCases: [
      {
        input: {
          tasks: [
            { title: "a", done: true },
            { title: "b", done: false },
          ],
        },
        expected: { total: 2, done: 1, pending: 1 },
        description: "one done, one pending",
      },
      { input: { tasks: [] }, expected: { total: 0, done: 0, pending: 0 }, description: "empty" },
      {
        input: { tasks: [{ title: "x", done: true }] },
        expected: { total: 1, done: 1, pending: 0 },
        description: "all done",
      },
    ],
  },
  practice: {
    id: "py-l3-uv-pyproject-capstone-practice",
    executionMode: "workspace",
    prompt: `Capstone: implement \`summary(tasks)\` in \`todo/report.py\` so it returns
\`{"total", "done", "pending"}\` counts for the project's tasks. Read \`pyproject.toml\` and
\`todo/tasks.py\` for context. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "`len(tasks)` is the total count.",
      'Completed tasks have `task["done"] == True`; count them with a generator + `sum`.',
      "Pending is whatever's left: `total - done`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "todo/report.py",
      editableFilePaths: ["todo/report.py"],
      visibleTestPaths: ["tests/test_report.py"],
      hiddenTestPaths: ["tests/test_report_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CAP_README },
        { path: "pyproject.toml", role: "docs", language: "text", content: CAP_PYPROJECT },
        { path: "todo/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "todo/tasks.py",
          role: "readonly",
          language: "python",
          content: CAP_TASKS,
          description: "Sample task data (read-only)",
        },
        {
          path: "todo/report.py",
          role: "editable",
          language: "python",
          content: CAP_REPORT_STARTER,
          description: "Implement summary here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_report.py",
          role: "test",
          language: "python",
          content: CAP_TEST,
          description: "Visible capstone tests",
        },
        {
          path: "tests/test_report_hidden.py",
          role: "test",
          language: "python",
          content: CAP_TEST_HIDDEN,
          hidden: true,
          description: "Hidden capstone tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_report",
            "test_report_hidden",
            "visible report",
            "hidden report"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "todo/report.py",
          role: "editable",
          language: "python",
          content: CAP_REPORT_REFERENCE,
        },
      ],
    },
  },
}

export const level3: PythonLevel = {
  id: 3,
  slug: "applied",
  title: "Level 3: Patterns",
  tagline: "The production-shaped syntax: modules, imports, and working across real files.",
  defaultExecutionMode: "workspace",
  estimatedHours: 4,
  modules: [
    {
      id: "py-l3-project-structure",
      title: "Project Structure & Packaging",
      description: "Lay out a multi-file package with a clear entry point.",
      lessons: [packagesLesson],
    },
    {
      id: "py-l3-working-across-files",
      title: "Working across files",
      description: "Follow imports and change code across a small multi-file Python package.",
      lessons: [parseConfigLesson],
    },
    {
      id: "py-l3-typing",
      title: "Type Hints & Static Typing",
      description: "Annotate functions and classes for clarity and static checking.",
      lessons: [typeHintsLesson, typingModuleLesson],
    },
    {
      id: "py-l3-testing-pytest",
      title: "Testing with pytest",
      description: "Drive a module with pytest assertions, fixtures, and parametrize.",
      lessons: [pytestBasicsLesson, pytestFixturesLesson],
    },
    {
      id: "py-l3-files-data-robustness",
      title: "Files, Data & Robustness",
      description: "Read files with pathlib and design resilient error handling.",
      lessons: [pathlibLesson, loggingErrorsLesson],
    },
    {
      id: "py-l3-real-programs",
      title: "Real Programs & Tooling",
      description: "Build a CLI, validate API data, and package a small project with pyproject/uv.",
      lessons: [cliLesson, restPydanticLesson, capstoneLesson],
    },
  ],
}

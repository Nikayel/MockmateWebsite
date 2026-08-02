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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "plain-assert-is-enough",
  "prompt": "A test contains one line: assert balance_after(100, [10, -30, 5]) == 85. The function is buggy and returns 90. What does pytest print when the test fails?",
  "options": [
    {
      "label": "Just AssertionError, so you have to add a message to every assert to learn anything.",
      "feedback": "Tempting, because that is precisely what a bare assert does in ordinary Python, and it is the reason other frameworks ship assertEqual style helpers. pytest rewrites the asserts in your test files as it imports them, so it can show both sides."
    },
    {
      "label": "The failing line plus the value it actually got and the value you expected.",
      "correct": true,
      "feedback": "Right. That rewriting is why a plain assert is enough in pytest and why you almost never need a custom message. You get output along the lines of 'assert 90 == 85' for free."
    },
    {
      "label": "Nothing useful unless you rerun it with pytest -v.",
      "feedback": "Close, in that -v does change the output: it lists each test by name instead of printing dots. But the detail inside a failure is on by default. -v changes the summary, not the assertion report."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "discovery-is-convention",
  "prompt": "You add a function named check_deposits to tests/test_account.py. It contains an assert that would definitely fail. You run pytest. What do you see?",
  "options": [
    {
      "label": "A failure. pytest imports the file, so everything in it runs.",
      "feedback": "Tempting, because pytest really does import the whole file, so the function is certainly loaded into memory. Importing is not calling though: pytest only invokes functions whose names begin with test_."
    },
    {
      "label": "A green suite. pytest never calls it, so the assert never executes.",
      "correct": true,
      "feedback": "Right, and this is the dangerous outcome, because a green suite that tested nothing is worse than a red one. Watch the collected count in pytest -v output whenever a number looks suspiciously low."
    },
    {
      "label": "A collection error, since pytest cannot tell whether it was meant to be a test.",
      "feedback": "Tempting, because a strict tool would flag an ambiguous name, and you would want it to. pytest's discovery is pure convention with no warning attached: a name that does not match is simply not a test."
    }
  ]
}
\`\`\`

If you misspell the prefix and name a function \`check_deposits\` instead of \`test_deposits\`, \`pytest\` silently skips it. The suite goes green while testing nothing, which is worse than a red suite because it hands you false confidence. The same trap hits a file named \`account_tests.py\` (wrong pattern) or a helper that raises but is never called. The fix: keep the \`test_\` prefix, name files \`test_*.py\`, and run \`pytest -v\` to read the count of collected tests. If the number looks low, something is not being discovered.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "float-equality-in-tests",
  "prompt": "Money becomes float in your model, and a test now asserts: balance_after(0.0, [0.1, 0.2]) == 0.3. Does that test pass?",
  "options": [
    {
      "label": "Yes. 0.1 plus 0.2 is 0.3.",
      "feedback": "Tempting, because it is true in decimal arithmetic and it is obviously what the code means. Binary floats cannot store 0.1 or 0.2 exactly, so the sum lands on 0.30000000000000004 and the comparison comes out False."
    },
    {
      "label": "No. The sum is 0.30000000000000004, so == is False.",
      "correct": true,
      "feedback": "Right. Write assert result == pytest.approx(0.3) instead, which compares within a small relative tolerance. Exact float equality is one of the main ways a test suite turns flaky."
    },
    {
      "label": "It depends on the machine and the Python build.",
      "feedback": "Reasonable-sounding, and there really are platform differences in some corners of floating point. This is not one of them: IEEE 754 pins the result down, so every mainstream Python gives the same 0.30000000000000004."
    }
  ],
  "reveal": "Real money systems usually store cents as an int, or use Decimal, precisely so this never comes up. When you genuinely do hold floats, compare with a tolerance and never with ==."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "fixture-fresh-per-test",
  "prompt": "base_stock is a plain @pytest.fixture that returns {'apple': 5, 'pear': 2}. Ten tests in the file take base_stock as a parameter. How many dicts get built over the run?",
  "options": [
    {
      "label": "One. The fixture body runs once and all ten tests receive that same dict.",
      "feedback": "Tempting, because a fixture reads like a shared resource you set up once, and that is exactly how setup works in some other frameworks. pytest defaults to function scope, so the body runs again for every test that asks."
    },
    {
      "label": "Ten. Function scope is the default, so it is rebuilt for each test.",
      "correct": true,
      "feedback": "Right, and the freshness is the entire point: each test gets its own mutable dict, so nothing one test does can reach another. You give that up the moment you widen the scope."
    },
    {
      "label": "One, plus a copy for each test that mutates it. pytest copies lazily.",
      "feedback": "Tempting, because copy-on-write is a real technique elsewhere and it would be a clever design. pytest does nothing that subtle. It simply calls your fixture function again, and whatever you return is what the test gets."
    }
  ]
}
\`\`\`

By default a fixture has function scope: \`pytest\` calls it fresh for every test, so \`base_stock\` is a brand-new dict each time and tests cannot leak state into one another. A fixture that uses \`yield\` instead of \`return\` runs the code after \`yield\` as teardown once the test finishes.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "yield-teardown-on-failure",
  "prompt": "A fixture creates a temp file, yields the path, and deletes the file on the line after the yield. During one test an assert fails and the test errors out. Does the delete run?",
  "options": [
    {
      "label": "No. The failure aborts the test, so the code after the yield never resumes.",
      "feedback": "Tempting, because an exception really does abort the test body, and code after a raise normally never runs. pytest finalizes fixtures in a separate teardown phase that happens no matter how the test ended."
    },
    {
      "label": "Yes. Teardown runs whether the test passed, failed, or raised.",
      "correct": true,
      "feedback": "Right, and that guarantee is the whole reason to prefer yield over return. It lets a fixture safely own a temp file, an open connection, or a database transaction it must roll back."
    },
    {
      "label": "Only if you wrap the yield in your own try/finally.",
      "feedback": "A sound instinct, since try/finally is how you would guarantee cleanup in ordinary code. pytest already does it for you: the finalizer is registered the moment the fixture yields, so a plain yield is enough."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "scope-and-mutable-state",
  "prompt": "A fixture is declared @pytest.fixture(scope='module') and returns {'apple': 5}. restock has a bug: it does result = stock instead of result = dict(stock), so it mutates the dict it was handed. You run the file. What do you see?",
  "options": [
    {
      "label": "Every test in the file fails, since they all share the corrupted dict.",
      "feedback": "Tempting, because the corruption really is shared, so it feels like it should take everything down. Only the tests that run after the mutation see it, and several of those may not touch the mutated key at all."
    },
    {
      "label": "Some tests fail, and which ones depends on the order pytest happens to run them in.",
      "correct": true,
      "feedback": "Right. Order dependence is the signature of shared mutable state: green on your laptop, red in CI, then green again when you rerun the failing test by itself."
    },
    {
      "label": "Nothing fails. pytest hands each test its own copy of a fixture value.",
      "feedback": "True at the default function scope, which is exactly where the habit comes from. Writing scope='module' opts out of that: the body runs once for the whole file and every test receives the same object."
    }
  ]
}
\`\`\`

A fixture that returns a mutable object at function scope is safe, but widen the scope and that object is shared:

\`\`\`python
@pytest.fixture(scope="module")
def base_stock():
    return {"apple": 5}
\`\`\`

Now every test in the module gets the same dict. If \`restock\` mutates its input (for example \`result = stock\` instead of \`result = dict(stock)\`, which makes \`result\` and \`stock\` the same object), one test's change bleeds into the next, and tests pass or fail depending on order. The Practice suite checks exactly this: return a new dict and never touch \`stock\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "parametrize-vs-loop",
  "prompt": "You have six cases to cover. Option A is one test with a for loop over six tuples. Option B is @pytest.mark.parametrize with six rows. Case three is broken and case five is broken too. What is the difference in what you learn?",
  "options": [
    {
      "label": "No real difference. Either way you find out that case three failed.",
      "feedback": "Tempting, because the loop's assert output does name the values it compared, so case three is identifiable. What you never learn is that case five is broken as well: the loop stopped at the first failing assert."
    },
    {
      "label": "The loop reports one failure and skips the rest. Parametrize runs all six and names each one.",
      "correct": true,
      "feedback": "Right. Six independent tests give six independent results, so one bug can never mask another, and you can skip or xfail a single row with pytest.param."
    },
    {
      "label": "Parametrize is shorthand: pytest expands it into one test that loops internally.",
      "feedback": "Tempting, because it is written in one place and reads like sugar for a loop. pytest actually generates N separate test items during collection, which is why the collected count rises by six rather than by one."
    }
  ],
  "reveal": "Independence is the theme running through this whole lesson. Function-scope fixtures stop tests leaking state into each other, and parametrize stops one broken case hiding the next five."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "path-does-no-io",
  "prompt": "You run p = Path('data/scores.txt') on a machine where no such file exists. What happens on that line?",
  "options": [
    {
      "label": "FileNotFoundError, because the path does not point at anything.",
      "feedback": "Tempting, because the name looks like it refers to a real file and most file APIs do fail fast. Building a Path is pure string work: nothing touches disk until you call something like read_text or exists."
    },
    {
      "label": "Nothing at all. You get a Path object and no disk access happens yet.",
      "correct": true,
      "feedback": "Right. A Path represents a location, not contents. That is what lets you build and manipulate paths for files you are about to create, and it is why exists() has to be a separate call."
    },
    {
      "label": "It creates an empty file at that location.",
      "feedback": "Tempting if you are thinking of shell redirection or open(path, 'w'), both of which really do create the file. Constructing a Path writes nothing. Even touch(), which does create it, is a separate explicit call."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "suffix-double-extension",
  "prompt": "A pipeline receives a file named archive.tar.gz. For Path('archive.tar.gz'), what do .suffix and .stem give you?",
  "options": [
    {
      "label": "'.tar.gz' and 'archive'",
      "feedback": "Tempting, because that is how a human reads the filename: the extension is tar.gz and the name is archive. Both attributes look only at the LAST dot, so they cut the name in a different place than you would."
    },
    {
      "label": "'.gz' and 'archive.tar'",
      "correct": true,
      "feedback": "Right. Both split on the final dot. When you need the whole compound extension, .suffixes hands you ['.tar', '.gz'] as a list."
    },
    {
      "label": "'gz' and 'archive.tar'",
      "feedback": "Half right, and you got the harder half: the stem really is archive.tar. But .suffix keeps its leading dot, so it is '.gz'. That dot is exactly why a comparison like p.suffix == 'csv' quietly never matches anything."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "splitlines-vs-split-newline",
  "prompt": "A real scores file ends with a trailing newline, the way almost every file written by an editor does. Your code splits the text on the newline character with split(), then calls int() on each piece. What happens?",
  "options": [
    {
      "label": "It works. Splitting on newlines is what splitlines does anyway.",
      "feedback": "Tempting, because for a file with no trailing newline the two really are identical, which is how this bug survives every hand-written test fixture. The trailing newline leaves an empty string as the final piece."
    },
    {
      "label": "ValueError, because int() is handed the empty string left after the last newline.",
      "correct": true,
      "feedback": "Right. split leaves a phantom empty piece after a trailing separator, while splitlines drops it. Use splitlines, or keep an if line.strip() guard, or both. The guard also covers blank lines in the middle."
    },
    {
      "label": "It quietly returns a total that is short by the last line.",
      "feedback": "Close to a real class of bug, and a silent wrong number really is the worst outcome. This one is loud though: int('') raises ValueError instead of politely returning 0."
    }
  ]
}
\`\`\`

Real files almost always end with a trailing newline, and that is where interns get burned. Compare:

\`\`\`python
"10\\n20\\n30\\n".split("\\n")     # ['10', '20', '30', '']  <- trailing ''
"10\\n20\\n30\\n".splitlines()    # ['10', '20', '30']       <- clean
\`\`\`

If you use \`split("\\n")\` you get a phantom empty string at the end, and \`int("")\` raises \`ValueError\`. Use \`splitlines()\`, or keep the \`if line.strip()\` guard, or both. That guard is your safety net for blank lines anywhere in the file, not just the last one.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "cwd-not-script-dir",
  "prompt": "A script at tools/report.py opens Path('data/scores.txt'). It works when you run 'python tools/report.py' from the project root. A teammate cds into tools/ and runs 'python report.py' instead. What do they get?",
  "options": [
    {
      "label": "It works. The path is written inside report.py, so it is anchored to that file.",
      "feedback": "Tempting, because the path literal lives in report.py and it feels like it should travel with the file. A relative path is resolved against the current working directory, which is wherever the process was launched from."
    },
    {
      "label": "FileNotFoundError. The relative path now resolves under tools/, not the project root.",
      "correct": true,
      "feedback": "Right, and this is the classic 'works on my machine' path bug. When the answer has to be stable, anchor it explicitly: Path(__file__).parent and build outward from there."
    },
    {
      "label": "It works, because Python puts the script's own directory on the path.",
      "feedback": "You are thinking of sys.path, which really does receive the script's directory, and that is what makes imports resolve. sys.path governs module lookup only. File I/O never consults it."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "logger-info-invisible",
  "prompt": "A fresh script does logger = logging.getLogger(__name__) and then logger.info('job started'). There is no other logging setup anywhere. What shows up on the console?",
  "options": [
    {
      "label": "The line prints. info is a normal severity and logging is imported.",
      "feedback": "Tempting, because info sounds like the everyday level and it is the one most people reach for first. A logger's effective level starts at WARNING, so info sits below the bar and never gets emitted."
    },
    {
      "label": "Nothing, and no error either. The default effective level is WARNING.",
      "correct": true,
      "feedback": "Right. The record is discarded in silence, which is why 'my logs vanished' is almost always this. One call to logging.basicConfig(level=logging.INFO) at startup lowers the bar."
    },
    {
      "label": "Nothing, plus a complaint that no handler was configured.",
      "feedback": "Close, and that complaint genuinely existed in older Python: 'No handlers could be found for logger'. Modern Python ships a last-resort handler instead, so this call produces no output of any kind."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "percent-args-vs-fstring",
  "prompt": "Library code writes logger.debug('row %r failed', raw) rather than logger.debug(f'row {raw!r} failed'). Debug logging is switched off in production. What does the first form buy you?",
  "options": [
    {
      "label": "Nothing real. f-strings are the fastest formatting in Python, so this is just an old habit.",
      "feedback": "Tempting, because f-strings genuinely are the fastest way to build a string, and for ordinary code they are the right default. The saving here is not building the string at all."
    },
    {
      "label": "logging formats the message only if the record will be emitted, so with debug off nothing is formatted.",
      "correct": true,
      "feedback": "Right. logging checks isEnabledFor before doing any interpolation. The f-string version builds its string eagerly on every call, including the millions of calls that end up logging nothing."
    },
    {
      "label": "It is required. logging cannot accept an already-formatted string.",
      "feedback": "Not so: handing logging a finished string is perfectly legal and extremely common. It simply gives up the lazy formatting, which is the one and only reason to prefer the %-style call."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "catch-narrow-not-broad",
  "prompt": "Your batch loop must skip rows that fail to parse, so you write: except Exception: continue. Weeks later someone introduces a typo in the loop body that references a name which does not exist. What does the job do?",
  "options": [
    {
      "label": "It crashes with NameError, so the typo is found on the very next run.",
      "feedback": "That is what you want to happen, and it is exactly what a narrow except ValueError would have given you. except Exception catches NameError too, so the typo is swallowed once per row instead."
    },
    {
      "label": "It skips every row and reports success with a total of zero.",
      "correct": true,
      "feedback": "Right. A broad except turns a real defect into silence, and silence is far more expensive to debug than a crash. Catch the specific type you expect so genuine bugs still surface."
    },
    {
      "label": "Nothing changes, because NameError is not a subclass of Exception.",
      "feedback": "Tempting, because a few exceptions really do sit outside it: KeyboardInterrupt and SystemExit inherit from BaseException, which is why a bare except: is even worse. NameError is an ordinary Exception."
    }
  ]
}
\`\`\`

- **Catching too broadly.** \`except Exception:\` hides a typo'd name (\`NameError\`) alongside the errors you meant to skip; a bare \`except:\` is worse, also catching \`KeyboardInterrupt\` so you cannot even Ctrl-C out. Catch the specific type you expect (\`ValueError\`) and real bugs still surface.
- **\`int\` is pickier than you think.** \`int("3.5")\` raises \`ValueError\` (it is not an integer literal), so \`safe_total(["3.5"])\` returns \`0\`, not \`3\`. And \`int(None)\` raises \`TypeError\`, which \`except ValueError\` will not catch at all.
- **Silent logs.** A fresh logger's effective level defaults to \`WARNING\`, so \`logger.info(...)\` prints nothing until you call \`basicConfig(level=logging.INFO)\`. "My logs vanished" is almost always this.

**Interview nuance:** prefer \`logger.info("n=%d", n)\` over \`logger.info(f"n={n}")\`. \`logging\` checks \`isEnabledFor(level)\` first and only formats the message if the record will actually be emitted, so the \`%\`-style call skips string building when that level is off. The f-string builds the string eagerly on every call, including calls that log nothing. On a hot path with expensive \`%r\` values, that difference is measurable.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "what-except-valueerror-covers",
  "prompt": "safe_total loops over raw values, does total += int(raw), and guards it with except ValueError: continue. Sort each incoming value by what the loop does with it.",
  "buckets": ["Counted", "Skipped by the guard", "Crashes the loop"],
  "items": [
    {
      "label": "'12'",
      "bucket": "Counted",
      "feedback": "The ordinary path. int('12') is 12 and the guard never fires."
    },
    {
      "label": "'  7  '",
      "bucket": "Counted",
      "feedback": "int strips surrounding whitespace before parsing, so this is 7. You do not need to strip it yourself."
    },
    {
      "label": "'x'",
      "bucket": "Skipped by the guard",
      "feedback": "int('x') raises ValueError, which is precisely the case the guard was written for."
    },
    {
      "label": "'3.5'",
      "bucket": "Skipped by the guard",
      "feedback": "This one surprises people. '3.5' is not an integer literal, so int() raises ValueError and the row contributes 0, not 3. If you wanted 3 you would have to go through float first."
    },
    {
      "label": "an empty string",
      "bucket": "Skipped by the guard",
      "feedback": "int('') raises ValueError, so an empty field is skipped rather than quietly counted as zero. Same outcome here, different reason."
    },
    {
      "label": "None",
      "bucket": "Crashes the loop",
      "feedback": "int(None) raises TypeError, and except ValueError does not catch it. One null in the source data takes down a job that handled every malformed string just fine."
    }
  ],
  "reveal": "Two lessons in one table. int() is pickier than it looks, and a narrow except covers only the type you named. Either widen the guard on purpose to (ValueError, TypeError), or reject None before it reaches the parse."
}
\`\`\``,
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "argv-zero-is-program-name",
  "prompt": "At a shell you run: python mytool.py add 2 3. Inside the program, what is sys.argv[0]?",
  "options": [
    {
      "label": "'add', the first thing you typed after the program name.",
      "feedback": "Tempting, because it is the first argument YOU typed, and several languages do number their arguments that way. Python puts the script's own name at index 0, so your first real argument sits at index 1."
    },
    {
      "label": "'mytool.py', the script name. Your own arguments start at index 1.",
      "correct": true,
      "feedback": "Right. That is why real code parses sys.argv[1:] rather than sys.argv. Getting it wrong shifts every argument by one and usually surfaces as a baffling 'unknown command'."
    },
    {
      "label": "'python', the interpreter the shell actually launched.",
      "feedback": "Tempting, because 'python' really is the first word on the command line and it is what the OS started. Python strips the interpreter and its own options before building argv, so index 0 is the script."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "argparse-type-converter",
  "prompt": "The parser above declares parser.add_argument('a', type=int). A user runs the tool passing abc where a number was expected. What happens?",
  "options": [
    {
      "label": "args.a holds the string 'abc', and the crash comes later when your code does arithmetic on it.",
      "feedback": "Tempting, because type= reads like a type annotation, and you have just learned that annotations do nothing at runtime. This one is genuinely different: argparse calls int('abc') itself while parsing."
    },
    {
      "label": "argparse prints a usage error and exits non-zero before any of your code runs.",
      "correct": true,
      "feedback": "Right. type= names a converter function that argparse really calls, and a failure there becomes a short usage message plus SystemExit. Your command function never receives a bad value."
    },
    {
      "label": "A ValueError traceback, since int('abc') raises.",
      "feedback": "Half right: int('abc') really does raise ValueError underneath. argparse catches it and turns it into a usage message instead, because a stack trace is not a useful thing to show someone at a terminal."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "argv-values-are-strings",
  "prompt": "Someone writes run so it does command, a, b = argv[0], argv[1], argv[2], with no int() anywhere. They call run(['add', '2', '3']). What comes back?",
  "options": [
    {
      "label": "5, because the add branch adds a and b.",
      "feedback": "Tempting, because that is plainly what the command means and it is what the same call returns as soon as you convert. Everything in argv is a string, and + on two strings concatenates rather than adds."
    },
    {
      "label": "'23', the two strings glued together.",
      "correct": true,
      "feedback": "Right, and the mul branch behaves differently: '2' * '3' raises TypeError. So one command fails loudly and the other fails silently. Convert once, at the boundary where the strings arrive."
    },
    {
      "label": "TypeError, since you cannot add two strings.",
      "feedback": "That is exactly what the mul branch would give you, where '2' * '3' really does raise. But + is defined for two strings, which is the whole reason this particular bug slips through code review."
    }
  ]
}
\`\`\`

- Arguments are strings. Skip \`int()\` and \`argv[1]\` is \`"2"\`, not \`2\`. Then \`"2" + "3"\` is \`"23"\` and \`"2" * "3"\` raises \`TypeError\`. Convert at the boundary.
- Off-by-one on \`argv\`. In a real \`main\`, the command is \`sys.argv[1]\`, not \`sys.argv[0]\` (that is the program name). Slicing \`sys.argv[1:]\` avoids the mistake.
- An unknown command should do something defined (here, return \`0\`), not fall through and crash.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "pure-core-testability",
  "prompt": "Two designs for the same tool. Design A: run(argv) takes the list as a parameter and returns a number. Design B: main() reads sys.argv itself and prints the result. Which is easier to unit-test, and why?",
  "options": [
    {
      "label": "They are equally testable. A test can set sys.argv before it calls main().",
      "feedback": "You can do that, and plenty of test suites do, which is why the two feel equivalent. But now the test mutates global interpreter state, has to restore it afterwards, and has to capture stdout to read the answer."
    },
    {
      "label": "Design A. A test calls run(['mul', '4', '5']) and asserts on the return value, with no globals and no stdout.",
      "correct": true,
      "feedback": "Right. This is the thin shell, pure core pattern: keep sys.argv and print out at the edge, and put every decision in a function that takes its input and returns its output."
    },
    {
      "label": "Design B, because it exercises the real entry point end to end.",
      "feedback": "There is a real point buried in here: you do want at least one test that goes through the actual entry point. That is an integration test though. Making it the only way to test your logic is what makes a suite slow and brittle."
    }
  ],
  "reveal": "The same split shows up everywhere: parsing and I/O at the edge, decisions in the middle. It is why the Practice exercise hands run its argv rather than letting it reach for sys.argv."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "status-codes-do-not-raise",
  "prompt": "You call httpx.get(url). The server answers 404 and returns an HTML error page. You have not called raise_for_status(). What does your code get back?",
  "options": [
    {
      "label": "An exception. A 404 is an error, so the client raises.",
      "feedback": "Tempting, because a 404 obviously is a failure and some HTTP clients in other languages really do throw. httpx counts any completed exchange as a success at the transport level: a reply arrived, so nothing raises."
    },
    {
      "label": "An ordinary Response object whose status_code is 404. Nothing raises until you check.",
      "correct": true,
      "feedback": "Right, and the next line is where it actually breaks: response.json() tries to parse an HTML error page. Call raise_for_status() so the failure names the status code instead of a JSON decode error."
    },
    {
      "label": "response.json() returns None, so you can test for that.",
      "feedback": "Tempting, because a None-on-failure convention would be convenient and some libraries do work that way. json() either parses the body or raises a decode error. It never invents a None for you."
    }
  ]
}
\`\`\`

\`httpx\` is the modern HTTP client (sync or async, same API):

\`\`\`python
import httpx

response = httpx.get("https://api.example.com/users/1")
response.raise_for_status()   # raise on 4xx/5xx instead of parsing an error page
raw = response.json()         # a plain dict, still untrusted
\`\`\`

\`response.json()\` gives you a \`dict\`. Nothing about it is validated yet. The types are whatever the server chose to send.

### pydantic validates and coerces

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "pydantic-coerces-not-just-rejects",
  "prompt": "A pydantic model declares id: int, name: str, active: bool. The API sends {'id': '1', 'name': 'Ada', 'active': 1}, so id arrives as a string and active as a number. What does User(**raw) do?",
  "options": [
    {
      "label": "Raises ValidationError, because id came in as a string rather than an int.",
      "feedback": "Tempting, because strict checking is the reason you reached for pydantic at all. pydantic converts whenever the conversion is unambiguous, so the string '1' quietly becomes the int 1."
    },
    {
      "label": "Builds a User with id=1 and active=True, converting both on the way in.",
      "correct": true,
      "feedback": "Right. pydantic validates AND coerces. It raises only when a value cannot be converted at all, or when a required field is missing from the payload entirely."
    },
    {
      "label": "Builds a User but leaves id as the string '1', since annotations do nothing at runtime.",
      "feedback": "Exactly right for a plain @dataclass, which is what makes this such a natural answer. pydantic is a library that opts in: it reads those same annotations and actually enforces them."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "index-vs-get-at-the-boundary",
  "prompt": "The API stops sending the active field altogether. Your boundary code reads it as bool(raw.get('active')). What happens?",
  "options": [
    {
      "label": "KeyError, so you find out about the change immediately.",
      "feedback": "That is what raw['active'] would do, and it is the behaviour you want at a boundary. .get is specifically the version that refuses to raise: it hands back None for a key that is not there."
    },
    {
      "label": "active silently becomes False, and the damage shows up somewhere else entirely.",
      "correct": true,
      "feedback": "Right. .get returns None, bool(None) is False, and every genuinely active user is now recorded as inactive. Index at the boundary so a missing field fails at the place it went missing."
    },
    {
      "label": "TypeError, because bool() cannot be handed a None.",
      "feedback": "Tempting, because passing None to a converter often does raise, and int(None) genuinely does. bool() is the exception: it accepts any object and only asks whether it is truthy, so bool(None) is simply False."
    }
  ]
}
\`\`\`

Reach for \`raw["id"]\` (indexing), not \`raw.get("id")\`. Indexing raises \`KeyError\` on a missing field, which is the "a missing field should raise" behavior the Practice wants. \`.get\` would silently hand you \`None\` and push the failure downstream.

### Pitfall: \`bool()\` of a string is almost always \`True\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bool-of-string-is-true",
  "prompt": "The API changes and starts sending active as the string 'false' where it used to send the number 0. Your boundary code still does bool(raw['active']). What ends up stored on the user?",
  "options": [
    {
      "label": "False, because the value says false.",
      "feedback": "Tempting, because that is unmistakably what the API meant and any human reading the payload would agree. bool() does not read English. It only asks whether the value is empty."
    },
    {
      "label": "True, because bool() of any non-empty string is True.",
      "correct": true,
      "feedback": "Right, and bool('0') is True for exactly the same reason. Every user flips to active, nothing raises, and nothing in your logs looks wrong. That is the worst kind of data bug."
    },
    {
      "label": "ValueError, since 'false' is not a boolean literal.",
      "feedback": "That is what int('false') would give you, so the instinct carries over from the id field. bool() never rejects anything: it maps every object to True or False and has no failure mode."
    }
  ],
  "reveal": "Coercion is only safe when you know the shape of what is arriving. bool() in particular cannot fail, so a changed API becomes silently wrong data instead of a crash. When a flag can arrive as text, list the accepted values explicitly."
}
\`\`\`

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

const DBKIT_README = `# Ship the data-access module

Your team's data-access module goes out with the next release and the security review sent it back.
Implement the three helpers in \`dbkit/queries.py\`.

**\`build_insert(columns, values)\`** returns a \`(sql, params)\` pair for the \`users\` table. The SQL
carries one \`?\` per column and no values at all; the values travel in the params tuple:

\`\`\`python
build_insert(["name", "email"], ["Ada", "ada@example.com"])
# ("INSERT INTO users (name, email) VALUES (?, ?)", ("Ada", "ada@example.com"))
\`\`\`

The column names come from the app's own schema constant, never from a request, so they are
interpolated. Values never are.

**\`flag_unsafe(sources)\`** is the audit the review asked for. Each item is the source line a
teammate wrote for a query. Return the ones that build the SQL text instead of fixing it, using
these four markers: a \`{\` (an f-string hole), \` + \` (concatenation, with a space either side),
a \`%\` (percent formatting), or the text \`.format(\`. Keep the original order.

**\`rows_to_dicts(columns, rows)\`** turns the driver's tuples into dicts, since \`fetchall\` hands
back \`(1, "Ada")\` and the rest of your program wants \`{"id": 1, "name": "Ada"}\`.

Some tests are hidden.
`

const DBKIT_QUERIES_STARTER = String.raw`def build_insert(columns, values):
    """Return (sql, params) for an INSERT into users (see README.md)."""
    # TODO: one "?" per column, values in the params tuple.
    return "", ()


def flag_unsafe(sources):
    """Return the query source lines that build their SQL text (see README.md)."""
    # TODO: keep a source when it contains "{", " + ", "%", or ".format(".
    return []


def rows_to_dicts(columns, rows):
    """Zip driver tuples against the column names."""
    # TODO: turn each row tuple into a dict keyed by column name.
    return []
`

const DBKIT_QUERIES_REFERENCE = String.raw`UNSAFE_MARKERS = ("{", " + ", "%", ".format(")


def build_insert(columns, values):
    placeholders = ", ".join("?" for _ in columns)
    column_list = ", ".join(columns)
    sql = "INSERT INTO users (" + column_list + ") VALUES (" + placeholders + ")"
    return sql, tuple(values)


def flag_unsafe(sources):
    return [source for source in sources if any(marker in source for marker in UNSAFE_MARKERS)]


def rows_to_dicts(columns, rows):
    return [dict(zip(columns, row)) for row in rows]
`

const DBKIT_TEST = String.raw`from dbkit.queries import build_insert, flag_unsafe, rows_to_dicts


def run_tests(record):
    def builds_one_placeholder_per_column():
        sql, params = build_insert(["name", "email"], ["Ada", "ada@example.com"])
        assert sql == "INSERT INTO users (name, email) VALUES (?, ?)", f"got {sql!r}"
        assert params == ("Ada", "ada@example.com"), f"got {params!r}"

    def flags_an_f_string_query():
        sources = [
            'f"SELECT id FROM users WHERE email = {email}"',
            '"SELECT id FROM users WHERE email = ?"',
        ]
        assert flag_unsafe(sources) == [sources[0]], f"got {flag_unsafe(sources)!r}"

    def maps_rows_onto_column_names():
        rows = [(1, "Ada"), (2, "Sam")]
        result = rows_to_dicts(["id", "name"], rows)
        assert result == [{"id": 1, "name": "Ada"}, {"id": 2, "name": "Sam"}], f"got {result!r}"

    record("one placeholder per column", builds_one_placeholder_per_column)
    record("flags an f-string query", flags_an_f_string_query)
    record("maps rows onto column names", maps_rows_onto_column_names)
`

const DBKIT_TEST_HIDDEN = String.raw`from dbkit.queries import build_insert, flag_unsafe, rows_to_dicts


def run_tests(record):
    def keeps_a_quote_out_of_the_sql_text():
        sql, params = build_insert(["name"], ["O'Brien"])
        assert sql == "INSERT INTO users (name) VALUES (?)", f"got {sql!r}"
        assert params == ("O'Brien",), f"got {params!r}"

    def flags_concatenation_and_percent_formatting():
        sources = [
            '"SELECT id FROM users WHERE email = " + email',
            '"SELECT id FROM users WHERE email = %s" % email',
            '"SELECT id FROM users WHERE email = ?"',
        ]
        assert flag_unsafe(sources) == sources[:2], f"got {flag_unsafe(sources)!r}"

    def maps_an_empty_result_set():
        assert rows_to_dicts(["id", "name"], []) == []

    record("a quote stays out of the sql text", keeps_a_quote_out_of_the_sql_text)
    record("flags concatenation and percent formatting", flags_concatenation_and_percent_formatting)
    record("maps an empty result set", maps_an_empty_result_set)
`

const sqliteLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-sqlite-parameterized",
  title: "Talking to a database from Python: sqlite3 and parameterized queries",
  summary:
    "Connect, execute, fetch and commit with sqlite3, and keep every value out of the SQL text.",
  estimatedMinutes: 20,
  difficulty: "medium",
  skills: ["standard-library", "data-boundary", "validation", "string-formatting"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## The Python side of a database

The SQL course on this platform teaches the query language: \`SELECT\`, joins, aggregation, window functions. This lesson teaches the other half, the part that lives in your Python file. Writing a correct query is not enough if the code around it splices user input into the statement, forgets to commit, or hands the rest of the program a tuple when it expected a record.

\`sqlite3\` is in the standard library, so there is nothing to install. Every driver you will meet later (\`psycopg\` for Postgres, \`mysqlclient\`, \`pyodbc\`) follows the same DB-API shape, so the four moves below transfer unchanged.

### Connect, execute, fetch

\`\`\`python
import sqlite3

conn = sqlite3.connect("app.db")   # a file, or ":memory:" for a throwaway database
cur = conn.cursor()                # a cursor holds one statement and its result rows

cur.execute("SELECT id, name FROM users WHERE active = 1")
rows = cur.fetchall()              # [(1, 'Ada'), (2, 'Sam')]
conn.close()
\`\`\`

The connection is the session, the cursor is the thing that runs a statement and walks its result. \`fetchall()\` returns every remaining row at once, \`fetchone()\` returns the next row or \`None\`, and iterating the cursor streams rows one at a time (the right choice for a large table).

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "cursor-rows-are-tuples",
  "prompt": "You run cur.execute('SELECT id, name FROM users') and then loop over cur.fetchall(). What is each element of that list?",
  "options": [
    {
      "label": "A dict keyed by column name, like {'id': 1, 'name': 'Ada'}",
      "feedback": "Tempting, because that is what most HTTP APIs hand back and what the rest of your program almost always wants. The driver returns tuples by default, and you get dicts only after setting conn.row_factory yourself."
    },
    {
      "label": "A tuple of column values in SELECT order, like (1, 'Ada')",
      "correct": true,
      "feedback": "Right, and that is why the column order in your SELECT is part of your code's contract. Zip the tuple against the names in cur.description, or set a row_factory, before those values travel any further."
    },
    {
      "label": "An object with .id and .name attributes",
      "feedback": "Tempting, because an ORM like SQLAlchemy really does return objects with attributes, and that is what most people meet first. The raw driver sits one layer below that: it knows rows and columns, not classes."
    }
  ]
}
\`\`\`

### Never build the query text out of values

This is the single most important habit in the lesson. Here is the version that looks fine:

\`\`\`python
name = "Ada"
cur.execute(f"SELECT id FROM users WHERE name = '{name}'")   # WRONG
\`\`\`

It works. It keeps working. It ships. Then a customer named O'Brien signs up, and the statement the database receives is \`WHERE name = 'O'Brien'\`, which closes the string literal after the \`O\` and fails to parse. The same hole that an apostrophe trips by accident is the hole an attacker types on purpose: a \`name\` of \`'; DROP TABLE users; --\` ends your statement early and starts a new one.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "fstring-sql-meets-a-quote",
  "prompt": "A teammate builds a lookup by splicing the name straight into the SQL text with an f-string, between two single quotes. It works for months. Then a customer named O'Brien signs up. What does the database do with that lookup?",
  "options": [
    {
      "label": "Nothing changes. The driver escapes the apostrophe before sending it.",
      "feedback": "Tempting, because ORMs and helper layers really do escape values, so it is easy to assume the driver always handles it. By the time the driver sees this statement the apostrophe is already part of the SQL text, so there is nothing left for it to escape."
    },
    {
      "label": "It fails to parse, because the apostrophe closes the string literal early.",
      "correct": true,
      "feedback": "Right. The database receives name = 'O'Brien', which ends the literal after the O and leaves Brien' as garbage. An apostrophe finds this bug by accident; an attacker types one on purpose."
    },
    {
      "label": "It returns the row anyway, matching on the O before the apostrophe.",
      "feedback": "Tempting, because silent truncation is how a lot of string-handling bugs really do behave, and it would be the friendlier failure. SQL is stricter: the statement never parses, so no row is ever compared."
    }
  ]
}
\`\`\`

The fix is to send the statement and the values as two separate things. A \`?\` marks a slot, and the values ride alongside in a sequence:

\`\`\`python
cur.execute("SELECT id FROM users WHERE name = ?", (name,))
cur.execute("INSERT INTO users (name, email) VALUES (?, ?)", ("Ada", "ada@example.com"))
\`\`\`

The SQL text is now a constant. It does not change when \`name\` changes, so nothing a user types can alter the shape of the statement. The driver ships the values over separately and the database treats them as data, never as syntax. As a bonus, the database can cache the plan for a statement it has already seen.

Note the trailing comma in \`(name,)\`. Without it \`(name)\` is just a parenthesized string, and the driver reads each character as a separate parameter.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "what the driver sends",
    "f-string version",
    "parameterized version"
  ],
  "rows": [
    [
      "statement text",
      "WHERE name = 'O'Brien'",
      "WHERE name = ?"
    ],
    [
      "values",
      "(none, they are in the text)",
      "('O'Brien',)"
    ],
    [
      "result",
      "syntax error, or an injection",
      "one row, every time"
    ]
  ],
  "highlightCols": [
    "parameterized version"
  ],
  "caption": "Parameterizing does not escape the value, it moves the value out of the statement entirely."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "placeholder-is-not-interpolation",
  "prompt": "You switch to a placeholder but wrap it in quotes, writing the condition as WHERE name = '?' and passing the name as a parameter. What does that query match?",
  "options": [
    {
      "label": "The name you passed. The quotes only mark the slot as text.",
      "feedback": "Tempting, because quoting is exactly what you would do around a real value in hand-written SQL, and it looks like the same idea. Inside quotes the question mark stops being a placeholder and becomes an ordinary character."
    },
    {
      "label": "Only a row whose name is literally a question mark, and the driver rejects the extra parameter.",
      "correct": true,
      "feedback": "Right. A quoted question mark is just the one-character string. The placeholder is a slot in the statement rather than a piece of text you quote, so it goes in bare and the driver counts zero slots for your one value."
    },
    {
      "label": "Nothing, because a placeholder inside quotes is a syntax error.",
      "feedback": "Tempting, because plenty of SQL misuse really does raise, and a loud failure is what you would want here. Nothing is malformed though: a quoted question mark is a perfectly legal string literal, which is what makes the mistake so quiet."
    }
  ]
}
\`\`\`

One limit worth knowing: a placeholder can only stand in for a **value**, never for a table name, a column name, or a keyword like \`ASC\`. \`SELECT * FROM ?\` is not valid SQL. When an identifier really has to vary, check it against a fixed allowlist of names your own code owns, then interpolate that checked name.

### Writes are transactions

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "insert-without-commit",
  "prompt": "A script connects, runs an INSERT, prints 'saved', and exits. It never calls conn.commit(). You reopen the database and query the table. What do you find?",
  "options": [
    {
      "label": "No row. The insert was discarded when the connection closed without a commit.",
      "correct": true,
      "feedback": "Right. The driver opens a transaction for you on the first write and throws it away unless you commit. The script printed 'saved' and told you the truth about the statement running, not about it lasting."
    },
    {
      "label": "The row is there. commit only matters when several statements have to land together.",
      "feedback": "Tempting, because grouping really is one job of a transaction and it is the reason usually given for commit. Durability is the other job: until you commit there is nothing permanent to group."
    },
    {
      "label": "The row is there, because sqlite writes to a plain file rather than to a server.",
      "feedback": "Tempting, because a local file feels like it should behave the way open() and write() do. This is a full transactional engine even in a single file: the change lands in a journal first and only joins the database at commit time."
    }
  ],
  "reveal": "A missing commit is the classic first-database bug, and it is quiet: nothing raises, the script prints its success message, and the data is simply not there afterwards. Use the connection as a context manager and it commits on a clean exit and rolls back on an exception."
}
\`\`\`

Every write runs inside a transaction. Nothing is durable until you commit:

\`\`\`python
cur.execute("INSERT INTO users (name) VALUES (?)", ("Ada",))
conn.commit()      # without this, the row disappears when the connection closes
\`\`\`

Better, let the connection manage it for you. Used as a context manager it commits when the block exits cleanly and rolls back when an exception escapes:

\`\`\`python
with conn:
    cur.execute("INSERT INTO users (name) VALUES (?)", ("Ada",))
    cur.execute("INSERT INTO audit (action) VALUES (?)", ("created user",))
# both rows landed, or neither did
\`\`\`

For many rows, \`executemany\` runs one statement against a sequence of parameter tuples in a single transaction, which is far faster than a loop of \`execute\` calls.

### What runs where

\`sqlite3\` is stdlib in CPython, but it is not bundled into the Python build that powers this browser sandbox, so \`import sqlite3\` fails here. Open a terminal in the environment you set up in "Running Python & installing packages" and every snippet above runs as written, against a real file. The exercises below grade the skills that surround the connection, which is where the bugs actually live: building the statement and its parameters as two separate things, auditing query text that was built by formatting, and turning the driver's tuples into records the rest of your program can read.

**Interview nuance:** "why parameterize?" has a weak answer and a strong one. The weak answer is "to stop SQL injection". The strong answer is that a parameterized statement and its values are sent to the database as two different things, so user input is never parsed as syntax. Injection is what that prevents; escaping is a different and worse strategy that tries to neutralize dangerous characters in text you have already merged. Say the second one, then add that placeholders bind values only, so a varying table or column name needs an allowlist instead.`,
    demoCode: `# sqlite3 is not bundled into this browser sandbox, so this demo shows the shape a driver
# receives: a fixed statement, and the values kept separate from it.
def build_lookup(name):
    return "SELECT id FROM users WHERE name = ?", (name,)


for candidate in ["Ada", "O'Brien", "'; DROP TABLE users; --"]:
    sql, params = build_lookup(candidate)
    print(sql, "|", params)`,
  },
  apply: {
    id: "py-l3-sqlite-parameterized-apply",
    executionMode: "single-file",
    prompt: `Warm-up: implement \`build_lookup(email, min_age)\`.

Return the dict \`{"sql": ..., "params": [...]}\` a driver would take, where \`sql\` is exactly
\`"SELECT id, name FROM users WHERE email = ? AND age >= ?"\` and \`params\` is a list holding the two
values in that order. The SQL text is a constant: it must not change when the arguments change.`,
    starterCode: `def build_lookup(email, min_age):
    # Return {"sql": <the parameterized statement>, "params": [email, min_age]}.
    pass`,
    hints: [
      "The statement never varies, so it is a plain string literal with two `?` placeholders in it.",
      "Nothing about `email` or `min_age` belongs in the SQL text. They both go in the params list.",
      'Return `{"sql": sql, "params": [email, min_age]}` with the values in the same order as the placeholders.',
    ],
    referenceSolution: `def build_lookup(email, min_age):
    sql = "SELECT id, name FROM users WHERE email = ? AND age >= ?"
    return {"sql": sql, "params": [email, min_age]}`,
    testCases: [
      {
        input: { email: "ada@example.com", min_age: 21 },
        expected: {
          sql: "SELECT id, name FROM users WHERE email = ? AND age >= ?",
          params: ["ada@example.com", 21],
        },
        description: "an ordinary lookup",
      },
      {
        input: { email: "o'brien@example.com", min_age: 0 },
        expected: {
          sql: "SELECT id, name FROM users WHERE email = ? AND age >= ?",
          params: ["o'brien@example.com", 0],
        },
        description: "an apostrophe leaves the SQL text untouched",
      },
      {
        input: { email: "'; DROP TABLE users; --", min_age: 18 },
        expected: {
          sql: "SELECT id, name FROM users WHERE email = ? AND age >= ?",
          params: ["'; DROP TABLE users; --", 18],
        },
        description: "an injection payload stays a plain value",
      },
      {
        input: { email: "sam@example.com", min_age: 65 },
        expected: {
          sql: "SELECT id, name FROM users WHERE email = ? AND age >= ?",
          params: ["sam@example.com", 65],
        },
        description: "the statement is identical for every input",
      },
    ],
  },
  practice: {
    id: "py-l3-sqlite-parameterized-practice",
    executionMode: "workspace",
    prompt: `Your team's data-access module ships with the next release, and the security review sent it
back. Implement the three helpers in \`dbkit/queries.py\`: \`build_insert\` (one \`?\` per column, values
in the params tuple), \`flag_unsafe\` (return the query source lines that build their SQL text by
formatting), and \`rows_to_dicts\` (zip the driver's tuples against the column names). The README has
the exact markers \`flag_unsafe\` looks for. Some tests are hidden.`,
    starterCode: "",
    hints: [
      '`", ".join("?" for _ in columns)` gives you one placeholder per column, comma separated.',
      "For `flag_unsafe`, keep a source when `any(marker in source for marker in markers)` is true, and keep the input order.",
      "`dict(zip(columns, row))` pairs each column name with the value at the same position.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "dbkit/queries.py",
      editableFilePaths: ["dbkit/queries.py"],
      visibleTestPaths: ["tests/test_queries.py"],
      hiddenTestPaths: ["tests/test_queries_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: DBKIT_README },
        { path: "dbkit/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "dbkit/queries.py",
          role: "editable",
          language: "python",
          content: DBKIT_QUERIES_STARTER,
          description: "Implement the three helpers here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_queries.py",
          role: "test",
          language: "python",
          content: DBKIT_TEST,
          description: "Visible query tests",
        },
        {
          path: "tests/test_queries_hidden.py",
          role: "test",
          language: "python",
          content: DBKIT_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_queries",
            "test_queries_hidden",
            "visible queries",
            "hidden queries"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "dbkit/queries.py",
          role: "editable",
          language: "python",
          content: DBKIT_QUERIES_REFERENCE,
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "ranges-vs-lockfile",
  "prompt": "Your pyproject.toml declares dependencies = ['httpx>=0.27']. You committed pyproject.toml but not uv.lock. Six months later a teammate clones the repo and installs. Do they get the same httpx version you have?",
  "options": [
    {
      "label": "Yes. The version is written right there in pyproject.toml.",
      "feedback": "Tempting, because a version really is written down and it certainly looks like a pin. It is a range: >=0.27 happily accepts 0.27, 0.31, and every release after that."
    },
    {
      "label": "No. >=0.27 is a range, so they get whatever the resolver happens to pick that day.",
      "correct": true,
      "feedback": "Right. pyproject declares intent, uv.lock records the one exact resolution that satisfied it. Commit both and nobody on the team has to say 'works on my machine' again."
    },
    {
      "label": "Only if they run uv sync instead of uv add.",
      "feedback": "Close, and uv sync really is the reproducible command: it installs precisely what the lockfile pins. With no uv.lock in the repo there is nothing to reproduce, so it has to resolve the range from scratch anyway."
    }
  ]
}
\`\`\`

The mental model is two tiers. \`pyproject.toml\` declares intent as version ranges. \`uv.lock\` records the one exact resolution that satisfied those ranges. Commit both files; never commit \`.venv\`. That split is what makes builds reproducible: your teammate runs \`uv sync\` and gets your exact versions, not "whatever \`pip\` resolved today."

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "what-belongs-in-git",
  "prompt": "You are setting up the repo for this project. Sort each item by whether it goes into version control.",
  "buckets": ["Commit it", "Never commit it"],
  "items": [
    {
      "label": "pyproject.toml",
      "bucket": "Commit it",
      "feedback": "The declaration of what the project is and what it needs. Nothing else can be rebuilt without it."
    },
    {
      "label": "uv.lock",
      "bucket": "Commit it",
      "feedback": "The file that makes two installs identical. Leaving it out is the most common reason a build passes locally and fails in CI weeks later."
    },
    {
      "label": ".venv/",
      "bucket": "Never commit it",
      "feedback": "It holds compiled binaries built for one machine and one Python version, and it is large. Anyone can regenerate it with uv sync in seconds."
    },
    {
      "label": "the todo/ package source",
      "bucket": "Commit it",
      "feedback": "Your actual code. This is the part no tool can regenerate."
    },
    {
      "label": "a .env file holding an API key",
      "bucket": "Never commit it",
      "feedback": "Secrets have no business in version control, and git history keeps them long after you delete the file. Commit a .env.example that names the keys and leaves the values blank."
    },
    {
      "label": "__pycache__/",
      "bucket": "Never commit it",
      "feedback": "Generated bytecode. It is derived from your source, it churns on every run, and it is specific to one interpreter version."
    }
  ],
  "reveal": "One rule sorts all six: commit what a human wrote or a resolver decided, never commit what a machine can rebuild from those. That is also why uv.lock counts as a decision, not as build output."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "truthiness-not-equality",
  "prompt": "Task flags come from a CSV importer, so some arrive as the string 'false' instead of the boolean False. summary counts with: sum(1 for task in tasks if task['done']). What does a task carrying done='false' count as?",
  "options": [
    {
      "label": "Pending, since the flag says false.",
      "feedback": "Tempting, because the value plainly says false and that is exactly what whoever produced the CSV meant by it. The if tests truthiness, and any non-empty string is truthy."
    },
    {
      "label": "Done, because a non-empty string is truthy.",
      "correct": true,
      "feedback": "Right. Nothing raises and the totals still add up, so the report is quietly wrong. When a flag might not be a real boolean, compare with 'is True' rather than relying on truthiness."
    },
    {
      "label": "It raises TypeError, because a string is not a boolean.",
      "feedback": "That is what the sum(task['done'] for ...) idiom would do, since adding a string to a running int really does raise. The if version never raises. It only ever asks whether the value is truthy."
    }
  ]
}
\`\`\`

\`if task["done"]\` tests truthiness, not "is this the boolean \`True\`." A flag of \`0\` or \`""\` is falsy, but a flag of \`"false"\` (a non-empty string) is truthy and counts as done. If your data might carry non-bool flags, be explicit: \`if task["done"] is True\`. Silent truthiness bugs like this survive tests that only use clean \`True\`/\`False\` fixtures.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bool-is-an-int-subclass",
  "prompt": "You replace sum(1 for task in tasks if task['done']) with the shorter sum(task['done'] for task in tasks). On clean boolean data, what does the shorter version return?",
  "options": [
    {
      "label": "TypeError, because you cannot add booleans together.",
      "feedback": "Tempting, because booleans feel like a different kind of thing from numbers, and plenty of languages keep them separate. In Python bool is a subclass of int: True is 1, False is 0, and they add up fine."
    },
    {
      "label": "The same count, because bool is a subclass of int and True adds as 1.",
      "correct": true,
      "feedback": "Right. It is a tidy one-pass idiom, but it is more fragile than the version it replaced: a flag of 2 silently overcounts, and a string flag raises instead of counting."
    },
    {
      "label": "The right count, but only because sum() special-cases booleans.",
      "feedback": "Close on the result and wrong on the reason, which is the part worth fixing. sum() does nothing special here. It simply adds, and True genuinely is the integer 1 all the way down."
    }
  ],
  "reveal": "Both idioms are one pass and O(n), and both read fine. The difference only appears on dirty data: the if version silently miscounts a string flag while the sum version raises on it. Neither is safe until you know the type of what you are counting."
}
\`\`\`

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

// ───────────────────────────────────────────────────────────────────────────
// Optional data track. numpy and pandas are NOT bundled into the browser Pyodide
// build this course runs on (verified: the worker never calls `loadPackage`, and
// `python_stdlib.zip` carries neither), so both lessons teach the real library in
// prose and grade a pure-Python model of the same mechanic.
// ───────────────────────────────────────────────────────────────────────────

const VECTOR_README = `# Build the array model

The analytics job dropped every fractional reading last quarter and nobody could say why until
somebody printed the dtype. Build the model that explains it. Implement \`Vector\` in
\`nparray/vector.py\`, a minimal fixed-dtype array.

**\`__init__(self, values, dtype=None)\`**

- When \`dtype\` is \`None\`, infer it: \`"float64"\` if any value is a \`float\`, otherwise \`"int64"\`.
- Store it on \`self.dtype\`, then cast **every** value to that dtype into \`self.values\`.

\`\`\`python
Vector([1, 2, 3]).dtype        # "int64",   values [1, 2, 3]
Vector([1, 2, 3.5]).dtype      # "float64", values [1.0, 2.0, 3.5]
Vector([1.5, 2.9], dtype="int64").values   # [1, 2], the fraction is gone
\`\`\`

**\`_combine(self, other, op)\`** does the elementwise work for both operators:

- If \`other\` is a \`Vector\`, the lengths must match. Raise \`ValueError\` when they do not, otherwise
  apply \`op\` pairwise.
- Otherwise \`other\` is a scalar: broadcast it across every element.
- Either way, return a **new** \`Vector\`. Never mutate \`self\`.

**\`sum(self)\`** returns the total of the values (\`0\` for an empty vector).

\`__add__\`, \`__mul__\`, \`__eq__\` and \`__repr__\` are already written for you. Some tests are hidden.
`

const VECTOR_STARTER = String.raw`class Vector:
    """A minimal fixed-dtype array: one dtype for the whole block of values."""

    def __init__(self, values, dtype=None):
        # TODO: infer the dtype when it is None, then cast every value to it.
        self.dtype = "int64"
        self.values = []

    def _combine(self, other, op):
        # TODO: elementwise when other is a Vector (raise ValueError on a length
        # mismatch), broadcast when it is a scalar. Return a new Vector.
        return Vector([])

    def sum(self):
        # TODO: return the total of self.values.
        return 0

    # ---- already written for you ----

    def __add__(self, other):
        return self._combine(other, lambda a, b: a + b)

    def __mul__(self, other):
        return self._combine(other, lambda a, b: a * b)

    def __eq__(self, other):
        return isinstance(other, Vector) and self.dtype == other.dtype and self.values == other.values

    def __repr__(self):
        return "Vector(" + repr(self.values) + ", dtype=" + repr(self.dtype) + ")"
`

const VECTOR_REFERENCE = String.raw`class Vector:
    """A minimal fixed-dtype array: one dtype for the whole block of values."""

    def __init__(self, values, dtype=None):
        if dtype is None:
            dtype = "float64" if any(isinstance(value, float) for value in values) else "int64"
        cast = float if dtype == "float64" else int
        self.dtype = dtype
        self.values = [cast(value) for value in values]

    def _combine(self, other, op):
        if isinstance(other, Vector):
            if len(other.values) != len(self.values):
                raise ValueError("operands could not be broadcast together")
            return Vector([op(a, b) for a, b in zip(self.values, other.values)])
        return Vector([op(value, other) for value in self.values])

    def sum(self):
        total = 0
        for value in self.values:
            total = total + value
        return total

    # ---- already written for you ----

    def __add__(self, other):
        return self._combine(other, lambda a, b: a + b)

    def __mul__(self, other):
        return self._combine(other, lambda a, b: a * b)

    def __eq__(self, other):
        return isinstance(other, Vector) and self.dtype == other.dtype and self.values == other.values

    def __repr__(self):
        return "Vector(" + repr(self.values) + ", dtype=" + repr(self.dtype) + ")"
`

const VECTOR_TEST = String.raw`from nparray.vector import Vector


def run_tests(record):
    def infers_int64_for_whole_numbers():
        vector = Vector([1, 2, 3])
        assert vector.dtype == "int64", f"got {vector.dtype!r}"
        assert vector.values == [1, 2, 3], f"got {vector.values!r}"

    def one_float_promotes_the_whole_array():
        vector = Vector([1, 2, 3.5])
        assert vector.dtype == "float64", f"got {vector.dtype!r}"
        assert vector.values == [1.0, 2.0, 3.5], f"got {vector.values!r}"

    def broadcasts_a_scalar():
        result = Vector([1, 2, 3]) * 2
        assert result.values == [2, 4, 6], f"got {result!r}"
        assert result.dtype == "int64", f"got {result.dtype!r}"

    def adds_elementwise():
        result = Vector([1, 2, 3]) + Vector([10, 20, 30])
        assert result.values == [11, 22, 33], f"got {result!r}"

    record("infers int64 for whole numbers", infers_int64_for_whole_numbers)
    record("one float promotes the whole array", one_float_promotes_the_whole_array)
    record("broadcasts a scalar", broadcasts_a_scalar)
    record("adds elementwise", adds_elementwise)
`

const VECTOR_TEST_HIDDEN = String.raw`from nparray.vector import Vector


def run_tests(record):
    def an_explicit_int_dtype_truncates():
        vector = Vector([1.5, 2.9], dtype="int64")
        assert vector.values == [1, 2], f"got {vector.values!r}"

    def mismatched_lengths_raise():
        try:
            Vector([1, 2, 3]) + Vector([1, 2])
            raised = False
        except ValueError:
            raised = True
        assert raised, "adding different lengths should raise ValueError"

    def sums_the_values():
        assert Vector([1, 2, 3]).sum() == 6
        assert Vector([]).sum() == 0

    def a_float_scalar_promotes_the_result():
        result = Vector([1, 2, 3]) * 0.5
        assert result.dtype == "float64", f"got {result.dtype!r}"
        assert result.values == [0.5, 1.0, 1.5], f"got {result.values!r}"

    record("an explicit int dtype truncates", an_explicit_int_dtype_truncates)
    record("mismatched lengths raise ValueError", mismatched_lengths_raise)
    record("sums the values", sums_the_values)
    record("a float scalar promotes the result", a_float_scalar_promotes_the_result)
`

const numpyLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-numpy-arrays",
  title: "numpy: arrays, dtypes & whole-array operations",
  summary: "Why a fixed-dtype array beats a list of ints, and what that promise costs you.",
  estimatedMinutes: 18,
  difficulty: "medium",
  skills: ["data-structures", "performance", "type-coercion", "iteration"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Optional, and for whom

This module and the pandas lesson after it are a detour, not a step on the main path. If you are heading for backend, platform or general software work, the Level 3 spine you already finished is what interviews will ask about. If you are heading for data engineering, analytics or anything with a pipeline in the job description, these two are the vocabulary every one of those interviews assumes you have.

## A list of ints is not an array of ints

A Python list is a block of **pointers**. Each element points off to a full Python object somewhere else in memory, carrying a type pointer and a reference count around with it. That is why a list can hold an \`int\`, a \`str\` and a \`dict\` at once: every slot is the same size because every slot is just an address.

A numpy array is the opposite trade. It is one contiguous block of raw values, all the same type and all the same width. That is why it has a **dtype**, singular, for the entire array:

\`\`\`python
import numpy as np

a = np.array([1, 2, 3])       # dtype int64, shape (3,)
b = np.array([1, 2, 3.0])     # dtype float64: one float promotes them all
np.zeros(5)                   # five float64 zeros
np.arange(0, 10, 2)           # array([0, 2, 4, 6, 8])
\`\`\`

Everything good and everything annoying about numpy follows from that one decision.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "array-holds-one-dtype",
  "prompt": "You have arr = np.array([1, 2, 3]), so its dtype is int64. You then run arr[0] = 'hello'. What happens?",
  "options": [
    {
      "label": "The array switches to a mixed dtype and stores the string alongside the numbers.",
      "feedback": "Tempting, because that is exactly what a Python list does: a list slot holds a pointer, so any object at all fits in it. An array is one block of fixed-width int64 slots, and a string has nowhere to go in one."
    },
    {
      "label": "It raises, because 'hello' cannot be converted to int64.",
      "correct": true,
      "feedback": "Right. The dtype is a promise about every slot in the block, and numpy enforces it on assignment rather than quietly widening the array. That promise is exactly what makes whole-array operations fast."
    },
    {
      "label": "It stores the length of the string, since numpy converts whatever it is handed.",
      "feedback": "Tempting, because numpy really does convert a lot of things on the way in, so it seems fair to expect it to find some numeric reading. It converts only where a conversion is actually defined, and arbitrary text has no int64 reading."
    }
  ]
}
\`\`\`

## Vectorized operations

Because the whole array shares a dtype, one operation can apply to all of it at once. No loop in your code, and no loop in Python at all:

\`\`\`python
a * 2         # array([2, 4, 6])   scalar broadcast over every element
a + a         # array([2, 4, 6])   elementwise
a.sum()       # 6
a.mean()      # 2.0
a[a > 1]      # array([2, 3])      a boolean mask selects
\`\`\`

That last line is the pattern the pandas lesson leans on: \`a > 1\` builds an array of booleans, and indexing with it keeps the positions that are \`True\`.

## Why the vectorized sum wins

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "why-vectorized-sum-wins",
  "prompt": "Summing a million numbers with arr.sum() is far faster than a Python for loop over the same values in a list. What is the main reason?",
  "options": [
    {
      "label": "numpy spreads the work across every CPU core.",
      "feedback": "Tempting, because parallelism is the usual story behind a big speedup, and numpy really does hand some heavy operations to threaded libraries. A plain sum runs on one core: the win is in what each step costs, not in how many run at once."
    },
    {
      "label": "The values sit in one contiguous typed block, so the loop runs once in C with no Python object per element.",
      "correct": true,
      "feedback": "Right. A list holds pointers to individual int objects, so a Python loop dereferences, unboxes and dispatches for every single element. An array is raw bytes of known width, so the loop is a tight C scan the CPU can prefetch through."
    },
    {
      "label": "The total is precomputed when the array is built and simply read back.",
      "feedback": "Tempting, because caching a result is a real optimisation and it would neatly explain a large speedup. Nothing is precomputed here: every call genuinely visits every element, just far more cheaply per element."
    }
  ]
}
\`\`\`

Count the work for a million values. The Python loop dereferences a pointer, unboxes an \`int\` object, dispatches \`__add__\`, allocates a result object, and does it again, a million times. \`arr.sum()\` walks a million adjacent 8-byte integers in a single compiled loop with none of that per-element overhead. The usual result is one to two orders of magnitude, and it holds for \`* 2\`, \`+\`, comparisons and every other whole-array operation.

The rule this gives you: **if you are writing a Python \`for\` loop over a numpy array, you have probably lost the reason you reached for numpy.**

## Broadcasting

A scalar stretches to fit an array, which is why \`a * 2\` works at all. The general rule compares shapes from the right: two dimensions are compatible when they are equal, or when one of them is \`1\`, and a length-1 dimension is stretched to match.

\`\`\`python
np.array([[1], [2], [3]]) + np.array([[10, 20, 30, 40]])
# shape (3, 1) + shape (1, 4) -> shape (3, 4)
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "broadcasting-row-and-column",
  "prompt": "You add an array of shape (3, 1) to an array of shape (1, 4). What comes back?",
  "options": [
    {
      "label": "An error, because the two shapes are not the same.",
      "feedback": "Tempting, because mismatched shapes often do raise, and shape (3,) plus shape (2,) really is an error. The rule compares shapes from the right and lets a dimension of length 1 stretch, so these two are compatible."
    },
    {
      "label": "An array of shape (3, 4), with each side stretched along its length-1 dimension.",
      "correct": true,
      "feedback": "Right. The column repeats across 4 columns, the row repeats down 3 rows, and every pair is added. This is how you build a grid, an outer product or a pairwise distance matrix without writing a single loop."
    },
    {
      "label": "An array of shape (3, 1), because the left operand decides the result shape.",
      "feedback": "Tempting, because plenty of operations are left-biased and really do keep the first operand's shape. Broadcasting is symmetric: neither side wins, and both get stretched out to the combined shape."
    }
  ]
}
\`\`\`

## The cost of a fixed dtype

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "int-array-truncates-a-float",
  "prompt": "arr = np.array([1, 2, 3]) has dtype int64. You run arr[0] = 3.7 and then print arr. What is the first element?",
  "options": [
    {
      "label": "3.7, because assigning into a slot simply replaces what was there.",
      "feedback": "Tempting, because that is precisely how assigning into a Python list behaves, and nothing in the line hints at a conversion. The slot is a fixed-width int64, so the value has to be converted before it can be stored at all."
    },
    {
      "label": "3, because the float is truncated to fit the int64 dtype.",
      "correct": true,
      "feedback": "Right, and nothing warns you. This is the quiet twin of the string case: a value that cannot be converted raises, but a value that can is cast on the way in and the fractional part is simply gone."
    },
    {
      "label": "3.7, and the whole array is promoted to float64 to hold it.",
      "feedback": "Tempting, because promotion is real: building an array from a mix of ints and one float genuinely does give you float64. Promotion happens when the array is CREATED, not when you assign into one that already exists."
    }
  ],
  "reveal": "Every dtype surprise in a data pipeline is one of these two. An impossible conversion raises and you find it in seconds. A possible one is applied silently, and you find it a quarter later when the totals are slightly wrong. Print .dtype the moment a number looks off."
}
\`\`\`

The same edge shows up in width. \`np.array([100, 100], dtype=np.int8) + 100\` wraps around instead of growing, because an \`int8\` slot cannot hold 200. Python's own \`int\` has no such limit, so this is a habit you have to acquire rather than one you already have.

## What runs where

\`numpy\` is not bundled into the Python build that powers this browser sandbox, so \`import numpy\` fails here. In a real environment it is one \`pip install numpy\` (or \`uv add numpy\`) away, using the setup from "Running Python & installing packages", and every snippet above runs as written. The exercises below build the same mechanics by hand over ordinary lists, so the model you take to the terminal is the right one.

**Interview nuance:** "why is numpy faster than a list?" is a memory-layout question wearing a library costume. The answer is not "it is written in C". Plenty of slow things are written in C. The answer is that the data is one contiguous typed block, so a single compiled loop touches adjacent bytes with no per-element Python object to unbox and no dynamic dispatch per step. Then name the price: the dtype is fixed, so an incompatible value raises and a convertible one is silently cast.`,
    demoCode: `# numpy is not bundled into this browser sandbox, so this demo builds the same
# mechanic by hand: one operation applied across a whole sequence.
def scale(values, factor):
    return [value * factor for value in values]


readings = [1, 2, 3, 4]
print("scaled:", scale(readings, 2))
print("mask:  ", [value for value in readings if value > 2])
print("sum:   ", sum(readings))

# The fixed-dtype cost, by hand: storing a float in an int column truncates it.
print("int column stores 3.7 as", int(3.7))`,
  },
  apply: {
    id: "py-l3-numpy-arrays-apply",
    executionMode: "single-file",
    prompt: `Warm-up: implement \`broadcast_add(values, addend)\`, the pure-Python version of what \`arr + other\`
does in numpy.

When \`addend\` is a list, add the two sequences elementwise. When it is a single number, broadcast it
across every element. Return a new list either way: \`([1, 2, 3], 10)\` gives \`[11, 12, 13]\`, and
\`([1, 2, 3], [10, 20, 30])\` gives \`[11, 22, 33]\`.`,
    starterCode: `def broadcast_add(values, addend):
    # A list addend adds elementwise; a number broadcasts across every element.
    pass`,
    hints: [
      "`isinstance(addend, list)` tells the two cases apart.",
      "For the elementwise case, `zip(values, addend)` pairs them up position by position.",
      "For the scalar case, one comprehension over `values` is enough: `[value + addend for value in values]`.",
    ],
    referenceSolution: `def broadcast_add(values, addend):
    if isinstance(addend, list):
        return [value + other for value, other in zip(values, addend)]
    return [value + addend for value in values]`,
    testCases: [
      {
        input: { values: [1, 2, 3], addend: 10 },
        expected: [11, 12, 13],
        description: "a scalar broadcasts",
      },
      {
        input: { values: [1, 2, 3], addend: [10, 20, 30] },
        expected: [11, 22, 33],
        description: "two sequences add elementwise",
      },
      { input: { values: [], addend: 5 }, expected: [], description: "an empty array stays empty" },
      {
        input: { values: [7, -7, 0], addend: 7 },
        expected: [14, 0, 7],
        description: "negatives and zero broadcast the same way",
      },
    ],
  },
  practice: {
    id: "py-l3-numpy-arrays-practice",
    executionMode: "workspace",
    prompt: `Your team's analytics job dropped every fractional reading last quarter, and nobody could say
why until somebody printed the dtype. Build the model that explains it: implement \`Vector\` in
\`nparray/vector.py\` so it infers a single dtype and casts every value to it, combines elementwise
with another \`Vector\` (raising \`ValueError\` on a length mismatch), broadcasts a scalar, and sums its
values. The operators are already written for you. Some tests are hidden.`,
    starterCode: "",
    hints: [
      '`any(isinstance(value, float) for value in values)` decides between `"float64"` and `"int64"`.',
      "Pick the cast function once (`float` or `int`), then apply it in one comprehension over `values`.",
      "In `_combine`, `isinstance(other, Vector)` separates the elementwise case from the broadcast case. Both return a new `Vector`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "nparray/vector.py",
      editableFilePaths: ["nparray/vector.py"],
      visibleTestPaths: ["tests/test_vector.py"],
      hiddenTestPaths: ["tests/test_vector_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: VECTOR_README },
        { path: "nparray/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "nparray/vector.py",
          role: "editable",
          language: "python",
          content: VECTOR_STARTER,
          description: "Implement Vector here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_vector.py",
          role: "test",
          language: "python",
          content: VECTOR_TEST,
          description: "Visible vector tests",
        },
        {
          path: "tests/test_vector_hidden.py",
          role: "test",
          language: "python",
          content: VECTOR_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner(
            "test_vector",
            "test_vector_hidden",
            "visible vector",
            "hidden vector"
          ),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "nparray/vector.py",
          role: "editable",
          language: "python",
          content: VECTOR_REFERENCE,
        },
      ],
    },
  },
}

const TABLE_README = `# Total the weekly sales export

The export arrives as CSV **text** in an API response, not as a file on disk, and two cells came
through blank. Implement the three helpers in \`frame/table.py\`. \`frame/sample.py\` (read-only) holds
the export as \`SALES_CSV\`.

**\`read_csv(text)\`** returns one dict per data row, keyed by the header names. Type each cell:

- a blank cell (or one that is only whitespace) becomes \`None\`, the stand-in for pandas' \`NaN\`
- an integer-looking cell, with an optional leading \`-\`, becomes an \`int\`
- anything else stays a trimmed string

**\`filter_rows(rows, column, minimum)\`** keeps the rows whose value in \`column\` is not \`None\` and is
at least \`minimum\`. A missing value never passes a comparison, which is how a real boolean mask
treats \`NaN\`.

**\`group_sum(rows, key_column, value_column)\`** returns a dict of totals per key:

- a row whose **key** is \`None\` is dropped entirely, exactly as \`groupby\` drops \`NaN\` keys
- a row whose **value** is \`None\` still counts toward its group, contributing \`0\`

Some tests are hidden.
`

const TABLE_SAMPLE = String.raw`SALES_CSV = """region,rep,amount
west,Ada,100
east,Sam,250
west,Mo,50
,Kim,75
east,Lee,
north,Rio,-25
"""
`

const TABLE_STARTER = String.raw`import csv
import io


def read_csv(text):
    """Parse CSV text into a list of typed row dicts (see README.md)."""
    # TODO: csv.DictReader(io.StringIO(text.strip())) gives you raw string cells.
    # Blank -> None, integer-looking -> int, otherwise the trimmed string.
    return []


def filter_rows(rows, column, minimum):
    """Keep the rows whose column value is present and at least minimum."""
    # TODO: a None value never passes the comparison.
    return []


def group_sum(rows, key_column, value_column):
    """Total value_column per key_column (see README.md)."""
    # TODO: drop a row whose key is None; count a None value as 0.
    return {}
`

const TABLE_REFERENCE = String.raw`import csv
import io


def read_csv(text):
    reader = csv.DictReader(io.StringIO(text.strip()))
    rows = []
    for raw in reader:
        row = {}
        for column, cell in raw.items():
            value = (cell or "").strip()
            if not value:
                row[column] = None
            elif value.lstrip("-").isdigit():
                row[column] = int(value)
            else:
                row[column] = value
        rows.append(row)
    return rows


def filter_rows(rows, column, minimum):
    return [row for row in rows if row[column] is not None and row[column] >= minimum]


def group_sum(rows, key_column, value_column):
    totals = {}
    for row in rows:
        key = row[key_column]
        if key is None:
            continue
        value = row[value_column]
        if value is None:
            value = 0
        totals[key] = totals.get(key, 0) + value
    return totals
`

const TABLE_TEST = String.raw`from frame.sample import SALES_CSV
from frame.table import filter_rows, group_sum, read_csv


def run_tests(record):
    def types_each_cell():
        rows = read_csv(SALES_CSV)
        assert len(rows) == 6, f"expected 6 rows, got {len(rows)}"
        assert rows[0] == {"region": "west", "rep": "Ada", "amount": 100}, f"got {rows[0]!r}"

    def a_blank_cell_becomes_none():
        rows = read_csv(SALES_CSV)
        assert rows[3]["region"] is None, f"got {rows[3]!r}"
        assert rows[4]["amount"] is None, f"got {rows[4]!r}"

    def filters_on_a_minimum():
        rows = read_csv(SALES_CSV)
        kept = [row["rep"] for row in filter_rows(rows, "amount", 100)]
        assert kept == ["Ada", "Sam"], f"got {kept!r}"

    def totals_by_group():
        rows = read_csv(SALES_CSV)
        totals = group_sum(rows, "region", "amount")
        assert totals == {"west": 150, "east": 250, "north": -25}, f"got {totals!r}"

    record("types each cell", types_each_cell)
    record("a blank cell becomes None", a_blank_cell_becomes_none)
    record("filters on a minimum", filters_on_a_minimum)
    record("totals by group", totals_by_group)
`

const TABLE_TEST_HIDDEN = String.raw`from frame.table import filter_rows, group_sum, read_csv


def run_tests(record):
    def a_missing_key_drops_the_row():
        rows = [{"region": "west", "amount": 10}, {"region": None, "amount": 999}]
        result = group_sum(rows, "region", "amount")
        assert result == {"west": 10}, f"a None key must not become a bucket, got {result!r}"

    def a_missing_value_counts_as_zero():
        rows = [{"region": "east", "amount": None}, {"region": "east", "amount": 5}]
        result = group_sum(rows, "region", "amount")
        assert result == {"east": 5}, f"a None value must not break the sum, got {result!r}"

    def a_minimum_nothing_meets_returns_empty():
        rows = [{"amount": 1}, {"amount": None}]
        assert filter_rows(rows, "amount", 100) == []

    def parses_a_negative_integer():
        rows = read_csv("region,amount\nsouth,-25\n")
        assert rows == [{"region": "south", "amount": -25}], f"got {rows!r}"

    record("a missing key drops the row", a_missing_key_drops_the_row)
    record("a missing value counts as zero", a_missing_value_counts_as_zero)
    record("a minimum nothing meets returns empty", a_minimum_nothing_meets_returns_empty)
    record("parses a negative integer", parses_a_negative_integer)
`

const pandasLesson: PythonLevel["modules"][number]["lessons"][number] = {
  id: "py-l3-pandas-dataframes",
  title: "pandas: DataFrames, filtering & groupby",
  summary: "Load a CSV, select and filter rows, total by group, and survive missing values.",
  estimatedMinutes: 20,
  difficulty: "medium",
  skills: ["csv", "data-modeling", "filtering", "dicts"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## A DataFrame is a dict of columns

Stop picturing a spreadsheet and picture a dict. A \`DataFrame\` maps column names to columns, and each column is a \`Series\`: a numpy array of one dtype, plus a labelled **index** that lines its values up with every other column. Everything from the numpy lesson still applies, one column at a time. The index is the piece that has no list equivalent, and it is what makes rows line up after a filter, a join or a sort.

## Loading from a string buffer

\`read_csv\` takes a path, but it also takes any file-like object. \`StringIO\` makes a string look like a file, which is how you load an API response, or test a parser, without a fixture on disk:

\`\`\`python
import pandas as pd
from io import StringIO

text = """region,rep,amount
west,Ada,100
east,Sam,250
west,Mo,50
"""
df = pd.read_csv(StringIO(text))
df.dtypes      # region object, rep object, amount int64
df.head()      # the first rows
df.shape       # (3, 3)
\`\`\`

\`read_csv\` infers a dtype per column from the values it sees, which is convenient right up until a blank cell changes its mind.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "one-blank-cell-makes-the-column-float",
  "prompt": "A CSV column holds the values 1, 2 and 3, with one further cell left blank. What dtype does read_csv give that column?",
  "options": [
    {
      "label": "int64, since every value actually present is a whole number.",
      "feedback": "Tempting, because that is exactly the dtype the same column gets the moment you fill the blank in, and nothing about the data itself says float. The missing cell has to be represented too, and the marker pandas uses for a missing number is a float."
    },
    {
      "label": "float64, because the blank becomes NaN and NaN is a float.",
      "correct": true,
      "feedback": "Right, so ids print as 1.0 and 2.0, and a join against a genuine int column silently matches nothing. Use the nullable Int64 dtype, or fill the blanks on the way in, when a column has to stay whole."
    },
    {
      "label": "object, since the column now mixes numbers with a missing marker.",
      "feedback": "Tempting, because object really is the fallback whenever a column holds mixed types, and a blank does feel like a different kind of thing. NaN lives inside float64 natively, so there is no need to fall back to object."
    }
  ]
}
\`\`\`

## Selecting

\`\`\`python
df["amount"]                 # a Series (one column)
df[["region", "amount"]]     # a DataFrame (a list of columns, hence the double brackets)
df.loc[0, "amount"]          # by label: row index 0, column "amount"
df.iloc[0, 2]                # by position: first row, third column
\`\`\`

The double brackets trip everyone once. \`df["a"]\` asks for one column and gets a \`Series\`; \`df[["a"]]\` passes a *list* of names and gets a one-column \`DataFrame\` back.

## Filtering with a boolean mask

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "mask-is-a-series-not-a-frame",
  "prompt": "You type df['amount'] > 100 on its own line and print the result. What do you get?",
  "options": [
    {
      "label": "The rows whose amount is over 100.",
      "feedback": "Tempting, because that is what you were reaching for and it is exactly one bracket pair away from being true. The comparison only answers the question row by row; handing those answers back to the frame is the separate step that selects."
    },
    {
      "label": "A Series of True and False, one per row, in the same index order.",
      "correct": true,
      "feedback": "Right, and that separation is the whole design. The mask is an ordinary value you can name, invert with a tilde, or combine with the and and or operators, and df[mask] is the step that actually selects rows."
    },
    {
      "label": "A single True or False, for whether any amount is over 100.",
      "feedback": "Tempting, because a plain Python comparison collapses to one answer, and calling bool() on a mask really does raise a complaint about ambiguity. The comparison here is elementwise, so it produces one answer per row rather than one for the frame."
    }
  ]
}
\`\`\`

Compare a column, then index the frame with the result:

\`\`\`python
big = df["amount"] > 100          # a Series of booleans
df[big]                            # the rows where it is True
df[(df["amount"] > 100) & (df["region"] == "east")]
\`\`\`

Two rules for combining masks: use \`&\` and \`|\` rather than \`and\` and \`or\` (those ask for one truth value and raise on a Series), and parenthesize each comparison, because \`&\` binds tighter than \`>\`.

## Reading with a mask, writing with \`.loc\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "chained-assignment-writes-to-a-copy",
  "prompt": "You run this to zero out the big values: df[df['amount'] > 100]['amount'] = 0. It does not raise. You print df afterwards. What changed?",
  "options": [
    {
      "label": "Every amount over 100 is now 0.",
      "feedback": "Tempting, because the line reads left to right exactly like that, and the same shape of statement on a nested dict really would work. The first bracket pair produced a new object, so the assignment landed on something that was discarded a moment later."
    },
    {
      "label": "Nothing. The first selection returned a copy, and the assignment wrote into the copy.",
      "correct": true,
      "feedback": "Right, and this is the classic chained-assignment trap. Select and assign in one step instead: df.loc[df['amount'] > 100, 'amount'] = 0 hands both the row mask and the column to a single indexer."
    },
    {
      "label": "Nothing, and the SettingWithCopyWarning it raises stops the script.",
      "feedback": "Half right, since that warning genuinely is emitted in many versions and it is pandas trying to tell you. A warning is not an exception though: the script carries on as if the write worked, which is why this bug reaches production."
    }
  ]
}
\`\`\`

Reading through two selections is fine. **Writing** through two selections is not, because the first one may hand you a copy. Do the whole thing in one indexer:

\`\`\`python
df.loc[df["amount"] > 100, "amount"] = 0     # one step, writes into df
\`\`\`

## groupby: split, apply, combine

\`\`\`python
df.groupby("region")["amount"].sum()
# region
# east    250
# west    150
\`\`\`

\`groupby\` splits the rows by key, applies an aggregation to each group, and combines the answers into a new indexed result. In plain Python this is the \`defaultdict\` accumulate loop you already know; \`groupby\` is that loop with a name and a fast implementation. \`.agg({"amount": ["sum", "mean"], "rep": "count"})\` runs several aggregations at once.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "groupby-drops-nan-keys",
  "prompt": "Your sales frame has 6 rows. One row has a blank region, which read_csv turned into NaN. You run df.groupby('region')['amount'].sum(). How much of the data reaches the totals?",
  "options": [
    {
      "label": "All 6 rows. The blank becomes its own group, labelled NaN.",
      "feedback": "Tempting, because that is precisely what you get by passing dropna=False, and grouping does feel like it ought to partition everything it was given. The default is the opposite: rows with a missing key are dropped before any grouping happens."
    },
    {
      "label": "5 rows. The row with the missing region is dropped, so its amount lands in no total.",
      "correct": true,
      "feedback": "Right, and nothing tells you. The totals are quietly short by that row, which is why a groupby result is worth checking against the frame's own total before anybody reads it as a number."
    },
    {
      "label": "All 6 rows, with the blank one folded into the first group.",
      "feedback": "Tempting, because some tools really do bucket unknowns into a default group, and at least that would preserve the overall total. pandas never guesses a key: it either gives NaN a group of its own or drops it, and dropping is the default."
    }
  ],
  "reveal": "Both halves of that default are worth remembering. groupby drops rows with a missing KEY, while the aggregations skip a missing VALUE, so sum() ignores NaN rather than producing NaN. Missing data leaves through two different doors and neither one announces itself."
}
\`\`\`

## Missing values

A blank cell becomes \`NaN\`. \`NaN\` is a float, it never equals anything (not even itself), and it propagates through arithmetic. So \`df[df["amount"] == np.nan]\` matches nothing at all, no matter how many blanks there are:

\`\`\`python
df["amount"].isna()          # the correct test, a boolean mask
df["amount"].fillna(0)       # substitute a value
df.dropna(subset=["amount"]) # drop the rows that are missing it
\`\`\`

## What runs where

\`pandas\` is not bundled into the Python build behind this browser sandbox, so \`import pandas\` fails here (and it would pull \`numpy\` in with it). In a real environment it is one \`pip install pandas\` (or \`uv add pandas\`) away, using the setup from "Running Python & installing packages". The exercises below build the same three mechanics over lists of dicts, missing values and all, so the model you take to the terminal already accounts for the parts that bite.

**Interview nuance:** for a data role, the question behind the question is almost always about missing data. Anyone can write \`groupby("region").sum()\`. The signal is knowing that a missing group key silently removes the row from the answer, that a missing value is skipped by the aggregation instead of poisoning it, and that one blank cell turns an integer column into \`float64\` and quietly breaks a join. Say what the default does, then say how you would check the total.`,
    demoCode: `# pandas is not bundled into this browser sandbox, so this demo builds the same three
# moves over plain dicts: load from a text buffer, mask, and total by group.
import csv
import io

text = """region,rep,amount
west,Ada,100
east,Sam,250
west,Mo,50
"""

rows = [
    {"region": r["region"], "rep": r["rep"], "amount": int(r["amount"])}
    for r in csv.DictReader(io.StringIO(text))
]
print("rows: ", rows)
print("mask: ", [row["amount"] > 100 for row in rows])
print("big:  ", [row["rep"] for row in rows if row["amount"] > 100])

totals = {}
for row in rows:
    totals[row["region"]] = totals.get(row["region"], 0) + row["amount"]
print("group:", totals)`,
  },
  apply: {
    id: "py-l3-pandas-dataframes-apply",
    executionMode: "single-file",
    prompt: `Warm-up: implement \`infer_dtype(cells)\`, the rule \`read_csv\` uses to pick a column's dtype.

\`cells\` is the list of raw text values for one column. Return \`"int64"\` when every cell is
integer-looking (digits with an optional leading \`-\`) and none is blank, \`"float64"\` when the
non-blank cells are all integer-looking but at least one cell is blank, and \`"object"\` otherwise.
Treat a whitespace-only cell as blank.`,
    starterCode: `def infer_dtype(cells):
    # "int64" when all integer-looking and nothing is blank, "float64" when a blank
    # forces NaN into an otherwise integer column, "object" for anything else.
    pass`,
    hints: [
      "Strip every cell first, then split them into the blank ones and the filled ones.",
      '`value.lstrip("-").isdigit()` is the integer-looking test, the same one `coerce` used.',
      'If any filled cell fails that test, return `"object"`. Otherwise a blank means `"float64"` and no blank means `"int64"`.',
    ],
    referenceSolution: `def infer_dtype(cells):
    values = [cell.strip() for cell in cells]
    filled = [value for value in values if value]
    if not all(value.lstrip("-").isdigit() for value in filled):
        return "object"
    if len(filled) < len(values):
        return "float64"
    return "int64"`,
    testCases: [
      {
        input: { cells: ["1", "2", "3"] },
        expected: "int64",
        description: "a clean integer column",
      },
      {
        input: { cells: ["1", "", "3"] },
        expected: "float64",
        description: "one blank cell forces float64",
      },
      {
        input: { cells: ["1", "x", "3"] },
        expected: "object",
        description: "any non-numeric text falls back to object",
      },
      {
        input: { cells: ["10", "-2", "  "] },
        expected: "float64",
        description: "negatives count as integer-looking, whitespace counts as blank",
      },
    ],
  },
  practice: {
    id: "py-l3-pandas-dataframes-practice",
    executionMode: "workspace",
    prompt: `The weekly sales export arrives as CSV text in an API response rather than a file on disk, and
two cells came through blank. Implement the three helpers in \`frame/table.py\`: \`read_csv\` (typed row
dicts, blanks becoming \`None\`), \`filter_rows\` (a boolean-mask filter that a missing value never
passes), and \`group_sum\` (totals per key, dropping rows whose key is missing and counting a missing
value as zero). The README spells out each rule. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "`csv.DictReader(io.StringIO(text.strip()))` yields one dict of raw strings per row, keyed by the header.",
      "Type each cell in order: blank first (`None`), then integer-looking (`int(value)`), then the trimmed string.",
      "In `group_sum`, `continue` past a row whose key is `None`, and accumulate with `totals.get(key, 0) + value`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "frame/table.py",
      editableFilePaths: ["frame/table.py"],
      visibleTestPaths: ["tests/test_table.py"],
      hiddenTestPaths: ["tests/test_table_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: TABLE_README },
        { path: "frame/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "frame/sample.py",
          role: "readonly",
          language: "python",
          content: TABLE_SAMPLE,
          description: "The weekly export, as CSV text (read-only)",
        },
        {
          path: "frame/table.py",
          role: "editable",
          language: "python",
          content: TABLE_STARTER,
          description: "Implement the three helpers here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_table.py",
          role: "test",
          language: "python",
          content: TABLE_TEST,
          description: "Visible table tests",
        },
        {
          path: "tests/test_table_hidden.py",
          role: "test",
          language: "python",
          content: TABLE_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner("test_table", "test_table_hidden", "visible table", "hidden table"),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "frame/table.py",
          role: "editable",
          language: "python",
          content: TABLE_REFERENCE,
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
      description:
        "Build a CLI, validate API data, query a database safely, and package a small project with pyproject/uv.",
      lessons: [cliLesson, restPydanticLesson, sqliteLesson, capstoneLesson],
    },
    {
      id: "py-l3-data-track",
      title: "Optional: the data track (numpy & pandas)",
      description:
        "An optional detour for data engineering and analytics roles. Skip it if you are heading for backend or platform work.",
      lessons: [numpyLesson, pandasLesson],
    },
  ],
}

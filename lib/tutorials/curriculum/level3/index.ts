/**
 * Level 3 — Patterns (workspace). The syntax real codebases run on — drilled across real files.
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
    # TODO: implement me — split lines, skip blanks/comments, split on the first
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
    markdown: `## Real code lives in more than one file

A program is rarely a single script. You split it into **modules** and \`import\` exactly what you
need — small files with one job each.

\`\`\`python
# app/coerce.py
def coerce(raw):
    value = raw.strip()
    return int(value) if value.lstrip("-").isdigit() else value

# app/config.py
from app.coerce import coerce      # reach into another module
\`\`\`

### The \`key = value\` parsing idiom

Config files are lists of \`key = value\` lines. Parsing them is a loop with a few guards:

\`\`\`python
for line in text.splitlines():     # one line at a time
    stripped = line.strip()        # drop surrounding whitespace
    if not stripped or stripped.startswith("#"):
        continue                   # skip blanks and comments
    key, value = stripped.split("=", 1)   # split on the FIRST "=" only
\`\`\`

The \`1\` in \`split("=", 1)\` is the **maxsplit** — it splits at most once, so a value like
\`http://x/?a=1\` stays intact.

### Keep it readable

Let each module own one idea: \`coerce\` knows about types, \`parse_config\` knows about lines.
Importing \`coerce\` keeps \`parse_config\` short and the type rule in exactly one place.

### Recap

Import the helper, loop the lines, guard the blanks/comments, split once, trim, coerce. First you'll
write \`coerce\` on its own; then you'll wire it into \`parse_config\` across real files.`,
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
\`key = value\` lines into a dict — skipping blanks and \`#\` comments, splitting on the first \`=\`,
trimming whitespace, and running each value through the read-only \`coerce\` helper. Open the visible
test to see the expected behaviour; some tests are hidden.`,
    starterCode: "",
    hints: [
      "Loop `for line in text.splitlines():` and `continue` past blanks and comments.",
      '`stripped.split("=", 1)` splits on the first `=` only — important for values like URLs.',
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
// L3-M1 — Project Structure & Packaging  (py-l3-packages)
// ───────────────────────────────────────────────────────────────────────────

const PKG_README = `# A tiny store package

Turn one file into a real **package**. The \`store/\` folder is a package (it has an
\`__init__.py\`). \`store/catalog.py\` (read-only) knows item prices; your job is \`store/cart.py\`.

Implement \`cart_total(names)\` so it returns the **total price** of the items named in \`names\`,
looking up each price with the read-only \`price_of\` helper from \`store.catalog\`. Unknown items
cost 0.

Run the tests — some are hidden.
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

A **module** is a single \`.py\` file. A **package** is a folder of modules with an \`__init__.py\`
file (it can be empty) that marks the folder as importable.

\`\`\`text
store/
    __init__.py     # makes 'store' a package
    catalog.py      # data + lookups
    cart.py         # uses catalog
\`\`\`

Inside \`cart.py\` you reach into a sibling module with a package-qualified import:

\`\`\`python
from store.catalog import price_of
\`\`\`

### Why split at all?

One giant file is hard to navigate. Splitting by responsibility — \`catalog\` knows prices, \`cart\`
knows totals — keeps each module short and makes imports document who depends on whom.

### The entry point

Tests (and apps) import the package's public functions: \`from store.cart import cart_total\`. That
import is the **entry point** into your package.

### Recap

A package is a folder of modules plus an \`__init__.py\`; modules import each other with
\`from package.module import name\`. First you'll total a cart in one file, then wire the same logic
across a real \`store/\` package.`,
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
    prompt: `Warm-up (one file): implement \`cart_total(prices, names)\` — total the price of every name in
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
      "`price_of` is already imported from `store.catalog` — call it on each name.",
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
// L3-M2 — Type Hints & Static Typing
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
    markdown: `## Annotations document your types

A **type hint** records what a value is meant to be. Python doesn't enforce them at runtime, but
they make code self-documenting and let tools like \`mypy\` or \`ty\` catch mismatches before you
run.

\`\`\`python
def average(values: list[float]) -> float:
    return sum(values) / len(values)
\`\`\`

- \`values: list[float]\` — the parameter is a list of floats.
- \`-> float\` — the function returns a float.

### Common shapes

\`\`\`python
name: str = "Ada"
counts: dict[str, int] = {}
pair: tuple[int, int] = (1, 2)
\`\`\`

### On classes

Annotate attributes in \`__init__\` (or use a \`@dataclass\`):

\`\`\`python
class Account:
    def __init__(self, balance: float) -> None:
        self.balance: float = balance
\`\`\`

### Keep it honest

A hint is a promise. If \`average\` can return \`0.0\` for an empty list, \`-> float\` still holds —
but if it could return \`None\`, say so with \`-> float | None\`.

### Recap

Hints like \`list[float]\` and \`-> float\` document intent and power static checkers without changing
runtime behaviour. You'll implement and annotate \`average\` — first in one file, then across the
\`stats\` package.`,
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
    prompt: `Warm-up (one file): implement \`average(nums)\` — return the mean of \`nums\` **rounded to 2
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
      "`round2` is imported for you — wrap the mean in it.",
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
// py-l3-typing-module — typing: Optional/Union, generics, Protocols
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

### Optional and Union

A value that might be missing is **Optional** — written \`X | None\` (older code uses
\`Optional[X]\`). A value that can be one of several types is a **Union** — \`int | str\`.

\`\`\`python
def find_user(user_id: int) -> dict | None:
    ...        # returns a dict, or None when not found
\`\`\`

Returning \`None\` from a function annotated \`-> dict\` is a lie a type checker will catch — annotate
the real contract, \`-> dict | None\`, and callers know to handle the \`None\`.

### Generics with TypeVar

A **generic** keeps the relationship between input and output types. \`TypeVar\` is the placeholder:

\`\`\`python
from typing import TypeVar
T = TypeVar("T")

def first(items: list[T]) -> T | None:
    return items[0] if items else None   # list[int] in -> int | None out
\`\`\`

### Protocols (structural typing)

A **Protocol** describes the *shape* an object must have — any object with the right attributes or
methods satisfies it, no inheritance required:

\`\`\`python
from typing import Protocol

class Named(Protocol):
    name: str

def greet(who: Named) -> str:
    return "Hi, " + who.name     # anything with a .name works
\`\`\`

### The mypy / ty mindset

Type checkers (\`mypy\`, \`ty\`) read these hints and flag mismatches before you run. Think of hints
as a contract the checker proves for you.

### Recap

\`X | None\` marks optional values, \`TypeVar\` keeps generics honest, and \`Protocol\` types by shape.
You'll implement a user lookup that returns \`dict | None\` — first standalone, then across the
\`directory\` package.`,
    demoCode: `def first(items: list) -> object | None:
    return items[0] if items else None


print(first([10, 20]))   # 10
print(first([]))         # None`,
  },
  apply: {
    id: "py-l3-typing-module-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`find_by_id(rows, target)\` — return the first dict in \`rows\` whose
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
      "`USERS` is imported for you — loop over it.",
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
// L3-M3 — Testing with pytest
// ───────────────────────────────────────────────────────────────────────────

const PT_README = `# TDD a bank balance

The pytest tests already exist — make them pass. Implement \`balance_after(start, transactions)\` in
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
    markdown: `## Testing with pytest

**pytest** runs functions whose names start with \`test_\` and checks plain \`assert\` statements —
no boilerplate, no class required:

\`\`\`python
# tests/test_account.py
from bank.account import balance_after

def test_applies_deposits():
    assert balance_after(0, [10, 20]) == 30
\`\`\`

Run \`pytest\` and it finds every \`test_*\` function, runs it, and reports which assertions failed,
showing actual vs expected.

### Arrange, act, assert

A readable test has three beats:

\`\`\`python
def test_mixed():
    start, txns = 100, [10, -30, 5]       # arrange
    result = balance_after(start, txns)   # act
    assert result == 85                   # assert
\`\`\`

### TDD: tests first

Test-driven development writes the test, watches it fail, then writes just enough code to pass. Here
the tests already exist — your job is to turn them green.

### Recap

pytest discovers \`test_*\` functions and checks \`assert\`s. You'll make a pytest suite pass by
implementing \`balance_after\` — first in one file, then in a \`bank\` package with real test files.`,
    demoCode: `def balance_after(start, transactions):
    return start + sum(transactions)


# what a pytest test would assert:
assert balance_after(100, [10, -30, 5]) == 85
print("all good")`,
  },
  apply: {
    id: "py-l3-pytest-basics-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`balance_after(start, transactions)\` — add every signed amount in
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
// py-l3-pytest-fixtures — fixtures & parametrize (TDD a module)
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

### Fixtures: shared setup

A **fixture** builds a value your tests need, so you don't repeat setup. Mark it \`@pytest.fixture\`
and name it as a parameter — pytest injects it:

\`\`\`python
import pytest

@pytest.fixture
def base_stock():
    return {"apple": 5, "pear": 2}

def test_adds_item(base_stock):          # pytest passes the fixture in
    assert restock(base_stock, {"plum": 3})["plum"] == 3
\`\`\`

### Parametrize: one test, many cases

\`@pytest.mark.parametrize\` runs the same test for each row of inputs:

\`\`\`python
@pytest.mark.parametrize("stock, add, expected", [
    ({"a": 1}, {"a": 1}, {"a": 2}),
    ({}, {"x": 4}, {"x": 4}),
])
def test_restock(stock, add, expected):
    assert restock(stock, add) == expected
\`\`\`

One function, many checks — with a clear per-case report.

> In this sandbox the test files call the setup helper directly and loop over a list of cases (the
> same patterns, without pytest's fixture injection), so they run without pytest installed.

### Recap

Fixtures remove duplicated setup; \`parametrize\` turns a table of cases into individual checks.
You'll implement \`restock\` so a fixture-backed, parametrized suite passes — without mutating its
input.`,
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
    prompt: `Warm-up (one file): implement \`restock(stock, additions)\` — return a **new** dict merging
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
// L3-M4 — Files, Data & Robustness
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
    markdown: `## Files the modern way: pathlib

\`pathlib.Path\` is the modern, object-oriented way to work with files and folders — cleaner than
string paths and \`os.path\`.

\`\`\`python
from pathlib import Path

p = Path("data/scores.txt")
p.read_text()                 # the whole file as a string
p.write_text("hi")            # (over)write it
p.exists()                    # True / False
Path("data") / "scores.txt"   # join paths with /
\`\`\`

### Processing a file

Read, split into lines, transform:

\`\`\`python
text = Path(path).read_text()
numbers = [int(line) for line in text.splitlines() if line.strip()]
\`\`\`

\`splitlines()\` drops the newline characters; the \`if line.strip()\` guard skips blank lines so
\`int()\` never sees an empty string.

### Walking a folder

\`\`\`python
for child in Path("data").iterdir():
    if child.suffix == ".txt":
        ...
\`\`\`

### Recap

\`Path(...).read_text()\` reads a file, \`/\` joins paths, and \`splitlines()\` + a blank-line guard
turn text into clean data. You'll total a file's numbers — first from a string, then from real files
in a \`data/\` folder.`,
    demoCode: `text = "10\\n20\\n30"
numbers = [int(line) for line in text.splitlines() if line.strip()]
print(sum(numbers))   # 60`,
  },
  apply: {
    id: "py-l3-pathlib-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`total_score(text)\` — sum the integer on each non-blank line of
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
          content: buildRunner("test_scores", "test_scores_hidden", "visible scores", "hidden scores"),
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
  title: "logging & exception design",
  summary: "Use logging instead of print and design where errors get caught.",
  estimatedMinutes: 17,
  difficulty: "medium",
  skills: ["logging", "exceptions", "error-boundaries", "robustness"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Logging and where to handle errors

### Logging beats print

In real programs, use the \`logging\` module instead of \`print\`. It adds levels
(DEBUG/INFO/WARNING/ERROR), timestamps, and can be turned up or down without touching call sites:

\`\`\`python
import logging
logger = logging.getLogger(__name__)

logger.info("processing %d records", len(records))
logger.warning("skipping bad record: %r", raw)
\`\`\`

### Designing error boundaries

Don't catch errors everywhere — decide *where* a failure is handled. A common pattern: a low-level
helper **raises** on bad input, and a higher-level loop **catches** and skips, so one bad record
doesn't sink the whole batch:

\`\`\`python
def to_amount(raw):
    return int(raw)        # raises ValueError on bad input

def safe_total(raws):
    total = 0
    for raw in raws:
        try:
            total += to_amount(raw)
        except ValueError:
            continue        # skip + (in real code) logger.warning(...)
    return total
\`\`\`

### Catch narrowly

Catch the *specific* exception you expect (\`ValueError\`), not a bare \`except\` — you don't want to
swallow unrelated bugs like a typo'd name.

### Recap

\`logging\` replaces \`print\` with levelled, configurable output; good error design puts the
\`raise\` low and the \`try/except\` at the boundary that can recover. You'll build \`safe_total\` so
one bad record never sinks the batch.`,
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
    prompt: `Warm-up (one file): implement \`safe_total(raws)\` — total the strings in \`raws\` that parse as
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
      "`to_amount` is imported for you — call it inside a `try`.",
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
          content: buildRunner("test_totals", "test_totals_hidden", "visible totals", "hidden totals"),
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

export const level3: PythonLevel = {
  id: 3,
  slug: "applied",
  title: "Level 3 — Patterns",
  tagline: "The production-shaped syntax — modules, imports, and working across real files.",
  defaultExecutionMode: "workspace",
  estimatedHours: 6,
  modules: [
    {
      id: "py-l3-working-across-files",
      title: "Working across files",
      description: "Follow imports and change code across a small multi-file Python package.",
      lessons: [parseConfigLesson],
    },
    {
      id: "py-l3-project-structure",
      title: "Project Structure & Packaging",
      description: "Lay out a multi-file package with a clear entry point.",
      lessons: [packagesLesson],
    },
    {
      id: "py-l3-type-hints",
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
  ],
}

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
  ],
}

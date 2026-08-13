import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// L3-M1: Project Structure & Packaging  (py-l3-packages)
// ───────────────────────────────────────────────────────────────────────────

const PKG_README = buildBrief({
  lesson: "py-l3-packages",
  kind: "ticket",
  headline: "Finish the reportkit split",
  body: `\`reportkit\` reads lines out of a log file and summarises them. It used to be one module. A
teammate started splitting it up, got halfway, and left for the week.

## Where the migration got to

\`reportkit/report.py\` is **read-only and already updated**. It expects two things:

- \`rank(name)\` imported from \`reportkit.levels\`
- \`severity_of(line)\` and \`worst(lines)\` imported from \`reportkit.scan\`

\`reportkit/levels.py\` is empty. \`reportkit/scan.py\` still reaches back into \`reportkit.report\`
for the severity table, which no longer lives there. \`reportkit/__init__.py\` is empty, so the
package exports nothing.

## What the package has to do

**\`levels.py\`** owns the severity table and \`rank(name)\`, which returns the rank of a severity
name. The ranks are \`DEBUG\` 1, \`INFO\` 2, \`WARNING\` 3, \`ERROR\` 4, \`CRITICAL\` 5. Any other
name ranks 0.

**\`scan.py\`** owns two functions over log lines. A line's severity is its first word, but only
when that word is a known severity. Anything else, including a blank line, is \`"UNKNOWN"\`.

\`\`\`python
severity_of("ERROR disk full")   # "ERROR"
severity_of("disk full")         # "UNKNOWN"
worst(["INFO ok", "ERROR down"]) # "ERROR"
worst([])                        # "UNKNOWN"
\`\`\`

\`worst(lines)\` returns the highest-ranked severity that appears in \`lines\`.

**\`__init__.py\`** is the package's front door. The documented public import is:

\`\`\`python
from reportkit import build_report, severity_of, worst
\`\`\`

Those three names, and only those three, are the public API. \`rank\` and the severity table are
internal: they must not be reachable as \`reportkit.rank\` or \`reportkit.SEVERITY_ORDER\`, and
\`reportkit.__all__\` must list exactly the three public names.

## The layout rule

Imports inside the package point one way, towards a leaf. \`levels.py\` is that leaf, so it imports
nothing from \`reportkit.report\` or \`reportkit.scan\`. The tests check this, and they import
through the documented public path, so correct function bodies in the wrong place still fail.`,
})

const PKG_REPORT = String.raw`"""Read-only. Already migrated: it imports from levels and scan, and from nothing else."""
from reportkit.levels import rank
from reportkit.scan import severity_of, worst


def build_report(lines):
    """Summarise log lines: how many of each severity, the worst one, and the line count."""
    counts = {}
    for line in lines:
        name = severity_of(line)
        counts[name] = counts.get(name, 0) + 1
    ordered = sorted(counts.items(), key=lambda pair: (-rank(pair[0]), pair[0]))
    return {"counts": dict(ordered), "worst": worst(lines), "total": len(lines)}
`

const PKG_LEVELS_STARTER = String.raw`"""The severity table and its lookup (see README.md).

This module is the leaf of the package: nothing inside reportkit may be imported here.
"""

# TODO: the severity table belongs in this module. README.md lists the five ranks.


def rank(name):
    """Return the rank of a severity name. A name that is not a severity ranks 0."""
    # TODO: answer from the table above.
    return 0
`

const PKG_LEVELS_REFERENCE = String.raw`"""The severity table and its lookup. The leaf of the package: it imports nothing from reportkit."""

SEVERITY_ORDER = {"DEBUG": 1, "INFO": 2, "WARNING": 3, "ERROR": 4, "CRITICAL": 5}


def rank(name):
    return SEVERITY_ORDER.get(name, 0)
`

const PKG_SCAN_STARTER = String.raw`from reportkit.report import SEVERITY_ORDER

# TODO: that import points the wrong way. Import what this module needs from where it now lives.


def severity_of(line):
    """Return the severity name a log line reports (see README.md)."""
    # TODO: read the first word and decide whether it is a severity at all.
    return "UNKNOWN"


def worst(lines):
    """Return the highest-ranked severity present in the lines (see README.md)."""
    # TODO: compare the lines by rank, not alphabetically.
    return "UNKNOWN"
`

const PKG_SCAN_REFERENCE = String.raw`from reportkit.levels import rank


def severity_of(line):
    words = line.split()
    if not words:
        return "UNKNOWN"
    name = words[0]
    return name if rank(name) > 0 else "UNKNOWN"


def worst(lines):
    highest = "UNKNOWN"
    for line in lines:
        name = severity_of(line)
        if rank(name) > rank(highest):
            highest = name
    return highest
`

const PKG_INIT_STARTER = String.raw`"""The reportkit package (see README.md).

Three names have to be reachable as reportkit.<name>: build_report, severity_of and worst.
Nothing else may be.
"""

# TODO: import those three names here, each from the module that defines it.

# TODO: declare __all__ over exactly the three public names.
`

const PKG_INIT_REFERENCE = String.raw`"""The reportkit package: summarise log lines."""
from reportkit.report import build_report
from reportkit.scan import severity_of, worst

__all__ = ["build_report", "severity_of", "worst"]
`

const PKG_TEST = String.raw`import reportkit


def run_tests(record):
    def public_path_exposes_three_names():
        missing = [n for n in ("build_report", "severity_of", "worst") if not hasattr(reportkit, n)]
        assert missing == [], f"expected 'from reportkit import build_report, severity_of, worst' to work, missing {missing!r}"

    def severity_is_the_first_word():
        result = reportkit.severity_of("ERROR disk full")
        assert result == "ERROR", f"expected 'ERROR', got {result!r}"
        result = reportkit.severity_of("WARNING queue is long")
        assert result == "WARNING", f"expected 'WARNING', got {result!r}"

    def a_line_with_no_severity_is_unknown():
        result = reportkit.severity_of("disk full")
        assert result == "UNKNOWN", f"expected 'UNKNOWN', got {result!r}"

    def worst_compares_by_rank():
        lines = ["INFO started", "ERROR disk full", "WARNING slow"]
        result = reportkit.worst(lines)
        assert result == "ERROR", f"expected 'ERROR', got {result!r}"

    def build_report_counts_every_line():
        result = reportkit.build_report(["INFO a", "ERROR b", "INFO c"])
        expected = {"counts": {"ERROR": 1, "INFO": 2}, "worst": "ERROR", "total": 3}
        assert result == expected, f"expected {expected!r}, got {result!r}"

    record("the documented public import works", public_path_exposes_three_names)
    record("severity is the first word", severity_is_the_first_word)
    record("a line with no severity is UNKNOWN", a_line_with_no_severity_is_unknown)
    record("worst compares by rank", worst_compares_by_rank)
    record("build_report counts every line", build_report_counts_every_line)
`

const PKG_TEST_HIDDEN = String.raw`import os

import reportkit


def run_tests(record):
    def all_pins_exactly_the_public_api():
        exported = sorted(getattr(reportkit, "__all__", []))
        expected = ["build_report", "severity_of", "worst"]
        assert exported == expected, f"expected reportkit.__all__ to be {expected!r}, got {exported!r}"

    def internals_are_not_on_the_package_root():
        leaked = [n for n in ("rank", "SEVERITY_ORDER") if hasattr(reportkit, n)]
        assert leaked == [], f"expected no internals on the package root, got {leaked!r}"

    def levels_imports_nothing_from_the_package():
        with open(os.path.join("reportkit", "levels.py")) as handle:
            source = handle.read()
        pointers = [t for t in ("reportkit.report", "reportkit.scan", "from .report", "from .scan") if t in source]
        assert pointers == [], f"expected levels.py to be a leaf, but it references {pointers!r}"

    def empty_input_has_no_worst():
        result = reportkit.worst([])
        assert result == "UNKNOWN", f"expected 'UNKNOWN', got {result!r}"
        result = reportkit.severity_of("")
        assert result == "UNKNOWN", f"expected 'UNKNOWN', got {result!r}"
        result = reportkit.build_report([])
        expected = {"counts": {}, "worst": "UNKNOWN", "total": 0}
        assert result == expected, f"expected {expected!r}, got {result!r}"

    def counts_are_ordered_worst_first():
        lines = ["DEBUG a", "ERROR b", "WARNING c", "totally unlabelled"]
        keys = list(reportkit.build_report(lines)["counts"])
        expected = ["ERROR", "WARNING", "DEBUG", "UNKNOWN"]
        assert keys == expected, f"expected counts keyed {expected!r}, got {keys!r}"

    def critical_outranks_error():
        result = reportkit.worst(["ERROR down", "CRITICAL data loss", "INFO ok"])
        assert result == "CRITICAL", f"expected 'CRITICAL', got {result!r}"

    record("__all__ pins exactly the public API", all_pins_exactly_the_public_api)
    record("internals stay off the package root", internals_are_not_on_the_package_root)
    record("levels.py is a leaf", levels_imports_nothing_from_the_package)
    record("empty input has no worst", empty_input_has_no_worst)
    record("counts are ordered worst first", counts_are_ordered_worst_first)
    record("CRITICAL outranks ERROR", critical_outranks_error)
`

export const packagesLesson: PythonLesson = {
  id: "py-l3-packages",
  title: "Modules, packages & project layout",
  summary: "Split logic across a real Python package with an __init__.py and cross-module imports.",
  estimatedMinutes: 35,
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

### The front door and \`__all__\`

\`__init__.py\` is the package's front door. A name is reachable as \`store.<name>\` only because the front door imported it, so what you leave out of that file stays internal.

\`\`\`python
# store/__init__.py
from store.catalog import price_of
from store.cart import cart_total

__all__ = ["cart_total", "price_of"]
\`\`\`

\`__all__\` is a plain list of strings naming the package's public API. It imports nothing by itself: the two import lines above do that work, and \`__all__\` only declares which of the names now present are the supported ones. Its one mechanical effect is on the star form, \`from store import *\`, which copies exactly the names listed there. Everything else it buys is documentation: readers, linters, and \`help()\` treat it as the published surface, so a name that is importable but absent from \`__all__\` reads as internal.

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

### What a leaf module usually owns

The module every other module points at is normally the boring one: a table, and one lookup over it. Keeping the table and its lookup together is what lets the rest of the package ask a question instead of reaching into a dict it does not own.

\`\`\`python
# store/tiers.py  (the leaf: it imports nothing from store)
TIER_ORDER = {"basic": 1, "plus": 2, "premium": 3}


def tier_rank(name):
    return TIER_ORDER.get(name, 0)
\`\`\`

\`dict.get(name, 0)\` is doing real work here. It answers for a name that is not in the table at all, so \`tier_rank\` never raises and callers can treat "unknown" as the bottom of the order.

A module above the leaf then compares by that rank rather than by the string itself:

\`\`\`python
# store/accounts.py
from store.tiers import tier_rank


def best_tier(names):
    best = "none"
    for name in names:
        if tier_rank(name) > tier_rank(best):
            best = name
    return best


print(best_tier(["basic", "premium", "plus"]))   # premium
print(best_tier([]))                             # none
\`\`\`

Two things to notice. Sorting or comparing the names directly would order them alphabetically, which is not the order anybody means. And the starting value \`"none"\` also ranks 0, so an empty list falls out of the same comparison instead of needing a special case. The same two moves come back in the Practice, over a different table.

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
  "reveal": "One rule covers all five: an import is resolved against the import path and the current package, never against the folder your file happens to sit in. In the Practice workspace, every module inside the package reaches its siblings with the absolute form."
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
    // Budget: 8 min. ~12 lines of prompt to read, ~9 lines to write (a table, a lookup with a
    // default, and a sort by that lookup). This is the rung under the Practice: the same
    // table-plus-rank shape the package's leaf module owns, before the layout question arrives.
    estimatedMinutes: 8,
    prompt: `Warm-up (one file): a billing report ranks account plans. The plans, best last, are
\`free\`, \`starter\`, \`team\`, \`enterprise\`.

Write \`plan_rank(name)\`, which returns 1 for \`free\` up to 4 for \`enterprise\` and 0 for any other
name, and \`top_plans(names)\`, which returns the plan names in \`names\` that are real plans, without
duplicates, ordered best first.

\`top_plans(["team", "free", "team", "gold"])\` is \`["team", "free"]\`.`,
    starterCode: `def plan_rank(name):
    # Return the rank of one plan name, or 0 if it is not a plan.
    pass


def top_plans(names):
    # Keep the real plans, drop duplicates, order them best first.
    pass`,
    hints: [
      "Put the four plans and their ranks in one dict, then let `plan_rank` answer from it. A dict lookup with a default covers the name that is not a plan.",
      "A name is a real plan exactly when `plan_rank(name)` is above 0, and a `set` drops the duplicates for you.",
      "`sorted` takes a `key`, and a bigger rank has to come first: `sorted(known, key=lambda name: -plan_rank(name))`.",
    ],
    referenceSolution: `PLAN_ORDER = {"free": 1, "starter": 2, "team": 3, "enterprise": 4}


def plan_rank(name):
    return PLAN_ORDER.get(name, 0)


def top_plans(names):
    known = {name for name in names if plan_rank(name) > 0}
    return sorted(known, key=lambda name: -plan_rank(name))`,
    testCases: [
      {
        input: { names: ["team", "free", "team", "gold"] },
        expected: ["team", "free"],
        description: "duplicates and an unknown name",
      },
      {
        input: { names: ["free", "enterprise", "starter", "team"] },
        expected: ["enterprise", "team", "starter", "free"],
        description: "every plan, best first",
      },
      { input: { names: [] }, expected: [], description: "no names at all" },
      {
        input: { names: ["gold", "platinum"] },
        expected: [],
        description: "nothing that is a plan",
      },
      {
        input: { names: ["starter", "starter"] },
        expected: ["starter"],
        description: "one plan, twice",
      },
    ],
  },
  practice: {
    id: "py-l3-packages-practice",
    executionMode: "workspace",
    // Budget: 22 min. To read: README 45 lines, report.py 14, three starters 30, so ~90 lines.
    // To write: 22 lines across three files (levels 4, scan 14, __init__ 4). Lesson total is
    // teach 5 + apply 8 + practice 22 = 35.
    estimatedMinutes: 22,
    prompt: `Finish a half-done package split. A teammate started breaking \`reportkit\` into modules and
stopped in the middle: \`reportkit/report.py\` is already migrated and read-only, \`reportkit/levels.py\`
is empty, \`reportkit/scan.py\` still imports the severity table out of \`reportkit.report\`, and
\`reportkit/__init__.py\` exports nothing.

Give \`levels.py\` the severity table and its \`rank(name)\` lookup, implement \`severity_of(line)\`
and \`worst(lines)\` in \`scan.py\`, and wire \`__init__.py\` so \`from reportkit import build_report,
severity_of, worst\` works and \`__all__\` lists exactly those three names. \`rank\` and the severity
table stay internal, and \`levels.py\` must import nothing from the rest of the package. The README
has the ranks and the exact behaviour. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Two modules import each other right now: `report.py` imports `scan`, and `scan.py` imports `report`. Ask what `scan.py` actually needs, and which module should own it.",
      "Point every arrow at `levels.py`. It defines the table and `rank`, and imports nothing from `reportkit`. Then `scan.py` imports `rank` from `levels`, `report.py` already does the same, and `__init__.py` sits on top pulling the three public names up to the package root.",
      "`__init__.py` makes a name reachable as `reportkit.<name>` by importing it, and nothing else does, so the way `rank` stays internal is that the front door never mentions it. `__all__` is a separate promise on top of that: it is a list of plain strings and it does not import anything by itself. In `scan.py`, remember that a word is only a severity when `rank` scores it above the default the lookup returns for a name it does not know.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "reportkit/scan.py",
      editableFilePaths: ["reportkit/levels.py", "reportkit/scan.py", "reportkit/__init__.py"],
      visibleTestPaths: ["tests/test_reportkit.py"],
      hiddenTestPaths: ["tests/test_reportkit_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PKG_README },
        {
          path: "reportkit/__init__.py",
          role: "editable",
          language: "python",
          content: PKG_INIT_STARTER,
          description: "The package front door: public imports and __all__",
        },
        {
          path: "reportkit/levels.py",
          role: "editable",
          language: "python",
          content: PKG_LEVELS_STARTER,
          description: "The leaf: severity table + rank",
        },
        {
          path: "reportkit/scan.py",
          role: "editable",
          language: "python",
          content: PKG_SCAN_STARTER,
          description: "severity_of and worst, plus one import pointing the wrong way",
        },
        {
          path: "reportkit/report.py",
          role: "readonly",
          language: "python",
          content: PKG_REPORT,
          description: "build_report (read-only, already migrated)",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_reportkit.py",
          role: "test",
          language: "python",
          content: PKG_TEST,
          description: "Visible package tests",
        },
        {
          path: "tests/test_reportkit_hidden.py",
          role: "test",
          language: "python",
          content: PKG_TEST_HIDDEN,
          hidden: true,
          description: "Hidden layout and edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_reportkit", label: "visible reportkit" },
            { module: "test_reportkit_hidden", label: "hidden reportkit" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "reportkit/__init__.py",
          role: "editable",
          language: "python",
          content: PKG_INIT_REFERENCE,
        },
        {
          path: "reportkit/levels.py",
          role: "editable",
          language: "python",
          content: PKG_LEVELS_REFERENCE,
        },
        {
          path: "reportkit/scan.py",
          role: "editable",
          language: "python",
          content: PKG_SCAN_REFERENCE,
        },
      ],
    },
  },
}

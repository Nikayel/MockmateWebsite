import type { PythonLesson } from "../../types"

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

export const packagesLesson: PythonLesson = {
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

import type { PythonLesson } from "../../types"
import { EMPTY_INIT } from "../workspace-runner"
import { buildPytestRunner } from "./pytest-runner"

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

export const pytestFixturesLesson: PythonLesson = {
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

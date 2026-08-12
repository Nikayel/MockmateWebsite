import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { EMPTY_INIT } from "../workspace-runner"
import { buildPytestRunner } from "./pytest-runner"

// ───────────────────────────────────────────────────────────────────────────
// L3-M3: Testing with pytest
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// Practice workspace: shipping cost (the learner writes the tests)
//
// Apply has the learner implement a function against tests that already exist. Practice turns
// that around: the learner is handed a documented module and writes the suite for it, following
// the precedent set by `py-l5-pin-the-seam` (a `role: "test"` file listed in `editableFilePaths`,
// graded by running it against frozen broken builds).
//
// Deliberately smaller than `py-l4-testing-tooling`: no mocks, no shared mutable state, no call
// history. Three broken builds, each of which only one basic testing habit catches:
//   _always_flat   ignores express and the free threshold -> forces a test per behaviour
//   _never_raises  returns 0 instead of raising           -> forces the raises test
//   _charges_at_the_threshold  the bug that shipped       -> forces the boundary case
// The third build is the code in cart/shipping.py, so the learner also makes one small repair.
// ───────────────────────────────────────────────────────────────────────────

const SHIPPING_README = buildBrief({
  lesson: "py-l3-pytest-basics",
  kind: "ticket",
  headline: "Write the tests for the shipping rule",
  body: `\`cart/shipping.py\` charges shipping on a cart subtotal. Four behaviours are documented, and one
of them is wrong in the code:

1. A standard order under 5000 cents pays 500 cents of shipping.
2. A standard order of 5000 cents or more ships free.
3. An express order always pays 1500 cents, at any subtotal.
4. A negative subtotal is rejected with \`ValueError\`.

Two things to do:

1. Write one test per behaviour in \`tests/test_shipping.py\`, plus the zero-subtotal edge case.
   Call the function as \`shipping.shipping_cost(...)\` so the grader can run your suite against
   other builds of the module.
2. Fix the behaviour that is wrong in \`cart/shipping.py\`.

This sandbox has no \`pytest\` installed, so \`tests/pytest_shim.py\` provides a \`raises\` context
manager that behaves like \`pytest.raises\`. Everything else is ordinary pytest: functions named
\`test_*\`, plain \`assert\`.

A hidden grader runs your suite against three broken builds of \`shipping_cost\` and against the
code in the repo. It only passes when your suite catches every broken build, so a test that
asserts nothing specific is named and rejected.`,
})

const SHIPPING_SHIM = String.raw`"""A stand-in for pytest.raises, because this sandbox has no pytest installed.

Usage is identical to the real thing:

    with raises(ValueError):
        shipping.shipping_cost(-1)
"""


class _Raises:
    def __init__(self, expected):
        self.expected = expected
        self.value = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            raise AssertionError(
                f"expected {self.expected.__name__} to be raised, got no exception"
            )
        if not issubclass(exc_type, self.expected):
            return False
        self.value = exc
        return True


def raises(expected):
    """Assert that the block raises expected (or a subclass of it)."""
    return _Raises(expected)
`

const SHIPPING_STARTER = String.raw`"""Shipping charged on a cart subtotal, in cents (see README.md)."""

FREE_SHIPPING_THRESHOLD_CENTS = 5000
STANDARD_CENTS = 500
EXPRESS_CENTS = 1500


# TODO: one of the four behaviours README.md documents is wrong in this module.
# Your tests decide which one.


def shipping_cost(subtotal_cents, express=False):
    """Return the shipping charge in cents for this subtotal."""
    if subtotal_cents < 0:
        raise ValueError("subtotal_cents must not be negative")
    if express:
        return EXPRESS_CENTS
    if subtotal_cents > FREE_SHIPPING_THRESHOLD_CENTS:
        return 0
    return STANDARD_CENTS
`

const SHIPPING_REFERENCE = String.raw`"""Shipping charged on a cart subtotal, in cents (see README.md)."""

FREE_SHIPPING_THRESHOLD_CENTS = 5000
STANDARD_CENTS = 500
EXPRESS_CENTS = 1500


def shipping_cost(subtotal_cents, express=False):
    """Return the shipping charge in cents for this subtotal."""
    if subtotal_cents < 0:
        raise ValueError("subtotal_cents must not be negative")
    if express:
        return EXPRESS_CENTS
    if subtotal_cents >= FREE_SHIPPING_THRESHOLD_CENTS:
        return 0
    return STANDARD_CENTS
`

const SHIPPING_TEST_STARTER = String.raw`# Your test suite for cart/shipping.py.
#
# Call the function as shipping.shipping_cost(...). A from-imported name would point at one
# build forever, and the grader swaps builds under your suite.

from cart import shipping
from tests.pytest_shim import raises  # stand-in for pytest.raises


def test_standard_order_under_the_threshold_pays_500():
    got = shipping.shipping_cost(4999)
    assert got == 500, f"expected 500 cents under the threshold, got {got}"


# TODO: add one test for each remaining documented behaviour, plus the zero-subtotal case.
# Give each test a name that says what it asserts, and assert on the value the function
# returned rather than on whether it is truthy. One behaviour per test.
`

const SHIPPING_TEST_REFERENCE = String.raw`# Your test suite for cart/shipping.py.
#
# Call the function as shipping.shipping_cost(...). A from-imported name would point at one
# build forever, and the grader swaps builds under your suite.

from cart import shipping
from tests.pytest_shim import raises  # stand-in for pytest.raises


def test_standard_order_under_the_threshold_pays_500():
    got = shipping.shipping_cost(4999)
    assert got == 500, f"expected 500 cents under the threshold, got {got}"


def test_zero_subtotal_still_pays_standard_shipping():
    got = shipping.shipping_cost(0)
    assert got == 500, f"expected 500 cents on a zero subtotal, got {got}"


def test_free_shipping_starts_exactly_at_the_threshold():
    got = shipping.shipping_cost(5000)
    assert got == 0, f"expected 0 cents at exactly 5000, got {got}"


def test_express_costs_1500_on_a_small_order():
    got = shipping.shipping_cost(1000, express=True)
    assert got == 1500, f"expected 1500 cents for express, got {got}"


def test_express_is_not_free_above_the_threshold():
    got = shipping.shipping_cost(9000, express=True)
    assert got == 1500, f"expected express to stay 1500 above the threshold, got {got}"


def test_a_negative_subtotal_raises_value_error():
    with raises(ValueError):
        shipping.shipping_cost(-1)
`

const SHIPPING_TEST_HIDDEN = String.raw`"""Hidden grader for the suite you wrote, plus checks on the repaired module.

The first four tests run YOUR tests/test_shipping.py against frozen builds of shipping_cost.
A suite that only checks one behaviour, or that asserts nothing specific, passes on a broken
build and is reported here by name.
"""

import inspect

from cart import shipping
from tests import test_shipping

STANDARD = 500
EXPRESS = 1500
THRESHOLD = 5000


def _always_flat(subtotal_cents, express=False):
    """Broken build: charges standard shipping no matter what. Do not edit."""
    if subtotal_cents < 0:
        raise ValueError("subtotal_cents must not be negative")
    return STANDARD


def _never_raises(subtotal_cents, express=False):
    """Broken build: swallows a negative subtotal instead of rejecting it. Do not edit."""
    if subtotal_cents < 0:
        return 0
    if express:
        return EXPRESS
    return 0 if subtotal_cents >= THRESHOLD else STANDARD


def _charges_at_the_threshold(subtotal_cents, express=False):
    """Broken build: the boundary is off by one cart. Do not edit."""
    if subtotal_cents < 0:
        raise ValueError("subtotal_cents must not be negative")
    if express:
        return EXPRESS
    return 0 if subtotal_cents > THRESHOLD else STANDARD


def _learner_tests():
    return [
        (name, fn)
        for name, fn in inspect.getmembers(test_shipping, inspect.isfunction)
        if name.startswith("test_") and getattr(fn, "__module__", None) == test_shipping.__name__
    ]


def _run_against(build):
    """Run every test in tests/test_shipping.py with shipping_cost swapped for build."""
    outcomes = []
    original = shipping.shipping_cost
    setattr(shipping, "shipping_cost", build)
    try:
        for name, fn in _learner_tests():
            try:
                fn()
                outcomes.append((name, True, ""))
            except Exception as exc:
                outcomes.append((name, False, str(exc) or type(exc).__name__))
    finally:
        setattr(shipping, "shipping_cost", original)
    return outcomes


def _assert_catches(build, label, missing):
    red = [name for name, passed, _ in _run_against(build) if not passed]
    assert red, (
        f"expected at least one of your tests to fail on the {label} build, got none; "
        f"{missing}"
    )


def test_your_suite_has_a_test_per_behaviour():
    found = [name for name, _ in _learner_tests()]
    assert len(found) >= 5, (
        f"expected at least 5 tests in tests/test_shipping.py (four behaviours plus the "
        f"zero-subtotal case), got {len(found)}: {found}"
    )


def test_your_suite_catches_the_flat_rate_build():
    _assert_catches(
        _always_flat,
        "flat-rate",
        "it charges 500 cents for every order, so add tests for free shipping and for express",
    )


def test_your_suite_catches_the_build_that_never_raises():
    _assert_catches(
        _never_raises,
        "never-raises",
        "it returns 0 for a negative subtotal instead of raising, so add a test for the "
        "error path",
    )


def test_your_suite_catches_the_threshold_build():
    _assert_catches(
        _charges_at_the_threshold,
        "off-by-one threshold",
        "it charges 500 cents at exactly 5000, so add a test at the boundary itself",
    )


def test_your_suite_passes_on_the_repaired_module():
    red = [
        f"{name}: {error}" for name, passed, error in _run_against(shipping.shipping_cost)
        if not passed
    ]
    assert not red, "your suite still fails on cart/shipping.py: " + "; ".join(red)


def test_free_shipping_starts_exactly_at_the_threshold():
    for subtotal, expected in [(4999, 500), (5000, 0), (5001, 0)]:
        got = shipping.shipping_cost(subtotal)
        assert got == expected, f"expected {expected} cents at {subtotal}, got {got}"


def test_zero_subtotal_pays_standard_shipping():
    got = shipping.shipping_cost(0)
    assert got == 500, f"expected 500 cents on a zero subtotal, got {got}"


def test_express_ignores_the_free_threshold():
    for subtotal in [0, 4999, 5000, 20000]:
        got = shipping.shipping_cost(subtotal, express=True)
        assert got == 1500, f"expected 1500 cents for express at {subtotal}, got {got}"


def test_a_negative_subtotal_is_rejected():
    for subtotal in [-1, -5000]:
        try:
            got = shipping.shipping_cost(subtotal)
        except ValueError:
            continue
        raise AssertionError(f"expected ValueError at {subtotal}, got {got}")
`

export const pytestBasicsLesson: PythonLesson = {
  id: "py-l3-pytest-basics",
  title: "pytest assertions & structure",
  summary:
    "Implement a module against a pytest suite, then write your own suite for a documented shipping rule and fix the bug it catches.",
  estimatedMinutes: 40,
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

Test-driven development runs this loop backwards: write the failing test first (red), then write the smallest code that makes it pass (green). In the Apply warm-up the tests already exist, and your job is to implement \`balance_after\` so \`start + sum(transactions)\` produces the expected total and the suite turns green. The Practice turns that around: you are handed a documented module and you write the suite for it, and a hidden grader decides whether your tests would actually catch a broken build.

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
    prompt: `Write the test suite for \`cart/shipping.py\` in \`tests/test_shipping.py\`, then fix the
one documented behaviour the module gets wrong. \`README.md\` lists what shipping is supposed to
cost: a flat charge under the free-shipping threshold, free at or above it, a fixed express charge
at any subtotal, and a \`ValueError\` on a negative subtotal.

Call the function as \`shipping.shipping_cost(...)\`. A hidden grader runs your suite against three
broken builds of the module and names the ones it still lets through. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Work down the list in `README.md` one line at a time. Each documented behaviour is one test, named for what it asserts, and each test compares the returned number against the number you expect.",
      "The grader's broken builds each break exactly one behaviour, so a suite that tests only the standard charge passes three of them. Cover express and the free threshold at the boundary value itself, not a comfortable distance away from it.",
      "The error path needs the `raises` context manager already imported from `tests/pytest_shim.py`, because a call that raises can never be compared to a return value. For the fix, the bug is an off-by-one at the boundary: pick the subtotal the README calls out by name, work out what the module returns for exactly that number, and the wrong comparison names itself.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "tests/test_shipping.py",
      editableFilePaths: ["tests/test_shipping.py", "cart/shipping.py"],
      visibleTestPaths: ["tests/test_shipping.py"],
      hiddenTestPaths: ["tests/test_shipping_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: SHIPPING_README },
        { path: "cart/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "cart/shipping.py",
          role: "editable",
          language: "python",
          content: SHIPPING_STARTER,
          description: "The module under test. One documented behaviour is wrong here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/pytest_shim.py",
          role: "readonly",
          language: "python",
          content: SHIPPING_SHIM,
          description: "A stand-in for pytest.raises (read-only)",
        },
        {
          path: "tests/test_shipping.py",
          role: "test",
          language: "python",
          content: SHIPPING_TEST_STARTER,
          description: "Write your pytest suite here",
        },
        {
          path: "tests/test_shipping_hidden.py",
          role: "test",
          language: "python",
          content: SHIPPING_TEST_HIDDEN,
          hidden: true,
          description: "Hidden grader for your suite, plus checks on the repaired module",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildPytestRunner(
            "test_shipping",
            "test_shipping_hidden",
            "visible shipping",
            "hidden shipping"
          ),
          hidden: true,
          description: "pytest-style test runner",
        },
      ],
      referenceFiles: [
        {
          path: "tests/test_shipping.py",
          role: "test",
          language: "python",
          content: SHIPPING_TEST_REFERENCE,
        },
        {
          path: "cart/shipping.py",
          role: "editable",
          language: "python",
          content: SHIPPING_REFERENCE,
        },
      ],
    },
  },
}

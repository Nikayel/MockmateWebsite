import type { PythonLesson } from "../../types"
import { EMPTY_INIT, buildRunner } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// py-l3-pytest-fixtures: fixtures & parametrize (TDD a module)
//
// Practice workspace: the learner WRITES the suite. `tests/test_ledger.py` is a `role: "test"`
// file listed in editableFilePaths (the mechanic established by py-l5-pin-the-seam), and
// `bookings/ledger.py` carries the shared-mutable-state hazard the fixture has to defend against.
// The sandbox has no pytest, so `minipytest.py` is a read-only stand-in providing the three pieces
// the lesson teaches: @fixture (with yield teardown), @parametrize, and param(..., raises=...).
// A read-only shape suite grades the SUITE (fresh per test, teardown, table with a raising row,
// order independence); the hidden suite grades the module on its own.
// ───────────────────────────────────────────────────────────────────────────

const PRACTICE_README = `# Ticket: the room booking suite is order dependent

The booking ledger has no suite worth the name. The tests that exist build their own setup by
hand, four of them are the same body with a different number pasted in, and the whole file goes
green or red depending on which test happens to run first.

You have two files to change.

**\`tests/test_ledger.py\`** is the suite. It has to cover:

- a fixture that hands each test its own open ledger and releases it when the test finishes
- at least two tests that take that fixture, one of which books seats and one of which asserts
  the room it was handed is still empty
- one parametrized test carrying at least four rows, one of which is a request the ledger must
  reject, marked with \`minipytest.param(..., raises=ValueError)\`

Every assertion needs a message naming the expected value and the actual one.

**\`bookings/ledger.py\`** is the module under test. \`Ledger(seats)\` opens a ledger, lists itself
in \`OPEN_LEDGERS\`, and:

- \`book(name, seats)\` records a booking, and raises \`ValueError\` for a request of zero or
  fewer seats and for a request larger than \`remaining()\`
- \`close()\` takes the ledger out of \`OPEN_LEDGERS\`, and is safe to call twice
- a ledger built with no \`entries\` starts empty, and one built with an \`entries\` list does not
  keep writing into the caller's list

This sandbox has no \`pytest\`, so \`minipytest.py\` is a read-only stand-in with \`@fixture\`,
\`@parametrize\`, and \`param(..., raises=...)\`. Read it once; the names match pytest.

\`tests/test_report.py\` and \`tests/test_shape.py\` are read-only. The first runs your suite and
reports each case by name. The second checks the properties above and tells you which one is
missing. Some tests are hidden.
`

const MINIPYTEST = String.raw`"""A very small stand-in for the parts of pytest this lesson uses (read-only).

This sandbox has no pytest installed, so the three pieces you need live here instead:

    @minipytest.fixture
        A test that names it as a parameter is handed what the fixture produces. Use yield
        instead of return and the code after the yield runs as teardown, even if the test failed.

    @minipytest.parametrize("a, b", rows)
        One test body, one case per row.

    minipytest.param(*values, raises=ValueError)
        A row that is expected to raise instead of returning a value.

The names and the behavior match pytest closely enough that what you write here transfers.
Only the machinery is smaller.
"""

import inspect


class Param:
    """One parametrize row that carries an expectation beyond its values."""

    def __init__(self, values, raises=None):
        self.values = values
        self.raises = raises


def param(*values, raises=None):
    """A row expected to raise, for example param(5, None, raises=ValueError)."""
    return Param(values, raises)


def fixture(func):
    """Mark func as a fixture. Tests receive its value by naming it as a parameter."""
    func.is_fixture = True
    return func


def parametrize(argnames, rows):
    """Run one test body once per row. argnames is "a, b" style, as in pytest."""
    names = [name.strip() for name in argnames.split(",") if name.strip()]

    def decorate(func):
        func.parametrize = (names, list(rows))
        return func

    return decorate


class _Raises:
    def __init__(self, expected):
        self.expected = expected

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            raise AssertionError(
                "expected " + self.expected.__name__ + " to be raised, nothing was raised"
            )
        return issubclass(exc_type, self.expected)


def raises(expected):
    """Context manager asserting the block raises expected."""
    return _Raises(expected)


def is_yield_fixture(fixture_fn):
    """True when the fixture yields its value, so it has a teardown half."""
    return inspect.isgeneratorfunction(fixture_fn)


def fixtures_in(module):
    """Every @fixture defined in module, keyed by name."""
    return {
        name: value
        for name, value in vars(module).items()
        if inspect.isfunction(value)
        and getattr(value, "is_fixture", False)
        and value.__module__ == module.__name__
    }


def tests_in(module):
    """Every test_ function defined in module, in definition order."""
    return [
        (name, value)
        for name, value in vars(module).items()
        if name.startswith("test_")
        and inspect.isfunction(value)
        and value.__module__ == module.__name__
    ]


def setup(fixture_fn):
    """Run a fixture once. Returns (value, finish), where finish() runs its teardown."""
    produced = fixture_fn()
    if inspect.isgenerator(produced):
        value = next(produced)

        def finish():
            try:
                next(produced)
            except StopIteration:
                pass

        return value, finish
    return produced, lambda: None


def _make_case(module, func, names, values, expected_error):
    """Build the callable for one case: set up fixtures, run the body, always tear down."""

    def run():
        row = dict(zip(names, values))
        kwargs = {}
        finishers = []
        for arg in inspect.signature(func).parameters:
            if arg in row:
                kwargs[arg] = row[arg]
                continue
            fixture_fn = fixtures_in(module).get(arg)
            if fixture_fn is None:
                raise AssertionError(
                    func.__name__ + " asks for " + repr(arg) + ", which is neither a "
                    "parametrize argument nor a fixture defined in this file"
                )
            value, finish = setup(fixture_fn)
            kwargs[arg] = value
            finishers.append(finish)
        try:
            if expected_error is None:
                func(**kwargs)
            else:
                with raises(expected_error):
                    func(**kwargs)
        finally:
            for finish in reversed(finishers):
                finish()

    return run


def collect(module):
    """Expand module into (case_id, run) pairs: one per test, one per parametrize row."""
    cases = []
    for name, func in tests_in(module):
        table = getattr(func, "parametrize", None)
        if table is None:
            cases.append((name, _make_case(module, func, [], [], None)))
            continue
        names, rows = table
        for index, row in enumerate(rows):
            if isinstance(row, Param):
                values, expected_error = row.values, row.raises
            elif isinstance(row, tuple):
                values, expected_error = row, None
            else:
                values, expected_error = (row,), None
            cases.append(
                (
                    name + "[" + str(index) + "]",
                    _make_case(module, func, names, values, expected_error),
                )
            )
    return cases
`

const LEDGER_STARTER = String.raw`"""The booking ledger for one meeting room. See README.md."""

OPEN_LEDGERS = []


class Ledger:
    """One room's bookings. An open ledger is listed in OPEN_LEDGERS until it is closed."""

    def __init__(self, seats, entries=[]):
        # TODO: a new ledger must start with entries of its own, not a list shared with
        # every other ledger built without an entries argument.
        self.seats = seats
        self.entries = entries
        OPEN_LEDGERS.append(self)

    def booked(self):
        return sum(seats for _, seats in self.entries)

    def remaining(self):
        return self.seats - self.booked()

    def book(self, name, seats):
        """Record a booking. README.md lists the two requests this must reject."""
        # TODO: reject a bad request before it reaches the entries list.
        self.entries.append((name, seats))

    def close(self):
        """Release the ledger."""
        # TODO: a closed ledger must no longer appear in OPEN_LEDGERS, and closing the
        # same ledger twice must not raise.
`

const LEDGER_REFERENCE = String.raw`"""The booking ledger for one meeting room. See README.md."""

OPEN_LEDGERS = []


class Ledger:
    """One room's bookings. An open ledger is listed in OPEN_LEDGERS until it is closed."""

    def __init__(self, seats, entries=None):
        self.seats = seats
        self.entries = list(entries) if entries is not None else []
        OPEN_LEDGERS.append(self)

    def booked(self):
        return sum(seats for _, seats in self.entries)

    def remaining(self):
        return self.seats - self.booked()

    def book(self, name, seats):
        """Record a booking. README.md lists the two requests this must reject."""
        if seats <= 0:
            raise ValueError("seats must be positive, got " + str(seats))
        if seats > self.remaining():
            raise ValueError(
                "only " + str(self.remaining()) + " seats left, asked for " + str(seats)
            )
        self.entries.append((name, seats))

    def close(self):
        """Release the ledger."""
        if self in OPEN_LEDGERS:
            OPEN_LEDGERS.remove(self)
`

const LEDGER_TEST_STARTER = String.raw`# The suite for the booking ledger. README.md lists what it has to cover.
#
# minipytest.py is the read-only stand-in for pytest in this sandbox. Every assert needs a
# message naming the expected value and the actual one.

import minipytest
from bookings.ledger import Ledger


def test_a_fresh_room_has_every_seat():
    room = Ledger(seats=4)
    assert room.remaining() == 4, (
        "expected 4 seats in a fresh 4 seat room, got " + str(room.remaining())
    )
    room.close()


# TODO: add a fixture that hands each test its own open ledger and releases it afterwards.

# TODO: add two tests that take that fixture, one that books seats and one that asserts the
#       room it was handed is still empty.

# TODO: replace the four near-identical booking tests with one parametrized test, including a
#       row for a request the ledger must reject.
`

const LEDGER_TEST_REFERENCE = String.raw`# The suite for the booking ledger. README.md lists what it has to cover.
#
# minipytest.py is the read-only stand-in for pytest in this sandbox. Every assert needs a
# message naming the expected value and the actual one.

import minipytest
from bookings.ledger import Ledger


@minipytest.fixture
def room():
    ledger = Ledger(seats=4)
    yield ledger
    ledger.close()


def test_a_fresh_room_has_every_seat():
    ledger = Ledger(seats=4)
    assert ledger.remaining() == 4, (
        "expected 4 seats in a fresh 4 seat room, got " + str(ledger.remaining())
    )
    ledger.close()


def test_a_booking_uses_up_seats(room):
    room.book("ada", 3)
    assert room.remaining() == 1, (
        "expected 1 seat left after booking 3 of 4, got " + str(room.remaining())
    )


def test_the_room_arrives_empty(room):
    assert room.entries == [], (
        "expected the room to arrive with no bookings, got " + repr(room.entries)
    )
    assert room.remaining() == 4, (
        "expected 4 seats in the room this test was handed, got " + str(room.remaining())
    )


@minipytest.parametrize(
    "seats, expected_remaining",
    [
        (1, 3),
        (2, 2),
        (4, 0),
        minipytest.param(0, None, raises=ValueError),
        minipytest.param(5, None, raises=ValueError),
    ],
)
def test_booking_leaves_the_right_number_of_seats(room, seats, expected_remaining):
    room.book("ada", seats)
    assert room.remaining() == expected_remaining, (
        "expected " + str(expected_remaining) + " seats left after booking " + str(seats)
        + ", got " + str(room.remaining())
    )
`

const LEDGER_TEST_REPORT = String.raw`"""Runs the suite you wrote in tests/test_ledger.py (read-only).

Each row below is one of your cases. A parametrized test shows up once per row, which is the
difference between parametrize and a for loop: one broken row cannot hide the next.
"""

import minipytest
from tests import test_ledger


def run_tests(record):
    cases = minipytest.collect(test_ledger)

    if not cases:

        def your_file_defines_at_least_one_test():
            raise AssertionError(
                "tests/test_ledger.py defines no test_ functions, so there is nothing to run"
            )

        record("tests/test_ledger.py defines a test", your_file_defines_at_least_one_test)
        return

    for case_id, run in cases:
        record(case_id, run)
`

const LEDGER_TEST_SHAPE = String.raw`"""Checks on the SUITE you wrote, not on the ledger (read-only).

These are the properties that make a fixture worth having: a fresh object for every test, a
teardown that always runs, and a table of cases in place of copied test bodies.
"""

import inspect

import minipytest
from bookings import ledger as ledger_module
from tests import test_ledger


def _the_fixture():
    found = minipytest.fixtures_in(test_ledger)
    assert found, (
        "tests/test_ledger.py defines no @minipytest.fixture, so every test still builds its "
        "own setup by hand"
    )
    return sorted(found.items())[0][1]


def _tables():
    return [
        (name, func.parametrize)
        for name, func in minipytest.tests_in(test_ledger)
        if hasattr(func, "parametrize")
    ]


def run_tests(record):
    def the_fixture_hands_back_a_ledger():
        value, finish = minipytest.setup(_the_fixture())
        try:
            assert isinstance(value, ledger_module.Ledger), (
                "expected the fixture to hand back a Ledger, got " + repr(value)
            )
            assert value.seats > 0, (
                "expected the fixture's ledger to have seats, got " + repr(value.seats)
            )
        finally:
            finish()

    def the_fixture_releases_its_ledger():
        fixture_fn = _the_fixture()
        assert minipytest.is_yield_fixture(fixture_fn), (
            "expected the fixture to yield its ledger so the lines after the yield can release "
            "it, this fixture returns instead"
        )
        before = len(ledger_module.OPEN_LEDGERS)
        _, finish = minipytest.setup(fixture_fn)
        finish()
        after = len(ledger_module.OPEN_LEDGERS)
        assert after == before, (
            "expected OPEN_LEDGERS back at " + str(before) + " entries after teardown, got "
            + str(after)
        )

    def the_fixture_is_fresh_for_every_test():
        fixture_fn = _the_fixture()
        first, finish_first = minipytest.setup(fixture_fn)
        second, finish_second = minipytest.setup(fixture_fn)
        try:
            assert first is not second, (
                "expected the fixture to build a new ledger each time, got the same object twice"
            )
            first.entries.append(("audit", 1))
            assert second.entries == [], (
                "expected the second ledger to be empty, got " + repr(second.entries)
                + ", so one test's booking reaches the next one"
            )
        finally:
            finish_first()
            finish_second()

    def more_than_one_test_takes_the_fixture():
        names = set(minipytest.fixtures_in(test_ledger))
        users = [
            name
            for name, func in minipytest.tests_in(test_ledger)
            if names & set(inspect.signature(func).parameters)
        ]
        assert len(users) >= 2, (
            "expected at least 2 tests to take the fixture, found " + str(len(users))
            + ", and a fixture only earns its place when several tests share it"
        )

    def one_test_carries_a_table_of_cases():
        tables = _tables()
        assert tables, "expected one @minipytest.parametrize test, found none"
        widest = max(len(rows) for _, (_, rows) in tables)
        assert widest >= 4, (
            "expected the parametrized test to carry at least 4 rows, the widest carries "
            + str(widest)
        )

    def one_row_expects_a_rejection():
        rows = [row for _, (_, table) in _tables() for row in table]
        raising = [row for row in rows if isinstance(row, minipytest.Param) and row.raises]
        assert raising, (
            "expected one row written as minipytest.param(..., raises=ValueError) for a request "
            "the ledger must reject, found none"
        )

    def your_cases_pass_in_any_order():
        cases = minipytest.collect(test_ledger)
        assert len(cases) >= 6, (
            "expected at least 6 cases once the rows are expanded, collected " + str(len(cases))
        )
        for order in (cases, list(reversed(cases))):
            for case_id, run in order:
                try:
                    run()
                except AssertionError as exc:
                    raise AssertionError(
                        case_id + " failed when the suite ran in a different order: " + str(exc)
                    )

    record("the fixture hands back a ledger", the_fixture_hands_back_a_ledger)
    record("the fixture releases its ledger", the_fixture_releases_its_ledger)
    record("the fixture is fresh for every test", the_fixture_is_fresh_for_every_test)
    record("more than one test takes the fixture", more_than_one_test_takes_the_fixture)
    record("one test carries a table of cases", one_test_carries_a_table_of_cases)
    record("one row expects a rejection", one_row_expects_a_rejection)
    record("your cases pass in any order", your_cases_pass_in_any_order)
`

const LEDGER_TEST_HIDDEN = String.raw`"""Hidden checks on bookings/ledger.py itself, independent of the suite you wrote."""

from bookings import ledger as ledger_module

Ledger = ledger_module.Ledger


def run_tests(record):
    def two_ledgers_do_not_share_entries():
        first = Ledger(seats=4)
        second = Ledger(seats=4)
        try:
            first.entries.append(("ada", 2))
            assert second.entries == [], (
                "expected a second ledger built with no entries to be empty, got "
                + repr(second.entries)
            )
            assert second.remaining() == 4, (
                "expected 4 seats left on the second ledger, got " + str(second.remaining())
            )
        finally:
            first.close()
            second.close()

    def a_given_entries_list_is_copied():
        seed = [("grace", 1)]
        room = Ledger(seats=4, entries=seed)
        try:
            room.book("ada", 1)
            assert seed == [("grace", 1)], (
                "expected the caller's list to be left alone, got " + repr(seed)
            )
            assert room.remaining() == 2, (
                "expected 2 seats left after 1 seeded and 1 booked, got " + str(room.remaining())
            )
        finally:
            room.close()

    def overbooking_is_rejected():
        room = Ledger(seats=3)
        try:
            room.book("ada", 2)
            try:
                room.book("grace", 2)
            except ValueError:
                pass
            else:
                raise AssertionError(
                    "expected ValueError booking 2 seats with 1 left, nothing was raised"
                )
            assert room.remaining() == 1, (
                "expected the rejected booking to leave 1 seat, got " + str(room.remaining())
            )
        finally:
            room.close()

    def a_non_positive_request_is_rejected():
        room = Ledger(seats=3)
        try:
            for seats in [0, -2]:
                try:
                    room.book("ada", seats)
                except ValueError:
                    continue
                raise AssertionError(
                    "expected ValueError booking " + str(seats) + " seats, nothing was raised"
                )
            assert room.entries == [], (
                "expected a rejected booking to record nothing, got " + repr(room.entries)
            )
        finally:
            room.close()

    def closing_removes_the_ledger_once():
        before = len(ledger_module.OPEN_LEDGERS)
        room = Ledger(seats=2)
        opened = len(ledger_module.OPEN_LEDGERS)
        assert opened == before + 1, (
            "expected an open ledger to be listed in OPEN_LEDGERS, expected " + str(before + 1)
            + " entries, got " + str(opened)
        )
        room.close()
        room.close()
        after = len(ledger_module.OPEN_LEDGERS)
        assert after == before, (
            "expected OPEN_LEDGERS back at " + str(before) + " after closing twice, got "
            + str(after)
        )

    def a_full_room_reports_no_seats():
        room = Ledger(seats=5)
        try:
            room.book("ada", 3)
            room.book("grace", 2)
            assert room.booked() == 5, (
                "expected 5 seats booked, got " + str(room.booked())
            )
            assert room.remaining() == 0, (
                "expected 0 seats left after booking 3 and 2 of 5, got " + str(room.remaining())
            )
        finally:
            room.close()

    record("two ledgers do not share entries", two_ledgers_do_not_share_entries)
    record("a given entries list is copied", a_given_entries_list_is_copied)
    record("overbooking is rejected", overbooking_is_rejected)
    record("a non positive request is rejected", a_non_positive_request_is_rejected)
    record("closing removes the ledger once", closing_removes_the_ledger_once)
    record("a full room reports no seats", a_full_room_reports_no_seats)
`

export const pytestFixturesLesson: PythonLesson = {
  id: "py-l3-pytest-fixtures",
  title: "Fixtures & parametrize",
  summary:
    "Share setup with fixtures and cover many cases with parametrize while you TDD a module.",
  estimatedMinutes: 28,
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

The demo below shows the \`restock\` you will build. It copies \`stock\` with \`dict(stock)\`, then adds each quantity onto \`result.get(item, 0)\`, returning a new dict. This sandbox has no \`pytest\` installed, so the Practice ships \`minipytest\`, a small read-only stand-in offering the same three pieces under the same names: \`@fixture\` with \`yield\` teardown, \`@parametrize\`, and \`param(..., raises=...)\`. Only the machinery is smaller, so what you write there transfers.

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

Now every test in the module gets the same dict. If \`restock\` mutates its input (for example \`result = stock\` instead of \`result = dict(stock)\`, which makes \`result\` and \`stock\` the same object), one test's change bleeds into the next, and tests pass or fail depending on order. The Practice module carries the same hazard in a different disguise: one mutable object shared where each user of it should have had its own.

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
    prompt: `The room booking suite passes or fails depending on which test runs first, and four of
its cases are the same body with a different number pasted in. Write the suite in
\`tests/test_ledger.py\` using a fixture and a parametrized table, and finish \`bookings/ledger.py\`
so a booking that must be rejected raises \`ValueError\` and a closed ledger is released.
\`README.md\` lists what the suite has to cover. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Order dependence comes from state that outlives a test. Look at what `Ledger(seats=4)` uses for `entries` when the caller passes nothing, and ask which ledgers end up sharing that object.",
      "A fixture that yields is two halves: build the ledger, `yield` it to the test, then release it after the yield. That is where `close()` belongs, and it is why teardown still runs when a test fails.",
      'The four booking cases become one table: `@minipytest.parametrize("seats, expected_remaining", [...])`, and the row that must be refused is written `minipytest.param(5, None, raises=ValueError)`.',
    ],
    workspace: {
      language: "python",
      primaryFilePath: "tests/test_ledger.py",
      editableFilePaths: ["tests/test_ledger.py", "bookings/ledger.py"],
      visibleTestPaths: ["tests/test_ledger.py", "tests/test_report.py", "tests/test_shape.py"],
      hiddenTestPaths: ["tests/test_ledger_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PRACTICE_README },
        {
          path: "minipytest.py",
          role: "readonly",
          language: "python",
          content: MINIPYTEST,
          description: "The pytest stand-in this sandbox provides (read-only)",
        },
        {
          path: "bookings/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "bookings/ledger.py",
          role: "editable",
          language: "python",
          content: LEDGER_STARTER,
          description: "Finish the ledger here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_ledger.py",
          role: "test",
          language: "python",
          content: LEDGER_TEST_STARTER,
          description: "Write your fixture and parametrized suite here",
        },
        {
          path: "tests/test_report.py",
          role: "test",
          language: "python",
          content: LEDGER_TEST_REPORT,
          description: "Reports each case you wrote, by name (read-only)",
        },
        {
          path: "tests/test_shape.py",
          role: "test",
          language: "python",
          content: LEDGER_TEST_SHAPE,
          description: "Checks the shape of your suite (read-only)",
        },
        {
          path: "tests/test_ledger_hidden.py",
          role: "test",
          language: "python",
          content: LEDGER_TEST_HIDDEN,
          hidden: true,
          description: "Hidden checks on the ledger module",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_report", label: "visible your cases" },
            { module: "test_shape", label: "visible suite shape" },
            { module: "test_ledger_hidden", label: "hidden ledger" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "tests/test_ledger.py",
          role: "test",
          language: "python",
          content: LEDGER_TEST_REFERENCE,
        },
        {
          path: "bookings/ledger.py",
          role: "editable",
          language: "python",
          content: LEDGER_REFERENCE,
        },
      ],
    },
  },
}

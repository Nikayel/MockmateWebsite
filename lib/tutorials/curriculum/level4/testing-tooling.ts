// ───────────────────────────────────────────────────────────────────────────
// L4-M5: Quality, Packaging & Capstone
// ───────────────────────────────────────────────────────────────────────────

import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// Practice workspace: billing dispatch (a customer was charged twice)
//
// The learner is on the AUTHORING side of the tests, following the precedent set by
// `py-l5-pin-the-seam`: a `role: "test"` file sits in `editableFilePaths` (the overlay honors
// editableFilePaths regardless of role), and a build-swapping audit grades what they wrote.
//
// The bug is deliberately invisible in the return value: a refactor left the old
// `gateway.charge(...)` line in place next to the new `_charge_one` helper, so the count comes
// back right while every customer is charged twice. Only an assertion on the mock's call history
// can see it, which is exactly the skill this lesson teaches.
//
// The audit runs the learner's suite against four broken builds, so a tautology
// (`assert True`) and a single narrow test both fail by name:
//   _old_build          charges twice          -> forces a call_count assertion
//   _never_charges      calls nothing          -> rejects a suite that asserts nothing real
//   _ignores_the_ledger recharges paid rows    -> forces a second dispatch in the suite
//   _swapped_args       charge(cents, id)      -> forces an assertion on the arguments
// A fifth check runs the suite twice in a row without clearing the shared ledger, so the suite
// only passes when the learner isolates state with ledger.reset().
// ───────────────────────────────────────────────────────────────────────────

const DISPATCH_README = buildBrief({
  lesson: "py-l4-testing-tooling",
  kind: "bug-report",
  headline: "a customer was charged twice",
  body: `Support has a customer whose card shows two identical charges for one invoice. The nightly
run reported the expected number of invoices, so nothing looked wrong in the logs.

\`billing/dispatch.py\` charges invoices through an injected \`gateway\`, which is why a test can
hand it a \`unittest.mock.Mock\` and read the call history. \`billing/ledger.py\` is read-only: it
records which invoices this process has already charged, and it is shared by every test in the
run.

\`dispatch(gateway, invoices)\` charges every invoice the ledger has not already recorded and
returns how many it charged. It reads the invoice rows it is handed and leaves them unchanged.

Two things to do, in this order:

1. Write the tests in \`tests/test_regression.py\`. Call the function as
   \`dispatch.dispatch(...)\` and keep \`run_tests(record)\` as the entry point.
2. Fix \`billing/dispatch.py\`.

\`tests/test_audit.py\` is read-only and grades the tests you write. It runs your suite against
several broken builds of \`dispatch\`, and against the code in the repo. Your suite has to fail
on every broken build and pass on the current one, so a test that asserts nothing specific is
rejected by name. It also runs your suite twice in a row without clearing the ledger between
runs.
`,
})

const BILLING_LEDGER = String.raw`"""Which invoices this process has already charged (read-only).

Every test in the run shares this record, so a test that does not clear it hands its leftovers
to the next one.
"""

charged_ids = set()


def already_charged(invoice_id):
    """Return True if this invoice has been charged since the last reset."""
    return invoice_id in charged_ids


def remember(invoice_id):
    """Record that this invoice has been charged."""
    charged_ids.add(invoice_id)


def reset():
    """Clear the record. Call this at the start of a test to isolate it."""
    charged_ids.clear()
`

const BILLING_DISPATCH_STARTER = String.raw`"""Charge every unpaid invoice through the injected gateway (see README.md)."""

from billing import ledger

# Generated change under review: the per-invoice work moved into _charge_one.


def _charge_one(gateway, invoice):
    """Charge one invoice and record it in the ledger."""
    gateway.charge(invoice["id"], invoice["cents"])
    ledger.remember(invoice["id"])


def dispatch(gateway, invoices):
    """Charge every invoice not already charged; return how many were charged."""
    # TODO: ticket CS-023 says one invoice reaches the gateway more than once.
    charged = 0
    for invoice in invoices:
        if ledger.already_charged(invoice["id"]):
            continue
        _charge_one(gateway, invoice)
        gateway.charge(invoice["id"], invoice["cents"])
        charged += 1
    return charged
`

const BILLING_DISPATCH_REFERENCE = String.raw`"""Charge every unpaid invoice through the injected gateway (see README.md)."""

from billing import ledger


def _charge_one(gateway, invoice):
    """Charge one invoice and record it in the ledger."""
    gateway.charge(invoice["id"], invoice["cents"])
    ledger.remember(invoice["id"])


def dispatch(gateway, invoices):
    """Charge every invoice not already charged; return how many were charged."""
    charged = 0
    for invoice in invoices:
        if ledger.already_charged(invoice["id"]):
            continue
        _charge_one(gateway, invoice)
        charged += 1
    return charged
`

const DISPATCH_TEST_REGRESSION_STARTER = String.raw`# Tests for ticket CS-023.
#
# Call the function as dispatch.dispatch(...) so the audit can swap builds under it.
# Keep run_tests(record) as the entry point, and keep the worked example below.

from unittest.mock import Mock, call

from billing import dispatch, ledger

INVOICES = [{"id": "inv-1", "cents": 500}, {"id": "inv-2", "cents": 250}]


def run_tests(record):
    def dispatch_reports_how_many_it_charged():
        ledger.reset()
        gateway = Mock()
        charged = dispatch.dispatch(gateway, INVOICES)
        assert charged == 2, f"two unpaid invoices should report 2, got {charged!r}"

    record("dispatch reports how many it charged", dispatch_reports_how_many_it_charged)

    # TODO: add the tests the ticket needs. The example above passes on the shipped code,
    # so it cannot be the one that catches the double charge.
    #
    # Define each test as a nested function, then register it with record("a name", the_function).
    # The audit tells you by name which broken build your suite still lets through.
`

const DISPATCH_TEST_REGRESSION_REFERENCE = String.raw`# Tests for ticket CS-023.
#
# Call the function as dispatch.dispatch(...) so the audit can swap builds under it.
# Keep run_tests(record) as the entry point, and keep the worked example below.

from unittest.mock import Mock, call

from billing import dispatch, ledger

INVOICES = [{"id": "inv-1", "cents": 500}, {"id": "inv-2", "cents": 250}]


def run_tests(record):
    def dispatch_reports_how_many_it_charged():
        ledger.reset()
        gateway = Mock()
        charged = dispatch.dispatch(gateway, INVOICES)
        assert charged == 2, f"two unpaid invoices should report 2, got {charged!r}"

    def each_invoice_reaches_the_gateway_once():
        ledger.reset()
        gateway = Mock()
        dispatch.dispatch(gateway, INVOICES)
        assert gateway.charge.call_count == 2, (
            f"two invoices should mean two charge calls, got {gateway.charge.call_count}"
        )

    def each_charge_carries_the_id_then_the_amount():
        ledger.reset()
        gateway = Mock()
        dispatch.dispatch(gateway, INVOICES)
        expected = [call("inv-1", 500), call("inv-2", 250)]
        assert gateway.charge.call_args_list == expected, (
            f"expected {expected!r}, got {gateway.charge.call_args_list!r}"
        )

    def an_invoice_already_charged_is_left_alone():
        ledger.reset()
        dispatch.dispatch(Mock(), INVOICES)
        gateway = Mock()
        charged = dispatch.dispatch(gateway, INVOICES)
        assert charged == 0, f"the second run should charge nothing, got {charged!r}"
        assert gateway.charge.call_count == 0, (
            f"a charged invoice should not be charged again, got "
            f"{gateway.charge.call_count} calls"
        )

    record("dispatch reports how many it charged", dispatch_reports_how_many_it_charged)
    record("each invoice reaches the gateway once", each_invoice_reaches_the_gateway_once)
    record("each charge carries the id then the amount", each_charge_carries_the_id_then_the_amount)
    record("an invoice already charged is left alone", an_invoice_already_charged_is_left_alone)
`

const DISPATCH_TEST_AUDIT = String.raw`"""Audit suite (read-only). It grades the tests you write in tests/test_regression.py.

It runs your suite against several broken builds of dispatch and against the code in the repo.
A suite that passes on a broken build did not test anything that build gets wrong, so each
failure message below names the build that got through. You do not have to read the machinery.
"""

from billing import dispatch, ledger

INVOICES = [{"id": "inv-1", "cents": 500}, {"id": "inv-2", "cents": 250}]


def _old_build(gateway, invoices):
    """Frozen copy of the build that shipped the double charge. Do not edit."""
    charged = 0
    for invoice in invoices:
        if ledger.already_charged(invoice["id"]):
            continue
        gateway.charge(invoice["id"], invoice["cents"])
        ledger.remember(invoice["id"])
        gateway.charge(invoice["id"], invoice["cents"])
        charged += 1
    return charged


def _never_charges(gateway, invoices):
    """Reports the right count and never touches the gateway."""
    return len([i for i in invoices if not ledger.already_charged(i["id"])])


def _ignores_the_ledger(gateway, invoices):
    """Charges every invoice it is handed, including ones already paid."""
    for invoice in invoices:
        gateway.charge(invoice["id"], invoice["cents"])
        ledger.remember(invoice["id"])
    return len(invoices)


def _swapped_args(gateway, invoices):
    """Passes the amount where the gateway expects the invoice id."""
    charged = 0
    for invoice in invoices:
        if ledger.already_charged(invoice["id"]):
            continue
        gateway.charge(invoice["cents"], invoice["id"])
        ledger.remember(invoice["id"])
        charged += 1
    return charged


def _run_suite(build, reset_first=True):
    """Run tests/test_regression.py once with dispatch.dispatch swapped for build."""
    from tests import test_regression

    outcomes = []

    def record(name, fn):
        try:
            fn()
            outcomes.append((name, True, ""))
        except Exception as exc:
            outcomes.append((name, False, str(exc) or type(exc).__name__))

    if reset_first:
        ledger.reset()
    original = dispatch.dispatch
    setattr(dispatch, "dispatch", build)
    try:
        test_regression.run_tests(record)
    except Exception as exc:
        outcomes.append(("run_tests raised outside a recorded test", False, str(exc)))
    finally:
        setattr(dispatch, "dispatch", original)
        ledger.reset()
    return outcomes


def _red_names(build):
    return [name for name, passed, _ in _run_suite(build) if not passed]


def run_tests(record):
    def your_suite_records_more_than_the_example():
        outcomes = _run_suite(dispatch.dispatch)
        assert len(outcomes) >= 2, (
            f"tests/test_regression.py recorded {len(outcomes)} test(s); the worked example "
            f"alone cannot catch the ticket, so register at least one more with record(name, fn)"
        )

    def your_suite_catches_the_double_charge():
        assert _red_names(_old_build), (
            "your suite passes on the build that charges every invoice twice; the count it "
            "returns is right on that build, so assert something the count cannot see"
        )

    def your_suite_rejects_a_gateway_that_is_never_called():
        assert _red_names(_never_charges), (
            "your suite passes on a build that never calls the gateway at all, so it is not "
            "yet asserting that any charge happened"
        )

    def your_suite_catches_a_recharged_invoice():
        assert _red_names(_ignores_the_ledger), (
            "your suite passes on a build that charges invoices the ledger already recorded; "
            "dispatch twice in one test and assert the second run charges nothing"
        )

    def your_suite_catches_the_wrong_arguments():
        assert _red_names(_swapped_args), (
            "your suite passes on a build that calls gateway.charge(cents, id); assert what "
            "the gateway was called WITH, not only how often"
        )

    def your_suite_passes_on_the_current_build():
        red = [
            f"{name}: {error}"
            for name, passed, error in _run_suite(dispatch.dispatch)
            if not passed
        ]
        assert not red, (
            "your suite fails on the current build, so now make the fix in "
            "billing/dispatch.py (" + "; ".join(red) + ")"
        )

    def your_suite_can_run_twice_in_a_row():
        _run_suite(dispatch.dispatch)
        red = [
            f"{name}: {error}"
            for name, passed, error in _run_suite(dispatch.dispatch, reset_first=False)
            if not passed
        ]
        assert not red, (
            "your suite passes on a clean ledger and fails on a second run, so its tests leak "
            "into each other; clear the shared state at the start of each one ("
            + "; ".join(red)
            + ")"
        )

    record("your suite records more than the example", your_suite_records_more_than_the_example)
    record("your suite catches the double charge", your_suite_catches_the_double_charge)
    record(
        "your suite rejects a gateway that is never called",
        your_suite_rejects_a_gateway_that_is_never_called,
    )
    record("your suite catches a recharged invoice", your_suite_catches_a_recharged_invoice)
    record("your suite catches the wrong arguments", your_suite_catches_the_wrong_arguments)
    record("your suite passes on the current build", your_suite_passes_on_the_current_build)
    record("your suite can run twice in a row", your_suite_can_run_twice_in_a_row)
`

const DISPATCH_TEST_HIDDEN = String.raw`"""Hidden checks on the repaired dispatch(), independent of the tests you wrote.

Your suite proves you can pin the ticket. These prove the repair holds on invoice counts and
mixes your tests never used. Each one clears the ledger first, so a leftover from one check
cannot decide another.
"""

from unittest.mock import Mock, call

from billing import dispatch, ledger


def _invoices(count):
    return [{"id": f"inv-{n}", "cents": n * 100} for n in range(1, count + 1)]


def run_tests(record):
    def every_invoice_is_charged_exactly_once():
        for count in [1, 3, 5]:
            ledger.reset()
            gateway = Mock()
            charged = dispatch.dispatch(gateway, _invoices(count))
            assert charged == count, f"expected {count} charged, got {charged!r}"
            assert gateway.charge.call_count == count, (
                f"{count} invoices should mean {count} charge calls, got "
                f"{gateway.charge.call_count}"
            )

    def the_gateway_gets_the_id_then_the_amount():
        ledger.reset()
        gateway = Mock()
        dispatch.dispatch(gateway, _invoices(3))
        expected = [call("inv-1", 100), call("inv-2", 200), call("inv-3", 300)]
        assert gateway.charge.call_args_list == expected, (
            f"expected {expected!r}, got {gateway.charge.call_args_list!r}"
        )

    def a_repeated_run_charges_nothing():
        ledger.reset()
        rows = _invoices(4)
        dispatch.dispatch(Mock(), rows)
        gateway = Mock()
        charged = dispatch.dispatch(gateway, rows)
        assert charged == 0, f"the second run should charge nothing, got {charged!r}"
        assert gateway.charge.call_count == 0, (
            f"expected 0 charge calls on the second run, got {gateway.charge.call_count}"
        )

    def only_the_new_invoices_are_charged():
        ledger.reset()
        dispatch.dispatch(Mock(), _invoices(2))
        gateway = Mock()
        charged = dispatch.dispatch(gateway, _invoices(4))
        assert charged == 2, f"only inv-3 and inv-4 are new, expected 2, got {charged!r}"
        expected = [call("inv-3", 300), call("inv-4", 400)]
        assert gateway.charge.call_args_list == expected, (
            f"expected {expected!r}, got {gateway.charge.call_args_list!r}"
        )

    def no_invoices_means_no_calls():
        ledger.reset()
        gateway = Mock()
        charged = dispatch.dispatch(gateway, [])
        assert charged == 0, f"an empty run should report 0, got {charged!r}"
        assert gateway.charge.call_count == 0, (
            f"an empty run should call the gateway 0 times, got {gateway.charge.call_count}"
        )

    def dispatch_leaves_the_invoice_rows_alone():
        ledger.reset()
        rows = _invoices(3)
        before = [dict(row) for row in rows]
        dispatch.dispatch(Mock(), rows)
        assert rows == before, f"dispatch must not change the rows it is handed, got {rows!r}"

    record("every invoice is charged exactly once", every_invoice_is_charged_exactly_once)
    record("the gateway gets the id then the amount", the_gateway_gets_the_id_then_the_amount)
    record("a repeated run charges nothing", a_repeated_run_charges_nothing)
    record("only the new invoices are charged", only_the_new_invoices_are_charged)
    record("no invoices means no calls", no_invoices_means_no_calls)
    record("dispatch leaves the invoice rows alone", dispatch_leaves_the_invoice_rows_alone)
`

export const testingToolingLesson: PythonLesson = {
  id: "py-l4-testing-tooling",
  title: "Mocking, coverage & modern tooling",
  summary: "Design code for testability, mock its dependencies, and know the modern tool stack.",
  estimatedMinutes: 55,
  difficulty: "hard",
  skills: ["mocking", "testing", "ruff", "mypy"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Why fake a dependency

A test that reaches out to the network, a database, or \`datetime.now()\` is slow, flaky, and non-deterministic. It goes red when the wifi drops, not when your code is wrong. The fix is a design choice, not a testing trick: pass collaborators in as arguments so a test can hand your function a stand-in it fully controls. That is dependency injection, and it is the single habit that makes code testable.

Compare a \`send_all\` that hard-codes its sender:

\`\`\`python
import smtplib

def send_all(messages):
    server = smtplib.SMTP("smtp.example.com")   # untestable: opens a real socket
    ...
\`\`\`

with the injectable version you build here, where \`sender\` arrives as a parameter. Now a test can supply any callable, including a mock.

## Mock: a recorder you assert against

\`unittest.mock.Mock\` is a stand-in that answers every attribute access and every call, and records what happened. You do not tell it what to return; you inspect it afterward. The demo below runs \`send_all(sender, ["a", "b"])\`, which calls \`sender("a")\` then \`sender("b")\` and returns \`2\`. That return is an ordinary \`int\` (\`len(messages)\`), because the mock is never asked for its own result.

After the run, the mock carries the whole call history:

\`\`\`python
sender.call_count            # 2
sender.assert_any_call("a")  # passes: "a" appears in the history
sender.call_args_list        # [call('a'), call('b')]
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "unconfigured-mock-return-value",
  "prompt": "The code under test does: result = client.fetch(user_id), then if result: save(result). Your test passes in a plain Mock() and never sets return_value. Does the save branch run?",
  "options": [
    {
      "label": "No. An unconfigured mock returns None, which is falsy",
      "feedback": "The most common wrong model of Mock, and it makes tests look far more meaningful than they are. Mock is built to answer everything, so returning None would defeat its whole design."
    },
    {
      "label": "Yes. The call returns another Mock, and a Mock is truthy",
      "correct": true,
      "feedback": "Right, and that is why a test like this passes whatever your code does. If the branch matters, configure the return explicitly with client.fetch.return_value."
    },
    {
      "label": "It raises AttributeError, because fetch was never configured on the mock",
      "feedback": "That is what you get from Mock(spec=Client) or create_autospec, which is exactly why those exist. A plain Mock invents any attribute you ask for, silently."
    },
    {
      "label": "No. The mock records the call instead of returning a value from it",
      "feedback": "It does record the call, and that recording is the point of a mock. Recording and returning are not alternatives though: every call is logged and also hands back a value."
    }
  ]
}
\`\`\`

This is why the Apply keeps \`sender\` as a parameter: its driver passes a recorder in and then asserts how you called it. The Practice works the same seam from the other side, on a billing service that takes its payment gateway as a parameter, and there the assertions on the recorder are yours to write.

The recorder answers a handful of different questions, and mixing them up is why mock assertions pass when they should not:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["You inspect", "It tells you", "Careful"],
  "rows": [
    ["m.call_count", "how many times it was called", "counts calls, not distinct arguments"],
    ["m.called", "whether it was called at all", "True even for a single call with wrong arguments"],
    ["m.assert_any_call(x)", "x appears somewhere in the history", "says nothing about order or count"],
    ["m.assert_called_once_with(x)", "exactly one call, and it was x", "the strictest of these, and usually the one you want"],
    ["m.call_args_list", "the full ordered history", "compare against [call(a), call(b)] to pin order"],
    ["m.return_value", "what the mock hands back", "defaults to another Mock, never to None"]
  ],
  "highlightCols": ["Careful"],
  "caption": "The last row causes the quietest bugs: an unconfigured mock returns another Mock, which is truthy, so a test asserting 'if result:' passes no matter what your code did. Any assert_called* method you misspell is also silently a no-op, because Mock happily invents attributes."
}
\`\`\`

## Pitfalls

A plain \`Mock\` answers to anything. Call a method that does not exist and it silently hands back another \`Mock\` instead of failing:

\`\`\`python
m = Mock()
m.snd("hi")   # typo of .send: no error, and the test still "passes"
\`\`\`

So a test can be green while production crashes. Two fixes: \`Mock(spec=Emailer)\` rejects attributes the real class does not have (\`m.snd\` now raises \`AttributeError\`), and \`create_autospec(Emailer)\` additionally checks call signatures, so calling \`send()\` with the wrong arguments raises \`TypeError\` inside the test.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "assert-called-with-checks-last-call",
  "prompt": "send_all(sender, ['a', 'b']) has just run, so the mock recorded two calls. Your test then asserts sender.assert_called_with('a'). What happens?",
  "options": [
    {
      "label": "It passes. 'a' was one of the calls, and that is what the method checks",
      "feedback": "The name really does read that way, which is why this one is missed in review. It checks the most recent call only, so with two calls it is asking about the second."
    },
    {
      "label": "It fails, because it only checks the most recent call, which was sender('b')",
      "correct": true,
      "feedback": "Right. Use assert_any_call when you mean somewhere in the history, or compare call_args_list against a list when you also care about the order."
    },
    {
      "label": "It passes, but only because call_count happens to be greater than one",
      "feedback": "Getting the direction backwards is understandable given how many of these methods there are. More calls make this assertion harder to satisfy, not easier, since only the last one is examined."
    },
    {
      "label": "It quietly does nothing, since assert methods on a Mock are no-ops",
      "feedback": "A sharp thing to be suspicious about: a MISSPELLED assert method really is a silent no-op, because Mock invents the attribute and returns another Mock. This name is spelled correctly, so it genuinely runs."
    }
  ]
}
\`\`\`

Also watch \`assert_called_with\`: it checks only the most recent call. After the demo, \`sender.assert_called_with("a")\` fails because the last call was \`sender("b")\`. Use \`assert_any_call\` when you mean "somewhere in the history."

When a collaborator cannot be injected, the fallback is \`unittest.mock.patch\`, and it has one rule that trips up nearly everybody:

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "patch-where-it-is-looked-up",
  "prompt": "myapp/service.py starts with: from myapp.clients import fetch_user, and get_profile() calls fetch_user(uid). Your test patches myapp.clients.fetch_user. What happens?",
  "options": [
    {
      "label": "The real function is replaced, since that is the module where it is defined",
      "feedback": "The intuition nearly everyone starts with, and the patch does succeed: it really does swap the attribute on myapp.clients. The problem is that service.py is no longer reading from there."
    },
    {
      "label": "Nothing is intercepted. The from-import already bound a reference in service, so you must patch myapp.service.fetch_user",
      "correct": true,
      "feedback": "Right. from X import Y copies the object into the importing module's namespace at import time, so patch where the name is looked up, not where it was defined."
    },
    {
      "label": "AttributeError, because fetch_user is not an attribute of myapp.clients",
      "feedback": "It is an attribute there, which is precisely what makes this quiet. patch only raises when the target name genuinely does not exist, and here it does."
    },
    {
      "label": "It works, but the patch leaks into later tests unless you use a context manager or decorator",
      "feedback": "Leaking is a real concern with patch.start() and no matching stop(). Both the decorator and the with-block undo themselves, so cleanup is not the issue here. The target path is."
    }
  ]
}
\`\`\`

## The modern tool stack

- \`ruff\`: one very fast tool that lints and formats, replacing \`flake8\`, \`isort\`, and \`black\`.
- \`mypy\` (or \`ty\`): reads your type hints and flags mismatches before runtime.
- \`pytest --cov\` (coverage.py): reports which lines your tests exercised. Cover the branches that matter, not a 100% badge.
- \`pre-commit\`: runs all of these on \`git commit\`, so nothing broken lands.

**Interview nuance:** know what a coverage number does not tell you. \`pytest --cov\` reports line coverage by default, so a line counts as covered the moment it runs once. An \`if\` with no \`else\` can show 100% while the case where the condition is false never executes. Add \`--cov-branch\` to require both directions of each branch, and remember that even full branch coverage only proves the lines ran, not that your assertions checked the right thing.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "what-100-percent-coverage-proves",
  "prompt": "Your PR reports 100 percent line coverage on the module you changed. What has that actually established?",
  "options": [
    {
      "label": "Every line ran at least once while the suite was executing",
      "correct": true,
      "feedback": "Right, and that is the entire claim. Coverage is a floor: it tells you what was definitely not exercised, and never that what ran was correct."
    },
    {
      "label": "Every branch was taken in both directions",
      "feedback": "That is a different measurement, and you have to ask for it with --cov-branch. An if with no else reaches 100 percent line coverage while the false path never runs once."
    },
    {
      "label": "The module has no untested behavior left in it",
      "feedback": "The reading that makes coverage targets so seductive to managers. Behavior is not lines: an unhandled empty list, a boundary value, an exception path with no raise in the suite are all uncovered behavior on fully covered lines."
    },
    {
      "label": "The assertions in those tests checked the right values",
      "feedback": "Nothing in the world can establish that from a coverage number. Delete every assert in the suite and coverage stays at 100 percent, which is the fastest way to see what the metric does not measure."
    }
  ],
  "reveal": "Each tool in the stack answers one narrow question. Coverage says which lines ran, mypy says which types cannot line up, and only your assertions say whether the answers were right. They catch different bugs, and none of the three substitutes for another."
}
\`\`\``,
    demoCode: `from unittest.mock import Mock


def send_all(sender, messages):
    for m in messages:
        sender(m)
    return len(messages)


sender = Mock()
print(send_all(sender, ["a", "b"]))   # 2
print(sender.call_count)              # 2`,
  },
  apply: {
    id: "py-l4-testing-tooling-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`send_all(sender, messages)\` to call the injected \`sender\` once per
message and return how many were sent. The provided \`run\` driver passes a recorder in as the
\`sender\`, so this rehearses the dependency injection the workspace step then verifies with a mock.

\`run(["a", "b", "c"])\` is \`3\`.`,
    starterCode: `def send_all(sender, messages):
    # Call sender(message) for each message; return how many were sent.
    pass


def run(messages):
    received = []
    return send_all(received.append, messages)`,
    hints: [
      "Loop the messages and call `sender(message)` for each.",
      "Keep a running count and return it.",
      "`sender` is whatever the caller injects; here `run` passes a list's `.append`.",
    ],
    referenceSolution: `def send_all(sender, messages):
    count = 0
    for message in messages:
        sender(message)
        count += 1
    return count


def run(messages):
    received = []
    return send_all(received.append, messages)`,
    testCases: [
      { input: { messages: ["a", "b", "c"] }, expected: 3, description: "three messages" },
      { input: { messages: [] }, expected: 0, description: "none" },
      { input: { messages: ["only"] }, expected: 1, description: "one message" },
    ],
  },
  practice: {
    id: "py-l4-testing-tooling-practice",
    executionMode: "workspace",
    prompt: `Write the tests for ticket CS-023 in \`tests/test_regression.py\`, then fix
\`billing/dispatch.py\`. A customer was charged twice for one invoice while the nightly run
reported the expected number of invoices. \`dispatch(gateway, invoices)\` takes its gateway as a
parameter, and \`billing/ledger.py\` is a record shared by every test in the run.

Call the function as \`dispatch.dispatch(...)\`. The read-only audit in \`tests/test_audit.py\` runs
your suite against several broken builds and against the current one, and names the ones your
suite still lets through. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "The count the nightly run reported was right, so nothing you can learn from the return value catches this ticket. Ask the mock what happened instead.",
      "A `Mock()` passed as the gateway records `gateway.charge.call_count` and `gateway.charge.call_args_list`, and comparing the list against `[call(...), call(...)]` pins how many calls happened, with which arguments, in which order.",
      "The ledger is shared and nothing clears it for you, so a suite without `ledger.reset()` at the start of each test passes once and then fails when the audit runs it a second time. Note also that one of the broken builds recharges rows that were already paid, which no single dispatch call can see.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "tests/test_regression.py",
      editableFilePaths: ["tests/test_regression.py", "billing/dispatch.py"],
      visibleTestPaths: ["tests/test_regression.py", "tests/test_audit.py"],
      hiddenTestPaths: ["tests/test_dispatch_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: DISPATCH_README },
        { path: "billing/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "billing/ledger.py",
          role: "readonly",
          language: "python",
          content: BILLING_LEDGER,
          description: "The shared record of charged invoices (read-only)",
        },
        {
          path: "billing/dispatch.py",
          role: "editable",
          language: "python",
          content: BILLING_DISPATCH_STARTER,
          description: "Repair dispatch here, after your tests are red",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_regression.py",
          role: "test",
          language: "python",
          content: DISPATCH_TEST_REGRESSION_STARTER,
          description: "Write your tests for CS-023 here",
        },
        {
          path: "tests/test_audit.py",
          role: "test",
          language: "python",
          content: DISPATCH_TEST_AUDIT,
          description: "Audit suite that grades the tests you write (read-only)",
        },
        {
          path: "tests/test_dispatch_hidden.py",
          role: "test",
          language: "python",
          content: DISPATCH_TEST_HIDDEN,
          hidden: true,
          description: "Hidden checks on the repaired dispatch()",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_regression", label: "visible regression" },
            { module: "test_audit", label: "visible audit" },
            { module: "test_dispatch_hidden", label: "hidden dispatch" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "tests/test_regression.py",
          role: "editable",
          language: "python",
          content: DISPATCH_TEST_REGRESSION_REFERENCE,
        },
        {
          path: "billing/dispatch.py",
          role: "editable",
          language: "python",
          content: BILLING_DISPATCH_REFERENCE,
        },
      ],
    },
  },
}

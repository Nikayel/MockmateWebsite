/**
 * L5 real-codebase module, lesson 1: "Find where the rule lives".
 *
 * Multi-file workspace lesson. One reported symptom (two user-facing surfaces disagree) is
 * traced to a business rule duplicated across layers, and the graded fix is delegation to
 * the layer that owns the rule. Apply: an orders service where checkout re-implemented the
 * documented shipping rule inline and drifted. Practice: a helpdesk where the ticket list
 * re-implemented the escalation rule and dropped a clause.
 *
 * Workspace contract (mirrors level3/level4): every package dir has an __init__.py; the
 * runner (role "test", hidden) prints __WORKSPACE_TEST_RESULTS__: + JSON; a suite label
 * containing the word "hidden" marks its rows hidden. The apply exercise runs three suites,
 * two visible and one hidden; the practice pairs one visible and one hidden suite. This file
 * only exports the lesson; the lead agent wires it into level5/index.ts inside the
 * "py-l5-real-codebases" module.
 */
import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"

const EMPTY_INIT = ""

interface RunnerSuite {
  /** Module name inside the workspace's tests package, imported by the runner. */
  module: string
  /** Suite label carried on every row. A label containing "hidden" marks its rows hidden. */
  label: string
}

/**
 * Build the workspace test runner.
 *
 * buildRunner is file-local in every workspace lesson (level3, level4, and each level5 module
 * declare their own; none of them import it), so its shape is this file's to choose. It takes a
 * list of suites rather than the fixed visible/hidden pair the earlier levels used, which lets the
 * apply exercise keep both of its visible suites AND add a hidden one. The record_factory contract
 * is unchanged and load-bearing: isHidden is derived from the label, so a hidden suite's label must
 * contain the word "hidden" and its file must be listed in hiddenTestPaths.
 */
function buildRunner(suites: RunnerSuite[]): string {
  const imports = suites.map((suite) => suite.module).join(", ")
  const invocations = suites
    .map((suite) => `${suite.module}.run_tests(record_factory("${suite.label}"))`)
    .join("\n")

  return String.raw`import json
import os
import sys
import traceback

sys.path.insert(0, os.getcwd())
from tests import ${imports}

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


${invocations}
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`
}

// ───────────────────────────────────────────────────────────────────────────
// Apply workspace: the orders service (cart preview vs checkout summary)
// ───────────────────────────────────────────────────────────────────────────

const APPLY_README = buildBrief({
  lesson: "py-l5-where-the-rule-lives",
  slot: "apply",
  kind: "bug-report",
  headline: "cart and checkout disagree on shipping",
  body: `Support ticket 4471: a customer with a 6000 cent cart saw a 599 cent shipping line in the
cart preview, then free shipping on the checkout summary. Oversized carts disagree between
the two screens as well.

The shipping rule is documented in \`orders/pricing.py\`, the one place the rule is supposed
to live. \`orders/cart.py\` and \`orders/checkout.py\` both show the customer a shipping
figure. The tests in \`tests/\` assert that both surfaces follow the documented rule.

Repair the disagreement. \`orders/pricing.py\` and \`orders/cart.py\` are read-only; only
\`orders/checkout.py\` may change. Checkout must take its shipping figure from the module that
owns the rule. Recomputing the figure in checkout leaves two copies of the rule in place, and
reading it off another surface that already displays one ties the payment screen to a
browsing screen.`,
})

const ORDERS_PRICING = String.raw`"""Shipping pricing rules.

This module is the one place the shipping rule lives. Cart, checkout, and any
future surface must call quote_shipping instead of copying the math.
"""

FREE_SHIPPING_THRESHOLD_CENTS = 7500
SHIPPING_FLAT_CENTS = 599
OVERSIZED_SURCHARGE_CENTS = 1299


def quote_shipping(subtotal_cents, oversized=False):
    """Return the shipping charge in cents for one cart.

    Oversized carts always pay the flat rate plus the surcharge. Everything
    else ships free at or above the threshold, otherwise at the flat rate.
    """
    if oversized:
        return SHIPPING_FLAT_CENTS + OVERSIZED_SURCHARGE_CENTS
    if subtotal_cents >= FREE_SHIPPING_THRESHOLD_CENTS:
        return 0
    return SHIPPING_FLAT_CENTS
`

const ORDERS_CART = String.raw`"""Cart preview: the panel shoppers see while they browse."""

from orders import pricing


def cart_preview(subtotal_cents, oversized=False):
    """Return the preview panel payload for one cart."""
    shipping_cents = pricing.quote_shipping(subtotal_cents, oversized)
    return {
        "subtotal_cents": subtotal_cents,
        "shipping_cents": shipping_cents,
        "total_cents": subtotal_cents + shipping_cents,
    }
`

const ORDERS_CHECKOUT_STARTER = String.raw`"""Checkout summary: the final screen before payment."""

# Generated change under review: shipping math added inline in last week's
# checkout change.


def checkout_summary(subtotal_cents, oversized=False):
    """Return the payment screen summary for one cart."""
    if subtotal_cents > 5000:
        shipping_cents = 0
    else:
        shipping_cents = 599
    return {
        "subtotal_cents": subtotal_cents,
        "shipping_cents": shipping_cents,
        "total_cents": subtotal_cents + shipping_cents,
    }
`

const ORDERS_CHECKOUT_REFERENCE = String.raw`"""Checkout summary: the final screen before payment."""

from orders import pricing


def checkout_summary(subtotal_cents, oversized=False):
    """Return the payment screen summary for one cart."""
    shipping_cents = pricing.quote_shipping(subtotal_cents, oversized)
    return {
        "subtotal_cents": subtotal_cents,
        "shipping_cents": shipping_cents,
        "total_cents": subtotal_cents + shipping_cents,
    }
`

const ORDERS_TEST_CART = String.raw`from orders.cart import cart_preview


def run_tests(record):
    def below_threshold_pays_flat():
        got = cart_preview(7499)["shipping_cents"]
        assert got == 599, f"a 7499 cart should ship for 599, got {got!r}"

    def at_threshold_ships_free():
        got = cart_preview(7500)["shipping_cents"]
        assert got == 0, f"a 7500 cart should ship free, got {got!r}"

    def oversized_pays_surcharge():
        got = cart_preview(8000, oversized=True)["shipping_cents"]
        assert got == 1898, f"an oversized 8000 cart should ship for 1898, got {got!r}"

    record("cart below the threshold pays the flat rate", below_threshold_pays_flat)
    record("cart at the threshold ships free", at_threshold_ships_free)
    record("oversized cart pays flat rate plus surcharge", oversized_pays_surcharge)
`

const ORDERS_TEST_CHECKOUT = String.raw`from orders.cart import cart_preview
from orders.checkout import checkout_summary


def run_tests(record):
    def agree(subtotal_cents, oversized):
        cart = cart_preview(subtotal_cents, oversized)["shipping_cents"]
        summary = checkout_summary(subtotal_cents, oversized)["shipping_cents"]
        assert summary == cart, (
            f"for subtotal {subtotal_cents} oversized={oversized} the cart ships for "
            f"{cart!r} but checkout charges {summary!r}"
        )

    def small_cart_agrees():
        agree(4999, False)

    def mid_cart_agrees():
        agree(6000, False)

    def threshold_cart_agrees():
        agree(7500, False)

    def oversized_cart_agrees():
        agree(8000, True)

    def small_oversized_cart_agrees():
        agree(3000, True)

    record("a 4999 cart agrees across surfaces", small_cart_agrees)
    record("a 6000 cart agrees across surfaces", mid_cart_agrees)
    record("a 7500 cart agrees across surfaces", threshold_cart_agrees)
    record("an oversized 8000 cart agrees across surfaces", oversized_cart_agrees)
    record("an oversized 3000 cart agrees across surfaces", small_oversized_cart_agrees)
`

/**
 * The hidden apply suite: it grades the lesson's thesis instead of the numbers.
 *
 * The visible suites compare values, so they pass for any checkout that produces the right prices,
 * including one that re-copies the whole rule inline and one that reads the figure off the cart
 * preview. Both are the drift this lesson is about. So this suite replaces the rule at runtime with
 * a stand-in whose prices exist nowhere in the codebase, and asserts checkout follows it: only a
 * checkout that asks orders.pricing for the number can. A tripwire on cart_preview catches the
 * other wrong repair, delegating sideways to a peer surface rather than up to the rule's owner.
 *
 * Patching orders.pricing.quote_shipping alone would miss a learner who wrote
 * `from orders.pricing import quote_shipping`, since that binds the original function into
 * checkout's namespace. _swap therefore also rebinds any name in the checkout module that IS the
 * original object, which covers plain imports, aliased imports, and module-attribute calls alike.
 */
const ORDERS_TEST_CHECKOUT_HIDDEN = String.raw`"""Hidden tests: they ask WHERE checkout gets its number, not what the number is."""

from orders import cart as cart_module
from orders import checkout as checkout_module
from orders import pricing as pricing_module

STAND_IN_FLAT_CENTS = 90003
STAND_IN_OVERSIZED_CENTS = 90007


def stand_in_quote_shipping(subtotal_cents, oversized=False):
    """A shipping rule that charges prices this codebase never charges."""
    return STAND_IN_OVERSIZED_CENTS if oversized else STAND_IN_FLAT_CENTS


def tripwire_cart_preview(subtotal_cents, oversized=False):
    raise AssertionError(
        "checkout_summary took its shipping figure from orders.cart.cart_preview. The cart "
        "preview is another surface, not the home of the rule, so checkout now depends on a "
        "sibling screen. Call the owner of the rule in orders/pricing.py instead."
    )


def _swap(module, attr, replacement):
    """Install replacement as module.attr, plus any name checkout bound to the original object."""
    original = getattr(module, attr)
    setattr(module, attr, replacement)
    rebound = [name for name, value in vars(checkout_module).items() if value is original]
    for name in rebound:
        setattr(checkout_module, name, replacement)
    return (module, attr, original, rebound)


def _restore(installed):
    module, attr, original, rebound = installed
    setattr(module, attr, original)
    for name in rebound:
        setattr(checkout_module, name, original)


def _summary_under(swaps, subtotal_cents, oversized):
    """Call checkout_summary with the given (module, attr, replacement) swaps in place."""
    installed = [_swap(*swap) for swap in swaps]
    try:
        return checkout_module.checkout_summary(subtotal_cents, oversized)
    finally:
        for entry in reversed(installed):
            _restore(entry)


STAND_IN_RULE = [
    (pricing_module, "quote_shipping", stand_in_quote_shipping),
    (cart_module, "cart_preview", tripwire_cart_preview),
]
CART_TRIPWIRE = [(cart_module, "cart_preview", tripwire_cart_preview)]


def run_tests(record):
    def follows_the_rules_owner():
        summary = _summary_under(STAND_IN_RULE, 6000, False)
        got = summary["shipping_cents"]
        assert got == STAND_IN_FLAT_CENTS, (
            "with the shipping rule replaced, a 6000 cart should have shipped for "
            f"{STAND_IN_FLAT_CENTS}, got {got!r}. checkout_summary is still deciding the price "
            "itself instead of asking the module that owns the rule."
        )
        total = summary["total_cents"]
        assert total == 6000 + STAND_IN_FLAT_CENTS, (
            "total_cents should be the subtotal plus the quoted shipping "
            f"({6000 + STAND_IN_FLAT_CENTS}), got {total!r}"
        )

    def forwards_the_oversized_flag():
        got = _summary_under(STAND_IN_RULE, 3000, True)["shipping_cents"]
        assert got == STAND_IN_OVERSIZED_CENTS, (
            "with the shipping rule replaced, an oversized 3000 cart should have shipped for "
            f"{STAND_IN_OVERSIZED_CENTS}, got {got!r}. Pass the oversized flag through to the "
            "rule and let it decide."
        )

    def does_not_read_the_cart_surface():
        got = _summary_under(CART_TRIPWIRE, 6000, False)["shipping_cents"]
        assert got == 599, f"a 6000 cart should ship for 599, got {got!r}"

    record("checkout follows the rule's owner when the rule changes", follows_the_rules_owner)
    record("checkout forwards the oversized flag to the rule", forwards_the_oversized_flag)
    record("checkout does not read shipping off the cart surface", does_not_read_the_cart_surface)
`

// ───────────────────────────────────────────────────────────────────────────
// Practice workspace: the helpdesk service (ticket list vs ticket page)
// ───────────────────────────────────────────────────────────────────────────

const PRACTICE_README = buildBrief({
  lesson: "py-l5-where-the-rule-lives",
  kind: "bug-report",
  headline: "list and page disagree about escalation",
  body: `Ticket 982 is priority urgent and 6 hours old. The ticket page shows it as Escalated, but
the ticket list shows it as Normal, so nobody picks it up.

The escalation rule is documented in \`helpdesk/rules.py\`, the authoritative definition.
\`helpdesk/ticket_page.py\` and \`helpdesk/ticket_list.py\` both display an escalation flag.

Repair the disagreement so both views follow the documented rule. Only
\`helpdesk/ticket_list.py\` may change.`,
})

const HELPDESK_RULES = String.raw`"""Escalation rules.

This module is the authoritative definition of escalation. Every view must
call is_escalated instead of copying the thresholds.
"""

ESCALATION_AGE_HOURS = 24
URGENT_ESCALATION_AGE_HOURS = 4


def is_escalated(ticket):
    """Return True when a ticket needs escalation."""
    if ticket["age_hours"] >= ESCALATION_AGE_HOURS:
        return True
    return ticket["priority"] == "urgent" and ticket["age_hours"] >= URGENT_ESCALATION_AGE_HOURS
`

const HELPDESK_TICKET_PAGE = String.raw`"""Ticket page: the full view of one ticket."""

from helpdesk import rules


def page_view(ticket):
    """Return the ticket page payload for one ticket."""
    return {
        "id": ticket["id"],
        "priority": ticket["priority"],
        "escalated": rules.is_escalated(ticket),
    }
`

const HELPDESK_TICKET_LIST_STARTER = String.raw`"""Ticket list: the queue view agents scan."""

# Generated change under review: escalation badge added inline when the list
# gained status badges.


def list_view(tickets):
    """Return one row per ticket for the queue table."""
    rows = []
    for ticket in tickets:
        rows.append(
            {
                "id": ticket["id"],
                "priority": ticket["priority"],
                "escalated": ticket["age_hours"] > 24,
            }
        )
    return rows
`

const HELPDESK_TICKET_LIST_REFERENCE = String.raw`"""Ticket list: the queue view agents scan."""

from helpdesk import rules


def list_view(tickets):
    """Return one row per ticket for the queue table."""
    rows = []
    for ticket in tickets:
        rows.append(
            {
                "id": ticket["id"],
                "priority": ticket["priority"],
                "escalated": rules.is_escalated(ticket),
            }
        )
    return rows
`

const HELPDESK_TEST_LIST = String.raw`from helpdesk.ticket_list import list_view
from helpdesk.ticket_page import page_view


def run_tests(record):
    def urgent_six_hour_ticket_agrees():
        ticket = {"id": "T-982", "priority": "urgent", "age_hours": 6}
        page = page_view(ticket)["escalated"]
        row = list_view([ticket])[0]["escalated"]
        assert row == page, f"the page says escalated={page!r} but the list row says {row!r}"

    def thirty_hour_ticket_escalates():
        ticket = {"id": "T-611", "priority": "normal", "age_hours": 30}
        row = list_view([ticket])[0]["escalated"]
        assert row is True, f"a 30 hour ticket must escalate in the list, got {row!r}"

    def three_hour_ticket_stays_normal():
        ticket = {"id": "T-720", "priority": "normal", "age_hours": 3}
        row = list_view([ticket])[0]["escalated"]
        assert row is False, f"a 3 hour normal ticket must not escalate, got {row!r}"

    record("the urgent 6 hour ticket agrees with the page", urgent_six_hour_ticket_agrees)
    record("a 30 hour ticket escalates in the list", thirty_hour_ticket_escalates)
    record("a 3 hour normal ticket stays normal", three_hour_ticket_stays_normal)
`

const HELPDESK_TEST_LIST_HIDDEN = String.raw`from helpdesk.ticket_list import list_view
from helpdesk.ticket_page import page_view

SWEEP = [
    {"id": "S-1", "priority": "normal", "age_hours": 0},
    {"id": "S-2", "priority": "normal", "age_hours": 4},
    {"id": "S-3", "priority": "normal", "age_hours": 23},
    {"id": "S-4", "priority": "normal", "age_hours": 24},
    {"id": "S-5", "priority": "normal", "age_hours": 25},
    {"id": "S-6", "priority": "urgent", "age_hours": 0},
    {"id": "S-7", "priority": "urgent", "age_hours": 3},
    {"id": "S-8", "priority": "urgent", "age_hours": 4},
    {"id": "S-9", "priority": "urgent", "age_hours": 5},
    {"id": "S-10", "priority": "urgent", "age_hours": 24},
]


def run_tests(record):
    def exactly_twenty_four_hours_escalates():
        ticket = {"id": "H-1", "priority": "normal", "age_hours": 24}
        row = list_view([ticket])[0]["escalated"]
        assert row is True, f"a ticket at exactly 24 hours must escalate, got {row!r}"

    def urgent_exactly_four_hours_escalates():
        ticket = {"id": "H-2", "priority": "urgent", "age_hours": 4}
        row = list_view([ticket])[0]["escalated"]
        assert row is True, f"an urgent ticket at exactly 4 hours must escalate, got {row!r}"

    def normal_twenty_three_hours_stays_normal():
        ticket = {"id": "H-3", "priority": "normal", "age_hours": 23}
        row = list_view([ticket])[0]["escalated"]
        assert row is False, f"a normal ticket at 23 hours must not escalate, got {row!r}"

    def list_agrees_with_page_on_a_sweep():
        rows = list_view(SWEEP)
        assert len(rows) == len(SWEEP), f"expected {len(SWEEP)} rows, got {len(rows)}"
        for ticket, row in zip(SWEEP, rows):
            page = page_view(ticket)["escalated"]
            assert row["escalated"] == page, (
                f"ticket {ticket['id']} disagrees: page says {page!r}, "
                f"list says {row['escalated']!r}"
            )

    record("a ticket at exactly 24 hours escalates", exactly_twenty_four_hours_escalates)
    record("an urgent ticket at exactly 4 hours escalates", urgent_exactly_four_hours_escalates)
    record("a normal ticket at 23 hours stays normal", normal_twenty_three_hours_stays_normal)
    record("the list agrees with the page across a sweep", list_agrees_with_page_on_a_sweep)
`

// ───────────────────────────────────────────────────────────────────────────
// The lesson
// ───────────────────────────────────────────────────────────────────────────

export const whereTheRuleLivesLesson: PythonLesson = {
  id: "py-l5-where-the-rule-lives",
  title: "Find where the rule lives",
  summary:
    "Trace one reported symptom across a small service to the duplicated business rule that drifted, then fix it in the layer that owns it.",
  estimatedMinutes: 24,
  difficulty: "medium",
  skills: ["code reading", "tracing", "code review", "minimal change"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## A repo is not a snippet

Up to now every exercise in this level fit in one file. This module hands you a small codebase instead: a file tree, a README that is the bug report, read-only modules you must not touch, and a test suite that is part of the code you are judging. The habits are the ones you already built, they just start one step earlier, because first you have to find the code worth judging. Before you edit anything, read the README, then the tests, then the files they point at.

## Follow the symptom, not the file

The report in this lesson says two surfaces disagree: the cart preview shows one shipping price and the checkout summary shows another for the same cart. The reflex is to open the screen named in the report and nudge its math until the numbers look right. Hold that reflex. A disagreement between two surfaces is evidence that one business rule is computed in more than one place, and you do not yet know which copy is wrong.

So trace before you edit. Start at each surface, follow its calls to the line where the disputed number is born, and search the repo for the rule's key constant. The pattern you are hunting looks like this, shown with a discount rule so the shipping trace stays yours to do:

\`\`\`python
# handlers/invoice.py
def invoice_total(subtotal_cents):
    if subtotal_cents >= 20000:      # inline copy of the discount rule
        return subtotal_cents - 2000
    return subtotal_cents
\`\`\`

\`\`\`python
# billing/discounts.py
def apply_discount(subtotal_cents):
    """The documented home of the volume discount rule."""
    if subtotal_cents >= 25000:
        return subtotal_cents - 2000
    return subtotal_cents
\`\`\`

One rule, two homes, two thresholds. Every symptom shaped like "screen A says one thing, screen B says another" ends at a fork like this one.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "first-move-two-views",
  "prompt": "The cart preview and the checkout summary disagree about shipping for the same cart. What is your first move?",
  "options": [
    {
      "label": "Open the file the report blames and correct its math",
      "feedback": "Tempting because the report names checkout, but a disagreement only proves the surfaces differ. Until you know where each number is computed, you cannot say which copy is wrong, so an edit here is a guess."
    },
    {
      "label": "Find every place a shipping figure is computed before editing anything",
      "correct": true,
      "feedback": "Right. A disagreement between two surfaces means at least two computations exist. The search comes before any edit, because the fix depends on knowing every copy and which one the codebase treats as the rule."
    },
    {
      "label": "Run the app and click through both screens to confirm the report",
      "feedback": "Feels like verification, but it only replays the symptom the report already gave you. Clicking shows that the surfaces disagree, not where each number is born or which copy drifted."
    },
    {
      "label": "Rewrite both views to share a brand new shipping module",
      "feedback": "Feels thorough, but it changes more than the diagnosis supports. The codebase may already have a documented home for the rule, and a rewrite risks breaking the healthy surface along with the broken one."
    }
  ]
}
\`\`\`

## Decide which copy is the contract

Two copies disagree, so one is the rule and the other is an accident. The codebase usually tells you which. Look for the module whose docstring claims ownership, the copy with its own dedicated tests, and the function other layers already import. When those signals point at the same place, that place is the contract. The inline copy has no docstring, no tests of its own, and no caller besides the screen it sits in.

This is worth naming because generated code drifts exactly this way. An assistant shown one file at a time cannot see the helper it should have called, so it re-implements the rule inline, matching the surrounding style so well that the diff looks clean. Review passes. Then the next legitimate rule change updates the documented copy only, and two screens quietly start disagreeing.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "which-copy-is-the-contract",
  "prompt": "You found two copies of the shipping rule and they disagree. How do you decide which copy is right?",
  "options": [
    {
      "label": "Trust the documented module with its own tests, the one other layers already call",
      "correct": true,
      "feedback": "Right. A docstring that claims ownership, a dedicated test file, and existing callers all say the codebase treats this copy as the rule. The inline copy has none of that standing, so it is the accident."
    },
    {
      "label": "Trust the newer looking code, since it reflects the latest intent",
      "feedback": "Recency feels like correctness, but the newest code here is the inline copy that drifted. Code written without finding the canonical helper is how the drift began, so age is not evidence in its favor."
    },
    {
      "label": "Trust the copy that matches what the reported page currently shows",
      "feedback": "This anchors on the symptom. The reported page is rendering the drifted copy's output, so matching it would canonize the bug and move the disagreement into the surface that was healthy."
    },
    {
      "label": "Trust whichever rule is cheaper for the customer",
      "feedback": "Product generosity is not a tiebreaker for drift. The price the business intends was already decided and documented. Review restores that decision, it does not get to revise it."
    }
  ]
}
\`\`\`

## Fix in the layer that owns the rule

The repair is not to make the inline copy correct. It is to make the inline copy stop existing. Delete the duplicated math and delegate to the owner:

\`\`\`python
# handlers/invoice.py, repaired
from billing.discounts import apply_discount


def invoice_total(subtotal_cents):
    return apply_discount(subtotal_cents)
\`\`\`

This is the minimal change in the sense that matters. Correcting the inline threshold would fix one instance of the bug and keep the bug class. Delegating removes the class: with one computation left, the surfaces cannot disagree again no matter how the rule changes next.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "classify-candidate-fixes",
  "prompt": "Checkout carries an inline copy of the shipping rule that drifted. Sort each candidate fix by what it does to the duplicate.",
  "buckets": ["removes the duplicate", "leaves the duplicate"],
  "items": [
    {
      "label": "Replace the inline math with a call to the pricing helper",
      "bucket": "removes the duplicate",
      "feedback": "One computation remains, so the surfaces cannot disagree again. The next rule change lands in one place and every caller inherits it."
    },
    {
      "label": "Update the inline threshold so it matches the documented one",
      "bucket": "leaves the duplicate",
      "feedback": "The numbers sync today and drift again on the next change. This fixes one instance of the bug while keeping the bug class alive."
    },
    {
      "label": "Copy the oversized branch into checkout as well",
      "bucket": "leaves the duplicate",
      "feedback": "Now three pieces of rule logic must move in lockstep forever, and nothing enforces that they do. More copying widens the surface that can drift."
    }
  ]
}
\`\`\`

## What to write down

A drift finding is only useful if the next reader can act on it. Three lines cover it:

- Both sites: the documented rule and the inline copy, named by file and function.
- The drift: which inputs the copies disagree on, with one concrete example.
- The fix and its layer: delegate from the copy's site to the rule's owner, and why that direction.

## Pitfalls

- Patching the stale number where it sits. The copies match today and drift again on the next rule change.
- Editing the canonical module to match the drifted copy. Now the healthy surface breaks, and its tests tell you so.
- Delegating sideways instead of to the owner. Checkout can ask the cart preview for the number, and the two screens will agree, but the payment screen now depends on a browsing screen and inherits every change made for the cart's benefit.
- Rewriting both layers into a new shared module when a one line delegation fixes the bug. Bigger diff, same behavior, more review risk.

**Interview nuance:** in a bug-fix round, saying "before I touch this, I want to know whether this rule is computed anywhere else" and then searching for the constant is a disproportionate seniority signal, because it shows you debug systems rather than lines. The quiet inline patch that makes the reported screen look right is the classic junior move, and interviewers seed drift bugs precisely to watch which one you reach for.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "drift-endgame",
  "prompt": "Next month the pricing team raises the free shipping threshold to 9900 cents in the pricing module. What happens to a checkout that kept its own inline copy of the rule?",
  "options": [
    {
      "label": "It silently disagrees with the cart again, and nothing fails until a customer notices",
      "correct": true,
      "feedback": "Right. Nothing connects the inline literal to the documented constant, so the change lands in one place and the surfaces split again. The silence is the danger: drift ships without an error."
    },
    {
      "label": "The import of the pricing module raises an error at startup",
      "feedback": "Nothing breaks loudly. The inline copy never imports the constant it duplicates, which is exactly why it could drift in the first place. No import, no error, no warning."
    },
    {
      "label": "The two constants stay in sync because they started with the same value",
      "feedback": "Two numbers that happen to be equal are not linked. Nothing in Python ties the literal in checkout to the constant in pricing, so the next edit to either one splits them apart."
    },
    {
      "label": "The type checker flags the mismatch between the two thresholds",
      "feedback": "Both copies are well typed integers, so every type checker is satisfied. Types catch shape mistakes, not value drift. Only a single source of truth or an agreement test catches this."
    }
  ],
  "reveal": "The habit, in order: start from the symptom, find every copy of the rule, pick the documented owner, make the other layers delegate to it, and keep one test that asserts the surfaces agree."
}
\`\`\``,
    demoCode: `# Two homes for one discount rule. billing/discounts.py is the documented
# owner; handlers/invoice.py grew an inline copy that drifted.
DOCUMENTED_THRESHOLD = 25000
INLINE_COPY_THRESHOLD = 20000
DISCOUNT_CENTS = 2000


def documented_total(subtotal_cents):
    if subtotal_cents >= DOCUMENTED_THRESHOLD:
        return subtotal_cents - DISCOUNT_CENTS
    return subtotal_cents


def inline_total(subtotal_cents):
    if subtotal_cents >= INLINE_COPY_THRESHOLD:
        return subtotal_cents - DISCOUNT_CENTS
    return subtotal_cents


print("subtotal  documented  inline  agree")
disagreements = []
for subtotal in [15000, 19999, 20000, 22500, 24999, 25000, 30000]:
    doc = documented_total(subtotal)
    inline = inline_total(subtotal)
    if doc != inline:
        disagreements.append(subtotal)
    print(f"{subtotal:>8}  {doc:>10}  {inline:>6}  {'yes' if doc == inline else 'NO'}")

print()
print(f"The copies disagree from {disagreements[0]} to {disagreements[-1]} cents.")
print("Same rule, two homes. The drift zone is where customers see two prices.")`,
  },
  apply: {
    id: "py-l5-where-the-rule-lives-apply",
    executionMode: "workspace",
    prompt: `Fix \`orders/checkout.py\` so it takes its shipping figure from the documented rule in
\`orders/pricing.py\` instead of computing one of its own, and so both surfaces agree for every
cart, including oversized items. Start with \`README.md\` for the bug report. Do not modify the
read-only files. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Read `README.md`, then follow the shipping figure: `cart_preview` and `checkout_summary` both produce one, so find where each gets it.",
      "Grep for the flat rate `599`: it appears in two files, and only `orders/pricing.py` is documented as the rule's home; the inline copy in checkout has a stale threshold and no oversized branch.",
      "Delete the inline math in `checkout_summary` and set `shipping_cents = pricing.quote_shipping(subtotal_cents, oversized)`.",
    ],
    workspace: {
      language: "python",
      // The brief's goal line is rendered as `Edit ${primaryFilePath}`, so this must be the
      // editable file. README.md is files[0], so it is still the first tab the learner sees.
      primaryFilePath: "orders/checkout.py",
      editableFilePaths: ["orders/checkout.py"],
      visibleTestPaths: ["tests/test_cart.py", "tests/test_checkout.py"],
      hiddenTestPaths: ["tests/test_checkout_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: APPLY_README },
        { path: "orders/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "orders/pricing.py",
          role: "readonly",
          language: "python",
          content: ORDERS_PRICING,
          description: "The documented shipping rule (read-only)",
        },
        {
          path: "orders/cart.py",
          role: "readonly",
          language: "python",
          content: ORDERS_CART,
          description: "Cart preview, delegates to pricing (read-only)",
        },
        {
          path: "orders/checkout.py",
          role: "editable",
          language: "python",
          content: ORDERS_CHECKOUT_STARTER,
          description: "Repair checkout_summary here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_cart.py",
          role: "test",
          language: "python",
          content: ORDERS_TEST_CART,
          description: "Visible cart tests",
        },
        {
          path: "tests/test_checkout.py",
          role: "test",
          language: "python",
          content: ORDERS_TEST_CHECKOUT,
          description: "Visible checkout tests",
        },
        {
          path: "tests/test_checkout_hidden.py",
          role: "test",
          language: "python",
          content: ORDERS_TEST_CHECKOUT_HIDDEN,
          hidden: true,
          description: "Hidden checkout tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_cart", label: "visible cart" },
            { module: "test_checkout", label: "visible checkout" },
            { module: "test_checkout_hidden", label: "hidden checkout" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "orders/checkout.py",
          role: "editable",
          language: "python",
          content: ORDERS_CHECKOUT_REFERENCE,
        },
      ],
    },
  },
  practice: {
    id: "py-l5-where-the-rule-lives-practice",
    executionMode: "workspace",
    prompt: `Your helpdesk's ticket list and ticket page disagree about which tickets are escalated.
Find the copy of the escalation rule that drifted and repair \`helpdesk/ticket_list.py\` so
both views agree with the documented rule in \`helpdesk/rules.py\`. Start with \`README.md\` for
the bug report. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Two views, one rule: find every place the escalation decision is computed before editing either view.",
      "`rules.is_escalated` has two clauses and the list copy has one, plus a `>` where the rule says `>=`.",
      "Replace the inline comparison in `list_view` with a call to `rules.is_escalated(ticket)`.",
    ],
    workspace: {
      language: "python",
      // See the apply workspace: primaryFilePath drives the brief's "Edit ..." goal line.
      primaryFilePath: "helpdesk/ticket_list.py",
      editableFilePaths: ["helpdesk/ticket_list.py"],
      visibleTestPaths: ["tests/test_list.py"],
      hiddenTestPaths: ["tests/test_list_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PRACTICE_README },
        {
          path: "helpdesk/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "helpdesk/rules.py",
          role: "readonly",
          language: "python",
          content: HELPDESK_RULES,
          description: "The documented escalation rule (read-only)",
        },
        {
          path: "helpdesk/ticket_page.py",
          role: "readonly",
          language: "python",
          content: HELPDESK_TICKET_PAGE,
          description: "Ticket page, delegates to rules (read-only)",
        },
        {
          path: "helpdesk/ticket_list.py",
          role: "editable",
          language: "python",
          content: HELPDESK_TICKET_LIST_STARTER,
          description: "Repair list_view here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_list.py",
          role: "test",
          language: "python",
          content: HELPDESK_TEST_LIST,
          description: "Visible list tests",
        },
        {
          path: "tests/test_list_hidden.py",
          role: "test",
          language: "python",
          content: HELPDESK_TEST_LIST_HIDDEN,
          hidden: true,
          description: "Hidden list tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_list", label: "visible list" },
            { module: "test_list_hidden", label: "hidden list" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "helpdesk/ticket_list.py",
          role: "editable",
          language: "python",
          content: HELPDESK_TICKET_LIST_REFERENCE,
        },
      ],
    },
  },
}

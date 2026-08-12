import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// Practice workspace: the shipping quote service
//
// Apply already covers "look a strategy up in a dict". Practice grades the two principles the
// teach section names but Apply never forces:
//
//  - open/closed, because the hidden suite registers a carrier the learner has never seen and
//    asserts the service prices it. A dispatcher written as if/elif on the code cannot pass.
//  - dependency inversion, because the service is handed its registry, and one hidden test passes
//    a fake registry holding carriers the real module does not have. A service that reaches for
//    the module directly cannot pass.
//
// The strategy also carries configuration (a rate card), so a bare module-level function is not a
// valid strategy: the factory has to close over the config it was built with.
//
// Two editable files, one per seam: the carrier (a self-registering strategy factory) and the
// service (resolution plus fallback). Neither can be left untouched.
// ───────────────────────────────────────────────────────────────────────────

const QUOTES_README = buildBrief({
  lesson: "py-l4-solid-patterns",
  kind: "ticket",
  headline: "onboard Glacier Freight",
  body: `We add a shipping carrier most weeks, and every time someone edits the dispatcher a released
carrier breaks. From this sprint on, a carrier is a module that registers itself, and the quote
service resolves carriers through a registry it is handed.

## How a carrier is built

\`dispatch/carriers/standard.py\` is the shape to follow. A carrier module defines a **factory**
that takes that carrier's config and returns a function of one parcel, then registers the factory
under its code. \`dispatch/carriers/__init__.py\` imports every module in that directory, so a new
carrier file is loaded without any existing file changing.

A parcel is \`{"weight_grams": int, "zone": int}\`. Every quote is a whole number of cents.

## The Glacier Freight rate card

Config lives in \`dispatch/rates.py\` under \`"glacier"\`.

- Chargeable weight is the parcel weight rounded **up** to whole kilos, and never less than 1 kilo.
- Price is \`base_cents\` plus \`coolant_cents\` for each chargeable kilo.
- Zones at or above \`remote_zone_from\` add \`remote_surcharge_cents\` once.

## The quote service

\`quote_parcel(code, parcel, registry, configs)\` returns the price in cents. A code that is not
registered quotes at \`FALLBACK_CODE\` instead of raising, and the fallback's config is read under
the code actually used.

Both \`dispatch/carriers/glacier.py\` and \`dispatch/quotes.py\` need work.
`,
})

const QUOTES_REGISTRY = String.raw`"""The carrier registry: the one place a code maps to a carrier factory.

Carrier modules call register_carrier at import time. Nothing here knows any
carrier by name, so onboarding a carrier never edits this file.
"""

_FACTORIES = {}


def register_carrier(code, factory):
    """Register factory under code and return it, so the call can decorate."""
    _FACTORIES[code] = factory
    return factory


def lookup(code):
    """Return the factory registered under code, or None."""
    return _FACTORIES.get(code)


def carrier_codes():
    """Return every registered code, sorted."""
    return sorted(_FACTORIES)
`

const QUOTES_CARRIERS_INIT = String.raw`"""Every module in this package is a carrier and is imported on package load.

This is what makes onboarding additive: dropping a carrier module in this
directory registers it, and no existing file changes.
"""

import importlib
import pkgutil

for _found in pkgutil.iter_modules(__path__):
    importlib.import_module(__name__ + "." + _found.name)
`

const QUOTES_CARRIER_STANDARD = String.raw`"""Standard Post: the fallback carrier, and the shape every carrier follows."""

from dispatch.registry import register_carrier


def build_quote(config):
    """Return a quote function bound to this carrier's config."""
    base_cents = config["base_cents"]
    per_kg_cents = config["per_kg_cents"]

    def quote(parcel):
        kilos = -(-parcel["weight_grams"] // 1000)
        return base_cents + per_kg_cents * kilos

    return quote


register_carrier("standard", build_quote)
`

const QUOTES_RATES = String.raw`"""Rate cards, keyed by carrier code. Ops edits this file, engineers do not."""

CONFIGS = {
    "standard": {"base_cents": 500, "per_kg_cents": 180},
    "glacier": {
        "base_cents": 900,
        "coolant_cents": 250,
        "remote_zone_from": 4,
        "remote_surcharge_cents": 700,
    },
}
`

const QUOTES_GLACIER_STARTER = String.raw`"""Glacier Freight: cold-chain carrier. Rate card is in README.md."""

from dispatch.registry import register_carrier


def build_quote(config):
    """Return a quote function bound to this carrier's config (see README.md)."""
    # TODO: return a function of one parcel that prices it from this config, and
    # make this module register itself under the code "glacier".
    return None
`

const QUOTES_GLACIER_REFERENCE = String.raw`"""Glacier Freight: cold-chain carrier. Rate card is in README.md."""

from dispatch.registry import register_carrier


def build_quote(config):
    """Return a quote function bound to this carrier's config."""
    base_cents = config["base_cents"]
    coolant_cents = config["coolant_cents"]
    remote_zone_from = config["remote_zone_from"]
    remote_surcharge_cents = config["remote_surcharge_cents"]

    def quote(parcel):
        kilos = max(1, -(-parcel["weight_grams"] // 1000))
        price = base_cents + coolant_cents * kilos
        if parcel["zone"] >= remote_zone_from:
            price += remote_surcharge_cents
        return price

    return quote


register_carrier("glacier", build_quote)
`

const QUOTES_SERVICE_STARTER = String.raw`"""The quote service: a carrier code and a parcel in, a price in cents out."""

FALLBACK_CODE = "standard"


def quote_parcel(code, parcel, registry, configs):
    """Return the price in cents for one parcel (see README.md)."""
    # TODO: resolve the carrier through the registry you were handed, fall back
    # when the code is not registered, and price the parcel with the carrier's config.
    return 0
`

const QUOTES_SERVICE_REFERENCE = String.raw`"""The quote service: a carrier code and a parcel in, a price in cents out."""

FALLBACK_CODE = "standard"


def resolve_code(code, registry):
    """Return code when it is registered, otherwise the fallback code."""
    return code if registry.lookup(code) is not None else FALLBACK_CODE


def quote_parcel(code, parcel, registry, configs):
    """Return the price in cents for one parcel."""
    resolved = resolve_code(code, registry)
    factory = registry.lookup(resolved)
    quote = factory(configs[resolved])
    return quote(parcel)
`

const QUOTES_TEST = String.raw`from dispatch import registry
from dispatch.carriers import glacier
from dispatch.quotes import quote_parcel
from dispatch.rates import CONFIGS


def run_tests(record):
    def standard_still_quotes():
        parcel = {"weight_grams": 2300, "zone": 2}
        got = quote_parcel("standard", parcel, registry, CONFIGS)
        assert got == 1040, f"expected 1040 cents for the standard 2300g parcel, got {got!r}"

    def glacier_registers_itself():
        got = registry.lookup("glacier")
        assert got is not None, (
            "expected registry.lookup('glacier') to return the Glacier factory, got None. "
            "Importing the carrier module must be enough to register it."
        )

    def glacier_factory_returns_a_quote_function():
        quote = glacier.build_quote(CONFIGS["glacier"])
        assert callable(quote), f"expected build_quote to return a callable, got {quote!r}"
        got = quote({"weight_grams": 1000, "zone": 1})
        assert got == 1150, f"expected 1150 cents for a 1kg zone 1 parcel, got {got!r}"

    def each_config_gets_its_own_quote_function():
        cheap = glacier.build_quote(
            {
                "base_cents": 100,
                "coolant_cents": 10,
                "remote_zone_from": 9,
                "remote_surcharge_cents": 1,
            }
        )
        standard_card = glacier.build_quote(CONFIGS["glacier"])
        parcel = {"weight_grams": 1000, "zone": 5}
        cheap_price = cheap(parcel)
        assert cheap_price == 110, f"expected 110 cents on the cheap rate card, got {cheap_price!r}"
        card_price = standard_card(parcel)
        assert card_price == 1850, (
            f"expected 1850 cents on the real rate card, got {card_price!r}. "
            "Each quote function must use the config it was built with."
        )

    def glacier_quotes_through_the_service():
        parcel = {"weight_grams": 2600, "zone": 5}
        got = quote_parcel("glacier", parcel, registry, CONFIGS)
        assert got == 2350, f"expected 2350 cents for the glacier 2600g zone 5 parcel, got {got!r}"

    record("standard post still quotes", standard_still_quotes)
    record("the glacier module registers itself", glacier_registers_itself)
    record("build_quote returns a quote function", glacier_factory_returns_a_quote_function)
    record("each config gets its own quote function", each_config_gets_its_own_quote_function)
    record("glacier quotes through the service", glacier_quotes_through_the_service)
`

/**
 * The hidden suite grades the two principles, not the arithmetic.
 *
 * `a_brand_new_carrier_needs_no_dispatch_change` registers a code that exists nowhere in the
 * workspace and prices a parcel with it: a `quote_parcel` written as `if code == "standard" ...
 * elif code == "glacier"` returns the fallback price and fails here, which is the point.
 *
 * The two fake-registry tests hand the service a registry object the real module knows nothing
 * about, so a service that imports `dispatch.registry` itself instead of using the argument
 * resolves the wrong carriers. The second one also pins that the fallback is resolved through the
 * injected registry, and that the config is read under the code actually used.
 */
const QUOTES_TEST_HIDDEN = String.raw`from dispatch import registry
from dispatch.carriers import glacier  # noqa: F401  (import registers the carrier)
from dispatch.quotes import quote_parcel
from dispatch.rates import CONFIGS


def build_drone_quote(config):
    """A carrier onboarded after the learner wrote the dispatcher."""
    flat_cents = config["flat_cents"]

    def quote(parcel):
        return flat_cents + parcel["zone"]

    return quote


class FakeRegistry:
    """A registry the real module has never heard of."""

    def __init__(self, factories):
        self._factories = factories

    def lookup(self, code):
        return self._factories.get(code)


def build_flat_quote(config):
    def quote(parcel):
        return config["flat_cents"]

    return quote


FAKE = FakeRegistry({"featherlite": build_flat_quote, "standard": build_flat_quote})
FAKE_CONFIGS = {"featherlite": {"flat_cents": 4242}, "standard": {"flat_cents": 777}}


def run_tests(record):
    def a_brand_new_carrier_needs_no_dispatch_change():
        registry.register_carrier("drone", build_drone_quote)
        configs = dict(CONFIGS)
        configs["drone"] = {"flat_cents": 3000}
        got = quote_parcel("drone", {"weight_grams": 400, "zone": 6}, registry, configs)
        assert got == 3006, (
            f"expected 3006 cents from the newly registered drone carrier, got {got!r}. "
            "quote_parcel must price whatever the registry holds, without naming carriers."
        )

    def the_injected_registry_is_the_one_used():
        got = quote_parcel("featherlite", {"weight_grams": 1000, "zone": 1}, FAKE, FAKE_CONFIGS)
        assert got == 4242, (
            f"expected 4242 cents from the injected registry's featherlite carrier, got {got!r}. "
            "quote_parcel must resolve through the registry argument."
        )

    def the_fallback_resolves_through_the_injected_registry():
        got = quote_parcel("nope", {"weight_grams": 1000, "zone": 1}, FAKE, FAKE_CONFIGS)
        assert got == 777, (
            f"expected 777 cents from the injected registry's fallback carrier, got {got!r}. "
            "An unregistered code quotes at FALLBACK_CODE, resolved through the same registry."
        )

    def an_unregistered_code_quotes_at_the_fallback():
        parcel = {"weight_grams": 2300, "zone": 2}
        got = quote_parcel("hyperloop", parcel, registry, CONFIGS)
        assert got == 1040, (
            f"expected the standard price of 1040 cents for an unregistered code, got {got!r}"
        )

    def a_light_parcel_pays_one_whole_kilo():
        quote = glacier.build_quote(CONFIGS["glacier"])
        got = quote({"weight_grams": 0, "zone": 2})
        assert got == 1150, (
            f"expected 1150 cents for a 0g parcel, got {got!r}. Chargeable weight is never "
            "less than 1 kilo."
        )

    def the_remote_zone_boundary_is_inclusive():
        quote = glacier.build_quote(CONFIGS["glacier"])
        inside = quote({"weight_grams": 1000, "zone": 3})
        assert inside == 1150, f"expected 1150 cents in zone 3, got {inside!r}"
        boundary = quote({"weight_grams": 1000, "zone": 4})
        assert boundary == 1850, (
            f"expected 1850 cents in zone 4, got {boundary!r}. The surcharge applies at "
            "remote_zone_from, not past it."
        )

    record("a brand new carrier needs no dispatch change", a_brand_new_carrier_needs_no_dispatch_change)
    record("the injected registry is the one used", the_injected_registry_is_the_one_used)
    record("the fallback resolves through the injected registry", the_fallback_resolves_through_the_injected_registry)
    record("an unregistered code quotes at the fallback", an_unregistered_code_quotes_at_the_fallback)
    record("a light parcel pays one whole kilo", a_light_parcel_pays_one_whole_kilo)
    record("the remote zone boundary is inclusive", the_remote_zone_boundary_is_inclusive)
`

export const solidPatternsLesson: PythonLesson = {
  id: "py-l4-solid-patterns",
  title: "SOLID & design patterns (factory, strategy)",
  summary: "Refactor toward SOLID with pluggable strategies selected by a factory.",
  estimatedMinutes: 50,
  difficulty: "hard",
  skills: ["solid", "strategy-pattern", "factory-pattern", "design"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Why SOLID shows up in code review

Almost every service has a spot where behavior branches by a key: pick a discount by customer tier, a parser by file type, a shipping rate by region. It usually starts as a three-line \`if/elif\`. A year later it is forty branches, every teammate edits the same function, and every edit risks breaking a case that already worked. **SOLID** is five design principles for arranging code so that new behavior is additive instead of invasive. Two of them do most of the work here.

- **S**ingle responsibility: each function or class has one reason to change.
- **O**pen/closed: code is open to extension but closed to modification. You add a case by adding code, not by editing code that already passed its tests.

The other three matter less here but come up in review, so it is worth being able to name all five:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Principle", "In one line", "The smell it names"],
  "rows": [
    ["S: single responsibility", "one reason to change", "a class that both parses and saves, so two teams edit it"],
    ["O: open/closed", "extend by adding, not by editing", "the forty-branch if/elif nobody dares touch"],
    ["L: Liskov substitution", "a subtype must work anywhere its base does", "a subclass that raises NotImplementedError on an inherited method"],
    ["I: interface segregation", "many small interfaces beat one fat one", "implementers stubbing methods they never needed"],
    ["D: dependency inversion", "depend on the abstraction, not the concrete type", "a service that builds its own DB client, so tests cannot swap it"]
  ],
  "highlightCols": ["The smell it names"],
  "caption": "The highlighted column is the useful half. Almost nobody recalls the five letters under pressure, but everyone recognises the smells, and each smell is what the principle was written to describe."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "which-principle-blocks-the-test",
  "prompt": "OrderService builds its own Postgres client inside __init__, so a unit test has no way to swap in a fake. Which principle does that break first?",
  "options": [
    {
      "label": "Single responsibility, because the class both connects to the database and processes orders",
      "feedback": "Tempting, and it is the answer most people reach for because SRP is the one principle everyone remembers. Constructing a dependency is not really a second responsibility, though. The blocker is that the caller cannot supply a different one."
    },
    {
      "label": "Dependency inversion, because the service depends on the concrete client instead of an abstraction it is handed",
      "correct": true,
      "feedback": "Right. Take the client as a constructor argument and the test passes a fake, the production code passes the real one, and OrderService stops caring which it got."
    },
    {
      "label": "Open/closed, because you have to edit OrderService to test it",
      "feedback": "Close, and the two often travel together, since inverted dependencies are what make extension cheap. But open/closed is about adding new behavior without editing, and here the problem is that the dependency is hard-wired at all."
    },
    {
      "label": "Interface segregation, because the client exposes more methods than OrderService uses",
      "feedback": "That is a real smell and worth naming in review, but it is not what stops the test. Even a one-method client would still be unswappable while the service constructs it itself."
    }
  ]
}
\`\`\`

A long \`if/elif\` chain violates open/closed: every new tier reopens \`price_for\` and puts a tested function back on the table. Two patterns remove the chain.

### Strategy: behavior as a value

A **strategy** is one interchangeable unit of behavior. In Python, functions are first-class objects, so the simplest strategy is just a function you can store and pass around:

\`\`\`python
def regular(a):
    return round(a, 2)

def member(a):
    return round(a * 0.9, 2)   # 10% off
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "strategy-signature-is-the-contract",
  "prompt": "A teammate adds a bulk tier whose discount depends on the item count, so they write def bulk(amount, count) and register it next to the others. The caller still does strategy(amount). What happens for a bulk customer?",
  "options": [
    {
      "label": "It works. A dict can hold any callable, so bulk is a perfectly good value to store",
      "feedback": "Half right, and that is why the bug ships: the dict genuinely accepts it and the registration line looks fine. The mismatch only surfaces at the call, where one argument is passed and two are required."
    },
    {
      "label": "TypeError, because bulk is missing a required positional argument",
      "correct": true,
      "feedback": "Right. The shared signature is the real interface here, not the dict. A strategy that needs extra data has to get it another way, for example by being a closure that already captured the count."
    },
    {
      "label": "count silently defaults to None and the price comes back wrong",
      "feedback": "That would happen if the parameter had been written as count=None, which is a real and worse failure mode because it is silent. As written there is no default, so Python refuses the call outright."
    },
    {
      "label": "Only the type checker complains, since Python does not enforce arity at runtime",
      "feedback": "Python is loose about types but strict about arity: the call itself is rejected before the body runs. Annotations are unenforced at runtime, argument counts are not."
    }
  ]
}
\`\`\`

Each strategy has the same shape (\`amount\` in, price out), so a caller can swap one for another without knowing which one it holds.

### Factory: pick the strategy by key

A **factory** maps a key to a strategy so the caller never sees the choices:

\`\`\`python
STRATEGIES = {"regular": regular, "member": member}

def price_for(kind, amount):
    strategy = STRATEGIES.get(kind, regular)  # default to full price
    return strategy(amount)

print(price_for("member", 100))   # 90.0
\`\`\`

Adding a \`vip\` tier is one new function plus one dict entry. \`price_for\` itself never changes. That is open/closed in three lines, and it is exactly what you will build: first inline in the Apply, then across a multi-file package in the Practice.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "dispatch-table-raises-or-prices",
  "prompt": "Four versions of the same dispatch, all with price_for(kind, amount) calling strategy(amount). Sort each by what the customer sees.",
  "buckets": ["Blows up", "Returns a price"],
  "items": [
    {
      "label": "STRATEGIES = {'member': member}, then STRATEGIES.get('member', regular)(100)",
      "bucket": "Returns a price",
      "feedback": "The dict stores the function object itself, so the lookup hands back something callable and calling it with 100 gives 90.0."
    },
    {
      "label": "STRATEGIES = {'member': member(100)}, then STRATEGIES.get('member', regular)(100)",
      "bucket": "Blows up",
      "feedback": "member(100) ran while the dict was being built, so the value stored is the float 90.0. Calling it raises TypeError: 'float' object is not callable."
    },
    {
      "label": "STRATEGIES['student'](100), where no student key was ever registered",
      "bucket": "Blows up",
      "feedback": "Square-bracket lookup on a missing key raises KeyError, and a new tier reaching checkout before someone registers it is exactly how that ships."
    },
    {
      "label": "STRATEGIES.get('student', regular)(100), where no student key was ever registered",
      "bucket": "Returns a price",
      "feedback": "The default argument to get is the safety net: an unregistered tier falls back to regular and pays full price instead of crashing checkout."
    }
  ]
}
\`\`\`

### Two traps interns hit

Store the function, not its result. \`{"member": member}\` stores the callable; \`{"member": member(100)}\` calls it immediately and stores the number \`90.0\`, so a later \`strategy(amount)\` raises \`TypeError: 'float' object is not callable\`.

Handle the unknown key. \`STRATEGIES[kind]\` raises \`KeyError\` for a tier you have not registered. Use \`STRATEGIES.get(kind, regular)\` so an unknown \`kind\` falls back to full price, which is what the exercises require.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "why-the-table-beats-the-chain",
  "prompt": "You are in review defending the dispatch table over the if/elif chain, and there are only five tiers. What is the strongest argument?",
  "options": [
    {
      "label": "One hash lookup instead of up to five comparisons, so pricing gets faster",
      "feedback": "True on paper and the first thing most candidates say, but five string comparisons are nanoseconds and nobody profiled this. Leading with speed signals that you reach for micro-optimisation before design."
    },
    {
      "label": "Adding a tier touches zero existing lines, so nothing that already passes can regress",
      "correct": true,
      "feedback": "Right. Open/closed is a blast-radius argument, not a speed one. That is also why routers, command handlers, and plugin registries all end up as dispatch tables."
    },
    {
      "label": "The dict version is shorter, so there is less code to read",
      "feedback": "Often true, and brevity is worth something, but it is a weak defence: someone can always rewrite the chain into a compact ternary and your argument evaporates. Blast radius survives that rewrite."
    }
  ],
  "reveal": "Both answers are correct facts. Only one of them is a reason. The dispatch table wins because adding behavior stops being an edit to code that already works, which is the entire point of open/closed."
}
\`\`\`

**Interview nuance:** an \`if/elif\` chain does up to \`k\` comparisons for \`k\` branches, while the dict dispatch is one average-case \`O(1)\` hash lookup no matter how many strategies exist. But interviewers care more about the design consequence than the constant factor: with the table, adding a strategy touches zero existing lines, so nothing that already passed can regress. Named dispatch tables like this are how real routers, command handlers, and plugin registries stay open for extension as they grow.`,
    demoCode: `def regular(a):
    return round(a, 2)


def member(a):
    return round(a * 0.9, 2)


STRATEGIES = {"regular": regular, "member": member}
print(STRATEGIES.get("member", regular)(100))   # 90.0`,
  },
  apply: {
    id: "py-l4-solid-patterns-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`price_for(kind, amount)\` that applies a discount by \`kind\`. \`regular\`
is full price, \`member\` is 10% off, \`vip\` is 20% off, and any unknown kind is full price. Round to
2 decimals.

\`price_for("member", 100)\` is \`90\`; \`price_for("vip", 100)\` is \`80\`.`,
    starterCode: `def price_for(kind, amount):
    # Map kind -> rate (regular 1.0, member 0.9, vip 0.8; default 1.0), then apply.
    pass`,
    hints: [
      'Use a dict of rates: `{"regular": 1.0, "member": 0.9, "vip": 0.8}`.',
      "Look up with a default: `rates.get(kind, 1.0)`.",
      "`return round(amount * rates.get(kind, 1.0), 2)`.",
    ],
    referenceSolution: `def price_for(kind, amount):
    rates = {"regular": 1.0, "member": 0.9, "vip": 0.8}
    return round(amount * rates.get(kind, 1.0), 2)`,
    testCases: [
      { input: { kind: "regular", amount: 100 }, expected: 100, description: "full price" },
      { input: { kind: "member", amount: 100 }, expected: 90, description: "10% off" },
      { input: { kind: "vip", amount: 100 }, expected: 80, description: "20% off" },
      {
        input: { kind: "mystery", amount: 100 },
        expected: 100,
        description: "unknown is full price",
      },
    ],
  },
  practice: {
    id: "py-l4-solid-patterns-practice",
    executionMode: "workspace",
    prompt: `Implement the Glacier Freight carrier in \`dispatch/carriers/glacier.py\` and the quote service
in \`dispatch/quotes.py\`. Ops onboards a carrier most weeks, so the standing rule is that adding
one must not edit \`quote_parcel\`: a carrier registers itself, and the service resolves carriers
through the registry it is handed. A code that is not registered must quote at the fallback
carrier rather than raise. \`README.md\` carries the ticket and the Glacier rate card. Some tests
are hidden.`,
    starterCode: "",
    hints: [
      "Two things are missing. Nothing has registered a carrier under `glacier`, and `quote_parcel` never asks the registry it was handed for anything.",
      "A carrier module registers a factory that takes its config and returns a function closing over it, so `dispatch/carriers/standard.py` is the shape to copy. In the service, resolve the code first: if the lookup comes back `None`, quote under `FALLBACK_CODE` instead, and read the config under whichever code you ended up using.",
      "Two gotchas. The `register_carrier` call has to run when the module is imported rather than from inside `build_quote`, because the package import is the only thing that ever touches a new carrier file. And in the service, `configs` has to be indexed by the code you resolved to, not the code you were asked for, or a fallback quote prices an unknown carrier against a config that does not exist. Glacier's chargeable weight also has a floor that Standard Post does not have, so a 200g parcel still bills a whole kilo.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "dispatch/carriers/glacier.py",
      editableFilePaths: ["dispatch/carriers/glacier.py", "dispatch/quotes.py"],
      visibleTestPaths: ["tests/test_quotes.py"],
      hiddenTestPaths: ["tests/test_quotes_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: QUOTES_README },
        { path: "dispatch/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "dispatch/registry.py",
          role: "readonly",
          language: "python",
          content: QUOTES_REGISTRY,
          description: "The carrier registry (read-only)",
        },
        {
          path: "dispatch/rates.py",
          role: "readonly",
          language: "python",
          content: QUOTES_RATES,
          description: "Rate cards by carrier code (read-only)",
        },
        {
          path: "dispatch/carriers/__init__.py",
          role: "readonly",
          language: "python",
          content: QUOTES_CARRIERS_INIT,
          description: "Loads every carrier module (read-only)",
        },
        {
          path: "dispatch/carriers/standard.py",
          role: "readonly",
          language: "python",
          content: QUOTES_CARRIER_STANDARD,
          description: "The fallback carrier, and the shape to follow (read-only)",
        },
        {
          path: "dispatch/carriers/glacier.py",
          role: "editable",
          language: "python",
          content: QUOTES_GLACIER_STARTER,
          description: "Build and register the Glacier carrier here",
        },
        {
          path: "dispatch/quotes.py",
          role: "editable",
          language: "python",
          content: QUOTES_SERVICE_STARTER,
          description: "Implement quote_parcel here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_quotes.py",
          role: "test",
          language: "python",
          content: QUOTES_TEST,
          description: "Visible quote tests",
        },
        {
          path: "tests/test_quotes_hidden.py",
          role: "test",
          language: "python",
          content: QUOTES_TEST_HIDDEN,
          hidden: true,
          description: "Hidden quote tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_quotes", label: "visible quotes" },
            { module: "test_quotes_hidden", label: "hidden quotes" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "dispatch/carriers/glacier.py",
          role: "editable",
          language: "python",
          content: QUOTES_GLACIER_REFERENCE,
        },
        {
          path: "dispatch/quotes.py",
          role: "editable",
          language: "python",
          content: QUOTES_SERVICE_REFERENCE,
        },
      ],
    },
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L4-M4: Performance & Production Practices
// ───────────────────────────────────────────────────────────────────────────

/**
 * L4: profiling, complexity and memoization.
 *
 * Left deliberately as it stands on difficulty: the council measured this practice at 35 reference
 * lines against a 5-line Apply, a 7x ratio well inside the depth spec's threshold, and its two
 * levers (a repeated-work failure mode the teach section names, and an interaction between the two
 * files the learner writes) are within the ceiling. The one real defect was closure: the reference
 * calls `cache_clear()` and no fence in the lesson had shown it. Teach now demonstrates it next to
 * `cache_info()`, with the two situations that force a clear.
 *
 * Time budget (counted, not guessed). Teach 7: ~1,000 prose words, four checks, five fences.
 * Apply 8: 6 provided lines to read, 5 to write. Practice 40: 70 lines of README, 45 of read-only
 * instrumentation, 35 to write across two files, and the profile to read before any of it.
 * 7 + 8 + 40 = 55, the lesson total.
 */
import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const PERF_README = buildBrief({
  lesson: "py-l4-performance",
  kind: "bug-report",
  headline: "the nightly billing rollup times out",
  body: `The rollup that turns usage events into per-account invoices used to finish in seconds. Since the
plan catalog grew it takes over an hour, and the profile blames two things: the catalog is walked
again for every single event, and the rate engine is asked for the same rate thousands of times.

Timing is not graded here, because timing is noise. Two read-only modules count work instead:

- \`hotpath/instrument.py\` gives \`ProbeList\`, the catalog wrapper. It charges you one probe per
  element it touches: iterating adds one per element yielded, \`catalog[i]\` adds one, and
  \`value in catalog\` adds one for every element it scans before it stops, so a value that is not
  there costs the whole catalog. \`len(catalog)\` is free.
- \`hotpath/rates.py\` gives \`compute_rate(code, tier)\`, the expensive engine. Every call is appended
  to \`rates.CALLS\`. \`rates.reset()\` empties that log.

## What you write

### \`hotpath/pricing.py\`

\`normalize(code)\` turns a raw plan code into its canonical form: surrounding whitespace and case do
not matter, and the aliases in \`ALIASES\` map to their canonical code. \`normalize("  Professional ")\`
is \`"pro"\`.

\`rate_for(code, tier)\` returns \`compute_rate\` for the canonical code. \`rate_for("PRO", 3)\` is
\`5500\` (cents). Any group of codes that normalize to the same thing must reach the rate engine at
most once per \`tier\`.

\`monthly_cost(code, usage)\` returns \`rate_for(code, usage["seats"]) * usage["seats"] + 300 * usage["gb"]\`,
where \`usage\` is a plain dict with the keys \`"seats"\` and \`"gb"\` (\`"gb"\` is the overage, already
net of the allowance). Callers pass fresh dicts every time, and two dicts holding the same pairs
describe the same invoice, so they must not reach the rate engine twice.

\`clear_caches()\` empties whatever you cached. The tests call it before they count.

### \`hotpath/rollup.py\`

\`summarize(events, catalog)\` returns \`{account_id: total_cents}\`.

- \`catalog\` is a \`ProbeList\` of dicts like \`{"code": "Pro", "gb_included": 10}\`. Catalog codes are
  raw too.
- Each event looks like \`{"account": "a1", "plan": " PRO ", "seats": 3, "gb": 14}\`.
- An event costs \`monthly_cost\` of its plan with \`"gb"\` set to the amount above the catalog
  allowance, never below zero.
- An account's total is the sum of its events.
- An event whose plan is not in the catalog is ignored. An account with no billable events does not
  appear in the result at all.
- Whatever the event count, \`catalog.probes\` must not exceed \`len(catalog)\` when \`summarize\`
  returns.
`,
})

const PERF_INSTRUMENT = String.raw`"""Read-only. Counts how much of the catalog your code actually touches."""


class ProbeList:
    """A catalog feed that records every element it hands out."""

    def __init__(self, items):
        self._items = list(items)
        self.probes = 0

    def __len__(self):
        # Asking how big the catalog is costs nothing.
        return len(self._items)

    def __iter__(self):
        for item in self._items:
            self.probes += 1
            yield item

    def __getitem__(self, index):
        self.probes += 1
        return self._items[index]

    def __contains__(self, value):
        for item in self._items:
            self.probes += 1
            if item == value:
                return True
        return False
`

const PERF_RATES = String.raw`"""Read-only. The expensive rate engine, with a call log instead of a stopwatch."""

BASE_CENTS = {"pro": 4000, "team": 2500, "solo": 1200, "edu": 600}

CALLS = []


def reset():
    """Empty the call log."""
    del CALLS[:]


def compute_rate(code, tier):
    """Return the per-seat rate in cents for a canonical plan code. Every call is logged."""
    CALLS.append((code, tier))
    if code not in BASE_CENTS:
        raise KeyError(code)
    return BASE_CENTS[code] + 500 * tier
`

const PERF_PRICING_STARTER = String.raw`from hotpath import rates

ALIASES = {"professional": "pro", "startup": "team", "student": "edu"}


def normalize(code):
    """Return the canonical form of a raw plan code, see README.md."""
    # TODO: fold away the differences that do not change which plan this is.
    return code


def rate_for(code, tier):
    """Return the per-seat rate in cents for a raw plan code, see README.md."""
    # TODO: reach rates.compute_rate at most once per canonical code and tier.
    return rates.compute_rate(code, tier)


def monthly_cost(code, usage):
    """Return the monthly cost in cents for a raw plan code and a usage dict, see README.md."""
    # TODO: two usage dicts holding the same pairs must not repeat the work.
    return rate_for(code, usage["seats"]) * usage["seats"] + 300 * usage["gb"]


def clear_caches():
    """Empty every cache this module holds."""
    # TODO: the tests call this before they count rate-engine calls.
    return None
`

const PERF_PRICING_REFERENCE = String.raw`from functools import lru_cache

from hotpath import rates

ALIASES = {"professional": "pro", "startup": "team", "student": "edu"}


def normalize(code):
    cleaned = code.strip().lower()
    return ALIASES.get(cleaned, cleaned)


@lru_cache(maxsize=None)
def _rate(canonical, tier):
    return rates.compute_rate(canonical, tier)


def rate_for(code, tier):
    return _rate(normalize(code), tier)


@lru_cache(maxsize=None)
def _cost(canonical, seats, gb):
    return _rate(canonical, seats) * seats + 300 * gb


def monthly_cost(code, usage):
    return _cost(normalize(code), usage["seats"], usage["gb"])


def clear_caches():
    _rate.cache_clear()
    _cost.cache_clear()
`

const PERF_ROLLUP_STARTER = String.raw`from hotpath.pricing import monthly_cost, normalize


def summarize(events, catalog):
    """Return {account_id: total_cents} for one billing run, see README.md."""
    # TODO: keep catalog.probes at or below len(catalog) however many events arrive.
    totals = {}
    for event in events:
        for plan in catalog:
            if normalize(plan["code"]) == normalize(event["plan"]):
                gb = event["gb"] - plan["gb_included"]
                cost = monthly_cost(event["plan"], {"seats": event["seats"], "gb": gb})
                totals[event["account"]] = totals.get(event["account"], 0) + cost
    return totals
`

const PERF_ROLLUP_REFERENCE = String.raw`from hotpath.pricing import monthly_cost, normalize


def summarize(events, catalog):
    allowance = {}
    for plan in catalog:
        allowance[normalize(plan["code"])] = plan["gb_included"]

    totals = {}
    for event in events:
        code = normalize(event["plan"])
        if code not in allowance:
            continue
        overage = event["gb"] - allowance[code]
        if overage < 0:
            overage = 0
        cost = monthly_cost(code, {"seats": event["seats"], "gb": overage})
        totals[event["account"]] = totals.get(event["account"], 0) + cost
    return totals
`

const PERF_TEST_PRICING = String.raw`from hotpath import pricing, rates


def run_tests(record):
    def canonical_codes():
        got = [pricing.normalize("  PRO "), pricing.normalize("Professional"), pricing.normalize("team")]
        expected = ["pro", "pro", "team"]
        assert got == expected, f"expected {expected!r}, got {got!r}"

    def rate_matches_the_engine():
        got = pricing.rate_for("PRO", 3)
        assert got == 5500, f"expected 5500, got {got!r}"

    def equivalent_codes_share_one_entry():
        pricing.clear_caches()
        rates.reset()
        for raw in ("pro", "PRO", "  Professional  ", "professional"):
            pricing.rate_for(raw, 2)
        assert rates.CALLS == [("pro", 2)], f"expected [('pro', 2)], got {rates.CALLS!r}"

    record("normalize folds case, spaces and aliases", canonical_codes)
    record("rate_for('PRO', 3) is 5500", rate_matches_the_engine)
    record("four spellings, one rate-engine call", equivalent_codes_share_one_entry)
`

const PERF_TEST_ROLLUP = String.raw`from hotpath import pricing
from hotpath.instrument import ProbeList
from hotpath.rollup import summarize

CATALOG = [
    {"code": "Pro", "gb_included": 10},
    {"code": "team", "gb_included": 5},
    {"code": "SOLO", "gb_included": 2},
]


def run_tests(record):
    def totals_per_account():
        pricing.clear_caches()
        events = [
            {"account": "a1", "plan": "professional", "seats": 3, "gb": 10},
            {"account": "a1", "plan": "solo", "seats": 1, "gb": 4},
        ]
        got = summarize(events, ProbeList(CATALOG))
        # pro: 5500 * 3 seats, no overage. solo: 1700 * 1 seat, plus 2gb over at 300.
        assert got == {"a1": 18800}, f"expected {{'a1': 18800}}, got {got!r}"

    def catalog_is_walked_once():
        pricing.clear_caches()
        catalog = ProbeList(CATALOG)
        events = [{"account": "a%d" % i, "plan": "team", "seats": 2, "gb": 5} for i in range(40)]
        summarize(events, catalog)
        assert catalog.probes <= len(catalog), (
            f"expected at most {len(catalog)} catalog probes for 40 events, got {catalog.probes}"
        )

    record("one account, two plans, totals summed", totals_per_account)
    record("40 events still walk the catalog once", catalog_is_walked_once)
`

const PERF_TEST_PRICING_HIDDEN = String.raw`from hotpath import pricing, rates


def run_tests(record):
    def usage_dicts_are_accepted():
        pricing.clear_caches()
        rates.reset()
        got = pricing.monthly_cost("Pro", {"seats": 2, "gb": 4})
        # rate_for('pro', 2) is 5000, times 2 seats, plus 4gb at 300.
        assert got == 11200, f"expected 11200, got {got!r}"

    def equal_usage_reuses_the_cache():
        pricing.clear_caches()
        rates.reset()
        for _ in range(5):
            pricing.monthly_cost(" TEAM ", {"gb": 3, "seats": 4})
            pricing.monthly_cost("startup", {"seats": 4, "gb": 3})
        assert rates.CALLS == [("team", 4)], f"expected [('team', 4)], got {rates.CALLS!r}"

    def different_usage_costs_differently():
        pricing.clear_caches()
        got = (
            pricing.monthly_cost("solo", {"seats": 1, "gb": 0}),
            pricing.monthly_cost("solo", {"seats": 2, "gb": 0}),
        )
        assert got == (1700, 4400), f"expected (1700, 4400), got {got!r}"

    record("monthly_cost takes a plain dict", usage_dicts_are_accepted)
    record("ten equal invoices, one rate-engine call", equal_usage_reuses_the_cache)
    record("the cache does not blur different usage", different_usage_costs_differently)
`

const PERF_TEST_ROLLUP_HIDDEN = String.raw`from hotpath import pricing, rates
from hotpath.instrument import ProbeList
from hotpath.rollup import summarize

CATALOG = [
    {"code": "Pro", "gb_included": 10},
    {"code": "team", "gb_included": 5},
    {"code": "SOLO", "gb_included": 2},
]


def run_tests(record):
    def unknown_plans_are_dropped():
        pricing.clear_caches()
        events = [
            {"account": "z9", "plan": "ghost", "seats": 9, "gb": 9},
            {"account": "a1", "plan": "Team", "seats": 1, "gb": 5},
        ]
        got = summarize(events, ProbeList(CATALOG))
        assert got == {"a1": 3000}, f"expected {{'a1': 3000}}, got {got!r}"

    def usage_under_the_allowance_is_not_negative():
        pricing.clear_caches()
        events = [{"account": "a1", "plan": "pro", "seats": 1, "gb": 2}]
        got = summarize(events, ProbeList(CATALOG))
        assert got == {"a1": 4500}, f"expected {{'a1': 4500}}, got {got!r}"

    def no_events_is_an_empty_result():
        pricing.clear_caches()
        catalog = ProbeList(CATALOG)
        got = summarize([], catalog)
        assert got == {}, f"expected {{}}, got {got!r}"

    def repeated_shapes_price_once():
        pricing.clear_caches()
        rates.reset()
        events = [{"account": "a%d" % i, "plan": "PRO", "seats": 2, "gb": 12} for i in range(50)]
        summarize(events, ProbeList(CATALOG))
        assert rates.CALLS == [("pro", 2)], f"expected [('pro', 2)], got {rates.CALLS!r}"

    record("plans missing from the catalog are dropped", unknown_plans_are_dropped)
    record("usage below the allowance bills no overage", usage_under_the_allowance_is_not_negative)
    record("no events returns an empty dict", no_events_is_an_empty_result)
    record("50 identical events, one rate-engine call", repeated_shapes_price_once)
`

export const performanceLesson: PythonLesson = {
  id: "py-l4-performance",
  title: "Profiling, complexity & caching",
  summary: "Find the hot path, fix complexity, and memoize repeated work with lru_cache.",
  estimatedMinutes: 55,
  difficulty: "hard",
  skills: ["performance", "lru-cache", "complexity", "profiling"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Make it fast: measure, then fix the right thing

Slow code costs money and latency in production, and the human instinct for *where* it is slow is almost always wrong. Engineers waste hours micro-optimizing a loop that runs once while an accidental \`O(n²)\` scan buried three functions away eats the request budget. The discipline is: measure first, fix algorithmic complexity, then cache repeated work. Only after that do you tune lines.

### Profile before you touch anything

\`cProfile\` runs your code and reports, per function, how many times it was called and how much time it took. \`timeit\` runs a tiny snippet many times for a stable microbenchmark.

\`\`\`python
import cProfile
cProfile.run("slow_function()")
# ncalls  tottime  cumtime  filename:lineno(function)
#  1  0.002  0.900  app.py:12(slow_function)
# 900000  0.850  0.850  app.py:30(lookup)   <- the real hot path
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "reading-tottime-vs-cumtime",
  "prompt": "That profile is your whole optimization budget for the afternoon. slow_function shows cumtime 0.900 with tottime 0.002. lookup shows tottime 0.850 across 900000 calls. Where do you spend the afternoon?",
  "options": [
    {
      "label": "slow_function, since its cumtime of 0.900 is essentially the entire run",
      "feedback": "The classic misread, and the numbers really do point at it. cumtime includes everything the function called, so 0.900 is mostly other people's time. Its own tottime of 0.002 says there is nothing there to cut."
    },
    {
      "label": "lookup, since its own 0.850 is nearly all the runtime and it is being called 900000 times",
      "correct": true,
      "feedback": "Right. tottime plus a large ncalls is the signature of a real hot path, and it also hints at the better fix: call it less often, not just make it faster."
    },
    {
      "label": "Both, since 0.900 and 0.850 are close enough that the time is split between them",
      "feedback": "It looks like two similar numbers, but they are not measuring the same thing. The 0.850 is a subset of the 0.900, so this is one cost reported at two levels, not two costs."
    },
    {
      "label": "Neither yet. Time both with timeit first to get a stable measurement",
      "feedback": "Careful instinct, and timeit is the right tool for comparing two candidate implementations. Aimed at a whole program it misleads: it runs a snippet in isolation, warm and without the real call counts, which is exactly the context the profile just gave you."
    }
  ]
}
\`\`\`

Read \`tottime\` (time in that function itself) and \`ncalls\`. A function called 900,000 times is your target, not the one that merely *looks* heavy.

### Complexity is the biggest lever

No micro-tuning beats a better data structure. A \`set\` and a \`dict\` are hash maps: membership is average \`O(1)\`. A \`list\` scan is \`O(n)\`.

\`\`\`python
if x in big_set:    # O(1) average
if x in big_list:   # O(n), linear scan every time
\`\`\`

Turning an \`O(n²)\` nested loop into an \`O(n)\` pass with a \`set\` lookup is the difference between a request that returns and one that times out.

### Memory is a lever too: \`__slots__\`

By default every instance carries its own \`__dict__\`, a hash map holding its attributes. That is what
makes \`obj.anything = 1\` work at runtime, and it costs memory on every object you create. Declaring
\`__slots__\` replaces that dict with a fixed set of descriptors:

\`\`\`python
class Point:
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x = x
        self.y = y
\`\`\`

Measured on 64-bit CPython 3.11 for a two-attribute object, \`sys.getsizeof\` reports 48 bytes with
\`__slots__\` against 56 bytes **plus** a separate per-instance dict without it (the in-browser sandbox
here is 32-bit, so do not expect to reproduce those exact numbers in the runner). Across a million
objects that gap is the difference between fitting in memory and not. Attribute access also gets slightly faster,
because it is an array offset rather than a dict lookup.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "slots-blocks-new-attributes",
  "prompt": "Point now declares __slots__ = ('x', 'y'). Somewhere far away, a debugging helper does p.label = 'origin'. What happens?",
  "options": [
    {
      "label": "It works. Python always lets you attach a new attribute to an instance",
      "feedback": "True of every class you have written until now, which is why this bites during a refactor rather than while writing new code. That freedom comes from the per-instance dict, and __slots__ is precisely the removal of that dict."
    },
    {
      "label": "AttributeError, because there is no per-instance dict for label to live in",
      "correct": true,
      "feedback": "Right. The slots are fixed descriptors, so anything not declared has nowhere to go. Treat it as a feature: a misspelled attribute name becomes an error instead of a silently new field."
    },
    {
      "label": "It works, but label becomes a class attribute shared by every Point",
      "feedback": "Attribute assignment on an instance never writes to the class, with or without slots. Sharing across instances is the descriptor bug from the earlier lesson, not what happens here."
    },
    {
      "label": "It works, because Python quietly gives that instance a __dict__ back",
      "feedback": "There is a real version of this: a subclass that does not declare its own __slots__ gets a dict back, and gives up the saving with it. It never happens to an individual instance though, only through inheritance."
    }
  ]
}
\`\`\`

The cost is flexibility, and it is worth naming precisely:

- Assigning an undeclared attribute raises \`AttributeError\`, not a silent success. That is often a
  feature: typos in attribute names become errors instead of new attributes.
- There is no \`__dict__\`, so code that introspects one (some serializers, some mocking) breaks.
- A subclass that does not declare its own \`__slots__\` gets a \`__dict__\` back, and the saving with it.

Reach for it when you have many small, fixed-shape objects (points, rows, events, graph nodes). Skip
it for the handful of long-lived service objects, where the memory is irrelevant and the flexibility
is not.

**Interview nuance:** CPython already softens the default case with **key-sharing dictionaries**
(PEP 412): instances of the same class share one copy of their key layout, so the marginal per-instance
dict is smaller than a standalone dict of the same size. That is why the honest claim is "slots remove
the per-instance dict entirely", not a fixed multiplier. If someone quotes you a flat "slots saves 50
percent", the useful follow-up is: measured on which Python, with how many attributes, and against
shared keys or not?

### Cache repeated work with \`lru_cache\`

When a pure function is called repeatedly with the same arguments, \`functools.lru_cache\` stores results keyed by the arguments. Naive \`fib\` recomputes \`fib(n-1)\` and \`fib(n-2)\` down overlapping trees, so it runs in roughly \`O(φⁿ)\` time, where φ ≈ 1.618 is the golden ratio (\`fib(35)\` already triggers tens of millions of calls). Memoization computes each distinct \`n\` exactly once:

\`\`\`python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(10))   # 55
print(fib(30))   # 832040, instant thanks to the cache
\`\`\`

\`@lru_cache(maxsize=None)\` keeps every result; in Python 3.9+ the shorthand is \`@functools.cache\`. This is exactly what the warm-up asks for: a memoized \`fib\` where each \`n\` is computed once.

The decorator also bolts two methods onto the function it wraps, and both matter once a cache is in real code rather than in an example:

\`\`\`python
fib(10)
fib(10)
print(fib.cache_info())    # CacheInfo(hits=9, misses=11, maxsize=None, currsize=11)

fib.cache_clear()          # empty it: every entry gone, counters back to zero
print(fib.cache_info())    # CacheInfo(hits=0, misses=0, maxsize=None, currsize=0)
\`\`\`

\`cache_info()\` is how you find out whether a cache is earning its memory: a hit rate near zero means you are paying to store results nobody asks for twice. \`cache_clear()\` is how you get a fresh start, and it is not optional in two situations. A test that asserts on how much work was done needs the cache emptied between cases or the second case inherits the first one's answers. And a cache over data that can change needs clearing when the data does, because a memoized function has no idea its inputs went stale. Note that each decorated function owns its own cache, so clearing one leaves the others full.

### Generators for memory

A generator streams values instead of building a list, so it uses constant memory over huge sequences:

\`\`\`python
total = sum(x * x for x in range(10_000_000))   # no 10M-element list
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "lru-cache-unhashable-argument",
  "prompt": "Pricing is slow, so you put @lru_cache on def price(items, region), where items is a list of SKU strings. What happens on the very first call?",
  "options": [
    {
      "label": "It works, but the cache never hits, because two equal lists are still different objects",
      "feedback": "A sharp guess, and identity versus equality is a real trap elsewhere. The cache does compare by equality, not identity. The list never gets that far: building the key requires hashing it."
    },
    {
      "label": "TypeError about an unhashable type, raised before the function body runs",
      "correct": true,
      "feedback": "Right. The cache key is a tuple of the arguments, so every argument has to be hashable. The usual fix is to accept a tuple, or convert at the boundary with tuple(items)."
    },
    {
      "label": "It works and caches correctly, since lru_cache compares arguments by equality",
      "feedback": "Equality is indeed how a cache hit is decided, but only after the arguments have been hashed to find the bucket. A list has no hash at all, so there is no bucket to look in."
    },
    {
      "label": "It works, and lru_cache just skips caching for arguments it cannot hash",
      "feedback": "That would be a friendly design, and some caches do work that way. functools.lru_cache does not degrade quietly: it raises, which at least means you find out immediately rather than in a latency graph."
    }
  ]
}
\`\`\`

### Pitfalls

- \`lru_cache\` keys on the arguments, so every argument must be **hashable**. \`fib(2)\` is fine; passing a \`list\` or \`dict\` raises \`TypeError: unhashable type\`.
- With \`maxsize=None\` the cache never evicts. That is perfect for \`fib\`, but calling a cached function with millions of distinct arguments leaks memory.
- Recursive \`fib\` recurses \`n\` frames deep, so a cold \`fib(3000)\` hits Python's default recursion limit (\`RecursionError\`) before the cache helps. Warm it incrementally (\`fib(500)\`, then \`fib(1000)\`, ...) so each call only recurses to the first uncached \`n\`, or convert to a loop.

**Interview nuance:** memoization works because \`fib\` has *overlapping subproblems*. There are only \`n + 1\` distinct inputs (\`0\` through \`n\`), each solved once, so the cache collapses exponential time to \`O(n)\` time and \`O(n)\` space. Being able to name that space cost, and the recursion-depth limit, is what separates "I added a decorator" from understanding why it works.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "cold-cache-deep-recursion",
  "prompt": "fib is decorated with lru_cache(maxsize=None) and is genuinely fast. A freshly started worker process makes fib(3000) its very first call. What happens?",
  "options": [
    {
      "label": "It returns instantly. That is the whole point of the cache",
      "feedback": "True from the second call onward, and true in every demo, because the demo warmed the cache on the way up from small inputs. A cold process has an empty cache, so this first call gets no help at all."
    },
    {
      "label": "RecursionError, because the first call still descends 3000 frames before any entry exists",
      "correct": true,
      "feedback": "Right. A cache changes how often work is repeated, never how deep the first descent goes. Warm it in steps, or rewrite the function as a loop."
    },
    {
      "label": "MemoryError, because maxsize=None lets the cache grow without a bound",
      "feedback": "An unbounded cache really is a leak worth worrying about, just at a different scale: it bites when you cache millions of distinct arguments. Three thousand small integers is nothing."
    },
    {
      "label": "It is slow on this call and instant afterwards, which is the normal cold-cache cost",
      "feedback": "That is the right model for most caches, and it would be the answer if fib were iterative. Recursion adds a hard ceiling that no amount of patience gets you past."
    }
  ],
  "reveal": "Two separate costs hide behind one decorator. Time drops from exponential to linear because there are only n distinct inputs, but you now hold n results in memory and the first call still recurses n frames deep. Naming all three is the difference between using lru_cache and understanding it."
}
\`\`\``,
    demoCode: `from functools import lru_cache


@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


print(fib(30))   # 832040, instant, thanks to the cache`,
  },
  apply: {
    id: "py-l4-performance-apply",
    estimatedMinutes: 8,
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`fib(n)\` (the nth Fibonacci number) and memoize it with
\`@lru_cache\` so repeated subproblems are computed once.

\`fib(10)\` is \`55\`.`,
    starterCode: `from functools import lru_cache


def fib(n):
    # Add @lru_cache above, then recurse with a base case for n < 2.
    pass`,
    hints: [
      "Base case: `if n < 2: return n`.",
      "Recurse: `return fib(n - 1) + fib(n - 2)`.",
      "Add `@lru_cache(maxsize=None)` on the line above `def fib` to memoize it.",
    ],
    referenceSolution: `from functools import lru_cache


@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)`,
    testCases: [
      { input: { n: 0 }, expected: 0, description: "fib(0)" },
      { input: { n: 1 }, expected: 1, description: "fib(1)" },
      { input: { n: 10 }, expected: 55, description: "fib(10)" },
      { input: { n: 15 }, expected: 610, description: "fib(15)" },
    ],
  },
  practice: {
    id: "py-l4-performance-practice",
    estimatedMinutes: 40,
    executionMode: "workspace",
    prompt: `Repair the nightly billing rollup on ticket CS-021. It has stopped finishing inside its
window: the profile shows the plan catalog being walked again for every usage event, and the rate
engine being asked for the same rate thousands of times.

Nothing here is graded on the clock. \`hotpath/instrument.py\` counts every catalog element your
code touches, and \`hotpath/rates.py\` logs every call to the rate engine, so the tests assert on
work done rather than on time taken.

Fill in \`hotpath/pricing.py\` (canonical plan codes, rates and monthly cost) and
\`hotpath/rollup.py\` (\`summarize(events, catalog)\`). \`README.md\` has the exact contract, including
what the catalog probe budget is and which events are dropped. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Both counters punish the same habit: work repeated inside a loop that could have been done once outside it. The catalog is a scan; the rate engine is a repeat.",
      "In `rollup`, read the catalog once into a dict keyed by the canonical code, then each event is one hash lookup. In `pricing`, the cache has to sit behind `normalize`, or four spellings of one plan become four cache entries.",
      "The gotcha is the cache key: `lru_cache` hashes every argument it is given, and a `usage` dict is not hashable, so a cached function cannot take one. Whatever you end up caching, `clear_caches()` has to be able to empty it, and every `lru_cache`-decorated function carries its own `cache_clear()`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "hotpath/pricing.py",
      editableFilePaths: ["hotpath/pricing.py", "hotpath/rollup.py"],
      visibleTestPaths: ["tests/test_pricing.py", "tests/test_rollup.py"],
      hiddenTestPaths: ["tests/test_pricing_hidden.py", "tests/test_rollup_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PERF_README },
        { path: "hotpath/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "hotpath/instrument.py",
          role: "readonly",
          language: "python",
          content: PERF_INSTRUMENT,
          description: "Read-only: the catalog probe counter",
        },
        {
          path: "hotpath/rates.py",
          role: "readonly",
          language: "python",
          content: PERF_RATES,
          description: "Read-only: the rate engine and its call log",
        },
        {
          path: "hotpath/pricing.py",
          role: "editable",
          language: "python",
          content: PERF_PRICING_STARTER,
          description: "Canonical codes, cached rates and monthly cost",
        },
        {
          path: "hotpath/rollup.py",
          role: "editable",
          language: "python",
          content: PERF_ROLLUP_STARTER,
          description: "The accidentally quadratic rollup",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_pricing.py",
          role: "test",
          language: "python",
          content: PERF_TEST_PRICING,
          description: "Visible pricing tests",
        },
        {
          path: "tests/test_rollup.py",
          role: "test",
          language: "python",
          content: PERF_TEST_ROLLUP,
          description: "Visible rollup tests",
        },
        {
          path: "tests/test_pricing_hidden.py",
          role: "test",
          language: "python",
          content: PERF_TEST_PRICING_HIDDEN,
          hidden: true,
          description: "Hidden cache-key tests",
        },
        {
          path: "tests/test_rollup_hidden.py",
          role: "test",
          language: "python",
          content: PERF_TEST_ROLLUP_HIDDEN,
          hidden: true,
          description: "Hidden rollup edge cases",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_pricing", label: "visible pricing" },
            { module: "test_rollup", label: "visible rollup" },
            { module: "test_pricing_hidden", label: "hidden pricing" },
            { module: "test_rollup_hidden", label: "hidden rollup" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "hotpath/pricing.py",
          role: "editable",
          language: "python",
          content: PERF_PRICING_REFERENCE,
        },
        {
          path: "hotpath/rollup.py",
          role: "editable",
          language: "python",
          content: PERF_ROLLUP_REFERENCE,
        },
      ],
    },
  },
}

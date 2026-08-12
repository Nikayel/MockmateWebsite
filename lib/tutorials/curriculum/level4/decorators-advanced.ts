// ───────────────────────────────────────────────────────────────────────────
// L4-M2: Decorators & Metaprogramming
// ───────────────────────────────────────────────────────────────────────────

import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ── Practice workspace: the ingest retry decorator ────────────────────────────
//
// A second problem in the same skill, not the apply restated. `multiply_by` is a toy: every layer
// of the three-layer model is interchangeable there, so the teach section's central claim (each
// layer has a different lifetime) is never tested. Here it is the whole exercise. The attempt
// counter has exactly one correct home, the decorator layer:
//   - in the factory layer, two functions sharing one decorator object share a counter;
//   - in the wrapper layer, the counter resets on every call.
// Both mistakes are graded. The seam between `resilience/retry.py` (the mechanism) and
// `ingest/jobs.py` (the configuration at each @ line) is the natural two-file split for a
// decorator factory, and both halves carry real work.
//
// The sandbox has no clock guarantees and no network, so failures come from a read-only scripted
// feed rather than from sleeping or retrying a socket.

const RETRY_README = buildBrief({
  lesson: "py-l4-decorators-advanced",
  kind: "bug-report",
  headline: "the ingest jobs give up too early",
  body: `The nightly ingest talks to a feed that fails at random. Right now a single blip fails the whole
run, and the fix that was tried last week retried everything, including the corrupt records that
will never succeed.

## What to build

**\`resilience/retry.py\`** holds the mechanism. Implement \`retry(times, on)\`, a decorator
factory:

- \`times\` is the maximum number of attempts, not the number of extra retries. \`times=3\` means
  the function body runs at most three times.
- \`on\` is a tuple of exception classes. Only those are retried. Anything else propagates from the
  attempt that raised it.
- When every attempt has been used, re-raise the last exception from \`on\` rather than returning.
- The decorated function keeps its own \`.stats\` dict: \`fn.stats["attempts"]\` is the running
  total of attempts made through that function, across all of its calls. Two functions decorated by
  the **same** decorator object must count separately.
- The decorated function must keep its \`__name__\` and \`__doc__\`, and must forward positional and
  keyword arguments through untouched.

**\`ingest/jobs.py\`** holds the configuration. Decorate the two jobs:

| Job | Attempts | Retry on |
| --- | --- | --- |
| \`fetch_page\` | 4 | \`TransientError\` |
| \`purge_stale\` | 2 | \`TransientError\` and \`RateLimitError\` |

\`CorruptRecordError\` is never retryable.

\`ingest/feed.py\` is read-only. It is a scripted stand-in for the network: \`FEED.program([...])\`
queues the outcomes the next reads will produce, and \`FEED.calls\` records what it was asked for.
`,
})

const RETRY_FEED = String.raw`"""Read-only scripted stand-in for the ingest feed.

There is no network and no usable clock in this sandbox, so failures are programmed rather
than provoked: program() queues the outcomes the next reads will produce.
"""


class TransientError(Exception):
    """The feed hiccupped. Trying again may work."""


class RateLimitError(Exception):
    """The feed is shedding load. Trying again may work."""


class CorruptRecordError(Exception):
    """The stored record is malformed. Trying again will never work."""


class ScriptedFeed:
    def __init__(self):
        self.script = []
        self.calls = []

    def program(self, outcomes):
        """Queue outcomes. An Exception instance is raised; anything else is returned."""
        self.script = list(outcomes)
        self.calls = []

    def _next(self):
        if not self.script:
            raise AssertionError("the scripted feed ran out of programmed outcomes")
        outcome = self.script.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    def read(self, page, fields="id"):
        self.calls.append(("read", page, fields))
        return self._next()

    def delete(self, cutoff):
        self.calls.append(("delete", cutoff))
        return self._next()


FEED = ScriptedFeed()
`

const RETRY_STARTER = String.raw`def retry(times, on):
    """Build a decorator that retries the exceptions named by on (see README.md)."""

    def decorator(fn):
        # TODO: give this decorated function its own attempt counter, then return a wrapper
        # that retries the exceptions named by on, gives up after times attempts, and exposes
        # the counter as a stats attribute.
        return fn

    return decorator
`

const RETRY_REFERENCE = String.raw`import functools


def retry(times, on):
    """Build a decorator that retries the exceptions named by on."""

    def decorator(fn):
        # One counter per decorated function: the decorator layer runs once per @ line, so
        # this survives every call and is not shared with the next function it decorates.
        stats = {"attempts": 0}

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_error = None
            for _ in range(times):
                stats["attempts"] += 1
                try:
                    return fn(*args, **kwargs)
                except on as exc:
                    last_error = exc
            raise last_error

        wrapper.stats = stats
        return wrapper

    return decorator
`

const RETRY_JOBS_STARTER = String.raw`from ingest.feed import FEED, RateLimitError, TransientError
from resilience.retry import retry


# TODO: configure the retry policy for this job (see the table in README.md).
def fetch_page(page, fields="id"):
    """Read one page of records from the feed."""
    return FEED.read(page, fields=fields)


# TODO: configure the retry policy for this job (see the table in README.md).
def purge_stale(cutoff):
    """Delete every record older than cutoff."""
    return FEED.delete(cutoff)
`

const RETRY_JOBS_REFERENCE = String.raw`from ingest.feed import FEED, RateLimitError, TransientError
from resilience.retry import retry


@retry(times=4, on=(TransientError,))
def fetch_page(page, fields="id"):
    """Read one page of records from the feed."""
    return FEED.read(page, fields=fields)


@retry(times=2, on=(TransientError, RateLimitError))
def purge_stale(cutoff):
    """Delete every record older than cutoff."""
    return FEED.delete(cutoff)
`

const RETRY_TEST = String.raw`from resilience.retry import retry


class Flaky(Exception):
    pass


class Fatal(Exception):
    pass


def run_tests(record):
    def returns_the_value_without_retrying():
        @retry(times=3, on=(Flaky,))
        def ready():
            return 7

        result = ready()
        used = ready.stats["attempts"]
        assert result == 7, f"expected 7, got {result!r}"
        assert used == 1, f"expected 1 attempt for a call that succeeded, got {used}"

    def retries_until_the_call_succeeds():
        outcomes = [Flaky("blip"), Flaky("blip"), "page-2"]

        @retry(times=5, on=(Flaky,))
        def pull():
            outcome = outcomes.pop(0)
            if isinstance(outcome, Exception):
                raise outcome
            return outcome

        result = pull()
        used = pull.stats["attempts"]
        assert result == "page-2", f"expected 'page-2', got {result!r}"
        assert used == 3, f"expected 3 attempts (two failures, one success), got {used}"

    def reraises_the_last_error_when_attempts_run_out():
        @retry(times=3, on=(Flaky,))
        def always_fails():
            raise Flaky("boom")

        raised = None
        try:
            always_fails()
        except Flaky as exc:
            raised = exc
        used = always_fails.stats["attempts"]
        assert raised is not None, "expected Flaky to be re-raised, got no exception"
        assert str(raised) == "boom", f"expected 'boom', got {str(raised)!r}"
        assert used == 3, f"expected 3 attempts, got {used}"

    def does_not_retry_an_unlisted_error():
        @retry(times=4, on=(Flaky,))
        def wrong_kind_of_broken():
            raise Fatal("malformed")

        raised = None
        try:
            wrong_kind_of_broken()
        except Fatal as exc:
            raised = exc
        used = wrong_kind_of_broken.stats["attempts"]
        assert raised is not None, "expected Fatal to propagate, got no exception"
        assert used == 1, f"expected 1 attempt for an error not listed in on, got {used}"

    def forwards_positional_and_keyword_arguments():
        @retry(times=2, on=(Flaky,))
        def label(prefix, name, sep="-", upper=False):
            text = prefix + sep + name
            return text.upper() if upper else text

        result = label("eu", "west", sep="/", upper=True)
        assert result == "EU/WEST", f"expected 'EU/WEST', got {result!r}"

    record("returns the value without retrying", returns_the_value_without_retrying)
    record("retries until the call succeeds", retries_until_the_call_succeeds)
    record("re-raises the last error when attempts run out", reraises_the_last_error_when_attempts_run_out)
    record("does not retry an unlisted error", does_not_retry_an_unlisted_error)
    record("forwards positional and keyword arguments", forwards_positional_and_keyword_arguments)
`

const RETRY_TEST_HIDDEN = String.raw`from resilience.retry import retry


class Flaky(Exception):
    pass


def run_tests(record):
    def preserves_name_and_docstring():
        @retry(times=2, on=(Flaky,))
        def collect_rows():
            """Collect rows from the feed."""
            return 1

        name = collect_rows.__name__
        doc = collect_rows.__doc__
        assert name == "collect_rows", f"expected 'collect_rows', got {name!r} (use functools.wraps)"
        assert doc == "Collect rows from the feed.", f"expected the original docstring, got {doc!r}"

    def one_decorator_object_still_counts_each_function_separately():
        flaky = retry(times=3, on=(Flaky,))

        @flaky
        def left():
            return "L"

        @flaky
        def right():
            return "R"

        left()
        left()
        right()
        left_used = left.stats["attempts"]
        right_used = right.stats["attempts"]
        assert left_used == 2, f"expected left to report 2 attempts, got {left_used}"
        assert right_used == 1, f"expected right to report 1 attempt, got {right_used}"

    def attempts_accumulate_across_calls():
        outcomes = [Flaky("blip"), "one", "two"]

        @retry(times=3, on=(Flaky,))
        def pull():
            outcome = outcomes.pop(0)
            if isinstance(outcome, Exception):
                raise outcome
            return outcome

        pull()
        pull()
        used = pull.stats["attempts"]
        assert used == 3, f"expected a running total of 3 attempts across two calls, got {used}"

    record("preserves __name__ and __doc__", preserves_name_and_docstring)
    record("one decorator object counts each function separately", one_decorator_object_still_counts_each_function_separately)
    record("attempts accumulate across calls", attempts_accumulate_across_calls)
`

const RETRY_JOBS_TEST = String.raw`from ingest.feed import FEED, CorruptRecordError, TransientError
from ingest.jobs import fetch_page


def run_tests(record):
    def fetch_page_survives_transient_failures():
        FEED.program([TransientError("t1"), TransientError("t2"), {"page": 4}])
        before = fetch_page.stats["attempts"]
        result = fetch_page(4)
        used = fetch_page.stats["attempts"] - before
        assert result == {"page": 4}, f"expected the page dict, got {result!r}"
        assert used == 3, f"expected 3 attempts, got {used}"

    def fetch_page_gives_up_after_four_attempts():
        FEED.program([TransientError("t") for _ in range(4)])
        before = fetch_page.stats["attempts"]
        raised = None
        try:
            fetch_page(9)
        except TransientError as exc:
            raised = exc
        used = fetch_page.stats["attempts"] - before
        assert raised is not None, "expected TransientError to be re-raised, got no exception"
        assert used == 4, f"expected 4 attempts, got {used}"

    def fetch_page_does_not_retry_a_corrupt_record():
        FEED.program([CorruptRecordError("bad row"), {"page": 1}])
        before = fetch_page.stats["attempts"]
        raised = None
        try:
            fetch_page(1)
        except CorruptRecordError as exc:
            raised = exc
        used = fetch_page.stats["attempts"] - before
        assert raised is not None, "expected CorruptRecordError to propagate, got no exception"
        assert used == 1, f"expected 1 attempt for a corrupt record, got {used}"

    def fetch_page_forwards_the_fields_argument():
        FEED.program([{"page": 2}])
        fetch_page(2, fields="id,name")
        assert FEED.calls == [("read", 2, "id,name")], f"expected one read of page 2 with fields 'id,name', got {FEED.calls!r}"

    record("fetch_page survives transient failures", fetch_page_survives_transient_failures)
    record("fetch_page gives up after four attempts", fetch_page_gives_up_after_four_attempts)
    record("fetch_page does not retry a corrupt record", fetch_page_does_not_retry_a_corrupt_record)
    record("fetch_page forwards the fields argument", fetch_page_forwards_the_fields_argument)
`

const RETRY_JOBS_TEST_HIDDEN = String.raw`from ingest.feed import FEED, CorruptRecordError, RateLimitError, TransientError
from ingest.jobs import fetch_page, purge_stale


def run_tests(record):
    def purge_stale_retries_a_rate_limit_once():
        FEED.program([RateLimitError("slow down"), 12])
        before = purge_stale.stats["attempts"]
        result = purge_stale("2024-01-01")
        used = purge_stale.stats["attempts"] - before
        assert result == 12, f"expected 12, got {result!r}"
        assert used == 2, f"expected 2 attempts, got {used}"

    def purge_stale_stops_at_two_attempts():
        FEED.program([RateLimitError("slow down"), TransientError("blip"), 12])
        before = purge_stale.stats["attempts"]
        raised = None
        try:
            purge_stale("2024-01-01")
        except TransientError as exc:
            raised = exc
        used = purge_stale.stats["attempts"] - before
        assert raised is not None, "expected the second failure to be re-raised, got no exception"
        assert used == 2, f"expected 2 attempts, got {used}"

    def purge_stale_does_not_retry_a_corrupt_record():
        FEED.program([CorruptRecordError("bad row"), 12])
        before = purge_stale.stats["attempts"]
        raised = None
        try:
            purge_stale("2024-01-01")
        except CorruptRecordError as exc:
            raised = exc
        used = purge_stale.stats["attempts"] - before
        assert raised is not None, "expected CorruptRecordError to propagate, got no exception"
        assert used == 1, f"expected 1 attempt for a corrupt record, got {used}"

    def the_two_jobs_count_separately():
        FEED.program([TransientError("blip"), {"page": 3}, 12])
        fetch_before = fetch_page.stats["attempts"]
        purge_before = purge_stale.stats["attempts"]
        fetch_page(3)
        purge_stale("2024-01-01")
        fetch_used = fetch_page.stats["attempts"] - fetch_before
        purge_used = purge_stale.stats["attempts"] - purge_before
        assert fetch_used == 2, f"expected fetch_page to report 2 attempts, got {fetch_used}"
        assert purge_used == 1, f"expected purge_stale to report 1 attempt, got {purge_used}"

    record("purge_stale retries a rate limit", purge_stale_retries_a_rate_limit_once)
    record("purge_stale stops at two attempts", purge_stale_stops_at_two_attempts)
    record("purge_stale does not retry a corrupt record", purge_stale_does_not_retry_a_corrupt_record)
    record("the two jobs count separately", the_two_jobs_count_separately)
`

export const decoratorsAdvancedLesson: PythonLesson = {
  id: "py-l4-decorators-advanced",
  title: "Decorators with arguments & functools.wraps",
  summary: "Write a parameterized, well-behaved decorator that preserves the wrapped function.",
  estimatedMinutes: 55,
  difficulty: "hard",
  skills: ["decorators", "functools", "closures", "metaprogramming"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Decorators that take arguments

Real decorators almost always need configuration. \`@retry(times=3)\`, \`@lru_cache(maxsize=128)\` (which remembers the last 128 results so a repeated call skips the work), and Flask's \`@app.route("/users")\` all take arguments, because you cannot hardcode a retry count or a route into the decorator itself. A decorator that accepts arguments is called a decorator factory, and it is the pattern you reach for whenever the behavior you are adding needs to be tuned per function.

### The three-layer model

A plain decorator is one function: it takes \`fn\` and returns a replacement. A parameterized decorator adds one outer layer that takes the config and returns that plain decorator. So there are three nested callables, each taking a different thing:

\`\`\`python
def multiply_by(factor):              # factory: takes the config
    def decorator(fn):                # decorator: takes the function
        def wrapper(*args, **kwargs): # wrapper: takes the call
            return fn(*args, **kwargs) * factor
        return wrapper
    return decorator
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "which-layer-runs-per-call",
  "prompt": "You drop a print('building') as the first line inside decorator(fn), above the def wrapper line. Three functions are decorated with @multiply_by(3), and each one is then called ten times. How many times does 'building' print?",
  "options": [
    {
      "label": "30, once per call",
      "feedback": "Tempting, because the decorator is what replaced the function, so it feels like it is involved in every call. Only the innermost wrapper is on the call path. The two outer layers finished their work long before."
    },
    {
      "label": "3, once per decorated function",
      "correct": true,
      "feedback": "Right. The @ line is evaluated once per decoration site while the module loads, so both outer layers run three times total and then never again."
    },
    {
      "label": "1, since multiply_by(3) is written the same way in all three places",
      "feedback": "Close, and worth being precise about: multiply_by(3) is a fresh call at every @ line, so it builds three separate decorator objects with three separate closures. Identical source text is not one shared object."
    },
    {
      "label": "0, because nothing runs until the decorated function is called",
      "feedback": "That is how the wrapper body behaves, but the decoration itself is eager: Python evaluates the @ expression at definition time, which is why a broken decorator can blow up on import."
    }
  ]
}
\`\`\`

Read \`@multiply_by(3)\` written above \`add\` as two steps:

\`\`\`python
add = multiply_by(3)(add)
# step 1: multiply_by(3) runs and returns \`decorator\`
# step 2: decorator(add) runs and returns \`wrapper\`, rebound to the name \`add\`
\`\`\`

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Layer", "Takes", "Returns", "Runs"],
  "rows": [
    ["multiply_by(factor)", "the config, 3", "the decorator", "once, at the @ line"],
    ["decorator(fn)", "the function being decorated", "the wrapper", "once, at the @ line"],
    ["wrapper(*args, **kwargs)", "the call arguments", "fn's result, times factor", "on every call"]
  ],
  "highlightCols": ["Runs"],
  "caption": "The highlighted column explains the classic mistake. Two layers run once when the module loads and only the third runs per call, so writing @multiply_by without the parentheses skips the factory entirely and hands your function in as factor."
}
\`\`\`

\`factor\` stays reachable inside \`wrapper\` because \`wrapper\` is a closure over the factory's scope. \`*args, **kwargs\` in \`wrapper\` forwards any call signature through untouched, so \`multiply_by\` works on \`add\`, on a one-argument function, or on anything else.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "decorated-function-name",
  "prompt": "add is decorated with @multiply_by(3). A logging line prints add.__name__. What shows up in the logs?",
  "options": [
    {
      "label": "add, because the name add is still what the module exports",
      "feedback": "Tempting, because the module-level name really is add and calling add(2, 3) works. But __name__ is an attribute of the function object, and the object bound to that name is no longer the one you wrote."
    },
    {
      "label": "wrapper, the name of the inner function that replaced it",
      "correct": true,
      "feedback": "Right. Every decorated function in the codebase reports the same name, which is exactly how a whole log stream turns into an unreadable pile of wrapper entries."
    },
    {
      "label": "multiply_by, the decorator that was applied",
      "feedback": "Reasonable, since multiply_by is the name you actually typed at the @ line. But the object that ends up bound to add is what decorator returned, and that is wrapper."
    },
    {
      "label": "An AttributeError, since closures do not carry __name__",
      "feedback": "Closures are ordinary function objects and carry the full set of attributes. The problem is not that __name__ is missing, it is that it describes the wrong function."
    }
  ]
}
\`\`\`

### functools.wraps

\`wrapper\` is a brand-new function object, so by default it reports itself, not the function it replaced:

\`\`\`python
print(add.__name__)   # 'wrapper'  (wrong: this corrupts logs, help(), and tracebacks)
\`\`\`

\`@functools.wraps(fn)\` copies \`fn\`'s \`__name__\`, \`__qualname__\`, \`__doc__\`, and \`__module__\` onto \`wrapper\`, updates \`wrapper.__dict__\`, and sets \`wrapper.__wrapped__ = fn\` so introspection tools can still find the original. With it in place, the demo below prints \`add\`, which is exactly what the second \`print\` verifies. Add \`functools.wraps\` to every real decorator you write.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "factory-without-parentheses",
  "prompt": "In a hurry you write @multiply_by with no parentheses above def add(a, b). What is the first thing that goes wrong?",
  "options": [
    {
      "label": "The import fails right away, because factor was never supplied",
      "feedback": "You would want that, and it is what makes this bug nasty. multiply_by(add) is a perfectly legal call: add just becomes the value of factor, so the module imports without a word."
    },
    {
      "label": "Nothing until add(2, 3) is called, which raises TypeError about positional arguments",
      "correct": true,
      "feedback": "Right. The name add now points at the inner decorator, which takes exactly one argument (fn), so passing two arguments is what finally exposes the missing call."
    },
    {
      "label": "Nothing ever, since factor quietly defaults to 1",
      "feedback": "There is no default in the signature, so nothing can fall back. And even a default would not save you, because the layer bound to add is the wrong one regardless of what factor holds."
    },
    {
      "label": "add(2, 3) returns 5 without multiplying, since the factory was skipped",
      "feedback": "A plausible silent-failure story, and silent failures do happen with decorators. Not here, though: add no longer refers to your function at all, so the original body never runs."
    }
  ]
}
\`\`\`

### Pitfall: forgetting the parentheses

A factory must be called. \`@multiply_by(3)\` is correct; \`@multiply_by\` is not. If you drop the \`(3)\`, Python runs \`multiply_by(add)\`, binds \`factor = add\`, and replaces \`add\` with the inner \`decorator\`. Nothing fails at definition time, so the bug hides until the next call:

\`\`\`python
@multiply_by          # missing (3)
def add(a, b):
    return a + b

add(2, 3)   # TypeError: multiply_by.<locals>.decorator() takes 1 positional argument but 2 were given
\`\`\`

The plain \`@name\` form (no call) is only for decorators that take a function directly. Anything parameterized needs the call.

**Interview nuance:** know when each layer runs. The factory and the \`decorator\` run exactly once, at definition time, when \`@multiply_by(3)\` is evaluated. Only \`wrapper\` runs on every call. So expensive setup (compiling a regex, opening a connection) belongs in the outer layers where it happens once, not inside \`wrapper\`. Each call to \`multiply_by\` also creates a fresh scope, so \`multiply_by(3)\` and \`multiply_by(5)\` capture independent \`factor\` values. The classic late-binding closure bug, where every closure shares one variable, only bites when you reuse the same name, for example building decorators inside a \`for\` loop.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "where-expensive-setup-belongs",
  "prompt": "You are writing @retry(times=3), and deciding where to compile the regex that matches retryable error messages. Compiling is not free. Which layer should own it?",
  "options": [
    {
      "label": "Inside wrapper, so the regex is always fresh for the call it serves",
      "feedback": "Tempting, because keeping setup next to the code that uses it is usually good hygiene. But wrapper is the one layer on the hot path, so you would pay the compile on every single call forever, and the regex never actually varies per call."
    },
    {
      "label": "Inside the factory, before it returns decorator",
      "correct": true,
      "feedback": "Right. The factory runs once per @ line, at import, and its scope is the only one that can see times, so config-dependent setup belongs there and the wrapper just closes over the result."
    },
    {
      "label": "At module top level as a global that every retry decorator shares",
      "feedback": "Close, and for a truly constant regex this is fine and even simpler. It stops working the moment the setup depends on the arguments, because a module-level global cannot see times."
    }
  ],
  "reveal": "The three layers are three different lifetimes: import-time config, import-time per-function setup, and per-call work. Put each piece of work in the outermost layer that can still see everything it needs."
}
\`\`\``,
    demoCode: `import functools


def multiply_by(factor):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs) * factor

        return wrapper

    return decorator


@multiply_by(3)
def add(a, b):
    return a + b


print(add(2, 3))      # 15
print(add.__name__)   # add`,
  },
  apply: {
    id: "py-l4-decorators-advanced-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`multiply_by(factor)\`, a decorator factory that multiplies a
function's result by \`factor\`. It's applied to \`add\` below, and the \`run\` driver calls it.

\`run(2, 3)\` should be \`15\` (because \`(2 + 3) * 3\`).`,
    starterCode: `import functools


def multiply_by(factor):
    def decorator(fn):
        # TODO: return a wrapper multiplying fn(...) by factor (use functools.wraps).
        return fn

    return decorator


@multiply_by(3)
def add(a, b):
    return a + b


def run(a, b):
    return add(a, b)`,
    hints: [
      "Inside `decorator`, define `wrapper(*args, **kwargs)` returning `fn(*args, **kwargs) * factor`.",
      "Decorate the wrapper with `@functools.wraps(fn)` and return it.",
      "`return wrapper` from `decorator`.",
    ],
    referenceSolution: `import functools


def multiply_by(factor):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs) * factor

        return wrapper

    return decorator


@multiply_by(3)
def add(a, b):
    return a + b


def run(a, b):
    return add(a, b)`,
    testCases: [
      { input: { a: 2, b: 3 }, expected: 15, description: "(2 + 3) * 3" },
      { input: { a: 1, b: 1 }, expected: 6, description: "(1 + 1) * 3" },
      { input: { a: 10, b: 5 }, expected: 45, description: "(10 + 5) * 3" },
    ],
  },
  practice: {
    id: "py-l4-decorators-advanced-practice",
    executionMode: "workspace",
    prompt: `Repair the nightly ingest, which currently fails a whole run on one feed blip and, when
retries were bolted on last week, kept retrying records that can never succeed.

Implement \`retry(times, on)\` in \`resilience/retry.py\`, then configure the two jobs in
\`ingest/jobs.py\` with the policies in \`README.md\`. \`times\` counts total attempts, not extra
ones. Only the exception classes in \`on\` are retryable; the last one still raises once the
attempts are gone. Each decorated function reports its own running attempt total as
\`fn.stats["attempts"]\`, keeps its \`__name__\` and \`__doc__\`, and forwards positional and keyword
arguments untouched. \`ingest/feed.py\` is read-only. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Two of the three layers run once at the `@` line and one runs per call. The attempt total has to survive every call to one function without leaking into the next function the same decorator is applied to, so ask which of the three layers has exactly that lifetime.",
      "A name bound inside `decorator(fn)`, above the `def wrapper` line, is created once per decorated function. Make the counter a mutable container so the wrapper can update it through the closure rather than rebinding it, and hand the same container back out as the wrapper's `stats`.",
      "`except on as exc` accepts a tuple of exception classes directly, so anything missing from `on` is never caught and leaves from the attempt that raised it. Two gotchas around that: the caught exception is gone once the `except` block ends, so keep the one you want to re-raise in a name of your own, and a bare wrapper reports its own `__name__`, which is what `functools.wraps(fn)` is for. In `ingest/jobs.py` the two `@` lines are the README table, one row each.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "resilience/retry.py",
      editableFilePaths: ["resilience/retry.py", "ingest/jobs.py"],
      visibleTestPaths: ["tests/test_retry.py", "tests/test_jobs.py"],
      hiddenTestPaths: ["tests/test_retry_hidden.py", "tests/test_jobs_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: RETRY_README },
        {
          path: "resilience/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "resilience/retry.py",
          role: "editable",
          language: "python",
          content: RETRY_STARTER,
          description: "Implement the retry decorator factory here",
        },
        {
          path: "ingest/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "ingest/jobs.py",
          role: "editable",
          language: "python",
          content: RETRY_JOBS_STARTER,
          description: "Configure each job's retry policy here",
        },
        {
          path: "ingest/feed.py",
          role: "readonly",
          language: "python",
          content: RETRY_FEED,
          description: "Scripted feed and its error classes (read-only)",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_retry.py",
          role: "test",
          language: "python",
          content: RETRY_TEST,
          description: "Visible tests for the retry decorator",
        },
        {
          path: "tests/test_jobs.py",
          role: "test",
          language: "python",
          content: RETRY_JOBS_TEST,
          description: "Visible tests for the configured jobs",
        },
        {
          path: "tests/test_retry_hidden.py",
          role: "test",
          language: "python",
          content: RETRY_TEST_HIDDEN,
          hidden: true,
          description: "Hidden tests for wraps and per-function state",
        },
        {
          path: "tests/test_jobs_hidden.py",
          role: "test",
          language: "python",
          content: RETRY_JOBS_TEST_HIDDEN,
          hidden: true,
          description: "Hidden tests for the purge job's policy",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_retry", label: "visible retry" },
            { module: "test_jobs", label: "visible jobs" },
            { module: "test_retry_hidden", label: "hidden retry" },
            { module: "test_jobs_hidden", label: "hidden jobs" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "resilience/retry.py",
          role: "editable",
          language: "python",
          content: RETRY_REFERENCE,
        },
        {
          path: "ingest/jobs.py",
          role: "editable",
          language: "python",
          content: RETRY_JOBS_REFERENCE,
        },
      ],
    },
  },
}

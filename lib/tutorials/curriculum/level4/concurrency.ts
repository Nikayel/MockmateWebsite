// ───────────────────────────────────────────────────────────────────────────
// L4-M3: Concurrency & Async
// ───────────────────────────────────────────────────────────────────────────

import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const CONC_README = buildBrief({
  lesson: "py-l4-concurrency",
  kind: "bug-report",
  headline: "the asset sweep reports the wrong sizes",
  body: `The nightly sweep fetches every asset path and writes a size report. Since it was moved onto an
executor the report has been wrong: sizes land against the wrong paths, and a vendor outage last
week produced a report of zeros instead of an alert.

This sandbox has **no OS threads**, so \`harness/executor.py\` (read-only) is a fake executor that
runs each call immediately and then hands the futures back in a **completion order that is not
input order**. A future carries no index and no url, only \`.result()\`, which re-raises whatever
the call raised. That is faithful to the real thing, and it is why order and error handling have
to be bookkeeping you write rather than something you inherit.

\`workers/fetch.py\` (read-only) exposes \`fetch(url)\`, \`TransientError\`, \`PermanentError\`, and
\`reset_calls()\`. Some paths succeed, some fail once and succeed on the next attempt, some always
time out, and unknown paths are permanent failures.

A batch may list the same path more than once, and every entry is its own piece of work: each one
is fetched and each one gets its own size in the report.

## What to build

**\`pipeline/policy.py\`** owns the failure policy:

- \`should_retry(error, attempts)\` is true only for a transient failure that has not yet used
  \`MAX_ATTEMPTS\` attempts.
- \`give_up(url, error)\` settles a failure that will not be retried again, and always returns:
  the size to record for a transient failure that ran out of attempts, or \`None\` for a failure
  the report cannot absorb. \`None\` is the collector's signal to let the error out to the caller.

**\`pipeline/collector.py\`** owns \`run_batch(executor, urls)\`, which returns:

\`\`\`python
{"sizes": [<int per url, in INPUT order>], "retried": [<urls that took a second attempt, in input order>]}
\`\`\`

\`run_batch(executor, ["/a", "/b"])\` is \`{"sizes": [10, 20], "retried": []}\`.
`,
})

const CONC_EXECUTOR = String.raw`"""A stand-in for concurrent.futures, because this runtime has no OS threads.

The behaviour that matters is preserved: submitted work produces a future, a future holds
either a value or the exception the call raised, and completion order is not input order.
"""


class FakeFuture:
    """One submitted call. The work has already run; the outcome is stored here."""

    def __init__(self, fn, arg):
        try:
            self._value = fn(arg)
            self._error = None
        except Exception as error:  # noqa: BLE001 - a future stores any failure
            self._value = None
            self._error = error

    def result(self):
        """Return the value, or re-raise the exception the call raised."""
        if self._error is not None:
            raise self._error
        return self._value


class OutOfOrderExecutor:
    """Runs each submitted call immediately and returns a future for it."""

    def submit(self, fn, arg):
        return FakeFuture(fn, arg)


def as_completed(futures):
    """Yield the futures in completion order, which is deliberately not input order."""
    futures = list(futures)
    for future in futures[1::2] + futures[0::2][::-1]:
        yield future
`

const CONC_FETCH = String.raw`"""The read-only asset service. Deterministic, so failures are reproducible."""


class TransientError(Exception):
    """A timeout or a blip. Trying again may work."""


class PermanentError(Exception):
    """The path is wrong. Trying again will never work."""


_SIZES = {"/a": 10, "/b": 20, "/c": 30, "/d": 40, "/e": 50}
_FLAKY = {"/flaky-1": 11, "/flaky-2": 22}
_ALWAYS_SLOW = "/timeout"

_calls = {}


def reset_calls():
    """Forget how many times each url has been fetched (tests call this first)."""
    _calls.clear()


def call_count(url):
    return _calls.get(url, 0)


def fetch(url):
    _calls[url] = _calls.get(url, 0) + 1
    if url in _SIZES:
        return _SIZES[url]
    if url in _FLAKY:
        if _calls[url] == 1:
            raise TransientError("timed out reading " + url)
        return _FLAKY[url]
    if url == _ALWAYS_SLOW:
        raise TransientError("timed out reading " + url)
    raise PermanentError("no such path: " + url)
`

const CONC_POLICY_STARTER = String.raw`from workers.fetch import PermanentError, TransientError

MAX_ATTEMPTS = 2


def should_retry(error, attempts):
    """Is this failure worth another attempt? See README.md."""
    # TODO: allow another attempt only for failures that could succeed later,
    # and only while attempts are still available.
    return False


def give_up(url, error):
    """Settle a failure that will not be retried again. Always returns. See README.md."""
    # TODO: decide what a failure becomes once retrying is over: a size the report can
    # record, or nothing the report can stand behind.
    return 0
`

const CONC_POLICY_REFERENCE = String.raw`from workers.fetch import PermanentError, TransientError

MAX_ATTEMPTS = 2


def should_retry(error, attempts):
    return isinstance(error, TransientError) and attempts < MAX_ATTEMPTS


def give_up(url, error):
    if isinstance(error, TransientError):
        # Out of attempts: record it as empty rather than failing the whole sweep.
        return 0
    # PermanentError (and anything unrecognised) has no size the report can stand behind.
    return None
`

const CONC_COLLECTOR_STARTER = String.raw`from harness.executor import as_completed
from workers.fetch import fetch

from pipeline import policy


def run_batch(executor, urls):
    """Fetch every url through the executor and report sizes. See README.md."""
    # TODO: submit every url, pair each finished future back to the url it came from,
    # apply the policy to failures, and return sizes in input order plus the retried urls.
    return {"sizes": [], "retried": []}
`

const CONC_COLLECTOR_REFERENCE = String.raw`from harness.executor import as_completed
from workers.fetch import fetch

from pipeline import policy


def run_batch(executor, urls):
    sizes = [None] * len(urls)
    attempts = [0] * len(urls)
    was_retried = [False] * len(urls)

    wave = list(range(len(urls)))
    while wave:
        # The future itself carries no index, so the index has to be kept beside it.
        pending = {}
        for index in wave:
            attempts[index] += 1
            pending[executor.submit(fetch, urls[index])] = index

        next_wave = []
        for future in as_completed(list(pending)):
            index = pending[future]
            try:
                sizes[index] = future.result()
            except Exception as error:  # noqa: BLE001 - the policy decides what it means
                if policy.should_retry(error, attempts[index]):
                    was_retried[index] = True
                    next_wave.append(index)
                else:
                    settled = policy.give_up(urls[index], error)
                    if settled is None:
                        raise
                    sizes[index] = settled
        wave = next_wave

    return {
        "sizes": sizes,
        "retried": [url for url, retried in zip(urls, was_retried) if retried],
    }
`

const CONC_TEST = String.raw`from harness.executor import OutOfOrderExecutor
from pipeline import policy
from pipeline.collector import run_batch
from workers import fetch as fetch_module
from workers.fetch import TransientError


def sweep(urls):
    fetch_module.reset_calls()
    return run_batch(OutOfOrderExecutor(), urls)


def run_tests(record):
    def sizes_follow_input_order():
        result = sweep(["/a", "/b", "/c", "/d"])
        assert result["sizes"] == [10, 20, 30, 40], (
            f"expected [10, 20, 30, 40] in input order, got {result['sizes']!r}"
        )

    def clean_batch_retries_nothing():
        result = sweep(["/a", "/b"])
        assert result["retried"] == [], f"expected [], got {result['retried']!r}"

    def empty_batch():
        result = sweep([])
        assert result == {"sizes": [], "retried": []}, (
            f"expected {{'sizes': [], 'retried': []}}, got {result!r}"
        )

    def flaky_url_recovers_at_its_own_index():
        result = sweep(["/a", "/flaky-1", "/c"])
        assert result["sizes"] == [10, 11, 30], f"expected [10, 11, 30], got {result['sizes']!r}"
        assert result["retried"] == ["/flaky-1"], (
            f"expected ['/flaky-1'], got {result['retried']!r}"
        )

    def transient_failure_is_retried_once():
        error = TransientError("timed out reading /a")
        assert policy.should_retry(error, 1), (
            f"expected a transient failure on attempt 1 to be worth retrying, got "
            f"{policy.should_retry(error, 1)!r}"
        )
        assert not policy.should_retry(error, policy.MAX_ATTEMPTS), (
            "expected no retry once MAX_ATTEMPTS attempts are used, got "
            f"{policy.should_retry(error, policy.MAX_ATTEMPTS)!r}"
        )

    record("sizes come back in input order", sizes_follow_input_order)
    record("a clean batch reports no retries", clean_batch_retries_nothing)
    record("an empty batch returns empty lists", empty_batch)
    record("a flaky url recovers at its own index", flaky_url_recovers_at_its_own_index)
    record("transient failures are retried, but not forever", transient_failure_is_retried_once)
`

const CONC_TEST_HIDDEN = String.raw`from harness.executor import OutOfOrderExecutor
from pipeline import policy
from pipeline.collector import run_batch
from workers import fetch as fetch_module
from workers.fetch import PermanentError, TransientError


def sweep(urls):
    fetch_module.reset_calls()
    return run_batch(OutOfOrderExecutor(), urls)


def run_tests(record):
    def permanent_failure_reaches_the_caller():
        raised = None
        try:
            sweep(["/a", "/missing", "/c"])
        except PermanentError as error:
            raised = error
        assert raised is not None, "expected PermanentError to propagate out of run_batch, got no error"
        assert "/missing" in str(raised), f"expected the url in the message, got {str(raised)!r}"

    def permanent_failure_is_never_retried():
        error = PermanentError("no such path: /missing")
        assert not policy.should_retry(error, 1), (
            f"expected a permanent failure never to be retried, got "
            f"{policy.should_retry(error, 1)!r}"
        )

    def give_up_settles_transient_and_refuses_permanent():
        value = policy.give_up("/timeout", TransientError("timed out reading /timeout"))
        assert value == 0, f"expected 0 for an exhausted transient failure, got {value!r}"
        refused = policy.give_up("/missing", PermanentError("no such path: /missing"))
        assert refused is None, (
            f"expected None for a permanent failure, since the report has no size to record, "
            f"got {refused!r}"
        )

    def a_url_that_never_succeeds_does_not_sink_the_batch():
        result = sweep(["/a", "/timeout", "/e"])
        assert result["sizes"] == [10, 0, 50], f"expected [10, 0, 50], got {result['sizes']!r}"
        assert result["retried"] == ["/timeout"], (
            f"expected ['/timeout'], got {result['retried']!r}"
        )

    def two_flaky_urls_keep_their_places():
        result = sweep(["/flaky-2", "/b", "/flaky-1", "/d"])
        assert result["sizes"] == [22, 20, 11, 40], (
            f"expected [22, 20, 11, 40], got {result['sizes']!r}"
        )
        assert result["retried"] == ["/flaky-2", "/flaky-1"], (
            f"expected ['/flaky-2', '/flaky-1'] in input order, got {result['retried']!r}"
        )

    def each_entry_is_fetched_exactly_once_when_nothing_fails():
        sweep(["/a", "/b", "/a"])
        assert fetch_module.call_count("/a") == 2, (
            f"expected one fetch per entry, so 2 for the two '/a' entries, got "
            f"{fetch_module.call_count('/a')}"
        )

    record("a permanent failure reaches the caller", permanent_failure_reaches_the_caller)
    record("a permanent failure is never retried", permanent_failure_is_never_retried)
    record(
        "give_up records an exhausted transient failure and refuses a permanent one",
        give_up_settles_transient_and_refuses_permanent,
    )
    record("one dead url does not sink the batch", a_url_that_never_succeeds_does_not_sink_the_batch)
    record("two flaky urls keep their places", two_flaky_urls_keep_their_places)
    record(
        "each entry is fetched exactly once when nothing fails",
        each_entry_is_fetched_exactly_once_when_nothing_fails,
    )
`

/**
 * Read-only header for the APPLY exercise. It gives the single-file apply the same executor
 * surface the practice workspace has (`submit` / `as_completed` / `result()`, and no `map`), so
 * the ordering problem is already familiar by the time the practice adds failures and retries.
 * `solution(urls)` exists because the single-file runner calls one top-level function with the
 * test case's values; it builds the executor the learner's `fetch_all` is graded against.
 */
const APPLY_PREAMBLE = String.raw`# --- Read-only setup: a stand-in for concurrent.futures, because this runtime has no
# --- OS threads. It has submit() and as_completed(), and deliberately no map().
class FakeFuture:
    def __init__(self, fn, arg):
        self._value = fn(arg)

    def result(self):
        return self._value


class OutOfOrderExecutor:
    def submit(self, fn, arg):
        return FakeFuture(fn, arg)


def as_completed(futures):
    """Yield the futures in completion order, which is deliberately not input order."""
    futures = list(futures)
    return iter(futures[1::2] + futures[0::2][::-1])


SIZES = {"/a": 10, "/b": 20, "/c": 30, "/d": 40, "/e": 50}


def fetch(url):
    return SIZES[url]


def solution(urls):
    return fetch_all(OutOfOrderExecutor(), urls)
# --- End of setup. Your work starts below. ---
`

export const concurrencyLesson: PythonLesson = {
  id: "py-l4-concurrency",
  title: "Threads, the GIL & concurrent.futures",
  summary: "Choose a concurrency model and parallelize a batch with a thread pool.",
  estimatedMinutes: 50,
  difficulty: "hard",
  skills: ["concurrency", "threading", "concurrent-futures", "gil"],
  teach: {
    estimatedMinutes: 10,
    markdown: `## Doing more than one thing at once

Every real service waits: on a database, an HTTP API, a file, a message queue. If you fetch 100 URLs one at a time, your program spends nearly all its wall-clock time blocked, doing nothing. Concurrency lets those waits overlap, so 100 slow calls finish in roughly the time of the slowest one instead of the sum of all of them. Choosing the right model (threads, processes, or \`async\`) is a classic interview question because the wrong choice makes code either no faster or outright wrong.

The reason overlapping waits pays off so enormously is that the costs are not close to each other. Each rung below is orders of magnitude off the one before it, and the ladder spans a factor of a hundred million end to end:

\`\`\`csdiagram
{
  "type": "ladder",
  "title": "What a Python program is actually waiting on",
  "scale": "log",
  "bands": [
    { "label": "CPU instruction", "value": 1, "display": "~1 ns", "note": "One bytecode step. The GIL serialises these across threads." },
    { "label": "Main memory read", "value": 100, "display": "~100 ns", "note": "A dict lookup or attribute access lands here." },
    { "label": "SSD read", "value": 100000, "display": "~100 μs", "note": "1,000x slower than RAM. The GIL is released while you wait." },
    { "label": "Datacenter round trip", "value": 500000, "display": "~500 μs", "note": "Service to service inside one region." },
    { "label": "Internet API call", "value": 100000000, "display": "~100 ms", "note": "100 million CPU instructions' worth of doing nothing." }
  ],
  "caption": "One HTTP call costs about as much time as 100 million CPU instructions. Overlapping those waits is where nearly all the win comes from, which is why I/O-bound work is the case threads help."
}
\`\`\`

Read the gap between the bottom rung and the top one and the decision rule below almost writes itself: if your program is sitting on the top rung, giving it more cores changes nothing, but letting the waits overlap changes everything.

The standard tool for overlapping those waits is a **thread pool**. A \`ThreadPoolExecutor\` keeps a fixed number of threads alive, called **workers**, and feeds each one the next task as it comes free. You rent, say, eight workers once instead of paying to create a thread per item. Hold that picture for the next question, because the obvious prediction about it is wrong.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "threads-on-cpu-bound-work",
  "prompt": "A report takes 80 seconds, all of it a pure-Python scoring loop over records already in memory. The box has 8 cores. You wrap the work in a ThreadPoolExecutor with 8 workers. What happens to the wall clock?",
  "options": [
    {
      "label": "About 8 times faster, one chunk of records per core",
      "feedback": "Tempting, and this is exactly what threads do in Java or Go. CPython holds a Global Interpreter Lock while executing bytecode, so only one of those eight threads is ever running Python at a given instant."
    },
    {
      "label": "Roughly unchanged, and often a few percent worse",
      "correct": true,
      "feedback": "Right. The threads take turns holding one lock, so you got the same total work plus the cost of switching between them. For CPU-bound work the lever is processes, not threads."
    },
    {
      "label": "About 8 times faster, because the records are independent and nothing is shared",
      "feedback": "Independence is necessary but it is not the thing standing in your way. Even with zero shared state, the interpreter lock still lets only one thread run bytecode, so perfectly parallel-looking work stays serial."
    },
    {
      "label": "About 2 times faster, since the interpreter hands the lock off every few milliseconds",
      "feedback": "The switch interval is real, and it is why threads feel responsive rather than frozen. Handing the lock around does not create parallelism though: it just splits the same single lane into turns."
    }
  ]
}
\`\`\`

### The GIL: one bytecode at a time

CPython protects its internal memory with a **Global Interpreter Lock**. Only one thread executes Python bytecode at any instant, so pure-Python threads never run *in parallel* across cores. What rescues threading is that the GIL is **released during blocking I/O** (and inside many C extensions like \`numpy\`). While one thread waits on a socket, it drops the lock and another thread runs. That gives you the decision rule:

- **I/O-bound** work (network, disk, waiting): threads help, because the waits overlap.
- **CPU-bound** work (hashing, parsing, pure-Python math): threads do not help. Use \`ProcessPoolExecutor\` (separate processes, each with its own GIL) or push the work into a native library.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "threads-help-or-not",
  "prompt": "Each of these jobs takes too long. Sort them by whether a thread pool speeds them up.",
  "buckets": ["A thread pool helps", "You need processes"],
  "items": [
    {
      "label": "Fetching 200 product records from a slow vendor API",
      "bucket": "A thread pool helps",
      "feedback": "Almost all of that time is a socket wait, and the interpreter lock is released while a thread waits, so 200 waits collapse into roughly one."
    },
    {
      "label": "Scoring 2 million rows with a pure-Python loop",
      "bucket": "You need processes",
      "feedback": "This is bytecode from start to finish, so the lock is never released and eight threads take turns in one lane. Separate processes each get their own interpreter and their own lock."
    },
    {
      "label": "Reading 500 small config files off the local SSD",
      "bucket": "A thread pool helps",
      "feedback": "Disk reads are I/O too, and the lock is dropped for the duration of each one. Slower per call than a memory read by a factor of about a thousand, which is exactly the gap threads exist to hide."
    },
    {
      "label": "Multiplying two large NumPy matrices",
      "bucket": "A thread pool helps",
      "feedback": "The surprising one. NumPy drops the interpreter lock inside its C loops, so the heavy work really does run on several cores at once even though the calling code is Python."
    },
    {
      "label": "Resizing 500 photos with a hand-written pixel loop in Python",
      "bucket": "You need processes",
      "feedback": "Pure-Python arithmetic holds the lock the whole way through. Rewriting the loop with a library that releases it, such as Pillow or NumPy, is the other way out."
    },
    {
      "label": "Waiting on 40 database queries that each take about half a second server-side",
      "bucket": "A thread pool helps",
      "feedback": "Your process is blocked on a socket while the database does the work, so overlapping the waits turns 20 seconds into roughly half a second."
    }
  ]
}
\`\`\`

### concurrent.futures: one API for both

\`concurrent.futures\` gives threads and processes the same interface. The common pattern maps a function over inputs:

\`\`\`python
from concurrent.futures import ThreadPoolExecutor

def double(n):
    return n * 2

with ThreadPoolExecutor(max_workers=4) as executor:
    print(list(executor.map(double, [1, 2, 3])))   # [2, 4, 6]
\`\`\`

\`executor.map\` returns results in **input order**, not completion order, even though the tasks finish out of order. Swap in \`ProcessPoolExecutor\` and the code is identical. Two things to remember about \`map\`: it returns a **lazy iterator**, so wrap it in \`list(...)\` when you need a real list (the demo above does), and it re-raises a worker's exception when you iterate to that result, not when you call \`map\`.

### submit, futures, and doing the bookkeeping yourself

\`map\` hands you ordering for free, and the price is that you cannot react to one result before the rest arrive. When you need to handle each outcome the moment it lands, retry a failure, or report progress, you drop to \`executor.submit(fn, x)\`. It returns a **\`Future\`**: a handle to work whose outcome is not known yet. \`as_completed(futures)\` yields those futures **in completion order, which is not input order**, and \`future.result()\` either returns the value or **re-raises the exception the worker raised**.

A \`Future\` carries no memory of what was submitted to produce it. It has no index and no argument on it. So the standard move is to build a dict from future to whatever you need back, at submit time:

\`\`\`python
from concurrent.futures import ThreadPoolExecutor, as_completed

def size_of(url):
    if url == "/bad":
        raise ValueError("no such path: " + url)
    return len(url) * 10

with ThreadPoolExecutor(max_workers=4) as executor:
    pending = {executor.submit(size_of, url): url for url in ["/a", "/bb", "/bad"]}
    for future in as_completed(pending):      # completion order, not input order
        url = pending[future]                 # the future alone would not tell you this
        try:
            print(url, future.result())       # result() re-raises the worker's exception
        except ValueError as error:
            print(url, "failed:", error)
\`\`\`

That dict is the whole trick. If the caller wants results in **input order**, map each future to its *position* instead of its value, size a result list up front, and write into it by index. Appending as futures complete gives you completion order, which is the bug this pattern exists to prevent.

### Retrying without retrying forever

Concurrent work fails piecemeal: one call in fifty times out while the other forty-nine succeed. The first question to answer is whether a failure is **transient** (a timeout, a dropped connection, a 503, something a second attempt could fix) or **permanent** (a 404, a malformed request, a missing credential, something no number of attempts will fix). Retrying a permanent failure just multiplies the load on a service that already told you no, and it hides a real bug behind a slow one.

The second question is the **attempt budget**. An unbounded retry loop turns one dead endpoint into a job that never finishes, so you cap attempts (two or three is typical) and decide what an exhausted failure becomes: a recorded zero, a skipped row, or an alert. Production code also spaces attempts out with backoff, usually exponential and jittered, so a fleet of retrying clients does not stampede a recovering service in lockstep.

\`\`\`python
def with_retries(fn, arg, max_attempts=2):
    for attempt in range(1, max_attempts + 1):
        try:
            return fn(arg)
        except TimeoutError:                     # transient: worth another go
            if attempt == max_attempts:
                raise                            # budget spent, stop pretending
        except ValueError:                       # permanent: retrying changes nothing
            raise
\`\`\`

You met the reusable version of this in **Decorators with arguments & functools.wraps**, where \`retry(times, on)\` wraps a function so callers never see the loop. The decorator is the right shape when the retry is per call. When failures have to be re-submitted to a pool, the loop lives in the code that owns the pool, because the retry is a second wave of submissions rather than a second call in place.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "gil-does-not-mean-thread-safe",
  "prompt": "Two threads each do counter += 1 five hundred thousand times against one shared global. What is the final value?",
  "options": [
    {
      "label": "Somewhere under 1000000, and a different number on each run",
      "feedback": "True through Python 3.9, and still what most write-ups say. Since 3.10 the interpreter only looks for a thread switch after a call and at the top of each loop iteration, so the read, add, store triple in a bare counter += 1 finishes uninterrupted and nothing is lost."
    },
    {
      "label": "Exactly 1000000 on CPython 3.10+, under 1000000 on older versions, which is why you must never rely on either",
      "correct": true,
      "feedback": "Right. The clean total is an accident of where one interpreter version checks for a thread switch, not a promise about your invariants. Put a call in the middle of the update, counter += one(), and the lost updates come straight back on 3.12: four threads bumping 200000 times each finish short of 800000, by a different amount on every run."
    },
    {
      "label": "Exactly 500000, since the second thread overwrites everything the first one did",
      "feedback": "Too pessimistic in every version. Threads never discard each other's work wholesale. On the interpreters where this shape did race, it lost the occasional unlucky increment, which is why the bug survived testing and showed up in production."
    },
    {
      "label": "A RuntimeError, because Python detects the concurrent modification",
      "feedback": "Some containers do raise on concurrent mutation while being iterated, which is probably what this is recalling. A plain integer rebind has no such guard, so when a lost update does happen there is nothing to tell you."
    }
  ]
}
\`\`\`

### Pitfall: threads sharing state

Independent tasks are safe to parallelize. Shared mutable state is not. \`count += 1\` is read, add, write: three steps with no lock of your own around them. Whether the interpreter switches threads in the middle depends on where that version happens to check, and the moment a call joins the update (\`count += fee(row)\`, or a lookup then a store two statements apart) the switch becomes possible again and increments start vanishing. The GIL does not make your code thread-safe. Fix it with a \`Lock\`, or better, design the work so tasks never touch shared state (as \`double\` does here).

### Running where there are no threads

This in-browser sandbox (Pyodide/WASM) has no OS threads, so building a real pool raises \`RuntimeError: can't start new thread\`. The demo above therefore falls back to a plain comprehension, which is honest about one thing and misleading about another: the results match, and nothing about ordering or failure handling gets exercised, because a sequential comprehension has neither problem to solve.

So the exercises in this lesson do not use \`concurrent.futures\` at all. They hand you a **fake executor** that has one method, \`submit(fn, arg)\`, returning a future with one method, \`result()\`. There is no \`map\` on it, deliberately: \`map\` would do the ordering work that is the whole point. Its \`as_completed\` shuffles the futures so completion order is visibly not input order, and its futures store an exception instead of a value when the call raises. Those three behaviours are the ones that survive the move to a real \`ThreadPoolExecutor\`, so the bookkeeping you write here is the bookkeeping you would write against the real API.

**Interview nuance:** Interviewers often follow up with "what is the difference between concurrency and parallelism?" Concurrency is structuring work so tasks make progress by interleaving, which is what a thread pool and \`async\` give you under the GIL. Parallelism is tasks running at the same instant on different cores, which is what a process pool gives you (or the free-threaded no-GIL build, experimental in 3.13 and officially supported since 3.14). So on the default build a \`ThreadPoolExecutor\` buys you concurrency and overlaps I/O waits, but only processes buy you CPU parallelism. On a free-threaded build that changes: threads really do run bytecode on several cores, so a \`ThreadPoolExecutor\` buys CPU parallelism too. It is still a separate opt-in build rather than the interpreter most people are running, so the rule above is the one to answer with unless you are asked about 3.14 specifically. Naming that distinction, and tying it to the GIL, is exactly the signal they are listening for.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "mixed-workload-executor-choice",
  "prompt": "A nightly job pulls 500 documents over HTTP (about 100 ms of waiting each) and then runs a pure-Python scoring pass over each one (about 200 ms of CPU each). Sequentially that is 50 seconds of waiting plus 100 seconds of computing. The box has 4 cores. What is the best structure?",
  "options": [
    {
      "label": "A ThreadPoolExecutor around the whole job, since the network is the slow part",
      "feedback": "The instinct is right for the first half, but check the arithmetic: the scoring is 100 seconds against the download's 50. Threads collapse the waiting to about a second and leave the larger half untouched."
    },
    {
      "label": "Threads for the downloads, then a ProcessPoolExecutor for the scoring",
      "correct": true,
      "feedback": "Right. Each half is bounded by something different, so each half gets the tool for that bound: overlap the waits with threads, then spread the bytecode across cores with processes."
    },
    {
      "label": "A ProcessPoolExecutor around the whole job, since each process gets its own interpreter lock",
      "feedback": "Genuinely close, and often the pragmatic answer because it does speed up both halves. You pay pickling and process startup for work that only ever needed a thread, and the downloads end up limited by your 4 cores rather than by the network."
    },
    {
      "label": "asyncio for both, so the event loop can interleave everything",
      "feedback": "The loop handles the download half beautifully. The scoring pass is the problem: 200 ms of uninterrupted bytecode blocks the loop, so every other task waits behind it and the CPU half is no faster."
    }
  ],
  "reveal": "The useful habit is to ask what each stage is waiting on before picking a tool. Waiting on someone else means threads or async, waiting on your own CPU means processes, and a job that does both usually wants a different answer per stage."
}
\`\`\``,
    demoCode: `from concurrent.futures import ThreadPoolExecutor


def double(n):
    return n * 2


try:
    with ThreadPoolExecutor(max_workers=4) as executor:
        print(list(executor.map(double, [1, 2, 3])))   # threads where available
except RuntimeError:
    print([double(n) for n in [1, 2, 3]])              # sequential fallback -> [2, 4, 6]`,
  },
  apply: {
    id: "py-l4-concurrency-apply",
    executionMode: "single-file",
    // Time budget (counted): 24 read-only preamble lines to read, 8 lines to write.
    estimatedMinutes: 8,
    prompt: `Implement \`fetch_all(executor, urls)\` to return one size per url, **in input order**.

Everything above the marked line in the editor is a read-only stand-in for \`concurrent.futures\`,
because this runtime has no OS threads. \`executor.submit(fetch, url)\` gives you a future,
\`as_completed(futures)\` yields those futures in an order that is not input order, and
\`future.result()\` gives you the value. There is no \`map\`. Every url here succeeds, so there is
nothing to handle but the ordering.

\`fetch_all(executor, ["/c", "/a"])\` is \`[30, 10]\`.`,
    starterCode: `${APPLY_PREAMBLE}

def fetch_all(executor, urls):
    """Return one size per url, in the order the urls were given. See the prompt."""
    # TODO: submit every url, then put each finished result where its url sits in the input.
    pass`,
    hints: [
      "A future does not remember what was submitted to produce it, so record what you need beside each future as you submit it.",
      "You know how many results there will be before any of them arrive, and you know where each one belongs. Appending as futures complete would give you completion order.",
      "Build the pairing at submit time with a dict, then write each `future.result()` into the position that dict gives you.",
    ],
    referenceSolution: `${APPLY_PREAMBLE}

def fetch_all(executor, urls):
    pending = {}
    for index, url in enumerate(urls):
        pending[executor.submit(fetch, url)] = index

    sizes = [None] * len(urls)
    for future in as_completed(list(pending)):
        sizes[pending[future]] = future.result()
    return sizes`,
    testCases: [
      {
        input: { urls: ["/a", "/b", "/c"] },
        expected: [10, 20, 30],
        description: "sizes come back in input order",
      },
      {
        input: { urls: ["/c", "/a", "/b", "/d"] },
        expected: [30, 10, 20, 40],
        description: "input order is not completion order",
      },
      { input: { urls: ["/e"] }, expected: [50], description: "a single url" },
      {
        input: { urls: ["/a", "/b", "/a"] },
        expected: [10, 20, 10],
        description: "the same url twice keeps both places",
      },
      { input: { urls: [] }, expected: [], description: "no urls" },
    ],
  },
  practice: {
    id: "py-l4-concurrency-practice",
    executionMode: "workspace",
    prompt: `Repair the nightly asset sweep (ticket CS-019). Since it moved onto an executor, sizes
land against the wrong paths and a vendor outage produced a report of zeros instead of an alert.

This runtime has no OS threads, so \`harness/executor.py\` is a fake executor that finishes work in
an order that is not input order, and its futures carry no url and no index. Two files are yours:

- \`pipeline/policy.py\`: \`should_retry(error, attempts)\` and \`give_up(url, error)\` decide which
  failures deserve another attempt, which are recorded as size \`0\`, and which the report cannot
  stand behind. \`give_up\` always returns a value.
- \`pipeline/collector.py\`: \`run_batch(executor, urls)\` returns
  \`{"sizes": [...], "retried": [...]}\` with sizes in **input order** and the retried urls in input
  order.

\`run_batch(executor, ["/a", "/b"])\` is \`{"sizes": [10, 20], "retried": []}\`. Read \`README.md\`
for the full contract. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "You paired futures to positions in the Apply step. The new part is that a position can need a second attempt, so a failure has to be able to send its position round again.",
      "Keep an attempt count per position alongside the sizes. A retry is a second wave of submissions over the positions that failed and are still worth trying, so the outer shape is a loop over waves.",
      "`future.result()` is where a failure re-appears, so that call belongs in a `try` and the caught exception goes to the policy.",
    ],
    // Time budget (counted, not guessed): 156 lines to read (README 34, harness/executor.py 38,
    // workers/fetch.py 38, visible tests 46) at roughly 8 lines a minute, plus about 34 lines to
    // write across two files at roughly 2 minutes a line for the wave loop and the pairing dict.
    estimatedMinutes: 32,
    workspace: {
      language: "python",
      primaryFilePath: "pipeline/collector.py",
      editableFilePaths: ["pipeline/collector.py", "pipeline/policy.py"],
      visibleTestPaths: ["tests/test_sweep.py"],
      hiddenTestPaths: ["tests/test_sweep_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CONC_README },
        { path: "harness/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "harness/executor.py",
          role: "readonly",
          language: "python",
          content: CONC_EXECUTOR,
          description: "The fake executor and as_completed (read-only)",
        },
        { path: "workers/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "workers/fetch.py",
          role: "readonly",
          language: "python",
          content: CONC_FETCH,
          description: "The asset service being fetched (read-only)",
        },
        { path: "pipeline/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "pipeline/policy.py",
          role: "editable",
          language: "python",
          content: CONC_POLICY_STARTER,
          description: "Decide what each failure means",
        },
        {
          path: "pipeline/collector.py",
          role: "editable",
          language: "python",
          content: CONC_COLLECTOR_STARTER,
          description: "Submit the work and collect results in order",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_sweep.py",
          role: "test",
          language: "python",
          content: CONC_TEST,
          description: "Visible sweep tests",
        },
        {
          path: "tests/test_sweep_hidden.py",
          role: "test",
          language: "python",
          content: CONC_TEST_HIDDEN,
          hidden: true,
          description: "Hidden sweep tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_sweep", label: "visible sweep" },
            { module: "test_sweep_hidden", label: "hidden sweep" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "pipeline/policy.py",
          role: "editable",
          language: "python",
          content: CONC_POLICY_REFERENCE,
        },
        {
          path: "pipeline/collector.py",
          role: "editable",
          language: "python",
          content: CONC_COLLECTOR_REFERENCE,
        },
      ],
    },
  },
}

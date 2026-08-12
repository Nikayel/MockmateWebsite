// ───────────────────────────────────────────────────────────────────────────
// L4-M3: Concurrency & Async
// ───────────────────────────────────────────────────────────────────────────

import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const CONC_README = `# Ticket OPS-812: the asset sweep reports the wrong sizes

The nightly sweep fetches every asset path and writes a size report. Since it was moved onto an
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

## What to build

**\`pipeline/policy.py\`** owns the failure policy:

- \`should_retry(error, attempts)\` is true only for a transient failure that has not yet used
  \`MAX_ATTEMPTS\` attempts.
- \`give_up(url, error)\` handles a failure that will not be retried again: a transient failure is
  recorded as size \`0\`, and a permanent failure must reach the caller instead of being recorded.

**\`pipeline/collector.py\`** owns \`run_batch(executor, urls)\`, which returns:

\`\`\`python
{"sizes": [<int per url, in INPUT order>], "retried": [<urls that took a second attempt, in input order>]}
\`\`\`

\`run_batch(executor, ["/a", "/b"])\` is \`{"sizes": [10, 20], "retried": []}\`.

Some tests are hidden.
`

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
    """Settle a failure that will not be retried again. See README.md."""
    # TODO: decide what a failure becomes once retrying is over: a recorded size,
    # or something the caller has to deal with.
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
    # PermanentError (and anything unrecognised) is not this function's to swallow.
    raise error
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
                    sizes[index] = policy.give_up(urls[index], error)
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
        assert policy.should_retry(error, 1) is True, (
            f"expected True on attempt 1, got {policy.should_retry(error, 1)!r}"
        )
        assert policy.should_retry(error, policy.MAX_ATTEMPTS) is False, (
            "expected False once MAX_ATTEMPTS attempts are used, got "
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
        assert policy.should_retry(error, 1) is False, (
            f"expected False for a permanent failure, got {policy.should_retry(error, 1)!r}"
        )

    def exhausted_transient_is_recorded_as_zero():
        value = policy.give_up("/timeout", TransientError("timed out reading /timeout"))
        assert value == 0, f"expected 0, got {value!r}"

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

    def every_url_is_fetched_once_when_nothing_fails():
        sweep(["/a", "/b", "/a"])
        assert fetch_module.call_count("/a") == 2, (
            f"expected /a fetched twice for two entries, got {fetch_module.call_count('/a')}"
        )

    record("a permanent failure reaches the caller", permanent_failure_reaches_the_caller)
    record("a permanent failure is never retried", permanent_failure_is_never_retried)
    record("an exhausted transient failure records zero", exhausted_transient_is_recorded_as_zero)
    record("one dead url does not sink the batch", a_url_that_never_succeeds_does_not_sink_the_batch)
    record("two flaky urls keep their places", two_flaky_urls_keep_their_places)
    record("no url is fetched more than it needs", every_url_is_fetched_once_when_nothing_fails)
`

export const concurrencyLesson: PythonLesson = {
  id: "py-l4-concurrency",
  title: "Threads, the GIL & concurrent.futures",
  summary: "Choose a concurrency model and parallelize a batch with a thread pool.",
  estimatedMinutes: 26,
  difficulty: "hard",
  skills: ["concurrency", "threading", "concurrent-futures", "gil"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Doing more than one thing at once

Every real service waits: on a database, an HTTP API, a file, a message queue. If you fetch 100 URLs one at a time, your program spends nearly all its wall-clock time blocked, doing nothing. Concurrency lets those waits overlap, so 100 slow calls finish in roughly the time of the slowest one instead of the sum of all of them. Choosing the right model (threads, processes, or \`async\`) is a classic interview question because the wrong choice makes code either no faster or outright wrong.

The reason overlapping waits pays off so enormously is that the costs are not close to each other. Each rung below is roughly ten times the one before it:

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

\`executor.map\` returns results in **input order**, not completion order, even though the tasks finish out of order. Swap in \`ProcessPoolExecutor\` and the code is identical. For finer control, \`executor.submit(fn, x)\` returns a \`Future\`, and \`as_completed(futures)\` yields them as they finish. Two things to remember about \`map\`: it returns a **lazy iterator**, so wrap it in \`list(...)\` when you need a real list (the exercise does), and it re-raises a worker's exception when you iterate to that result, not when you call \`map\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "gil-does-not-mean-thread-safe",
  "prompt": "Two threads each do counter += 1 five hundred thousand times against one shared global. What is the final value?",
  "options": [
    {
      "label": "Exactly 1000000, because the interpreter lock lets only one thread run at a time anyway",
      "feedback": "The single most common wrong turn on this topic, and it is a fair inference from everything above. The lock is held for a bytecode, not for a statement, and counter += 1 is three bytecodes: read, add, store."
    },
    {
      "label": "Somewhere under 1000000, and a different number on each run",
      "correct": true,
      "feedback": "Right. A thread can be suspended between the read and the store, so both threads read the same value and one increment vanishes. The interpreter lock protects the interpreter's own memory, never your invariants."
    },
    {
      "label": "Exactly 500000, since the second thread overwrites everything the first one did",
      "feedback": "Too pessimistic. The lost updates are occasional, not total: most increments interleave cleanly and only the unlucky ones collide, which is why this bug survives testing and shows up in production."
    },
    {
      "label": "A RuntimeError, because Python detects the concurrent modification",
      "feedback": "Some containers do raise on concurrent mutation while being iterated, which is probably what this is recalling. A plain integer rebind has no such guard, so the corruption is silent."
    }
  ]
}
\`\`\`

### Pitfall: threads sharing state

Independent tasks are safe to parallelize. Shared mutable state is not. \`count += 1\` is read, add, write: three steps, and the interpreter can switch threads between them, so two threads read the same value and one increment is lost. The GIL does not make your code thread-safe. Fix it with a \`Lock\`, or better, design the work so tasks never touch shared state (as \`double\` does here).

### Running where there are no threads

This in-browser sandbox (Pyodide/WASM) has no OS threads, so building a pool raises \`RuntimeError: can't start new thread\`. A portable \`run_all\` tries the pool and falls back to a sequential map, producing identical ordered results everywhere:

\`\`\`python
try:
    with ThreadPoolExecutor(max_workers=4) as executor:
        return list(executor.map(double, numbers))
except RuntimeError:
    return [double(n) for n in numbers]
\`\`\`

**Interview nuance:** Interviewers often follow up with "what is the difference between concurrency and parallelism?" Concurrency is structuring work so tasks make progress by interleaving, which is what a thread pool and \`async\` give you under the GIL. Parallelism is tasks running at the same instant on different cores, which is what a process pool gives you (or the experimental free-threaded no-GIL build added in Python 3.13). So a \`ThreadPoolExecutor\` buys you concurrency and overlaps I/O waits, but only processes buy you CPU parallelism. Naming that distinction, and tying it to the GIL, is exactly the signal they are listening for.

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
    prompt: `Warm-up (one file): implement \`run_all(numbers)\` to return a list with each number doubled, in
order. (This is the sequential baseline; the workspace step parallelizes it.)

\`run_all([1, 2, 3])\` is \`[2, 4, 6]\`.`,
    starterCode: `def run_all(numbers):
    # Return each number doubled, in order.
    pass`,
    hints: ["A comprehension keeps order: `[n * 2 for n in numbers]`.", "Return the new list."],
    referenceSolution: `def run_all(numbers):
    return [n * 2 for n in numbers]`,
    testCases: [
      { input: { numbers: [1, 2, 3] }, expected: [2, 4, 6], description: "doubles in order" },
      { input: { numbers: [] }, expected: [], description: "empty input" },
      { input: { numbers: [10] }, expected: [20], description: "single item" },
      { input: { numbers: [5, 0, -1] }, expected: [10, 0, -2], description: "negatives and zero" },
    ],
  },
  practice: {
    id: "py-l4-concurrency-practice",
    executionMode: "workspace",
    prompt: `Repair the nightly asset sweep (ticket OPS-812). Since it moved onto an executor, sizes
land against the wrong paths and a vendor outage produced a report of zeros instead of an alert.

This runtime has no OS threads, so \`harness/executor.py\` is a fake executor that finishes work in
an order that is not input order, and its futures carry no url and no index. Two files are yours:

- \`pipeline/policy.py\`: \`should_retry(error, attempts)\` and \`give_up(url, error)\` decide which
  failures deserve another attempt, which are recorded as size \`0\`, and which must reach the caller.
- \`pipeline/collector.py\`: \`run_batch(executor, urls)\` returns
  \`{"sizes": [...], "retried": [...]}\` with sizes in **input order** and the retried urls in input
  order.

\`run_batch(executor, ["/a", "/b"])\` is \`{"sizes": [10, 20], "retried": []}\`. Read \`README.md\`
for the full contract. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "A finished future tells you nothing about where it belongs, so decide what you record beside each future at submit time.",
      "Fill a results list you sized up front rather than appending, and keep an attempt count per position. Retries are a second pass over the positions that failed and are worth trying again.",
      "In `run_batch`, build `pending = {executor.submit(fetch, urls[i]): i for i in wave}`, then `for future in as_completed(list(pending)):` call `future.result()` inside a `try` and hand the exception to the policy. In `policy.give_up`, `raise error` for a permanent failure instead of returning a size.",
    ],
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

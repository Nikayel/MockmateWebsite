import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const BATCH_README = `# Ticket: the thumbnail batch loader reads one blob at a time

The media service loads a batch of blobs before it renders a page. Two complaints are open on it.

Latency: a batch of five keys takes as long as the five reads added together, because the loader
awaits each key before starting the next one. The reads are I/O, so they should overlap.

Reliability: one unreadable key currently ends the whole batch and the page renders empty. A bad
key should cost the caller that key, not the other four.

Storage has also asked for a cap: no more than **two** reads may be in flight at once, or the blob
store starts shedding connections.

## What to build

\`fetch_batch(keys)\` in \`pipeline/fanout.py\` returns a list the same length and order as \`keys\`,
where each entry is either the payload \`{"key": key, "bytes": n}\` from a successful read, or the
record \`{"key": key, "error": str(exc)}\` for a key whose read raised \`LoadError\`.

\`Gate\` in \`pipeline/gate.py\` is the cap. At most \`limit\` holders may be past \`acquire()\` at any
moment; \`release()\` gives the slot back.

## The sandbox loop

This page already runs inside an event loop, so \`asyncio.run\` raises \`RuntimeError\`: it refuses
to start a second loop on a thread that already has one running. That is the entry point only.
\`asyncio.gather\`, \`create_task\` and \`sleep\` all work perfectly well inside a running loop.

What this exercise needs on top of that is a clock it can assert on, so \`pipeline/kernel.py\`
(read-only) is a deterministic stand-in for the loop with the same shape: \`sleep\`, \`spawn\`
(create_task), \`wait_all\` (awaiting a gather), \`run\`, and \`yield_now\`. Time is counted in ticks
instead of seconds, so the ordering is the same on every run. The tests call
\`kernel.run(fetch_batch(keys))\` for you.

\`pipeline/store.py\` (read-only) holds \`load(key)\`, which suspends for the key's latency, and a
meter that records how many reads were in flight at once and what tick the batch finished on. The
tests read that meter, so a loader that awaits its keys one at a time fails even when its results
are correct.

Some tests are hidden.
`

const KERNEL_MODULE = String.raw`"""A tiny deterministic stand-in for the asyncio event loop. Read-only.

This sandbox is already running inside an event loop, so asyncio.run raises RuntimeError: it will
not start a second loop on a thread that already has one. The rest of the asyncio API is fine
inside a running loop, gather included. What this exercise needs beyond that is a clock the tests
can assert on, so everything here mirrors the asyncio API you would really use, on a simulated
clock that counts ticks instead of seconds:

    sleep(ticks)      stands in for asyncio.sleep
    spawn(coro)       stands in for asyncio.create_task
    wait_all(tasks)   stands in for awaiting a gather of tasks
    run(coro)         stands in for asyncio.run

A Task carries .done, .result and .error. Time only moves forward when every runnable task is
suspended, so the ordering below is reproducible on every run.
"""


class _Suspend:
    """What an await hands back to the loop: 'wake me in this many ticks'."""

    __slots__ = ("ticks",)

    def __init__(self, ticks):
        self.ticks = ticks

    def __await__(self):
        yield self


class Task:
    """A coroutine the loop has been told about."""

    def __init__(self, coro, name):
        self.coro = coro
        self.name = name
        self.done = False
        self.result = None
        self.error = None
        self.wake_at = 0

    def __repr__(self):
        state = "done" if self.done else "pending"
        return "<Task {} {}>".format(self.name, state)


class _Loop:
    def __init__(self):
        self.tasks = []
        self.now = 0

    def spawn(self, coro, name):
        task = Task(coro, name)
        task.wake_at = self.now
        self.tasks.append(task)
        return task

    def run(self, coro):
        root = self.spawn(coro, "root")
        rounds = 0
        while not root.done:
            rounds += 1
            if rounds > 50000:
                raise RuntimeError(
                    "the simulated loop ran 50000 rounds without finishing; "
                    "a task is waiting for something that never happens"
                )
            ready = [t for t in self.tasks if not t.done and t.wake_at <= self.now]
            if not ready:
                pending = [t.wake_at for t in self.tasks if not t.done]
                if not pending:
                    break
                self.now = min(pending)
                continue

            before = len(self.tasks)
            finished = 0
            for task in ready:
                if task.done:
                    continue
                try:
                    signal = task.coro.send(None)
                except StopIteration as stop:
                    task.done = True
                    task.result = stop.value
                    finished += 1
                except Exception as exc:
                    task.done = True
                    task.error = exc
                    finished += 1
                else:
                    task.wake_at = self.now + getattr(signal, "ticks", 0)

            spawned = len(self.tasks) - before
            if finished == 0 and spawned == 0:
                later = [t.wake_at for t in self.tasks if not t.done and t.wake_at > self.now]
                if later:
                    self.now = min(later)
        if root.error is not None:
            raise root.error
        return root.result


_CURRENT = None


def run(coro):
    """Drive one coroutine to completion on a fresh loop. The tests call this for you."""
    global _CURRENT
    _CURRENT = _Loop()
    try:
        return _CURRENT.run(coro)
    finally:
        _CURRENT = None


def spawn(coro, name=None):
    """Hand a coroutine to the loop now and get a Task back, without waiting for it."""
    if _CURRENT is None:
        raise RuntimeError("spawn() called outside run()")
    return _CURRENT.spawn(coro, name or getattr(coro, "__name__", "task"))


async def sleep(ticks):
    """Suspend the calling coroutine for a number of simulated ticks."""
    await _Suspend(ticks)


async def yield_now():
    """Give the loop a chance to run other tasks, then resume on the same tick."""
    await _Suspend(0)


async def wait_all(tasks):
    """Suspend until every task in the list is done. Never raises; read task.error."""
    tasks = list(tasks)
    while any(not task.done for task in tasks):
        await yield_now()
    return tasks


def now():
    """The current simulated tick."""
    return 0 if _CURRENT is None else _CURRENT.now
`

const STORE_MODULE = String.raw`"""The fake blob store the batch loader talks to, plus the meter that watches it. Read-only.

load(key) is a coroutine that suspends for the key's latency, so two loads that are in flight at
the same time overlap in simulated time. Every call is metered, which is how the tests can tell a
concurrent loader from one that awaits its keys one at a time.
"""

from pipeline import kernel

SIZES = {"alpha": 120, "bravo": 340, "charlie": 90, "delta": 500, "echo": 75, "foxtrot": 260}
LATENCY = {"alpha": 3, "bravo": 5, "charlie": 2, "delta": 4, "echo": 1, "foxtrot": 6}
BROKEN = {"bravo": "checksum mismatch", "delta": "disk offline"}


class LoadError(Exception):
    """Raised when one key cannot be read. One bad key must not sink the batch."""


class _Meter:
    def __init__(self):
        self.reset()

    def reset(self):
        self.in_flight = 0
        self.peak_in_flight = 0
        self.started = 0
        self.last_tick = 0

    def begin(self):
        self.in_flight += 1
        self.started += 1
        self.peak_in_flight = max(self.peak_in_flight, self.in_flight)
        self.last_tick = max(self.last_tick, kernel.now())

    def end(self):
        self.in_flight -= 1
        self.last_tick = max(self.last_tick, kernel.now())


METER = _Meter()


def reset_meter():
    METER.reset()


async def load(key):
    """Read one key. Suspends for LATENCY[key] ticks, then returns a payload or raises."""
    METER.begin()
    try:
        await kernel.sleep(LATENCY.get(key, 2))
        if key not in SIZES:
            raise LoadError("{}: no such key".format(key))
        if key in BROKEN:
            raise LoadError("{}: {}".format(key, BROKEN[key]))
        return {"key": key, "bytes": SIZES[key]}
    finally:
        METER.end()
`

const GATE_STARTER = String.raw`"""The concurrency bound for the batch loader."""

MAX_IN_FLIGHT = 2


class Gate:
    """Lets at most 'limit' holders through at a time (see README.md)."""

    def __init__(self, limit=MAX_IN_FLIGHT):
        self.limit = limit
        self.in_flight = 0

    async def acquire(self):
        # TODO: do not return while the gate is full, and count the holder once it is let through.
        self.in_flight += 1

    def release(self):
        # TODO: hand the slot back.
        pass
`

const GATE_REFERENCE = String.raw`"""The concurrency bound for the batch loader."""

from pipeline import kernel

MAX_IN_FLIGHT = 2


class Gate:
    """Lets at most 'limit' holders through at a time."""

    def __init__(self, limit=MAX_IN_FLIGHT):
        self.limit = limit
        self.in_flight = 0

    async def acquire(self):
        while self.in_flight >= self.limit:
            await kernel.yield_now()
        self.in_flight += 1

    def release(self):
        self.in_flight -= 1
`

const FANOUT_STARTER = String.raw`from pipeline import kernel
from pipeline.gate import MAX_IN_FLIGHT, Gate
from pipeline.store import LoadError, load


async def _load_one(gate, key):
    """Read one key under the gate, returning a payload or an error record (see README.md)."""
    # TODO: take a slot, read the key, turn a LoadError into an error record, give the slot back.
    return {"key": key, "error": "not read"}


async def fetch_batch(keys):
    """Read every key, overlapping the reads, and return one entry per key in order."""
    # TODO: get all the keys moving before waiting on any of them, then collect their entries.
    return []
`

const FANOUT_REFERENCE = String.raw`from pipeline import kernel
from pipeline.gate import MAX_IN_FLIGHT, Gate
from pipeline.store import LoadError, load


async def _load_one(gate, key):
    await gate.acquire()
    try:
        return await load(key)
    except LoadError as exc:
        return {"key": key, "error": str(exc)}
    finally:
        gate.release()


async def fetch_batch(keys):
    gate = Gate(MAX_IN_FLIGHT)
    tasks = [kernel.spawn(_load_one(gate, key), key) for key in keys]
    await kernel.wait_all(tasks)
    return [task.result for task in tasks]
`

const BATCH_TEST = String.raw`from pipeline import store
from pipeline.fanout import fetch_batch
from pipeline.kernel import run


def batch(keys):
    store.reset_meter()
    return run(fetch_batch(keys))


def run_tests(record):
    def payloads_in_key_order():
        got = batch(["charlie", "alpha", "echo"])
        want = [
            {"key": "charlie", "bytes": 90},
            {"key": "alpha", "bytes": 120},
            {"key": "echo", "bytes": 75},
        ]
        assert got == want, f"expected {want}, got {got!r}"

    def one_bad_key_does_not_sink_the_batch():
        got = batch(["alpha", "bravo", "charlie"])
        want = [
            {"key": "alpha", "bytes": 120},
            {"key": "bravo", "error": "bravo: checksum mismatch"},
            {"key": "charlie", "bytes": 90},
        ]
        assert got == want, f"expected {want}, got {got!r}"

    def every_entry_is_a_finished_value():
        got = batch(["alpha", "bravo"])
        offenders = [entry for entry in got if not isinstance(entry, dict)]
        assert offenders == [], (
            f"expected every entry to be a dict payload or error record, "
            f"got these unfinished entries: {offenders!r}"
        )

    def bound_is_respected_and_used():
        batch(["alpha", "bravo", "charlie", "delta", "echo"])
        peak = store.METER.peak_in_flight
        assert peak <= 2, (
            f"expected never more than 2 reads in flight, got {peak}; the gate let too many "
            f"holders past acquire()"
        )
        assert peak >= 2, (
            f"expected the reads to overlap up to the bound, got a peak of {peak}; with 5 keys "
            f"and a limit of 2 a loader that overlaps at all reaches 2 in flight"
        )
        assert store.METER.started == 5, (
            f"expected all 5 keys to be loaded, got {store.METER.started}"
        )

    record("returns payloads in key order", payloads_in_key_order)
    record("collects a failing key per item", one_bad_key_does_not_sink_the_batch)
    record("no unfinished coroutine leaks into the results", every_entry_is_a_finished_value)
    record("at most two loads in flight", bound_is_respected_and_used)
`

const BATCH_TEST_HIDDEN = String.raw`from pipeline import store
from pipeline.fanout import fetch_batch
from pipeline.kernel import run


def batch(keys):
    store.reset_meter()
    return run(fetch_batch(keys))


def run_tests(record):
    def empty_batch():
        got = batch([])
        assert got == [], f"expected [], got {got!r}"

    def unknown_key_is_an_error_record():
        got = batch(["echo", "zulu"])
        want = [
            {"key": "echo", "bytes": 75},
            {"key": "zulu", "error": "zulu: no such key"},
        ]
        assert got == want, f"expected {want}, got {got!r}"

    def every_key_fails():
        got = batch(["bravo", "delta"])
        want = [
            {"key": "bravo", "error": "bravo: checksum mismatch"},
            {"key": "delta", "error": "delta: disk offline"},
        ]
        assert got == want, f"expected {want}, got {got!r}"

    def duplicate_keys_are_loaded_twice():
        got = batch(["echo", "echo"])
        want = [{"key": "echo", "bytes": 75}, {"key": "echo", "bytes": 75}]
        assert got == want, f"expected {want}, got {got!r}"
        assert store.METER.started == 2, (
            f"expected 2 loads for 2 keys, got {store.METER.started}"
        )

    def loads_overlap_instead_of_queueing():
        batch(["alpha", "charlie", "echo"])
        elapsed = store.METER.last_tick
        assert elapsed <= 4, (
            f"expected the batch to finish by tick 4 (loads of 3, 2 and 1 ticks, overlapping "
            f"two at a time), got tick {elapsed}; awaiting the keys one at a time costs 6. "
            f"Exactly where in that budget you land depends on how your gate hands slots on."
        )

    record("empty batch returns an empty list", empty_batch)
    record("unknown key is collected as an error", unknown_key_is_an_error_record)
    record("a batch of only failures keeps its length", every_key_fails)
    record("duplicate keys are each loaded", duplicate_keys_are_loaded_twice)
    record("loads overlap under the bound", loads_overlap_instead_of_queueing)
`

export const asyncioLesson: PythonLesson = {
  id: "py-l4-asyncio",
  title: "async / await & asyncio",
  summary: "Run many I/O tasks concurrently with coroutines and asyncio.gather.",
  estimatedMinutes: 45,
  difficulty: "hard",
  skills: ["asyncio", "async-await", "coroutines", "concurrency"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Concurrency on one thread

A web service that fetches 50 URLs spends almost all its time *waiting* on the network, not computing. Threads can overlap that waiting, but you pay for context switches, GIL contention, and locks around shared state. \`asyncio\` overlaps it on a single thread: while one task waits, the loop runs another. Because a task runs uninterrupted until its next \`await\`, you rarely reach for a lock. This is the default tool for I/O-bound fan-out (many network calls or database queries) in modern Python.

### Coroutines are values, not running code

\`async def\` defines a coroutine function. Calling it does not run the body; it returns a coroutine object that is suspended at the top, waiting to be driven:

\`\`\`python
import asyncio

async def fetch_one(n):
    await asyncio.sleep(0.1)   # hands control back to the loop while "waiting"
    return n * 10

coro = fetch_one(1)   # nothing has run yet; coro is a coroutine object
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "unawaited-coroutine-does-nothing",
  "prompt": "A request handler needs to write an audit record but does not need the result, so you call record_audit(event), an async def, and deliberately do not await it. What actually happens?",
  "options": [
    {
      "label": "It runs in the background on the loop, which is what fire and forget means",
      "feedback": "Tempting, because that is genuinely what you want and it is what asyncio.create_task or a TaskGroup would give you. A bare call only builds the coroutine object. Nothing has told the loop it exists."
    },
    {
      "label": "Nothing runs. You get a coroutine object and a RuntimeWarning that it was never awaited",
      "correct": true,
      "feedback": "Right. A coroutine is a value until something drives it, and the warning is the only sign you get, which is why these audit records silently stop appearing."
    },
    {
      "label": "It runs immediately and synchronously, since there is no await to suspend at",
      "feedback": "Reasonable if you picture async def as a normal function with extra powers. The def is what changes: calling it constructs a suspended object instead of executing the body."
    },
    {
      "label": "It runs later, once the handler returns and the loop has nothing else to do",
      "feedback": "That describes a task queue, and it is what create_task actually arranges. Without that registration the loop never learns about the coroutine, so idle time changes nothing."
    }
  ]
}
\`\`\`

\`await\` is the only place a coroutine gives up control. Between awaits it runs straight through like ordinary code.

\`\`\`csdiagram
{
  "type": "call-stack",
  "title": "One thread, three coroutines, control moving only at await",
  "steps": [
    { "stack": ["event loop"], "note": "A single thread. The loop holds three ready coroutines." },
    { "stack": ["event loop", "fetch_one(1)"], "note": "Task 1 runs straight through, like ordinary code, until it hits an await." },
    { "stack": ["event loop"], "note": "await hands control back. Task 1 is now WAITING on I/O, not blocking the thread." },
    { "stack": ["event loop", "fetch_one(2)"], "note": "The loop starts task 2 while task 1's I/O is still in flight." },
    { "stack": ["event loop"], "note": "Task 2 awaits as well. Two waits now overlap on one thread." },
    { "stack": ["event loop", "fetch_one(3)"], "note": "And task 3. All three waits are in flight together." },
    { "stack": ["event loop"], "note": "The loop has nothing runnable, so it waits for whichever I/O finishes first." },
    { "stack": ["event loop", "fetch_one(1)"], "returning": "result 1", "note": "Task 1's I/O completed. The loop resumes it exactly where it paused, and it returns." }
  ],
  "caption": "The stack is never deeper than one task, because only one coroutine runs at a time. What overlaps is the WAITING, not the executing. That is also why a blocking call inside a coroutine is fatal: the loop cannot take control back until an await, so nothing else on this thread can progress."
}
\`\`\`

### Overlapping the waiting with gather

\`asyncio.gather\` schedules many coroutines at once and waits for all of them, returning results in **argument order** (not finish order):

\`\`\`python
async def main():
    return await asyncio.gather(fetch_one(1), fetch_one(2), fetch_one(3))

asyncio.run(main())   # [10, 20, 30] after ~0.1s total, not 0.3s
\`\`\`

\`asyncio.run(coro)\` is the one synchronous door into async code: it starts a fresh event loop, runs the coroutine to completion, and closes the loop.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "sequential-awaits-vs-gather",
  "prompt": "Instead of gather you write: results = [await fetch_one(n) for n in range(50)]. Every fetch waits about 100 ms on the network. Roughly how long does the whole line take?",
  "options": [
    {
      "label": "About 0.1 seconds. They are coroutines on one loop, so the loop overlaps them",
      "feedback": "The most expensive misconception in async code: writing async def and await does not by itself make anything concurrent. Overlap requires handing the loop several things at once, which is exactly what gather does."
    },
    {
      "label": "About 5 seconds. Each await runs to completion before the next coroutine is even created",
      "correct": true,
      "feedback": "Right. await means wait here, so this is a sequential loop with extra syntax. The loop has only ever been given one thing to do at a time."
    },
    {
      "label": "About 0.1 seconds, because the comprehension builds all 50 coroutines first and then awaits them",
      "feedback": "Worth thinking through, because that split would help. The await is inside the comprehension body, so each iteration builds one coroutine and drains it before the next is constructed."
    },
    {
      "label": "About 2.5 seconds, since consecutive awaits partly overlap",
      "feedback": "There is no partial credit here. Either something scheduled the tasks together or it did not, and a plain await schedules exactly one thing and blocks on it."
    }
  ]
}
\`\`\`

### Why this sandbox uses a helper

\`asyncio.run\` refuses to start when a loop is already running and raises \`RuntimeError\`. This sandbox runs your code *inside* a loop, so the exercises hand you a stand-in for it. The warm-up gives you \`run_coroutines(coros)\`, which drives each coroutine with \`coro.send(None)\` and reads the return value off the resulting \`StopIteration\`. That works because its \`fetch_one\` awaits nothing, so a single \`send\` finishes it. The workspace exercise instead ships a small read-only loop of its own, with \`sleep\`, \`spawn\` and \`wait_all\` standing in for \`asyncio.sleep\`, \`asyncio.create_task\` and awaiting a \`gather\`. Either way you are writing real coroutines; only the door into the loop changes.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "blocking-sleep-inside-a-coroutine",
  "prompt": "Inside a coroutine that handles a request you back off before a retry with time.sleep(2), not asyncio.sleep(2). A hundred other requests are in flight on the same loop. What is the effect?",
  "options": [
    {
      "label": "Only this request is delayed by 2 seconds. The other hundred keep making progress",
      "feedback": "This is what you paid for and what asyncio.sleep would deliver, so the code reads as if it were true. time.sleep blocks the thread rather than yielding, and the loop lives on that thread."
    },
    {
      "label": "Every task on the loop stalls for 2 seconds, because the loop only regains control at an await",
      "correct": true,
      "feedback": "Right. Scheduling here is cooperative: the loop cannot interrupt a running coroutine, so a blocking call inside one freezes the entire service for its duration."
    },
    {
      "label": "time.sleep raises inside a coroutine, since asyncio forbids blocking calls",
      "feedback": "You would be much better off if it did. Nothing detects or forbids it, which is why blocking calls sneak in through ordinary library code and only show up as latency under load."
    },
    {
      "label": "The loop notices the blocking call and moves it to a worker thread",
      "feedback": "That offload is real but it is never automatic: asyncio.to_thread and run_in_executor exist precisely because you have to ask for it explicitly."
    }
  ]
}
\`\`\`

### Pitfall: a coroutine you never drive

Calling \`fetch_one(5)\` and treating the result like a number does nothing useful. The body never runs, and Python warns \`RuntimeWarning: coroutine 'fetch_one' was never awaited\`. A coroutine only executes when something awaits it, gathers it, or runs it on a loop. The reverse trap is just as common: never put a blocking call (\`time.sleep\`, a synchronous DB driver, a heavy compute loop) inside a coroutine, because it freezes the whole thread and no other task can make progress.

**Interview nuance:** asyncio is *cooperative*, not preemptive. The event loop can only switch tasks at an \`await\`; it cannot interrupt running code. So \`gather\` speeds up work that spends its time awaiting real I/O, but a CPU-bound coroutine (or a stray \`time.sleep\`) starves every other task on the loop. That is the core reason asyncio scales I/O-bound fan-out yet does nothing for CPU-bound work, where you reach for processes instead.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "one-slow-endpoint-times-out-the-rest",
  "prompt": "An async service starts timing out under load. One endpoint does a 300 ms pure-Python transform inside its coroutine, but unrelated endpoints are timing out too. Why do the others suffer?",
  "options": [
    {
      "label": "The interpreter lock is held during the transform, so no other request can run Python",
      "feedback": "Tempting, because the lock is real and the phrase fits. There is only one thread here though, so the lock was never contended. Adding a second thread would not fix this either."
    },
    {
      "label": "The loop cannot preempt a running coroutine, so every other task queues behind each 300 ms transform",
      "correct": true,
      "feedback": "Right. Cooperative scheduling means the loop gets control back only at an await, so one uninterruptible stretch of CPU is a stall for the whole service, not just for its own request."
    },
    {
      "label": "The connection pool or thread pool behind the service is exhausted, so new requests wait for a slot",
      "feedback": "A completely real failure mode and the right suspicion in a threaded service. Here the queue is not a pool of workers, it is the single loop, and no pool sizing will change that."
    },
    {
      "label": "The transform starves the loop only if it allocates heavily and triggers garbage collection",
      "feedback": "Garbage collection does add pauses, and they are worth knowing about. They are measured in single-digit milliseconds though, so they are noise next to 300 ms of code the loop cannot interrupt."
    }
  ],
  "reveal": "The practical rule that follows: anything more than a few milliseconds of CPU does not belong directly on the loop. Push it to asyncio.to_thread if a library releases the lock for you, or to a process pool if it is pure Python."
}
\`\`\``,
    demoCode: `# Normally: asyncio.run(asyncio.gather(fetch_one(1), fetch_one(2), fetch_one(3)))
# This sandbox is already inside an event loop, so we drive the coroutines directly:
async def fetch_one(n):
    return n * 10


def run_coroutines(coros):
    out = []
    for coro in coros:
        try:
            coro.send(None)
        except StopIteration as done:
            out.append(done.value)
    return out


print(run_coroutines(fetch_one(n) for n in [1, 2, 3]))   # [10, 20, 30]`,
  },
  apply: {
    id: "py-l4-asyncio-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`fetch_all(numbers)\` to build a \`fetch_one(n)\` coroutine for each
number and run them all with the provided \`run_coroutines\` helper, returning the results in order.

(In a normal program you'd write \`asyncio.run(asyncio.gather(*coros))\`; this sandbox is already
inside an event loop, so \`run_coroutines\` stands in for it.)

\`fetch_all([1, 2, 3])\` is \`[10, 20, 30]\`.`,
    starterCode: `async def fetch_one(n):
    return n * 10


def run_coroutines(coros):
    results = []
    for coro in coros:
        try:
            coro.send(None)
        except StopIteration as done:
            results.append(done.value)
    return results


def fetch_all(numbers):
    # TODO: build a fetch_one(n) coroutine for each number and pass them to run_coroutines.
    pass`,
    hints: [
      "Build the coroutines: `fetch_one(n) for n in numbers`.",
      "Hand them to the provided runner: `run_coroutines(fetch_one(n) for n in numbers)`.",
      "Return that result.",
    ],
    referenceSolution: `async def fetch_one(n):
    return n * 10


def run_coroutines(coros):
    results = []
    for coro in coros:
        try:
            coro.send(None)
        except StopIteration as done:
            results.append(done.value)
    return results


def fetch_all(numbers):
    return run_coroutines(fetch_one(n) for n in numbers)`,
    testCases: [
      { input: { numbers: [1, 2, 3] }, expected: [10, 20, 30], description: "gathers in order" },
      { input: { numbers: [] }, expected: [], description: "empty input" },
      { input: { numbers: [5] }, expected: [50], description: "single item" },
    ],
  },
  practice: {
    id: "py-l4-asyncio-practice",
    executionMode: "workspace",
    prompt: `Repair the media service's batch loader. \`fetch_batch(keys)\` in \`pipeline/fanout.py\` reads its
keys one at a time and lets a single unreadable key end the whole batch, and storage now caps the
service at two reads in flight at once.

Return one entry per key, in the order the keys were given: the payload \`{"key": key, "bytes": n}\`
for a key that read cleanly, or \`{"key": key, "error": str(exc)}\` for a key whose read raised
\`LoadError\`. Reads must overlap, and never more than \`MAX_IN_FLIGHT\` of them at once, which is
what \`Gate\` in \`pipeline/gate.py\` is for.

\`pipeline/kernel.py\` and \`pipeline/store.py\` are read-only. The tests read the store's meter, so
a loader that returns the right entries the slow way still fails. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Awaiting a read finishes it before the next one starts. The loop can only overlap work it has been told about, so every key has to be handed to the loop before you wait on any of them.",
      "`kernel.spawn(coro)` registers a coroutine and hands back a Task immediately; `kernel.wait_all(tasks)` suspends until they are all done, and each Task carries `.result`. The bound belongs inside the per-key coroutine, around the read itself, so a slot is taken before `load(key)` and released whether it succeeds or raises.",
      "`Gate.acquire` is a wait loop: it cannot return while the gate is full, and the only way another task ever gets to release a slot is if you await something inside that loop. `kernel.yield_now()` is the await that gives the loop a turn without costing a tick. In `_load_one`, the slot has to come back whether the read returned or raised, which is the job `finally` exists for, and the error record is what the `LoadError` handler returns instead of re-raising.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "pipeline/fanout.py",
      editableFilePaths: ["pipeline/fanout.py", "pipeline/gate.py"],
      visibleTestPaths: ["tests/test_fanout.py"],
      hiddenTestPaths: ["tests/test_fanout_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: BATCH_README },
        { path: "pipeline/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "pipeline/kernel.py",
          role: "readonly",
          language: "python",
          content: KERNEL_MODULE,
          description: "The sandbox's event loop stand-in: sleep, spawn, wait_all, run (read-only)",
        },
        {
          path: "pipeline/store.py",
          role: "readonly",
          language: "python",
          content: STORE_MODULE,
          description: "The fake blob store and its in-flight meter (read-only)",
        },
        {
          path: "pipeline/fanout.py",
          role: "editable",
          language: "python",
          content: FANOUT_STARTER,
          description: "Implement fetch_batch here",
        },
        {
          path: "pipeline/gate.py",
          role: "editable",
          language: "python",
          content: GATE_STARTER,
          description: "Implement the concurrency bound here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_fanout.py",
          role: "test",
          language: "python",
          content: BATCH_TEST,
          description: "Visible batch loader tests",
        },
        {
          path: "tests/test_fanout_hidden.py",
          role: "test",
          language: "python",
          content: BATCH_TEST_HIDDEN,
          hidden: true,
          description: "Hidden batch loader tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_fanout", label: "visible batch loader" },
            { module: "test_fanout_hidden", label: "hidden batch loader" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "pipeline/fanout.py",
          role: "editable",
          language: "python",
          content: FANOUT_REFERENCE,
        },
        {
          path: "pipeline/gate.py",
          role: "editable",
          language: "python",
          content: GATE_REFERENCE,
        },
      ],
    },
  },
}

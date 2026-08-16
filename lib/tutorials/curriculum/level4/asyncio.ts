import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const BATCH_README = buildBrief({
  lesson: "py-l4-asyncio",
  kind: "ticket",
  headline: "the thumbnail batch loader reads one blob at a time",
  body: `The media service loads a batch of blobs before it renders a page. Two complaints are open on it.

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
`,
})

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
  estimatedMinutes: 50,
  difficulty: "hard",
  skills: ["asyncio", "async-await", "coroutines", "concurrency"],
  teach: {
    estimatedMinutes: 9,
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
      "feedback": "Tempting, because that is genuinely what you want and it is what asyncio.create_task, or a TaskGroup (a block that owns the tasks started inside it and waits for them on exit), would give you. A bare call only builds the coroutine object. Nothing has told the loop it exists."
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

### Capping how much runs at once

\`gather\` has no brakes. Hand it 5000 keys and it starts 5000 reads, which is how you exhaust a connection pool, trip a rate limit, or hold 5000 partial responses in memory at once. Real services therefore fan out *bounded*: start everything, but never let more than N of them be in flight.

The tool for that is a **semaphore**, which is just a counter of free slots. Acquiring waits while the count is zero and decrements it otherwise; releasing increments it and lets one waiter through. In asyncio it is \`asyncio.Semaphore(n)\`, and the acquire/release pair is what \`async with\` manages for you:

\`\`\`python
limit = asyncio.Semaphore(2)

async def fetch_bounded(n):
    async with limit:          # waits here while two reads are already in flight
        return await fetch_one(n)

await asyncio.gather(*(fetch_bounded(n) for n in range(50)))
\`\`\`

Two details make or break a hand-rolled version. The slot has to be released in a \`finally\`, or one exception leaks a slot and the gate slowly closes forever. And the wait for a free slot must contain an \`await\`: scheduling is cooperative, so a loop that spins without yielding never lets the task holding the slot run far enough to give it back, and the whole service deadlocks.

### Why this sandbox uses a helper

\`asyncio.run\` refuses to start when a loop is already running and raises \`RuntimeError\`. This sandbox runs your code *inside* a loop, so the exercises hand you a stand-in for it. The warm-up ships a driver called \`run_all(coros)\` that drives every coroutine you give it together on a simulated tick clock, so sleeps overlap the way real I/O would. The workspace exercise ships a slightly larger read-only loop, \`pipeline/kernel.py\`, with \`sleep\`, \`spawn\` and \`wait_all\` standing in for \`asyncio.sleep\`, \`asyncio.create_task\` and awaiting a \`gather\`. Either way you are writing real coroutines; only the door into the loop changes.

### The stand-in loop's API, running

Four names are the whole of \`pipeline/kernel.py\`. This is them working:

\`\`\`python
from pipeline import kernel

async def read(name, ticks):
    await kernel.sleep(ticks)                 # stands in for asyncio.sleep
    return name.upper()

async def main():
    slow = kernel.spawn(read("a", 3), "a")    # stands in for asyncio.create_task:
    fast = kernel.spawn(read("b", 1), "b")    # registered with the loop now, not awaited
    await kernel.wait_all([slow, fast])       # stands in for awaiting a gather of tasks
    return [slow.result, fast.result], kernel.now()

print(kernel.run(main()))     # (['A', 'B'], 3)
\`\`\`

Tick 3, not tick 4, because the two reads were in flight together. Note where the results live: \`spawn\` hands back a \`Task\` immediately, and after \`wait_all\` each task carries \`.done\`, \`.result\` and \`.error\`. A task whose coroutine raised stores the exception on \`.error\` instead of re-raising it out of \`wait_all\`.

The fourth name is \`kernel.yield_now()\`. It is an await that costs no ticks: it gives the loop a turn and resumes you on the same tick. That is how one coroutine waits for a condition only another coroutine can change.

\`\`\`python
flag = {"ready": False}

async def waiter():
    while not flag["ready"]:
        await kernel.yield_now()   # without this await, setter() never gets to run
    return kernel.now()

async def setter():
    await kernel.sleep(2)
    flag["ready"] = True

async def main():
    w = kernel.spawn(waiter(), "waiter")
    s = kernel.spawn(setter(), "setter")
    await kernel.wait_all([w, s])
    return w.result

print(kernel.run(main()))     # 2
\`\`\`

Delete the \`await\` from that loop and the program hangs forever. The condition can only change while \`setter\` is running, and \`setter\` can only run while \`waiter\` is suspended. That is the cooperative-scheduling rule from the top of this lesson in its smallest possible form, and it is exactly why \`asyncio.Semaphore\` waits with an await rather than a spin.

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

When you have no async version of a call, move it off the loop instead. \`await asyncio.to_thread(fn, *args)\` runs \`fn\` on a worker thread and gives you back something awaitable, so the loop stays free while it blocks. \`loop.run_in_executor(pool, fn, *args)\` is the older, lower-level form of the same idea, and the one to use when you want to choose the pool yourself, a process pool included.

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
    demoCode: `import asyncio

# asyncio.run is the one piece missing here: it refuses to start when a loop is already
# running, and this sandbox runs your code inside one. Everything else is the real API,
# so gather works at top level and the three sleeps overlap.
async def fetch_one(n):
    await asyncio.sleep(0.1)
    return n * 10


print(await asyncio.gather(fetch_one(1), fetch_one(2), fetch_one(3)))   # [10, 20, 30]`,
  },
  // Apply budget 12: 34 provided lines to read (the _Sleep/sleep/fetch_one/run_all harness), 7 to
  // write (one coroutine wrapper with a try/except, one call that hands the driver every coroutine
  // at once). Practice budget 29: 96 lines of README plus read-only kernel and store to read, 14 to
  // write across two files, and the two decisions that carry the exercise (where the bound goes and
  // how acquire waits). 9 + 12 + 29 = 50, the lesson total.
  apply: {
    id: "py-l4-asyncio-apply",
    estimatedMinutes: 12,
    executionMode: "single-file",
    prompt: `Implement \`fetch_all(numbers)\` so a batch of reads overlaps and one bad number costs the caller
that number only.

\`fetch_one(n)\` suspends for \`n\` ticks and then returns \`n * 10\`, or raises
\`ValueError("bad number: n")\` when \`n\` is negative. \`run_all(coros)\` is provided: it drives every
coroutine you hand it together on one simulated clock and returns their values in the order you
gave them. A coroutine that raises tears the whole batch down, so a failing read has to be turned
into the record \`{"error": str(exc)}\` before the driver ever sees it. Write \`read_one(n)\` to do
that containment, and \`fetch_all(numbers)\` to run the whole batch.

\`fetch_all([2, -1, 3])\` is \`[20, {"error": "bad number: -1"}, 30]\`.`,
    starterCode: `class _Sleep:
    """What an await hands back to the driver: 'wake me in this many ticks'."""

    def __init__(self, ticks):
        self.ticks = ticks

    def __await__(self):
        yield self


async def sleep(ticks):
    await _Sleep(ticks)


async def fetch_one(n):
    """Read one number: suspends for abs(n) ticks, then returns n * 10 or raises."""
    await sleep(abs(n))
    if n < 0:
        raise ValueError("bad number: {}".format(n))
    return n * 10


def run_all(coros):
    """Drive every coroutine together on one simulated clock. Values come back in order."""
    coros = list(coros)
    results = [None] * len(coros)
    wake = [0] * len(coros)
    done = [False] * len(coros)
    now = 0
    while not all(done):
        ready = [i for i, finished in enumerate(done) if not finished and wake[i] <= now]
        if not ready:
            now = min(wake[i] for i, finished in enumerate(done) if not finished)
            continue
        for i in ready:
            try:
                signal = coros[i].send(None)
            except StopIteration as stop:
                done[i] = True
                results[i] = stop.value
            else:
                wake[i] = now + signal.ticks
    return results


async def read_one(n):
    # TODO: read the number, and give back a record instead of letting a failure escape.
    return None


def fetch_all(numbers):
    # TODO: get every number moving on the driver at once, and return the values in order.
    return []`,
    hints: [
      "`run_all` overlaps whatever it is given in one call. Calling it once per number is a sequential loop wearing a driver's clothes.",
      "`read_one` is a coroutine, so it can `await fetch_one(n)` and wrap that await in a `try`. What it returns on the failing branch is the record the caller sees for that number.",
      '`except ValueError as exc: return {"error": str(exc)}` is the containment; `run_all(read_one(n) for n in numbers)` is the batch.',
    ],
    referenceSolution: `class _Sleep:
    """What an await hands back to the driver: 'wake me in this many ticks'."""

    def __init__(self, ticks):
        self.ticks = ticks

    def __await__(self):
        yield self


async def sleep(ticks):
    await _Sleep(ticks)


async def fetch_one(n):
    """Read one number: suspends for abs(n) ticks, then returns n * 10 or raises."""
    await sleep(abs(n))
    if n < 0:
        raise ValueError("bad number: {}".format(n))
    return n * 10


def run_all(coros):
    """Drive every coroutine together on one simulated clock. Values come back in order."""
    coros = list(coros)
    results = [None] * len(coros)
    wake = [0] * len(coros)
    done = [False] * len(coros)
    now = 0
    while not all(done):
        ready = [i for i, finished in enumerate(done) if not finished and wake[i] <= now]
        if not ready:
            now = min(wake[i] for i, finished in enumerate(done) if not finished)
            continue
        for i in ready:
            try:
                signal = coros[i].send(None)
            except StopIteration as stop:
                done[i] = True
                results[i] = stop.value
            else:
                wake[i] = now + signal.ticks
    return results


async def read_one(n):
    try:
        return await fetch_one(n)
    except ValueError as exc:
        return {"error": str(exc)}


def fetch_all(numbers):
    return run_all(read_one(n) for n in numbers)`,
    testCases: [
      { input: { numbers: [1, 2, 3] }, expected: [10, 20, 30], description: "results in order" },
      { input: { numbers: [] }, expected: [], description: "empty batch" },
      { input: { numbers: [5] }, expected: [50], description: "single read" },
      {
        input: { numbers: [2, -1, 3] },
        expected: [20, { error: "bad number: -1" }, 30],
        description: "a bad number becomes a record, the rest still read",
      },
      {
        input: { numbers: [-4, -1] },
        expected: [{ error: "bad number: -4" }, { error: "bad number: -1" }],
        description: "an all-failing batch keeps its length and order",
      },
      { input: { numbers: [3, 3] }, expected: [30, 30], description: "duplicates read twice" },
    ],
  },
  practice: {
    id: "py-l4-asyncio-practice",
    estimatedMinutes: 29,
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

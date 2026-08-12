import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const AIO_README = `# Concurrent I/O with asyncio

\`aio/fetch.py\` (read-only) has \`async def fetch_one(n)\`, a **coroutine** standing in for an async
network call. Implement \`fetch_all(numbers)\` in \`aio/gather.py\` so it builds a \`fetch_one(n)\`
coroutine for every number and runs them all, returning the results in order.

Normally you'd write \`asyncio.run(asyncio.gather(*coros))\`. This in-browser sandbox is **already
inside a running event loop**, so \`asyncio.run\` can't be called here. Use the provided
\`run_coroutines\` helper from \`aio.loop\` to run the coroutines instead.

\`fetch_all([1, 2, 3])\` is \`[10, 20, 30]\`. Some tests are hidden.
`

const AIO_FETCH = String.raw`async def fetch_one(n):
    """A coroutine standing in for an async network call."""
    return n * 10
`

const AIO_LOOP = String.raw`def run_coroutines(coros):
    """Run already-created coroutines to completion and collect their results, in order.

    A stand-in for asyncio.run(asyncio.gather(*coros)) for this sandbox, which is already inside a
    running event loop (so asyncio.run can't be used). The coroutines here don't await real I/O, so
    each finishes on its first step.
    """
    results = []
    for coro in coros:
        try:
            coro.send(None)
        except StopIteration as done:
            results.append(done.value)
    return results
`

const AIO_GATHER_STARTER = String.raw`from aio.fetch import fetch_one
from aio.loop import run_coroutines


def fetch_all(numbers):
    """Build a fetch_one(n) coroutine per number and run them all in order (see README.md)."""
    # TODO: pass a fetch_one(n) coroutine for each number to run_coroutines.
    return []
`

const AIO_GATHER_REFERENCE = String.raw`from aio.fetch import fetch_one
from aio.loop import run_coroutines


def fetch_all(numbers):
    return run_coroutines(fetch_one(n) for n in numbers)
`

const AIO_TEST = String.raw`from aio.gather import fetch_all


def run_tests(record):
    def gathers_in_order():
        assert fetch_all([1, 2, 3]) == [10, 20, 30], f"got {fetch_all([1, 2, 3])!r}"

    def empty_input():
        assert fetch_all([]) == []

    record("gathers results in order", gathers_in_order)
    record("empty input returns empty", empty_input)
`

const AIO_TEST_HIDDEN = String.raw`from aio.gather import fetch_all


def run_tests(record):
    def single_item():
        assert fetch_all([5]) == [50]

    def includes_zero():
        assert fetch_all([0, 2]) == [0, 20]

    record("single item", single_item)
    record("includes zero", includes_zero)
`

export const asyncioLesson: PythonLesson = {
  id: "py-l4-asyncio",
  title: "async / await & asyncio",
  summary: "Run many I/O tasks concurrently with coroutines and asyncio.gather.",
  estimatedMinutes: 20,
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
    { "stack": ["event loop"], "note": "The loop has nothing runnable and simply waits for whichever I/O finishes first." },
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

\`asyncio.run\` refuses to start when a loop is already running and raises \`RuntimeError\`. This sandbox runs your code *inside* a loop, so it hands you \`run_coroutines(coros)\` instead. It drives each coroutine with \`coro.send(None)\` and reads the return value off the resulting \`StopIteration\`. That works because the sandbox \`fetch_one\` awaits nothing, so a single \`send\` finishes it. You still build real coroutines with \`fetch_one(n)\`; you just pass them to \`run_coroutines\` in place of \`asyncio.run(asyncio.gather(*coros))\`.

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
    prompt: `Implement \`fetch_all(numbers)\` in \`aio/gather.py\`: build a \`fetch_one(n)\` coroutine for every
number and run them with the read-only \`run_coroutines\` helper (imported from \`aio.loop\`),
returning the results in order. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "`fetch_one` and `run_coroutines` are already imported for you.",
      "Build one coroutine per number: `fetch_one(n) for n in numbers`.",
      "`return run_coroutines(fetch_one(n) for n in numbers)`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "aio/gather.py",
      editableFilePaths: ["aio/gather.py"],
      visibleTestPaths: ["tests/test_gather.py"],
      hiddenTestPaths: ["tests/test_gather_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: AIO_README },
        { path: "aio/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "aio/fetch.py",
          role: "readonly",
          language: "python",
          content: AIO_FETCH,
          description: "Async fetch_one coroutine (read-only)",
        },
        {
          path: "aio/loop.py",
          role: "readonly",
          language: "python",
          content: AIO_LOOP,
          description: "run_coroutines helper, the sandbox's asyncio.run stand-in (read-only)",
        },
        {
          path: "aio/gather.py",
          role: "editable",
          language: "python",
          content: AIO_GATHER_STARTER,
          description: "Implement fetch_all here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_gather.py",
          role: "test",
          language: "python",
          content: AIO_TEST,
          description: "Visible asyncio tests",
        },
        {
          path: "tests/test_gather_hidden.py",
          role: "test",
          language: "python",
          content: AIO_TEST_HIDDEN,
          hidden: true,
          description: "Hidden asyncio tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_gather", label: "visible gather" },
            { module: "test_gather_hidden", label: "hidden gather" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "aio/gather.py",
          role: "editable",
          language: "python",
          content: AIO_GATHER_REFERENCE,
        },
      ],
    },
  },
}

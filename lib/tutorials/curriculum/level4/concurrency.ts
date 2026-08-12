// ───────────────────────────────────────────────────────────────────────────
// L4-M3: Concurrency & Async
// ───────────────────────────────────────────────────────────────────────────

import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const CONC_README = `# Parallelize a batch with concurrent.futures

\`jobs/worker.py\` (read-only) has \`double(n)\`. Implement \`run_all(numbers)\` in \`jobs/runner.py\`
so it maps \`double\` over every number with a \`concurrent.futures.ThreadPoolExecutor\`, returning
the results **in input order**.

Some runtimes have no OS threads (this in-browser sandbox is one), where starting a pool raises
\`RuntimeError\`. Catch it and **fall back to a sequential map**. The ordered results are identical
either way.

\`run_all([1, 2, 3])\` is \`[2, 4, 6]\`. Some tests are hidden.
`

const CONC_WORKER = String.raw`def double(n):
    """A unit of work (stands in for an I/O-bound task)."""
    return n * 2
`

const CONC_RUNNER_STARTER = String.raw`from concurrent.futures import ThreadPoolExecutor

from jobs.worker import double


def run_all(numbers):
    """Run double over every number with a thread pool; return results in order (see README.md)."""
    # TODO: map the double worker over numbers with a ThreadPoolExecutor, but fall back
    # to a sequential map if the runtime has no threads (catch RuntimeError).
    return []
`

const CONC_RUNNER_REFERENCE = String.raw`from concurrent.futures import ThreadPoolExecutor

from jobs.worker import double


def run_all(numbers):
    try:
        with ThreadPoolExecutor(max_workers=4) as executor:
            return list(executor.map(double, numbers))
    except RuntimeError:
        # No OS threads here (e.g. the browser sandbox), same ordered results, run sequentially.
        return [double(n) for n in numbers]
`

const CONC_TEST = String.raw`from jobs.runner import run_all


def run_tests(record):
    def maps_in_order():
        assert run_all([1, 2, 3]) == [2, 4, 6], f"got {run_all([1, 2, 3])!r}"

    def empty_input():
        assert run_all([]) == []

    record("maps over the batch in order", maps_in_order)
    record("empty input returns empty", empty_input)
`

const CONC_TEST_HIDDEN = String.raw`from jobs.runner import run_all


def run_tests(record):
    def single_item():
        assert run_all([10]) == [20]

    def negatives_and_zero():
        assert run_all([5, 0, -1]) == [10, 0, -2]

    record("single item", single_item)
    record("negatives and zero", negatives_and_zero)
`

export const concurrencyLesson: PythonLesson = {
  id: "py-l4-concurrency",
  title: "Threads, the GIL & concurrent.futures",
  summary: "Choose a concurrency model and parallelize a batch with a thread pool.",
  estimatedMinutes: 20,
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
    prompt: `Implement \`run_all(numbers)\` in \`jobs/runner.py\`: map the read-only \`double\` worker over
\`numbers\` with a \`concurrent.futures.ThreadPoolExecutor\`, returning the results in input order.
This sandbox has **no OS threads**, so catch the \`RuntimeError\` and fall back to a sequential map.
Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Open a pool inside a `try:`. `with ThreadPoolExecutor(max_workers=4) as executor: return list(executor.map(double, numbers))`.",
      "`executor.map(double, numbers)` runs the work and preserves order.",
      "Add `except RuntimeError: return [double(n) for n in numbers]` so it still works where threads are unavailable.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "jobs/runner.py",
      editableFilePaths: ["jobs/runner.py"],
      visibleTestPaths: ["tests/test_runner.py"],
      hiddenTestPaths: ["tests/test_runner_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CONC_README },
        { path: "jobs/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "jobs/worker.py",
          role: "readonly",
          language: "python",
          content: CONC_WORKER,
          description: "The unit of work (read-only)",
        },
        {
          path: "jobs/runner.py",
          role: "editable",
          language: "python",
          content: CONC_RUNNER_STARTER,
          description: "Implement run_all here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_runner.py",
          role: "test",
          language: "python",
          content: CONC_TEST,
          description: "Visible concurrency tests",
        },
        {
          path: "tests/test_runner_hidden.py",
          role: "test",
          language: "python",
          content: CONC_TEST_HIDDEN,
          hidden: true,
          description: "Hidden concurrency tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_runner", label: "visible runner" },
            { module: "test_runner_hidden", label: "hidden runner" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "jobs/runner.py",
          role: "editable",
          language: "python",
          content: CONC_RUNNER_REFERENCE,
        },
      ],
    },
  },
}

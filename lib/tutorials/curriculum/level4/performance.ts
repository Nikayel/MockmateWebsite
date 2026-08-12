// ───────────────────────────────────────────────────────────────────────────
// L4-M4: Performance & Production Practices
// ───────────────────────────────────────────────────────────────────────────

import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const PERF_README = `# Make a slow function fast

\`fib\` computes Fibonacci numbers by naive recursion, which recomputes the same subproblems
exponentially. Implement \`fib(n)\` in \`perf/compute.py\` with \`functools.lru_cache\` so each \`n\`
is computed once.

\`fib(0)\` is \`0\`, \`fib(1)\` is \`1\`, \`fib(10)\` is \`55\`. Some tests are hidden.
`

const PERF_COMPUTE_STARTER = String.raw`from functools import lru_cache


def fib(n):
    """Return the nth Fibonacci number (0, 1, 1, 2, 3, 5, ...), see README.md."""
    # TODO: add @lru_cache above this def, and recurse: fib(n-1) + fib(n-2) with a base case.
    return 0
`

const PERF_COMPUTE_REFERENCE = String.raw`from functools import lru_cache


@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
`

const PERF_TEST = String.raw`from perf.compute import fib


def run_tests(record):
    def base_cases():
        assert fib(0) == 0 and fib(1) == 1, f"got fib(0)={fib(0)}, fib(1)={fib(1)}"

    def small_value():
        assert fib(10) == 55, f"expected 55, got {fib(10)!r}"

    record("base cases", base_cases)
    record("fib(10) is 55", small_value)
`

const PERF_TEST_HIDDEN = String.raw`from perf.compute import fib


def run_tests(record):
    def larger_value():
        assert fib(20) == 6765, f"expected 6765, got {fib(20)!r}"

    def cached_is_fast():
        # With lru_cache this returns instantly; the value must still be correct.
        assert fib(30) == 832040, f"expected 832040, got {fib(30)!r}"

    record("fib(20) is 6765", larger_value)
    record("fib(30) is 832040", cached_is_fast)
`

export const performanceLesson: PythonLesson = {
  id: "py-l4-performance",
  title: "Profiling, complexity & caching",
  summary: "Find the hot path, fix complexity, and memoize repeated work with lru_cache.",
  estimatedMinutes: 20,
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
  "prompt": "That profile is your whole optimisation budget for the afternoon. slow_function shows cumtime 0.900 with tottime 0.002. lookup shows tottime 0.850 across 900000 calls. Where do you spend the afternoon?",
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

Measured on CPython 3.11 for a two-attribute object, \`sys.getsizeof\` reports 48 bytes with \`__slots__\`
against 56 bytes **plus** a separate per-instance dict without it. Across a million objects that gap
is the difference between fitting in memory and not. Attribute access also gets slightly faster,
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

\`@lru_cache(maxsize=None)\` keeps every result; in Python 3.9+ the shorthand is \`@functools.cache\`. This is exactly what the exercises ask for: a memoized \`fib\` where each \`n\` is computed once.

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
    executionMode: "workspace",
    prompt: `Implement \`fib(n)\` in \`perf/compute.py\` with \`functools.lru_cache\` so the recursion is
memoized (each \`n\` computed once). It must return correct Fibonacci values, including for larger
\`n\`. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Decorate the function: `@lru_cache(maxsize=None)` above `def fib(n):`.",
      "Base case `if n < 2: return n`, else `fib(n - 1) + fib(n - 2)`.",
      "The cache is what keeps `fib(30)` instant instead of exponential.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "perf/compute.py",
      editableFilePaths: ["perf/compute.py"],
      visibleTestPaths: ["tests/test_compute.py"],
      hiddenTestPaths: ["tests/test_compute_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PERF_README },
        { path: "perf/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "perf/compute.py",
          role: "editable",
          language: "python",
          content: PERF_COMPUTE_STARTER,
          description: "Implement a memoized fib here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_compute.py",
          role: "test",
          language: "python",
          content: PERF_TEST,
          description: "Visible performance tests",
        },
        {
          path: "tests/test_compute_hidden.py",
          role: "test",
          language: "python",
          content: PERF_TEST_HIDDEN,
          hidden: true,
          description: "Hidden larger-value tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_compute", label: "visible compute" },
            { module: "test_compute_hidden", label: "hidden compute" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "perf/compute.py",
          role: "editable",
          language: "python",
          content: PERF_COMPUTE_REFERENCE,
        },
      ],
    },
  },
}

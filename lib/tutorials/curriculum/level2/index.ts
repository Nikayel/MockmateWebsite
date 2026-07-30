/**
 * Level 2: Apply (single-file). Read a concept, then write it with an instant check.
 *
 * Authored by Agent 2 following the single-file authoring contract documented in
 * `../level1/index.ts` (first `def` is graded, keyed `input` passed positionally, avoid the
 * root/tree/node/head/list param names). Modules follow CONTENT-TICKETS.md (L2-M1..M5).
 */
import type { PythonLesson, PythonLevel } from "../../types"

// ───────────────────────────────────────────────────────────────────────────
// L2-M1: Comprehensions & Generators
// ───────────────────────────────────────────────────────────────────────────

const comprehensionsLesson: PythonLesson = {
  id: "py-l2-comprehensions",
  title: "List, dict & set comprehensions",
  summary: "Transform and filter collections in one readable expression.",
  estimatedMinutes: 10,
  difficulty: "easy",
  skills: ["comprehensions", "lists", "dicts", "filtering"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## One expression that says exactly what you want

Reach for a comprehension whenever you are building a new collection out of an existing one by transforming or filtering it. That is most of the collection code you will ever write: pull one field out of a list of API records, drop the rows that fail a validation check, build a lookup table keyed by id. The comprehension puts the result on one line, so a reviewer reads *what* you are producing instead of tracing an accumulator through a loop body.

### The mental model

A list comprehension is a loop-and-collect fused into a single expression.

\`\`\`csdiagram
{
  "type": "comprehension",
  "loop": [
    "squares = []",
    "for n in nums:",
    "    squares.append(n * n)"
  ],
  "comp": "squares = [n * n for n in nums]",
  "parts": [
    {
      "label": "output",
      "code": "n * n"
    },
    {
      "label": "iterate",
      "code": "for n in nums"
    }
  ],
  "caption": "The same loop-and-collect, fused into one expression: the output expression comes first, the loop reads left to right."
}
\`\`\`

Python still runs the loop; it just builds the list for you. Read it left to right as *"this expression, for each item in the source."*

\`\`\`python
nums = [1, 2, 3, 4, 5]
squares = [n * n for n in nums]
print(squares)   # [1, 4, 9, 16, 25]
\`\`\`

That is the exact shape the Apply exercise wants: take each \`n\`, square it, collect the results.

### Filter with a trailing \`if\`

Add \`if <condition>\` after the loop to keep only the items that pass:

\`\`\`csdiagram
{
  "type": "comprehension",
  "loop": [
    "evens = []",
    "for n in nums:",
    "    if n % 2 == 0:",
    "        evens.append(n)"
  ],
  "comp": "evens = [n for n in nums if n % 2 == 0]",
  "parts": [
    {
      "label": "output",
      "code": "n"
    },
    {
      "label": "iterate",
      "code": "for n in nums"
    },
    {
      "label": "filter",
      "code": "if n % 2 == 0"
    }
  ],
  "caption": "A trailing if maps to the nested if in the loop: it skips items instead of transforming them, so the result gets shorter."
}
\`\`\`

\`\`\`python
evens = [n for n in nums if n % 2 == 0]
print(evens)     # [2, 4]
\`\`\`

### Same shape, different brackets

Swap \`[ ]\` for \`{ }\` to build a dict or a set. A dict comprehension needs a \`key: value\` pair:

\`\`\`python
squares_map = {n: n * n for n in nums}
print(squares_map)   # {1: 1, 2: 4, 3: 9, 4: 16, 5: 25}
distinct = {n % 3 for n in nums}   # {0, 1, 2}
\`\`\`

The \`{word: len(word) for word in words}\` form is precisely what the Practice exercise builds.

### Pitfall: two different \`if\` positions

\`if\` at the **end** filters. \`if ... else\` at the **front** is a conditional expression that transforms every item and drops nothing:

\`\`\`python
[n for n in nums if n > 2]         # [3, 4, 5]        -> filter, shorter
[n if n > 2 else 0 for n in nums]  # [0, 0, 3, 4, 5]  -> map, same length
\`\`\`

Interns mix these up constantly. If your output got shorter, you filtered. If it stayed the same length, you mapped.

One more, for dicts: duplicate keys silently overwrite, and the last one wins. \`{len(w): w for w in ["hi", "by", "ok"]}\` keeps only \`{2: "ok"}\` because all three keys are \`2\`. In the Practice exercise the words are the keys, so you are safe, but flip the mapping and you will quietly lose data.

**Interview nuance:** a comprehension is eager. It runs to completion and materializes the whole collection in memory, so it costs O(n) time and O(n) space. That is fine for thousands of items and wasteful for a billion-row scan. The lazy cousin is the generator expression \`(n * n for n in nums)\`, the same syntax with \`( )\`, which yields one value at a time in O(1) extra space. When an interviewer asks what you would run over a huge stream, "a generator, because the full list would not fit in memory" is the answer they are listening for.`,
    demoCode: `nums = [1, 2, 3, 4, 5]
print([n * n for n in nums])              # [1, 4, 9, 16, 25]
print([n for n in nums if n % 2 == 0])    # [2, 4]
print({n: n * n for n in nums})           # {1: 1, 2: 4, ...}`,
  },
  apply: {
    id: "py-l2-comprehensions-apply",
    executionMode: "single-file",
    prompt: `Implement \`squares(nums)\`: return a new list with each number in \`nums\` squared.

For \`[1, 2, 3]\` return \`[1, 4, 9]\`. Use a list comprehension.`,
    starterCode: `def squares(nums):
    # Return [each number squared] using a comprehension.
    pass`,
    hints: [
      "The shape is `[expr for n in nums]`.",
      "Square each one with `n * n`.",
      "`return [n * n for n in nums]`.",
    ],
    referenceSolution: `def squares(nums):
    return [n * n for n in nums]`,
    testCases: [
      { input: { nums: [1, 2, 3] }, expected: [1, 4, 9], description: "three numbers" },
      { input: { nums: [] }, expected: [], description: "empty list" },
      { input: { nums: [5] }, expected: [25], description: "single number" },
      { input: { nums: [-2, 2] }, expected: [4, 4], description: "negatives square positive" },
    ],
  },
  practice: {
    id: "py-l2-comprehensions-practice",
    executionMode: "single-file",
    prompt: `Implement \`lengths(words)\`: return a dict mapping each word to its length.

For \`["hi", "abc"]\` return \`{"hi": 2, "abc": 3}\`. Use a dict comprehension.`,
    starterCode: `def lengths(words):
    # Return {word: len(word) for ...} using a comprehension.
    pass`,
    hints: [
      "A dict comprehension uses `{key: value for ...}`.",
      "The key is `word`, the value is `len(word)`.",
      "`return {word: len(word) for word in words}`.",
    ],
    referenceSolution: `def lengths(words):
    return {word: len(word) for word in words}`,
    testCases: [
      {
        input: { words: ["hi", "abc"] },
        expected: { hi: 2, abc: 3 },
        description: "two words",
      },
      { input: { words: ["a"] }, expected: { a: 1 }, description: "single word" },
      { input: { words: [] }, expected: {}, description: "empty list" },
      {
        input: { words: ["python", "go"] },
        expected: { python: 6, go: 2 },
        description: "different lengths",
      },
    ],
  },
}

const generatorsLesson: PythonLesson = {
  id: "py-l2-generators",
  title: "Generators, yield & iterators",
  summary: "Produce values lazily and consume them one at a time.",
  estimatedMinutes: 11,
  difficulty: "medium",
  skills: ["generators", "yield", "iterators", "laziness"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why laziness matters

When you scan a 10 GB log file to count errors, you do not want the whole file sitting in memory at once. A generator lets you process one line at a time, so memory stays flat no matter how large the input grows. That is why streaming pipelines, database cursors, and \`csv.reader\` all hand you values lazily instead of returning a giant list. Building the full list first is often the difference between a job that finishes and a job that gets killed for using too much memory.

### A generator is a paused function

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "pull",
    "body runs to",
    "yields",
    "n now"
  ],
  "rows": [
    [
      "next() #1",
      "yield n",
      3,
      3
    ],
    [
      "next() #2",
      "n -= 1; yield n",
      2,
      2
    ],
    [
      "next() #3",
      "n -= 1; yield n",
      1,
      1
    ],
    [
      "next() #4",
      "loop ends, StopIteration",
      null,
      0
    ]
  ],
  "highlightCols": [
    "yields"
  ],
  "caption": "list(countdown(3)) drives the generator: each pull runs the body to the next yield, hands back one value, then freezes with n intact until the next pull. The 4th pull finds no more yields and raises StopIteration."
}
\`\`\`

A generator function uses \`yield\` instead of \`return\`. Calling it does not run the body. It hands you a generator object. Each time you ask for a value (via \`for\`, \`next\`, \`sum\`, and friends), the body runs until it hits a \`yield\`, hands back that value, and freezes right there with every local variable intact. The next request resumes on the line after the \`yield\`.

\`\`\`python
def countdown(n):
    while n > 0:
        yield n          # hand back one value, then pause here
        n -= 1

print(list(countdown(3)))   # [3, 2, 1]
\`\`\`

Nothing is computed until you iterate. \`list(...)\` drives the generator to exhaustion; a \`for\` loop pulls exactly one value per pass.

### Generator expressions

Same laziness, compact syntax: a comprehension with parentheses instead of brackets. No intermediate list is built.

\`\`\`python
print(sum(n * n for n in range(1, 5)))   # 1 + 4 + 9 + 16 = 30
\`\`\`

\`range(1, 5)\` yields \`1, 2, 3, 4\`, so this sums the first four squares. For the Apply exercise you will want \`range(1, n + 1)\` so that \`n\` itself is included, and \`n = 0\` produces an empty range whose \`sum\` is \`0\`.

### Stop at the first match with next

\`next(gen)\` pulls one value. \`next(gen, default)\` returns \`default\` instead of raising when the generator is empty. Paired with a filtered generator expression, it stops at the first hit and never touches the rest.

\`\`\`python
nums = [0, 0, 7, 3]
print(next((x for x in nums if x), None))   # 7
\`\`\`

That is exactly the shape for finding the first truthy value: the \`if x\` filter keeps only truthy items, and \`next(..., None)\` supplies the fallback when nothing qualifies.

### Pitfall: a generator is single-use

Iterating a generator consumes it. There is no rewind.

\`\`\`python
g = (n * n for n in range(1, 5))
print(sum(g))   # 30
print(sum(g))   # 0   <- already exhausted, nothing left to yield
\`\`\`

The second \`sum\` sees an empty generator, not a fresh one. Also, \`next(gen)\` with no default raises \`StopIteration\` on an empty generator, so always pass a default when "not found" is a real outcome.

**Interview nuance:** a generator *is* an iterator. It implements \`__iter__\` (returning itself) and \`__next__\`, holds one value at a time, and runs in O(1) extra memory no matter how many values it produces. A list comprehension is O(n) memory and re-iterable; a generator is O(1) memory and single-pass. Interviewers probe that trade-off directly: reach for a generator when you consume the sequence once and streaming saves memory, and for a list when you need indexing, \`len\`, or more than one pass.`,
    demoCode: `def countdown(n):
    while n > 0:
        yield n
        n -= 1

print(list(countdown(3)))                 # [3, 2, 1]
print(sum(n * n for n in range(1, 5)))    # 30`,
  },
  apply: {
    id: "py-l2-generators-apply",
    executionMode: "single-file",
    prompt: `Implement \`sum_of_squares(n)\`: return the sum of the squares \`1² + 2² + ... + n²\`.

For \`n = 3\` that's \`1 + 4 + 9 = 14\`. Build it with a generator expression inside \`sum(...)\` (no
list needed). For \`n = 0\`, return \`0\`.`,
    starterCode: `def sum_of_squares(n):
    # Return sum(i*i for i in 1..n) using a generator expression.
    pass`,
    hints: [
      "`range(1, n + 1)` gives 1..n.",
      "Feed a generator expression straight to `sum(...)`.",
      "`return sum(i * i for i in range(1, n + 1))`.",
    ],
    referenceSolution: `def sum_of_squares(n):
    return sum(i * i for i in range(1, n + 1))`,
    testCases: [
      { input: { n: 3 }, expected: 14, description: "1 + 4 + 9" },
      { input: { n: 1 }, expected: 1, description: "just 1" },
      { input: { n: 0 }, expected: 0, description: "empty range sums to 0" },
      { input: { n: 5 }, expected: 55, description: "1..5 squared" },
    ],
  },
  practice: {
    id: "py-l2-generators-practice",
    executionMode: "single-file",
    prompt: `Implement \`first_truthy(items)\`: return the first **truthy** value in \`items\`, or \`None\` if
there isn't one.

For \`[0, "", 5, 3]\` return \`5\`. Use \`next(...)\` over a generator expression so it stops at the
first match.`,
    starterCode: `def first_truthy(items):
    # Return the first truthy value, or None. Use next() over a generator.
    pass`,
    hints: [
      "A generator expression `(x for x in items if x)` yields only truthy values.",
      "`next(gen, None)` returns the first one, or None when there are none.",
      "`return next((x for x in items if x), None)`.",
    ],
    referenceSolution: `def first_truthy(items):
    return next((x for x in items if x), None)`,
    testCases: [
      { input: { items: [0, "", 5, 3] }, expected: 5, description: "first truthy is 5" },
      { input: { items: [0, 0] }, expected: null, description: "nothing truthy -> None" },
      { input: { items: ["hi"] }, expected: "hi", description: "a truthy string" },
      { input: { items: [] }, expected: null, description: "empty -> None" },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L2-M2: Functions in Depth
// ───────────────────────────────────────────────────────────────────────────

const argsKwargsLesson: PythonLesson = {
  id: "py-l2-args-kwargs",
  title: "*args, **kwargs & unpacking",
  summary:
    "Write functions that accept any number of arguments, and unpack collections into calls.",
  estimatedMinutes: 11,
  difficulty: "medium",
  skills: ["args", "kwargs", "unpacking", "functions"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why flexible signatures matter

Some functions cannot know their arity ahead of time. A decorator has to wrap a function whose signature it has never seen, so it must forward whatever it is given. A logging helper should accept \`log("saved", user, count)\` with as many values as the caller has. \`print\`, \`max\`, and \`str.format\` all take a variable number of arguments for the same reason. Without \`*args\` and \`**kwargs\` you would hard-code a fixed parameter count and rewrite the function every time a caller needs one more slot. These two features let one function absorb any call shape, and the mirror-image \`*\` and \`**\` at the call site let you feed a collection you already hold into any function.

### \`*args\`: collect extra positionals into a tuple

A parameter written \`*name\` sweeps up every positional argument that did not match an earlier parameter and binds them as a \`tuple\`:

\`\`\`python
def total(*nums):
    return sum(nums)   # nums is a tuple, e.g. (1, 2, 3)

total(1, 2, 3)   # 6
total()          # 0  (nums is the empty tuple ())
\`\`\`

The name \`args\` is only a convention. What matters is the leading \`*\`. Because \`nums\` is a real tuple, \`sum(nums)\` works, and \`total()\` gives \`sum(()) == 0\`.

### \`**kwargs\`: collect extra keywords into a dict

A parameter written \`**name\` gathers keyword arguments that did not match a named parameter into a \`dict\`:

\`\`\`python
def tag(name, **attrs):
    return name, attrs

tag("a", href="/x", id=3)   # ("a", {"href": "/x", "id": 3})
\`\`\`

### \`*\` and \`**\` at the call site: spread a collection into a call

The same symbols run in reverse when you call a function. \`*seq\` spreads an iterable into positional arguments, and \`**mapping\` spreads a dict into keyword arguments. This is how you fill a template from a dict you already have:

\`\`\`python
values = {"name": "Ada", "age": 30}
"{name} is {age}".format(**values)   # "Ada is 30"
\`\`\`

\`format(**values)\` is exactly \`format(name="Ada", age=30)\`. One pair of symbols, two mirror roles: \`*\` and \`**\` collect inside a \`def\`, and spread inside a call.

### Pitfall: passing a container where you meant to unpack it

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "call",
    "nums binds to",
    "sum(nums)"
  ],
  "rows": [
    [
      "total(1, 2, 3)",
      "(1, 2, 3)",
      6
    ],
    [
      "total()",
      "()",
      0
    ],
    [
      "total(nums)",
      "([1, 2, 3],)",
      "TypeError"
    ],
    [
      "total(*nums)",
      "(1, 2, 3)",
      6
    ]
  ],
  "highlightCols": [
    "nums binds to"
  ],
  "caption": "*nums collects loose positional arguments into a tuple. With nums = [1, 2, 3], passing the list itself binds it as ONE element, so sum() sees a list inside a tuple and raises TypeError; spreading with *nums restores the three separate arguments."
}
\`\`\`

\`total(*nums)\` collects loose numbers, not a list. If you already hold a list, you must spread it, or it arrives as a single argument:

\`\`\`python
nums = [1, 2, 3]
total(nums)    # nums bound as ONE arg -> sum(([1, 2, 3],)) -> TypeError
total(*nums)   # 6  (spreads to total(1, 2, 3))
\`\`\`

The formatting side has its own traps. A placeholder in the template with no matching key raises \`KeyError\`, and a literal brace in the text must be doubled as \`{{\` so \`format\` does not read it as a slot.

**Interview nuance:** any parameter listed after \`*args\` becomes keyword-only. It can no longer be filled positionally, because \`*args\` has already claimed every remaining positional argument. So \`def f(a, *args, b)\` requires \`b\` to be passed by name, and \`f(1, 2, 3)\` raises \`TypeError: f() missing 1 required keyword-only argument: 'b'\`. Interviewers use this to check that you understand the argument-binding order (named parameters fill first, \`*args\` sweeps the rest, then keyword-only parameters and \`**kwargs\`), not just the syntax.`,
    demoCode: `def total(*nums):
    return sum(nums)

print(total(1, 2, 3))    # 6
print(total())           # 0
print("{name} is {age}".format(**{"name": "Ada", "age": 30}))  # Ada is 30`,
  },
  apply: {
    id: "py-l2-args-kwargs-apply",
    executionMode: "single-file",
    prompt: `Implement \`total(*nums)\`: accept **any number** of numbers and return their sum.

\`total(1, 2, 3)\` is \`6\`; \`total()\` is \`0\`. Use a \`*nums\` parameter.`,
    starterCode: `def total(*nums):
    # nums is a tuple of every argument passed. Return their sum.
    pass`,
    hints: [
      "`*nums` collects all the arguments into a tuple.",
      "`sum(nums)` adds them up (and sums to 0 when empty).",
      "`return sum(nums)`.",
    ],
    referenceSolution: `def total(*nums):
    return sum(nums)`,
    // The executor passes input values POSITIONALLY in key order, so these keyed objects expand to
    // total(1, 2, 3) etc. The key names are arbitrary positional fillers for *nums. Keep them in
    // the intended argument order; do not alphabetize or reorder them.
    testCases: [
      { input: { a: 1, b: 2, c: 3 }, expected: 6, description: "three arguments" },
      { input: { a: 5 }, expected: 5, description: "one argument" },
      { input: {}, expected: 0, description: "no arguments sums to 0" },
      { input: { a: 10, b: 20 }, expected: 30, description: "two arguments" },
    ],
  },
  practice: {
    id: "py-l2-args-kwargs-practice",
    executionMode: "single-file",
    prompt: `Implement \`render(template, values)\`: fill the \`{placeholder}\` slots in \`template\` using the
\`values\` dict.

For \`template = "{name} is {age}"\` and \`values = {"name": "Ada", "age": 30}\`, return
\`"Ada is 30"\`. Unpack the dict with \`**\`.`,
    starterCode: `def render(template, values):
    # Fill template's {slots} from the values dict using ** unpacking.
    pass`,
    hints: [
      "`str.format` accepts keyword arguments: `template.format(name=..., age=...)`.",
      "Spread the dict in with `**`: `template.format(**values)`.",
    ],
    referenceSolution: `def render(template, values):
    return template.format(**values)`,
    testCases: [
      {
        input: { template: "{name} is {age}", values: { name: "Ada", age: 30 } },
        expected: "Ada is 30",
        description: "two placeholders",
      },
      {
        input: { template: "Hi {x}", values: { x: "there" } },
        expected: "Hi there",
        description: "one placeholder",
      },
      {
        input: { template: "{a}+{b}={c}", values: { a: 1, b: 2, c: 3 } },
        expected: "1+2=3",
        description: "numbers fill in too",
      },
    ],
  },
}

const lambdasHofLesson: PythonLesson = {
  id: "py-l2-lambdas-hof",
  title: "Lambdas & higher-order functions",
  summary: "Pass functions as values: sorted(key=...), map, and filter.",
  estimatedMinutes: 11,
  difficulty: "medium",
  skills: ["lambdas", "higher-order-functions", "sorted", "map"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why passing functions is worth learning

Half of real Python data code is "sort these records by the right field," "transform every row," or "keep the rows that match." You could write a loop each time, but the standard library already has fast, tested tools for this: \`sorted\`, \`map\`, and \`filter\`. The catch is that they need you to hand them a function that describes the rule. Learn to pass a function as an argument and a page of loops collapses into one clear line.

### Functions are values

In Python a function is an ordinary value, like an \`int\` or a \`list\`. You can store it in a variable, put it in a list, and pass it into another function to call later. A function that takes or returns a function is a **higher-order function**. \`sorted\`, \`map\`, and \`filter\` are all higher-order: they do the looping, you supply the rule.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Tool", "What your function returns", "What comes back", "Length of the result"],
  "rows": [
    ["sorted(xs, key=f)", "a sort key for one item", "a new list", "same as the input"],
    ["map(f, xs)", "the replacement for one item", "a lazy iterator", "same as the input"],
    ["filter(f, xs)", "True to keep, False to drop", "a lazy iterator", "same or shorter"]
  ],
  "highlightCols": ["What your function returns"],
  "caption": "All three take a rule and do the looping, and the highlighted column is what distinguishes them: sorted wants a key, map wants a replacement, filter wants a verdict. Mixing them up is why filter(lambda x: x * 2, xs) silently keeps everything, since every non-zero number is truthy."
}
\`\`\`

### Lambdas: a rule with no name

A \`lambda\` is a one-expression function you write inline, without a \`def\` and without a name:

\`\`\`python
square = lambda x: x * x
square(5)   # 25
\`\`\`

\`lambda x: x * x\` is the same idea as \`def square(x): return x * x\`, just shorter and anonymous. You will rarely assign one to a variable (use \`def\` for that). Lambdas exist to be passed straight into a higher-order function.

### sorted with a key

\`sorted\` returns a **new** sorted list and never changes the original. Its \`key\` argument is a function applied to each element to decide what to sort by:

\`\`\`python
words = ["ccc", "a", "bb"]
sorted(words, key=len)              # ['a', 'bb', 'ccc']  (shortest first)
sorted(words, key=lambda w: w[-1])  # sort by last character
\`\`\`

You can pass a built-in like \`len\` directly, or write a \`lambda\` for a custom rule. Add \`reverse=True\` to sort largest-first without touching your \`key\`, so \`sorted(words, key=len, reverse=True)\` puts the longest word first. This is exactly what the Apply asks for.

### map and filter

\`map\` applies a function to every item; \`filter\` keeps the items where the function returns a truthy value. Both return lazy iterators, so wrap them in \`list(...)\` to get a real list:

\`\`\`python
list(map(lambda w: w.upper(), words))     # ['CCC', 'A', 'BB']
list(filter(lambda x: x % 2 == 0, nums))  # keep even numbers
\`\`\`

### Pitfalls

- **\`sort\` versus \`sorted\`.** \`sorted(x)\` returns a new list; \`x.sort()\` sorts in place and returns \`None\`. Writing \`result = words.sort()\` gives you \`None\`, a bug interns hit constantly. In the Apply, \`return sorted(words, key=len)\`, not \`words.sort()\`.
- **Iterators are one-shot.** A \`map\` or \`filter\` object is exhausted after you walk it once. \`m = map(...); list(m)\` works, but a second \`list(m)\` returns \`[]\`. Call \`list(...)\` once and keep that list.

**Interview nuance:** Python's \`sorted\` is **stable** and computes each \`key\` exactly once per element (the decorate-sort-undecorate strategy). Stable means elements with equal keys stay in their original relative order, which lets you sort by a secondary field first and a primary field second to build a multi-key sort. Computing \`key\` once means \`n\` key calls plus \`O(n log n)\` comparisons on those cheap precomputed keys, so an expensive \`key\` is evaluated \`n\` times, not on every comparison.`,
    demoCode: `words = ["ccc", "a", "bb"]
print(sorted(words, key=len))                 # ['a', 'bb', 'ccc']
print(list(map(lambda w: w.upper(), words)))  # ['CCC', 'A', 'BB']`,
  },
  apply: {
    id: "py-l2-lambdas-hof-apply",
    executionMode: "single-file",
    prompt: `Implement \`sort_by_length(words)\`: return \`words\` sorted from shortest to longest.

For \`["ccc", "a", "bb"]\` return \`["a", "bb", "ccc"]\`. Pass a \`key\` to \`sorted\`.`,
    starterCode: `def sort_by_length(words):
    # Return words sorted by length using sorted(key=...).
    pass`,
    hints: [
      "`sorted(words, key=len)` sorts by each word's length.",
      "`len` is itself a function. Pass it as the key.",
      "`return sorted(words, key=len)`.",
    ],
    referenceSolution: `def sort_by_length(words):
    return sorted(words, key=len)`,
    testCases: [
      {
        input: { words: ["ccc", "a", "bb"] },
        expected: ["a", "bb", "ccc"],
        description: "shortest first",
      },
      {
        input: { words: ["bb", "aa"] },
        expected: ["bb", "aa"],
        description: "equal lengths keep their order",
      },
      { input: { words: [] }, expected: [], description: "empty list" },
      { input: { words: ["one"] }, expected: ["one"], description: "single word" },
    ],
  },
  practice: {
    id: "py-l2-lambdas-hof-practice",
    executionMode: "single-file",
    prompt: `Implement \`shout_all(words)\`: return a new list where each word is uppercased with a \`"!"\`
appended.

For \`["hi", "go"]\` return \`["HI!", "GO!"]\`. Use \`map\` with a \`lambda\`.`,
    starterCode: `def shout_all(words):
    # Use map() + a lambda to uppercase each word and add "!".
    pass`,
    hints: [
      'The lambda is `lambda w: w.upper() + "!"`.',
      "Apply it with `map(...)`, then wrap in `list(...)`.",
      '`return list(map(lambda w: w.upper() + "!", words))`.',
    ],
    referenceSolution: `def shout_all(words):
    return list(map(lambda w: w.upper() + "!", words))`,
    testCases: [
      { input: { words: ["hi", "go"] }, expected: ["HI!", "GO!"], description: "two words" },
      { input: { words: [] }, expected: [], description: "empty list" },
      { input: { words: ["a"] }, expected: ["A!"], description: "single word" },
      { input: { words: ["Yes"] }, expected: ["YES!"], description: "mixed case" },
    ],
  },
}

const closuresDecoratorsLesson: PythonLesson = {
  id: "py-l2-closures-decorators",
  title: "Scope, closures & decorators",
  summary: "Capture state in a closure and wrap behaviour with a decorator.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["closures", "scope", "decorators", "functions"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why closures and decorators are everywhere

Every time you write \`@app.route\`, \`@pytest.fixture\`, or \`@functools.lru_cache\`, you are using both ideas at once. A closure lets a function carry state without a class or a global variable. A decorator lets you add behaviour (timing, retries, auth checks, caching) around a function without touching its body. In real codebases these keep cross-cutting logic in one place instead of copy-pasted into every function.

## Scope: how Python resolves a name

When you use a name, Python searches four scopes in order: Local, Enclosing, Global, Built-in (LEGB). An inner function can *read* names from the enclosing function for free. To *rebind* one, you must declare it \`nonlocal\`; otherwise any assignment inside the function marks that name as local for the whole function, so reading it before the assignment runs raises \`UnboundLocalError\`.

## A closure captures its enclosing scope

A closure is an inner function plus a live link to the variables it read from the function that created it. Those variables stay alive after the outer function returns.

\`\`\`python
def make_multiplier(factor):
    def multiply(x):
        return x * factor      # 'factor' comes from the enclosing scope
    return multiply

triple = make_multiplier(3)
print(triple(5))               # 15
\`\`\`

\`multiply\` *closes over* \`factor\`. Because it keeps a reference to that variable (not a snapshot copy), you can build state that survives between calls:

\`\`\`python
def make_counter():
    count = 0
    def step():
        nonlocal count         # rebind the enclosing variable, not just read it
        count += 1
        return count
    return step

c = make_counter()
print(c(), c(), c())           # 1 2 3
\`\`\`

## Decorators wrap a function

\`\`\`csdiagram
{
  "type": "call-stack",
  "title": "identity(5) with @double",
  "steps": [
    {
      "stack": [
        "wrapper(5)"
      ],
      "note": "@double replaced identity with wrapper; the call lands here"
    },
    {
      "stack": [
        "wrapper(5)",
        "fn(5)"
      ],
      "note": "wrapper calls the original fn (the real identity)"
    },
    {
      "stack": [
        "wrapper(5)",
        "fn(5)"
      ],
      "returning": "5"
    },
    {
      "stack": [
        "wrapper(5)"
      ],
      "note": "back in wrapper: take fn(5) and multiply by 2"
    },
    {
      "stack": [
        "wrapper(5)"
      ],
      "returning": "10"
    }
  ],
  "caption": "Writing @double makes the name identity point at wrapper. Calling identity(5) runs wrapper, which calls the original fn (returns 5), then doubles it to return 10."
}
\`\`\`

A decorator is a higher-order function: it takes a function and returns a replacement. The demo below defines \`double\`, whose inner \`wrapper\` calls the original \`fn\` and doubles the result. Writing \`@double\` above \`identity\` is exactly \`identity = double(identity)\`, so the name \`identity\` now points at \`wrapper\`, and \`identity(5)\` returns \`10\`.

### Pitfall: late binding in loops

Closures capture the *variable*, not its value at definition time:

\`\`\`python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])    # [2, 2, 2], not [0, 1, 2]
\`\`\`

Every lambda shares the same \`i\`, which has reached \`2\` by the time you call them. Bind the value eagerly with a default argument: \`lambda i=i: i\` gives \`[0, 1, 2]\`.

**Interview nuance:** a naive decorator hides the function it wraps. After \`@double\`, \`identity.__name__\` is \`"wrapper"\` and its docstring is \`None\`, which breaks debuggers, introspection, and some frameworks. The fix is to decorate \`wrapper\` with \`functools.wraps(fn)\`, which copies \`__name__\` and \`__doc__\` from the original and sets \`__wrapped__\` to point back at it, so the wrapped function still looks like itself.`,
    demoCode: `def double(fn):
    def wrapper(x):
        return fn(x) * 2
    return wrapper

@double
def identity(x):
    return x

print(identity(5))   # 10`,
  },
  apply: {
    id: "py-l2-closures-decorators-apply",
    executionMode: "single-file",
    prompt: `Implement \`scaled(factor, value)\` using a **closure**: define an inner function that captures
\`factor\` and multiplies its argument by it, then call that inner function on \`value\` and return
the result.

\`scaled(3, 5)\` is \`15\`.`,
    starterCode: `def scaled(factor, value):
    # Define an inner function that captures factor, then call it on value.
    def multiply(x):
        pass
    return multiply(value)`,
    hints: [
      "Inside `multiply`, return `x * factor`; `factor` comes from the enclosing scope.",
      "Then `return multiply(value)` from `scaled`.",
    ],
    referenceSolution: `def scaled(factor, value):
    def multiply(x):
        return x * factor
    return multiply(value)`,
    testCases: [
      { input: { factor: 3, value: 5 }, expected: 15, description: "3 times 5" },
      { input: { factor: 10, value: 2 }, expected: 20, description: "10 times 2" },
      { input: { factor: 0, value: 7 }, expected: 0, description: "scaling by zero" },
      { input: { factor: 5, value: 5 }, expected: 25, description: "5 times 5" },
    ],
  },
  practice: {
    id: "py-l2-closures-decorators-practice",
    executionMode: "single-file",
    prompt: `Implement \`double_result(n)\`: write a decorator \`double\` that doubles whatever its wrapped
function returns, apply it to a function that returns its argument, and return the result for \`n\`.

\`double_result(5)\` is \`10\`.`,
    starterCode: `def double_result(n):
    def double(fn):
        # Return a wrapper that doubles fn's result.
        pass

    @double
    def identity(x):
        return x

    return identity(n)`,
    hints: [
      "Inside `double`, define `wrapper(x)` that returns `fn(x) * 2`, and return `wrapper`.",
      "The `@double` line wraps `identity`, so `identity(n)` is already doubled.",
    ],
    referenceSolution: `def double_result(n):
    def double(fn):
        def wrapper(x):
            return fn(x) * 2
        return wrapper

    @double
    def identity(x):
        return x

    return identity(n)`,
    testCases: [
      { input: { n: 5 }, expected: 10, description: "5 doubled" },
      { input: { n: 0 }, expected: 0, description: "zero doubled" },
      { input: { n: -3 }, expected: -6, description: "negatives double too" },
      { input: { n: 21 }, expected: 42, description: "21 doubled" },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L2-M3: OOP Foundations
//
// The grader runs the single top-level function (the class methods are excluded), so each lesson
// seeds a small `run(...)` driver that exercises the class the learner implements.
// ───────────────────────────────────────────────────────────────────────────

const classesLesson: PythonLesson = {
  id: "py-l2-classes",
  title: "Classes, __init__, methods & self",
  summary: "Model state and behaviour together with a class.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["classes", "init", "methods", "self"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why bundle state with behaviour

Real systems track things that own both data and the rules for changing that data. A bank account has a balance plus rules for depositing. A shopping cart has items plus rules for adding them. You could keep a loose \`balance\` variable and pass it to standalone functions, but then nothing keeps the data and its rules together, and every caller has to remember which functions are allowed to touch it. A \`class\` ties the data and the operations that act on it into one named type, so the \`balance\` and the sanctioned way to change it travel together.

### The mental model

A \`class\` is a template that describes a kind of object. Each object you build from it is an \`instance\` with its own copy of the data (its \`attributes\`). The functions defined inside the class are \`methods\`: the behaviour that acts on one instance's data.

\`\`\`python
class BankAccount:
    def __init__(self, balance):   # runs at construction
        self.balance = balance     # store data on THIS instance

    def deposit(self, amount):
        self.balance += amount     # read and update that data

account = BankAccount(100)   # __init__ runs, balance = 100
account.deposit(50)          # self is account; balance becomes 150
print(account.balance)       # 150
\`\`\`

### \`__init__\` and \`self\`

\`__init__\` is the initializer. Python calls it automatically when you write \`BankAccount(100)\`, passing \`100\` in as \`balance\`. Its job is to set the instance's starting attributes. \`self\` is the instance the method is currently working on. It is the first parameter of every method, and \`self.balance\` is how you reach that specific instance's data. Two accounts each carry their own \`balance\`, and writing \`self.balance\` on one never touches the other.

### Pitfall: forgetting \`self\`

Inside a method, \`balance = amount\` creates a throwaway local variable that vanishes when the method returns. The attribute is never touched. You must write \`self.balance = amount\`, and read it back the same way with \`self.balance\`, not a bare \`balance\`. Every method also needs \`self\` as its first parameter, even when the method takes no other argument. In Practice, \`increment(self)\` has no extra parameters, but \`self\` still comes first.

**Interview nuance:** \`account.deposit(50)\` is shorthand. Python looks up \`deposit\` on the class and calls \`BankAccount.deposit(account, 50)\`, binding \`account\` to \`self\`. That is why \`self\` is an ordinary first parameter and not magic: the dot syntax just passes the instance in for you. Knowing that a call is really \`Class.method(instance, ...)\` explains a common error too. If you omit \`self\` from a method's parameter list, calling it raises \`TypeError\` complaining that too many positional arguments were given, because Python still passes the instance.`,
    demoCode: `class BankAccount:
    def __init__(self, balance):
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount

account = BankAccount(100)
account.deposit(50)
print(account.balance)   # 150`,
  },
  apply: {
    id: "py-l2-classes-apply",
    executionMode: "single-file",
    prompt: `Finish the \`BankAccount\` class so the provided \`run\` driver works:
- \`__init__(self, balance)\` stores the starting balance in \`self.balance\`.
- \`deposit(self, amount)\` adds \`amount\` to \`self.balance\`.

\`run(100, 50)\` should return \`150\`.`,
    starterCode: `class BankAccount:
    def __init__(self, balance):
        # Store the starting balance on self.
        pass

    def deposit(self, amount):
        # Add amount to self.balance.
        pass


def run(start, amount):
    account = BankAccount(start)
    account.deposit(amount)
    return account.balance`,
    hints: [
      "In `__init__`, write `self.balance = balance`.",
      "In `deposit`, write `self.balance += amount`.",
      "`self` carries each account's own balance between method calls.",
    ],
    referenceSolution: `class BankAccount:
    def __init__(self, balance):
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount


def run(start, amount):
    account = BankAccount(start)
    account.deposit(amount)
    return account.balance`,
    testCases: [
      { input: { start: 100, amount: 50 }, expected: 150, description: "deposit into 100" },
      { input: { start: 0, amount: 25 }, expected: 25, description: "deposit into empty" },
      { input: { start: 10, amount: 0 }, expected: 10, description: "deposit nothing" },
    ],
  },
  practice: {
    id: "py-l2-classes-practice",
    executionMode: "single-file",
    prompt: `Implement a \`Counter\` class so the provided \`run\` driver works:
- \`__init__(self)\` starts \`self.count\` at \`0\`.
- \`increment(self)\` adds \`1\` to \`self.count\`.

\`run(3)\` should return \`3\`.`,
    starterCode: `class Counter:
    def __init__(self):
        # Start count at 0.
        pass

    def increment(self):
        # Add 1 to self.count.
        pass


def run(times):
    counter = Counter()
    for _ in range(times):
        counter.increment()
    return counter.count`,
    hints: [
      "`__init__` takes only `self`; set `self.count = 0`.",
      "`increment` does `self.count += 1`.",
    ],
    referenceSolution: `class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1


def run(times):
    counter = Counter()
    for _ in range(times):
        counter.increment()
    return counter.count`,
    testCases: [
      { input: { times: 3 }, expected: 3, description: "three increments" },
      { input: { times: 0 }, expected: 0, description: "no increments" },
      { input: { times: 5 }, expected: 5, description: "five increments" },
    ],
  },
}

const inheritanceCompositionLesson: PythonLesson = {
  id: "py-l2-inheritance-composition",
  title: "Inheritance & composition",
  summary: "Extend a base class with inheritance, and build objects from other objects.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["inheritance", "super", "composition", "classes"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Two ways to reuse a class

Every real codebase reuses behavior. The question an interviewer cares about is *how* you reuse it, because the wrong choice locks a system into a rigid shape that is painful to change later. There are two tools: inheritance (an "is-a" relationship) and composition (a "has-a" relationship). Reaching for inheritance by reflex is one of the most common junior mistakes, so knowing when each fits is the actual skill here.

## Inheritance: a subclass *is a* kind of its parent

When you write \`class LoudGreeter(Greeter)\`, a \`LoudGreeter\` **is a** \`Greeter\`. It automatically gets every attribute and method defined on \`Greeter\`, and you only write the parts that differ. When Python looks up \`obj.greet\`, it walks the class chain (the method resolution order) from the subclass upward and uses the first match it finds. Defining \`greet\` on \`LoudGreeter\` therefore **overrides** the parent version.

To *extend* the parent instead of replacing it, call \`super()\`. \`super()\` returns a proxy that dispatches to the next class up the chain, so \`super().greet()\` runs \`Greeter.greet(self)\` and hands you its return value to build on:

\`\`\`python
class Greeter:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return "Hi, " + self.name

class LoudGreeter(Greeter):
    def greet(self):
        return super().greet() + "!!!"

print(LoudGreeter("Ada").greet())   # Hi, Ada!!!
\`\`\`

Notice \`LoudGreeter\` never redefines \`__init__\`. Because it inherits the parent's, \`LoudGreeter("Ada")\` still stores \`self.name = "Ada"\`. That is exactly the Apply exercise: override \`greet\`, call \`super().greet()\`, and append \`"!!!"\`.

## What super() actually resolves to

\`super()\` does not mean "my parent class". It means "the next class after me in the **method
resolution order**", and that distinction only shows up once more than one base is involved. Every
class carries its MRO as a list you can read:

\`\`\`python
class A:
    def who(self):
        return "A"

class B(A):
    def who(self):
        return "B -> " + super().who()

class C(A):
    def who(self):
        return "C -> " + super().who()

class D(B, C):
    pass

print(D().who())                        # B -> C -> A
print([cls.__name__ for cls in D.__mro__])   # ['D', 'B', 'C', 'A', 'object']
\`\`\`

Read that output carefully: inside \`B.who\`, \`super()\` reached **C**, not \`A\`. \`B\` does not inherit from
\`C\` at all. The MRO is a property of \`D\`, the object the call started from, so \`B\`'s \`super()\` resolves
against \`D\`'s ordering:

\`\`\`csdiagram
{
  "type": "topology",
  "title": "class D(B, C) and the order super() walks",
  "layout": "tb",
  "nodes": [
    { "id": "D", "label": "D(B, C)", "kind": "client" },
    { "id": "B", "label": "B(A)", "kind": "service" },
    { "id": "C", "label": "C(A)", "kind": "service" },
    { "id": "A", "label": "A", "kind": "db" }
  ],
  "edges": [
    { "from": "D", "to": "B", "kind": "sync", "label": "1st" },
    { "from": "D", "to": "C", "kind": "sync", "label": "3rd, reached via B's super()" },
    { "from": "B", "to": "A", "kind": "sync", "label": "inherits from" },
    { "from": "C", "to": "A", "kind": "sync", "label": "4th and last" }
  ],
  "stages": [
    { "adds": ["D"], "note": "The call starts here, and D's MRO is what every super() in the chain will follow." },
    { "adds": ["B"], "note": "First match wins: D has no who(), so B's runs." },
    { "adds": ["C"], "note": "B's super() lands on C, its sibling. This is the step that surprises people, because B does not inherit from C." },
    { "adds": ["A"], "note": "Only after every class that inherits from A has had a turn does A finally run. A appears once, not twice." }
  ],
  "caption": "The MRO is computed by C3 linearization, whose rule is: a class always comes before its own bases, and A cannot run until both B and C have. That is what makes the shared base run exactly once."
}
\`\`\`

This is the **diamond problem**, and cooperative \`super()\` is how Python solves it: the shared base \`A\`
executes once rather than once per path. It also explains why every class in a cooperative hierarchy
should call \`super()\`. One class that skips the call silently truncates the chain for everyone below it.

## Composition: an object *has* another object

Composition means an object holds other objects as attributes instead of inheriting from them. A \`Person\` is not a kind of \`Wallet\`, so inheritance is wrong here. A \`Person\` **has a** \`Wallet\`:

\`\`\`python
class Person:
    def __init__(self, name):
        self.name = name
        self.wallet = Wallet()   # a fresh Wallet, owned by this person

p = Person("Ada")
p.wallet.add(50)
print(p.wallet.balance)          # 50
\`\`\`

The \`Person\` delegates money handling to the \`Wallet\` and stays small. That is the Practice exercise: set both \`self.name\` and a brand-new \`self.wallet = Wallet()\`.

## Which to use

Prefer composition when one thing *contains* or *uses* another. Reserve inheritance for a genuine "is-a" relationship where the subclass is fully substitutable for its parent. Composition keeps classes small and lets you swap a part out without touching a whole hierarchy.

## Pitfalls

The classic trap: a subclass defines its own \`__init__\` but forgets to call \`super().__init__(...)\`. The parent's setup never runs, so attributes like \`self.name\` are silently missing and you get an \`AttributeError\` only later, when some method reads them. If you override \`__init__\`, call the parent's inside it. (\`LoudGreeter\` sidesteps this by not defining \`__init__\` at all.)

**Interview nuance:** know why "prefer composition over inheritance" is standard advice. Inheritance couples a subclass to the parent's internals, so a change in the base class can quietly break every subclass (the fragile base class problem), and deep chains make method lookup hard to trace through the MRO. Composition swaps that inheritance coupling for a narrow "uses" boundary you can test and replace in isolation.`,
    demoCode: `class Greeter:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return "Hi, " + self.name

class LoudGreeter(Greeter):
    def greet(self):
        return super().greet() + "!!!"

print(LoudGreeter("Ada").greet())   # Hi, Ada!!!`,
  },
  apply: {
    id: "py-l2-inheritance-composition-apply",
    executionMode: "single-file",
    prompt: `\`Greeter\` is provided. Implement \`LoudGreeter(Greeter)\` so its \`greet\` calls the parent's
\`greet\` via \`super()\` and appends \`"!!!"\`.

\`run("Ada")\` should return \`"Hi, Ada!!!"\`.`,
    starterCode: `class Greeter:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return "Hi, " + self.name


class LoudGreeter(Greeter):
    def greet(self):
        # Call the parent's greet() and add "!!!".
        pass


def run(name):
    return LoudGreeter(name).greet()`,
    hints: [
      "`super().greet()` runs the parent `Greeter.greet`.",
      'Append the shout: `return super().greet() + "!!!"`.',
      "`LoudGreeter` inherits `__init__`, so you only override `greet`.",
    ],
    referenceSolution: `class Greeter:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return "Hi, " + self.name


class LoudGreeter(Greeter):
    def greet(self):
        return super().greet() + "!!!"


def run(name):
    return LoudGreeter(name).greet()`,
    testCases: [
      {
        input: { name: "Ada" },
        expected: "Hi, Ada!!!",
        description: "extends the parent greeting",
      },
      { input: { name: "Sam" }, expected: "Hi, Sam!!!", description: "another name" },
    ],
  },
  practice: {
    id: "py-l2-inheritance-composition-practice",
    executionMode: "single-file",
    prompt: `\`Wallet\` is provided. Finish \`Person.__init__\` so each person stores their \`name\` **and** owns
a fresh \`Wallet\` as \`self.wallet\` (composition).

\`run(50)\` should return \`50\` (the wallet's balance after adding 50).`,
    starterCode: `class Wallet:
    def __init__(self):
        self.balance = 0

    def add(self, amount):
        self.balance += amount


class Person:
    def __init__(self, name):
        # Store the name AND create a Wallet as self.wallet.
        pass


def run(amount):
    person = Person("Ada")
    person.wallet.add(amount)
    return person.wallet.balance`,
    hints: ["Set `self.name = name` first.", "Then compose in a wallet: `self.wallet = Wallet()`."],
    referenceSolution: `class Wallet:
    def __init__(self):
        self.balance = 0

    def add(self, amount):
        self.balance += amount


class Person:
    def __init__(self, name):
        self.name = name
        self.wallet = Wallet()


def run(amount):
    person = Person("Ada")
    person.wallet.add(amount)
    return person.wallet.balance`,
    testCases: [
      { input: { amount: 50 }, expected: 50, description: "add 50 to a new wallet" },
      { input: { amount: 0 }, expected: 0, description: "wallet starts at 0" },
      { input: { amount: 100 }, expected: 100, description: "add 100" },
    ],
  },
}

const dunderPropertiesLesson: PythonLesson = {
  id: "py-l2-dunder-properties",
  title: "Dunder methods & properties",
  summary: "Give classes natural behaviour with __eq__/__repr__ and computed @property values.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["dunder-methods", "eq", "property", "classes"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why give a class built-in behaviour

Print a plain object and you get \`<__main__.Point object at 0x10f3c2a90>\`. Compare two of them with \`==\` and you get \`False\` unless they are literally the same object in memory. That is useless in tests, logs, and debugging. Dunder methods let your class plug into the same protocols the built-in types use, so \`==\`, \`print()\`, \`len()\`, \`[]\`, and more behave the way callers expect.

## Dunder methods: hooking into Python's protocols

A **dunder** ("double underscore") method has a name like \`__eq__\`. Python calls it for you when the matching syntax runs. \`a == b\` calls \`a.__eq__(b)\`, and \`repr(a)\` (and \`print(a)\`, when no \`__str__\` exists) calls \`a.__repr__()\`.

\`\`\`python
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point({self.x}, {self.y})"

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return self.x == other.x and self.y == other.y

print(Point(1, 2))                 # Point(1, 2)
print(Point(1, 2) == Point(1, 2))  # True
print(Point(1, 2) == Point(3, 4))  # False
\`\`\`

By default \`==\` compares identity (the same check as \`is\`), so two freshly built points are unequal. Defining \`__eq__\` replaces that with value equality: compare the coordinates that actually matter.

## Computed attributes with @property

A \`@property\` turns a method into a read-only attribute, accessed without parentheses. Reach for it when a value is derived from other fields and you do not want to store it or recompute it by hand.

\`\`\`python
class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def area(self):
        return 3.14159 * self.radius ** 2

print(Circle(2).area)   # 12.56636
\`\`\`

\`Circle(2).area\` runs the method and hands back the number. Writing \`Circle(2).area()\` would raise \`TypeError: 'float' object is not callable\`, because \`area\` already returned a \`float\`.

### Pitfalls

- **\`__eq__\` that crashes on foreign types.** \`self.x == other.x\` raises \`AttributeError\` when \`other\` has no \`.x\` (for example \`Point(1, 2) == "hi"\`). Guard with \`isinstance\` and \`return NotImplemented\` so Python falls back to a safe \`False\` instead of blowing up.
- **Calling a property.** A \`@property\` is read like data (\`circle.area\`), never called (\`circle.area()\`).
- **Unhashable objects.** Defining \`__eq__\` sets \`__hash__\` to \`None\`, so instances can no longer be dict keys or set members. Add a matching \`__hash__\` (equal objects must hash equal) or use \`@dataclass(frozen=True)\`.

**Interview nuance:** the hash invariant says objects that compare equal must return the same \`hash()\`. That is exactly why Python drops \`__hash__\` the moment you define \`__eq__\`: keeping the old identity-based hash would let two equal points land in different buckets and quietly break \`set\` and \`dict\` lookups. If you do make a value type hashable, base both \`__eq__\` and \`__hash__\` on the same fields (here, \`(self.x, self.y)\`).`,
    demoCode: `class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def area(self):
        return 3.14159 * self.radius ** 2

print(Circle(2).area)   # 12.56636`,
  },
  apply: {
    id: "py-l2-dunder-properties-apply",
    executionMode: "single-file",
    prompt: `Implement \`Point.__eq__\` so two points are equal when **both** coordinates match.

\`run(1, 2, 1, 2)\` should return \`True\`; \`run(1, 2, 3, 4)\` should return \`False\`.`,
    starterCode: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        # True when both x and y match the other point.
        pass


def run(x1, y1, x2, y2):
    return Point(x1, y1) == Point(x2, y2)`,
    hints: [
      "Compare both coordinates: `self.x == other.x` and `self.y == other.y`.",
      "Join them with `and`: `return self.x == other.x and self.y == other.y`.",
    ],
    referenceSolution: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y


def run(x1, y1, x2, y2):
    return Point(x1, y1) == Point(x2, y2)`,
    testCases: [
      { input: { x1: 1, y1: 2, x2: 1, y2: 2 }, expected: true, description: "identical points" },
      { input: { x1: 1, y1: 2, x2: 3, y2: 4 }, expected: false, description: "different points" },
      {
        input: { x1: 0, y1: 0, x2: 0, y2: 0 },
        expected: true,
        description: "origin equals origin",
      },
      { input: { x1: 5, y1: 1, x2: 5, y2: 9 }, expected: false, description: "only x matches" },
    ],
  },
  practice: {
    id: "py-l2-dunder-properties-practice",
    executionMode: "single-file",
    prompt: `Add an \`area\` \`@property\` to \`Circle\` that returns \`π · r²\` (use \`3.14159\` for π).

\`run(2)\` should return \`12.56636\`. Access it as \`circle.area\` (no parentheses).`,
    starterCode: `class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def area(self):
        # Return 3.14159 * radius squared.
        pass


def run(radius):
    return Circle(radius).area`,
    hints: [
      "Square the radius with `self.radius ** 2`.",
      "Multiply by π: `return 3.14159 * self.radius ** 2`.",
      "Keep the `@property` line so `area` is an attribute, not a method call.",
    ],
    referenceSolution: `class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def area(self):
        return 3.14159 * self.radius ** 2


def run(radius):
    return Circle(radius).area`,
    testCases: [
      { input: { radius: 2 }, expected: 12.56636, description: "radius 2" },
      { input: { radius: 1 }, expected: 3.14159, description: "unit circle" },
      { input: { radius: 0 }, expected: 0, description: "zero radius" },
      { input: { radius: 10 }, expected: 314.159, description: "radius 10" },
    ],
  },
}

const classmethodStaticmethodLesson: PythonLesson = {
  id: "py-l2-classmethod-staticmethod",
  title: "Class methods, static methods & class attributes",
  summary:
    "Build alternative constructors with @classmethod, and know which state every instance shares.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["classmethod", "staticmethod", "class-attributes", "classes"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Three kinds of method, three kinds of first argument

Every function in a class body is one of three things, and the decorator on it decides what Python passes as the first argument.

| Written as | First argument | Reads or writes |
| --- | --- | --- |
| \`def m(self)\` | the instance | that one object's data |
| \`@classmethod def m(cls)\` | the class | data shared by every instance |
| \`@staticmethod def m()\` | nothing | only its own arguments |

\`\`\`python
class User:
    role = "member"                 # class attribute: one copy, shared

    def __init__(self, name):
        self.name = name            # instance attribute: one per object

    def greet(self):                # instance method
        return f"{self.name} ({self.role})"

    @classmethod
    def from_csv(cls, line):        # alternative constructor
        return cls(line.split(",")[0])

    @staticmethod
    def is_valid(name):             # plain helper, namespaced on the class
        return len(name) > 0

print(User.from_csv("ada,42").greet())   # ada (member)
print(User.is_valid(""))                 # False
\`\`\`

## Why @classmethod is the alternative constructor

\`__init__\` can only have one signature. Real data arrives in several shapes: a CSV line, a dict from JSON, a database row. A class method builds the object from each shape and hands the work to the single \`__init__\`.

The first argument is \`cls\`, not the literal class name, and that difference matters. \`cls(...)\` builds whatever class the call was made on, so a subclass inherits the constructor for free:

\`\`\`python
class Admin(User):
    role = "admin"

print(type(Admin.from_csv("grace,7")))   # <class '__main__.Admin'>
\`\`\`

Hard-coding \`User(...)\` inside \`from_csv\` would have returned a \`User\` even when called on \`Admin\`, silently discarding the subclass.

## The class attribute that everyone shares

A class attribute lives on the class, so every instance sees the same object. Read that as a shared default and it is useful. Mutate it and every instance changes at once.

\`\`\`csdiagram
{
  "type": "python-memory",
  "steps": [
    {
      "code": "class Cart:\\n    items = []",
      "names": { "Cart.items": "L1" },
      "objects": { "L1": { "kind": "list", "value": "[]" } },
      "note": "One list object, created once when the class body runs."
    },
    {
      "code": "a = Cart()\\nb = Cart()",
      "names": { "Cart.items": "L1", "a.items": "L1", "b.items": "L1" },
      "objects": { "L1": { "kind": "list", "value": "[]" } },
      "note": "Neither instance has its own list. Both names resolve to the class attribute."
    },
    {
      "code": "a.items.append(\\"apple\\")",
      "names": { "Cart.items": "L1", "a.items": "L1", "b.items": "L1" },
      "objects": { "L1": { "kind": "list", "value": "['apple']" } },
      "mutated": "L1",
      "note": "b.items is now ['apple'] too. There was only ever one list."
    }
  ],
  "caption": "A mutable class attribute is shared state: appending through one instance is visible from every other."
}
\`\`\`

The fix is to create the list per instance, inside \`__init__\`:

\`\`\`python
class Cart:
    def __init__(self):
        self.items = []     # a fresh list for every Cart
\`\`\`

### Pitfalls

- **Mutable class attributes.** \`items = []\` in the class body makes one list for the whole program. Use it for genuine constants (\`role = "member"\`, \`MAX_RETRIES = 3\`) and build mutable state in \`__init__\`.
- **Assignment does not mutate.** \`a.items = ["x"]\` creates a new *instance* attribute that shadows the class one, so \`b.items\` is unaffected. Only mutation (\`append\`, \`+=\` on a list) leaks across instances, which is why the bug is so easy to miss.
- **Hard-coding the class inside a classmethod.** Return \`cls(...)\`, never \`User(...)\`, or subclasses get the wrong type back.
- **Reaching for @staticmethod too often.** If it touches neither \`self\` nor \`cls\`, ask whether it wants to be a module-level function. Keep it a static method only when the class is the natural place a reader would look for it.

**Interview nuance:** "why is \`cls\` better than the class name" tests whether you understand that Python resolves attributes at call time through the instance's own class. \`cls\` is polymorphic; the literal name is not. The same reasoning explains why \`super().__init__()\` beats \`ParentClass.__init__(self)\`: both keep the inheritance chain intact instead of pinning one link in it.`,
    demoCode: `class Cart:
    items = []          # shared by every instance

a = Cart()
b = Cart()
a.items.append("apple")
print(b.items)          # ['apple'] - one list, not two`,
  },
  apply: {
    id: "py-l2-classmethod-staticmethod-apply",
    executionMode: "single-file",
    prompt: `Write a \`@classmethod\` named \`from_csv\` that builds a \`User\` from a \`"name,age"\` string and returns the user's name.

\`run("ada,36")\` should return \`"ada"\`. Build the object with \`cls\`, not \`User\`.`,
    starterCode: `class User:
    def __init__(self, name):
        self.name = name

    @classmethod
    def from_csv(cls, line):
        # Split on the comma and build a User from the first field.
        pass


def run(line):
    return User.from_csv(line).name`,
    hints: [
      '`line.split(",")` gives you a list of fields.',
      'The name is the first field: `line.split(",")[0]`.',
      'Build and return the object with `cls(...)`: `return cls(line.split(",")[0])`.',
    ],
    referenceSolution: `class User:
    def __init__(self, name):
        self.name = name

    @classmethod
    def from_csv(cls, line):
        return cls(line.split(",")[0])


def run(line):
    return User.from_csv(line).name`,
    testCases: [
      { input: { line: "ada,36" }, expected: "ada", description: "name and age" },
      { input: { line: "grace,7" }, expected: "grace", description: "another row" },
      { input: { line: "solo," }, expected: "solo", description: "empty age field" },
      { input: { line: "linus,1,extra" }, expected: "linus", description: "extra fields ignored" },
    ],
  },
  practice: {
    id: "py-l2-classmethod-staticmethod-practice",
    executionMode: "single-file",
    prompt: `Fix \`Cart\` so each cart has its own item list, then return the number of items in the second cart.

\`run("apple")\` should return \`0\`: adding to the first cart must not touch the second.`,
    starterCode: `class Cart:
    items = []      # BUG: one list shared by every cart

    # Give each cart its own list instead.


def run(item):
    first = Cart()
    second = Cart()
    first.items.append(item)
    return len(second.items)`,
    hints: [
      "A name assigned in the class body belongs to the class, so every instance shares it.",
      "Create the list per object instead, inside `__init__`.",
      "Delete the `items = []` line and add `def __init__(self): self.items = []`.",
    ],
    referenceSolution: `class Cart:
    def __init__(self):
        self.items = []


def run(item):
    first = Cart()
    second = Cart()
    first.items.append(item)
    return len(second.items)`,
    testCases: [
      { input: { item: "apple" }, expected: 0, description: "second cart stays empty" },
      { input: { item: "pear" }, expected: 0, description: "any item, still isolated" },
      { input: { item: "" }, expected: 0, description: "empty string is still one item" },
    ],
  },
}

const containerProtocolsLesson: PythonLesson = {
  id: "py-l2-container-context-protocols",
  title: "Container & context protocols",
  summary:
    "Make your class work with len(), for, in, and with by implementing the dunders they call.",
  estimatedMinutes: 13,
  difficulty: "medium",
  skills: ["dunder-methods", "iteration", "context-manager", "classes"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Syntax is a call in disguise

Python's built-in syntax does not check what type you are. It calls a method and trusts the answer. \`len(x)\` is \`x.__len__()\`. \`for v in x\` is driven by \`x.__iter__()\`. \`v in x\` tries \`x.__contains__(v)\`. Implement the method and the syntax starts working on your class, with no inheritance and no registration.

| You write | Python calls | Must return |
| --- | --- | --- |
| \`len(x)\` | \`x.__len__()\` | a non-negative \`int\` |
| \`for v in x\` | \`x.__iter__()\` | an iterator (usually via \`yield\`) |
| \`v in x\` | \`x.__contains__(v)\` | a \`bool\` |
| \`x[k]\` | \`x.__getitem__(k)\` | the element |
| \`x(...)\` | \`x.__call__(...)\` | anything |
| \`with x as y\` | \`x.__enter__()\` then \`x.__exit__(...)\` | the \`as\` value, then a falsy value |

\`\`\`python
class Deck:
    def __init__(self, cards):
        self._cards = cards

    def __len__(self):
        return len(self._cards)

    def __iter__(self):
        yield from self._cards

    def __contains__(self, card):
        return card in self._cards

deck = Deck(["A", "K", "Q"])
print(len(deck))            # 3
print("K" in deck)          # True
print([c for c in deck])    # ['A', 'K', 'Q']
\`\`\`

Three small methods and \`Deck\` now behaves like a built-in collection everywhere: comprehensions, \`sorted()\`, \`max()\`, tuple unpacking, and \`if deck:\` all work, because they are all written against these same protocols.

## Truthiness comes free, and that is a trap

\`if deck:\` has no dunder of its own by default. Python falls back to \`__len__\` and treats zero as false. That is convenient until it is not:

\`\`\`python
empty = Deck([])
if empty:
    print("has cards")      # never runs, because len(empty) == 0
\`\`\`

If your object should always be truthy regardless of size, say so explicitly with \`__bool__\`. Otherwise an empty-but-valid object silently behaves like \`None\` at every \`if\`.

## Context managers: guaranteeing the cleanup

\`with\` exists so that cleanup runs even when the body raises. \`__enter__\` sets up and returns the value bound by \`as\`; \`__exit__\` tears down and receives the exception, if any.

\`\`\`python
class Timer:
    def __enter__(self):
        self.calls = []
        return self                 # this is what "as t" binds

    def __exit__(self, exc_type, exc, tb):
        self.calls.append("closed")
        return False                # do not swallow exceptions

with Timer() as t:
    t.calls.append("working")
print(t.calls)                      # ['working', 'closed']
\`\`\`

\`__exit__\` receives three arguments describing the exception (or three \`None\` values on a clean exit). Its **return value is a decision**: falsy lets the exception propagate, truthy swallows it.

\`\`\`csdiagram
{
  "type": "call-stack",
  "title": "with Timer() as t:  (body raises)",
  "steps": [
    { "stack": ["main"], "note": "About to enter the with statement." },
    { "stack": ["main", "Timer.__enter__"], "note": "Setup runs; its return value is bound to t." },
    { "stack": ["main", "with body"], "note": "The body runs and raises ValueError." },
    { "stack": ["main", "Timer.__exit__"], "note": "Called anyway, with the exception details." },
    { "stack": ["main"], "returning": "False", "note": "Falsy return: the ValueError keeps propagating." }
  ],
  "caption": "__exit__ runs whether the body succeeds or raises. Returning False re-raises; returning True would silently swallow the error."
}
\`\`\`

### Pitfalls

- **Returning \`True\` from \`__exit__\` by accident.** A bare \`return True\`, or ending with a value that happens to be truthy, silently swallows every exception in the block. Return \`False\` (or nothing at all, since \`None\` is falsy) unless suppressing is the explicit intent.
- **\`__len__\` returning a non-integer.** \`len()\` raises \`TypeError\` if you hand back a float or a string, even when the number is right.
- **Forgetting that \`__len__\` drives truthiness.** An object with \`__len__\` returning \`0\` is falsy. Add \`__bool__\` if that is wrong for your type.
- **Building a list just to iterate.** \`__iter__\` should \`yield\` rather than \`return list(...)\` when the source is large: yielding streams one item at a time instead of materialising the whole collection.

**Interview nuance:** this is what "duck typing" concretely means. Python never asks whether \`Deck\` inherits from a collection base class; it asks whether \`Deck\` answers \`__len__\`. That is why \`collections.abc\` classes are mostly optional conveniences rather than requirements, and why a mock object that implements the same three dunders is indistinguishable from the real collection at every call site.`,
    demoCode: `class Deck:
    def __init__(self, cards):
        self._cards = cards

    def __len__(self):
        return len(self._cards)

    def __iter__(self):
        yield from self._cards


deck = Deck(["A", "K", "Q"])
print(len(deck))            # 3
print([c for c in deck])    # ['A', 'K', 'Q']`,
  },
  apply: {
    id: "py-l2-container-context-protocols-apply",
    executionMode: "single-file",
    prompt: `Implement \`__len__\` and \`__contains__\` on \`Deck\` so \`len(deck)\` counts the cards and \`card in deck\` works.

\`run(["A", "K"], "K")\` should return \`[2, True]\`.`,
    starterCode: `class Deck:
    def __init__(self, cards):
        self._cards = cards

    def __len__(self):
        # Return how many cards the deck holds.
        pass

    def __contains__(self, card):
        # Return True when the card is in the deck.
        pass


def run(cards, card):
    deck = Deck(cards)
    return [len(deck), card in deck]`,
    hints: [
      "`self._cards` is a plain list, so the built-ins already work on it.",
      "`__len__` can delegate: `return len(self._cards)`.",
      "`__contains__` can delegate too: `return card in self._cards`.",
    ],
    referenceSolution: `class Deck:
    def __init__(self, cards):
        self._cards = cards

    def __len__(self):
        return len(self._cards)

    def __contains__(self, card):
        return card in self._cards


def run(cards, card):
    deck = Deck(cards)
    return [len(deck), card in deck]`,
    testCases: [
      { input: { cards: ["A", "K"], card: "K" }, expected: [2, true], description: "card present" },
      { input: { cards: ["A", "K"], card: "Q" }, expected: [2, false], description: "card absent" },
      { input: { cards: [], card: "A" }, expected: [0, false], description: "empty deck" },
      {
        input: { cards: ["A", "A", "A"], card: "A" },
        expected: [3, true],
        description: "duplicates counted",
      },
    ],
  },
  practice: {
    id: "py-l2-container-context-protocols-practice",
    executionMode: "single-file",
    prompt: `Write a \`Session\` context manager whose \`__enter__\` returns the object and whose \`__exit__\` appends \`"closed"\` to \`self.log\`.

\`run("query")\` should return \`["opened", "query", "closed"]\`, with \`"closed"\` appended even though the body runs first.`,
    starterCode: `class Session:
    def __init__(self):
        self.log = []

    def __enter__(self):
        self.log.append("opened")
        # Return the object so "as s" binds to it.
        pass

    def __exit__(self, exc_type, exc, tb):
        # Append "closed", then let any exception propagate.
        pass


def run(action):
    session = Session()
    with session as s:
        s.log.append(action)
    return session.log`,
    hints: [
      "`__enter__` must return whatever `as s` should bind to. Here that is the session itself.",
      "`return self` at the end of `__enter__`.",
      'In `__exit__`, `self.log.append("closed")` then `return False` so exceptions still propagate.',
    ],
    referenceSolution: `class Session:
    def __init__(self):
        self.log = []

    def __enter__(self):
        self.log.append("opened")
        return self

    def __exit__(self, exc_type, exc, tb):
        self.log.append("closed")
        return False


def run(action):
    session = Session()
    with session as s:
        s.log.append(action)
    return session.log`,
    testCases: [
      {
        input: { action: "query" },
        expected: ["opened", "query", "closed"],
        description: "cleanup runs after the body",
      },
      {
        input: { action: "write" },
        expected: ["opened", "write", "closed"],
        description: "any action, same ordering",
      },
      {
        input: { action: "" },
        expected: ["opened", "", "closed"],
        description: "empty action still logged",
      },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L2-M4: Data Modeling
// ───────────────────────────────────────────────────────────────────────────

const dataclassesEnumsLesson: PythonLesson = {
  id: "py-l2-dataclasses-enums",
  title: "Dataclasses, enums & typing basics",
  summary: "Model data with @dataclass, name fixed choices with Enum, and add type hints.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["dataclasses", "enums", "type-hints", "data-modeling"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Model your data, don't hand-write it

Real backends move records around: a \`User\`, an \`Order\`, an API payload. If you write those as plain classes, you hand-write an \`__init__\` to store fields, a \`__repr__\` so logs are readable, and an \`__eq__\` so two equal records compare equal. That is boilerplate you will get subtly wrong (forget one field in \`__eq__\` and dedup silently breaks). \`@dataclass\` generates all three from a typed field list, so the class is the schema.

### Dataclasses: fields become the constructor

Each \`name: type\` line under a \`@dataclass\` is a **field**. The decorator reads those fields and writes \`__init__\`, \`__repr__\`, and \`__eq__\` for you, in field order.

\`\`\`python
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

print(Point(1, 2))                  # Point(x=1, y=2)
print(Point(1, 2) == Point(1, 2))   # True
\`\`\`

The generated \`__eq__\` compares instances field by field, which is exactly what the Apply exercise leans on: two points built from the same coordinates are equal because their \`(x, y)\` tuples are equal.

### Type hints describe intent, they do not enforce it

Annotations like \`x: int\` are metadata. Python does not check them at runtime; passing \`Point("a", "b")\` still constructs an object. Their value is for readers and tools like \`mypy\` or your editor, which flag mismatches before you run.

\`\`\`python
def total(prices: list[int]) -> int:
    return sum(prices)

note: int | None = None   # int or None; int | None is the modern Optional
\`\`\`

### Enums: name a fixed set of choices

When a field has a small closed set of valid values (a status, a color, a role), a bare string invites typos like \`"gren"\`. An \`Enum\` names each choice once. Members carry a \`.value\`, and you can look one up by name.

\`\`\`python
from enum import Enum

class Color(Enum):
    RED = "red"
    GREEN = "green"
    BLUE = "blue"

print(Color.RED.value)   # red
print(Color["RED"])      # Color.RED   (look up by name)
\`\`\`

That name lookup is what the Practice driver does: \`Color[name].value\` turns \`"RED"\` into \`"red"\`.

### Pitfall: mutable default fields

You cannot give a dataclass field a mutable default like \`[]\` or \`{}\` directly. Python evaluates the default once, so every instance would share one list. The dataclass machinery blocks it outright:

\`\`\`python
from dataclasses import dataclass, field

@dataclass
class Cart:
    items: list = []            # ValueError at class creation time

@dataclass
class Cart:
    items: list = field(default_factory=list)   # correct: fresh list per instance
\`\`\`

Use \`field(default_factory=list)\` (or \`dict\`, \`set\`) so each instance gets its own container.

### Validating and deriving with \`__post_init__\`

The generated \`__init__\` only assigns fields, so there is no obvious place to check them or to compute
a value from the others. \`__post_init__\` is that place: the dataclass calls it immediately after the
constructor finishes.

\`\`\`python
from dataclasses import dataclass, field

@dataclass
class Order:
    unit_price: float
    quantity: int
    total: float = field(init=False)     # not a constructor argument

    def __post_init__(self):
        if self.quantity < 1:
            raise ValueError("quantity must be at least 1")
        self.total = self.unit_price * self.quantity

print(Order(2.5, 4))       # Order(unit_price=2.5, quantity=4, total=10.0)
print(Order(2.5, 0))       # ValueError: quantity must be at least 1
\`\`\`

Two jobs, both worth naming. **Validation** keeps an invalid object from ever existing, which is far
easier to reason about than checking validity at each use site. **Derived fields** pair
\`__post_init__\` with \`field(init=False)\`, so \`total\` is computed rather than passed in and cannot
drift out of sync with the values it came from.

One trap: under \`frozen=True\` ordinary assignment raises \`FrozenInstanceError\`, so a derived field
has to be set through the back door:

\`\`\`python
@dataclass(frozen=True)
class Doubled:
    x: int
    doubled: int = field(init=False)

    def __post_init__(self):
        object.__setattr__(self, "doubled", self.x * 2)   # frozen blocks self.doubled = ...

print(Doubled(21))         # Doubled(x=21, doubled=42)
\`\`\`

**Interview nuance:** the generated \`__eq__\` compares field values only when the other object is the *same* dataclass type; against anything else it returns \`NotImplemented\`, so \`Point(1, 2) == (1, 2)\` is \`False\`, not \`True\`. Equality here means "same type and same fields," which is why dataclasses are safe to put in a \`set\` or use as dict keys once you add \`frozen=True\` (that also generates \`__hash__\`).`,
    demoCode: `from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

print(Point(1, 2))                  # Point(x=1, y=2)
print(Point(1, 2) == Point(1, 2))   # True`,
  },
  apply: {
    id: "py-l2-dataclasses-enums-apply",
    executionMode: "single-file",
    prompt: `Make \`Point\` a \`@dataclass\` with two fields, \`x: int\` and \`y: int\`.

Dataclasses generate \`__init__\` and \`__eq__\` for you, so two points with the same coordinates
compare equal. \`run(1, 2, 1, 2)\` should return \`True\`.`,
    starterCode: `from dataclasses import dataclass


# Make Point a dataclass with x: int and y: int.
class Point:
    pass


def run(x1, y1, x2, y2):
    return Point(x1, y1) == Point(x2, y2)`,
    hints: [
      "Add the `@dataclass` decorator on the line above `class Point:`.",
      "Replace the body with two typed fields: `x: int` and `y: int`.",
      "Remove the `pass` once the fields are in place.",
    ],
    referenceSolution: `from dataclasses import dataclass


@dataclass
class Point:
    x: int
    y: int


def run(x1, y1, x2, y2):
    return Point(x1, y1) == Point(x2, y2)`,
    testCases: [
      { input: { x1: 1, y1: 2, x2: 1, y2: 2 }, expected: true, description: "equal points" },
      { input: { x1: 1, y1: 2, x2: 3, y2: 4 }, expected: false, description: "different points" },
      { input: { x1: 0, y1: 0, x2: 0, y2: 0 }, expected: true, description: "origins are equal" },
    ],
  },
  practice: {
    id: "py-l2-dataclasses-enums-practice",
    executionMode: "single-file",
    prompt: `Define a \`Color\` enum with three members: \`RED = "red"\`, \`GREEN = "green"\`, and
\`BLUE = "blue"\`.

The driver looks up \`Color[name]\` and returns its \`.value\`, so \`run("RED")\` should return
\`"red"\`.`,
    starterCode: `from enum import Enum


# Define a Color enum: RED = "red", GREEN = "green", BLUE = "blue".
class Color(Enum):
    pass


def run(name):
    return Color[name].value`,
    hints: [
      'Each member is `NAME = value`, e.g. `RED = "red"`.',
      "List all three members and remove the `pass`.",
      "`Color[name]` looks a member up by name; `.value` reads its string.",
    ],
    referenceSolution: `from enum import Enum


class Color(Enum):
    RED = "red"
    GREEN = "green"
    BLUE = "blue"


def run(name):
    return Color[name].value`,
    testCases: [
      { input: { name: "RED" }, expected: "red", description: "red member" },
      { input: { name: "GREEN" }, expected: "green", description: "green member" },
      { input: { name: "BLUE" }, expected: "blue", description: "blue member" },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L2-M5: Errors, Files & Modules
// (Single-file mode has no filesystem, so JSON/CSV are parsed from in-memory strings;
//  real `with open()` file work arrives in Level 3's workspace lessons.)
// ───────────────────────────────────────────────────────────────────────────

const exceptionsLesson: PythonLesson = {
  id: "py-l2-exceptions",
  title: "try / except / finally & custom exceptions",
  summary: "Handle errors cleanly, raise your own, and define a custom exception.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["exceptions", "try-except", "raise", "custom-exceptions"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why catching errors matters

In real services the input is never clean: a user posts \`b=0\`, a config file is missing, an upstream API returns text where you expected a number. When one of those operations raises and nothing catches it, the exception unwinds up the call stack and the whole request (or batch job) dies. Exception handling is how you draw a boundary around risky code: this line might fail, and here is exactly what I do when it does. A pipeline that skips one malformed row is useful. One that crashes on row 3 of 10 million rows is not.

## The mental model

When a statement raises, Python stops the current block immediately and unwinds outward looking for a matching handler. A \`try\`/\`except\` installs that handler for a specific region:

\`\`\`python
try:
    result = a / b        # if this raises...
except ZeroDivisionError:
    result = None         # ...jump here, but only for this error type
\`\`\`

\`except ZeroDivisionError\` matches that class and its subclasses. Any other error (a \`TypeError\`, say) is not caught here and keeps propagating. Catch the specific exception you expect, not everything. That is exactly what \`safe_divide\` in the demo below does: it returns \`5.0\` for \`safe_divide(10, 2)\` and \`None\` for \`safe_divide(5, 0)\`, and it never hides an unrelated bug.

### \`finally\` always runs

A \`finally\` block runs whether the \`try\` succeeded, raised, or returned early. Use it for cleanup that must happen no matter what, like closing a file or releasing a lock:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Block", "Runs when", "Typical use"],
  "rows": [
    ["try", "always, first", "the operation that might fail"],
    ["except", "only if a matching exception was raised", "handle that specific failure"],
    ["else", "only if NO exception was raised", "the follow-up work that must not be inside try"],
    ["finally", "always, last, even on return or re-raise", "cleanup: close the file, release the lock"]
  ],
  "highlightCols": ["Runs when"],
  "caption": "else is the block people forget, and it exists to keep the try body narrow: code that must not be guarded goes in else, so an exception raised there is not caught by your own except."
}
\`\`\`

\`\`\`python
try:
    risky()
finally:
    cleanup()             # runs on success and on failure
\`\`\`

### Raising your own

Use \`raise\` to signal a failure yourself, and subclass \`Exception\` to give that failure a name so callers can catch exactly your error and nothing else:

\`\`\`python
class TooSmallError(Exception):
    pass

def validate(n):
    try:
        if n < 10:
            raise TooSmallError()
        return "ok"
    except TooSmallError:
        return "too small"

print(validate(5))    # too small
print(validate(10))   # ok
\`\`\`

## Pitfalls

A bare \`except:\` (or \`except Exception:\`) catches too much. If you wrap \`a / b\` in \`except:\` and later mistype a variable name, the resulting \`NameError\` gets swallowed and you silently return \`None\`, hiding a real bug. Catch the narrow type instead. A second trap: a \`return\` inside \`finally\` overrides any return value or exception from the \`try\` and discards it silently, so do not \`return\` from \`finally\`.

**Interview nuance:** Python idiom favors EAFP ("easier to ask forgiveness than permission") over LBYL ("look before you leap"). Rather than checking \`if b != 0:\` before dividing, you try the division and catch \`ZeroDivisionError\`. This is not just style. The check-first approach has a race window in concurrent code (a shared value can change between the check and the use), and in CPython entering a \`try\` block costs nothing on the non-error path, so exception handling is effectively free when no error is raised. Interviewers watch for whether you catch a specific exception type or reach for a bare \`except\`.`,
    demoCode: `def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None

print(safe_divide(10, 2))   # 5.0
print(safe_divide(5, 0))    # None`,
  },
  apply: {
    id: "py-l2-exceptions-apply",
    executionMode: "single-file",
    prompt: `Implement \`safe_divide(a, b)\`: return \`a / b\`, but if \`b\` is \`0\` (a \`ZeroDivisionError\`),
return \`None\` instead of crashing.`,
    starterCode: `def safe_divide(a, b):
    # Return a / b, or None if b is 0.
    pass`,
    hints: [
      "Wrap `a / b` in a `try:` block.",
      "Catch the specific error: `except ZeroDivisionError:`.",
      "Return `None` from the except branch.",
    ],
    referenceSolution: `def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None`,
    testCases: [
      { input: { a: 10, b: 2 }, expected: 5, description: "normal division" },
      { input: { a: 5, b: 0 }, expected: null, description: "divide by zero -> None" },
      { input: { a: 9, b: 3 }, expected: 3, description: "another division" },
      { input: { a: 7, b: 0 }, expected: null, description: "zero again -> None" },
    ],
  },
  practice: {
    id: "py-l2-exceptions-practice",
    executionMode: "single-file",
    prompt: `Define a custom \`TooSmallError(Exception)\`. In \`validate(n)\`, **raise** it when \`n < 10\`,
**catch** it, and return \`"too small"\`; otherwise return \`"ok"\`.

\`validate(5)\` returns \`"too small"\`; \`validate(10)\` returns \`"ok"\`.`,
    starterCode: `class TooSmallError(Exception):
    pass


def validate(n):
    # Raise TooSmallError when n < 10, catch it, return "too small"; else "ok".
    pass`,
    hints: [
      'Inside a `try:`, `raise TooSmallError()` when `n < 10`, otherwise `return "ok"`.',
      'Add `except TooSmallError:` that returns "too small".',
    ],
    referenceSolution: `class TooSmallError(Exception):
    pass


def validate(n):
    try:
        if n < 10:
            raise TooSmallError()
        return "ok"
    except TooSmallError:
        return "too small"`,
    testCases: [
      { input: { n: 5 }, expected: "too small", description: "below the threshold" },
      { input: { n: 10 }, expected: "ok", description: "exactly at the threshold" },
      { input: { n: 100 }, expected: "ok", description: "well above" },
      { input: { n: 0 }, expected: "too small", description: "zero is too small" },
    ],
  },
}

const filesJsonCsvLesson: PythonLesson = {
  id: "py-l2-files-json-csv",
  title: "Context managers, JSON & CSV",
  summary: "Read structured data with the with-statement, json, and csv.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["context-managers", "json", "csv", "parsing"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Reading structured data safely

Almost every backend or pipeline job starts the same way: pull in text from a file or an API, turn it into Python objects, and do work. Two things go wrong constantly. First, a file handle gets leaked because someone forgot to close it, and under load the process runs out of descriptors and crashes. Second, the parse is naive, so a comma inside a quoted field or a number that arrives as text silently corrupts every downstream row. The standard library fixes both, and interviewers expect you to reach for it instead of hand-rolling.

### Context managers guarantee cleanup

\`with\` opens a resource and closes it when the block exits, even if an exception is raised partway through:

\`\`\`python
with open("data.txt") as fh:
    text = fh.read()
# fh is closed here, exception or not
\`\`\`

\`open\` returns a context manager: the \`with\` statement calls its setup on entry and its cleanup (\`fh.close()\`) on exit. This is the idiom for anything that needs releasing (files, sockets, locks, DB connections). The raw data in these exercises is already handed to you as a string, so you go straight to parsing.


The second argument to \`open\` is the mode, and picking the wrong one is how files get erased:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Mode", "If the file exists", "If it does not", "Writes go"],
  "rows": [
    ["r (the default)", "opened for reading", "FileNotFoundError", "nowhere; reading only"],
    ["w", "TRUNCATED to empty immediately", "created", "from the start"],
    ["a", "opened, contents kept", "created", "always appended to the end"],
    ["x", "FileExistsError", "created", "from the start"],
    ["r+", "opened for read and write", "FileNotFoundError", "from the start, overwriting in place"]
  ],
  "highlightCols": ["If the file exists"],
  "caption": "The w row is the one to remember: opening for write destroys the contents before you have written anything, so a crash straight after open still loses the file. Use a when you mean to add, and x when creating something that must not already exist."
}
\`\`\`

### JSON: text to Python objects and back

\`json.loads\` parses a JSON **string** into Python values; \`json.dumps\` serializes back to a string. The type mapping is fixed: JSON object to \`dict\`, array to \`list\`, string to \`str\`, number to \`int\` or \`float\`, \`true\`/\`false\` to \`bool\`, \`null\` to \`None\`.

\`\`\`python
import json

data = json.loads('{"name": "Ada", "age": 30}')
data["name"]   # "Ada" (a str)
data["age"]    # 30    (an int, not "30")
\`\`\`

Note \`data["age"]\` is a real integer, so you can do arithmetic on it directly. Use \`json.load\`/\`json.dump\` (no \`s\`) when the source or target is a file object rather than a string.

### CSV: rows of strings

\`csv.reader\` yields one list per row and handles quoted fields and embedded commas correctly. It reads from any line-yielding iterable, so wrap a string in \`io.StringIO\` to treat it like a file:

\`\`\`python
import csv, io

rows = list(csv.reader(io.StringIO("a,b\\nc,d")))
# [["a", "b"], ["c", "d"]]
\`\`\`

Every CSV value comes back as a \`str\`. There is no type inference: the number \`30\` in a CSV cell arrives as \`"30"\`, and you must call \`int()\` yourself.

### Pitfalls

- **Do not \`split(",")\` a CSV line.** For \`'"a,b",c'\`, \`str.split(",")\` returns three broken pieces, while \`csv.reader\` correctly returns \`["a,b", "c"]\` because it respects the quotes.
- **\`loads\` vs \`load\`.** Pass a string to \`json.loads\` and a file object to \`json.load\`. Mixing them raises \`TypeError\` or \`AttributeError\`.
- **When reading a real CSV file, open it with \`newline=""\`** so \`csv\` handles line endings itself: \`open(path, newline="")\`.

**Interview nuance:** JSON round-tripping is lossy for Python types. \`json.dumps((1, 2))\` produces the array \`"[1, 2]"\`, and \`json.loads\` of that gives back the list \`[1, 2]\`, not the original tuple. JSON has no concept of tuples, sets, or non-string dict keys, so tuples become lists, sets are unserializable, and integer keys are coerced to strings. If your code depends on getting the exact Python type back after a serialize-then-parse cycle, it will break.`,
    demoCode: `import json

data = json.loads('{"name": "Ada", "age": 30}')
print(data["name"])   # Ada
print(data["age"])    # 30`,
  },
  apply: {
    id: "py-l2-files-json-csv-apply",
    executionMode: "single-file",
    prompt: `Implement \`get_field(raw, field)\`: parse the JSON string \`raw\` and return the value stored at
\`field\`.

For \`raw = '{"name": "Ada", "age": 30}'\` and \`field = "name"\`, return \`"Ada"\`.`,
    starterCode: `import json


def get_field(raw, field):
    # Parse the JSON string and return raw[field].
    pass`,
    hints: [
      "Turn the text into a dict with `json.loads(raw)`.",
      "Then index it: `data[field]`.",
      "`return json.loads(raw)[field]`.",
    ],
    referenceSolution: `import json


def get_field(raw, field):
    return json.loads(raw)[field]`,
    testCases: [
      {
        input: { raw: '{"name": "Ada", "age": 30}', field: "name" },
        expected: "Ada",
        description: "a string field",
      },
      {
        input: { raw: '{"name": "Ada", "age": 30}', field: "age" },
        expected: 30,
        description: "a numeric field",
      },
      {
        input: { raw: '{"city": "Paris"}', field: "city" },
        expected: "Paris",
        description: "a single field",
      },
    ],
  },
  practice: {
    id: "py-l2-files-json-csv-practice",
    executionMode: "single-file",
    prompt: `Implement \`parse_csv(text)\`: parse the CSV string \`text\` into a list of rows, where each row
is a list of its string values.

For \`"a,b\\nc,d"\` return \`[["a", "b"], ["c", "d"]]\`. Use \`csv.reader\` over an \`io.StringIO\`.`,
    starterCode: `import csv
import io


def parse_csv(text):
    # Return a list of rows (each a list of strings) parsed from the CSV text.
    pass`,
    hints: [
      "Wrap the string so it reads like a file: `io.StringIO(text)`.",
      "Build a reader: `csv.reader(io.StringIO(text))`.",
      "Materialise the rows: `return [row for row in csv.reader(io.StringIO(text))]`.",
    ],
    referenceSolution: `import csv
import io


def parse_csv(text):
    return [row for row in csv.reader(io.StringIO(text))]`,
    testCases: [
      {
        input: { text: "a,b\nc,d" },
        expected: [
          ["a", "b"],
          ["c", "d"],
        ],
        description: "two rows of two",
      },
      {
        input: { text: "name,age\nAda,30" },
        expected: [
          ["name", "age"],
          ["Ada", "30"],
        ],
        description: "header plus a row (values stay strings)",
      },
      { input: { text: "1,2,3" }, expected: [["1", "2", "3"]], description: "a single row" },
    ],
  },
}

const modulesLesson: PythonLesson = {
  id: "py-l2-modules",
  title: "Modules, imports & the standard library",
  summary: "Organise code into modules and reach for Python's batteries-included stdlib.",
  estimatedMinutes: 11,
  difficulty: "medium",
  skills: ["modules", "imports", "standard-library", "collections"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why code lives in modules

A 2000-line file is where bugs hide. Real projects split logic across many \`.py\` files so each one has a single job, and any file that has been imported once is cached in \`sys.modules\` so the second \`import\` is nearly free. Just as important: Python ships a huge **standard library**, so before you write a character counter or a GCD loop by hand, check whether someone already wrote, tested, and optimized it in C for you. Interviewers notice when you reach for \`collections\` instead of reinventing it.

### A module is just a \`.py\` file

Every \`.py\` file is a module, and \`import\` runs it once and binds its names so you can use them:

\`\`\`python
import math                     # names live under math.*
math.gcd(12, 8)                 # 4

from math import sqrt           # pull one name into your file
sqrt(9)                         # 3.0

from collections import Counter # a name from the stdlib collections module
\`\`\`

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Import form", "What lands in your namespace", "How you call it", "Trade-off"],
  "rows": [
    ["import math", "the name math", "math.sqrt(9)", "clear origin, slightly longer to type"],
    ["from math import sqrt", "the name sqrt", "sqrt(9)", "short, but the reader cannot see where it came from"],
    ["import numpy as np", "the name np", "np.array(...)", "a community alias; only use well-known ones"],
    ["from math import *", "every public name in math", "sqrt(9)", "avoid: it can silently shadow your own names"]
  ],
  "highlightCols": ["What lands in your namespace"],
  "caption": "Every form binds exactly what the highlighted column says and nothing more. That is why the star import is discouraged: you cannot tell by reading the line which names it just claimed, so a later stdlib addition can quietly shadow a variable of yours."
}
\`\`\`

\`import math\` keeps names namespaced (\`math.gcd\`), which is safest. \`from math import sqrt\` copies just \`sqrt\` into your file, which is shorter but risks a name clash. Avoid \`from math import *\`: it dumps every name in and makes it impossible to tell where a function came from.

### Batteries included: \`Counter\` and \`math\`

\`Counter\` is a \`dict\` subclass that tallies how often each item appears. The demo below builds one from a string:

\`\`\`python
from collections import Counter

tally = Counter("aabbbc")
print(tally)                  # Counter({'b': 3, 'a': 2, 'c': 1})
print(tally.most_common(1))   # [('b', 3)]
\`\`\`

\`most_common(k)\` returns the top \`k\` items as \`(item, count)\` pairs, already sorted from most to least frequent. That is exactly what the Apply exercise needs: \`Counter(text).most_common(1)[0][0]\` is the single most frequent character. For the Practice exercise, \`math.gcd(a, b)\` returns the greatest common divisor with no loop of your own: \`math.gcd(12, 8)\` is \`4\`.

### Pitfall: do not name your file after a stdlib module

If you save your own file as \`collections.py\`, your file shadows the real one, and \`import collections\` imports *your* file. You get a confusing \`ImportError\` or \`AttributeError\` on names that clearly exist. The fix: never name a script after a stdlib module you import, and delete any stray \`.pyc\` files or \`__pycache__\` folders left behind. A related trap is mixing import styles: after \`import math\` alone, writing \`gcd(12, 8)\` raises \`NameError\`, because the name lives at \`math.gcd\`, not in your file.

**Interview nuance:** \`most_common\` is deterministic even on ties. When two items share the same count, they come back in the order first encountered while building the \`Counter\` (guaranteed since Python 3.7). So \`Counter("abcabx").most_common(1)\` returns \`[('a', 2)]\`, not \`[('b', 2)]\`, because \`a\` was seen first. If an interviewer asks "what if two characters tie for most frequent?", the honest answer is that your code returns the first one to reach that count, and if the spec needs a different tiebreak (say, alphabetical) you must sort explicitly rather than trust \`most_common\`.`,
    demoCode: `from collections import Counter

tally = Counter("aabbbc")
print(tally)                  # Counter({'b': 3, 'a': 2, 'c': 1})
print(tally.most_common(1))   # [('b', 3)]`,
  },
  apply: {
    id: "py-l2-modules-apply",
    executionMode: "single-file",
    prompt: `Implement \`most_common_char(text)\`: return the character that appears most often in \`text\`.

Use \`collections.Counter\`. For \`"aabbbc"\` return \`"b"\`.`,
    starterCode: `from collections import Counter


def most_common_char(text):
    # Return the single most common character in text.
    pass`,
    hints: [
      "`Counter(text)` tallies each character.",
      "`.most_common(1)` returns `[(char, count)]`, a list with one pair.",
      "Reach into it: `Counter(text).most_common(1)[0][0]`.",
    ],
    referenceSolution: `from collections import Counter


def most_common_char(text):
    return Counter(text).most_common(1)[0][0]`,
    testCases: [
      { input: { text: "aabbbc" }, expected: "b", description: "b appears three times" },
      { input: { text: "hello" }, expected: "l", description: "l appears twice" },
      { input: { text: "aaa" }, expected: "a", description: "all the same" },
    ],
  },
  practice: {
    id: "py-l2-modules-practice",
    executionMode: "single-file",
    prompt: `Implement \`gcd_of(a, b)\`: return the greatest common divisor of \`a\` and \`b\`.

Use \`math.gcd\` from the standard library. \`gcd_of(12, 8)\` is \`4\`.`,
    starterCode: `import math


def gcd_of(a, b):
    # Return the greatest common divisor using math.gcd.
    pass`,
    hints: ["The standard library already has this: `math.gcd(a, b)`.", "`return math.gcd(a, b)`."],
    referenceSolution: `import math


def gcd_of(a, b):
    return math.gcd(a, b)`,
    testCases: [
      { input: { a: 12, b: 8 }, expected: 4, description: "gcd(12, 8)" },
      { input: { a: 17, b: 5 }, expected: 1, description: "coprime numbers" },
      { input: { a: 100, b: 25 }, expected: 25, description: "one divides the other" },
      { input: { a: 0, b: 5 }, expected: 5, description: "gcd with zero" },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L2-M6: Standard Library Toolkit  (gap-fill: see CURRICULUM-GAP-ANALYSIS.md)
// Regular expressions and specialized collections: high-use stdlib the original
// tree named but never taught directly.
// ───────────────────────────────────────────────────────────────────────────

const regexLesson: PythonLesson = {
  id: "py-l2-regex",
  title: "Pattern-matching text with re",
  summary: "Find, extract, and replace text patterns with regular expressions.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["regex", "re", "findall", "sub"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Text patterns with \`re\`

Raw text arrives messy: log lines like \`"order 12, item 345"\`, user-typed phone numbers, IDs buried in free-form comments. A **regular expression** (regex) is a compact pattern language for "text that looks like this," and Python's \`re\` module runs those patterns. When a data engineer needs to pull every order ID out of a million log lines, or reject rows whose \`zip_code\` field is not five digits, regex does it in one pass instead of a hand-written character loop.

### Write patterns as raw strings

Always write patterns as raw strings (\`r"..."\`). Regex leans on the backslash (\`\\d\`, \`\\w\`, \`\\s\`), and in a normal Python string the backslash is an escape character. \`r"\\d"\` is the two characters backslash-\`d\`, exactly what the regex engine wants; a plain \`"\\d"\` is fragile because \`\\d\` is not a valid string escape, and in Python 3.12 and later it triggers a \`SyntaxWarning\`.

### The pieces you will use most

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Pattern", "Matches", "Note"],
  "rows": [
    ["\\\\d", "one digit, 0 to 9", "\\\\D is the negation: one non-digit"],
    ["\\\\w", "one letter, digit, or underscore", "\\\\W negates it"],
    ["\\\\s", "one whitespace character", "space, tab, or newline"],
    [".", "any single character", "except a newline, unless re.DOTALL"],
    ["+", "one or more of what precedes it", "greedy: use +? to take as few as possible"],
    ["*", "zero or more of what precedes it", "can match nothing at all"],
    ["[abc]", "any single one of a, b, or c", "[^abc] means any character EXCEPT those"],
    ["( )", "a capture group", "its contents come back from .group(1)"]
  ],
  "highlightCols": ["Pattern"],
  "caption": "Two rows quietly cause most regex surprises. * can match zero characters, so a pattern built only from * always succeeds without consuming anything, and + is greedy by default, so it runs to the LAST possible match rather than the first."
}
\`\`\`

### The three workhorse functions

\`\`\`python
import re

re.findall(r"\\d+", "a1 b22")   # ['1', '22']  every match, as a list
re.search(r"\\d+", "abc7")       # a Match at '7', or None if nothing matches
re.sub(r"\\d", "#", "a1b2")      # 'a#b#'  replace every match
\`\`\`

\`re.findall\` returns a **list** of every non-overlapping match, left to right. That is exactly the Apply task: \`re.findall(r"\\d+", "a1b22")\` gives \`["1", "22"]\`, and \`[]\` when there are no digits. \`re.sub(pattern, replacement, text)\` swaps every match for the replacement string, which is the Practice task: \`re.sub(r"\\d", "#", "a1b2")\` gives \`"a#b#"\`.

### Pitfalls

**\`\\d\` matches one digit; \`\\d+\` matches a whole run.** \`re.findall(r"\\d", "a1b22")\` returns \`['1', '2', '2']\` (three separate digits), while \`re.findall(r"\\d+", "a1b22")\` returns \`['1', '22']\`. Reach for \`+\` when you want whole numbers, and drop it when you want single characters (as in redaction, where replacing each digit one at a time is fine).

**A capture group changes what \`findall\` returns.** With no group it returns the full match; with one group it returns only that group; with several it returns tuples:

\`\`\`python
re.findall(r"\\w+@\\w+", "a@x b@y")     # ['a@x', 'b@y']
re.findall(r"(\\w+)@(\\w+)", "a@x b@y") # [('a', 'x'), ('b', 'y')]
\`\`\`

So do not wrap your whole pattern in \`()\` out of habit; it silently reshapes the result.

**Interview nuance:** quantifiers are **greedy** by default. \`.*\` matches as much as it can, then backtracks. \`re.findall(r"<.*>", "<a><b>")\` returns \`['<a><b>']\`, not the two tags you probably wanted. Add \`?\` to make it lazy: \`re.findall(r"<.*?>", "<a><b>")\` returns \`['<a>', '<b>']\`. Interviewers use this to check whether you understand that the engine explores text by backtracking, which is also why a careless pattern over adversarial input can blow up to quadratic time.`,
    demoCode: `import re
print(re.findall(r"\\d+", "order 12, item 345"))   # ['12', '345']
print(re.sub(r"\\d", "#", "PIN 4021"))             # 'PIN ####'`,
  },
  apply: {
    id: "py-l2-regex-apply",
    executionMode: "single-file",
    prompt: `Implement \`find_numbers(text)\`: return a list of every run of digits in \`text\`, in order, using
\`re.findall\`.

For \`"a1b22"\` return \`["1", "22"]\`. If there are no digits, return \`[]\`.`,
    starterCode: `import re

def find_numbers(text):
    # Return re.findall of one-or-more digits.
    pass`,
    hints: [
      'The pattern for one-or-more digits is `r"\\d+"`.',
      "`re.findall(pattern, text)` returns every match as a list.",
      'Return `re.findall(r"\\d+", text)`.',
    ],
    referenceSolution: `import re

def find_numbers(text):
    return re.findall(r"\\d+", text)`,
    testCases: [
      { input: { text: "a1b22" }, expected: ["1", "22"], description: "two digit-runs" },
      { input: { text: "no digits" }, expected: [], description: "none present" },
      { input: { text: "42" }, expected: ["42"], description: "one number" },
      { input: { text: "a1b2c3" }, expected: ["1", "2", "3"], description: "single digits" },
    ],
  },
  practice: {
    id: "py-l2-regex-practice",
    executionMode: "single-file",
    prompt: `Implement \`redact_digits(text)\`: return \`text\` with **every digit** replaced by \`"#"\`, using
\`re.sub\`.

For \`"a1b2"\` return \`"a#b#"\`; for \`"2024"\` return \`"####"\`.`,
    starterCode: `import re

def redact_digits(text):
    # Replace each digit with "#".
    pass`,
    hints: [
      'Match a single digit with `r"\\d"`.',
      "`re.sub(pattern, replacement, text)` swaps every match.",
      'Return `re.sub(r"\\d", "#", text)`.',
    ],
    referenceSolution: `import re

def redact_digits(text):
    return re.sub(r"\\d", "#", text)`,
    testCases: [
      { input: { text: "a1b2" }, expected: "a#b#", description: "digits become #" },
      { input: { text: "abc" }, expected: "abc", description: "nothing to redact" },
      { input: { text: "2024" }, expected: "####", description: "all digits" },
    ],
  },
}

const collectionsToolkitLesson: PythonLesson = {
  id: "py-l2-collections",
  title: "Counter, defaultdict & deque",
  summary:
    "Reach for specialized collections: count with Counter, group with defaultdict, queue with deque.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["collections", "counter", "defaultdict", "deque"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Reach for the right container, not a hand-rolled dict

When you tally, group, or queue, a plain \`dict\` or \`list\` works, but it forces you to write boilerplate that hides bugs. The \`collections\` module ships three focused upgrades that name your intent and delete that boilerplate: \`Counter\` for frequencies, \`defaultdict\` for grouping, and \`deque\` for queues.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Job", "The manual version", "The upgrade", "What the upgrade removes"],
  "rows": [
    ["Tally frequencies", "d[k] = d.get(k, 0) + 1", "Counter(items)", "the get-with-default dance on every increment"],
    ["Group into buckets", "if k not in d: d[k] = []", "defaultdict(list)", "the existence check before every append"],
    ["Pop from the front", "lst.pop(0), which is O(n)", "deque.popleft(), O(1)", "a hidden quadratic in any queue loop"]
  ],
  "highlightCols": ["What the upgrade removes"],
  "caption": "The first two remove boilerplate that hides bugs. The third removes an actual complexity class: list.pop(0) shifts every remaining element, so a queue built on a list is O(n²) overall while the same loop on a deque is O(n)."
}
\`\`\`

In interviews and in real data pipelines, reaching for the right one signals you know the standard library, and it usually cuts genuine complexity, not just line count.

### \`Counter\`: build on the intro

The Modules, imports and the standard library lesson already introduced \`Counter\` and \`most_common(k)\`. Here it earns its place next to \`defaultdict\` and \`deque\`, so focus on the two properties you lean on when tallying:

\`\`\`python
from collections import Counter

c = Counter(["a", "b", "a", "c", "a"])   # Counter({'a': 3, 'b': 1, 'c': 1})
c["a"]                                    # 3
c["z"]                                    # 0, not a KeyError
\`\`\`

A missing key returns \`0\` instead of raising, so you never guard a read. And because \`Counter\` is a \`dict\` subclass, \`Counter(words) == {"a": 2, "b": 1}\` is \`True\`, so for the Apply exercise you can return the \`Counter\` directly, or wrap it in \`dict(...)\` if a caller insists on a plain \`dict\`.

### \`defaultdict\`: group without the missing-key dance

A plain \`dict\` raises \`KeyError\` on a missing key, so grouping needs an \`if key not in d: d[key] = []\` guard. \`defaultdict(list)\` calls the factory you pass (the callable \`list\`, not \`list()\`) the first time a key is touched:

\`\`\`python
from collections import defaultdict

groups = defaultdict(list)
for w in ["apple", "ant", "bee"]:
    groups[w[0]].append(w)
dict(groups)   # {'a': ['apple', 'ant'], 'b': ['bee']}
\`\`\`

Keys keep insertion order and each list keeps append order, which is exactly what the Practice exercise checks.

### \`deque\`: a real queue

A \`deque\` (double-ended queue) adds and removes at both ends in \`O(1)\`:

\`\`\`python
from collections import deque

q = deque([1, 2, 3])
q.appendleft(0)   # deque([0, 1, 2, 3])
q.popleft()       # 0
\`\`\`

### Pitfalls

- Merely reading a missing \`defaultdict\` key inserts it: touching \`d["x"]\` when \`x\` is absent leaves \`d["x"] == []\` behind. Use \`d.get("x")\` when you only want to peek without mutating.
- \`defaultdict([])\` raises \`TypeError\`. The factory must be callable, so pass \`list\`, \`set\`, or \`int\`, never an instance.
- \`Counter\` never raises on a missing key, which is handy but hides typos: \`c["speling"]\` quietly returns \`0\`.

**Interview nuance:** using a \`list\` as a queue is a classic trap. \`list.pop(0)\` and \`list.insert(0, x)\` are \`O(n)\` because every remaining element shifts one slot, so a BFS built on \`list.pop(0)\` is secretly \`O(n²)\`. \`deque.popleft()\` and \`deque.appendleft()\` are \`O(1)\`, which is why a \`deque\` is the standard queue for BFS and sliding-window problems. The tradeoff is that a \`deque\` has no \`O(1)\` random indexing into its middle, unlike a \`list\`.`,
    demoCode: `from collections import Counter, defaultdict
print(Counter(["a", "b", "a", "c", "a"]))   # Counter({'a': 3, 'b': 1, 'c': 1})

groups = defaultdict(list)
for w in ["ant", "apple", "bee"]:
    groups[w[0]].append(w)
print(dict(groups))   # {'a': ['ant', 'apple'], 'b': ['bee']}`,
  },
  apply: {
    id: "py-l2-collections-apply",
    executionMode: "single-file",
    prompt: `Implement \`word_counts(words)\`: return a dict mapping each word to how many times it appears in the
list \`words\`. Use \`Counter\`.

For \`["a", "b", "a"]\` return \`{"a": 2, "b": 1}\`.`,
    starterCode: `from collections import Counter

def word_counts(words):
    # Count the words and return a plain dict.
    pass`,
    hints: [
      "`Counter(words)` tallies the list.",
      "Convert it to a plain dict for the result: `dict(Counter(words))`.",
    ],
    referenceSolution: `from collections import Counter

def word_counts(words):
    return dict(Counter(words))`,
    testCases: [
      {
        input: { words: ["a", "b", "a"] },
        expected: { a: 2, b: 1 },
        description: "counts repeats",
      },
      { input: { words: [] }, expected: {}, description: "empty list" },
      { input: { words: ["x"] }, expected: { x: 1 }, description: "single word" },
    ],
  },
  practice: {
    id: "py-l2-collections-practice",
    executionMode: "single-file",
    prompt: `Implement \`group_by_first(words)\`: return a dict mapping each **first letter** to the list of words
starting with it, preserving order. Use \`defaultdict(list)\`.

\`["apple", "ant", "bee"]\` returns \`{"a": ["apple", "ant"], "b": ["bee"]}\`.`,
    starterCode: `from collections import defaultdict

def group_by_first(words):
    # Group words by their first character; return a plain dict.
    pass`,
    hints: [
      "`groups = defaultdict(list)` auto-creates a list per new key.",
      "For each word: `groups[word[0]].append(word)`.",
      "Return `dict(groups)`.",
    ],
    referenceSolution: `from collections import defaultdict

def group_by_first(words):
    groups = defaultdict(list)
    for word in words:
        groups[word[0]].append(word)
    return dict(groups)`,
    testCases: [
      {
        input: { words: ["apple", "ant", "bee"] },
        expected: { a: ["apple", "ant"], b: ["bee"] },
        description: "groups by first letter",
      },
      { input: { words: [] }, expected: {}, description: "empty list" },
      { input: { words: ["x"] }, expected: { x: ["x"] }, description: "single word" },
    ],
  },
}

export const level2: PythonLevel = {
  id: 2,
  slug: "intermediate",
  title: "Level 2: Idioms",
  tagline:
    "Comprehensions, generators, classes, dataclasses, decorators, and standard-library idioms.",
  defaultExecutionMode: "single-file",
  estimatedHours: 3,
  modules: [
    {
      id: "py-l2-comprehensions-generators",
      title: "Comprehensions & Generators",
      description: "Transform collections concisely and stream values lazily.",
      lessons: [comprehensionsLesson, generatorsLesson],
    },
    {
      id: "py-l2-functions-in-depth",
      title: "Functions in Depth",
      description: "Flexible signatures, functions as values, closures, and decorators.",
      lessons: [argsKwargsLesson, lambdasHofLesson, closuresDecoratorsLesson],
    },
    {
      id: "py-l2-oop-foundations",
      title: "OOP Foundations",
      description: "Model state and behaviour with classes, inheritance, composition, and dunders.",
      lessons: [
        classesLesson,
        inheritanceCompositionLesson,
        dunderPropertiesLesson,
        classmethodStaticmethodLesson,
        containerProtocolsLesson,
      ],
    },
    {
      id: "py-l2-data-modeling",
      title: "Data Modeling",
      description: "Model data cleanly with dataclasses, enums, and type hints.",
      lessons: [dataclassesEnumsLesson],
    },
    {
      id: "py-l2-errors-files-modules",
      title: "Errors, Files & Modules",
      description: "Handle errors, parse JSON/CSV, and use the standard library.",
      lessons: [exceptionsLesson, filesJsonCsvLesson, modulesLesson],
    },
    {
      id: "py-l2-stdlib-toolkit",
      title: "Standard Library Toolkit",
      description: "Reach for the batteries: regular expressions and specialized collections.",
      lessons: [regexLesson, collectionsToolkitLesson],
    },
  ],
}

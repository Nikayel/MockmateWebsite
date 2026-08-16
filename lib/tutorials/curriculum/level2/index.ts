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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "leading-if-else-is-a-map",
  "prompt": "With nums = [1, 2, 3, 4, 5], what does [n if n > 2 else 0 for n in nums] produce?",
  "options": [
    {
      "label": "[3, 4, 5], the same result as [n for n in nums if n > 2]",
      "feedback": "Tempting, because both spellings contain the same condition and read almost the same aloud. But an if that sits in FRONT of the for is a conditional expression: it chooses what to emit for every item, so nothing is ever dropped."
    },
    {
      "label": "[0, 0, 3, 4, 5]",
      "correct": true,
      "feedback": "Right. A leading if ... else transforms every item, so the result is the same length as the input. Only a trailing if with no else filters."
    },
    {
      "label": "[1, 2, 0, 0, 0]",
      "feedback": "You spotted the important half: five items in, five items out, so this maps rather than filters. The branch order is the other way round though, since the value before the else is what a true condition emits."
    },
    {
      "label": "A SyntaxError, because if cannot come before the for",
      "feedback": "Understandable, since the trailing filter is the form most tutorials show first. Both positions are legal: leading if ... else is a conditional expression, trailing if is a filter clause."
    }
  ]
}
\`\`\`

### Pitfall: two different \`if\` positions

\`if\` at the **end** filters. \`if ... else\` at the **front** is a conditional expression that transforms every item and drops nothing:

\`\`\`python
[n for n in nums if n > 2]         # [3, 4, 5]        -> filter, shorter
[n if n > 2 else 0 for n in nums]  # [0, 0, 3, 4, 5]  -> map, same length
\`\`\`

Interns mix these up constantly. If your output got shorter, you filtered. If it stayed the same length, you mapped.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "dict-comprehension-duplicate-keys",
  "prompt": "What is {len(w): w for w in ['hi', 'by', 'ok']}?",
  "options": [
    {
      "label": "{2: 'hi'}, since the first word to claim the key keeps it",
      "feedback": "Tempting, because setdefault and a few other languages do keep the first write. Plain assignment does not: every iteration writes the same key, so the last word is the one left standing."
    },
    {
      "label": "{2: 'ok'}",
      "correct": true,
      "feedback": "Right. All three words have length 2, so all three write to key 2 and the last one wins. Two records vanish and nothing warns you."
    },
    {
      "label": "{2: ['hi', 'by', 'ok']}",
      "feedback": "That is what a defaultdict(list) grouping loop would give you, and it is often what you actually wanted. A dict comprehension assigns rather than appends, so it stores exactly one value per key."
    },
    {
      "label": "A KeyError, because the key 2 is produced three times",
      "feedback": "A fair instinct: silent data loss feels like it deserves an error. Python treats a repeated key as an ordinary reassignment, which is exactly why this bug survives code review."
    }
  ]
}
\`\`\`

One more, for dicts: duplicate keys silently overwrite, and the last one wins. \`{len(w): w for w in ["hi", "by", "ok"]}\` keeps only \`{2: "ok"}\` because all three keys are \`2\`. In the Practice exercise the words are the keys, so you are safe, but flip the mapping and you will quietly lose data.

**Interview nuance:** a comprehension is eager. It runs to completion and materializes the whole collection in memory, so it costs O(n) time and O(n) space. That is fine for thousands of items and wasteful for a billion-row scan. The lazy cousin is the generator expression \`(n * n for n in nums)\`, the same syntax with \`( )\`, which yields one value at a time in O(1) extra space. When an interviewer asks what you would run over a huge stream, "a generator, because the full list would not fit in memory" is the answer they are listening for.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "list-comp-vs-genexp",
  "prompt": "You are choosing between [x for x in src] and (x for x in src). Sort each requirement into the tool that satisfies it.",
  "buckets": ["List comprehension", "Generator expression"],
  "items": [
    {
      "label": "You loop over the result twice",
      "bucket": "List comprehension",
      "feedback": "A generator is consumed once, so the second loop sees an empty sequence. A list can be walked as often as you like."
    },
    {
      "label": "You total one number over a 10 GB log file",
      "bucket": "Generator expression",
      "feedback": "One value in memory at a time, O(1) extra space. The list version would try to hold every line at once."
    },
    {
      "label": "You call len() on the result",
      "bucket": "List comprehension",
      "feedback": "A generator has no length: it does not know how many values it will produce until it has produced them."
    },
    {
      "label": "You read the result with [0]",
      "bucket": "List comprehension",
      "feedback": "Generators do not support indexing. Use next(gen) to pull the first value, or build a list when random access matters."
    },
    {
      "label": "You stop at the first match and abandon the rest",
      "bucket": "Generator expression",
      "feedback": "Laziness means the items after the match are never computed at all, so the work you skip is real work saved."
    }
  ],
  "reveal": "The dividing line is passes and size: a list when you need indexing, len, or more than one walk, a generator when you consume the sequence once and the full collection would not fit."
}
\`\`\``,
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "calling-a-generator-runs-nothing",
  "prompt": "A generator function begins with print('start') and then yields 1. You run the single line g = gen() and nothing else. What is printed?",
  "options": [
    {
      "label": "start, because calling a function runs its body",
      "feedback": "Tempting, and true of every ordinary function you have written so far. The presence of a yield anywhere in the body changes what the call does: it builds a generator object and runs none of the code."
    },
    {
      "label": "Nothing at all",
      "correct": true,
      "feedback": "Right. The call only constructs a paused generator. Not one line of the body runs until something pulls a value out of it."
    },
    {
      "label": "start, then 1",
      "feedback": "This mixes up producing a value with printing it, and it also assumes the body ran. Even once you do pull from the generator, yield hands the value to the caller rather than printing it."
    },
    {
      "label": "Nothing, and g is None because the function never returns anything",
      "feedback": "Half right, which makes it the sharpest wrong answer: nothing prints. But g is a generator object, not None, and that object is what you iterate to make the body run."
    }
  ]
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "generator-consumed-once",
  "prompt": "g = (n * n for n in range(1, 5)). You call sum(g) and it returns 30. What does a second sum(g) on the very next line return?",
  "options": [
    {
      "label": "30 again, because the expression is re-evaluated",
      "feedback": "Tempting, because a list assigned to a name really does survive being read twice, and the source range(1, 5) has not gone anywhere. But g is a single generator object, not a recipe that reruns."
    },
    {
      "label": "0",
      "correct": true,
      "feedback": "Right. The first sum drove g to exhaustion, so the second one iterates an empty sequence and sum of nothing is 0. There is no rewind: build a fresh generator, or keep a list, when you need a second pass."
    },
    {
      "label": "60, because the two sums accumulate",
      "feedback": "Nothing accumulates across calls: sum starts from 0 every time and only ever adds what it pulls. The interesting question is what is left to pull, and after the first sum the answer is nothing."
    },
    {
      "label": "It raises StopIteration, since the generator is exhausted",
      "feedback": "Close, and it is the right instinct about exhaustion. StopIteration is how the generator signals the end, but for and sum catch that signal and treat it as a clean finish, so you get an empty total rather than a crash."
    }
  ]
}
\`\`\`

### Pitfall: a generator is single-use

Iterating a generator consumes it. There is no rewind.

\`\`\`python
g = (n * n for n in range(1, 5))
print(sum(g))   # 30
print(sum(g))   # 0   <- already exhausted, nothing left to yield
\`\`\`

The second \`sum\` sees an empty generator, not a fresh one. Also, \`next(gen)\` with no default raises \`StopIteration\` on an empty generator, so always pass a default when "not found" is a real outcome.

**Interview nuance:** a generator *is* an iterator. It implements \`__iter__\` (returning itself) and \`__next__\`, holds one value at a time, and runs in O(1) extra memory no matter how many values it produces. A list comprehension is O(n) memory and re-iterable; a generator is O(1) memory and single-pass. Interviewers probe that trade-off directly: reach for a generator when you consume the sequence once and streaming saves memory, and for a list when you need indexing, \`len\`, or more than one pass.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "first-match-over-a-huge-file",
  "prompt": "You are scanning millions of log lines for the first one containing ERROR, and a clean run contains none. Which expression is correct and cheap?",
  "options": [
    {
      "label": "next(line for line in lines if 'ERROR' in line)",
      "feedback": "Cheap and lazy, so half the job is done: it stops at the first hit and never reads the rest. But with no default it raises StopIteration on a clean run, which is the common case you most need to survive."
    },
    {
      "label": "next((line for line in lines if 'ERROR' in line), None)",
      "correct": true,
      "feedback": "Right. Lazy enough to stop at the first hit, and the default turns the empty case into a value you can test instead of an exception you have to catch."
    },
    {
      "label": "[line for line in lines if 'ERROR' in line][0]",
      "feedback": "It reads correctly, which is why it slips through review. It also scans every one of the millions of lines and materializes every match before taking one, then raises IndexError on the clean run."
    }
  ],
  "reveal": "Two habits worth carrying out of this lesson: filter inside a generator expression so the scan stops at the first hit, and always pass next() a default when not found is a legitimate outcome."
}
\`\`\``,
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "star-collects-vs-spreads",
  "prompt": "The same two symbols do opposite jobs depending on where they appear. Sort each line by which job the star is doing.",
  "buckets": ["Collecting into one parameter", "Spreading one value into many arguments"],
  "items": [
    {
      "label": "def total(*nums):",
      "bucket": "Collecting into one parameter",
      "feedback": "Inside a def, the star sweeps every leftover positional argument into a single tuple named nums."
    },
    {
      "label": "total(*nums)",
      "bucket": "Spreading one value into many arguments",
      "feedback": "At a call site, the star takes one iterable apart and hands its items over as separate positional arguments."
    },
    {
      "label": "def tag(name, **attrs):",
      "bucket": "Collecting into one parameter",
      "feedback": "Two stars in a def gather the leftover keyword arguments into a single dict named attrs."
    },
    {
      "label": "template.format(**values)",
      "bucket": "Spreading one value into many arguments",
      "feedback": "Two stars at a call site turn each key/value pair in the dict into its own keyword argument."
    }
  ]
}
\`\`\`

### Pitfall: passing a container where you meant to unpack it

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "list-passed-instead-of-spread",
  "prompt": "total is defined as def total(*nums): return sum(nums). You already hold nums = [1, 2, 3] and write total(nums). What happens?",
  "options": [
    {
      "label": "It returns 6, because *nums accepts an iterable",
      "feedback": "Tempting, because the argument you passed does contain exactly the three numbers you want summed. The star collects loose arguments though, so a single list arrives as a single item rather than as three."
    },
    {
      "label": "TypeError, because nums binds to ([1, 2, 3],) and sum tries to add a list to 0",
      "correct": true,
      "feedback": "Right. One argument means a one-element tuple, and that element is a list. Spread it with total(*nums) to restore the three separate arguments."
    },
    {
      "label": "TypeError, because a *nums parameter rejects a list argument outright",
      "feedback": "The verdict is right and the mechanism is wrong, which matters when you read the traceback. Binding succeeds happily: *nums takes any positional value. The failure happens one line later, inside sum."
    },
    {
      "label": "It returns [1, 2, 3], since sum of a single list is that list",
      "feedback": "sum never returns its input unchanged: it starts at 0 and adds each item, so the first addition here is 0 + [1, 2, 3]. Integers and lists do not add, which is what raises."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "params-after-star-args-are-keyword-only",
  "prompt": "Given def f(a, *args, b): return a, args, b, what does the call f(1, 2, 3) do?",
  "options": [
    {
      "label": "Returns (1, (2,), 3): the last positional argument fills b",
      "feedback": "Tempting, because parameters normally fill left to right and there are exactly enough values to go round. But *args is greedy: it has already claimed every remaining positional, so nothing is left for b to catch."
    },
    {
      "label": "Raises TypeError: missing 1 required keyword-only argument: 'b'",
      "correct": true,
      "feedback": "Right. Anything declared after *args can only be passed by name, so this call needs f(1, 2, 3, b=4). That is the standard trick for forcing callers to be explicit."
    },
    {
      "label": "Returns (1, (2, 3), None): b is unset, so it defaults to None",
      "feedback": "You read the binding correctly, and args really does end up as (2, 3). Python never invents a default though: a parameter with no default written in the signature is required, keyword-only or not."
    },
    {
      "label": "Raises SyntaxError at definition time, since no parameter may follow *args",
      "feedback": "A reasonable guess given how unusual the signature looks, but this is legal and deliberate syntax. It is exactly how library authors make an option impossible to pass by accident in the wrong position."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "filter-wants-a-verdict",
  "prompt": "What does list(filter(lambda x: x * 2, [0, 1, 2, 3])) return?",
  "options": [
    {
      "label": "[0, 2, 4, 6], every item doubled",
      "feedback": "Tempting, because the lambda plainly doubles its argument and that is the only arithmetic in sight. But filter never uses the returned value as data: it only asks whether that value is truthy, and then keeps or drops the ORIGINAL item."
    },
    {
      "label": "[1, 2, 3]",
      "correct": true,
      "feedback": "Right. 0 * 2 is 0, which is falsy, so only the zero is dropped and the surviving items come back unchanged. A filter rule that is not a yes/no question tends to keep almost everything."
    },
    {
      "label": "[0, 1, 2, 3], because nothing is dropped",
      "feedback": "Very close, and you have the key insight that filter returns the original items rather than doubled ones. The one exception is 0: doubling it gives 0, Python reads that as false, and the item is dropped."
    },
    {
      "label": "TypeError, because filter requires a function that returns a bool",
      "feedback": "It would be safer if it did. Python accepts any return value and applies its ordinary truthiness rules, which is precisely why this bug is silent instead of loud."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "list-sort-returns-none",
  "prompt": "words = ['ccc', 'a', 'bb']. You write result = words.sort() and then print(result). What prints?",
  "options": [
    {
      "label": "['a', 'bb', 'ccc']",
      "feedback": "Tempting, because the sort really did happen and that is exactly the order words now holds. The catch is what the method HANDS BACK: it sorts in place and returns None, so the sorted data is in words, not in result."
    },
    {
      "label": "None",
      "correct": true,
      "feedback": "Right. Python methods that mutate in place return None by convention, which is also true of list.append, list.reverse, and dict.update. Use sorted(words) when you want a value back."
    },
    {
      "label": "['ccc', 'a', 'bb']",
      "feedback": "That would be the answer if sort left the original untouched and returned a copy, which is what sorted does. The method version is the opposite: it changes words and returns nothing."
    },
    {
      "label": "It raises TypeError, since sort takes a key argument",
      "feedback": "key is optional in both spellings, so calling sort with no arguments is fine and sorts by the natural ordering of the elements. The surprise here is the return value, not the call."
    }
  ]
}
\`\`\`

### Pitfalls

- **\`sort\` versus \`sorted\`.** \`sorted(x)\` returns a new list; \`x.sort()\` sorts in place and returns \`None\`. Writing \`result = words.sort()\` gives you \`None\`, a bug interns hit constantly. In the Apply, \`return sorted(words, key=len)\`, not \`words.sort()\`.
- **Iterators are one-shot.** A \`map\` or \`filter\` object is exhausted after you walk it once. \`m = map(...); list(m)\` works, but a second \`list(m)\` returns \`[]\`. Call \`list(...)\` once and keep that list.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "multi-key-sort-order",
  "prompt": "You need employees ordered by department name ascending, and within each department by salary descending. Using two calls to sorted, which order do you run them in?",
  "options": [
    {
      "label": "Sort by department first, then sort the result by salary",
      "feedback": "Tempting, because you naturally state the primary key first and it feels like you should apply it first. But the LAST sort is the one that wins outright: a final pass over salary reshuffles the whole list and scatters the departments."
    },
    {
      "label": "Sort by salary first, then sort the result by department",
      "correct": true,
      "feedback": "Right. Apply the least significant key first, the most significant last. Because sorted is stable, the salary order survives inside each department group."
    },
    {
      "label": "The order does not matter, because sorted is stable",
      "feedback": "Stability is the right concept, but it is the reason the order DOES matter. Stability only guarantees that ties keep their current relative order, which is what makes the earlier sort's work carry through the later one."
    },
    {
      "label": "Neither works: two fields need one call with a tuple key",
      "feedback": "A tuple key is a perfectly good solution and often the clearest one. It is not the only one though, and the tuple gets awkward when the two fields sort in opposite directions and the values are not numbers you can negate."
    }
  ]
}
\`\`\`

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
  summary: "Capture state in a closure and wrap behavior with a decorator.",
  seoDescription:
    "A closure is an inner function plus a live link to the variables of the function that made it, and a decorator wraps a function to add behavior around it.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["closures", "scope", "decorators", "functions"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why closures and decorators are everywhere

Every time you write \`@app.route\`, \`@pytest.fixture\`, or \`@functools.lru_cache\`, you are using both ideas at once. A closure lets a function carry state without a class or a global variable. A decorator lets you add behavior (timing, retries, auth checks, caching) around a function without touching its body. In real codebases these keep cross-cutting logic in one place instead of copy-pasted into every function.

## Scope: how Python resolves a name

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "assignment-makes-a-name-local",
  "prompt": "count = 0 sits at module level. A function is defined as def bump(): print(count); count += 1. What happens when you call bump()?",
  "options": [
    {
      "label": "It prints 0, then sets the module-level count to 1",
      "feedback": "Tempting, because reading a global from inside a function really does work, and the print line comes first. The += changes the picture: assigning to a name anywhere in a function marks it local for the WHOLE function, including lines above the assignment."
    },
    {
      "label": "It raises UnboundLocalError on the print line",
      "correct": true,
      "feedback": "Right. Python decides local versus global when it compiles the function, not while it runs, so count is local from the first line and printing it before any value is assigned fails."
    },
    {
      "label": "It prints 0, then raises UnboundLocalError on the += line",
      "feedback": "The sharpest wrong answer, because the error name is exactly right. The timing is not: the decision that count is local is already made before the body starts, so the very first read is the one that fails."
    },
    {
      "label": "It raises NameError, since count was never defined inside bump",
      "feedback": "Close relatives, and the distinction is worth knowing. NameError means the name was found nowhere at all; UnboundLocalError is the more specific case where Python knows it is a local and knows it has no value yet."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "decorator-rebinds-the-name",
  "prompt": "double is a decorator that defines wrapper(x) returning fn(x) * 2 and then returns wrapper. You write @double on the line above def identity(x): return x. Immediately after that def, what is the name identity bound to?",
  "options": [
    {
      "label": "Still the original identity function, since the decorator only kicks in when you call it",
      "feedback": "Tempting, because @double reads like an annotation sitting off to the side. It is executable code: the decorator runs once at definition time, and the value it returns replaces the name."
    },
    {
      "label": "The wrapper function that double returned",
      "correct": true,
      "feedback": "Right. The @ line is exactly identity = double(identity), so calls to identity land in wrapper, which calls the original and doubles what it gets back."
    },
    {
      "label": "A copy of identity with the doubling patched into its body",
      "feedback": "Nothing rewrites the original function's code, which is the whole appeal: the body you wrote stays untouched and readable. The behavior changes by wrapping it in another function, not by editing it."
    },
    {
      "label": "None, because a decorator does not return anything",
      "feedback": "This one is worth remembering, because it is what you actually get when you forget the final return wrapper inside double. Then identity is None and calling it raises TypeError: 'NoneType' object is not callable."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "closure-late-binding-in-a-loop",
  "prompt": "funcs = [lambda: i for i in range(3)]. What does [f() for f in funcs] give you?",
  "options": [
    {
      "label": "[0, 1, 2]",
      "feedback": "Tempting, and it is what almost everyone expects the first time, because each lambda was created while i held a different value. But a closure keeps a link to the VARIABLE, not a snapshot of what it held at the moment of creation."
    },
    {
      "label": "[2, 2, 2]",
      "correct": true,
      "feedback": "Right. All three lambdas share one i, and by the time you call them the loop has finished with i at its last value, 2. Bind eagerly with lambda i=i: i to get [0, 1, 2]."
    },
    {
      "label": "[3, 3, 3]",
      "feedback": "You have the mechanism exactly right: one shared variable, read at call time. The final value is off by one though. Python's loop variable stops at the last value it actually took, which for range(3) is 2, not the exhausted bound."
    },
    {
      "label": "A NameError, because i no longer exists once the comprehension ends",
      "feedback": "A fair worry, since a comprehension really does keep i out of the surrounding scope. The closures still hold their own reference to that variable, so it stays alive as long as they do."
    }
  ]
}
\`\`\`

### Pitfall: late binding in loops

Closures capture the *variable*, not its value at definition time:

\`\`\`python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])    # [2, 2, 2], not [0, 1, 2]
\`\`\`

Every lambda shares the same \`i\`, which has reached \`2\` by the time you call them. Bind the value eagerly with a default argument: \`lambda i=i: i\` gives \`[0, 1, 2]\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "decorator-loses-dunder-name",
  "prompt": "After the plain @double decorator is applied, what does identity.__name__ return?",
  "options": [
    {
      "label": "'identity', the name you wrote in the def",
      "feedback": "Tempting, because that is the name you type at every call site and it is what any debugger ought to show you. But __name__ belongs to the function OBJECT, and the object living under that name now is the wrapper."
    },
    {
      "label": "'wrapper'",
      "correct": true,
      "feedback": "Right. The decorator swapped in a different object, and that object was defined as wrapper. This is why tracebacks, logging, and framework registries all go vague once decorators appear."
    },
    {
      "label": "'double', the name of the decorator",
      "feedback": "double is the factory that produced the replacement, not the replacement itself. What identity holds is double's return value, and that inner function carries its own name."
    },
    {
      "label": "It raises AttributeError, since a wrapper has no __name__",
      "feedback": "Every function object gets a __name__ automatically, wrappers included, so nothing raises here. The problem is the opposite of missing: it is present and quietly wrong."
    }
  ],
  "reveal": "The fix is one line: decorate wrapper with @functools.wraps(fn), which copies __name__ and __doc__ across and sets __wrapped__ back to the original. Make it a reflex in every decorator you write."
}
\`\`\`

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
  summary: "Model state and behavior together with a class.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["classes", "init", "methods", "self"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why bundle state with behavior

Real systems track things that own both data and the rules for changing that data. A bank account has a balance plus rules for depositing. A shopping cart has items plus rules for adding them. You could keep a loose \`balance\` variable and pass it to standalone functions, but then nothing keeps the data and its rules together, and every caller has to remember which functions are allowed to touch it. A \`class\` ties the data and the operations that act on it into one named type, so the \`balance\` and the sanctioned way to change it travel together.

### The mental model

A \`class\` is a template that describes a kind of object. Each object you build from it is an \`instance\` with its own copy of the data (its \`attributes\`). The functions defined inside the class are \`methods\`: the behavior that acts on one instance's data.

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "init-does-not-return-a-value",
  "prompt": "A learner writes def __init__(self, balance): return balance, hoping that BankAccount(100) evaluates to 100. What actually happens?",
  "options": [
    {
      "label": "account is 100, since the constructor returned it",
      "feedback": "Tempting, because every other function you have written hands back whatever you return. Construction is a two-step protocol though: the object is created first, and __init__ only gets a chance to set it up."
    },
    {
      "label": "It raises TypeError: __init__() should return None, not 'int'",
      "correct": true,
      "feedback": "Right. Python enforces this rather than letting a stray return silently do nothing. An initializer sets attributes on self; it never produces the value the call evaluates to."
    },
    {
      "label": "account is a BankAccount and the return value is silently ignored",
      "feedback": "The most plausible wrong answer, and it is what happens for a bare return with no value, since returning None is allowed. Return an actual object and Python refuses instead of ignoring you."
    },
    {
      "label": "account is a BankAccount, but reading account.balance raises AttributeError",
      "feedback": "You correctly noticed that this __init__ never assigns self.balance, so the attribute genuinely would be missing. The type error comes first though: the returned int stops construction before you ever read an attribute."
    }
  ]
}
\`\`\`

### \`__init__\` and \`self\`

\`__init__\` is the initializer. Python calls it automatically when you write \`BankAccount(100)\`, passing \`100\` in as \`balance\`. Its job is to set the instance's starting attributes. \`self\` is the instance the method is currently working on. It is the first parameter of every method, and \`self.balance\` is how you reach that specific instance's data. Two accounts each carry their own \`balance\`, and writing \`self.balance\` on one never touches the other.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bare-name-is-not-an-attribute",
  "prompt": "Inside deposit a learner writes balance = self.balance + amount and nothing else. account starts at 100 and you call account.deposit(50). What is account.balance afterwards?",
  "options": [
    {
      "label": "150, because a bare name inside a method resolves to the attribute",
      "feedback": "Tempting, and it is exactly how several other languages behave, which is why this bug travels with people who learned Java or C++ first. Python has no implicit this: a bare name is a plain local variable."
    },
    {
      "label": "100, and the method raised no error at all",
      "correct": true,
      "feedback": "Right. The line computed the correct number into a local that vanished when the method returned. Silent wrong answers like this are why self. on the left-hand side matters."
    },
    {
      "label": "It raises UnboundLocalError, since balance is read before assignment",
      "feedback": "The right instinct about assignment making a name local, and it would be the answer if the right-hand side said balance rather than self.balance. Here the read goes through the attribute, so nothing is unbound."
    },
    {
      "label": "It raises AttributeError, because balance was never declared on the class",
      "feedback": "Python does not require attributes to be declared anywhere: __init__ already created self.balance by assigning it. Nothing about this method is missing an attribute, which is precisely why the bug is invisible."
    }
  ]
}
\`\`\`

### Pitfall: forgetting \`self\`

Inside a method, \`balance = amount\` creates a throwaway local variable that vanishes when the method returns. The attribute is never touched. You must write \`self.balance = amount\`, and read it back the same way with \`self.balance\`, not a bare \`balance\`. Every method also needs \`self\` as its first parameter, even when the method takes no other argument. In Practice, \`increment(self)\` has no extra parameters, but \`self\` still comes first.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "method-defined-without-self",
  "prompt": "A method is defined as def deposit(amount): ... with no self in the parameter list. You call account.deposit(50). What do you see?",
  "options": [
    {
      "label": "TypeError: BankAccount.deposit() takes 1 positional argument but 2 were given",
      "correct": true,
      "feedback": "Right, and the arithmetic in that message is the tell: you passed one argument, Python passed the instance too, so the method received two. The dot always hands the instance in as the first argument."
    },
    {
      "label": "TypeError: BankAccount.deposit() missing 1 required positional argument: 'self'",
      "feedback": "This message looks like the one you would expect, which is what makes it tempting, but it says the opposite of what happened. Python is not short an argument here, it has one too many."
    },
    {
      "label": "No error, since self is only needed when the method touches instance data",
      "feedback": "Nothing about the call is conditional on what the body does: the instance is passed on every method call, used or not. That is why self appears even on a method with no other parameters."
    },
    {
      "label": "NameError: self is not defined",
      "feedback": "That error appears when the BODY mentions self without it being a parameter. Here the body never mentions it, so the failure lands earlier, while Python is still binding arguments to parameters."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "super-follows-the-mro-not-the-parent",
  "prompt": "class A defines who() returning 'A'. class B(A) and class C(A) each return their own letter followed by super().who(). class D(B, C) has an empty body. What does D().who() return?",
  "options": [
    {
      "label": "'B -> A', because B's super() is B's own parent, which is A",
      "feedback": "Tempting, and it is the model almost everyone carries: super() means my parent. Read as a rule about B alone that is what you get, but the lookup order is a property of D, the object the call started from."
    },
    {
      "label": "'B -> C -> A'",
      "correct": true,
      "feedback": "Right. D's method resolution order is D, B, C, A, so B's super() lands on its sibling C even though B does not inherit from C at all. That is what makes the shared base run exactly once."
    },
    {
      "label": "'B -> A -> C -> A', walking each inheritance path in turn",
      "feedback": "This is what naive depth-first inheritance would do, and it is exactly the duplicated-base problem that C3 linearization exists to prevent. A appears once in the MRO, so it runs once."
    },
    {
      "label": "'C -> B -> A', since the last base listed wins",
      "feedback": "You are right that the order of the bases in class D(B, C) decides things, but it reads left to right: B is searched before C, so B's who() is the one that runs first."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "is-a-versus-has-a",
  "prompt": "Sort each pair by the relationship that fits it. Ask whether the first thing IS a kind of the second, or merely HAS one.",
  "buckets": ["Inheritance (is-a)", "Composition (has-a)"],
  "items": [
    {
      "label": "AdminUser and User",
      "bucket": "Inheritance (is-a)",
      "feedback": "An admin really is a user with extra powers, and anywhere a User is expected an AdminUser can stand in. That substitutability is the test."
    },
    {
      "label": "Car and Engine",
      "bucket": "Composition (has-a)",
      "feedback": "A car is not a kind of engine. It owns one, and being able to swap the engine without touching the car's own type is the payoff."
    },
    {
      "label": "Playlist and Song",
      "bucket": "Composition (has-a)",
      "feedback": "A playlist holds many songs. Container relationships are always has-a, no matter how central the contents feel to the object."
    },
    {
      "label": "Square and Shape",
      "bucket": "Inheritance (is-a)",
      "feedback": "A square is a kind of shape, and every operation defined on Shape still makes sense on it. This is the case inheritance was designed for."
    },
    {
      "label": "Report and the Formatter it renders itself with",
      "bucket": "Composition (has-a)",
      "feedback": "The report delegates rendering to a collaborator. Holding it as an attribute means you can hand in a different formatter, including a fake one in tests."
    }
  ]
}
\`\`\`

## Which to use

Prefer composition when one thing *contains* or *uses* another. Reserve inheritance for a genuine "is-a" relationship where the subclass is fully substitutable for its parent. Composition keeps classes small and lets you swap a part out without touching a whole hierarchy.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "subclass-init-skips-super",
  "prompt": "LoudGreeter(Greeter) defines its own __init__ that sets self.volume and never calls super().__init__(name). You build LoudGreeter('Ada') and then call greet(). What happens?",
  "options": [
    {
      "label": "Python calls the parent __init__ for you once the subclass one finishes",
      "feedback": "Tempting, because several other languages do chain to the base constructor implicitly. Python does not: if you write your own __init__, the parent's runs only when you call it."
    },
    {
      "label": "The object builds fine, and greet() raises AttributeError: no attribute 'name'",
      "correct": true,
      "feedback": "Right, and the delay is what makes it painful. Construction looks healthy and the failure surfaces somewhere else entirely, on whichever line first reads the attribute the parent was supposed to set."
    },
    {
      "label": "Construction itself raises TypeError, because the parent's setup was skipped",
      "feedback": "Nothing checks that you called up the chain, so nothing can raise at construction time. Python has no notion of a partially initialized object to complain about."
    },
    {
      "label": "self.name is quietly set to None, since the parent declares it",
      "feedback": "That would require the parent to declare fields the way a typed language does. Attributes only exist once something assigns them, so the name is not None here, it is absent."
    }
  ]
}
\`\`\`

## Pitfalls

The classic trap: a subclass defines its own \`__init__\` but forgets to call \`super().__init__(...)\`. The parent's setup never runs, so attributes like \`self.name\` are silently missing and you get an \`AttributeError\` only later, when some method reads them. If you override \`__init__\`, call the parent's inside it. (\`LoudGreeter\` sidesteps this by not defining \`__init__\` at all.)

**Interview nuance:** know why "prefer composition over inheritance" is standard advice. Inheritance couples a subclass to the parent's internals, so a change in the base class can quietly break every subclass (the fragile base class problem), and deep chains make method lookup hard to trace through the MRO. Composition swaps that inheritance coupling for a narrow "uses" boundary you can test and replace in isolation.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "square-inherits-rectangle-trap",
  "prompt": "Rectangle lets callers set width and height independently. You write Square(Rectangle) and override both setters so the two always stay equal. What is the real problem?",
  "options": [
    {
      "label": "Nothing. A square is a rectangle, so the is-a test passes",
      "feedback": "Tempting, because it is true in geometry and the is-a phrasing sounds like it settles the question. The test is not what the words mean, it is whether the subclass can stand in wherever the parent is used without surprising the caller."
    },
    {
      "label": "Any code written against Rectangle that sets width then height now silently gets the wrong shape",
      "correct": true,
      "feedback": "Right. Set width to 5 and height to 4 on a Square and you get a 4 by 4, so a caller that computes area on a Rectangle reference is now quietly wrong. Composition, or an immutable value type, avoids the whole problem."
    },
    {
      "label": "Python raises TypeError, because an override changed the meaning of an inherited setter",
      "feedback": "Nothing at the language level notices. Python checks that the method exists, never that it keeps the promises the parent made, which is exactly why this class of bug reaches production."
    },
    {
      "label": "It only breaks when Square forgets to call super().__init__()",
      "feedback": "That is a real and separate bug, and worth catching. Here the constructors can be perfectly correct and the class still misbehaves the moment someone resizes it through a Rectangle reference."
    }
  ],
  "reveal": "This is the substitution test in practice. Before you inherit, ask whether every promise the parent makes to its callers still holds for the subclass. When the answer is no, hold the parent as an attribute instead."
}
\`\`\``,
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
  summary: "Give classes natural behavior with __eq__/__repr__ and computed @property values.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["dunder-methods", "eq", "property", "classes"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why give a class built-in behavior

Print a plain object and you get \`<__main__.Point object at 0x10f3c2a90>\`. Compare two of them with \`==\` in a test and the answer has nothing to do with the values you care about. That is useless in tests, logs, and debugging. Dunder methods let your class plug into the same protocols the built-in types use, so \`==\`, \`print()\`, \`len()\`, \`[]\`, and more behave the way callers expect.

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "default-eq-compares-identity",
  "prompt": "Suppose Point defines __init__ and __repr__ but no __eq__ at all. What is Point(1, 2) == Point(1, 2)?",
  "options": [
    {
      "label": "True, since both objects hold the same x and y",
      "feedback": "Tempting, because those coordinates are the only thing that distinguishes one point from another, and every test you would write cares about them. Without __eq__ though, Python never looks inside: it compares whether the two names point at the same object."
    },
    {
      "label": "False",
      "correct": true,
      "feedback": "Right. The inherited __eq__ is an identity check, and these are two separately built objects. Value equality is something you opt into by writing __eq__."
    },
    {
      "label": "TypeError, because Point does not support the == operator",
      "feedback": "Every object supports ==, because object itself provides a default. Comparison operators that genuinely can be missing are the ordering ones, so it is < that raises TypeError on a class with no __lt__."
    },
    {
      "label": "NotImplemented, the sentinel a comparison falls back to",
      "feedback": "NotImplemented is real and it is worth knowing, but it is an internal signal a comparison method returns to say try the other operand. Python turns that into an ordinary identity comparison, and here that answer is False."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "property-is-read-never-called",
  "prompt": "Circle exposes area as an @property. A caller who is used to methods writes Circle(2).area(). What happens?",
  "options": [
    {
      "label": "It returns 12.56636. The parentheses are harmless either way",
      "feedback": "Tempting, because area was written with def and looks like a method in the source. The decorator changes what attribute access does: reading .area has already called it, so the value is a float by the time your parentheses are applied."
    },
    {
      "label": "TypeError: 'float' object is not callable",
      "correct": true,
      "feedback": "Right, and the error message names the culprit precisely. Read the returned type in that message and you can usually see which property you called by mistake."
    },
    {
      "label": "It returns the bound method, which you then have to call again",
      "feedback": "That is exactly what happens WITHOUT the @property line, and it is the mirror-image bug: printing circle.area then shows something like a bound method object instead of a number."
    },
    {
      "label": "AttributeError, because area is not really an attribute",
      "feedback": "It is a genuine attribute, just a computed one: the descriptor protocol runs your function on every read. The lookup succeeds, so the failure is about calling the result, not about finding it."
    }
  ]
}
\`\`\`

\`Circle(2).area\` runs the method and hands back the number. Writing \`Circle(2).area()\` would raise \`TypeError: 'float' object is not callable\`, because \`area\` already returned a \`float\`.

### Pitfalls

- **\`__eq__\` that crashes on foreign types.** \`self.x == other.x\` raises \`AttributeError\` when \`other\` has no \`.x\` (for example \`Point(1, 2) == "hi"\`). Guard with \`isinstance\` and \`return NotImplemented\` so Python falls back to a safe \`False\` instead of blowing up.
- **Calling a property.** A \`@property\` is read like data (\`circle.area\`), never called (\`circle.area()\`).
- **Unhashable objects.** Defining \`__eq__\` sets \`__hash__\` to \`None\`, so instances can no longer be dict keys or set members. Add a matching \`__hash__\` (equal objects must hash equal) or use \`@dataclass(frozen=True)\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "defining-eq-drops-hash",
  "prompt": "Your Point class worked fine as a dict key. You add an __eq__ that compares x and y. What else changes?",
  "options": [
    {
      "label": "Nothing else. == simply gets smarter about equal points",
      "feedback": "Tempting, because adding one method feels like a purely additive change and the equality behavior is all you asked for. Python quietly sets __hash__ to None at the same time, so the class stops being hashable."
    },
    {
      "label": "Adding a Point to a set now raises TypeError",
      "correct": true,
      "feedback": "Right. Defining __eq__ sets __hash__ to None, so the class is no longer hashable. Define a matching __hash__ over the same fields, or reach for @dataclass(frozen=True), which generates both together."
    },
    {
      "label": "Points become unsortable, because __lt__ is removed at the same time",
      "feedback": "Ordering and equality are separate protocols, and object never gave you __lt__ to lose. Sorting a list of Points fails for a different reason: no comparison method was ever defined."
    },
    {
      "label": "Comparing a Point to a non-Point now raises TypeError",
      "feedback": "You are pointing at a real hazard from this lesson, just the wrong one and the wrong exception. An unguarded __eq__ raises AttributeError on a foreign object, which is why you check isinstance and return NotImplemented."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "hardcoded-class-in-classmethod",
  "prompt": "from_csv is a @classmethod, but its body hard-codes the class name and returns User(line.split(',')[0]). class Admin(User) inherits it unchanged. What is type(Admin.from_csv('grace,7'))?",
  "options": [
    {
      "label": "Admin, because the call was made on Admin",
      "feedback": "Tempting, because the call site says Admin and a classmethod really is dispatched on the class you call it from. What comes back is decided by the constructor the body invokes, and that body names User outright."
    },
    {
      "label": "User, and the subclass is silently discarded",
      "correct": true,
      "feedback": "Right. cls exists so the alternative constructor builds whatever class it was called on. Hard-coding the name pins the result to the base and every subclass loses its own type."
    },
    {
      "label": "TypeError, because Admin was never passed as cls",
      "feedback": "cls is passed just fine: Python binds it to Admin on this call. The body simply ignores it, which is worse than an error because there is nothing to notice."
    },
    {
      "label": "AttributeError, since a method cannot refer to its own class by name",
      "feedback": "It can, and by the time the method runs the class object certainly exists. That is precisely why this bug type-checks, imports cleanly, and ships."
    }
  ]
}
\`\`\`

The first argument is \`cls\`, not the literal class name, and that difference matters. \`cls(...)\` builds whatever class the call was made on, so a subclass inherits the constructor for free:

\`\`\`python
class Admin(User):
    role = "admin"

print(type(Admin.from_csv("grace,7")))   # <class '__main__.Admin'>
\`\`\`

Hard-coding \`User(...)\` inside \`from_csv\` would have returned a \`User\` even when called on \`Admin\`, silently discarding the subclass.

## The class attribute that everyone shares

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "mutable-class-attribute-is-shared",
  "prompt": "class Cart has items = [] written directly in the class body. You build a = Cart() and b = Cart(), then run a.items.append('apple'). What is b.items?",
  "options": [
    {
      "label": "[], because each cart gets its own list",
      "feedback": "Tempting, because the line sits inside the class and reads like a per-object field declaration. The class body runs ONCE, though, so exactly one list object was ever created and both carts see it."
    },
    {
      "label": "['apple']",
      "correct": true,
      "feedback": "Right. There is one list, reached through two names. This is the classic shared-state bug, and it usually surfaces as data leaking between users or between test cases."
    },
    {
      "label": "AttributeError, since items belongs to the class rather than the instance",
      "feedback": "Attribute lookup falls back from the instance to its class, which is what makes a.items resolve at all. That fallback is the whole mechanism behind the surprise."
    },
    {
      "label": "['apple'] when read as Cart.items, but [] when read as b.items",
      "feedback": "You correctly spotted that the class attribute was mutated. Both spellings reach the same object though: b has no items of its own, so b.items IS Cart.items."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "assignment-shadows-instead-of-mutating",
  "prompt": "Same Cart, still with the shared class-level items = []. This time you write a.items = ['x'] instead of appending. What is b.items now?",
  "options": [
    {
      "label": "['x'], the same outcome as the append version",
      "feedback": "Tempting, because the two lines look like they do the same job and the append version really did leak. Assignment behaves completely differently: it binds a NEW attribute on a and never touches the object the class holds."
    },
    {
      "label": "[]",
      "correct": true,
      "feedback": "Right. a now has its own items that shadows the class one, while b still falls back to the untouched class list. Only mutation leaks, which is exactly why the bug is so hard to catch by reading."
    },
    {
      "label": "['x'] for Cart.items, but [] for b.items",
      "feedback": "You have b right, and for the right reason. Cart.items is unchanged too though: assigning through an instance creates an instance attribute rather than reaching up and rebinding the class one."
    },
    {
      "label": "AttributeError, because an instance cannot shadow a class attribute",
      "feedback": "Shadowing is not only allowed, it is the ordinary mechanism: instance attributes always win over class attributes on lookup. That is what makes the fix in __init__ work."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "len-drives-truthiness",
  "prompt": "Deck implements __len__ and nothing else. You build empty = Deck([]) and write if empty: print('ready'). What happens?",
  "options": [
    {
      "label": "It prints ready, because empty is a real object rather than None",
      "feedback": "Tempting, and it is the rule for a plain class: any instance with no relevant dunders is truthy. Adding __len__ changed that silently, because Python consults it when no __bool__ exists."
    },
    {
      "label": "Nothing prints, because Python falls back to __len__ and 0 counts as false",
      "correct": true,
      "feedback": "Right. An empty-but-perfectly-valid object now behaves like None at every if, which is why a deliberate __bool__ is worth writing when size should not decide truthiness."
    },
    {
      "label": "TypeError, since Deck defines no __bool__",
      "feedback": "Truthiness never fails: Python tries __bool__, then __len__, then defaults to true. The chain always produces an answer, which is exactly what makes a wrong answer easy to miss."
    },
    {
      "label": "It prints ready, and only adding __bool__ would change that",
      "feedback": "You have the fix backwards, which is a useful thing to catch now. __bool__ is what you add to OVERRIDE the length-based answer, not what turns the behavior on."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "exit-runs-when-the-body-raises",
  "prompt": "The body of with Timer() as t: raises ValueError on its second line. Does __exit__ run, and what does the caller of this code see?",
  "options": [
    {
      "label": "__exit__ is skipped, because the block never finished normally",
      "feedback": "Tempting, since the remaining lines of the body really are skipped. Cleanup is the one thing that is not: guaranteeing it on the failure path is the entire reason with exists."
    },
    {
      "label": "__exit__ runs, and the ValueError still reaches the caller",
      "correct": true,
      "feedback": "Right. Cleanup happens first, with the exception details handed in as arguments, and then the falsy return lets the error keep travelling. Cleanup and error handling stay separate jobs."
    },
    {
      "label": "__exit__ runs and the ValueError is swallowed, since handling errors is what with is for",
      "feedback": "A natural reading of the name, but with promises cleanup, not rescue. Swallowing only happens if __exit__ deliberately returns something truthy, and doing that by accident hides real bugs."
    },
    {
      "label": "__exit__ runs only when the with statement is itself wrapped in a try block",
      "feedback": "No outer try is needed: the context manager protocol handles the exception path on its own. That independence is why with is safer than a hand-written try/finally you might forget to add."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "exit-return-true-swallows",
  "prompt": "A teammate's __exit__ closes the connection and then ends with return True. A ValueError is raised inside the with body. What does the surrounding code observe?",
  "options": [
    {
      "label": "The ValueError, because __exit__ cannot change what propagates",
      "feedback": "Tempting, because nothing in the with body looks like an except clause and the code reads as pure cleanup. The return value of __exit__ is a genuine decision though, and truthy means suppress."
    },
    {
      "label": "Nothing. Execution resumes after the with block as if the body had succeeded",
      "correct": true,
      "feedback": "Right, and this is the ugliest failure mode in the protocol: the error vanishes, the block appears to pass, and downstream code runs on half-finished state. Return False, or nothing at all."
    },
    {
      "label": "A RuntimeError explaining that an exception was suppressed",
      "feedback": "Suppression is a supported feature, not an anomaly, so Python raises nothing to flag it. contextlib.suppress is built on exactly this mechanism, just made explicit at the call site."
    },
    {
      "label": "The ValueError, but only after the cleanup has finished",
      "feedback": "That is the correct sequence for a normal __exit__ that returns False, so your model of the ordering is sound. The truthy return is what changes the outcome at the end of that sequence."
    }
  ]
}
\`\`\`

### Pitfalls

- **Returning \`True\` from \`__exit__\` by accident.** A bare \`return True\`, or ending with a value that happens to be truthy, silently swallows every exception in the block. Return \`False\` (or nothing at all, since \`None\` is falsy) unless suppressing is the explicit intent.
- **\`__len__\` returning a non-integer.** \`len()\` raises \`TypeError\` if you hand back a float or a string, even when the number is right.
- **Forgetting that \`__len__\` drives truthiness.** An object with \`__len__\` returning \`0\` is falsy. Add \`__bool__\` if that is wrong for your type.
- **Building a list just to iterate.** \`__iter__\` should \`yield\` rather than \`return list(...)\` when the source is large: yielding streams one item at a time instead of materializing the whole collection.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "duck-typing-needs-no-base-class",
  "prompt": "A test swaps the real Deck for a stub that defines __len__, __iter__, and __contains__ and inherits from nothing but object. Do len(stub), sorted(stub), and 'K' in stub work?",
  "options": [
    {
      "label": "No. The stub has to subclass collections.abc.Collection before the built-ins accept it",
      "feedback": "Tempting, because that is how a statically typed language would enforce it and the abc module clearly exists for something. Those base classes are conveniences that supply mixin methods, never an entry requirement."
    },
    {
      "label": "Yes. Each of those built-ins asks for the method and never inspects the class hierarchy",
      "correct": true,
      "feedback": "Right. That is duck typing in one sentence, and it is why a hand-written stub is indistinguishable from the real collection at every call site."
    },
    {
      "label": "Only len works. sorted and in need a real sequence type underneath",
      "feedback": "sorted and in are written against the same protocols: sorted just iterates whatever __iter__ gives it, and in consults __contains__. None of the three looks past the method."
    },
    {
      "label": "Yes, but only after registering the stub with collections.abc first",
      "feedback": "Registration exists so that isinstance checks answer the way you want, which matters if your own code branches on them. The built-ins never ask, so nothing about len, sorted, or in depends on it."
    }
  ],
  "reveal": "Implement the dunder and the syntax starts working. That is the whole contract, and it is why protocols beat inheritance for making a class feel built in."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "plain-dataclass-is-unhashable",
  "prompt": "Point is a plain @dataclass with fields x and y. You write seen = {Point(1, 2)} to start a set of points. What happens?",
  "options": [
    {
      "label": "You get a one-element set",
      "feedback": "Tempting, because a dataclass feels like a tidy little value type and value types are exactly what you want in a set. Generating __eq__ has a side effect though: it sets __hash__ to None, and a set needs a hash."
    },
    {
      "label": "TypeError: unhashable type: 'Point'",
      "correct": true,
      "feedback": "Right. Add frozen=True and you get __hash__ back along with immutability, which is why value objects meant for sets and dict keys are usually frozen."
    },
    {
      "label": "It works, but two equal Points would count as two separate elements",
      "feedback": "That is what you would get with eq=False, where instances fall back to identity for both equality and hashing. A plain dataclass has the opposite problem: equality works and hashing is gone."
    },
    {
      "label": "TypeError, because a dataclass has no __eq__ to compare set members with",
      "feedback": "The decorator generates __eq__ by default, so comparison is exactly the part that does work. The missing piece is the hash, which is what a set uses to find the right bucket before it ever compares."
    }
  ]
}
\`\`\`

Which methods the decorator writes depends on the flags you pass it:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["You write", "Generates", "Instances are"],
  "rows": [
    ["@dataclass", "__init__, __repr__, __eq__", "mutable, and NOT hashable"],
    ["@dataclass(frozen=True)", "the above plus __hash__", "immutable, so usable as dict keys and in sets"],
    ["@dataclass(order=True)", "the above plus __lt__, __le__, __gt__, __ge__", "sortable, compared field by field"],
    ["@dataclass(eq=False)", "__init__ and __repr__ only", "compared by identity, like a plain class"],
    ["@dataclass(slots=True)", "the same three, using __slots__ instead of a per-instance __dict__", "smaller and faster, and any attribute you did not declare raises AttributeError"],
    ["@dataclass(kw_only=True)", "an __init__ that only accepts keyword arguments", "built as Point(x=1, y=2); a positional Point(1, 2) raises TypeError"]
  ],
  "highlightCols": ["Instances are"],
  "caption": "The first row is the surprise: defining __eq__ sets __hash__ to None, so a plain dataclass cannot go in a set or be a dict key. frozen=True is what gives it back, which is why value objects are usually frozen."
}
\`\`\`

\`slots\` and \`kw_only\` (both 3.10+) are worth reaching for even outside an interview. \`slots=True\` swaps the per-instance \`__dict__\` for \`__slots__\`, which is faster, smaller, and turns a typo'd attribute into an immediate \`AttributeError\` instead of a silent new field. \`kw_only=True\` forces every field to be passed by keyword, which keeps a constructor readable once it grows past two or three fields.

\`\`\`python
from dataclasses import dataclass

@dataclass(slots=True, kw_only=True)
class Point:
    x: int
    y: int

p = Point(x=1, y=2)   # kw_only: a positional Point(1, 2) would raise TypeError
p.z = 3                # AttributeError: slots removed the instance __dict__
\`\`\`

### Type hints describe intent, they do not enforce it

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "annotations-are-not-checked",
  "prompt": "Point is a @dataclass declaring x: int and y: int. Somebody calls Point('a', 'b'). What happens when that line runs?",
  "options": [
    {
      "label": "TypeError, because 'a' is not an int",
      "feedback": "Tempting, because the annotation is right there in the class and the decorator clearly read it to build __init__. It read the NAMES and their order, not the types: nothing in the generated code checks what you pass."
    },
    {
      "label": "It builds Point(x='a', y='b') without a word of complaint",
      "correct": true,
      "feedback": "Right. Annotations are metadata for readers and for tools like mypy. If you need the guarantee at runtime, validate in __post_init__ or reach for a library like pydantic."
    },
    {
      "label": "It builds the object but coerces each field to 0, since int is declared",
      "feedback": "Nothing coerces anything: the generated __init__ assigns exactly the object you handed in. Silent coercion would arguably be worse, since it would destroy data rather than merely permit it."
    },
    {
      "label": "It builds the object and emits a runtime warning about the mismatch",
      "feedback": "There is no warning either, which is the part that surprises people coming from typed languages. The check happens only when you actually run a type checker over the code."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "dataclass-refuses-mutable-default",
  "prompt": "You write items: list = [] as a field inside a @dataclass. What happens?",
  "options": [
    {
      "label": "Every instance ends up sharing one list, the same trap as a mutable class attribute",
      "feedback": "Tempting, and it is exactly the trap the rule exists to prevent, so the reasoning is sound. Dataclasses are stricter than plain classes here: rather than let the shared list happen, the decorator refuses to build the class."
    },
    {
      "label": "ValueError while the class is being created: a mutable default is not allowed",
      "correct": true,
      "feedback": "Right, and it fails at import time rather than in production. Use field(default_factory=list) so the factory runs once per instance."
    },
    {
      "label": "Each instance gets its own empty list, because the decorator copies defaults",
      "feedback": "Nothing copies defaults anywhere in Python, which is the root of this whole family of bugs, mutable function defaults included. default_factory is how you ask for a fresh value per instance."
    },
    {
      "label": "It works until a second instance exists, and then raises",
      "feedback": "Errors do not wait for a second instance: the class body is evaluated once, at definition time, and that is where this one is caught. Immediate failure is the point of the restriction."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "dataclass-eq-requires-same-type",
  "prompt": "Point is a @dataclass with fields x and y. What is Point(1, 2) == (1, 2)?",
  "options": [
    {
      "label": "True, since the field values match the tuple's items in order",
      "feedback": "Tempting, because the repr looks tuple-shaped and the values line up perfectly. The generated __eq__ compares the field tuple only after confirming the other object is the same dataclass, so a real tuple never gets that far."
    },
    {
      "label": "False",
      "correct": true,
      "feedback": "Right. Equality here means same type and same fields. The method returns NotImplemented against anything else, and Python resolves that to False."
    },
    {
      "label": "TypeError: a Point and a tuple cannot be compared",
      "feedback": "That is what ORDERING would do, since < between unrelated types raises. Equality is required to always produce an answer, so it falls back to False rather than raising."
    },
    {
      "label": "True, but only when the dataclass is declared with order=True",
      "feedback": "order=True adds <, <=, >, and >=, and those are just as type-strict as equality is. No flag makes a dataclass compare equal to a plain tuple."
    }
  ],
  "reveal": "Two rules to carry: a dataclass equals only its own type with matching fields, and adding frozen=True is what makes such a value object usable as a dict key or set member."
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "except-catches-only-its-own-type",
  "prompt": "safe_divide wraps a / b in try and catches ZeroDivisionError, returning None. A caller passes b as the string '2' instead of a number. What does that caller see?",
  "options": [
    {
      "label": "None, because the except branch handles whatever goes wrong in the try",
      "feedback": "Tempting, because the try block does mark the risky region and returning None reads like a general fallback. An except clause is a filter, though: it only catches the class you named and its subclasses, and TypeError is not one of them."
    },
    {
      "label": "A TypeError propagating out of safe_divide",
      "correct": true,
      "feedback": "Right, and that is the behavior you want. A bad argument type is a caller bug, not a divide-by-zero, and hiding it behind None would send the wrong value downstream."
    },
    {
      "label": "5.0, because Python converts the string to a number for the division",
      "feedback": "Python does no implicit numeric conversion for strings, which is deliberate: '2' could just as easily be data that must never be treated as a number. int('2') is how you opt in."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "return-inside-finally-wins",
  "prompt": "A function's try block does return 'a' and its finally block does return 'b'. What does calling that function give you?",
  "options": [
    {
      "label": "'a', because the try block reached its return first",
      "feedback": "Tempting, because the try really did run first and had its answer ready. finally runs on the way out, though, and a return there replaces the value already in flight."
    },
    {
      "label": "'b'",
      "correct": true,
      "feedback": "Right, and the same override applies to exceptions: a return in finally discards an in-flight exception entirely, so the error simply disappears. Do cleanup in finally, never return from it."
    },
    {
      "label": "'a' first and 'b' ignored, since a function can only return once",
      "feedback": "A function does return once, so the instinct is sound. The question is which value survives, and the later return wins because finally executes after the try has handed its value over but before the caller receives it."
    },
    {
      "label": "SyntaxError, because return is not allowed inside finally",
      "feedback": "It is legal, which is unfortunate given how surprising the behavior is. Linters flag it precisely because the language will not."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bare-except-hides-real-bugs",
  "prompt": "You guard a division with a bare except: that returns None. Months later someone mistypes a variable name on a line inside that same try block. What does the caller see?",
  "options": [
    {
      "label": "A NameError traceback pointing straight at the typo",
      "feedback": "Tempting, because that is what you get everywhere else in the file and it is what you would want here. A bare except catches every exception class, and NameError is one of them."
    },
    {
      "label": "None, indistinguishable from a genuine divide-by-zero, with the typo invisible",
      "correct": true,
      "feedback": "Right. The bug is not just hidden, it is disguised as a handled case. A bare except also swallows KeyboardInterrupt and SystemExit, so it can make a process refuse to stop."
    },
    {
      "label": "None, plus a warning that an unexpected exception type was caught",
      "feedback": "Nothing warns you. The handler was written to accept anything, so from Python's point of view catching a NameError is the code working exactly as instructed."
    },
    {
      "label": "The typo is reported at import time, before any except clause can hide it",
      "feedback": "Import only checks that the syntax parses. A name is resolved when the line actually runs, which is inside the try, which is inside the reach of the bare except."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "open-w-truncates-immediately",
  "prompt": "A 2 GB log file exists. You run open(path, 'w') meaning to add a line to it, and the process is killed before you write anything. What is in the file afterwards?",
  "options": [
    {
      "label": "The original 2 GB, since nothing was ever written",
      "feedback": "Tempting, because it feels like a file can only change when you write to it. Opening in w mode is itself a destructive act: the file is truncated to zero bytes at open time, before your first write call."
    },
    {
      "label": "Nothing. The file was emptied the moment it was opened",
      "correct": true,
      "feedback": "Right, and there is no undo. Use a when you mean to add to a file, and x when you are creating something that must not already exist."
    },
    {
      "label": "The original contents plus a partially written line",
      "feedback": "That is roughly what a mode gives you, where writes are appended to the existing end. In w mode there is no existing content left to append to."
    },
    {
      "label": "An error, because w refuses to open a file that already exists",
      "feedback": "You are describing x mode, which raises FileExistsError and is the safe choice when you must not clobber anything. w is the opposite: it clobbers without asking."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "csv-values-stay-strings",
  "prompt": "csv.reader parses the row Ada,30 into a list. You take the second value and add 1 to it. What happens?",
  "options": [
    {
      "label": "The value is the int 30, so you get 31",
      "feedback": "Tempting, because the cell holds nothing but digits and most spreadsheet tools would treat it as a number. A CSV file has no type information at all, so the reader hands every cell back as a str and leaves the decision to you."
    },
    {
      "label": "The value is the string '30', and adding 1 raises TypeError",
      "correct": true,
      "feedback": "Right. Convert at the boundary with int() or float(), and do it where you can report a bad row, because that conversion is exactly where malformed data announces itself."
    },
    {
      "label": "The value is the string '30', and adding 1 gives '301'",
      "feedback": "You have the type exactly right, which is the important half. Python will not concatenate a str with an int though: it raises rather than guessing which of the two you meant to convert."
    }
  ]
}
\`\`\`

Every CSV value comes back as a \`str\`. There is no type inference: the number \`30\` in a CSV cell arrives as \`"30"\`, and you must call \`int()\` yourself.

### Pitfalls

- **Do not \`split(",")\` a CSV line.** For \`'"a,b",c'\`, \`str.split(",")\` returns three broken pieces, while \`csv.reader\` correctly returns \`["a,b", "c"]\` because it respects the quotes.
- **\`loads\` vs \`load\`.** Pass a string to \`json.loads\` and a file object to \`json.load\`. Mixing them raises \`TypeError\` or \`AttributeError\`.
- **When reading a real CSV file, open it with \`newline=""\`** so \`csv\` handles line endings itself: \`open(path, newline="")\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "json-roundtrip-loses-tuples",
  "prompt": "point = (1, 2). What is json.loads(json.dumps(point)) == point?",
  "options": [
    {
      "label": "True. Serializing and parsing is a round trip, so you get the tuple back",
      "feedback": "Tempting, because round trip suggests the value survives untouched, and it does survive in the sense that the numbers are all there. JSON has no tuple type, so the shape it can express is an array, and an array parses back as a list."
    },
    {
      "label": "False. It comes back as the list [1, 2]",
      "correct": true,
      "feedback": "Right. Anything that depends on the exact Python type after a serialize-and-parse cycle will break. Sets cannot be serialized at all, and integer dict keys come back as strings."
    },
    {
      "label": "TypeError, because json cannot serialize a tuple",
      "feedback": "That is true of a set, which json refuses outright. A tuple is close enough to an array that json accepts it happily, which is exactly why the loss is quiet."
    },
    {
      "label": "True, but only for tuples whose items are all numbers",
      "feedback": "The item types make no difference here: the container type is what gets flattened. A tuple of strings comes back as a list of strings just the same."
    }
  ],
  "reveal": "Treat JSON as a wire format, not as Python storage. Parse it into the shape your code wants at the boundary, and never assume the type you sent is the type you get back."
}
\`\`\`

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

const writingFilesLesson: PythonLesson = {
  id: "py-l2-writing-files",
  title: "Writing files without losing them",
  summary:
    "Truncate or append on purpose, write real lines, and rename into place so a crash cannot corrupt a file.",
  estimatedMinutes: 13,
  difficulty: "medium",
  skills: ["files", "file-io", "pathlib", "io"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Reading a file is safe. Writing one is not

Every tutorial teaches \`open\` for reading, and reading has one real failure mode: the file is not there. Writing has several, and they destroy data rather than raising. You can empty a file you meant to add to, produce a file with no line breaks in it, leave a half-written file behind when a process is killed, or write something that never reaches the disk at all because you never closed the handle.

None of these are exotic. They are the ordinary results of the defaults, and each has a one-line fix.

> The exercises here really do write files. The editor runs Python on an in-memory filesystem, so anything you create lives for the length of the run and then vanishes, which makes it a safe place to practice the real calls.

### Pick the mode on purpose

The Context managers, JSON and CSV lesson has the full mode table, and the row worth carrying here is the destructive one: \`open(path, "w")\` empties the file the instant it opens it, before your first \`write\`. \`open(path, "a")\` keeps what is there and puts every write at the end.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Way to write", "What it does", "Reach for it when"],
  "rows": [
    ["Path.write_text(s)", "opens, truncates, writes, closes, all in one call", "the whole content already fits in one string"],
    ["open(p, 'w')", "truncates on open, then writes as you go", "you are streaming rows and cannot hold them all"],
    ["open(p, 'a')", "keeps the file, every write lands at the end", "you are adding to a log or an audit trail"],
    ["temp file, then os.replace", "readers see the old file until the instant it becomes the new one", "a half-written file would be worse than a stale one"]
  ],
  "highlightCols": ["Reach for it when"],
  "caption": "The first three differ in what they destroy. The fourth differs in what a reader can ever observe, which is the property that matters once something else is reading the file while you write it."
}
\`\`\`

### \`write\` adds nothing you did not ask for

\`write\` puts exactly the characters you hand it into the file. No newline, no separator, no trailing anything:

\`\`\`python
from pathlib import Path

path = Path("report.txt")
with open(path, "w", encoding="utf-8") as out:
    for line in ["alpha", "beta"]:
        out.write(line + "\\n")     # the \\n is yours to add

Path("small.txt").write_text("alpha\\nbeta\\n", encoding="utf-8")
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "writelines-adds-no-newlines",
  "prompt": "out.writelines(['alpha', 'beta', 'gamma']) runs against a file opened in w mode. How many lines does the file have afterwards?",
  "options": [
    {
      "label": "Three, one per item. The name says lines",
      "feedback": "Tempting, and the name really does invite it: readlines() gives you a list with the newlines still attached, so writelines() reads like the exact inverse. It only inverts the round trip when the strings you pass already END in newlines."
    },
    {
      "label": "One. writelines concatenates the strings and adds no separators at all",
      "correct": true,
      "feedback": "Right, the file holds alphabetagamma. writelines is a loop over write with no formatting of its own, so add the newline yourself or join with a newline first."
    },
    {
      "label": "Zero, since nothing was flushed yet",
      "feedback": "Buffering is a real hazard and is worth worrying about when there is no with block. It affects WHEN the bytes land rather than how they are separated, and closing the file settles it."
    },
    {
      "label": "Three, but only if the file was opened in text mode",
      "feedback": "Text mode does perform one translation, turning a newline into the platform line ending on write. It never invents a newline that your string did not already contain."
    }
  ]
}
\`\`\`

\`Path.write_text\` is the shortest correct way to write a whole small file: it opens, truncates, writes, and closes in one call, and it takes the same \`encoding=\` argument you should always pass.

### Writing CSV needs \`newline=""\`

\`\`\`python
import csv

with open("out.csv", "w", newline="", encoding="utf-8") as fh:
    writer = csv.writer(fh)
    writer.writerow(["name", "age"])
    writer.writerows([["Ada", 30], ["Alan", 41]])
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "csv-writer-needs-newline-empty",
  "prompt": "A csv.writer writes to a file opened with open(path, 'w') on Windows, with no newline argument. What does the output look like?",
  "options": [
    {
      "label": "Correct. csv handles line endings itself",
      "feedback": "It does handle them itself, and that is exactly the problem: it emits a carriage return and a newline, then text mode translates the newline again. Two layers each doing the right thing produce one wrong file."
    },
    {
      "label": "A blank line between every row, because the line ending is written twice",
      "correct": true,
      "feedback": "Right, and it is the single most common csv complaint. Pass newline='' so the file layer stops translating and the csv module owns the line endings alone."
    },
    {
      "label": "Every row on one long line, since no newline was requested",
      "feedback": "The writer always terminates a row, so rows never run together. The failure is one line ending too many rather than one too few."
    },
    {
      "label": "It raises, because csv refuses a file opened without newline=''",
      "feedback": "A raise would be far kinder than what actually happens. The docs ask for newline='' but nothing enforces it, so the damage is a subtly malformed file rather than an error."
    }
  ]
}
\`\`\`

The \`csv\` module writes its own line endings. Opening in text mode without \`newline=""\` lets the file layer translate them a second time, and you get a blank line between every row. The same argument belongs on the read side for the same reason.

### Write to a temp name, then rename

A rename within one filesystem is atomic: a reader sees either the old file or the new one, never a half-written one. That single property is what makes a config or index file safe to regenerate while something else is reading it.

\`\`\`python
import os
from pathlib import Path

def write_atomically(path, text):
    temp = Path(str(path) + ".tmp")
    temp.write_text(text, encoding="utf-8")
    os.replace(temp, path)      # atomic: readers see old or new, never partial
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "atomic-rename-keeps-the-old-file",
  "prompt": "A job writes the new config to config.json.tmp and is then killed, before it reaches os.replace. What does the service read from config.json?",
  "options": [
    {
      "label": "Nothing. config.json was truncated when the write started",
      "feedback": "That is precisely what happens WITHOUT this pattern, and it is the outcome it exists to prevent. Nothing ever opened config.json for writing here, so it was never truncated."
    },
    {
      "label": "The complete old config, untouched",
      "correct": true,
      "feedback": "Right, and a stray .tmp file is the whole cost of the crash. The next run overwrites it, and the service never once saw a half-written config."
    },
    {
      "label": "The partially written new config",
      "feedback": "That is the failure mode of writing in place, where a reader can observe a file mid-write. The partial bytes here are in the .tmp file, which nothing is configured to read."
    },
    {
      "label": "Whichever of the two files the operating system decides is newer",
      "feedback": "Nothing in the filesystem chooses between two paths on your behalf: the service opens the name it was told to open. Modification times only matter to tools that go looking for them."
    }
  ],
  "reveal": "The rule generalizes: make the new thing somewhere harmless, then move it into place in one operation. It is the same shape as a blue-green deploy or an index swap, just at file scale."
}
\`\`\`

### Pitfalls

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "unflushed-writes-are-not-on-disk",
  "prompt": "Code calls out = open(path, 'w'), then out.write('done'), with no with block and no close. The process is killed a second later. What does another process reading the file find?",
  "options": [
    {
      "label": "done, because write puts the characters on disk immediately",
      "feedback": "Tempting, because write returns straight away and reports how many characters it took. It reports what it ACCEPTED: small writes sit in a userspace buffer, and only flush or close pushes them onward."
    },
    {
      "label": "An empty file, because the buffered write was never flushed",
      "correct": true,
      "feedback": "Right, and it is why the with block is not a style preference. Exiting the block closes the file, and closing flushes it, so the bytes are there even if the next line raises."
    },
    {
      "label": "A FileNotFoundError, since the file was never really created",
      "feedback": "The file appears at open time, which is also when its old contents are destroyed in w mode. So there is a file, and its emptiness is the more dangerous outcome of the two."
    },
    {
      "label": "Whatever the file held before, since the write did not complete",
      "feedback": "Opening in w mode truncated the file before a single byte was written, so the old contents were already gone. You lose the old data and do not gain the new."
    }
  ]
}
\`\`\`

- **Always use \`with\`.** It closes the handle on the way out, and closing is what flushes your writes to disk. Without it, a crash between the write and the close loses everything you wrote.
- **\`Path.write_text\` truncates too.** It is a whole-file write, not an append, so calling it twice leaves you with only the second call's content.
- **Create the parent first.** Writing to \`reports/2026/out.txt\` raises \`FileNotFoundError\` when \`reports/2026\` does not exist. \`path.parent.mkdir(parents=True, exist_ok=True)\` first.

**Interview nuance:** "how would you make that write safe?" is a real system-design question at file scale, and the answer is the temp-then-rename pattern. Name the property you are buying, which is that a reader can never observe a partial state, and note that it only holds when the temp file is on the SAME filesystem as the target, because a rename across filesystems is a copy plus a delete and is not atomic. That is the same reasoning that makes an atomic index swap or a blue-green cutover work.`,
    demoCode: `import tempfile
from pathlib import Path

folder = Path(tempfile.mkdtemp())
report = folder / "report.txt"

with open(report, "w", encoding="utf-8") as out:
    for line in ["alpha", "beta"]:
        out.write(line + "\\n")

with open(report, "a", encoding="utf-8") as out:
    out.write("gamma\\n")

print(repr(report.read_text(encoding="utf-8")))   # 'alpha\\nbeta\\ngamma\\n'
print(report.read_text(encoding="utf-8").splitlines())`,
  },
  apply: {
    id: "py-l2-writing-files-apply",
    executionMode: "single-file",
    prompt: `Write a function \`save_lines(lines)\` that writes each string in \`lines\` to a file as its own
line, then returns the file's full contents as one string.

For \`["alpha", "beta"]\` return \`"alpha\\nbeta\\n"\`. Every line ends in a newline, including the last,
and an empty list produces an empty file. Create somewhere private to write with
\`tempfile.mkdtemp()\`.`,
    starterCode: `import tempfile
from pathlib import Path


def save_lines(lines):
    # Build a path under a fresh temp directory, write one line per item, then read it back.
    pass`,
    hints: [
      "`Path(tempfile.mkdtemp()) / 'report.txt'` gives you a private file that nothing else touches.",
      "`write` adds no newline of its own, so build the text as `''.join(line + '\\n' for line in lines)`.",
      "`target.write_text(text, encoding='utf-8')` writes it, and `target.read_text(encoding='utf-8')` reads it back.",
    ],
    referenceSolution: `import tempfile
from pathlib import Path


def save_lines(lines):
    target = Path(tempfile.mkdtemp()) / "report.txt"
    target.write_text("".join(line + "\\n" for line in lines), encoding="utf-8")
    return target.read_text(encoding="utf-8")`,
    testCases: [
      {
        input: { lines: ["alpha", "beta"] },
        expected: "alpha\nbeta\n",
        description: "two lines, each newline-terminated",
      },
      { input: { lines: [] }, expected: "", description: "no lines, so an empty file" },
      {
        input: { lines: ["only"] },
        expected: "only\n",
        description: "one line still gets its newline",
      },
      {
        input: { lines: ["a", "b", "c"] },
        expected: "a\nb\nc\n",
        description: "three lines in order",
      },
    ],
  },
  practice: {
    id: "py-l2-writing-files-practice",
    executionMode: "single-file",
    prompt: `An audit log has to survive the code that writes to it. A deploy script opened the log in \`"w"\`
mode to add a single line, and a month of history went with it, because \`"w"\` empties the file
before the first write lands.

Implement \`append_event(existing, event)\`: write each string in \`existing\` to a fresh file as its own
line, then add \`event\` as one more line WITHOUT rewriting what is already there, and return the
file's lines as a list of strings.

For \`existing = ["login"]\` and \`event = "logout"\` return \`["login", "logout"]\`.`,
    starterCode: `import tempfile
from pathlib import Path


def append_event(existing, event):
    # Write the existing lines, then open the SAME file again in append mode for the new one.
    pass`,
    hints: [
      "`Path(tempfile.mkdtemp()) / 'audit.log'` gives you a private file to build up.",
      "Write the existing lines first with mode `'w'`, one `out.write(line + '\\n')` per item.",
      "Open the same path a second time with mode `'a'`, then `path.read_text(encoding='utf-8').splitlines()` returns the lines without their newlines.",
    ],
    referenceSolution: `import tempfile
from pathlib import Path


def append_event(existing, event):
    path = Path(tempfile.mkdtemp()) / "audit.log"
    with open(path, "w", encoding="utf-8") as out:
        for line in existing:
            out.write(line + "\\n")
    with open(path, "a", encoding="utf-8") as out:
        out.write(event + "\\n")
    return path.read_text(encoding="utf-8").splitlines()`,
    testCases: [
      {
        input: { existing: ["login"], event: "logout" },
        expected: ["login", "logout"],
        description: "the earlier line survives the append",
      },
      {
        input: { existing: [], event: "boot" },
        expected: ["boot"],
        description: "appending to an empty log",
      },
      {
        input: { existing: ["a", "b"], event: "c" },
        expected: ["a", "b", "c"],
        description: "order is preserved",
      },
      {
        input: { existing: ["only"], event: "only" },
        expected: ["only", "only"],
        description: "a repeated event is written twice, not deduplicated",
      },
    ],
  },
}

const textAndBytesLesson: PythonLesson = {
  id: "py-l2-text-and-bytes",
  title: "Text is bytes underneath",
  summary:
    "Encode and decode deliberately, and read the error that says these bytes were never UTF-8.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["bytes", "encoding", "unicode", "decoding"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## The first real wall you hit with real data

Toy data is ASCII, so text feels like a solved problem. Then a partner sends a customer list, one name has an accent in it, and the ingest dies with \`UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe9 in position 0\`. Nothing in the code changed. The bytes changed, and the code had been quietly assuming what those bytes meant.

A file does not contain text. It contains bytes. Text is what you get when you interpret those bytes with a codec, and the whole family of encoding bugs comes from doing that interpretation by accident instead of on purpose.

### \`str\` and \`bytes\` are different types

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Question", "str", "bytes"],
  "rows": [
    ["What it holds", "characters", "raw byte values, 0 to 255"],
    ["How you write a literal", "'hi'", "b'hi'"],
    ["What len() counts", "characters", "bytes"],
    ["How you reach the other one", ".encode('utf-8')", ".decode('utf-8')"],
    ["What a file or socket carries", "never this", "always this"]
  ],
  "highlightCols": ["Question"],
  "caption": "Every file, socket, and HTTP body carries bytes. A str only ever exists inside your program, so encode and decode are the two doors between the outside world and it. Every text bug lives at one of those two doors."
}
\`\`\`

\`\`\`python
text = "café"
raw = text.encode("utf-8")   # b'caf\\xc3\\xa9'
raw.decode("utf-8")          # back to 'café'
\`\`\`

Read \`\\xc3\\xa9\` as "two bytes that no ASCII character claims". UTF-8 spends one byte on every ASCII character and two to four bytes on everything else, which is exactly why it took over: plain English text costs nothing extra, and the rest of the world still fits.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "one-character-is-not-one-byte",
  "prompt": "text = 'cafe' with an accented final e, so four characters. What do len(text) and len(text.encode('utf-8')) return?",
  "options": [
    {
      "label": "4 and 4. One character is one byte",
      "feedback": "Tempting, because it is exactly true for plain ASCII, which is most of the text any tutorial shows you. UTF-8 spends one byte on ASCII and two to four on everything else, so the two lengths agree only by luck."
    },
    {
      "label": "4 and 5, because the accented character costs two bytes",
      "correct": true,
      "feedback": "Right. len on a str counts characters and len on bytes counts bytes, so any column width, buffer size, or truncation computed from one and applied to the other is wrong for real names."
    },
    {
      "label": "5 and 5, because Python counts the accent as its own character",
      "feedback": "A str stores characters rather than the bytes behind them, so this string is four of them however it is stored. The extra byte only appears once you encode it."
    },
    {
      "label": "4 and 8, since UTF-8 always uses two bytes per character",
      "feedback": "Fixed-width two-byte storage is UTF-16's idea, not UTF-8's. UTF-8 is variable width precisely so that ASCII text stays one byte per character and nothing has to be rewritten."
    }
  ]
}
\`\`\`

### Why \`UnicodeDecodeError\` happens

UTF-8 is a structured encoding: a byte in the \`0x80\` to \`0xFF\` range announces a multi-byte sequence and the bytes that follow have to fit the pattern. Bytes written by a different codec usually do not, so the decode fails:

\`\`\`python
raw = bytes([0xe9])          # 'é' as latin-1 wrote it
raw.decode("utf-8")          # UnicodeDecodeError: can't decode byte 0xe9 in position 0
raw.decode("latin-1")        # 'é'
\`\`\`

The error message is unusually good. It names the codec it tried, the offending byte, and the position, which together tell you both what the data probably is and where to look.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "latin1-decodes-any-byte",
  "prompt": "The same bytes are decoded twice, once as utf-8 and once as latin-1, and they are not valid UTF-8. Which call raises?",
  "options": [
    {
      "label": "Both, since the bytes are malformed",
      "feedback": "Malformed is relative to a codec rather than absolute. latin-1 maps all 256 possible byte values to a character, so there is no byte sequence at all that it can call invalid."
    },
    {
      "label": "Only the utf-8 call. latin-1 accepts absolutely any bytes",
      "correct": true,
      "feedback": "Right, and that is the danger rather than a feature: latin-1 never fails, it just hands back the wrong characters. Silent mojibake is far harder to trace than a loud UnicodeDecodeError."
    },
    {
      "label": "Only the latin-1 call, since latin-1 is the narrower codec",
      "feedback": "It is narrower in what it can WRITE, and encoding a character outside its 256 really does raise UnicodeEncodeError. Decoding runs the other direction, where narrow means total: every byte has a meaning."
    },
    {
      "label": "Neither. Python retries with another codec automatically",
      "feedback": "There is no automatic fallback anywhere in the codec machinery, and that is deliberate: guessing an encoding is how corrupted text spreads through a system. A fallback is something you write yourself, as the Practice exercise does."
    }
  ]
}
\`\`\`

### \`errors="replace"\` buys quiet, and it costs data

Every \`decode\` takes an \`errors\` argument. The default is \`"strict"\`, which raises. \`"replace"\` substitutes \`U+FFFD\` (the black diamond question mark) for anything it cannot read:

\`\`\`python
bytes([0xe9]).decode("utf-8", errors="replace")   # '\\ufffd'
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "errors-replace-is-lossy",
  "prompt": "An ingest keeps failing on a few bad bytes, so someone changes the call to raw.decode('utf-8', errors='replace'). What does that buy, and what does it cost?",
  "options": [
    {
      "label": "It repairs the bytes, so the original characters come back",
      "feedback": "Tempting, because the job stops failing and the output looks like text again. Nothing is repaired: the undecodable bytes are swapped for a replacement character and the original values are gone for good."
    },
    {
      "label": "It never raises, but every unreadable byte becomes a replacement character and is lost",
      "correct": true,
      "feedback": "Right. It is the correct tool when you are grepping logs and one garbled line is acceptable, and the wrong tool for anything you will store, bill against, or hand back to a customer."
    },
    {
      "label": "It drops the whole line that contained the bad byte",
      "feedback": "That is closer to errors='ignore', which drops the offending bytes and silently shortens the string. Neither handler works at line granularity, since a decode has no idea where your lines are."
    },
    {
      "label": "It re-decodes the bad bytes as latin-1 automatically",
      "feedback": "A per-byte codec fallback would be a reasonable design, and it is exactly what you build by hand in the Practice exercise. The replace handler has no second codec to try, so it substitutes one fixed character."
    }
  ]
}
\`\`\`

Use \`"replace"\` when a human is going to eyeball the output and a few garbled characters are survivable. Never use it on data you will store, compare, bill against, or send back to a customer, because the replacement is permanent and the original bytes are unrecoverable from that point on.

### Always pass \`encoding=\` when you open a file

\`\`\`python
with open("names.csv", encoding="utf-8") as fh:
    text = fh.read()
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "open-without-encoding-is-platform-dependent",
  "prompt": "open(path) with no encoding argument reads a file holding an accented name. It passes on the author's laptop and raises UnicodeDecodeError in production. Why?",
  "options": [
    {
      "label": "Production runs a different Python version with stricter defaults",
      "feedback": "Version drift is always worth ruling out, and the text defaults really have shifted across recent releases. The classic cause here is the environment rather than the interpreter: with no explicit encoding, open follows the platform locale."
    },
    {
      "label": "With no encoding argument, open uses the platform default, and the two machines disagree",
      "correct": true,
      "feedback": "Right. Pass encoding='utf-8' whenever you know the encoding and the same code then behaves identically on a laptop, in a container, and on a build agent."
    },
    {
      "label": "The file was corrupted on its way to production",
      "feedback": "Worth ruling out with a checksum, and corruption does happen. A file that decodes cleanly on one machine and not on another is usually being read through two different codecs rather than being two different byte streams."
    },
    {
      "label": "Reading is fine, and the real failure is printing to the terminal",
      "feedback": "Console encoding causes its own family of failures, so the suspicion is well aimed. A UnicodeDecodeError names a decode though, and printing a str encodes rather than decodes."
    }
  ],
  "reveal": "Decode once at the input boundary with an encoding you named, work in str everywhere inside, and encode once on the way out. Bugs then have exactly two places to hide instead of being spread over every read."
}
\`\`\`

### Pitfalls

- **\`str\` and \`bytes\` never mix.** \`"a" + b"b"\` raises \`TypeError\`, and \`"abc" == b"abc"\` is \`False\`. Decide which side of the boundary you are on and stay there.
- **Encoding can fail too.** \`"café".encode("ascii")\` raises \`UnicodeEncodeError\`, which is the same problem running the other way.
- **A BOM is real bytes.** A file saved by some Windows tools starts with \`\\xef\\xbb\\xbf\`, and UTF-8 decodes it as an invisible character that then breaks your first column name. \`encoding="utf-8-sig"\` strips it.

**Interview nuance:** the sentence to have ready is "decode at the boundary, work in \`str\`, encode on the way out." It is the same shape as the naive-versus-aware rule for datetimes, and for the same reason: a program is easiest to reason about when every value inside it is already normalized. If pressed on a real incident, name latin-1 as the codec that never raises, so the failure it causes is wrong characters in your database rather than an exception in your logs.`,
    demoCode: `text = "café"
raw = text.encode("utf-8")
print(raw)                      # b'caf\\xc3\\xa9'
print(len(text), len(raw))      # 4 5
print(raw.decode("utf-8"))      # café

latin = bytes([0xe9])
print(latin.decode("latin-1"))                      # é
print(latin.decode("utf-8", errors="replace"))      # the replacement character`,
  },
  apply: {
    id: "py-l2-text-and-bytes-apply",
    executionMode: "single-file",
    prompt: `Write a function \`utf8_byte_values(text)\` that returns the list of byte values UTF-8 uses to
store \`text\`.

For \`"hi"\` return \`[104, 105]\`. For a single accented character it will be two values, not one.`,
    starterCode: `def utf8_byte_values(text):
    # Encode the text as UTF-8, then return its bytes as a list of ints.
    pass`,
    hints: [
      "`text.encode('utf-8')` gives you a `bytes` object.",
      "Iterating a `bytes` object yields ints, so `list(...)` around it is all you need.",
      "`return list(text.encode('utf-8'))`.",
    ],
    referenceSolution: `def utf8_byte_values(text):
    return list(text.encode("utf-8"))`,
    testCases: [
      { input: { text: "hi" }, expected: [104, 105], description: "ASCII costs one byte each" },
      {
        input: { text: "é" },
        expected: [195, 169],
        description: "one character, two bytes",
      },
      {
        input: { text: "€" },
        expected: [226, 130, 172],
        description: "one character, three bytes",
      },
      { input: { text: "" }, expected: [], description: "empty text, no bytes" },
    ],
  },
  practice: {
    id: "py-l2-text-and-bytes-practice",
    executionMode: "single-file",
    prompt: `A partner drops a nightly export onto your SFTP box. Most nights it is UTF-8 and the ingest is
quiet. Then one file is written by an older Windows tool in latin-1, a single accented surname lands
in it, and the whole batch dies on \`UnicodeDecodeError\`. You cannot make the partner change, so the
loader has to cope.

Implement \`decode_with_fallback(byte_values)\`: build \`bytes\` from the list of byte values, decode it
as UTF-8, and when that raises \`UnicodeDecodeError\`, decode it as latin-1 instead. Return the
resulting \`str\` either way.`,
    starterCode: `def decode_with_fallback(byte_values):
    # Try UTF-8 first; fall back to latin-1 only when UTF-8 refuses the bytes.
    pass`,
    hints: [
      "`bytes(byte_values)` turns a list of ints back into a `bytes` object.",
      "Wrap the UTF-8 decode in `try` / `except UnicodeDecodeError`, not a bare `except`.",
      "In the handler, `return raw.decode('latin-1')`, which never raises whatever the bytes are.",
    ],
    referenceSolution: `def decode_with_fallback(byte_values):
    raw = bytes(byte_values)
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1")`,
    testCases: [
      { input: { byte_values: [104, 105] }, expected: "hi", description: "plain ASCII" },
      {
        input: { byte_values: [195, 169] },
        expected: "é",
        description: "valid UTF-8, so the first decode wins",
      },
      {
        input: { byte_values: [233] },
        expected: "é",
        description: "latin-1 bytes, so the fallback runs",
      },
      {
        input: { byte_values: [67, 97, 102, 233] },
        expected: "Café",
        description: "ASCII plus one latin-1 byte",
      },
    ],
  },
}

const modulesLesson: PythonLesson = {
  id: "py-l2-modules",
  title: "Modules, imports & the standard library",
  summary: "Organize code into modules and reach for Python's batteries-included stdlib.",
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "import-math-does-not-bind-gcd",
  "prompt": "Your file's only import line is import math. Further down you call gcd(12, 8). What happens?",
  "options": [
    {
      "label": "It returns 4, because importing a module makes its names available",
      "feedback": "Tempting, because the import clearly succeeded and the function clearly exists. What the import bound is a single name, math, and gcd lives as an attribute on it rather than in your file."
    },
    {
      "label": "NameError: name 'gcd' is not defined",
      "correct": true,
      "feedback": "Right. Either reach it through the module as math.gcd(12, 8), or bind it directly with from math import gcd. Mixing the two styles is what produces this error."
    },
    {
      "label": "AttributeError: module 'math' has no attribute 'gcd'",
      "feedback": "That is the message you would get from math.gcd if the name were genuinely missing from the module, so it is worth telling the two apart. Here the lookup never reaches math at all: Python is searching your own file's namespace."
    },
    {
      "label": "It returns 4, since gcd is also available as a builtin",
      "feedback": "A reasonable guess given how many small numeric helpers are builtins. gcd is not one of them: math.gcd is where it lives, alongside a version in the fractions module."
    }
  ]
}
\`\`\`

### Pitfall: do not name your file after a stdlib module

If you save your own file as \`collections.py\`, your file shadows the real one, and \`import collections\` imports *your* file. You get a confusing \`ImportError\` or \`AttributeError\` on names that clearly exist. The fix: never name a script after a stdlib module you import, and delete any stray \`.pyc\` files or \`__pycache__\` folders left behind. A related trap is mixing import styles: after \`import math\` alone, writing \`gcd(12, 8)\` raises \`NameError\`, because the name lives at \`math.gcd\`, not in your file.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "most-common-breaks-ties-by-first-seen",
  "prompt": "What does Counter('abcabx').most_common(1) return? Both a and b appear twice.",
  "options": [
    {
      "label": "Either [('a', 2)] or [('b', 2)]. Ties are arbitrary, so you cannot rely on which",
      "feedback": "Tempting, and it is the safe-sounding answer people give in interviews. It is more pessimistic than reality: dicts have preserved insertion order since Python 3.7, and most_common inherits that, so the result is fully determined."
    },
    {
      "label": "[('a', 2)]",
      "correct": true,
      "feedback": "Right. Ties come back in the order the keys were first encountered while building the Counter, and a was seen before b. If your spec wants a different tiebreak, sort explicitly."
    },
    {
      "label": "[('b', 2)], because b was the last key to reach a count of 2",
      "feedback": "Recency is not the rule, and neither is alphabetical order among the tied keys. What decides it is first insertion, which happened when the character was first counted, not when it reached its final tally."
    },
    {
      "label": "[('a', 2), ('b', 2)], because most_common returns every item tied for the top",
      "feedback": "The argument is a hard limit on the number of pairs returned, so asking for 1 gives exactly 1 even in a tie. Call most_common() with no argument if you want the whole ranking and want to inspect the ties yourself."
    }
  ],
  "reveal": "The honest interview answer is that the winner is the first key to reach the top count, and that if the requirement is alphabetical or newest-first you must sort for it rather than trust most_common."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "patterns-need-raw-strings",
  "prompt": "You write a word-boundary pattern as an ordinary string, '\\\\bcat\\\\b', with no r prefix. What is the risk?",
  "options": [
    {
      "label": "None. Python treats the backslash the same way in both kinds of string",
      "feedback": "Tempting, because some patterns really do survive it: an unrecognized escape like the one in a digit class is left alone, so the code appears to work. The escapes Python DOES recognize are the problem, and \\\\b is one of them."
    },
    {
      "label": "Python turns \\\\b into a backspace character, so the pattern looks for a literal backspace instead of a word boundary",
      "correct": true,
      "feedback": "Right, and nothing raises: you get a valid pattern that quietly matches nothing. The r prefix stops Python interpreting the backslash so the regex engine receives it intact."
    },
    {
      "label": "It is an immediate SyntaxError, so you find out at once",
      "feedback": "That would be the kind outcome. Recognized escapes are substituted silently, and unrecognized ones only produce a SyntaxWarning in Python 3.12 and later, which is easy to miss in a noisy log."
    },
    {
      "label": "The re module rejects any pattern that is not a raw string",
      "feedback": "re only ever receives a finished str and has no way to know how it was spelled. By the time the pattern arrives, the damage from an interpreted escape has already been done."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "capture-groups-reshape-findall",
  "prompt": "What does re.findall(r'(\\\\w+)@(\\\\w+)', 'a@x b@y') return?",
  "options": [
    {
      "label": "['a@x', 'b@y'], the two full matches",
      "feedback": "Tempting, because that is what the same pattern returns without the parentheses, and parentheses usually just group things for a quantifier. In findall they change the return shape: once any group exists, the full match is no longer what you get."
    },
    {
      "label": "[('a', 'x'), ('b', 'y')]",
      "correct": true,
      "feedback": "Right. No groups gives you full matches, one group gives you just that group, and two or more give you a tuple per match. Use a non-capturing group (?:...) when you want to group without changing the result."
    },
    {
      "label": "['a', 'x', 'b', 'y'], every group flattened into one list",
      "feedback": "A very reasonable expectation, and it is what you would have to write yourself if you wanted it. findall keeps each match's groups together as a tuple, which is usually what you want for unpacking in a loop."
    },
    {
      "label": "['a', 'b'], only the first group of each match",
      "feedback": "That is exactly the behavior with ONE group in the pattern, so this answer is a good instinct applied one step too narrowly. With two groups, both are reported."
    }
  ]
}
\`\`\`

**A capture group changes what \`findall\` returns.** With no group it returns the full match; with one group it returns only that group; with several it returns tuples:

\`\`\`python
re.findall(r"\\w+@\\w+", "a@x b@y")     # ['a@x', 'b@y']
re.findall(r"(\\w+)@(\\w+)", "a@x b@y") # [('a', 'x'), ('b', 'y')]
\`\`\`

So do not wrap your whole pattern in \`()\` out of habit; it silently reshapes the result.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "greedy-star-runs-to-the-last-match",
  "prompt": "What does re.findall(r'<.*>', '<a><b>') return?",
  "options": [
    {
      "label": "['<a>', '<b>'], the two tags",
      "feedback": "Tempting, because it is obviously what the pattern was meant to express and what a human reads it as. Quantifiers are greedy: .* takes as much text as it can and then backtracks only far enough to let the closing > match, which is the LAST one in the string."
    },
    {
      "label": "['<a><b>'], one match spanning both tags",
      "correct": true,
      "feedback": "Right. Add a question mark to make the quantifier lazy, so r'<.*?>' stops at the first > and gives you the two tags you wanted."
    },
    {
      "label": "['<a>'], because the engine stops after the first match",
      "feedback": "findall never stops at the first match: it keeps scanning from the end of each match to the end of the string. Here the single greedy match consumed everything, so there was nothing left to scan."
    },
    {
      "label": "[], because . does not match the > character",
      "feedback": "The dot matches any character except a newline, angle brackets included. The character it will not cross is the newline, which is why multi-line scraping with .* fails for a completely different reason."
    }
  ],
  "reveal": "Greedy first, lazy on request. When a pattern swallows more than you expected, the fix is almost always a question mark after the quantifier, or a negated character class such as [^>]* that cannot cross the delimiter at all."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "defaultdict-factory-must-be-callable",
  "prompt": "Meaning for every new key to start as an empty list, you write groups = defaultdict([]). What happens?",
  "options": [
    {
      "label": "It works. Each missing key gets an empty list",
      "feedback": "Tempting, because you have literally handed it the empty list you want, and that reads like the most direct way to say it. defaultdict wants a FACTORY it can call once per new key, not one finished value to hand out."
    },
    {
      "label": "TypeError: first argument must be callable or None",
      "correct": true,
      "feedback": "Right, and the failure is immediate rather than lurking. Pass the callable itself: defaultdict(list), defaultdict(set), defaultdict(int)."
    },
    {
      "label": "It works, but every key ends up sharing the same list",
      "feedback": "That is precisely the bug this design prevents, and it is the same trap as a mutable default argument, so the reasoning is excellent. Requiring a callable is how defaultdict guarantees a fresh object per key."
    },
    {
      "label": "KeyError on the first missing key, because no valid factory was registered",
      "feedback": "The construction fails before you ever reach a lookup, so no key access happens. A KeyError from a defaultdict does have one real cause: passing None as the factory turns it back into an ordinary dict."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "defaultdict-read-inserts-the-key",
  "prompt": "groups = defaultdict(list) currently holds one key, 'a'. To check whether 'b' has any entries you write if groups['b']: and the branch does not run. What is len(groups) now?",
  "options": [
    {
      "label": "1, because reading a key never modifies a dict",
      "feedback": "Tempting, and it is exactly true of a plain dict, where a missing key raises instead of appearing. defaultdict works by CREATING the value on a missing lookup, so the read is a write."
    },
    {
      "label": "2. The lookup inserted 'b' with a fresh empty list",
      "correct": true,
      "feedback": "Right, and the branch still did not run because the new list is falsy, so nothing looks wrong until you iterate or serialize the dict later. Use groups.get('b') to peek without mutating."
    },
    {
      "label": "1, because the empty list is falsy and therefore discarded",
      "feedback": "Nothing cleans up after a falsy default: the key is stored the moment the factory runs, and its truthiness never comes into it. The falsiness is only why the if looked like it behaved."
    },
    {
      "label": "It raises KeyError, which is what the if was guarding against",
      "feedback": "Never raising on a missing key is the whole point of a defaultdict, and it is why the guard is unnecessary here. That convenience is exactly what makes the silent insertion easy to miss."
    }
  ]
}
\`\`\`

- Merely reading a missing \`defaultdict\` key inserts it: touching \`d["x"]\` when \`x\` is absent leaves \`d["x"] == []\` behind. Use \`d.get("x")\` when you only want to peek without mutating.
- \`defaultdict([])\` raises \`TypeError\`. The factory must be callable, so pass \`list\`, \`set\`, or \`int\`, never an instance.
- \`Counter\` never raises on a missing key, which is handy but hides typos: \`c["speling"]\` quietly returns \`0\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "list-pop-zero-is-quadratic",
  "prompt": "A BFS keeps its frontier in a plain list and takes the next node with queue.pop(0). Over a graph of n nodes, what does that dequeuing cost in total?",
  "options": [
    {
      "label": "O(n): one pop per node, and a pop is a constant-time operation",
      "feedback": "Tempting, because popping from the END of a list really is constant time, and the loop plainly runs once per node. Popping from the FRONT is different: every remaining element has to shift down one slot to close the gap."
    },
    {
      "label": "O(n squared), because each pop(0) shifts every remaining element down one slot",
      "correct": true,
      "feedback": "Right, and nothing in the code looks slow, which is why this survives review. Swap in a deque and popleft() makes the same loop O(n) with a one-line change."
    },
    {
      "label": "O(n log n), the usual cost of maintaining an ordered structure",
      "feedback": "That is the shape of a heap or a balanced tree, where each operation pays a logarithmic price. A Python list is a contiguous array, so a front removal costs linear time, not logarithmic."
    },
    {
      "label": "O(n), because a Python list is a linked list underneath",
      "feedback": "This names the exact assumption that makes the bug invisible. Python's list is a dynamic array of pointers, so index access is O(1) but any insertion or removal near the front moves everything after it."
    }
  ],
  "reveal": "Reach for deque whenever you take from one end and add to the other. It is the standard queue for BFS and sliding windows, and the only thing you give up is O(1) indexing into the middle."
}
\`\`\`

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

const datetimesLesson: PythonLesson = {
  id: "py-l2-datetimes",
  title: "Dates, times & the naive-vs-aware trap",
  summary: "Parse and format timestamps, subtract them safely, and never mix naive with aware.",
  estimatedMinutes: 13,
  difficulty: "medium",
  skills: ["datetime", "timezones", "timedelta", "strptime"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Two mistakes cause most time bugs

Timestamps look like the simplest data you will ever handle, and they are behind a startling share of production incidents. Two mistakes cause most of them. The first is a format string that does not match the text you were handed, so a batch job either dies halfway through or, worse, reads \`03/08\` as the eighth of March in one service and the third of August in another. The second is mixing a datetime that knows its offset from UTC with one that does not, which either raises the moment you compare them or quietly reports a duration that is wrong by exactly the size of an offset. Both are cheap to avoid once you know where the seam is.

### \`date\` is a calendar day, \`datetime\` is a day plus a clock

They are separate types and Python will not blur them for you:

\`\`\`python
from datetime import date, datetime

day = date(2026, 3, 8)                    # 2026-03-08, no time of day
stamp = datetime(2026, 3, 8, 1, 59, 30)   # 2026-03-08 01:59:30
stamp.date()                              # back to a plain date
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "date-and-datetime-never-compare-equal",
  "prompt": "day = date(2026, 3, 8) and stamp = datetime(2026, 3, 8, 0, 0, 0), midnight on that exact day. What is day == stamp?",
  "options": [
    {
      "label": "True. Midnight is the instant that calendar day begins",
      "feedback": "Tempting, because midnight really is the moment the day starts, and datetime is even a subclass of date. Python still answers False: the two values carry different amounts of information, so it refuses to treat them as the same thing."
    },
    {
      "label": "False. A date and a datetime are never equal, whatever the clock reads",
      "correct": true,
      "feedback": "Right, and it answers False instead of raising, so a filter that mixes the two quietly matches nothing at all. Call stamp.date() first and compare like with like."
    },
    {
      "label": "TypeError, because the operands are different types",
      "feedback": "Ordering them with a less-than does raise TypeError, so the instinct is sound. Equality is more forgiving in Python: values it considers non-comparable come back False rather than blowing up."
    },
    {
      "label": "True, but only when the datetime carries no timezone",
      "feedback": "Timezone awareness has no bearing on this one, since the mismatch is between a day and a day-plus-clock. An aware datetime is exactly as unequal to a date as a naive one is."
    }
  ]
}
\`\`\`

Reach for \`date\` when the clock genuinely does not matter (a birthday, a billing day) and \`datetime\` when it does. Mixing the two in one column is how a report ends up comparing a whole day against one specific second of it.

### \`strptime\` reads text, \`strftime\` writes it

Memorize them by the middle letter: \`strptime\` **p**arses a string into a datetime, \`strftime\` **f**ormats a datetime into a string. Both take the same format codes.

\`\`\`python
from datetime import datetime

parsed = datetime.strptime("08/03/2026 01:59:30", "%d/%m/%Y %H:%M:%S")
parsed.strftime("%Y-%m-%dT%H:%M:%S")   # '2026-03-08T01:59:30'
parsed.isoformat()                     # same string, no format to mistype
\`\`\`

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Code", "Reads or writes", "In 2026-03-08 01:59:30"],
  "rows": [
    ["%Y", "four-digit year", "2026"],
    ["%m", "zero-padded month number", "03"],
    ["%d", "zero-padded day of the month", "08"],
    ["%H", "hour on a 24-hour clock", "01"],
    ["%M", "minute", "59"],
    ["%S", "second", "30"],
    ["%z", "offset from UTC, such as +0000", "absent here, so the result is naive"]
  ],
  "highlightCols": ["Code"],
  "caption": "The same codes work in both directions: strptime reads them out of text and strftime writes them into text. %m is the month and %M is the minute, and swapping the two is the classic typo."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "strptime-format-must-match-exactly",
  "prompt": "A vendor changes its export from 2026-03-08 to 2026/03/08 and your loader still calls datetime.strptime(text, '%Y-%m-%d'). What happens on the first row?",
  "options": [
    {
      "label": "It parses. strptime normalizes common separators",
      "feedback": "Tempting, because any human reading both strings sees the same date and plenty of parsers do normalize separators. strptime is not one of them: the literal characters between the codes have to match the input too."
    },
    {
      "label": "It raises ValueError and the load stops on row one",
      "correct": true,
      "feedback": "Right, and a loud stop at the boundary is the good outcome here. Catch it per row if you want to quarantine bad input, but never let an unparsed date through quietly."
    },
    {
      "label": "It returns None, so the row is skipped",
      "feedback": "Nothing in the datetime module signals failure by returning None, which would only push the error onto whatever touched the value next. It raises, so the blame lands on the parse itself."
    },
    {
      "label": "It parses partially and defaults the day to 1",
      "feedback": "Partial matching would be far more dangerous than failing, because a wrong but plausible date then survives into a report. strptime either consumes the whole string or raises."
    }
  ]
}
\`\`\`

The format has to match the input exactly, separators included. A mismatch raises \`ValueError\` rather than guessing, which is the behavior you want: a loud failure at the boundary beats a silently wrong date in a report. When the text is already ISO 8601, skip the format string entirely and call \`datetime.fromisoformat\`, which is faster and impossible to mistype.

### Subtracting two datetimes gives a \`timedelta\`

\`\`\`python
from datetime import datetime, timedelta

start = datetime(2026, 3, 8, 1, 0, 0)
end = datetime(2026, 3, 9, 1, 0, 30)
gap = end - start             # timedelta(days=1, seconds=30)
gap.total_seconds()           # 86430.0
start + timedelta(hours=2)    # 2026-03-08 03:00:00
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "timedelta-seconds-is-not-the-total",
  "prompt": "gap = datetime(2026, 3, 9, 1, 0, 30) - datetime(2026, 3, 8, 1, 0, 0). What does gap.seconds return?",
  "options": [
    {
      "label": "86430, the whole gap expressed in seconds",
      "feedback": "That is what gap.total_seconds() returns, and it is almost always the number you actually wanted. The plain seconds attribute is one of three raw storage fields, so it never counts the days."
    },
    {
      "label": "30, the seconds left over once the whole days are counted",
      "correct": true,
      "feedback": "Right. A timedelta stores days, seconds, and microseconds separately, so seconds only ever ranges from 0 to 86399. Call total_seconds() when you want a single number."
    },
    {
      "label": "1, because the gap is one day and a bit",
      "feedback": "That is gap.days, the field holding the whole days. Reading days and seconds together does work, but total_seconds() says it in one step and cannot be half remembered."
    },
    {
      "label": "30.0 as a float, since durations are stored as floats",
      "feedback": "You picked the right field and the wrong type: days, seconds, and microseconds are all plain ints. total_seconds() is the float one, because it has to carry the microseconds."
    }
  ]
}
\`\`\`

A \`timedelta\` stores days, seconds, and microseconds as three separate fields, so \`gap.seconds\` is the leftover inside the final day and not the total. Ask for \`gap.total_seconds()\` whenever you want one number, then divide.

### Naive vs aware: the one that pages you at 3am

A **naive** datetime carries no timezone, so it is a wall-clock reading with no way to know which wall. An **aware** datetime carries a \`tzinfo\`, so it pins an exact instant. \`datetime.now()\` hands you a naive one; \`datetime.now(timezone.utc)\` hands you an aware one.

\`\`\`python
from datetime import datetime, timezone

naive = datetime(2026, 3, 8, 1, 0, 0)
aware = datetime(2026, 3, 8, 1, 0, 0, tzinfo=timezone.utc)
naive.utcoffset()   # None, this one does not know
aware.utcoffset()   # 0:00:00
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "aware-minus-naive-raises",
  "prompt": "A log parser produces naive datetimes and an API client produces aware UTC ones. Your latency metric subtracts one from the other. What happens?",
  "options": [
    {
      "label": "It works, and Python assumes the naive value is UTC",
      "feedback": "Tempting, because most servers really do run on UTC and the assumption would be right most of the time. Python declines to guess: an assumption that holds most of the time is a bug for exactly the cases where it does not."
    },
    {
      "label": "TypeError, because offset-naive and offset-aware datetimes cannot be subtracted",
      "correct": true,
      "feedback": "Right, and this is the module protecting you. Attach the offset where the naive value is born, or convert once at the boundary, so everything downstream is aware UTC."
    },
    {
      "label": "It works, and the answer is off by the size of the offset",
      "feedback": "That is precisely the failure Python is preventing, and it is what you get in languages that coerce silently. Here the same mistake surfaces as a raise rather than as a plausible wrong number."
    },
    {
      "label": "It works, and the answer is always negative",
      "feedback": "Sign has nothing to do with it, since a later instant minus an earlier one is positive however the offsets fall. The operand types alone are what Python rejects."
    }
  ],
  "reveal": "Store and compute in UTC, and convert to local time only when a human is about to read it. Parse into aware UTC at the boundary and every comparison after that is safe."
}
\`\`\`

Python refuses to subtract or order a naive datetime against an aware one, because there is no honest answer. The rule that keeps this out of a codebase for good: store and compute in UTC, and convert to local only when you show a value to a human. Parse at the boundary into aware UTC, compare there, and format for display last. The Practice exercise makes you enforce exactly that rule before it trusts a subtraction.

### Pitfalls

- \`datetime.utcnow()\` returns a **naive** datetime that happens to hold UTC time, which is the worst of both worlds: it looks safe and it compares wrong. Use \`datetime.now(timezone.utc)\`.
- Adding \`timedelta(days=1)\` adds exactly 24 hours. Across a daylight-saving change that is not the same wall-clock time the next day, which is why "every day at 09:00" jobs drift twice a year.
- \`fromisoformat\` returns an aware datetime when the text carries an offset like \`+00:00\` and a naive one when it does not. One function, two kinds of result, so check \`utcoffset()\` instead of assuming.

**Interview nuance:** "naive or aware?" is the fastest way to sound like you have run a system in production. Say that you normalize to aware UTC at every input boundary, keep UTC in storage and in every comparison, and render local time only in the presentation layer. Then name the two failure modes you are buying your way out of: the \`TypeError\` when the two kinds meet, and the silent off-by-an-offset duration you get in any language that coerces instead of raising.`,
    demoCode: `from datetime import datetime, timedelta, timezone

parsed = datetime.strptime("08/03/2026 01:59:30", "%d/%m/%Y %H:%M:%S")
print(parsed.isoformat())          # 2026-03-08T01:59:30

gap = datetime(2026, 3, 9, 1, 0, 30) - datetime(2026, 3, 8, 1, 0, 0)
print(gap.seconds, gap.total_seconds())   # 30 86430.0

print(datetime(2026, 3, 8, tzinfo=timezone.utc).utcoffset())   # 0:00:00
print(datetime(2026, 3, 8).utcoffset())                        # None`,
  },
  apply: {
    id: "py-l2-datetimes-apply",
    executionMode: "single-file",
    prompt: `Write a function \`to_iso(stamp)\` that returns the ISO 8601 form of a day-first timestamp.

The input looks like \`"08/03/2026 01:59:30"\`, meaning day, then month, then year. Return
\`"2026-03-08T01:59:30"\`.`,
    starterCode: `from datetime import datetime


def to_iso(stamp):
    # Parse the day-first timestamp, then format it as ISO 8601.
    pass`,
    hints: [
      "Read the text with `datetime.strptime(stamp, ...)`. The day comes first, so the format starts `%d/%m/%Y`.",
      "The clock part is `%H:%M:%S`, separated from the date by one space.",
      "`datetime.strptime(stamp, '%d/%m/%Y %H:%M:%S').isoformat()` does both halves.",
    ],
    referenceSolution: `from datetime import datetime


def to_iso(stamp):
    parsed = datetime.strptime(stamp, "%d/%m/%Y %H:%M:%S")
    return parsed.isoformat()`,
    testCases: [
      {
        input: { stamp: "08/03/2026 01:59:30" },
        expected: "2026-03-08T01:59:30",
        description: "a day-first timestamp",
      },
      {
        input: { stamp: "01/12/2025 00:00:00" },
        expected: "2025-12-01T00:00:00",
        description: "day 1 of month 12, so day-first really is day-first",
      },
      {
        input: { stamp: "31/01/2026 23:59:59" },
        expected: "2026-01-31T23:59:59",
        description: "the last second of a day",
      },
      {
        input: { stamp: "29/02/2024 12:00:00" },
        expected: "2024-02-29T12:00:00",
        description: "a leap day",
      },
    ],
  },
  practice: {
    id: "py-l2-datetimes-practice",
    executionMode: "single-file",
    prompt: `An incident timeline stitches two sources together: log lines that carry no timezone at all, and
API records that carry a UTC offset. Subtracting one from the other is exactly the bug that reported
a five hour outage as a twelve hour one.

Implement \`safe_minutes_between(started, finished)\`: parse both ISO 8601 strings with
\`datetime.fromisoformat\` and return the whole minutes between them as an \`int\`. When one value
carries a UTC offset and the other does not, return \`None\` instead of a number, because the two are
not comparable.`,
    starterCode: `from datetime import datetime


def safe_minutes_between(started, finished):
    # Parse both, refuse to mix naive with aware, then return whole minutes.
    pass`,
    hints: [
      "`datetime.fromisoformat(started)` handles a plain timestamp and one ending in an offset like +00:00.",
      "A parsed value tells you which kind it is: `parsed.utcoffset()` is `None` for a naive datetime.",
      "When both are the same kind, `int((end - start).total_seconds() // 60)` gives the whole minutes.",
    ],
    referenceSolution: `from datetime import datetime


def safe_minutes_between(started, finished):
    start = datetime.fromisoformat(started)
    end = datetime.fromisoformat(finished)
    if (start.utcoffset() is None) != (end.utcoffset() is None):
        return None
    return int((end - start).total_seconds() // 60)`,
    testCases: [
      {
        input: { started: "2026-03-08T01:00:00", finished: "2026-03-08T01:45:00" },
        expected: 45,
        description: "both naive, so the subtraction is safe",
      },
      {
        input: { started: "2026-03-08T01:00:00+00:00", finished: "2026-03-08T04:30:00+02:00" },
        expected: 90,
        description: "both aware in different zones, so the offsets are applied",
      },
      {
        input: { started: "2026-03-08T01:00:00", finished: "2026-03-08T01:45:00+00:00" },
        expected: null,
        description: "naive then aware -> None",
      },
      {
        input: { started: "2026-03-08T01:00:00+00:00", finished: "2026-03-08T01:45:00" },
        expected: null,
        description: "aware then naive -> None",
      },
    ],
  },
}

const itertoolsLesson: PythonLesson = {
  id: "py-l2-itertools",
  title: "itertools: chain, islice, groupby & product",
  summary:
    "Name the loops you keep rewriting, keep them lazy, and never call groupby on unsorted rows.",
  estimatedMinutes: 12,
  difficulty: "medium",
  skills: ["itertools", "iterators", "laziness", "iteration"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## The loops you keep rewriting already have names

Most loops are one of a dozen shapes. Flatten a list of lists. Take the first ten of something. Walk runs of equal keys. Pair every item with every other item. \`itertools\` gives each of those shapes a name, and the name is worth more than the saved lines: a reader sees the intent immediately instead of reconstructing it from an accumulator and an index.

Everything in the module returns a lazy iterator, so nothing intermediate is built and the pipeline works just as well on a stream you could never fit in memory.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["What you want", "The hand-written loop", "The itertools name"],
  "rows": [
    ["Every item from several lists", "a nested for loop and an append", "chain.from_iterable(chunks)"],
    ["The first n of something unsliceable", "a counter and a break", "islice(stream, n)"],
    ["Runs of equal keys", "a previous-key variable and a buffer", "groupby(rows, key=...) over SORTED rows"],
    ["Every ordered pair", "two nested for loops", "product(items, repeat=2)"],
    ["Every unordered pair", "a nested loop starting at i + 1", "combinations(items, 2)"],
    ["Fixed-size chunks of a stream", "a counter and a slice-and-append", "batched(stream, n)"]
  ],
  "highlightCols": ["The itertools name"],
  "caption": "Each of these is a loop you could write by hand in four lines. The value is not the line count: a named function says what the loop is FOR, and it hands back a lazy iterator, so nothing intermediate is ever materialized."
}
\`\`\`

### \`chain\`: one flat pass over several sources

\`\`\`python
from itertools import chain

pages = [[1, 2], [3], [], [4, 5]]
list(chain.from_iterable(pages))     # [1, 2, 3, 4, 5]
list(chain([1, 2], [3]))             # same idea, sources passed separately
\`\`\`

\`chain(a, b)\` takes the iterables as arguments; \`chain.from_iterable(pages)\` takes one iterable OF iterables, which is the form you want whenever the sources arrive as a list. Neither builds a combined list, so chaining a hundred files costs one file's worth of memory.

### \`islice\`: slicing something you cannot subscript

A generator has no \`[0:3]\`, because it has no index. \`islice\` gives it one:

\`\`\`python
from itertools import count, islice

list(islice(count(1), 5))        # [1, 2, 3, 4, 5] out of an infinite counter
list(islice(rows, 10, 20))       # start and stop, like a slice
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "islice-consumes-the-source",
  "prompt": "stream is a generator. You call list(islice(stream, 3)) and then call list(islice(stream, 3)) again. What does the second call return?",
  "options": [
    {
      "label": "The same first three items, since islice always starts at the beginning",
      "feedback": "Tempting, because a list slice really does start from the beginning every time and the syntax is deliberately similar. A generator has no beginning to return to: all it remembers is where it stopped."
    },
    {
      "label": "Items four, five and six, because the first call already consumed three",
      "correct": true,
      "feedback": "Right, and it is genuinely useful once you expect it: repeated islice calls are how you read a stream in fixed-size batches without ever holding all of it."
    },
    {
      "label": "An empty list, because the first call closed the generator",
      "feedback": "Exhausting a generator does finish it for good, but taking three items from a longer one does not exhaust it. It is simply paused at the point where it stopped."
    },
    {
      "label": "It raises StopIteration, since the generator has already been advanced",
      "feedback": "StopIteration is what the iterator protocol raises internally when a source runs out, and list() catches it and stops building. It is not something that surfaces from a call like this."
    }
  ]
}
\`\`\`

### \`groupby\`: runs, not groups

This is the one that surprises people, because the name is borrowed from SQL and the behavior is not. \`groupby\` walks the input once and starts a new group every time the key CHANGES. It is closer to Unix \`uniq\` than to \`GROUP BY\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "groupby-only-groups-adjacent-runs",
  "prompt": "Rows arrive in the order core, web, core, web. You call groupby(rows, key=get_team) without sorting first. How many groups come out?",
  "options": [
    {
      "label": "Two, one per distinct team",
      "feedback": "Tempting, because that is exactly what SQL GROUP BY and pandas groupby both do, and the name is identical. This one behaves like Unix uniq instead: it opens a new group every time the key changes as it walks."
    },
    {
      "label": "Four, because a new group opens every time the key changes",
      "correct": true,
      "feedback": "Right, and nothing warns you. Sort by the same key first so the runs become the groups, which is why sorted(...) and groupby(...) almost always appear together."
    },
    {
      "label": "One, since all the rows share a key eventually",
      "feedback": "Grouping never reorders anything, so rows that arrive far apart stay far apart. A single group only happens when every row already carries the same key."
    },
    {
      "label": "It raises, because the input is not sorted",
      "feedback": "A raise would turn this bug into a five second fix. groupby has no way to know your intent, so unsorted input is a perfectly legal request that returns a perfectly useless answer."
    }
  ]
}
\`\`\`

\`\`\`python
from itertools import groupby

rows = [{"team": "core"}, {"team": "web"}, {"team": "core"}]
ordered = sorted(rows, key=lambda row: row["team"])
{team: len(list(group)) for team, group in groupby(ordered, key=lambda row: row["team"])}
# {'core': 2, 'web': 1}
\`\`\`

Sort by the same key you group by, every time. The Practice exercise is exactly this pairing, and skipping the sort is how it fails.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "groupby-groups-expire",
  "prompt": "You write groups = list(groupby(ordered, key=get_team)) and then loop over groups to count each one. Every count comes out as zero. Why?",
  "options": [
    {
      "label": "The rows were empty to begin with",
      "feedback": "Always worth ruling out first, and it is not the cause here: the group KEYS all arrived correctly, which could not have happened with no rows at all."
    },
    {
      "label": "Every group is a view over the same underlying iterator, so moving to the next group exhausts the previous one",
      "correct": true,
      "feedback": "Right. Consume each group before you advance, which is precisely what the list(group) inside a comprehension does while the group is still live."
    },
    {
      "label": "list() cannot store tuples, so the group halves were dropped",
      "feedback": "A list stores tuples perfectly well, and the keys really do survive the call. What does not survive is the second half of each pair, because it was a live view rather than a container."
    },
    {
      "label": "groupby requires a key function that returns a hashable value",
      "feedback": "It does compare keys, so an exotic key type is genuinely awkward. That is a different failure though, and it would show up as wrong grouping rather than as groups that are all empty."
    }
  ],
  "reveal": "Two rules cover every groupby bug: sort by the key first, and consume each group before you move to the next one. A dict comprehension with list(group) inside it satisfies both at once."
}
\`\`\`

### \`product\` and \`combinations\`: nested loops with names

\`\`\`python
from itertools import combinations, permutations, product

list(product("ab", repeat=2))       # [('a','a'), ('a','b'), ('b','a'), ('b','b')]
list(permutations("abc", 2))        # order matters, no reuse: 6 pairs
list(combinations("abc", 2))        # order does not matter, no reuse: 3 pairs
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "product-versus-combinations",
  "prompt": "letters = ['a', 'b', 'c']. How many items are in list(product(letters, repeat=2)), and how many in list(combinations(letters, 2))?",
  "options": [
    {
      "label": "9 and 9, since both of them pair the letters up",
      "feedback": "They do both produce pairs, which is why the two get mixed up constantly. product allows a letter with itself and counts both orderings while combinations does neither, so the counts cannot possibly match."
    },
    {
      "label": "9 and 3, because product counts every ordered pair including repeats and combinations counts unordered pairs without them",
      "correct": true,
      "feedback": "Right: product is your nested for loops with a name, and combinations is choose-two. Decide whether order and reuse matter and the correct function names itself."
    },
    {
      "label": "6 and 3, since product refuses to pair a letter with itself",
      "feedback": "6 is permutations, which counts order but forbids reuse. product with repeat=2 is the full grid, so aa, bb and cc are all in it."
    },
    {
      "label": "3 and 6, with combinations producing the larger set",
      "feedback": "Those are the right two numbers in the wrong order. combinations is always the smallest member of the family, because it discards both the repeats and the reorderings."
    }
  ]
}
\`\`\`

### \`batched\`: fixed-size chunks from a stream

\`\`\`python
from itertools import batched

for chunk in batched(range(10), 3):
    print(chunk)
# (0, 1, 2)
# (3, 4, 5)
# (6, 7, 8)
# (9,)
\`\`\`

\`batched(iterable, n)\` (Python 3.12+) is the fixed-size-chunk loop you would otherwise hand-roll with a counter and a slice: it lazily yields tuples of up to \`n\` items, and the final chunk is shorter rather than padded or dropped. Reach for it whenever you need to send a stream to an API or a database in batches of a fixed size.

### Pitfalls

- **An iterator is single use.** Anything from \`itertools\` is consumed as you read it, so calling \`list()\` twice on the same object gives you the contents and then an empty list. Materialise once if you need it twice.
- **\`chain(pages)\` is not \`chain.from_iterable(pages)\`.** The first treats the outer list as a single source and yields the inner lists themselves; the second flattens. It is a silent shape bug rather than an error.
- **\`groupby\` compares keys with \`==\` on adjacent items only.** It never sorts, hashes, or reorders, so the correctness of your grouping rests entirely on the ordering you handed it.

**Interview nuance:** knowing \`groupby\` groups runs rather than values is a small fact that signals you have actually used the module rather than skimmed the docs. The wider point is worth saying out loud too: \`itertools\` pipelines are lazy, so \`islice(chain.from_iterable(files), 100)\` reads only as much of the first file as it needs and never materializes anything. That is the same streaming argument that makes generators worth reaching for at all.`,
    demoCode: `from itertools import chain, groupby, islice, product

print(list(chain.from_iterable([[1, 2], [3], [], [4, 5]])))   # [1, 2, 3, 4, 5]
print(list(islice(range(100), 5)))                            # [0, 1, 2, 3, 4]

rows = [{"team": "core"}, {"team": "web"}, {"team": "core"}]
ordered = sorted(rows, key=lambda row: row["team"])
print({t: len(list(g)) for t, g in groupby(ordered, key=lambda row: row["team"])})

unsorted_counts = {t: len(list(g)) for t, g in groupby(rows, key=lambda row: row["team"])}
print(unsorted_counts)   # {'core': 1, 'web': 1}: the second core run overwrote the first

print(len(list(product("abc", repeat=2))))   # 9`,
  },
  apply: {
    id: "py-l2-itertools-apply",
    executionMode: "single-file",
    prompt: `Write a function \`flatten(chunks)\` that returns one flat list holding every item from every list
in \`chunks\`, in order.

For \`[[1, 2], [3]]\` return \`[1, 2, 3]\`. Empty inner lists contribute nothing. Use
\`chain.from_iterable\`.`,
    starterCode: `from itertools import chain


def flatten(chunks):
    # Chain the inner lists into one sequence, then materialize it.
    pass`,
    hints: [
      "`chunks` is one iterable OF iterables, which is the shape `chain.from_iterable` expects.",
      "`chain.from_iterable(chunks)` is lazy, so it yields items rather than returning a list.",
      "`return list(chain.from_iterable(chunks))`.",
    ],
    referenceSolution: `from itertools import chain


def flatten(chunks):
    return list(chain.from_iterable(chunks))`,
    testCases: [
      {
        input: { chunks: [[1, 2], [3]] },
        expected: [1, 2, 3],
        description: "two chunks, flattened in order",
      },
      { input: { chunks: [] }, expected: [], description: "no chunks at all" },
      {
        input: { chunks: [[], [1], []] },
        expected: [1],
        description: "empty chunks contribute nothing",
      },
      {
        input: { chunks: [["a"], ["b", "c"]] },
        expected: ["a", "b", "c"],
        description: "strings flatten the same way",
      },
    ],
  },
  practice: {
    id: "py-l2-itertools-practice",
    executionMode: "single-file",
    prompt: `A daily report counts support tickets per team. The rows come back from the database in arrival
order, someone reached straight for \`groupby\`, and the report showed eleven teams where there are
four, because \`groupby\` starts a new group every time the key changes rather than gathering equal
keys from across the list.

Implement \`count_by_team(tickets)\`: each ticket is a dict with a \`"team"\` key. Return a dict mapping
each team name to how many tickets it has. Sort by team first, then group, so every team appears
exactly once.

For \`[{"team": "core"}, {"team": "web"}, {"team": "core"}]\` return \`{"core": 2, "web": 1}\`.`,
    starterCode: `from itertools import groupby


def count_by_team(tickets):
    # Sort by team, then group by the same key, then count each group.
    pass`,
    hints: [
      "Use one key function for both steps: `sorted(tickets, key=lambda ticket: ticket['team'])`.",
      "`groupby(ordered, key=...)` yields `(team, group)` pairs, where `group` is a live iterator.",
      "Count a group while it is still live: `{team: len(list(group)) for team, group in ...}`.",
    ],
    referenceSolution: `from itertools import groupby


def count_by_team(tickets):
    ordered = sorted(tickets, key=lambda ticket: ticket["team"])
    return {
        team: len(list(group))
        for team, group in groupby(ordered, key=lambda ticket: ticket["team"])
    }`,
    testCases: [
      {
        input: { tickets: [{ team: "core" }, { team: "web" }, { team: "core" }] },
        expected: { core: 2, web: 1 },
        description: "the same team on non-adjacent rows still counts once",
      },
      { input: { tickets: [] }, expected: {}, description: "no tickets" },
      {
        input: { tickets: [{ team: "core" }] },
        expected: { core: 1 },
        description: "a single ticket",
      },
      {
        input: {
          tickets: [{ team: "web" }, { team: "core" }, { team: "web" }, { team: "core" }],
        },
        expected: { core: 2, web: 2 },
        description: "fully interleaved rows",
      },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L2-M7: Talking to Services
// ───────────────────────────────────────────────────────────────────────────

const fetchingJsonLesson: PythonLesson = {
  id: "py-l2-fetching-json",
  title: "Fetching JSON from an API",
  summary:
    "Read the shape of an HTTP call, then handle the half that actually breaks: the status and the parse.",
  estimatedMinutes: 13,
  difficulty: "medium",
  skills: ["http", "apis", "json", "error-handling"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## One line fetches. The other ten decide what to do about it

Calling an API is three steps: send a request, look at what came back, and turn the body into Python values. The sending is one line and it is the part nobody gets wrong. Everything that breaks in production lives in the other two steps, because a response can arrive perfectly well and still be a failure, and a body can arrive perfectly well and still not be the shape you expected.

> This editor runs Python in your browser, which has no network, so nothing here will actually fetch. Read the call below to learn its shape, then practice the half that breaks: reading a status and parsing a body. Level 3 does the rigorous version against a real service with \`httpx\` and \`pydantic\`.

### The shape of the call

\`\`\`python
import httpx

response = httpx.get("https://api.example.com/repos/python/cpython", timeout=5.0)
response.raise_for_status()      # turn a 4xx or 5xx into an exception, here
payload = response.json()        # dict, list, str, int, bool or None
payload["name"]                  # 'cpython'
\`\`\`

Four things are doing work in those lines. \`timeout\` stops a hung server from hanging your process too. \`status_code\` carries the verdict. \`raise_for_status()\` converts a bad status into an exception at a line you chose, rather than letting it travel on as data. And \`.json()\` parses the body, which is the same \`json.loads\` you already know, run over whatever bytes came back.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "a-404-does-not-raise",
  "prompt": "httpx.get(url) comes back with status 404 and an HTML error page. Your next line is response.json(). What did the get call itself do?",
  "options": [
    {
      "label": "It raised, so the next line never runs",
      "feedback": "Tempting, because a 404 is plainly a failure from your program's point of view. From HTTP's point of view the request succeeded: a response came back and its status IS the answer. Only a timeout or a connection problem raises."
    },
    {
      "label": "It returned normally. The 404 is just the status on an ordinary response object",
      "correct": true,
      "feedback": "Right, and that is exactly why raise_for_status() exists: it turns a bad status into an exception at a line you picked. Without it, the failure travels on disguised as data."
    },
    {
      "label": "It returned None, since there is no useful body to parse",
      "feedback": "A 404 body is usually a real payload, often an HTML page or a JSON error object, and the client always hands back a response object rather than None. Reading response.text is how you see it."
    },
    {
      "label": "It retried automatically until the URL resolved",
      "feedback": "No HTTP client retries by default, because a retry is a policy decision only the caller can make. A 404 is also one of the statuses that would never clear however long you waited."
    }
  ]
}
\`\`\`

### The status is a decision, not a detail

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Status", "What it means", "What the caller should do"],
  "rows": [
    ["2xx", "the request worked", "parse the body"],
    ["429", "you are being rate limited", "wait, then retry, honoring Retry-After"],
    ["other 4xx", "your request is wrong", "fix the request; retrying changes nothing"],
    ["5xx", "the other side is broken", "retry with backoff, then give up loudly"],
    ["no response at all", "a timeout or a connection error", "this is the case that raises, so catch it"]
  ],
  "highlightCols": ["What the caller should do"],
  "caption": "The split that matters is transient versus permanent. 429 and 5xx can clear on their own, so a retry is useful. Other 4xx statuses say the request itself is wrong, so an identical retry produces an identical failure while spending your rate limit."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "retry-only-what-can-clear",
  "prompt": "A worker retries every failed call five times with a backoff. Which status is the one where retrying is genuinely useful?",
  "options": [
    {
      "label": "400, because a bad request might go through on a second attempt",
      "feedback": "A 400 says the request you sent is malformed, and sending the identical bytes again produces the identical answer. Retrying it spends quota while hiding a bug you could have fixed in a minute."
    },
    {
      "label": "503, because the service is temporarily unavailable",
      "correct": true,
      "feedback": "Right. 5xx and 429 are the transient family: your request was fine and the other side was not, so time plus backoff can genuinely fix them."
    },
    {
      "label": "401, because the token may be accepted next time",
      "feedback": "A rejected credential stays rejected until something refreshes it, so the useful response is to renew the token rather than to try the same one again. Hammering an expired token can also get the account locked out."
    },
    {
      "label": "404, because the resource may show up shortly",
      "feedback": "This is occasionally true in an eventually consistent system, which makes it the most defensible wrong answer here. As a blanket rule it turns one typo in a URL into five times the traffic."
    }
  ]
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "json-on-an-html-error-page",
  "prompt": "A load balancer returns an HTML maintenance page with status 502. The code calls response.json() without checking the status first. What comes back?",
  "options": [
    {
      "label": "None, because the body is not JSON",
      "feedback": "That would be a friendlier design and some wrappers do offer an opt-in version of it. Here the parse fails outright rather than handing back a value that every caller would then have to check."
    },
    {
      "label": "A JSON decode error, and the traceback blames your parsing rather than the 502",
      "correct": true,
      "feedback": "Right, and that misdirection costs real debugging time at 3am. Call raise_for_status() first so the traceback names the status your service actually received."
    },
    {
      "label": "The HTML as a plain string, since json() falls back to text",
      "feedback": "response.text is the attribute that hands you the raw body, and reaching for it is the right move while debugging. json() only ever parses and never quietly falls back."
    },
    {
      "label": "An empty dict, which the code then reads as a missing record",
      "feedback": "An empty dict would be the quietest possible failure, and plenty of hand-rolled wrappers produce exactly that by accident. The library raises instead of inventing a value for you."
    }
  ]
}
\`\`\`

### Parse the body as if it were written by a stranger

Because it was. A response is untrusted input: a field can be absent, be \`null\`, be a string where you expected a number, or be an empty list where you expected one element. Chained square brackets assume all of it is fine:

\`\`\`python
payload["owner"]["login"]          # KeyError the first time owner is missing
payload["items"][0]["id"]          # IndexError the first time a page is empty

owner = payload.get("owner") or {}
owner.get("login", "unknown")      # a default you chose, at the field you chose
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "nested-lookup-names-the-first-gap",
  "prompt": "A response usually looks like a dict with an owner key holding a dict with a login key. One record has no owner key at all, and the code reads payload['owner']['login']. What happens?",
  "options": [
    {
      "label": "It returns None, which the next line can handle",
      "feedback": "Square brackets never return None on a mapping, since that is what .get() is for. Indexing is the strict form, so an absence gets reported rather than papered over."
    },
    {
      "label": "KeyError naming 'owner', which kills the whole batch on one bad record",
      "correct": true,
      "feedback": "Right, and the fix is to decide field by field whether absence is expected. Use .get() with a default where it is, and let the KeyError stand where a missing field really does mean a broken record."
    },
    {
      "label": "KeyError naming 'login', since the outer lookup succeeded",
      "feedback": "The failure is reported at the FIRST missing link in the chain, so the message names owner. Reading which key is in the message is what tells you where the shape actually diverged."
    },
    {
      "label": "TypeError, because you cannot index into a missing value",
      "feedback": "That is the error you get one step later, when an outer .get() returns None and you index into that. Plain bracket indexing raises before it ever reaches the second pair of brackets."
    }
  ],
  "reveal": "Decide per field whether absence is normal. A default belongs on the fields a caller can live without, and a loud failure belongs on the fields that make the record meaningless."
}
\`\`\`

Note that \`.get("owner")\` returns \`None\` both when the key is missing and when the value really is JSON \`null\`, so \`payload.get("owner").get("login")\` still raises \`AttributeError\` on a null. The \`or {}\` above is what closes that gap, and the Apply exercise makes you handle exactly this case.

### Pitfalls

- **No timeout means no limit.** \`httpx\` defaults to five seconds, but \`requests\` has no default at all, so a hung server can pin a worker forever. Always pass one explicitly and you never have to remember which library you are in.
- **Retrying without backoff is a denial of service you aimed at yourself.** Sleep longer after every attempt, cap the number of attempts, and honor \`Retry-After\` when a 429 sends one.
- **A 200 does not mean the body is right.** Plenty of APIs return errors inside a 200 envelope. Check the payload's own success field where one exists.

**Interview nuance:** when you are asked to "call this API," the answer that lands is the failure taxonomy, not the request line. Say that you separate three cases: no response at all (a timeout or connection error, and the only case that raises), a response with a bad status (transient for 429 and 5xx, so retry with backoff; permanent for other 4xx, so fail loudly), and a response with a good status but an unexpected shape (validate at the boundary and reject the record, not the batch). Level 3 turns that third case into typed models with \`pydantic\`; the reasoning is the same at every scale.`,
    demoCode: `# No network here, so this is what a real response would already have handed you.
payload = {
    "name": "cpython",
    "owner": {"login": "python", "id": 1},
    "items": [],
}

print(payload["owner"]["login"])              # python
print((payload.get("license") or {}).get("key", "none"))   # none

for status in (200, 404, 429, 503):
    if 200 <= status < 300:
        print(status, "ok")
    elif status == 429 or 500 <= status < 600:
        print(status, "retry")
    else:
        print(status, "fail")`,
  },
  apply: {
    id: "py-l2-fetching-json-apply",
    executionMode: "single-file",
    prompt: `Write a function \`owner_login(payload)\` that returns the login name nested at \`owner.login\` in
an API response, or the string \`"unknown"\` when the response does not carry one.

\`{"name": "cpython", "owner": {"login": "python"}}\` returns \`"python"\`. A payload with no \`owner\`
key, with an empty \`owner\`, or with \`owner\` set to \`null\` all return \`"unknown"\` instead of raising.`,
    starterCode: `def owner_login(payload):
    # Reach two levels down without assuming either level is there.
    pass`,
    hints: [
      "`payload.get('owner')` returns `None` both when the key is missing and when its value is JSON null.",
      "So guard the middle step before you index it: `owner = payload.get('owner') or {}`.",
      "Then `return owner.get('login', 'unknown')`, which supplies the default at the field itself.",
    ],
    referenceSolution: `def owner_login(payload):
    owner = payload.get("owner") or {}
    return owner.get("login", "unknown")`,
    testCases: [
      {
        input: { payload: { name: "cpython", owner: { login: "python", id: 1 } } },
        expected: "python",
        description: "the field is there",
      },
      {
        input: { payload: { name: "cpython" } },
        expected: "unknown",
        description: "no owner key at all",
      },
      {
        input: { payload: { name: "orphan", owner: {} } },
        expected: "unknown",
        description: "an owner with no login",
      },
      {
        input: { payload: { name: "orphan", owner: null } },
        expected: "unknown",
        description: "owner is JSON null, not a dict",
      },
    ],
  },
  practice: {
    id: "py-l2-fetching-json-practice",
    executionMode: "single-file",
    prompt: `An ingest worker polls a vendor's API every five minutes. Some failures are the vendor's and
clear on their own, and some are the worker's own fault and will fail identically forever. Retrying
the second kind burns the rate limit and hides the bug, so the worker has to tell them apart before
it decides anything.

Implement \`retry_decision(status)\`: return \`"ok"\` for any 2xx status, \`"retry"\` for 429 and for any
5xx, and \`"fail"\` for everything else.`,
    starterCode: `def retry_decision(status):
    # Classify the status as ok, retry, or fail.
    pass`,
    hints: [
      "Python chains comparisons, so `200 <= status < 300` reads exactly like the range it describes.",
      "The retry family is two rules joined by `or`: `status == 429` and `500 <= status < 600`.",
      "Return early from each branch and let a final `return 'fail'` catch everything left.",
    ],
    referenceSolution: `def retry_decision(status):
    if 200 <= status < 300:
        return "ok"
    if status == 429 or 500 <= status < 600:
        return "retry"
    return "fail"`,
    testCases: [
      { input: { status: 200 }, expected: "ok", description: "a plain success" },
      {
        input: { status: 429 },
        expected: "retry",
        description: "rate limited, so waiting helps",
      },
      {
        input: { status: 503 },
        expected: "retry",
        description: "the other side is down, so waiting helps",
      },
      {
        input: { status: 404 },
        expected: "fail",
        description: "a permanent 4xx, so retrying changes nothing",
      },
    ],
  },
}

export const level2: PythonLevel = {
  id: 2,
  slug: "intermediate",
  title: "Level 2: Idioms",
  tagline:
    "Comprehensions, generators, classes, dataclasses, decorators, and the standard-library idioms for dates, text, files, and APIs.",
  defaultExecutionMode: "single-file",
  estimatedHours: 4,
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
      description: "Model state and behavior with classes, inheritance, composition, and dunders.",
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
      lessons: [
        exceptionsLesson,
        filesJsonCsvLesson,
        writingFilesLesson,
        textAndBytesLesson,
        modulesLesson,
      ],
    },
    {
      id: "py-l2-stdlib-toolkit",
      title: "Standard Library Toolkit",
      description:
        "Reach for the batteries: regular expressions, specialized collections, and dates.",
      lessons: [regexLesson, collectionsToolkitLesson, datetimesLesson, itertoolsLesson],
    },
    {
      id: "py-l2-services-and-apis",
      title: "Talking to Services",
      description: "Make an HTTP call, then handle the status and the parse it hands back.",
      lessons: [fetchingJsonLesson],
    },
  ],
}

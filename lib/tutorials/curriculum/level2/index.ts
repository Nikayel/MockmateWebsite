/**
 * Level 2 — Apply (single-file). Read a concept, then write it with an instant check.
 *
 * Authored by Agent 2 following the single-file authoring contract documented in
 * `../level1/index.ts` (first `def` is graded, keyed `input` passed positionally, avoid the
 * root/tree/node/head/list param names). Modules follow CONTENT-TICKETS.md (L2-M1..M5).
 */
import type { PythonLesson, PythonLevel } from "../../types"

// ───────────────────────────────────────────────────────────────────────────
// L2-M1 — Comprehensions & Generators
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
    markdown: `## Build a collection in one expression

A **comprehension** turns a loop-and-append into a single readable line.

### The long way vs the idiom

\`\`\`python
# the long way
squares = []
for n in nums:
    squares.append(n * n)

# the comprehension
squares = [n * n for n in nums]
\`\`\`

Read it left to right: *"\`n * n\` for each \`n\` in \`nums\`"*.

### Filtering

Add an \`if\` to keep only some items:

\`\`\`python
evens = [n for n in nums if n % 2 == 0]
\`\`\`

### Dict and set comprehensions

The same shape builds dicts and sets — just change the brackets:

\`\`\`python
lengths = {word: len(word) for word in words}   # dict: key: value
distinct = {n % 3 for n in nums}                 # set: unique results
\`\`\`

### Keep it readable

Comprehensions shine for a single map and/or filter. If you need nested loops *and* multiple
conditions, a plain \`for\` loop is often clearer — don't force everything onto one line.

### Recap

\`[expr for x in it if cond]\` maps and filters in one expression; swap the brackets for \`{ }\` to
build dicts (\`key: value\`) or sets. Next you'll square a list, then map words to their lengths.`,
    demoCode: `nums = [1, 2, 3, 4, 5]
print([n * n for n in nums])              # [1, 4, 9, 16, 25]
print([n for n in nums if n % 2 == 0])    # [2, 4]
print({n: n * n for n in nums})           # {1: 1, 2: 4, ...}`,
  },
  apply: {
    id: "py-l2-comprehensions-apply",
    executionMode: "single-file",
    prompt: `Implement \`squares(nums)\` — return a new list with each number in \`nums\` squared.

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
    prompt: `Implement \`lengths(words)\` — return a dict mapping each word to its length.

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
    markdown: `## Producing values lazily

A **generator** produces values one at a time, only as they're needed — instead of building a whole
list in memory. A generator *function* uses \`yield\` instead of \`return\`:

\`\`\`python
def countdown(n):
    while n > 0:
        yield n          # hand back one value, then pause here
        n -= 1

for x in countdown(3):
    print(x)             # 3, 2, 1
\`\`\`

Each \`yield\` pauses the function and resumes where it left off on the next request. Nothing is
computed until you iterate.

### Generator expressions

The compact form looks like a comprehension with **parentheses**:

\`\`\`python
total = sum(n * n for n in range(1, 5))   # 1+4+9+16 = 30, nothing stored in a list
\`\`\`

### Consuming lazily with next

\`next(gen, default)\` pulls the next value (or a fallback). With a filter, it stops at the **first**
match — perfect for "find the first one that…":

\`\`\`python
first_even = next((n for n in nums if n % 2 == 0), None)
\`\`\`

### Recap

Generators stream values via \`yield\` (or a \`(... for ...)\` expression) instead of materialising a
list; consume them with \`for\`, \`sum\`, or \`next\`. Next you'll sum squares lazily, then find the
first truthy value.`,
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
    prompt: `Implement \`sum_of_squares(n)\` — return the sum of the squares \`1² + 2² + ... + n²\`.

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
    prompt: `Implement \`first_truthy(items)\` — return the first **truthy** value in \`items\`, or \`None\` if
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

export const level2: PythonLevel = {
  id: 2,
  slug: "intermediate",
  title: "Level 2 — Apply",
  tagline: "Read a concept, then write it yourself with an instant check.",
  defaultExecutionMode: "single-file",
  estimatedHours: 5,
  modules: [
    {
      id: "py-l2-comprehensions-generators",
      title: "Comprehensions & Generators",
      description: "Transform collections concisely and stream values lazily.",
      lessons: [comprehensionsLesson, generatorsLesson],
    },
  ],
}

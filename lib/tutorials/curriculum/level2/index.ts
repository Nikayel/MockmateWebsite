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

// ───────────────────────────────────────────────────────────────────────────
// L2-M2 — Functions in Depth
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
    markdown: `## Flexible argument lists

Sometimes a function should accept *any number* of arguments.

### \`*args\` collects extra positionals

A parameter written \`*args\` gathers every extra positional argument into a **tuple**:

\`\`\`python
def total(*nums):
    return sum(nums)        # nums is a tuple like (1, 2, 3)

total(1, 2, 3)   # 6
total()          # 0
\`\`\`

### \`**kwargs\` collects extra keywords

A parameter written \`**kwargs\` gathers extra keyword arguments into a **dict**:

\`\`\`python
def tag(name, **attrs):
    return name, attrs

tag("a", href="/x")   # ("a", {"href": "/x"})
\`\`\`

### Unpacking at the call site

The mirror image: \`*\` spreads a list into positional arguments, \`**\` spreads a dict into keyword
arguments. This is how \`str.format\` fills a template from a dict:

\`\`\`python
values = {"name": "Ada", "age": 30}
"{name} is {age}".format(**values)   # "Ada is 30"
\`\`\`

### Recap

\`*args\` captures positionals into a tuple, \`**kwargs\` captures keywords into a dict, and \`*\`/\`**\`
unpack a list/dict back into a call. Next you'll sum any number of values, then fill a template from
a dict.`,
    demoCode: `def total(*nums):
    return sum(nums)

print(total(1, 2, 3))    # 6
print(total())           # 0
print("{name} is {age}".format(**{"name": "Ada", "age": 30}))  # Ada is 30`,
  },
  apply: {
    id: "py-l2-args-kwargs-apply",
    executionMode: "single-file",
    prompt: `Implement \`total(*nums)\` — accept **any number** of numbers and return their sum.

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
    prompt: `Implement \`render(template, values)\` — fill the \`{placeholder}\` slots in \`template\` using the
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
    markdown: `## Functions are values

In Python a function is just a value — you can store it, pass it, and call it later. A function that
**takes or returns** a function is a **higher-order function**.

### Lambdas: tiny inline functions

A \`lambda\` is a one-expression function with no name:

\`\`\`python
square = lambda x: x * x
square(5)            # 25
\`\`\`

You'll rarely assign one — they're meant to be passed *into* another function.

### sorted with a key

\`sorted\` takes a \`key\` function that says *what to sort by*:

\`\`\`python
sorted(words, key=len)               # shortest first (pass the built-in len)
sorted(words, key=lambda w: w[-1])   # by last character (a custom lambda)
\`\`\`

### map and filter

\`map\` applies a function to every item; \`filter\` keeps items where a function is truthy. Both
return lazy iterators, so wrap them in \`list(...)\`:

\`\`\`python
list(map(lambda x: x * 2, nums))         # double each
list(filter(lambda x: x % 2 == 0, nums)) # keep evens
\`\`\`

### Recap

A lambda is an inline function; \`sorted(key=...)\`, \`map\`, and \`filter\` are higher-order functions
that take one. Next you'll sort words by length, then shout each one with \`map\`.`,
    demoCode: `words = ["ccc", "a", "bb"]
print(sorted(words, key=len))                 # ['a', 'bb', 'ccc']
print(list(map(lambda w: w.upper(), words)))  # ['CCC', 'A', 'BB']`,
  },
  apply: {
    id: "py-l2-lambdas-hof-apply",
    executionMode: "single-file",
    prompt: `Implement \`sort_by_length(words)\` — return \`words\` sorted from shortest to longest.

For \`["ccc", "a", "bb"]\` return \`["a", "bb", "ccc"]\`. Pass a \`key\` to \`sorted\`.`,
    starterCode: `def sort_by_length(words):
    # Return words sorted by length using sorted(key=...).
    pass`,
    hints: [
      "`sorted(words, key=len)` sorts by each word's length.",
      "`len` is itself a function — pass it as the key.",
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
    prompt: `Implement \`shout_all(words)\` — return a new list where each word is uppercased with a \`"!"\`
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
    markdown: `## Inner functions remember their world

A function defined **inside** another can use the outer function's variables. When the inner
function is returned or used later, it keeps a live link to those variables — that's a **closure**.

\`\`\`python
def scaled(factor, value):
    def multiply(x):
        return x * factor    # 'factor' comes from the enclosing scope
    return multiply(value)
\`\`\`

\`multiply\` *closes over* \`factor\`. (To **reassign** an enclosing variable, you'd mark it
\`nonlocal\`.)

## Decorators wrap a function

A **decorator** is a higher-order function that takes a function and returns a new one with extra
behaviour around it:

\`\`\`python
def double(fn):
    def wrapper(x):
        return fn(x) * 2     # call the original, then add behaviour
    return wrapper

@double                      # same as: triple = double(triple)
def identity(x):
    return x

identity(5)                  # 10
\`\`\`

The \`@double\` line above a \`def\` rewires the name to the wrapped version.

### Recap

A closure is an inner function that captures enclosing variables; a decorator wraps a function to
add behaviour, applied with \`@\`. Next you'll use a closure to scale a value, then write a decorator
that doubles a result.`,
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
      "Inside `multiply`, return `x * factor` — `factor` comes from the enclosing scope.",
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
    prompt: `Implement \`double_result(n)\` — write a decorator \`double\` that doubles whatever its wrapped
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
    {
      id: "py-l2-functions-in-depth",
      title: "Functions in Depth",
      description: "Flexible signatures, functions as values, closures, and decorators.",
      lessons: [argsKwargsLesson, lambdasHofLesson, closuresDecoratorsLesson],
    },
  ],
}

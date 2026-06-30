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

// ───────────────────────────────────────────────────────────────────────────
// L2-M3 — OOP Foundations
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
    markdown: `## Bundling state with behaviour

A **class** is a blueprint that bundles data (**attributes**) with the functions that act on it
(**methods**). Each object built from the class is an **instance** with its own data.

\`\`\`python
class BankAccount:
    def __init__(self, balance):   # the constructor
        self.balance = balance     # store data on the instance

    def deposit(self, amount):
        self.balance += amount     # a method changes that data
\`\`\`

### \`self\` and \`__init__\`

- \`__init__\` runs when you create an instance: \`BankAccount(100)\`.
- \`self\` is the instance the method is working on. Every method takes it as its first parameter,
  and you store/read data through \`self.attribute\`.

\`\`\`python
account = BankAccount(100)   # __init__ sets balance = 100
account.deposit(50)          # self is 'account'; balance becomes 150
account.balance              # 150
\`\`\`

### Recap

A class groups attributes and methods; \`__init__\` sets up each instance and \`self\` is how methods
reach that instance's data. Next you'll finish a \`BankAccount\`, then build a \`Counter\`.`,
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
    markdown: `## Two ways to reuse classes

### Inheritance (is-a)

A subclass \`class Dog(Animal)\` **is an** Animal and inherits its methods. Override a method to
specialise it, and call \`super()\` to reuse the parent's version:

\`\`\`python
class Greeter:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return "Hi, " + self.name

class LoudGreeter(Greeter):
    def greet(self):
        return super().greet() + "!!!"   # extend the parent's behaviour
\`\`\`

\`LoudGreeter("Ada").greet()\` → \`"Hi, Ada!!!"\`.

### Composition (has-a)

Instead of inheriting, an object can **hold** other objects. A \`Person\` *has a* \`Wallet\`:

\`\`\`python
class Person:
    def __init__(self, name):
        self.name = name
        self.wallet = Wallet()   # composed in
\`\`\`

### Which to use

Prefer **composition** when one thing *contains* another; use **inheritance** only for a genuine
"is-a" relationship. Composition keeps classes small and swappable.

### Recap

Inheritance shares behaviour down an is-a hierarchy (with \`super()\` to reuse the parent);
composition builds an object out of other objects. Next you'll extend a greeter, then compose a
person with a wallet.`,
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
    markdown: `## Make objects feel built-in

**Dunder** ("double underscore") methods let your objects work with Python's built-in operators and
functions.

\`\`\`python
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point({self.x}, {self.y})"     # how it prints

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y   # how == behaves
\`\`\`

Now \`Point(1, 2) == Point(1, 2)\` is \`True\`, and printing a point shows \`Point(1, 2)\`.

## Computed attributes with @property

A \`@property\` turns a method into a read-only attribute — accessed **without** parentheses:

\`\`\`python
class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def area(self):
        return 3.14159 * self.radius ** 2

Circle(2).area   # 12.56636  — no ()
\`\`\`

### Recap

Dunder methods (\`__eq__\`, \`__repr__\`) hook objects into operators and printing; \`@property\` exposes
a computed value as an attribute. Next you'll make two points compare equal, then add an \`area\`
property.`,
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

// ───────────────────────────────────────────────────────────────────────────
// L2-M4 — Data Modeling
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
    markdown: `## Less boilerplate for data

### Dataclasses

A class that mostly holds data needs an \`__init__\`, a \`__repr__\`, and often \`__eq__\`. The
\`@dataclass\` decorator writes all three from a list of typed fields:

\`\`\`python
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

Point(1, 2)                 # __init__ for free
Point(1, 2) == Point(1, 2)  # True — __eq__ for free
print(Point(1, 2))          # Point(x=1, y=2) — __repr__ for free
\`\`\`

Each \`name: type\` line is a **field**.

### Type hints

Annotations describe what a value should be. Python doesn't enforce them, but they guide readers and
tools like \`mypy\`:

\`\`\`python
def total(prices: list[int]) -> int:
    return sum(prices)

note: int | None = None     # Optional: an int or None
\`\`\`

### Enums

An \`Enum\` gives a fixed set of named choices, each with a \`.value\`:

\`\`\`python
from enum import Enum

class Color(Enum):
    RED = "red"
    GREEN = "green"

Color.RED.value     # "red"
Color["RED"]        # look up by name -> Color.RED
\`\`\`

### Recap

\`@dataclass\` generates \`__init__\`/\`__repr__\`/\`__eq__\` from typed fields; type hints document
intent; \`Enum\` names a fixed set of choices. Next you'll make a dataclass, then define an enum.`,
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
// L2-M5 — Errors, Files & Modules
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
    markdown: `## Handling things that go wrong

Some operations can fail at runtime — dividing by zero, converting bad text, a missing key. A
\`try\`/\`except\` lets you **catch** the failure instead of crashing:

\`\`\`python
try:
    result = a / b
except ZeroDivisionError:
    result = None        # runs only if that error happened
\`\`\`

Catch the **specific** exception you expect (\`ZeroDivisionError\`, \`ValueError\`, \`KeyError\`),
not a bare \`except\` — you don't want to hide unrelated bugs.

### finally

A \`finally\` block runs no matter what — success or failure — for cleanup:

\`\`\`python
try:
    risky()
finally:
    cleanup()            # always runs
\`\`\`

### Raising and custom exceptions

Use \`raise\` to signal an error yourself, and subclass \`Exception\` to name your own:

\`\`\`python
class TooSmallError(Exception):
    pass

if n < 10:
    raise TooSmallError()
\`\`\`

### Recap

\`try\`/\`except\` catches a specific error, \`finally\` always runs, \`raise\` signals an error, and
subclassing \`Exception\` defines your own. Next you'll guard a division, then raise and catch a
custom exception.`,
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
    prompt: `Implement \`safe_divide(a, b)\` — return \`a / b\`, but if \`b\` is \`0\` (a \`ZeroDivisionError\`),
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
    markdown: `## Working with structured data

### The with-statement (context managers)

Opening a file with \`with\` guarantees it's closed again, even if an error happens:

\`\`\`python
with open("data.txt") as fh:
    text = fh.read()
# the file is automatically closed here
\`\`\`

\`with\` is the idiom for any resource that needs cleanup. (In this lesson the data is already a
string, so you'll skip straight to parsing it.)

### JSON

\`json.loads\` turns a JSON **string** into Python lists/dicts; \`json.dumps\` goes the other way:

\`\`\`python
import json
data = json.loads('{"name": "Ada", "age": 30}')
data["name"]    # "Ada"
\`\`\`

### CSV

\`csv.reader\` reads comma-separated rows. To read from a string (instead of a file), wrap it in
\`io.StringIO\`:

\`\`\`python
import csv, io
rows = list(csv.reader(io.StringIO("a,b\\nc,d")))   # [["a", "b"], ["c", "d"]]
\`\`\`

Every CSV value comes back as a **string**.

### Recap

\`with\` safely manages resources, \`json.loads\`/\`dumps\` convert between JSON text and Python
objects, and \`csv.reader\` parses comma-separated rows. Next you'll pull a field out of JSON, then
parse CSV into rows.`,
    demoCode: `import json

data = json.loads('{"name": "Ada", "age": 30}')
print(data["name"])   # Ada
print(data["age"])    # 30`,
  },
  apply: {
    id: "py-l2-files-json-csv-apply",
    executionMode: "single-file",
    prompt: `Implement \`get_field(raw, field)\` — parse the JSON string \`raw\` and return the value stored at
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
    prompt: `Implement \`parse_csv(text)\` — parse the CSV string \`text\` into a list of rows, where each row
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
    markdown: `## Code lives in modules

A **module** is just a \`.py\` file. You pull names in from one with \`import\`:

\`\`\`python
import math                 # use as math.sqrt(...)
from math import sqrt       # use as sqrt(...)
from collections import Counter
\`\`\`

Splitting code into modules keeps each file focused; \`import\` wires them together.

### Batteries included

Python's **standard library** ships hundreds of ready-made modules — reach for them before writing
your own:

\`\`\`python
import math
math.gcd(12, 8)             # 4   greatest common divisor

from collections import Counter
Counter("aabbbc")           # Counter({'b': 3, 'a': 2, 'c': 1})
Counter("aabbbc").most_common(1)   # [('b', 3)]
\`\`\`

\`Counter\` tallies how often each item appears; \`.most_common(k)\` returns the top \`k\` as
\`(item, count)\` pairs.

### Recap

\`import module\` / \`from module import name\` brings code in, and the standard library (\`math\`,
\`collections\`, \`datetime\`, …) saves you from reinventing common tools. Next you'll find the most
common character with \`Counter\`, then a GCD with \`math\`.`,
    demoCode: `from collections import Counter

tally = Counter("aabbbc")
print(tally)                  # Counter({'b': 3, 'a': 2, 'c': 1})
print(tally.most_common(1))   # [('b', 3)]`,
  },
  apply: {
    id: "py-l2-modules-apply",
    executionMode: "single-file",
    prompt: `Implement \`most_common_char(text)\` — return the character that appears most often in \`text\`.

Use \`collections.Counter\`. For \`"aabbbc"\` return \`"b"\`.`,
    starterCode: `from collections import Counter


def most_common_char(text):
    # Return the single most common character in text.
    pass`,
    hints: [
      "`Counter(text)` tallies each character.",
      "`.most_common(1)` returns `[(char, count)]` — a list with one pair.",
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
    prompt: `Implement \`gcd_of(a, b)\` — return the greatest common divisor of \`a\` and \`b\`.

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
    {
      id: "py-l2-oop-foundations",
      title: "OOP Foundations",
      description: "Model state and behaviour with classes, inheritance, composition, and dunders.",
      lessons: [classesLesson, inheritanceCompositionLesson, dunderPropertiesLesson],
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
  ],
}

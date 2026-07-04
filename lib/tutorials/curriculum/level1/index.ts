/**
 * Level 1: Foundations (single-file). Reference-style basics.
 *
 * Authored by Agent 2 against the single-file contract proven by `py-l1-temperature` (kept below as
 * the canonical sample). Modules follow docs/python-curriculum/CONTENT-TICKETS.md (L1-M1..M5).
 *
 * Single-file authoring contract (verified against lib/piston.ts):
 *  - The learner implements a NAMED function; the FIRST `def` in their code is the graded one,
 *    so the prompt states the exact signature and the starter seeds that single def.
 *  - Each `testCases[i].input` is a keyed object; values are passed POSITIONALLY in key order,
 *    so the key order must match the function's parameter order.
 *  - Parameter names `root/tree/node/p/q/t1/t2/left/right/subroot` (→ TreeNode) and
 *    `head/list/l1/l2` (→ ListNode) are auto-coerced when the value is a list. Avoid them for
 *    plain numbers/lists. These lessons use safe names (nums, arr, n, k, text, width, …).
 *  - Numeric `expected` values are compared with tolerance, so float results (e.g. 37.0) match
 *    integer expectations (37).
 */
import type { PythonLesson, PythonLevel } from "../../types"

// ───────────────────────────────────────────────────────────────────────────
// L1-M1: First Steps
// ───────────────────────────────────────────────────────────────────────────

const helloLesson: PythonLesson = {
  id: "py-l1-hello",
  title: "Your first program: print & comments",
  summary: "Show output with print(), leave comments, and return a value to be checked.",
  estimatedMinutes: 8,
  difficulty: "easy",
  skills: ["print", "comments", "strings", "functions"],
  teach: {
    estimatedMinutes: 3,
    markdown: `## Your first lines of Python

Python runs a program **top to bottom**, one line at a time. The simplest thing a program can do is
*show* something with \`print(...)\`:

\`\`\`python
print("Hello, world!")
print("Learning Python")
\`\`\`

Each \`print\` writes its text on its own line.

### Comments

A line that starts with \`#\` is a **comment**. Python ignores it. Comments are notes for humans:

\`\`\`python
# This is a comment. Python skips it.
print("but this runs")   # a comment can also sit after code
\`\`\`

### print vs return

\`print\` shows text on the screen. But when we **check** your code, we don't watch the screen. We
call your function and look at the value it hands back with \`return\`.

\`\`\`python
def greet(name):
    return "Hello, " + name + "!"   # hand the string back to the caller
\`\`\`

The \`+\` glues strings together, so \`greet("Ada")\` produces \`"Hello, Ada!"\`.

### Anatomy

\`\`\`text
def  greet (name)  :     return  "Hello, " + name + "!"
└┬┘   └─┬─┘ └─┬─┘  │      └─┬──┘  └──────────┬─────────┘
keyword name  param colon  keyword     the string sent back
\`\`\`

### Keep it readable

Build the message once and return it. You can still \`print()\` while you experiment, just remember
the grader reads the **return** value, not the printout.

### Recap

\`print(...)\` shows output, \`#\` starts a comment, and \`return\` hands a value back. Next you'll
return a greeting of your own.`,
    demoCode: `# Comments start with # and are ignored.
print("Python runs top to bottom")
print("one line at a time")

greeting = "Hello, " + "world" + "!"
print(greeting)`,
  },
  apply: {
    id: "py-l1-hello-apply",
    executionMode: "single-file",
    prompt: `Implement \`greet(name)\`: return a greeting for the given \`name\`.

For \`name = "World"\` it should return the string \`"Hello, World!"\`. Build it by joining
\`"Hello, "\`, the \`name\`, and \`"!"\` with \`+\`. Return it (don't print it).`,
    starterCode: `def greet(name):
    # Return "Hello, " + name + "!"
    pass`,
    hints: [
      'Join the pieces with `+`: `"Hello, " + name + "!"`.',
      "Use `return`, not `print`. The grader checks the returned string.",
      'One line works: `return "Hello, " + name + "!"`.',
    ],
    referenceSolution: `def greet(name):
    return "Hello, " + name + "!"`,
    testCases: [
      { input: { name: "World" }, expected: "Hello, World!", description: "the classic greeting" },
      { input: { name: "Ada" }, expected: "Hello, Ada!", description: "a different name" },
      { input: { name: "Sam" }, expected: "Hello, Sam!", description: "another name" },
    ],
  },
  practice: {
    id: "py-l1-hello-practice",
    executionMode: "single-file",
    prompt: `Implement \`banner(name)\`: wrap \`name\` in a simple banner.

For \`name = "Ada"\` it should return \`"=== Ada ==="\` (the name with \`"=== "\` before it and
\`" ==="\` after it).`,
    starterCode: `def banner(name):
    # Return "=== " + name + " ==="
    pass`,
    hints: [
      'You need two joins: a prefix `"=== "` and a suffix `" ==="`.',
      'Mirror the apply step: `return "=== " + name + " ==="`.',
    ],
    referenceSolution: `def banner(name):
    return "=== " + name + " ==="`,
    testCases: [
      { input: { name: "Ada" }, expected: "=== Ada ===", description: "a short name" },
      { input: { name: "Python" }, expected: "=== Python ===", description: "a longer name" },
      {
        input: { name: "" },
        expected: "===  ===",
        description: "an empty name still gets a banner",
      },
    ],
  },
}

const variablesLesson: PythonLesson = {
  id: "py-l1-variables",
  title: "Variables & assignment",
  summary: "Bind names to values with =, reassign them, and use them in expressions.",
  estimatedMinutes: 8,
  difficulty: "easy",
  skills: ["variables", "assignment", "naming", "arithmetic"],
  teach: {
    estimatedMinutes: 3,
    markdown: `## Variables: names for values

A **variable** is a name bound to a value with \`=\`. Read \`=\` as "gets":

\`\`\`python
score = 10        # score gets 10
name = "Ada"      # name gets the string "Ada"
\`\`\`

Once a value has a name, you use it by that name, and you can **reassign** it later:

\`\`\`python
score = 10
score = score + 5     # re-bind score to 15
\`\`\`

The right-hand side runs first, then the name is pointed at the result.

### Names that explain themselves

Use lowercase words joined by underscores (**snake_case**), and pick names that say what they hold:

\`\`\`python
total_price = 4.99
items_in_cart = 3       # clear intent
x = 3                   # vague: what is x?
\`\`\`

### The long way vs the idiom

You can compute step by step into well-named variables, then return:

\`\`\`python
def rectangle_area(width, height):
    area = width * height
    return area
\`\`\`

When it's a one-liner, returning the expression directly is just as clear:

\`\`\`python
def rectangle_area(width, height):
    return width * height
\`\`\`

### Recap

\`=\` binds a name to a value, reassigning re-points the name, and good names make code read like
prose. Next you'll store a couple of values and return a result.`,
    demoCode: `width = 4
height = 3
area = width * height
print(area)            # 12

width = 10             # reassign
print(width * height)  # 30`,
  },
  apply: {
    id: "py-l1-variables-apply",
    executionMode: "single-file",
    prompt: `Implement \`rectangle_area(width, height)\`: return the area of a rectangle.

The area is \`width * height\`. You may store it in a variable first or return the expression
directly.`,
    starterCode: `def rectangle_area(width, height):
    # Return width * height.
    pass`,
    hints: [
      "Area is `width * height`.",
      "Use `return` to hand the number back.",
      "One line works: `return width * height`.",
    ],
    referenceSolution: `def rectangle_area(width, height):
    return width * height`,
    testCases: [
      { input: { width: 3, height: 4 }, expected: 12, description: "3 by 4" },
      { input: { width: 5, height: 5 }, expected: 25, description: "a square" },
      { input: { width: 10, height: 2 }, expected: 20, description: "a wide rectangle" },
      { input: { width: 1, height: 1 }, expected: 1, description: "the unit square" },
    ],
  },
  practice: {
    id: "py-l1-variables-practice",
    executionMode: "single-file",
    prompt: `Implement \`seconds_total(hours, minutes)\`: convert a duration to **total seconds**.

One hour is \`3600\` seconds and one minute is \`60\` seconds. Combine both parts.`,
    starterCode: `def seconds_total(hours, minutes):
    # Return the total number of seconds.
    pass`,
    hints: [
      "An hour is 3600 seconds; a minute is 60 seconds.",
      "Add the two parts: `hours * 3600 + minutes * 60`.",
    ],
    referenceSolution: `def seconds_total(hours, minutes):
    return hours * 3600 + minutes * 60`,
    testCases: [
      { input: { hours: 1, minutes: 0 }, expected: 3600, description: "one hour" },
      { input: { hours: 0, minutes: 30 }, expected: 1800, description: "half an hour" },
      { input: { hours: 2, minutes: 15 }, expected: 8100, description: "two and a quarter hours" },
      { input: { hours: 0, minutes: 0 }, expected: 0, description: "no time at all" },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L1-M5: Control Flow & Functions
// `py-l1-temperature` (further down) is Agent 1's canonical single-file sample, pinned by
// registry.test.ts; the three ticketed lessons below precede it in the module.
// ───────────────────────────────────────────────────────────────────────────

const conditionalsLesson: PythonLesson = {
  id: "py-l1-conditionals",
  title: "if / elif / else & logical operators",
  summary: "Branch on conditions and combine them with and / or / not.",
  estimatedMinutes: 10,
  difficulty: "easy",
  skills: ["conditionals", "comparisons", "boolean-logic"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Making decisions with if

An **if statement** runs a block only when a condition is true. Add \`elif\` for more cases and
\`else\` for "none of the above":

\`\`\`python
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
else:
    grade = "F"
\`\`\`

Python checks the branches top to bottom and takes the **first** one that's true.

### Comparisons

Conditions are usually comparisons, which produce \`True\`/\`False\`:

\`\`\`text
==  equal        !=  not equal
<   less than    >   greater than
<=  at most      >=  at least
\`\`\`

(Remember: \`==\` compares, a single \`=\` assigns.)

### Combining conditions

\`and\`, \`or\`, and \`not\` join conditions:

\`\`\`python
age >= 18 and citizen     # both must be true
is_weekend or is_holiday  # either is enough
not finished              # flips true/false
\`\`\`

### Recap

\`if\`/\`elif\`/\`else\` pick a branch by the first true condition; comparisons and
\`and\`/\`or\`/\`not\` build those conditions. Next you'll label a number's sign, then decide if
someone can vote.`,
    demoCode: `score = 85
if score >= 90:
    print("A")
elif score >= 80:
    print("B")
else:
    print("F")        # prints B`,
  },
  apply: {
    id: "py-l1-conditionals-apply",
    executionMode: "single-file",
    prompt: `Implement \`sign(n)\`: return \`"positive"\` when \`n\` is greater than 0, \`"negative"\` when it's
less than 0, and \`"zero"\` when it's exactly 0.`,
    starterCode: `def sign(n):
    # Return "positive", "negative", or "zero".
    pass`,
    hints: [
      'Start with `if n > 0:` and return "positive".',
      'Add `elif n < 0:` for "negative".',
      'The `else:` case is "zero".',
    ],
    referenceSolution: `def sign(n):
    if n > 0:
        return "positive"
    elif n < 0:
        return "negative"
    else:
        return "zero"`,
    testCases: [
      { input: { n: 5 }, expected: "positive", description: "a positive number" },
      { input: { n: -3 }, expected: "negative", description: "a negative number" },
      { input: { n: 0 }, expected: "zero", description: "exactly zero" },
      { input: { n: 100 }, expected: "positive", description: "another positive" },
    ],
  },
  practice: {
    id: "py-l1-conditionals-practice",
    executionMode: "single-file",
    prompt: `Implement \`can_vote(age, citizen)\`: return \`True\` only when \`age\` is at least 18 **and**
\`citizen\` is \`True\`.`,
    starterCode: `def can_vote(age, citizen):
    # Return True when age >= 18 AND citizen is True.
    pass`,
    hints: ["Combine two conditions with `and`.", "`return age >= 18 and citizen`."],
    referenceSolution: `def can_vote(age, citizen):
    return age >= 18 and citizen`,
    testCases: [
      {
        input: { age: 20, citizen: true },
        expected: true,
        description: "old enough and a citizen",
      },
      { input: { age: 16, citizen: true }, expected: false, description: "too young" },
      { input: { age: 20, citizen: false }, expected: false, description: "not a citizen" },
      { input: { age: 18, citizen: true }, expected: true, description: "exactly 18 counts" },
    ],
  },
}

const loopsLesson: PythonLesson = {
  id: "py-l1-loops",
  title: "for, while, range & break/continue",
  summary: "Repeat work over collections and ranges, accumulating a result.",
  estimatedMinutes: 11,
  difficulty: "easy",
  skills: ["loops", "for", "range", "accumulator"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Repeating work with loops

A **for loop** runs its body once for each item in a collection:

\`\`\`python
for name in ["Ada", "Sam"]:
    print(name)
\`\`\`

### range

\`range(start, stop)\` produces the numbers from \`start\` up to *but not including* \`stop\`:

\`\`\`python
for i in range(1, 4):
    print(i)        # 1, 2, 3
\`\`\`

### The accumulator pattern

Keep a running total in a variable and update it each pass:

\`\`\`python
total = 0
for i in range(1, 6):
    total = total + i    # 1+2+3+4+5
# total is now 15
\`\`\`

### while, break, continue

A **while loop** runs as long as its condition holds, so you must change something inside the loop or
it never stops. \`break\` exits early; \`continue\` skips to the next pass:

\`\`\`python
n = 3
while n > 0:            # repeat while the condition is True
    print(n)
    n = n - 1          # move toward the exit, or it loops forever

for n in nums:
    if n < 0:
        continue        # skip negatives
    if n > 100:
        break           # stop entirely
\`\`\`

### Recap

\`for\` walks a collection or a \`range\`, the accumulator pattern builds up a result, and
\`while\`/\`break\`/\`continue\` give finer control. Next you'll sum the numbers up to n, then count
the evens in a list.`,
    demoCode: `total = 0
for i in range(1, 6):
    total = total + i
print(total)        # 15`,
  },
  apply: {
    id: "py-l1-loops-apply",
    executionMode: "single-file",
    prompt: `Implement \`sum_to(n)\`: return the sum of all whole numbers from 1 up to and including \`n\`.

For \`n = 5\` that's \`1 + 2 + 3 + 4 + 5 = 15\`. For \`n = 0\`, return \`0\`.`,
    starterCode: `def sum_to(n):
    # Add up 1, 2, ..., n and return the total.
    pass`,
    hints: [
      "Start a total at 0.",
      "Loop `for i in range(1, n + 1):` so n is included.",
      "Add each i to the total, then return it after the loop.",
    ],
    referenceSolution: `def sum_to(n):
    total = 0
    for i in range(1, n + 1):
        total = total + i
    return total`,
    testCases: [
      { input: { n: 5 }, expected: 15, description: "1..5" },
      { input: { n: 1 }, expected: 1, description: "just 1" },
      { input: { n: 10 }, expected: 55, description: "1..10" },
      { input: { n: 0 }, expected: 0, description: "empty range sums to 0" },
    ],
  },
  practice: {
    id: "py-l1-loops-practice",
    executionMode: "single-file",
    prompt: `Implement \`count_evens(nums)\`: return how many numbers in the list \`nums\` are even.

For \`[1, 2, 3, 4]\` return \`2\`.`,
    starterCode: `def count_evens(nums):
    # Count how many numbers are even.
    pass`,
    hints: [
      "A number is even when `n % 2 == 0`.",
      "Keep a counter, loop the list, and add 1 when a number is even.",
      "Return the counter after the loop.",
    ],
    referenceSolution: `def count_evens(nums):
    count = 0
    for x in nums:
        if x % 2 == 0:
            count = count + 1
    return count`,
    testCases: [
      { input: { nums: [1, 2, 3, 4] }, expected: 2, description: "two evens" },
      { input: { nums: [2, 4, 6] }, expected: 3, description: "all even" },
      { input: { nums: [1, 3, 5] }, expected: 0, description: "none even" },
      { input: { nums: [] }, expected: 0, description: "empty list" },
    ],
  },
}

const functionsLesson: PythonLesson = {
  id: "py-l1-functions",
  title: "Functions, parameters & defaults",
  summary: "Write functions with default parameters and learn to read a traceback.",
  estimatedMinutes: 11,
  difficulty: "easy",
  skills: ["functions", "default-parameters", "errors", "tracebacks"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Functions, defaults, and reading errors

You've called functions already; now write richer ones. A function packages logic behind a name so
you can reuse it:

\`\`\`python
def power(base, exp):
    return base ** exp

power(2, 3)    # 8
\`\`\`

### Default parameters

Give a parameter a **default** so callers can leave it out:

\`\`\`python
def power(base, exp=2):
    return base ** exp

power(5)       # 25 , exp defaults to 2
power(2, 3)    # 8  , exp given explicitly
\`\`\`

### Reading a traceback

When code raises an error, Python prints a **traceback**. Read it bottom-up:

\`\`\`text
Traceback (most recent call last):
  File "main.py", line 2, in <module>
    print(power("2", 3))
TypeError: unsupported operand type(s) for ** : 'str' and 'int'
\`\`\`

The **last line** names the problem (here a \`TypeError\`: a string can't be raised to a power), and
the lines above show where it happened. Most bugs are solved by reading that last line carefully.

### Recap

\`def\` packages reusable logic, defaults make parameters optional, and a traceback's last line tells
you what went wrong. Next you'll write a power function with a default, then build an HTML tag.`,
    demoCode: `def power(base, exp=2):
    return base ** exp

print(power(5))      # 25  (exp defaults to 2)
print(power(2, 3))   # 8`,
  },
  apply: {
    id: "py-l1-functions-apply",
    executionMode: "single-file",
    prompt: `Implement \`power(base, exp=2)\`: return \`base\` raised to the \`exp\` power, where \`exp\`
defaults to \`2\`.

So \`power(3)\` is \`9\` (3 squared) and \`power(2, 3)\` is \`8\`.`,
    starterCode: `def power(base, exp=2):
    # Return base ** exp. exp defaults to 2.
    pass`,
    hints: [
      "Raise to a power with `**`: `base ** exp`.",
      "Keep the default in the signature: `def power(base, exp=2):`.",
      "`return base ** exp`.",
    ],
    referenceSolution: `def power(base, exp=2):
    return base ** exp`,
    testCases: [
      { input: { base: 3 }, expected: 9, description: "default exp of 2 (squared)" },
      { input: { base: 2, exp: 3 }, expected: 8, description: "explicit exp" },
      { input: { base: 5 }, expected: 25, description: "another default square" },
      { input: { base: 2, exp: 10 }, expected: 1024, description: "a larger power" },
    ],
  },
  practice: {
    id: "py-l1-functions-practice",
    executionMode: "single-file",
    prompt: `Implement \`make_tag(name, content)\`: wrap \`content\` in an HTML tag named \`name\`.

For \`("b", "hi")\` return \`"<b>hi</b>"\`.`,
    starterCode: `def make_tag(name, content):
    # Return "<name>content</name>" using an f-string.
    pass`,
    hints: ["Use an f-string with the tag name on both sides.", '`f"<{name}>{content}</{name}>"`.'],
    referenceSolution: `def make_tag(name, content):
    return f"<{name}>{content}</{name}>"`,
    testCases: [
      { input: { name: "b", content: "hi" }, expected: "<b>hi</b>", description: "a bold tag" },
      {
        input: { name: "p", content: "text" },
        expected: "<p>text</p>",
        description: "a paragraph",
      },
      {
        input: { name: "h1", content: "Title" },
        expected: "<h1>Title</h1>",
        description: "a heading",
      },
    ],
  },
}

const temperatureLesson: PythonLesson = {
  id: "py-l1-temperature",
  title: "Functions & return values",
  summary: "Write functions that take an input, compute, and return a value.",
  estimatedMinutes: 8,
  difficulty: "easy",
  skills: ["functions", "arithmetic", "return-values"],
  teach: {
    estimatedMinutes: 3,
    markdown: `## Functions turn input into output

A **function** is a named block of code that takes some input, does work, and hands back a
result. You define one with \`def\`, name its inputs (its *parameters*), and use \`return\` to
send a value back to whoever called it.

\`\`\`python
def square(n):
    return n * n

square(5)   # -> 25
\`\`\`

### Anatomy

\`\`\`text
def  square (n)  :        return  n * n
└┬┘   └──┬─┘ └┬┘ │          └┬─┘   └──┬──┘
keyword name  param colon  keyword  the value sent back
\`\`\`

- \`def\` starts the definition.
- \`square\` is the name you'll call.
- \`n\` is a **parameter**, a placeholder filled in when the function is called.
- Everything indented under the \`def\` is the **body**.
- \`return\` ends the function and produces its result. A function with no \`return\` hands back
  \`None\`.

### The long way vs the idiom

You *could* stash the answer in a variable and print it:

\`\`\`python
def square(n):
    answer = n * n
    print(answer)     # shows it, but hands back None
\`\`\`

Printing is **not** the same as returning. The grader checks what you \`return\`, so reach for
\`return\` whenever a function should produce a value.

### Keep it readable

Give parameters names that say what they hold (\`f\` for Fahrenheit, \`c\` for Celsius), and
return the expression directly when it's a one-liner. No temporary variable is needed.

### Recap

A function = \`def name(params):\` + a body + a \`return\`. Next, you'll write two of them.`,
    demoCode: `def square(n):
    return n * n

print(square(5))   # 25
print(square(9))   # 81`,
  },
  apply: {
    id: "py-l1-temperature-apply",
    executionMode: "single-file",
    prompt: `Implement \`to_celsius(f)\`: convert a temperature in **Fahrenheit** to **Celsius**.

The formula is \`(f - 32) * 5 / 9\`. Return the result (don't print it).`,
    starterCode: `def to_celsius(f):
    # Convert Fahrenheit (f) to Celsius and return it.
    pass`,
    hints: [
      "Use the formula (f - 32) * 5 / 9.",
      "Use `return`, not `print`. The grader checks the returned value.",
      "A single line works: `return (f - 32) * 5 / 9`.",
    ],
    referenceSolution: `def to_celsius(f):
    return (f - 32) * 5 / 9`,
    testCases: [
      { input: { f: 212 }, expected: 100, description: "boiling point of water" },
      { input: { f: 32 }, expected: 0, description: "freezing point of water" },
      { input: { f: 50 }, expected: 10, description: "a mild day" },
      { input: { f: 98.6 }, expected: 37, description: "human body temperature" },
    ],
  },
  practice: {
    id: "py-l1-temperature-practice",
    executionMode: "single-file",
    prompt: `Now go the other way: implement \`to_fahrenheit(c)\` to convert **Celsius** to **Fahrenheit**.

The formula is \`c * 9 / 5 + 32\`. Return the result.`,
    starterCode: `def to_fahrenheit(c):
    # Convert Celsius (c) to Fahrenheit and return it.
    pass`,
    hints: [
      "Mirror the apply step, but rearrange the formula: c * 9 / 5 + 32.",
      "Order of operations: multiply and divide before you add 32.",
    ],
    referenceSolution: `def to_fahrenheit(c):
    return c * 9 / 5 + 32`,
    testCases: [
      { input: { c: 100 }, expected: 212, description: "boiling point of water" },
      { input: { c: 0 }, expected: 32, description: "freezing point of water" },
      { input: { c: 10 }, expected: 50, description: "a mild day" },
      { input: { c: 37 }, expected: 98.6, description: "human body temperature" },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L1-M2: Data Types
// ───────────────────────────────────────────────────────────────────────────

const numbersLesson: PythonLesson = {
  id: "py-l1-numbers",
  title: "Ints, floats & arithmetic",
  summary: "Do math with integers and floats, including floor division and modulo.",
  estimatedMinutes: 9,
  difficulty: "easy",
  skills: ["numbers", "arithmetic", "floor-division", "modulo"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Numbers and arithmetic

Python has two everyday number types: **integers** (whole numbers like \`3\`, \`-7\`) and **floats**
(decimals like \`3.14\`, \`2.0\`). You combine them with the usual operators:

\`\`\`python
7 + 2     # 9    addition
7 - 2     # 5    subtraction
7 * 2     # 14   multiplication
7 / 2     # 3.5  division, ALWAYS gives a float
\`\`\`

### Floor division and modulo

Two operators are easy to miss but show up constantly:

\`\`\`python
17 // 5   # 3   floor division: how many whole 5s fit
17 % 5    # 2   modulo: the remainder left over
\`\`\`

Together they split a number into a whole part and a remainder, perfect for "125 minutes is 2
hours and 5 minutes":

\`\`\`python
total = 125
hours = total // 60    # 2
mins = total % 60      # 5
\`\`\`

### Powers

\`**\` raises to a power: \`2 ** 10\` is \`1024\`.

### Keep it readable

Reach for \`//\` and \`%\` when you mean "whole groups" and "what's left". Use plain \`/\` when you
want an exact decimal answer.

### Recap

\`+ - * /\` do the obvious thing (\`/\` returns a float), \`//\` floor-divides, \`%\` gives the
remainder, and \`**\` is power. Next you'll split minutes into hours and minutes, then average three
numbers.`,
    demoCode: `total = 125
print(total // 60)   # 2  (whole hours)
print(total % 60)    # 5  (leftover minutes)
print(7 / 2)         # 3.5
print(2 ** 10)       # 1024`,
  },
  apply: {
    id: "py-l1-numbers-apply",
    executionMode: "single-file",
    prompt: `Implement \`minutes_to_hm(total_minutes)\`: split a number of minutes into hours and minutes.

Return a list \`[hours, minutes]\` where \`hours\` is the whole hours and \`minutes\` is what's left
over. For \`125\` minutes, return \`[2, 5]\`.`,
    starterCode: `def minutes_to_hm(total_minutes):
    # Return [whole hours, leftover minutes].
    pass`,
    hints: [
      "Whole hours come from floor division: `total_minutes // 60`.",
      "Leftover minutes come from modulo: `total_minutes % 60`.",
      "Return both in a list: `return [total_minutes // 60, total_minutes % 60]`.",
    ],
    referenceSolution: `def minutes_to_hm(total_minutes):
    return [total_minutes // 60, total_minutes % 60]`,
    testCases: [
      { input: { total_minutes: 125 }, expected: [2, 5], description: "2h 5m" },
      { input: { total_minutes: 60 }, expected: [1, 0], description: "exactly one hour" },
      { input: { total_minutes: 45 }, expected: [0, 45], description: "under an hour" },
      { input: { total_minutes: 200 }, expected: [3, 20], description: "3h 20m" },
    ],
  },
  practice: {
    id: "py-l1-numbers-practice",
    executionMode: "single-file",
    prompt: `Implement \`average(a, b, c)\`: return the mean of three numbers.

Add them up and divide by 3. The result may be a decimal (a float), which is fine.`,
    starterCode: `def average(a, b, c):
    # Return the mean of the three numbers.
    pass`,
    hints: [
      "Sum first, then divide: `(a + b + c) / 3`.",
      "Use `/` (not `//`) so you keep the decimal part.",
    ],
    referenceSolution: `def average(a, b, c):
    return (a + b + c) / 3`,
    testCases: [
      { input: { a: 1, b: 2, c: 3 }, expected: 2, description: "1, 2, 3 -> 2.0" },
      { input: { a: 10, b: 20, c: 30 }, expected: 20, description: "tens" },
      { input: { a: 1, b: 1, c: 1 }, expected: 1, description: "all the same" },
      { input: { a: 2, b: 3, c: 10 }, expected: 5, description: "2, 3, 10 -> 5.0" },
    ],
  },
}

const boolNoneConvertLesson: PythonLesson = {
  id: "py-l1-bool-none-convert",
  title: "Booleans, None & type conversion",
  summary: "Use True/False and None, convert between types, and reason about truthiness.",
  estimatedMinutes: 9,
  difficulty: "easy",
  skills: ["booleans", "none", "type-conversion", "truthiness"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## True, False, None, and changing types

A **boolean** is one of two values: \`True\` or \`False\`. Comparisons produce booleans:

\`\`\`python
3 > 2     # True
3 == 4    # False   (== tests equality; = assigns)
\`\`\`

\`None\` is Python's "nothing here" value, a deliberate placeholder for "no result yet".

### Converting between types

Input often arrives as text. Convert it with \`int()\`, \`float()\`, or \`str()\`:

\`\`\`python
int("42")     # 42      text -> integer
float("3.5")  # 3.5     text -> float
str(42)       # "42"    number -> text
\`\`\`

### Truthiness

Every value is either "truthy" or "falsy" when used in a condition. The falsy ones are worth
memorising: \`0\`, \`""\` (empty string), \`[]\` (empty list), \`None\`, and \`False\`. Everything
else is truthy.

\`\`\`python
"yes" if "hello" else "no"   # "yes" , non-empty string is truthy
"yes" if "" else "no"        # "no"  , empty string is falsy
\`\`\`

That \`A if condition else B\` form is a **conditional expression**: it evaluates to \`A\` when the
condition is truthy, otherwise \`B\`.

### Recap

\`True\`/\`False\` come from comparisons, \`None\` means "nothing", \`int()/float()/str()\` convert
types, and empty/zero/None values are falsy. Next you'll guard a conversion and branch on
truthiness.`,
    demoCode: `print(int("42") + 8)   # 50
print(str(42) + "!")   # 42!
print(3 > 2)           # True
print("yes" if "" else "no")   # no  (empty string is falsy)`,
  },
  apply: {
    id: "py-l1-bool-none-convert-apply",
    executionMode: "single-file",
    prompt: `Implement \`parse_or_zero(text)\`: turn a string of digits into an integer, but return \`0\`
when the string is empty.

For \`"42"\` return \`42\`; for \`""\` return \`0\`.`,
    starterCode: `def parse_or_zero(text):
    # Return int(text), or 0 when text is empty.
    pass`,
    hints: [
      'An empty string is falsy, so `if text:` is False for `""`.',
      "Convert with `int(text)` only when there's something to convert.",
      "Conditional expression: `return int(text) if text else 0`.",
    ],
    referenceSolution: `def parse_or_zero(text):
    return int(text) if text else 0`,
    testCases: [
      { input: { text: "42" }, expected: 42, description: "a normal number" },
      { input: { text: "5" }, expected: 5, description: "a single digit" },
      { input: { text: "" }, expected: 0, description: "empty string falls back to 0" },
      { input: { text: "100" }, expected: 100, description: "a bigger number" },
    ],
  },
  practice: {
    id: "py-l1-bool-none-convert-practice",
    executionMode: "single-file",
    prompt: `Implement \`yes_no(value)\`: return the string \`"yes"\` when \`value\` is truthy, otherwise
\`"no"\`.

Remember the falsy values: \`0\`, \`""\`, \`None\`, and \`False\`.`,
    starterCode: `def yes_no(value):
    # Return "yes" when value is truthy, else "no".
    pass`,
    hints: [
      "You don't need to compare anything: `value` itself is truthy or falsy.",
      'Conditional expression: `return "yes" if value else "no"`.',
    ],
    referenceSolution: `def yes_no(value):
    return "yes" if value else "no"`,
    testCases: [
      { input: { value: 1 }, expected: "yes", description: "non-zero number is truthy" },
      { input: { value: 0 }, expected: "no", description: "zero is falsy" },
      { input: { value: "hi" }, expected: "yes", description: "non-empty string is truthy" },
      { input: { value: "" }, expected: "no", description: "empty string is falsy" },
      { input: { value: null }, expected: "no", description: "None is falsy" },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L1-M3: Strings & Formatting
// ───────────────────────────────────────────────────────────────────────────

const stringsIndexLesson: PythonLesson = {
  id: "py-l1-strings-index",
  title: "String indexing & slicing",
  summary: "Reach into text by position, take slices, and measure length.",
  estimatedMinutes: 9,
  difficulty: "easy",
  skills: ["strings", "indexing", "slicing", "len"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## A string is a sequence of characters

Each character in a string has a **position** (an *index*), counted from \`0\`:

\`\`\`text
 p  y  t  h  o  n
 0  1  2  3  4  5      <- index from the front
-6 -5 -4 -3 -2 -1      <- index from the back
\`\`\`

Reach in with square brackets:

\`\`\`python
word = "python"
word[0]    # "p"   first character
word[-1]   # "n"   last character (negative counts from the end)
len(word)  # 6     how many characters
\`\`\`

### Slicing

\`text[start:stop]\` takes a **slice**, from \`start\` up to *but not including* \`stop\`:

\`\`\`python
word[0:3]   # "pyt"   indices 0, 1, 2
word[2:]    # "thon"  from 2 to the end
word[:2]    # "py"    from the start to 2
word[1:-1]  # "ytho"  drop the first and last character
\`\`\`

### Immutability

Strings can't be changed in place: \`word[0] = "P"\` is an error. Instead you build a **new**
string (you'll do that with methods in the next lesson).

### Recap

Index with \`[i]\` (0-based, negatives from the end), slice with \`[start:stop]\`, count with
\`len()\`, and remember strings are immutable. Next you'll grab the ends of a word, then trim them
off.`,
    demoCode: `word = "python"
print(word[0])     # p
print(word[-1])    # n
print(word[1:-1])  # ytho
print(len(word))   # 6`,
  },
  apply: {
    id: "py-l1-strings-index-apply",
    executionMode: "single-file",
    prompt: `Implement \`first_and_last(text)\`: return a 2-character string made of the **first** and
**last** characters of \`text\`.

For \`"python"\` return \`"pn"\`. (A one-character string like \`"a"\` returns \`"aa"\`.)`,
    starterCode: `def first_and_last(text):
    # Return text's first character followed by its last character.
    pass`,
    hints: [
      "The first character is `text[0]`.",
      "The last character is `text[-1]`.",
      "Join them with `+`: `return text[0] + text[-1]`.",
    ],
    referenceSolution: `def first_and_last(text):
    return text[0] + text[-1]`,
    testCases: [
      { input: { text: "python" }, expected: "pn", description: "first p, last n" },
      { input: { text: "hi" }, expected: "hi", description: "two characters" },
      { input: { text: "a" }, expected: "aa", description: "one character repeats" },
      { input: { text: "code" }, expected: "ce", description: "first c, last e" },
    ],
  },
  practice: {
    id: "py-l1-strings-index-practice",
    executionMode: "single-file",
    prompt: `Implement \`without_ends(text)\`: return \`text\` with its first and last characters removed.

For \`"python"\` return \`"ytho"\`. For \`"[hi]"\` return \`"hi"\`.`,
    starterCode: `def without_ends(text):
    # Return text without its first and last character.
    pass`,
    hints: [
      "A slice from index 1 up to the last character does it.",
      "`text[1:-1]` starts after the first char and stops before the last.",
    ],
    referenceSolution: `def without_ends(text):
    return text[1:-1]`,
    testCases: [
      { input: { text: "python" }, expected: "ytho", description: "drop p and n" },
      { input: { text: "abc" }, expected: "b", description: "only the middle is left" },
      { input: { text: "[hi]" }, expected: "hi", description: "strip the brackets" },
      { input: { text: "ab" }, expected: "", description: "nothing left in the middle" },
    ],
  },
}

const stringsMethodsLesson: PythonLesson = {
  id: "py-l1-strings-methods",
  title: "String methods & f-strings",
  summary: "Clean and reshape text with methods, and build strings with f-strings.",
  estimatedMinutes: 10,
  difficulty: "easy",
  skills: ["strings", "string-methods", "f-strings"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Methods reshape text

A **method** is a function attached to a value, called with a dot. Strings come with handy ones.
Each returns a **new** string (the original is untouched):

\`\`\`python
"  Hello  ".strip()        # "Hello"   remove surrounding whitespace
"Hello".lower()            # "hello"
"Hello".upper()            # "HELLO"
"a,b,c".split(",")         # ["a", "b", "c"]   text -> list
"cat".replace("c", "b")    # "bat"
\`\`\`

Because each returns a string, you can **chain** them left to right:

\`\`\`python
"  PyThOn  ".strip().lower()   # "python"
\`\`\`

### f-strings

An **f-string** builds text by dropping values straight into \`{ }\`. Put an \`f\` before the quote:

\`\`\`python
name = "Ada"
count = 3
f"{name} has {count} messages"   # "Ada has 3 messages"
\`\`\`

You can even call methods inside the braces: \`f"Hi {name.upper()}"\` → \`"Hi ADA"\`.

### Recap

\`.strip()\`, \`.lower()\`, \`.upper()\`, \`.split()\`, and \`.replace()\` return new strings (and
chain), while f-strings interpolate values into text. Next you'll normalise some text, then build a
greeting with an f-string.`,
    demoCode: `messy = "  PyThOn  "
print(messy.strip().lower())   # python

name = "Ada"
print(f"Hi {name.upper()}!")   # Hi ADA!`,
  },
  apply: {
    id: "py-l1-strings-methods-apply",
    executionMode: "single-file",
    prompt: `Implement \`normalize(text)\`: return \`text\` with surrounding whitespace removed and all
letters lowercased.

For \`"  Hello  "\` return \`"hello"\`.`,
    starterCode: `def normalize(text):
    # Strip surrounding whitespace, then lowercase.
    pass`,
    hints: [
      "`text.strip()` removes the surrounding spaces.",
      "`.lower()` makes everything lowercase.",
      "Chain them: `return text.strip().lower()`.",
    ],
    referenceSolution: `def normalize(text):
    return text.strip().lower()`,
    testCases: [
      { input: { text: "  Hello  " }, expected: "hello", description: "trim and lowercase" },
      { input: { text: "WORLD" }, expected: "world", description: "all caps" },
      { input: { text: "  PyThOn " }, expected: "python", description: "mixed case with spaces" },
      { input: { text: "already" }, expected: "already", description: "nothing to change" },
    ],
  },
  practice: {
    id: "py-l1-strings-methods-practice",
    executionMode: "single-file",
    prompt: `Implement \`loud_greeting(name)\`: return an uppercased greeting using an f-string.

For \`"ada"\` return \`"HELLO, ADA!"\`.`,
    starterCode: `def loud_greeting(name):
    # Build "HELLO, <NAME>!" with an f-string and .upper().
    pass`,
    hints: [
      "Uppercase the name with `name.upper()`.",
      'Build the rest with an f-string: `f"HELLO, {name.upper()}!"`.',
    ],
    referenceSolution: `def loud_greeting(name):
    return f"HELLO, {name.upper()}!"`,
    testCases: [
      { input: { name: "ada" }, expected: "HELLO, ADA!", description: "lowercase input" },
      { input: { name: "Sam" }, expected: "HELLO, SAM!", description: "mixed case input" },
      { input: { name: "world" }, expected: "HELLO, WORLD!", description: "another name" },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L1-M4: Collections
// ───────────────────────────────────────────────────────────────────────────

const listsLesson: PythonLesson = {
  id: "py-l1-lists",
  title: "Lists",
  summary: "Build, index, slice, and grow Python's ordered, mutable collection.",
  estimatedMinutes: 10,
  difficulty: "easy",
  skills: ["lists", "indexing", "append", "mutability"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Lists hold an ordered collection

A **list** is an ordered, changeable collection written with square brackets:

\`\`\`python
nums = [10, 20, 30]
nums[0]      # 10          index like a string (0-based)
nums[-1]     # 30          negative counts from the end
nums[1:]     # [20, 30]    slicing works too
len(nums)    # 3
\`\`\`

### Changing a list

Unlike strings, lists are **mutable**. You can change them in place:

\`\`\`python
nums.append(40)     # [10, 20, 30, 40]      add to the end
nums.insert(0, 5)   # [5, 10, 20, 30, 40]   add at an index
nums.remove(20)     # [5, 10, 30, 40]       remove the first 20
\`\`\`

### Building from scratch

Start empty and grow:

\`\`\`python
picked = []
picked.append("a")
picked.append("b")   # ["a", "b"]
\`\`\`

### Recap

Lists are ordered and mutable: index/slice like strings, \`append\`/\`insert\`/\`remove\` to change
them, \`len()\` to size them. Next you'll grow a list, then reach into the middle of one.`,
    demoCode: `nums = [10, 20, 30]
nums.append(40)
print(nums)        # [10, 20, 30, 40]
print(nums[-1])    # 40
print(len(nums))   # 4`,
  },
  apply: {
    id: "py-l1-lists-apply",
    executionMode: "single-file",
    prompt: `Implement \`add_item(items, value)\`: append \`value\` to the list \`items\` and return the list.

For \`([1, 2], 3)\` return \`[1, 2, 3]\`.`,
    starterCode: `def add_item(items, value):
    # Append value to items, then return items.
    pass`,
    hints: [
      "Add to the end with `items.append(value)`.",
      "After appending, `return items`.",
      "`append` changes the list in place; you still return it.",
    ],
    referenceSolution: `def add_item(items, value):
    items.append(value)
    return items`,
    testCases: [
      { input: { items: [1, 2], value: 3 }, expected: [1, 2, 3], description: "append to a list" },
      { input: { items: [], value: 5 }, expected: [5], description: "append to an empty list" },
      { input: { items: [7], value: 8 }, expected: [7, 8], description: "append to a single item" },
      {
        input: { items: [1, 2, 3], value: 3 },
        expected: [1, 2, 3, 3],
        description: "duplicates are allowed",
      },
    ],
  },
  practice: {
    id: "py-l1-lists-practice",
    executionMode: "single-file",
    prompt: `Implement \`middle_item(items)\`: return the item at the middle index of the list.

The middle index is \`len(items) // 2\`. For \`[10, 20, 30, 40, 50]\` return \`30\`.`,
    starterCode: `def middle_item(items):
    # Return the item at index len(items) // 2.
    pass`,
    hints: [
      "The middle index is `len(items) // 2`.",
      "Index into the list with it: `items[len(items) // 2]`.",
    ],
    referenceSolution: `def middle_item(items):
    return items[len(items) // 2]`,
    testCases: [
      { input: { items: [1, 2, 3] }, expected: 2, description: "middle of three" },
      { input: { items: [10, 20, 30, 40, 50] }, expected: 30, description: "middle of five" },
      { input: { items: [5] }, expected: 5, description: "single item is the middle" },
      { input: { items: [1, 2, 3, 4, 5] }, expected: 3, description: "index 2 of five" },
    ],
  },
}

const tuplesSetsLesson: PythonLesson = {
  id: "py-l1-tuples-sets",
  title: "Tuples & sets",
  summary: "Group fixed records with tuples and track uniqueness with sets.",
  estimatedMinutes: 10,
  difficulty: "easy",
  skills: ["tuples", "sets", "uniqueness", "membership"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Tuples: fixed records

A **tuple** is like a list but **immutable**: once created it can't change. Use one for a fixed
group of values that belong together (a point, a row):

\`\`\`python
point = (3, 4)
point[0]      # 3
x, y = point  # unpack into two names: x = 3, y = 4
\`\`\`

Many functions hand back tuples. For example, \`divmod(17, 5)\` returns \`(3, 2)\`.

## Sets: unique membership

A **set** is an unordered collection with **no duplicates**, written with curly braces (or
\`set(...)\`):

\`\`\`python
seen = {1, 2, 2, 3}   # {1, 2, 3} , duplicates collapse
3 in seen             # True      , fast membership test
\`\`\`

Building a set from a list is the quickest way to drop duplicates or count distinct values:

\`\`\`python
len(set([1, 2, 2, 3]))   # 3   how many distinct items
\`\`\`

### When to use which

- **Tuple**: a small fixed record whose shape won't change.
- **Set**: you care about uniqueness or "is this in here?", not order.

### Recap

Tuples are immutable ordered records (and unpack into names); sets are unordered, unique, and great
for membership and de-duplication. Next you'll count distinct items, then find the smallest and
largest.`,
    demoCode: `nums = [1, 2, 2, 3, 3, 3]
print(len(set(nums)))   # 3   distinct values
print(2 in set(nums))   # True

point = (3, 4)
x, y = point
print(x, y)             # 3 4`,
  },
  apply: {
    id: "py-l1-tuples-sets-apply",
    executionMode: "single-file",
    prompt: `Implement \`unique_count(arr)\`: return how many **distinct** values are in the list \`arr\`.

For \`[1, 2, 2, 3]\` return \`3\`.`,
    starterCode: `def unique_count(arr):
    # Return the number of distinct values in arr.
    pass`,
    hints: [
      "A set drops duplicates: `set(arr)`.",
      "Count the distinct values with `len(set(arr))`.",
    ],
    referenceSolution: `def unique_count(arr):
    return len(set(arr))`,
    testCases: [
      { input: { arr: [1, 2, 2, 3] }, expected: 3, description: "one duplicate" },
      { input: { arr: [1, 1, 1] }, expected: 1, description: "all the same" },
      { input: { arr: [] }, expected: 0, description: "empty list" },
      { input: { arr: [4, 5, 6] }, expected: 3, description: "all distinct" },
    ],
  },
  practice: {
    id: "py-l1-tuples-sets-practice",
    executionMode: "single-file",
    prompt: `Implement \`min_max(arr)\`: return a tuple \`(smallest, largest)\` of the list \`arr\`.

For \`[3, 1, 5, 2]\` return \`(1, 5)\`.`,
    starterCode: `def min_max(arr):
    # Return (smallest, largest).
    pass`,
    hints: [
      "`min(arr)` gives the smallest, `max(arr)` the largest.",
      "Return both as a tuple: `return (min(arr), max(arr))`.",
    ],
    referenceSolution: `def min_max(arr):
    return (min(arr), max(arr))`,
    testCases: [
      { input: { arr: [3, 1, 5, 2] }, expected: [1, 5], description: "min 1, max 5" },
      { input: { arr: [10] }, expected: [10, 10], description: "single value is both" },
      { input: { arr: [-4, 4] }, expected: [-4, 4], description: "negatives included" },
      { input: { arr: [7, 7, 7] }, expected: [7, 7], description: "all equal" },
    ],
  },
}

const dictsLesson: PythonLesson = {
  id: "py-l1-dicts",
  title: "Dictionaries",
  summary: "Map keys to values: read safely, assign, and merge dictionaries.",
  estimatedMinutes: 10,
  difficulty: "easy",
  skills: ["dictionaries", "key-value", "get", "merge"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Dictionaries map keys to values

A **dictionary** stores **key → value** pairs in curly braces. Look a value up by its key, not by
position:

\`\`\`python
prices = {"apple": 3, "pear": 2}
prices["apple"]    # 3
\`\`\`

### Safe lookups with .get

Indexing a missing key is an error. \`.get(key, default)\` returns a fallback instead:

\`\`\`python
prices.get("apple", 0)    # 3
prices.get("banana", 0)   # 0  , not found, so the default
\`\`\`

### Add, update, and merge

\`\`\`python
prices["plum"] = 4                    # add a new pair
prices["apple"] = 5                   # update an existing key
combined = {**prices, **{"fig": 6}}   # merge into a NEW dict
\`\`\`

When two dicts share a key, the **right-hand** one wins in a merge.

### Recap

Dicts map keys to values: read with \`d[key]\` or the safer \`d.get(key, default)\`, assign with
\`d[key] = value\`, and merge with \`{**a, **b}\`. Next you'll look up a price, then merge two dicts.`,
    demoCode: `prices = {"apple": 3, "pear": 2}
print(prices["apple"])          # 3
print(prices.get("banana", 0))  # 0
print({**prices, **{"fig": 6}})  # {'apple': 3, 'pear': 2, 'fig': 6}`,
  },
  apply: {
    id: "py-l1-dicts-apply",
    executionMode: "single-file",
    prompt: `Implement \`lookup(prices, name)\`: return the price for \`name\` from the \`prices\` dict, or
\`0\` if it isn't there.

For \`prices = {"apple": 3}\` and \`name = "banana"\`, return \`0\`.`,
    starterCode: `def lookup(prices, name):
    # Return prices[name], or 0 if name is missing.
    pass`,
    hints: [
      "`prices.get(name)` returns None when the key is missing.",
      "Give it a default: `prices.get(name, 0)`.",
    ],
    referenceSolution: `def lookup(prices, name):
    return prices.get(name, 0)`,
    testCases: [
      {
        input: { prices: { apple: 3, pear: 2 }, name: "apple" },
        expected: 3,
        description: "a key that exists",
      },
      {
        input: { prices: { apple: 3, pear: 2 }, name: "banana" },
        expected: 0,
        description: "a missing key falls back to 0",
      },
      { input: { prices: { a: 1, b: 2 }, name: "b" }, expected: 2, description: "another hit" },
      { input: { prices: {}, name: "x" }, expected: 0, description: "empty dict" },
    ],
  },
  practice: {
    id: "py-l1-dicts-practice",
    executionMode: "single-file",
    prompt: `Implement \`merge_two(a, b)\`: return a new dict with all pairs from \`a\` and \`b\`. When a key
is in both, \`b\`'s value wins.

For \`({"x": 1}, {"x": 9})\` return \`{"x": 9}\`.`,
    starterCode: `def merge_two(a, b):
    # Return a new dict combining a and b (b wins on conflicts).
    pass`,
    hints: [
      "Spread both into a new dict: `{**a, **b}`.",
      "The later spread (`b`) overrides duplicate keys.",
    ],
    referenceSolution: `def merge_two(a, b):
    return {**a, **b}`,
    testCases: [
      {
        input: { a: { x: 1 }, b: { y: 2 } },
        expected: { x: 1, y: 2 },
        description: "no overlap",
      },
      {
        input: { a: { a: 1 }, b: { a: 9 } },
        expected: { a: 9 },
        description: "b wins on conflict",
      },
      { input: { a: {}, b: { k: 5 } }, expected: { k: 5 }, description: "merge into empty" },
      {
        input: { a: { p: 1, q: 2 }, b: { q: 3 } },
        expected: { p: 1, q: 3 },
        description: "partial overlap",
      },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// Gap-fill lessons (added after the CURRICULUM-GAP-ANALYSIS audit): high-value
// beginner topics the original tree missed: identity/equality, the reference
// model, data-structure choice, the enumerate/zip/items idioms, and recursion.
// ───────────────────────────────────────────────────────────────────────────

const identityEqualityLesson: PythonLesson = {
  id: "py-l1-identity-equality",
  title: "is vs == and checking for None",
  summary: "Tell identity (is) apart from equality (==), and check for None the right way.",
  estimatedMinutes: 8,
  difficulty: "easy",
  skills: ["identity", "equality", "none", "is-operator"],
  teach: {
    estimatedMinutes: 3,
    markdown: `## Two different questions: "equal?" vs "the same object?"

\`==\` asks **"are these two values equal?"**. \`is\` asks **"are these two names pointing at the exact
same object?"** They usually agree, but they answer different questions:

\`\`\`python
a = [1, 2, 3]
b = [1, 2, 3]
a == b     # True , same contents
a is b     # False, two different lists
\`\`\`

### Always check None with \`is\`

\`None\` is a single, unique object, so the idiomatic (and correct) test is \`is None\`:

\`\`\`python
if value is None:      # the right way
    ...
if value == None:      # works, but reviewers will flag it, don't
    ...
\`\`\`

### Why not use \`is\` for numbers or strings?

Python *sometimes* reuses small ints and short strings, so \`is\` may look like it works, then
silently break on bigger values:

\`\`\`python
x = 1000
y = 1000
x == y    # True , always use == for values
x is y    # may be False! never rely on this
\`\`\`

**Rule of thumb:** \`is\` only for \`None\` (and \`True\`/\`False\`); \`==\` for everything else.

### Recap

\`==\` compares values, \`is\` compares identity, and you check for \`None\` with \`is None\`. Next
you'll flag a missing value, then safely measure one that might be \`None\`.`,
    demoCode: `a = [1, 2, 3]
b = [1, 2, 3]
print(a == b)   # True  (equal contents)
print(a is b)   # False (different objects)

value = None
print(value is None)   # True`,
  },
  apply: {
    id: "py-l1-identity-equality-apply",
    executionMode: "single-file",
    prompt: `Implement \`is_missing(value)\`: return \`True\` when \`value\` **is** \`None\`, otherwise \`False\`.

Use the \`is None\` test, not \`== None\`.`,
    starterCode: `def is_missing(value):
    # Return True when value is None, else False.
    pass`,
    hints: [
      "Compare with `is None`, not `== None`.",
      "The comparison already produces a bool: `return value is None`.",
    ],
    referenceSolution: `def is_missing(value):
    return value is None`,
    testCases: [
      { input: { value: null }, expected: true, description: "None is missing" },
      { input: { value: 0 }, expected: false, description: "zero is a real value, not missing" },
      { input: { value: "" }, expected: false, description: "empty string is not None" },
      { input: { value: "x" }, expected: false, description: "a normal value" },
    ],
  },
  practice: {
    id: "py-l1-identity-equality-practice",
    executionMode: "single-file",
    prompt: `Implement \`none_safe_len(value)\`: return \`len(value)\`, but return \`0\` when \`value\` is \`None\`
(so it never crashes).

For \`None\` return \`0\`; for \`"abc"\` return \`3\`.`,
    starterCode: `def none_safe_len(value):
    # Return 0 when value is None, otherwise its length.
    pass`,
    hints: [
      "Guard first: `if value is None: return 0`.",
      "Otherwise return `len(value)`.",
      "One line works: `return 0 if value is None else len(value)`.",
    ],
    referenceSolution: `def none_safe_len(value):
    return 0 if value is None else len(value)`,
    testCases: [
      { input: { value: null }, expected: 0, description: "None is length 0" },
      { input: { value: "abc" }, expected: 3, description: "a three-letter string" },
      { input: { value: [1, 2] }, expected: 2, description: "a two-item list" },
      { input: { value: "" }, expected: 0, description: "empty string" },
    ],
  },
}

const referencesCopyLesson: PythonLesson = {
  id: "py-l1-references-copy",
  title: "References, copies & the mutable-default trap",
  summary:
    "Names share objects: build new lists instead of mutating, and never use a mutable default argument.",
  estimatedMinutes: 11,
  difficulty: "easy",
  skills: ["references", "mutability", "copying", "default-arguments"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## A name is a label on an object, not a box

Assigning one list to another name does **not** copy it. Both names label the **same** list:

\`\`\`python
a = [1, 2, 3]
b = a            # b labels the SAME list
b.append(4)
a                # [1, 2, 3, 4] , a changed too!
\`\`\`

This "spooky action at a distance" is the #1 source of *"why did my other list change?"* bugs.

### Build a new list instead of mutating

When a function should return a changed version, build a **new** list and leave the input alone:

\`\`\`python
def with_doubled(nums):
    return [n * 2 for n in nums]   # new list; nums untouched
\`\`\`

### Copying on purpose

Need a genuine copy? Shallow copy with a slice or \`list(...)\`; deep copy (nested) with
\`copy.deepcopy\`:

\`\`\`python
shallow = nums[:]            # new outer list, same inner objects
import copy
deep = copy.deepcopy(grid)   # fully independent, nested included
\`\`\`

### The mutable-default-argument trap

A default value is created **once**, so a mutable default is shared across every call:

\`\`\`python
def bad(item, bucket=[]):     # the SAME list every call, a classic bug
    bucket.append(item)
    return bucket

def good(item, bucket=None):  # fresh list when none is given
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
\`\`\`

### Recap

Names share objects, so prefer building new values over mutating shared ones, copy deliberately
(\`[:]\` or \`copy.deepcopy\`), and never use \`[]\`/\`{}\` as a default: use \`None\` and create it
inside. Next you'll double a list without touching it, then write a safe accumulator.`,
    demoCode: `a = [1, 2, 3]
b = a
b.append(4)
print(a)          # [1, 2, 3, 4], same list!

c = a[:]          # a real (shallow) copy
c.append(99)
print(a)          # unchanged by c`,
  },
  apply: {
    id: "py-l1-references-copy-apply",
    executionMode: "single-file",
    prompt: `Implement \`doubled(nums)\`: return a **new** list where every number is doubled, **without changing**
the original \`nums\`.

For \`[1, 2, 3]\` return \`[2, 4, 6]\`.`,
    starterCode: `def doubled(nums):
    # Return a NEW list with each value doubled; don't mutate nums.
    pass`,
    hints: [
      "Build a new list rather than editing nums in place.",
      "A comprehension makes a new list: `[n * 2 for n in nums]`.",
    ],
    referenceSolution: `def doubled(nums):
    return [n * 2 for n in nums]`,
    testCases: [
      { input: { nums: [1, 2, 3] }, expected: [2, 4, 6], description: "doubles each value" },
      { input: { nums: [] }, expected: [], description: "empty list stays empty" },
      { input: { nums: [5] }, expected: [10], description: "single value" },
      { input: { nums: [-1, 0, 4] }, expected: [-2, 0, 8], description: "negatives and zero" },
    ],
  },
  practice: {
    id: "py-l1-references-copy-practice",
    executionMode: "single-file",
    prompt: `Implement \`append_new(value, bucket=None)\`: append \`value\` to \`bucket\` and return it, but when no
\`bucket\` is given, start a **fresh** list (avoid the mutable-default trap).

\`append_new(1, [2, 3])\` returns \`[2, 3, 1]\`; \`append_new("a")\` returns \`["a"]\`.`,
    starterCode: `def append_new(value, bucket=None):
    # Default bucket to None, then create a fresh [] inside when it's None.
    pass`,
    hints: [
      "Don't write `bucket=[]`. Use `bucket=None`.",
      "Inside: `if bucket is None: bucket = []`.",
      "Then `bucket.append(value)` and `return bucket`.",
    ],
    referenceSolution: `def append_new(value, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(value)
    return bucket`,
    testCases: [
      {
        input: { value: 1, bucket: [2, 3] },
        expected: [2, 3, 1],
        description: "appends to a given list",
      },
      { input: { value: "a" }, expected: ["a"], description: "fresh list when bucket is omitted" },
      { input: { value: 9, bucket: [] }, expected: [9], description: "appends to an empty list" },
    ],
  },
}

const complexityChoiceLesson: PythonLesson = {
  id: "py-l1-complexity-choice",
  title: "Choosing the right data structure",
  summary: "Pick a set or dict for fast membership and lookups instead of scanning a list.",
  estimatedMinutes: 10,
  difficulty: "easy",
  skills: ["sets", "membership", "big-o", "data-structures"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Not all lookups cost the same

Checking \`x in some_list\` makes Python **scan every element**. On a list of a million items that's
a million comparisons. Checking \`x in some_set\` (or a dict) jumps almost straight to the answer:

\`\`\`python
x in a_list    # O(n) , walks the whole list  (slow for big data)
x in a_set     # O(1) , near-instant, any size (fast)
x in a_dict    # O(1) , key lookup is instant too
\`\`\`

\`O(n)\` means "cost grows with the size"; \`O(1)\` means "cost stays flat". This is the single most
useful performance instinct: **when you repeatedly ask 'have I seen this?', reach for a set.**

### The classic upgrade

\`\`\`python
# slow: membership against a list, inside a loop -> O(n^2)
seen = []
for x in items:
    if x in seen:   # scans seen every time
        ...
    seen.append(x)

# fast: same logic, a set -> O(n)
seen = set()
for x in items:
    if x in seen:   # instant
        ...
    seen.add(x)
\`\`\`

### Pick by the question you're asking

- **"Is it in here?" / "have I seen it?"** -> **set**
- **"What value maps to this key?"** -> **dict**
- **"What's the order / can there be duplicates?"** -> **list**

### Recap

List membership is \`O(n)\`; set and dict membership is \`O(1)\`. When you test membership repeatedly,
a set turns a slow \`O(n^2)\` loop into a fast \`O(n)\` one. Next you'll detect duplicates, then find
the first repeat.`,
    demoCode: `nums = [3, 1, 4, 1, 5, 9, 2, 6]
distinct = set(nums)
print(1 in distinct)               # True , O(1) membership
print(len(distinct) != len(nums))  # True , there was a duplicate`,
  },
  apply: {
    id: "py-l1-complexity-choice-apply",
    executionMode: "single-file",
    prompt: `Implement \`has_duplicates(nums)\`: return \`True\` if any value appears more than once in \`nums\`,
otherwise \`False\`. Use a set so it stays fast.

\`[1, 2, 2]\` returns \`True\`; \`[1, 2, 3]\` returns \`False\`.`,
    starterCode: `def has_duplicates(nums):
    # A set drops duplicates, compare its size to the list's.
    pass`,
    hints: [
      "`set(nums)` removes duplicates.",
      "If the set is smaller than the list, there was a duplicate.",
      "`return len(set(nums)) != len(nums)`.",
    ],
    referenceSolution: `def has_duplicates(nums):
    return len(set(nums)) != len(nums)`,
    testCases: [
      { input: { nums: [1, 2, 3] }, expected: false, description: "all distinct" },
      { input: { nums: [1, 2, 2] }, expected: true, description: "one duplicate" },
      { input: { nums: [] }, expected: false, description: "empty list" },
      { input: { nums: [5, 5] }, expected: true, description: "two of the same" },
    ],
  },
  practice: {
    id: "py-l1-complexity-choice-practice",
    executionMode: "single-file",
    prompt: `Implement \`first_repeated(nums)\`: return the first value that appears a **second** time as you scan
left to right, or \`None\` if every value is unique. Track what you've seen with a set.

\`[1, 2, 3, 2, 1]\` returns \`2\` (2 repeats before 1 does).`,
    starterCode: `def first_repeated(nums):
    # Keep a set of seen values; return the first one you see again.
    pass`,
    hints: [
      "Start an empty `seen = set()`.",
      "For each value: if it's already in `seen`, return it; otherwise add it.",
      "Return `None` after the loop if nothing repeated.",
    ],
    referenceSolution: `def first_repeated(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return x
        seen.add(x)
    return None`,
    testCases: [
      { input: { nums: [1, 2, 3, 2, 1] }, expected: 2, description: "2 repeats first" },
      { input: { nums: [1, 2, 3] }, expected: null, description: "no repeats -> None" },
      { input: { nums: [5, 5] }, expected: 5, description: "immediate repeat" },
      { input: { nums: [] }, expected: null, description: "empty list -> None" },
    ],
  },
}

const loopIdiomsLesson: PythonLesson = {
  id: "py-l1-loop-idioms",
  title: "Looping like a Pythonista: enumerate, zip & items",
  summary:
    "Loop with a counter (enumerate), over two lists at once (zip), and over a dict (.items()).",
  estimatedMinutes: 10,
  difficulty: "easy",
  skills: ["enumerate", "zip", "dict-items", "iteration"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Loop over what you have, not over indexes

Beginners often reach for \`range(len(...))\` and index back in. Python has cleaner idioms.

### enumerate: when you need the index *and* the value

\`\`\`python
for i, name in enumerate(["Ada", "Sam"]):
    print(i, name)     # 0 Ada / 1 Sam
\`\`\`

Compare the clunky version (\`for i in range(len(names)): names[i]\`), which is easy to get wrong.

### zip: walk two lists in lockstep

\`\`\`python
names = ["Ada", "Sam"]
scores = [90, 85]
for name, score in zip(names, scores):
    print(name, score)    # Ada 90 / Sam 85
\`\`\`

\`zip\` stops at the shorter list.

### .items(): loop a dict's keys and values together

\`\`\`python
prices = {"apple": 3, "pear": 2}
for fruit, price in prices.items():
    print(fruit, price)
\`\`\`

(\`.keys()\` and \`.values()\` give just one side.)

### Recap

\`enumerate\` gives you \`index, value\`; \`zip\` pairs up two sequences; \`.items()\` gives \`key,
value\` from a dict. Reach for these instead of manual index bookkeeping. Next you'll number a list,
then pair two lists together.`,
    demoCode: `for i, letter in enumerate(["a", "b", "c"]):
    print(i, letter)

for name, score in zip(["Ada", "Sam"], [90, 85]):
    print(name, score)`,
  },
  apply: {
    id: "py-l1-loop-idioms-apply",
    executionMode: "single-file",
    prompt: `Implement \`indexed(items)\`: return a list of \`[index, value]\` pairs, numbering each item from 0.
Use \`enumerate\`.

For \`["a", "b"]\` return \`[[0, "a"], [1, "b"]]\`.`,
    starterCode: `def indexed(items):
    # Return [[0, items[0]], [1, items[1]], ...] using enumerate.
    pass`,
    hints: [
      "`enumerate(items)` yields `(i, value)` pairs.",
      "Collect them: `[[i, v] for i, v in enumerate(items)]`.",
    ],
    referenceSolution: `def indexed(items):
    return [[i, v] for i, v in enumerate(items)]`,
    testCases: [
      {
        input: { items: ["a", "b"] },
        expected: [
          [0, "a"],
          [1, "b"],
        ],
        description: "two items numbered",
      },
      { input: { items: [] }, expected: [], description: "empty list" },
      { input: { items: ["x"] }, expected: [[0, "x"]], description: "single item" },
    ],
  },
  practice: {
    id: "py-l1-loop-idioms-practice",
    executionMode: "single-file",
    prompt: `Implement \`pair_totals(names, scores)\`: return a list of \`[name, score]\` pairs by walking both
lists together with \`zip\`.

\`(["a", "b"], [1, 2])\` returns \`[["a", 1], ["b", 2]]\`.`,
    starterCode: `def pair_totals(names, scores):
    # Pair each name with its score using zip.
    pass`,
    hints: [
      "`zip(names, scores)` yields `(name, score)` pairs.",
      "Build the list: `[[n, s] for n, s in zip(names, scores)]`.",
    ],
    referenceSolution: `def pair_totals(names, scores):
    return [[n, s] for n, s in zip(names, scores)]`,
    testCases: [
      {
        input: { names: ["a", "b"], scores: [1, 2] },
        expected: [
          ["a", 1],
          ["b", 2],
        ],
        description: "pairs two lists",
      },
      { input: { names: [], scores: [] }, expected: [], description: "empty inputs" },
      { input: { names: ["x"], scores: [9] }, expected: [["x", 9]], description: "single pair" },
    ],
  },
}

const recursionLesson: PythonLesson = {
  id: "py-l1-recursion",
  title: "Recursion: a function that calls itself",
  summary: "Solve a problem in terms of a smaller version of itself, with a base case to stop.",
  estimatedMinutes: 11,
  difficulty: "medium",
  skills: ["recursion", "base-case", "call-stack", "functions"],
  teach: {
    estimatedMinutes: 4,
    markdown: `## Recursion: solve it in terms of a smaller self

A **recursive** function calls itself on a smaller input until it hits a **base case** that stops the
chain. Every recursion needs two parts:

1. **Base case**: the smallest input, answered directly (no further call).
2. **Recursive case**: reduce the problem and call yourself.

\`\`\`python
def factorial(n):
    if n <= 1:                    # base case
        return 1
    return n * factorial(n - 1)   # recursive case
\`\`\`

\`factorial(3)\` -> \`3 * factorial(2)\` -> \`3 * 2 * factorial(1)\` -> \`3 * 2 * 1\` = \`6\`.

### The call stack

Each call waits for the one it made, stacking up until the base case returns and they unwind. Forget
the base case and the calls never stop: Python raises \`RecursionError\`.

### When it shines

Recursion is natural for **nested / tree-shaped** data (folders inside folders, a list of lists)
where each part looks like a smaller version of the whole.

### Recap

A recursive function has a **base case** (stop) and a **recursive case** (shrink + call itself). Miss
the base case and it never ends. Next you'll write factorial, then sum a nested list.`,
    demoCode: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))   # 120`,
  },
  apply: {
    id: "py-l1-recursion-apply",
    executionMode: "single-file",
    prompt: `Implement \`factorial(n)\` **recursively**: the product \`n * (n-1) * ... * 1\`, with \`factorial(0)\`
and \`factorial(1)\` both equal to \`1\`.

\`factorial(5)\` is \`120\`. Call \`factorial\` from inside itself; don't use a loop.`,
    starterCode: `def factorial(n):
    # Base case: n <= 1 returns 1. Otherwise n * factorial(n - 1).
    pass`,
    hints: [
      "Base case first: `if n <= 1: return 1`.",
      "Recursive case: `return n * factorial(n - 1)`.",
    ],
    referenceSolution: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)`,
    testCases: [
      { input: { n: 0 }, expected: 1, description: "0! is 1" },
      { input: { n: 1 }, expected: 1, description: "1! is 1" },
      { input: { n: 5 }, expected: 120, description: "5! is 120" },
      { input: { n: 3 }, expected: 6, description: "3! is 6" },
    ],
  },
  practice: {
    id: "py-l1-recursion-practice",
    executionMode: "single-file",
    prompt: `Implement \`sum_nested(items)\`: return the sum of all numbers in a list that may contain **nested
lists**, to any depth. Recurse into each sub-list.

\`[1, [2, 3], [4, [5]]]\` returns \`15\`.`,
    starterCode: `def sum_nested(items):
    # For each element: recurse if it's a list, otherwise add the number.
    pass`,
    hints: [
      "Check each element with `isinstance(x, list)`.",
      "If it's a list, add `sum_nested(x)`; otherwise add `x`.",
      "Keep a running total and return it.",
    ],
    referenceSolution: `def sum_nested(items):
    total = 0
    for x in items:
        if isinstance(x, list):
            total += sum_nested(x)
        else:
            total += x
    return total`,
    testCases: [
      { input: { items: [1, 2, 3] }, expected: 6, description: "flat list" },
      { input: { items: [1, [2, 3], [4, [5]]] }, expected: 15, description: "nested to depth 2" },
      { input: { items: [] }, expected: 0, description: "empty list" },
      {
        input: { items: [[1], [2]] },
        expected: 3,
        description: "lists of lists",
      },
    ],
  },
}

export const level1: PythonLevel = {
  id: 1,
  slug: "fundamentals",
  title: "Level 1: Foundations",
  tagline: "Reference-style basics: variables, types, loops, and functions.",
  defaultExecutionMode: "single-file",
  estimatedHours: 4,
  modules: [
    {
      id: "py-l1-fundamentals",
      title: "First Steps",
      description: "Run your first program, show output, and store values in variables.",
      lessons: [helloLesson, variablesLesson],
    },
    {
      id: "py-l1-data-types",
      title: "Data Types",
      description: "Numbers, booleans, None, and converting between types.",
      lessons: [numbersLesson, boolNoneConvertLesson, identityEqualityLesson],
    },
    {
      id: "py-l1-strings",
      title: "Strings & Formatting",
      description: "Index, slice, and reshape text with string methods and f-strings.",
      lessons: [stringsIndexLesson, stringsMethodsLesson],
    },
    {
      id: "py-l1-collections",
      title: "Collections",
      description: "Lists, tuples, sets, and dictionaries (Python's core containers).",
      lessons: [
        listsLesson,
        tuplesSetsLesson,
        dictsLesson,
        referencesCopyLesson,
        complexityChoiceLesson,
      ],
    },
    {
      id: "py-l1-control-flow",
      title: "Control Flow & Functions",
      description: "Branch with if/else, repeat with loops, and package logic into functions.",
      lessons: [
        conditionalsLesson,
        loopsLesson,
        loopIdiomsLesson,
        functionsLesson,
        recursionLesson,
        temperatureLesson,
      ],
    },
  ],
}

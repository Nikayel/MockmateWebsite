/**
 * Level 1 — Foundations (single-file). Reference-style basics.
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
 *    `head/list/l1/l2` (→ ListNode) are auto-coerced when the value is a list — avoid them for
 *    plain numbers/lists. These lessons use safe names (nums, arr, n, k, text, width, …).
 *  - Numeric `expected` values are compared with tolerance, so float results (e.g. 37.0) match
 *    integer expectations (37).
 */
import type { PythonLesson, PythonLevel } from "../../types"

// ───────────────────────────────────────────────────────────────────────────
// L1-M1 — First Steps
// ───────────────────────────────────────────────────────────────────────────

const helloLesson: PythonLesson = {
  id: "py-l1-hello",
  title: "Your first program — print & comments",
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

A line that starts with \`#\` is a **comment** — Python ignores it. Comments are notes for humans:

\`\`\`python
# This is a comment. Python skips it.
print("but this runs")   # a comment can also sit after code
\`\`\`

### print vs return

\`print\` shows text on the screen. But when we **check** your code, we don't watch the screen — we
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

Build the message once and return it. You can still \`print()\` while you experiment — just remember
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
    prompt: `Implement \`greet(name)\` — return a greeting for the given \`name\`.

For \`name = "World"\` it should return the string \`"Hello, World!"\`. Build it by joining
\`"Hello, "\`, the \`name\`, and \`"!"\` with \`+\`. Return it (don't print it).`,
    starterCode: `def greet(name):
    # Return "Hello, " + name + "!"
    pass`,
    hints: [
      'Join the pieces with `+`: `"Hello, " + name + "!"`.',
      "Use `return`, not `print` — the grader checks the returned string.",
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
    prompt: `Implement \`banner(name)\` — wrap \`name\` in a simple banner.

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

Once a value has a name, you use it by that name — and you can **reassign** it later:

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
    prompt: `Implement \`rectangle_area(width, height)\` — return the area of a rectangle.

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
    prompt: `Implement \`seconds_total(hours, minutes)\` — convert a duration to **total seconds**.

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
// L1-M5 — Control Flow & Functions
// `py-l1-temperature` is Agent 1's canonical single-file sample (pinned by registry.test.ts).
// ───────────────────────────────────────────────────────────────────────────

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
- \`n\` is a **parameter** — a placeholder filled in when the function is called.
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
return the expression directly when it's a one-liner — no temporary variable needed.

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
    prompt: `Implement \`to_celsius(f)\` — convert a temperature in **Fahrenheit** to **Celsius**.

The formula is \`(f - 32) * 5 / 9\`. Return the result (don't print it).`,
    starterCode: `def to_celsius(f):
    # Convert Fahrenheit (f) to Celsius and return it.
    pass`,
    hints: [
      "Use the formula (f - 32) * 5 / 9.",
      "Use `return`, not `print` — the grader checks the returned value.",
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
    prompt: `Now go the other way: implement \`to_fahrenheit(c)\` — convert **Celsius** to **Fahrenheit**.

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

export const level1: PythonLevel = {
  id: 1,
  slug: "fundamentals",
  title: "Level 1 — Foundations",
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
      lessons: [],
    },
    {
      id: "py-l1-strings",
      title: "Strings & Formatting",
      description: "Index, slice, and reshape text with string methods and f-strings.",
      lessons: [],
    },
    {
      id: "py-l1-collections",
      title: "Collections",
      description: "Lists, tuples, sets, and dictionaries — Python's core containers.",
      lessons: [],
    },
    {
      id: "py-l1-control-flow",
      title: "Control Flow & Functions",
      description: "Branch with if/else, repeat with loops, and package logic into functions.",
      lessons: [temperatureLesson],
    },
  ],
}

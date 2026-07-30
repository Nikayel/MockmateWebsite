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
    markdown: `## Why the return value is the thing we check

In real code a function exists to hand a value back to whatever called it. \`print(...)\` is a side effect for a human watching a terminal. \`return\` is how one piece of code passes a result to another piece of code. Tests, callers, and data pipelines read the returned value and never look at the screen, so a function that prints the right answer but forgets to \`return\` it is still broken. That distinction is the whole point of this lesson.

## Running top to bottom

Python executes a file one line at a time, from the top down. \`print(...)\` writes its argument to output, then moves to the next line.

\`\`\`python
print("Python runs top to bottom")
print("one line at a time")
# output:
# Python runs top to bottom
# one line at a time
\`\`\`

A line starting with \`#\` is a comment. Python ignores everything after the \`#\` on that line, so comments are notes for humans, not instructions for the machine.

\`\`\`python
# this whole line is skipped
print("this runs")   # a comment can also trail real code
\`\`\`

## Building strings with \`+\`

A string is text in quotes. The \`+\` operator on two strings joins them into one new string (this is called concatenation).

\`\`\`python
greeting = "Hello, " + "world" + "!"
print(greeting)   # Hello, world!
\`\`\`

Note the exact characters: \`"Hello, "\` already includes a comma and a trailing space, so you do not add spacing yourself. Getting that spacing right is exactly what the Apply and Practice exercises check.

## Functions that return

A function packages code under a name so you can reuse it. \`def\` starts the definition, the name and parameters follow, and \`return\` sends a value back to the caller.

\`\`\`python
def greet(name):
    return "Hello, " + name + "!"   # hand the finished string back

print(greet("Ada"))   # Hello, Ada!
\`\`\`

Calling \`greet("Ada")\` substitutes \`"Ada"\` for \`name\`, builds \`"Hello, Ada!"\`, and returns it. The same shape covers \`banner(name)\`: wrap the name by returning \`"=== " + name + " ==="\`.

## Pitfall: \`+\` will not mix a string and a number

\`+\` only concatenates string with string. If one side is a number you get a crash, not automatic conversion:

\`\`\`python
"Room " + 12
# TypeError: can only concatenate str (not "int") to str
\`\`\`

The fix is to convert the number first with \`str(...)\`: \`"Room " + str(12)\` gives \`"Room 12"\`. In these exercises \`name\` is already a string, so plain \`+\` is safe.

**Interview nuance:** every Python function returns something. If you never write \`return\`, or you only \`print(...)\` inside it, the function hands back \`None\`, and \`print(...)\` itself evaluates to \`None\`. So \`return print("Hello")\` returns \`None\`, not the text. Interviewers use this to check that you separate a value (what \`return\` produces) from a side effect (what \`print\` does). The grader here calls your function and inspects the returned string, so always \`return\` the message rather than printing it.`,
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
    markdown: `## Names for values, and why they matter

Every nontrivial program builds a result in steps: read an input, transform it, combine it, return it. A **variable** pins an intermediate value to a name so you can reuse it without recomputing, and so the next person (often you, a week later) can read what the code means. \`total_price\` tells a reviewer what a number is. \`x\` makes them guess. A good name is the cheapest documentation you will ever write.

### Assignment binds a name to a value

Read \`=\` as "gets", not "equals":

\`\`\`python
score = 10        # the name score now refers to 10
name = "Ada"      # name refers to the string "Ada"
\`\`\`

The right-hand side is evaluated **first**, then the name is pointed at the result. That is why rebuilding a value from its old self works:

\`\`\`python
score = 10
score = score + 5   # RHS 10 + 5 runs first, then score is re-pointed to 15
\`\`\`

\`=\` is an instruction ("make this name refer to that value"), not a claim that two things are already equal.

### A worked example

\`\`\`python
width = 4
height = 3
area = width * height
print(area)            # 12

width = 10             # reassign width only
print(width * height)  # 30
\`\`\`

Notice that \`area\` is computed once and stays \`12\`. Rebinding \`width\` to \`10\` does not reach back and update \`area\`, because \`area\` holds the number that \`width * height\` produced at that instant, not a live formula.

### Name things clearly

Use lowercase words joined by underscores (**snake_case**) and pick names that say what the value holds:

\`\`\`python
total_price = 4.99
items_in_cart = 3
\`\`\`

You can compute into a well-named variable and then return it, or return the expression directly when it is a one-liner. Both are clear:

\`\`\`python
def rectangle_area(width, height):
    area = width * height   # store, then return
    return area

def rectangle_area(width, height):
    return width * height   # return the expression directly
\`\`\`

### Pitfalls

- **Reassignment does not recompute earlier results.** As above, \`area\` stays \`12\` after \`width\` changes. If you need the updated area, recompute it: \`area = width * height\`.
- **Using a name before it is assigned** raises \`NameError\`. The name must be bound on some line that actually runs before you read it, so \`score = score + 5\` fails if \`score\` was never given a starting value.

**Interview nuance:** in Python a variable is a name bound to an object, not a box that stores the value. Assignment never copies the object; it just points a name at it. For numbers and strings this is invisible, but the same rule means two names can refer to the *same* list, so mutating through one name is visible through the other. Remembering that "assignment rebinds, it does not copy" is what saves you from aliasing bugs later.`,
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
// `py-l1-temperature` is defined further down (next to these, for historical reasons) but is
// authored into L1-M1, right after `py-l1-hello`. See the note above its definition.
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
    markdown: `## Why branching is the core of every program

Software makes decisions. A login route checks whether a token is valid, an ETL job sends a row to "clean" or "quarantine", a pricing function picks a tier. All of that is \`if\`/\`elif\`/\`else\`. Getting the branch order and the boolean logic right is the difference between code that handles every case and code that silently mishandles one.

### The mental model: first true branch wins

Python evaluates the conditions top to bottom and runs the block under the **first** one that is \`True\`. Every later branch is skipped, even if it would also be true. \`else\` is the catch-all that runs when nothing above it matched.

\`\`\`python
score = 85
if score >= 90:
    print("A")
elif score >= 80:
    print("B")
else:
    print("F")        # prints B
\`\`\`

\`score\` is \`85\`, so \`score >= 90\` is \`False\`, \`score >= 80\` is \`True\`, and Python stops there and prints \`B\`. Order matters. If you had checked \`score >= 80\` first, a \`95\` would also match it and wrongly print \`B\`. Put the tightest condition first.

### Comparisons produce booleans

Each comparison evaluates to \`True\` or \`False\`:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["You type", "It means", "A true example"],
  "rows": [
    ["==", "equal to", "3 == 3"],
    ["!=", "not equal to (≠)", "3 != 4"],
    ["<", "less than", "2 < 3"],
    [">", "greater than", "4 > 3"],
    ["<=", "at most (≤)", "3 <= 3"],
    [">=", "at least (≥)", "3 >= 3"]
  ],
  "highlightCols": ["You type"],
  "caption": "The first column is what you type; the symbols in the middle are what the operators mean in ordinary maths notation. Note the last two are true for EQUAL values as well, which is the difference between at most and less than."
}
\`\`\`

Use \`==\` to compare and a single \`=\` to assign. Swapping them is a classic bug. Python also allows chained comparisons, so \`0 < x < 10\` means "x is between 0 and 10" and reads exactly like math.

### Combining conditions with \`and\` / \`or\` / \`not\`

\`\`\`python
age >= 18 and citizen     # True only if both are True
is_weekend or is_holiday  # True if at least one is True
not finished              # flips the boolean
\`\`\`

That first line is the shape of the \`can_vote\` exercise: return \`age >= 18 and citizen\`. For \`sign(n)\` you branch on three ranges. Check \`n > 0\`, then \`elif n < 0\`, then \`else\` for \`"zero"\`. Because the first true branch wins, \`else\` safely means "exactly 0" without you re-testing it.

### Pitfall: truthiness and short-circuiting

\`if\`, \`and\`, and \`or\` do not require real booleans. Python treats \`0\`, \`0.0\`, \`""\`, \`[]\`, \`{}\`, and \`None\` as falsy and nearly everything else as truthy, so \`if items:\` means "if the list is non-empty". Watch the trap: writing \`if age == 18\` when you meant \`age >= 18\` rejects everyone older. And \`and\`/\`or\` short-circuit, stopping as soon as the answer is known, which is why \`user and user.name\` never crashes on a \`None\` user.

**Interview nuance:** \`and\` and \`or\` return one of their operands, not a coerced \`True\`/\`False\`. \`x and y\` gives \`x\` when \`x\` is falsy, otherwise \`y\`. \`x or y\` gives \`x\` when \`x\` is truthy, otherwise \`y\`. So \`"" or "guest"\` returns \`"guest"\` (a common default-value trick) and \`3 and 5\` returns \`5\`. In \`age >= 18 and citizen\`, both operands are booleans (\`age >= 18\` is a comparison result and \`citizen\` is \`True\` or \`False\`), so the expression evaluates to a clean \`True\`/\`False\`, which is exactly what \`can_vote\` should return.`,
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
    markdown: `## Why loops are the workhorse of real code

Almost nothing useful happens exactly once. You process every row in a file, retry a request until it succeeds, sum a column, or scan a list for the values you care about. A loop is how you say "do this for each of these" without copying the same line a thousand times. In data and backend work, most of your logic lives inside some loop over records, so knowing exactly how each loop starts, advances, and stops is core mechanics, not trivia.

## \`for\`: run the body once per item

A \`for\` loop binds a variable to each element of a collection in turn and runs its body:

\`\`\`python
for name in ["Ada", "Sam"]:
    print(name)      # Ada, then Sam
\`\`\`

The loop variable (\`name\`) is reassigned each pass. When the collection is exhausted, the loop ends on its own. You never manage an index by hand unless you actually need one.

## \`range\`: count without building a list

\`range(start, stop)\` produces the integers from \`start\` up to but not including \`stop\`:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["You write", "You get", "How many items"],
  "rows": [
    ["range(4)", "0, 1, 2, 3", "4"],
    ["range(1, 4)", "1, 2, 3", "3"],
    ["range(0, 10, 2)", "0, 2, 4, 6, 8", "5"],
    ["range(4, 0, -1)", "4, 3, 2, 1", "4"],
    ["range(4, 4)", "nothing", "0"],
    ["range(0, 10, -1)", "nothing", "0"]
  ],
  "highlightCols": ["How many items"],
  "caption": "stop is always excluded, which is why range(4) gives exactly 4 items starting at 0. The last two rows are the silent ones: an empty range is not an error, so a loop over it simply never runs and the bug shows up as missing output rather than a traceback."
}
\`\`\`

\`\`\`python
for i in range(1, 4):
    print(i)         # 1, 2, 3
\`\`\`

That excluded \`stop\` is the single most common source of off-by-one bugs. To count \`1\` through \`n\` inclusive, you need \`range(1, n + 1)\`. With one argument, \`range(n)\` starts at \`0\` and gives \`n\` values: \`0, 1, ..., n - 1\`.

## The accumulator pattern

Most "compute a result over many items" problems share one shape: start a variable at a neutral value, then update it every pass. The demo below sums \`1\` through \`5\`:

\`\`\`python
total = 0
for i in range(1, 6):
    total = total + i   # total += i does the same
print(total)            # 15
\`\`\`

The starting value matters. \`total = 0\` is the correct answer when nothing is added, so if the range is empty the loop body never runs and you get \`0\` back. That is exactly the \`n = 0\` case you will handle.

To count instead of sum, keep a counter and bump it only when a condition holds. The even test uses the modulo operator \`%\`, which gives the remainder of a division:

\`\`\`python
count = 0
for n in [1, 2, 3, 4]:
    if n % 2 == 0:      # remainder 0 means even
        count += 1
print(count)            # 2
\`\`\`

## \`while\`, \`break\`, \`continue\`

A \`while\` loop repeats as long as its condition is \`True\`, so something inside must move toward making it \`False\` or it runs forever:

\`\`\`python
n = 3
while n > 0:
    print(n)            # 3, then 2, then 1
    n = n - 1           # move toward the exit, or it loops forever
\`\`\`

\`break\` exits the loop immediately, and \`continue\` skips the rest of the current pass and jumps to the next one:

\`\`\`python
for n in nums:
    if n < 0:
        continue        # skip this value, keep looping
    if n > 100:
        break           # stop the whole loop now
    process(n)
\`\`\`

## Pitfalls

- Off-by-one: \`range(1, n)\` stops at \`n - 1\`. Summing \`1\` to \`n\` needs \`range(1, n + 1)\`.
- Infinite \`while\`: if you forget to update the variable in the condition, the loop never ends. Always change state that moves toward the exit.

**Interview nuance:** \`range\` is a lazy sequence, not a list. \`range(1_000_000_000)\` costs constant memory because it stores only \`start\`, \`stop\`, and \`step\` and computes each value on demand, rather than materializing a billion integers. That is why looping with \`range(n)\` is O(n) time but O(1) extra space, while \`list(range(n))\` would allocate all \`n\` values up front. Interviewers use this to check whether you understand that iterating over data is not the same as storing it.`,
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

A function is how you stop copy-pasting the same logic into ten places. Name a block of code once, and every caller reuses it. Defaults take this further: they let one function serve many call sites without forcing every caller to spell out every argument. Picking a good default is real API design. When you call \`int("10")\` and get \`10\`, that is \`int(x, base=10)\` quietly defaulting \`base\` to \`10\`; give \`int("ff", 16)\` instead and you get \`255\`. Most functions you use daily lean on defaults you never think about.

### The mental model

\`def\` binds a name to a parameter list plus a body. The words in the parentheses are **parameters** (the names inside the function); the values you pass are **arguments**. Positional arguments fill parameters left to right. A **default** gives a parameter a fallback value that is used only when the caller omits that argument.

\`\`\`python
def power(base, exp=2):
    return base ** exp

print(power(5))      # 25   exp falls back to 2, so 5 ** 2
print(power(2, 3))   # 8    exp is given as 3, so 2 ** 3
\`\`\`

\`power(5)\` binds \`base\` to \`5\` and lets \`exp\` default to \`2\`. \`power(2, 3)\` binds \`base\` to \`2\` and \`exp\` to \`3\`. You can also pass by name in any order: \`power(exp=3, base=2)\` also returns \`8\`.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["The call", "base becomes", "exp becomes", "Result"],
  "rows": [
    ["power(5)", "5", "2, the default", "25"],
    ["power(2, 3)", "2", "3", "8"],
    ["power(2, exp=3)", "2", "3", "8"],
    ["power(exp=3, base=2)", "2", "3", "8, since names free you from order"],
    ["power()", "nothing to bind", "2, the default", "TypeError: missing a required argument"],
    ["power(exp=3)", "nothing to bind", "3", "TypeError, because a default cannot fill base"]
  ],
  "highlightCols": ["Result"],
  "caption": "The last two rows are the same error, and they show what a default does NOT do. Giving exp a fallback never makes base optional; a parameter without its own default must always receive a value from somewhere."
}
\`\`\`

A function can \`return\` any value, not just numbers. Your Practice builds and returns a string, so keep in mind that the result of a function is whatever object you hand to \`return\`.

### Reading a traceback

When code raises an error, Python prints a **traceback**. Read it bottom-up.

\`\`\`text
Traceback (most recent call last):
  File "main.py", line 4, in <module>
    print(power("2", 3))
  File "main.py", line 2, in power
    return base ** exp
TypeError: unsupported operand type(s) for ** or pow(): 'str' and 'int'
\`\`\`

The **last line** names the error type and message: a \`TypeError\` because \`"2"\` is a \`str\`, and you cannot raise a string to a power. The frames above it are the call chain, newest at the bottom. Here they say the failure happened at \`return base ** exp\`, called from \`print(power("2", 3))\`. Read the last line first, then walk up only as far as you need.

### Pitfall: default parameters must come last

Every parameter with a default has to appear after every parameter without one:

\`\`\`python
def power(exp=2, base):   # SyntaxError: non-default argument follows default argument
    return base ** exp
\`\`\`

Python cannot fill positional arguments left to right if a required parameter sits behind an optional one. Fix it by ordering required parameters first: \`def power(base, exp=2)\`.

**Interview nuance:** a default value is evaluated **once**, when \`def\` runs, not on each call, so a mutable default like \`bucket=[]\` is shared across calls and quietly accumulates results between them. The next lesson, References, copies and the mutable-default trap, covers why this happens and the \`None\`-sentinel fix in full.`,
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

// Agent 1's canonical single-file sample, pinned by registry.test.ts (which fixes its id and
// exercise modes, never its position). Authored into L1-M1 directly after `py-l1-hello`, whose
// teach block already introduces `def`/parameters/`return` and return-vs-print: this lesson
// reinforces that shape on arithmetic and must not re-teach it from scratch.
const temperatureLesson: PythonLesson = {
  id: "py-l1-temperature",
  title: "Functions & return values",
  summary: "Write functions that take an input, compute, and return a value.",
  estimatedMinutes: 8,
  difficulty: "easy",
  skills: ["functions", "arithmetic", "return-values"],
  teach: {
    estimatedMinutes: 3,
    markdown: `## The same shape, now doing arithmetic

The last lesson used \`def\` and \`return\` to hand back a string. Nothing about that shape changes when the work is arithmetic instead: the function takes an input, computes, and returns one value. Interview questions are phrased this way almost every time, "write a function that takes X and returns Y", so this input-to-output contract is worth making automatic.

\`\`\`python
def square(n):
    return n * n

print(square(5))   # 25
print(square(9))   # 81
\`\`\`

\`square\` takes a number rather than a string, but the contract is identical: one value in, one returned value out. The grader still reads what you \`return\`, so a function that prints its answer and returns nothing still fails.

### Pitfall: float vs floor division

Both of your exercises divide, so watch the division operator. In Python 3, \`/\` is float division and always yields a \`float\`, even when it divides evenly.

\`\`\`python
print(9 / 4)     # 2.25   float division
print(9 // 4)    # 2      floor division, throws away the remainder
\`\`\`

Two traps in your formulas. First, use \`/\`, not \`//\`. Floor division like \`(f - 32) * 5 // 9\` rounds down (\`//\` floors toward negative infinity), so a result that should be \`37.777...\` comes back as \`37\`. Second, keep the parentheses. \`f - 32 * 5 / 9\` evaluates \`32 * 5 / 9\` first, because \`*\` and \`/\` bind tighter than \`-\`, which is not the conversion you want. Write \`(f - 32)\` so the subtraction happens before the multiply.

**Interview nuance:** interviewers favor pure functions, ones whose output depends only on their arguments and that cause no side effects (no printing, no mutating globals). \`to_celsius(212)\` returns \`100.0\` every time, so it is trivial to test, cache, and compose, as in \`to_fahrenheit(to_celsius(212))\`. A function that prints instead of returning cannot be reused or asserted on, which is exactly why "return, do not print" is the first thing a reviewer checks.`,
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
    markdown: `## Why arithmetic types matter

Every counter, price, average, and timestamp your code touches is a number, and Python has two everyday flavors: **integers** (\`int\`, whole numbers like \`3\` or \`-7\`) and **floats** (\`float\`, decimals like \`3.14\` or \`2.0\`). The distinction is not cosmetic. An \`int\` is exact and can grow arbitrarily large; a \`float\` is a fixed-width binary approximation that trades exactness for a decimal point. Pick the wrong one and a report that should read \`2 hours\` reads \`2.0833333 hours\`, or a total that should be \`100\` drifts to \`99.99999999\`. Interviewers and data pipelines both care which type you end up holding.

### The operators, and the type each returns

\`\`\`python
7 + 2     # 9     int + int -> int
7 - 2     # 5
7 * 2     # 14
7 / 2     # 3.5   true division ALWAYS returns a float
2 ** 10   # 1024  power
\`\`\`

The one to memorize: \`/\` always gives a \`float\`, even when the result is whole. \`6 / 2\` is \`3.0\`, not \`3\`. That is exactly what your \`average(a, b, c)\` exercise wants: sum the three numbers and divide by \`3\`, and a decimal answer is correct.

### Floor division and modulo: splitting into groups

\`//\` gives the whole number of times the divisor fits, and \`%\` gives what is left over. Together they split one number into a quotient and a remainder:

\`\`\`python
total = 125
hours = total // 60   # 2   whole hours
mins  = total % 60    # 5   leftover minutes
\`\`\`

That is the entire trick behind \`minutes_to_hm(total_minutes)\`: return \`[total_minutes // 60, total_minutes % 60]\`, which is \`[2, 5]\` for \`125\`. Reach for \`//\` and \`%\` whenever you mean "how many whole groups" and "what is left".

### Pitfalls

**Float equality lies.** Because floats are binary approximations, \`0.1 + 0.2 == 0.3\` evaluates to \`False\` (\`0.1 + 0.2\` is actually \`0.30000000000000004\`). Never compare floats with \`==\`. Compare with a tolerance, for example \`abs(x - y) < 1e-9\`, or use \`math.isclose(x, y)\`.

**\`//\` is not truncation.** \`//\` floors toward negative infinity, so \`-7 // 2\` is \`-4\`, not \`-3\`. And \`%\` takes the sign of the divisor: \`-7 % 2\` is \`1\` in Python. This surprises people coming from C or Java. For your minute problems the inputs are non-negative, so \`//\` and \`%\` line up with everyday intuition, but know the edge case exists.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Expression", "Python", "C and Java", "What differs"],
  "rows": [
    ["7 // 3", "2", "2", "nothing: both agree on positives"],
    ["7 % 3", "1", "1", "nothing"],
    ["-7 // 3", "-3", "-2", "Python floors toward negative infinity, C truncates toward zero"],
    ["-7 % 3", "2", "-1", "in Python the remainder takes the DIVISOR's sign"],
    ["7 % -3", "-2", "1", "same rule, mirrored"]
  ],
  "highlightCols": ["Python"],
  "caption": "Both languages preserve a == (a // b) * b + a % b; they just split the pair differently once a sign is negative. Python's choice keeps % non-negative whenever the divisor is positive, which is exactly what makes i % len(xs) safe as a wraparound index."
}
\`\`\`

**Interview nuance:** the identity \`a == (a // b) * b + (a % b)\` always holds in Python, and because \`//\` floors (rather than truncating toward zero like C, Java, and Go), Python's \`%\` result always carries the sign of the divisor \`b\`, never the sign of \`a\`. Interviewers use this to test whether you actually know your language's division semantics: \`-7 % 3\` is \`2\` in Python but \`-1\` in C. When you need clock-style wraparound (an index that stays in range), Python's flooring \`%\` is the behavior you want.
`,
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
    markdown: `## True, False, None, and turning one type into another

Real programs live at boundaries where data arrives as text. A form field, a CSV cell, a query string, a JSON body from an API: all of it shows up as \`str\`, even when it means a number. Before you can add, compare, or store it you have to convert it, and you have to decide what "missing" looks like. Get the conversion or the missing-value check wrong and you either crash on bad input or silently treat empty data as real data. That is exactly the kind of edge case an interviewer builds a test around.

### Booleans come from asking questions

A **boolean** is one of two values, \`True\` or \`False\`, and it is what a comparison hands back:

\`\`\`python
3 > 2     # True
3 == 4    # False   (\`==\` compares; \`=\` assigns)
\`\`\`

You use booleans to drive branches (\`if\`), loops (\`while\`), and filters. Keep \`==\` (compare) and \`=\` (assign) straight, because swapping them is a classic typo.

### \`None\` means "there is nothing here"

\`None\` is Python's single "no value" object, used for "not set yet" or "no result". It is not \`0\` and not \`""\`, which are both real values. Test for it with identity, \`x is None\`, not \`x == None\`, because \`None\` is a unique singleton and \`is\` checks for that exact object.

### Converting between types

Input often arrives as text, so convert it explicitly:

\`\`\`python
int("42")     # 42     text -> integer
float("3.5")  # 3.5    text -> float
str(42)       # "42"   number -> text
\`\`\`

\`int()\` is strict. It parses \`"42"\` but raises \`ValueError\` on \`""\`, \`"3.5"\`, or \`"12a"\`. That strictness is why a function like \`parse_or_zero\` has to check for the empty string *before* it calls \`int()\`, not after.

### Truthiness

In a condition, every value is either **truthy** or **falsy**. Memorise the falsy ones: \`False\`, \`None\`, \`0\`, \`0.0\`, \`""\`, \`[]\`, \`{}\`, and \`()\`. Everything else is truthy.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Falsy value", "Type", "The truthy version"],
  "rows": [
    ["False", "bool", "True"],
    ["None", "NoneType", "there is no truthy None"],
    ["0", "int", "any non-zero int, including negatives"],
    ["0.0", "float", "any non-zero float"],
    ["'' (empty string)", "str", "any string with a character in it, even a single space"],
    ["[]", "list", "any list with an item, even [0]"],
    ["{}", "dict", "any dict with a pair"],
    ["()", "tuple", "any tuple with an item"]
  ],
  "highlightCols": ["The truthy version"],
  "caption": "Every falsy value is empty or zero. Two traps live in the right column: a single space is a non-empty string and therefore truthy, and [0] is a list containing a falsy item and is itself truthy. Emptiness is about the container, never its contents."
}
\`\`\`

\`\`\`python
"yes" if "hello" else "no"   # "yes"   non-empty string is truthy
"yes" if "" else "no"        # "no"    empty string is falsy
\`\`\`

That \`A if condition else B\` shape is a **conditional expression**: it evaluates to \`A\` when the condition is truthy, otherwise \`B\`. It is the whole answer to a \`yes_no\`-style helper.

One trap: \`bool("False")\` is \`True\` and \`bool("0")\` is \`True\`, because both are non-empty strings. Truthiness asks whether the container is empty, not what the text spells. If you ever need to interpret the *word* \`"false"\`, you must compare the string yourself.

**Interview nuance:** \`bool\` is a subclass of \`int\` in Python, so \`True\` equals \`1\` and \`False\` equals \`0\`. That means \`sum([True, False, True])\` is \`2\`, a common one-liner for counting how many items pass a test. Interviewers probe this to see if you know \`isinstance(True, int)\` is \`True\`, and that a stray boolean can quietly do arithmetic instead of raising.`,
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
    markdown: `## Why reaching into text by position matters

Almost every parsing task starts with position. You pull a fixed-width field out of a log line, strip a known bracket or prefix off an ID, grab the last four characters of an order number, or read a file extension off the end of a name. Before you reach for fancy string methods or regular expressions, indexing and slicing are the cheapest, most predictable way to get at part of a string. Get these solid and half of "clean up this messy text" work becomes trivial.

## A string is an indexed sequence

A Python string is an ordered sequence of characters. Every character has a **position**, called an *index*, counted from \`0\` at the front. You can also count from the back with negative indices, where \`-1\` is the last character:

\`\`\`text
 p  y  t  h  o  n
 0  1  2  3  4  5      <- index from the front
-6 -5 -4 -3 -2 -1      <- index from the back
\`\`\`

Reach in with square brackets, and use \`len()\` to count characters:

\`\`\`python
word = "python"
word[0]    # "p"   first character
word[-1]   # "n"   last character
len(word)  # 6     number of characters
\`\`\`

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Counting", "p", "y", "t", "h", "o", "n"],
  "rows": [
    ["From the left", 0, 1, 2, 3, 4, 5],
    ["From the right", -6, -5, -4, -3, -2, -1]
  ],
  "highlightCols": ["Counting"],
  "caption": "Two rulers over the same six characters. Left-counting starts at 0, which is why the last index is 5 and not 6; right-counting starts at -1, because -0 and 0 would be the same number."
}
\`\`\`

To build the first-and-last string you will need in the Apply, you combine two indexed characters with \`+\`: \`word[0] + word[-1]\` gives \`"pn"\`. For a one-character string like \`"a"\`, both \`word[0]\` and \`word[-1]\` point at the same character, so you get \`"aa"\`.

## Slicing: half-open ranges

\`text[start:stop]\` returns a **slice**, a new string running from \`start\` up to *but not including* \`stop\`:

\`\`\`python
word[0:3]   # "pyt"   indices 0, 1, 2
word[2:]    # "thon"  from 2 to the end
word[:2]    # "py"    start up to index 2
word[1:-1]  # "ytho"  drop the first and last character
\`\`\`

That \`word[1:-1]\` pattern is exactly what the Practice needs. \`text[1:-1]\` starts at the second character and stops just before the last, so \`"[hi]"\` becomes \`"hi"\`.

## Slicing with a step

A slice takes an optional third number, the **step**: \`text[start:stop:step]\`. The step sets how far to jump between characters, so \`word[::2]\` keeps every second character (\`"pto"\` from \`"python"\`). Leaving \`start\` and \`stop\` empty runs across the whole string.

A **negative** step walks backward, so the idiom \`text[::-1]\` reverses a string by stepping from the end to the start:

\`\`\`python
word[::2]    # "pto"     every second character
word[::-1]   # "nohtyp"  the whole string, reversed
"abc"[::-1]  # "cba"
\`\`\`

Reversing with \`[::-1]\` is the idiomatic way to test a palindrome: \`text == text[::-1]\`.

## Strings are immutable

You cannot change a character in place. \`word[0] = "P"\` raises \`TypeError\`. Every operation that "modifies" a string actually builds a **new** string and leaves the original untouched. That is why slicing returns a fresh value instead of editing \`word\`.

### Pitfalls

- **Indexing out of range raises, slicing does not.** \`"hi"[5]\` raises \`IndexError\`, but \`"hi"[0:5]\` quietly clamps and returns \`"hi"\`. Slicing never errors on out-of-range bounds; single-character indexing does.
- **The empty string has no characters.** \`""[0]\` raises \`IndexError\`, so \`first_and_last("")\` would blow up. Both exercises assume at least one character, but in real code you check for empty input first.
- **A short slice can go empty, not error.** \`"ab"[1:-1]\` is \`""\`, because \`start\` (1) is not before \`stop\` (-1, meaning index 1). No exception, just an empty result.

**Interview nuance:** Python slicing uses a *half-open* interval \`[start, stop)\`. This is not a quirk; it makes the boundary math clean. With non-negative, in-range bounds where \`start\` is at or before \`stop\`, the slice length is exactly \`stop - start\`, and for any index \`i\`, \`s[:i] + s[i:] == s\` reconstructs the original with no overlap and no gap. Interviewers lean on this half-open convention to check whether you reason about boundaries correctly, the same off-by-one discipline that shows up in array windows and pagination.`,
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
    markdown: `## Text methods return new strings

Real code rarely gets clean text. User input has stray spaces, CSV columns mix cases, log lines carry delimiters. Normalizing text before you compare it, store it, or use it as a key prevents a whole class of bugs where \`"Ada"\`, \`"ada "\`, and \`" ADA"\` get treated as three different users. String methods are the everyday tools for that cleanup.

Start from one fact: a Python string is **immutable**. Once created, its characters never change. So a string method never edits the value in place. It reads the original and returns a brand-new value, leaving the original untouched. That single property explains everything below.

Common methods. Most return a new string; \`.split()\` returns a list. None of them touch the original:

\`\`\`python
"  Hello  ".strip()        # "Hello"   trim surrounding whitespace
"Hello".lower()            # "hello"
"Hello".upper()            # "HELLO"
"a,b,c".split(",")         # ["a", "b", "c"]   string -> list
"aca".replace("a", "b")    # "bcb"   replaces every match, not just the first
\`\`\`

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["You call", "You get back", "Type"],
  "rows": [
    ["'  Hello  '.strip()", "'Hello'", "str"],
    ["'Hello'.lower()", "'hello'", "str"],
    ["'a,b,c'.split(',')", "['a', 'b', 'c']", "list of str"],
    ["','.join(['a', 'b'])", "'a,b'", "str, the inverse of split"],
    ["'aca'.replace('a', 'b')", "'bcb'", "str, EVERY match, not just the first"],
    ["'Hello'.find('z')", "-1", "int, and it does not raise"]
  ],
  "highlightCols": ["Type"],
  "caption": "The type column is what decides whether you can keep chaining. split hands back a list, so .strip() cannot follow it directly, and find hands back an int whose -1 miss is easy to mistake for a real index."
}
\`\`\`

Because \`.strip()\` and \`.lower()\` each return a string, you can **chain** them left to right. The demo below runs \`messy.strip().lower()\` on \`"  PyThOn  "\`: \`.strip()\` yields \`"PyThOn"\`, then \`.lower()\` turns that into \`"python"\`.

### f-strings build text from values

An **f-string** drops values straight into \`{ }\`. Put an \`f\` before the opening quote:

\`\`\`python
name = "Ada"
count = 3
f"{name} has {count} messages"   # "Ada has 3 messages"
\`\`\`

You can run expressions inside the braces, including method calls. The demo uses \`f"Hi {name.upper()}!"\`, which evaluates \`name.upper()\` to \`"ADA"\` and produces \`"Hi ADA!"\`.

### Pitfall: methods do not mutate

Because strings are immutable, this looks like it cleans \`text\` but does nothing:

\`\`\`python
text = "  Hello  "
text.strip()        # returns "Hello", but the result is discarded
print(text)         # "  Hello  "   still unchanged
\`\`\`

You have to **capture** the return value: \`text = text.strip().lower()\`, or \`return\` the chained expression directly. That is exactly the move \`normalize\` needs. Forgetting it is the single most common string bug interns ship.

**Interview nuance:** immutability carries a cost interviewers probe. Building a string with repeated \`+=\` in a loop is O(n squared), because each concatenation copies the entire string so far into a fresh one. For \`n\` pieces that is quadratic work. The fix is \`"".join(parts)\`, which walks the pieces once for O(n). Reach for \`str.join\` over \`+=\` whenever you assemble text from many parts.

You will now normalize some text by stripping and lowercasing it, then build an uppercased greeting with an f-string.`,
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
    markdown: `## Why lists are the default container

Reach for a list any time you have an ordered sequence you will read, grow, or reshape: rows streamed from a query, tokens parsed from a line, a batch of records waiting to be written. It is the collection you build up in a loop and hand off to the next stage of a pipeline. Because it is both ordered and changeable, one list can serve as your accumulator, your buffer, and your result all at once.

### The mental model: a dynamic array of references

A Python list is a dynamic array. Under the hood it holds a contiguous block of slots pointing at your objects, and the interpreter resizes that block for you as the list grows. Two consequences follow. First, reaching any position by index is a direct jump, so \`nums[i]\` costs the same whether the list has 3 items or 3 million. Second, the list stores references, not copies, so the same object can sit in more than one list at once.

You write a list with square brackets and index it like a string, starting at \`0\`:

\`\`\`python
nums = [10, 20, 30]
nums[0]      # 10          first item
nums[-1]     # 30          negative counts from the end
nums[1:]     # [20, 30]    a slice returns a new list
len(nums)    # 3           how many items
\`\`\`

### Mutability: changing in place

Unlike strings and tuples, lists are mutable. The methods below change the existing list rather than returning a new one:

\`\`\`python
nums.append(40)     # [10, 20, 30, 40]      add to the end
nums.insert(0, 5)   # [5, 10, 20, 30, 40]   add at an index
nums.remove(20)     # [5, 10, 30, 40]        remove the first 20
\`\`\`

The demo below starts from \`[10, 20, 30]\`, calls \`append(40)\`, and prints \`[10, 20, 30, 40]\`, so \`nums[-1]\` is \`40\` and \`len(nums)\` is \`4\`. Notice \`append\` returns \`None\`: it mutates the list and hands nothing back, which is exactly why the Apply task asks you to \`append\` and then \`return items\` on a separate step.

That split, mutate here and return there, applies to every list operation:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["You call", "Effect on the original list", "What it hands back"],
  "rows": [
    ["lst.append(x)", "x is added to the end", "None"],
    ["lst.sort()", "lst is reordered in place", "None"],
    ["lst.reverse()", "lst is reversed in place", "None"],
    ["lst.pop()", "the last item is removed", "the removed item"],
    ["sorted(lst)", "untouched", "a new sorted list"],
    ["reversed(lst)", "untouched", "a lazy iterator"],
    ["lst + [x]", "untouched", "a new list"]
  ],
  "highlightCols": ["What it hands back"],
  "caption": "Read the highlighted column before you assign. nums = nums.sort() is the classic beginner bug: sort works perfectly, returns None, and you overwrite your list with None. Use nums.sort() alone to reorder, or nums = sorted(nums) to rebind."
}
\`\`\`

### Pitfall: aliasing shares one object

Assignment copies the reference, not the list. Both names then point at the same object:

\`\`\`python
a = [1, 2, 3]
b = a
b.append(4)
print(a)        # [1, 2, 3, 4]   a changed too
\`\`\`

If you wanted an independent copy, make one explicitly with \`a[:]\`, \`list(a)\`, or \`a.copy()\`. Interns lose hours to a helper that quietly mutates the caller's list.

For the Practice task, the middle index is \`len(items) // 2\`. Integer division \`//\` floors the result, so a 5-item list gives index \`2\`, landing on the true center \`30\`. On an even-length list it picks the right-of-center item, which is the intended, deterministic rule.

**Interview nuance:** know the cost of each operation. Indexing and \`append\` are effectively O(1) (append is amortized O(1) because the backing array over-allocates), but \`insert(0, x)\`, \`remove\`, and \`pop(0)\` are O(n) because every later element shifts one slot. If a problem needs fast inserts or removes at the front, that is the signal to reach for \`collections.deque\` instead of a list.`,
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
    markdown: `## Why tuples and sets earn their own types

A \`list\` is your default container, but two jobs deserve a sharper tool. When a group of values forms one fixed record (a \`(latitude, longitude)\` pair, one database row, the several results a function returns), a \`tuple\` signals "this shape will not change." When you only care whether something is present or how many distinct things you saw (unique user IDs in a log, an allow-list of permitted roles), a \`set\` answers in one fast step instead of a scan.

## Tuples: fixed records

A \`tuple\` is an ordered, immutable sequence. You index it like a list, but you cannot reassign, append to, or grow it after creation:

\`\`\`python
point = (3, 4)
point[0]        # 3
x, y = point    # unpack: x = 3, y = 4
\`\`\`

That unpacking is why functions return tuples to hand back several values at once. \`divmod(17, 5)\` returns \`(3, 2)\`, and you can catch it as \`q, r = divmod(17, 5)\`. A tuple of hashable values is itself hashable, so tuples can live inside a \`set\` or serve as \`dict\` keys (lists cannot).

## Sets: a hash table of unique keys

A \`set\` is an unordered collection of unique, hashable values, backed by the same hash table that powers \`dict\` keys. Duplicates collapse on the way in, and membership is answered by hashing, not scanning:

\`\`\`python
seen = {1, 2, 2, 3}      # stored as {1, 2, 3}
3 in seen                # True
len(set([1, 2, 2, 3]))   # 3   distinct count
\`\`\`

Wrapping a list in \`set(...)\` is the idiomatic way to drop duplicates or count distinct values.

### When to use which

- \`tuple\`: a small fixed record whose fields will not change.
- \`set\`: you care about uniqueness or membership, not order or position.

Braces and parentheses are overloaded in Python, and the literal you write is not always the type you get:

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["You write", "You get", "Watch out for"],
  "rows": [
    ["[1, 2]", "list", "mutable, so it can never go inside a set"],
    ["(1, 2)", "tuple", "immutable and hashable, so it can"],
    ["(3)", "the int 3, not a tuple", "a one-element tuple needs the comma: (3,)"],
    ["{1, 2}", "set", "unordered; my_set[0] raises TypeError"],
    ["{}", "an empty dict, not a set", "use set() when you want an empty set"],
    ["{a: 1} with real quotes on the key", "dict", "braces mean dict the moment a colon appears"]
  ],
  "highlightCols": ["You get"],
  "caption": "Two of these six produce a different type than the shape suggests. Both are ordinary beginner bugs that fail late, because (3) and {} are perfectly valid values and only misbehave once something tries to iterate or add to them."
}
\`\`\`

### Pitfalls

- Empty braces \`{}\` make an empty \`dict\`, not a \`set\`. Use \`set()\` for an empty set.
- A one-element tuple needs a trailing comma. \`(3)\` is just the integer \`3\`; \`(3,)\` is a tuple.
- Sets are unordered. Never rely on iteration order or index a set (\`my_set[0]\` raises \`TypeError\`). If you need order, sort into a list.
- Set elements must be hashable, so a \`set\` of \`list\`s fails, but a \`set\` of \`tuple\`s works.

**Interview nuance:** membership cost is the reason to reach for a set. \`x in some_list\` is \`O(n)\` because Python checks each element in turn, while \`x in some_set\` is \`O(1)\` on average because it hashes straight to a bucket. That is exactly why counting distinct values through a \`set\` beats comparing every pair, and why de-duplication loops that build a set as they go run in linear time.`,
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
    markdown: `## Why dictionaries matter

When your question is "what value goes with this key?", a dictionary answers it fast. A list forces you to scan element by element to find a match, and that cost grows with the list. A dict jumps straight to the value. Real systems lean on this everywhere: counting events, caching results, indexing rows by \`id\`, grouping records, and passing named config around. Any "user id to profile" map or word-count tally is a dict.

## The mental model: a hash map

A dictionary stores \`key: value\` pairs. Under the hood it is a hash map. Python runs each key through a hash function to find the slot where its value lives, so a lookup takes about the same time whether the dict holds 10 pairs or 10 million. That average \`O(1)\` lookup, insert, and delete is the reason the type exists.

Two consequences of the hash-map design:
- Keys must be hashable, which in practice means immutable. \`str\`, \`int\`, and \`tuple\` work as keys; a \`list\` does not and raises \`TypeError\`.
- Since Python 3.7 a dict keeps insertion order, so iterating returns keys in the order you added them.

## Reading and writing

Index a key with \`d[key]\`, but a missing key raises \`KeyError\`. Reach for \`.get(key, default)\` when the key might be absent and you want a fallback instead of a crash:

\`\`\`python
prices = {"apple": 3, "pear": 2}
prices["apple"]            # 3
prices.get("banana", 0)    # 0, the default, because "banana" is absent
prices["plum"] = 4         # bracket assignment adds a new pair
prices["apple"] = 5        # the same syntax updates an existing key
\`\`\`

That \`.get(name, 0)\` pattern is exactly what the \`lookup\` exercise needs.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["You write", "Key is present", "Key is missing"],
  "rows": [
    ["d[key]", "the value", "raises KeyError"],
    ["d.get(key)", "the value", "None, silently"],
    ["d.get(key, 0)", "the value", "0, the fallback you chose"],
    ["d.setdefault(key, 0)", "the value", "inserts 0 into d and returns it"],
    ["key in d", "True", "False, and it tests KEYS, never values"]
  ],
  "highlightCols": ["Key is missing"],
  "caption": "Only the missing-key column differs, and only one row there raises. Two of the others return something falsy without complaint, which is why a bare .get(key) so often turns a typo into a silent None instead of an error."
}
\`\`\`

Merge two dicts into a brand new one with \`{**a, **b}\`. The demo below spreads \`{"fig": 6}\` into \`prices\` and leaves both originals untouched. When both sides share a key, the right-hand dict wins:

\`\`\`python
{**{"x": 1}, **{"x": 9}}   # {'x': 9}, b overrides a on the shared key
\`\`\`

That is the \`merge_two\` exercise in one line. Python 3.9+ also offers \`a | b\` for the same result.

## Pitfalls

\`.get\` with no default returns \`None\`, not an error, when the key is missing, so \`prices.get("banana")\` gives \`None\` rather than \`0\`. Always pass the fallback you actually want. Watch the direction too: \`key in d\` tests keys, not values, so \`"apple" in prices\` is \`True\` but \`3 in prices\` is \`False\`. And bracket assignment overwrites silently, so \`d[key] = value\` replaces any existing value with no warning. That same rule is why the right operand wins in a merge.

**Interview nuance:** interviewers probe why dict lookup is \`O(1)\` while list membership (\`x in some_list\`) is \`O(n)\`. The dict hashes the key and jumps to a slot; the list compares element by element. When a solution repeatedly asks "have I seen this before?", swapping a list for a dict or \`set\` is often the entire optimization, turning an \`O(n²)\` loop into \`O(n)\`.`,
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
    markdown: `## Identity and equality answer different questions

\`==\` asks "do these two objects hold the same value?" \`is\` asks "are these two names bound to the exact same object in memory?" Most of the time they agree, so it is tempting to treat them as interchangeable, right up until the day they disagree and a bug slips through code review.

Every value in Python is an object with a fixed identity, which you can inspect with \`id()\`. A variable is just a name pointing at one of those objects. \`is\` compares identities (roughly \`id(a) == id(b)\`), while \`==\` asks the left object to compare itself to the right one by calling its \`__eq__\` method.

\`\`\`python
a = [1, 2, 3]
b = [1, 2, 3]
print(a == b)   # True  (same contents)
print(a is b)   # False (two separate list objects)
\`\`\`

\`a\` and \`b\` hold equal contents, so \`==\` is \`True\`. But they are two different lists built at two different moments, so their identities differ and \`is\` is \`False\`.

\`\`\`csdiagram
{
  "type": "python-memory",
  "steps": [
    {
      "code": "a = [1, 2, 3]",
      "names": { "a": "L1" },
      "objects": { "L1": { "kind": "list", "value": "[1, 2, 3]" } },
      "note": "One list object exists, and the name a points at it."
    },
    {
      "code": "b = [1, 2, 3]",
      "names": { "a": "L1", "b": "L2" },
      "objects": {
        "L1": { "kind": "list", "value": "[1, 2, 3]" },
        "L2": { "kind": "list", "value": "[1, 2, 3]" }
      },
      "note": "A SECOND list is built. Same contents, different object: a == b is True, a is b is False."
    },
    {
      "code": "c = a",
      "names": { "a": "L1", "b": "L2", "c": "L1" },
      "objects": {
        "L1": { "kind": "list", "value": "[1, 2, 3]" },
        "L2": { "kind": "list", "value": "[1, 2, 3]" }
      },
      "note": "Assignment copies the arrow, never the object. c and a name the same list, so c is a is True."
    }
  ],
  "caption": "== compares what is inside the boxes. is compares which box. b matches a on contents only; c IS a."
}
\`\`\`

That is the whole model in one line: \`==\` compares what is inside the boxes, \`is\` compares which box.

### \`None\` is a singleton, so test it with \`is\`

There is exactly one \`None\` object in a running program. \`NoneType\` never creates a second one. That is why \`value is None\` is the idiomatic and correct test: you are checking against the one true \`None\`, not against something that merely equals it.

\`\`\`python
value = None
print(value is None)   # True
\`\`\`

Style guides (PEP 8) and linters flag \`value == None\`. It usually works, but it routes through \`__eq__\`, which any class is free to override.

### Why \`== None\` can bite you

\`==\` runs the object's own \`__eq__\`. A NumPy array, for instance, defines \`==\` to compare elementwise:

\`\`\`python
import numpy as np
arr = np.array([1, 2, 3])
arr == None            # array([False, False, False]), not a plain bool
\`\`\`

Now \`if arr == None:\` raises a \`ValueError\` about the truth value of an array being ambiguous. Writing \`arr is None\` sidesteps all of that: it is a pure identity check that no class can redefine, and it is exactly what \`is_missing(value)\` should use.

### Do not use \`is\` for numbers or strings

CPython caches small integers and some short strings, so \`is\` can look correct and then fail on larger values:

\`\`\`python
x = 1000
y = 1000
print(x == y)   # True  (always trust this for values)
print(x is y)   # may print False; never rely on it
\`\`\`

Whether two equal ints share identity is an implementation detail. Use \`==\` for values, and reserve \`is\` for \`None\` (and \`True\`/\`False\`).

### Guard before you touch a maybe-\`None\`

\`None\` supports very few operations. \`len(None)\` raises \`TypeError: object of type 'NoneType' has no len()\`. So check first, then act:

\`\`\`python
if value is None:
    return 0
return len(value)
\`\`\`

**Interview nuance:** interviewers probe why \`is None\` beats \`== None\`. Identity is a constant-time pointer comparison that cannot be overridden and leans on \`None\` being a guaranteed singleton, so it is both faster and impossible to fool. Equality dispatches to \`__eq__\`, which is arbitrary user code whose result and cost you do not control.`,
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
    markdown: `## A name is a label, not a box

You pass lists and dicts between functions all day. If you believe assignment copies them, you get the worst class of bug: a value mutates somewhere you never touched, and the broken read is nowhere near the accidental write. Knowing exactly what shares an object is what separates code that scales from code that corrupts state under you.

### The model: names bind to objects

Every value in Python is an object living somewhere in memory. A variable is just a name bound to that object, not a box holding a copy. Assignment binds a second name to the *same* object:

\`\`\`python
a = [1, 2, 3]
b = a            # b binds to the SAME list, no copy happens
b.append(4)
print(a)         # [1, 2, 3, 4]
print(a is b)    # True, one list with two names
\`\`\`

\`a is b\` asks "same object?" (identity), while \`a == b\` asks "same value?" (equality). The demo below shows this exactly: mutating through \`b\` is visible through \`a\` because there is only one list.

\`\`\`csdiagram
{
  "type": "python-memory",
  "steps": [
    {
      "code": "a = [1, 2, 3]",
      "names": {
        "a": "L1"
      },
      "objects": {
        "L1": {
          "kind": "list",
          "value": "[1, 2, 3]"
        }
      },
      "note": "one list, named a"
    },
    {
      "code": "b = a",
      "names": {
        "a": "L1",
        "b": "L1"
      },
      "objects": {
        "L1": {
          "kind": "list",
          "value": "[1, 2, 3]"
        }
      },
      "note": "b binds to the SAME list, no copy"
    },
    {
      "code": "b.append(4)",
      "names": {
        "a": "L1",
        "b": "L1"
      },
      "objects": {
        "L1": {
          "kind": "list",
          "value": "[1, 2, 3, 4]"
        }
      },
      "mutated": "L1",
      "note": "a sees it too: a is [1, 2, 3, 4]"
    },
    {
      "code": "c = a[:]",
      "names": {
        "a": "L1",
        "b": "L1",
        "c": "L2"
      },
      "objects": {
        "L1": {
          "kind": "list",
          "value": "[1, 2, 3, 4]"
        },
        "L2": {
          "kind": "list",
          "value": "[1, 2, 3, 4]"
        }
      },
      "note": "a[:] makes a NEW outer list"
    },
    {
      "code": "c.append(99)",
      "names": {
        "a": "L1",
        "b": "L1",
        "c": "L2"
      },
      "objects": {
        "L1": {
          "kind": "list",
          "value": "[1, 2, 3, 4]"
        },
        "L2": {
          "kind": "list",
          "value": "[1, 2, 3, 4, 99]"
        }
      },
      "mutated": "L2",
      "note": "only c changes; a is untouched"
    }
  ],
  "caption": "Two names on one object alias it (b changes a); a[:] makes a separate object c cannot reach back through."
}
\`\`\`

### Build new instead of mutating

When a function should return a changed version, build a fresh list and leave the input alone. This is what the Apply exercise wants:

\`\`\`python
def doubled(nums):
    return [n * 2 for n in nums]   # new list; nums is untouched
\`\`\`

The comprehension allocates a new list, so the caller's data is safe. Prefer this over looping and calling \`nums.append(...)\`, which would edit the caller's list in place.

### Copy on purpose: shallow vs deep

When you genuinely need a separate copy, do it deliberately. A slice \`a[:]\` or \`list(a)\` makes a shallow copy: a new outer list holding the *same* inner objects.

\`\`\`python
c = a[:]         # new outer list
c.append(99)
print(a is c)    # False, independent outer lists
\`\`\`

For nested structures, a shallow copy still shares the inner objects, so editing \`grid[0][0]\` through the copy changes the original. Use \`copy.deepcopy\` when you need full independence:

\`\`\`python
import copy
deep = copy.deepcopy(grid)   # inner lists copied too
\`\`\`

### The mutable-default trap

A default value is evaluated once, when the \`def\` statement runs, not on each call. So a mutable default is one shared object reused across every call:

\`\`\`python
def bad(item, bucket=[]):     # the SAME list every call
    bucket.append(item)
    return bucket

bad("a")   # ["a"]
bad("b")   # ["a", "b"], the previous call leaked in

def append_new(value, bucket=None):   # the safe pattern
    if bucket is None:
        bucket = []                    # fresh list each call
    bucket.append(value)
    return bucket
\`\`\`

\`append_new\` is the Practice exercise: use \`None\` as the sentinel and create the list inside.

**Interview nuance:** default arguments are evaluated exactly once at function-definition time and stored on the function object (you can inspect \`bad.__defaults__\`, a tuple holding that one shared list). That is why \`bucket=[]\` accumulates across calls and \`bucket=None\` plus an inside-the-body \`[]\` does not. Interviewers use this to check whether you understand *when* Python evaluates expressions, not just what the syntax looks like.

Step through both versions and watch the one shared default list accumulate, then the None pattern build a fresh list per call:

\`\`\`csdiagram
{
  "type": "python-memory",
  "steps": [
    {
      "code": "def bad(item, bucket=[]):",
      "names": {
        "bad.__defaults__[0]": "D1"
      },
      "objects": {
        "D1": {
          "kind": "list",
          "value": "[]"
        }
      },
      "note": "The default list is created ONCE, when def runs, and stored on the function object."
    },
    {
      "code": "bad('a')",
      "names": {
        "bad.__defaults__[0]": "D1",
        "bucket": "D1"
      },
      "objects": {
        "D1": {
          "kind": "list",
          "value": "['a']"
        }
      },
      "mutated": "D1",
      "note": "bucket binds to that same default list, and append mutates it."
    },
    {
      "code": "bad('b')",
      "names": {
        "bad.__defaults__[0]": "D1",
        "bucket": "D1"
      },
      "objects": {
        "D1": {
          "kind": "list",
          "value": "['a', 'b']"
        }
      },
      "mutated": "D1",
      "note": "Still the SAME list, so the previous call leaked in. That is the bug."
    },
    {
      "code": "append_new('a', bucket=None)  # bucket = [] inside",
      "names": {
        "bad.__defaults__[0]": "D1",
        "bucket": "D2"
      },
      "objects": {
        "D1": {
          "kind": "list",
          "value": "['a', 'b']"
        },
        "D2": {
          "kind": "list",
          "value": "['a']"
        }
      },
      "note": "The None pattern builds a FRESH list inside the body: a new object every call."
    }
  ],
  "caption": "bucket=[] shares one list across every call (bad accumulates); bucket=None builds a new list per call. Default arguments evaluate once, at def time."
}
\`\`\``,
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
    markdown: `## Why membership cost decides your data structure

Reach for the wrong container and a fast function turns slow without a single line looking "wrong." The trap is \`x in collection\`. It reads the same for a list, a set, and a dict, but it does very different amounts of work. On a list, Python compares \`x\` against elements one at a time until it finds a match or runs out. On a million-element list that is up to a million comparisons for one lookup. Do that inside a loop and you have an \`O(n²)\` function that crawls on real data. Interviewers hand you exactly this shape and watch whether you notice.

### The mental model

A \`list\` is a dynamic array: values laid out in order, great for indexing and iteration, but membership means scanning. A \`set\` (and a \`dict\`) is a hash table: each element runs through a hash function that computes where it lives, so \`x in a_set\` jumps almost straight to the right slot instead of walking everything.

\`\`\`python
x in a_list    # O(n): walk the list until found or exhausted
x in a_set     # O(1) average: hash x, look in one slot
x in a_dict    # O(1) average: same hashing, keyed lookup
\`\`\`

\`O(n)\` means cost grows with size; \`O(1)\` means it stays flat whether the set holds ten items or ten million. That is the instinct to build: when you repeatedly ask "have I seen this?", reach for a set.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Operation", "list", "set", "dict"],
  "rows": [
    ["x in c", "O(n): scans until found", "O(1) average", "O(1) average, over keys"],
    ["c[i] by position", "O(1)", "not supported", "not supported"],
    ["c[key] by key", "not supported", "not supported", "O(1) average"],
    ["Add one item", "O(1) amortised (append)", "O(1) average (add)", "O(1) average"],
    ["Keeps insertion order", "yes", "no", "yes, since Python 3.7"],
    ["Accepts unhashable items", "yes", "no", "values yes, keys no"]
  ],
  "caption": "Only the first row differs by an order of magnitude, and it is the row that reads identically in source. x in c looks the same for all three, which is exactly why the wrong container hides so well."
}
\`\`\`

### The classic upgrade

The demo below turns a list into a set and compares lengths. \`set(nums)\` drops duplicates, so if the set is shorter than the list, something repeated. That length comparison is the whole idea behind \`has_duplicates\`. When you need the scan itself, grow a \`seen\` set as you go:

\`\`\`python
seen = set()
for x in nums:
    if x in seen:      # O(1) check, not a rescan
        ...            # x is a repeat, handle it here
    seen.add(x)
\`\`\`

That loop is \`O(n)\`: one pass, each check flat. The list version, \`if x in seen\` against a growing list, would be \`O(n²)\`.

### Pitfalls

- \`set(nums)\` throws away order. It can tell you THAT a value repeated, but not WHICH one repeated first. For \`first_repeated\` you must scan left to right and test a growing \`seen\` set, returning the first \`x\` that is already inside it.
- Set and dict elements must be hashable, which in practice means immutable. \`{[1, 2]}\` raises \`TypeError: unhashable type: 'list'\`. Numbers, strings, and tuples are fine; lists, dicts, and sets are not.

**Interview nuance:** \`O(1)\` membership is average case, not a guarantee. A hash table is fast because elements scatter across many slots, but adversarial or unlucky inputs can collide into one slot and degrade a single lookup toward \`O(n)\`. You also trade memory for that speed. So the honest answer to "why not always use a set?" is that sets cost extra memory, accept only hashable values, and keep no order.`,
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

Reaching for \`range(len(items))\` and indexing back with \`items[i]\` is the beginner tell. It reads noisily, breaks the moment you rename or reorder things, and is the classic home of off-by-one bugs. Python hands you iterators that give you exactly what you need, so you loop over the data itself instead of bookkeeping positions.

### \`enumerate\`: the value plus its position

\`enumerate(iterable)\` wraps any iterable and yields \`(index, value)\` pairs, lazily, one at a time.

\`\`\`python
for i, letter in enumerate(["a", "b", "c"]):
    print(i, letter)
# 0 a
# 1 b
# 2 c
\`\`\`

Counting starts at \`0\`. Need 1-based numbering (line numbers, ranks)? Pass \`start\`: \`enumerate(items, start=1)\`. Do not hand-roll \`i + 1\`, and do not fall back to \`range\`. Each pair is a tuple, so \`i, letter\` unpacks it. When you actually need a \`[index, value]\` list (the Apply asks for exactly this), build one per item: \`[i, value]\`.

### \`zip\`: walk several sequences in lockstep

\`zip(a, b)\` pairs items by position: first of \`a\` with first of \`b\`, second with second, and so on. It is how you iterate two parallel lists without indexing either.

\`\`\`python
for name, score in zip(["Ada", "Sam"], [90, 85]):
    print(name, score)
# Ada 90
# Sam 85
\`\`\`

To collect \`[name, score]\` lists (the Practice), build \`[name, score]\` inside the loop or a comprehension.

### \`.items()\`: keys and values from a dict together

Iterating a dict directly gives only keys. \`.items()\` gives both:

\`\`\`python
prices = {"apple": 3, "pear": 2}
for fruit, price in prices.items():
    print(fruit, price)
# apple 3
# pear 2
\`\`\`

\`.keys()\` and \`.values()\` give one side each. Since Python 3.7, all three iterate in insertion order.

### Pitfalls

- **\`zip\` silently truncates to the shortest input.** \`zip(["a", "b", "c"], [1, 2])\` yields only two pairs and drops \`"c"\` with no error. If your lists are meant to be the same length, that hides a data bug. Fix: assert \`len(a) == len(b)\` first, or use \`zip(a, b, strict=True)\` (Python 3.10+), which raises \`ValueError\` on a length mismatch.
- **\`enumerate\` yields tuples, not lists.** \`list(enumerate(["a"]))\` is \`[(0, "a")]\`. If the caller expects \`[0, "a"]\`, convert explicitly.

**Interview nuance:** both \`enumerate\` and \`zip\` return lazy iterators in Python 3, not lists. They pull one item at a time and use O(1) extra memory regardless of input size, which is why they scale to large or streaming data. The catch is single-pass: an iterator is exhausted after one loop. \`z = zip(a, b); list(z)\` gives the pairs, but a second \`list(z)\` gives \`[]\`, because the first pass consumed it. Wrap in \`list(...)\` once if you need to iterate the result more than once.`,
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

Some data has no fixed depth. A folder holds files and more folders. A JSON payload nests objects inside arrays inside objects. A comment thread has replies to replies to replies. You cannot write a \`for\` loop with the "right" number of levels, because you do not know the depth ahead of time. Recursion handles this: a function solves a problem by calling itself on a smaller piece, until the pieces are small enough to answer outright.

### The mental model

Every recursive function needs exactly two parts:

1. A **base case**: the smallest input you can answer directly, with no further call. This is what stops the chain.
2. A **recursive case**: reduce the problem toward the base case, call yourself on the smaller input, and combine that result.

The trick is to *trust* the recursive call. When you write \`factorial(n - 1)\`, assume it already returns the correct answer for \`n - 1\`, then build the answer for \`n\` on top of it. You do not trace the whole thing in your head. You define one honest step plus a stopping point, and the machine does the rest.

\`\`\`python
def factorial(n):
    if n <= 1:                     # base case: 0 and 1 both give 1
        return 1
    return n * factorial(n - 1)    # recursive case

print(factorial(5))   # 120
\`\`\`

\`factorial(5)\` becomes \`5 * factorial(4)\`, then \`5 * 4 * factorial(3)\`, and so on down to \`factorial(1)\`, which returns \`1\` directly. Then the paused multiplications finish on the way back up: \`5 * 4 * 3 * 2 * 1 = 120\`.

### The call stack

Here is \`factorial(3)\` traced frame by frame, the same shape as \`factorial(5)\` but shorter: each call pushes a frame down to the base case, then the frames pop and the paused multiplications finish on the way back up.

\`\`\`csdiagram
{
  "type": "call-stack",
  "title": "factorial(3)",
  "steps": [
    {
      "stack": [
        "factorial(3)"
      ],
      "note": "3 > 1, recurse on 2"
    },
    {
      "stack": [
        "factorial(3)",
        "factorial(2)"
      ],
      "note": "2 > 1, recurse on 1"
    },
    {
      "stack": [
        "factorial(3)",
        "factorial(2)",
        "factorial(1)"
      ],
      "note": "n <= 1 base case, returns 1"
    },
    {
      "stack": [
        "factorial(3)",
        "factorial(2)"
      ],
      "returning": "2 * 1 = 2"
    },
    {
      "stack": [
        "factorial(3)"
      ],
      "returning": "3 * 2 = 6"
    }
  ],
  "caption": "Frames stack up until the base case returns 1, then unwind one at a time applying each pending multiply: 3 * 2 * 1 = 6."
}
\`\`\`

Each call pauses and waits for the call it made. Python stacks these paused frames until the base case returns, then unwinds them one at a time, applying each pending multiply. If the base case is never reached, the stack keeps growing and Python raises \`RecursionError\` after roughly 1000 nested calls (the default \`sys.getrecursionlimit()\`).

### Pitfalls

**A base case that skips 0.** Writing \`if n == 1\` looks fine until you call \`factorial(0)\`: it does not match, so you compute \`0 * factorial(-1) * factorial(-2) ...\` forever, straight to \`RecursionError\`. Use \`if n <= 1\` so both \`0\` and \`1\` hit the base case and return \`1\` directly. That is exactly why the exercise pins \`factorial(0)\` to \`1\`.

**Not shrinking toward the base.** The recursive call must move closer to the base case every time. A \`factorial(n)\` that calls \`factorial(n)\` never ends.

For the nested-sum exercise, your base case is a plain number and your recursive case is a list. Check which one you have with \`isinstance(x, list)\`: if it is a list, recurse into it and add the pieces; otherwise it is a number, so add it directly. That single \`isinstance\` check is what lets one function reach any depth without knowing the shape in advance.

**Interview nuance:** Python has no tail-call optimization, so a recursive solution uses \`O(n)\` call-stack space, one frame per pending call, while an equivalent loop uses \`O(1)\`. Interviewers probe this: recursion over a length-\`n\` structure can overflow the stack where a loop would not, which is why tree and graph problems often call out the depth explicitly. Recursion buys clarity on nested data. It does not buy free memory.`,
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
  estimatedHours: 3,
  modules: [
    {
      id: "py-l1-fundamentals",
      title: "First Steps",
      description:
        "Run your first program, show output, return a computed value, and store values in variables.",
      lessons: [helloLesson, temperatureLesson, variablesLesson],
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
      lessons: [listsLesson, tuplesSetsLesson, dictsLesson],
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
        referencesCopyLesson,
        complexityChoiceLesson,
        recursionLesson,
      ],
    },
  ],
}

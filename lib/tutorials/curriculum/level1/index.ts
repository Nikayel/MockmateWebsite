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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "comment-or-code",
  "prompt": "Sort these lines by whether Python actually runs them.",
  "buckets": ["Python runs it", "Python ignores it"],
  "items": [
    {
      "label": "# check the spacing here",
      "bucket": "Python ignores it",
      "feedback": "The line starts with #, so the whole line is a note for humans."
    },
    {
      "label": "print('this runs')   # a trailing note",
      "bucket": "Python runs it",
      "feedback": "The comment begins at the #, so print still runs. Only the note after it is skipped."
    },
    {
      "label": "# print('this runs')",
      "bucket": "Python ignores it",
      "feedback": "Putting a # in front of real code is how you disable a line without deleting it."
    },
    {
      "label": "print('# not a comment')",
      "bucket": "Python runs it",
      "feedback": "The # sits inside quotes, so it is just a character in the text. This prints # not a comment."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "concat-str-and-int",
  "prompt": "You write print('Room ' + 12). What happens?",
  "options": [
    {
      "label": "It prints Room 12, converting the number to text",
      "feedback": "Tempting, because print itself displays numbers happily and many languages do convert silently here. But + between a str and an int is not defined, so the line fails before print is ever called."
    },
    {
      "label": "It prints Room12, with the space lost",
      "feedback": "Close on the spacing instinct: that trailing space inside 'Room ' really is what gives you the gap. The line never gets far enough to print anything at all, though."
    },
    {
      "label": "It raises a TypeError",
      "correct": true,
      "feedback": "Right. + only joins str with str. Convert the number first with str(12), or build the whole thing with an f-string."
    },
    {
      "label": "It prints Room and quietly drops the 12",
      "feedback": "Tempting if you picture + as loose glue that skips whatever it cannot handle. Python never silently discards an operand: a combination it has no rule for is an error."
    }
  ]
}
\`\`\`

## Pitfall: \`+\` will not mix a string and a number

\`+\` only concatenates string with string. If one side is a number you get a crash, not automatic conversion:

\`\`\`python
"Room " + 12
# TypeError: can only concatenate str (not "int") to str
\`\`\`

The fix is to convert the number first with \`str(...)\`: \`"Room " + str(12)\` gives \`"Room 12"\`. In these exercises \`name\` is already a string, so plain \`+\` is safe.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "print-returns-none",
  "prompt": "A function body is nothing but print('Hello, ' + name). You call result = greet('Ada'). What is result?",
  "options": [
    {
      "label": "The string Hello, Ada!",
      "feedback": "Tempting, because you watched that text appear the moment the call ran. It went to the screen, not back to the caller, and the two paths are completely separate."
    },
    {
      "label": "None",
      "correct": true,
      "feedback": "Right. A function with no return statement hands back None, and print itself also evaluates to None. The greeting was displayed, never returned."
    },
    {
      "label": "An empty string",
      "feedback": "Close, in that result really does hold something empty-feeling and useless. Python's stand-in for no value is None, not '', and the two behave differently the moment you call len() or use + on them."
    }
  ],
  "reveal": "This is why the grader calls your function and reads what comes back. Printing is for a human watching a terminal; returning is how one piece of code hands a value to another."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "area-is-not-a-live-formula",
  "prompt": "area = width * height ran while width was 4 and height was 3. You then set width = 10. What does area hold now?",
  "options": [
    {
      "label": "30, because area was defined as width times height",
      "feedback": "Tempting, because that is exactly how a spreadsheet cell behaves: the formula stays live and recalculates when an input changes. Python is not a spreadsheet."
    },
    {
      "label": "12",
      "correct": true,
      "feedback": "Right. area holds the number the multiplication produced at that instant, not a rule for recomputing it. If you want the new area, run the multiplication again."
    },
    {
      "label": "It raises an error, because area is now out of date",
      "feedback": "Close in spirit, since the value really is stale and probably wrong. Python has no notion of a stale variable, which is precisely what makes this bug quiet enough to ship."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "name-used-before-assignment",
  "prompt": "The very first line of a script is score = score + 5. What happens?",
  "options": [
    {
      "label": "score becomes 5, since an unset name starts at 0",
      "feedback": "Tempting, because every counter you have ever written starts at zero and some languages do default a fresh name that way. Python never invents a starting value."
    },
    {
      "label": "It raises a NameError",
      "correct": true,
      "feedback": "Right. The right-hand side is evaluated first, so Python tries to read score before anything has been bound to it. Give it a starting value on an earlier line."
    },
    {
      "label": "score becomes None",
      "feedback": "Close, in that Python does have a value that means nothing here. But an unassigned name is not bound to None, it is not bound at all, so reading it raises instead of returning something."
    }
  ]
}
\`\`\`

### Pitfalls

- **Reassignment does not recompute earlier results.** As above, \`area\` stays \`12\` after \`width\` changes. If you need the updated area, recompute it: \`area = width * height\`.
- **Using a name before it is assigned** raises \`NameError\`. The name must be bound on some line that actually runs before you read it, so \`score = score + 5\` fails if \`score\` was never given a starting value.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "assignment-shares-the-object",
  "prompt": "You run a = [1, 2, 3], then b = a, then b.append(4). What does a hold now?",
  "options": [
    {
      "label": "[1, 2, 3], because b got its own copy",
      "feedback": "Tempting, and it is indistinguishable from the truth for numbers and strings, where nothing can be changed in place anyway. Assignment never copies an object; it points a second name at the same one."
    },
    {
      "label": "[1, 2, 3, 4]",
      "correct": true,
      "feedback": "Right. One list, two names on it, so a change made through b is visible through a. Copy on purpose with list(a) or a[:] when you want independence."
    },
    {
      "label": "It raises an error, because b is not a list",
      "feedback": "Tempting if you read b = a as storing something other than the list itself. b is the very same list a names, so it accepts every list operation."
    }
  ]
}
\`\`\`

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

// Authored into L1-M1 as its closing lesson. The commands it teaches (`venv`, `pip`) cannot run in
// the browser sandbox, so both graded exercises work on the TEXT those commands produce, which is
// the part a learner can reason about anywhere. See the teach block's sandbox note.
const environmentsLesson: PythonLesson = {
  id: "py-l1-environments",
  title: "Running Python & installing packages",
  summary: "Run a .py file, isolate dependencies in a virtual environment, and pin them with pip.",
  estimatedMinutes: 12,
  difficulty: "easy",
  skills: ["venv", "pip", "packaging", "project-structure"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## The two commands every project starts with

Everything you have written so far ran inside this page. A real project runs somewhere else: a file on your own machine, started from a terminal, leaning on libraries somebody else published. Two commands cover nearly all of it. \`python3 file.py\` runs your code, and \`pip install\` fetches someone else's. The wrinkle is that \`pip install\` has to put the library *somewhere*, and choosing that somewhere on purpose is the difference between a project that still installs next year and one that breaks the day another project needs a different version.

**These commands run in a terminal on your machine, not in the editor on this page.** The sandbox here is a Python compiled to WebAssembly: no shell, no \`pip\`, no folder to install into. So the graded exercises below check that you can reason about environments in plain Python rather than build one in the browser.

## Running a file

Save code in a file whose name ends in \`.py\`, then hand that file to the interpreter:

\`\`\`bash
python3 hello.py     # macOS and Linux
py hello.py          # Windows
\`\`\`

Python reads the file top to bottom, exactly as it does here, and exits at the end. Anything you \`print\` lands in the terminal. There is no separate compile step to remember and no build output to run instead.

## Why one shared install folder goes wrong

\`pip install requests\` downloads the library into a directory called \`site-packages\`. If every project on your machine shares one \`site-packages\`, then every project shares one version of every library, and libraries change. The scraper you wrote last spring pinned to an old API. The dashboard you started yesterday needs the new one. There is exactly one slot, so one of them loses.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "one-slot-per-library",
  "prompt": "Two projects live on your machine with no virtual environments anywhere. Project A was built against pandas 1.5. In project B you run pip install pandas and get 2.2. What happens to project A?",
  "options": [
    {
      "label": "Nothing, because pip keeps both versions and hands each project the one it was built with",
      "feedback": "Tempting, because that really is what a lockfile-driven tool does per project, and npm keeps versions per folder this way. A plain pip install has only one site-packages to write into, and it has no idea project A exists."
    },
    {
      "label": "Project A silently starts running against pandas 2.2 and breaks the next time you open it",
      "correct": true,
      "feedback": "Right. The install overwrote the shared copy, and nothing warned you because nothing was watching project A. You find out later, from a stack trace that looks nothing like a dependency problem."
    },
    {
      "label": "pip refuses the install and tells you project A already pinned that library",
      "feedback": "Close, in that a resolver really can refuse a conflicting install and pip does that within one environment. Across separate projects there is nothing to detect: pip sees one machine, one folder, one version."
    }
  ]
}
\`\`\`

## What a virtual environment actually is

A **virtual environment** is a folder. Inside it sit a link to a Python interpreter and, more importantly, its own private \`site-packages\`. That is the whole trick: each project gets its own install folder, so project A can hold \`pandas 1.5\` and project B \`pandas 2.2\` while neither knows the other exists.

Create one, then activate it:

\`\`\`bash
python3 -m venv .venv        # create the folder .venv in this project
source .venv/bin/activate    # macOS and Linux
.venv\\Scripts\\activate       # Windows
\`\`\`

Creating is per project and you do it once. Activating is per terminal window: it repoints \`python\` and \`pip\` in that one shell at the folder, usually adding \`(.venv)\` to your prompt so you can see it worked. \`deactivate\` puts the shell back. Calling the folder \`.venv\` is a convention, not a rule, but it is the one every tool and every teammate expects.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "forgot-to-activate",
  "prompt": "You ran python3 -m venv .venv, opened a fresh terminal, and ran pip install requests without activating. Where did requests land?",
  "options": [
    {
      "label": "In .venv, since that is the environment sitting in this project folder",
      "feedback": "Tempting, because the folder is right there and you are standing in the project. Nothing about your current directory selects an environment: only activation repoints the pip your shell resolves."
    },
    {
      "label": "In whichever Python the shell resolves by default, which is usually the system-wide one",
      "correct": true,
      "feedback": "Right. An unactivated shell still points at the default interpreter, so the install went global. This is the single most common cause of ModuleNotFoundError right after a successful install."
    },
    {
      "label": "Nowhere, because pip refuses to install while an environment exists but is inactive",
      "feedback": "Close, and modern pip does refuse in one specific case, an externally managed system Python on Linux. In general pip has no idea an inactive .venv folder is nearby, so it installs happily into the wrong place."
    }
  ]
}
\`\`\`

## Writing down what you installed

Installing solves today. It does not solve the next person, including you on a new laptop, who needs the same libraries at the same versions. \`pip freeze\` prints exactly what is installed, one \`name==version\` line per package, and \`>\` redirects that into a file you commit:

\`\`\`bash
pip install requests            # add a dependency
pip freeze > requirements.txt   # write down what is installed right now
pip install -r requirements.txt # rebuild that exact set somewhere else
\`\`\`

\`\`\`text
certifi==2024.7.4
charset-normalizer==3.3.2
requests==2.32.3
\`\`\`

Note that \`requests\` pulled in two libraries you never asked for. \`pip freeze\` lists those too, because reproducing your environment means reproducing all of it.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Command", "What it actually does", "How often you run it"],
  "rows": [
    ["python3 -m venv .venv", "Creates a folder with its own interpreter and its own site-packages", "Once, when the project is created"],
    ["source .venv/bin/activate", "Repoints python and pip in THIS shell at that folder", "Every new terminal window"],
    ["pip install requests", "Downloads the library into the currently active environment", "Whenever you add a dependency"],
    ["pip freeze > requirements.txt", "Writes every installed name==version into a file you commit", "After you add or upgrade anything"],
    ["pip install -r requirements.txt", "Installs exactly those pins into a fresh environment", "On a clone, on a new laptop, in CI"]
  ],
  "highlightCols": ["How often you run it"],
  "caption": "The third column is the one people get wrong. Creating is per project, but activating is per terminal, which is why 'I installed it and it still says ModuleNotFoundError' is almost always a shell that was never activated."
}
\`\`\`

## What never gets committed

\`requirements.txt\` goes into git. \`.venv\` does not. It holds hundreds of megabytes of binaries built for one operating system and one Python version, and \`pip install -r requirements.txt\` rebuilds it in seconds, so committing it costs everyone a huge download to receive files that may not even run on their machine. Put a line for it in \`.gitignore\` alongside \`__pycache__/\` and \`*.pyc\`, the compiled bytecode Python writes next to your source and regenerates whenever it needs to.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "clone-without-the-venv",
  "prompt": "Your repo ignores .venv. A teammate clones it on a laptop that has never seen your project. What gets them a working set of libraries?",
  "options": [
    {
      "label": "Nothing extra, since git restores every file the project needs",
      "feedback": "Tempting, because a clone really does reproduce the repository exactly. It reproduces what was committed, and the whole point of ignoring .venv is that the libraries were deliberately left out of it."
    },
    {
      "label": "Creating their own environment, then pip install -r requirements.txt",
      "correct": true,
      "feedback": "Right. The committed pin file is the record that survives the clone, and rebuilding from it is fast. That pair is what makes an install reproducible instead of a folder someone has to mail you."
    },
    {
      "label": "Installing each library by hand, since the exact versions are gone with the folder",
      "feedback": "Close on the instinct that deleting .venv loses information, and it would if requirements.txt did not exist. That file is precisely the version record, which is why freezing it is not optional busywork."
    }
  ],
  "reveal": "One rule covers it: commit what a human decided, never commit what a machine can rebuild from that decision. requirements.txt is a decision. .venv and __pycache__ are rebuildable output."
}
\`\`\`

## The shape of the exercises

Both exercises below work on the text these commands produce, because text is the part you can reason about anywhere. Apply hands you lines that look like \`pip list\` output, \`"requests 2.31.0"\`, and asks for pins. Splitting a line gives you its pieces: \`"requests 2.31.0".split()\` returns \`["requests", "2.31.0"]\`, so \`parts[0]\` is the name and \`parts[1]\` is the version. Practice hands you file paths and asks which ones belong in \`.gitignore\`.

## The tool you will meet at Level 3

\`uv\` is a newer, much faster tool that folds \`venv\`, \`pip\`, and dependency resolution into one binary: \`uv venv\`, \`uv add requests\`, \`uv sync\`. Plenty of new projects start with it. Learn \`venv\` plus \`pip\` first anyway, because that pair is what you will find in almost every existing repository, Dockerfile, and CI config you inherit. Level 3 picks up \`uv\` and \`pyproject.toml\` properly.

**Interview nuance:** "how do you manage dependencies?" is really asking whether you understand reproducibility. The answer that lands is three sentences: one environment per project so versions cannot collide, a committed record of exact versions so any install can be repeated, and never commit the environment itself. Naming the gap in a plain \`pip freeze\` file, that it pins whatever happened to be installed rather than what the project actually declares it needs, is what separates a memorized answer from someone who has debugged a broken build.`,
    demoCode: `installed = ["requests 2.31.0", "flask 3.0.0"]

pins = []
for line in installed:
    parts = line.split()
    pins.append(parts[0] + "==" + parts[1])

print(sorted(pins))   # ['flask==3.0.0', 'requests==2.31.0']`,
  },
  apply: {
    id: "py-l1-environments-apply",
    executionMode: "single-file",
    prompt: `Implement \`to_requirements(installed)\`: return the pinned requirement lines for a list of
installed packages.

Each item in \`installed\` looks like \`"requests 2.31.0"\`, a name and a version separated by a
space. Return a list of \`"name==version"\` strings, sorted alphabetically.`,
    starterCode: `def to_requirements(installed):
    # Split each line, join the two parts with "==", and return them sorted.
    pass`,
    hints: [
      '`"requests 2.31.0".split()` gives you `["requests", "2.31.0"]`.',
      'Build one pin with `parts[0] + "==" + parts[1]` and collect it in a list.',
      "Return `sorted(pins)` so the result does not depend on the input order.",
    ],
    referenceSolution: `def to_requirements(installed):
    pins = []
    for line in installed:
        parts = line.split()
        pins.append(parts[0] + "==" + parts[1])
    return sorted(pins)`,
    testCases: [
      {
        input: { installed: ["requests 2.31.0", "flask 3.0.0"] },
        expected: ["flask==3.0.0", "requests==2.31.0"],
        description: "two packages, sorted by name",
      },
      {
        input: { installed: ["numpy 1.26.4"] },
        expected: ["numpy==1.26.4"],
        description: "a single package",
      },
      {
        input: { installed: [] },
        expected: [],
        description: "nothing installed yet",
      },
      {
        input: { installed: ["pytest 8.2.0", "black 24.4.2", "mypy 1.10.0"] },
        expected: ["black==24.4.2", "mypy==1.10.0", "pytest==8.2.0"],
        description: "three packages given out of order",
      },
    ],
  },
  practice: {
    id: "py-l1-environments-practice",
    executionMode: "single-file",
    prompt: `A teammate opens a pull request with four thousand changed files: their whole \`.venv\` folder
and every \`__pycache__\` directory got committed along with the two lines they meant to change. You
are writing the check that should have caught it.

Implement \`should_ignore(path)\`: return \`True\` when \`path\` is generated output that never belongs
in a repository, and \`False\` otherwise. A path is ignorable when it starts with \`".venv/"\`, when it
contains \`"__pycache__"\`, or when it ends with \`".pyc"\`.`,
    starterCode: `def should_ignore(path):
    # True for anything inside .venv, any __pycache__ path, and any .pyc file.
    pass`,
    hints: [
      '`path.startswith(".venv/")` catches everything inside the environment folder.',
      '`"__pycache__" in path` is true wherever that folder appears in the path.',
      'Finish with `return path.endswith(".pyc")` so every other path answers `False`.',
    ],
    referenceSolution: `def should_ignore(path):
    if path.startswith(".venv/"):
        return True
    if "__pycache__" in path:
        return True
    return path.endswith(".pyc")`,
    testCases: [
      {
        input: { path: ".venv/lib/python3.12/site-packages/requests/__init__.py" },
        expected: true,
        description: "anything inside the environment folder",
      },
      {
        input: { path: "app/__pycache__/main.cpython-312.pyc" },
        expected: true,
        description: "compiled bytecode Python regenerates on its own",
      },
      {
        input: { path: "requirements.txt" },
        expected: false,
        description: "the pin file is exactly what you do commit",
      },
      {
        input: { path: "src/report.py" },
        expected: false,
        description: "your own source always belongs in the repo",
      },
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "first-true-branch-wins",
  "prompt": "Someone reorders those grade checks so that score >= 80 is tested first and score >= 90 second. What does a score of 95 print?",
  "options": [
    {
      "label": "A, because 95 is in the 90s and that branch is the one meant for it",
      "feedback": "Tempting, because you can see at a glance which branch a 95 belongs to. Python does not look for the best match, only the first condition that is True, and 95 >= 80 is already True."
    },
    {
      "label": "B",
      "correct": true,
      "feedback": "Right. The first true branch wins and everything below it is skipped, so a loose condition placed first swallows every case underneath it. Put the tightest condition first."
    },
    {
      "label": "Both A and B, since both conditions are true",
      "feedback": "Close, and both conditions genuinely are true here. But an if/elif chain is one decision with several arms and exactly one arm runs. Two separate if statements would print both."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "empty-list-in-a-condition",
  "prompt": "items is an empty list. What does if items: do?",
  "options": [
    {
      "label": "It runs the block, because items exists and is a real list",
      "feedback": "Tempting, because the name is defined and the object is real, so there is nothing obviously false about it. Truthiness asks whether the container holds anything, not whether the name exists."
    },
    {
      "label": "It skips the block",
      "correct": true,
      "feedback": "Right. An empty list is falsy, so if items: reads as 'if the list has something in it'. The same holds for the empty string, an empty dict, and 0."
    },
    {
      "label": "It raises an error, because a list is not a boolean",
      "feedback": "Close, in that if really does need a yes or a no. Python can answer that for any object at all through truthiness, so this can never raise."
    }
  ]
}
\`\`\`

### Pitfall: truthiness and short-circuiting

\`if\`, \`and\`, and \`or\` do not require real booleans. Python treats \`0\`, \`0.0\`, \`""\`, \`[]\`, \`{}\`, and \`None\` as falsy and nearly everything else as truthy, so \`if items:\` means "if the list is non-empty". Watch the trap: writing \`if age == 18\` when you meant \`age >= 18\` rejects everyone older. And \`and\`/\`or\` short-circuit, stopping as soon as the answer is known, which is why \`user and user.name\` never crashes on a \`None\` user.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "or-returns-an-operand",
  "prompt": "What does the expression '' or 'guest' evaluate to?",
  "options": [
    {
      "label": "True",
      "feedback": "Tempting, because or is a boolean operator and the right side is truthy, so a plain True feels like the natural output. Python's or hands back one of the operands themselves, not a coerced boolean."
    },
    {
      "label": "The string guest",
      "correct": true,
      "feedback": "Right. or gives you the left operand when it is truthy and otherwise the right one, which is the classic one-liner for supplying a default value."
    },
    {
      "label": "The empty string, since the left side comes first",
      "feedback": "Close on the order of evaluation: Python really does look at the empty string first. It is falsy, so or keeps going and returns the right operand instead."
    }
  ]
}
\`\`\`

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

// Authored into L1-M5 directly after `py-l1-conditionals`: everything here is a shorter spelling of
// a branch that lesson already taught, so it must not re-teach if/elif from scratch. `match` needs
// Python 3.10+; the browser sandbox is Pyodide 0.26 (CPython 3.12), so it runs.
const syntaxShorthandsLesson: PythonLesson = {
  id: "py-l1-syntax-shorthands",
  title: "Small syntax that shows up everywhere: ternary, swap & match",
  summary: "Write a conditional expression, swap and unpack tuples, and branch with match/case.",
  estimatedMinutes: 11,
  difficulty: "easy",
  skills: ["conditionals", "control-flow", "unpacking", "tuples"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Three shorthands you will read before you write

Nothing in this lesson is a new idea. Each piece is a shorter way to say something you can already say with \`if\`. That is exactly why it matters: all three turn up in the first real codebase you open, and code you cannot read is code you cannot safely change. The judgement worth learning is when the short form is genuinely clearer and when it is merely shorter.

## A conditional expression: \`a if cond else b\`

An \`if\` block is a **statement**: it does something. \`a if cond else b\` is an **expression**: it evaluates to a value, so it fits where a statement cannot go, such as inside a \`return\`, an f-string, or a list.

\`\`\`python
status = "adult" if age >= 18 else "minor"

# exactly the same decision, written as a statement
if age >= 18:
    status = "adult"
else:
    status = "minor"
\`\`\`

Read it from the middle outwards: check the condition, then take the value on the left or the one on the right. Reach for it when both branches produce a value for the same thing and the whole line still reads comfortably. Stop the moment you want three outcomes: \`"a" if x else "b" if y else "c"\` is legal, is unreadable, and is a reliable way to lose a code review.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "ternary-evaluates-one-side",
  "prompt": "You write value = fetch() if cached else compute(), where both functions are slow. How many of them actually run?",
  "options": [
    {
      "label": "Both, since Python evaluates the whole expression before it assigns anything",
      "feedback": "Tempting, and that really is how arguments behave: f(fetch(), compute()) evaluates both before the call. A conditional expression is a branch, not a call, so it commits to one side and never touches the other."
    },
    {
      "label": "Exactly one, whichever side the condition selected",
      "correct": true,
      "feedback": "Right. The condition is evaluated first, then only the chosen branch runs, exactly like the if/else block it replaces. That is what makes it safe to put an expensive call on each side."
    },
    {
      "label": "Neither, until something reads value later on",
      "feedback": "Close to how a generator or a lazily evaluated language behaves, and Python does have laziness in places like generator expressions. Plain assignment is eager: the right-hand side is finished before the name is bound."
    }
  ]
}
\`\`\`

## Swapping, and tuple unpacking underneath it

\`\`\`python
a, b = b, a
\`\`\`

One line, no temporary variable. It works because of the order Python does things: the right-hand side is evaluated **first** into the tuple \`(b, a)\`, and only then is that tuple unpacked into the names on the left. Nothing is ever half-assigned in between.

Swapping is just the most famous use of **tuple unpacking**, which works on any sequence of the right length:

\`\`\`python
point = (3, 4)
x, y = point            # x is 3, y is 4

first, second = "ab"    # any sequence, not just tuples
\`\`\`

The counts have to match. \`x, y = (1, 2, 3)\` raises \`ValueError: too many values to unpack (expected 2)\` and \`x, y, z = (1, 2)\` raises \`ValueError: not enough values to unpack\`. That strictness is a feature: when the shape of your data changes, you hear about it immediately instead of silently binding the wrong piece to the wrong name.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "swap-without-a-temp",
  "prompt": "a is 1 and b is 2. After the single line a, b = b, a, what does a hold?",
  "options": [
    {
      "label": "2",
      "correct": true,
      "feedback": "Right. The right-hand side is packed into the tuple (2, 1) before any name on the left is touched, so both values are safely captured and then handed out."
    },
    {
      "label": "1, because a is overwritten with b first and then b gets that same new value",
      "feedback": "Tempting, and that is precisely what happens if you write a = b and b = a on two separate lines, which is why the temp-variable version exists at all. One tuple assignment has no in-between state to corrupt."
    },
    {
      "label": "It raises, because you cannot assign to two names in one statement",
      "feedback": "Close, in that many languages really do need a helper or a library call for this. Python treats the comma form as one assignment of one tuple, so it is ordinary syntax rather than a special swap operator."
    }
  ]
}
\`\`\`

## \`match\` / \`case\`

Python 3.10 added \`match\`. It takes one value and tries \`case\` patterns top to bottom, running the first that matches:

\`\`\`python
match code:
    case 200:
        return "ok"
    case 301 | 302:
        return "redirect"
    case 404:
        return "not found"
    case _:
        return "unknown"
\`\`\`

\`|\` means "either of these". \`case _\` is the wildcard that matches anything, playing the part \`else\` plays in an \`if\` chain. There is no fall-through: exactly one body runs and you never write \`break\`.

Used only that way it is a tidier \`elif\` chain, and an \`elif\` chain would have been fine. \`match\` earns its keep when the patterns describe **shape** rather than equality:

\`\`\`python
match event:
    case {"type": "click", "x": x, "y": y}:
        return f"click at {x},{y}"
    case {"type": "key", "key": key}:
        return f"key {key}"
    case _:
        return "unknown event"
\`\`\`

Each case checks the structure of the data and binds the pieces it names in the same step. Written with \`if\`, that is a pile of key checks and lookups repeated in every branch. This is why the feature is called **structural pattern matching** and not "switch".

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "case-name-captures",
  "prompt": "OK = 200 sits at the top of your file. Inside a match you write case OK:, then case 404:, then case _:. What happens?",
  "options": [
    {
      "label": "The 404 branch runs whenever the code is 404, since OK holds 200",
      "feedback": "Tempting, because the name reads as a constant and a switch statement in almost any other language would compare against its value. A bare name in a case is a capture pattern, so it matches every value instead of comparing against 200."
    },
    {
      "label": "Python refuses the file with a SyntaxError saying the name capture makes the remaining patterns unreachable",
      "correct": true,
      "feedback": "Right. The bare name captures rather than compares, and Python can see it swallows every case below it, so it rejects the file outright. Compare against a literal like case 200, or a dotted name like case Status.OK."
    },
    {
      "label": "It works, but every code comes back as ok, because case OK matches anything",
      "feedback": "Close, and that really is what a capture pattern does: it matches anything and binds it to the name. Python only lets that pass when nothing follows it, so here you get a compile error instead of a very quiet bug."
    }
  ],
  "reveal": "The rule is short: literals and dotted names compare, bare names capture. It is the one piece of match syntax that does not behave the way its own spelling suggests."
}
\`\`\`

## The shape of the exercises

Apply is the swap: return two values in ascending order, exchanging them in one line when they arrive backwards. Practice is a \`match\`: turn an HTTP status code into a label, with \`|\` for the two redirect codes and \`case _\` for everything else.

**Interview nuance:** nobody asks you to recite \`match\` syntax, but everybody reads your code while you write it. A conditional expression inside a \`return\` reads as fluent, and a nested one reads as showing off. The tuple swap is the small tell that you think about what Python evaluates first rather than about assignment statements in sequence. And knowing that \`match\` binds shape rather than just comparing equality is what keeps you from describing it as "Python finally got a switch statement", which is the answer that says you read the release notes and never used it.`,
    demoCode: `a, b = 9, 4
a, b = b, a
print(a, b)                          # 4 9

age = 20
print("adult" if age >= 18 else "minor")

def label(code):
    match code:
        case 200:
            return "ok"
        case 301 | 302:
            return "redirect"
        case _:
            return "unknown"

print(label(302))                    # redirect`,
  },
  apply: {
    id: "py-l1-syntax-shorthands-apply",
    executionMode: "single-file",
    prompt: `Implement \`ascending(a, b)\`: return the two values as a list in order, \`[smaller, larger]\`.

Do it with a swap. When \`a\` is greater than \`b\`, exchange them in one line with \`a, b = b, a\`, then
return \`[a, b]\`. Equal values come back unchanged.`,
    starterCode: `def ascending(a, b):
    # Swap a and b when they arrive backwards, then return [a, b].
    pass`,
    hints: [
      "One `if` is enough: `if a > b:` is the only case that needs fixing.",
      "Inside it, `a, b = b, a` exchanges them without a temporary variable.",
      "Return the list `[a, b]` after the `if`, so both paths share one return.",
    ],
    referenceSolution: `def ascending(a, b):
    if a > b:
        a, b = b, a
    return [a, b]`,
    testCases: [
      { input: { a: 3, b: 1 }, expected: [1, 3], description: "arrives backwards, so it swaps" },
      { input: { a: 1, b: 3 }, expected: [1, 3], description: "already in order" },
      { input: { a: 2, b: 2 }, expected: [2, 2], description: "equal values stay put" },
      { input: { a: -5, b: -9 }, expected: [-9, -5], description: "negatives order the same way" },
    ],
  },
  practice: {
    id: "py-l1-syntax-shorthands-practice",
    executionMode: "single-file",
    prompt: `Your status dashboard shows raw HTTP codes and on-call keeps having to look them up, so you
are adding the human labels.

Implement \`status_label(code)\`: return \`"ok"\` for \`200\`, \`"redirect"\` for both \`301\` and \`302\`,
\`"not found"\` for \`404\`, and \`"unknown"\` for anything else. Write it with \`match\`/\`case\`, using
\`|\` for the two redirect codes and \`case _\` for the catch-all.`,
    starterCode: `def status_label(code):
    # match code, with one case per label and case _ for the rest.
    pass`,
    hints: [
      "Open with `match code:` and give each label its own `case`.",
      "Two codes can share one branch: `case 301 | 302:`.",
      '`case _:` is the wildcard, so put it last and return `"unknown"` there.',
    ],
    referenceSolution: `def status_label(code):
    match code:
        case 200:
            return "ok"
        case 301 | 302:
            return "redirect"
        case 404:
            return "not found"
        case _:
            return "unknown"`,
    testCases: [
      { input: { code: 200 }, expected: "ok", description: "the happy path" },
      {
        input: { code: 302 },
        expected: "redirect",
        description: "the second of the two redirects",
      },
      { input: { code: 404 }, expected: "not found", description: "the one everybody knows" },
      {
        input: { code: 503 },
        expected: "unknown",
        description: "anything unlisted hits the wildcard",
      },
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "range-stop-is-excluded",
  "prompt": "How many numbers does range(1, 4) produce, and which ones?",
  "options": [
    {
      "label": "Four numbers: 1, 2, 3, 4",
      "feedback": "Tempting, because both endpoints are written down and reading it aloud as 'one to four' sounds inclusive. The stop value marks where the counting stops, so it is never produced."
    },
    {
      "label": "Three numbers: 1, 2, 3",
      "correct": true,
      "feedback": "Right. stop is excluded, so the count is stop minus start. To include n you have to write range(1, n + 1)."
    },
    {
      "label": "Three numbers: 0, 1, 2",
      "feedback": "Close on the count, and that is exactly what range(3) would give you. With two arguments the first one is the start, so counting begins at 1."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "empty-range-runs-zero-times",
  "prompt": "sum_to is called with n = 0, so the loop header becomes for i in range(1, 1). What happens?",
  "options": [
    {
      "label": "It raises a ValueError, since that range is empty",
      "feedback": "Tempting, because an empty range usually means somebody miscalculated a bound and you would want to hear about it. Python treats it as a perfectly valid range that happens to contain nothing."
    },
    {
      "label": "The body never runs and total stays at 0",
      "correct": true,
      "feedback": "Right. An empty range is silent, so this class of bug shows up as missing output rather than a traceback. It is also why starting the accumulator at 0 gets the n = 0 case correct for free."
    },
    {
      "label": "The body runs once, with i equal to 1",
      "feedback": "Close, in that 1 is indeed the start value. But the range never yields it: with start and stop equal there is no value that is both at or after start and before stop."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "break-ends-the-whole-loop",
  "prompt": "Run that loop over nums = [5, -1, 200, 7]. Which values reach process(n)?",
  "options": [
    {
      "label": "5 and 7, since -1 and 200 are both skipped",
      "feedback": "Tempting, because both guards read like filters and skipping is what the first one does. break is not a skip: it ends the loop outright, so 7 is never looked at."
    },
    {
      "label": "Only 5",
      "correct": true,
      "feedback": "Right. -1 hits continue and is skipped, then 200 hits break and the loop stops there, leaving 7 unvisited. continue skips one pass, break abandons the rest."
    },
    {
      "label": "5, 200 and 7",
      "feedback": "Close if you read break as ending only the current pass. That is continue's job. break exits the loop entirely, and the value that triggered it is not processed either."
    }
  ]
}
\`\`\`

## Pitfalls

- Off-by-one: \`range(1, n)\` stops at \`n - 1\`. Summing \`1\` to \`n\` needs \`range(1, n + 1)\`.
- Infinite \`while\`: if you forget to update the variable in the condition, the loop never ends. Always change state that moves toward the exit.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "range-is-lazy",
  "prompt": "A loop written as for i in range(1000000000) starts instantly and uses almost no memory. Why?",
  "options": [
    {
      "label": "Python builds the list in the background while the loop runs",
      "feedback": "Tempting, because something clearly has to produce all those numbers and a background build would explain the fast start. Nothing is stored at all: each value is computed at the moment the loop asks for it."
    },
    {
      "label": "range keeps only start, stop and step, and computes each value on demand",
      "correct": true,
      "feedback": "Right. Looping with range(n) is O(n) time but O(1) extra space. It is list(range(n)) that would allocate all n values up front."
    },
    {
      "label": "Python allocates the list but compresses it, since the numbers are sequential",
      "feedback": "Close, and compressing a predictable sequence would be a reasonable design. Python's answer is simpler than that: there is no list to compress, only three numbers and a rule."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "a-default-does-not-cover-other-params",
  "prompt": "The signature is def power(base, exp=2). What does calling power() with no arguments at all do?",
  "options": [
    {
      "label": "Returns 0, since both parameters fall back to something",
      "feedback": "Tempting, because one parameter visibly does have a fallback and it is easy to read that as the function being callable bare. A default only covers the parameter it is attached to."
    },
    {
      "label": "Raises a TypeError about a missing required argument",
      "correct": true,
      "feedback": "Right. Giving exp a default never makes base optional. Every parameter without its own default has to receive a value from the caller."
    },
    {
      "label": "Waits for the arguments, since the call is incomplete",
      "feedback": "Close to how a partially applied function behaves in some languages, and functools.partial exists in Python for exactly that. A plain call either binds everything it needs or raises immediately."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "default-before-required-param",
  "prompt": "A file contains def power(exp=2, base): as its first line. What happens when you run the file?",
  "options": [
    {
      "label": "It works, as long as every caller passes base by name",
      "feedback": "Tempting, because keyword arguments really would make every such call unambiguous, and that reasoning is what keyword-only parameters are built on. The def itself is rejected before any call exists."
    },
    {
      "label": "It raises a SyntaxError at definition time",
      "correct": true,
      "feedback": "Right. A parameter without a default cannot follow one that has a default, because positional arguments are filled left to right. Put the required parameters first."
    },
    {
      "label": "It works until someone calls power(5), which then raises",
      "feedback": "Close, in that a call is where you would normally feel a signature problem. Python catches this one earlier: it is a syntax error, so the module never even finishes loading."
    }
  ]
}
\`\`\`

### Pitfall: default parameters must come last

Every parameter with a default has to appear after every parameter without one:

\`\`\`python
def power(exp=2, base):   # SyntaxError: non-default argument follows default argument
    return base ** exp
\`\`\`

Python cannot fill positional arguments left to right if a required parameter sits behind an optional one. Fix it by ordering required parameters first: \`def power(base, exp=2)\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "default-evaluated-once",
  "prompt": "def collect(item, bucket=[]) appends item to bucket and returns it. You call collect('a'), then collect('b'). What does the second call return?",
  "options": [
    {
      "label": "A list holding only b, since bucket starts empty on every call",
      "feedback": "Tempting, and it is what the signature seems to promise: a fresh empty list each time. The default expression runs once, when def executes, so there is only ever one list."
    },
    {
      "label": "A list holding a and then b",
      "correct": true,
      "feedback": "Right. The single default list is stored on the function object and reused by every call that omits the argument, so results leak between calls. Use bucket=None and build the list inside the body."
    },
    {
      "label": "A list holding only a, since the default is restored between calls",
      "feedback": "Close, in that you are picturing some kind of reset step. Nothing resets it: that same list object stays attached to the function for the life of the program."
    }
  ]
}
\`\`\`

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

// Authored into L1-M5 directly after `py-l1-functions`, whose teach block introduces reading a
// traceback. This lesson picks that up and adds the loop around it (`breakpoint()`, pdb, print vs
// stepping). `pdb` needs an interactive prompt the browser sandbox cannot provide, so both graded
// exercises parse traceback TEXT, which is the transferable half of the skill.
const debuggingLesson: PythonLesson = {
  id: "py-l1-debugging",
  title: "Debugging: reading a traceback & stepping with breakpoint()",
  summary: "Read a traceback bottom-up, pause code with breakpoint(), and pick print vs stepping.",
  estimatedMinutes: 13,
  difficulty: "medium",
  skills: ["debugging", "tracebacks", "errors", "error-handling"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## The question every interview asks

"How do you debug?" comes up in nearly every screen, and the weak answer is "I add print statements until I find it." That is not wrong, it is incomplete. A strong answer has three parts: read the traceback properly so you start at the right line, use prints when the question is what a value was, and use a real debugger when the question is how the program got here at all. This lesson covers all three.

**The debugger commands below run in a terminal, not in the editor on this page.** The browser sandbox has no interactive prompt, so \`breakpoint()\` would have nothing to talk to. The graded exercises pull apart traceback text instead, which is the half of the skill that travels furthest: a crash report from CI or an on-call channel arrives as text, and you have to answer "what broke" and "where" from it with no debugger anywhere in reach.

## A traceback is a stack, printed oldest first

\`\`\`text
Traceback (most recent call last):
  File "report.py", line 21, in <module>
    print(average(readings))
  File "report.py", line 14, in average
    return total(values) / len(values)
  File "report.py", line 9, in total
    return sum(values)
TypeError: unsupported operand type(s) for +: 'int' and 'str'
\`\`\`

Read it bottom-up.

1. **The last line is the error.** \`TypeError\` is the exception type and everything after the colon is its message. Start here every single time: it usually names the fix, and it costs you nothing to read.
2. **The frame directly above it is where execution stopped.** \`line 9, in total\`, at the statement \`return sum(values)\`. That is the innermost frame, and it prints last, which is exactly what "most recent call last" in the header is telling you.
3. **Every frame above that is the caller of the one below it.** \`total\` was called from \`average\` at line 14, which was called from the top level of the file (\`<module>\`) at line 21. That chain is the route a bad value took to reach the line that finally choked on it.

The innermost frame is where the program died. It is not always where the bug lives. Here \`sum(values)\` is perfectly reasonable code: the real defect is whoever put a string into \`readings\`, several frames up.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "innermost-frame-is-library-code",
  "prompt": "The innermost frame of your traceback points at a file inside site-packages, deep in a library you did not write. Where is the bug most likely to be?",
  "options": [
    {
      "label": "In the library, since that is the code that actually raised",
      "feedback": "Tempting, because the failing statement really does sit in their file and the frame is pointing straight at it. Popular libraries are heavily used, so the odds that you found a fresh bug in one are much worse than the odds you handed it something odd."
    },
    {
      "label": "In the last frame that belongs to your own code, which passed the library something it could not handle",
      "correct": true,
      "feedback": "Right. Walk up the frames until you reach a file you wrote, and read the call there. Nine times in ten the library is faithfully reporting that your argument was the wrong type, shape, or empty."
    },
    {
      "label": "In the outermost frame, since that is where the program started",
      "feedback": "Close, in that the outermost frame really does show how the run began, and for a short script it may be the only code you own. In a larger program it is usually just an entry point that forwards arguments and hides nothing interesting."
    }
  ]
}
\`\`\`

## Pausing the program with \`breakpoint()\`

A print tells you what one value was, at one line you had to guess in advance. A debugger stops the program and lets you ask anything, at any point, without editing and re-running. Since Python 3.7 you get one with a single line, no import required:

\`\`\`python
def average(values):
    breakpoint()          # execution pauses here and hands you a prompt
    return sum(values) / len(values)
\`\`\`

Run the file normally and you land at a \`(Pdb)\` prompt with the program frozen mid-call, every local variable still alive.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["At the (Pdb) prompt", "What it does", "Reach for it when"],
  "rows": [
    ["p values", "Evaluates any expression in the paused frame", "You want a value, or p type(values[0]) to see what it really is"],
    ["n (next)", "Runs the current line and stops on the next one in this function", "You trust the calls on this line and want the result"],
    ["s (step)", "Same, but steps INTO the call instead of over it", "One of the calls on this line is your suspect"],
    ["l (list)", "Shows the source around where you are paused", "You have lost track of which line you are on"],
    ["c (continue)", "Runs on until the next breakpoint or the end", "You have seen enough here"],
    ["q (quit)", "Stops the program", "You already know the fix"]
  ],
  "highlightCols": ["Reach for it when"],
  "caption": "Only two of these do investigative work. p answers what a value is right now, and n versus s decides whether you watch a call from outside or from inside. The rest is navigation."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "step-into-versus-over",
  "prompt": "You are paused on return total(values) / len(values) and you suspect total is computing the wrong number. Do you press n or s?",
  "options": [
    {
      "label": "n, because it runs the line and shows you what came back",
      "feedback": "Tempting, and n is the right default for the other ninety percent of lines. It runs total to completion in one go, so you see the wrong answer arrive and still have no idea which statement inside produced it."
    },
    {
      "label": "s, because it steps into total so you can watch it compute",
      "correct": true,
      "feedback": "Right. Step into the call you suspect and over the ones you trust. That single choice is the whole difference between a debugger and a very slow print."
    },
    {
      "label": "c, because continuing lets the error surface with a full traceback",
      "feedback": "Close, and continuing is genuinely useful once you have finished looking around. Here it throws away the pause you already paid for and hands you back the same traceback that sent you to the debugger in the first place."
    }
  ]
}
\`\`\`

## When a print is genuinely the better tool

Print debugging is not the beginner version of a debugger, it is a different instrument. Reach for a print when the question is "what was this value" and you already know the line to ask at, when you need a pattern across thousands of iterations rather than one frozen moment, or when the code runs somewhere nothing can attach to it: CI, a container, a scheduled job at 3am.

Reach for \`breakpoint()\` when you do not know where to look yet, so any print is a guess. When the state is big and you want to poke at six values, because each extra print costs a whole re-run. Or when the question is not a value at all but the route: how did control reach this line.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "print-or-breakpoint-nightly-job",
  "prompt": "A nightly job processes 5000 rows and raises a KeyError on roughly one of them. It runs unattended at 3am. What do you do first?",
  "options": [
    {
      "label": "Drop a breakpoint() in the loop and inspect the row that fails",
      "feedback": "Tempting, and a CONDITIONAL breakpoint really is the expert move on this exact bug. A plain one stops you on about 4999 healthy rows first, and nothing can sit at a prompt for a job that runs unattended overnight."
    },
    {
      "label": "Log the key and the row id from the failing branch, then read the log after the next run",
      "correct": true,
      "feedback": "Right. The job is unattended and the failure is rare, so you need a record rather than a pause. Once the log names the bad row you can reproduce it locally in one second, and then a debugger is worth reaching for."
    },
    {
      "label": "Wrap the lookup in try/except so the job stops dying on that row",
      "feedback": "Close, and skipping a bad row may well be the right final behavior once you understand it. Doing it before you know which key is missing converts a loud failure into silent data loss, which is a much more expensive bug to find later."
    }
  ],
  "reveal": "Pick the tool from the question you have left. Prints and logs answer 'what was this value' and survive running unattended. breakpoint() answers 'how did we get here and what else is true right now' and needs you sitting in front of it."
}
\`\`\`

## The shape of the exercises

Both exercises take one traceback as a single string and answer a question about it. Split it into lines with \`trace.strip().split("\\n")\`. The last line is the error, and every line that starts with \`File \` once you strip its indentation is a frame. Apply asks for the exception type, which is the "what". Practice asks for the line number of the innermost frame, which is the "where", the first place you would open your editor.

**Interview nuance:** the shape of a strong answer to "how do you debug" is three moves. Read the last line of the traceback for what broke. Walk up the frames to the last one in code you own, which is usually where the bad value entered. Then pick a tool by the question you have left: \`print\` for "what was this value at this line", \`breakpoint()\` for "how did we get here and what else is true right now". Saying only "I add prints" reads as never having debugged something you could not guess.`,
    demoCode: `trace = """Traceback (most recent call last):
  File "report.py", line 21, in <module>
    print(average(readings))
  File "report.py", line 9, in total
    return sum(values)
TypeError: unsupported operand type(s) for +: 'int' and 'str'"""

lines = trace.strip().split("\\n")
print(lines[-1])                 # the error itself
print(lines[-1].split(":")[0])   # just the exception type`,
  },
  apply: {
    id: "py-l1-debugging-apply",
    executionMode: "single-file",
    prompt: `Implement \`exception_type(trace)\`: return the exception type named at the end of a traceback.

The last line of a traceback is the error, like \`ZeroDivisionError: division by zero\`. Return only
the type name, \`"ZeroDivisionError"\`. A last line carrying no message at all, like
\`StopIteration\`, returns that whole line.`,
    starterCode: `def exception_type(trace):
    # The last line is the error. Return the part before the first ":".
    pass`,
    hints: [
      'Split the report into lines with `trace.strip().split("\\n")`; `[-1]` is the last one.',
      'Split that line on `":"` and keep `[0]`, which is everything before the first colon.',
      "Call `.strip()` on the result so no stray whitespace comes back.",
    ],
    referenceSolution: `def exception_type(trace):
    last = trace.strip().split("\\n")[-1]
    return last.split(":")[0].strip()`,
    testCases: [
      {
        input: {
          trace:
            "Traceback (most recent call last):\n  File \"report.py\", line 21, in <module>\n    print(average(readings))\n  File \"report.py\", line 9, in total\n    return sum(values)\nTypeError: unsupported operand type(s) for +: 'int' and 'str'",
        },
        expected: "TypeError",
        description: "a message that itself contains a colon",
      },
      {
        input: {
          trace:
            'Traceback (most recent call last):\n  File "app.py", line 3, in <module>\n    print(user["user_id"])\nKeyError: \'user_id\'',
        },
        expected: "KeyError",
        description: "a KeyError naming the missing key",
      },
      {
        input: {
          trace:
            'Traceback (most recent call last):\n  File "main.py", line 2, in <module>\n    raise StopIteration\nStopIteration',
        },
        expected: "StopIteration",
        description: "an exception with no message at all",
      },
      {
        input: {
          trace:
            'Traceback (most recent call last):\n  File "report.py", line 14, in average\n    return total / count\nZeroDivisionError: division by zero',
        },
        expected: "ZeroDivisionError",
        description: "the classic divide by an empty count",
      },
    ],
  },
  practice: {
    id: "py-l1-debugging-practice",
    executionMode: "single-file",
    prompt: `An overnight job died and the on-call channel holds nothing but the traceback somebody pasted
into it. Before you can open a file you need the one number that says where to look.

Implement \`crash_line(trace)\`: return the line number of the innermost frame, which is the LAST
line of the traceback that starts with \`File \` once its indentation is stripped. A frame line looks
like \`  File "report.py", line 9, in total\`. Return \`0\` when the report was truncated and carries
no frame at all.`,
    starterCode: `def crash_line(trace):
    # Walk the lines, remember the number from each File frame, return the last one.
    pass`,
    hints: [
      "Strip each line before testing it: a frame only starts with `File ` after its indentation is gone.",
      'On a frame line, `line.split("line ")[1]` is `9, in total`, so splitting that on `","` gives the number.',
      "Overwrite the same variable each time you see a frame, so the last one is what you return.",
    ],
    referenceSolution: `def crash_line(trace):
    number = 0
    for raw in trace.strip().split("\\n"):
        line = raw.strip()
        if line.startswith("File "):
            after = line.split("line ")[1]
            number = int(after.split(",")[0])
    return number`,
    testCases: [
      {
        input: {
          trace:
            'Traceback (most recent call last):\n  File "report.py", line 21, in <module>\n    print(average(readings))\n  File "report.py", line 14, in average\n    return total(values) / len(values)\n  File "report.py", line 9, in total\n    return sum(values)\nTypeError: unsupported operand type(s) for +: \'int\' and \'str\'',
        },
        expected: 9,
        description: "three frames, so the deepest one wins",
      },
      {
        input: {
          trace:
            'Traceback (most recent call last):\n  File "app.py", line 3, in <module>\n    print(user["user_id"])\nKeyError: \'user_id\'',
        },
        expected: 3,
        description: "a single frame",
      },
      {
        input: {
          trace:
            'Traceback (most recent call last):\n  File "app.py", line 42, in <module>\n    load(config)\n  File "/usr/lib/python3.11/json/decoder.py", line 355, in raw_decode\n    obj, end = self.scan_once(s, idx)\njson.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)',
        },
        expected: 355,
        description: "the deepest frame is library code, and the error text mentions a line too",
      },
      {
        input: { trace: "ValueError: invalid literal for int() with base 10: 'abc'" },
        expected: 0,
        description: "a truncated report with no frames at all",
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "floor-division-drops-the-decimal",
  "prompt": "Converting 100 degrees Fahrenheit should give 37.77 and a bit. What does (f - 32) * 5 // 9 give you when f is 100?",
  "options": [
    {
      "label": "37.77 and a bit, the same as with a single slash",
      "feedback": "Tempting, because both operators look like division and the same numbers go in. But // is floor division: it throws away everything after the decimal point."
    },
    {
      "label": "37",
      "correct": true,
      "feedback": "Right. // floors the result and throws the fraction away, so you get 37 rather than 37.78. Both operands are ints here, so the answer is an int too. Use a single / in this formula."
    },
    {
      "label": "38, because 37.77 rounds up",
      "feedback": "Close, and this is the most common wrong instinct. Floor division does not round to nearest; it always goes down to the next whole number."
    },
    {
      "label": "A SyntaxError, because // starts a comment",
      "feedback": "That is true in JavaScript, Java, and C, where // begins a comment, so the instinct travels with you. In Python the comment character is #, and // is an arithmetic operator."
    }
  ]
}
\`\`\`

### Pitfall: float vs floor division

Both of your exercises divide, so watch the division operator. In Python 3, \`/\` is float division and always yields a \`float\`, even when it divides evenly.

\`\`\`python
print(9 / 4)     # 2.25   float division
print(9 // 4)    # 2      floor division, throws away the remainder
\`\`\`

Two traps in your formulas. First, use \`/\`, not \`//\`. Floor division like \`(f - 32) * 5 // 9\` rounds down (\`//\` floors toward negative infinity), so a result that should be \`37.777...\` comes back as \`37\`. Second, keep the parentheses. \`f - 32 * 5 / 9\` evaluates \`32 * 5 / 9\` first, because \`*\` and \`/\` bind tighter than \`-\`, which is not the conversion you want. Write \`(f - 32)\` so the subtraction happens before the multiply.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "precedence-without-parentheses",
  "prompt": "You drop the parentheses and write f - 32 * 5 / 9 with f = 212. What comes out?",
  "options": [
    {
      "label": "100.0, the same as the correct formula",
      "feedback": "Tempting, because the line reads left to right and the pieces are all there. Python does not evaluate left to right: * and / bind tighter than -, so the subtraction happens last."
    },
    {
      "label": "About 194.2",
      "correct": true,
      "feedback": "Right. 32 * 5 / 9 runs first and gives about 17.8, which is then subtracted from 212. The parentheses are what force the subtraction to happen first."
    },
    {
      "label": "180.0",
      "feedback": "Close if you assumed the multiply and the divide cancel out and leave you subtracting 32. They do not: 32 * 5 / 9 is about 17.8, so you never actually compute f - 32."
    }
  ],
  "reveal": "Both traps in this lesson are silent. Neither a stray // nor a missing pair of parentheses raises anything; you just get a number that is quietly wrong, which is why the test cases pin exact values."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "true-division-always-float",
  "prompt": "What type does 6 / 2 produce in Python 3?",
  "options": [
    {
      "label": "int, since the division comes out even",
      "feedback": "Tempting, because the result really is a whole number and Python 2 did behave this way. In Python 3 a single slash always produces a float, so you get 3.0 rather than 3."
    },
    {
      "label": "float",
      "correct": true,
      "feedback": "Right. / is true division and always returns a float, even for 6 / 2. Reach for // when you want an int back from an even split."
    },
    {
      "label": "It depends: int when it divides evenly, float otherwise",
      "feedback": "Close, and that is the rule people carry over from C, Java, and Go. Python 3 deliberately made / predictable: the type of the result never depends on the values you feed it."
    }
  ]
}
\`\`\`

The one to memorize: \`/\` always gives a \`float\`, even when the result is whole. \`6 / 2\` is \`3.0\`, not \`3\`. That is exactly what your \`average(a, b, c)\` exercise wants: sum the three numbers and divide by \`3\`, and a decimal answer is correct.

### Floor division and modulo: splitting into groups

\`//\` gives the whole number of times the divisor fits, and \`%\` gives what is left over. Together they split one number into a quotient and a remainder:

\`\`\`python
total = 125
hours = total // 60   # 2   whole hours
mins  = total % 60    # 5   leftover minutes
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "floor-division-or-modulo",
  "prompt": "Which operator answers each question: floor division // or modulo %?",
  "buckets": ["Floor division //", "Modulo %"],
  "items": [
    {
      "label": "How many whole hours are in 125 minutes",
      "bucket": "Floor division //",
      "feedback": "125 // 60 is 2. Floor division answers how many times the divisor fits."
    },
    {
      "label": "How many minutes are left after those whole hours",
      "bucket": "Modulo %",
      "feedback": "125 % 60 is 5. Modulo answers what could not be grouped."
    },
    {
      "label": "Wrap an index back to the front of a 5-item list",
      "bucket": "Modulo %",
      "feedback": "i % 5 always lands between 0 and 4, which is what makes flooring modulo the clock-arithmetic tool."
    },
    {
      "label": "Split 17 records into full pages of 5, how many full pages",
      "bucket": "Floor division //",
      "feedback": "17 // 5 is 3 full pages. The 2 records left over are the % half of the same question."
    },
    {
      "label": "Test whether a number is even",
      "bucket": "Modulo %",
      "feedback": "n % 2 == 0. Evenness is a question about the remainder, not about the quotient."
    }
  ]
}
\`\`\`

That is the entire trick behind \`minutes_to_hm(total_minutes)\`: return \`[total_minutes // 60, total_minutes % 60]\`, which is \`[2, 5]\` for \`125\`. Reach for \`//\` and \`%\` whenever you mean "how many whole groups" and "what is left".

### Pitfalls

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "float-equality-lies",
  "prompt": "What does 0.1 + 0.2 == 0.3 evaluate to?",
  "options": [
    {
      "label": "True, since both sides are the same number",
      "feedback": "Tempting, and it is the correct answer in decimal arithmetic. Floats are binary approximations, though, and neither 0.1 nor 0.2 has an exact binary form, so the sum lands slightly high."
    },
    {
      "label": "False",
      "correct": true,
      "feedback": "Right. 0.1 + 0.2 is actually 0.30000000000000004. Compare floats with a tolerance, such as abs(x - y) < 1e-9, or use math.isclose."
    },
    {
      "label": "True on most machines, False on some",
      "feedback": "Close, in that this really does come down to how numbers are represented in hardware. But the double-precision format is standard across the machines you will meet, so this comparison is reliably False rather than flaky."
    }
  ]
}
\`\`\`

**Float equality lies.** Because floats are binary approximations, \`0.1 + 0.2 == 0.3\` evaluates to \`False\` (\`0.1 + 0.2\` is actually \`0.30000000000000004\`). Never compare floats with \`==\`. Compare with a tolerance, for example \`abs(x - y) < 1e-9\`, or use \`math.isclose(x, y)\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "floor-division-with-negatives",
  "prompt": "What is -7 // 2 in Python?",
  "options": [
    {
      "label": "-3, dropping the remainder",
      "feedback": "Tempting, because dropping the fractional part is how C, Java, and Go do it, and truncating toward zero gives -3. Python floors instead, which for a negative result means going further from zero, not closer."
    },
    {
      "label": "-4",
      "correct": true,
      "feedback": "Right. // floors toward negative infinity, so -3.5 becomes -4. The matching remainder is -7 % 2 == 1, because the remainder takes the sign of the divisor."
    },
    {
      "label": "-3.5, since a negative cannot be floored",
      "feedback": "Close on the intermediate value, which really is -3.5. But // never hands back a fraction: given two ints it always returns an int."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "int-of-empty-string",
  "prompt": "A form field arrives empty and your code calls int(text) on it. What happens?",
  "options": [
    {
      "label": "It returns 0, treating an empty field as nothing",
      "feedback": "Tempting, because an empty quantity field really does mean zero in the business sense, and that is usually the behavior you want. int() will not guess: it needs digits to parse."
    },
    {
      "label": "It raises a ValueError",
      "correct": true,
      "feedback": "Right. There is nothing there to parse, so it raises. Check for the empty string before you convert, which is exactly the order parse_or_zero needs."
    },
    {
      "label": "It returns None",
      "feedback": "Close, in that you are expecting some quiet stand-in for missing data. Python's converters do not return None on bad input; they raise, so the problem cannot travel further into your program."
    },
    {
      "label": "It returns the empty string unchanged",
      "feedback": "Tempting if you picture int() as leaving alone anything it cannot handle. Conversion functions either produce the new type or raise; they never pass the original value through."
    }
  ]
}
\`\`\`

\`int()\` is strict. It parses \`"42"\` but raises \`ValueError\` on \`""\`, \`"3.5"\`, or \`"12a"\`. That strictness is why a function like \`parse_or_zero\` has to check for the empty string *before* it calls \`int()\`, not after.

### Truthiness

In a condition, every value is either **truthy** or **falsy**. Memorize the falsy ones: \`False\`, \`None\`, \`0\`, \`0.0\`, \`""\`, \`[]\`, \`{}\`, and \`()\`. Everything else is truthy.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "falsy-or-truthy",
  "prompt": "Each of these sits alone in an if. Sort them by whether the block runs.",
  "buckets": ["Falsy, the block is skipped", "Truthy, the block runs"],
  "items": [
    {
      "label": "0",
      "bucket": "Falsy, the block is skipped",
      "feedback": "Zero is the falsy int. Every other number is truthy, including negatives."
    },
    {
      "label": "0.0",
      "bucket": "Falsy, the block is skipped",
      "feedback": "The float zero is falsy for the same reason the int zero is."
    },
    {
      "label": "An empty string",
      "bucket": "Falsy, the block is skipped",
      "feedback": "No characters means empty, and empty means falsy."
    },
    {
      "label": "A string holding a single space",
      "bucket": "Truthy, the block runs",
      "feedback": "A space is a character, so the string is not empty. Whitespace-only input is a classic source of this bug: strip it before you test it."
    },
    {
      "label": "The string '0'",
      "bucket": "Truthy, the block runs",
      "feedback": "It spells zero, but truthiness asks whether the string holds characters, not what the text says."
    },
    {
      "label": "An empty list",
      "bucket": "Falsy, the block is skipped",
      "feedback": "This is why if items: reads as 'if the list has anything in it'."
    },
    {
      "label": "The list [0]",
      "bucket": "Truthy, the block runs",
      "feedback": "The list holds one item, so it is non-empty and truthy, even though that item is itself falsy. Emptiness is about the container, never its contents."
    },
    {
      "label": "None",
      "bucket": "Falsy, the block is skipped",
      "feedback": "None is falsy in the same way 0 and the empty string are, which is exactly why if value: cannot tell missing apart from zero."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bool-of-the-word-false",
  "prompt": "A config file hands you the text False as a string. What does bool('False') return?",
  "options": [
    {
      "label": "False, since that is what the text says",
      "feedback": "Tempting, because the word is right there and plenty of config libraries do interpret it for you. Plain bool() never reads the text; it only asks whether the string is empty."
    },
    {
      "label": "True",
      "correct": true,
      "feedback": "Right. The string has five characters, so it is non-empty and therefore truthy. The same goes for '0'. Compare the text yourself when the word is what matters."
    },
    {
      "label": "It raises a ValueError, since the string is not a boolean",
      "feedback": "Close to how int('abc') behaves, which is where the instinct comes from. bool() accepts absolutely any object and never raises; it just reports truthiness."
    }
  ]
}
\`\`\`

One trap: \`bool("False")\` is \`True\` and \`bool("0")\` is \`True\`, because both are non-empty strings. Truthiness asks whether the container is empty, not what the text spells. If you ever need to interpret the *word* \`"false"\`, you must compare the string yourself.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "booleans-are-ints",
  "prompt": "What does sum([True, False, True]) return?",
  "options": [
    {
      "label": "A TypeError, since you cannot add booleans together",
      "feedback": "Tempting, because adding true to false has no obvious meaning and most types would refuse. bool is a subclass of int in Python, so booleans already are numbers as far as arithmetic is concerned."
    },
    {
      "label": "2",
      "correct": true,
      "feedback": "Right. True is 1 and False is 0, so summing a list of test results counts how many passed. It is a useful one-liner and an easy accident."
    },
    {
      "label": "True, since at least one of the values is True",
      "feedback": "Close to how any() behaves, and any() really does report whether at least one item is truthy. sum() does arithmetic, not a logical or."
    }
  ]
}
\`\`\`

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

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Counting", "p", "y", "t", "h", "o", "n"],
  "rows": [
    ["From the front", 0, 1, 2, 3, 4, 5],
    ["From the back", -6, -5, -4, -3, -2, -1]
  ],
  "highlightCols": ["Counting"],
  "caption": "Two rulers over the same six characters. Counting from the front starts at 0, which is why the last index is 5 and not 6; counting from the back starts at -1, because -0 and 0 would be the same number."
}
\`\`\`

Reach in with square brackets, and use \`len()\` to count characters:

\`\`\`python
word = "python"
word[0]    # "p"   first character
word[-1]   # "n"   last character
len(word)  # 6     number of characters
\`\`\`

To build the first-and-last string you will need in the Apply, you combine two indexed characters with \`+\`: \`word[0] + word[-1]\` gives \`"pn"\`. For a one-character string like \`"a"\`, both \`word[0]\` and \`word[-1]\` point at the same character, so you get \`"aa"\`.

## Slicing: half-open ranges

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "slice-stop-is-excluded",
  "prompt": "word is the string python. What does word[0:3] give you?",
  "options": [
    {
      "label": "pyth, the characters at positions 0 through 3",
      "feedback": "Tempting, and it is how a range reads in ordinary English: zero through three, four characters. Python slices are half open, so the stop index is where you stop rather than the last character you keep."
    },
    {
      "label": "pyt",
      "correct": true,
      "feedback": "Right. The slice runs from start up to but not including stop, so with in-range positive bounds the length is exactly stop minus start."
    },
    {
      "label": "yt, starting just after position 0",
      "feedback": "Close if you read the start as exclusive too. Only the stop end is excluded; the start index is always included."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "string-item-assignment",
  "prompt": "word is the string python. You write word[0] = 'P'. What happens?",
  "options": [
    {
      "label": "word becomes Python",
      "feedback": "Tempting, because that exact syntax works on a list, and a string looks like a sequence of characters you should be able to poke at by position. Strings are immutable: no character can be replaced in place."
    },
    {
      "label": "It raises a TypeError",
      "correct": true,
      "feedback": "Right. Strings do not support item assignment. Build a new string instead, for example 'P' + word[1:]."
    },
    {
      "label": "Nothing happens, the line is quietly ignored",
      "feedback": "Close to what beginners really do experience with strings, since a call like word.upper() genuinely is discarded when nobody captures it. But assigning to an index is an error, not a silent no-op."
    }
  ]
}
\`\`\`

## Strings are immutable

You cannot change a character in place. \`word[0] = "P"\` raises \`TypeError\`. Every operation that "modifies" a string actually builds a **new** string and leaves the original untouched. That is why slicing returns a fresh value instead of editing \`word\`.

### Pitfalls

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "index-raises-slice-clamps",
  "prompt": "text is the two-character string hi. Compare what text[5] does with what text[0:5] does.",
  "options": [
    {
      "label": "Both raise an IndexError",
      "feedback": "Tempting, because both ask for positions the string does not have, and consistency would be the kinder design. Slicing is deliberately forgiving in a way indexing is not."
    },
    {
      "label": "text[5] raises an IndexError, text[0:5] returns hi",
      "correct": true,
      "feedback": "Right. Indexing has to produce one specific character, so out of range is an error. Slicing clamps to whatever exists and hands that back."
    },
    {
      "label": "text[5] returns an empty string, text[0:5] raises",
      "feedback": "This is the rule backwards, which is worth noticing: indexing is the strict one. That is why an out-of-bounds index fails loudly while an over-long slice fails silently."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "find-returns-minus-one",
  "prompt": "'Hello'.find('z') does not raise. It returns -1. Why is that return value worth being careful with?",
  "options": [
    {
      "label": "It is not, since -1 is obviously not a real position",
      "feedback": "Tempting, because -1 does look like an error code at a glance. In Python -1 is a perfectly ordinary index: it means the last character."
    },
    {
      "label": "text[text.find('z')] quietly returns the last character instead of failing",
      "correct": true,
      "feedback": "Right. A miss looks like a valid index, so the bug shows up as wrong data rather than an exception. Compare against -1 first, or use index(), which raises on a miss."
    },
    {
      "label": "It is a string, so comparing it to a number fails",
      "feedback": "Close, in that a type surprise would be one way this could bite. find returns an int, and that is exactly the problem: it blends in with the real positions it returns on a hit."
    }
  ]
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "strip-does-not-mutate",
  "prompt": "text holds Hello with two spaces on each side. You put text.strip() on a line by itself, then print(text). What prints?",
  "options": [
    {
      "label": "Hello, with the spaces gone",
      "feedback": "Tempting, because the call clearly did the work, and list methods like append really do change the object in place. Strings are immutable, so strip built a new string and nobody kept it."
    },
    {
      "label": "The original text, spaces and all",
      "correct": true,
      "feedback": "Right. The cleaned string was returned and immediately thrown away. Capture it with text = text.strip(), or return the chained expression directly."
    },
    {
      "label": "It raises an error, because the result was never used",
      "feedback": "Close, in that some linters will warn you about a value going nowhere. Python itself is fine with it: an expression whose result is discarded is ordinary, legal code."
    }
  ]
}
\`\`\`

### Pitfall: methods do not mutate

Because strings are immutable, this looks like it cleans \`text\` but does nothing:

\`\`\`python
text = "  Hello  "
text.strip()        # returns "Hello", but the result is discarded
print(text)         # "  Hello  "   still unchanged
\`\`\`

You have to **capture** the return value: \`text = text.strip().lower()\`, or \`return\` the chained expression directly. That is exactly the move \`normalize\` needs. Forgetting it is the single most common string bug interns ship.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "plus-equals-in-a-loop",
  "prompt": "You assemble one long string by writing out += piece inside a loop over n pieces. How much total work is that?",
  "options": [
    {
      "label": "O(n), one step per piece",
      "feedback": "Tempting, because the loop body is a single line that runs exactly n times, and counting iterations is the usual way to read a loop. Each += builds a whole new string and copies everything gathered so far into it."
    },
    {
      "label": "O(n squared)",
      "correct": true,
      "feedback": "Right. You copy 1 character, then 2, then 3, and those copies add up quadratically. Collect the pieces in a list and finish with a single join for linear work."
    },
    {
      "label": "O(n) while the string is short, O(n squared) only once it gets long",
      "feedback": "Close, and the slowdown really does only become visible at size. But the repeated copying is there from the first iteration: it is the constant factor that hides it early, not a change in shape."
    }
  ],
  "reveal": "Immutability is the thread running through this whole lesson. Nothing edits a string in place, which is why you must capture what a method returns, and why assembling text with join beats assembling it with +=."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "sort-returns-none",
  "prompt": "You write nums = nums.sort() and then print(nums). What prints?",
  "options": [
    {
      "label": "The sorted list",
      "feedback": "Tempting, because sort really did sort the list and the line reads like every other assignment you write. sort mutates in place and returns None, so the assignment overwrites your list with None."
    },
    {
      "label": "None",
      "correct": true,
      "feedback": "Right. Call nums.sort() on its own line to reorder in place, or write nums = sorted(nums) when you want a new list to bind to."
    },
    {
      "label": "The original list, still unsorted",
      "feedback": "Close, in that the sorting feels wasted here. It did happen, in place, and then the assignment threw the sorted list away and stored None over it."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "helper-mutates-callers-list",
  "prompt": "A helper is written as def add_zero(items): items.append(0) followed by return items. You call it with your list scores, then print scores. What do you see?",
  "options": [
    {
      "label": "scores unchanged, since the helper worked on its own copy",
      "feedback": "Tempting, because passing an argument feels like handing over a value for the function to keep. Python binds the parameter to the caller's object; no copy is made on the way in."
    },
    {
      "label": "scores with a 0 on the end",
      "correct": true,
      "feedback": "Right. There is one list and append mutated it. A helper that should not touch its input has to build and return a new list instead."
    },
    {
      "label": "An error, because a function cannot change a variable outside itself",
      "feedback": "Close, and rebinding really is local: writing items = [] inside the function would leave scores alone. Mutating the object the name points at is a different act, and it is visible everywhere."
    }
  ]
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "pop-front-is-linear",
  "prompt": "You drain a queue by calling items.pop(0) over and over until the list is empty. Why does that crawl on a large list?",
  "options": [
    {
      "label": "pop has to search the list for the item it should remove",
      "feedback": "Tempting, because remove(value) really does search. pop takes a position, so no searching happens; the cost is somewhere else."
    },
    {
      "label": "Every remaining element shifts one slot to the left on each pop",
      "correct": true,
      "feedback": "Right. A list is a contiguous array, so removing from the front is O(n), and doing it n times is O(n squared). Reach for collections.deque when you need a fast front."
    },
    {
      "label": "The backing array is resized and copied on every pop",
      "feedback": "Close, and resizing does happen now and then as a list shrinks. The dominant cost here is the shift of every later element, which happens on every single pop rather than occasionally."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "empty-braces-make-a-dict",
  "prompt": "You start a collection of ids you have already seen with seen = {} and then call seen.add(7). What happens?",
  "options": [
    {
      "label": "It works, and seen now holds 7",
      "feedback": "Tempting, because braces are exactly how you write a set literal like {1, 2}, so empty braces look like the empty set. Dicts claimed that spelling first: {} is an empty dict."
    },
    {
      "label": "It raises an AttributeError, because seen is an empty dict",
      "correct": true,
      "feedback": "Right. Dicts have no add method. Write seen = set() when you want an empty set."
    },
    {
      "label": "It works, and seen becomes the dict with key 7",
      "feedback": "Close, in that dicts do have ways to take a bare key, such as seen[7] = None or setdefault. add is simply not part of the dict interface, so the call raises instead."
    }
  ]
}
\`\`\`

Wrapping a list in \`set(...)\` is the idiomatic way to drop duplicates or count distinct values.

### When to use which

- \`tuple\`: a small fixed record whose fields will not change.
- \`set\`: you care about uniqueness or membership, not order or position.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "single-element-tuple-needs-a-comma",
  "prompt": "You write point = (3) and then call len(point). What happens?",
  "options": [
    {
      "label": "It returns 1, since the tuple holds one item",
      "feedback": "Tempting, because the parentheses look like tuple syntax and this is how you would write a one-item tuple in several other languages. What makes a tuple in Python is the comma, not the brackets."
    },
    {
      "label": "It raises a TypeError, because point is just the int 3",
      "correct": true,
      "feedback": "Right. A one-element tuple needs the trailing comma: (3,). Without it the brackets are only grouping, and ints have no length."
    },
    {
      "label": "It returns 3",
      "feedback": "Close if you read len as reporting the value it is given. len asks how many items a container holds, and an int is not a container at all."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "membership-cost-list-vs-set",
  "prompt": "A loop runs a million times and each pass evaluates x in c. Which container keeps that loop fast?",
  "options": [
    {
      "label": "Either one, since the line of code is identical",
      "feedback": "That is exactly the trap: it reads the same for both, which is why the wrong container hides so well in review. The work behind those characters is completely different."
    },
    {
      "label": "A set, because membership hashes straight to one slot",
      "correct": true,
      "feedback": "Right. x in a_set is O(1) on average while x in a_list is O(n), so over a million passes this is the difference between linear and quadratic."
    },
    {
      "label": "A list, because it can stop as soon as it finds a match",
      "feedback": "Tempting, and an early match really does cut the scan short. The misses are what cost you: a value that is absent is compared against every single element before the scan gives up."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "missing-key-raises",
  "prompt": "prices holds one pair, apple mapped to 3. What does prices['banana'] do?",
  "options": [
    {
      "label": "Returns None, since the key is not there",
      "feedback": "Tempting, because .get does exactly that and most languages hand back a null for a missing key. Bracket access is the strict form, and strict means it raises."
    },
    {
      "label": "Raises a KeyError",
      "correct": true,
      "feedback": "Right. Use .get(key, default) when absence is expected and you want a fallback instead of a crash."
    },
    {
      "label": "Returns 0",
      "feedback": "Close to what you usually want when counting, which is why .get(key, 0) is such a common pattern. You have to ask for that fallback though: d[key] never invents one."
    },
    {
      "label": "Adds banana to the dict with an empty value",
      "feedback": "Tempting, because assignment does create a key on the fly and setdefault really does insert. Reading is not writing: a plain lookup never modifies the dict."
    }
  ]
}
\`\`\`

Index a key with \`d[key]\`, but a missing key raises \`KeyError\`. Reach for \`.get(key, default)\` when the key might be absent and you want a fallback instead of a crash:

\`\`\`python
prices = {"apple": 3, "pear": 2}
prices["apple"]            # 3
prices.get("banana", 0)    # 0, the default, because "banana" is absent
prices["plum"] = 4         # bracket assignment adds a new pair
prices["apple"] = 5        # the same syntax updates an existing key
\`\`\`

That \`.get(name, 0)\` pattern is exactly what the \`lookup\` exercise needs.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "in-tests-keys-not-values",
  "prompt": "prices maps apple to 3 and pear to 2. What does the expression 3 in prices report?",
  "options": [
    {
      "label": "True, since 3 is one of the prices",
      "feedback": "Tempting, because 3 is very clearly in there and iterating a list of the values would find it. The in operator on a dict looks only at keys."
    },
    {
      "label": "False",
      "correct": true,
      "feedback": "Right. in tests keys and never values. Write 3 in prices.values() when the value is what you actually mean."
    },
    {
      "label": "It raises a TypeError, since 3 is not a string like the other keys",
      "feedback": "Close, in that mixing key types feels like it should bother something. A dict is happy to be asked about any hashable key; it simply reports that this one is not present."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "merge-conflict-winner",
  "prompt": "Two dicts both hold the key x, the first mapping it to 1 and the second to 9. You merge them in that order. What is the merged result?",
  "options": [
    {
      "label": "x maps to 1, since that value was already there",
      "feedback": "Tempting, because a first-writer-wins rule would protect existing data, and some merge helpers do work that way. A merge is just repeated assignment, and a later assignment overwrites an earlier one."
    },
    {
      "label": "x maps to 9",
      "correct": true,
      "feedback": "Right. The right-hand dict wins, because each key is assigned in order and the last write stands. It is the same rule that makes d[key] = value overwrite silently."
    },
    {
      "label": "x maps to both values, kept as a list",
      "feedback": "Close to what you would want for grouping, and a defaultdict(list) would build exactly that. A plain dict stores one value per key, so one of the two has to lose."
    }
  ]
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "equal-lists-are-different-objects",
  "prompt": "You build a = [1, 2, 3] on one line and b = [1, 2, 3] on the next. What do a == b and a is b report?",
  "options": [
    {
      "label": "Both True, since the lists are the same",
      "feedback": "Tempting, because in everyday speech those lists are the same. They are two separate objects built at two different moments, so identity differs even where contents match."
    },
    {
      "label": "a == b is True and a is b is False",
      "correct": true,
      "feedback": "Right. == compares what is inside the boxes, is compares which box. Two literals mean two lists, no matter what they hold."
    },
    {
      "label": "Both False",
      "feedback": "Close, in that you have identity right. But == asks the list to compare itself element by element, and element by element these two match exactly."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "eq-none-can-be-overridden",
  "prompt": "Your function starts with if value == None: return 0. One day it is handed a NumPy array. What goes wrong?",
  "options": [
    {
      "label": "Nothing, == None behaves the same for every type",
      "feedback": "Tempting, because it does behave the same for every type you have used so far, which is exactly why this line survives code review. == calls the object's own __eq__, and a class may define that however it likes."
    },
    {
      "label": "The comparison returns an array of booleans, and the if then raises",
      "correct": true,
      "feedback": "Right. NumPy compares elementwise, so you get an array back, and asking an array for a single truth value raises a ValueError. No class can redefine what is None does."
    },
    {
      "label": "It quietly returns 0 for every array",
      "feedback": "Close, and a silent wrong answer would honestly be the worse outcome. Here it fails loudly: the if cannot reduce an array of booleans down to one True or False."
    }
  ]
}
\`\`\`

### Why \`== None\` can bite you

\`==\` runs the object's own \`__eq__\`. A NumPy array, for instance, defines \`==\` to compare elementwise:

\`\`\`python
import numpy as np
arr = np.array([1, 2, 3])
arr == None            # array([False, False, False]), not a plain bool
\`\`\`

Now \`if arr == None:\` raises a \`ValueError\` about the truth value of an array being ambiguous. Writing \`arr is None\` sidesteps all of that: it is a pure identity check that no class can redefine, and it is exactly what \`is_missing(value)\` should use.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "is-on-large-ints",
  "prompt": "x = 1000 and y = 1000 are written on two separate lines. What does x is y report?",
  "options": [
    {
      "label": "True, because equal numbers are the same object",
      "feedback": "Tempting, because it really is True for small integers: CPython caches -5 through 256, so a quick experiment with 5 seems to prove the rule. Step outside that cached range and the guarantee disappears."
    },
    {
      "label": "It depends on the interpreter, so you cannot rely on it either way",
      "correct": true,
      "feedback": "Right. Whether two equal ints share identity is a CPython implementation detail. Use == for values and save is for None."
    },
    {
      "label": "False, always",
      "feedback": "Close, and it is the likelier outcome for this particular pair. It is not a rule you can lean on though: the same two values written inside one function body may well be True."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "shares-or-copies",
  "prompt": "For each line, does the new name end up on the same object, or is a second object created?",
  "buckets": ["Both names land on one object", "A second object is created"],
  "items": [
    {
      "label": "b = a",
      "bucket": "Both names land on one object",
      "feedback": "Assignment binds another name to the same object. Nothing is copied, ever."
    },
    {
      "label": "b = a[:]",
      "bucket": "A second object is created",
      "feedback": "A full slice builds a new outer list. It is shallow, so the items inside are still shared."
    },
    {
      "label": "b = list(a)",
      "bucket": "A second object is created",
      "feedback": "Same result as a[:]: a new list built from the same items."
    },
    {
      "label": "b = a.copy()",
      "bucket": "A second object is created",
      "feedback": "The explicit shallow copy, and the clearest of the three to read."
    },
    {
      "label": "Passing a to a function whose parameter is named items",
      "bucket": "Both names land on one object",
      "feedback": "An argument binds the parameter to the caller's object. That is why a helper can mutate your list out from under you."
    }
  ]
}
\`\`\`

### Copy on purpose: shallow vs deep

When you genuinely need a separate copy, do it deliberately. A slice \`a[:]\` or \`list(a)\` makes a shallow copy: a new outer list holding the *same* inner objects.

\`\`\`python
c = a[:]         # new outer list
c.append(99)
print(a is c)    # False, independent outer lists
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "shallow-copy-shares-inner-lists",
  "prompt": "grid = [[1, 2], [3, 4]]. You take copy = grid[:] and then set copy[0][0] = 99. What is grid[0][0] now?",
  "options": [
    {
      "label": "1, because grid[:] made a copy",
      "feedback": "Tempting, and grid[:] really did make a new outer list, so appending a row to copy would leave grid alone. The slice copied the arrows, not the inner lists they point at."
    },
    {
      "label": "99",
      "correct": true,
      "feedback": "Right. A slice is a shallow copy: the new outer list holds the very same inner list objects. Use copy.deepcopy when you need the nesting copied too."
    },
    {
      "label": "It raises an error, since copy is a separate list",
      "feedback": "Close, in that you expect the copy to be sealed off from the original. It is an ordinary list, and the sharing stays invisible right up until something mutates an inner item."
    }
  ]
}
\`\`\`

For nested structures, a shallow copy still shares the inner objects, so editing \`grid[0][0]\` through the copy changes the original. Use \`copy.deepcopy\` when you need full independence:

\`\`\`python
import copy
deep = copy.deepcopy(grid)   # inner lists copied too
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "default-list-shared-across-calls",
  "prompt": "A logging helper is defined as def record(event, seen=[]). It appends the event to seen and returns it. Two unrelated parts of your program call record(...) without passing seen. What do those two callers share?",
  "options": [
    {
      "label": "Nothing, each call gets its own empty list",
      "feedback": "Tempting, because the signature reads like a promise of a fresh list per call, and that is what almost everyone assumes on first reading. The default list is created once, when def runs."
    },
    {
      "label": "One list, so each caller sees the other's events",
      "correct": true,
      "feedback": "Right. The default object is built at definition time and stored on the function, so every call that omits the argument mutates that same list."
    },
    {
      "label": "One list, but Python resets it each time the function returns",
      "feedback": "Close, in that a reset is exactly what you would need for the intuitive behavior. Nothing resets it: the list lives as long as the function object does."
    }
  ]
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "why-the-none-sentinel-works",
  "prompt": "Why does bucket=None, plus an if that assigns bucket = [] inside the body, actually fix the trap?",
  "options": [
    {
      "label": "Because None is immutable, so nothing can accumulate in it",
      "feedback": "Half the story, and it is true that the default itself can no longer be mutated. What produces a fresh list on each call is that the [] now sits in the body, and the body runs every call."
    },
    {
      "label": "Because the [] now runs inside the body, once per call",
      "correct": true,
      "feedback": "Right. Default expressions are evaluated once at def time; body expressions are evaluated on every call. Moving the [] into the body is the entire fix."
    },
    {
      "label": "Because Python special-cases a None default and rebuilds it for you",
      "feedback": "Tempting, since the pattern is so standard that it feels like a language feature. Python has no special case here: None is just an ordinary sentinel value that your own code checks for."
    }
  ],
  "reveal": "The general rule is worth more than the pattern: a default argument is evaluated once, at definition time, so anything mutable in a signature is shared state. Same reasoning applies to a default dict, set, or object."
}
\`\`\`

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
    ["Add one item", "O(1) amortized (append)", "O(1) average (add)", "O(1) average"],
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "seen-list-makes-it-quadratic",
  "prompt": "You keep a seen collection and run one x in seen check per item, over n items. What is the total cost if seen is a list?",
  "options": [
    {
      "label": "O(n), because you do exactly one check per item",
      "feedback": "Tempting, because the loop really does run n times and counting iterations is the usual first move. Each check is itself a scan, so the cost per item is not constant."
    },
    {
      "label": "O(n squared)",
      "correct": true,
      "feedback": "Right. n checks, each scanning up to n elements. Swapping the list for a set makes every check flat and drops the whole loop to O(n)."
    },
    {
      "label": "O(n log n), since the list stays sorted as it grows",
      "feedback": "Close to what a sorted structure with binary search would give you, and that is a real alternative worth naming. A plain list is not kept sorted, and in does a straight linear scan rather than a binary one."
    }
  ]
}
\`\`\`

That loop is \`O(n)\`: one pass, each check flat. The list version, \`if x in seen\` against a growing list, would be \`O(n²)\`.

### Pitfalls

- \`set(nums)\` throws away order. It can tell you THAT a value repeated, but not WHICH one repeated first. For \`first_repeated\` you must scan left to right and test a growing \`seen\` set, returning the first \`x\` that is already inside it.
\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "unhashable-list-in-a-set",
  "prompt": "You try to build a set holding one list, written as seen = {[1, 2]}. What happens?",
  "options": [
    {
      "label": "It works, and seen holds that one list",
      "feedback": "Tempting, because the syntax is perfectly well formed and a set looks like it should accept any value. A set has to hash each element to place it, and a list has no stable hash because its contents can change."
    },
    {
      "label": "It raises a TypeError about an unhashable type",
      "correct": true,
      "feedback": "Right. Mutable objects cannot be set elements or dict keys. Convert to a tuple first, and a set of tuples works fine."
    },
    {
      "label": "It works, but membership tests on that set fall back to O(n)",
      "feedback": "Close, and quietly degrading to a scan would be one reasonable design. Python refuses instead: it rejects the unhashable element outright rather than silently getting slower."
    }
  ]
}
\`\`\`

- Set and dict elements must be hashable, which in practice means immutable. \`{[1, 2]}\` raises \`TypeError: unhashable type: 'list'\`. Numbers, strings, and tuples are fine; lists, dicts, and sets are not.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "list-or-set-for-the-job",
  "prompt": "Sort each job by the container that fits it better.",
  "buckets": ["A list fits better", "A set fits better"],
  "items": [
    {
      "label": "Keep the rows of a report in the order they were read",
      "bucket": "A list fits better",
      "feedback": "Sets have no order at all, so anything ordered or positional stays a list."
    },
    {
      "label": "Answer 'have I already processed this id?' a million times",
      "bucket": "A set fits better",
      "feedback": "Repeated membership is the reason sets exist: each check is flat instead of a scan."
    },
    {
      "label": "Count how many distinct addresses appeared in a log",
      "bucket": "A set fits better",
      "feedback": "Duplicates collapse on the way in, so the length of the set is the distinct count."
    },
    {
      "label": "Collect coordinate pairs that arrive as lists like [1, 2]",
      "bucket": "A list fits better",
      "feedback": "Set elements must be hashable and a list is not. Convert the pairs to tuples first if you do want a set."
    },
    {
      "label": "Return the top three results to a caller, in rank order",
      "bucket": "A list fits better",
      "feedback": "Ranking is order, and you cannot index a set to pull the first three anyway."
    }
  ],
  "reveal": "Membership speed is one axis of the choice, not the whole choice. A set costs extra memory, keeps no order, supports no indexing, and refuses unhashable values, which is the honest answer to 'why not always use a set?'"
}
\`\`\`

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

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Instead of", "Write", "Each turn gives you"],
  "rows": [
    ["for i in range(len(xs)): xs[i]", "for x in xs", "the value"],
    ["for i in range(len(xs)): i, xs[i]", "for i, x in enumerate(xs)", "the position and the value"],
    ["for i in range(len(a)): a[i], b[i]", "for x, y in zip(a, b)", "one item from each, in lockstep"],
    ["for k in d: k, d[k]", "for k, v in d.items()", "the key and its value"]
  ],
  "highlightCols": ["Write"],
  "caption": "Every left-hand form works and every one re-derives something Python already had. zip is also the safer choice for the third row: it stops at the SHORTER sequence instead of raising IndexError when the lengths differ."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "zip-truncates-silently",
  "prompt": "A nightly report zips 300 names with 300 scores. One night the scores file arrives with only 299 rows. What does the report look like?",
  "options": [
    {
      "label": "The job fails with an error about mismatched lengths",
      "feedback": "Tempting, because a mismatch really is a data bug and you would want to hear about it loudly. Plain zip stops at the shorter input without a word. Pass strict=True on Python 3.10 and later to get that error."
    },
    {
      "label": "It runs fine and one person is silently missing from the report",
      "correct": true,
      "feedback": "Right. zip truncates to the shortest input, so a lost record looks like a slightly short report rather than a crash. Assert the lengths match, or use strict=True."
    },
    {
      "label": "The last person appears with a score of None",
      "feedback": "Close, and that is exactly what itertools.zip_longest does. Plain zip truncates rather than padding, so the row disappears entirely instead of showing up empty."
    }
  ]
}
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
\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "enumerate-yields-tuples",
  "prompt": "What does list(enumerate(['a'])) give you?",
  "options": [
    {
      "label": "A list holding the list [0, 'a']",
      "feedback": "Tempting, because you asked for a list and the pair prints with brackets around it in your head. enumerate yields tuples, so the inner pair is (0, 'a') and not [0, 'a']."
    },
    {
      "label": "A list holding the tuple (0, 'a')",
      "correct": true,
      "feedback": "Right. The pairs are tuples. Convert them explicitly when a caller expects lists, which is exactly what the Apply exercise asks you to build."
    },
    {
      "label": "A list holding just 'a'",
      "feedback": "Close if you expect list() to simply collect the values it is handed. enumerate wraps each value together with its position, so what gets collected is the pairs, not the bare items."
    }
  ]
}
\`\`\`

- **\`enumerate\` yields tuples, not lists.** \`list(enumerate(["a"]))\` is \`[(0, "a")]\`. If the caller expects \`[0, "a"]\`, convert explicitly.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "zip-iterator-exhausts",
  "prompt": "z = zip(names, scores). You call list(z), get your pairs, then call list(z) again. What does the second call return?",
  "options": [
    {
      "label": "The same pairs again",
      "feedback": "Tempting, because z still exists, nothing was reassigned, and lists behave this way. In Python 3 zip returns a one-pass iterator, and that first list() already walked it to the end."
    },
    {
      "label": "An empty list",
      "correct": true,
      "feedback": "Right. The iterator is exhausted after one pass. Store list(zip(a, b)) once if you need to go over the result more than one time."
    },
    {
      "label": "A TypeError, since z has already been consumed",
      "feedback": "Close, in that reusing something spent usually does fail loudly. An exhausted iterator is not an error state: it simply reports that there is nothing left."
    }
  ],
  "reveal": "enumerate and zip are lazy for a reason: they pull one item at a time and use O(1) extra memory no matter how large the input. The price of that is a single pass."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "base-case-that-skips-zero",
  "prompt": "A factorial uses if n == 1: return 1 as its base case. What happens on factorial(0)?",
  "options": [
    {
      "label": "It returns 1, since 0 is close enough to the base case",
      "feedback": "Tempting, because 0 factorial really is 1 and the function looks like it covers the small cases. The check is an exact match against 1, and 0 does not match it."
    },
    {
      "label": "It recurses until Python raises a RecursionError",
      "correct": true,
      "feedback": "Right. 0 falls through to 0 times factorial(-1), then -1, then -2, moving further from the base case every step. Write if n <= 1 so both 0 and 1 stop."
    },
    {
      "label": "It returns 0, since the first multiplication is 0 times something",
      "feedback": "Close, and the multiplication really would be 0 times whatever came back. Nothing ever comes back: the recursive call has to finish before the multiply can happen at all."
    }
  ]
}
\`\`\`

**A base case that skips 0.** Writing \`if n == 1\` looks fine until you call \`factorial(0)\`: it does not match, so you compute \`0 * factorial(-1) * factorial(-2) ...\` forever, straight to \`RecursionError\`. Use \`if n <= 1\` so both \`0\` and \`1\` hit the base case and return \`1\` directly. That is exactly why the exercise pins \`factorial(0)\` to \`1\`.

**Not shrinking toward the base.** The recursive call must move closer to the base case every time. A \`factorial(n)\` that calls \`factorial(n)\` never ends.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "trusting-the-recursive-call",
  "prompt": "While summing a nested list, you reach an element that is itself a list. What should the recursive case do with it?",
  "options": [
    {
      "label": "Loop over that inner list and add up its numbers",
      "feedback": "Tempting, and it works perfectly for one level of nesting, which is exactly why this bug survives a quick test. An element two levels down would still arrive as a list and break the addition."
    },
    {
      "label": "Call the same function on it and add whatever comes back",
      "correct": true,
      "feedback": "Right. Trust the call to handle any depth. One isinstance check plus one recursive call is what lets a single function work on a shape you have never seen."
    },
    {
      "label": "Convert it to a number with sum() and add that",
      "feedback": "Close, and sum() would do the job on a flat inner list. It raises the moment that inner list contains a list of its own, which is precisely the case recursion exists to handle."
    }
  ]
}
\`\`\`

For the nested-sum exercise, your base case is a plain number and your recursive case is a list. Check which one you have with \`isinstance(x, list)\`: if it is a list, recurse into it and add the pieces; otherwise it is a number, so add it directly. That single \`isinstance\` check is what lets one function reach any depth without knowing the shape in advance.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "recursion-costs-stack-space",
  "prompt": "A recursive sum over a list passes your 10-item test and then dies on 10000 real records. What ran out?",
  "options": [
    {
      "label": "Time, since recursion is slower than a loop and the job timed out",
      "feedback": "Tempting, and a recursive call really does cost more than a loop iteration. The failure here is not slowness: it happens at a fixed depth, whether the machine is fast or slow."
    },
    {
      "label": "The call stack, since every pending call holds a frame and CPython stops near 1000",
      "correct": true,
      "feedback": "Right. Recursion uses O(n) call-stack space where a loop uses O(1), and past the limit Python raises RecursionError. Check the expected depth before you reach for recursion."
    },
    {
      "label": "Memory for the list itself, since 10000 records is a lot to hold",
      "feedback": "Close, in that running out of memory is the right family of answer. It is the call stack that fills, not the heap: the same list handled by a loop would be perfectly fine."
    }
  ],
  "reveal": "Recursion buys clarity on data whose depth you do not know in advance. It does not buy free memory, which is why tree and graph problems usually call out the expected depth explicitly."
}
\`\`\`

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
        "Run your first program, show output, return a computed value, store values in variables, and set up an environment you can install real packages into.",
      lessons: [helloLesson, temperatureLesson, variablesLesson, environmentsLesson],
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
        syntaxShorthandsLesson,
        loopsLesson,
        loopIdiomsLesson,
        functionsLesson,
        debuggingLesson,
        referencesCopyLesson,
        complexityChoiceLesson,
        recursionLesson,
      ],
    },
  ],
}

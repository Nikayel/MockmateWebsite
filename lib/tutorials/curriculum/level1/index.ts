/**
 * Level 1 — Foundations (single-file). Reference-style basics.
 *
 * This file currently carries ONE fully-authored sample lesson (`py-l1-temperature`) that
 * proves the single-file Teach → Apply → Practice loop end-to-end. It is the canonical example
 * Agent 2 follows when authoring the rest of Level 1.
 *
 * Single-file authoring contract (verified against lib/piston.ts):
 *  - The learner implements a NAMED function; the FIRST `def` in their code is the graded one,
 *    so the prompt states the exact signature and the starter seeds that single def.
 *  - Each `testCases[i].input` is a keyed object; values are passed POSITIONALLY in key order,
 *    so the key order must match the function's parameter order.
 *  - Parameter names `root/tree/node/p/q/t1/t2/left/right/subroot` (→ TreeNode) and
 *    `head/list/l1/l2` (→ ListNode) are auto-coerced by the executor — avoid them for plain
 *    numbers/lists. This lesson uses `f` and `c`, which are safe.
 *  - Numeric `expected` values are compared with tolerance, so float results (e.g. 37.0) match
 *    integer expectations (37).
 */
import type { PythonLevel } from "../../types"

const temperatureLesson: PythonLevel["modules"][number]["lessons"][number] = {
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
      title: "Python fundamentals",
      description: "The core building blocks every Python program is made of.",
      lessons: [temperatureLesson],
    },
  ],
}

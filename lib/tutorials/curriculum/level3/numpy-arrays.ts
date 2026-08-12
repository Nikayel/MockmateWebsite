import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// Optional data track. numpy and pandas are NOT bundled into the browser Pyodide
// build this course runs on (verified: the worker never calls `loadPackage`, and
// `python_stdlib.zip` carries neither), so both lessons teach the real library in
// prose and grade a pure-Python model of the same mechanic.
// ───────────────────────────────────────────────────────────────────────────

const VECTOR_README = `# Build the array model

The analytics job dropped every fractional reading last quarter and nobody could say why until
somebody printed the dtype. Build the model that explains it. Implement \`Vector\` in
\`nparray/vector.py\`, a minimal fixed-dtype array.

**\`__init__(self, values, dtype=None)\`**

- When \`dtype\` is \`None\`, infer it: \`"float64"\` if any value is a \`float\`, otherwise \`"int64"\`.
- Store it on \`self.dtype\`, then cast **every** value to that dtype into \`self.values\`.

\`\`\`python
Vector([1, 2, 3]).dtype        # "int64",   values [1, 2, 3]
Vector([1, 2, 3.5]).dtype      # "float64", values [1.0, 2.0, 3.5]
Vector([1.5, 2.9], dtype="int64").values   # [1, 2], the fraction is gone
\`\`\`

**\`_combine(self, other, op)\`** does the elementwise work for both operators:

- If \`other\` is a \`Vector\`, the lengths must match. Raise \`ValueError\` when they do not, otherwise
  apply \`op\` pairwise.
- Otherwise \`other\` is a scalar: broadcast it across every element.
- Either way, return a **new** \`Vector\`. Never mutate \`self\`.

**\`sum(self)\`** returns the total of the values (\`0\` for an empty vector).

\`__add__\`, \`__mul__\`, \`__eq__\` and \`__repr__\` are already written for you. Some tests are hidden.
`

const VECTOR_STARTER = String.raw`class Vector:
    """A minimal fixed-dtype array: one dtype for the whole block of values."""

    def __init__(self, values, dtype=None):
        # TODO: infer the dtype when it is None, then cast every value to it.
        self.dtype = "int64"
        self.values = []

    def _combine(self, other, op):
        # TODO: elementwise when other is a Vector (raise ValueError on a length
        # mismatch), broadcast when it is a scalar. Return a new Vector.
        return Vector([])

    def sum(self):
        # TODO: return the total of self.values.
        return 0

    # ---- already written for you ----

    def __add__(self, other):
        return self._combine(other, lambda a, b: a + b)

    def __mul__(self, other):
        return self._combine(other, lambda a, b: a * b)

    def __eq__(self, other):
        return isinstance(other, Vector) and self.dtype == other.dtype and self.values == other.values

    def __repr__(self):
        return "Vector(" + repr(self.values) + ", dtype=" + repr(self.dtype) + ")"
`

const VECTOR_REFERENCE = String.raw`class Vector:
    """A minimal fixed-dtype array: one dtype for the whole block of values."""

    def __init__(self, values, dtype=None):
        if dtype is None:
            dtype = "float64" if any(isinstance(value, float) for value in values) else "int64"
        cast = float if dtype == "float64" else int
        self.dtype = dtype
        self.values = [cast(value) for value in values]

    def _combine(self, other, op):
        if isinstance(other, Vector):
            if len(other.values) != len(self.values):
                raise ValueError("operands could not be broadcast together")
            return Vector([op(a, b) for a, b in zip(self.values, other.values)])
        return Vector([op(value, other) for value in self.values])

    def sum(self):
        total = 0
        for value in self.values:
            total = total + value
        return total

    # ---- already written for you ----

    def __add__(self, other):
        return self._combine(other, lambda a, b: a + b)

    def __mul__(self, other):
        return self._combine(other, lambda a, b: a * b)

    def __eq__(self, other):
        return isinstance(other, Vector) and self.dtype == other.dtype and self.values == other.values

    def __repr__(self):
        return "Vector(" + repr(self.values) + ", dtype=" + repr(self.dtype) + ")"
`

const VECTOR_TEST = String.raw`from nparray.vector import Vector


def run_tests(record):
    def infers_int64_for_whole_numbers():
        vector = Vector([1, 2, 3])
        assert vector.dtype == "int64", f"got {vector.dtype!r}"
        assert vector.values == [1, 2, 3], f"got {vector.values!r}"

    def one_float_promotes_the_whole_array():
        vector = Vector([1, 2, 3.5])
        assert vector.dtype == "float64", f"got {vector.dtype!r}"
        assert vector.values == [1.0, 2.0, 3.5], f"got {vector.values!r}"

    def broadcasts_a_scalar():
        result = Vector([1, 2, 3]) * 2
        assert result.values == [2, 4, 6], f"got {result!r}"
        assert result.dtype == "int64", f"got {result.dtype!r}"

    def adds_elementwise():
        result = Vector([1, 2, 3]) + Vector([10, 20, 30])
        assert result.values == [11, 22, 33], f"got {result!r}"

    record("infers int64 for whole numbers", infers_int64_for_whole_numbers)
    record("one float promotes the whole array", one_float_promotes_the_whole_array)
    record("broadcasts a scalar", broadcasts_a_scalar)
    record("adds elementwise", adds_elementwise)
`

const VECTOR_TEST_HIDDEN = String.raw`from nparray.vector import Vector


def run_tests(record):
    def an_explicit_int_dtype_truncates():
        vector = Vector([1.5, 2.9], dtype="int64")
        assert vector.values == [1, 2], f"got {vector.values!r}"

    def mismatched_lengths_raise():
        try:
            Vector([1, 2, 3]) + Vector([1, 2])
            raised = False
        except ValueError:
            raised = True
        assert raised, "adding different lengths should raise ValueError"

    def sums_the_values():
        assert Vector([1, 2, 3]).sum() == 6
        assert Vector([]).sum() == 0

    def a_float_scalar_promotes_the_result():
        result = Vector([1, 2, 3]) * 0.5
        assert result.dtype == "float64", f"got {result.dtype!r}"
        assert result.values == [0.5, 1.0, 1.5], f"got {result.values!r}"

    record("an explicit int dtype truncates", an_explicit_int_dtype_truncates)
    record("mismatched lengths raise ValueError", mismatched_lengths_raise)
    record("sums the values", sums_the_values)
    record("a float scalar promotes the result", a_float_scalar_promotes_the_result)
`

export const numpyArraysLesson: PythonLesson = {
  id: "py-l3-numpy-arrays",
  title: "numpy: arrays, dtypes & whole-array operations",
  summary: "Why a fixed-dtype array beats a list of ints, and what that promise costs you.",
  estimatedMinutes: 18,
  difficulty: "medium",
  skills: ["data-structures", "performance", "type-coercion", "iteration"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Optional, and for whom

This module and the pandas lesson after it are a detour, not a step on the main path. If you are heading for backend, platform or general software work, the Level 3 spine you already finished is what interviews will ask about. If you are heading for data engineering, analytics or anything with a pipeline in the job description, these two are the vocabulary every one of those interviews assumes you have.

## A list of ints is not an array of ints

A Python list is a block of **pointers**. Each element points off to a full Python object somewhere else in memory, carrying a type pointer and a reference count around with it. That is why a list can hold an \`int\`, a \`str\` and a \`dict\` at once: every slot is the same size because every slot is just an address.

A numpy array is the opposite trade. It is one contiguous block of raw values, all the same type and all the same width. That is why it has a **dtype**, singular, for the entire array:

\`\`\`python
import numpy as np

a = np.array([1, 2, 3])       # dtype int64, shape (3,)
b = np.array([1, 2, 3.0])     # dtype float64: one float promotes them all
np.zeros(5)                   # five float64 zeros
np.arange(0, 10, 2)           # array([0, 2, 4, 6, 8])
\`\`\`

Everything good and everything annoying about numpy follows from that one decision.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "array-holds-one-dtype",
  "prompt": "You have arr = np.array([1, 2, 3]), so its dtype is int64. You then run arr[0] = 'hello'. What happens?",
  "options": [
    {
      "label": "The array switches to a mixed dtype and stores the string alongside the numbers.",
      "feedback": "Tempting, because that is exactly what a Python list does: a list slot holds a pointer, so any object at all fits in it. An array is one block of fixed-width int64 slots, and a string has nowhere to go in one."
    },
    {
      "label": "It raises, because 'hello' cannot be converted to int64.",
      "correct": true,
      "feedback": "Right. The dtype is a promise about every slot in the block, and numpy enforces it on assignment rather than quietly widening the array. That promise is exactly what makes whole-array operations fast."
    },
    {
      "label": "It stores the length of the string, since numpy converts whatever it is handed.",
      "feedback": "Tempting, because numpy really does convert a lot of things on the way in, so it seems fair to expect it to find some numeric reading. It converts only where a conversion is actually defined, and arbitrary text has no int64 reading."
    }
  ]
}
\`\`\`

## Vectorized operations

Because the whole array shares a dtype, one operation can apply to all of it at once. No loop in your code, and no loop in Python at all:

\`\`\`python
a * 2         # array([2, 4, 6])   scalar broadcast over every element
a + a         # array([2, 4, 6])   elementwise
a.sum()       # 6
a.mean()      # 2.0
a[a > 1]      # array([2, 3])      a boolean mask selects
\`\`\`

That last line is the pattern the pandas lesson leans on: \`a > 1\` builds an array of booleans, and indexing with it keeps the positions that are \`True\`.

## Why the vectorized sum wins

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "why-vectorized-sum-wins",
  "prompt": "Summing a million numbers with arr.sum() is far faster than a Python for loop over the same values in a list. What is the main reason?",
  "options": [
    {
      "label": "numpy spreads the work across every CPU core.",
      "feedback": "Tempting, because parallelism is the usual story behind a big speedup, and numpy really does hand some heavy operations to threaded libraries. A plain sum runs on one core: the win is in what each step costs, not in how many run at once."
    },
    {
      "label": "The values sit in one contiguous typed block, so the loop runs once in C with no Python object per element.",
      "correct": true,
      "feedback": "Right. A list holds pointers to individual int objects, so a Python loop dereferences, unboxes and dispatches for every single element. An array is raw bytes of known width, so the loop is a tight C scan the CPU can prefetch through."
    },
    {
      "label": "The total is precomputed when the array is built and simply read back.",
      "feedback": "Tempting, because caching a result is a real optimisation and it would neatly explain a large speedup. Nothing is precomputed here: every call genuinely visits every element, just far more cheaply per element."
    }
  ]
}
\`\`\`

Count the work for a million values. The Python loop dereferences a pointer, unboxes an \`int\` object, dispatches \`__add__\`, allocates a result object, and does it again, a million times. \`arr.sum()\` walks a million adjacent 8-byte integers in a single compiled loop with none of that per-element overhead. The usual result is one to two orders of magnitude, and it holds for \`* 2\`, \`+\`, comparisons and every other whole-array operation.

The rule this gives you: **if you are writing a Python \`for\` loop over a numpy array, you have probably lost the reason you reached for numpy.**

## Broadcasting

A scalar stretches to fit an array, which is why \`a * 2\` works at all. The general rule compares shapes from the right: two dimensions are compatible when they are equal, or when one of them is \`1\`, and a length-1 dimension is stretched to match.

\`\`\`python
np.array([[1], [2], [3]]) + np.array([[10, 20, 30, 40]])
# shape (3, 1) + shape (1, 4) -> shape (3, 4)
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "broadcasting-row-and-column",
  "prompt": "You add an array of shape (3, 1) to an array of shape (1, 4). What comes back?",
  "options": [
    {
      "label": "An error, because the two shapes are not the same.",
      "feedback": "Tempting, because mismatched shapes often do raise, and shape (3,) plus shape (2,) really is an error. The rule compares shapes from the right and lets a dimension of length 1 stretch, so these two are compatible."
    },
    {
      "label": "An array of shape (3, 4), with each side stretched along its length-1 dimension.",
      "correct": true,
      "feedback": "Right. The column repeats across 4 columns, the row repeats down 3 rows, and every pair is added. This is how you build a grid, an outer product or a pairwise distance matrix without writing a single loop."
    },
    {
      "label": "An array of shape (3, 1), because the left operand decides the result shape.",
      "feedback": "Tempting, because plenty of operations are left-biased and really do keep the first operand's shape. Broadcasting is symmetric: neither side wins, and both get stretched out to the combined shape."
    }
  ]
}
\`\`\`

## The cost of a fixed dtype

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "int-array-truncates-a-float",
  "prompt": "arr = np.array([1, 2, 3]) has dtype int64. You run arr[0] = 3.7 and then print arr. What is the first element?",
  "options": [
    {
      "label": "3.7, because assigning into a slot simply replaces what was there.",
      "feedback": "Tempting, because that is precisely how assigning into a Python list behaves, and nothing in the line hints at a conversion. The slot is a fixed-width int64, so the value has to be converted before it can be stored at all."
    },
    {
      "label": "3, because the float is truncated to fit the int64 dtype.",
      "correct": true,
      "feedback": "Right, and nothing warns you. This is the quiet twin of the string case: a value that cannot be converted raises, but a value that can is cast on the way in and the fractional part is simply gone."
    },
    {
      "label": "3.7, and the whole array is promoted to float64 to hold it.",
      "feedback": "Tempting, because promotion is real: building an array from a mix of ints and one float genuinely does give you float64. Promotion happens when the array is CREATED, not when you assign into one that already exists."
    }
  ],
  "reveal": "Every dtype surprise in a data pipeline is one of these two. An impossible conversion raises and you find it in seconds. A possible one is applied silently, and you find it a quarter later when the totals are slightly wrong. Print .dtype the moment a number looks off."
}
\`\`\`

The same edge shows up in width. \`np.array([100, 100], dtype=np.int8) + 100\` wraps around instead of growing, because an \`int8\` slot cannot hold 200. Python's own \`int\` has no such limit, so this is a habit you have to acquire rather than one you already have.

## What runs where

\`numpy\` is not bundled into the Python build that powers this browser sandbox, so \`import numpy\` fails here. In a real environment it is one \`pip install numpy\` (or \`uv add numpy\`) away, using the setup from "Running Python & installing packages", and every snippet above runs as written. The exercises below build the same mechanics by hand over ordinary lists, so the model you take to the terminal is the right one.

**Interview nuance:** "why is numpy faster than a list?" is a memory-layout question wearing a library costume. The answer is not "it is written in C". Plenty of slow things are written in C. The answer is that the data is one contiguous typed block, so a single compiled loop touches adjacent bytes with no per-element Python object to unbox and no dynamic dispatch per step. Then name the price: the dtype is fixed, so an incompatible value raises and a convertible one is silently cast.`,
    demoCode: `# numpy is not bundled into this browser sandbox, so this demo builds the same
# mechanic by hand: one operation applied across a whole sequence.
def scale(values, factor):
    return [value * factor for value in values]


readings = [1, 2, 3, 4]
print("scaled:", scale(readings, 2))
print("mask:  ", [value for value in readings if value > 2])
print("sum:   ", sum(readings))

# The fixed-dtype cost, by hand: storing a float in an int column truncates it.
print("int column stores 3.7 as", int(3.7))`,
  },
  apply: {
    id: "py-l3-numpy-arrays-apply",
    executionMode: "single-file",
    prompt: `Warm-up: implement \`broadcast_add(values, addend)\`, the pure-Python version of what \`arr + other\`
does in numpy.

When \`addend\` is a list, add the two sequences elementwise. When it is a single number, broadcast it
across every element. Return a new list either way: \`([1, 2, 3], 10)\` gives \`[11, 12, 13]\`, and
\`([1, 2, 3], [10, 20, 30])\` gives \`[11, 22, 33]\`.`,
    starterCode: `def broadcast_add(values, addend):
    # A list addend adds elementwise; a number broadcasts across every element.
    pass`,
    hints: [
      "`isinstance(addend, list)` tells the two cases apart.",
      "For the elementwise case, `zip(values, addend)` pairs them up position by position.",
      "For the scalar case, one comprehension over `values` is enough: `[value + addend for value in values]`.",
    ],
    referenceSolution: `def broadcast_add(values, addend):
    if isinstance(addend, list):
        return [value + other for value, other in zip(values, addend)]
    return [value + addend for value in values]`,
    testCases: [
      {
        input: { values: [1, 2, 3], addend: 10 },
        expected: [11, 12, 13],
        description: "a scalar broadcasts",
      },
      {
        input: { values: [1, 2, 3], addend: [10, 20, 30] },
        expected: [11, 22, 33],
        description: "two sequences add elementwise",
      },
      { input: { values: [], addend: 5 }, expected: [], description: "an empty array stays empty" },
      {
        input: { values: [7, -7, 0], addend: 7 },
        expected: [14, 0, 7],
        description: "negatives and zero broadcast the same way",
      },
    ],
  },
  practice: {
    id: "py-l3-numpy-arrays-practice",
    executionMode: "workspace",
    prompt: `Your team's analytics job dropped every fractional reading last quarter, and nobody could say
why until somebody printed the dtype. Build the model that explains it: implement \`Vector\` in
\`nparray/vector.py\` so it infers a single dtype and casts every value to it, combines elementwise
with another \`Vector\` (raising \`ValueError\` on a length mismatch), broadcasts a scalar, and sums its
values. The operators are already written for you. Some tests are hidden.`,
    starterCode: "",
    hints: [
      '`any(isinstance(value, float) for value in values)` decides between `"float64"` and `"int64"`.',
      "Pick the cast function once (`float` or `int`), then apply it in one comprehension over `values`.",
      "In `_combine`, `isinstance(other, Vector)` separates the elementwise case from the broadcast case. Both return a new `Vector`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "nparray/vector.py",
      editableFilePaths: ["nparray/vector.py"],
      visibleTestPaths: ["tests/test_vector.py"],
      hiddenTestPaths: ["tests/test_vector_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: VECTOR_README },
        { path: "nparray/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "nparray/vector.py",
          role: "editable",
          language: "python",
          content: VECTOR_STARTER,
          description: "Implement Vector here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_vector.py",
          role: "test",
          language: "python",
          content: VECTOR_TEST,
          description: "Visible vector tests",
        },
        {
          path: "tests/test_vector_hidden.py",
          role: "test",
          language: "python",
          content: VECTOR_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_vector", label: "visible vector" },
            { module: "test_vector_hidden", label: "hidden vector" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "nparray/vector.py",
          role: "editable",
          language: "python",
          content: VECTOR_REFERENCE,
        },
      ],
    },
  },
}

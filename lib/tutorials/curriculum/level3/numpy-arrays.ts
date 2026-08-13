import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// Optional data track. numpy and pandas are NOT bundled into the browser Pyodide
// build this course runs on (verified: the worker never calls `loadPackage`, and
// `python_stdlib.zip` carries neither), so both lessons teach the real library in
// prose and grade a pure-Python model of the same mechanic.
// ───────────────────────────────────────────────────────────────────────────

// Time budget behind `estimatedMinutes` (counted, not guessed): teach 7 (about 1,100 prose words,
// four checks), apply 8 (a 14-line prompt, a 9-line reference), practice 30 (47 README lines plus
// ~80 lines of starters and visible tests to read, 53 lines to write across two modules, 19
// recorded tests). Lesson total 45 = 7 + 8 + 30.
//
// Apply used to be a 1D `broadcast_add`, four lines against a 53-line practice reference (13.3x),
// and it never touched a column. It is now a column reduction over a real table with gaps in it,
// which is the axis decision and the missing-value rule the practice is built on. It is still a
// different function from every one of the practice's seven.
//
// ── Practice workspace: a 2D measurement table, modelled over lists of lists ──
// numpy is unavailable here (see the note above), so the practice grades the mechanics
// of array programming (shape checks, per-column broadcasting, axis=0 vs axis=1
// aggregation, boolean masks, missing values that keep the shape) by hand.

const TABLE_README = buildBrief({
  lesson: "py-l3-numpy-arrays",
  kind: "ticket",
  headline: "Repair the calibration report",
  body: `The overnight calibration report has been wrong since a sensor started dropping readings. The old
job deleted any row containing a gap, so the report silently shrank and the per-column totals came
out low. The rewrite keeps every row and fills the gaps instead.

A **table** is a list of rows, every row the same length. A gap is \`None\`. All graded numbers are
integers.

## \`readings/transform.py\`

**\`check_rectangular(table)\`** returns the shape as \`(rows, columns)\`. An empty table is \`(0, 0)\`.
If the rows are not all the same length, raise \`ValueError\`.

**\`fill_missing(table)\`** returns a new table with every \`None\` replaced by the floor of the mean of
the values that column actually has, using \`//\`. A column with no values at all fills with \`0\`. The
shape never changes and no row is dropped.

**\`apply_offsets(table, offsets)\`** adds a per-column calibration offset to every row. \`offsets\` is
one row of numbers, one entry per column, and it applies down all the rows. Raise \`ValueError\` if it
does not have one entry per column.

\`\`\`python
fill_missing([[10, 20], [30, None], [50, 60]])   # [[10, 20], [30, 40], [50, 60]]
apply_offsets([[10, 20], [30, 40]], [1, -5])     # [[11, 15], [31, 35]]
\`\`\`

## \`readings/summary.py\`

**\`row_totals(table)\`** totals each row, so a 3x2 table gives 3 numbers.

**\`column_totals(table)\`** totals each column, so a 3x2 table gives 2 numbers. An empty table gives
\`[]\`.

**\`mask_above(table, column, threshold)\`** returns one boolean per row: \`True\` where that row's value
in \`column\` is strictly greater than \`threshold\`. Raise \`ValueError\` if \`column\` is not a real column
index. Python counts a \`bool\` as an \`int\`, so \`True\` reaches an index check looking like \`1\`: it is
not a column index here and has to be rejected.

**\`select_rows(table, mask)\`** keeps the rows whose mask entry is \`True\`, in order. Raise
\`ValueError\` if the mask does not have one entry per row.

**\`summarize(table, offsets)\`** is the report itself. Fill the gaps, apply the offsets, then return:

\`\`\`python
{"shape": (3, 2), "row_totals": [...], "column_totals": [...], "grand_total": 198}
\`\`\`

It must call the \`readings.transform\` functions rather than repeat their work.`,
})

const TRANSFORM_STARTER = String.raw`"""Shape checks, gap filling and per-column offsets. See README.md for the contract."""


def check_rectangular(table):
    # TODO: return (rows, columns), and raise ValueError when the rows differ in length.
    return (0, 0)


def fill_missing(table):
    # TODO: replace every None with a value derived from its own column, keeping the shape.
    return []


def apply_offsets(table, offsets):
    # TODO: add the matching per-column offset to every value, rejecting a wrong-width offsets row.
    return []
`

const TRANSFORM_REFERENCE = String.raw`"""Shape checks, gap filling and per-column offsets. See README.md for the contract."""


def check_rectangular(table):
    if not table:
        return (0, 0)
    width = len(table[0])
    for row in table:
        if len(row) != width:
            raise ValueError("ragged table: rows have different lengths")
    return (len(table), width)


def fill_missing(table):
    _, columns = check_rectangular(table)
    fills = []
    for index in range(columns):
        known = [row[index] for row in table if row[index] is not None]
        fills.append(sum(known) // len(known) if known else 0)
    return [
        [fills[index] if value is None else value for index, value in enumerate(row)]
        for row in table
    ]


def apply_offsets(table, offsets):
    _, columns = check_rectangular(table)
    if len(offsets) != columns:
        raise ValueError("offsets must have one entry per column")
    return [[value + offsets[index] for index, value in enumerate(row)] for row in table]
`

const SUMMARY_STARTER = String.raw`"""Axis aggregation, masks and the report. See README.md for the contract."""

from readings.transform import apply_offsets, check_rectangular, fill_missing


def row_totals(table):
    # TODO: one total per row.
    return []


def column_totals(table):
    # TODO: one total per column.
    return []


def mask_above(table, column, threshold):
    # TODO: one boolean per row, rejecting a column index that does not exist.
    return []


def select_rows(table, mask):
    # TODO: keep the rows the mask marks, rejecting a mask of the wrong length.
    return []


def summarize(table, offsets):
    # TODO: fill, offset, then report the shape and both aggregations.
    return {}
`

const SUMMARY_REFERENCE = String.raw`"""Axis aggregation, masks and the report. See README.md for the contract."""

from readings.transform import apply_offsets, check_rectangular, fill_missing


def row_totals(table):
    check_rectangular(table)
    return [sum(row) for row in table]


def column_totals(table):
    _, columns = check_rectangular(table)
    return [sum(row[index] for row in table) for index in range(columns)]


def mask_above(table, column, threshold):
    _, columns = check_rectangular(table)
    if isinstance(column, bool) or not isinstance(column, int):
        raise ValueError("column index is not a column of this table")
    if column < 0 or column >= columns:
        raise ValueError("column index is not a column of this table")
    return [row[column] > threshold for row in table]


def select_rows(table, mask):
    rows, _ = check_rectangular(table)
    if len(mask) != rows:
        raise ValueError("mask must have one entry per row")
    return [row for row, keep in zip(table, mask) if keep]


def summarize(table, offsets):
    adjusted = apply_offsets(fill_missing(table), offsets)
    totals = row_totals(adjusted)
    return {
        "shape": check_rectangular(adjusted),
        "row_totals": totals,
        "column_totals": column_totals(adjusted),
        "grand_total": sum(totals),
    }
`

const TRANSFORM_TEST = String.raw`from readings.transform import apply_offsets, check_rectangular, fill_missing


def run_tests(record):
    def reports_the_shape():
        shape = check_rectangular([[1, 2, 3], [4, 5, 6]])
        assert shape == (2, 3), f"expected (2, 3), got {shape!r}"

    def fills_a_gap_from_its_own_column():
        filled = fill_missing([[10, 20], [30, None], [50, 60]])
        expected = [[10, 20], [30, 40], [50, 60]]
        assert filled == expected, f"expected {expected}, got {filled!r}"

    def filling_keeps_every_row():
        filled = fill_missing([[1, None], [None, None], [3, 4]])
        assert len(filled) == 3, f"expected 3 rows kept, got {len(filled)}"

    def offsets_apply_down_every_row():
        result = apply_offsets([[10, 20], [30, 40], [50, 60]], [1, -5])
        expected = [[11, 15], [31, 35], [51, 55]]
        assert result == expected, f"expected {expected}, got {result!r}"

    def a_wrong_width_offsets_row_is_rejected():
        try:
            apply_offsets([[1, 2], [3, 4]], [1, 2, 3])
            raised = False
        except ValueError:
            raised = True
        assert raised, "expected ValueError for 3 offsets against 2 columns, got no error"

    record("reports the shape", reports_the_shape)
    record("fills a gap from its own column", fills_a_gap_from_its_own_column)
    record("filling keeps every row", filling_keeps_every_row)
    record("offsets apply down every row", offsets_apply_down_every_row)
    record("a wrong-width offsets row is rejected", a_wrong_width_offsets_row_is_rejected)
`

const SUMMARY_TEST = String.raw`from readings.summary import (
    column_totals,
    mask_above,
    row_totals,
    select_rows,
    summarize,
)


def run_tests(record):
    table = [[11, 15], [31, 35], [51, 55]]

    def totals_across_each_row():
        result = row_totals(table)
        assert result == [26, 66, 106], f"expected [26, 66, 106], got {result!r}"

    def totals_down_each_column():
        result = column_totals(table)
        assert result == [93, 105], f"expected [93, 105], got {result!r}"

    def a_mask_marks_the_rows_above_a_threshold():
        result = mask_above(table, 0, 30)
        assert result == [False, True, True], f"expected [False, True, True], got {result!r}"

    def a_mask_selects_rows():
        result = select_rows(table, [False, True, True])
        expected = [[31, 35], [51, 55]]
        assert result == expected, f"expected {expected}, got {result!r}"

    def the_report_fills_then_offsets():
        report = summarize([[10, 20], [30, None], [50, 60]], [1, -5])
        assert report["shape"] == (3, 2), f"expected (3, 2), got {report['shape']!r}"
        assert report["row_totals"] == [26, 66, 106], f"expected [26, 66, 106], got {report['row_totals']!r}"
        assert report["column_totals"] == [93, 105], f"expected [93, 105], got {report['column_totals']!r}"
        assert report["grand_total"] == 198, f"expected 198, got {report['grand_total']!r}"

    record("totals across each row", totals_across_each_row)
    record("totals down each column", totals_down_each_column)
    record("a mask marks the rows above a threshold", a_mask_marks_the_rows_above_a_threshold)
    record("a mask selects rows", a_mask_selects_rows)
    record("the report fills then offsets", the_report_fills_then_offsets)
`

const READINGS_TEST_HIDDEN = String.raw`from readings.summary import column_totals, mask_above, row_totals, select_rows, summarize
from readings.transform import check_rectangular, fill_missing


def run_tests(record):
    def a_ragged_table_is_rejected():
        try:
            check_rectangular([[1, 2], [3]])
            raised = False
        except ValueError:
            raised = True
        assert raised, "expected ValueError for rows of length 2 and 1, got no error"

    def an_empty_table_has_shape_zero_by_zero():
        shape = check_rectangular([])
        assert shape == (0, 0), f"expected (0, 0), got {shape!r}"
        assert row_totals([]) == [], f"expected [], got {row_totals([])!r}"
        assert column_totals([]) == [], f"expected [], got {column_totals([])!r}"

    def a_column_of_only_gaps_fills_with_zero():
        filled = fill_missing([[1, None], [3, None]])
        expected = [[1, 0], [3, 0]]
        assert filled == expected, f"expected {expected}, got {filled!r}"

    def the_fill_value_floors():
        filled = fill_missing([[1], [2], [None]])
        assert filled == [[1], [2], [1]], f"expected [[1], [2], [1]], got {filled!r}"

    def an_out_of_range_column_is_rejected():
        try:
            mask_above([[1, 2], [3, 4]], 5, 0)
            raised = False
        except ValueError:
            raised = True
        assert raised, "expected ValueError for column 5 of a 2-column table, got no error"

    def a_boolean_is_not_a_column_index():
        try:
            mask_above([[1, 2], [3, 4]], True, 0)
            raised = False
        except ValueError:
            raised = True
        assert raised, "expected ValueError for True as a column index, got no error"

    def a_wrong_length_mask_is_rejected():
        try:
            select_rows([[1], [2], [3]], [True, False])
            raised = False
        except ValueError:
            raised = True
        assert raised, "expected ValueError for a 2-entry mask over 3 rows, got no error"

    def a_mask_that_keeps_nothing_gives_an_empty_table():
        result = select_rows([[1], [2]], [False, False])
        assert result == [], f"expected [], got {result!r}"

    def the_report_handles_negatives_and_a_single_row():
        report = summarize([[-4, 6]], [4, -6])
        assert report["shape"] == (1, 2), f"expected (1, 2), got {report['shape']!r}"
        assert report["row_totals"] == [0], f"expected [0], got {report['row_totals']!r}"
        assert report["column_totals"] == [0, 0], f"expected [0, 0], got {report['column_totals']!r}"
        assert report["grand_total"] == 0, f"expected 0, got {report['grand_total']!r}"

    record("a ragged table is rejected", a_ragged_table_is_rejected)
    record("an empty table has shape (0, 0)", an_empty_table_has_shape_zero_by_zero)
    record("a column of only gaps fills with zero", a_column_of_only_gaps_fills_with_zero)
    record("the fill value floors", the_fill_value_floors)
    record("an out-of-range column is rejected", an_out_of_range_column_is_rejected)
    record("a boolean is not a column index", a_boolean_is_not_a_column_index)
    record("a wrong-length mask is rejected", a_wrong_length_mask_is_rejected)
    record("a mask that keeps nothing gives an empty table", a_mask_that_keeps_nothing_gives_an_empty_table)
    record("the report handles negatives and a single row", the_report_handles_negatives_and_a_single_row)
`

export const numpyArraysLesson: PythonLesson = {
  id: "py-l3-numpy-arrays",
  title: "numpy: arrays, dtypes & whole-array operations",
  summary: "Why a fixed-dtype array beats a list of ints, and what that promise costs you.",
  estimatedMinutes: 45,
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
    // 8 minutes: a 14-line prompt, a 9-line reference, one axis decision plus two edge cases
    // (a gap in a column, a column that is nothing but gaps).
    estimatedMinutes: 8,
    prompt: `Implement \`column_ranges(table)\`, the pure-Python version of what
\`arr.max(axis=0) - arr.min(axis=0)\` gives you in numpy.

A **table** is a list of rows, every row the same length. Return one number per **column**: the
largest value in that column minus the smallest.

Sensors drop readings, so a cell may be \`None\`. A \`None\` takes part in nothing: it is skipped, and
it never becomes a zero. A column that holds nothing but gaps has a range of \`0\`, and an empty
table has no columns, so it gives \`[]\`.

\`\`\`python
column_ranges([[10, 5], [30, 5], [20, 9]])      # [20, 4]
column_ranges([[10, None], [30, 7], [20, None]])  # [20, 0]
column_ranges([])                                 # []
\`\`\``,
    starterCode: `def column_ranges(table):
    # One number per column: its largest value minus its smallest, skipping gaps.
    pass`,
    hints: [
      "A row is easy to walk and a column is not, because a column is one position taken from every row. Decide which index you are holding still before you write the loop.",
      "`range(len(table[0]))` gives you the column indexes, as long as you have already dealt with the table that has no rows at all.",
      "Gather one column's real values into a list first, and both edge cases become questions about that list: `max(values) - min(values)` when it holds anything, `0` when it does not.",
    ],
    referenceSolution: `def column_ranges(table):
    if not table:
        return []
    ranges = []
    for index in range(len(table[0])):
        values = [row[index] for row in table if row[index] is not None]
        ranges.append(max(values) - min(values) if values else 0)
    return ranges`,
    testCases: [
      {
        input: {
          table: [
            [10, 5],
            [30, 5],
            [20, 9],
          ],
        },
        expected: [20, 4],
        description: "one range per column",
      },
      {
        input: {
          table: [
            [10, null],
            [30, 7],
            [20, null],
          ],
        },
        expected: [20, 0],
        description: "gaps are skipped, and an all-gap column is 0",
      },
      { input: { table: [] }, expected: [], description: "an empty table has no columns" },
      {
        input: { table: [[4, -6, 0]] },
        expected: [0, 0, 0],
        description: "a single row has no spread in any column",
      },
      {
        input: {
          table: [
            [-4, 2],
            [6, -8],
          ],
        },
        expected: [10, 10],
        description: "negatives spread the same way",
      },
    ],
  },
  practice: {
    id: "py-l3-numpy-arrays-practice",
    executionMode: "workspace",
    estimatedMinutes: 30,
    prompt: `Repair the overnight calibration report. It has been wrong since one sensor started
dropping readings: the old job deleted any row that contained a gap, so the report quietly shrank and
every column total came out low.

Implement the transform layer in \`readings/transform.py\` and the summary layer in
\`readings/summary.py\`. Between them they have to check that the table is rectangular, fill the gaps
without losing a single row, apply a per-column calibration offset across the whole table, total the
values both per row and per column, select rows with a boolean mask, and assemble the report.
\`README.md\` has the exact contract for each function. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Two different totals come out of the same table. One walks each row; the other walks one column index across all the rows. Write them separately and the axis confusion goes away.",
      "`fill_missing` needs a value per column before it can rewrite anything, so gather each column's known values first, then rebuild the rows using `enumerate(row)` to know which column you are in.",
      "Two traps sit in the validation. `check_rectangular` gives you the width, so compare `len(offsets)` against it before you add anything. And `isinstance(True, int)` is `True`, so a column index check that only asks for an `int` lets `True` through as column 1: rule out `bool` first. `summarize` composes the transform functions in the order the README states rather than redoing their work.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "readings/transform.py",
      editableFilePaths: ["readings/transform.py", "readings/summary.py"],
      visibleTestPaths: ["tests/test_transform.py", "tests/test_summary.py"],
      hiddenTestPaths: ["tests/test_readings_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: TABLE_README },
        { path: "readings/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "readings/transform.py",
          role: "editable",
          language: "python",
          content: TRANSFORM_STARTER,
          description: "Shape, gap filling and per-column offsets",
        },
        {
          path: "readings/summary.py",
          role: "editable",
          language: "python",
          content: SUMMARY_STARTER,
          description: "Aggregation, masks and the report",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_transform.py",
          role: "test",
          language: "python",
          content: TRANSFORM_TEST,
          description: "Visible transform tests",
        },
        {
          path: "tests/test_summary.py",
          role: "test",
          language: "python",
          content: SUMMARY_TEST,
          description: "Visible summary tests",
        },
        {
          path: "tests/test_readings_hidden.py",
          role: "test",
          language: "python",
          content: READINGS_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_transform", label: "visible transform" },
            { module: "test_summary", label: "visible summary" },
            { module: "test_readings_hidden", label: "hidden readings" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "readings/transform.py",
          role: "editable",
          language: "python",
          content: TRANSFORM_REFERENCE,
        },
        {
          path: "readings/summary.py",
          role: "editable",
          language: "python",
          content: SUMMARY_REFERENCE,
        },
      ],
    },
  },
}

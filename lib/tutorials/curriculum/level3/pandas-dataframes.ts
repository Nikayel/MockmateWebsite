import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const TABLE_README = `# Total the weekly sales export

The export arrives as CSV **text** in an API response, not as a file on disk, and two cells came
through blank. Implement the three helpers in \`frame/table.py\`. \`frame/sample.py\` (read-only) holds
the export as \`SALES_CSV\`.

**\`read_csv(text)\`** returns one dict per data row, keyed by the header names. Type each cell:

- a blank cell (or one that is only whitespace) becomes \`None\`, the stand-in for pandas' \`NaN\`
- an integer-looking cell, with an optional leading \`-\`, becomes an \`int\`
- anything else stays a trimmed string

**\`filter_rows(rows, column, minimum)\`** keeps the rows whose value in \`column\` is not \`None\` and is
at least \`minimum\`. A missing value never passes a comparison, which is how a real boolean mask
treats \`NaN\`.

**\`group_sum(rows, key_column, value_column)\`** returns a dict of totals per key:

- a row whose **key** is \`None\` is dropped entirely, exactly as \`groupby\` drops \`NaN\` keys
- a row whose **value** is \`None\` still counts toward its group, contributing \`0\`

Some tests are hidden.
`

const TABLE_SAMPLE = String.raw`SALES_CSV = """region,rep,amount
west,Ada,100
east,Sam,250
west,Mo,50
,Kim,75
east,Lee,
north,Rio,-25
"""
`

const TABLE_STARTER = String.raw`import csv
import io


def read_csv(text):
    """Parse CSV text into a list of typed row dicts (see README.md)."""
    # TODO: csv.DictReader(io.StringIO(text.strip())) gives you raw string cells.
    # Blank -> None, integer-looking -> int, otherwise the trimmed string.
    return []


def filter_rows(rows, column, minimum):
    """Keep the rows whose column value is present and at least minimum."""
    # TODO: a None value never passes the comparison.
    return []


def group_sum(rows, key_column, value_column):
    """Total value_column per key_column (see README.md)."""
    # TODO: drop a row whose key is None; count a None value as 0.
    return {}
`

const TABLE_REFERENCE = String.raw`import csv
import io


def read_csv(text):
    reader = csv.DictReader(io.StringIO(text.strip()))
    rows = []
    for raw in reader:
        row = {}
        for column, cell in raw.items():
            value = (cell or "").strip()
            if not value:
                row[column] = None
            elif value.lstrip("-").isdigit():
                row[column] = int(value)
            else:
                row[column] = value
        rows.append(row)
    return rows


def filter_rows(rows, column, minimum):
    return [row for row in rows if row[column] is not None and row[column] >= minimum]


def group_sum(rows, key_column, value_column):
    totals = {}
    for row in rows:
        key = row[key_column]
        if key is None:
            continue
        value = row[value_column]
        if value is None:
            value = 0
        totals[key] = totals.get(key, 0) + value
    return totals
`

const TABLE_TEST = String.raw`from frame.sample import SALES_CSV
from frame.table import filter_rows, group_sum, read_csv


def run_tests(record):
    def types_each_cell():
        rows = read_csv(SALES_CSV)
        assert len(rows) == 6, f"expected 6 rows, got {len(rows)}"
        assert rows[0] == {"region": "west", "rep": "Ada", "amount": 100}, f"got {rows[0]!r}"

    def a_blank_cell_becomes_none():
        rows = read_csv(SALES_CSV)
        assert rows[3]["region"] is None, f"got {rows[3]!r}"
        assert rows[4]["amount"] is None, f"got {rows[4]!r}"

    def filters_on_a_minimum():
        rows = read_csv(SALES_CSV)
        kept = [row["rep"] for row in filter_rows(rows, "amount", 100)]
        assert kept == ["Ada", "Sam"], f"got {kept!r}"

    def totals_by_group():
        rows = read_csv(SALES_CSV)
        totals = group_sum(rows, "region", "amount")
        assert totals == {"west": 150, "east": 250, "north": -25}, f"got {totals!r}"

    record("types each cell", types_each_cell)
    record("a blank cell becomes None", a_blank_cell_becomes_none)
    record("filters on a minimum", filters_on_a_minimum)
    record("totals by group", totals_by_group)
`

const TABLE_TEST_HIDDEN = String.raw`from frame.table import filter_rows, group_sum, read_csv


def run_tests(record):
    def a_missing_key_drops_the_row():
        rows = [{"region": "west", "amount": 10}, {"region": None, "amount": 999}]
        result = group_sum(rows, "region", "amount")
        assert result == {"west": 10}, f"a None key must not become a bucket, got {result!r}"

    def a_missing_value_counts_as_zero():
        rows = [{"region": "east", "amount": None}, {"region": "east", "amount": 5}]
        result = group_sum(rows, "region", "amount")
        assert result == {"east": 5}, f"a None value must not break the sum, got {result!r}"

    def a_minimum_nothing_meets_returns_empty():
        rows = [{"amount": 1}, {"amount": None}]
        assert filter_rows(rows, "amount", 100) == []

    def parses_a_negative_integer():
        rows = read_csv("region,amount\nsouth,-25\n")
        assert rows == [{"region": "south", "amount": -25}], f"got {rows!r}"

    record("a missing key drops the row", a_missing_key_drops_the_row)
    record("a missing value counts as zero", a_missing_value_counts_as_zero)
    record("a minimum nothing meets returns empty", a_minimum_nothing_meets_returns_empty)
    record("parses a negative integer", parses_a_negative_integer)
`

export const pandasDataframesLesson: PythonLesson = {
  id: "py-l3-pandas-dataframes",
  title: "pandas: DataFrames, filtering & groupby",
  summary: "Load a CSV, select and filter rows, total by group, and survive missing values.",
  estimatedMinutes: 20,
  difficulty: "medium",
  skills: ["csv", "data-modeling", "filtering", "dicts"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## A DataFrame is a dict of columns

Stop picturing a spreadsheet and picture a dict. A \`DataFrame\` maps column names to columns, and each column is a \`Series\`: a numpy array of one dtype, plus a labelled **index** that lines its values up with every other column. Everything from the numpy lesson still applies, one column at a time. The index is the piece that has no list equivalent, and it is what makes rows line up after a filter, a join or a sort.

## Loading from a string buffer

\`read_csv\` takes a path, but it also takes any file-like object. \`StringIO\` makes a string look like a file, which is how you load an API response, or test a parser, without a fixture on disk:

\`\`\`python
import pandas as pd
from io import StringIO

text = """region,rep,amount
west,Ada,100
east,Sam,250
west,Mo,50
"""
df = pd.read_csv(StringIO(text))
df.dtypes      # region object, rep object, amount int64
df.head()      # the first rows
df.shape       # (3, 3)
\`\`\`

\`read_csv\` infers a dtype per column from the values it sees, which is convenient right up until a blank cell changes its mind.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "one-blank-cell-makes-the-column-float",
  "prompt": "A CSV column holds the values 1, 2 and 3, with one further cell left blank. What dtype does read_csv give that column?",
  "options": [
    {
      "label": "int64, since every value actually present is a whole number.",
      "feedback": "Tempting, because that is exactly the dtype the same column gets the moment you fill the blank in, and nothing about the data itself says float. The missing cell has to be represented too, and the marker pandas uses for a missing number is a float."
    },
    {
      "label": "float64, because the blank becomes NaN and NaN is a float.",
      "correct": true,
      "feedback": "Right, so ids print as 1.0 and 2.0, and a join against a genuine int column silently matches nothing. Use the nullable Int64 dtype, or fill the blanks on the way in, when a column has to stay whole."
    },
    {
      "label": "object, since the column now mixes numbers with a missing marker.",
      "feedback": "Tempting, because object really is the fallback whenever a column holds mixed types, and a blank does feel like a different kind of thing. NaN lives inside float64 natively, so there is no need to fall back to object."
    }
  ]
}
\`\`\`

## Selecting

\`\`\`python
df["amount"]                 # a Series (one column)
df[["region", "amount"]]     # a DataFrame (a list of columns, hence the double brackets)
df.loc[0, "amount"]          # by label: row index 0, column "amount"
df.iloc[0, 2]                # by position: first row, third column
\`\`\`

The double brackets trip everyone once. \`df["a"]\` asks for one column and gets a \`Series\`; \`df[["a"]]\` passes a *list* of names and gets a one-column \`DataFrame\` back.

## Filtering with a boolean mask

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "mask-is-a-series-not-a-frame",
  "prompt": "You type df['amount'] > 100 on its own line and print the result. What do you get?",
  "options": [
    {
      "label": "The rows whose amount is over 100.",
      "feedback": "Tempting, because that is what you were reaching for and it is exactly one bracket pair away from being true. The comparison only answers the question row by row; handing those answers back to the frame is the separate step that selects."
    },
    {
      "label": "A Series of True and False, one per row, in the same index order.",
      "correct": true,
      "feedback": "Right, and that separation is the whole design. The mask is an ordinary value you can name, invert with a tilde, or combine with the and and or operators, and df[mask] is the step that actually selects rows."
    },
    {
      "label": "A single True or False, for whether any amount is over 100.",
      "feedback": "Tempting, because a plain Python comparison collapses to one answer, and calling bool() on a mask really does raise a complaint about ambiguity. The comparison here is elementwise, so it produces one answer per row rather than one for the frame."
    }
  ]
}
\`\`\`

Compare a column, then index the frame with the result:

\`\`\`python
big = df["amount"] > 100          # a Series of booleans
df[big]                            # the rows where it is True
df[(df["amount"] > 100) & (df["region"] == "east")]
\`\`\`

Two rules for combining masks: use \`&\` and \`|\` rather than \`and\` and \`or\` (those ask for one truth value and raise on a Series), and parenthesize each comparison, because \`&\` binds tighter than \`>\`.

## Reading with a mask, writing with \`.loc\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "chained-assignment-writes-to-a-copy",
  "prompt": "You run this to zero out the big values: df[df['amount'] > 100]['amount'] = 0. It does not raise. You print df afterwards. What changed?",
  "options": [
    {
      "label": "Every amount over 100 is now 0.",
      "feedback": "Tempting, because the line reads left to right exactly like that, and the same shape of statement on a nested dict really would work. The first bracket pair produced a new object, so the assignment landed on something that was discarded a moment later."
    },
    {
      "label": "Nothing. The first selection returned a copy, and the assignment wrote into the copy.",
      "correct": true,
      "feedback": "Right, and this is the classic chained-assignment trap. Select and assign in one step instead: df.loc[df['amount'] > 100, 'amount'] = 0 hands both the row mask and the column to a single indexer."
    },
    {
      "label": "Nothing, and the SettingWithCopyWarning it raises stops the script.",
      "feedback": "Half right, since that warning genuinely is emitted in many versions and it is pandas trying to tell you. A warning is not an exception though: the script carries on as if the write worked, which is why this bug reaches production."
    }
  ]
}
\`\`\`

Reading through two selections is fine. **Writing** through two selections is not, because the first one may hand you a copy. Do the whole thing in one indexer:

\`\`\`python
df.loc[df["amount"] > 100, "amount"] = 0     # one step, writes into df
\`\`\`

## groupby: split, apply, combine

\`\`\`python
df.groupby("region")["amount"].sum()
# region
# east    250
# west    150
\`\`\`

\`groupby\` splits the rows by key, applies an aggregation to each group, and combines the answers into a new indexed result. In plain Python this is the \`defaultdict\` accumulate loop you already know; \`groupby\` is that loop with a name and a fast implementation. \`.agg({"amount": ["sum", "mean"], "rep": "count"})\` runs several aggregations at once.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "groupby-drops-nan-keys",
  "prompt": "Your sales frame has 6 rows. One row has a blank region, which read_csv turned into NaN. You run df.groupby('region')['amount'].sum(). How much of the data reaches the totals?",
  "options": [
    {
      "label": "All 6 rows. The blank becomes its own group, labelled NaN.",
      "feedback": "Tempting, because that is precisely what you get by passing dropna=False, and grouping does feel like it ought to partition everything it was given. The default is the opposite: rows with a missing key are dropped before any grouping happens."
    },
    {
      "label": "5 rows. The row with the missing region is dropped, so its amount lands in no total.",
      "correct": true,
      "feedback": "Right, and nothing tells you. The totals are quietly short by that row, which is why a groupby result is worth checking against the frame's own total before anybody reads it as a number."
    },
    {
      "label": "All 6 rows, with the blank one folded into the first group.",
      "feedback": "Tempting, because some tools really do bucket unknowns into a default group, and at least that would preserve the overall total. pandas never guesses a key: it either gives NaN a group of its own or drops it, and dropping is the default."
    }
  ],
  "reveal": "Both halves of that default are worth remembering. groupby drops rows with a missing KEY, while the aggregations skip a missing VALUE, so sum() ignores NaN rather than producing NaN. Missing data leaves through two different doors and neither one announces itself."
}
\`\`\`

## Missing values

A blank cell becomes \`NaN\`. \`NaN\` is a float, it never equals anything (not even itself), and it propagates through arithmetic. So \`df[df["amount"] == np.nan]\` matches nothing at all, no matter how many blanks there are:

\`\`\`python
df["amount"].isna()          # the correct test, a boolean mask
df["amount"].fillna(0)       # substitute a value
df.dropna(subset=["amount"]) # drop the rows that are missing it
\`\`\`

## What runs where

\`pandas\` is not bundled into the Python build behind this browser sandbox, so \`import pandas\` fails here (and it would pull \`numpy\` in with it). In a real environment it is one \`pip install pandas\` (or \`uv add pandas\`) away, using the setup from "Running Python & installing packages". The exercises below build the same three mechanics over lists of dicts, missing values and all, so the model you take to the terminal already accounts for the parts that bite.

**Interview nuance:** for a data role, the question behind the question is almost always about missing data. Anyone can write \`groupby("region").sum()\`. The signal is knowing that a missing group key silently removes the row from the answer, that a missing value is skipped by the aggregation instead of poisoning it, and that one blank cell turns an integer column into \`float64\` and quietly breaks a join. Say what the default does, then say how you would check the total.`,
    demoCode: `# pandas is not bundled into this browser sandbox, so this demo builds the same three
# moves over plain dicts: load from a text buffer, mask, and total by group.
import csv
import io

text = """region,rep,amount
west,Ada,100
east,Sam,250
west,Mo,50
"""

rows = [
    {"region": r["region"], "rep": r["rep"], "amount": int(r["amount"])}
    for r in csv.DictReader(io.StringIO(text))
]
print("rows: ", rows)
print("mask: ", [row["amount"] > 100 for row in rows])
print("big:  ", [row["rep"] for row in rows if row["amount"] > 100])

totals = {}
for row in rows:
    totals[row["region"]] = totals.get(row["region"], 0) + row["amount"]
print("group:", totals)`,
  },
  apply: {
    id: "py-l3-pandas-dataframes-apply",
    executionMode: "single-file",
    prompt: `Warm-up: implement \`infer_dtype(cells)\`, the rule \`read_csv\` uses to pick a column's dtype.

\`cells\` is the list of raw text values for one column. Return \`"int64"\` when every cell is
integer-looking (digits with an optional leading \`-\`) and none is blank, \`"float64"\` when the
non-blank cells are all integer-looking but at least one cell is blank, and \`"object"\` otherwise.
Treat a whitespace-only cell as blank.`,
    starterCode: `def infer_dtype(cells):
    # "int64" when all integer-looking and nothing is blank, "float64" when a blank
    # forces NaN into an otherwise integer column, "object" for anything else.
    pass`,
    hints: [
      "Strip every cell first, then split them into the blank ones and the filled ones.",
      '`value.lstrip("-").isdigit()` is the integer-looking test, the same one `coerce` used.',
      'If any filled cell fails that test, return `"object"`. Otherwise a blank means `"float64"` and no blank means `"int64"`.',
    ],
    referenceSolution: `def infer_dtype(cells):
    values = [cell.strip() for cell in cells]
    filled = [value for value in values if value]
    if not all(value.lstrip("-").isdigit() for value in filled):
        return "object"
    if len(filled) < len(values):
        return "float64"
    return "int64"`,
    testCases: [
      {
        input: { cells: ["1", "2", "3"] },
        expected: "int64",
        description: "a clean integer column",
      },
      {
        input: { cells: ["1", "", "3"] },
        expected: "float64",
        description: "one blank cell forces float64",
      },
      {
        input: { cells: ["1", "x", "3"] },
        expected: "object",
        description: "any non-numeric text falls back to object",
      },
      {
        input: { cells: ["10", "-2", "  "] },
        expected: "float64",
        description: "negatives count as integer-looking, whitespace counts as blank",
      },
    ],
  },
  practice: {
    id: "py-l3-pandas-dataframes-practice",
    executionMode: "workspace",
    prompt: `The weekly sales export arrives as CSV text in an API response rather than a file on disk, and
two cells came through blank. Implement the three helpers in \`frame/table.py\`: \`read_csv\` (typed row
dicts, blanks becoming \`None\`), \`filter_rows\` (a boolean-mask filter that a missing value never
passes), and \`group_sum\` (totals per key, dropping rows whose key is missing and counting a missing
value as zero). The README spells out each rule. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "`csv.DictReader(io.StringIO(text.strip()))` yields one dict of raw strings per row, keyed by the header.",
      "Type each cell in order: blank first (`None`), then integer-looking (`int(value)`), then the trimmed string.",
      "In `group_sum`, `continue` past a row whose key is `None`, and accumulate with `totals.get(key, 0) + value`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "frame/table.py",
      editableFilePaths: ["frame/table.py"],
      visibleTestPaths: ["tests/test_table.py"],
      hiddenTestPaths: ["tests/test_table_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: TABLE_README },
        { path: "frame/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "frame/sample.py",
          role: "readonly",
          language: "python",
          content: TABLE_SAMPLE,
          description: "The weekly export, as CSV text (read-only)",
        },
        {
          path: "frame/table.py",
          role: "editable",
          language: "python",
          content: TABLE_STARTER,
          description: "Implement the three helpers here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_table.py",
          role: "test",
          language: "python",
          content: TABLE_TEST,
          description: "Visible table tests",
        },
        {
          path: "tests/test_table_hidden.py",
          role: "test",
          language: "python",
          content: TABLE_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_table", label: "visible table" },
            { module: "test_table_hidden", label: "hidden table" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "frame/table.py",
          role: "editable",
          language: "python",
          content: TABLE_REFERENCE,
        },
      ],
    },
  },
}

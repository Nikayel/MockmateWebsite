import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const LEDGER_README = `# The spend-by-category report is wrong

Finance rebuilt the monthly report and the numbers do not add up. The transaction feed and the
category reference table come from two different systems, so the join does not match on every row,
and one merchant terminal sends a blank amount when a sale is voided.

\`ledger/feed.py\` (read-only) holds \`TRANSACTIONS\` (raw rows, every field arriving as text) and
\`CATEGORIES\` (a dict mapping category id to category name). You edit two files.

## \`ledger/clean.py\`

**\`clean_transactions(raw_rows)\`** returns a new list of new dicts, one per raw row, with the keys
\`txn_id\`, \`category_id\` and \`amount\`:

- \`category_id\`: trimmed, and a blank or whitespace-only id becomes \`None\`
- \`amount\`: a blank or whitespace-only cell becomes \`None\`, otherwise the whole number it spells,
  which may be negative for a refund
- \`txn_id\` is copied through unchanged

The raw rows you were handed must be exactly as they were when this returns.

**\`attach_category(rows, categories)\`** returns a new list of new dicts, each row copied through
with one extra key, \`category\`, holding the name that \`categories\` gives for that row's
\`category_id\`. A row whose id is missing, or whose id is not in \`categories\` at all, gets \`None\`.
This is a left join: no row is ever dropped.

## \`ledger/report.py\`

These take the joined rows.

**\`category_report(rows, categories)\`** returns a dict keyed by category **name**, with a value of
\`{"total": int, "count": int, "average": int}\`:

- every name in \`categories\` appears, including one that no transaction reached
- \`total\` sums the amounts that are present, \`count\` counts the rows that had one
- a row with a missing amount contributes to neither
- \`average\` is \`total / count\` rounded to a whole number, or \`0\` when \`count\` is \`0\`
- rows with no matched category belong to none of these buckets

**\`rank_categories(report)\`** returns the category names as a list, highest \`total\` first. Names
tied on total come back in alphabetical order.

**\`unmatched_total(rows)\`** returns the total amount of the rows that matched no category, counting
a missing amount as \`0\`.

Some tests are hidden.
`

const LEDGER_FEED = String.raw`TRANSACTIONS = [
    {"txn_id": "t1", "category_id": "c1", "amount": "40"},
    {"txn_id": "t2", "category_id": "c2", "amount": "15"},
    {"txn_id": "t3", "category_id": "c1", "amount": "  "},
    {"txn_id": "t4", "category_id": "c9", "amount": "70"},
    {"txn_id": "t5", "category_id": "", "amount": "5"},
    {"txn_id": "t6", "category_id": "c2", "amount": "25"},
]

CATEGORIES = {"c1": "Groceries", "c2": "Transport", "c3": "Books"}
`

const LEDGER_CLEAN_STARTER = String.raw`def clean_transactions(raw_rows):
    """Type the raw feed rows (see README.md)."""
    # TODO: return new dicts with a trimmed category_id and a whole-number amount,
    # using None for either one when the cell is blank. Leave raw_rows untouched.
    return []


def attach_category(rows, categories):
    """Left-join each row to its category name (see README.md)."""
    # TODO: every row survives, and carries a "category" key.
    return []
`

const LEDGER_CLEAN_REFERENCE = String.raw`def clean_transactions(raw_rows):
    cleaned = []
    for raw in raw_rows:
        category_id = (raw.get("category_id") or "").strip() or None
        amount_text = (raw.get("amount") or "").strip()
        cleaned.append(
            {
                "txn_id": raw["txn_id"],
                "category_id": category_id,
                "amount": int(amount_text) if amount_text else None,
            }
        )
    return cleaned


def attach_category(rows, categories):
    return [{**row, "category": categories.get(row["category_id"])} for row in rows]
`

const LEDGER_REPORT_STARTER = String.raw`def category_report(rows, categories):
    """Summarise the joined rows per category name (see README.md)."""
    # TODO: every known category needs an entry, present or not. A missing amount
    # is not a zero-value transaction, so it must not reach total, count or average.
    return {}


def rank_categories(report):
    """Order the category names by total, highest first (see README.md)."""
    # TODO: decide what happens to two categories on the same total.
    return []


def unmatched_total(rows):
    """Total the rows that matched no category (see README.md)."""
    # TODO: a missing amount counts as 0 here.
    return 0
`

const LEDGER_REPORT_REFERENCE = String.raw`def category_report(rows, categories):
    report = {name: {"total": 0, "count": 0, "average": 0} for name in categories.values()}
    for row in rows:
        name = row["category"]
        if name not in report:
            continue
        amount = row["amount"]
        if amount is None:
            continue
        report[name]["total"] += amount
        report[name]["count"] += 1
    for entry in report.values():
        if entry["count"]:
            entry["average"] = round(entry["total"] / entry["count"])
    return report


def rank_categories(report):
    return sorted(report, key=lambda name: (-report[name]["total"], name))


def unmatched_total(rows):
    total = 0
    for row in rows:
        if row["category"] is None and row["amount"] is not None:
            total += row["amount"]
    return total
`

const LEDGER_TEST = String.raw`from ledger.clean import attach_category, clean_transactions
from ledger.feed import CATEGORIES, TRANSACTIONS
from ledger.report import category_report, rank_categories, unmatched_total


def joined():
    return attach_category(clean_transactions(TRANSACTIONS), CATEGORIES)


def run_tests(record):
    def types_the_feed():
        rows = clean_transactions(TRANSACTIONS)
        assert len(rows) == 6, f"expected 6 rows, got {len(rows)}"
        expected = {"txn_id": "t1", "category_id": "c1", "amount": 40}
        assert rows[0] == expected, f"expected {expected!r}, got {rows[0]!r}"
        assert rows[2]["amount"] is None, f"expected a blank amount to be None, got {rows[2]!r}"
        assert rows[4]["category_id"] is None, f"expected a blank id to be None, got {rows[4]!r}"

    def joins_every_row():
        rows = joined()
        assert len(rows) == 6, f"a left join keeps every row, expected 6, got {len(rows)}"
        names = [row["category"] for row in rows]
        want = ["Groceries", "Transport", "Groceries", None, None, "Transport"]
        assert names == want, f"expected {want!r}, got {names!r}"

    def reports_per_category():
        report = category_report(joined(), CATEGORIES)
        want = {
            "Groceries": {"total": 40, "count": 1, "average": 40},
            "Transport": {"total": 40, "count": 2, "average": 20},
            "Books": {"total": 0, "count": 0, "average": 0},
        }
        assert report == want, f"expected {want!r}, got {report!r}"

    def ranks_by_total():
        order = rank_categories(category_report(joined(), CATEGORIES))
        want = ["Groceries", "Transport", "Books"]
        assert order == want, f"expected {want!r}, got {order!r}"

    def totals_the_unmatched_rows():
        result = unmatched_total(joined())
        assert result == 75, f"expected 75 from the two unmatched rows, got {result!r}"

    record("types the feed", types_the_feed)
    record("joins every row", joins_every_row)
    record("reports per category", reports_per_category)
    record("ranks by total", ranks_by_total)
    record("totals the unmatched rows", totals_the_unmatched_rows)
`

const LEDGER_TEST_HIDDEN = String.raw`from ledger.clean import attach_category, clean_transactions
from ledger.report import category_report, rank_categories, unmatched_total


def run_tests(record):
    def the_raw_rows_are_left_alone():
        raw = [{"txn_id": "t1", "category_id": " c1 ", "amount": "40"}]
        cleaned = clean_transactions(raw)
        assert raw[0]["amount"] == "40", f"clean_transactions edited its input: {raw[0]!r}"
        assert cleaned[0]["category_id"] == "c1", f"expected 'c1', got {cleaned[0]['category_id']!r}"

    def a_refund_stays_negative():
        cleaned = clean_transactions([{"txn_id": "t9", "category_id": "c1", "amount": "-30"}])
        assert cleaned[0]["amount"] == -30, f"expected -30, got {cleaned[0]['amount']!r}"

    def an_unknown_id_becomes_no_category():
        rows = attach_category(
            [{"txn_id": "t1", "category_id": "c404", "amount": 10}], {"c1": "Groceries"}
        )
        assert rows[0]["category"] is None, f"expected None, got {rows[0]['category']!r}"

    def an_unmatched_row_never_becomes_a_bucket():
        rows = [{"category": None, "amount": 500}, {"category": "Books", "amount": 20}]
        report = category_report(rows, {"c3": "Books"})
        want = {"Books": {"total": 20, "count": 1, "average": 20}}
        assert report == want, f"an unmatched row must not add a bucket, expected {want!r}, got {report!r}"

    def an_empty_category_still_reports():
        report = category_report([], {"c3": "Books"})
        want = {"Books": {"total": 0, "count": 0, "average": 0}}
        assert report == want, f"expected {want!r}, got {report!r}"

    def a_missing_amount_does_not_move_the_average():
        rows = [
            {"category": "Books", "amount": 10},
            {"category": "Books", "amount": None},
            {"category": "Books", "amount": 20},
        ]
        entry = category_report(rows, {"c3": "Books"})["Books"]
        want = {"total": 30, "count": 2, "average": 15}
        assert entry == want, f"a missing amount is not a zero, expected {want!r}, got {entry!r}"

    def a_tie_is_broken_alphabetically():
        report = {
            "Transport": {"total": 40, "count": 1, "average": 40},
            "Groceries": {"total": 40, "count": 1, "average": 40},
            "Books": {"total": 90, "count": 1, "average": 90},
        }
        order = rank_categories(report)
        want = ["Books", "Groceries", "Transport"]
        assert order == want, f"expected {want!r}, got {order!r}"

    def a_missing_amount_counts_as_zero_when_unmatched():
        rows = [{"category": None, "amount": None}, {"category": None, "amount": 7}]
        result = unmatched_total(rows)
        assert result == 7, f"expected 7, got {result!r}"

    record("the raw rows are left alone", the_raw_rows_are_left_alone)
    record("a refund stays negative", a_refund_stays_negative)
    record("an unknown id becomes no category", an_unknown_id_becomes_no_category)
    record("an unmatched row never becomes a bucket", an_unmatched_row_never_becomes_a_bucket)
    record("an empty category still reports", an_empty_category_still_reports)
    record("a missing amount does not move the average", a_missing_amount_does_not_move_the_average)
    record("a tie is broken alphabetically", a_tie_is_broken_alphabetically)
    record("a missing amount counts as zero when unmatched", a_missing_amount_counts_as_zero_when_unmatched)
`

export const pandasDataframesLesson: PythonLesson = {
  id: "py-l3-pandas-dataframes",
  title: "pandas: DataFrames, filtering & groupby",
  summary: "Load a CSV, select and filter rows, total by group, and survive missing values.",
  estimatedMinutes: 25,
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
    prompt: `Repair the monthly spend-by-category report. Finance says the totals are short, one
category has vanished from the output, and an average looks too low.

The transaction feed and the category reference table come from two different systems, so some
transactions carry a category id that the reference table does not have, and a voided sale arrives
with a blank amount. Implement the two cleaning helpers in \`ledger/clean.py\` and the three
reporting helpers in \`ledger/report.py\`. The README states what each one owes its caller,
including what happens to a category nothing was spent in and to a row that matched nothing.
Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Two rows never match the reference table, and one row has no amount. Decide what each of those is worth before you write the totals loop, because they are not worth the same thing.",
      "Build the report dict from `categories.values()` first, so a category with no transactions is already present with zeros, then walk the rows and add to the buckets that exist.",
      'A missing amount must skip both `total` and `count`, or the average is computed over a row that never happened. For ties, `sorted(report, key=lambda name: (-report[name]["total"], name))` sorts on total descending and name ascending in one pass.',
    ],
    workspace: {
      language: "python",
      primaryFilePath: "ledger/clean.py",
      editableFilePaths: ["ledger/clean.py", "ledger/report.py"],
      visibleTestPaths: ["tests/test_ledger.py"],
      hiddenTestPaths: ["tests/test_ledger_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: LEDGER_README },
        { path: "ledger/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "ledger/feed.py",
          role: "readonly",
          language: "python",
          content: LEDGER_FEED,
          description: "The transaction feed and the category reference table (read-only)",
        },
        {
          path: "ledger/clean.py",
          role: "editable",
          language: "python",
          content: LEDGER_CLEAN_STARTER,
          description: "Type the rows and join them to their categories",
        },
        {
          path: "ledger/report.py",
          role: "editable",
          language: "python",
          content: LEDGER_REPORT_STARTER,
          description: "Summarise, rank, and account for the unmatched rows",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_ledger.py",
          role: "test",
          language: "python",
          content: LEDGER_TEST,
          description: "Visible ledger tests",
        },
        {
          path: "tests/test_ledger_hidden.py",
          role: "test",
          language: "python",
          content: LEDGER_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_ledger", label: "visible ledger" },
            { module: "test_ledger_hidden", label: "hidden ledger" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "ledger/clean.py",
          role: "editable",
          language: "python",
          content: LEDGER_CLEAN_REFERENCE,
        },
        {
          path: "ledger/report.py",
          role: "editable",
          language: "python",
          content: LEDGER_REPORT_REFERENCE,
        },
      ],
    },
  },
}

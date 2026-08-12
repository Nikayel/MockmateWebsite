import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const LG_README = `# The nightly meter import drops rows on the floor

The overnight job that imports smart-meter readings finishes green every morning, and finance keeps
asking why the billed totals are short. The job wraps its loop in \`except Exception: continue\`, so
every row it cannot read disappears without a trace. Your ticket: one bad row must not abort the
run, and it must not vanish either.

Two files to write.

## \`ingest/record.py\` is the boundary for a single row

\`parse_reading(row)\` takes one row like \`{"meter": "m-01", "kwh": "120"}\` and returns the reading
as an int. When the row cannot be read, it raises \`BadReading(row, reason)\` from
\`ingest/errors.py\` (read-only), which carries the offending row so the caller can report it. The
three reasons, and their constants in that module:

| Situation | Reason constant |
| --- | --- |
| the row has no \`"kwh"\` key | \`MISSING_KWH\` |
| \`int()\` rejects the \`"kwh"\` text | \`UNPARSABLE_KWH\` |
| the reading parses but is below zero | \`NEGATIVE_KWH\` |

The first two of those start life as some other exception. Keep that original exception attached as
the cause of the \`BadReading\`, so the traceback still shows what actually went wrong.

Anything else is not a bad row, it is a broken export: a \`"kwh"\` of \`None\` means the upstream
system wrote a null, and that must stop the run rather than be filed as one skipped meter.

## \`ingest/batch.py\` decides the policy

\`import_batch(rows, source)\` walks the rows and returns:

\`\`\`python
{"total": 240, "imported": 2, "failures": [{"meter": "m-02", "reason": "unparsable kwh"}]}
\`\`\`

\`total\` is the sum of the readings that were imported, \`imported\` counts them, and \`failures\`
lists one entry per unreadable row in the order they were met. \`source\` is the export handle from
\`ingest/source.py\` (read-only); it must be closed before \`import_batch\` returns, and also on the
way out when an error leaves the function.

Some tests are hidden.
`

const LG_ERRORS = String.raw`"""Read-only. The error vocabulary the import job reports with."""

MISSING_KWH = "missing kwh"
UNPARSABLE_KWH = "unparsable kwh"
NEGATIVE_KWH = "negative kwh"


class BadReading(Exception):
    """One row could not be read. Carries the offending row so the caller can report it."""

    def __init__(self, row, reason):
        super().__init__(reason)
        self.row = row
        self.reason = reason
`

const LG_SOURCE = String.raw`"""Read-only. A stand-in for the nightly export handle.

The real one holds a file and a network session. This sandbox has neither, so it only
records whether it was closed.
"""


class ReadingSource:
    def __init__(self, name="nightly-export"):
        self.name = name
        self.closed = False
        self.close_count = 0

    def close(self):
        self.closed = True
        self.close_count += 1
`

const LG_RECORD_STARTER = String.raw`from ingest.errors import BadReading, MISSING_KWH, NEGATIVE_KWH, UNPARSABLE_KWH


def parse_reading(row):
    """Return one row's reading as an int, or raise BadReading (see README.md)."""
    # TODO: return the reading, and raise BadReading with the matching reason when you cannot.
    return 0
`

const LG_RECORD_REFERENCE = String.raw`from ingest.errors import BadReading, MISSING_KWH, NEGATIVE_KWH, UNPARSABLE_KWH


def parse_reading(row):
    try:
        raw = row["kwh"]
    except KeyError as err:
        raise BadReading(row, MISSING_KWH) from err

    try:
        kwh = int(raw)
    except ValueError as err:
        raise BadReading(row, UNPARSABLE_KWH) from err

    if kwh < 0:
        raise BadReading(row, NEGATIVE_KWH)
    return kwh
`

const LG_BATCH_STARTER = String.raw`from ingest.errors import BadReading
from ingest.record import parse_reading


def import_batch(rows, source):
    """Import every readable row and report the rest (see README.md)."""
    # TODO: build the total, the imported count and the failures list, and close the source.
    return {"total": 0, "imported": 0, "failures": []}
`

const LG_BATCH_REFERENCE = String.raw`from ingest.errors import BadReading
from ingest.record import parse_reading


def import_batch(rows, source):
    total = 0
    imported = 0
    failures = []
    try:
        for row in rows:
            try:
                kwh = parse_reading(row)
            except BadReading as err:
                failures.append({"meter": err.row.get("meter"), "reason": err.reason})
                continue
            total += kwh
            imported += 1
    finally:
        source.close()
    return {"total": total, "imported": imported, "failures": failures}
`

const LG_TEST = String.raw`from ingest.batch import import_batch
from ingest.errors import BadReading, MISSING_KWH, UNPARSABLE_KWH
from ingest.record import parse_reading
from ingest.source import ReadingSource


def run_tests(record):
    def parses_a_good_row():
        got = parse_reading({"meter": "m-01", "kwh": "120"})
        assert got == 120, f"expected 120, got {got!r}"

    def bad_row_raises_carrying_the_row():
        row = {"meter": "m-02"}
        try:
            parse_reading(row)
        except BadReading as err:
            assert err.reason == MISSING_KWH, f"expected {MISSING_KWH!r}, got {err.reason!r}"
            assert err.row is row, f"expected the offending row, got {err.row!r}"
        else:
            raise AssertionError("expected BadReading, got a normal return")

    def imports_every_readable_row():
        source = ReadingSource()
        got = import_batch([{"meter": "m-01", "kwh": "120"}, {"meter": "m-02", "kwh": "20"}], source)
        assert got["total"] == 140, f"expected total 140, got {got['total']!r}"
        assert got["imported"] == 2, f"expected imported 2, got {got['imported']!r}"
        assert got["failures"] == [], f"expected no failures, got {got['failures']!r}"

    def one_bad_row_is_reported_not_dropped():
        source = ReadingSource()
        rows = [
            {"meter": "m-01", "kwh": "120"},
            {"meter": "m-02", "kwh": "twelve"},
            {"meter": "m-03", "kwh": "20"},
        ]
        got = import_batch(rows, source)
        assert got["total"] == 140, f"expected total 140, got {got['total']!r}"
        assert got["imported"] == 2, f"expected imported 2, got {got['imported']!r}"
        expected = [{"meter": "m-02", "reason": UNPARSABLE_KWH}]
        assert got["failures"] == expected, f"expected {expected!r}, got {got['failures']!r}"

    def closes_the_source_on_the_happy_path():
        source = ReadingSource()
        import_batch([{"meter": "m-01", "kwh": "5"}], source)
        assert source.closed is True, f"expected closed True, got {source.closed!r}"
        assert source.close_count == 1, f"expected close_count 1, got {source.close_count!r}"

    record("parses a good row", parses_a_good_row)
    record("a bad row raises BadReading carrying the row", bad_row_raises_carrying_the_row)
    record("imports every readable row", imports_every_readable_row)
    record("one bad row is reported, not dropped", one_bad_row_is_reported_not_dropped)
    record("closes the source on the happy path", closes_the_source_on_the_happy_path)
`

const LG_TEST_HIDDEN = String.raw`from ingest.batch import import_batch
from ingest.errors import BadReading, NEGATIVE_KWH, UNPARSABLE_KWH
from ingest.record import parse_reading
from ingest.source import ReadingSource


def run_tests(record):
    def keeps_the_original_error_as_the_cause():
        try:
            parse_reading({"meter": "m-09", "kwh": "twelve"})
        except BadReading as err:
            assert err.reason == UNPARSABLE_KWH, f"expected {UNPARSABLE_KWH!r}, got {err.reason!r}"
            assert isinstance(err.__cause__, ValueError), (
                f"expected the ValueError kept as __cause__, got {err.__cause__!r}"
            )
        else:
            raise AssertionError("expected BadReading, got a normal return")

    def a_negative_reading_is_a_failure():
        source = ReadingSource()
        rows = [{"meter": "m-01", "kwh": "-4"}, {"meter": "m-02", "kwh": "nope"}]
        got = import_batch(rows, source)
        assert got["total"] == 0, f"expected total 0, got {got['total']!r}"
        expected = [
            {"meter": "m-01", "reason": NEGATIVE_KWH},
            {"meter": "m-02", "reason": UNPARSABLE_KWH},
        ]
        assert got["failures"] == expected, f"expected {expected!r}, got {got['failures']!r}"

    def a_null_reading_stops_the_run():
        source = ReadingSource()
        rows = [{"meter": "m-01", "kwh": "10"}, {"meter": "m-02", "kwh": None}]
        try:
            got = import_batch(rows, source)
        except TypeError:
            pass
        else:
            raise AssertionError(f"expected TypeError to escape, got a result of {got!r}")
        assert source.closed is True, f"expected the source closed anyway, got {source.closed!r}"

    def an_empty_batch_reports_nothing():
        source = ReadingSource()
        got = import_batch([], source)
        expected = {"total": 0, "imported": 0, "failures": []}
        assert got == expected, f"expected {expected!r}, got {got!r}"
        assert source.closed is True, f"expected closed True, got {source.closed!r}"

    record("keeps the original error as the cause", keeps_the_original_error_as_the_cause)
    record("a negative reading is a failure", a_negative_reading_is_a_failure)
    record("a null reading stops the run", a_null_reading_stops_the_run)
    record("an empty batch reports nothing", an_empty_batch_reports_nothing)
`

export const loggingErrorsLesson: PythonLesson = {
  id: "py-l3-logging-errors",
  title: "Error boundaries & logging habits",
  summary: "Use logging instead of print and design where errors get caught.",
  estimatedMinutes: 22,
  difficulty: "medium",
  skills: ["logging", "exceptions", "error-boundaries", "robustness"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Logging and where to handle errors

### Why this matters

\`print\` is fine for a script you run once and watch. It falls apart in anything that runs unattended: a batch job, a web handler, a scheduled ETL. You cannot filter \`print\` by severity, cannot silence it in production without deleting lines, and cannot tell an error apart from a debug trace in a log file. \`logging\` fixes all three. The other half of robustness is deciding *where* a failure is handled. Get that wrong and one malformed row aborts a job that should have processed the other 99,999.

### The logging model

A logger is a named channel. You grab one per module with \`logging.getLogger(__name__)\` and emit at a level: \`debug\`, \`info\`, \`warning\`, \`error\`, \`critical\`. Where those messages go (console, file, or both) and how verbose they are is configured once, at program start, not at each call site:

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "logger-info-invisible",
  "prompt": "A fresh script does logger = logging.getLogger(__name__) and then logger.info('job started'). There is no other logging setup anywhere. What shows up on the console?",
  "options": [
    {
      "label": "The line prints. info is a normal severity and logging is imported.",
      "feedback": "Tempting, because info sounds like the everyday level and it is the one most people reach for first. A logger's effective level starts at WARNING, so info sits below the bar and never gets emitted."
    },
    {
      "label": "Nothing, and no error either. The default effective level is WARNING.",
      "correct": true,
      "feedback": "Right. The record is discarded in silence, which is why 'my logs vanished' is almost always this. One call to logging.basicConfig(level=logging.INFO) at startup lowers the bar."
    },
    {
      "label": "Nothing, plus a complaint that no handler was configured.",
      "feedback": "Close, and that complaint genuinely existed in older Python: 'No handlers could be found for logger'. Modern Python ships a last-resort handler instead, so this call produces no output of any kind."
    }
  ]
}
\`\`\`

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Level", "Use it for", "Visible by default?", "Who reads it"],
  "rows": [
    ["debug", "values while tracing a problem", "no", "you, while debugging"],
    ["info", "normal milestones: job started, 500 rows written", "no", "you, reading yesterday's run"],
    ["warning", "something odd but survivable: a retry, a fallback", "yes", "whoever is on call"],
    ["error", "this operation failed", "yes", "whoever is on call"],
    ["critical", "the process cannot continue", "yes", "whoever gets paged"]
  ],
  "highlightCols": ["Visible by default?"],
  "caption": "The highlighted column is the whole of the vanishing-logs mystery: a fresh logger's effective level is WARNING, so debug and info are discarded silently until basicConfig(level=logging.INFO) lowers the bar. Nothing errors, the lines simply never appear."
}
\`\`\`

\`\`\`python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("processing %d records", len(records))
logger.warning("skipping bad record: %r", raw)
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "percent-args-vs-fstring",
  "prompt": "Library code writes logger.debug('row %r failed', raw) rather than logger.debug(f'row {raw!r} failed'). Debug logging is switched off in production. What does the first form buy you?",
  "options": [
    {
      "label": "Nothing real. f-strings are the fastest formatting in Python, so this is just an old habit.",
      "feedback": "Tempting, because f-strings genuinely are the fastest way to build a string, and for ordinary code they are the right default. The saving here is not building the string at all."
    },
    {
      "label": "logging formats the message only if the record will be emitted, so with debug off nothing is formatted.",
      "correct": true,
      "feedback": "Right. logging checks isEnabledFor before doing any interpolation. The f-string version builds its string eagerly on every call, including the millions of calls that end up logging nothing."
    },
    {
      "label": "It is required. logging cannot accept an already-formatted string.",
      "feedback": "Not so: handing logging a finished string is perfectly legal and extremely common. It simply gives up the lazy formatting, which is the one and only reason to prefer the %-style call."
    }
  ]
}
\`\`\`

Note the \`%d\` and \`%r\` with trailing args instead of an f-string. \`logging\` interpolates the message only if the record is actually emitted (more on that below).

### Error boundaries: raise low, catch high

Do not wrap every line in \`try\`/\`except\`. Decide the *boundary* that can actually recover. The common shape: a low-level helper raises on bad input, and the loop that owns the batch catches and skips, so one bad record does not sink the rest.

\`\`\`python
def safe_total(raws):
    total = 0
    for raw in raws:
        try:
            total += int(raw)     # raises ValueError on "x"
        except ValueError:
            continue              # skip; real code would logger.warning(...)
    return total

print(safe_total(["1", "x", "3"]))   # 4
\`\`\`

\`int("x")\` raises \`ValueError\`, the loop swallows just that one, and \`1 + 3\` gives \`4\`.

### Pitfalls

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "catch-narrow-not-broad",
  "prompt": "Your batch loop must skip rows that fail to parse, so you write: except Exception: continue. Weeks later someone introduces a typo in the loop body that references a name which does not exist. What does the job do?",
  "options": [
    {
      "label": "It crashes with NameError, so the typo is found on the very next run.",
      "feedback": "That is what you want to happen, and it is exactly what a narrow except ValueError would have given you. except Exception catches NameError too, so the typo is swallowed once per row instead."
    },
    {
      "label": "It skips every row and reports success with a total of zero.",
      "correct": true,
      "feedback": "Right. A broad except turns a real defect into silence, and silence is far more expensive to debug than a crash. Catch the specific type you expect so genuine bugs still surface."
    },
    {
      "label": "Nothing changes, because NameError is not a subclass of Exception.",
      "feedback": "Tempting, because a few exceptions really do sit outside it: KeyboardInterrupt and SystemExit inherit from BaseException, which is why a bare except: is even worse. NameError is an ordinary Exception."
    }
  ]
}
\`\`\`

- **Catching too broadly.** \`except Exception:\` hides a typo'd name (\`NameError\`) alongside the errors you meant to skip; a bare \`except:\` is worse, also catching \`KeyboardInterrupt\` so you cannot even Ctrl-C out. Catch the specific type you expect (\`ValueError\`) and real bugs still surface.
- **\`int\` is pickier than you think.** \`int("3.5")\` raises \`ValueError\` (it is not an integer literal), so \`safe_total(["3.5"])\` returns \`0\`, not \`3\`. And \`int(None)\` raises \`TypeError\`, which \`except ValueError\` will not catch at all.
- **Silent logs.** A fresh logger's effective level defaults to \`WARNING\`, so \`logger.info(...)\` prints nothing until you call \`basicConfig(level=logging.INFO)\`. "My logs vanished" is almost always this.

**Interview nuance:** prefer \`logger.info("n=%d", n)\` over \`logger.info(f"n={n}")\`. \`logging\` checks \`isEnabledFor(level)\` first and only formats the message if the record will actually be emitted, so the \`%\`-style call skips string building when that level is off. The f-string builds the string eagerly on every call, including calls that log nothing. On a hot path with expensive \`%r\` values, that difference is measurable.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "what-except-valueerror-covers",
  "prompt": "safe_total loops over raw values, does total += int(raw), and guards it with except ValueError: continue. Sort each incoming value by what the loop does with it.",
  "buckets": ["Counted", "Skipped by the guard", "Crashes the loop"],
  "items": [
    {
      "label": "'12'",
      "bucket": "Counted",
      "feedback": "The ordinary path. int('12') is 12 and the guard never fires."
    },
    {
      "label": "'  7  '",
      "bucket": "Counted",
      "feedback": "int strips surrounding whitespace before parsing, so this is 7. You do not need to strip it yourself."
    },
    {
      "label": "'x'",
      "bucket": "Skipped by the guard",
      "feedback": "int('x') raises ValueError, which is precisely the case the guard was written for."
    },
    {
      "label": "'3.5'",
      "bucket": "Skipped by the guard",
      "feedback": "This one surprises people. '3.5' is not an integer literal, so int() raises ValueError and the row contributes 0, not 3. If you wanted 3 you would have to go through float first."
    },
    {
      "label": "an empty string",
      "bucket": "Skipped by the guard",
      "feedback": "int('') raises ValueError, so an empty field is skipped rather than quietly counted as zero. Same outcome here, different reason."
    },
    {
      "label": "None",
      "bucket": "Crashes the loop",
      "feedback": "int(None) raises TypeError, and except ValueError does not catch it. One null in the source data takes down a job that handled every malformed string just fine."
    }
  ],
  "reveal": "Two lessons in one table. int() is pickier than it looks, and a narrow except covers only the type you named. Either widen the guard on purpose to (ValueError, TypeError), or reject None before it reaches the parse."
}
\`\`\``,
    demoCode: `def safe_total(raws):
    total = 0
    for raw in raws:
        try:
            total += int(raw)
        except ValueError:
            continue
    return total


print(safe_total(["1", "x", "3"]))   # 4`,
  },
  apply: {
    id: "py-l3-logging-errors-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`safe_total(raws)\`. Total the strings in \`raws\` that parse as
integers, **skipping** any that don't.

\`safe_total(["1", "x", "3"])\` is \`4\`.`,
    starterCode: `def safe_total(raws):
    # Sum the values that int() accepts; skip the ones that raise ValueError.
    pass`,
    hints: [
      "Loop the raws and `try: total += int(raw)`.",
      "On `except ValueError:` use `continue` to skip that one.",
      "Return the running total after the loop.",
    ],
    referenceSolution: `def safe_total(raws):
    total = 0
    for raw in raws:
        try:
            total += int(raw)
        except ValueError:
            continue
    return total`,
    testCases: [
      { input: { raws: ["1", "2", "3"] }, expected: 6, description: "all valid" },
      { input: { raws: ["1", "x", "3"] }, expected: 4, description: "one invalid skipped" },
      { input: { raws: [] }, expected: 0, description: "empty list" },
      { input: { raws: ["10", " ", "5"] }, expected: 15, description: "blank skipped" },
    ],
  },
  practice: {
    id: "py-l3-logging-errors-practice",
    executionMode: "workspace",
    prompt: `Repair the nightly meter import, which finishes green every morning while finance reports the
billed totals are short. Its loop catches everything and continues, so unreadable rows disappear
without a trace.

Implement \`parse_reading(row)\` in \`ingest/record.py\` and \`import_batch(rows, source)\` in
\`ingest/batch.py\`. One unreadable row must not abort the run, and it must not vanish either:
\`import_batch\` returns the imported total and count alongside a list of the rows it could not read.
A \`"kwh"\` of \`None\` is a broken export rather than a bad row, and has to stop the run. The README
has the exact reason constants and the shape of the returned report. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Two different jobs. `parse_reading` decides that one row is unreadable; `import_batch` decides what the run does about it. Neither should do the other's work.",
      "In `parse_reading`, a missing key and an unparsable value arrive as two different exceptions. Catch each one narrowly and re-raise it as a `BadReading`, using `raise ... from err` so the original is kept as the cause. Leave anything you did not name alone so it travels on up.",
      "In `import_batch`, `except BadReading as err:` gives you `err.row` and `err.reason` for the failures entry, then `continue`. Wrap the whole loop in `try: ... finally: source.close()` so the source closes on both the normal exit and the escaping error.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "ingest/record.py",
      editableFilePaths: ["ingest/record.py", "ingest/batch.py"],
      visibleTestPaths: ["tests/test_import.py"],
      hiddenTestPaths: ["tests/test_import_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: LG_README },
        {
          path: "ingest/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "ingest/errors.py",
          role: "readonly",
          language: "python",
          content: LG_ERRORS,
          description: "BadReading and the reason constants (read-only)",
        },
        {
          path: "ingest/source.py",
          role: "readonly",
          language: "python",
          content: LG_SOURCE,
          description: "The export handle that has to be closed (read-only)",
        },
        {
          path: "ingest/record.py",
          role: "editable",
          language: "python",
          content: LG_RECORD_STARTER,
          description: "The per-row boundary: implement parse_reading here",
        },
        {
          path: "ingest/batch.py",
          role: "editable",
          language: "python",
          content: LG_BATCH_STARTER,
          description: "The batch policy: implement import_batch here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_import.py",
          role: "test",
          language: "python",
          content: LG_TEST,
          description: "Visible import tests",
        },
        {
          path: "tests/test_import_hidden.py",
          role: "test",
          language: "python",
          content: LG_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_import", label: "visible import" },
            { module: "test_import_hidden", label: "hidden import" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "ingest/record.py",
          role: "editable",
          language: "python",
          content: LG_RECORD_REFERENCE,
        },
        {
          path: "ingest/batch.py",
          role: "editable",
          language: "python",
          content: LG_BATCH_REFERENCE,
        },
      ],
    },
  },
}

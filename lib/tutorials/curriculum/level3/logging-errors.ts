import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const LG_README = `# Robust totals with an error boundary

\`processing/parsing.py\` (read-only) has \`to_amount(raw)\`, which converts text to an int and
**raises** \`ValueError\` on bad input. Implement \`safe_total(raws)\` in \`processing/totals.py\` so
it totals every value that parses and **skips** the ones that don't (a clean error boundary).

Example: \`safe_total(["1", "x", "3"])\` is \`4\`. Some tests are hidden.
`

const LG_PARSING = String.raw`def to_amount(raw):
    """Convert raw text to an int amount. Raises ValueError on bad input."""
    return int(raw)
`

const LG_TOTALS_STARTER = String.raw`from processing.parsing import to_amount


def safe_total(raws):
    """Total the values that parse, skipping any that raise ValueError (see README.md)."""
    # TODO: try to_amount(raw) for each; skip the ones that raise.
    return 0
`

const LG_TOTALS_REFERENCE = String.raw`from processing.parsing import to_amount


def safe_total(raws):
    total = 0
    for raw in raws:
        try:
            total += to_amount(raw)
        except ValueError:
            continue
    return total
`

const LG_TEST = String.raw`from processing.totals import safe_total


def run_tests(record):
    def sums_valid_amounts():
        assert safe_total(["1", "2", "3"]) == 6, f"got {safe_total(['1','2','3'])!r}"

    def skips_invalid_amounts():
        assert safe_total(["1", "x", "3"]) == 4, f"got {safe_total(['1','x','3'])!r}"

    def empty_list_is_zero():
        assert safe_total([]) == 0

    record("sums valid amounts", sums_valid_amounts)
    record("skips invalid amounts", skips_invalid_amounts)
    record("empty list totals 0", empty_list_is_zero)
`

const LG_TEST_HIDDEN = String.raw`from processing.totals import safe_total


def run_tests(record):
    def skips_blank_strings():
        assert safe_total(["10", " ", "5"]) == 15, f"got {safe_total(['10',' ','5'])!r}"

    def all_invalid_is_zero():
        assert safe_total(["a", "b"]) == 0, f"got {safe_total(['a','b'])!r}"

    record("skips blank strings", skips_blank_strings)
    record("all invalid totals 0", all_invalid_is_zero)
`

export const loggingErrorsLesson: PythonLesson = {
  id: "py-l3-logging-errors",
  title: "Error boundaries & logging habits",
  summary: "Use logging instead of print and design where errors get caught.",
  estimatedMinutes: 17,
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
    prompt: `Implement \`safe_total(raws)\` in \`processing/totals.py\`: use the read-only \`to_amount\` helper
(which raises \`ValueError\` on bad input) to total the valid values, skipping the rest. Some tests
are hidden.`,
    starterCode: "",
    hints: [
      "`to_amount` is imported for you. Call it inside a `try`.",
      "Catch `ValueError` and `continue` to skip bad records.",
      "Return the accumulated total.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "processing/totals.py",
      editableFilePaths: ["processing/totals.py"],
      visibleTestPaths: ["tests/test_totals.py"],
      hiddenTestPaths: ["tests/test_totals_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: LG_README },
        {
          path: "processing/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "processing/parsing.py",
          role: "readonly",
          language: "python",
          content: LG_PARSING,
          description: "to_amount helper (read-only, raises on bad input)",
        },
        {
          path: "processing/totals.py",
          role: "editable",
          language: "python",
          content: LG_TOTALS_STARTER,
          description: "Implement safe_total here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_totals.py",
          role: "test",
          language: "python",
          content: LG_TEST,
          description: "Visible error-boundary tests",
        },
        {
          path: "tests/test_totals_hidden.py",
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
            { module: "test_totals", label: "visible totals" },
            { module: "test_totals_hidden", label: "hidden totals" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "processing/totals.py",
          role: "editable",
          language: "python",
          content: LG_TOTALS_REFERENCE,
        },
      ],
    },
  },
}

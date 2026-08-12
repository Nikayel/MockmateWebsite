import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// L3-M4: Files, Data & Robustness
// ───────────────────────────────────────────────────────────────────────────

const PL_README = `# Total a scores file with pathlib

Read real files with \`pathlib\`. Implement \`total_score(path)\` in \`reports/scores.py\` so it reads
the file at \`path\` and returns the **sum of the integer on each non-blank line**.

The \`data/\` folder holds the score files. Blank lines are skipped. Some tests are hidden.
`

const PL_SCORES = "10\n20\n30\n"
const PL_SCORES2 = "5\n5\n5\n5\n"
const PL_SCORES_BLANKS = "3\n\n4\n"
const PL_SCORES_EMPTY = ""

const PL_SCORES_STARTER = String.raw`from pathlib import Path


def total_score(path):
    """Sum the integer on each non-blank line of the file at path (see README.md)."""
    # TODO: read the file with pathlib, then sum its integer lines.
    return 0
`

const PL_SCORES_REFERENCE = String.raw`from pathlib import Path


def total_score(path):
    text = Path(path).read_text()
    return sum(int(line) for line in text.splitlines() if line.strip())
`

const PL_TEST = String.raw`from reports.scores import total_score


def run_tests(record):
    def sums_the_scores_file():
        result = total_score("data/scores.txt")
        assert result == 60, f"expected 60, got {result!r}"

    def sums_another_file():
        result = total_score("data/scores2.txt")
        assert result == 20, f"expected 20, got {result!r}"

    record("sums the scores file", sums_the_scores_file)
    record("sums another file", sums_another_file)
`

const PL_TEST_HIDDEN = String.raw`from reports.scores import total_score


def run_tests(record):
    def ignores_blank_lines():
        result = total_score("data/with_blanks.txt")
        assert result == 7, f"expected 7, got {result!r}"

    def empty_file_is_zero():
        result = total_score("data/empty.txt")
        assert result == 0, f"expected 0, got {result!r}"

    record("ignores blank lines", ignores_blank_lines)
    record("empty file totals 0", empty_file_is_zero)
`

export const pathlibLesson: PythonLesson = {
  id: "py-l3-pathlib",
  title: "pathlib & file processing",
  summary: "Read and transform real files in a project with pathlib.",
  estimatedMinutes: 17,
  difficulty: "medium",
  skills: ["pathlib", "files", "text-processing", "io"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## Why file paths break in production

The bug that ruins a data pipeline at 2am is rarely the algorithm. It is a path. A script that reads \`data/scores.txt\` works on your laptop and fails on the server because the two machines were launched from different directories. Hardcoded string paths are also fragile across operating systems, where the path separator differs. \`pathlib.Path\` exists to make paths a real object with methods instead of fragile strings you glue together by hand. As a data engineer you touch files constantly (CSVs, logs, exports), so getting this layer right is table stakes.

## The mental model

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "path-does-no-io",
  "prompt": "You run p = Path('data/scores.txt') on a machine where no such file exists. What happens on that line?",
  "options": [
    {
      "label": "FileNotFoundError, because the path does not point at anything.",
      "feedback": "Tempting, because the name looks like it refers to a real file and most file APIs do fail fast. Building a Path is pure string work: nothing touches disk until you call something like read_text or exists."
    },
    {
      "label": "Nothing at all. You get a Path object and no disk access happens yet.",
      "correct": true,
      "feedback": "Right. A Path represents a location, not contents. That is what lets you build and manipulate paths for files you are about to create, and it is why exists() has to be a separate call."
    },
    {
      "label": "It creates an empty file at that location.",
      "feedback": "Tempting if you are thinking of shell redirection or open(path, 'w'), both of which really do create the file. Constructing a Path writes nothing. Even touch(), which does create it, is a separate explicit call."
    }
  ]
}
\`\`\`

A \`Path\` is an object that represents a location, not the file's contents. Building one does no I/O and does not require the file to exist. You only touch disk when you call a method like \`read_text()\` or \`exists()\`.

\`\`\`python
from pathlib import Path

p = Path("data") / "scores.txt"   # "/" joins path parts, OS-correct
p.exists()                        # True / False, cheap check
p.suffix                          # ".txt"
text = p.read_text(encoding="utf-8")   # whole file -> one str
\`\`\`

The \`/\` operator is real: \`Path\` overloads it so \`Path("data") / "scores.txt"\` builds the joined path with the correct separator on any OS. Prefer it over \`"data/" + name\`.

Once you have a \`Path\`, its parts are attributes rather than string surgery:

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "suffix-double-extension",
  "prompt": "A pipeline receives a file named archive.tar.gz. For Path('archive.tar.gz'), what do .suffix and .stem give you?",
  "options": [
    {
      "label": "'.tar.gz' and 'archive'",
      "feedback": "Tempting, because that is how a human reads the filename: the extension is tar.gz and the name is archive. Both attributes look only at the LAST dot, so they cut the name in a different place than you would."
    },
    {
      "label": "'.gz' and 'archive.tar'",
      "correct": true,
      "feedback": "Right. Both split on the final dot. When you need the whole compound extension, .suffixes hands you ['.tar', '.gz'] as a list."
    },
    {
      "label": "'gz' and 'archive.tar'",
      "feedback": "Half right, and you got the harder half: the stem really is archive.tar. But .suffix keeps its leading dot, so it is '.gz'. That dot is exactly why a comparison like p.suffix == 'csv' quietly never matches anything."
    }
  ]
}
\`\`\`

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Attribute", "Value for Path('data/reports/scores.csv')", "What you reach for it for"],
  "rows": [
    [".name", "scores.csv", "the filename, extension included"],
    [".stem", "scores", "the filename without the extension"],
    [".suffix", ".csv", "the extension, INCLUDING the leading dot"],
    [".parent", "data/reports", "the containing directory, itself a Path"],
    [".parts", "('data', 'reports', 'scores.csv')", "every segment as a tuple"]
  ],
  "highlightCols": ["Value for Path('data/reports/scores.csv')"],
  "caption": "Two of these bite. .suffix keeps the dot, so comparing it to 'csv' always fails and you want '.csv'. And on a double extension like archive.tar.gz, .suffix is only '.gz' while .stem is still 'archive.tar', because both look at the LAST dot only."
}
\`\`\`

## Turning text into data

\`read_text()\` hands you the entire file as one string. Split it into lines, then convert:

\`\`\`python
text = "10\\n20\\n30"
numbers = [int(line) for line in text.splitlines() if line.strip()]
print(sum(numbers))   # 60
\`\`\`

\`splitlines()\` breaks on line boundaries and drops the \`\\n\` characters. The \`if line.strip()\` guard skips blank or whitespace-only lines so \`int()\` never receives an empty string. \`int()\` itself strips surrounding whitespace, so \`int(" 10 ")\` returns \`10\` without extra work. This is exactly the shape both exercises want: first sum the numbers in a string, then read a real file with \`Path(path).read_text()\` and run the same pipeline.

## Pitfalls

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "splitlines-vs-split-newline",
  "prompt": "A real scores file ends with a trailing newline, the way almost every file written by an editor does. Your code splits the text on the newline character with split(), then calls int() on each piece. What happens?",
  "options": [
    {
      "label": "It works. Splitting on newlines is what splitlines does anyway.",
      "feedback": "Tempting, because for a file with no trailing newline the two really are identical, which is how this bug survives every hand-written test fixture. The trailing newline leaves an empty string as the final piece."
    },
    {
      "label": "ValueError, because int() is handed the empty string left after the last newline.",
      "correct": true,
      "feedback": "Right. split leaves a phantom empty piece after a trailing separator, while splitlines drops it. Use splitlines, or keep an if line.strip() guard, or both. The guard also covers blank lines in the middle."
    },
    {
      "label": "It quietly returns a total that is short by the last line.",
      "feedback": "Close to a real class of bug, and a silent wrong number really is the worst outcome. This one is loud though: int('') raises ValueError instead of politely returning 0."
    }
  ]
}
\`\`\`

Real files almost always end with a trailing newline, and that is where interns get burned. Compare:

\`\`\`python
"10\\n20\\n30\\n".split("\\n")     # ['10', '20', '30', '']  <- trailing ''
"10\\n20\\n30\\n".splitlines()    # ['10', '20', '30']       <- clean
\`\`\`

If you use \`split("\\n")\` you get a phantom empty string at the end, and \`int("")\` raises \`ValueError\`. Use \`splitlines()\`, or keep the \`if line.strip()\` guard, or both. That guard is your safety net for blank lines anywhere in the file, not just the last one.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "cwd-not-script-dir",
  "prompt": "A script at tools/report.py opens Path('data/scores.txt'). It works when you run 'python tools/report.py' from the project root. A teammate cds into tools/ and runs 'python report.py' instead. What do they get?",
  "options": [
    {
      "label": "It works. The path is written inside report.py, so it is anchored to that file.",
      "feedback": "Tempting, because the path literal lives in report.py and it feels like it should travel with the file. A relative path is resolved against the current working directory, which is wherever the process was launched from."
    },
    {
      "label": "FileNotFoundError. The relative path now resolves under tools/, not the project root.",
      "correct": true,
      "feedback": "Right, and this is the classic 'works on my machine' path bug. When the answer has to be stable, anchor it explicitly: Path(__file__).parent and build outward from there."
    },
    {
      "label": "It works, because Python puts the script's own directory on the path.",
      "feedback": "You are thinking of sys.path, which really does receive the script's directory, and that is what makes imports resolve. sys.path governs module lookup only. File I/O never consults it."
    }
  ]
}
\`\`\`

The second trap: a relative path like \`Path("data/scores.txt")\` resolves against the current working directory, which is wherever the process was launched, not where your script file lives. Run the same code from a different folder and it fails. When it matters, anchor to the file with \`Path(__file__).parent / "data" / "scores.txt"\`.

**Interview nuance:** \`read_text()\` loads the whole file into memory at once, so its memory cost is O(n) in file size. That is fine for a scores file, but if an interviewer swaps in a multi-gigabyte log, stream it instead and keep memory O(1):

\`\`\`python
with Path(path).open(encoding="utf-8") as f:
    total = sum(int(line) for line in f if line.strip())
\`\`\`

Iterating a file object yields one line at a time without holding the whole file in memory. Knowing when to read all versus stream is exactly the tradeoff data-engineering interviewers probe.`,
    demoCode: `text = "10\\n20\\n30"
numbers = [int(line) for line in text.splitlines() if line.strip()]
print(sum(numbers))   # 60`,
  },
  apply: {
    id: "py-l3-pathlib-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`total_score(text)\`. Sum the integer on each non-blank line of
the string \`text\`.

For \`"10\\n20\\n30"\` return \`60\`. Skip blank lines.`,
    starterCode: `def total_score(text):
    # Sum the integer on each non-blank line.
    pass`,
    hints: [
      "`text.splitlines()` gives the lines without newline characters.",
      "Skip blanks with `if line.strip()` so `int()` never sees an empty line.",
      "`return sum(int(line) for line in text.splitlines() if line.strip())`.",
    ],
    referenceSolution: `def total_score(text):
    return sum(int(line) for line in text.splitlines() if line.strip())`,
    testCases: [
      { input: { text: "10\n20\n30" }, expected: 60, description: "three numbers" },
      { input: { text: "5\n5" }, expected: 10, description: "two numbers" },
      { input: { text: "3\n\n4" }, expected: 7, description: "blank line skipped" },
      { input: { text: "" }, expected: 0, description: "empty text" },
    ],
  },
  practice: {
    id: "py-l3-pathlib-practice",
    executionMode: "workspace",
    prompt: `Implement \`total_score(path)\` in \`reports/scores.py\`: read the file at \`path\` with \`pathlib\`
and return the sum of the integer on each non-blank line. The score files live in \`data/\`. Some
tests are hidden.`,
    starterCode: "",
    hints: [
      "Read the file: `Path(path).read_text()`.",
      "Split and guard: `for line in text.splitlines() if line.strip()`.",
      "Sum the parsed ints with a generator expression.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "reports/scores.py",
      editableFilePaths: ["reports/scores.py"],
      visibleTestPaths: ["tests/test_scores.py"],
      hiddenTestPaths: ["tests/test_scores_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PL_README },
        { path: "data/scores.txt", role: "readonly", language: "text", content: PL_SCORES },
        { path: "data/scores2.txt", role: "readonly", language: "text", content: PL_SCORES2 },
        {
          path: "data/with_blanks.txt",
          role: "readonly",
          language: "text",
          content: PL_SCORES_BLANKS,
          hidden: true,
        },
        {
          path: "data/empty.txt",
          role: "readonly",
          language: "text",
          content: PL_SCORES_EMPTY,
          hidden: true,
        },
        { path: "reports/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "reports/scores.py",
          role: "editable",
          language: "python",
          content: PL_SCORES_STARTER,
          description: "Implement total_score here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_scores.py",
          role: "test",
          language: "python",
          content: PL_TEST,
          description: "Visible file-reading tests",
        },
        {
          path: "tests/test_scores_hidden.py",
          role: "test",
          language: "python",
          content: PL_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_scores", label: "visible scores" },
            { module: "test_scores_hidden", label: "hidden scores" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "reports/scores.py",
          role: "editable",
          language: "python",
          content: PL_SCORES_REFERENCE,
        },
      ],
    },
  },
}

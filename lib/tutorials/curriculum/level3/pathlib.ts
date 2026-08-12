import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// L3-M4: Files, Data & Robustness
// ───────────────────────────────────────────────────────────────────────────

const PL_README = `# Summarize the nightly sensor export

Every night a job drops sensor readings into \`exports/\`. The folders are created by whoever
installed each sensor, so the tree is uneven: some readings sit at the top, some are nested two
directories deep, and unrelated files sit alongside them. The reporting job that reads this tree
was written against a flat directory and misses most of it.

Two modules are yours.

## \`catalog/discovery.py\`

**\`find_reading_files(root)\`** returns every reading file anywhere under \`root\`, at any depth,
as a list of \`Path\` objects sorted by their POSIX string form. A reading file is one whose
suffix is \`.csv\`. Anything else in the tree is not a reading file.

**\`summary_path(source)\`** returns the \`Path\` where a source file's summary belongs: the same
directory, the same filename, and \`.txt\` in place of the \`.csv\` extension.

\`\`\`python
summary_path(Path("exports/north/alpha.csv"))   # Path("exports/north/alpha.txt")
\`\`\`

## \`catalog/summarize.py\`

**\`summarize_file(path)\`** reads one reading file and returns

\`\`\`python
{"stem": "alpha", "readings": 2, "total": 30, "skipped": 0}
\`\`\`

Each line holds a sensor id and an integer reading separated by a comma, like \`s1,10\`. A line
that does not split into exactly two pieces, or whose second piece is not an integer, is
**skipped**: it counts in \`skipped\` and contributes nothing to \`readings\` or \`total\`. Blank
lines are ignored entirely and count nowhere. \`stem\` is the filename without its extension.

**\`summarize_tree(root)\`** returns one summary per reading file under \`root\`, in the order
\`find_reading_files\` gives them. Each summary is the dict above plus a \`"path"\` key holding the
file's location relative to \`root\`, written with forward slashes.

\`\`\`python
{"path": "north/alpha.csv", "stem": "alpha", "readings": 2, "total": 30, "skipped": 0}
\`\`\`

Some tests are hidden.
`

const PL_ALPHA = "s1,10\ns2,20\n"
const PL_NOTES = "installed the north sensors on tuesday\n"
const PL_BETA = "s1,5\nbroken\ns3,7\ns4,notanumber\n"
const PL_GAMMA = "s9,4\n\n"
const PL_EMPTY = ""

const PL_DISCOVERY_STARTER = String.raw`from pathlib import Path


def find_reading_files(root):
    """Return every reading file under root, sorted (see README.md)."""
    # TODO: collect the reading files at any depth under root, in sorted order.
    return []


def summary_path(source):
    """Return the Path of the summary file that belongs to source (see README.md)."""
    # TODO: build the summary location from the source path.
    return Path(source)
`

const PL_DISCOVERY_REFERENCE = String.raw`from pathlib import Path


def find_reading_files(root):
    found = Path(root).rglob("*.csv")
    return sorted(found, key=lambda path: path.as_posix())


def summary_path(source):
    return Path(source).with_suffix(".txt")
`

const PL_SUMMARIZE_STARTER = String.raw`from pathlib import Path

from catalog.discovery import find_reading_files


def summarize_file(path):
    """Return the reading counts for one file (see README.md)."""
    # TODO: read the file and count readings, their total, and skipped lines.
    return {"stem": "", "readings": 0, "total": 0, "skipped": 0}


def summarize_tree(root):
    """Return one summary per reading file under root (see README.md)."""
    # TODO: summarize every reading file and label each summary with its location under root.
    return []
`

const PL_SUMMARIZE_REFERENCE = String.raw`from pathlib import Path

from catalog.discovery import find_reading_files


def summarize_file(path):
    source = Path(path)
    readings = 0
    total = 0
    skipped = 0
    for line in source.read_text().splitlines():
        if not line.strip():
            continue
        parts = line.split(",")
        if len(parts) != 2:
            skipped += 1
            continue
        try:
            value = int(parts[1])
        except ValueError:
            skipped += 1
            continue
        readings += 1
        total += value
    return {"stem": source.stem, "readings": readings, "total": total, "skipped": skipped}


def summarize_tree(root):
    base = Path(root)
    summaries = []
    for source in find_reading_files(base):
        summary = summarize_file(source)
        summary["path"] = source.relative_to(base).as_posix()
        summaries.append(summary)
    return summaries
`

const PL_TEST = String.raw`from pathlib import Path

from catalog.discovery import find_reading_files, summary_path
from catalog.summarize import summarize_file, summarize_tree


def run_tests(record):
    def finds_only_reading_files():
        found = [path.as_posix() for path in find_reading_files("exports/north")]
        expected = ["exports/north/alpha.csv"]
        assert found == expected, f"expected {expected}, got {found!r}"

    def summary_sits_next_to_its_source():
        result = summary_path(Path("exports/north/alpha.csv")).as_posix()
        assert result == "exports/north/alpha.txt", f"expected 'exports/north/alpha.txt', got {result!r}"

    def summarizes_one_file():
        result = summarize_file("exports/north/alpha.csv")
        expected = {"stem": "alpha", "readings": 2, "total": 30, "skipped": 0}
        assert result == expected, f"expected {expected}, got {result!r}"

    def labels_each_summary_with_its_location():
        result = summarize_tree("exports/north")
        expected = [
            {"path": "alpha.csv", "stem": "alpha", "readings": 2, "total": 30, "skipped": 0}
        ]
        assert result == expected, f"expected {expected}, got {result!r}"

    record("finds only reading files", finds_only_reading_files)
    record("summary sits next to its source", summary_sits_next_to_its_source)
    record("summarizes one file", summarizes_one_file)
    record("labels each summary with its location", labels_each_summary_with_its_location)
`

const PL_TEST_HIDDEN = String.raw`from pathlib import Path

from catalog.discovery import find_reading_files, summary_path
from catalog.summarize import summarize_file, summarize_tree


def run_tests(record):
    def walks_the_whole_tree():
        found = [path.as_posix() for path in find_reading_files("exports")]
        expected = [
            "exports/empty.csv",
            "exports/north/alpha.csv",
            "exports/south/beta.2.csv",
            "exports/south/deep/gamma.csv",
        ]
        assert found == expected, f"expected {expected}, got {found!r}"

    def keeps_a_dot_inside_the_filename():
        result = summary_path(Path("exports/south/beta.2.csv")).as_posix()
        expected = "exports/south/beta.2.txt"
        assert result == expected, f"expected {expected!r}, got {result!r}"

    def counts_malformed_lines_as_skipped():
        result = summarize_file("exports/south/beta.2.csv")
        expected = {"stem": "beta.2", "readings": 2, "total": 12, "skipped": 2}
        assert result == expected, f"expected {expected}, got {result!r}"

    def an_empty_file_summarizes_to_zeros():
        result = summarize_file("exports/empty.csv")
        expected = {"stem": "empty", "readings": 0, "total": 0, "skipped": 0}
        assert result == expected, f"expected {expected}, got {result!r}"

    def summarizes_every_file_in_the_tree():
        result = summarize_tree("exports")
        expected = [
            {"path": "empty.csv", "stem": "empty", "readings": 0, "total": 0, "skipped": 0},
            {"path": "north/alpha.csv", "stem": "alpha", "readings": 2, "total": 30, "skipped": 0},
            {"path": "south/beta.2.csv", "stem": "beta.2", "readings": 2, "total": 12, "skipped": 2},
            {"path": "south/deep/gamma.csv", "stem": "gamma", "readings": 1, "total": 4, "skipped": 0},
        ]
        assert result == expected, f"expected {expected}, got {result!r}"

    record("walks the whole tree", walks_the_whole_tree)
    record("keeps a dot inside the filename", keeps_a_dot_inside_the_filename)
    record("counts malformed lines as skipped", counts_malformed_lines_as_skipped)
    record("an empty file summarizes to zeros", an_empty_file_summarizes_to_zeros)
    record("summarizes every file in the tree", summarizes_every_file_in_the_tree)
`

export const pathlibLesson: PythonLesson = {
  id: "py-l3-pathlib",
  title: "pathlib & file processing",
  summary: "Read and transform real files in a project with pathlib.",
  estimatedMinutes: 35,
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

\`splitlines()\` breaks on line boundaries and drops the \`\\n\` characters. The \`if line.strip()\` guard skips blank or whitespace-only lines so \`int()\` never receives an empty string. \`int()\` itself strips surrounding whitespace, so \`int(" 10 ")\` returns \`10\` without extra work. That is the shape of the Apply warm-up: sum the numbers in a string. The Practice reads real files with \`Path(path).read_text()\` and runs a line-by-line pipeline like this one over each of them.

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
    prompt: `Repair the nightly sensor report, which only ever sees the files sitting directly in
\`exports/\` and misses everything the install teams nested inside subfolders. Implement
\`find_reading_files\` and \`summary_path\` in \`catalog/discovery.py\`, then \`summarize_file\` and
\`summarize_tree\` in \`catalog/summarize.py\`. The tree holds reading files at several depths, a file
that is not a reading file at all, a file whose name has a dot inside it, an export that came back
empty, and lines the sensor wrote badly. The README gives the exact shape of every return value.
Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Discovery is recursive: a reading file counts no matter how many directories down it sits, and the only thing that makes it a reading file is its suffix.",
      "Build the summary location out of the source path's own methods rather than by cutting the filename at a dot, because one of these filenames has a dot in the middle of it. For the tree, ask `find_reading_files` for the files and describe each one relative to the root you were given.",
      "Four `Path` methods carry this exercise: `rglob` for the recursive search, `with_suffix` for the rename that respects a dot in the middle of a name, `relative_to` for the label, and `as_posix` wherever the answer has to be a forward-slash string rather than a `Path`. Note that sorting `Path` objects is not the same as sorting their POSIX strings, so pass `sorted` a key.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "catalog/discovery.py",
      editableFilePaths: ["catalog/discovery.py", "catalog/summarize.py"],
      visibleTestPaths: ["tests/test_catalog.py"],
      hiddenTestPaths: ["tests/test_catalog_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: PL_README },
        { path: "exports/empty.csv", role: "readonly", language: "text", content: PL_EMPTY },
        { path: "exports/north/alpha.csv", role: "readonly", language: "text", content: PL_ALPHA },
        { path: "exports/north/notes.txt", role: "readonly", language: "text", content: PL_NOTES },
        { path: "exports/south/beta.2.csv", role: "readonly", language: "text", content: PL_BETA },
        {
          path: "exports/south/deep/gamma.csv",
          role: "readonly",
          language: "text",
          content: PL_GAMMA,
        },
        { path: "catalog/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "catalog/discovery.py",
          role: "editable",
          language: "python",
          content: PL_DISCOVERY_STARTER,
          description: "Find the reading files and place their summaries",
        },
        {
          path: "catalog/summarize.py",
          role: "editable",
          language: "python",
          content: PL_SUMMARIZE_STARTER,
          description: "Parse one file, then summarize the tree",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_catalog.py",
          role: "test",
          language: "python",
          content: PL_TEST,
          description: "Visible discovery and summary tests",
        },
        {
          path: "tests/test_catalog_hidden.py",
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
            { module: "test_catalog", label: "visible catalog" },
            { module: "test_catalog_hidden", label: "hidden catalog" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "catalog/discovery.py",
          role: "editable",
          language: "python",
          content: PL_DISCOVERY_REFERENCE,
        },
        {
          path: "catalog/summarize.py",
          role: "editable",
          language: "python",
          content: PL_SUMMARIZE_REFERENCE,
        },
      ],
    },
  },
}

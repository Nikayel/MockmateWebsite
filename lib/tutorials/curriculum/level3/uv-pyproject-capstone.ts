import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// Practice workspace: the shiftlog project (the Level 3 capstone)
//
// The last exercise of the level composes the level's skills instead of drilling one: a package
// laid out under a real pyproject.toml, files read off disk with pathlib, a validating boundary
// that turns text into a typed record, an error boundary that keeps one bad line from ending the
// run, and a CLI entry point. Three editable files with distinct jobs: the record parser, the
// directory reader, and the command.
//
// The pyproject.toml is load-bearing rather than decoration: a hidden test reads the
// [project.scripts] declaration out of it and imports main through that path, so the layout and
// the declared entry point have to agree.
//
// Deliberately simpler than py-l4-packaging-capstone (no registry, no decorator factory, no
// injected transport, no __init__ export surface): this one is about a small tool that reads
// files and survives bad input.
// ───────────────────────────────────────────────────────────────────────────

const CAP_README = `# Capstone: the \`shiftlog\` command

A workshop drops one plain-text log per day into a folder, and the office manager wants a single
total per person at the end of the week. You are writing the tool that reads that folder.

Three files are yours: \`shiftlog/records.py\`, \`shiftlog/store.py\`, and \`shiftlog/cli.py\`.
Read \`pyproject.toml\` too, because it declares which function the \`shiftlog\` command runs.

## The log format

Each \`.log\` file holds one line per shift:

\`\`\`
alice: 45
# machines down after this point
bob:30
\`\`\`

A line is a worker name, a colon, and whole minutes. Surrounding spaces do not matter. A blank
line and a line starting with \`#\` carry no data. Anything else is a bad line: a missing colon, a
second colon, a missing name, or minutes that are not whole digits.

## \`shiftlog/records.py\`

\`parse_line(line)\` returns an \`Entry(worker, minutes)\` for a data line, \`None\` for a line that
carries no data, and raises \`BadLineError\` for a bad one. The error message must contain the line
it rejected, because the manager gets handed these.

## \`shiftlog/store.py\`

\`log_files(directory)\` returns the directory's \`.log\` files sorted by name. Other file types and
anything in a subfolder are not part of the log.

\`collect_entries(directory)\` reads those files in that order and returns two things: the list of
entries in the order they were read, and a list of the bad lines it stepped over, each written as
\`"<filename>:<line number>"\` with line numbers starting at 1. One bad line must never stop the
rest of the run.

## \`shiftlog/cli.py\`

\`main(argv)\` is the command. \`argv\` holds the arguments after the command name, so exactly one:
the log directory. Anything else, or a path that is not a directory, is a \`ValueError\` naming
the problem. Otherwise it returns:

\`\`\`python
{"files": 2, "entries": 4, "skipped": ["mon.log:3"], "totals": {"alice": 75, "bob": 30}}
\`\`\`

\`totals\` sums each worker's minutes across every file. Some tests are hidden.
`

const CAP_PYPROJECT = String.raw`[project]
name = "shiftlog"
version = "0.1.0"
description = "Total the minutes in a folder of workshop shift logs"
requires-python = ">=3.11"
dependencies = []

[project.scripts]
shiftlog = "shiftlog.cli:main"

[tool.pytest.ini_options]
testpaths = ["tests"]
`

const CAP_RECORDS_STARTER = String.raw`"""One log line, checked at the boundary. See README.md for the line format."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Entry:
    worker: str
    minutes: int


class BadLineError(ValueError):
    """Raised for a line that is neither blank, a comment, nor a valid entry."""


def parse_line(line: str) -> Entry | None:
    """Turn one raw line into an Entry, or nothing, or an error (see README.md)."""
    # TODO: let the lines that carry no data through as nothing, turn a data line into an
    # Entry, and reject every other shape with a BadLineError that quotes the line.
    raise NotImplementedError("parse_line")
`

const CAP_RECORDS_REFERENCE = String.raw`"""One log line, checked at the boundary. See README.md for the line format."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Entry:
    worker: str
    minutes: int


class BadLineError(ValueError):
    """Raised for a line that is neither blank, a comment, nor a valid entry."""


def parse_line(line: str) -> Entry | None:
    """Turn one raw line into an Entry, or nothing, or an error (see README.md)."""
    text = line.strip()
    if not text or text.startswith("#"):
        return None
    if text.count(":") != 1:
        raise BadLineError("bad log line: " + repr(line))
    worker, raw_minutes = (part.strip() for part in text.split(":"))
    if not worker or not raw_minutes.isdigit():
        raise BadLineError("bad log line: " + repr(line))
    return Entry(worker=worker, minutes=int(raw_minutes))
`

const CAP_STORE_STARTER = String.raw`"""Read the log files out of a directory. See README.md."""

from pathlib import Path

from shiftlog.records import BadLineError, Entry, parse_line


def log_files(directory: Path) -> list[Path]:
    """Return the directory's log files in the order they should be read (see README.md)."""
    # TODO: find the files this tool owns inside the directory, in a stable order.
    raise NotImplementedError("log_files")


def collect_entries(directory: Path) -> tuple[list[Entry], list[str]]:
    """Return the entries read from the directory and the bad lines skipped (see README.md)."""
    # TODO: walk the log files line by line, keep the entries, and note where each rejected
    # line was without letting it end the run.
    raise NotImplementedError("collect_entries")
`

const CAP_STORE_REFERENCE = String.raw`"""Read the log files out of a directory. See README.md."""

from pathlib import Path

from shiftlog.records import BadLineError, Entry, parse_line


def log_files(directory: Path) -> list[Path]:
    """Return the directory's log files in the order they should be read (see README.md)."""
    return sorted(Path(directory).glob("*.log"))


def collect_entries(directory: Path) -> tuple[list[Entry], list[str]]:
    """Return the entries read from the directory and the bad lines skipped (see README.md)."""
    entries: list[Entry] = []
    skipped: list[str] = []
    for path in log_files(directory):
        for number, line in enumerate(path.read_text().splitlines(), start=1):
            try:
                entry = parse_line(line)
            except BadLineError:
                skipped.append(path.name + ":" + str(number))
                continue
            if entry is not None:
                entries.append(entry)
    return entries, skipped
`

const CAP_CLI_STARTER = String.raw`"""The shiftlog command. pyproject.toml points the console script at main below."""

from pathlib import Path

from shiftlog.store import collect_entries, log_files


def main(argv: list[str]) -> dict:
    """Run the command over one log directory and return its report (see README.md)."""
    # TODO: refuse the calls this command cannot serve, then report the file count, the
    # entry count, the skipped lines, and each worker's total minutes.
    raise NotImplementedError("main")
`

const CAP_CLI_REFERENCE = String.raw`"""The shiftlog command. pyproject.toml points the console script at main below."""

from pathlib import Path

from shiftlog.store import collect_entries, log_files


def main(argv: list[str]) -> dict:
    """Run the command over one log directory and return its report (see README.md)."""
    if len(argv) != 1:
        raise ValueError("usage: shiftlog <log-directory>")
    directory = Path(argv[0])
    if not directory.is_dir():
        raise ValueError("not a log directory: " + str(directory))
    entries, skipped = collect_entries(directory)
    totals: dict[str, int] = {}
    for entry in entries:
        totals[entry.worker] = totals.get(entry.worker, 0) + entry.minutes
    return {
        "files": len(log_files(directory)),
        "entries": len(entries),
        "skipped": skipped,
        "totals": totals,
    }
`

const CAP_TEST = String.raw`"""Visible capstone tests: the contract, one layer at a time."""

import tempfile
from pathlib import Path

from shiftlog.cli import main
from shiftlog.records import BadLineError, Entry, parse_line
from shiftlog.store import collect_entries, log_files


def make_dir(files):
    root = Path(tempfile.mkdtemp())
    for name, text in files.items():
        (root / name).write_text(text)
    return root


def run_tests(record):
    def a_data_line_becomes_an_entry():
        got = parse_line("alice: 45")
        assert got == Entry("alice", 45), f"expected Entry('alice', 45), got {got!r}"
        assert got.minutes == 45 and isinstance(got.minutes, int), (
            f"expected minutes to be the int 45, got {got.minutes!r}"
        )

    def lines_without_data_are_nothing():
        for line in ["", "   ", "# machines down"]:
            got = parse_line(line)
            assert got is None, f"expected None for {line!r}, got {got!r}"

    def a_bad_line_is_rejected_and_quoted():
        try:
            got = parse_line("alice 45")
        except BadLineError as error:
            assert "alice 45" in str(error), (
                f"expected the error to quote the line 'alice 45', got {str(error)!r}"
            )
            return
        raise AssertionError(f"expected BadLineError for 'alice 45', got {got!r}")

    def log_files_come_back_in_name_order():
        root = make_dir({"tue.log": "", "mon.log": ""})
        names = [path.name for path in log_files(root)]
        assert names == ["mon.log", "tue.log"], f"expected ['mon.log', 'tue.log'], got {names!r}"

    def entries_and_skips_are_collected_together():
        root = make_dir({"mon.log": "alice: 45\nnonsense\nbob:30\n"})
        entries, skipped = collect_entries(root)
        assert entries == [Entry("alice", 45), Entry("bob", 30)], (
            f"expected the two good entries in file order, got {entries!r}"
        )
        assert skipped == ["mon.log:2"], f"expected ['mon.log:2'], got {skipped!r}"

    def the_command_reports_one_directory():
        root = make_dir({"mon.log": "alice: 45\n", "tue.log": "bob:30\nalice: 15\n"})
        report = main([str(root)])
        expected = {
            "files": 2,
            "entries": 3,
            "skipped": [],
            "totals": {"alice": 60, "bob": 30},
        }
        assert report == expected, f"expected {expected!r} from main, got {report!r}"

    record("a data line becomes an Entry", a_data_line_becomes_an_entry)
    record("blank and comment lines carry no data", lines_without_data_are_nothing)
    record("a bad line is rejected and quoted", a_bad_line_is_rejected_and_quoted)
    record("log files come back in name order", log_files_come_back_in_name_order)
    record("entries and skipped lines are collected together", entries_and_skips_are_collected_together)
    record("the command reports one directory", the_command_reports_one_directory)
`

const CAP_TEST_HIDDEN = String.raw`"""Hidden capstone tests: the edges, and whether the pieces really compose.

The first test never imports shiftlog.cli directly. It reads the console script declared in
pyproject.toml and reaches main through that, so the layout and the declaration have to agree.
"""

import importlib
import re
import tempfile
from pathlib import Path

from shiftlog.records import BadLineError, Entry, parse_line
from shiftlog.store import collect_entries, log_files


def make_dir(files):
    root = Path(tempfile.mkdtemp())
    for name, text in files.items():
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
    return root


def entry_point():
    text = Path("pyproject.toml").read_text()
    match = re.search(r"^\s*shiftlog\s*=\s*\"([^\"]+)\"", text, re.MULTILINE)
    assert match, "expected pyproject.toml to declare a shiftlog console script"
    module_name, _, attribute = match.group(1).partition(":")
    module = importlib.import_module(module_name)
    return getattr(module, attribute)


def run_tests(record):
    def the_declared_console_script_runs():
        run = entry_point()
        root = make_dir({"mon.log": "dana: 20\n"})
        report = run([str(root)])
        expected = {"files": 1, "entries": 1, "skipped": [], "totals": {"dana": 20}}
        assert report == expected, (
            f"expected {expected!r} through the declared entry point, got {report!r}"
        )

    def only_the_log_files_at_the_top_level_are_read():
        root = make_dir(
            {
                "mon.log": "alice: 10\n",
                "notes.txt": "alice: 999\n",
                "archive/old.log": "alice: 999\n",
            }
        )
        names = [path.name for path in log_files(root)]
        assert names == ["mon.log"], f"expected only ['mon.log'], got {names!r}"
        report = main_report(root)
        assert report["totals"] == {"alice": 10}, (
            f"expected totals {{'alice': 10}}, got {report['totals']!r}"
        )

    def main_report(root):
        run = entry_point()
        return run([str(root)])

    def minutes_must_be_whole_and_positive():
        for line in ["alice: -5", "alice: 4.5", "alice: many", "alice:", ": 5", "a:b:5"]:
            try:
                got = parse_line(line)
            except BadLineError:
                continue
            raise AssertionError(f"expected BadLineError for {line!r}, got {got!r}")

    def skipped_lines_are_numbered_per_file():
        root = make_dir(
            {
                "mon.log": "# header\n\nalice: 5\noops\n",
                "tue.log": "bad one\nbob: 7\n",
            }
        )
        entries, skipped = collect_entries(root)
        assert entries == [Entry("alice", 5), Entry("bob", 7)], (
            f"expected the two good entries across both files, got {entries!r}"
        )
        assert skipped == ["mon.log:4", "tue.log:1"], (
            f"expected ['mon.log:4', 'tue.log:1'], got {skipped!r}"
        )

    def an_empty_directory_reports_zeroes():
        root = make_dir({})
        report = main_report(root)
        expected = {"files": 0, "entries": 0, "skipped": [], "totals": {}}
        assert report == expected, f"expected {expected!r} for an empty directory, got {report!r}"

    def the_command_refuses_what_it_cannot_serve():
        root = make_dir({"mon.log": "alice: 5\n"})
        run = entry_point()
        for argv in [[], [str(root), "extra"], [str(root / "mon.log")]]:
            try:
                got = run(argv)
            except ValueError:
                continue
            raise AssertionError(f"expected ValueError for argv {argv!r}, got {got!r}")

    record("the console script declared in pyproject runs", the_declared_console_script_runs)
    record("only top-level log files are read", only_the_log_files_at_the_top_level_are_read)
    record("minutes must be whole and positive", minutes_must_be_whole_and_positive)
    record("skipped lines are numbered per file", skipped_lines_are_numbered_per_file)
    record("an empty directory reports zeroes", an_empty_directory_reports_zeroes)
    record("the command refuses what it cannot serve", the_command_refuses_what_it_cannot_serve)
`

export const uvPyprojectCapstoneLesson: PythonLesson = {
  id: "py-l3-uv-pyproject-capstone",
  title: "Dependencies, pyproject & a mini capstone",
  summary: "Understand pyproject.toml/uv and extend a small, tested multi-file project.",
  estimatedMinutes: 34,
  difficulty: "hard",
  skills: ["pyproject", "uv", "packaging", "capstone"],
  teach: {
    estimatedMinutes: 6,
    markdown: `## Why one file and one lockfile

A project that only runs on your laptop is a liability. The moment a teammate clones it, CI builds it, or you deploy it, "works on my machine" has to become "installs the same way everywhere." \`pyproject.toml\` plus a lockfile is how modern Python gets there. One file declares what the project is and what it needs, and the lockfile pins the exact versions that got resolved, so every install is byte-for-byte identical.

### \`pyproject.toml\`: the single source of truth

\`pyproject.toml\` is the standard, tool-agnostic place to describe a Python project. It replaces the old \`setup.py\` plus \`requirements.txt\` sprawl.

\`\`\`toml
[project]
name = "todo"
version = "0.1.0"
dependencies = ["httpx>=0.27"]

[project.scripts]
todo = "todo.cli:main"
\`\`\`

The \`[project]\` table holds metadata: the package \`name\`, its \`version\`, and its \`dependencies\`. Note that \`dependencies\` are ranges (\`httpx>=0.27\`), a statement of intent, not exact pins. The \`[project.scripts]\` table wires a console command (\`todo\`) to a function (\`main\` in \`todo.cli\`), so installing the package gives you a runnable CLI.

Your capstone project is laid out this way: a \`shiftlog/\` package directory holds one module per job, with \`pyproject.toml\` at the root naming the package and pointing its console script at the function that runs the command.

### \`uv\`: resolve, lock, run

\`uv\` is a fast package manager that replaces \`pip\`, \`virtualenv\`, and \`pip-tools\` with one tool. The day-to-day loop:

\`\`\`bash
uv add httpx     # add a dep: updates pyproject.toml AND uv.lock
uv sync          # install exactly what uv.lock pins
uv run pytest    # run a command inside the project's .venv
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "ranges-vs-lockfile",
  "prompt": "Your pyproject.toml declares dependencies = ['httpx>=0.27']. You committed pyproject.toml but not uv.lock. Six months later a teammate clones the repo and installs. Do they get the same httpx version you have?",
  "options": [
    {
      "label": "Yes. The version is written right there in pyproject.toml.",
      "feedback": "Tempting, because a version really is written down and it certainly looks like a pin. It is a range: >=0.27 happily accepts 0.27, 0.31, and every release after that."
    },
    {
      "label": "No. >=0.27 is a range, so they get whatever the resolver happens to pick that day.",
      "correct": true,
      "feedback": "Right. pyproject declares intent, uv.lock records the one exact resolution that satisfied it. Commit both and nobody on the team has to say 'works on my machine' again."
    },
    {
      "label": "Only if they run uv sync instead of uv add.",
      "feedback": "Close, and uv sync really is the reproducible command: it installs precisely what the lockfile pins. With no uv.lock in the repo there is nothing to reproduce, so it has to resolve the range from scratch anyway."
    }
  ]
}
\`\`\`

The mental model is two tiers. \`pyproject.toml\` declares intent as version ranges. \`uv.lock\` records the one exact resolution that satisfied those ranges. Commit both files; never commit \`.venv\`. That split is what makes builds reproducible: your teammate runs \`uv sync\` and gets your exact versions, not "whatever \`pip\` resolved today."

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "what-belongs-in-git",
  "prompt": "You are setting up the repo for this project. Sort each item by whether it goes into version control.",
  "buckets": ["Commit it", "Never commit it"],
  "items": [
    {
      "label": "pyproject.toml",
      "bucket": "Commit it",
      "feedback": "The declaration of what the project is and what it needs. Nothing else can be rebuilt without it."
    },
    {
      "label": "uv.lock",
      "bucket": "Commit it",
      "feedback": "The file that makes two installs identical. Leaving it out is the most common reason a build passes locally and fails in CI weeks later."
    },
    {
      "label": ".venv/",
      "bucket": "Never commit it",
      "feedback": "It holds compiled binaries built for one machine and one Python version, and it is large. Anyone can regenerate it with uv sync in seconds."
    },
    {
      "label": "the shiftlog/ package source",
      "bucket": "Commit it",
      "feedback": "Your actual code. This is the part no tool can regenerate."
    },
    {
      "label": "a .env file holding an API key",
      "bucket": "Never commit it",
      "feedback": "Secrets have no business in version control, and git history keeps them long after you delete the file. Commit a .env.example that names the keys and leaves the values blank."
    },
    {
      "label": "__pycache__/",
      "bucket": "Never commit it",
      "feedback": "Generated bytecode. It is derived from your source, it churns on every run, and it is specific to one interpreter version."
    }
  ],
  "reveal": "One rule sorts all six: commit what a human wrote or a resolver decided, never commit what a machine can rebuild from those. That is also why uv.lock counts as a decision, not as build output."
}
\`\`\`

### The reporting function

\`summary(tasks)\` is the kind of function a CLI or API endpoint calls to report state. Given task dicts with a \`"done"\` flag, it returns totals in one pass:

\`\`\`python
def summary(tasks):
    done = sum(1 for task in tasks if task["done"])
    return {"total": len(tasks), "done": done, "pending": len(tasks) - done}

print(summary([{"title": "a", "done": True}, {"title": "b", "done": False}]))
# {'total': 2, 'done': 1, 'pending': 1}
\`\`\`

Deriving \`pending\` as \`total - done\` (rather than a second filtered loop) guarantees the invariant \`total == done + pending\` always holds, even if the two filters ever disagreed.

### Pitfall: truthiness is not equality

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "truthiness-not-equality",
  "prompt": "Task flags come from a CSV importer, so some arrive as the string 'false' instead of the boolean False. summary counts with: sum(1 for task in tasks if task['done']). What does a task carrying done='false' count as?",
  "options": [
    {
      "label": "Pending, since the flag says false.",
      "feedback": "Tempting, because the value plainly says false and that is exactly what whoever produced the CSV meant by it. The if tests truthiness, and any non-empty string is truthy."
    },
    {
      "label": "Done, because a non-empty string is truthy.",
      "correct": true,
      "feedback": "Right. Nothing raises and the totals still add up, so the report is quietly wrong. When a flag might not be a real boolean, compare with 'is True' rather than relying on truthiness."
    },
    {
      "label": "It raises TypeError, because a string is not a boolean.",
      "feedback": "That is what the sum(task['done'] for ...) idiom would do, since adding a string to a running int really does raise. The if version never raises. It only ever asks whether the value is truthy."
    }
  ]
}
\`\`\`

\`if task["done"]\` tests truthiness, not "is this the boolean \`True\`." A flag of \`0\` or \`""\` is falsy, but a flag of \`"false"\` (a non-empty string) is truthy and counts as done. If your data might carry non-bool flags, be explicit: \`if task["done"] is True\`. Silent truthiness bugs like this survive tests that only use clean \`True\`/\`False\` fixtures.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bool-is-an-int-subclass",
  "prompt": "You replace sum(1 for task in tasks if task['done']) with the shorter sum(task['done'] for task in tasks). On clean boolean data, what does the shorter version return?",
  "options": [
    {
      "label": "TypeError, because you cannot add booleans together.",
      "feedback": "Tempting, because booleans feel like a different kind of thing from numbers, and plenty of languages keep them separate. In Python bool is a subclass of int: True is 1, False is 0, and they add up fine."
    },
    {
      "label": "The same count, because bool is a subclass of int and True adds as 1.",
      "correct": true,
      "feedback": "Right. It is a tidy one-pass idiom, but it is more fragile than the version it replaced: a flag of 2 silently overcounts, and a string flag raises instead of counting."
    },
    {
      "label": "The right count, but only because sum() special-cases booleans.",
      "feedback": "Close on the result and wrong on the reason, which is the part worth fixing. sum() does nothing special here. It simply adds, and True genuinely is the integer 1 all the way down."
    }
  ],
  "reveal": "Both idioms are one pass and O(n), and both read fine. The difference only appears on dirty data: the if version silently miscounts a string flag while the sum version raises on it. Neither is safe until you know the type of what you are counting."
}
\`\`\`

**Interview nuance:** in Python, \`bool\` is a subclass of \`int\`, so \`True == 1\` and \`False == 0\`. That means \`sum(task["done"] for task in tasks)\` counts the done tasks without the literal \`1\`, because the booleans add up directly. It is a clean one-pass, O(n) idiom that interviewers like, but flag its fragility: it assumes every flag is a real boolean (or at least an \`int\`). On the pitfall's own bad input, a string flag like \`"false"\` makes \`sum\` raise \`TypeError\` instead of counting, while a non-bool number like \`2\` silently overcounts. Correct behavior here rests on knowing your data's type, not just its shape.`,
    demoCode: `def summary(tasks):
    done = sum(1 for task in tasks if task["done"])
    return {"total": len(tasks), "done": done, "pending": len(tasks) - done}


print(summary([{"title": "a", "done": True}, {"title": "b", "done": False}]))`,
  },
  apply: {
    id: "py-l3-uv-pyproject-capstone-apply",
    executionMode: "single-file",
    prompt: `Warm-up (one file): implement \`summary(tasks)\`. Given a list of task dicts (each with a
\`"done"\` flag), return \`{"total": n, "done": d, "pending": p}\`.

For \`[{"title": "a", "done": True}, {"title": "b", "done": False}]\` return
\`{"total": 2, "done": 1, "pending": 1}\`.`,
    starterCode: `def summary(tasks):
    # Count total, done, and pending tasks. Return the three counts in a dict.
    pass`,
    hints: [
      "`len(tasks)` is the total.",
      'Count completed with `sum(1 for task in tasks if task["done"])`.',
      "Pending is `total - done`.",
    ],
    referenceSolution: `def summary(tasks):
    done = sum(1 for task in tasks if task["done"])
    return {"total": len(tasks), "done": done, "pending": len(tasks) - done}`,
    testCases: [
      {
        input: {
          tasks: [
            { title: "a", done: true },
            { title: "b", done: false },
          ],
        },
        expected: { total: 2, done: 1, pending: 1 },
        description: "one done, one pending",
      },
      { input: { tasks: [] }, expected: { total: 0, done: 0, pending: 0 }, description: "empty" },
      {
        input: { tasks: [{ title: "x", done: true }] },
        expected: { total: 1, done: 1, pending: 0 },
        description: "all done",
      },
    ],
  },
  practice: {
    id: "py-l3-uv-pyproject-capstone-practice",
    executionMode: "workspace",
    prompt: `Capstone: build the \`shiftlog\` command that totals a folder of workshop shift logs.
Three files are yours. \`shiftlog/records.py\` turns one raw line into a checked \`Entry\`,
\`shiftlog/store.py\` reads the directory's log files and keeps going past the lines it cannot
use, and \`shiftlog/cli.py\` holds \`main(argv)\`, the function \`pyproject.toml\` declares as the
command. Bad lines are reported, never fatal. Start with \`README.md\`, and read
\`pyproject.toml\` for the entry point the command has to reach. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Build it bottom up: one line first, then a directory of files, then the command over that directory. Each layer only calls the one below it.",
      "`parse_line` has three outcomes, so decide them in order: nothing to report (blank or `#`), then a valid `worker: minutes`, then everything else is a `BadLineError`. `str.isdigit()` is a quick way to reject minutes that are negative, fractional, or not numbers at all.",
      '`log_files` is `sorted(Path(directory).glob("*.log"))`, which skips other extensions and subfolders for free. In `collect_entries`, `enumerate(path.read_text().splitlines(), start=1)` gives you the line number, and wrapping the `parse_line` call in `try` / `except BadLineError` is what turns a bad line into an appended `"name:number"` instead of a crash.',
      "`main` validates before it works: `len(argv) != 1` and `not Path(argv[0]).is_dir()` are both `ValueError`. Then total per worker with `totals[entry.worker] = totals.get(entry.worker, 0) + entry.minutes`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "shiftlog/records.py",
      editableFilePaths: ["shiftlog/records.py", "shiftlog/store.py", "shiftlog/cli.py"],
      visibleTestPaths: ["tests/test_shiftlog.py"],
      hiddenTestPaths: ["tests/test_shiftlog_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CAP_README },
        { path: "pyproject.toml", role: "docs", language: "text", content: CAP_PYPROJECT },
        { path: "shiftlog/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "shiftlog/records.py",
          role: "editable",
          language: "python",
          content: CAP_RECORDS_STARTER,
          description: "Check one log line at the boundary",
        },
        {
          path: "shiftlog/store.py",
          role: "editable",
          language: "python",
          content: CAP_STORE_STARTER,
          description: "Read the log files in a directory",
        },
        {
          path: "shiftlog/cli.py",
          role: "editable",
          language: "python",
          content: CAP_CLI_STARTER,
          description: "The command pyproject.toml points at",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_shiftlog.py",
          role: "test",
          language: "python",
          content: CAP_TEST,
          description: "Visible capstone tests",
        },
        {
          path: "tests/test_shiftlog_hidden.py",
          role: "test",
          language: "python",
          content: CAP_TEST_HIDDEN,
          hidden: true,
          description: "Hidden capstone tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_shiftlog", label: "visible shiftlog" },
            { module: "test_shiftlog_hidden", label: "hidden shiftlog" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "shiftlog/records.py",
          role: "editable",
          language: "python",
          content: CAP_RECORDS_REFERENCE,
        },
        {
          path: "shiftlog/store.py",
          role: "editable",
          language: "python",
          content: CAP_STORE_REFERENCE,
        },
        {
          path: "shiftlog/cli.py",
          role: "editable",
          language: "python",
          content: CAP_CLI_REFERENCE,
        },
      ],
    },
  },
}

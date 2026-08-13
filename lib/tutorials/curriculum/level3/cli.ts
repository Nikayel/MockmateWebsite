import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// L3-M5: Real Programs & Tooling
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// Time budget behind `estimatedMinutes` (counted, not guessed): teach 5 (about 850 prose words,
// four checks), apply 6 (a 6-line prompt, a 7-line reference), practice 39 (78 README lines plus
// ~120 lines of read-only command table and visible tests to read, 71 lines to write across two
// modules, 18 recorded tests). Lesson total 50 = 5 + 6 + 39.
//
// Apply is left alone deliberately: at 71 to 8 reference lines it is inside the 12x ramp threshold
// and it already exercises the lesson's real skill, dispatching a command name to a function with
// its arguments converted at the boundary. The practice's option grammar is the one new idea.
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// Practice workspace: the logtail option parser
//
// Apply already covers "read argv[0] and convert two positionals". Practice grades what actually
// makes command-line tools annoying, and what Apply never touches:
//
//  - optional flags in every form a shell can hand you: --limit 10, --limit=10, the short -n,
//    and a boolean -v that consumes nothing
//  - the -- terminator, after which a token starting with a dash is a filename
//  - defaults for flags nobody passed
//  - usage errors that name the offending option and exit non-zero instead of raising
//
// Two editable files, one per seam. cli/parser.py turns argv into (options, positionals) and knows
// nothing about commands, which is what makes it testable on its own. cli/dispatch.py owns the
// command table, the --help text, and the exit-code convention. Neither can be left untouched:
// most dispatch tests need a working parser, and the direct parse_args tests need the parser
// without any dispatch at all.
// ───────────────────────────────────────────────────────────────────────────

const CLI_README = buildBrief({
  lesson: "py-l3-cli",
  kind: "ticket",
  headline: "logtail takes options",
  body: `\`logtail\` currently accepts a command and some filenames and nothing else. Support said "it does
not even take --limit", so this ticket adds real option handling. Two files need work:
\`cli/parser.py\` (argv to options) and \`cli/dispatch.py\` (commands, help, exit codes).

## The parser

\`parse_args(argv, flag_spec)\` returns the tuple \`(options, positionals)\`. It never sees a
command name: \`argv\` is what is left after the command was taken off the front.

\`flag_spec\` maps a long option name to its description, as in \`cli/commands.py\`:

\`\`\`python
{
    "--limit": {"kind": "value", "short": "-n", "type": "int", "default": 2},
    "--verbose": {"kind": "flag", "short": "-v", "default": False},
}
\`\`\`

- \`options\` holds every name in \`flag_spec\`. An option nobody passed keeps its \`default\`.
- A \`"value"\` option takes its value from the next token (\`--limit 3\`) or from an \`=\`
  (\`--limit=3\`). With \`"type": "int"\` the value comes back as an \`int\`, not a string.
- A \`"flag"\` option takes no value and becomes \`True\` when it appears.
- Each option's \`short\` form means exactly what the long form means.
- Everything that is not an option is a positional, in the order it arrived.
- After a bare \`--\`, every remaining token is a positional even if it starts with a dash.

Bad input raises \`UsageError\` (read-only, in \`cli/errors.py\`) with one of these messages:

| Situation | Message |
| --- | --- |
| a name in no spec | \`unknown option: --colour\` |
| a value option at the end of \`argv\` | \`option --limit needs a value\` |
| \`=\` on a flag option | \`option --verbose takes no value\` |
| an \`int\` value that is not a number | \`option --limit expects a whole number, got 'abc'\` |

Which spelling goes in the message depends on whether you could resolve the option at all:

- An **unknown** option has no long name to report, so echo the token exactly as it was typed.
  \`-x\` gives \`unknown option: -x\`, not \`unknown option: --x\`.
- The other three situations are about an option you did find in the spec, so name it by its **long**
  name whichever form the user typed. \`parse_args(["-n", "abc"], ...)\` reports
  \`option --limit expects a whole number, got 'abc'\`, because \`-n\` and \`--limit\` are the same
  option and the long name is the one the spec and the \`--help\` output use.

## The dispatcher

\`main(argv)\` returns the tuple \`(exit_code, lines)\`. \`argv\` starts at the command name, and
\`lines\` is a list of output lines with no trailing newlines. Exit code \`0\` means success and
\`2\` means the user got the usage wrong.

- No arguments at all, or \`--help\`, or \`-h\`, prints the help and exits \`0\`.
- Otherwise the first token is the command name, looked up in \`COMMANDS\`
  (\`cli/commands.py\`, read-only). Each entry has a \`help\` string, a \`flags\` spec, and a
  \`run(names, options)\` function that returns the output lines.
- The rest of \`argv\` is parsed with that command's \`flags\` spec, and the positionals are the
  filenames handed to \`run\`.
- A command that is not in \`COMMANDS\` exits \`2\` with \`error: unknown command: grep\`.
- A \`UsageError\` exits \`2\` with the message prefixed: \`error: unknown option: --colour\`.
- A command called with no filenames exits \`2\` with \`error: missing argument: file\`.

The help is exactly the \`USAGE\` line, then a blank line, then \`commands:\`, then one line per
command sorted by name, indented two spaces, with two spaces between the name and its help string:

\`\`\`
usage: logtail <command> [options] <file>...

commands:
  count  Print how many lines each file has
  head  Print the first lines of each file
\`\`\`

The help is read off \`COMMANDS\`, so a command added tomorrow shows up without anyone editing the
help.`,
})

const CLI_ERRORS = String.raw`"""The one error type the parser raises and the dispatcher catches."""


class UsageError(Exception):
    """The user typed something the tool cannot act on."""
`

const CLI_COMMANDS = String.raw`"""The command table and the tiny document store the commands read.

Ops adds commands here. Nothing in this file knows how argv is parsed, and
nothing here knows about exit codes.
"""

DOCS = {
    "notes.txt": ["alpha", "beta", "gamma", "delta"],
    "todo.txt": ["buy milk", "write tests"],
    "-weird.txt": ["dash one", "dash two"],
}


def _head(names, options):
    lines = []
    for name in names:
        for line in DOCS.get(name, [])[: options["--limit"]]:
            lines.append(f"{name}: {line}" if options["--verbose"] else line)
    return lines


def _count(names, options):
    return [f"{name} {len(DOCS.get(name, []))}" for name in names]


COMMANDS = {
    "head": {
        "help": "Print the first lines of each file",
        "flags": {
            "--limit": {"kind": "value", "short": "-n", "type": "int", "default": 2},
            "--verbose": {"kind": "flag", "short": "-v", "default": False},
        },
        "run": _head,
    },
    "count": {
        "help": "Print how many lines each file has",
        "flags": {
            "--verbose": {"kind": "flag", "short": "-v", "default": False},
        },
        "run": _count,
    },
}
`

const CLI_PARSER_STARTER = String.raw`"""argv in, (options, positionals) out. This module knows nothing about commands."""

from cli.errors import UsageError


def parse_args(argv, flag_spec):
    """Return (options, positionals) for one command's argv (see README.md)."""
    # TODO: start from the spec's defaults, read every option form the README lists,
    # collect the rest as positionals, and raise UsageError on the four bad inputs.
    return {}, []
`

const CLI_PARSER_REFERENCE = String.raw`"""argv in, (options, positionals) out. This module knows nothing about commands."""

from cli.errors import UsageError


def _short_forms(flag_spec):
    """Map every declared short form to its long name."""
    return {spec["short"]: name for name, spec in flag_spec.items() if spec.get("short")}


def _coerce(name, spec, raw):
    if spec.get("type") != "int":
        return raw
    try:
        return int(raw)
    except ValueError:
        raise UsageError(f"option {name} expects a whole number, got {raw!r}")


def parse_args(argv, flag_spec):
    """Return (options, positionals) for one command's argv."""
    options = {name: spec.get("default") for name, spec in flag_spec.items()}
    shorts = _short_forms(flag_spec)
    positionals = []

    index = 0
    while index < len(argv):
        token = argv[index]
        index += 1

        if token == "--":
            positionals.extend(argv[index:])
            break
        if not token.startswith("-") or token == "-":
            positionals.append(token)
            continue

        typed, sep, inline = token.partition("=")
        name = shorts.get(typed, typed)
        if name not in flag_spec:
            raise UsageError(f"unknown option: {typed}")

        spec = flag_spec[name]
        if spec["kind"] == "flag":
            if sep:
                raise UsageError(f"option {name} takes no value")
            options[name] = True
            continue

        if sep:
            options[name] = _coerce(name, spec, inline)
            continue
        if index >= len(argv):
            raise UsageError(f"option {name} needs a value")
        options[name] = _coerce(name, spec, argv[index])
        index += 1

    return options, positionals
`

const CLI_DISPATCH_STARTER = String.raw`"""The command table, the help text, and the exit-code convention."""

from cli.commands import COMMANDS
from cli.errors import UsageError
from cli.parser import parse_args

USAGE = "usage: logtail <command> [options] <file>..."


def help_lines():
    """Return the help output, built from COMMANDS (see README.md)."""
    # TODO: build the usage block listed in the README from whatever COMMANDS holds.
    return []


def main(argv):
    """Return (exit_code, lines) for one invocation (see README.md)."""
    # TODO: handle the help cases, look the command up, parse the rest with that
    # command's flag spec, and turn every usage problem into exit code 2.
    return 0, []
`

const CLI_DISPATCH_REFERENCE = String.raw`"""The command table, the help text, and the exit-code convention."""

from cli.commands import COMMANDS
from cli.errors import UsageError
from cli.parser import parse_args

USAGE = "usage: logtail <command> [options] <file>..."


def help_lines():
    """Return the help output, built from COMMANDS."""
    lines = [USAGE, "", "commands:"]
    for name in sorted(COMMANDS):
        lines.append(f"  {name}  {COMMANDS[name]['help']}")
    return lines


def main(argv):
    """Return (exit_code, lines) for one invocation."""
    if not argv or argv[0] in ("--help", "-h"):
        return 0, help_lines()

    name = argv[0]
    command = COMMANDS.get(name)
    if command is None:
        return 2, [f"error: unknown command: {name}"]

    try:
        options, positionals = parse_args(argv[1:], command["flags"])
    except UsageError as exc:
        return 2, [f"error: {exc}"]

    if not positionals:
        return 2, ["error: missing argument: file"]
    return 0, command["run"](positionals, options)
`

const CLI_TEST = String.raw`from cli.commands import COMMANDS
from cli.dispatch import USAGE, help_lines, main
from cli.parser import parse_args

HEAD_FLAGS = COMMANDS["head"]["flags"]


def run_tests(record):
    def defaults_apply_when_nothing_is_passed():
        options, positionals = parse_args([], HEAD_FLAGS)
        assert options == {"--limit": 2, "--verbose": False}, (
            f"expected {{'--limit': 2, '--verbose': False}}, got {options!r}"
        )
        assert positionals == [], f"expected no positionals, got {positionals!r}"

    def a_spaced_value_is_converted():
        options, positionals = parse_args(["--limit", "3", "notes.txt"], HEAD_FLAGS)
        assert options["--limit"] == 3, (
            f"expected --limit to be the int 3, got {options['--limit']!r}"
        )
        assert positionals == ["notes.txt"], (
            f"expected ['notes.txt'], got {positionals!r}"
        )

    def short_forms_mean_the_long_forms():
        options, _ = parse_args(["-n", "1", "-v"], HEAD_FLAGS)
        assert options["--limit"] == 1, f"expected --limit 1 from -n 1, got {options['--limit']!r}"
        assert options["--verbose"] is True, (
            f"expected --verbose True from -v, got {options['--verbose']!r}"
        )

    def head_uses_its_default_limit():
        code, lines = main(["head", "notes.txt"])
        assert code == 0, f"expected exit code 0, got {code!r}"
        assert lines == ["alpha", "beta"], f"expected ['alpha', 'beta'], got {lines!r}"

    def flags_and_positionals_mix_freely():
        code, lines = main(["head", "-v", "notes.txt", "-n", "1", "todo.txt"])
        assert code == 0, f"expected exit code 0, got {code!r}"
        assert lines == ["notes.txt: alpha", "todo.txt: buy milk"], (
            f"expected ['notes.txt: alpha', 'todo.txt: buy milk'], got {lines!r}"
        )

    def a_command_with_no_files_is_a_usage_error():
        code, lines = main(["count"])
        assert code == 2, f"expected exit code 2, got {code!r}"
        assert lines == ["error: missing argument: file"], (
            f"expected ['error: missing argument: file'], got {lines!r}"
        )

    def help_lists_every_command():
        code, lines = main(["--help"])
        assert code == 0, f"expected exit code 0 for --help, got {code!r}"
        expected = [
            USAGE,
            "",
            "commands:",
            "  count  Print how many lines each file has",
            "  head  Print the first lines of each file",
        ]
        assert lines == expected, f"expected {expected!r}, got {lines!r}"
        assert help_lines() == expected, (
            f"expected help_lines() to return the same block, got {help_lines()!r}"
        )

    record("defaults apply when nothing is passed", defaults_apply_when_nothing_is_passed)
    record("a spaced value is converted", a_spaced_value_is_converted)
    record("short forms mean the long forms", short_forms_mean_the_long_forms)
    record("head uses its default limit", head_uses_its_default_limit)
    record("flags and positionals mix freely", flags_and_positionals_mix_freely)
    record("a command with no files is a usage error", a_command_with_no_files_is_a_usage_error)
    record("help lists every command", help_lists_every_command)
`

const CLI_TEST_HIDDEN = String.raw`from cli.commands import COMMANDS
from cli.dispatch import main
from cli.errors import UsageError
from cli.parser import parse_args

HEAD_FLAGS = COMMANDS["head"]["flags"]


def raised_message(argv):
    """Return the UsageError message parse_args raises for argv, or None."""
    try:
        parse_args(argv, HEAD_FLAGS)
    except UsageError as exc:
        return str(exc)
    return None


def run_tests(record):
    def equals_form_matches_spaced_form():
        spaced, _ = parse_args(["--limit", "3"], HEAD_FLAGS)
        inline, _ = parse_args(["--limit=3"], HEAD_FLAGS)
        assert inline == spaced, f"expected --limit=3 to match --limit 3 ({spaced!r}), got {inline!r}"
        assert inline["--limit"] == 3, (
            f"expected the int 3 from --limit=3, got {inline['--limit']!r}"
        )

    def the_terminator_ends_option_parsing():
        options, positionals = parse_args(["--limit=1", "--", "-weird.txt", "--verbose"], HEAD_FLAGS)
        assert positionals == ["-weird.txt", "--verbose"], (
            f"expected ['-weird.txt', '--verbose'] as positionals, got {positionals!r}"
        )
        assert options["--verbose"] is False, (
            f"expected --verbose to stay False after --, got {options['--verbose']!r}"
        )

    def a_dashed_filename_survives_the_terminator():
        code, lines = main(["head", "--", "-weird.txt"])
        assert code == 0, f"expected exit code 0, got {code!r}"
        assert lines == ["dash one", "dash two"], (
            f"expected ['dash one', 'dash two'], got {lines!r}"
        )

    def unknown_options_name_what_was_typed():
        long_form = raised_message(["--colour", "notes.txt"])
        assert long_form == "unknown option: --colour", (
            f"expected 'unknown option: --colour', got {long_form!r}"
        )
        short_form = raised_message(["-x"])
        assert short_form == "unknown option: -x", (
            f"expected 'unknown option: -x', got {short_form!r}"
        )

    def a_value_option_at_the_end_reports_itself():
        got = raised_message(["notes.txt", "--limit"])
        assert got == "option --limit needs a value", (
            f"expected 'option --limit needs a value', got {got!r}"
        )

    def a_flag_option_rejects_a_value():
        got = raised_message(["--verbose=yes"])
        assert got == "option --verbose takes no value", (
            f"expected 'option --verbose takes no value', got {got!r}"
        )

    def a_non_numeric_value_reports_what_it_saw():
        got = raised_message(["-n", "abc"])
        assert got == "option --limit expects a whole number, got 'abc'", (
            f"expected \"option --limit expects a whole number, got 'abc'\", got {got!r}"
        )

    def usage_errors_reach_the_exit_code():
        code, lines = main(["head", "--colour", "notes.txt"])
        assert code == 2, f"expected exit code 2, got {code!r}"
        assert lines == ["error: unknown option: --colour"], (
            f"expected ['error: unknown option: --colour'], got {lines!r}"
        )

    def an_unknown_command_does_not_crash():
        code, lines = main(["grep", "notes.txt"])
        assert code == 2, f"expected exit code 2, got {code!r}"
        assert lines == ["error: unknown command: grep"], (
            f"expected ['error: unknown command: grep'], got {lines!r}"
        )

    def no_arguments_prints_the_help():
        code, lines = main([])
        assert code == 0, f"expected exit code 0 for no arguments, got {code!r}"
        assert lines == main(["-h"])[1], (
            f"expected the same help as -h ({main(['-h'])[1]!r}), got {lines!r}"
        )

    def a_command_added_today_shows_up_in_help():
        COMMANDS["tail"] = {
            "help": "Print the last lines of each file",
            "flags": {},
            "run": lambda names, options: [],
        }
        try:
            code, lines = main(["--help"])
            assert code == 0, f"expected exit code 0, got {code!r}"
            assert "  tail  Print the last lines of each file" in lines, (
                f"expected the tail command listed in the help, got {lines!r}"
            )
            assert lines.index("  count  Print how many lines each file has") < lines.index(
                "  tail  Print the last lines of each file"
            ), f"expected commands sorted by name, got {lines!r}"
        finally:
            COMMANDS.pop("tail", None)

    record("the equals form matches the spaced form", equals_form_matches_spaced_form)
    record("the terminator ends option parsing", the_terminator_ends_option_parsing)
    record("a dashed filename survives the terminator", a_dashed_filename_survives_the_terminator)
    record("unknown options name what was typed", unknown_options_name_what_was_typed)
    record("a value option at the end reports itself", a_value_option_at_the_end_reports_itself)
    record("a flag option rejects a value", a_flag_option_rejects_a_value)
    record("a non-numeric value reports what it saw", a_non_numeric_value_reports_what_it_saw)
    record("usage errors reach the exit code", usage_errors_reach_the_exit_code)
    record("an unknown command does not crash", an_unknown_command_does_not_crash)
    record("no arguments prints the help", no_arguments_prints_the_help)
    record("a command added today shows up in help", a_command_added_today_shows_up_in_help)
`

export const cliLesson: PythonLesson = {
  id: "py-l3-cli",
  title: "Building a CLI: parse and dispatch argv (argparse/typer preview)",
  summary: "Turn argument lists into commands with a testable dispatcher.",
  estimatedMinutes: 50,
  difficulty: "medium",
  skills: ["cli", "dispatch", "arguments", "commands"],
  teach: {
    estimatedMinutes: 5,
    markdown: `## From arguments to commands

Every real tool you use, \`git\`, \`pytest\`, \`pip\`, \`uv\`, is a CLI: it reads a list of strings the shell hands it and runs the matching command. When you write one, the valuable skill is not memorizing a library. It is keeping the parsing separate from the logic so you can test the logic without launching a whole process. That separation is exactly what this lesson drills.

### A CLI is a function from strings to a result

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "argv-zero-is-program-name",
  "prompt": "At a shell you run: python mytool.py add 2 3. Inside the program, what is sys.argv[0]?",
  "options": [
    {
      "label": "'add', the first thing you typed after the program name.",
      "feedback": "Tempting, because it is the first argument YOU typed, and several languages do number their arguments that way. Python puts the script's own name at index 0, so your first real argument sits at index 1."
    },
    {
      "label": "'mytool.py', the script name. Your own arguments start at index 1.",
      "correct": true,
      "feedback": "Right. That is why real code parses sys.argv[1:] rather than sys.argv. Getting it wrong shifts every argument by one and usually surfaces as a baffling 'unknown command'."
    },
    {
      "label": "'python', the interpreter the shell actually launched.",
      "feedback": "Tempting, because 'python' really is the first word on the command line and it is what the OS started. Python strips the interpreter and its own options before building argv, so index 0 is the script."
    }
  ]
}
\`\`\`

When you type \`mytool add 2 3\`, Python receives \`sys.argv\`, a list of strings: \`["mytool", "add", "2", "3"]\`. \`sys.argv[0]\` is the program name; the real arguments start at index \`1\`. Everything arrives as text, even \`"2"\`. A CLI does three things with that list:

1. Collect the raw string arguments.
2. Parse them into typed values (\`"2"\` to \`2\`).
3. Dispatch the command name to the function that handles it.

### Two ways to parse

The stdlib \`argparse\` builds the parser declaratively. \`parser.parse_args()\` reads \`sys.argv[1:]\` for you and applies each \`type=\` converter:

\`\`\`python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("command")
parser.add_argument("a", type=int)
parser.add_argument("b", type=int)
args = parser.parse_args()   # args.a is an int
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "argparse-type-converter",
  "prompt": "The parser above declares parser.add_argument('a', type=int). A user runs the tool passing abc where a number was expected. What happens?",
  "options": [
    {
      "label": "args.a holds the string 'abc', and the crash comes later when your code does arithmetic on it.",
      "feedback": "Tempting, because type= reads like a type annotation, and you have just learned that annotations do nothing at runtime. This one is genuinely different: argparse calls int('abc') itself while parsing."
    },
    {
      "label": "argparse prints a usage error and exits non-zero before any of your code runs.",
      "correct": true,
      "feedback": "Right. type= names a converter function that argparse really calls, and a failure there becomes a short usage message plus SystemExit. Your command function never receives a bad value."
    },
    {
      "label": "A ValueError traceback, since int('abc') raises.",
      "feedback": "Half right: int('abc') really does raise ValueError underneath. argparse catches it and turns it into a usage message instead, because a stack trace is not a useful thing to show someone at a terminal."
    }
  ]
}
\`\`\`

\`typer\` (built on \`click\`) turns a function's type hints into the CLI, so \`a: int\` becomes a required, int-converted argument:

\`\`\`python
import typer
app = typer.Typer()

@app.command()
def add(a: int, b: int):
    print(a + b)
\`\`\`

### The part worth isolating: dispatch

Underneath any parser, a CLI maps a command name to a function. Write that core as a plain function that takes \`argv\` as a parameter instead of reaching for \`sys.argv\` itself:

\`\`\`python
def run(argv):
    command, a, b = argv[0], int(argv[1]), int(argv[2])
    if command == "add":
        return a + b
    if command == "mul":
        return a * b
    return 0

print(run(["add", "2", "3"]))   # 5
\`\`\`

Because \`run\` receives its input, a test can call \`run(["mul", "4", "5"])\` and assert it returns \`20\`, with no subprocess and no shell.

### Splitting a token that may not contain the delimiter

A shell hands you an option two ways, \`--limit 10\` and \`--limit=10\`, so a token has to be read as "a name, and possibly a value glued on". \`str.split\` is awkward here because the number of pieces changes. \`str.partition\` always returns exactly three strings, so one unpacking covers both spellings:

\`\`\`python
>>> "--limit=10".partition("=")
('--limit', '=', '10')
>>> "--limit".partition("=")     # no delimiter: still three pieces
('--limit', '', '')
>>> name, sep, value = "--verbose".partition("=")
>>> bool(sep)                    # the middle piece answers "was there one?"
False
\`\`\`

The middle element is the separator itself when it was found and the empty string when it was not, which makes it the truthiness test for "did this token carry a value". Note the difference from \`split("=", 1)\`, which returns one piece or two and so needs a length check before you can unpack it.

### Pitfalls

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "argv-values-are-strings",
  "prompt": "Someone writes run so it does command, a, b = argv[0], argv[1], argv[2], with no int() anywhere. They call run(['add', '2', '3']). What comes back?",
  "options": [
    {
      "label": "5, because the add branch adds a and b.",
      "feedback": "Tempting, because that is plainly what the command means and it is what the same call returns as soon as you convert. Everything in argv is a string, and + on two strings concatenates rather than adds."
    },
    {
      "label": "'23', the two strings glued together.",
      "correct": true,
      "feedback": "Right, and the mul branch behaves differently: '2' * '3' raises TypeError. So one command fails loudly and the other fails silently. Convert once, at the boundary where the strings arrive."
    },
    {
      "label": "TypeError, since you cannot add two strings.",
      "feedback": "That is exactly what the mul branch would give you, where '2' * '3' really does raise. But + is defined for two strings, which is the whole reason this particular bug slips through code review."
    }
  ]
}
\`\`\`

- Arguments are strings. Skip \`int()\` and \`argv[1]\` is \`"2"\`, not \`2\`. Then \`"2" + "3"\` is \`"23"\` and \`"2" * "3"\` raises \`TypeError\`. Convert at the boundary.
- Off-by-one on \`argv\`. In a real \`main\`, the command is \`sys.argv[1]\`, not \`sys.argv[0]\` (that is the program name). Slicing \`sys.argv[1:]\` avoids the mistake.
- An unknown command should do something defined (here, return \`0\`), not fall through and crash.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "pure-core-testability",
  "prompt": "Two designs for the same tool. Design A: run(argv) takes the list as a parameter and returns a number. Design B: main() reads sys.argv itself and prints the result. Which is easier to unit-test, and why?",
  "options": [
    {
      "label": "They are equally testable. A test can set sys.argv before it calls main().",
      "feedback": "You can do that, and plenty of test suites do, which is why the two feel equivalent. But now the test mutates global interpreter state, has to restore it afterwards, and has to capture stdout to read the answer."
    },
    {
      "label": "Design A. A test calls run(['mul', '4', '5']) and asserts on the return value, with no globals and no stdout.",
      "correct": true,
      "feedback": "Right. This is the thin shell, pure core pattern: keep sys.argv and print out at the edge, and put every decision in a function that takes its input and returns its output."
    },
    {
      "label": "Design B, because it exercises the real entry point end to end.",
      "feedback": "There is a real point buried in here: you do want at least one test that goes through the actual entry point. That is an integration test though. Making it the only way to test your logic is what makes a suite slow and brittle."
    }
  ],
  "reveal": "The same split shows up everywhere: parsing and I/O at the edge, decisions in the middle. It is why the Practice exercise hands main its argv and has it return its output, rather than letting it reach for sys.argv and print."
}
\`\`\`

**Interview nuance:** this is the "thin shell, pure core" pattern interviewers look for. Keep argument reading and I/O at the edge (\`sys.argv\`, \`print\`) and put the decision logic in a pure function that takes \`argv\` and returns a value. A pure function is deterministic and trivial to unit-test: you assert on its return value. Once the logic reads global state or prints instead of returning, testing it means patching \`sys.argv\` and capturing stdout, which is slower and more brittle than checking a returned value.`,
    demoCode: `def run(argv):
    command, a, b = argv[0], int(argv[1]), int(argv[2])
    if command == "add":
        return a + b
    if command == "mul":
        return a * b
    return 0


print(run(["add", "2", "3"]))   # 5`,
  },
  apply: {
    id: "py-l3-cli-apply",
    executionMode: "single-file",
    estimatedMinutes: 6,
    prompt: `Warm-up (one file): implement \`run(argv)\`: \`argv\` is a list like \`["add", "2", "3"]\`. Read the
command and two integer arguments and return \`add\` or \`mul\` of them.

\`run(["add", "2", "3"])\` is \`5\`; \`run(["mul", "4", "5"])\` is \`20\`.`,
    starterCode: `def run(argv):
    # argv looks like ["add", "2", "3"]. Dispatch to add or mul.
    pass`,
    hints: [
      "The command is `argv[0]`; the numbers are `int(argv[1])` and `int(argv[2])`.",
      'Branch: `if command == "add": return a + b`.',
      "Add a `mul` branch returning `a * b`.",
    ],
    referenceSolution: `def run(argv):
    command = argv[0]
    a, b = int(argv[1]), int(argv[2])
    if command == "add":
        return a + b
    if command == "mul":
        return a * b
    return 0`,
    testCases: [
      { input: { argv: ["add", "2", "3"] }, expected: 5, description: "add" },
      { input: { argv: ["mul", "4", "5"] }, expected: 20, description: "mul" },
      { input: { argv: ["add", "10", "-3"] }, expected: 7, description: "add with a negative" },
      { input: { argv: ["mul", "0", "9"] }, expected: 0, description: "mul by zero" },
    ],
  },
  practice: {
    id: "py-l3-cli-practice",
    executionMode: "workspace",
    estimatedMinutes: 39,
    prompt: `Implement option handling for \`logtail\`, the small log tool in this workspace. The ticket
says it must accept \`--limit 10\`, \`--limit=10\`, the short forms, a \`--\` after which a
filename starting with a dash is still a filename, and it must answer a mistyped option with a
clear message and exit code \`2\` rather than a traceback.

\`cli/parser.py\` turns one command's \`argv\` into \`(options, positionals)\`. \`cli/dispatch.py\`
owns the command lookup, the \`--help\` text, and the exit codes. \`README.md\` has the exact
messages and the help layout. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Walk `argv` with an index rather than a `for` loop, because a value option has to be able to consume the token after it.",
      'Split each option token on `=` once: `token.partition("=")` gives you the name, whether there was an `=`, and the inline value in one step. A short form is the same option under another name, so translate it to the long name before you look it up in the spec.',
      'Seed `options` from the spec\'s defaults first, so an option nobody passed is already correct. In `main`, wrap the `parse_args` call in `try`/`except UsageError as exc` and return `2, [f"error: {exc}"]`.',
    ],
    workspace: {
      language: "python",
      primaryFilePath: "cli/parser.py",
      editableFilePaths: ["cli/parser.py", "cli/dispatch.py"],
      visibleTestPaths: ["tests/test_cli.py"],
      hiddenTestPaths: ["tests/test_cli_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CLI_README },
        { path: "cli/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "cli/errors.py",
          role: "readonly",
          language: "python",
          content: CLI_ERRORS,
          description: "UsageError (read-only)",
        },
        {
          path: "cli/commands.py",
          role: "readonly",
          language: "python",
          content: CLI_COMMANDS,
          description: "The command table and document store (read-only)",
        },
        {
          path: "cli/parser.py",
          role: "editable",
          language: "python",
          content: CLI_PARSER_STARTER,
          description: "Implement parse_args here",
        },
        {
          path: "cli/dispatch.py",
          role: "editable",
          language: "python",
          content: CLI_DISPATCH_STARTER,
          description: "Implement help_lines and main here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_cli.py",
          role: "test",
          language: "python",
          content: CLI_TEST,
          description: "Visible parser and dispatcher tests",
        },
        {
          path: "tests/test_cli_hidden.py",
          role: "test",
          language: "python",
          content: CLI_TEST_HIDDEN,
          hidden: true,
          description: "Hidden edge-case tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_cli", label: "visible cli" },
            { module: "test_cli_hidden", label: "hidden cli" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "cli/parser.py",
          role: "editable",
          language: "python",
          content: CLI_PARSER_REFERENCE,
        },
        {
          path: "cli/dispatch.py",
          role: "editable",
          language: "python",
          content: CLI_DISPATCH_REFERENCE,
        },
      ],
    },
  },
}

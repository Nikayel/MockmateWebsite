import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

// ───────────────────────────────────────────────────────────────────────────
// L3-M5: Real Programs & Tooling
// ───────────────────────────────────────────────────────────────────────────

const CLI_README = `# A tiny command dispatcher

A CLI maps a command name to a function. \`cli/commands.py\` (read-only) has \`add\` and \`mul\`;
implement \`run(argv)\` in \`cli/app.py\` so it reads a command and two integer arguments from the
\`argv\` list and returns the result.

Example: \`run(["add", "2", "3"])\` is \`5\`; \`run(["mul", "4", "5"])\` is \`20\`. Some tests are
hidden.
`

const CLI_COMMANDS = String.raw`def add(a, b):
    return a + b


def mul(a, b):
    return a * b
`

const CLI_APP_STARTER = String.raw`from cli.commands import add, mul


def run(argv):
    """Dispatch ["add", "2", "3"] -> 5 using add/mul (see README.md)."""
    # TODO: read argv[0] as the command and argv[1], argv[2] as int args.
    return 0
`

const CLI_APP_REFERENCE = String.raw`from cli.commands import add, mul


def run(argv):
    command = argv[0]
    a, b = int(argv[1]), int(argv[2])
    if command == "add":
        return add(a, b)
    if command == "mul":
        return mul(a, b)
    raise ValueError(f"unknown command: {command}")
`

const CLI_TEST = String.raw`from cli.app import run


def run_tests(record):
    def add_command():
        assert run(["add", "2", "3"]) == 5, f"got {run(['add', '2', '3'])!r}"

    def mul_command():
        assert run(["mul", "4", "5"]) == 20, f"got {run(['mul', '4', '5'])!r}"

    record("add command", add_command)
    record("mul command", mul_command)
`

const CLI_TEST_HIDDEN = String.raw`from cli.app import run


def run_tests(record):
    def negative_args():
        assert run(["add", "10", "-3"]) == 7

    def multiply_by_zero():
        assert run(["mul", "0", "9"]) == 0

    record("negative args", negative_args)
    record("multiply by zero", multiply_by_zero)
`

export const cliLesson: PythonLesson = {
  id: "py-l3-cli",
  title: "Building a CLI: parse and dispatch argv (argparse/typer preview)",
  summary: "Turn argument lists into commands with a testable dispatcher.",
  estimatedMinutes: 18,
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
  "reveal": "The same split shows up everywhere: parsing and I/O at the edge, decisions in the middle. It is why the Practice exercise hands run its argv rather than letting it reach for sys.argv."
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
    prompt: `Implement \`run(argv)\` in \`cli/app.py\`: read the command name and two integer arguments from
\`argv\`, dispatch to the read-only \`add\`/\`mul\` commands, and return the result. Some tests are
hidden.`,
    starterCode: "",
    hints: [
      "`add` and `mul` are imported for you from `cli.commands`.",
      "`argv[0]` is the command; `int(argv[1])` and `int(argv[2])` are the operands.",
      "Dispatch with `if`/`if` and return the call's result.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "cli/app.py",
      editableFilePaths: ["cli/app.py"],
      visibleTestPaths: ["tests/test_app.py"],
      hiddenTestPaths: ["tests/test_app_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CLI_README },
        { path: "cli/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "cli/commands.py",
          role: "readonly",
          language: "python",
          content: CLI_COMMANDS,
          description: "Command functions (read-only)",
        },
        {
          path: "cli/app.py",
          role: "editable",
          language: "python",
          content: CLI_APP_STARTER,
          description: "Implement run(argv) here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_app.py",
          role: "test",
          language: "python",
          content: CLI_TEST,
          description: "Visible dispatcher tests",
        },
        {
          path: "tests/test_app_hidden.py",
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
            { module: "test_app", label: "visible app" },
            { module: "test_app_hidden", label: "hidden app" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        { path: "cli/app.py", role: "editable", language: "python", content: CLI_APP_REFERENCE },
      ],
    },
  },
}

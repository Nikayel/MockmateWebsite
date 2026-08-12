import type { PythonLesson } from "../../types"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const CAP_README = `# Capstone: a todo reporter

Tie Level 3 together. This is a small, real project: a \`todo\` package with sample tasks, tests,
and a \`pyproject.toml\`. Implement \`summary(tasks)\` in \`todo/report.py\` so it returns the counts a
CLI or API would report:

\`\`\`python
{"total": <count>, "done": <completed>, "pending": <not done>}
\`\`\`

Each task is a dict like \`{"title": "...", "done": True}\`. Some tests are hidden.
`

const CAP_PYPROJECT = String.raw`[project]
name = "todo"
version = "0.1.0"
description = "A tiny todo reporter"
requires-python = ">=3.11"
dependencies = []

[project.scripts]
todo = "todo.cli:main"

[tool.pytest.ini_options]
testpaths = ["tests"]
`

const CAP_TASKS = String.raw`TASKS = [
    {"title": "write tests", "done": True},
    {"title": "ship feature", "done": False},
    {"title": "review PR", "done": True},
]
`

const CAP_REPORT_STARTER = String.raw`def summary(tasks):
    """Return {"total", "done", "pending"} counts for the tasks (see README.md)."""
    # TODO: count total, done (task["done"] is True), and pending.
    return {}
`

const CAP_REPORT_REFERENCE = String.raw`def summary(tasks):
    done = sum(1 for task in tasks if task["done"])
    return {"total": len(tasks), "done": done, "pending": len(tasks) - done}
`

const CAP_TEST = String.raw`from todo.report import summary
from todo.tasks import TASKS


def run_tests(record):
    def counts_sample_tasks():
        assert summary(TASKS) == {"total": 3, "done": 2, "pending": 1}, f"got {summary(TASKS)!r}"

    def empty_is_all_zero():
        assert summary([]) == {"total": 0, "done": 0, "pending": 0}

    record("counts the sample tasks", counts_sample_tasks)
    record("empty list is all zero", empty_is_all_zero)
`

const CAP_TEST_HIDDEN = String.raw`from todo.report import summary


def run_tests(record):
    def all_done():
        tasks = [{"title": "a", "done": True}, {"title": "b", "done": True}]
        assert summary(tasks) == {"total": 2, "done": 2, "pending": 0}

    def none_done():
        tasks = [{"title": "a", "done": False}]
        assert summary(tasks) == {"total": 1, "done": 0, "pending": 1}

    record("all tasks done", all_done)
    record("no tasks done", none_done)
`

export const uvPyprojectCapstoneLesson: PythonLesson = {
  id: "py-l3-uv-pyproject-capstone",
  title: "Dependencies, pyproject & a mini capstone",
  summary: "Understand pyproject.toml/uv and extend a small, tested multi-file project.",
  estimatedMinutes: 22,
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

Your capstone project is laid out this way: a \`todo/\` package directory holds modules like \`tasks.py\` (sample tasks) and \`report.py\` (where \`summary\` lives), with \`pyproject.toml\` at the root naming the package.

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
      "label": "the todo/ package source",
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
    prompt: `Capstone: implement \`summary(tasks)\` in \`todo/report.py\` so it returns
\`{"total", "done", "pending"}\` counts for the project's tasks. Read \`pyproject.toml\` and
\`todo/tasks.py\` for context. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "`len(tasks)` is the total count.",
      'Completed tasks have `task["done"] == True`; count them with a generator + `sum`.',
      "Pending is whatever's left: `total - done`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "todo/report.py",
      editableFilePaths: ["todo/report.py"],
      visibleTestPaths: ["tests/test_report.py"],
      hiddenTestPaths: ["tests/test_report_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: CAP_README },
        { path: "pyproject.toml", role: "docs", language: "text", content: CAP_PYPROJECT },
        { path: "todo/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "todo/tasks.py",
          role: "readonly",
          language: "python",
          content: CAP_TASKS,
          description: "Sample task data (read-only)",
        },
        {
          path: "todo/report.py",
          role: "editable",
          language: "python",
          content: CAP_REPORT_STARTER,
          description: "Implement summary here",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_report.py",
          role: "test",
          language: "python",
          content: CAP_TEST,
          description: "Visible capstone tests",
        },
        {
          path: "tests/test_report_hidden.py",
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
            { module: "test_report", label: "visible report" },
            { module: "test_report_hidden", label: "hidden report" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "todo/report.py",
          role: "editable",
          language: "python",
          content: CAP_REPORT_REFERENCE,
        },
      ],
    },
  },
}

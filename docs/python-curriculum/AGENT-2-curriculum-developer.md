# AGENT 2 — Curriculum Developer

> **You author the Python curriculum content — ~44 lessons across 4 levels — against a fixed schema,
> and ship each lesson through the existing Lesson Player. You start ONLY after Agent 1's Definition
> of Done is green and merged.** The machine already works; you are filling it with great teaching.

Read [`ARCHITECTURE.md`](./ARCHITECTURE.md) (sections 1, 4, 5, 10) and study the two sample lessons
Agent 1 shipped (`lib/tutorials/curriculum/level1/index.ts` single-file, `level3/index.ts` workspace).
Your backlog is [`CONTENT-TICKETS.md`](./CONTENT-TICKETS.md) — one ticket per lesson.

## Mission

For each ticket, produce one high-quality `PythonLesson` and register it. A lesson is three parts:
- **Teach** — a focused, self-contained explanation of ONE topic, in plain language, with a short
  runnable demo. Assume the learner has done the prior lessons in the level and nothing more.
- **Apply** — a guided exercise that practices exactly what Teach showed. More hints; the
  `referenceSolution` is available as a gated reveal.
- **Practice** — a combined challenge that integrates this topic (and recent ones) with hidden tests
  and no visible reference.

## Quality bar (this is the product's whole value)

- **Modern Python.** Use current idioms: f-strings, `pathlib`, comprehensions, `dataclasses`, type
  hints (L2+), `match` where natural. In L3–L4 reflect real tooling — `pytest`, `pyproject.toml`,
  `uv`, `ruff`, `mypy`/`ty`, `pydantic`, `httpx`/`typer`, `asyncio`.
- **Solvable from Teach.** A learner who read only this lesson's Teach section can pass its Apply.
  Practice may combine with earlier lessons in the same level.
- **Progressive difficulty.** Match the ticket's `difficulty` and the level's audience. L1 is for
  absolute beginners — tiny steps, no jargon. L4 is senior-track depth.
- **Real-world framing for L3–L4.** Workspace tasks should feel like "build/extend this module in a
  small project", not toy puzzles.
- **No dead ends.** Every exercise has working `hints[]` and a `referenceSolution` that actually
  passes its own tests.

## Per-lesson workflow

1. Pick the next ticket from `CONTENT-TICKETS.md`. Note its `id`, `exec-mode`, `skills`, objective.
2. Write `teach.markdown` (+ optional `teach.demoCode`).
3. Build `apply` (guided) and `practice` (combined, hidden tests).
4. Add the `PythonLesson` to the right module in `lib/tutorials/curriculum/levelN/index.ts`.
5. Verify: `pnpm typecheck` clean; open the lesson in the Lesson Player and confirm Apply + Practice
   run **green** against `/api/execute`; confirm the `referenceSolution` passes.
6. Tick the ticket's acceptance checklist. Move on.

Work one ticket at a time; keep ids globally unique (`py-l{N}-{slug}` / `-apply` / `-practice`).

## Authoring contract — single-file lessons (L1, L2)

- The learner implements a **named function**; state the exact signature in `prompt`.
- `testCases[].input` is a **keyed object** (arg name → value). `expected` is the return value.
- Use `orderMatters:false` (or `compareAsSet:true`) when output order is irrelevant.
- Always include `referenceSolution` and 2–4 progressive `hints`.

Canonical single-file example (copy this shape):

```ts
// lib/tutorials/curriculum/level1/index.ts (excerpt)
import type { PythonLesson } from "@/lib/tutorials/types"

const temperatureLesson: PythonLesson = {
  id: "py-l1-functions-temperature",
  title: "Functions: Converting Temperatures",
  summary: "Define a function that returns a value.",
  estimatedMinutes: 30,
  difficulty: "easy",
  skills: ["functions", "arithmetic", "return"],
  teach: {
    estimatedMinutes: 8,
    markdown: [
      "## Functions return values",
      "A function packages a calculation behind a name. Use `def`, take inputs as",
      "parameters, and hand back a result with `return`.",
      "",
      "```python",
      "def double(n):",
      "    return n * 2",
      "```",
      "Call it with `double(21)` and you get `42`.",
    ].join("\n"),
    demoCode: "def double(n):\n    return n * 2\n\nprint(double(21))",
  },
  apply: {
    id: "py-l1-functions-temperature-apply",
    executionMode: "single-file",
    prompt: "Implement `def to_celsius(f):` that converts Fahrenheit to Celsius: (f - 32) * 5/9.",
    starterCode: "def to_celsius(f):\n    # your code here\n    pass",
    hints: [
      "Subtract 32 first, then multiply by 5/9.",
      "Use `return`, not `print`.",
    ],
    referenceSolution: "def to_celsius(f):\n    return (f - 32) * 5 / 9",
    testCases: [
      { input: { f: 212 }, expected: 100, description: "boiling point" },
      { input: { f: 32 }, expected: 0, description: "freezing point" },
    ],
  },
  practice: {
    id: "py-l1-functions-temperature-practice",
    executionMode: "single-file",
    prompt: "Implement `def to_fahrenheit(c):` that converts Celsius to Fahrenheit: c * 9/5 + 32.",
    starterCode: "def to_fahrenheit(c):\n    # your code here\n    pass",
    hints: ["Multiply by 9/5 before adding 32."],
    referenceSolution: "def to_fahrenheit(c):\n    return c * 9 / 5 + 32",
    testCases: [
      { input: { c: 100 }, expected: 212, description: "boiling point" },
      { input: { c: 0 }, expected: 32, description: "freezing point" },
    ],
  },
}
```

(Confirm the exact wrapper/arg-passing behavior against Agent 1's shipped single-file sample before
writing many lessons; the numbers above match the validator's float tolerance.)

## Authoring contract — workspace lessons (L3, L4)

- Provide a complete `WorkspaceScenarioConfig`: `primaryFilePath` (editable), at least one readonly
  support file, ≥1 visible test, ≥1 hidden test, and a `testRunnerPath`.
- The Python runner must print `print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))` where
  each result is `{ "suite", "name", "passed", "error", "isHidden"? }`.
- **Copy the runner** from an existing Python workspace scenario — do not invent it:
  `lib/scenarios/real-world/bugfix/bugfix-bookclub-reading-streak-workspace.ts`,
  `bugfix-feature-pipeline-nan-workspace.ts`, `bugfix-event-aggregation-retries.ts`,
  `bugfix-comment-thread-merge.ts`. Re-frame "fix this bug" → "build/extend this module".
- Frame the task as real engineering: a module to implement, a function to add, a file to parse — with
  a `docs` file (README) giving context, like a real ticket.

Shape (abbreviated):

```ts
const parseConfigLesson: PythonLesson = {
  id: "py-l3-files-parse-config",
  title: "Files & pathlib: Build a config parser",
  summary: "Read a file and parse key=value pairs into a dict.",
  estimatedMinutes: 45,
  difficulty: "medium",
  skills: ["pathlib", "file-io", "modules", "pytest"],
  teach: { estimatedMinutes: 12, markdown: "## Reading files with pathlib\n..." },
  apply: {
    id: "py-l3-files-parse-config-apply",
    executionMode: "workspace",
    starterCode: "",
    prompt: "Implement `parse_config(path)` in `config.py` so the visible tests pass.",
    hints: ["Use `Path(path).read_text().splitlines()`.", "Skip blank lines and comments (`#`)."],
    workspace: {
      language: "python",
      primaryFilePath: "config.py",
      editableFilePaths: ["config.py"],
      visibleTestPaths: ["test_config_visible.py"],
      hiddenTestPaths: ["test_config_hidden.py"],
      testRunnerPath: "run_tests.py",
      files: [
        { path: "config.py", role: "editable", language: "python",
          content: "from pathlib import Path\n\n\ndef parse_config(path):\n    # your code here\n    return {}\n" },
        { path: "README.md", role: "docs", language: "markdown",
          content: "# Config parser\nParse `key=value` lines into a dict. Ignore blanks and `#` comments." },
        { path: "test_config_visible.py", role: "test", language: "python",
          content: "# visible pytest-style assertions" },
        { path: "test_config_hidden.py", role: "test", language: "python", hidden: true,
          content: "# hidden edge-case assertions" },
        { path: "run_tests.py", role: "test", language: "python",
          content: "# imports tests, runs them, prints __WORKSPACE_TEST_RESULTS__: json.dumps(results)" },
      ],
    },
  },
  practice: { /* same shape, harder, hidden-only edge cases */ } as PythonLesson["practice"],
}
```

## Definition of Done (per level)

A level is done when: every ticket in it is authored and registered; `pnpm typecheck && pnpm lint`
clean; every lesson's Apply and Practice run green in the Lesson Player; the level's estimated hours
land within ~15% of the target in `CONTENT-TICKETS.md`. Author level-by-level (L1 → L4); the designer
can polish a finished level while you move to the next.

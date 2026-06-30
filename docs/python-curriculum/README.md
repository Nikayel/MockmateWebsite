# Python Learning Curriculum — Blueprint Pack

> **What this is.** A research-backed blueprint for an interactive, 4-level Python learning
> product inside CodeSparring. It is a set of specs, not code. Two downstream agents build the
> product from these specs, then a designer polishes the UI.

## 1. Vision & positioning

Generic Python tutorials (w3schools-style) are flat and passive: read a wall of text, maybe copy a
snippet, never prove you learned it. We are building the opposite — an **interactive curriculum**
where the learner picks a level and every topic runs a **Teach → Apply → Practice** loop:

1. **Teach** — read a focused explanation of one topic, with a runnable demo.
2. **Apply** — implement it with guidance (more hints; reference solution unlocks after N attempts).
3. **Practice** — prove it on a combined, auto-graded challenge (hidden reference, hidden tests).

- **Level 1** is marketed to **absolute beginners** (free top-of-funnel).
- **Levels 2–4** are for people who want to advance to **real-world engineering** — the syntax,
  tooling, and project shapes used in actual codebases (multi-file projects, type hints, pytest,
  CLIs, APIs, packaging, concurrency, async).
- Logged-in only; progress persists to Firestore. ~**40 hours** of material total.

## 2. The four levels (~41h, ~20 modules, ~44 lessons)

Hierarchy: **Level → Module → Lesson**. Each Lesson = Teach + Apply + Practice. L1–L2 grade with
**single-file** execution; L3–L4 use **multi-file workspace** execution (real files, real `pytest`).

| Level | Title | Hours | Exec mode | Audience |
|------:|-------|------:|-----------|----------|
| 1 | Python Fundamentals | ~9h | single-file | Beginners (marketed) |
| 2 | Python Intermediate | ~10h | single-file | Advancing learners |
| 3 | Applied Engineering | ~11h | workspace | Real-codebase skills |
| 4 | Production & Mastery | ~11h | workspace | Senior-track depth |

Full module/lesson breakdown lives in [`CONTENT-TICKETS.md`](./CONTENT-TICKETS.md). Summary:

- **L1 Fundamentals** — First Steps · Data Types · Strings & Formatting · Collections · Control Flow & Functions.
- **L2 Intermediate** — Comprehensions & Generators · Functions in Depth · OOP Foundations · Data Modeling (dataclasses/enums/typing) · Errors, Files & Modules.
- **L3 Applied Engineering** — Project Structure & Packaging · Type Hints & Static Typing · Testing with pytest · Files, Data & Robustness · Real Programs & Tooling (CLI, REST+pydantic, uv/pyproject).
- **L4 Production & Mastery** — Advanced OOP & Design Patterns · Decorators & Metaprogramming · Concurrency & Async · Performance & Production Practices · Quality, Packaging & Capstone.

## 3. How the work is structured (agent handoff model)

```
   AGENT 1 — Backend "loop engineer"          AGENT 2 — Curriculum developer
   Ships scaffold + backend, loops    ──▶     Authors ~44 lessons against the
   until Definition of Done is green          schema, ships via the Lesson Player
   (wiring / types / edge cases /             front end.
   grading).                                          │
        gate: backend DoD green                       ▼
                                            Designer polishes the UI
```

- **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — the engineering source of truth both agents build against (data model, registry, routes, components, progress, the critical execution-reuse seam, the lesson schema contract). Read this first.
- **[`AGENT-1-backend-engineer.md`](./AGENT-1-backend-engineer.md)** — the backend agent's mission, build order, **Definition of Done**, edge cases, and iteration loop. Designed to be run as an autonomous / `/loop` agent that keeps shipping until DoD is green.
- **[`AGENT-2-curriculum-developer.md`](./AGENT-2-curriculum-developer.md)** — the content agent's mission, per-lesson authoring workflow, the authoring contract, and two canonical sample lessons to copy. Starts **after** Agent 1's DoD passes.
- **[`CONTENT-TICKETS.md`](./CONTENT-TICKETS.md)** — the backlog: one JIRA-style ticket per lesson (~44), pre-filled with id, exec-mode, skills, objective, and acceptance criteria.

> **Both agent specs are `/loop` runbooks.** Run each with Claude Code's `/loop` (dynamic,
> self-paced) — each iteration does one unit of work, verifies, commits, and ticks a checklist,
> and the loop ends itself at its terminal condition (Agent 1: Definition of Done green;
> Agent 2: all CONTENT-TICKETS checked). See the "LOOP CONTRACT" at the top of each file.

**Sequencing rule:** Agent 2 must not author beyond the two sample lessons until Agent 1's
Definition of Done is green and merged, because the lesson schema and the runner are Agent 1's
deliverables. The two sample lessons (one single-file, one workspace) are built by Agent 1 as proof
and double as Agent 2's reference examples.

## 4. Why this is cheap to build (reuse, not rebuild)

The platform already has every hard part. The blueprint deliberately reuses it (see ARCHITECTURE
section "Reuse vs build"):

- **Execution**: the existing `/api/execute` route already runs Python single-file *and* multi-file
  workspaces on Piston, with quota, rate-limiting, validation, and analytics. We add a **one-line**
  scenario resolver so it also finds tutorial exercises — no new execution code.
- **Editor / results / UI**: `CodeMirrorEditor`, `TestResultsPanel`, `MarkdownRenderer`, and the
  `components/ui/*` primitives are reused as-is.
- **Patterns to mirror**: Case Labs (`lib/labs/*`, `app/labs/*`, `components/labs/stations/BuildStation.tsx`)
  is the exact template for the registry, the persistence service, the Zustand store, the autosave
  hook, and the workspace runner.
- **Workspace lessons** reuse `WorkspaceScenarioConfig` — there are already **Python** workspace
  scenarios to copy (e.g. `lib/scenarios/real-world/bugfix/bugfix-bookclub-reading-streak-workspace.ts`).

## 5. Research basis

The curriculum reflects current (2025–2026) consensus on what a Python developer should learn and
what real codebases use today:

- **Progression** — fundamentals → OOP/intermediate (comprehensions, dataclasses, error handling,
  file I/O, modules) → applied (type hints, pytest, pathlib, packaging) → advanced
  (concurrency, async, metaprogramming, performance, packaging). Sources: Real Python learning paths,
  roadmap.sh/python, Coursera & DataCamp Python roadmaps.
- **Modern tooling (Levels 3–4)** — type checking (mypy / Astral's `ty`), `pytest`, **single
  `pyproject.toml`** config, **uv** (fast package/project manager), **ruff** (lint+format), pre-commit,
  `pydantic` for validation, `httpx`/`typer` for real programs, `asyncio` for concurrency. Sources:
  pydevtools handbook, "Modern Python Tooling 2026" guides, Astral docs. Ruff/uv are used by FastAPI,
  LangChain, Hugging Face, etc.

Sources:
- [Real Python — Learning Paths](https://realpython.com/learning-paths/)
- [roadmap.sh — Python](https://roadmap.sh/python)
- [Coursera — Python Learning Roadmap (2026)](https://www.coursera.org/resources/python-learning-roadmap)
- [DataCamp — Python Roadmap](https://www.datacamp.com/blog/python-roadmap)
- [pydevtools — Set up a complete Python project (uv, Ruff, ty, pytest, pre-commit)](https://pydevtools.com/handbook/tutorial/set-up-a-complete-python-project/)
- [Modern Python Tooling 2026 — uv, Ruff, ty](https://softaims.com/blog/modern-python-tooling-uv-ruff-mypy-2026)

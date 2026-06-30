# CONTENT TICKETS — Python Curriculum Backlog

One JIRA-style ticket per lesson (~44), grouped Level → Module. **Agent 2** works this backlog after
Agent 1's Definition of Done is green. Each ticket is sized to one `PythonLesson` (Teach + Apply +
Practice). Build top-to-bottom within a level so dependencies (earlier topics) are already authored.

## Shared acceptance criteria (every ticket)

- [ ] Produces one `PythonLesson` exported into the correct `lib/tutorials/curriculum/levelN/index.ts` module.
- [ ] Ids unique: lesson `py-l{N}-{slug}`, exercises `-apply` / `-practice`.
- [ ] `teach.markdown` self-contained; optional `teach.demoCode` runs with no input.
- [ ] Exec mode matches the ticket; single-file uses a named function + keyed `input`; workspace uses a
      valid `WorkspaceScenarioConfig` whose runner prints `__WORKSPACE_TEST_RESULTS__:` JSON.
- [ ] `referenceSolution`/reference files pass their own tests; 2–4 progressive `hints`.
- [ ] `pnpm typecheck` + `pnpm lint` clean; Apply + Practice run **green** in the Lesson Player.
- [ ] `estimatedMinutes`, `difficulty`, `skills[]` set.

Legend: **SF** = single-file, **WS** = workspace.

---

## LEVEL 1 — Python Fundamentals (~9h, single-file, beginner) — 12 lessons

### Module L1-M1 — First Steps
- [x] **PY-L1-01 · `py-l1-hello`** (SF, easy) — *print, comments, running code.* Objective: produce output with `print()`, write comments, understand a program runs top-to-bottom.
- [x] **PY-L1-02 · `py-l1-variables`** (SF, easy) — *variables & assignment.* Objective: bind names to values, reassign, choose readable names.

### Module L1-M2 — Data Types
- [x] **PY-L1-03 · `py-l1-numbers`** (SF, easy) — *ints, floats & arithmetic.* Objective: arithmetic, integer vs float division, modulo.
- [x] **PY-L1-04 · `py-l1-bool-none-convert`** (SF, easy) — *booleans, None & type conversion.* Objective: `True/False/None`, `int()/float()/str()`, truthiness intro.

### Module L1-M3 — Strings & Formatting
- [x] **PY-L1-05 · `py-l1-strings-index`** (SF, easy) — *string indexing & slicing.* Objective: index, slice, `len()`, immutability.
- [x] **PY-L1-06 · `py-l1-strings-methods`** (SF, easy) — *string methods & f-strings.* Objective: `.upper/.lower/.strip/.split/.replace`, f-string formatting.

### Module L1-M4 — Collections
- [x] **PY-L1-07 · `py-l1-lists`** (SF, easy) — *lists.* Objective: create/index/slice, append/insert/remove, iterate.
- [x] **PY-L1-08 · `py-l1-tuples-sets`** (SF, easy) — *tuples & sets.* Objective: immutable tuples, unique-membership sets, when to use each.
- [x] **PY-L1-09 · `py-l1-dicts`** (SF, easy) — *dictionaries.* Objective: key/value access, add/update/delete, iterate items.

### Module L1-M5 — Control Flow & Functions
- **PY-L1-10 · `py-l1-conditionals`** (SF, easy) — *if/elif/else & logical operators.* Objective: branch on conditions, `and/or/not`, comparisons.
- **PY-L1-11 · `py-l1-loops`** (SF, easy) — *for, while, range, break/continue.* Objective: iterate collections and ranges, control loop flow.
- **PY-L1-12 · `py-l1-functions`** (SF, easy) — *functions, params, return (+ reading errors).* Objective: define functions with params/defaults/return; read a traceback.

---

## LEVEL 2 — Python Intermediate (~10h, single-file) — 12 lessons

### Module L2-M1 — Comprehensions & Generators
- **PY-L2-01 · `py-l2-comprehensions`** (SF, easy) — *list/dict/set comprehensions.* Objective: transform/filter collections concisely.
- **PY-L2-02 · `py-l2-generators`** (SF, medium) — *generators, `yield` & iterators.* Objective: lazy sequences, the iterator protocol, when to stream.

### Module L2-M2 — Functions in Depth
- **PY-L2-03 · `py-l2-args-kwargs`** (SF, medium) — *`*args`, `**kwargs`, keyword args.* Objective: flexible signatures and argument unpacking.
- **PY-L2-04 · `py-l2-lambdas-hof`** (SF, medium) — *lambdas & higher-order functions.* Objective: `sorted(key=...)`, `map`/`filter`, functions as values.
- **PY-L2-05 · `py-l2-closures-decorators`** (SF, medium) — *scope, closures & decorators (intro).* Objective: capture state in closures; write a simple decorator.

### Module L2-M3 — OOP Foundations
- **PY-L2-06 · `py-l2-classes`** (SF, medium) — *classes, `__init__`, methods & `self`.* Objective: model state + behavior with a class.
- **PY-L2-07 · `py-l2-inheritance-composition`** (SF, medium) — *inheritance & composition.* Objective: extend a base class; prefer composition when apt.
- **PY-L2-08 · `py-l2-dunder-properties`** (SF, medium) — *dunder methods & properties.* Objective: `__repr__`/`__eq__`, computed `@property`.

### Module L2-M4 — Data Modeling
- **PY-L2-09 · `py-l2-dataclasses-enums`** (SF, medium) — *dataclasses, enums & typing basics.* Objective: `@dataclass`, `Enum`, `list[int]`/`Optional` annotations.

### Module L2-M5 — Errors, Files & Modules
- **PY-L2-10 · `py-l2-exceptions`** (SF, medium) — *try/except/finally, raising, custom exceptions.* Objective: handle and define exceptions cleanly.
- **PY-L2-11 · `py-l2-files-json-csv`** (SF, medium) — *file I/O, context managers, JSON & CSV.* Objective: read/write files with `with`; parse JSON/CSV.
- **PY-L2-12 · `py-l2-modules`** (SF, medium) — *modules, imports & the standard library.* Objective: organize/import code; use stdlib (`math`, `collections`, `datetime`).

---

## LEVEL 3 — Applied Engineering (~11h, workspace, real codebases) — 10 lessons

### Module L3-M1 — Project Structure & Packaging
- **PY-L3-01 · `py-l3-packages`** (WS, medium) — *modules vs packages, `__init__.py`, project layout.* Objective: structure a multi-file package with a clear entry point.

### Module L3-M2 — Type Hints & Static Typing
- **PY-L3-02 · `py-l3-type-hints`** (WS, medium) — *annotations on functions/classes.* Objective: add precise type hints to a module.
- **PY-L3-03 · `py-l3-typing-module`** (WS, medium) — *`typing`: Optional/Union, generics, Protocols (+ mypy/ty mindset).* Objective: type a small generic/Protocol-based API.

### Module L3-M3 — Testing with pytest
- **PY-L3-04 · `py-l3-pytest-basics`** (WS, medium) — *pytest assertions & structure.* Objective: write/pass `pytest` tests for a module.
- **PY-L3-05 · `py-l3-pytest-fixtures`** (WS, medium) — *fixtures & parametrize (TDD a module).* Objective: share setup with fixtures; cover cases with `parametrize`.

### Module L3-M4 — Files, Data & Robustness
- **PY-L3-06 · `py-l3-pathlib`** (WS, medium) — *pathlib & file processing in a project.* Objective: read/transform/write files across a small project.
- **PY-L3-07 · `py-l3-logging-errors`** (WS, medium) — *logging & exception design.* Objective: structured `logging`; design error boundaries.

### Module L3-M5 — Real Programs & Tooling
- **PY-L3-08 · `py-l3-cli`** (WS, medium) — *building a CLI (argparse/typer).* Objective: a runnable CLI with args/subcommands.
- **PY-L3-09 · `py-l3-rest-pydantic`** (WS, hard) — *consuming a REST API with httpx + pydantic.* Objective: fetch + validate external data into typed models.
- **PY-L3-10 · `py-l3-uv-pyproject-capstone`** (WS, hard) — *dependencies & packaging (uv/pyproject) + mini capstone.* Objective: understand `pyproject.toml`/uv; extend & test a small multi-file project (capstone).

---

## LEVEL 4 — Production & Mastery (~11h, workspace, senior-track) — 10 lessons

### Module L4-M1 — Advanced OOP & Design Patterns
- **PY-L4-01 · `py-l4-abc-protocols`** (WS, hard) — *ABCs & Protocols.* Objective: define interfaces with `abc`/`Protocol`; program to abstractions.
- **PY-L4-02 · `py-l4-solid-patterns`** (WS, hard) — *SOLID & design patterns (factory, strategy).* Objective: refactor toward SOLID; apply factory/strategy.

### Module L4-M2 — Decorators & Metaprogramming
- **PY-L4-03 · `py-l4-decorators-advanced`** (WS, hard) — *decorators with arguments & `functools.wraps`.* Objective: parameterized, well-behaved decorators.
- **PY-L4-04 · `py-l4-descriptors-metaclasses`** (WS, hard) — *descriptors & intro to metaclasses.* Objective: customize attribute access; understand class creation.

### Module L4-M3 — Concurrency & Async
- **PY-L4-05 · `py-l4-concurrency`** (WS, hard) — *threading, multiprocessing & the GIL (`concurrent.futures`).* Objective: choose the right model; parallelize safely.
- **PY-L4-06 · `py-l4-asyncio`** (WS, hard) — *async/await & asyncio.* Objective: write concurrent async I/O with `asyncio`.

### Module L4-M4 — Performance & Production Practices
- **PY-L4-07 · `py-l4-performance`** (WS, hard) — *profiling, complexity & caching (`lru_cache`, generators).* Objective: measure and speed up a hot path.
- **PY-L4-08 · `py-l4-config-logging`** (WS, hard) — *configuration, secrets & structured logging.* Objective: production-grade config + observability.

### Module L4-M5 — Quality, Packaging & Capstone
- **PY-L4-09 · `py-l4-testing-tooling`** (WS, hard) — *mocking, coverage & modern tooling (ruff, mypy/ty, pre-commit).* Objective: robust tests + clean tooling on a real module.
- **PY-L4-10 · `py-l4-packaging-capstone`** (WS, hard) — *packaging/distribution + production capstone.* Objective: build a typed, tested, packaged service/library (capstone integrating L3–L4).

---

## Notes for the assigner

- ~44 tickets total (12 + 12 + 10 + 10). Tickets are independent within a module but assume earlier
  lessons in the same level exist — assign per level, in order.
- L1–L2 are single-file (fast to author). L3–L4 are workspace (heavier — budget more time per ticket).
- Two reference lessons already exist (Agent 1's single-file L1 sample and workspace L3 sample);
  point each content agent at them plus `AGENT-2-curriculum-developer.md`.

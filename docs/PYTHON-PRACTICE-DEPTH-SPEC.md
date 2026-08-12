# Python curriculum: the Practice phase must be a second problem, not a second copy

Binding authoring spec for the L3/L4 practice rework. Every rewritten `practice` exercise is
reviewed against this document.

## The defect this fixes

Across Levels 3 and 4, the Apply and Practice phases are the same exercise twice. Apply asks for a
function in a single file; Practice asks for **the same function, with the same signature, solving
the same case**, relocated into a package with one editable file. `py-l4-solid-patterns` is the
clearest instance:

- Apply: "implement `price_for(kind, amount)` that applies a discount by kind."
- Practice: "implement `price_for(kind, amount)` in `pricing/checkout.py` using the STRATEGIES dict."

A learner who finished Apply can paste their answer into Practice and pass. Nothing is retrieved,
nothing is harder, and the phase named "Make it stick" is the phase that adds the least. Spaced
retrieval only works when the second attempt is a genuinely different retrieval.

The already-correct counter-example, and the model to follow, is
`py-l3-sqlite-parameterized`: its Apply is a single `build_lookup` helper, and its Practice is a
security-review scenario with three distinct functions across a data-access module.

## What a Practice exercise must be

### 0. The closure rule, which outranks everything below

**Every _fact_ the solution needs must be recoverable from the teach section, the workspace's
read-only files, or the README. Every _decision_ must not be.**

A fact is an API, a syntax, a signature, a semantic ("`future.result()` re-raises the worker's
exception"). If the reference solution uses it, the teach section demonstrates it at least once in
a runnable code fence. A name-drop in prose is not a demonstration.

A decision is which data structure to reach for, where a check belongs, how to keep two collections
aligned. Those stay the learner's to invent, and no starter may pre-write them.

This is the rule that resolves "too hard" without producing "too easy". Scaffolding governs what
the learner is TOLD; difficulty governs what they must FIGURE OUT. Removing a cliff is not removing
the climb. When a Practice needs something the teach section never demonstrated, extend the teach
section or split the lesson. Never answer it by pre-filling the starter.

### 0b. The ramp rule: Apply is the rung, not a warm-up

**Apply must exercise the lesson's actual skill, and must sit within one conceptual step of
Practice.** An Apply in a different topic is not a gentler version of Practice, it is a missing
rung, and every gap it leaves gets paid for at the top of the cliff.

Wrong, and shipped: `py-l4-concurrency` teaches thread pools, then Apply asks for
`[n * 2 for n in numbers]`. It touches no executor, no future, no ordering problem. Practice then
demanded six new ideas at once and read as impossible. The defect was in Apply.

Measured at the time this rule was written: the median Apply reference solution across the
curriculum was 5 lines, against a median Practice of 37.5, a **10x** jump, reaching **47x** in the
worst case. Treat a ratio above roughly 12x as a design smell to justify or fix.

### 1. A different surface, the same schema

Practice must exercise the lesson's skill on a **different task, different data, and a different
function surface** than Apply. Do not reuse the Apply function name, signature, or examples.

"Different problem" means a changed surface, not a changed subject. The point is retrieval: the
learner reconstructs the schema because it no longer looks familiar. A Practice that invents a new
domain with its own harness, error classes and contract is not retrieval practice, it is an
untaught second lesson wearing the first one's name.

Wrong: Apply implements `average(nums)`, Practice implements `average(values)` in a package.
Wrong: Apply doubles a list, Practice orchestrates a retry scheduler against a fake executor.
Right: Apply implements `average(nums)`, Practice builds a typed `summarize(rows)` that returns a
dataclass and has to decide what `Optional` means for a column that is missing rather than empty.

### 2. Situated in a scenario, not a prompt

Open with the situation a working engineer would be handed: a ticket, a review comment, a
regression, a migration. The deliverable sentence still leads (see the house style rule in
`docs/`), but it names a job rather than a function-shaped exercise.

### 3. Genuinely harder, in depth rather than volume

Practice must add **at least one and at most two** of these. This is a ceiling as well as a floor:
taking four of them at once is how a Practice becomes a cliff.

- an edge case Apply never had to consider (empty, missing, duplicate, unordered, boundary)
- a second concept the lesson taught but Apply left unused
- a constraint on _how_ the answer is reached ("adding a case must not edit this function")
- a real failure mode the teach section named
- an interaction between two files the learner writes

Do not make it harder by adding volume of identical work (ten more branches of the same shape).

**One new skill per Practice.** Practice may combine concepts the lesson taught. It may not require
a skill the lesson never named. A retry policy inside a concurrency practice is a second lesson: if
you want it, teach it, or drop it.

**Hidden tests probe edges, they never spring traps.** A hidden test may cover an edge the visible
suite omits. It may not punish a design constraint the README never stated. If a hidden test grades
duplicate inputs, the README says duplicates occur. The test for this: could a learner make a
reasonable design choice, pass every visible test, and fail a hidden one on a rule nobody told them?
If yes, state the rule.

**Budget the time and state it.** Practice carries its own `estimatedMinutes`, and the lesson total
must equal teach plus apply plus practice. Derive it by counting lines to read and lines to write,
and record the count in a source comment so the next author can check it rather than re-guess.
`level5/unsafe-sink.ts` is the model. A wrong estimate is not a cosmetic problem: it is how a
75-minute exercise shipped advertised as 28, and an estimate the learner blows past by 3x reads to
them as their own failure.

**Prefer the tool a real engineer would reach for.** When the sandbox forces a fake harness, that
harness may impose at most **one** artificial constraint. Four at once means the learner is
practicing your harness, not the skill. Never grade a shape you would reject in code review: a
function that returns a value on one branch and raises on another is a bad signature, and requiring
it teaches a bad habit in the name of filling a second file.

### 4. Multi-file editing, where the skill supports it

Practice must have **two or more editable files** whenever the skill has a natural seam. Typical
seams: the implementation and its registry; the model and its validator; the worker and its
runner; the module and the test that pins it. Both editable files must carry real work, so a
learner cannot pass while leaving one untouched.

The seam must already exist in the problem. A second editable file is permitted only when it holds
work that is testable on its own, without the first file. If you find yourself inventing a contract
so the second file has something to do, the skill has one seam: keep one file. This requirement is
a permission, not a quota.

Where a skill genuinely has one seam (a single descriptor, a single decorator factory), keep one
editable file and buy the depth from criteria 3 instead. Do not invent a second file to hit a
number.

### 5. Tests that teach

- At least **6** recorded tests, split across a visible and a hidden suite.
- The visible suite reads as a specification: a learner should be able to infer the contract from
  it without guessing.
- The hidden suite covers the edges the visible one deliberately omits, so passing requires
  reasoning rather than pattern-matching against the visible cases.
- Every assertion carries a message that names the expected and actual value. A bare
  `assert f(x) == y` is not acceptable; use
  `assert f(x) == y, f"expected {y}, got {f(x)!r}"`.

### 6. A starter that fails and does not leak

- The starter is a real scaffold: imports wired, signatures present, docstring pointing at
  `README.md`, and a `# TODO:` naming what to do without naming how.
- The starter must NOT pass its own tests (the workspace verifier enforces this).
- The hint ladder goes from a nudge, to the shape of the approach, to the specific call. Never
  paste the answer into hint 3.

## The brief is a ticket, and tickets are centrally numbered

Every workspace ships a `README.md` written as a work item, because "here is a ticket, go fix it" is
the situation the exercise simulates. Ticket identity is **not** the author's to invent.

Build the brief with `buildBrief` from `lib/tutorials/curriculum/brief`:

```ts
import { buildBrief } from "../brief"

const README = buildBrief({
  lesson: "py-l4-concurrency",
  // slot defaults to "practice"; pass "apply" for an apply-phase workspace
  kind: "bug-report", // ticket | bug-report | change-log | postmortem | capstone
  headline: "the asset sweep reports the wrong sizes",
  body: `...hand-written markdown...`,
})
```

- The `CS-###` number is resolved from the registry in
  `lib/tutorials/curriculum/brief/ticket-registry.ts`. You never pass one, and an unregistered
  lesson throws at import rather than shipping a made-up number.
- To add a brief, append one entry to `TICKETS` with `nextTicketId()`. Numbers are append-only:
  never reuse, never renumber, never reorder. A shipped ticket number is content a learner has seen.
- The number encodes nothing about course, level or module, deliberately, so content can move
  without renumbering. The same registry serves every course and every future language.
- Do not write the `#` heading or a "some tests are hidden" line into the body. `buildBrief` emits
  both, so their wording stays identical across the corpus. Pass `hiddenTests: false` if the
  exercise genuinely has no hidden suite.

`lib/tutorials/__tests__/brief-tickets.test.ts` enforces all of this: ids unique and well formed,
the list strictly increasing, registry and corpus a bijection, and every brief opening with the
heading its own registered ticket produces. A new lesson that skips the registry fails the suite.

## Mechanical contract

Verified by `lib/tutorials/__tests__/python-workspace-references.test.ts`, which runs every
workspace tree under `python3`. Read it before authoring; it is the authority.

- Every Python package dir needs an `__init__.py`.
- `referenceFiles` is **required**, must cover every editable file, and must pass every test.
- Hidden test files need `hidden: true` AND a suite label containing the word `"hidden"` — the
  runner derives `isHidden` from `"hidden" in suite.lower()`.
- The runner comes from `lib/tutorials/curriculum/workspace-runner.ts`. Do not hand-roll one.
  It takes a suite list: `buildRunner([{ module: "test_x", label: "visible x" }, ...])`.
- `primaryFilePath`, `editableFilePaths`, `visibleTestPaths`, `hiddenTestPaths`, and
  `testRunnerPath` must all resolve to entries in `files[]`.
- Workspace tests run real Python `assert`s, so floats compare exactly. Keep graded values integer
  or explicitly rounded.
- The sandbox has **no OS threads and no network**. Anything concurrent or remote must be faked in
  a read-only module the learner imports.

## House style

These are the existing content rules, restated because every rewritten prompt is subject to them:

- No em dashes in learner-facing prose.
- Prompts lead with the deliverable: "Implement...", "Repair...", "Write a function that returns...".
- The problem statement states the problem. The approach lives in the hints, never in the prompt
  and never in the starter's comments.
- Second person, plain language, no hype, no "simply" or "just".

## Out of scope

Levels 1 and 2 are single-file by design and are not changed. Level 5 already sets the standard
this spec is generalizing from and is not changed.

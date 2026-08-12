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

### 1. A different problem in the same skill

Practice must exercise the lesson's skill on a **different task, different data, and a different
function surface** than Apply. Do not reuse the Apply function name, signature, or examples.

Wrong: Apply implements `average(nums)`, Practice implements `average(values)` in a package.
Right: Apply implements `average(nums)`, Practice builds a typed `summarize(rows)` that returns a
dataclass and has to decide what `Optional` means for a column that is missing rather than empty.

### 2. Situated in a scenario, not a prompt

Open with the situation a working engineer would be handed: a ticket, a review comment, a
regression, a migration. The deliverable sentence still leads (see the house style rule in
`docs/`), but it names a job rather than a function-shaped exercise.

### 3. Genuinely harder, in depth rather than volume

Practice must add at least **two** of these:

- an edge case Apply never had to consider (empty, missing, duplicate, unordered, boundary)
- a second concept the lesson taught but Apply left unused
- a constraint on _how_ the answer is reached ("adding a case must not edit this function")
- a real failure mode the teach section named
- an interaction between two files the learner writes

Do not make it harder by adding volume of identical work (ten more branches of the same shape).

### 4. Multi-file editing, where the skill supports it

Practice must have **two or more editable files** whenever the skill has a natural seam. Typical
seams: the implementation and its registry; the model and its validator; the worker and its
runner; the module and the test that pins it. Both editable files must carry real work, so a
learner cannot pass while leaving one untouched.

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

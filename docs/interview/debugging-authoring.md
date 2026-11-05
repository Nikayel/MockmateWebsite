# Adding a debugging question

The catalog, workspace, AI context, and feedback scorer share a scenario ID. Add
content through these existing contracts; do not add per-question branches to UI,
chat handlers, or scoring formulas.

## Identity and modules

Author every debugging scenario with `defineBugfixScenario` from
`lib/scenarios/define-bugfix-scenario.ts`. Omit `companyAlignment` for Generic
practice. For reviewed company preparation, select a typed profile from
`lib/scenarios/company-alignment.ts`, such as `google-code-comprehension` or
`stripe-library-debugging`. The helper derives `companies`; independent company
arrays are rejected by TypeScript. `BugFixScenario` requires the normalized
alignment on published entries, so adding a raw object cannot silently bypass it.

A profile records the company, round, source, and whether coverage matches a
format or a publicly reported task pattern. Company names, domains, and pack IDs
are not evidence. Review the task, editable files, executable regressions, and
follow-ups against the source before assigning a profile. Use Generic if that
review does not establish a match. An original task must not claim to be an exact
or official company question.

For stdout-oracle packs, use optional `company_alignment` in
`packs/<id>/manifest.json` and run `node scripts/compile-packs.mjs`. The generated
`companyAlignment` is typechecked against the same profiles and `packToScenario`
uses the same default/helper. The older pack `company.tag` is a round-family
authoring field, not the source of company filters. Do not restore a separate
`companies` list or infer attribution from a filename.

New company-aligned examples:

- `bugfix-maze-navigation`: separate model, solver, renderer, public/hidden tests,
  and sealed references; follows a reported Meta task pattern with our own rules.
- `bugfix-http-client-library`: unfamiliar client-library diagnosis with injected
  transport fixtures; matches the Stripe debugging format, without claiming its
  exact repository, network setup, or live interview prompt.

The browser exposes the reviewed alignment and source. Generic questions stay
explicitly generic. Add provenance here, not through company-specific UI or
interviewer branches.

Use a new ID when changing the assessed problem or its grading contract. Resumed
sessions resolve sealed answers by ID; the workspace evidence hash does not pin a
historical rubric. Copy edits that preserve the assessment can keep the ID.

For an assert-based workspace, follow the exception-handling question:

```text
lib/scenarios/real-world/bugfix/bugfix-<name>.ts       metadata and workspace manifest
lib/scenarios/real-world/bugfix/<name>/source.ts      starter and read-only source
lib/scenarios/real-world/bugfix/<name>/tests.ts       visible and hidden test content
lib/scenarios/sealed/legacy/bugfix-<name>.server.ts   reference, root cause, rubric
```

Split substantial content by responsibility. A small question does not need an
empty folder or one-file-per-function structure. Large content-only modules are
acceptable. Keep the reference solution and grading explanation server-side.

### Multiple languages and public concepts

For executable variants of the same incident, reuse one incident/manifest factory
under the question's folder (see `rate-limiter-error-handling/scenario.ts`). Keep
source and tests idiomatic per language; do not translate JavaScript text into
Python with replacements at runtime. Python cannot raise arbitrary JavaScript
values; test original exception identity and process-control exceptions instead.

Give each language a stable scenario ID and the same `variantGroup`. Both IDs need
public registration, sealed registration, and prerequisite review. The catalog
groups variants **after filtering** and presents a language selector before Start.
One round counts once; completing either language completes that catalog round,
while the selected language's Solved badge and session history remain per ID.
An active attempt keeps its language fixed so files, evidence, saved sessions,
reference solutions, and grading remain aligned. Trying the other language starts
a separate attempt; it does not translate or overwrite existing work.

`lib/scenarios/__tests__/variants.test.ts` checks group compatibility and filtered
discovery. Execution and AI-context gates still visit **every variant**, not just
the first member displayed by the catalog. No database shape change is needed:
the existing scenario ID and language already identify the concrete attempt.

Add optional `conceptIds` to reuse short explanations from
`lib/scenarios/concept-notes.ts`. The problem panel shows a brief note and an
explicit dialog action; `withWorkspaceTaskDocument` adds the same public teaching
content near the top of task.md, which both AI roles already receive. Concepts
must explain foundations without prescribing a patch or importing sealed content.
Reading them is preparation, not a scored hint or an AI request. New nuanced
topics can add a concept entry without changing the workspace component.

The dialog reuses the existing Radix primitive for focus containment, Escape, and
focus return, following the [WAI dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
Python exception behavior follows the [Python tutorial](https://docs.python.org/3/tutorial/errors.html).

## Registration

1. Register the public module in `lib/scenarios/real-world/bugfix/index.ts`.
   The shared catalog composition feeds both eager and lazy discovery.
2. Register the sealed module in `lib/scenarios/sealed/legacy-registry.server.ts`.
   Its ID must match the public question; every assert-based debugging question
   must have exactly one sealed entry. Do not expose reference files on the public
   scenario.
3. Assign 2–6 high-level foundations in `lib/scenarios/prerequisites.ts`. Reuse its
   topic definitions; do not infer topics from tags or include the repair.
4. Review the legacy ID/order compatibility assertion when adding a question.
   Execution and AI-context coverage follow the catalogs automatically.

Python stdout-oracle packs use their existing authored pack/compiler workflow,
not the assert runner below. Their generated modules should not be hand-edited.

## Workspace and tests

- Declare unique relative POSIX paths. Each editable, visible-test, and hidden-test
  list must be disjoint and match file roles/visibility. Reference solutions may
  replace only editable files.
- Provide public documentation, a failing starter, a passing reference, and both
  visible and hidden cases. The generated `task.md` contains the full assignment.
- JavaScript assert workspaces can reuse `createJavaScriptTestRunner` from
  `lib/scenarios/workspace-test-runner.ts`. Name visible suites with the `visible`
  prefix and hidden suites with `hidden`. Export `runTests(record)` from each suite
  and await asynchronous `record` calls. The runner reports load failures, thrown
  non-Error values, and empty suites as failures using the shared result protocol.
- Test observable requirements. Do not require a particular internal Map shape,
  variable name, or patch spelling. Add targeted guards for likely partial fixes.
- Keep hidden tests and runners out of public session context. Both AI roles get
  the public task and original/current files through the same session-context
  pipeline. Never give the interviewer or partner a sealed answer to make it aware
  of the task.
- Put scenario-specific root-cause criteria and optional post-session trade-off
  guidance in the sealed module. Passing tests alone is not evidence that the
  candidate explained their reasoning.

## Validation

```sh
pnpm validate:debugging
pnpm audit:bugfix
pnpm typecheck
pnpm exec playwright test --config playwright.interview-review.config.ts e2e/interview-review/exception-handling.spec.ts
```

The free validation command checks catalog/answer registration, task documents,
prerequisites, workspace roles, starter/reference execution, browser assertion
compatibility, answer sealing, and public context for both AI roles. These tests
also run under the existing `pnpm test` CI job. Native Python references require
Python 3. The authored-reference runner has a subprocess timeout and rejects empty
or mismatched test inventories. The audit command validates the assert-based bank
after hydrating its sealed answers.

Actual model behavior needs a separate, explicitly paid check:

```sh
pnpm validate:debugging:ai bugfix-rate-limiter-error-handling /tmp/scenario-ai-review.json
```

This uses the real prompt builder, configured provider chain, response validation,
and usage tracking. Credentials load from `.env.local`. It makes one logical turn
per AI role; ordinary production retries/observers can make additional calls.
The report records replies, provider, measured tokens, and prompt hashes. Read the
replies for accuracy, premature solutions, pacing, and instructions for controls
that the app actually provides. An HTTP success is not a quality verdict.

An optional final `interviewer` or `partner` argument reruns only that role after
a targeted prompt change.

This CLI does not validate HTTP authentication, session persistence, or a complete
feedback-generation request. Those retain their route/unit contracts; an
authenticated staging journey is needed to claim they were checked live.

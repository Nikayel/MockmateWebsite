# CLAUDE.md

This file gives AI coding agents and human contributors the working rules for this repository. Follow the constitution in `constitution/` and the engineering standards below.

## Project Context

CodeSparring is an AI-powered coding interview practice platform built in the `MockmateWebsite` repository. The product combines AI interviewer chat, an in-browser code editor, executable tests, feedback, spaced repetition, roadmaps, billing, and admin tooling.

## Working Rules

- Read nearby code before editing.
- Match existing project patterns before introducing new abstractions.
- Keep changes scoped to the user request.
- Do not revert unrelated user changes.
- Prefer clear, boring, maintainable code over clever code.
- Run focused checks after meaningful changes.
- Crons are scheduled externally on cron-job.org, never in `vercel.json`. CEO said do not
  touch this: a `crons` block on the Vercel Hobby plan rejects every production deploy.
  See `app/api/cron/README.md`.

## Engineering Principles

### Maintainability

- Keep files focused and cohesive.
- Split files when they become hard to scan or mix unrelated responsibilities.
- Move reusable business logic into `lib/` services.
- Keep `app/api/*/route.ts` handlers thin: parse, auth, validate, call service, return response.
- Keep UI components readable and split complex behavior into hooks or smaller components.

### DRY

- Do not duplicate business rules, auth checks, validation schemas, scoring formulas, entitlement logic, or Firestore document-shape assumptions.
- Do not create an abstraction just because two lines look similar.
- Extract shared helpers when the shared concept has a stable name and reduces real maintenance risk.

### File Size

- Treat large logic-heavy files as a warning sign.
- Split by responsibility: component, hook, service, schema, type, test, fixture.
- Large structured scenario/data files are acceptable when they are mostly content.
- Avoid files that combine UI, API calls, scoring, validation, and persistence in one place.

### Naming

- Use names that explain purpose.
- Components: `PascalCase`.
- Hooks: `useThing`.
- Types/interfaces: `PascalCase`.
- Functions/variables: `camelCase`.
- True constants: `UPPER_SNAKE_CASE`.
- Avoid vague names like `utils`, `helper`, `manager`, `data`, `item`, and `thing` unless the scope is tiny and obvious.
- Follow the existing file-name convention in each folder.

### TypeScript

- Avoid `any`.
- Use `unknown` for untrusted inputs, then narrow or validate.
- Define explicit types at API, service, and data boundaries.
- Use Zod or local validators for runtime input.
- Prefer discriminated unions for status/state variants.

### React

- Use existing `components/ui/` primitives first.
- Keep server/client component boundaries intentional.
- Handle loading, empty, error, disabled, and unauthorized states.
- Keep derived state simple; avoid syncing state that can be computed.
- Preserve accessibility with semantic markup, labels, keyboard support, and focus states.

### API, Auth, and Data

- Authenticate and authorize protected routes before doing work.
- Validate request bodies, query params, and webhooks.
- Keep server secrets out of client code.
- Treat Firestore document shapes as contracts.
- Keep admin actions role-gated and auditable.
- Return useful errors without leaking sensitive internals.

### AI, Cost, and Reliability

- Avoid duplicate AI calls and repeated vector searches.
- Cache only with clear invalidation rules.
- Use feature flags for risky or expensive behavior changes.
- Make third-party failures graceful and user-readable.
- Track expensive paths: LLM calls, embeddings, vector search, code execution, email, and billing webhooks.

### Testing

- Add or update tests for business logic, scoring, scheduling, validation, and auth-sensitive behavior.
- Add regression tests for fixed bugs.
- Prefer focused tests over broad brittle tests.
- Run the smallest useful verification first, then broader checks when risk justifies it.

### Agentic Engineering

Rules for running fleets of coding agents on this repo. Each one is here because skipping it
already cost us a rewrite.

**Build the verifier before the sweep.** A parallel content or refactor sweep is only as safe as the
check that catches a bad edit. Write and land that check first, on the code as it stands, and
confirm it fails when the defect is present. `lib/tutorials/__tests__/python-workspace-references.test.ts`
is the reference example: it materializes every workspace and runs it, so 23 concurrent rewrites
became reviewable instead of hopeful.

**Separate diagnosis from repair.** Scan with read-only agents, collect findings, decide scope, then
launch fix agents against a written list. An agent that finds and fixes in one pass will fix what it
found first and never see the pattern. A negative result from a scan is a result: record it and stop,
rather than manufacturing work to justify the run.

**Partition by file, not by topic.** Concurrent agents sharing a file will clobber each other, and a
shared barrel or index is the usual casualty. Give each agent a disjoint set of paths and say so in
the prompt.

**Concurrent agents must commit an explicit pathspec.** Staging explicitly is necessary and NOT
sufficient, which took five waves to learn. `git add -A` is the obvious hazard, but the one that
actually kept biting is subtler: **the index is shared, and a bare `git commit` commits all of it.**
An agent that runs `git add its-own-file.ts` and then `git commit -m ...` still ships whatever a
sibling staged in the gap between those two commands, having done nothing wrong by the old rule. That
is how, on 2026-08-14, an L0 commit came to carry L1's and L2's work, and how one agent's own repair
ended up inside another's commit while its own `git commit` reported "no changes added".

So commit the pathspec, which bypasses the shared index entirely:

    git -c commit.gpgsign=false commit -m "..." -- lib/tutorials/system-design/curriculum/level7.ts

and declare the scope so the pre-commit guard can refuse a stray path:

    CS_COMMIT_SCOPE="lib/tutorials/system-design/curriculum/level7.ts" git -c commit.gpgsign=false commit ...

`scripts/check-commit-scope.mjs` is that guard. It is inert unless `CS_COMMIT_SCOPE` is set, so human
commits are unaffected, and it runs BEFORE `lint-staged` because `lint-staged` wraps the commit in
`git stash`, which is itself hostile to concurrency and can restore a sibling's staging into the
wrong commit.

When it fires, `git restore --staged <path>` the strays. Never `git checkout` them: that destroys a
sibling's uncommitted work, which is unrecoverable. Content has survived every one of these
incidents; what does not survive is `git log` telling the truth about which change is where, and that
is what you need on the day something has to be bisected or reverted.

Commit with `git -c commit.gpgsign=false` on this volume.

**Verify agent reports yourself.** Agents report success they did not achieve. Before relaying a
result, check `git log` for the commits, run the suite, and read a sample of the diff. Silent commit
failures and confidently wrong summaries are both routine.

**Enforce conventions with a test, not a document.** A rule in prose is a rule that drifts. If a
convention matters, make the build fail when it is broken. `lib/tutorials/curriculum/brief/ticket-registry.ts`
plus its test is the shape to copy: a central allocator, an append-only list, and a bijection test
against the live corpus so a new call site cannot quietly opt out.

**Point adversarial verifiers at the finished work.** Automation checks what it was told to check.
A verifier agent asked to attack the result finds unfair hidden tests, hint text that leaks the
answer, and factually false claims in prose, none of which any assertion was watching for.

**Check a rule's purpose, not just its letter.** Rules drift into their own opposite. The curriculum's
spoiler rule ("hints carry the approach") quietly grew to let hints own definitions, which put
required vocabulary behind an opt-in disclosure. When you enforce a rule at scale, re-derive what it
was for.

### Learn Curriculum

- Teach prose owns every term the graded work requires. A hint may restate a definition, never be
  its only home: hints are opt-in, so a definition that lives only there is unreachable for the
  learner who needs it most. The spoiler rule still holds (statements state the problem, hints carry
  the approach) and this is its corollary, not an exception.
- Introduce vocabulary before the check that leans on it. A predict-then-reveal check is good design
  and should keep its position; move the definition up to meet it rather than moving the check down.
- A multi-file exercise ships a `README.md` written as a work ticket. Build it with `buildBrief`
  from `lib/tutorials/curriculum/brief` and register the lesson in that module's `TICKETS` list.
  Ticket numbers (`CS-###`) are centrally allocated and append-only: never invent one at the call
  site, never reuse or renumber a shipped one. This is course-agnostic and applies to any new
  language track. See `docs/PYTHON-PRACTICE-DEPTH-SPEC.md`.
- The Practice phase must be a different problem in the same skill as Apply, not the same exercise
  moved into a package. Depth means transfer and retrieval, not new machinery. Same spec doc carries
  the rules.
- The closure rule governs difficulty: every FACT the solution needs (an API, a signature, a
  semantic) must be recoverable from the teach section, the read-only files, or the README, and the
  teach section must have demonstrated it in a runnable code fence rather than named it in prose.
  Every DECISION (which structure to reach for, where a check belongs) stays the learner's, and no
  starter may pre-write one. Scaffolding is what the learner is told; difficulty is what they must
  figure out. Answer "this is too hard" by teaching the missing fact, never by filling in the
  starter.
- Apply is the rung between Teach and Practice, so it must exercise the lesson's actual skill and
  sit within one conceptual step of Practice. An Apply in a different topic is a missing rung, and
  the gap gets paid at the top of the cliff. A Practice more than roughly 12x the size of its Apply
  needs justifying.
- Workspace test runners come from `lib/tutorials/curriculum/workspace-runner.ts`. Do not hand-roll
  one per lesson.

## Standard Commands

- Development server: `pnpm dev`
- Lint: `pnpm lint`
- Fix lint: `pnpm lint:fix`
- Type check: `pnpm typecheck`
- Test: `pnpm test`
- Build: `pnpm build`

## Pre-Merge Checklist

- The code supports a real user journey.
- Files and functions remain cohesive.
- Duplicate business logic is avoided.
- Names are specific and consistent.
- Inputs are validated at trust boundaries.
- Protected actions are authorized.
- User-visible states are handled.
- Tests match the risk of the change.
- Expensive third-party calls are controlled.
- Docs are updated when platform behavior changes.

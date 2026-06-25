# BugFix Realism Loop

**Goal:** make every BugFix scenario feel like a real on-call shift in someone else's
codebase — discovered, not quizzed — and make that realism *enforceable*, not vibes.

**You are editing the repo, not running a session.** The live interviewer already refuses to
reveal the bug and nudges like a coworker (`lib/prompts/principles.ts` `CORE_PRINCIPLES`,
`lib/interview/chat/context-builders.ts` `buildBugFixContext`). Your job is to harden the
*scenarios*, the *realism validator*, and that runtime context — not to re-implement them.

Read `docs/loops/README.md` (shared contract) first.

## What "feels real" means (research-grounded rubric)

A scenario is realistic when a skeptical senior engineer would believe a real team wrote it.
Grounded in how real debugging works — observe → reproduce → isolate → modify → verify, under
realistic friction, in someone else's sandbox (not a toy):

1. **Discovery, never disclosure.** Nothing visible to the candidate names or locates the bug.
   This is already machine-checked by `CANDIDATE_LEAK_PATTERNS` in
   `lib/scenarios/bugfix-quality.ts` — your edits must keep `pnpm audit:bugfix` green.
2. **Multi-file root cause.** Understanding the bug requires reading more than one file
   (caller + callee, config + consumer). A one-file glance-and-fix is a quiz, not a shift.
3. **Believable codebase texture.** Inconsistent-but-plausible naming, a stale comment, one
   slightly-too-long file, helper/util seams — the residue of a real team. Not random noise.
4. **Honest, under-helpful errors.** The failing test / stack trace / log states the symptom,
   not the diagnosis. No error message that effectively says "you forgot to X."
5. **Incident framing, not a movie trailer.** `userReport`/`observedSymptoms` read like a
   Slack ping or incident ticket ("payments team says reconciliation is off for ~0.5% of
   orders since Tuesday"), not "You've been paged at 2am!!!" theatrics.
6. **A real fix is minimal and verifiable.** `expectedTouchedFiles` is tight; visible tests
   let the candidate reproduce; `rootCauseRubric` captures what a correct explanation must say.

## One iteration

1. **Pick ONE target** (rotate; record last target in `docs/loops/loop-log.md`):
   - a scenario file under `lib/scenarios/real-world/bugfix/`, OR
   - the realism validator `lib/scenarios/bugfix-quality.ts`, OR
   - the runtime context `lib/interview/chat/context-builders.ts` (`buildBugFixContext`).

2. **Establish ground truth.** Read the target and the systems it plugs into
   (`lib/scenarios/types.ts` for shape, `lib/bugfix/scoring.ts` for which fields scoring
   reads). Run `pnpm audit:bugfix` to see current pass/fail state before touching anything.

3. **Audit against the rubric above.** Identify the single weakest dimension for this target.
   Quote the offending lines. If everything passes, pick the next target and say so in the log.

4. **Strengthen exactly that dimension.** Examples:
   - Scenario too one-file → split the root cause across a caller/config file (without leaking).
   - Error too helpful → rewrite the failing-test output to show symptom, not diagnosis.
   - Intro is theatrical → rewrite `userReport` as an incident ticket.
   - Texture too clean → add a plausible stale comment / naming seam (never a `BUG:` marker).
   - **Prefer the enforceable path:** when a realism rule is currently only prose, add a check
     to `bugfix-quality.ts` so it becomes a hard audit failure for *every* scenario, then fix
     whatever that new check flags. Turning vibes into tests is the highest-value move here.

5. **Never leak.** Before finishing, re-confirm nothing candidate-visible names the bug, its
   location, the operator to change, or the patch. This is the strategic guardrail — a leaked
   answer destroys the product. `pnpm audit:bugfix` enforces it; do not weaken those patterns.

6. **Gates:** `pnpm audit:bugfix` (MUST pass), `pnpm typecheck`, then the focused test
   (`pnpm test lib/bugfix` / `lib/scenarios` as relevant), then `pnpm lint`.

7. **Commit** (e.g. `bugfix: split reconciliation root cause across caller for realism`),
   append to `loop-log.md`, set `needs_human_review: true` if you changed scoring-visible
   fields or the rubric (those affect grading and deserve a human look).

## Hard NEVERs

- Never add a `BUG:`/`FIXME:`/"the bug is"/patch-instruction string to candidate-visible content.
- Never weaken or delete a `CANDIDATE_LEAK_PATTERN` to make an audit pass.
- Never invent a new scoring field or feedback JSON — scoring lives in `lib/bugfix/scoring.ts`.
- Never "fix" a scenario by making the bug obvious. Realism > solvability-on-first-glance.

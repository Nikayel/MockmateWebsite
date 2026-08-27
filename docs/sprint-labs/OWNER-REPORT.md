# Sprint Labs — owner report

What shipped on the `sprint-labs` branch, the decisions behind it, what is
deliberately deferred, and what you must run before flipping the flag on.

## TL;DR

- A new product surface, **Sprint Labs**, is built and merges behind
  `SPRINT_LABS_ENABLED` (default **OFF** — `lib/feature-flags.ts`). With the flag
  off, nothing about production changes: `/labs` shows only Case Labs as before,
  every `/sprint-labs/**` route and `/api/sprint-labs/**` endpoint is gated.
- `/labs` becomes a **chooser**: the existing Case Labs, plus the new workbook
  experience (a multi-stage build: standup -> board -> ticket -> workspace ->
  submit through four test gates -> review -> retro -> summary).
- The flagship workbook, **Meridian** (a fictional claims-processing company),
  has 10 sprints / 50 tickets. **Sprints 1-4 are fully playable end to end**;
  sprints 5-10 are viewable content stubs (marked "content coming soon").
- The in-workspace partner ships as **chat-only, Sable as the interviewer**
  (your override of the full-agent design), built tool-ready for a promptable
  editing agent later.
- Grading keeps the answer-key invariant **without a server sandbox** (see
  "Grading architecture"): the server issues inputs, the client runs the
  learner's code, the server compares against expected outputs it never ships.
- The AI agent, the coder, and the interviewer all tell the learner that
  **server-side isolated grading is planned for next month**, and the same
  message shows when a learner picks a language/workbook that needs it.

## How to turn it on

Set `SPRINT_LABS_ENABLED` to `true` (per the feature-flag mechanism in
`lib/feature-flags.ts` / `getFlagAsync`). Access rules, already enforced:
**Sprint 1 of Meridian is free** for signed-in users; **sprints 2-10 require
Pro**. Submissions are always authed.

## Owner decisions honored (asked and answered 2026-08-26)

1. **Ship behind a flag** when the acceptance bar is green; you flip it after a
   look. Done.
2. **Sprint 1 free, sprints 2-10 Pro.** Enforced in the route/entitlement guards.
3. **No server-side sandbox yet** — kept on the same Python / JS-TS / SQL
   machinery we already run in the browser; the "sandbox next month" message is
   wired into the agent, coder, and interviewer, and shows on a workbook that
   would need it. Learning objectives are now first-class UX across catalog ->
   standup -> ticket -> retro.
4. **Chat-only Sable partner v0** (no edit/bash tools), machinery built
   tool-ready so an editing agent can be enabled later without a schema change.

## Grading architecture under client-only execution

The invariant from the spec ("a fabricated pass is impossible without actually
solving the ticket; the answer key never reaches the client") is kept; the
mechanism is adapted honestly:

- **Visible tier** runs in the learner's browser worker — full output, stacks,
  diffs. No secret material present.
- **Hidden / regression / adversary tiers** for score-feeding tickets are
  **IO-cases**: the server issues inputs at submit time, the client posts raw
  outputs, and the **server compares against expected outputs it never ships**.
- Client-reported pass/fail is **display-only** and never authoritative for any
  score. All secret content (reference solutions, hidden tests, rubrics, review
  keys, author briefs) lives in a server-only sealed bundle that CI leak-scans,
  and the client bundle is scanned to prove none of it ships.

## Deviations from spec (all deliberate, none silent)

| # | Spec said | We shipped | Why |
|---|---|---|---|
| D1 | Hidden tests in a separate grading container | IO-cases with server-held expecteds (+ interim client probes on assisted tickets only) | No server sandbox yet; server-side comparison keeps the invariant's teeth |
| D2 | Secrets in a separate repo with separate ACL | Secret bundle in-repo, server-only, with CI leak-scan + client-bundle scan + git-history scan | Solo-founder ops reality; compensating controls in CI |
| D3 | Agent v0 = full toolset | Chat-only Sable v0, tool-ready machinery | Your override |
| D4 | Fastify / Redis-SQS / Docker / AWS literal | Fastify-shaped seam, simulated queue seams, S5/S6 (Docker/AWS) stubbed | Client-only execution |
| D5 | Seed committed as a real nested git repo | Seed as plain files + manifest; provisioning = git init + copy | Nested git repos do not commit; provisioning needs init+copy anyway |
| D6 | Postgres tables for learner history | Firestore collections mirroring the same shapes | Platform DB is Firestore |

## Run these BEFORE flipping the flag on

The sandbox this was built in lacks production credentials, so a few checks are
yours to run in an environment that has them:

1. **`pnpm build` with real Firebase env.** The full app build needs Firebase
   env vars the build sandbox did not have (a bare `main` build fails
   identically, so this is not a branch defect — but confirm it in a real env).
2. **Vercel `outputFileTracingIncludes` for `workbooks/**`.** Provisioning reads
   the seed tree from `workbooks/meridian/repo/**` at request time; Vercel's file
   tracing must be told to include it or the read 404s in production. This config
   is not yet applied.
3. **Live Playwright E2E.** `e2e/sprint-labs-mer-101.spec.ts` plays MER-101
   through all four gates; it is currently `test.skip`'d because it needs Firebase
   creds + a seeded auth user. Run it green once in a real env.
4. **Contamination gate real run.** `pnpm lab:validate:contamination` (a cold,
   pinned-model check that a graded-assisted ticket is not guessable from its
   public material) needs AI + Firebase env; the machinery is built and unit-
   tested but has not been run against live models.

## Known limitations and deferred work (none block the flagged merge)

- **Server sandbox is next month.** S5 (Docker) and S6 (AWS) remain stubs,
  consistent with the in-product message. True-parallel concurrency assertions
  wait for the sandbox era.
- **Sable Layer A is dormant.** The partner runs on layers B/C/D; the MERIDIAN.md
  invariants (Layer A) are not yet in the compiled public bundle. Small compiler
  add, queued.
- **Adversary runners** are deferred across all sprints (optional per
  WORKBOOK-SPEC §4); the four-gate flow reports an absent adversary honestly
  ("could not run / not counted") rather than silently.
- **MER-305** (a Pro, sprint-3 ticket): its score-feeding IO-case is made
  earnable via an acceptance criterion that names the `interpretClaimInsertError`
  contract; the cleaner long-term fix is a `setup.diff` that scaffolds the
  signature. The ticket is fully solvable as shipped.
- **Validator robustness follow-ups** (surfaced by the adversarial sweep, none a
  current violation): dedicated `lab validate` checks for the two hand-authored
  §5.1 conventions (no Infinity/NaN io-case values, no async probe bodies); the
  regression gate should also replay the seed's own 19-case day-one suite; the
  migration no-gaps check should gain an upper-bound.
- **Two cosmetic validate warnings** remain (`dynamic-no-visible-tests` on
  MER-302 / MER-305): both DO have visible `.pgsuite.yaml` SQL tests; the check
  only recognizes `.test.ts` files, so the warnings are false alarms, not missing
  coverage.

## How this was verified

Per-task adversarial reviews throughout the build (fresh reviewer per task,
fix-loop, scoped re-review). Then an **Opus adversarial content sweep** of the
finished workbook (answer-key boundary and the provisioning-scan suppression both
confirmed clean under hard probing; PR numbers, objective mapping, voice, and
git tree integrity all clean; two minor prose facts fixed). Then a final
merge-safety review of flag gating and scope containment (verdict: **safe to
merge**; flag-off reachability clean — no page, API, link, chooser entry, or
sitemap/JSON-LD exposes Sprint Labs with the flag off). `lab validate` (static +
dynamic) passes on the whole workbook with zero errors; the full repo test suite
is green (8562 passed, 0 failed); typecheck and lint are clean (0 errors).

## Merge status: ready, waiting on your go

The branch is verified and safe to merge behind the flag. I stopped short of
merging because completing it **deploys to production** (a push to `main`
auto-deploys), `main` is checked out in another worktree, and `main` advanced
**9 commits** past our merge-base while this was built, so it is not a clean
fast-forward. That last mile is a prod action you should trigger.

The mechanics, confirmed by the final review:

- **256 commits** to merge; the only files that overlap `main`'s 9 new commits
  are **3 `docs/sprint-labs/*.md`** — **zero code conflicts**.
- A `--no-ff` merge commit (or a rebase) reconciles those docs cleanly.

To complete it (run from the main checkout, not this worktree):

```
git checkout main && git pull
git merge --no-ff sprint-labs      # resolve the 3 docs/sprint-labs/*.md if prompted
git push                            # deploys to prod, flag still OFF
```

Then flip `SPRINT_LABS_ENABLED` on when you want to look, after the
"before flipping the flag on" checklist above. Or tell me to complete the merge
and I will.

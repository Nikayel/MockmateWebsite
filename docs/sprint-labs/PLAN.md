# Sprint Labs — build plan

Numbered tasks for the SDD loop. Spec authority: `WORKBOOK-SPEC.md`,
`SPRINT-PLAN.md`, `AGENT-CONTEXT.md`; decisions/deviations:
`EXECUTION-STATE.md`; repo facts: `INTEGRATION.md`; content rules:
`AUTHORING-RULES.md`; screens: `UX-SPEC.md`.

## Global constraints (bind every task)

- Branch `sprint-labs`. Commit small and atomic, ALWAYS with an explicit
  pathspec: `git -c commit.gpgsign=false commit -m "..." -- <paths>`. After
  every commit: `git cat-file -e <sha> && git merge-base --is-ancestor <sha>
  HEAD` — a printed sha is not proof. No co-author lines.
- Each task stays inside its **Owned paths**. Shared files listed as
  "touch-with-care" get minimal additive edits only.
- TypeScript: no `any`; `unknown` + narrowing at boundaries; Zod at trust
  boundaries. Thin API routes: parse → auth → validate → service → response.
- Every route that costs money or writes user data: `verifyAuth` (+
  `requireTierForUser` for sprints 2+ surfaces; `enforceMeteredAiRequest` for
  LLM). New collections need `firestore.rules` blocks (copy the
  `caseLabRuns` pattern) + a `docs/FIREBASE_STRUCTURE.md` entry.
- No secret-classified content (hidden test bodies/expecteds,
  `reference.diff`, `review.yaml` wrongComment, `author_brief.yaml`) may be
  importable client-side: server-only modules + sealing-test coverage.
- The whole surface renders only when `SPRINT_LABS_ENABLED` is on.
- Tests: vitest via `pnpm test -- --run <paths>`; `pnpm typecheck` and
  `pnpm lint` must stay clean. Verify, then claim — paste real output in the
  report file.
- No em dashes in learner-facing strings. Ticket surfaces never list files
  to touch.

## Task 1: Foundations — types, flag, capability source, service ids

Owned: `lib/sprint-labs/types.ts`, `lib/sprint-labs/platform-capabilities.ts`,
`lib/sprint-labs/__tests__/types.test.ts`. Touch-with-care (additive lines
only): `lib/feature-flags.ts` (add `SPRINT_LABS_ENABLED: false`),
`docs/FIREBASE_STRUCTURE.md` (new collections section). Service ids
register with their call sites in Tasks 8/9/14, never earlier — the
services-registry no-dead-entries test enforces this (ruling R9).

Define (Zod schema + inferred type for anything crossing a trust boundary):
- `WorkbookSummary` (catalog card: id, title, pitch, track, language, level,
  topics[], sprintCount, ticketCount, estimatedHours,
  `requiresServerExecution: boolean`, objectives[]), `SprintPublic` (number,
  title, goal, standupQuote, archMapDelta, objectives[] with id/label/canDo
  sentence, sizingNotes?), `TicketPublic` (key, title, points, labels[],
  aiPolicy: "assisted"|"unassisted"|"review-only", aiPolicyReason?,
  objectives[], bodyMd, acceptanceCriteria[], adversaryPresent,
  payoffFor?), `TicketSecretMeta` (hidden-test METADATA only: id,
  humanName, tags[], kind: "io-case"|"probe" — bodies/expecteds never in
  types shipped client-side).
- Run/persistence shapes: `SprintLabRun` (collection `sprintLabRuns`:
  userId, workbookId, contentVersion, currentSprint, currentTicketKey?,
  board: Record<ticketKey, "todo"|"doing"|"review"|"done">, status
  "in_progress"|"completed"|"abandoned", server-owned timestamps),
  `WorkspaceFileDoc` (subcollection `files`: path, content ≤100_000 chars,
  updatedAt, revision), `TicketAttempt` (subcollection `attempts`:
  ticketKey, aiPolicy, variantId, finalized, gateResults as
  `{gate: "visible"|"hidden"|"regression"|"adversary", cases:
  {testId, humanName, passed}[]}[]`, escapedDefects: humanName[],
  scores {understanding, problemSolving, codeQuality, communication,
  verification, overall}, modelId?, submittedAt), transcript doc shape
  (bounded, `aiPolicy`/`provenance`/`capabilities` optional fields),
  `DirectiveEntry` (event-shaped, tags[], createdSprint, expiresAfterSprint)
  per AGENT-CONTEXT §3 Layer C.
- `platform-capabilities.ts`: client-safe, dependency-free.
  `SERVER_EXECUTION_ETA = "next month"`, `SERVER_EXECUTION_MESSAGE` (one
  canonical sentence for catalog + prompts: server-side isolated grading and
  additional languages land next month), `SUPPORTED_WORKBOOK_LANGUAGES =
  ["typescript", "javascript", "python", "sql"]`,
  `workbookIsRunnable(summary)` helper.
Verification: unit tests exercise schema parse/reject; typecheck+lint clean.

## Task 2: Content compiler with the public/secret split

Owned: `scripts/compile-workbooks.mjs`, `workbooks/_fixture-workbook/**`
(a tiny 1-sprint/2-ticket test workbook), generated outputs under
`lib/sprint-labs/content/` (public) and
`lib/scenarios/sealed/sprint-labs/**` (secret) plus
`lib/sprint-labs/content/registry.ts` (public index) and
`lib/scenarios/sealed/sprint-labs/registry.server.ts`,
`lib/sprint-labs/__tests__/compiler.test.ts`,
`lib/sprint-labs/__tests__/sealing.test.ts`. Touch-with-care:
`package.json` (add `workbooks:compile` script).

Requirements: read `workbooks/<id>/workbook.yaml`, `sprints/*/sprint.yaml`,
`tickets/<KEY>/{ticket.md, setup.diff, tests/visible/**, tests/hidden/**,
adversary/**, review.yaml, author_brief.yaml, reference.diff, rubric.yaml}`
per WORKBOOK-SPEC §6. Frontmatter parsed and validated with Task 1 schemas.
Emit: public bundle modules (workbook + sprints + tickets public fields +
visible test FILES + hidden-test METADATA with humanNames) and sealed
server-only modules per ticket (hidden IO-case expecteds, probe bodies,
reference.diff, review.yaml incl. `correct:false` trap id,
author_brief.yaml, adversary runner, rubric weights), with the
`typeof window` throw header and a dynamic-import registry, exactly the
`compile-packs.mjs` shape. Secret-classification is a field-level allowlist
in ONE table in the compiler; compiler fails loudly if a secret-classified
field appears in a public emit (unit-tested). Sealing test greps the import
graph like `lib/bugfix/packs/__tests__/sealing.test.ts`. Deterministic
output (stable ordering) so regenerated bundles diff cleanly.
Verification: compiler round-trips the fixture workbook; sealing +
leak-scan tests red/green demonstrated; generated code typechecks.

## Task 3: `lab validate` — static gates

Owned: `scripts/lab-validate.mjs`, `lib/sprint-labs/validate/**` (pure rule
functions + types), `lib/sprint-labs/validate/__tests__/**`.
Touch-with-care: `package.json` (`lab:validate` script).

Static rules (each a pure function with fixture-driven tests; see
AUTHORING-RULES [validate] markers): migration filenames unique + gapless
monotonic counter; every `filesTouched` path exists in seed or earlier
sprint's created set; `newSourceFiles` equals the computed set difference
(and `rewrittenFiles` ⊆ seed ∪ prior); every ticket maps to ≥1 objective and
every objective tag is in the controlled vocabulary (bijection style:
unknown tag fails, unused vocabulary entry warns); `ai_policy_reason`
required iff unassisted; `payoffFor` requires `payoffSignoff`; PR numbers
monotonic per AUTHORING-RULES §1; one-name-per-file bans
(`outbox-repository.ts`, `claim-repository.ts`); hidden tests all carry
`humanName`; score-feeding tickets (unassisted + review-only) have ≥1
io-case hidden test; no em dashes in learner-facing prose fields; ticket
bodies/criteria never contain a `files to touch` style enumeration of
workspace paths (heuristic: fail on 3+ src/ paths listed in body);
`setup.diff`/MERIDIAN.md deltas contain no hunk that also appears in a
not-yet-shipped `reference.diff`. Output: one-line PASS or a grouped
failure report with ticket keys. Runs against the authoring tree +
compiled bundles of any workbook dir.
Verification: fixture workbook passes; each rule has a red fixture case.

## Task 4: TS multi-file runner + vitest-shim (browser worker + Node core)

Owned: `public/workers/ts-transpiler-loader.js` (or equivalent asset
strategy), `public/workers/vitest-shim.js`,
`lib/workspace-execution/ts-workspace/**` (runner + types + transpile
cache), `lib/workspace-execution/ts-workspace/__tests__/**`.
Touch-with-care: `public/workers/js-sandbox-worker.js` (extend workspace
mode: transpile `.ts` in-worker via importScripts'd TypeScript build +
content-hash cache; load vitest-shim alongside assert-shim),
`lib/workspace-execution/browser-execution.ts` (route
`language: "typescript"` workspaces), `package.json` (script to copy the
typescript browser build into `public/vendor/`).

vitest-shim: `describe/it/expect` subset (toBe, toEqual, toStrictEqual,
toThrow, toContain, toMatchObject, resolves/rejects, async it) recording
into the existing `__WORKSPACE_TEST_RESULTS__:` marker protocol with suite
labels honoring the `"hidden"`-substring convention. The core
(transpile+link+run semantics) must ALSO be callable from Node (same shim
semantics via a small Node harness entry `lib/workspace-execution/
ts-workspace/node-harness.ts`) because `lab validate`'s red/green gate
(Task 7) replays tickets in CI. Per-file transpile budget measured and
logged. No cross-file typecheck (documented).
Verification: unit tests run a 5-file TS fixture workspace with passing +
failing + hidden suites in Node harness; browser path exercised by a
worker-level test if practical, else manual snippet documented in report.

## Task 5: PGlite worker engine

Owned: `public/workers/pg-sandbox-worker.js`,
`lib/workspace-execution/pg-sandbox/**` (runner, warm-state, types, tests).
Touch-with-care: `package.json` (add `@electric-sql/pglite`, script to copy
wasm assets to `public/wasm/pglite/`), `lib/workspace-execution/
browser-execution.ts` (dispatch hook), `next.config.mjs` only if asset
serving needs it.

Copy the sql.js worker's structure verbatim (self-hosted assets,
importScripts, status/exec-start/result protocol, module-level ready
promise, `prewarmPgRuntime()`); expose modes: `exec` (multi-statement
script), `query`, `reset` (fresh DB per run), and a `runSqlSuite` that
applies migrations[] + seed + learner SQL + assertion queries. Must support
RLS end-to-end (CREATE POLICY, ENABLE/FORCE, `set_config('app.tenant_id',
..., true)`, `current_setting`), transactions, and advisory locks
single-connection. Document single-connection limits (no true parallel
interleaving) in the module header. Node-callable core for CI replay
(PGlite runs in Node natively).
Verification: unit test creates two tenants, enables FORCE RLS, proves
cross-tenant reads return zero rows and `WITH CHECK` rejects a bad insert;
runs in Node via vitest.

## Task 6: Run persistence, workspace store, resume

Owned: `lib/sprint-labs/runs.ts` (server service),
`lib/sprint-labs/runs-client.ts`, `hooks/useSprintLabRunSync.ts` (or
`components/sprint-labs/useSprintLabRunSync.ts`),
`app/api/sprint-labs/runs/route.ts`,
`app/api/sprint-labs/runs/files/route.ts`,
`lib/sprint-labs/__tests__/runs.test.ts`. Touch-with-care:
`firestore.rules` (blocks for `sprintLabRuns` + `files`/`attempts`/
`transcripts` subcollections, copying the caseLabRuns defense-in-depth
pattern), `docs/FIREBASE_STRUCTURE.md`.

Requirements: create/resume run per (userId, workbookId) with explicit
status enum (Case-Lab pattern, not the interview heuristic); board state
updates server-validated (legal transitions only: todo→doing→review→done,
review→doing); per-file workspace store — one doc per file path under
`sprintLabRuns/{runId}/files/`, path encoded safely, content ≤100_000
chars, server-stamped revision + updatedAt; batched save endpoint accepting
N changed files; load endpoint reassembling seed + overlay (files never in
the run doc itself). Client hook generalizes `useCaseLabRunSync` (1s
debounce, snapshot dedupe, unmount + visibilitychange flush, dirty-path
tracking so only changed files post). Sprint gating: creating/advancing
into sprint ≥2 requires `requireTierForUser(userId, "pro")`;
`recordSessionStartAdmin(userId, "sprint-labs:<workbook>:<sprint>")` at
sprint start. Everything behind `SPRINT_LABS_ENABLED`.
Verification: service unit tests (transition matrix, ownership checks,
oversize rejection); typecheck/lint; report includes rules diff.

## Task 7: `lab validate` — dynamic red/green + provisioning scans

Owned: `lib/sprint-labs/validate/dynamic/**`, extension of
`scripts/lab-validate.mjs` (`--dynamic` flag),
`lib/sprint-labs/validate/dynamic/__tests__/**`.

For every authored ticket of a workbook: materialize seed + prior-sprint
reference diffs + this ticket's `setup.diff` into a temp tree; run visible
AND hidden suites via the Task 4 Node harness (and Task 5 PGlite where the
suite declares SQL); assert both tiers FAIL; apply `reference.diff`; assert
both tiers PASS (the sbx red/green gate). Regression gate replay: prior
sprints' visible suites still pass after this ticket's reference lands.
Provisioning scans: a freshly provisioned workspace bundle (what the
client would receive for sprint N) contains zero hidden-test signatures,
zero future-sprint markers (`MER-<later>` keys, unshipped migration
numbers), zero secret-classified fields — the "sprint 1 learner grep" from
AGENT-PROMPT §4 as an automated check. Diff application uses a real
`git apply` in the temp dir.
Verification: fixture workbook goes red/green end to end; a deliberately
broken fixture (reference misses a hidden case) fails loudly; output
format matches Task 3's reporter.

## Task 8: Gate runner, submit routes, scorer, filterDirectives

Owned: `lib/sprint-labs/grading/**` (gate orchestration types, scorer,
`filterDirectives.ts`, variant selection), `app/api/sprint-labs/attempts/
route.ts` (open attempt: validates budget/cooldown, issues variantId +
hidden IO-case INPUTS + probe bodies + regression manifest),
`app/api/sprint-labs/attempts/complete/route.ts` (accepts raw outputs per
gate; loads sealed expecteds via the Task 2 registry; compares
server-side; computes gate results, escaped defects, five-dimension scores;
whitelist-projects to `{testId, humanName, passed}`; finalizes at first
submission; transactional read-then-write), `lib/sprint-labs/__tests__/
grading.test.ts`, `__tests__/filter-directives.test.ts`. Touch-with-care:
`lib/types.ts` (add `sprint_score_breakdown` sibling field),
`lib/types/dsa-patterns.ts` (add `SPRINT_LAB: "sprint-lab"`),
`lib/sprint-labs/mastery.ts` (recordSprintLabMastery →
`completeSessionWithMastery`), `lib/usage/services.ts` (append
`"sprint-labs-grading"` with its call site, per R9). Verify Task 6's
firestore.rules attempts block covers this task's needs (R5: Task 6 owns
all rules; do not edit firestore.rules here).

Scoring per WORKBOOK-SPEC §5: Understanding (files-touched vs reference
manifest, time-to-first-edit), Problem-Solving (visible+hidden pass rates),
Code Quality (diff size vs reference band, regressions caused), 
Communication (present only where the ticket collects prose; else null and
renormalized), Verification (escaped-defect rate, refused-bad-PR on
review-only, learner-authored test presence), overall 0-100. ai_policy
split: only unassisted + review-only attempts feed
`sprint_score_breakdown`/mastery; assisted stores formative-only flag.
Budget: N submissions per ticket + cooldown (constants in types), enforced
server-side. Variants: hidden suite variantId rotates deterministically on
re-attempt post-finalization; escaped-defect names + reference.diff release
ONLY after finalization. `filterDirectives(entries, currentHiddenTopicTags)`
DROPS colliding entries (never paraphrases) — pure, exhaustively tested.
Verification: grading unit tests cover: first submit finalizes, second
submit gets variant + formative label, fabricated probe "pass" cannot
alter io-case verdicts, projection never includes runner output; report
pastes test run.

## Task 9: Contamination gate

Owned: `lib/sprint-labs/validate/contamination.ts`, script flag
`--contamination` in `scripts/lab-validate.mjs`, tests with a stubbed model
seam. Touch-with-care: `lib/usage/services.ts` (append
`"sprint-labs-validate"` with its call site, per R9).

Cold one-shot pinned-model run per ticket: prompt = ticket body + visible
test sources only; model must output which hidden tests it can guess
(structured); score = fraction of hidden tests passed by its proposed
solution when replayed through the Task 7 harness. >60% fails the ticket
for graded-assisted. Uses `generateAIResponse` with
`service: "sprint-labs-validate"`, records exact model id, caches verdicts
by content hash under `workbooks/<id>/.validate-cache/` (committed) so CI
never re-spends; `--force` recomputes. Flag-gated so plain `lab:validate`
stays free.
Verification: stub-seam unit tests; one real run deferred to Task 21
(content exists then).

## Task 10: Screens — /labs chooser, catalog, workbook overview

Owned: `app/labs/page.tsx` edits (chooser section per UX-SPEC: anchor
strip + SprintLabsSection after the Case Labs grid, hero/SEO untouched),
`app/sprint-labs/**` public half (catalog + `[workbookId]` overview per
Pattern B — route root per UX-SPEC, NOT nested under `app/labs/[labId]`),
`components/sprint-labs/catalog/**`, plus the `.workbook-surface` selector
addition to the four `--wb-*` blocks in `app/globals.css` (zero value
changes). Touch-with-care: `components/header.tsx` only if UX-SPEC says so.

Build exactly to UX-SPEC sections 1-2: Case Labs content does not regress
(SEO sections intact); Sprint Labs entries render only when
`SPRINT_LABS_ENABLED` (server-checked; surface invisible when off); Meridian
card playable, sbx card locked with `SERVER_EXECUTION_MESSAGE` from
`platform-capabilities.ts`; objectives rendered per the UX-SPEC compact
pattern; free-vs-Pro badges per owner decision; resume state on the
overview when a run exists.
Verification: `pnpm test -- --run` for any component tests UX-SPEC demands;
typecheck/lint; screenshot or DOM assertions per repo convention.

## Task 11: Screens — standup, board, ticket

Owned: the standup, board, and ticket segments of the auth-gated
`app/sprint-labs/[workbookId]/run/**` branch (force-dynamic + noindex per
UX-SPEC routing), `components/sprint-labs/board/**`,
`components/sprint-labs/ticket/**`.

Standup: goal, inciting quote, arch-map delta, sprint objectives. Board:
four columns from run.board, ticket cards (points, labels, ai_policy badge,
`ai_policy_reason` on unassisted cards), no drag-drop (moves via ticket
actions), progress. Ticket: Jira-voice body via MarkdownRenderer,
acceptance criteria, objectives chips, non-dismissible unassisted banner,
never lists files; Open workspace CTA. All states per UX-SPEC (loading via
SparraLoader, error, unauthorized, Pro wall for sprint ≥2).
Verification: component tests for board transition rendering + policy
badges; typecheck/lint.

## Task 12: Screen — workspace

Owned: the workspace segment of `app/sprint-labs/[workbookId]/run/**`
(force-dynamic, noindex, auth-gated layout per UX-SPEC routing),
`components/sprint-labs/workspace/**`.

BuildStation-derived: file tree + tabs (locked files per role;
`MERIDIAN.md` + generated `MAP.md` readable read-only), CodeMirrorEditor,
run-visible-tests via the Task 4 runner rendering into CodeConsole,
per-turn strip (failing visible tests count, diff-stat vs sprint start),
autosave via Task 6 hook, submit CTA into Task 13's flow, chat panel mount
point (Task 14 fills it; locked-card state on unassisted tickets from day
one), "What the agent knows about you" panel showing literal directive
text with mute toggles (mutes not recorded to the agent).
Verification: component tests for locked-file enforcement + per-turn strip
derivation; typecheck/lint.

## Task 13: Screens — submit/CI, review round, retro, workbook summary

Owned: `components/sprint-labs/submit/**`, `components/sprint-labs/
review/**`, `components/sprint-labs/retro/**`, `components/sprint-labs/
summary/**`, their segments under the `app/sprint-labs/[workbookId]/run/**`
branch per UX-SPEC.

Submit/CI: staged four-gate reveal (Sparra scoring states, determinate,
never completes early), hidden failures as humanNames only, escaped-defect
headline, budget/cooldown states, pre-submit "score finalizes on first
submission" notice. Review round: bot comments from public bundle render;
accept/push-back with reason; correct/trap resolution arrives from the
server AFTER submission (never shipped pre-finalization). Retro: learner
diff vs reference.diff (server-released post-finalization), escaped
defects, senior paragraph, objective mastery deltas, next-ticket CTA.
Summary: escaped-defect curve, per-objective mastery, velocity, shareable
artifact placeholder with model-id + policy-split labeling.
Verification: component tests for staged reveal + humanName-only rendering;
typecheck/lint.

## Task 14: Sable workspace partner (chat-only v0)

Owned: `lib/sprint-labs/partner/**` (context builders A/B/C/D, mode
resolver, prompt), `app/api/sprint-labs/chat/route.ts`,
`components/sprint-labs/workspace/PartnerChat.tsx`,
`lib/sprint-labs/partner/__tests__/**`. Touch-with-care:
`lib/usage/services.ts` (append `"sprint-labs-chat"` with its call site,
per R9); otherwise none (transcript shape landed in Task 1/6).

Fork the Case Lab chat trio per INTEGRATION §4. Layers: A = workbook
invariants (from public bundle, MERIDIAN.md source), B = generated map
(client-computed from workspace tree: exported symbols per file via a light
regex/ts pass, route table, migration list, test inventory, diff-stat;
first line the mandatory "if the tree disagrees..." sentence), C =
per-ticket block from public bundle only + `filterDirectives`-screened
directives, D = per-turn (red visible tests + failing assertion text,
diff-stat, turn index) riding the outgoing message string. Modes by
ai_policy (capability, not conscience): assisted = full chat with
workspace file context; unassisted = NO session issued (locked card, in-
fiction reason; repo-blind tutor variant whose context excludes src/ and
tests/); review-only = author-agent persona from author_brief.yaml (sealed;
server-side injection only, concession_triggers honored), never sees
review.yaml trap id. Sable persona voice; `SERVER_EXECUTION_MESSAGE`
included in system context so the partner answers capability questions
truthfully. Transcript persisted server-side per bounded shape; provenance
`human` on all v0 messages; `capabilities: ["chat"]`. Search/tool
instrumentation schema logged (zeroes in v0) so the future tool-enabled
partner has day-one baselines. `enforceMeteredAiRequest` +
`service: "sprint-labs-chat"`.
Verification: prompt-builder unit tests (mode matrix: unassisted issues
nothing; review-only context contains author_brief stance but never the
trap id; directives colliding with hidden tags dropped); typecheck/lint.

## Task 15: Meridian seed repo + workbook.yaml + MERIDIAN.md

Owned: `workbooks/meridian/workbook.yaml`, `workbooks/meridian/repo/**`
(61 files, ~1,700 lines), `workbooks/meridian/MERIDIAN.md`.

Seed per WORKBOOK-SPEC §3 + AUTHORING-RULES: TS "Fastify-shaped" micro
router seam (`src/http/server.ts` with `inject()` semantics, pure TS,
runs under the Task 4 runner), pg seam over PGlite-compatible SQL,
migrations 0001-0003, 8 test files / 19 cases, and the canonical planted
defects: `strict:false` tsconfig, `no-explicit-any` off with the apology
comment, float money rounded half-up, hand-written `WHERE tenant_id = $1`
with one query missing it, webhook row written `delivered` before the
call, in-process array outbox on setInterval, `/health` returning ok
without touching the DB, `documents.ts` with the per-claim loop + missing
tenant filter, `documents` table without tenant_id and without a claim_id
index, fixtures `claims.json` + `tenants.sql`. MERIDIAN.md Layer A:
trajectory-independent invariants only, no file inventory, ~1k tokens.
workbook.yaml: full catalog metadata + objectives vocabulary (controlled
list all 10 sprints' tags draw from).
Verification: seed runs under the Node harness (its 19 cases execute; the
defect-exposing ones fail exactly as designed — document which), lab
validate static passes on the skeleton.

## Task 16: All 10 sprint.yaml + 50 ticket stubs

Owned: `workbooks/meridian/sprints/**` excluding the four full-content
sprints' test/diff payloads (stubs = ticket.md with real frontmatter +
real Jira body + acceptance criteria + objectives[] + ai_policy(+reason) +
payoffFor/payoffSignoff, per AUTHORING-RULES; sprint.yaml with goal,
standup, objectives, sizingNotes). Partitionable by sprint across
subagents — disjoint directories, one committer each, pathspec discipline.

Source: SPRINT-PLAN.md ticket tables + learning objectives verbatim;
AUTHORING-RULES §1-§4 fixes applied (migration numbers, PR numbers, S2
tier rebalance noted in yaml, S5 hours lengthened, MER-903 split, payoff
criteria into MER-302/803/104/204 bodies). `lab validate` static must pass
over all 50 stubs.
Verification: `pnpm lab:validate workbooks/meridian` output pasted.

## Tasks 17-20: Sprints 1-4 full content (one task per sprint)

Owned per task: `workbooks/meridian/sprints/0N-*/**` complete: setup.diff
per ticket, visible tests (S1:77, S2:~107 after tier move, S3:~61 after
raise, S4:59), hidden tests (S1:30, S2:~52, S3:39, S4:36) with humanNames
and io-case shape for score-feeding tickets, adversary runners (S1:2,
S2:2, S3:3, S4:3), review.yaml (one `correct:false` trap each),
author_brief.yaml for review-only tickets (MER-105/203/303/404),
reference.diff per ticket, rubric.yaml per ticket. Tests must run under
the Task 4/5 harness semantics. Payoff wirings per AUTHORING-RULES §4
(9.1, 9.4 land here; 9.2/9.3 touch S8/S9 stubs only). Partitionable by
sprint; within a sprint, single agent.
Verification per task: `lab validate --dynamic` green for that sprint
(red/green on every ticket, regression replay through prior sprints),
output pasted in the report file.

## Task 21: Whole-workbook validate + contamination + content review

Owned: fix-ups across `workbooks/meridian/**` only. Run full
`lab validate` static + dynamic across all authored content, the
contamination gate over sprints 1-4 (real pinned model, cached), the
provisioning scans, and dispatch an adversarial content reviewer against
finished sprints 1-4 (unfair hidden tests, answer-leaking hints, false
prose claims, spoiler-rule violations). Fix findings; re-run.
Verification: full green output pasted; contamination numbers per ticket
recorded in the report.

## Task 22: E2E, seed command, verification bar, README

Owned: `e2e/sprint-labs-mer-101.spec.ts` (play MER-101 through all four
gates + retro against a dev server with the flag forced on),
`scripts/sprint-labs-dev.mjs` (one command: compile workbooks + validate
static + print the URL; wired as `pnpm sprint-labs:dev`), README section
"Authoring a workbook" (non-engineer voice) in `workbooks/README.md`,
plus the AGENT-PROMPT §4 bar: fresh-workspace git-object scan run, sprint-1
learner grep run, `pnpm typecheck`, `pnpm lint`, focused `pnpm test` suites.
Verification: e2e passing locally, every §4 command's real output pasted.

## Task 23: Final review, deviations report, merge behind flag

Whole-branch adversarial review (most capable model) with the ledger's
parked findings; fix wave; verify `SPRINT_LABS_ENABLED` defaults OFF and
prod is inert without the flag; write the owner-facing final report
(deviations D1-D6, contamination numbers, stubbed-vs-real inventory);
merge `sprint-labs` → `main`, push (auto-deploy; surface stays dark),
flag flip left to the owner.

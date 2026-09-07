# The in-workspace agent — context, indexing, and the spoiler boundary

How the coding agent in the learner's workspace knows where things are, and how
it is stopped from handing over the answers.

Companion to [`WORKBOOK-SPEC.md`](WORKBOOK-SPEC.md) and
[`SPRINT-PLAN.md`](SPRINT-PLAN.md).

> Four design claims were written down and then attacked by four independent
> skeptics, a red team, and a synthesis pass. **All four were refuted in part.**
> What follows is the design after those attacks, with the surviving parts and
> the corrected parts marked. The refuted originals are kept visible on purpose:
> the wrong reason for a right answer costs you the next decision.

---

## 1. Do you need to index? — the short answer

**No similarity search anywhere in v1. Nothing is embedded.** At 3,000–9,000
lines of TypeScript, agent queries about code are identifier-shaped —
`withTenant`, `IdempotencyKey`, `SET LOCAL` — and exact lexical match beats
cosine similarity on a corpus that shares vocabulary with itself. Claude Code
works this way for the same reason.

**But the original justification was wrong, and it has been deleted.**

> ~~"Any index is stale by construction, because the learner mutates the repo
> every few minutes."~~

That is false and measurably so: a full AST symbol index over a 54-file /
10,835-line TypeScript tree builds in **55 ms**, and incrementally in ~5 ms for
the 3–5 files a ticket touches. You could rebuild it on every keystroke. Worse,
the rationale is self-refuting — `MERIDIAN.md`, the design's own primary
navigation layer, is a *hand-written* index over that same mutating tree,
refreshed **ten times in a ten-sprint course**. It is the stalest artifact in
the system, and it fails worse than a stale symbol map would: a stale map sends
the agent to a wrong file and grep recovers; a stale prose map **confidently
asserts a wrong architecture**, and by sprint 8 the agent proposes creating a
file the learner deliberately did not create.

Replace the rationale with the true one: **lexical and symbolic search have
near-perfect recall at this scale; fuzzy retrieval only adds false positives.**

**And "grep is strictly better" is also struck.** Two corrections:

- **Grep silently under-reports in TypeScript.** Structural typing couples a
  function to types it never names; barrel files and `export * from './types'`
  break the textual chain; `import { ClaimIntake as Intake }` defeats the
  pattern. So *"what breaks if I change this shape?"* — the exact question the
  sprint-9-breaks-sprint-4 mechanic is built on — is answerable by tsserver and
  only approximated by grep. Silent under-recall means the agent says "nothing
  else uses this," the learner ships, and the **regression gate fails them for a
  reason they cannot diagnose.** That is a retrieval bug injecting false
  negatives into a graded outcome.
  → **Add `find_references` and `go_to_definition` backed by tsserver**, which
  is already running for the typecheck gate. Highest-value tool in the design.
- **Hit count, not file count, is the failure axis.** Meridian's central nouns
  (`tenant`, `claim`, `idempotency`) appear in every handler, fixture and test.
  At observed density (~1 hit per 38 lines for a primary noun) `grep tenantId`
  crosses 50 hits around **sprint 3–4**, well before "the repo is small" stops
  being true. Past that, each discovery turn costs 2–4 extra sequential model
  round trips.

## 2. What *does* get indexed

"Index" was doing two jobs. Nothing gets embedded; almost everything else gets a
table, a git ref, or a static manifest — **a git ref is an index, a Postgres
table is an index.** Build these, in this order:

| Corpus | Mechanism | Why |
|---|---|---|
| Seed repo | **git tags** `seed`, `sprint-N-start` | Not retrieval — *baseline*. `git diff sprint-N-start..HEAD` scopes the agent to the ticket's blast radius and feeds the retro diff. Do **not** index the seed's content: by sprint 3 it is a high-confidence index over the wrong version. |
| Submitted trees | **server-side git refs** `submit/sN/tM` | You must retain every submitted tree anyway — sprint 9's regression gate runs sprint 4's tests. Free content-addressed dedup: 50 submissions of a 9k-line repo is one repo plus 50 deltas. |
| Workbook content | **build-time compiler → static JSON + SQL**, split `public/` vs `secret/` | Every access is a primary-key lookup. The public bundle is small enough to inject wholesale. `content_version` pinned per enrollment so tickets don't shift mid-workbook. |
| Hidden-test **metadata** | **static JSON manifest + SQL mirror**, bodies excluded | The linchpin nobody names. Three systems must select hidden tests by attribute and none can grep, because the tests aren't mounted where the querier lives. Metadata is publishable; bodies never leave the secret bundle. This is what lets you say *"you've failed a tenant-isolation test three times"* without a body moving toward the learner. |
| Concept vocabulary | **200–500 hand-authored terms + join table** | Authors assign tags; nothing is inferred. Objectives must not be free text you later fuzzy-match — this drives the learner directives and has to be exact and auditable. |
| Learner history | **plain SQL** — `submissions`, `gate_results`, `test_outcomes`, `concept_mastery` view | Exact-lookup corpus. Semantic search over it is a category error. |
| Existing course material | **curated `concept → explainer` table**, with a `spoils: ticket_id[]` column | The one place filesystem isolation does not reach — a citation can leak a later sprint's answer. The spoiler filter is a *prerequisite*, not a follow-up. BM25 only if the curated table's measured miss rate justifies it. |
| Repo content, any corpus | **embeddings** | **Deferred.** Re-open only if BM25 over course material measurably fails. |

## 3. The four context layers

Ordered stable-first so prompt caching survives learner edits. The orchestrator
assembles them *outside* the container and injects them as system-prompt blocks;
only A and B also exist as files the learner can read.

**Layer A — `MERIDIAN.md`, hand-authored, read-only.** Bind-mounted from outside
`/workspace` and symlinked in; checksummed at session start. Learner-*readable*,
never learner-*writable* — it pipes straight into the agent's context, and a
learner-writable file there is a prompt-injection surface.
Content is **trajectory-independent facts only**: invariants that constrain any
correct solution (*"money is `bigint` minor units at every boundary; no float
crosses the serialization seam"*), conventions, stable seed seams. **No file
inventory. No "where things live"** — that is the half that goes stale.
Budget ~1–1.5k tokens per sprint, ~8–15k by S10.

**Layer B — `.meridian/MAP.md`, generated, never hand-authored.** `lab map` runs
at container start, on a debounced fs watcher over the files a ticket touches,
and in the grading container after every accepted submission. Contains per-file
exported symbols with signatures (from `tsc --emitDeclarationOnly`, not a
bespoke parser), the route table, the migration list, the test inventory, and
`git diff --stat sprint-N-start..HEAD`.

> Mandatory first line, verbatim:
> `generated at <sha> · <iso8601> · if the tree disagrees with this file, the tree is right.`
> Without it, the anchoring effect that makes `CLAUDE.md` work is the same
> effect that poisons it.

**Layer C — the per-ticket block.** Assembled from the **public bundle only**,
whitelisted by type: sprint goal, standup, ticket body, acceptance criteria,
`ai_policy`, and `learnerDirectives[]`. The assembler lives in a package with no
read access to the secret bundle. A CI test asserts the assembled prompt is
byte-reducible to what the UI can render — *"repeat everything above this line"*
is assumed to work; the defence is that there is nothing there.

`learnerDirectives[]` replaces "topics covered": 3–6 lines, hard cap, compiled
into **behaviour, not history**. Not *"in sprint 3 they shipped a cross-tenant
leak"* but *"on changes touching tenant scoping, narrate the invariant before
editing and leave the assertion for the learner to write."* Store events, never
traits — traits are unfalsifiable, usually small-sample, and permanent, which
contradicts a headline metric that is supposed to go down. Entries decay after
N sprints or two clean passes.

A unit-tested pure function `filterDirectives(entries, currentHiddenTopicTags)`
**drops** — never paraphrases — any entry colliding with the current ticket's
hidden-test tags. Meridian reuses topics by design, so an S4 escaped defect is
one paraphrase away from an S7 hidden test.

**Layer D — the per-turn block, 200–400 tokens.** Which visible tests are red
*right now* and the failing assertion text; `git diff --stat` since sprint start
and ticket start; files touched; turn index.

> This is the highest value-per-token item in the whole design, and it was
> missing. Claude Code only feels omniscient because a human keeps pasting the
> failing test in. **Your platform owns the test runner and was throwing that
> away.** At turn 30 the agent must not still be reasoning from turn 1's state.

## 4. The spoiler boundary — the invariant changed

> ~~"The in-workspace agent physically cannot read what was never mounted."~~

True, and **about the wrong container.** The grading container must *execute*
the learner's tree — a hidden test cannot assert on `createClaim()` without
importing it — so at grade time, learner-authored code and `tests/hidden/` are
co-resident **by construction**. Read-only stops writes, not reads.

Fifteen lines in `vitest.config.ts → globalSetup` — a file the learner
legitimately owns, and which sprints 5 and 6 are *about* owning — walks the
grader's filesystem and dumps it to stderr. And `GateResult.cases[].message`
was built to show the learner exactly that stderr. A hidden test file is 3–6 KB;
an 8 KB truncation leaks it whole **in one submission**. Not a timing channel —
a plaintext channel we deliberately built for good error messages.

This is also where "prompt-level guardrails are unnecessary" dies. A human has
to invent that exfiltrator. A learner with an agent types *"write me a vitest
globalSetup that dumps any file outside the repo root to stderr"* and has it in
thirty seconds — the agent operating on data that **is** mounted, producing an
artifact that runs where the answers **are** mounted.

**The replacement invariant, verbatim:**

> **No byte produced by learner-controlled code inside the grading container
> reaches the learner except as a boolean against an author-written name — and
> no secret has ever existed on any object, ref, or image layer the learner can
> reach.**

### Launch blockers

1. **Split the gates by container, not by mount.** Visible tests run in the
   learner sandbox, which holds no secret material — so full raw output, stacks,
   assertion diffs, everything; DX unharmed. Hidden / regression-hidden /
   adversary run in the grader, which mounts **only `src/`** — never the
   learner's test dir, config, or package scripts.
2. **Whitelist-project the grader's output** to `{test_id → curated humanName, passed}`.
   No runner output, stack, code frame, expected/actual, file path, or grader
   stderr. Allowlist, never blacklist. Grader crashes map to a generic error.
   This costs rich hidden-gate failure messages. Pay it.
3. **Grader has no network namespace**, and hidden tests are read into memory and
   **unlinked from disk** before any learner module is imported.
4. **The grader ignores everything the learner can author about execution** —
   its own vitest config, tsconfig, reporters, setupFiles, globalSetup and test
   command come from outside the mount. `npm ci --ignore-scripts` against a
   pre-baked `node_modules`. Postgres runs as a non-superuser role with no
   `pg_read_server_files` and no `COPY … FROM PROGRAM` — sprints 3 and 5 hand
   the learner authorship of SQL that executes in the grading container.
5. **The grader runs the content repo's canonical `tests/visible`, never the
   learner's copy.** Otherwise "delete the assertion" is the cheapest exploit in
   the product.
6. **Secrets live in a separate repository with a separate ACL** and have never
   existed in any object at any commit of the learner's repo. Workspaces are
   provisioned by `git init` + file copy — **never a clone**, never `cp -r` of a
   `.git`. One `cp -r`, once, and ten sprints of hidden tests sit in
   `.git/objects`, recoverable in a second with `git cat-file --batch-all-objects`.
7. **No long-lived credential in the learner container.** Submission is brokered
   out-of-band or with a single-use, attempt-scoped, minutes-long token good for
   exactly one endpoint. Default-deny egress with a hostname allowlist.
8. **Server-side object-level authz on every ticket/attempt/retro endpoint**,
   plus a CI scan asserting no answer-bearing key (`referenceDiff`,
   `wrongCommentId`, `hiddenTests`, `expected*`) appears in any JSON or RSC
   payload before the attempt is finalized.
9. **Nothing from sprint N+1 exists anywhere in the workspace image, volume or
   repo.** Ship a fixture test that greps a provisioned "sprint 1 learner"
   container for future-sprint and solution markers.

## 5. Grading is the guardrail — half of it survived

**Survives:** the agent does **not** refuse to solve the ticket. Refusal is
unenforceable (claude.ai is one tab away), contradicts the product stance, and
would teach your own team that prompt-level boundaries are real. Its only
refusals are capability-level.

**Refuted:** that this is *sufficient*. Hidden tests are guessable — the spec's
own four examples are textbook, and a strong model reading the ticket and the
visible tests will pass a large fraction of them cold. Four mechanisms replace
the assumption:

1. **Escaped-defect rate splits by `ai_policy`.** Only `unassisted` and
   `review-only` attempts feed the readiness score and the shareable artifact.
   Assisted escaped-defect rate is labelled formative feedback and nothing else.
   One column on `TicketAttempt`.
2. **The contamination gate**, in `lab validate`: run a cold, one-shot,
   pinned-model agent on the ticket body plus visible tests alone and record how
   many hidden tests it passes. **Over ~60% and the ticket cannot ship as a
   graded assisted ticket.** This is the red/green history gate pointed at the
   new failure mode — it replaces an estimate with a number.
3. **Score finalizes at first submission.** Escaped-defect names and
   `reference.diff` release only after finalization; re-attempts draw a
   different hidden-suite variant with a rotating, never-named held-back subset.
   Otherwise the reveal *is* the answer key.
4. **Per-ticket submission budget, cooldown, and fixed-latency reporting**, to
   close the oracle and timing channels.

Also: **retire the "which bot review comment is wrong" score under `assisted`
policy.** An agent solves it by reasoning, with zero exfiltration — the boundary
is irrelevant to it. Keep it under `review-only`, where it is the point.

And state plainly in the product that `unassisted` **cannot** be enforced
against the learner's own external tools. Design those tickets so that cheating
is obviously self-defeating, and say so in the learner's own words rather than
pretending to a guarantee you do not have.

## 6. Agent modes, driven by `ai_policy`

**Enforced as capability, never as conscience.**

| Mode | What runs | Scoring |
|---|---|---|
| `assisted` | Full toolset: `read_file`, `glob`, `rg`, `find_references`, `edit_file`/`write_file` (every hunk provenance-tagged `agent`\|`human`), `bash` in the sandbox, `run_visible_tests`. | Graded on the state of the system. Formative only. |
| `unassisted` | **No agent session is issued at all** — not a live agent wearing a disabled skin, which is one injection away from an enabled one. Requires a new `ai_policy_reason` field on `ticket.md`, written in-fiction, shown on the board card, as a non-dismissible workspace banner, and at retro. | The product's measurement instrument. Weighted above assisted attempts, because it is the only uncontaminated sample. Floor: ≥1 per sprint. |
| `review-only` | The **author agent** gets read tools and its own PR diff. No edit, no write, no bash, no test runner — so *"just run it and see"* comes back as *"I can't from here,"* which forces the **learner** to execute. That is the skill. Neither `review.yaml` nor `reference.diff` is mounted, so it genuinely does not know which bot comment is the trap. | Verification carries most of the weight, and **a reproducing failing test outscores prose.** False positives cost a little — S10's one genuinely-fine PR is what makes that measurable. |
| `tutor` (overlay) | Read tools, no write, no bash. On `unassisted` tickets, a **repo-blind** variant whose mount excludes `src/` and `tests/` — so *"I can't see your code on this ticket, and that's deliberate"* is a fact, not a promise. | **Zero, deliberately.** Any bonus for tutor use immediately produces performative tutoring — precisely the failure this product exists to detect. |

**`review-only` needs `author_brief.yaml` to work at all.** A new required
content artifact: stated intent, a plausible justification for each design
decision *including the wrong one*, a do-not-volunteer list, and
`concession_triggers[]` — specific technical facts that force a concede
(*"two concurrent requests, same key, different workers"*).

Without it the mode fails two ways, both fatal. Either the author agent **folds
the instant the learner expresses doubt** — teaching that confident pushback
always works, the worst possible lesson for this platform — or it hallucinates
defences the author never held and difficulty drifts ticket to ticket.
Concession must be a machine-checkable event with an authored trigger, which is
also what keeps difficulty stable across model upgrades.

**Tutor mode is worth building, but only in its repo-blind form.** Built as
"assisted with the edit tool removed" it is theatre — and worse, it ships a
prompt-enforced boundary next to a filesystem-enforced one, which teaches your
own team the wrong lesson about which is real.

## 7. The learner model — the rule that keeps it from being creepy

**The model changes what the agent *does*, never what it *says* about the
learner, unless the learner asks.** *"I see you've struggled with idempotency
before, so let's go slowly"* is the creepy and demotivating surface; quietly
slowing down and asking what happens on redelivery is the same information doing
useful work. The retro agent is the sole exception, because the learner is
there to be told.

One click from the workspace header: **"What the agent knows about you"** —
showing the *literal injected text*, not a friendly summary. Any entry can be
muted; muting is not recorded, not penalized, and not shown to the agent.

> If a line is one you would not want the learner to read, it does not belong in
> the model. That is the whole test, and it is cheap to apply.

Never inject scores or readiness numbers into any agent context.

## 8. Build order

1. **Workspace agent v0, assisted only.** Full toolset over a workspace
   provisioned by `git init` + file copy. Ship with a CI assertion that a fresh
   workspace has zero git objects matching hidden-test signatures — that one
   check is what makes it safe to ship the agent before the grader is hardened.
   **Ship search instrumentation in the same PR** (search calls before first
   edit, tokens on search, wall-clock to first edit, max grep hit count): it
   costs nothing now, is impossible to reconstruct later, and is the only honest
   evidence about whether the grep-only bet holds.
2. **Layers B and D, plus the read-only mount for A.** `lab map`, the per-turn
   block, and stripping the file inventory out of `MERIDIAN.md`.
3. **Grader hardening.** Launch blocker. §4 items 1–5.
4. **Content compiler with the build-time public/secret split.** Launch blocker.
   CI fails if any secret-classified field appears in the public bundle.
5. **Git refs as the entire repo-indexing story.** Hours of work; delivers the
   regression gate's input tree, the retro diff, and free dedup.
6. **`ai_policy` as capability + the agent transcript log.** Launch blocker.
7. **tsserver `find_references` / `go_to_definition`.**
8. **Metric integrity.** Launch blocker for the recruiter-facing surface. §5.
9. **The four new `lab validate` assertions, then the contamination gate.**
10. Concept vocabulary, hidden-test metadata manifest, learner history tables.
11. `author_brief.yaml` and the review-only author agent — backfill S10 first.
12. Retro agent, in its own container against a read-only snapshot.
13. Tutor tabs, then the curated concept→explainer table **with** its spoiler
    filter.

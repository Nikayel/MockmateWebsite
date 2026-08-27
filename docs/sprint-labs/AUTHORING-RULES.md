# Meridian authoring rules — binding for every content agent

Distilled from `SPRINT-PLAN.md` ("Fixes to apply before authoring" + §9),
`WORKBOOK-SPEC.md` §5–§6, `AGENT-CONTEXT.md`, and the owner decisions in
`EXECUTION-STATE.md`. When this doc and a spec disagree, the spec wins and the
disagreement gets reported, not silently resolved. `lab validate` enforces the
rules marked **[validate]**.

## 1. Identity and numbering

- **[validate]** Migration filenames: one monotonic counter `0001`–`0030`
  across the whole workbook, unique, no gaps. Use the exact allocation table
  in `SPRINT-PLAN.md` §"Fixes" item 1 (e.g. `MER-103` → `0004_claims_created_at_id_idx.sql`,
  `MER-302` → `0010_row_level_security.sql`, seed owns `0001`–`0003`).
- **[validate]** One name per file, forever: `src/db/repositories/outbox.ts`
  (never `outbox-repository.ts`), `src/db/repositories/claims.ts` (never
  `claim-repository.ts`).
- `src/db/repositories/documents.ts` is IN THE SEED, carrying its latent
  defects: documents fetched one query per claim in a `for` loop, tenant
  filter omitted, no `tenant_id` column on `documents` (only `claim_id`), no
  index on `claim_id`. Latent means latent: no reference diff introduces or
  fixes these before their ticket.
- Agent PR numbers are monotonic: `#412` (S1 MER-105), `#418` (S2), `#431`
  (S3 MER-303), `#447` (S4 MER-404), `#462` (S5 MER-505), `#478` (S6
  MER-604), `#494` (S8 MER-805), `#511`/`#512`/`#513` (S10 MER-1001's three
  overnight PRs). Fix every ticket body that says otherwise.
- **[validate]** Every path in `filesTouched` exists in the seed or in an
  earlier sprint's created set. `newSourceFiles` is regenerated mechanically
  as (sprint's `filesTouched`) − (seed ∪ all prior sprints). A second field
  `rewrittenFiles` lists seed files a sprint substantially replaces (S3, S4,
  S8 use this).
- **[validate] Casing, per key (ruling R17):** each authored key follows the
  spec's own spelling, checked in both directions by `lab validate`'s
  `snake-case-authoring-keys` rule — `ai_policy`/`ai_policy_reason`/
  `concession_triggers` are snake_case (WORKBOOK-SPEC.md §6); `filesTouched`/
  `newSourceFiles`/`rewrittenFiles` are camelCase (this section, per
  SPRINT-PLAN.md's own spelling). `pathEnumerationSignoff` (a `lab validate`
  escape hatch on `ticket.md`, not spec-named elsewhere) is camelCase too: it
  is a boolean a reviewer sets to attest that a ticket's file-path
  enumeration was confirmed pedagogically necessary, not an accidental
  spoiler of "the files to touch" (§6). `dupHunkSignoff` (same style, same
  file, review round 2 item 1) is the matching escape hatch for
  `no-duplicated-hunk-from-unshipped-reference`: a boolean a reviewer sets
  on a ticket whose `setup.diff` legitimately, intentionally reuses a later
  sprint's hunk — never set to silence a real spoiler.

## 2. State fixes from the reconcile pass (apply, don't rediscover)

- `MER-504`: migration `0017_delivery_attempts.sql` CREATES the
  `delivery_attempts` table it indexes (its hidden test asserts RLS was never
  enabled on a table that must therefore exist).
- `MER-602`'s reference diff explicitly deletes `infra/task-definition.json`
  and `infra/iam-policy.json`; `MER-604`'s hidden test names the container
  definition in `infra/ecs.tf`, not the deleted JSON.
- Fixture conversions stated in ticket bodies: `MER-103` converts
  `test/fixtures/claims.json` → `claims.ts` builder (needs same-millisecond
  timestamps); `MER-301` converts `tenants.sql` → `tenants.ts` (needs a
  second tenant). The `.ts` files join `newSourceFiles`; the seed versions
  are deleted in the reference diff. Never two sources of truth.
- `MER-903`: the false-positive-rate assertion splits in two, and the ticket
  body gains "report the guard's false-positive rate on the golden set." The
  trap is forgetting a stated requirement, never failing to guess an
  unstated one.
- Facts a hidden test asserts must be discoverable in the repo: platform in
  `compose.yml`/`deploy.yml` (never the host's architecture), RDS engine
  version in `infra/`, credential tests assert fail-closed with none
  configured (never pass via a real `~/.aws`).

## 3. Sizing (stub-level, from §"Fixes" item 8 + ruling R1)

- Sprint 5 keeps 5 tickets; its stated hours lengthen (3.5 → ~6.5h) instead
  of splitting MER-504. Note in `sprint.yaml` `sizingNotes`.
- Sprint 7 re-points to match its real weight (~24–25 pts across the same 5
  tickets).
- Sprint 2 moves ~20 visible cases into the hidden tier (target ≈107 visible
  / ≈52 hidden).
- Sprint 3 raises `MER-302` and `MER-305` to ~15 visible cases each.
- Sprint 8's `sizingNotes` records the no-breather concern; points unchanged.

## 4. The four payoff wirings (SPRINT-PLAN §9 — exact designs, not sketches)

The authoring rule, verbatim from the spec: *a payoff must fire for every
correct implementation of the setup, never for one branch and never for
learners who ignored a criterion; the setup must be a correct fix with a
second-order cost — the learner's earlier code survives intact into the later
sprint.* **[validate]** Every `payoffFor`-declaring ticket carries a reviewer
sign-off field attesting this.

- **9.1** `MER-302` gains the acceptance criterion: document visibility is
  derived from the parent claim in the database, not from a tenant key
  copied onto the document row (justified in-ticket on isolation grounds
  only). New `MER-302` hidden test: "Escaped: a document can be attached to
  another tenant's claim." Non-telegraph guards on `MER-302`: no query-count
  / EXPLAIN / connection-checkout / latency assertions, no N+1-or-index
  objective tags, and the words *round trip*, *N+1*, *batch*, *index* appear
  nowhere in body, criteria, or standup copy. `MER-304`'s causal sentence
  moves out of the opening paragraph into a git-blame section and stops
  blaming "the transaction wrapper"; its retro attributes 90ms → 4.2s to 50
  sequential scans of a 400k-row `documents` table.
- **9.2** `MER-804` establishes local result cache + provider prefix cache +
  the two-column prefix taxonomy (deliberately no third category). `MER-903`
  gains a visible test, justified on security alone: the fencing instruction
  must name the per-request delimiter it fences with. Cost estimation is
  worst-case ceiling, charged from actual usage, re-checked post-response.
- **9.3** The arc prose is wrong, the tickets are right: the S9 injection
  travels `S6 MER-603 consumer tenant seam → MER-903`, NOT S8's retrieval.
  `MER-803` gains the criterion: retrieval is exposed to the extractor as a
  callable tool, and since extraction runs off the request path (MER-603),
  scope binds at the call site from the job envelope's tenant. Fix the arc
  sentence everywhere it appears (WORKBOOK-SPEC §3 already has the corrected
  form).
- **9.4** `MER-104`'s compatibility descriptor is the single source of which
  query parameters exist / are deprecated / sunset; runtime stamps
  `Deprecation`/`Sunset` from it; the generator emits the same. Its hidden
  test: "Escaped: the document publishes a sunset date the response headers
  never promised." `MER-204`: v2 drops `page`/`per_page` outright while v1
  keeps them under the shim — the generator's one `parameters` array now has
  two true answers. Riders: default-to-v1 is an explicit `MER-204`
  acceptance criterion (the whole sprint-1 regression column hangs on it),
  and `MER-204`'s v1 money serializer survives unchanged (feeds `MER-205`'s
  working audit-hash payoff).
- **9.5 Do not disturb** the eight working payoffs (table in the spec):
  MER-403→1005, 801→902, 302/303→{402,503,701,803}, 203→401, 202→403,
  503→{505,604}, 703/704→805, 201→1003.

## 5. Hidden tests

- Traps a careful engineer would anticipate, never gotchas. Every hidden
  test carries a curated `humanName` — the only string the learner ever sees
  from the grading tier ("Escaped: duplicate delivery inside the retry
  window").
- **Score-feeding tickets (all `unassisted` + `review-only`) must author
  their hidden tier as IO-cases**: deterministic inputs issued at submit,
  expected outputs held server-side, comparison server-side (owner decision
  3 / deviation D1). Property probes (client-executed assertions) are
  allowed on `assisted` tickets as formative feedback only.
- **[validate]** Reference diff goes red→green on BOTH tiers; visible AND
  hidden fail on the pre-ticket tree.
- **[validate]** Contamination gate: a cold, pinned-model, one-shot run on
  ticket body + visible tests must pass <60% of hidden tests or the ticket
  cannot ship as graded-assisted.
- No `setup.diff` or `MERIDIAN.md` delta contains a hunk from an unsolved
  `reference.diff`; no `MERIDIAN.md` line states an invariant asserted by an
  unshipped hidden test.

## 6. Voice and surface rules

- Ticket bodies read like real Jira: wrong repro steps, pasted Slack, an
  ambiguous PM ask. **The files to touch are never listed** — in body,
  criteria, or hints.
- **No em dashes in learner-facing prose** (site-wide content rule).
- **[validate] (ruling R18):** the em-dash rule covers `ticket.md`'s `title`
  and `sprint.yaml`'s `goal` too, checked by `lab validate`'s
  `no-em-dash-in-prose` rule alongside body/criteria/standupQuote/humanName/
  objective text. This site-wide rule outranks spec punctuation: an
  em-dashed title quoted verbatim from `SPRINT-PLAN.md` gets re-punctuated
  at authoring, never preserved as-is.
- `ai_policy_reason` is required on every `unassisted` ticket, written
  in-fiction, and renders on the board card, as a non-dismissible workspace
  banner, and at retro.
- **[validate]** Every ticket maps to ≥1 learning objective from the
  controlled vocabulary; every objective tag exists in the vocabulary; a
  ticket mapping to none is rejected as a chore.
- Learning objectives are first-class UX (owner decision): sprint.yaml
  carries `objectives[]` with ids, short labels, and the full "can do"
  sentence from SPRINT-PLAN — the UI renders them at catalog, standup,
  ticket, and retro.

## 7. Content tree per ticket (WORKBOOK-SPEC §6)

`ticket.md` (frontmatter: points, labels, ai_policy, ai_policy_reason?,
objectives[], payoffFor?, payoffSignoff?) · `setup.diff` · `tests/visible/` ·
`tests/hidden/` (secret) · `adversary/` (26 tickets) · `review.yaml` (secret;
`correct: false` marks the trap comment) · `author_brief.yaml` (secret;
review-only tickets: intent, per-decision justification including the wrong
one, do-not-volunteer list, `concession_triggers[]`) · `reference.diff`
(secret) · `rubric.yaml`. Secret artifacts never appear in the public bundle
— the compiler enforces, CI double-checks.

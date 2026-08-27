# Meridian — the ten-sprint plan

Authored sprint by sprint, then reconciled against each other. Every count
here comes from the authored tickets, not an estimate.

Companion to [`WORKBOOK-SPEC.md`](WORKBOOK-SPEC.md) — the product — and
[`AGENT-CONTEXT.md`](AGENT-CONTEXT.md) — the in-workspace agent.

---

## Sizing

| | |
|---|---|
| Sprints | 10 |
| Tickets | 50 |
| Story points | 263 |
| Visible test cases | 733 |
| Hidden test cases | 347 |
| Tickets with an adversary | 26 |
| `unassisted` tickets | 5 |
| `review-only` tickets | 10 |
| Learner hours | ~58 |

**Seed repo** — what the learner opens on day one: 61 files, ~1,708 lines,
19 starter test cases. Plausible and wrong in exactly the ways sprints 1–10
fix. **Finished repo**: ~65 source files, ~12,000 lines of non-test source,
30 migrations, 220 test files, 1,080 graded test cases — roughly 7x growth.

**Authoring cost**: 498 content files — 50 `ticket.md`, 50 `setup.diff`,
50 `reference.diff`, 50 `review.yaml`, 50 `rubric.yaml`, 128 visible and 84
hidden test files, 26 adversary runners, 10 `sprint.yaml` — plus ~25 infra
files and ~150 fixtures, of which sprint 9's 120-case golden eval set must be
hand-labelled by a human.

| # | Sprint | Topic | Tickets | Pts | Visible | Hidden | Adv | Hours |
|---|---|---|---|---|---|---|---|---|
| 1 | Contracts | TypeScript as a type system · API design & contracts | 5 | 26 | 77 | 30 | 2 | 5.0 |
| 2 | Money & Time | Serialization & data contracts | 5 | 26 | 127 | 32 | 2 | 5.0 |
| 3 | Tenants: make the database refuse | Databases, transactions & RLS | 5 | 26 | 47 | 39 | 3 | 6.7 |
| 4 | Delivery | Concurrency & distributed correctness | 5 | 26 | 59 | 36 | 3 | 7.5 |
| 5 | Parity | Containers & environment parity | 5 | 28 | 71 | 44 | 3 | 3.5 |
| 6 | Ship it | Cloud & deployment (AWS) | 5 | 28 | 86 | 38 | 3 | 6.3 |
| 7 | When It Breaks | Observability & operations | 5 | 19 | 85 | 34 | 3 | 6.7 |
| 8 | The model | AI engineering in production | 5 | 34 | 60 | 34 | 2 | 6.7 |
| 9 | Trust it | Verifying AI — evals & injection defence | 5 | 26 | 63 | 31 | 2 | 6.5 |
| 10 | The Agent's PR | Verifying AI — reviewing the agent's PR | 5 | 24 | 58 | 29 | 3 | 4.3 |

## Fixes to apply before authoring

These came out of a reconcile pass across all ten sprints. Each is cheap now and
expensive once 50 tickets exist. **`lab validate` should enforce 1, 2 and 5.**

### 1. Migration numbers — one monotonic counter across the whole arc

Numbers were assigned per sprint with no global counter, so seven prefixes are
reused across eighteen files on a codebase that persists for ten sprints. The
allocation below is the fix; it lands at exactly 30, which is where sprint 10
already assumes the counter is.

| # | Ticket | File | |
|---|---|---|---|
| 0001 | seed | `0001_init.sql` | |
| 0002 | seed | `0002_webhooks.sql` | |
| 0003 | seed | `0003_indexes.sql` | |
| 0004 | `MER-103` | `0004_claims_created_at_id_idx.sql` | was 0002 |
| 0005 | `MER-201` | `0005_money_minor_units.sql` | was 0003 |
| 0006 | `MER-202` | `0006_claim_dates_and_tenant_zone.sql` | was 0004 |
| 0007 | `MER-203` | `0007_claim_audit_hash.sql` | was 0005 |
| 0008 | `MER-204` | `0008_subscription_envelope_version.sql` | was 0006 |
| 0009 | `MER-205` | `0009_audit_hash_projection_version.sql` | was 0007 |
| 0010 | `MER-302` | `0010_row_level_security.sql` | was 0007 |
| 0011 | `MER-304` | `0011_claims_tenant_indexes.sql` | was 0008 |
| 0012 | `MER-305` | `0012_claims_external_ref_unique.sql` | was 0009 |
| 0013 | `MER-401` | `0013_idempotency_keys.sql` | was 0007 |
| 0014 | `MER-402` | `0014_outbox.sql` | was 0008 |
| 0015 | `MER-403` | `0015_dead_letters.sql` | was 0009 |
| 0016 | `MER-405` | `0016_outbox_ordering.sql` | was 0010 |
| 0017 | `MER-504` | `0017_delivery_attempts.sql` | was 0008, **and renamed** — see 3 |
| 0018 | `MER-601` | `0018_documents.sql` | was 0009 |
| 0019 | `MER-603` | `0019_outbox_sqs_dedup.sql` | was 0010 |
| 0020 | `MER-604` | `0020_documents_drop_legacy_path.sql` | was 0011 |
| 0021 | `MER-702` | `0021_outbox_trace_context.sql` | was 0007 |
| 0022 | `MER-801` | `0022_extraction_outcome.sql` | was 0014 |
| 0023 | `MER-803` | `0023_policy_chunks.sql` | was 0015 |
| 0024 | `MER-804` | `0024_extraction_budget.sql` | was 0016 |
| 0025 | `MER-905` | `0025_extraction_quarantine.sql` | was 0014 |
| 0026 | `MER-1002` | `0026_outbox_lease.sql` | was 0031 |
| 0027 | `MER-1003` | `0027_payout_expand.sql` | was 0032 |
| 0028 | `MER-1003` | `0028_payout_backfill.sql` | was 0033 |
| 0029 | `MER-1003` | `0029_payout_contract.sql` | was 0034 |
| 0030 | `MER-1005` | `0030_delivery_deadline.sql` | was 0035 |

`lab validate`: assert every migration filename across the workbook is unique
and that the sequence has no gaps.

### 2. One name per file

Two repository modules each carry two names across sprints, on a codebase the
learner reads for ten sprints. Pick one and enforce it:

- `src/db/repositories/outbox.ts` — **not** `outbox-repository.ts`
- `src/db/repositories/claims.ts` — **not** `claim-repository.ts`

And `src/db/repositories/documents.ts` is listed in `filesTouched` by three
sprint-3 tickets but exists in neither the 61-file seed nor any earlier sprint.
**Add it to the seed** carrying its latent defect — documents fetched one query
per claim in a `for` loop, and the tenant filter omitted — which is also what
sprint 3's payoff needs (see 5).

`lab validate`: assert every path in `filesTouched` either exists in the seed or
appears in an earlier sprint's created-files set.

### 3. Two hidden tests reference state their own sprint does not create

- **`MER-504`** — the hidden test reads *"0008 creates a table but never runs
  `ENABLE ROW LEVEL SECURITY`"*, but that migration only creates an index.
  Change the migration to create the `delivery_attempts` table it indexes, and
  rename it `0017_delivery_attempts.sql`.
- **`MER-604`** — the hidden test names *"the task definition still carried the
  database password in `environment`"*, but `MER-602` replaced the hand-written
  `infra/task-definition.json` with Terraform one ticket earlier. Have
  `MER-602`'s reference diff explicitly delete `infra/task-definition.json` and
  `infra/iam-policy.json`, and reword `MER-604`'s hidden test to name the
  container definition in `infra/ecs.tf`.

### 4. Facts a hidden test asserts must be discoverable in the repo

Three hidden tests can only fire on a developer laptop, not in a clean grader:

- an image-architecture assertion that reads the **host's** architecture —
  put the target platform in `compose.yml` / `deploy.yml` and assert the image
  manifest against *that*
- an RDS engine version that is stated nowhere — put it in `infra/`
- a test that passes only because credentials fell through to a real `~/.aws`
  profile — replace with an assertion that the harness **fails closed** when no
  credentials are configured

Separately, `MER-903`'s last hidden test smuggles in a new deliverable — *"the
guard's false-positive rate on the golden set is never measured"* — that the
ticket never asks for. Split it in two and add *"report the guard's
false-positive rate on the golden set"* to the ticket body. **The trap should be
forgetting to do a thing you were told to do, never being marked down for not
guessing a requirement.**

### 5. `newSourceFiles` is unreliable in both directions

Files listed as new that are already in the seed (S3's `domain/tenant.ts` and
`repositories/tenants.ts`; S4's `queue/outbox.ts`, `delivery/retry.ts`,
`delivery/signature.ts`; S8's `extract/schema.ts`, `extract/retrieval.ts`), and
files created but never listed (S5's `docker/healthcheck.js` and
`infra/deploy.yml`; **S6's thirteen Terraform and deploy files**; S7's
`infra/slo/` and `infra/alerts/`).

Regenerate `newSourceFiles` mechanically as the set difference between each
sprint's `filesTouched` and the union of the seed plus all prior sprints. Add a
second field, `rewrittenFiles`, for seed files a sprint substantially replaces —
that is what sprints 3, 4 and 8 were actually trying to express.

### 6. Fixture format mismatches

`MER-103` touches `test/fixtures/claims.ts` and `MER-301` touches
`test/fixtures/tenants.ts`, but the seed ships `claims.json` and `tenants.sql`.
State the conversion in each ticket body — `MER-103` needs a builder because it
needs same-millisecond timestamps, `MER-301` needs a second tenant — add the
`.ts` files to `newSourceFiles`, and delete the seed versions in the reference
diff. Do not leave two sources of truth.

### 7. PR numbers must be monotonic

Four different agent PRs are all numbered `#418`, on one repo the learner works
for ten sprints. Allocate: `#412` (S1), `#418` (S2), `#431` (S3), `#447` (S4),
`#462` (S5), `#478` (S6), `#494` (S8), and `#511` / `#512` / `#513` for sprint
10's three overnight PRs.

### 8. Known mis-sizing

- **Sprint 5 is over-packed.** 28 points and 44 hidden tests — the most in the
  workbook — in 3.5 h, the shortest sprint. `MER-504` alone (advisory locks, a
  migration ledger, `CONCURRENTLY`, moving migrations off the boot path) is
  sprint-sized. Split it or lengthen the sprint.
- **Sprint 7 is under-pointed.** 19 points against 6.7 h and five new source
  files including `AsyncLocalStorage` propagation, a redactor, an SLO module
  and an admission controller. That is 25-point work wearing a 19-point label.
- **Sprint 8 has no breather.** Three consecutive 8-pointers, back to back.
- **Sprint 2's tiers are inverted.** 127 visible against 32 hidden, in the one
  sprint whose entire point is that the obvious fix is wrong. Move ~20 visible
  cases into the hidden tier.
- **Sprint 3's hardest tickets are the thinnest-covered.** `MER-305` has 8
  visible cases for a 5-point unassisted concurrency ticket; raise it and
  `MER-302` to ~15 each so the learner can see isolation failing before submit.


### 9. Wire the four cross-sprint payoffs

The arc promises these and does not deliver them: the later ticket references a
condition the earlier ticket never establishes — or, in one case, that the
earlier ticket's own hidden test *forbids*. A promised callback that doesn't
land is worse than no callback: the learner goes looking in their own code and
it isn't there.

Each was designed, then attacked by an independent skeptic. **All four first
drafts were refuted.** What follows is the amended version. The rejected drafts
are named too, because the failure modes generalise.

> **The authoring rule these produced — apply it to every payoff you write.**
> A payoff must fire for **every correct implementation** of the setup, not for
> one. If it only fires for learners who took a particular branch — or worse,
> for learners who *ignored* an acceptance criterion — it misfires constantly
> and reads as unfair. And the setup must be a **correct fix with a
> second-order cost**, never a planted bug and never a planted norm: the
> difference between a tradeoff and a trap is that the learner's earlier code
> survives intact into the later sprint. Add this to `lab validate` as a
> reviewer checklist item on every ticket that declares a `payoffFor`.

#### 9.1 `MER-302` (RLS) → `MER-304` (the N+1)

**Why it isn't wired.** `MER-302` only changes *where* the tenant predicate
lives — app `WHERE` clause to Postgres policy. It never changes the *shape* of
the claims-list read, so a learner can move isolation into RLS and leave the
seed's joined statement untouched. Worse, the seed already fetches documents in
a per-claim loop, so `MER-304` currently asks the learner to fix an N+1 that
predates them.

**Rejected first draft:** a criterion that *"no single statement may read more
than one tenant-scoped table."* The skeptic killed it — it is a **planted
norm**, it contradicts the sibling criterion it ships with (the reference
violates its own rule on every document read), and `MER-304`'s batched fix
satisfies it anyway, so it forces nothing.

**Ship this instead.** One acceptance criterion on `MER-302`:

> Document visibility must be derived from the parent claim **in the database**,
> not from a tenant key copied onto the document row.

Justified in-ticket on isolation grounds only — *a copied `tenant_id` is a
second source of truth the extraction worker can set wrong, which is the same
"isolation is a field somebody remembers" failure this sprint exists to delete.*
It has exactly one compliant shape: a correlated `EXISTS` over `claims`. Every
learner who solves `MER-302` correctly writes it, looper and batcher alike.

Defended by a new `MER-302` hidden test that is a **correctness** test, not a
shape test: *"Escaped: a document can be attached to another tenant's claim."*
A denormalised-`tenant_id` implementation passes its own `WITH CHECK` by
stamping the writer's own tenant on a row pointing at a claim it cannot see.

**The cost is the query plan, not the statement count.** A non-leakproof
correlated security qual on `documents` is applied at the relation scan, so the
planner cannot push the join down — mechanical, not stylistic, and it lands on
a `documents(claim_id)` index the seed never needed while a hash join read the
table once.

Seed preconditions: `documents` has no `tenant_id` column (only `claim_id` —
the extraction worker receives a claim id off SQS and has no tenant in scope),
and no index on `claim_id`. Both must be **latent**, never introduced by a
reference diff.

Rewrite `MER-304`'s causal sentence — it currently blames "the transaction
wrapper," which is the wrong mechanism — and move it out of the opening
paragraph into a git-blame section further down. Locating the cause is half the
ticket. In the retro, attribute 90ms → 4.2s correctly: it is **50 sequential
scans of a 400k-row `documents` table**, not 51× one query and not pool
starvation. That is also why it's Continental and only Continental.

**Non-telegraph guards on `MER-302`:** no query-count assertion, no `EXPLAIN`
assertion, no connection-checkout assertion, no latency budget, no generated-SQL
snapshot in either tier. Its `objectives[]` must not carry the N+1 or index tag
— that belongs to `MER-304` alone. The words *round trip*, *N+1*, *batch* and
*index* appear nowhere in its body, criteria or standup copy.

#### 9.2 `MER-804` (the cache) → `MER-904` (the 3.1× bill)

**Why it isn't wired.** `MER-804` builds a *local result cache keyed by
content*. `MER-904` is about a **provider-side prompt-prefix cache** — a
different mechanism with a different failure mode. The 0.71 hit ratio and the
`llm_cache_hit_ratio` panel `MER-904` reads have no origin.

**Ship this, with three mandatory conditions.** `MER-804` establishes both
layers and a documented prefix-ordering contract, written as a **two-column
taxonomy**, exactly as vendor guidance actually reads:

| Above the breakpoint — *instructs the model* | Below — *derived from this request* |
|---|---|
| role and task, field glossary, output schema and version, exemplars, abstain rules | tenant id, claim id, loss date, retrieved chunks, document text |

Tenant purity is stated only as the *reason* for the lower column — the
provider's prompt cache is keyed to our API key, not to a tenant. **Deliberately
no third category** for per-request non-tenant values. That taxonomy is correct,
it is what every prompt-caching doc says, and it is incomplete in precisely the
way that bites.

1. Add one `MER-903` **visible** test, justified purely on security and silent
   on cost: *the fencing instruction must name the per-request delimiter it
   fences with* — which is true, since a random delimiter the model was never
   told about defends nothing. Instruction and token become inseparable, so the
   token must go above the breakpoint. **Without this the payoff misfires for
   every learner who placed the token sensibly.**
2. Take the ceiling off the optimistic estimate: estimate worst-case, charge
   from actual `usage`, re-check post-response. As proposed it was a planted bug
   that fails correct learners.
3. Rebalance the tiers — four of six proposed new hidden tests were restatements
   of visible criteria.

#### 9.3 `MER-803` / `MER-903` — the contradiction

**This one is not a missing setup, it's a conflict.** The arc says the poisoned
PDF's injected tool call reaches another tenant's policy documents via the
retrieval connection. But closing exactly that path is `MER-803`'s job, and its
hidden test enforces it: *"the top-k query ran on a pooled connection with no
`SET LOCAL app.tenant_id`."* A learner who passed `MER-803` has already closed
it, so the sprint-9 lesson has no cause.

**The tickets are right and the arc prose is wrong.** `MER-903`'s own first
hidden test already names the true path — *"the injection is blocked on the HTTP
path and honoured on the SQS consumer path, which never sets a tenant context."*

**Rejected first draft:** a re-entrancy guard on `withTenant`. Fires for one of
four correct sprint-8 implementations, and depends on a sprint-7 artefact
nobody named.

**Ship this instead.** One acceptance criterion on `MER-803`:

> Retrieval is exposed to the extractor as a **callable tool**, and because
> extraction has run off the request path since `MER-603`, there is no ambient
> request identity for it to read — so the tool's scope is bound by its **call
> site**, from the job envelope's tenant.

Correct at sprint 8, and correct for a reason the ticket can state out loud.
The tool contract then genuinely carries a tenant/document-scope parameter,
filled by trusted code, in *every* correct solution rather than one branch of
four.

Sprint 9's payoff becomes the real lesson rather than defence-in-depth:
`MER-802` gave the model constrained JSON *output*; `MER-803` gives it tool
*calls*; and the poisoned PDF is the first untrusted thing to reach that
surface. **Authorization was never in the model's control surface** — what the
document gets to do is choose *arguments*, not *scope*.

Fix the arc sentence wherever it appears: the payoff is
`S6 MER-603 consumer tenant seam → S9 MER-903`, not "S9's injection reaching
S8's retrieval."

#### 9.4 `MER-104` (the spec) → `MER-204` (two live wire versions)

**Why it isn't wired.** Sprint 1 builds no object a second wire version can
collide with, and `MER-204` was authored as a *parallel* mechanism
(`Accept`-header negotiation) rather than an extension. The learner experiences
their sprint-1 work as superseded, not as foundation.

**Rejected first draft:** collide on the **response body**, keyed by media type.
The skeptic killed it, and the reasoning generalises: media-typed response
bodies are the one thing OAS 3.1 handles natively, so two versions cost one
extra key in a map. To make sprint 2 solvable the draft had to pre-build a
two-key registry in sprint 1 — and then needed that same registry to be *absent*
for sprint 2 to break. It also telegraphed, via an acceptance criterion
("never a hardcoded `application/json`") that is unfalsifiable in a sprint with
exactly one content type and therefore exists only to shape the repo for later.

**Ship this instead — collide on operation `parameters`.** One path plus one
method has exactly **one** `parameters` array, and no amount of content
negotiation gives it a second. OAS genuinely cannot express two versions there.

- `MER-104`'s **compatibility descriptor** becomes the single source of which
  query parameters exist, which are deprecated, and when they sunset. The
  runtime stamps `Deprecation` / `Sunset` from it; the generator emits
  `parameters` with `deprecated: true` and the same sunset date from the same
  value. Unambiguously correct sprint-1 engineering, and falsifiable *inside*
  sprint 1 — hidden test: *"Escaped: the document publishes a sunset date the
  response headers never promised."*
- In `MER-204`, **v2 drops `page` / `per_page` outright while v1 keeps them
  under the shim.** Now the generator is genuinely stuck: one `parameters` array
  for `GET /claims`, two true answers. Every correct sprint-1 implementation
  hits it, regardless of whether the learner negotiated by vendor media type or
  media-type parameter. No `setup.diff` normalisation needed — **the code that
  bites them is their own.**

Keep from the first draft: the body paragraph, the bidirectional route/path
criterion, the response-body-validation criterion, the ban on golden-snapshot
equality, and the rubric change keying off whether the learner's own gate can
actually fail. Those improve `MER-104` whether or not the payoff ever fires.

**Two riders, both load-bearing:**

1. **State default-to-v1 as an explicit `MER-204` acceptance criterion** —
   clients who send nothing keep receiving what they received before. Every
   sprint-1 test sends no `Accept` header, so the entire regression column hangs
   on this rule, and it is currently asserted only inside a hidden test. A
   learner who reasonably makes v2 the default takes a red across all of sprint
   1 for a requirement no tier ever stated. That is exactly the violation §4
   exists to catch.
2. **`MER-204`'s v1 money serializer survives unchanged.** It is what puts a
   float back on the wire, and `MER-205`'s audit-hash payoff — which already
   works — detects it. Re-centering `MER-204` on the spec generator must not
   make that collateral damage.

#### 9.5 The payoffs that already work — do not disturb them

Eight are wired correctly and are load-bearing. Touch them only with a reason:

| Setup | Payoff |
|---|---|
| `MER-403` retry bounded by persisted `attempt_count` | `MER-1005` — the lease-reclaim path resets it, nothing reaches the DLQ, the loop feeds itself and pages the learner at 02:14 |
| `MER-801` "found nothing" as a typed outcome | `MER-902` — prompt v2's "populate every field" destroys abstention on 10 of 120 cases; `policy.ts` coerces the fabricated null deductible to $0 |
| `MER-302`/`MER-303` transaction-scoped `set_config` as a named defect class | `MER-402`, `MER-503`, `MER-701`, `MER-803` — the same defect in four disguises |
| `MER-203` byte-stable canonical encoder | `MER-401` — `JSON.stringify` rejects a reordered but identical body as a 409 |
| `MER-202` DST-safe calendar arithmetic | `MER-403` — `next_attempt_at` in local time holds deliveries an extra hour across the transition |
| `MER-503` strict exact-match `assertSchemaVersion` | `MER-505`, then `MER-604` — rollback restores the image but not the schema |
| `MER-703`/`MER-704` latency histogram and burn-rate alerts | `MER-805` — the streaming PR redefines the histogram to time-to-first-token under the same metric name, so the alert stops firing on a 9s p99 |
| `MER-201` cent-exact integer minor units | `MER-1003` — money through `jsonb_build_object` returns `8675.309999999999` and trailing zeros drop, while sprint 2's test still passes because it compares values, not text |

---

## Sprint 1 — Contracts — make the boundary tell the truth

**Topic:** TypeScript as a type system · API design & contracts  
**5 tickets · 26 points · 77 visible / 30 hidden tests · 5.0 h**

> #support-escalations, 08:41 — "Northwind got a 500 posting a claim their engineer swears is valid, and while I was checking I found 1,900 rows in `claims` with a null amount that nobody ever rejected."

**Sprint goal.** By Friday an invalid claim cannot get past the first line of a handler, every failure carries a code and a status support can quote to a partner, the list endpoint returns each claim exactly once while people are writing to it, and /openapi.json is generated from the same schema objects the server validates with.

**Tickets**

| Key | Title | Pts | AI |
|---|---|---|---|
| `MER-101` | POST /claims returns 500 on Northwind's payload | 5 | assisted |
| `MER-102` | Give the errors codes — support can't answer partners | 5 | assisted |
| `MER-103` | The claims list shows the same claim twice (and page 340 takes 9s) | 8 | assisted |
| `MER-104` | Publish a spec Northwind can hold us to | 5 | assisted |
| `MER-105` | Review: agent PR #412 "fix: unblock Northwind integration" (all green) | 3 | review-only |

**Learning objectives** — what the learner can *do* afterwards:

- Parse untrusted HTTP input from `unknown` into a domain type — discriminated union on status, no optional-everything interface — so an invalid claim cannot be represented past the first line of a handler
- Design an error taxonomy: stable machine-readable codes, correct HTTP statuses, one envelope on every path including the framework's own, a correlation id that joins response to log, and nothing internal on the wire
- Convert an endpoint from offset to keyset pagination with the tiebreak, the bounded limit, the composite index and the filter binding — and defend "cursor, not offset" out loud with the duplicate-and-skip mechanism, not a preference
- Generate an OpenAPI 3.1 document from the same schema objects the server validates with, serve it, and gate it with a contract test that fails the build when a route drifts from the spec
- Ship a breaking change safely: recognise the compatibility break your own tightening caused, and deprecate with `Deprecation`/`Sunset` headers instead of deleting
- Review a green AI-authored PR, name the defect class in one sentence, reject it with the failing test that stops it re-landing, and push back on a confident review comment that is wrong

**Interview signal.** You can put up a diff where the type system, the HTTP status codes and the published spec all say the same thing, and answer "why cursor, not offset?", "why 422, not 400?" and "why did you reject that PR?" with mechanisms instead of preferences.

---

## Sprint 2 — Money & Time

**Topic:** Serialization & data contracts  
**5 tickets · 26 points · 127 visible / 32 hidden tests · 5.0 h**

> #finance-ops, 08:41 — "Reconciliation is out by $412.19 across 40,317 claims this month, and it's a different set of claims every time we re-run the export."

**Sprint goal.** Give every amount and every date in Meridian exactly one meaning — an exact decimal with a currency, a civil date with a zone, and one canonical hash over both — without breaking the two insurers still on v1.

**Tickets**

| Key | Title | Pts | AI |
|---|---|---|---|
| `MER-201` | Payout totals drift by a cent and Finance has the spreadsheet | 8 | assisted |
| `MER-202` | Claims filed on the 1st keep landing in the previous month | 5 | assisted |
| `MER-203` | The audit hash disagrees with itself | 5 | review-only |
| `MER-204` | Ship the new money format without breaking the two v1 customers | 5 | assisted |
| `MER-205` | Compliance flags 3 in 10,000 claims as tampered | 3 | assisted |

**Learning objectives** — what the learner can *do* afterwards:

- Represent money as an exact value type carrying currency and scale, and defend that choice in review against "just call toFixed(2) at the boundary" with the specific inputs that break it.
- Confine rounding to a single half-even step and allocate a rounded total across line items so the parts still sum to the whole.
- Model date-only, instant and time-zone as three distinct types, and compute a calendar-day deadline that survives a DST transition and a :30 offset.
- Write a canonical JSON encoder whose bytes are identical across processes, locales and a Postgres jsonb round-trip, and hash it into an audit record that can actually detect tampering.
- Ship a wire format that changes the type of an existing field without breaking clients you cannot upgrade, using per-subscription version pinning and a stated rule for unknown fields in both directions.
- Trace an audit-hash mismatch back to a compatibility shim you wrote yourself, and pin a hash to the projection it covers so later fields cannot rewrite history.

**Interview signal.** Shipping this sprint proves you can answer "why not floats for money" past the 0.1 + 0.2 line — naming the exact input where toFixed(2) is wrong, where the single rounding point belongs, and how the v1 compatibility shim you shipped quietly reintroduced the float you had just removed.

---

## Sprint 3 — Tenants: make the database refuse

**Topic:** Databases, transactions & RLS  
**5 tickets · 26 points · 47 visible / 39 hidden tests · 6.7 h**

> SUP-2291 · P1 · escalated 07:41 from Continental's ops lead: "Why is there a Bekins Van Lines claim in my queue? I opened it. I read the adjuster's notes."

**Sprint goal.** Move tenant isolation out of the WHERE clauses people have to remember to write and into Postgres itself — then find and fix the three bills that move comes with: a pooled-connection context leak, an N+1 you created, and a check-then-insert race the default isolation level was always permitting.

**Tickets**

| Key | Title | Pts | AI |
|---|---|---|---|
| `MER-301` | Continental can see Bekins' claims | 3 | assisted |
| `MER-302` | Make the database refuse | 8 | assisted |
| `MER-303` | PR #418 — fix(db): reset tenant context on connection release | 5 | review-only |
| `MER-304` | Claims list is 4.2s for Continental since Tuesday's deploy | 5 | assisted |
| `MER-305` | CX-88431 was extracted and billed twice | 5 | unassisted |

**Learning objectives** — what the learner can *do* afterwards:

- Write and test a Postgres row-level security policy end to end — ENABLE plus FORCE, USING plus WITH CHECK, across parent and child tables, with a least-privilege application role that is not the table's owner.
- Scope tenant context to a transaction using set_config(..., true) and prove, with a two-tenant pool of size one, that a released connection cannot carry that context into the next request.
- Diagnose an N+1 introduced by your own correctness fix using query-count assertions and EXPLAIN, and design a composite index whose column order matches the pagination cursor's ORDER BY.
- Name the exact interleaving READ COMMITTED permits in a check-then-insert and close it with a tenant-scoped unique constraint rather than a bigger lock or a longer transaction.
- Ship an index migration against a live table without taking an ACCESS EXCLUSIVE lock, and handle the INVALID index a failed CONCURRENTLY build leaves behind.
- Reject a plausible concurrency fix in code review and state, in one paragraph, the precise window it leaves open and why the reviewer's reasoning about connection exclusivity does not hold.

**Interview signal.** You can be handed an unfamiliar multi-tenant Postgres schema and say out loud where the isolation boundary actually is, what happens to it when the connection goes back in the pool, what the fix costs in round trips, and which race the default isolation level is still permitting — which is most of the "design a multi-tenant SaaS backend" round and all of the follow-ups.

---

## Sprint 4 — Delivery — Pay It Once

**Topic:** Concurrency & distributed correctness  
**5 tickets · 26 points · 59 visible / 36 hidden tests · 7.5 h**

> Northwind Mutual, 08:41: "You sent us two payment authorizations for CLM-8842, 412ms apart, identical amounts. Finance has already cut both cheques. Who do I talk to?"

**Sprint goal.** Meridian paid a claim twice last Thursday: by the end of this sprint intake is idempotent, every outbound webhook goes through a transactional outbox with a retry policy you could defend in an incident review, and the ordering guarantee we actually offer is written down and enforced.

**Tickets**

| Key | Title | Pts | AI |
|---|---|---|---|
| `MER-401` | Duplicate payment authorization sent to Northwind for CLM-8842 | 5 | assisted |
| `MER-402` | Reconciliation: 61 processed claims with no delivery, 3 deliveries for claims that 404 | 8 | assisted |
| `MER-403` | Northwind rate-limited us — "your retries hit us every 5 seconds" | 5 | assisted |
| `MER-404` | Review: agent PR #418 — sign outbound webhooks, reject replays | 3 | review-only |
| `MER-405` | CLM-9001 shows as paid, then under_review — and delivery p95 is 40 minutes | 5 | assisted |

**Learning objectives** — what the learner can *do* afterwards:

- Make a POST endpoint idempotent under client retries: persist the key with a canonical body fingerprint scoped to the tenant, replay the original status and body verbatim, and return 409 when the same key arrives with a different body.
- Implement a transactional outbox — the business row and its event committed together — and drain it with FOR UPDATE SKIP LOCKED leases that expire, so two replicas never double-send and a killed poller never parks work.
- Design a retry policy you can defend in an incident review: classify retryable versus terminal failures, honour Retry-After, cap the exponential before applying jitter, persist attempt state, and dead-letter with the payload intact.
- Verify a webhook correctly — HMAC over the exact transmitted bytes with the timestamp inside the signed base string, constant-time comparison, a replay window backed by a seen-id cache, and dual-key verification through a secret rotation.
- State an ordering guarantee as per-claim rather than global, enforce it with lanes, and demonstrate that one dead destination cannot delay an unrelated tenant's deliveries.
- Reject a green, plausible, agent-authored security PR and name the specific defect its passing tests cannot reach.

**Interview signal.** Shipping this sprint means you can answer "how do you make sure we never pay twice" with a system you have actually built — idempotency semantics including the 409, an outbox with expiring SKIP LOCKED leases, capped backoff with jitter, a DLQ and per-claim ordering — and can say precisely which guarantee is at-least-once and what obligation that pushes onto the receiver.

---

## Sprint 5 — Parity — Works on My Machine

**Topic:** Containers & environment parity  
**5 tickets · 28 points · 71 visible / 44 hidden tests · 3.5 h**

> [#incident-staging 09:14] deploy went green, all six replicas reported healthy for eleven minutes, and every webhook we sent in that window came back `invalid_signature` — Priya: "works on my machine, I just run it with tsx".

**Sprint goal.** Ship one image that behaves the same everywhere it runs: config validated once at boot, health signals that are able to say no, a runtime image under 300 MB that stops when you ask it to, and migrations that survive three replicas booting in the same second.

**Tickets**

| Key | Title | Pts | AI |
|---|---|---|---|
| `MER-501` | Staging signed eleven minutes of webhooks with the dev key | 5 | assisted |
| `MER-502` | 1.41 GB image, 9-minute build, and `docker stop` always takes the full ten seconds | 5 | assisted |
| `MER-503` | /healthz returned 200 for the entire incident | 5 | assisted |
| `MER-504` | Two replicas applied 0007 twice and a third died mid-ALTER | 8 | assisted |
| `MER-505` | Review: agent PR "feat: real local parity in one command" | 5 | review-only |

**Learning objectives** — what the learner can *do* afterwards:

- Write a multi-stage Dockerfile that ships a non-root, dependency-pruned runtime image, and take a 1.4 GB image under 300 MB without changing what it runs.
- Validate every environment variable once at boot against a typed schema, so a missing secret fails the deploy with a non-zero exit instead of silently signing webhooks with a dev key.
- Split liveness from readiness so a dependency outage removes replicas from rotation instead of restarting the fleet, and prove the difference with a paused database.
- Diagnose a container that gets SIGKILLed instead of draining, and order shutdown so in-flight webhook deliveries are not duplicated by the stop.
- Make schema migrations safe on a multi-replica boot using a Postgres advisory lock, a transactional migration ledger, and a release-phase runner separated from application start.
- Review an agent-authored deploy change and reject the parts that let local and production diverge — including the rollback the change quietly makes impossible.

**Interview signal.** Shipping this sprint means you can answer the three questions that end most infrastructure screens — why is your image that big, what does your healthcheck actually check, and what happens when three replicas run your migrations at once — with a diff rather than a definition.

---

## Sprint 6 — Ship it

**Topic:** Cloud & deployment (AWS)  
**5 tickets · 28 points · 86 visible / 38 hidden tests · 6.3 h**

> Slack, #inc-uploads, 03:12 — "Northwind's 41 MB PDF 504s every single time and the api pod OOMKilled twice tonight; also while I was in there, the key that uploads it is a 412-day-old AKIA in the task definition and it can write any bucket in the account."

**Sprint goal.** Get Meridian off long-lived AWS keys and out of the upload path — presigned uploads, a real SQS consumer, two scoped IAM roles, secrets in a rotation-safe provider, and a blue/green release with a rollback you have actually executed — and then read the bill your own week of work generated.

**Tickets**

| Key | Title | Pts | AI |
|---|---|---|---|
| `MER-601` | Northwind's 41 MB PDF 504s on upload | 5 | assisted |
| `MER-602` | SEC-2211: the API role can write every bucket in the account | 5 | assisted |
| `MER-603` | Move extraction onto SQS (staging is extracting the same claim four times) | 8 | assisted |
| `MER-604` | Review PR #418: blue/green deploy + rollback (agent-authored, CI green) | 5 | review-only |
| `MER-605` | AWS was $180/mo. It is $4,900 in nine days and it is not the LLM. | 5 | unassisted |

**Learning objectives** — what the learner can *do* afterwards:

- Move an upload out of your API's request path with a presigned S3 upload scoped to one tenant, one key, one content type and one size ceiling, and verified server-side before it counts as received.
- Write an IAM policy from the application's actual call sites — two roles, no wildcard actions, no `Resource: "*"`, KMS included — and prove it with a policy-simulation test that runs in CI.
- Operate a long-lived SQS consumer correctly under at-least-once delivery: visibility timeout matched to p99, heartbeat extension with a ceiling, partial batch deletes, DLQ redrive, and a SIGTERM drain that releases in-flight work.
- Get every secret out of the environment and out of the image into a cached, rotation-safe provider, and explain why an ECS `environment` block is not a secret store.
- Ship a blue/green release with an expand-then-contract migration and execute the rollback under live traffic, then state which failure modes a rollback cannot fix.
- Read an AWS cost-and-usage export and attribute a 27x bill increase to specific lines of your own code, then bring it down without deleting the observability.

**Interview signal.** You can be handed an AWS account with a wildcard role, a queue nobody trusts and a bill nobody understands, and come back with two scoped policies, a consumer that survives a deploy, a rollback you have actually run, and a cost attribution per line item — the whole distance between "has used AWS" and "has operated on AWS".

---

## Sprint 7 — When It Breaks

**Topic:** Observability & operations  
**5 tickets · 19 points · 85 visible / 34 hidden tests · 6.7 h**

> #war-room, Tue 14:38 — "p99 on POST /claims went 380ms → 2.1s at 14:05 and it has not come back. Rico grabbed one trace before the tab died: it's a single 2.1s span called `POST /claims` with nothing inside it. Logs for that minute are 40-line pretty-printed blobs with no claim id. Nobody can tell me if this is us or Postgres."

**Sprint goal.** Make Meridian explain itself under load: request-scoped structured logs, trace context that survives the queue boundary, an honest latency signal, an SLO with alerts that fire once — and close the 14:05 incident with a review that would actually prevent it.

**Tickets**

| Key | Title | Pts | AI |
|---|---|---|---|
| `MER-701` | The logs from 14:05 are unusable — fix the logger before we do this again | 3 | assisted |
| `MER-702` | A delivered webhook and the claim that produced it are in two different traces | 5 | assisted |
| `MER-703` | Find the 14:05 regression and make it reproducible | 5 | unassisted |
| `MER-704` | Contract says 99.9% — turn that into something that can page us | 3 | assisted |
| `MER-705` | Sign off the incident review before Friday | 3 | review-only |

**Learning objectives** — what the learner can *do* afterwards:

- Instrument a Fastify service with request-scoped structured logs carrying trace, tenant and claim identity, without leaking PII or letting one request's context bleed into another's under concurrency.
- Propagate W3C trace context across an asynchronous boundary — HTTP request to outbox row to SQS message to delivery worker — so a claim and its retried webhooks read as one causal story instead of thousands of orphan traces.
- Read a distributed trace to locate a p99 regression that lives in the gaps between spans, and prove the diagnosis with a test that is red before the fix and green after.
- Separate wait time from service time and instrument both, including event-loop delay measured with a clock that starvation cannot stop.
- Turn '99.9% uptime' into a written SLI, an error budget and multi-window burn-rate alerts, then replay those alerts against real incident data to show they fire for the incident and not for the quiet week.
- Review an AI-drafted postmortem and rewrite it so it names systemic causes rather than a person or a trigger, and attaches every action item to a test or a named owner.

**Interview signal.** Handed a trace and a dashboard, you can say which layer the latency is in, defend the SLI and burn-rate thresholds you chose, and point at the test that turns red if the regression comes back — which is the whole content of an SRE or senior-backend debugging round.

---

## Sprint 8 — The model

**Topic:** AI engineering in production  
**5 tickets · 34 points · 60 visible / 34 hidden tests · 6.7 h**

> #claims-escalations — Northwind's lead adjuster: "the total-loss Camry came back at $0.00 and your webhook says `completed`, so we paid it. How many of the other 900 are like that?"

**Sprint goal.** Replace the regex extractor with a model call you can constrain, retrieve against, cap, cache and stream — without letting one claim be paid on a number the system cannot explain, cannot reproduce, or cannot afford.

**Tickets**

| Key | Title | Pts | AI |
|---|---|---|---|
| `MER-801` | Extraction has no way to say "I don't know" | 5 | assisted |
| `MER-802` | Use the model (Northwind churn risk) | 8 | assisted |
| `MER-803` | The deductible is always $500 | 8 | assisted |
| `MER-804` | $41k in nine days | 8 | assisted |
| `MER-805` | Review: PR #418 — stream extraction results (agent-authored) | 5 | review-only |

**Learning objectives** — what the learner can *do* afterwards:

- Put an LLM behind a replayable seam so the entire extraction path runs in CI with no network and no provider key, and a model or prompt change shows up as a diff instead of a surprise
- Constrain model output with a JSON Schema generated from the same source the code validates against, and handle schema-invalid, timed-out and rate-limited responses as three distinct typed outcomes rather than one catch block
- Build tenant-scoped retrieval over policy documents that cites the chunks it used and resolves the revision in force on the loss date, not the newest one
- Enforce a hard cost-per-claim ceiling and a per-tenant budget before the spend happens, and account for tokens burned on repair turns, aborted streams and cache hits
- Derive a cache key from everything the answer depends on — document bytes, prompt hash, schema version, model and decoding params, retrieved chunk revisions — and explain why a semantic near-match is not an extraction match
- Review a streaming PR that is green, fast and wrong, and name which of its changes produce a wrong payout, a silent bill and an SLO alert that will never fire again

**Interview signal.** You can answer "how would you put an LLM in production" with a cost ceiling, a cache key, a fallback path and a replayable seam instead of a prompt — which is the whole difference between an engineer who has shipped a model and one who has called an API.

---

## Sprint 9 — Trust it — the eval set and the poisoned PDF

**Topic:** Verifying AI — evals & injection defence  
**5 tickets · 26 points · 63 visible / 31 hidden tests · 6.5 h**

> Slack, #meridian-eng, Monday 09:12 — Priya (VP Eng): "We shipped the new extraction prompt on Tuesday. Northwind's ops lead says deductibles are wrong more often now. Our dashboard says 99.2%. Which one is lying?"

**Sprint goal.** Make every claim that "the extractor got better" falsifiable, and make a document that tells the model what to do unable to reach another tenant's data.

**Tickets**

| Key | Title | Pts | AI |
|---|---|---|---|
| `MER-901` | We cannot answer "did the extractor get better" | 5 | unassisted |
| `MER-902` | Review: prompt v2 (+1.3% accuracy) — ok to ship? | 5 | review-only |
| `MER-903` | Northwind received a claimant name that isn't theirs | 8 | assisted |
| `MER-904` | Thursday's model bill is 3.1x Wednesday's on flat volume | 3 | assisted |
| `MER-905` | Cascade sent 41 claims on Monday and got 38 results back | 5 | assisted |

**Learning objectives** — what the learner can *do* afterwards:

- Build a golden eval set with human-labelled ground truth, per-field and per-slice scoring, and deterministic offline replay — and defend why a single accuracy number cannot be a release gate.
- Block a prompt or model change that improves the headline metric while regressing a named subpopulation, using a baseline pinned to a dataset revision rather than regenerated from the run being graded.
- Defend an LLM pipeline against prompt injection by removing authorization from the model's control surface, fencing untrusted input as data, and validating output before it leaves via webhook, log, or error message.
- Trace a 3x cost and latency regression to a broken prompt-cache prefix and repair it without weakening the security control that caused it or leaking one tenant's cached context to another.
- Design a rejected extraction as a first-class outcome — tenant-scoped, non-retryable, published through the outbox, and observable — instead of a claim that silently disappears.
- Review an agent-authored PR that is green on every existing test, state the verdict with evidence, and write the test that turns it red.

**Interview signal.** Shipping this sprint means you can answer "how do you know the model got better?" with a dataset revision, a per-slice gate and a change you blocked, and answer "how would you stop prompt injection?" with a tool contract that never let the model pick the tenant — the difference between having read about evals and having run one.

---

## Sprint 10 — The Agent's PR

**Topic:** Verifying AI — reviewing the agent's PR  
**5 tickets · 24 points · 58 visible / 29 hidden tests · 4.3 h**

> [#eng-meridian 07:52, Priya (EM)] the agent burned the whole backlog down overnight — 3 PRs, CI green on all three, I'd like them in before standup. can you rubber-stamp? 🙏

**Sprint goal.** Three agent-authored PRs are green and waiting on you: merge the one that is right, prove the two that are not, build the CI gates that would have turned them red — and then take the 2am page whose root cause is the retry policy you wrote in sprint 4.

**Tickets**

| Key | Title | Pts | AI |
|---|---|---|---|
| `MER-1001` | Review the three overnight agent PRs before standup | 3 | review-only |
| `MER-1002` | Outbox drain is 40 minutes behind the delivery SLO | 5 | assisted |
| `MER-1003` | Consolidate payout amount and currency — properly this time | 5 | assisted |
| `MER-1004` | CI was green on all three. Make it able to say no. | 3 | unassisted |
| `MER-1005` | P1 02:14 — deliveries to Northwind have stopped | 8 | assisted |

**Learning objectives** — what the learner can *do* afterwards:

- Review an agent-authored pull request that has green CI and return a defensible verdict — approve, reject, or request changes — with a repro test that fails on the branch and passes on main, instead of a vague 'this looks risky'.
- Diagnose a concurrency defect that only manifests across more than one process, and pin it in CI with a multi-worker harness that reproduces it deterministically.
- Rewrite a destructive schema change as expand / backfill / contract so it stays reversible and non-blocking while the previous version of the application is still serving traffic.
- Build the CI gates that make an entire class of unsafe change fail — a migration-safety check and a queue drain-conformance harness — including the baseline and the skip-loudly behaviour that keep a gate alive past its first week.
- Run a P1 from page to postmortem: mitigate first, separate the trigger from the root cause, bound retries by an absolute deadline rather than an attempt count, and ship the regression test that makes the incident unrepeatable.
- Push back on a confident, plausible, wrong review comment and articulate why — why 'a single UPDATE is atomic' is not exactly-once, and why raising a timeout during a P1 hides a feedback loop instead of breaking it.

**Interview signal.** In the AI-PR-review round that is now replacing the take-home, you can be handed three green diffs and say which one ships, name the defect class in the other two, and hand back the test that proves it — and then explain how your own retry policy paged you and what you changed so it never can again.

---

# Sprint Labs — product spec

A new surface for CodeSparring, sitting beside Case Labs and Mock Rounds.

**Case Labs** = one scenario, one sitting.
**Mock Rounds** = one interview, scored.
**Sprint Labs** = you join a real codebase and ship tickets for ten sprints.
The repo remembers everything you did, and sprint 9 breaks the code you wrote
in sprint 4.

| Document | What it holds |
|---|---|
| **this file** | the product: topics, flow, scoring, content model |
| [`SPRINT-PLAN.md`](SPRINT-PLAN.md) | all ten sprints, 50 tickets, learning objectives, exact counts |
| [`AGENT-CONTEXT.md`](AGENT-CONTEXT.md) | the in-workspace AI agent, indexing, and the spoiler boundary |
| [`LAB-01-sbx.md`](LAB-01-sbx.md) | the second workbook — sbx, packaged from `Nikayel/finance-agent` |
| [`AGENT-PROMPT.md`](AGENT-PROMPT.md) | the build brief to hand a coding agent |

---

## 1. The thesis

Nobody is going to be hired to type code. They are going to be hired to decide
what should exist, to catch the plausible-but-wrong thing a model produced, and
to be the person who is accountable when it's wrong at 2am.

Every study says the same thing: AI assistants are ~4× faster and ship ~10×
riskier code where review is weak, and only ~30% of AI suggestions are accepted
unmodified. "Review this AI-written PR" is already appearing as an interview
round. So the product stance is:

> **AI is allowed. AI is often mandatory. The grade is on the state of the
> system when you're done, not on who typed it.**

That is exactly the argument the sbx lab makes about itself, applied to the
whole platform: *AI-written code is worth exactly as much as the adversarial
verification you put it through.*

---

## 2. The ten topics

Ranked by the intersection of (a) what job postings require, (b) what survives
when the model writes the first draft, and (c) what is *gradeable by a machine*.

| # | Topic | Why it's on the list | Sprint |
|---|---|---|---|
| 1 | **TypeScript as a type system** — discriminated unions, `unknown` vs `any`, narrowing, generics at boundaries, making illegal states unrepresentable | In ~30% of all SWE postings. And the #1 thing agents get lazily wrong: `any` at the seam. | S1 |
| 2 | **API design & contracts** — REST semantics, idempotent verbs, error taxonomy, cursor vs offset pagination, versioning, OpenAPI as source of truth | The most common real ticket in the industry. Cursor-vs-offset *with a reason* is a standard interview probe. | S1 |
| 3 | **Serialization & data contracts** — schema validation, decimal money, timezones, canonical encoding, backward/forward compatibility, envelope versioning | The bug class that costs the most money and is the least visible in review. Floats-for-money is the canonical example. | S2 |
| 4 | **Databases, transactions & RLS** — indexes, N+1, isolation levels, migrations, and multi-tenant isolation enforced in Postgres | Multi-tenant SaaS is the default architecture; Postgres' default isolation level permits race conditions people don't know about. RLS is the modern answer and almost nobody has written a policy. | S3 |
| 5 | **Concurrency & distributed correctness** — idempotency keys, at-least-once delivery, retries with jitter, outbox, DLQs, ordering, locks | "You cannot charge the card twice" is the most-asked backend question there is. | S4 |
| 6 | **Containers & environment parity** — Docker multi-stage, image size, healthchecks that don't lie, compose, 12-factor config | In ~15% of postings; ~71% of cloud roles. And the "works on my machine" ticket is universally relatable. | S5 |
| 7 | **Cloud & deployment (AWS)** — S3 presigned uploads, SQS, IAM least privilege, secrets, IaC, blue/green + rollback, cost | In ~15% of all postings and ~67% of cloud postings. IAM least-privilege is the single most common real-world security finding. | S6 |
| 8 | **Observability & operations** — structured logs, OpenTelemetry traces, metrics, SLOs, reading a flamegraph, the postmortem | When the model writes the code, debugging goes *up*, not down. This is the sprint that proves you can operate what you shipped. | S7 |
| 9 | **AI engineering in production** — structured outputs / tool calling, RAG, streaming, cost & latency budgets, caching | RAG appears in ~65% of applied-LLM listings; agent orchestration, cost optimisation and eval design top every 2026 skills list. | S8 |
| 10 | **Verifying AI** — eval sets, regression on model change, prompt-injection defence, guardrails, and reviewing an agent's PR | The meta-skill and the platform's whole differentiator. Nobody else grades this. | S9–S10 |

Security is not a separate topic on purpose — it's embedded where it actually
occurs: tenant isolation (S3), IAM (S6), injection and exfiltration (S9).

---

## 3. The codebase: Meridian

One product across all ten sprints, so the learner accumulates a codebase
instead of a folder of exercises.

> **Meridian** is a multi-tenant API for AI claims intake. Insurers POST claim
> documents; Meridian extracts structured fields with an LLM, applies policy
> rules, and posts results back via webhooks. Money, PII, and other people's
> tenants are all on the line — which is why every topic above has a
> non-contrived reason to appear.

Stack: TypeScript · Fastify · Postgres (+RLS) · Redis/SQS · Docker · AWS ·
OpenTelemetry · an LLM provider behind a seam that can be replayed offline.

You join at sprint 1 as the third engineer. The code you inherit is *plausible
and wrong* — the kind of thing a competent agent produces in an afternoon:
`strict: false` in `tsconfig.json`, `no-explicit-any` switched off with a
comment saying it was too noisy, money as a float rounded half-up, tenant
isolation as a hand-written `WHERE tenant_id = $1` that one query forgets,
a webhook row written as `delivered` *before* the HTTP call, an "outbox" that
is an in-process array on a `setInterval`, and a `/health` that returns `ok`
without touching Postgres.

| | Seed (day one) | Finished (after S10) |
|---|---|---|
| Files | 61 | ~65 source + 25 infra |
| Non-test lines | ~1,708 | ~12,000 |
| Migrations | 3 | 30 |
| Test files | 8 | 220 |
| Test cases | 19 | 1,080 |

### The arc

| # | Sprint | The inciting ticket |
|---|---|---|
| 1 | **Contracts** | *"Northwind got a 500 posting a claim their engineer swears is valid, and I found 1,900 rows with a null amount that nobody ever rejected."* |
| 2 | **Money & time** | *"Reconciliation is out by $412.19 across 40,317 claims this month, and it's a different set of claims every time we run it."* |
| 3 | **Tenants** | `SUP-2291 · P1` — *"Continental can see Bekins' claims."* |
| 4 | **Delivery** | *"You sent us two payment authorizations for CLM-8842."* |
| 5 | **Parity** | *"Deploy went green, all six replicas healthy — and staging signed eleven minutes of webhooks with the dev key."* |
| 6 | **Ship it** | *"Northwind's 41 MB PDF 504s on upload"* — and `SEC-2211`: the API role can write every bucket in the account. |
| 7 | **When it breaks** | *"p99 on POST /claims went 380ms → 2.1s at 14:05 and the logs from 14:05 are unusable."* |
| 8 | **The model** | *"The total-loss Camry came back at $0.00 and your webhook says `completed`."* |
| 9 | **Trust it** | *"We shipped the new extraction prompt Tuesday. Accuracy is up 1.3%. Northwind says deductibles are worse."* — and page 3 of an uploaded PDF is talking to the extractor. |
| 10 | **The agent's PR** | *"The agent burned the whole backlog down overnight. Three PRs, all green, waiting on you."* |

Sprint 9's injection reaches the extractor through the **SQS consumer's missing
tenant context** — the seam sprint 6 opened when it moved extraction off the
request path — not through sprint 8's retrieval connection, which sprint 8's own
hidden test forces the learner to close. See `SPRINT-PLAN.md` §9.3.

**Capstone incident:** `P1 02:14` — deliveries to Northwind have stopped. Root
cause is the retry policy *the learner wrote in sprint 4*: the lease-reclaim
path resets `attempt_count`, so nothing ever reaches the DLQ and the loop feeds
itself. Fixed with an absolute deadline measured from first attempt. Nothing
teaches ownership like your own code paging you.

Full ticket-level detail, per-sprint learning objectives and exact counts are in
[`SPRINT-PLAN.md`](SPRINT-PLAN.md).

---

## 4. The learner flow

```
  ┌── STANDUP ──┐   ┌─── BOARD ───┐   ┌── TICKET ──┐   ┌── WORK ──┐
  │ sprint goal │ → │ MER-101 ... │ → │ the ask,   │ → │ editor + │
  │ arch map    │   │ TODO/DOING/ │   │ acceptance │   │ terminal │
  │ what broke  │   │ REVIEW/DONE │   │ criteria   │   │ AI mode  │
  └─────────────┘   └─────────────┘   └────────────┘   └────┬─────┘
                                                            ▼
  ┌── RETRO ──┐   ┌── REVIEW ──┐   ┌────────── SUBMIT / CI ──────────┐
  │ your diff │ ← │ bot leaves │ ← │ visible → hidden → regression → │
  │ vs senior │   │ 3 comments,│   │ adversary. escaped defects are  │
  │ + scores  │   │ one wrong  │   │ named, not just counted.        │
  └─────┬─────┘   └────────────┘   └─────────────────────────────────┘
        └──► next ticket (codebase state carries forward)
```

**Ticket view.** Written like a real Jira ticket, not an exercise: a bug report
with a wrong repro, a PM's ambiguous ask, a pasted Slack thread, a linked
design doc. **The files to touch are never listed** — locating the change is
half the skill, and it's the half every other platform removes.

**Four gates on submit.** This is the machinery that makes it gradeable:

1. **Visible tests** — the ticket's stated definition of done. Run them locally
   as often as you like. Executed in the learner's own sandbox, so failures come
   back with full stacks and assertion diffs.
2. **Hidden tests** — the edge cases a careful engineer would have thought of.
   Revealed *after* submit, by name: *"Escaped: duplicate delivery inside the
   retry window."* This is the headline metric. Executed in a **separate grading
   container** that returns booleans and nothing else — see
   [`AGENT-CONTEXT.md` §4](AGENT-CONTEXT.md), which is where the hard part of
   this product lives.
3. **Regression** — every previous sprint's suite. Sprint 6 can break sprint 3.
   This is the single thing that makes it feel like a codebase.
4. **Adversary** *(26 of the 50 tickets)* — a hostile actor runs against your
   implementation: replayed webhooks, a cross-tenant token, clock skew, a
   poisoned PDF. Inherited straight from the sbx lab's design.

**Review round.** A bot reviewer leaves comments on your PR. One is deliberately
wrong. Accepting it costs Communication points; pushing back with a reason earns
them. *(Scored under `review-only` policy only — under `assisted`, an agent
solves it by reasoning alone. See §5.)*

**Retro.** Your diff beside the reference engineer's, the escaped defects named,
and one paragraph on what a senior would have done differently.

**AI policy per ticket** — declared on the ticket, enforced as *capability*, not
as instruction:

- `assisted` (35 tickets) — full agent. Most tickets.
- `unassisted` (5 tickets) — no agent session is issued at all, and the ticket
  states *why* in its own voice.
- `review-only` (10 tickets) — an agent already wrote the diff. Your job is to
  decide what ships.

---

## 5. Scoring

Reuse the existing four rubric dimensions so Sprint Labs feeds the same
readiness score as Mock Rounds, plus one that is specific to this surface:

| Dimension | Signal |
|---|---|
| Understanding | Did you touch the right files? Time-to-first-correct-edit. |
| Problem-Solving | Visible + hidden tests, first-try pass rate. |
| Code Quality | Diff size vs reference, regressions caused, lint/type gates. |
| Communication | PR description, response to the wrong review comment, postmortem. |
| **Verification** *(new)* | Did you write the test that catches your own bug? Did you refuse the bad PR? **Escaped defect rate.** |

**Headline metric: escaped defect rate** — hidden tests failed ÷ hidden tests
run. It's the one number that maps to real engineering reputation, it's
brandable, and it goes down visibly over ten sprints.

### Metric integrity — four rules that keep the number meaning something

A strong model reading the ticket and the visible tests will pass a large
fraction of the hidden tests cold. So the score has to be built to survive that:

1. **Escaped-defect rate splits by `ai_policy`.** Only `unassisted` and
   `review-only` attempts feed the readiness score and the shareable artifact.
   Assisted rate is rendered as labelled formative feedback and nothing else.
   One column on `TicketAttempt`. The floor of ≥1 unassisted ticket per sprint
   plus the S10 capstone gives ~10–12 uncontaminated measurements across the arc.
2. **Score finalizes at first submission.** Escaped-defect names and
   `reference.diff` release only after finalization; re-attempts draw a
   different hidden-suite variant. Otherwise the reveal *is* the answer key.
3. **The contamination gate** — see §6.
4. **Record the model id and version per attempt** and stamp it on the
   shareable artifact. A score from 2026 is not a score from 2028.

Surface the delta itself as a first-class number rather than hiding it:
*"Idempotency — with AI you ship this. Without it, not yet."* Calibration,
never accusation.

Progression: sprint velocity (points/sprint), per-topic mastery feeding the
existing roadmap, and a shareable **"shipped 10 sprints on Meridian"** artifact
with the escaped-defect curve. That last one is the growth loop.

---

## 6. Why authors can add workbooks without engineers

Everything above is **content as data**. One repo, one YAML tree, no code
changes to add workbook #2. This is the part to get right on day one, because
the catalog is the business.

```
workbooks/meridian/
  workbook.yaml              # id, title, topics, level, sprints[]
  repo/                      # seed codebase, committed as a real git repo
  sprints/04-delivery/
    sprint.yaml              # goal, standup copy, archMapDelta.invariants[]
    tickets/MER-401/
      ticket.md              # frontmatter (points, labels, ai_policy,
                             #   ai_policy_reason, objectives[]) + body
      setup.diff             # applied before the ticket, if state is needed
      tests/visible/         # shown, runnable locally
      tests/hidden/          # SECRET — see below
      adversary/             # optional hostile runner
      review.yaml            # SECRET — bot comments; `correct: false` on the trap
      author_brief.yaml      # SECRET — review-only: intent, per-decision
                             #   justification, concession_triggers[]
      reference.diff         # SECRET — shown at retro
      rubric.yaml            # weights + what each dimension keys off
```

**The build-time public/secret split is not optional.** A content compiler emits
a `public/` and a `secret/` bundle, and CI fails if any secret-classified field
appears in the public one. Secrets live in a **separate repository with a
separate ACL** and must never have existed in any object on any ref of the
learner's repo. This moves the guarantee from "whoever last edited the
Dockerfile" into CI.

### `lab validate` — the gate that stops the catalog rotting

A CI gate on the content repo. For every ticket:

- Apply `setup.diff`, assert visible **and** hidden tests **fail**; apply
  `reference.diff`, assert they **pass**. **A ticket whose reference solution
  doesn't go red-then-green cannot ship.** This is the sbx history gate pointed
  at your own content.
- **The contamination gate.** Run a cold, one-shot, pinned-model agent on the
  ticket body plus visible tests alone and record how many hidden tests it
  passes. **Over ~60% and the ticket cannot ship as a graded assisted ticket.**
  Replaces an estimate with a number.
- A freshly provisioned workspace contains zero git objects matching
  hidden-test signatures.
- No `setup.diff` or `MERIDIAN.md` delta for sprint N contains a hunk from an
  unsolved `reference.diff`, and no `MERIDIAN.md` line states an invariant
  asserted by an unshipped hidden test.
- `reference.diff`, `review.yaml` and `author_brief.yaml` are unreachable from
  the workspace mount.
- Every ticket maps to at least one stated learning objective, and every
  objective is tagged from the controlled concept vocabulary.
- Every migration filename in the workbook is unique and the sequence has no
  gaps; every path in `filesTouched` either exists in the seed or is created by
  an earlier sprint; `newSourceFiles` matches the computed set difference.
- Every ticket declaring a `payoffFor` carries a reviewer sign-off that the
  payoff fires for **every** correct implementation of its setup — not one
  branch, and never only for learners who ignored an acceptance criterion.
  See `SPRINT-PLAN.md` §9 for why this rule exists and what it caught.

---

## 7. Non-goals for v1

No multiplayer. No live human review. No "bring your own repo". No mobile.
No leaderboard. **No embeddings, anywhere.** Ten sprints on one codebase,
graded honestly — that's the whole v1.

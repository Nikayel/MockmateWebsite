# One-shot prompt — ship Sprint Labs

Copy everything below the rule into Claude Code / Codex at the root of the
codesparring.dev repo, **with the four spec files present in the repo or
attached.** This prompt is deliberately a pointer: the specs are the source of
truth, and duplicating them here would guarantee they drift.

```
cp docs/codesparring/{WORKBOOK-SPEC,SPRINT-PLAN,AGENT-CONTEXT,LAB-01-sbx}.md \
   <codesparring-repo>/docs/sprint-labs/
```

---

You are shipping a new product surface for **codesparring.dev** called **Sprint
Labs**. Work in a branch, commit in small atomic steps, and do not stop at the
first working slice — the acceptance checklist is the definition of done.

## 0. Read the specs first — they are the source of truth

Read all four before writing anything. Where this prompt and a spec disagree,
**the spec wins**; tell me about the disagreement rather than silently picking.

| File | What it decides |
|---|---|
| `docs/sprint-labs/WORKBOOK-SPEC.md` | the product: ten topics, the Meridian codebase, learner flow, the four submit gates, scoring and metric integrity, the content-as-data model, `lab validate` |
| `docs/sprint-labs/SPRINT-PLAN.md` | all ten sprints and 50 tickets: goals, inciting tickets, per-sprint **learning objectives**, interview signals, and exact test/point/hour counts |
| `docs/sprint-labs/AGENT-CONTEXT.md` | the in-workspace AI agent: what is and is not indexed, the four context layers, the spoiler boundary and its nine launch blockers, agent modes per `ai_policy`, the learner model, and the build order |
| `docs/sprint-labs/LAB-01-sbx.md` | workbook #2, for schema-generality checking only — do not author it in this pass |

**`AGENT-CONTEXT.md` §4 is the hard part of this product.** It is not a security
appendix. If you skip it, the product does not work, because a learner with an
agent extracts the answer key in thirty seconds. Read it before you design the
grading runner, not after.

## 1. Inventory before you build — do not assume

Before writing code, read this repo and write `docs/sprint-labs/INTEGRATION.md`
recording, with file paths:

- how **Case Labs** are modelled, stored, seeded and rendered
- how code execution / grading works today, and whether it can run a multi-file
  repo with a **persistent working tree across tickets**
- the auth/session model, the DB and ORM, routing conventions, the component
  library, the existing scoring tables and readiness score
- the existing rubric dimension names, **verbatim** — `WORKBOOK-SPEC.md` §5
  assumes Understanding / Problem-Solving / Code Quality / Communication; if the
  code says otherwise, the code wins

Then state which parts of the specs you are **reusing** and which need **new**
machinery. Reuse aggressively — Sprint Labs is a new content type on top of
existing execution and scoring, not a second platform. If the existing runner
cannot hold a persistent repo across tickets, say so explicitly and design the
smallest extension. Stop and re-read this section if you find yourself building
a parallel stack.

## 2. Build in the order given

Follow `AGENT-CONTEXT.md` §8 for the agent and grading path. Interleave the
content and UI work:

1. Schema, content compiler with the **public/secret split**, loader, migrations
2. Gate runner — **split by container per §4**, not by mount — and the scorer
3. The nine screens (`WORKBOOK-SPEC.md` §4): catalog card, standup, board,
   ticket, workspace, submit/CI, review round, retro, workbook summary
4. `lab validate` including the contamination gate — **write it before
   authoring content, not after**
5. Workspace agent v0, assisted only, with search instrumentation in the same PR

Use existing components and design tokens. Build the ticket view so it **never
lists the files to touch**.

## 3. Content to author in this pass

Author all ten sprints' `sprint.yaml` and all 50 ticket stubs **from
`SPRINT-PLAN.md`** — real titles, bodies, acceptance criteria, `ai_policy`,
`ai_policy_reason` where unassisted, and the `objectives[]` tags. The learning
objectives in that file are the point of each sprint; a ticket that maps to no
objective is a chore, and `lab validate` must reject it.

Then make **sprints 1 through 4 complete and playable end to end** — seed repo,
setup diffs, visible tests, hidden tests, review comments, `author_brief.yaml`
for the review-only tickets, reference diffs, rubrics. Sprints 5–10 remain
authored stubs. **Four real sprints that work beat ten that don't.**

**Before authoring anything, apply `SPRINT-PLAN.md` §"Fixes to apply before
authoring".** Nine items, all found by a reconcile pass across the ten sprints,
all cheap now and expensive once 50 tickets exist. Three of them —
migration numbering, one-name-per-file, and `newSourceFiles` — are mechanical
and `lab validate` should enforce them.

§9 is the one to read closely: **the four cross-sprint payoffs the arc promises
and does not deliver.** Each has a resolved design there, along with the first
draft that was rejected and why. One of them (`MER-803` / `MER-903`) is a
contradiction rather than a gap — the earlier ticket's own hidden test forbids
the later ticket's premise, and the fix is to correct the arc prose, not the
tickets. That section also carries the authoring rule the four produced:

> A payoff must fire for **every correct implementation** of the setup, never
> for one branch and never for learners who ignored a criterion. And the setup
> must be a correct fix with a second-order cost — the learner's earlier code
> survives intact into the later sprint. That is what separates a tradeoff from
> a trap.

§9.5 lists the eight payoffs that already work. Do not disturb them; two of the
four fixes were nearly collateral damage to those.

Hidden tests must be *traps a careful engineer would anticipate*, not gotchas,
and each must carry a curated `humanName` — that name is the only thing the
learner ever sees from the grading container.

## 4. Verification bar — run these, paste real output, no claims without it

- `lab validate` green across every authored ticket, with output pasted
- Unit tests for the loader, the gate runner, the scorer, and
  `filterDirectives`
- One end-to-end test that plays `MER-101` through all four gates and the retro
- The fresh-workspace git-object scan, and the "sprint 1 learner" container grep
  for future-sprint markers
- Typecheck and lint clean
- A seed script that gets a fresh developer to a playable `MER-101` in one command

Report honestly: if something is stubbed, say it is stubbed. Do not report
completion for anything you have not run.

## 5. Non-goals — do not build these

Multiplayer. Live human review. Bring-your-own-repo. Mobile layouts.
Leaderboards. Embeddings or any similarity search. A second workbook. Anything
that changes Case Labs or Mock Rounds behaviour.

## 6. Deliverables

1. `docs/sprint-labs/INTEGRATION.md` — the inventory and reuse decisions
2. Schema, content compiler, loader, migrations
3. Gate runner and scorer, with the §4 boundary enforced in CI
4. The nine screens
5. Workspace agent v0 with search instrumentation
6. `workbooks/meridian/` — 10 sprints authored, sprints 1–4 playable
7. `lab validate` green, output pasted
8. A `README` section on authoring a workbook, aimed at a non-engineer

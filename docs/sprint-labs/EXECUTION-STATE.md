# Sprint Labs — execution state

Chief-of-staff ledger for the `sprint-labs` branch. Every wakeup of the build
loop reads this first. Specs in this directory are the source of truth
(`WORKBOOK-SPEC.md`, `SPRINT-PLAN.md`, `AGENT-CONTEXT.md`, `LAB-01-sbx.md`);
`AGENT-PROMPT.md` is the build brief. Where a spec and this repo disagree, the
repo's existing contracts win (rubric names, DB, execution machinery) and the
deviation is recorded here.

## Owner decisions (2026-08-26, asked and answered before build start)

1. **Ship target:** when the acceptance bar is green, merge to `main` + push
   (auto-deploys prod) **behind a feature flag**. `/labs` chooser + Meridian
   render only with the flag on; owner flips it after a look.
2. **Access:** Sprint 1 of Meridian is free for signed-in users; sprints 2–10
   require Pro. Submissions are always authed (standing rule: cost-bearing
   routes require sign-in).
3. **Execution: NO server-side sandbox yet.** Owner's words: keep it Python
   and JS/TS and SQL on the same machinery we have; no server side yet; the
   AI agent, coder, and interviewer must say server-side isolated grading is
   **planned for next month**, and the same message shows when a user picks a
   workbook that needs it (e.g. the sbx workbook). Also: **learning
   objectives become first-class UX** across catalog → standup → ticket →
   retro (owner flagged current objective UX as lacking).
4. **In-workspace partner (owner override of AGENT-CONTEXT §8.1):** v0 ships
   as **chat only, Sable persona as interviewer/partner** — no edit/bash
   tools. The machinery (mode enum per `ai_policy`, capability gating,
   transcript log, context layers A–D, `filterDirectives`) is built
   tool-ready so a promptable editing agent can be enabled later without
   schema change.

## The grading architecture under "client-only execution"

AGENT-CONTEXT §4's *invariant* is kept; its *mechanism* (grading container)
is adapted, honestly:

- **Visible tier** — runs in the learner's browser worker (existing runner
  architecture), full output, stacks, diffs. No secret material present.
- **Hidden / regression / adversary tiers** — also execute in the browser
  (no server compute exists), but split into two authoring shapes:
  - **IO-cases (preferred, and required for score-feeding tickets):** the
    server issues inputs at submit time; the client runs learner code and
    posts **raw outputs**; the **server compares against expected outputs it
    never ships**. The answer key never reaches the client, and a fabricated
    "pass" is impossible without actually solving the ticket.
  - **Property probes (interim):** assertion code fetched at submit, executed
    client-side, boolean posted back. Spoofable and extractable in
    principle; allowed for formative feedback, **never the sole basis of a
    readiness-feeding score**. Documented as interim until the server
    sandbox lands.
- Server enforces everything §5 asks that doesn't need code execution:
  finalize-at-first-submit, hidden-suite variants, submission budget +
  cooldown, `{test_id, humanName, passed}` whitelist projection, ai_policy
  split, model-id stamping.
- Meridian's stack adapts to run in-browser: Fastify-shaped micro-router in
  the seed (`inject()` semantics, pure TS), PGlite (WASM Postgres — real
  RLS/`set_config`) for SQL, deterministic-scheduler seams for concurrency
  tickets; true-parallel assertions deferred to the server sandbox era.
  S5/S6 (Docker/AWS) remain stubs this pass — consistent with the
  "sandbox next month" message.

## Deviations from spec (report to owner at the end; none silent)

| # | Spec says | We ship | Why |
|---|---|---|---|
| D1 | Hidden tests in a separate grading container (§4) | IO-cases with server-held expecteds + interim client probes | Owner: no server-side execution yet; design keeps the invariant's teeth via server-side comparison |
| D2 | Secrets in a separate repo with separate ACL | Secret bundle in-repo, server-only, CI leak-scan + client-bundle scan + git-history scan | Solo-founder ops reality; compensating controls in CI |
| D3 | Agent v0 = full toolset assisted | Chat-only Sable v0, tool-ready machinery | Owner override |
| D4 | Fastify · Redis/SQS · Docker · AWS literal | Fastify-shaped seam, simulated queue seams, S5/S6 stubbed | Client-only execution |
| D5 | `workbooks/meridian/repo/` "committed as a real git repo" | Seed as plain files + manifest; provisioning = init + copy | Nested git repos don't commit; §4.6 requires init+copy anyway |
| D6 | Postgres tables for learner history/metadata | Firestore collections mirroring the same shapes | Platform DB is Firestore |

## Wave plan

- **W0** (done): specs read, decisions taken, branch cut, this doc.
- **W1 — inventory** (read-only, parallel): Case Labs + /labs + routing/UI ·
  execution/runner machinery · auth/entitlements/scoring/rubric-verbatim ·
  Sable/LLM/chat plumbing + cost tracking. Output: section reports → I
  synthesize `INTEGRATION.md`.
- **W2 — design + plan:** `INTEGRATION.md`, UX charter (chief of UX),
  `PLAN.md` with numbered tasks (SDD loop per task from here on).
- **W3 — machinery:** schema/types, content compiler with public/secret
  split, loader, `lab validate` core (before content!), gate runner + scorer
  + `filterDirectives`, workspace persistence + session state.
- **W4 — screens** (9 of them, WORKBOOK-SPEC §4) + /labs chooser + flag.
- **W5 — agent:** Sable partner chat with layers A–D, ai_policy modes,
  transcript log, learner-model transparency panel, "sandbox next month"
  messaging.
- **W6 — content:** fixes-before-authoring applied; 10 sprint.yaml + 50
  ticket stubs; seed repo; sprints 1–4 fully playable; `lab validate` green.
- **W7 — verification bar** (AGENT-PROMPT §4) + adversarial review + merge
  behind flag.

## Standing architectural notes

- **Browser-reported pass/fail is NEVER authoritative for anything scored.**
  The visible tier is formative UI; the graded truth is the server-side
  IO-case comparison (Task 8). The client marker channel carries the
  pack-runner defenses (last marker, stdout-typed only) but remains
  forgeable in principle — every scoring path must treat client-posted
  booleans as display-only. (From Task 4's review, finding I3.)
- The legacy js/python workspace runners share the accumulate-every-marker
  parse weakness on their (unscored) paths — pre-existing, out of Sprint
  Labs scope, disclosed for the final report.

## Rulings ledger

- R1: Sprint 5 mis-sizing (SPRINT-PLAN §8) resolved by lengthening the
  sprint's stated hours, not splitting MER-504 — preserves the 50-ticket
  spec count. Cost if wrong: one over-packed stub sprint, fixable later.
- R2: PGlite is the SQL engine for Meridian in-browser (real RLS semantics);
  if inventory finds an existing Postgres-in-browser, reuse it instead.
- R3: Specs were prettier-reformatted by the commit hook (lint-staged);
  content unchanged. Not fighting the hook.

## Status log

- 2026-08-26: W0 complete. Branch `sprint-labs` @ 4a77bc3a. W1 dispatching.

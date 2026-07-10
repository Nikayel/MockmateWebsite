# Palantir Case Labs — Gap Audit & Build Plan

> Output of a 45-agent research + audit council (2026-07-09): 7 web-research agents mapped
> the real Palantir SWE/FDSE-intern loop from 2024-2026 first-hand candidate reports, 2 agents
> mapped our current coverage, 5 lens-agents audited the gap (curriculum / content / UX / UI /
> code), every finding was adversarially verified (24 confirmed), then synthesized.
>
> This is the source-of-truth punch list for the "they ask a lot more" coverage work.
> Fixes are tracked as `PF-NN`; check them off as they ship.

## Verdict

Case Labs is a strong onsite dress rehearsal for Palantir's single most important round
(**Decomposition**), but it simulates ~2 of the ~5 gates a real candidate hits, and nothing on
any user surface says so. The content is authored better than it is delivered: the interviewer
chat still reasons over answer *counts*, not the candidate's real work.

## The real Palantir loop (round by round)

SWE ("Dev") and FDSE ("Delta") loops share the same round *types*; they differ in framing/motivation.

1. **Recruiter / motivation screen (~30 min)** — authentic "why Palantir", Gotham vs Foundry vs AIP, SWE-vs-FDSE fit. Filters hard.
2. **Online Assessment (HackerRank, ~75-90 min, 3 parts)** — (1) Python implementation/OOP, (2) multi-table SQL, (3) REST endpoint fetched with **pagination** + aggregation. "Correctness over efficiency." Reads like a Jira ticket. **Palantir's most distinctive gate.**
3. **Live coding / phone screen (CodePair)** — LeetCode-medium, graded on clean code, edge cases, end-user framing, escalating follow-ups.
4. **Build-to-Apply Foundry take-home** (some FDSE loops, team-dependent).
5. **Virtual onsite: ~3 back-to-back 60-min rounds** (each ~20 min embedded behavioral), from a pool:
   - **Decomposition (signature)** — vague operational problem; interviewer role-plays a product owner and mutates requirements mid-round. Scores scoping, users/entities/data/**permissions**/failure modes, tradeoff defense, adaptation. Not meant to be solved. Neglecting provenance/access-control/audit is a named weak signal.
   - **Learning** — minimal docs for an unfamiliar API/invented query language; build a mental model fast, apply to ~4 escalating tasks. A Nov-2025 rejection came from a **SQL-heavy Learning round with no runnable environment**.
   - **Re-engineering / Debugging** — 250-1000 lines of unfamiliar code, a subtle *logical* bug + planted red herrings (the reported example: a double-counting HashMap). Comprehension over authoring.
   - **System Design (variant, more senior)** — distributed systems, correctness/fault-tolerance first-class.
6. **Hiring Manager / behavioral (~60 min)** — biggest failures + lessons, ownership, "missionary not mercenary" mission fit incl. comfort with defense/law-enforcement ethics.

Cross-cutting: behavioral is scored in every round; AI use is prohibited; selectivity <2-3%; ~3-4 week timeline. Intern loops add ~5 scored essay questions and lean on timed algorithmic warm-ups.

## What we cover today

- **Decomposition: well covered** — Clarify + Decompose + Design faithfully train the signature round. Our strongest asset.
- **Code-comprehension: partial** — Build is an honest multi-file Python codebase drop, adjacent to Re-engineering.
- **Mission/ethics: touched** — one Review question, the single highest-signal Palantir behavioral cue, but only one.
- **Substrate exists** — auth is solid; the sql.js runner exists; scenarios support bugfix/add-functionality/system-design; a `palantirData` behavioral profile already exists in `lib/data/company-questions`.

## Gap map (ranked)

**P1 — highest leverage**
1. No Online Assessment simulation (Python + SQL + REST/pagination, timed).
2. No Learning round (no station type for it; the no-REPL SQL variant is the documented blindside).

**P2 — coverage expansion**
3. No Palantir Re-engineering / bug-hunt lab (Build is add-functionality, never find-the-bug).
4. No dedicated behavioral / mission HM round.
5. No recruiter / motivation screen + no Gotham/Foundry/AIP primer + no `palantir.ts` RAG file.
6. FDSE-only; no SWE track; `CaseLab.role` is untyped free-text.

**Cross-cutting**
7. Chat AI not grounded in the candidate's real answers (sends counts only). Caps the value of all content.

## Prioritized fixes (PF-NN)

Sequencing: fix safety + honesty first, then buy the largest missing coverage (OA), then the highest-signal onsite rounds. Daily DSA loop stays primary; Case Labs is the premium complement.

### Phase 0 — Unblock & de-risk (platform P0)
- [ ] **PF-01** Meter labs chat + feedback routes (`enforceQuota` + request tracking + real `userTier`). `app/api/labs/{chat,feedback}/route.ts`.
- [ ] **PF-02** Ground the chat AI in the candidate's real answers (not counts) + inject `whyThisCompany`/rubric. `lib/labs/case-lab-chat.ts`, `components/labs/CaseLabChat.tsx`.
- [ ] **PF-03** Guard completion against zero work (block/nudge empty Build/blank milestones). `ReviewStation`, `MilestoneNav`.
- [ ] **PF-04** Fix mastery pollution (stop mapping every lab to `arrays-hashing`). `lib/labs/case-lab-mastery.ts`.
- [ ] **PF-18** Zod the feedback body; validate Firestore reads; stop leaking schema paths. `app/api/labs/*`, `lib/labs/case-lab-runs.ts`.
- [ ] **PF-19** UI/hook/store-selector tests. `components/labs/**/__tests__`, `useCaseLabRunSync`, store.

### Phase 1 — Cheap accuracy + honesty wins
- [ ] **PF-07** `whyThisCompany`: "open with" → "signature onsite round" + OA/Learning caveat. `palantir-911-dispatch.ts`.
- [ ] **PF-08** Reframe Decompose off "one bottleneck"; add access-control/permissions dimension + requirement-mutation dynamic. `palantir-911-dispatch.ts`.
- [ ] **PF-17** Align Build with the concurrency talk-track (or strengthen the curveball); add Design/Review ghosts; complete the Decompose ghost. `palantir-911-dispatch.ts`, `add-feature-911-dispatch.ts`.
- [ ] **PF-09** Map milestones → named Palantir rounds on intro + rail. `types.ts`, lab, `CaseLabIntro`, `MilestoneRail`.
- [ ] **PF-10** "What this prepares / prep elsewhere" scope panel + cross-links (DSA loop, `/learn/sql`). `CaseLabIntro`, `ReviewStation`.

### Phase 2 — Biggest coverage hole: the OA (flagship build)
- [ ] **PF-05** Palantir OA timed mode: Python OOP + multi-table SQL (first SQL workspace scenario) + paginated REST aggregation, hidden-test graded, countdown, "correctness over efficiency".

### Phase 3 — The Learning round
- [ ] **PF-06** Learning drill: minimal docs for an invented API/query language, 3-4 escalating tasks, + a hand-write-SQL no-REPL variant.

### Phase 4 — Round out the onsite
- [ ] **PF-11** Palantir Re-engineering / bug-hunt lab (reuse `bugfix` real-codebase: subtle logical defect + red herring).
- [ ] **PF-12** Palantir behavioral / mission HM round (STAR failures, why-FDSE, mission-ethics), reuse `palantirData`.

### Phase 5 — Breadth & motivation
- [ ] **PF-14** Type `CaseLab.role` with the `RoleTag` union; author a Foundry SWE-track lab.
- [ ] **PF-13** Recruiter-screen drill + Gotham/Foundry/AIP primer + `lib/rag/.../companies/palantir.ts`.
- [ ] **PF-15** Resume-vs-restart / start-over control (wire the uncalled store `reset`).
- [ ] **PF-16** Make Onsite mode mean interview conditions (timer/hint-suppression/lock) or relabel honestly; allow mid-run switch.
- [ ] **PF-20** Palantir prep hub `/labs/company/palantir` with sequenced plan + per-round readiness (after catalog grows).

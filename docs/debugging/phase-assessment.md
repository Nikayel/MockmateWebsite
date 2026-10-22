# Guided lab phase assessment

Guided labs teach a process. Their results describe recorded work and verified behavior; they do not contribute an interview readiness score. BookClub has six phases: investigation, four repairs, and the release check.

## Learner flow

1. Work through the existing phase rail and use the normal chat/editor. No extra grading form is required.
2. Chat sends, revealed hints, test runs and phase transitions record a bounded evidence trail. Code checkpoints at chat sends and test starts capture changed regions with before/after source.
3. Run results retain the phase and source revision from **when execution started**, even if editing or phase progression occurs before the response arrives.
4. Submit after the existing release gate. The server loads the scenario and sealed grading contract, validates evidence, computes phase verification, and requests one semantic review for the whole lab.
5. Review each phase's checks, explanation, investigation and code changes. Expand the recorded evidence to inspect messages, changed regions and run revisions. Saved sessions show the same report.

Relevant code checkpoints can support a later repair even if the learner made the change early. Release-check explanations can also support retrospective understanding of earlier repairs; they do not establish that a hypothesis preceded the edit. Original phases and revisions stay attached, so the report does not invent when the work happened.

Findings use `demonstrated`, `developing`, or `not_observed`. A missing explanation is not a numeric zero. Test success does not automatically establish understanding. Hints, elapsed time, retries and activity counts do not deduct points or establish skill.

## Module boundaries

- `lib/bugfix/guided-lab/assessment/schema.ts`: versioned runtime schemas and inferred TypeScript contracts.
- `capture.ts`, `patch.ts`, `execution.ts`: client observations, bounded source changes, and the bridge to existing phase gates.
- `evidence.ts`: pure immutable event append and retention policy.
- `report.ts`: deterministic verification and validation of model references; no network, React or database dependency.
- `prompt-evidence.ts`, `prompt.ts`: bounded, phase-balanced model context. Before **and** after source are preserved around the actual change.
- `review.server.ts`: one existing-provider call, schema validation and graceful degradation. Uses the existing spend sink; `GUIDED_LAB_PHASE_REVIEW_ENABLED=false` disables the semantic review while preserving deterministic checks.
- `validation.ts`: validates the attempt, phase IDs, source revisions and editable paths against the authored scenario.
- `summary.ts`: guided feedback language, without interview-score fallbacks.
- `components/practice/GuidedLabReview.tsx`, `GuidedLabFeedback.tsx`, `GuidedLabEvidence.tsx`: presentational result surfaces shared by current and saved sessions.

Existing gates, source revision protection, quotas, authentication, ownership checks and idempotent feedback persistence are reused. The guided review replaces the interview semantic scorer and skips the other interview AI analysis/narrative calls. The obsolete quiz-accuracy scoring adapter was removed. No new provider, BERT model, training pipeline or dependency is introduced.

## Recovery and storage

Evidence belongs to an attempt ID, not just a scenario. A new attempt clears the old trace and phase completion; checkpoint and submission accessors refuse a different attempt. Local phase progress remains reloadable. Autosave serializes guided progress into the existing authenticated/guest checkpoint contracts for recovery on another device. On resume, final verification is invalidated and source revisions advance; restored code is seeded as the checkpoint baseline rather than falsely credited as a fresh repair.

The log retains initial and recent history within 300 events and 160 KB of serialized event bytes. Removed history is explicitly marked. Changed regions and messages are bounded excerpts, not a keystroke recorder or a complete edit history. Each phase report has a separate evidence budget. Older saved sessions remain readable when phase evidence is absent; corrupt optional telemetry does not erase valid phase progress.

These are **client-observed practice signals**, not tamper-proof execution attestations. Authentication and validation prevent cross-account writes and malformed payloads; they do not prove that a client-reported event really happened. This is one reason guided results remain excluded from readiness. A future high-stakes assessment would require server-owned execution records and signed evidence, not merely a stronger language model.

## Model limits and evaluation

The server supplies the actual phase instructions and sealed repair criteria. The model must distinguish supplied guidance from learner explanations and cite recorded IDs. A deterministic postprocessor rejects nonexistent references, AI-only communication claims, investigation claims without a candidate explanation plus test/patch evidence, and repair claims without code changes. The model cannot alter test results, gates or numeric readiness. Provider outages, disabled reviews and malformed output show unavailable/unobserved findings while preserving the recorded checks.

Reference validation cannot prove that every model interpretation is correct. The automated suite uses a mocked provider to verify orchestration, costs, validation and failure handling. It does not establish real-model agreement with expert reviewers. Before using these findings as independent skill measurements, collect consented human-reviewed examples, measure agreement on held-out attempts and audit unsupported findings and language bias. There is intentionally no trained classifier or claimed accuracy figure.

## Patterns worth learning from this change

1. **Separate facts from interpretations.** `buildLabAssessment` determines check status; `applyLabReviews` attaches judgments. A model outage cannot rewrite a passing test.
2. **Model absence explicitly.** `not_observed`, `stale` and `unavailable` have different meanings. Substituting zero for all three would punish learners for missing telemetry or infrastructure failures.
3. **Carry context across asynchronous work.** The execution adapter receives the phase/revision captured at request start. Reading only current state when a response finishes can attribute an old run to a new phase.
4. **Keep identity in persistence contracts.** Attempt IDs prevent a correct report from being attached to the wrong session. The same schema crosses local storage, cloud autosave and submission.
5. **Bound work before it becomes a bill.** Event retention, phase budgets, one review call and the existing spend sink control storage and model costs. Budgeting each phase prevents an early conversation from displacing a later repair.
6. **Test invariants, not implementation trivia.** Regression tests cover stale green runs, missing suites, harness errors, wrong attempts, invented references, model failure and readiness exclusion. The browser test runs the real Python workspace, resumes, edits, verifies and renders the result.

Suggested reading order: `schema.ts` → `execution.ts` → `report.ts` → `review.server.ts` → the persistence route tests. At each boundary ask: what is trusted, what can arrive late, and what survives a failure?

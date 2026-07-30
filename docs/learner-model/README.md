# Open Learner Model — "What CodeSparring Thinks You Know"

The `/knowledge` page exposes the system's beliefs about what a learner knows, derived from FSRS spaced-repetition state, in four layers:

1. **Inspect** — per-concept (DSA pattern + a "Systems" bucket) rollups of FSRS retrievability/stability with a plain-language translation ("~72% chance you could solve this cold today; recall drops below solid in ~4 days"), and per-card **evidence**: the exact past reviews (scores, hints, interval movements, predicted-vs-actual recall) that produced the belief.
2. **Challenge** — a "This seems wrong" affordance on every card with three structured reasons: typo/misread, rushed, learned-elsewhere. Every challenge is stored with the model's belief snapshot at challenge time.
3. **Correct** — the model visibly responds. Typo/rushed challenges *replay* the last review from its stored pre-review FSRS card with a corrected rating (Good/Hard) at the original timestamp: the correction is exactly what FSRS would have produced absent the slip, not an ad-hoc bump. Every challenge pulls a **verification review** to tomorrow (due date only; memory state untouched). The `/practice` page shows a trace: "Because you corrected X, it's scheduled for a verification review today."
4. **Study harness** — a black-box control condition (concepts listed, all numbers masked, challenges disabled) assignable via flag percentage, plus first-class event logging on everything. See `STUDY-HARNESS.md`.

## Architecture

| Concern | Where |
|---|---|
| Belief derivation (rollups, translation, masking) | `lib/learner-model/model-builder.ts`, `translate.ts` |
| Evidence (review history per card) | `lib/learner-model/evidence.ts` reading `algorithm_research_events` |
| Challenges (dispute docs + snapshots) | `lib/learner-model/challenges.ts` → `learner_model_challenges` |
| Amendment (FSRS replay / fallback / pull) | `lib/learner-model/amendment.ts` |
| Verification linking (was the learner right?) | `lib/learner-model/verification.ts`, called from `app/api/spaced-repetition/complete/route.ts` |
| Events | `lib/learner-model/events.ts` → `learner_model_events` |
| API routes (thin: auth → tier → flags → service) | `app/api/learner-model/{,history,challenge,events,corrections}/route.ts` |
| UI | `app/knowledge/` + `components/practice/CorrectionTraceBanner.tsx` |

All routes are Pro-gated (`requireTierForUser(userId, "pro")`), matching the rest of spaced repetition.

## Key design decisions

- **Universal FSRS is a precondition.** The SM-2/FSRS A/B was ended via the admin "End A/B — Switch All to FSRS" action (`app/admin/research`): existing SM-2 cards were converted in place preserving schedules and the ease-derived difficulty signal (`lib/spaced-repetition/fsrs-migration.ts`).
- **Per-question, not profile-level.** FSRS's real beliefs live per card, so that is where stats and challenge/correct live; concepts are read-only rollups and there is deliberately no single profile score.
- **Corrections are model-honest.** The amendment replays the actual scheduler; a correction can only improve on the recorded rating (challenging an Easy review is a no-op plus verification).
- **Corrections are falsifiable.** Every challenge schedules a verification review; its outcome (mastery_score >= 56, the same bar as `actual_retention`) is written back to the challenge doc.
- **Never-reviewed cards say "no evidence yet"** instead of faking a number.

## Flags

- `OPEN_LEARNER_MODEL` (default on) — kill switch: `FEATURE_FLAG_OPEN_LEARNER_MODEL=false`.
- `LEARNER_MODEL_BLACK_BOX` (default off) — control condition; cohort via `FEATURE_FLAG_LEARNER_MODEL_BLACK_BOX_PCT`.

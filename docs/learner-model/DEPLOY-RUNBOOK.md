# Learner Model + FSRS Switch — Deploy Runbook

Order matters. Do these in sequence.

## 1. Deploy Firestore indexes (before app deploy)

```bash
firebase deploy --only firestore:indexes
```

New composite indexes (in `firestore.indexes.json`):
- `algorithm_research_events (user_id ASC, problem_id ASC, timestamp DESC)` — evidence + amendment lookup
- `learner_model_events (user_id ASC, timestamp DESC)`
- `learner_model_challenges (user_id ASC, created_at DESC)` and `(user_id ASC, status ASC, created_at DESC)`

Wait for the indexes to finish building (Firebase console) before flipping traffic — the evidence endpoint and the challenge amendment query need them.

## 2. Deploy the Vercel app

Standard deploy.

## 2b. Deploy Firestore rules (AFTER the app)

```bash
firebase deploy --only firestore:rules
```

This feature **does** change `firestore.rules`: it adds explicit server-only deny blocks for `learner_model_challenges`, `learner_model_events`, `problem_mastery`, `algorithm_research_*`, and `research_config`. These were already closed by the catch-all default-deny, so the change is **defense-in-depth and auditability, not a behavior change** — nothing breaks if this step lags. Per the standing deploy order, rules go out after the app.

## 3. End the A/B (one-time admin action)

In `/admin/research` (as an admin):

1. Click **End A/B — Switch All to FSRS**. This runs a **dry run** first and opens a confirm dialog with exact counts (users to flip, cards to convert, overridden users kept, errors).
2. Confirm. The sweep pages through all profiles (100 users/page, resumable via cursor, batches ≤400 ops), converts every blob-less card in place (schedules preserved; ease_factor mapped onto FSRS difficulty), then writes `research_config/algorithm {ab_ended: true}` only after the final page.
3. **Verify**: run the dry run again — every count must be zero (idempotency doubles as the completion check). The dashboard now shows the green "A/B ended" banner.

Every page of the sweep (dry runs included) is written to `admin_audit_log` as `end_ab_switch_fsrs`.

Safety nets: `getUserAlgorithm` self-heals any missed non-overridden sm2 user to FSRS on their next review; users who explicitly chose their algorithm keep it.

## 4. Flags

- Kill switch: `FEATURE_FLAG_OPEN_LEARNER_MODEL=false` disables `/knowledge` + all learner-model APIs (page shows a friendly disabled state).
- Study control: `FEATURE_FLAG_LEARNER_MODEL_BLACK_BOX=true` (all users) or `FEATURE_FLAG_LEARNER_MODEL_BLACK_BOX_PCT=50` (deterministic half).

## 5. Pre-flight: run the integration suite locally

```bash
pnpm test:integration
```

Boots a real Firestore emulator and exercises the migration (dry-run/real/idempotent/paged) and the full challenge → FSRS replay → verification chain against actual documents. Run this before any production migration — it is the closest thing to a rehearsal of step 3.

## 6. Manual smoke (Pro account with review history)

1. `/knowledge` from the nav: concepts grouped (SD under "Systems"), belief sentences render, expand a card → evidence rows.
2. Challenge a low-scoring card as "typo" → dialog shows stability before → after and the verification date; Firestore challenge doc has `correction.amendment_source`.
3. Complete the verification review → challenge flips to `verified` with `passed` matching mastery_score >= 56.
4. `/practice` → correction trace banner cites the card; dismissible.
5. Flip black-box env var → numberless page, no challenge buttons, history 403.

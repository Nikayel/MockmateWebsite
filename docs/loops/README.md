# CodeSparring Engineering Loops

These are **Claude Code engineering loops** — prompts you run in a Claude Code session
(typically via the `/loop` skill) that iterate on **this repository**. Each cycle picks
one bounded target, improves it against real files and real research, runs the real
verification gates, and commits.

> They are NOT runtime system prompts for the live product. The live BugFix interviewer
> behaviour already lives in `lib/prompts/principles.ts` and
> `lib/interview/chat/context-builders.ts`. These loops *harden the real system*; they do
> not reimplement it.

## How to run

In a Claude Code session on this repo:

```
/loop 20m Follow docs/loops/bugfix-realism-loop.md for exactly one iteration.
```

Swap in `ux-voice-loop.md` or `ui-conformance-loop.md`. Run one loop at a time so commits
stay reviewable. `/loop` defaults to 10m if you omit the interval.

## The shared contract (every loop obeys this)

1. **One target per iteration.** Pick a single file/scenario/component. Do not fan out.
2. **Ground in reality first.** Read the real file and the real system it plugs into before
   changing anything. Never invent a data shape, scoring field, or rule that already exists.
3. **DRY is law here** (`CLAUDE.md`): do not duplicate business rules, scoring, validation,
   or copy that already lives in code. Extend the source of truth instead.
4. **Gates are mandatory.** A change is not done until the relevant gates pass:
   - `pnpm typecheck`
   - `pnpm test` (or the focused test file)
   - `pnpm lint`
   - `pnpm audit:bugfix` (required for the bugfix loop; run it if you touched any scenario)
   - `pnpm build` only when you changed routing/config or are unsure.
5. **Commit per iteration** with a scoped message. Never push to a branch other than the one
   you were started on.
6. **Bounded effort, then escalate.** Max 3 attempts on one target. If still failing or
   ambiguous, stop, write the finding to `loop_log`, set `needs_human_review: true`, and move
   on. Do not force a risky change.
7. **Log every iteration** to `docs/loops/loop-log.md` (append): target, what changed and why,
   gates run + results, and `needs_human_review`.

## Brand guard (applies to every loop)

The product name is **CodeSparring**. The repo is historically "Mockmate" and stale copy
still says it (e.g. `components/nps-survey-modal.tsx`). Any user-facing string you touch that
says "Mockmate" must be corrected to "CodeSparring" — but flag, don't silently rename, any
identifier, env var, or domain that might be load-bearing.

## Source-of-truth map (read before editing)

| Concern | Source of truth — extend this, don't fork it |
|---|---|
| BugFix interviewer behaviour | `lib/prompts/principles.ts`, `lib/interview/chat/context-builders.ts` |
| Scenario data shape | `lib/scenarios/types.ts`, `lib/bugfix/types.ts` |
| Scenario realism rules | `lib/scenarios/bugfix-quality.ts` (run via `pnpm audit:bugfix`) |
| Scoring | `lib/bugfix/scoring.ts`, `lib/bugfix/semantic-scorer.ts` |
| Design tokens (ACTIVE) | `lib/design-tokens.ts` |
| Design.md | Aspirational reference only — **NOT the active system. Do not refactor toward it.** |
| Voice/tone | `docs/loops/VOICE.md` (created by the UX loop; becomes the source of truth) |

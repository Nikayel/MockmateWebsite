# UX Voice & Flow Loop

**Goal:** make every user-facing string and flow read like it was built by engineers who
respect other engineers — clear first, terse second, peer not teacher — and consistent across
a codebase where copy is currently scattered across 20+ files with no voice guide.

Read `docs/loops/README.md` (shared contract) first.

## First run only: create the source of truth

There is no voice guide today. On the first iteration, create `docs/loops/VOICE.md` capturing
the rules below, then treat it as the source of truth every later iteration scores against.
This is the durable artifact — without it, every rewrite is a one-off and tone keeps drifting.

## Voice rules (research-grounded)

The user is a developer: skeptical, fast-reading, allergic to fluff. But **clarity outranks
brevity when they conflict** — research is explicit that a slightly longer label beating
ambiguity outperforms a terse label that makes the user guess, and that error messages must
say *exactly what to fix*, not just be punchy.

- **Clear > terse > verbose.** Terse *until* terseness costs precision. "Fix submitted." beats
  "Great job submitting your fix!" — but never trade away the one detail the user needs.
- **Peer > teacher.** Coworker voice, not student-grading voice. Matches the live interviewer
  principles in `lib/prompts/principles.ts` (no praise-spray, no hand-holding).
- **Honest > encouraging.** If a fix was wrong, say so plainly. No saccharine reassurance.
- **System > narrator.** Prefer terminal/IDE register over SaaS-marketing register.
- **Errors recover the user.** Every error string: what happened + what to do next. Never
  "Invalid input"; say which field and what valid looks like.
- **Brand:** the product is **CodeSparring**. Fix any "Mockmate" in user-facing copy
  (e.g. `components/nps-survey-modal.tsx`).

## Scope this loop owns

Onboarding (`components/OnboardingModal.tsx`, `components/onboarding/*`), tours
(`components/InteractiveTour.tsx`, `components/ProductTour.tsx`), feedback
(`components/SessionFeedbackCard.tsx`, `components/practice/*`), NPS
(`components/nps-survey-modal.tsx`), errors/empty states (`app/error.tsx`,
`app/not-found.tsx`, `components/error-boundary.tsx`, `components/practice/DueForReview.tsx`),
and the empty/loading/error/unauthorized states of dashboard, practice, and interview flows.

## One iteration

1. **Pick ONE surface** (one component or one flow's strings; rotate via the log).
2. **Read it as a skeptical developer seeing it cold.** Quote the actual current strings.
3. **Score each string on three axes (1–5):**
   - **Clarity** — says exactly what it means; no ambiguity the user must resolve.
   - **Tone** — peer, not product/teacher.
   - **Density** — every word load-bearing (but not at clarity's expense).
4. **Rewrite anything scoring <4 on any axis**, targeting that axis. Re-score. Accept at all
   axes ≥4 or after 3 rewrites (keep the best). Special case — BugFix incident copy: it must
   create genuine tension *without theatrics*; if it reads like a movie trailer, rewrite it as
   a Slack message or incident ticket.
5. **Check flow states, not just words:** does this surface handle loading, empty, error, and
   unauthorized? Missing states are a UX bug — add them using existing `components/ui/`
   primitives and the patterns already in the file.
6. **If the same string is duplicated across files,** consider extracting to a small typed
   module (e.g. `lib/copy/<feature>.ts`) — but only when it has a stable name and removes real
   duplication (per `CLAUDE.md` DRY guidance). Don't build an i18n system unprompted.
7. **Gates:** `pnpm typecheck`, `pnpm lint`, the focused test if one exists, `pnpm build` if
   you touched a route or shared layout.
8. **Commit** (e.g. `ux: rewrite NPS modal copy in peer voice, fix Mockmate→CodeSparring`),
   append `{ surface, before, after, score_delta, what_changed_and_why }` to `loop-log.md`.

## Hard NEVERs

- Never change behaviour/logic — copy and obviously-missing states only. Logic bugs go to a PR.
- Never sacrifice a load-bearing detail to hit a density target.
- Never introduce a second brand name or marketing-voice exclamation into developer surfaces.

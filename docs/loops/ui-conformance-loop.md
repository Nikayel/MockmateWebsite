# UI / Design Conformance Loop

**Goal:** bring components into conformance with the **active** design system and accessibility
baseline — consistent tokens, real a11y, all interaction states handled.

Read `docs/loops/README.md` (shared contract) first.

## Critical: which design system is real

- **ACTIVE:** `lib/design-tokens.ts` (Neural Minimalism — electric cyan `#00d9ff`, Work Sans /
  Open Sans, 8px spacing grid, defined radii/shadows/z-index). Consumed mostly via Tailwind
  classes, some CSS vars, occasional direct imports.
- **NOT ACTIVE:** `Design.md` is an aspirational Apple-inspired reference (different colors,
  SF Pro, different spacing). **Do not refactor components toward `Design.md`.** If a change
  seems to require it, stop and set `needs_human_review: true`.

## Conformance rubric

1. **Tokens, not magic values.** No hardcoded hex colors or off-grid spacing where a token/
   Tailwind class exists. Spacing should sit on the 8px grid. Colors should map to the palette
   in `lib/design-tokens.ts`.
2. **Accessibility baseline** (per `CLAUDE.md` React rules): semantic markup; every control has
   a label or `aria-label`; visible focus states; keyboard operability; sufficient contrast
   against the dark theme tokens; images have alt text.
3. **All interaction states.** Loading, empty, error, disabled, and unauthorized are each
   handled — using existing `components/ui/` primitives and the file's existing patterns.
   (UX-writing for those states is the UX loop's job; *presence and correctness* is this loop's.)
4. **Responsive.** Layout holds from mobile to wide without overflow or clipping.
5. **Primitive reuse.** Prefer existing `components/ui/` primitives over bespoke markup.

## One iteration

1. **Pick ONE component** (rotate via the log) — start with high-traffic surfaces: dashboard,
   practice, interview, onboarding, pricing.
2. **Read it and `lib/design-tokens.ts`.** Identify the single biggest conformance gap (a
   hardcoded color, a missing focus ring, an unhandled error state, a missing label).
3. **Fix that one gap** using tokens/Tailwind and `components/ui/` primitives. Match the
   surrounding code's idiom and comment density — don't introduce a new abstraction for two
   similar lines.
4. **Verify a11y of your change:** label present, focus visible, keyboard reachable, contrast
   OK. State it explicitly in the log (you can't run a full audit tool in-loop, so reason it
   through and note residual risk).
5. **Gates:** `pnpm typecheck`, `pnpm lint`, `pnpm build` (catches className/layout breakage),
   focused test if one exists.
6. **Commit** (e.g. `ui: replace hardcoded hex with cyan token + add focus ring on DueForReview`),
   append `{ component, gap, fix, a11y_notes }` to `loop-log.md`. Set `needs_human_review` for
   anything that changes layout structure or visual hierarchy meaningfully.

## Hard NEVERs

- Never refactor toward `Design.md`. The active system is `lib/design-tokens.ts`.
- Never change copy here (that's the UX loop) or behaviour/logic (that's a PR).
- Never remove an interaction state to simplify; add the missing ones instead.
- Never introduce a new color/spacing value that isn't in the token system.

# Loop Log

Append one entry per loop iteration. Newest at top. This is how we improve the loops themselves.

Format:
```
## <date> — <loop> — <target>
- changed: <what & why>
- gates: <commands run> → <pass/fail>
- needs_human_review: <true/false> (<why, if true>)
```

<!-- entries below -->

## 2026-06-25 — interview-workspace-ux-loop — Target C: color reduction (ProblemColumn.tsx, Codebase Files section)

- changed: Demoted the off-palette `blue` hue in the Codebase Files section to the gray scale. The "Your codebase files are available as tabs…" hint went `text-blue-400` → `text-gray-400` (secondary informational text), and the file-list button hover went `hover:text-blue-400` → `hover:text-gray-200` (secondary/interactive chrome). Blue is not in the target palette (cyan/amber/emerald/red + gray), so this removes a foreign accent from the bugfix/add-functionality workspace path without adding any new hue. Color only — no behaviour/layout/copy change.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on ProblemColumn.tsx · `pnpm build` → PASS
- a11y: gray-400 (#a1a1aa) on the dark panel meets AA for this small informational text; gray-200 hover gives a clear, higher-contrast interactive state (previously blue-400). No focus/keyboard change.
- needs_human_review: false (token swap in secondary chrome; hierarchy and layout unchanged)
- not-done-this-iteration (one component/section per spec): blue still remains in the DSA Examples Input/Output (`text-green-400`/`text-blue-400`), and the difficulty badge uses green/yellow/red — but difficulty-color logic is duplicated inline across 10+ files (no shared helper), so it needs its own dedicated cross-cutting refactor, not a single-component loop iteration.

## 2026-06-25 — interview-workspace-ux-loop — Target B: left-panel width (app/interview/page.tsx)

- changed: Widened the pinned left (problem) column of the 3-column workspace grid from `260px / 280px / 320px` to `320px / 360px / 400px` at `lg / xl / 2xl` (page.tsx:5128), so the now-dominant Description plus Incident Report, repro steps, and logs have room to read on one line instead of wrapping tightly. Center editor stays `minmax(0,1fr)` and the right (chat) column is unchanged at `240 / 260 / 280px`. Layout sizing only — no behaviour/logic/copy change.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on page.tsx (pre-existing warnings only) · `pnpm build` → PASS
- a11y: wider reading column improves legibility of the left panel. No overflow risk — the editor track is `minmax(0,1fr)` (floor 0), so it absorbs the extra width and can never overflow; at the narrowest breakpoint (lg, 1024px) the editor still gets ~448px (320 left + 240 right + gaps). Focus/keyboard surfaces untouched.
- needs_human_review: true (changes panel proportions across lg/xl/2xl — worth a human eye on a screenshot to confirm the editor still feels comfortable at the lg breakpoint)

## 2026-06-25 — interview-workspace-ux-loop — Target A: left-panel hierarchy (ProblemColumn.tsx)

- changed: Made the Description body dominant per the loop's target hierarchy. It was `text-[15px] text-gray-200` — visually tied with the Incident Report's `text-sm text-gray-200` lead line, so nothing dominated the left panel. Bumped to `text-base` (16px) `text-gray-50` (highest contrast), so the eye lands on the Description first and the `text-sm`/gray Incident Report + compressed sections now read as clearly subordinate. No new hue, no copy/behaviour change, no extra spacing churn — single-gap fix.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → ProblemColumn.tsx CLEAN (40 pre-existing errors in js-sandbox-worker.js/scratch.ts, unrelated) · `pnpm build` → PASS
- a11y: gray-50 (#fafafa) on bg-gray-900/50 is near-max contrast (far exceeds WCAG AA); larger body text improves readability. Static text — no focus/keyboard surface touched.
- needs_human_review: false (typographic weight/contrast only; layout structure and color system unchanged)

## 2026-06-25 — bugfix-realism-loop — bugfix-quality.ts (realism validator)

- changed: Added `USERREPORT_ANTI_PATTERNS` to `validateBugfixScenarioQuality` enforcing rubric rule #5 (incident framing, not a movie trailer). Patterns catch the generic meta-commentary fallback text ("The candidate should investigate…"), theatrical exclamation marks, paging language, and task-framing language. Wrote explicit incident-ticket `userReport` strings for the 6 of 8 registered scenarios that were relying on the `withBugfixIncidentDefaults` fallback — each now reads as a Slack ping or incident ticket (symptom observed, team reporting it, no meta-commentary). The two scenarios already having explicit `userReport` (bugfix-onboarding, bugfix-temperature-alert-regression) were unchanged.
- gates: `pnpm audit:bugfix` → PASS (8/8) · `pnpm typecheck` → PASS · `pnpm lint` → PASS on touched files (pre-existing errors in js-sandbox-worker.js and scratch.ts)
- needs_human_review: false

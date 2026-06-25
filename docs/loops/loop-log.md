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

## 2026-06-25 — interview-workspace-ux-loop — Target C: Guest Mode banner gradient (off-palette purple → accent) in page.tsx

- changed: A full off-palette scan of app/interview/page.tsx surfaced one last foreign hue: the Guest Mode "Free Trial" banner used a `from-accent/20 … to-purple-600/20` gradient. Every other element in the banner is cyan (text-accent, border-accent/30, the sign-up link), so purple was the lone outlier. Replaced `to-purple-600/20` with `to-accent/5`, making it a single-accent cyan wash. Per the loop's hard rule (never add a new accent hue), and since amber/emerald/red don't fit a trial/upgrade banner semantically, single-accent cyan is the correct on-palette choice. Color only — no behaviour/copy change.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on page.tsx · `pnpm build` → PASS
- a11y: gradient is a decorative background tint behind text that already uses its own contrast tokens (text-accent / text-muted-foreground); softening the far stop to accent/5 does not reduce text contrast. No focus/keyboard change.
- needs_human_review: false (decorative background tint, on-palette; layout unchanged)
- WORKSPACE NOW FULLY ON-PALETTE: a complete scan of app/interview/page.tsx + app/interview/_components/* finds zero off-palette hues. The ONLY remaining color gap anywhere in scope is the cross-cutting difficulty badge (green/yellow/red), duplicated inline across 10+ files (workspace + roadmap/metrics/dashboard/admin). That requires a single shared difficulty-color helper applied repo-wide — explicitly out of scope for this "one component per iteration" loop, which also forbids cross-cutting refactors. RECOMMENDATION: pause this loop; open a dedicated task for the difficulty-badge helper; and review the two needs_human_review items (panel-width widening; Investigation Notes de-rainbow).

## 2026-06-25 — interview-workspace-ux-loop — Target C: PostInterviewView test-result success color (green → emerald)

- changed: The post-interview test-results list colored a passing test with off-palette `bg-green-900/20 text-green-400`, paired against a failing test's on-palette `bg-red-900/20 text-red-400`. Mapped the pass state to emerald (`bg-emerald-900/20 text-emerald-400`) so both states use the palette's functional roles — emerald = success, red = error. PostInterviewView now has no off-palette green. Color only — no behaviour/copy change.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on PostInterviewView.tsx · `pnpm build` → PASS
- a11y: emerald-400 on the dark `bg-emerald-900/20` row meets AA; pass/fail is also conveyed by the CheckCircle vs XCircle icon, so the state is not color-only.
- needs_human_review: false (on-palette functional-role recolor; layout unchanged)
- workspace status: a full off-palette scan of app/interview/_components/* now comes back clean except the cross-cutting difficulty badge (green/yellow/red, duplicated inline across 10+ files incl. ProblemColumn/InterviewTopBar/FocusProblemPeek and non-workspace files). That badge is the only remaining color gap and needs a shared difficulty-color helper applied repo-wide — out of scope for a single-component loop iteration. Recommend a dedicated task for it (or pausing the loop).

## 2026-06-25 — interview-workspace-ux-loop — Target C: ChatColumn user message bubble (off-palette blue → accent)

- changed: The user's chat message bubble used off-palette `bg-blue-600 text-white`. Mapped it to the component's established filled-accent convention `bg-accent text-accent-foreground` (already used by the send button at L163 and the Brain/title accents), so the user's own messages now read in the product's cyan brand accent while the assistant bubble stays neutral `bg-gray-800 text-gray-100`. Reuses an existing design token (DRY) instead of a hardcoded blue. Color only — no behaviour/copy change.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on ChatColumn.tsx · `pnpm build` → PASS
- a11y: `text-accent-foreground` is the theme's paired foreground token for accent surfaces (contrast handled by the design system, same as the existing send button); user-vs-assistant distinction is also conveyed by alignment (justify-end vs justify-start) and the User/Brain icon, so it is not color-only.
- needs_human_review: false (on-palette token swap reusing an in-component pattern; layout unchanged)
- remaining workspace off-palette: PostInterviewView.tsx L329 uses `bg-green-900/20 text-green-400` for a success state (palette success is emerald) — next Target C candidate. Plus the cross-cutting difficulty badge.

## 2026-06-25 — interview-workspace-ux-loop — Target C: EditorColumn file-tab role colors (off-palette blue + yellow)

- changed: EditorColumn color-codes file tabs by role. The roles already on-palette were left alone (test=emerald, readonly=amber, editable=cyan). Fixed the two off-palette ones: (1) the `docs` role used blue (icon `text-blue-300/400`, active border `border-b-blue-400`, badge `border-blue-400/25 bg-blue-400/10 text-blue-200`) → demoted to gray (`text-gray-200/400`, `border-b-gray-400`, `border-gray-500/30 bg-gray-500/10 text-gray-300`); docs are reference/"everything else" so gray is the correct role per the table, and stays clearly distinct from the colored functional roles. (2) the unsaved-edit indicator dot moved from `bg-yellow-300` to `bg-amber-300` — an "unsaved changes" attention signal maps to amber (the warning role). EditorColumn now has zero off-palette hues. Color only — no behaviour/copy change.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on EditorColumn.tsx · `pnpm build` → PASS
- a11y: gray docs icon/badge keep clear active-vs-inactive contrast (gray-200 active / gray-400 inactive, mirroring the other roles' active/inactive pattern); the amber unsaved dot retains its `title`/`aria-label="Unsaved edit"` so the state is not color-only. No focus/keyboard change.
- needs_human_review: false (on-palette role recolor; tab semantics and layout unchanged)
- note (commit attribution): per user feedback, commits from this point omit the Co-Authored-By Claude trailer and are attributed to the user only.

## 2026-06-25 — interview-workspace-ux-loop — Target C: off-palette example colors in FocusProblemPeek.tsx (new component)

- changed: Rotated to a different workspace component now that ProblemColumn is clean. FocusProblemPeek (the focus-mode problem peek) rendered DSA example values in off-palette `text-blue-300` (Input) and `text-green-300` (Output); demoted both to `text-gray-200` — the same fix already shipped for ProblemColumn's examples (round 3), so the two components now render examples identically and on-palette. The "Input:"/"Output:" labels (gray-400) still carry the meaning and stay distinct from the gray-200 values. Color only — no behaviour/copy change. Left the difficulty badge (L49–51, green/yellow) untouched: same cross-cutting pattern across 10+ files.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on FocusProblemPeek.tsx · `pnpm build` → PASS
- a11y: gray-200 mono values on the `bg-gray-800/50` card are high contrast (exceeds AA) and stay distinct from the gray-400 labels. No focus/keyboard change.
- needs_human_review: false (color-only token swap matching an existing in-repo fix)
- workspace off-palette scan (this iteration): remaining off-palette hits live in EditorColumn.tsx (3), PostInterviewView.tsx (1), ChatColumn.tsx (1) — candidates for future Target C rotations; plus the cross-cutting difficulty badge in FocusProblemPeek/InterviewTopBar/ProblemColumn and non-workspace files.

## 2026-06-25 — interview-workspace-ux-loop — Target C (round 5): map off-palette yellow to amber (ProblemColumn.tsx)

- changed: Removed the last off-palette hue (yellow) from ProblemColumn, completing the off-palette cleanup (prior rounds did blue→gray and green→gray). Two surfaces, both mapped to amber — the workspace's functional signal/warning role: (1) the legacy static-hints block (Lightbulb icon, hint card border/bg/focus-ring/hover, revealed + blurred hint text, and the "Click to reveal" chip) now uses the same amber treatment as the active Debugging Signals surface, unifying both hint surfaces on one color; (2) the add-functionality "prepared codebase workspace" warning moved from yellow to amber — a warning should use the palette's warning color (Target C "move a misused color to its correct functional role"). Shade mapping matched Debugging Signals: amber-400 borders, amber-500 fills, amber-200/300 text, ring-amber-300. Color only — no behaviour/copy change.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on ProblemColumn.tsx · `pnpm build` → PASS
- a11y: amber-200/300 on the dark surfaces meets AA (same tokens the existing Debugging Signals block already uses); the hint reveal button keeps its `focus:ring-2 focus:ring-amber-300` keyboard focus state (ring recolored, not removed). No keyboard/behaviour change.
- needs_human_review: false (color-only, aligned to an existing in-component amber pattern; no novel scheme introduced)
- remaining (cross-cutting, deferred): the difficulty badge at L147 still uses green/yellow/red (easy/medium/hard) — this is the same inline pattern duplicated across 10+ files (InterviewTopBar, FocusProblemPeek, roadmap, metrics, dashboard, admin), so a correct fix is a shared difficulty-color helper applied repo-wide, not a single-component loop edit. ProblemColumn now has NO off-palette hues except this one cross-cutting badge.

## 2026-06-25 — interview-workspace-ux-loop — Target C (round 4): collapse Investigation Notes per-field rainbow (ProblemColumn.tsx)

- changed: Collapsed the three-hue "rainbow" in the Investigation Notes form — the spec's explicitly-named target ("cyan, amber, emerald... all as meaningful accents at once… collapse that"). The field labels Hypothesis (`text-amber-200`), Root Cause (`text-cyan-200`), and Prevention (`text-emerald-200`) all → `text-gray-400`, and their three matching Save buttons (`border-amber-400/30 text-amber-100`, `border-cyan-400/30 text-cyan-100`, `border-emerald-400/30 text-emerald-100`) → a single neutral `border-gray-600 text-gray-200 hover:bg-gray-700/40` (matching the existing "Upload Files" outline button). The section's cyan header ("Investigation Notes") is kept as the section identity. Net: 6 accent spots → gray; the section now reads as secondary form chrome under one cyan identity, per the 60-30-10 discipline. Color only — no behaviour, logic, or copy change; field semantics unchanged (labels still read Hypothesis/Root Cause/Prevention).
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on ProblemColumn.tsx · `pnpm build` → PASS
- a11y: gray-400 labels and gray-200 button text on the dark `bg-gray-950/35` box meet AA; the neutral outline buttons retain a clear disabled/enabled + hover state. No focus/keyboard change (only color tokens swapped).
- needs_human_review: true — this removes what may have been intentional stage-coding (hypothesis→root-cause→prevention), so it deserves a human eye on a screenshot to confirm the de-rainbowed form still reads well and nothing relied on those colors as a wayfinding cue.

## 2026-06-25 — interview-workspace-ux-loop — Target C (round 3): demote off-palette green/blue in DSA Examples (ProblemColumn.tsx)

- changed: Demoted the DSA Example values from off-palette hues to gray — input `text-green-400` → `text-gray-200`, output `text-blue-400` → `text-gray-200`. Green and blue are not in the workspace palette (cyan/amber/emerald/red + gray); they were decorative coloring on code values whose meaning is already carried by the "Input:"/"Output:" labels (gray-500). The values stay clearly distinct from the labels (gray-200 vs gray-500) while the example box recedes to tertiary detail per the hierarchy spec. Removes the last off-palette green/blue from the DSA path. Color only — no behaviour/copy change. (Left intentionally: the difficulty badge green/red at L145 is a cross-cutting pattern duplicated across 10+ files; the thumbs-up "helpful" green at L419 is a legitimate positive feedback signal.)
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on ProblemColumn.tsx · `pnpm build` → PASS
- a11y: gray-200 (#e4e4e7) mono code on the dark example card is high contrast (exceeds AA); distinction from gray-500 labels preserves scannability. No focus/keyboard change.
- needs_human_review: false (token swap on two code values; layout/hierarchy unchanged)
- loop status: the high-confidence hierarchy + color gaps in ProblemColumn are now addressed (Description dominant, Incident lead line, panel width, off-palette blue/green removed, amber reserved to incident framing). Remaining candidates are cross-cutting (difficulty badge across 10+ files) or debatable (Investigation Notes per-field amber/cyan/emerald semantic labels) — both better as a deliberate human-reviewed pass than incremental loop tweaks. Recommend pausing this loop or rotating to a different workspace component before churn sets in.

## 2026-06-25 — interview-workspace-ux-loop — Target C (round 2): reserve amber for incident framing (ProblemColumn.tsx)

- changed: Demoted the "Repro Steps" and "Visible Logs" sub-labels inside the Incident Report box from `text-amber-200` to `text-gray-400`. Amber is the workspace's single functional warning role; spreading it across neutral supporting sub-labels diluted it and flattened the hierarchy (every sub-label read as "warning"). Now amber is reserved for the incident framing itself (box tint + main "Incident Report" header), and the neutral sub-labels recede to gray per the palette table. "Success Criteria" keeps `text-emerald-200` (its correct success role). No new hue, no behaviour/copy change.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on ProblemColumn.tsx · `pnpm build` → PASS
- a11y: gray-400 (#a1a1aa) uppercase label text on the light amber box over the dark theme meets AA for this secondary label; demotion does not reduce any primary-content contrast. No focus/keyboard change.
- needs_human_review: false (token swap on two secondary labels; layout and hierarchy structure unchanged)
- still-open for future Target C: DSA Examples Input/Output still use off-palette `text-green-400`/`text-blue-400`; Investigation Notes uses per-field amber/cyan/emerald labels (+ matching Save-button borders) — a candidate to collapse toward gray, but more debatable (may be intentional semantic coding) so deferred.

## 2026-06-25 — interview-workspace-ux-loop — Target A (round 2): Incident Report lead line (ProblemColumn.tsx)

- changed: Gave the Incident Report internal hierarchy so it reads as a clear secondary focal point under the now-dominant Description. The `userReport` lead line was `text-gray-200` at inherited `text-sm` — tied in weight with the supporting "Expected/Repro" detail. Bumped it to `text-[15px] leading-relaxed text-gray-100`, one rung below the Description (text-base/gray-50) and clearly above the compressed supporting detail (text-xs/sm, gray-400). Establishes the size+contrast ladder: Description (16px/gray-50) → Incident lead (15px/gray-100) → supporting detail (12–14px/gray-400). No new hue (amber box treatment unchanged), no behaviour/copy change.
- gates: `pnpm typecheck` → PASS · `pnpm lint` → 0 errors on ProblemColumn.tsx · `pnpm build` → PASS
- a11y: gray-100 (#f4f4f5) on the light amber incident box over the dark theme is very high contrast (exceeds AA); larger lead line aids first-glance scanning. Static text — no focus/keyboard change.
- needs_human_review: false (typographic weight/contrast only within an existing box; layout structure and color system unchanged)

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

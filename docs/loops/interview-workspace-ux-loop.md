# Interview Workspace UX Loop

**Goal:** fix the interview workspace's information hierarchy, panel sizing, and color
discipline so a first-time user instantly knows where to look — grounded in visual-hierarchy
and color research, not taste.

Read `docs/loops/README.md` (shared contract) first. This loop owns the interview workspace:
`app/interview/page.tsx` and `app/interview/_components/*` (primarily `ProblemColumn.tsx`).

## Research grounding (apply these, don't re-derive them)

- **Hierarchy is built from size, weight, contrast, and spacing.** The eye goes to highest
  contrast and largest size first. One element must dominate; the rest recede.
- **60-30-10:** ~60% dominant surface (the dark IDE background — keep it), ~30% secondary
  (grays/text), ~10% accent. An accent only "pops" at ~10% of the screen; spread thin across
  many hues it disappears.
- **Limit the palette to ~3 colors + functional variants.** ONE primary accent drives primary
  action. Extra accent colors are visual noise that *flattens* hierarchy.
- Sources: NN/g "Using Color to Enhance Your Design"; the 60-30-10 rule (Material Design,
  Evelance, Groto); IxDF "Visual Hierarchy".

## Color system for this workspace (the target state)

| Role | Color | Use for |
|---|---|---|
| Primary accent | cyan (`--accent` / `text-accent`, `#00d9ff`) | the ONE dominant element + primary actions |
| Functional: warning | amber | incident/warning context — ONE functional role only |
| Functional: success | emerald | success criteria / done / prevention-saved |
| Functional: error | red | errors + hardest-difficulty badge ONLY |
| Everything else | gray scale | all secondary/tertiary text and chrome |

The current panel uses cyan, amber, emerald, green, yellow, red, and blue all as *meaningful*
accents at once. The loop's job is to collapse that toward the table above — demoting decorative
per-section colors to gray so the hierarchy can breathe.

## The target hierarchy for the left panel (`ProblemColumn.tsx`)

A first-time user should read it in this order, by visual weight:

1. **Description — DOMINANT.** Largest body text, highest contrast (e.g. ~`text-base`/`text-lg`,
   `text-gray-50`), most breathing room. This is the entry point. (Today it's only `text-[15px]`
   `text-gray-200` — barely above everything else.)
2. **Incident Report — SECONDARY.** Clearly subordinate to Description but still prominent:
   the `userReport` is the lead line; keep the amber warning treatment but lighter than today.
3. **Repro steps, visible logs, success criteria, investigation notes — COMPRESSED &
   DE-EMPHASIZED.** Smaller, lower-contrast, tighter spacing, gray. Consider making
   repro/logs collapsible (progressive disclosure) so they don't compete on first glance.

The failure mode to fix: every section currently shares the same
`text-sm font-semibold uppercase` header + colored bar + bordered box, so all sections read at
equal weight. Break that sameness — only the things that matter most get size/contrast/color.

## One iteration

Pick ONE target (rotate via `loop-log.md`):

- **Target A — Left-panel hierarchy** (`ProblemColumn.tsx`): make Description dominant, Incident
  Report secondary, the rest compressed/de-emphasized per the spec above. One coherent pass over
  the bugfix branch of the panel.
- **Target B — Panel width** (`app/interview/page.tsx` ~line 5128): the left column is pinned at
  `260px / 280px / 320px` in
  `lg:grid-cols-[260px_minmax(0,1fr)_240px] xl:[280px...] 2xl:[320px...]`. Widen it (e.g.
  `320px / 360px / 400px`) so description + incident + logs are readable, while keeping the
  center editor (`minmax(0,1fr)`) usable. Verify nothing overflows at lg/xl/2xl.
- **Target C — Color reduction** (any one workspace component): collapse one component's accent
  colors toward the table above — demote a decorative per-section hue to gray, or move a misused
  red/blue to its correct functional role. One component per iteration.

Steps: read the target + `lib/design-tokens.ts`; identify the single biggest hierarchy/color
gap; fix exactly that with tokens/Tailwind and existing `components/ui/` primitives; keep
behaviour unchanged; reason through a11y (contrast against the dark theme, focus, keyboard).

**Gates:** `pnpm typecheck`, `pnpm lint`, `pnpm build` (catches layout/className breakage),
focused test if one exists.

**Commit** (e.g. `ui(interview): make Description dominant, compress repro/logs in ProblemColumn`),
append `{ target, gap, fix, a11y_notes, screens_checked }` to `loop-log.md`. Set
`needs_human_review: true` for any change that meaningfully alters layout structure or the color
system — those deserve a human eye on a screenshot.

## Hard NEVERs

- Never change behaviour/logic or copy — layout, sizing, weight, spacing, and color only.
- Never add a NEW accent hue. Reduce toward the table; don't expand it.
- Never refactor toward `Design.md` (the active system is `lib/design-tokens.ts`).
- Never collapse hierarchy by making everything uniform again — exactly one element dominates.
- Never sacrifice contrast/readability to hit an aesthetic; this is a tool, legibility wins.

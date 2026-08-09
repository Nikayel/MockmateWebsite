# CodeSparring brand assets

Everything is SVG — infinitely scalable, no raster exports needed.

## Contents

```
brand/
  icon/         sparra-icon.svg            primary app icon / favicon (gradient)
                sparra-icon-mono-light.svg light chip, dark face — one-color contexts
                sparra-icon-mono-dark.svg  dark chip, light face
                sparra-icon-16.svg         <20px variant (grin removed for legibility)
  logo/         logo-horizontal-dark-bg.svg   primary lockup, for dark backgrounds
                logo-horizontal-light-bg.svg  primary lockup, for light backgrounds
                logo-stacked-dark-bg.svg      stacked, for square spaces
                logo-stacked-light-bg.svg
                logo-mono-white.svg           one-color print (white ink)
                logo-mono-black.svg           one-color print (black ink)
  characters/   sparra-default.svg  sparra-pass.svg  sparra-fail.svg
                sparra-thinking.svg sparra-streak.svg sparra-scoring.svg
  animated/     sparra-idle.svg     self-contained animated icon (works in <img>)
                sparra-scoring.svg  10s determinate scoring ring (works in <img>)
                sparra.css          keyframes + state classes for in-app use
  marks/        flux · duel · core · orbit · pulse · seam  (alternate symbols)
favicon.svg     copy of the primary icon
```

## Usage

**Favicon**
```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```

**Nav lockup**
```html
<img src="/brand/logo/logo-horizontal-dark-bg.svg" alt="CodeSparring" height="32">
```

**Animated idle (zero JS)**
```html
<img src="/brand/animated/sparra-idle.svg" alt="" width="32" height="32">
```

**Stateful Sparra (in-app)** — inline the character SVG, import `sparra.css`, drive with `data-state`:
```jsx
// state: "idle" | "thinking" | "pass" | "fail" | "streak"
<span className="sparra" data-state={state}>
  <SparraSvg />
</span>
```
Reactions are one-shot: set `pass`/`fail`, then reset to `idle` on `animationend`.
For blink and thinking-dots, add `sparra-eyes-open` / `sparra-eyes-shut` / `sparra-dot`
class names to the corresponding groups in your inlined SVG.

## State → event map

| State | Fires on |
|---|---|
| idle | nav avatar, dashboard greeting, empty states, favicon |
| thinking | interviewer composing, test run in flight, code executing |
| scoring | the ~10s evaluation wait after a submission — grading in progress |
| pass | suite green, lesson complete, submission accepted |
| fail | failing assertion, runtime error, timed-out session |
| streak | streak milestone, module finished, level unlocked |

Rules: one Sparra on screen at a time · reactions fire once then return to idle ·
transforms and opacity only · all motion disabled under `prefers-reduced-motion` ·
never animate during an active timed interview.

## Color

```
Ember gradient   #ffb347 → #ff8a3d → #e0552a
Face ink         #2a1206
Ink (light text) #f2efe8      Void (dark bg) #0e0d0c
Pass  #7dd6a8 → #2f9f6d       Fail #f0998a → #c9483a
Think #ffd27a → #e09a2a       Streak #c3a4f0 → #7b4fc9
Score #8ab4f0 → #3b6fc9       Score face ink #07162e
```

## Scoring state (10s wait)

Distinct from `thinking` on purpose: thinking is indeterminate and amber, scoring is
**determinate** and blue. The closing ring tells the user the wait is bounded, which is
what stops a 10s pause from reading as a hang.

```html
<!-- zero-JS version -->
<img src="/brand/animated/sparra-scoring.svg" alt="Scoring your submission" width="72" height="72">
```

```jsx
// in-app: ring length must match your circle's circumference (2πr)
<span className="sparra" data-state="scoring" style={{ "--sparra-score-duration": "10s" }}>
  <SparraScoringSvg />   {/* ring circle needs className="sparra-ring", eyes group "sparra-eyes" */}
</span>
```

If real scoring can exceed the estimate, hold the ring at ~95% rather than completing it,
and only close it when the result actually lands. Never let it finish before the answer does.

## Clear space & minimum size
- Clear space on all sides = the icon's corner radius (17/64 of icon width).
- Lockup gap = 25% of icon width.
- Minimum icon: 16px. Below 20px use `sparra-icon-16.svg` (no grin).

## Wordmark note
The lockup SVGs set the wordmark in **Geist SemiBold (600)** as live `<text>`.
That renders correctly anywhere Geist is loaded (your app, your site).
**Before sending to print or an external party, convert the text to outlines** —
otherwise it falls back to system-ui on machines without Geist.

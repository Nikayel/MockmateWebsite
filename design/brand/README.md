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
                sparra-scoring.svg  determinate scoring ring (works in <img>)
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
| scoring | the evaluation wait after a submission — grading in progress |
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

## Scoring state

Distinct from `thinking` on purpose: thinking is indeterminate and amber, scoring is
**determinate** and blue. The ring tells the user the wait is bounded, which is what stops a
long pause from reading as a hang.

**The ring reports progress. It does not run a clock.** Pass `progress` (0..1) derived from
real signals — phase events, milestones, whatever the work actually emits — and the ring
advances when the work advances. It closes to 100% at the instant the result lands, and the
close *is* the arrival.

```jsx
<Sparra state="scoring" size={88} progress={progress} label="Scoring your submission" />
```

There is a timer-driven fallback (`scoreDurationMs`) for callers with no signal at all. It
paces the wait and deliberately stops short of closing, because a clock cannot know when the
work ends — a ring that reaches 100% while the answer is still being computed is a lie, and
that is the one thing this state must never do. Prefer wiring a real signal; reach for the
timer only when there genuinely isn't one.

```html
<!-- zero-JS version, timer-paced. These assets carry their own <style> element:
     external CSS never applies inside an <img>. -->
<img src="/brand/animated/sparra-scoring.svg" alt="Scoring your submission" width="72" height="72">
```

Never put `calc()` and `var()` together in an animated property. Blink leaves a `calc()`
containing a `var()` unresolved and silently degrades the animation to *discrete* — the ring
holds empty for half the duration, then snaps. It looks fine in Safari, which is how it
survived. `components/brand/__tests__/sparra-motion.test.ts` guards this.

## Clear space & minimum size
- Clear space on all sides = the icon's corner radius (17/64 of icon width).
- Lockup gap = 25% of icon width.
- Minimum icon: 16px. Below 20px use `sparra-icon-16.svg` (no grin).

## Wordmark note
The lockup SVGs set the wordmark in **Geist SemiBold (600)** as live `<text>`.
That renders correctly anywhere Geist is loaded (your app, your site).
**Before sending to print or an external party, convert the text to outlines** —
otherwise it falls back to system-ui on machines without Geist.

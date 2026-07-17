> Module **6.4** (Refs & Timing) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [6.3](./l6-avoid-effects.md) · Next: [6.5](./l6-effect-event-custom-hooks.md)

# L6 · Refs & Timing

Two effect nuances separate people who "use hooks" from people who reason about them: a ref lets an effect read fresh state without re-subscribing (the latest-ref pattern), and `useLayoutEffect` runs before paint while `useEffect` runs after (the flicker fix). After this module you can catch a timer that resets on every keystroke and a tooltip that flashes at the wrong spot for one frame, and say exactly why each happens at the React-mechanism level.

### ajr-l6-latest-ref-pattern: Refs and the latest-ref pattern

- **id:** `ajr-l6-latest-ref-pattern`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, refs, latest-ref

#### Learn

You have a `setInterval` that should fire every `delay` ms and, on each tick, run the latest `callback`. The naive version puts `callback` in the effect deps so the tick sees a fresh closure:

```tsx
function useInterval(callback: () => void, delay: number) {
  useEffect(() => {
    const id = setInterval(() => callback(), delay);
    return () => clearInterval(id);
  }, [callback, delay]); // BUG: callback in deps
}
```

The trap is that `callback` is almost always a fresh function every render. If the parent does `useInterval(() => setTick(count + 1), 1000)`, that arrow is a brand-new reference on every render. A new reference means the effect's dependency array changed, so React tears down the old interval (`clearInterval`) and starts a new one (`setInterval`) on every render. If the parent re-renders on every keystroke in some unrelated input, your "1 second" timer never gets to complete a full second: it keeps resetting to zero. The cadence stutters and drifts.

The root need is a contradiction: you want the *timer* to depend only on `delay`, but you want the *callback it runs* to always be the latest one. State is reactive (reading it subscribes you), and that is exactly what forces the re-subscribe. A ref bridges the gap. A ref is a mutable box whose `.current` you can read and write without subscribing to anything: mutating it does not trigger a render, and reading it is not tracked as a dependency. So you keep the latest callback in a ref, sync it in its own effect, and read `ref.current` inside the interval:

```tsx
function useInterval(callback: () => void, delay: number) {
  const callbackRef = useRef(callback);

  // sync: runs after every render, keeps the box fresh
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // timer: depends ONLY on delay, reads the latest callback each tick
  useEffect(() => {
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

Now the interval effect only re-runs when `delay` changes. Every tick calls `callbackRef.current()`, which is whatever the most recent render put in the box, so the callback stays fresh without the timer ever resetting. The callback escaped the dependency graph on purpose.

Two rules keep this safe. Sync the ref in an effect (the commit phase), not in the render body: writing refs during render is a side effect that can run twice under Strict Mode or during a discarded concurrent render, and reading a ref during render can give you a stale or torn value. And do not read `callbackRef.current` during render to compute JSX; refs are for escaping reactivity in effects and handlers, not for feeding render output.

**Interview nuance:** the modern answer is `useEffectEvent` (the Effect Event API), which packages exactly this "read latest, do not re-subscribe" pattern. If you hand-roll a `latest-ref` today, mention that `useEffectEvent` is the intended replacement so the interviewer knows you understand *why* the pattern exists, not just the boilerplate.

Recap: a fresh callback in effect deps re-subscribes the timer every render; a ref read escapes deps because mutation does not render and reads are not tracked; sync the ref in its own effect, call `ref.current()` in the timer, never read/write refs during render.

#### See it live

**Demo (react-demo):** a `useInterval` counter running two ways side by side (naive `callback`-in-deps vs latest-ref), with a text input above them that forces parent re-renders on every keystroke.

A widget with a text input at the top labeled "type here to force re-renders" and two counter cards below it: **A) naive (callback in deps)** and **B) latest-ref**. Each card shows a big tick count that should climb once per second, plus a small "timer resets" badge that increments every time that card's interval effect re-runs (tears down and recreates). Both cards use the same 1000ms delay. The component the widget is built around:

```tsx
function useIntervalNaive(callback: () => void, delay: number, onReset: () => void) {
  useEffect(() => {
    onReset();                       // count how often the timer resets
    const id = setInterval(callback, delay);
    return () => clearInterval(id);
  }, [callback, delay]);             // A) fresh callback => resets every render
}

function useIntervalLatest(callback: () => void, delay: number, onReset: () => void) {
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; }, [callback]);
  useEffect(() => {
    onReset();
    const id = setInterval(() => cbRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);                       // B) resets only when delay changes
}
```

**Watch:** leave both cards alone and both count up once per second. Now type quickly in the input. Card A's tick stalls: its "timer resets" badge shoots up with every keystroke because each parent render passes a new `callback` reference, so the interval clears and restarts before it ever completes a second. Card B keeps ticking at a steady one-per-second cadence and its "timer resets" badge stays at 1, because its timer depends only on `delay` while still running the freshest callback. This is real React behavior: it proves that reference-identity of the callback drives the re-subscribe, and that the ref read breaks that link while keeping values fresh.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write a `useInterval(callback, delay)` that runs the latest `callback` each tick but only resets the timer when `delay` changes, and explain why putting `callback` in the interval deps is wrong.

**Think about:**
- Why does a ref read escape the dependency graph?
- Where do you sync the ref?
- Why avoid reading/writing refs during render?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Putting `callback` in the interval deps is wrong because `callback` is a fresh function reference on nearly every render (inline arrows, or handlers that close over changing state). React compares deps with `Object.is`; a new reference means the deps changed, so the effect cleanup runs (`clearInterval`) and the effect re-runs (`setInterval`) on every render. If anything re-renders the parent frequently (a keystroke, a sibling timer), the interval never survives long enough to fire on schedule, so the cadence stutters and resets.

Corrected hook:

```tsx
function useInterval(callback: () => void, delay: number) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;   // sync the box in commit, not render
  }, [callback]);

  useEffect(() => {
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);                        // timer depends only on delay
}
```

**WHY at the mechanism level:** a ref is a stable, mutable container that lives across renders. Mutating `callbackRef.current` does not schedule a render, and reading it is not tracked as a reactive dependency, so it deliberately sits outside React's dependency graph. That is exactly what lets the timer effect depend only on `delay` while the tick still pulls the freshest callback from the box. The sync effect runs after every commit, so the box always holds the latest closure by the time the next tick fires.

**How to spot it in review:** a hand-rolled `xxxRef.current = xxx` inside a component that feeds an effect, or a function prop/state value listed in a `setInterval`/`setTimeout`/subscription effect's deps. When you see it, ask whether `useEffectEvent` expresses the intent more cleanly, and confirm the ref is written in an effect, not the render body.

**Production symptom:** timers, animations, polling loops, and WebSocket keep-alives that reset and stutter whenever some unrelated state changes; a "1 second" interval that never completes a full second while a user is typing; drifting or dropped ticks under load.

**Common misconception corrected:** "to read fresh values in an effect you must add them to the deps." No. Adding them to deps re-runs the whole effect (re-subscribing the timer) just to get fresh values. The latest-ref pattern (or `useEffectEvent`) reads fresh values without re-subscribing, which is usually what you actually want for a callback that should not own the timer's lifecycle.

**Self-check rubric:**
- [ ] I said a fresh `callback` reference changes the deps and re-subscribes the timer each render.
- [ ] My timer effect deps are `[delay]` only.
- [ ] I sync the ref inside its own effect, not in the render body.
- [ ] I explained a ref escapes deps because mutation does not render and reads are not tracked.
- [ ] I mentioned `useEffectEvent` as the modern replacement.

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a live Trading Dashboard, `usePolling(fetchQuotes, intervalMs)` refetches prices on an interval, and `fetchQuotes` closes over the currently selected symbol from state. Users report that while they scrub a symbol filter (rapid state changes), the price feed freezes and the poll interval drifts. Diagnose it and rewrite `usePolling` so the poll cadence is fixed while each poll uses the latest symbol, and say how you would make it robust if `intervalMs` itself can change.

**Model answer (revealed on demand):**

`fetchQuotes` closes over the selected symbol, so it is a new function every time the symbol changes. If `usePolling` lists `fetchQuotes` in its interval deps, every scrub keystroke tears down and recreates the interval, so a poll almost never completes before the next reset. The feed freezes and the cadence drifts because the timer keeps restarting from zero.

Rewrite with the latest-ref pattern so the poll callback is read fresh but the timer lifecycle is owned by `intervalMs` alone:

```tsx
function usePolling(poll: () => void, intervalMs: number) {
  const pollRef = useRef(poll);
  useEffect(() => { pollRef.current = poll; }, [poll]);

  useEffect(() => {
    const id = setInterval(() => pollRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
```

Now scrubbing the symbol updates `pollRef.current` via the sync effect without touching the interval, so the cadence stays fixed and every poll fetches the latest symbol. When `intervalMs` changes (say the user switches from 1s to 5s refresh), the timer effect re-runs on purpose and reinstalls a correctly-spaced interval, which is the one case you *do* want a reset.

For robustness at scale: guard against overlapping in-flight requests (skip a tick if the previous fetch is still pending, or abort it with an `AbortController` so a slow symbol does not stack requests), and pause polling when the tab is hidden via the Page Visibility API to stop burning quota and rate limit. If you reach for `useEffectEvent`, wrap the poll body in it so the "read latest selection, then fetch" step is expressed as an Effect Event and the interval effect lists only `[intervalMs]`.

**Production symptom:** a frozen or stuttering live feed while the user interacts with unrelated controls, drifting refresh timing, and (if requests overlap) a thundering herd of stale in-flight fetches that spikes API cost and can display out-of-order prices.

---

### ajr-l6-uselayouteffect-vs-useeffect: useLayoutEffect vs useEffect timing

- **id:** `ajr-l6-uselayouteffect-vs-useeffect`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, useLayoutEffect, layout

#### Learn

You render a tooltip, then measure its height so you can flip it *above* the cursor when it would overflow the bottom of the screen. You write the measure-and-reposition in `useEffect`, and it flickers: for one frame the tooltip paints at the wrong spot, then snaps into place. That flicker is a timing bug, and the fix is choosing the right effect.

React commits an update in a precise order:

1. **Commit:** React applies DOM mutations (the tooltip is now in the DOM at its initial position).
2. **`useLayoutEffect`:** runs synchronously, *before the browser paints*. The DOM is mutated and measurable here, and any style changes you make are batched into the same paint.
3. **Paint:** the browser draws the frame to the screen.
4. **`useEffect`:** runs *asynchronously, after paint*.

Here is the flickering version:

```tsx
function Tooltip({ x, y }: { x: number; y: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(y);

  useEffect(() => {                         // runs AFTER paint
    const h = ref.current!.offsetHeight;    // measure
    if (y + h > window.innerHeight) setTop(y - h); // flip above
  }, [x, y]);

  return <div ref={ref} style={{ position: "fixed", left: x, top }}>...</div>;
}
```

The sequence: React commits the tooltip at `top = y`, the browser *paints it there* (one wrong frame, the user sees it below the cursor overflowing the edge), then `useEffect` runs, measures, calls `setTop(y - h)`, which triggers a second render and a second paint at the correct spot. The eye catches that first wrong frame as a flash or jump.

Switch the measure-and-reposition to `useLayoutEffect` and the wrong position never reaches the screen:

```tsx
useLayoutEffect(() => {                     // runs BEFORE paint
  const h = ref.current!.offsetHeight;
  if (y + h > window.innerHeight) setTop(y - h);
}, [x, y]);
```

Now React commits, `useLayoutEffect` runs synchronously, measures, and calls `setTop`. React re-renders and re-commits *before yielding to the browser*, so the browser's first paint already shows the corrected position. No wrong frame, no flicker.

The rule for when you *must* use `useLayoutEffect`: any time you read layout (measure size/position via `offsetHeight`, `getBoundingClientRect`, scroll position) and then synchronously write to the DOM or state based on that measurement, where a wrong intermediate frame would be visible. Tooltips, popovers, autosizing textareas, scroll restoration, and measuring-then-positioning all qualify.

Why not use it everywhere as a "more reliable `useEffect`"? Because `useLayoutEffect` is *blocking*: it runs synchronously before paint, so heavy work in it delays the frame and jank the UI. `useEffect` runs after paint and lets the browser show something first, which is what you want for data fetching, subscriptions, logging, and anything non-visual. There is also an SSR consideration: `useLayoutEffect` cannot run on the server (there is no layout to read), so React warns "useLayoutEffect does nothing on the server" during hydration. Guard it (render a stable first frame, or use an isomorphic wrapper) so server and client markup match.

**Interview nuance:** the tell of a strong answer is naming the exact order "commit, layout effect, paint, passive effect" and stating that `useLayoutEffect` blocks paint. Saying "layout effect is just synchronous" is half-right; the load-bearing detail is *synchronous before paint*, which is why it kills the flicker and why overusing it costs frames.

Recap: commit then `useLayoutEffect` (blocking, pre-paint) then paint then `useEffect` (post-paint); measure-then-mutate belongs in `useLayoutEffect` so no wrong frame paints; keep it out of the hot path and guard for SSR because it does not run on the server.

#### See it live

**Demo (react-demo):** a tooltip near the bottom of a viewport that measures its height and flips above the cursor, rendered two ways (A: `useEffect`, B: `useLayoutEffect`), with a slow-motion paint-timeline strip below.

A widget with a "Show tooltip near bottom edge" button and a toggle **A) useEffect · B) useLayoutEffect**. When triggered, a tooltip appears just above the bottom edge so it must flip upward. Below the stage is a horizontal **paint timeline** strip with labeled ticks: `commit`, `layout effect`, `paint 1`, `effect`, `paint 2`. The active variant highlights which paint shows the tooltip in its final (flipped) position. The measure-and-flip logic the widget is built around:

```tsx
const measureAndFlip = () => {
  const h = ref.current!.offsetHeight;
  if (y + h > window.innerHeight) setTop(y - h);
};
// A) useEffect(measureAndFlip, [x, y])       -> runs after paint 1
// B) useLayoutEffect(measureAndFlip, [x, y]) -> runs before paint 1
```

**Watch:** in variant A the timeline lights up `paint 1` with the tooltip at the *wrong* (overflowing) spot, then `effect`, then `paint 2` snaps it above the cursor; run at normal speed you see a one-frame flash. In variant B the flip happens at `layout effect` before `paint 1`, so `paint 1` already shows the corrected position and there is no `paint 2` flash. Honesty note: the timeline strip and the slow-motion replay are *illustrated* to make single-frame timing visible; the ordering it depicts (commit, layout effect, paint, passive effect) and the flicker-vs-no-flicker outcome are real React and browser behavior, not a simulation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Switch the measure-and-reposition to `useLayoutEffect` for a tooltip that measures its height then repositions in `useEffect` and flickers at the wrong spot for one frame, explain the frame-by-frame difference, and note the SSR warning.

**Think about:**
- What is the order: commit, layout effect, paint, effect?
- When must you use `useLayoutEffect`?
- Why not use it everywhere?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The flicker comes from `useEffect` running *after* paint. React commits the tooltip at its initial (wrong) position, the browser paints that frame (the user sees it overflowing the edge), then `useEffect` runs, measures, calls `setTop`, and a second render paints the corrected position. The visible wrong frame between those two paints is the flicker.

Move the measure-and-reposition into `useLayoutEffect`:

```tsx
function Tooltip({ x, y }: { x: number; y: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(y);

  useLayoutEffect(() => {
    const h = ref.current!.offsetHeight;
    if (y + h > window.innerHeight) setTop(y - h);
  }, [x, y]);

  return <div ref={ref} style={{ position: "fixed", left: x, top }}>...</div>;
}
```

**WHY at the mechanism level:** the commit order is commit, then `useLayoutEffect` (synchronous, *blocking*, before paint), then paint, then `useEffect` (asynchronous, after paint). `useLayoutEffect` reads `offsetHeight` and calls `setTop` before the browser has painted, so React re-renders and re-commits the corrected position within the same frame. The browser's first paint already shows the flipped tooltip. The wrong position is computed and discarded before it ever reaches the screen.

**How to spot it in review:** a DOM measurement (`offsetHeight`, `getBoundingClientRect`, `scrollHeight`, scroll position) followed by a style write or `setState` that moves/sizes an element, all sitting inside a plain `useEffect`. The inverse smell is heavy, non-visual, or async work (fetch, subscribe, log) inside a `useLayoutEffect`, which needlessly blocks paint.

**Production symptom:** a one-frame flash or jump before UI settles: tooltips/popovers that appear at the wrong spot then snap, autosizing inputs that jump height, scroll position that lurches on mount, layout that visibly "settles" after load.

**Common misconception corrected:** "`useLayoutEffect` is a more reliable `useEffect` I should default to." No. It is blocking and runs before paint, so it delays every frame it is in and can jank the UI; it also does not run during SSR (React warns "useLayoutEffect does nothing on the server"), causing hydration mismatches if you are not careful. Default to `useEffect`; reach for `useLayoutEffect` only when a wrong intermediate frame would otherwise be visible.

**Self-check rubric:**
- [ ] I named the order: commit, layout effect (pre-paint), paint, effect (post-paint).
- [ ] I explained the flicker as a visible paint at the wrong position before the corrective render.
- [ ] My fix uses `useLayoutEffect` for the measure-and-reposition.
- [ ] I said `useLayoutEffect` is blocking and should not be the default.
- [ ] I noted the SSR warning / hydration concern.

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a server-rendered Docs site, a `<CodeBlock>` auto-scrolls the highlighted line into view and measures a line-number gutter width on mount using `useLayoutEffect`. It works in the browser but the Next.js build logs "useLayoutEffect does nothing on the server" and the first client paint shows an un-scrolled block that jumps. Explain the SSR constraint and give a strategy that keeps the no-flicker behavior on the client without the server warning or a hydration mismatch.

**Model answer (revealed on demand):**

`useLayoutEffect` cannot run on the server because there is no DOM to measure and no paint to block, so React skips it during SSR and warns. The server therefore emits the *un-scrolled, un-measured* markup. On the client, hydration renders that same initial markup (to match the server and avoid a mismatch), paints it, and only then, on a subsequent commit, does the layout effect run and scroll/size. That post-hydration correction is the jump you see.

Strategy: render a stable, measurement-free first frame on both server and client, then apply the layout work only after the component has mounted on the client. A common isomorphic pattern is a `useIsomorphicLayoutEffect` that is `useLayoutEffect` in the browser and `useEffect` on the server, which silences the warning:

```tsx
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
```

That alone stops the warning but does not stop the jump, because the server markup is still un-scrolled. To also kill the visible jump, make the first frame *intentionally neutral*: render the code block without the scroll offset (or with the highlighted line already near the top via a server-computable estimate), and gate the visual correction behind a `mounted` flag so the browser's first paint after hydration is already acceptable. Where the correction is unavoidable and small, suppress the flash by keeping the element visually stable (for example reserve the gutter width with CSS `ch` units so no measurement is needed for width, and only use the layout effect for the scroll).

The principle: `useLayoutEffect` guarantees no-flicker *only within a single client render pass*; it cannot reach back to the server's paint. So for SSR you either make the server's first frame correct-enough without measurement, or you accept that measurement-driven positioning is a client-only concern and design the initial markup so its correction is invisible.

**Production symptom:** a console/build warning on every SSR page using the component, plus a first-paint jump or scroll lurch after hydration on real page loads (worse on slow devices where hydration is delayed), and in the worst case a hydration mismatch error if the layout effect changes DOM structure rather than just scroll/style.

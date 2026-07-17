> Module **8.5** (Big Lists & Transitions) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [8.4](./l8-context-selectors.md) · Next: [8.6](./l8-code-splitting-bundle.md)

# L8 · Big Lists & Transitions

Big lists and typing over them are where React apps visibly stall: 50k DOM nodes tank mount and scroll, and a filter that re-renders the whole list on every keystroke drops characters. After this module you can catch the three review comments that separate a smooth list from a frozen tab, "this `.map`s an unbounded list into rich rows," "this heavy update runs in `onChange` with no transition," and "this `useDeferredValue` is being treated as a debounce," and you can predict, fix, and demo each one at the DOM-node, scheduler, and commit level.

### ajr-l8-virtualization: List virtualization (windowing)

- **id:** `ajr-l8-virtualization`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, virtualization, performance

#### Learn

A browser does not care that React is efficient about diffing. If you mount 50,000 rows, the DOM holds 50,000 elements, layout has to size all of them, the compositor tracks all of them, and memory holds all of them. Mount takes seconds, the first scroll janks while the browser recalculates layout, and every re-render walks a giant tree. React's reconciler is fast, but it cannot make the browser cheap at 50k nodes.

Virtualization (windowing) breaks the assumption that "in the list" means "in the DOM." At any moment the user can only see maybe 20 rows. So you render only the rows whose vertical position intersects the scroll viewport, plus a few extra above and below (overscan) so a fast scroll does not flash blank. Everything else is not in the DOM at all. To keep the scrollbar honest, you render one tall spacer element whose height equals the total height of all rows, and you absolutely position the visible window at its correct offset inside that spacer.

```tsx
function VirtualList({ rows }: { rows: Row[] }) {
  const ROW_H = 40;
  const [scrollTop, setScrollTop] = useState(0);
  const viewportH = 400;
  const overscan = 5;

  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - overscan);
  const visibleCount = Math.ceil(viewportH / ROW_H) + overscan * 2;
  const last = Math.min(rows.length, first + visibleCount);
  const slice = rows.slice(first, last);

  return (
    <div style={{ height: viewportH, overflow: "auto" }}
         onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: rows.length * ROW_H, position: "relative" }}>
        {slice.map((row, i) => (
          <div key={row.id}
               style={{ position: "absolute", top: (first + i) * ROW_H,
                        height: ROW_H, width: "100%" }}>
            {row.label}
          </div>
        ))}
      </div>
    </div>
  );
}
```

The whole trick is `first` and `last`: derive the window from `scrollTop`, render `rows.slice(first, last)`, and let the spacer own the scroll height. Now the DOM holds ~30 nodes no matter whether the list is 500 rows or 5 million.

Fixed `ROW_H` is the easy case. Real rows have variable heights (wrapped text, images, expandable content), and you cannot compute an absolute offset without knowing every prior row's height. That is why real virtualizers (`@tanstack/react-virtual`, `react-window`) either take an `estimateSize` and correct as rows mount and are measured, or measure via a `ResizeObserver` and cache heights. The estimate keeps the scrollbar roughly right before measurement; the correction fixes it after.

**Interview nuance:** virtualization is not free. The rows that are not in the DOM do not exist for the browser's find-in-page (Ctrl-F), for screen readers walking the accessibility tree, or for `#anchor` links and `scrollIntoView`. If someone deep-links to row 8000, it is not mounted, so the browser cannot scroll to it. You handle these deliberately: programmatic scroll to index, a "search this list" input that filters rather than relying on Ctrl-F, and ARIA `aria-setsize`/`aria-posinset` so assistive tech knows the true count.

Recap: render only the viewport window plus overscan, back it with a full-height spacer, estimate-and-measure variable heights, and own the a11y and find-in-page costs that windowing takes away.

#### See it live

**Demo (react-demo):** a 50k-row list with a "Virtualize" toggle, a live "DOM nodes in list" counter, and an FPS meter that samples `requestAnimationFrame` deltas during an auto-scroll.

The widget renders a 400px scroll container over 50,000 generated rows. A toggle switches between a plain `rows.map(...)` and the windowed version above. An "Auto-scroll" button animates `scrollTop` from top to bottom over 3 seconds. Two badges update live: a DOM-node counter (read via `containerRef.current.querySelectorAll('[data-row]').length`) and an FPS meter.

```tsx
function VirtualizationDemo() {
  const [on, setOn] = useState(false);
  const rows = useMemo(
    () => Array.from({ length: 50000 }, (_, i) => ({ id: i, label: `Row ${i}` })),
    []
  );
  const fps = useFpsMeter();            // samples rAF deltas -> current FPS
  const nodeCount = useDomNodeCount();  // counts [data-row] nodes each frame
  return (
    <>
      <Toggle checked={on} onChange={setOn} label="Virtualize" />
      <Badge>DOM nodes: {nodeCount}</Badge>
      <Badge>FPS: {fps}</Badge>
      {on ? <VirtualList rows={rows} /> : <PlainList rows={rows} />}
    </>
  );
}
```

**Watch:** with the toggle off, mount hangs for a beat, the node counter reads ~50,000, and the FPS meter collapses (single digits) during auto-scroll. Flip it on and the node counter drops to roughly 30, mount is instant, and FPS pins near 60 for the same auto-scroll. The FPS number is a real `requestAnimationFrame` sample from your browser, so it is genuinely measured, not illustrated. The node count is a real `querySelectorAll` of the mounted rows.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Render a 50k-row table without freezing the tab by swapping a plain `.map` for a virtualizer, and handle a variable-height measurement. Given `<table>` with `{rows.map(r => <Row />)}` where each `Row` has wrapping text of unknown height, produce the windowed version and say how you keep the scroll offsets correct when heights are not fixed.

**Think about:**
- What is actually mounted with virtualization?
- Why do variable heights need measurement?
- What does it break (find, a11y, anchors)?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Only the visible window plus overscan is ever mounted, so the DOM holds tens of nodes instead of tens of thousands. The fix is to derive a window from `scrollTop`, render only that slice, and back it with a full-height spacer so the scrollbar still represents the whole list. With variable heights you cannot hardcode `ROW_H`, so you give the virtualizer an estimate and let it measure real rows as they mount.

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualTable({ rows }: { rows: Row[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,          // guess before measurement
    overscan: 8,
    measureElement: (el) => el.getBoundingClientRect().height, // real height
  });
  return (
    <div ref={parentRef} style={{ height: 400, overflow: "auto" }}
         role="grid" aria-rowcount={rows.length}>
      <div style={{ height: v.getTotalSize(), position: "relative" }}>
        {v.getVirtualItems().map((item) => (
          <div key={rows[item.index].id}
               data-index={item.index}
               ref={v.measureElement}          // measured on mount
               role="row" aria-rowindex={item.index + 1}
               style={{ position: "absolute", top: 0, left: 0, width: "100%",
                        transform: `translateY(${item.start}px)` }}>
            {rows[item.index].content}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Why at the mechanism level:** the browser's cost is O(mounted nodes), not O(list length). Layout, paint, compositing, and memory all scale with what is in the DOM. Windowing caps the mounted count, so mount and scroll stay flat as the list grows. Variable heights break the "offset = index * height" math, so a real virtualizer maintains a running measurement cache: `estimateSize` positions rows before they mount, then `measureElement` (via ref or `ResizeObserver`) corrects `getTotalSize()` and each `item.start` once a row's true height is known. That is why the scrollbar can "settle" slightly as you scroll into unmeasured territory.

**How to spot it in review:** a `.map` over an unbounded, user-controlled list (search results, feed, log viewer) rendering rich rows with no window. The tell is that list length comes from data, not from a viewport.

**Production symptom:** multi-second mount, a frozen tab on first paint, and janky (single-digit FPS) scrolling that gets worse as the dataset grows.

**Common misconception:** "virtualization is free, just wrap the list." It removes off-screen rows from Ctrl-F, from the screen-reader tree, and from anchor/`scrollIntoView` targeting. You must add programmatic scroll-to-index, in-app search, and `aria-rowcount`/`aria-rowindex` (as above) to pay those costs back deliberately.

**Self-check rubric:**
- [ ] Only a viewport window (+overscan) is mounted, not the full list.
- [ ] A full-height spacer preserves the real scrollbar.
- [ ] Variable heights use estimate + measurement, not a hardcoded row height.
- [ ] Keys are stable per-row ids, not array indices.
- [ ] The answer names at least one broken affordance (Ctrl-F, a11y tree, or anchors) and its remedy.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Slack channel with 200k messages." You virtualize the message list, but users report two bugs: (1) jumping to a permalinked message deep in history scrolls to the wrong place, and (2) images loading in scrolled-past messages make the scrollbar "jump." Diagnose both at the measurement level and fix them.

**Model answer (revealed on demand):**

Both bugs come from the same root: with variable heights, the virtualizer only knows the true height of rows it has measured, and it estimates the rest.

Bug 1 (permalink lands wrong): to scroll to message index N, the virtualizer sums the heights of rows 0..N-1. For unmeasured rows it uses `estimateSize`, so if messages are taller than the estimate on average, the computed offset is short and you land above the target. Fix: after `scrollToIndex(N, { align: 'center' })`, do not treat the first scroll as final. Rows between the current position and N now mount and measure, which shifts the total size, so you re-run `scrollToIndex` on the next frame (or use the library's built-in `scrollToIndex` that already re-anchors after measurement). Also pin the anchor: keep scrolling toward N until `item.start` for N stops changing.

```tsx
useLayoutEffect(() => {
  if (targetIndex == null) return;
  v.scrollToIndex(targetIndex, { align: "center" });
  // re-anchor after newly mounted rows measure and shift totals
  const id = requestAnimationFrame(() => v.scrollToIndex(targetIndex, { align: "center" }));
  return () => cancelAnimationFrame(id);
}, [targetIndex]);
```

Bug 2 (scrollbar jumps on image load): an image above the viewport finishes decoding, its row grows, `getTotalSize()` increases, and every row below shifts down, so the content under the user's cursor jumps. Fix: reserve space so the height does not change on load. Give images explicit `width`/`height` (or an `aspect-ratio` box) so the row's measured height is stable before and after the pixels arrive. Where you truly cannot know the size, anchor scroll position to a stable row: on measurement change, adjust `scrollTop` by the delta of heights above the viewport so the visible row stays put (this is scroll anchoring, which `overflow-anchor` does for real DOM but not for absolutely-positioned virtual rows, so you do it manually).

**Mechanism:** the virtualizer's offsets are a prefix sum of per-row heights. Any late height change (measurement correction or image reflow) mutates that prefix sum for everything after it, which is exactly why permalinks miss and scrollbars jump. Stabilize heights up front and re-anchor after measurement, and both disappear.

### ajr-l8-usetransition-responsive: useTransition keeps the UI responsive

- **id:** `ajr-l8-usetransition-responsive`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react19, useTransition, performance

#### Learn

React's default is that every state update is urgent: when you `setState`, React renders and commits synchronously before yielding back to the browser. That is correct for a checkbox. It is a problem when one update is cheap (the character you typed) and another is expensive (re-filtering and re-rendering 20,000 rows), because React lumps them together. You type a key, React re-renders the whole list before it paints your keystroke, and if that render takes 80ms, your input freezes for 80ms per key. Fast typists drop characters.

`useTransition` lets you tell React "this particular update is not urgent." You split state into two tracks. The input value stays urgent so the text field updates instantly on every keystroke. The derived, expensive update (the filtered query that drives the big list) goes inside `startTransition`, which marks it low priority.

```tsx
function SearchableList({ rows }: { rows: Row[] }) {
  const [text, setText] = useState("");     // urgent
  const [query, setQuery] = useState("");   // drives the heavy list
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);                // urgent: input paints now
    startTransition(() => setQuery(e.target.value)); // low priority: list catches up
  }

  const filtered = useMemo(
    () => rows.filter((r) => r.label.includes(query)),
    [rows, query]
  );

  return (
    <>
      <input value={text} onChange={onChange} />
      {isPending && <Spinner />}
      <BigList rows={filtered} />
    </>
  );
}
```

The mechanism is the concurrent scheduler. A transition render is time-sliced: React renders a chunk of work, then checks whether it has run past its frame budget, and if so it yields to the browser by scheduling the continuation as a macrotask (historically a `MessageChannel` postMessage). Between slices, the browser is free to process the next `keydown`, run its own layout, and paint. If a newer keystroke arrives mid-transition, React can throw away the in-progress list render and start over with the newer query, because a transition render is interruptible and its result was never committed. That is the whole point: urgent input and paint slot in between slices of the low-priority list render, so the field never blocks.

`isPending` is the transition's status. It flips true while the low-priority render is outstanding, so you can dim the stale list or show a spinner without blocking anything.

**Interview nuance:** `useTransition` does not make the list render faster. The total work is the same. It changes when that work runs and whether it can be interrupted, so the expensive render stops monopolizing the main thread. Two things people conflate with it: `useTransition` is not `useDeferredValue` (that is the next lesson, and it defers a value you do not own the setter for), and it is not the React Compiler. The Compiler auto-memoizes to skip unnecessary renders; it does nothing about a genuinely expensive render blocking input. A blocking render is still blocking after the Compiler; only concurrency slices it.

Recap: keep input state urgent, wrap the derived heavy update in `startTransition`, show `isPending`, and rely on the scheduler slicing and yielding so keystrokes paint between chunks of the low-priority render.

#### See it live

**Demo (react-demo):** a search input over a 20,000-row list with a render-count and FPS badge, shown twice, "without transition" and "with transition," side by side.

Each panel has the same input and the same artificially heavy `BigList` (each row does a small busy-loop so a full list render costs ~60ms). A badge shows list render count and live FPS while you type. The left panel calls `setQuery` directly in `onChange`; the right panel wraps it in `startTransition` and renders a "pending" badge.

```tsx
// Left panel (blocking)
function onChange(e) {
  setText(e.target.value);
  setQuery(e.target.value);            // urgent + heavy -> input blocks
}

// Right panel (concurrent)
const [isPending, startTransition] = useTransition();
function onChange(e) {
  setText(e.target.value);             // urgent: paints immediately
  startTransition(() => setQuery(e.target.value)); // interruptible, low priority
}
// ...{isPending && <span className="badge">updating…</span>}
```

**Watch:** type quickly in the left field and the caret stutters, characters land late or drop, and FPS dips hard on each key because the 20k-row render happens before the keystroke paints. Type in the right field and the input stays crisp at full FPS while a "updating…" badge shows and the list catches up a beat behind. This is genuinely live React concurrent scheduling in your browser, not an approximation; the only staged part is the deliberate busy-loop that makes each row render expensive enough to see.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Keep the input responsive while filtering a 20k-row list by splitting urgent input state from a transition-wrapped filter update, and show `isPending`. You are given `const [q, setQ] = useState(''); <input value={q} onChange={e => setQ(e.target.value)} /> <BigList rows={rows.filter(r => r.name.includes(q))} />` and typing freezes. Rewrite it and say why the original blocks.

**Think about:**
- What does `startTransition` mark an update as?
- Which state stays urgent?
- What does React do to the event loop to make this work?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The original blocks because a single `q` state is both the input's value and the list's filter key. Every keystroke updates `q` urgently, which forces the 20k-row `BigList` to re-render synchronously before React paints the new character. One state, one priority, so the cheap and the expensive updates are welded together. Split them:

```tsx
function SearchableList({ rows }: { rows: Row[] }) {
  const [text, setText] = useState("");      // urgent: the input
  const [query, setQuery] = useState("");    // low priority: the list filter
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => rows.filter((r) => r.name.includes(query)),
    [rows, query]
  );

  return (
    <>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);                          // paints now
          startTransition(() => setQuery(e.target.value));  // interruptible
        }}
      />
      {isPending && <span aria-live="polite">Updating results…</span>}
      <BigList rows={filtered} />
    </>
  );
}
```

**Why at the mechanism level:** `startTransition` marks the `setQuery` update as a transition, which the concurrent scheduler renders at low priority and time-slices. React renders part of the big list, hits its frame-budget check, and yields to the browser by scheduling the rest as a macrotask. In that gap the browser processes the next `keydown`, and because `setText` is a normal urgent update, the input repaints immediately. If a new keystroke lands mid-transition, React discards the uncommitted list render and restarts with the newer query, so you never wait on stale work. `isPending` is true for as long as that low-priority render is outstanding.

**How to spot it in review:** an `onChange` (or route change, or tab switch) that triggers a heavy list/tree re-render with no `startTransition` and no deferral. The tell is one piece of state feeding both a fast control and an expensive subtree.

**Production symptom:** input lag and dropped characters while a large list re-renders on every keystroke; the field visibly falls behind the user.

**Common misconception:** "the React Compiler will fix this." The Compiler auto-memoizes to skip renders that do not need to happen; it does not make a genuinely needed, genuinely expensive render asynchronous. When the filter actually changes, the list actually has to re-render, and only concurrency (transitions/deferral) keeps that from blocking input.

**Self-check rubric:**
- [ ] Input value is its own urgent state, updated directly in `onChange`.
- [ ] The heavy filter update is wrapped in `startTransition`.
- [ ] `isPending` drives a visible, non-blocking pending indicator.
- [ ] The answer explains yielding to the event loop between render slices.
- [ ] The answer distinguishes transitions from memoization / the Compiler.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Analytics dashboard date-range picker." Changing the range re-runs an expensive client-side aggregation over 100k events and re-renders six charts. You wrap the aggregation in `startTransition`, but the picker still feels laggy and users complain the charts "flicker to empty" mid-drag. Diagnose and fix.

**Model answer (revealed on demand):**

Two separate problems. First, the picker still feels laggy if the *urgent* part is also heavy: if `onChange` runs the aggregation synchronously to derive something before calling `startTransition`, or if the picker itself re-renders a heavy calendar, the urgent path is not actually cheap. The urgent update must be tiny: just store the raw range. Do all aggregation inside the transition.

```tsx
const [range, setRange] = useState(defaultRange);   // urgent, tiny
const [applied, setApplied] = useState(defaultRange);
const [isPending, startTransition] = useTransition();

function onRangeChange(next: Range) {
  setRange(next);                                   // picker updates instantly
  startTransition(() => setApplied(next));          // heavy aggregation keys off `applied`
}
const stats = useMemo(() => aggregate(events, applied), [events, applied]);
```

Second, the "flicker to empty" is a Suspense/reset symptom: if the charts read from a resource that suspends or if you reset chart state to a loading placeholder on every `applied` change, each in-flight transition tears the UI down to empty before the new data commits. Keep the previous results visible while the transition is pending instead of clearing them. Because the old render is still committed until the new one is ready, you dim the charts using `isPending` rather than unmounting them, and if a child suspends you wrap it so React keeps showing the previous content during the transition rather than falling back to the spinner.

**Mechanism:** transitions only help the update they wrap. Any expensive work on the urgent path (aggregating before the transition, a heavy picker re-render) is still synchronous and still blocks, which is why the picker lagged. And a transition keeps the previous committed UI on screen while it prepares the next one, so "flicker to empty" means something is actively resetting to a blank/loading state instead of letting the transition hold the old view. Fix: minimize the urgent update to raw state, aggregate inside the transition, and dim-in-place with `isPending` instead of clearing.

### ajr-l8-usedeferredvalue: useDeferredValue and the deliberately-stale render

- **id:** `ajr-l8-usedeferredvalue`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, useDeferredValue, performance

#### Learn

`useTransition` is for when you own the `setState` call and can wrap it. Sometimes you do not: the value arrives as a prop, or from a hook, or you just want the "keep input crisp" behavior without restructuring your state into two tracks. `useDeferredValue` is for that. You give it a value and it hands you back a copy that is allowed to lag.

```tsx
function Search({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;
  const results = useMemo(() => search(deferredQuery), [deferredQuery]);
  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      <Results items={results} />
    </div>
  );
}
```

Here is exactly what happens on a keystroke. `query` updates urgently. React renders once immediately with `deferredQuery` still holding the *old* value, and commits that. Your input has already painted the new character, and the heavy `Results` shows the previous (stale) list. Then React schedules a second render at low priority where `deferredQuery` catches up to the new `query`; that render is time-sliced and interruptible, just like a transition. When it commits, `isStale` goes false and the results snap to current. The stale window is the gap between those two renders.

That is the mental model that matters: `useDeferredValue` is not a debounce. A debounce is a fixed timer ("wait 300ms after the last keystroke, then run"). `useDeferredValue` has no timer and no fixed delay. If the deferred render is cheap, it catches up almost immediately. If it is expensive and you keep typing, React keeps deferring and interrupting it, so the stale window naturally stretches under load and collapses when you pause. The delay is adaptive to how busy React is, not a constant you set. That is strictly better than a debounce for this job, because a debounce is always either too eager (janks under fast typing) or too laggy (feels slow when idle).

There is a required second half: the child that consumes `deferredValue` must actually be memoized, or the deferral buys you nothing. React renders the deferred pass at low priority, but if `<Results>` is not wrapped in `React.memo` (and fed a memoized `items`), it re-renders on the *urgent* pass too, which is the exact expensive work you were trying to defer. So `useDeferredValue` on the value plus `memo` on the consumer are a pair; one without the other is a no-op or a regression.

**Interview nuance:** always mark the staleness visually with `isStale = value !== deferredValue`. Without it, users see results that silently disagree with the input for a beat and think the app is buggy or the search is wrong. Dimming (or a subtle "updating" cue) turns "why are these results wrong" into "oh, it is catching up." Also: `useDeferredValue` and `useTransition` are the same scheduler underneath; pick `useTransition` when you own the setter and want `isPending`, pick `useDeferredValue` when you only have the value.

Recap: `useDeferredValue` returns a lagging copy, React commits the old value first then re-renders the new one at low priority, the stale window is adaptive (not a fixed debounce), you must memoize the heavy consumer, and you must show `isStale` so the lag reads as intentional.

#### See it live

**Demo (react-demo):** an input feeding a heavy `Results` with a deferred query, showing the live `query` and `deferredQuery` side by side and an `isStale` dim on the results.

The widget has one input. Above the results it prints two live values: `query` (updates on every keystroke) and `deferredQuery` (lags behind under load). The `Results` component is `React.memo`-wrapped and does an artificial busy-loop per render so the deferred pass is visibly slow. When `query !== deferredQuery` the results panel dims to 50% opacity.

```tsx
function DeferredDemo({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;
  const results = useMemo(() => heavySearch(deferredQuery), [deferredQuery]);
  return (
    <>
      <div className="badges">
        <span>query: “{query}”</span>
        <span>deferredQuery: “{deferredQuery}”</span>
      </div>
      <div style={{ opacity: isStale ? 0.5 : 1, transition: "opacity 120ms" }}>
        <Results items={results} />   {/* React.memo, expensive */}
      </div>
    </>
  );
}
```

**Watch:** type quickly and the two badges visibly diverge, `query` races ahead while `deferredQuery` trails by one or more characters, and the results dim while they differ, then snap back to full opacity and match when you pause. Crucially the divergence is not a fixed number of milliseconds: type faster and the gap widens, pause and it closes instantly. This is live React concurrent behavior in your browser; only the per-render busy-loop is staged so the deferred pass is slow enough to see the lag with your eyes.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Let a results list lag behind the input without blocking typing and visually mark staleness with `isStale = query !== deferredQuery`. You are given `<input value={query} onChange={e => setQuery(e.target.value)} /> <Results items={search(query)} />` where `Results` is heavy and typing stutters. Rewrite it with `useDeferredValue`, and explain why this is not a debounce.

**Think about:**
- Is `useDeferredValue` a debounce?
- Where does the stale window come from?
- What must the heavy child also do?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Typing stutters because `search(query)` and the heavy `Results` render run synchronously on every keystroke, on the urgent path, before the input repaints. Defer the value that drives the heavy work and memoize the consumer:

```tsx
function SearchBox() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;
  const results = useMemo(() => search(deferredQuery), [deferredQuery]);
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.5 : 1 }} aria-busy={isStale}>
        <Results items={results} />
      </div>
    </>
  );
}

const Results = React.memo(function Results({ items }: { items: Item[] }) {
  return <ul>{items.map((it) => <li key={it.id}>{it.label}</li>)}</ul>;
});
```

**Why at the mechanism level:** on each keystroke React renders once immediately with `deferredQuery` still equal to the previous value and commits it, so the input paints the new character while `Results` shows the prior list. React then schedules a second, low-priority, interruptible render where `deferredQuery` advances to the current `query`. The stale window is precisely the gap between the committed old-value render and the committed new-value render. It is not a debounce because there is no timer: under fast typing React keeps interrupting and restarting the deferred render, so the lag stretches; when you pause, the deferred render finishes and the lag vanishes. The delay is a function of render cost and typing speed, not a constant. The heavy child must be `React.memo` (with a memoized `items`), otherwise it re-renders on the urgent pass and you deferred nothing.

**How to spot it in review:** `useDeferredValue` wrapped around a value but the consumer is not memoized (so both passes are expensive), or a hand-rolled `setTimeout` debounce being used where the goal is actually "keep input responsive, show a briefly stale list."

**Production symptom (once fixed):** the input stays responsive and the list is briefly stale then updates, instead of the field stuttering and dropping characters.

**Common misconception:** "`useDeferredValue` adds a fixed delay like a 300ms debounce." It adds no fixed delay. The lag is adaptive: near-zero when the deferred render is cheap or you are idle, longer only while React is busy re-rendering under continued input.

**Self-check rubric:**
- [ ] The heavy work keys off `deferredQuery`, not `query`.
- [ ] The consumer is `React.memo` and `items` is memoized.
- [ ] `isStale = query !== deferredValue` drives a visible staleness cue.
- [ ] The explanation names the two renders (old value committed, then new value low-priority).
- [ ] The answer states there is no fixed delay and contrasts with a debounce.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Typeahead over a remote API." A teammate replaces your `useDeferredValue` typeahead with a 300ms `setTimeout` debounce "to reduce API calls," and now the box feels laggy and still fires bursts of requests. Explain why `useDeferredValue` alone was the wrong tool here too, and design the correct combination.

**Model answer (revealed on demand):**

This one has a twist: neither `useDeferredValue` alone nor a debounce alone is right, because there are two different problems being conflated. `useDeferredValue` solves *render* responsiveness (keep the input crisp while a heavy client render catches up). It does nothing about *network* volume, because it re-renders with each new value; if your effect fires a fetch off `deferredQuery`, you still hit the API on essentially every keystroke. A debounce solves *network* volume (wait for a pause before firing) but is a poor tool for render responsiveness, and used as the teammate did it makes the box feel laggy because now even the local UI waits 300ms.

The correct design separates the two concerns:

```tsx
const [query, setQuery] = useState("");
const deferredQuery = useDeferredValue(query);      // keeps local render crisp
const isStale = query !== deferredQuery;

// network: debounce the *request*, not the input state
const debounced = useDebouncedValue(query, 250);
const { data, isFetching } = useQuery({
  queryKey: ["search", debounced],
  queryFn: ({ signal }) => searchApi(debounced, { signal }),  // AbortSignal cancels stale
  enabled: debounced.length > 1,
  placeholderData: keepPreviousData,                 // no flicker to empty
});
```

Input state updates instantly. `useDeferredValue` (or a `memo`'d results list) keeps any heavy client-side rendering of results from blocking typing. A separate debounce plus `AbortSignal` bounds and cancels network requests so you fire once per pause, not per keystroke, and in-flight stale requests are aborted. `keepPreviousData` (or dimming with `isFetching`/`isStale`) avoids the flicker-to-empty.

**Mechanism:** `useDeferredValue` is a scheduler tool (it controls *when React re-renders* and at what priority), not a rate limiter (it does not control *when side effects fire*). A debounce is a rate limiter, not a scheduler. They live on different axes: rendering vs effects. Using one for the other's job is why the box was either janky or laggy. Match each tool to its axis: defer/memoize for render smoothness, debounce plus abort for request volume.

> Module **2.5** (Debounce & Throttle) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [2.4](./l2-cancellation-errors.md) · Next: [3.1](./l3-out-of-order-responses.md)

# L2 · Debounce & Throttle

After this module you will catch the two rate-limiting bugs that survive code review because the code "looks like debounce": a debounce defined inline in a component body that quietly debounces nothing (and reads stale state), and a throttle that drops the final event so the UI settles on the wrong value. You will be able to tell debounce from throttle by their guarantee, not their vibe, and to say exactly which one a given feature needs.

### ajr-l2-debounce-basics-stale: Debounce and its identity/stale-closure bugs

- **id:** `ajr-l2-debounce-basics-stale`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** debounce, identity, react

#### Learn

Debounce means: wait until the events stop, then fire once. The classic use is a search box. You do not want a request per keystroke, you want one request 300ms after the user stops typing. A textbook debounce looks like this:

```js
function debounce(fn, ms) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);           // cancel the pending call
    timer = setTimeout(() => fn(...args), ms);
  };
}
```

The whole mechanism lives in that captured `timer` variable. Each call clears the previous timer and schedules a new one, so only the last call in a burst survives. This works perfectly, and then people drop it into a React component and it stops working, silently.

Here is the trap:

```jsx
function Search() {
  const [query, setQuery] = useState("");
  const debounced = debounce((q) => fetchResults(q), 300); // NEW instance every render
  return <input value={query} onChange={(e) => { setQuery(e.target.value); debounced(e.target.value); }} />;
}
```

Typing calls `setQuery`, which re-renders. Every render runs the component body again, which calls `debounce(...)` again, which returns a brand new closure with a brand new `timer`. The `clearTimeout(timer)` inside it can only cancel the timer that this instance created, and this instance is one keystroke old. So nothing ever gets cancelled, and you get a fresh 300ms timer per keystroke that each fires. You debounced nothing. The identity of the debounced function churns on every render, and the debounce state churns with it.

**Interview nuance:** the failure is about *identity*, not about the debounce logic. The debounce function is correct. The bug is that you keep throwing it away and making a new one. Anything stateful you want to persist across renders (a timer, a subscription, a cache) must live outside the render body, in `useRef` or `useMemo`.

The fix is to create the debounced instance once and keep it stable:

```jsx
const debouncedRef = useRef(debounce((q) => fetchResultsRef.current(q), 300));
```

But that surfaces a second bug. The closure you passed captured the values it saw when it was created. If it closes over `query` or over a prop, it will keep reading the first render's value forever: the stale closure. The clean pattern is to keep the debounced wrapper stable and read the latest values through a ref that you update every render, so the timer that finally fires sees today's state, not the state from when the timer chain started.

**Interview nuance:** people expect the React Compiler to save them here. It memoizes to reduce re-renders and stabilize some references, but it does not make a `debounce()` call in the body return the same instance, and it does not fix stale reads inside a hand-rolled timer. Debounce identity is your job.

Recap: a debounce created in the render body is a new instance every render, so it cancels nothing and captures stale state. Make the instance stable (`useRef`/`useMemo`), read latest values through a ref, and cancel the pending timer in cleanup.

#### See it live

**Demo (react-demo):** an inline-debounce input placed next to a stable `useRef` debounce, each with a render-count badge and a "fires" counter that increments when the debounced callback actually runs.

The widget renders two rows. Each row has a text input labeled "Search", a "renders: N" badge, and a "fires: N" badge. Row A builds its debounced handler inline in the component body (`const debounced = debounce(onFire, 300)`). Row B builds it once with `useRef(debounce(...))` and reads the latest query through a ref. The learner types a short burst (for example "hello") quickly into each input. Row A's "fires" badge climbs to roughly one per keystroke because each render made a new timer that nothing cancelled. Row B's "fires" badge lands on exactly 1, and only 300ms after typing stops. A small "latest query seen by fire" label under each row shows Row A sometimes firing with an older character while Row B always shows the final text.

```tsx
function debounce(fn: (q: string) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (q: string) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(q), ms);
  };
}

function DebounceRow({ mode }: { mode: "inline" | "stable" }) {
  const [query, setQuery] = useState("");
  const renders = useRef(0);
  renders.current += 1;
  const [fires, setFires] = useState(0);
  const [seen, setSeen] = useState("");

  const onFire = (q: string) => { setFires((n) => n + 1); setSeen(q); };

  // A) inline: a brand new debounced instance (and new timer) every render.
  const inlineDebounced = debounce(onFire, 300);

  // B) stable: created once; the timer persists across renders.
  const stableRef = useRef<((q: string) => void) | null>(null);
  if (!stableRef.current) stableRef.current = debounce(onFire, 300);
  const debounced = mode === "inline" ? inlineDebounced : stableRef.current;

  return (
    <div>
      <input
        aria-label="Search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); debounced(e.target.value); }}
      />
      <span>renders: {renders.current}</span>
      <span data-testid="fires">fires: {fires}</span>
      <span>latest query seen by fire: {seen}</span>
    </div>
  );
}
```

**Watch:** Type "hello" fast in Row A (inline) and the "fires" badge jumps by about 5, one per keystroke, because each keystroke re-rendered, rebuilt `inlineDebounced` with a fresh timer, and the old timer was never cancelled. Type the same in Row B (stable) and "fires" lands on exactly 1, firing once about 300ms after you stop, with "seen" showing "hello". This proves the bug is identity churn, not the debounce math: the same `debounce` function behaves correctly the moment its instance survives across renders. Note the demo is a real React widget, not an approximation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `const debounced = debounce(handle, 300)` declared in the component body so it actually debounces, reads the latest state, and cleans up on unmount, then explain the identity churn that made the original fire on every keystroke.

**Think about:**
- Why does a new function identity each render reset the timer?
- How do you read the latest value inside the debounced callback?
- What must cleanup do on unmount?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The original fires per keystroke because `debounce(handle, 300)` runs on every render. Each render returns a new closure with its own private `timer`. The `clearTimeout(timer)` inside a given instance can only cancel that instance's timer, but a new keystroke has already produced a new instance with a new timer, so nothing is ever cancelled and every scheduled call fires.

Corrected version with a stable instance, latest-value reads, and cleanup:

```jsx
function Search({ onSearch }) {
  const [query, setQuery] = useState("");

  // Keep the latest callback in a ref so the stable debounce never goes stale.
  const latest = useRef(onSearch);
  useEffect(() => { latest.current = onSearch; });

  // Create the debounced instance exactly once.
  const debounced = useMemo(
    () => debounce((q) => latest.current(q), 300),
    [] // stable for the component's lifetime
  );

  // Cancel any pending timer when the component unmounts.
  useEffect(() => () => debounced.cancel?.(), [debounced]);

  return (
    <input
      value={query}
      onChange={(e) => { setQuery(e.target.value); debounced(e.target.value); }}
    />
  );
}
```

For `cancel` to exist, the debounce helper must expose it (`debounced.cancel = () => clearTimeout(timer)`). The mechanism: `useMemo(..., [])` returns the same debounced function across renders, so its internal `timer` persists and `clearTimeout` can actually cancel the previous keystroke's pending call. The `latest` ref decouples "which instance" from "which values": the wrapper is frozen, but it reads through `latest.current`, so the call that fires sees today's callback rather than the one captured at mount.

How to spot it in review: any `debounce(` or `throttle(` call sitting directly in a component body (not inside `useMemo`, `useRef`, or a module scope) is the smell. Also flag a `useEffect` that debounces but has no cleanup returning `cancel`.

Production symptom: the "debounced" search still hits the API on every keystroke (or fires with a query that is one character behind), and unmounting mid-type triggers a setState-after-unmount warning or a wasted request.

Common misconception: "the React Compiler will memoize this for me." It will not turn a `debounce()` call in the body into a stable instance, and it does not fix stale reads inside a manual timer. You must stabilize the instance and route latest values through a ref yourself.

**Self-check rubric:**
- [ ] The debounced instance is created once (`useMemo([])` or `useRef`), not in the render body.
- [ ] Latest callback/state is read through a ref, not captured at creation time.
- [ ] Cleanup cancels the pending timer on unmount.
- [ ] The explanation names identity churn (new closure => new timer => nothing cancelled).
- [ ] It does not rely on the React Compiler to stabilize the instance.

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a "Type-ahead address autocomplete" feature, product reports that the results list sometimes shows suggestions for a query the user already edited away, and the network tab shows a request per keystroke under fast typing. The component uses a `useCallback`-wrapped debounce with `[query]` in its dependency array. Diagnose why `useCallback` did not fix it and ship a version that fires once per pause and never with a stale query.

**Model answer (revealed on demand):**

`useCallback(fn, [query])` does not help because `query` changes on every keystroke, so the dependency array changes, so `useCallback` returns a *new* debounced function on every render. That is identical to declaring it inline: a fresh timer each keystroke, nothing cancelled, one request per key. Worse, the stale suggestions come from the opposite mistake people make when they try to fix this by using `[]` but still closing over `query` directly, freezing the first render's value.

Correct version:

```jsx
function AddressAutocomplete() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; });

  const debouncedSearch = useMemo(
    () => debounce(async () => {
      const q = queryRef.current;             // read latest at fire time
      const res = await geocode(q);
      if (queryRef.current === q) setResults(res); // ignore if user moved on
    }, 300),
    []
  );

  useEffect(() => () => debouncedSearch.cancel?.(), [debouncedSearch]);

  return (
    <input
      value={query}
      onChange={(e) => { setQuery(e.target.value); debouncedSearch(); }}
    />
  );
}
```

Mechanism: the debounced instance is stable (`useMemo([])`), so its timer survives and cancels correctly, giving one call per pause. The `queryRef` guard makes the fired call read the current query, and the equality check before `setResults` drops any late response for a query the user has already changed (a cheap out-of-order guard on top of debounce). Spot it in review by looking for changing values in a debounce/throttle's dependency array. Production symptom: request-per-keystroke billing on the geocoding API plus flicker of stale suggestions. Misconception corrected: `useCallback` stabilizes identity only when its deps are stable, so wrapping a debounce with a per-keystroke dep stabilizes nothing.

### ajr-l2-throttle-leading-trailing: Throttle leading vs trailing (the dropped final call)

- **id:** `ajr-l2-throttle-leading-trailing`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** throttle, events

#### Learn

Throttle means: fire at most once every N milliseconds, no matter how fast the events come. Where debounce waits for quiet, throttle keeps a steady drip during a continuous stream. It is the right tool for scroll, resize, mousemove, and pointer tracking, where you want regular updates but not one per pixel.

The subtlety is the *edges*. A throttle can fire on the leading edge (the first event, immediately), the trailing edge (the last event, after the window), or both. A common hand-rolled throttle is leading-only:

```js
function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { // fire immediately, then block for `ms`
      last = now;
      fn(...args);
    }
    // else: dropped, and never rescheduled
  };
}
```

This fires on the first event of each window and drops everything else in that window. The trap: the very last event of a burst usually lands *inside* a blocked window, so it is dropped and never rescheduled. For a counter that is fine. For anything where the final value is the one that matters, it is a bug. Think of a scroll handler that positions a "you are here" indicator: the user flicks and stops, the last scroll event carries the final position, and leading-only throttle throws it away. The indicator freezes a few pixels short of where scrolling actually ended.

**Interview nuance:** state the guarantee, not the feeling. Leading-only guarantees you fired at the *start* of activity and at most every N ms, and it guarantees *nothing* about the final event. If the correct end state depends on the last event, you must have a trailing edge.

The fix is a leading + trailing throttle: when an event arrives during a blocked window, remember its arguments and schedule one trailing call to flush at the end of the window.

```js
function throttle(fn, ms, { leading = true, trailing = true } = {}) {
  let last = 0, timer = null, savedArgs = null;
  return (...args) => {
    const now = Date.now();
    if (!last && !leading) last = now;      // skip the immediate first fire
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      last = now;
      fn(...args);
    } else if (trailing) {
      savedArgs = args;                      // remember the latest event
      timer ??= setTimeout(() => {
        last = leading ? Date.now() : 0;
        timer = null;
        fn(...savedArgs);                    // flush the final value
      }, remaining);
    }
  };
}
```

**Interview nuance:** the most common confusion is treating throttle and debounce as interchangeable. They are not. Debounce collapses a burst to a single call after it ends (good for search-as-you-type). Throttle produces a bounded stream during the burst (good for scroll). Debounce can starve forever under continuous input; throttle cannot. Pick by the guarantee the feature needs.

Recap: leading-only throttle drops the last event, so any feature whose correct end state is the final value ends up mis-positioned. Enable the trailing edge to flush the last event, and cancel or flush on unmount so you neither drop the finish nor fire after teardown.

#### See it live

**Demo (react-demo):** a rapid simulated scroll stream that marks which events fire under leading-only versus leading+trailing, with a "tracked position" dot that should end where the stream ended.

The widget shows a horizontal track with a draggable "scroll" slider (or a "Play burst" button that emits 40 rapid position events from 0 to 100). Two dots sit on a result track: a red "leading-only" dot and a green "leading+trailing" dot. As the burst plays, each throttle receives the same stream. A small log lists each emitted position and tags it "fired" or "dropped" per variant, plus a "fires: N" badge for each. When the burst ends, the green dot snaps to 100 (the final position) while the red dot stops a bit short at the last position that happened to open a window (for example 92). The learner clicks "Play burst" and watches the two dots diverge at the finish.

```tsx
function ThrottleCompare() {
  const [leadingPos, setLeadingPos] = useState(0);   // red dot
  const [bothPos, setBothPos] = useState(0);         // green dot

  const leadingOnly = useRef(throttle((p: number) => setLeadingPos(p), 100, { trailing: false })).current;
  const leadingTrailing = useRef(throttle((p: number) => setBothPos(p), 100, { trailing: true })).current;

  const playBurst = () => {
    for (let i = 0; i <= 40; i++) {
      const pos = Math.round((i / 40) * 100);
      setTimeout(() => { leadingOnly(pos); leadingTrailing(pos); }, i * 10); // 400ms stream
    }
  };

  return (
    <div>
      <button onClick={playBurst}>Play burst (0 to 100)</button>
      <div>red (leading only) at: {leadingPos}</div>
      <div>green (leading + trailing) at: {bothPos}</div>
    </div>
  );
}
```

**Watch:** Click "Play burst" and both dots race across the track together. At the finish the green dot lands exactly on 100, the true final position, while the red dot stalls short (around 90 to 92), because the final events arrived inside a blocked window and leading-only dropped them with no trailing flush. This proves the leading-only guarantee: it fires during the burst but makes no promise about the last event, so the end state is wrong precisely when the final value matters. The demo runs real throttle instances stabilized in `useRef`; the timing is simulated with `setTimeout` so it is deterministic.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Implement `throttle(fn, ms, { leading, trailing })` and show a scroll handler that never applies the final position when trailing is off, then turn trailing on to flush it and say why the last event was being dropped.

**Think about:**
- What does leading-only guarantee about the last event?
- How is throttle different from debounce?
- When does the final value matter?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Leading-only throttle guarantees it fires on the first event of a window and at most once per `ms`, and guarantees nothing about the last event. During a fast scroll the final events land inside a still-blocked window and are dropped with no reschedule, so the handler applies a position from mid-scroll, not the resting position.

Working implementation and a scroll handler that flushes the finish:

```js
function throttle(fn, ms, { leading = true, trailing = true } = {}) {
  let last = 0, timer = null, savedArgs = null;
  const invoke = (now, args) => { last = now; fn(...args); };
  const throttled = (...args) => {
    const now = Date.now();
    if (!last && !leading) last = now;         // suppress the immediate first call
    const remaining = ms - (now - last);
    if (remaining <= 0 || remaining > ms) {
      if (timer) { clearTimeout(timer); timer = null; }
      invoke(now, args);
    } else if (trailing && !timer) {
      savedArgs = args;
      timer = setTimeout(() => {
        invoke(leading ? Date.now() : 0, savedArgs);
        timer = null; savedArgs = null;
      }, remaining);
    } else if (trailing) {
      savedArgs = args;                          // keep the latest args for the pending flush
    }
  };
  throttled.cancel = () => { if (timer) clearTimeout(timer); timer = null; last = 0; savedArgs = null; };
  return throttled;
}

// Scroll usage
const onScroll = throttle(() => applyPosition(window.scrollY), 100, { leading: true, trailing: true });
useEffect(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => { window.removeEventListener("scroll", onScroll); onScroll.cancel(); };
}, []);
```

Mechanism: with `trailing: false`, events during a blocked window hit the `else` branches that do nothing, so the last event is lost. With `trailing: true`, an event during the window saves its args and schedules one flush at `remaining` ms, so the final `scrollY` is applied after the burst. `savedArgs` is overwritten each time, so the flush uses the *latest* pending position, not the first.

How to spot it in review: a scroll, resize, mousemove, or drag handler wrapped in a throttle with `trailing` off (or a home-grown throttle with no trailing path at all) where the code later reads the resulting position/size. Also flag a throttled listener with no `cancel()` in cleanup.

Production symptom: after a fast scroll or a window resize the UI settles a few pixels or a layout step short of correct: a sticky header stuck half-collapsed, a virtualized list showing the wrong slice, a progress indicator frozen before the true end.

Misconception corrected: throttle and debounce are not the same tool. Debounce would fire once *after* scrolling stops (starving updates during the scroll); throttle keeps a steady stream during it. For "regular updates plus a correct finish" you want throttle with trailing, not debounce.

**Self-check rubric:**
- [ ] The implementation supports both `leading` and `trailing` independently.
- [ ] A trailing flush uses the latest saved args, not the first.
- [ ] The answer states the leading-only guarantee (no promise about the last event).
- [ ] It contrasts throttle (bounded stream) with debounce (fires after quiet).
- [ ] Cleanup removes the listener and cancels/flushes the pending timer.

#### Practice: real-world variant (save, then reveal)

**Prompt:** On an "Infinite-scroll analytics beacon" feature, the team throttles a `trackScrollDepth(depth)` call to at most once per 250ms to control event volume. QA reports that the maximum scroll depth reported is often 85 to 95 percent even when users clearly scroll to the very bottom, skewing the "reached end of article" metric. The throttle is leading-only. Fix it so the true final depth is always recorded without increasing event volume during the scroll, and explain the trade-off.

**Model answer (revealed on demand):**

The metric under-reports because leading-only throttle drops the final scroll events. Users flick to the bottom, the last events (carrying 100 percent) arrive inside a blocked 250ms window, and with no trailing edge they are discarded, so the last *recorded* depth is whatever opened the previous window (85 to 95 percent).

Fix: leading + trailing throttle, which flushes the final depth once at the end of the burst.

```js
const trackDepth = throttle(
  (depth) => beacon("scroll_depth", { depth }),
  250,
  { leading: true, trailing: true }
);

window.addEventListener("scroll", () => trackDepth(scrollDepthPercent()), { passive: true });
// On route change / unmount, flush the last pending value so the finish is not lost:
window.addEventListener("pagehide", () => trackDepth.flush?.());
```

Mechanism: leading keeps the same in-scroll cadence (one event per 250ms), so event volume during scrolling is unchanged. Trailing adds at most one extra call per burst: the flush of the resting depth. That single trailing event is exactly the "reached the end" signal the metric needs. Adding a `flush()` that immediately invokes any pending trailing call on `pagehide`/unmount guarantees the final depth is sent even if the user navigates away before the 250ms window closes.

Trade-off: you accept one additional beacon per scroll burst (the trailing flush) in exchange for a correct maximum-depth metric. That is a good trade because the trailing event is the highest-value one. Spot it in review: any throttled metric or persistence call where the *last* value is the reported quantity but trailing is off. Production symptom: systematically under-counted "completed" or "reached end" events and undercharged/overcharged usage meters that sample the tail. Misconception corrected: raising the throttle interval does not help (it makes the drop worse); the missing piece is the trailing edge, not a longer window.

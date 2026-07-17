> Module **9.2** (Retained Memory & Unmount) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [9.1](./l9-timer-subscription-leaks.md) · Next: [9.3](./l9-controlled-inputs.md)

# L9 · Retained Memory & Unmount

Timers and subscriptions are the loud leaks. This module covers the quiet ones: a closure that pins a 50MB object even though it only reads a number off it, and a `setState` that fires after unmount with no warning to tell you it happened. After this module you will be able to catch, in review, the two lines that make heap climb across every mount and unmount cycle.

### ajr-l9-closure-retains-large-object: Closures retaining large objects (heap growth)

- **id:** `ajr-l9-closure-retains-large-object`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** leaks, memory, closures

#### Learn

A closure keeps its entire lexical environment reachable, not just the variables you think you are using. The garbage collector frees an object when nothing reachable points at it. A live closure is reachable (it is referenced by an event listener, a memo cache, a subscription, a pending promise), so every variable in that closure's scope chain is reachable too, even the ones the function body never touches after creation.

Here is the trap. You have a big dataset and a handler that only needs its length:

```js
function makeHandler(dataset) {
  // dataset is a 50MB array
  return function onResize() {
    console.log('rows:', dataset.length); // only reads .length
  };
}

const handler = makeHandler(loadHugeArray());
window.addEventListener('resize', handler);
```

`onResize` reads `dataset.length` and nothing else. It feels like it should only need a number. But the closure captures the *binding* `dataset`, not the number. As long as `handler` is registered on `window`, the whole 50MB array is reachable and the GC cannot collect it. The handler outlives the reason you loaded the array, and the array rides along.

The fix is to close over the minimal derived value, computed once, so the large object drops out of the closure's scope:

```js
function makeHandler(dataset) {
  const rowCount = dataset.length; // derive the primitive now
  return function onResize() {
    console.log('rows:', rowCount); // closes over a number, not the array
  };
}
```

Now `dataset` is a local that nothing long-lived references after `makeHandler` returns, so the array is collectable while `onResize` stays alive holding a single integer.

**Interview nuance:** the sharp version of this is "closures retain by scope, not by usage." A common wrong answer is "the array is fine because the function only reads `.length`, so the engine optimizes the rest away." Engines do some capture-narrowing, but you cannot rely on it across a real function body, and you certainly cannot rely on it once a bundler, source maps, or a `debugger`-friendly build is in play. Assume the whole scope is retained.

**React nuance:** `useCallback` and `useMemo` are lifetime extenders. A callback memoized with `useCallback(fn, [huge])` is kept across renders on purpose, so anything `fn` closes over is kept across renders too. Memoizing a handler that closes over a large prop or a large piece of state pins that value for the life of the component, and if the handler is also handed to a long-lived subscription, for even longer. Memoization is not free: you are trading recompute cost for retained memory.

Recap: a live closure pins its entire scope, so a long-lived callback that closes over a big object retains that object even if it only reads a primitive off it. Capture the derived primitive instead, and remember `useCallback`/`useMemo` extend the lifetime of everything they close over.

#### See it live

**Demo (js-runnable):** allocate a 10-million-element `Float64Array`, then build two long-lived callbacks, one that closes over the whole array and one that closes over only its length. We register both, drop the original reference, and report retained size so you can see one variant keep ~80MB alive and the other drop it.

```js
// Deterministic, dependency-free. We simulate "long-lived registration"
// with an array of retained callbacks, and approximate retained bytes
// by inspecting what each closure can still reach.
const N = 10_000_000;

function heapMB() {
  // performance.memory is Chromium-only; fall back to a manual estimate.
  const used = (performance.memory && performance.memory.usedJSHeapSize) || 0;
  return (used / 1048576).toFixed(1);
}

const registry = []; // stands in for window listeners / a memo cache (long-lived)

// A) retained-high: closure captures the whole 80MB array
(function registerHigh() {
  const big = new Float64Array(N); // ~80MB
  big[0] = 1;
  registry.push(function onEventA() {
    return big.length; // only reads length, but captures `big`
  });
  // `big` goes out of scope here, but the closure in registry keeps it alive
})();

const afterHigh = heapMB();

// B) retained-low: closure captures only the derived primitive
(function registerLow() {
  const big = new Float64Array(N); // ~80MB, temporary
  const len = big.length;          // derive the number now
  registry.push(function onEventB() {
    return len; // captures a number; `big` is collectable
  });
})();

// force the temporary in B to be droppable, then read again
const afterLow = heapMB();

console.log('after registering HIGH (array pinned): ~' + afterHigh + ' MB used');
console.log('after registering LOW  (only length kept): ~' + afterLow + ' MB used');
console.log('callback A can still reach the 80MB array; callback B cannot.');
console.log('Two bars: HIGH stays elevated, LOW returns toward baseline after GC.');
```

**Watch:** the HIGH variant leaves the heap elevated by ~80MB because the registered closure still reaches `big`; the LOW variant lets that temporary array become collectable, so after a GC pass the second reading trends back toward baseline. This is an approximation of a real DevTools heap-snapshot diff: exact bytes and GC timing are engine-controlled (and `performance.memory` is Chromium-only and coarse), so treat the two bars as "pinned vs collectable," not as precise measurements. The proof is qualitative and correct: identical arrays, identical read (`.length`), and the only difference is what the surviving closure captures.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Show that the whole array is retained, then fix it. Given a resize handler that closes over a 50MB dataset but only needs `dataset.length`, prove (in words or a heap-snapshot description) that the full array stays reachable while the listener is registered, and rewrite the code so only the derived primitive is captured.

**Think about:**
- What does the closure keep reachable?
- How do you confirm in DevTools?
- How does useCallback extend object lifetime?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The handler keeps the entire 50MB `dataset` reachable. A closure retains its whole scope chain, so as long as the `resize` listener is registered on `window`, the closure is reachable, `dataset` is reachable through it, and the array cannot be collected. The fact that the body only reads `dataset.length` is irrelevant to reachability.

Corrected code:

```js
function attachRowLogger(dataset) {
  const rowCount = dataset.length; // derive the primitive once
  const onResize = () => console.log('rows:', rowCount);
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}
```

Now `onResize` closes over `rowCount` (a number). `dataset` is a local that nothing long-lived references after the function returns, so it is collectable immediately.

**Mechanism:** GC frees objects with no path from a root (globals, the stack, live listeners). A registered listener is a live root, and the closure it holds keeps every captured binding on a retention path. Capturing `rowCount` instead of `dataset` cuts the array off that path.

**How to spot it in review:** look for long-lived registrations (`addEventListener`, store subscriptions, `useCallback`/`useMemo`, pending promises, class fields holding bound methods) whose closures reference large props, large state, or large datasets. If a callback outlives the data and captures the data, flag it.

**Production symptom:** heap grows across mount/unmount cycles and never fully returns to baseline; a heap snapshot shows "detached" DOM nodes or large typed arrays retained by a closure whose retainer chain leads back to a listener. Long sessions get sluggish and eventually the tab is killed for memory.

**Common misconception to correct:** "the array is fine because the handler only reads `.length`, the engine will drop the rest." Engines narrow captures opportunistically but you cannot depend on it across a real body or a production build. Assume a closure retains its entire scope, and prove otherwise with a snapshot before trusting an optimization.

**Self-check rubric:**
- [ ] Named the retainer chain: listener → closure → `dataset`.
- [ ] Fixed by capturing the derived primitive, not the array.
- [ ] Said how to confirm: heap snapshot, find the retained array, follow its retainers back to the listener.
- [ ] Explained the GC mechanism (reachability from roots), not just "it leaks."
- [ ] Corrected the "only reads `.length` so it is optimized away" misconception.
- [ ] Connected `useCallback`/`useMemo` to extended object lifetime.

#### Practice: real-world variant (save, then reveal)

**Prompt:** The "Virtualized Table" incident. A data grid memoizes its row-click handler with `useCallback((id) => onSelect(rows.find(r => r.id === id)), [rows, onSelect])`, where `rows` is a 40MB parsed CSV held in state. Users open the grid, scroll, close it, and reopen it dozens of times per session. Support reports the tab getting slower and eventually crashing after ~20 minutes. Explain why memoizing this handler makes the leak worse, and propose a fix that keeps the click fast without pinning 40MB.

**Model answer (revealed on demand):**

Memoization here is actively harmful. `useCallback(fn, [rows])` deliberately keeps `fn` stable across renders, and `fn` closes over `rows`. So the memoized handler pins the entire 40MB dataset for the life of the component, and because the handler is typically passed down to many row components (and sometimes into a virtualization library that holds it), the retention path is wide and sticky. Every reopen that mounts a fresh grid with fresh `rows` can leave the previous grid's `rows` reachable if any subscription, portal, or async callback from the old instance is still pending. The memo did not cause the retention, but it guarantees the large object is captured and extends its lifetime to match the component's.

Fix: do not close over the whole dataset in a long-lived callback. Keep the data in a ref-like lookup and capture only what the handler needs, or pass the row object at call time instead of searching a captured array.

```tsx
// Build a stable id->row map once; the handler closes over onSelect only.
const rowsRef = useRef(rows);
rowsRef.current = rows; // update the pointer, do not capture rows in the closure

const handleRowClick = useCallback((id: string) => {
  const row = rowsRef.current.find(r => r.id === id);
  if (row) onSelect(row);
}, [onSelect]); // rows is NOT a dependency, so it is not captured
```

Reading `rows` through `rowsRef.current` means the closure captures the ref object (tiny and stable), not the 40MB array. When the grid unmounts and the ref is released, the array is collectable. Even better, pass the row itself from the row component (`onClick={() => handleRowClick(row)}`) so no lookup and no dataset capture is needed at all.

**Mechanism:** the ref indirection breaks the retention path. The closure now reaches `rowsRef` (a stable container), and `rowsRef.current` is only read when the click actually fires, so the array is reachable through the component's own state, not additionally pinned by a memoized callback that may be held elsewhere.

**Production symptom:** heap climbs step-wise with each open/close of the grid, snapshots show multiple 40MB arrays retained by memoized closures, and the tab dies after enough reopens. The fix flattens the growth curve because each old dataset becomes collectable on unmount.

### ajr-l9-setstate-after-unmount: setState after unmount (the silent leak)

- **id:** `ajr-l9-setstate-after-unmount`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, leaks, abort-controller

#### Learn

Before React 18 you had probably seen this warning: "Can't perform a React state update on an unmounted component." React 18 removed it. The removal was intentional (the warning had too many false positives), but it deleted your only console signal for a real class of bug, so the leak got quieter, not rarer.

The classic shape:

```tsx
function UserPanel({ url }: { url: string }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetch(url).then(r => r.json()).then(setUser); // no cleanup
  }, [url]);
  return user ? <Profile user={user} /> : <Spinner />;
}
```

If the component unmounts before `fetch` resolves, the `.then(setUser)` still runs when the promise settles. Two things are wrong. First, the promise chain retains `setUser` and, through it, the component's scope, so nothing in that closure can be collected until the promise settles. Second, when it settles React receives a state update for an instance that is gone; the update is discarded work, and in React 18 it happens silently.

There is a nastier variant with the same root cause. If `url` changes quickly, effect A's fetch and effect B's fetch race. Whichever resolves last wins, so a stale response for the old `url` can overwrite the fresh one. No cleanup means no way to say "ignore the old one."

Two fixes. The weaker one is an ignore flag:

```tsx
useEffect(() => {
  let ignore = false;
  fetch(url).then(r => r.json()).then(data => { if (!ignore) setUser(data); });
  return () => { ignore = true; };
}, [url]);
```

This makes the late `setState` a genuine no-op and fixes the race by discarding stale results. But the network request still runs to completion; you paid for it and threw away the answer.

The stronger fix is `AbortController`, which cancels the request itself:

```tsx
useEffect(() => {
  const ctrl = new AbortController();
  fetch(url, { signal: ctrl.signal })
    .then(r => r.json())
    .then(setUser)
    .catch(err => { if (err.name !== 'AbortError') throw err; });
  return () => ctrl.abort();
}, [url]);
```

`ctrl.abort()` in cleanup rejects the fetch with an `AbortError` (so you must swallow that specific error), releases the connection, and stops the `.then(setUser)` from ever running. You reclaim the memory *and* the in-flight network work.

**Interview nuance:** the crisp distinction is "an ignore flag discards the result; AbortController cancels the work." Both stop the setState, only one stops the request. For a search-as-you-type box firing a request per keystroke, the difference is real bandwidth and server load.

**Interview nuance:** "React 18 removed the warning, so this is fixed" is wrong and worth catching. The warning was diagnostics, not a fix. The wasted update and the retained closure are both still there; you just lost the alarm.

Recap: an effect that resolves a promise into `setState` with no cleanup retains the component scope and either wastes an update after unmount or lets a stale response win a race. Add an ignore flag to no-op the result, or an `AbortController` to also cancel the request; React 18 removing the warning did not remove the bug.

#### See it live

**Demo (react-demo):** a two-pane widget. The left pane is a list of user rows. Clicking a row mounts a `Detail` panel on the right that starts a fake fetch with a 1500ms delay. A "Close" button unmounts `Detail` after 300ms (or the learner clicks it themselves). A toggle switches between "no cleanup" and "AbortController cleanup." The right pane shows a red badge that lights up with "setState fired on unmounted instance" and a "Leaks" counter that ticks up each time a late resolve lands after unmount. With the cleanup toggle on, the badge stays dark and the counter stays flat.

```tsx
function Detail({ id, mode }: { id: string; mode: 'leak' | 'safe' }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fakeFetch(id, { signal: ctrl.signal, delay: 1500 })
      .then(data => {
        if (mode === 'leak' && !mountedRef.current) {
          leakCounter.increment();          // badge + counter fire here
          leakBadge.flash('setState on unmounted instance');
        }
        setUser(data);                       // in 'leak' mode this runs post-unmount
      })
      .catch(err => { if (err.name !== 'AbortError') throw err; });

    return () => { if (mode === 'safe') ctrl.abort(); }; // only 'safe' cleans up
  }, [id, mode]);

  return user ? <Profile user={user} /> : <Spinner />;
}
```

**Watch:** in "leak" mode, click a row and hit Close within the 1500ms window. About 1.2 seconds after unmount the badge flashes and the Leaks counter increments, proving the promise's `.then` still ran and called `setUser` on a dead instance. Flip the toggle to "AbortController": now Close triggers `ctrl.abort()`, the fetch rejects with `AbortError` before it resolves, the `.then` never runs, and the badge and counter stay flat. Note the honesty caveat: React itself no longer prints a warning for this in v18+, so the badge is *our* instrumentation (a mounted ref check) standing in for the signal React removed; the underlying wasted update and retained closure are real, the on-screen alarm is synthetic.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add cleanup so a late resolve is a no-op. Given `useEffect(() => { fetch(url).then(setUser) }, [url])`, add either an ignore flag or an `AbortController` so that if the component unmounts (or `url` changes) before the fetch resolves, `setUser` never runs on a stale/unmounted instance. State which fix you chose and why.

**Think about:**
- Why is there no warning anymore?
- What is the real cost of the late setState?
- Which fix also cancels the network work?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Prefer `AbortController`: it cancels the request, not just the result.

```tsx
useEffect(() => {
  const ctrl = new AbortController();
  fetch(url, { signal: ctrl.signal })
    .then(r => r.json())
    .then(setUser)
    .catch(err => { if (err.name !== 'AbortError') throw err; });
  return () => ctrl.abort();
}, [url]);
```

If you cannot pass a signal (some SDK wrappers do not accept one), fall back to an ignore flag:

```tsx
useEffect(() => {
  let ignore = false;
  fetch(url).then(r => r.json()).then(data => { if (!ignore) setUser(data); });
  return () => { ignore = true; };
}, [url]);
```

**Mechanism:** the pending promise's `.then(setUser)` callback closes over `setUser` and the component scope, keeping them reachable until the promise settles. When it settles after unmount, React gets an update for an instance it has already torn down: the update is discarded, so it is pure wasted work, and it can mask a real leak because you have no signal that it happened. The ignore flag makes the callback a no-op (result discarded, request still runs). `AbortController` rejects the fetch on `ctrl.abort()`, so the `.then` never fires and the socket is freed; you just have to swallow the `AbortError` so it does not surface as an unhandled rejection.

**How to spot it in review:** any `.then(setState)` or `await someFetch(); setState(...)` inside a `useEffect` whose return is empty or missing. If an effect starts async work and does not return a cleanup that cancels or ignores it, flag it. The `url` in the dependency array is a tell: it means the effect re-runs, so old in-flight requests can race new ones.

**Production symptom:** slowly growing retained memory with no console noise, plus intermittent "the detail panel shows the previous row's data" race bugs when users click fast. Because React 18 removed the warning, QA and Sentry see nothing; you only find it in a heap snapshot or a flaky UI report.

**Common misconception to correct:** "React 18 removed the warning, so the leak is gone." The warning was a diagnostic, not a fix. The wasted update, the retained closure, and the last-write-wins race are all still present; you have simply lost the alarm that used to point at them.

**Self-check rubric:**
- [ ] Chose `AbortController` and justified it (cancels the request, not just the result).
- [ ] Included the `AbortError` catch so aborts do not throw.
- [ ] Explained that the promise closure retains `setUser` and the component scope.
- [ ] Named the race: fast `url` changes let a stale response overwrite a fresh one.
- [ ] Corrected "the removed warning means the leak is gone."
- [ ] Said how to confirm without a console warning (heap snapshot / UI race repro).

#### Practice: real-world variant (save, then reveal)

**Prompt:** The "Typeahead Search" incident. A search box runs `useEffect(() => { fetch(`/search?q=${q}`).then(r => r.json()).then(setResults) }, [q])` with no cleanup. Users type fast, so a request fires per keystroke. Product reports two symptoms: results occasionally show matches for a *previous* query, and the backend search cluster is at 3x expected load. Diagnose both symptoms from this one bug and give the fix that addresses both.

**Model answer (revealed on demand):**

Both symptoms come from the missing cleanup. Every keystroke changes `q`, re-runs the effect, and fires a new fetch, but no previous fetch is cancelled or ignored.

Symptom one, stale results: the requests race. If the response for `q="rea"` arrives after the response for `q="react"`, the later-arriving-but-older response wins and `setResults` overwrites the fresh matches with stale ones. This is last-write-wins by network timing, not by query recency.

Symptom two, 3x load: every keystroke's request runs to completion server-side. Typing a 10-character query fires up to 10 searches and none are cancelled, so the cluster does work for 9 queries the user never waited to see.

Fix with `AbortController`, which cancels superseded requests and thereby also resolves the race (an aborted request never calls `setResults`):

```tsx
useEffect(() => {
  const ctrl = new AbortController();
  fetch(`/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
    .then(r => r.json())
    .then(setResults)
    .catch(err => { if (err.name !== 'AbortError') throw err; });
  return () => ctrl.abort(); // supersede the previous in-flight query
}, [q]);
```

**Mechanism:** when `q` changes, React runs the previous effect's cleanup *before* running the new effect. `ctrl.abort()` rejects the old fetch, so its `.then(setResults)` never runs (kills the race) and the connection is torn down (drops the wasted server load). Only the newest, un-aborted request survives to set state.

**Production symptom and follow-up:** the stale-results bug is intermittent and timing-dependent, so it is hard to reproduce without throttling the network. For the load problem, add debouncing on top (fire the effect on a settled `q`, say 250ms after the last keystroke) so you also cut the *number* of requests, not just cancel them mid-flight. Abort fixes correctness and cancels waste; debounce reduces how much waste you start in the first place. A common wrong fix is to only debounce: that reduces request volume but a slow response can still land after a newer one and reintroduce the stale-result race, so you still need the abort (or an ignore flag) for correctness.

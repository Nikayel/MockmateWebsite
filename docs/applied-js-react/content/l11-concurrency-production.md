> Module **11.3** (Concurrency in Production) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [11.2](./l11-hydration-streaming.md) · Next: [11.4](./l11-state-architecture.md)

# L11 · Concurrency in Production

Concurrent React can pause, resume, and even discard a render before it commits, which breaks two assumptions people carry from the pre-18 world: that everything reading the same data during one render sees the same value, and that each `setState` costs a render. After this module you can catch tearing in hand-rolled store subscriptions and reason precisely about how many renders a burst of `setState` calls actually causes.

### ajr-l11-tearing-sync-external-store: Concurrent tearing and useSyncExternalStore

- **id:** `ajr-l11-tearing-sync-external-store`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, tearing, useSyncExternalStore

#### Learn

Tearing is when a single render produces UI that shows two different values of the same source of truth. In a synchronous world it cannot happen: React renders the tree top to bottom in one uninterrupted pass, so every component reads the same store value. Concurrent React broke that guarantee. Under `useTransition`, `startTransition`, or Suspense, React can render part of the tree, yield to the browser, let other code run, and then resume. If an external store mutates during that yield, components rendered before the mutation read the old value and components rendered after read the new one. Same render, two values, torn UI.

Here is a hand-rolled store subscribed the way most people write it first:

```tsx
// A naive store: a value plus a set of listeners.
const store = {
  value: 41,
  listeners: new Set<() => void>(),
  set(v: number) { this.value = v; this.listeners.forEach((l) => l()); },
  subscribe(l: () => void) { this.listeners.add(l); return () => this.listeners.delete(l); },
};

function Row() {
  const [value, setValue] = useState(store.value);
  useEffect(() => store.subscribe(() => setValue(store.value)), []);
  return <td>{value}</td>;
}
```

This tears. `useState` holds a per-component copy of the value, seeded at mount and updated by an effect that fires after commit. During a long concurrent render, `store.set(42)` can land between two `Row` renders. React does not know the external store changed, so it does not restart the render. Some rows committed while `value` was still 41, others read 42. You get a table showing 41 and 42 in the same frame.

The fix is `useSyncExternalStore`. It exists specifically to make external stores tear-safe under concurrency:

```tsx
function Row() {
  const value = useSyncExternalStore(
    store.subscribe.bind(store),   // subscribe(callback) => unsubscribe
    () => store.value,             // getSnapshot: synchronous current value
    () => store.value,             // getServerSnapshot: for SSR/hydration
  );
  return <td>{value}</td>;
}
```

`getSnapshot` forces a synchronous read of the live store during render, not a copy stashed in state. React calls it while committing and, critically, compares snapshots across the render. If the store changed mid-render, React detects that the snapshot at commit differs from the one it started with and re-renders synchronously to a consistent value rather than committing a torn tree. That consistency check is the whole point: it is not just a subscription helper, it is a tear-detector.

Why are `useState` and `useContext` already tear-safe? Because their values live inside React's own store. React controls when they change relative to a render, so it will never mutate them mid-pass. A raw external store is outside React's control, so React cannot know it moved unless you route reads through `useSyncExternalStore`.

**Interview nuance:** the sharp answer names the mechanism, not the API. "Concurrent React can interleave a render with external mutations, so a manual subscription reads inconsistent values; `useSyncExternalStore` re-reads a synchronous snapshot and bails out of a torn commit." Saying only "use the hook" misses why the naive version was ever wrong.

Recap: a `useState` plus `useEffect` subscription copies the store value and can commit a render where different components saw different values (tearing); `useSyncExternalStore` reads a synchronous snapshot and forces a consistent commit, with `getServerSnapshot` supplying the value during SSR.

#### See it live

**Demo (react-demo):** a hand-rolled store subscribed via useState+useEffect that tears under a `useTransition` render, next to the same store read through `useSyncExternalStore`.

The widget renders two tables side by side, each with about eight `Row` components reading the same shared store (initial value 41). Left table, labeled "naive (useState + useEffect)"; right table, labeled "useSyncExternalStore." A single button labeled "Bump store during a transition" does two things in one click: it kicks off a `startTransition` that forces a slow re-render of every row (each row does a small busy-wait so the render pass takes long enough to interleave), and partway through that pass it calls `store.set(42)`. A "torn?" badge over each table turns red and reads "TORN: 41 and 42" when its rows disagree, green and reads "consistent" when they match.

```tsx
function TearingDemo() {
  const [isPending, startTransition] = useTransition();

  function bump() {
    startTransition(() => {
      forceSlowRerenderOfAllRows();     // long render pass, yields to browser
      queueMicrotask(() => store.set(42)); // mutate mid-pass
    });
  }

  return (
    <>
      <NaiveTable />               {/* Rows use useState + useEffect */}
      <SyncStoreTable />           {/* Rows use useSyncExternalStore  */}
      <button onClick={bump}>Bump store during a transition</button>
    </>
  );
}
```

**Watch:** on the naive table some rows show 41 and others show 42 in the same frame, and its badge flips to red "TORN." The `useSyncExternalStore` table shows every row as 42 (or every row as 41), never a mix, and its badge stays green. That proves the naive subscription can commit an inconsistent render while `useSyncExternalStore` refuses to. Honesty note: this demo forces an interleaving that real concurrency produces only intermittently under load. It reproduces the exact tearing shape (mixed values, one render) deterministically so you can see it every time, but in production tearing shows up as a rare, hard to reproduce flicker.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite this store that is subscribed via `useState` + `useEffect` and tears under a transition, using `useSyncExternalStore` with a `getSnapshot` and a `getServerSnapshot`. Say why the original tears and why the rewrite cannot.

**Think about:**
- What is tearing?
- Why are useState/useContext tear-safe but raw subscriptions not?
- What does getSnapshot force?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Tearing is a single render committing UI that shows two values of one source of truth. The original tears because the value lives in per-component `useState`, updated by a post-commit effect. Under a concurrent render (a transition), React can render some rows, yield, let `store.set(42)` run, then resume the rest. Rows rendered before the mutation hold 41, rows after hold 42, and React commits both because it has no idea the external store moved.

```tsx
function subscribe(cb: () => void) {
  store.listeners.add(cb);
  return () => store.listeners.delete(cb);
}
const getSnapshot = () => store.value;
const getServerSnapshot = () => store.value;

function Row() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <td>{value}</td>;
}
```

Mechanism: `useSyncExternalStore` calls `getSnapshot` to read the live store synchronously during render and re-reads it at commit. If the snapshot changed while the tree was rendering, React discards the in-progress work and re-renders synchronously to one consistent value instead of committing a torn tree. `useState` and `useContext` are tear-safe because their state lives inside React, which never mutates it mid-render. A raw store is outside React, so only routing the read through `useSyncExternalStore` gives React the chance to detect the change. `getServerSnapshot` supplies the value during SSR, where there is no live client store and no subscription, so hydration matches.

How to spot it in review: a component subscribing to anything outside React (a global singleton, a Redux-like store, a browser API such as `navigator.onLine` or `matchMedia`, a websocket cache) with the `useEffect` + `useState` pattern. That shape plus any use of transitions or Suspense in the tree is the tell.

Production symptom: two parts of the UI briefly showing different values of the same data, an online/offline badge disagreeing with a banner, a cart total that does not match its line items for one frame. It is intermittent and load-dependent, which is exactly why it survives testing.

Common misconception: "a manual store subscription is safe, React just re-renders when the store changes." It is safe under fully synchronous rendering, which is why it worked for years. Concurrent features introduced the interleaving that makes it unsafe.

**Self-check rubric:**
- [ ] Tearing is defined as one render showing two values of the same source.
- [ ] The fix uses `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`.
- [ ] `getSnapshot` is described as a synchronous live read that React re-checks at commit.
- [ ] The answer explains useState/useContext are tear-safe because state lives in React.
- [ ] `getServerSnapshot` is justified for SSR/hydration.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Feature-flag flicker at a fintech." A `useFlags()` hook subscribes to a global flags singleton with `useState` + `useEffect`. Flags are refreshed in the background, and pages use `startTransition` for navigation. QA reports that during navigation a pricing page sometimes renders one panel with the new "promo" flag on and another panel with it off, in the same view. Rewrite `useFlags` and explain why the singleton and the transition together caused it.

**Model answer (revealed on demand):**

The flags singleton is an external store, and `useState` + `useEffect` copies each subscriber's value at mount, refreshed only after commit. Background refresh calls the singleton's setter, and navigation wraps the render in `startTransition`, which lets React render the pricing panels across a yield. If the refresh lands mid-pass, panels rendered before it see the flag off and panels after see it on. Both commit. Two panels, two truths, one view.

```tsx
function useFlags(): Flags {
  return useSyncExternalStore(
    flagsStore.subscribe,          // (cb) => unsubscribe
    flagsStore.getSnapshot,        // () => current flags object (stable reference)
    flagsStore.getServerSnapshot,  // () => flags baked into the server render
  );
}
```

Mechanism: `useSyncExternalStore` reads the singleton synchronously via `getSnapshot` during render and re-checks it at commit, so a refresh that lands mid-render makes React throw away the torn work and re-render to one consistent flags object. One caveat that bites here: `getSnapshot` must return a stable reference when the value has not changed. If it built a fresh `{ ...flags }` each call, React would see a new object every time, think the store changed on every check, and loop or thrash. The store should hold one flags object and swap it only on real change so `getSnapshot` can return it by reference.

How to spot it in review: any config, session, or entitlement singleton exposed through a `useEffect` + `useState` hook, especially one refreshed on a timer or a websocket while the app uses transitions or Suspense. The refresh-in-background plus transition-in-navigation combination is the signature.

Production symptom: inconsistent gating within one screen. A promo price shown next to a non-promo total, a paywalled section visible beside its locked sibling, an A/B variant mixed across a page. At a fintech this is not cosmetic: it can show a price the backend will not honor, which is a compliance and trust problem, not just a flicker.

Interview nuance: the fix is `useSyncExternalStore` plus a reference-stable snapshot. Candidates who stop at "use the hook" and hand it an inline `() => ({ ...flags })` trade tearing for an infinite render loop. Snapshot identity is part of the contract.

### ajr-l11-automatic-batching: Automatic batching (and when it does not apply)

- **id:** `ajr-l11-automatic-batching`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, batching, flushsync

#### Learn

Batching means React groups multiple `setState` calls into a single re-render instead of rendering once per call. Before React 18 it only batched inside React's own synthetic event handlers. State updates in a promise `.then()`, a `setTimeout`, or a native event listener each triggered their own render. React 18 made batching automatic everywhere: promises, timeouts, native handlers, all of it. Three `setState` calls in one tick, wherever they run, now cause one render.

```tsx
function Panel() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);

  function load() {
    fetch("/api/thing").then(() => {
      setA(1);
      setB(2);
      setC(3);   // React 18/19: ONE render for all three
    });
  }
  return <button onClick={load}>load</button>;
}
```

Under React 17 that `.then` produced three renders (three commits, three passes over the tree). Under 18 and 19 it produces one: React sees the three updates queued in the same tick and flushes them together, so the component renders once with `a=1, b=2, c=3`. That is a real performance win, fewer commits and no intermediate flashes, but it changes what you can observe. Any code that assumed the tree rendered between `setA` and `setB` now never sees those in-between states.

Two consequences matter. First, you still cannot read state back synchronously after setting it. `setA(1); console.log(a)` logs the old value regardless of batching, because state is a per-render snapshot, not a variable you mutated. Batching is about how many renders happen; the snapshot rule is about what the current scope sees, and both say "not now." Second, when the next value depends on the previous, use the functional updater. `setCount(count + 1)` three times in a batch all read the same captured `count` and fold to one increment; `setCount((c) => c + 1)` threads the queue and adds three. Still one render either way.

When do you actually need to escape batching? When you must read the committed DOM between two updates, and only then. `flushSync` forces React to commit synchronously so the DOM reflects an update before the next line runs:

```tsx
flushSync(() => setExpanded(true)); // commit now, DOM updated
listRef.current.scrollTop = listRef.current.scrollHeight; // measure/scroll the new layout
```

The classic case is measuring or scrolling to content that only exists after a state change. Outside that, `flushSync` is a smell. It defeats batching, forces an extra synchronous commit, and can cause layout jank because it makes React render and lay out mid-handler.

**Interview nuance:** the crisp version separates three axes that people blur together. Render count is batching (one render for a tick's updates). Value correctness for dependent updates is the functional updater (read the queue, not the closure). Read-after-set is the snapshot rule (never synchronous). `flushSync` touches only render count, and only for the rare DOM-measurement case.

Recap: React 18/19 batches all updates in a tick into one render, including in promises and timeouts; use functional updaters when the next value depends on the previous, and reach for `flushSync` only to read committed DOM between updates.

#### See it live

**Demo (react-demo):** three `setState` calls inside a `setTimeout`/promise with a render-count badge, plus a `flushSync` toggle.

The widget shows one panel with three state values (`a`, `b`, `c`) and a prominent "renders" badge (backed by a commit counter). A "Run in setTimeout" button schedules `setA`, `setB`, `setC` inside a `setTimeout(0)`; a "Run in promise" button does the same inside `Promise.resolve().then(...)`. A toggle labeled "wrap each in flushSync" switches the handler between plain calls and `flushSync(() => setA(...))` around each. A small "pre-18 model" readout predicts what React 17 would have done (three renders) so the learner can compare mental models.

```tsx
function BatchingDemo() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const renders = useRef(0);
  renders.current += 1; // one bump per commit

  function runBatched() {
    setTimeout(() => { setA(1); setB(2); setC(3); }, 0);      // one render
  }
  function runFlushSync() {
    setTimeout(() => {
      flushSync(() => setA(1));
      flushSync(() => setB(2));
      flushSync(() => setC(3));                                // three renders
    }, 0);
  }
  return <div>renders: {renders.current}</div>;
}
```

**Watch:** with batching on, the "renders" badge goes up by exactly 1 per click even though three `setState` calls ran inside a timeout, while the "pre-18 model" readout says 3. Flip the `flushSync` toggle and the badge jumps by 3 per click, one commit per call. That proves React 18/19 batches timeout and promise updates into a single render, and that `flushSync` opts each update out into its own synchronous commit. The render count is a real commit observation, not a simulation; the "pre-18" number is a labeled prediction of old behavior, not something running.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict how many renders three `setState` calls inside a `fetch().then()` cause under React 18/19, then identify the one rare case that legitimately needs `flushSync`. Show the corrected handler if the code also depends on the previous value.

**Think about:**
- What did React 18 batching change?
- Can you rely on read-after-set within a handler?
- When do you need flushSync?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Three `setState` calls in a `.then()` cause exactly one render under React 18/19. React 18 made batching automatic outside event handlers, so updates queued in the same tick of a promise callback flush together into a single commit. Under React 17 the same code rendered three times because batching stopped at the boundary of synthetic events.

```tsx
fetch("/api/thing").then(() => {
  setStatus("done");
  setCount((c) => c + 1);   // functional updater if next depends on prev
  setItems((prev) => [...prev, next]);
}); // ONE render, final state committed together
```

Mechanism: React 18+ batches all updates in a tick by default; components only ever render the final state for that tick, never the intermediate steps. You cannot rely on read-after-set inside the handler either. `setCount(5); console.log(count)` logs the old value, because state is a per-render snapshot updated between renders, not a mutable cell. That is true with or without batching. When a new value depends on the previous, use the functional updater so each write reads the queued value rather than the render-time closure.

The one case that needs `flushSync` is reading committed DOM between updates: you set state that adds or resizes content, then must measure or scroll it in the same handler. `flushSync(() => setExpanded(true))` forces the commit so `ref.current.scrollHeight` reflects the new layout on the next line. That is the only good reason.

How to spot it in review: code that assumes multiple `setState` calls each render (spreading updates across microtasks to "let them render," or awaiting between them expecting intermediate paints), and the opposite, `flushSync` sprinkled around ordinary updates for no DOM-measurement reason. Both are tells: the first misreads batching, the second fights it.

Production symptom: on the first, logic that depends on an intermediate state that never renders (a loading flash that never shows, a step counter that skips values). On the second, `flushSync`-induced jank: forced synchronous layouts mid-handler that stutter scrolling and animations, sometimes with a "flushSync was called from inside a lifecycle method" warning.

Common misconception: "each `setState` in a promise or timeout causes its own render." That was React 17. In 18/19 they batch into one; only `flushSync` (or a legacy render root) splits them.

**Self-check rubric:**
- [ ] The prediction is exactly one render under React 18/19.
- [ ] The answer notes React 17 would have rendered three times.
- [ ] It rejects synchronous read-after-set as a snapshot rule, independent of batching.
- [ ] Functional updaters are named for previous-dependent updates.
- [ ] `flushSync` is scoped to reading committed DOM between updates only.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Chat auto-scroll jank." A chat view appends a message with `setMessages((m) => [...m, msg])` inside a websocket `onmessage`, then scrolls to the bottom with `listRef.current.scrollTop = listRef.current.scrollHeight` on the next line. It never scrolls far enough: it stops one message short. A teammate wraps every `setState` in the app in `flushSync` to "fix timing" and now scrolling stutters. Give the correct minimal fix and explain both the original bug and why the blanket `flushSync` made things worse.

**Model answer (revealed on demand):**

The scroll runs before React commits the new message, so `scrollHeight` still reflects the list without it, and you scroll one message short. Websocket `onmessage` updates are batched, so the DOM has not grown yet when the next line reads `scrollHeight`. This is precisely the read-committed-DOM-between-updates case, so a targeted `flushSync` is correct here.

```tsx
socket.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  flushSync(() => setMessages((m) => [...m, msg])); // commit so the DOM grows now
  listRef.current.scrollTop = listRef.current.scrollHeight; // measures the new height
};
```

Mechanism: `flushSync` forces React to render and commit the appended message synchronously, so by the next line the new row is in the DOM and `scrollHeight` includes it. The functional updater keeps appends correct if several messages arrive in one tick. This is the narrow, legitimate use of `flushSync`: you must observe layout produced by a state change within the same handler.

The blanket `flushSync` the teammate added is the opposite mistake. Wrapping every update forces a synchronous commit and layout for updates that had no reason to be synchronous, so React can no longer batch bursts of state changes. Typing indicators, presence pings, and unrelated updates each trigger their own commit and layout pass, which is what produces the stutter. `flushSync` is a scalpel for one line, not a global setting.

How to spot it in review: DOM reads (`scrollHeight`, `getBoundingClientRect`, focus, selection) on the line right after a `setState`, which need a scoped `flushSync`; and any `flushSync` that does not precede a DOM measurement, which should be deleted. A codebase-wide `flushSync` wrapper is a red flag by itself.

Production symptom: the original scrolls one item short on every new message and looks subtly broken during fast chats. The over-applied version regresses scroll and animation smoothness across the whole app and can surface synchronous-layout warnings, because it defeats the batching that kept commits cheap.

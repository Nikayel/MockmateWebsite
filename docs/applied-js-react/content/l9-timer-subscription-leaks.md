> Module **9.1** (Leaks: Timers & Subscriptions) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [8.6](./l8-code-splitting-bundle.md) · Next: [9.2](./l9-retained-memory.md)

# L9 · Leaks: Timers & Subscriptions

After this module you will catch the four leaks that survive review because the happy path works: an interval that keeps firing after unmount, a subscription that doubles on every remount, an event listener that can never be removed because add and remove point at different functions, and an observer that keeps watching detached DOM. Each lesson centers on real code you run and a demo you watch leak before you fix it.

### ajr-l9-leaking-timers: Leaking timers (interval/timeout/rAF)

- **id:** `ajr-l9-leaking-timers`  ·  **difficulty:** intermediate  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, leaks, timers

#### Learn

A timer is not part of the React tree. When you call `setInterval`, `setTimeout`, or `requestAnimationFrame`, you hand a callback to a host timer queue that the browser owns. React knows nothing about it. Unmounting the component that started the timer does not stop the timer, because the browser's queue never held a reference to the component, only to your callback. That callback closes over your component's scope (its `setState`, its props), so the timer keeps that scope alive and keeps calling into it long after the UI is gone.

Here is the leak:

```tsx
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 1000);
}, []); // no return: the interval outlives the component
```

Mount this Clock, unmount it, mount it again, and you now have two intervals firing every second, both calling `setNow` on their own captured state. The rendered time jitters because two schedulers are racing to update it. Do it five times and you have five intervals burning CPU forever. In development React logs nothing useful, and in React 18 the old "state update on an unmounted component" warning is gone, so the only signal is a fan spinning up.

The fix is to return a cleanup that clears the exact timer you started:

```tsx
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(id);
}, []);
```

`clearInterval(id)` deregisters the callback from the browser's queue, which releases the closure and stops the firing. The same rule applies to every timer primitive with a symmetric clear: `clearTimeout(id)` for `setTimeout`, and `cancelAnimationFrame(id)` for `requestAnimationFrame`.

```tsx
useEffect(() => {
  let raf = 0;
  const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, []);
```

**Interview nuance:** self-scheduling `setTimeout` recursion (a `setTimeout` whose callback calls `setTimeout` again) is the sneakiest variant. Capturing one `id` is not enough, because each tick creates a new id. Store the latest id in a ref or a mutable variable that the callback reassigns, and clear that in cleanup, or the chain keeps rescheduling itself past unmount. StrictMode is your free detector here: it mounts, unmounts, and remounts once in development, so a missing `clearInterval` shows up immediately as the timer count going to 2 and staying there instead of settling back to 1.

Recap: timers live on the browser's queue, not the React tree, so unmount never stops them; return `clearInterval` / `clearTimeout` / `cancelAnimationFrame` on the exact id, and track the id for self-rescheduling timeouts.

#### See it live

**Demo (react-demo):** a Clock component mounted and unmounted five times via a toggle, with a badge counting active intervals and the displayed time jittering when more than one interval is live.

The widget renders a **Mount / Unmount** toggle button, a big **Active intervals: N** badge, the live clock text, and a "Cleanup" switch that adds or removes the `return () => clearInterval(id)` at runtime. A StrictMode checkbox wraps the child so the learner can watch the double mount. The child is built around this:

```tsx
function Clock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000); // badge += 1
    return () => clearInterval(id);                         // badge -= 1
  }, []);
  return <span>{new Date(now).toLocaleTimeString()}</span>;
}
```

With the Cleanup switch off, each Mount toggle leaves the previous interval running, so the badge climbs 1, 2, 3, 4, 5 and the time text visibly jitters as multiple intervals fight to set it. Flip Cleanup on and the same toggling holds the badge at 1: unmount clears the old interval before the next mount starts a new one.

**Watch:** without cleanup the badge climbs 1, 2, 3 across remounts and the clock stutters because several intervals are each calling `setNow`; with `clearInterval` in the return the badge stays at 1 no matter how many times you toggle, and the clock ticks smoothly. This proves the interval is registered on the browser's timer queue and only `clearInterval` removes it, unmount alone does not.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add cleanup to the interval effect below so remounting the Clock never leaves a second timer running, then do the same for a `requestAnimationFrame` loop with `cancelAnimationFrame`. Start from:

```tsx
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 1000);
}, []);
```

**Think about:**
- Why is the timer not tied to React tree lifecycle?
- How does StrictMode help you detect this?
- What about self-scheduling setTimeout recursion?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The effect starts an interval but returns nothing, so React has no teardown to run and the timer outlives every unmount. Corrected:

```tsx
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(id);
}, []);
```

And the rAF loop:

```tsx
useEffect(() => {
  let raf = 0;
  const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, []);
```

Mechanism: `setInterval` registers your callback on the browser's timer queue and returns an id. That queue is not part of the React tree, so unmounting the component does nothing to it. The callback closes over the component's `setNow`, keeping that scope alive and firing forever. `clearInterval(id)` is the only thing that deregisters it. React runs the returned cleanup on unmount (and before any re-run), so returning `clearInterval(id)` restores symmetry: one start, one clear.

How to spot it in review: any `setInterval`, `setTimeout`, or `requestAnimationFrame` inside a `useEffect` with no matching `clearInterval` / `clearTimeout` / `cancelAnimationFrame` in the returned cleanup. For a self-scheduling `setTimeout`, check that the latest id is captured in a mutable variable or ref and that variable is cleared, because clearing the first id alone leaves the chain rescheduling itself.

Production symptom: runaway CPU and battery drain, a clock or animation that jitters because several timers update the same state, and `setState`-after-unmount storms as ghost callbacks keep calling into dead components. The load correlates with navigation count, not user count, so it looks fine in a quick manual test and gets worse the longer a session runs.

Misconception to correct: unmounting the component does not stop the timer. The browser holds the callback, not React, so only an explicit clear stops it.

**Self-check rubric:**
- [ ] The effect returns a cleanup function.
- [ ] Cleanup clears the exact id returned by the timer call.
- [ ] rAF version uses `cancelAnimationFrame` on the latest frame id.
- [ ] Remounting the Clock leaves one interval, not many.
- [ ] Answer states timers live on the browser queue, not the React tree.
- [ ] Self-rescheduling timeout captures and clears the latest id.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Auction countdown at scale. A live-auction page shows a per-lot countdown backed by a self-rescheduling `setTimeout` (each tick schedules the next to correct for drift) plus a `requestAnimationFrame` progress bar. Bidders open and close lot panels dozens of times per session. Write the effect so closing a lot never leaves a zombie countdown or a runaway rAF loop, and say what the production incident looks like if you get it wrong.

**Model answer (revealed on demand):**

```tsx
useEffect(() => {
  let timeoutId = 0;
  let rafId = 0;

  const tick = () => {
    setRemaining(endsAt - Date.now());
    timeoutId = window.setTimeout(tick, 1000); // reschedules: id changes each tick
  };
  timeoutId = window.setTimeout(tick, 1000);

  const frame = () => {
    setProgress(computeProgress(endsAt));
    rafId = requestAnimationFrame(frame);
  };
  rafId = requestAnimationFrame(frame);

  return () => {
    clearTimeout(timeoutId);       // clears the LATEST scheduled id
    cancelAnimationFrame(rafId);
  };
}, [endsAt]);
```

The countdown is a self-rescheduling `setTimeout`: each tick assigns a new id to `timeoutId`, so cleanup must clear whatever id is current, not the first one. Because `tick` reassigns `timeoutId` on every run and the cleanup closes over that same variable, `clearTimeout(timeoutId)` at teardown always targets the pending timeout and breaks the chain. The rAF progress bar is the same shape: `frame` reassigns `rafId` each frame, and `cancelAnimationFrame(rafId)` stops the loop.

The trap is capturing the id once. If you wrote `const id = setTimeout(tick, 1000)` and cleared `id`, you would cancel only the very first timeout; the second one that `tick` already scheduled keeps going, and the countdown runs forever against a closed lot. After 30 opens you have 30 countdown chains and 30 rAF loops, each closing over a different `endsAt`, all repainting.

How to spot it in review: a `setTimeout` that calls `setTimeout` inside its own callback, or a `requestAnimationFrame` that re-requests, without a mutable id the cleanup reads. Count the schedulers and confirm the cleanup can reach the latest id of each.

Production symptom: CPU climbing with session length rather than concurrent users, a page that grows sluggish the longer an auction runs, and stale countdowns updating for lots the bidder already left. On mobile it drains battery fast. StrictMode dev would have caught it: the extra mount cycle shows the timer count staying above one instead of settling back.

### ajr-l9-leaking-subscriptions: Leaking subscriptions (socket/store/onSnapshot)

- **id:** `ajr-l9-leaking-subscriptions`  ·  **difficulty:** intermediate  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, leaks, subscriptions

#### Learn

A subscription is a promise you made to an external source: "call this function whenever something changes." That source (a socket server, a store, a Firestore query) stores your callback in its own list of listeners and holds a strong reference to it. React cannot reach into that list. When your component unmounts, React tears down its own tree, but the external source still has your callback and still calls it. Now you are pushing updates into a component that no longer exists, and every remount adds another listener on top of the old ones.

The leak:

```tsx
useEffect(() => {
  const unsub = store.subscribe(setState);
}, []); // unsub captured and thrown away
```

`store.subscribe` returned an unsubscribe function, and you ignored it. Mount, unmount, mount again, and the store now has two copies of `setState` in its listener list. Every dispatched change calls both. The user sees each new message appended twice, then three times after the next remount, and the store's subscriber count climbs without bound. The identical shape shows up as `socket.on("message", cb)` without `socket.off`, and `onSnapshot(query, cb)` without calling the returned unsubscribe.

The fix is to capture the teardown the source handed you and return it from the effect:

```tsx
useEffect(() => {
  const unsub = store.subscribe(setState);
  return () => unsub();
}, []);
```

Each external API has its own teardown, and you must call the exact one for that source:

```tsx
// socket: on / off with the same handler reference
useEffect(() => {
  const onMsg = (m) => setState(m);
  socket.on("message", onMsg);
  return () => socket.off("message", onMsg);
}, []);

// Firestore: onSnapshot returns its own unsubscribe
useEffect(() => {
  const unsub = onSnapshot(query, (snap) => setDocs(snap.docs));
  return () => unsub();
}, [query]);
```

**Interview nuance:** for reading an external store's value, the modern primitive is `useSyncExternalStore`, not a hand-rolled `subscribe` in `useEffect`. It takes a `subscribe` function and a `getSnapshot`, manages the subscription lifecycle for you, and (this is the part interviewers probe) prevents tearing, where different parts of one render read different store values during concurrent rendering. Rolling your own effect-based subscription works but leaves both the cleanup and the tearing correctness on you.

Recap: the external source holds your callback and unmount does not reach it, so capture and call the exact teardown (`unsub()`, `off`, snapshot unsubscribe); for reading store state, prefer `useSyncExternalStore`.

#### See it live

**Demo (react-demo):** a mock pub/sub bus with a live subscribers counter, and a Feed component mounted and unmounted repeatedly while the bus broadcasts messages.

The widget renders a **Mount / Unmount Feed** toggle, a **Bus subscribers: N** counter, a "Broadcast message" button, the Feed's rendered message list, and a "Cleanup" switch that adds or removes the returned `unsubscribe`. Broadcasting shows how many rows each message produces. The child is built around this:

```tsx
function Feed() {
  const [messages, setMessages] = useState<string[]>([]);
  useEffect(() => {
    const unsub = bus.subscribe((m) => setMessages((p) => [...p, m])); // counter += 1
    return () => unsub();                                              // counter -= 1
  }, []);
  return <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>;
}
```

With Cleanup off, mount the Feed, unmount, mount again, and the **Bus subscribers** counter reads 2 or 3. Click Broadcast and the visible Feed shows the same message appended two or three times, because dead subscribers from earlier mounts still receive it and the live one renders duplicated state. Flip Cleanup on and the counter holds at 1: each broadcast produces exactly one row.

**Watch:** without the returned unsubscribe the subscribers counter climbs to N and a single broadcast produces N duplicate rows (ghost subscribers from prior mounts still fire); with `return () => unsub()` the counter stays at 1 and each broadcast adds one row. This proves the bus, not React, owns your callback, so only calling the teardown removes it.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add the missing cleanup to the subscription effect below so remounting the Feed never leaves duplicate subscribers on the bus, and show the equivalent teardown for `socket.on` and `onSnapshot`. Start from:

```tsx
useEffect(() => {
  const unsub = store.subscribe(setState);
}, []);
```

**Think about:**
- What holds a reference to your callback?
- What is each source's teardown?
- What is the correct primitive for external stores?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The effect subscribes and discards the unsubscribe function, so React has nothing to call at teardown. Corrected:

```tsx
useEffect(() => {
  const unsub = store.subscribe(setState);
  return () => unsub();
}, []);
```

Each source has its own symmetric teardown:

```tsx
// socket
const onMsg = (m) => setState(m);
socket.on("message", onMsg);
return () => socket.off("message", onMsg); // same handler reference

// Firestore
const unsub = onSnapshot(query, (snap) => setDocs(snap.docs));
return () => unsub();
```

Mechanism: `subscribe`, `on`, and `onSnapshot` register your callback inside the external source's own listener list, which strongly references it. Unmount tears down React's tree but never touches that external list, so the source keeps calling your callback and every remount appends another. Returning the teardown makes React run it on unmount (and before re-runs), which removes your callback from that list. For `socket.off` the handler must be the same reference you passed to `on`, or `off` matches nothing and removes nothing.

How to spot it in review: any `subscribe(`, `.on(`, `.connect(`, or `onSnapshot(` inside a `useEffect` without a symmetric teardown in the return. If the API returns an unsubscribe token, confirm it is captured and called; if it uses `on`/`off`, confirm both sides share one named handler.

Production symptom: "my message shows up twice, then three times," duplicate rows that grow with how many times the user navigated in and out, and a server-side connection or subscriber count that climbs until the backend rejects new subscriptions. It correlates with navigation, not user count.

Misconception to correct: React does not auto-unsubscribe on unmount. It only runs the cleanup you return; if you never captured the teardown, there is nothing for React to call, and for reading store state the durable answer is `useSyncExternalStore`, which manages subscribe/unsubscribe and prevents tearing for you.

**Self-check rubric:**
- [ ] The unsubscribe/teardown returned by the source is captured.
- [ ] The effect returns a cleanup that calls that exact teardown.
- [ ] `socket.off` uses the same handler reference passed to `on`.
- [ ] Remounting the Feed leaves one subscriber, not several.
- [ ] Answer names the external source (not React) as the holder of the callback.
- [ ] For reading store state, answer mentions `useSyncExternalStore`.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Trading dashboard live prices. A ticker widget subscribes to a WebSocket price feed with `feed.subscribe(symbol, cb)` (returns an unsubscribe) and also reads a shared quotes store. Traders switch symbols from a watchlist hundreds of times per session, and each switch changes `symbol`. Write the effect so switching symbols never leaves a stale price subscription, and refactor the store read to the primitive that prevents tearing. Then name the production symptom of getting it wrong.

**Model answer (revealed on demand):**

```tsx
// Live feed: symmetric teardown keyed on symbol
useEffect(() => {
  const unsub = feed.subscribe(symbol, (price) => setPrice(price));
  return () => unsub();
}, [symbol]);

// Shared quotes store: useSyncExternalStore instead of a hand-rolled effect
const quote = useSyncExternalStore(
  quotesStore.subscribe,
  () => quotesStore.getQuote(symbol),
);
```

For the feed, `symbol` is in the dependency array, so React runs the previous cleanup (unsubscribing the old symbol) before subscribing to the new one. Each switch swaps exactly one live subscription for another, never stacking them. Because `feed.subscribe` returns its own unsubscribe token and the effect returns a cleanup that calls it, the teardown is symmetric per symbol.

For the store read, `useSyncExternalStore` is the right tool over a manual `useEffect(() => store.subscribe(...))`. It manages the subscribe and unsubscribe lifecycle itself, and it guarantees that every part of a single render reads a consistent snapshot. A hand-rolled effect-based read can tear under concurrent rendering: one component reads the price before an update and a sibling reads it after, so the dashboard shows two different prices for the same symbol in the same frame.

How to spot it in review: a `feed.subscribe`/`socket.on` in a `[]` effect when the subscription actually depends on a prop like `symbol` (the leak hides because it only leaks on switch), and a manual store subscription that should be `useSyncExternalStore`. The tell is a subscribe with no symbol in the deps, or a store read wired through `useState` plus an effect.

Production symptom: prices that update for symbols the trader already left, a subscriber count on the feed server that climbs with session length, and, from the tearing bug, mismatched numbers across widgets during fast market moves. It is intermittent and worst under load, so it survives happy-path QA and shows up as "prices are flickering and sometimes wrong."

### ajr-l9-leaking-listeners-identity: Leaking listeners and stale removeEventListener

- **id:** `ajr-l9-leaking-listeners-identity`  ·  **difficulty:** intermediate  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** react, leaks, events

#### Learn

`removeEventListener` does not remove "the resize handler." It removes one specific function you registered, matched by three things: the event type, the exact function reference, and whether the capture flag matches. Miss any of the three and it removes nothing, silently, with no error. The single most common way to miss the function reference is to pass an inline arrow to both `add` and `remove`, because each arrow literal is a brand-new function object.

The bug, in a React effect, has two defects at once:

```tsx
useEffect(() => {
  window.addEventListener("resize", () => setW(window.innerWidth));
}, []); // (1) no cleanup at all, and even if you added one:
// window.removeEventListener("resize", () => setW(window.innerWidth)); // (2) different arrow, removes nothing
```

Defect one is the missing cleanup, so the listener leaks on every unmount. Defect two is subtler and bites even people who "remembered cleanup": `() => setW(window.innerWidth)` in the add and a look-alike `() => setW(window.innerWidth)` in the remove are two distinct references. `removeEventListener` compares by identity, finds no stored function equal to the new arrow, and leaves the original in place. So `window` accumulates one live resize handler per mount, forever, and each handler closes over the `setW` (and any props) from its own render, so they also carry stale values.

The fix is one named handler used for both sides, plus a real cleanup:

```tsx
useEffect(() => {
  const onResize = () => setW(window.innerWidth);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);
```

Now `add` and `remove` receive the identical `onResize` reference, so removal matches and the listener count returns to zero on unmount.

**Interview nuance:** the options argument participates in matching too, but asymmetrically. The `capture` boolean must match between add and remove. The `passive` and `once` flags do not affect matching, only behavior. So `addEventListener("scroll", h, { capture: true })` needs `removeEventListener("scroll", h, { capture: true })` or, equivalently, `removeEventListener("scroll", h, true)`. A senior tell is knowing that `{ signal }` on `addEventListener` is the modern alternative: pass an `AbortController` signal and `controller.abort()` removes the listener for you, which composes cleanly with an effect's cleanup.

Recap: `removeEventListener` matches on (type, exact function reference, capture), so an inline arrow can never be removed; bind one named handler, pass it to both add and remove, and match the capture flag.

#### See it live

**Demo (js-runnable):** register N resize handlers on a mock target, try to remove them with a fresh arrow each time, then remove them with a stable named handler, watching a listener counter that never drops in the first case and hits zero in the second.

```js
// A tiny event target that reports how many listeners it holds, matching by reference.
function makeTarget() {
  const listeners = [];
  return {
    add(type, fn) { listeners.push({ type, fn }); },
    remove(type, fn) {
      const i = listeners.findIndex((l) => l.type === type && l.fn === fn); // identity match
      if (i !== -1) listeners.splice(i, 1);
    },
    count() { return listeners.length; },
  };
}

// A) inline arrow: add and remove get DIFFERENT function objects
console.log("A) inline arrow add + inline arrow remove");
const a = makeTarget();
for (let i = 0; i < 3; i++) {
  a.add("resize", () => console.log("resize", i));      // new arrow
  a.remove("resize", () => console.log("resize", i));   // a DIFFERENT new arrow
}
console.log("  listeners still registered:", a.count()); // 3, none removed

// B) stable named handler: add and remove get the SAME reference
console.log("\nB) named handler add + same-reference remove");
const b = makeTarget();
const handlers = [];
for (let i = 0; i < 3; i++) {
  const onResize = () => console.log("resize", i); // one reference we keep
  handlers.push(onResize);
  b.add("resize", onResize);
}
handlers.forEach((h) => b.remove("resize", h));
console.log("  listeners still registered:", b.count()); // 0, all removed

console.log("\nResult:");
console.log("  A leaked:", a.count(), "handler(s) that can never be removed");
console.log("  B cleaned up to:", b.count());
```

**Watch:** variant A logs "listeners still registered: 3" because each `remove` arrow is a different object than the `add` arrow, so the identity match fails every time and nothing is removed; variant B logs "0" because the same `onResize` reference is passed to both sides. This proves removal is by function identity, not by source text, and that inline arrows leak. Note this is a faithful model of the DOM's `(type, fn, capture)` matching rule (the mock matches on type and reference), not the real `window`, but the browser applies the same identity comparison.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix the resize effect below, which has two bugs: it never cleans up, and even a naive cleanup would not remove the listener. Make add and remove reference the same function and return a real cleanup, then say what stale value the inline handler captured. Start from:

```tsx
useEffect(() => {
  window.addEventListener("resize", () => setW(window.innerWidth));
}, []);
```

**Think about:**
- What does removeEventListener match on?
- Why does an inline arrow silently fail to remove?
- What stale value does the handler capture?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The effect adds a listener with an inline arrow and returns no cleanup. Corrected:

```tsx
useEffect(() => {
  const onResize = () => setW(window.innerWidth);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);
```

Mechanism: `removeEventListener` matches a stored listener by three things: the event type, the exact function reference, and the capture flag. An inline arrow passed to `add` creates one function object; a look-alike arrow passed to `remove` creates a different object. Identity comparison fails, so `remove` deletes nothing and the original stays on `window`. Binding a single named `onResize` and handing that same reference to both `add` and `remove` makes the match succeed. React runs the returned cleanup on unmount, so the count returns to zero.

The stale-value point: if the handler reads state or props from the render it was created in (say `() => setW(props.min + window.innerWidth)`), and the effect has an empty dependency array, that handler keeps the values from the first render forever. Even when you fix removal, an empty-deps listener that closes over changing props is a separate stale-closure bug; either add the deps (which re-registers with a fresh handler each change) or read the latest value through a ref.

How to spot it in review: `addEventListener` with an inline function argument, or any listener on `window` / `document` with no exact-reference `removeEventListener` in cleanup. If add uses `{ capture: true }`, confirm remove passes the matching capture flag.

Production symptom: handlers accumulating on `window` across navigation (a slow leak that grows the listener list and retains each handler's closure), plus stale-closure logic firing with values from an old render. It manifests as sluggishness that worsens with session length and occasional "why is it using the old width" bugs.

Misconception to correct: passing a "similar" or even textually identical arrow to `remove` does not work. Matching is by reference identity, not by what the function looks like.

**Self-check rubric:**
- [ ] A single named handler is defined once in the effect.
- [ ] The same reference is passed to both `addEventListener` and `removeEventListener`.
- [ ] The effect returns a cleanup that removes the listener.
- [ ] The capture flag matches between add and remove if used.
- [ ] Answer states removal matches on (type, reference, capture).
- [ ] Answer identifies the stale value the empty-deps closure captures.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Global keyboard shortcuts at scale. A modal registers `document.addEventListener("keydown", ...)` to close on Escape and trap focus, and it mounts and unmounts every time the user opens any dialog in a busy admin app. The current code uses an inline arrow and no cleanup. Write the effect so opening and closing 50 dialogs leaves zero leaked keydown handlers, handle the capture-phase requirement for focus trapping, and name the production symptom of the current bug. Also show the modern `AbortController` alternative.

**Model answer (revealed on demand):**

```tsx
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Tab") trapFocus(e);
  };
  // capture phase so the trap runs before other handlers
  document.addEventListener("keydown", onKeyDown, { capture: true });
  return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
}, [onClose]);
```

Modern alternative with a signal:

```tsx
useEffect(() => {
  const controller = new AbortController();
  document.addEventListener("keydown", onKeyDown, { capture: true, signal: controller.signal });
  return () => controller.abort(); // removes the listener for you
}, [onClose]);
```

The named `onKeyDown` is passed to both add and remove, so removal matches by reference. Because focus trapping needs to intercept Tab before deeper handlers, the listener registers in the capture phase, and the capture flag must appear on both `add` and `remove` or the removal silently fails, which is exactly the identity-plus-capture rule. Putting `onClose` in the deps means a new modal callback re-registers a fresh handler and tears the old one down, keeping exactly one live listener.

The `AbortController` form is the cleaner pattern at scale: one `controller.abort()` in cleanup removes every listener you added with that signal, so a modal that registers keydown, focusin, and click-outside listeners tears all of them down with a single call and cannot forget one.

How to spot it in review: `document.addEventListener` in a modal or overlay with an inline handler or a `remove` that omits the capture flag the `add` used. The tell for the leak is any global listener without a symmetric, reference-matched, capture-matched removal.

Production symptom: after opening and closing many dialogs, Escape fires `onClose` on several stale modal closures at once, focus trapping misbehaves, and `document` carries dozens of leaked keydown handlers that retain each modal's scope. It reads as "keyboard shortcuts do weird things after I have been clicking around for a while" and gets worse the longer the tab stays open.

### ajr-l9-leaking-observers: Leaking observers (IntersectionObserver/ResizeObserver)

- **id:** `ajr-l9-leaking-observers`  ·  **difficulty:** advanced  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, leaks, observers

#### Learn

`IntersectionObserver` and `ResizeObserver` are the same leak family as timers and subscriptions, with an extra twist: they hold references to the DOM nodes they observe. When you create an observer and call `observe(node)`, the observer keeps that node and your callback closure alive, and it keeps firing whenever the node's intersection or size changes. Unmounting the component that created the observer does not disconnect it. The observer lives on, watching a node that React has detached, calling a callback that closes over dead state.

The infinite-scroll leak:

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) loadNextPage();
  });
  observer.observe(sentinelRef.current);
}, []); // no disconnect: observer and node leak
```

Mount a list, scroll, unmount it, mount another. The old observer is still watching the old sentinel, and when layout shifts make that detached sentinel "intersect," it fires `loadNextPage` again. You get ghost page fetches from lists the user already navigated away from, plus retained memory for every observed node and closure.

The fix is to disconnect in cleanup:

```tsx
useEffect(() => {
  const el = sentinelRef.current;
  if (!el) return;              // guard: ref may be null on first run
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) loadNextPage();
  });
  observer.observe(el);
  return () => observer.disconnect();
}, []);
```

`observer.disconnect()` stops observing every target and releases the callback and node references. Two subtleties matter. First, `sentinelRef.current` can be `null` on the effect's first run depending on render timing, so guard it or the `observe` call throws. Second, if the observed node can change (the sentinel is conditionally rendered, or you observe `ref.current` that swaps), the node must be a dependency so cleanup re-runs and re-observes the new node, otherwise you observe a stale element. Observing `ref.current` inside a `[]` effect is a classic miss.

**Interview nuance:** `ResizeObserver` has a specific pitfall the spec calls "undelivered notifications." If you make DOM changes inside the resize callback that themselves trigger a resize, and you have disconnected or the loop cannot settle, the browser logs "ResizeObserver loop completed with undelivered notifications." It is a signal that your callback is fighting itself, and it often surfaces right next to a cleanup bug. `unobserve(node)` removes one target; `disconnect()` removes all. Prefer `disconnect()` in effect cleanup because it cannot leave a stray target behind.

Recap: observers retain the nodes they watch and their callback, and unmount does not disconnect them, so return `observer.disconnect()`, guard null refs, and make a changeable observed node a dependency so cleanup re-runs.

#### See it live

**Demo (react-demo):** an infinite-scroll list with a sentinel and an `IntersectionObserver`, a live-observers badge, and the list mounted and unmounted repeatedly while a page-fetch counter logs every triggered load.

The widget renders a scrollable list ending in a sentinel div, a **Live observers: N** badge, a **Page fetches: N** counter that logs each `loadNextPage` call with which mount triggered it, a **Mount / Unmount list** toggle, and a "Disconnect" switch that adds or removes the `return () => observer.disconnect()`. The child is built around this:

```tsx
function InfiniteList() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {  // badge += 1 on create
      if (entry.isIntersecting) loadNextPage();               // fetches += 1
    });
    observer.observe(el);
    return () => observer.disconnect();                       // badge -= 1
  }, []);
  return <ul>{/* rows */}<div ref={sentinelRef} /></ul>;
}
```

With Disconnect off, mounting and unmounting the list two or three times leaves the badge at 2 or 3, and scrolling the current list still triggers page fetches attributed to old, unmounted observers (the log shows "fetch from mount #1" after mount #3 is active). Flip Disconnect on and the badge holds at 1: each unmount disconnects the observer before the next mount creates one.

**Watch:** without `disconnect()` the live-observers badge grows across remounts and the fetch log shows ghost fetches attributed to earlier, unmounted lists; with `return () => observer.disconnect()` the badge stays at 1 and only the current list fetches pages. This proves the observer retains its target node and callback until disconnected, and that unmounting the component does not stop it.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add `return () => observer.disconnect()` to the infinite-scroll effect below, guard the possibly-null ref, and note the `ResizeObserver` undelivered-notifications pitfall. Say why observing `ref.current` in a `[]` effect can watch a stale node. Start from:

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) loadNextPage();
  });
  observer.observe(sentinelRef.current);
}, []);
```

**Think about:**
- What does the observer hold references to?
- When must cleanup run besides unmount?
- What if the ref is null on first run?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The effect creates an observer and observes a node but never disconnects, so the observer outlives the component. Corrected:

```tsx
useEffect(() => {
  const el = sentinelRef.current;
  if (!el) return;                 // ref can be null on first run
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) loadNextPage();
  });
  observer.observe(el);
  return () => observer.disconnect();
}, []);
```

Mechanism: the observer holds a strong reference to every node you pass to `observe` and to the callback closure, and it keeps firing on intersection changes until disconnected. Unmount tears down React's tree but does not reach the observer, which the browser owns. `observer.disconnect()` stops all observation and releases the node and callback, so returning it as cleanup restores symmetry.

When cleanup must run besides unmount: whenever the observed node can change. If the sentinel is conditionally rendered or you observe a `ref.current` that swaps, put that node in the dependency array so React re-runs cleanup (disconnecting the old target) and re-observes the new one. Observing `ref.current` inside a `[]` effect captures whatever the ref pointed at on the first run and never updates, so a later node is watched by nothing and the old node is watched forever.

The null-ref guard: depending on render and commit timing, `sentinelRef.current` may be `null` when the effect first runs, and `observe(null)` throws. Guarding with `if (!el) return` (and depending on the node so the effect re-runs once the ref is set) avoids the crash.

`ResizeObserver` pitfall: if your resize callback mutates layout in a way that triggers another resize, the browser can log "ResizeObserver loop completed with undelivered notifications." It means the callback is causing the resize it is reacting to. Prefer `disconnect()` over `unobserve()` in cleanup because it cannot leave a stray target behind.

How to spot it in review: any `new IntersectionObserver` / `new ResizeObserver` / `new MutationObserver` with no `disconnect()` in cleanup, or observing `ref.current` in a `[]` effect. The tell is a `.observe(` call with no matching `.disconnect(` in the return.

Production symptom: infinite scroll fires ghost page fetches after the user leaves the list, extra network load and duplicated data, and retained memory for every observed node. Misconception to correct: observers do not stop when their node unmounts. The browser keeps the observer alive until you disconnect it.

**Self-check rubric:**
- [ ] The effect returns cleanup that calls `observer.disconnect()`.
- [ ] The possibly-null ref is guarded before `observe`.
- [ ] A changeable observed node is in the dependency array.
- [ ] Answer states the observer retains the node and callback.
- [ ] Answer explains why `ref.current` in a `[]` effect goes stale.
- [ ] Answer mentions the ResizeObserver undelivered-notifications pitfall.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Analytics viewport tracking at scale. A feed logs an "impression" event when each card scrolls into view using one `IntersectionObserver` per card, and cards mount and unmount constantly as the user scrolls a virtualized list. The current code creates an observer per card in a `[]` effect with no disconnect. Write the effect so recycled cards never fire impressions for content they no longer show, avoid the per-card observer explosion, and name the production symptom of getting it wrong.

**Model answer (revealed on demand):**

```tsx
// Per-card effect: disconnect on unmount, re-observe when the node changes.
useEffect(() => {
  const el = cardRef.current;
  if (!el) return;
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) logImpression(cardId); },
    { threshold: 0.5 },
  );
  observer.observe(el);
  return () => observer.disconnect();
}, [cardId]);
```

At scale, prefer one shared observer for the whole list over one per card:

```tsx
// Shared observer created once; cards register/unregister their node.
const observerRef = useRef<IntersectionObserver | null>(null);
useEffect(() => {
  observerRef.current = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) logImpression(entry.target.dataset.cardId);
    }
  }, { threshold: 0.5 });
  return () => observerRef.current?.disconnect();
}, []);
// each card: observerRef.current?.observe(el) on mount, unobserve(el) on unmount
```

The per-card fix disconnects on unmount, so a recycled card stops firing impressions for content it no longer renders, and keying the effect on `cardId` means a recycled node re-observes as the right card. The shared-observer pattern matters for virtualized lists: a browser can run thousands of `IntersectionObserver` instances, but one observer watching many targets is dramatically cheaper and centralizes the disconnect, so there is exactly one cleanup to get right instead of one per card.

How to spot it in review: one `new IntersectionObserver` created inside a per-item component with no disconnect, especially in a virtualized or infinite list where items recycle. The tell is observer creation scaling with item count rather than with the list.

Production symptom: inflated impression counts, because recycled and detached cards keep firing intersection callbacks and logging impressions for content the user never actually saw. Analytics numbers drift upward and correlate with scroll distance rather than real views, memory grows with every recycled observer that was never disconnected, and on long feeds the page slows down. It is the kind of bug that quietly corrupts a metric the business trusts, which makes it worse than a visible crash.

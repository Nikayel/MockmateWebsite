> Module **6.1** (The Dependency Array) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [5.5](./l5-strictmode-loops.md) · Next: [6.2](./l6-cleanup-races.md)

# L6 · The Dependency Array

The dependency array is the single most misread line in React. After this module you will read `[]`, `[options]`, or a disabled exhaustive-deps lint and instantly predict the bug: the effect that never re-syncs, the interval frozen at render 0, or the fetch that loops forever. You will be able to catch these in review before they ship.

---

### ajr-l6-deps-reactivity-contract: The dependency array is a reactivity contract

- **id:** `ajr-l6-deps-reactivity-contract`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, useEffect, deps

#### Learn

An effect does not describe "code that runs after mount." It describes a piece of external state you want to keep synchronized with your React state. The dependency array is the contract: it lists every reactive value the effect reads, and React uses it to decide when the synchronization is out of date and must be redone.

Consider a chat room:

```jsx
function ChatRoom({ roomId }) {
  useEffect(() => {
    const conn = connect(serverUrl, roomId);
    conn.on("open", () => setStatus("connected to " + roomId));
    return () => conn.disconnect();
  }, []); // BUG: reads roomId and serverUrl, lists neither
}
```

This connects once on mount to the first `roomId`, then never again. Change the room in a dropdown and the socket is still glued to the old room. The banner says "connected to general" while you are looking at the "random" room. Messages go to the wrong place.

The `[]` is not a feature that means "connect one time." It is a lie. The effect reads `roomId`, a reactive value that changes between renders, but the deps claim the effect depends on nothing. React believes you. After the first render it has no reason to ever re-run the effect, because the (empty) dependency list never changes.

The fix is to tell the truth:

```jsx
useEffect(() => {
  const conn = connect(serverUrl, roomId);
  conn.on("open", () => setStatus("connected to " + roomId));
  return () => conn.disconnect();
}, [roomId]); // list every reactive value read
```

Now the mechanism kicks in. After every render React does an `Object.is` comparison of each dep against the previous render's value. If any differ, React runs the cleanup from the last effect (`conn.disconnect()`) and then runs the effect again with the new value. Switch rooms and you see `disconnect(general)` then `connect(random)`, exactly once per change. The external system is re-synchronized to match state.

This is why `react-hooks/exhaustive-deps` is a correctness lint, not a style lint. It is not asking you to be tidy. It is verifying that the effect's declared dependencies match the reactive values it actually reads. An empty array under a body that reads props or state is a provable desync waiting to happen.

**Interview nuance:** the strongest answer reframes the effect as "synchronize this external thing with these values" rather than "do this on mount." Once you say that, `[]` obviously means "nothing to stay in sync with," and lying about it is obviously a bug.

If a value genuinely should not be reactive (it never needs to re-trigger the effect), the honest fixes are to move it out of the component, wrap it in a ref, or (React 19+) an Effect Event. Silencing the linter is not one of them.

Recap: deps list every reactive value the effect reads; React `Object.is`-compares them each render and re-runs cleanup-then-effect on any change; `[]` means "no reactive dependencies," so lying with it guarantees a stale, desynced effect.

#### See it live

**Demo (react-demo):** a chat-room effect calling `connect(serverUrl, roomId)` with `[]` deps, plus a `roomId` dropdown, so you can watch it fail to reconnect.

The widget renders a dropdown (`general` / `random` / `support`), a status banner reading "connected to ROOM", and a scrolling log of `connect(...)` / `disconnect(...)` lines. A toggle labeled "list roomId in deps" flips the effect between `[]` and `[roomId]`. Changing the dropdown re-renders the component; a small "renders: N" badge increments so the learner sees renders happening while the socket does not.

```tsx
function ChatRoomDemo({ listRoomId }: { listRoomId: boolean }) {
  const [roomId, setRoomId] = useState("general");
  const [status, setStatus] = useState("connecting...");

  useEffect(() => {
    log(`connect(${roomId})`);
    setStatus(`connected to ${roomId}`);
    return () => log(`disconnect(${roomId})`);
  }, listRoomId ? [roomId] : []); // demo toggles the array

  return (
    <>
      <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
        <option>general</option><option>random</option><option>support</option>
      </select>
      <Banner>{status}</Banner>
    </>
  );
}
```

**Watch:** with the toggle off (`[]` deps) the banner stays frozen on "connected to general" no matter what you pick, and the log shows a single `connect(general)` line that never grows, while the renders badge keeps climbing. That proves renders are happening but the effect is not re-running. Flip the toggle on (`[roomId]`) and every dropdown change logs `disconnect(old) -> connect(new)` once and the banner follows the selection. This is real React running in the browser, not an approximation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Make this chat effect reconnect when `roomId` changes without lying to the linter, and explain why `[]` was a bug and not a feature. Given a chat effect with `[]` deps that never reconnects when `roomId` changes, rewrite the deps correctly and justify it at the mechanism level.

**Think about:**
- What re-runs the effect?
- What does an effect actually describe?
- Why is exhaustive-deps a correctness lint?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The corrected effect lists every reactive value it reads:

```jsx
function ChatRoom({ roomId, serverUrl }) {
  useEffect(() => {
    const conn = connect(serverUrl, roomId);
    conn.connect();
    return () => conn.disconnect();
  }, [serverUrl, roomId]); // both are read, both are listed
}
```

**Why, at the mechanism level.** An effect is a description of how to synchronize an external system (the socket) with reactive state (`roomId`, `serverUrl`). React re-runs that synchronization only when it can prove it is stale, and its proof is the dependency array. After each render React compares each dep with `Object.is` against the previous render. With `[]` there is nothing to compare, so after the first commit React never re-runs the effect. With `[roomId, serverUrl]`, a room change fails the `Object.is` check, so React runs the previous cleanup (`disconnect` from the old room) then the effect again (`connect` to the new room). The socket now tracks state.

`[]` was a bug, not a feature, because "run once" is a side effect of "no reactive dependencies," not a goal you can safely declare when the body clearly reads reactive values. You did not get "connect one time"; you got "connect to whatever `roomId` happened to be on render 0, forever."

**How to spot it in review.** Look for a non-empty effect body sitting above `[]` or above an `// eslint-disable-next-line react-hooks/exhaustive-deps`. Any prop or state name used inside the body that is missing from the array is the smell. The disable comment above a real effect is the loudest tell.

**Production symptom.** The UI keeps talking to the old room, old user, or old filter: messages post to the previous channel, a profile page shows the last user's data, a dashboard keeps querying the filter you just cleared.

**Common misconception, corrected.** `[]` does not mean "run once." It means "this effect has no reactive dependencies." Those are only the same thing when the body genuinely reads nothing reactive. If you truly want a value to not re-trigger the effect, make it non-reactive honestly (move it out of the component, use a ref, or an Effect Event), do not silence the linter.

**Self-check rubric:**
- [ ] Corrected deps include `roomId` and every other reactive value read (e.g. `serverUrl`).
- [ ] Explanation names the `Object.is` per-render comparison and cleanup-then-effect re-run.
- [ ] States that `[]` means "no reactive deps," not "run once."
- [ ] Identifies the review tell (missing dep or eslint-disable over a real body).
- [ ] Names a concrete production symptom (talking to the stale room/user/filter).
- [ ] Rejects "just disable the lint" and gives an honest non-reactive alternative.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Diagnose and fix "the analytics tenant leak." Your `<Dashboard>` subscribes to a live metrics stream: `useEffect(() => { const sub = subscribe(orgId, region, onData); return () => sub.close(); }, [orgId])`. Support reports that after an admin uses the org switcher, they briefly see another tenant's numbers, and changing the region filter never re-subscribes at all. Fix the deps and explain both symptoms.

**Model answer (revealed on demand):**

Two reactive values are read, `orgId` and `region`, but only `orgId` is listed. Both bugs trace to that:

```jsx
useEffect(() => {
  const sub = subscribe(orgId, region, onData);
  return () => sub.close();
}, [orgId, region]); // list both reactive reads
```

**Region never re-subscribes.** `region` is missing from the array, so changing the filter passes React's `Object.is` check on `[orgId]` unchanged, and the effect does not re-run. The stream is still filtered to the old region. This is the same "connected to the first room forever" failure, scoped to one of two dependencies.

**The tenant leak.** With only `[orgId]`, switching orgs does re-run the effect, but watch the ordering and the closure. If `onData` or any handler closes over a stale `orgId`/`region`, or if `subscribe` resolves asynchronously, the old subscription's in-flight callback can deliver data after the org switch but before cleanup completes, painting tenant A's numbers into tenant B's dashboard for a frame. Listing all deps makes React run the full cleanup (`sub.close()`) for the old org before opening the new subscription, and pairing that with an ignore-stale guard (a request id or an `ignore` boolean checked in `onData`, covered in 6.2) closes the leak entirely.

**How to spot it in review.** A multi-argument subscription or fetch whose deps array is shorter than its argument list is the signature. Here `subscribe(orgId, region, ...)` takes two reactive inputs but the array has one. Count the reactive reads, count the deps, they must match.

**Production symptom.** Cross-tenant data exposure (a security incident, not just a UX glitch) plus filters that silently do nothing. In a multi-tenant product the first symptom is the one that pages you.

**Misconception, corrected.** "It re-runs when the org changes, so the deps are fine" confuses "re-runs sometimes" with "re-runs whenever any read value changes." The contract must cover every reactive read, not just the one that happens to be most obvious.

**Self-check rubric:**
- [ ] Deps include both `orgId` and `region`.
- [ ] Explains region-not-resubscribing via the unchanged `Object.is` comparison.
- [ ] Ties the tenant leak to stale closures / async ordering, not just the missing dep.
- [ ] Names cleanup-before-re-subscribe (and forward-references the ignore-stale guard).
- [ ] Calls out the security-grade production symptom.

---

### ajr-l6-stale-closure-effect: Stale closures in effects and intervals

- **id:** `ajr-l6-stale-closure-effect`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, useEffect, stale-closure

#### Learn

A closure captures variable bindings from the exact render that created it. In React, state values like `count` are not mutable slots that update in place; each render gets its own `count` constant. So a function created during render 0 sees render 0's `count` for as long as that function lives, no matter how many times the component re-renders afterward.

This is why the classic interval counter is broken:

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // count is captured from render 0: always 0
    }, 1000);
    return () => clearInterval(id);
  }, []); // effect runs once; the interval callback lives forever
  return <h1>{count}</h1>;
}
```

The `[]` means the effect runs once, creating one interval whose callback closes over render 0. Every tick computes `setCount(0 + 1)`, so state goes 0 to 1 and then freezes. The interval is not broken; it fires every second. It just keeps recomputing `1` because its `count` is permanently `0`.

There are three honest fixes, and they are not equivalent.

**1. Functional updater (best here).** `setCount(c => c + 1)`. The updater receives the latest committed state from React, so it does not read the captured `count` at all. The interval can stay on `[]` because it no longer depends on `count`.

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

**2. Add `count` to deps.** `[count]`. Now the effect re-runs after every increment, which tears down the old interval and creates a new one closing over the fresh `count`. It works, but you clear and recreate a timer every tick, which shifts the timing and is wasteful. Fine for a value that changes rarely, wrong for a per-second timer.

**3. Latest ref.** Keep a `countRef` you update on every render (`countRef.current = count`) and read `countRef.current` inside the interval. The callback always sees the newest value without re-subscribing. This is the general escape hatch when the value is read but should not itself re-trigger the effect (an interval reading the latest query, token, or callback).

**Interview nuance:** "add it to the deps" is the reflex answer and often the worst one for timers and subscriptions, because it recreates the external resource on every change. The functional updater sidesteps the closure without touching deps; reach for it first when the new state is derived from the old.

Recap: closures freeze the render that created them, so a `[]` interval reading `count` sees render 0 forever; fix with a functional updater (no dep needed), a latest ref, or adding the value to deps (which recreates the timer each change).

#### See it live

**Demo (react-demo):** a broken interval counter doing `setCount(count + 1)` with `[]` deps, next to a "captured value" panel that shows what `count` the interval closure is holding.

The widget shows a big number, a "captured count in interval closure" readout, and three buttons: "functional updater", "count in deps", "latest ref". A "renders: N" badge climbs as state changes. Starting broken, the number jumps 0 -> 1 and freezes while the captured-value panel reads 0. Clicking a fix rewires the interval so the number starts climbing.

```tsx
function CounterDemo({ mode }: { mode: "broken" | "updater" | "deps" | "ref" }) {
  const [count, setCount] = useState(0);
  const latest = useRef(count);
  latest.current = count;

  useEffect(() => {
    const id = setInterval(() => {
      if (mode === "broken") setCount(count + 1);      // captures render 0
      else if (mode === "updater") setCount(c => c + 1); // latest via updater
      else if (mode === "ref") setCount(latest.current + 1);
      else setCount(count + 1);                          // "deps" mode adds [count]
    }, 1000);
    return () => clearInterval(id);
  }, mode === "deps" ? [count] : []);

  return <Big value={count} capturedInClosure={count /* frozen in broken mode */} />;
}
```

**Watch:** in "broken" mode the number does exactly one step, 0 to 1, then stops, and the captured-value panel stays pinned at 0, proving the interval callback is holding render 0's `count`. Switch to "functional updater" and it climbs smoothly with no interval churn. Switch to "count in deps" and it also climbs, but a second badge shows the interval being cleared and recreated every tick. Switch to "latest ref" and it climbs while the closure reads the live ref. Real React in the browser.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix the counter interval that sticks at 1. Given the `setCount(count + 1)` interval with `[]` deps, rewrite it three ways (functional updater, `count` in deps, latest ref) and articulate the tradeoffs of each.

**Think about:**
- Why does the callback see `count` as 0 forever?
- How does the updater form sidestep it?
- What does adding `count` to deps do to the timer?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

**Why it sticks at 1.** The effect runs once (`[]`), creating a single interval whose callback is a closure over render 0. In React each render has its own `count` constant; render 0's is `0`. Every tick evaluates `setCount(0 + 1)`, so state moves to 1 and then recomputes 1 forever. The timer works; the captured value is frozen.

**Fix A, functional updater (preferred).**

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

`c => c + 1` asks React for the latest committed state instead of reading the captured `count`, so the closure staleness is irrelevant and `[]` is now honest (the effect really has no reactive deps). Best when the next state is derived from the previous state. One stable interval, correct timing.

**Fix B, add `count` to deps.**

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, [count]);
```

Correct but costly: after each increment `Object.is` on `[count]` fails, so React clears the old interval and creates a new one closing over the fresh `count`. You recreate the timer every second, which resets its phase and drifts. Acceptable for values that change rarely, wrong for a per-tick timer.

**Fix C, latest ref.**

```jsx
const countRef = useRef(count);
countRef.current = count;
useEffect(() => {
  const id = setInterval(() => setCount(countRef.current + 1), 1000);
  return () => clearInterval(id);
}, []);
```

The interval reads a mutable ref that you refresh every render, so it always sees the newest value without re-subscribing. This is the general tool when a long-lived callback must read fresh state (or a fresh prop callback) but that state should not restart the effect.

**How to spot it in review.** A `setInterval`, `setTimeout`, or subscription inside a `[]` effect that reads state or props directly in its callback. If the callback names `count` and the deps are `[]`, it is stale.

**Production symptom.** Frozen counters and progress bars, and worse, pollers that keep using a stale query, filter, or auth token because the polling callback captured the first one.

**Misconception, corrected.** "Adding the value to deps is always the fix." For timers and subscriptions it often is the worst fix because it recreates the resource on every change. Prefer the updater when state derives from state, and a ref when you need the latest value without re-subscribing.

**Self-check rubric:**
- [ ] Explains the freeze via per-render `count` constant captured by the render-0 closure.
- [ ] Functional updater shown, and noted it makes `[]` honest.
- [ ] `[count]` fix shown, with the "recreates the interval each tick" tradeoff called out.
- [ ] Latest-ref fix shown with `ref.current` refreshed each render.
- [ ] Names a real production symptom (frozen counter or stale-token poller).
- [ ] Rejects "always add to deps" as the universal fix.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Fix "the stale-token poller." A `<LiveOrders>` component polls every 5 seconds: `useEffect(() => { const id = setInterval(() => fetch(url, { headers: { Authorization: token } }).then(setOrders), 5000); return () => clearInterval(id); }, [])`. After a token refresh, polling keeps sending the expired token and every request 401s until the user reloads. Fix it so the poll always uses the current token without restarting the timer on every token change, and say why the naive `[token]` fix is undesirable here.

**Model answer (revealed on demand):**

The interval callback closed over the `token` from render 0. A token refresh produces a new render with a new `token` constant, but the long-lived callback still holds the original, so it keeps sending the expired credential and every poll 401s.

The naive fix, `}, [token, url])`, is correct but recreates the interval on every token refresh. That resets the 5-second phase (a refresh mid-cycle can double-fire or skip a beat) and, if `url` or `token` churn, you thrash timers. For a periodic poller you want one stable interval that reads fresh values, so use a latest ref:

```jsx
function LiveOrders({ url, token }) {
  const [orders, setOrders] = useState([]);
  const tokenRef = useRef(token);
  tokenRef.current = token; // refreshed every render
  const urlRef = useRef(url);
  urlRef.current = url;

  useEffect(() => {
    const id = setInterval(() => {
      fetch(urlRef.current, { headers: { Authorization: tokenRef.current } })
        .then((r) => r.json())
        .then(setOrders);
    }, 5000);
    return () => clearInterval(id);
  }, []); // one interval; reads always-current refs
}
```

**Mechanism.** The refs are mutable containers updated on every commit, so the callback dereferences the newest token at call time instead of the captured one. The effect has no reactive deps that should restart it, so `[]` is now honest and the timer phase stays stable. In React 19 an Effect Event (`useEffectEvent`) expresses the same intent more declaratively: read latest values without making them reactive.

**How to spot it in review.** A polling or streaming callback in a `[]` effect that reads an auth token, a query, or a filter directly. The tell is "long-lived callback + short-lived value read directly."

**Production symptom.** A wall of 401s after token rotation, stale data after a filter change, and users who "fix it by refreshing." In dashboards this looks like the app silently going dead until reload.

**Misconception, corrected.** "Just add `token` to deps." It works but restarts the timer every rotation, which is exactly the churn a poller should avoid. The ref (or Effect Event) keeps one timer and still reads fresh values.

**Self-check rubric:**
- [ ] Diagnoses the render-0 `token` capture as the cause of the 401s.
- [ ] Uses a latest ref (or Effect Event) so the timer is not recreated per rotation.
- [ ] Explains why `[token]` is undesirable (phase reset / timer churn) for a poller.
- [ ] Refreshes the ref on every render (`ref.current = token`).
- [ ] Names the 401-after-rotation production symptom.

---

### ajr-l6-object-function-deps-loop: Object/function deps cause infinite loops

- **id:** `ajr-l6-object-function-deps-loop`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, useEffect, identity

#### Learn

React compares dependencies with `Object.is`, which for objects, arrays, and functions compares identity (reference), not contents. Two object literals with the same fields are still two different references, so `Object.is` returns `false`. That single fact is behind one of the most common React freezes.

```jsx
function SearchResults({ userId }) {
  const options = { userId }; // NEW object every render
  useEffect(() => {
    fetchData(options).then(setResults); // setState triggers a render
  }, [options]); // options is never Object.is-equal to last render's
}
```

Trace it. Render 1 creates `options` (reference A) and runs the effect. The effect calls `setResults`, which schedules render 2. Render 2 creates `options` again (reference B). React compares `[B]` with `[A]`: `Object.is(A, B)` is `false`, because they are distinct literals even though `{ userId }` looks identical. So the effect runs again, calls `setResults` again, schedules render 3, which builds reference C, which is again unequal. This never converges. You get an infinite fetch loop, and if state keeps changing React eventually throws "Maximum update depth exceeded" and the tab locks up.

The trap is that the object looks stable. `{ userId: 7 }` today and `{ userId: 7 }` next render are equal to a human and unequal to `Object.is`. Deps do not compare `userId` inside; they compare the box around it.

Three fixes, in order of preference:

**1. Depend on the primitive (best).**

```jsx
useEffect(() => {
  fetchData({ userId }).then(setResults);
}, [userId]); // number: Object.is(7, 7) is true
```

`userId` is a number, so `Object.is` compares by value and the effect only re-runs when the id actually changes. The object is built inside the effect where its identity does not matter. Simplest and fastest.

**2. Construct the object inside the effect.** Same idea: keep the non-primitive out of the dependency array entirely so there is no unstable reference to compare.

**3. `useMemo` the object.**

```jsx
const options = useMemo(() => ({ userId }), [userId]);
useEffect(() => { fetchData(options).then(setResults); }, [options]);
```

Now `options` keeps a stable identity until `userId` changes. Correct, but heavier: you only reach for it when the object must be shared with several effects or passed to memoized children. For a single effect, prefer fix 1.

**Interview nuance:** the same identity rule causes the function-dep loop. A handler defined in the body is a new function each render, so listing it in an effect's deps (or passing it to a memoized child) re-runs or re-renders every time. The fixes mirror above: `useCallback`, move it inside, or depend on the primitives it needs.

Recap: `Object.is` compares references, so an object, array, or function created in the render body is never equal across renders and makes the effect run every render; combined with `setState` in the effect it loops forever. Fix by depending on primitives, building the value inside the effect, or memoizing it.

#### See it live

**Demo (react-demo):** `const options = {userId}; useEffect(() => fetchData(options), [options])` with a render-count badge and a dep-diff panel, so you can watch the loop spin and then stop.

The widget shows a "renders: N" badge, a "fetches fired: N" counter, and a dep-diff panel that prints the previous and current `options` reference ids each render (for example `prev #A1 -> curr #A2, equal? false`). A mode switch offers "broken (`[options]`)", "primitive (`[userId]`)", "memo". A guard caps the runaway at a few hundred iterations so the demo does not actually hang the tab.

```tsx
function DepLoopDemo({ mode }: { mode: "broken" | "primitive" | "memo" }) {
  const [userId] = useState(7);
  const [results, setResults] = useState(0);

  const optionsBroken = { userId };                    // new ref every render
  const optionsMemo = useMemo(() => ({ userId }), [userId]); // stable ref
  const options = mode === "memo" ? optionsMemo : optionsBroken;

  useEffect(() => {
    fireFetch();               // increments the "fetches fired" counter
    setResults((n) => n + 1);  // schedules another render
  }, mode === "primitive" ? [userId] : [options]);

  return <DepDiff options={options} renders={/* badge */} />;
}
```

**Watch:** in "broken" mode the renders badge and the fetch counter spin together, and the dep-diff panel prints `equal? false` on every line because `options` is a fresh reference each render. The runaway is capped so you see it climb fast and then hit the guard, which is the in-browser stand-in for the real "Maximum update depth exceeded" freeze. Switch to "primitive" (`[userId]`) or "memo" and the counters run once and stop, and the dep-diff panel prints `equal? true`. This is real React; only the iteration cap is a safety approximation of the true hang, which we call out here honestly.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix the effect that loops forever. Given `const options = {userId}; useEffect(() => fetchData(options), [options])`, rewrite it three ways (primitive dep, object inside the effect, `useMemo`) and say which is best and why.

**Think about:**
- Why is `{userId}` never equal to the last render's `options`?
- What loop does a `setState`-in-effect create with this?
- Which fix is preferred?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

**Why it loops.** `options` is an object literal built fresh in the render body, so it is a new reference every render. React compares deps with `Object.is`, which for objects compares identity, not fields. `Object.is(prevOptions, nextOptions)` is always `false` even though both are `{ userId: 7 }`. So the effect re-runs every render. Because the effect calls `setResults` (setState), each run schedules another render, which builds another unequal `options`, which re-runs the effect: an infinite loop that ends in "Maximum update depth exceeded."

**Fix 1, primitive dep (best).**

```jsx
useEffect(() => {
  fetchData({ userId }).then(setResults);
}, [userId]);
```

`userId` is a number, so `Object.is` compares by value; the effect re-runs only when the id changes. The object is created inside the effect where identity is irrelevant. Simplest, no extra hooks.

**Fix 2, build the object inside the effect.** Move `const options = { userId }` into the effect body and depend on `[userId]`. Same effect, no unstable reference ever reaches the dependency array.

**Fix 3, `useMemo`.**

```jsx
const options = useMemo(() => ({ userId }), [userId]);
useEffect(() => { fetchData(options).then(setResults); }, [options]);
```

Gives `options` a stable identity until `userId` changes. Correct, but only worth it when the same object must be shared across effects or passed to memoized children. For one effect it is overkill; prefer fix 1.

**How to spot it in review.** An object, array, or function literal declared in the component body that then appears in a dependency array. `const x = { ... }` / `const fn = () => ...` on one line and `[x]` / `[fn]` a few lines down is the signature. Same rule applies to inline props passed to `React.memo` children.

**Production symptom.** Infinite network requests hammering your API, a spinning fan, and eventually "Maximum update depth exceeded" freezing the tab. In production without StrictMode it can silently DDoS your own backend before the crash.

**Common misconception, corrected.** "Deps compare object contents, so `{ userId: 7 }` equals `{ userId: 7 }`." They do not. `Object.is` compares references for non-primitives. Equal-looking objects are different dependencies. That is precisely why depending on the primitive `userId` is the clean fix.

**Self-check rubric:**
- [ ] Explains `Object.is` compares reference, not fields, so the literal is never equal.
- [ ] Names the `setState`-in-effect feedback loop as what makes it infinite.
- [ ] Shows the primitive-dep fix and identifies it as best for a single effect.
- [ ] Shows the `useMemo` fix and scopes it to shared/memoized-child cases.
- [ ] Names the production symptom (runaway fetches / Maximum update depth).
- [ ] Corrects the "deps compare contents" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Diagnose "the parent-callback re-render storm." A `<DataTable rows={rows} onRowClick={...} />` is wrapped in `React.memo`, but it still re-renders on every parent render and its `useEffect(() => subscribe(config), [config, onRowClick])` re-subscribes constantly. The parent passes `onRowClick={() => openDrawer(id)}` and `config={{ pageSize: 25 }}` inline. Fix the storm and explain why `React.memo` was not helping.

**Model answer (revealed on demand):**

`React.memo` shallow-compares props with `Object.is`. The parent passes two non-primitive props created inline every render: `onRowClick={() => openDrawer(id)}` is a new function each time, and `config={{ pageSize: 25 }}` is a new object each time. Both fail the `Object.is` check, so `memo` sees "props changed" on every parent render and re-renders the table anyway. Inside, the effect deps `[config, onRowClick]` are unequal for the same reason, so it tears down and recreates the subscription on every render.

Stabilize the identities in the parent:

```jsx
const config = useMemo(() => ({ pageSize: 25 }), []);
const onRowClick = useCallback((id) => openDrawer(id), [openDrawer]);
// <DataTable rows={rows} config={config} onRowClick={onRowClick} />
```

Now `config` and `onRowClick` keep stable references across parent renders, so `memo`'s shallow compare passes and the table skips re-rendering, and the child effect's `[config, onRowClick]` stay `Object.is`-equal so the subscription is created once.

**Mechanism.** Both `React.memo` prop comparison and `useEffect` dep comparison run the same `Object.is` identity check. An inline object or arrow is a fresh reference per render, so it defeats both. `useMemo`/`useCallback` cache the reference and only produce a new one when their own deps change.

**How to spot it in review.** Inline `{...}`, `[...]`, or `() => ...` passed as props to a `React.memo` component, or appearing in a child effect's deps. If a memoized child still re-renders "for no reason," inspect its props for unstable identities first.

**Production symptom.** Jank on large tables and lists (every keystroke or unrelated parent state change re-renders thousands of rows), plus subscription churn (connect/disconnect spam) that can rate-limit a realtime backend.

**Misconception, corrected.** "Wrapping the child in `React.memo` fixes re-renders." It only helps if the props are referentially stable. `memo` plus inline object/function props is a no-op; you must also memoize what you pass in.

**Self-check rubric:**
- [ ] Explains `React.memo` uses `Object.is` shallow prop compare, defeated by inline object/function props.
- [ ] Stabilizes `config` with `useMemo` and `onRowClick` with `useCallback`.
- [ ] Connects the same identity rule to both the re-render and the effect re-subscribe.
- [ ] Names jank and subscription churn as the production symptoms.
- [ ] Corrects "memo alone fixes it" by requiring stable prop identities.

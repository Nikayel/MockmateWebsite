> Module **5.5** (StrictMode & Render Loops) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [5.4](./l5-reconciliation-keys.md) · Next: [6.1](./l6-dependency-array.md)

# L5 · StrictMode & Render Loops

React's dev environment deliberately runs some of your code twice, and a single misplaced setter can spin the reconciler forever. After this module you can catch the two bugs those behaviors expose: an effect or initializer that duplicates work because it is not idempotent, and a `setState` in the render path that throws "Too many re-renders" or freezes the tab.

### ajr-l5-strictmode-double-invoke: StrictMode double-invocation

- **id:** `ajr-l5-strictmode-double-invoke`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, strictmode, effects

#### Learn

New React developers hit this within a week: they add `<React.StrictMode>` (Create React App and Next.js add it for you), open the Network tab, and see every mount fire its fetch *twice*. The instinct is "React is buggy, remove StrictMode." That is the wrong lesson. The double-run is a diagnostic, and suppressing it hides a real bug that will bite in production.

In development only, StrictMode intentionally double-invokes three things to surface impurity:

1. **Render functions** run twice. If your component body mutates something outside itself, you will see the corruption doubled.
2. **State initializers and reducers** run twice. `useState(() => makeId())` calls `makeId` twice; if that has a side effect, you will notice.
3. **Effects** run their full setup then cleanup then setup again on mount: React mounts the component, runs the effect, immediately unmounts it (running cleanup), then mounts again (running setup again).

That third one is the famous "fetch fires twice." Here is the offending component:

```tsx
function Room({ roomId }: { roomId: string }) {
  useEffect(() => {
    fetch("/api/join", { method: "POST", body: JSON.stringify({ roomId }) });
  }, [roomId]);
  return <div>In room {roomId}</div>;
}
```

In StrictMode this POSTs to `/api/join` twice on mount. The double-invoke is *simulating* what React does for real when a component unmounts and remounts (a Fast Refresh in dev, a route you navigate away from and back to, a future feature like offscreen pre-rendering). If your effect is not idempotent, it is already broken on those real remounts. StrictMode just makes the bug reproduce on every mount instead of intermittently.

The fix is to make setup and cleanup symmetric. Cancel or undo in the cleanup what you started in the setup:

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch("/api/join", {
    method: "POST",
    body: JSON.stringify({ roomId }),
    signal: controller.signal,
  }).catch((e) => { if (e.name !== "AbortError") throw e; });
  return () => controller.abort();
}, [roomId]);
```

Now the sequence is setup (fetch starts) then cleanup (fetch aborted) then setup (fetch starts again): a net one live request. The initializer case is fixed by keeping initializers pure: `makeId` should only compute, never log to analytics or write to a ref.

**Interview nuance:** the double-invoke is dev-only and gated behind StrictMode. Production runs everything once. So "it works in prod, duplicates in dev" is the exact signature of a non-idempotent effect. The correct response is never "remove StrictMode," it is "add cleanup."

Recap: StrictMode double-invokes render, initializers, and mount effects (setup/cleanup/setup) in dev to prove your side effects are idempotent; fix with symmetric cleanup and pure initializers, not by deleting StrictMode.

#### See it live

**Demo (react-demo):** a `Room` component whose effect POSTs to `/api/join` (mocked) firing twice, plus a `useState(() => makeId())` logging two ids, with a StrictMode on/off toggle.

A widget with a toggle switch labeled "StrictMode" at the top and a "Mount / Remount Room" button below it. Mounting the `Room` renders a card that shows three live counters: an **effect-run counter** (increments on every setup), a **live requests** counter (increments on setup, decrements on cleanup/abort), and an **ids generated** log listing every id the initializer produced. There are two builds toggled by a "Fixed (idempotent)" checkbox: the broken effect with no cleanup, and the fixed effect with `AbortController`. The widget is built around this snippet:

```tsx
function Room({ roomId, fixed }: { roomId: string; fixed: boolean }) {
  const [id] = useState(() => { log("id: " + makeId()); return makeId(); });
  useEffect(() => {
    bumpEffectRuns();
    const controller = new AbortController();
    liveRequests.increment();
    mockJoin(roomId, controller.signal).finally(() => {});
    return fixed ? () => { controller.abort(); liveRequests.decrement(); } : undefined;
  }, [roomId, fixed]);
  return <div className="card">room {roomId} · id {id}</div>;
}
```

**Watch:** With StrictMode on and the effect broken, the effect-run counter jumps to 2 on a single mount, live requests climbs to 2 and stays there, and the id log prints two ids. Flip "Fixed" on and live requests settles to 1 (setup, abort, setup nets one), while the effect-run counter still shows 2 because the double-invoke itself is the point: the counter proving your cleanup ran is exactly what you want to see. Flip StrictMode off and everything runs once, which is production. The mount/unmount/mount is a faithful React behavior, not an approximation, so this demo is genuinely live.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Make this effect idempotent with cleanup and explain why the double-run is a feature: an effect double-POSTs to `/api/join` and an initializer `useState(() => makeId())` logs two ids in dev. Rewrite the effect so a mount nets one live request, and say what the double-run is verifying.

**Think about:**
- What does StrictMode double-invoke?
- What does the extra mount -> unmount -> mount verify?
- What is the correct fix vs the wrong fix?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

StrictMode in dev double-invokes render functions, state initializers/reducers, and effect setup by running setup then cleanup then setup on mount. The extra mount/unmount/mount is verifying that your effect's cleanup exactly undoes its setup, which is the same guarantee real remounts (Fast Refresh, back-navigation, future offscreen rendering) depend on. If cleanup does not cancel the setup, the effect is not idempotent and duplicates work on every real remount.

The correct fix is symmetric cleanup, not removing StrictMode:

```tsx
function Room({ roomId }: { roomId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/join", {
      method: "POST",
      body: JSON.stringify({ roomId }),
      signal: controller.signal,
    }).catch((e) => { if (e.name !== "AbortError") throw e; });
    return () => controller.abort();
  }, [roomId]);
  return <div>In room {roomId}</div>;
}
```

Now setup starts the request, cleanup aborts it, and the second setup starts the live one: a net single request. The two-ids problem is fixed by keeping the initializer pure. `useState(() => makeId())` should only compute and return; if `makeId` logs, increments a counter, or writes a ref, move that into an effect (with cleanup) where double-invocation is safe.

**Mechanism:** the double-invoke is dev-only and gated by StrictMode; production mounts run each effect once. So the double-run is not the bug, it is a stress test that forces an intermittent production bug (duplicate subscriptions/POSTs) to reproduce deterministically on every mount.

**How to spot it in review:** an effect that starts something (fetch, `addEventListener`, `setInterval`, a subscription) with no `return () => ...` cleanup, or an initializer/reducer/render body that has a visible side effect. "Works in prod, duplicates in dev" is the tell.

**Production symptom:** double subscriptions, double analytics events, double POSTs, or a socket that leaks a connection every time the same component remounts on a real navigation.

**Common misconception:** that the double-run is a React bug to silence by deleting StrictMode. Removing StrictMode hides the signal but leaves the non-idempotent effect, which still fires twice on real remounts in production.

**Self-check rubric:**
- [ ] Effect returns a cleanup that cancels/undoes its setup (AbortController, removeEventListener, unsubscribe).
- [ ] The initializer/reducer/render body is pure (no logging, no counters, no writes).
- [ ] Answer states the double-invoke is dev-only and production runs once.
- [ ] Answer names what the extra mount/unmount/mount verifies (setup and cleanup are symmetric).
- [ ] Fix is "add cleanup," not "remove StrictMode."

#### Practice: real-world variant (save, then reveal)

**Prompt:** Ship the chat feature without the leak: in a WhatsApp-style chat screen, a `useEffect` opens a WebSocket to `wss://chat/${roomId}` and pushes incoming messages into state, with no cleanup. QA reports that after a few room switches the UI shows each message two or three times and CPU climbs. Diagnose it in StrictMode terms and fix it so switching rooms leaves exactly one live socket.

**Model answer (revealed on demand):**

The effect opens a socket but never closes it, so every mount leaks a connection. StrictMode makes this obvious immediately: on the very first mount you get two sockets, and each one appends every message, so the UI shows duplicates before QA even switches rooms. The same leak happens on real room switches because `roomId` is a dependency, so each switch runs setup again without ever tearing down the previous socket. Three room switches leaves three live sockets all writing to state, which is the duplicated messages and the climbing CPU.

```tsx
useEffect(() => {
  const socket = new WebSocket(`wss://chat/${roomId}`);
  const onMessage = (e: MessageEvent) =>
    setMessages((prev) => [...prev, JSON.parse(e.data)]);
  socket.addEventListener("message", onMessage);
  return () => {
    socket.removeEventListener("message", onMessage);
    socket.close();
  };
}, [roomId]);
```

Cleanup removes the listener and closes the socket, so the sequence per mount is open, close, open: one live socket. On a room switch, React runs the previous effect's cleanup (closing the old room's socket) before running setup for the new room. The `setMessages` callback should also key or reset by room so stale messages from the old room do not linger.

**Mechanism:** the leak is a missing-cleanup bug; StrictMode's mount/unmount/mount is a rehearsal of the real room-switch lifecycle. Closing in cleanup makes the effect idempotent so N mounts leave one socket, not N.

**Spot in review:** any `new WebSocket`, `new EventSource`, `.subscribe(`, or `addEventListener` inside an effect with no matching teardown in the returned function. **Production symptom:** memory and CPU that grow with navigation, duplicated realtime updates, and server-side connection counts that never drop.

### ajr-l5-infinite-render-loop: Updating state during render / infinite loops

- **id:** `ajr-l5-infinite-render-loop`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, render-loop, effects

#### Learn

"Too many re-renders. React limits the number of renders to prevent an infinite loop." Nearly every React developer has thrown this, usually by calling a setter in the wrong place. The mechanism is simple once you see it: rendering a component means calling its function; if that function *unconditionally* schedules a state update, React re-renders, which calls the function again, which schedules another update, forever.

Here is the classic version:

```tsx
function Dialog({ shouldOpen }: { shouldOpen: boolean }) {
  const [open, setOpen] = useState(false);
  if (shouldOpen) setOpen(true); // in the render body, runs every render
  return <div>{open ? "open" : "closed"}</div>;
}
```

`setOpen(true)` runs during render. It schedules a re-render. That re-render runs the body again, calls `setOpen(true)` again, schedules another render, and React trips its safety limit and throws "Too many re-renders." Note it is not the `if` that saves you: once `open` is `true`, `setOpen(true)` with the same value would bail out via `Object.is`, but here React never even gets that far in a stable way because the guard is on `shouldOpen`, not on `open`. The rule to internalize: **a setter belongs in an event handler or an effect, never in the raw render body.**

The fix depends on intent. If this should happen on a user action, move it to a handler:

```tsx
<button onClick={() => setOpen(true)}>Open</button>
```

The effect variant is the same bug wearing a disguise:

```tsx
const [count, setCount] = useState(0);
useEffect(() => {
  setCount(count + 1); // count is a dep it also updates
}, [count]);
```

The effect updates `count`, `count` is in the dependency array, so the changed dep re-runs the effect, which updates `count` again: an infinite loop, just paced by commits instead of renders. The tab freezes and you get "Maximum update depth exceeded." The fix is to not list what you set, or better, to not do this at all: if `count` is *derived* from something, compute it in render.

The deeper lesson: most setState-in-render and self-updating-effect bugs are attempts to store a *derived* value in state. If a value can be computed from existing props/state, compute it during render and hold no state for it:

```tsx
const doubled = count * 2; // not useState + useEffect
```

**Interview nuance:** there *is* one legal setState-during-render case. React supports calling a setter during render to adjust state based on a prop change, as long as it is *conditional* and updates a *different* piece of state than the condition reads, so it converges. React special-cases this: it re-renders the component immediately, before committing, without touching the DOM. It is rare and the docs steer you to deriving instead, but it is not universally forbidden.

Recap: an unconditional setter in the render body or an effect that updates a dep it lists schedules an endless chain of renders; move setters to handlers/effects, fix deps, and prefer deriving values over storing them.

#### See it live

**Demo (react-demo):** a component that calls `setOpen(true)` in its body (throwing "Too many re-renders"), and a `useEffect(() => setCount(count + 1))` with `count` in its deps, each with a "Fix it" toggle.

A widget with two panels. The left panel mounts a `Dialog` whose body calls `setOpen(true)`; a live **render-count meter** ticks up rapidly and then flips to a red "Too many re-renders" error banner (the demo catches the thrown error in an error boundary and shows React's actual message). A "Move setter to onClick" button rebuilds it with the setter in a handler, and the meter drops to a flat 1 render, incrementing only when you click the button. The right panel mounts the effect-loop component with the same runaway meter and "Maximum update depth exceeded" banner; a "Fix deps" toggle removes the bad dependency and the meter stabilizes. The left panel is built around this snippet:

```tsx
function Dialog({ shouldOpen, fixed }: { shouldOpen: boolean; fixed: boolean }) {
  const [open, setOpen] = useState(false);
  renderMeter.current += 1;
  if (!fixed && shouldOpen) setOpen(true); // the loop
  return (
    <div className="card">
      {fixed && <button onClick={() => setOpen(true)}>Open</button>}
      {open ? "open" : "closed"} · renders: {renderMeter.current}
    </div>
  );
}
```

**Watch:** in the broken state the render meter runs away to React's internal limit (about 25 renders) and then the real "Too many re-renders" / "Maximum update depth exceeded" error appears, exactly as it would in your app. After applying each fix the meter goes flat, incrementing only on your click. This is genuinely live: the error is React's own thrown error caught by a boundary, not a mocked message.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Move the setter to an event handler and separately fix the effect: a component calls `setOpen(true)` directly in its body and throws "Too many re-renders," and a `useEffect(() => setCount(count + 1), [count])` loops forever. Rewrite both so nothing runs on a loop, and say why each looped.

**Think about:**
- Why does a setter in render loop?
- Is there any legal setState-during-render case?
- What is the better alternative to storing derived values?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

A setter in the render body loops because rendering *is* calling the component function, and an unconditional setter during that call schedules a new render, which calls the function again and schedules another, until React trips its safety limit and throws "Too many re-renders." The effect loops for the same reason one commit later: it updates `count`, `count` is a listed dependency, so the changed dep re-runs the effect, which updates `count` again.

Move the setter to where an action happens, and stop the effect from depending on what it sets:

```tsx
// 1) setter belongs in a handler, not the render body
function Dialog() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      {open ? "open" : "closed"}
    </div>
  );
}

// 2) if the value is derived, do not store it at all
function Counter({ base }: { base: number }) {
  const doubled = base * 2; // computed in render, no state, no effect
  return <div>{doubled}</div>;
}
```

**Mechanism:** React re-renders whenever a setter is called with a new value (or the component is otherwise scheduled). A setter reached unconditionally on every render creates an unbroken chain of schedules. Deriving a value in render breaks the chain because computing `base * 2` schedules nothing.

**How to spot it in review:** any `setX(...)` at the top level of a component body (not inside a handler, effect, or callback), and any effect whose body calls a setter for a value that also appears in its dependency array. Both are red flags on sight.

**Production symptom:** a frozen or crashing tab and the console errors "Too many re-renders" or "Maximum update depth exceeded"; in milder cases, a component that pins a CPU core re-rendering in a tight loop.

**Common misconception:** that you can freely `setState` in render to compute values. You cannot as a general pattern. The one legal case is a *conditional* setter during render that adjusts a *different* state slice than the condition reads so it converges (React re-renders immediately without committing), but the documented default is to derive the value in render instead of storing it.

**Self-check rubric:**
- [ ] The setter is moved out of the render body into an event handler (or effect).
- [ ] The looping effect no longer sets a value it lists as a dependency.
- [ ] Any purely derived value is computed in render, not held in state + synced by an effect.
- [ ] Answer explains render == calling the function, so an unconditional setter re-schedules forever.
- [ ] Answer names the real errors ("Too many re-renders" / "Maximum update depth exceeded").

#### Practice: real-world variant (save, then reveal)

**Prompt:** Fix the pricing page that hangs on load: a checkout component holds `const [total, setTotal] = useState(0)` and runs `useEffect(() => setTotal(items.reduce((s, i) => s + i.price, 0)), [items, total])` to keep the total in sync. On a cart with a few items the page freezes and Sentry reports "Maximum update depth exceeded." Diagnose and fix it so the total is always correct without a loop.

**Model answer (revealed on demand):**

The total is a *derived* value that has been wrongly stored in state and re-synced by an effect, and the effect lists `total` in its dependencies. The effect sets `total`, `total` changes, the changed dep re-runs the effect, it sets `total` again: an infinite commit loop that freezes the tab with "Maximum update depth exceeded." Even removing `total` from the deps would only paper over it; the real problem is holding state for something you can compute.

Delete the state and the effect and compute the total during render:

```tsx
function Checkout({ items }: { items: Item[] }) {
  const total = items.reduce((sum, i) => sum + i.price, 0);
  return <div>Total: ${total.toFixed(2)}</div>;
}
```

Now the total is recomputed on every render from the current `items`, so it is impossible for it to drift, and there is no setter in the loop to schedule anything. If the reduction were genuinely expensive, wrap it in `useMemo(() => items.reduce(...), [items])`, which caches without introducing a state loop. The rule: a value computable from existing props/state should be derived in render (optionally memoized), never mirrored into `useState` and synced by an effect.

**Mechanism:** the effect-plus-listed-dep is a self-triggering cycle at commit cadence. Deriving in render removes both the setter and the dependency, so nothing re-schedules. **Spot in review:** `useState` + `useEffect` whose only job is to copy a computed value into that state, especially when the computed source is also a dependency. **Production symptom:** a hung tab, a spiking CPU core, and "Maximum update depth exceeded" in your error tracker on the pages that render this component.

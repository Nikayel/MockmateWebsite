> Module **1.1** (Closures & Capture) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [0.3](./l0-async-await-desugar.md) · Next: [1.2](./l1-references-identity.md)

# L1 · Closures & Capture

A closure does not photograph a value, it holds a live reference to a variable binding and to the entire scope that binding lives in. After this module you will be able to catch the four ways that fact bites in real code: a loop that captures one shared `var`, a `setInterval` that freezes on render-0 state, a once-registered listener that saves stale data, and a callback that quietly pins a 50MB object in the heap.

### ajr-l1-for-loop-var-capture: The for-loop var capture bug (one shared binding)

- **id:** `ajr-l1-for-loop-var-capture`  ·  **difficulty:** easy  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** closures, scope, var-let

#### Learn

Run this and predict the output before you read on:

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}
// logs: 3, 3, 3
```

Most people expect `0, 1, 2`. The reason it prints `3, 3, 3` is the single most useful fact about closures: a closure captures the *binding*, not the *value at the moment the function was created*. All three arrow functions close over the same variable `i`, because `var` is function-scoped, so the whole loop shares exactly one `i` binding. By the time the timer callbacks actually run (after the synchronous loop finishes and the event loop drains the timer queue), `i` has already been incremented to its terminal value `3`. Three callbacks, one binding, one final value.

`let` changes this because `let` in a `for` header creates a *fresh binding per iteration*. The spec literally copies the loop variable into a new binding at the start of each iteration and copies it back out at the end. So each callback closes over a *different* `i`:

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}
// logs: 0, 1, 2
```

An IIFE (immediately invoked function expression) achieves the same thing manually. You pass `i` as an argument, which creates a new parameter binding that holds a copy of the current value:

```js
for (var i = 0; i < 3; i++) {
  (function (j) {
    setTimeout(() => console.log(j));
  })(i);
}
// logs: 0, 1, 2
```

Here `j` is a fresh binding on each call, frozen at the argument value. `forEach`, `map`, and other iteration methods give you the same win for free because the callback parameter is a new binding per call.

**Interview nuance:** the crisp one-liner is "closures capture variables, not values." If you say "closures capture a snapshot," a sharp interviewer will hand you the `var` loop and watch you get `3, 3, 3` wrong. The `var` bug is not about timing being weird, it is about there being only one box.

**Interview nuance:** be ready to explain *why* `let` works at the spec level (per-iteration binding, not just block scope). Plenty of candidates know "use let" as a spell without knowing the mechanism.

Recap: `var` gives one function-scoped binding that every deferred callback shares and reads at its terminal value; `let` and per-iteration IIFEs give a fresh binding per iteration so each callback keeps its own value.

#### See it live

**Demo (js-runnable):** two loops registering three `setTimeout` callbacks each, a `var` version and a `let` version, logging side by side so you can see one column collapse to the terminal value.

```js
// Deterministic: setTimeout(0) callbacks fire in registration order.
const out = { A: [], B: [] };

// A) var: one shared, function-scoped binding
for (var i = 0; i < 3; i++) {
  setTimeout(() => out.A.push(i));
}

// B) let: a fresh per-iteration binding
for (let j = 0; j < 3; j++) {
  setTimeout(() => out.B.push(j));
}

// Drain the timer queue, then report.
setTimeout(() => {
  console.log("A) var  ->", out.A.join(", ")); // 3, 3, 3
  console.log("B) let  ->", out.B.join(", ")); // 0, 1, 2
}, 10);
```

**Watch:** column A prints `3, 3, 3` because all three callbacks read the one shared `i`, already advanced to `3` before any timer fires. Column B prints `0, 1, 2` because each iteration made a new `j`. This proves the difference is the *number of bindings*, not timing: both columns run their callbacks at the same moment, yet only the shared-binding column collapses.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Make each timer log its own index two ways (`let`, and an IIFE) and explain why both work, given `for (var i=0;i<3;i++) setTimeout(()=>log(i))` that logs `3,3,3`.

**Think about:**
- Do the timers capture the value of `i` or the variable `i`?
- What makes `let` special inside a `for` header?
- Why does an IIFE with `i` as an argument fix it?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The timers capture the *variable* `i`, not its value at creation time. With `var` there is one function-scoped `i`; the synchronous loop finishes and leaves it at `3` before any timer callback runs, so all three read `3`.

Fix 1, `let`:

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i)); // 0, 1, 2
}
```

`let` in a `for` header is special: the spec creates a new binding for each iteration and copies the current value in. So the three callbacks close over three different `i` bindings, each frozen at the iteration where it was created.

Fix 2, IIFE:

```js
for (var i = 0; i < 3; i++) {
  (function (index) {
    setTimeout(() => console.log(index)); // 0, 1, 2
  })(i);
}
```

Passing `i` as an argument creates a fresh parameter binding (`index`) per call, holding a copy of the current value. Same effect as `let`, done manually.

Both work because they replace one shared binding with one binding per iteration. That is the whole game.

**How to spot it in review:** any `var` (or a `let` declared *above* the loop and merely mutated inside) in a loop that registers a callback, subscribes, or pushes a function into an array. The tell is a deferred read of the loop variable.

**Production symptom:** you build click handlers in a loop over table rows and every handler acts on the last row (or the wrong row), because they all closed over one shared index that ended at `rows.length`.

**Common misconception:** "closures capture a snapshot of the value at creation time." They do not. They capture the binding. If the binding is shared and later mutated, every closure sees the mutation.

**Self-check rubric:**
- [ ] I said the callbacks capture the *binding*, not a value snapshot.
- [ ] I explained `var` is one function-scoped binding at its terminal value.
- [ ] I explained `let` creates a fresh binding per iteration (spec-level, not just "block scope").
- [ ] I explained the IIFE creates a fresh parameter binding per call.
- [ ] I named a real symptom (loop-built handlers all hitting the last/wrong item).

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Dashboard tiles" bug. You render KPI tiles in a loop and wire each one's refresh button in the same loop. Predict what this logs when the user clicks tile 0, then fix it and say why:

```js
const tiles = ["revenue", "signups", "churn"];
const handlers = [];
for (var t = 0; t < tiles.length; t++) {
  handlers.push(() => console.log("refresh", tiles[t]));
}
handlers[0](); // ?
```

**Model answer (revealed on demand):**

`handlers[0]()` logs `refresh undefined`. Every handler closed over the same `var t`, which the loop left at `3` (`tiles.length`). `tiles[3]` is `undefined`, so *every* button refreshes nothing, regardless of which tile you click.

Fix by giving each iteration its own binding:

```js
const handlers = [];
for (let t = 0; t < tiles.length; t++) {
  handlers.push(() => console.log("refresh", tiles[t]));
}
handlers[0](); // refresh revenue
```

Or, cleaner at scale, iterate with a method whose callback parameter is already a fresh binding:

```js
const handlers = tiles.map((name) => () => console.log("refresh", name));
handlers[0](); // refresh revenue
```

The `map` version is what I would ship: it captures `name` (a per-call parameter) directly, so there is no loop index to leak and no chance of an off-by-one terminal value. In a real dashboard this bug reads as "all the refresh buttons are broken" or "they all refresh the last tile," and it is invisible in a single-tile test because with one tile the terminal index happens to still be out of range in the same way. The mechanism is identical to the classic `setTimeout` loop: one shared binding, read after the loop advanced it.

### ajr-l1-stale-closure-interval: Stale closure over state in setInterval inside useEffect

- **id:** `ajr-l1-stale-closure-interval`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** closures, useEffect, stale-closure

#### Learn

This counter looks correct and freezes at `1`:

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000);
    return () => clearInterval(id);
  }, []); // runs once
  return <div>{count}</div>;
}
```

The `[]` dependency array says "set this interval up once, on mount, and tear it down on unmount." That is the trap. The callback passed to `setInterval` is created during the *first* render, where `count` is `0`. It closes over that render's `count` binding. On every tick it computes `setCount(0 + 1)`, which sets state to `1`. React re-renders with `count === 1`, but the interval callback is still the original one from render-0, still closing over `0`. So it keeps setting `1`, forever. The number sticks at `1`.

This is the same closure rule as the `var` loop, wearing a React costume. Each render is a snapshot with its own `count` const. The interval was created inside render-0's snapshot and never re-created, so it can only ever see render-0's `count`.

Fix 1, functional updater (the one I ship):

```tsx
const id = setInterval(() => setCount((c) => c + 1), 1000);
```

`setCount(c => c + 1)` does not read the stale `count` from the closure at all. React calls your updater with the *latest queued state*, so it increments correctly no matter how old the closure is. The `[]` deps stay honest because the effect body no longer reads any reactive value.

Fix 2, a ref mirror. Keep a ref updated every render and read `ref.current` inside the interval:

```tsx
const countRef = useRef(count);
countRef.current = count;
// inside interval: setCount(countRef.current + 1)
```

The interval reads a mutable box that every render overwrites, so it always sees the current value.

Fix 3, `useEffectEvent` (React 19+). Wrap the tick logic in an Effect Event; it always sees the latest props and state but does not become a dependency.

**Interview nuance:** the tempting "fix" is to add `count` to the deps. It does work, but every increment tears down and recreates the interval, so your `1000ms` clock restarts on every tick and drifts. For a subscription or WebSocket, that churn is a real bug (you resubscribe constantly). The functional updater fixes the staleness *without* re-running the effect. Knowing that distinction is the senior signal.

Recap: `[]` runs the effect once, so the interval closes over render-0 state forever; use a functional updater (or a ref, or an Effect Event) to read the latest value without re-subscribing on every change.

#### See it live

**Demo (react-demo):** a two-column widget. Left column is the buggy counter with `[]` deps; right column is the fixed version with `setCount(c => c + 1)`. Both start a 1000ms interval on mount.

The widget renders, per column: a large live number, and a smaller "callback sees count = N" badge that displays the exact value the interval's closure is reading each tick (in the buggy column this stays frozen at `0`, so it always computes `0 + 1`). A shared "ticks fired" counter shows both intervals are firing equally often, so the freeze is clearly not about timing. A Reset button remounts both counters.

The component the widget is built around:

```tsx
function IntervalCounter({ mode }: { mode: "buggy" | "fixed" }) {
  const [count, setCount] = useState(0);
  const [seen, setSeen] = useState<number | null>(null); // what the closure read
  useEffect(() => {
    const id = setInterval(() => {
      if (mode === "buggy") {
        setSeen(count);           // frozen at 0
        setCount(count + 1);      // always 0 + 1
      } else {
        setCount((c) => {
          setSeen(c);             // latest queued value
          return c + 1;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, []); // deliberately mount-only for both, to isolate the closure
  return <Tile value={count} seen={seen} />;
}
```

**Watch:** the buggy column's big number climbs to `1` and stops, and its "callback sees count = 0" badge never moves, even as ticks keep firing. The fixed column ticks `1, 2, 3, ...` and its badge tracks the live value. This proves the freeze is a stale closure (the callback reads render-0's `count`), not a dead or throttled timer: both timers fire the same number of ticks.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix a `useEffect(()=>{ const id=setInterval(()=>setCount(count+1),1000); return ()=>clearInterval(id) },[])` counter that sticks at `1` three ways and say which you would ship.

**Think about:**
- Why does the callback keep seeing `count` as `0`?
- Why does the functional updater escape the stale value?
- What is the downside of just adding `count` to the deps?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The interval callback is created during render-0, where `count` is `0`, and it closes over that binding. `[]` means the effect never re-runs, so the interval is never recreated, so its closure never updates. Every tick computes `setCount(0 + 1)` and sets `1`.

Three fixes:

```tsx
// 1) Functional updater (ship this)
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000);
  return () => clearInterval(id);
}, []);

// 2) Ref mirror
const countRef = useRef(count);
countRef.current = count;
useEffect(() => {
  const id = setInterval(() => setCount(countRef.current + 1), 1000);
  return () => clearInterval(id);
}, []);

// 3) useEffectEvent (React 19+)
const tick = useEffectEvent(() => setCount(count + 1));
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

I ship fix 1. The functional updater sidesteps the closure entirely: React calls it with the latest queued state, so the age of the closure is irrelevant, and the deps stay honestly `[]` because the body reads nothing reactive.

**Why at the mechanism level:** each render creates a new `count` const; the interval created in render-0 permanently references render-0's binding. A functional updater does not read that binding, so it cannot be stale.

**How to spot it in review:** a `setInterval` / `setTimeout` / subscription effect with a thin dep array (usually `[]`) whose body reads a reactive value (`count`) that is not listed. The React lint rule `react-hooks/exhaustive-deps` flags the missing dep; do not silence it without switching to an updater or ref.

**Production symptom:** a live counter, timer, or polling dashboard silently freezes on its first value. Worse, a poller keeps sending the *original* auth token or query params after they change, because the fetch closure is stale.

**Common misconception:** "adding `count` to the deps always fixes it." It fixes the value but recreates the timer on every change, restarting the 1000ms clock (drift) and, for subscriptions, resubscribing constantly. That churn is often a worse bug than the freeze.

**Self-check rubric:**
- [ ] I identified render-0 as the render whose `count` the closure keeps.
- [ ] I gave the functional updater and explained it reads latest queued state.
- [ ] I gave at least one non-updater fix (ref or Effect Event).
- [ ] I named the downside of adding the value to deps (timer/subscription churn and clock reset).
- [ ] I connected it to a real symptom (frozen counter, poller using stale token).

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Live price ticker" bug. A trading widget polls a price every 2s and re-renders a sparkline. Product reports the ticker keeps requesting the symbol the user *first* opened, even after they switch symbols. Diagnose and fix without recreating the poll on every keystroke of the symbol search:

```tsx
function PriceTicker({ symbol }: { symbol: string }) {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(async () => {
      const p = await fetchPrice(symbol); // stale symbol
      setPrice(p);
    }, 2000);
    return () => clearInterval(id);
  }, []);
  return <Sparkline symbol={symbol} price={price} />;
}
```

**Model answer (revealed on demand):**

The interval closes over the `symbol` prop from the mount render. `[]` means it is created once and never recreated, so `fetchPrice(symbol)` always fetches the *first* symbol, even after the parent passes a new one. This is the interval staleness bug with a prop instead of state, and it is more dangerous here because it silently fetches wrong data rather than obviously freezing.

The clean fix keeps a stable 2s poll but always reads the latest `symbol` via a ref (or an Effect Event):

```tsx
function PriceTicker({ symbol }: { symbol: string }) {
  const [price, setPrice] = useState<number | null>(null);
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol; // refreshed every render

  useEffect(() => {
    const id = setInterval(async () => {
      const p = await fetchPrice(symbolRef.current); // always current
      setPrice(p);
    }, 2000);
    return () => clearInterval(id);
  }, []); // poll stays stable
  return <Sparkline symbol={symbol} price={price} />;
}
```

A functional updater does not help here because the stale value is an *input to the fetch*, not the thing being set. The two legitimate tools are a ref mirror (shown) or `useEffectEvent` wrapping the fetch-and-set. Both keep the interval mount-stable so you do not tear down and rebuild the poll (and its in-flight request) every time the user types in the symbol search. If you instead added `symbol` to the deps, every symbol change would clear and restart the timer, dropping any in-flight request and resetting the 2s cadence; on a fast typeahead that means a burst of canceled polls and a jittery clock. Confirm the fix by switching symbols and watching the network tab: requests should immediately follow the new symbol with the interval cadence unchanged.

### ajr-l1-stale-closure-listener: Stale closure in a once-registered listener

- **id:** `ajr-l1-stale-closure-listener`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** closures, events, stale-closure

#### Learn

Same closure rule, third costume: a DOM listener wired once. This "save on Ctrl+S" handler always saves an *empty* draft no matter what the user typed:

```tsx
function Editor() {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "s" && e.ctrlKey) save(draft); // draft is "" forever
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // registered once
  return <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />;
}
```

The `onKey` function is created during the mount render, where `draft` is `""`, and it closes over that binding. The `[]` deps mean the listener is added once and never re-added, so it never re-closes over a newer `draft`. The user types "hello", state updates, the component re-renders with `draft === "hello"`, but the *listener the browser holds* is still the render-0 function whose `draft` is `""`. Ctrl+S saves the empty string.

The naive fix is to add `draft` to the deps. That works, but it detaches and re-attaches the `keydown` listener on *every keystroke*. Beyond being wasteful, re-registering a listener can drop events that arrive between removal and re-add, and for things like `scroll`, `resize`, or a WebSocket subscription that churn is a real correctness and performance problem. You want the subscription to stay stable while the *handler body* sees fresh values.

The two non-churny tools:

```tsx
// A) Effect Event (React 19+): always sees latest, never a dependency
const onSave = useEffectEvent(() => save(draft));
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "s" && e.ctrlKey) onSave();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []); // stable subscription
```

```tsx
// B) Ref mirror: the listener reads the latest value out of a box
const draftRef = useRef(draft);
draftRef.current = draft;
// inside onKey: save(draftRef.current)
```

Both keep `addEventListener` called exactly once while the handler reads the live `draft`.

**Interview nuance:** the distinction the interviewer is listening for is "reactive vs non-reactive logic." The *subscription* (which event, on which target) is reactive and belongs in the effect with real deps. The *handler body* (what to do when it fires, using the latest state) is non-reactive and belongs in an Effect Event or behind a ref. Conflating the two is what produces both the stale-closure bug and the over-churny "fix."

Recap: a listener added in a mount-only effect closes over mount-time props and state forever; keep the subscription stable and read fresh values through an Effect Event or a ref instead of re-registering on every change.

#### See it live

**Demo (react-demo):** an editor widget with a live `<textarea>` and a "handler sees: ______" badge. A toggle switches between the buggy mount-only handler and the fixed (Effect Event / ref) handler. The learner types, then presses Ctrl+S; a "last saved value" line shows what `save()` actually received.

The widget renders: the textarea, a badge showing the exact `draft` string the currently-registered `keydown` handler would save if fired right now, a "saves performed" list, and the buggy/fixed toggle. In buggy mode the badge is stuck on the empty initial draft even as the textarea fills; in fixed mode the badge tracks the live text.

```tsx
function SaveOnCtrlS({ mode }: { mode: "buggy" | "fixed" }) {
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const draftRef = useRef(draft);
  draftRef.current = draft; // fixed mode reads this

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "s" && e.ctrlKey) {
        e.preventDefault();
        setSaved(mode === "buggy" ? draft : draftRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // mount-only for BOTH, to isolate the closure
  return <EditorTile draft={draft} onChange={setDraft} saved={saved} />;
}
```

**Watch:** in buggy mode, type "hello" and press Ctrl+S; the "last saved value" shows the empty string, and the "handler sees" badge stays blank, proving the registered function still closes over the mount-time `draft`. In fixed mode the same keystrokes save "hello" and the badge tracks live text, all while `addEventListener` ran exactly once (a "registrations: 1" counter confirms it never re-subscribed). This is illustrative of the real mechanism, not a build-time transform: both modes run the identical single effect; only how the handler *reads* `draft` differs.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix a keydown handler added in `useEffect(..., [])` that always saves the empty initial draft so it saves the current draft without re-registering on every keystroke.

**Think about:**
- What value does the listener close over?
- Why is adding `draft` to deps a churny fix?
- What is the non-reactive alternative?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The listener closes over the `draft` binding from the mount render, which is `""`. With `[]` deps the listener is added once and never re-added, so it never re-closes over a newer `draft`; Ctrl+S always calls `save("")`.

Fix with an Effect Event (preferred on React 19+):

```tsx
const onSave = useEffectEvent(() => save(draft)); // always latest draft
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "s" && e.ctrlKey) {
      e.preventDefault();
      onSave();
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []); // subscription stays stable
```

Or with a ref if you are not yet on Effect Events:

```tsx
const draftRef = useRef(draft);
draftRef.current = draft;
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "s" && e.ctrlKey) { e.preventDefault(); save(draftRef.current); }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

**Why at the mechanism level:** the subscription (which event, which target) should be stable, so it lives in a mount-only effect. The handler body needs the *latest* `draft`, which is non-reactive logic. An Effect Event or a ref lets the stable listener reach a fresh value without recreating the listener.

**How to spot it in review:** `addEventListener`, `socket.on`, or a `subscribe` call inside an effect whose body reads a reactive value not in the deps. Same tell as the interval lesson, different API.

**Production symptom:** a save or submit acts on stale data: the old user, the old filter, an empty draft. It often ships because manual testing that types then immediately saves still fails in a way testers blame on the backend.

**Common misconception:** "re-adding the listener on every change is the clean fix." Beyond the per-keystroke churn, re-registration can drop events that fire during the remove/add gap, and for high-frequency events (`scroll`, `mousemove`) or stateful subscriptions (WebSocket) it is a real defect, not just a perf nit.

**Self-check rubric:**
- [ ] I said the handler closes over the mount-time `draft` (`""`).
- [ ] I kept the subscription mount-stable (`[]`) in my fix.
- [ ] I used an Effect Event or ref to read the live value.
- [ ] I explained why deps-churn can drop events, not just waste work.
- [ ] I separated the reactive subscription from the non-reactive handler body.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Collaborative doc, wrong author" bug. A realtime editor opens a WebSocket once and, on each incoming `presence` message, broadcasts the current user's cursor with `socket.send({ user: currentUser, pos })`. After a user switches accounts (impersonation / account switcher), presence messages keep going out tagged as the *previous* user. Fix it without reopening the socket on every render:

```tsx
function Presence({ currentUser }: { currentUser: User }) {
  useEffect(() => {
    const socket = openSocket();
    socket.on("presence", (pos) => {
      socket.send({ user: currentUser, pos }); // stale user
    });
    return () => socket.close();
  }, []);
}
```

**Model answer (revealed on demand):**

The `presence` handler closes over `currentUser` from the mount render. `[]` opens the socket once, so the handler is registered once and keeps sending the original user forever, even after the account switcher updates the prop. Reopening the socket by adding `currentUser` to the deps is not acceptable here: closing and reopening a WebSocket drops the connection, loses queued messages, and re-runs any join handshake on every user change.

Keep the socket stable and read the latest user through a ref or an Effect Event:

```tsx
function Presence({ currentUser }: { currentUser: User }) {
  const userRef = useRef(currentUser);
  userRef.current = currentUser; // refreshed each render

  useEffect(() => {
    const socket = openSocket();
    socket.on("presence", (pos) => {
      socket.send({ user: userRef.current, pos }); // always current
    });
    return () => socket.close();
  }, []); // socket opened exactly once
}
```

On React 19+ the same thing with an Effect Event reads cleaner:

```tsx
const onPresence = useEffectEvent((pos: Pos) => socketRef.current?.send({ user: currentUser, pos }));
```

The mechanism is identical to the keydown bug: the *subscription* (open socket, attach handler) is reactive setup that should run once, and the *handler body* (which user to tag) is non-reactive logic that must see the latest value. The ref bridges them. The production symptom, presence and edits attributed to the wrong user after an account switch, is a data-integrity and even a security issue, not a cosmetic one, which is exactly why "just reopen the socket" (with its dropped messages and handshake storms) is the wrong trade. Verify by switching accounts mid-session and confirming the very next presence frame carries the new user with no socket reconnect in the network panel.

### ajr-l1-closure-retains-large-object: Closures can retain large objects (real heap growth)

- **id:** `ajr-l1-closure-retains-large-object`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** closures, memory, gc

#### Learn

A closure keeps its *entire* lexical environment reachable, not just the variables it names. That is normally invisible, but it becomes real memory when a *long-lived* callback closes over a *large* object. As long as the callback is reachable (registered as a listener, held in a timer, cached in a memo), everything in the scopes it closed over is reachable too, so the garbage collector cannot free any of it.

```js
function attach() {
  const bigData = new Float64Array(10_000_000); // ~80MB
  const length = bigData.length;

  // A) closes over bigData: pins ~80MB for the life of the listener
  window.addEventListener("resize", () => console.log(bigData.length));

  // B) closes over only the primitive length: pins ~8 bytes
  window.addEventListener("resize", () => console.log(length));
}
```

Both listeners live forever (nobody removes them). Listener A's closure keeps `bigData` reachable because the arrow function references it, so the whole 80MB array cannot be collected. Listener B references only `length`, a number copied out before the array could be freed, so once `attach()` returns, `bigData` has no live reference and the GC reclaims it. The variable *name* is not what matters; *reachability from a live function* is.

The React version is the classic mount/unmount leak:

```tsx
function Report({ rows }: { rows: Row[] }) { // rows: 50MB
  useEffect(() => {
    const onClick = () => track("report_click", rows.length);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick); // <- must run
  }, [rows]);
}
```

If you forget the cleanup, every mount adds a listener that pins that mount's `rows`. Mount and unmount the component a few times and you have several 50MB arrays alive at once, detached-DOM style, with the heap climbing on every cycle. Even *with* cleanup, the handler only needs `rows.length`, so capturing the whole `rows` array is needless retention; capture the derived primitive.

**Interview nuance:** "closures capture variables, not values" (lesson 1) and "closures retain their whole environment" (this lesson) are two faces of one fact. The retention face is what makes memory-leak questions tractable: to find the leak, ask "what long-lived function is reachable, and what does its closure keep alive?" A live listener or timer is almost always the root.

**Interview nuance:** how to confirm it. In Chrome DevTools, take a heap snapshot, exercise the mount/unmount cycle, take another, and use "Comparison" or "Objects allocated between snapshots." Retained large objects show up under "Retainers" with the closure (a `system / Context` or the function) as the retaining path. Detached DOM nodes pinned by handlers appear the same way.

Recap: a live callback pins every object in the scopes it closed over, so long-lived listeners, timers, and memos that close over large props or datasets cause real heap growth; capture the minimal derived value and always run effect cleanup.

#### See it live

**Demo (js-runnable):** allocate a 10M-element `Float64Array`, then in two separate scopes register a retained callback: one that closes over the whole array, one that closes over only `.length`. Report heap usage after each. Run this in a worker (Node exposes `process.memoryUsage()`; in a browser worker use `performance.memory` where available).

```js
// Deterministic-ish: measure heapUsed after each retention.
// Node worker: process.memoryUsage().heapUsed. Values are approximate.
const MB = (b) => (b / 1024 / 1024).toFixed(1) + " MB";
const retained = []; // simulates long-lived listeners; keeps callbacks alive

function heap() { return process.memoryUsage().heapUsed; }

const base = heap();

// A) retain the WHOLE array through the closure
(function () {
  const bigA = new Float64Array(10_000_000); // ~80MB
  retained.push(() => bigA.length);           // closure pins bigA
})();
global.gc && global.gc();
const afterA = heap();

// B) retain ONLY the derived length
(function () {
  const bigB = new Float64Array(10_000_000); // ~80MB
  const len = bigB.length;                    // copy out the primitive
  retained.push(() => len);                   // closure pins 8 bytes
})(); // bigB is now unreachable and collectible
global.gc && global.gc();
const afterB = heap();

console.log("A) retained whole array ->", MB(afterA - base)); // ~80 MB
console.log("B) retained only length ->", MB(afterB - afterA)); // ~0 MB
```

**Watch:** variant A adds roughly 80MB to `heapUsed` and it stays high, because the pushed callback keeps `bigA` reachable. Variant B adds essentially nothing, because `len` is a copied primitive and `bigB` became unreachable the instant its IIFE returned, so the GC reclaimed it. This proves the closure (a live function referencing the variable), not the variable name or the allocation itself, is what pins the object. Numbers are approximate and depend on GC timing; run with `--expose-gc` in Node so the `global.gc()` calls force collection and make the contrast crisp.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain what stays in memory and fix it when a component loads a 50MB dataset then registers a long-lived click handler that only needs `bigData.length`.

**Think about:**
- What does the closure keep reachable?
- How does capturing a derived primitive change retention?
- How would you confirm this in DevTools?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The click handler references `bigData` (via `bigData.length`), so its closure keeps the entire 50MB dataset reachable for as long as the handler is registered. Because the handler is long-lived (a global `click` listener that outlives the render, and worse if cleanup is missing on unmount), the GC can never free those 50MB. If the component mounts and unmounts repeatedly without cleanup, each cycle pins another 50MB copy.

Fix: capture the minimal derived value, and always clean up:

```tsx
function Report({ rows }: { rows: Row[] }) { // rows ~50MB
  useEffect(() => {
    const count = rows.length;                 // derived primitive, copied out
    const onClick = () => track("click", count); // closure pins a number, not rows
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick); // release on unmount
  }, [rows]);
}
```

Now the closure references `count` (a number), not `rows`, so `rows` can be collected once nothing else holds it. If a local computation produces a large intermediate you no longer need before registering a long-lived callback, null it out (`big = null`) so it is not captured.

**Why at the mechanism level:** a closure keeps its whole lexical environment reachable. A single reachable function can transitively retain every object in the scopes it closed over. Reachability, not the variable name you last typed, decides what the GC keeps.

**How to spot it in review:** long-lived listeners, timers, `setInterval`, or `useMemo`/`useCallback` results that close over large props or datasets when they only need a scalar. Also any effect that subscribes without a cleanup return.

**Production symptom:** heap grows across mount/unmount cycles (a classic "the app gets slower the longer you use it" leak), and DevTools shows detached DOM nodes pinned by handler closures.

**Common misconception:** "an unused variable in scope is free once I stop referencing it by name." It is not. If any closure in that scope is alive, the whole environment record is retained, including variables you think you are done with, unless you never capture them or explicitly null them.

**Self-check rubric:**
- [ ] I said the closure retains the whole 50MB because the handler references `rows`.
- [ ] I noted the handler must be long-lived (and missing cleanup makes it worse per mount).
- [ ] My fix captures a derived primitive (`length`), not the array.
- [ ] My fix includes effect cleanup (`removeEventListener`).
- [ ] I described confirming it via heap snapshot comparison / retainers in DevTools.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Infinite scroll heap creep" bug. A feed virtualizes rows, but memory climbs steadily as the user scrolls and never comes back down even after old pages scroll out of view. Each page's row component memoizes a formatter that closes over the page's full raw payload. Find what pins memory and fix it at scale:

```tsx
function Row({ page }: { page: Page }) { // page.raw ~2MB each
  const format = useMemo(
    () => (value: number) => renderCell(value, page.raw.locale), // closes over page.raw
    [page]
  );
  useEffect(() => {
    bus.subscribe("theme", () => rerenderWith(format)); // long-lived, never unsubscribed
  }, []);
  return <Cells format={format} />;
}
```

**Model answer (revealed on demand):**

Two things pin memory. First, `format` closes over `page` (to read `page.raw.locale`), so the memoized function retains the entire ~2MB `page.raw` payload. Second, the `theme` subscription is never unsubscribed, so it stays alive after the row unmounts and keeps `format` (and therefore `page.raw`) reachable forever. Multiply by hundreds of scrolled pages and you get the steady, non-reclaiming climb the user sees.

Fix by capturing only the scalar the formatter needs, and by cleaning up the subscription:

```tsx
function Row({ page }: { page: Page }) {
  const locale = page.raw.locale;                 // derived primitive
  const format = useMemo(
    () => (value: number) => renderCell(value, locale), // closes over a string, not page.raw
    [locale]
  );
  useEffect(() => {
    const unsub = bus.subscribe("theme", () => rerenderWith(format));
    return unsub;                                  // release on unmount
  }, [format]);
  return <Cells format={format} />;
}
```

Now the closure retains a `locale` string, not the 2MB payload, and the subscription is torn down when the row unmounts, so scrolled-away pages become fully collectible. The mechanism is the same reachability rule as the single-listener case, amplified by scale: a long-lived subscription times a large captured object times hundreds of pages. Confirm with two heap snapshots taken before and after scrolling a few hundred rows and back: with the fix, `Page` / `Float64Array`-style retained sizes should return near baseline; without it, they accumulate, and the "Retainers" path points at the memoized formatter's context and the never-removed `bus` subscription.

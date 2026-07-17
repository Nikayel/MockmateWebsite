> Module **5.3** (State Updates & Batching) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [5.2](./l5-referential-equality-memo.md) · Next: [5.4](./l5-reconciliation-keys.md)

# L5 · State Updates & Batching

State in React is not a variable you mutate, it is a scheduling request against the next render. After this module you can catch the three bugs that follow from that: increments that under-count because they all read the same captured value, "state is wrong on the next line" reads that ship stale data to analytics and the server, and expensive initializers that quietly re-run on every render because the lazy form was skipped.

### ajr-l5-batching-functional-updater: Batching and the functional updater

- **id:** `ajr-l5-batching-functional-updater`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, batching, state

#### Learn

Here is a handler that looks like it adds three and adds one:

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  function addThree() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }
  return <button onClick={addThree}>{count}</button>;
}
```

Click it and `count` goes 0, 1, 2, not 0, 3, 6. The reason is that `count` is not a live variable, it is a constant captured for this render. Inside `addThree`, `count` is `0` on the first click, and it stays `0` for the entire function. All three calls compute `setCount(0 + 1)`, so all three schedule "set state to 1." React batches them and applies the last write, which is 1. This is last-write-wins over three identical writes.

The fix is the functional updater form. Instead of passing a value, pass a function that receives the latest queued state and returns the next one:

```tsx
function addThree() {
  setCount((c) => c + 1);
  setCount((c) => c + 1);
  setCount((c) => c + 1);
}
```

Now React runs the updaters in order against a running accumulator. The first gets `0` and returns `1`, the second gets `1` and returns `2`, the third gets `2` and returns `3`. The queue composes because each updater reads the output of the previous one, not the render-time constant. Click goes 0, 3, 6.

Both versions cause exactly **one** render. React 18 made batching universal: multiple `setState` calls in the same event handler, and also in promises, `setTimeout`, and native event handlers, are grouped into a single re-render. Before 18, batching only happened inside React event handlers, so state updates in a `.then()` or `setTimeout` each rendered separately. The lesson: batching is about how many renders you get (one), and the updater form is about what value each write reads (the latest queued, not the captured constant). These are independent. Fixing the count has nothing to do with reducing renders, both already render once.

**Interview nuance:** the sharp answer distinguishes the two axes. "Why does this only add 1" is a closure question (all three read the captured `count`). "Why is it still one render" is a batching question. Candidates who conflate them say "add the updater so it re-renders each time," which is wrong: it still renders once.

Recap: `setCount(count + 1)` three times reads one captured value and folds to a single +1 under batching; `setCount((c) => c + 1)` composes against the queue and adds 3, still in one render.

#### See it live

**Demo (react-demo):** an "Add 3" button doing `setCount(count + 1)` x3 next to one doing `setCount((c) => c + 1)` x3, each with a render-count badge proving all three updates cause one render.

The widget renders two `Counter` cards side by side. The left card, labeled "captured value," runs `setCount(count + 1)` three times per click. The right card, labeled "functional updater," runs `setCount((c) => c + 1)` three times per click. Each card shows its current count large, plus a "renders" badge that increments once per commit (backed by a `useRef` counter bumped in the body, or a `useEffect` with no deps array counting commits). A shared "Click both" button fires both handlers so the learner can compare per click. Clicking the left card moves its count by 1 each time; clicking the right moves it by 3. Both "renders" badges tick up by exactly 1 per click.

```tsx
function Counter({ mode }: { mode: "captured" | "updater" }) {
  const [count, setCount] = useState(0);
  const renders = useRef(0);
  renders.current += 1; // one bump per commit

  function addThree() {
    if (mode === "captured") {
      setCount(count + 1);
      setCount(count + 1);
      setCount(count + 1); // all read the same captured `count`
    } else {
      setCount((c) => c + 1);
      setCount((c) => c + 1);
      setCount((c) => c + 1); // each reads the latest queued value
    }
  }

  return (
    <div>
      <output>{count}</output>
      <span className="badge">renders: {renders.current}</span>
      <button onClick={addThree}>Add 3</button>
    </div>
  );
}
```

**Watch:** the captured card climbs 0, 1, 2, 3 (one per click) while the updater card climbs 0, 3, 6, 9, yet both "renders" badges go up by exactly 1 each click. That proves two things at once: the captured value folds three writes into a net +1, and batching turns three `setState` calls into a single render. The render count is a real observation of commit frequency, not a simulation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix this increment handler that calls `setCount(count + 1)` three times but only adds 1 per click. Rewrite it with the functional updater and explain what each of the three calls reads in both the broken and fixed versions.

**Think about:**
- What value do all three `setCount(count + 1)` read?
- Why does `setCount(c => c + 1)` compose?
- What does React 18 batching change?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The broken version adds 1 because all three calls read the same value. `count` is a constant captured when this render ran, say `0`. Every call computes `setCount(0 + 1)`, schedules "set to 1," and React applies the last of three identical writes: 1.

```tsx
function addThree() {
  setCount((c) => c + 1);
  setCount((c) => c + 1);
  setCount((c) => c + 1);
}
```

Mechanism: React state is a per-render constant, not a mutable cell. Value-form writes (`setCount(x)`) that all derive `x` from the same render's `count` collapse under last-write-wins during the batched flush. The functional form (`setCount((c) => c + 1)`) hands each updater the latest *queued* state, so React threads them: 0 to 1, 1 to 2, 2 to 3. The updater reads the queue; the value form reads the closure.

How to spot it in review: multiple `setState` calls for the same key in one handler where the new value is computed from the state variable (`setX(x + 1)`, `setItems([...items, a]); setItems([...items, b])`). Two writes derived from the same captured value is the tell. Any "next value depends on current value" write should use the updater.

Production symptom: counters, cart quantities, vote tallies, and "unread" badges that under-count when a handler bumps them more than once, or when a bump races another update in the same tick. It looks fine with single clicks and breaks under rapid or compound actions.

Common misconception: "multiple setStates in a handler cause multiple renders, so add the updater to fix rendering." Both forms already render once because React batches. The updater fixes the *value*, not the render count. Batching (one render) and the updater (reads the queue) are independent concerns.

**Self-check rubric:**
- [ ] All three broken calls are shown to read the same captured `count`.
- [ ] The fix uses `setCount((c) => c + 1)` and reads the latest queued state.
- [ ] The answer states both versions cause exactly one render.
- [ ] Batching and the updater form are described as separate concerns.
- [ ] The rule "derive next from current, use the updater" is named.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Multi-item cart bump." A quantity stepper lets a user click "+1" fast, and each click runs `setQty(qty + 1)` while a `useEffect` posts the new quantity to the server. Under fast clicks the on-screen quantity lags and the server receives duplicate lower values. Rewrite the handler and explain both the lag and the duplicate posts.

**Model answer (revealed on demand):**

Fast clicks fire multiple handlers before React commits, and each reads the same stale `qty` from its render, so several clicks resolve to the same `qty + 1`. The count lags because five clicks that all saw `qty = 2` all write 3.

```tsx
function Stepper({ post }: { post: (n: number) => void }) {
  const [qty, setQty] = useState(0);
  function bump() {
    setQty((q) => q + 1); // composes across rapid clicks
  }
  useEffect(() => {
    post(qty); // fires once per committed qty
  }, [qty, post]);
  return <button onClick={bump}>Qty: {qty}</button>;
}
```

Mechanism: the updater threads each click against the queued value, so five fast clicks go 0 to 5 instead of collapsing to 1. Because React batches the burst into one commit, the `useEffect` runs once for the final `qty`, so the server gets one correct write, not five stale ones. The duplicate low posts in the original came from multiple commits each carrying the same stale `qty + 1`.

How to spot it in review: a stepper or "+1" that computes from the state variable, especially paired with an effect that syncs to the server. If the write derives the next value from current, and clicks can compound, it needs the updater. The server-duplicate symptom is a downstream tell of the same closure bug.

Production symptom: quantities that stick one below what the user clicked, and a backend receiving repeated identical PATCHes that inflate request volume and can double-charge if the endpoint is not idempotent.

Interview nuance: at scale you often *also* want to debounce the server sync so a burst posts once at the settled value, but that is an orthogonal optimization. The correctness fix is the updater; the debounce is about request volume. Do not conflate the two.

### ajr-l5-stale-reads-setstate: Stale reads: state does not update synchronously

- **id:** `ajr-l5-stale-reads-setstate`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, state, stale-closure

#### Learn

`setState` does not change the variable you are looking at. It schedules a re-render, and only that next render sees the new value. Read the state variable on the very next line and you get the old one:

```tsx
function Profile() {
  const [user, setUser] = useState({ name: "Ada" });
  function save(next: { name: string }) {
    setUser(next);
    console.log(user.name);        // logs "Ada", the OLD value
    analytics.track("save", user); // sends the OLD user
  }
}
```

`user` is a constant bound to the render that is currently executing. `setUser(next)` queues a new render whose `user` will be `next`, but the code still running in `save` keeps the old `user` until it returns and React re-renders. So the `console.log` and the analytics call both send stale data. This is not a timing bug you can fix with a longer wait; there is no "after setState finishes" moment inside the same function, because the update is applied between renders, not mid-handler.

The trap gets worse in long-lived callbacks. A closure captures the state from the render in which it was *created*:

```tsx
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, []); // empty deps: the callback captures count = 0 forever
```

That interval logs `0, 0, 0` no matter how high `count` climbs, because the closure it runs was built on the first render where `count` was 0, and the empty dependency array means React never rebuilds it. The interval is frozen in time.

The fixes depend on what you need. If you need the value you just set, use the value you already computed: log `next`, track `next`, POST `next`. Do not read it back from state. If a long-lived callback needs the *latest* value, keep it in a ref (`countRef.current`) and read `countRef.current` inside the callback, because a ref is a stable mutable box that always holds the current value. If you need to react to a state change, do it in a `useEffect` keyed on that state, which runs after the render where the value actually updated.

**Interview nuance:** the phrase "setState is asynchronous" is imprecise and trips people up. It is not asynchronous in the sense of "resolves later on a microtask." It is that state is immutable per render, and a new value only exists in the next render. Saying "the variable is a snapshot of this render" is more accurate than "setState is async."

Recap: after `setState`, the current scope keeps the old value until the next render; use the value you computed, a ref for latest reads in long-lived callbacks, or an effect keyed on the state.

#### See it live

**Demo (react-demo):** a Save handler that `setState`s then logs the state on the next line, next to a `setInterval` that logs a frozen count.

The widget has two panels. The left "Save" panel has a text input and a Save button; clicking Save runs `setName(input); log(name)` and appends the logged value to an on-screen log. The learner types "Ada" then "Grace," clicks Save, and watches the log print the *previous* name each time, one step behind the input. A small timeline strip animates "handler runs -> state logged (old) -> re-render commits (new)" so the ordering is visible. The right "Interval" panel starts a `setInterval` created with an empty deps effect and shows both the live `count` (bumped by a button) climbing and the interval's log printing `0, 0, 0`. A toggle swaps the interval to a ref-based read so the learner can see it start logging the live value.

```tsx
function StaleReadDemo() {
  const [name, setName] = useState("");
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  countRef.current = count; // ref always holds the latest

  function save(input: string) {
    setName(input);
    log(`logged after setState: "${name}"`); // OLD name, one step behind
  }

  useEffect(() => {
    const id = setInterval(() => {
      log(`captured=${count} ref=${countRef.current}`); // 0 vs live
    }, 1000);
    return () => clearInterval(id);
  }, []); // empty deps: `count` frozen at 0, ref stays current

  return null; // buttons wired to save() and setCount((c) => c + 1)
}
```

**Watch:** the Save log always shows the name from *before* this click, proving the state variable is a snapshot until the next render. The interval log prints `captured=0` forever while `ref=` tracks the live count, proving an empty-deps closure freezes state and a ref escapes the freeze. This is real React behavior, not staged: the values come straight from the running closures.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain the closure that causes it and fix the handler so it tracks the user that was just saved (a handler does `setUser(next); analytics.track(user)` and the analytics payload is always the previous user).

**Think about:**
- Why is the state variable still old on the next line?
- What do async callbacks capture?
- How do you read the latest value reliably?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The bug is reading `user` after `setUser(next)`. `user` is bound to the current render; `setUser` schedules a new render but does not mutate `user` in place, so `analytics.track(user)` sends the value from before this save.

```tsx
function save(next: User) {
  setUser(next);
  analytics.track("profile_save", next); // track what you just computed
}
```

Mechanism: `setState` schedules a re-render and the new value only exists in that next render's scope. The currently executing function closed over the old `user` when this render was created, and nothing inside the function will ever see the new value, because the update is applied *between* renders, not partway through the handler. Reading `next` (the value you already have) sidesteps the whole problem. If instead you needed the latest value inside a long-lived callback (an interval, a subscription, a debounced sender), you would read it from a ref that you keep current (`userRef.current = user` in render, read `userRef.current` in the callback), because the ref is a stable box that is not frozen at closure-creation time.

How to spot it in review: reading a state variable on the line right after its setter, or referencing a state variable inside a callback created with stale or empty dependencies (`useEffect(..., [])`, an event listener added once, a `setTimeout` body). If the code sets state and then uses the *state variable* rather than the value it passed, flag it.

Production symptom: analytics events attributed to the previous item, off-by-one logs, and POST bodies that send the pre-edit value so the server saves stale data. These are silent: the UI often looks right because it re-rendered, while the side channel shipped the old value.

Common misconception: "setState is synchronous, so the variable updates by the next line." State is immutable per render; the new value lives only in the next render. There is no in-handler moment where the variable flips.

**Self-check rubric:**
- [ ] The answer tracks `next` (the computed value), not the state variable.
- [ ] It explains that state is a per-render snapshot, updated between renders.
- [ ] It names the ref pattern for latest reads in long-lived callbacks.
- [ ] It rejects "setState is synchronous" explicitly.
- [ ] The review tell (read-after-set, or state in a stale closure) is stated.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Chat draft autosave." A message composer keeps `draft` in state and starts a `setInterval` in a `useEffect(..., [])` that POSTs `draft` to the server every few seconds. Users report the autosave always persists an empty or very old draft. Diagnose the frozen closure and give two correct fixes, noting the tradeoff.

**Model answer (revealed on demand):**

The interval was created once, on the first render, and closed over `draft = ""`. The empty dependency array means React never rebuilds it, so every tick POSTs the original empty draft no matter what the user has typed. This is the frozen-closure trap at scale.

```tsx
// Fix A: ref holds the latest draft; interval reads it live.
const draftRef = useRef(draft);
draftRef.current = draft;
useEffect(() => {
  const id = setInterval(() => post(draftRef.current), 3000);
  return () => clearInterval(id);
}, [post]); // interval created once, but reads current via ref

// Fix B: depend on draft so the effect re-subscribes with fresh state.
useEffect(() => {
  const id = setInterval(() => post(draft), 3000);
  return () => clearInterval(id);
}, [draft, post]); // rebuilds the interval on every keystroke
```

Mechanism: fix A keeps a single stable interval and escapes the freeze by reading `draftRef.current`, which is updated on every render, so the callback always sees the latest draft. Fix B lists `draft` as a dependency, so React tears down and recreates the interval whenever the draft changes, giving each interval a fresh closure. The tradeoff: fix A creates the timer once and is cheap, but the timing does not reset on edits; fix B is simpler to reason about but rebuilds the timer on every keystroke, which resets the interval and can drift the save cadence or churn timers.

How to spot it in review: a `setInterval`, `setTimeout`, event listener, or subscription created in a `useEffect(..., [])` whose body references state or props. Empty deps plus a state reference in the callback is the signature of a frozen closure.

Production symptom: autosave that persists stale or empty data, a "live" counter stuck at its initial value, or a websocket handler acting on state from minutes ago. It passes a quick test (the first value looks saved) and fails as soon as the value changes.

Interview nuance: the lint rule `react-hooks/exhaustive-deps` catches most of these by flagging the missing `draft` dependency. Silencing it with a comment instead of choosing the ref or the re-subscribe fix is the anti-pattern reviewers should reject.

### ajr-l5-lazy-initial-state: Lazy initial state and expensive initializers

- **id:** `ajr-l5-lazy-initial-state`  ·  **difficulty:** medium  ·  **est:** 10 min  ·  **demo:** react-demo  ·  **skills:** react, useState, performance

#### Learn

`useState` takes an initial value, and it is easy to write an initializer that does real work:

```tsx
function Editor({ raw }: { raw: string }) {
  const [doc, setDoc] = useState(parseHugeBlob(raw)); // runs EVERY render
}
```

The trap: `parseHugeBlob(raw)` is a function *call*, so it evaluates on every single render. React only *uses* its result on the first render (mount) to seed the state, and throws away the result on every subsequent render, but JavaScript still has to run the call before it can pass the argument to `useState`. So a component that re-renders on every keystroke reparses the entire blob on every keystroke, does the work, and discards it. The state is correct; the CPU is on fire.

The fix is the lazy initializer form. Pass a function that React calls only on mount:

```tsx
const [doc, setDoc] = useState(() => parseHugeBlob(raw)); // runs ONCE
```

Now you pass a function *value*, not a call. React stores it and invokes it exactly once, when the component mounts, to compute the initial state. On every later render React sees it already has state and never calls the function again. The expensive work happens one time.

The distinction is "function call" versus "function value." `useState(parseHugeBlob(raw))` evaluates the call every render and hands the result to `useState`. `useState(() => parseHugeBlob(raw))` hands `useState` a thunk it may or may not call, and it only calls it on mount. The argument in the eager form is always evaluated; the argument in the lazy form is a function that is evaluated only when React decides to run it.

The exact same trap lives in `useRef`:

```tsx
const ref = useRef(new ExpensiveThing()); // constructs a NEW one every render
```

`useRef` also ignores its argument after the first render, but `new ExpensiveThing()` runs every render and the result is discarded each time (garbage for the collector, plus whatever the constructor cost). `useRef` has no lazy form, so the idiom is to construct on first use:

```tsx
const ref = useRef<ExpensiveThing | null>(null);
if (ref.current === null) ref.current = new ExpensiveThing();
```

**Interview nuance:** the giveaway is that people say "the initializer only runs on mount" as if that is true for any form. It is only true for the lazy `() =>` form. The eager form's *argument* runs every render; React just ignores the value after mount. Whether the work runs is about your code (call vs thunk); whether React uses the result is about mount. Do not merge those.

Recap: `useState(expensive())` evaluates the call every render and only uses it on mount; `useState(() => expensive())` runs it once. `useRef(new Thing())` has the same waste; guard it with a null check.

#### See it live

**Demo (react-demo):** an init-cost counter comparing `useState(expensiveInit())` with `useState(() => expensiveInit())`.

The widget renders two cards. Both call a shared `expensiveInit()` that increments a module-level `initCalls` counter and returns a seed value. The left card, "eager," does `useState(expensiveInit())`; the right, "lazy," does `useState(() => expensiveInit())`. Each card shows an "init ran: N times" badge (reading `initCalls`) and a "force re-render" button that bumps an unrelated local state to trigger renders without changing the seed. The learner clicks "force re-render" repeatedly on each card: the eager card's "init ran" badge climbs 1, 2, 3, 4 with every render, while the lazy card's badge stays at 1 no matter how many times it re-renders.

```tsx
let initCalls = 0;
function expensiveInit() {
  initCalls += 1;
  return Array.from({ length: 100_000 }, (_, i) => i).reduce((a, b) => a + b, 0);
}

function EagerCard() {
  const [seed] = useState(expensiveInit());       // call: runs every render
  const [, tick] = useState(0);
  return <button onClick={() => tick((t) => t + 1)}>init ran: {initCalls}</button>;
}

function LazyCard() {
  const [seed] = useState(() => expensiveInit());  // thunk: runs once on mount
  const [, tick] = useState(0);
  return <button onClick={() => tick((t) => t + 1)}>init ran: {initCalls}</button>;
}
```

**Watch:** every click on the eager card ticks its "init ran" badge up by one, because the `expensiveInit()` call re-evaluates on each render even though React discards the result. The lazy card's badge stays frozen at 1 across unlimited re-renders. That proves the eager argument is evaluated every render while the lazy thunk runs only on mount. The counter is a real observation of how many times the function executed, not an estimate. (In a single-component demo you would show `initCalls` per card via separate modules or a reset; the point the learner sees is one badge climbing and one staying put.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Change `useState(parseHugeBlob(props.raw))` to the lazy initializer so it stops reparsing on every keystroke, and explain that the argument is evaluated every render but the result is only used on mount.

**Think about:**
- Is the argument to `useState` evaluated every render?
- When does the lazy initializer run?
- Does the same trap apply to `useRef(new Thing())`?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`parseHugeBlob(props.raw)` is a function call, so it runs on every render. React only uses its return value on mount, but the call still executes each time before `useState` receives the argument, so a component that re-renders per keystroke reparses per keystroke.

```tsx
const [doc, setDoc] = useState(() => parseHugeBlob(props.raw));
```

Mechanism: `useState(x)` always evaluates `x` (it is a normal function argument) but only *uses* it to seed state on the first render; afterward React already holds state and ignores the argument's value, while still paying to compute it. The lazy form `useState(() => ...)` passes a function React stores and invokes exactly once at mount, so the parse runs a single time. The difference is call versus thunk: whether the expensive work runs is decided by your code, whether React keeps the result is decided by mount.

How to spot it in review: a function *call* that does real work passed directly to `useState` or `useRef` (`useState(buildIndex(data))`, `useRef(new Chart())`). A bare value or a cheap literal is fine; a call that parses, allocates, or constructs is the smell. The fix for `useState` is the `() =>` wrapper; `useRef` has no lazy form, so guard it: `if (ref.current === null) ref.current = new Chart()`.

Production symptom: silent CPU waste and input jank. Typing feels sticky, the profiler shows a fat self-time on the component, and it scales with the size of the blob, so it is worst for exactly the users with the most data. Nothing errors; it is just slow.

Common misconception: "the initializer only runs on mount, so the eager form is fine." Only the lazy `() =>` form runs once. The eager form's argument is evaluated on every render; React merely discards the value after mount. Doing the work and throwing it away is the entire bug.

**Self-check rubric:**
- [ ] The fix wraps the initializer in `() =>` so it runs once.
- [ ] The answer states the eager argument is evaluated every render.
- [ ] It distinguishes "work runs" (your code) from "result used" (mount only).
- [ ] It names the `useRef(new Thing())` variant and the null-guard fix.
- [ ] The symptom (per-render CPU waste and jank) is identified.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Editor with a heavy syntax highlighter." A code editor does `useState(buildHighlighter(theme))` and `useRef(new WorkerPool())` at the top of a component that re-renders on every keystroke. Users on large files report lag and the browser tab's memory climbing. Fix both lines and explain why one needs `() =>` and the other needs a null guard.

**Model answer (revealed on demand):**

Both lines run expensive work on every render. `buildHighlighter(theme)` re-runs the whole highlighter build per keystroke, and `new WorkerPool()` constructs a fresh pool (spawning workers) every render, which both wastes CPU and leaks workers as old pools are discarded without teardown.

```tsx
// useState: wrap in a thunk so the build runs once on mount.
const [highlighter] = useState(() => buildHighlighter(theme));

// useRef: no lazy form, so construct once behind a null guard.
const poolRef = useRef<WorkerPool | null>(null);
if (poolRef.current === null) poolRef.current = new WorkerPool();
```

Mechanism: `useState(() => ...)` hands React a thunk it invokes only at mount, so the highlighter is built a single time. `useRef` always ignores its argument after the first render, but the argument `new WorkerPool()` still evaluates every render, so you move construction into a `ref.current === null` guard that runs exactly once. `useRef` cannot take a thunk, which is why the guard pattern exists. The memory climb came from repeatedly constructing worker pools that were never torn down; constructing once fixes both CPU and the leak.

How to spot it in review: any `new X()`, `build...()`, `parse...()`, or `create...()` passed straight into `useState`/`useRef` in a component that re-renders often. For `useState`, require the `() =>` form; for `useRef`, require the null-guard (or a custom `useLazyRef` hook if the pattern repeats). Also check that the constructed resource has a matching cleanup (`useEffect` return that calls `pool.terminate()`), since one-time construction still needs teardown on unmount.

Production symptom: keystroke lag proportional to file size, rising tab memory, and eventually a "too many workers" or out-of-memory crash on long editing sessions. Intermittent and load-dependent, so it survives short tests.

Interview nuance: if `theme` can change, the `() =>` thunk still only runs at mount, so a theme switch will not rebuild the highlighter. That is a separate concern (you would rebuild in a `useEffect` keyed on `theme`, or `useMemo`), and conflating "run once" with "never update" is a common follow-up trap. Lazy init is about mount-time cost, not about reacting to prop changes.

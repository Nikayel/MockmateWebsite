> Module **5.1** (What Triggers a Re-render) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [4.3](./l4-state-shape-sharing.md) · Next: [5.2](./l5-referential-equality-memo.md)

# L5 · What Triggers a Re-render

Most React performance bugs and "why won't this update" bugs come from a wrong mental model of when React renders. After this module you can catch the three misconceptions that cause them: that props changing is what triggers a child render, that a render always mutates the DOM, and that React looks at the value of your state instead of its identity.

### ajr-l5-what-triggers-rerender: What actually triggers a re-render (the props myth)

- **id:** `ajr-l5-what-triggers-rerender`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, rerender, memo

#### Learn

Ask most engineers "what makes a component re-render" and they say "its props change." That is the myth. A component re-renders for exactly three reasons: its own `useState`/`useReducer` state changes, a context it consumes changes, or its parent re-renders. Props are not on that list. Props changing is a *consequence* of a parent rendering, not an independent trigger.

Here is the concrete setup that proves it:

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      <Child label="I never change" />
    </div>
  );
}

function Child({ label }: { label: string }) {
  console.log("Child render");
  return <p>{label}</p>;
}
```

Click the button. `count` changes, so `Parent` re-renders. When React re-renders a component, it calls that component function again, which produces new element objects for everything it returns, including `<Child label="I never change" />`. React then recurses into `Child` and calls it too. `Child` renders on every click even though `label` is the same string every time. You will see "Child render" logged on every click.

Why does React do this? By default React does not compare props before deciding to render a child. It renders the whole subtree and diffs the *output* against the previous output to decide what DOM to touch. Rendering is assumed cheap; the expensive part (DOM mutation) is what the diff protects. So "wasted" renders are the default, not an error.

Two ways to stop it. First, `React.memo(Child)` wraps the component with a shallow props comparison. Now before recursing, React runs `Object.is` on each prop; if they all match, it reuses the previous render and skips the call. Second, composition: if the state lives in the parent but the static child does not depend on it, pass the child *as `children`* so it is created above the state and handed down as an already-built element.

```tsx
function Parent({ children }) {
  const [count, setCount] = useState(0);
  return <><button onClick={() => setCount(c => c + 1)}>{count}</button>{children}</>;
}
// <Parent><Child label="static" /></Parent>
```

The `<Child />` element is created in the *grandparent's* render, which never re-runs on `count++`, so React sees the identical element reference and bails out. No `memo` needed.

**Interview nuance:** "does a re-render update the DOM?" No. A re-render runs the function and diffs; if the output is identical, React commits nothing. Re-rendering with identical props is wasted CPU, not a correctness bug, and often not worth fixing unless the subtree is large or the leaf is expensive.

Recap: state, context, and parent-render are the only triggers; React recurses into children without diffing props first; `memo` or composition stops the cascade.

#### See it live

**Demo (react-demo):** a Parent counter rendering a Child with static props, plus a toggle that wraps the Child in `React.memo`.

A widget with a Parent card containing a big "count: N" button and a nested Child card showing `props.label = "static"`. Each card has a live render-count badge in its corner that increments every time that component's function runs. A checkbox labeled "Wrap Child in React.memo" sits above them. The Child is built around this snippet:

```tsx
const Child = React.memo(function Child({ label }: { label: string }) {
  renderCount.current += 1; // drives the badge
  return <div className="card">label: {label} · renders: {renderCount.current}</div>;
});
```

The widget toggles between the memoized and non-memoized version when the checkbox flips. Clicking the button always increments the Parent badge.

**Watch:** with memo off, click the button and the Child badge ticks up in lockstep with the Parent badge, even though `label` never changes. Flip memo on, keep clicking, and the Child badge freezes while the Parent badge keeps climbing. That is real React behavior (not an approximation): it proves the render was triggered by the parent rendering, not by props changing, and that `memo`'s shallow compare is what breaks the cascade.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why a Child with unchanging props still re-renders on every parent `count++`, then stop it two ways: with `React.memo`, and by passing the Child as `children`.

**Think about:**
- What are the three triggers of a re-render?
- Does a re-render always update the DOM?
- Is re-rendering with identical props a bug?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The Child re-renders because its parent re-renders, which is one of the only three triggers of a render (own state/reducer, consumed context, or parent render). Props are not a trigger. When `setCount` runs, `Parent` re-runs, and re-running `Parent` re-creates the `<Child label="..." />` element and recurses into `Child`. React does not compare props before that recursion, so identical props do not save you.

Fix one, `React.memo`:

```tsx
const Child = React.memo(function Child({ label }: { label: string }) {
  return <p>{label}</p>;
});
```

`memo` inserts a shallow `Object.is` comparison on each prop. On the next parent render React sees `label` is the same reference and skips calling `Child`, reusing the prior output.

Fix two, composition (pass as `children`):

```tsx
function Parent({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  return (<><button onClick={() => setCount(c => c + 1)}>{count}</button>{children}</>);
}
// usage: <Parent><Child label="static" /></Parent>
```

Now the `<Child />` element is created in the component that renders `<Parent>`, not inside `Parent`. `count++` re-runs only `Parent`, and `Parent` just re-hands the same `children` element reference it received. React sees an unchanged element and bails out. No memo required.

**WHY at the mechanism level:** React renders top-down. Re-running a component produces fresh child elements and React recurses by default; the props "diff" (`memo`) or the element-identity bail-out (composition) are the only two things that prune that recursion.

**How to spot it in review:** state declared high in the tree with expensive or numerous leaf components below it; frequent `setState` (per keystroke, per tick) with big subtrees underneath.

**Production symptom:** wasted CPU on every keystroke or interval tick, janky typing, dropped frames in large trees.

**Common misconception corrected:** "changing a prop triggers the child's render." No. It is the *parent rendering* that cascades down; the prop change is just what you notice, not the cause.

**Self-check rubric:**
- [ ] I named all three real triggers and stated props is not one.
- [ ] I explained React recurses into children without diffing props first.
- [ ] My `memo` fix mentions the shallow `Object.is` compare it adds.
- [ ] My composition fix explains element-identity bail-out (child built above the state).
- [ ] I distinguished "re-render" from "DOM update."

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a Trading Dashboard, a top-level `<Dashboard>` holds a `price` that updates ~10 times per second from a websocket, and renders a heavy `<OrderBook>` (500 rows) plus a static `<Legend>`. Both re-render 10x/sec and the tab pins a CPU core. Diagnose it and lay out the fix, and say why blindly wrapping everything in `memo` is the wrong first move.

**Model answer (revealed on demand):**

The root cause is state placement, not missing `memo`. `price` lives at the top, so every websocket tick re-renders `<Dashboard>` and cascades into both children. `<Legend>` is pure waste. `<OrderBook>` re-runs its 500-row render 10x/sec.

First move, colocate the state. Push `price` down into the smallest component that actually shows it (a `<PriceTicker>`), so a tick re-renders only that node and leaves `OrderBook` and `Legend` untouched:

```tsx
function Dashboard() {
  return (<><PriceTicker /><OrderBook /><Legend /></>);
}
function PriceTicker() {
  const price = useLivePrice(); // subscription lives here now
  return <span>{price}</span>;
}
```

If `OrderBook` genuinely needs the price (say for a highlight), then memo plus a narrow prop: wrap `OrderBook` in `React.memo` and pass only the derived value it needs, and memoize the rows so unchanged rows skip. But note `memo` only helps if the props you pass are referentially stable; passing a fresh `onClick={() => ...}` or a new array each tick defeats it, which is the next lesson's trap.

Why not memo-everything first: `memo` adds a comparison cost on every render and a second copy of props to hold. If the state is simply in the wrong place, colocation eliminates the render entirely (zero compare, zero recursion), which beats making a wasteful render slightly cheaper. Reach for `memo` when the state truly must be shared and you have proven the child is expensive, not as a reflex.

**Production symptom:** a pinned CPU core, fan spin-up, dropped frames while scrolling the order book, battery drain on laptops with the tab open.

---

### ajr-l5-render-vs-commit: Render phase vs commit phase

- **id:** `ajr-l5-render-vs-commit`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, render-commit, purity

#### Learn

React does its work in two distinct phases, and every "why did my analytics fire twice" or "why is my ref null" bug traces back to confusing them.

**Render phase:** React calls your component function to compute what the UI should look like (the returned elements). This phase must be *pure*: given the same props and state, it returns the same output and touches nothing outside itself. React treats render as *disposable*. It can start rendering, throw the result away, and start over (concurrent features like `startTransition` and Suspense do exactly this), and in development Strict Mode deliberately calls your function *twice* to smoke out impure code.

**Commit phase:** once React has a final element tree, it applies the minimal DOM mutations, attaches refs, and runs layout effects. This happens exactly once per committed update. Refs are populated and layout is readable only here.

Now the classic bug. Anything with a side effect in the function body runs during render, which means it can run twice or run then get discarded:

```tsx
const log: string[] = []; // module-level external store

function Row({ id }: { id: number }) {
  const seen = useRef(0);
  seen.current += 1;        // mutation in render
  log.push(`row ${id} rendered #${seen.current}`); // side effect in render
  return <li>row {id}</li>;
}
```

In Strict Mode dev, `log` gets *two* entries per row (render ran twice) and `seen.current` reaches 2 on first mount. Under concurrent rendering an aborted render can push garbage that never made it to the screen. Reading `ref.current` on a DOM node here would give `null`, because commit has not run yet, so refs are not attached.

The fix is to move any mutation, subscription, logging, or DOM read into an effect, which runs in the commit phase:

```tsx
function Row({ id }: { id: number }) {
  useEffect(() => { log.push(`row ${id} committed`); }, [id]);
  return <li>row {id}</li>;
}
```

`useEffect` (and `useLayoutEffect`) run after commit, once per committed render, with refs attached and layout final. React even runs Strict Mode's double-invoke through mount/unmount/mount for effects with cleanup, so an effect that subscribes and unsubscribes stays balanced.

**Interview nuance:** "does a render always paint?" No. A render may be discarded before commit, and even a committed render paints nothing new if the DOM diff is empty. Render, commit, and paint are three separate things. The only phase where it is safe to talk to the outside world is commit, via effects.

Recap: render computes and is pure/disposable/possibly-double; commit applies DOM and refs exactly once; side effects belong in effects, never the function body.

#### See it live

**Demo (react-demo):** a Profiler-style overlay with a "render" bar that can be discarded and restarted, a "commit" bar that pulses once per commit, and a component that pushes to an external array in its body.

A widget with two horizontal bars stacked: a yellow **Render** bar and a green **Commit** bar. A "Trigger update (concurrent)" button starts a render that the widget visibly restarts once (simulating an aborted/retried render), so the Render bar flashes twice; the Commit bar pulses exactly once at the end. Below sits a live text box showing an external `log[]` array. The component under observation is built around:

```tsx
const log: string[] = [];
function Item() {
  log.push("pushed in render"); // BAD: side effect in body
  return <span>item</span>;
}
```

A toggle "Move write into effect" swaps the body-push for `useEffect(() => log.push("pushed in commit"), [])`.

**Watch:** with the write in the body, one click leaves the `log` box with duplicate/garbage entries (two "pushed in render" per update, because render ran twice and one attempt was discarded). Flip "Move write into effect" and the same click yields exactly one "pushed in commit" entry, matching the single Commit pulse. Honesty note: the double render and the discarded attempt here are *illustrated* by the widget to mirror what Strict Mode and concurrent rendering do; the point it proves (render can run more than once and be thrown away, commit happens once) is real React behavior.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain the cause in terms of the render phase, then move the write into an effect (a component mutates a `useRef` counter and pushes to an external array in its body, and the array has duplicate/garbage entries).

**Think about:**
- Why can a render run and be thrown away?
- When are refs null and layout unreadable?
- Where do side effects belong?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The duplicate/garbage entries come from doing side-effect work in the render phase. The component body runs during render, and render is not a single guaranteed-once event: Strict Mode double-invokes it in dev, and concurrent rendering can start a render, abort it, and restart. Every one of those calls runs `seen.current += 1` and `log.push(...)`, so the ref over-counts and the array collects entries from renders that were never committed to the screen.

Corrected code moves the write into the commit phase:

```tsx
function Row({ id }: { id: number }) {
  const seen = useRef(0);
  useEffect(() => {
    seen.current += 1;
    log.push(`row ${id} committed #${seen.current}`);
  }, [id]);
  return <li>row {id}</li>;
}
```

**WHY at the mechanism level:** render must be pure because React reserves the right to pause, discard, or replay it; only commit is the single real mutation of the outside world (DOM, refs, subscriptions). Effects are scheduled to run after commit, so they run once per *committed* render, with refs attached and layout readable. Putting the write in an effect ties it to commits, not to speculative renders.

**How to spot it in review:** any mutation, subscription, logging, network call, or `ref.current` DOM read sitting directly in the function body (not inside a `useEffect`/`useLayoutEffect`/event handler). A `ref.current +=` in the body is a red flag.

**Production symptom:** double-counted analytics events, duplicated rows appended to an external list, tearing/inconsistent reads, and null-ref crashes when body code reads a DOM node before it is attached.

**Common misconception corrected:** "a render always commits and paints, so body code runs once." It does not. Renders can be discarded before commit and committed renders may paint nothing; body code can run zero, one, or many times per visible update.

**Self-check rubric:**
- [ ] I stated render is pure/disposable and can run more than once.
- [ ] I named commit as the once-per-update DOM/ref phase.
- [ ] My fix moves the side effect into an effect, not just wraps it.
- [ ] I explained why refs are null in the body (commit hasn't run).
- [ ] I named a concrete production symptom (double analytics / dup rows).

#### Practice: real-world variant (save, then reveal)

**Prompt:** On an Analytics-heavy Onboarding flow, a `<Step>` component calls `analytics.track("step_viewed", { step })` directly in its function body so it "fires as soon as the step renders." After enabling Strict Mode and a `startTransition`-based wizard, product reports every step is counted roughly twice and some steps users never reached are counted. Diagnose and fix, and explain how to make the tracking exactly-once even across remounts.

**Model answer (revealed on demand):**

The `track` call is a side effect in the render phase, so it fires on every render attempt: Strict Mode's dev double-invoke doubles it, and `startTransition` can render steps speculatively (to prepare the next screen) and abort them, which is why steps the user never reached get counted.

Move it to commit and key it to the step so it fires once per step that actually mounts:

```tsx
function Step({ step }: { step: string }) {
  useEffect(() => {
    analytics.track("step_viewed", { step });
  }, [step]);
  return <StepBody step={step} />;
}
```

`useEffect` runs after commit, only for renders that were actually committed, so aborted speculative renders never fire it. The `[step]` dep means changing steps within a mounted wizard re-fires correctly.

For exactly-once even across Strict Mode's mount/unmount/mount and any accidental remounts, guard with a durable de-dupe rather than trusting render count: either a ref set of already-tracked steps, or a module-level `Set`.

```tsx
const tracked = new Set<string>();
useEffect(() => {
  if (tracked.has(step)) return;
  tracked.add(step);
  analytics.track("step_viewed", { step });
}, [step]);
```

This is idempotent: the effect may run twice in dev, but the guard makes the *observable* effect (the analytics call) fire once. In prod, prefer letting the analytics SDK de-dupe by event id if it supports it, so retries and remounts stay clean.

**Production symptom:** inflated funnel numbers (double-counted views), phantom conversions on steps users never saw, and a funnel that does not reconcile with server logs. The tell in review is the `track()` call sitting in the component body instead of an effect.

---

### ajr-l5-bailout-object-is: Bail-out on identical state (the set-same-value surprise)

- **id:** `ajr-l5-bailout-object-is`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, object-is, immutability

#### Learn

You call `setState` and nothing happens. The list does not update, the UI is frozen, and there is no error. This is almost always React's bail-out on identical state, and it is why immutability in React is a hard requirement, not a style preference.

When you call a state setter, React computes the next state and compares it to the current state with `Object.is`. If `Object.is(next, current)` is `true`, React *bails out*: it does not re-render that component (it may still render once to compare, then skip the children, but the practical effect is no update). Identity is the change signal. React does not look at the *contents* of your state, only whether the reference (or primitive value) is the same.

The trap:

```tsx
function List() {
  const [items, setItems] = useState<string[]>([]);
  const add = (x: string) => {
    items.push(x);      // mutates the SAME array in place
    setItems(items);    // passes the SAME reference back
  };
  return <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}
```

`items.push(x)` mutates the existing array; `items` still points to the exact same object. `setItems(items)` hands React that same reference. React runs `Object.is(items, items)` which is `true`, so it bails out. The data changed but the reference did not, so React sees "no change" and never re-renders. The new item is in the array in memory but never on screen.

The fix is to produce a *new* reference every update:

```tsx
const add = (x: string) => setItems((prev) => [...prev, x]);
```

`[...prev, x]` is a brand-new array. `Object.is(newArray, oldArray)` is `false`, so React commits the render. Same rule for objects: `setUser({ ...user, name })`, never `user.name = name; setUser(user)`.

Primitives work by value, which is why they feel forgiving: `setCount(5)` when count is already `5` also bails out (`Object.is(5, 5)` is `true`), and that is correct and desirable, it saves a wasted render. The surprise is only with objects and arrays, where mutating keeps the reference stable and defeats the check.

**Interview nuance:** the comparison is `Object.is`, not `===`. They differ in two cases: `Object.is(NaN, NaN)` is `true` (so setting `NaN` over `NaN` bails out, unlike `===`), and `Object.is(+0, -0)` is `false` (so setting `-0` over `+0` *does* re-render). Rarely matters in practice, but naming `Object.is` specifically is what separates a precise answer from a hand-wavy "React uses `===`."

Recap: React bails out when `Object.is(next, current)` is true; identity, not value, is the signal for objects/arrays; mutate-then-setState keeps the same reference and silently does nothing; always create a new reference.

#### See it live

**Demo (react-demo):** a list with two buttons: "Add (mutate)" that pushes then calls `setItems(sameRef)`, and "Add (new array)" that calls `setItems([...items, x])`.

A widget showing a rendered `<ul>` of items and a status badge. Each button appends the same value ("item N"). Under the list, a badge reports the result of the last setState: it reads **"render skipped (Object.is equal)"** in red when the reference did not change, or **"render committed (new reference)"** in green when it did. A small counter shows the actual array length in memory versus the number of `<li>` on screen. Built around:

```tsx
const addMutate = () => { items.push(next()); setItems(items); };      // same ref
const addImmutable = () => setItems((prev) => [...prev, next()]);      // new ref
```

**Watch:** click "Add (mutate)" and the on-screen list does not grow, the badge flashes "render skipped (Object.is equal)," yet the "length in memory" counter climbs, proving the data mutated but React bailed out. Click "Add (new array)" and the list grows by one, the badge reads "render committed," and the two counters match. This is real React behavior: it proves `Object.is` identity, not content, is what React compares.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why `items.push(x); setItems(items)` never updates the list, in terms of the `Object.is` bail-out, then fix it.

**Think about:**
- What does React compare next state against?
- Does setting a primitive to the same value re-render?
- Why is immutability required, not stylistic?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`items.push(x)` mutates the existing array in place, so `items` still references the same object. `setItems(items)` passes that identical reference to React. React compares next against current with `Object.is(items, items)`, which is `true`, so it bails out and never re-renders. The item exists in the array in memory but the UI is stale because React saw "no change."

Fix by creating a new reference:

```tsx
const add = (x: string) => setItems((prev) => [...prev, x]);
```

`[...prev, x]` allocates a new array. `Object.is(newArray, oldArray)` is `false`, so React commits and re-renders with the new list. The same discipline applies to objects (`setUser({ ...user, name })`) and nested updates (spread at each level you change).

**WHY at the mechanism level:** React uses reference identity as its change-detection signal for objects and arrays. It does not walk the contents. When the setter's result is `Object.is`-equal to current state, React short-circuits to avoid a pointless render. Mutation changes contents but preserves identity, which is exactly the case the bail-out treats as "nothing changed."

**How to spot it in review:** state variables updated with `push`, `pop`, `splice`, `sort`, `reverse`, or direct property assignment (`obj.x = ...`), followed by `setState(sameVariable)`. Any in-place array/object method on a state value is the tell.

**Production symptom:** the UI does not update despite `setState` being called, with no error and no warning. Users click "add," data seems lost, and the bug is intermittent-looking because a later *unrelated* re-render (new reference elsewhere) can suddenly flush the mutated array and show everything at once, which is even more confusing.

**Common misconception corrected:** "React does a deep/value comparison of state." It does not. It runs `Object.is` on the reference (or primitive value). Deep equality would be too expensive to run on every setState; identity is the cheap, intentional contract, and it is why immutable updates are mandatory.

**Self-check rubric:**
- [ ] I said the reference is unchanged after `push`, not just "the array changed."
- [ ] I named `Object.is(next, current)` as the specific comparison.
- [ ] My fix creates a new array/object reference (spread or map/filter).
- [ ] I explained identity, not contents, is the signal.
- [ ] I noted the symptom is a silent no-update (no error).

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a Kanban board, cards live in `useState` as `{ columns: { todo: Card[], doing: Card[] } }`. A drag handler does `state.columns.doing.push(card)` and `state.columns.todo.splice(i, 1)` then `setState(state)`, and the board never re-renders after a drag. Fix it immutably at every level that changed, and explain why a single top-level spread is not enough.

**Model answer (revealed on demand):**

The drag handler mutates the nested arrays in place and calls `setState` with the same top-level object reference. `Object.is(state, state)` is `true`, so React bails out and the board never updates, even though `todo` and `doing` changed in memory.

Fix by creating new references at every level from the root down to each array you touched:

```tsx
setState((prev) => ({
  ...prev,
  columns: {
    ...prev.columns,
    todo: prev.columns.todo.filter((_, i) => i !== index),
    doing: [...prev.columns.doing, card],
  },
}));
```

Every changed node gets a fresh reference: a new root object, a new `columns` object, a new `todo` array, a new `doing` array. Unchanged nodes keep their old references, which is good, it lets `memo`'d children of unchanged columns skip re-rendering.

Why a single top-level spread is not enough for the *bail-out* specifically: actually, spreading only the root (`setState({ ...prev })`) *would* create a new root reference and pass the `Object.is` check, so React would re-render. But if you spread the root while leaving `columns.todo` as the same mutated array, any `memo`'d column comparing `prev.columns.todo === next.columns.todo` sees identity and skips, so a mutated-but-same-reference array will render stale. The rule is: create a new reference for the root (to escape the bail-out) *and* for every nested object/array you changed (so downstream comparisons and memoization stay correct). Under-spreading passes the top check but leaves subtree bugs; that mixed behavior (root updates, a nested column does not) is the classic "half the board moved" symptom.

**Production symptom:** dragging appears to do nothing, or only some columns update while others show stale cards; occasionally an unrelated state change flushes everything at once, making the bug look random. In review, the tell is `push`/`splice` on `state.columns.*` before `setState`.
